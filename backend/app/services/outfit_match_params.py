"""Runtime weights for outfit matching by subscription tier."""

from app.models.system_settings import SystemSettings

PREMIUM_ML_WEIGHT_MULT = 1.25
PREMIUM_PERSONALIZATION_STRENGTH = 1.25


def subscriber_match_kwargs(runtime: SystemSettings, *, is_premium: bool) -> dict[str, float]:
    """ML exploration, ML scale, and taste boost scale for :func:`generate_outfit`."""
    base_ml = float(runtime.ml_weight)
    if is_premium:
        return {
            "ml_explore_prob": 0.0,
            "ml_weight": base_ml * PREMIUM_ML_WEIGHT_MULT,
            "pers_strength": PREMIUM_PERSONALIZATION_STRENGTH,
        }
    return {
        "ml_explore_prob": float(runtime.ml_exploration_rate),
        "ml_weight": base_ml,
        "pers_strength": 1.0,
    }
