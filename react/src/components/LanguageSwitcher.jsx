import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguageAndPersist } from '../i18n/language';
import { useAuth } from '../context';

const LANGUAGE_OPTIONS = ['en', 'tr'];

const LanguageSwitcher = ({ className = '' }) => {
  const { i18n, t } = useTranslation('common');
  const { isAuthenticated } = useAuth();

  const activeLanguage = i18n.language === 'tr' ? 'tr' : 'en';

  const handleLanguageChange = async (lang) => {
    if (lang === activeLanguage) return;
    await changeLanguageAndPersist(lang, { persistServer: isAuthenticated });
  };

  return (
    <div className={`inline-flex items-center rounded-sm border border-gray-800 bg-[#050810] p-1 font-mono-custom ${className}`.trim()}>
      {LANGUAGE_OPTIONS.map((lang) => {
        const isActive = activeLanguage === lang;
        return (
          <button
            key={lang}
            type="button"
            onClick={() => handleLanguageChange(lang)}
            className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              isActive
                ? 'bg-blue-900/30 text-blue-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            aria-label={t('language.switchTo', { lang: lang.toUpperCase() })}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
