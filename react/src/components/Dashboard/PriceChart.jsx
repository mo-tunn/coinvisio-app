import React, { useEffect, useState, useMemo } from 'react';
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Activity } from 'lucide-react';
import { coinService } from '../../services/coin.service';
import { useTranslation } from 'react-i18next';

const toFiniteNumber = (...values) => {
    for (const value of values) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
};

const TIME_FILTERS = ['1H', '7D', '30D', 'ALL'];
const TIME_RANGES_MS = {
    '1H': 60 * 60 * 1000,
    '7D': 7 * 24 * 60 * 60 * 1000,
    '30D': 30 * 24 * 60 * 60 * 1000,
    'ALL': null
};

// --- ROBUST CANDLE SHAPE USING FULL [LOW, HIGH] RANGE ---
const RobustCandleShape = (props) => {
    const {
        x, y, width, height, // These are calculated by Recharts for the full [low, high] range
        payload
    } = props;

    if (!payload) return null;

    const { open, close, high, low } = payload;
    if (![open, close, high, low].every(Number.isFinite)) return null;

    const isRising = close >= open;
    const color = isRising ? '#00ff9d' : '#ff0055';

    const range = high - low;
    const topPrice = Math.max(open, close);
    const bottomPrice = Math.min(open, close);

    let bodyTop = y;
    let bodyBottom = y + height;

    if (range > 0) {
        bodyTop = y + ((high - topPrice) / range) * height;
        bodyBottom = y + ((high - bottomPrice) / range) * height;
    } else {
        const center = y + height / 2;
        bodyTop = center - 1;
        bodyBottom = center + 1;
    }

    let bodyHeight = Math.max(0, bodyBottom - bodyTop);
    if (bodyHeight < 2) {
        const center = (bodyTop + bodyBottom) / 2;
        bodyTop = center - 1;
        bodyHeight = 2;
    }

    const wickX = x + width / 2;
    const bodyWidth = Math.max(3, Math.min(width * 0.72, 14));
    const bodyX = x + (width - bodyWidth) / 2;

    return (
        <g>
            {/* Wick */}
            <line
                x1={wickX}
                y1={y}
                x2={wickX}
                y2={y + height}
                stroke={color}
                strokeWidth={1.2}
            />
            {/* Body */}
            <rect
                x={bodyX}
                y={bodyTop}
                width={bodyWidth}
                height={bodyHeight}
                fill={color}
                stroke={color}
                strokeWidth={1}
            />
        </g>
    );
};

const CustomTooltip = ({ active, payload }) => {
    const { t } = useTranslation('coins');
    if (active && payload && payload.length) {
        const item = payload.find(p => p.dataKey === 'volume' || p.name === 'Price');
        const data = item ? item.payload : payload[0].payload;

        return (
            <div className="bg-[#0b0f19] border border-gray-700 p-4 sharp-corners shadow-2xl z-50 min-w-[180px]">
                <p className="text-gray-400 text-[10px] mb-3 font-mono-custom border-b border-gray-800 pb-2 flex justify-between">
                    <span>{data.fullDate || data.dateLabel}</span>
                </p>
                <div className="flex flex-col gap-1 text-xs font-mono-custom">
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('chart.open')}</span>
                        <span className="text-white">${data.open?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('chart.high')}</span>
                        <span className="text-white">${data.high?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">{t('chart.low')}</span>
                        <span className="text-white">${data.low?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between pt-1 mt-1 border-t border-gray-800/50">
                        <span className="text-gray-500">{t('chart.close')}</span>
                        <span style={{ color: data.close >= data.open ? '#00ff9d' : '#ff0055' }} className="font-bold">
                            ${data.close?.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between pt-1 mt-1 border-t border-gray-800">
                        <span className="text-gray-500">{t('chart.volume')}</span>
                        <span className="text-blue-400">{data.volume?.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const PriceChart = ({ symbol = 'BTC/USDT', mode = 'candlestick' }) => {
    const { t } = useTranslation('coins');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [livePrice, setLivePrice] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [timeFilter, setTimeFilter] = useState('7D');
    const isCandlestick = mode === 'candlestick';
    const displaySymbol = symbol
        ?.replace('/USDT', '')
        ?.replace('USDT', '')
        ?.replace('-USD', '')
        ?.replace('/', '');

    const formatAxisLabel = (ts, filter) => {
        const d = new Date(ts);
        if (filter === '1H') {
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        if (filter === '7D') {
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        if (filter === '30D' || filter === 'ALL') {
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Fetch historical data from DB
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                let history = [];
                if (timeFilter === '1H') {
                    history = await coinService.getIntraday(symbol, 60, 2);
                    if (!history || history.length === 0) {
                        const live = await coinService.getLivePrice(symbol);
                        if (live && live.price !== undefined && live.price !== null) {
                            const now = new Date();
                            history = [{
                                time: now.toISOString(),
                                open: live.price,
                                high: live.price,
                                low: live.price,
                                close: live.price,
                                volume: 0
                            }];
                        } else {
                            const fallbackHistory = await coinService.getHistory(symbol, 50);
                            history = Array.isArray(fallbackHistory) ? fallbackHistory : [];
                        }
                    }
                } else {
                    history = await coinService.getHistory(symbol);
                }

                if (!history || history.length === 0) {
                    setData([]);
                    return;
                }

                const rowsWithTime = history
                    .map((item) => {
                        const rawTime = item.time || item.recordedAt || item.recorded_at;
                        const ts = rawTime ? new Date(rawTime).getTime() : NaN;
                        if (Number.isNaN(ts)) return null;
                        return {
                            ...item,
                            timestamp: ts,
                            fullDate: new Date(ts).toLocaleString()
                        };
                    })
                    .filter(Boolean)
                    .sort((a, b) => a.timestamp - b.timestamp);

                const normalized = rowsWithTime.reduce((acc, item) => {
                    const prevClose = acc.length > 0 ? acc[acc.length - 1].close : null;
                    const close = toFiniteNumber(item.close, item.price, item.open, item.high, item.low, prevClose);
                    if (close === null) return acc;

                    const open = toFiniteNumber(item.open, prevClose, close);
                    if (open === null) return acc;

                    const highBase = Math.max(open, close);
                    const lowBase = Math.min(open, close);
                    const highCandidate = toFiniteNumber(item.high, highBase);
                    const lowCandidate = toFiniteNumber(item.low, lowBase);
                    const high = Math.max(highCandidate ?? highBase, highBase);
                    const low = Math.min(lowCandidate ?? lowBase, lowBase);
                    const volume = Math.max(0, toFiniteNumber(item.volume, 0) ?? 0);

                    acc.push({
                        ...item,
                        open,
                        high,
                        low,
                        close,
                        volume,
                        wickRange: [low, high]
                    });
                    return acc;
                }, []);

                setData(normalized);
            } catch (err) {
                console.error("Chart data fetch failed", err);
                if (timeFilter === '1H') {
                    try {
                        const live = await coinService.getLivePrice(symbol);
                        if (live && live.price !== undefined && live.price !== null) {
                            const now = new Date();
                            setData([{
                                time: now.toISOString(),
                                open: live.price,
                                high: live.price,
                                low: live.price,
                                close: live.price,
                                volume: 0,
                                timestamp: now.getTime(),
                                fullDate: now.toLocaleString(),
                                wickRange: [live.price, live.price]
                            }]);
                        }
                    } catch (liveErr) {
                        console.error("1H live fallback failed", liveErr);
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [symbol, timeFilter]);

    // Fetch live price with auto-refresh every 30 seconds
    useEffect(() => {
        const fetchLivePrice = async () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            try {
                const live = await coinService.getLivePrice(symbol);
                if (live && live.price) {
                    setLivePrice(live);
                    setLastUpdate(new Date());
                }
            } catch (err) {
                console.error("Live price fetch failed", err);
            }
        };

        fetchLivePrice();
        const interval = setInterval(fetchLivePrice, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, [symbol]);

    const filteredData = useMemo(() => {
        if (data.length === 0) return [];
        const rangeMs = TIME_RANGES_MS[timeFilter];
        let base = data;
        if (rangeMs) {
            const latest = data[data.length - 1].timestamp;
            const cutoff = latest - rangeMs;
            base = data.filter(d => d.timestamp >= cutoff);
            if (base.length === 0) {
                base = data.slice(-Math.min(data.length, 200));
            }
        }
        return base.map(d => ({
            ...d,
            dateLabel: formatAxisLabel(d.timestamp, timeFilter)
        }));
    }, [data, timeFilter]);

    const yDomain = useMemo(() => {
        if (filteredData.length === 0) return ['auto', 'auto'];
        let min = Infinity;
        let max = -Infinity;
        filteredData.forEach((d) => {
            if (Number.isFinite(d.low) && d.low < min) min = d.low;
            if (Number.isFinite(d.high) && d.high > max) max = d.high;
        });
        if (!Number.isFinite(min) || !Number.isFinite(max)) {
            return ['auto', 'auto'];
        }
        let padding = (max - min) * 0.1;
        if (padding === 0) {
            padding = Math.max(1, max * 0.001);
        }
        return [min - padding, max + padding];
    }, [filteredData]);

    const candleBarSize = useMemo(() => {
        if (filteredData.length > 320) return 2;
        if (filteredData.length > 200) return 3;
        if (filteredData.length > 120) return 4;
        if (filteredData.length > 60) return 6;
        return 8;
    }, [filteredData.length]);

    const volumeBarSize = useMemo(() => {
        return Math.max(2, Math.floor(candleBarSize * 0.5));
    }, [candleBarSize]);

    if (loading) return (
        <div className="bg-[#03050a] border border-gray-800 p-1 sharp-corners h-full min-h-[400px] flex flex-col justify-center items-center">
            <Activity className="animate-spin text-blue-500 mb-2" />
            <span className="text-xs text-gray-500 font-mono-custom">{t('chart.loading')}</span>
        </div>
    );

    const currentPrice = livePrice?.price || (filteredData.length > 0 ? filteredData[filteredData.length - 1].close : 0);
    const priceChange = livePrice?.change24h || 0;
    const isPositive = priceChange >= 0;

    return (
        <div className="bg-[#03050a] border border-gray-800 p-1 sharp-corners h-full flex flex-col relative group">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#010205]">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-white">{displaySymbol || symbol}</span>
                        <div className="flex gap-2">
                            <span className="text-[10px] text-gray-500 font-mono-custom uppercase">1H Interval</span>
                            <span className="text-[10px] text-blue-400 font-mono-custom uppercase border-l border-gray-800 pl-2">{isCandlestick ? t('chart.candlestick') : t('chart.chart')}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className={`text-lg font-mono-custom font-bold ${isPositive ? 'text-[#00ff9d]' : 'text-[#ff0055]'}`}>
                            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {livePrice && (
                            <span className={`text-xs font-mono-custom ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                {isPositive ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        {TIME_FILTERS.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setTimeFilter(filter)}
                                className={`px-2 py-1 text-[9px] font-mono-custom uppercase sharp-corners border transition-colors ${
                                    timeFilter === filter
                                        ? 'border-blue-500 text-blue-400 bg-blue-900/20'
                                        : 'border-gray-800 text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                    {lastUpdate && (
                        <span className="text-[9px] text-gray-600 font-mono-custom">
                            {t('chart.updated')}: {lastUpdate.toLocaleTimeString()}
                        </span>
                    )}
                    <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 border border-green-500/20 sharp-corners">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[10px] text-green-500 font-mono-custom">{t('chart.live')}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-[300px] p-2">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData} barGap={0} barCategoryGap="10%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} opacity={0.5} />
                        <XAxis
                            xAxisId="price"
                            dataKey="dateLabel"
                            stroke="#666"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <XAxis xAxisId="volume" dataKey="dateLabel" hide />

                        {/* Price Axis */}
                        <YAxis yAxisId="price" domain={yDomain} stroke="#666" fontSize={10} tickLine={false} axisLine={false} orientation="right" tickFormatter={val => `$${val.toLocaleString()}`} />

                        {/* Volume Axis (Hidden) */}
                        <YAxis yAxisId="volume" domain={['0', 'dataMax * 3']} orientation="left" hide />

                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255, 255, 255, 0.5)', strokeWidth: 1, strokeDasharray: '4 4' }} isAnimationActive={false} />

                        {/* Volume - Blue and Transparent */}
                        <Bar
                            xAxisId="volume"
                            yAxisId="volume"
                            dataKey="volume"
                            fill="#3b82f6"
                            opacity={0.15}
                            barSize={volumeBarSize}
                            isAnimationActive={false}
                        />

                        {/* Price Candles - full wick range with custom body rendering */}
                        {isCandlestick && (
                            <Bar
                                xAxisId="price"
                                yAxisId="price"
                                name="Price"
                                dataKey="wickRange"
                                shape={<RobustCandleShape />}
                                barSize={candleBarSize}
                                isAnimationActive={false}
                            />
                        )}

                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default PriceChart;
