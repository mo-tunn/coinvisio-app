import pandas as pd
import numpy as np
import logging
import json
from datetime import datetime
from typing import Dict, Any, List
from data_loader import get_top_symbols, fetch_ohlcv_from_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def generate_recommendations(supabase_client: Any) -> List[Dict[str, Any]]:
    logger.info("Starting recommendation generation...")
    
    symbols = get_top_symbols(limit=50)
    if not symbols:
        logger.error("Failed to fetch top symbols.")
        return []
        
    data_map = fetch_ohlcv_from_db(supabase_client, symbols)
    
    if not data_map:
        logger.error("Failed to fetch OHLCV data.")
        return []

    coin_stats = []
    
    for symbol, df in data_map.items():
        if len(df) < 20: 
            continue
            
        try:
            df["RSI"] = calculate_rsi(df["Close"])
            latest = df.iloc[-1]
            
            stats = {
                "symbol": symbol,
                "price": float(latest["Close"]),
                "rsi": float(latest["RSI"]) if not pd.isna(latest["RSI"]) else 50.0,
                "volatility": float(latest.get("Volatility", 0.0)),
                "returns": float(latest.get("Returns", 0.0)),
                "volume_change": float(latest.get("Volume_Change", 0.0))
            }
            coin_stats.append(stats)
            
        except Exception as e:
            logger.error(f"Error processing {symbol} for recommendations: {e}")
            continue

    if not coin_stats:
        return []
        
    df_stats = pd.DataFrame(coin_stats)
    
    recommendations_to_insert = []
    
    # 1. Conservative
    subset_con = df_stats[
        (df_stats["volatility"] < 0.03) &
        (df_stats["rsi"] >= 40) & (df_stats["rsi"] <= 70) &
        (df_stats["returns"] > 0)
    ].sort_values(by="volatility", ascending=True)
    
    top_con = subset_con.head(3).to_dict(orient="records")
    recommendations_to_insert.append({
        "risk_profile": "Conservative",
        "coins": top_con,
        "updated_at": datetime.utcnow().isoformat()
    })

    # 2. Aggressive
    subset_agg = df_stats[
        (df_stats["volume_change"] > 0.10) &
        (df_stats["rsi"] > 50)
    ].sort_values(by="volume_change", ascending=False)
    
    top_agg = subset_agg.head(3).to_dict(orient="records")
    recommendations_to_insert.append({
        "risk_profile": "Aggressive",
        "coins": top_agg,
        "updated_at": datetime.utcnow().isoformat()
    })

    # 3. Moderate
    subset_mod = df_stats[
        (df_stats["rsi"] >= 30) & (df_stats["rsi"] <= 60) &
        (df_stats["returns"] > 0)
    ].sort_values(by="rsi", ascending=True)
    
    top_mod = subset_mod.head(3).to_dict(orient="records")
    recommendations_to_insert.append({
        "risk_profile": "Moderate",
        "coins": top_mod,
        "updated_at": datetime.utcnow().isoformat()
    })
    
    try:
        supabase_client.table("recommendations").insert(recommendations_to_insert).execute()
        logger.info(f"Successfully inserted {len(recommendations_to_insert)} recommendation profiles.")
    except Exception as e:
        logger.error(f"Failed to insert recommendations into Supabase: {e}")

    return recommendations_to_insert
