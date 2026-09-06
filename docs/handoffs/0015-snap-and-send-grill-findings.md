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

Legend: ✅ species in the guess, or the honest answer the guess expects · 🟡 genus in the guess · ⬜ honest "cannot tell" / "several" / "outside the set" / family only · 🔸 wrong but hedged (< 0.5) · ❌ **wrong and confident (≥ 0.5)**. Number = the engine's own score or confidence. "Pl@ntNet ∩ set ≥ 0.1" = the first of Pl@ntNet's top-5 that is a set member with score ≥ 0.1 (what an app filter would do). Opus ran on the ten misty shots only. **BioCLIP ToL / set / set+distr.** (0015b, §🧬 below): top-1 of BioCLIP 2 over 867 455 Tree-of-Life names / the 929 / the 929 + 149 distractors; a distractor at top-1 is scored as "outside the set" with the distractor in brackets. ⚠️ No photo was taken in Mainz-Bingen (`place` column): every set-constrained column scores against a list the photographer was not standing in.

| # | Photo · agent's guess | Pl@ntNet auto | Pl@ntNet organ | Pl@ntNet ∩ set ≥ 0.1 | Claude free | Claude set | Opus free | BioCLIP ToL | BioCLIP set | BioCLIP set+distr. |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | IMG_3084 · Pyrus communis | ✅ Pyrus communis 0.23 | ✅ Pyrus communis 0.23 | ✅ Pyrus communis 0.23 | ✅ Pyrus communis 0.85 | ✅ Pyrus communis 0.85 | ✅ Pyrus communis 0.88 | ✅ Pyrus communis 0.35 | ✅ Pyrus communis 0.97 | ✅ Pyrus communis 0.97 |
| 2 | IMG_3085 · fruit tree (Malus/Pyrus) | 🔸 Citrus × aurantium 0.17 | 🔸 Citrus × aurantium 0.17 | 🟡 Malus domestica 0.11 | 🟡 Malus domestica 0.45 | 🟡 Malus domestica 0.55 | 🟡 Malus 0.48 | 🟡 Pyrus calleryana 0.04 | 🟡 Pyrus communis 0.33 | 🟡 Pyrus communis 0.27 |
| 3 | IMG_3086 · Malus domestica | 🔸 Prunus amygdalus 0.37 | 🔸 Prunus amygdalus 0.37 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🔸 Juglans regia 0.35 | ⬜ cannot tell 0.15 | ⬜ cannot tell 0.5 | 🔸 Rusa alfredi 0.07 | 🔸 Prunus mahaleb 0.31 | 🔸 Prunus mahaleb 0.16 |
| 4 | IMG_3087 · Pyrus communis or Juglans regia | 🔸 Betula pendula 0.21 | 🔸 Betula pendula 0.21 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ⬜ cannot tell 0.15 | ⬜ cannot tell 0.15 | ⬜ cannot tell 0.3 | 🔸 Terminalia sericea 0.23 | ✅ Pyrus communis 0.4 | ✅ Pyrus communis 0.36 |
| 5 | IMG_3088 · Juglans regia or Fraxinus excelsior (young) | 🔸 Salix humboldtiana 0.11 | 🔸 Salix humboldtiana 0.11 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🔸 Salix sp. 0.45 | ⬜ outside the set 0.3 | ❌ Salix 0.62 | 🔸 Prosopis glandulosa 0.36 | ❌ Robinia pseudoacacia 0.58 | 🔸 Robinia pseudoacacia 0.41 |
| 6 | IMG_3089 · Malus domestica | ❌ Pyrus communis 0.76 | ❌ Pyrus communis 0.76 | ❌ Pyrus communis 0.76 | ❌ Pyrus communis 0.55 | ❌ Pyrus communis 0.55 | ⬜ Rosaceae 0.62 | 🔸 Bursera cuneata 0.1 | 🔸 Pyrus communis 0.45 | 🔸 Pyrus communis 0.42 |
| 7 | IMG_3090 · Prunus avium | 🟡 Prunus amygdalus 0.43 | 🟡 Prunus amygdalus 0.43 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Prunus 0.45 | ✅ Prunus avium 0.35 | 🟡 Prunus 0.4 | ❌ Prosopis caldenia 0.83 | 🔸 Pyrus communis 0.47 | 🔸 Pyrus communis 0.39 |
| 8 | IMG_3091 · old fruit tree (Malus/Pyrus) | ❌ Cydonia oblonga 0.74 | ❌ Cydonia oblonga 0.74 | ❌ Cydonia oblonga 0.74 | 🟡 Malus domestica 0.7 | 🟡 Malus domestica 0.55 | 🟡 Malus domestica 0.72 | 🔸 Panthera pardus 0.09 | 🟡 Pyrus communis 0.31 | 🟡 Pyrus communis 0.27 |
| 9 | IMG_3092 · bonsai (Olea europaea or Ficus) | 🟡 Ficus microcarpa 0.55 | 🟡 Ficus microcarpa 0.55 | ✅ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Ficus microcarpa 0.55 | ✅ outside the set 0.9 | — | 🔸 Streptopelia decaocto 0.02 | 🔸 Turdus merula 0.21 | 🔸 Turdus merula 0.16 |
| 10 | IMG_3093 · Schefflera arboricola | 🔸 Heptapleurum arboricola 0.35 | 🔸 Heptapleurum arboricola 0.35 | ✅ outside the set (no set member ≥ 0.1 in top-5) | ✅ Schefflera arboricola 0.85 | ✅ outside the set 0.85 | — | ❌ Heptapleurum arboricola 0.84 | 🔸 Eliomys quercinus 0.25 | ✅ outside the set (Heptapleurum arboricola 0.81) |
| 11 | IMG_3094 · Juglans regia (young) | 🔸 Tetradium daniellii 0.47 | 🔸 Tetradium daniellii 0.47 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ❌ Cornus sanguinea 0.55 | ❌ Cornus sanguinea 0.75 | 🔸 Cornus 0.35 | 🔸 Heptacodium miconioides 0.11 | 🔸 Rhus typhina 0.38 | 🔸 Rhus typhina 0.36 |
| 12 | IMG_3095 · Mantis religiosa | 🔸 Chondrilla juncea 0.01 | 🔸 Chondrilla juncea 0.01 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ✅ Mantis religiosa 0.75 | ✅ Mantis religiosa 0.9 | — | ✅ Mantis religiosa 0.49 | ✅ Mantis religiosa 1 | ✅ Mantis religiosa 1 |
| 13 | IMG_3096 · several (Quercus, Pinus) | 🟡 Quercus kelloggii 0.44 | 🟡 Quercus kelloggii 0.44 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ✅ several 0.85 | 🟡 Pinus sylvestris 0.55 | — | 🔸 Fagus sylvatica 0.3 | ❌ Fagus sylvatica 0.7 | ❌ Fagus sylvatica 0.57 |
| 14 | IMG_3097 · Cucurbita pepo | 🟡 Cucurbita maxima 0.67 | 🟡 Cucurbita maxima 0.67 | ✅ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Cucurbita 0.6 | ✅ outside the set 0.9 | — | 🟡 Cucurbita melopepo 0.44 | 🔸 Puccinia malvacearum 0.14 | ✅ outside the set (Cucurbita maxima 0.65) |
| 15 | PHOTO …-38 · Prunus avium | 🟡 Prunus cerasus 0.6 | 🟡 Prunus cerasus 0.6 | ✅ Prunus avium 0.36 | ✅ Prunus avium 0.85 | ✅ Prunus avium 0.75 | — | ✅ Prunus avium 0.12 | ✅ Prunus avium 0.94 | ✅ Prunus avium 0.92 |
| 16 | PHOTO …-44 · Prunus spinosa, Prunus avium or Prunus cerasifera | 🔸 Malus spectabilis 0.27 | 🔸 Malus spectabilis 0.27 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | ❌ Malus 0.6 | ❌ Malus domestica 0.55 | — | 🔸 Malus domestica 0.4 | ❌ Malus domestica 0.72 | 🔸 Malus domestica 0.42 |
| 17 | PHOTO …-45 · white-flowering tree (Prunus?) | 🔸 Eremophila nivea 0.04 | 🔸 Eremophila nivea 0.04 | ⬜ outside the set (no set member ≥ 0.1 in top-5) | 🟡 Prunus spinosa 0.55 | 🟡 Prunus spinosa 0.65 | — | 🔸 Discaria toumatou 0.05 | 🟡 Prunus cerasifera 0.59 | 🟡 Prunus cerasifera 0.52 |
| 18 | PHOTO …-45 2 · several (flowering Prunus?) | 🟡 Prunus spinosa 0.19 | 🟡 Prunus spinosa 0.19 | 🟡 Prunus spinosa 0.19 | 🟡 Prunus spinosa 0.55 | 🟡 Prunus spinosa 0.75 | 🟡 Prunus 0.55 | 🟡 Prunus sativa 0.22 | 🟡 Prunus cerasifera 0.67 | 🟡 Prunus cerasifera 0.67 |
| | **Tally** | ✅1 🟡6 ⬜0 🔸9 ❌2 | ✅1 🟡6 ⬜0 🔸9 ❌2 | ✅5 🟡2 ⬜9 🔸0 ❌2 | ✅5 🟡7 ⬜1 🔸2 ❌3 | ✅7 🟡5 ⬜3 🔸0 ❌3 | ✅1 🟡4 ⬜3 🔸1 ❌1 | ✅3 🟡3 ⬜0 🔸10 ❌2 | ✅4 🟡4 ⬜0 🔸7 ❌3 | ✅6 🟡4 ⬜0 🔸7 ❌1 |

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
| Pl@ntNet organ | 18 | 0.6 | 0.9 | — | 0 ¢ (free tier, 500/day; 499 → 463 left after 36 calls) | 0 ¢ |
| BioCLIP 2 ToL · MPS | 18 | 0.040 | 0.048 | — (867455 labels, warm load 4.3 s) | 0 ¢ (local, MIT) | 0 ¢ |
| BioCLIP 2 set · MPS | 18 | 0.033 | 0.041 | — (929 labels, warm load 2.9 s) | 0 ¢ (local, MIT) | 0 ¢ |
| BioCLIP 2 set+distr. · MPS | 18 | 0.032 | 0.038 | — (1078 labels, warm load 3.6 s) | 0 ¢ (local, MIT) | 0 ¢ |
| BioCLIP 2 set · CPU 12 threads | 18 | 0.116 | 0.121 | — (929 labels, warm load 2.7 s) | 0 ¢ (local, MIT) | 0 ¢ |
| BioCLIP 2 set · CPU 2 threads | 18 | 0.132 | 0.143 | — (929 labels, warm load 2.9 s) | 0 ¢ (local, MIT) | 0 ¢ |
| claude-sonnet-5 free | 18 | 8.1 | 10.3 | 41168 / 0 / 0 / 8735 | 17.0 ¢ | 0.94 ¢ |
| claude-sonnet-5 set | 18 | 5.8 | 9.2 | 34184 / 19334 / 328678 / 6430 | 24.7 ¢ | 1.37 ¢ |
| claude-opus-5 free | 10 | 19.0 | 41.0 | 21658 / 0 / 0 / 11372 | 39.3 ¢ | 3.93 ¢ |

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
- 0015b: `app/scripts/id-probe/bioclip/{README.md,taxonomy.mjs,probe.py,taxonomy.json,distractors.json}`, `score.mjs` extended (three columns, five cost rows, the margin tables), `.gitignore` for the venv. Not committed: `.venv/`, `~/.cache/huggingface` (4.2 GB), `.cache/bioclip-*` and `.cache/gbif-*`.

## 🧬 BioCLIP 2 (0015b)

> Run 2026-09-06 on the same 18 crops, on the Mac (M4 Max, torch 2.14, MPS). `app/scripts/id-probe/bioclip/`: `taxonomy.mjs` (GBIF ranks for the 929 + 149 distractors, 1 112 GBIF requests total, all cached), `probe.py` (runs A, B, C; the CPU timing), results in `.cache/bioclip-<run>-<n>.json`, timings in `.cache/bioclip.json`. Model `hf-hub:imageomics/bioclip-2` (ViT-L/14, MIT, trained on TreeOfLife-200M, 952 K taxa), fetched **without a Hugging Face login** (`hf auth whoami` → "Not logged in"; the public repo needed none). **0 ¢, no key, nothing left the Mac.** The three columns are in the main table above; this section reads them.

| Run | Label space | What it is |
| --- | --- | --- |
| **A · ToL** | 867 455 species names shipped with the model (`TreeOfLife-200M/embeddings`, 2.6 GB) | Open set, the honest baseline: no list, no prior |
| **B · set** | The 929, as `Kingdom Phylum Class Order Family Genus epithet` from GBIF | The constrained model; it must pick one of 929 |
| **C · set+distr.** | B + 149 distractors: the 5 most-recorded GBIF species of 14 pot, crop and garden genera (Malus, Prunus, Cucurbita, Ficus, Schefflera, Heptapleurum, Olea, Citrus, Pelargonium, Monstera, Dracaena, Hedera, Thuja, Solanum: `occurrence/search?genusKey=…&facet=speciesKey`) plus the 60 plants and 30 animals most recorded in Germany that are not in the set (`occurrence/search?country=DE&kingdomKey=…&facet=speciesKey`) | The honesty test: a distractor at top-1 is scored as "outside the set" |

⚠️ **Caveat for every set-constrained column, 0015's included:** the owner's new `place` column says none of the 18 photos was taken in Mainz-Bingen (Schauerberg, Dahn, Kirrberg, Oestrich-Winkel; `inMainzBingen` = no on all 18). Pl@ntNet ∩ set, Claude set, BioCLIP set and set+distr. all score photos against a list for a Landkreis the photographer was not standing in. The list still fits the trees (*Pyrus*, *Prunus*, *Malus* are in), but "outside the set" is not a fair grade for a species that is merely outside *this* set.

### 📊 B1 · against Pl@ntNet and Claude

| | Pl@ntNet auto | Claude set | BioCLIP ToL (A) | BioCLIP set (B) | BioCLIP set+distr. (C) |
| --- | --- | --- | --- | --- | --- |
| All 18 | ✅1 🟡6 🔸9 ❌2 | ✅7 🟡5 ⬜3 ❌3 | ✅3 🟡3 🔸10 ❌2 | ✅4 🟡4 🔸7 ❌3 | **✅6 🟡4 🔸7 ❌1** |
| Misty trees (1–8, 11, 18) | ✅1 🟡2 🔸5 ❌2 | ✅2 🟡3 ⬜3 ❌2 | ✅1 🟡2 🔸6 ❌1 | ✅2 🟡3 🔸4 ❌1 | ✅2 🟡3 🔸5 |
| Mantis (12) | 🔸 *Chondrilla* 0.01 | ✅ 0.90 | ✅ 0.49 | ✅ **1.00** | ✅ **1.00** |
| Cultivated (9, 10, 14) | 🟡🔸🟡 | ✅✅✅ "outside the set" | 🔸 ❌* 🟡 | 🔸🔸🔸 | 🔸 ✅ ✅ |
| Scene (13) | 🟡 forced | 🟡 forced | 🔸 *Fagus* 0.30 | ❌ *Fagus* 0.70 | ❌ *Fagus* 0.57 |
| Says "cannot tell" / "several" | never | 3× | never | never | never |

\* Row 10 in A is *Heptapleurum arboricola* 0.84: the current name of *Schefflera arboricola* (same as Pl@ntNet, doubt 8 of 0015). Graded ❌ by string; by biology it is the one confident open-set hit on a plant.

- **Plants:** C matches Claude set on the trees that carry a signal (pear 0.97, cherry 0.94 — Claude 0.85 / 0.75, Pl@ntNet 0.23 / 0.36 with *P. cerasus* ahead) and is the only engine with **no confident error on the ten misty shots** (Pl@ntNet ❌2 at 0.74–0.76, Claude set ❌2 at 0.55–0.75, BioCLIP C: everything wrong sits at 0.16–0.42). The price is that it never says "cannot tell": its five 🔸 on the misty trees are wrong names at low score where Claude writes ⬜.
- **Mantis:** B and C put **1.000** on *Mantis religiosa* with *Tettigonia viridissima* at 0.000; A gets it at 0.49 among 867 455 names. Claude 0.75/0.9. Pl@ntNet cannot.
- **Cultivated:** the set alone (B) is grotesque: bonsai → *Turdus merula* 0.21 (a blackbird), *Schefflera* → *Eliomys quercinus* 0.25 (a dormouse), pumpkin → *Puccinia malvacearum* 0.14 (a rust fungus). The 929 contain no pot plant, so the embedding lands on the nearest brown-and-green thing. C repairs two of three: *Heptapleurum arboricola* 0.81, *Cucurbita maxima* 0.65 (guess *C. pepo*; Pl@ntNet said *maxima* too). The bonsai stays a blackbird at 0.16 with *Ficus microcarpa* 0.14 second, margin 0.015: honest by number, wrong by name.
- **Drone (16–18):** B/C say *Prunus cerasifera* where Claude says *P. spinosa* (17, 18; both 🟡, both *Prunus* in top-2) and *Malus domestica* on 16, like Claude and Pl@ntNet: three engines against the guess, see §🙋.

### 🧭 B2 · open set or the 929

| Photo | A · ToL | B · set | C · set+distr. |
| --- | --- | --- | --- |
| 9 bonsai | *Streptopelia decaocto* 0.02, *Pittosporum tobira* 0.02 (all five ≤ 0.023) | *Turdus merula* 0.21 | *Turdus merula* 0.16, *Ficus microcarpa* 0.14 |
| 10 *Schefflera* | ✅ *Heptapleurum arboricola* **0.84** | *Eliomys quercinus* 0.25 | ✅ *Heptapleurum arboricola* 0.81, *Schefflera arboricola* 0.18 |
| 14 pumpkin | *Cucurbita melopepo* 0.44 (a *C. pepo* segregate) | *Puccinia malvacearum* 0.14 | ✅ *Cucurbita maxima* 0.65, *C. moschata* 0.19 |
| 17 drone top-down | *Discaria toumatou* 0.05, *Yponomeuta padella* 0.05 (a moth) | *Prunus cerasifera* 0.59, *P. spinosa* 0.23 | *P. cerasifera* 0.52, *P. spinosa* 0.20 |
| 18 drone oblique | *Prunus sativa* 0.22 | *P. cerasifera* 0.67, *P. avium* 0.12 | *P. cerasifera* 0.67, *P. avium* 0.12 |
| 7 misty cherry | ❌ *Prosopis caldenia* **0.83** (an Argentinian mesquite) | *Pyrus communis* 0.47 | *Pyrus communis* 0.39 |
| 8 old fruit tree | *Panthera pardus* 0.09 | *Pyrus communis* 0.31, *Capreolus capreolus* 0.22 | same |

- **A is unusable as a product** on this fixture: the top-1 is on another continent on 11 of 18 rows (*Prosopis*, *Terminalia*, *Colophospermum*, *Bursera*, a leopard on an orchard tree), and its one confident error is 0.83. Its three ✅ are the pear (0.35), the mantis (0.49) and the cherry (0.12). What it is good for: the two cultivated cases where the set has nothing (*Heptapleurum* 0.84, *Cucurbita* 0.44), i.e. as the source of "what it really is" when B/C say "outside the set".
- **B answers *Pyrus communis* on 6 of the 10 misty trees** (1, 2, 4, 6, 7, 8): the set holds one pear, and an old orchard silhouette embeds nearest to it. That is the set as a prior, not as knowledge; it produces the one ✅ on row 4 ("*Pyrus* or *Juglans*") by the same mechanism that produces the 🔸 on the cherry (7).
- **C is the run to keep**: the distractors give the pot plants somewhere true to go (2 of 3), and they **halve B's wrong confidences** (5: 0.58 → 0.41, 16: 0.72 → 0.42, 13: 0.70 → 0.57), which is what turns B's ❌3 into C's ❌1. They cost nothing per call (32 ms vs 33 ms) and 28 s of label embedding once.
- **What no run can do:** "several". Row 13 is *Fagus sylvatica* at 0.30 / 0.70 / 0.57 in A / B / C, top-2 *Carpinus*, and the drone shots are one species by construction. A classifier has no "none of the above" and no "all of the above"; that stays Claude's (I3's `subject` gate) or the camera screen's job.

### 🌫️ B3 · the misty trees, per run

| # | Guess | A · ToL | B · set | C · set+distr. | Genus hit |
| --- | --- | --- | --- | --- | --- |
| 1 | *Pyrus communis* | ✅ 0.35 | ✅ **0.97** | ✅ **0.97** | A B C |
| 2 | Malus/Pyrus | 🟡 *Pyrus calleryana* 0.04 | 🟡 *Pyrus communis* 0.33 · *Malus* 0.09 | 🟡 0.27 | A B C |
| 3 | *Malus domestica* | 🔸 *Rusa alfredi* 0.07 (a deer) | 🔸 *Prunus mahaleb* 0.31 · *Pyrus* 0.13 · *Malus* 0.10 | 🔸 0.16 | — |
| 4 | Pyrus or Juglans | 🔸 *Terminalia sericea* 0.23 | ✅ *Pyrus communis* 0.40 | ✅ 0.36 | B C |
| 5 | Juglans/Fraxinus (young) | 🔸 *Prosopis glandulosa* 0.36, four *Salix* behind | ❌ *Robinia pseudoacacia* 0.58 | 🔸 0.41 · *Salix alba* 0.19 | — |
| 6 | *Malus domestica* | 🔸 *Bursera cuneata* 0.10 | 🔸 *Pyrus communis* 0.45 · *Malus* 0.20 | 🔸 0.42 · *Malus* 0.19 | — (all engines say pear) |
| 7 | *Prunus avium* | ❌ *Prosopis caldenia* 0.83 | 🔸 *Pyrus* 0.47 · *P. mahaleb* 0.21 · *P. avium* 0.09 | 🔸 0.39 | — |
| 8 | old Malus/Pyrus | 🔸 *Panthera pardus* 0.09 | 🟡 *Pyrus* 0.31 · *Capreolus* 0.22 | 🟡 0.27 | B C |
| 11 | *Juglans regia* (young) | 🔸 *Heptacodium* 0.11, *Tetradium* 0.06 (Pl@ntNet's answer) | 🔸 *Rhus typhina* 0.38 = *Syringa* 0.38 | 🔸 margin 0.002 | — |
| 18 | several *Prunus* | 🟡 *Prunus sativa* 0.22 | 🟡 *P. cerasifera* 0.67 · *P. avium* 0.12 · *P. spinosa* 0.11 | 🟡 0.67 | A B C |

Genus hits: A 4, B 6, C 6 of 10; confident misses (≥ 0.5): A 1 (row 7, 0.83), B 1 (row 5, 0.58), C 0. The pattern is the same as 0015 I2: **the fruit carries at 20 m, the silhouette does not.** Row 5 is the one where every engine sees a willow-like young tree (*Salix* × 4 in A's top-5, Pl@ntNet, Claude) and the set turns it into *Robinia*; row 11 is a tie at 0.38/0.38 between sumac and lilac, which the margin catches.

### 📏 The margin · where "unsicher" starts

Softmax top-1 − top-2 per photo, run C, against the grade (the full B and C list is `score.mjs`' last two tables):

| Margin | Rows (C) | Grades |
| --- | --- | --- |
| < 0.1 | 11 (0.002), 9 (0.015), 3 (0.051), 8 (0.080) | 🔸🔸🔸🟡 |
| 0.1 – 0.3 | 2, 16, 7, 4, 6, 5 (0.19 – 0.23) | 🟡🔸🔸✅🔸🔸 |
| ≥ 0.3 | 17 (0.32), 13 (0.43), 14 (0.46), 18 (0.55), 10 (0.63), 15 (0.89), 1 (0.96), 12 (1.00) | 🟡❌✅🟡✅✅✅✅ |

| Threshold t | Shown (margin ≥ t) | Hidden → "unsicher" |
| --- | --- | --- |
| 0.2 | ✅6 🟡2 🔸3 ❌1 | 🟡2 🔸4 |
| **0.3** | **✅5 🟡2 ❌1** | ✅1 🟡2 🔸7 |
| 0.4 | ✅5 🟡1 ❌1 | ✅1 🟡3 🔸7 |

**Proposal: three bands on run C.** Margin **≥ 0.3 → show the species** (8 rows: 5 ✅, 2 🟡 with the right genus, 1 ❌ — the scene, which no margin can catch because *Fagus* 0.57 vs *Carpinus* 0.14 is a clear win for the wrong question). **0.1 – 0.3 → "unsicher"**, show the genus only when top-1 and top-2 share it (16: *Malus* / *Malus* ✓; 2, 4, 6, 7: *Pyrus* / *Malus* or *Prunus* ✗ → nothing). **< 0.1 → nothing**, ask for a closer shot (4 rows, all wrong or lucky). At 0.3 the gate hides all seven 🔸 and loses one ✅ (row 4, "*Pyrus* or *Juglans*", a coin that landed right). Two caveats: on **B the margin does not separate ✅ from ❌** (❌ at 0.39, 0.54, 0.58, the row-4 ✅ at 0.25) — the distractors are what makes the number usable, so the gate is a C feature; and 18 photos set the number to one decimal at best.

### 💶 B4 · where it would run

Not Vercel: 1.7 GB of weights, 428 M parameters (304 M image tower + 124 M text tower, counted from the checkpoint), torch. 20 photos/day, prices read 2026-09-06, 1 $ ≈ 0.92 €.

| Option | Price basis | EUR/month at 20 photos/day | Cold start | Notes |
| --- | --- | --- | --- | --- |
| **HF Inference Endpoints, CPU 2 vCPU, scale-to-zero** | $0.07/h ("Intel Sapphire Rapids aws", [huggingface.co/pricing](https://huggingface.co/pricing)); scales to 0 replicas "for over 15 minutes" idle, "502 Bad Gateway while the new replica is initializing", "no queueing system" ([docs/inference-endpoints/autoscaling](https://huggingface.co/docs/inference-endpoints/autoscaling)); billed "based on the compute hours of your Running Endpoints" ([FAQ](https://huggingface.co/docs/inference-endpoints/en/faq)) | **1.4 €** if the 20 photos come in 2 walks (2 wakes × ~20 min = 0.7 h/day) … **9.7 €** if they come one at a time (20 wakes × 15 min = 5 h/day). Always-on 2 vCPU: 47 € | Minutes: the container pulls 1.6 GB, the client sees 502 meanwhile and must retry on its own | 1 vCPU at $0.03/h exists but its RAM is not stated; fp32 weights alone are 1.7 GB |
| HF Inference Endpoints, T4 GPU, scale-to-zero | $0.50/h ("NVIDIA T4 aws", same page) | 10 € (2 wakes) … 69 € (scattered) | as above | Not needed: 20 photos are 3 s of CPU a day |
| **Hetzner CX23 (2 vCPU shared, 4 GB, 40 GB)** | 5.49 €/month + 0.50 € IPv4 = **5.99 €** ([hetzner.com/pressroom/new-cx-plans](https://www.hetzner.com/pressroom/new-cx-plans/), price after the June 2026 adjustment via [docs.hetzner.com … price-adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/); the plan table on hetzner.com renders client-side, price confirmed on [comparedge](https://comparedge.com/tools/hetzner/pricing) and [bitdoze](https://www.bitdoze.com/hetzner-cloud-cost-optimized-plans/)) | **5.99 €**, flat | None: the model loads once at boot (2.9 s on the Mac from SSD) | Measured: **0.13 s/photo on 2 M4 threads**; a shared x86 vCPU is 3–5× slower → **≈ 0.5 s/photo, 10 s of compute a day**. RAM 1.7 GB weights + torch ≈ 2.5 GB, fits. The real cost: a second host to run (TLS, updates, a 40-line HTTP wrapper), and the one-off label embedding (216 s on MPS → 30–60 min there, once per set change, cached as 2.7 MB) |
| On-device, later | Image tower 304 M params → Core ML **fp16 ≈ 610 MB, int8 ≈ 305 MB**; the set's label embeddings 929 × 768 fp32 = **2.7 MB** (the `.pt` on disk); the text tower is not needed on the phone | 0 € | None | Only the set-constrained runs (B/C): the open-set embeddings are 2.6 GB. The app is a PWA — Core ML needs a native shell, the browser route is 300–600 MB of WebGPU/ONNX per device. Not this milestone |

**Recommendation:** the option does **not** close: **Hetzner CX23 at 5.99 €/month** is under the 10 € line and, unlike HF scale-to-zero (1.4–9.7 € depending on how photos arrive, 502s during every cold start, no queue), predictable. But the table above says what 6 €/month buys: run C with the margin gate is **as good as Claude set on hits (6 vs 7 ✅) and better on confident errors (1 vs 3)**, in 0.5 s instead of 6 s, at 0 ¢ per photo instead of 1.4 ¢ — and it has no words, no ladder evidence, no "several", no "next photo" hint. The argument for it is spec §⚖️: **the photo never leaves hardware the owner runs.** If that line is worth a second host to operate, keep C behind the margin gate as the engine and Claude for the words; if not, I8 "skip" stands and 6 €/month is the price of the privacy sentence.

### ⏱️ B5 · speed on the Mac

| | Warm load | Per photo, median | Max | Note |
| --- | --- | --- | --- | --- |
| A ToL · MPS | 4.3 s (model + 867 455 embeddings) | **40 ms** | 48 ms | |
| B set · MPS | 2.9 s | **33 ms** | 41 ms | label embeddings from `.cache/*.pt` |
| C set+distr. · MPS | 3.6 s | 32 ms | 38 ms | |
| B set · CPU, 12 threads | 2.7 s | **116 ms** | 121 ms | `--device cpu` |
| B set · CPU, 4 threads | 2.6 s | 115 ms | 129 ms | `--threads 4` |
| B set · CPU, 2 threads | 2.9 s | **132 ms** | 143 ms | `--threads 2`: batch 1 is memory-bound, threads barely matter |
| First run | **535 s** | | | 1.6 GB model + 2.6 GB ToL embeddings, no login |
| Label embedding, once | 216 s (929) / 244 s (1 078) on MPS | | | 80 prompt templates × labels through the text tower; cached as 2.7 / 3.2 MB |

### ❓ B1–B5 · the agent's proposals

| # | Question | Agent's proposal | Evidence | Decision |
| --- | --- | --- | --- | --- |
| B1 | Beats or matches | **Matches Claude set on hits, beats every engine on confident errors, loses on words.** C: ✅6 🟡4 🔸7 ❌1 vs Claude set ✅7 🟡5 ⬜3 ❌3, Pl@ntNet ✅1 🟡6 🔸9 ❌2. Mantis 1.00 | §B1 table | |
| B2 | Open set or the 929 | **C, never A as the answer, never B alone.** A for the "what is it then" behind "outside the set" | Bonsai → blackbird, *Schefflera* → dormouse in B; C repairs 2 of 3 and halves B's wrong confidences | |
| B3 | Misty trees | Same verdict as I2: fruit carries, silhouette does not. C: 2 ✅, 3 🟡, 5 🔸, **0 ❌** on the ten | §B3 | |
| B4 | Where | **Hetzner CX23, 5.99 €/month**, if the privacy sentence is worth a second host. Otherwise I8 "skip" stands | §B4 | |
| B5 | Speed | 33 ms MPS · 132 ms CPU (2 threads) · 3 s load | §B5 | |
| — | The margin | Show ≥ 0.3, "unsicher" 0.1–0.3 (genus only on top-2 agreement), nothing < 0.1 — on run C only | §📏 | |

### 🤔 Doubts (0015b)

1. **None of the photos is from Mainz-Bingen** (`place` column). Every set-constrained column, 0015's three and 0015b's two, scores against the wrong Landkreis. The trees happen to be in the set anyway; the pot plants would be "outside" everywhere.
2. **pybioclip is not the paper's protocol.** It resizes to 224 × 224 without a crop (the portrait crops are squashed) and averages 80 ImageNet prompts ("a tattoo of a Plantae Tracheophyta …", "the plastic …") instead of the card's "a photo of …". Both are package defaults, untouched. A proper center crop and the single template could move rows by a few points either way; not measured (½ session).
3. **Synonyms split the softmax.** GBIF has both *Schefflera arboricola* and *Heptapleurum arboricola*; C put 0.81 + 0.18 on the same plant under two names, and A's *Heptapleurum* 0.84 is graded ❌ by string. The set's own names are GBIF backbone; ToL names are too, mostly — a `sciName` join will still need the synonym table 0015's doubt 8 asked for.
4. **149 distractors, not 200**, and the genus list is typed (14 genera), only the species under them are pulled. The 60 DE plants are wild forest and meadow species (*Tilia*, *Picea*, *Betula* …) — good for the misty trees, irrelevant for a windowsill. A distractor list built from a "cultivated in Germany" source (e.g. GBIF `establishmentMeans`) would be the honest version.
5. **The margin depends on the list.** Softmax over 1 078 labels gives systematically lower scores than over 929 (13: 0.70 → 0.57 with the same top-2 order). The 0.3 is a C number; change the list, re-tune.
6. **The CPU number is a Mac number.** 132 ms on two M4 performance threads; "0.5 s on a Hetzner vCPU" is a ×3–5 guess, not a measurement. The one-off label embedding on that box is a guess too (30–60 min).
7. **Scale-to-zero billing at 0 replicas** is implied ("cost savings"), not stated, on the HF pages read; the 15-minute idle window is the billed minimum per wake in my arithmetic.
8. **Cold start on HF is not measured** (no endpoint was created: no spend). "Minutes" is the size of the pull (1.6 GB) and the docs' wording.
