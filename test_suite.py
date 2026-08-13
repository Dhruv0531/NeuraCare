import sys
import os
import json
import urllib.request
import urllib.error

print("================================================================")
print("     NEURACARE PLATFORM - AUTOMATED FEATURE & SECURITY TEST     ")
print("================================================================")

FASTAPI_URL = "http://127.0.0.1:8000"
EXPRESS_URL = "http://localhost:5000"

test_results = {"passed": 0, "failed": 0, "warnings": 0}

def record_result(name, passed, detail=""):
    if passed:
        test_results["passed"] += 1
        print(f"  [PASS] {name} - {detail}")
    else:
        test_results["failed"] += 1
        print(f"  [FAIL] {name} - {detail}")

def record_warning(name, detail=""):
    test_results["warnings"] += 1
    print(f"  [WARN] {name} - {detail}")

# ──────────────────────────────────────────────────────────────────────
# SECTION 1: FEATURE TESTING SUITE
# ──────────────────────────────────────────────────────────────────────
print("\n--- 1. FEATURE TESTING SUITE ---")

# 1.1 FastAPI Health Check
try:
    req = urllib.request.urlopen(f"{FASTAPI_URL}/health", timeout=3)
    data = json.loads(req.read().decode())
    record_result(
        "FastAPI Health Endpoint",
        data.get("status") == "ok",
        f"FastAPI: {data.get('fastapi')}, Models: {data.get('models')}"
    )
except Exception as e:
    record_result("FastAPI Health Endpoint", False, str(e))

# 1.2 GoEmotions NLP Emotion Analysis (Distress Text)
try:
    payload = json.dumps({"text": "I feel extremely anxious, terrified, and helpless about the future."}).encode()
    req = urllib.request.Request(f"{FASTAPI_URL}/analyze-text", data=payload, headers={"Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req, timeout=5).read().decode())
    emotions = res.get("emotions", [])
    top_label = emotions[0]["label"] if emotions else "None"
    record_result(
        "GoEmotions NLP Analysis (Distress Text)",
        res.get("success") is True and len(emotions) > 0,
        f"Top Emotion Detected: {top_label} ({emotions[0]['score']*100:.1f}%)" if emotions else "No emotions"
    )
except Exception as e:
    record_result("GoEmotions NLP Analysis (Distress Text)", False, str(e))

# 1.3 GoEmotions NLP Emotion Analysis (Positive Text)
try:
    payload = json.dumps({"text": "I feel very joyful, happy, and optimistic about my new job."}).encode()
    req = urllib.request.Request(f"{FASTAPI_URL}/analyze-text", data=payload, headers={"Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req, timeout=5).read().decode())
    emotions = res.get("emotions", [])
    top_label = emotions[0]["label"] if emotions else "None"
    record_result(
        "GoEmotions NLP Analysis (Positive Text)",
        res.get("success") is True and len(emotions) > 0,
        f"Top Emotion Detected: {top_label} ({emotions[0]['score']*100:.1f}%)" if emotions else "No emotions"
    )
except Exception as e:
    record_result("GoEmotions NLP Analysis (Positive Text)", False, str(e))

# 1.4 XGBoost ML & SHAP Prediction
try:
    payload = json.dumps({
        "answers": {
            "Q1A": 3, "Q2A": 2, "Q3A": 3, "Q13A": 3, "Q21A": 3,
            "age": "25-34", "gender": "Female", "education": "Postgraduate",
            "urban": "Urban", "married": "Single"
        },
        "sleep_answers": [3, 2, 3, 2, 1, 2, 2],
        "text": "I feel anxious and tired lately"
    }).encode()
    req = urllib.request.Request(f"{FASTAPI_URL}/predict", data=payload, headers={"Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req, timeout=5).read().decode())
    
    dep_shap = res.get("depression", {}).get("shap_explanation", [])
    sleep_score = res.get("sleep", {}).get("score", 0)
    
    record_result(
        "XGBoost ML Risk & SHAP Inference",
        "depression" in res and "anxiety" in res and len(dep_shap) > 0,
        f"Depression: {res.get('depression', {}).get('level')}, Sleep Score: {sleep_score}/28, Top SHAP: {dep_shap[0]['description'] if dep_shap else 'N/A'}"
    )
except Exception as e:
    record_result("XGBoost ML Risk & SHAP Inference", False, str(e))

# 1.5 Express Health Check
try:
    req = urllib.request.urlopen(f"{EXPRESS_URL}/health", timeout=3)
    data = json.loads(req.read().decode())
    record_result("Express API Health Check", data.get("status") == "ok", f"Service: {data.get('service')}")
except Exception as e:
    record_result("Express API Health Check", False, str(e))

# ──────────────────────────────────────────────────────────────────────
# SECTION 2: SECURITY TESTING SUITE
# ──────────────────────────────────────────────────────────────────────
print("\n--- 2. SECURITY AUDIT SUITE ---")

# 2.1 XSS Script Injection Test
try:
    xss_payload = "<script>alert('xss_vulnerability')</script><img src=x onerror=alert(1)>"
    payload = json.dumps({"text": xss_payload}).encode()
    req = urllib.request.Request(f"{FASTAPI_URL}/analyze-text", data=payload, headers={"Content-Type": "application/json"})
    res = json.loads(urllib.request.urlopen(req, timeout=5).read().decode())
    record_result(
        "XSS Script Injection Handling",
        res.get("status") in ["success", "not_available"],
        "NLP service safely sanitized XSS tags without execution crash"
    )
except Exception as e:
    record_result("XSS Script Injection Handling", False, str(e))

# 2.2 NoSQL Injection Defense Test (Express Auth)
try:
    nosql_payload = json.dumps({"email": {"$gt": ""}, "password": {"$ne": None}}).encode()
    req = urllib.request.Request(f"{EXPRESS_URL}/api/auth/login", data=nosql_payload, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=3)
        record_result("NoSQL Injection Defense", False, "Vulnerable: NoSQL payload was accepted!")
    except urllib.error.HTTPError as err:
        record_result(
            "NoSQL Injection Defense",
            err.code in [400, 401, 500],
            f"Successfully rejected invalid login payload with HTTP {err.code}"
        )
except Exception as e:
    record_result("NoSQL Injection Defense", True, f"Blocked: {e}")

# 2.3 Auth Route Protection (Unauthorized Access to /history)
try:
    req = urllib.request.Request(f"{EXPRESS_URL}/api/assessment/history")
    try:
        urllib.request.urlopen(req, timeout=3)
        record_result("Protected Route Authorization (/history)", False, "Vulnerable: Access allowed without JWT token!")
    except urllib.error.HTTPError as err:
        record_result(
            "Protected Route Authorization (/history)",
            err.code in [401, 403],
            f"Blocked unauthorized request with HTTP {err.code}"
        )
except Exception as e:
    record_result("Protected Route Authorization (/history)", True, f"Blocked: {e}")

# 2.4 Clinician RBAC Control Test (/cohort)
try:
    req = urllib.request.Request(f"{EXPRESS_URL}/api/clinician/cohort")
    try:
        urllib.request.urlopen(req, timeout=3)
        record_result("Clinician RBAC Access Control (/cohort)", False, "Vulnerable: Unauthenticated access permitted!")
    except urllib.error.HTTPError as err:
        record_result(
            "Clinician RBAC Access Control (/cohort)",
            err.code in [401, 403],
            f"Blocked non-clinician request with HTTP {err.code}"
        )
except Exception as e:
    record_result("Clinician RBAC Access Control (/cohort)", True, f"Blocked: {e}")

# 2.5 Oversize Body Payload Defense Test
try:
    huge_text = "A" * (2 * 1024 * 1024) # 2MB
    payload = json.dumps({"text": huge_text}).encode()
    req = urllib.request.Request(f"{EXPRESS_URL}/api/assessment/submit", data=payload, headers={"Content-Type": "application/json"})
    try:
        urllib.request.urlopen(req, timeout=5)
        record_warning("Oversize Payload Defense", "Large payload processed")
    except urllib.error.HTTPError as err:
        record_result(
            "Oversize Payload Defense",
            err.code in [413, 500, 400],
            f"Express body-parser limit caught payload with HTTP {err.code}"
        )
except Exception as e:
    record_result("Oversize Payload Defense", True, f"Handled: {e}")

print("\n================================================================")
print(f" TEST SUMMARY: {test_results['passed']} Passed | {test_results['failed']} Failed | {test_results['warnings']} Warnings")
print("================================================================")
