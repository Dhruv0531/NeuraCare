from fastapi import APIRouter
from app.services.ml_service import ml_service
from app.services.emotion_service import emotion_service
from app.database import db

router = APIRouter()

@router.get("/health")
def health_check():
    """
    Health check endpoint reporting operational status of FastAPI, XGBoost ML models, GoEmotions NLP model, and MongoDB connectivity.
    """
    mongo_status = False
    try:
        db.command("ping")
        mongo_status = True
    except Exception as e:
        print(f"Health check MongoDB ping error: {e}")
        mongo_status = False

    xgboost_loaded = len(ml_service.models) == 3
    emotion_loaded = emotion_service.is_available

    return {
        "status": "ok" if (xgboost_loaded and mongo_status) else "degraded",
        "fastapi": True,
        "models": {
            "xgboost_risk_models": xgboost_loaded,
            "goemotions_nlp_model": emotion_loaded
        },
        "database": {
            "mongodb_connected": mongo_status
        }
    }
