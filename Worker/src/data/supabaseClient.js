import { getSupabaseKey, getSupabaseUrl } from '../utils/env.js';

export class SupabaseError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'SupabaseError';
    this.status = status;
    this.details = details;
  }
}

function buildUrl(env, path, params) {
  const baseUrl = getSupabaseUrl(env);
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          url.searchParams.append(key, item);
        }
      } else {
        url.searchParams.set(key, value);
      }
    }
  }
  return url;
}

async function parseResponse(res) {
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

async function parseError(res) {
  const text = await res.text();
  if (!text) return { message: res.statusText };
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function supabaseRequest(env, options) {
  const {
    path,
    method = 'GET',
    params,
    body,
    headers,
    authToken,
    prefer
  } = options;

  const url = buildUrl(env, path, params);
  const apiKey = getSupabaseKey(env);
  const requestHeaders = new Headers();

  requestHeaders.set('apikey', apiKey);
  requestHeaders.set('Authorization', `Bearer ${authToken || apiKey}`);

  if (body !== undefined && body !== null) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (prefer) {
    requestHeaders.set('Prefer', prefer);
  }

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      requestHeaders.set(key, value);
    }
  }

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body !== undefined && body !== null ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const errorBody = await parseError(res);
    const message = errorBody?.message || res.statusText;
    throw new SupabaseError(message, res.status, errorBody);
  }

  return parseResponse(res);
}

export function postgrestRequest(env, options) {
  const { table, path, ...rest } = options;
  const target = path || `/rest/v1/${table}`;
  return supabaseRequest(env, { path: target, ...rest });
}

export function rpcRequest(env, fnName, args) {
  return supabaseRequest(env, {
    path: `/rest/v1/rpc/${fnName}`,
    method: 'POST',
    body: args || {}
  });
}

export function authRequest(env, path, options = {}) {
  return supabaseRequest(env, {
    path: `/auth/v1/${path}`,
    ...options
  });
}
