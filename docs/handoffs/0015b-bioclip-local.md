# 🧬 [0015b] Handoff — the third engine: BioCLIP 2, local, via Hugging Face

> A handoff for a grill column, not a build. Child of [grill 0015](0015-snap-and-send-grill.md) question I8. Runs **after** the 0015 findings are committed on `main`, in a second session; it adds one column to the 0015 table and one section to the 0015 findings. Read the documents in §⬆️ before anything else.

| 🗓️ Written | 👤 Owner | ⬆️ Parent | ⏱️ Budget |
| --- | --- | --- | --- |
| 2026-09-06 | Sven Reiser | [Grill 0015](0015-snap-and-send-grill.md) §❓ I1 I3 I8 · its findings | ½ session, Python, no API cost; ~2 GB download once |

---

## 🎯 Why

0015 grills two rented engines. BioCLIP 2 is the third option the spec names: MIT, trained on TreeOfLife-200M, plants **and** animals, no key, no per-call cost, and it runs on the Mac's GPU. If it holds its own on the 18 photos, M12 gets an engine that never phones a third party with the owner's photo, which spec §⚖️ would love. If it does not, the record says so with numbers and the question is closed.

**The catch to grill, not to hide:** a ViT-L does not run on Vercel. A BioCLIP column is worth nothing without a line that says where it would run in production and at what price (§❓ B4).

## ⬆️ Input

| Read | Why |
| --- | --- |
| Findings 0015 (the table, `labels.csv`, `set.json`, the score script's input shape) | The column has to slot into `score.mjs` unchanged |
| Grill 0015 §❓ I3 | Constrained vs free is the same question here: the 929 as label space, or the whole Tree of Life |
| Model card `imageomics/bioclip-2` on Hugging Face; the `pybioclip` package README | Label template ("a photo of *Kingdom Phylum … species*"), `TreeOfLifeClassifier` (open set, all TreeOfLife names) and `CustomLabelsClassifier` (your own list) |
| Spec §⚖️ | The privacy line this engine could satisfy |

## 🛠️ The probe

Everything under `app/scripts/id-probe/bioclip/`, Python, throwaway.

| Step | Do |
| --- | --- |
| 0 | Owner has a Hugging Face account. Install the CLI and log in: `pip install -U "huggingface_hub[cli]"` then `hf auth login` (older installs: `huggingface-cli login`). Token stays in `~/.cache/huggingface/token`; never printed. The model is public, the login only lifts rate limits |
| 1 | `python3 -m venv .venv && .venv/bin/pip install pybioclip torch torchvision pillow` (Apple Silicon: torch picks MPS; check `torch.backends.mps.is_available()`). `.venv/` and `~/.cache/huggingface` stay out of git |
| 2 | `taxonomy.mjs`: for every row of `set.json`, the seven-rank string from GBIF (`api.gbif.org/v1/species/<gbifKey>`: kingdom, phylum, class, order, family, genus, species), cached under `.cache/`. BioCLIP's accuracy depends on the full ranked name, not the binomial alone |
| 3 | `bioclip.py`, three runs over the 18 prepped photos (`docs/research/walks/01/prep/*.jpg`): **A** `TreeOfLifeClassifier` open set, top-5 with scores, rank `species`; **B** `CustomLabelsClassifier` with the 929 ranked strings; **C** as B plus ~200 **distractors**, cultivated and pot plants Europe sees every day (Malus domestica, Cucurbita pepo, Ficus retusa, Schefflera arboricola, Olea europaea …; pull a list from GBIF, do not type it). C is the honesty test: a constrained model always answers, so it needs somewhere true to go |
| 4 | Writes `bioclip.json` in the same per-photo shape as `plantnet.json` / `claude.json` (engine, top-5 with score, latency ms). `score.mjs` gets three more columns: BioCLIP ToL, BioCLIP set, BioCLIP set+distractors |
| 5 | Softmax margin: for every photo the gap between top-1 and top-2. Propose the threshold under which the app says "unsicher"; show it against the ✅/❌ of the table |

## ❓ The questions

| # | Question | What the answer needs |
| --- | --- | --- |
| B1 | **Does it beat or match Pl@ntNet on the plants, Claude on the mantis** | Same 18-row scoring as 0015, joined into the one table |
| B2 | **Open set or the 929.** A vs B vs C on the bonsai, the pumpkin, the *Schefflera*, the drone shots | Which run stays honest; what the margin threshold buys |
| B3 | **The misty trees.** Same ten as 0015 I2 | Genus hits and confident misses per run |
| B4 | **Where it would run.** Not Vercel. Options with EUR/month at 20 photos/day: HF Inference Endpoint (scale-to-zero, cold start seconds), a CPU box (ViT-L on CPU: seconds per photo, measure on the Mac with MPS off), on-device later (Core ML export size) | A table; a recommendation; if none is under ~10 EUR/month at this scale, say so and close the option |
| B5 | **Speed on the Mac.** ms per photo on MPS and on CPU, model load time | Two numbers, for B4 |

## ⬇️ Output

| Deliverable | Lands |
| --- | --- |
| Table | The 0015 findings table gets the three columns; the cost table gets the BioCLIP row with 0 cents and the B4 hosting line |
| Section | Findings 0015 "🧬 BioCLIP 2 (0015b)": B1–B5 with evidence, decision cells empty for the owner, doubts |
| Probe | `app/scripts/id-probe/bioclip/` with a five-line README (venv, login, run) |
| Roadmap | untouched; record 0003 is written once for all three engines after the owner has decided |

**Definition of done:** the owner reads one table with all engines side by side and B4 says what BioCLIP would cost to keep.

## 🚫 Not in this handoff

Fine-tuning · exporting to Core ML · a server for it · any app code · pushing (the owner pushes) · anything that reads `.env*` values or prints the HF token.

## 👉 Start the session with

```
Read docs/handoffs/0015b-bioclip-local.md, then docs/handoffs/0015-snap-and-send-grill-findings.md and app/scripts/id-probe/score.mjs.
Set up the venv, log in to Hugging Face, run taxonomy.mjs and bioclip.py runs A, B, C on the 18 prepped photos.
Extend score.mjs, show me the joined table before writing the findings section.
```
