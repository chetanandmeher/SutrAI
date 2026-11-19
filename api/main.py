import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from agents.orchestrator import execute_plan


app = FastAPI(
    title="SutrAI API",
    description="LLM-powered e-commerce analytics using SQL and RAG",
    version="1.0.0",
)

# Local Vite origins are allowed by default. Set SUTRAI_CORS_ORIGINS to a
# comma-separated list of trusted origins when deploying the frontend elsewhere.
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "SUTRAI_CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "sutrai"}


@app.post("/ask")
def ask_question(request: AskRequest):
    try:
        result = execute_plan(request.question)
        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
