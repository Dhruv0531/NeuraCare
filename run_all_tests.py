"""
=============================================================================
NEURACARE MASTER TEST RUNNER - COMPLETE PLATFORM TEST SUITE
Executes ML, Backend API, Frontend Unit, Linting, and E2E Sanity Checks.
=============================================================================
"""

import sys
import subprocess
import time

def print_header(title):
    print("\n" + "=" * 76)
    print(f"  {title.upper()}")
    print("=" * 76)

def run_step(name, cmd, cwd=None):
    print(f"\n▶ Running: {name}")
    print(f"  Command: {cmd}")
    start = time.time()
    try:
        proc = subprocess.run(
            cmd,
            shell=True,
            cwd=cwd,
            capture_output=True,
            text=True
        )
        duration = time.time() - start
        if proc.returncode == 0:
            print(f"  ✔ [PASS] {name} completed in {duration:.2f}s")
            return True, proc.stdout
        else:
            print(f"  ✖ [FAIL] {name} exited with code {proc.returncode} in {duration:.2f}s")
            if proc.stdout:
                print("  --- STDOUT ---")
                print("\n".join("    " + line for line in proc.stdout.splitlines()[-15:]))
            if proc.stderr:
                print("  --- STDERR ---")
                print("\n".join("    " + line for line in proc.stderr.splitlines()[-15:]))
            return False, proc.stderr or proc.stdout
    except Exception as e:
        duration = time.time() - start
        print(f"  ✖ [ERROR] {name} encountered exception: {e}")
        return False, str(e)

def main():
    print_header("NeuraCare Complete Automated Test & Quality Verification")
    
    results = []

    # 1. Python ML & Adaptive Tests (pytest)
    ok, out = run_step(
        "Python ML & Stepped Adaptive Engine (pytest)",
        "python -m pytest src/backend/tests -q"
    )
    results.append(("Python ML & Stepped Adaptive Tests", ok))

    # 2. Node.js Backend API & RBAC Tests
    ok, out = run_step(
        "Node.js Backend API, RBAC & Security Suite",
        "npm test",
        cwd="backend"
    )
    results.append(("Node.js Backend API & RBAC Suite", ok))

    # 3. Next.js Frontend Unit Tests
    ok, out = run_step(
        "Next.js Frontend Unit Tests",
        "npm test",
        cwd="frontend"
    )
    results.append(("Next.js Frontend Unit Tests", ok))

    # 4. Next.js Frontend Linting
    ok, out = run_step(
        "Next.js Frontend Code Quality & ESLint",
        "npm run lint",
        cwd="frontend"
    )
    results.append(("Next.js Frontend Linting", ok))

    # 5. Master Sanity Verification Suite
    ok, out = run_step(
        "Master 4-Tier Sanity & Integration Verification",
        "python run_sanity_check.py"
    )
    results.append(("Master Sanity & Verification Suite", ok))

    # Consolidated Report
    print_header("Consolidated Platform Test Results")
    all_passed = True
    for name, status in results:
        badge = "✔ PASSED" if status else "✖ FAILED"
        if not status:
            all_passed = False
        print(f"  {badge:10} | {name}")
    
    print("-" * 76)
    if all_passed:
        print("  🎉 ALL TEST SUITES PASSED! Platform is 100% stable, secure & operational.")
        print("=" * 76)
        sys.exit(0)
    else:
        print("  ⚠ SOME TESTS FAILED. Please review the error outputs above.")
        print("=" * 76)
        sys.exit(1)

if __name__ == "__main__":
    main()

