import { Hono } from 'hono';
import { requireAuth } from '../middlewares/auth.js';
import { parseBoolean, parseDate } from '../utils/parsers.js';
import {
  getUserAndTier,
  fetchRecommendations,
  fetchSignals,
  fetchSignalHistory,
  fetchCoinAnomalies
} from '../services/recommendationService.js';
import { t } from '../utils/i18n.js';

const router = new Hono();

router.use('*', requireAuth());

router.get('/getrecommendations', async (c) => {
  const riskProfile = c.req.query('riskProfile');
  const since = parseDate(c.req.query('since'));
  const at = parseDate(c.req.query('at'));
  const watchlist = parseBoolean(c.req.query('watchlist'), false);

  const auth = c.get('auth');
  const { userId, subscriptionTier } = await getUserAndTier(c.env, auth?.userId);

  const result = await fetchRecommendations(c.env, {
    userId,
    subscriptionTier,
    riskProfile,
    since,
    at,
    watchlist
  });

  return c.json(result);
});

router.get('/getsignals', async (c) => {
  const since = parseDate(c.req.query('since'));
  const search = c.req.query('search');
  const page = parseInt(c.req.query('page') || '1', 10);
  const pageSize = parseInt(c.req.query('pageSize') || '20', 10);

  const auth = c.get('auth');
  const { subscriptionTier } = await getUserAndTier(c.env, auth?.userId);

  const result = await fetchSignals(c.env, { subscriptionTier, since, search, page, pageSize });
  return c.json(result);
});

router.get('/getsignalhistory', async (c) => {
  const lang = c.get('lang') || 'en';
  const symbol = c.req.query('symbol');
  if (!symbol || !symbol.trim()) {
    return c.text(t('recommendation.symbolRequired', lang), 400);
  }

  const since = parseDate(c.req.query('since'));
  const auth = c.get('auth');
  const { subscriptionTier } = await getUserAndTier(c.env, auth?.userId);

  const result = await fetchSignalHistory(c.env, {
    subscriptionTier,
    since,
    symbol
  });

  return c.json(result);
});

router.get('/getcoinanomalies', async (c) => {
  const since = parseDate(c.req.query('since'));
  const auth = c.get('auth');
  const { subscriptionTier } = await getUserAndTier(c.env, auth?.userId);

  const result = await fetchCoinAnomalies(c.env, { subscriptionTier, since });
  return c.json(result);
});

export default router;
