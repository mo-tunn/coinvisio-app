import { postgrestRequest } from '../data/supabaseClient.js';

/**
 * Gets the list of chat sessions for a user (excluding hidden/deleted ones).
 * Groups messages by session_id and uses the first message as title.
 */
export async function getHistoryList(env, userId) {
    if (!userId) return [];

    try {
        // Fetch last 100 interactions, excluding hidden ones
        const data = await postgrestRequest(env, {
            table: 'user_queries',
            params: {
                select: 'session_id,created_at,user_question,hidden',
                user_id: `eq.${userId}`,
                or: '(hidden.is.null,hidden.eq.false)',
                order: 'created_at.desc',
                limit: 100
            }
        });

        if (!data || !Array.isArray(data)) return [];

        // Group by session_id
        const sessionMap = {};
        for (const item of data) {
            const sid = item.session_id;
            if (!sid) continue;

            const createdAt = item.created_at || '';
            const userQ = item.user_question || 'New Chat';

            if (!sessionMap[sid]) {
                sessionMap[sid] = {
                    id: sid,
                    title: userQ.slice(0, 40) + (userQ.length > 40 ? '...' : ''),
                    first_msg_time: createdAt,
                    last_msg_time: createdAt,
                    date: createdAt.split('T')[0]
                };
            } else {
                // Track last activity
                if (createdAt > sessionMap[sid].last_msg_time) {
                    sessionMap[sid].last_msg_time = createdAt;
                    sessionMap[sid].date = createdAt.split('T')[0];
                }

                // Track first message for Title
                if (createdAt < sessionMap[sid].first_msg_time) {
                    sessionMap[sid].first_msg_time = createdAt;
                    sessionMap[sid].title = userQ.slice(0, 40) + (userQ.length > 40 ? '...' : '');
                }
            }
        }

        // Sort by most recent activity
        return Object.values(sessionMap).sort((a, b) =>
            b.last_msg_time.localeCompare(a.last_msg_time)
        );

    } catch (error) {
        console.error('Iris History List Error:', error);
        return [];
    }
}

/**
 * Gets the daily usage count for a user.
 */
export async function getUsage(env, userId, tier = 'free') {
    if (!userId) return { used: 0, limit: 20, tier };

    try {
        const today = new Date().toISOString().split('T')[0];
        const todayStart = `${today}T00:00:00`;

        const data = await postgrestRequest(env, {
            table: 'user_queries',
            params: {
                select: 'id',
                user_id: `eq.${userId}`,
                created_at: `gte.${todayStart}`
            },
            headers: {
                'Prefer': 'count=exact'
            }
        });

        const count = Array.isArray(data) ? data.length : 0;
        const limit = tier && tier.toLowerCase() === 'premium' ? 100 : 20;

        return { used: count, limit, tier };

    } catch (error) {
        console.error('Iris Usage Error:', error);
        return { used: 0, limit: 20, tier };
    }
}

/**
 * Soft-deletes a chat session (marks as hidden).
 */
export async function deleteSession(env, sessionId, userId) {
    if (!sessionId || !userId) return { success: false, hidden_count: 0 };

    try {
        const data = await postgrestRequest(env, {
            table: 'user_queries',
            method: 'PATCH',
            params: {
                session_id: `eq.${sessionId}`,
                user_id: `eq.${userId}`
            },
            body: { hidden: true },
            prefer: 'return=representation'
        });

        const hiddenCount = Array.isArray(data) ? data.length : 0;
        return { success: true, hidden_count: hiddenCount };

    } catch (error) {
        console.error('Iris Delete Session Error:', error);
        return { success: false, hidden_count: 0, error: error.message };
    }
}
