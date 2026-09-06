# 🎬 [0013] Findings — onboarding, second pass (M9 friction O1–O10)

> Built on branch `0013-ob` from `main` against [handoff 0013](0013-onboarding-second-pass.md). Shots in [`0013-shots/`](0013-shots/), driver `app/scripts/m13/onboarding.mjs` (headless Chrome over CDP, the walk JSON per run next to the shots as `walk-<locale>-<width>.json`). No copy written beyond the promises slide and one placeholder slot (see O9a).

| 🗓️ | 👤 | 🌿 Branch | 🧪 |
| --- | --- | --- | --- |
| 2026-09-06 | agent (Claude Fable 5.1) | `0013-ob`, not pushed | production build, dev DB (Mainz-Bingen ready) |

---

## 🛠️ The rows

| Row | Done | Where |
| --- | --- | --- |
| O2 O8b | `SPLASH` = `/splash.jpg` with `srcset` 720/1440, `sizes="100vw"`, `object-cover`, focus `50% 62%` (the lit moss). Rendered **once** in `Onboarding()` as an absolute layer under a scrolling `relative h-full overflow-y-auto` pane; every step's content scrolls over it under the existing scrim (`from-night/15 via-night/60 to-night-deep`). No credit line; the `photo` key stays in both JSONs | `Onboarding.tsx:22-24, 55-62` |
| O4 | New token `--color-night-deep: #080803`, the image's bottom 2 % sampled (`#080802`–`#080803`, bottom row `#080803`). The onboarding page exports its own `viewport` (`themeColor: '#080803'`); `Onboarding()` sets `html`/`body` background to the token in an effect and restores it on unmount. Nothing else app-wide. The Shell's bottom nav no longer renders under `/onboarding` (C7 found Safari tinting its bar from it) | `tokens.css:11`, `onboarding/page.tsx:8-13`, `Onboarding.tsx:48-54`, `Shell.tsx:34-37` |
| O5 | Location button without the emoji; `locationHint` off the screen, the key stays in the JSONs | `Onboarding.tsx:147-149` |
| O6 | `dex.regions` → the `ready` rows as white buttons (`data-testid="regions"`, `data-region=<id>`), name only; the location button under them resolves via `lookupRegion(lat, lng)` and either goes to step 2 or shows `notAvailableHere` / `noLocation` **without leaving the buttons**. The search (input, results, `typePlace` button, `orUseLocation`) is gated behind `SEARCH_MIN_REGIONS = 2`; code untouched otherwise | `Onboarding.tsx:26-28, 88-91, 101-119, 139-157` |
| O8a | Cards redrawn, see §🃏 | `Onboarding.tsx:223-243` |
| O9a | Ready screen: `setSize` (929) and this month's count (364) from one `dex.set` read with `nowOnly: false` (the month count is `species.filter(now)`, byte-identical to what `nowOnly: true` returns, `dex.ts` filters on the same flag). Both go into `readyBody` as `{n}` and a new `{total}` slot | `Onboarding.tsx:261-263`, `de.json`/`en.json` `readyBody` |
| O1 O10 | Fourth screen `PromisesScreen` "Zwei Versprechen" (ours · yours, the owner's German mirrored in English), button "Bin dabei" → atlas. `noAccount` off step 3 (key stays). `stepOf` is `{step} von 4`; `?change=1` keeps three steps and skips the promises (`of = change ? 3 : 4`) | `Onboarding.tsx:44, 66-67, 290-310`, JSON `promises*` |

New keys (both locales): `promisesTitle`, `promisesOurs`, `promisesOursText`, `promisesYours`, `promisesYoursText`, `promisesGo`. Changed: `readyBody` (`{total}` slot). Unused now, kept for the owner's pass: `locationHint`, `photo`, `noAccount`, `typePlace`, `orUseLocation`, `placePlaceholder`, `noPlace`, `searchFailed`, `notAvailable` (the last five come back with the second region).

## 🃏 The tile card

**Choice: the set's lead image as a round thumb, not the silhouette.**

| | Silhouette | Lead image (chosen) |
| --- | --- | --- |
| Atlas language | Spec §🎨 2 rejected silhouettes for the grid ("generic, not reproducible"); the grid shows the reference image | The grid's own cell: photo, greyscale 45 % when not yet, colour when on, the moss ✓ badge on the image |
| Data | Nothing to fetch | Already there: `TilesScreen` reads `dex.set` for the counts; the thumb is `leadSmall` of the tile's first species (the grid's "jetzt wahrscheinlich" order, so the thumb changes with the month: September birds = Turmfalke) |
| Before the set exists | Fine | Falls back to the silhouette (kept as the `!thumb` branch) |
| Attribution | None needed | None on the card, as on the grid cell and the ready screen's nine (spec §⚖️ "no caption per grid cell"); see doubt D3 |

The card, theme-stable over the splash (`Onboarding.tsx:223-243`):

| State | Card | Thumb | Check | Text |
| --- | --- | --- | --- | --- |
| on | `bg-white` + `ring-2 ring-moss` inset | colour, on the `tile` token | moss ✓ badge on the thumb's corner, white ring | `night` name, `ink-soft` count |
| off | `bg-white/10` (glass) | `grayscale opacity-45` | none | `white/60` |

Stacked (thumb, then name, then count) so the German names never truncate at 360 px; the first draft (thumb · name · check in a row) cut "Säugetiere" to "Sä…". The count is the only number; no new icons, no emoji.

## ✅ Checks

| # | | Evidence |
| --- | --- | --- |
| C1 | ✅ | `c1-{1..4}-*-{de,en}-{390,360}.png`, 16 shots + `c1-2-tiles-one-off-light-*` (system light: identical, body `rgb(8,8,3)` in both). The `[data-testid=splash]` rect is `0 0 390×844` / `0 0 360×780` on every step; `h1` sits at `y 58.5` on steps 2, 3 and 4 in all four runs (no jump). Chrome picked `splash.jpg` at 390 @2× and `splash-720.jpg` at 360 @2× |
| C2 | ✅ | Kyoto (`ready` in the dev DB since 0007) was set to `failed` for the runs and restored after. Step 1: `regions: ['Mainz-Bingen']`, locate `Meinen Standort nutzen`, `searchField: false`, `typePlaceButton: false`, no hint, no credit, no 📍; tapping the button → `onboarding-tiles`. With two ready regions (`c2-two-regions-de-390.png`): two buttons and "Ort eingeben" returns, the input still hidden until tapped |
| C3 | ✅ | Geolocation unavailable → `noLocation` in 0–2 ms, `regionsStill: 1`, no search field (`c3-denied-*`). Paris (48.86, 2.35) → "Paris ist noch nicht verfügbar. Gib einen anderen Ort ein." in 2–213 ms, buttons still enabled, tapping Mainz-Bingen → step 2 (`c3-outside-*`). The line's second sentence is stale copy, doubt D1 |
| C4 | ✅ | `numbers: ['364 Arten', '929']`, body "364 Arten sind im September in Mainz-Bingen wahrscheinlich, 929 im ganzen Jahr. …" (`c1-3-ready-*`); en "364 species … 929 over the whole year" |
| C5 | ✅ | Promises → "Bin dabei" → `/de` with the grid's bar in 99–112 ms, overlay gone (`c5-atlas-*`). `?change=1`: Cancel present, "2 von 3", "3 von 3", button "Los geht's", no `ready-next`, → `/de` (`c5-change-3-ready-*`) |
| C6 | ✅ | `npm run check` green (typecheck, lint, 30 tests, export build). `splash.jpg` **617 944 B** (< 650 KB), `splash-720.jpg` 193 956 B. `fetchpriority="high" decoding="async"`; FCP 40–84 ms with the image request starting 56–79 ms and ending 57–98 ms: the first paint never waited for the image (`walk-*.json` → `step1.paint`) |
| C7 | ✅ | `c7-simulator-step1-de.png` (iPhone 17 Pro, Safari): the bar's band samples `#080803`, the page's bottom `#080803`. First attempt sampled `#1b2621` = the Shell nav's `bg-card` (dark), fixed at z-20 under the overlay: Safari tints from the bottom-most fixed element, not from what is visible. Hence the nav is not rendered on `/onboarding` |

## 🧭 Decisions the handoff left open

| # | Question | Decision | Why |
| --- | --- | --- | --- |
| D1 | Snap to the nearest available region when the point is outside | **Not built**; the `notAvailableHere` line, buttons stay | `Region` has no geometry (schema frozen); "nearest" would be a guess from GADM names |
| D2 | Where the errors send the user | Nowhere: the region buttons stay under the line; the search (when it exists) is one tap away | The first draft switched to search mode on error and the buttons vanished (`regionsStill: 0`), against C3 |
| D3 | Region button label | Name only | C2 reads "one button Mainz-Bingen"; `higher` is GBIF's English ("Germany › Rheinland-Pfalz") in a German screen |
| D4 | Steps 2–4 colours | Theme-stable white/glass over the splash, no `paper`/`card`/`ink` tokens | Those flip with the system theme; the first draft's dark-theme cards and the amber/moss boxes went unreadable over the image (headless Chrome ran dark) |
| D5 | Two `dex.set` reads for O9a | One (`nowOnly: false`), month count derived | Same numbers by construction; one round trip; the tiles screen's read has another key (all tiles) so it is not shared anyway |

## ❓ Doubts for the owner

| # | Doubt | Suggestion |
| --- | --- | --- |
| 1 | `notAvailableHere` ends in "Gib einen anderen Ort ein" and `noLocation` in "Gib den Ort ein", with no place to type | Owner's copy pass (O3): "Tipp auf einen Landkreis oben" or drop the second sentence |
| 2 | `readyBody` got "`{total}` im ganzen Jahr" / "over the whole year" from me so both numbers have a slot | O9b rewrites the sentence; the slots are `{n}` (month) and `{total}` (set) |
| 3 | The tile thumbs and the ready screen's nine show CC BY photos without a caption, like the grid cells | Spec §⚖️ allows it per cell; if the owner wants the long-press ⓘ here too it goes with M9b |
| 4 | The thumb of a tile is its first "jetzt wahrscheinlich" species, so it changes with the month | Stable alternative: the tile's most observed species (`obs`); one line in `TilesScreen` |
| 5 | The dev DB has two ready regions (Kyoto from 0007), production has one; the search button is visible locally | Leave Kyoto, or set it `failed` for good if the dev DB should mirror Neon |
| 6 | The `splash.jpg` is not in the worker's precache; the onboarding needs the DB anyway | Leave |
| 7 | Safari tints from the bottom-most fixed element: any future fixed footer on `/onboarding` brings the wrong colour back | Keep the Shell rule; C7 in every onboarding handoff |

## 🔀 For the merge

| | |
| --- | --- |
| Files | `app/src/components/Onboarding.tsx`, `app/src/components/Shell.tsx`, `app/src/app/[locale]/onboarding/page.tsx`, `app/src/styles/tokens.css`, `app/src/i18n/{de,en}.json`, `app/scripts/m13/onboarding.mjs`, this file and `0013-shots/` |
| Conflicts | None expected; `Shell.tsx` gained three lines at the top of `Shell()` |
| Data | The dev DB was touched once (Kyoto `failed` → `ready`), Neon not at all |
| Local | `app/.env.local` copied from the main checkout for the build (git-ignored); `next start` and Chrome killed |
