import { postgrestRequest } from '../supabaseClient.js';

export async function getCoinAnomalies(env, params) {
  return postgrestRequest(env, {
    table: 'coin_anomalies',
    params: {
      select: 'id,symbol,anomaly_score,anomaly_type,price_at_detection,detected_at',
      ...params
    }
  });
}
