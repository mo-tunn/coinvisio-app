import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notification.service';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [nextCursor, setNextCursor] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    // Polling interval ref to clear on unmount
    const pollIntervalRef = useRef(null);

    // Fetch unread count
    const fetchUnreadCount = useCallback(async () => {
        if (!isAuthenticated) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        try {
            const count = await notificationService.getUnreadCount();
            setUnreadCount(count);
        } catch (err) {
            console.error(err);
        }
    }, [isAuthenticated]);

    // Initial fetch of notifications
    const fetchNotifications = useCallback(async (reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            // If reset is true, we start from scratch (null cursor)
            const cursorToUse = reset ? null : nextCursor;

            // If not reset and no cursor and we already fetched something, maybe we found end?
            // But if reset is false and !nextCursor, unless it's the very first time (handled by hasMore), we stop.
            if (!reset && !nextCursor && notifications.length > 0) {
                setHasMore(false);
                setLoading(false);
                return;
            }

            const result = await notificationService.getNotifications(20, cursorToUse);

            if (reset) {
                setNotifications(result.data);
            } else {
                setNotifications(prev => [...prev, ...result.data]);
            }

            setNextCursor(result.nextCursor);
            setHasMore(!!result.nextCursor);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, loading, nextCursor, notifications.length]);

    // Mark as read
    const markAsRead = useCallback(async (ids) => {
        // Optimistic update
        setNotifications(prev => prev.map(n =>
            ids.includes(n.id) ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        ));

        // Decrement unread count locally
        setUnreadCount(prev => Math.max(0, prev - ids.length)); // Approximation, improved by next poll

        await notificationService.markAsRead(ids);
        fetchUnreadCount(); // Sync accurate count
    }, [fetchUnreadCount]);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
        setUnreadCount(0);

        await notificationService.markAllAsRead();
        fetchUnreadCount();
    }, [fetchUnreadCount]);

    // Setup polling for unread count
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (typeof document !== 'undefined' && !document.hidden && isAuthenticated) {
                fetchUnreadCount();
            }
        };

        if (isAuthenticated) {
            // Initial fetch
            fetchUnreadCount();

            // Poll every 60 seconds
            pollIntervalRef.current = setInterval(fetchUnreadCount, 60000);
            if (typeof document !== 'undefined') {
                document.addEventListener('visibilitychange', handleVisibilityChange);
            }
        } else {
            setUnreadCount(0);
            setNotifications([]);
            setNextCursor(null);
            setHasMore(true);
        }

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }
        };
    }, [isAuthenticated, fetchUnreadCount]);

    const value = {
        unreadCount,
        notifications,
        loading,
        hasMore,
        fetchNotifications, // For infinite scroll or manual refresh
        refreshNotifications: () => fetchNotifications(true), // Pull to refresh
        markAsRead,
        markAllAsRead,
        fetchUnreadCount // Expose if needed manually
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export default NotificationContext;
