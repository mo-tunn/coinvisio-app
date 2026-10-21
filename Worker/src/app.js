import { Hono } from 'hono';
import { requestId } from './middlewares/requestId.js';
import { logger } from './middlewares/logging.js';
import { errorHandler } from './middlewares/error.js';
import { rateLimit } from './middlewares/rateLimit.js';
import { languageMiddleware } from './middlewares/language.js';
import { corsForAuth, corsForCoin, corsForInsight, corsForRecommendation, corsForNotification, corsForIris } from './middlewares/cors.js';
import authRoutes from './routes/auth.js';
import coinRoutes from './routes/coin.js';
import insightRoutes from './routes/insight.js';
import recommendationRoutes from './routes/recommendation.js';
import notificationRoutes from './routes/notification.js';
import irisRoutes from './routes/iris.js';
import { generateNotificationsJob } from './services/notificationService.js';
import { rpcRequest } from './data/supabaseClient.js';
import { openapi } from './openapi.js';
import { RateLimiterDO } from './durable-objects/rateLimiter.js';

const app = new Hono();

app.use('*', requestId());
app.use('*', logger());
app.use('*', languageMiddleware());

// Global CORS middleware - MUST DEFINED BEFORE app.options('*')
app.use('/api/Auth/*', corsForAuth());
app.use('/api/Coin/*', corsForCoin());
app.use('/api/Insight/*', corsForInsight());
app.use('/api/Recommendation/*', corsForRecommendation());
app.use('/api/Notification/*', corsForNotification());
app.use('/api/Iris/*', corsForIris());

// Safety net: handle preflight globally.
app.options('*', (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  });
});


// Global API rate limiting (additional endpoint-specific policies are resolved inside middleware).
app.use('/api/*', rateLimit());

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/openapi.json', (c) => c.json(openapi));

app.route('/api/Auth', authRoutes);
app.route('/api/Coin', coinRoutes);
app.route('/api/Insight', insightRoutes);
app.route('/api/Recommendation', recommendationRoutes);
app.route('/api/Notification', notificationRoutes);
app.route('/api/Iris', irisRoutes);

app.onError(errorHandler);

export { RateLimiterDO };

export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    ctx.waitUntil((async () => {
      console.log('CRON: Starting scheduled jobs...');

      try {
        console.log('CRON: Generating notifications...');
        await generateNotificationsJob(env);
      } catch (error) {
        console.error('CRON: Generation failed', error);
      }

      try {
        console.log('CRON: Cleaning up old notifications...');
        await rpcRequest(env, 'cleanup_notifications', {});
      } catch (error) {
        console.error('CRON: Cleanup failed', error);
      }

      console.log('CRON: Jobs completed.');
    })());
  }
};
