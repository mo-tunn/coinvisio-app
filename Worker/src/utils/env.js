const DEFAULT_AUTH_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
];

const DEFAULT_RECOMMENDATION_ORIGINS = ['http://localhost:5173'];

export function getSupabaseUrl(env) {
  const raw = env.SUPABASE_URL;
  if (!raw) {
    throw new Error('SUPABASE_URL is required');
  }
  return raw.replace(/\/+$/, '');
}

export function getSupabaseKey(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_KEY;
  if (!key) {
    throw new Error('SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is required');
  }
  return key;
}


export function parseCsv(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function getCorsOrigins(env, key, fallback) {
  const value = env[key];
  const parsed = parseCsv(value);
  if (parsed.length > 0) return parsed;
  return fallback || [];
}

export function getAuthCorsOrigins(env) {
  return getCorsOrigins(env, 'CORS_AUTH_ORIGINS', DEFAULT_AUTH_ORIGINS);
}

export function getRecommendationCorsOrigins(env) {
  return getCorsOrigins(env, 'CORS_ALLOWED_ORIGINS', DEFAULT_RECOMMENDATION_ORIGINS);
}
