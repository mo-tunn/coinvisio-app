import os
import json
import logging
from datetime import datetime
from typing import Optional, Any, Tuple, List
from groq import Groq
from tavily import TavilyClient
import redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Redis client
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

def _plan_execution(user_query: str, session_id: Optional[str] = None) -> dict:
    """
    Uses Llama 3 to plan the execution: 
    1. Extract Symbol (for internal DB lookup)
    2. Decide if Web Search is needed (for real-time news)
    
    Returns dict: {"symbol": str|None, "search_needed": bool}
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY is missing.")
        return {"symbol": None, "search_needed": False}
        
    client = Groq(api_key=api_key)
    
    # Get Context
    context_str = ""
    if session_id:
        history = get_chat_history(session_id)
        if history:
            context_str = f"CHAT HISTORY:\n{history}\n"
            logger.info(f"Planner loaded history chars: {len(history)}")
    
    prompt = f"""
    {context_str}
    Analyze this user query: "{user_query}"
    
    Return a JSON object with two keys:
    1. "symbol": The crypto symbol formatted for yfinance (e.g., "BTC-USD"). 
       - CRITICAL: Check CHAT HISTORY. If the previous turn was about "DOGE", and user says "should I buy it?", the symbol IS "DOGE-USD".
       - If the user mentions a coin directly, use it.
       - If no specific coin is mentioned/inferred, use null.
       
    2. "search_needed": Boolean true/false. Set to true if:
       - User Asks for news, reasons ("Why?"), "Should I buy?", current price.
       - User asks a follow-up ("Are you sure?", "Explain more") about a specific coin (implies needing deep analysis).
       
       Set to false if:
       - General chitchat ("Hello", "Thanks").
       - Definitions ("What is blockchain?").
    
    Output ONLY valid JSON. Example: {{"symbol": "BTC-USD", "search_needed": true}}
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a query planner. Output JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0,
            response_format={"type": "json_object"} 
        )
        plan = json.loads(completion.choices[0].message.content)
        return plan
    except Exception as e:
        logger.error(f"Error planning execution: {e}")
        return {"symbol": None, "search_needed": True} # Fallback to search if unsure

def _get_internal_data(supabase_client: Any, symbol: str) -> str:
    """
    Fetches relevant data from the database for the specific symbol.
    """
    try:
        # 1. Market Regime (General Context)
        regime_res = supabase_client.table("market_regime").select("*").order("created_at", desc=True).limit(1).execute()
        regime_info = f"Market is currently {regime_res.data[0]['regime_label']}" if regime_res.data else "Market Regime: Unknown"

        # 2. Anomalies for this symbol (Last 24h)
        anomalies_res = supabase_client.table("coin_anomalies").select("*").eq("symbol", symbol).order("detected_at", desc=True).limit(1).execute()
        anomaly_info = f"Anomaly Detected: {anomalies_res.data[0]['anomaly_type']}" if anomalies_res.data else "No recent anomalies."

        # 3. Recommendations
        # We need to check JSON columns, skipping complex query for now, just broad check
        # A simple approach if we can't search inside JSON easily via this client wrapper: 
        # just say "Not in top recommendations" or similar, or skip. 
        # Let's try fetching latest recs and checking via python.
        recs_res = supabase_client.table("recommendations").select("*").order("updated_at", desc=True).limit(3).execute()
        rec_status = "Not currently recommended."
        if recs_res.data:
            for r in recs_res.data:
                for coin in r.get('coins', []):
                    if coin.get('symbol') == symbol:
                        rec_status = f"Recommended in {r['risk_profile']} profile (RSI: {coin.get('rsi'):.2f})."

        # 4. Smart Signals (Latest)
        signals_res = supabase_client.table("smart_signals").select("*").eq("symbol", symbol).order("created_at", desc=True).limit(1).execute()
        signal_info = "No smart signals available."
        if signals_res.data:
            s = signals_res.data[0]
            signal_info = f"{s['signal_type']} (Conf: {s['confidence_score']:.2f}) - Entry: {s['entry_price']}, Target: {s['target_price']}, Stop: {s['stop_loss']}"

        # 5. Daily Insights (General Market)
        insights_res = supabase_client.table("daily_insights").select("*").order("created_at", desc=True).limit(1).execute()
        daily_insight = insights_res.data[0]['insight_text'] if insights_res.data else "No daily insights."

        # 6. Recent Prices (Last 3 Candles)
        prices_res = supabase_client.table("crypto_prices").select("*").eq("symbol", symbol).order("recorded_at", desc=True).limit(3).execute()
        price_history = "Price data unavailable."
        if prices_res.data:
            price_history = ", ".join([
                f"[{p['recorded_at'].split('T')[0]}: Close {p['close']:.4f}]" 
                for p in prices_res.data
            ])

        return f"""
        Internal Data for {symbol}:
        - {regime_info}
        - {anomaly_info}
        - {rec_status}
        - Signals: {signal_info}
        - Daily Insight: {daily_insight}
        - Recent Prices: {price_history}
        """
    except Exception as e:
        logger.error(f"Error fetching internal data: {e}")
        return "Internal Data Unavailable."

def _get_web_data(query: str) -> Tuple[str, List[str]]:
    """
    Performs a web search using Tavily.
    Returns (context_string, sources_list).
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        logger.error("TAVILY_API_KEY is missing.")
        return "Web Search Unavailable (Missing Key).", []
    
    try:
        tavily = TavilyClient(api_key=api_key)
        
        trusted_domains = [
            "coindesk.com",
            "cointelegraph.com",
            "decrypt.co",
            "theblock.co",
            "cryptoslate.com",
            "bloomberg.com",
            "finance.yahoo.com",
            "twitter.com",
            "reddit.com"
        ]

        response = tavily.search(
            query=query, 
            search_depth="advanced", 
            max_results=10,
            include_domains=trusted_domains
        )
        
        results = []
        sources = []
        for result in response.get("results", []):
            results.append(f"- {result['title']}: {result['content']}")
            sources.append(f"[{result['title']}]({result['url']})")
            
        return "\n".join(results), sources
    except Exception as e:
        logger.error(f"Error searching web: {e}")
        return "Web Search Failed.", []

def _get_global_events() -> str:
    """
    Fetches broad global news (War, Politics, Macroeconomics) that might impact the market.
    """
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        return "Global News Unavailable."

    try:
        tavily = TavilyClient(api_key=api_key)
        response = tavily.search(
            query="latest geopolitical war economic news crypto market impact today", 
            search_depth="advanced", 
            max_results=5,
            topic="news", # We want general news here
        )
        
        events = []
        for result in response.get("results", []):
            events.append(f"- {result['title']}: {result['content']}")
            
        return "\n".join(events)
    except Exception as e:
        logger.error(f"Error fetching global events: {e}")
        return "Global News Search Failed."

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

def get_chat_history(session_id: str) -> str:
    """
    Retrieves the last 6 turns of conversation from Redis for context.
    """
    if not session_id:
        return ""
    
    try:
        # Get last 6 items (3 user, 3 ai)
        history_list = redis_client.lrange(f"chat_history:{session_id}", -6, -1)
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

def ask_iris(supabase_client: Any, user_query: str, session_id: Optional[str] = None) -> str:
    """
    Main function to process user query using RAG + Web Search.
    If session_id is provided, streams the response token-by-token to Redis channel 'iris_response:{session_id}'.
    """
    # Step 1: Plan Execution (Agentic Step)
    plan = _plan_execution(user_query, session_id)
    symbol = plan.get("symbol")
    search_needed = plan.get("search_needed", False)
    
    logger.info(f"Execution Plan: Symbol={symbol}, Search={search_needed}")

    internal_data = "No specific internal data."
    if symbol:
        logger.info(f"Iris identified symbol: {symbol}")
        internal_data = _get_internal_data(supabase_client, symbol)
    else:
        logger.info("Iris: No specific symbol identified.")

    # Step 2: Web Search (Conditional)
    web_data = "Web search skipped (not needed for this query)."
    global_context = "No major global events fetched."
    sources = []
    
    if search_needed:
        # A. Targeted Coin Search
        # Default to broad market search if no symbol (avoids searching for "are you sure?")
        search_query = "latest crypto market news analysis"
        
        if symbol:
            clean_symbol = symbol.replace("-USD", "")
            search_query = f'"{clean_symbol}" crypto news latest'
            logger.info(f"Refined Web Search Query (Symbol): {search_query}")
        else:
             logger.info(f"Refined Web Search Query (General): {search_query}")
    
        web_data, sources = _get_web_data(search_query)
        
        # B. Global Context Search
        logger.info("Fetching Global Macro Context...")
        global_context = _get_global_events()

    # Step 3: Final Synthesis
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return "Error: LLM API Key missing."

    client = Groq(api_key=api_key)
    
    prompt = f"""
    User Question: {user_query}
    
    SOURCE 1 (Internal Technical Data from CoinVisio Brain):
    {internal_data}
    
    SOURCE 2 (Specific Web Search):
    {web_data}
    
    SOURCE 3 (Global Macro/Political Context):
    {global_context}
    
    Task: Answer the user's question in the same language it was asked. 
    - You are "CoinVisio Iris", a Senior Crypto Analyst. 
    - BE BOLD and OPINIONATED based on the data.
    - If the Technicals (RSI, etc.) and News align, give a clear "Bullish" or "Bearish" signal.
    - IGNORE generic disclaimers. 
    - ANALYZE the Global Context (War, Politics) and how it affects the specific coin.
    - If the Technicals (RSI, etc.) and News align, give a clear "Bullish" or "Bearish" signal.
    - STOP saying "invest carefully", "not financial advice", "do your own research". The user knows this.
    - Provide a direct analysis like a Wall Street trader.
    - If there is a contradiction, explain it clearly (e.g., "Technicals are great, but the hack news makes this a risky buy").
    """

    messages = [
        {"role": "system", "content": "You are CoinVisio Iris, a confident, expert crypto trader who gives direct financial opinions without hesitation."},
        {"role": "user", "content": prompt}
    ]
    
    try:
        if session_id:
            # Streaming Mode
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=2500,
                stream=True
            )
            
            accumulated_response = ""
            redis_channel = f"iris_response:{session_id}"
            
            for chunk in completion:
                content = chunk.choices[0].delta.content
                if content:
                    # Publish chunk to Redis
                    redis_client.publish(redis_channel, content)
                    accumulated_response += content
            
            # Publish done signal
            # redis_client.publish(redis_channel, "[DONE]") # Optional: Client can infer end or we can send a dedicated end message if protocol requires.
            # Using a simple convention or just letting the HTTP response finish is often enough, 
            # but for pure socket streaming a sentinel is good. Let's stick to simple text for now.
            
            ai_response = accumulated_response
        else:
            # Standard Mode
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=2500
            )
            ai_response = completion.choices[0].message.content
        
        # Format final output with sources
        final_output = ai_response
        if sources:
             source_text = "\n\n**📚 Sources:**\n" + "\n".join([f"- {s}" for s in sources])
             final_output += source_text
             
             # If streaming, we might want to push the sources as well at the end
             if session_id:
                 redis_client.publish(redis_channel, source_text)

        # Final sentinel for stream consumers
        if session_id:
             redis_client.publish(redis_channel, "[DONE]")

        # --- MEMORY & LOGGING ---
        # 4. Save to Redis (Short-term Context)
        if session_id:
            save_chat_history(session_id, user_query, ai_response)
        
        # 5. Log to Supabase (Persistent History)
        log_interaction_to_db(supabase_client, user_query, ai_response, sources)

        return final_output
    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        return "I'm having trouble thinking right now. Please try again."
