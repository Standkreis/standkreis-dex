# 🔍🚶 [0012] Findings — the first walk (M9)

> Findings of [handoff 0012](0012-first-walk.md). Track 0 first (the two known frictions, an agent); the walk, the next morning and the triage follow below when the owner has walked.

| 🗓️ Date | 👤 Owner | ✅ Checks |
| --- | --- | --- |
| 2026-09-06 | Sven Reiser | C1–C3 pass (Track 0, production build `mtpssvxo`, `next start -p 3002`, dev DB, headless Chrome over CDP) · the walk: open |

## 🔧 Track 0 · two frictions

Branch `0012-t0`, worktree `standkreis-dex-t0`. Shots in [`0012-shots/t0-*`](0012-shots/). Drivers `app/scripts/m12/onboarding.mjs` (C1) and `app/scripts/m12/sighting.mjs` (C2, C3), new.

| 📄 File | Change |
| --- | --- |
| `app/src/components/Onboarding.tsx` | F1: `retry: false` on `dex.lookupRegion`; the error's first line under the input as `data-testid="place-error"` |
| `app/src/i18n/de.json`, `en.json` | F1: `onboarding.searchFailed` |
| `app/src/trpc/client.tsx` | F2: `['journal', 'get']` in `PERSISTED`, `SIGHTING_CAP = 30` in `sanitize`; `gcTime` for every persisted query (see decisions) |
| `app/src/components/QueueFlusher.tsx` | F2: after a sighting row lands, `prefetchQuery(journal.get {id})` so the store holds the page before it was ever opened |
| `app/public/sw.js` | F2: `/de/sighting/_` and `/en/sighting/_` precached; a sighting path with no cached page is answered with the placeholder shell before the locale shell |
| `app/src/components/SightingPage.tsx` | F2: id from the pathname when `useParams` says `_` (the placeholder) |

### 🧭 Decisions the handoff left open

| # | Question | Decision | Why |
| --- | --- | --- | --- |
| D1 | How does `journal.get` get into the store for a page never opened? The handoff names only `PERSISTED` | The flush prefetches it when the sighting lands (`QueueFlusher.tsx`) | Persisting alone stores what was fetched; nothing fetched `journal.get` before the page opened. Seeding from `journal.days` was the alternative (findings 0011 A1) but its rows lack `reference`, the photo's attribution and the point |
| D2 | The handoff assumed the worker serves a never-opened sighting page | It did not: the fallback was the locale shell, and the atlas rendered under `/de/sighting/<id>` (first C2 run, `body: "Dein Atlas …"`). Now the placeholder shell `sighting/_` that the export ships (findings 0008 B2) is precached and served; the page reads the id from the URL because the router's params carry `_` (`create-initial-router-state.js:32`: `canonicalUrl` from `location`, the tree from the flight data) | The species page's answer (a "wartet aufs Netz" page) would have been honest but the data is there now |
| D3 | Nothing asked for `gcTime` | Every persisted query gets `gcTime = min(30 d, 2^31−1 ms)` | Default is 5 min: a query nobody observes (a prefetched `journal.get`, every query hydrated on a page that does not show it) is removed from memory after 5 min and the next write drops it from the store. The walk is longer than 5 min. First attempt was 30 d: past `setTimeout`'s ceiling the timer fires at once, and the store lost `dex.set` within a second (`probeOpenedOnline.store.queries: 2`). Hence the cap |
| D4 | Which line is "the query's error"? | The first non-empty line of `error.message`, after a translated sentence, in amber | With a dead DB that line is Prisma's ``Invalid `prisma.identity.create()` invocation:`` (the failure is in `createContext`, before the procedure); the useful line, "Can't reach database server", is the fourth. Doubt T2 |

### ✅ Checks

**C1 · dead DB, the search shows its error** — `DATABASE_URL=postgresql://dex:dex@localhost:5999/dex`, `NODE_ENV=production next start -p 3002`, fresh profile, `/de/onboarding` → "Ort eingeben" → `Input.insertText`.

| Evidence | de | en |
| --- | --- | --- |
| "Mainz" typed → `place-error` visible | **312 ms** (debounce 300 ms + a 7 ms 500) | 365 ms |
| Line | "Die Suche ist fehlgeschlagen. Tipp weiter, dann läuft sie erneut. · Invalid `prisma.identity.create()` invocation:" | "The search failed. Keep typing and it runs again. · …" |
| Input editable, value kept | `editable: true`, `"Mainz"` | same |
| "-Bingen" typed | one new request (`500`, 12 ms), error again 1 ms after the debounce, value `"Mainz-Bingen"` | same, 2 ms |
| "Einen Moment" on screen after 3 s | `false` | `false` |
| `curl` of the query | `{"message":"\nInvalid `prisma.identity.create()` invocation:\n\n\n","data":{"code":"INTERNAL_SERVER_ERROR","httpStatus":500}}` | |

Shot: `t0-c1-error-de-light.png`. Before the fix, by the code: three retries with backoff (`retry: 3` default, `isLoading` true throughout) kept "Einen Moment …" up for ~7 s, then the list rendered no line at all (findings 0011 §📱 saw it as "forever"); not re-run on the old build.

**C2 · logged online, never opened, opens offline** — dev DB, a fresh identity with the region set through `identity.setFilter`, `/de/log` → "Xylaria" → `DOM.setFileInputFiles` on `photo-input` → Wild; then `Network.emulateNetworkConditions {offline}` on the page and the worker; `Page.navigate` to the sighting.

| Evidence | Value |
| --- | --- |
| Search → row | 187 ms, "Geweihförmige Holzkeule · Xylaria hypoxylon · Pilz" |
| Photo upload (71 KB JPEG) | 154 ms, `save-photo[data-photo]` |
| Wild → `/de?fill=<id>` | 592 ms; calls after the tap: `sighting.create`, `identity.progress`, `sighting.fill`, `sighting.photos,sighting.outside`, **`journal.get`** |
| Store online | 6 queries incl. `journal.get:success`, 907.7 KB; `/api/photo/<id>` in `dex-images` (127 entries) |
| Offline, first open of `/de/sighting/<id>` | `[data-testid=sighting]` after **1,165 ms**; h1 "Geweihförmige Holzkeule"; `[data-testid=image]` `/api/photo/<id>` decoded, 369 px; caption "Dein Foto"; no "Einen Moment" |
| Network while offline | the HTML navigation itself `ERR_INTERNET_DISCONNECTED` → answered by the worker from `/de/sighting/_`; only RSC prefetches failed besides |

Shots: `t0-c2-online-sheet-de-light.png`, `t0-c2-offline-sighting-de-light.png`. Two failed runs on the way, both fixed above: `persistedGet: false` with `gcTime` at 30 d (D3); the atlas under the sighting URL with the locale-shell fallback (D2).

**C3 · check green, the store with 30 sightings**

| Evidence | Value |
| --- | --- |
| `npm run check` | typecheck ✅ · lint 0 errors (1 pre-existing warning, `scripts/m8b/queue.mjs` `waitGone`) · **30 tests** ✅ · export 2,411 pages ✅ |
| Store after 31 sightings created (API) and each page opened once online | **985,780 bytes = 962.7 KB**, 36 queries, `journal.get` × **30** (the 31st dropped by `SIGHTING_CAP`), 1,315 bytes per sighting |
| Of that, the base store (`dex.set` 900 KB + progress, me, photos, outside, days) | 907.7 KB; 30 sightings add ~40 KB |

Under 1 MB as asked, but note: with `PAGE_CAP` species pages (~59 KB each) the store is ~1.55 MB; the "~1 MB" of `client.tsx`'s comment was already without them. Safari's limit is 5 MB.

### ❓ Doubts for the owner

| # | Doubt | Weight |
| --- | --- | --- |
| T1 | D3 is a fix to what exists, not a friction the owner felt: before it, a sighting logged at minute 0 of a walk was out of the store by minute 5 (any write after GC), and so was every species page and, on a page that does not show them, `journal.days` and the rest. Findings 0009's checks ran inside 5 min. Not verified in the Simulator; verified by C2 and by the failure mode when the value overflowed | medium |
| T2 | The error line's tail is Prisma's first line, useless to a walker (D4). Options: the tRPC `data.code` + `httpStatus` ("500 · INTERNAL_SERVER_ERROR"), or nothing but the sentence. The Vercel case of findings 0011 (`ENOENT mkdir`) would have shown as "ENOENT: no such file or directory, mkdir '/var/task/…'", which is the useful kind | low |
| T3 | The placeholder shell hydrates with the tree of `sighting/_`; a client navigation from there (Back, "Zur Art") fetches an RSC payload, fails offline and falls back to a full navigation the worker answers, as findings 0009 describe. Not driven in C2 | low |
| T4 | `journal.get` carries the exact point (spec §⚖️: exact only on this page). Thirty of them now sit in localStorage in clear, next to the diary rows that carry the Gemeinde only. The M8 store already held photos' URLs; this is the first exact place in it | low, note for the privacy line of the spec |
| T5 | The offline banner did not show on the C2 sighting page (`banner: null`): it keys on a failed refetch, and `journal.get` was fresher than `staleTime`. Findings 0009 behaviour, unchanged | none |

### 📝 Seen on the way, not fixed (friction log input)

- `next start` with a dead DB logs `[sweep] failed: ` with an empty message (`server/jobs.ts` sweep at `register()`): the error text is lost.
- Five headless Chromes with `/tmp/dex-m8a-*` profiles from earlier sessions were still running on the Mac; not this track's, left alone.
- `scripts/m8b/queue.mjs:39` `waitGone` unused, the one lint warning left.

### 🔀 For the merge

Track 0 alone on `main`; no shared files with another track. The worker changed (`sw.js`): every build is a new worker, so the phone picks it up on the next visit with signal. `npm run check` green on `0012-t0`.
