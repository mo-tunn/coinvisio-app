import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Target,
    TrendingUp,
    TrendingDown,
    Clock,
    Calendar,
    ChevronDown,
    Shield,
    Zap,
    Flame,
    BarChart2,
    Info,
    ArrowRight,
    MessageCircle,
    HelpCircle,
    Lock
} from 'lucide-react';
import { recommendationService } from '../../services/recommendation.service';
import { FadeInSection } from '../../components';
import { useAuth } from '../../context';
import { useTranslation } from 'react-i18next';

const Recommendations = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, i18n } = useTranslation('recommendations');
    const isPremium = user?.user_metadata?.subscription_tier === 'Premium';

    // Get user's assigned profile (default to Moderate if not set)
    const assignedProfile = user?.user_metadata?.risk_profile || 'Moderate';

    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(false);

    // UI States
    // If NOT premium, force the risk profile to be their assigned one
    const [riskProfile, setRiskProfile] = useState(assignedProfile);
    const [selectedTime, setSelectedTime] = useState('Latest');
    const riskProfiles = ['Conservative', 'Moderate', 'Aggressive'];

    const getRiskLabel = (profile) => {
        if (profile === 'Conservative') return t('risk.conservative');
        if (profile === 'Aggressive') return t('risk.aggressive');
        return t('risk.moderate');
    };

    // Tooltip Helper
    const TextWithTooltip = ({ text, tooltip }) => (
        <div className="flex items-center gap-1 group/tooltip relative w-fit cursor-help">
            <span className="border-b border-dotted border-gray-600 group-hover/tooltip:text-gray-300 group-hover/tooltip:border-gray-400 transition-colors">
                {text}
            </span>
            <div className="absolute bottom-full left-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-52 max-w-[70vw] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[400]">
                <div className="bg-[#080b14] border border-gray-700 p-2 sharp-corners shadow-xl text-[10px] text-gray-300 leading-tight text-center whitespace-normal">
                    {tooltip}
                </div>
            </div>
        </div>
    );

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let atDate = null;
                if (selectedTime === '1d') {
                    atDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
                } else if (selectedTime === '7d') {
                    atDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                }

                // Fetch based on selected Risk Profile
                // Note: The backend handles the filtering.
                // We pass 'since' as null. If 'atDate' is set, it fetches the recommendation snapshot at that time.
                const data = await recommendationService.getRecommendations(riskProfile, null, false, atDate);

                // API returns an array of recommendation batches (e.g. [{ riskProfile: 'Moderate', coins: [...] }])
                // We expect the first item to be the relevant batch due to filtering/sorting
                if (Array.isArray(data) && data.length > 0 && data[0].coins) {
                    setRecommendations(data[0].coins);
                } else {
                    setRecommendations([]);
                }
            } catch (err) {
                console.error("Failed to fetch recommendations", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [riskProfile, selectedTime]);

    // Force profile reset if user changes but component remains (unlikely but good safety) or if they log out/in
    useEffect(() => {
        if (!isPremium) {
            setRiskProfile(assignedProfile);
        }
    }, [isPremium, assignedProfile]);

    // Helper to get styling based on risk
    const getRiskStyles = (profile) => {
        switch (profile) {
            case 'Conservative': return { color: 'text-green-400', border: 'border-green-500', bg: 'bg-green-500', gradient: 'from-green-500/20 to-green-900/5', icon: Shield };
            case 'Moderate': return { color: 'text-blue-400', border: 'border-blue-500', bg: 'bg-blue-500', gradient: 'from-blue-500/20 to-blue-900/5', icon: Zap };
            case 'Aggressive': return { color: 'text-red-400', border: 'border-red-500', bg: 'bg-red-500', gradient: 'from-red-500/20 to-red-900/5', icon: Flame };
            default: return { color: 'text-gray-400', border: 'border-gray-500', bg: 'bg-gray-500', gradient: 'from-gray-500/20 to-gray-900/5', icon: Shield };
        }
    };

    const currentStyles = getRiskStyles(riskProfile);
    const topPick = recommendations.length > 0 ? recommendations[0] : null;
    const otherPicks = recommendations.length > 0 ? recommendations.slice(1) : [];

    return (
        <div className="pb-20 pt-4 sm:pt-6 px-4 md:px-8 max-w-[1600px] mx-auto h-full">
            <FadeInSection>

                {/* Header & Risk Slider */}
                <div className="flex flex-col lg:flex-row justify-between items-end mb-12 gap-8 border-b border-gray-800 pb-8">
                    <div className="w-full lg:w-1/3">
                        <div className="flex items-center gap-2 mb-2 text-blue-500">
                            <Target size={16} />
                            <span className="text-xs font-mono-custom uppercase tracking-wider">{t('page.badge')}</span>
                        </div>
                        <h1 className="text-4xl font-light text-white tracking-widest uppercase">
                            {t('page.titlePrimary')} <span className={`font-medium ${currentStyles.color}`}>{t('page.titleHighlight')}</span>
                        </h1>
                        <p className="mt-2 text-[10px] text-gray-500 max-w-sm border-l-2 border-yellow-500/30 pl-2">
                            {t('page.disclaimer')}
                        </p>
                    </div>

                    {/* Interactive Risk Slider */}
                    <div className="w-full lg:w-1/2 flex flex-col items-center">
                        {/* ... Slider code ... */}
                        <div className="w-full bg-[#03050a] border border-gray-800 p-1 sharp-corners flex relative">
                            {/* Animated Background Indicator */}
                            <div
                                className={`absolute inset-y-1 w-1/3 transition-all duration-300 ease-out border border-white/10 ${currentStyles.bg}/10 sharp-corners`}
                                style={{
                                    left: riskProfile === 'Conservative' ? '0.25rem' : riskProfile === 'Moderate' ? '33.33%' : 'calc(66.66% - 0.25rem)',
                                    width: 'calc(33.33% - 0.35rem)'
                                }}
                            ></div>

                            {riskProfiles.map((profile) => {
                                const isLocked = !isPremium && profile !== assignedProfile;
                                return (
                                    <button
                                        key={profile}
                                        onClick={() => !isLocked && setRiskProfile(profile)}
                                        disabled={isLocked}
                                        className={`flex-1 relative z-10 py-3 text-xs font-bold uppercase tracking-wider transition-colors sharp-corners flex items-center justify-center gap-2 
                                            ${riskProfile === profile ? 'text-white' : isLocked ? 'text-gray-700 cursor-not-allowed' : 'text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {profile === 'Conservative' && <Shield size={14} />}
                                        {profile === 'Moderate' && <Zap size={14} />}
                                        {profile === 'Aggressive' && <Flame size={14} />}
                                        {getRiskLabel(profile)}
                                        {isLocked && <Lock size={12} className="ml-1 text-gray-700" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500 font-mono-custom flex justify-between w-full px-1">
                            {!isPremium ? (
                                <span className="w-full text-center text-gray-400 flex items-center justify-center gap-1">
                                    <Lock size={10} /> {t('risk.locked')}
                                </span>
                            ) : (
                                <>
                                    <span>{t('risk.stabilityFocus')}</span>
                                    <span>{t('risk.balancedGrowth')}</span>
                                    <span>{t('risk.highVolatility')}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div className="w-full lg:w-auto flex justify-end">
                        <div className="flex items-center gap-2 bg-[#03050a] border border-gray-800 px-3 py-2 sharp-corners">
                            <Clock size={14} className="text-gray-500" />
                            <select
                                value={selectedTime}
                                onChange={(e) => setSelectedTime(e.target.value)}
                                className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer uppercase"
                            >
                                <option value="Latest" className="bg-[#03050a] text-white">{t('time.latestNow')}</option>
                                <option value="1d" className="bg-[#03050a] text-white">{t('time.oneDayAgo')}</option>
                                <option value="7d" className="bg-[#03050a] text-white">{t('time.sevenDaysAgo')}</option>
                            </select>
                            <ChevronDown size={12} className="text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* Content Area */}
                {loading ? (
                    <div className="h-[400px] flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : recommendations.length === 0 ? (
                    <div className="p-12 text-center border border-gray-800 sharp-corners bg-[#03050a]">
                        <Info size={48} className="mx-auto text-gray-800 mb-4" />
                        <h3 className="text-white font-bold mb-2">{t('empty.title')}</h3>
                        <p className="text-gray-500 text-sm">{t('empty.subtitle')}</p>
                    </div>
                ) : (
                    <div className="space-y-8">

                        {/* HERO: Top Pick */}
                        {topPick && (
                            <div className="relative group">
                                <div className={`absolute -inset-0.5 bg-gradient-to-r ${currentStyles.gradient} opacity-20 blur group-hover:opacity-40 transition duration-500`}></div>
                                <div className="relative bg-[#050810] border border-gray-800 p-8 sharp-corners grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

                                    {/* Left: Info */}
                                    <div className="lg:col-span-4 flex flex-col gap-4">
                                        <div className={`text-xs font-bold uppercase tracking-widest ${currentStyles.color} flex items-center gap-2`}>
                                            <currentStyles.icon size={14} />
                                            {t('top.rank', { profile: getRiskLabel(riskProfile) })}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {topPick.logo ? (
                                                <img src={topPick.logo} alt={topPick.symbol} className="w-16 h-16 rounded-full object-cover shadow-lg" />
                                            ) : (
                                                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${currentStyles.bg}/20 ${currentStyles.color} border ${currentStyles.border}/30`}>
                                                    {topPick.symbol?.substring(0, 1)}
                                                </div>
                                            )}
                                            <div>
                                                <h2 className="text-5xl font-light text-white tracking-wide">{topPick.symbol}</h2>
                                                <div className="text-2xl font-bold text-gray-400 mt-1">${Number(topPick.price).toFixed(4)}</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 p-4 bg-[#080b14] border border-gray-800 sharp-corners">
                                            <div className="flex items-start gap-3">
                                                <Activity size={16} className={currentStyles.color} />
                                                <p className="text-xs text-gray-300 leading-relaxed font-mono-custom">
                                                    {t('top.analysis', {
                                                        profile: getRiskLabel(riskProfile).toLowerCase(),
                                                        rsi: topPick.rsi.toFixed(1),
                                                        sentiment: topPick.rsi < 30
                                                            ? t('top.sentiment.oversold')
                                                            : topPick.rsi > 70
                                                                ? t('top.sentiment.overbought')
                                                                : t('top.sentiment.neutral')
                                                    })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Middle: Metrics */}
                                    <div className="lg:col-span-4 flex justify-around items-center border-x border-gray-800/50 px-8">
                                        <div className="text-center">
                                            <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">
                                                <TextWithTooltip text={t('metrics.volatility')} tooltip={t('metrics.volatilityTooltip')} />
                                            </div>
                                            <div className="text-xl font-bold text-white">{topPick.volatility?.toFixed(5)}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">
                                                <TextWithTooltip text={t('metrics.volume24h')} tooltip={t('metrics.volume24hTooltip')} />
                                            </div>
                                            <div className={`text-xl font-bold ${topPick.volume_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {topPick.volume_change > 0 ? '+' : ''}{topPick.volume_change?.toFixed(2)}%
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-gray-500 text-[10px] uppercase font-bold mb-1">
                                                <TextWithTooltip text={t('metrics.rsiScore')} tooltip={t('metrics.rsiScoreTooltip')} />
                                            </div>
                                            <div className="text-xl font-bold text-blue-400">{topPick.rsi?.toFixed(1)}</div>
                                        </div>
                                    </div>

                                    {/* Right: Action */}
                                    <div className="lg:col-span-4 flex flex-col items-end justify-center gap-4">
                                        <div className="flex gap-2 w-full">
                                            <button
                                                className="flex-1 py-3 text-xs font-bold uppercase tracking-wider sharp-corners bg-purple-900/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                onClick={() => {
                                                    const prompt = i18n.language === 'tr'
                                                        ? `${topPick.symbol} için Volatility: ${topPick.volatility?.toFixed(5)}, Volume (24h) Değişimi: ${topPick.volume_change?.toFixed(2)}%, RSI Skoru: ${topPick.rsi?.toFixed(1)} ve güncel fiyatı $${Number(topPick.price).toFixed(4)}. Bu veriler doğrultusunda ${topPick.symbol} hakkında ne düşünüyorsun?`
                                                        : `For ${topPick.symbol}, Volatility is: ${topPick.volatility?.toFixed(5)}, Volume (24h) change is: ${topPick.volume_change?.toFixed(2)}%, RSI Score is: ${topPick.rsi?.toFixed(1)} and the current price is $${Number(topPick.price).toFixed(4)}. Based on this data, what do you think about ${topPick.symbol}?`;

                                                    const event = new CustomEvent('open-iris-chat', { detail: { prompt } });
                                                    window.dispatchEvent(event);
                                                }}
                                            >
                                                <MessageCircle size={16} /> {t('actions.askIris')}
                                            </button>
                                            <button
                                                className="flex-1 py-3 text-xs font-bold uppercase tracking-wider sharp-corners bg-blue-900/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                                onClick={() => navigate(`/hub/market-analysis?search=${topPick.symbol}`)}
                                            >
                                                <Activity size={16} /> {t('actions.signals')}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/hub/coins/${topPick.symbol}`)}
                                            className="flex-1 py-3 text-xs font-bold uppercase tracking-wider sharp-corners bg-gray-800 border border-gray-700 text-gray-300 hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 w-full"
                                        >
                                            {t('actions.analysis')} <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* GRID: Other Picks */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {otherPicks.map((rec, idx) => {
                                return (
                                    <div
                                        key={idx}
                                        onClick={() => navigate(`/hub/coins/${rec.symbol}`)}
                                        className={`group bg-[#03050a] border border-gray-800 p-5 sharp-corners hover:border-${currentStyles.color.split('-')[1]}-500/50 hover:bg-[#050810] transition-all duration-300 cursor-pointer relative overflow-visible flex flex-col h-full`}
                                    >
                                        <div className={`absolute -inset-0.5 bg-gradient-to-br ${currentStyles.gradient} opacity-0 group-hover:opacity-100 transition duration-500`}></div>

                                        {/* Rank Badge */}
                                        <div className={`absolute top-3 right-3 z-20 px-2 py-1 sharp-corners text-[9px] font-bold ${currentStyles.bg}/20 ${currentStyles.color} border ${currentStyles.border}/30`}>
                                            #{idx + 2}
                                        </div>

                                        <div className="relative z-10 flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                {rec.logo ? (
                                                    <img src={rec.logo} alt={rec.symbol} className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-900 group-hover:ring-gray-700 transition-all" />
                                                ) : (
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-gray-900 text-gray-400 group-hover:${currentStyles.bg}/20 group-hover:${currentStyles.color} transition-colors border border-gray-800`}>
                                                        {rec.symbol.substring(0, 1)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-sm font-bold text-white group-hover:text-gray-200 transition-colors">{rec.symbol}</div>
                                                    <div className="text-[10px] text-gray-500 font-mono-custom group-hover:text-gray-400">${Number(rec.price).toFixed(4)}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative z-10 grid grid-cols-2 gap-2 mb-4">
                                            <div className="bg-[#080b14] p-2 sharp-corners border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                                                <div className="text-[9px] text-gray-500 uppercase">
                                                    <TextWithTooltip text={t('card.volChange')} tooltip={t('card.volChangeTooltip')} />
                                                </div>
                                                <div className={`text-xs font-bold ${rec.volume_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {rec.volume_change > 0 ? '+' : ''}{rec.volume_change?.toFixed(1)}%
                                                </div>
                                            </div>
                                            <div className="bg-[#080b14] p-2 sharp-corners border border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                                                <div className="text-[9px] text-gray-500 uppercase">
                                                    <TextWithTooltip text={t('card.rsi')} tooltip={t('card.rsiTooltip')} />
                                                </div>
                                                <div className={`text-xs font-bold ${currentStyles.color}`}>
                                                    {rec.rsi?.toFixed(1)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex items-center gap-2 mt-auto pt-2 border-t border-gray-800/50 group-hover:border-gray-700/50 transition-colors">
                                            {/* Ask Iris */}
                                            <button
                                                title={t('actions.askIris')}
                                                className="p-2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500 hover:text-white transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const prompt = i18n.language === 'tr'
                                                        ? `${rec.symbol} için Volatility: ${rec.volatility?.toFixed(5)}, Volume (24h) Değişimi: ${rec.volume_change?.toFixed(2)}%, RSI Skoru: ${rec.rsi?.toFixed(1)} ve güncel fiyatı $${Number(rec.price).toFixed(4)}. Bu veriler doğrultusunda ${rec.symbol} hakkında ne düşünüyorsun?`
                                                        : `For ${rec.symbol}, Volatility is: ${rec.volatility?.toFixed(5)}, Volume (24h) change is: ${rec.volume_change?.toFixed(2)}%, RSI Score is: ${rec.rsi?.toFixed(1)} and the current price is $${Number(rec.price).toFixed(4)}. Based on this data, what do you think about ${rec.symbol}?`;

                                                    const event = new CustomEvent('open-iris-chat', { detail: { prompt } });
                                                    window.dispatchEvent(event);
                                                }}
                                            >
                                                <MessageCircle size={14} />
                                            </button>

                                            {/* Go to Signals */}
                                            <button
                                                title={t('card.viewSignals')}
                                                className="p-2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/hub/market-analysis?search=${rec.symbol}`); }}
                                            >
                                                <Activity size={14} />
                                            </button>

                                            {/* Go to Coins */}
                                            <button
                                                title={t('card.viewChart')}
                                                className={`flex-1 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-gray-300 hover:bg-white hover:text-black transition-colors text-[10px] font-bold uppercase flex items-center justify-center gap-2 group-hover:border-${currentStyles.color.split('-')[1]}-500/30`}
                                                onClick={(e) => { e.stopPropagation(); navigate(`/hub/coins/${rec.symbol}`); }}
                                            >
                                                <span>{t('actions.analysis')}</span>
                                                <ArrowRight size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </FadeInSection >
        </div >
    );
};

export default Recommendations;
