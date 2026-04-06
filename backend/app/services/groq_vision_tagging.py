"""Groq OpenAI-compatible vision for garment JSON tags."""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.services.gemini_tagging import (
    _PROMPT,
    _gemini_confidence,
    _normalize_result,
    _parse_json_object,
    _prepare_image_for_gemini,
)
from app.services.vision_openai_multimodal_http import post_chat_completions_vision

logger = logging.getLogger(__name__)

# Groq retired preview vision models (see https://console.groq.com/docs/deprecations).
_DEPRECATED_GROQ_VISION_MODELS: dict[str, str] = {
    "llama-3.2-11b-vision-preview": "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.2-90b-vision-preview": "meta-llama/llama-4-scout-17b-16e-instruct",
}


def analyze_image_bytes(image_bytes: bytes, *, timeout: float) -> dict[str, Any] | None:
    settings = get_settings()
    key = (settings.GROQ_API_KEY or "").strip()
    if not key:
        return None

    prepared = _prepare_image_for_gemini(image_bytes)
    if prepared is None:
        return None
    _pil, input_bytes, jpeg_bytes = prepared
    model = (settings.GROQ_VISION_MODEL or "").strip() or "meta-llama/llama-4-scout-17b-16e-instruct"
    model = _DEPRECATED_GROQ_VISION_MODELS.get(model, model)
    base = (settings.GROQ_BASE_URL or "https://api.groq.com/openai/v1").rstrip("/")

    text = post_chat_completions_vision(
        base_url=base,
        api_key=key,
        model=model,
        prompt=_PROMPT,
        jpeg_bytes=jpeg_bytes,
        timeout=timeout,
        try_json_response_format=True,
    )
    if not text:
        logger.debug("Groq vision empty response", extra={"model": model, "input_bytes": input_bytes})
        return None

    parsed = _parse_json_object(text)
    if not parsed:
        return None
    normalized = _normalize_result(parsed)
    if not normalized:
        return None

    confidence = _gemini_confidence(normalized)
    return {
        "type": normalized["type"],
        "color": normalized["color"],
        "style": normalized["style"],
        "confidence": confidence,
    }
