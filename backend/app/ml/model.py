"""
Outfit likeability: random forest on engineered features.

Features (training aligned with inference):
  - color_match: mean pairwise color harmony (normalized)
  - style_match: mean pairwise Jaccard similarity on style tokens
  - category_match: mean pairwise agreement on coarse style category
  - user_preference_score: sum of taste bonuses from personalization maps
  - color_contrast: mean pairwise absolute brightness difference (0–1)
  - color_diversity: spread of garment colors (penalizes identical colors)
  - neutral_bonus: 1 if any piece reads as a neutral color, else 0
  - style_diversity: spread of full style strings (penalizes identical styles)

Model artifact: ``app/ml/artifacts/outfit_ranker.pkl`` (train via ``scripts/train_outfit_ranker.py``).

Legacy bundles may still contain a StandardScaler + logistic regression; inference applies scaling only when present.
"""

from __future__ import annotations

import logging
import pickle
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
from sklearn.ensemble import RandomForestClassifier

from app.models.clothes import Clothes
from app.models.outfit_feedback import OutfitFeedback
from app.services.memory_cache import ml_outfit_score_cache
from app.services.outfit_matcher import (
    _extract_hues,
    _is_neutral_color,
    _pair_color_harmony,
    _style_similarity,
    _taste_bonus,
)
from app.services.personalization import (
    PersonalizationBoosts,
    compute_decay,
    infer_style_category,
    personalization_cache_fingerprint,
)

logger = logging.getLogger(__name__)

FEATURE_NAMES: tuple[str, ...] = (
    "color_match",
    "style_match",
    "category_match",
    "user_preference_score",
    "color_contrast",
    "color_diversity",
    "neutral_bonus",
    "style_diversity",
)

# Approximate relative brightness per extracted hue token (0 = dark, 1 = light).
_HUE_BRIGHTNESS: dict[str, float] = {
    "black": 0.06,
    "navy": 0.12,
    "charcoal": 0.14,
    "burgundy": 0.22,
    "maroon": 0.22,
    "brown": 0.36,
    "olive": 0.38,
    "purple": 0.42,
    "teal": 0.44,
    "blue": 0.46,
    "red": 0.48,
    "green": 0.44,
    "orange": 0.58,
    "pink": 0.68,
    "yellow": 0.88,
    "cyan": 0.78,
    "magenta": 0.58,
    "gray": 0.52,
    "grey": 0.52,
    "tan": 0.58,
    "beige": 0.78,
    "cream": 0.88,
    "ivory": 0.92,
    "white": 0.98,
    "silver": 0.76,
    "gold": 0.72,
    "khaki": 0.66,
}

MODEL_PATH: Path = Path(__file__).resolve().parent / "artifacts" / "outfit_ranker.pkl"

# Scale added to rule-based footwear score when P(like) ≈ 1.
DEFAULT_ML_SCORE_WEIGHT = 4.0

_MIN_SAMPLES = 8
_MIN_SAMPLES_PER_CLASS = 2


class OutfitRankerBundle:
    """Pickled inference bundle (RF; legacy may include scaler + linear model)."""

    __slots__ = ("clf", "scaler", "feature_names", "version")

    def __init__(
        self,
        clf: Any,
        scaler: object | None,
        feature_names: tuple[str, ...],
        *,
        version: int = 3,
    ) -> None:
        self.clf = clf
        self.scaler = scaler
        self.feature_names = feature_names
        self.version = version


_bundle: OutfitRankerBundle | None = None


def _days_between(earlier: datetime, later: datetime) -> int:
    if earlier.tzinfo is None:
        earlier = earlier.replace(tzinfo=UTC)
    if later.tzinfo is None:
        later = later.replace(tzinfo=UTC)
    delta = later - earlier
    return max(0, int(delta.total_seconds() // 86400))


def _norm_key(s: str) -> str:
    return s.strip().lower()


def _normalize_weight_map(weights: dict[str, float]) -> dict[str, float]:
    total = sum(weights.values())
    if total <= 0:
        return {}
    return {k: v / total for k, v in weights.items()}


def _normalize_category_counts(raw: dict[str, int]) -> dict[str, float]:
    weights = {str(k): float(v) for k, v in raw.items() if int(v) > 0}
    return _normalize_weight_map(weights)


def personalization_from_prior_feedback(
    prior: list[OutfitFeedback],
    as_of: datetime,
    clothes_by_id: dict[int, Clothes],
) -> PersonalizationBoosts:
    """
    Mimic production taste maps using only feedback rows strictly before ``as_of``'s row,
    with decay as of ``as_of`` (no leakage from the labeled row).

    Category maps are replayed from like/dislike on inferred categories (same spirit as
    ``user_preferences`` counters).
    """
    pref_c: dict[str, float] = {}
    pref_s: dict[str, float] = {}
    dis_c: dict[str, float] = {}
    dis_s: dict[str, float] = {}
    pref_cat: dict[str, int] = {}
    dis_cat: dict[str, int] = {}

    for fb in prior:
        w = compute_decay(_days_between(fb.created_at, as_of))
        top = clothes_by_id.get(fb.top_id)
        shoe = clothes_by_id.get(fb.footwear_id)
        bottom = clothes_by_id.get(fb.bottom_id) if fb.bottom_id is not None else None
        pieces = [p for p in (top, bottom, shoe) if p is not None]
        if len(pieces) < 2 or top is None or shoe is None:
            continue
        tc, ts = (pref_c, pref_s) if fb.liked else (dis_c, dis_s)
        for piece in pieces:
            tc[_norm_key(piece.color)] = tc.get(_norm_key(piece.color), 0.0) + w
            ts[_norm_key(piece.style)] = ts.get(_norm_key(piece.style), 0.0) + w
        for piece in pieces:
            cat = infer_style_category(piece.style)
            if fb.liked:
                pref_cat[cat] = pref_cat.get(cat, 0) + 1
            else:
                dis_cat[cat] = dis_cat.get(cat, 0) + 1

    return PersonalizationBoosts(
        _normalize_weight_map(dict(pref_c)),
        _normalize_weight_map(dict(pref_s)),
        _normalize_weight_map(dict(dis_c)),
        _normalize_weight_map(dict(dis_s)),
        _normalize_category_counts(pref_cat),
        _normalize_category_counts(dis_cat),
    )


def color_match_feature(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> float:
    if bottom is not None:
        pairs = [(top, bottom), (top, footwear), (bottom, footwear)]
    else:
        pairs = [(top, footwear)]
    raw = [_pair_color_harmony(a.color, b.color) for a, b in pairs]
    return float(np.mean(raw)) / 2.0


def style_match_feature(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> float:
    if bottom is not None:
        sims = [
            _style_similarity(top.style, bottom.style),
            _style_similarity(top.style, footwear.style),
            _style_similarity(bottom.style, footwear.style),
        ]
    else:
        sims = [_style_similarity(top.style, footwear.style)]
    return float(np.mean(sims))


def _cat(item: Clothes) -> str:
    return infer_style_category(item.style)


def category_match_feature(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> float:
    if bottom is None:
        return 1.0 if _cat(top) == _cat(footwear) else 0.0
    cats = [_cat(top), _cat(bottom), _cat(footwear)]
    agree = (
        float(_cat(top) == _cat(bottom))
        + float(_cat(top) == _cat(footwear))
        + float(_cat(bottom) == _cat(footwear))
    )
    return agree / 3.0


def user_preference_feature(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    pers: PersonalizationBoosts,
) -> float:
    total = _taste_bonus(top, pers) + _taste_bonus(footwear, pers)
    if bottom is not None:
        total += _taste_bonus(bottom, pers)
    return float(total)


def _estimate_color_brightness(color_text: str) -> float:
    """Single scalar brightness in [0, 1] from color string (hue tokens)."""
    hues = _extract_hues(color_text)
    if not hues:
        return 0.5
    return float(np.mean([_HUE_BRIGHTNESS.get(h, 0.5) for h in hues]))


def color_contrast_feature(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> float:
    if bottom is not None:
        pieces = (top, bottom, footwear)
        idx_pairs = ((0, 1), (0, 2), (1, 2))
    else:
        pieces = (top, footwear)
        idx_pairs = ((0, 1),)
    br = [_estimate_color_brightness(p.color) for p in pieces]
    diffs = [abs(br[i] - br[j]) for i, j in idx_pairs]
    return float(np.mean(diffs))


def color_diversity_feature(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> float:
    pieces = [top, footwear] if bottom is None else [top, bottom, footwear]
    n = len(pieces)
    if n < 2:
        return 1.0
    keys = [_norm_key(p.color) for p in pieces]
    u = len(set(keys))
    return float(u - 1) / float(n - 1)


def neutral_bonus_feature(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> float:
    pieces = [top, footwear] if bottom is None else [top, bottom, footwear]
    return 1.0 if any(_is_neutral_color(p.color) for p in pieces) else 0.0


def style_diversity_feature(top: Clothes, bottom: Clothes | None, footwear: Clothes) -> float:
    pieces = [top, footwear] if bottom is None else [top, bottom, footwear]
    n = len(pieces)
    if n < 2:
        return 1.0
    keys = [_norm_key(p.style) for p in pieces]
    u = len(set(keys))
    return float(u - 1) / float(n - 1)


def outfit_feature_vector(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    pers: PersonalizationBoosts,
) -> np.ndarray:
    return np.array(
        [
            color_match_feature(top, bottom, footwear),
            style_match_feature(top, bottom, footwear),
            category_match_feature(top, bottom, footwear),
            user_preference_feature(top, bottom, footwear, pers),
            color_contrast_feature(top, bottom, footwear),
            color_diversity_feature(top, bottom, footwear),
            neutral_bonus_feature(top, bottom, footwear),
            style_diversity_feature(top, bottom, footwear),
        ],
        dtype=np.float64,
    )


def _load_bundle_unlocked() -> OutfitRankerBundle | None:
    global _bundle
    if _bundle is not None:
        return _bundle
    if not MODEL_PATH.is_file():
        return None
    try:
        with MODEL_PATH.open("rb") as f:
            raw = pickle.load(f)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to load outfit ranker: %s", exc)
        return None
    if not isinstance(raw, OutfitRankerBundle):
        logger.warning("Invalid outfit ranker artifact format")
        return None
    _bundle = raw
    return _bundle


def load_ranker_bundle() -> OutfitRankerBundle | None:
    """Load pickled model once (thread-safe enough for CPython GIL + idempotent read)."""
    return _load_bundle_unlocked()


def predict_like_proba(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    pers: PersonalizationBoosts,
) -> float | None:
    """
    P(liked | features) for class index 1, or None if no artifact / predict fails.
    """
    bundle = load_ranker_bundle()
    if bundle is None:
        return None
    x = outfit_feature_vector(top, bottom, footwear, pers).reshape(1, -1)
    n_feat = int(x.shape[1])
    if len(bundle.feature_names) != n_feat:
        logger.debug(
            "Feature count mismatch (vector=%s, bundle.feature_names=%s)",
            n_feat,
            len(bundle.feature_names),
        )
        return None
    n_expected = getattr(bundle.clf, "n_features_in_", None)
    if n_expected is not None and n_feat != int(n_expected):
        logger.debug("Feature count mismatch (vector=%s, model expects %s)", n_feat, n_expected)
        return None
    try:
        scaler = bundle.scaler
        xs = scaler.transform(x) if scaler is not None else x
        proba_row = bundle.clf.predict_proba(xs)[0]
        classes = np.asarray(bundle.clf.classes_)
        pos = np.nonzero(classes == 1)[0]
        if pos.size == 0:
            return None
        return float(proba_row[int(pos[0])])
    except Exception as exc:  # noqa: BLE001
        logger.debug("Outfit ranker predict failed: %s", exc)
        return None


def _ml_outfit_bonus_uncached(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    pers: PersonalizationBoosts,
    *,
    weight: float,
) -> float:
    p = predict_like_proba(top, bottom, footwear, pers)
    if p is None:
        return 0.0
    return weight * p


def ml_outfit_bonus(
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
    pers: PersonalizationBoosts | None,
    *,
    weight: float = DEFAULT_ML_SCORE_WEIGHT,
) -> float:
    """Extra matcher points from ML; 0 when cold or inference fails."""
    if pers is None:
        return 0.0
    bid = bottom.id if bottom is not None else 0
    key = f"{top.id}-{bid}-{footwear.id}:{personalization_cache_fingerprint(pers)}:{weight:.12g}"
    cached = ml_outfit_score_cache.get(key)
    if cached is not None:
        return float(cached)
    bonus = _ml_outfit_bonus_uncached(top, bottom, footwear, pers, weight=weight)
    ml_outfit_score_cache.set(key, bonus)
    return bonus


def train_bundle(X: np.ndarray, y: np.ndarray) -> OutfitRankerBundle | None:
    """
    Fit random forest on raw features. Returns None if too little data or single class.
    """
    if X.shape[0] < _MIN_SAMPLES:
        logger.warning("Not enough rows to train (%s < %s)", X.shape[0], _MIN_SAMPLES)
        return None
    y_int = y.astype(np.int32)
    n_pos = int(np.sum(y_int == 1))
    n_neg = int(np.sum(y_int == 0))
    if n_pos < _MIN_SAMPLES_PER_CLASS or n_neg < _MIN_SAMPLES_PER_CLASS:
        logger.warning("Need both classes (got liked=%s disliked=%s)", n_pos, n_neg)
        return None
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_split=4,
        random_state=42,
    )
    clf.fit(X, y_int)
    return OutfitRankerBundle(clf=clf, scaler=None, feature_names=FEATURE_NAMES, version=3)


def save_bundle(bundle: OutfitRankerBundle, path: Path | None = None) -> Path:
    target = path or MODEL_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("wb") as f:
        pickle.dump(bundle, f, protocol=pickle.HIGHEST_PROTOCOL)
    global _bundle
    _bundle = bundle
    return target


def reset_loaded_bundle() -> None:
    """Test hook: clear in-memory cache."""
    global _bundle
    _bundle = None


def bundle_metadata(bundle: OutfitRankerBundle) -> dict[str, Any]:
    clf = bundle.clf
    meta: dict[str, Any] = {
        "version": bundle.version,
        "feature_names": list(bundle.feature_names),
        "classes": clf.classes_.tolist(),
        "model_type": type(clf).__name__,
    }
    if hasattr(clf, "coef_"):
        meta["coef"] = clf.coef_.tolist()
        meta["intercept"] = float(clf.intercept_[0])
    if hasattr(clf, "feature_importances_"):
        meta["feature_importances"] = clf.feature_importances_.tolist()
    return meta
