import logging
import sys
from modules.recommender import generate_recommendations
from unittest.mock import MagicMock

# Configure logging to stdout
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

def verify():
    print("Verifying recommender...")
    
    # Mock Supabase client
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = ({"status": "ok"}, 1)
    
    # Run analysis
    recs = generate_recommendations(mock_supabase)
    
    print("\nRecommendation Result:")
    if recs:
        for profile in recs:
            print(f"\nProfile: {profile['risk_profile']}")
            for coin in profile['coins']:
                print(f" - {coin['symbol']}: RSI={coin['rsi']:.2f}, Volatility={coin['volatility']:.4f}")
        
        # Verify db insert was called
        mock_supabase.table.assert_called_with("recommendations")
        print("\nSUCCESS: Supabase insertion attempted.")
    else:
        print("No recommendations generated (could be due to data fetch issues or strict filtering).")

if __name__ == "__main__":
    verify()
