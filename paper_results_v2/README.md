# paper_results_v2

Results cited in the NeuraCare manuscript (Section VI).

- run_37_feature_ablation.py was run on Google Colab (Python 3.13; pandas 2.2.3,
  NumPy 2.1.3, scikit-learn 1.6.1, XGBoost 3.4.1, imbalanced-learn 0.14.2).
  Output: summary_metrics.csv, per_class_metrics.csv, confusion_matrices.csv,
  subgroup_metrics.csv, cleaning_audit.json, predictions_<target>_<model>.csv.
- paired_bootstrap.py was run locally (Python 3.14.6, NumPy 2.3.3, pandas 2.3.3).
  Output: paired_bootstrap_results.csv.
- software_versions.txt and pip_freeze.txt describe the LOCAL environment
  (paired_bootstrap.py), not the Colab environment used for the ablation.
- data.csv is not included; obtain it from the Kaggle dataset cited in the paper.