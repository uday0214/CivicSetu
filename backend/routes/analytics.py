"""CivicSetu Analytics & Systemic Briefing Routes."""

import logging
from fastapi import APIRouter

from backend.models.admin import SystemicBriefingResponse, KpiSummaryResponse
from backend.services.admin_service import (
    generate_systemic_briefing,
    compute_kpi_summary,
)

logger = logging.getLogger("civicsetu.routes.analytics")

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/systemic-briefing", response_model=SystemicBriefingResponse)
async def get_systemic_briefing():
    """
    Synthesizes macro citywide infrastructure patterns and joint-agency dispatches using Gemini.
    """
    return await generate_systemic_briefing()


@router.get("/kpi", response_model=KpiSummaryResponse)
async def get_kpi_summary():
    """
    Returns operational KPI metrics for the Municipal Command Center.
    """
    return await compute_kpi_summary()
