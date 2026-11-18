
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from agents.orchestrator import execute_plan


app = FastAPI(
    title="SutrAI API",
    description="LLM-powered e-commerce analytics using SQL and RAG",
    version="1.0.0",
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
