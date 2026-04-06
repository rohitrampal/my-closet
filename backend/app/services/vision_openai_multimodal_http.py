"""OpenAI-style POST /chat/completions with one text + one image (data URL). Used by Groq, HF router, etc."""

from __future__ import annotations

import base64
import logging
from typing import Any

import httpx

from app.core.logging_config import log_extra

logger = logging.getLogger(__name__)


def _assistant_content_str(content: Any) -> str | None:
    """Normalize ``choices[0].message.content`` (str or multimodal list) to a single string."""
    if content is None:
        return None
    if isinstance(content, str):
        s = content.strip()
        return s or None
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict):
                if str(block.get("type") or "") == "text":
                    parts.append(str(block.get("text") or ""))
                elif "text" in block:
                    parts.append(str(block["text"] or ""))
            elif isinstance(block, str):
                parts.append(block)
        s = "".join(parts).strip()
        return s or None
    s = str(content).strip()
    return s or None


def post_chat_completions_vision(
    *,
    base_url: str,
    api_key: str,
    model: str,
    prompt: str,
    jpeg_bytes: bytes,
    timeout: float,
    extra_headers: dict[str, str] | None = None,
    try_json_response_format: bool = True,
) -> str | None:
    """
    Return assistant message ``content`` string, or ``None`` on HTTP/parse failure.

    ``base_url`` should be like ``https://api.groq.com/openai/v1`` (no trailing slash).
    """
    root = base_url.rstrip("/")
    url = f"{root}/chat/completions"
    b64 = base64.standard_b64encode(jpeg_bytes).decode("ascii")
    data_url = f"data:image/jpeg;base64,{b64}"

    body: dict[str, Any] = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        "max_tokens": 256,
        "temperature": 0.2,
    }
    if try_json_response_format:
        body["response_format"] = {"type": "json_object"}

    headers: dict[str, str] = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.post(url, json=body, headers=headers)
            # Groq / HF / Sarvam often reject ``response_format: json_object`` on vision without
            # mentioning it in the error body — retry once without it.
            if r.status_code == 400 and try_json_response_format and "response_format" in body:
                body.pop("response_format", None)
                r = client.post(url, json=body, headers=headers)
            if r.status_code >= 400:
                logger.warning(
                    "vision chat completions HTTP error",
                    extra=log_extra(
                        url_host=root.split("://", 1)[-1].split("/")[0],
                        status_code=r.status_code,
                        body_preview=(r.text or "")[:400],
                    ),
                )
                return None
            payload = r.json()
    except httpx.TimeoutException:
        logger.warning(
            "vision chat completions timeout",
            extra=log_extra(url_host=root.split("://", 1)[-1].split("/")[0], timeout_sec=timeout),
        )
        return None
    except Exception:
        logger.debug("vision chat completions request failed", exc_info=True)
        return None

    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    msg = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(msg, dict):
        return None
    return _assistant_content_str(msg.get("content"))


def post_chat_completions_text(
    *,
    base_url: str,
    api_key: str,
    model: str,
    user_text: str,
    timeout: float,
    extra_headers: dict[str, str] | None = None,
    try_json_response_format: bool = True,
) -> str | None:
    """Text-only chat completion (Sarvam fallback when multimodal is unsupported)."""
    root = base_url.rstrip("/")
    url = f"{root}/chat/completions"
    body: dict[str, Any] = {
        "model": model,
        "messages": [{"role": "user", "content": user_text}],
        "max_tokens": 256,
        "temperature": 0.2,
    }
    if try_json_response_format:
        body["response_format"] = {"type": "json_object"}

    headers: dict[str, str] = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)

    try:
        with httpx.Client(timeout=timeout) as client:
            r = client.post(url, json=body, headers=headers)
            if r.status_code == 400 and try_json_response_format and "response_format" in body:
                body.pop("response_format", None)
                r = client.post(url, json=body, headers=headers)
            if r.status_code >= 400:
                logger.warning(
                    "text chat completions HTTP error",
                    extra=log_extra(
                        url_host=root.split("://", 1)[-1].split("/")[0],
                        status_code=r.status_code,
                        body_preview=(r.text or "")[:400],
                    ),
                )
                return None
            payload = r.json()
    except httpx.TimeoutException:
        logger.warning(
            "text chat completions timeout",
            extra=log_extra(url_host=root.split("://", 1)[-1].split("/")[0], timeout_sec=timeout),
        )
        return None
    except Exception:
        logger.debug("text chat completions failed", exc_info=True)
        return None

    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    msg = choices[0].get("message") if isinstance(choices[0], dict) else None
    if not isinstance(msg, dict):
        return None
    return _assistant_content_str(msg.get("content"))
