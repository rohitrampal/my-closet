"""
Multi-provider garment vision with:

* sticky routing (last successful cloud first)
* confidence gating (min threshold; else try next / best-effort)
* fast path (simple images → local only)
* circuit breaker + in-process analytics (see :mod:`app.services.clothes_vision_runtime`)
"""

from __future__ import annotations

import hashlib
import logging
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError
from typing import Any

from app.config import Settings, get_settings
from app.core.logging_config import log_extra
from app.services import groq_vision_tagging, hf_vision_tagging, sarvam_vision_tagging
from app.services.ai_tagging import analyze_image_bytes as local_analyze_bytes
from app.services.clothes_vision_fast_path import should_use_local_vision_only
from app.services.clothes_vision_runtime import CLOUD_PROVIDER_ORDER, get_vision_runtime
from app.services.gemini_tagging import analyze_image_bytes as gemini_analyze_bytes
from app.services.memory_cache import vision_pipeline_cache
from app.services.openai_vision_tagging import analyze_image_bytes as openai_analyze_bytes

logger = logging.getLogger(__name__)

_CACHE_PREFIX = "pv1:"


def _fallback_confidence(hints: dict[str, str]) -> float:
    t = str(hints.get("type", "")).strip()
    c = str(hints.get("color", "")).strip()
    s = str(hints.get("style", "")).strip()
    filled = sum(1 for x in (t, c, s) if x)
    if filled >= 3:
        return 0.56
    if filled == 2:
        return 0.50
    return 0.44


def _cloud_eligible(provider: str, settings: Settings) -> bool:
    if provider == "gemini":
        return bool((settings.GEMINI_API_KEY or "").strip()) and not settings.GEMINI_DISABLED
    if provider == "groq":
        return bool((settings.GROQ_API_KEY or "").strip())
    if provider == "huggingface":
        return bool((settings.HF_API_TOKEN or "").strip())
    if provider == "sarvam":
        return bool((settings.SARVAM_API_KEY or "").strip())
    if provider == "openai":
        return bool((settings.OPENAI_API_KEY or "").strip())
    return False


def _make_cloud_fn(provider: str, image_bytes: bytes, timeout_sec: float) -> Callable[[], dict[str, Any] | None]:
    if provider == "gemini":
        return lambda: gemini_analyze_bytes(image_bytes)
    if provider == "groq":
        return lambda: groq_vision_tagging.analyze_image_bytes(image_bytes, timeout=timeout_sec)
    if provider == "huggingface":
        return lambda: hf_vision_tagging.analyze_image_bytes(image_bytes, timeout=timeout_sec)
    if provider == "sarvam":
        return lambda: sarvam_vision_tagging.analyze_image_bytes(image_bytes, timeout=timeout_sec)
    if provider == "openai":
        return lambda: openai_analyze_bytes(image_bytes)
    return lambda: None


def _run_step(
    provider: str,
    fn: Callable[[], dict[str, Any] | None],
    timeout_sec: float,
) -> tuple[dict[str, Any] | None, float, bool]:
    """Returns ``(result, elapsed_ms, timed_out)``."""
    with ThreadPoolExecutor(max_workers=1) as pool:
        fut = pool.submit(fn)
        t0 = time.perf_counter()
        try:
            out = fut.result(timeout=timeout_sec)
            return out, (time.perf_counter() - t0) * 1000, False
        except FuturesTimeoutError:
            return None, (time.perf_counter() - t0) * 1000, True


def _local_payload(image_bytes: bytes) -> tuple[dict[str, Any], float]:
    hints = local_analyze_bytes(image_bytes)
    conf = _fallback_confidence(hints)
    return (
        {
            "type": hints.get("type") or "",
            "color": hints.get("color") or "",
            "style": hints.get("style") or "",
            "confidence": conf,
        },
        conf,
    )


def analyze_garment_image(image_bytes: bytes) -> tuple[dict[str, Any], str]:
    """
    Return ``({"type","color","style","confidence"}, provider_name)``.

    Cloud order is dynamic (sticky last success), then confidence-filtered; see module docstring.
    """
    settings = get_settings()
    timeout_sec = float(settings.VISION_STEP_TIMEOUT_SECONDS)
    min_conf = float(settings.VISION_MIN_ACCEPT_CONFIDENCE)
    rt = get_vision_runtime()

    cache_key = _CACHE_PREFIX + hashlib.sha256(image_bytes).hexdigest()
    cached = vision_pipeline_cache.get(cache_key)
    if isinstance(cached, dict) and cached.get("payload") is not None and cached.get("provider"):
        logger.info(
            "clothes_vision_cache_hit",
            extra=log_extra(provider=str(cached["provider"])),
        )
        return dict(cached["payload"]), str(cached["provider"])

    if settings.VISION_FAST_PATH_ENABLED and should_use_local_vision_only(
        image_bytes,
        edge_max=float(settings.VISION_FAST_PATH_EDGE_MAX),
        color_share_min=float(settings.VISION_FAST_PATH_COLOR_SHARE_MIN),
    ):
        rt.note_fast_path()
        payload, conf = _local_payload(image_bytes)
        logger.info(
            "clothes_vision_fast_path",
            extra=log_extra(provider="fallback", confidence=conf, reason="simple_image_heuristic"),
        )
        rt.record_success("fallback", 0.0, is_cloud=False)
        vision_pipeline_cache.set(cache_key, {"payload": dict(payload), "provider": "fallback"})
        return payload, "fallback"

    eligible = lambda p: _cloud_eligible(p, settings)
    try_order = rt.build_cloud_try_order(eligible)

    if not try_order:
        circuit: dict[str, bool] = {p: rt.is_provider_blocked(p) for p in CLOUD_PROVIDER_ORDER}
        logger.warning(
            "clothes_vision_no_eligible_cloud_providers",
            extra=log_extra(
                gemini_disabled=settings.GEMINI_DISABLED,
                has_gemini_key=bool((settings.GEMINI_API_KEY or "").strip()),
                has_groq_key=bool((settings.GROQ_API_KEY or "").strip()),
                has_hf_token=bool((settings.HF_API_TOKEN or "").strip()),
                has_sarvam_key=bool((settings.SARVAM_API_KEY or "").strip()),
                has_openai_key=bool((settings.OPENAI_API_KEY or "").strip()),
                circuit_open_for=tuple(p for p, b in circuit.items() if b),
            ),
        )

    low_confidence_candidates: list[tuple[str, dict[str, Any], float, float]] = []

    for provider in try_order:
        fn = _make_cloud_fn(provider, image_bytes, timeout_sec)
        result, elapsed_ms, timed_out = _run_step(provider, fn, timeout_sec)
        if timed_out:
            logger.warning(
                "clothes_vision_step_timeout",
                extra=log_extra(provider=provider, timeout_sec=timeout_sec, elapsed_ms=round(elapsed_ms, 1)),
            )
            rt.record_hard_failure(provider, elapsed_ms)
            continue
        if result is None:
            logger.warning(
                "clothes_vision_provider_no_result",
                extra=log_extra(provider=provider, elapsed_ms=round(elapsed_ms, 1)),
            )
            rt.record_hard_failure(provider, elapsed_ms)
            continue

        conf = float(result.get("confidence") or 0.0)
        if conf < min_conf:
            logger.warning(
                "clothes_vision_low_confidence",
                extra=log_extra(
                    provider=provider,
                    confidence=round(conf, 3),
                    min_confidence=min_conf,
                    elapsed_ms=round(elapsed_ms, 1),
                ),
            )
            rt.record_low_confidence_reject(provider)
            low_confidence_candidates.append((provider, dict(result), conf, elapsed_ms))
            continue

        logger.info(
            "clothes_vision_provider_used",
            extra=log_extra(
                provider=provider,
                confidence=round(conf, 3),
                elapsed_ms=round(elapsed_ms, 1),
                timed_out=False,
            ),
        )
        rt.record_success(provider, elapsed_ms, is_cloud=True)
        vision_pipeline_cache.set(cache_key, {"payload": dict(result), "provider": provider})
        return result, provider

    if low_confidence_candidates:
        best_p, best_res, best_c, best_ms = max(low_confidence_candidates, key=lambda x: x[2])
        logger.info(
            "clothes_vision_best_effort",
            extra=log_extra(
                provider=best_p,
                confidence=round(best_c, 3),
                min_confidence=min_conf,
                elapsed_ms=round(best_ms, 1),
            ),
        )
        rt.record_success(best_p, best_ms, is_cloud=True)
        vision_pipeline_cache.set(cache_key, {"payload": dict(best_res), "provider": best_p})
        return best_res, best_p

    if try_order:
        logger.warning(
            "clothes_vision_all_cloud_providers_failed",
            extra=log_extra(
                attempted=tuple(try_order),
                hint="Check logs for clothes_vision_provider_no_result / step_timeout; verify model IDs and API keys in the container.",
            ),
        )

    payload, conf = _local_payload(image_bytes)
    logger.info(
        "clothes_vision_provider_used",
        extra=log_extra(provider="fallback", confidence=round(conf, 3), reason="all_clouds_exhausted"),
    )
    rt.record_success("fallback", 0.0, is_cloud=False)
    vision_pipeline_cache.set(cache_key, {"payload": dict(payload), "provider": "fallback"})
    return payload, "fallback"
