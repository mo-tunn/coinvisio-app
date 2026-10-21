import { Hono } from 'hono';
import { getHistoryList, getUsage, deleteSession } from '../services/irisService.js';
import { requireAuth } from '../middlewares/auth.js';
import { t } from '../utils/i18n.js';

const app = new Hono();
app.use('*', requireAuth());

function ensureAuthorizedUser(c, targetUserId) {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const requesterId = auth?.userId;
  if (!requesterId) {
    return c.json({ error: t('error.unauthorized', lang) }, 401);
  }
  if (!targetUserId || requesterId !== targetUserId) {
    return c.json({ error: t('error.forbidden', lang) }, 403);
  }
  return null;
}

app.get('/history/:userId', async (c) => {
  const lang = c.get('lang') || 'en';
  const userId = c.req.param('userId');

  if (!userId) {
    return c.json({ error: t('iris.userIdRequired', lang) }, 400);
  }

  const authError = ensureAuthorizedUser(c, userId);
  if (authError) return authError;

  const history = await getHistoryList(c.env, userId);
  return c.json(history);
});

app.get('/usage/:userId', async (c) => {
  const lang = c.get('lang') || 'en';
  const userId = c.req.param('userId');
  const tier = c.req.query('tier') || 'free';

  if (!userId) {
    return c.json({ error: t('iris.userIdRequired', lang) }, 400);
  }

  const authError = ensureAuthorizedUser(c, userId);
  if (authError) return authError;

  const usage = await getUsage(c.env, userId, tier);
  return c.json(usage);
});

app.delete('/history/:sessionId', async (c) => {
  const lang = c.get('lang') || 'en';
  const sessionId = c.req.param('sessionId');
  const userId = c.req.query('user_id');

  if (!sessionId || !userId) {
    return c.json({ error: t('iris.sessionAndUserRequired', lang) }, 400);
  }

  const authError = ensureAuthorizedUser(c, userId);
  if (authError) return authError;

  const result = await deleteSession(c.env, sessionId, userId);

  if (!result.success) {
    return c.json({ ...result, error: t('iris.deleteFailed', lang) }, 500);
  }

  return c.json(result);
});

export default app;
