import time
import logging
from db_client import get_supabase_client
from modules.clustering import analyze_market_regime
from modules.anomaly import detect_anomalies
from modules.recommender import generate_recommendations
from modules.smart_signals import calculate_signals
from modules.llm_analyst import generate_daily_briefing

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_analysis():
    logger.info("Starting Analysis Pipeline...")
    client = get_supabase_client()
    
    # 1. Market Regime
    analyze_market_regime(client)
    
    # 2. Anomaly
    detect_anomalies(client)
    
    # 3. Recommendations
    generate_recommendations(client)
    
    # 4. Smart Signals
    calculate_signals(client)
    
    # 5. LLM Briefing
    generate_daily_briefing(client)
    logger.info("Analysis Pipeline Completed.")

if __name__ == "__main__":
    logger.info("Analysis Service Started 🚀")
    try:
        while True:
            run_analysis()
            logger.info("Sleeping for 6 hours...")
            time.sleep(21600) # 6 hours
    except Exception as e:
        logger.error(f"Critical Error in Analysis Service: {e}")
