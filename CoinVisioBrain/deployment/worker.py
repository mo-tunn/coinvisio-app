import os
import sys
import time
import logging
import signal
import threading
from dotenv import load_dotenv
from flask import Flask

# Add parent directory to path to allow importing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.db_client import get_supabase_client
from main import run_data_sync, run_analysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flag for graceful shutdown
shutdown_flag = False

# Flask App for Health Check
app = Flask(__name__)

@app.route("/")
def health_check():
    return "CoinVisio Brain Worker is RUNNING 🚀", 200

def run_flask():
    """Run Flask server in a separate thread"""
    port = int(os.environ.get("PORT", 7860))
    app.run(host="0.0.0.0", port=port, use_reloader=False)

def signal_handler(signum, frame):
    global shutdown_flag
    logger.info("Received termination signal. Shutting down gracefully...")
    shutdown_flag = True

def worker_loop():
    """
    Main loop for background worker.
    """
    logger.info("🚀 Starting CoinVisio Brain Worker...")
    
    # Check env vars
    if not os.getenv("SUPABASE_URL") or not os.getenv("SUPABASE_KEY"):
        logger.error("Missing Supabase credentials in environment variables.")
        return

    try:
        supabase = get_supabase_client()
        logger.info("✅ Connected to Supabase.")
    except Exception as e:
        logger.error(f"Failed to connect to DB: {e}")
        return

    # Loop
    while not shutdown_flag:
        try:
            logger.info("\n--- Starting Hourly Cycle ---")
            
            # 1. Sync Data
            logger.info("Step 1: Syncing Data...")
            run_data_sync(supabase)
            
            # 2. Run Analysis
            logger.info("Step 2: Running Analysis...")
            run_analysis(supabase)
            
            logger.info("✅ Cycle Complete. Sleeping for 1 hour...")
            
            # Sleep in intervals to allow quicker shutdown
            for _ in range(60): # 60 minutes
                if shutdown_flag: break
                time.sleep(60) 
                
        except Exception as e:
            logger.error(f"Error in worker loop: {e}")
            time.sleep(300) # Wait 5 mins on error before retrying

    logger.info("🛑 Worker stopped.")

if __name__ == "__main__":
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Load env vars if testing locally
    load_dotenv()
    
    # Start Flask in a daemon thread
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()
    logger.info("🌍 Health check server started on port 7860")
    
    # Start main worker loop
    worker_loop()
