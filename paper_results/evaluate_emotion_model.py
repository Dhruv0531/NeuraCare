import os
import time
import json
import numpy as np
import pandas as pd
import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import f1_score, precision_score, recall_score, accuracy_score

def main():
    print("Loading GoEmotions dataset...")
    ds = load_dataset('google-research-datasets/go_emotions', 'simplified')
    print("Split sizes:", {k: len(ds[k]) for k in ds.keys()})
    
    emotion_names = ds['train'].features['labels'].feature.names
    num_labels = len(emotion_names)
    print(f"Num emotion labels: {num_labels}")
    
    model_dir = r"E:\NeuraCare\emotion_model"
    with open(os.path.join(model_dir, "config.json")) as f:
        cfg = json.load(f)
    
    id2label = cfg.get("id2label", {})
    missing_names = all(v.startswith("LABEL_") for v in id2label.values())
    print(f"Are human-readable emotion names missing from id2label? {missing_names}")
    
    print(f"Loading model from {model_dir}...")
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    
    test_ds = ds['test']
    print(f"Evaluating on TEST split ({len(test_ds)} examples)...")
    
    batch_size = 32
    all_preds_raw = []
    all_targets = []
    
    # Pre-build ground truth binary matrix
    for example in test_ds:
        target_vec = np.zeros(num_labels, dtype=int)
        for lbl_idx in example['labels']:
            target_vec[lbl_idx] = 1
        all_targets.append(target_vec)
    all_targets = np.array(all_targets)
    
    start_time = time.time()
    with torch.no_grad():
        for i in range(0, len(test_ds), batch_size):
            batch_texts = test_ds['text'][i:i+batch_size]
            encoded = tokenizer(batch_texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
            logits = model(**encoded).logits
            probs = torch.sigmoid(logits).cpu().numpy()
            all_preds_raw.append(probs)
            if (i // batch_size) % 25 == 0:
                elapsed = time.time() - start_time
                print(f"Processed {i}/{len(test_ds)} samples in {elapsed:.1f}s...")
                
    all_preds_raw = np.vstack(all_preds_raw)
    
    # Threshold 0.5
    preds_05 = (all_preds_raw >= 0.5).astype(int)
    
    micro_f1 = f1_score(all_targets, preds_05, average="micro", zero_division=0)
    macro_f1 = f1_score(all_targets, preds_05, average="macro", zero_division=0)
    weighted_f1 = f1_score(all_targets, preds_05, average="weighted", zero_division=0)
    micro_p = precision_score(all_targets, preds_05, average="micro", zero_division=0)
    micro_r = recall_score(all_targets, preds_05, average="micro", zero_division=0)
    exact_acc = accuracy_score(all_targets, preds_05)
    
    print("\n--- RESULTS AT THRESHOLD 0.5 ---")
    print(f"Micro F1: {micro_f1:.4f}")
    print(f"Macro F1: {macro_f1:.4f}")
    print(f"Weighted F1: {weighted_f1:.4f}")
    print(f"Micro Precision: {micro_p:.4f}")
    print(f"Micro Recall: {micro_r:.4f}")
    print(f"Exact-Match (Subset) Accuracy: {exact_acc:.4f}")
    
    # Per-emotion table
    per_emotion_records = []
    for idx, name in enumerate(emotion_names):
        p = precision_score(all_targets[:, idx], preds_05[:, idx], zero_division=0)
        r = recall_score(all_targets[:, idx], preds_05[:, idx], zero_division=0)
        f1 = f1_score(all_targets[:, idx], preds_05[:, idx], zero_division=0)
        supp = int(np.sum(all_targets[:, idx]))
        per_emotion_records.append({
            "emotion": name,
            "precision": round(float(p), 4),
            "recall": round(float(r), 4),
            "f1_score": round(float(f1), 4),
            "support": supp
        })
        
    df_per_emotion = pd.DataFrame(per_emotion_records)
    out_csv = r"E:\NeuraCare\paper_results\go_emotions_test_results.csv"
    df_per_emotion.to_csv(out_csv, index=False)
    print(f"Saved per-emotion results to {out_csv}")
    
    # Save summary json
    summary = {
        "split_sizes": {k: len(ds[k]) for k in ds.keys()},
        "missing_names_in_config": missing_names,
        "metrics_threshold_0_5": {
            "micro_f1": round(float(micro_f1), 4),
            "macro_f1": round(float(macro_f1), 4),
            "weighted_f1": round(float(weighted_f1), 4),
            "micro_precision": round(float(micro_p), 4),
            "micro_recall": round(float(micro_r), 4),
            "exact_match_accuracy": round(float(exact_acc), 4)
        }
    }
    with open(r"E:\NeuraCare\paper_results\task5_summary.json", "w") as f:
        json.dump(summary, f, indent=2)
    print("Done Task 5 evaluation!")

if __name__ == "__main__":
    main()
