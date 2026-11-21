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