"""Unit & Integration Tests for Spatial-Semantic Deduplication & Crowd Impact Engine."""

import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.models.enums import PriorityTier, IndianAgency, CivicCategory, IncidentStatus
from backend.models.dedup import (
    DedupCandidateSummary,
    DedupComparisonResponse,
    ReportSubmissionRequest,
)
from backend.services.dedup_service import (
    haversine_distance_meters,
    compute_priority_escalation,
    get_default_demo_dedup_fallback,
    gemini_client,
)
from backend.storage.json_store import get_repository


def test_haversine_distance_calculation():
    """Verify Haversine geospatial calculations for near and far distances."""
    lat1, lng1 = 12.9716, 77.6412  # Indiranagar 100ft road
    # Same point should be 0.0
    assert haversine_distance_meters(lat1, lng1, lat1, lng1) == 0.0

    # ~33.3 meters north (0.0003 deg latitude difference)
    lat2, lng2 = 12.9719, 77.6412
    dist_33m = haversine_distance_meters(lat1, lng1, lat2, lng2)
    assert 30.0 < dist_33m < 36.0

    # ~12 km away (Whitefield)
    lat_wf, lng_wf = 12.9698, 77.7500
    dist_wf = haversine_distance_meters(lat1, lng1, lat_wf, lng_wf)
    assert 11000.0 < dist_wf < 13000.0


def test_priority_escalation_thresholds():
    """Verify community impact score thresholds trigger correct priority escalation."""
    # Under threshold: no change
    p, escalated = compute_priority_escalation(PriorityTier.P3_LOW, impact_score=2)
    assert p == PriorityTier.P3_LOW
    assert escalated is False

    # Threshold 3: P3 -> P2
    p, escalated = compute_priority_escalation(PriorityTier.P3_LOW, impact_score=3)
    assert p == PriorityTier.P2_MEDIUM
    assert escalated is True

    # Threshold 3: P2 -> P1
    p, escalated = compute_priority_escalation(PriorityTier.P2_MEDIUM, impact_score=3)
    assert p == PriorityTier.P1_HIGH
    assert escalated is True

    # Threshold 5: P2 -> P0
    p, escalated = compute_priority_escalation(PriorityTier.P2_MEDIUM, impact_score=5)
    assert p == PriorityTier.P0_CRITICAL
    assert escalated is True

    # Threshold 5: P1 -> P0
    p, escalated = compute_priority_escalation(PriorityTier.P1_HIGH, impact_score=5)
    assert p == PriorityTier.P0_CRITICAL
    assert escalated is True


def test_default_demo_dedup_fallback():
    """Verify rule-based fallback accurately identifies same-defect candidates within 100m."""
    candidate = DedupCandidateSummary(
        incident_id="CS-BLR-1001",
        title="Broken Streetlight on 12th Main",
        category=CivicCategory.ELECTRICITY_LIGHTING,
        priority=PriorityTier.P2_MEDIUM,
        description="Sodium vapor streetlight is flickering and dark near junction.",
        landmark="Opposite 12th Main Cafe",
        distance_meters=42.0,
        community_impact_score=1,
        created_at="2026-11-21T00:00:00Z",
    )

    # 1. Same category streetlight report 42m away -> Duplicate
    new_report_match = {
        "title": "Street light not functioning",
        "category": CivicCategory.ELECTRICITY_LIGHTING,
        "description": "Pole streetlight completely blacked out",
        "landmark": "12th main road",
    }
    res_match = get_default_demo_dedup_fallback(new_report_match, [candidate])
    assert res_match.is_duplicate is True
    assert res_match.matched_incident_id == "CS-BLR-1001"

    # 2. Different category (Garbage dump) at same location -> NOT Duplicate
    new_report_diff = {
        "title": "Garbage dump near junction",
        "category": CivicCategory.SANITATION_WASTE,
        "description": "Overflowing waste bin attracting stray cattle",
        "landmark": "Opposite 12th Main Cafe",
    }
    res_diff = get_default_demo_dedup_fallback(new_report_diff, [candidate])
    assert res_diff.is_duplicate is False
    assert res_diff.matched_incident_id is None


@pytest.mark.asyncio
async def test_section_4_dedup_acceptance_criteria():
    """
    Acceptance Criteria for Section 4:
    Submitting two reports for a broken streetlight within 50m correctly links both
    under 1 Master Incident with community_impact_score = 2.
    """
    repo = get_repository()
    # Reset in-memory repo for clean test isolation
    await repo.reset_demo_data([])

    # Mock Gemini deduplication comparator
    with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
        # Report 1: Initial report
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            req1 = {
                "title": "Broken Streetlight on 12th Main",
                "description_standardized_en": "Sodium streetlight is dark on 12th main road.",
                "category": "Electricity & Lighting",
                "priority": "P2_MEDIUM",
                "agency": "DISCOM_ELECTRICAL",
                "ward_id": "Ward 14 - Indiranagar",
                "lat": 12.9716,
                "lng": 77.6412,
                "landmark": "Near 12th Main Corner",
                "citizen_contact": "+91-9876543210",
            }
            res1 = await ac.post("/api/intake/submit", json=req1)
            assert res1.status_code == 200
            data1 = res1.json()
            assert data1["is_duplicate"] is False
            assert data1["community_impact_score"] == 1
            master_id_1 = data1["master_incident_id"]
            assert master_id_1.startswith("CS-BLR-")

            # Report 2: Second report ~40m away (lat + 0.00035) for the same streetlight
            # Configure mock Gemini to confirm duplicate match
            mock_gemini.return_value = DedupComparisonResponse(
                is_duplicate=True,
                matched_incident_id=master_id_1,
                similarity_reason="Both reports refer to the dark sodium streetlight on 12th Main.",
                confidence=0.98,
            )

            req2 = {
                "title": "Street light pole off",
                "description_standardized_en": "No light on 12th main, pitch dark.",
                "category": "Electricity & Lighting",
                "priority": "P2_MEDIUM",
                "agency": "DISCOM_ELECTRICAL",
                "ward_id": "Ward 14 - Indiranagar",
                "lat": 12.97195,  # ~38m away
                "lng": 77.6412,
                "landmark": "12th Main Junction",
                "citizen_contact": "+91-9123456789",
            }
            res2 = await ac.post("/api/intake/submit", json=req2)
            assert res2.status_code == 200
            data2 = res2.json()
            assert data2["is_duplicate"] is True
            assert data2["master_incident_id"] == master_id_1
            assert data2["community_impact_score"] == 2
            assert data2["supporter_number"] == 2
            assert "You are supporter #2" in data2["message_to_citizen"]

            # Verify Master Incident in repository has both report IDs
            inc_res = await ac.get(f"/api/incidents/{master_id_1}")
            assert inc_res.status_code == 200
            inc_data = inc_res.json()
            assert inc_data["community_impact_score"] == 2
            assert len(inc_data["citizen_report_ids"]) == 2

            # Verify linked citizen reports endpoint
            rep_res = await ac.get(f"/api/incidents/{master_id_1}/reports")
            assert rep_res.status_code == 200
            reports_list = rep_res.json()
            assert len(reports_list) == 2


@pytest.mark.asyncio
async def test_duplicate_check_and_crowd_upvote_endpoints():
    """Verify /api/intake/check-duplicate and /api/incidents/{id}/upvote endpoints."""
    repo = get_repository()
    await repo.reset_demo_data([])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create an incident
        init_res = await ac.post(
            "/api/intake/submit",
            json={
                "title": "Open Drain overflowing",
                "description_standardized_en": "Sewage water leaking across road.",
                "category": "Water & Drainage",
                "priority": "P2_MEDIUM",
                "agency": "WATER_SEWERAGE_BOARD",
                "ward_id": "Ward 14 - Indiranagar",
                "lat": 12.9750,
                "lng": 77.6400,
            },
        )
        assert init_res.status_code == 200
        incident_id = init_res.json()["master_incident_id"]

        # Check duplicate at ~30m
        with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = DedupComparisonResponse(
                is_duplicate=True,
                matched_incident_id=incident_id,
                similarity_reason="Matching sewage leakage.",
                confidence=0.95,
            )
            check_res = await ac.post(
                "/api/intake/check-duplicate",
                json={
                    "lat": 12.9752,
                    "lng": 77.6400,
                    "category": "Water & Drainage",
                    "title": "Drain leak",
                },
            )
            assert check_res.status_code == 200
            check_data = check_res.json()
            assert check_data["has_duplicate"] is True
            assert check_data["matched_incident_id"] == incident_id

        # Test crowd upvote endpoint
        upvote_res = await ac.post(f"/api/incidents/{incident_id}/upvote")
        assert upvote_res.status_code == 200
        assert upvote_res.json()["community_impact_score"] == 2
