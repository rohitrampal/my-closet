"""Process-local in-memory caches with TTL and LRU eviction."""

from __future__ import annotations

import threading
import time
from collections import OrderedDict
from typing import Any

from app.config import get_settings


class TTLRUCache:
    """Fixed TTL per entry; LRU eviction when over max size."""

    __slots__ = ("_data", "_lock", "_maxsize", "_ttl")

    def __init__(self, *, ttl_seconds: float, maxsize: int) -> None:
        self._ttl = ttl_seconds
        self._maxsize = max(1, maxsize)
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= now:
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value: Any) -> None:
        now = time.monotonic()
        expires_at = now + self._ttl
        with self._lock:
            if key in self._data:
                del self._data[key]
            self._data[key] = (expires_at, value)
            self._data.move_to_end(key)
            while len(self._data) > self._maxsize:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


def _make_caches() -> tuple[TTLRUCache, TTLRUCache, TTLRUCache]:
    s = get_settings()
    ttl = float(s.MEMORY_CACHE_TTL_SECONDS)
    mx = int(s.MEMORY_CACHE_MAX_ENTRIES)
    return TTLRUCache(ttl_seconds=ttl, maxsize=mx), TTLRUCache(ttl_seconds=ttl, maxsize=mx), TTLRUCache(
        ttl_seconds=ttl, maxsize=mx
    )


ml_outfit_score_cache, outfit_generation_cache, ai_image_tag_cache = _make_caches()
