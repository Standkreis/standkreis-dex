# 🎞️ [0014b] Findings — motion, first pass

> What was built for [0014b](0014b-motion.md), with evidence. Branch `m14b-motion`, worktree `../standkreis-dex-anim`. Checks on the production build (`next build` + `next start -p 3005`), headless Chrome over CDP, `app/scripts/m14/motion.mjs`, shots in `0014b-shots/`.

| 🗓️ Done | 👤 Agent | ⬆️ Handoff | 🧪 Checks |
| --- | --- | --- | --- |
| 2026-09-06 | Claude | [0014b](0014b-motion.md) | C1–C6 ✅ · C7 the owner |

## 🧩 The primitive

`app/src/components/Sheet.tsx` — one component, every bottom sheet mounts through it.

```tsx
<Sheet onClose={…} labelledBy="log-title" testId="chooser" handleTestId="chooser-handle" z="z-30" maxH="max-h-[92vh]"
  handle={<h2 id="log-title">…</h2>}>        // what sits under the pill, inside the drag surface
  <div className="px-4 …">…</div>             // the body: owns padding and scrolling (`min-h-0 overflow-y-auto`)
</Sheet>
```

| Piece | Where | What |
| --- | --- | --- |
| Scrim | `.sheet-scrim` | separate `absolute inset-0 bg-ink/40` layer, fades 150 ms in, 150 ms out |
| Panel | `.sheet-panel` | `translateY(100%) → 0` 260 ms `--ease-out-soft` as a **keyframe** (`sheet-in`); leave is a **transition** `transform 200 ms` under `data-state="closing"` |
| Drag | `useDragDismiss` inside `Sheet` | unchanged contract; `transition: none` while the finger is down, `transform 220 ms --ease-out-soft` on settle |
| Escape | `Sheet` | one window listener per sheet, a module stack; only the topmost sheet takes the key |
| Close from inside | `useSheetClose()` | context; the sheet's own buttons ("Schließen", "Später", `Zeige N`) call the animated close |

Why a keyframe for the entrance: the drag hook writes an inline `transform` while the finger is down. A transition on the class would fight it; a keyframe cannot (it runs, then hands the property back to the inline style).

### 🔚 The unmount rule

Callers are untouched: `{open && <X onClose={() => setOpen(false)} />}` and `onClose` still means *unmount me*. Inside, `close()`:

1. reads the panel's computed `transition-duration`; if it is `0s` (reduced motion) → `onClose()` at once
2. else sets `data-state="closing"`, listens for `transitionend` on the panel's `transform`, and arms a timeout of `duration + 80 ms` as the fallback; whichever fires first calls `onClose()` once

A drag past the threshold already animates the panel off screen (`useDragDismiss` → `dy = height`, 220 ms), so that path calls `onClose` directly and skips the second leave. Two exits stay instant on purpose: `IdentityDeleteSheet` after the data is gone (the page changes under it), and nothing else.

## 🎚️ Tokens

`app/src/styles/tokens.css`, on `:root` (not in `@theme`: Tailwind would mint `duration-*` utilities from them, the classes live in `globals.css` anyway).

| Token | Value | Used by |
| --- | --- | --- |
| `--motion-fast` | 150 ms | scrim, toggles, glyph cross-fade |
| `--motion-base` | 220 ms | dot slide, drag settle, badge, cell ring |
| `--motion-sheet` | 260 ms | panel entrance |
| `--motion-sheet-out` | 200 ms | panel leave *(one more than the handoff named; 200 ≠ any of the three)* |
| `--ease-out-soft` | `cubic-bezier(.32,.72,0,1)` | sheet, dot, settle |
| `--ease-overshoot` | `cubic-bezier(.34,1.56,.64,1)` | the check badge |

**Utility classes in `globals.css`**, not Tailwind arbitrary values: `.sheet-scrim` `.sheet-panel` `.motion-toggle` `.motion-badge` `.motion-ring` `.tab-glyph` `.tab-fill` `.tab-dot`. One place to read, one `@media (prefers-reduced-motion: reduce)` block that zeroes them all (`animation-duration: 0s !important; transition-duration: 0s !important`; the `!important` is what beats the drag hook's inline settle transition). The scrim's fade is the one thing left running under reduced motion (the handoff allows opacity).

`useDragDismiss.ts`: `SETTLE_MS` 180 → 220 (mirrors `--motion-base`), the settle uses `--ease-out-soft`, drag phase sets `transition: none`.

## 🛠️ Rows

| # | Done | Files |
| --- | --- | --- |
| A1 | `Sheet` + six sheets ported: LogSheet, FilterDrawer, SightingDrawer, SourceSheet, PasskeyNudge (lost its `fill-up` one-off, gained drag and Escape), IdentityDeleteSheet (gained `max-w-[520px]`, drag, Escape) | `Sheet.tsx`, the six, `useDragDismiss.ts` |
| A2 | `.motion-toggle` on: drawer chips (+ the count span's colour), diary pills, onboarding region radio (+ dot `.motion-badge`), onboarding tile cards (+ image filter 220 ms, check `.motion-badge`), wildness radios; `.motion-ring` on the grid cell ring and the `Thumb` ring. Fill sweep and its `ring-[3px]` untouched | `FilterDrawer` `Journal` `Onboarding` `SightingDetail` `AtlasGrid` `SpeciesCard` |
| A3 | Outline and filled glyph stacked in a `grid` cell, `data-on` toggles opacity (+ `scale(.6)` on the filled). The dot is **one** element in the row (`Dot`), measured against the active tab's placeholder in a `useLayoutEffect` (+ `ResizeObserver`), `translate(x, y)` 220 ms. Hidden on routes without a tab, left where it was | `Shell.tsx` |
| A4 | the reduced-motion block above | `globals.css` |

## 🧪 Checks

All numbers from `motion.mjs` on the production build, 390 × 844 @2x, light. Frames are deterministic: the script pauses `document.getAnimations()` and seeks (`a.currentTime = ms`) before each shot, so "the frame at 100 ms" is that frame. React flushes a click's state in a microtask; the script waits one `setTimeout(0)` after `.click()` before freezing (the first run froze before the render and read stale values).

| # | Check | Evidence | ✅ |
| --- | --- | --- | --- |
| C1 | chooser opens | animations on mount: `scrim-in` 150 ms, `sheet-in` 260 ms. Panel 274 px high; `translateY` **274 → 25 → 0 px** at 0 / 100 / 260 ms, scrim opacity 0 → .84 → 1, panel top 844 → 594 → 570. Settled: `transition 0.2s cubic-bezier(0.32, 0.72, 0, 1)`, `animation 0.26s` | `c1-open-0ms` `c1-open-100ms` `c1-open-260ms` |
| C1 | chooser closes | scrim tap → `data-state=closing`, transitions `opacity` 150 / `transform` 200 on scrim / panel; at 100 ms `translateY` 262 px, scrim .16; gone 116 ms after resuming (≈ 200 total) | `c1-close-100ms` |
| C2 | short drag, release | 8 slow moves to 69 px (25 % of 274, under the 30 % threshold); held: `translateY 69`, `transition-property: none`. Release, frozen at 80 ms: **7 px**, the only animation a `transform` 220 ms on the panel (no `sheet-in` restart). Free-running samples every 25 ms: 7 · 4 · 3 · 1 · 1 · 0 … monotone, never above 69, sheet still open; Escape then closes in 196 ms | `c2-held` `c2-release-80ms` |
| C3 | atlas → diary → profile | atlas: `aria-current` `tab-dex`, dot x 43 = slot 43, fills dex 1.00. Tap diary: `aria-current` flips after 48 ms, frozen at 110 ms: dot x **254** (between 43 and 264), fills dex .10 / journal .90, eight transitions on `.tab-glyph`/`.tab-dot`; settled: dot 264 = slot 264, journal 1.00. Tap profile: flips after 13 ms, at 110 ms dot 337, journal .10 / you .90; settled 341 = slot 341. `aria-current` exactly one tab at every step. Dot style `transition: transform .22s, opacity .15s` | `c3-to-journal-110ms` `c3-to-you-110ms` `c3-you` |
| C4 | drawer chips | chip `transition-duration .15s ×5, .22s (filter)`; Reptilien off: bg `rgb(219,234,254)` → at 75 ms **`rgb(229,228,222)`** → `rgb(231,226,214)`; studiert on: `rgb(231,226,214)` → at 40 ms `rgb(227,229,228)` → `rgb(219,234,254)`. Dialog rect before = after `0, 67.53, 390 × 776.47`, `dialogMoved: false`. `Zeige N` closes in 194 ms | `c4-chip-75ms` `c4-drawer` |
| C5 | `prefers-reduced-motion: reduce` (CDP `Emulation.setEmulatedMedia`) | panel `animation-duration 0s`, `transition-duration 0s`, `transform none` 6 ms after the tap; one running animation (the scrim's 150 ms fade, allowed); scrim tap → **gone in 0 ms**; drawer Escape → 2 ms; dot `transition-duration 0s`, chip `0s`; tabs still correct (`tab-journal`, dot 264) | `c5-reduced-open` |
| C6 | `npm run check` | typecheck ✓ · lint 0 errors (3 warnings, all pre-existing in `scripts/id-probe`, `scripts/m8b`) · 7 files / **32 tests** ✓ · export build 2411 pages ✓ | |
| — | every sheet | LogSheet · FilterDrawer · SightingDrawer · SourceSheet (hero ⓘ inside the drawer) · IdentityDeleteSheet: each mounts with `sheet-in` 260 ms, Escape → `data-state=closing` → gone in 192 · 196 · 198 · 198 · 195 ms. Stacked: Escape on the ⓘ sheet leaves the drawer open, the second Escape closes it (205 ms) | `sheets-settings-after` |
| C7 | Simulator | **the owner**. Not driven: PasskeyNudge (needs the first wild sighting with a fill; same primitive, nothing sheet-specific in it), a real finger on `touch-action: none`, Safari's handling of a keyframe over an inline transform | |

## ❓ Doubts

1. **View Transitions in Next 16.** `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`: `import { ViewTransition } from 'react'` works in the App Router with no config (React canary ships in Next); route navigations are transitions, so `<ViewTransition>` activates on `Link` navigation by itself. It needs Chromium 125+ / recent Safari, degrades to a cut. That is the right tool for the species page sliding in from the right (and the thumbnail morphing into the hero) — *not* done here, and not for the sheets: sheets are `setState`, which `<ViewTransition>` ignores by design, and a drag needs a live transform, which a snapshot-based API cannot give. One paragraph, as asked; a handoff of its own if the owner wants the slide.
2. **The dot measures.** Not pure CSS: a layout effect reads the placeholder's rect. Pure CSS would need a fixed column grid instead of `justify-around` with the 56 px spacer; anchor positioning is Safari 26+. If the bar's layout ever changes, the dot follows without edits, which is the argument for measuring.
3. **Stacked glyphs in the DOM.** Every tab now carries both SVGs. `ui.mjs` (0014 G3) judged "filled" by `svg path[fill=currentColor]` existing; that probe is now always true. `aria-current` and `.tab-fill` opacity are the truth; `motion.mjs` reads those. `ui.mjs` was not changed.
4. **`!important` in the reduced-motion block** is deliberate (the settle transition is inline) but is the only `!important` in the app.
5. **200 ms leave** added a fourth duration token. The handoff named three; dropping `--motion-sheet-out` for `--motion-base` (220) would be a visible 10 % slower close, not a bug.
6. **PasskeyNudge marks the flag on unmount** (drag and Escape included) — before, only the buttons and the scrim did. Same intent ("shown once"), slightly wider.
7. **`SETTLE_MS` and `--motion-base` are two copies of 220.** Reading the token from `getComputedStyle` in the hook would tie them; not worth an extra style read per release today.

## 🔀 For the merge

- New files: `app/src/components/Sheet.tsx`, `app/scripts/m14/motion.mjs`, `docs/handoffs/0014b-shots/` (13 shots, 4.3 MB).
- Touched: `globals.css`, `tokens.css`, `useDragDismiss.ts`, `Shell.tsx`, the six sheets, `Journal.tsx`, `Onboarding.tsx`, `AtlasGrid.tsx` (one class on the ring), `SpeciesCard.tsx` (one class on the ring). Nothing outside `app/src/components`, the two CSS files and `scripts/m14`.
- Conflicts to expect with 0015b (grill): none by file list unless it touches `AtlasGrid.tsx`/`SpeciesCard.tsx`; those edits are one class each.
- The dev server was `next start -p 3005` in the worktree with `PHOTO_DIR=/tmp/anim-photos`; stopped. Test identity and one sighting (Idaea bilinearia) in the dev DB.
- Do not push; C7 first.
