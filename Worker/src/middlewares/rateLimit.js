import { t } from '../utils/i18n.js';

const POLICY_GLOBAL_API = {
  id: 'global_api',
  limit: 120,
  windowSec: 60,
  burst: 180,
  keyType: 'ip'
};

const POLICY_AUTH_LOGIN_SHORT = {
  id: 'auth_login_short',
  limit: 5,
  windowSec: 300,
  burst: 5,
  keyType: 'ipEmail'
};

const POLICY_AUTH_LOGIN_LONG = {
  id: 'auth_login_long',
  limit: 20,
  windowSec: 900,
  burst: 20,
  keyType: 'ip'
};

const POLICY_AUTH_SIGNUP = {
  id: 'auth_signup',
  limit: 3,
  windowSec: 1800,
  burst: 3,
  keyType: 'ip'
};

const POLICY_AUTH_REFRESH = {
  id: 'auth_refresh',
  limit: 20,
  windowSec: 60,
  burst: 20,
  keyType: 'userOrIp'
};

const POLICY_RECOMMENDATION = {
  id: 'recommendation',
  limit: 40,
  windowSec: 60,
  burst: 60,
  keyType: 'userOrIp'
};

const POLICY_IRIS = {
  id: 'iris',
  limit: 30,
  windowSec: 60,
  burst: 45,
  keyType: 'userOrIp'
};

const POLICY_INSIGHT = {
  id: 'insight',
  limit: 30,
  windowSec: 60,
  burst: 45,
  keyType: 'userOrIp'
};

const POLICY_COIN_SEARCH = {
  id: 'coin_search',
  limit: 30,
  windowSec: 60,
  burst: 45,
  keyType: 'userOrIp'
};

const POLICY_COIN_MARKET = {
  id: 'coin_market',
  limit: 30,
  windowSec: 60,
  burst: 45,
  keyType: 'userOrIp'
};

const POLICY_COIN_LIVE = {
  id: 'coin_live',
  limit: 60,
  windowSec: 60,
  burst: 90,
  keyType: 'userOrIp'
};

const POLICY_WATCHLIST_WRITE = {
  id: 'watchlist_write',
  limit: 10,
  windowSec: 60,
  burst: 15,
  keyType: 'userOrIp'
};

const POLICY_NOTIFICATION_READ = {
  id: 'notification_read',
  limit: 60,
  windowSec: 60,
  burst: 90,
  keyType: 'userOrIp'
};

const POLICY_NOTIFICATION_WRITE = {
  id: 'notification_write',
  limit: 20,
  windowSec: 60,
  burst: 30,
  keyType: 'userOrIp'
};

const POLICY_NOTIFICATION_JOB = {
  id: 'notification_job',
  limit: 1,
  windowSec: 600,
  burst: 1,
  keyType: 'ip'
};

function getClientIp(c) {
  const cfIp = c.req.header('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  const forwarded = c.req.header('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first) return first.trim();
  }

  const realIp = c.req.header('x-real-ip');
  if (realIp) return realIp.trim();

  return 'unknown';
}

function decodeJwtPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getBearerToken(c) {
  const authorization = c.req.header('authorization');
  if (!authorization) return null;
  const [scheme, token] = authorization.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

function getUserIdFromAuthorization(c) {
  const token = getBearerToken(c);
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  if (typeof payload.sub === 'string' && payload.sub.trim()) return payload.sub;
  if (typeof payload.user_id === 'string' && payload.user_id.trim()) return payload.user_id;
  return null;
}

async function getEmailFromBody(c) {
  const cached = c.get('rateLimitEmail');
  if (cached !== undefined) {
    return cached;
  }

  let email = null;
  try {
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await c.req.raw.clone().json();
      if (body && typeof body.email === 'string') {
        email = body.email.trim().toLowerCase();
      }
    }
  } catch {
    email = null;
  }

  c.set('rateLimitEmail', email);
  return email;
}

function getPoliciesForRequest(c) {
  const method = c.req.method.toUpperCase();
  const pathname = new URL(c.req.url).pathname.toLowerCase();
  const policies = [POLICY_GLOBAL_API];

  if (pathname === '/api/auth/login' && method === 'POST') {
    policies.push(POLICY_AUTH_LOGIN_SHORT, POLICY_AUTH_LOGIN_LONG);
  } else if (pathname === '/api/auth/signup' && method === 'POST') {
    policies.push(POLICY_AUTH_SIGNUP);
  } else if (pathname === '/api/auth/refresh' && method === 'POST') {
    policies.push(POLICY_AUTH_REFRESH);
  } else if (pathname.startsWith('/api/recommendation/')) {
    policies.push(POLICY_RECOMMENDATION);
  } else if (pathname.startsWith('/api/iris/')) {
    policies.push(POLICY_IRIS);
  } else if (pathname.startsWith('/api/insight/')) {
    policies.push(POLICY_INSIGHT);
  } else if (pathname === '/api/coin/search') {
    policies.push(POLICY_COIN_SEARCH);
  } else if (
    pathname.startsWith('/api/coin/history/')
    || pathname.startsWith('/api/coin/intraday/')
    || pathname === '/api/coin/quotes'
    || pathname === '/api/coin/meta'
    || pathname === '/api/coin/popular'
  ) {
    policies.push(POLICY_COIN_MARKET);
  } else if (pathname.startsWith('/api/coin/live/')) {
    policies.push(POLICY_COIN_LIVE);
  } else if (
    (pathname === '/api/coin/mywatchlist/add' && method === 'POST')
    || (pathname === '/api/coin/mywatchlist/remove' && method === 'DELETE')
  ) {
    policies.push(POLICY_WATCHLIST_WRITE);
  } else if (pathname === '/api/notification' || pathname.startsWith('/api/notification/')) {
    if (pathname === '/api/notification/jobs/generate') {
      policies.push(POLICY_NOTIFICATION_JOB);
    } else if (
      (pathname === '/api/notification/mark-read' && method === 'POST')
      || (pathname === '/api/notification/preferences' && method === 'POST')
    ) {
      policies.push(POLICY_NOTIFICATION_WRITE);
    } else {
      policies.push(POLICY_NOTIFICATION_READ);
    }
  }

  return policies;
}

async function buildRateLimitKey(c, policy, clientContext) {
  if (policy.keyType === 'ip') {
    return `ip:${clientContext.ip}`;
  }

  if (policy.keyType === 'userOrIp') {
    if (clientContext.userId) {
      return `user:${clientContext.userId}`;
    }
    return `ip:${clientContext.ip}`;
  }

  if (policy.keyType === 'ipEmail') {
    const email = await getEmailFromBody(c);
    if (email) {
      return `ip:${clientContext.ip}|email:${email}`;
    }
    return `ip:${clientContext.ip}|email:unknown`;
  }

  return `ip:${clientContext.ip}`;
}

function setRateLimitHeaders(c, result) {
  c.header('RateLimit-Limit', String(result.limit));
  c.header('RateLimit-Remaining', String(result.remaining));
  c.header('RateLimit-Reset', String(result.resetSec));
  c.header('X-RateLimit-Limit', String(result.limit));
  c.header('X-RateLimit-Remaining', String(result.remaining));
  c.header('X-RateLimit-Reset', String(result.resetSec));
}

async function consumeToken(c, policy, key) {
  const namespace = c.env?.RATE_LIMITER;
  if (!namespace || typeof namespace.idFromName !== 'function') {
    return {
      allowed: true,
      limit: policy.limit,
      remaining: policy.limit,
      resetSec: policy.windowSec,
      retryAfterSec: 0
    };
  }

  const objectId = namespace.idFromName(`${policy.id}:${key}`);
  const stub = namespace.get(objectId);
  const response = await stub.fetch('https://rate-limit/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      limit: policy.limit,
      windowSec: policy.windowSec,
      burst: policy.burst
    })
  });

  if (!response.ok) {
    throw new Error(`Rate limiter failed with status ${response.status}`);
  }

  return response.json();
}

export function rateLimit() {
  return async (c, next) => {
    if (c.req.method.toUpperCase() === 'OPTIONS') {
      return next();
    }

    const clientContext = {
      ip: getClientIp(c),
      userId: getUserIdFromAuthorization(c)
    };

    const policies = getPoliciesForRequest(c);
    let firstResult = null;

    for (const policy of policies) {
      let result;
      try {
        const key = await buildRateLimitKey(c, policy, clientContext);
        result = await consumeToken(c, policy, key);
      } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail-open to avoid taking down the API because of limiter issues.
        continue;
      }

      if (!firstResult) {
        firstResult = result;
      }

      if (!result.allowed) {
        const lang = c.get('lang') || 'en';
        setRateLimitHeaders(c, result);
        c.header('Retry-After', String(result.retryAfterSec));
        return c.json(
          {
            message: t('error.rateLimited', lang),
            retryAfter: result.retryAfterSec
          },
          429
        );
      }
    }

    if (firstResult) {
      setRateLimitHeaders(c, firstResult);
    }

    await next();
  };
}
