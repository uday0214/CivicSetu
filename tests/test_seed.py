"""
CivicSetu Section 8 Unit Tests: Realistic Bengaluru BBMP Seed Dataset & Reset API.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.models.enums import EscalationTier, IncidentStatus, AuditStatus


@pytest.mark.asyncio
async def test_seed_reset_endpoint():
    """Verify POST /api/seed/reset populates database with 16 incidents."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post("/api/seed/reset")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["incident_count"] == 16


@pytest.mark.asyncio
async def test_seed_cluster_acceptance_criteria():
    """Verify all 6 core demo clusters exist with exact expected properties."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Reset first
        await ac.post("/api/seed/reset")

        # Fetch incidents
        res = await ac.get("/api/incidents?limit=100")
        assert res.status_code == 200
        incidents = {inc["incident_id"]: inc for inc in res.json()}

        # Cluster 1: Overdue P0 submerged manhole -> LEVEL_3_MUNICIPAL_COMMISSIONER
        c1 = incidents.get("CS-BLR-1042")
        assert c1 is not None
        assert c1["priority"] == "P0_CRITICAL"
        assert c1["escalation_tier"] == EscalationTier.LEVEL_3_MUNICIPAL_COMMISSIONER.value
        assert c1["category"] == "Water & Drainage"

        # Cluster 2: Live wire near school gate -> LEVEL_1_WARD_JE
        c2 = incidents.get("CS-BLR-2019")
        assert c2 is not None
        assert c2["priority"] == "P0_CRITICAL"
        assert c2["escalation_tier"] == EscalationTier.LEVEL_1_WARD_JE.value
        assert c2["agency"] == "DISCOM_ELECTRICAL"

        # Cluster 3: Garbage overflow with 4 merged citizen reports
        c3 = incidents.get("CS-BLR-3004")
        assert c3 is not None
        assert c3["community_impact_score"] == 4
        assert len(c3["citizen_report_ids"]) == 4

        # Cluster 4: Pothole corridor
        c4 = incidents.get("CS-BLR-4011")
        assert c4 is not None
        assert c4["priority"] == "P1_HIGH"
        assert c4["status"] == "IN_PROGRESS"

        # Cluster 5: Complete resolved case with verified audit
        c5 = incidents.get("CS-BLR-5022")
        assert c5 is not None
        assert c5["status"] == IncidentStatus.RESOLVED.value
        assert c5["resolution_audit"]["audit_status"] == AuditStatus.VERIFIED_FIXED.value
        assert c5["resolution_audit"]["audit_confidence"] >= 0.95
        assert c5["resolution_audit"]["citizen_reopen_window_expires"] is not None

        # Cluster 6: Rejected audit demo case (unrelated indoor photo)
        c6 = incidents.get("CS-BLR-6033")
        assert c6 is not None
        assert c6["status"] == IncidentStatus.IN_PROGRESS.value
        assert c6["resolution_audit"]["audit_status"] == AuditStatus.REJECTED_MISMATCH.value


@pytest.mark.asyncio
async def test_seed_multilingual_fixtures():
    """Verify vernacular text fixtures are returned for quick-copy demo inputs."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.get("/api/seed/fixtures")
        assert res.status_code == 200
        fixtures = res.json()["fixtures"]
        assert len(fixtures) >= 4
        langs = [f["language"] for f in fixtures]
        assert any("Kannada" in l for l in langs)
        assert any("Hindi" in l for l in langs)
