"""
Process-local state for the multi-provider clothes vision pipeline:

* last successful cloud provider (sticky routing)
* per-provider analytics (success / fail / low-confidence rejects, latency)
* circuit breaker (consecutive hard failures → cooldown)
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Any, Callable

from app.config import get_settings

CLOUD_PROVIDER_ORDER: tuple[str, ...] = ("gemini", "groq", "huggingface", "sarvam", "openai")
_ALL_PROVIDERS: tuple[str, ...] = (*CLOUD_PROVIDER_ORDER, "fallback")


@dataclass
class _Agg:
    success_count: int = 0
    fail_count: int = 0
    low_confidence_rejects: int = 0
    success_latency_ms_sum: float = 0.0


class ClothesVisionRuntime:
    """Thread-safe singleton (module-level instance below)."""

    __slots__ = (
        "_lock",
        "_last_success_cloud",
        "_stats",
        "_consecutive_failures",
        "_blocked_until",
        "_fast_path_hits",
    )

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._last_success_cloud: str | None = None
        self._stats: dict[str, _Agg] = {p: _Agg() for p in _ALL_PROVIDERS}
        self._consecutive_failures: dict[str, int] = {p: 0 for p in CLOUD_PROVIDER_ORDER}
        self._blocked_until: dict[str, float] = {}
        self._fast_path_hits: int = 0

    def note_fast_path(self) -> None:
        with self._lock:
            self._fast_path_hits += 1

    def is_provider_blocked(self, provider: str) -> bool:
        now = time.monotonic()
        with self._lock:
            until = self._blocked_until.get(provider, 0.0)
            if until <= now:
                self._blocked_until.pop(provider, None)
                return False
            return True

    def blocked_remaining_sec(self, provider: str) -> float | None:
        now = time.monotonic()
        with self._lock:
            until = self._blocked_until.get(provider, 0.0)
            if until <= now:
                return None
            return max(0.0, until - now)

    def build_cloud_try_order(self, is_eligible: Callable[[str], bool]) -> list[str]:
        """Preferred cloud first (if eligible and not blocked), then default order."""
        with self._lock:
            preferred = self._last_success_cloud
        ordered: list[str] = []
        if preferred and preferred in CLOUD_PROVIDER_ORDER:
            if is_eligible(preferred) and not self.is_provider_blocked(preferred):
                ordered.append(preferred)
        for p in CLOUD_PROVIDER_ORDER:
            if p in ordered:
                continue
            if not is_eligible(p):
                continue
            if self.is_provider_blocked(p):
                continue
            ordered.append(p)
        return ordered

    def record_hard_failure(self, provider: str, latency_ms: float) -> None:
        if provider not in CLOUD_PROVIDER_ORDER:
            return
        s = get_settings()
        threshold = int(s.VISION_CIRCUIT_FAILURE_THRESHOLD)
        cooldown = float(s.VISION_CIRCUIT_COOLDOWN_SECONDS)
        with self._lock:
            agg = self._stats.setdefault(provider, _Agg())
            agg.fail_count += 1
            cf = self._consecutive_failures.get(provider, 0) + 1
            self._consecutive_failures[provider] = cf
            if cf >= threshold:
                self._blocked_until[provider] = time.monotonic() + cooldown
                self._consecutive_failures[provider] = 0

    def record_low_confidence_reject(self, provider: str) -> None:
        with self._lock:
            self._stats.setdefault(provider, _Agg()).low_confidence_rejects += 1

    def record_success(self, provider: str, latency_ms: float, *, is_cloud: bool) -> None:
        with self._lock:
            agg = self._stats.setdefault(provider, _Agg())
            agg.success_count += 1
            agg.success_latency_ms_sum += max(0.0, latency_ms)
            if is_cloud and provider in CLOUD_PROVIDER_ORDER:
                self._last_success_cloud = provider
                self._consecutive_failures[provider] = 0
                self._blocked_until.pop(provider, None)

    def admin_snapshot_payload(self) -> dict[str, Any]:
        """JSON-serializable payload for GET /admin/vision-stats."""
        now = time.monotonic()
        prov_rows: list[dict[str, Any]] = []
        with self._lock:
            last = self._last_success_cloud
            fast_hits = self._fast_path_hits
            for p in _ALL_PROVIDERS:
                agg = self._stats.get(p) or _Agg()
                sc = agg.success_count
                avg = (agg.success_latency_ms_sum / sc) if sc else None
                until = self._blocked_until.get(p, 0.0)
                circuit_open = until > now
                rem = max(0.0, until - now) if circuit_open else None
                cf = self._consecutive_failures.get(p, 0) if p in CLOUD_PROVIDER_ORDER else 0
                prov_rows.append(
                    {
                        "provider": p,
                        "success_count": agg.success_count,
                        "fail_count": agg.fail_count,
                        "low_confidence_rejects": agg.low_confidence_rejects,
                        "avg_latency_ms": round(avg, 2) if avg is not None else None,
                        "consecutive_failures": cf,
                        "circuit_open": circuit_open,
                        "circuit_remaining_sec": round(rem, 1) if rem is not None else None,
                    }
                )
        return {
            "last_success_provider": last,
            "fast_path_hits_total": fast_hits,
            "providers": prov_rows,
        }


_runtime = ClothesVisionRuntime()


def get_vision_runtime() -> ClothesVisionRuntime:
    return _runtime
