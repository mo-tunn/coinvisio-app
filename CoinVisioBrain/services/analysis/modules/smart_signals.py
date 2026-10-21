import pandas as pd
import pandas_ta as ta
import logging
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score
from typing import Any
from data_loader import get_top_symbols, fetch_ohlcv_from_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_signals(supabase_client: Any) -> int:
    """
    Generates smart signals using Technical Analysis and ML Regression.
    """
    logger.info("Starting Smart Signals generation...")
    
    symbols = get_top_symbols(limit=50)
    if not symbols:
        return 0
        
    data_dict = fetch_ohlcv_from_db(supabase_client, symbols)
    
    generated_signals = []
    
    terms = {
        'Short': 1,
        'Mid': 7,
        'Long': 30
    }

    for symbol, df in data_dict.items():
        if df.empty or len(df) < 60:
            continue
            
        try:
            df['RSI'] = df.ta.rsi(length=14)
            df['EMA_20'] = df.ta.ema(length=20)
            df['EMA_50'] = df.ta.ema(length=50)
            df['ATR'] = df.ta.atr(length=14)
            
            df.dropna(inplace=True)
            
            if len(df) < 50:
                continue
                
            current_price = df['Close'].iloc[-1]
            current_atr = df['ATR'].iloc[-1]
            features = ['Close', 'RSI', 'EMA_20', 'EMA_50', 'Volume']
            
            for term_name, shift_val in terms.items():
                df[f'Target_{term_name}'] = df['Close'].shift(-shift_val)
                train_df = df.dropna(subset=[f'Target_{term_name}'])
                
                if len(train_df) < 30:
                    continue
                    
                X = train_df[features]
                y = train_df[f'Target_{term_name}']
                
                model = LinearRegression()
                model.fit(X, y)
                
                predictions = model.predict(X)
                confidence = r2_score(y, predictions)
                
                if confidence < 0.5:
                    continue
                    
                latest_features = df[features].iloc[[-1]]
                predicted_price = model.predict(latest_features)[0]
                
                signal_type = "NEUTRAL"
                if predicted_price > current_price * 1.01:
                    signal_type = "LONG"
                elif predicted_price < current_price * 0.99:
                    signal_type = "SHORT"
                
                if signal_type == "NEUTRAL":
                    continue
                    
                stop_loss = 0.0
                if signal_type == "LONG":
                    stop_loss = current_price - (2 * current_atr)
                elif signal_type == "SHORT":
                    stop_loss = current_price + (2 * current_atr)
                
                payload = {
                    "symbol": symbol,
                    "term": term_name,
                    "signal_type": signal_type,
                    "entry_price": float(current_price),
                    "target_price": float(predicted_price),
                    "stop_loss": float(stop_loss),
                    "confidence_score": float(confidence)
                }
                
                generated_signals.append(payload)
                
        except Exception as e:
            logger.error(f"Error processing {symbol}: {e}")
            continue

    if generated_signals:
        try:
            supabase_client.table("smart_signals").insert(generated_signals).execute()
            logger.info(f"Successfully inserted {len(generated_signals)} signals.")
            return len(generated_signals)
        except Exception as e:
            logger.error(f"Error inserting signals: {e}")
            return 0
    
    return 0
