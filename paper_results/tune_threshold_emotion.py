import os
import json
import numpy as np
import torch
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.metrics import f1_score

def main():
    ds = load_dataset('google-research-datasets/go_emotions', 'simplified')
    emotion_names = ds['train'].features['labels'].feature.names
    num_labels = len(emotion_names)
    
    model_dir = r"E:\NeuraCare\emotion_model"
    tokenizer = AutoTokenizer.from_pretrained(model_dir)
    model = AutoModelForSequenceClassification.from_pretrained(model_dir)
    model.eval()
    
    val_ds = ds['validation']
    print(f"Running threshold search on validation ({len(val_ds)} examples)...")
    
    val_targets = []
    for ex in val_ds:
        vec = np.zeros(num_labels, dtype=int)
        for idx in ex['labels']:
            vec[idx] = 1
        val_targets.append(vec)
    val_targets = np.array(val_targets)
    
    batch_size = 32
    val_preds_raw = []
    with torch.no_grad():
        for i in range(0, len(val_ds), batch_size):
            texts = val_ds['text'][i:i+batch_size]
            encoded = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
            logits = model(**encoded).logits
            probs = torch.sigmoid(logits).cpu().numpy()
            val_preds_raw.append(probs)
    val_preds_raw = np.vstack(val_preds_raw)
    
    best_thresh = 0.5
    best_val_f1 = 0.0
    threshold_results = {}
    for thresh in np.arange(0.15, 0.65, 0.05):
        thresh = round(float(thresh), 2)
        preds = (val_preds_raw >= thresh).astype(int)
        f1 = f1_score(val_targets, preds, average="micro", zero_division=0)
        threshold_results[str(thresh)] = round(float(f1), 4)
        if f1 > best_val_f1:
            best_val_f1 = f1
            best_thresh = thresh
            
    print(f"Best threshold on validation: {best_thresh} with Micro F1 = {best_val_f1:.4f}")
    
    # Now evaluate this best threshold on the test set
    test_ds = ds['test']
    test_targets = []
    for ex in test_ds:
        vec = np.zeros(num_labels, dtype=int)
        for idx in ex['labels']:
            vec[idx] = 1
        test_targets.append(vec)
    test_targets = np.array(test_targets)
    
    test_preds_raw = []
    with torch.no_grad():
        for i in range(0, len(test_ds), batch_size):
            texts = test_ds['text'][i:i+batch_size]
            encoded = tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt")
            logits = model(**encoded).logits
            probs = torch.sigmoid(logits).cpu().numpy()
            test_preds_raw.append(probs)
    test_preds_raw = np.vstack(test_preds_raw)
    
    test_preds_best = (test_preds_raw >= best_thresh).astype(int)
    test_micro_f1_best = f1_score(test_targets, test_preds_best, average="micro", zero_division=0)
    test_macro_f1_best = f1_score(test_targets, test_preds_best, average="macro", zero_division=0)
    test_weighted_f1_best = f1_score(test_targets, test_preds_best, average="weighted", zero_division=0)
    
    print(f"Test Micro F1 at best threshold ({best_thresh}): {test_micro_f1_best:.4f}")
    print(f"Test Macro F1 at best threshold ({best_thresh}): {test_macro_f1_best:.4f}")
    print(f"Test Weighted F1 at best threshold ({best_thresh}): {test_weighted_f1_best:.4f}")
    
    # Update task5_summary.json
    sum_path = r"E:\NeuraCare\paper_results\task5_summary.json"
    with open(sum_path) as f:
        summary = json.load(f)
    summary["threshold_optimization"] = {
        "validation_grid": threshold_results,
        "best_threshold_on_val": best_thresh,
        "best_val_micro_f1": round(float(best_val_f1), 4),
        "test_metrics_at_best_threshold": {
            "micro_f1": round(float(test_micro_f1_best), 4),
            "macro_f1": round(float(test_macro_f1_best), 4),
            "weighted_f1": round(float(test_weighted_f1_best), 4)
        }
    }
    with open(sum_path, "w") as f:
        json.dump(summary, f, indent=2)
    print("Updated task5_summary.json with optimal threshold results!")

if __name__ == "__main__":
    main()
