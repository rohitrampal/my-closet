#!/usr/bin/env python3
"""
Train outfit likeability ranker from ``outfit_feedback`` (async DB).

Usage (from ``backend/``):
  python scripts/train_outfit_ranker.py

Requires DATABASE_URL in the environment (same as the API).
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
from collections import defaultdict

import numpy as np

# Ensure ``app`` is importable when run as a script
_BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from sqlalchemy import select

from app.config import get_settings
from app.core.database import AsyncSessionLocal
from app.models.clothes import Clothes
from app.models.outfit_feedback import OutfitFeedback
from app.ml.model import (
    FEATURE_NAMES,
    bundle_metadata,
    outfit_feature_vector,
    personalization_from_prior_feedback,
    save_bundle,
    train_bundle,
)

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("train_outfit_ranker")


async def _load_training_data() -> tuple[list[tuple[OutfitFeedback, Clothes, Clothes | None, Clothes]], dict[int, Clothes]]:
    async with AsyncSessionLocal() as session:
        fr = await session.execute(select(OutfitFeedback).order_by(OutfitFeedback.user_id, OutfitFeedback.created_at))
        feedback_rows = list(fr.scalars().all())
        if not feedback_rows:
            return [], {}

        ids: set[int] = set()
        for r in feedback_rows:
            ids.add(r.top_id)
            ids.add(r.footwear_id)
            if r.bottom_id is not None:
                ids.add(r.bottom_id)

        cr = await session.execute(select(Clothes).where(Clothes.id.in_(ids)))
        by_id = {c.id: c for c in cr.scalars().all()}

    triples: list[tuple[OutfitFeedback, Clothes, Clothes | None, Clothes]] = []
    for r in feedback_rows:
        top = by_id.get(r.top_id)
        shoe = by_id.get(r.footwear_id)
        bottom = by_id.get(r.bottom_id) if r.bottom_id is not None else None
        if top is None or shoe is None:
            logger.warning("Skipping feedback id=%s missing clothes", r.id)
            continue
        if r.bottom_id is not None and bottom is None:
            logger.warning("Skipping feedback id=%s missing bottom", r.id)
            continue
        triples.append((r, top, bottom, shoe))

    return triples, by_id


def _build_matrix(
    triples: list[tuple[OutfitFeedback, Clothes, Clothes | None, Clothes]],
    clothes_by_id: dict[int, Clothes],
) -> tuple:
    by_user: dict[int, list[OutfitFeedback]] = defaultdict(list)
    for r, *_ in triples:
        by_user[r.user_id].append(r)

    X_list: list = []
    y_list: list = []

    # Process each user independently so prior = earlier rows only
    feedback_to_triple: dict[int, tuple[Clothes, Clothes | None, Clothes]] = {}
    for r, top, bottom, shoe in triples:
        feedback_to_triple[r.id] = (top, bottom, shoe)

    for user_id, rows in by_user.items():
        rows.sort(key=lambda x: x.created_at)
        prior: list[OutfitFeedback] = []
        for r in rows:
            top, bottom, shoe = feedback_to_triple[r.id]
            pers = personalization_from_prior_feedback(prior, r.created_at, clothes_by_id)
            x = outfit_feature_vector(top, bottom, shoe, pers)
            X_list.append(x)
            y_list.append(1 if r.liked else 0)
            prior.append(r)

    if not X_list:
        return np.zeros((0, len(FEATURE_NAMES))), np.array([]), 0

    X = np.vstack(X_list)
    y = np.array(y_list, dtype=np.int32)
    return X, y, len(X_list)


async def main() -> int:
    get_settings()  # fail fast if .env missing
    triples, by_id = await _load_training_data()
    if not triples:
        logger.error("No outfit_feedback rows (or no resolvable clothes). Nothing to train.")
        return 1

    X, y, n = _build_matrix(triples, by_id)
    logger.info("Dataset: %s rows, features=%s", n, FEATURE_NAMES)
    if n > 0:
        logger.info(
            "  liked=%s disliked=%s mean(features)=%s",
            int(np.sum(y == 1)),
            int(np.sum(y == 0)),
            X.mean(axis=0).round(4).tolist(),
        )

    bundle = train_bundle(X, y)
    if bundle is None:
        logger.error("Training aborted (insufficient data or single class).")
        return 1

    path = save_bundle(bundle)
    logger.info("Saved model to %s", path)
    logger.info("Metadata: %s", bundle_metadata(bundle))
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
