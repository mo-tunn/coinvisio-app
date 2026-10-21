/**
 * Auth Service
 * Handles all authentication API calls to the AuthService backend
 */
import { API_BASE_URL } from './apiConfig';
import { supabase } from './supabaseClient';
import i18n from '../i18n';

const AUTH_STORAGE_KEYS = ['accessToken', 'refreshToken', 'user'];
const REMEMBER_ME_KEY = 'rememberMe';
const REMEMBER_ME_EXPIRES_AT_KEY = 'rememberMeExpiresAt';
const REMEMBER_ME_TTL_MS = 24 * 60 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;
const EXPIRED_TOKEN_SKEW_MS = 5 * 1000;
const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let refreshPromise = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getLanguage = () => i18n.language || localStorage.getItem('cv_lang') || 'en';

const parseRetryAfterMs = (retryAfter, attempt = 0) => {
    if (!retryAfter) {
        return Math.min(1000 * (2 ** attempt), 5000);
    }

    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
        return Math.min(Math.max(seconds * 1000, 250), 30000);
    }

    const retryDate = Date.parse(retryAfter);
    if (Number.isFinite(retryDate)) {
        return Math.min(Math.max(retryDate - Date.now(), 250), 30000);
    }

    return Math.min(1000 * (2 ** attempt), 5000);
};

const fetchWith429Retry = async (url, options = {}, retryOptions = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const allowRetry = typeof retryOptions.allowRetry === 'boolean'
        ? retryOptions.allowRetry
        : RETRYABLE_METHODS.has(method);
    const maxRetries = allowRetry ? (retryOptions.maxRetries ?? 1) : 0;

    let attempt = 0;
    while (true) {
        const response = await fetch(url, options);
        if (response.status !== 429 || attempt >= maxRetries) {
            return response;
        }

        const waitMs = parseRetryAfterMs(response.headers.get('Retry-After'), attempt);
        await sleep(waitMs);
        attempt += 1;
    }
};

const decodeJwtPayload = (token) => {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        return JSON.parse(atob(padded));
    } catch {
        return null;
    }
};

const getJwtExpiryMs = (token) => {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
};

const isJwtExpired = (token, skewMs = 0) => {
    const expMs = getJwtExpiryMs(token);
    if (!expMs) return false;
    return Date.now() + skewMs >= expMs;
};

const clearAuthKeys = (storage) => {
    AUTH_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
};

const clearRememberMeInfo = () => {
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem(REMEMBER_ME_EXPIRES_AT_KEY);
};

const clearRememberedSession = () => {
    clearAuthKeys(localStorage);
    clearRememberMeInfo();
};

const clearAllAuthStorage = () => {
    clearAuthKeys(localStorage);
    clearAuthKeys(sessionStorage);
    clearRememberMeInfo();
};

export const getRememberMeExpiresAt = () => {
    const enabled = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (!enabled) return null;

    const raw = localStorage.getItem(REMEMBER_ME_EXPIRES_AT_KEY);
    if (!raw) return null;

    const expiresAt = Number(raw);
    return Number.isFinite(expiresAt) ? expiresAt : null;
};

const maybeClearExpiredRememberedSession = () => {
    const expiresAt = getRememberMeExpiresAt();
    if (!expiresAt) return;

    if (Date.now() >= expiresAt) {
        clearRememberedSession();
    }
};

const getActiveAuthStorage = () => {
    maybeClearExpiredRememberedSession();

    if (localStorage.getItem('accessToken') || localStorage.getItem('refreshToken')) return localStorage;
    if (sessionStorage.getItem('accessToken') || sessionStorage.getItem('refreshToken')) return sessionStorage;
    return localStorage;
};

export const setStoredUser = (user) => {
    const storage = getActiveAuthStorage();
    storage.setItem('user', JSON.stringify(user));
};

const storeAuthData = (data, { rememberMe }) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const otherStorage = rememberMe ? sessionStorage : localStorage;

    clearAuthKeys(otherStorage);

    if (data.accessToken) {
        storage.setItem('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
        storage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user) {
        storage.setItem('user', JSON.stringify(data.user));
    }

    if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        localStorage.setItem(REMEMBER_ME_EXPIRES_AT_KEY, String(Date.now() + REMEMBER_ME_TTL_MS));
    } else {
        clearRememberMeInfo();
    }
};

const getRefreshToken = () => {
    maybeClearExpiredRememberedSession();
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
};

const storeRefreshedAuthData = (data, storage) => {
    const otherStorage = storage === localStorage ? sessionStorage : localStorage;
    clearAuthKeys(otherStorage);

    if (data.accessToken) {
        storage.setItem('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
        storage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user) {
        storage.setItem('user', JSON.stringify(data.user));
    }

    if (storage === localStorage && localStorage.getItem(REMEMBER_ME_KEY) === 'true') {
        localStorage.setItem(REMEMBER_ME_EXPIRES_AT_KEY, String(Date.now() + REMEMBER_ME_TTL_MS));
    }
};

const refreshAccessToken = async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    const storage = getActiveAuthStorage();
    const response = await fetchWith429Retry(`${API_BASE_URL}/api/Auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Language': getLanguage(),
        },
        body: JSON.stringify({ refreshToken }),
    }, {
        allowRetry: true,
        maxRetries: 1
    });

    let data;
    try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {};
    }

    if (!response.ok) {
        const errorMessage = data.message || `Token refresh failed (Status: ${response.status})`;
        if (response.status === 401 || response.status === 403) {
            clearAllAuthStorage();
        }
        throw new Error(errorMessage);
    }

    storeRefreshedAuthData(data, storage);
    return data.accessToken || null;
};

const refreshAccessTokenSingleFlight = async () => {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                return await refreshAccessToken();
            } finally {
                refreshPromise = null;
            }
        })();
    }
    return refreshPromise;
};

const ensureValidAccessToken = async () => {
    const token = getAccessToken();
    if (!token) {
        if (!getRefreshToken()) return null;
        try {
            return await refreshAccessTokenSingleFlight();
        } catch (err) {
            console.warn('No valid access token and refresh failed:', err);
            return null;
        }
    }

    if (!isJwtExpired(token, TOKEN_REFRESH_SKEW_MS)) {
        return token;
    }

    if (!getRefreshToken()) {
        if (isJwtExpired(token, EXPIRED_TOKEN_SKEW_MS)) {
            return null;
        }
        return token;
    }

    try {
        return await refreshAccessTokenSingleFlight();
    } catch (err) {
        console.warn('Token refresh failed:', err);
        if (isJwtExpired(token, EXPIRED_TOKEN_SKEW_MS)) {
            return null;
        }
        return token;
    }
};



/**
 * Login user with email and password
 * @param {Object} credentials - { email, password }
 * @returns {Promise<Object>} - Response with tokens and user data
 */
export const login = async (credentials, options = {}) => {
    const { rememberMe = false } = options;
    const response = await fetchWith429Retry(`${API_BASE_URL}/api/Auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Language': getLanguage(),
        },
        body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
            captchaToken: options.captchaToken,
        }),
    }, {
        allowRetry: false
    });

    let data;
    try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        throw new Error(`Server connection error: Cannot parse server response (${response.status})`);
    }

    if (!response.ok) {
        const errorMessage = data.message || (Object.keys(data).length > 0 ? JSON.stringify(data) : `Login failed (Status: ${response.status})`);
        throw new Error(errorMessage);
    }

    storeAuthData(data, { rememberMe });

    return data;
};

/**
 * Login with Google OAuth
 * @returns {Promise<Object>} - Supabase OAuth Response
 */
export const loginWithGoogle = async () => {
    try {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/hub/dashboard`, // Redirect to dashboard after login
            },
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Google login error:', error);
        throw error;
    }
};

/**
 * Register a new user
 * @param {Object} userData - { fullName, email, password, confirmPassword, riskTolerance }
 * @returns {Promise<Object>} - Response with tokens and user data
 */
export const register = async (userData) => {
    const response = await fetchWith429Retry(`${API_BASE_URL}/api/Auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Language': getLanguage(),
        },
        body: JSON.stringify({
            fullName: userData.fullName,
            email: userData.email,
            password: userData.password,
            passwordConfirm: userData.confirmPassword,
            riskTolerance: userData.riskTolerance,
            captchaToken: userData.captchaToken,
            preferredLanguage: getLanguage(),
        }),
    }, {
        allowRetry: false
    });

    let data;
    try {
        const text = await response.text();
        data = text ? JSON.parse(text) : {};
    } catch (err) {
        throw new Error(`Server connection error: Cannot parse server response (${response.status})`);
    }

    if (!response.ok) {
        const errorMessage = data.message || (Object.keys(data).length > 0 ? JSON.stringify(data) : `Registration failed (Status: ${response.status})`);
        throw new Error(errorMessage);
    }

    // Store tokens in localStorage
    if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
    }
    if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
};

/**
 * Logout the current user
 * @returns {Promise<Object>} - Response confirmation
 */
export const logout = async () => {
    const accessToken = getAccessToken();

    try {
        const response = await fetchWith429Retry(`${API_BASE_URL}/api/Auth/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Language': getLanguage(),
                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
            },
        }, {
            allowRetry: false
        });

        const data = await response.json();

        if (!response.ok) {
            console.warn('Logout API failed, clearing local storage anyway');
        }

        return data;
    } finally {
        // Always clear auth storage regardless of API response
        clearAllAuthStorage();
    }
};

/**
 * Get the stored access token
 * @returns {string|null} - The access token or null
 */
export const getAccessToken = () => {
    maybeClearExpiredRememberedSession();
    return localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
};

/**
 * Get the stored user data
 * @returns {Object|null} - The user object or null
 */
export const getStoredUser = () => {
    maybeClearExpiredRememberedSession();

    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
        const user = storage.getItem('user');
        if (!user) continue;
        try {
            return JSON.parse(user);
        } catch (err) {
            console.warn('Invalid stored user JSON, clearing cache:', err);
            storage.removeItem('user');
        }
    }

    return null;
};

/**
 * Check if user is authenticated
 * @returns {boolean} - True if user has valid token
 */
export const isAuthenticated = () => {
    const accessToken = getAccessToken();
    if (accessToken && !isJwtExpired(accessToken, EXPIRED_TOKEN_SKEW_MS)) {
        return true;
    }
    return !!getRefreshToken();
};

/**
 * Create authenticated fetch wrapper
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export const authFetch = async (url, options = {}) => {
    const accessToken = await ensureValidAccessToken();
    const method = (options.method || 'GET').toUpperCase();
    const allow429Retry = RETRYABLE_METHODS.has(method);

    const headers = {
        'Content-Type': 'application/json',
        'X-Language': getLanguage(),
        ...options.headers,
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const response = await fetchWith429Retry(url, {
        ...options,
        headers,
    }, {
        allowRetry: allow429Retry,
        maxRetries: 1
    });

    if (response.status !== 401) {
        return response;
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
        return response;
    }

    try {
        const refreshedAccessToken = await refreshAccessTokenSingleFlight();
        if (!refreshedAccessToken) {
            return response;
        }

        return fetchWith429Retry(url, {
            ...options,
            headers: {
                ...headers,
                Authorization: `Bearer ${refreshedAccessToken}`,
            },
        }, {
            allowRetry: allow429Retry,
            maxRetries: 1
        });
    } catch (err) {
        console.warn('401 retry refresh failed:', err);
        return response;
    }
};

/**
 * Get current user details from backend
 * @returns {Promise<Object>} - User object
 */
export const getCurrentUser = async () => {
    try {
        const response = await authFetch(`${API_BASE_URL}/api/Auth/me`);
        let data;
        try {
            const text = await response.text();
            data = text ? JSON.parse(text) : {};
        } catch {
            return null;
        }

        if (!response.ok) {
            console.warn('Failed to fetch user data:', data.message);
            return null;
        }
        return data.user;
    } catch (error) {
        console.warn('Error fetching current user:', error);
        return null;
    }
};

export default {
    login,
    register,
    loginWithGoogle,
    logout,
    getAccessToken,
    getStoredUser,
    isAuthenticated,
    authFetch,
    getCurrentUser,
};
