"""
NeuraCare - Research Paper Experiments: Task 6 (Empirical Fusion Behavior)
Evaluates late-fusion behavior on 500 random test rows across 9 clinical scenarios:
- 3 text conditions: Neutral, Strongly Distressed, Strongly Positive
- 3 ISI sleep conditions: 0 (Normal), 14 (Mild/Subthreshold), 28 (Severe Clinical Insomnia)

IMPORTANT: As specified in prompt rules, this measures the behavioral dynamics and
calibration sensitivity of the clinical fusion rule, NOT empirical classification accuracy,
as text samples do not have ground truth annotations in this tabular benchmark.
"""

import os
import sys
import json
import time
import numpy as np
import pandas as pd

# Add src/backend to sys.path so app modules import properly
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "backend"))
sys.path.insert(0, backend_dir)

from app.services.ml_service import ml_service, LEVEL_MAPPING
from app.services.emotion_service import emotion_service

class DummyExplainer:
    def __call__(self, df):
        raise RuntimeError("Bypass SHAP for batch evaluation")

def main():
    start_time = time.time()
    results_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(os.path.dirname(results_dir), "data.csv")
    
    print("=" * 70)
    print("TASK 6: EMPIRICAL FUSION BEHAVIOR EVALUATION (500 TEST ROWS)")
    print("=" * 70)
    
    # 1. Load and clean dataset identically to Tasks 1-4
    df_raw = pd.read_csv(data_path, sep="\t", on_bad_lines="skip", low_memory=False)
    q_cols = [f"Q{i}A" for i in range(1, 43)]
    demo_cols_all = ["age", "gender", "education", "urban", "religion", "orientation", "race", "married", "familysize"]
    demo_cols = [c for c in demo_cols_all if c in df_raw.columns]
    input_cols = q_cols + demo_cols
    
    df = df_raw[input_cols].copy()
    for col in input_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    stds = df[q_cols].std(axis=1)
    df = df[stds > 0.3].copy()
    df[q_cols] = df[q_cols] - 1
    df = df.drop_duplicates()
    
    # Define official DASS-42 cutoffs for stratification
    dep_items = [f"Q{i}A" for i in [3, 5, 10, 13, 16, 17, 21, 24, 26, 31, 34, 37, 38, 42]]
    df["score_dep"] = df[dep_items].sum(axis=1)
    df["label_B_dep"] = np.where(df["score_dep"] <= 13, 0, np.where(df["score_dep"] <= 20, 1, 2))
    
    # Stratified 70/15/15 split
    from sklearn.model_selection import train_test_split
    _, df_temp = train_test_split(df, test_size=0.30, random_state=42, stratify=df["label_B_dep"])
    _, df_test = train_test_split(df_temp, test_size=0.50, random_state=42, stratify=df_temp["label_B_dep"])
    
    # Sample 500 test rows with seed 42
    sample_df = df_test.sample(n=500, random_state=42).copy()
    print(f"Sampled {len(sample_df)} test rows for empirical fusion evaluation.")
    
    # 2. Text conditions
    text_scenarios = {
        "neutral": "I woke up at 7am, made a cup of tea, and went to work. It was an ordinary Tuesday with routine meetings.",
        "strongly_distressed": "I am feeling completely hopeless, miserable, terrified, and overwhelmed with unbearable sadness and panic.",
        "strongly_positive": "I feel wonderful, peaceful, and filled with immense gratitude, joy, and love for life."
    }
    
    # Extract emotion representations
    emotion_outputs = {}
    for t_name, t_text in text_scenarios.items():
        res = emotion_service.analyze_text(t_text)
        emotion_outputs[t_name] = res
        print(f"Emotion analysis for '{t_name}': {res.get('emotions')}")
        
    isi_values = [0, 14, 28]
    
    # Bypass TreeSHAP during batch evaluation
    old_explainers = ml_service.explainers
    ml_service.explainers = {scale: DummyExplainer() for scale in ["depression", "anxiety", "stress"]}
    
    print("Precomputing base tabular predictions for 500 test rows...")
    base_predictions = []
    for idx, row in sample_df.iterrows():
        row_dict = row[input_cols].to_dict()
        base_ml = ml_service.predict_all(row_dict)
        base_predictions.append(base_ml)
    print(f"Precomputed {len(base_predictions)} base predictions.")
    
    # Restore explainers
    ml_service.explainers = old_explainers
    
    # 3. Evaluate fusion across all 500 rows and 9 scenarios
    records = []
    
    for text_name, emotion_res in emotion_outputs.items():
        for isi_val in isi_values:
            sleep_res = {"score": float(isi_val)}
            
            p_high_shifts = {"depression": [], "anxiety": [], "stress": []}
            label_changes = {"depression": [], "anxiety": [], "stress": []}
            prob_sums_all = []
            
            for base_ml in base_predictions:
                fused = ml_service.fuse_predictions(base_ml, emotion_res, sleep_res)
                
                for cond in ["depression", "anxiety", "stress"]:
                    base_p_high = base_ml[cond]["probabilities"]["high"]
                    fused_p_high = fused[cond]["probabilities"]["high"]
                    shift_p_high = fused_p_high - base_p_high
                    
                    base_level = base_ml[cond]["level"]
                    fused_level = fused[cond]["level"]
                    changed = int(base_level != fused_level)
                    
                    # Probability sum check
                    p_sum = (
                        fused[cond]["probabilities"]["low"] +
                        fused[cond]["probabilities"]["moderate"] +
                        fused[cond]["probabilities"]["high"]
                    )
                    prob_sums_all.append(p_sum)
                    p_high_shifts[cond].append(shift_p_high)
                    label_changes[cond].append(changed)
                    
            # Compute scenario aggregate metrics
            row_summary = {
                "text_condition": text_name,
                "isi_score": isi_val,
                "dep_mean_delta_p_high": round(float(np.mean(p_high_shifts["depression"])), 4),
                "dep_pct_label_changed": round(float(np.mean(label_changes["depression"]) * 100), 2),
                "anx_mean_delta_p_high": round(float(np.mean(p_high_shifts["anxiety"])), 4),
                "anx_pct_label_changed": round(float(np.mean(label_changes["anxiety"]) * 100), 2),
                "str_mean_delta_p_high": round(float(np.mean(p_high_shifts["stress"])), 4),
                "str_pct_label_changed": round(float(np.mean(label_changes["stress"]) * 100), 2),
                "prob_sum_min": round(float(np.min(prob_sums_all)), 5),
                "prob_sum_max": round(float(np.max(prob_sums_all)), 5),
                "prob_sum_mean": round(float(np.mean(prob_sums_all)), 5),
            }
            records.append(row_summary)
            print(f"Scenario [{text_name:19s} | ISI={isi_val:2d}]: "
                  f"Dep dP(High)={row_summary['dep_mean_delta_p_high']:+.4f} (Chg={row_summary['dep_pct_label_changed']:5.1f}%) | "
                  f"Anx dP(High)={row_summary['anx_mean_delta_p_high']:+.4f} (Chg={row_summary['anx_pct_label_changed']:5.1f}%) | "
                  f"Str dP(High)={row_summary['str_mean_delta_p_high']:+.4f} (Chg={row_summary['str_pct_label_changed']:5.1f}%) | "
                  f"SumP in [{row_summary['prob_sum_min']}, {row_summary['prob_sum_max']}]")
            
    df_results = pd.DataFrame(records)
    csv_path = os.path.join(results_dir, "task6_fusion_empirical_results.csv")
    df_results.to_csv(csv_path, index=False)
    
    with open(os.path.join(results_dir, "task6_summary.json"), "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        
    print(f"\nTask 6 completed in {time.time() - start_time:.2f}s. Results saved to {csv_path}")

if __name__ == "__main__":
    main()
