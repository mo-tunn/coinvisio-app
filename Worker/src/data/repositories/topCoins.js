import { postgrestRequest } from '../supabaseClient.js';

export async function getTopCoins(env) {
  return postgrestRequest(env, {
    table: 'top_10_coins_by_volume',
    params: {
      select: 'symbol'
    }
  });
}
