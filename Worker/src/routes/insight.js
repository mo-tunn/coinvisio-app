import { Hono } from 'hono';
import {
  fetchLatestDailyInsight,
  fetchLatestMarketRegime
} from '../services/insightService.js';
import { t } from '../utils/i18n.js';

const router = new Hono();

router.get('/getdailyinsights', async (c) => {
  const lang = c.get('lang') || 'en';
  const insight = await fetchLatestDailyInsight(c.env);
  if (!insight) {
    return c.text(t('insight.noInsights', lang), 404);
  }
  return c.json(insight);
});

router.get('/getmarketregime', async (c) => {
  const lang = c.get('lang') || 'en';
  const regime = await fetchLatestMarketRegime(c.env);
  if (!regime) {
    return c.text(t('insight.noRegimeRecords', lang), 404);
  }
  return c.json(regime);
});

export default router;
