const messages = {
  en: {
    'auth.invalidJson': 'Invalid JSON payload.',
    'auth.invalidBody': 'Invalid request body.',
    'auth.passwordsMismatch': 'Passwords do not match.',
    'auth.registrationFailed': 'Registration failed.',
    'auth.registrationSuccess': 'Registration successful, profile created.',
    'auth.loginSuccess': 'Login successful.',
    'auth.invalidCredentials': 'Invalid email or password.',
    'auth.refreshTokenRequired': 'Refresh token is required.',
    'auth.refreshTokenInvalid': 'Refresh token is invalid or expired.',
    'auth.tokenRefreshed': 'Token refreshed.',
    'auth.loggedOut': 'Logged out successfully.',
    'auth.noToken': 'No token provided.',
    'auth.fetchUserFailed': 'Failed to fetch user.',
    'auth.missingAuthHeader': 'Missing or invalid authorization header.',
    'auth.serviceUnavailable': 'Authentication service unavailable.',
    'auth.languageUpdated': 'Language preference updated.',

    'common.invalidLanguage': 'Invalid language. Supported values are en and tr.',
    'common.dataUnavailable': 'Data unavailable.',

    'coin.keywordRequired': 'Keyword is required.',
    'coin.symbolRequired': 'Symbol is required.',
    'coin.symbolsRequired': 'Symbols are required.',
    'coin.userIdMissing': 'User ID not found in token.',
    'coin.fetchIntradayFailed': 'Failed to fetch intraday data.',
    'coin.fetchLiveFailed': 'Failed to fetch live price.',
    'coin.fetchLiveDataFailed': 'Failed to fetch live data.',
    'coin.coinNotFound': 'Coin not found.',
    'coin.watchlistLimitReached': 'Watchlist limit reached.',
    'coin.watchlistLimitFree': 'Free users can add up to 3 coins. Upgrade to Premium for up to 15 coins!',
    'coin.watchlistLimitPremium': 'You have reached the maximum watchlist limit of 15 coins.',
    'coin.coinSymbolNotFound': "Coin with symbol '{{symbol}}' not found.",
    'coin.coinAlreadyInWatchlist': 'Coin is already in your watchlist.',
    'coin.coinAddedWatchlist': 'Coin added to watchlist successfully.',
    'coin.coinNotInWatchlist': 'Coin not found in your watchlist.',
    'coin.coinRemovedWatchlist': 'Coin removed from watchlist successfully.',

    'insight.noInsights': 'No insights found.',
    'insight.noRegimeRecords': 'No market regime records found.',

    'iris.userIdRequired': 'User ID is required.',
    'iris.sessionAndUserRequired': 'Session ID and User ID are required.',
    'iris.deleteFailed': 'Failed to delete session.',

    'notification.fetchFailed': 'Failed to fetch notifications.',
    'notification.unreadCountFailed': 'Failed to fetch unread count.',
    'notification.markReadFailed': 'Failed to mark notifications as read.',
    'notification.preferencesFetchFailed': 'Failed to fetch preferences.',
    'notification.invalidJson': 'Invalid JSON.',
    'notification.invalidPreferencesBody': 'Body must be an array of preference objects.',
    'notification.preferencesUpdated': 'Preferences updated successfully.',
    'notification.preferencesUpdateFailed': 'Failed to update preferences.',
    'notification.jobFailed': 'Job failed.',
    'notification.markAllRead': 'All marked as read.',
    'notification.markSelectedRead': 'Selected notifications marked as read.',
    'notification.noAction': 'No action taken.',
    'notification.sentimentBullish': 'Bullish',
    'notification.sentimentBearish': 'Bearish',
    'notification.aiSignalTitle': 'AI Insight: {{sentiment}} Trend',
    'notification.aiSignalMessage': '{{sentiment}} sentiment detected for {{symbol}}. Review the latest analysis for more details.',
    'notification.anomalyTitle': 'Anomaly Detected: {{symbol}}',
    'notification.anomalyMessage': '{{anomalyType}} detected on {{symbol}}. Score: {{score}}',

    'recommendation.symbolRequired': 'Symbol is required.',

    'error.unknown': 'Unknown error.',
    'error.internal': 'Internal server error.',
    'error.unauthorized': 'Unauthorized.',
    'error.forbidden': 'Forbidden.',
    'error.rateLimited': 'Too many requests. Please retry later.'
  },
  tr: {
    'auth.invalidJson': 'Geçersiz JSON verisi.',
    'auth.invalidBody': 'Geçersiz istek gövdesi.',
    'auth.passwordsMismatch': 'Şifreler eşleşmiyor.',
    'auth.registrationFailed': 'Kayıt başarısız.',
    'auth.registrationSuccess': 'Kayıt başarılı, profil oluşturuldu.',
    'auth.loginSuccess': 'Giriş başarılı.',
    'auth.invalidCredentials': 'Geçersiz e-posta veya şifre.',
    'auth.refreshTokenRequired': 'Yenileme tokeni gerekli.',
    'auth.refreshTokenInvalid': 'Yenileme tokeni geçersiz veya süresi dolmuş.',
    'auth.tokenRefreshed': 'Token yenilendi.',
    'auth.loggedOut': 'Başarıyla çıkış yapıldı.',
    'auth.noToken': 'Token sağlanmadı.',
    'auth.fetchUserFailed': 'Kullanıcı bilgisi alınamadı.',
    'auth.missingAuthHeader': 'Yetkilendirme başlığı eksik veya geçersiz.',
    'auth.serviceUnavailable': 'Kimlik doğrulama servisine ulaşılamıyor.',
    'auth.languageUpdated': 'Dil tercihi güncellendi.',

    'common.invalidLanguage': "Geçersiz dil. Desteklenen değerler: 'en' ve 'tr'.",
    'common.dataUnavailable': 'Veri kullanılamıyor.',

    'coin.keywordRequired': 'Anahtar kelime gerekli.',
    'coin.symbolRequired': 'Sembol gerekli.',
    'coin.symbolsRequired': 'Semboller gerekli.',
    'coin.userIdMissing': 'Token içinde kullanıcı kimliği bulunamadı.',
    'coin.fetchIntradayFailed': 'Gün içi veri alınamadı.',
    'coin.fetchLiveFailed': 'Canlı fiyat alınamadı.',
    'coin.fetchLiveDataFailed': 'Canlı veri alınamadı.',
    'coin.coinNotFound': 'Coin bulunamadı.',
    'coin.watchlistLimitReached': 'İzleme listesi limitine ulaşıldı.',
    'coin.watchlistLimitFree': 'Ücretsiz kullanıcılar en fazla 3 coin ekleyebilir. Premium ile 15 coin ekleyebilirsiniz!',
    'coin.watchlistLimitPremium': '15 coinlik maksimum izleme listesi limitine ulaştınız.',
    'coin.coinSymbolNotFound': "'{{symbol}}' sembolüne sahip coin bulunamadı.",
    'coin.coinAlreadyInWatchlist': 'Coin zaten izleme listenizde.',
    'coin.coinAddedWatchlist': 'Coin izleme listesine eklendi.',
    'coin.coinNotInWatchlist': 'Coin izleme listenizde bulunamadı.',
    'coin.coinRemovedWatchlist': 'Coin izleme listesinden kaldırıldı.',

    'insight.noInsights': 'İçgörü bulunamadı.',
    'insight.noRegimeRecords': 'Piyasa rejimi kaydı bulunamadı.',

    'iris.userIdRequired': 'Kullanıcı kimliği gerekli.',
    'iris.sessionAndUserRequired': 'Oturum kimliği ve kullanıcı kimliği gerekli.',
    'iris.deleteFailed': 'Oturum silinemedi.',

    'notification.fetchFailed': 'Bildirimler alınamadı.',
    'notification.unreadCountFailed': 'Okunmamış bildirim sayısı alınamadı.',
    'notification.markReadFailed': 'Bildirimler okundu olarak işaretlenemedi.',
    'notification.preferencesFetchFailed': 'Tercihler alınamadı.',
    'notification.invalidJson': 'Geçersiz JSON.',
    'notification.invalidPreferencesBody': 'İstek gövdesi bir tercih nesneleri dizisi olmalıdır.',
    'notification.preferencesUpdated': 'Tercihler başarıyla güncellendi.',
    'notification.preferencesUpdateFailed': 'Tercihler güncellenemedi.',
    'notification.jobFailed': 'Görev başarısız oldu.',
    'notification.markAllRead': 'Tümü okundu olarak işaretlendi.',
    'notification.markSelectedRead': 'Seçili bildirimler okundu olarak işaretlendi.',
    'notification.noAction': 'Herhangi bir işlem yapılmadı.',
    'notification.sentimentBullish': 'Yükseliş',
    'notification.sentimentBearish': 'Düşüş',
    'notification.aiSignalTitle': 'Yapay Zeka İçgörüsü: {{sentiment}} Trend',
    'notification.aiSignalMessage': '{{symbol}} için {{sentiment}} eğilim tespit edildi. Ayrıntılar için en güncel analizi inceleyin.',
    'notification.anomalyTitle': 'Anomali Tespit Edildi: {{symbol}}',
    'notification.anomalyMessage': '{{symbol}} için {{anomalyType}} tespit edildi. Skor: {{score}}',

    'recommendation.symbolRequired': 'Sembol gerekli.',

    'error.unknown': 'Bilinmeyen hata.',
    'error.internal': 'Sunucu iç hatası.',
    'error.unauthorized': 'Yetkisiz erişim.',
    'error.forbidden': 'Erişim yasak.',
    'error.rateLimited': 'Çok fazla istek. Lütfen daha sonra tekrar deneyin.'
  }
};

const SUPPORTED = new Set(Object.keys(messages));

export function normalizeLang(lang) {
  return SUPPORTED.has(lang) ? lang : 'en';
}

function interpolate(template, params = {}) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = params[key];
    return value === undefined || value === null ? '' : String(value);
  });
}

export function t(key, lang = 'en', params = {}) {
  const locale = messages[normalizeLang(lang)] || messages.en;
  const fallback = messages.en[key] || key;
  const template = locale[key] || fallback;
  return interpolate(template, params);
}

export function getLang(c) {
  const customHeader = c.req.header('x-language') || c.req.header('X-Language');
  if (customHeader) {
    const custom = customHeader.toLowerCase().split(',')[0].trim();
    if (SUPPORTED.has(custom)) return custom;
  }

  const accept = (c.req.header('accept-language') || '').toLowerCase();
  if (!accept) return 'en';

  const parts = accept.split(',').map((part) => part.split(';')[0].trim());
  for (const part of parts) {
    if (part.startsWith('tr')) return 'tr';
    if (part.startsWith('en')) return 'en';
  }

  return 'en';
}

export function getSupportedLanguages() {
  return [...SUPPORTED];
}

export { messages };
