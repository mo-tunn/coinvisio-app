import yfinance as yf
import pandas as pd
import requests
import numpy as np
import logging
import json
import os
import redis
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

STABLECOINS = {"USDT", "USDC", "DAI", "FDUSD", "TUSD", "USDD", "USDP"}

CACHE_DURATION_SECONDS = 900  # 15 minutes

def get_redis_client():
    """Returns a Redis client instance."""
    try:
        redis_host = os.getenv("REDIS_HOST", "redis")
        return redis.Redis(host=redis_host, port=6379, db=0, decode_responses=True)
    except Exception as e:
        logger.warning(f"Could not connect to Redis: {e}")
        return None

def get_top_symbols(limit: int = 50) -> List[str]:
    """
    Fetches the top market cap coins from CoinGecko API with Redis caching.
    """
    redis_client = get_redis_client()
    cache_key = f"top_symbols:{limit}"

    # 1. Try Cache
    if redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                logger.info("Using cached top symbols (Redis).")
                return json.loads(cached_data)
        except Exception as e:
            logger.error(f"Redis read error: {e}")

    # 2. Fetch from API
    url = "https://api.coingecko.com/api/v3/coins/markets"
    per_page = 250
    pages = (limit + per_page - 1) // per_page
    
    symbols = []
    
    try:
        logger.info(f"Fetching top {limit} symbols from CoinGecko API...")
        
        for page in range(1, pages + 1):
            attempts = 0
            max_retries = 3
            while attempts < max_retries:
                try:
                    params = {
                        "vs_currency": "usd",
                        "order": "market_cap_desc",
                        "per_page": per_page, 
                        "page": page,
                        "sparkline": "false"
                    }
                    
                    response = requests.get(url, params=params, timeout=15)
                    
                    # Handle Rate Limit
                    if response.status_code == 429:
                        logger.warning(f"Rate Limit (429) in get_top_symbols page {page}. Waiting 60s...")
                        time.sleep(60)
                        attempts += 1
                        continue
    
                    response.raise_for_status()
                    data = response.json()
                    
                    for coin in data:
                        symbol = coin["symbol"].upper()
                        if symbol not in STABLECOINS:
                            symbols.append(f"{symbol}-USD")
                            
                        if len(symbols) >= limit:
                            break
                    
                    # Success, next page
                    break
                    
                except Exception as e:
                    logger.error(f"Error fetching page {page} attempt {attempts+1}: {e}")
                    attempts += 1
                    time.sleep(5)

            if len(symbols) >= limit:
                break
                
            # Rate limit buffer between pages
            logger.info("Waiting 10s between pages...")
            time.sleep(10)

    except Exception as e:
        logger.error(f"Error fetching data from CoinGecko: {e}")
        # Try fallback cache
        if redis_client:
            try:
                cached = redis_client.get(cache_key)
                if cached: return json.loads(cached)
            except: pass
        return ["BTC-USD", "ETH-USD", "SOL-USD"]

    # 3. Update Cache
    if symbols and redis_client:
        try:
            redis_client.setex(cache_key, CACHE_DURATION_SECONDS, json.dumps(symbols))
        except Exception as e:
            logger.error(f"Redis write error: {e}")
        
    return symbols

import time

def sync_coin_metadata(supabase_client: Any) -> None:
    """
    Fetches top coins metadata from CoinGecko and upserts to 'coins' table.
    Fetching 600 to ensure we have >500 after filtering stablecoins.
    """
    logger.info("Syncing coin metadata (logos, names, slugs)...")
    
    url = "https://api.coingecko.com/api/v3/coins/markets"
    limit = 600 # Fetch more to cover stablecoin filtering gaps
    per_page = 250
    pages = (limit + per_page - 1) // per_page
    
    total_synced = 0
    
    for page in range(1, pages + 1):
        attempts = 0
        max_retries = 3
        while attempts < max_retries:
            try:
                params = {
                    "vs_currency": "usd",
                    "order": "market_cap_desc",
                    "per_page": per_page, 
                    "page": page,
                    "sparkline": "false",
                    "locale": "en"
                }
                
                response = requests.get(url, params=params, timeout=20)
                
                if response.status_code == 429:
                    logger.warning(f"Rate Limit (429) on page {page}. Waiting 60s...")
                    time.sleep(60)
                    attempts += 1
                    continue
                    
                response.raise_for_status()
                data = response.json()
                
                # Deduplicate by symbol to prevent "ON CONFLICT DO UPDATE" error
                unique_records = {}
                
                for coin in data:
                    symbol_raw = coin["symbol"].upper()
                    if symbol_raw in STABLECOINS:
                        continue
                        
                    # Format compatibility: BTC -> BTC-USD
                    symbol_formatted = f"{symbol_raw}-USD"
                    
                    # Check if we already have this symbol in this batch
                    if symbol_formatted in unique_records:
                       continue
    
                    record = {
                        "symbol": symbol_formatted,
                        "name": coin["name"],
                        "slug": coin["id"],
                        "logo_url": coin["image"],
                        "is_active": True,
                        # created_at is automatic usually
                    }
                    unique_records[symbol_formatted] = record
                
                payload = list(unique_records.values())
                
                if payload:
                    # Upsert to 'coins' table
                    supabase_client.table("coins").upsert(
                        payload, on_conflict="symbol"
                    ).execute()
                    total_synced += len(payload)
                
                # Success, break retry loop
                break
                
            except Exception as e:
                logger.error(f"Error syncing metadata page {page} (Attempt {attempts+1}): {e}")
                attempts += 1
                time.sleep(5) # Short wait on other errors
            
        # Rate Limit Safety: CoinGecko Free Tier is strict.
        # Wait 12 seconds between pages to stay well under limits.
        logger.info("Waiting 12s for API rate limit...")
        time.sleep(12)
            
    logger.info(f"Synced metadata for {total_synced} coins.")
    print(f"🖼️  Synced metadata for {total_synced} coins to 'coins' table.")

def fetch_ohlcv_data(symbols: List[str], period: str = "6mo", interval: str = "1h") -> Dict[str, pd.DataFrame]:
    """
    Fetches OHLCV data for a list of symbols using yfinance and calculates technical indicators.
    
    Args:
        symbols (List[str]): List of ticker symbols (e.g., ['BTC-USD', 'ETH-USD']).
        period (str): Data period to download (default: "6mo").
        interval (str): Data interval (default: "1d").
        
    Returns:
        Dict[str, pd.DataFrame]: A dictionary where keys are symbols and values are processed DataFrames.
    """
    processed_data = {}
    
    for symbol in symbols:
        try:
            logger.info(f"Fetching data for {symbol}...")
            # Download data
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            
            if df.empty:
                logger.warning(f"No data found for {symbol}. Skipping.")
                continue
                
            # Calculate Technical Indicators
            
            # Returns: Daily percentage change
            df["Returns"] = df["Close"].pct_change()
            
            # Volatility: Rolling standard deviation of Returns (window=7)
            df["Volatility"] = df["Returns"].rolling(window=7).std()
            
            # Volume_Change: Percentage change in Volume
            df["Volume_Change"] = df["Volume"].pct_change()
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            
            # Clean data (drop NaNs created by lagging indicators)
            df.dropna(inplace=True)
            
            if df.empty:
                logger.warning(f"Data for {symbol} is empty after cleanup. Skipping.")
                continue
            
            processed_data[symbol] = df
            
        except Exception as e:
            logger.error(f"Error fetching/processing data for {symbol}: {e}")
            continue
            
    return processed_data

def sync_daily_data(supabase_client: Any, incremental: bool = True, symbols: List[str] = None) -> None:
    """
    Fetches raw OHLCV data from yfinance and persists it to Supabase 'crypto_prices'.
    
    Args:
        supabase_client: The Supabase client.
        incremental: If True, checks DB for last date and only fetches new data.
        symbols: Optional list of symbols to sync. If None, fetches top 500.
    """
    logger.info(f"Syncing raw data to Supabase (Incremental: {incremental})...")
    
    if symbols is None:
        symbols = get_top_symbols(limit=500)
    
    if not symbols:
        logger.warning("No symbols to sync.")
        return

    total_synced = 0
    for symbol in symbols:
        try:
            # Rate Limit Protection for Yahoo Finance
            time.sleep(1.0)
            
            ticker = yf.Ticker(symbol)
            start_date = None
            
            if incremental:
                # Check the last 'recorded_at' for this symbol
                try:
                    res = supabase_client.table("crypto_prices") \
                        .select("recorded_at") \
                        .eq("symbol", symbol) \
                        .order("recorded_at", desc=True) \
                        .limit(1) \
                        .execute()
                    
                    if res.data:
                        last_iso = res.data[0]["recorded_at"]
                        # Extract the date part (YYYY-MM-DD)
                        # We use this as start date. Yfinance start is inclusive,
                        # so it will re-fetch the last day, allowing updates to the current incomplete candle.
                        start_date = last_iso.split("T")[0]
                        
                        # Optional: If the last date is today, we still fetch to update "Today's" candle
                        # Logic holds: start="Today" -> returns Today's candle.
                except Exception as db_err:
                    logger.warning(f"Failed to check last date for {symbol}: {db_err}")
            
            # Fetch data based on incremental check
            # We use '1h' interval to capture intraday movements, then resample to 6h.
            
            if start_date:
                # logger.info(f"Fetching {symbol} starting from {start_date} (1h interval)")
                df = ticker.history(start=start_date, interval="1h")
            else:
                # Full history (2y) with 1h interval
                # logger.info(f"Fetching full 2y history for {symbol} (1h interval)")
                df = ticker.history(period="2y", interval="1h")
            
            if df.empty:
                continue
            
            # --- 6-Hour Aggregation ---
            # Resample to 6h candles (00:00, 06:00, 12:00, 18:00)
            agg_dict = {
                "Open": "first",
                "High": "max",
                "Low": "min",
                "Close": "last",
                "Volume": "sum"
            }
            # Ensure index is datetime for resampling
            if not isinstance(df.index, pd.DatetimeIndex):
                 df.index = pd.to_datetime(df.index)
                 
            df_6h = df.resample("6h").agg(agg_dict)
            
            # Drop rows where Open is NaN (result of empty bins)
            df_6h.dropna(subset=["Open"], inplace=True)
            
            # Prepare payload
            payload = []
            for date, row in df_6h.iterrows():
                # Filter: Skip invalid volume (aggregated sum)
                # Now that we sum volume over 6h, 0 means REALLY no volume for 6 hours.
                if pd.isna(row["Volume"]) or float(row["Volume"]) <= 0:
                    continue

                # Filter out timezone info to ensure compatibility or normalize to UTC
                
                record = {
                    "symbol": symbol,
                    "recorded_at": date.isoformat(),
                    "open": float(row["Open"]),
                    "high": float(row["High"]),
                    "low": float(row["Low"]),
                    "close": float(row["Close"]),
                    "volume": float(row["Volume"])
                }
                payload.append(record)
                
            # Batch upsert
            if payload:
                # Upsert based on symbol+recorded_at unique constraint
                # Since 'recorded_at' now includes time (hour), each hour is a unique row.
                # FIX: 413 Request Entity Too Large. 
                # Split payload into chunks (e.g., 1000 records per request)
                
                BATCH_SIZE = 1000
                for i in range(0, len(payload), BATCH_SIZE):
                    chunk = payload[i : i + BATCH_SIZE]
                    try:
                        supabase_client.table("crypto_prices").upsert(
                            chunk, on_conflict="symbol,recorded_at"
                        ).execute()
                    except Exception as chunk_err:
                        logger.error(f"Error syncing chunk {i//BATCH_SIZE + 1} for {symbol}: {chunk_err}")
                
                total_synced += 1
                
        except Exception as e:
            logger.error(f"Error syncing {symbol}: {e}")
            continue
            
    logger.info(f"Synced data for {total_synced} coins.")
    print(f"💾 Synced raw data for {total_synced} coins to Supabase.")

def fetch_ohlcv_from_db(supabase_client: Any, symbols: List[str]) -> Dict[str, pd.DataFrame]:
    """
    Reads raw data from Supabase 'crypto_prices' and calculates indicators.
    Replaces fetch_ohlcv_data for DB usage.
    """
    processed_data = {}
    
    for symbol in symbols:
        try:
            # Fetch raw data
            # Supabase default limit is 1000, which covers 2y daily data (730 rows).
            response = supabase_client.table("crypto_prices") \
                .select("*") \
                .eq("symbol", symbol) \
                .order("recorded_at", desc=False) \
                .execute()
                
            data = response.data
            if not data:
                logger.warning(f"No DB data for {symbol}.")
                continue
                
            # Convert to DataFrame
            df = pd.DataFrame(data)
            df["Date"] = pd.to_datetime(df["recorded_at"])
            df.set_index("Date", inplace=True)
            df.sort_index(inplace=True)
            
            # Rename columns to match yfinance output expectations (Capitalized)
            df.rename(columns={
                "open": "Open",
                "high": "High",
                "low": "Low",
                "close": "Close",
                "volume": "Volume"
            }, inplace=True)
            
            # Retrieve numeric columns as float
            cols = ["Open", "High", "Low", "Close", "Volume"]
            df[cols] = df[cols].astype(float)
            
            # --- Indicator Calculation (Same as original fetcher) ---
            # Returns
            df["Returns"] = df["Close"].pct_change()
            
            # Volatility (7d rolling std)
            df["Volatility"] = df["Returns"].rolling(window=7).std()
            
            # Volume Change
            df["Volume_Change"] = df["Volume"].pct_change()
            df.replace([np.inf, -np.inf], np.nan, inplace=True)
            
            # Clean
            df.dropna(inplace=True)
            
            if not df.empty:
                processed_data[symbol] = df
                
        except Exception as e:
            logger.error(f"Error loading {symbol} from DB: {e}")
            continue
            
    return processed_data

def get_current_price(symbol: str) -> float:
    """
    Fetches the current price for a single symbol.
    """
    try:
        ticker = yf.Ticker(symbol)
        # Fast approach: Get last 1 day history
        df = ticker.history(period="1d")
        if not df.empty:
            return df["Close"].iloc[-1]
        return 0.0
    except Exception:
        return 0.0
