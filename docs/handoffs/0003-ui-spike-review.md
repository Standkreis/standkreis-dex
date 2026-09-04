# 🔍 [0003] Handoff — reviewing the UI spike

> A handoff, not a spec. The child of [0002](0002-ui-exploration-spike.md): that one built, this one judges. Read the two documents in §⬆️ before anything else; nothing here overrides them.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-04 | Sven Reiser | [Handoff 0002](0002-ui-exploration-spike.md) · [Findings](0002-ui-exploration-findings.md) | 1 session, no new mocks · §🧪 run 2026-09-04 |

---

## 🎯 Why

The spike grew past its brief. Six screens were asked for; ten exist. Three owner decisions were reversed or bent along the way (XP, the freeze, attribution), and 46 doubts are on file, most of them still open. Before the spec §🎨 is rewritten and `spike/ui/` is deleted, someone has to walk every chosen screen against the spec and the record and say: **this is what we build, this is what we dropped, this is what still needs a grill.**

**Review, not redesign.** A reviewer who wants a different button is out of scope. A reviewer who finds a screen contradicting a 🗳️ decision is exactly in scope. New mocks only if a check in §🧪 fails and cannot be judged from the shots.

## ⬆️ Input

| Read | Why |
| --- | --- |
| [Findings 0002](0002-ui-exploration-findings.md) | One table per screen, owner picks, and the 46 numbered doubts. This is the object under review |
| [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🧬 §🚶 §⚖️ §🎨 | The product the mocks must embody. §🎨 marks 🔍 vs ✅ per screen and is the thing this review rewrites |
| [Record 0001](../records/0001-standkreis-dex-the-first-walk.md) §🗳️ §🔥 | The rejected alternatives. The spike resurrected one (XP) on the owner's word and dropped one mechanic (freeze); both need a record entry |
| [Handoff 0002](0002-ui-exploration-spike.md) §🖼️ | The "wrong if" line per screen. §🧪 below turns each into a check |

## 🛠️ How to look

**Shots first, code second.** Fifty-one WebP screenshots in `docs/adr/0001-standkreis-dex-the-first-walk/` cover every chosen screen and every rejected variant. Only run the spike for interactions (drawers, filter, fill animation).

```bash
cd spike/ui && npm install && npm run dev
```

| Aspect | Detail |
| --- | --- |
| Index | `http://localhost:5199/#/` lists every route. Hash routing, no backend |
| Viewport | 390 × 844. Judge nothing at desktop width; the browser pane or the device toolbar |
| Theme | `?theme=light` / `?theme=dark` on the hash, joined to other flags with `&`. Light is the product default (sunlight) |
| Flags | `?v=…` picks a variant, `?drawer` `?fab` `?xpinfo` `?synced` open overlays, `?frozen` is gone |
| Reshoot | `bash scripts/shoot.sh '/you?theme=light' you 390 844 [scrollY]` writes the WebP into the ADR folder |
| Fixture | 45 real species, `fixtures/species.json`; 15 sightings, `fixtures/sightings.json`. States and dates are authored, everything else is fetched |

## 🗺️ What exists

| # | Screen | Route | Status | Shot |
| --- | --- | --- | --- | --- |
| 1 | 🎬 Onboarding | `#/onboard/region` `groups` `ready` | 🔍 recommended, no pick | [region](../adr/0001-standkreis-dex-the-first-walk/0002-onboard-1-region.webp) · [ready](../adr/0001-standkreis-dex-the-first-walk/0002-onboard-3-ready.webp) |
| 2 | 🏠 Dex grid | `#/grid/a` | ✅ A, revised 3× (greyscale, badges, vocabulary) | [grid](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a.webp) · [dark](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a-dark.webp) · [filter](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a-filter-drawer.webp) |
| 3 | 📄 Species page | `#/species/p1/<id>` | ✅ P1, revised (Steckbrief, Quellen line) | [Amsel](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-amsel.webp) · [bottom](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-amsel-scrolled-2.webp) · [fungus](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-fungus-notice.webp) |
| 4 | 🔍 Log a sighting | `#/log/chooser` `search` `save/<id>` | 🔍 recommended, no pick | [chooser](../adr/0001-standkreis-dex-the-first-walk/0002-log-1-chooser.webp) · [save](../adr/0001-standkreis-dex-the-first-walk/0002-log-3-save.webp) |
| 5 | 🎉 Fill moment | `#/fill/sheet/<id>` | ✅ F3, reshot grey → colour (doubt 45 closed) | [sheet](../adr/0001-standkreis-dex-the-first-walk/0002-fill-sheet.webp) · [own photo](../adr/0001-standkreis-dex-the-first-walk/0002-fill-sheet-own-photo.webp) · [F1 toast](../adr/0001-standkreis-dex-the-first-walk/0002-fill-grid.webp) |
| 6 | 🧭 Bottom bar | everywhere | ✅ Dex · Quests · ＋ · Tagebuch · Du | [grid](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a.webp) |
| 7 | 🧭 Quests | `#/quests` (`?v=walk`) | ➕ slice two, mocked on request | [cards](../adr/0001-standkreis-dex-the-first-walk/0002-quests.webp) |
| 8 | 📓 Tagebuch | `#/journal` (`?v=diary`) | ➕ slice two, ✅ T1 | [by day](../adr/0001-standkreis-dex-the-first-walk/0002-journal.webp) |
| 9 | ⚙️ Einstellungen | `#/settings` (`?synced`) | ➕ split off Du | [settings](../adr/0001-standkreis-dex-the-first-walk/0002-settings.webp) |
| 10 | 🙋 Du | `#/you` (`?v=plain` `?xpinfo`) | ➕ ✅ XP profile | [profile](../adr/0001-standkreis-dex-the-first-walk/0002-you.webp) · [XP drawer](../adr/0001-standkreis-dex-the-first-walk/0002-you-xp-info.webp) |

Cross-screen rules settled during the spike, all in the findings: **vocabulary** studiert · entdeckt, **order** amber before green everywhere, **badges** on the Dex grid and the species state row only, **colour per axis** amber · green · blue (XP), **attribution per view** not per element.

## 🧪 Checks

Each "wrong if" from handoff 0002, plus the rules the spike added. Tick, or write the doubt number that blocks the tick.

| # | Check | Where | Pass looks like | 🔍 Result (2026-09-04) |
| --- | --- | --- | --- | --- |
| C1 | Studied and seen are not confusable at arm's length | grid shot at 50 % zoom, light theme | Amber ring + grey vs colour + check are distinct without reading | ✅ pass. At 50 % the amber ring and the green check both survive; grey vs colour needs no reading |
| C2 | Onboarding is not a form | onboarding, three shots | One action per screen, no field before the ask is explained | ✅ pass. One action per screen, the permission ask explained before the dialog. Screen 1 still promises "ohne Punkte" → C6 |
| C3 | Camera is not the first thing on log | log chooser, search | ＋ opens the shortlist, camera visible but second | ✅ pass. Suchen is the primary tile; the camera is first in reading order but plain white. Shortlist needs no typing |
| C4 | Fill moment awards no number | fill grid | Cell colours, counter ticks once, no "+25" | ✅ pass, reshot (45 closed). Grey → colour with the green ring, "9 entdeckt +1", nothing else on the sheet |
| C5 | Bottom bar has no Social tab | any screen | Quests is there against the handoff's own wording; the owner overruled it. Confirm that stands | ⏸ §⚖️ row 4. No Social; Quests in slot two, one stroke set. Needs the owner's confirm and a slice-one content line |
| C6 | No number goes up except the two counters | header, profile, Tagebuch | XP and Level go up. Owner decision, record entry missing (doubt 35). "45 möglich" is a third number (doubts 2, 41) | ❌ 35 · 2 · 41. XP bar, level badge, "60 / 150", "+25" per Tagebuch row, "45 möglich" on grid, drawer and Du, "3 von 11" per group. Onboarding copy contradicts all of it |
| C7 | Locations shown coarse | species map, Tagebuch rows, save screen | 10 km cell on the map, Gemeinde on rows, "genau gespeichert" on save (doubts 17, 29) | ✅ pass on the shots · 17, 29 for the spec wording. 10 km cell, Gemeinde + place on rows, "genau gespeichert · geteilt nur grob" on save |
| C8 | Wild / captive prompt exists on save | log save | Wild is the primary button, Gehalten the secondary (doubt 15) | ✅ pass. Wild primary, Gehalten secondary, the button is the save; 15 ruled in the findings |
| C9 | No edibility copy | Fliegenpilz page | Notice present, but the Wikipedia intro says "giftig" (doubt 7) | ⚠️ 7, owner ruled accept. Notice sits above the intro; "giftig" stays in Wikipedia's sentence; spec §⚖️ wording follows |
| C10 | Attribution on every image | grid footer, photo caption, Quellen line | Per view, not per element. Spec §⚖️ still says "every image" (doubt 42) | ⏸ 42. Grid footer line (below the last row, not in the shots), photo caption, Quellen line. Found cells still carry a truncated per-cell caption (doubt 1) |
| C11 | No AI imagery | all shots | Commons and iNaturalist only | ✅ pass. Commons only in the fixture; the onboarding group icons are drawn shapes |
| C12 | Dark theme holds | `?theme=dark` on grid, species, Du | Nothing is a hard-coded light surface | ✅ pass. Species reshot, Du newly shot; no hard-coded light surface on any of the three |
| C13 | Small Android | 360 × 780 on the grid | Only the grid was tested at 360; species page and Du were not | ✅ pass. Grid reshot, species and Du newly shot at 360; only "80–125 g" wraps in a Steckbrief cell |

**🔁 Reshot during the review (2026-09-04).** Eight chosen-screen shots still showed the silhouette era (old glyph, gelernt · gefunden, the four-tab bar): `fill-sheet`, `fill-sheet-own-photo`, `species-p1-amsel-dark`, `log-1-chooser`, `log-2-search-empty`, `log-3-save`, `log-3-save-photo`, `grid-a-360`. There is no git repository, so the findings' "see git history" points nowhere; the stale files were copied to [`superseded/`](../adr/0001-standkreis-dex-the-first-walk/superseded/) before the reshoot. New: [Du dark](../adr/0001-standkreis-dex-the-first-walk/0002-you-dark.webp) · [species 360](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-amsel-360.webp) · [Du 360](../adr/0001-standkreis-dex-the-first-walk/0002-you-360.webp). Not reshot: rejected variants (evidence), `onboard-2-groups` (group silhouettes are still the design there), `log-2-search-results`.

## ⚖️ Where the spike bent a decision

These are the review's real work. Each needs one of: confirm and record, or revert.

| Decision | What the spike did | Needs |
| --- | --- | --- |
| Record Q8 "no XP, levels" | XP and levels on Du and Tagebuch, private, no leaderboard, once-a-month cap on repeats | 🙋 owner reaffirmed twice. Record addendum **Q8c** with the evidence split: competitive volume rewards vs private progression. Spec §⚖️ line on "no number goes up" rewritten |
| Record Q8 "weekly with a freeze" | Freeze removed: nothing to protect without a streak | Record Q8 one-line amendment; spec §❓ drops "what freeze means" |
| Spec §⚖️ "attribution on every image" | One caption per view: grid footer, photo caption, Quellen line per species page | Spec §⚖️ rewritten to "per image view", share-alike note for copied intros |
| Handoff 0002 §6 "wrong if Missions tab" | Quests tab in slot two, now | Spec §🚶 says what the tab shows in slice one: three quests or a "kommt bald" line |
| Spec "two counters" | "45 möglich" as denominator on header and profile | Doubts 2 and 41: keep as denominator, or drop. Decide, then the header counts the filter's set and Du counts the year |
| Spec English, global | Mock is German | Doubt 5: German stays the mock language; the real app's i18n is a scaffold question |

## ❓ Doubts the review must close

Forty-six are on file. Most are ETL or later-slice notes. These block the spec rewrite:

| Doubt | Question | Blocks |
| --- | --- | --- |
| 2, 41 | Is "möglich" a third counter, and is it September or the year | Header copy, spec §🧬 |
| 13 | Landkreis in the UI, grid cell in the spec | Onboarding, every "Mainz-Bingen" |
| 17, 29 | Exact point stored, shown as Gemeinde, never on a list | Spec §⚖️ wording |
| 23, 25 | What makes "studiert" true when it is one tap | Species page action, quests, XP tariff |
| 35 | XP without a record entry | Record Q8c |
| 39 | Name and photo on an anonymous-first product | Du, Einstellungen › Profil |
| 42 | Attribution per view | Spec §⚖️ |
| 45 | Fill moment reshot grey → colour | §5 shot is stale |
| 46 | "Wiederentdeckt" chip on every repeat | Tagebuch row |

Everything else stays open in the findings and moves to the ETL or slice-two grills untouched.

## ⬇️ Output

| Deliverable | Lands |
| --- | --- |
| Review notes | This file, §🧪 ticked and §❓ answered, one line each. No new document |
| Spec §🎨 | 1, 4, 6 turned from 🔍 to ✅ with the pick and one reason; 2, 3, 5 re-described (greyscale, Quellen line, studiert · entdeckt); the design language paragraph adds blue for progression and the dark theme |
| Spec §⚖️ | "no number goes up" and "attribution on every image" rewritten per the table above |
| Record | Addendum Q8c (XP as private progression) and the freeze amendment, both under §📎 |
| Shots | Rejected variants stay as evidence (grid B and C, fill card and sheet, bottom bar B1 and B2, species P2 and P3). Delete nothing |
| The spike | Stays until the Next.js scaffold exists; it is the only runnable reference for the interactions. Delete then |

**Definition of done:** every row in §⚖️ has a record or spec line, every doubt in §❓ has an answer in the findings, spec §🎨 has no 🔍 left.

## 🚫 Not in this review

Code quality (throwaway), performance, accessibility beyond sunlight legibility, desktop layout, the ETL doubts (8, 20, 21, 22, 43), anything slice three.

## 👉 Start the session with

```
Read docs/handoffs/0003-ui-spike-review.md and the two documents it names in §⬆️.
Open the shots in docs/adr/0001-standkreis-dex-the-first-walk/ for the ten screens in §🗺️
and run the checks in §🧪 one by one, writing pass or the blocking doubt number.
Then walk §⚖️ and §❓ with me before touching the spec or the record.
```
