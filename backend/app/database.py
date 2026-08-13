import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

MONGO_URL = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

# Determine database name from URL if specified
db_name = "neuracare"
if "/" in MONGO_URL.replace("://", ""):
    db_name = MONGO_URL.split("/")[-1].split("?")[0] or "neuracare"

client = MongoClient(MONGO_URL)
db = client[db_name]

collection = db["assessments"]