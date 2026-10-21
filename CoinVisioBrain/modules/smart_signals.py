import pandas as pd
import pandas_ta as ta
import logging
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from typing import Any, Dict, List
from concurrent.futures import ProcessPoolExecutor, as_completed
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_single_symbol(args) -> List[Dict[str, Any]]:
    """
    Worker function to process a single symbol in parallel.
    Args must be a tuple: (symbol, df)
    """
    symbol, df = args
    results = []

    if df.empty or len(df) < 60:
        return []

    try:
        # Create a copy to avoid SettingWithCopy warnings in threads/processes
        df = df.copy()

        # 3. Feature Engineering with pandas_ta
        # RSI
        df['RSI'] = df.ta.rsi(length=14)
        # EMAs
        df['EMA_20'] = df.ta.ema(length=20)
        df['EMA_50'] = df.ta.ema(length=50)
        # ATR for Stop Loss
        df['ATR'] = df.ta.atr(length=14)
        
        # Drop NaN created by indicators
        df.dropna(inplace=True)
        
        if len(df) < 50:
            return []
            
        current_price = df['Close'].iloc[-1]
        current_atr = df['ATR'].iloc[-1]
        
        # Base features for ML
        features = ['Close', 'RSI', 'EMA_20', 'EMA_50', 'Volume']
        
        terms = {
            'Short': 1,    # Predict 1 day ahead
            'Mid': 7,      # Predict 7 days ahead
            'Long': 30     # Predict 30 days ahead
        }

        for term_name, shift_val in terms.items():
            # Create Target
            df[f'Target_{term_name}'] = df['Close'].shift(-shift_val)
            
            # Prepare Train Set (Drop NaNs from shifting)
            train_df = df.dropna(subset=[f'Target_{term_name}'])
            
            if len(train_df) < 30:
                continue
                
            X = train_df[features]
            y = train_df[f'Target_{term_name}']
            
            # Train Model
            model = LinearRegression()
            model.fit(X, y)
            
            # Evaluate Confidence (R2 Score)
            predictions = model.predict(X)
            confidence = r2_score(y, predictions)
            
            # Filter weak models
            if confidence < 0.5:
                continue
                
            # Predict Future Price using LATEST data point
            latest_features = df[features].iloc[[-1]]
            predicted_price = model.predict(latest_features)[0]
            
            # Determine Signal
            signal_type = "NEUTRAL"
            if predicted_price > current_price * 1.01:
                signal_type = "LONG"
            elif predicted_price < current_price * 0.99:
                signal_type = "SHORT"
            
            if signal_type == "NEUTRAL":
                continue
                
            # Risk Management
            stop_loss = 0.0
            if signal_type == "LONG":
                stop_loss = current_price - (2 * current_atr)
            elif signal_type == "SHORT":
                stop_loss = current_price + (2 * current_atr)
            
            # Construct Payload
            payload = {
                "symbol": symbol,
                "term": term_name,
                "signal_type": signal_type,
                "entry_price": float(current_price),
                "target_price": float(predicted_price),
                "stop_loss": float(stop_loss),
                "confidence_score": float(confidence)
            }
            
            results.append(payload)

    except Exception as e:
        logger.error(f"Error processing {symbol} in parallel worker: {e}")
        return []

    return results

def calculate_signals(data_dict: Dict[str, Any], supabase_client: Any) -> int:
    """
    Generates smart signals using Technical Analysis and ML Regression.
    Uses Parallel Processing to speed up execution.
    Returns the number of signals generated.
    """
    logger.info("Starting Smart Signals generation (Parallel)...")
    
    if not data_dict:
        logger.warning("No data provided for smart signals.")
        return 0
    
    generated_signals = []
    
    # Determined optimized worker count for Hugging Face Free Tier (2 vCPUs)
    # We use 2 workers to match the cores. 
    # Using too many workers on small container might cause context switching overhead.
    max_workers = min(os.cpu_count() or 2, 4) 
    logger.info(f"Using {max_workers} separate processes for ML training.")

    # Prepare arguments for map
    # We convert dict items to list of tuples for map input
    tasks = [(symbol, df) for symbol, df in data_dict.items()]

    try:
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # map returns an iterator of results in order
            # processing "tasks" in parallel
            raw_results = list(executor.map(analyze_single_symbol, tasks))
            
            # Flatten the list of lists
            for res_list in raw_results:
                generated_signals.extend(res_list)
                
    except Exception as e:
        logger.error(f"Critical error in parallel execution: {e}")
        return 0

    # 4. Save to Database
    if generated_signals:
        try:
            # Batch insertion
            # Supabase might have limits on payload size, so batching by 1000 is safer
            batch_size = 1000
            for i in range(0, len(generated_signals), batch_size):
                batch = generated_signals[i:i + batch_size]
                data, count = supabase_client.table("smart_signals").insert(batch).execute()
                
            logger.info(f"Successfully inserted {len(generated_signals)} signals.")
            print(f"✅ Generated {len(generated_signals)} Smart Signals (Parallel Mode).")
            return len(generated_signals)
        except Exception as e:
            logger.error(f"Error inserting signals: {e}")
            print("❌ Error saving signals.")
            return 0
    else:
        logger.info("No signals generated capable of passing filters.")
        print("⚠️ No strong signals found.")
        return 0
