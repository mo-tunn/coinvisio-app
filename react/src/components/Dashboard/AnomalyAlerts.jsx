import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Scan, AlertTriangle } from 'lucide-react';
import { recommendationService } from '../../services/recommendation.service';
import { useTranslation } from 'react-i18next';

const LabelWithTooltip = ({ label, tooltip }) => (
    <span className="relative group/tooltip inline-flex items-center gap-1 cursor-help">
        <span className="border-b border-dotted border-red-500/50 group-hover/tooltip:text-red-300 group-hover/tooltip:border-red-400 transition-colors">
            {label}
        </span>
        <span className="absolute bottom-full left-0 sm:left-1/2 sm:-translate-x-1/2 mb-2 w-52 max-w-[70vw] opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-[400]">
            <span className="bg-[#120508] border border-red-700/40 p-2 sharp-corners shadow-xl text-[10px] text-red-200 leading-tight text-center block whitespace-normal">
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

const AnomalyAlerts = () => {
    const { t } = useTranslation('anomalies');
    const [alerts, setAlerts] = useState([]);
    const navigate = useNavigate();
    const formatValue = (value) => {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '--';
        return Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 });
    };

    useEffect(() => {
        const fetchAnomalies = async () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            try {
                // Fetch latest anomalies (limit 3)
                const data = await recommendationService.getAnomalies(null, 3, 0);
                const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
                setAlerts(list.slice(0, 3));
            } catch (err) {
                console.error("Failed to fetch anomalies:", err);
            }
        };

        fetchAnomalies();

        // Polling fallback until real-time is implemented
        const interval = setInterval(fetchAnomalies, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#0f0505] border border-red-900/20 p-5 sharp-corners h-full min-h-[340px] flex flex-col relative">
            {/* Background Pulse Animation */}
            <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none"></div>

            <div className="flex justify-between items-center mb-4 relative z-10">
                <div className="flex items-center gap-2 text-red-400 text-xs font-mono-custom uppercase tracking-wider">
                    <Activity size={14} />
                    <LabelWithTooltip
                        label={t('alerts.title')}
                        tooltip={t('alerts.tooltip')}
                    />
                </div>
                <Scan size={16} className="text-red-500 animate-spin-slow" />
            </div>

            <div className="flex-1 space-y-2 relative z-10">
                {alerts.length === 0 ? (
                    <div className="text-center text-red-900/50 text-xs py-4">{t('alerts.scanning')}</div>
                ) : (
                    alerts.map(alert => {
                        const anomalyScore = alert.anomalyScore ?? alert.score ?? alert.anomaly_score;
                        const priceAtDetection = alert.priceAtDetection ?? alert.price ?? alert.price_at_detection;
                        const detectedAt = alert.detectedAt ?? alert.createdAt;

                        // Determine styling based on anomaly type
                        const type = alert.anomalyType || 'UNKNOWN';
                        let typeColor = 'text-gray-300 bg-gray-500/20 border-gray-500/30';
                        if (type.includes('PUMP') || type.includes('UP')) {
                            typeColor = 'text-green-300 bg-green-500/20 border-green-500/30';
                        } else if (type.includes('CRASH') || type.includes('DUMP') || type.includes('DOWN')) {
                            typeColor = 'text-red-300 bg-red-500/20 border-red-500/30';
                        }

                        return (
                            <div key={alert.id} className="bg-black/40 border border-red-900/30 p-2.5 sharp-corners flex items-start gap-3">
                                <div className="flex items-center gap-2">
                                    {alert.logo ? (
                                        <img src={alert.logo} alt={alert.symbol} className="w-8 h-8 rounded-full" />
                                    ) : (
                                        <div className={`w-8 h-8 flex items-center justify-center rounded-sm ${anomalyScore > 80 ? 'bg-red-500 text-white' : 'bg-red-500/20 text-red-500'}`}>
                                            <AlertTriangle size={16} />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-white">{alert.symbol}</span>
                                        <span className="text-[10px] text-gray-500 font-mono-custom">
                                            {timeAgo(detectedAt, t)}
                                        </span>
                                    </div>
                                    <div className="mb-2">
                                        <span className={`text-[10px] px-2 py-0.5 border sharp-corners font-bold ${typeColor}`}>
                                            {type.replace(/_/g, ' ')}
                                        </span>
                                    </div>

                                        <div className="flex items-center justify-between bg-black/40 p-1.5 sharp-corners border border-red-900/10">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] text-gray-500 uppercase font-bold">{t('alerts.score')}</span>
                                            <span className={`text-xs font-mono-custom font-bold ${anomalyScore > 80 ? 'text-red-400' : 'text-orange-400'}`}>
                                                {formatValue(anomalyScore)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[9px] text-gray-500 uppercase font-bold">{t('alerts.price')}</span>
                                            <span className="text-xs font-mono-custom text-white font-bold">
                                                ${formatValue(priceAtDetection)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

                            <button
                                onClick={() => navigate('/hub/anomalies')}
                                className="mt-4 w-full py-2 border border-red-500/30 text-red-300 text-xs font-mono-custom uppercase hover:bg-red-500/10 transition-colors sharp-corners"
                            >
                {t('alerts.viewAll')}
            </button>
        </div>
    );
};

export default AnomalyAlerts;
