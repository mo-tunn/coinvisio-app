import { postgrestRequest } from '../supabaseClient.js';

export async function getSmartSignals(env, params) {
  return postgrestRequest(env, {
    table: 'smart_signals',
    params: {
      select: 'id,symbol,term,signal_type,entry_price,target_price,stop_loss,confidence_score,created_at',
      ...params
    }
  });
}
