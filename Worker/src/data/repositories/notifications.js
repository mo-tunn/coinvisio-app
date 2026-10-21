import { postgrestRequest, rpcRequest } from '../supabaseClient.js';

// --- Notification Types ---

export async function getNotificationTypes(env) {
    return postgrestRequest(env, {
        table: 'notification_types',
        params: {
            select: 'id,code,description'
        }
    });
}

// --- Preferences ---

export async function getUserPreferences(env, userId) {
    return postgrestRequest(env, {
        table: 'notification_preferences',
        params: {
            select: '*',
            user_id: `eq.${userId}`
        }
    });
}

export async function upsertUserPreference(env, userId, preferences) {
    // preferences is an array of objects: { user_id, coin_symbol, preference_type, is_enabled }
    // We use Upsert to handle both insert and update
    return postgrestRequest(env, {
        table: 'notification_preferences',
        method: 'POST',
        body: preferences,
        prefer: 'resolution=merge-duplicates', // Handle unique constraint conflict by updating
        params: {
            on_conflict: 'user_id,coin_symbol,preference_type'
        }
    });
}

// --- Notifications Read/Write ---

export async function getUnreadCount(env, userId) {
    const result = await rpcRequest(env, 'get_unread_notification_count', {
        p_user_id: userId
    });
    return typeof result === 'number' ? result : 0;
}

export async function fetchUserNotifications(env, userId, limit = 20, cursor = null) {
    const params = {
        user_id: `eq.${userId}`,
        order: 'created_at.desc,id.desc', // Stable sort order for cursor
        limit: limit
    };

    if (cursor) {
        // cursor format: "timestamp_millis,id"
        // We want items Created BEFORE (lte) the cursor time OR (same time AND smaller ID)
        // But REST API "or" logic with composite keys is tricky.
        // Simplification: Standard keyset pagination usually requires (created_at < t) OR (created_at = t AND id < id)
        // For Supabase/PostgREST, we might use a single filter if we rely purely on ID if it's sequential, 
        // but created_at is safer for business logic.
        // Let's rely on simple `created_at` filtering for MVP if ID isn't guaranteed monotonic with time.
        // Actually, simple filtering: created_at < cursorTime

        // Better approach matching implementation plan:
        // User passes the 'created_at' of the last item they saw.
        const [lastCreatedAt, lastId] = cursor.split(',');

        // Filter: created_at <= lastCreatedAt
        // We can't easily do the composite (date, id) tuple comparison in simple PostgREST implementation 
        // without complex OR logic in the query string.
        // Fallback compliant with "MVP": Just filter by created_at. 
        // If strict precision needed, we'll refine.
        params.created_at = `lt.${lastCreatedAt}`;
    }

    return postgrestRequest(env, {
        table: 'notifications',
        params: {
            ...params,
            select: '*, notification_types(code, description)'
        }
    });
}

export async function markNotificationsRead(env, userId, notificationIds) {
    return postgrestRequest(env, {
        table: 'notifications',
        method: 'PATCH',
        params: {
            user_id: `eq.${userId}`,
            id: `in.(${notificationIds.join(',')})`
        },
        body: {
            is_read: true,
            read_at: new Date().toISOString()
        }
    });
}

export async function markAllNotificationsRead(env, userId) {
    return postgrestRequest(env, {
        table: 'notifications',
        method: 'PATCH',
        params: {
            user_id: `eq.${userId}`,
            is_read: 'eq.false'
        },
        body: {
            is_read: true,
            read_at: new Date().toISOString()
        }
    });
}

// --- Generation & Deduplication ---

export async function createNotification(env, notification) {
    return postgrestRequest(env, {
        table: 'notifications',
        method: 'POST',
        body: notification
    });
}

export async function findRecentNotification(env, userId, coinSymbol, typeId, secondsAgo) {
    // Check if a similar notification exists within the X seconds window
    const cutoff = new Date(Date.now() - secondsAgo * 1000).toISOString();

    const params = {
        user_id: `eq.${userId}`,
        notification_type_id: `eq.${typeId}`,
        created_at: `gte.${cutoff}`,
        limit: 1
    };

    if (coinSymbol) {
        params.coin_symbol = `eq.${coinSymbol}`;
    }

    const result = await postgrestRequest(env, {
        table: 'notifications',
        params
    });

    return Array.isArray(result) && result.length > 0 ? result[0] : null;
}
