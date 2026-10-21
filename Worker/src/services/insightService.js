import {
  getLatestDailyInsight,
  getLatestMarketRegime
} from '../data/repositories/insights.js';
import { mapDailyInsight, mapMarketRegime } from '../utils/mappers.js';

export async function fetchLatestDailyInsight(env) {
  const rows = await getLatestDailyInsight(env);
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? mapDailyInsight(row) : null;
}

export async function fetchLatestMarketRegime(env) {
  const rows = await getLatestMarketRegime(env);
  const row = Array.isArray(rows) ? rows[0] : null;
  return row ? mapMarketRegime(row) : null;
}
