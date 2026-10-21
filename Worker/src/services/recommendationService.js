import { getRecommendations } from '../data/repositories/recommendations.js';
import { getSmartSignals } from '../data/repositories/signals.js';
import { getCoinAnomalies } from '../data/repositories/anomalies.js';
import { getUserProfile } from '../data/repositories/profiles.js';
import { getTopCoins } from '../data/repositories/topCoins.js';
import { getUserWatchlist } from '../data/repositories/watchlist.js';
import { getCoinsBySymbols } from '../data/repositories/coins.js';
import { getCoins } from '../data/repositories/coins.js';
import { mapRecommendation, mapSmartSignal, mapCoinAnomaly } from '../utils/mappers.js';

function buildInFilter(values) {
  return `in.(${values.join(',')})`;
}

function normalizeSymbol(symbol) {
  if (!symbol) return null;
  let value = symbol.toUpperCase();
  value = value.replace('/USDT', '');
  value = value.replace('USDT', '');
  value = value.replace('/', '');
  if (value.endsWith('-USD')) return value;
  if (value.endsWith('USD') && !value.includes('-')) {
    return `${value.slice(0, -3)}-USD`;
  }
  if (value.includes('-')) return value;
  return `${value}-USD`;
}

function groupLatest(rows, keyFn, dateField) {
  const map = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, row);
      continue;
    }
    const currentDate = new Date(row[dateField]);
    const existingDate = new Date(existing[dateField]);
    if (currentDate > existingDate) {
      map.set(key, row);
    }
  }
  return Array.from(map.values());
}

export async function getUserAndTier(env, userId) {
  let subscriptionTier = 'free';
  if (userId) {
    try {
      const profile = await getUserProfile(env, userId);
      if (profile?.subscription_tier) {
        subscriptionTier = profile.subscription_tier;
      }
    } catch {
      subscriptionTier = 'free';
    }
  }
  return { userId, subscriptionTier };
}

export async function fetchRecommendations(env, options) {
  const { userId, subscriptionTier, riskProfile, since, watchlist, at } = options;

  const params = {};
  /* 
  // Temporarily allowed for all users
  if (subscriptionTier === 'free') {
    if (riskProfile && riskProfile !== 'Conservative') {
      return [];
    }
    params.risk_profile = 'eq.Conservative';
  }
  */
  if (riskProfile) {
    params.risk_profile = `eq.${riskProfile}`;
  }

  if (at) {
    // Point-in-time lookup: Get the latest record on or before 'at'
    params.updated_at = `lte.${at.toISOString()}`;
    params.limit = 1;
  } else if (since) {
    // Range lookup
    params.updated_at = `gte.${since.toISOString()}`;
  }

  params.order = 'updated_at.desc';

  const rows = await getRecommendations(env, params);
  const recommendations = Array.isArray(rows) ? rows : [];

  // Manual Logo enrichment for Recommendations (JSONB data usually misses logos)
  const allSymbols = new Set();
  recommendations.forEach(row => {
    if (Array.isArray(row.coins)) {
      row.coins.forEach(c => {
        if (c.symbol) allSymbols.add(c.symbol);
      });
    }
  });

  if (allSymbols.size > 0) {
    try {
      const uniqueSymbols = Array.from(allSymbols);
      const coinsInfo = await getCoinsBySymbols(env, uniqueSymbols);

      const logoMap = new Map();
      if (Array.isArray(coinsInfo)) {
        coinsInfo.forEach(c => logoMap.set(c.symbol, c.logo_url));
      }

      // Inject logos back into the JSON objects
      recommendations.forEach(row => {
        if (Array.isArray(row.coins)) {
          row.coins.forEach(c => {
            if (c.symbol && logoMap.has(c.symbol)) {
              c.logo_url = logoMap.get(c.symbol);
            }
          });
        }
      });
    } catch (err) {
      console.error('Error fetching recommendation logos:', err);
    }
  }

  let watchlistedSymbols = null;
  if (watchlist && userId) {
    const watchlistRows = await getUserWatchlist(env, userId);
    watchlistedSymbols = new Set(
      (Array.isArray(watchlistRows) ? watchlistRows : [])
        .map((row) => row?.symbol)
        .filter(Boolean)
    );
  }

  const mapped = recommendations
    .map((row) => mapRecommendation(row, watchlistedSymbols))
    .filter(Boolean);

  if (watchlist && watchlistedSymbols) {
    return mapped.filter((rec) => Array.isArray(rec.coins) && rec.coins.length > 0);
  }

  return mapped;
}

export async function fetchSignals(env, options) {
  const { subscriptionTier, since, search, page = 1, pageSize = 20 } = options;

  const params = {
    order: 'created_at.desc',
    limit: pageSize,
    offset: (page - 1) * pageSize
  };

  if (since) {
    params.created_at = `gte.${since.toISOString()}`;
  }

  if (search) {
    const term = search.trim();
    params.symbol = `ilike.%${term}%`;
  }
  // Removed Default Top 10 Logic to allow broader discovery via pagination

  const rows = await getSmartSignals(env, params);
  let signals = Array.isArray(rows) ? rows : [];

  // Improve Search Relevance: Prioritize Exact Matches and StartsWith
  if (search) {
    const term = search.trim().toLowerCase();
    signals.sort((a, b) => {
      const symA = a.symbol.toLowerCase();
      const symB = b.symbol.toLowerCase();

      // Exact match first
      if (symA === term && symB !== term) return -1;
      if (symB === term && symA !== term) return 1;

      // Starts with second
      if (symA.startsWith(term) && !symB.startsWith(term)) return -1;
      if (symB.startsWith(term) && !symA.startsWith(term)) return 1;

      // Length third (shorter symbol usually means the base coin vs derivative)
      return symA.length - symB.length;
    });
  }

  // Manual Logo Fetch (since Join might fail due to missing FK)
  const uniqueSymbols = [...new Set(signals.map(s => s.symbol))];
  let logoMap = new Map();

  if (uniqueSymbols.length > 0) {
    try {
      const normalizedSymbols = uniqueSymbols
        .map((s) => normalizeSymbol(s))
        .filter(Boolean);
      const coins = await getCoinsBySymbols(env, normalizedSymbols);
      if (Array.isArray(coins)) {
        coins.forEach(c => logoMap.set(c.symbol, c.logo_url));
      }
    } catch (err) {
      console.error('Error fetching coin logos:', err);
      // Fail silently, return signals without logos
    }
  }

  const grouped = groupLatest(signals, (row) => `${row.symbol}|${row.term}`, 'created_at');

  return grouped
    .map((row) => {
      const normalized = normalizeSymbol(row.symbol);
      row.logoUrl = logoMap.get(normalized);
      return mapSmartSignal(row, subscriptionTier === 'premium');
    })
    .filter(Boolean);
}

export async function fetchSignalHistory(env, options) {
  const { subscriptionTier, since, symbol } = options;
  const params = {
    symbol: `eq.${symbol}`
  };

  if (since) {
    params.created_at = `gte.${since.toISOString()}`;
  }

  /*
  if (subscriptionTier === 'free') {
    const topCoins = await getTopCoins(env);
    const symbols = (Array.isArray(topCoins) ? topCoins : [])
      .map((row) => row?.symbol)
      .filter(Boolean);
    if (symbols.length > 0 && !symbols.includes(symbol)) {
      return [];
    }
  }
  */

  const rows = await getSmartSignals(env, params);
  const signals = Array.isArray(rows) ? rows : [];

  const sorted = signals.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  return sorted
    .map((row) => mapSmartSignal(row, subscriptionTier === 'premium'))
    .filter(Boolean);
}

export async function fetchCoinAnomalies(env, options) {
  const { subscriptionTier, since, limit = 20, offset = 0 } = options;
  const params = {
    order: 'detected_at.desc'
  };

  if (since) {
    params.detected_at = `gte.${since.toISOString()}`;
  }

  // Note: Removed free tier restriction - show all anomalies regardless of subscription
  // Anomalies are important alerts that all users should see

  // Add limit and offset for pagination
  if (limit) {
    params.limit = limit;
  }
  if (offset) {
    params.offset = offset;
  }

  const rows = await getCoinAnomalies(env, params);
  const anomalies = Array.isArray(rows) ? rows : [];

  // Fetch total count (without limit/offset)
  const countParams = {};
  if (since) {
    countParams.detected_at = `gte.${since.toISOString()}`;
  }
  countParams.select = 'count';

  const countResult = await getCoinAnomalies(env, countParams);
  const total = countResult?.[0]?.count || anomalies.length;

  // Fetch logos for all unique symbols
  const uniqueSymbols = [...new Set(anomalies.map(a => a.symbol))].filter(Boolean);
  const logoMap = {};

  if (uniqueSymbols.length > 0) {
    const normalizedSymbols = uniqueSymbols
      .map((s) => normalizeSymbol(s))
      .filter(Boolean);
    const coinRows = await getCoins(env, { symbol: buildInFilter(normalizedSymbols) });
    if (Array.isArray(coinRows)) {
      coinRows.forEach(coin => {
        if (coin.symbol && coin.logo_url) {
          logoMap[coin.symbol] = coin.logo_url;
        }
      });
    }
  }

  // Map anomalies and inject logos
  const data = anomalies.map(anomaly => {
    const mapped = mapCoinAnomaly(anomaly);
    const normalized = normalizeSymbol(mapped?.symbol);
    if (mapped && normalized && logoMap[normalized]) {
      mapped.logo = logoMap[normalized];
    }
    return mapped;
  }).filter(Boolean);

  return {
    data,
    total,
    limit,
    offset
  };
}
