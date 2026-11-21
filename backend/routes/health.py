"""Health and System Status Route with Gemini Connectivity Probe."""

import time
from typing import Optional
from fastapi import APIRouter
from backend.config import settings
from backend.services.gemini_client import gemini_client

router = APIRouter(prefix="/api", tags=["health"])

# Cache for Gemini reachability to prevent burning RPM quota on repeated checks
_reachability_cache: Optional[bool] = None
_reachability_cache_time: float = 0
CACHE_TTL_SECONDS = 60.0


@router.get("/health")
async def health_check():
    """
    Returns system status, active Gemini model, reachability probe, storage mode, and fallback readiness.
    """
    global _reachability_cache, _reachability_cache_time

    gemini_configured = gemini_client.is_configured
    gemini_reachable = False

    if gemini_configured and gemini_client._client:
        current_time = time.time()
        if _reachability_cache is not None and (current_time - _reachability_cache_time) < CACHE_TTL_SECONDS:
            gemini_reachable = _reachability_cache
        else:
            try:
                # Lightweight probe: query models to confirm connectivity & key validity
                _ = next(iter(gemini_client._client.models.list(config={"page_size": 1})), None)
                gemini_reachable = True
            except Exception:
                gemini_reachable = False
            _reachability_cache = gemini_reachable
            _reachability_cache_time = current_time

    return {
        "status": "healthy",
        "service": "CivicSetu Backend",
        "gemini": {
            "configured": gemini_configured,
            "reachable": gemini_reachable,
            "model": settings.GEMINI_MODEL,
            "fallback_circuit_breaker_enabled": settings.DEMO_FALLBACK_ON_QUOTA,
        },
        "storage": {
            "mode": settings.DATA_STORE_MODE,
            "project": settings.GOOGLE_CLOUD_PROJECT if settings.DATA_STORE_MODE == "firestore" else "local",
        },
    }
