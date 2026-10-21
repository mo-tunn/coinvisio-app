import time
import logging
from datetime import datetime
from typing import Any
from db_client import get_supabase_client
from data_utils import get_current_price

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def evaluate_yesterday_signals(supabase_client: Any) -> None:
    logger.info("Evaluating past signals...")
    try:
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
            
            perf_res = supabase_client.table("model_performance") \
                .select("id") \
                .eq("signal_id", sig_id) \
                .execute()
                
            if perf_res.data:
                continue 
            
            current_price = get_current_price(symbol)
            if current_price == 0:
                continue
                
            result = "FAILURE"
            reward = -1
            
            if signal_type == "LONG":
                if current_price > entry_price:
                    result = "SUCCESS"
                    reward = 1
            elif signal_type == "SHORT":
                if current_price < entry_price:
                    result = "SUCCESS"
                    reward = 1
            elif signal_type == "NEUTRAL":
                result = "NEUTRAL"
                reward = 0
                
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
    except Exception as e:
        logger.error(f"Error evaluating signals: {e}")

def update_model_weights(supabase_client: Any) -> None:
    logger.info("Updating Model Weights (RL Optimization)...")
    try:
        perf_res = supabase_client.table("model_performance") \
            .select("*") \
            .order("evaluated_at", desc=True) \
            .limit(500) \
            .execute()
            
        performances = perf_res.data if perf_res.data else []
        if not performances:
            return

        stats = {} 
        for p in performances:
            sym = p['symbol']
            if sym not in stats:
                stats[sym] = {'total': 0, 'wins': 0}
            stats[sym]['total'] += 1
            if p['reward'] > 0:
                stats[sym]['wins'] += 1
        
        updated_count = 0
        for sym, data in stats.items():
            total = data['total']
            if total < 3: 
                continue
                
            accuracy = data['wins'] / total
            is_active = accuracy >= 0.40 
            
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
            logger.info(f"Optimized Weights for {updated_count} coins.")
    except Exception as e:
        logger.error(f"Error updating model weights: {e}")

if __name__ == "__main__":
    logger.info("RL Optimizer Service Started 🚀")
    try:
        supabase = get_supabase_client()
        while True:
            evaluate_yesterday_signals(supabase)
            update_model_weights(supabase)
            logger.info("Sleeping for 1 hour...")
            time.sleep(3600)
    except Exception as e:
        logger.error(f"Critical Error in RL Optimizer: {e}")
