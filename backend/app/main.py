from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="Sansad AI API",
    description="Indian Parliament Debate Intelligence Chatbot",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    question: str
    house: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Sansad AI API",
        "model_connected": False,
    }

@app.post("/api/chat")
def chat(request: ChatRequest):
    question = request.question.strip()

    if not question:
        return {
            "answer": "Please enter a question about Indian Parliament debates.",
            "model": "demo",
            "verified_sources": [],
        }

    return {
        "answer": (
            "Sansad AI backend is ready to receive your question, "
            "but the trained Parliament model is not connected yet. "
            "Your question was: " + question
        ),
        "model": "demo",
        "verified_sources": [],
    }
