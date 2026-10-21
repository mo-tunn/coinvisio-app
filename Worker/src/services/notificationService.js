import {
    getNotificationTypes,
    getUserPreferences,
    upsertUserPreference,
    getUnreadCount,
    fetchUserNotifications,
    markNotificationsRead,
    markAllNotificationsRead,
    createNotification,
    findRecentNotification
} from '../data/repositories/notifications.js';
import { getUsersByWatchlistSymbol } from '../data/repositories/watchlist.js';
import { fetchSignals, fetchCoinAnomalies } from './recommendationService.js';
import { getUserProfile } from '../data/repositories/profiles.js';
import { normalizeLang, t } from '../utils/i18n.js';

// --- Constants ---
const COOLDOWNS = {
    'anomaly_pump': 4 * 60 * 60, // 4 hours
    'anomaly_crash': 4 * 60 * 60,
    'anomaly_spike': 4 * 60 * 60,
    'ai_signal_buy': 6 * 60 * 60, // 6 hours
    'ai_signal_sell': 6 * 60 * 60,
    'rsi_overbought': 1 * 60 * 60,
    'rsi_oversold': 1 * 60 * 60,
    'daily_briefing': 24 * 60 * 60,
    'market_regime': 24 * 60 * 60
};

// --- Read API Services ---

export async function getMyNotifications(env, userId, options) {
    const { limit, cursor } = options;
    return fetchUserNotifications(env, userId, limit, cursor);
}

export async function getMyUnreadCount(env, userId) {
    return getUnreadCount(env, userId);
}

export async function markAsRead(env, userId, notificationIds) {
    if (!notificationIds || notificationIds.length === 0) return;
    return markNotificationsRead(env, userId, notificationIds);
}

export async function markAllAsRead(env, userId) {
    return markAllNotificationsRead(env, userId);
}

export async function getMyPreferences(env, userId) {
    const prefs = await getUserPreferences(env, userId);
    return prefs || [];
}

export async function updateMyPreferences(env, userId, preferences) {
    // preferences: array of { coin_symbol, preference_type, is_enabled }
    // Enrich with user_id
    // FIX: Using 'GLOBAL' instead of null to ensure UNIQUE constraint works in Postgres
    const payload = preferences.map(p => ({
        user_id: userId,
        coin_symbol: p.coin_symbol || 'GLOBAL',
        preference_type: p.preference_type,
        is_enabled: p.is_enabled
    }));
    return upsertUserPreference(env, userId, payload);
}

// --- Generation Logic Services ---

// 1. Helper to resolve Type ID from Code
async function getTypeId(env, code) {
    const types = await getNotificationTypes(env);
    const found = (Array.isArray(types) ? types : []).find(t => t.code === code);
    return found ? found.id : null;
}

// 2. Check if user wants this notification
async function isNotificationEnabled(env, userId, coinSymbol, typeCode, severity) {
    const prefs = await getUserPreferences(env, userId);

    if (!prefs || !Array.isArray(prefs) || prefs.length === 0) return true;

    // 1. Check Coin Specific
    if (coinSymbol) {
        const coinPref = prefs.find(p => p.coin_symbol === coinSymbol && p.preference_type === typeCode);
        if (coinPref && !coinPref.is_enabled) return false;

        // Check "all" for coin
        const coinAll = prefs.find(p => p.coin_symbol === coinSymbol && p.preference_type === 'all');
        if (coinAll && !coinAll.is_enabled) return false;
    }

    // 2. Check Global
    const globalPref = prefs.find(p => (p.coin_symbol === null || p.coin_symbol === 'GLOBAL') && p.preference_type === typeCode);
    if (globalPref && !globalPref.is_enabled) return false;

    const globalAll = prefs.find(p => (p.coin_symbol === null || p.coin_symbol === 'GLOBAL') && p.preference_type === 'all');
    if (globalAll && !globalAll.is_enabled) return false;

    // 3. Check Severity Filtering
    const severityPref = prefs.find(p => p.preference_type === 'high_severity_only');
    if (severityPref && severityPref.is_enabled && severity !== 'high') {
        return false;
    }

    return true;
}

// 3. Main Generator Function (Single User)
export async function sendNotification(env, params) {
    const {
        userId,
        typeCode,
        title,
        message,
        coinSymbol = null,
        severity = 'low',
        confidence = 1.0,
        payload = {}
    } = params;

    // Step 0: Get Type ID
    const typeId = await getTypeId(env, typeCode);
    if (!typeId) {
        console.warn(`Notification Type '${typeCode}' not found.`);
        return null;
    }

    // Step 1: Check Preferences
    const enabled = await isNotificationEnabled(env, userId, coinSymbol, typeCode, severity);
    if (!enabled) {
        return null;
    }

    // Step 2: Deduplication / Cooldown
    const cooldownSeconds = COOLDOWNS[typeCode] || 3600;
    const existing = await findRecentNotification(env, userId, coinSymbol, typeId, cooldownSeconds);

    if (existing) {
        return null;
    }

    // Step 3: Insert
    return createNotification(env, {
        user_id: userId,
        notification_type_id: typeId,
        title,
        message,
        coin_symbol: coinSymbol,
        severity,
        confidence,
        payload
    });
}

// 4. Batch Job Logic
export async function generateNotificationsJob(env) {
    const results = {
        signals: 0,
        anomalies: 0,
        notificationsSent: 0
    };
    const languageCache = new Map();
    const getUserLanguage = async (userId) => {
        if (languageCache.has(userId)) return languageCache.get(userId);
        try {
            const profile = await getUserProfile(env, userId);
            const lang = normalizeLang(profile?.preferred_language || 'en');
            languageCache.set(userId, lang);
            return lang;
        } catch {
            languageCache.set(userId, 'en');
            return 'en';
        }
    };

    // A. Process Recent Signals (Last 3 hours - expanded for safety)
    try {
        const lookbackWindow = 3 * 60 * 60 * 1000;
        const since = new Date(Date.now() - lookbackWindow);
        const signals = await fetchSignals(env, { since, pageSize: 50 }); // Fetch recent signals

        if (signals && signals.length > 0) {
            results.signals = signals.length;

            for (const signal of signals) {
                if (!signal.symbol) continue;

                // Find users watching this symbol
                const watchers = await getUsersByWatchlistSymbol(env, signal.symbol);

                if (watchers && watchers.length > 0) {
                    const typeCode = signal.type === 'LONG' ? 'ai_signal_buy' : 'ai_signal_sell';

                    for (const watcher of watchers) {
                        if (!watcher.user_id) continue;

                        const userLang = await getUserLanguage(watcher.user_id);
                        const sentiment = signal.type === 'LONG'
                            ? t('notification.sentimentBullish', userLang)
                            : t('notification.sentimentBearish', userLang);

                        await sendNotification(env, {
                            userId: watcher.user_id,
                            typeCode,
                            title: t('notification.aiSignalTitle', userLang, { sentiment }),
                            message: t('notification.aiSignalMessage', userLang, { sentiment, symbol: signal.symbol }),
                            coinSymbol: signal.symbol,
                            severity: 'medium', // Default for insights
                            confidence: signal.confidence || 0.8,
                            payload: {
                                sentiment,
                                entry: signal.entryPrice,
                                target: signal.targetPrice,
                                stop: signal.stopLoss,
                                reason: signal.reason
                            }
                        });
                        results.notificationsSent++;
                    }
                }
            }
        }
    } catch (err) {
        console.error('Job Signal Error:', err);
    }

    // B. Process Recent Anomalies (Last 3 hours)
    try {
        const lookbackWindow = 3 * 60 * 60 * 1000;
        const since = new Date(Date.now() - lookbackWindow);
        const anomalieResponse = await fetchCoinAnomalies(env, { since, limit: 50 });
        const anomalies = anomalieResponse.data;

        if (anomalies && anomalies.length > 0) {
            results.anomalies = anomalies.length;

            for (const anomaly of anomalies) {
                if (!anomaly.symbol) continue;

                const watchers = await getUsersByWatchlistSymbol(env, anomaly.symbol);

                if (watchers && watchers.length > 0) {
                    // Determine type
                    let typeCode = 'anomaly_spike'; // fallback
                    let severity = 'medium';
                    const typeLower = (anomaly.anomaly_type || '').toLowerCase();

                    if (typeLower.includes('pump')) {
                        typeCode = 'anomaly_pump';
                        severity = 'high';
                    } else if (typeLower.includes('crash') || typeLower.includes('dump')) {
                        typeCode = 'anomaly_crash';
                        severity = 'high';
                    }

                    for (const watcher of watchers) {
                        if (!watcher.user_id) continue;
                        const userLang = await getUserLanguage(watcher.user_id);

                        await sendNotification(env, {
                            userId: watcher.user_id,
                            typeCode,
                            title: t('notification.anomalyTitle', userLang, { symbol: anomaly.symbol }),
                            message: t('notification.anomalyMessage', userLang, {
                                anomalyType: anomaly.anomaly_type,
                                symbol: anomaly.symbol,
                                score: anomaly.anomaly_score
                            }),
                            coinSymbol: anomaly.symbol,
                            severity,
                            confidence: 0.9, // Anomalies are usually high confidence if reported
                            payload: {
                                score: anomaly.anomaly_score,
                                price: anomaly.price_at_detection,
                                type: anomaly.anomaly_type
                            }
                        });
                        results.notificationsSent++;
                    }
                }
            }
        }
    } catch (err) {
        console.error('Job Anomaly Error:', err);
    }

    return results;
}
