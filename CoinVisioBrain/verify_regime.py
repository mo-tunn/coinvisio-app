import logging
import sys
from modules.market_regime import analyze_market_regime
from unittest.mock import MagicMock

# Configure logging to stdout
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

def verify():
    print("Verifying market_regime...")
    
    # Mock Supabase client
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.insert.return_value.execute.return_value = ({"status": "ok"}, 1)
    
    # Run analysis
    result = analyze_market_regime(mock_supabase)
    
    print("\nAnalysis Result:")
    print(result)
    
    if result:
        print("\nSUCCESS: Analysis returned a result.")
        print(f"Regime: {result.get('regime_label')}")
        
        # Verify db insert was called
        mock_supabase.table.assert_called_with("market_regime")
        print("SUCCESS: Supabase insertion attempted.")
        
    else:
        print("\nFAILED: Analysis returned empty result.")

if __name__ == "__main__":
    verify()
