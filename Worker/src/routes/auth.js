import { Hono } from 'hono';
import { z } from 'zod';
import { signUp, signIn, signOut, getUser, refreshSession } from '../services/authService.js';
import { SupabaseError } from '../data/supabaseClient.js';
import { readJson, parseWithSchema } from '../utils/validation.js';
import { getUserProfile, updateLanguagePreference, updateUserProfile } from '../data/repositories/profiles.js';
import { requireAuth } from '../middlewares/auth.js';
import { normalizeLang, t } from '../utils/i18n.js';

const router = new Hono();

const signupSchema = z
  .object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
    passwordConfirm: z.string().optional(),
    riskTolerance: z.any().optional(),
    preferredLanguage: z.string().optional(),
    preferred_language: z.string().optional(),
    captchaToken: z.string().optional()
  })
  .passthrough();

const loginSchema = z
  .object({
    email: z.string().optional(),
    password: z.string().optional(),
    captchaToken: z.string().optional()
  })
  .passthrough();

const refreshSchema = z
  .object({
    refreshToken: z.string().optional(),
    refresh_token: z.string().optional()
  })
  .passthrough();

const languageSchema = z
  .object({
    preferredLanguage: z.string().optional(),
    preferred_language: z.string().optional(),
    data: z
      .object({
        preferredLanguage: z.string().optional(),
        preferred_language: z.string().optional()
      })
      .optional()
  })
  .passthrough();

async function hydrateUserProfile(env, user) {
  if (!user || !user.id) return user;
  try {
    const profile = await getUserProfile(env, user.id);
    if (profile) {
      if (!user.user_metadata) user.user_metadata = {};

      if (profile.subscription_tier) {
        user.user_metadata.subscription_tier = profile.subscription_tier;
      }

      if (profile.risk_tolerance !== undefined) {
        user.user_metadata.risk_tolerance = profile.risk_tolerance;
      }

      user.user_metadata.preferred_language = normalizeLang(profile.preferred_language || 'en');
    }
  } catch (profileErr) {
    console.warn('Auth profile sync failed:', profileErr);
  }

  return user;
}

async function verifyRecaptcha(env, token) {
  if (token === 'localhost-dummy-token') {
    return true; // Bypass for local development
  }
  if (!env.RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY is not set. Skipping verification.');
    return true; // Or throw error based on your preference
  }
  if (!token) return false;

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
  } catch (err) {
    console.error('reCAPTCHA verification error:', err);
    return false;
  }
}

router.post('/signup', async (c) => {
  const lang = c.get('lang') || 'en';
  const bodyResult = await readJson(c);
  if (!bodyResult.ok) {
    return c.json({ message: t('auth.invalidJson', lang) }, 400);
  }

  const parsed = parseWithSchema(signupSchema, bodyResult.data);
  if (!parsed.success) {
    return c.json({ message: t('auth.invalidBody', lang) }, 400);
  }

  const payload = parsed.data;

  // Verify CAPTCHA
  const isCaptchaValid = await verifyRecaptcha(c.env, payload.captchaToken);
  if (!isCaptchaValid) {
    return c.json({ message: t('auth.invalidCaptcha', lang) || 'Invalid CAPTCHA.' }, 400);
  }

  if (payload.password !== payload.passwordConfirm) {
    return c.json({ message: t('auth.passwordsMismatch', lang) }, 400);
  }

  const preferredLanguage = normalizeLang(payload.preferredLanguage || payload.preferred_language || lang);

  try {
    const result = await signUp(c.env, { ...payload, preferredLanguage });
    const user = result?.user;
    const session = result?.session || result;

    if (!user) {
      return c.json({ message: t('auth.registrationFailed', lang) }, 400);
    }

    try {
      await updateUserProfile(c.env, user.id, { preferred_language: preferredLanguage });
      if (!user.user_metadata) user.user_metadata = {};
      user.user_metadata.preferred_language = preferredLanguage;
    } catch (profileErr) {
      console.warn('Signup language sync failed:', profileErr);
    }

    return c.json({
      message: t('auth.registrationSuccess', lang),
      accessToken: session?.access_token ?? null,
      refreshToken: session?.refresh_token ?? null,
      user: await hydrateUserProfile(c.env, user)
    });
  } catch (err) {
    const message = err instanceof SupabaseError ? err.message : err?.message || t('error.unknown', lang);
    return c.json({ message: `Error: ${message}` }, 400);
  }
});

router.post('/login', async (c) => {
  const lang = c.get('lang') || 'en';
  const bodyResult = await readJson(c);
  if (!bodyResult.ok) {
    return c.json({ message: t('auth.invalidJson', lang) }, 400);
  }

  const parsed = parseWithSchema(loginSchema, bodyResult.data);
  if (!parsed.success) {
    return c.json({ message: t('auth.invalidBody', lang) }, 400);
  }

  // Verify CAPTCHA
  const isCaptchaValid = await verifyRecaptcha(c.env, parsed.data.captchaToken);
  if (!isCaptchaValid) {
    return c.json({ message: t('auth.invalidCaptcha', lang) || 'Invalid CAPTCHA.' }, 400);
  }

  try {
    const result = await signIn(c.env, parsed.data);
    const user = await hydrateUserProfile(c.env, result?.user);

    return c.json({
      message: t('auth.loginSuccess', lang),
      accessToken: result?.access_token ?? null,
      refreshToken: result?.refresh_token ?? null,
      user: user ?? null
    });
  } catch {
    return c.json({ message: t('auth.invalidCredentials', lang) }, 401);
  }
});

router.post('/refresh', async (c) => {
  const lang = c.get('lang') || 'en';
  const bodyResult = await readJson(c);
  if (!bodyResult.ok) {
    return c.json({ message: t('auth.invalidJson', lang) }, 400);
  }

  const parsed = parseWithSchema(refreshSchema, bodyResult.data);
  if (!parsed.success) {
    return c.json({ message: t('auth.invalidBody', lang) }, 400);
  }

  const refreshToken = parsed.data.refreshToken || parsed.data.refresh_token;
  if (!refreshToken) {
    return c.json({ message: t('auth.refreshTokenRequired', lang) }, 400);
  }

  try {
    const result = await refreshSession(c.env, refreshToken);
    const user = await hydrateUserProfile(c.env, result?.user ?? null);
    return c.json({
      message: t('auth.tokenRefreshed', lang),
      accessToken: result?.access_token ?? null,
      refreshToken: result?.refresh_token ?? refreshToken,
      user
    });
  } catch (err) {
    if (err instanceof SupabaseError && (err.status === 400 || err.status === 401)) {
      return c.json({ message: t('auth.refreshTokenInvalid', lang) }, 401);
    }
    const message = err instanceof SupabaseError ? err.message : err?.message || t('error.unknown', lang);
    return c.json({ message: `Error: ${message}` }, 500);
  }
});

router.post('/logout', async (c) => {
  const lang = c.get('lang') || 'en';
  const authHeader = c.req.header('authorization');
  const token = authHeader && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : null;

  if (token) {
    try {
      await signOut(c.env, token);
    } catch {
      // ignore logout errors to match idempotent behavior
    }
  }

  return c.json({ message: t('auth.loggedOut', lang) });
});

router.get('/me', async (c) => {
  const lang = c.get('lang') || 'en';
  const authHeader = c.req.header('authorization');
  const token = authHeader && authHeader.toLowerCase().startsWith('bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return c.json({ message: t('auth.noToken', lang) }, 401);
  }

  try {
    const user = await getUser(c.env, token);
    return c.json({ user: await hydrateUserProfile(c.env, user) });
  } catch (err) {
    console.error('Error fetching user:', err);
    const status = err.status || 401;
    return c.json({ message: t('auth.fetchUserFailed', lang), details: err.message }, status);
  }
});

router.patch('/language', requireAuth(), async (c) => {
  const lang = c.get('lang') || 'en';
  const bodyResult = await readJson(c);
  if (!bodyResult.ok) {
    return c.json({ message: t('auth.invalidJson', lang) }, 400);
  }

  const parsed = parseWithSchema(languageSchema, bodyResult.data);
  if (!parsed.success) {
    return c.json({ message: t('auth.invalidBody', lang) }, 400);
  }

  const rawPreferredLanguage = (parsed.data.preferredLanguage
    || parsed.data.preferred_language
    || parsed.data.data?.preferredLanguage
    || parsed.data.data?.preferred_language
    || '').toLowerCase();

  if (!['en', 'tr'].includes(rawPreferredLanguage)) {
    return c.json({ message: t('common.invalidLanguage', lang) }, 400);
  }

  const preferredLanguage = normalizeLang(rawPreferredLanguage);

  const auth = c.get('auth');
  const userId = auth?.userId;
  if (!userId) {
    return c.json({ message: t('coin.userIdMissing', lang) }, 401);
  }

  await updateLanguagePreference(c.env, userId, preferredLanguage);

  return c.json({
    message: t('auth.languageUpdated', lang),
    preferredLanguage
  });
});

router.post('/beta', requireAuth(), async (c) => {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const userId = auth?.userId;

  if (!userId) {
    return c.json({ message: t('coin.userIdMissing', lang) }, 401);
  }

  // Get user profile/email
  const user = await getUserProfile(c.env, userId);
  // We can also extract email from the request body as a fallback
  const bodyResult = await readJson(c);
  const email = bodyResult.ok && bodyResult.data?.email ? bodyResult.data.email : 'Unknown';

  try {
    // Update the profile in the database to mark that they applied for beta
    await updateUserProfile(c.env, userId, { beta_applied: true });
  } catch (e) {
    console.error('Failed to update profile for beta access:', e);
    // Continue anyway or return an error depending on strictness
  }

  return c.json({
    message: 'Beta access application received successfully.',
    success: true
  });
});

export default router;
