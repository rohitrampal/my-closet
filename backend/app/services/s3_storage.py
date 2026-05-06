"""Upload garment images to S3 with optional Cloudinary fallback."""

from __future__ import annotations

import asyncio
import hashlib
import logging
import threading
import time
import uuid
from urllib.parse import quote

import boto3
import httpx
from botocore.exceptions import BotoCoreError, ClientError

from app.config import get_settings
from app.core.logging_config import log_extra
from app.exceptions.app_exceptions import AppException

logger = logging.getLogger(__name__)

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024
_S3_RETRY_ATTEMPTS = 2
_storage_metrics_lock = threading.Lock()
_storage_metrics: dict[str, int] = {
    "upload_attempt_total": 0,
    "upload_success_s3_total": 0,
    "upload_success_cloudinary_total": 0,
    "upload_fail_total": 0,
    "fallback_attempt_total": 0,
    "fallback_success_total": 0,
    "fallback_fail_total": 0,
}

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


def _is_retryable_s3_error(exc: Exception) -> bool:
    if isinstance(exc, BotoCoreError):
        return True
    if isinstance(exc, ClientError):
        resp = exc.response or {}
        meta = resp.get("ResponseMetadata") or {}
        code = str((resp.get("Error") or {}).get("Code") or "").strip()
        status = int(meta.get("HTTPStatusCode") or 0)
        retryable_codes = {
            "RequestTimeout",
            "RequestTimeTooSkewed",
            "SlowDown",
            "InternalError",
            "ServiceUnavailable",
            "Throttling",
            "ThrottlingException",
        }
        if status >= 500:
            return True
        return code in retryable_codes
    return False


def _s3_error_details(exc: Exception) -> tuple[str, int]:
    if isinstance(exc, ClientError):
        resp = exc.response or {}
        meta = resp.get("ResponseMetadata") or {}
        code = str((resp.get("Error") or {}).get("Code") or "ClientError").strip() or "ClientError"
        status = int(meta.get("HTTPStatusCode") or 0)
        return code, status
    if isinstance(exc, BotoCoreError):
        return exc.__class__.__name__, 0
    return exc.__class__.__name__, 0


def _metric_inc(name: str) -> None:
    with _storage_metrics_lock:
        _storage_metrics[name] = int(_storage_metrics.get(name, 0)) + 1


def storage_metrics_snapshot() -> dict[str, int]:
    """Return in-process storage upload/fallback counters."""
    with _storage_metrics_lock:
        return dict(_storage_metrics)


def _cloudinary_signature(params: dict[str, str], api_secret: str) -> str:
    serialized = "&".join(f"{k}={params[k]}" for k in sorted(params))
    payload = f"{serialized}{api_secret}".encode("utf-8")
    return hashlib.sha1(payload).hexdigest()


def _upload_cloudinary_sync(
    *,
    cloud_name: str,
    api_key: str,
    api_secret: str,
    body: bytes,
    content_type: str,
    user_id: int,
    folder: str | None,
    timeout_seconds: float,
    ext: str,
) -> str:
    timestamp = str(int(time.time()))
    public_id = f"{user_id}_{uuid.uuid4().hex}"
    sign_params: dict[str, str] = {
        "public_id": public_id,
        "timestamp": timestamp,
    }
    if folder:
        sign_params["folder"] = folder.strip()
    signature = _cloudinary_signature(sign_params, api_secret)
    form_data: dict[str, str] = {
        **sign_params,
        "api_key": api_key,
        "signature": signature,
    }
    url = f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload"
    file_name = f"upload{ext}"
    with httpx.Client(timeout=timeout_seconds) as client:
        resp = client.post(
            url,
            data=form_data,
            files={"file": (file_name, body, content_type)},
        )
    if resp.status_code >= 400:
        raise RuntimeError(f"Cloudinary upload failed with status {resp.status_code}")
    payload = resp.json()
    secure_url = str(payload.get("secure_url") or "").strip()
    if not secure_url:
        raise RuntimeError("Cloudinary response missing secure_url")
    return secure_url


async def _try_upload_cloudinary_fallback(
    *,
    user_id: int,
    data: bytes,
    content_type: str,
    ext: str,
) -> str | None:
    settings = get_settings()
    if not settings.STORAGE_FALLBACK_TO_CLOUDINARY:
        return None
    cloud_name = (settings.CLOUDINARY_CLOUD_NAME or "").strip()
    api_key = (settings.CLOUDINARY_API_KEY or "").strip()
    api_secret = (settings.CLOUDINARY_API_SECRET or "").strip()
    folder = (settings.CLOUDINARY_FOLDER or "").strip() or None
    if not cloud_name or not api_key or not api_secret:
        _metric_inc("fallback_fail_total")
        logger.warning(
            "storage_fallback_cloudinary_unavailable",
            extra=log_extra(provider="cloudinary", reason="credentials_incomplete"),
        )
        return None
    _metric_inc("fallback_attempt_total")
    try:
        return await asyncio.to_thread(
            _upload_cloudinary_sync,
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            body=data,
            content_type=content_type,
            user_id=user_id,
            folder=folder,
            timeout_seconds=settings.CLOUDINARY_UPLOAD_TIMEOUT_SECONDS,
            ext=ext,
        )
    except (httpx.HTTPError, RuntimeError, ValueError) as exc:
        _metric_inc("fallback_fail_total")
        logger.warning(
            "storage_fallback_cloudinary_failed",
            extra=log_extra(provider="cloudinary", reason=exc.__class__.__name__, error=str(exc)),
        )
        return None


async def upload_clothes_object(*, user_id: int, data: bytes, content_type: str | None) -> str:
    """
    Store bytes at ``{user_id}/{uuid}{ext}`` in the configured bucket and return a public URL.

    Uses the default AWS credential chain (env keys, ``~/.aws/credentials``, IAM role, etc.).
    """
    settings = get_settings()
    _metric_inc("upload_attempt_total")
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

    storage_content_type = ct or "application/octet-stream"
    last_error: Exception | None = None
    for attempt in range(1, _S3_RETRY_ATTEMPTS + 1):
        try:
            await asyncio.to_thread(
                _put_object_sync,
                bucket=bucket,
                object_key=object_key,
                body=data,
                content_type=storage_content_type,
                region=region,
                endpoint_url=endpoint,
            )
            _metric_inc("upload_success_s3_total")
            logger.info(
                "storage_upload_provider_used",
                extra=log_extra(provider="s3", fallback_used=False, attempt=attempt),
            )
            break
        except (ClientError, BotoCoreError) as exc:
            last_error = exc
            retryable = _is_retryable_s3_error(exc)
            err_code, http_status = _s3_error_details(exc)
            logger.warning(
                "storage_upload_s3_attempt_failed",
                extra=log_extra(
                    provider="s3",
                    attempt=attempt,
                    max_attempts=_S3_RETRY_ATTEMPTS,
                    retryable=retryable,
                    error_code=err_code,
                    http_status=http_status,
                ),
            )
            if not retryable or attempt >= _S3_RETRY_ATTEMPTS:
                fallback_url = await _try_upload_cloudinary_fallback(
                    user_id=user_id,
                    data=data,
                    content_type=storage_content_type,
                    ext=ext,
                )
                if fallback_url:
                    _metric_inc("fallback_success_total")
                    _metric_inc("upload_success_cloudinary_total")
                    logger.info(
                        "storage_upload_provider_used",
                        extra=log_extra(
                            provider="cloudinary",
                            fallback_used=True,
                            fallback_reason=err_code,
                            fallback_http_status=http_status,
                        ),
                    )
                    return fallback_url
                _metric_inc("upload_fail_total")
                raise AppException(
                    "Could not upload image to storage.",
                    status_code=502,
                    error_code="STORAGE_UPLOAD_FAILED",
                ) from exc
            await asyncio.sleep(0.25 * attempt)
    else:
        if last_error is not None:
            _metric_inc("upload_fail_total")
            raise AppException(
                "Could not upload image to storage.",
                status_code=502,
                error_code="STORAGE_UPLOAD_FAILED",
            ) from last_error

    public_base = (settings.AWS_S3_PUBLIC_BASE_URL or "").strip() or None
    return _public_object_url(
        bucket=bucket,
        region=region,
        object_key=object_key,
        public_base=public_base,
    )
