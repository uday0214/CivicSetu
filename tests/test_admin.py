"""
CivicSetu Section 7 Unit Tests: Municipal Admin Command Center, KPI Engine, Work Orders, and AI Intelligence.
"""

import pytest
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.models.admin import WorkOrderResponse, SystemicBriefingResponse
from backend.services.gemini_client import gemini_client


@pytest.mark.asyncio
async def test_kpi_summary_endpoint():
    """Verify operational KPI metrics strip returns structured figures."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/analytics/kpi")
        assert res.status_code == 200
        data = res.json()
        assert "critical_open_count" in data
        assert "sla_overdue_count" in data
        assert "escalated_commissioner_count" in data
        assert "duplicates_merged_count" in data
        assert "ai_verification_rate" in data
        assert isinstance(data["critical_open_count"], int)


@pytest.mark.asyncio
async def test_work_order_generation():
    """Verify Gemini AI one-click field work order dispatch generation."""
    from backend.storage.json_store import get_repository
    repo = get_repository()
    inc_data = {
        "incident_id": "CS-TEST-WO-1",
        "title": "Collapsing Culvert & Waterlogging",
        "description_standardized_en": "Culvert collapsed causing street flood near Indiranagar 100ft road.",
        "category": "Roads & Footpaths",
        "priority": "P0_CRITICAL",
        "agency": "ULB_MUNICIPAL",
        "ward_id": "Ward 14 - Indiranagar",
        "location": {"lat": 12.9716, "lng": 77.6412, "landmark": "Indiranagar 100ft Road"},
        "status": "REPORTED",
        "community_impact_score": 1,
        "citizen_report_ids": ["CR-1"],
        "created_at": "2026-11-21T10:00:00Z",
        "updated_at": "2026-11-21T10:00:00Z",
        "sla_deadline": "2026-11-21T14:00:00Z",
        "escalation_tier": "LEVEL_1_WARD_JE",
    }
    await repo.create_incident(inc_data)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        inc_id = "CS-TEST-WO-1"
        with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = WorkOrderResponse(
                incident_id=inc_id,
                probable_root_cause="SWD box culvert failure under heavy vehicular shear.",
                recommended_crew_size="1 Assistant Engineer, 2 Masons, 4 Laborers",
                required_equipment=["2-Ton Vibratory Roller", "Cold Mix Bitumen", "Submersible Dewatering Pump"],
                safety_precautions=["Cordon 20m perimeter", "High-visibility vests"],
                work_order_markdown="# MUNICIPAL WORK ORDER DISPATCH BRIEF\nDispatched under BBMP SOP.",
            )

            res_wo = await ac.post(f"/api/incidents/{inc_id}/work-order")
            assert res_wo.status_code == 200
            wo_data = res_wo.json()
            assert wo_data["incident_id"] == inc_id
            assert "SWD box culvert" in wo_data["probable_root_cause"]
            assert len(wo_data["required_equipment"]) >= 3


@pytest.mark.asyncio
async def test_admin_incident_override():
    """Verify human-in-the-loop supervisor override endpoint adjusts priority, agency, and ward."""
    from backend.storage.json_store import get_repository
    repo = get_repository()
    inc_data = {
        "incident_id": "CS-TEST-OVR-1",
        "title": "Unlit Junction",
        "description_standardized_en": "Dark junction due to non-functioning lamps.",
        "category": "Electricity & Lighting",
        "priority": "P2_MEDIUM",
        "agency": "DISCOM_ELECTRICAL",
        "ward_id": "Ward 14 - Indiranagar",
        "location": {"lat": 12.9730, "lng": 77.6420, "landmark": "12th Main Junction"},
        "status": "REPORTED",
        "community_impact_score": 1,
        "citizen_report_ids": ["CR-2"],
        "created_at": "2026-11-21T10:00:00Z",
        "updated_at": "2026-11-21T10:00:00Z",
        "sla_deadline": "2026-11-23T10:00:00Z",
        "escalation_tier": "LEVEL_1_WARD_JE",
    }
    await repo.create_incident(inc_data)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        inc_id = "CS-TEST-OVR-1"
        override_payload = {
            "priority": "P0_CRITICAL",
            "agency": "ULB_MUNICIPAL",
            "ward_id": "Ward 84 - Koramangala",
            "notes": "Accident-prone junction during night festival - urgent priority elevated by Ward Supervisor.",
        }
        res_override = await ac.patch(f"/api/incidents/{inc_id}/override", json=override_payload)
        assert res_override.status_code == 200
        updated = res_override.json()
        assert updated["priority"] == "P0_CRITICAL"
        assert updated["agency"] == "ULB_MUNICIPAL"
        assert updated["ward_id"] == "Ward 84 - Koramangala"


@pytest.mark.asyncio
async def test_systemic_briefing_endpoint():
    """Verify systemic infrastructure intelligence briefing route."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = SystemicBriefingResponse(
                clusters_detected=2,
                systemic_analysis_markdown="## Macro Cluster: Indiranagar SWD failure detected across 4 tickets.",
                recommended_joint_dispatch=["BBMP Road Infrastructure + BWSSB Stormwater Division"],
                priority_watchlist=["CS-BLR-1042: Submerged Manhole"],
            )

            res = await ac.get("/api/analytics/systemic-briefing")
            assert res.status_code == 200
            briefing = res.json()
            assert briefing["clusters_detected"] == 2
            assert "Indiranagar SWD" in briefing["systemic_analysis_markdown"]
            assert len(briefing["recommended_joint_dispatch"]) == 1
