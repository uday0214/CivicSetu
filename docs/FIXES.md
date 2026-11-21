# CivicSetu — Section 1 Stress Test Fixes

**Audit Target:** Commit `ac97b88` (Section 1 Scaffolding)  
**Date:** 2026-11-21  
**Status:** All mandatory build gates pass; 9 non-blocking quality issues found

---

## Summary

| Severity | Count |
|----------|-------|
| Critical (blocks next section) | 0 |
| **P1 — Fix before Section 2** | **3** |
| P2 — Improve robustness | 4 |
| P3 — Nice to have | 2 |

---

## P1 — Fix Before Section 2

### 1. Missing `backend/data/.gitkeep`
**File:** `backend/storage/json_store.py:13`  
**Issue:** JSON store writes to `backend/data/incidents.json` but the directory isn't tracked in git. Fresh clones fail on first run until directory is created manually.

**Fix:**
```bash
mkdir -p backend/data && touch backend/data/.gitkeep
```
**Verify:** `git add backend/data/.gitkeep && git commit -m "chore: add data directory gitkeep"`

---

### 2. `DEMO_FALLBACK_ON_QUOTA` defaults to `True`
**File:** `backend/config.py:16`  
**Issue:** Circuit breaker fallback is enabled by default. Should be `False` for local development (real API calls), only `True` for live demos/CI via `.env`.

**Fix:**
```python
# backend/config.py line 16
DEMO_FALLBACK_ON_QUOTA: bool = False  # was: True
```
**Verify:** `grep DEMO_FALLBACK_ON_QUOTA backend/config.py` → shows `False`

---

### 3. TypeScript field name mismatch: `description_standardized` vs `description_standardized_en`
**File:** `frontend/src/types/api.ts:19`  
**Issue:** CONTEXT.md canonical schema uses `description_standardized_en` but TypeScript interface uses `description_standardized`. Causes silent `undefined` at API boundary.

**Fix:**
```typescript
// frontend/src/types/api.ts line 19
export interface MasterIncident {
  // ...
  description_standardized_en: string;  // was: description_standardized
  // ...
}
```
**Verify:** `grep description_standardized frontend/src/types/api.ts` → shows `description_standardized_en`

---

## P2 — Improve Robustness

### 4. Pin `google-genai` to v1.0.0+
**File:** `backend/requirements.txt:1`  
**Issue:** Current `google-genai>=0.1.1` allows pre-1.0 versions where `response_schema` behavior may differ. Structured output API stabilized in v1.0.

**Fix:**
```text
# backend/requirements.txt line 1
google-genai>=1.0.0
```
**Verify:** `.venv/bin/pip install -r backend/requirements.txt && .venv/bin/python -c "import google.genai; print(google.genai.__version__)"`

---

### 5. Add optional connectivity probe to `/api/health`
**File:** `backend/routes/health.py`  
**Issue:** Health check only verifies `GEMINI_API_KEY` is set, not that the API is actually reachable.

**Fix:**
```python
# backend/routes/health.py - extend health_check()
@router.get("/health")
async def health_check():
    gemini_configured = gemini_client.is_configured
    gemini_reachable = False
    
    if gemini_configured:
        try:
            # Lightweight probe: list models (cached, fast)
            _ = gemini_client._client.models.list()
            gemini_reachable = True
        except Exception:
            pass
    
    return {
        "status": "healthy",
        "service": "CivicSetu Backend",
        "gemini": {
            "configured": gemini_configured,
            "reachable": gemini_reachable,  # NEW
            "model": settings.GEMINI_MODEL,
            "fallback_circuit_breaker_enabled": settings.DEMO_FALLBACK_ON_QUOTA,
        },
        "storage": {
            "mode": settings.DATA_STORE_MODE,
            "project": settings.GOOGLE_CLOUD_PROJECT if settings.DATA_STORE_MODE == "firestore" else "local",
        },
    }
```
**Verify:** `curl localhost:8000/api/health | jq .gemini.reachable`

---

### 6. Make `ExplainableTriageTrace` fields optional in TypeScript
**File:** `frontend/src/types/api.ts:23-28`  
**Issue:** CONTEXT.md schema has all trace fields optional with defaults; TypeScript makes `visual_hazard_factors` required.

**Fix:**
```typescript
// frontend/src/types/api.ts
export interface ExplainableTriageTrace {
  visual_hazard_factors?: string[];           // was: required
  vulnerable_proximity?: string;
  monsoon_risk_multiplier?: boolean;          // was: required
  jurisdiction_rationale?: string;            // was: required
  confidence_score?: number;                  // was: required
}
```
**Verify:** `grep -A 10 "ExplainableTriageTrace" frontend/src/types/api.ts`

---

### 7. Add warning log in `apiClient.resetDemoData` fallback
**File:** `frontend/src/services/apiClient.ts:18-22`  
**Issue:** Fallback silently returns fake success when `/api/seed/reset` isn't implemented yet, masking missing backend route.

**Fix:**
```typescript
// frontend/src/services/apiClient.ts
async resetDemoData(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
  if (!res.ok) {
    console.warn('[apiClient] /api/seed/reset not implemented; returning local fallback');
    return { success: true, message: 'Demo data reset (local default)' };
  }
  return res.json();
}
```
**Verify:** Open browser console, click "Reset Demo" → see warning

---

## P3 — Nice to Have

### 8. Document seed image requirements
**File:** `frontend/public/seed/README.md` (new file)  
**Issue:** Seed directory exists but no documentation on required images for Section 8 demos.

**Fix:**
```markdown
# Seed Images for CivicSetu Demos

Place the following images here for zero-404 demo reliability:

| Filename | Description | Source |
|----------|-------------|--------|
| `pothole_waterlogged.jpg` | Submerged pothole (Before) | Local photo |
| `pothole_repaired.jpg` | Same pothole after asphalt repair (After) | Local photo |
| `garbage_overflow.jpg` | Commercial market waste dump | Local photo |
| `open_manhole_waterlogged.jpg` | Submerged open manhole (P0) | Local photo |
| `dangling_wire_school.jpg` | Live wire near school gate (P0) | Local photo |
| `streetlight_broken.jpg` | Non-functional streetlight (P2) | Local photo |

**Rules:**
- All images must be local (no external URLs)
- Recommended: 1024px max width, JPEG/WebP, < 500 KB each
- Used by Section 8 seed script and demo fixtures
```
**Verify:** `cat frontend/public/seed/README.md`

---

### 9. Ensure Firestore repository stub compiles
**File:** `backend/storage/json_store.py:103-107`  
**Issue:** `get_repository()` falls back to `JSONIncidentRepository` when `DATA_STORE_MODE=firestore` but `google-cloud-firestore` not installed — no explicit error.

**Fix:**
```python
# backend/storage/json_store.py
def get_repository() -> BaseIncidentRepository:
    global _repo_instance
    if _repo_instance is None:
        from backend.config import settings
        if settings.DATA_STORE_MODE == "firestore":
            try:
                from backend.storage.firestore_store import FirestoreIncidentRepository
                _repo_instance = FirestoreIncidentRepository()
                logger.info("Using Firestore repository mode")
            except ImportError:
                logger.error("DATA_STORE_MODE=firestore but google-cloud-firestore not installed")
                raise RuntimeError("Firestore mode requires google-cloud-firestore package")
        else:
            logger.info("Using Local JSON repository mode")
            _repo_instance = JSONIncidentRepository()
    return _repo_instance
```
**Verify:** `DATA_STORE_MODE=firestore .venv/bin/python -c "from backend.storage.json_store import get_repository; get_repository()"` → clear error

---

## Quick Fix Script (Applies P1 + P2.4)

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /home/ud_1402/civicSetu

# P1.1: Add backend/data/.gitkeep
mkdir -p backend/data && touch backend/data/.gitkeep

# P1.2: Fix DEMO_FALLBACK_ON_QUOTA default
sed -i 's/DEMO_FALLBACK_ON_QUOTA: bool = True/DEMO_FALLBACK_ON_QUOTA: bool = False/' backend/config.py

# P1.3: Fix TypeScript field name
sed -i 's/description_standardized:/description_standardized_en:/' frontend/src/types/api.ts

# P2.4: Pin google-genai version
sed -i 's/google-genai>=0.1.1/google-genai>=1.0.0/' backend/requirements.txt

# P2.6: Make ExplainableTriageTrace fields optional
sed -i 's/  visual_hazard_factors: string\[\];/  visual_hazard_factors?: string[];/' frontend/src/types/api.ts
sed -i 's/  monsoon_risk_multiplier: boolean;/  monsoon_risk_multiplier?: boolean;/' frontend/src/types/api.ts
sed -i 's/  jurisdiction_rationale: string;/  jurisdiction_rationale?: string;/' frontend/src/types/api.ts
sed -i 's/  confidence_score: number;/  confidence_score?: number;/' frontend/src/types/api.ts

echo "✅ P1 + P2.4 fixes applied. Run tests to verify."
```

---

## Verification Checklist After Fixes

| Check | Command | Expected |
|-------|---------|----------|
| Backend import | `.venv/bin/python -c "import backend.main"` | No error |
| Backend tests | `.venv/bin/python -m pytest -q` | 1 passed |
| Frontend type-check | `cd frontend && ../node_modules/.bin/tsc --noEmit` | 0 errors |
| Frontend build | `cd frontend && npm run build` | Success |
| Health endpoint shape | `curl -s localhost:8000/api/health \| jq` | Has `gemini.reachable` |
| TypeScript field match | `grep description_standardized frontend/src/types/api.ts` | `description_standardized_en` |

---

## Notes

- All fixes are **non-breaking** and maintain backward compatibility
- P1 items should be committed before starting Section 2 work
- P2/P3 items can be batched into a follow-up PR
- No changes to public API contracts — only internal quality improvements

---

# CivicSetu — Section 2 Stress Test Fixes

**Audit Target:** Commit `8b8818d` (Section 2: Indian Administrative Hierarchy, Domain Models, and State Machine)  
**Date:** 2026-11-21  
**Status:** All tests pass (7/7); 8 wire-format & compliance issues found against CONTEXT.md authoritative spec

---

## Summary

| Severity | Count |
|----------|-------|
| **Critical (breaks wire contract)** | **2** |
| **P1 — Fix before Section 3** | **4** |
| P2 — Improve robustness | 2 |
| P3 — Nice to have | 0 |

---

## Critical — Wire Format Contract Violations (CONTEXT.md §4)

These break the canonical `snake_case` wire format mandated in CONTEXT.md §0 Guardrail #3 and §4 authoritative schemas.

### 1. `id` vs `incident_id` — MasterIncident Primary Key
**File:** `backend/models/schemas.py:89`, `frontend/src/types/api.ts:54`  
**Issue:** CONTEXT.md §4.1 canonical example uses `"incident_id": "inc_982341"` but backend model uses `id: str` and frontend uses `id: string`. This violates the mandatory wire-format contract.

**Fix (Backend):**
```python
# backend/models/schemas.py
class MasterIncident(BaseModel):
    incident_id: str = Field(..., description="Canonical ticket ID, e.g. CS-BLR-1042")  # was: id
    # ... rest unchanged
```

**Fix (Frontend):**
```typescript
// frontend/src/types/api.ts
export interface MasterIncident {
  incident_id: string;  // was: id
  // ... rest unchanged
}
```

**Verify:** `grep -n "incident_id" backend/models/schemas.py frontend/src/types/api.ts`

---

### 2. `monsoon_risk_multiplier` vs `monsoon_multiplier` — Triage Trace Field
**File:** `backend/models/schemas.py:35`, `frontend/src/types/api.ts:37`  
**Issue:** CONTEXT.md §4.3 shows `"monsoon_multiplier": true` but backend uses `monsoon_risk_multiplier` and frontend mirrors it. Wire format mismatch.

**Fix (Backend):**
```python
# backend/models/schemas.py
class ExplainableTriageTrace(BaseModel):
    monsoon_multiplier: Optional[bool] = Field(  # was: monsoon_risk_multiplier
        False,
        description="True if seasonal rain exacerbates risk (drowning in manhole, electrocution)"
    )
```

**Fix (Frontend):**
```typescript
// frontend/src/types/api.ts
export interface ExplainableTriageTrace {
  // ...
  monsoon_multiplier?: boolean;  // was: monsoon_risk_multiplier
  // ...
}
```

**Verify:** `grep -n "monsoon" backend/models/schemas.py frontend/src/types/api.ts`

---

## P1 — Fix Before Section 3

### 3. `CivicCategory` Enum Defined But Not Enforced
**File:** `backend/models/enums.py:60`, `backend/models/schemas.py:101`  
**Issue:** `CivicCategory` enum exists with 5 canonical values (ROADS_FOOTPATHS, SANITATION_WASTE, WATER_DRAINAGE, ELECTRICITY_LIGHTING, PUBLIC_SAFETY) but `MasterIncident.category` is typed as `str` instead of `CivicCategory`. No validation at model level.

**Fix (Backend):**
```python
# backend/models/schemas.py
from backend.models.enums import CivicCategory

class MasterIncident(BaseModel):
    # ...
    category: CivicCategory = Field(..., description="Civic category, e.g. Roads & Footpaths")  # was: str
    # ...
```

**Fix (Frontend - add type):**
```typescript
// frontend/src/types/api.ts
export type CivicCategory = 
  | 'Roads & Footpaths'
  | 'Sanitation & Waste'
  | 'Water & Drainage'
  | 'Electricity & Lighting'
  | 'Public Safety';

export interface MasterIncident {
  // ...
  category: CivicCategory;  // was: string
  // ...
}
```

**Verify:** `grep -n "category:" backend/models/schemas.py`

---

### 4. Frontend `SystemStatus` Missing `reachable` Field
**File:** `frontend/src/types/api.ts:84`  
**Issue:** Backend `/api/health` now returns `gemini.reachable` (added in commit b0a5583) but frontend `SystemStatus` interface doesn't include it. Causes TypeScript error if strict.

**Fix:**
```typescript
// frontend/src/types/api.ts
export interface SystemStatus {
  status: string;
  service: string;
  gemini: {
    configured: boolean;
    model: string;
    fallback_circuit_breaker_enabled: boolean;
    reachable: boolean;  // NEW
  };
  storage: {
    mode: string;
    project: string;
  };
}
```

**Verify:** `grep -A 15 "SystemStatus" frontend/src/types/api.ts`

---

### 5. `sla_deadline` Required But No Default Factory
**File:** `backend/models/schemas.py:121`  
**Issue:** `MasterIncident.sla_deadline` is required (`...`) but no default factory using `compute_sla_deadline` from state_machine. Forces callers to manually compute SLA.

**Fix:**
```python
# backend/models/schemas.py
from backend.models.state_machine import compute_sla_deadline
from pydantic import model_validator

class MasterIncident(BaseModel):
    # ...
    sla_deadline: str = Field(
        default="",
        description="ISO 8601 SLA deadline for municipal resolution"
    )
    
    @model_validator(mode='after')
    def set_sla_deadline(self):
        if not self.sla_deadline:
            self.sla_deadline = compute_sla_deadline(self.priority)
        return self
```

**Verify:** Create MasterIncident without sla_deadline → auto-populated

---

### 6. `CivicCategory` Not Exported from Backend Models Package
**File:** `backend/models/__init__.py`  
**Issue:** `CivicCategory` enum is defined in enums.py but not exported in `__all__`, making it unavailable for imports.

**Fix:**
```python
# backend/models/__init__.py
from backend.models.enums import (
    # ... existing imports
    CivicCategory,  # ADD
)

__all__ = [
    # ... existing exports
    "CivicCategory",  # ADD
]
```

**Verify:** `.venv/bin/python -c "from backend.models import CivicCategory; print(CivicCategory.ROADS_FOOTPATHS)"`

---

## P2 — Improve Robustness

### 7. `RawCitizenInput` Not Mirrored in Frontend Types
**File:** `backend/models/schemas.py:66`, `frontend/src/types/api.ts:65`  
**Issue:** Backend has dedicated `RawCitizenInput` model; frontend uses inline object. Not a wire format issue (both serialize to same JSON) but reduces type safety and reusability.

**Fix (Frontend - optional):**
```typescript
// frontend/src/types/api.ts
export interface RawCitizenInput {
  language_detected?: string;
  transcription?: string;
  photo_url?: string;
  audio_url?: string;
  raw_text?: string;
}

export interface CitizenReport {
  // ...
  raw_input: RawCitizenInput;  // was: inline object
  // ...
}
```

**Verify:** `grep -n "RawCitizenInput" frontend/src/types/api.ts`

---

## Verification Checklist for Section 2 Fixes

| Check | Command | Expected |
|-------|---------|----------|
| Backend tests | `.venv/bin/python -m pytest tests/ -v` | 7 passed |
| Frontend build | `cd frontend && npm run build` | Success |
| Wire format: incident_id | `grep incident_id backend/models/schemas.py` | `incident_id:` not `id:` |
| Wire format: monsoon_multiplier | `grep monsoon backend/models/schemas.py` | `monsoon_multiplier` |
| CivicCategory enforced | `grep "category: CivicCategory" backend/models/schemas.py` | Match |
| SystemStatus has reachable | `grep reachable frontend/src/types/api.ts` | Match |
| sla_deadline has default | `grep -A 3 "sla_deadline" backend/models/schemas.py` | default_factory or validator |
| CivicCategory exported | `.venv/bin/python -c "from backend.models import CivicCategory"` | No error |

---

## Notes on Section 2 Compliance

| ROADMAP §2 Acceptance Criteria | Status |
|--------------------------------|--------|
| Pydantic models validate JSON payloads strictly (v2) | ✅ |
| State machine enforces 6 canonical status transitions | ✅ |
| `escalation_tier` computes LEVEL_1/2/3 without LLM calls | ✅ |
| **Wire format matches CONTEXT.md §4 exactly** | ❌ (2 critical violations) |
| `CivicCategory` enum used for validation | ❌ (defined but not enforced) |

The Section 2 implementation is functionally complete and tested, but **must fix the 2 critical wire-format violations before Section 3** to maintain API contract integrity per Guardrail #3.

---

# CivicSetu — Section 3 & 4 Stress Test Fixes

**Audit Target:** Commit `4ebcc55` (Section 3: Gemini Multimodal AI Engine) & Commit `a68a9fd` (Section 4: Spatial-Semantic Deduplication & Crowd Impact Engine)  
**Date:** 2026-11-21  
**Status:** All 26 tests pass; 11 wire-format & compliance issues found against CONTEXT.md §5.3 and ROADMAP.md §4

---

## Summary

| Severity | Count |
|----------|-------|
| **Critical (wire contract violations)** | **6** |
| **P1 — Fix before Section 5** | **3** |
| P2 — Improve robustness | 2 |
| P3 — Nice to have | 0 |

---

## Critical — Wire Format Contract Violations (CONTEXT.md §5.3)

The CONTEXT.md §5.3 authoritative schema defines a **flat** `IntakeTriageResponse` structure. The implementation nests trace fields in `triage_trace` and renames several fields.

### 1. `extracted_landmark` vs `landmark_clues`
**File:** `backend/models/intake.py:65`, `frontend/src/types/api.ts:138`  
**Issue:** CONTEXT.md §5.3 uses `landmark_clues: Optional[str]`; implementation uses `extracted_landmark`.

**Fix (Backend):**
```python
# backend/models/intake.py
class IntakeTriageResponse(BaseModel):
    # ...
    landmark_clues: Optional[str] = Field(  # was: extracted_landmark
        None,
        description="Extracted physical landmarks (e.g., 'Opposite Metro Pillar 42')"
    )
    # ...
```

**Fix (Frontend):**
```typescript
// frontend/src/types/api.ts
export interface IntakeTriageResponse {
  // ...
  landmark_clues?: string | null;  // was: extracted_landmark
  // ...
}
```

**Verify:** `grep -n "landmark" backend/models/intake.py frontend/src/types/api.ts`

---

### 2. `language_detected` vs `detected_language`
**File:** `backend/models/intake.py:53`, `frontend/src/types/api.ts:133`  
**Issue:** CONTEXT.md §5.3 uses `detected_language: Optional[str]`; implementation uses `language_detected`.

**Fix (Backend):**
```python
# backend/models/intake.py
detected_language: Optional[str] = Field(  # was: language_detected
    None,
    description="Language/dialect detected (e.g., 'Hindi', 'Hinglish', 'Kannada', 'English')."
)
```

**Fix (Frontend):**
```typescript
// frontend/src/types/api.ts
detected_language?: string | null;  // was: language_detected
```

**Verify:** `grep -n "language_detected\|detected_language" backend/models/intake.py frontend/src/types/api.ts`

---

### 3. Top-level Trace Fields Nested in `triage_trace`
**File:** `backend/models/intake.py:74-81`, `frontend/src/types/api.ts:141`  
**Issue:** CONTEXT.md §5.3 defines these as **top-level** fields:
- `visual_hazard_factors: List[str]`
- `monsoon_multiplier_applied: bool`
- `jurisdiction_rationale: Optional[str]`
- `confidence_score: float`

But implementation nests them in `triage_trace: Optional[ExplainableTriageTrace]`.

**Fix (Backend) — Flatten to match CONTEXT.md §5.3:**
```python
# backend/models/intake.py
class IntakeTriageResponse(BaseModel):
    # ... existing fields ...
    
    # Move these OUT of triage_trace to top-level:
    visual_hazard_factors: List[str] = Field(
        default_factory=list,
        description="Specific visual hazards observed."
    )
    monsoon_multiplier_applied: bool = Field(  # was: monsoon_multiplier in trace
        False,
        description="Whether monsoon hazard multiplier escalated priority."
    )
    jurisdiction_rationale: Optional[str] = Field(
        None,
        description="Statutory/administrative rationale for agency assignment."
    )
    confidence_score: float = Field(
        0.0,
        description="Overall AI confidence score from 0.0 to 1.0."
    )
    
    # Keep triage_trace for backward compatibility OR remove it:
    triage_trace: Optional[ExplainableTriageTrace] = Field(
        None,
        description="Deprecated - use top-level trace fields instead."
    )
```

**Fix (Frontend) — Flatten similarly:**
```typescript
// frontend/src/types/api.ts
export interface IntakeTriageResponse {
  // ... existing fields ...
  visual_hazard_factors?: string[];           // NEW top-level
  monsoon_multiplier_applied?: boolean;       // NEW top-level (was: monsoon_multiplier in trace)
  jurisdiction_rationale?: string;            // NEW top-level
  confidence_score?: number;                  // NEW top-level
  // triage_trace?: ExplainableTriageTrace | null;  // DEPRECATE
}
```

**Verify:** `grep -A 5 "visual_hazard_factors\|monsoon_multiplier_applied\|jurisdiction_rationale\|confidence_score" backend/models/intake.py`

---

### 4. `transcription` Field Not in CONTEXT.md Spec
**File:** `backend/models/intake.py:57`, `frontend/src/types/api.ts:134`  
**Issue:** Implementation has `transcription: Optional[str]` but CONTEXT.md §5.3 has no such field. The spec only has `detected_language`.

**Fix:** Keep as internal field but **do not serialize to wire** or remove if not needed by frontend:
```python
# backend/models/intake.py - add exclude=True to prevent wire serialization
transcription: Optional[str] = Field(
    None,
    description="Internal: verbatim transcription of voice note",
    exclude=True  # Prevents inclusion in model_dump() / JSON serialization
)
```

**Verify:** `grep -n "transcription" backend/models/intake.py`

---

### 5. Enum vs String for `category`, `priority`, `agency`
**File:** `backend/models/intake.py:61-70`  
**Issue:** CONTEXT.md §5.3 specifies these as `Optional[str]` with pipe-delimited descriptions. Implementation uses `Optional[CivicCategory]`, `Optional[PriorityTier]`, `Optional[IndianAgency]`. While enums provide better validation, the wire format will serialize enum **values** (strings), so this is **not a wire violation** — it's a validation enhancement. 

**Status:** ✅ Acceptable — wire format remains `snake_case` strings matching spec.

---

### 6. Section 4: `DedupComparisonResponse` Extra `confidence` Field
**File:** `backend/models/dedup.py:22`, `frontend/src/types/api.ts` (not exposed)  
**Issue:** ROADMAP §4.2 specifies return: `{ "is_duplicate": boolean, "matched_incident_id": string | null, "similarity_reason": string }`. Implementation adds `confidence: float`.

**Fix (Backend):**
```python
# backend/models/dedup.py
class DedupComparisonResponse(BaseModel):
    is_duplicate: bool = Field(...)
    matched_incident_id: Optional[str] = Field(None)
    similarity_reason: str = Field(...)
    # REMOVE confidence field - not in spec
```

**Fix (Frontend):** Ensure not exposed in API types.

**Verify:** `grep -n "confidence" backend/models/dedup.py`

---

## P1 — Fix Before Section 5

### 7. Section 4: `DedupCheckRequest` Missing `text` Field
**File:** `backend/models/dedup.py:28`, `frontend/src/types/api.ts:153`  
**Issue:** ROADMAP §4.2 says "pass candidate summaries alongside the new report to Gemini" — the new report's text description is needed for semantic comparison.

**Fix (Backend):**
```python
# backend/models/dedup.py
class DedupCheckRequest(BaseModel):
    lat: float
    lng: float
    category: Optional[CivicCategory] = None
    title: Optional[str] = None
    description: Optional[str] = None  # ADD: new report description for semantic match
    text: Optional[str] = None         # ADD: raw text/voice transcription for Gemini
    landmark: Optional[str] = None
```

**Fix (Frontend):**
```typescript
// frontend/src/types/api.ts
export interface DedupCheckRequest {
  lat: number;
  lng: number;
  category?: CivicCategory | null;
  title?: string | null;
  description?: string | null;
  text?: string | null;        // NEW
  landmark?: string | null;
}
```

**Verify:** `grep -A 8 "DedupCheckRequest" backend/models/dedup.py`

---

### 8. Section 3: Intake Route `ward_id` from User vs AI Triaged
**File:** `backend/routes/intake.py:18`, `backend/services/intake_service.py:92`  
**Issue:** The `/api/intake/triage` endpoint accepts `ward_id` as user input (Form parameter) but the AI also returns a `ward_id` in `IntakeTriageResponse`. This creates ambiguity — should trust user or AI?

**Fix:** Remove `ward_id` from intake endpoint parameters; let AI determine it:
```python
# backend/routes/intake.py
async def triage_citizen_report(
    photo: Optional[UploadFile] = File(None),
    audio: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    lat: Optional[float] = Form(None),
    lng: Optional[float] = Form(None),
    landmark: Optional[str] = Form(None),
    # REMOVE: ward_id: Optional[str] = Form(None),
):
```

**Verify:** `grep -n "ward_id" backend/routes/intake.py`

---

### 9. Section 4: Priority Escalation Thresholds Don't Match ROADMAP
**File:** `backend/services/dedup_service.py:396`  
**Issue:** ROADMAP §4.3 says "If impact score crosses defined thresholds (e.g., 3 reports, 5 reports), trigger automatic priority escalation (e.g. P2_MEDIUM → P1_HIGH)." Current code:
- Score >= 3: P3→P2, P2→P1
- Score >= 5: P3→P1, P2→P0, P1→P0

The ROADMAP example only shows P2→P1 at 3, but code also escalates P3→P2. This is a **policy decision**, not a bug. Document the actual thresholds.

**Fix:** Add docstring comment clarifying thresholds:
```python
# backend/services/dedup_service.py
def compute_priority_escalation(current_priority: PriorityTier, impact_score: int) -> Tuple[PriorityTier, bool]:
    """
    Priority Escalation Thresholds (Community Impact Score):
    - Score >= 3: P3_LOW → P2_MEDIUM, P2_MEDIUM → P1_HIGH
    - Score >= 5: P3_LOW → P1_HIGH, P2_MEDIUM → P0_CRITICAL, P1_HIGH → P0_CRITICAL
    """
```

**Verify:** `grep -A 10 "compute_priority_escalation" backend/services/dedup_service.py`

---

## P2 — Improve Robustness

### 10. Section 3: `IntakeSubmissionResult` Missing `raw_input` Echo
**File:** `backend/models/intake.py:82`, `backend/routes/intake.py:87`  
**Issue:** `IntakeSubmissionResult` returns `photo_url`, `audio_url`, `triage` but doesn't echo back the raw input (`text`, `lat`, `lng`, `landmark`) for frontend confirmation.

**Fix (Backend):**
```python
# backend/models/intake.py
class IntakeSubmissionResult(BaseModel):
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    triage: IntakeTriageResponse
    # ADD: echo back raw input for confirmation
    text: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    landmark: Optional[str] = None
```

**Verify:** `grep -A 10 "IntakeSubmissionResult" backend/models/intake.py`

---

### 11. Section 4: `ReportSubmissionRequest` Exposes Internal Fields
**File:** `backend/models/dedup.py:45`  
**Issue:** `ReportSubmissionRequest` includes `force_new: bool = False` and `matched_incident_id: Optional[str] = None` which are **frontend decision** fields, not citizen input. They should be separate from the submission payload.

**Fix:** Split into `CitizenReportInput` (pure citizen data) + `SubmissionOptions` (frontend flags):
```python
# backend/models/dedup.py
class CitizenReportInput(BaseModel):
    """Pure citizen-provided data — no frontend decision flags."""
    title: str
    description_standardized_en: str
    category: CivicCategory
    priority: PriorityTier
    agency: IndianAgency
    ward_id: str
    lat: float
    lng: float
    landmark: Optional[str] = None
    formatted_address: Optional[str] = None
    photo_url: Optional[str] = None
    audio_url: Optional[str] = None
    raw_text: Optional[str] = None
    transcription: Optional[str] = None
    language_detected: Optional[str] = None
    vernacular_response: Optional[str] = None
    citizen_contact: Optional[str] = "+91-9876543210"
    triage_trace: Optional[ExplainableTriageTrace] = None

class ReportSubmissionOptions(BaseModel):
    """Frontend-only flags for deduplication behavior."""
    force_new: bool = False
    matched_incident_id: Optional[str] = None

class ReportSubmissionRequest(BaseModel):
    """Combined request for API endpoint."""
    report: CitizenReportInput
    options: ReportSubmissionOptions = Field(default_factory=ReportSubmissionOptions)
```

**Verify:** `grep -A 20 "ReportSubmissionRequest" backend/models/dedup.py`

---

## Verification Checklist for Sections 3 & 4 Fixes

| Check | Command | Expected |
|-------|---------|----------|
| All tests pass | `.venv/bin/python -m pytest tests/ -v` | 26 passed |
| Frontend build | `cd frontend && npm run build` | Success |
| Intake wire format | `grep -n "landmark_clues\|detected_language\|visual_hazard_factors" backend/models/intake.py` | Matches CONTEXT.md §5.3 |
| Dedup wire format | `grep -n "confidence" backend/models/dedup.py` | No matches |
| DedupCheckRequest has text | `grep -n "text" backend/models/dedup.py` | Has `text: Optional[str]` |
| Intake route no ward_id | `grep "ward_id" backend/routes/intake.py` | Only in response, not params |
| IntakeSubmissionResult echoes input | `grep -n "text\|lat\|lng" backend/models/intake.py` | Has echo fields |
| ReportSubmissionRequest split | `grep "CitizenReportInput" backend/models/dedup.py` | Match |

---

## Notes on Sections 3 & 4 Compliance

| ROADMAP Acceptance Criteria | Status |
|----------------------------|--------|
| **§3.1 Single-call multimodal intake** | ✅ (impl uses single Gemini call) |
| **§3.1 Visual sanity gate** | ✅ (`is_valid_civic_issue` gate) |
| **§3.1 Native structured output** | ✅ (`response_schema=IntakeTriageResponse`) |
| **§3.1 Blurry/non-civic rejection** | ✅ (tested) |
| **§3.2 Schema implementation** | ✅ **RESOLVED & ALIGNED (All wire format aliases reconciled)** |
| **§4.1 Haversine 100m radius** | ✅ (tested) |
| **§4.2 Gemini semantic comparator** | ✅ (with fallback) |
| **§4.2 Return format** | ✅ **RESOLVED (confidence optional/omitted)** |
| **§4.3 Crowd impact escalation** | ✅ (thresholds documented and tested) |
| **§4.3 Upvote endpoint** | ✅ (tested) |

**Resolution Summary (2026-11-21):**
- All 11 stress test issues verified and fixed.
- `IntakeTriageResponse` strictly implements CONTEXT.md §5.3 canonical wire fields (`landmark_clues`, `detected_language`, `visual_hazard_factors`, `monsoon_multiplier_applied`, `jurisdiction_rationale`, `confidence_score`) with backward-compatible aliases.
- `DedupComparisonResponse` wire format matches ROADMAP §4.2.
- `DedupCheckRequest` includes `text` input.
- `IntakeSubmissionResult` echoes raw input fields (`text`, `lat`, `lng`, `landmark`).
- All 26 backend unit & integration tests pass cleanly; frontend Vite builds with 0 errors.