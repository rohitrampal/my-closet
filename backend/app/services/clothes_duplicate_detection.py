"""Duplicate/similar garment detection helpers."""

from __future__ import annotations

import base64
import binascii
import io
from urllib.parse import unquote_to_bytes

import httpx
from PIL import Image

from app.models.clothes import Clothes, ClothesType
from app.services.ai_tagging import analyze_image_bytes

_HASH_SIZE = 8
_MAX_RESULTS = 8
_FETCH_TIMEOUT_S = 15.0
_MAX_IMAGE_BYTES = 5 * 1024 * 1024


def _decode_base64_payload(payload: str) -> bytes:
    s = payload.strip()
    if s.startswith("data:") and "," in s:
        s = s.split(",", 1)[1]
    try:
        return base64.b64decode(s, validate=False)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("invalid base64 image") from exc


def _decode_data_url(url: str) -> bytes:
    u = url.strip()
    if not u.startswith("data:"):
        raise ValueError("not a data url")
    comma = u.find(",")
    if comma < 0:
        raise ValueError("invalid data url")
    meta = u[5:comma]
    payload = u[comma + 1 :]
    is_b64 = "base64" in meta.lower()
    if is_b64:
        return _decode_base64_payload(payload)
    return unquote_to_bytes(payload)


def _download_image(url: str) -> bytes:
    u = url.strip()
    if u.startswith("data:"):
        return _decode_data_url(u)
    with httpx.Client(timeout=_FETCH_TIMEOUT_S, follow_redirects=True) as client:
        with client.stream("GET", u) as resp:
            resp.raise_for_status()
            chunks: list[bytes] = []
            total = 0
            for chunk in resp.iter_bytes():
                if not chunk:
                    continue
                total += len(chunk)
                if total > _MAX_IMAGE_BYTES:
                    raise ValueError("image too large")
                chunks.append(chunk)
            return b"".join(chunks)


def _average_hash(raw: bytes) -> int:
    with Image.open(io.BytesIO(raw)) as img:
        gray = img.convert("L").resize((_HASH_SIZE, _HASH_SIZE), Image.Resampling.LANCZOS)
        px = list(gray.getdata())
    avg = sum(px) / len(px)
    out = 0
    for i, p in enumerate(px):
        if p >= avg:
            out |= 1 << i
    return out


def _hamming_distance(a: int, b: int) -> int:
    return (a ^ b).bit_count()


def _resolve_uploaded_type(
    hints: dict[str, str],
    override: ClothesType | None,
) -> ClothesType:
    """Prefer explicit client type; else map analyze_image_bytes hint to enum."""
    if override is not None:
        return override
    raw_t = (hints.get("type") or "").strip().lower()
    if raw_t:
        try:
            return ClothesType(raw_t)
        except ValueError:
            pass
    return ClothesType.TOP


def _score_similarity(
    target_color: str,
    target_style: str,
    target_hash: int,
    candidate: Clothes,
) -> tuple[float, int]:
    """Color + style + perceptual hash (candidates are already same clothing type)."""
    ccolor = (candidate.color or "").strip().lower()
    cstyle = (candidate.style or "").strip().lower()
    score = 0.0
    if target_color and target_color == ccolor:
        score += 0.25
    if target_style and target_style == cstyle:
        score += 0.15

    hdist = 64
    try:
        chash = _average_hash(_download_image(candidate.image_url))
        hdist = _hamming_distance(target_hash, chash)
        score += max(0.0, (12 - float(hdist)) / 12.0) * 0.45
    except Exception:
        pass
    return score, hdist


def detect_similar_clothes(
    raw: bytes,
    items: list[Clothes],
    *,
    uploaded_type: ClothesType | None = None,
) -> list[Clothes]:
    hints = analyze_image_bytes(raw)
    resolved_type = _resolve_uploaded_type(hints, uploaded_type)
    same_type = [i for i in items if i.clothes_type == resolved_type]

    target_color = (hints.get("color") or "").strip().lower()
    target_style = (hints.get("style") or "").strip().lower()
    target_hash = _average_hash(raw)

    ranked: list[tuple[float, int, Clothes]] = []
    for item in same_type:
        score, hdist = _score_similarity(
            target_color=target_color,
            target_style=target_style,
            target_hash=target_hash,
            candidate=item,
        )
        if score >= 0.45 or hdist <= 6:
            ranked.append((score, hdist, item))

    ranked.sort(key=lambda r: (r[0], -r[1], r[2].id), reverse=True)
    return [row[2] for row in ranked[:_MAX_RESULTS]]
