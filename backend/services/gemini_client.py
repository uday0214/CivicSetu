"""Gemini API Client Helper with Resilience & 429 Circuit Breaker."""

import logging
import asyncio
from typing import Any, Optional, Type, TypeVar
from pydantic import BaseModel
from google import genai
from google.genai import types

from backend.config import settings

logger = logging.getLogger("civicsetu.gemini")

T = TypeVar("T", bound=BaseModel)


class GeminiClient:
    """Wrapper around official google-genai client with retry & demo quota circuit-breaker."""

    def __init__(self):
        self._client: Optional[genai.Client] = None
        self._init_client()

    def _init_client(self):
        if settings.GEMINI_API_KEY:
            try:
                # v1beta is required for developer/system_instruction and structured response_schema
                self._client = genai.Client(
                    api_key=settings.GEMINI_API_KEY,
                    http_options={"api_version": "v1beta"}
                )
                logger.info(f"Initialized Google GenAI client (v1beta) with model: {settings.GEMINI_MODEL}")
            except Exception as e:
                logger.warning(f"Failed to initialize Google GenAI client: {e}")
                self._client = None
        else:
            logger.info("GEMINI_API_KEY not set. Gemini client will run in fallback mode if DEMO_FALLBACK_ON_QUOTA is enabled.")

    @property
    def is_configured(self) -> bool:
        return self._client is not None

    async def generate_structured(
        self,
        contents: Any,
        response_schema: Type[T],
        system_instruction: Optional[str] = None,
        fallback_data: Optional[T] = None,
    ) -> T:
        """
        Generate structured output from Gemini using native response_schema.
        Includes 1-retry backoff and circuit-breaker fallback for demo reliability.
        """
        if not self._client:
            if settings.DEMO_FALLBACK_ON_QUOTA and fallback_data is not None:
                logger.warning("Gemini client not configured. Returning deterministic demo fallback.")
                return fallback_data
            raise RuntimeError("Gemini API key is not configured and no demo fallback was provided.")

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=response_schema,
            system_instruction=system_instruction,
        )

        for attempt in range(2):  # 1 initial try + 1 retry
            try:
                # google-genai generate_content call
                response = self._client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=contents,
                    config=config,
                )
                
                # google-genai parses directly into parsed if response_schema is provided
                if hasattr(response, "parsed") and response.parsed is not None:
                    return response.parsed
                
                # Fallback parse via pydantic if response.text returned json string
                if response.text:
                    return response_schema.model_validate_json(response.text)
                
                raise ValueError("Empty response received from Gemini.")

            except Exception as exc:
                is_rate_limit = "429" in str(exc) or "ResourceExhausted" in str(exc)
                logger.warning(f"Gemini API attempt {attempt + 1} failed: {exc}")
                
                # If API endpoint rejects developer instructions, inline into contents and retry
                if "Developer instruction" in str(exc) and config.system_instruction:
                    logger.info("Retrying without separate Developer instruction config (inlining to prompt)")
                    config.system_instruction = None
                    if isinstance(contents, list):
                        contents = [f"System Instruction:\n{system_instruction}\n"] + contents
                    else:
                        contents = f"System Instruction:\n{system_instruction}\n\nContent:\n{contents}"
                    continue

                if attempt == 0 and not is_rate_limit:
                    await asyncio.sleep(1.0)
                    continue
                
                if is_rate_limit and settings.DEMO_FALLBACK_ON_QUOTA and fallback_data is not None:
                    logger.warning("429 Quota exhausted. Triggering demo fallback circuit-breaker.")
                    return fallback_data
                
                if settings.DEMO_FALLBACK_ON_QUOTA and fallback_data is not None:
                    logger.warning("Gemini error occurred. Triggering demo fallback circuit-breaker.")
                    return fallback_data
                
                raise exc

        raise RuntimeError("Failed to generate content after retry.")


gemini_client = GeminiClient()
