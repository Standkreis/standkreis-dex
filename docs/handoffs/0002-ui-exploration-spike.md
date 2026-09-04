# 🎨 [0002] Handoff — UI exploration spike for the first walk

> A handoff, not a spec. With a tracker this would be the issue body of a child of epic 0001. Read the two documents in §⬆️ before anything else; nothing here overrides them.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-04 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) · [Record 0001](../records/0001-standkreis-dex-the-first-walk.md) | 2–3 sessions, throwaway code |

---

## 🎯 Why

Ten decisions are made. Zero pixels exist. The first slice is "one complete walk," and the walk is six screens. Before the real Next.js app is scaffolded, we need to *see* the dex grid with two axes, the fill moment, and a species page with an interaction graph, and find out which of two or three layouts each screen wants. Deciding these in code later is ten times the cost.

**Design, not decisions.** The spike explores; the owner picks. Nothing in the spec's 🗳️ decisions is up for renegotiation here. If a mock reveals that a decision is wrong, stop and say so; that is a new grill, not a mock.

## ⬆️ Input

| Read | Why |
| --- | --- |
| [`docs/specs/0001-standkreis-dex-the-first-walk.md`](../specs/0001-standkreis-dex-the-first-walk.md) | The product. §🧬 for the two-axis model, §🚶 for the walk, §🎨 for the screen list, §⚖️ for ethics rules the UI must embody |
| [`docs/records/0001-…`](../records/0001-standkreis-dex-the-first-walk.md) §🔥 | Every rejected alternative, so the mocks don't quietly resurrect one (XP bars, leaderboards, daily streaks, camera-first) |
| [`docs/research/03-hitl-notes.md`](../research/03-hitl-notes.md) | Sven's nine field observations on Seek: bottom bar, filters first, grid/list/map, compact species page, ecology |
| [`docs/research/01-market-research.md`](../research/01-market-research.md) §🏆 and §🕳️ | The steal list and the gap list. Gotcha's sticker-fills-silhouette; Letterboxd's diary-first; Seek's taxon ladder |

## 🛠️ How

**Throwaway prototype, real data shape, phone viewport.**

| Aspect | Choice | Why |
| --- | --- | --- |
| Where | `spike/ui/` in this folder. Deleted when the real app starts; only screenshots and the findings survive | Nothing here is production code |
| Stack | Vite + React + TypeScript + Tailwind 4. No backend, no router beyond state, JSON fixtures | Fast to iterate, same visual vocabulary as the real app, zero temptation to keep it |
| Viewport | 390 × 844 (iPhone 15/16 class). Test once at 360 × 780 (small Android) | The walk happens on a phone in sunlight. Desktop is a later spike |
| Data | `spike/ui/fixtures/species.json`: **~40 real species plausible in Rheinland-Pfalz in September**, with GBIF key, German + English + scientific name, group (bird / mammal / insect / plant / fungus / amphibian / reptile), a Wikimedia Commons thumbnail URL with attribution, a 2-sentence intro, month occurrence (12 numbers), and 2–5 GloBI-style interactions to other species *in the same fixture*. Mixed states: ~25 silhouette, ~8 studied, ~5 seen, ~3 studied-and-seen. Two seen species carry a "user photo" (any CC photo standing in) | The grid must look like *this* dex, not lorem ipsum. Interactions pointing inside the fixture make the graph tappable |
| Variants | **2–3 per screen** for the grid, the species page and the fill moment. One each for onboarding, log-a-sighting and the bottom bar unless a real fork appears | Variants are the deliverable; a single mock is a decision in disguise |
| Preview | Browser pane at the phone viewport; screenshot each variant | Evidence for the owner, then for the ADR |

## 🖼️ The six screens

Numbered as in spec §🎨. For each: what it must do, what to explore, what would make it wrong.

### 1 · 🎬 Onboarding
- **Must:** set region and species groups in under a minute; no account, no permission dialog before it's needed; end on the dex, populated.
- **Explore:** region by map-pin vs by search vs "use my location" (with the permission ask *explained* first); groups as toggles vs illustrated tiles; where the promise sentence goes.
- **Wrong if:** it's a form. Seek's failure was having none; PictureThis's is being a paywall. Aim between: three screens, one action each.

### 2 · 🏠 Dex grid
- **Must:** render four states legibly at thumbnail size (silhouette · studied · seen · studied + seen); two counters ("42 studied · 17 found"); the active filter visible and one tap away; grid only (list and map are later, but leave the toggle's *place*).
- **Explore:** how a *seen* cell shows the user's own photo vs the reference image; how *studied* reads without looking like *seen* (outline + mark? desaturated? a corner glyph?); grouping by taxon group vs one flat grid vs "plausible this month" first; cell density (3 vs 4 columns).
- **Wrong if:** studied and seen are confusable at arm's length in sunlight. Test with a screenshot at 50% scale.

### 3 · 📄 Species page
- **Must:** compact; image with attribution; three names; tags (e.g. *einheimisch*, IUCN); intro; small range map placeholder; month occurrence strip; **interactions as tappable species chips carrying their own dex state**; a "mark studied" action; the two-axis state shown.
- **Explore:** interactions as a horizontal chip row grouped by kind ("eats · eaten by · hosts") vs a small radial graph vs a list; where "log a sighting of this" sits; sheet-over-grid vs full page.
- **Wrong if:** it's a Wikipedia stub with a photo. The ecology must be the reason to scroll. Empty states for missing GloBI data must be honest and short, not blank.

### 4 · 🔍 Log a sighting
- **Must:** search the full backbone (fixture stands in), claim in three taps outdoors, photo optional, wild / captive prompt, done. Reachable from the bottom bar *and* from a species page.
- **Explore:** search-first vs "what's plausible now" shortlist first with search as fallback; when the wild/captive question appears (on save, not before); a "photo later" affordance.
- **Wrong if:** the camera is the first thing you see. Claim-first is a decision.

### 5 · 🎉 The fill moment
- **Must:** the silhouette becomes the photo (or the reference image if no photo). One moment of delight, no XP, no confetti-as-default.
- **Explore:** in-place on the grid vs a full-screen card that returns to the grid; the user's photo cut into the cell (Gotcha) vs framed as a card; haptic note for the Capacitor wrap.
- **Wrong if:** it awards a number. Also wrong if it's silent; this is the one screen allowed to be a little theatrical.

### 6 · 🧭 Bottom bar
- **Must:** four or five destinations, one of which is the log action.
- **Explore:** Dex · Log · Journal · You  vs  Dex · Log · Learn · You; whether "Journal" (the sightings timeline, Letterboxd-style) earns a tab in the first slice or lives under You.
- **Wrong if:** it has a Missions or Social tab. Neither is in the first slice.

## ⚖️ Rules the UI must embody (from spec §⚖️)

- No number that goes up except the two counters.
- Locations on anything shareable are coarsened; the mock should show a coarsened location on the species page's map placeholder to set the habit.
- Wild / captive prompt exists on save.
- No edibility or toxicity copy anywhere; the fly agaric page carries the standing fungus notice.
- Every image shows attribution; find out how small it can be and still be honest.
- No AI-generated imagery in the mock. Commons thumbnails or plain silhouettes.

## ⬇️ Output

| Deliverable | Lands |
| --- | --- |
| The prototype | `spike/ui/`, runnable with `npm run dev`, throwaway |
| Screenshots | `docs/adr/0001-standkreis-dex-the-first-walk/0002-<screen>-<variant>.webp`, WebP, ≤ 500 KB each, per the asset rule: directory named for the epic, files for the producing issue |
| Findings | `docs/handoffs/0002-ui-exploration-findings.md`: one table per screen with the variants side by side, a 👍 recommendation and a 👎 rejected variant with reasons, and any decision the mocks put in doubt |
| Spec update | After the owner picks: spec §🎨 rewritten from "handed to exploration" to "chosen", linking the screenshots. Nothing else in the spec changes |

**Definition of done:** Sven has looked at every variant on a phone-sized screen, picked one per screen, and the spec §🎨 says which and why. The spike code is then deletable.

## 🚫 Not in this spike

Desktop / web layout · list and map views · quests UI · snap-and-send ladder · share card · real data fetching · the Next.js app scaffold · icon and brand work beyond a placeholder name.

## 👉 Start the session with

```
Read docs/handoffs/0002-ui-exploration-spike.md and the two documents it names in §⬆️.
Build the throwaway prototype in spike/ui/ as §🛠️ describes, starting with the fixture,
then the dex grid (screen 2) in three variants. Preview at 390×844 and screenshot each.
Stop after the grid variants and show me before moving to the species page.
```
