import React, { useRef, useCallback } from 'react';
import { useNotification } from '../context';
import { Bell, Check, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr as trLocale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const NotificationItem = ({ notification, onRead }) => {
    const { t, i18n } = useTranslation('notifications');
    const {
        id,
        title,
        message,
        created_at,
        is_read,
        severity,
        notification_types,
        notification_type // PostgREST might return this instead of notification_types
    } = notification;

    // Support both naming conventions just in case
    const displayTitle = title || notification.notification_title || t('list.noTitle');
    const displayMessage = message || notification.notification_message || notification.body || t('list.noMessage');
    const typeCode = notification_types?.code || notification_type?.code || '';
    const dateLocale = i18n.language === 'tr' ? trLocale : undefined;

    // Icon Logic based on Type/Severity
    let Icon = Info;
    let iconColor = 'text-blue-400';
    let bgColor = 'bg-blue-400/10';

    if (severity === 'high') {
        iconColor = 'text-red-400';
        bgColor = 'bg-red-400/10';
        Icon = AlertTriangle;
    } else if (typeCode.includes('buy')) {
        iconColor = 'text-green-400';
        bgColor = 'bg-green-400/10';
        Icon = TrendingUp;
    } else if (typeCode.includes('sell')) {
        iconColor = 'text-red-400';
        bgColor = 'bg-red-400/10';
        Icon = TrendingDown;
    }

    return (
        <div
            className={`p-4 border-b border-gray-800 hover:bg-white/5 transition-colors cursor-pointer ${is_read ? 'opacity-60' : 'bg-blue-900/5'}`}
            onClick={() => !is_read && onRead(id)}
        >
            <div className="flex gap-4">
                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bgColor}`}>
                    <Icon size={16} className={iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2">
                        <h4 className={`text-sm font-medium truncate ${is_read ? 'text-gray-400' : 'text-white'}`}>
                            {displayTitle}
                        </h4>
                        <span className="text-[10px] text-gray-500 whitespace-nowrap shrink-0">
                            {created_at ? formatDistanceToNow(new Date(created_at), { addSuffix: true, locale: dateLocale }) : ''}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                        {displayMessage}
                    </p>
                    {/* Optional: Add payload details here if needed */}
                    {!is_read && (
                        <div className="mt-2 flex justify-end">
                            <span className="text-[10px] text-blue-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                                {t('list.new')}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const NotificationList = () => {
    const { t } = useTranslation('notifications');
    const { notifications, loading, hasMore, fetchNotifications, markAsRead, markAllAsRead, unreadCount } = useNotification();
    const observer = useRef();

    const lastElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchNotifications();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, hasMore, fetchNotifications]);

    // Initial fetch when list opens if empty
    React.useEffect(() => {
        if (notifications.length === 0 && hasMore && !loading) {
            fetchNotifications();
        }
    }, [notifications.length, hasMore, loading, fetchNotifications]);

    return (
        <div className="flex flex-col h-full bg-[#080b14] border border-gray-800 sharp-corners w-full max-w-sm sm:max-w-md shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#010205]">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-blue-400" />
                    <span className="text-sm font-bold text-white tracking-wider">{t('list.title')}</span>
                    {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono border border-blue-500/30">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1 uppercase font-bold transition-colors"
                    >
                        <Check size={12} />
                        {t('list.markAllRead')}
                    </button>
                )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto max-h-[400px] min-h-[300px]">
                {notifications.length === 0 && !loading ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                        <Bell size={32} className="mb-3 opacity-20" />
                        <p className="text-sm">{t('list.empty')}</p>
                    </div>
                ) : (
                    <>
                        {notifications.map((notif, index) => (
                            <div key={notif.id} ref={index === notifications.length - 1 ? lastElementRef : null}>
                                <NotificationItem
                                    notification={notif}
                                    onRead={(id) => markAsRead([id])}
                                />
                            </div>
                        ))}
                        {loading && (
                            <div className="p-4 flex justify-center">
                                <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default NotificationList;
