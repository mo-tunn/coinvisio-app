import pandas as pd
import numpy as np
import logging
import json
from datetime import datetime
from typing import Dict, Any, List
from data_pipeline import fetcher
from data_pipeline.fetcher import fetch_ohlcv_from_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculates the Relative Strength Index (RSI).
    """
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()

    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def generate_recommendations(data_map: Dict[str, Any], supabase_client: Any) -> List[Dict[str, Any]]:
    """
    Generates crypto recommendations based on rule-based profiles:
    Conservative, Moderate, Aggressive.
    
    Args:
        data_map: Dictionary of OHLCV DataFrames.
        supabase_client: Initialized Supabase client.
        
    Returns:
        List of recommendation objects inserted into DB.
    """
    logger.info("Starting recommendation generation...")
    
    if not data_map:
        logger.error("No data provided for recommendations.")
        return []

    # 3. Process Data & Calculate Scores
    coin_stats = []
    
    for symbol, df in data_map.items():
        if len(df) < 20: 
            continue
            
        try:
            # Calculate RSI
            df["RSI"] = calculate_rsi(df["Close"])
            
            latest = df.iloc[-1]
            
            stats = {
                "symbol": symbol,
                "price": float(latest["Close"]),
                "rsi": float(latest["RSI"]) if not pd.isna(latest["RSI"]) else 50.0,
                "volatility": float(latest.get("Volatility", 0.0)), # Already calculated in fetcher
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
    
    # 4. Filter Profiles
    recommendations_to_insert = []
    
    # --- Profile A: Conservative (Safe) ---
    # Low Volatility, RSI 35-75, Returns > -0.02 (allow small dip)
    subset_con = df_stats[
        (df_stats["volatility"] < 0.06) & # Relaxed from 0.03
        (df_stats["rsi"] >= 35) & (df_stats["rsi"] <= 75)
    ].sort_values(by="volatility", ascending=True) # Lowest volatility first
    
    top_con = subset_con.head(20).to_dict(orient="records")
    recommendations_to_insert.append({
        "risk_profile": "Conservative",
        "coins": top_con, # Can be empty, that's fine
        "updated_at": datetime.utcnow().isoformat()
    })

    # --- Profile B: Aggressive (High Risk/Reward) ---
    # Momentum: Volume Spike or High RSI (Overbought but pumping)
    subset_agg = df_stats[
        (df_stats["volume_change"] > 0.05) | # Relaxed from 0.10, OR condition
        (df_stats["rsi"] > 60)
    ].sort_values(by="volume_change", ascending=False)
    
    top_agg = subset_agg.head(20).to_dict(orient="records")
    recommendations_to_insert.append({
        "risk_profile": "Aggressive",
        "coins": top_agg,
        "updated_at": datetime.utcnow().isoformat()
    })

    # --- Profile C: Moderate (Balanced) ---
    # Good entry points (RSI < 65)
    subset_mod = df_stats[
        (df_stats["rsi"] >= 30) & (df_stats["rsi"] <= 65)
    ].sort_values(by="returns", ascending=False)
    
    top_mod = subset_mod.head(20).to_dict(orient="records")
    recommendations_to_insert.append({
        "risk_profile": "Moderate",
        "coins": top_mod,
        "updated_at": datetime.utcnow().isoformat()
    })
    
    # 5. Insert into Supabase
    try:
        # Sanitize data for JSON compliance (NaN -> None)
        def sanitize_for_json(obj):
            if isinstance(obj, float):
                if pd.isna(obj) or np.isinf(obj):
                    return None
                return obj
            if isinstance(obj, dict):
                return {k: sanitize_for_json(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [sanitize_for_json(i) for i in obj]
            return obj

        cleaned_recommendations = sanitize_for_json(recommendations_to_insert)

        # Check if table allows 'coins' as JSONB. 
        # Assuming table schema: id, risk_profile, coins (json), updated_at
        data, count = supabase_client.table("recommendations").insert(cleaned_recommendations).execute()
        logger.info(f"Successfully inserted {len(cleaned_recommendations)} recommendation profiles.")
    except Exception as e:
        logger.error(f"Failed to insert recommendations into Supabase: {e}")

    return recommendations_to_insert
