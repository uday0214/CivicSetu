# CivicSetu (CivicResolve for Indian Cities) — Execution Roadmap

This roadmap is modularized into sequentially numbered sections (`Section 1`, `Section 2`, ..., `Section 9`). Each section is self-contained with explicit deliverables, technical specs, and acceptance criteria so it can be executed, reviewed, and iterated section-by-section.

---

## 1. Project Scaffolding & Core Architecture Setup
*Goal: Initialize a clean, robust full-stack project structure with environment configuration, GCP/Gemini SDK integration, and local developer ergonomics.*

- **1.1. Tech Stack Selection & Project Structure**
  - **Backend:** Python FastAPI (lightweight, native async, first-class Pydantic v2 schema validation for Gemini structured JSON, and single-container Cloud Run deployment).
  - **Frontend:** React + Vite + TypeScript + Tailwind CSS + Lucide Icons + Leaflet / React-Leaflet + `exifr` (fast mobile-first rendering, map-ready, pre-compression EXIF metadata extraction, zero external map API keys required).
  - **Project Directory Layout:**
    - `backend/` (FastAPI app, routes, Gemini service, schemas, storage adapters)
    - `frontend/` (Vite React TS, components, hooks, map widgets, audio/image capture utils)
    - `docs/` (Architecture, context, API specs, seed data guides)
- **1.2. Environment & Dependency Configuration**
  - Configure `backend/requirements.txt` with strictly **`google-genai`** (`from google import genai` — no legacy `google-generativeai`), `fastapi`, `uvicorn`, `pydantic`, `python-dotenv`, `pillow`, `geopy`, `pytest`, `httpx`.
  - Configure `frontend/package.json` with `@types/leaflet`, `leaflet`, `lucide-react`, `exifr`, `clsx`, `tailwind-merge`.
  - Establish `.env.example` with `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `PORT`, `DATA_STORE_MODE` (`memory` / `firestore`).
- **1.3. Universal Data Adapter (Dual Mode) & Cloud Storage Guardrails**
  - Implement a dual-mode storage repository:
    - **Development / Demo Mode:** In-memory + persisted JSON file store for zero-dependency local development (explicitly noting that local JSON files are for local development only, as Cloud Run filesystems are ephemeral and reset on scale-to-zero).
    - **Production / Cloud Mode:** Google Cloud Firestore (Native mode) + Cloud Storage.
  - Explicitly require the Cloud Storage bucket to be provisioned in **`us-central1`** to stay within Google Cloud's 5 GB Always Free tier.
- **1.4. Unified Navigation & Role Toggle (Authoritative Spec: `docs/FRONTEND.md` Section 2)**
  - Build persistent `56px` (`h-14`) top navigation with instantaneous single-click role switching:
    - **Citizen View** (Mobile-first, reporting, transparency feed)
    - **Admin Command Center** (Desktop-first GIS triage, dispatch, macro analytics)
  - Include CivicSetu logo, active city indicator pill (`Bengaluru • BBMP`), one-click **"Reset Demo Data"** action, and live AI / fallback indicator.
  - Enforce verbatim **`snake_case`** across all TypeScript API interfaces in `src/types/api.ts` matching backend Pydantic models.
- **Acceptance Criteria for Section 1:**
  - `backend` starts cleanly on `localhost:8000/docs` with health check endpoint.
  - `frontend` compiles without errors and renders the shell with the role switcher.
  - Gemini API client verifies connection using official `google-genai` SDK with `GEMINI_API_KEY`.

---

## 2. Data Models, State Machine & Indian Municipal Schema
*Goal: Define the canonical data structures representing Indian civic governance, master incidents, citizen reports, AI triage traces, and escalation tiers.*

- **2.1. Indian Administrative & Agency Hierarchy**
  - Define jurisdictional routing entities:
    - **Administrative Layers:** Zone (`North`, `South`, `East`, etc.), Ward Number / Name (e.g., `Ward 14 - Indiranagar`).
    - **Jurisdictional Agencies:**
      - `ULB_MUNICIPAL`: Municipal Corporation (BBMP / GHMC / BMC / MCD) for local sanitation, health, internal colony roads, garbage.
      - `STATE_PWD`: State Public Works Department for arterial roads, major flyovers, state highway stretches.
      - `NHAI`: National Highways Authority of India for bypasses and highway corridors.
      - `DISCOM_ELECTRICAL`: Power utility (BESCOM / TSSPDCL / Tata Power) for streetlights, transformers, dangling live wires.
      - `WATER_SEWERAGE_BOARD`: Jal Board / BWSSB / HMWSSB for water supply pipeline leaks, open sewer manholes, stormwater drains.
- **2.2. Master Incident vs. Citizen Report Schema**
  - **`MasterIncident`:** Consolidated municipal ticket containing:
    - `incident_id`: Unique identifier.
    - `title`, `description_standardized_en`: Standardized English summary.
    - `category`: Civic defect category.
    - `priority`: `P0_CRITICAL`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`.
    - `agency`: Assigned Indian agency (`ULB_MUNICIPAL`, `STATE_PWD`, `NHAI`, `DISCOM_ELECTRICAL`, `WATER_SEWERAGE_BOARD`).
    - `ward_id`: e.g. `Ward 14 - Indiranagar`.
    - `location`: `lat`, `lng`, `landmark`, `formatted_address`.
    - `status`: Strictly limited to 6 canonical enum values: **`REPORTED`**, **`TRIAGED`**, **`IN_PROGRESS`**, **`PENDING_VERIFICATION`**, **`RESOLVED`**, **`REOPENED`**.
    - `community_impact_score`: Number of merged reports + upvotes.
    - `citizen_report_ids`: List of associated individual report IDs.
    - `created_at`, `updated_at`, `sla_deadline`: Timestamps.
    - `escalation_tier`: Deterministic computed property based on `sla_deadline` and `priority`:
      - Within SLA: **`LEVEL_1_WARD_JE`** (*"Level 1 — Ward Junior Engineer"*)
      - Overdue (`> 0h` past SLA): **`LEVEL_2_ZONAL_OFFICER`** (*"Level 2 — Zonal Officer"*)
      - Severely Overdue (`> 24h` past SLA or any overdue `P0_CRITICAL`): **`LEVEL_3_MUNICIPAL_COMMISSIONER`** (*"Level 3 — Municipal Commissioner"*)
    - `triage_trace`: Structured Explainable AI trace.
    - `resolution_audit`: Optional resolution audit payload (see Section 2.4).
  - **`CitizenReport`:** Individual submission containing `report_id`, `master_incident_id`, `citizen_contact`, timestamp, raw input (`photo_url`, `audio_url`, `raw_text`, `language_detected`), location (`lat`, `lng`, `landmark`, `address`), vernacular response confirmation.
- **2.3. Explainable AI Triage Trace Schema**
  - Schema capturing Gemini's decision logic:
    - `visual_hazard_factors`: List of detected risks (e.g., "water depth > 1 ft", "exposed high-tension wire").
    - `vulnerable_proximity`: Proximity to schools, hospitals, high-traffic intersections.
    - `monsoon_multiplier`: Boolean / score for monsoon-induced structural collapse or disease risks.
    - `jurisdiction_rationale`: Explicit legal reasoning why agency X was assigned instead of Y.
    - `confidence_score`: 0.0 to 1.0.
- **2.4. Resolution Audit & Verification Schema**
  - Track closure integrity separately without polluting the top-level incident status enum:
    - `before_photo_url`, `after_photo_url`: Image references.
    - `contractor_id`, `submitted_at`: Dispatch metadata.
    - `audit_status`: **`PENDING`**, **`VERIFIED_FIXED`**, **`PARTIAL_FIX`**, **`REJECTED_MISMATCH`**.
    - `audit_confidence`: Percentage float (0.0 to 1.0).
    - `evidence_notes`: Detailed audit observations.
    - `citizen_reopen_window_expires`: Timestamp (48 hours post-resolution).
- **Acceptance Criteria for Section 2:**
  - Pydantic models validate all JSON payloads strictly using Pydantic v2.
  - State machine transitions enforce canonical status progressions (`REPORTED` → `TRIAGED` → `IN_PROGRESS` → `PENDING_VERIFICATION` → `RESOLVED` / `REOPENED`).
  - `escalation_tier` accurately computes `LEVEL_1_WARD_JE`, `LEVEL_2_ZONAL_OFFICER`, or `LEVEL_3_MUNICIPAL_COMMISSIONER` purely from timestamps and priority without any extra LLM calls.

---

## 3. Gemini Multimodal AI Engine & Structured Output Contracts
*Goal: Construct a unified single-call Gemini structured-output prompt using `google-genai` for zero-friction intake, visual pre-validation, and explainable triage.*

- [x] **3.1. Unified Multimodal Intake & Sanity Gate (Single Round-Trip)**
  - Merge visual sanity filtering and multimodal triage into a **single Gemini multimodal structured-output call** (`IntakeTriageResponse`) to minimize latency and conserve free-tier API quota:
    - Accepts: Image (JPEG/PNG) and/or voice note (**`audio/webm`**, **`audio/mp4`**, or **`audio/wav`** supported natively) or text.
    - Gemini evaluates both visual validity and civic content in one pass:
      - If `is_valid_civic_issue == false`: Returns `rejection_reason` (e.g. "Image too blurry / not a civic issue") and `suggested_user_prompt` (e.g. "Please upload a clear daylight photo of the civic defect"), setting triage fields to `null`.
      - If `is_valid_civic_issue == true`:
        1. Transcribes code-mixed audio (Hindi, Hinglish, Telugu, Tamil, Kannada, English) and translates to standardized municipal English.
        2. Auto-classifies category (`Roads & Footpaths`, `Sanitation & Waste`, `Water & Drainage`, `Electricity & Lighting`, `Public Safety`).
        3. Assigns priority (`P0_CRITICAL`, `P1_HIGH`, `P2_MEDIUM`, `P3_LOW`) applying India-specific monsoon/safety risk multipliers.
        4. Identifies Indian agency jurisdiction (`ULB_MUNICIPAL`, `STATE_PWD`, `NHAI`, `DISCOM_ELECTRICAL`, `WATER_SEWERAGE_BOARD`) and Ward.
        5. Extracts landmark clues ("Near Indiranagar Metro Station Pillar 42").
        6. Generates Explainable AI Triage Trace (`visual_hazard_factors`, `jurisdiction_rationale`, `confidence_score`).
        7. Generates warm, reassuring acknowledgement in the citizen's detected vernacular language.
- [x] **3.2. Structured Response Schema Implementation**
  - Implement using `client.models.generate_content()` with `config={"response_mime_type": "application/json", "response_schema": IntakeTriageResponse}` via the official `google-genai` SDK.
- **Acceptance Criteria for Section 3 (PASSED):**
  - Automated tests running sample Hindi/Hinglish audio (`audio/webm`, `audio/wav`) and civic photos return schema-valid JSON without markdown formatting artifacts in a single Gemini call.
  - Blurry/non-civic test image triggers `is_valid_civic_issue == false` with helpful user prompt.

---

## 4. Spatial-Semantic Deduplication & Crowd Impact Engine
*Goal: Eliminate municipal inbox flooding by automatically grouping duplicate reports into Master Incidents with an escalating Community Impact Score.*

- [x] **4.1. Spatial Proximity Candidate Finder**
  - When a new valid report arrives, compute geospatial distance (Haversine formula) against all active `MasterIncident` locations within a 100-meter radius.
- [x] **4.2. Gemini Semantic Match Comparator**
  - If candidate incidents exist within the 100m radius, pass candidate summaries alongside the new report to Gemini.
  - Prompt checks: Do these describe the exact same physical problem?
  - Returns: `{ "is_duplicate": boolean, "matched_incident_id": string | null, "similarity_reason": string }`.
- [x] **4.3. Master Incident Escalation & Crowd Upvoting**
  - If duplicate confirmed:
    - Attach the new `CitizenReport` to the existing `MasterIncident`.
    - Increment `community_impact_score` (+1).
    - If impact score crosses defined thresholds (e.g., 3 reports, 5 reports), trigger automatic priority escalation (e.g. `P2_MEDIUM` $\rightarrow$ `P1_HIGH`).
    - Return response payload informing citizen: *"Issue already tracked! You are supporter #X. Priority escalated."*
  - If no match:
    - Create a new `MasterIncident` with `community_impact_score = 1`.
- **Acceptance Criteria for Section 4 (PASSED):**
  - Submitting two reports for a broken streetlight within 50m correctly links both under 1 Master Incident with `community_impact_score = 2`.

---

## 5. Closed-Loop AI Verification & Resolution Audit Engine
*Goal: Prevent fake closures and shoddy contractor repairs via multimodal Before/After visual comparison.*

- **5.1. Contractor Closure Dispatch Payload**
  - When field staff marks an issue resolved, require an "After" photo upload.
  - GPS coordinates on closure upload are **optional** (auto-defaulting to the `MasterIncident`'s coordinates when omitted) so laptop-based live demos using local test images are never blocked.
- **5.2. Gemini Multimodal Resolution Auditor**
  - Send the original citizen "Before" photo and contractor "After" photo in a dual-image prompt to Gemini.
  - Instruct Gemini to evaluate:
    1. **Site Match:** Are background landmarks, poles, curbs, and buildings consistent?
    2. **Defect Resolution:** Has the defect been genuinely fixed (e.g. pothole asphalted vs superficial dirt; drain cleared vs debris pushed aside)?
    3. **Audit Verdict:**
       - `VERIFIED_FIXED`: Same site, defect durably repaired.
       - `PARTIAL_FIX`: Same site, but incomplete repair.
       - `REJECTED_MISMATCH`: Different location, fraudulent submission, or defect unresolved.
- **5.3. State Transition & Citizen Reopen Loop**
  - If `audit_status == VERIFIED_FIXED`:
    - Transition `MasterIncident.status` to **`RESOLVED`**.
    - Set 48-hour citizen reopen window.
  - If `audit_status == REJECTED_MISMATCH` or `PARTIAL_FIX`:
    - Keep `MasterIncident.status` as **`IN_PROGRESS`**.
    - Set `resolution_audit.audit_status = REJECTED_MISMATCH`.
    - Attach `evidence_notes` to alert the admin supervisor and flag the contractor closure.
- **Acceptance Criteria for Section 5:**
  - Mock test with a patched pothole sets status `RESOLVED` with `audit_status: VERIFIED_FIXED`.
  - Mock test with an unrelated photo leaves status `IN_PROGRESS` with `audit_status: REJECTED_MISMATCH` and evidence notes.

---

## 6. Citizen Experience & Zero-Friction Reporting Portal
*Goal: Deliver a clean, mobile-optimized citizen web application that eliminates form fatigue, extracts pre-compression EXIF GPS, and displays escalation badges.*

- **6.1. "Snap & Speak" Intake Interface**
  - Photo upload/capture: Extract EXIF GPS coordinates first using **`exifr`** **before** passing image to `<canvas>` for 1024px compression.
  - Fall back to Browser Geolocation API or interactive Leaflet pin-drop if EXIF GPS is absent.
  - Audio recording: Streamlined browser-native `MediaRecorder` outputting `audio/webm` or `audio/mp4` with a **pulsing red recording indicator + elapsed-seconds timer** (no complex Web Audio API `AnalyserNode` canvas required).
  - Single-roundtrip AI triage progress indicator with instant auto-fill and vernacular acknowledgement banner.
- **6.2. Instant Duplicate Detection Modal**
  - When location and intake match a nearby incident within 100m, present an alert: *"A pothole 40m away was reported 2 hours ago. Is this the same issue?"*
  - Single-tap **"Confirm & Boost Priority (+1)"** button.
- **6.3. Citizen Tracking & Public Feed**
  - **My Reports Tab:** Step-by-step progress timeline (`Reported` $\rightarrow$ `Triaged` $\rightarrow$ `In Progress` $\rightarrow$ `Resolved`).
  - **Deterministic Escalation Badge:** Display color-coded badge (`Level 1 - Ward JE`, `Level 2 - Zonal Officer`, or `Level 3 - Municipal Commissioner`).
  - **Resolution Showcase:** Side-by-side Before/After comparison with Gemini AI Verification Seal.
  - **Nearby Issues Feed:** Community map view displaying surrounding issues with upvote support.
- **Acceptance Criteria for Section 6:**
  - Citizen can submit an issue from a smartphone/browser in under 20 seconds.
  - Photos with EXIF metadata auto-populate the map pin before compression.
  - Vernacular confirmation message is cleanly rendered.

---

## 7. Municipal Admin Command Center & Dispatch Operations
*Goal: Provide a desktop-first operational dashboard for municipal commissioners and engineers with geospatial triage, explainable AI traces, and 1-click dispatch.*

- **7.1. Operational KPI & SLA Metric Strip**
  - Cards: `Critical Open (P0)`, `SLA Overdue`, `Escalated to Commissioner (Level 3)`, `Duplicate Merges Active`, `AI Verification Rate (%)`.
- **7.2. Geospatial Command Center (Leaflet GIS — Authoritative Spec: `docs/FRONTEND.md` Section 4.2)**
  - Custom HTML/SVG **`L.divIcon`** priority-coded pins (`P0` Red with subtle pulse ring, `P1` Orange, `P2` Amber, `P3` Emerald) displaying the `community_impact_score` number inside each pin. *(Strictly forbid default Leaflet marker PNGs to prevent Vite asset bundling breakage).*
  - Toggleable hotspot layer using **translucent, radius-scaled Leaflet `CircleMarker` layers** weighted by `community_impact_score` and color-coded by priority *(avoiding external `leaflet.heat` dependency)*.
  - Filter drawer: by Ward, Agency, Category, Priority, and Status.
- **7.3. Master Incident Triage Drawer**
  - Collapsible list of all merged citizen reports and photos for the incident.
  - **Deterministic Escalation Badge:** Prominent badge showing `LEVEL_1_WARD_JE`, `LEVEL_2_ZONAL_OFFICER`, or `LEVEL_3_MUNICIPAL_COMMISSIONER`.
  - **Explainable AI Triage Trace:** Visual breakdown of hazard factors and jurisdiction routing.
  - **Human-in-the-Loop Override:** Edit priority, reassign agency, or adjust ward with audit log.
- **7.4. One-Click AI Field Work Order Generator**
  - Generates actionable dispatch brief:
    - Probable root cause, recommended equipment/crew size (e.g., "Cold mix asphalt + roller, 3-man crew").
    - Safety precautions ("Traffic diversion required; water pump needed first").
    - Copyable / printable format.
- **7.5. Macro Systemic Pattern Briefing**
  - "Analyze Citywide Patterns" button invoking Gemini to synthesize macro infrastructure failures (e.g., *"Cluster of 6 waterlogging and road cave-in reports within Ward 14 points to a collapsed main stormwater drain, not isolated potholes"*).
- **Acceptance Criteria for Section 7:**
  - Admin can filter tickets on map, open any ticket, inspect AI trace, override department, and trigger work order generation.

---

## 8. Realistic Indian City Seed Dataset & Demo Simulation
*Goal: Provide a rich, pre-loaded dataset from a representative Indian city to showcase live deduplication, heatmaps, and multilingual intake during pitch demos.*

- **8.1. Target City & Ward Definition**
  - Target: **Bengaluru (BBMP)** or **Hyderabad (GHMC)** with 3 real wards (e.g., Indiranagar, Koramangala, Whitefield).
- **8.2. Seed Incidents (15–20 Diverse Real-World Cases)**
  - **Cluster 1 (Monsoon Hazard - Severely Overdue P0):** Open manhole submerged in waterlogged road, overdue by 26 hours $\rightarrow$ Triggers **`LEVEL_3_MUNICIPAL_COMMISSIONER`** badge prominently.
  - **Cluster 2 (Dangling High-Tension Wire - P0):** BESCOM electrical hazard near school gate within SLA $\rightarrow$ `LEVEL_1_WARD_JE`.
  - **Cluster 3 (Garbage Overflow - P2):** Commercial market waste dump on footpath with 4 merged citizen reports.
  - **Cluster 4 (Pothole Corridor - P1):** Main arterial road with multiple complaints.
  - **Cluster 5 (Resolved with Audit - Complete Case):** Before/after photo pair showing verified asphalt repair with 96% AI confidence.
  - **Cluster 6 (Rejected Audit Demo Case):** In-progress ticket where contractor submitted an unrelated photo, flagged as `REJECTED_MISMATCH`.
- **8.3. Multilingual Audio/Text Fixtures**
  - Sample voice/text inputs in Hindi, Kannada/Telugu, and Hinglish for instant demo testing.
- **Acceptance Criteria for Section 8:**
  - One-click seed script (`python -m backend.seed` or UI "Reset Demo Data" button) instantly populates the map and metrics, including the overdue Level 3 Commissioner ticket.

---

## 9. Verification, Quality Assurance & Hackathon Pitch Packaging
*Goal: Ensure flawless demonstration, robust test coverage, zero console errors, and turnkey single-container Cloud Run deployment.*

- **9.1. Automated Verification Suite**
  - Automated backend API and Pydantic tests (`pytest`):
    - `test_intake_triage.py`: Unified single-call triage contract, vernacular code-mixing, sanity gate rejection.
    - `test_deduplication.py`: Geospatial + semantic clustering into single master incident.
    - `test_resolution_audit.py`: Detection of genuine vs fake contractor repair photos.
    - `test_escalation_tier.py`: Deterministic escalation level computation.
  - Frontend verification: Validate clean build (`npm run build`) and full 3-minute E2E demo runbook.
- **9.2. Single-Container Cloud Run Deployment (Dockerfile)**
  - Multi-stage Dockerfile:
    1. **Stage 1 (Frontend Builder):** Node.js container runs `npm install && npm run build` to output `frontend/dist`.
    2. **Stage 2 (FastAPI Production Server):** Python container installs `requirements.txt`, copies `frontend/dist`, mounts static assets via FastAPI `StaticFiles`, and serves the SPA index on catch-all routes.
    - Deploys as a single Cloud Run service on port `$PORT` with **zero CORS issues**.
- **9.3. Demo Presentation Runbook (3-Minute Script)**
  1. **Minute 1: Citizen Snap & Speak Intake**
     - Upload waterlogged road photo with Hinglish voice note.
     - Show instant single-call triage: standard English title, P0 priority, State PWD routing, and Hindi acknowledgement.
  2. **Minute 2: Spatial-Semantic Deduplication & Escalation**
     - Submit a second report 30m away.
     - Show instant duplicate detection prompt; tap "Confirm & Boost (+1)".
     - Show community impact score increase to 2.
  3. **Minute 3: Admin Command Center & Closed-Loop Audit**
     - Switch to Admin View via top toggle.
     - Showcase Leaflet map with CircleMarker hotspot layers and the red **"Escalated to Municipal Commissioner (Level 3)"** badge on the overdue P0 ticket.
     - Open ticket, show Explainable AI trace, click "Generate Work Order".
     - Submit contractor "After" photo $\rightarrow$ Gemini validates fix and awards AI Verification Seal.
- **Acceptance Criteria for Section 9:**
  - Backend test suite passes 100%; Dockerfile builds cleanly; 3-minute demo executes end-to-end without errors.
