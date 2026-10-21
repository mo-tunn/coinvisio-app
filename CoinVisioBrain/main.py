import os
import time
import logging
import threading
import uuid
import sys
import redis
from dotenv import load_dotenv
from database.db_client import get_supabase_client
from modules.market_regime import analyze_market_regime
from modules.anomaly import detect_anomalies
from modules.recommender import generate_recommendations
from modules.llm_analyst import generate_daily_briefing
from modules.iris import ask_iris
from modules.smart_signals import calculate_signals
from modules.rl_optimizer import evaluate_yesterday_signals, update_model_weights

# Configure logging
logging.basicConfig(level=logging.ERROR) # Reduced logging for better UI 
logger = logging.getLogger(__name__)

def run_data_sync(supabase):
    """
    Runs only the data synchronization pipeline (Metadata + Prices).
    """
    print("\n🔄 Starting Data Sync...")
    
    # 0. A. Sync Coin Metadata (Populate 'coins' table)
    try:
        from data_pipeline.fetcher import sync_coin_metadata
        sync_coin_metadata(supabase)
    except Exception as e:
        logger.error(f"Error syncing metadata: {e}")
        print("⚠️ Metadata sync failed.")

    # 0. B. Sync Raw Data (Persist to DB)
    try:
        from data_pipeline.fetcher import sync_daily_data
        sync_daily_data(supabase)
    except Exception as e:
        logger.error(f"Error syncing data: {e}")
        print("⚠️ Data sync failed.")
        
    print("✅ Data Sync Completed.")

def run_analysis(supabase):
    """
    Runs the full analysis pipeline (Assumes data is already in DB).
    """
    print("\n🚀 Starting System Analysis (Using existing data)...")

    # 1. Load Data from DB
    try:
        from data_pipeline.fetcher import fetch_ohlcv_from_db, get_top_symbols
        symbols = get_top_symbols(limit=500)
        data = fetch_ohlcv_from_db(supabase, symbols)
    except Exception as e:
        logger.error(f"Error loading data: {e}")
        return

    if not data:
        logger.warning("No data found in DB. Please run 'Update Data' first.")
        return

    # 2. Market Regime Analysis
    try:
        from modules.market_regime import analyze_market_regime
        # Pass both data (read) and supabase (write)
        regime = analyze_market_regime(data, supabase)
        print(f"📊 Market Regime: {regime.get('regime_label', 'Unknown')}")
    except Exception as e:
        logger.error(f"Error in market regime: {e}")

    # 3. Anomaly Detection
    try:
        from modules.anomaly import detect_anomalies
        anomalies = detect_anomalies(data, supabase)
        print(f"⚠️ Anomalies Detected: {len(anomalies)}")
    except Exception as e:
        logger.error(f"Error in anomaly detection: {e}")

    # 4. Recommendation Engine
    try:
        from modules.recommender import generate_recommendations
        recs = generate_recommendations(data, supabase)
        print(f"💡 Generated Recommendations for {len(recs)} profiles.")
    except Exception as e:
        logger.error(f"Error in recommender: {e}")

    # 5. Smart Signals (ML)
    try:
        from modules.smart_signals import calculate_signals
        signal_count = calculate_signals(data, supabase)
        print(f"📈 Generated {signal_count} Smart Signals.")
    except Exception as e:
        logger.error(f"Error in smart signals: {e}")

    # 6. LLM Analyst
    try:
        from modules.llm_analyst import generate_daily_briefing
        # Generate daily briefing
        generate_daily_briefing(supabase)
    except Exception as e:
        logger.error(f"Error in LLM Analyst: {e}")

    # 7. RL Optimizer (Weights)
    try:
        from modules.rl_optimizer import evaluate_yesterday_signals, update_model_weights
        
        # Evaluate past performance
        evaluate_yesterday_signals(supabase)
        
        # Update weights based on accuracy
        update_model_weights(supabase)
        
    except Exception as e:
        logger.error(f"Error in RL Optimizer: {e}")

    print("\n🏁 System Analysis Complete.")

def _stream_response(session_id: str):
    """
    Listens to Redis channel and prints tokens to stdout for animation effect.
    """
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    
    try:
        r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)
        pubsub = r.pubsub()
        channel = f"iris_response:{session_id}"
        pubsub.subscribe(channel)
        
        for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data']
                if data == "[DONE]":
                    break
                
                # Add a typewriter effect delay
                for char in data:
                    sys.stdout.write(char)
                    sys.stdout.flush()
                    time.sleep(0.02) # Adjust speed here
    except Exception as e:
        logger.error(f"Stream visualization error: {e}")

def check_env_vars():
    """
    Placeholder for checking environment variables.
    """
    pass

def main():
    check_env_vars()
    
    # Initialize Supabase
    try:
        supabase = get_supabase_client()
    except Exception as e:
        print(f"❌ Critical Error: Database connection failed: {e}")
        return
    
    print("\n" + "="*30)
    print(" 🧠 CoinVisio Brain Loaded")
    print("="*30)

    while True:
        print("\n1. Update Data (Sync from CoinGecko/Yahoo)")
        print("2. Run AI Analysis (Use DB Data)")
        print("3. Chat with Iris AI")
        print("4. Start Auto-Analysis Loop (Sync + Analysis)")
        print("5. Exit")
        
        choice = input("\nSelect an option (1-5): ").strip()

        if choice == '1':
            run_data_sync(supabase)
            
        elif choice == '2':
            run_analysis(supabase)
            
        elif choice == '3':
            print("\n💬 Entering Chat Mode (Type 'back' to exit)...")
            from modules.iris import ask_iris
            
            while True:
                user_input = input("\nSorunuzu yazın (örn: PEPE alınır mı?): ").strip()
                if user_input.lower() == 'back':
                    break
                
                if not user_input:
                    continue
                
                print("\nThinking... 🤖")
                try:
                    # Generate Session ID for streaming
                    session_id = str(uuid.uuid4())
                    
                    print("\nIris 🗣️:")
                    print("-" * 20)
                    
                    # Start listener thread for animation
                    listener = threading.Thread(target=_stream_response, args=(session_id,))
                    listener.start()
                    
                    # Call Iris (Blocking, but streams to Redis)
                    # Note: We don't print the return value here because the listener prints it live.
                    ask_iris(supabase, user_input, session_id=session_id)
                    
                    listener.join() # Wait for stream to finish visually
                    print("\n" + "-" * 20)
                    
                except Exception as e:
                    print(f"❌ Error: {e}")
        
        elif choice == '4':
             print("\n🔄 Starting Hourly Auto-Analysis Loop...")
             print("Press Ctrl+C to stop.")
             try:
                 while True:
                     # Full Cycle: Sync -> Analysis
                     run_data_sync(supabase)
                     run_analysis(supabase)
                     print("\n⏳ Waiting 1 hour for next update...")
                     time.sleep(3600)
             except KeyboardInterrupt:
                 print("\n🛑 Loop stopped by user.")
                 
        elif choice == '5':
            print("Goodbye! 👋")
            break
        
        else:
            print("Invalid option. Try again.")

if __name__ == "__main__":
    main()
