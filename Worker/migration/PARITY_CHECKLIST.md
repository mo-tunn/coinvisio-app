# Parity Checklist

Legend: ? implemented, ?? partial/behavioral difference, ? not implemented.

| Area | Status | Notes |
| --- | --- | --- |
| Auth signup/login/logout | ? | Supabase Auth REST parity with .NET responses. |
| JWT verification (HS256, no iss/aud) | ? | Matches .NET validation settings. |
| CORS (Auth + Recommendation only) | ? | Same services expose CORS. |
| Coin endpoints (popular/search/history) | ? | RPC + PostgREST parity. |
| Watchlist CRUD | ? | Same semantics, join for coin info. |
| Insight endpoints | ? | Latest record behavior preserved. |
| Recommendations filtering | ? | Free tier + optional riskProfile + watchlist filter. |
| Smart signals grouping | ? | Latest per (symbol, term) and confidenceScore gating. |
| Signal history ordering | ? | Ascending by createdAt. |
| Coin anomalies grouping | ? | Latest per symbol. |
| Error bodies (explicit) | ? | Plain text vs JSON preserved. |
| Invalid JSON body errors | ?? | Workers returns `{ message: "Invalid JSON payload." }`, .NET returns problem details. |
| Invalid query type binding | ?? | Workers is lenient for invalid dates/ints; .NET would return 400 problem details. |
| OpenAPI | ? | Static spec at `/openapi.json`. |
| BackgroundWorker (Realtime + Firebase) | ? | Requires separate design. |
| IRISService endpoints | ? | No .NET controllers to port. |
