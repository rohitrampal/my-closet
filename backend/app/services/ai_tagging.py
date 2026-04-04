"""
Vision-assisted clothing tags: download image, dominant color (Pillow), simple style cues.

Type classification uses URL/filename heuristics from :mod:`app.services.tagging` to stay
lightweight (no local torch/transformers). Optional Hugging Face Inference API can be enabled
via env (see below).
"""

from __future__ import annotations

import colorsys
import hashlib
import io
import logging
import os
from statistics import mean

from PIL import Image

from app.services import tagging
from app.services.memory_cache import ai_image_tag_cache

logger = logging.getLogger(__name__)

# --- Tunables ---

_MAX_IMAGE_BYTES = 5 * 1024 * 1024
_DOWNLOAD_TIMEOUT_S = 15.0
_THUMB_MAX = 160

# RGB anchors for naming (same spirit as URL color map)
_NAMED_RGB: list[tuple[str, tuple[int, int, int]]] = [
    ("black", (0, 0, 0)),
    ("white", (255, 255, 255)),
    ("gray", (128, 128, 128)),
    ("red", (200, 40, 40)),
    ("blue", (40, 80, 200)),
    ("navy", (20, 40, 90)),
    ("green", (40, 120, 60)),
    ("yellow", (220, 200, 60)),
    ("pink", (230, 150, 170)),
    ("brown", (120, 70, 40)),
    ("beige", (220, 200, 170)),
    ("cream", (255, 248, 220)),
    ("tan", (180, 150, 120)),
    ("olive", (100, 100, 50)),
    ("purple", (120, 60, 160)),
    ("orange", (230, 120, 40)),
    ("teal", (0, 120, 120)),
    ("burgundy", (100, 20, 40)),
    ("maroon", (120, 30, 50)),
    ("gold", (212, 175, 55)),
    ("silver", (180, 180, 190)),
]


def _download_image(image_url: str) -> bytes:
    import httpx

    headers = {"User-Agent": "PauuaAITagging/1.0 (+https://localhost)"}
    with httpx.Client(timeout=_DOWNLOAD_TIMEOUT_S, follow_redirects=True, headers=headers) as client:
        with client.stream("GET", image_url) as resp:
            resp.raise_for_status()
            ctype = (resp.headers.get("content-type") or "").lower()
            if ctype.startswith("text/") or "application/json" in ctype:
                raise ValueError(f"unexpected content-type: {ctype}")
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


def _rgb_distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return float(sum((a[i] - b[i]) ** 2 for i in range(3)))


def _rgb_to_color_name(rgb: tuple[int, int, int]) -> str:
    best_name, best_d = _NAMED_RGB[0][0], _rgb_distance(rgb, _NAMED_RGB[0][1])
    for name, ref in _NAMED_RGB[1:]:
        d = _rgb_distance(rgb, ref)
        if d < best_d:
            best_d, best_name = d, name
    return best_name


def _dominant_rgb(image: Image.Image) -> tuple[int, int, int]:
    img = image.convert("RGB")
    img.thumbnail((_THUMB_MAX, _THUMB_MAX), Image.Resampling.LANCZOS)
    q = img.quantize(colors=8, method=Image.Quantize.MEDIANCUT)
    q_rgb = q.convert("RGB")
    colors = q_rgb.getcolors(maxcolors=256)
    if not colors:
        r, g, b = img.resize((1, 1), Image.Resampling.LANCZOS).getpixel((0, 0))
        return (int(r), int(g), int(b))
    colors.sort(key=lambda x: x[0], reverse=True)
    r, g, b = colors[0][1]
    return (int(r), int(g), int(b))


def _style_from_pixels(image: Image.Image) -> str | None:
    img = image.convert("RGB")
    img.thumbnail((96, 96), Image.Resampling.LANCZOS)
    saturations: list[float] = []
    values: list[float] = []
    for r, g, b in img.getdata():
        h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
        saturations.append(s)
        values.append(v)
    avg_s = mean(saturations) if saturations else 0.0
    avg_v = mean(values) if values else 0.0
    if avg_v < 0.22 and avg_s < 0.35:
        return "evening"
    if avg_s < 0.14 and 0.35 < avg_v < 0.85:
        return "classic"
    if avg_s > 0.42 and avg_v > 0.45:
        return "casual"
    if avg_s > 0.35 and avg_v > 0.55:
        return "sporty"
    return None


def _hf_inference_classify(image_bytes: bytes) -> dict[str, str] | None:
    """
    Optional: ``HF_API_TOKEN`` + ``PAUUA_HF_TAG_MODEL`` (default: a small general classifier).
    Maps top ImageNet-style labels heuristically to our enums; often weak for garments.
    """
    token = os.environ.get("HF_API_TOKEN", "").strip()
    if not token:
        return None
    model = os.environ.get(
        "PAUUA_HF_TAG_MODEL",
        "google/vit-base-patch16-224",
    ).strip()
    import httpx

    url = f"https://api-inference.huggingface.co/models/{model}"
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(url, headers={"Authorization": f"Bearer {token}"}, content=image_bytes)
            if r.status_code != 200:
                logger.debug("HF inference status %s: %s", r.status_code, r.text[:200])
                return None
            data = r.json()
    except Exception as exc:  # noqa: BLE001
        logger.debug("HF inference failed: %s", exc)
        return None

    if not isinstance(data, list) or not data:
        return None
    top = data[0]
    label = str(top.get("label", "")).lower()
    score = float(top.get("score", 0.0))
    if score < 0.12:
        return None

    # Coarse mapping from common ImageNet / generic labels → ClothesType value string
    footwear_kw = ("sandal", "shoe", "boot", "sneaker", "loafer", "heel", "footwear")
    bottom_kw = ("jean", "trouser", "pant", "skirt", "short", "legging")
    dress_kw = ("gown", "dress", "kimono")
    outer_kw = ("coat", "jacket", "cloak", "fur", "parka", "blazer", "cardigan")
    accessory_kw = ("sunglass", "purse", "wallet", "necklace", "watch", "hat", "cap", "belt", "bag")

    ctype: str | None = None
    if any(k in label for k in footwear_kw):
        ctype = "footwear"
    elif any(k in label for k in dress_kw):
        ctype = "dress"
    elif any(k in label for k in outer_kw):
        ctype = "outerwear"
    elif any(k in label for k in bottom_kw):
        ctype = "bottom"
    elif any(k in label for k in accessory_kw):
        ctype = "accessory"
    elif any(k in label for k in ("shirt", "jersey", "sweater", "vest", "tank", "top", "blouse")):
        ctype = "top"

    if ctype is None:
        return None
    return {"type": ctype, "color": "", "style": ""}


def _vision_tags(image_bytes: bytes) -> dict[str, str]:
    bio = io.BytesIO(image_bytes)
    with Image.open(bio) as im:
        im.load()
        rgb = _dominant_rgb(im)
        color_name = _rgb_to_color_name(rgb)
        style_hint = _style_from_pixels(im)

    out: dict[str, str] = {"type": "", "color": color_name, "style": style_hint or ""}
    hf = _hf_inference_classify(image_bytes)
    if hf and hf.get("type"):
        out["type"] = hf["type"]
    return out


def _tagging_cache_key(image_url: str) -> str:
    normalized = image_url.strip()
    digest = hashlib.sha256(normalized.encode("utf-8", errors="replace")).hexdigest()[:32]
    return digest


def analyze_image(image_url: str) -> dict[str, str]:
    """
    Suggest ``type``, ``color``, and ``style`` for a garment image URL.

    * Downloads the image when possible; derives **color** (and optional **style**) from pixels.
    * **Type** defaults to URL/filename heuristics; optional HF Inference API may override type
      when ``HF_API_TOKEN`` is set.
    * On any failure, falls back entirely to :func:`tagging.analyze_image`.
    """
    ck = _tagging_cache_key(image_url)
    hit = ai_image_tag_cache.get(ck)
    if hit is not None:
        return dict(hit)

    base = tagging.analyze_image(image_url)
    try:
        raw = _download_image(image_url.strip())
        vision = _vision_tags(raw)
    except Exception as exc:  # noqa: BLE001
        logger.debug("Vision tagging skipped for %s: %s", image_url[:80], exc)
        fallback = dict(base)
        ai_image_tag_cache.set(ck, tuple(fallback.items()))
        return fallback

    merged: dict[str, str] = {
        "type": vision.get("type") or base["type"],
        "color": vision.get("color") or base["color"],
        "style": (vision.get("style") or "").strip() or base["style"],
    }
    ai_image_tag_cache.set(ck, tuple(merged.items()))
    return merged
