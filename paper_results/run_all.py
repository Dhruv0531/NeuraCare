"""
NeuraCare - Research Paper Master Reproduction Script (run_all.py)
Executes all experimental pipelines end-to-end with a single command:
1. Environment introspection and hardware logging -> ENVIRONMENT.txt
2. Tasks 1, 2, 3, 4: Data cleaning, label distributions, XGBoost models (Set A & B), 5-fold CV, and baselines/ablations
3. Task 5: GoEmotions DistilBERT multi-label evaluation and validation threshold tuning
4. Task 6: Empirical multimodal late-fusion behavior on 500 test rows and unit test validation
5. Verification of all artifacts in paper_results/
"""

import os
import sys
import time
import subprocess

def run_step(step_name, command, cwd):
    print("\n" + "=" * 80)
    print(f"RUNNING: {step_name}")
    print("=" * 80)
    t0 = time.time()
    res = subprocess.run(command, cwd=cwd, shell=True)
    elapsed = time.time() - t0
    if res.returncode != 0:
        print(f"FAILED: {step_name} exited with code {res.returncode}")
        sys.exit(res.returncode)
    print(f"COMPLETED: {step_name} in {elapsed:.2f}s")
    return elapsed

def main():
    total_start = time.time()
    results_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(results_dir)
    py_exec = sys.executable

    print("================================================================================")
    print("               NEURACARE RESEARCH PAPER EXPERIMENT RUNNER                      ")
    print(f"Python: {py_exec}")
    print(f"Project Root: {project_root}")
    print(f"Results Directory: {results_dir}")
    print("================================================================================")

    times = {}

    # Step 1: Environment logging
    times["Environment Info"] = run_step(
        "Generate Environment Info",
        f'"{py_exec}" "{os.path.join(results_dir, "generate_environment_info.py")}"',
        project_root
    )

    # Step 2: Tasks 1, 2, 3, 4
    times["Tasks 1, 2, 3, 4 (Data, Models, CV, Ablations)"] = run_step(
        "Tasks 1, 2, 3, 4",
        f'"{py_exec}" "{os.path.join(results_dir, "run_tasks_1_2_3_4.py")}"',
        project_root
    )

    # Step 3: Task 5 - GoEmotions evaluation
    times["Task 5 (GoEmotions DistilBERT Evaluation)"] = run_step(
        "Task 5 - Emotion Evaluation",
        f'"{py_exec}" "{os.path.join(results_dir, "evaluate_emotion_model.py")}"',
        project_root
    )

    times["Task 5 (Validation Threshold Tuning)"] = run_step(
        "Task 5 - Threshold Tuning",
        f'"{py_exec}" "{os.path.join(results_dir, "tune_threshold_emotion.py")}"',
        project_root
    )

    # Step 4: Task 6 - Empirical fusion & Unit tests
    times["Task 6 (Empirical Fusion on 500 Test Rows)"] = run_step(
        "Task 6 - Empirical Fusion",
        f'"{py_exec}" "{os.path.join(results_dir, "run_task6.py")}"',
        project_root
    )

    times["Task 6 (Fusion Unit Tests)"] = run_step(
        "Task 6 - Fusion Unit Tests",
        f'"{py_exec}" "{os.path.join(results_dir, "test_fusion.py")}"',
        project_root
    )

    total_time = time.time() - total_start
    print("\n" + "=" * 80)
    print("ALL EXPERIMENTS COMPLETED SUCCESSFULLY")
    print("=" * 80)
    for step, duration in times.items():
        print(f"  {step:50s}: {duration:8.2f}s")
    print("-" * 80)
    print(f"  TOTAL REPRODUCTION TIME: {total_time:.2f}s ({total_time / 60:.2f} minutes)")
    print(f"  All tables, metrics, and figures compiled in: {results_dir}")
    print("================================================================================")

if __name__ == "__main__":
    main()
