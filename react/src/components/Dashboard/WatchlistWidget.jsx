import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, X } from 'lucide-react';
import { coinService } from '../../services/coin.service';
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

const WatchlistWidget = (props) => {
    const { t } = useTranslation('coins');
    const [watchlist, setWatchlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchWatchlist = async () => {
        try {
            const data = await coinService.getWatchlist();
            setWatchlist(data);
        } catch (err) {
            console.error("Failed to fetch watchlist:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    const handleRemove = async (symbol) => {
        try {
            await coinService.removeFromWatchlist(symbol);
            setWatchlist(prev => prev.filter(c => c.symbol !== symbol));
        } catch (err) {
            console.error("Failed to remove coin:", err);
        }
    };

    if (loading) return null;

    if (watchlist.length === 0) return (
        <div className="bg-[#03050a] border border-gray-800 p-4 sharp-corners mb-6">
            <div className="text-center text-xs text-gray-500 py-2">
                {t('watchlist.empty')}
            </div>
        </div>
    );

    return (
        <div className="bg-[#03050a] border border-gray-800 p-4 sharp-corners h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs font-mono-custom uppercase tracking-wider">
                    <Star size={14} className="text-yellow-500" />
                    <LabelWithTooltip
                        label={t('watchlist.title')}
                        tooltip={t('watchlist.tooltip')}
                    />
                </div>
                <button
                    onClick={() => navigate('/hub/coins')}
                    className="text-[10px] px-2 py-1 border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors sharp-corners uppercase font-mono-custom"
                >
                    {t('watchlist.explore')}
                </button>
            </div>

            <div className={`overflow-y-auto pr-1 ${props.compact ? 'flex flex-col gap-2' : 'grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3'}`}>
                {watchlist.map((item, index) => (
                    <div key={index} className={`bg-[#080b14] border border-gray-800 p-2 sharp-corners flex items-center relative group ${props.compact ? 'justify-between px-3' : 'flex-col justify-center'}`}>
                        <button
                            onClick={() => handleRemove(item.symbol)}
                            className="absolute top-1 right-1 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                            <X size={12} />
                        </button>

                        <div className={`flex items-center gap-3 ${props.compact ? '' : 'flex-col mb-2'}`}>
                            {item.logoUrl ? (
                                <img src={item.logoUrl} alt={item.symbol} className="w-6 h-6 rounded-full" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-blue-900/20 flex items-center justify-center text-[10px] font-bold">
                                    {item.symbol.substring(0, 2)}
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{item.symbol}</span>
                                {props.compact && <span className="text-[9px] text-gray-500">{item.name}</span>}
                            </div>
                        </div>

                        {!props.compact && <span className="text-[10px] text-gray-500 truncate max-w-full text-center">{item.name}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WatchlistWidget;
