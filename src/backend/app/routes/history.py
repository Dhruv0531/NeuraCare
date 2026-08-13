from fastapi import APIRouter
from app.database import collection

router = APIRouter()

@router.get("/history")
def get_history(user_id: str = "demo_user"):
    """
    Retrieves user assessment history directly from MongoDB.
    """
    try:
        docs = list(collection.find({}, {"_id": 0}).sort("created_at", -1).limit(50))
        return docs
    except Exception as e:
        print(f"Error fetching history from MongoDB: {e}")
        return []

@router.get("/clinician/summary")
def get_clinician_summary():
    """
    Retrieves aggregate clinician metrics directly from MongoDB assessments collection.
    Returns total count, risk distribution, high-risk cases, and recent assessment activity.
    """
    try:
        docs = list(collection.find({}, {"_id": 0}).sort("created_at", -1))
        total_count = len(docs)

        risk_dist = {"Low": 0, "Moderate": 0, "High": 0}
        high_risk_cases = 0
        recent_activity = []

        for item in docs:
            preds = item.get("predictions", {})
            dep_level = preds.get("depression", {}).get("level", "Low")
            anx_level = preds.get("anxiety", {}).get("level", "Low")
            str_level = preds.get("stress", {}).get("level", "Low")

            # Determine overall risk as highest level among subscales
            levels = [dep_level, anx_level, str_level]
            overall_risk = "High" if "High" in levels else ("Moderate" if "Moderate" in levels else "Low")

            risk_dist[overall_risk] = risk_dist.get(overall_risk, 0) + 1

            if overall_risk == "High":
                high_risk_cases += 1

            emotions = preds.get("emotion", {}).get("emotions", [])
            top_emotion_labels = [e["label"] for e in emotions[:2]] if isinstance(emotions, list) else []

            recent_activity.append({
                "patient_id": item.get("user_id", "Patient"),
                "created_at": item.get("created_at"),
                "overall_risk": overall_risk,
                "depression_level": dep_level,
                "anxiety_level": anx_level,
                "stress_level": str_level,
                "top_emotions": top_emotion_labels
            })

        return {
            "total_patients": total_count,
            "high_risk_cases": high_risk_cases,
            "risk_distribution": risk_dist,
            "recent_activity": recent_activity[:15]
        }
    except Exception as e:
        print(f"Error computing clinician summary: {e}")
        return {
            "total_patients": 0,
            "high_risk_cases": 0,
            "risk_distribution": {"Low": 0, "Moderate": 0, "High": 0},
            "recent_activity": []
        }