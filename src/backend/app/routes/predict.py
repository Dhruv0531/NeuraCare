from fastapi import APIRouter
from app.services.scoring import calculate_scores
router = APIRouter()

@router.post("/predict")
def predict(data: dict):
    result = calculate_scores(data["answers"])
    return result