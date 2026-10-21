from data_pipeline.fetcher import get_top_symbols, fetch_ohlcv_data
import pandas as pd

def verify():
    print("Verifying get_top_symbols...")
    symbols = get_top_symbols(limit=5) # Limit to 5 for speed
    print(f"Top 5 symbols: {symbols}")
    
    if not symbols:
        print("Failed to fetch symbols.")
        return

    print("\nVerifying fetch_ohlcv_data...")
    # Test with just 2 symbols to save time/bandwidth
    test_symbols = symbols[:2]
    data = fetch_ohlcv_data(test_symbols, period="1mo", interval="1d")
    
    for symbol, df in data.items():
        print(f"\nData for {symbol}:")
        print(df.head())
        print(f"Columns: {df.columns.tolist()}")
        
        required_cols = ["Returns", "Volatility", "Volume_Change"]
        missing_cols = [col for col in required_cols if col not in df.columns]
        
        if missing_cols:
            print(f"FAILED: Missing columns: {missing_cols}")
        else:
            print("SUCCESS: All indicators present.")
            
if __name__ == "__main__":
    verify()
