import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context';
import { useTranslation } from 'react-i18next';

/**
 * Protected Route Component
 * Redirects unauthenticated users to login page
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 */
const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const { t } = useTranslation('common');
    const location = useLocation();

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#010205] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-gray-400 text-sm font-mono">{t('auth.authenticating')}</span>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
};

export default ProtectedRoute;
