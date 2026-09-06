# 🎨 [0014] Findings — UI second pass

> Against [handoff 0014](0014-ui-second-pass.md). One section per track. Shots in [`0014-shots/`](0014-shots/), Track A's driver `app/scripts/m14/ui.mjs` (headless Chrome over CDP on the production build, dev DB; prints the check JSON).

## 🅰️ Track A

| 🗓️ | 👤 | 🌿 Where | 🧪 |
| --- | --- | --- | --- |
| 2026-09-06 | agent (Claude Fable 5.1) | `main`, working tree, not committed | `npm run check` green · `scripts/m14/ui.mjs` on `next build` + `next start -p 3002`, Mainz-Bingen |

### 🛠️ The rows

| Row | Done | Where |
| --- | --- | --- |
| G1 | One hook `useDragDismiss(onClose)` → `{ sheet, dragProps, sheetStyle }`. The handle **and** the header are one drag surface (`touch-action: none`, pointer capture); the sheet follows the finger by `translateY`, settles back in 180 ms or slides out and closes. Escape and click-outside untouched | `useDragDismiss.ts`, `LogSheet.tsx:19-28`, `FilterDrawer.tsx:49-67` |
| G3 | No labels. Active = filled glyph in `ink` + 6 px moss dot under it; inactive = outline in `ink-soft`, transparent dot keeps the height. `aria-label` carries the name, `data-testid="tab-<id>"`. Bar 60 px (was 63) | `Shell.tsx:9-30`, `Marks.tsx:19-38` (`FilledIcon`, four filled shapes; the journal's mountains are stroked in `card` over the fill) |
| G4 | `--color-amber` `#b8701a` → `#c4620f` (light), `#e09a3a` → `#f0a030` (dark). Permanent `ring-2 ring-moss ring-inset` on seen cells in `Cell`, `DemoCell` and `Thumb` (diary rows, and with it lookalike cards and ecology chips); the fill moment's `ring-[3px] ring-moss` wins while `fill === 'done'`, then the inset ring stays | `tokens.css:16,37,56`, `AtlasGrid.tsx:254`, `Onboarding.tsx:329`, `SpeciesCard.tsx:21` |
| G5 | **No new token**: `--color-sky`, `-deep`, `-soft` exist since the scaffold (`tokens.css:18-20`, "XP and level only"); the handoff's "there is no blue token yet" is wrong. Comment widened to selection. Used: step 1 radio dot, step 2 check badge, drawer chips (`bg-sky-soft text-sky-deep ring-sky`), diary pills | `Onboarding.tsx:151,260`, `FilterDrawer.tsx:85,130`, `Journal.tsx:72` |
| D1 | Seen before studied: species state row (`data-testid` `state-seen` / `state-studied`), diary pills `Alle · Entdeckt · Studiert` (`KINDS` order), onboarding demo cards. The sticky buttons already were Entdeckt · Studiert | `SpeciesPage.tsx:113-121`, `QueueRows.ts:7`, `Onboarding.tsx:301-303` |
| D2 | 👁 on the Entdeckt button → `Icon name="check"` (new path, the SeenMark's stroke). Also gone from the page: the six Steckbrief emoji, 🍄 on the fungus notice, the emoji placeholder of an imageless slider (→ `OnboardingSilhouette`). `SpeciesSlider` prop `tileIcon: string` → `tile: string` | `SpeciesPage.tsx:218`, `Marks.tsx:13`, `SpeciesSlider.tsx:40,57` |
| D5 | Lookalikes and ecology sections render only with content. Vorkommen and Steckbrief keep their empty lines. `lookalikes.empty` and `ecology.empty` keys are now unused, left in both JSONs for B's merge | `SpeciesPage.tsx:179-208` |
| P1 | Counter line `text-[15px] text-ink-soft`, the two coloured spans as in the atlas header | `IdentityCounters.tsx:20` |
| P4 | `SpeciesOrigin.ts`: `rememberSpeciesOrigin(path)` on the tab's link (grid cell, diary row, fill sheet's two links, sighting page's "Zur Art") stores `{ path + search, scrollY }` in `sessionStorage`; species → species links leave it alone. The slider's back button does `router.push(speciesOrigin())`, atlas when nothing is stored. The atlas and the diary call `restoreSpeciesOrigin(pathname)` once their list is up: scroll put back, key cleared | `SpeciesOrigin.ts`, `SpeciesSlider.tsx:40`, `AtlasGrid.tsx:163,204,253`, `Journal.tsx:57,147`, `Fill.tsx:40`, `SightingPage.tsx:99` |

### 🤏 The drag helper's thresholds

| Constant | Value | Meaning |
| --- | --- | --- |
| `DRAG_CLOSE_FRACTION` | 0.3 | closes when the finger travelled ≥ 30 % of the sheet's height |
| `DRAG_FLICK_PX_PER_MS` | 0.5 | closes on a downward velocity above 0.5 px/ms … |
| `DRAG_FLICK_MIN_PX` | 24 | … but only after 24 px of travel; less is a wobble |
| `VELOCITY_WINDOW_MS` | 100 | velocity is measured over the last 100 ms of samples, not the whole gesture |
| `SETTLE_MS` | 180 | snap back or slide out; `onClose` fires after the slide |

Upward travel is clamped to 0. `pointercancel` (the browser took the gesture) snaps back. The drawer's scrolling body is not a drag surface, so its scroll is untouched.

### 🧪 Checks C1–C5

Numbers from `scripts/m14/ui.mjs` (390 × 844, light scheme forced; the machine runs dark, the first run proved every token also flips there).

| # | What | Result | Shot |
| --- | --- | --- | --- |
| C1 | Drawer 776 px: wobble 20 px → `translateY(20)` during, `none` after, open. Slow drag 311 px (40 %) → closed. Flick 45 px in ~50 ms → closed. Chooser 274 px: wobble 22 px stays, drag 110 px closes, flick 45 px closes | ✅ 6/6 | `c1-chooser-mid-drag` (sheet 80 px down under the finger) |
| C2 | Seen cell `box-shadow … rgb(22,163,74) 2px inset`, studied cell `rgb(196,98,15) 2px inset`; dark theme amber `rgb(240,160,48)`. Diary thumbs: study row amber ring, sighting row moss ring. Demo cells on the ready screen: same two rings | ✅ | `c2-grid-seen`, `c2-grid-studied`, `c2-grid-studied-dark`, `c2-journal`, `g4-onboarding-3-ready` |
| C3 | Reptilien + Amphibien off, Studiert on: every checked chip `bg rgb(219,234,254)`, text `rgb(29,78,216)`, ring `rgb(37,99,235)`. Moss left on the sheet: `apply`, `change-region` (Ändern), `offline-download-drawer-button`: **actions only**, no selection | ✅ (see doubt 3) | `c3-drawer` |
| C4 | Planuncus tingitanus (no lookalikes, no interactions): `[data-testid=lookalikes]` and `[data-testid=ecology]` absent, Vorkommen present ("Hauptzeit Jun–Aug · Okt"). State order `state-seen, state-studied`; buttons "Entdeckt" / "Studiert" with SVG, `\p{Extended_Pictographic}` over the page: none (only ©) | ✅ | `c4-bare-species-bottom`, `d1-species-seen` |
| C5 | Atlas scrolled to 26 746 px → Idaea bilinearia → lookalike Idaea degeneraria → back: lands on `/de` in 66 ms, `scrollY` 26 746 before and after, key cleared. Diary → study row → species → lookalike → back: `/de/journal` | ✅ | `c5-atlas-after-back` |
| G3 | Four `nav a`: `aria-label` Atlas · Quests · Tagebuch · Profil, `innerText` empty, active has `path[fill=currentColor]` and the dot `rgb(22,163,74)`, inactive dots transparent | ✅ | `c2-grid-seen` (bottom) |
| G5 | Step 1 radio dot and step 2 check badge `rgb(37,99,235)`; selected diary pill `rgb(219,234,254)` | ✅ | `g5-onboarding-1-region`, `g5-onboarding-2-tiles` |
| P1 | `[data-testid=counters]` 15 px, `rgb(91,103,95)` | ✅ | `p1-profile` |

**Not verified**: a real finger in the Simulator (CDP mouse events → pointer events with `pointerType: mouse`; the touch path shares the code but `touch-action: none` vs Safari's own scroll was not exercised). The desktop Browser pane was not used. Contrast of the new amber: 4.1 : 1 on white, 3.7 : 1 on paper (the old one: 3.9 / 3.5), computed, not seen on a phone in the sun.

### ❓ Doubts for the owner

1. **D1 and the counter line.** "1 studiert · 1 entdeckt · 929 möglich" (atlas header, profile) still reads amber-then-green: spec §🎨 fixes that order for text **and** the bar, and the bar segments are amber-then-green. Swapping the text alone would misalign it with the bar; swapping both is a spec change. Left as is. Same for the badges in a grid cell (book bottom-left, check bottom-right).
2. **D1 in the onboarding demo.** The ready screen now says Entdecken before Studieren. 0013 chose the other order; if the story "read first, then find" mattered there, revert `Onboarding.tsx:301-303`.
3. **C3 "the only moss on the sheet".** Ändern (`change-region`) and the offline download button are moss too. Both are actions, which the handoff's own rule keeps moss. If the owner meant literally one moss thing, Ändern becomes `ink-soft` underlined.
4. **D2 beyond the buttons.** The grid cell's 📖 badge (spec §🎨 2), the fill sheet's 👁 and 📷, the chooser's three emoji tiles, and `Thumb`'s emoji fallback for imageless species are untouched: outside the species page and outside the rows. The spec's "no emoji in the UI" line would take them all in one later pass.
5. **P4 and the tab bar.** The handoff says "the tab bar stays as the second way out", but `SpeciesPage.tsx:105` hides it (`[&~nav]:hidden`, from the mock). Now the back button is the *only* way out of a species page. Either the bar comes back on the species page (one class) or the sentence goes.
6. **Amber.** `#c4620f` is one step towards orange, still under AA for 15 px bold text on white (4.1 : 1; the old one was 3.9). Reaching 4.5 : 1 means `#b45309` (5.0), which is darker, not more saturated.
7. **Thumb's moss ring** reaches lookalike cards and ecology chips through the shared `Thumb`. Consistent with "the image tells the state", but the owner named only the diary.
8. **Fill sheet** keeps its own 60 px pull-down (`Fill.tsx:45-46`); it could take the helper in a later pass.

### 🔀 For the merge

Files Track A changed that B and C also touch:

| File | A's change | Who else |
| --- | --- | --- |
| `SpeciesPage.tsx` | state row order, `check` icon, no FACT_ICONS, sections gated, slider `tile` prop | B (D3, D4) |
| `SpeciesSlider.tsx` | prop `tileIcon` → `tile`, `back` via `speciesOrigin()`, silhouette placeholder | B (D3 on the slider image) |
| `SpeciesCard.tsx` | `Thumb` seen ring | B (D4 ecology grid) |
| `Journal.tsx` | pills sky, `restoreSpeciesOrigin`, `rememberSpeciesOrigin` on the species link | B (T1) |
| `SightingPage.tsx` | `rememberSpeciesOrigin` on "Zur Art" | B (T1); the "Zur Art" link should keep the call when it moves into the drawer |
| `IdentityCounters.tsx` | 15 px line | C (P3 sits under it in `IdentityProfile.tsx`, untouched by A) |
| `Fill.tsx` | origin on both links | nobody planned |
| `tokens.css` | amber, sky comment | D (palette) |
| locale JSONs | **untouched** | B, C add keys |

New files: `useDragDismiss.ts`, `SpeciesOrigin.ts`, `scripts/m14/ui.mjs`. `QueueRows.ts` `KINDS` order changed; `mergeQueued` does not depend on it.

## 🅱️ Track B

| 🗓️ | 👤 | 🌿 Where | 🧪 |
| --- | --- | --- | --- |
| 2026-09-06 | agent (Claude Fable 5.1) | worktree `../standkreis-dex-b`, branch `0014-b` on A's `b61bb64`, working tree, not committed | `npm run check` green (one pre-existing warning, `scripts/m8b/queue.mjs:39`) · `scripts/m14/track-b.mjs` on `next build` + `next start -p 3003`, Mainz-Bingen, dev DB |

### 🛠️ The rows

| Row | Done | Where |
| --- | --- | --- |
| D3 | One `SourceInfo` (ⓘ button, `tone` card · plain · glass) and one `SourceSheet` (title, rows of author · licence · source with links, drag-to-dismiss via A's hook, `z-50` so it sits over the sighting drawer). `useImageSource` turns any asset row into a sheet row; user photos say "Dein Foto" and carry no link. `licenceUrl()` maps a CC string to its deed | `SourceInfo.tsx:25,36,53`, `SpeciesPage.tsx:20` |
| D3 · spots | Slider image (ⓘ over the image; long-press and the caption open the same sheet) · intro (after the text: Wikipedia page, licence deed) · every Steckbrief cell (cell label row; AnAge, GBIF and the IUCN search) · Vorkommen (section title: GBIF occurrence search) · Verwechslungsgefahr (section title: the genus rule, then **one credit row per thumb**) · Ökologie (section title: GloBI query, then one credit row per in-set chip, deduplicated across categories) · Quellen line (every source with a link, then one row per slider image) | `SpeciesSlider.tsx:65,78`, `SpeciesPage.tsx:116-131,160,171,180,208,214,235` |
| D3 · cards | Look-alike cards and ecology chips have **no ⓘ of their own**: a button inside a link is invalid, and forty ⓘ on 36 px thumbs are noise. Their credits are the rows of the section's sheet. The router sends the lead's attribution as `leadInfo` on every card | `taxon.ts:14-15,30`, `SpeciesCard.tsx:9` |
| D3 · onboarding | Tiles screen: ⓘ on every tile card with a thumb (sibling of the checkbox, `absolute top-2 right-2`, plain on the white card, glass on the off card). The sheet names the species behind the thumb. The tile's checked state does not flip on the tap (checked 8 before and after) | `Onboarding.tsx:233,269` |
| D4 | `ChipGrid`: two columns at phone width, three from 480 px; rows are **measured** (`offsetTop`, `useLayoutEffect`, re-measured on a width change), three rows shown, the rest behind "mehr anzeigen (n)" / "weniger anzeigen" (a toggle, `aria-expanded`). Category title `frisst ······ (49)`: dotted leader, the count flush right. `SpeciesSlider` untouched, the horizontal `Row` stays for look-alikes only. `ecology.more`, `ecology.empty` and `lookalikes.empty` removed from both JSONs | `SpeciesCard.tsx:75-118`, `SpeciesPage.tsx:218-230` |
| T1 | `SightingDetail` (shared) + `SightingDrawer` (from the diary) + `SightingRoute` (the `/sighting/<id>` page, back link on top). Hero: own photo in colour with ⓘ "Dein Foto"; else the reference image with the `Referenzfoto` tag (top-left), `Foto hinzufügen` (bottom-left, camera icon) and the credit ⓘ (bottom-right). One meta line `Sa 5. Sep 2026 · 16:37 · Ingelheim am Rhein · Insekt oder Spinne`; the date is a dotted-underlined button that opens the `datetime-local` field under the line: no "Wann" label anywhere. "Zur Art ›" a full-width moss button (358 px), `rememberSpeciesOrigin` kept (page: `/sighting/<id>`, drawer: the diary's path). Then Notiz · Wo (exact map) · Wild oder gehalten · Löschen. Save bar `fixed` on the page, `sticky` inside the drawer | `SightingDetail.tsx:30,98,104,127-128,147,153,210,238`, `SightingPage.tsx` (28 lines, the id from the URL) |
| T1 · diary | A sighting row keeps its `href` (long-press, pasted link, no JS) and opens the drawer on tap (`preventDefault`); Escape, drag, tap outside and Schließen close it. Study rows unchanged | `Journal.tsx:97,152` |
| T1 · photo | `Foto hinzufügen`: `shrinkToJpeg` → online `POST /api/photo` + `sighting.attachPhoto`; without signal an outbox `photo` row with `forSighting` (the flush already handles this kind, `Queue.ts:147`) and the local blob stands in as the hero. Not exercised by the driver (headless Chrome has no file picker); the online path is the log flow's upload plus an existing mutation | `SightingDetail.tsx:57-80` |
| icon | `camera` added to the stroke set | `Marks.tsx:14` |

### 🧪 Checks C6–C7

Numbers from `scripts/m14/track-b.mjs` (390 × 844, light). A fresh identity, two sightings of *Idaea bilinearia*: one with a JPEG uploaded through `/api/photo` and bound at `sighting.create`, one without.

| # | What | Result | Shot |
| --- | --- | --- | --- |
| C6 | *Pieris brassicae*, "wird gefressen von" 40 items: heading `wird gefressen von (40)`, count's right edge = heading's right edge (0 px). Folded: 6 chips in **3 rows**, toggle `mehr anzeigen (34)`, `aria-expanded=false`. Open: 40 chips, 20 rows, `weniger anzeigen`. Refolded: 6 / 3 again. The other categories read `frisst (49)`, `bestäubt (11)`, `besucht Blüten von (100)`. No `overflow-x-auto` left in the section | ✅ | `b-c6-ecology-folded`, `b-c6-ecology-open` |
| C7 · drawer | Diary → row with photo: `[data-own-photo=true]`, hero `/api/photo/<id>`, no tag, no add button, ⓘ present; URL stays `/de/journal`; dialog 390 × 776 at y 68. Row without photo: `[data-own-photo=false]`, tag `Referenzfoto`, button `Foto hinzufügen`, ⓘ present. Both: meta line as above, `Zur Art ›` 358 px moss, "Wann" occurs 0 times, `h2`s NOTIZ · WO · WILD ODER GEHALTEN. Tap on the date → the `at` field appears with `2026-09-05T16:36`. Drag 360 px on the handle → closed | ✅ | `b-c7-drawer-own-photo`, `b-c7-drawer-reference` |
| C7 · route | `/de/sighting/<id>` as a pasted link: the same detail under `‹ Tagebuch` | ✅ | `b-c7-route-reference` |
| C7 · offline | Network off on the page and the worker sessions (`offline.mjs` pattern): diary → row → drawer in 0 ms from the persisted `journal.get`; then `Page.navigate` to the other sighting's route → detail in 60 ms from the worker's shell and the cache. Both with hero, tag/ⓘ and meta line as online | ✅ | `b-c7-route-offline` |
| D3 | Species page: six ⓘ (`slider-info, fact-info, occurrence-info, lookalikes-info, ecology-info, sources-info`; the intro's is absent because this species has no intro). Slider sheet: `Autor Baranyi Tamás · Lizenz CC BY-NC-ND 4.0 (creativecommons.org) · Quelle iNaturalist`. Status cell: `Quelle GBIF`. Look-alikes: 9 rows = the genus rule + 8 thumb credits (gbif, creativecommons, inaturalist, commons). Quellen: 5 rows, links to gbif, wikidata, globalbioticinteractions, creativecommons, inaturalist. Onboarding tiles: 8 ⓘ, the bird tile's sheet `Dschungelkrähe · Joe Bourget · CC BY-NC 4.0 · iNaturalist`; still 8 tiles checked after the tap | ✅ | `b-d3-slider-sheet`, `b-d3-lookalikes-sheet`, `b-d3-sources-sheet`, `b-d3-species-bottom`, `b-d3-onboarding-tiles-sheet` |

**Not verified**: the file picker (`Foto hinzufügen`) in any browser; the Simulator; the dark theme (the sheet uses tokens only); en copy on screen (keys exist, parity test green).

### ❓ Doubts for the owner

1. **D4 · "9 chips at 390 px" became 6.** A chip with a 36 px thumb and a readable name needs ~175 px; three per row would truncate every second German name ("Gartenkreuzspinne" already clips in two columns at 14 px). Three rows are still three rows; the fold shows 6. If 9 matters more than the names, `grid-cols-3` and `text-[13px]` in `SpeciesCard.tsx:107` do it.
2. **D3 · no ⓘ per card.** Look-alike cards and ecology chips are links; their credits live in the section's sheet, one row per thumb (the 100-item "besucht Blüten von" makes a long sheet: it scrolls). If the owner wants a glyph on each thumb, it needs a wrapper per card and an absolute ⓘ, ~10 lines in `SpeciesCard.tsx`.
3. **T1 · "Landkreis" in the meta line is the Gemeinde.** The sighting stores `place` (Gemeinde, spec §⚖️ ladder); the region is not on the row and a sighting can be logged outside it. The line reads `date · time · Gemeinde · Gruppe`. To show the Landkreis instead, `identity.me.region.name` is one hook away, but it would be wrong for sightings outside the region.
4. **T1 · the drawer has no URL.** Back does not close it (Escape, drag, tap outside and Schließen do); a refresh on the diary loses it. `pushState` to `/sighting/<id>` would make the App Router render the route. Acceptable for a transient sheet; say so if not.
5. **T1 · the tab bar** is hidden on the route (`[&~nav]:hidden`, as before) and covered by the drawer in the diary. Same question as A's doubt 5.
6. **D3 · the intro's ⓘ** sits after the last sentence, inline. The owner named facts, occurrence, look-alikes, ecology and the Quellen line; the intro is the one CC BY-SA text on the page, so it got one too. Easy to drop (`SpeciesPage.tsx:160`).
7. **Facts cells lost their source line** ("AnAge" under the value): the ⓘ replaces it. If the owner wants both, restore `sub: f.source` in `SpeciesPage.tsx:95`.
8. **Removed keys**: `species.ecology.more`, `species.ecology.empty`, `species.lookalikes.empty`, `sighting.reference`, `sighting.photoCaption`, `sighting.when` (all unused after A and B). Track C must not reference them.

### 🔀 For the merge

Files Track B changed that A changed or C is likely to touch:

| File | B's change | Who else |
| --- | --- | --- |
| `SpeciesPage.tsx` | imports, `licenceUrl` + `HOME`, `name`/`imageSource` hooks, `expanded` state and `CHIP_CAP` gone, cells carry `sources`, the six ⓘ, ecology block rewritten on `ChipGrid`, `Section` takes `info`. A's D1/D2/D5 lines untouched | A (merged already, B is on top); C: unlikely |
| `SpeciesSlider.tsx` | `tc` and the inline sheet gone, `SourceSheet` + `slider-info`, `useOriginName`. A's `back` and silhouette untouched | A |
| `SpeciesCard.tsx` | `Card.leadInfo`, chips `min-w-0` / `line-clamp-2` instead of `shrink-0 snap-start`, `ChipGrid` appended. A's `Thumb` ring untouched | A |
| `Journal.tsx` | `useState`, `SightingDrawer` import, `open` state, `onOpen` threaded through `DayCard` → `JournalRow`, sighting link `preventDefault`. A's pills and origin calls untouched | A |
| `SightingPage.tsx` | reduced to the route wrapper (id from the URL); everything else moved to `SightingDetail.tsx`. A's `rememberSpeciesOrigin` on "Zur Art" lives at `SightingDetail.tsx:153` | A |
| `Onboarding.tsx` | `SourceInfo` import, `ts`/`imageSource` hooks in `TilesScreen`, `thumbs` map carries the credit, `li` relative + ⓘ | A (G4/G5 lines untouched); C: no |
| `Marks.tsx` | `camera` path appended to `paths` | A (`FilledIcon`, `check`) |
| `taxon.ts` | `leadSelect`, `LeadRow`, `card()` adds `leadInfo` | nobody planned |
| `de.json`, `en.json` | new: `species.ecology.showMore/showLess`, `species.sourceInfo.*` (6 keys, end of the `species` block), `sighting.referenceTag/addPhoto` (end of `sighting`), top-level `sourceInfo.open/title` (end of file). Removed: see doubt 8 | C adds its own keys at the end of its blocks; merge by hand |

New files: `SourceInfo.tsx`, `SightingDetail.tsx`, `scripts/m14/track-b.mjs`, eleven `b-*` shots. `journal.ts` untouched (the diary's cards carry no `leadInfo`; `Card.leadInfo` is optional).

## 🅲 Track C

| 🗓️ | 👤 | 🌿 Where | 🧪 |
| --- | --- | --- | --- |
| 2026-09-06 | agent (Claude Fable 5.1) | worktree `../standkreis-dex-c`, branch `0014-c` on A's `b61bb64`, working tree, not committed | `npm run check` green (32 tests) · `scripts/m14/track-c.mjs` on `next build` + `next start -p 3002`, dev DB, Mainz-Bingen, disk photo store |

### 🛠️ The rows

| Row | Done | Where |
| --- | --- | --- |
| P2 avatar | `Identity.avatarAssetId` → one user `Asset` per identity (`@unique`, `onDelete: SetNull`), back-relation `Asset.avatarOf`. Migration **`20260906140000_identity_avatar`**, written by hand, applied to the dev DB with `migrate deploy` only; `migrate diff` against the dev DB is empty. Client: `cropToAvatar` takes the centre square through a canvas at ≤ 256 px JPEG 0.85 (no EXIF, orientation applied first), uploads through the existing `POST /api/photo` (`uploadPhoto`), then `identity.setAvatar({ assetId })` binds the unattached Asset and drops the previous one (row and file via `deletePhoto`); `null` takes it off. Served by the existing `GET /api/photo/<id>`; a new id per upload, so the immutable cache header holds. `identity.me` carries `avatarUrl`. The sweep skips assets with `avatarOf`; adoption carries the avatar when the adopted identity has none; identity delete already removes every owned file. Shown only on the profile card, camera badge on the circle | `schema.prisma:26-27,227-228` · `prisma/migrations/20260906140000_identity_avatar/migration.sql` · `IdentityAvatar.tsx:17-32` (crop), `:38-84` (button, hidden input `avatar-input`) · `identity.ts:77` (`me`), `:107-117` (`setAvatar`), `:56` (merge) · `photos.ts:72` (sweep) · `IdentityProfile.tsx:45` · `Marks.tsx:14` (`camera`) |
| P2 region | "Region ändern" next to the region name, a link to `/onboarding?change=1`, the same entry the drawer's Ändern uses (`AtlasGrid.tsx:216`; `Onboarding.tsx:41` reads `change=1`, not `mode=change` as the handoff wrote) | `IdentityProfile.tsx:53-56` |
| P3 | Card "Nach Gruppe" under the counters: one row per tile of `dex.set.tiles` (fish only where the set has it, E12), name from `dex.tile.*`, "studied · seen von possible" on the right, two 4 px bars (studied amber, seen moss; a non-zero bar is floored at 2 % as `CountersBar`). No new query: `useAtlasSet` is the cache entry the grid and the counters card already hold. Counting is pure in `groupsOf` (dedupes ids, ignores out-of-set finds), tested | `IdentityGroups.tsx:15-45` · `GroupRows.ts:6-15` · `GroupRows.test.ts` · `IdentityProfile.tsx:77` |
| i18n | `you.avatar`, `avatarBusy`, `avatarError`, `changeRegion`, `groups`, `ofPossible`, appended at the end of the `you` block in both files | `de.json:131-136`, `en.json` same keys |

### 🧪 C8 · `scripts/m14/track-c.mjs`

Fresh identity, Mainz-Bingen, one sighting (Idaea bilinearia) and one study (Bombus hortorum), 390 × 844 light. The fixture is `public/splash.jpg` (1440 × 2640, portrait) set on the hidden input over CDP `DOM.setFileInputFiles`.

| Step | Result | Shot |
| --- | --- | --- |
| P3 rows | 7 rows (no fish in Mainz-Bingen), `possible` 69 · 8 · 7 · 5 · 429 · 388 · 23 = **929**, the counter line's number. Insekten `1 · 1 von 429`, bars 2 % amber `rgb(196,98,15)` and 2 % moss `rgb(22,163,74)`, 4 px; every other row `0 · 0`, bars 0 % | `c-p3-groups` |
| Upload | Before: no image, empty circle (no name). After the input change: `<img>` `/api/photo/db20f5a5-…`, **256 × 256** natural (the portrait fixture cropped square), served `200 image/jpeg`, **19 237 bytes**, `private, max-age=31536000, immutable`, file under `PHOTO_DIR`, `identity.me.avatarUrl` the same URL, no error line | `c-p2-avatar` |
| Reload | `Page.reload` → the same `src`, 256 × 256, `complete` | |
| Replace | Second upload → new id `e9ed70c0-…`, `me` follows; the old URL **404**, the old file gone from disk | `c-p2-avatar-replaced` |
| Foreign asset | `identity.setAvatar` with an unknown uuid → `404 not your unattached photo` | |
| Region change | Click `change-region` → `/de/onboarding?change=1` in 11 ms, `data-testid=onboarding-region`, Abbrechen visible | `c-p2-change-region` |
| Delete | `data.delete` two steps → `done`; the avatar URL 404, the file gone | |

**Not verified**: the Simulator's photo library (the handoff's C8 wording): CDP sets the file, the picker itself was not opened. Vercel Blob: the worktree has no token, so the store was disk; the seam is untouched and the avatar uses the same `writePhoto`/`readPhoto`/`del` path as sighting photos, which 0011 proved on Blob. The sweep's `avatarOf: null` filter was not exercised (a sweep starts region jobs and content batches); it is one where-clause.

### ❓ Doubts for the owner

1. **Change mode preselects the first region, not the current one.** Step 1 shows Kyoto checked while the identity is in Mainz-Bingen (`c-p2-change-region`). Pre-existing behaviour of `Onboarding.tsx` (not in C's files); in change mode it should start from `me.region`. One line in `Onboarding.tsx` for whoever touches it next.
2. **Bar order in P3** is studied then seen, matching the counter line and `CountersBar` (A's doubt 1), not D1's seen-then-studied. If the owner swaps the line and the bar, swap `IdentityGroups.tsx:34-35` with them.
3. **Seven rows, not eight** in Mainz-Bingen: `dex.set.tiles` drops fish when the set has none (E12), as the drawer does. A row "Fische 0 · 0 von 0" would contradict the drawer; left out.
4. **Adoption with two avatars**: when both identities have one, the adopted side keeps its own and the device's becomes an orphan the sweep removes after a day (`avatarOf` is null once `from` is deleted). Same rule as `displayName`.
5. **Avatar on the static export**: `photoSrc` prefixes `NEXT_PUBLIC_API_URL`, as for sighting photos. The worker does not precache it; it is fetched when the profile opens, so offline the circle falls back to the browser's cache or the alt text. The profile is not part of the walk.
6. **The FAB covers the offline card's button** when the profile is scrolled to the bottom (`c-p2-avatar-replaced`, bottom). Pre-existing, now more visible because P3 makes the page longer. `pb-24` on `<main>` does not clear the FAB's centre.

### 🔀 For the merge

| File | C's change | Who else |
| --- | --- | --- |
| `src/i18n/de.json`, `en.json` | six keys at the end of `you` | B adds keys at the end of its blocks; keep both |
| `IdentityProfile.tsx` | avatar button, region link, groups card | A left it alone (P1 is in `IdentityCounters.tsx`); B not planned |
| `Marks.tsx` | `camera` path added after `check` | A added `check` and the filled set in this file on `main` already; B (D3's ⓘ) may add `info` variants: append, no conflict expected |
| `photos.ts` | one where-clause in `deleteAbandonedPhotos` | nobody planned |
| `identity.ts` | `avatarUrl`, `setAvatar`, merge line | nobody planned |
| `schema.prisma` + migration | new column, relation | the migration runs in Vercel's build (`scripts/deploy/migrate.mjs`), nothing to do by hand; Neon gets it on the next deploy |
| `Journal.tsx`, `SightingPage.tsx`, `SpeciesPage.tsx` | **untouched** | B |

New files: `IdentityAvatar.tsx`, `IdentityGroups.tsx`, `GroupRows.ts`, `GroupRows.test.ts`, `scripts/m14/track-c.mjs`, `prisma/migrations/20260906140000_identity_avatar/`, four `c-*` shots. `data/photos/` is git-ignored and empty after the run.
