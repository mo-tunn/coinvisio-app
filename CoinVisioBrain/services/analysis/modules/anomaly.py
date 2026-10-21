import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import logging
from typing import Dict, Any, List
from data_loader import get_top_symbols, fetch_ohlcv_from_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def detect_anomalies(supabase_client: Any) -> List[Dict[str, Any]]:
    """
    Detects anomalies in the crypto market using Isolation Forest on Returns and Volume_Change.
    """
    logger.info("Starting anomaly detection...")
    
    start_symbol_fetch = get_top_symbols(limit=50)
    symbols = start_symbol_fetch if start_symbol_fetch else []

    if not symbols:
        logger.error("Failed to fetch top symbols.")
        return []
        
    # 2. Get Data from DB
    data_map = fetch_ohlcv_from_db(supabase_client, symbols)
    
    if not data_map:
        logger.error("Failed to fetch OHLCV data.")
        return []
        
    detected_anomalies = []
    
    # 3. Iterate and Detect
    for symbol, df in data_map.items():
        if len(df) < 30: 
            continue
            
        try:
            features = df[["Returns", "Volume_Change"]].fillna(0)
            
            model = IsolationForest(contamination=0.05, random_state=42)
            df["Anomaly"] = model.fit_predict(features)
            
            latest_row = df.iloc[-1]
            
            if latest_row["Anomaly"] == -1:
                anomaly_type = "Anomaly"
                if latest_row["Returns"] < -0.05:
                    anomaly_type = "High Volume Crash" if latest_row["Volume_Change"] > 0.5 else "Crash"
                elif latest_row["Returns"] > 0.05:
                    anomaly_type = "High Volume Pump" if latest_row["Volume_Change"] > 0.5 else "Pump"
                elif latest_row["Volume_Change"] > 2.0:
                    anomaly_type = "Volume Spike"
                    
                anomaly_record = {
                    "symbol": symbol,
                    "anomaly_score": float(model.decision_function(features.iloc[[-1]])[0]),
                    "anomaly_type": anomaly_type,
                    "price_at_detection": float(latest_row["Close"]),
                    "detected_at": latest_row.name.isoformat()
                }
                
                detected_anomalies.append(anomaly_record)
                logger.info(f"Anomaly detected for {symbol}: {anomaly_type}")
                
        except Exception as e:
            logger.error(f"Error processing {symbol} for anomalies: {e}")
            continue
    
    # 4. Insert into Supabase
    if detected_anomalies:
        try:
            payload = [{
                "symbol": a["symbol"],
                "anomaly_type": a["anomaly_type"],
                "anomaly_score": a["anomaly_score"],
                "price_at_detection": a["price_at_detection"]
            } for a in detected_anomalies]
            
            supabase_client.table("coin_anomalies").insert(payload).execute()
            logger.info(f"Successfully inserted {len(payload)} anomalies into Supabase.")
            
        except Exception as e:
            logger.error(f"Failed to insert anomalies into Supabase: {e}")
    else:
        logger.info("No anomalies detected today.")
            
    return detected_anomalies
