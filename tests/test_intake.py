"""Unit & Integration Tests for Gemini Multimodal Intake & AI Triage."""

import io
import pytest
from httpx import AsyncClient, ASGITransport
from PIL import Image

from unittest.mock import AsyncMock, patch

from backend.main import app
from backend.config import settings
from backend.models.enums import PriorityTier, IndianAgency, CivicCategory
from backend.models.intake import IntakeTriageResponse, IntakeSubmissionResult
from backend.services.intake_service import (
    get_default_demo_triage_fallback,
    triage_intake,
    gemini_client,
)


def create_test_image_bytes(color: str = "red") -> bytes:
    """Helper to generate in-memory dummy JPEG bytes."""
    buf = io.BytesIO()
    img = Image.new("RGB", (200, 200), color=color)
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_intake_triage_schema_valid():
    """Verify IntakeTriageResponse validates a full civic triage result."""
    data = {
        "is_valid_civic_issue": True,
        "language_detected": "hi-Latn (Hinglish)",
        "transcription": "Road pe bada gaddha hai",
        "title": "Severe Pothole on Main Road",
        "description_standardized_en": "Large road defect causing traffic blockage.",
        "category": "Roads & Footpaths",
        "priority": "P1_HIGH",
        "agency": "STATE_PWD",
        "ward_id": "Ward 14 - Indiranagar",
        "extracted_landmark": "Near Indiranagar Metro",
        "triage_trace": {
            "visual_hazard_factors": ["Deep crater in road surface"],
            "vulnerable_proximity": "Near bus stop",
            "monsoon_multiplier": False,
            "jurisdiction_rationale": "State PWD notified arterial route.",
            "confidence_score": 0.95,
        },
        "vernacular_acknowledgement": "आपकी शिकायत दर्ज कर ली गई है।",
    }
    response = IntakeTriageResponse.model_validate(data)
    assert response.is_valid_civic_issue is True
    assert response.priority == PriorityTier.P1_HIGH
    assert response.agency == IndianAgency.STATE_PWD
    assert response.category == CivicCategory.ROADS_FOOTPATHS
    # Verify canonical CONTEXT.md §5.3 fields and backward-compatible aliases
    assert response.landmark_clues == "Near Indiranagar Metro"
    assert response.extracted_landmark == "Near Indiranagar Metro"
    assert response.detected_language == "hi-Latn (Hinglish)"
    assert response.language_detected == "hi-Latn (Hinglish)"
    assert "Deep crater in road surface" in response.visual_hazard_factors
    assert response.confidence_score == 0.95


def test_intake_triage_sanity_gate_rejection():
    """Verify IntakeTriageResponse validates rejected non-civic or blurry input."""
    data = {
        "is_valid_civic_issue": False,
        "rejection_reason": "Image is too dark and blurry to distinguish any road defect.",
        "suggested_user_prompt": "Please take a clear daylight photo of the pothole.",
    }
    response = IntakeTriageResponse.model_validate(data)
    assert response.is_valid_civic_issue is False
    assert response.rejection_reason is not None
    assert response.title is None
    assert response.priority is None


def test_default_demo_triage_fallbacks():
    """Verify deterministic fallbacks cover diverse Indian hazard scenarios."""
    # 1. Electrical Live Wire
    wire_triage = get_default_demo_triage_fallback(text_prompt="Bijli ka wire toota hua hai paani me")
    assert wire_triage.is_valid_civic_issue is True
    assert wire_triage.priority == PriorityTier.P0_CRITICAL
    assert wire_triage.agency == IndianAgency.DISCOM_ELECTRICAL
    assert wire_triage.category == CivicCategory.ELECTRICITY_LIGHTING

    # 2. Market Solid Waste Dump
    garbage_triage = get_default_demo_triage_fallback(text_prompt="Kachra pada hai road pe")
    assert garbage_triage.is_valid_civic_issue is True
    assert garbage_triage.priority == PriorityTier.P2_MEDIUM
    assert garbage_triage.agency == IndianAgency.ULB_MUNICIPAL
    assert garbage_triage.category == CivicCategory.SANITATION_WASTE

    # 3. Submerged Pothole (Default)
    default_triage = get_default_demo_triage_fallback()
    assert default_triage.is_valid_civic_issue is True
    assert default_triage.priority == PriorityTier.P0_CRITICAL
    assert default_triage.agency == IndianAgency.STATE_PWD
    assert default_triage.category == CivicCategory.ROADS_FOOTPATHS
    assert default_triage.triage_trace.monsoon_multiplier is True
    assert default_triage.monsoon_multiplier_applied is True
    assert default_triage.landmark_clues is not None
    assert default_triage.detected_language == "hi-Latn (Hinglish)"


@pytest.mark.asyncio
async def test_triage_intake_service():
    """Verify triage_intake service execution with text & simulated image."""
    img_bytes = create_test_image_bytes()
    expected_response = get_default_demo_triage_fallback(
        text_prompt="Road pe bada gaddha hai Indiranagar pillar 42 ke paas",
        landmark="Near Metro Pillar 42",
    )

    with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = expected_response
        result = await triage_intake(
            image_bytes=img_bytes,
            image_mime="image/jpeg",
            text_prompt="Road pe bada gaddha hai Indiranagar pillar 42 ke paas",
            lat=12.9716,
            lng=77.6412,
            landmark="Near Metro Pillar 42",
        )
        assert mock_gemini.called
        assert isinstance(result, IntakeTriageResponse)
        assert result.is_valid_civic_issue is True
        assert result.agency in [IndianAgency.STATE_PWD, IndianAgency.ULB_MUNICIPAL]


@pytest.mark.asyncio
async def test_triage_intake_fallback_when_quota_exhausted(monkeypatch):
    """Verify circuit-breaker fallback triggers when Gemini fails and DEMO_FALLBACK_ON_QUOTA is enabled."""
    monkeypatch.setattr(settings, "DEMO_FALLBACK_ON_QUOTA", True)
    with patch.object(gemini_client, "generate_structured", side_effect=RuntimeError("Quota exceeded 429")):
        result = await triage_intake(
            text_prompt="Bijli ka wire toota hua hai",
        )
        assert result.is_valid_civic_issue is True
        assert result.agency == IndianAgency.DISCOM_ELECTRICAL
        assert result.priority == PriorityTier.P0_CRITICAL


@pytest.mark.asyncio
async def test_triage_endpoint_text_and_landmark():
    """Test POST /api/intake/triage with text description and coordinates."""
    expected_response = get_default_demo_triage_fallback(
        text_prompt="Open drainage pipe leaking sewage near hospital",
        landmark="Near ESI Hospital Indiranagar",
    )
    with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = expected_response
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post(
                "/api/intake/triage",
                data={
                    "text": "Open drainage pipe leaking sewage near hospital",
                    "lat": "12.9716",
                    "lng": "77.6412",
                    "landmark": "Near ESI Hospital Indiranagar",
                },
            )
    assert response.status_code == 200
    data = response.json()
    assert "triage" in data
    triage = data["triage"]
    assert triage["is_valid_civic_issue"] is True
    assert triage["priority"] in ["P0_CRITICAL", "P1_HIGH", "P2_MEDIUM"]


@pytest.mark.asyncio
async def test_triage_endpoint_with_image_upload():
    """Test POST /api/intake/triage with multipart photo upload."""
    img_bytes = create_test_image_bytes("blue")
    files = {
        "photo": ("test_pothole.jpg", io.BytesIO(img_bytes), "image/jpeg"),
    }
    data = {
        "text": "Deep pothole filled with rain water",
        "landmark": "100 Feet Road",
    }
    expected_response = get_default_demo_triage_fallback(
        text_prompt="Deep pothole filled with rain water",
        landmark="100 Feet Road",
    )

    with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = expected_response
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/intake/triage", data=data, files=files)

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["photo_url"] is not None
    assert res_data["photo_url"].startswith("/uploads/")
    assert res_data["triage"]["is_valid_civic_issue"] is True


@pytest.mark.asyncio
async def test_triage_endpoint_with_audio_upload():
    """Test POST /api/intake/triage with audio note upload (audio/webm)."""
    dummy_audio = b"\x1aE\xdf\xa3webm_dummy_audio_bytes"
    files = {
        "audio": ("voice_note.webm", io.BytesIO(dummy_audio), "audio/webm"),
    }
    expected_response = get_default_demo_triage_fallback(
        text_prompt="Pothole complaint recorded in Hindi audio",
    )

    with patch.object(gemini_client, "generate_structured", new_callable=AsyncMock) as mock_gemini:
        mock_gemini.return_value = expected_response
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            response = await ac.post("/api/intake/triage", files=files)

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["audio_url"] is not None
    assert res_data["audio_url"].startswith("/uploads/")
    assert res_data["triage"]["is_valid_civic_issue"] is True


@pytest.mark.asyncio
async def test_triage_endpoint_empty_input_fails():
    """Test POST /api/intake/triage returns 400 when no input modality is provided."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post("/api/intake/triage", data={})
    assert response.status_code == 400
    assert "At least one input modality" in response.json()["detail"]
