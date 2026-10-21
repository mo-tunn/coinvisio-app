import { authFetch } from './authService';
import { API_BASE_URL } from './apiConfig';

const normalizeSymbol = (symbol) => {
    if (!symbol) return symbol;
    let value = symbol
        .replace('/USDT', '')
        .replace('USDT', '')
        .replace('/', '');
    if (value.endsWith('-USD')) return value;
    if (value.endsWith('USD') && !value.includes('-')) {
        return `${value.slice(0, -3)}-USD`;
    }
    if (value.includes('-')) return value;
    return `${value}-USD`;
};

export const coinService = {
    /**
     * Fetches popular coins with logos.
     * @returns {Promise<Array>} List of popular coins.
     */
    getPopular: async () => {
        try {
            const response = await authFetch(`${API_BASE_URL}/api/Coin/popular`);
            if (!response.ok) {
                console.error('Popular coins API error:', response.status);
                return [];
            }
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Failed to fetch popular coins:', error);
            return [];
        }
    },

    /**
     * Searches for coins by keyword.
     * @param {string} keyword 
     * @returns {Promise<Array>} List of search results (symbols).
     */
    search: async (keyword) => {
        if (!keyword || keyword.trim().length < 2) return [];
        try {
            const response = await authFetch(`${API_BASE_URL}/api/Coin/search?keyword=${encodeURIComponent(keyword)}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Failed to search coins:', error);
            return [];
        }
    },

    /**
     * Fetches historical data for a symbol from database.
     * @param {string} symbol 
     * @param {number} limit 
     * @returns {Promise<Array>} OHLCV data.
     */
    getHistory: async (symbol, limit = 500) => {
        try {
            // Clean symbol format (BTC/USDT -> BTCUSDT)
            const normalized = normalizeSymbol(symbol);
            const response = await authFetch(`${API_BASE_URL}/api/Coin/history/${normalized}?limit=${limit}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Failed to fetch coin history:', error);
            return [];
        }
    },

    /**
     * Fetches coin metadata (name/logo) by symbol list.
     * @param {string[]} symbols
     * @returns {Promise<Array>} List of coin metadata.
     */
    getMeta: async (symbols = []) => {
        if (!Array.isArray(symbols) || symbols.length === 0) return [];
        try {
            const params = new URLSearchParams();
            params.append('symbols', symbols.join(','));
            const response = await authFetch(`${API_BASE_URL}/api/Coin/meta?${params}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Failed to fetch coin metadata:', error);
            return [];
        }
    },

    /**
     * Fetches live quotes (price + 24h change) for a symbol list.
     * @param {string[]} symbols
     * @returns {Promise<Array>} Quote list.
     */
    getQuotes: async (symbols = []) => {
        if (!Array.isArray(symbols) || symbols.length === 0) return [];
        try {
            const params = new URLSearchParams();
            params.append('symbols', symbols.join(','));
            const response = await authFetch(`${API_BASE_URL}/api/Coin/quotes?${params}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Failed to fetch coin quotes:', error);
            return [];
        }
    },

    /**
     * Fetches intraday OHLC data for 1H view.
     * @param {string} symbol
     * @param {number} minutes
     * @param {number} bucket
     */
    getIntraday: async (symbol, minutes = 60, bucket = 5) => {
        try {
            const normalized = normalizeSymbol(symbol);
            const params = new URLSearchParams();
            params.append('minutes', String(minutes));
            params.append('bucket', String(bucket));
            const response = await authFetch(`${API_BASE_URL}/api/Coin/intraday/${normalized}?${params}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Failed to fetch intraday data:', error);
            return [];
        }
    },

    /**
     * Fetches the user's watchlist.
     * @returns {Promise<Object>} Watchlist data with items, count, and limit.
     */
    getWatchlist: async () => {
        try {
            const response = await authFetch(`${API_BASE_URL}/api/Coin/mywatchlist`);
            if (!response.ok) return [];
            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Failed to fetch watchlist:', error);
            return [];
        }
    },

    /**
     * Adds a coin to the watchlist.
     * @param {string} symbol 
     * @returns {Promise<Object>} Result with currentCount and limit.
     */
    addToWatchlist: async (symbol) => {
        try {
            const normalized = normalizeSymbol(symbol);
            const response = await authFetch(`${API_BASE_URL}/api/Coin/mywatchlist/add?symbol=${normalized}`, {
                method: 'POST'
            });
            const data = await response.json();
            if (!response.ok) {
                throw data;
            }
            return data;
        } catch (error) {
            console.error('Failed to add to watchlist:', error);
            throw error;
        }
    },

    /**
     * Removes a coin from the watchlist.
     * @param {string} symbol 
     */
    removeFromWatchlist: async (symbol) => {
        try {
            const normalized = normalizeSymbol(symbol);
            const response = await authFetch(`${API_BASE_URL}/api/Coin/mywatchlist/remove?symbol=${normalized}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                throw new Error('Failed to remove from watchlist');
            }
        } catch (error) {
            console.error('Failed to remove from watchlist:', error);
            throw error;
        }
    },

    /**
     * Fetches live price from CoinGecko API.
     * @param {string} symbol 
     * @returns {Promise<Object>} Live price data with price, change24h, volume24h.
     */
    getLivePrice: async (symbol) => {
        try {
            const cleanSymbol = symbol
                .replace('/USDT', '')
                .replace('USDT', '')
                .replace('-USD', '')
                .replace('/', '');
            const response = await authFetch(`${API_BASE_URL}/api/Coin/live/${cleanSymbol}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to fetch live price:', error);
            return null;
        }
    }
};
