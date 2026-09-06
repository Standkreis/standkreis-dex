# 🔥📇 steckbrief-probe · the 0019 grill

Throwaway. Findings in [docs/handoffs/0019-steckbrief-grill-findings.md](../../../docs/handoffs/0019-steckbrief-grill-findings.md). Run from `app/`, in this order; every response and download is cached under `.cache/` (git-ignored, 97 MB).

| Script | Does | Out |
| --- | --- | --- |
| `taxa.mjs` | the set taxa from the dev DB, read only | `taxa.json` |
| `traits.mjs` | AVONET, EltonTraits, PanTHERIA, AmphiBIO joined by name (+ GBIF synonyms), Wikidata properties per 50 QIDs, GBIF vernacular sample | `coverage.md`, `coverage.json`, `.cache/joined.json` |
| `gift.mjs` | GIFT plant traits for the 643 plants | `gift.md`, `gift.json` |
| `sounds.mjs` | xeno-canto v3 with `XENO_CANTO_API_KEY`, else the Wikidata P2426 proxy | `sounds.json` |
| `facts.mjs` | the fact sheet per species for the ten | `facts.json` |
| `prose.mjs` | Sonnet 5 drafts de + en, validator, judge, cost (`ANTHROPIC_API_KEY`; `ENV_FILE=` when `app/.env.local` is elsewhere) | `prose.json`, `drafts.md` |

Keys: names and lengths only, values never printed. ≤ 1 000 requests per host, User-Agent names the project.
