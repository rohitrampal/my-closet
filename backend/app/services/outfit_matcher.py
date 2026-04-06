"""
Outfit generation: rule-based heuristics plus optional ML ranking.

Groups clothes by slot (top / bottom / footwear), applies color, style,
occasion, and weather heuristics, then picks one combination with jitter
so results are not identical on every call.

When ``app/ml/artifacts/outfit_ranker.pkl`` exists (train via
``scripts/train_outfit_ranker.py``) and personalization is present, the matcher
builds several valid outfit triples (rule-scored), ranks them by
:func:`app.ml.model.ml_outfit_bonus`, and returns the best. Otherwise it keeps
the legacy sequential pick with jitter.
"""

from __future__ import annotations

import hashlib
import random
import re
from collections.abc import Sequence

from app.models.clothes import Clothes, ClothesType
from app.services.memory_cache import outfit_generation_cache
from app.services.outfit_repeat import (
    get_recent_outfit_keys,
    outfit_triple_key,
    record_generated_outfit,
    repeat_penalty_for_clothes,
)
from app.services.personalization import (
    CATEGORY_DISLIKE_WEIGHT,
    CATEGORY_LIKE_WEIGHT,
    DISLIKE_WEIGHT,
    LIKE_WEIGHT,
    PersonalizationBoosts,
    infer_style_category,
)

# --- Normalization & dictionaries -------------------------------------------------

_NEUTRAL_TOKENS = frozenset(
    {"black", "white", "beige", "gray", "grey", "cream", "ivory", "tan", "navy", "charcoal"}
)

# If either garment reads as neutral, color rules are relaxed.
_NEUTRAL_PHRASES = ("off-white", "off white", "light gray", "dark gray", "camel", "khaki")

_CLASH_PAIRS: tuple[frozenset[str], ...] = (
    frozenset({"red", "green"}),
    frozenset({"orange", "purple"}),
)

_OCCASION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "casual": ("casual", "relaxed", "street", "everyday", "sport", "weekend", "denim", "sneaker"),
    "party": ("party", "evening", "glam", "sequin", "cocktail", "night", "bold", "metallic"),
    "wedding": ("formal", "elegant", "classic", "suit", "gown", "bridal", "tailored", "lace"),
}

_WEATHER_KEYWORDS: dict[str, tuple[str, ...]] = {
    "hot": ("light", "summer", "linen", "breathable", "short", "tank", "sleeveless", "thin"),
    "cold": ("warm", "wool", "knit", "layered", "coat", "winter", "thick", "fleece", "thermal"),
}

_HUE_PATTERN = re.compile(
    r"\b(red|green|blue|orange|purple|yellow|pink|brown|olive|burgundy|maroon|teal|cyan|magenta|"
    r"black|white|beige|gray|grey|navy|tan|cream|ivory|charcoal|khaki|gold|silver)\b",
    re.IGNORECASE,
)

# Actionable hints (wardrobe shape matters, not only item count).
_MSG_NO_TOP_OR_DRESS = (
    "Add at least one top or dress. If your pieces are tagged wrong, edit the type on each item."
)
_MSG_NO_FOOTWEAR = (
    "Add at least one footwear item (shoes, sandals, boots). Your closet has tops but no shoes yet."
)
_MSG_NEED_BOTTOM_OR_DRESS = (
    "You need bottoms (pants, skirt, shorts) and footwear, or a dress plus footwear. "
    "Right now everything looks like tops—add bottoms and shoes, or change one item to Dress."
)
_MSG_BOTTOM_COLOR_CLASH = (
    "No bottom matched your top for color rules. Try neutral bottoms (black, white, gray, denim) or add more options."
)
_MSG_SHOE_COLOR_CLASH = (
    "No footwear matched without color clashes. Add neutral shoes or more footwear."
)
_MSG_NO_COMPATIBLE_COMBO = (
    "No outfit passed the color and style rules with this occasion and weather. Try other options or add more pieces."
)

# Premium: stronger style similarity weight; free uses 1.0×
_PREMIUM_STYLE_WEIGHT_MULT = 1.75

# ML Top-K: enumerate diverse rule-good triples, then rank by ML.
_ML_CANDIDATE_MAX = 10
_ML_CANDIDATE_TARGET_MIN = 5
# With this probability, pick 2nd or 3rd ML-ranked outfit instead of the best (stochastic tie order).
_ML_EXPLORE_PROB = 0.2
_ML_TOP_POOL_SIZES: tuple[tuple[int, int, int], ...] = (
    (4, 3, 4),
    (6, 5, 5),
    (10, 8, 8),
)

# Detection confidence (optional on ``Clothes.detection_confidence``)
_CONF_LOW = 0.6
_CONF_HIGH = 0.8
_SIMILARITY_THRESHOLD = 0.62
_SIMILARITY_PENALTY = 1.35
_RELAXED_COLOR_PENALTY = 4.25
_PATTERN_REPEAT_PENALTY = 1.2
_CONTEXT_MISMATCH_PENALTY = 3.5
_MAX_OUTFIT_REASONS = 5
_STYLE_OVERLAP_MIN = 0.12
_PERSONALIZATION_HIT_MIN = 0.08

# Strong mismatch (penalize only; do not hard-block). Checked on style + color text per item.
_OCCASION_MISMATCH_TOKENS: dict[str, tuple[str, ...]] = {
    "wedding": ("casual", "sporty", "sport", "street", "sneaker", "sneakers", "hoodie", "joggers", "gym", "athletic"),
    "party": ("sporty", "sport", "gym", "athletic", "running", "jogger"),
    "casual": (),
}
_WEATHER_MISMATCH_TOKENS: dict[str, tuple[str, ...]] = {
    "hot": ("wool", "layered", "fleece", "thermal", "winter", "thick", "knit", "coat"),
    "cold": ("linen", "summer", "sleeveless", "breathable"),
}


class OutfitGenerationError(Exception):
    """Not enough compatible pieces to build an outfit."""

    def __init__(self, message: str, *, code: str = "OUTFIT_INSUFFICIENT") -> None:
        super().__init__(message)
        self.code = code
        self.message = message


def _norm_text(s: str) -> str:
    return s.strip().lower()


def _style_blob(item: Clothes) -> str:
    return _norm_text(item.style)


def _color_blob(item: Clothes) -> str:
    return _norm_text(item.color)


def _extract_hues(text: str) -> frozenset[str]:
    found = {m.group(1).lower() for m in _HUE_PATTERN.finditer(text)}
    return frozenset(found)


def _is_neutral_color(color_text: str) -> bool:
    c = _norm_text(color_text)
    if any(p in c for p in _NEUTRAL_PHRASES):
        return True
    hues = _extract_hues(c)
    if not hues:
        return False
    return hues <= _NEUTRAL_TOKENS or bool(hues & _NEUTRAL_TOKENS)


def _colors_clash(color_a: str, color_b: str) -> bool:
    if _is_neutral_color(color_a) or _is_neutral_color(color_b):
        return False
    ha, hb = _extract_hues(color_a), _extract_hues(color_b)
    if not ha or not hb:
        return False
    for pair in _CLASH_PAIRS:
        ordered = sorted(pair)
        for i, x in enumerate(ordered):
            for y in ordered[i + 1 :]:
                if x in ha and y in hb:
                    return True
                if y in ha and x in hb:
                    return True
    return False


def _keyword_score(style: str, keywords: tuple[str, ...]) -> int:
    s = _norm_text(style)
    return sum(1 for kw in keywords if kw in s)


def _occasion_score(item: Clothes, occasion: str) -> int:
    keys = _OCCASION_KEYWORDS.get(occasion, ())
    return _keyword_score(item.style, keys)


def _weather_score(item: Clothes, weather: str | None) -> int:
    if weather is None:
        return 0
    pos = _WEATHER_KEYWORDS.get(weather, ())
    neg = _WEATHER_KEYWORDS["cold"] if weather == "hot" else _WEATHER_KEYWORDS["hot"]
    return _keyword_score(item.style, pos) - _keyword_score(item.style, neg)


def _strict_context_mismatch_penalty(item: Clothes, occasion: str, weather: str | None) -> float:
    """Large penalty when item text clashes with requested occasion/weather (soft constraint)."""
    blob = f"{_style_blob(item)} {_color_blob(item)}"
    pen = 0.0
    bad_o = _OCCASION_MISMATCH_TOKENS.get(occasion, ())
    if bad_o and any(tok in blob for tok in bad_o):
        pen += _CONTEXT_MISMATCH_PENALTY
    if weather:
        bad_w = _WEATHER_MISMATCH_TOKENS.get(weather, ())
        if bad_w and any(tok in blob for tok in bad_w):
            pen += _CONTEXT_MISMATCH_PENALTY
    return pen


def _outfit_type_pattern(top: Clothes, bottom: Clothes | None, shoe: Clothes) -> tuple[str, str, str]:
    bt = bottom.clothes_type.value if bottom is not None else "none"
    return (top.clothes_type.value, bt, shoe.clothes_type.value)


def _pattern_penalty_vs_recent(
    user_id: int | None,
    top: Clothes,
    bottom: Clothes | None,
    shoe: Clothes,
    wardrobe_by_id: dict[int, Clothes],
) -> float:
    """Penalize repeating the same (top_type, bottom_type, footwear_type) across recent looks."""
    if user_id is None:
        return 0.0
    pat = _outfit_type_pattern(top, bottom, shoe)
    keys = get_recent_outfit_keys(user_id)
    cand = outfit_triple_key(top.id, bottom.id if bottom is not None else None, shoe.id)
    n_same = 0
    for tid, bid, sid in keys:
        if outfit_triple_key(tid, bid, sid) == cand:
            continue
        t2 = wardrobe_by_id.get(tid)
        s2 = wardrobe_by_id.get(sid)
        if t2 is None or s2 is None:
            continue
        b2 = wardrobe_by_id.get(bid) if bid is not None else None
        if bid is not None and b2 is None:
            continue
        if _outfit_type_pattern(t2, b2, s2) == pat:
            n_same += 1
    if n_same >= 2:
        return _PATTERN_REPEAT_PENALTY
    return 0.0


def _vibe_score(item: Clothes, vibe: str | None) -> int:
    """Heuristic vibe scoring based on keyword overlap in `style` / `color`."""
    if not vibe:
        return 0
    v = _norm_text(vibe)
    if not v:
        return 0

    # Known vibes: boost richer style-y keywords when present.
    known: dict[str, tuple[str, ...]] = {
        "classy": ("elegant", "classic", "tailored", "formal", "polished", "lace", "gown", "suit"),
        "trendy": ("modern", "street", "bold", "graphic", "metallic", "sequin", "sneaker"),
        "bold": ("statement", "dramatic", "colorful", "contrast", "bright", "graphic"),
    }
    tokens = known.get(v) or tuple(t for t in re.split(r"[^a-z0-9]+", v) if t)
    return _keyword_score(item.style, tokens) + _keyword_score(item.color, tokens)


def _style_similarity(style_a: str, style_b: str) -> float:
    a = set(_norm_text(style_a).split())
    b = set(_norm_text(style_b).split())
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _pair_color_harmony(color_a: str, color_b: str) -> float:
    """Extra score when two colors read as harmonious (premium mode)."""
    if _is_neutral_color(color_a) and _is_neutral_color(color_b):
        return 2.0
    if _is_neutral_color(color_a) or _is_neutral_color(color_b):
        return 1.5
    ha, hb = _extract_hues(color_a), _extract_hues(color_b)
    if ha and hb and (ha & hb):
        return 1.5
    return 0.8


def _taste_bonus(
    item: Clothes,
    pers: PersonalizationBoosts | None,
    *,
    pers_strength: float = 1.0,
) -> float:
    """
    Taste scoring.

    If the user has no feedback yet (cold start), apply a lightweight fallback:
    +1 for neutral colors and +1 when the style looks like `casual`.

    Otherwise:
    Normalized preferred/disliked weights scaled asymmetrically:
    preferred × LIKE_WEIGHT, disliked × DISLIKE_WEIGHT (stronger penalty).
    """
    if pers is None:
        return 0.0

    cold_start = (
        not pers.preferred_colors
        and not pers.preferred_styles
        and not pers.disliked_colors
        and not pers.disliked_styles
        and not pers.preferred_categories
        and not pers.disliked_categories
    )
    if cold_start:
        score = 0.0
        if _is_neutral_color(item.color):
            score += 1.0
        if "casual" in _norm_text(item.style):
            score += 1.0
        return score

    ck = _norm_text(item.color)
    sk = _norm_text(item.style)
    color_score = (
        pers.preferred_colors.get(ck, 0.0) * LIKE_WEIGHT
        - pers.disliked_colors.get(ck, 0.0) * DISLIKE_WEIGHT
    )
    style_score = (
        pers.preferred_styles.get(sk, 0.0) * LIKE_WEIGHT
        - pers.disliked_styles.get(sk, 0.0) * DISLIKE_WEIGHT
    )
    cat = infer_style_category(item.style)
    category_score = (
        pers.preferred_categories.get(cat, 0.0) * CATEGORY_LIKE_WEIGHT
        - pers.disliked_categories.get(cat, 0.0) * CATEGORY_DISLIKE_WEIGHT
    )
    return (color_score + style_score + category_score) * pers_strength


def _item_detection_confidence(item: Clothes) -> float | None:
    v = getattr(item, "detection_confidence", None)
    if v is None:
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    if x != x:  # NaN
        return None
    return max(0.0, min(1.0, x))


def _item_confidence_score_adjustment(conf: float | None) -> float:
    """+confidence×2 when known; small extra penalty when confidence is low."""
    if conf is None:
        return 0.0
    adj = conf * 2.0
    if conf < _CONF_LOW:
        adj -= 0.55
    return adj


def _outfit_level_confidence_adjustment(pieces: list[Clothes]) -> float:
    """Boost when any piece is high-confidence; dampen when all tagged low."""
    vals = [_item_detection_confidence(p) for p in pieces]
    vals = [c for c in vals if c is not None]
    if not vals:
        return 0.0
    if all(c < _CONF_LOW for c in vals):
        return -0.85
    if any(c >= _CONF_HIGH for c in vals):
        return 1.1
    return 0.0


def _outfit_similarity(
    top: Clothes,
    bottom: Clothes | None,
    shoe: Clothes,
    top2: Clothes,
    bottom2: Clothes | None,
    shoe2: Clothes,
) -> float:
    """0–1: type layout, shared hues, style token overlap."""
    layout_match = (
        top.clothes_type == top2.clothes_type
        and (bottom is None) == (bottom2 is None)
        and (bottom is None or bottom.clothes_type == bottom2.clothes_type)
        and shoe.clothes_type == shoe2.clothes_type
    )
    type_part = 1.0 if layout_match else 0.25

    def hues_of(c: Clothes) -> frozenset[str]:
        return _extract_hues(_color_blob(c))

    h1 = hues_of(top) | (hues_of(bottom) if bottom else frozenset()) | hues_of(shoe)
    h2 = hues_of(top2) | (hues_of(bottom2) if bottom2 else frozenset()) | hues_of(shoe2)
    if not h1 and not h2:
        color_part = 0.5
    elif not h1 or not h2:
        color_part = 0.35
    else:
        u = h1 | h2
        color_part = len(h1 & h2) / len(u) if u else 0.0

    pairs: list[tuple[str, str]] = [(top.style, top2.style), (shoe.style, shoe2.style)]
    if bottom is not None and bottom2 is not None:
        pairs.append((bottom.style, bottom2.style))
    style_part = sum(_style_similarity(a, b) for a, b in pairs) / len(pairs)
    return 0.28 * type_part + 0.38 * color_part + 0.34 * style_part


def _similarity_penalty_vs_recent(
    user_id: int | None,
    top: Clothes,
    bottom: Clothes | None,
    shoe: Clothes,
    wardrobe_by_id: dict[int, Clothes],
) -> float:
    if user_id is None:
        return 0.0
    keys = get_recent_outfit_keys(user_id)
    pen = 0.0
    cand = outfit_triple_key(top.id, bottom.id if bottom is not None else None, shoe.id)
    for tid, bid, sid in keys:
        if outfit_triple_key(tid, bid, sid) == cand:
            continue
        t2 = wardrobe_by_id.get(tid)
        s2 = wardrobe_by_id.get(sid)
        if t2 is None or s2 is None:
            continue
        b2 = wardrobe_by_id.get(bid) if bid is not None else None
        if bid is not None and b2 is None:
            continue
        sim = _outfit_similarity(top, bottom, shoe, t2, b2, s2)
        if sim > _SIMILARITY_THRESHOLD:
            pen += _SIMILARITY_PENALTY * sim
    return pen


def _style_weight_bottom(*, premium_mode: bool) -> float:
    return 5.0 * (_PREMIUM_STYLE_WEIGHT_MULT if premium_mode else 1.0)


def _style_weight_footwear(*, premium_mode: bool) -> float:
    return 4.0 * (_PREMIUM_STYLE_WEIGHT_MULT if premium_mode else 1.0)


def _score_top_candidate(
    item: Clothes,
    occasion: str,
    weather: str | None,
    vibe: str | None,
    pers: PersonalizationBoosts | None,
    *,
    premium_mode: bool = False,
    pers_strength: float = 1.0,
) -> float:
    base = float(_occasion_score(item, occasion) * 2 + _weather_score(item, weather))
    base += _vibe_score(item, vibe) * 2
    if premium_mode and _is_neutral_color(item.color):
        base += 0.5
    base += _taste_bonus(item, pers, pers_strength=pers_strength)
    base += _item_confidence_score_adjustment(_item_detection_confidence(item))
    base -= _strict_context_mismatch_penalty(item, occasion, weather)
    return base


def _score_bottom_for_top(
    top: Clothes,
    bottom: Clothes,
    occasion: str,
    weather: str | None,
    vibe: str | None,
    pers: PersonalizationBoosts | None,
    *,
    premium_mode: bool = False,
    pers_strength: float = 1.0,
    relaxed_color_penalty: float = 0.0,
) -> float:
    sim = _style_similarity(top.style, bottom.style)
    occ = _occasion_score(bottom, occasion)
    w = _weather_score(bottom, weather)
    base = sim * _style_weight_bottom(premium_mode=premium_mode) + float(occ * 2 + w)
    if premium_mode:
        base += _pair_color_harmony(top.color, bottom.color)
    base += _vibe_score(bottom, vibe) * 2
    base += _taste_bonus(bottom, pers, pers_strength=pers_strength)
    base += _item_confidence_score_adjustment(_item_detection_confidence(bottom))
    base -= relaxed_color_penalty
    base -= _strict_context_mismatch_penalty(bottom, occasion, weather)
    return base


def _score_footwear_for_outfit(
    top: Clothes,
    bottom: Clothes | None,
    shoe: Clothes,
    occasion: str,
    weather: str | None,
    vibe: str | None,
    pers: PersonalizationBoosts | None,
    *,
    premium_mode: bool = False,
    pers_strength: float = 1.0,
    include_ml: bool = True,
    repeat_user_id: int | None = None,
    apply_repeat_penalty: bool = True,
    ml_weight: float | None = None,
    relaxed_color_penalty: float = 0.0,
    apply_outfit_confidence_and_similarity: bool = False,
    wardrobe_by_id: dict[int, Clothes] | None = None,
) -> float:
    anchor = bottom.style if bottom is not None else top.style
    sim = _style_similarity(anchor, shoe.style)
    base = sim * _style_weight_footwear(premium_mode=premium_mode) + float(
        _occasion_score(shoe, occasion) * 2 + _weather_score(shoe, weather)
    )
    if premium_mode:
        base += _pair_color_harmony(top.color, shoe.color) * 0.5
        if bottom is not None:
            base += _pair_color_harmony(bottom.color, shoe.color) * 0.5
    base += _vibe_score(shoe, vibe) * 2
    base += _taste_bonus(shoe, pers, pers_strength=pers_strength)
    base += _item_confidence_score_adjustment(_item_detection_confidence(shoe))
    base -= relaxed_color_penalty
    if include_ml and pers is not None:
        # Local import: ``app.ml.model`` imports this module for feature helpers.
        from app.ml.model import DEFAULT_ML_SCORE_WEIGHT, ml_outfit_bonus

        w = DEFAULT_ML_SCORE_WEIGHT if ml_weight is None else ml_weight
        base += ml_outfit_bonus(top, bottom, shoe, pers, weight=w)
    if apply_repeat_penalty and repeat_user_id is not None:
        base -= repeat_penalty_for_clothes(repeat_user_id, top, bottom, shoe)
    base -= _strict_context_mismatch_penalty(shoe, occasion, weather)
    if apply_outfit_confidence_and_similarity and wardrobe_by_id is not None and repeat_user_id is not None:
        pieces = [top] + ([bottom] if bottom is not None else []) + [shoe]
        base += _outfit_level_confidence_adjustment(pieces)
        base -= _similarity_penalty_vs_recent(repeat_user_id, top, bottom, shoe, wardrobe_by_id)
        base -= _pattern_penalty_vs_recent(repeat_user_id, top, bottom, shoe, wardrobe_by_id)
    return base


def _rule_total_outfit(
    top: Clothes,
    bottom: Clothes | None,
    shoe: Clothes,
    occasion: str,
    weather: str | None,
    vibe: str | None,
    pers: PersonalizationBoosts | None,
    *,
    premium_mode: bool,
    pers_strength: float = 1.0,
    repeat_user_id: int | None = None,
    apply_repeat_penalty: bool = True,
    wardrobe_by_id: dict[int, Clothes] | None = None,
) -> float:
    """Sum of heuristic scores only (no ML), for tie-breaks among ML-ranked candidates."""
    t = _score_top_candidate(
        top,
        occasion,
        weather,
        vibe,
        pers,
        premium_mode=premium_mode,
        pers_strength=pers_strength,
    )
    if bottom is not None:
        b = _score_bottom_for_top(
            top,
            bottom,
            occasion,
            weather,
            vibe,
            pers,
            premium_mode=premium_mode,
            pers_strength=pers_strength,
        )
    else:
        b = 0.0
    f = _score_footwear_for_outfit(
        top,
        bottom,
        shoe,
        occasion,
        weather,
        vibe,
        pers,
        premium_mode=premium_mode,
        pers_strength=pers_strength,
        include_ml=False,
        repeat_user_id=repeat_user_id,
        apply_repeat_penalty=apply_repeat_penalty,
        apply_outfit_confidence_and_similarity=False,
    )
    total = t + b + f
    pieces = [top] + ([bottom] if bottom is not None else []) + [shoe]
    total += _outfit_level_confidence_adjustment(pieces)
    if wardrobe_by_id is not None and repeat_user_id is not None:
        total -= _similarity_penalty_vs_recent(repeat_user_id, top, bottom, shoe, wardrobe_by_id)
        total -= _pattern_penalty_vs_recent(repeat_user_id, top, bottom, shoe, wardrobe_by_id)
    return total


def _ml_topk_ranking_available(pers: PersonalizationBoosts | None) -> bool:
    if pers is None:
        return False
    from app.ml.model import FEATURE_NAMES, load_ranker_bundle

    bundle = load_ranker_bundle()
    return bundle is not None and len(bundle.feature_names) == len(FEATURE_NAMES)


def _collect_outfit_candidates(
    tops: list[Clothes],
    bottoms: list[Clothes],
    shoes: list[Clothes],
    occasion: str,
    weather: str | None,
    vibe: str | None,
    pers: PersonalizationBoosts,
    *,
    premium_mode: bool,
    pers_strength: float = 1.0,
    repeat_user_id: int | None = None,
) -> list[tuple[Clothes, Clothes | None, Clothes]]:
    """
    Up to :data:`_ML_CANDIDATE_MAX` distinct (top, bottom, shoe) triples that pass
    color-clash checks, biased toward high rule scores (footwear score without ML).
    """
    seen: set[tuple[int, int | None, int]] = set()
    out: list[tuple[Clothes, Clothes | None, Clothes]] = []

    for n_tops, n_bottoms, n_shoes in _ML_TOP_POOL_SIZES:
        top_scored = [
            (
                _score_top_candidate(
                    t,
                    occasion,
                    weather,
                    vibe,
                    pers,
                    premium_mode=premium_mode,
                    pers_strength=pers_strength,
                ),
                t,
            )
            for t in tops
        ]
        top_scored.sort(key=lambda x: (-x[0], x[1].id))
        top_pool = [t for _, t in top_scored[: min(n_tops, len(top_scored))]]

        for top in top_pool:
            if top.clothes_type == ClothesType.DRESS:
                bottom_options: list[Clothes | None] = [None]
            else:
                compatible_bottoms = [b for b in bottoms if not _colors_clash(top.color, b.color)]
                relaxed_bottoms = not compatible_bottoms
                bottom_pool = bottoms if relaxed_bottoms else compatible_bottoms
                if not bottom_pool:
                    continue
                bottom_scored = [
                    (
                        _score_bottom_for_top(
                            top,
                            b,
                            occasion,
                            weather,
                            vibe,
                            pers,
                            premium_mode=premium_mode,
                            pers_strength=pers_strength,
                            relaxed_color_penalty=(
                                _RELAXED_COLOR_PENALTY
                                if relaxed_bottoms and _colors_clash(top.color, b.color)
                                else 0.0
                            ),
                        ),
                        b,
                    )
                    for b in bottom_pool
                ]
                bottom_scored.sort(key=lambda x: (-x[0], x[1].id))
                bottom_options = [b for _, b in bottom_scored[: min(n_bottoms, len(bottom_scored))]]

            for bottom in bottom_options:
                valid_shoes = [
                    s
                    for s in shoes
                    if not _colors_clash(top.color, s.color)
                    and (bottom is None or not _colors_clash(bottom.color, s.color))
                ]
                relaxed_shoes = not valid_shoes
                shoe_pool = shoes if relaxed_shoes else valid_shoes
                if not shoe_pool:
                    continue
                shoe_scored = [
                    (
                        _score_footwear_for_outfit(
                            top,
                            bottom,
                            s,
                            occasion,
                            weather,
                            vibe,
                            pers,
                            premium_mode=premium_mode,
                            pers_strength=pers_strength,
                            include_ml=False,
                            repeat_user_id=repeat_user_id,
                            relaxed_color_penalty=(
                                (
                                    (_RELAXED_COLOR_PENALTY if _colors_clash(top.color, s.color) else 0.0)
                                    + (
                                        _RELAXED_COLOR_PENALTY
                                        if bottom is not None and _colors_clash(bottom.color, s.color)
                                        else 0.0
                                    )
                                )
                                if relaxed_shoes
                                else 0.0
                            ),
                        ),
                        s,
                    )
                    for s in shoe_pool
                ]
                shoe_scored.sort(key=lambda x: (-x[0], x[1].id))
                for _, s in shoe_scored[: min(n_shoes, len(shoe_scored))]:
                    key = (top.id, bottom.id if bottom is not None else None, s.id)
                    if key in seen:
                        continue
                    seen.add(key)
                    out.append((top, bottom, s))
                    if len(out) >= _ML_CANDIDATE_MAX:
                        return out

        if len(out) >= _ML_CANDIDATE_TARGET_MIN:
            break

    return out


def _pick_ml_ranked_outfit(
    candidates: list[tuple[Clothes, Clothes | None, Clothes]],
    pers: PersonalizationBoosts,
    occasion: str,
    weather: str | None,
    vibe: str | None,
    *,
    rng: random.Random,
    premium_mode: bool,
    pers_strength: float = 1.0,
    selection_tier: str | None,
    repeat_user_id: int | None = None,
    ml_explore_prob: float | None = None,
    ml_weight: float | None = None,
    wardrobe_by_id: dict[int, Clothes] | None = None,
) -> tuple[Clothes, Clothes | None, Clothes]:
    from app.ml.model import DEFAULT_ML_SCORE_WEIGHT, ml_outfit_bonus

    explore_p = _ML_EXPLORE_PROB if ml_explore_prob is None else ml_explore_prob
    w_ml = DEFAULT_ML_SCORE_WEIGHT if ml_weight is None else ml_weight

    def sort_key(
        trip: tuple[Clothes, Clothes | None, Clothes],
    ) -> tuple[float, float, int, int, int]:
        top, bottom, shoe = trip
        pen = (
            repeat_penalty_for_clothes(repeat_user_id, top, bottom, shoe)
            if repeat_user_id is not None
            else 0.0
        )
        ml = ml_outfit_bonus(top, bottom, shoe, pers, weight=w_ml) - pen
        rules = _rule_total_outfit(
            top,
            bottom,
            shoe,
            occasion,
            weather,
            vibe,
            pers,
            premium_mode=premium_mode,
            pers_strength=pers_strength,
            repeat_user_id=repeat_user_id,
            apply_repeat_penalty=False,
            wardrobe_by_id=wardrobe_by_id,
        )
        bid = bottom.id if bottom is not None else -1
        return (ml, rules, -top.id, -bid, -shoe.id)

    ranked = sorted(candidates, key=sort_key, reverse=True)
    force_best = selection_tier == "safe"
    if force_best or len(ranked) == 1:
        return ranked[0]
    if rng.random() < explore_p:
        alt_indices = [i for i in (1, 2) if i < len(ranked)]
        if alt_indices:
            return ranked[rng.choice(alt_indices)]
    return ranked[0]


def _dedupe_reasons(lines: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for line in lines:
        if line not in seen:
            seen.add(line)
            out.append(line)
    return out


def _pieces_have_personalization_hit(pieces: list[Clothes], pers: PersonalizationBoosts | None) -> bool:
    if pers is None:
        return False
    for p in pieces:
        ck = _norm_text(p.color)
        sk = _norm_text(p.style)
        if pers.preferred_colors.get(ck, 0) >= _PERSONALIZATION_HIT_MIN:
            return True
        if pers.preferred_styles.get(sk, 0) >= _PERSONALIZATION_HIT_MIN:
            return True
        cat = infer_style_category(p.style)
        if pers.preferred_categories.get(cat, 0) >= _PERSONALIZATION_HIT_MIN:
            return True
    return False


def _bold_palette_coordinated(pieces: list[Clothes]) -> bool:
    bold = [p for p in pieces if not _is_neutral_color(p.color)]
    if len(bold) < 2:
        return False
    for i in range(len(bold)):
        for j in range(i + 1, len(bold)):
            hi = _extract_hues(_color_blob(bold[i]))
            hj = _extract_hues(_color_blob(bold[j]))
            if hi and hj and (hi & hj):
                return True
    return False


def _outfit_style_overlap(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
) -> bool:
    if bottom is not None:
        if _style_similarity(top.style, bottom.style) >= _STYLE_OVERLAP_MIN:
            return True
        if _style_similarity(bottom.style, footwear.style) >= _STYLE_OVERLAP_MIN:
            return True
    return _style_similarity(top.style, footwear.style) >= _STYLE_OVERLAP_MIN


def _build_outfit_reasons(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    occasion: str,
    weather: str | None,
    personalization: PersonalizationBoosts | None = None,
    *,
    language: str = "en",
) -> list[str]:
    """Structured, human-readable explanations (deduped, capped)."""
    occ = occasion.strip().lower()
    lang = language if language in ("en", "hi") else "en"
    lines: list[str] = []

    if lang == "hi":
        occ_hi = {"casual": "अनौपचारिक", "party": "पार्टी", "wedding": "शादी"}.get(occ, occ)
        lines.append(f"{occ_hi} अवसरों के लिए उपयुक्त")
        if weather == "hot":
            lines.append("गर्म मौसम के लिए आरामदायक")
        elif weather == "cold":
            lines.append("ठंडे मौसम के लिए आरामदायक")
        pieces = [top] + ([bottom] if bottom is not None else []) + [footwear]
        if _pieces_have_personalization_hit(pieces, personalization):
            lines.append("आपकी स्टाइल पसंद से मेल खाता है")
        neut_any = any(_is_neutral_color(p.color) for p in pieces)
        bold_any = any(not _is_neutral_color(p.color) for p in pieces)
        if neut_any and bold_any:
            lines.append("न्यूट्रल टोन आउटफिट को संतुलित करते हैं")
        elif bold_any and _bold_palette_coordinated(pieces):
            lines.append("रंग अच्छी तरह समन्वित हैं")
        elif not bold_any:
            lines.append("एक समग्र न्यूट्रल पैलेट")
        else:
            lines.append("रंग एक साथ अच्छे लगते हैं")
        if _outfit_style_overlap(top, bottom, footwear):
            lines.append("वस्तुएँ एक समान स्टाइल साझा करती हैं")
    else:
        lines.append(f"Suitable for {occ} occasions")

        if weather == "hot":
            lines.append("Comfortable for warm weather")
        elif weather == "cold":
            lines.append("Comfortable for cool weather")

        pieces = [top] + ([bottom] if bottom is not None else []) + [footwear]
        if _pieces_have_personalization_hit(pieces, personalization):
            lines.append("Matches your style preferences")

        neut_any = any(_is_neutral_color(p.color) for p in pieces)
        bold_any = any(not _is_neutral_color(p.color) for p in pieces)
        if neut_any and bold_any:
            lines.append("Neutral tones balance the outfit")
        elif bold_any and _bold_palette_coordinated(pieces):
            lines.append("Colors are well coordinated")
        elif not bold_any:
            lines.append("A cohesive neutral palette")
        else:
            lines.append("Colors work together nicely")

        if _outfit_style_overlap(top, bottom, footwear):
            lines.append("Items share a similar style")

    deduped = _dedupe_reasons(lines)
    return deduped[:_MAX_OUTFIT_REASONS]


def _wardrobe_fingerprint(wardrobe_ids: tuple[int, ...]) -> str:
    raw = ",".join(str(i) for i in wardrobe_ids).encode()
    return hashlib.sha256(raw).hexdigest()[:16]


def _outfit_cache_key(
    *,
    user_id: int,
    occasion: str,
    weather: str | None,
    premium_mode: bool,
    vibe: str | None,
    selection_tier: str | None,
    wardrobe_ids: tuple[int, ...],
    extra: str | None,
    language: str = "en",
) -> str:
    w = weather if weather is not None else ""
    v = (vibe or "").strip().lower()
    tier = selection_tier or ""
    x = extra or ""
    wf = _wardrobe_fingerprint(wardrobe_ids)
    lang = language if language in ("en", "hi") else "en"
    return f"u{user_id}|o{occasion}|w{w}|p{int(premium_mode)}|v{v}|t{tier}|ward{wf}|x{x}|lang{lang}"


def _record_outfit_for_repeat_avoidance(
    user_id: int | None,
    top: Clothes,
    bottom: Clothes | None,
    shoe: Clothes,
) -> None:
    if user_id is None:
        return
    record_generated_outfit(
        user_id,
        top.id,
        bottom.id if bottom is not None else None,
        shoe.id,
    )


def _resolve_cached_outfit(
    clothes: Sequence[Clothes],
    top_id: int,
    bottom_id: int | None,
    shoe_id: int,
    reasons: list[str],
) -> tuple[Clothes, Clothes | None, Clothes, list[str]] | None:
    by_id = {c.id: c for c in clothes}
    top = by_id.get(top_id)
    shoe = by_id.get(shoe_id)
    if top is None or shoe is None:
        return None
    bottom: Clothes | None
    if bottom_id is None:
        if top.clothes_type != ClothesType.DRESS:
            return None
        bottom = None
    else:
        bottom = by_id.get(bottom_id)
        if bottom is None:
            return None
    return top, bottom, shoe, list(reasons)


def _pick_with_jitter(
    scored: list[tuple[float, Clothes]],
    *,
    rng: random.Random,
    premium_mode: bool = False,
    selection_tier: str | None = None,
) -> Clothes:
    """Pick a candidate from scored candidates.

    - `selection_tier='safe'`: deterministic best-scoring pick (high match).
    - `selection_tier='balanced'`: near-top random pick (good match with variety).
    - `selection_tier='experimental'`: wider near-top pool (more variation).

    When `selection_tier` is None, preserves legacy behavior:
    - free: random among near top scores
    - premium_mode=True: strict best score, stable tie-break by id
    """
    if not scored:
        raise OutfitGenerationError(_MSG_NO_COMPATIBLE_COMBO, code="OUTFIT_INSUFFICIENT")
    if selection_tier == "safe":
        scored.sort(key=lambda x: (-x[0], x[1].id))
        return scored[0][1]

    if premium_mode and selection_tier is None:
        scored.sort(key=lambda x: (-x[0], x[1].id))
        return scored[0][1]
    scored.sort(key=lambda x: x[0], reverse=True)
    best = scored[0][0]
    if selection_tier == "experimental":
        margin = 4.5 if best > 0 else 1.2
    else:
        # Keep legacy free margin for balanced/None.
        margin = 2.0 if best > 0 else 0.5
    pool = [item for score, item in scored if score >= best - margin]
    if not pool:
        pool = [scored[0][1]]
    return rng.choice(pool)


def generate_outfit(
    clothes: Sequence[Clothes],
    occasion: str,
    weather: str | None,
    *,
    rng: random.Random | None = None,
    personalization: PersonalizationBoosts | None = None,
    premium_mode: bool = False,
    vibe: str | None = None,
    selection_tier: str | None = None,
    cache_user_id: int | None = None,
    cache_extra: str | None = None,
    language: str = "en",
    ml_explore_prob: float | None = None,
    ml_weight: float | None = None,
    pers_strength: float = 1.0,
) -> tuple[Clothes, Clothes | None, Clothes, list[str]]:
    """
    Build one outfit: (top_or_dress, bottom_or_none, footwear, reasons).

    Bottom is omitted when the upper body piece is a dress.

    ``personalization`` applies recency-weighted taste from ``outfit_feedback`` (decayed
    sums per color/style; matcher uses preferred minus disliked weights per item).

    ``premium_mode``: higher style-match weights, color-harmony bonuses, deterministic picks.

    ``pers_strength``: multiplies taste/personalization bonuses from feedback (e.g. 1.25 for subscribers).

    When a trained ranker artifact is present and ``personalization`` is set, builds up to
    several valid outfits, sorts them by ML score, and usually returns the best; with
    probability :data:`_ML_EXPLORE_PROB` returns the 2nd or 3rd best instead (unless
    ``selection_tier='safe'``, which always keeps the top pick).
    Otherwise uses the sequential heuristic + jitter path.

    On failure, raises :class:`OutfitGenerationError` with code ``OUTFIT_INSUFFICIENT``
    and a message describing missing slots (footwear, bottoms) or rule clashes.

    When ``cache_user_id`` is set, a successful result is stored under
    user + matcher params + wardrobe id-set (``cache_extra`` disambiguates stylist tiers, etc.),
    and recent outfit triples are tracked to down-rank repeats within a short TTL window.
    """
    if rng is None:
        rng = random.Random()

    repeat_user_id = cache_user_id
    wardrobe_by_id: dict[int, Clothes] = {c.id: c for c in clothes}

    wardrobe_ids = tuple(sorted(c.id for c in clothes))
    outfit_cache_key: str | None = None
    lang_norm = language if language in ("en", "hi") else "en"
    if cache_user_id is not None:
        outfit_cache_key = _outfit_cache_key(
            user_id=cache_user_id,
            occasion=occasion,
            weather=weather,
            premium_mode=premium_mode,
            vibe=vibe,
            selection_tier=selection_tier,
            wardrobe_ids=wardrobe_ids,
            extra=cache_extra,
            language=lang_norm,
        )
        cached = outfit_generation_cache.get(outfit_cache_key)
        if cached is not None:
            top_id, bottom_id, shoe_id, reasons_t = cached
            resolved = _resolve_cached_outfit(clothes, top_id, bottom_id, shoe_id, list(reasons_t))
            if resolved is not None:
                t, b, f, r = resolved
                _record_outfit_for_repeat_avoidance(repeat_user_id, t, b, f)
                return t, b, f, r

    tops: list[Clothes] = [c for c in clothes if c.clothes_type in (ClothesType.TOP, ClothesType.DRESS)]
    bottoms: list[Clothes] = [c for c in clothes if c.clothes_type == ClothesType.BOTTOM]
    shoes: list[Clothes] = [c for c in clothes if c.clothes_type == ClothesType.FOOTWEAR]

    if not tops:
        raise OutfitGenerationError(_MSG_NO_TOP_OR_DRESS, code="OUTFIT_INSUFFICIENT")
    if not shoes:
        raise OutfitGenerationError(_MSG_NO_FOOTWEAR, code="OUTFIT_INSUFFICIENT")

    if personalization is not None and _ml_topk_ranking_available(personalization):
        candidates = _collect_outfit_candidates(
            tops,
            bottoms,
            shoes,
            occasion,
            weather,
            vibe,
            personalization,
            premium_mode=premium_mode,
            pers_strength=pers_strength,
            repeat_user_id=repeat_user_id,
        )
        if candidates:
            top_pick, bottom_pick, shoe_pick = _pick_ml_ranked_outfit(
                candidates,
                personalization,
                occasion,
                weather,
                vibe,
                rng=rng,
                premium_mode=premium_mode,
                pers_strength=pers_strength,
                selection_tier=selection_tier,
                repeat_user_id=repeat_user_id,
                ml_explore_prob=ml_explore_prob,
                ml_weight=ml_weight,
                wardrobe_by_id=wardrobe_by_id,
            )
            reasons = _build_outfit_reasons(
                top_pick,
                bottom_pick,
                shoe_pick,
                occasion,
                weather,
                personalization,
                language=lang_norm,
            )
            _record_outfit_for_repeat_avoidance(repeat_user_id, top_pick, bottom_pick, shoe_pick)
            if outfit_cache_key is not None:
                outfit_generation_cache.set(
                    outfit_cache_key,
                    (
                        top_pick.id,
                        bottom_pick.id if bottom_pick is not None else None,
                        shoe_pick.id,
                        tuple(reasons),
                    ),
                )
            return top_pick, bottom_pick, shoe_pick, reasons

    top_scored = [
        (
            _score_top_candidate(
                t,
                occasion,
                weather,
                vibe,
                personalization,
                premium_mode=premium_mode,
                pers_strength=pers_strength,
            ),
            t,
        )
        for t in tops
    ]
    top_pick = _pick_with_jitter(
        top_scored,
        rng=rng,
        premium_mode=premium_mode,
        selection_tier=selection_tier,
    )

    bottom_pick: Clothes | None
    if top_pick.clothes_type == ClothesType.DRESS:
        bottom_pick = None
    else:
        if not bottoms:
            raise OutfitGenerationError(_MSG_NEED_BOTTOM_OR_DRESS, code="OUTFIT_INSUFFICIENT")
        compatible_bottoms = [b for b in bottoms if not _colors_clash(top_pick.color, b.color)]
        relaxed_bottoms = not compatible_bottoms
        bottom_pool = bottoms if relaxed_bottoms else compatible_bottoms
        if not bottom_pool:
            raise OutfitGenerationError(_MSG_BOTTOM_COLOR_CLASH, code="OUTFIT_INSUFFICIENT")
        bottom_scored = [
            (
                _score_bottom_for_top(
                    top_pick,
                    b,
                    occasion,
                    weather,
                    vibe,
                    personalization,
                    premium_mode=premium_mode,
                    pers_strength=pers_strength,
                    relaxed_color_penalty=(
                        _RELAXED_COLOR_PENALTY
                        if relaxed_bottoms and _colors_clash(top_pick.color, b.color)
                        else 0.0
                    ),
                ),
                b,
            )
            for b in bottom_pool
        ]
        bottom_pick = _pick_with_jitter(
            bottom_scored,
            rng=rng,
            premium_mode=premium_mode,
            selection_tier=selection_tier,
        )

    valid_shoes = [
        s
        for s in shoes
        if not _colors_clash(top_pick.color, s.color)
        and (bottom_pick is None or not _colors_clash(bottom_pick.color, s.color))
    ]
    relaxed_shoes = not valid_shoes
    shoe_pool = shoes if relaxed_shoes else valid_shoes
    if not shoe_pool:
        raise OutfitGenerationError(_MSG_SHOE_COLOR_CLASH, code="OUTFIT_INSUFFICIENT")
    shoe_scored = [
        (
            _score_footwear_for_outfit(
                top_pick,
                bottom_pick,
                s,
                occasion,
                weather,
                vibe,
                personalization,
                premium_mode=premium_mode,
                pers_strength=pers_strength,
                repeat_user_id=repeat_user_id,
                ml_weight=ml_weight,
                relaxed_color_penalty=(
                    (
                        (_RELAXED_COLOR_PENALTY if _colors_clash(top_pick.color, s.color) else 0.0)
                        + (
                            _RELAXED_COLOR_PENALTY
                            if bottom_pick is not None and _colors_clash(bottom_pick.color, s.color)
                            else 0.0
                        )
                    )
                    if relaxed_shoes
                    else 0.0
                ),
                apply_outfit_confidence_and_similarity=repeat_user_id is not None,
                wardrobe_by_id=wardrobe_by_id if repeat_user_id is not None else None,
            ),
            s,
        )
        for s in shoe_pool
    ]
    shoe_pick = _pick_with_jitter(
        shoe_scored,
        rng=rng,
        premium_mode=premium_mode,
        selection_tier=selection_tier,
    )

    reasons = _build_outfit_reasons(
        top_pick,
        bottom_pick,
        shoe_pick,
        occasion,
        weather,
        personalization,
        language=lang_norm,
    )
    _record_outfit_for_repeat_avoidance(repeat_user_id, top_pick, bottom_pick, shoe_pick)
    if outfit_cache_key is not None:
        outfit_generation_cache.set(
            outfit_cache_key,
            (
                top_pick.id,
                bottom_pick.id if bottom_pick is not None else None,
                shoe_pick.id,
                tuple(reasons),
            ),
        )
    return top_pick, bottom_pick, shoe_pick, reasons


def scores_for_admin_preview(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    occasion: str,
    weather: str | None,
    *,
    personalization: PersonalizationBoosts | None,
    premium_mode: bool = False,
    pers_strength: float = 1.0,
    vibe: str | None = None,
    repeat_user_id: int | None = None,
    ml_weight: float | None = None,
    wardrobe_by_id: dict[int, Clothes] | None = None,
) -> tuple[float, float]:
    """
    Rule-only total heuristic score and weighted ML bonus for a fixed triple.

    Returns ``(rule_score, ml_score)`` aligned with matcher ranking (ML path uses
    rule totals without repeat penalty for tie-break; here we include repeat
    penalty in rule_score when ``repeat_user_id`` is set).
    """
    from app.ml.model import DEFAULT_ML_SCORE_WEIGHT, ml_outfit_bonus

    w = DEFAULT_ML_SCORE_WEIGHT if ml_weight is None else ml_weight
    wb = wardrobe_by_id if wardrobe_by_id is not None else {top.id: top, footwear.id: footwear}
    if bottom is not None:
        wb = {**wb, bottom.id: bottom}
    rule = _rule_total_outfit(
        top,
        bottom,
        footwear,
        occasion,
        weather,
        vibe,
        personalization,
        premium_mode=premium_mode,
        pers_strength=pers_strength,
        repeat_user_id=repeat_user_id,
        apply_repeat_penalty=True,
        wardrobe_by_id=wb if repeat_user_id is not None else None,
    )
    ml = 0.0
    if personalization is not None:
        ml = float(ml_outfit_bonus(top, bottom, footwear, personalization, weight=w))
    return rule, ml


def outfit_matcher_debug_scores(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    occasion: str,
    weather: str | None,
    *,
    personalization: PersonalizationBoosts | None,
    premium_mode: bool = False,
    pers_strength: float = 1.0,
    vibe: str | None = None,
    repeat_user_id: int | None = None,
    ml_weight: float | None = None,
    wardrobe_by_id: dict[int, Clothes] | None = None,
) -> dict[str, float | str]:
    """Structured score parts for admin diagnostics (optional)."""
    from app.ml.model import DEFAULT_ML_SCORE_WEIGHT, ml_outfit_bonus

    w = DEFAULT_ML_SCORE_WEIGHT if ml_weight is None else ml_weight
    pieces = [top] + ([bottom] if bottom is not None else []) + [footwear]
    wb = wardrobe_by_id if wardrobe_by_id is not None else {p.id: p for p in pieces}
    for p in pieces:
        wb.setdefault(p.id, p)

    rule_tiebreak = _rule_total_outfit(
        top,
        bottom,
        footwear,
        occasion,
        weather,
        vibe,
        personalization,
        premium_mode=premium_mode,
        pers_strength=pers_strength,
        repeat_user_id=repeat_user_id,
        apply_repeat_penalty=False,
        wardrobe_by_id=wb if repeat_user_id is not None else None,
    )
    rp = (
        float(repeat_penalty_for_clothes(repeat_user_id, top, bottom, footwear))
        if repeat_user_id is not None
        else 0.0
    )
    ml = 0.0
    if personalization is not None:
        ml = float(ml_outfit_bonus(top, bottom, footwear, personalization, weight=w))
    taste = sum(_taste_bonus(p, personalization, pers_strength=pers_strength) for p in pieces)
    conf_i = sum(_item_confidence_score_adjustment(_item_detection_confidence(p)) for p in pieces)
    conf_o = _outfit_level_confidence_adjustment(pieces)
    sim = (
        _similarity_penalty_vs_recent(repeat_user_id, top, bottom, footwear, wb)
        if repeat_user_id is not None
        else 0.0
    )
    ctx = sum(_strict_context_mismatch_penalty(p, occasion, weather) for p in pieces)
    pat = (
        _pattern_penalty_vs_recent(repeat_user_id, top, bottom, footwear, wb)
        if repeat_user_id is not None
        else 0.0
    )
    return {
        "rule_rank_tiebreak": round(rule_tiebreak, 4),
        "ml_bonus": round(ml, 4),
        "repeat_penalty_exact_triple": round(rp, 4),
        "taste_total": round(taste, 4),
        "confidence_item_boost_total": round(conf_i, 4),
        "confidence_outfit_adjustment": round(conf_o, 4),
        "near_duplicate_penalty": round(sim, 4),
        "type_pattern_repeat_penalty": round(pat, 4),
        "occasion_weather_mismatch_penalty_total": round(ctx, 4),
        "approx_final_rank_signal": round(rule_tiebreak + ml - rp, 4),
        "summary": (
            "Tie-break rule score includes occasion/weather/vibe, style harmony, taste, tag confidence, "
            "outfit-level confidence, strict occasion/weather mismatch penalties per item, near-duplicate and "
            "type-pattern diversity penalties vs recent looks. ML bonus is layered in ranking; exact triple "
            "repeat_penalty applies when the same three ids were just generated."
        ),
    }
