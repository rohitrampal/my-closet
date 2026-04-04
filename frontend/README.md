# Wardrobe — frontend foundation

Production-oriented React 19 + Vite base for a mobile-first wardrobe app: routing, layouts, Zustand (auth + UI), TanStack Query, Axios client, i18n (English / Hindi), and light/dark themes with `localStorage` persistence.

## Prerequisites

- **Node.js** 18+ (20+ recommended). This repo pins **Vite 6** so it runs on common LTS versions without requiring Node 20.19+ (needed for Vite 8).

## Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` and set `VITE_API_BASE_URL` to your API origin (no trailing slash). The example React Query call uses JSONPlaceholder separately and does not depend on your API.

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Vite dev server                      |
| `npm run build`    | TypeScript check + production build  |
| `npm run preview`  | Preview the production build locally |
| `npm run lint`     | ESLint (includes Prettier rule)      |
| `npm run format`   | Prettier write                       |
| `npm run format:check` | Prettier check                   |

## Project layout

```
src/
  app/                 # Router + root providers
  components/
    layout/            # Root, auth, app shell
    ui/                # Button, Input, Card, Loader
  lib/
    api/               # Axios client, errors, example API
    i18n/              # i18next config + locale JSON
  pages/               # Login, signup, dashboard placeholders
  stores/              # Zustand: auth (placeholder), UI (theme + language)
```

## Absolute imports

Path alias `@/*` → `src/*` (see `vite.config.ts` and `tsconfig.app.json`).

## API usage

- **Shared client:** `src/lib/api/client.ts` (`apiClient`) — base URL from `VITE_API_BASE_URL`, attaches `Authorization: Bearer` from the auth store, logs responses in dev, and on **401** (except login/register) clears auth, shows a toast, and redirects to `/login`.
- **Auth:** `src/lib/api/auth.ts` — `loginRequest` / `registerRequest` → `POST /auth/login`, `POST /auth/register`.
- **Clothes:** `src/lib/api/clothes.ts` + `src/lib/api/queries/useClothes.ts` — list/create/delete against `/clothes` (requires JWT). The backend must expose these routes (see repo `backend/`).

## i18n & theme

- Copy is in `src/lib/i18n/locales/*.json`. Toggle language on auth pages and dashboard header; **Login** / **लॉगिन** is under `auth.login`.
- Theme and language persist via Zustand `persist` (`localStorage` key `wardrobe-ui`). The `dark` class is applied on `<html>` for Tailwind `dark:` variants.

## Routes

| Path         | Layout   | Page        |
| ------------ | -------- | ----------- |
| `/`          | —        | → `/login`  |
| `/login`     | Auth     | Login       |
| `/signup`    | Auth     | Signup      |
| `/dashboard`       | App shell (auth) | Clothes grid   |
| `/dashboard/upload`| App shell (auth) | Add clothes    |

Phase 1 includes JWT auth (Zustand + `localStorage`), protected dashboard routes, and clothes CRUD UI against the FastAPI backend.
