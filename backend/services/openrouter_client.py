"""OpenRouter API Client Adapter with OpenAI-compatible Chat Completions & Structured JSON.

Acts as an automated transparent fallback when Google Gemini API encounters errors,
network failures, or 429 quota exhaustion.
"""

import logging
import json
import base64
from typing import Any, Dict, List, Optional, Type, TypeVar
import httpx
from pydantic import BaseModel

from backend.config import settings

logger = logging.getLogger("civicsetu.openrouter")

T = TypeVar("T", bound=BaseModel)


class OpenRouterClient:
    """OpenRouter API client supporting multimodal inputs and structured JSON response schemas."""

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.model = settings.OPENROUTER_MODEL
        self.base_url = settings.OPENROUTER_BASE_URL.rstrip("/")

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    @is_configured.setter
    def is_configured(self, val: bool):
        if not val:
            self.api_key = ""
        elif not self.api_key:
            self.api_key = "configured"

    async def generate_structured(
        self,
        contents: Any,
        response_schema: Type[T],
        system_instruction: Optional[str] = None,
    ) -> T:
        """
        Sends structured completion request to OpenRouter API.
        Adapts multimodal input (text, base64 image, audio descriptions) into OpenAI chat messages format.
        Parses and validates response directly into the specified Pydantic schema model.
        """
        if not self.is_configured:
            raise RuntimeError("OPENROUTER_API_KEY is not configured.")

        # Build messages payload
        messages: List[Dict[str, Any]] = []

        # System prompt with strict JSON output schema directive
        schema_json = json.dumps(response_schema.model_json_schema(), indent=2)
        sys_prompt = (
            f"{system_instruction or 'You are an expert AI municipal triage assistant for Indian cities.'}\n\n"
            f"CRITICAL: You MUST respond ONLY with valid JSON conforming strictly to this JSON Schema:\n"
            f"{schema_json}\n"
            f"Do not include markdown codeblocks (```json), commentary, or explanations. Only return the raw JSON object."
        )
        messages.append({"role": "system", "content": sys_prompt})

        # Process user content (text, string prompt, or multimodal parts list)
        user_content_parts: List[Dict[str, Any]] = []

        if isinstance(contents, str):
            user_content_parts.append({"type": "text", "text": contents})
        elif isinstance(contents, list):
            for part in contents:
                if isinstance(part, str):
                    user_content_parts.append({"type": "text", "text": part})
                elif hasattr(part, "inline_data") and part.inline_data:
                    # google-genai Part object with bytes
                    mime = getattr(part.inline_data, "mime_type", "image/jpeg")
                    data_bytes = getattr(part.inline_data, "data", b"")
                    b64_data = base64.b64encode(data_bytes).decode("utf-8")
                    user_content_parts.append({
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64_data}"}
                    })
                elif isinstance(part, dict) and "text" in part:
                    user_content_parts.append(part)
                else:
                    user_content_parts.append({"type": "text", "text": str(part)})
        else:
            user_content_parts.append({"type": "text", "text": str(contents)})

        messages.append({"role": "user", "content": user_content_parts})

        payload = {
            "model": self.model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/uday0214/CivicSetu",
            "X-Title": "CivicSetu Municipal Resolution",
            "Content-Type": "application/json",
        }

        logger.info(f"Dispatching fallback call to OpenRouter API (model: {self.model})")
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=headers,
            )

            if resp.status_code != 200:
                logger.error(f"OpenRouter API error {resp.status_code}: {resp.text}")
                raise RuntimeError(f"OpenRouter API returned {resp.status_code}: {resp.text}")

            res_json = resp.json()
            choices = res_json.get("choices", [])
            if not choices:
                raise ValueError("OpenRouter API returned empty choices.")

            content_raw = choices[0].get("message", {}).get("content", "").strip()

            # Clean markdown formatting if present
            if content_raw.startswith("```json"):
                content_raw = content_raw[7:]
            if content_raw.startswith("```"):
                content_raw = content_raw[3:]
            if content_raw.endswith("```"):
                content_raw = content_raw[:-3]
            content_raw = content_raw.strip()

            # Validate against Pydantic schema
            parsed_data = response_schema.model_validate_json(content_raw)
            logger.info("OpenRouter fallback response successfully validated against schema.")
            return parsed_data


openrouter_client = OpenRouterClient()
