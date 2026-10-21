import { toNull } from './parsers.js';

export function mapCoin(row) {
  if (!row) return null;
  return {
    symbol: row.symbol,
    name: row.name,
    logoUrl: row.logo_url ?? null,
    price: row.price ?? row.close ?? null,
    change: row.change ?? row.change_24h ?? null,
    marketCap: row.market_cap ?? null,
    volume: row.volume ?? null
  };
}

export function mapCryptoPrice(row) {
  if (!row) return null;
  return {
    id: row.id,
    symbol: row.symbol,
    recordedAt: row.recorded_at,
    time: row.recorded_at, // frontend expects `time` for chart labels
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume
  };
}

export function mapWatchlistItem(row) {
  if (!row) return null;
  return {
    symbol: row.symbol,
    name: row.coin?.name ?? null,
    logoUrl: row.coin?.logo_url ?? null
  };
}

export function mapDailyInsight(row) {
  if (!row) return null;
  return {
    id: row.id,
    insightText: row.insight_text,
    sentiment: row.sentiment ?? null,
    createdAt: row.created_at ?? null
  };
}

export function mapMarketRegime(row) {
  if (!row) return null;
  return {
    id: row.id,
    regimeLabel: row.regime_label,
    clusterId: row.cluster_id,
    avgVolatility: row.avg_volatility ?? null,
    avgReturn: row.avg_return ?? null,
    description: row.description ?? null,
    createdAt: row.created_at ?? null
  };
}

export function mapSmartSignal(row, includeConfidence) {
  if (!row) return null;
  return {
    id: row.id,
    symbol: row.symbol,
    term: row.term,
    signalType: row.signal_type,
    entryPrice: row.entry_price ?? null,
    targetPrice: row.target_price ?? null,
    stopLoss: row.stop_loss ?? null,
    confidenceScore: row.confidence_score ?? null, // Always include confidence
    createdAt: row.created_at,
    logoUrl: row.coins?.logo_url ?? row.logoUrl ?? null
  };
}

export function mapCoinAnomaly(row) {
  if (!row) return null;
  return {
    id: row.id,
    symbol: row.symbol,
    anomalyScore: row.anomaly_score ?? null,
    anomalyType: row.anomaly_type ?? null,
    priceAtDetection: row.price_at_detection ?? null,
    detectedAt: row.detected_at ?? null
  };
}

export function normalizeCoinRecommendation(coin) {
  if (!coin || typeof coin !== 'object') return coin;
  const rsi = coin.rsi ?? coin.Rsi;
  const price = coin.price ?? coin.Price;
  const symbol = coin.symbol ?? coin.Symbol;
  const returnsValue = coin.returns ?? coin.Returns;
  const volatility = coin.volatility ?? coin.Volatility;
  const volumeChange = coin.volume_change ?? coin.volumeChange ?? coin.VolumeChange;

  return {
    rsi: toNull(rsi),
    price: toNull(price),
    symbol: toNull(symbol),
    returns: toNull(returnsValue),
    volatility: toNull(volatility),
    volume_change: toNull(volumeChange),
    logo: coin.logoUrl ?? coin.logo_url ?? null
  };
}

export function mapRecommendation(row, coinFilterSymbols) {
  if (!row) return null;
  let coins = Array.isArray(row.coins) ? row.coins : [];
  if (coinFilterSymbols) {
    coins = coins.filter((coin) => {
      const symbol = coin?.symbol ?? coin?.Symbol;
      return symbol ? coinFilterSymbols.has(symbol) : false;
    });
  }
  const normalizedCoins = coins.map(normalizeCoinRecommendation);
  return {
    id: row.id,
    riskProfile: row.risk_profile,
    coins: normalizedCoins,
    updatedAt: row.updated_at
  };
}
