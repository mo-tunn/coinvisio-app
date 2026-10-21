import { getLang } from '../utils/i18n.js';

export function languageMiddleware() {
  return async (c, next) => {
    const lang = getLang(c);
    c.set('lang', lang);

    await next();

    c.header('Content-Language', lang);
  };
}
