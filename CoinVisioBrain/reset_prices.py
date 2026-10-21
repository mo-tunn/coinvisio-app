from database.db_client import get_supabase_client

def reset_prices():
    confirm = input("⚠️ WARNING: This will DELETE ALL DATA in 'crypto_prices'. Are you sure? (y/n): ")
    if confirm.lower() != 'y':
        print("Cancelled.")
        return

    supabase = get_supabase_client()
    print("🗑️ Deleting all records from 'crypto_prices'...")
    try:
        # Supabase API for deleting all rows (neq id 0 is a hack if needed, or just delete all)
        # Assuming 'id' column exists, or we use a broad filter.
        # Check if 'id' exists? Or we can use symbol is not null.
        
        # 'recorded_at' > '1900-01-01' should cover all.
        res = supabase.table("crypto_prices").delete().neq("symbol", "PLACEHOLDER").execute()
        
        # Note: If table is huge, this might timeout. Truncate via SQL is better if available (RPC).
        # But this is Python client.
        print(f"✅ Delete executed. {len(res.data) if res.data else '?'} rows affected (Supabase limits return).")
        
    except Exception as e:
        print(f"❌ Error deleting: {e}")
        print("Tip: If valid rows remain, you might need to Truncate using SQL Editor in Supabase Dashboard: 'TRUNCATE TABLE crypto_prices;'")

if __name__ == "__main__":
    reset_prices()
