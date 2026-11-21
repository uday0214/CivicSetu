"""Tests for OpenRouter API Fallback Service."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from pydantic import BaseModel
import httpx

from backend.config import settings
from backend.services.openrouter_client import OpenRouterClient
from backend.services.gemini_client import GeminiClient


class SampleSchema(BaseModel):
    title: str
    priority: str
    confidence: float


@pytest.mark.asyncio
async def test_openrouter_structured_generation_success():
    client = OpenRouterClient()
    client.api_key = "test-sk-openrouter-dummy"

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": '{"title": "Open Manhole Repaired", "priority": "P0_CRITICAL", "confidence": 0.95}'
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_resp
        res = await client.generate_structured(
            contents="Analyze issue",
            response_schema=SampleSchema,
            system_instruction="You are a triage officer",
        )

        assert isinstance(res, SampleSchema)
        assert res.title == "Open Manhole Repaired"
        assert res.priority == "P0_CRITICAL"
        assert res.confidence == 0.95


@pytest.mark.asyncio
async def test_gemini_auto_fallback_to_openrouter_on_gemini_failure():
    """Verify that when Gemini raises an exception, the client seamlessly falls back to OpenRouter."""
    gemini = GeminiClient()
    gemini._client = MagicMock()
    # Force Gemini generate_content to raise an error
    gemini._client.models.generate_content.side_effect = Exception("503 Service Unavailable / Quota limit")

    fallback_obj = SampleSchema(title="Fallback Issue", priority="P1_HIGH", confidence=0.88)

    with patch("backend.services.gemini_client.openrouter_client.api_key", "sk-openrouter-test-key"), \
         patch("backend.services.gemini_client.openrouter_client.generate_structured", new_callable=AsyncMock) as mock_openrouter:
        mock_openrouter.return_value = fallback_obj

        result = await gemini.generate_structured(
            contents="Broken streetlight",
            response_schema=SampleSchema,
            system_instruction="Classify defect",
        )

        assert result == fallback_obj
        mock_openrouter.assert_called_once()
