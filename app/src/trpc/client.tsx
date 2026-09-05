'use client'

import { useState, type ReactNode } from 'react'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'
import { del, get, set } from 'idb-keyval'
import superjson from 'superjson'
import type { AppRouter } from '@/server/routers/_app'

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

// Same origin in dev and `next start`; the static export (Capacitor) points NEXT_PUBLIC_API_URL at the API host.
const apiUrl = `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api/trpc`

// ── Persistence (handoff 0009 Track A) ────────────────────────────────────────
// The atlas is `dex.set` + `identity.progress`; these and a few reads around them survive a reload without network,
// 30 days, in IndexedDB. Nothing else does: search, GBIF backbone, maps, the fill query stay in memory.
// `meta.persist` marks a query; it is set here through query defaults so no call site changes.
const PERSIST_KEY = 'dex.queries'
const PERSIST_MAX_AGE = 30 * 24 * 60 * 60 * 1000
const PERSISTED: [string, string][] = [['dex', 'set'], ['identity', 'progress'], ['identity', 'me'], ['sighting', 'photos'], ['sighting', 'outside'], ['journal', 'days'], ['taxon', 'page']]
const isPath = (key: readonly unknown[], path: [string, string]) => Array.isArray(key[0]) && key[0][0] === path[0] && key[0][1] === path[1]

// idb-keyval stores the structured clone, so Dates come back as Dates and no serialiser is needed.
// `journal.days` is an infinite query: only its first page is kept.
const persister: Persister = {
  persistClient: (client) => set(PERSIST_KEY, firstPagesOnly(client)),
  restoreClient: () => get<PersistedClient>(PERSIST_KEY),
  removeClient: () => del(PERSIST_KEY),
}
function firstPagesOnly(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries.map((q) => {
    const data = q.state.data as { pages?: unknown[]; pageParams?: unknown[] } | undefined
    if (!isPath(q.queryKey, ['journal', 'days']) || !data?.pages || data.pages.length <= 1) return q
    return { ...q, state: { ...q.state, data: { pages: data.pages.slice(0, 1), pageParams: data.pageParams?.slice(0, 1) ?? [] } } }
  })
  return { ...client, clientState: { ...client.clientState, queries } }
}

function makeQueryClient() {
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000 } } })
  for (const path of PERSISTED) qc.setQueryDefaults([path], { meta: { persist: true } })
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
    if (last && last !== id) qc.removeQueries({ predicate: (q) => !isPath(q.queryKey, ['identity', 'me']) })
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
      persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, dehydrateOptions: { shouldDehydrateQuery: (q) => q.meta?.persist === true && q.state.status === 'success' } }}
      onSuccess={() => { watchIdentity(queryClient) }}
    >
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>{children}</TRPCProvider>
    </PersistQueryClientProvider>
  )
}
