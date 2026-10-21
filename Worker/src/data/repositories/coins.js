import { postgrestRequest, rpcRequest } from '../supabaseClient.js';

export async function getPopularCoins(env) {
  // Get active coins with basic info
  return postgrestRequest(env, {
    table: 'coins',
    params: {
      select: 'symbol,name,logo_url',
      is_active: 'eq.true',
      limit: 10
    }
  });
}

export async function searchSymbols(env, keyword) {
  return rpcRequest(env, 'search_crypto_symbols', { keyword });
}

export async function getSymbolHistory(env, symbol, limit) {
  return rpcRequest(env, 'get_symbol_history', {
    p_symbol: symbol,
    p_limit: limit
  });
}

export async function getCoinBySymbol(env, symbol) {
  const rows = await postgrestRequest(env, {
    table: 'coins',
    params: {
      select: 'symbol',
      symbol: `eq.${symbol}`
    }
  });
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function getCoinsBySymbols(env, symbols) {
  if (!symbols || symbols.length === 0) return [];
  return postgrestRequest(env, {
    table: 'coins',
    params: {
      select: 'symbol,name,logo_url',
      symbol: `in.(${symbols.join(',')})`
    }
  });
}

export async function getCoins(env, params = {}) {
  return postgrestRequest(env, {
    table: 'coins',
    params: {
      select: 'symbol,logo_url',
      ...params
    }
  });
}
