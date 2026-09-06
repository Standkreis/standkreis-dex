# 🧬 BioCLIP 2 probe (0015b)

1. `uv venv --python 3.12 .venv && uv pip install --python .venv/bin/python pybioclip torch torchvision pillow huggingface_hub` (Apple Silicon: torch uses MPS; ~4.2 GB land in `~/.cache/huggingface` on the first run).
2. Login is optional, the model is public: `.venv/bin/hf auth login` only lifts rate limits; the token stays in `~/.cache/huggingface/token`, never in this repo.
3. `cd app && node scripts/id-probe/bioclip/taxonomy.mjs` — GBIF ranks for `../set.json` and the distractors (cached in `../.cache/`; `taxonomy.json`, `distractors.json` are committed, so this step is optional).
4. `cd app/scripts/id-probe/bioclip && .venv/bin/python probe.py --device mps` (runs A, B, C) and `--device cpu --runs B --tag cpu --threads 2` for the CPU timing; results in `../.cache/bioclip-*.json`.
5. `cd app && node scripts/id-probe/score.mjs` — the joined table, cost rows and the margin analysis. Findings: `docs/handoffs/0015-snap-and-send-grill-findings.md` §🧬.
