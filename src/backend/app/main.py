from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import predict, history
# from neuracare.src.backend.app.routes import predict

app = FastAPI()

# Allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(history.router)

@app.get("/")
def root():
    return {"message": "NeuraCare API running"}