import { API_BASE_URL } from './apiConfig';
import { authFetch } from './authService';
import i18n from '../i18n';

// HuggingFace Space for LLM Streaming (slow but OK for AI)
const IRIS_API_URL = "https://mo-tunn-irisaiapi.hf.space";

// Cloudflare Worker for Data APIs (fast)
const WORKER_URL = API_BASE_URL;

export const irisService = {
    /**
     * Streams the chat response from Iris.
     * @param {string} query 
     * @param {string} userId
     * @param {string} tier
     * @param {function} onChunk - Callback for each text chunk
     * @param {string|null} sessionId - Current Session ID (if any)
     * @param {function} [onSessionId] - Callback to receive the confirmed Session ID
     */
    streamAskIris: async (query, userId, tier, onChunk, sessionId = null, onSessionId = null) => {
        const language = i18n.language || localStorage.getItem('cv_lang') || 'en';
        try {
            const response = await fetch(`${IRIS_API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Language': language,
                },
                body: JSON.stringify({
                    query: query,
                    user_id: userId,
                    user_tier: tier,
                    session_id: sessionId,
                    language
                })
            });

            if (!response.ok) {
                // Construct an error object similar to Axios for consistency
                const error = new Error("API Error");
                error.response = {
                    status: response.status,
                    data: await response.text()
                };
                throw error;
            }

            // Capture Session ID from headers if provided & callback exists
            const returnedSessionId = response.headers.get('X-Session-ID');
            if (returnedSessionId && onSessionId) {
                onSessionId(returnedSessionId);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                onChunk(text);
            }

        } catch (error) {
            console.error("Iris Stream Error:", error);
            throw error;
        }
    },

    /**
     * Gets past chat sessions.
     * @param {string} userId
     * @returns {Promise<Array>} List of chat sessions.
     */
    getHistory: async (userId) => {
        if (!userId) return [];
        try {
            const response = await authFetch(`${WORKER_URL}/api/Iris/history/${userId}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error("History Fetch Error:", error);
            return [];
        }
    },

    /**
     * Creates a new chat session.
     */
    startNewChat: async () => {
        return new Promise(resolve => setTimeout(() => resolve({ id: Date.now(), title: "New Chat", date: "Just now", preview: "" }), 300));
    },

    /**
     * Gets the full chat log for a specific session.
     * @param {string} sessionId
     * @returns {Promise<Array>} List of message objects.
     */
    getChatLog: async (sessionId) => {
        if (!sessionId) return [];
        try {
            const response = await fetch(`${IRIS_API_URL}/history/${sessionId}`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.messages || [];
        } catch (error) {
            console.error("Chat Log Fetch Error:", error);
            return [];
        }
    },

    /**
     * Deletes a chat session.
     * @param {string} sessionId
     * @param {string} userId
     * @returns {Promise<boolean>} Success status.
     */
    deleteHistory: async (sessionId, userId) => {
        if (!sessionId || !userId) return false;
        try {
            const response = await authFetch(`${WORKER_URL}/api/Iris/history/${sessionId}?user_id=${userId}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            console.error("Delete History Error:", error);
            return false;
        }
    },

    /**
     * Gets the current daily usage and limit for a user.
     * @param {string} userId
     * @param {string} tier
     * @returns {Promise<{used: number, limit: number, tier: string}>}
     */
    getUsage: async (userId, tier = 'free') => {
        if (!userId) return { used: 0, limit: 20, tier: 'free' };
        try {
            const response = await authFetch(`${WORKER_URL}/api/Iris/usage/${userId}?tier=${tier}`);
            if (!response.ok) return { used: 0, limit: 20, tier };
            return await response.json();
        } catch (error) {
            console.error("Usage Fetch Error:", error);
            return { used: 0, limit: 20, tier };
        }
    }
};
