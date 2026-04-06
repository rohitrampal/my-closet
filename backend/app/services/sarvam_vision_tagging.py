"""
Sarvam AI for garment tags.

Sarvam's chat API expects ``messages[].content`` as a **string**, not OpenAI-style multimodal
parts, so we use local pixel hints (:func:`ai_tagging._vision_tags`) + JSON-only text completion.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings
from app.services import ai_tagging as ai_tagging_mod
from app.services.gemini_tagging import (
    _gemini_confidence,
    _normalize_result,
    _parse_json_object,
)
from app.services.vision_openai_multimodal_http import post_chat_completions_text

logger = logging.getLogger(__name__)

_TEXT_FALLBACK_WRAPPER = """You are helping tag a clothing item for a wardrobe app.
Pixel-level hints (no camera image in this request): dominant color ~ "{color}", style hint ~ "{style}", type guess ~ "{ctype}".

Return ONLY valid JSON with exactly these keys:
"type": one of ["top","bottom","dress","footwear","outerwear","accessory"],
"color": single word (main color),
"style": one of ["casual","formal","party","ethnic","sporty"]

Use hints when sensible; correct obvious conflicts."""


def analyze_image_bytes(image_bytes: bytes, *, timeout: float) -> dict[str, Any] | None:
    settings = get_settings()
    key = (settings.SARVAM_API_KEY or "").strip()
    if not key:
        return None

    base = (settings.SARVAM_BASE_URL or "https://api.sarvam.ai/v1").rstrip("/")
    text_model = (settings.SARVAM_MODEL or "sarvam-30b").strip()

    try:
        hints = ai_tagging_mod._vision_tags(image_bytes)
    except Exception:
        hints = {"type": "", "color": "", "style": ""}
    input_bytes = len(image_bytes)
    fallback_prompt = _TEXT_FALLBACK_WRAPPER.format(
        color=(hints.get("color") or "unknown").replace('"', "'"),
        style=(hints.get("style") or "unknown").replace('"', "'"),
        ctype=(hints.get("type") or "unknown").replace('"', "'"),
    )
    text = post_chat_completions_text(
        base_url=base,
        api_key=key,
        model=text_model,
        user_text=fallback_prompt,
        timeout=timeout,
        try_json_response_format=True,
    )
    if not text:
        logger.debug("Sarvam text tagging empty", extra={"input_bytes": input_bytes})
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
