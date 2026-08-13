import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

db_name = "neuracare"
if "/" in MONGO_URL.replace("://", ""):
    db_name = MONGO_URL.split("/")[-1].split("?")[0] or "neuracare"

try:
    client = MongoClient(
        MONGO_URL,
        tlsAllowInvalidCertificates=True,
        serverSelectionTimeoutMS=5000
    )
    db = client[db_name]
    collection = db["assessments"]
except Exception as e:
    print(f"PyMongo connection warning: {e}")
    client = None
    db = None
    collection = None