import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, Info, Minus } from 'lucide-react';
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

const MarketOverview = () => {
    const { t } = useTranslation('dashboard');
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(true);
    const [typedText, setTypedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const streamRef = useRef(null);

    useEffect(() => {
        const fetchInsight = async () => {
            try {
                const data = await insightService.getDailyInsight();
                setInsight(data);
            } catch (err) {
                console.error("Failed to fetch daily insight:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchInsight();
    }, []);

    const insightText = insight?.insightText || '';

    const getSentimentConfig = (sentiment) => {
        const s = sentiment?.toLowerCase() || '';
        if (s === 'bullish' || s === 'positive') {
            return {
                baseColor: 'green', // for logic if needed
                iconColor: 'text-green-500',
                iconBg: 'bg-green-500/10',
                badgeBorder: 'border-green-500/30',
                badgeText: 'text-green-400',
                badgeBg: 'bg-green-500/5',
                gradient: 'from-green-500/10',
                Icon: TrendingUp
            };
        } else if (s === 'bearish' || s === 'negative') {
            return {
                baseColor: 'red',
                iconColor: 'text-red-500',
                iconBg: 'bg-red-500/10',
                badgeBorder: 'border-red-500/30',
                badgeText: 'text-red-400',
                badgeBg: 'bg-red-500/5',
                gradient: 'from-red-500/10',
                Icon: TrendingDown
            };
        } else {
            // Neutral
            return {
                baseColor: 'gray',
                iconColor: 'text-gray-400',
                iconBg: 'bg-gray-500/10',
                badgeBorder: 'border-gray-500/30',
                badgeText: 'text-gray-400',
                badgeBg: 'bg-gray-500/5',
                gradient: 'from-gray-500/10',
                Icon: Minus
            };
        }
    };

    const config = getSentimentConfig(insight?.sentiment);
    const SentimentIcon = config.Icon;

    useEffect(() => {
        if (!insightText) return;
        setTypedText('');
        setIsTyping(true);
        let index = 0;
        const speed = 12;
        const timer = setInterval(() => {
            index += 1;
            setTypedText(insightText.slice(0, index));
            if (index >= insightText.length) {
                clearInterval(timer);
                setIsTyping(false);
            }
        }, speed);
        return () => clearInterval(timer);
    }, [insightText]);

    useEffect(() => {
        if (!streamRef.current) return;
        streamRef.current.scrollTop = streamRef.current.scrollHeight;
    }, [typedText]);

    if (loading) return (
            <div className="w-full h-24 bg-[#03050a] border border-gray-800 sharp-corners animate-pulse flex items-center justify-center">
            <span className="text-xs text-gray-600 font-mono-custom">{t('marketOverview.loading')}</span>
        </div>
    );

    if (!insight) return (
        <div className="w-full p-4 bg-[#03050a] border border-gray-800 sharp-corners flex items-center gap-3 text-gray-500">
            <Info size={16} />
            <span className="text-xs">{t('marketOverview.empty')}</span>
        </div>
    );

    return (
        <div className="w-full bg-[#03050a] border border-gray-800 sharp-corners p-6 relative overflow-visible group">
            <div className="absolute inset-0 opacity-70 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.12),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(45,212,191,0.12),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(245,158,11,0.10),transparent_40%)]"></div>
            <div className="absolute inset-0 opacity-40 pointer-events-none bg-[linear-gradient(transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] bg-[length:100%_6px]"></div>
            <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${config.gradient} to-transparent blur-3xl rounded-full pointer-events-none -mr-32 -mt-32`}></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 flex items-center justify-center sharp-corners ${config.iconBg} ${config.iconColor}`}>
                            <SentimentIcon size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                <LabelWithTooltip
                                    label={t('marketOverview.title')}
                                    tooltip={t('marketOverview.titleTooltip')}
                                />
                            </h3>
                            <span className="text-[10px] text-gray-500 font-mono-custom">{new Date(insight.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className={`px-3 py-1 text-xs font-bold border sharp-corners ${config.badgeBorder} ${config.badgeText} ${config.badgeBg}`}>
                        <LabelWithTooltip
                            label={insight.sentiment}
                            tooltip={t('marketOverview.sentimentTooltip')}
                        />
                    </div>
                </div>

                <div className="border border-gray-800/70 bg-[#070a16] sharp-corners p-4 shadow-[0_0_30px_rgba(168,85,247,0.08)]">
                    <div
                        ref={streamRef}
                        className="text-gray-200 text-sm leading-relaxed font-mono-custom max-h-40 overflow-y-auto pr-1"
                    >
                        {typedText}
                        {isTyping && <span className="inline-block w-2 h-4 bg-purple-500 ml-1 align-middle animate-pulse" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketOverview;
