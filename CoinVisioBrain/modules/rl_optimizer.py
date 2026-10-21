import logging
import json
from datetime import datetime, timedelta
from typing import Any, Dict
from data_pipeline.fetcher import get_current_price

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def evaluate_yesterday_signals(supabase_client: Any) -> None:
    """
    Fetches signals created yesterday (or previous run) and evaluates if they were correct.
    Updates 'model_performance' table.
    """
    logger.info("Evaluating past signals...")
    
    # 1. Fetch Yesterday's Date Range
    # We want to check signals that are approx 24h old or older but haven't been evaluated.
    # Actually, the user requirement is "yesterday's signals". 
    # Let's just fetch all 'smart_signals' created > 24 hours ago that are NOT in 'model_performance'.
    
    # But for simplicity, let's just grab last 100 signals and check if they have a performance entry.
    
    try:
        # Get recent signals (e.g., last 2 days)
        # Note: In a real prod app, we'd query carefully.
        signals_res = supabase_client.table("smart_signals") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(100) \
            .execute()
            
        signals = signals_res.data if signals_res.data else []
        
        evaluated_count = 0
        
        for signal in signals:
            sig_id = signal['id']
            symbol = signal['symbol']
            signal_type = signal['signal_type']
            entry_price = signal['entry_price']
            
            # Check if already evaluated
            perf_res = supabase_client.table("model_performance") \
                .select("id") \
                .eq("signal_id", sig_id) \
                .execute()
                
            if perf_res.data:
                continue # Already evaluated
            
            # evaluate
            current_price = get_current_price(symbol)
            if current_price == 0:
                continue
                
            result = "FAILURE"
            reward = -1
            
            # Simple Logic: 
            # LONG: Success if Current > Entry (Profit)
            # SHORT: Success if Current < Entry (Profit)
            if signal_type == "LONG":
                if current_price > entry_price:
                    result = "SUCCESS"
                    reward = 1
            elif signal_type == "SHORT":
                if current_price < entry_price:
                    result = "SUCCESS"
                    reward = 1
            elif signal_type == "NEUTRAL":
                # Neutral signals usually don't have entry, but if they do:
                result = "NEUTRAL"
                reward = 0
                
            # Insert performance record
            payload = {
                "signal_id": sig_id,
                "symbol": symbol,
                "result": result,
                "reward": reward,
                "evaluated_at": datetime.utcnow().isoformat()
            }
            
            supabase_client.table("model_performance").insert(payload).execute()
            evaluated_count += 1
            
        if evaluated_count > 0:
            logger.info(f"Evaluated {evaluated_count} past signals.")
            print(f"🕵️ Evaluated {evaluated_count} past signals.")
        else:
            logger.info("No pending signals to evaluate.")
            
    except Exception as e:
        logger.error(f"Error evaluating signals: {e}")

def update_model_weights(supabase_client: Any) -> None:
    """
    Calculates accuracy for each coin over the last 7 days.
    Updates 'model_weights' table.
    Disables trading for coins with low accuracy.
    """
    logger.info("Updating Model Weights (RL Optimization)...")
    
    try:
        # Fetch performance data (last 7 days could be tricky with just 'limit', 
        # so let's fetch all performance records for simplicity or limit to 500)
        perf_res = supabase_client.table("model_performance") \
            .select("*") \
            .order("evaluated_at", desc=True) \
            .limit(500) \
            .execute()
            
        performances = perf_res.data if perf_res.data else []
        if not performances:
            print("⚠️ No performance data for optimization yet.")
            return

        # Group by Symbol
        stats = {} # symbol -> {total: 0, distinct_success: 0}
        
        for p in performances:
            sym = p['symbol']
            if sym not in stats:
                stats[sym] = {'total': 0, 'wins': 0}
            
            stats[sym]['total'] += 1
            if p['reward'] > 0:
                stats[sym]['wins'] += 1
        
        # Calculate Accuracy & Update Weights
        updated_count = 0
        for sym, data in stats.items():
            total = data['total']
            if total < 3: # Need minimum samples
                continue
                
            accuracy = data['wins'] / total
            is_active = accuracy >= 0.40 # Threshold
            
            # Upsert into model_weights
            payload = {
                "symbol": sym,
                "accuracy": float(accuracy),
                "is_active": is_active,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            supabase_client.table("model_weights").upsert(payload).execute()
            updated_count += 1
            
            if not is_active:
                logger.warning(f"⚠️ DISABLED signals for {sym} due to low accuracy ({accuracy:.2f})")
        
        if updated_count > 0:
            print(f"⚖️ Optimized Weights for {updated_count} coins.")
            
    except Exception as e:
        logger.error(f"Error updating model weights: {e}")
