"""Paired bootstrap of accuracy differences between models on the shared test set.

Usage:  python paired_bootstrap.py --dir paper_results_v2 --out paired_bootstrap_results.csv
Reads predictions_<target>_<model>.csv (columns: row_id, y_true, y_pred, ...) and
resamples test rows with replacement (2,000 resamples, seed 42). The same resample
indices are used for every pair within a target, so the intervals are paired.
Intervals reflect test-set sampling only (single split, single training seed).
"""
import argparse
import numpy as np
import pandas as pd

TARGETS = ["depression", "anxiety", "stress"]
MODELS = ["xgb_smote", "logreg", "xgb_no_resampling", "xgb_smotenc", "xgb_no_sensitive"]
# (a, b): reports accuracy(a) - accuracy(b) in percentage points
PAIRS = [
    ("logreg", "xgb_smote"),
    ("xgb_no_resampling", "xgb_smote"),
    ("xgb_smotenc", "xgb_smote"),
    ("xgb_no_resampling", "logreg"),
    ("xgb_no_sensitive", "xgb_no_resampling"),
]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="paper_results_v2")
    ap.add_argument("--out", default="paired_bootstrap_results.csv")
    ap.add_argument("--boot", type=int, default=2000)
    args = ap.parse_args()

    rng = np.random.default_rng(42)
    rows = []
    for t in TARGETS:
        preds = {m: pd.read_csv(f"{args.dir}/predictions_{t}_{m}.csv") for m in MODELS}
        base = preds["xgb_smote"]
        for m, d in preds.items():
            assert (d.row_id.values == base.row_id.values).all(), f"row order differs: {t} {m}"
            assert (d.y_true.values == base.y_true.values).all(), f"labels differ: {t} {m}"
        y = base.y_true.values
        n = len(y)
        correct = {m: (d.y_pred.values == y).astype(float) for m, d in preds.items()}
        idx = rng.integers(0, n, (args.boot, n))
        for a, b in PAIRS:
            diff = correct[a] - correct[b]
            bs = diff[idx].mean(axis=1) * 100
            lo, hi = np.percentile(bs, [2.5, 97.5])
            rows.append(dict(target=t, model_a=a, model_b=b, n=n,
                             acc_diff_pp=round(diff.mean() * 100, 2),
                             ci_low_pp=round(lo, 2), ci_high_pp=round(hi, 2)))
    out = pd.DataFrame(rows)
    out.to_csv(args.out, index=False)
    print(out.to_string(index=False))

if __name__ == "__main__":
    main()
