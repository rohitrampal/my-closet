"""
Gemini Vision tagging for garment images (type, color, style).

Used by POST /clothes/analyze with fallback to :mod:`app.services.ai_tagging`.
Caches successful Gemini results by SHA-256 of input bytes (~10 min TTL).
"""

from __future__ import annotations

import base64
import hashlib
import io
import json
import logging
import re
from typing import Any

from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from PIL import Image

from app.config import get_settings
from app.core.logging_config import log_extra
from app.models.clothes import ClothesType
from app.services.memory_cache import gemini_image_tag_cache

logger = logging.getLogger(__name__)

_MAX_IMAGE_BYTES = 5 * 1024 * 1024
_MAX_GEMINI_WIDTH_PX = 512
_JPEG_QUALITY = 65  # ~0.65 on Pillow's 1–95 scale

_CACHE_KEY_PREFIX = "g1:"

_VALID_TYPES = {m.value for m in ClothesType}
_ALLOWED_STYLES = frozenset({"casual", "formal", "party", "ethnic", "sporty"})

_PROMPT = """Analyze this clothing item image.

Return ONLY JSON:

{
"type": one of ["top","bottom","dress","footwear","outerwear","accessory"],
"color": main visible color (single word),
"style": one of ["casual","formal","party","ethnic","sporty"]
}

Be accurate. If unclear, return best guess."""


def _parse_json_object(text: str) -> dict[str, Any] | None:
    s = text.strip()
    if s.startswith("```"):
        s = re.sub(r"^```(?:json)?\s*", "", s, flags=re.IGNORECASE)
        s = re.sub(r"\s*```\s*$", "", s)
    try:
        obj = json.loads(s)
        return obj if isinstance(obj, dict) else None
    except json.JSONDecodeError:
        m = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", s, re.DOTALL)
        if m:
            try:
                obj = json.loads(m.group())
                return obj if isinstance(obj, dict) else None
            except json.JSONDecodeError:
                return None
        return None


def _normalize_style(raw: str) -> str:
    s = raw.strip().lower()
    if s in _ALLOWED_STYLES:
        return s
    if "sport" in s or "athletic" in s or "gym" in s:
        return "sporty"
    if "formal" in s or "business" in s or "office" in s:
        return "formal"
    if "party" in s or "evening" in s:
        return "party"
    if "ethnic" in s or "traditional" in s:
        return "ethnic"
    if "casual" in s or "classic" in s or "everyday" in s:
        return "casual"
    return ""


def _normalize_color_single_word(raw: str) -> str:
    s = str(raw).strip().lower()
    if not s:
        return ""
    first = s.replace(",", " ").split()[0]
    return first.strip() or ""


def _normalize_result(raw: dict[str, Any]) -> dict[str, str] | None:
    t = str(raw.get("type", "")).strip().lower().replace(" ", "_").replace("-", "_")
    if t not in _VALID_TYPES:
        t = ""
    color = _normalize_color_single_word(str(raw.get("color", "")))
    style = _normalize_style(str(raw.get("style", "")))
    if not t and not color and not style:
        return None
    return {"type": t, "color": color, "style": style}


def _gemini_confidence(normalized: dict[str, str]) -> float:
    """Valid Gemini parse: 0.75–0.9; higher when type, color, and style are all non-empty."""
    t = (normalized.get("type") or "").strip()
    c = (normalized.get("color") or "").strip()
    s = (normalized.get("style") or "").strip()
    filled = sum(1 for x in (t, c, s) if x)
    if filled >= 3:
        return 0.88
    if filled == 2:
        return 0.80
    return 0.76


def _prepare_image_for_gemini(image_bytes: bytes) -> tuple[Image.Image, int, bytes] | None:
    """
    Resize to max width 512px, convert to RGB, re-encode as JPEG (~quality 0.65).

    Returns (PIL image for the Gemini API, original input byte length, re-encoded JPEG ``bytes`` for HTTP/base64 callers).
    """
    if len(image_bytes) > _MAX_IMAGE_BYTES:
        logger.warning(
            "Gemini fallback used",
            extra=log_extra(
                reason="input_too_large",
                gemini_used=False,
                fallback_triggered=True,
                max_bytes=_MAX_IMAGE_BYTES,
                input_bytes=len(image_bytes),
            ),
        )
        return None
    try:
        with Image.open(io.BytesIO(image_bytes)) as im:
            im.load()
            rgb = im.convert("RGB")
            w, h = rgb.size
            if w > _MAX_GEMINI_WIDTH_PX:
                new_h = max(1, int(h * (_MAX_GEMINI_WIDTH_PX / w)))
                rgb = rgb.resize((_MAX_GEMINI_WIDTH_PX, new_h), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            rgb.save(buf, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
            jpeg_bytes = buf.getvalue()
        out = Image.open(io.BytesIO(jpeg_bytes))
        out.load()
        return out.convert("RGB"), len(image_bytes), jpeg_bytes
    except Exception:
        logger.error("Gemini failed", exc_info=True)
        return None


def _invoke_gemini_model(image_bytes: bytes) -> dict[str, str] | None:
    """Call Gemini API; return normalized ``type``/``color``/``style`` or ``None``."""
    settings = get_settings()
    key = (settings.GEMINI_API_KEY or "").strip()
    if not key:
        return None

    prepared = _prepare_image_for_gemini(image_bytes)
    if prepared is None:
        return None
    pil_image, input_bytes, jpeg_encoded = prepared

    model_name = (settings.GEMINI_MODEL or "gemini-2.0-flash").strip()
    client = genai.Client(api_key=key)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[_PROMPT, pil_image],
            config=genai_types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=256,
                response_mime_type="application/json",
            ),
        )
    except Exception as exc:
        code = getattr(exc, "code", None)
        if isinstance(exc, genai_errors.ClientError) and code == 429:
            logger.warning(
                "Gemini quota or rate limit (429); OpenAI/fallback will be used if configured",
                extra=log_extra(
                    model=model_name,
                    hint="Daily free tier may not reset for hours; set GEMINI_DISABLED=true or use OPENAI_API_KEY",
                ),
            )
        else:
            logger.error("Gemini failed", exc_info=True)
        return None

    text = ""
    try:
        text = (response.text or "").strip()
    except Exception:
        logger.warning(
            "Gemini fallback used",
            extra=log_extra(
                reason="no_text_in_response",
                gemini_used=False,
                fallback_triggered=True,
                model=model_name,
                input_bytes=input_bytes,
                jpeg_bytes=len(jpeg_encoded),
            ),
        )
        return None

    if not text:
        logger.warning(
            "Gemini fallback used",
            extra=log_extra(
                reason="empty_model_text",
                gemini_used=False,
                fallback_triggered=True,
                model=model_name,
                input_bytes=input_bytes,
                jpeg_bytes=len(jpeg_encoded),
            ),
        )
        return None

    parsed = _parse_json_object(text)
    if not parsed:
        logger.warning(
            "Gemini fallback used",
            extra=log_extra(
                reason="invalid_json",
                gemini_used=False,
                fallback_triggered=True,
                model=model_name,
                input_bytes=input_bytes,
                jpeg_bytes=len(jpeg_encoded),
                response_preview=text[:200],
            ),
        )
        return None

    normalized = _normalize_result(parsed)
    if not normalized:
        logger.warning(
            "Gemini fallback used",
            extra=log_extra(
                reason="normalize_empty",
                gemini_used=False,
                fallback_triggered=True,
                model=model_name,
                input_bytes=input_bytes,
                jpeg_bytes=len(jpeg_encoded),
            ),
        )
        return None

    return normalized


def analyze_image_bytes(image_bytes: bytes) -> dict[str, Any] | None:
    """
    Return ``type``, ``color``, ``style``, ``confidence`` from Gemini, or ``None`` if disabled/failed.

    Successful responses are cached (key = SHA-256 of ``image_bytes``, TTL ~10 minutes).
    """
    settings = get_settings()
    if not (settings.GEMINI_API_KEY or "").strip():
        logger.info(
            "Gemini skipped",
            extra=log_extra(
                gemini_used=False,
                fallback_triggered=False,
                reason="no_api_key",
            ),
        )
        return None
    if settings.GEMINI_DISABLED:
        logger.info(
            "Gemini skipped",
            extra=log_extra(
                gemini_used=False,
                fallback_triggered=False,
                reason="gemini_disabled",
            ),
        )
        return None

    cache_key = _CACHE_KEY_PREFIX + hashlib.sha256(image_bytes).hexdigest()
    hit = gemini_image_tag_cache.get(cache_key)
    if hit is not None and isinstance(hit, dict):
        logger.info(
            "Gemini cache hit",
            extra=log_extra(
                gemini_used=True,
                fallback_triggered=False,
                cache_hit=True,
                confidence=hit.get("confidence"),
                suggested_type=hit.get("type") or None,
            ),
        )
        return {
            "type": str(hit["type"]),
            "color": str(hit["color"]),
            "style": str(hit["style"]),
            "confidence": float(hit["confidence"]),
        }

    normalized = _invoke_gemini_model(image_bytes)
    if normalized is None:
        return None

    confidence = _gemini_confidence(normalized)
    payload = {
        "type": normalized["type"],
        "color": normalized["color"],
        "style": normalized["style"],
        "confidence": confidence,
    }
    gemini_image_tag_cache.set(cache_key, dict(payload))

    logger.info(
        "Gemini success",
        extra=log_extra(
            gemini_used=True,
            fallback_triggered=False,
            cache_hit=False,
            confidence=confidence,
            suggested_type=payload.get("type") or None,
            suggested_color=payload.get("color") or None,
            suggested_style=payload.get("style") or None,
        ),
    )
    return payload


def analyze_image_url(image_url: str) -> dict[str, Any] | None:
    """Download an image URL and run Gemini tagging; ``None`` on failure or no API key."""
    import httpx

    s = get_settings()
    if not (s.GEMINI_API_KEY or "").strip():
        logger.info(
            "Gemini skipped",
            extra=log_extra(gemini_used=False, fallback_triggered=False, reason="no_api_key"),
        )
        return None
    if s.GEMINI_DISABLED:
        logger.info(
            "Gemini skipped",
            extra=log_extra(gemini_used=False, fallback_triggered=False, reason="gemini_disabled"),
        )
        return None
    try:
        headers = {"User-Agent": "PauuaGeminiTagging/1.0"}
        with httpx.Client(timeout=15.0, follow_redirects=True, headers=headers) as client:
            r = client.get(image_url.strip())
            r.raise_for_status()
            ctype = (r.headers.get("content-type") or "").lower()
            if ctype.startswith("text/") or "application/json" in ctype:
                logger.warning(
                    "Gemini fallback used",
                    extra=log_extra(reason="bad_content_type", gemini_used=False, fallback_triggered=True),
                )
                return None
            data = r.content
    except Exception:
        logger.error("Gemini failed", exc_info=True)
        return None
    if len(data) > _MAX_IMAGE_BYTES:
        logger.warning(
            "Gemini fallback used",
            extra=log_extra(
                reason="url_download_too_large",
                gemini_used=False,
                fallback_triggered=True,
            ),
        )
        return None
    return analyze_image_bytes(data)


def analyze_image_base64(b64: str) -> dict[str, Any] | None:
    """Decode base64 (optional ``data:image/...;base64,`` prefix) and run Gemini."""
    s_cfg = get_settings()
    if not (s_cfg.GEMINI_API_KEY or "").strip():
        logger.info(
            "Gemini skipped",
            extra=log_extra(gemini_used=False, fallback_triggered=False, reason="no_api_key"),
        )
        return None
    if s_cfg.GEMINI_DISABLED:
        logger.info(
            "Gemini skipped",
            extra=log_extra(gemini_used=False, fallback_triggered=False, reason="gemini_disabled"),
        )
        return None
    s = b64.strip()
    if "," in s and s.lower().startswith("data:"):
        s = s.split(",", 1)[1]
    try:
        raw = base64.b64decode(s, validate=False)
    except Exception:
        logger.error("Gemini failed", exc_info=True)
        return None
    return analyze_image_bytes(raw)
