# CivicSetu — Deployment & Environment Setup Guide

This guide provides step-by-step instructions for running **CivicSetu** locally in development, deploying on **Render.com** (as currently hosted live), and deploying to **Google Cloud Run** using a production-ready single-container Docker architecture.

---

## 1. Local Development Setup

### Prerequisites
* **Python**: 3.12+ (or 3.14)
* **Node.js**: 18+ and `npm`
* **Google Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/)
* *(Optional)* **OpenRouter API Key**: For automatic AI fallback during peak load/quota exhaustion

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/uday0214/CivicSetu.git
cd CivicSetu

# 2. Configure environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY (and optionally OPENROUTER_API_KEY)

# 3. Backend virtual environment setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 4. Frontend setup and production build
cd frontend
npm install
npm run build
cd ..

# 5. Run test suite to verify full integration
pytest -q

# 6. Start the unified FastAPI + Vite static server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

Once running, navigate to `http://localhost:8000` in your web browser. The FastAPI backend automatically serves the compiled React 18 single-page application and all REST API endpoints under `/api/*`.

---

## 2. Environment Variables Specification

The backend reads configuration settings via Pydantic (`backend/config.py`).

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `GEMINI_API_KEY` | **Yes** | `""` | Primary Google AI Studio API key for Gemini 2.5 Flash. |
| `OPENROUTER_API_KEY` | No | `""` | Optional fallback key for OpenRouter when Gemini hits quota limits. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Pinned Gemini model identifier for multimodal triage and visual audits. |
| `OPENROUTER_MODEL` | No | `google/gemini-2.5-flash` | Fallback model identifier for OpenRouter client. |
| `DATA_STORE_MODE` | No | `memory` | Data persistence adapter: `memory` (local dev/ephemeral) or `sqlite`. |
| `PORT` | No | `8000` | HTTP port for the Uvicorn web server. |
| `GOOGLE_CLOUD_PROJECT` | No | `civicsetu-demo` | GCP project identifier (for Cloud Run / Firestore integration). |
| `GCS_BUCKET` | No | `civicsetu-media-us-central1` | Cloud Storage bucket name for persistent media uploads. |

---

## 3. Live Production Deployment: Render.com

CivicSetu is deployed as a single Python Web Service on [Render](https://render.com/).

### Deployment Parameters
* **Repository**: `https://github.com/uday0214/CivicSetu.git`
* **Branch**: `main`
* **Runtime**: `Python`
* **Build Command**: `./render_build.sh`
* **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT` (specified via [`Procfile`](file:///home/ud_1402/civicSetu/Procfile))
* **Environment Variables on Render**:
  * `PYTHON_VERSION`: `3.12.0` (or Node.js 18+ available in Render environment)
  * `GEMINI_API_KEY`: `<YOUR_GEMINI_KEY>`
  * `OPENROUTER_API_KEY`: `<YOUR_OPENROUTER_KEY>`
  * `DATA_STORE_MODE`: `memory`

### Automated Build Script (`render_build.sh`)
The build script performs three deterministic tasks during deployment:
1. Installs Python production requirements (`pip install --no-cache-dir -r requirements.txt`).
2. Installs frontend dependencies and compiles the React Vite bundle into `frontend/dist`.
3. Creates persistent upload and data directories (`backend/uploads`, `backend/data`).

---

## 4. Google Cloud Run Deployment (Single-Container Architecture)

For production enterprise scale, CivicSetu includes a multi-stage [`Dockerfile`](file:///home/ud_1402/civicSetu/Dockerfile) that packages both the React 18 Vite frontend and the FastAPI backend into an optimized Alpine/Debian container.

### Deploying to Cloud Run

```bash
# 1. Authenticate with Google Cloud CLI
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT_ID

# 2. Build production image using Cloud Build
gcloud builds submit --tag gcr.io/YOUR_GCP_PROJECT_ID/civicsetu:latest .

# 3. Deploy to Cloud Run (Eligible for Google Cloud Always-Free Tier)
gcloud run deploy civicsetu \
  --image gcr.io/YOUR_GCP_PROJECT_ID/civicsetu:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_KEY",DATA_STORE_MODE="memory"
```

### Resource Sizing & Free-Tier Suitability
* **CPU / Memory**: 1 vCPU, 512 MB – 1 GB RAM
* **Concurrency**: 80 requests per container instance
* **Scale-to-Zero**: Cloud Run scales down to zero idle instances when traffic is idle, incurring zero cost under standard usage limits.
