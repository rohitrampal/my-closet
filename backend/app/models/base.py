"""Declarative base for all ORM models."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared metadata and future mixins (timestamps, etc.)."""

    __abstract__ = True
