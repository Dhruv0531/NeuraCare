from fastapi import APIRouter
from app.database import collection
from datetime import datetime, timezone

router = APIRouter()

@router.post("/save")
def save_result(data: dict):
    record = {
        "scores": data["scores"],
        # ✅ store timezone-aware UTC
        "created_at": datetime.now(timezone.utc)
    }
    collection.insert_one(record)
    return {"message": "Saved successfully"}


@router.get("/history")
def get_history():
    records = list(collection.find({}, {"_id": 0}))

    # ✅ convert datetime → ISO string (VERY IMPORTANT)
    for record in records:
        if "created_at" in record and isinstance(record["created_at"], datetime):
            record["created_at"] = record["created_at"].isoformat() + "Z"

    return records