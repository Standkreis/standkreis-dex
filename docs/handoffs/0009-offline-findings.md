# 🔍📴 [0009] Findings — the atlas without signal (M8)

> Findings of [handoff 0009](0009-offline.md). What the handoff did not decide, the Simulator defect and its fix, the checks with evidence, the cache sizes, the shots, the doubts.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-05 | Sven Reiser | C1 C2 C3 C4 pass (Track A, production build on 3002, Chrome over CDP and the iPhone 17 Pro Simulator) · Track B and C5–C10 in their own section |


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
