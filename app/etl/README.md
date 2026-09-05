# 🗄️ etl — the species pipeline (M4, [handoff 0006](../../docs/handoffs/0006-etl-and-identity.md))

TypeScript on `tsx`, the app's Prisma client, no other dependency. Every response is cached under `.cache/<host>/` by URL (git-ignored); a re-run costs no requests. Rules: [record 0002](../../docs/records/0002-etl-the-plausible-set.md); numbers: [findings 0006](../../docs/handoffs/0006-etl-and-identity-findings.md).

| Command | Does | Calls |
| --- | --- | --- |
| `npm run etl -- region "Mainz-Bingen"` (or a gid `DEU.11.19_1`) `[--month 9]` | GADM search → `Region` · 13 GBIF facets (year + 12 months, 2016–2026, observation records) → cut per tile (90 %, floor 10) → `Taxon`, `Plausibility` (shares, peak, words), `Lookalike` (same genus in the set). One transaction; a failed facet leaves the region `failed` | ≈ 1,600 GBIF, 30 s cold, 1 s warm |
| `npm run etl -- refresh [--days 30]` | The region job again for every region older than `days` | as above per region |
| `npm run etl -- content [--purge <gbifKey>] [--limit n]` | **Not built yet.** Names, intro, facts, assets, interactions once per taxon | ≈ 6 per species |

| File | Holds |
| --- | --- |
| `fetch.ts` | `get` with cache, per-host budget (`ETL_BUDGET`, 5,000/run), gaps (iNat 1,100 ms, Wikidata and GloBI 300 ms, else 100 ms), 5 attempts with backoff, one User-Agent · `pool` · `q` |
| `gbif.ts` | `resolveRegion`, `gbifFacet`, `gbifSpecies`, the occurrence window (`ETL_YEARS`, default `2016,2026`) |
| `rules.ts` | Pure: `tileOf`, `cutTile`, `monthShares` (per 100,000), `words`, `nowRatio`, `isNow`. Shared with the read routers |
| `region.ts` | The region job and `refresh` |
| `content.ts` | The content job (stub) |
| `cli.ts` | Argument parsing |
