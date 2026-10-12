from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Optional, Any

from app.services.ml_service import ml_service
from app.services.sleep_service import calculate_sleep_score
from app.services.emotion_service import emotion_service
from app.services.llm_recommendations import generate_ai_recommendations
from app.database import collection

router = APIRouter()

class TextAnalysisRequest(BaseModel):
    text: str

@router.post("/predict")
def predict(payload: Dict[str, Any]):
    """
    Unified assessment prediction endpoint.
    Executes XGBoost ML predictions + SHAP explanations, ISI sleep scoring, GoEmotions text analysis,
    and OpenRouter LLM AI Wellness Recommendations.
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

    # 1. Run XGBoost ML baseline predictions + SHAP explanations
    base_ml_results = ml_service.predict_all(input_dict)

    # 2. Run ISI sleep calculation
    sleep_raw = payload.get("sleep_answers", raw_answers.get("sleep_answers", raw_answers.get("sleep", [])))
    sleep_result = calculate_sleep_score(sleep_raw)

    # 3. Run GoEmotions NLP text analysis if free-text provided
    text_input = payload.get("text", raw_answers.get("text", ""))
    emotion_result = emotion_service.analyze_text(text_input) if text_input else {
        "status": "not_available",
        "message": "No optional journal text provided"
    }

    # 4. Run Multimodal Fusion Engine: dynamically fuse questionnaire + text emotion + sleep
    fused_results = ml_service.fuse_predictions(
        ml_results=base_ml_results,
        emotion_result=emotion_result,
        sleep_result=sleep_result
    )

    # 5. Generate OpenRouter AI Personal Recommendations using calibrated levels
    top_emotion_labels = [e["label"] for e in emotion_result.get("emotions", [])] if isinstance(emotion_result.get("emotions"), list) else []
    recommendations = generate_ai_recommendations(
        depression_level=fused_results["depression"]["level"],
        anxiety_level=fused_results["anxiety"]["level"],
        stress_level=fused_results["stress"]["level"],
        sleep_category=sleep_result.get("category", ""),
        text_emotions=top_emotion_labels,
        user_text=text_input
    )

    # 6. Construct MongoDB record
    timestamp_str = datetime.now(timezone.utc).isoformat()
    record = {
        "user_id": payload.get("user_id", "demo_user"),
        "assessment_type": "DASS-42 / PHQ-GAD + ISI + GoEmotions Multimodal",
        "created_at": timestamp_str,
        "answers": input_dict,
        "sleep_answers": sleep_raw,
        "text": text_input,
        "overallScore": fused_results["overallScore"],
        "predictions": {
            "overallScore": fused_results["overallScore"],
            "depression": fused_results["depression"],
            "anxiety": fused_results["anxiety"],
            "stress": fused_results["stress"],
            "sleep": sleep_result,
            "emotion": emotion_result,
            "recommendations": recommendations,
            "fusion_metadata": fused_results.get("fusion_metadata")
        }
    }

    record_id = None
    try:
        if collection is not None:
            doc = collection.insert_one(record)
            record_id = str(doc.inserted_id)
    except Exception as e:
        print(f"MongoDB storage warning: {e}")

    return {
        "record_id": record_id,
        "overallScore": fused_results["overallScore"],
        "overall_score": fused_results["overall_score"],
        "depression": fused_results["depression"],
        "anxiety": fused_results["anxiety"],
        "stress": fused_results["stress"],
        "sleep": sleep_result,
        "emotion": emotion_result,
        "recommendations": recommendations,
        "fusion_metadata": fused_results.get("fusion_metadata")
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