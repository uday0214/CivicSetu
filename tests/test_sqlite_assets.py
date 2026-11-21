"""Automated Test Suite for Lightweight SQLite Database and Media Assets."""

import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.storage.sqlite_store import get_sqlite_repository


@pytest.mark.asyncio
async def test_sqlite_repository_crud():
    repo = get_sqlite_repository()
    test_id = f"CS-TEST-{uuid.uuid4().hex[:6].upper()}"

    # 1. Create incident conforming to MasterIncident schema
    created = await repo.create_incident({
        "incident_id": test_id,
        "title": "Severe Pothole on 100 Feet Road",
        "description_standardized_en": "Large deep pothole endangering two-wheelers near Sony Signal.",
        "category": "Roads & Footpaths",
        "priority": "P2_MEDIUM",
        "status": "TRIAGED",
        "ward_id": "Ward 84 - Koramangala",
        "agency": "ULB_MUNICIPAL",
        "location": {"lat": 12.9352, "lng": 77.6245, "landmark": "Near Sony Signal"},
        "lat": 12.9352,
        "lng": 77.6245,
        "landmark": "Near Sony Signal",
        "community_impact_score": 1,
        "citizen_report_ids": ["CR-TEST-1"],
        "created_at": "2026-11-21T10:00:00Z",
        "updated_at": "2026-11-21T10:00:00Z",
        "sla_deadline": "2026-11-23T10:00:00Z",
        "escalation_tier": "LEVEL_1_WARD_JE",
        "before_media_urls": ["/uploads/test_pothole.jpg"],
    })
    assert created["incident_id"] == test_id

    # 2. Get incident
    fetched = await repo.get_incident(test_id)
    assert fetched is not None
    assert fetched["title"] == "Severe Pothole on 100 Feet Road"

    # 3. Update incident
    updated = await repo.update_incident(test_id, {"status": "IN_PROGRESS", "assigned_crew": "Koramangala Ward Crew 3"})
    assert updated["status"] == "IN_PROGRESS"
    assert updated["assigned_crew"] == "Koramangala Ward Crew 3"

    # 4. List incidents
    incidents = await repo.list_incidents(ward_id="Ward 84 - Koramangala", limit=10)
    assert any(inc["incident_id"] == test_id for inc in incidents)

    # Clean up test incident to prevent polluting analytics KPI tests
    with repo._get_connection() as conn:
        conn.execute("DELETE FROM incidents WHERE incident_id = ?", (test_id,))
        conn.commit()
    repo._sync_to_json_cache()


@pytest.mark.asyncio
async def test_assets_database_and_endpoints():
    repo = get_sqlite_repository()
    asset_id = f"asset_{uuid.uuid4().hex[:8]}"

    # Record an asset in the database
    asset = await repo.record_asset({
        "asset_id": asset_id,
        "filename": "pothole_evidence.jpg",
        "file_url": f"/uploads/{asset_id}.jpg",
        "file_path": f"backend/uploads/{asset_id}.jpg",
        "mime_type": "image/jpeg",
        "size_bytes": 1048576, # 1 MB
        "asset_type": "photo",
        "incident_id": "CS-BLR-1042",
        "uploaded_by": "citizen@bengaluru.in",
    })
    assert asset["asset_id"] == asset_id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # List assets
        res_list = await ac.get("/api/assets")
        assert res_list.status_code == 200
        assets = res_list.json()
        assert len(assets) > 0
        assert any(a["asset_id"] == asset_id for a in assets)

        # Get specific asset
        res_single = await ac.get(f"/api/assets/{asset_id}")
        assert res_single.status_code == 200
        assert res_single.json()["filename"] == "pothole_evidence.jpg"

        # Asset stats
        res_stats = await ac.get("/api/assets/stats")
        assert res_stats.status_code == 200
        stats = res_stats.json()
        assert stats["total_assets"] >= 1
        assert stats["total_bytes"] > 0
