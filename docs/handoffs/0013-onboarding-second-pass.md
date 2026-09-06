# 🎬 [0013] Handoff — onboarding, second pass (M9 friction O1–O10)

> A handoff, not a spec. Child of [handoff 0012](0012-first-walk.md) and its [findings §🚶](0012-first-walk-findings.md) "Owner's friction log · Onboarding". Read the documents in §⬆️ before anything else; nothing here overrides them.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | [Findings 0012](0012-first-walk-findings.md) · [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🎨 §⚖️ · [Findings 0007](0007-atlas-grid-and-species-findings.md) onboarding | 1 agent session on `main`, then the owner's copy pass |

---

## 🎯 Why

The owner's first look before the walk: the onboarding does not catch them. Ten rows, two of them copy (O3, O9b) that the owner writes themselves afterwards. This session does the other eight. **No copy is invented beyond the promises slide**; existing strings stay until the owner's pass, except where a row removes one.

## ⬆️ Input

| Read | Why |
| --- | --- |
| Findings 0012 §🚶 Onboarding O1–O10 | The rows, the triage column is the decision |
| `app/src/components/Onboarding.tsx`, `app/src/i18n/{de,en}.json` `onboarding.*` | The three screens, `StepFrame`, `SPLASH`, `TilesScreen`, `ReadyScreen` |
| Spec §⚖️ | The rules the promises slide says out loud; attribution per image view |
| Spec §🎨, findings 0007 (grid tile rendering) | The atlas's look the tile cards should share |
| `app/public/splash.jpg` (1440 × 2640) and `splash-720.jpg` | The owner's licensed image (Adobe Stock, no credit line required); already in `public/` |

## 🛠️ The rows

| Row | Do | Not |
| --- | --- | --- |
| O2 O8b | `SPLASH` becomes the local image (`srcset` 720/1440, `object-cover`, focus on the lit moss, lower third). It stays behind **all** steps: `StepFrame` renders it once, the content scrolls over it with the existing dark scrim | no remote image, no credit line (O7 resolved by the licence); keep the CC BY `photo` string key for a future splash from the set |
| O4 | `body`/`html` background and `theme-color` = the image's bottom colour (sample it, a near-black green) for the onboarding route, so Safari's bar blends | nothing app-wide beyond the token |
| O5 | "Meinen Standort nutzen" without the emoji; the `locationHint` line removed from the screen | the string may stay in the JSON until the owner's copy pass |
| O6 | Step 1 offers the **available regions as buttons** from `dex.regions` (`status = ready`; one today), plus the location button, which resolves via `lookupRegion(lat, lng)` and snaps to the nearest available region or says `notAvailableHere` with the buttons still there. The search input is gone from the screen (code stays, gated behind `regions.length >= 2` or a constant `SEARCH = false`) | do not delete the search code or its tests; the second region brings it back |
| O8a | Tile cards redrawn: the tile's colour token, the group's silhouette or the set's lead image as a small round thumb (pick one, say why in the findings), the count as the only number, a clear on/off state that reads in sunlight. Same card language as the atlas grid | no new icon set, no emoji |
| O9a | Ready screen shows two numbers: the whole set (`setSize` from `dex.set` with `nowOnly: false`) and this month's (`nowOnly: true`); the sentence around them stays the owner's job (O9b), so render both numbers in the existing sentence's slots for now | |
| O1 O10 | A fourth slide **"Zwei Versprechen"** before "Los geht's": ours (no account, no leaderboard, your data stays on this device until you want it elsewhere; only the Landkreis is stored, exact places never leave the phone) and yours (below). Button "Bin dabei". `noAccount` leaves step 3 | no checkbox, no legal tone |

The owner's promise, German first, English mirrored:

> Draußen sind wir Gast. Wir schauen, staunen, lassen alles, wie wir es gefunden haben. Kein Foto ist es wert, ein Tier zu bedrängen oder eine Pflanze zu nehmen. Wer langsam geht, sieht mehr.

Step counter becomes `{step} von 4`. The change-region path (`change` mode) skips the promises slide.

## 🧪 Checks

| # | Check | Pass |
| --- | --- | --- |
| C1 | Production build at 390 × 844 and 360 × 780, both locales, all four steps | Image behind every step, text readable over the scrim, no layout jump between steps; shots in `0013-shots/` |
| C2 | Step 1 with one ready region | One button "Mainz-Bingen", location button, no search field; tapping the button goes to step 2 |
| C3 | Location denied / outside every region | `noLocation` / `notAvailableHere` line, the region buttons still usable |
| C4 | Ready screen | Both numbers present and different (Mainz-Bingen: 929 and this month's) |
| C5 | Promises slide → "Bin dabei" → atlas; change-region path has three steps | |
| C6 | `npm run check` green; `splash.jpg` under 650 KB, first paint of step 1 not blocked by it (`fetchpriority="high"`, `decoding="async"`) | |
| C7 | Simulator (iPhone 17 Pro) screenshot of step 1 | Safari's bar blends with the page bottom |

## ⬇️ Output

Findings `0013-onboarding-second-pass-findings.md`: row by row what was done, C1–C7 with shots, the tile-card choice and why, doubts. The owner then writes O3 and O9b into the JSONs.

## 🚫 Not in this handoff

Copy (O3, O9b) · the species page's ⓘ for sources (goes with M9b) · new regions · the grid.

## 👉 Start the session with

```
Read docs/handoffs/0013-onboarding-second-pass.md and the documents it names in §⬆️.
Do the eight rows on main, C1–C7, findings. Do not write copy beyond the promises slide.
```
