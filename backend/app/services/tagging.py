"""
Heuristic clothing tags from image URL / filename (v1).

Intended to be swapped or wrapped later for ML-based vision tagging.
"""

from __future__ import annotations

import re
from urllib.parse import unquote, urlparse

from app.models.clothes import ClothesType

# --- Keyword maps (token → hint). First match wins per category; refine later for ML. ---

_TYPE_BY_KEYWORD: dict[str, ClothesType] = {
    # tops
    "shirt": ClothesType.TOP,
    "blouse": ClothesType.TOP,
    "tshirt": ClothesType.TOP,
    "t-shirt": ClothesType.TOP,
    "tee": ClothesType.TOP,
    "kurti": ClothesType.TOP,
    "kurta": ClothesType.TOP,
    "tank": ClothesType.TOP,
    "polo": ClothesType.TOP,
    "sweater": ClothesType.TOP,
    "hoodie": ClothesType.TOP,
    "top": ClothesType.TOP,
    # bottoms
    "jeans": ClothesType.BOTTOM,
    "denim": ClothesType.BOTTOM,
    "pants": ClothesType.BOTTOM,
    "trousers": ClothesType.BOTTOM,
    "shorts": ClothesType.BOTTOM,
    "skirt": ClothesType.BOTTOM,
    "leggings": ClothesType.BOTTOM,
    "chinos": ClothesType.BOTTOM,
    # dress
    "dress": ClothesType.DRESS,
    "gown": ClothesType.DRESS,
    # outerwear
    "jacket": ClothesType.OUTERWEAR,
    "coat": ClothesType.OUTERWEAR,
    "blazer": ClothesType.OUTERWEAR,
    "cardigan": ClothesType.OUTERWEAR,
    "parka": ClothesType.OUTERWEAR,
    # footwear
    "shoe": ClothesType.FOOTWEAR,
    "shoes": ClothesType.FOOTWEAR,
    "sneaker": ClothesType.FOOTWEAR,
    "sneakers": ClothesType.FOOTWEAR,
    "boot": ClothesType.FOOTWEAR,
    "boots": ClothesType.FOOTWEAR,
    "sandal": ClothesType.FOOTWEAR,
    "sandals": ClothesType.FOOTWEAR,
    "loafer": ClothesType.FOOTWEAR,
    "loafers": ClothesType.FOOTWEAR,
    "heel": ClothesType.FOOTWEAR,
    "heels": ClothesType.FOOTWEAR,
    # accessories
    "belt": ClothesType.ACCESSORY,
    "bag": ClothesType.ACCESSORY,
    "hat": ClothesType.ACCESSORY,
    "scarf": ClothesType.ACCESSORY,
    "watch": ClothesType.ACCESSORY,
}

_COLOR_BY_KEYWORD: dict[str, str] = {
    "black": "black",
    "white": "white",
    "red": "red",
    "blue": "blue",
    "navy": "navy",
    "green": "green",
    "yellow": "yellow",
    "pink": "pink",
    "brown": "brown",
    "gray": "gray",
    "grey": "grey",
    "beige": "beige",
    "cream": "cream",
    "tan": "tan",
    "olive": "olive",
    "burgundy": "burgundy",
    "maroon": "maroon",
    "purple": "purple",
    "orange": "orange",
    "teal": "teal",
    "gold": "gold",
    "silver": "silver",
}

_STYLE_BY_KEYWORD: dict[str, str] = {
    "casual": "casual",
    "formal": "formal",
    "sport": "sporty",
    "sports": "sporty",
    "athletic": "sporty",
    "running": "sporty",
    "gym": "sporty",
    "party": "party",
    "evening": "evening",
    "elegant": "elegant",
    "vintage": "vintage",
    "boho": "boho",
    "street": "streetwear",
    "work": "workwear",
    "office": "workwear",
    "summer": "summer",
    "winter": "winter",
    "linen": "relaxed",
    "wool": "classic",
}

_DEFAULT_TYPE = ClothesType.TOP
_DEFAULT_COLOR = "black"
_DEFAULT_STYLE = "casual"

_TOKEN_SPLIT = re.compile(r"[^a-z0-9]+", re.IGNORECASE)


def _tokens_from_url(image_url: str) -> list[str]:
    parsed = urlparse(image_url.strip())
    path = unquote(parsed.path or "")
    query = unquote(parsed.query or "")
    blob = f"{path} {query}".lower()
    raw_tokens = [t for t in _TOKEN_SPLIT.split(blob) if t]
    # also split stem without extension noise
    return raw_tokens


def _first_match(tokens: list[str], mapping: dict[str, str]) -> str | None:
    for tok in tokens:
        if tok in mapping:
            return mapping[tok]
    return None


def _first_type_match(tokens: list[str]) -> ClothesType | None:
    for tok in tokens:
        if tok in _TYPE_BY_KEYWORD:
            return _TYPE_BY_KEYWORD[tok]
    return None


def analyze_image(image_url: str) -> dict[str, str]:
    """
    Suggest type, color, and style from URL path/query tokens (filename heuristics).

    Returns keys: ``type``, ``color``, ``style`` (string values, ``type`` is a
    :class:`ClothesType` value). Safe defaults apply when nothing matches.

    Replace this function or delegate to an async ML service in a future version.
    """
    tokens = _tokens_from_url(image_url)
    ctype = _first_type_match(tokens) or _DEFAULT_TYPE
    color = _first_match(tokens, _COLOR_BY_KEYWORD) or _DEFAULT_COLOR
    style = _first_match(tokens, _STYLE_BY_KEYWORD) or _DEFAULT_STYLE
    return {
        "type": ctype.value,
        "color": color,
        "style": style,
    }
