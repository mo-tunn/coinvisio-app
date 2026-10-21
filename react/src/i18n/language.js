import i18n, { normalizeLanguage } from './index';
import { userService } from '../services/user.service';
import { isAuthenticated } from '../services/authService';

export function getLocalLanguage() {
  const stored = localStorage.getItem('cv_lang');
  return normalizeLanguage(stored || 'en');
}

export function setClientLanguage(lang) {
  const nextLang = normalizeLanguage(lang || 'en');

  if (i18n.language !== nextLang) {
    i18n.changeLanguage(nextLang);
  }

  localStorage.setItem('cv_lang', nextLang);
  document.documentElement.lang = nextLang;

  return nextLang;
}

export function getUserPreferredLanguage(user) {
  const fromMetadata = user?.user_metadata?.preferred_language;
  return fromMetadata ? normalizeLanguage(fromMetadata) : null;
}

export function syncLanguageFromUser(user) {
  const preferred = getUserPreferredLanguage(user);
  if (!preferred) return null;
  setClientLanguage(preferred);
  return preferred;
}

export async function persistLanguagePreference(lang) {
  if (!isAuthenticated()) return null;

  try {
    return await userService.updateLanguagePreference(normalizeLanguage(lang));
  } catch (error) {
    console.warn('Language preference sync failed:', error);
    return null;
  }
}

export async function changeLanguageAndPersist(lang, options = {}) {
  const { persistServer = true } = options;
  const nextLang = setClientLanguage(lang);

  if (persistServer) {
    void persistLanguagePreference(nextLang);
  }

  return nextLang;
}
