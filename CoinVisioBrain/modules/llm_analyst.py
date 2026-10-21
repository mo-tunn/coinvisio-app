import os
import json
import logging
from datetime import datetime
from typing import Any
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_daily_briefing(supabase_client: Any) -> None:
    """
    Fetches latest analysis data directly from Supabase and generates a daily briefing.
    
    Args:
        supabase_client: Initialized Supabase client.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY not found in environment variables.")
        return

    logger.info("Starting LLM Analyst briefing generation...")

    try:
        # 1. Fetch Market Regime
        regime_response = supabase_client.table("market_regime") \
            .select("*") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
        
        regime_data = regime_response.data[0] if regime_response.data else {}
        regime_label = regime_data.get("regime_label", "Unknown")
        volatility = regime_data.get("avg_volatility", 0.0)

        # 2. Fetch Today's Anomalies (Simple approach: fetch last 24h or just latest few)
        # Assuming run daily, we can just grab latest created ones. 
        # For simplicity, let's grab anomalies detected today (UTC).
        today_str = datetime.utcnow().strftime('%Y-%m-%d')
        anomalies_response = supabase_client.table("coin_anomalies") \
            .select("*") \
            .gte("detected_at", today_str) \
            .execute()
        
        anomalies_list = anomalies_response.data if anomalies_response.data else []

        # 3. Fetch Recommendations
        # Fetches the latest batch (assuming 3 profiles inserted together, we grab latest 3 rows)
        recs_response = supabase_client.table("recommendations") \
            .select("*") \
            .order("updated_at", desc=True) \
            .limit(3) \
            .execute()
            
        recommendations = recs_response.data if recs_response.data else []
        
        # Summarize recommendations for the prompt
        recs_summary = []
        for r in recommendations:
            coins = [c.get('symbol') for c in r.get('coins', [])]
            recs_summary.append(f"{r.get('risk_profile')}: {', '.join(coins)}")
        recs_str = "; ".join(recs_summary)

        # 4. Construct Prompt
        prompt = f"""
        You are CoinVisio AI, a smart crypto assistant.
        
        Current Market Data:
        - Status: {regime_label} (Volatility: {volatility:.4f})
        - Detected Anomalies: {json.dumps(anomalies_list, indent=2) if anomalies_list else "None"}
        - Top Picks: {recs_str if recs_str else "None available"}
        
        Task: Write a short, engaging daily crypto briefing in ENGLISH. 
        - Start with the general market weather.
        - Mention any dangerous anomalies.
        - Briefly mention the opportunities.
        - Tone: Professional, witty, and concise. Max 3 paragraphs.
        """

        # 5. Call Groq API
        client = Groq(api_key=api_key)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile", 
            messages=[
                {"role": "system", "content": "You are a professional crypto analyst."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )

        insight_text = completion.choices[0].message.content
        
        # Infer sentiment from regime
        sentiment_map = {
            "Bull": "Positive",
            "Bear": "Negative",
            "Sideways": "Neutral"
        }
        # Clean label might contain emojis like "Bull 🟢", so we check containment
        sentiment = "Neutral"
        if "Bull" in regime_label: sentiment = "Positive"
        elif "Bear" in regime_label: sentiment = "Negative"
        
        # 6. Insert into Supabase
        payload = {
            "insight_text": insight_text,
            "sentiment": sentiment,
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase_client.table("daily_insights").insert(payload).execute()
        
        logger.info("Successfully generated daily briefing.")
        print("📝 Daily Briefing Generated & Saved.")

    except Exception as e:
        logger.error(f"Error in LLM Analyst: {e}")
