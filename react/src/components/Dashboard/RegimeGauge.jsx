import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus, RefreshCcw } from 'lucide-react';
import { insightService } from '../../services/insight.service';
import { useTranslation } from 'react-i18next';

const LabelWithTooltip = ({ label, tooltip }) => (
    <span className="relative group/tooltip inline-flex items-center gap-1 cursor-help">
        <span className="border-b border-dotted border-gray-600 group-hover/tooltip:text-gray-300 group-hover/tooltip:border-gray-400 transition-colors">
            {label}
        </span>
        <span className="absolute bottom-full left-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-52 max-w-[70vw] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[999]">
            <span className="bg-[#080b14] border border-gray-700 p-2 sharp-corners shadow-xl text-[10px] text-gray-300 leading-tight text-center block whitespace-normal">
                {tooltip}
            </span>
        </span>
    </span>
);

const RegimeGauge = () => {
    const { t } = useTranslation('dashboard');
    const [regime, setRegime] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRegime = async () => {
            try {
                const data = await insightService.getMarketRegime();
                setRegime(data);
            } catch (err) {
                console.error("Failed to fetch market regime:", err);
                setError(t('regimeGauge.failedLoad'));
            } finally {
                setLoading(false);
            }
        };

        fetchRegime();
    }, []);

    const getRegimeInfo = (label) => {
        // Normalize label safely
        const safeLabel = (label || 'NEUTRAL').toUpperCase();
        if (safeLabel.includes('BULL') || safeLabel.includes('POSITIVE')) return { color: 'text-green-500', bg: 'bg-green-500', icon: <TrendingUp size={20} /> };
        if (safeLabel.includes('BEAR') || safeLabel.includes('NEGATIVE')) return { color: 'text-red-500', bg: 'bg-red-500', icon: <TrendingDown size={20} /> };
        return { color: 'text-gray-400', bg: 'bg-gray-400', icon: <Minus size={20} /> };
    };

    if (loading) return (
        <div className="bg-[#03050a] border border-gray-800 p-5 sharp-corners h-full flex flex-col items-center justify-center animate-pulse">
            <BarChart3 className="text-gray-700 mb-2" size={32} />
            <span className="text-xs text-gray-500 font-mono-custom">{t('regimeGauge.loading')}</span>
        </div>
    );

    if (error || !regime) return (
        <div className="bg-[#03050a] border border-gray-800 p-5 sharp-corners h-full flex flex-col items-center justify-center">
            <div className="text-red-500 mb-2"><RefreshCcw size={24} /></div>
            <span className="text-xs text-gray-500">{t('regimeGauge.unavailable')}</span>
        </div>
    );

    const info = getRegimeInfo(regime.regimeLabel);

    // Calculate a "score" for the gauge based on volatility or randomness if score isn't in API
    // The API returns avgVolatility and avgReturn. Let's synthesize a 0-100 score or use a default.
    // Assuming the backend might later provide a 'score', but for now let's map volatility to a visual.
    // Or just use a static visual for the 'Type'.
    // Let's assume a random score or derived for visual flair if not provided.
    const gaugeScore = 75; // Placeholder or calculate from regime.avgReturn

    return (
        <div className="bg-[#03050a] border border-gray-800 p-5 sharp-corners h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-mono-custom uppercase tracking-wider">
                    <BarChart3 size={14} />
                    <LabelWithTooltip
                        label={t('regimeGauge.title')}
                        tooltip={t('regimeGauge.titleTooltip')}
                    />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 border ${info.color.replace('text', 'border')} ${info.color.replace('text', 'bg')}/10 sharp-corners`}>
                    {regime.regimeLabel || 'UNKNOWN'}
                </span>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center relative py-4">
                {/* Gauge Visual */}
                <div className="relative w-40 h-20 overflow-hidden mb-2">
                    <div className="absolute top-0 left-0 w-full h-full bg-gray-800 rounded-t-full"></div>
                    <div
                        className={`absolute top-0 left-0 w-full h-full ${info.bg} rounded-t-full opacity-20`}
                        style={{ transformOrigin: 'bottom center', transform: `rotate(${(gaugeScore / 100) * 180 - 180}deg)` }}
                    ></div>
                    <div
                        className={`absolute top-0 left-0 w-full h-full ${info.bg} rounded-t-full origin-bottom transition-transform duration-1000 ease-out`}
                        style={{ transform: `rotate(${(gaugeScore / 100) * 180 - 180}deg)`, clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                    ></div>
                    {/* Inner Mask */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-[#03050a] rounded-t-full"></div>
                </div>

                <div className="text-3xl font-bold text-white mb-1">
                    {(regime.avgReturn * 100).toFixed(2)}%
                </div>
                <div className="text-xs text-gray-500 font-mono-custom uppercase">
                        <LabelWithTooltip
                            label={t('regimeGauge.avgReturn')}
                            tooltip={t('regimeGauge.avgReturnTooltip')}
                        />
                    </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-800/50">
                <div className="flex justify-between text-xs text-gray-400">
                    <span>
                        <LabelWithTooltip
                            label={t('regimeGauge.volatility')}
                            tooltip={t('regimeGauge.volatilityTooltip')}
                        />:{' '}
                        <span className="text-white">{regime.avgVolatility?.toFixed(4)}</span>
                    </span>
                    <span>
                        <LabelWithTooltip
                            label={t('regimeGauge.updated')}
                            tooltip={t('regimeGauge.updatedTooltip')}
                        />:{' '}
                        <span className="font-mono-custom">{new Date(regime.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default RegimeGauge;
