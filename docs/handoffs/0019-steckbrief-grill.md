# 🔥📇 [0019] Handoff — the Steckbrief grill (M9b)

> A handoff for a grill, not a build. Child of [ROADMAP](../ROADMAP.md) M9b and of the owner's friction row in [0012 findings](0012-first-walk-findings.md): *"as of now it's boring, almost no info to actually learn."* Output: a record, a build handoff, probe numbers. Read the documents in §⬆️ before anything else.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | [Spec 0001](../specs/0001-standkreis-dex-the-first-walk.md) §🗄️ source table, §⚖️ · [Record 0002](../records/0002-etl-the-plausible-set.md) E8 · [Findings 0007](0007-atlas-grid-and-species-findings.md) Steckbrief row · [Grill 0005](0005-etl-grill.md) for the format | 1 grill session in a worktree, throwaway probes, under 3 $ of API calls |

---

## 🎯 Why

The species page is the place the app teaches, and today it teaches almost nothing. The dev DB, three regions plus Kyoto, 1 869 taxa in sets:

| Field | Filled | Share |
| --- | --- | --- |
| Wikipedia intro | 1 720 | 92 % |
| IUCN status | 476 | 25 % |
| Any Steckbrief fact (`facts`) | 143 | **8 %**, all AnAge lifespan or maturity, vertebrates only |
| Größe · Zug · Stimme · Lebensraum | 0 | the faint "noch keine Angaben" line on nearly every page |

The roadmap names three things: **data**, **voice**, **prose**. Each has a source question, a licence question and a cost question that nobody has measured. The grill measures them on the real 1 869 and the owner picks.

## ⬆️ Input

| Read | Why |
| --- | --- |
| Spec §🗄️ | What was probed in 0005 and dropped (EOL, IUCN habitat: "token, later"); Xeno-canto "not probed" |
| Record 0002 E8, E9 | Why the intro is CC BY-SA and marked as such; the GloBI edges and their honest empty state |
| `app/etl/content.ts`, `app/prisma/schema.prisma` `Taxon.facts` `intro` | What the content job fetches today and the JSON shapes |
| Record 0003 §🎯 | Sonnet prices and the caching pattern the scan uses; the prose editor is the same API |
| `app/src/components/SpeciesPage.tsx` Steckbrief section | What the page renders and hides |

## ❓ The questions

| # | Question | What the answer needs |
| --- | --- | --- |
| S1 | **Data: bulk trait datasets before tokened APIs.** AVONET (all birds: mass, wing, habitat, migration, trophic niche; CC BY), EltonTraits (birds + mammals diet, activity), PanTHERIA (mammals), AmphiBIO, Wikidata properties (P2043 length, P2067 mass, P2048 height, P2050 wingspan, P1034 main food), GBIF vernacular. Then the tokened ones: EOL TraitBank, IUCN API v4 (habitat, threats), TRY (plants) | Coverage per field per tile on the 1 869; which fields a **plant** and a **fungus** page can have at all (size, flowering months, edible/poisonous, habitat); a licence line per source; how each dataset is refreshed (a file in the repo vs an API) |
| S2 | **Voice.** Xeno-canto API v3 (key), coverage of the sets' birds, amphibians and Orthoptera; licence (mostly CC BY-NC-SA: what the row must show; is NC compatible with the free-forever product); one clip per species, which one (quality A, song over call, shortest); streaming from xeno-canto vs storing in Blob | Coverage table; the row's attribution shape; bytes per clip and the Blob cost for one region |
| S3 | **Prose.** Sonnet writes two or three paragraphs per species in `de` and `en` from **facts, GloBI edges, month shares and the region**, not from the Wikipedia text (else the result is CC BY-SA and the intro cannot go). Every sentence carries a source id; a validator rejects sentences without one. Ten species drafted, owner reads them | Prompt, the JSON shape (paragraphs, sentences, citations), cost per species per language with caching, ten drafts in the findings, a hallucination check on the ten (every claim traced to its cited fact) |
| S4 | **Schema.** `Taxon.facts` keeps its shape and gains fields; new `prose Json?` (`{ de, en, model, sources[], at }`), new `sound Json?`; the content job gains three steps; refresh rule (prose is written once, rewritten when facts change) | The migration SQL, hand-written, and the JSON shapes |
| S5 | **The page.** What the Steckbrief section becomes: data cells first or prose first; the voice row's place; what stays hidden when empty; the Quellen line with the new sources | Two wireframes in words or ASCII, one recommendation |
| S6 | **Cost of the whole.** Prose for 1 869 taxa × 2 languages; sounds for one region; the trait datasets' size in the repo or the DB | One table; per new region afterwards |

## 🛠️ The probe

Throwaway, `app/scripts/steckbrief-probe/`, Node, cached under `.cache/` (git-ignored, add the line), User-Agent naming the project, ≤ 1 000 requests per host.

| Script | Does |
| --- | --- |
| `taxa.mjs` | The 1 869 set taxa from the dev DB with gbifKey, sciName, tile, class, order, existing facts → `taxa.json` |
| `traits.mjs` | Downloads AVONET, EltonTraits, PanTHERIA, AmphiBIO once to `.cache/`; joins by scientific name (with GBIF synonyms where the join fails); Wikidata properties in batches of 50 by QID (the `Taxon.wikidataId` if stored, else P846 lookup); coverage table per field per tile |
| `sounds.mjs` | Xeno-canto v3 with `XENO_CANTO_API_KEY` from `app/.env.local` if the owner has created one, else the script says what it would need and stops; coverage for birds, amphibians, Orthoptera of the three regions |
| `prose.mjs` | Ten species (Amsel, Kleiner Feuerfalter, Fliegenpilz, Feuersalamander, Brennnessel, Nosferatu-Spinne, Kranich, Hirschkäfer, Grasfrosch, Schwarzerle or the nearest in the sets), Sonnet 5, both languages, `ANTHROPIC_API_KEY` from `app/.env.local`; the validator; drafts and cost to `prose.json` |

Keys: names only, values never printed. `XENO_CANTO_API_KEY` is optional for this grill; if absent, S2 is answered from the API docs and one public page.

## ⬇️ Output

| Deliverable | Lands |
| --- | --- |
| Findings | `0019-steckbrief-grill-findings.md`: coverage tables, the ten drafts, the cost table, S1–S6 with the agent's proposal and an empty decision cell |
| Record | not yet; `docs/records/0004-steckbrief.md` is written after the owner's decisions |
| Probe | `app/scripts/steckbrief-probe/` stays until the build replaces it |

**Definition of done:** the owner has read the ten drafts and the coverage table and can say which of data, voice, prose ship in M9b and in which order.

## 🚫 Not in this grill

App code · the migration itself · the content job · quests · anything that stores a Wikipedia-derived text as the app's own.

## 👉 Start the session with

```
Read docs/handoffs/0019-steckbrief-grill.md and the documents it names in §⬆️.
Worktree ../standkreis-dex-m9b. taxa.mjs and traits.mjs first: show me the coverage table before prose.mjs spends anything.
```
