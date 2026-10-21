import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import logging
from typing import Dict, Any
from data_pipeline import fetcher

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_market_regime(data_map: Dict[str, Any], supabase_client: Any = None) -> Dict[str, Any]:
    """
    Analyzes the current market regime using K-Means clustering on the Global Market Index.
    
    Args:
        data_map: Dictionary of OHLCV DataFrames (fetched from main.py).
        
    Returns:
        Dict containing the analysis result details.
    """
    logger.info("Starting market regime analysis...")
    
    if not data_map:
        logger.error("No data provided for market regime analysis.")
        return {}
        
    # 3. Create Global Market Index
    # Align all dataframes on date index and calculate mean returns and volatility
    all_returns = pd.DataFrame()
    all_volatility = pd.DataFrame()
    
    for symbol, df in data_map.items():
        # Ensure index is timezone-naive or consistently timezone-aware
        # yfinance returns tz-aware, usually UTC. Good to normalize if needed, but usually fine if all are same.
        all_returns[symbol] = df["Returns"]
        all_volatility[symbol] = df["Volatility"]
        
    # Drop rows where we don't have enough data (start of period)
    all_returns.dropna(how='all', inplace=True)
    all_volatility.dropna(how='all', inplace=True)
    
    # Calculate daily means across the market
    global_index = pd.DataFrame()
    global_index["Avg_Returns"] = all_returns.mean(axis=1)
    global_index["Avg_Volatility"] = all_volatility.mean(axis=1)
    
    # Drop any remaining NaNs
    global_index.dropna(inplace=True)
    
    if global_index.empty:
        logger.error("Global index is empty after processing.")
        return {}
    
    # 4. Scale Features
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(global_index[["Avg_Returns", "Avg_Volatility"]])
    
    # 5. Apply K-Means (k=3)
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    global_index["Cluster"] = kmeans.fit_predict(scaled_features)
    
    # 6. Dynamically Label Clusters
    # Calculate average return for each cluster to determine regime
    cluster_stats = global_index.groupby("Cluster")["Avg_Returns"].mean().sort_values()
    
    # Map cluster IDs to regimes based on sorted average returns
    # Lowest return -> Bear, Middle -> Sideways, Highest -> Bull
    regime_map = {
        cluster_stats.index[0]: "Bear",
        cluster_stats.index[1]: "Sideways",
        cluster_stats.index[2]: "Bull"
    }
    
    global_index["Regime"] = global_index["Cluster"].map(regime_map)
    
    # 7. Identify Latest Regime
    latest_date = global_index.index[-1]
    latest_data = global_index.iloc[-1]
    
    result = {
        "date": latest_date.isoformat(),
        "regime_label": latest_data["Regime"],
        "cluster_id": int(latest_data["Cluster"]),
        "avg_volatility": float(latest_data["Avg_Volatility"]),
        "avg_return": float(latest_data["Avg_Returns"]),
        "description": f"Market is currently in a {latest_data['Regime']} regime."
    }
    
    logger.info(f"Analysis complete. Latest regime: {result['regime_label']}")
    
    # 8. Insert into Supabase
    try:
        # Prepare payload for insertion (excluding 'date' as it's not in the schema)
        payload = {
            "regime_label": result["regime_label"],
            "cluster_id": result["cluster_id"],
            "avg_volatility": result["avg_volatility"],
            "avg_return": result["avg_return"],
            "description": result["description"]
        }
        data, count = supabase_client.table("market_regime").insert(payload).execute()
        logger.info("Successfully inserted regime data into Supabase.")
    except Exception as e:
        logger.error(f"Failed to insert data into Supabase: {e}")
        # We don't raise here to allow the function to return the result even if DB save fails
        
    return result
