# 🔥📷 [0015] Findings — the ID engine grill (M12)

> Probe run 2026-09-06 against the 18 photos in `docs/research/walks/01/`. Scripts in `app/scripts/id-probe/`, every response cached under `.cache/`. **The scores below are against the agent's own guess column of `labels.csv`, which the owner has not corrected yet**; §🙋 lists the rows where the engines agree against the guess. Decisions I1–I8 are proposals; the decision cell is the owner's.

| 🗓️ Run | 💸 Spend | 📞 Calls | 🔑 Keys |
| --- | --- | --- | --- |
| 2026-09-06 | ≈ 0.81 $ scored + ≈ 0.35 $ on two truncated Opus attempts ≈ **1.2 $** (budget 5 €) | Pl@ntNet 36 · Sonnet 5 36 · Opus 5 21 (10 kept) | `PLANTNET_API_KEY` 26 chars, `ANTHROPIC_API_KEY` 108 chars, both accepted |

---

## 📁 The fixture and the crops

| Files | What `prep.mjs` found | Band cut |
| --- | --- | --- |
| IMG_3084–3091, 3096 (9) | Photos-app **crop editor, full screen**: the photo fills 1206 × 2622, only a crop icon at the top right (rows ≈ 40–140) | top 150 px |
| IMG_3092, 3093 (2) | Detail view, black chrome, no place label | rows 325–2297 |
| IMG_3094, 3095, 3097 (3) | Detail view with place label and thumbnail strip | 506–2116 · 647–1975 · 858–1764 |
| PHOTO …-38, -44, -45, -45 2 (4) | Not camera originals: 1530 × 2040 / 2048 × 1152, **no EXIF at all** (messenger exports). Nothing to strip, but `prep.mjs` strips anyway | none |

The bands are not a fixed number per file: the script takes the longest run of non-black rows (luminance > 18 on a 120 px copy) and treats a run over 90 % of the height as the full-screen layout. Checked by eye on the contact sheet: no chrome, no thumbnail strip, no label survives.

`docs/handoffs/0015-shots/contact.jpg` — 18 crops, 6 columns. Output `walks/01/prep/<n>.jpg`, ≤ 1600 px, 88 % JPEG, `sharp` writes no metadata block unless asked.

`labels.csv` (tracked): `n,file,guess,kind,inSet,ownerName,ownerSci,inMainzBingen`, the owner columns empty.

`set.json`: 929 rows from the dev DB, the `set` rule of `dex.ts:85` (one `Plausibility` row per taxon in `DEU.11.19_1`): bird 69 · mammal 8 · amphibian 7 · reptile 5 · insect 429 · plant 388 · fungus 23; 85 without a German name. *Mantis religiosa*, *Prunus avium*, *Pyrus communis*, *Malus domestica*, *Juglans regia* are in; *Cucurbita*, *Olea*, *Schefflera*, *Ficus* are not.

## 📊 The 18 rows

Legend: ✅ species in the guess, or the honest answer the guess expects · 🟡 genus in the guess · ⬜ honest "cannot tell" / "several" / "outside the set" / family only · 🔸 wrong but hedged (< 0.5) · ❌ **wrong and confident (≥ 0.5)**. Number = the engine's own score or confidence. "Pl@ntNet ∩ set ≥ 0.1" = the first of Pl@ntNet's top-5 that is a set member with score ≥ 0.1 (what an app filter would do). Opus ran on the ten misty shots only.

| # | Photo · agent's guess | Pl@ntNet auto | Pl@ntNet organ | Pl@ntNet ∩ set ≥ 0.1 | Claude free | Claude set | Opus free |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | IMG_3084 · Pyrus communis | ✅ Pyrus communis 0.23 | ✅ Pyrus communis 0.23 | ✅ Pyrus communis 0.23 | ✅ Pyrus communis 0.85 | ✅ Pyrus communis 0.85 | ✅ Pyrus communis 0.88 |
| 2 | IMG_3085 · fruit tree (Malus/Pyrus) | 🔸 Citrus × aurantium 0.17 | 🔸 Citrus × aurantium 0.17 | 🟡 Malus domestica 0.11 | 🟡 Malus domestica 0.45 | 🟡 Malus domestica 0.55 | 🟡 Malus 0.48 |
| 3 | IMG_3086 · Malus domestica | 🔸 Prunus amygdalus 0.37 | 🔸 Prunus amygdalus 0.37 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🔸 Juglans regia 0.35 | ⬜ cannot tell 0.15 | ⬜ cannot tell 0.5 |
| 4 | IMG_3087 · Pyrus communis or Juglans regia | 🔸 Betula pendula 0.21 | 🔸 Betula pendula 0.21 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ⬜ cannot tell 0.15 | ⬜ cannot tell 0.15 | ⬜ cannot tell 0.3 |
| 5 | IMG_3088 · Juglans regia or Fraxinus excelsior (young) | 🔸 Salix humboldtiana 0.11 | 🔸 Salix humboldtiana 0.11 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🔸 Salix sp. 0.45 | ⬜ outside the set 0.3 | ❌ Salix 0.62 |
| 6 | IMG_3089 · Malus domestica | ❌ Pyrus communis 0.76 | ❌ Pyrus communis 0.76 | ❌ Pyrus communis 0.76 | ❌ Pyrus communis 0.55 | ❌ Pyrus communis 0.55 | ⬜ Rosaceae 0.62 |
| 7 | IMG_3090 · Prunus avium | 🟡 Prunus amygdalus 0.43 | 🟡 Prunus amygdalus 0.43 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Prunus 0.45 | ✅ Prunus avium 0.35 | 🟡 Prunus 0.4 |
| 8 | IMG_3091 · old fruit tree (Malus/Pyrus) | ❌ Cydonia oblonga 0.74 | ❌ Cydonia oblonga 0.74 | ❌ Cydonia oblonga 0.74 | 🟡 Malus domestica 0.7 | 🟡 Malus domestica 0.55 | 🟡 Malus domestica 0.72 |
| 9 | IMG_3092 · bonsai (Olea europaea or Ficus) | 🟡 Ficus microcarpa 0.55 | 🟡 Ficus microcarpa 0.55 | ✅ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Ficus microcarpa 0.55 | ✅ outside the set 0.9 | — |
| 10 | IMG_3093 · Schefflera arboricola | 🔸 Heptapleurum arboricola 0.35 | 🔸 Heptapleurum arboricola 0.35 | ✅ outside the set (no set member ≥ 0.1 in top-5) | ✅ Schefflera arboricola 0.85 | ✅ outside the set 0.85 | — |
| 11 | IMG_3094 · Juglans regia (young) | 🔸 Tetradium daniellii 0.47 | 🔸 Tetradium daniellii 0.47 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ❌ Cornus sanguinea 0.55 | ❌ Cornus sanguinea 0.75 | 🔸 Cornus 0.35 |
| 12 | IMG_3095 · Mantis religiosa | 🔸 Chondrilla juncea 0.01 | 🔸 Chondrilla juncea 0.01 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ✅ Mantis religiosa 0.75 | ✅ Mantis religiosa 0.9 | — |
| 13 | IMG_3096 · several (Quercus, Pinus) | 🟡 Quercus kelloggii 0.44 | 🟡 Quercus kelloggii 0.44 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ✅ several 0.85 | 🟡 Pinus sylvestris 0.55 | — |
| 14 | IMG_3097 · Cucurbita pepo | 🟡 Cucurbita maxima 0.67 | 🟡 Cucurbita maxima 0.67 | ✅ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Cucurbita 0.6 | ✅ outside the set 0.9 | — |
| 15 | PHOTO …-38 · Prunus avium | 🟡 Prunus cerasus 0.6 | 🟡 Prunus cerasus 0.6 | ✅ Prunus avium 0.36 | ✅ Prunus avium 0.85 | ✅ Prunus avium 0.75 | — |
| 16 | PHOTO …-44 · Prunus spinosa, Prunus avium or Prunus cerasifera | 🔸 Malus spectabilis 0.27 | 🔸 Malus spectabilis 0.27 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ❌ Malus 0.6 | ❌ Malus domestica 0.55 | — |
| 17 | PHOTO …-45 · white-flowering tree (Prunus?) | 🔸 Eremophila nivea 0.04 | 🔸 Eremophila nivea 0.04 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Prunus spinosa 0.55 | 🟡 Prunus spinosa 0.65 | — |
| 18 | PHOTO …-45 2 · several (flowering Prunus?) | 🟡 Prunus spinosa 0.19 | 🟡 Prunus spinosa 0.19 | 🟡 Prunus spinosa 0.19 | 🟡 Prunus spinosa 0.55 | 🟡 Prunus spinosa 0.75 | 🟡 Prunus 0.55 |
| | **Tally** | ✅1 🟡6 ⬜0 🔸9 ❌2 | ✅1 🟡6 ⬜0 🔸9 ❌2 | ✅5 🟡2 ⬜9 🔸0 ❌2 | ✅5 🟡7 ⬜1 🔸2 ❌3 | ✅7 🟡5 ⬜3 🔸0 ❌3 | ✅1 🟡4 ⬜3 🔸1 ❌1 |

### 🔍 What the table says before the owner corrects it

| Finding | Evidence |
| --- | --- |
| **Pl@ntNet's `organs=habit` is a no-op** on the current model (`2026-03-20 (7.5)`) | 18 of 18 pairs byte-identical in score and order; the query echo confirms `organs:["habit"]` was sent |
| Pl@ntNet **does not reject non-plants**: the mantis returns a plant list | Top-1 *Chondrilla juncea* at **0.009**; no `noReject` error, HTTP 200. An app needs its own threshold: below 0.1 nothing in the top-5 is worth showing (rows 12, 17) |
| Pl@ntNet's confident errors are **Rosaceae look-alikes** | Row 8 *Cydonia* 0.74, row 6 *Pyrus* 0.76 (see §🙋: the guess may be the wrong party), row 15 *Prunus cerasus* 0.60 over *avium* 0.36 |
| Claude reads the **context** the plant engine cannot | Stakes (2, 4, 6, 15), bench and bonsai pot (9, 10), the hand and the flat (12), the vegetable bed (14), the drone perspective (17, 18) all appear in `context` |
| The constrained prompt makes the **cultivated cases honest** | 9, 10, 14 → "outside the set" at 0.85–0.9 with `if_outside` naming the real thing (*Ficus*, *Schefflera*, *Cucurbita*) |
| The constrained prompt **forces the scene** | Row 13 free: "several" 0.85. Set: *Pinus sylvestris* 0.55 — it picked the one conifer on the list and stopped looking. The honesty rule needs a test for "no single subject" that runs before the list |
| Sonnet's confidence tracks the outcome | Its three ❌ are all 0.55–0.75; its ✅ are 0.75–0.85; 3, 4 land at 0.15 with "cannot tell". Pl@ntNet's ❌ sit at 0.74–0.76, above its ✅ (0.23, 0.36) |
| **Opus 5 buys honesty, not hits**, on the misty trees | 1 ✅ (the pear, same as Sonnet), family-only on 6, "cannot tell" on 3 and 4, wrong on 5 — at 4× Sonnet's price and 19 s median, with 256–1760 uninvited thinking tokens per call |
| The same misty tree, four opinions | Row 3: *Prunus amygdalus* · *Juglans regia* · cannot tell · cannot tell. Row 4: *Betula* · cannot tell ×3. **Nothing at 20 m in mist is worth a species claim.** |

## 🪜 The three ladders, from the real responses

### 15 · the cherry (PHOTO …-38)

| Rung | Pl@ntNet auto | Claude Sonnet free | Claude Sonnet set |
| --- | --- | --- | --- |
| Family | Rosaceae (from `species.family`) | Rosaceae | Rosaceae |
| Genus | Prunus (top-5 all *Prunus*) | Prunus | Prunus |
| Species | **Prunus cerasus 0.60** · Prunus avium 0.36 · P. pensylvanica 0.008 · P. × yedoensis 0.004 · P. americana 0.003 | **Prunus avium 0.85**, alternatives *P. cerasus*, *P. × gondouinii* | **Prunus avium 0.75**, candidates on the list: *P. avium* only |
| Why | none; the organ used is only echoed as `auto` | "kleine runde rote Steinfrüchte in Büscheln", "elliptische, gesägte Blätter", "schlanker junger Baum an Pfahl gebunden" | "young tree with elliptic serrated leaves", "small round bright red cherries", "staked orchard sapling with tree guard, planted in a row" |
| Context | — | "an einem Holzpfahl festgebunden … angepflanzter Obstbaum" | "planted/staked young fruit tree in an orchard row" |
| Next photo | — | "Rinde und Blattstiele (mit den kleinen Drüsen), Blüte im Frühjahr" | "Rinde und Blütenreste am Zweig" |
| GBIF key | 3021922 / 3020791 in the response | — (join by `sciName` against `set.json`; taxon.search for the rest) | — |

Pl@ntNet's ladder has scores at every rung but no words; its top-2 split 60/36 within one genus is the honest signal. Claude's ladder has words at every rung and one number. The two disagree on the species; the set-constrained run agrees with the label because *P. cerasus* is not a set member, which is the set helping.

### 1 · the misty pear (IMG_3084)

| Rung | Pl@ntNet | Sonnet free | Sonnet set | Opus free |
| --- | --- | --- | --- | --- |
| Family | Rosaceae | Rosaceae | Rosaceae | Rosaceae |
| Genus | Pyrus | Pyrus | Pyrus | Pyrus |
| Species | **Pyrus communis 0.23** · *Araujia odorata* 0.10 · *Malus domestica* 0.02 · *Acanthosyris* 0.015 · *Melia* 0.015 | **Pyrus communis 0.85** | **Pyrus communis 0.85**, candidates *Pyrus communis*, *Malus domestica* | **Pyrus communis 0.88**, alternatives *P. pyraster*, *P. nivalis*, *Cydonia*, *Malus* |
| Why | — | "birnenförmige grüne Früchte", "Fallfrüchte am Boden" | "pear-shaped fruits", "gnarled trunk typical of old orchard tree" | seven lines: "pyriforme Früchte … an kurzen Fruchtspießen", "grob längsrissiger, knorriger Stamm", "Fallobst … ebenfalls birnenförmig" |
| Next photo | — | "reife, aufgeschnittene Frucht und Blattunterseite" (for the cultivar) | "Blätter und Fruchtform aus der Nähe" | "Frucht mit Stiel und Kelchansatz, Blatt mit Stiel auf heller Fläche, mit Maßstab" |

The one misty tree every engine gets, because the fruit shape carries at 20 m. Pl@ntNet's 0.23 with a South American vine in second place is what "right but uncertain" looks like in a score; Claude says the same thing as 0.85 with the evidence "birnenförmig". Both are correct; only Claude's number would survive on a screen.

### 12 · the mantis (IMG_3095)

| Rung | Pl@ntNet | Sonnet free | Sonnet set |
| --- | --- | --- | --- |
| Family | Asteraceae (!) | Mantidae | Mantidae |
| Genus | Chondrilla | Mantis | Mantis |
| Species | *Chondrilla juncea* **0.009**, *Stenotaphrum* 0.009, two *Epidendrum* 0.009/0.007, *Aristaloe* 0.006 | **Mantis religiosa 0.75**, alternatives *Iris oratoria*, *Sphodromantis* "falls Gehege-Tier" | **Mantis religiosa 0.9**, candidates: only that one on the list |
| Why | — | "verlängerter Halsschild", "Fangbeine mit Dornenreihe", "dunkler Fleck an der Innenseite der vorderen Hüfte (Coxa) — typisch für M. religiosa" | "elongated pronotum", "raptorial forelegs with spines", "on human hand" |
| Context | — | "Hand des Fotografen zum Größenvergleich, Innenraum" | "indoors on a person's hand, wooden floor and door" |
| Next photo | — | "Flügel von oben und Unterseite des Hinterleibs … falls Terrarientier statt Wildfang" | "Flügel und Innenseite der Fangbeine" |

Pl@ntNet's whole top-5 sums to 0.04: the engine is saying "not a plant" in the only way it can. The app must read that, not show *Chondrilla juncea*. Sonnet names the diagnostic coxa spot and, unprompted, raises the wild-vs-kept question that the sighting record needs.

## 💸 Cost, latency, terms

| Engine · run | Calls | Median s | Max s | Tokens in / cache write / cache read / out | Cost | Per photo |
| --- | --- | --- | --- | --- | --- | --- |
| Pl@ntNet auto | 18 | 0.5 | 0.9 | — | 0 ¢ (free tier, 500/day; 499 → 463 left after 36 calls) | 0 ¢ |
| Pl@ntNet organ | 18 | 0.6 | 0.9 | — | 0 ¢ | 0 ¢ |
| claude-sonnet-5 free | 18 | 8.1 | 10.3 | 41 168 / 0 / 0 / 8 735 | 17.0 ¢ | 0.94 ¢ |
| claude-sonnet-5 set | 18 | 5.8 | 9.2 | 34 184 / 19 334 / 328 678 / 6 430 | 24.7 ¢ | 1.37 ¢ |
| claude-opus-5 free | 10 | 19.0 | 41.0 | 21 658 / 0 / 0 / 11 372 | 39.3 ¢ | 3.93 ¢ |

Prices: Sonnet 5 $2 / $2.50 / $0.20 / $10 per MTok (input / 5 min cache write / cache read / output), Opus 5 $5 / $6.25 / $0.50 / $25 — [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing), read 2026-09-06 (the Sonnet 5 introductory price is now permanent). A 1600 px JPEG costs ~1 500–2 500 input tokens. The set prompt is **19 334 tokens**, written once (4.8 ¢) and read 17× at 0.39 ¢ each; without caching it would be 3.9 ¢ per call. Wall-clock for the 18 × 2 Sonnet calls with three in flight: ~2.5 min. Opus's latency is thinking: `output_tokens_details.thinking_tokens` 256 on the pear, **1 760** on the young tree (11), which needed `max_tokens` 4000 after 700 and 1600 came back empty.

A realistic walk of 20 photos: Pl@ntNet 20 of 500 daily calls, 0 ¢, ~10 s total; Sonnet set 20 × 1.4 ¢ ≈ **28 ¢ per walk**, ~2 min of waiting spread over the walk; Opus ≈ 80 ¢ and 6 min. Ten users × 20 photos a day = 200 Pl@ntNet calls, inside the free tier; 2.8 $ a day on Sonnet.

| Terms | Pl@ntNet | Anthropic API |
| --- | --- | --- |
| Storage of the photo | "The photos sent by the user are not stored in the database. They are only kept in our server volatile memory during the identification process." Query history (dates, image URLs, not the images) is kept for usage monitoring — [my.plantnet.org/terms_of_use](https://my.plantnet.org/terms_of_use) | Inputs and outputs deleted "within 30 days of receipt or generation" unless a zero-data-retention agreement, the Files API, a usage-policy case or the law says otherwise — [privacy.claude.com … how-long-do-you-store-personal-data](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-personal-data) |
| Training | Not addressed in the terms (only the non-storage sentence above) | "Anthropic may not train models on Customer Content from Services." — [anthropic.com/legal/commercial-terms](https://www.anthropic.com/legal/commercial-terms) |
| Quota, money | Free "up to 500 identification queries per day"; free use "might acknowledge Pl@ntNet with the following sentence …" (the attribution line goes in the ⓘ sheet) | Pay per token, no free tier beyond trial credits |
| The sentence before the first upload | *"Das Foto geht ohne Ort und Datum an Pl@ntNet (Frankreich, wird nicht gespeichert)."* | *"Das Foto geht ohne Ort und Datum an Anthropic (USA, nach spätestens 30 Tagen gelöscht, kein Training)."* |

## ❓ I1–I8 · the agent's proposals

The decision cell is empty on purpose. 🙋 in the owner's hand marks an override.

| # | Question | Agent's proposal | Evidence | Decision |
| --- | --- | --- | --- | --- |
| I1 | **Which engine for which group** | **Claude Sonnet 5, set-constrained, as the one engine**; Pl@ntNet as a free second opinion for plants only when its top score ≥ 0.3, shown as "Pl@ntNet sagt …" under the ladder. Not the reverse: Pl@ntNet cannot say "not a plant", "several" or "pot plant" | Plants (14 rows): Pl@ntNet ✅1 🟡6 ❌2 vs Sonnet set ✅5 🟡5 ❌3 ⬜1. Animal (1): Pl@ntNet ✗, Sonnet ✅. Cultivated (3): Pl@ntNet forces a species every time, Sonnet set says "outside the set" 3/3. Scene (1): Sonnet free ✅, set ❌-ish, Pl@ntNet forces *Quercus kelloggii* | |
| I2 | **Whole trees** | No engine gives a species from 20 m in mist that the app may show as one; the screen asks for a closer shot first. Sentence for the camera screen (from Opus's own `hint_de` on row 6): **"Bitte einmal nah heran: ein Blatt, eine Frucht in der Hand, die Rinde — daran lassen sich Apfel, Birne und Kirsche unterscheiden."** The `habit` organ changes nothing; drop it | Rows 1–8, 11, 18: Sonnet set 2 ✅ (1, 7 — 7 at 0.35), 4 🟡, 2 ⬜, 2 ❌. Pl@ntNet 1 ✅, 3 🟡, 2 ❌ at 0.74–0.76, 5 🔸. `organs=habit` identical on 18/18. Every engine's `hint_de` for rows 2–8 asks for leaf + fruit + bark, unprompted | |
| I3 | **Does the set help or hurt** | **Helps, with one fix.** The set turns the three cultivated cases honest and moves 7 → *Prunus avium* and 15 off *P. cerasus*. It hurts on the scene (13) by forcing the one conifer. Fix: the free prompt's "several / cannot tell" gate runs first (same call, the JSON gets a `subject: single | several | none` field before the answer), the list only constrains the `answer`. Pl@ntNet ∩ set ≥ 0.1 is a decent honesty filter (⬜ on 9 rows, ✅ 5) but throws away the genus | Free vs set: ✅5→7, ⬜1→3, 🔸2→0, ❌3→3. Bonsai 🟡→✅, *Schefflera* ✅→✅, pumpkin 🟡→✅, scene ✅→🟡(forced). Cost of the set: +0.4 ¢ per call with caching | |
| I4 | **The taxon ladder** | Build it from Claude's JSON: `ladder.{family,genus,species}` + `evidence[]` + `context` + `hint_de`, one confidence. Join `answer` to the set by `sciName` (929 exact strings in the prompt, so the join is exact), fall back to `taxon.search` for out-of-set names. Pl@ntNet's top-5 with `gbif.id` becomes the "andere Meinung" row, never the ladder | §🪜: three ladders, every rung filled, evidence in German when the prompt is German (the free prompt) and English when the set prompt is English — fix the set prompt's language. GBIF keys come free from Pl@ntNet (`gbif.id`), not from Claude | |
| I5 | **Cost, latency, terms** | Sonnet set: **1.4 ¢ and 6 s per photo**, 28 ¢ per 20-photo walk. Pl@ntNet 0 ¢, 0.5 s, 500/day shared by all users — enough for ~25 walks a day. Opus not worth 4× on this fixture. The two upload sentences are in §💸 | §💸 | |
| I6 | **Privacy** | **Server proxies.** The phone sends the ≤ 1600 px JPEG re-encoded by the browser (Canvas `toBlob` drops EXIF; `prep.mjs` does the same with sharp), the tRPC mutation holds both keys, forwards, returns the JSON, stores nothing unless the sighting is saved (then the photo goes to Blob as today). Both keys live in Vercel env only | The keys must not ship in a PWA bundle; Pl@ntNet's key sits in the URL. Client-side would also put the 19 k-token set prompt in the client. Sharp confirms a resize without `withMetadata()` leaves no EXIF block (18/18 `exif=none`) | |
| I7 | **Offline** | **Outbox.** The snap in airplane mode saves the sighting as "unbestimmt" with the photo in the existing outbox; the flush calls the engine and the ladder arrives on the journal row with a badge. The camera screen says "kein Netz · wird beim nächsten Mal bestimmt". Not "erst online": that loses the sighting | 6–8 s per call online already needs an async pattern; the outbox from M8 exists and carries photos. One-sentence change: the outbox row gets an `idPending` flag the flush clears | |
| I8 | **BioCLIP 2** | **Skip.** I1 leaves no hole: the one animal is ✅ at 0.75/0.9 by Sonnet, and the cost line is 1.4 ¢. BioCLIP would add a 1.7 GB model on a host the stack does not have (Vercel functions) for the "animals" case Claude already covers | Rows 12 and the cultivated three: the failures are not about coverage but about honesty, which a zero-shot classifier over 929 names is structurally worse at (it must pick one) | |

## 🤔 Doubts

1. **The labels are the agent's.** Three rows where every engine disagrees with the guess (6, 8, 16) may be label errors, not engine errors; the tally shifts by up to 3 ✅ per column once the owner corrects them (§🙋).
2. **One fixture, one September, mist.** 10 of 18 are the hardest case. A May walk with flowers would score Pl@ntNet much better; its documented strength is organs, and this set has almost none.
3. **Confidence numbers from Claude are self-reported.** They tracked the outcome here (❌ at 0.55–0.75, ✅ at 0.75–0.9), but the sample is 36 calls. A threshold (show species only ≥ 0.7, genus below) needs the owner's corrected labels and a second walk.
4. **Prompt language.** The free prompt answered in German (the photographer's), the set prompt in English; the difference is the system prompt's language, not a model choice. The build fixes it in one line, but the evidence strings in §🪜 mix.
5. **Opus's thinking is not controllable through `max_tokens` alone**; row 11 used 1 760 thinking tokens and 41 s. If Opus ever runs, it needs the thinking budget parameter, not a bigger `max_tokens`.
6. **Pl@ntNet's "no plant" is a score, not a status.** The mantis came back HTTP 200 with a plant list summing to 0.04. The app's threshold is a product decision the terms do not help with.
7. **Pl@ntNet's `remainingIdentificationRequests` dropped 499 → 463 for 36 calls**: the two runs both count, so a "second opinion" call and a retry both cost quota.
8. `Heptapleurum arboricola` (Pl@ntNet, row 10) is the current name of *Schefflera arboricola* (POWO); the grader counted it 🔸 by string. Synonyms will bite the `sciName` join too: the set is GBIF backbone names, Pl@ntNet is POWO.

## 🙋 For the owner · correct `labels.csv`

| # | Agent's guess | What the engines say | Please |
| --- | --- | --- | --- |
| 6 | *Malus domestica* | Pl@ntNet 0.76, Sonnet ×2 0.55, all *Pyrus communis*; Opus "Rosaceae" | Apple or pear? The tally's two ❌ in every column hang on this row |
| 8 | old fruit tree (Malus/Pyrus) | Pl@ntNet *Cydonia oblonga* 0.74; Claude ×3 *Malus domestica* 0.55–0.72 | Quince is plausible for a leaning old tree on a slope; say which |
| 16 | *Prunus* (spinosa / avium / cerasifera) | Pl@ntNet *Malus spectabilis* 0.27, Sonnet *Malus* 0.6 / *M. domestica* 0.55 | Crab apple or wild cherry? Pink-tinged buds in the crop suggest *Malus* |
| 2, 3, 4, 7 | Malus / Pyrus / Prunus / Juglans by shape | 3: *Prunus amygdalus* · *Juglans* · cannot tell ×2. 4: cannot tell ×3. 7: *Prunus* ×3 | You stood there: name them if you can, or leave "?" so the row scores honesty only |
| 5, 11 | young walnut or ash · young walnut | 5: *Salix* ×4 (weeping habit). 11: *Cornus* ×3, *Tetradium* (Pl@ntNet) | The Oestrich-Winkel tree (11) has red-tinged corymbs in the crop: dogwood, not walnut? |
| 17 | white-flowering tree (Prunus?) | *Prunus spinosa* 0.55/0.65 by Claude; Pl@ntNet nothing | Is it the same tree as 18's? |
| all | `inMainzBingen` empty | 11 and 14 carry labels from Hessen and Kirrberg | Fill the column; rows outside the Landkreis should not count against the set |

Then `node scripts/id-probe/score.mjs` re-scores without a single new API call.

## 🔀 For the merge

- New: `app/scripts/id-probe/{lib,prep,set,plantnet,claude,score}.mjs`, `set.json` (929 rows, from the dev DB), `docs/research/walks/01/labels.csv`, `docs/handoffs/0015-shots/contact.jpg`, this file. `sharp` added as a devDependency (was already in `node_modules` through Next).
- Not committed: `walks/01/*.PNG|jpg`, `walks/01/prep/`, `app/scripts/id-probe/.cache/` (all git-ignored; `.gitignore:8-13`).
- No app code, no schema, no migration, nothing at Neon. Record 0003 and the roadmap wait for the decisions above.
