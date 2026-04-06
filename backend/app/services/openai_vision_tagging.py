"""
OpenAI-compatible vision tagging for garments (fallback when Gemini is off or errors).

Uses the same prompt and normalization as :mod:`app.services.gemini_tagging`.
Requires ``OPENAI_API_KEY`` and a vision-capable model (default ``gpt-4o-mini``).
"""

from __future__ import annotations

import base64
import hashlib
import logging
from typing import Any

import httpx

from app.config import get_settings
from app.core.logging_config import log_extra
from app.services.gemini_tagging import (
    _PROMPT,
    _gemini_confidence,
    _normalize_result,
    _parse_json_object,
    _prepare_image_for_gemini,
)
from app.services.memory_cache import openai_image_tag_cache

logger = logging.getLogger(__name__)

_CACHE_KEY_PREFIX = "oa:"


def _invoke_openai_vision(image_bytes: bytes) -> dict[str, str] | None:
    settings = get_settings()
    key = (settings.OPENAI_API_KEY or "").strip()
    if not key:
        return None

    prepared = _prepare_image_for_gemini(image_bytes)
    if prepared is None:
        return None
    _pil, input_bytes, jpeg_bytes = prepared

    model = (settings.OPENAI_VISION_MODEL or settings.OPENAI_MODEL or "gpt-4o-mini").strip()
    base = (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/")
    url = f"{base}/chat/completions"

    b64 = base64.standard_b64encode(jpeg_bytes).decode("ascii")
    data_url = f"data:image/jpeg;base64,{b64}"

    body: dict[str, Any] = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": _PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        "max_tokens": 256,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    try:
        with httpx.Client(timeout=90.0) as client:
            r = client.post(url, json=body, headers=headers)
            if r.status_code == 400 and "response_format" in (r.text or "").lower():
                body_retry = {k: v for k, v in body.items() if k != "response_format"}
                r = client.post(url, json=body_retry, headers=headers)
            if r.status_code >= 400:
                logger.warning(
                    "OpenAI vision HTTP error",
                    extra=log_extra(
                        status_code=r.status_code,
                        model=model,
                        input_bytes=input_bytes,
                        jpeg_bytes=len(jpeg_bytes),
                        body_preview=(r.text or "")[:300],
                    ),
                )
                return None
            payload = r.json()
    except Exception:
        logger.error("OpenAI vision tagging failed", exc_info=True)
        return None

    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        logger.warning(
            "OpenAI vision empty choices",
            extra=log_extra(model=model, input_bytes=input_bytes),
        )
        return None
    msg = choices[0].get("message") if isinstance(choices[0], dict) else None
    text = ""
    if isinstance(msg, dict):
        text = str(msg.get("content") or "").strip()

    if not text:
        logger.warning(
            "OpenAI vision no text",
            extra=log_extra(model=model, input_bytes=input_bytes),
        )
        return None

    parsed = _parse_json_object(text)
    if not parsed:
        logger.warning(
            "OpenAI vision invalid JSON",
            extra=log_extra(
                model=model,
                input_bytes=input_bytes,
                response_preview=text[:200],
            ),
        )
        return None

    normalized = _normalize_result(parsed)
    if not normalized:
        logger.warning(
            "OpenAI vision normalize empty",
            extra=log_extra(model=model, input_bytes=input_bytes),
        )
        return None

    return normalized


def analyze_image_bytes(image_bytes: bytes) -> dict[str, Any] | None:
    """
    Return ``type``, ``color``, ``style``, ``confidence`` from OpenAI vision, or ``None``.
    """
    settings = get_settings()
    if not (settings.OPENAI_API_KEY or "").strip():
        logger.info(
            "OpenAI vision skipped",
            extra=log_extra(
                openai_vision_used=False,
                fallback_triggered=False,
                reason="no_api_key",
            ),
        )
        return None

    cache_key = _CACHE_KEY_PREFIX + hashlib.sha256(image_bytes).hexdigest()
    hit = openai_image_tag_cache.get(cache_key)
    if hit is not None and isinstance(hit, dict):
        logger.info(
            "OpenAI vision cache hit",
            extra=log_extra(
                openai_vision_used=True,
                cache_hit=True,
                confidence=hit.get("confidence"),
            ),
        )
        return {
            "type": str(hit["type"]),
            "color": str(hit["color"]),
            "style": str(hit["style"]),
            "confidence": float(hit["confidence"]),
        }

    normalized = _invoke_openai_vision(image_bytes)
    if normalized is None:
        return None

    confidence = _gemini_confidence(normalized)
    payload = {
        "type": normalized["type"],
        "color": normalized["color"],
        "style": normalized["style"],
        "confidence": confidence,
    }
    openai_image_tag_cache.set(cache_key, dict(payload))

    logger.info(
        "OpenAI vision success",
        extra=log_extra(
            openai_vision_used=True,
            cache_hit=False,
            confidence=confidence,
            suggested_type=payload.get("type") or None,
        ),
    )
    return payload
