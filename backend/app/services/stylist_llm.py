"""
Natural-language outfit parsing and stylist explanations via OpenAI-compatible Chat Completions.

Falls back to keyword heuristics and rule-based reasons when no API key or the call fails.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass

import httpx

from app.config import Settings
from app.models.clothes import Clothes
from app.schemas.outfit import Occasion, Weather

logger = logging.getLogger(__name__)

_MAX_QUERY_LEN = 500
_VIBE_MAX = 50


@dataclass(frozen=True, slots=True)
class ParsedNaturalOutfitQuery:
    occasion: Occasion
    vibe: str
    weather: Weather | None


def _clip_vibe(s: str) -> str:
    t = re.sub(r"\s+", " ", s.strip())
    if len(t) > _VIBE_MAX:
        return t[: _VIBE_MAX - 1].rstrip() + "…"
    return t


def heuristic_parse_natural_query(text: str) -> ParsedNaturalOutfitQuery:
    """Keyword-based parse when the LLM is unavailable."""
    q = text.strip().lower()
    if "wedding" in q or "bridal" in q:
        occasion = Occasion.wedding
    elif "party" in q or "night out" in q or "club" in q or "cocktail" in q:
        occasion = Occasion.party
    else:
        occasion = Occasion.casual

    if any(w in q for w in ("hot", "summer", "heat", "humid", "warm day", "scorching")):
        weather: Weather | None = Weather.hot
    elif any(w in q for w in ("cold", "winter", "freezing", "snow", "chilly", "frost")):
        weather = Weather.cold
    else:
        weather = None

    stop = {
        "outfit",
        "for",
        "a",
        "an",
        "the",
        "day",
        "weather",
        "something",
        "need",
        "want",
        "looking",
        "please",
        "help",
        "me",
        "my",
        "with",
        "and",
        "or",
        "to",
        "in",
        "on",
        "at",
        "casual",
        "formal",
        "hot",
        "cold",
        "warm",
        "summer",
        "winter",
    }
    tokens = [t for t in re.split(r"[^a-z0-9]+", q) if t and t not in stop]
    vibe = _clip_vibe(" ".join(tokens[:8]) if tokens else "everyday")

    return ParsedNaturalOutfitQuery(occasion=occasion, vibe=vibe, weather=weather)


async def llm_parse_natural_query(text: str, settings: Settings) -> ParsedNaturalOutfitQuery | None:
    """Structured parse via Chat Completions JSON mode."""
    key = (settings.OPENAI_API_KEY or "").strip()
    if not key:
        return None
    url = (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
    payload = {
        "model": settings.OPENAI_MODEL,
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "system",
                "content": (
                    "Extract fields from the user's outfit request. Reply with JSON only: "
                    '{"occasion":"casual"|"party"|"wedding","vibe":"short phrase (aesthetic/context)",'
                    '"weather":"hot"|"cold"|null}. '
                    "occasion must be one of the three strings. "
                    "weather is null if temperature is not implied. "
                    "vibe: max 8 words, no quotes inside."
                ),
            },
            {"role": "user", "content": text.strip()[:_MAX_QUERY_LEN]},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                url,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM parse failed: %s", exc)
        return None

    try:
        content = data["choices"][0]["message"]["content"]
        raw = json.loads(content)
        occ_raw = str(raw.get("occasion", "casual")).lower().strip()
        if occ_raw not in ("casual", "party", "wedding"):
            occ_raw = "casual"
        occasion = Occasion(occ_raw)
        vibe = _clip_vibe(str(raw.get("vibe", "everyday")))
        if not vibe:
            vibe = "everyday"
        w = raw.get("weather", None)
        weather: Weather | None
        if w is None or w == "null":
            weather = None
        else:
            ws = str(w).lower().strip()
            if ws == "hot":
                weather = Weather.hot
            elif ws == "cold":
                weather = Weather.cold
            else:
                weather = None
        return ParsedNaturalOutfitQuery(occasion=occasion, vibe=vibe, weather=weather)
    except (KeyError, IndexError, ValueError, TypeError, json.JSONDecodeError) as exc:
        logger.warning("LLM parse JSON invalid: %s", exc)
        return None


async def parse_natural_outfit_query(text: str, settings: Settings) -> ParsedNaturalOutfitQuery:
    cleaned = text.strip()[:_MAX_QUERY_LEN]
    if not cleaned:
        return heuristic_parse_natural_query("casual everyday")
    parsed = await llm_parse_natural_query(cleaned, settings)
    if parsed is not None:
        return parsed
    return heuristic_parse_natural_query(cleaned)


def _outfit_description(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> str:
    parts = [
        f"Top/dress: type={top.clothes_type.value}, color={top.color}, style={top.style}",
    ]
    if bottom is not None:
        parts.append(
            f"Bottom: type={bottom.clothes_type.value}, color={bottom.color}, style={bottom.style}",
        )
    parts.append(
        f"Footwear: type={footwear.clothes_type.value}, color={footwear.color}, style={footwear.style}",
    )
    return "\n".join(parts)


async def llm_explain_outfit(
    user_query: str,
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    rule_reasons: list[str],
    settings: Settings,
) -> str | None:
    key = (settings.OPENAI_API_KEY or "").strip()
    if not key:
        return None
    url = (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").rstrip("/") + "/chat/completions"
    system = (
        "You are a concise fashion stylist. Explain in 2–4 short sentences why this outfit fits "
        "the user's request. Mention concrete colors/styles from the data. No bullet lists or markdown."
    )
    user_msg = (
        f"User request: {user_query.strip()[:_MAX_QUERY_LEN]}\n\n"
        f"Outfit:\n{_outfit_description(top, bottom, footwear)}\n\n"
        f"Matcher notes (hints only): {'; '.join(rule_reasons) if rule_reasons else 'none'}"
    )
    payload = {
        "model": settings.OPENAI_MODEL,
        "temperature": 0.7,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            r = await client.post(
                url,
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
        text = str(data["choices"][0]["message"]["content"]).strip()
        return text[:2000] if text else None
    except Exception as exc:  # noqa: BLE001
        logger.warning("LLM explanation failed: %s", exc)
        return None


def fallback_explanation(rule_reasons: list[str]) -> str:
    if not rule_reasons:
        return "This combination follows your wardrobe rules for the occasion and context you described."
    return " ".join(rule_reasons)
