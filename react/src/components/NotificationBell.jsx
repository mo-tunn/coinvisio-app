import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotification } from '../context';
import { Link } from 'react-router-dom';
import NotificationList from './NotificationList';
import { useTranslation } from 'react-i18next';

const NotificationBell = () => {
    const { unreadCount } = useNotification();
    const { t } = useTranslation('notifications');
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-8 h-8 rounded transition-colors relative ${isOpen ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                title={t('bell.title')}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-[#010205]"></span>
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 origin-top-right">
                    <NotificationList />
                    {/* View All Link */}
                    <div className="bg-[#010205] border-x border-b border-gray-800 p-2 text-center sharp-corners">
                        <Link
                            to="/hub/notifications"
                            className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-wider transition-colors block py-1"
                            onClick={() => setIsOpen(false)}
                        >
                            {t('bell.manage')}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
