import { authFetch } from './authService';
import { API_BASE_URL } from './apiConfig';

export const notificationService = {
    /**
     * Fetches user notifications with pagination.
     * @param {number} limit 
     * @param {string|null} cursor 
     * @returns {Promise<Object>} { data: [], nextCursor: string|null }
     */
    getNotifications: async (limit = 20, cursor = null) => {
        try {
            const params = new URLSearchParams();
            params.append('limit', limit);
            if (cursor) {
                params.append('cursor', cursor);
            }
            const response = await authFetch(`${API_BASE_URL}/api/Notification?${params}`);
            if (!response.ok) return { data: [], nextCursor: null };
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
            return { data: [], nextCursor: null };
        }
    },

    /**
     * Fetches the unread notification count.
     * @returns {Promise<number>}
     */
    getUnreadCount: async () => {
        try {
            const response = await authFetch(`${API_BASE_URL}/api/Notification/unread-count`);
            if (!response.ok) return 0;
            const data = await response.json();
            return data.count || 0;
        } catch (error) {
            console.error('Failed to fetch unread count:', error);
            return 0;
        }
    },

    /**
     * Marks notifications as read.
     * @param {string[]} ids 
     * @returns {Promise<void>}
     */
    markAsRead: async (ids) => {
        if (!ids || ids.length === 0) return;
        try {
            await authFetch(`${API_BASE_URL}/api/Notification/mark-read`, {
                method: 'POST',
                body: JSON.stringify({ notificationIds: ids })
            });
        } catch (error) {
            console.error('Failed to mark as read:', error);
        }
    },

    /**
     * Marks all notifications as read.
     * @returns {Promise<void>}
     */
    markAllAsRead: async () => {
        try {
            await authFetch(`${API_BASE_URL}/api/Notification/mark-read`, {
                method: 'POST',
                body: JSON.stringify({ all: true })
            });
        } catch (error) {
            console.error('Failed to mark all as read:', error);
        }
    },

    /**
     * Fetches user notification preferences.
     * @returns {Promise<Array>}
     */
    getPreferences: async () => {
        try {
            const response = await authFetch(`${API_BASE_URL}/api/Notification/preferences`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch preferences:', error);
            return [];
        }
    },

    /**
     * Updates user notification preferences.
     * @param {Array} preferences - Array of preference objects
     * @returns {Promise<void>}
     */
    updatePreferences: async (preferences) => {
        try {
            await authFetch(`${API_BASE_URL}/api/Notification/preferences`, {
                method: 'POST',
                body: JSON.stringify(preferences)
            });
        } catch (error) {
            console.error('Failed to update preferences:', error);
            throw error;
        }
    }
};
