import os
import sys
import platform
import subprocess
import time

def main():
    lines = []
    lines.append("=================================================================")
    lines.append("                 NEURACARE EXPERIMENT ENVIRONMENT                ")
    lines.append("=================================================================")
    lines.append(f"Date & Time: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"Operating System: {platform.system()} {platform.release()} ({platform.version()})")
    lines.append(f"Machine / Arch: {platform.machine()} / {platform.processor()}")
    lines.append(f"Python Version: {sys.version}")
    lines.append(f"Python Executable: {sys.executable}")
    lines.append("")
    
    # Git info
    try:
        git_hash = subprocess.check_output(["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
        git_branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
        lines.append(f"Git Commit Hash: {git_hash}")
        lines.append(f"Git Branch: {git_branch}")
    except Exception as e:
        lines.append(f"Git Info: Could not retrieve ({e})")
    lines.append("")
    
    # Packages
    lines.append("--- Installed Core Package Versions ---")
    pkgs = [
        "torch", "transformers", "datasets", "sklearn", "xgboost",
        "imblearn", "pandas", "numpy", "scipy", "shap", "fastapi"
    ]
    for pkg in pkgs:
        try:
            m = __import__(pkg)
            ver = getattr(m, "__version__", "installed")
            lines.append(f"  {pkg:15s}: {ver}")
        except ImportError:
            lines.append(f"  {pkg:15s}: NOT INSTALLED")
            
    content = "\n".join(lines) + "\n"
    out_path = r"E:\NeuraCare\paper_results\ENVIRONMENT.txt"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Wrote environment details to {out_path}")
    print(content)

if __name__ == "__main__":
    main()
