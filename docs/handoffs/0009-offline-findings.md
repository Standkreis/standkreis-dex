# 🔍📴 [0009] Findings — the atlas without signal (M8)

> Findings of [handoff 0009](0009-offline.md). What the handoff did not decide, the Simulator defect and its fix, the checks with evidence, the cache sizes, the shots, the doubts.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C1–C4 pass (Track A, production build, Chrome over CDP and the iPhone 17 Pro Simulator) · C5–C8 pass (Track B) · C9 pass (Simulator, production build) · C10 pass (`npm run check` on `main` at `0797771`, export served by `python3 -m http.server`, worker installs in the Simulator) |


## 📴 Track A · the atlas without signal

Branch `m8-offline`, worktree `standkreis-dex-m8a`. Shots in [`0009-shots/a-*`](0009-shots/), driver `app/scripts/m8a/offline.mjs` (headless Chrome over CDP attached at the browser level so the offline switch reaches the worker's own fetches; modes `c1` `c2` `c3` `c4` `probe` `seq` `shots`). Two legs: the first (worker, persistence, small variant; C1 in Chrome) was stopped at C1 and shown to the owner, who found a dead shell in the Simulator; the second leg is this section.

### 📐 What the handoff did not decide

| Topic | Decision | Why |
| --- | --- | --- |
| Test target | **The production build** (`npm run build`, `next start -p 3002`), never `next dev` | Dev has no build manifest, compiles pages on demand and serves a different chunk graph; a worker proven on dev proves nothing for the phone |
| Precache list | **Every client file of the build**, written by `scripts/m8a/sw-manifest.mjs` (`postbuild`) to `/_next/static/<build id>/sw-manifest.json`; 19 files, ~905 KB. The shell HTML's own script tags are pulled too, as the fallback for dev | The cause of the Simulator defect, see below |
| Build id | Minted once by `scripts/m8a/build-id.mjs` (`prebuild`) into `node_modules/.cache/dex-build-id`; `next.config.ts` reads it during `build*` | `next build` loads `next.config.ts` in more than one process: `Date.now()` there gave `.next/BUILD_ID` one id and the inlined `NEXT_PUBLIC_BUILD_ID` (the worker URL) another, so the worker asked for a manifest under the wrong id (404) |
| Navigation offline | The page under its own path, both spellings (`/de/you`, `/de/you/`), then for `/species/*` the worker's own "wartet aufs Netz" page, then the locale shell; `Response.error()` last | The handoff's order; the species page is the one path where the shell would be a lie |
| RSC requests | Pass through untouched; a failed `?_rsc=` makes the Next router fall back to a full navigation, which the worker answers from cache. A non-prefetch RSC request for a page path makes the worker **fetch and remember the HTML** too (`rememberPage`) | A client-side `Link` never fetches HTML; without this a page reached by tab and reloaded offline had no cached document |
| Query persistence | **localStorage, superjson**, key `dex.queries`, 30 days, ~930 KB for Mainz-Bingen (`dex.set` 858 KB). Queries: `dex.set` `identity.progress` `identity.me` `sighting.photos` `sighting.outside` `journal.days` (first page only) `taxon.page` (newest 10) `taxon.mapCentre`. Written only when a `queryHash:dataUpdatedAt` signature changed; over quota the species pages go first, a trace lands in `dex.persist.error` | The first leg used IndexedDB (idb-keyval). In the Simulator (iOS 26.5) IndexedDB **wedged within minutes**: every request pending forever, the restore never resolved, every page blank, recovered only by killing Safari (`simctl terminate … com.apple.mobilesafari`). Reproduced twice. localStorage is synchronous and cannot hang; 930 KB sits under Safari's 5 MB |
| Merge, not overwrite | `persistClient` reads the store first; if another page instance wrote since (timestamp differs), the two are merged per query, newer `dataUpdatedAt` wins, then written | See the Simulator defect §2 below: Safari revives old page instances from its back/forward cache and they would overwrite the store with their old snapshot |
| Error state | A query whose refetch failed without network is written as the success it was (`error` → `success`, `error` `fetchFailureReason` `fetchMeta` stripped); `shouldDehydrateQuery` keys on `data !== undefined`, not `status` | Found in the Simulator: the second offline load showed "Ohne Namen" and empty counters because every refetch had failed and the old predicate (`status === 'success'`) had dropped the whole store |
| Identity change | A different `identity.me` id drops every other query **and the disk copy** | Otherwise the merge would bring the previous identity's atlas back |
| Retry | `retry: n < (isNetworkError ? 1 : 3)` | Three retries with backoff are seven seconds of spinner in a dead zone; one is enough to tell a hiccup from no signal |
| Offline flag | One store (`OfflineBanner.tsx`): `navigator.onLine` **or** a query/mutation that failed with a network error; any success clears it. The banner is fixed at the top, `body` gets `padding-top` while it shows | Airplane mode with Wi-Fi assist and dead zones leave `onLine` true; CDP's offline emulation leaves it true too (C3 evidence). Failures are the honest signal |
| Download row | `OfflineDownload.tsx`: consent by button, 4 parallel fetches through the worker into `dex-images`, skips cached URLs (resumable), cancelable, module-level state so drawer and Profil show one progress; done stamp in `localStorage['dex.offline.ready.<regionId>']`; **a host's own error (404, 429) skips the image, only no network stops the run**. A thrown fetch is ambiguous (Wikimedia's 429 page carries no CORS headers, so it throws like a dead radio): one `fetch('/manifest.webmanifest')` against the own origin decides — reachable → skip, not → "Netz weg bei n / 926" | The handoff's rules; a single unscalable thumb must not fail 925 others |
| Size estimate | 30 KB per image → "926 Bilder · ~27 MB" | Measured, see C2: the handoff's ~14 MB assumed 15 KB per image |
| Image variant, Wikimedia | `smallVariant` in `routers/dex.ts` now maps Wikimedia too: a 960 px thumb (70–325 KB) and an unscaled original (250 KB to 1.1 MB, **429 when fetched in bulk**) become the **330 px thumb** on `upload.wikimedia.org` (11–80 KB, ~17 KB typical). 330 is one of the widths Wikimedia serves without a scaler run (250, 330, 500, 960 …); 320 and 300 answer 400. The grid falls back to `lead.url` on an image error | 116 of 926 leads are Wikimedia; before the change they were 60 % of the bytes and the download died on a 429 at 136 / 926 |
| Species map offline | `SpeciesMap.tsx` (not on the owned list, not frozen) shows "Karte wartet aufs Netz" over the card when the offline flag is set or an OSM tile errors | Tiles are never cached; the card must say so instead of showing grey squares |
| Never-visited species | The worker answers with its own HTML (`data-testid="species-waits"`, tokens' colours, both schemes, link to the atlas). The two strings live **in `sw.js` in both languages** (mirrors `offline.speciesWaits` / `offline.speciesHint`) | A worker cannot read the locale JSONs. The name from the set is not shown, see doubts |
| Locale layout `dynamicParams` | **Removed `export const dynamicParams = false`** from `app/[locale]/layout.tsx` | Next applies it to every route under the segment (its own TODO in `build/static-paths/app.js`): on the production build **every species and sighting page answered 404** (`NoFallbackError`), so C3 could not run and the deployed app would have had no species pages. Unknown locales still hit `notFound()`. Pre-existing, not an M8 change in spirit; flagged for the merge |
| `check` | `npm run check` runs `build:export`, which rewrites `.next` under a running `next start`; restart the server after it | Cost me one broken shots run |

### 🐛 The Simulator defect and its fix

The owner's report: on the Simulator, `/de/you` opened offline showed the shell and nothing else. Three causes, found in order; the third only appears with the fix for the first two in place.

| # | Cause | Fix | Proof |
| --- | --- | --- | --- |
| 1 | Chunks React loads on demand (a tab's client component never visited online) were not cached: the first leg only pulled the script tags of the shell HTML | Precache from the build manifest (all 19 client files) | Simulator: all four pages render offline |
| 2 | The worker URL's build id differed from `.next/BUILD_ID` (two `next.config.ts` evaluations); the manifest URL was a 404 and the precache silently fell back to the HTML tags | `prebuild` seed file, read by `next.config.ts` | `sw-manifest <id>` in the build log matches `navigator.serviceWorker.controller.scriptURL` |
| 3 | **Safari's back/forward cache**: `simctl openurl` (and the back button) revives the previous page instance; its QueryClient refetches on focus and its persist subscription **overwrote the store with the old snapshot** — `journal.days` vanished on the very next page. Reproduced with a write log in localStorage: the store went 5 → 4 → 3 queries across `/de/you` → `/de/journal` → `/de/log`, each drop stamped by the page that came back. Chrome (no page revival over CDP) never showed it | Merge on write, newer query wins; `persister.removeClient()` on identity change | Simulator sequence below: Tagebuch shows its day cards offline |

The IndexedDB hang (persistence table above) was found on the way and is the reason the store moved to localStorage.

### 📱 Simulator proof (iPhone 17 Pro, iOS 26.5, build `mtor8pop`)

`/de`, `/de/you`, `/de/journal`, `/de/log` opened online, 65 s wait (past `staleTime`), server killed, the four opened by URL, then the Profil tab tapped from the offline atlas.

| Page | Offline | Shot |
| --- | --- | --- |
| Atlas | Grid of 12, "1 studiert · 1 entdeckt · 12 möglich", banner | `a-sim-offline-atlas.png` |
| Profil | "Sven · Mainz-Bingen", counters, "Atlas offline · 926 Bilder · ~14 MB" (pre-measurement label), banner | `a-sim-offline-you.png` |
| Tagebuch | "Heute · Sa 5. Sep", five rows, banner; **plus** "Das hat nicht geklappt." under the cards (see doubts, `Journal.tsx` is frozen) | `a-sim-offline-journal.png` |
| Log | Shortlist "Jetzt wahrscheinlich · noch nicht entdeckt", eight rows with images, photo row, banner | `a-sim-offline-log.png` |
| Tap Profil from the atlas | Client navigation offline lands on Profil with name and counters | `a-sim-offline-tap-you.png` |

### 🧪 Checks

**C1** (`offline.mjs c1`, Chrome, build `mtor8pop`) — pass.

| Evidence | Value |
| --- | --- |
| Caches after install | `dex-shell` 19 entries (9 pages × 2 spellings + manifest + icon), `dex-static` 29, `dex-images` 12 |
| Offline reload of `/de` | 12 cells, 12 images decoded, "1 studiert · 1 entdeckt · 12 möglich", seen cell in colour, `hydrated: true` |
| Offline `/de/you` by tab | `/de/you`, counters "1 studiert · 1 entdeckt · 12 möglich" |
| Failed requests offline | only `_rsc` prefetches and the `/de` document (answered by the worker) |
| Banner | not in Chrome (data fresh, CDP leaves `navigator.onLine` true); in every Simulator shot and in C3 stale |

**C2** (`offline.mjs c2`, Chrome, build `mtorortj`, Mainz-Bingen, all tiles = 926 images) — pass.

| Evidence | Value |
| --- | --- |
| Row before | "926 Bilder · ~27 MB" |
| Progress, cancel, resume | "11 / 926" after 1.5 s → "Angehalten · 15 / 926" → resumed, cached URLs skipped |
| Done | "Offline bereit · 5. Sept." after **35 s**, `dex.offline.ready.<region>` = `2026-09-05T19:20:47Z`; Profil shows the same line |
| Cache measured | **923 entries, 28,768,755 bytes = 27.4 MB**, 0 opaque, hosts `inaturalist-open-data.s3.amazonaws.com` (810) and `upload.wikimedia.org` (116); 3 images skipped by their host. The download row's ~27 MB is the truth within 2 % |
| Offline grid, all tiles, scrolled | 388 cells (the drawer's `apply` in the script left the plants filter on), 387 images decoded, 0 broken |
| Before the Wikimedia change | first run died "Netz weg bei 136 / 926" on a 429 from `upload.wikimedia.org`; 135 entries were already 6.4 MB (mean 50 KB) |
| Re-run after C4's worker fix, fresh profile, build `mtosqpno` | "Offline bereit" after **29 s**, **887 entries, 26.2 MB, 0 opaque**; 39 Wikimedia thumbs skipped with 429 (this machine had fetched the set six times that evening), grid offline 387 / 387 decoded, 0 broken |

Image sizes measured over the whole set from node: iNaturalist `small` 13–74 KB, median 27 KB; Wikimedia 960 px thumbs 67–325 KB; unscaled originals 250 KB–1.1 MB; 330 px thumbs 11–80 KB. Bulk fetching from node (no browser UA, ~1,000 requests in minutes) gets 429 from Wikimedia after ~100 images; from Chrome the same run got 923 of 926. The handoff's "≈ 14 MB" was an estimate; the truth for Mainz-Bingen is 27 MB, and the cap of 2,000 entries is far away.

**C3** (`offline.mjs c3`, `STALE=1`, species 2431776 visited / 2430567 never, build `mtortamv`) — pass.

| Evidence | Value |
| --- | --- |
| Visited online by Link | `/de/species/2431776` Feuersalamander, map rendered; the worker remembered the HTML (`rememberPage`) |
| Visited offline (stale) | title, state row "noch nicht studiert · noch nicht entdeckt", facts, intro 510 chars, 31 images decoded, `hydrated: true`, **"📴 Karte wartet aufs Netz"** over the map card, banner "Offline · dein Atlas ist da, Suche und Karten warten aufs Netz"; `navigator.onLine` still `true` under CDP |
| Never visited offline | "📴 Diese Art wartet aufs Netz / Einmal mit Netz öffnen, dann bleibt sie auf dem Handy. / Zum Atlas", `body[data-testid=species-waits]`, no spinner |
| Back | "Zum Atlas" → `/de`, grid from cache |

**C4** (`offline.mjs c4`, Chrome; the script waits on stdin while the server is rebuilt and restarted) — pass.

| Evidence | Before (build `mtos2dfv`) | After (build `mtosn0z5`, next launch + reload) |
| --- | --- | --- |
| Worker | `/sw.js?v=mtos2dfv` | `/sw.js?v=mtosn0z5`, controlling **3.1 s** after the first load of the new build |
| Shell / static caches | `dex-shell-mtos2dfv` 19, `dex-static-mtos2dfv` 29 | `dex-shell-mtosn0z5` 19, `dex-static-mtosn0z5` 29; **the old two are gone** |
| Image cache | `dex-images` 10 entries, 0.3 MB (a download of a few seconds) | `dex-images` **52 entries**, 0.57 MB: survived, and the download went on after the reload |

The run also showed 36 opaque entries after the swap: a Wikimedia 429 on the CORS fetch made the worker fall back to the page's no-cors request and cache the opaque copy of the error. Fixed in `sw.js` after C4: a CORS answer of any status is final; only a host that refuses CORS is fetched no-cors. The C2 re-run after the fix (table above, last row) has 0 opaque entries.

### 🖼️ Shots

| File | What |
| --- | --- |
| `a-sim-offline-{atlas,you,journal,log,tap-you}.png` | Simulator, offline, build `mtor8pop` |
| `a-c1-online-de-light.png`, `a-c1-offline-{de,en}-{light,dark}.png`, `a-c1-offline-you-{de,en}-{light,dark}.png` | C1 (en/dark from the first leg) |
| `a-c2-drawer-ready-de-light.png`, `a-c2-offline-grid-de-light.png` | C2 |
| `a-c3-offline-visited-de-light.png`, `a-c3-offline-never-de-light.png` | C3 |
| `a-drawer-download-{de,en}-{light,dark}.png` | "Für unterwegs laden" under Sortierung |
| `a-profile-download-{de,en}-{light,dark}.png` | The row on Profil |
| `a-offline-banner-{de,en}-{light,dark}.png` | The banner over the atlas |

### 🤔 Doubts, for the merge and the owner

| # | Doubt | Suggestion |
| --- | --- | --- |
| A1 | **`Journal.tsx` shows "Das hat nicht geklappt." under the day cards offline**: it renders `days.isError` even when `days.data` exists. Frozen file | One line: `{days.isError && !days.data && …}`. Same for the `working` line if wanted |
| A2 | **Never-visited species page has no name** — the worker cannot read the set. The handoff wanted "with the name from the set" | Keep the worker page as the floor; in `SpeciesPage.tsx` (frozen) read `dex.set` from the query cache when `taxon.page` fails with a network error and show name + "wartet aufs Netz" |
| A3 | `dex.set` is 858 KB of the 930 KB store, written on every change of any persisted query (a few ms in Chrome, unmeasured on an old phone) | Slim the set's rows for the cache, or persist it under its own key |
| A4 | **Track B's outbox on IndexedDB**: the Simulator's IndexedDB hang was reproducible; an outbox that never resolves is a sighting never sent | Time out every IDB call (or write blobs to the Cache API, rows to localStorage) and prove the flush in the Simulator, not only Chrome |
| A5 | Wikimedia 429 on bulk downloads from a phone are possible with 4 parallel fetches (Chrome got 923 / 926) | If it bites: 2 parallel for `wikimedia.org`, "Auffrischen" fetches the missing ones anyway |
| A6 | `dynamicParams = false` removed from the locale layout: one-line behaviour change outside Track A's file list | Keep it; `notFound()` still guards the locale. Without it there is no species page on a server build |
| A7 | The banner keys on failures, not on `navigator.onLine` alone: a phone offline with fresh data shows no banner until something is fetched | Fine by the spec ("nothing blocks, nothing spins"); mention in the guide |
| A8 | Persisted data could go stale for 30 days if the phone never reconnects | It cannot: any success refreshes; `maxAge` just bounds a dead install |

### 🔀 For the merge

- Locale JSONs: one top-level `offline` object appended in both; Track B appends its own. `package.json`: `prebuild` / `postbuild` / `prebuild:export` / `postbuild:export` added.
- `SpeciesMap.tsx` and `app/[locale]/layout.tsx` touched (see tables). `AtlasGrid.tsx` gained a `useState` for the image fallback.
- After merging, `npm run build` must print `sw-manifest <id>` with the same id as the worker URL in the served HTML.

## 📮 Track B · the sightings queue and the server sweeps

Branch `m8-queue`. Shots in [`0009-shots/b-*`](0009-shots/), driver `app/scripts/m8b/queue.mjs` (headless Chrome over CDP as in `m6a/log.mjs`; modes `c5` (with C6), `c7`, `shots`, `capped`), `app/scripts/m8b/q.mjs` for ad-hoc SQL. Evidence was taken against a **production build** (`next build && next start -p 3003`): the dev server cannot navigate offline (see doubts).

### 🧱 What was built

| Piece | File | What |
| --- | --- | --- |
| Outbox | `components/Queue.ts` | IndexedDB via `idb-keyval`, store `dex-outbox` / `outbox`, rows `{id, kind: sighting\|photo\|study, payload, blob?, createdAt, attempts, lastError, dead?}`. An in-memory mirror (`useOutbox`, `rowsNow`, `subscribe`) so every screen reads synchronously; `enqueue` refuses the 51st live row and a blob over 2 MB (`QueueFull`); `retry(id)`; `flush()` single-flight; `landing(id, ms)` for the save screen |
| Flusher | `components/QueueFlusher.tsx` | Mounted once in `[locale]/layout.tsx`. Flush on load, `online`, `visibilitychange` visible, every 60 s while live rows exist. After a row lands: invalidate `identity.progress`, `journal.*`, and for sightings `sighting.photos`, `sighting.outside`, `sighting.fill({id})`. Overlays `identity.progress` with the waiting wild taxa (`seen`, `seenAt`) whenever the server's progress arrives, so a reload in the forest keeps the cells filled |
| Diary merge | `components/QueueRows.ts` + test | `mergeQueued(days, outbox, kind)`: outbox rows become diary rows on their day (`dayKeyOf`), ids already on the server are skipped, sorted with the rest |
| Save path | `LogSave.tsx` | Mints `crypto.randomUUID()`, computes `first` (not in `progress.seen`, no wild row for the taxon in the box), enqueues, flushes, waits **3 s online / 0 s offline** for the landing; landed → the server's answer as before; not landed → seeds `sighting.fill({id})` with `pending: true` and opens the sheet |
| Upload path | `LogPhoto.tsx` | `uploadOrQueue`: online → `POST /api/photo` as before; offline (or the fetch throws `TypeError`) → a `photo` row with the resized JPEG blob, shown from an object URL |
| Sheet | `Fill.tsx` | `pending` → meta line "· wird gesendet", no Foto button |
| Diary | `Journal.tsx` | Merged rows; grey chip "wartet aufs Netz", amber button "konnte nicht gespeichert werden · erneut" (`retry`); queued sighting rows are not links (no `/sighting/<id>` yet) |
| Server | `routers/sighting.ts` | `create` takes `id?: uuid`; an existing row of the same identity is returned as if just created (with `isFirst`); another identity's id → `CONFLICT` |
| Search cap | `server/searchCap.ts` + test, `routers/taxon.ts` | Token bucket per identity, 30/min continuous refill, in process memory; `TOO_MANY_REQUESTS`. `LogSearch.tsx` does not retry that code and shows "Kurz warten · zu viele Suchen auf einmal." under the set rows |
| Sweep | `server/sweep.ts`, `instrumentation.ts`, `etl/cli.ts sweep`, `photos.ts deleteAbandonedPhotos`, `dex.ts startRegionJob` | One transaction holding `pg_try_advisory_xact_lock(0x0de55eec)`: regions `queued` older than 5 min restarted in order; taxa with `contentAt = null` that are in a ready region's set **or have sightings**, content kick in batches of 20; user Assets with `sightingId = null` older than 24 h deleted, rows and files |
| Strings | `i18n/{de,en}.json` | One new top-level object `queue` (`sending`, `waiting`, `failed`, `retry`, `full`, `searchCapped`) |

### 📐 What the spec did not say

| Topic | Decision | Why |
| --- | --- | --- |
| Where the flush lives | A vanilla `createTRPCClient` of its own inside `Queue.ts`, not the React provider | Timers and the `online` event run outside React; the provider's client is not reachable there and Track A owns `trpc/client.tsx` |
| Idempotence | The **client id is the key**. Server: `findUnique` by id, same identity → return the row (`first` recomputed), other identity → 409. No schema change | A retried flush after a lost answer cannot create a twin; 409 is 4xx → the row falls out instead of retrying forever |
| Order and stop rule | Rows in `createdAt` order, one at a time; the first row **without an answer** (offline, timeout, 5xx) stops the run; a row the server refuses (4xx except 401 and 429) is marked `dead`, payload kept, the line behind it moves on | Handoff §📮; a dead row must not block the forest's other finds |
| Photo before sighting | A sighting with a `photoRow` uploads the blob first, binds the Asset id, then creates. If the **upload** is refused (4xx: not a JPEG, too big) the photo row is dropped and the sighting goes **without** it, `lastError` kept on the sighting row | The find is worth more than its picture; a stuck photo must not hold the sighting |
| Unbound photo rows | A `photo` row no sighting refers to (chooser → back) waits; after 24 h unreferenced it is removed | Mirrors the server's abandoned-Asset rule |
| Client `first` | `wild && !progress.seen.includes(taxon) && !queuedWild(outbox, taxon)`; the sheet says "Entdeckt" with "· wird gesendet"; the server's `first` wins after the flush through the `fill` invalidation | Handoff §📮 "counters tick, server wins"; a second offline save of the same species is not a second "first" |
| Counters offline | The overlay adds the waiting wild taxa to `identity.progress` in the query cache (`setQueryData`, applied again on every non-manual success of that query and on every box change) | The grid, the counters and the species page all read `progress`; one overlay covers them all without touching `AtlasGrid.tsx` |
| The save screen waits 3 s | Online the screen waits up to 3 s for the landing and then behaves exactly as before (toasts, `?fill=`); past 3 s, or offline, it opens the pending sheet at once | A slow server must not freeze the button; the row is safe in the box either way |
| Photo URL | **Stays a capability URL** `/api/photo/<uuid>` (findings 0008 A) | The export build's `<img>` on another origin carries no cookie, the persisted query cache (Track A) would hold expired signed URLs across days, and a service worker cache needs a stable key. The uuid is unguessable; delete removes the file → 404 |
| 51st row | `enqueue` throws `QueueFull`; the save screen shows "Erst wieder ins Netz, dann speichern." and keeps its state | Handoff §📮; iOS evicts unused stores after seven days (record Q5), so the box stays small |
| 2 MB blob | Same `QueueFull` path and text | Only reachable offline (online uploads directly); 1,600 px q 0.85 JPEGs are ~30–300 KB, so this is a guard, not a screen |
| Studies | The box knows `kind: 'study'` (`send` → `study.mark`, already an upsert, so no id is needed and `study.ts` is untouched), but **no screen enqueues studies yet**: the study button lives in `SpeciesPage.tsx` (not owned) and calls `study.mark` directly | One line in `SpeciesPage.tsx` at the merge: `enqueue({id: crypto.randomUUID(), kind: 'study', payload: {taxonId, taxon}})` then `flush()` instead of the mutation. `setMutationDefaults` cannot do it: explicit `mutationOptions` win |
| Queued row's sighting page | Not built: a queued diary row is a `<div>`, not a link; the pending sheet's "Zur Art ›" goes to the species | `SightingPage.tsx` is not owned. To do at the merge: `sighting.fill`/`sighting.one` miss → look up `rowOf(id)` in the box, render the chip and no map |
| Search cap store | `globalThis.__dexSearchBuckets`, cleared when over 10,000 identities | No table, no migration; one process per deployment for now |
| Sweep lock | `pg_try_advisory_xact_lock` inside one `$transaction` (timeout 6 h) rather than a session lock | Dies with the connection; nothing to release on a crash |
| Sweep "stale" | `Region.createdAt < now − 5 min` (there is no `updatedAt`) | Schema is frozen; a re-requested region keeps its `createdAt` (doubt below) |
| Files touched outside the list | `LogSearch.tsx` (the cap line, four lines), `[locale]/layout.tsx` (mounts `<QueueFlusher />`, two lines) | No owned file could show the cap or mount the flusher; both are trivial to re-apply |

### 📮 The flush rules as built

```
trigger  : load · window 'online' · document visible · every 60 s while a live row exists · after every enqueue · retry(id)
guard    : navigator.onLine false → return without a request · one run at a time (second call joins)
per row  : dead → skip
           photo without forSighting → wait (drop after 24 h if unreferenced)
           sighting with photoRow → upload blob → bind photoId → create({id, …})
           study → mark
           photo with forSighting → upload → attachPhoto
on answer: 2xx → remove row, listeners (invalidate progress, journal, photos, outside, fill)
           4xx except 401 429 → dead (payload kept, chip "konnte nicht gespeichert werden · erneut"), continue
           no answer / 5xx / 401 / 429 → attempts+1, lastError, STOP the run
```

### ✅ Checks

**C5 · offline save, sheet, counters, diary** — identity `61949416-…`, `Network.emulateNetworkConditions {offline: true}`, production build.

| Evidence | Value |
| --- | --- |
| `navigator.onLine` | `false` |
| URL after Wild | `/de?fill=<client uuid>` |
| Sheet meta | "👁 5. Sept. · Mainz-Bingen · Ort grob gespeichert · wird gesendet", no Foto button, `data-testid="fill-pending"` |
| Counters | "0 studiert · N entdeckt **+1** · 929 möglich" |
| Grid cell | `fill: done, grayscale: false, ring: true, check: true` |
| Outbox | one `sighting` row, `first: true`, `attempts: 0` |
| Diary | Zilpzalp row, chips `["Neu entdeckt", "wartet aufs Netz"]`, rendered as `<div>` (no link) |
| DB | no `Sighting` with that id |

**C6 · back online, the row lands, once** — same run, `offline: false`.

| Evidence | Value |
| --- | --- |
| Flush | landed 152 ms after the `online` event |
| DB | `Sighting.id === client id` (`idMatches: true`), one row |
| Sheet | not shown again |
| Diary | chip gone, the row is a `/sighting/<id>` link |
| Progress | client `identity.progress` equals the server's after invalidation |
| Bonus | a row from a broken dev-server attempt (Turmfalke) survived the server restart and flushed on its own when Chrome's error page auto-reloaded |

**C7 · photo offline, flush uploads first** — "one bar" (`Network.setBlockedURLs ['*/api/*']`: `navigator.onLine` true, every API call fails), then unblocked and `dispatchEvent(new Event('online'))`.

| Evidence | Value |
| --- | --- |
| Photo strip | `data-photo=<outbox photo row id>`, `<img src="blob:…">` |
| Outbox | `sighting` row with `photoRow`, `photo` row blob **27,623 B** |
| Sheet | pending, image `blob:` |
| After unblock | flush 161 ms; DB row Europäische Gottesanbeterin `evidence: photographed, photos: 1`; file `app/data/photos/<assetId>.jpg` exists |
| Grid | cell `own: true, src: /api/photo/<assetId>` |
| Outbox | empty |

**C8 · the restart sweep** — state planted by SQL: Kyoto `status = queued` (`createdAt` 11:07Z, older than 5 min), one Mainz-Bingen set taxon (*Acanthosoma haemorrhoidale*) `contentAt = NULL`, one user Asset `sightingId = NULL`, `createdAt = now − 25 h`, with its file. Then `next start -p 3003`.

| Evidence | Value |
| --- | --- |
| Log | `[sweep] restarting 1 queued region(s): Kyoto (JPN.22.13_1)` → `[region JPN.22.13_1] ready: set 303 in 5.9 s` → `[sweep] 1 taxa without content` → `content 1/1: … 1/1` → `[sweep] 1 abandoned photo(s) removed` → `[sweep] done: regions 1 · content 1 (1 filled, 0 failed) · photos 1 · 9.0 s` |
| Region | `status: ready`, `refreshedAt` 16:16:55Z |
| Taxon | `contentAt` 16:16:58Z |
| Asset | row count 0, file gone |
| CLI | `npm run etl sweep` afterwards: `regions – · content 0 taxa · photos 0 · 0.1 s` |
| Lock | with `pg_try_advisory_lock(233135852)` held by another connection: `[sweep] another process is sweeping; skipped` / `sweep: another process holds the lock` |

**Search cap** — 31 `taxon.search` calls in one minute from one identity, four runs (de/en × light/dark).

| Evidence | Value |
| --- | --- |
| Statuses | 30 × `200`, 31st `429` |
| Screen | "Kurz warten · zu viele Suchen auf einmal." / "Wait a moment · too many searches at once.", set rows kept (`setRows: 1`), backbone section hidden |

**Refused row** (shots) — a planted row with an unknown taxon id: after reload `dead: true, lastError: "unknown taxon"`, diary chip "konnte nicht gespeichert werden · erneut"; a Turmfalke row waiting next to it; 51st save → "Erst wieder ins Netz, dann speichern.", no sheet.

### 📸 Shots (390 wide, `0009-shots/`)

| Shot | de/en × light/dark |
| --- | --- |
| `b-fill-pending-*` | the sheet with "· wird gesendet" | 4 |
| `b-journal-refused-*` | waiting chip, landed row, refused row with "· erneut" | 4 |
| `b-save-full-*` | the save screen refusing the 51st row | 4 |
| `b-search-capped-*` | set rows kept, the cap line | 4 |
| `b-journal-waiting-de-light`, `b-fill-pending-photo-de-light`, `b-grid-own-photo-after-flush-de-light` | C5 and C7 states | 3 |

### 🤔 Doubts

| Doubt | Why it matters |
| --- | --- |
| **Dev server offline**: `next dev` hard-navigates on `router.replace('/?fill=')` offline → Chrome's error page. The production build works because `<Link href="/">` prefetched the static route. Track A's worker should make both moot; the merge should re-run `c5` on dev with the worker | Without the worker, offline only works in prod, and only for prefetched routes: `/log` was **not** prefetched, so C7 was taken as "one bar" instead of full offline |
| **Study rows' `at`** is the flush time (`study.mark` stamps `now()`), the diary shows the row's `createdAt` until it lands | A study marked Saturday in the forest lands as Monday's. Would need `at` on `study.mark` (schema/`study.ts`, not done) |
| **Search cap per process**: two servers on one DB give 60/min | Fine until there is a second server; a `Redis`/table bucket is a later question |
| **Sweep stale rule** uses `createdAt`: a region re-requested after a failure keeps its old `createdAt`, so a server starting while another server's live job runs on it would restart that job (two region jobs in parallel; the second one's `deleteMany` + recreate of the plausibility rows is the race) | Only with two servers; the advisory lock guards the sweep, not the live job. `Region.updatedAt` would fix it, schema frozen |
| **Overlay vs. the persisted cache** (Track A): the overlay runs on non-manual `success` of `identity.progress` and on every box change; a restore from IndexedDB may surface as a different event. `apply()` also runs at mount, so the restored data is covered if it is there by then | Re-check C5's counters after a reload with both tracks merged |
| `Error: Internal: NoFallbackError` × 461 in the first prod log | Appeared while Chrome's error page hammered the dead port; none after the restart. Not investigated |
| The Kyoto set was rebuilt by the C8 restart (303 taxa; plausibility rows recreated). Sightings and identities untouched | Shared dev DB, worth knowing |

### 🔀 For the merge (by hand)

| File | What |
| --- | --- |
| `app/src/i18n/de.json`, `en.json` | take both: Track A's objects and the `queue` object |
| `app/package.json` | take both: `idb-keyval: ^6.3.0` is the same in both tracks |
| `app/src/app/[locale]/layout.tsx` | keep `<QueueFlusher />` after `<IdentityBoot />` |
| `app/src/components/LogSearch.tsx` | keep the `retry` option and the `capped` line |
| `SpeciesPage.tsx` | the study button through the box (one line, see decisions) |
| `SightingPage.tsx` | a queued id: chip and no map (see decisions); then `Journal.tsx` may link queued rows again |


## 🔀 Merge on `main` (0797771)

Track A fast-forwarded (`f56aa17`), Track B rebased (`70df546`), the by-hand items in one commit. `npm run check` green (30 tests, 0 lint errors, 1 warning).

### ✍️ By hand

| File | What | Note |
| --- | --- | --- |
| `SpeciesPage.tsx` | study button → `enqueue({ kind: 'study' })`, the `identity.progress` cache gets the id at once, then `flush()`; unmark stays a direct mutation | The `taxon` for the payload is built from the page data, lead = first asset |
| `SpeciesPage.tsx` | `page.isError && !page.data` → "Diese Art wartet aufs Netz" with the atlas link (doubt A2, the in-app half) | The worker page stays the floor for a cold URL |
| `Journal.tsx` | doubt A1: `days.isError && !days.data && …` | |
| `SightingPage.tsx` | **not done**: queued id → chip without map. A queued row in the diary still opens the sighting page, which has no server row until the flush | Track B item, left for M9 with the walk |

### 🧪 C9 C10 (iPhone 17 Pro Simulator, iOS 26.5, `next start -p 3002` from `main`)

| Check | Evidence | Result |
| --- | --- | --- |
| C9 | Atlas online → server killed → `/de/you` from cache with the banner (`m-profile-offline.png`) → `/de/log?taxon=1043082` renders the save sheet offline (`m-save-offline.png`) → "Wild speichern" → atlas; diary shows the row with **"wartet aufs Netz"** (`m-journal-offline-queued.png`) → server back → chip gone within 12 s (`m-journal-online-flushed.png`); `Sighting` `07f97f68` in the DB, `createdAt` 19:59:30 UTC, no duplicate | ✅ one row, not two (the second was not possible: no tap on the second species without the panel; the outbox order is covered by B's C5) |
| C10 | `check` green on `main`; `out/` served by `python3 -m http.server 3003` (no headers at all): worker installs, file server killed, `/de/you` opens from the worker (`m-export-offline-profile.png`, "Ohne Namen" because the export has no API) | ✅ `sw.js?v=<build id>` needs no header |
| A4 | Track B's outbox on IndexedDB **worked in the Simulator** in this run (enqueue, diary read, flush) | ⚠️ one run; the hang Track A saw was under the persister's write load, which is gone |

Not checkable here: the Browser pane of the desktop app refuses every service worker ("unknown error occurred when fetching the script", also against `next start`); use headless Chrome over CDP or the Simulator.

### 🤔 Doubts for the owner

| # | Doubt |
| --- | --- |
| M1 | Cache estimate 27 MB, not the handoff's 14 (30 KB per image measured) — fine, or slim the variant further? |
| M2 | Out-of-set finds fill the cell but do not count (0008 A1) — still undecided; the ladybird from C9 sits in the diary as "Neu entdeckt" with the atlas at 1 entdeckt |
| M3 | Outbox on IndexedDB in Safari (A4): proven once, not on a real phone. M9's walk is the real test |
| M4 | Hosting for M9: LAN https from the MacBook works for the phone (`dev:lan:https`, the root CA on the phone); a deploy row for M8b is still an open proposal in the handoff |
