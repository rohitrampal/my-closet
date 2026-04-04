"""Aggregate API routers (v1+)."""

from fastapi import APIRouter

from app.api.v1 import admin as admin_v1
from app.api.v1 import auth as auth_v1
from app.api.v1 import clothes as clothes_v1
from app.api.v1 import health as health_v1
from app.api.v1 import outfit as outfit_v1

api_router = APIRouter()
api_router.include_router(health_v1.router, tags=["health"])
api_router.include_router(auth_v1.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin_v1.router, prefix="/admin", tags=["admin"])
api_router.include_router(clothes_v1.router, prefix="/clothes", tags=["clothes"])
api_router.include_router(outfit_v1.router, prefix="/outfit", tags=["outfit"])
