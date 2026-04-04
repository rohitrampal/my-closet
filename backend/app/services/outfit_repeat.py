"""Track recently generated outfit triples per user (in-memory, TTL) for repeat avoidance."""

from __future__ import annotations

import threading
import time

from app.config import get_settings
from app.models.clothes import Clothes

_lock = threading.Lock()
# user_id -> list of (expires_at_monotonic, outfit_key) newest last, max 5 after prune
_store: dict[int, list[tuple[float, str]]] = {}


def outfit_triple_key(top_id: int, bottom_id: int | None, footwear_id: int) -> str:
    b = bottom_id if bottom_id is not None else 0
    return f"{top_id}-{b}-{footwear_id}"


def _load_pruned(user_id: int, now: float) -> list[tuple[float, str]]:
    raw = _store.get(user_id, [])
    kept = [(exp, k) for exp, k in raw if exp > now]
    if kept:
        _store[user_id] = kept
    elif user_id in _store:
        del _store[user_id]
    return kept


def repeat_penalty_for_outfit(
    user_id: int | None,
    top_id: int,
    bottom_id: int | None,
    footwear_id: int,
) -> float:
    """Return configured penalty if this triple is in the user's recent window."""
    if user_id is None:
        return 0.0
    s = get_settings()
    key = outfit_triple_key(top_id, bottom_id, footwear_id)
    now = time.monotonic()
    with _lock:
        entries = _load_pruned(user_id, now)
        for exp, k in entries:
            if k == key:
                return float(s.OUTFIT_REPEAT_PENALTY)
    return 0.0


def repeat_penalty_for_clothes(
    user_id: int | None,
    top: Clothes,
    bottom: Clothes | None,
    footwear: Clothes,
) -> float:
    bid = bottom.id if bottom is not None else None
    return repeat_penalty_for_outfit(user_id, top.id, bid, footwear.id)


def record_generated_outfit(
    user_id: int | None,
    top_id: int,
    bottom_id: int | None,
    footwear_id: int,
) -> None:
    if user_id is None:
        return
    s = get_settings()
    key = outfit_triple_key(top_id, bottom_id, footwear_id)
    now = time.monotonic()
    expires_at = now + float(s.OUTFIT_REPEAT_HISTORY_TTL_SECONDS)
    max_n = int(s.OUTFIT_REPEAT_HISTORY_MAX)
    with _lock:
        entries = _load_pruned(user_id, now)
        entries.append((expires_at, key))
        _store[user_id] = entries[-max_n:]
