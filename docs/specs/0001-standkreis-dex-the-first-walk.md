# 🧪 [0001] standkreis-dex — a Pokédex for nature, and the first walk

> **Spec.** Lives while the epic is open; distilled into an ADR and deleted when it closes. Decisions and their rejected alternatives are in the immutable record [`docs/records/0001-standkreis-dex-the-first-walk.md`](../records/0001-standkreis-dex-the-first-walk.md). Research behind it: [`docs/research/`](../research/).

| 🗓️ Date | 👤 Owner | 🎯 Status |
| --- | --- | --- |
| 2026-09-04 | Sven Reiser | Grilled · UI chosen ([review 0003](../handoffs/0003-ui-spike-review.md)) · next: the Next.js scaffold |

---

## 🧭 What it is

A **personal collection layer over open biodiversity data**, on web and phone, that gets a curious casual adult outside and teaches them something every time they open it.

**The promise:** *See what could be living around you right now, learn about it before you meet it, and fill the silhouette when you do.*

**Who:** curious casuals who want to get closer to nature. Sven is user #1. Not kids (Seek owns that, and app-store kids rules forbid location). Not power naturalists (iNaturalist owns that).

**Where:** global from day one. Every species list and every species page is computed from worldwide open data, never curated per region.

**Money:** free forever. Donations if server bills ever hurt. This is a product decision that unlocks non-commercial data (BirdNET, Xeno-canto, iNaturalist CC BY-NC photos) and is not to be quietly reopened.

## 🚫 What it refuses to be

| Refusal | Why |
| --- | --- |
| A species-identification engine | The ID engine is a commodity you rent (Pl@ntNet, BioCLIP 2). iNaturalist's model is closed. Accuracy is not the moat. |
| A science platform | No identifier community, no research-grade pipeline. Sightings can be *exported* to iNaturalist later; they are never *the* dataset. |
| A leaderboard | Volume rewards degrade behaviour and churn users. No ranks, no comparison, no rarity multipliers. XP exists as **private progression** (record Q8c): capped, never shown to anyone else, never on a share card. |
| A social network in v1 | Share-out cards only. Friends and feeds are possible later on the same identity model, and are where every competitor's ethics problems live. |
| A foraging or toxicity guide | The best app scores 74% on real poisoning cases. Fungi are in the dex; edibility is never stated. |
| A reading app | Learning is progress, but only *seeing* fills a silhouette. See §Two axes. |

---

## 🧬 The model

### Sightings are the atom, the dex is a view

```mermaid
erDiagram
    IDENTITY ||--o{ SIGHTING : logs
    IDENTITY ||--o{ STUDY : marks
    IDENTITY ||--|| FILTER : has
    TAXON ||--o{ SIGHTING : of
    TAXON ||--o{ STUDY : of
    TAXON ||--o{ PLAUSIBILITY : "occurs in"
    TAXON ||--o{ INTERACTION : "source of"
    TAXON ||--o{ INTERACTION : "target of"
    IDENTITY { string id "anonymous first" string credential "passkey / email, optional" }
    FILTER { geometry region  string[] groups "birds, plants, insects…" }
    SIGHTING { datetime at  point where "coarsened on share" string[] photos "optional" string note  enum evidence "claimed | photographed | id-assisted" }
    STUDY { datetime at  bool recap_passed }
    TAXON { string gbif_key  string sci_name  json common_names "per language via Wikidata" string rank }
    PLAUSIBILITY { string cell "grid cell" int month "1-12, or 0 = any" int obs_count }
    INTERACTION { enum kind "eats | eatenBy | pollinates | hostOf | parasiteOf | visitsFlowersOf" string source "GloBI" }
```

A species is **discovered** on its first sighting. "Seen 14 times, first in March" is derived, never stored. Sessions (walks) and places (patches) can be derived later by clustering sightings on time and location; neither is modelled now.

### Two axes per species

```mermaid
stateDiagram-v2
    direction LR
    [*] --> Silhouette
    Silhouette --> Studied : read page, mark studied
    Silhouette --> Seen : log sighting
    Studied --> StudiedAndSeen : log sighting
    Seen --> StudiedAndSeen : mark studied
    state "Not yet · greyscale" as Silhouette
    state "Studied · amber ring + 📖" as Studied
    state "Seen · colour + ✓" as Seen
    state "Studied + Seen · colour + both" as StudiedAndSeen
```

| Axis | Set by | Renders as | Counts on home |
| --- | --- | --- | --- |
| 📖 **Studied** | Opening the species page and marking it. XP for studied is paid only after the two-question recap; until the recap exists, studied earns nothing | Greyscale image, amber ring and 📖 | "12 studiert" |
| 👁️ **Seen** | Logging a sighting: claimed (no proof), photographed, or ID-assisted | Colour photo, yours if there is one, else the reference image, and a green ✓ | "8 entdeckt" |

Both counters sit over a **denominator**, the plausible set of the active filter: "12 studiert · 8 entdeckt · 22 möglich". It changes with region, groups and month. Du shows the same three numbers over the whole year; the gap between the two is the seasonal pull and stays visible. The denominator is not a score.

Learning makes winter a season instead of a churn cliff. Seeing stays the only thing that fills the grid, so the walk stays the payoff. Quests (deferred) bridge the two: *study three species that arrive in April* → *the three you studied are flying now within 10 km*.

### The plausible set

The dex shows the species with **enough recorded observations in your filter region**, computed from GBIF and iNaturalist occurrence facets per grid cell, thresholded, per month. Month ("Zeitraum") is a first-class part of the filter and defaults to now; "Ganzes Jahr" is the other option. The user picks and sees a **Landkreis** ("Mainz-Bingen"); plausibility is computed over the union of its cells. Move the region, the dex changes. Logging searches the **full GBIF backbone**, so anything found outside the set joins your dex the moment you see it.

The threshold is the curation. Tune it until "what I could find on Saturday" is what the grid shows; that tuning is a first-slice task, not a later one.

---

## 🗄️ Data sources (all free, all open)

| Need | Source | Licence | Notes |
| --- | --- | --- | --- |
| Taxonomy backbone, names | GBIF `species/match`, Catalogue of Life via ChecklistBank | CC0 / CC BY | No key for reads |
| Plausible set | GBIF `occurrence/search` facets by cell + month; iNaturalist `observations/species_counts` | per dataset | Cache per cell per month; iNat ≤ 60 req/min |
| Common names in the user's language, IUCN status, lead image | Wikidata (P846 → QID → labels, P141, P18) | CC0 | |
| Intro text | Wikipedia in the user's language | CC BY-SA | Attribute, share-alike on the text |
| **Ecology: interactions** | **GloBI** API: eats, eatenBy, pollinates, hostOf, parasiteOf, visitsFlowersOf | per source, mostly CC0/CC BY | The one thing no competitor has |
| Ecology: habitat, traits | EOL TraitBank, IUCN habitat classification | CC BY / research use | Coverage uneven; honest empty states |
| Photos | Wikimedia Commons; iNaturalist CC0 / CC BY / CC BY-NC | per file | **Attribution stored per image, rendered per image view** (§⚖️) |
| Sounds | Xeno-canto API v3 (key required) | mostly CC BY-NC-SA | Fine under free-forever |
| Plant ID assist (deferred) | Pl@ntNet API | free 500/day, non-profit tier | |
| Everything-else ID assist (deferred) | BioCLIP 2, self-hosted | MIT | ViT-L, server-side |
| Bird sound ID (deferred) | BirdNET | CC BY-NC-SA | Fine under free-forever |

Every asset carries its licence and attribution in the database. If free-forever is ever reversed, this table is the list of what has to go.

---

## 🏗️ Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| App | **Next.js App Router PWA**, TypeScript, Tailwind, tRPC, Prisma, Postgres | Sven's stack; debug in a browser; one codebase |
| Phone | **Capacitor wrap of the same static export**, when a second user or a home screen needs it | ~95% shared; camera, geolocation, SQLite, haptics via plugins; Apple wants the native touches the product wants anyway |
| Identity | **Anonymous identity minted on first launch**; passkey or email attaches later to sync across devices. Export and delete available in both states | Seek's frictionless first minute without Seek's data-loss disaster |
| Species data | **ETL into Postgres**: taxa, plausibility per cell/month, interactions, assets with attribution. Refreshed on a schedule, not at request time | Nature APIs are slow and rate-limited; the dex must open offline-ish |
| Offline | Service worker caches the dex for the active filter; sightings queue and sync | Nature has no signal |
| Geo | GeoJSON in ordinary columns, grid-cell keys for plausibility. No PostGIS unless the cell math outgrows a loop | Same standing constraint as the sibling repos |
| Language | German and English from the scaffold, every string behind an i18n key | The owner is user #1 and German; the product is global. Vocabulary is fixed in German first (studiert · entdeckt) |

### Navigation

Bottom app bar **Dex · Quests · ＋ · Tagebuch · Du**; the ＋ is an action, not a tab. Home is **the dex under the global filter**, grid view in the first slice, list and map views deferred. Filters (region, groups, month) are first-class and set during onboarding. In slice one the Quests tab holds a single "kommt bald" line (Q10 stands); Tagebuch is the sightings by day; Du is counters, XP, groups, export, delete and the passkey upgrade, with Einstellungen behind a gear.

---

## 🚶 The first slice: one complete walk

**Definition of done:** Sven uses it on one real walk, and opens it again the next day for no reason.

```mermaid
flowchart LR
    A[🎬 Onboarding<br/>set region + groups] --> B[🏠 Dex grid<br/>plausible set, silhouettes]
    B --> C[📄 Species page<br/>image · names · intro · map<br/>occurrence by month · interactions]
    C --> D[📖 Mark studied]
    B --> E[🔍 Log sighting<br/>search full backbone, claim,<br/>photo optional]
    E --> F[🎉 Silhouette fills]
    D --> B
    F --> B
    B --> G[☁️ Anonymous sync<br/>passkey upgrade offered<br/>after first sighting]
```

### Acceptance criteria

- [ ] Onboarding sets a region and species groups in under a minute, no account, no permission dialogs before they're needed.
- [ ] Home shows the plausible set for that filter as a silhouette grid, and the set feels like "what I could find on Saturday" to Sven.
- [ ] A species page composes GBIF, Wikidata, Wikipedia and GloBI, renders attribution per image view (caption under the image, one Quellen line per page), and shows an honest empty state where a source has nothing.
- [ ] Marking a species studied changes its rendering in the grid and the home counter.
- [ ] Logging a sighting by search and claim, with or without a photo, fills the silhouette and updates the counter. Species outside the plausible set are searchable and join the dex.
- [ ] Sightings and studies persist under the anonymous identity, survive a reload, and sync to a second browser once a passkey is attached.
- [ ] Export of all sightings and studies as JSON works in both identity states. Account deletion works.
- [ ] The dex for the active filter opens with no network.
- [ ] Sven has used it on one walk.

### Explicitly not in the first slice

| Deferred | Next slice? | Depends on |
| --- | --- | --- |
| Weekly generated quests (three active, seasonal, graph-driven, study↔find bridge) | second | plausible-by-month + interactions, both built in slice one |
| Snap-and-send ID assist with an explaining taxon ladder | second or third | Pl@ntNet key, BioCLIP 2 host |
| Share-out card with coarsened location | third | a render route |
| List and map views of the dex | when grid is proven | |
| Capacitor wrap and store listing | when a second person wants it | the PWA |
| LLM editor composing ecology prose from GloBI/EOL facts with citations | polish | the graph must exist first |
| Sessions, places, friends, feed, BirdNET | later grills | |

---

## ⚖️ Ethics rules (product, not fine print)

| Rule | Mechanism |
| --- | --- |
| Sensitive species never show precise locations to anyone but their observer | Auto-obscure IUCN threatened and nationally protected taxa to a cell; coarsen all locations on share cards; strip EXIF GPS on share |
| Locations go down a ladder | Stored exact on the device; shown as **Gemeinde** on every list (Tagebuch, save screen); exact only on the single sighting; the 10 km cell on the species map; coarse on anything shared. The save screen says so: "genau gespeichert · geteilt nur grob" |
| Progression is private | XP and level appear on Du and on Tagebuch rows only: never on a share card, never compared to anyone, no decay, no streak, no rarity multiplier, repeats capped to once per species and month. Studied pays only after the recap. The only public-facing numbers are the two counters and their denominator |
| No incentive to approach, handle or disturb | No rarity multipliers, no location-pinned quests, quest on habitats and seasons not coordinates |
| Wild only | Wild / captive / cultivated prompt on sighting; captive sightings never fill the dex |
| No lethal certainty | No edibility or toxicity statements of our own anywhere. Third-party intro text (Wikipedia) may mention it; fungi pages carry a standing legal notice: no statement, no guarantee, text not checked by us |
| Your data is yours | Export and delete in one screen, both identity states |
| No AI-generated imagery | User photos or licensed reference images with attribution |
| Attribution per image view | Caption on every image at readable size (species page, fill sheet, onboarding splash); one sources line under the grid and one Quellen line at the bottom of every species page; full author and licence on long-press. No caption per grid cell. Copied Wikipedia intros carry CC BY-SA share-alike until they are rewritten from the facts |
| Name and photo are yours | Both optional, local only, never in a sync payload before a passkey exists, never on a share card |

---

## 🎨 UI (step 4, chosen)

Explored in [handoff 0002](../handoffs/0002-ui-exploration-spike.md); variants, owner picks and the 46 doubts in the [findings](../handoffs/0002-ui-exploration-findings.md); checks and answers in [review 0003](../handoffs/0003-ui-spike-review.md). Every screen ✅.

1. ✅ **Onboarding**: three screens, one action each. A dark photographic splash with a real Commons photo and its caption, the promise, then "Meinen Standort nutzen" with the OS permission explained *before* it appears ("wir speichern nur den Landkreis"), "Ort eingeben" as the fallback. Groups as tiles, all on, tap to switch off. A ready screen with the filtered count for this month, nine grey tiles and one line per axis. No account or sync mention before the first sighting. Reason: outdoors nobody types, and the explained ask is what Seek never did. [region](../adr/0001-standkreis-dex-the-first-walk/0002-onboard-1-region.webp) · [groups](../adr/0001-standkreis-dex-the-first-walk/0002-onboard-2-groups.webp) · [ready](../adr/0001-standkreis-dex-the-first-walk/0002-onboard-3-ready.webp). Rejected: search first, a skip on the groups screen.
2. ✅ **Dex grid**: flat 3-column tiles with the German name under each. Not yet discovered = the reference image in greyscale at 45 %; studied = greyscale at 70 % with an amber inset ring and a 📖 badge; discovered = colour photo (own first, else the reference image) with a green ✓; both badges when both. Header: title, grid · list · map toggle, one bar amber-then-green with "12 studiert · 8 entdeckt · 22 möglich", möglich being the active filter's set. One search field with a filter button that shows only the count; region, Zeitraum, groups, state and sort in a bottom drawer; a bottom-right button takes over once the bar scrolls away. One sources line under the grid, no caption per cell. Back restores filter and scroll. [grid](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a.webp) · [dark](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a-dark.webp) · [drawer](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a-filter-drawer.webp) · [360](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a-360.webp). Rejected: group silhouettes (generic, not reproducible), photo cut into a silhouette, per-cell state text, the "likely now" dot.
3. ✅ **Species page**: full page. Image slider with the caption under it, three names, the two-axis state row (📖 studiert · ✓ entdeckt · date), the Wikipedia intro, then sections: **Steckbrief** (Größe · Alter · Nachwuchs · Lebensraum · Zug · Status · Stimme), **Vorkommen** (year strip in words and bars, OpenStreetMap with the 10 km cell), **Verwechslungsgefahr** (look-alike tiles carrying dex state), **Ökologie** (chip rows by kind, each chip carrying the target's dex state, honest empty state). One faint Quellen line at the bottom; section headers carry no source. Sticky "Studiert" and "Entdeckt". Fungus pages carry the legal notice above the intro. [Amsel](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-amsel.webp) · [sections](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-amsel-scrolled.webp) · [bottom](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-amsel-scrolled-2.webp) · [Fliegenpilz](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-fungus-notice.webp) · [dark](../adr/0001-standkreis-dex-the-first-walk/0002-species-p1-amsel-dark.webp). Rejected: radial graph, sheet over grid, 4:3 hero, an ecology score, a "Beschreibung" heading.
4. ✅ **Log a sighting**: the centred ＋ opens a chooser (Foto · Galerie · Suchen, Suchen primary). Search with an empty query *is* the shortlist ("jetzt wahrscheinlich · noch nicht entdeckt"); typing searches the whole backbone. Save on one screen: species, when, where ("genau gespeichert · geteilt nur grob"), optional photo, note; the save button is the wild/captive answer, "Wild · speichern" primary and "Gehalten · speichern" secondary. Three taps outdoors. "Entdeckt" on a species page jumps straight to the save screen. Reason: the wild/captive question is unavoidable but free, and the camera is visible but not first (Q10). [chooser](../adr/0001-standkreis-dex-the-first-walk/0002-log-1-chooser.webp) · [shortlist](../adr/0001-standkreis-dex-the-first-walk/0002-log-2-search-empty.webp) · [results](../adr/0001-standkreis-dex-the-first-walk/0002-log-2-search-results.webp) · [save](../adr/0001-standkreis-dex-the-first-walk/0002-log-3-save.webp). Rejected: a separate wild/captive dialog, camera as the default tile, a confirm step after save.
5. ✅ **The fill moment**: in the grid, not over it. The cell sweeps from grey to colour (own photo, else the reference image) with a green ring and the entdeckt counter ticking once; a compact sheet from below names what was saved ("Entdeckt · Eichelhäher · 4. Sep · Mainz-Bingen · Ort grob gespeichert"), labels a reference-image fill with its attribution, offers "Foto" only when none is attached, and leads on with "Zur Art ›". No acknowledge button, no confetti, no XP on the sheet. One medium haptic when the photo lands. Repeats get a quiet toast and no fill. [sheet](../adr/0001-standkreis-dex-the-first-walk/0002-fill-sheet.webp) · [own photo](../adr/0001-standkreis-dex-the-first-walk/0002-fill-sheet-own-photo.webp). Rejected: full-screen card (a share card in disguise), silhouette outline resting on the photo.
6. ✅ **Bottom bar**: Dex · Quests · ＋ · Tagebuch · Du, one stroke icon set, the ＋ raised and centred as an action. Tagebuch earns its tab because the sighting is the atom (Q1). Quests holds a single "kommt bald" line in slice one. [bar](../adr/0001-standkreis-dex-the-first-walk/0002-grid-a.webp). Rejected: a Lernen tab, Missions, Social, more than five.

Mocked ahead of their slice and chosen, not built in slice one: **7 Quests** as three cards with the why sentence, **8 Tagebuch** by day with Neu entdeckt · Studiert chips and no chip on repeats, **9 Einstellungen** behind a gear, **10 Du** with a blue XP bar and level, region and group progress. Shots and doubts in the findings.

**Design language, chosen:** light default (the walk is in sunlight), paper background, white cards, saturated green `#16a34a` for surfaces and `#15803d` for text. One colour per axis: **amber = studiert, green = entdeckt, blue = progression** (avatar ring, level badge, XP bar, nowhere else). Amber before green in text and bars; badges on the grid and the species state row only. Dark theme follows the system, every colour is a token, the onboarding splash stays dark in both. Vocabulary studiert · entdeckt; the mock speaks German, the app ships German and English with i18n keys from the scaffold. No AI imagery anywhere: Commons photos with captions, drawn group icons.

## ❓ Open, for later grills

- Quest generation rules in detail: how many, how refreshed, how repeats are avoided in a small region.
- The recap: two questions per species, where they come from, what counts as passed. Until it exists, studied earns no XP.
- The XP curve: 150 per level is the mock's number; tune on real data.
- Snap-and-send UX: ladder animation, confidence display, correcting a wrong suggestion.
- The plausibility threshold and cell size, once real data is on screen.
- When exactly the passkey upgrade is offered, and how "see this on your laptop" is worded.
