"""Unit & Integration Tests for Closed-Loop AI Verification & Resolution Audit Engine."""

import io
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from PIL import Image

from backend.main import app
from backend.models.enums import AuditStatus, IncidentStatus, PriorityTier, IndianAgency, CivicCategory
from backend.models.audit import ResolutionAuditResponse
from backend.services.audit_service import (
    get_default_demo_audit_fallback,
    gemini_client,
    create_placeholder_before_image,
    process_resolution_submission,
)
from backend.storage.json_store import get_repository
from backend.storage.media_store import get_media_storage
from backend.models.schemas import ResolutionAudit
from pydantic import ValidationError


def create_test_image(color: str = "green") -> bytes:
    """Helper to generate in-memory dummy JPEG bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 200), color=color)
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_default_demo_audit_fallback():
    """Verify deterministic fallback verdicts for genuine vs fraudulent repairs."""
    genuine = get_default_demo_audit_fallback(is_genuine_fix=True)
    assert genuine.audit_status == AuditStatus.VERIFIED_FIXED
    assert genuine.site_match is True
    assert genuine.defect_resolved is True
    assert "asphalted" in genuine.evidence_notes

    fraud = get_default_demo_audit_fallback(is_genuine_fix=False)
    assert fraud.audit_status == AuditStatus.REJECTED_MISMATCH
    assert fraud.site_match is False
    assert fraud.defect_resolved is False
    assert "Location mismatch" in fraud.evidence_notes


@pytest.mark.asyncio
async def test_section_5_resolution_audit_verified_fixed():
    """
    Acceptance Criteria for Section 5 (Genuine Fix):
    Mock test with a patched pothole sets status RESOLVED with audit_status: VERIFIED_FIXED
    and populates 48-hour citizen reopen window.
    """
    repo = get_repository()
    await repo.reset_demo_data([])

    # 1. Create an initial Master Incident with a Before photo
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        storage = get_media_storage()
        before_img = create_test_image("blue")
        before_url = await storage.save_bytes(before_img, "image/jpeg", "before_pothole")

        req = {
            "title": "Severe Pothole on 100 Feet Road",
            "description_standardized_en": "Large hazardous crater in tarmac.",
            "category": "Roads & Footpaths",
            "priority": "P1_HIGH",
            "agency": "STATE_PWD",
            "ward_id": "Ward 14 - Indiranagar",
            "lat": 12.9716,
            "lng": 77.6412,
            "landmark": "Near Metro Pillar 42",
            "photo_url": before_url,
        }
        res_create = await ac.post("/api/intake/submit", json=req)
        assert res_create.status_code == 200
        incident_id = res_create.json()["master_incident_id"]

        # Transition incident to IN_PROGRESS
        await ac.patch(f"/api/incidents/{incident_id}/status", json={"status": "IN_PROGRESS"})

        # 2. Contractor submits 'After' photo showing patched road
        after_img = create_test_image("black")
        files = {
            "photo": ("contractor_fix.jpg", io.BytesIO(after_img), "image/jpeg"),
        }
        data = {
            "contractor_id": "CONTRACTOR-BBMP-88",
            "notes": "Pothole filled with cold mix asphalt and steam rolled.",
        }

        # Mock Gemini auditor returning VERIFIED_FIXED
        with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = ResolutionAuditResponse(
                audit_status=AuditStatus.VERIFIED_FIXED,
                audit_confidence=0.97,
                site_match=True,
                defect_resolved=True,
                evidence_notes="Pothole completely patched with fresh bitumen flush with road surface.",
            )

            res_resolve = await ac.post(f"/api/incidents/{incident_id}/resolve", files=files, data=data)
            assert res_resolve.status_code == 200
            res_data = res_resolve.json()

            # Verify acceptance criteria
            assert res_data["status"] == "RESOLVED"
            assert res_data["audit_status"] == "VERIFIED_FIXED"
            assert res_data["citizen_reopen_window_expires"] is not None
            assert res_data["audit_confidence"] == 0.97

        # 3. Verify Master Incident state in storage
        inc_res = await ac.get(f"/api/incidents/{incident_id}")
        inc = inc_res.json()
        assert inc["status"] == "RESOLVED"
        assert inc["resolution_audit"]["audit_status"] == "VERIFIED_FIXED"
        assert inc["resolution_audit"]["contractor_id"] == "CONTRACTOR-BBMP-88"


@pytest.mark.asyncio
async def test_section_5_resolution_audit_rejected_mismatch():
    """
    Acceptance Criteria for Section 5 (Fraudulent / Shoddy Fix):
    Mock test with an unrelated photo leaves status IN_PROGRESS with
    audit_status: REJECTED_MISMATCH and discrepancy evidence notes.
    """
    repo = get_repository()
    await repo.reset_demo_data([])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        storage = get_media_storage()
        before_img = create_test_image("blue")
        before_url = await storage.save_bytes(before_img, "image/jpeg", "before_drain")

        req = {
            "title": "Broken Drainage Slab",
            "description_standardized_en": "Broken concrete drain slab exposing sewer.",
            "category": "Water & Drainage",
            "priority": "P1_HIGH",
            "agency": "WATER_SEWERAGE_BOARD",
            "ward_id": "Ward 14 - Indiranagar",
            "lat": 12.9720,
            "lng": 77.6415,
            "photo_url": before_url,
        }
        res_create = await ac.post("/api/intake/submit", json=req)
        assert res_create.status_code == 200
        incident_id = res_create.json()["master_incident_id"]

        await ac.patch(f"/api/incidents/{incident_id}/status", json={"status": "IN_PROGRESS"})

        # Submit bogus image (e.g. photo of an indoor office or different street)
        unrelated_img = create_test_image("white")
        files = {
            "photo": ("unrelated_photo.jpg", io.BytesIO(unrelated_img), "image/jpeg"),
        }
        data = {
            "contractor_id": "CONTRACTOR-SHADY-01",
            "notes": "Drain fixed.",
        }

        # Mock Gemini auditor returning REJECTED_MISMATCH
        with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = ResolutionAuditResponse(
                audit_status=AuditStatus.REJECTED_MISMATCH,
                audit_confidence=0.94,
                site_match=False,
                defect_resolved=False,
                evidence_notes="Background shows an indoor tiled room, completely inconsistent with open street drain.",
            )

            res_resolve = await ac.post(f"/api/incidents/{incident_id}/resolve", files=files, data=data)
            assert res_resolve.status_code == 200
            res_data = res_resolve.json()

            # Verify acceptance criteria
            assert res_data["status"] == "IN_PROGRESS"
            assert res_data["audit_status"] == "REJECTED_MISMATCH"
            assert "indoor tiled room" in res_data["evidence_notes"]

        # Verify Master Incident remains IN_PROGRESS
        inc_res = await ac.get(f"/api/incidents/{incident_id}")
        inc = inc_res.json()
        assert inc["status"] == "IN_PROGRESS"
        assert inc["resolution_audit"]["audit_status"] == "REJECTED_MISMATCH"


@pytest.mark.asyncio
async def test_citizen_reopen_window():
    """Verify citizen can reopen a RESOLVED incident within the 48-hour window."""
    repo = get_repository()
    await repo.reset_demo_data([])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        storage = get_media_storage()
        before_img = create_test_image("blue")
        before_url = await storage.save_bytes(before_img, "image/jpeg", "before_light")

        req = {
            "title": "Flickering Streetlight",
            "description_standardized_en": "Streetlight fixture loose and flickering.",
            "category": "Electricity & Lighting",
            "priority": "P2_MEDIUM",
            "agency": "DISCOM_ELECTRICAL",
            "ward_id": "Ward 14 - Indiranagar",
            "lat": 12.9730,
            "lng": 77.6420,
            "photo_url": before_url,
        }
        res_create = await ac.post("/api/intake/submit", json=req)
        incident_id = res_create.json()["master_incident_id"]

        await ac.patch(f"/api/incidents/{incident_id}/status", json={"status": "IN_PROGRESS"})

        # Resolve successfully with audit
        with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
            mock_gemini.return_value = ResolutionAuditResponse(
                audit_status=AuditStatus.VERIFIED_FIXED,
                audit_confidence=0.98,
                site_match=True,
                defect_resolved=True,
                evidence_notes="Light fixture securely mounted and illuminated.",
            )
            files = {"photo": ("fix.jpg", io.BytesIO(create_test_image()), "image/jpeg")}
            await ac.post(f"/api/incidents/{incident_id}/resolve", files=files)

        # Citizen reopens within 48h
        reopen_res = await ac.post(
            f"/api/incidents/{incident_id}/reopen",
            json={
                "citizen_contact": "+91-9876543210",
                "reopen_reason": "Light turned off again after 1 hour, problem persists.",
            },
        )
        assert reopen_res.status_code == 200
        reopen_data = reopen_res.json()
        assert reopen_data["status"] == "REOPENED"

        # Check incident in storage
        inc_res = await ac.get(f"/api/incidents/{incident_id}")
        inc = inc_res.json()
        assert inc["status"] == "REOPENED"
        assert "Light turned off again" in inc["resolution_audit"]["evidence_notes"]


@pytest.mark.asyncio
async def test_media_storage_read_bytes():
    """Verify save_bytes and read_bytes on MediaStorageAdapter (Issue 10)."""
    storage = get_media_storage()
    test_data = b"test binary payload for media store read bytes"
    url = await storage.save_bytes(test_data, "image/jpeg", "unit_test_media")
    assert url.startswith("/uploads/")

    read_data = await storage.read_bytes(url)
    assert read_data == test_data

    # Reading a non-existent URL returns None
    missing = await storage.read_bytes("/uploads/does_not_exist_99999.jpg")
    assert missing is None


def test_resolution_audit_model_validation():
    """Verify ResolutionAudit model validation constraints (Issue 3)."""
    # 1. VERIFIED_FIXED missing reopen window raises validation error
    with pytest.raises(ValidationError) as exc:
        ResolutionAudit(
            before_photo_url="/uploads/before.jpg",
            after_photo_url="/uploads/after.jpg",
            audit_status=AuditStatus.VERIFIED_FIXED,
            audit_confidence=0.95,
            citizen_reopen_window_expires=None,
        )
    assert "citizen_reopen_window_expires is required" in str(exc.value)

    # 2. VERIFIED_FIXED with confidence < 0.8 raises validation error
    with pytest.raises(ValidationError) as exc:
        ResolutionAudit(
            before_photo_url="/uploads/before.jpg",
            after_photo_url="/uploads/after.jpg",
            audit_status=AuditStatus.VERIFIED_FIXED,
            audit_confidence=0.72,
            citizen_reopen_window_expires="2026-11-23T12:00:00+00:00",
        )
    assert "audit_confidence must be >= 0.8" in str(exc.value)

    # 3. VERIFIED_FIXED valid inputs
    valid_audit = ResolutionAudit(
        before_photo_url="/uploads/before.jpg",
        after_photo_url="/uploads/after.jpg",
        audit_status=AuditStatus.VERIFIED_FIXED,
        audit_confidence=0.95,
        citizen_reopen_window_expires="2026-11-23T12:00:00+00:00",
    )
    assert valid_audit.audit_status == AuditStatus.VERIFIED_FIXED

    # 4. REJECTED_MISMATCH without reopen window is completely valid
    rejected = ResolutionAudit(
        before_photo_url="/uploads/before.jpg",
        after_photo_url="/uploads/after.jpg",
        audit_status=AuditStatus.REJECTED_MISMATCH,
        audit_confidence=0.5,
        citizen_reopen_window_expires=None,
    )
    assert rejected.audit_status == AuditStatus.REJECTED_MISMATCH


@pytest.mark.asyncio
async def test_resolve_not_in_progress_fails():
    """Verify /resolve rejects submissions when incident is not IN_PROGRESS (Issue 5)."""
    repo = get_repository()
    await repo.reset_demo_data([])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req = {
            "title": "Unworked Pothole",
            "description_standardized_en": "Freshly reported defect.",
            "category": "Roads & Footpaths",
            "priority": "P2_MEDIUM",
            "agency": "ULB_MUNICIPAL",
            "ward_id": "Ward 14 - Indiranagar",
            "lat": 12.9716,
            "lng": 77.6412,
        }
        res = await ac.post("/api/intake/submit", json=req)
        assert res.status_code == 200
        incident_id = res.json()["master_incident_id"]

        # Incident status is REPORTED, not IN_PROGRESS
        files = {"photo": ("fix.jpg", io.BytesIO(create_test_image()), "image/jpeg")}
        res_resolve = await ac.post(f"/api/incidents/{incident_id}/resolve", files=files)
        assert res_resolve.status_code == 400
        assert "must be IN_PROGRESS" in res_resolve.json()["detail"]


@pytest.mark.asyncio
async def test_reopen_expired_window_fails():
    """Verify /reopen returns 403 Forbidden after the 48-hour window expires (Issue 6)."""
    repo = get_repository()
    await repo.reset_demo_data([])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        req = {
            "title": "Old Solved Defect",
            "description_standardized_en": "Fixed two weeks ago.",
            "category": "Roads & Footpaths",
            "priority": "P2_MEDIUM",
            "agency": "ULB_MUNICIPAL",
            "ward_id": "Ward 14 - Indiranagar",
            "lat": 12.9716,
            "lng": 77.6412,
        }
        res = await ac.post("/api/intake/submit", json=req)
        incident_id = res.json()["master_incident_id"]

        # Directly mock incident as RESOLVED with expired reopen window in storage
        from datetime import datetime, timedelta, timezone
        expired_ts = (datetime.now(timezone.utc) - timedelta(hours=49)).isoformat()
        inc_data = await repo.get_incident(incident_id)
        inc_data["status"] = "RESOLVED"
        inc_data["resolution_audit"] = {
            "before_photo_url": "/uploads/b.jpg",
            "after_photo_url": "/uploads/a.jpg",
            "audit_status": "VERIFIED_FIXED",
            "audit_confidence": 0.95,
            "citizen_reopen_window_expires": expired_ts,
        }
        await repo.update_incident(incident_id, inc_data)

        reopen_res = await ac.post(
            f"/api/incidents/{incident_id}/reopen",
            json={
                "citizen_contact": "+91-9876543210",
                "reopen_reason": "Still broken weeks later",
            },
        )
        assert reopen_res.status_code == 403
        assert "expired" in reopen_res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_audit_missing_before_bytes_fallback_vs_error():
    """Verify fallback placeholder vs RuntimeError when before_bytes is missing (Issue 2)."""
    from backend.config import settings
    repo = get_repository()
    await repo.reset_demo_data([])

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Create incident with NO before photo
        req = {
            "title": "Issue without photo",
            "description_standardized_en": "Reported via text only.",
            "category": "Roads & Footpaths",
            "priority": "P2_MEDIUM",
            "agency": "ULB_MUNICIPAL",
            "ward_id": "Ward 14 - Indiranagar",
            "lat": 12.9716,
            "lng": 77.6412,
        }
        res = await ac.post("/api/intake/submit", json=req)
        incident_id = res.json()["master_incident_id"]
        await ac.patch(f"/api/incidents/{incident_id}/status", json={"status": "IN_PROGRESS"})

        files = {"photo": ("fix.jpg", io.BytesIO(create_test_image()), "image/jpeg")}

        # 1. When DEMO_FALLBACK_ON_QUOTA is False -> raises RuntimeError (HTTP 400 from route)
        with patch.object(settings, "DEMO_FALLBACK_ON_QUOTA", False):
            res_fail = await ac.post(f"/api/incidents/{incident_id}/resolve", files=files)
            assert res_fail.status_code == 400
            assert "Cannot locate original before photo" in res_fail.json()["detail"]

        # 2. When DEMO_FALLBACK_ON_QUOTA is True -> generates synthetic placeholder image and proceeds
        with patch.object(settings, "DEMO_FALLBACK_ON_QUOTA", True):
            with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
                mock_gemini.return_value = ResolutionAuditResponse(
                    audit_status=AuditStatus.VERIFIED_FIXED,
                    audit_confidence=0.95,
                    site_match=True,
                    defect_resolved=True,
                    evidence_notes="Placeholder matched against genuine fix.",
                )
                res_ok = await ac.post(f"/api/incidents/{incident_id}/resolve", files=files)
                assert res_ok.status_code == 200
                assert res_ok.json()["status"] == "RESOLVED"

