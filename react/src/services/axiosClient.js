import axios from 'axios';
import { getAccessToken } from './authService';
import i18n from '../i18n';

/**
 * Creates a configured Axios instance for a specific microservice.
 * @param {string} baseURL - The base URL for the service.
 * @returns {import('axios').AxiosInstance} Configured Axios instance.
 */
const createClient = (baseURL) => {
    const client = axios.create({
        baseURL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor to add JWT token
    client.interceptors.request.use(
        (config) => {
            const token = getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            config.headers['X-Language'] = i18n.language || 'en';
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor for global error handling
    client.interceptors.response.use(
        (response) => response,
        (error) => {
            // Handle 401 Unauthorized (e.g., redirect to login)
            if (error.response && error.response.status === 401) {
                console.warn('Unauthorized access. Redirecting to login...');
                // window.location.href = '/login'; // Optional: Redirect logic
            }
            return Promise.reject(error);
        }
    );

    return client;
};

export default createClient;
