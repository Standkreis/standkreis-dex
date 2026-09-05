# 🗄️ etl — the species pipeline (M4, [handoff 0006](../../docs/handoffs/0006-etl-and-identity.md))

TypeScript on `tsx`, the app's Prisma client, no other dependency. Every response is cached under `.cache/<host>/` by URL (git-ignored); a re-run costs no requests. Rules: [record 0002](../../docs/records/0002-etl-the-plausible-set.md); numbers: [findings 0006](../../docs/handoffs/0006-etl-and-identity-findings.md). The grill's probe scripts this replaces live in git history (`scripts/etl-probe/` up to commit `cef832f`).

| Command | Does | Calls |
| --- | --- | --- |
| `npm run etl -- region "Mainz-Bingen"` (or a gid `DEU.11.19_1`) `[--month 9]` | GADM search → `Region` · 13 GBIF facets (year + 12 months, 2016–2026, observation records) → cut per tile (90 %, floor 10) → `Taxon`, `Plausibility` (shares, peak, words), `Lookalike` (same genus in the set). One transaction; a failed facet leaves the region `failed` | ≈ 1,600 GBIF, 30 s cold, 1 s warm |
| `npm run etl -- refresh [--days 30]` | The region job again for every region older than `days` | as above per region |
| `npm run etl -- content [--region <name>] [--purge <gbifKey>] [--limit n]` | For every taxon in a set (or with a sighting) and `contentAt` null: GBIF `species/{key}` → Wikidata batch (P846, then exact name; rank check) → image ladder (iNat default photo if licensed → Commons P18 unless specimen/plate/larva/egg/map → next licensed iNat photo → none) → Wikipedia `page/summary` de → en → AnAge (P4024) → GloBI edges folded to six kinds, in-set targets first, ≤ 200 per species; out-of-set targets become `Taxon` rows without plausibility. One transaction per taxon, `contentAt` set; a failing taxon logs and the run continues. `--purge` re-fetches one taxon | ≈ 8 per species + 1 GBIF match per new target; one region ≈ 20 min, bounded by iNaturalist at 1/s |
| `npm run db:seed` | The dev identity and the two fixtures (`fixtures/`, plausibility only, no content), idempotent | 0 |

| File | Holds |
| --- | --- |
| `fetch.ts` | `get` with cache, per-host budget (`ETL_BUDGET`, 50,000/run), gaps as reserved slots (iNat 1,100 ms, Wikidata and GloBI 300 ms, else 100 ms; GBIF none but 6 in flight), 5 attempts with backoff, one User-Agent · `requests()` counters (`misses` = network calls) · `pool` · `q` |
| `gbif.ts` | `resolveRegion`, `gbifFacet`, `gbifSpecies`, `gbifMatch`, the occurrence window (`ETL_YEARS`, default `2016,2026`) |
| `rules.ts` | Pure: `tileOf`, `cutTile`, `monthShares` (per 100,000), `words`, `nowRatio`, `isNow`. Shared with the read routers |
| `prune.ts` | Pure: `pickNames`, `iucnCode`, the Commons reject list, iNat licences, `foldKind`, `capEdges`, `parseAnAge`. Tested in `src/server/routers/taxon.test.ts` |
| `region.ts` | The region job and `refresh` |
| `wikidata.ts` | The two SPARQL batches (by P846, by P225) and the E6 choice |
| `sources.ts` | iNaturalist, Commons `imageinfo`, Wikipedia REST, AnAge |
| `globi.ts` | GloBI paging and the cap |
| `content.ts` | The content job |
| `cli.ts` | Argument parsing |
| `fixtures/` | `fixture-mainz-bingen.json` (929), `fixture-kyoto.json` (303): the grill's sets, the seed's input |

Why the region job precedes the content job: a species enters a set first, content follows. GloBI targets outside every set get a `Taxon` row (tile from GBIF's ranks, `contentAt` null) and are never picked up by the content job unless they gain a plausibility row or a sighting (record 0002 E13).
