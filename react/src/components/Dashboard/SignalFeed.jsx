import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Target, Shield, Clock, LogIn } from 'lucide-react';
import { recommendationService } from '../../services/recommendation.service';
import { useTranslation } from 'react-i18next';

const LabelWithTooltip = ({ label, tooltip }) => (
    <span className="relative group/tooltip inline-flex items-center gap-1 cursor-help">
        <span className="border-b border-dotted border-gray-600 group-hover/tooltip:text-gray-300 group-hover/tooltip:border-gray-400 transition-colors">
            {label}
        </span>
        <span className="absolute bottom-full left-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-52 max-w-[70vw] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[400]">
            <span className="bg-[#080b14] border border-gray-700 p-2 sharp-corners shadow-xl text-[10px] text-gray-300 leading-tight text-center block whitespace-normal">
                {tooltip}
            </span>
        </span>
    </span>
);

const timeAgo = (date, t) => {
    if (!date) return '--';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return t('time.yearsAgo', { value: Math.floor(interval) });
    interval = seconds / 2592000;
    if (interval > 1) return t('time.monthsAgo', { value: Math.floor(interval) });
    interval = seconds / 86400;
    if (interval > 1) return t('time.daysAgo', { value: Math.floor(interval) });
    interval = seconds / 3600;
    if (interval > 1) return t('time.hoursAgo', { value: Math.floor(interval) });
    interval = seconds / 60;
    if (interval > 1) return t('time.minutesAgo', { value: Math.floor(interval) });
    return t('time.secondsAgo', { value: Math.floor(seconds) });
};

const SignalFeed = () => {
    const { t } = useTranslation('signals');
    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const formatPrice = (value) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
        return Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    useEffect(() => {
        const fetchSignals = async () => {
            try {
                // Fetch signals from last 24h or default
                const data = await recommendationService.getSignals();
                setSignals(data);
            } catch (err) {
                console.error("Failed to fetch signals:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchSignals();
    }, []);

    if (loading) return (
        <div className="bg-[#03050a] border border-gray-800 p-5 sharp-corners h-full flex flex-col pt-12 text-center">
            <span className="text-xs text-gray-500 font-mono-custom animate-pulse">{t('feed.loading')}</span>
        </div>
    );

    const topSignals = signals.slice(0, 3);

    return (
        <div className="bg-[#03050a] border border-gray-800 p-5 sharp-corners h-full min-h-[340px] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-mono-custom uppercase tracking-wider">
                    <Layers size={14} />
                    <LabelWithTooltip
                        label={t('feed.title')}
                        tooltip={t('feed.titleTooltip')}
                    />
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="text-[10px] text-green-500 font-mono-custom">{t('feed.active')}</span>
                </div>
            </div>

            <div className="flex-1 space-y-3 pr-1">
                {topSignals.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-xs">{t('feed.empty')}</div>
                ) : (
                    topSignals.map(signal => (
                        <div key={signal.id} className="bg-[#080b14] border border-gray-800/50 p-3 sharp-corners hover:border-gray-700 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    {signal.logo ? (
                                        <img src={signal.logo} alt={signal.symbol} className="w-5 h-5 rounded-full" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-blue-900/20 flex items-center justify-center text-[9px] font-bold text-blue-300">
                                            {signal.symbol?.substring(0, 1)}
                                        </div>
                                    )}
                                    <span className="font-bold text-white text-sm">{signal.symbol}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 sharp-corners font-bold ${signal.type === 'LONG' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {signal.type === 'LONG' ? t('bullish') : t('bearish')}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-500 font-mono-custom flex items-center gap-1">
                                    <Clock size={10} />
                                    {timeAgo(signal.time, t)}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 mb-2">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                                        <LogIn size={10} />
                                        <LabelWithTooltip label={t('feed.ref')} tooltip={t('feed.refTooltip')} />
                                    </span>
                                    <span className="text-xs text-white font-mono-custom">${formatPrice(signal.entry)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
                                        <Target size={10} />
                                        <LabelWithTooltip label={t('feed.proj')} tooltip={t('feed.projTooltip')} />
                                    </span>
                                    <span className="text-xs text-blue-400 font-mono-custom">${formatPrice(signal.target)}</span>
                                </div>
                                <div className="flex flex-col text-right">
                                    <span className="text-[10px] text-gray-500 uppercase flex items-center justify-end gap-1">
                                        <Shield size={10} />
                                        <LabelWithTooltip label={t('feed.inv')} tooltip={t('feed.invTooltip')} />
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono-custom">${formatPrice(signal.stop)}</span>
                                </div>
                            </div>

                            {signal.confidence !== null && signal.confidence !== undefined && (
                                <div className="w-full bg-gray-800 h-1 rounded-full overflow-hidden mt-2">
                                    <div
                                        className={`h-full ${signal.confidence > 80 ? 'bg-green-500' : signal.confidence > 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${signal.confidence}%` }}
                                    ></div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <button
                onClick={() => navigate('/hub/market-analysis')}
                className="mt-4 w-full py-2 border border-blue-500/30 text-blue-400 text-xs font-mono-custom uppercase hover:bg-blue-500/10 transition-colors sharp-corners"
            >
                {t('feed.viewAll')}
            </button>
        </div>
    );
};

export default SignalFeed;
