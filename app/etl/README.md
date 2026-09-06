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

## 🚀 Filling production — Neon (handoff [0011](../../docs/handoffs/0011-vercel.md))

Production is **Neon Postgres** behind Vercel ([docs/DEPLOY.md](../../docs/DEPLOY.md)); no VM, no tunnel. The ETL runs on the laptop, whose `.cache/` turns a fill into minutes, against the **unpooled** Neon URL (`DATABASE_URL_UNPOOLED`; the pooled one drops long transactions). Sightings, photos and identities never travel; only the set tables do. Migrations are not the ETL's job: Vercel's build runs `prisma migrate deploy`.

| Situation | Do | Time |
| --- | --- | --- |
| The dev DB already holds the region, fully filled (`contentAt` set on every taxon of the set) | **Option 2**, dump and restore | minutes |
| New region, or a content refresh | Fill the dev DB first, verify in the app, then Option 2 | ETL once, locally |
| Neon must be the first to see it | Option 1 | region ≈ 2 min, content ≈ **75 min** per region |

The content job is ≈ 30 sequential rate-limited requests per taxon across eight hosts (2026-09-06, Mainz-Bingen: 929 taxa, 16,000+ GBIF calls, 75 min); the `.cache/` only helps on a repeat of the same region. Running it against Neon when the laptop already has the data is wasted time, learned the hard way.

**Option 1 — the ETL against Neon** (when the data does not exist locally):

```sh
cd app
npx vercel env pull --environment production /tmp/dex-prod.env   # never into the repo
export DATABASE_URL="$(grep '^DATABASE_URL_UNPOOLED=' /tmp/dex-prod.env | cut -d= -f2- | tr -d '"')"
npm run etl -- region "Mainz-Bingen"                # Region, Taxon, Plausibility, Lookalike (2026-09-06: 111 s, 1,617 GBIF requests, 929 species)
npm run etl -- content --region "Mainz-Bingen"      # images, intros, facts, edges for the set
rm /tmp/dex-prod.env
```

The region job is one transaction; a dropped connection leaves the region `failed` and the next run replaces it. `content` is one transaction per taxon and resumes where it stopped. `ETL_BUDGET` and `ETL_YEARS` are read from the laptop's environment as always.

**Option 2 — copy the set tables from the dev DB** (the default when the laptop already holds the region; filter other regions and user assets out first if the dev DB holds more than the one set):

```sh
# laptop: only the tables the ETL owns, in dependency order; never Identity, Sighting, Study, Filter
pg_dump postgresql://dex:dex@localhost:5433/dex --data-only \
  -t '"Region"' -t '"Taxon"' -t '"Plausibility"' -t '"Lookalike"' -t '"Asset"' > set.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f set.sql     # DATABASE_URL = the unpooled Neon URL from above
```

`Asset` holds the reference images of the content job **and** user photos (`origin = 'user'`): dump it only into an empty production DB, or filter the user rows out first (`DELETE FROM "Asset" WHERE origin = 'user'` on a scratch copy). Afterwards `/api/health` still says `ok` and the phone's region search finds the set. Until 0011 Track B lands, a taxon with `contentAt` null is healed only by the next `content` run from here, not by the restart sweep (it runs per cold start on Vercel).
