import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components';
import { useNotification } from '../../context';
import { notificationService } from '../../services/notification.service';
import { coinService } from '../../services/coin.service';
import { Loader, Save, BellRing, Settings, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context';
import { useTranslation } from 'react-i18next';

// --- Coin Logo Helpers (Copied from Coins.jsx) ---
const COIN_NAMES = {
    btc: 'bitcoin',
    eth: 'ethereum',
    sol: 'solana',
    avax: 'avalanche',
    bnb: 'bnb',
    xrp: 'xrp',
    ada: 'cardano',
    doge: 'dogecoin',
    dot: 'polkadot',
    matic: 'polygon',
    link: 'chainlink',
    uni: 'uniswap',
    ltc: 'litecoin',
    atom: 'cosmos',
    xlm: 'stellar',
    etc: 'ethereum-classic',
    fil: 'filecoin',
    trx: 'tron',
    near: 'near-protocol',
    algo: 'algorand'
};

function getDisplaySymbol(symbol) {
    return symbol
        ?.replace('/USDT', '')
        ?.replace('USDT', '')
        ?.replace('-USD', '')
        ?.replace('/', '') || symbol;
}

function getCoinName(symbol) {
    return COIN_NAMES[symbol] || symbol;
}

function getLogoUrl(symbol) {
    const cleanSymbol = getDisplaySymbol(symbol)?.toLowerCase();
    return `https://cryptologos.cc/logos/${getCoinName(cleanSymbol)}-${cleanSymbol}-logo.png`;
}
// --------------------------------------------------

const PreferenceToggle = ({ label, checked, onChange, description, compact = false }) => (
    <div className={`flex items-center justify-between ${compact ? 'py-2' : 'p-4 bg-[#080b14] border border-gray-800 rounded-lg mb-3'}`}>
        <div>
            <div className={`font-medium text-white ${compact ? 'text-xs' : 'text-sm'}`}>{label}</div>
            {description && <div className="text-xs text-gray-500 mt-1">{description}</div>}
        </div>
        <button
            onClick={() => onChange(!checked)}
            className={`w-9 h-5 flex items-center rounded-full transition-colors shrink-0 ml-4 ${checked ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
            <div className={`w-3 h-3 bg-white rounded-full shadow transform transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
        </button>
    </div>
);

const Notifications = () => {
    const { t } = useTranslation('notifications');
    const { user } = useAuth();
    const [preferences, setPreferences] = useState([]);
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Initial load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [prefsData, watchlistData] = await Promise.all([
                notificationService.getPreferences(),
                coinService.getWatchlist()
            ]);
            setPreferences(prefsData || []);
            // Backend returns array of items directly
            setWatchlist(Array.isArray(watchlistData) ? watchlistData : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // --- Symbol Helper ---
    function toBackendSymbol(symbol) {
        if (!symbol) return 'GLOBAL'; // Default to GLOBAL for null
        let value = symbol.toUpperCase();
        if (value.endsWith('-USD')) return value;
        value = value.replace('/USDT', '');
        value = value.replace('USDT', '');
        value = value.replace('/', '');
        if (value.endsWith('USD') && !value.includes('-')) {
            return `${value.slice(0, -3)}-USD`;
        }
        if (value.includes('-')) return value;
        return `${value}-USD`;
    }

    // ... existing imports ...

    // Helper to get state
    const isEnabled = (type, symbol = null) => {
        const targetSymbol = symbol ? toBackendSymbol(symbol) : 'GLOBAL';
        const pref = preferences.find(p => p.preference_type === type && (p.coin_symbol === targetSymbol || p.coin_symbol === (symbol ? null : 'GLOBAL'))); // Handle both legacy and new
        return pref ? pref.is_enabled : true;
    };

    const handleToggle = (type, symbol = null, newValue) => {
        const targetSymbol = symbol ? toBackendSymbol(symbol) : 'GLOBAL';
        setPreferences(prev => {
            const existingIndex = prev.findIndex(p => p.preference_type === type && (p.coin_symbol === targetSymbol || p.coin_symbol === (symbol ? null : 'GLOBAL')));
            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = { ...updated[existingIndex], is_enabled: newValue, coin_symbol: targetSymbol }; // Ensure symbol is normalized
                return updated;
            } else {
                return [...prev, {
                    user_id: user.id,
                    preference_type: type,
                    coin_symbol: targetSymbol,
                    is_enabled: newValue
                }];
            }
        });
    };

    const savePreferences = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await notificationService.updatePreferences(preferences);
            setMessage({ type: 'success', text: t('page.savedSuccess') });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: t('page.savedError') });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-24">
            <PageHeader
                title={t('page.title')}
                subtitle={t('page.subtitle')}
                icon={BellRing}
            />

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded border ${message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid gap-8 lg:grid-cols-3">
                {/* Left Column: Global Settings */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Settings size={18} className="text-blue-400" />
                        {t('page.globalSettings')}
                    </h3>

                    <div className="bg-[#020305] p-1 border border-gray-800 rounded-xl sticky top-24">
                        <PreferenceToggle
                            label={t('page.dailyBriefing')}
                            description={t('page.dailyBriefingDesc')}
                            checked={isEnabled('daily_briefing', null)}
                            onChange={(val) => handleToggle('daily_briefing', null, val)}
                        />
                        <PreferenceToggle
                            label={t('page.highSeverity')}
                            description={t('page.highSeverityDesc')}
                            checked={isEnabled('high_severity_only', null)}
                            onChange={(val) => handleToggle('high_severity_only', null, val)}
                        />
                    </div>
                </div>

                {/* Right Column: Watchlist Settings */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <BellRing size={18} className="text-purple-400" />
                        {t('page.watchlistAlerts')}
                    </h3>

                    {watchlist.length === 0 ? (
                        <div className="p-8 border border-gray-800 border-dashed rounded-xl bg-[#080b14]/50 text-center text-gray-500">
                            {t('page.emptyWatchlist')}
                        </div>
                    ) : (
                        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                            {watchlist.map((coin) => (
                                <div key={coin.symbol} className="bg-[#080b14] border border-gray-800 rounded-xl p-4 hover:border-blue-500/30 transition-colors flex flex-col justify-between">
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-800/50">
                                        <div className="w-8 h-8 rounded-full bg-blue-900/20 flex items-center justify-center shrink-0 overflow-hidden">
                                            <img
                                                src={coin.logoUrl || getLogoUrl(coin.symbol)}
                                                alt={coin.symbol}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                            />
                                            <span className="text-xs font-bold text-blue-400 hidden">{coin.symbol.slice(0, 1)}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-white text-sm">{coin.symbol}</div>
                                            {coin.name && <div className="text-[10px] text-gray-500 truncate">{coin.name}</div>}
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <PreferenceToggle
                                            label={t('page.anomalies')}
                                            compact={true}
                                            checked={isEnabled('anomaly_pump', coin.symbol)}
                                            onChange={(val) => {
                                                handleToggle('anomaly_pump', coin.symbol, val);
                                                handleToggle('anomaly_crash', coin.symbol, val);
                                            }}
                                        />
                                        <PreferenceToggle
                                            label={t('page.aiInsights')}
                                            compact={true}
                                            checked={isEnabled('ai_signal_buy', coin.symbol)}
                                            onChange={(val) => {
                                                handleToggle('ai_signal_buy', coin.symbol, val);
                                                handleToggle('ai_signal_sell', coin.symbol, val);
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="fixed bottom-8 right-8 z-40">
                <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-full font-bold shadow-xl shadow-blue-900/30 transition-all transform hover:scale-105 active:scale-95 border border-white/10 backdrop-blur-md"
                >
                    {saving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                    {saving ? t('page.saving') : t('page.saveSettings')}
                </button>
            </div>
        </div>
    );
};

export default Notifications;
