import os
import logging
from dotenv import load_dotenv
from supabase import create_client, Client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_supabase_client() -> Client:
    """
    Initializes and returns a Supabase client.
    Handles environment variable loading and connection initialization.
    """
    load_dotenv()
    
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("SUPABASE_URL or SUPABASE_KEY is missing in environment variables.")
        raise ValueError("Missing Supabase credentials in .env file.")
    
    try:
        client = create_client(url, key)
        return client
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        raise ConnectionError(f"Could not connect to Supabase: {e}")
