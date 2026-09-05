# 📖 Glossary — one row per term, code · de · en

> **Mapping, not dictionary.** German is the source of truth for the UI, English follows, code names stay stable when the UI word moves. If a row needs more than one line, the definition belongs in the [spec](specs/0001-standkreis-dex-the-first-walk.md) and the row links to it. Rejected alternatives live in the [records](records/), not here.

## 🧭 Product and navigation

| Code | 🇩🇪 UI | 🇬🇧 UI | Means | Defined in |
| --- | --- | --- | --- | --- |
| `standkreis` | Standkreis | Standkreis | The brand. The circle around where you stand | [README](../README.md) |
| `dex`, `nav.dex` | **Atlas**, "Dein Atlas" | Atlas, "Your Atlas" | The home tab: the plausible set of the active filter, each species in its state. "Dex" stays in code and specs, "Pokédex für die Natur" stays in the pitch | [spec §Navigation](specs/0001-standkreis-dex-the-first-walk.md#navigation) |
| `nav.quests` | Quests | Quests | Bridges between studied and seen across seasons. "kommt bald" in slice one | spec §🚶 |
| `nav.log` | Eintragen | Log | The centred ＋. An action, not a tab | spec §Navigation |
| `nav.journal` | Tagebuch | Journal | Sightings by day | spec §Navigation |
| `nav.you` | Profil | Profile | Counters, XP, groups, export, delete, passkey. Einstellungen behind a gear. Was "Du" until 2026-09-05; code and route stay `you` | spec §Navigation |

## 🧬 Model

| Code | 🇩🇪 UI | 🇬🇧 UI | Means | Defined in |
| --- | --- | --- | --- | --- |
| `Sighting` | Sichtung | Sighting | The atom. One encounter with a taxon at a time and place; evidence claimed · photographed · id-assisted | [spec §🧬](specs/0001-standkreis-dex-the-first-walk.md#-the-model) |
| `Study` | — | — | The mark that the user opened and studied a species page. Pays XP only after the recap | spec §🧬 |
| `Taxon` | Art | Species | One GBIF backbone species, with Wikidata id, tile and common names | spec §🧬 |
| `Region` | Landkreis / Region | Region | One GADM level-2 polygon. The unit of the plausible set, never a grid | spec §The plausible set |
| `Plausibility` | möglich | possible | Taxon × region: whole-year observations plus twelve month shares. The denominator | spec §The plausible set |
| `Filter` | Filter | Filter | Region + tiles + the "nur jetzt" chip, one per identity | spec §🧬 |
| `Tile` | Gruppe | Group | One of eight coarse taxonomic groups: 🐦 🦌 🐸 🦎 🐟 🦋 🌿 🍄. `insect` = Insekten & Spinnen | spec §The plausible set |
| `Asset` | Foto | Photo | An image with source, licence and author. Own photo first, else reference | spec §🗄️ |
| `Interaction` | Ökologie | Ecology | A GloBI edge: eats, eatenBy, pollinates, hostOf, parasiteOf, visitsFlowersOf | spec §🧬 |
| `Lookalike` | Verwechslungsgefahr | Look-alikes | Species easy to mistake for each other, carrying dex state | spec §🎨 3 |
| `Identity` | — | — | Anonymous cookie-bound id first, passkey or email later | spec §🏗️ |

## 🏷️ State and counters

| Code | 🇩🇪 UI | 🇬🇧 UI | Means | Defined in |
| --- | --- | --- | --- | --- |
| silhouette | noch nicht entdeckt | not yet | Neither axis set. Reference image greyscale 45 % | spec §Two axes |
| studied | **studiert** 📖 | studied | The learning axis. Greyscale 70 %, amber ring, 📖. Never fills the grid | spec §Two axes, [findings §🗣️](handoffs/0002-ui-exploration-findings.md) |
| seen | **entdeckt** ✓ | seen | The finding axis, derived from the first sighting. Colour photo, green ✓. The only thing that fills the grid | spec §Two axes |
| denominator | möglich | possible | Size of the plausible set for the active filter. Whole year, never the month. Not a score | spec §Two axes |
| counters | "12 studiert · 8 entdeckt · 22 möglich" | "12 studied · 8 seen · 22 possible" | Home header bar. Amber before green, always | findings §🔁 |
| first sighting | Neu entdeckt | New | Tagebuch pill and XP line for a dex state change | findings §🗣️ |
| repeat sighting | Wiederentdeckt | Seen again | Pays once per species and month | findings §🗣️ |
| outside the set | "hier selten gemeldet" | "rarely reported here" | A logged species with no plausibility row. In your Atlas, not in the region's set, no bars, sorts last | spec §The plausible set, record 0002 E13 |

## 🕰️ Time

| Code | 🇩🇪 UI | 🇬🇧 UI | Means | Defined in |
| --- | --- | --- | --- | --- |
| `nowRatio`, sort | jetzt wahrscheinlich | likely now | This month's share ÷ the species' peak month. Default grid order | spec §The plausible set |
| `nowOnly`, chip | nur jetzt | now only | share ≥ 25 % of peak. Narrows the grid, not the denominator | spec §The plausible set |
| `words` | Ganzes Jahr · Mär–Okt | All year · Mar–Oct | Month runs ≥ 25 % of peak, all twelve ≥ 10 % → whole year | spec §The plausible set |
| `monthShare` | — | — | Per species and month, share of the region's observations, per 100,000 | schema comment, record 0002 |

## 🧪 Process words

| Term | Means | Lives in |
| --- | --- | --- |
| Grill | A decision session that questions the brief, leaves a record | [records](records/) |
| Record | Immutable log of decisions and rejected alternatives | [records](records/) |
| Spec | Living document while the epic is open, distilled into an ADR at close | [specs](specs/) |
| Handoff | Instructions for one agent session, findings written back next to it | [handoffs](handoffs/) |
| Slice | One end-to-end increment. Slice one = the first walk | [ROADMAP](ROADMAP.md) |
