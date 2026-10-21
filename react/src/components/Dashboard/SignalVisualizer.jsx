import React from 'react';
import { Target, Shield, Crosshair, TrendingUp, TrendingDown, Activity, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SignalVisualizer = ({ signal }) => {
    const { t, i18n } = useTranslation('signals');
    if (!signal) return null;

    const { type, entry, target, stop, confidence } = signal;
    const isLong = type === 'LONG';
    const setupColor = isLong ? 'text-green-400' : 'text-red-400';
    const setupBg = isLong ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30';

    // Potential Section Logic
    const PotentialIcon = isLong ? TrendingUp : TrendingDown;
    const potentialColor = isLong ? 'text-green-400' : 'text-red-400';
    const potentialLabel = isLong ? t('visualizer.upsideProjection') : t('visualizer.downsideProjection');

    // Format helpers
    const formatPrice = (p) => Number(p).toLocaleString(undefined, { maximumFractionDigits: 5 });
    const formatConfidence = (c) => (c * 100).toFixed(1);

    // Format Date for footer
    const localeTag = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
    const signalDate = signal.time ? new Date(signal.time).toLocaleString(localeTag) : new Date().toLocaleString(localeTag);

    return (
        <div className="flex flex-col h-full bg-[#03050a] border border-gray-800 p-4 sm:p-8 sharp-corners relative overflow-hidden">

            {/* Background Gradient Effect */}
            <div className={`absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[100px] opacity-10 pointer-events-none ${isLong ? 'bg-green-500' : 'bg-red-500'}`}></div>

            {/* Header Section */}
            <div className="flex justify-between items-start mb-12 relative z-10">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 text-xs font-bold sharp-corners flex items-center gap-2 ${setupBg} ${setupColor}`}>
                            {isLong ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isLong ? t('visualizer.bullishForecast') : t('visualizer.bearishForecast')}
                        </span>
                        <span className="text-gray-500 text-xs font-mono-custom tracking-wider">{signal.term.toUpperCase()} {t('visualizer.term')}</span>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 items-end">
                    {/* Projected Range Badge */}
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                            <PotentialIcon size={16} className={potentialColor} />
                            <span className={`text-xs font-bold uppercase tracking-widest ${potentialColor}`}>{potentialLabel}</span>
                        </div>
                        <div className={`text-4xl font-light mt-1 ${potentialColor}`}>
                            {Math.abs((target - entry) / entry * 100).toFixed(2)}<span className="text-lg text-gray-600">%</span>
                        </div>
                    </div>

                    {/* Confidence Score Badge */}
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-blue-500" />
                            <span className="text-xs text-blue-400 font-bold uppercase tracking-widest">{t('filters.aiConfidence')}</span>
                        </div>
                        <div className="text-4xl font-light text-white mt-1">
                            {formatConfidence(confidence)}<span className="text-lg text-gray-600">%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Visual Trading Plan (Card Style) */}
            <div className="flex-1 flex flex-col justify-center gap-6 relative z-10 max-w-2xl mx-auto w-full">

                {/* 1. TARGET CARD (Profit/Projection) */}
                <div className="flex items-center gap-3 sm:gap-6 group">
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <div className={`w-12 h-12 rounded-full bg-[#080b14] border flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.1)] group-hover:scale-110 transition-transform ${isLong ? 'border-green-500/30 text-green-500' : 'border-red-500/30 text-red-500'}`}>
                            <Target size={20} />
                        </div>
                    </div>
                    <div className={`flex-1 p-3 sm:p-5 bg-[#080b14]/50 border border-gray-800 hover:${isLong ? 'border-green-500/50' : 'border-red-500/50'} transition-colors sharp-corners flex flex-col sm:flex-row justify-center sm:justify-between items-start sm:items-center backdrop-blur-sm gap-2 sm:gap-0`}>
                        <div>
                            <div className="text-xs text-gray-500 font-mono-custom mb-1 uppercase tracking-wider">{t('visualizer.projectedLevel')}</div>
                            <div className={`text-2xl font-bold ${isLong ? 'text-green-400' : 'text-red-400'}`}>${formatPrice(target)}</div>
                        </div>
                        <div className="text-right">
                            <div className={`px-2 py-1 border text-[10px] sharp-corners ${isLong ? 'bg-green-900/20 border-green-500/20 text-green-500' : 'bg-red-900/20 border-red-500/20 text-red-500'}`}>{t('visualizer.projectionLimit')}</div>
                        </div>
                    </div>
                </div>

                {/* Connector Line */}
                <div className="h-8 w-0.5 bg-gray-800 mx-[29px]"></div>

                {/* 2. ENTRY CARD */}
                <div className="flex items-center gap-3 sm:gap-6 group">
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] z-20">
                            <Crosshair size={20} />
                        </div>
                    </div>
                    <div className="flex-1 p-3 sm:p-5 bg-blue-900/10 border border-blue-500/50 sharp-corners flex flex-col sm:flex-row justify-center sm:justify-between items-start sm:items-center relative overflow-hidden gap-2 sm:gap-0">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                        <div>
                            <div className="text-xs text-blue-300 font-mono-custom mb-1 uppercase tracking-wider">{t('visualizer.referencePrice')}</div>
                            <div className="text-2xl font-bold text-white shadow-black drop-shadow-lg">${formatPrice(entry)}</div>
                        </div>
                        <div className="text-right">
                            <div className="px-2 py-1 bg-blue-500 text-white text-[10px] sharp-corners font-bold">{t('visualizer.referenceZone')}</div>
                        </div>
                    </div>
                </div>

                {/* Connector Line */}
                <div className="h-8 w-0.5 bg-gray-800 mx-[29px]"></div>

                {/* 3. STOP LOSS CARD */}
                <div className="flex items-center gap-3 sm:gap-6 group">
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                        <div className="w-12 h-12 rounded-full bg-[#080b14] border border-gray-600/30 flex items-center justify-center text-gray-500 shadow-[0_0_15px_rgba(239,68,68,0.1)] group-hover:scale-110 transition-transform">
                            <Shield size={20} />
                        </div>
                    </div>
                    <div className="flex-1 p-3 sm:p-5 bg-[#080b14]/50 border border-gray-800 hover:border-gray-600/50 transition-colors sharp-corners flex flex-col sm:flex-row justify-center sm:justify-between items-start sm:items-center backdrop-blur-sm gap-2 sm:gap-0">
                        <div>
                            <div className="text-xs text-gray-500 font-mono-custom mb-1 uppercase tracking-wider">{t('visualizer.invalidationLevel')}</div>
                            <div className="text-2xl font-bold text-gray-400">${formatPrice(stop)}</div>
                        </div>
                        <div className="text-right">
                            <div className="px-2 py-1 bg-gray-900/20 border border-gray-500/20 text-gray-500 text-[10px] sharp-corners">{t('visualizer.trendInvalidation')}</div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="mt-12 pt-6 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500 font-mono-custom">
                <div>{t('visualizer.signalId')}: #{signal.id}9928X</div>
                <div className="flex items-center gap-2">
                    <span>{t('visualizer.signalTime')}: {signalDate}</span>
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
            </div>
        </div>
    );
};

export default SignalVisualizer;
