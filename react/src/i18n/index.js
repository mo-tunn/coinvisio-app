import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import commonEN from './locales/en/common.json';
import indexEN from './locales/en/index.json';
import authEN from './locales/en/auth.json';
import dashboardEN from './locales/en/dashboard.json';
import coinsEN from './locales/en/coins.json';
import signalsEN from './locales/en/signals.json';
import recommendationsEN from './locales/en/recommendations.json';
import anomaliesEN from './locales/en/anomalies.json';
import profileEN from './locales/en/profile.json';
import notificationsEN from './locales/en/notifications.json';
import irisEN from './locales/en/iris.json';
import introEN from './locales/en/intro.json';
import legalEN from './locales/en/legal.json';

import commonTR from './locales/tr/common.json';
import indexTR from './locales/tr/index.json';
import authTR from './locales/tr/auth.json';
import dashboardTR from './locales/tr/dashboard.json';
import coinsTR from './locales/tr/coins.json';
import signalsTR from './locales/tr/signals.json';
import recommendationsTR from './locales/tr/recommendations.json';
import anomaliesTR from './locales/tr/anomalies.json';
import profileTR from './locales/tr/profile.json';
import notificationsTR from './locales/tr/notifications.json';
import irisTR from './locales/tr/iris.json';
import introTR from './locales/tr/intro.json';
import legalTR from './locales/tr/legal.json';

const FALLBACK_LANG = 'en';
const SUPPORTED_LANGS = ['en', 'tr'];

function getSavedLanguage() {
  try {
    const saved = localStorage.getItem('cv_lang');
    return SUPPORTED_LANGS.includes(saved) ? saved : FALLBACK_LANG;
  } catch {
    return FALLBACK_LANG;
  }
}

function syncHtmlLanguage(lang) {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
  }
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEN,
        index: indexEN,
        auth: authEN,
        dashboard: dashboardEN,
        coins: coinsEN,
        signals: signalsEN,
        recommendations: recommendationsEN,
        anomalies: anomaliesEN,
        profile: profileEN,
        notifications: notificationsEN,
        iris: irisEN,
        intro: introEN,
        legal: legalEN
      },
      tr: {
        common: commonTR,
        index: indexTR,
        auth: authTR,
        dashboard: dashboardTR,
        coins: coinsTR,
        signals: signalsTR,
        recommendations: recommendationsTR,
        anomalies: anomaliesTR,
        profile: profileTR,
        notifications: notificationsTR,
        iris: irisTR,
        intro: introTR,
        legal: legalTR
      }
    },
    lng: getSavedLanguage(),
    fallbackLng: FALLBACK_LANG,
    supportedLngs: SUPPORTED_LANGS,
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  })
  .then(() => {
    syncHtmlLanguage(i18n.language || FALLBACK_LANG);
  });

i18n.on('languageChanged', (lng) => {
  const language = SUPPORTED_LANGS.includes(lng) ? lng : FALLBACK_LANG;
  syncHtmlLanguage(language);
  try {
    localStorage.setItem('cv_lang', language);
  } catch {
    // ignore storage errors
  }
});

export const normalizeLanguage = (lang) => (SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG);

export default i18n;
