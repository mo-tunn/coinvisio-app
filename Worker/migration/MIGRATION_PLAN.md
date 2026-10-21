# Migration Plan (ASP.NET Core -> Cloudflare Workers JS)

Date: 2026-02-02

## Scope
- Migrate HTTP APIs from: AuthService, CoinService, InsightService, RecommendationService.
- BackgroundWorker is not an HTTP API. It uses Supabase Realtime + Firebase Admin SDK and needs a separate migration track (see Risks/Assumptions).

## Target Architecture (Workers)
- Single Cloudflare Worker (ESM, JavaScript only) hosting all routes under `/api/*`.
- Router/middleware: Hono.
- Validation: zod (JS usage only) + lightweight manual guards where the .NET API returns plain strings.
- Auth: JWT Bearer verification with Supabase JWT secret (HS256). No issuer/audience validation, clock skew 0 (match .NET).
- Data access: direct Supabase HTTP API via `fetch` (PostgREST + Auth), with a small wrapper for shared headers, query building, and error normalization.
- Logging: structured `console.log` with `requestId` (generated per request). Include method, path, status, duration.
- CORS: per-route policy to mirror current behavior (AuthService and RecommendationService only).
- OpenAPI: generate and serve a static spec at `/openapi.json` to match the .NET API surface.
- Add `/health` for runtime checks (not in .NET, documented as a platform-only endpoint).

## Key Decisions
1) Router: **Hono**
- Pros: native Workers support, clean middleware chain, simple routing, good DX without TS.
- Cons: slightly larger than itty-router but still reasonable.

2) Validation: **zod**
- Use only at runtime (no TypeScript). Transform validation errors into existing .NET error responses where applicable.

3) Supabase access: **Direct REST over `fetch`**
- Keeps bundle size small and avoids potential Node or supabase-js edge cases.
- PostgREST endpoints cover all current queries, filters, RPC calls, and joins.

4) JWT verification: **jose** (Web Crypto) or a small HS256 verifier
- Use `crypto.subtle` under the hood. No Node APIs.
- Preserve current validation: signature + exp, no iss/aud validation.

5) Error handling
- Central error middleware for unexpected failures.
- Keep existing response shapes (plain string vs `{ message: ... }`) for parity.

## Data Access Mapping (Supabase REST)
Base headers (for PostgREST):
- `apikey: <SUPABASE_KEY>`
- `Authorization: Bearer <SUPABASE_KEY>`
- `Content-Type: application/json`

Queries (examples):
- Popular coins: `GET /rest/v1/coins?is_active=eq.true&select=symbol,name,logo_url`
- Search RPC: `POST /rest/v1/rpc/search_crypto_symbols` body `{ "keyword": "btc" }`
- History RPC: `POST /rest/v1/rpc/get_symbol_history` body `{ "p_symbol": "BTC", "p_limit": 100 }`
- Watchlist + coin join: `GET /rest/v1/user_watchlists?user_id=eq.<uuid>&select=symbol,coin:coins(name,logo_url)`
- Recommendations: `GET /rest/v1/recommendations?...` (filters for `risk_profile`, `updated_at`)
- Signals: `GET /rest/v1/smart_signals?...`
- Anomalies: `GET /rest/v1/coin_anomalies?...`
- Profiles: `GET /rest/v1/profiles?id=eq.<uuid>&select=subscription_tier`
- Top coins: `GET /rest/v1/top_10_coins_by_volume?select=symbol`

Auth endpoints (Supabase Auth REST):
- Signup: `POST /auth/v1/signup` with `{ email, password, data: { full_name, subscription_tier, risk_tolerance } }`
- Login: `POST /auth/v1/token?grant_type=password` with `{ email, password }`
- Logout: `POST /auth/v1/logout` with `Authorization: Bearer <user_access_token>`

## Migration Steps (incremental)
1) **Inventory & contracts**: DONE -> `migration/ENDPOINT_INVENTORY.md`.
2) **Worker skeleton**: Hono router, health route, error middleware, request-id logging.
3) **Auth middleware**: JWT verification + `sub` extraction.
4) **Validation layer**: zod schemas for bodies/queries/params; map errors to current messages.
5) **Supabase data layer**: `src/data/supabaseClient.js` (fetch wrapper), `src/data/repositories/*.js`.
6) **Endpoints parity**: implement routes/handlers per inventory.
7) **Tests**: vitest + `@cloudflare/vitest-pool-workers` (miniflare-backed) for unit + integration.
8) **OpenAPI**: build spec and serve `/openapi.json`.
9) **Docs**: README, ARCHITECTURE, parity checklist.

## Risks / Assumptions
- **Risk tolerance enum**: .NET accepts `RiskTolerance` enum; JSON likely uses numeric values (0/1/2). We will accept both numeric and string values to avoid breaking clients.
- **Logout semantics**: Current `/api/Auth/logout` does not require auth but still returns 200. Supabase Auth logout requires a user token; we will keep 200 OK even if no token is provided (no-op).
- **Watchlist join**: .NET relies on Supabase model references to embed `coins` into `user_watchlists`. We will explicitly request the join via `select=` to preserve `name`/`logoUrl` output.
- **Unhandled errors**: .NET uses default exception handling (no custom middleware). We will standardize unexpected errors to 500 JSON with `{ message: "Internal server error" }` unless parity issues appear.
- **Invalid JSON**: Workers returns a 400 with `{ message: "Invalid JSON payload." }` when body is malformed. .NET would return a problem details payload. This is a known but low-impact difference.
- **BackgroundWorker**: Supabase Realtime + Firebase Admin SDK does not map directly to Workers. Needs a separate design (e.g., Supabase webhook -> Worker, or scheduled Worker + Queues).

## Mapping (.NET -> Workers)
- Controllers -> `src/routes/*.js` + `src/services/*.js`
- Supabase C# client -> `src/data/supabaseClient.js` + `src/data/repositories/*.js`
- appsettings.json -> Wrangler vars/secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `CORS_ALLOWED_ORIGINS`)
- JWT Bearer middleware -> `src/middlewares/auth.js`
- CORS policy -> `src/middlewares/cors.js`
- OpenAPI (AddOpenApi) -> `/openapi.json` route
