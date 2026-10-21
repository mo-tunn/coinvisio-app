import { t } from '../utils/i18n.js';

export function errorHandler(err, c) {
  const requestId = c.get('requestId');
  const lang = c.get('lang') || 'en';
  const log = {
    level: 'error',
    requestId,
    message: err?.message || 'Unhandled error',
    stack: err?.stack || null
  };
  console.error(JSON.stringify(log));

  if (err?.status && err?.body) {
    if (typeof err.body === 'string') {
      return c.text(err.body, err.status);
    }
    return c.json(err.body, err.status);
  }

  return c.json({ message: t('error.internal', lang) }, 500);
}
