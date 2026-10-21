import os
import logging
import json
from datetime import datetime
from typing import Dict, Any, List
from groq import Groq

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_daily_insight(
    supabase_client: Any, 
    regime_data: Dict[str, Any], 
    anomalies: List[Dict[str, Any]], 
    recommendations: List[Dict[str, Any]]
) -> None:
    """
    Generates a daily market insight using Groq (Llama 3) based on provided analysis data.
    
    Args:
        supabase_client: Initialized Supabase client.
        regime_data: Dictionary containing market regime info.
        anomalies: List of detected anomalies.
        recommendations: List of generated recommendations.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY not found in environment variables.")
        return

    logger.info("Generating daily insight with Groq...")

    try:
        client = Groq(api_key=api_key)
        
        # Construct the prompt
        prompt = f"""
        You are an expert crypto market analyst for "CoinVisio Brain".
        Analyze the following data for today and write a concise, professional daily insight report.
        
        DATA:
        1. Market Regime: {regime_data.get('regime_label', 'Unknown')} (Volatility: {regime_data.get('avg_volatility', 0):.4f}, Return: {regime_data.get('avg_return', 0):.4f})
        2. Detected Anomalies: {json.dumps(anomalies, indent=2) if anomalies else "None"}
        3. Recommendations: {json.dumps(recommendations, indent=2) if recommendations else "None"}
        
        INSTRUCTIONS:
        - Summarize the overall market mood.
        - Highlight any critical anomalies (pumps/crashes).
        - briefly mention the best opportunities from the recommendations.
        - Conclude with a Sentiment (Positive, Negative, or Neutral).
        - Output format: JSON with keys "insight_text" and "sentiment".
        """

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful JSON-speaking crypto analyst."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )

        response_content = completion.choices[0].message.content
        result = json.loads(response_content)
        
        insight_text = result.get("insight_text", "Analysis failed.")
        sentiment = result.get("sentiment", "Neutral")
        
        # Insert into Supabase
        payload = {
            "insight_text": insight_text,
            "sentiment": sentiment,
            "created_at": datetime.utcnow().isoformat()
        }
        
        data, count = supabase_client.table("daily_insights").insert(payload).execute()
        logger.info("Successfully generated and saved daily insight.")
        print(f"🤖 LLM Insight: {sentiment} -> Saved to DB.")

    except Exception as e:
        logger.error(f"Error generating/saving LLM insight: {e}")
