
import { authFetch } from './authService';
import { API_BASE_URL } from './apiConfig';

// Mock User Data for Development
let mockNotifications = [
    { id: 1, title: 'Price Alert: BTC', message: 'Bitcoin crossed $45,000 zone.', time: '2024-01-28T10:30:00Z', read: false, type: 'price' },
    { id: 2, title: 'New Signal', message: 'New LONG signal detected for ETH/USDT.', time: '2024-01-28T09:15:00Z', read: false, type: 'signal' },
    { id: 3, title: 'Anomaly Detected', message: 'Unusual volume spike in SOL-USD.', time: '2024-01-28T08:00:00Z', read: true, type: 'anomaly' },
    { id: 4, title: 'System Update', message: 'Platform maintenance scheduled for tomorrow.', time: '2024-01-27T14:00:00Z', read: true, type: 'system' }
];

let mockWatchlist = [
    { symbol: 'BTC-USD', price: 43250.50, change: 2.4 },
    { symbol: 'ETH-USD', price: 2280.12, change: -1.2 },
    { symbol: 'SOL-USD', price: 98.45, change: 5.6 }
];

export const userService = {
    // Simulate Profile Update
    updateProfile: async (userData) => {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true, user: userData };
    },

    // Get Notifications
    getNotifications: async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
        return mockNotifications;
    },

    // Mark as Read
    markAsRead: async (id) => {
        mockNotifications = mockNotifications.map(n => n.id === id ? { ...n, read: true } : n);
        return true;
    },

    // Get Watchlist
    getWatchlist: async () => {
        await new Promise(resolve => setTimeout(resolve, 600));
        return mockWatchlist;
    },

    // Add to Watchlist
    addToWatchlist: async (coin) => { // coin: { symbol, price, change }
        await new Promise(resolve => setTimeout(resolve, 500));
        if (!mockWatchlist.find(w => w.symbol === coin.symbol)) {
            mockWatchlist.push(coin);
        }
        return mockWatchlist;
    },

    // Remove from Watchlist
    removeFromWatchlist: async (symbol) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        mockWatchlist = mockWatchlist.filter(w => w.symbol !== symbol);
        return mockWatchlist;
    },

    // Persist user language preference server-side
    updateLanguagePreference: async (language) => {
        const response = await authFetch(`${API_BASE_URL}/api/Auth/language`, {
            method: 'PATCH',
            body: JSON.stringify({ preferredLanguage: language })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload?.message || 'Failed to update language preference');
        }

        return payload;
    },

    // Apply for Beta Access
    applyForBeta: async (email) => {
        const response = await authFetch(`${API_BASE_URL}/api/Auth/beta`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload?.message || 'Failed to submit beta application');
        }

        return payload;
    }
};
