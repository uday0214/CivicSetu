# CivicSetu — AI-Powered Civic Issue Resolution for Indian Cities
*Built for PromptWars (CivicResolve Challenge).*

[![Live Web App](https://img.shields.io/badge/Live%20App-Render.com-brightgreen.svg)](https://civicsetu-yt0q.onrender.com/)
[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
[![React 18](https://img.shields.io/badge/React-18.3-61DAFB.svg)](https://react.dev/)
[![Gemini 2.5](https://img.shields.io/badge/Gemini-2.5_Flash-4285F4.svg)](https://ai.google.dev/)

> 🚀 **Live Production Deployment:** [https://civicsetu-yt0q.onrender.com/](https://civicsetu-yt0q.onrender.com/)  
> *(Experience both views live: click `Admin Portal ↗` in the top bar to inspect municipal command operations, or click `Report Issue` to test citizen intake!)*

---

## Overview

**CivicSetu** (नागरिक सेतु / ಸಿವಿಕ್ ಸೇತು / సివిక్ సేతు / குடிமக்கள் சேது) is an end-to-end civic resolution platform engineered for Indian urban local bodies across Karnataka, Telangana, Andhra Pradesh, and Tamil Nadu. 

It eliminates civic reporting friction by allowing citizens to submit code-mixed vernacular voice notes and photos without filling cumbersome government forms. Using **Google Gemini 2.5 Flash**, CivicSetu performs automated multimodal triage, suppresses redundant complaints via 100-meter spatial-semantic deduplication, automatically routes defects to the exact responsible municipal ward office with Google Maps navigation links, and enforces verified visual before-and-after photo audits before contractors can close tickets.

---

## 1. The Problem (Indian Civic Context)

Municipal grievance redressal across Indian metropolises suffers from four critical systemic failures:

* **Reporting Friction & Language Barriers:** Traditional grievance portals (e.g., Sahaaya, BBMP FixMyStreet, GHMC App) demand complex formal text entries, manual ward identification, and rigid English categorization. Citizens speaking Kannada, Telugu, Tamil, or conversational Hinglish are effectively disenfranchised.
* **Jurisdictional Fragmentation & Ping-Pong:** When a road craters or water floods an intersection, municipal corporations (BBMP, GHMC, GCC), state PWDs, NHAI, electricity boards (BESCOM, TGSPDCL), and water authorities (BWSSB, HMWSSB) engage in prolonged inter-agency finger-pointing, leaving complaints stuck in bureaucratic limbo.
* **Duplicate Flooding:** High-visibility road hazards generate dozens of separate complaint tickets from daily commuters, overwhelming ward engineers with repetitive tickets and obscuring critical life-safety emergencies.
* **Unverified "Ghost" Closures:** Field contractors frequently mark tickets "Resolved" with stock photos or without conducting physical repairs simply to meet SLA benchmarks, leaving citizens helpless and deeply distrustful of civic governance.

---

## 2. Feature Matrix & Problem Statement Alignment

| CivicResolve Requirement | CivicSetu Solution | Key Technical Differentiator |
| :--- | :--- | :--- |
| **Zero-Fatigue Citizen Intake** | Multi-modal intake accepting camera photos, spoken vernacular audio, and conversational text. | Automated EXIF GPS extraction with network triangulation and vernacular speech recognition. |
| **Multimodal AI Classification** | Gemini 2.5 Flash pipeline classifying category, severity, hazards, and infrastructure tags. | Pre-submission visual sanity gate rejecting non-civic uploads (memes, pets, selfies, blurry indoor shots). |
| **Context-Aware Prioritization** | Deterministic P0–P3 prioritization engine with monsoon multipliers and vulnerability flags. | Proximity awareness to schools, hospitals, and transit hubs with automatic severity escalation. |
| **Statutory Ward & Agency Routing** | Instant lookup of responsible municipal ward/circle office, contact helpline, and navigation pins. | Resolves jurisdiction disputes between ULBs, State PWD, NHAI, Electricity DISCOMs, and Water Boards. |
| **Spatial-Semantic Deduplication** | Two-tier grouping engine detecting complaints within a 100-meter radius. | Gemini compares defect photos and descriptions to merge duplicates into Master Incidents with Community Impact score increments. |
| **Municipal Command Center** | Interactive geospatial Leaflet map, SLA countdown clocks, and AI briefing generation. | One-click human-in-the-loop dispatch to departments with instant state transition to `IN_PROGRESS`. |
| **Dual-Image Resolution Verification** | Side-by-side Before/After visual comparison audit with confidence scoring. | Automated mismatch rejection blocking fraudulent closures, plus a 48-hour citizen reopening window. |

---

## 3. How Google Gemini & Google Antigravity Power CivicSetu

### Google Gemini (`google-genai` SDK)
CivicSetu leverages the official Google GenAI SDK (`google-genai>=1.0.0`) running **Gemini 2.5 Flash** with structured Pydantic `response_schema` enforcement:
1. **Multimodal Intake Triage:** Combines image bytes, audio notes, and vernacular descriptions into a single round-trip call. It generates standardized English titles and descriptions, extracts physical landmarks, identifies the vernacular language, and outputs a polite local-language acknowledgement.
2. **Spatial-Semantic Deduplication:** When a report falls within 100 meters of an active ticket, Gemini compares the defects to determine whether they represent the identical physical asset failure.
3. **Dual-Image Resolution Audit:** Analyzes contractor post-repair photos side-by-side with original defect photos to verify genuine structural repair before closing the SLA ticket.
4. **Systemic Pattern Synthesis:** Synthesizes cross-ward incident telemetry to generate actionable infrastructure briefings for municipal commissioners.

### Google Antigravity
CivicSetu was architected, scaffolded, and hardened using **Google Antigravity**. Antigravity enabled rapid end-to-end iteration across FastAPI schemas, Leaflet GIS rendering, Pydantic type safety, and automated test suites within the hackathon timeframe.

---

## 4. End-to-End Walkthrough: Citizen Intake to Municipal Resolution

```
[ Citizen Snap & Speak ]
          │
          ▼
[ Gemini Multimodal Triage ] ──► Extracted GPS, Category, Severity & Vernacular Reply
          │
          ├─► [ 100m Spatial-Semantic Check ] ──► Duplicate Found? ──► Upvote & Increment Impact
          │                                            │ No
          ▼                                            ▼
[ Ward Jurisdiction Mapping ] ────────────────► [ New Master Incident Created ]
          │
          ▼
[ Municipal Command Center ] ──► Ward Pin on GIS Map, SLA Ticker & Work Order Dispatch
          │
          ▼
[ Field Crew Physical Repair ]
          │
          ▼
[ Contractor Uploads After-Photo ]
          │
          ▼
[ Gemini Dual-Image Audit ] ──► Verified? ──► Yes ──► Resolved (48h Reopen Window)
                                    │ No
                                    └──► Rejection Notice to Contractor
```

### Step 1: Snap & Speak Citizen Intake
* **Effortless Reporting:** Citizens take a photo or record a voice note in Kannada, Telugu, Tamil, Hindi, or English.
* **Automatic Geolocation:** EXIF GPS metadata is extracted directly from the photo; alternatively, browser geolocation locates the incident on an interactive map.
* **Instant Vernacular Confirmation:** Gemini acknowledges the citizen's report in their native dialect (e.g., Kannada: *"ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ದೂರು ದಾಖಲಾಗಿದೆ"*).

### Step 2: Intelligent Triage & Responsible Ward Identification
* **Instant Jurisdiction Card:** CivicSetu automatically matches GPS coordinates against municipal ward boundaries (e.g., *Ward 14 - Indiranagar, BBMP East Zone* or *Circle 20 - Serilingampally, GHMC*).
* **Direct Office Details:** The citizen immediately sees the local ward office address, executive engineer contact phone number, and a direct Google Maps navigation button.

### Step 3: 100m Spatial-Semantic Deduplication
* If another citizen reported the same pothole or broken street light within 100 meters, CivicSetu presents the existing incident.
* Rather than creating duplicate tickets, citizens click **"I'm affected too"**, upvoting the ticket and boosting its Community Impact score to expedite municipal response.

### Step 4: Municipal Admin Command Center
* **Live GIS Operations Map:** Ward engineers and commissioners monitor real-time incidents plotted with priority-coded markers across southern urban zones.
* **Explainable AI Drawer:** Every ticket includes an explainable AI breakdown showing identified physical hazards, monsoon risk flags, and jurisdictional rationales.
* **One-Click Dispatch:** Administrators can generate structured work orders and transition tickets to `IN_PROGRESS` with one click.

### Step 5: Before & After Visual Resolution Audit
* When field contractors finish repairs, they must upload an on-site completion photo.
* **Gemini Dual-Image Comparison:** Gemini compares the original defect against the repair photo, checking repair quality, surface uniformity, and landmark consistency.
* **Anti-Fraud Guard:** If a contractor uploads an unrelated photo, Gemini rejects the closure with an explicit failure reason.
* **Citizen Voice:** If a repair was substandard, citizens retain a 48-hour window to reopen the ticket with one tap.

---

## 5. Quick Start & Local Setup

To run CivicSetu on your local machine:

```bash
# 1. Clone the repository
git clone https://github.com/uday0214/CivicSetu.git
cd CivicSetu

# 2. Configure your Gemini API Key
cp .env.example .env
# Open .env and set GEMINI_API_KEY=your_gemini_api_key

# 3. Setup Python backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# 4. Build React frontend
cd frontend
npm install
npm run build
cd ..

# 5. Run tests & start application
pytest -q
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

> For production deployment details, Docker containerization, and Render / Google Cloud Run setup, refer to the [Deployment Guide](docs/DEPLOYMENT.md).

---

## 6. Complete Documentation Directory

Explore the detailed architecture, engineering guides, and agent specifications:

### Core Documentation
* 📘 [**Technical Architecture & API Reference**](docs/TECHNICAL.md) — System architecture diagram, verified tech stack, REST API route contracts, and directory structure.
* 🚀 [**Deployment & Setup Guide**](docs/DEPLOYMENT.md) — Local environment configuration, Render web service instructions, and Google Cloud Run single-container deployment.
* 🖥️ [**Frontend Architecture & UI Guidelines**](docs/agents/FRONTEND.md) — React 18 component hierarchy, Leaflet GIS mapping, Tailwind styling, and responsive UX design.
* 🧪 [**Sign-Off Verification & Test Report**](docs/agents/SIGN_OFF_REPORT.md) — 51-test verification matrix, edge case handling, and multimodal audit validation.

### Agent Specifications & Engineering Logs
* 🗺️ [**Roadmap & Milestones**](docs/agents/ROADMAP.md) — Core functional requirements and project phases.
* 🛠️ [**Hardened Fixes & Schema Alignment**](docs/agents/FIXES.md) — Comprehensive record of bug fixes, TypeScript contract synchronizations, and model fallbacks.
* 🏛️ [**Indian Municipal Context & Jurisdiction Matrix**](docs/agents/CONTEXT.md) — Detailed governance models for BBMP, GHMC, GCC, DISCOMs, and Water Supply boards.
* 🔌 [**Integration Contracts & Fallback Engine**](docs/agents/INTEGRATIONS.md) — Google Gemini 2.5 Flash SDK specifications and OpenRouter fallback architecture.

---

<p align="center">
  <b>CivicSetu</b> — Bridging Citizens and Municipal Governance with Multimodal AI.<br>
  Built with ❤️ for Indian Cities.
</p>
