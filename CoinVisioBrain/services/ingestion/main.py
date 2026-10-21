import time
import logging
import requests
import yfinance as yf
from typing import List, Any
from db_client import get_supabase_client
from data_pipeline.fetcher import sync_daily_data

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("Ingestion Service Started 🚀")
    try:
        supabase = get_supabase_client()
        while True:
            sync_daily_data(supabase)
            logger.info("Sleeping for 1 hour...")
            time.sleep(3600)
    except Exception as e:
        logger.error(f"Critical Error in Ingestion Service: {e}")
