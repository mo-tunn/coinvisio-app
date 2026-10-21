import { authRequest } from '../data/supabaseClient.js';
import { parseRiskTolerance } from '../utils/parsers.js';
import { getUserProfile } from '../data/repositories/profiles.js';
import { normalizeLang } from '../utils/i18n.js';

export async function signUp(env, payload) {
  const parsedRisk = parseRiskTolerance(payload?.riskTolerance);
  const riskTolerance = parsedRisk === null ? 0 : parsedRisk;
  const preferredLanguage = normalizeLang(payload?.preferredLanguage || payload?.preferred_language || 'en');

  const body = {
    email: payload?.email,
    password: payload?.password,
    data: {
      full_name: payload?.fullName ?? null,
      subscription_tier: 'free',
      risk_tolerance: riskTolerance,
      preferred_language: preferredLanguage
    }
  };

  return authRequest(env, 'signup', {
    method: 'POST',
    body
  });
}

export async function signIn(env, payload) {
  const body = {
    email: payload?.email,
    password: payload?.password
  };

  return authRequest(env, 'token?grant_type=password', {
    method: 'POST',
    body
  });
}

export async function refreshSession(env, refreshToken) {
  return authRequest(env, 'token?grant_type=refresh_token', {
    method: 'POST',
    body: {
      refresh_token: refreshToken
    }
  });
}

export async function signOut(env, accessToken) {
  return authRequest(env, 'logout', {
    method: 'POST',
    authToken: accessToken
  });
}

export async function getUser(env, accessToken) {
  // 1. Get Auth User
  const user = await authRequest(env, 'user', {
    method: 'GET',
    authToken: accessToken
  });

  if (!user || !user.id) {
    console.warn('getUser: No user found in Authv1');
    return null;
  }

  console.log('getUser: Found Auth User:', user.id, 'Metadata:', user.user_metadata);

  // 2. Get Public Profile Data (Source of Truth for Subscription)
  try {
    const profile = await getUserProfile(env, user.id);
    console.log('getUser: Fetched Profile:', profile);

    // 3. Merge Profile Data into User Metadata (for Frontend Compatibility)
    if (profile) {
      if (!user.user_metadata) user.user_metadata = {};

      if (profile.subscription_tier) {
        console.log('getUser: Overwriting subscription_tier with:', profile.subscription_tier);
        user.user_metadata.subscription_tier = profile.subscription_tier;
      }

      // Also sync risk tolerance if present
      if (profile.risk_tolerance !== undefined) {
        user.user_metadata.risk_tolerance = profile.risk_tolerance;
      }

      user.user_metadata.preferred_language = profile.preferred_language || 'en';
    } else {
      console.warn('getUser: Profile invalid or missing subscription_tier', profile);
    }
  } catch (err) {
    console.warn('Failed to fetch user profile:', err);
    // Fallback to auth metadata if profile fetch fails
  }

  console.log('getUser: Returning final user object:', JSON.stringify(user));
  return user;
}
