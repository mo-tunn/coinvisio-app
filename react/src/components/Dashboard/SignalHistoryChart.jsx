import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceDot
} from 'recharts';
import { TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SignalHistoryChart = ({ symbol, history, onFilterChange, currentFilter }) => {
    const { t, i18n } = useTranslation('signals');
    const localeTag = i18n.language === 'tr' ? 'tr-TR' : 'en-US';
    // Process data for display if available
    // Safely handle null/undefined history
    const safeHistory = Array.isArray(history) ? history : [];

    // Safety check for invalid dates/entries
    const data = safeHistory
        .map(item => {
            // Strict null checks
            if (!item || item.entry == null || !item.time) return null;

            const d = new Date(item.time);
            if (isNaN(d.getTime())) return null; // Invalid date check

            let timeStr;
            if (currentFilter === '24H') {
                timeStr = d.toLocaleTimeString(localeTag, { hour12: false, hour: '2-digit', minute: '2-digit' });
            } else {
                timeStr = d.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' });
            }

            return {
                ...item,
                displayTime: timeStr,
                fullTime: d.toLocaleString(),
                formattedEntry: Number(item.entry),
                safeConfidence: Number(item.confidence) || 0
            };
        })
        .filter(Boolean); // Remove nulls

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload;
            const typeLabel = dataPoint.type === 'LONG' ? t('bullish') : t('bearish');
            return (
                <div className="bg-[#03050a] border border-gray-800 p-3 sharp-corners shadow-xl z-50">
                    <p className="text-gray-400 text-[10px] mb-1 font-mono-custom">{dataPoint.displayTime}</p>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${dataPoint.type === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                            {typeLabel}
                        </span>
                        <span className="text-white font-mono-custom">${dataPoint.formattedEntry}</span>
                    </div>
                    <div className="text-[10px] text-blue-400">{t('history.confidence')}: {(dataPoint.safeConfidence * 100).toFixed(0)}%</div>
                </div>
            );
        }
        return null;
    };

    // Calculate Average Confidence safely using validated data
    const avgConfidence = data.length > 0
        ? (data.reduce((sum, item) => sum + item.safeConfidence, 0) / data.length * 100).toFixed(1)
        : 0;

    return (
        <div className="h-full bg-[#03050a] border border-gray-800 p-6 sharp-corners flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-white text-lg font-light flex items-center gap-2">
                        {t('history.title')} <span className="text-gray-500">| {symbol}</span>
                    </h3>

                    {/* Filter Buttons */}
                    <div className="flex gap-1 mt-2">
                        {['24H', '7D', '30D', 'ALL'].map(f => (
                            <button
                                key={f}
                                onClick={() => onFilterChange && onFilterChange(f)}
                                className={`text-[9px] px-2 py-1 sharp-corners border transition-all ${currentFilter === f
                                    ? 'bg-blue-900/20 text-blue-400 border-blue-500/50'
                                    : 'text-gray-500 border-gray-800 hover:text-gray-300'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex gap-4 text-xs font-mono-custom">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-gray-400">{t('bullish')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-gray-400">{t('bearish')}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 w-full min-h-0 relative">
                {(data.length === 0) ? (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 font-mono-custom text-xs">
                        {t('history.empty')}
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                            data={data}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorEntry" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis
                                dataKey="displayTime"
                                stroke="#4b5563"
                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                tickLine={false}
                                axisLine={false}
                                interval={Math.ceil(data.length / 6)}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                stroke="#4b5563"
                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                tickLine={false}
                                axisLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="formattedEntry"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorEntry)"
                            />
                            {/* Add Dots for Signals - Safe to re-enable with validation */}
                            {data.map((entry, index) => (
                                <ReferenceDot
                                    key={`dot-${index}`}
                                    x={entry.displayTime}
                                    y={entry.formattedEntry}
                                    r={4}
                                    fill={entry.type === 'LONG' ? '#22c55e' : '#ef4444'}
                                    stroke="#03050a"
                                    strokeWidth={2}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {data.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4">
                    <div className="p-3 bg-[#080b14] sharp-corners border border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">{t('history.total')}</div>
                        <div className="text-xl font-bold text-white">{data.length}</div>
                    </div>
                    <div className="p-3 bg-[#080b14] sharp-corners border border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">{t('history.avgConfidence')}</div>
                        <div className="text-xl font-bold text-blue-400">
                            {avgConfidence}%
                        </div>
                    </div>
                    <div className="p-3 bg-[#080b14] sharp-corners border border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider">{t('history.latestAction')}</div>
                        <div className={`text-xl font-bold ${data[0]?.type === 'LONG' ? 'text-green-500' : 'text-red-500'}`}>
                            {data[0]?.type === 'LONG' ? t('bullish') : t('bearish')}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SignalHistoryChart;
