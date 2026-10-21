# Endpoint Inventory

Sources: AuthService, CoinService, InsightService, RecommendationService.

Base path: `/api`

Auth: JWT Bearer for all endpoints except `/api/Auth/*`.
- Token validation: HS256 signature + exp; issuer/audience not validated; clock skew 0.
- User id is read from `sub` or `nameidentifier` claim and parsed as GUID.

Serialization: ASP.NET Core default JSON uses camelCase in responses. Request bodies are case-insensitive.

---

## AuthService (`/api/Auth`)

### POST `/api/Auth/signup`
Body (JSON):
```json
{
  "fullName": "string",
  "email": "string",
  "password": "string",
  "passwordConfirm": "string",
  "riskTolerance": 0
}
```
- `riskTolerance` enum: `0=Low`, `1=Medium`, `2=High` (serialized value in request; API is case-insensitive).

Responses:
- 200: `{ "message": "Registration successful, profile created.", "accessToken": "...", "refreshToken": "...", "user": { ... } }`
- 400: `{ "message": "Passwords do not match." }`
- 400: `{ "message": "Registration failed." }`
- 400: `{ "message": "Error: <exception message>" }`

### POST `/api/Auth/login`
Body (JSON):
```json
{
  "email": "string",
  "password": "string"
}
```
Responses:
- 200: `{ "message": "Login successful", "accessToken": "...", "refreshToken": "...", "user": { ... } }`
- 401: `{ "message": "Invalid email or password." }`

### POST `/api/Auth/logout`
Body: none.
Responses:
- 200: `{ "message": "Logged out successfully." }`

---

## CoinService (`/api/Coin`) - requires `Authorization: Bearer <jwt>`

### GET `/api/Coin/popular`
Response 200:
```json
[
  { "symbol": "BTC", "name": "Bitcoin", "logoUrl": "https://..." }
]
```

### GET `/api/Coin/search?keyword=...`
Query:
- `keyword` (required, string)

Responses:
- 200: `[
  "BTC",
  "ETH"
]`
- 400: `"Keyword is required"`

### GET `/api/Coin/history/{symbol}?limit=100`
Path:
- `symbol` (required, string)

Query:
- `limit` (optional, int, default 100)

Response 200:
```json
[
  {
    "id": 1,
    "symbol": "BTC",
    "recordedAt": "2026-01-01T00:00:00Z",
    "open": 100.0,
    "high": 110.0,
    "low": 90.0,
    "close": 105.0,
    "volume": 12345.67
  }
]
```

### GET `/api/Coin/mywatchlist`
Response 200:
```json
[
  { "symbol": "BTC", "name": "Bitcoin", "logoUrl": "https://..." }
]
```
Errors:
- 401: `"User ID not found in token"`

### POST `/api/Coin/mywatchlist/add?symbol=...`
Query:
- `symbol` (required, string)

Responses:
- 200: `{ "message": "Coin added to watchlist successfully" }`
- 400: `"Symbol is required"`
- 400: `"Coin is already in your watchlist"`
- 401: `"User ID not found in token"`
- 404: `"Coin with symbol '<symbol>' not found"`

### DELETE `/api/Coin/mywatchlist/remove?symbol=...`
Query:
- `symbol` (required, string)

Responses:
- 200: `{ "message": "Coin removed from watchlist successfully" }`
- 400: `"Symbol is required"`
- 401: `"User ID not found in token"`
- 404: `"Coin not found in your watchlist"`

---

## InsightService (`/api/Insight`) - requires `Authorization: Bearer <jwt>`

### GET `/api/Insight/getdailyinsights`
Response 200:
```json
{
  "id": 1,
  "insightText": "...",
  "sentiment": "...",
  "createdAt": "2026-01-01T00:00:00Z"
}
```
Errors:
- 404: `"No insights found."`

### GET `/api/Insight/getmarketregime`
Response 200:
```json
{
  "id": 1,
  "regimeLabel": "...",
  "clusterId": 2,
  "avgVolatility": 0.12,
  "avgReturn": 0.03,
  "description": "...",
  "createdAt": "2026-01-01T00:00:00Z"
}
```
Errors:
- 404: `"No market regime records found."`

---

## RecommendationService (`/api/Recommendation`) - requires `Authorization: Bearer <jwt>`

### GET `/api/Recommendation/getrecommendations?riskProfile=&since=&watchlist=false`
Query:
- `riskProfile` (optional, string)
- `since` (optional, datetime ISO 8601)
- `watchlist` (optional, bool, default false)

Behavior:
- Subscription tier is read from `profiles.subscription_tier` (default `free`).
- `free` tier always filters to `risk_profile == "Conservative"`.
- If `riskProfile` is provided, it is also applied as an additional filter.
- If `watchlist=true` and a user id exists, recommendations are filtered to watchlisted symbols and each recommendation only includes watchlisted coins.

Response 200:
```json
[
  {
    "id": 1,
    "riskProfile": "Conservative",
    "coins": [
      {
        "rsi": 50.1,
        "price": 100.0,
        "symbol": "BTC",
        "returns": 0.12,
        "volatility": 0.2,
        "volume_change": 0.3
      }
    ],
    "updatedAt": "2026-01-01T00:00:00Z"
  }
]
```

### GET `/api/Recommendation/getsignals?since=`
Query:
- `since` (optional, datetime ISO 8601)

Behavior:
- `free` tier restricts to symbols in `top_10_coins_by_volume`.
- Results are grouped by `(symbol, term)` and only the most recent record per group is returned.

Response 200:
```json
[
  {
    "id": 1,
    "symbol": "BTC",
    "term": "short",
    "signalType": "buy",
    "entryPrice": 100.0,
    "targetPrice": 120.0,
    "stopLoss": 90.0,
    "confidenceScore": 0.83,
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```
- For `free` tier, `confidenceScore` is `null`.

### GET `/api/Recommendation/getsignalhistory?symbol=&since=`
Query:
- `symbol` (required, string)
- `since` (optional, datetime ISO 8601)

Responses:
- 200: list of signal history, ordered ascending by `createdAt`.
- 400: `"symbol is required."`

### GET `/api/Recommendation/getcoinanomalies?since=`
Query:
- `since` (optional, datetime ISO 8601)

Behavior:
- `free` tier restricts to symbols in `top_10_coins_by_volume`.
- Results are grouped by `symbol` and only the most recent record per symbol is returned.

Response 200:
```json
[
  {
    "id": 1,
    "symbol": "BTC",
    "anomalyScore": 2.1,
    "anomalyType": "volume_spike",
    "priceAtDetection": 100.0,
    "detectedAt": "2026-01-01T00:00:00Z"
  }
]
```
