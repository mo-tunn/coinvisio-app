import { authFetch } from './authService';
import { API_BASE_URL } from './apiConfig';

const baseURL = API_BASE_URL;

export const insightService = {
    /**
     * Fetches the latest daily insight.
     * @returns {Promise<Object>} Insight data.
     */
    getDailyInsight: async () => {
        const response = await authFetch(`${baseURL}/api/Insight/getdailyinsights`);
        if (!response.ok) {
            throw new Error(`Failed to fetch daily insight (${response.status})`);
        }
        return response.json();
    },

    /**
     * Fetches the current market regime.
     * @returns {Promise<Object>} Market regime data.
     */
    getMarketRegime: async () => {
        const response = await authFetch(`${baseURL}/api/Insight/getmarketregime`);
        if (!response.ok) {
            throw new Error(`Failed to fetch market regime (${response.status})`);
        }
        return response.json();
    }
};
