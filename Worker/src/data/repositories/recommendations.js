import { postgrestRequest } from '../supabaseClient.js';

export async function getRecommendations(env, params) {
  return postgrestRequest(env, {
    table: 'recommendations',
    params: {
      select: 'id,risk_profile,coins,updated_at',
      ...params
    }
  });
}
