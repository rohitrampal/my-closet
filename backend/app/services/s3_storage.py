"""Upload garment images to Amazon S3; store only the public URL in the database."""

from __future__ import annotations

import asyncio
import logging
import uuid
from urllib.parse import quote

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings
from app.exceptions.app_exceptions import AppException

logger = logging.getLogger(__name__)

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024

_CONTENT_TYPE_EXT: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _normalize_content_type(raw: str | None) -> str | None:
    if not raw:
        return None
    return raw.split(";")[0].strip().lower()


def _public_object_url(*, bucket: str, region: str, object_key: str, public_base: str | None) -> str:
    encoded_key = quote(object_key, safe="/")
    root = (public_base or "").strip().rstrip("/")
    if root:
        return f"{root}/{encoded_key}"
    return f"https://{bucket}.s3.{region}.amazonaws.com/{encoded_key}"


def _put_object_sync(
    *,
    bucket: str,
    object_key: str,
    body: bytes,
    content_type: str,
    region: str,
    endpoint_url: str | None,
) -> None:
    session = boto3.session.Session()
    client_kw: dict = {"region_name": region}
    eu = (endpoint_url or "").strip()
    if eu:
        client_kw["endpoint_url"] = eu
    client = session.client("s3", **client_kw)
    client.put_object(
        Bucket=bucket,
        Key=object_key,
        Body=body,
        ContentType=content_type,
    )


async def upload_clothes_object(*, user_id: int, data: bytes, content_type: str | None) -> str:
    """
    Store bytes at ``{user_id}/{uuid}{ext}`` in the configured bucket and return a public URL.

    Uses the default AWS credential chain (env keys, ``~/.aws/credentials``, IAM role, etc.).
    """
    settings = get_settings()
    bucket = (settings.AWS_S3_BUCKET or "").strip()
    region = (settings.AWS_S3_REGION or "us-east-1").strip()
    if not bucket:
        raise AppException(
            "Image storage is not configured (set AWS_S3_BUCKET).",
            status_code=503,
            error_code="STORAGE_NOT_CONFIGURED",
        )

    ct = _normalize_content_type(content_type)
    ext = _CONTENT_TYPE_EXT.get(ct or "")
    if not ext:
        raise AppException(
            "Unsupported image type; use JPEG, PNG, or WebP.",
            status_code=400,
            error_code="INVALID_IMAGE_TYPE",
        )

    if len(data) > _MAX_UPLOAD_BYTES:
        raise AppException(
            "Image file is too large.",
            status_code=400,
            error_code="IMAGE_TOO_LARGE",
        )

    object_key = f"{user_id}/{uuid.uuid4().hex}{ext}"
    endpoint = (settings.AWS_ENDPOINT_URL_S3 or "").strip() or None

    try:
        await asyncio.to_thread(
            _put_object_sync,
            bucket=bucket,
            object_key=object_key,
            body=data,
            content_type=ct or "application/octet-stream",
            region=region,
            endpoint_url=endpoint,
        )
    except ClientError as exc:
        logger.warning("S3 put_object failed: %s", exc)
        raise AppException(
            "Could not upload image to storage.",
            status_code=502,
            error_code="STORAGE_UPLOAD_FAILED",
        ) from exc
    except BotoCoreError as exc:
        logger.warning("S3 client error: %s", exc)
        raise AppException(
            "Could not upload image to storage.",
            status_code=502,
            error_code="STORAGE_UPLOAD_FAILED",
        ) from exc

    public_base = (settings.AWS_S3_PUBLIC_BASE_URL or "").strip() or None
    return _public_object_url(
        bucket=bucket,
        region=region,
        object_key=object_key,
        public_base=public_base,
    )
