# 📷 [0016] Findings — Snap-and-send

> What was built for [0016](0016-snap-and-send.md), with evidence. Track A on `main`; Track B follows in the worktree.

| 🗓️ Done | 👤 Agent | ⬆️ Handoff | 🧪 Checks |
| --- | --- | --- | --- |
| 2026-09-06 | Claude | [0016](0016-snap-and-send.md) | A-C1–A-C4 ✅ · Track B open |

## 🅰️ Track A

`sighting.identify` — one Claude Sonnet 5 call per photo, held to the region's set. Code: `app/src/server/identify.ts` (prompt, zod shape, join, threshold, cost, the call), `app/src/server/routers/sighting.ts:identify`, `app/src/server/locale.ts` (A5), `backboneSearch` lifted out of `taxon.search`. Checks on the production build (`next build` + `next start -p 3006`, disk photos under `/tmp/m12-photos`, the dev DB), `app/scripts/m12/identify.mjs`. Unit tests `app/src/server/identify.test.ts`, 14 tests, no network.

### 🔌 The procedure

```ts
sighting.identify({ photoId: uuid, regionId: uuid, locale?: 'de' | 'en' })   // mutation
→ {
  subject: 'single' | 'several' | 'none',
  answer: { gbifKey: number; sciName: string } | null,   // species rank, only at confidence ≥ 0.7
  outside: string | null,                                // the model's name for something not on the list
  confidence: number,                                    // 0..1, the model's own
  ladder: { family: string | null; genus: string | null; species: string | null },
  evidence: string[],                                    // in the request's language
  hint: string | null,                                   // what to photograph next, or null
  cost: { input: number; cacheWrite: number; cached: number; output: number; cents: number },
  ms: number,
}
```

| Rule | Where |
| --- | --- |
| The photo must be the identity's (`ownerId`), attached or not, so the outbox flush can identify a photo already bound to an "unbestimmt" sighting (B5) | `sighting.ts:identify` |
| Bytes come through `readPhoto` (`photos.ts`): disk or Blob, the same seam `/api/photo/<id>` uses | `sighting.ts:identify` |
| `locale` in the input wins, else `ctx.locale`: the `x-dex-locale` header the tRPC client now sends (`trpc/client.tsx`), else the `/de/` or `/en/` prefix of the referring page, else `de` | `locale.ts`, `trpc.ts` |
| Nothing is stored, nothing is created: the sighting is the client's next call, a taxon row is the claim's job (`taxon.ensure`) | A3 |

| Failure | HTTP | tRPC code |
| --- | --- | --- |
| Bytes are no JPEG, or the engine's 400 "could not process image" | 415 | `UNSUPPORTED_MEDIA_TYPE` |
| Photo not the identity's, region unknown, file gone | 404 | `NOT_FOUND` |
| Engine rate limit | 429 | `TOO_MANY_REQUESTS` |
| No answer within 25 s (`AbortSignal.timeout`) | 408 | `TIMEOUT` |
| Engine 5xx / 529 / unreachable / no JSON body | 502 | `BAD_GATEWAY` |
| Answer is not the JSON asked for, or truncated at `max_tokens` | 422 | `UNPROCESSABLE_CONTENT` |
| Key missing (dev) or rejected (401/403) | 412 | `PRECONDITION_FAILED` |

### 📝 The prompt as shipped

Two system blocks, both with `cache_control: ephemeral`; the image and one user line in the message.

**Block 1, the list** (shared by both languages, 18 930 tokens for Mainz-Bingen; rows sorted by `sciName` so the bytes never change between calls):

```
THE LIST for Mainz-Bingen (Germany › Rheinland-Pfalz), 929 species (scientific name · German name):
Abraxas grossulariata · Stachelbeerspanner
Accipiter nisus · Sperber
…
```

**Block 2, the instructions** (`de`; the `en` text is the same sentences in English, `identify.ts:instructions`):

```
Du bist ein erfahrener Feldbiologe. Ein Wanderer im Landkreis Mainz-Bingen (Germany › Rheinland-Pfalz) hat dieses Foto vom Weg aus gemacht. Die Liste der hier plausiblen Arten (wissenschaftlicher Name · deutscher Name) steht oben; für diesen Zweck ist sie vollständig.
Entscheide zuerst das Motiv ("subject"): "single" (ein Organismus ist klar das Motiv), "several" (mehrere Arten, kein einzelnes Motiv, etwa eine Waldszene) oder "none" (kein Organismus: Stein, Gebäude, verwackelt).
Dann die Antwort ("answer"), NUR eines davon: ein wissenschaftlicher Name exakt aus der Liste; "outside the set" (der Organismus steht nicht auf der Liste: kultiviert, exotisch, Topfpflanze, oder eine Art, die hier fehlt); "several"; oder "cannot tell".
Zwinge nie einen Organismus auf ein Listenmitglied, das er nicht ist. Sei ehrlich über die Grenzen einer Fernaufnahme: Ist nur die Gattung klar und die Liste enthält mehrere Arten davon, antworte "cannot tell" und nenne die Gattung in der Leiter ("ladder"), die Art bleibt null.
Schreibe evidence, context und hint auf Deutsch, kurz und konkret. Antworte nur mit JSON, ohne Text darum herum:
{"subject": "single | several | none",
 "answer": "<name copied from the list | outside the set | several | cannot tell>",
 "name": "<German name from the list, or null>",
 "ladder": {"family": "... or null", "genus": "... or null", "species": "... or null"},
 "evidence": ["<visible features, in German>"],
 "context": "<non-biological clues you used (stake, pot, hand, mist ...) in German, or null>",
 "confidence": <0..1 for the answer as given>,
 "candidates": ["<list members considered, scientific names>"],
 "if_outside": "<when the answer is outside the set: the scientific name you think it is, or null>",
 "hint": "<one short sentence in German telling the hiker what to photograph next to reach species rank, or null if not needed>"}
```

User line: *"Bestimme den Organismus auf diesem Foto, nur mit der Liste aus deinen Anweisungen. Nur JSON."* · `model: claude-sonnet-5`, `max_tokens: 1000`.

Changes against `claude.mjs`: `subject` first (record I3); the genus-only rule says **"cannot tell" + genus in the ladder** where the grill said "several" (that word now means several organisms in the frame); `hint_de` → `hint` in the request's language, `de` → `name`; `if_outside` asks for a scientific name; the instructions moved behind the list so the list's cache entry is shared by `de` and `en`.

### 🗳️ Decisions the handoff left open

| Question | Decision | Why |
| --- | --- | --- |
| SDK or fetch | **fetch**, no new dependency | One endpoint, one body; the probe already worked this way; the timeout, the status codes and the cache usage stay in plain sight. The SDK would add retries I want to decide on myself (a 429 must surface, not be retried for 25 s) |
| Where the join's "genus-only → `taxon.search`" lands | **Genus-only stays `answer: null`**; the ladder's genus is what the client shows and sends as `?q=` | `backboneSearch` returns species rows only; a genus has no key there. Searching "Prunus" would return *Prunus avium* as a hit and put a species on the screen the model did not name |
| `outside` with a key | An outside guess at ≥ 0.7 is looked up in the backbone by exact `sciName` and, when found, returned in `answer` too (`answer` = *Ficus microcarpa* 7521861, `outside` = "Ficus microcarpa") | "Das ist es" on a pot plant can then save it as cultivated through the existing claim path; nothing is created by the scan |
| The list is a set member after all | "outside the set" whose `if_outside` names a list member (row 8: *Malus domestica*) is treated as that member | Found in A-C1; without it a set species would have been shown as "nicht im Atlas" |
| Below the threshold the ladder's `species` is **null** too | A4 says species rank only at ≥ 0.7; a species string on the rung with `answer: null` would show one anyway | |
| Rungs must be Latin | Family and genus one capitalised word, species a binomial; prose ("Baum (unbestimmte Familie)", row 4 first run) becomes null | The ladder is names; a German word that happens to be one capitalised word still passes (doubt 3) |
| Set cache | In memory on `globalThis`, per region, one hour; the rows are read once (929 rows, one query) | An ETL refresh lands within the hour; on Vercel each warm instance builds it once |
| Cost line | `cents` at the 0015 prices (2 / 2.5 / 0.2 / 10 $ per MTok), three decimals, plus `cacheWrite` next to `input`/`cached`/`output` | The first call of a region per five minutes pays the write (≈ 5.6 ¢); the owner should see it as such, not as a 1.4 ¢ call that costs four times more |
| Timeout | 25 s, the HTTP body wait included; the tRPC route's `maxDuration` 300 is untouched | The grill's max was 10 s at three in flight; 25 s leaves room for a slow image and stays inside what a phone waits for |

### 🧪 A-C1 · the 18 prepped photos, `locale: de`

`node scripts/m12/identify.mjs run`, 2026-09-06, Mainz-Bingen set 929. Column 3 is the grill's "Claude set" (findings 0015, recorded answers); column 4 is what the screen would show from `identify` (`answer.sciName`, else the ladder's genus, else "several" / "outside the set" / "cannot tell"), graded with `score.mjs`'s rule against `labels.csv` `guess`. Rows 4 and 8 are from the second run after the two join fixes above (`ONLY=4,8`); the other 16 are from the first.

| # | Photo · agent's guess | Claude set (grill 0015) | `sighting.identify` de (0016) | Ladder · outside | Cost |
| --- | --- | --- | --- | --- | --- |
| 1 | IMG_3084 · Pyrus communis | ✅ Pyrus communis 0.85 | ✅ Pyrus communis 0.85 | Rosaceae › Pyrus › Pyrus communis · key 5362573 | 5.56 ¢ (2487/18930/0/330) |
| 2 | IMG_3085 · fruit tree (Malus/Pyrus) | 🟡 Malus domestica 0.55 | 🟡 Malus 0.45 | Rosaceae › Malus › · | 1.62 ¢ (2487/0/18930/741) |
| 3 | IMG_3086 · Malus domestica | ⬜ cannot tell 0.15 | 🔸 Prunus 0.45 | Rosaceae › Prunus › · | 1.35 ¢ (2487/0/18930/478) |
| 4 | IMG_3087 · Pyrus communis or Juglans regia | ⬜ cannot tell 0.15 | ⬜ cannot tell 0.2 | · › · › · | 1.24 ¢ (1677/810/18930/321) |
| 5 | IMG_3088 · Juglans regia or Fraxinus excelsior (young) | ⬜ outside the set 0.3 | 🔸 Salix 0.35 | Salicaceae › Salix › · | 1.16 ¢ (2487/0/18930/280) |
| 6 | IMG_3089 · Malus domestica | ❌ Pyrus communis 0.55 | ❌ Pyrus 0.55 | Rosaceae › Pyrus › · | 1.34 ¢ (2487/0/18930/469) |
| 7 | IMG_3090 · Prunus avium | ✅ Prunus avium 0.35 | 🟡 Prunus 0.45 | Rosaceae › Prunus › · | 1.24 ¢ (2487/0/18930/360) |
| 8 | IMG_3091 · old fruit tree (Malus/Pyrus) | 🟡 Malus domestica 0.55 | 🟡 Malus domestica 0.72 | Rosaceae › Malus › Malus domestica · key 3001244 | 1.08 ¢ (1735/0/19740/336) |
| 9 | IMG_3092 · bonsai (Olea europaea or Ficus) | ✅ outside the set 0.9 | ✅ outside the set 0.75 | Moraceae › Ficus › Ficus microcarpa · outside: Ficus microcarpa · key 7521861 | 1.26 ¢ (2893/0/18930/304) |
| 10 | IMG_3093 · Schefflera arboricola | ✅ outside the set 0.85 | ✅ outside the set 0.85 | Araliaceae › Schefflera › Schefflera arboricola · outside: Schefflera arboricola · key 3038723 | 1.24 ¢ (2893/0/18930/281) |
| 11 | IMG_3094 · Juglans regia (young) | ❌ Cornus sanguinea 0.75 | ❌ Cornus sanguinea 0.72 | Cornaceae › Cornus › Cornus sanguinea · key 3082234 | 1.64 ¢ (3357/0/18930/594) |
| 12 | IMG_3095 · Mantis religiosa | ✅ Mantis religiosa 0.9 | ✅ Mantis religiosa 0.9 | Mantidae › Mantis › Mantis religiosa · key 6258028 | 1.22 ¢ (2975/0/18930/245) |
| 13 | IMG_3096 · several (Quercus, Pinus) | 🟡 Pinus sylvestris 0.55 | ✅ several 0.85 | · › · › · | 1.22 ¢ (2487/0/18930/346) |
| 14 | IMG_3097 · Cucurbita pepo | ✅ outside the set 0.9 | ✅ outside the set 0.85 | Cucurbitaceae › Cucurbita › Cucurbita pepo · outside: Cucurbita pepo · key 2874508 | 1.15 ¢ (2315/0/18930/312) |
| 15 | PHOTO …-38 · Prunus avium | ✅ Prunus avium 0.75 | 🟡 Prunus 0.62 | Rosaceae › Prunus › · | 1.72 ¢ (3357/0/18930/666) |
| 16 | PHOTO …-44 · Prunus spinosa, Prunus avium or Prunus cerasifera | ❌ Malus domestica 0.55 | ❌ Malus 0.55 | Rosaceae › Malus › · | 1.60 ¢ (3357/0/18930/550) |
| 17 | PHOTO …-45 · white-flowering tree (Prunus?) | 🟡 Prunus spinosa 0.65 | 🟡 Prunus 0.55 | Rosaceae › Prunus › · | 1.24 ¢ (2777/0/18930/309) |
| 18 | PHOTO …-45 2 · several (flowering Prunus?) | 🟡 Prunus spinosa 0.75 | ✅ several 0.9 | · › · › · | 1.29 ¢ (2777/0/18930/352) |
| | **Tally** | ✅7 🟡5 ⬜3 🔸0 ❌3 | **✅7 🟡5 ⬜1 🔸2 ❌3** | | |

Cost cells: ¢ (input / cache write / cache read / output tokens). Expected ✅7 🟡5, three cultivated "outside": **met**. What moved and why:

| Rows | Grill → now | Cause |
| --- | --- | --- |
| 13, 18 | 🟡 forced conifer / *Prunus spinosa* → ✅ several | The subject gate (record I3) |
| 15 | ✅ *Prunus avium* 0.75 → 🟡 Prunus 0.62 | The threshold: the model gave 0.62 this time; the ladder stops at the genus, the hint asks for a leaf and the fruit stalks. This is the product working as decided, and one ✅ paid for it |
| 7 | ✅ 0.35 → 🟡 Prunus 0.45 | Same: the grill counted a 0.35 species as a hit; the server no longer shows one |
| 3, 5 | ⬜ → 🔸 Prunus 0.45 / Salix 0.35 | The new genus-only rule surfaces the genus where the grill's prompt said nothing; the grader counts a hedged wrong genus as 🔸. On screen: "Gattung Salix · unsicher" |
| 4 | ⬜ → ⬜ (after the rung rule; first run 🔸 "Baum (unbestimmte Familie)") | Prose in `ladder.family`, now null |
| 8 | 🟡 0.55 → 🟡 *Malus domestica* 0.72 (first run: "outside the set" naming *Malus domestica*) | The member-in-outside fix; the second call answered the member directly |
| 6, 11, 16 | ❌ → ❌ | The three label disputes of findings 0015 §🙋 (apple or pear; dogwood; crab apple). Every engine disagrees with the guess on these |

18 of 18 answers have their evidence in German (heuristic: umlauts or common German words in `evidence`), against 0 of 18 in the grill's English set prompt (A5). Samples of the shipped shape:

```json
15 {"subject":"single","answer":null,"outside":null,"confidence":0.62,"ladder":{"family":"Rosaceae","genus":"Prunus","species":null},
    "evidence":["Junger Baum mit rundlich-eiförmigen, gesägten Blättern","Reife rote bis dunkelrote, kugelige Steinfrüchte in Büscheln an langen Stielen","Wuchsform als schlanker Jungbaum typisch für Kirsche"],
    "hint":"Ein Nahfoto der Blattform und der Fruchtstiele würde die Bestimmung absichern.","cost":{"input":3357,"cacheWrite":0,"cached":18930,"output":666,"cents":1.716}}
 9 {"subject":"single","answer":{"gbifKey":7521861,"sciName":"Ficus microcarpa"},"outside":"Ficus microcarpa","confidence":0.75,"ladder":{"family":"Moraceae","genus":"Ficus","species":"Ficus microcarpa"},
    "evidence":["Bonsai-Baum in flacher Schale mit Moosunterpflanzung","verdickter, verwobener Stamm typisch für Ficus-Bonsai","glänzende, ovale Blätter","auf Metalltisch vor Hauseingang platziert"],
    "hint":"Fotografiere die Blattunterseite und eventuelle Luftwurzeln, um die genaue Ficus-Art zu bestätigen.","cost":{"input":2893,"cacheWrite":0,"cached":18930,"output":304,"cents":1.261}}
13 {"subject":"several","answer":null,"outside":null,"confidence":0.85,"ladder":{"family":null,"genus":null,"species":null},
    "evidence":["Waldszene mit mehreren Baumarten (Kiefern mit rötlicher Rinde, Eichen mit herbstlich gefärbtem Laub)","moosbewachsene Felsen am Wegrand","Herbstlaub auf dem Waldboden","kein einzelnes Motiv im Vordergrund erkennbar"],
    "hint":"Fotografiere einen einzelnen Baum oder ein Blatt aus der Nähe, um die Art sicher zu bestimmen.","cost":{"input":2487,"cacheWrite":0,"cached":18930,"output":346,"cents":1.222}}
```

### 💾 A-C2 · the cache, and 💸 A6 · the cost line

| Call | input | cache write | cache read | output | ¢ |
| --- | --- | --- | --- | --- | --- |
| 1st of the region (row 1) | 2 487 | **18 930** | 0 | 330 | 5.56 |
| 2nd (row 3, 1.3 s later) | 2 487 | 0 | **18 930** | 478 | 1.35 |
| 1st after the prompt change (row 4, second run): list read, instructions written | 1 677 | 810 | 18 930 | 321 | 1.24 |
| Next (row 8): both blocks read | 1 735 | 0 | **19 740** | 336 | 1.08 |

Cache read tokens > 0 on the second call: **✅**. With both breakpoints warm the uncached input is the image plus the user line (≈ 1 700 tokens) and a call costs **1.1–1.3 ¢**; the whole run of 18 was 28.2 ¢, 1.56 ¢ per photo including the one write (grill: 1.37 ¢ with the write spread over 17 reads). Latency at three in flight: median 6.4 s, max 10.4 s (single calls in A-C3's warm-up: 4–6 s). The output is longer than the grill's (7 274 vs 6 430 tokens for 18): German prose.

Spend this track: 18 + 2 real calls ≈ **31 ¢**; the not-an-image call was a 400 with no usage; 429 and timeout hit the stub.

### 🚫 A-C3 · typed errors, never a 500

`node scripts/m12/identify.mjs errors http://localhost:3006 http://localhost:3007`; the second server was started with `ANTHROPIC_BASE_URL=http://localhost:3107`, where the script's stub answers the first call 429 and lets the second hang 40 s.

| Case | HTTP | tRPC code | Message · time |
| --- | --- | --- | --- |
| Bytes that pass the upload's JPEG magic but are no image (real API: 400 "could not process image") | 415 | `UNSUPPORTED_MEDIA_TYPE` | engine could not read the image · 0.4 s |
| Unknown photo id | 404 | `NOT_FOUND` | unknown photo · 0.0 s |
| Unknown region id | 404 | `NOT_FOUND` | unknown region · 0.0 s |
| 429 from the engine (stub) | 429 | `TOO_MANY_REQUESTS` | engine rate limit · 0.1 s |
| Engine hangs (stub, 40 s) | 408 | `TIMEOUT` | engine did not answer within 25 s · 25.0 s |

The stub saw `x-api-key` present and a 843 KB body on both calls (the image plus the list). No 500 anywhere: ✅. A1 by hand: `next start` with `ANTHROPIC_API_KEY=` (empty) exits 1 with `[env] refusing to start … ANTHROPIC_API_KEY: empty`.

### ✅ A-C4 · `npm run check`

Typecheck, lint, 46 tests (32 before + 14 in `identify.test.ts`: the JSON validation on five malformed inputs, the join on the recorded cherry / scene / bonsai / mist / solitaire answers, the threshold at 0.69 / 0.7, member-in-outside, Latin rungs, the cost of the recorded cherry = 1.407 ¢, `localeOf`), export build: green, see the commit.

### 🤔 Doubts

1. **The threshold takes hits away on this fixture.** Rows 7 and 15 were ✅ in the grill at 0.35 and 0.75 and are 🟡 now at 0.45 and 0.62; the model's number moves ±0.15 between runs on the same bytes. On a real close-up walk this should matter less (record 0003 §⚠️ row 1, owner's addendum). If the owner wants the species shown as "wahrscheinlich" at 0.4–0.7, the change is one constant (`THRESHOLD`) and the client's words.
2. **The genus-only rule surfaces wrong genera.** Rows 3 and 5 now say *Prunus* 0.45 and *Salix* 0.35 where the grill's prompt said nothing. The screen will call them "unsicher"; the question is whether "Gattung Salix · unsicher" on a young walnut is better than silence. I think yes, with the hint under it, but it is a product call.
3. **Rung sanitising is by shape.** A single German word in `genus` ("Laubbaum") passes as a genus; only prose is caught. Not seen in 20 calls with the German prompt, but possible.
4. **Two cache breakpoints, two languages.** An `en` call after a `de` one reads the list and writes its own 810-token tail; harmless, but the cost line of that call shows `cacheWrite` > 0 without the region being cold. The ⓘ sheet should not word `cacheWrite` as "first scan of the region".
5. **`outside` carries a backbone key from `backboneSearch`**: three GBIF calls plus per-key lookups, 1–2 s on top of the scan, only on outside answers at ≥ 0.7. Nothing is created, but "Das ist es" on it goes through `taxon.ensure`, which does create the row and kicks the content job. Same as a typed search today.
6. **Non-determinism.** Row 8 answered "outside the set (Malus domestica)" once and "Malus domestica 0.72" the next time on identical bytes. Both land on *Malus* after the fix; the numbers in the table are one sample each, not means.
7. **The sweep on `next start` ran the content job for 595 taxa** of the dev DB (Kyoto's set) during A-C1. It did not touch the results, but the box was busy; on Vercel the cron owns it.

### 🔀 For the merge

- **Track B calls** `trpc.sighting.identify.mutate({ photoId, regionId })` and may pass `locale`; the header `x-dex-locale` is already set by `TRPCReactProvider`, `Queue.ts`'s own client is not touched (Track B's file) and would fall back to the referer, or pass `locale` explicitly in the flush.
- Shape to render (B3/B4): `subject` → the "several" / "none" sentences; `answer` → "Das ist es" with `answer.gbifKey`; `ladder.genus` → `?q=` for "Nein, suchen"; `outside` → *"Nicht im Atlas von {region}: vermutlich {outside}"* (already a binomial when the model gave one); `confidence` → sicher / wahrscheinlich / unsicher; `hint` → the line under the rungs whenever `answer` is null and `subject` is `single`; `cost.cents` → "1,4 ¢" in the ⓘ (B6).
- New files: `app/src/server/identify.ts`, `identify.test.ts`, `locale.ts`, `app/scripts/m12/identify.mjs`, this file. Changed: `env.ts` (`ANTHROPIC_API_KEY` strict, `ANTHROPIC_BASE_URL` optional, "empty" wording), `trpc.ts` (`ctx.locale`), `trpc/client.tsx` (the header), `routers/taxon.ts` (`backboneSearch` exported, `search` calls it), `routers/sighting.ts` (`identify`), `docs/DEPLOY.md` (two rows), `.env.example`, `.gitignore` (`app/scripts/m12/.cache/`).
- Not committed: `app/scripts/m12/.cache/identify-<n>.json` (raw answers, git-ignored), `/tmp/m12-photos`.
- Owner: `ANTHROPIC_API_KEY` in Vercel (Production + Preview) **before** the next push, or production refuses to start (A1).
- No schema change, no migration, nothing at Neon.
