import { postgrestRequest } from '../supabaseClient.js';

export async function getUserWatchlist(env, userId) {
  return postgrestRequest(env, {
    table: 'user_watchlists',
    params: {
      select: 'symbol,coin:coins(name,logo_url)',
      user_id: `eq.${userId}`
    }
  });
}

export async function getUserWatchlistEntry(env, userId, symbol) {
  const rows = await postgrestRequest(env, {
    table: 'user_watchlists',
    params: {
      select: 'symbol',
      user_id: `eq.${userId}`,
      symbol: `eq.${symbol}`
    }
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function addToWatchlist(env, userId, symbol) {
  return postgrestRequest(env, {
    table: 'user_watchlists',
    method: 'POST',
    prefer: 'return=minimal',
    body: {
      user_id: userId,
      symbol
    }
  });
}

export async function removeFromWatchlist(env, userId, symbol) {
  return postgrestRequest(env, {
    table: 'user_watchlists',
    method: 'DELETE',
    prefer: 'return=minimal',
    params: {
      user_id: `eq.${userId}`,
      symbol: `eq.${symbol}`
    }
  });
}

export async function countUserWatchlist(env, userId) {
  const rows = await postgrestRequest(env, {
    table: 'user_watchlists',
    params: {
      select: 'symbol',
      user_id: `eq.${userId}`
    }
  });
  return Array.isArray(rows) ? rows.length : 0;
}

export async function getUsersByWatchlistSymbol(env, symbol) {
  // Normalize symbol for flexible matching (handle BTC-USD vs BTC)
  const baseSymbol = symbol?.replace('-USD', '')?.toUpperCase();
  const fullSymbol = baseSymbol ? `${baseSymbol}-USD` : symbol;

  return postgrestRequest(env, {
    table: 'user_watchlists',
    params: {
      select: 'user_id',
      or: `(symbol.eq.${baseSymbol},symbol.eq.${fullSymbol})`
    }
  });
}
