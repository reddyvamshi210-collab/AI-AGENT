"""CareerForge Agent - FastAPI Backend"""
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import json
from typing import Optional

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"), override=False)

from agent.engine import CareerForgeAgent
from auth.google_auth import google_auth_router, get_google_credentials
from tools.resume_rag import ResumeRAG

app = FastAPI(
    title="CareerForge Agent API",
    version="1.0.0",
    description="AI-powered career agent with Gmail, Calendar, and Resume RAG tools",
)

cors_raw = os.getenv("BACKEND_CORS_ORIGINS", '["http://localhost:3000"]')
try:
    cors_origins = json.loads(cors_raw)
except (json.JSONDecodeError, TypeError):
    cors_origins = [o.strip() for o in cors_raw.split(",") if o.strip()]

# In production (Render), also allow the Vercel frontend domain
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url and frontend_url not in cors_origins:
    cors_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(google_auth_router, prefix="/auth", tags=["auth"])

# Global agent instance (per-session in production, simplified here)
resume_rag = ResumeRAG()


# ── Request / Response Models ────────────────────────────────────────────────

class AgentRequest(BaseModel):
    message: str
    google_token: Optional[str] = None


class AgentResponse(BaseModel):
    reply: str
    jobs: list = []
    suggestions: list = []
    actions: list = []


class HealthResponse(BaseModel):
    status: str
    version: str


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="healthy", version="1.0.0")


@app.post("/agent/run", response_model=AgentResponse)
async def run_agent(request: AgentRequest):
    """Main endpoint: runs the CareerForge agent loop and returns structured results."""
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    try:
        agent = CareerForgeAgent(
            openai_api_key=openai_key,
            google_token=request.google_token,
            resume_rag=resume_rag,
        )
        result = await agent.run(request.message)
        return AgentResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    """Upload a PDF resume to be indexed for RAG."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="File too large (max 10 MB)")

    try:
        doc_count = resume_rag.ingest_pdf(contents, file.filename)
        return {"message": f"Resume indexed successfully", "chunks": doc_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/resume/status")
async def resume_status():
    """Check if a resume has been indexed."""
    count = resume_rag.document_count()
    return {"indexed": count > 0, "chunks": count}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
