from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import predict, history, health

app = FastAPI(title="NeuraCare AI Platform API")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(predict.router)
app.include_router(history.router)

@app.get("/")
def root():
    return {
        "platform": "NeuraCare AI Mental Health Assessment API",
        "status": "online",
        "documentation": "/docs"
    }