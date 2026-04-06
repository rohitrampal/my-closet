FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY docker-entrypoint.sh /docker-entrypoint.sh
# Windows checkouts often use CRLF; kernel then fails with "no such file or directory" on shebang.
RUN sed -i 's/\r$//' /docker-entrypoint.sh && chmod +x /docker-entrypoint.sh

# Fail the image build if auth still uses passlib (avoids shipping an image that 500s on bcrypt>=4.1).
RUN python -c "import pathlib; t=pathlib.Path('app/core/security.py').read_text(); \
    assert 'pwd_context' not in t and 'from passlib' not in t and 'CryptContext' not in t, \
    'app/core/security.py must use bcrypt directly, not passlib'"

EXPOSE 8000

ENTRYPOINT ["/bin/sh", "/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
