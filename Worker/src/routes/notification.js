import { Hono } from 'hono';
import { requireAuth } from '../middlewares/auth.js';
import {
  getMyNotifications,
  getMyUnreadCount,
  markAsRead,
  markAllAsRead,
  getMyPreferences,
  updateMyPreferences,
  generateNotificationsJob
} from '../services/notificationService.js';
import { parseInteger } from '../utils/parsers.js';
import { t } from '../utils/i18n.js';

const router = new Hono();

router.use('*', requireAuth());

router.get('/', async (c) => {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const userId = auth?.userId;

  if (!userId) return c.text(t('error.unauthorized', lang), 401);

  const limit = parseInteger(c.req.query('limit'), 20);
  const cursor = c.req.query('cursor') || null;

  try {
    const notifications = await getMyNotifications(c.env, userId, { limit, cursor });

    let nextCursor = null;
    if (notifications && notifications.length > 0) {
      const lastItem = notifications[notifications.length - 1];
      nextCursor = `${lastItem.created_at},${lastItem.id}`;
    }

    return c.json({
      data: notifications,
      nextCursor
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return c.json({ error: t('notification.fetchFailed', lang) }, 500);
  }
});

router.get('/unread-count', async (c) => {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const userId = auth?.userId;

  try {
    const count = await getMyUnreadCount(c.env, userId);
    return c.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return c.json({ error: t('notification.unreadCountFailed', lang) }, 500);
  }
});

router.post('/mark-read', async (c) => {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const userId = auth?.userId;

  let body = {};
  try {
    body = await c.req.json();
  } catch {
    // ignore invalid JSON for backwards compatibility
  }

  try {
    if (body.all) {
      await markAllAsRead(c.env, userId);
      return c.json({ message: t('notification.markAllRead', lang) });
    }

    if (Array.isArray(body.notificationIds) && body.notificationIds.length > 0) {
      await markAsRead(c.env, userId, body.notificationIds);
      return c.json({ message: t('notification.markSelectedRead', lang) });
    }

    return c.json({ message: t('notification.noAction', lang) });
  } catch (error) {
    console.error('Error marking read:', error);
    return c.json({ error: t('notification.markReadFailed', lang) }, 500);
  }
});

router.get('/preferences', async (c) => {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const userId = auth?.userId;

  try {
    const prefs = await getMyPreferences(c.env, userId);
    return c.json(prefs);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return c.json({ error: t('notification.preferencesFetchFailed', lang) }, 500);
  }
});

router.post('/preferences', async (c) => {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const userId = auth?.userId;

  let body = [];
  try {
    body = await c.req.json();
  } catch {
    return c.text(t('notification.invalidJson', lang), 400);
  }

  if (!Array.isArray(body)) {
    return c.text(t('notification.invalidPreferencesBody', lang), 400);
  }

  try {
    await updateMyPreferences(c.env, userId, body);
    return c.json({ message: t('notification.preferencesUpdated', lang) });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return c.json({ error: t('notification.preferencesUpdateFailed', lang) }, 500);
  }
});

router.post('/jobs/generate', async (c) => {
  const lang = c.get('lang') || 'en';
  try {
    const results = await generateNotificationsJob(c.env);
    return c.json(results);
  } catch (error) {
    console.error('Error in generation job:', error);
    return c.json({ error: t('notification.jobFailed', lang) }, 500);
  }
});

export default router;
