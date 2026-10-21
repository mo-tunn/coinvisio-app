import {
  getPopularCoins,
  searchSymbols,
  getSymbolHistory,
  getCoinBySymbol
} from '../data/repositories/coins.js';
import {
  getUserWatchlist,
  getUserWatchlistEntry,
  addToWatchlist,
  removeFromWatchlist,
  countUserWatchlist
} from '../data/repositories/watchlist.js';
import { mapCoin, mapCryptoPrice, mapWatchlistItem } from '../utils/mappers.js';

function normalizeSymbol(symbol) {
  if (!symbol) return null;
  return symbol
    .toUpperCase()
    .replace('/USDT', '')
    .replace('USDT', '')
    .replace('-USD', '')
    .replace('/', '');
}

function toStandardSymbol(symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return null;
  return `${normalized}-USD`;
}

async function fetchCoinGeckoMarketData() {
  const url =
    'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h';
  const request = new Request(url, { headers: { Accept: 'application/json' } });

  try {
    const cache = typeof caches !== 'undefined' ? caches.default : null;
    if (cache) {
      const cached = await cache.match(request);
      if (cached) {
        const cachedData = await cached.json();
        return Array.isArray(cachedData) ? cachedData : [];
      }
    }

    const response = await fetch(request);
    if (!response.ok) return [];
    const data = await response.json();

    if (cache) {
      const cacheResponse = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=300'
        }
      });
      await cache.put(request, cacheResponse);
    }

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('CoinGecko markets error:', err);
    return [];
  }
}

export async function fetchPopularCoins(env) {
  const rows = await getPopularCoins(env);
  const mapped = Array.isArray(rows) ? rows.map(mapCoin).filter(Boolean) : [];

  if (mapped.length === 0) return mapped;

  // Enrich with market data (price, 24h change, market cap)
  const marketRows = await fetchCoinGeckoMarketData();
  if (marketRows.length === 0) return mapped;

  const marketMap = new Map();
  marketRows.forEach((row) => {
    const key = normalizeSymbol(row?.symbol);
    if (key) {
      marketMap.set(key, row);
    }
  });

  return mapped.map((coin) => {
    const key = normalizeSymbol(coin.symbol);
    const market = key ? marketMap.get(key) : null;
    if (!market) return coin;

    return {
      ...coin,
      name: coin.name ?? market.name ?? null,
      logoUrl: coin.logoUrl ?? market.image ?? null,
      price: market.current_price ?? coin.price ?? null,
      change: market.price_change_percentage_24h ?? coin.change ?? null,
      marketCap: market.market_cap ?? coin.marketCap ?? null
    };
  });
}

export async function fetchMarketQuotes(env, symbols) {
  if (!Array.isArray(symbols) || symbols.length === 0) return [];

  const marketRows = await fetchCoinGeckoMarketData();
  if (!Array.isArray(marketRows) || marketRows.length === 0) return [];

  const marketMap = new Map();
  marketRows.forEach((row) => {
    const key = normalizeSymbol(row?.symbol);
    if (key) {
      marketMap.set(key, row);
    }
  });

  return symbols
    .map((symbol) => {
      const key = normalizeSymbol(symbol);
      if (!key) return null;
      const market = marketMap.get(key);
      if (!market) return null;
      return {
        symbol: toStandardSymbol(symbol),
        price: market.current_price ?? null,
        change24h: market.price_change_percentage_24h ?? null,
        marketCap: market.market_cap ?? null
      };
    })
    .filter(Boolean);
}

export async function fetchSearchSymbols(env, keyword) {
  const rows = await searchSymbols(env, keyword);
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => row?.symbol).filter(Boolean);
}

export async function fetchSymbolHistory(env, symbol, limit) {
  const rows = await getSymbolHistory(env, symbol, limit);
  if (!Array.isArray(rows)) return [];
  return rows.map(mapCryptoPrice).filter(Boolean);
}

export async function fetchUserWatchlist(env, userId) {
  const rows = await getUserWatchlist(env, userId);
  if (!Array.isArray(rows)) return [];
  return rows.map(mapWatchlistItem).filter(Boolean);
}

export async function ensureCoinExists(env, symbol) {
  const row = await getCoinBySymbol(env, symbol);
  return Boolean(row);
}

export async function isWatchlistEntryPresent(env, userId, symbol) {
  const row = await getUserWatchlistEntry(env, userId, symbol);
  return Boolean(row);
}

export async function addWatchlistEntry(env, userId, symbol) {
  return addToWatchlist(env, userId, symbol);
}

export async function removeWatchlistEntry(env, userId, symbol) {
  return removeFromWatchlist(env, userId, symbol);
}

export async function getWatchlistCount(env, userId) {
  return countUserWatchlist(env, userId);
}

export function getWatchlistLimit(subscriptionTier) {
  const tier = subscriptionTier?.toLowerCase();
  if (tier === 'premium' || tier === 'pro') {
    return 15;
  }
  return 3; // free tier
}
