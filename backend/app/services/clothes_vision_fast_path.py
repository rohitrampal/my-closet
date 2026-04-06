"""Heuristic fast path: skip cloud vision for very flat / single-hue garment-like images."""

from __future__ import annotations

import io
import logging

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)


def should_use_local_vision_only(
    image_bytes: bytes,
    *,
    edge_max: float,
    color_share_min: float,
) -> bool:
    """
    Return True when the image is likely a simple product shot (low detail + one dominant color bucket).

    Uses a small RGB resize + mean edge magnitude + 32-step color bin concentration.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as im:
            im.load()
            rgb = im.convert("RGB").resize((64, 64), Image.Resampling.BILINEAR)
        arr = np.asarray(rgb, dtype=np.float32)
        if arr.size == 0:
            return False
        gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
        edge_h = float(np.abs(np.diff(gray, axis=1)).mean()) if gray.shape[1] > 1 else 0.0
        edge_v = float(np.abs(np.diff(gray, axis=0)).mean()) if gray.shape[0] > 1 else 0.0
        edge_score = (edge_h + edge_v) / 2.0
        if edge_score > edge_max:
            return False
        q = (arr // 32).astype(np.int64).clip(0, 7)
        flat = q.reshape(-1, 3)
        keys = np.ravel_multi_index((flat[:, 0], flat[:, 1], flat[:, 2]), (8, 8, 8))
        uniq, counts = np.unique(keys, return_counts=True)
        top_share = float(counts.max() / keys.size) if keys.size else 0.0
        return top_share >= color_share_min
    except Exception:
        logger.debug("vision fast path heuristic failed", exc_info=True)
        return False
