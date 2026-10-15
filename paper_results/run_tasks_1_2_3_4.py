"""
NeuraCare - Research Paper Experiments: Tasks 1, 2, 3, 4
Dataset: Kaggle lucasgreenwell/depression-anxiety-stress-scales-responses (data.csv)
Reproducible with seed 42 everywhere.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    classification_report,
    confusion_matrix
)
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE
from imblearn.pipeline import Pipeline as ImbPipeline

def main():
    start_total_time = time.time()
    results_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(results_dir, exist_ok=True)
    
    # -------------------------------------------------------------
    # TASK 1: Data Counts & Cleaning
    # -------------------------------------------------------------
    print("=" * 70)
    print("TASK 1: DATA COUNTS & CLEANING")
    print("=" * 70)
    
    data_path = os.path.join(os.path.dirname(results_dir), "data.csv")
    if not os.path.exists(data_path):
        data_path = "e:\\NeuraCare\\data.csv"
    print(f"Reading dataset from: {data_path}")
    
    df_raw = pd.read_csv(data_path, sep="\t", on_bad_lines="skip", low_memory=False)
    rows_loaded = len(df_raw)
    print(f"Rows as loaded: {rows_loaded}")
    
    q_cols = [f"Q{i}A" for i in range(1, 43)]
    demo_cols_all = ["age", "gender", "education", "urban", "religion", "orientation", "race", "married", "familysize"]
    demo_cols = [c for c in demo_cols_all if c in df_raw.columns]
    input_cols = q_cols + demo_cols
    print(f"Inputs: {len(q_cols)} Q-items (Q1A..Q42A) + {len(demo_cols)} demographic columns ({demo_cols})")
    
    df = df_raw[input_cols].copy()
    
    # Step 1: Numeric conversion
    for col in input_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    
    missing_q_before = int(df[q_cols].isna().sum().sum())
    missing_demo_before = df[demo_cols].isna().sum().to_dict()
    total_missing_demo_before = int(df[demo_cols].isna().sum().sum())
    print(f"Missing values after numeric conversion: Q1A..Q42A = {missing_q_before}, Demographics = {total_missing_demo_before} ({missing_demo_before})")
    
    # Detect answer range before shift
    q_min_before = float(df[q_cols].min().min())
    q_max_before = float(df[q_cols].max().max())
    print(f"Answer range detected before shift: min = {q_min_before}, max = {q_max_before}")
    
    # Step 2: Remove rows whose std across the 42 answers is <= 0.3
    stds = df[q_cols].std(axis=1)
    mask_low_std = stds <= 0.3
    rows_removed_step2 = int(mask_low_std.sum())
    df = df[~mask_low_std].copy()
    print(f"Step 2: Removed rows with std <= 0.3: {rows_removed_step2} (Remaining: {len(df)})")
    
    # Step 3: If answers are 1-4 shift them to 0-3
    if q_min_before >= 1 and q_max_before <= 4:
        df[q_cols] = df[q_cols] - 1
        print("Step 3: Shifted answer range from 1-4 to 0-3 (subtracted 1)")
    else:
        print("Step 3: Answer range not 1-4; no shift applied")
    q_min_after = float(df[q_cols].min().min())
    q_max_after = float(df[q_cols].max().max())
    print(f"Answer range after shift: min = {q_min_after}, max = {q_max_after}")
    
    # Step 4: Keep rows where every answer is 0-3 or missing
    mask_valid_answers = df[q_cols].apply(lambda row: ((row >= 0) & (row <= 3) | row.isna()).all(), axis=1)
    rows_removed_step4 = int((~mask_valid_answers).sum())
    df = df[mask_valid_answers].copy()
    print(f"Step 4: Removed rows where answers outside [0, 3]: {rows_removed_step4} (Remaining: {len(df)})")
    
    # Step 5: Fill missing with column median
    missing_before_median = int(df.isna().sum().sum())
    for col in df.columns:
        df[col] = df[col].fillna(df[col].median())
    missing_after_median = int(df.isna().sum().sum())
    print(f"Step 5: Filled missing with column median (Filled: {missing_before_median}, Remaining missing: {missing_after_median})")
    
    # Step 6: Drop duplicates
    rows_before_dedup = len(df)
    df = df.drop_duplicates()
    rows_removed_step6 = rows_before_dedup - len(df)
    final_rows = len(df)
    print(f"Step 6: Removed duplicates: {rows_removed_step6} (Final rows: {final_rows})")
    
    # Subscale item mappings
    dep_items = [f"Q{i}A" for i in [3, 5, 10, 13, 16, 17, 21, 24, 26, 31, 34, 37, 38, 42]]
    anx_items = [f"Q{i}A" for i in [2, 4, 7, 9, 15, 19, 20, 23, 25, 28, 30, 36, 40, 41]]
    str_items = [f"Q{i}A" for i in [1, 6, 8, 11, 12, 14, 18, 22, 27, 29, 32, 33, 35, 39]]
    
    df["score_depression"] = df[dep_items].sum(axis=1)
    df["score_anxiety"] = df[anx_items].sum(axis=1)
    df["score_stress"] = df[str_items].sum(axis=1)
    
    task1_summary = {
        "rows_loaded": rows_loaded,
        "rows_removed_step2_low_std": rows_removed_step2,
        "rows_removed_step4_invalid_range": rows_removed_step4,
        "rows_removed_step6_duplicates": rows_removed_step6,
        "final_rows": final_rows,
        "answer_range_before_shift": {"min": q_min_before, "max": q_max_before},
        "answer_range_after_shift": {"min": q_min_after, "max": q_max_after},
        "missing_values_before_imputation": {
            "q_items_total": missing_q_before,
            "demographics_total": total_missing_demo_before,
            "demographics_by_col": {k: int(v) for k, v in missing_demo_before.items()}
        },
        "subscales": {}
    }
    
    print("\nSubscale Score Statistics (sum of 14 items, range [0, 42]):")
    for name, col in [("Depression", "score_depression"), ("Anxiety", "score_anxiety"), ("Stress", "score_stress")]:
        s = df[col]
        stats = {
            "min": float(s.min()),
            "max": float(s.max()),
            "mean": round(float(s.mean()), 4),
            "median": float(s.median()),
            "std": round(float(s.std()), 4)
        }
        task1_summary["subscales"][name] = stats
        print(f"  {name:11s}: min={stats['min']:.0f}, max={stats['max']:.0f}, mean={stats['mean']:.4f}, median={stats['median']:.1f}, std={stats['std']:.4f}")
        
    with open(os.path.join(results_dir, "task1_summary.json"), "w", encoding="utf-8") as f:
        json.dump(task1_summary, f, indent=2)
        
    # -------------------------------------------------------------
    # TASK 2: Two Label Sets & Class Distributions
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("TASK 2: TWO LABEL SETS & CLASS DISTRIBUTIONS")
    print("=" * 70)
    
    # Label Set A: Percentiles (40th and 75th)
    # Overall percentiles
    percentiles_overall = {}
    for name, col in [("Depression", "score_depression"), ("Anxiety", "score_anxiety"), ("Stress", "score_stress")]:
        p40 = float(df[col].quantile(0.40))
        p75 = float(df[col].quantile(0.75))
        percentiles_overall[name] = {"p40": p40, "p75": p75}
        print(f"Label Set A Overall {name}: 40th percentile = {p40}, 75th percentile = {p75}")
        df[f"label_A_{name}"] = np.where(df[col] <= p40, 0, np.where(df[col] <= p75, 1, 2))

    # Label Set B: Official DASS-42 Cutoffs
    # Depression: Normal 0-9, Mild 10-13, Moderate 14-20, Severe 21-27, Extremely severe 28+
    # Anxiety: Normal 0-7, Mild 8-9, Moderate 10-14, Severe 15-19, Extremely severe 20+
    # Stress: Normal 0-14, Mild 15-18, Moderate 19-25, Severe 26-33, Extremely severe 34+
    def cut_dass5(score, bins):
        return pd.cut(score, bins=[-np.inf] + bins + [np.inf], labels=["Normal", "Mild", "Moderate", "Severe", "Extremely Severe"])

    dass_bins = {
        "Depression": [9, 13, 20, 27],
        "Anxiety": [7, 9, 14, 19],
        "Stress": [14, 18, 25, 33]
    }
    
    group_map = {"Normal": 0, "Mild": 0, "Moderate": 1, "Severe": 2, "Extremely Severe": 2}
    
    dass5_counts = {}
    for name, col in [("Depression", "score_depression"), ("Anxiety", "score_anxiety"), ("Stress", "score_stress")]:
        c5 = cut_dass5(df[col], dass_bins[name])
        df[f"dass5_{name}"] = c5
        df[f"label_B_{name}"] = c5.map(group_map).astype(int)
        vc = c5.value_counts()[["Normal", "Mild", "Moderate", "Severe", "Extremely Severe"]]
        dass5_counts[name] = {k: int(v) for k, v in vc.items()}
        print(f"\nLabel Set B 5-level {name}:")
        for lvl in ["Normal", "Mild", "Moderate", "Severe", "Extremely Severe"]:
            cnt = vc[lvl]
            pct = cnt / len(df) * 100
            print(f"  {lvl:16s}: {cnt:5d} ({pct:6.2f}%)")

    # Splits (70/15/15 stratified, seed 42)
    # We will generate condition-specific splits and measure distributions
    task2_summary = {
        "percentiles_overall": percentiles_overall,
        "dass5_counts_overall": dass5_counts,
        "distributions": {}
    }
    
    X_features = df[input_cols]
    
    # Store split indices / datasets for Task 3 & 4
    # condition -> label_set -> {X_train, y_train, X_val, y_val, X_test, y_test}
    splits = {}
    
    for label_set in ["A", "B"]:
        splits[label_set] = {}
        task2_summary["distributions"][label_set] = {}
        for cond in ["Depression", "Anxiety", "Stress"]:
            target_col = f"label_{label_set}_{cond}"
            y = df[target_col].values
            
            # Stratified 70/15/15: test_size=0.30, then 0.50 of rest
            X_train, X_temp, y_train, y_temp = train_test_split(
                X_features, y, test_size=0.30, random_state=42, stratify=y
            )
            X_val, X_test, y_val, y_test = train_test_split(
                X_temp, y_temp, test_size=0.50, random_state=42, stratify=y_temp
            )
            
            splits[label_set][cond] = {
                "X_train": X_train, "y_train": y_train,
                "X_val": X_val, "y_val": y_val,
                "X_test": X_test, "y_test": y_test
            }
            
            # Record counts and percentages
            def get_counts_pct(arr):
                counts = pd.Series(arr).value_counts().sort_index().to_dict()
                total = len(arr)
                return {int(k): {"count": int(v), "pct": round(float(v / total * 100), 2)} for k, v in counts.items()}
            
            cond_dist = {
                "overall": get_counts_pct(y),
                "train": get_counts_pct(y_train),
                "val": get_counts_pct(y_val),
                "test": get_counts_pct(y_test),
                "sizes": {"train": len(y_train), "val": len(y_val), "test": len(y_test), "total": len(y)}
            }
            task2_summary["distributions"][label_set][cond] = cond_dist
            
    # Train-only percentiles variant requested by user in Task 2
    task2_summary["percentiles_train_only_variant"] = {}
    for cond in ["Depression", "Anxiety", "Stress"]:
        score_col = f"score_{cond.lower()}"
        # Compute on train split
        # We use the train indices from the split
        train_idx = splits["A"][cond]["X_train"].index
        p40_tr = float(df.loc[train_idx, score_col].quantile(0.40))
        p75_tr = float(df.loc[train_idx, score_col].quantile(0.75))
        task2_summary["percentiles_train_only_variant"][cond] = {"p40": p40_tr, "p75": p75_tr}
        print(f"Train-only percentiles variant {cond}: 40th = {p40_tr}, 75th = {p75_tr}")

    with open(os.path.join(results_dir, "task2_summary.json"), "w", encoding="utf-8") as f:
        json.dump(task2_summary, f, indent=2)

    # -------------------------------------------------------------
    # TASK 3: XGBoost Risk Models (Both Label Sets)
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("TASK 3: XGBOOST RISK MODELS (LABEL SETS A & B)")
    print("=" * 70)
    
    xgb_params = {
        "n_estimators": 400,
        "max_depth": 6,
        "learning_rate": 0.05,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "min_child_weight": 3,
        "gamma": 0.1,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "eval_metric": "mlogloss",
        "random_state": 42,
        "n_jobs": -1
    }
    
    task3_results = []
    
    for label_set in ["A", "B"]:
        for cond in ["Depression", "Anxiety", "Stress"]:
            print(f"\n--- Training XGBoost: Label Set {label_set} | Condition: {cond} ---")
            sp = splits[label_set][cond]
            X_train, y_train = sp["X_train"], sp["y_train"]
            X_val, y_val = sp["X_val"], sp["y_val"]
            X_test, y_test = sp["X_test"], sp["y_test"]
            
            # Step A: SMOTE on train only
            t_smote0 = time.time()
            smote = SMOTE(k_neighbors=3, random_state=42)
            X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
            t_smote = time.time() - t_smote0
            
            train_counts_before = pd.Series(y_train).value_counts().sort_index().to_dict()
            train_counts_after = pd.Series(y_train_res).value_counts().sort_index().to_dict()
            print(f"  SMOTE train counts: Before={train_counts_before} -> After={train_counts_after} (Time: {t_smote:.2f}s)")
            
            # Step B: Fit XGBoost
            t_fit0 = time.time()
            xgb = XGBClassifier(**xgb_params)
            xgb.fit(X_train_res, y_train_res, eval_set=[(X_val, y_val)], verbose=False)
            t_fit = time.time() - t_fit0
            print(f"  XGB fit time: {t_fit:.2f}s")
            
            # Step C: Evaluate on Validation
            y_val_pred = xgb.predict(X_val)
            val_acc = float(accuracy_score(y_val, y_val_pred))
            
            # Step D: Evaluate on TEST
            y_test_pred = xgb.predict(X_test)
            y_test_prob = xgb.predict_proba(X_test)
            
            test_acc = float(accuracy_score(y_test, y_test_pred))
            test_f1_weighted = float(f1_score(y_test, y_test_pred, average="weighted"))
            test_f1_macro = float(f1_score(y_test, y_test_pred, average="macro"))
            test_auc_weighted = float(roc_auc_score(y_test, y_test_prob, multi_class="ovr", average="weighted"))
            
            # Per-class metrics
            prec_per_class = precision_score(y_test, y_test_pred, average=None)
            rec_per_class = recall_score(y_test, y_test_pred, average=None)
            f1_per_class = f1_score(y_test, y_test_pred, average=None)
            support_per_class = pd.Series(y_test).value_counts().sort_index().values
            
            # Confusion matrix
            cm = confusion_matrix(y_test, y_test_pred)
            cm_df = pd.DataFrame(
                cm,
                index=["True_Low", "True_Moderate", "True_High"],
                columns=["Pred_Low", "Pred_Moderate", "Pred_High"]
            )
            cm_csv_path = os.path.join(results_dir, f"confusion_matrix_set{label_set}_{cond.lower()}.csv")
            cm_df.to_csv(cm_csv_path)
            
            # Plot and save PNG
            fig, ax = plt.subplots(figsize=(5, 4))
            sns.heatmap(cm_df, annot=True, fmt="d", cmap="Blues", cbar=False, ax=ax)
            ax.set_title(f"Confusion Matrix: {cond} (Set {label_set})")
            fig.tight_layout()
            cm_png_path = os.path.join(results_dir, f"confusion_matrix_set{label_set}_{cond.lower()}.png")
            fig.savefig(cm_png_path, dpi=200)
            plt.close(fig)
            
            # Step E: 5-Fold Stratified CV with SMOTE inside pipeline
            print(f"  Running 5-fold Stratified CV (SMOTE inside fold)...")
            t_cv0 = time.time()
            cv_pipe = ImbPipeline([
                ("smote", SMOTE(k_neighbors=3, random_state=42)),
                ("xgb", XGBClassifier(**xgb_params))
            ])
            cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
            cv_scores = cross_val_score(cv_pipe, X_train, y_train, cv=cv, scoring="f1_weighted", n_jobs=-1)
            cv_mean = float(np.mean(cv_scores))
            cv_std = float(np.std(cv_scores))
            t_cv = time.time() - t_cv0
            print(f"  CV 5-Fold Weighted F1: {cv_mean:.4f} +/- {cv_std:.4f} (Time: {t_cv:.2f}s)")
            
            row = {
                "label_set": label_set,
                "condition": cond,
                "val_accuracy": val_acc,
                "test_accuracy": test_acc,
                "test_weighted_f1": test_f1_weighted,
                "test_macro_f1": test_f1_macro,
                "test_weighted_ovr_auc": test_auc_weighted,
                "cv_5fold_weighted_f1_mean": cv_mean,
                "cv_5fold_weighted_f1_std": cv_std,
                "train_size_before_smote": len(y_train),
                "train_size_after_smote": len(y_train_res),
                "val_size": len(y_val),
                "test_size": len(y_test),
                "train_counts_after_smote": str(train_counts_after),
                "class0_precision": float(prec_per_class[0]),
                "class0_recall": float(rec_per_class[0]),
                "class0_f1": float(f1_per_class[0]),
                "class0_support": int(support_per_class[0]),
                "class1_precision": float(prec_per_class[1]),
                "class1_recall": float(rec_per_class[1]),
                "class1_f1": float(f1_per_class[1]),
                "class1_support": int(support_per_class[1]),
                "class2_precision": float(prec_per_class[2]),
                "class2_recall": float(rec_per_class[2]),
                "class2_f1": float(f1_per_class[2]),
                "class2_support": int(support_per_class[2]),
            }
            task3_results.append(row)
            print(f"  --> TEST Acc={test_acc:.4f}, Weighted F1={test_f1_weighted:.4f}, Macro F1={test_f1_macro:.4f}, AUC={test_auc_weighted:.4f}")

    df_task3 = pd.DataFrame(task3_results)
    df_task3.to_csv(os.path.join(results_dir, "model_results.csv"), index=False)
    print(f"\nSaved Task 3 model results to {os.path.join(results_dir, 'model_results.csv')}")

    # -------------------------------------------------------------
    # TASK 4: Baselines and Ablations
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("TASK 4: BASELINES AND ABLATIONS")
    print("=" * 70)
    print("Rule-based baseline scores 100% by definition because labels are derived directly from the exact item sum formula.")
    
    # We evaluate for both Label Set B (official clinical benchmark) and Label Set A
    subscale_items_map = {
        "Depression": dep_items,
        "Anxiety": anx_items,
        "Stress": str_items
    }
    
    task4_results = []
    
    for label_set in ["A", "B"]:
        for cond in ["Depression", "Anxiety", "Stress"]:
            print(f"\n--- Baselines & Ablations: Set {label_set} | {cond} ---")
            sp = splits[label_set][cond]
            X_train, y_train = sp["X_train"], sp["y_train"]
            X_val, y_val = sp["X_val"], sp["y_val"]
            X_test, y_test = sp["X_test"], sp["y_test"]
            
            own_items = subscale_items_map[cond]
            other_items = [c for c in input_cols if c not in own_items]
            
            # Configurations to evaluate:
            # (a) Majority-class baseline
            # (b) Logistic regression on same inputs
            # (c) XGBoost using demographics only
            # (d) XGBoost WITHOUT own 14 items (other 28 items + demographics)
            # (e) XGBoost with ONLY own 14 items
            
            configs = [
                ("majority_class", "DummyClassifier(most_frequent)", input_cols, "dummy"),
                ("logistic_regression", "LogisticRegression(max_iter=1000)", input_cols, "logreg"),
                ("xgb_demographics_only", "XGBoost (Demographics Only)", demo_cols, "xgb"),
                ("xgb_without_own_14", "XGBoost (Without Own 14 Items)", other_items, "xgb"),
                ("xgb_only_own_14", "XGBoost (Only Own 14 Items)", own_items, "xgb"),
            ]
            
            for config_name, desc, feature_subset, model_type in configs:
                X_tr_sub = X_train[feature_subset]
                X_val_sub = X_val[feature_subset]
                X_te_sub = X_test[feature_subset]
                
                # Apply SMOTE to the training subset
                smote = SMOTE(k_neighbors=3, random_state=42)
                X_tr_res, y_tr_res = smote.fit_resample(X_tr_sub, y_train)
                
                if model_type == "dummy":
                    clf = DummyClassifier(strategy="most_frequent")
                    clf.fit(X_tr_res, y_tr_res)
                    y_pred = clf.predict(X_te_sub)
                    y_prob = clf.predict_proba(X_te_sub)
                    auc = float(roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted")) if len(np.unique(y_test)) == y_prob.shape[1] else 0.5
                elif model_type == "logreg":
                    clf = LogisticRegression(max_iter=1000, random_state=42)
                    clf.fit(X_tr_res, y_tr_res)
                    y_pred = clf.predict(X_te_sub)
                    y_prob = clf.predict_proba(X_te_sub)
                    auc = float(roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted"))
                elif model_type == "xgb":
                    clf = XGBClassifier(**xgb_params)
                    clf.fit(X_tr_res, y_tr_res, eval_set=[(X_val_sub, y_val)], verbose=False)
                    y_pred = clf.predict(X_te_sub)
                    y_prob = clf.predict_proba(X_te_sub)
                    auc = float(roc_auc_score(y_test, y_prob, multi_class="ovr", average="weighted"))
                
                acc = float(accuracy_score(y_test, y_pred))
                f1_w = float(f1_score(y_test, y_pred, average="weighted"))
                f1_m = float(f1_score(y_test, y_pred, average="macro"))
                
                res = {
                    "label_set": label_set,
                    "condition": cond,
                    "model_variant": config_name,
                    "description": desc,
                    "num_features": len(feature_subset),
                    "test_accuracy": acc,
                    "test_weighted_f1": f1_w,
                    "test_macro_f1": f1_m,
                    "test_weighted_ovr_auc": auc
                }
                task4_results.append(res)
                print(f"  {config_name:24s} ({len(feature_subset):2d} feats): Acc={acc:.4f}, Weighted F1={f1_w:.4f}, Macro F1={f1_m:.4f}, AUC={auc:.4f}")

    df_task4 = pd.DataFrame(task4_results)
    df_task4.to_csv(os.path.join(results_dir, "task4_baselines_ablations.csv"), index=False)
    print(f"\nSaved Task 4 baselines & ablations to {os.path.join(results_dir, 'task4_baselines_ablations.csv')}")
    
    total_time = time.time() - start_total_time
    print(f"\nTasks 1, 2, 3, 4 completed successfully in {total_time:.2f} seconds.")

if __name__ == "__main__":
    main()
