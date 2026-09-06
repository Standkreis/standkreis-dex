# 🎞️ [0014b] Handoff — motion, first pass

> A handoff, not a spec. Child of [0014](0014-ui-second-pass.md). Owner 2026-09-06: *"add some simple animations: opening a drawer should move in from the bottom, a selected toggle, the bottom app bar from one page to another (the filling of the icon)."* Read the documents in §⬆️ before anything else.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🎨 · [Findings 0014](0014-ui-second-pass-findings.md) 🅰️ (drag-to-dismiss) | ½ session in a worktree, parallel to grill 0015b |

## 🎯 Why

Every state change in the app is a cut. Drawers appear, chips flip, the tab icon swaps from outline to filled. Nothing is wrong, nothing feels touched. Three motions, CSS only, no library.

## ⬆️ Input

| Read | Why |
| --- | --- |
| `app/src/components/{LogSheet,FilterDrawer,SightingDetail,SourceInfo,PasskeyNudge,IdentityDelete}.tsx` | The sheets: all `fixed inset-0`, all cut in. `useDragDismiss.ts` already moves the sheet with the finger and must keep doing so |
| `app/src/components/Shell.tsx:11-27` | The tab bar: filled glyph + moss dot when active |
| `FilterDrawer`, `Onboarding` step 2, `Journal` chips | The toggles: sky selection (0014 G5) |
| `app/src/styles/tokens.css`, `app/src/app/globals.css` | Where the durations and easings go as tokens |

## 🛠️ The rows

| # | Motion | Do | Not |
| --- | --- | --- | --- |
| A1 | **Sheet in from the bottom** | One `Sheet` primitive (or one shared class set) used by every bottom sheet: scrim fades 150 ms, panel `translateY(100%) → 0` 260 ms `cubic-bezier(.32,.72,0,1)`; close reverses 200 ms and unmounts after `transitionend`/timeout. Drag-to-dismiss keeps its transform while the finger is down; the release animates from the current offset, not from the bottom | no framer-motion, no spring library; no layout shift of the page behind |
| A2 | **Toggle** | Selected chips and radio/check states: background and ring transition 150 ms, the check badge scales 0.6 → 1 with a slight overshoot. The grid cell's seen/studied ring may fade in 200 ms | nothing on the Fill sweep (it has its own moment) |
| A3 | **Tab bar** | Active glyph: outline and filled stacked, filled fades and scales in 180 ms; the moss dot slides between tabs (`transform`, 220 ms) instead of appearing | no page transition; no View Transitions API yet (Next 16 support is a doubt for the findings, one paragraph) |
| A4 | **Reduced motion** | `@media (prefers-reduced-motion: reduce)`: durations to 0, opacity fades may stay | |

Tokens: `--motion-fast: 150ms`, `--motion-base: 220ms`, `--motion-sheet: 260ms`, `--ease-out-soft`, in `tokens.css`; Tailwind classes via `transition-[…]` and `duration-[var(--motion-base)]`, or a few utility classes in `globals.css`. Say which in the findings.

## 🧪 Checks

| # | Check | Pass |
| --- | --- | --- |
| C1 | Headless Chrome (`app/scripts/m14/ui.mjs` pattern) on the production build: open the log sheet, screenshot at 0, 100, 260 ms | Three frames show the panel rising; shots in `0014b-shots/` |
| C2 | Drag the sheet half down and release below the threshold | Returns to open, animated from where it was, no flash from the bottom |
| C3 | Tab atlas → diary → profile | Dot moves, filled glyph fades in; `aria-current` correct at every step |
| C4 | Filter drawer: toggle two chips | Transition visible, the drawer does not jump |
| C5 | `prefers-reduced-motion: reduce` emulated (CDP `Emulation.setEmulatedMediaFeature`) | Instant states, no broken unmount (sheet still closes) |
| C6 | `npm run check` green | |
| C7 | Simulator (iPhone 17 Pro) on the production build served from the Mac, or the deployed URL: sheets and tabs by eye | the owner |

## ⬇️ Output

Findings `0014b-motion-findings.md`: the primitive, the tokens, the unmount rule, C1–C7, doubts (View Transitions in Next 16; whether the species page should slide in from the right, not done here), "For the merge".

## 🚫 Not in this handoff

Page transitions · the Fill sweep · haptics · any library · anything outside `app/src/components`, `tokens.css`, `globals.css` and the m14 scripts.

## 👉 Start the session with

```
Read docs/handoffs/0014b-motion.md and the files it names in §⬆️.
Worktree ../standkreis-dex-anim from main. A1–A4, C1–C6, findings. Commit, do not push, do not merge.
```
