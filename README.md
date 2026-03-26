# CareerForge Agent

AI-powered career management agent with job search, resume analysis, email automation, and calendar scheduling.

## Architecture

```
React (Next.js Frontend)
   ↓
FastAPI Backend
   ↓
Agent Engine (OpenAI Function Calling)
   ↓
TOOLS:
   - Gmail API (send/list emails)
   - Calendar API (create/list events)
   - Resume RAG (ChromaDB + PDF ingestion)
   - Job Search (pluggable API)
   ↓
OpenAI GPT-4o
```

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cd ..
python -m uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Configure

Copy `.env.example` to `.env` and fill in:

- `OPENAI_API_KEY` — your OpenAI API key
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

### 4. Open

- **Frontend**: http://localhost:3000
- **Backend API docs**: http://localhost:8000/docs

## Agent Flow

```
User clicks "Launch Agent"
   ↓
Frontend sends message to POST /agent/run
   ↓
Backend runs agent loop (OpenAI function calling)
   ↓
Agent decides which tools to invoke:
   - search_jobs → returns matching positions
   - analyze_resume → queries ChromaDB for resume context
   - send_email → sends via Gmail API
   - create_calendar_event → creates via Calendar API
   ↓
Returns structured JSON:
   { reply, jobs[], suggestions[], actions[] }
   ↓
Frontend renders results with cards and chat UI
```

## Project Structure

```
careerforge-agent/
├── frontend/                 # Next.js + React + Tailwind
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── dashboard/page.tsx # Agent chat dashboard
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── AgentCard.tsx     # Job result cards
│   │   ├── Button.tsx        # Reusable button
│   │   ├── Input.tsx         # Reusable input
│   │   └── StatusCard.tsx    # Status indicators
│   └── lib/
│       └── api.ts            # API client
├── backend/                  # FastAPI + Python
│   ├── main.py               # FastAPI app + routes
│   ├── agent/
│   │   └── engine.py         # Agent loop (OpenAI function calling)
│   ├── tools/
│   │   ├── gmail_tool.py     # Gmail API wrapper
│   │   ├── calendar_tool.py  # Calendar API wrapper
│   │   ├── resume_rag.py     # PDF ingestion + ChromaDB RAG
│   │   └── job_search.py     # Job search (mock/pluggable)
│   └── auth/
│       └── google_auth.py    # Google OAuth 2.0 flow
├── .env                      # Environment variables
├── docker-compose.yml        # Docker deployment
├── render.yaml               # Render.com blueprint
└── README.md
```

## Deployment: Vercel (Frontend) + Render (Backend)

### Step 1: Deploy Backend to Render

1. Push your repo to GitHub
2. Go to [render.com/dashboard](https://dashboard.render.com/) → **New** → **Web Service**
3. Connect your GitHub repo
4. Set:
   - **Root Directory**: `backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add **Environment Variables** in the Render dashboard:
   | Key | Value |
   |---|---|
   | `OPENAI_API_KEY` | `sk-...` |
   | `GOOGLE_CLIENT_ID` | from Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
   | `GOOGLE_REDIRECT_URI` | `https://YOUR-APP.onrender.com/auth/google/callback` |
   | `BACKEND_CORS_ORIGINS` | `["https://YOUR-APP.vercel.app"]` |
   | `FRONTEND_URL` | `https://YOUR-APP.vercel.app` |
6. Deploy — note the URL (e.g. `https://careerforge-api.onrender.com`)

### Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) → Import your GitHub repo
2. Set:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
3. Add **Environment Variable**:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://YOUR-APP.onrender.com` |
4. Deploy

### Step 3: Update Google OAuth Redirect

In Google Cloud Console → OAuth 2.0 → Authorized redirect URIs, add:
```
https://YOUR-APP.onrender.com/auth/google/callback
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable Gmail API and Calendar API
3. Create OAuth 2.0 credentials (Web application)
4. Add `http://localhost:8000/auth/google/callback` as redirect URI
5. Copy Client ID and Secret to `.env`
