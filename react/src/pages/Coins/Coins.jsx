import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Search,
    Star,
    Activity,
    ChevronRight,
    X,
    AlertCircle
} from 'lucide-react';
import { coinService } from '../../services/coin.service';
import { FadeInSection, PageHeader } from '../../components';
import PriceChart from '../../components/Dashboard/PriceChart';
import { useTranslation } from 'react-i18next';

const PINNED_STORAGE_KEY = 'coinvisio:pinnedCoins';
const PINNED_LIMIT = 10;

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

function getDisplayName(symbol) {
    const clean = getDisplaySymbol(symbol)?.toLowerCase();
    return getCoinName(clean) || symbol;
}

function getLogoUrl(symbol) {
    const cleanSymbol = getDisplaySymbol(symbol)?.toLowerCase();
    return `https://cryptologos.cc/logos/${getCoinName(cleanSymbol)}-${cleanSymbol}-logo.png`;
}

function toBackendSymbol(symbol) {
    if (!symbol) return symbol;
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

const Tooltip = ({ label, text, className }) => (
    <span className={`relative group/tooltip inline-flex items-center ${className || ''}`}>
        <span className="border-b border-dotted border-gray-600 group-hover/tooltip:text-gray-300 group-hover/tooltip:border-gray-400 transition-colors">
            {label}
        </span>
        <span className="absolute bottom-full left-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-52 max-w-[70vw] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[400]">
            <span className="bg-[#080b14] border border-gray-700 p-2 sharp-corners shadow-xl text-[10px] text-gray-300 leading-tight text-center block whitespace-normal">
                {text}
            </span>
        </span>
    </span>
);

const Coins = () => {
    const { t } = useTranslation('coins');
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const { symbol } = useParams();
    const [selectedCoin, setSelectedCoin] = useState(() => toBackendSymbol(symbol || 'BTC-USD'));

    // Pinned coins for quick chart switching
    const [pinnedCoins, setPinnedCoins] = useState([]);
    const [pinnedLoaded, setPinnedLoaded] = useState(false);
    const [pinnedStats, setPinnedStats] = useState({});
    const [pinnedError, setPinnedError] = useState(null);

    // Watchlist state
    const [watchlist, setWatchlist] = useState([]);
    const [watchlistLimit, setWatchlistLimit] = useState({ count: 0, limit: 3 });
    const [watchlistLoading, setWatchlistLoading] = useState(true);
    const [watchlistError, setWatchlistError] = useState(null);

    // Fetch initial data
    useEffect(() => {
        const loadData = async () => {
            try {
                const watchlistData = await coinService.getWatchlist();
                setWatchlist(watchlistData);
                setWatchlistLimit({
                    count: watchlistData.length,
                    limit: 3 // Will be updated from server response
                });
            } catch (error) {
                console.error("Failed to load data:", error);
            } finally {
                setWatchlistLoading(false);
            }
        };
        loadData();
    }, []);

    // Load pinned coins from localStorage once
    useEffect(() => {
        const stored = localStorage.getItem(PINNED_STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const normalized = parsed
                        .map((item) => {
                            const rawSymbol = item?.symbol || item;
                            const cleanSymbol = toBackendSymbol(rawSymbol);
                            return {
                                symbol: cleanSymbol,
                                name: item?.name || getDisplayName(cleanSymbol),
                                logoUrl: item?.logoUrl || null
                            };
                        })
                        .filter((item) => item.symbol);
                    if (normalized.length > 0) {
                        setPinnedCoins(normalized.slice(0, PINNED_LIMIT));
                    } else {
                        const initialSymbol = toBackendSymbol(symbol || 'BTC-USD');
                        setPinnedCoins([{ symbol: initialSymbol, name: getDisplayName(initialSymbol), logoUrl: null }]);
                    }
                } else {
                    const initialSymbol = toBackendSymbol(symbol || 'BTC-USD');
                    setPinnedCoins([{ symbol: initialSymbol, name: getDisplayName(initialSymbol), logoUrl: null }]);
                }
            } catch {
                const initialSymbol = toBackendSymbol(symbol || 'BTC-USD');
                setPinnedCoins([{ symbol: initialSymbol, name: getDisplayName(initialSymbol), logoUrl: null }]);
            }
        } else {
            const initialSymbol = toBackendSymbol(symbol || 'BTC-USD');
            setPinnedCoins([{ symbol: initialSymbol, name: getDisplayName(initialSymbol), logoUrl: null }]);
        }
        setPinnedLoaded(true);
    }, []);

    // Persist pinned coins
    useEffect(() => {
        if (!pinnedLoaded) return;
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedCoins));
    }, [pinnedCoins, pinnedLoaded]);

    // Update selected coin when URL param changes
    useEffect(() => {
        if (symbol) {
            setSelectedCoin(toBackendSymbol(symbol));
        }
    }, [symbol]);

    // Ensure selected coin is always pinned
    useEffect(() => {
        if (!selectedCoin) return;
        setPinnedCoins((prev) => {
            const exists = prev.some((c) => c.symbol === selectedCoin);
            if (exists) return prev;
            if (prev.length >= PINNED_LIMIT) {
                setPinnedError(t('pinned.limitError', { limit: PINNED_LIMIT }));
                return prev;
            }
            setPinnedError(null);
            const name = getDisplayName(selectedCoin);
            return [{ symbol: selectedCoin, name, logoUrl: null }, ...prev];
        });
    }, [selectedCoin]);

    // Search handler with debounce
    useEffect(() => {
        let active = true;
        const timer = setTimeout(async () => {
            if (searchTerm.length > 1) {
                const results = await coinService.search(searchTerm);
                const normalized = results.map((sym) => toBackendSymbol(sym));
                const mappedResults = normalized.map((sym) => ({
                    symbol: sym,
                    displaySymbol: getDisplaySymbol(sym),
                    logoUrl: null,
                    name: getDisplayName(sym)
                }));
                if (!active) return;
                setSearchResults(mappedResults);

                const meta = await coinService.getMeta(normalized);
                if (!active || !Array.isArray(meta) || meta.length === 0) return;

                const metaMap = new Map(meta.map((m) => [m.symbol, m]));
                setSearchResults((prev) =>
                    prev.map((item) => {
                        const info = metaMap.get(item.symbol);
                        if (!info) return item;
                        return {
                            ...item,
                            name: info.name || item.name,
                            logoUrl: info.logoUrl || item.logoUrl
                        };
                    })
                );
            } else {
                setSearchResults([]);
            }
        }, 400);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [searchTerm]);

    // Backfill logos/names for pinned coins when available
    useEffect(() => {
        const missing = pinnedCoins.filter((c) => !c.logoUrl || !c.name);
        if (missing.length === 0) return;

        const symbols = missing.map((c) => c.symbol);
        let active = true;
        const hydrate = async () => {
            const meta = await coinService.getMeta(symbols);
            if (!active || !Array.isArray(meta) || meta.length === 0) return;
            const metaMap = new Map(meta.map((m) => [m.symbol, m]));
            setPinnedCoins((prev) =>
                prev.map((item) => {
                    const info = metaMap.get(item.symbol);
                    if (!info) return item;
                    return {
                        ...item,
                        name: info.name || item.name,
                        logoUrl: info.logoUrl || item.logoUrl
                    };
                })
            );
        };
        hydrate();
        return () => {
            active = false;
        };
    }, [pinnedCoins]);

    // Fetch mini stats for pinned coins
    useEffect(() => {
        if (pinnedCoins.length === 0) return;
        let active = true;

        const fetchStats = async () => {
            if (typeof document !== 'undefined' && document.hidden) return;

            const symbols = pinnedCoins.map((c) => c.symbol);
            const [quotes, liveFallbacks] = await Promise.all([
                coinService.getQuotes(symbols),
                Promise.all(
                    symbols.map(async (s) => {
                        const data = await coinService.getLivePrice(s);
                        return data ? { ...data, symbol: s } : null;
                    })
                )
            ]);

            const quoteMap = new Map();
            (Array.isArray(liveFallbacks) ? liveFallbacks : [])
                .filter(Boolean)
                .forEach((item) => {
                    if (item.symbol) {
                        const key = toBackendSymbol(item.symbol);
                        quoteMap.set(key, item);
                        quoteMap.set(getDisplaySymbol(key), item);
                    }
                });

            (Array.isArray(quotes) ? quotes : [])
                .filter((q) => q && q.symbol)
                .forEach((q) => {
                    const key = toBackendSymbol(q.symbol);
                    quoteMap.set(key, q);
                    quoteMap.set(getDisplaySymbol(key), q);
                });

            const missingAfter = symbols
                .map((s) => toBackendSymbol(s))
                .filter((s) => !quoteMap.has(s));

            if (missingAfter.length > 0) {
                const historyFallbacks = await Promise.all(
                    missingAfter.map(async (s) => {
                        const history = await coinService.getHistory(s, 20);
                        if (!Array.isArray(history) || history.length === 0) return null;
                        const sorted = history
                            .map((item) => {
                                const rawTime = item.time || item.recordedAt || item.recorded_at;
                                const ts = rawTime ? new Date(rawTime).getTime() : NaN;
                                if (Number.isNaN(ts)) return null;
                                return {
                                    ...item,
                                    timestamp: ts
                                };
                            })
                            .filter(Boolean)
                            .sort((a, b) => a.timestamp - b.timestamp);
                        if (sorted.length === 0) return null;
                        const latest = sorted[sorted.length - 1];
                        const targetTs = latest.timestamp - 24 * 60 * 60 * 1000;
                        const prev = [...sorted].reverse().find((item) => item.timestamp <= targetTs) || sorted[0];
                        const latestClose = Number(latest.close);
                        const prevClose = Number(prev.close);
                        if (!Number.isFinite(latestClose) || !Number.isFinite(prevClose) || prevClose === 0) return null;
                        const change24h = ((latestClose - prevClose) / prevClose) * 100;
                        return {
                            symbol: s,
                            price: latestClose,
                            change24h
                        };
                    })
                );
                historyFallbacks.filter(Boolean).forEach((item) => {
                    const key = toBackendSymbol(item.symbol);
                    quoteMap.set(key, item);
                    quoteMap.set(getDisplaySymbol(key), item);
                });
            }

            if (!active) return;
            setPinnedStats((prev) => {
                const next = { ...prev };
                quoteMap.forEach((q, symbol) => {
                    if (q && q.price !== undefined && q.price !== null) {
                        next[symbol] = q;
                    }
                });
                return next;
            });
        };

        fetchStats();
        const interval = setInterval(fetchStats, 30000);

        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [pinnedCoins]);

    const handleCoinSelect = (coin) => {
        const coinSymbol = typeof coin === 'string' ? coin : coin?.symbol;
        if (!coinSymbol) return;
        const cleanSymbol = toBackendSymbol(coinSymbol);
        setSelectedCoin(cleanSymbol);
        setSearchTerm('');
        setSearchResults([]);
        addPinnedCoin(coin);
        navigate(`/hub/coins/${cleanSymbol}`);
    };

    const addPinnedCoin = (coin) => {
        const coinSymbol = typeof coin === 'string' ? coin : coin?.symbol;
        if (!coinSymbol) return;
        const cleanSymbol = toBackendSymbol(coinSymbol);
        const name = typeof coin === 'string' ? getDisplayName(cleanSymbol) : (coin?.name || getDisplayName(cleanSymbol));
        const logoUrl = typeof coin === 'string' ? null : (coin?.logoUrl || null);

        setPinnedCoins((prev) => {
            if (prev.some((c) => c.symbol === cleanSymbol)) return prev;
            if (prev.length >= PINNED_LIMIT) {
                setPinnedError(t('pinned.limitError', { limit: PINNED_LIMIT }));
                return prev;
            }
            setPinnedError(null);
            return [...prev, { symbol: cleanSymbol, name, logoUrl }];
        });
    };

    const removePinnedCoin = (coinSymbol) => {
        setPinnedCoins((prev) => prev.filter((c) => c.symbol !== coinSymbol));
        setPinnedError(null);
    };

    const addToWatchlist = async (symbol) => {
        setWatchlistError(null);
        const cleanSymbol = toBackendSymbol(symbol);
        if (!cleanSymbol || isInWatchlist(cleanSymbol)) return;

        const prevWatchlist = watchlist;
        const prevLimit = watchlistLimit;
        const fallbackName = getDisplayName(cleanSymbol);
        const pinnedMatch = pinnedCoins.find((c) => c.symbol === cleanSymbol);

        setWatchlist((prev) => [
            ...prev,
            {
                symbol: cleanSymbol,
                name: pinnedMatch?.name || fallbackName,
                logoUrl: pinnedMatch?.logoUrl || null
            }
        ]);
        setWatchlistLimit((prev) => ({ ...prev, count: prev.count + 1 }));

        try {
            const result = await coinService.addToWatchlist(cleanSymbol);
            if (result.currentCount) {
                setWatchlistLimit({
                    count: result.currentCount,
                    limit: result.limit
                });
            }
        } catch (error) {
            setWatchlist(prevWatchlist);
            setWatchlistLimit(prevLimit);
            if (error?.error === 'Watchlist limit reached') {
                setWatchlistError(error.message);
            } else {
                setWatchlistError(t('watchlist.addError'));
            }
        }
    };

    const removeFromWatchlist = async (symbol) => {
        const cleanSymbol = toBackendSymbol(symbol);
        const prevWatchlist = watchlist;
        const prevLimit = watchlistLimit;

        setWatchlist((prev) => prev.filter(c => c.symbol !== cleanSymbol));
        setWatchlistLimit((prev) => ({ ...prev, count: Math.max(0, prev.count - 1) }));

        try {
            await coinService.removeFromWatchlist(cleanSymbol);
        } catch (error) {
            setWatchlist(prevWatchlist);
            setWatchlistLimit(prevLimit);
            console.error('Failed to remove from watchlist:', error);
        }
    };

    const isInWatchlist = (symbol) => {
        const cleanSymbol = toBackendSymbol(symbol);
        return watchlist.some(w => w.symbol === cleanSymbol);
    };

    const selectedPinned = pinnedCoins.find((c) => c.symbol === selectedCoin);
    const selectedLogo = selectedPinned?.logoUrl || null;

    return (
        <div className="pb-20 pt-4 sm:pt-6 px-4 md:px-8 max-w-[1600px] mx-auto">
            <FadeInSection>
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6 border-b border-gray-800 pb-6">
                    <div>
                        <PageHeader
                            icon={Activity}
                            subtitle={t('header.subtitle')}
                            title={t('header.title')}
                            highlight={t('header.highlight')}
                        />
                        <p className="text-gray-400 text-sm max-w-xl mt-2">
                            {t('header.description')}
                        </p>
                    </div>

                    {/* Always Visible Search */}
                    <div className="w-full md:w-96 relative">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('search.placeholder')}
                                className="w-full bg-[#080b14] border border-gray-800 p-3 pl-10 text-sm text-white focus:border-blue-500 outline-none sharp-corners placeholder-gray-600"
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            {searchTerm && (
                                <button
                                    onClick={() => { setSearchTerm(''); setSearchResults([]); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Search Results Dropdown */}
                        {searchResults.length > 0 && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-[#080b14] border border-gray-800 sharp-corners shadow-xl max-h-[300px] overflow-y-auto z-50">
                                {searchResults.map((coin, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleCoinSelect(coin)}
                                        className="p-3 border-b border-gray-800/50 hover:bg-white/5 cursor-pointer flex justify-between items-center group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={coin.logoUrl || getLogoUrl(coin.symbol)}
                                                alt={coin.symbol}
                                                className="w-6 h-6 rounded-full"
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <div>
                                                <div className="text-sm font-bold text-white group-hover:text-blue-400">{coin.displaySymbol || coin.symbol}</div>
                                                <div className="text-[10px] text-gray-500">{coin.name}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={14} className="text-gray-600 group-hover:text-white" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pinned Coins - Horizontal Switcher */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <Activity size={18} className="text-blue-500" />
                        <h2 className="text-lg font-bold text-white">{t('pinned.title')}</h2>
                        <span className="px-2 py-0.5 bg-gray-800 text-gray-400 text-[10px] sharp-corners font-mono-custom">{t('pinned.switch')}</span>
                        <span className="text-[10px] text-gray-500 font-mono-custom ml-auto">{pinnedCoins.length}/{PINNED_LIMIT}</span>
                    </div>

                    {pinnedError && (
                        <div className="mb-3 px-3 py-2 bg-red-900/20 border border-red-500/30 sharp-corners text-[10px] text-red-300 flex items-center justify-between">
                            <span>{pinnedError}</span>
                            <button
                                onClick={() => setPinnedError(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {pinnedCoins.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 bg-[#03050a] border border-gray-800 sharp-corners">
                            {t('pinned.empty')}
                        </div>
                    ) : (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {pinnedCoins.map((coin, idx) => (
                                <div
                                    key={`${coin.symbol}-${idx}`}
                                    onClick={() => handleCoinSelect(coin.symbol)}
                                    className={`min-w-[180px] bg-[#03050a] border sharp-corners p-3 cursor-pointer transition-colors flex items-center gap-3 ${selectedCoin === coin.symbol ? 'border-blue-500 bg-blue-900/10' : 'border-gray-800 hover:border-gray-700'}`}
                                >
                                    <img
                                        src={coin.logoUrl || getLogoUrl(coin.symbol)}
                                        alt={coin.symbol}
                                        className="w-8 h-8 rounded-full"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-white">{getDisplaySymbol(coin.symbol)}</div>
                                        <div className="text-[10px] text-gray-500">{coin.name || getDisplayName(coin.symbol)}</div>
                                        <div className="mt-1 flex items-center gap-2 text-[10px] font-mono-custom">
                                            {(() => {
                                                const normalizedKey = toBackendSymbol(coin.symbol);
                                                const displayKey = getDisplaySymbol(coin.symbol);
                                                const stat = pinnedStats[normalizedKey] || pinnedStats[displayKey];
                                                const price = stat?.price;
                                                const change = stat?.change24h;
                                                return (
                                                    <>
                                                        <span className="text-gray-400">
                                                            {price !== undefined && price !== null
                                                                ? `$${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                                : '--'}
                                                        </span>
                                                        <span className={`${(change ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {change !== undefined && change !== null
                                                                ? `${change >= 0 ? '+' : ''}${Number(change).toFixed(2)}%`
                                                                : '--'}
                                                        </span>
                                                    </>
                                                );
                                            })()}
                                            <Tooltip
                                                label={t('labels.change24h')}
                                                text={t('labels.change24hTooltip')}
                                                className="text-gray-500"
                                            />
                                        </div>
                                    </div>
                                    {pinnedCoins.length > 1 && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removePinnedCoin(coin.symbol);
                                            }}
                                            className="text-gray-600 hover:text-red-400"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error Alert */}
                {watchlistError && (
                    <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 sharp-corners flex items-center gap-3">
                        <AlertCircle size={16} className="text-red-400" />
                        <span className="text-sm text-red-300">{watchlistError}</span>
                        <button onClick={() => setWatchlistError(null)} className="ml-auto text-gray-400 hover:text-white">
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT: Chart Area */}
                    <div className="lg:col-span-9 flex flex-col gap-4">
                        {/* Selected Coin Header */}
                        <div className="flex justify-between items-center bg-[#03050a] border border-gray-800 p-4 sharp-corners">
                            <div className="flex items-center gap-4">
                                <img
                                    src={selectedLogo || getLogoUrl(selectedCoin)}
                                    alt={selectedCoin}
                                    className="w-10 h-10 rounded-full"
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                                <div>
                                    <h2 className="text-xl font-light text-white">{getDisplaySymbol(selectedCoin)}</h2>
                                    <div className="text-[10px] text-gray-500 font-mono-custom">
                                        <Tooltip
                                            label={t('labels.perpetual')}
                                            text={t('labels.perpetualTooltip')}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => isInWatchlist(selectedCoin) ? removeFromWatchlist(selectedCoin) : addToWatchlist(selectedCoin)}
                                className={`flex items-center gap-2 px-4 py-2 border sharp-corners text-xs font-bold uppercase transition-colors ${isInWatchlist(selectedCoin)
                                    ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10'
                                    : 'border-gray-700 text-gray-400 hover:border-yellow-500 hover:text-yellow-500'
                                    }`}
                            >
                                <Star size={14} fill={isInWatchlist(selectedCoin) ? 'currentColor' : 'none'} />
                                {isInWatchlist(selectedCoin) ? t('watchlist.inWatchlist') : t('watchlist.add')}
                            </button>
                        </div>

                        {/* Chart */}
                        <div className="h-[400px] md:h-[500px] bg-[#03050a] border border-gray-800 sharp-corners">
                            <PriceChart symbol={selectedCoin} mode="candlestick" />
                        </div>
                    </div>

                    {/* RIGHT: Watchlist */}
                    <div className="lg:col-span-3">
                        <div className="bg-[#03050a] border border-gray-800 p-4 sharp-corners h-full">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-gray-400 text-xs font-mono-custom uppercase">
                                    <Star size={14} className="text-yellow-500" />
                                    <span>{t('watchlist.title')}</span>
                                </div>
                                <span className="text-[10px] text-gray-600 font-mono-custom">
                                    {watchlist.length}/{watchlistLimit.limit}
                                </span>
                            </div>

                            {/* Limit progress bar */}
                            <div className="h-1 bg-gray-800 sharp-corners mb-4 overflow-hidden">
                                <div
                                    className={`h-full transition-all ${watchlist.length >= watchlistLimit.limit ? 'bg-red-500' : 'bg-blue-500'}`}
                                    style={{ width: `${(watchlist.length / watchlistLimit.limit) * 100}%` }}
                                />
                            </div>

                            {watchlistLoading ? (
                                <div className="text-center text-gray-500 text-xs py-4">{t('watchlist.loading')}</div>
                            ) : watchlist.length === 0 ? (
                                <div className="text-center text-gray-500 text-xs py-4">
                                    {t('watchlist.empty')}
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                                    {watchlist.map((item, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleCoinSelect(item.symbol)}
                                            className="bg-[#080b14] border border-gray-800 p-3 sharp-corners flex items-center justify-between cursor-pointer hover:border-gray-700 transition-colors group"
                                        >
                                            <div className="flex items-center gap-3">
                                                {item.logoUrl ? (
                                                    <img src={item.logoUrl} alt={item.symbol} className="w-6 h-6 rounded-full" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-blue-900/30 flex items-center justify-center text-[10px] font-bold text-blue-400">
                                                        {item.symbol?.substring(0, 2)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="text-xs font-bold text-white">{item.symbol}</div>
                                                    <div className="text-[9px] text-gray-500">{item.name}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeFromWatchlist(item.symbol);
                                                }}
                                                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Upgrade prompt */}
                            {watchlist.length >= watchlistLimit.limit && watchlistLimit.limit === 3 && (
                                <div className="mt-4 p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 sharp-corners">
                                    <div className="text-[10px] text-blue-300 font-bold mb-1">{t('watchlist.upgradeTitle')}</div>
                                    <div className="text-[9px] text-gray-400">{t('watchlist.upgrade')}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </div>
    );
};

export default Coins;
