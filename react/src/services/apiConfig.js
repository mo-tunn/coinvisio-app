export const getApiBaseUrl = () => {
    // In production, use the custom domain.
    // Locally, it falls back to the local worker port or localhost:8787
    let url = import.meta.env.VITE_WORKER_URL;
    
    if (!url) {
        url = import.meta.env.PROD ? 'https://api.coinvisio.com' : 'http://localhost:8787';
    }
    if (url && !url.startsWith('http')) {
        url = `https://${url}`;
    }
    return url;
};

export const API_BASE_URL = getApiBaseUrl();
