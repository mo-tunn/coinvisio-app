import logging
import sys
import os

# Ensure we can import modules
sys.path.append(os.getcwd())

from data_pipeline import fetcher

# Configure logging to stdout
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

print("--- Starting Redis Fallback Verification ---")

try:
    # 1. Test connection helper
    client = fetcher.get_redis_client()
    if client is None:
        print("✅ Correctly handled missing Redis (client is None)")
    else:
        # If user actually has local redis running on default port?
        try:
            client.ping()
            print("⚠️ Redis IS running locally!")
        except:
            print("✅ Redis client created but connection failed (Expected if no Redis)")

    # 2. Test get_top_symbols
    print("\n--- Testing get_top_symbols ---")
    symbols = fetcher.get_top_symbols(limit=5)
    
    print(f"Result: {symbols}")
    
    if symbols and isinstance(symbols, list):
        print("✅ get_top_symbols returned a list.")
    else:
        print("❌ get_top_symbols failed to return a list.")

except Exception as e:
    print(f"❌ Verification failed with error: {e}")
    import traceback
    traceback.print_exc()

print("\n--- Verification Complete ---")
