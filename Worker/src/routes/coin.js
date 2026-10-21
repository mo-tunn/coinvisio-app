import { Hono } from 'hono';
import { requireAuth } from '../middlewares/auth.js';
import {
  fetchPopularCoins,
  fetchMarketQuotes,
  fetchSearchSymbols,
  fetchSymbolHistory,
  fetchUserWatchlist,
  ensureCoinExists,
  isWatchlistEntryPresent,
  addWatchlistEntry,
  removeWatchlistEntry,
  getWatchlistCount,
  getWatchlistLimit
} from '../services/coinService.js';
import { getCoinsBySymbols } from '../data/repositories/coins.js';
import { getUserProfile } from '../data/repositories/profiles.js';
import { parseInteger } from '../utils/parsers.js';
import { t } from '../utils/i18n.js';

const router = new Hono();

const COINGECKO_SYMBOL_MAP = {
  btc: 'bitcoin',
  btcusdt: 'bitcoin',
  uni: 'uniswap',
  uniusdt: 'uniswap',
  ltc: 'litecoin',
  ltcusdt: 'litecoin',
  atom: 'cosmos',
  atomusdt: 'cosmos'
};

function resolveCoinId(rawSymbol) {
  if (!rawSymbol) return null;
  const cleaned = rawSymbol.toLowerCase().replace('-usd', '').replace('/', '');
  return COINGECKO_SYMBOL_MAP[cleaned] || cleaned;
}

router.get('/popular', async (c) => {
  const result = await fetchPopularCoins(c.env);
  return c.json(result);
});

router.get('/search', async (c) => {
  const lang = c.get('lang') || 'en';
  const keyword = c.req.query('keyword');
  if (!keyword || !keyword.trim()) {
    return c.text(t('coin.keywordRequired', lang), 400);
  }
  const result = await fetchSearchSymbols(c.env, keyword);
  return c.json(result);
});

router.get('/history/:symbol', async (c) => {
  const symbol = c.req.param('symbol');
  const limitValue = parseInteger(c.req.query('limit'), 100);
  const result = await fetchSymbolHistory(c.env, symbol, limitValue);
  return c.json(result);
});

router.get('/intraday/:symbol', async (c) => {
  const lang = c.get('lang') || 'en';
  const symbol = c.req.param('symbol');
  const minutes = parseInteger(c.req.query('minutes'), 60);
  const bucket = parseInteger(c.req.query('bucket'), 5);
  const coinId = resolveCoinId(symbol);

  if (!coinId) {
    return c.text(t('coin.symbolRequired', lang), 400);
  }

  const url = `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=1`;
  const cacheKey = new Request(`${url}&minutes=${minutes}&bucket=${bucket}`);
  const cache = typeof caches !== 'undefined' ? caches.default : null;

  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) {
      const data = await cached.json();
      return c.json(data);
    }
  }

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      return c.json({ error: t('coin.fetchIntradayFailed', lang) }, 500);
    }

    const payload = await response.json();
    const prices = Array.isArray(payload?.prices) ? payload.prices : [];
    if (prices.length === 0) {
      return c.json([]);
    }

    const latestTs = prices[prices.length - 1][0];
    const cutoff = latestTs - minutes * 60 * 1000;
    const bucketMs = Math.max(1, bucket) * 60 * 1000;
    const buckets = new Map();

    prices.forEach(([ts, price]) => {
      if (ts < cutoff) return;
      const key = Math.floor(ts / bucketMs) * bucketMs;
      const existing = buckets.get(key);
      if (!existing) {
        buckets.set(key, {
          time: new Date(key).toISOString(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 0
        });
      } else {
        existing.high = Math.max(existing.high, price);
        existing.low = Math.min(existing.low, price);
        existing.close = price;
      }
    });

    const result = Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value);

    if (cache) {
      const cacheResponse = new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=30'
        }
      });
      await cache.put(cacheKey, cacheResponse);
    }

    return c.json(result);
  } catch (error) {
    console.error('Intraday API error:', error);
    return c.json({ error: t('coin.fetchIntradayFailed', lang) }, 500);
  }
});

router.get('/quotes', async (c) => {
  const lang = c.get('lang') || 'en';
  const symbolsParam = c.req.query('symbols');
  if (!symbolsParam || !symbolsParam.trim()) {
    return c.text(t('coin.symbolsRequired', lang), 400);
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return c.json([]);
  }

  const result = await fetchMarketQuotes(c.env, symbols);
  return c.json(result);
});

router.get('/meta', async (c) => {
  const lang = c.get('lang') || 'en';
  const symbolsParam = c.req.query('symbols');
  if (!symbolsParam || !symbolsParam.trim()) {
    return c.text(t('coin.symbolsRequired', lang), 400);
  }

  const symbols = symbolsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (symbols.length === 0) {
    return c.json([]);
  }

  const rows = await getCoinsBySymbols(c.env, symbols);
  const mapped = Array.isArray(rows)
    ? rows.map((row) => ({
      symbol: row.symbol,
      name: row.name ?? null,
      logoUrl: row.logo_url ?? null
    }))
    : [];

  return c.json(mapped);
});

router.get('/live/:symbol', async (c) => {
  const lang = c.get('lang') || 'en';
  const symbol = c.req.param('symbol').toLowerCase();
  const coinId = COINGECKO_SYMBOL_MAP[symbol] || symbol;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_last_updated_at=true`,
      { headers: { Accept: 'application/json' } }
    );

    if (!response.ok) {
      return c.json({ error: t('coin.fetchLiveFailed', lang) }, 500);
    }

    const data = await response.json();
    const coinData = data[coinId];

    if (!coinData) {
      return c.json({ error: t('coin.coinNotFound', lang) }, 404);
    }

    return c.json({
      symbol: symbol.toUpperCase(),
      price: coinData.usd,
      change24h: coinData.usd_24h_change,
      volume24h: coinData.usd_24h_vol,
      lastUpdated: coinData.last_updated_at
    });
  } catch (error) {
    console.error('CoinGecko API error:', error);
    return c.json({ error: t('coin.fetchLiveDataFailed', lang) }, 500);
  }
});

router.get('/mywatchlist', requireAuth(), async (c) => {
  const lang = c.get('lang') || 'en';
  const auth = c.get('auth');
  const userId = auth?.userId;
  if (!userId) {
    return c.text(t('coin.userIdMissing', lang), 401);
  }
  const result = await fetchUserWatchlist(c.env, userId);
  return c.json(result);
});

router.post('/mywatchlist/add', requireAuth(), async (c) => {
  const lang = c.get('lang') || 'en';
  const symbol = c.req.query('symbol');
  if (!symbol || !symbol.trim()) {
    return c.text(t('coin.symbolRequired', lang), 400);
  }

  const auth = c.get('auth');
  const userId = auth?.userId;

  if (!userId) {
    return c.text(t('coin.userIdMissing', lang), 401);
  }

  let subscriptionTier = 'free';
  try {
    const profile = await getUserProfile(c.env, userId);
    if (profile?.subscription_tier) {
      subscriptionTier = profile.subscription_tier;
    }
  } catch (e) {
    console.warn('Failed to fetch profile for watchlist limit check', e);
    subscriptionTier = auth?.user?.user_metadata?.subscription_tier || 'free';
  }

  const currentCount = await getWatchlistCount(c.env, userId);
  const limit = getWatchlistLimit(subscriptionTier);

  if (currentCount >= limit) {
    return c.json({
      error: t('coin.watchlistLimitReached', lang),
      currentCount,
      limit,
      tier: subscriptionTier,
      message: subscriptionTier === 'free'
        ? t('coin.watchlistLimitFree', lang)
        : t('coin.watchlistLimitPremium', lang)
    }, 403);
  }

  const exists = await ensureCoinExists(c.env, symbol);
  if (!exists) {
    return c.text(t('coin.coinSymbolNotFound', lang, { symbol }), 404);
  }

  const duplicate = await isWatchlistEntryPresent(c.env, userId, symbol);
  if (duplicate) {
    return c.text(t('coin.coinAlreadyInWatchlist', lang), 400);
  }

  await addWatchlistEntry(c.env, userId, symbol);
  return c.json({
    message: t('coin.coinAddedWatchlist', lang),
    currentCount: currentCount + 1,
    limit
  });
});

router.delete('/mywatchlist/remove', requireAuth(), async (c) => {
  const lang = c.get('lang') || 'en';
  const symbol = c.req.query('symbol');
  if (!symbol || !symbol.trim()) {
    return c.text(t('coin.symbolRequired', lang), 400);
  }

  const auth = c.get('auth');
  const userId = auth?.userId;
  if (!userId) {
    return c.text(t('coin.userIdMissing', lang), 401);
  }

  const existing = await isWatchlistEntryPresent(c.env, userId, symbol);
  if (!existing) {
    return c.text(t('coin.coinNotInWatchlist', lang), 404);
  }

  await removeWatchlistEntry(c.env, userId, symbol);
  return c.json({ message: t('coin.coinRemovedWatchlist', lang) });
});

export default router;
