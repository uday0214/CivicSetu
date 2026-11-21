# CivicSetu — Frontend Design & UX Specification (`FRONTEND.md`)

**CivicSetu** *(CivicResolve for Indian Cities)* is a dual-persona web application built with **React + Vite + TypeScript + Tailwind CSS + Lucide Icons + Leaflet**.

The frontend is intentionally split around two opposite UX goals backed by a single live state:
1. **Citizen Interface (Mobile-First):** Optimizes for *under-20-second reporting*, vernacular comfort, zero form fatigue, and public trust.
2. **Admin Command Center (Desktop-First):** Optimizes for *high-signal GIS triage*, explainable AI inspection, and rapid municipal dispatch.

---

## 1. Visual Design System & Civic Identity

### 1.1. Aesthetic Direction
Design for **modern Indian civic infrastructure**—authoritative, high-contrast, and calm under pressure. Avoid generic neon SaaS gradients; use crisp surfaces, clear hierarchy, and unmistakable semantic status colors suitable for both bright outdoor smartphone screens (citizens) and dense desktop monitors (municipal engineers).

### 1.2. Color Tokens (Tailwind Mapping)
| Role | Token / Hex | Tailwind Equivalent | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Brand (Civic Indigo)** | `#1E3A5F` | `slate-900` / custom `civic-900` | Top navigation bar, primary headers, municipal authority badges |
| **Accent Action (Civic Saffron / Amber)** | `#EA580C` | `orange-600` | Primary Citizen CTA ("Report Issue", voice record button), active focus rings |
| **Surface / Canvas** | `#F8FAFC` / `#FFFFFF` | `slate-50` / `white` | App background (`slate-50`), cards and drawers (`white` with `border-slate-200`) |
| **Priority `P0_CRITICAL`** | `#DC2626` | `red-600` (`bg-red-50`, `border-red-200`) | Monsoon hazards, live wires, open manholes, Commissioner escalations |
| **Priority `P1_HIGH`** | `#EA580C` | `orange-600` (`bg-orange-50`, `border-orange-200`) | Arterial potholes, major water leaks |
| **Priority `P2_MEDIUM`** | `#D97706` | `amber-600` (`bg-amber-50`, `border-amber-200`) | Garbage overflow, broken streetlights |
| **Priority `P3_LOW`** | `#059669` | `emerald-600` (`bg-emerald-50`, `border-emerald-200`) | Minor maintenance, cosmetic defects |
| **AI Verified Seal** | `#0D9488` | `teal-600` (`bg-teal-50`, `border-teal-200`) | Gemini Before/After `VERIFIED_FIXED` badge, AI Triage Trace accents |

### 1.3. Typography & Vernacular Support
* **Primary Font:** `Inter`, system-ui, sans-serif.
* **Indic Script Fallback:** Include `Noto Sans Devanagari`, `Noto Sans Telugu`, `Noto Sans Tamil`, and `Noto Sans Kannada` in the font stack so Gemini's vernacular confirmation messages render crisply without tofu boxes.
* **Monospace Data:** Use `font-mono` (`tabular-nums`) for Ticket IDs (`CS-BLR-1042`), SLA countdown timers, coordinates, and AI confidence percentages.

### 1.4. Responsive Strategy
* **Citizen View:** Constrained to a centered mobile-app shell (`max-w-lg mx-auto`) on desktop viewports with a sticky bottom tab bar, or full-bleed on actual mobile devices (`< 768px`).
* **Admin View:** Full-bleed desktop layout (`w-full h-[calc(100vh-56px)] overflow-hidden`) designed for `>= 1024px` screens with independent scrolling for the ticket queue and slide-over triage drawer.

---

## 2. Global App Shell & Instant Role Switcher

A single persistent `56px` (`h-14`) top header spans both views to enable effortless 1-click live demo switching:

* **Left:** CivicSetu Logo + title **CivicSetu** with subtle subtitle *CivicResolve for Indian Cities* and active city pill (e.g., `Bengaluru • BBMP`).
* **Center (Primary Demo Control):** Segmented pill toggle:
  * `[ 👤 Citizen Portal ]` | `[ 🛡️ Admin Command Center ]`
  * Switching tabs preserves live data and immediately reflects newly submitted reports without a page reload.
* **Right:**
  * Compact **"Reset Demo Data"** button (with confirmation tooltip) to restore the seeded Indian city dataset before a pitch.
  * Subtle connection/mode indicator dot (e.g., `Live AI` or `Demo Fallback` if quota circuit-breaker triggers).

---

## 3. Citizen Interface Design (Mobile-First)

The Citizen Portal uses a clean **3-tab bottom navigation bar** (mobile) / compact sub-nav:
1. **Report (`+ Snap & Speak`)** — Default active tab.
2. **Nearby Feed (`Map & Upvote`)** — Public transparency view.
3. **My Reports (`Track Status`)** — Personal ticket history & before/after proofs.

### 3.1. Tab 1: Zero-Friction "Snap & Speak" Intake
Designed to eliminate 6-field form fatigue. The user provides raw media; Gemini fills the structured form.

* **Step A — Capture Card (Top of Screen):**
  * **Photo Dropzone / Camera Trigger:** Large tap target (`min-h-[160px]`) accepting camera capture (`accept="image/*" capture="environment"`) or file drag-and-drop. Shows thumbnail preview immediately after processing.
  * **Client-Side Pipeline (Transparent to User):**
    1. Extract EXIF GPS coordinates using `exifr` *before* compression.
    2. Compress image via HTML `<canvas>` to max width `1024px` (JPEG/WebP).
  * **One-Tap Vernacular Voice Recorder:**
    * Prominent microphone button labeled *"Speak in Hindi, Kannada, Telugu, Tamil, or English"*.
    * **Recording State:** Pulsing red indicator dot + live `MM:SS` elapsed-seconds timer + "Stop" button. *(Do NOT build a Web Audio `AnalyserNode` canvas waveform.)*
    * Records browser-native `audio/webm` or `audio/mp4` and shows an inline audio playback pill once stopped.
  * **Optional Text Fallback:** Collapsible single textarea (*"Or type a quick note / Hinglish description..."*).
* **Step B — Location & Landmark Strip:**
  * Auto-populated from EXIF GPS → Browser Geolocation API fallback → Interactive mini Leaflet pin-drop map (`h-40`) for fine-tuning.
  * **Landmark Input (First-Class Field):** Prominent text input with Indian placeholder: *"Landmark (e.g., Near SBI ATM, opp. Indiranagar Metro)"*.
* **Step C — Unified AI Analysis & Pre-Submission Gate:**
  * Primary CTA button: **"Analyze & Auto-Fill with Gemini"**.
  * **Loading State:** Clean inline progress card (*"Analyzing photo, transcribing audio, checking nearby reports..."*).
  * **Sanity Gate Rejection State (`is_valid_civic_issue: false`):** Inline amber/red alert banner displaying `rejection_reason` and `suggested_user_prompt` (e.g., *"Photo appears blurry or unrelated to civic infrastructure. Please capture a clearer shot of the road or drain."*), blocking submission until retried.
  * **AI Auto-Fill Review Card (`is_valid_civic_issue: true`):**
    * Displays pre-filled editable `title`, standardized English `description`, `category` chip, `priority` badge, and routed Indian `agency` + `ward_id` (e.g., `BESCOM • Ward 14 Indiranagar`).
    * Displays Gemini's **Vernacular Confirmation Banner** in the citizen's detected language.
    * Single-tap **"Confirm & Submit Report"** button.

### 3.2. Instant Spatial-Semantic Duplicate Modal
Triggered automatically if the backend detects a matching open `MasterIncident` within ~100m:
* **Modal Header:** *"Already Reported Nearby!"* with distance badge (e.g., `38m away • Reported 2 hrs ago`).
* **Comparison Card:** Thumbnail of the existing Master Incident, title, current status, and current supporter count (`👥 3 citizens reported this`).
* **Primary CTA:** **"Confirm & Boost Priority (+1)"** (merges report, increments `community_impact_score`, and shows toast if priority auto-escalated).
* **Secondary Link:** *"No, this is a different issue — submit separately"*.

### 3.3. Tab 2: Nearby Issues Community Map & Feed
* **Top Toggle:** `[ Map View | List View ]` + horizontal scrollable category filter chips (`All`, `Roads`, `Sanitation`, `Water & Drainage`, `Electricity`).
* **Community Cards:** Show photo thumbnail, priority badge, title, landmark, assigned agency, status pill, and a 1-tap **"Upvote / Me Too (+1)"** button that increments `community_impact_score` optimistically.

### 3.4. Tab 3: My Reports & Before/After Verification Showcase
* **Status Stepper:** Visual 4-step horizontal progress bar mapping canonical backend statuses:
  `Reported` → `Triaged` → `In Progress` → `Resolved` (with clear indicator states for `PENDING_VERIFICATION` and `REOPENED`).
* **Governance Metadata Strip:** Assigned Indian agency, Ward name, SLA countdown, and **Escalation Ladder Badge** (e.g., amber *"Level 2 — Zonal Officer"* or red *"Level 3 — Municipal Commissioner"* when overdue).
* **Resolution Proof Card (Visible when `status === "RESOLVED"`):**
  * **Side-by-Side Before / After Photo Comparison** (labeled `Citizen Report` vs. `Field Resolution`).
  * **Gemini AI Verification Seal:** Teal badge displaying `VERIFIED_FIXED` + confidence percentage (e.g., `96% AI Verified`) + expandable `evidence_notes`.
  * **48-Hour Citizen Accountability Bar:** *"Is this genuinely fixed?"* with `[ ✓ Satisfied ]` and `[ ↺ Reopen Issue ]` buttons (active until `citizen_reopen_window_expires`).

---

## 4. Admin Command Center Design (Desktop-First)

Built for municipal commissioners, zonal officers, and ward engineers to triage high ticket volume at a glance.

### 4.1. Top Operational KPI & Action Strip (`h-20`)
Five compact metric cards across the top, plus one macro-AI action button on the right:
1. **Critical Open (`P0`)** — Red accent, bold count.
2. **SLA Overdue** — Count of tickets past `sla_deadline` (clicking filters the queue to overdue items).
3. **Duplicates Merged** — Total citizen reports consolidated into Master Incidents (highlights noise reduction).
4. **AI Verification Rate** — Percentage of resolutions passing Gemini Before/After audit.
5. **Avg Resolution Time** — Displayed in hours.
6. **Primary AI Action Button (Right-Aligned):** ✨ **"Analyze Citywide Patterns"** (triggers Systemic Pattern Briefing modal).

### 4.2. Split-Screen GIS Command Workspace
Below the KPI strip, divide the viewport cleanly:
* **Left / Main Pane (~58% width): Interactive Leaflet GIS Map**
  * **Floating Map Controls (Top-Right):** Toggle switch for `[ 📍 Incident Pins | 🔥 Impact Hotspots ]` + Ward/Agency quick-filter bar.
  * **Custom Priority Pins (`L.divIcon`):** Render crisp HTML/SVG circular markers color-coded by priority (`P0` Red with subtle pulse ring, `P1` Orange, `P2` Amber, `P3` Emerald) displaying the `community_impact_score` number inside the pin. *(Never use default Leaflet PNG icons.)*
  * **Impact Hotspot Layer (No `leaflet.heat`):** When Hotspot mode is toggled on, render translucent, radius-scaled Leaflet `CircleMarker` overlays weighted by `community_impact_score` and colored by priority severity.
  * Clicking any map pin selects the ticket and opens the Master Incident Triage Drawer.
* **Right Pane (~42% width): Filterable Ticket Queue**
  * **Filter Bar:** Compact dropdowns for `Priority`, `Agency` (`BBMP/ULB`, `State PWD`, `NHAI`, `DISCOM`, `Water Board`), `Ward`, and `Status`, plus a sort selector (`Highest Priority`, `Most Impact`, `SLA Urgency`, `Newest`).
  * **Dense Triage Rows:** Each row displays:
    * Priority pill + Ticket ID (`font-mono`).
    * Standardized English title + Landmark.
    * Agency & Ward chip + Impact count badge (`👥 4`).
    * Escalation Ladder indicator (red pill if `LEVEL_3_MUNICIPAL_COMMISSIONER`) + SLA timer.
    * Audit status indicator if a prior closure was `REJECTED_MISMATCH`.

### 4.3. Master Incident Triage Drawer (Slide-Over Panel, `w-[520px]`)
Opens from the right when an admin clicks any map pin or queue row, organized into scannable stacked sections:

1. **Header & Escalation Banner:**
   * Ticket ID, Status pill, Priority badge, and full-width **Indian Escalation Ladder Banner** (e.g., *`LEVEL_3_MUNICIPAL_COMMISSIONER` — Overdue P0 Escalated to Municipal Commissioner*).
2. **Explainable AI Triage Trace Card (Highlighted Box):**
   * Structured, inspectable reasoning from Gemini:
     * **Visual Hazard Factors:** Bulleted tags (e.g., `Open manhole`, `Standing water > 1ft`).
     * **Vulnerable Proximity:** Highlighted callout (e.g., `~45m from Govt. Primary School`).
     * **Monsoon Multiplier:** `Active` / `None` badge.
     * **Jurisdiction Rationale:** 1–2 sentence explanation of *why* this Indian agency was selected over alternatives.
     * **AI Confidence Bar:** Progress bar + percentage.
3. **Consolidated Citizen Reports Accordion:**
   * Shows primary photo + horizontal gallery of all merged citizen report photos, raw vernacular transcripts, timestamps, and total `community_impact_score`.
4. **Human-in-the-Loop Override & Status Controls:**
   * Editable dropdowns for `Status` (strictly the 6 canonical enum values), `Priority`, and `Assigned Agency / Ward`.
   * Clicking **"Save Override"** logs the manual adjustment with timestamp.
5. **One-Click AI Field Work Order Section:**
   * Button: **"Generate Field Work Order"**.
   * Renders a clean, copyable dispatch brief card: *Probable Root Cause*, *Recommended Crew & Equipment*, *On-Site Safety Precautions*, plus a 1-click **"Copy Brief"** button.
6. **Closed-Loop Resolution Audit Module:**
   * Dedicated dropzone for uploading the field crew's **"After" Photo** to transition a ticket to `RESOLVED`.
   * **GPS Coordinates:** Optional (auto-defaults to the `MasterIncident` coordinates so laptop demos using local test images are never blocked).
   * Clicking **"Submit for AI Verification"** runs Gemini's dual-image audit and renders the result card inline:
     * `VERIFIED_FIXED` (Teal) → Moves ticket to `RESOLVED` and starts 48h citizen reopen window.
     * `PARTIAL_FIX` (Amber) → Displays `evidence_notes` for supervisor review.
     * `REJECTED_MISMATCH` (Red Alert) → Keeps `status` as `IN_PROGRESS`, sets `audit_status = REJECTED_MISMATCH`, and displays discrepancy warning to the supervisor.

### 4.4. Systemic Pattern Briefing Modal
Triggered from the top KPI bar's **"Analyze Citywide Patterns"** button:
* Displays a structured executive briefing synthesized by Gemini across open tickets:
  * **Detected Infrastructure Clusters:** e.g., *"Ward 14 Indiranagar — 5 waterlogging & road cave-in tickets indicate a collapsed main stormwater drain."*
  * **Recommended Joint Dispatch:** Consolidating multiple agencies (e.g., `BWSSB + BBMP`) into a single coordinated crew.
  * **High-Risk Priority Watchlist:** Top 3 P0/overdue threats requiring immediate commissioner sign-off.

---

## 5. Frontend Architecture & File Layout

```text
frontend/
├── public/
│   └── seed/                     # Local static Indian civic photos (potholes, before/after, garbage)
├── src/
│   ├── types/
│   │   └── api.ts                # Strict snake_case TypeScript interfaces matching Pydantic models
│   ├── services/
│   │   └── apiClient.ts          # Typed fetch wrapper for /api/* endpoints
│   ├── utils/
│   │   ├── imagePipeline.ts      # exifr GPS extraction -> canvas 1024px compression
│   │   ├── audioRecorder.ts      # MediaRecorder wrapper (audio/webm, audio/mp4)
│   │   └── mapIcons.ts           # Custom Leaflet L.divIcon SVG/HTML builders
│   ├── components/
│   │   ├── layout/
│   │   │   └── TopNav.tsx        # Role switcher, city pill, demo reset
│   │   ├── citizen/
│   │   │   ├── SnapSpeakForm.tsx # Photo, voice, landmark, AI auto-fill & sanity gate
│   │   │   ├── DuplicateModal.tsx
│   │   │   ├── NearbyFeed.tsx
│   │   │   └── MyReportsList.tsx # Stepper, escalation badge, before/after showcase
│   │   ├── admin/
│   │   │   ├── KpiStrip.tsx
│   │   │   ├── CommandMap.tsx    # Leaflet map, custom pins, CircleMarker hotspots
│   │   │   ├── TicketQueue.tsx
│   │   │   ├── TriageDrawer.tsx  # AI Trace, overrides, work order, resolution auditor
│   │   │   └── SystemicBriefingModal.tsx
│   │   └── shared/
│   │       ├── Badges.tsx        # Priority, Status, EscalationTier, AI Audit Seal
│   │       └── BeforeAfterCard.tsx
│   ├── App.tsx
│   └── main.tsx
```

---

## 6. Non-Negotiable Frontend Engineering Guardrails

1. **Strict `snake_case` Wire Types:** All TypeScript interfaces in `src/types/api.ts` MUST use exact `snake_case` property names matching the FastAPI Pydantic schemas (`incident_id`, `community_impact_score`, `escalation_tier`, `audit_status`, `sla_deadline`). Never convert to `camelCase` on the wire.
2. **EXIF Before Canvas Compression:** Always run `exifr.gps(file)` on the raw `File` object *before* drawing onto `<canvas>` for resizing, because canvas export strips all EXIF metadata.
3. **No Default Leaflet Marker PNGs:** Always use custom `L.divIcon` markers from `src/utils/mapIcons.ts` so markers never render as broken images in Vite production builds.
4. **No `leaflet.heat` Plugin:** Implement the heatmap toggle strictly with translucent, impact-weighted Leaflet `CircleMarker` layers.
5. **No External Seed Image URLs:** All seeded incident photos (including Before/After pairs) must load from `/seed/*.jpg` inside `frontend/public/seed/` so demos never suffer 404s.
6. **Canonical Status Enforcement:** Never render or submit `CLOSURE_REJECTED_BY_AI` as an incident `status`. Keep `status` strictly within `REPORTED | TRIAGED | IN_PROGRESS | PENDING_VERIFICATION | RESOLVED | REOPENED` and display AI closure rejections via `audit_status === "REJECTED_MISMATCH"`.
7. **Section-End Build Gate:** After completing any frontend feature section, run `npx tsc --noEmit && npm run build` and confirm zero TypeScript or Vite bundling errors.