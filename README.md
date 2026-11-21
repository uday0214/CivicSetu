# CivicSetu (सिविक सेतु) — CivicResolve for Indian Cities

> **AI-Powered Multimodal Civic Issue Reporting, Spatial Deduplication & Municipal Governance Command Platform**  
> Built for the PromptWars Hackathon with Google Gemini 2.5 Flash.

---

## 🏛️ Platform Highlights

1. **Multilingual "Snap & Speak" Citizen Intake**:
   - Accepts photos, voice notes (Kannada, Hindi, Hinglish, English), and raw text.
   - Extracts GPS from camera EXIF *before* browser compression.
   - Unified Gemini 2.5 single-call structured triage extracting severity, category, responsible agency, and vernacular reassuring feedback.
   - Intelligent sanity gate rejecting non-civic media (selfies, memes, blur).

2. **Spatial-Semantic Deduplication**:
   - Clusters nearby reports (within 50m) matching the same civic failure.
   - Merges redundant tickets into a single canonical Master Incident.
   - Escalates community impact score and priority instead of spamming engineers.

3. **Closed-Loop AI Resolution Audit**:
   - Contractors submit repair proof photo.
   - Gemini compares Before vs After imagery across geometry, landmarks, and materials.
   - Prevents contractor fraud: authentic repairs trigger `VERIFIED_FIXED` (96%+ confidence); bogus or unrelated photos trigger `REJECTED_MISMATCH`.
   - Starts strict 48-hour citizen review window.

4. **Municipal Admin Command Center**:
   - Real-time operational KPI strip (P0 Critical, SLA Overdue, Level 3 Escalations).
   - Split-screen Leaflet GIS map with custom SVG priority pins and density hotspots.
   - Filterable triage queue by Ward, Priority, and Indian Agency (`BBMP`, `BESCOM`, `BWSSB`, `PWD`, `NHAI`).
   - One-click Gemini AI Field Work Order Generator.
   - Systemic Infrastructure Pattern Synthesis.

---

## 🚀 How to Run the Website Locally

You have **three simple ways** to run CivicSetu locally.

### Prerequisites
- Python 3.11+ or 3.12+
- Node.js 18+ (with npm)
- *(Optional)* Gemini API Key (`GEMINI_API_KEY`) from [Google AI Studio](https://aistudio.google.com).  
  *Note:* The system includes a built-in demo circuit breaker fallback that runs flawlessly even without an API key!

---

### Option 1: Fast Local Development (Recommended)

Run backend and frontend in separate terminals:

#### Terminal 1 — Backend (FastAPI)
```bash
# 1. Activate python virtual environment
source .venv/bin/activate

# 2. (Optional) Set your Gemini API key
export GEMINI_API_KEY="your-api-key-here"

# 3. Seed realistic Bengaluru BBMP demo data (16 rich cases)
python -m backend.seed

# 4. Start FastAPI server with live reload on port 8000
uvicorn backend.main:app --port 8000 --reload
```
*Backend runs at:* `http://localhost:8000` (API Docs at `http://localhost:8000/docs`)

#### Terminal 2 — Frontend (Vite + React)
```bash
# 1. Enter frontend folder and start dev server
cd frontend
npm run dev
```
*Frontend runs at:* `http://localhost:5173` (with instant HMR)

---

### Option 2: Unified Single-Process Mode

Build the frontend once and let FastAPI serve both the API and the static React SPA on port 8000:

```bash
# 1. Build frontend distribution
cd frontend && npm run build && cd ..

# 2. Run backend
source .venv/bin/activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Open **`http://localhost:8000`** in your browser.

---

### Option 3: Production Docker Container (Cloud Run Ready)

Build and run the turnkey multi-stage container:

```bash
# 1. Build Docker image
docker build -t civicsetu .

# 2. Run container
docker run -p 8000:8000 -e GEMINI_API_KEY="your-api-key" civicsetu
```
Open **`http://localhost:8000`**.

---

## 🧪 Verification & Test Suite

Run the full automated test suite (38 unit & integration tests):

```bash
# Run all pytest suites
.venv/bin/pytest -v

# Run frontend TypeScript & production build check
cd frontend && npm run build
```

---

## 📍 Interactive Demo Walkthrough

1. **Switch Roles**: Use the top-right toggle in the navigation bar to switch between **Citizen View** and **Admin View**.
2. **Citizen Flow**:
   - Tab 1: **Report**: Submit voice ("Indiranagar 100 feet road pe pothole hai"), photo, or text.
   - Tab 2: **Nearby Feed**: View localized map pins and upvote existing issues.
   - Tab 3: **My Reports**: Track status with timeline and view Before/After resolution proof cards.
3. **Admin Flow**:
   - Inspect the **Operational KPI Strip**.
   - Click on `CS-BLR-1042` to inspect the **Level 3 Municipal Commissioner** escalation badge.
   - Click ✨ **"Analyze Citywide Patterns"** to trigger Gemini systemic macro analysis.
   - Click 🔧 **"Generate Work Order"** inside any ticket drawer for technical field briefs.
   - Click **"Reset Demo Data"** anytime in the top bar to restore the pristine seed state.
