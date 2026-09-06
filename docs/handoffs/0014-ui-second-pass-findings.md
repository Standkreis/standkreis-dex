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
