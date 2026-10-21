import { authRequest, SupabaseError } from '../data/supabaseClient.js';
import { t } from '../utils/i18n.js';

function getBearerToken(header) {
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  if (parts[0].toLowerCase() !== 'bearer') return null;
  return parts[1];
}

export function requireAuth() {
  return async (c, next) => {
    const lang = c.get('lang') || 'en';
    const token = getBearerToken(c.req.header('authorization'));
    if (!token) {
      return new Response(JSON.stringify({ message: t('auth.missingAuthHeader', lang) }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Content-Language': lang
        }
      });
    }

    try {
      // Verify token by fetching the user from Supabase Auth API
      // This avoids needing the SUPABASE_JWT_SECRET environment variable
      const user = await authRequest(c.env, 'user', { authToken: token });

      if (!user || !user.id) {
        throw new Error('Invalid user');
      }

      c.set('auth', { token, user, userId: user.id });
      await next();
    } catch (err) {
      console.error('Auth error:', err);
      const isUnauthorized = err instanceof SupabaseError && (err.status === 401 || err.status === 403);
      const status = isUnauthorized ? 401 : 503;
      const message = isUnauthorized ? t('error.unauthorized', lang) : t('auth.serviceUnavailable', lang);
      return new Response(JSON.stringify({ message }), {
        status,
        headers: {
          'Content-Type': 'application/json',
          'Content-Language': lang
        }
      });
    }
  };
}
