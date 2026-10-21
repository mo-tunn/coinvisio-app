import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    login as loginApi,
    register as registerApi,
    logout as logoutApi,
    getStoredUser,
    isAuthenticated as checkAuth,
    getCurrentUser,
    loginWithGoogle as loginWithGoogleApi,
    setStoredUser,
    getRememberMeExpiresAt
} from '../services/authService';
import { syncLanguageFromUser } from '../i18n/language';

// Create the Auth Context
const AuthContext = createContext(null);

/**
 * Auth Provider Component
 * Provides authentication state and methods to the entire app
 */
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Fetch fresh user data from the backend
     */
    const fetchUser = useCallback(async () => {
        if (!checkAuth()) return;

        try {
            const freshUser = await getCurrentUser();
            if (freshUser) {
                // Normalize subscription tier for consistency across app
                if (freshUser.user_metadata?.subscription_tier?.toLowerCase() === 'premium') {
                    freshUser.user_metadata.subscription_tier = 'Premium';
                }

                setUser(freshUser);
                // Update local storage to keep it in sync
                setStoredUser(freshUser);
                syncLanguageFromUser(freshUser);
            }
        } catch (err) {
            console.error("Failed to refresh user profile:", err);
        }
    }, []);

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedUser = getStoredUser();
            const hasToken = checkAuth();

            if (hasToken && storedUser) {
                // Normalize subscription tier
                if (storedUser.user_metadata?.subscription_tier?.toLowerCase() === 'premium') {
                    storedUser.user_metadata.subscription_tier = 'Premium';
                }
                setUser(storedUser);
                setIsAuthenticated(true);
                syncLanguageFromUser(storedUser);
                // Background refresh of user data
                fetchUser();
            }
            setIsLoading(false);
        };

        initAuth();
    }, [fetchUser]);

    /**
     * Login function
     * @param {Object} credentials - { email, password }
     * @param {Object} options - { rememberMe?: boolean }
     * @returns {Promise<Object>} - Response data
     */
    const login = useCallback(async (credentials, options = {}) => {
        const response = await loginApi(credentials, options);

        if (response.user) {
            // Normalize subscription tier
            if (response.user.user_metadata?.subscription_tier?.toLowerCase() === 'premium') {
                response.user.user_metadata.subscription_tier = 'Premium';
            }
            setUser(response.user);
            setIsAuthenticated(true);
            syncLanguageFromUser(response.user);
        }

        return response;
    }, []);

    /**
     * Register function
     * @param {Object} userData - Registration data
     * @returns {Promise<Object>} - Response data
     */
    const register = useCallback(async (userData) => {
        const response = await registerApi(userData);

        // After registration, user might be auto-logged in
        if (response.user) {
            setUser(response.user);
            setIsAuthenticated(true);
            syncLanguageFromUser(response.user);
        }

        return response;
    }, []);

    /**
     * Google Login function
     * @returns {Promise<Object>} - Response data
     */
    const loginWithGoogle = useCallback(async () => {
        // Redirects away from the app
        return await loginWithGoogleApi();
    }, []);

    /**
     * Logout function
     */
    const logout = useCallback(async () => {
        try {
            await logoutApi();
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    // Auto-logout when remember-me expiry is reached
    useEffect(() => {
        if (!isAuthenticated) return;

        const expiresAt = getRememberMeExpiresAt();
        if (!expiresAt) return;

        const msUntilExpiry = expiresAt - Date.now();
        if (msUntilExpiry <= 0) {
            logout();
            return;
        }

        const timer = setTimeout(() => {
            logout();
        }, msUntilExpiry);

        return () => clearTimeout(timer);
    }, [isAuthenticated, logout]);

    /**
     * Refresh user data from localStorage
     */
    const refreshUser = useCallback(() => {
        const storedUser = getStoredUser();
        if (storedUser) {
            setUser(storedUser);
        }
    }, []);

    const updateUser = useCallback((updatedFields) => {
        setUser(prev => ({ ...prev, ...updatedFields }));
    }, []);

    const value = {
        user,
        isAuthenticated,
        isLoading,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshUser,
        updateUser,
        fetchUser,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook to use the Auth Context
 * @returns {Object} - Auth context value
 */
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};

export default AuthContext;
