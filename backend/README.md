# Backend (FastAPI foundation)

Production-oriented scaffold: async SQLAlchemy 2.0, PostgreSQL, Alembic, structured logging, global error handling, security utilities (no auth routes yet).

## Prerequisites

- Python 3.11+
- PostgreSQL 16+ (local or Docker)

## Local setup

1. Create and activate a virtual environment, then install dependencies:

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Copy environment file and edit values:

```bash
copy .env.example .env
```

Ensure `DATABASE_URL` uses the `asyncpg` driver, for example:

`postgresql+asyncpg://USER:PASSWORD@localhost:5432/DBNAME`

3. Run migrations (from `backend/` so `.env` and `alembic.ini` resolve):

```bash
alembic upgrade head
```

4. Start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

5. Check health:

- [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- OpenAPI (when `ENV=dev`): [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Docker

From the `backend/` directory:

```bash
docker compose up --build
```

The API listens on port **8000**; PostgreSQL is exposed on **5432** for optional host access.

To run migrations inside the API container after the stack is up:

```bash
docker compose exec api alembic upgrade head
```

Override secrets and CORS via environment variables or a `.env` file in the same directory as `docker-compose.yml` (Compose substitutes `${SECRET_KEY}`, etc.).

## Project layout

- `app/main.py` — FastAPI app, lifespan, CORS
- `app/config.py` — Pydantic settings (`.env`)
- `app/core/` — database engine, logging, security helpers
- `app/dependencies/` — shared `Depends()` types (e.g. DB session)
- `app/api/` — routers: `GET /health`, `POST /auth/register`, `POST /auth/login`, `GET/POST /clothes`, `DELETE /clothes/{id}` (JWT on clothes)
- `app/models/` — `User`, `Clothes`
- `app/schemas/` — Pydantic response/request models
- `app/exceptions/` — `AppException` and global handlers
- `alembic/` — migrations

## Next steps

- After pulling changes, run `alembic upgrade head` to apply `users` / `clothes` tables (revision `c7d8e9f0a1b2`).
- Reinstall deps if needed: `pip install -r requirements.txt` (`pydantic[email]` for `EmailStr`).
