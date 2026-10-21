# Architecture (Cloudflare Workers)

## Overview
- Single Worker hosts all HTTP APIs under `/api/*`.
- Router: Hono with middleware chain for request-id, logging, CORS, auth.
- Data access: direct Supabase REST (PostgREST + Auth) via `fetch` wrappers.
- No Node-only APIs; only Web Fetch/Crypto/URL.
- Platform endpoints: `/health` and `/openapi.json`.

## Request Flow
1) Request enters `src/app.js`.
2) Middleware stack:
   - request-id: generate or reuse `x-request-id`.
   - logging: structured log with method/path/status/duration.
   - route-level CORS (Auth + Recommendation only).
   - auth for protected routes (JWT HS256).
3) Route handler delegates to service.
4) Service uses repository functions (Supabase REST).
5) Responses are mapped to match .NET shapes.

## Auth
- Bearer JWT verified with `SUPABASE_JWT_SECRET`.
- Issuer/audience are not validated (matches .NET behavior).
- User id extracted from `sub` (or nameidentifier claim if present).

## Data Layer
- `src/data/supabaseClient.js` builds REST requests with shared headers.
- PostgREST tables used directly; RPC for `search_crypto_symbols` and `get_symbol_history`.
- Joins use `select=` (e.g., `user_watchlists` -> `coins`).

## Logging & Observability
- Structured JSON logs via `console.log`.
- Includes `requestId`, method, path, status, duration.
- Errors logged via `console.error` in centralized error handler.

## CORS
- `Auth` routes allow local dev origins by default.
- `Recommendation` routes use `CORS_ALLOWED_ORIGINS` env.
- Other routes emit no CORS headers (mirrors .NET services).

## Background Worker (Out of Scope)
- Supabase Realtime + Firebase Admin SDK does not map to Workers.
- Options:
  - Supabase webhooks -> Worker + Queues.
  - Scheduled Worker (cron) polling/anomaly checks.
  - Client-side Supabase Realtime subscriptions for UI updates.

## Files
- `src/app.js`: main router wiring.
- `src/routes/*`: HTTP routes.
- `src/services/*`: business logic.
- `src/data/*`: Supabase REST wrappers and repositories.
- `src/middlewares/*`: auth/cors/logging/error/request-id.
- `src/utils/*`: parsing, mapping, env, JWT helpers.
