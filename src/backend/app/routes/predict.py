from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Optional, Any

from app.services.ml_service import ml_service
from app.services.sleep_service import calculate_sleep_score
from app.services.emotion_service import emotion_service
from app.database import collection

router = APIRouter()

class TextAnalysisRequest(BaseModel):
    text: str

@router.post("/predict")
def predict(payload: Dict[str, Any]):
    """
    Unified assessment prediction endpoint.
    Executes XGBoost ML predictions + SHAP explanations, ISI sleep scoring, and GoEmotions text analysis.
    Stores the assessment document into MongoDB Atlas.
    """
    input_dict = {}
    raw_answers = payload.get("answers", payload)
    if isinstance(raw_answers, dict):
        dass = raw_answers.get("dass_answers", raw_answers)
        demos = raw_answers.get("demographics", raw_answers)
        if isinstance(dass, dict):
            input_dict.update(dass)
        if isinstance(demos, dict):
            input_dict.update(demos)

    # 1. Run XGBoost ML predictions + SHAP explanations
    ml_results = ml_service.predict_all(input_dict)

    # 2. Run ISI sleep calculation
    sleep_raw = payload.get("sleep_answers", raw_answers.get("sleep_answers", raw_answers.get("sleep", [])))
    sleep_result = calculate_sleep_score(sleep_raw)

    # 3. Run GoEmotions NLP text analysis if free-text provided
    text_input = payload.get("text", raw_answers.get("text", ""))
    emotion_result = emotion_service.analyze_text(text_input) if text_input else {
        "status": "not_available",
        "message": "No optional journal text provided"
    }

    # 4. Construct MongoDB record
    timestamp_str = datetime.now(timezone.utc).isoformat()
    record = {
        "user_id": payload.get("user_id", "demo_user"),
        "assessment_type": "DASS-42 + ISI",
        "created_at": timestamp_str,
        "answers": input_dict,
        "sleep_answers": sleep_raw,
        "text": text_input,
        "predictions": {
            "depression": ml_results["depression"],
            "anxiety": ml_results["anxiety"],
            "stress": ml_results["stress"],
            "sleep": sleep_result,
            "emotion": emotion_result
        }
    }

    record_id = None
    try:
        doc = collection.insert_one(record)
        record_id = str(doc.inserted_id)
    except Exception as e:
        print(f"MongoDB storage warning: {e}")

    return {
        "record_id": record_id,
        "depression": ml_results["depression"],
        "anxiety": ml_results["anxiety"],
        "stress": ml_results["stress"],
        "sleep": sleep_result,
        "emotion": emotion_result
    }

@router.post("/analyze-text")
def analyze_text(request: TextAnalysisRequest):
    """
    Free-text emotion analysis endpoint.
    """
    res = emotion_service.analyze_text(request.text)
    return {
        "success": res.get("status") == "success",
        "status": res.get("status"),
        "emotions": res.get("emotions", []),
        "message": res.get("message")
    }