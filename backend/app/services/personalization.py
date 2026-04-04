"""Recency-weighted taste boosts from ``outfit_feedback`` rows."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.clothes import Clothes
from app.models.outfit_feedback import OutfitFeedback
from app.models.user_preference import UserPreference

# Applied in matcher: preferred normalized weight × this; disliked × DISLIKE_WEIGHT (stronger penalty).
LIKE_WEIGHT = 2.0
DISLIKE_WEIGHT = 3.0
# Category maps are normalized the same way; matcher uses +1 / -1 scale on those weights.
CATEGORY_LIKE_WEIGHT = 1.0
CATEGORY_DISLIKE_WEIGHT = 1.0

# (substrings in normalized style text, category label). First match wins.
_STYLE_CATEGORY_RULES: tuple[tuple[tuple[str, ...], str], ...] = (
    (("kurti", "kurta", "saree", "sari", "lehenga", "ethnic", "anarkali", "salwar"), "ethnic"),
    (
        (
            "jeans",
            "denim",
            "tshirt",
            "t-shirt",
            "tee",
            "hoodie",
            "sneaker",
            "sneakers",
            "joggers",
            "weekend",
            "casual",
        ),
        "casual",
    ),
    (("blazer", "suit", "tailored", "gown", "tuxedo", "oxford", "formal"), "formal"),
    (("sport", "gym", "athletic", "running", "yoga"), "sporty"),
    (("party", "evening", "cocktail", "glam"), "party"),
)


def infer_style_category(style: str) -> str:
    """Map free-text ``style`` to a coarse category (e.g. ethnic, casual, formal)."""
    s = _norm_key(style)
    for keywords, label in _STYLE_CATEGORY_RULES:
        if any(kw in s for kw in keywords):
            return label
    return "casual"


def compute_decay(days: int) -> float:
    """Exponential decay by full calendar days since feedback (0 → 1.0)."""
    return 0.9**days


def _days_since_feedback(created_at: datetime, now: datetime) -> int:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=UTC)
    if now.tzinfo is None:
        now = now.replace(tzinfo=UTC)
    delta = now - created_at
    return max(0, int(delta.total_seconds() // 86400))


def _norm_key(s: str) -> str:
    return s.strip().lower()


def _normalize_category_counts(raw: dict[str, object]) -> dict[str, float]:
    """Normalize integer frequency maps from ``user_preferences`` JSON."""
    weights = {str(k): float(v) for k, v in raw.items() if float(v) > 0}
    return _normalize_weight_map(weights)


def _normalize_weight_map(weights: dict[str, float]) -> dict[str, float]:
    """
    Scale each map to a probability simplex: ``normalized[k] = w_k / sum(w)``.

    Empty or all-zero maps stay empty (avoids division by zero). In-memory only.
    """
    total = sum(weights.values())
    if total <= 0:
        return {}
    return {k: v / total for k, v in weights.items()}


@dataclass(frozen=True, slots=True)
class PersonalizationBoosts:
    """Per-map normalized taste weights (each map sums to 1 where non-empty)."""

    preferred_colors: dict[str, float]
    preferred_styles: dict[str, float]
    disliked_colors: dict[str, float]
    disliked_styles: dict[str, float]
    preferred_categories: dict[str, float]
    disliked_categories: dict[str, float]


def personalization_cache_fingerprint(pers: PersonalizationBoosts) -> str:
    """Stable short id for cache keys (ML scores depend on these maps)."""

    def norm_map(m: dict[str, float]) -> list[list[float | str]]:
        return [[k, round(float(v), 9)] for k, v in sorted(m.items())]

    payload = {
        "pc": norm_map(pers.preferred_colors),
        "ps": norm_map(pers.preferred_styles),
        "dc": norm_map(pers.disliked_colors),
        "ds": norm_map(pers.disliked_styles),
        "pcc": norm_map(pers.preferred_categories),
        "dcc": norm_map(pers.disliked_categories),
    }
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    return hashlib.sha256(raw).hexdigest()[:16]


async def load_personalization_boosts(session: AsyncSession, user_id: int) -> PersonalizationBoosts:
    """
    Sum decay weights per feedback row, then **normalize each map** so values sum to 1.

    That keeps any single color/style from dominating raw totals. The matcher scales
    preferred by ``LIKE_WEIGHT`` and disliked by ``DISLIKE_WEIGHT`` (stronger penalty).

    Category preferences are stored on ``UserPreference`` (counts updated on feedback)
    and normalized the same way.
    """
    up_row = await session.get(UserPreference, user_id)
    pref_cat = _normalize_category_counts(dict(up_row.preferred_categories or {})) if up_row else {}
    dis_cat = _normalize_category_counts(dict(up_row.disliked_categories or {})) if up_row else {}

    fr = await session.execute(select(OutfitFeedback).where(OutfitFeedback.user_id == user_id))
    rows = list(fr.scalars().all())
    if not rows:
        return PersonalizationBoosts({}, {}, {}, {}, pref_cat, dis_cat)

    ids: set[int] = set()
    for r in rows:
        ids.add(r.top_id)
        ids.add(r.footwear_id)
        if r.bottom_id is not None:
            ids.add(r.bottom_id)

    cr = await session.execute(select(Clothes).where(Clothes.id.in_(ids)))
    by_id = {c.id: c for c in cr.scalars().all()}

    pref_c: dict[str, float] = defaultdict(float)
    pref_s: dict[str, float] = defaultdict(float)
    dis_c: dict[str, float] = defaultdict(float)
    dis_s: dict[str, float] = defaultdict(float)

    now = datetime.now(UTC)
    for r in rows:
        weight = compute_decay(_days_since_feedback(r.created_at, now))
        if r.liked:
            tc, ts = pref_c, pref_s
        else:
            tc, ts = dis_c, dis_s

        for cid in (r.top_id, r.bottom_id, r.footwear_id):
            if cid is None:
                continue
            c = by_id.get(cid)
            if c is None:
                continue
            tc[_norm_key(c.color)] += weight
            ts[_norm_key(c.style)] += weight

    return PersonalizationBoosts(
        _normalize_weight_map(dict(pref_c)),
        _normalize_weight_map(dict(pref_s)),
        _normalize_weight_map(dict(dis_c)),
        _normalize_weight_map(dict(dis_s)),
        pref_cat,
        dis_cat,
    )


def _bump_category_count(m: dict[str, int], key: str) -> None:
    m[key] = int(m.get(key, 0)) + 1


async def increment_category_preferences(
    session: AsyncSession,
    user_id: int,
    items: list[Clothes],
    *,
    liked: bool,
) -> None:
    """Increment preferred or disliked category counters from each item's inferred category."""
    row = await session.get(UserPreference, user_id)
    if row is None:
        row = UserPreference(
            user_id=user_id,
            preferred_colors={},
            preferred_styles={},
            disliked_colors={},
            disliked_styles={},
            preferred_categories={},
            disliked_categories={},
        )
        session.add(row)
        await session.flush()

    pc = {str(k): int(v) for k, v in (row.preferred_categories or {}).items()}
    dc = {str(k): int(v) for k, v in (row.disliked_categories or {}).items()}
    for item in items:
        cat = infer_style_category(item.style)
        if liked:
            _bump_category_count(pc, cat)
        else:
            _bump_category_count(dc, cat)
    row.preferred_categories = pc
    row.disliked_categories = dc
