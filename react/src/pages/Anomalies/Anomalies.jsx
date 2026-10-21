import React, { useState, useEffect, useMemo } from 'react';
import {
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Activity,
    Search,
    Clock,
    MessageCircle,
    BarChart2,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { recommendationService } from '../../services/recommendation.service';
import { FadeInSection, PageHeader } from '../../components';
import { useAuth } from '../../context';
import { useTranslation } from 'react-i18next';

// Tooltip Helper Component
const Tooltip = ({ text, children }) => (
    <div className="group/tip relative inline-flex items-center">
        {children}
        <HelpCircle size={12} className="ml-1 text-gray-600 cursor-help" />
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none z-[9999]">
            <div className="bg-[#080b14] border border-gray-700 p-3 sharp-corners shadow-xl text-[11px] text-gray-300 leading-relaxed">
                {text}
            </div>
        </div>
    </div>
);

const Anomalies = () => {
    const { t, i18n } = useTranslation('anomalies');
    const navigate = useNavigate();
    const { user } = useAuth();
    const isPremium = user?.user_metadata?.subscription_tier === 'Premium';

    const [anomalies, setAnomalies] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('All');
    const [filterSeverity, setFilterSeverity] = useState('All'); // High, Medium, Low, All
    const [selectedTime, setSelectedTime] = useState('24h');
    const [sortColumn, setSortColumn] = useState('detectedAt');
    const [sortDirection, setSortDirection] = useState('desc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    useEffect(() => {
        if (!isPremium) {
            setLoading(false);
            return;
        }

        const fetchAnomalies = async () => {
            setLoading(true);
            try {
                let since = null;
                if (selectedTime === '24h') since = new Date(Date.now() - 24 * 60 * 60 * 1000);
                else if (selectedTime === '7d') since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                else if (selectedTime === '30d') since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

                const offset = (currentPage - 1) * itemsPerPage;
                const response = await recommendationService.getAnomalies(since, itemsPerPage, offset);

                // Backend now returns {data, total, limit, offset}
                if (response && response.data) {
                    setAnomalies(response.data);
                    setTotal(response.total || 0);
                } else {
                    // Fallback for old format
                    setAnomalies(Array.isArray(response) ? response : []);
                    setTotal(Array.isArray(response) ? response.length : 0);
                }
            } catch (err) {
                console.error("Failed to fetch anomalies", err);
                setAnomalies([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };
        fetchAnomalies();
    }, [selectedTime, currentPage, isPremium]);

    // Client-side filtering and sorting
    const filteredAnomalies = useMemo(() => {
        let filtered = anomalies.filter(item => {
            // Search filter
            if (searchQuery && !item.symbol.toLowerCase().includes(searchQuery.toLowerCase())) return false;

            // Type filter
            if (filterType !== 'All') {
                const type = item.anomalyType.toLowerCase();
                if (filterType === 'Crash' && !type.includes('crash')) return false;
                if (filterType === 'Pump' && !type.includes('pump')) return false;
                if (filterType === 'Volume' && !type.includes('volume')) return false;
            }

            // Severity filter based on score
            if (filterSeverity !== 'All') {
                const score = item.anomalyScore;
                if (filterSeverity === 'High' && score >= -0.15) return false;
                if (filterSeverity === 'Medium' && (score < -0.15 || score >= -0.08)) return false;
                if (filterSeverity === 'Low' && score < -0.08) return false;
            }

            return true;
        });

        // Apply sorting
        if (sortColumn) {
            filtered.sort((a, b) => {
                let aVal, bVal;

                if (sortColumn === 'symbol') {
                    aVal = a.symbol;
                    bVal = b.symbol;
                } else if (sortColumn === 'anomalyScore') {
                    aVal = a.anomalyScore;
                    bVal = b.anomalyScore;
                } else if (sortColumn === 'priceAtDetection') {
                    aVal = a.priceAtDetection;
                    bVal = b.priceAtDetection;
                } else if (sortColumn === 'detectedAt') {
                    aVal = new Date(a.detectedAt).getTime();
                    bVal = new Date(b.detectedAt).getTime();
                }

                if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        }

        return filtered;
    }, [anomalies, searchQuery, filterType, filterSeverity, sortColumn, sortDirection]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            // Toggle direction
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // New column, default to desc
            setSortColumn(column);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ column }) => {
        if (sortColumn !== column) return <ArrowUpDown size={12} className="inline ml-1 text-gray-600" />;
        return sortDirection === 'asc'
            ? <ArrowUp size={12} className="inline ml-1 text-red-400" />
            : <ArrowDown size={12} className="inline ml-1 text-red-400" />;
    };

    // Pagination (server-side)
    const totalPages = Math.ceil(total / itemsPerPage);

    const goToPage = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const getTypeBadge = (type) => {
        const t = type.toLowerCase();
        if (t.includes('crash')) return { color: 'bg-red-500/10 text-red-400 border-red-500/30', label: type };
        if (t.includes('pump')) return { color: 'bg-green-500/10 text-green-400 border-green-500/30', label: type };
        if (t.includes('volume')) return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', label: type };
        return { color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', label: type };
    };

    const getScoreColor = (score) => {
        if (score < -0.15) return 'text-red-400';
        if (score < -0.08) return 'text-orange-400';
        return 'text-yellow-400';
    };

    const getSeverityLabel = (score) => {
        if (score < -0.15) return t('severity.high');
        if (score < -0.08) return t('severity.medium');
        return t('severity.low');
    };

    const latestDetection = anomalies.length > 0 ? new Date(anomalies[0].detectedAt) : null;
    const timeSinceLatest = latestDetection ? Math.floor((Date.now() - latestDetection.getTime()) / 60000) : null;

    if (!isPremium) {
        return (
            <div className="h-full flex flex-col items-center justify-center px-4 text-center">
                <div className="bg-[#0f0505] border border-red-900/30 p-12 sharp-corners max-w-lg w-full relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 opacity-10"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <Lock size={32} className="text-red-500" />
                        </div>

                        <h2 className="text-2xl font-light text-white mb-2 uppercase tracking-wide">
                            {t('premium.title').split(' ')[0]} <span className="font-bold text-red-500">{t('premium.title').split(' ').slice(1).join(' ')}</span>
                        </h2>

                        <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-sm">
                            {t('premium.subtitle')}
                        </p>

                        <button
                            onClick={() => navigate('/hub/profile')}
                            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider sharp-corners transition-colors w-full sm:w-auto"
                        >
                            {t('premium.upgrade')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
        );
    }

    return (
        <div className="pb-20 pt-4 sm:pt-6 px-4 md:px-8 max-w-[1600px] mx-auto">
            <FadeInSection>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-gray-800 pb-6">
                    <div>
                        <PageHeader
                            icon={AlertTriangle}
                            highlight={t('header.highlight')}
                            title={t('header.title')}
                            subtitle={t('header.subtitle')}
                        />
                        <p className="text-gray-400 text-sm max-w-xl mt-2">
                            {t('header.description')}
                        </p>

                        {/* Stats */}
                        <div className="flex gap-6 mt-4">
                            <div>
                                <Tooltip text={t('stats.totalDetectedTooltip')}>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('stats.totalDetected')}</div>
                                </Tooltip>
                                <div className="text-2xl font-bold text-red-400">{total}</div>
                            </div>
                            {timeSinceLatest !== null && (
                                <div>
                                    <Tooltip text={t('stats.latestAlertTooltip')}>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">{t('stats.latestAlert')}</div>
                                    </Tooltip>
                                    <div className="text-2xl font-bold text-orange-400">{t('stats.minutesAgo', { value: timeSinceLatest })}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-[#03050a] border border-gray-800 p-5 sharp-corners w-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Search */}
                            <div className="relative lg:col-span-1 flex items-center">
                                <input
                                    type="text"
                                    placeholder={t('filters.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[#080b14] border border-gray-800 p-3 pl-10 text-xs text-white focus:border-red-500 outline-none sharp-corners placeholder-gray-600"
                                />
                                <Search className="absolute left-3 text-gray-500" size={14} />
                            </div>

                            {/* Time Filter */}
                            <div className="lg:col-span-1">
                                <Tooltip text={t('filters.timeRangeTooltip')}>
                                    <div className="text-[9px] text-gray-500 uppercase font-bold mb-2">{t('filters.timeRange')}</div>
                                </Tooltip>
                                <div className="flex gap-1">
                                    {['24h', '7d', '30d', 'All'].map((time) => (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`flex-1 py-2 text-[9px] font-bold sharp-corners border transition-all ${selectedTime === time
                                                ? 'bg-red-900/20 border-red-500 text-red-400'
                                                : 'border-gray-800 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Type Filter */}
                            <div className="lg:col-span-1">
                                <Tooltip text={t('filters.anomalyTypeTooltip')}>
                                    <div className="text-[9px] text-gray-500 uppercase font-bold mb-2">{t('filters.anomalyType')}</div>
                                </Tooltip>
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="w-full bg-[#080b14] border border-gray-800 p-2 text-xs text-white focus:border-red-500 outline-none sharp-corners"
                                >
                                    <option value="All">{t('filters.allTypes')}</option>
                                    <option value="Crash">{t('filters.crashes')}</option>
                                    <option value="Pump">{t('filters.pumps')}</option>
                                    <option value="Volume">{t('filters.volumeSpikes')}</option>
                                </select>
                            </div>

                            {/* Severity Filter */}
                            <div className="lg:col-span-1">
                                <Tooltip text={t('filters.severityTooltip')}>
                                    <div className="text-[9px] text-gray-500 uppercase font-bold mb-2">{t('filters.severity')}</div>
                                </Tooltip>
                                <select
                                    value={filterSeverity}
                                    onChange={(e) => setFilterSeverity(e.target.value)}
                                    className="w-full bg-[#080b14] border border-gray-800 p-2 text-xs text-white focus:border-red-500 outline-none sharp-corners"
                                >
                                    <option value="All">{t('filters.allLevels')}</option>
                                    <option value="High">{t('filters.highCritical')}</option>
                                    <option value="Medium">{t('filters.medium')}</option>
                                    <option value="Low">{t('filters.low')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="border border-gray-800 sharp-corners overflow-hidden">
                    {/* Table Header */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[#03050a] border-b border-gray-800 text-[10px] font-mono-custom text-gray-400 uppercase tracking-widest">
                        <button onClick={() => handleSort('symbol')} className="col-span-3 text-left hover:text-white transition-colors">
                            {t('table.asset')} <SortIcon column="symbol" />
                        </button>
                        <div className="col-span-2">
                            <Tooltip text={t('table.typeTooltip')}>
                                <span>{t('table.type')}</span>
                            </Tooltip>
                        </div>
                        <button onClick={() => handleSort('anomalyScore')} className="col-span-2 text-right hover:text-white transition-colors">
                            <Tooltip text={t('table.scoreTooltip')}>
                                <span>{t('table.score')}</span>
                            </Tooltip>
                            <SortIcon column="anomalyScore" />
                        </button>
                        <button onClick={() => handleSort('priceAtDetection')} className="col-span-2 text-right hover:text-white transition-colors">
                            {t('table.price')} <SortIcon column="priceAtDetection" />
                        </button>
                        <button onClick={() => handleSort('detectedAt')} className="col-span-1 text-right hover:text-white transition-colors">
                            {t('table.time')} <SortIcon column="detectedAt" />
                        </button>
                        <div className="col-span-2 text-right">{t('table.actions')}</div>
                    </div>

                    {/* Table Body */}
                    <div className="flex flex-col">
                        {filteredAnomalies.length > 0 ? (
                            filteredAnomalies.map((item, idx) => {
                                const typeBadge = getTypeBadge(item.anomalyType);
                                const timeAgo = Math.floor((Date.now() - new Date(item.detectedAt).getTime()) / 60000);

                                return (
                                    <div
                                        key={idx}
                                        className="group grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-800/50 hover:bg-[#080b14] transition-colors items-center"
                                    >
                                        {/* Asset */}
                                        <div className="col-span-12 md:col-span-3 flex items-center gap-3">
                                            {item.logo ? (
                                                <img src={item.logo} alt={item.symbol} className="w-8 h-8 rounded-full object-cover ring-2 ring-gray-900" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                    {item.symbol.substring(0, 1)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-sm font-bold text-white">{item.symbol}</div>
                                                <div className="text-[10px] text-gray-500">${item.priceAtDetection.toFixed(4)}</div>
                                            </div>
                                        </div>

                                        {/* Type */}
                                        <div className="col-span-6 md:col-span-2">
                                            <span className={`px-2 py-1 sharp-corners border text-[9px] font-bold uppercase ${typeBadge.color}`}>
                                                {typeBadge.label}
                                            </span>
                                        </div>

                                        {/* Score */}
                                        <div className="col-span-6 md:col-span-2 text-right">
                                            <div className={`font-mono-custom text-sm font-bold ${getScoreColor(item.anomalyScore)}`}>
                                                {item.anomalyScore.toFixed(4)}
                                            </div>
                                            <div className="text-[9px] text-gray-600 mt-0.5">{getSeverityLabel(item.anomalyScore)}</div>
                                        </div>

                                        {/* Price (hidden on mobile, shown in asset) */}
                                        <div className="hidden md:block col-span-2 text-right">
                                            <div className="font-mono-custom text-sm text-gray-200">${item.priceAtDetection.toFixed(4)}</div>
                                        </div>

                                        {/* Time */}
                                        <div className="col-span-6 md:col-span-1 text-right">
                                            <div className="text-[10px] text-gray-500 flex items-center justify-end gap-1">
                                                <Clock size={10} />
                                                {timeAgo < 60 ? t('table.minutes', { value: timeAgo }) : t('table.hours', { value: Math.floor(timeAgo / 60) })}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="col-span-6 md:col-span-2 flex justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    const prompt = i18n.language === 'tr'
                                                        ? `${item.symbol} için Anomalies tespit edildi. Anomaly Skoru: ${item.anomalyScore?.toFixed(4)}, Fiyatı: $${item.priceAtDetection?.toFixed(4)}. Bu veriler doğrultusunda ${item.symbol} hakkında ne düşünüyorsun?`
                                                        : `Anomalies detected for ${item.symbol}. Anomaly Score is: ${item.anomalyScore?.toFixed(4)}, Price is: $${item.priceAtDetection?.toFixed(4)}. Based on this data, what do you think about ${item.symbol}?`;

                                                    const event = new CustomEvent('open-iris-chat', { detail: { prompt } });
                                                    window.dispatchEvent(event);
                                                }}
                                                title={t('actions.askIris')}
                                                className="p-1.5 bg-purple-900/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white transition-all sharp-corners"
                                            >
                                                <MessageCircle size={14} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/hub/market-analysis?search=${item.symbol}`)}
                                                title={t('actions.viewSignals')}
                                                className="p-1.5 bg-blue-900/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all sharp-corners"
                                            >
                                                <Activity size={14} />
                                            </button>
                                            <button
                                                onClick={() => navigate(`/hub/coin/${item.symbol.replace('-USD', '')}`)}
                                                title={t('actions.viewChart')}
                                                className="p-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:bg-white hover:text-black transition-all sharp-corners"
                                            >
                                                <BarChart2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-12 text-center">
                                <Activity size={48} className="mx-auto text-gray-800 mb-4" />
                                <h3 className="text-white font-bold mb-2">{t('empty.title')}</h3>
                                <p className="text-gray-500 text-sm">{t('empty.subtitle')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-800">
                        <div className="text-xs text-gray-500">
                            {t('pagination.showing', {
                                start: (currentPage - 1) * itemsPerPage + 1,
                                end: Math.min(currentPage * itemsPerPage, total),
                                total
                            })}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Previous Button */}
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="px-3 py-2 border border-gray-800 bg-[#03050a] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed sharp-corners transition-colors text-xs font-bold"
                            >
                                <ChevronLeft size={14} className="inline mr-1" />
                                {t('pagination.prev')}
                            </button>

                            {/* Page Numbers - Simplified */}
                            <div className="flex gap-1 items-center">
                                {/* First Page */}
                                <button
                                    onClick={() => goToPage(1)}
                                    className={`w-8 h-8 flex items-center justify-center text-xs font-bold sharp-corners transition-all ${currentPage === 1
                                        ? 'bg-red-600 text-white'
                                        : 'bg-[#03050a] border border-gray-800 text-gray-400 hover:border-gray-600'
                                        }`}
                                >
                                    1
                                </button>

                                {/* Show ellipsis if current page is far from first */}
                                {currentPage > 2 && <span className="text-gray-600 px-1">...</span>}

                                {/* Current Page (if not first or last) */}
                                {currentPage !== 1 && currentPage !== totalPages && (
                                    <button
                                        className="w-8 h-8 flex items-center justify-center text-xs font-bold sharp-corners bg-red-600 text-white"
                                    >
                                        {currentPage}
                                    </button>
                                )}

                                {/* Show ellipsis if current page is far from last */}
                                {currentPage < totalPages - 1 && <span className="text-gray-600 px-1">...</span>}

                                {/* Last Page (if more than 1 page) */}
                                {totalPages > 1 && (
                                    <button
                                        onClick={() => goToPage(totalPages)}
                                        className={`w-8 h-8 flex items-center justify-center text-xs font-bold sharp-corners transition-all ${currentPage === totalPages
                                            ? 'bg-red-600 text-white'
                                            : 'bg-[#03050a] border border-gray-800 text-gray-400 hover:border-gray-600'
                                            }`}
                                    >
                                        {totalPages}
                                    </button>
                                )}
                            </div>

                            {/* Next Button */}
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="px-3 py-2 border border-gray-800 bg-[#03050a] text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed sharp-corners transition-colors text-xs font-bold"
                            >
                                {t('pagination.next')}
                                <ChevronRight size={14} className="inline ml-1" />
                            </button>
                        </div>
                    </div>
                )}
            </FadeInSection>
        </div>
    );
};

export default Anomalies;
