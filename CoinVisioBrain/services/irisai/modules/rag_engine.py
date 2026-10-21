import logging
import json
import os
from datetime import datetime
from typing import Any, Optional, List, Dict
from .llm_client import extract_symbol, perform_web_search, generate_iris_response
# Reuse the shared Redis client logic
from data_pipeline.fetcher import get_redis_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_internal_data(supabase_client: Any, symbol: str) -> str:
    """
    Fetches relevant data from the database for the specific symbol.
    """
    try:
        # 1. Market Regime
        regime_res = supabase_client.table("market_regime").select("*").order("created_at", desc=True).limit(1).execute()
        regime_info = f"Market is currently {regime_res.data[0]['regime_label']}" if regime_res.data else "Market Regime: Unknown"

        # 2. Anomalies
        anomalies_res = supabase_client.table("coin_anomalies").select("*").eq("symbol", symbol).order("detected_at", desc=True).limit(1).execute()
        anomaly_info = f"Anomaly Detected: {anomalies_res.data[0]['anomaly_type']}" if anomalies_res.data else "No recent anomalies."

        # 3. Recommendations (Simple Check)
        recs_res = supabase_client.table("recommendations").select("*").order("updated_at", desc=True).limit(3).execute()
        rec_status = "Not currently recommended."
        if recs_res.data:
            for r in recs_res.data:
                for coin in r.get('coins', []):
                    if coin.get('symbol') == symbol:
                        rec_status = f"Recommended in {r['risk_profile']} profile (RSI: {coin.get('rsi'):.2f})."

        return f"""
        Internal Data for {symbol}:
        - {regime_info}
        - {anomaly_info}
        - {rec_status}
        """
    except Exception as e:
        logger.error(f"Error fetching internal data: {e}")
        return "Internal Data Unavailable."

    except Exception as e:
        logger.error(f"Error fetching internal data: {e}")
        return "Internal Data Unavailable."

def get_chat_history(session_id: str) -> str:
    """
    Retrieves the last 5 turns of conversation from Redis.
    """
    if not session_id:
        return ""
    
    redis_client = get_redis_client()
    if not redis_client:
        return ""

    try:
        # Get last 10 items (5 user, 5 ai)
        history_list = redis_client.lrange(f"chat_history:{session_id}", -10, -1)
        if not history_list:
            return ""
            
        formatted_history = []
        for item in history_list:
            msg = json.loads(item)
            role = "User" if msg["role"] == "user" else "Iris"
            formatted_history.append(f"{role}: {msg['content']}")
            
        return "\n".join(formatted_history)
    except Exception as e:
        logger.error(f"Error reading chat history: {e}")
        return ""

def save_chat_history(session_id: str, user_query: str, ai_response: str):
    """
    Saves the user query and AI response to Redis with a 1-hour TTL.
    """
    if not session_id:
        return

    redis_client = get_redis_client()
    if not redis_client:
        return

    try:
        key = f"chat_history:{session_id}"
        
        user_msg = json.dumps({"role": "user", "content": user_query})
        ai_msg = json.dumps({"role": "assistant", "content": ai_response})
        
        # Push to list
        redis_client.rpush(key, user_msg, ai_msg)
        
        # Set Expiry to 1 hour (3600 seconds)
        redis_client.expire(key, 3600)
        
    except Exception as e:
        logger.error(f"Error saving chat history: {e}")

def log_interaction_to_db(supabase_client: Any, user_query: str, ai_response: str, sources: List[str], user_id: Optional[str] = None):
    """
    Logs the user query, AI response, and sources to Supabase 'user_queries' table.
    """
    try:
        payload = {
            "user_question": user_query,
            "ai_response": ai_response,
            "sources": json.dumps(sources),  # Store sources as JSONB
            "status": "completed",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if user_id:
            payload["user_id"] = user_id
        
        supabase_client.table("user_queries").insert(payload).execute()
        logger.info("Interaction logged to Supabase 'user_queries'.")
    except Exception as e:
        logger.error(f"Error logging interaction to DB: {e}")

def process_query(supabase_client: Any, user_query: str, session_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
    """
    Orchestrates the RAG flow: Extract Symbol -> Fetch Internal Data -> Search Web -> Generate Answer.
    """
    # Step 1: Extract Symbol
    symbol = extract_symbol(user_query)
    
    internal_data = "No specific internal data."
    if symbol:
        logger.info(f"Iris identified symbol: {symbol}")
        internal_data = get_internal_data(supabase_client, symbol)
    else:
        logger.info("Iris: No specific symbol identified.")

    # Step 2: Web Search
    web_data, sources = perform_web_search(user_query)

    # Step 3: Get Chat History
    chat_history_context = ""
    if session_id:
        history = get_chat_history(session_id)
        if history:
            chat_history_context = f"\nPREVIOUS CONVERSATION HISTORY:\n{history}\n"
            logger.info(f"Loaded history for session {session_id}")

    # Step 4: Synthesis
    prompt = f"""
    {chat_history_context}
    
    User Question: {user_query}
    
    SOURCE 1 (Internal Technical Data from CoinVisio Brain):
    {internal_data}
    
    SOURCE 2 (Live Web Search):
    {web_data}
    
    Task: Answer the user's question in the same language it was asked. 
    - acts as "CoinVisio Iris".
    - Combine the technical data (RSI, Anomalies) with the latest web news.
    - If there is a contradiction (e.g. Technicals say BUY but News say HACK), warn the user!
    - Keep it concise, helpful, and professional.
    """
    
    ai_response = generate_iris_response(prompt)
    
    # Format final output with sources
    final_output = ai_response
    if sources:
         final_output += "\n\n**📚 Sources:**\n" + "\n".join([f"- {s}" for s in sources])

    # Step 5: Save Context & Log
    if session_id:
        save_chat_history(session_id, user_query, ai_response)
        
    log_interaction_to_db(supabase_client, user_query, ai_response, sources, user_id)
         
    return final_output
