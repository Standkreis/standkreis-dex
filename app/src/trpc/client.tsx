'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core'
import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import superjson from 'superjson'
import type { AppRouter } from '@/server/routers/_app'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

// Same origin in dev and `next start`; the static export (Capacitor) points NEXT_PUBLIC_API_URL at the API host.
const apiUrl = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/trpc`

// ── Persistence (handoff 0009 Track A) ────────────────────────────────────────
// The atlas is `dex.set` + `identity.progress`; these and a few reads around them survive a reload without network,
// 30 days, in localStorage. Nothing else does: search, GBIF backbone, maps, the fill query stay in memory.
// `meta.persist` marks a query; it is set here through query defaults so no call site changes.
// localStorage, not IndexedDB (the handoff's choice): in the Simulator (iOS 26.5) IndexedDB wedged within minutes of
// ordinary use, every request pending forever until Safari was killed, which left the restore hanging and every page
// blank. localStorage is synchronous and cannot hang; the store is ~1 MB (`dex.set` 900 KB) under Safari's 5 MB.
const PERSIST_KEY = 'dex.queries'
const PERSIST_MAX_AGE = 30 * 24 * 60 * 60 * 1000
// Cache time of a persisted query in memory: as long as the store, capped at the longest setTimeout a browser takes
// (2^31-1 ms, 24.8 days); past that the timer overflows and fires at once, and every query nobody looks at is gone
// within the second (seen in C2: the prefetched `journal.get` and every hydrated query vanished from the store).
const PERSIST_GC_TIME = Math.min(PERSIST_MAX_AGE, 2 ** 31 - 1)
const PERSISTED: [string, string][] = [['dex', 'set'], ['identity', 'progress'], ['identity', 'me'], ['sighting', 'photos'], ['sighting', 'outside'], ['journal', 'days'], ['journal', 'get'], ['taxon', 'page'], ['taxon', 'mapCentre']]
const PAGE_CAP = 10 // `taxon.page` entries kept, newest first: ~59 KB each
const SIGHTING_CAP = 30 // `journal.get` entries kept, newest first (handoff 0012 F2): the walk's sightings open offline; ~1 KB each
const isPath = (key: readonly unknown[], path: [string, string]) => Array.isArray(key[0]) && key[0][0] === path[0] && key[0][1] === path[1]

let lastWritten = ''
let lastStamp = 0 // timestamp of the store this page wrote last; a different one on disk means another page wrote
const trace = (msg: string) => { try { localStorage.setItem('dex.persist.error', `${new Date().toISOString()} ${msg}`) } catch { /* private mode */ } }
const read = (): PersistedClient | undefined => { const raw = localStorage.getItem(PERSIST_KEY); return raw ? superjson.parse<PersistedClient>(raw) : undefined }
const persister: Persister = {
  persistClient: (client) => {
    // Every query update asks for a write; only a changed store is serialised (~1 MB, a few ms on a phone).
    // Merged, not overwritten: Safari revives a page from its back/forward cache (a tab opened by URL, the back
    // button), its old QueryClient refetches on focus and would write its snapshot over what later pages added
    // (found in the Simulator: the store lost `journal.days` each time an older page came back).
    let next = sanitize(client)
    try { const disk = lastStamp !== 0 && read(); if (disk && disk.timestamp !== lastStamp) next = merge(disk, next) } catch { /* unreadable: overwrite */ }
    const signature = next.clientState.queries.map((q) => `${q.queryHash}:${q.state.dataUpdatedAt}`).join('|')
    if (signature === lastWritten) return
    try {
      localStorage.setItem(PERSIST_KEY, superjson.stringify(next))
      lastWritten = signature; lastStamp = next.timestamp
    } catch (e) {
      // Over quota: the species pages go first; a trace stays for the phone, where no console is open.
      try { localStorage.setItem(PERSIST_KEY, superjson.stringify(withoutPages(next))); lastWritten = ''; lastStamp = next.timestamp } catch { /* keep the previous store */ }
      trace(`write ${String(e)}`)
    }
  },
  restoreClient: () => {
    try { const c = read(); lastStamp = c?.timestamp ?? 0; return c } catch (e) { trace(`restore ${String(e)}`); return undefined }
  },
  removeClient: () => { try { localStorage.removeItem(PERSIST_KEY); lastStamp = 0 } catch { /* private mode */ } },
}
// Per query the newer wins; queries only the other page knows are kept.
function merge(disk: PersistedClient, next: PersistedClient): PersistedClient {
  const byHash = new Map(disk.clientState.queries.map((q) => [q.queryHash, q]))
  for (const q of next.clientState.queries) { const d = byHash.get(q.queryHash); if (!d || d.state.dataUpdatedAt <= q.state.dataUpdatedAt) byHash.set(q.queryHash, q) }
  return sanitize({ ...next, clientState: { ...next.clientState, queries: [...byHash.values()] } })
}
const withoutPages = (client: PersistedClient): PersistedClient => ({ ...client, clientState: { ...client.clientState, queries: client.clientState.queries.filter((q) => !isPath(q.queryKey, ['taxon', 'page'])) } })

// A query whose refetch failed without network keeps its data but turns `error`: it is written back as the success it
// was, so a walk of failed refetches never empties the store (found in the Simulator: the second offline page load
// showed an empty Profil). Errors never go in (a TRPCClientError carries the Response). `journal.days` is an infinite
// query: only its first page is kept. `taxon.page` keeps the newest PAGE_CAP, `journal.get` the newest SIGHTING_CAP.
function sanitize(client: PersistedClient): PersistedClient {
  let pages = 0, sightings = 0
  const queries = [...client.clientState.queries].sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt).flatMap((q) => {
    if (isPath(q.queryKey, ['taxon', 'page']) && ++pages > PAGE_CAP) return []
    if (isPath(q.queryKey, ['journal', 'get']) && ++sightings > SIGHTING_CAP) return []
    let state = { ...q.state, error: null, fetchFailureReason: null, fetchMeta: null }
    if (state.status === 'error') state = { ...state, status: 'success' as const, errorUpdateCount: 0, errorUpdatedAt: 0 }
    const data = state.data as { pages?: unknown[]; pageParams?: unknown[] } | undefined
    if (isPath(q.queryKey, ['journal', 'days']) && data?.pages && data.pages.length > 1) state = { ...state, data: { pages: data.pages.slice(0, 1), pageParams: data.pageParams?.slice(0, 1) ?? [] } }
    return [{ ...q, state }]
  })
  return { ...client, clientState: { ...client.clientState, queries } }
}

// Without network a request fails at once ("Load failed", "Failed to fetch"): one retry, not three over seven seconds,
// so the offline banner (OfflineBanner) and the "wartet aufs Netz" states appear while the walker still looks.
export const isNetworkError = (err: unknown): boolean =>
  err instanceof TypeError || (err instanceof TRPCClientError && (err.cause instanceof TypeError || /fetch|load failed|network/i.test(err.message)))

function makeQueryClient() {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: (n, err) => n < (isNetworkError(err) ? 1 : 3) } } })
  // gcTime as long as the store lives (handoff 0012 Track 0): the default five minutes removed every persisted query
  // nobody was looking at from the cache, and the next write dropped it from the store too. A sighting logged at the
  // start of a walk was gone from the store before the walk ended; the persistQueryClient docs ask for this line.
  for (const path of PERSISTED) qc.setQueryDefaults([path], { meta: { persist: true }, gcTime: PERSIST_GC_TIME })
  return qc
}

// A different identity (data deleted, cookie gone, a passkey signed in elsewhere) must not see the previous one's
// persisted progress: when `identity.me` answers with a new id, every other query is dropped and persisted again.
const IDENTITY_KEY = 'dex.persist.identity'
function watchIdentity(qc: QueryClient) {
  return qc.getQueryCache().subscribe((e) => {
    if (e.type !== 'updated' || e.action.type !== 'success' || !isPath(e.query.queryKey, ['identity', 'me'])) return
    const id = (e.query.state.data as { id?: string } | undefined)?.id
    if (!id) return
    let last: string | null = null
    try { last = localStorage.getItem(IDENTITY_KEY) } catch { /* private mode */ }
    if (last && last !== id) { qc.removeQueries({ predicate: (q) => !isPath(q.queryKey, ['identity', 'me']) }); persister.removeClient() } // the disk copy too, so the next write does not merge it back
    try { localStorage.setItem(IDENTITY_KEY, id) } catch { /* private mode */ }
  })
}

export function TRPCReactProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(makeQueryClient)
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: apiUrl, transformer: superjson, fetch: (url, opts) => fetch(url, { ...opts, credentials: 'include' }) })] }),
  )
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, dehydrateOptions: { shouldDehydrateQuery: (q) => q.meta?.persist === true && q.state.data !== undefined } }}
      onSuccess={() => { watchIdentity(queryClient) }}
    >
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>{children}</TRPCProvider>
    </PersistQueryClientProvider>
  )
}
