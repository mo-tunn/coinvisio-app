function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function toPositiveNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

export class RateLimiterDO {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method !== 'POST') {
      return jsonResponse({ message: 'Method not allowed' }, 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ message: 'Invalid JSON payload.' }, 400);
    }

    const limit = toPositiveNumber(payload?.limit);
    const windowSec = toPositiveNumber(payload?.windowSec);
    const burstRaw = toPositiveNumber(payload?.burst);

    if (!limit || !windowSec) {
      return jsonResponse({ message: 'limit and windowSec must be positive numbers.' }, 400);
    }

    const burst = burstRaw || limit;
    const refillPerMs = limit / (windowSec * 1000);

    if (!Number.isFinite(refillPerMs) || refillPerMs <= 0) {
      return jsonResponse({ message: 'Invalid refill rate.' }, 400);
    }

    return this.state.blockConcurrencyWhile(async () => {
      const nowMs = Date.now();
      const stored = await this.state.storage.get('bucket');

      let tokens = typeof stored?.tokens === 'number' ? stored.tokens : burst;
      let lastRefillMs = typeof stored?.lastRefillMs === 'number' ? stored.lastRefillMs : nowMs;

      if (nowMs > lastRefillMs) {
        const elapsedMs = nowMs - lastRefillMs;
        tokens = Math.min(burst, tokens + elapsedMs * refillPerMs);
        lastRefillMs = nowMs;
      }

      let allowed = false;
      if (tokens >= 1) {
        tokens -= 1;
        allowed = true;
      }

      const remaining = Math.max(0, Math.floor(tokens));
      const retryAfterSec = allowed
        ? 0
        : Math.max(1, Math.ceil(((1 - tokens) / refillPerMs) / 1000));
      const resetSec = Math.max(1, Math.ceil(((burst - tokens) / refillPerMs) / 1000));

      await this.state.storage.put('bucket', {
        tokens,
        lastRefillMs
      });

      // Keep data only while active.
      await this.state.storage.setAlarm(nowMs + Math.max(windowSec * 2000, 60_000));

      return jsonResponse({
        allowed,
        limit,
        burst,
        windowSec,
        remaining,
        retryAfterSec,
        resetSec
      });
    });
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}
