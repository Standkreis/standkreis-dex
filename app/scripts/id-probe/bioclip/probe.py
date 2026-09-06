"""0015b step 3: BioCLIP 2 (hf-hub:imageomics/bioclip-2, ViT-L/14) on the 18 prepped photos, three runs.

A  TreeOfLifeClassifier, open set (every species name in TreeOfLife-200M), top-5 at rank species
B  CustomLabelsClassifier over the 929 set rows as "Kingdom Phylum Class Order Family Genus epithet" (taxonomy.json)
C  as B plus the distractors (distractors.json): cultivated, pot and common-German species that are not in the set

Writes ../.cache/bioclip-<run>-<n>.json per photo (same shape as plantnet-summary rows: n, run, ms, top[{sci, score, inSet}])
and ../.cache/bioclip.json with load times and latency per run and device. Nothing leaves the Mac; no key.

Run from this directory:  .venv/bin/python probe.py --device mps            (A, B, C)
                          .venv/bin/python probe.py --device cpu --runs B    (the B4/B5 CPU timing)
"""
import argparse, hashlib, json, statistics, time
from datetime import datetime, timezone
from pathlib import Path

import torch

HERE = Path(__file__).resolve().parent
CACHE = HERE.parent / ".cache"
PREP = HERE.parents[3] / "docs/research/walks/01/prep"
MODEL = "hf-hub:imageomics/bioclip-2"
N = range(1, 19)

ap = argparse.ArgumentParser()
ap.add_argument("--device", default="mps" if torch.backends.mps.is_available() else "cpu")
ap.add_argument("--runs", default="A,B,C")
ap.add_argument("--tag", default="", help="suffix for the cache keys, e.g. cpu → bioclip-Bcpu-<n>.json")
ap.add_argument("--threads", type=int, default=0, help="CPU threads (0 = all); 2 or 4 imitates a small VPS")
args = ap.parse_args()
device = args.device
if device == "cpu" and args.threads:
    torch.set_num_threads(args.threads)  # a 2-vCPU VPS is not an M4 Max; see the findings for the scaling
print(f"torch {torch.__version__} device {device} mps_available {torch.backends.mps.is_available()} threads {torch.get_num_threads()}")

taxonomy = json.loads((HERE / "taxonomy.json").read_text())
distractors = json.loads((HERE / "distractors.json").read_text())
in_set = {r["sciName"] for r in taxonomy}
by_label = {r["label"]: r for r in taxonomy + distractors}
summary = json.loads((CACHE / "bioclip.json").read_text()) if (CACHE / "bioclip.json").exists() else {"model": MODEL, "runs": {}}
now = lambda: datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
photos = [str(PREP / f"{n}.jpg") for n in N]


def timed(fn):
    t0 = time.perf_counter()
    out = fn()
    if device == "mps":
        torch.mps.synchronize()
    return out, round((time.perf_counter() - t0) * 1000)


def write(run, n, ms, top, extra=None):
    scores = [t["score"] for t in top]
    row = {"n": n, "run": run, "engine": "bioclip-2", "device": device, "ms": ms, "at": now(), "top": top,
           "margin": round(scores[0] - scores[1], 4) if len(scores) > 1 else None, **(extra or {})}
    (CACHE / f"bioclip-{run}{args.tag}-{n}.json").write_text(json.dumps(row, indent=1, ensure_ascii=False))
    return row


def report(run, load_ms, rows, extra=None):
    ms = sorted(r["ms"] for r in rows)
    summary["runs"][run + args.tag] = {"device": device, "load_ms": load_ms, "photos": len(rows), "median_ms": ms[len(ms) // 2], "max_ms": ms[-1],
                                       "mean_ms": round(statistics.mean(ms)), "at": now(), **(extra or {})}
    (CACHE / "bioclip.json").write_text(json.dumps(summary, indent=1))
    print(f"run {run}{args.tag}: load {load_ms} ms, per photo median {ms[len(ms) // 2]} ms max {ms[-1]} ms")


from bioclip import Rank
from bioclip.predict import CustomLabelsClassifier, TreeOfLifeClassifier

# ---- A · open set --------------------------------------------------------------------------------------------------
if "A" in args.runs:
    clf, load_ms = timed(lambda: TreeOfLifeClassifier(model_str=MODEL, device=device))
    print(f"A: model + {len(clf.txt_names)} ToL names loaded in {load_ms} ms")
    clf.predict(photos[0], rank=Rank.SPECIES, k=5)  # warm-up (MPS kernel compile), not timed
    rows = []
    for n, p in zip(N, photos):
        preds, ms = timed(lambda: clf.predict(p, rank=Rank.SPECIES, k=5))
        top = [{"sci": x["species"], "genus": x["genus"], "family": x["family"], "kingdom": x["kingdom"], "de": x.get("common_name") or None,
                "score": round(float(x["score"]), 4), "inSet": x["species"] in in_set} for x in preds]
        rows.append(write("A", n, ms, top))
        print(f"{n:2d} A {ms:5d} ms  {top[0]['sci']} {top[0]['score']:.3f}{' [set]' if top[0]['inSet'] else ''}  margin {rows[-1]['margin']:.3f}")
    report("A", load_ms, rows, {"labels": len(clf.txt_names)})
    del clf


# ---- B, C · custom labels --------------------------------------------------------------------------------------------
class CachedLabels(CustomLabelsClassifier):
    """Text embeddings of the label list are computed once (929 × 80 templates ≈ 74 k strings) and kept in ../.cache as .pt,
    so the CPU timing run measures the image side only, which is what a hosted engine would do per photo."""

    def _get_txt_embeddings(self, classnames):
        key = hashlib.sha1("\n".join(classnames).encode()).hexdigest()[:12]
        f = CACHE / f"bioclip-txt-{key}.pt"
        if f.exists():
            self.txt_ms = 0
            return torch.load(f).to(self.device)
        t0 = time.perf_counter()
        emb = super()._get_txt_embeddings(classnames)
        self.txt_ms = round((time.perf_counter() - t0) * 1000)
        torch.save(emb.cpu(), f)
        return emb


def custom(run, labels):
    clf, load_ms = timed(lambda: CachedLabels(cls_ary=labels, model_str=MODEL, device=device))
    print(f"{run}: model loaded, {len(labels)} labels embedded, {load_ms} ms total ({clf.txt_ms} ms for the text side)")
    clf.predict(photos[0], k=5)
    rows = []
    for n, p in zip(N, photos):
        preds, ms = timed(lambda: clf.predict(p, k=5))
        top = []
        for x in preds:
            r = by_label[x["classification"]]
            top.append({"sci": r["sciName"], "genus": r["genus"], "family": r["family"], "kingdom": r["kingdom"], "de": r.get("de"),
                        "score": round(float(x["score"]), 4), "inSet": r["sciName"] in in_set, "source": r.get("source", "set")})
        rows.append(write(run, n, ms, top))
        print(f"{n:2d} {run} {ms:5d} ms  {top[0]['sci']} {top[0]['score']:.3f}{' [set]' if top[0]['inSet'] else ' [distractor]'}  margin {rows[-1]['margin']:.3f}")
    report(run, load_ms, rows, {"labels": len(labels), "txt_emb_ms": clf.txt_ms})
    del clf


if "B" in args.runs:
    custom("B", [r["label"] for r in taxonomy])
if "C" in args.runs:
    custom("C", [r["label"] for r in taxonomy] + [r["label"] for r in distractors])
