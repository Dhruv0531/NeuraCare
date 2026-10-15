"""
NeuraCare - 37-feature (target-item-excluded) ablation, re-run with saved predictions.

Usage:
    pip install pandas numpy scikit-learn xgboost imbalanced-learn
    python run_37_feature_ablation.py --data data.csv --out paper_results_v2
    (add --boot 200 for a quick test run; default is 2000 bootstrap resamples)

What it produces (all in --out):
    cleaning_audit.json            raw / cleaned row counts, class counts, split sizes
    summary_metrics.csv            accuracy, weighted/macro F1, weighted OvR AUC (+ 95% bootstrap CIs) and ECE (10 bins)
    per_class_metrics.csv          precision / recall / F1 per class
    confusion_matrices.csv         confusion matrix per target and model
    subgroup_metrics.csv           accuracy / weighted F1 by gender and age band (main model, n >= 100)
    predictions_<target>_<model>.csv   row-level true labels, predictions, class probabilities

IMPORTANT: the cleaning steps, cut points, item keys and XGBoost settings below follow the paper.
If your notebook splits the data differently (e.g. a different train_test_split order), copy
your notebook's split code into make_split() so the numbers match the paper's saved results.
"""
import argparse, json, os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (accuracy_score, f1_score, roc_auc_score,
                             precision_recall_fscore_support, confusion_matrix)
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE, SMOTENC

SEED = 42
ITEMS = [f"Q{i}A" for i in range(1, 43)]
DEMOS = ["age", "gender", "education", "urban", "religion", "orientation",
         "race", "married", "familysize"]
CATEGORICAL_DEMOS = ["gender", "education", "urban", "religion", "orientation", "race", "married"]
SENSITIVE = ["race", "religion", "orientation"]
KEYS = {  # DASS-42 subscale item numbers
    "depression": [3, 5, 10, 13, 16, 17, 21, 24, 26, 31, 34, 37, 38, 42],
    "anxiety":    [2, 4, 7, 9, 15, 19, 20, 23, 25, 28, 30, 36, 40, 41],
    "stress":     [1, 6, 8, 11, 12, 14, 18, 22, 27, 29, 32, 33, 35, 39],
}
CUTS = {  # (upper bound of Low, upper bound of Moderate); above that = High
    "depression": (13, 20),
    "anxiety": (9, 14),
    "stress": (18, 25),
}
CLASSES = ["Low", "Moderate", "High"]
XGB_PARAMS = dict(n_estimators=400, max_depth=6, learning_rate=0.05, subsample=0.8,
                  colsample_bytree=0.8, min_child_weight=3, gamma=0.1, reg_alpha=0.1,
                  reg_lambda=1.0, eval_metric="mlogloss", random_state=SEED, n_jobs=-1)


def load_and_clean(path):
    df = pd.read_csv(path, sep="\t")
    audit = {"raw_rows": int(len(df))}
    cols = [c for c in ITEMS + DEMOS if c in df.columns]
    df = df[cols].apply(pd.to_numeric, errors="coerce")
    sd = df[ITEMS].std(axis=1)
    audit["removed_low_sd"] = int((sd <= 0.3).sum())
    df = df[sd > 0.3].copy()
    if df[ITEMS].min().min() >= 1 and df[ITEMS].max().max() <= 4:   # 1-4 coding -> 0-3
        df[ITEMS] = df[ITEMS] - 1
        audit["shifted_1_4_to_0_3"] = True
    ok = df[ITEMS].apply(lambda r: ((r.isna()) | ((r >= 0) & (r <= 3))).all(), axis=1)
    audit["removed_out_of_range"] = int((~ok).sum())
    df = df[ok]
    audit["missing_before_impute"] = int(df.isna().sum().sum())
    df = df.fillna(df.median())
    before = len(df)
    df = df.drop_duplicates()
    audit["duplicates_removed"] = int(before - len(df))
    audit["cleaned_rows"] = int(len(df))
    return df.reset_index(drop=True), audit


def make_labels(df, target):
    score = df[[f"Q{i}A" for i in KEYS[target]]].sum(axis=1)
    lo, mid = CUTS[target]
    return np.where(score <= lo, 0, np.where(score <= mid, 1, 2))


def make_split(X, y):
    # 70 / 15 / 15, stratified, seed 42. Replace with your notebook's split if it differs.
    Xtr, Xtmp, ytr, ytmp = train_test_split(X, y, test_size=0.30, stratify=y, random_state=SEED)
    Xva, Xte, yva, yte = train_test_split(Xtmp, ytmp, test_size=0.50, stratify=ytmp, random_state=SEED)
    return Xtr, Xva, Xte, ytr, yva, yte


def ece(y, proba, bins=10):
    conf, pred = proba.max(1), proba.argmax(1)
    acc = (pred == y).astype(float)
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        m = (conf > lo) & (conf <= hi)
        if m.any():
            total += m.mean() * abs(acc[m].mean() - conf[m].mean())
    return total


def point_metrics(y, pred, proba):
    return {
        "accuracy": accuracy_score(y, pred),
        "weighted_f1": f1_score(y, pred, average="weighted"),
        "macro_f1": f1_score(y, pred, average="macro"),
        "weighted_ovr_auc": roc_auc_score(y, proba, multi_class="ovr", average="weighted"),
    }


def bootstrap_ci(y, pred, proba, B):
    rng = np.random.default_rng(SEED)
    n = len(y)
    out = {k: [] for k in ["accuracy", "weighted_f1", "macro_f1", "weighted_ovr_auc"]}
    for _ in range(B):
        i = rng.integers(0, n, n)
        yy = y[i]
        if len(np.unique(yy)) < 3:
            continue
        m = point_metrics(yy, pred[i], proba[i])
        for k, v in m.items():
            out[k].append(v)
    return {k: (np.percentile(v, 2.5), np.percentile(v, 97.5)) for k, v in out.items()}


def fit_predict(name, Xtr, ytr, Xte, cols):
    cat_idx = [cols.index(c) for c in CATEGORICAL_DEMOS if c in cols]
    if name == "xgb_smote":            # as reported in the paper (standard SMOTE, k=3)
        Xr, yr = SMOTE(k_neighbors=3, random_state=SEED).fit_resample(Xtr, ytr)
        mdl = XGBClassifier(**XGB_PARAMS).fit(Xr, yr)
    elif name == "xgb_smotenc":        # SMOTE that treats demographics as categorical
        Xr, yr = SMOTENC(categorical_features=cat_idx, k_neighbors=3, random_state=SEED).fit_resample(Xtr, ytr)
        mdl = XGBClassifier(**XGB_PARAMS).fit(Xr, yr)
    elif name in ("xgb_no_resampling", "xgb_no_sensitive"):
        mdl = XGBClassifier(**XGB_PARAMS).fit(Xtr, ytr)
    elif name == "logreg":
        mdl = make_pipeline(StandardScaler(), LogisticRegression(max_iter=3000, random_state=SEED)).fit(Xtr, ytr)
    elif name == "xgb_demographics_only":
        mdl = XGBClassifier(**XGB_PARAMS).fit(Xtr, ytr)
    return mdl.predict_proba(Xte)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data.csv")
    ap.add_argument("--out", default="paper_results_v2")
    ap.add_argument("--boot", type=int, default=2000)
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)

    df, audit = load_and_clean(a.data)
    print("Cleaning audit:", audit)
    summary, perclass, cms, sub = [], [], [], []

    for target in KEYS:
        y = make_labels(df, target)
        own = [f"Q{i}A" for i in KEYS[target]]
        feats37 = [c for c in ITEMS if c not in own] + DEMOS            # 28 items + 9 demographics
        feats34 = [c for c in feats37 if c not in SENSITIVE]
        assert len(feats37) == 37, len(feats37)
        audit[f"{target}_class_counts"] = {CLASSES[k]: int((y == k).sum()) for k in range(3)}

        idx = np.arange(len(df))
        itr, iva, ite, ytr, yva, yte = make_split(idx, y)
        audit["split_sizes"] = [len(itr), len(iva), len(ite)]
        print(target, "split", audit["split_sizes"])

        runs = [
            ("majority", None), ("xgb_demographics_only", DEMOS), ("logreg", feats37),
            ("xgb_smote", feats37), ("xgb_smotenc", feats37),
            ("xgb_no_resampling", feats37), ("xgb_no_sensitive", feats34),
        ]
        for name, cols in runs:
            if name == "majority":
                maj = np.bincount(ytr).argmax()
                proba = np.full((len(yte), 3), 0.4 / 3); proba[:, maj] += 0.6   # constant scores, rows sum to 1 -> AUC = 0.5
            else:
                Xtr, Xte = df.loc[itr, cols].values, df.loc[ite, cols].values
                proba = fit_predict(name, Xtr, ytr, Xte, cols)
            pred = proba.argmax(1)
            m = point_metrics(yte, pred, proba)
            ci = bootstrap_ci(yte, pred, proba, a.boot)
            row = {"target": target, "model": name, "n_features": 0 if cols is None else len(cols)}
            for k, v in m.items():
                row[k] = round(v, 4); row[k + "_ci_low"] = round(ci[k][0], 4); row[k + "_ci_high"] = round(ci[k][1], 4)
            row["ece_10bin"] = round(ece(yte, proba), 4)
            summary.append(row)
            p, r, f, s = precision_recall_fscore_support(yte, pred, labels=[0, 1, 2], zero_division=0)
            for k in range(3):
                perclass.append({"target": target, "model": name, "class": CLASSES[k],
                                 "precision": round(p[k], 4), "recall": round(r[k], 4),
                                 "f1": round(f[k], 4), "support": int(s[k])})
            cm = confusion_matrix(yte, pred, labels=[0, 1, 2])
            for k in range(3):
                cms.append({"target": target, "model": name, "true": CLASSES[k],
                            **{f"pred_{CLASSES[j]}": int(cm[k, j]) for j in range(3)}})
            pd.DataFrame({"row_id": ite, "y_true": yte, "y_pred": pred,
                          **{f"p_{CLASSES[k]}": proba[:, k] for k in range(3)}}
                         ).to_csv(f"{a.out}/predictions_{target}_{name}.csv", index=False)
            print(f"  {name:24s} acc={m['accuracy']:.4f} wF1={m['weighted_f1']:.4f} AUC={m['weighted_ovr_auc']:.4f}")
            if name == "xgb_smote":   # subgroup results for the model reported in the paper
                te = df.loc[ite].reset_index(drop=True)
                te["age_band"] = pd.cut(te["age"], [0, 17, 24, 34, 200], labels=["<=17", "18-24", "25-34", "35+"])
                for g in ["gender", "age_band"]:
                    for val, d in te.groupby(g, observed=True):
                        if len(d) >= 100:
                            ii = d.index.values
                            sub.append({"target": target, "group": g, "value": str(val), "n": len(d),
                                        "accuracy": round(accuracy_score(yte[ii], pred[ii]), 4),
                                        "weighted_f1": round(f1_score(yte[ii], pred[ii], average="weighted"), 4)})

    pd.DataFrame(summary).to_csv(f"{a.out}/summary_metrics.csv", index=False)
    pd.DataFrame(perclass).to_csv(f"{a.out}/per_class_metrics.csv", index=False)
    pd.DataFrame(cms).to_csv(f"{a.out}/confusion_matrices.csv", index=False)
    pd.DataFrame(sub).to_csv(f"{a.out}/subgroup_metrics.csv", index=False)
    with open(f"{a.out}/cleaning_audit.json", "w") as fh:
        json.dump(audit, fh, indent=2)
    print("Done. Files written to", a.out)


if __name__ == "__main__":
    main()
