import { getAuthCorsOrigins, getRecommendationCorsOrigins } from '../utils/env.js';

function isOriginAllowed(origin, allowed) {
  if (allowed.includes('*')) return true;
  return allowed.includes(origin);
}

function applyCorsHeaders(headers, origin, allowCredentials, requestHeaders) {
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Vary', 'Origin');
  headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (requestHeaders) {
    headers.set('Access-Control-Allow-Headers', requestHeaders);
  } else {
    headers.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  }
  if (allowCredentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
}

function createCors(getOrigins) {
  return async (c, next) => {
    const origin = c.req.header('origin');
    if (!origin) {
      await next();
      return;
    }

    const origins = getOrigins(c.env);
    if (!isOriginAllowed(origin, origins)) {
      await next();
      return;
    }

    const requestedHeaders = c.req.header('access-control-request-headers');
    if (c.req.method === 'OPTIONS') {
      const res = new Response(null, { status: 204 });
      applyCorsHeaders(res.headers, origin, true, requestedHeaders);
      return res;
    }

    await next();
    applyCorsHeaders(c.res.headers, origin, true, requestedHeaders);
  };
}

export function corsForAuth() {
  return createCors(getAuthCorsOrigins);
}

export function corsForRecommendation() {
  return createCors(getRecommendationCorsOrigins);
}

// Use the same allowed origins as recommendations for coin APIs.
export function corsForCoin() {
  return createCors(getRecommendationCorsOrigins);
}

// Use the same allowed origins for insight APIs.
export function corsForInsight() {
  return createCors(getRecommendationCorsOrigins);
}

// Use the same allowed origins for notification APIs.
export function corsForNotification() {
  return createCors(getRecommendationCorsOrigins);
}

// Use the same allowed origins for Iris AI APIs.
export function corsForIris() {
  return createCors(getRecommendationCorsOrigins);
}
