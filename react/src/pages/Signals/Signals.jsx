import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Zap,
    Search,
    TrendingUp,
    TrendingDown,
    Activity,
    Filter,
    Clock,
    DollarSign,
    Sliders,
    History,
    ArrowLeft,
    Info,
    X,
    HelpCircle,
    Lock
} from 'lucide-react';
import { recommendationService } from '../../services/recommendation.service';
import { FadeInSection, PageHeader } from '../../components';
import { useAuth } from '../../context';
import SignalVisualizer from '../../components/Dashboard/SignalVisualizer';
import SignalHistoryChart from '../../components/Dashboard/SignalHistoryChart';
import { useTranslation } from 'react-i18next';

const Signals = () => {
    const { user } = useAuth();
    const { t, i18n } = useTranslation('signals');
    const isPremium = user?.user_metadata?.subscription_tier === 'Premium';

    const [signals, setSignals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSignal, setSelectedSignal] = useState(null);
    const [showHistory, setShowHistory] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [historyDateFilter, setHistoryDateFilter] = useState('ALL');
    const [showInfoModal, setShowInfoModal] = useState(false);

    // Tooltip Helper
    const LabelWithTooltip = ({ label, tooltip }) => (
        <div className="flex items-center gap-1.5 mb-2 group relative w-fit cursor-help">
            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider border-b border-dotted border-gray-700 group-hover:text-gray-300 group-hover:border-gray-500 transition-colors">
                {label}
            </label>
            <HelpCircle size={10} className="text-gray-600 group-hover:text-blue-400 transition-colors" />

            <div className="absolute bottom-full left-0 mb-2 w-56 max-w-[70vw] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[400]">
                <div className="bg-[#080b14] border border-gray-700 p-2 sharp-corners shadow-xl text-[10px] text-gray-300 leading-normal whitespace-normal">
                    {tooltip}
                </div>
            </div>
        </div>
    );

    // Filters
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const initialSearch = queryParams.get('search') || '';

    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, LONG, SHORT, MID
    const [termFilter, setTermFilter] = useState('ALL'); // ALL, Short, Mid, Long
    const [dateFilter, setDateFilter] = useState('ALL'); // ALL, 24H, 7D, 30D
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Sliders
    const [maxEntryPrice, setMaxEntryPrice] = useState(200000);
    const [minConfidence, setMinConfidence] = useState(0);
    const [minPotential, setMinPotential] = useState(0);
    const localeTag = i18n.language === 'tr' ? 'tr-TR' : 'en-US';

    const calculateSinceDate = (filter) => {
        if (filter === 'ALL') return null;
        const now = new Date();
        const date = new Date(now);

        switch (filter) {
            case '24H':
                date.setHours(date.getHours() - 24);
                break;
            case '7D':
                date.setDate(date.getDate() - 7);
                break;
            case '30D':
                date.setDate(date.getDate() - 30);
                break;
            default:
                return null;
        }
        return date;
    };

    // Reset pagination when filters change
    useEffect(() => {
        setPage(1);
        setSignals([]);
        setHasMore(true);
    }, [searchTerm, dateFilter]);

    const fetchSignals = async (currentPage) => {
        setLoading(true);
        setError(null);
        try {
            const sinceDate = calculateSinceDate(dateFilter);
            // Fetch signals from API (server-side search supported)
            // Requesting smaller page size (20) for optimization
            const newSignals = await recommendationService.getSignals(sinceDate, searchTerm, currentPage, 20);

            if (newSignals.length === 0) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            setSignals(prev => currentPage === 1 ? newSignals : [...prev, ...newSignals]);

            // Select first signal if none selected
            if (currentPage === 1 && newSignals.length > 0 && !selectedSignal) setSelectedSignal(newSignals[0]);
        } catch (err) {
            console.error("Failed to fetch signals", err);
            setError(err.message || t('list.errorTitle'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchSignals(page);
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, dateFilter, page]);

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
    };

    // Fetch history when entering history mode or changing signal while in history mode
    useEffect(() => {
        const fetchHistory = async () => {
            if (showHistory && selectedSignal && isPremium) {
                try {
                    const since = calculateSinceDate(historyDateFilter); // CALCULATE DATE
                    const history = await recommendationService.getSignalHistory(selectedSignal.symbol, since); // PASS DATE
                    setHistoryData(history);
                } catch (err) {
                    console.error("Failed to fetch history", err);
                }
            }
        };
        fetchHistory();
    }, [showHistory, selectedSignal, historyDateFilter, isPremium]); // ADD DEPENDENCY

    // Handle signal selection
    const handleSignalSelect = (signal) => {
        setSelectedSignal(signal);
        // If history is open, we stay in history mode but update data automatically via useEffect
    };

    // Filter Logic (Client-side filtering still useful for other attributes)
    // Note: searchTerm is handled by server, but we can keep client filter for exact matches/highlighting or remove it.
    // Since API returns relevant results, we mainly filter by Type/Term/Price here.
    const filteredSignals = signals.filter(s => {
        // const matchesSearch = s.symbol.toLowerCase().includes(searchTerm.toLowerCase()); // Handled by server
        const matchesType = typeFilter === 'ALL' || s.type === typeFilter;
        // Case insensitive match for term
        const matchesTerm = termFilter === 'ALL' || s.term.toLowerCase() === termFilter.toLowerCase();

        const matchesPrice = s.entry <= maxEntryPrice;
        const matchesConfidence = (s.confidence * 100) >= minConfidence;
        const potential = Math.abs((s.target - s.entry) / s.entry * 100);
        const matchesPotential = potential >= minPotential;

        return matchesType && matchesTerm && matchesPrice && matchesConfidence && matchesPotential;
    });

    const isDefaultView = searchTerm === '' && typeFilter === 'ALL' && termFilter === 'ALL' && maxEntryPrice === 200000 && minConfidence === 0 && minPotential === 0;
    const displaySignals = filteredSignals; // API handles pagination/limiting for default view

    return (
        <div className="pb-20 pt-4 sm:pt-6 px-4 sm:px-6">
            <FadeInSection>

                {/* Header */}
                <div className="flex justify-between items-end mb-8 border-b border-gray-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-blue-500">
                            <Zap size={16} />
                            <span className="text-xs font-mono-custom uppercase tracking-wider">{t('page.badge')}</span>
                        </div>
                        <h1 className="text-4xl font-light text-white tracking-widest uppercase">
                            {t('page.titlePrimary')} <span className="text-blue-500 font-medium">{t('page.titleHighlight')}</span>
                        </h1>
                        <p className="mt-2 text-[10px] text-gray-500 max-w-lg border-l-2 border-yellow-500/30 pl-2">
                            {t('page.disclaimer')}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowInfoModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-900/10 text-blue-400 border border-blue-500/30 hover:bg-blue-900/20 hover:border-blue-500/50 sharp-corners transition-all group"
                    >
                        <Info size={16} />
                        <span className="text-xs font-bold">{t('page.infoButton')}</span>
                    </button>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT (6 Cols): List area */}
                    <div className="lg:col-span-6 flex flex-col gap-4 h-[600px] lg:h-[750px]">

                        {/* Controls Container */}
                        <div className="bg-[#03050a] border border-gray-800 p-5 sharp-corners flex flex-col gap-5">
                            {/* Search */}
                            <div className="relative">
                                {!isPremium && (
                                    <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[1px] flex items-center justify-center cursor-not-allowed sharp-corners border border-gray-800/50">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-black/80 px-3 py-1 sharp-corners border border-gray-700">
                                            <Lock size={12} /> {t('page.premiumFeature')}
                                        </div>
                                    </div>
                                )}
                                <input
                                    type="text"
                                    placeholder={isPremium ? t('page.searchPlaceholder') : t('page.searchLockedPlaceholder')}
                                    value={searchTerm}
                                    onChange={(e) => isPremium && setSearchTerm(e.target.value)}
                                    disabled={!isPremium}
                                    className={`w-full bg-[#080b14] border border-gray-800 p-3 pl-10 text-xs text-white focus:border-blue-500 outline-none sharp-corners placeholder-gray-600 ${!isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            </div>

                            {/* Button Filters Row */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Type Setup */}
                                <div className="flex flex-col">
                                    <LabelWithTooltip
                                        label={t('filters.trendPrediction')}
                                        tooltip={t('filters.trendPredictionTooltip')}
                                    />
                                    <div className="flex gap-1">
                                        {['ALL', 'LONG', 'SHORT'].map((option) => (
                                            <button
                                                key={option}
                                                onClick={() => setTypeFilter(option)}
                                                className={`flex-1 py-2 text-[9px] font-bold sharp-corners border transition-all ${typeFilter === option
                                                    ? (option === 'LONG' ? 'bg-green-900/20 border-green-500 text-green-400' : option === 'SHORT' ? 'bg-red-900/20 border-red-500 text-red-400' : 'bg-blue-900/20 border-blue-500 text-blue-400')
                                                    : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                                    }`}
                                            >
                                                {option === 'ALL' ? t('filters.all') : (option === 'LONG' ? t('bullish') : t('bearish'))}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Term (Timeframe) */}
                                <div className="flex flex-col">
                                    <LabelWithTooltip
                                        label={t('filters.projectedHorizon')}
                                        tooltip={t('filters.projectedHorizonTooltip')}
                                    />
                                    <div className="flex gap-1">
                                        {['ALL', 'Short', 'Mid', 'Long'].map((option) => {
                                            const isSelected = termFilter === option;
                                            let colorClass = 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300';

                                            if (isSelected) {
                                                if (option === 'Short') colorClass = 'bg-blue-900/20 border-blue-500 text-blue-400';
                                                else if (option === 'Mid') colorClass = 'bg-yellow-900/20 border-yellow-500 text-yellow-400';
                                                else if (option === 'Long') colorClass = 'bg-purple-900/20 border-purple-500 text-purple-400';
                                                else colorClass = 'bg-gray-800 border-gray-600 text-white';
                                            } else {
                                                // Hover effects for non-selected
                                                if (option === 'Short') colorClass += ' hover:text-blue-400 hover:border-blue-500/50';
                                                else if (option === 'Mid') colorClass += ' hover:text-yellow-400 hover:border-yellow-500/50';
                                                else if (option === 'Long') colorClass += ' hover:text-purple-400 hover:border-purple-500/50';
                                            }

                                            return (
                                                <button
                                                    key={option}
                                                    onClick={() => setTermFilter(option)}
                                                    className={`flex-1 py-2 text-[9px] font-bold sharp-corners border transition-all ${colorClass}`}
                                                >
                                                    {option === 'ALL'
                                                        ? t('filters.all')
                                                        : option === 'Short'
                                                            ? t('filters.short')
                                                            : option === 'Mid'
                                                                ? t('filters.mid')
                                                                : t('filters.long')}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Date Filter Row */}
                            <div className="flex flex-col">
                                <LabelWithTooltip
                                    label={t('filters.analysisDate')}
                                    tooltip={t('filters.analysisDateTooltip')}
                                />
                                <div className="flex gap-1">
                                    {['ALL', '24H', '7D', '30D'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setDateFilter(d)}
                                            className={`flex-1 py-2 text-[9px] font-bold sharp-corners border transition-all ${dateFilter === d
                                                ? 'bg-purple-900/20 border-purple-500 text-purple-400'
                                                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                                }`}
                                        >
                                            {d === 'ALL' ? t('filters.allTime') : d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Sliders Row */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Entry Price Slider */}
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <LabelWithTooltip
                                            label={t('filters.maxPrice')}
                                            tooltip={t('filters.maxPriceTooltip')}
                                        />
                                        <span className="text-[10px] font-bold text-blue-400">${Number(maxEntryPrice).toLocaleString()}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="200000"
                                        step="1000"
                                        value={maxEntryPrice}
                                        onChange={(e) => setMaxEntryPrice(Number(e.target.value))}
                                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-600 font-mono-custom mt-1">
                                        <span>$0</span>
                                        <span>$200k</span>
                                    </div>
                                </div>

                                {/* Confidence Slider */}
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <LabelWithTooltip
                                            label={t('filters.aiConfidence')}
                                            tooltip={t('filters.aiConfidenceTooltip')}
                                        />
                                        <span className="text-[10px] font-bold text-blue-400">{minConfidence}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={minConfidence}
                                        onChange={(e) => setMinConfidence(Number(e.target.value))}
                                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-600 font-mono-custom mt-1">
                                        <span>0%</span>
                                        <span>100%</span>
                                    </div>
                                </div>

                                {/* Potential Slider */}
                                <div className="flex flex-col">
                                    <div className="flex justify-between items-center mb-2">
                                        <LabelWithTooltip
                                            label={t('filters.minRange')}
                                            tooltip={t('filters.minRangeTooltip')}
                                        />
                                        <span className="text-[10px] font-bold text-green-400">+{minPotential}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={minPotential}
                                        onChange={(e) => setMinPotential(Number(e.target.value))}
                                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-green-500"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-600 font-mono-custom mt-1">
                                        <span>0%</span>
                                        <span>100%</span>
                                    </div>
                                </div>
                            </div>

                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto pr-1">
                            {error ? (
                                <div className="text-center text-red-500 text-xs py-8">
                                    <p className="font-bold mb-2">{t('list.errorTitle')}</p>
                                    <p className="mb-4">{error}</p>
                                    <button
                                        onClick={() => fetchSignals(1)}
                                        className="text-blue-400 hover:text-blue-300 underline"
                                    >
                                        {t('list.tryAgain')}
                                    </button>
                                </div>
                            ) : displaySignals.length === 0 ? (
                                <div className="text-center text-gray-500 text-xs py-8">{t('list.noResults')}</div>
                            ) : (
                                displaySignals.map(signal => {
                                    // Formatting for list display
                                    const displayConfidence = (signal.confidence * 100).toFixed(0);
                                    const displayEntry = Number(signal.entry).toLocaleString(undefined, { maximumFractionDigits: 5 });

                                    return (
                                        <div
                                            key={signal.id}
                                            onClick={() => handleSignalSelect(signal)}
                                            className={`p-4 mb-2 border cursor-pointer sharp-corners transition-all relative overflow-visible group ${selectedSignal?.id === signal.id ? 'bg-blue-900/10 border-blue-500' : 'bg-[#03050a] border-gray-800 hover:border-blue-500/50'}`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    {signal.logo ? (
                                                        <img src={signal.logo} alt={signal.symbol} className="w-8 h-8 rounded-full object-cover" />
                                                    ) : (
                                                        <div className={`w-8 h-8 flex items-center justify-center sharp-corners font-bold text-xs ${signal.type === 'LONG' ? 'bg-green-500/20 text-green-400' : signal.type === 'SHORT' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                            {signal.symbol.substring(0, 1)}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                                            {signal.symbol}
                                                            {isDefaultView && <span className="text-[9px] bg-gray-800 text-gray-400 px-1 py-0.5">{t('list.latest')}</span>}
                                                        </div>
                                                        <div className="text-[10px] text-gray-500 font-mono-custom">
                                                            {t('list.projection')}: <span className="text-green-400 font-bold">+{Math.abs((signal.target - signal.entry) / signal.entry * 100).toFixed(2)}%</span>
                                                        </div>
                                                        {/* Prominent Signal Time */}
                                                        <div className="mt-1 text-[10px] font-bold text-gray-400 flex items-center gap-1">
                                                            <Clock size={10} />
                                                            <span>{new Date(signal.time || Date.now()).toLocaleString(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-[9px] px-1.5 py-0.5 sharp-corners font-bold ${Number(displayConfidence) >= 80 ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'}`}>
                                                        {displayConfidence}% {t('list.aiConf')}
                                                    </span>
                                                    <span className={`text-[9px] px-1.5 py-0.5 sharp-corners font-bold ${signal.term.toLowerCase() === 'short' ? 'text-blue-400 bg-blue-900/10' : signal.term.toLowerCase() === 'long' ? 'text-purple-400 bg-purple-900/10' : 'text-yellow-400 bg-yellow-900/10'}`}>
                                                        {signal.term.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Hover Glow */}
                                            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                                        </div>
                                    )
                                })
                            )}

                            {/* Load More Button */}
                            {displaySignals.length > 0 && hasMore && (
                                <div className="text-center py-4 relative">
                                    {!isPremium && (
                                        <div className="absolute inset-0 z-10 bg-black/50 backdrop-blur-[1px] flex items-center justify-center cursor-not-allowed sharp-corners">
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-black/80 px-3 py-1 sharp-corners border border-gray-700">
                                                <Lock size={12} /> {t('page.premiumFeature')}
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={loading || !isPremium}
                                        className={`text-xs bg-blue-900/20 text-blue-400 border border-blue-500/30 px-4 py-2 sharp-corners hover:bg-blue-900/40 transition-colors disabled:opacity-50 ${!isPremium ? 'cursor-not-allowed opacity-30' : ''}`}
                                    >
                                        {loading ? t('list.loading') : t('list.loadMore')}
                                    </button>
                                </div>
                            )}

                            {/* Bottom spacing */}
                            <div className="h-4"></div>
                        </div>
                    </div>

                    {/* RIGHT (6 Cols): Visualization & History Toggle */}
                    <div className="lg:col-span-6 min-h-[500px] lg:min-h-0 lg:h-[750px] flex flex-col gap-4">

                        {/* Toggle Bar */}
                        {selectedSignal && (
                            <div className="flex justify-end gap-2 relative">
                                {!isPremium && (
                                    <div className="absolute inset-0 z-10 cursor-not-allowed" title={t('toggle.historyPremiumTitle')}></div>
                                )}
                                <button
                                    onClick={() => isPremium && setShowHistory(!showHistory)}
                                    disabled={!isPremium}
                                    className={`flex items-center gap-2 px-4 py-2 text-xs font-bold sharp-corners border transition-all ${!isPremium
                                        ? 'bg-gray-900/50 text-gray-600 border-gray-800 cursor-not-allowed'
                                        : showHistory
                                            ? 'bg-blue-500 text-white border-blue-500'
                                            : 'bg-[#03050a] text-gray-400 border-gray-800 hover:text-white'
                                        }`}
                                >
                                    {showHistory ? (
                                        <>
                                            <ArrowLeft size={14} /> {t('toggle.backToLiveSignal')}
                                        </>
                                    ) : (
                                        <>
                                            {!isPremium && <Lock size={12} />} <History size={14} /> {t('toggle.historicalData')}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        <div className="flex-1 min-h-0">
                            {selectedSignal ? (
                                showHistory ? (
                                    <SignalHistoryChart
                                        symbol={selectedSignal.symbol}
                                        history={historyData}
                                        onFilterChange={setHistoryDateFilter}
                                        currentFilter={historyDateFilter}
                                    />
                                ) : (
                                    <SignalVisualizer signal={selectedSignal} />
                                )
                            ) : (
                                <div className="h-full bg-[#03050a] border border-gray-800 sharp-corners flex flex-col items-center justify-center text-gray-600">
                                    <Activity size={48} className="mb-4 opacity-20" />
                                    <p>{t('empty.selectSignal')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </FadeInSection>

            {/* Info Modal */}
            {showInfoModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#03050a] border border-blue-500/30 p-1 w-full max-w-lg sharp-corners shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#080b14] border border-gray-800 p-6 sharp-corners relative">
                            <button
                                onClick={() => setShowInfoModal(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex items-center gap-3 mb-6 text-blue-400">
                                <Info size={24} />
                                <h3 className="text-xl font-light uppercase tracking-wider text-white">{t('info.title')} <span className="font-bold">{t('info.titleHighlight')}</span></h3>
                            </div>

                            <div className="space-y-4 text-sm text-gray-400 leading-relaxed font-mono-custom">
                                <p>
                                    <strong className="text-white block mb-2">{t('info.architectureTitle')}</strong>
                                    {t('info.architectureText')}
                                </p>
                                <div className="h-px bg-gray-800 my-4"></div>
                                <p className="text-xs text-gray-500">
                                    {t('info.footerText')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Signals;
