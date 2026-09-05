# 🔬 etl-probe — throwaway scripts for the ETL grill ([handoff 0005](../../docs/handoffs/0005-etl-grill.md))

Node ≥ 22, no dependencies. Every response is cached under `.cache/` (git-ignored); re-runs cost no requests. Budget: 1,000 requests per host per run. Results land in `out/` as JSON plus the printed markdown tables. Decisions: [record 0002](../../docs/records/0002-etl-the-plausible-set.md); tables: [findings 0005](../../docs/handoffs/0005-etl-grill-findings.md).

| Script | Answers | Reads | Run |
| --- | --- | --- | --- |
| `cells.mjs` | E1 E2 E3 E4 | — | `node cells.mjs --region Mainz-Bingen --month 9 --years 2016,2026 --thresholds 5,10,20 [--skip e1,e4,lists]` |
| `tiles.mjs` | E2 ranked per tile | `cells-*.json` | `node tiles.mjs --region Mainz-Bingen --month 9 --top 30` |
| `year.mjs` | E2 whole-year cut, writes the chosen set | — | `node year.mjs --region Mainz-Bingen --years 2016,2026` |
| `groups.mjs` | E5 E6 | `year-*.json` | `node groups.mjs --region Mainz-Bingen` |
| `assets.mjs` | E7 | `year-*.json` | `node assets.mjs --region Mainz-Bingen` |
| `coverage.mjs` | E8 E9 E10 | `year-*.json` | `node coverage.mjs --region Mainz-Bingen` |
| `budget.mjs` | E11 (offline arithmetic) | — | `node budget.mjs --region Mainz-Bingen` |
| `matrix.mjs` | **the ETL in miniature**: 12 month facets → cut → shares → words → Wikidata names → `out/fixture-<region>.json` | — | `node matrix.mjs --region Mainz-Bingen --years 2016,2026` |

`year.mjs` first, then groups/assets/coverage. E12 = the same commands with `--region Kyoto`. GBIF `gadmGid` facets take 5–8 s; geometry facets 20–35 s (E1 only). Fixtures: `out/fixture-mainz-bingen.json` (929 species), `out/fixture-kyoto.json` (303).
