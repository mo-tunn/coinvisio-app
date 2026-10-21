import { postgrestRequest } from '../supabaseClient.js';

export async function getUserProfile(env, userId) {
  const rows = await postgrestRequest(env, {
    table: 'profiles',
    params: {
      select: 'subscription_tier,risk_tolerance,preferred_language',
      id: `eq.${userId}`
    }
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function updateUserProfile(env, userId, payload) {
  if (!userId || !payload || typeof payload !== 'object') return null;

  const rows = await postgrestRequest(env, {
    table: 'profiles',
    method: 'PATCH',
    params: {
      id: `eq.${userId}`
    },
    body: payload,
    prefer: 'return=representation'
  });

  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function updateLanguagePreference(env, userId, preferredLanguage) {
  return updateUserProfile(env, userId, { preferred_language: preferredLanguage });
}
