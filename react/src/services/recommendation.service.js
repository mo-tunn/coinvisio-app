import { authFetch } from './authService';
import { API_BASE_URL } from './apiConfig';

// Helper to map backend signal format to frontend expectation
const mapSignal = (s) => ({
    id: s.id,
    symbol: s.symbol,
    type: s.signalType ?? s.type,
    term: s.term,
    entry: s.entryPrice ?? s.entry ?? s.entry_price,
    target: s.targetPrice ?? s.target ?? s.target_price,
    stop: s.stopLoss ?? s.stop ?? s.stop_loss,
    confidence: s.confidenceScore ?? s.confidence ?? s.confidence_score,
    time: s.createdAt ?? s.timestamp ?? s.detectedAt,
    logo: s.logoUrl ?? s.logo
});

export const recommendationService = {
    /**
     * Get Signals
     * @param {Object} since - Date object for since filter
     * @param {string} search - Search term for symbol
     */
    getSignals: async (since, search, page = 1, pageSize = 20) => {
        try {
            const params = new URLSearchParams();
            if (since) params.append('since', since.toISOString());
            if (search) params.append('search', search);
            params.append('page', page);
            params.append('pageSize', pageSize);

            const response = await authFetch(`${API_BASE_URL}/api/Recommendation/getsignals?${params}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data.map(mapSignal) : [];
        } catch (error) {
            console.error('Error fetching signals:', error);
            throw error;
        }
    },

    /**
     * Get Signal History
     * @param {string} symbol 
     * @param {Date} since 
     */
    getSignalHistory: async (symbol, since) => {
        if (!symbol) return [];
        try {
            const params = new URLSearchParams();
            params.append('symbol', symbol);
            if (since) params.append('since', since.toISOString());

            const response = await authFetch(`${API_BASE_URL}/api/Recommendation/getsignalhistory?${params}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return Array.isArray(data) ? data.map(mapSignal) : [];
        } catch (error) {
            console.error('Error fetching signal history:', error);
            throw error;
        }
    },

    /**
     * Get Coin Anomalies
     * @param {Date} since 
     */
    getAnomalies: async (since, limit = 20, offset = 0) => {
        try {
            const params = new URLSearchParams();
            if (since) params.append('since', since.toISOString());
            if (limit) params.append('limit', limit.toString());
            if (offset) params.append('offset', offset.toString());

            const response = await authFetch(`${API_BASE_URL}/api/Recommendation/getcoinanomalies?${params}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching anomalies:', error);
            throw error;
        }
    },

    /**
     * Get Recommendations
     * @param {string} riskProfile 
     * @param {Date} since 
     * @param {boolean} watchlist 
     * @param {Date} at
     */
    getRecommendations: async (riskProfile = 'Medium', since, watchlist = false, at = null) => {
        try {
            const params = new URLSearchParams();
            if (riskProfile) params.append('riskProfile', riskProfile);
            if (since) params.append('since', since.toISOString());
            if (at) params.append('at', at.toISOString());
            if (watchlist) params.append('watchlist', 'true');

            const response = await authFetch(`${API_BASE_URL}/api/Recommendation/getrecommendations?${params}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching recommendations:', error);
            throw error;
        }
    }
};
