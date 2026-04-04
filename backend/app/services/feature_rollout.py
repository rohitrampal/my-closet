"""Percentage-based feature rollout using a stable per-user bucket (0–99)."""

from __future__ import annotations

import hashlib

# Namespace each feature so buckets are independent across flags.
_SALT_STYLIST = "rollout:stylist:v1"


def stable_rollout_bucket(user_id: int, feature_salt: str) -> int:
    """Deterministic integer in [0, 99] for ``user_id`` and feature namespace."""
    raw = f"{feature_salt}|{user_id}".encode("utf-8")
    digest = hashlib.sha256(raw).digest()
    return int.from_bytes(digest[:4], "big") % 100


def is_feature_enabled(user_id: int, rollout_percentage: int, *, feature_salt: str) -> bool:
    """
    Enable for ``user_id`` when ``stable_rollout_bucket(user_id) < rollout_percentage``.

    * ``rollout_percentage <= 0`` → nobody
    * ``rollout_percentage >= 100`` → everyone
    """
    pct = max(0, min(100, int(rollout_percentage)))
    if pct <= 0:
        return False
    if pct >= 100:
        return True
    return stable_rollout_bucket(user_id, feature_salt) < pct


def is_stylist_rollout_enabled_for_user(user_id: int, stylist_rollout_percentage: int) -> bool:
    """Stylist-specific rollout (uses dedicated salt for future decorrelation from other flags)."""
    return is_feature_enabled(user_id, stylist_rollout_percentage, feature_salt=_SALT_STYLIST)
