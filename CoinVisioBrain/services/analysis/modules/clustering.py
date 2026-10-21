import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import logging
from typing import Dict, Any
from data_loader import get_top_symbols, fetch_ohlcv_from_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_market_regime(supabase_client: Any) -> Dict[str, Any]:
    """
    Analyzes the current market regime using K-Means clustering on the Global Market Index.
    """
    logger.info("Starting market regime analysis...")
    
    # 1. Fetch Top 50 Symbols
    symbols = get_top_symbols(limit=50)
    if not symbols:
        logger.error("Failed to fetch top symbols.")
        return {}
        
    # 2. Get Data from DB
    data_map = fetch_ohlcv_from_db(supabase_client, symbols)
    
    if not data_map:
        logger.error("Failed to fetch OHLCV data.")
        return {}
        
    # 3. Create Global Market Index
    all_returns = pd.DataFrame()
    all_volatility = pd.DataFrame()
    
    for symbol, df in data_map.items():
        all_returns[symbol] = df["Returns"]
        all_volatility[symbol] = df["Volatility"]
        
    all_returns.dropna(how='all', inplace=True)
    all_volatility.dropna(how='all', inplace=True)
    
    global_index = pd.DataFrame()
    global_index["Avg_Returns"] = all_returns.mean(axis=1)
    global_index["Avg_Volatility"] = all_volatility.mean(axis=1)
    
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
    cluster_stats = global_index.groupby("Cluster")["Avg_Returns"].mean().sort_values()
    
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
        payload = {
            "regime_label": result["regime_label"],
            "cluster_id": result["cluster_id"],
            "avg_volatility": result["avg_volatility"],
            "avg_return": result["avg_return"],
            "description": result["description"]
        }
        supabase_client.table("market_regime").insert(payload).execute()
        logger.info("Successfully inserted regime data into Supabase.")
    except Exception as e:
        logger.error(f"Failed to insert data into Supabase: {e}")
        
    return result
