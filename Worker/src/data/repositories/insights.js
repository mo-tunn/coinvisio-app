import { postgrestRequest } from '../supabaseClient.js';

export async function getLatestDailyInsight(env) {
  return postgrestRequest(env, {
    table: 'daily_insights',
    params: {
      order: 'created_at.desc',
      limit: '1'
    }
  });
}

export async function getLatestMarketRegime(env) {
  return postgrestRequest(env, {
    table: 'market_regime',
    params: {
      order: 'created_at.desc',
      limit: '1'
    }
  });
}
