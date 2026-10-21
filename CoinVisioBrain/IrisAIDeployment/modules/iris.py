import os
import json
import logging
from datetime import datetime
from typing import Optional, Any, Tuple, List
from openai import OpenAI
from tavily import TavilyClient
import redis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Redis client
# Check for REDIS_URL first (Upstash/Cloud style)
REDIS_URL = os.getenv("REDIS_URL")

try:
    if REDIS_URL:
        # Use full URL (Handles SSL, User, Pass, Port)
        # ssl_cert_reqs=None is often needed for Upstash in some environments
        import ssl
        redis_client = redis.from_url(REDIS_URL, decode_responses=True, ssl_cert_reqs=None)
        
        # Ping to check connection immediately (optional, helps debugging)
        redis_client.ping()
        logger.info("Redis initialized via REDIS_URL (Connected, SSL relaxed).")
    else:
        # Fallback to manual Host/Port
        REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
        REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
        REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)
        
        redis_client = redis.Redis(
            host=REDIS_HOST, 
            port=REDIS_PORT, 
            password=REDIS_PASSWORD, 
            db=0, 
            decode_responses=True
        )
        logger.info(f"Redis initialized via Host: {REDIS_HOST}")

except Exception as e:
    logger.warning(f"Redis initialization failed: {e}. Chat will function without streaming/history.")
    # Create a dummy client or let it fail later? 
    # Current logic expects redis_client to exist. Let's keep it but it might be broken.
    # The robust 'ask_iris' handles execution errors, so we can leave it.
    # To be safe, we can set redis_client to None if we want, but subsequent code calls methods on it.
    # Let's rely on the try-except blocks inside ask_iris. 
    # Actually, simpler to not crash here.
    redis_client = redis.Redis(host="localhost", port=6379, socket_connect_timeout=1) 

def _plan_execution(user_query: str, session_id: Optional[str] = None) -> dict:
    """
    Uses Llama 3 to plan the execution: 
    1. Extract Symbol (for internal DB lookup)
    2. Decide if Web Search is needed (for real-time news)
    
    Returns dict: {"symbol": str|None, "search_needed": bool}
    """
    api_key = os.getenv("CEREBRAS_API_KEY")
    if not api_key:
        logger.error("CEREBRAS_API_KEY is missing.")
        return {"symbol": None, "search_needed": False}
        
    client = OpenAI(
        base_url="https://api.cerebras.ai/v1",
        api_key=api_key
    )
    
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
            model="gpt-oss-120b",
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

def log_interaction_to_db(supabase_client: Any, user_query: str, ai_response: str, sources: List[str], user_id: Optional[str] = None, session_id: Optional[str] = None):
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
        if session_id:
            payload["session_id"] = session_id
        
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

def get_chat_history_messages(session_id: str) -> List[dict]:
    """
    Retrieves the last 6 turns of conversation from Redis as a list of message dicts.
    """
    if not session_id:
        return []
    
    try:
        # Get last 6 items
        history_list = redis_client.lrange(f"chat_history:{session_id}", -6, -1)
        if not history_list:
            return []
            
        messages = []
        for item in history_list:
            try:
                msg = json.loads(item) # {"role": "user", "content": "..."}
                # Map 'assistant' role if needed, but OpenAI/Groq usually use 'assistant'
                messages.append(msg)
            except:
                continue
            
        return messages
    except Exception as e:
        logger.error(f"Error reading chat history messages: {e}")
        return []

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
        
        logger.info(f"Attempting to save history to Redis key: {key}")
        
        # Push to list
        new_len = redis_client.rpush(key, user_msg, ai_msg)
        logger.info(f"Saved to Redis. New List Length: {new_len}")
        
        # Set Expiry to 1 hour (3600 seconds)
        redis_client.expire(key, 3600)
        
    except Exception as e:
        logger.error(f"Error saving chat history: {e}")

def ask_iris(supabase_client: Any, user_query: str, session_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
    """
    Main function to process user query using RAG + Web Search.
    If session_id is provided, streams the response token-by-token to Redis channel 'iris_response:{session_id}'.
    """
    # Step 1: Plan Execution (Agentic Step)
    # Wrap planning in try/except to ensure we don't crash before starting
    try:
        plan = _plan_execution(user_query, session_id)
        symbol = plan.get("symbol")
        search_needed = plan.get("search_needed", False)
    except Exception as e:
        logger.error(f"Planning failed, falling back to simple execution: {e}")
        symbol = None
        search_needed = True

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
    api_key = os.getenv("CEREBRAS_API_KEY")
    if not api_key:
        return "Error: LLM API Key missing."

    client = OpenAI(
        base_url="https://api.cerebras.ai/v1",
        api_key=api_key
    )
    
    prompt = f"""
    User Question: {user_query}
    
    SOURCE 1 (Internal Technical Data from CoinVisio Brain):
    {internal_data}
    
    SOURCE 2 (Specific Web Search):
    {web_data}
    
    SOURCE 3 (Global Macro/Political Context):
    {global_context}
    
    Task: Answer the user's question in the same language it was asked (Turkish or English).
    
    You are an AI market commentary assistant designed to provide clear, neutral, and educational explanations of cryptocurrency market conditions for non-technical users.

    Your role is to explain:
    - what is currently happening in the market,
    - why it may be relevant,
    - and what uncertainties or risks exist.

    You must NOT:
    - provide investment, trading, or financial advice,
    - suggest buying, selling, holding, or timing the market,
    - provide price targets, entry/exit levels, or trade setups,
    - express confidence scores or probabilistic outcomes (e.g., "92% chance"),
    - use directive or persuasive language.

    You should:
    - use plain, non-technical language whenever possible,
    - explain technical concepts in simple terms if mentioned,
    - clearly state when market direction is uncertain,
    - frame analysis as observation, not prediction,
    - emphasize that outcomes are unknown and can change.

    **RESPONSE LENGTH RULES (CRITICAL):**
    - For SIMPLE replies (e.g., "thanks", "ok", "sure", "are you sure?", "yes", "no", single-word or very short questions):
      - Keep your response to 1-3 SHORT sentences MAX.
      - Do NOT include Summary section.
      - Do NOT include Disclaimer.
      - Do NOT perform new web searches.
      - Just acknowledge and/or briefly clarify based on existing context.
    
    - For COMPLEX queries (new analysis requests, "what about X coin?", "explain Y"):
      - Provide full analysis with Summary.
      - Include Disclaimer at the end.
      - Do NOT cut the message off. Provide a complete explanation.

    **SUMMARY SECTION (CONDITIONAL):**
    - Include a "**Summary:**" paragraph ONLY for new analysis or complex explanations.
    - OMIT for simple follow-ups, acknowledgements, or clarifications.

    **DISCLAIMER (CONDITIONAL):**
    - Include ONLY when providing market analysis or financial context.
    - OMIT for simple replies like "sure", "thanks", "ok", "are you sure?".
    """


    # 1. Base System Prompt
    messages = [
        {"role": "system", "content": "You are a neutral, educational AI market commentator. You explain market conditions simply and objectively. You NEVER give financial advice, trade signals, or price predictions."}
    ]

    # 2. Inject Context (History)
    if session_id:
        history_msgs = get_chat_history_messages(session_id)
        if history_msgs:
             messages.extend(history_msgs)

    # 3. Add Current User Prompt
    messages.append({"role": "user", "content": prompt})
    
    try:
        if session_id:
            # Streaming flow attempt
            try:
                completion = client.chat.completions.create(
                    model="gpt-oss-120b",
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
                        # Try to publish, if redis fails, just ignore and accumulate
                        try:
                            redis_client.publish(redis_channel, content)
                        except Exception:
                            pass # Redis failed, strictly minor issue
                        accumulated_response += content
                
                ai_response = accumulated_response
                
                # Try publishing sources and DONE
                try:
                    if sources:
                        source_text = "\n\n**📚 Sources:**\n" + "\n".join([f"- {s}" for s in sources])
                        redis_client.publish(redis_channel, source_text)
                    redis_client.publish(redis_channel, "[DONE]")
                except Exception:
                    pass

            except Exception as e:
                logger.error(f"Streaming failed: {e}. Falling back to standard generation.")
                # Fallback to standard if streaming init failed
                completion = client.chat.completions.create(
                    model="gpt-oss-120b",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2500
                )
                ai_response = completion.choices[0].message.content

        else:
            # Standard Mode (No Session ID)
            completion = client.chat.completions.create(
                model="gpt-oss-120b",
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

        # --- MEMORY & LOGGING ---
        # 4. Save to Redis (Short-term Context)
        if session_id:
            try:
                save_chat_history(session_id, user_query, ai_response)
            except Exception as r_err:
                logger.warning(f"Failed to save chat history to Redis: {r_err}")
        
        # 5. Log to Supabase (Persistent History)
        try:
            log_interaction_to_db(supabase_client, user_query, ai_response, sources, user_id=user_id, session_id=session_id)
        except Exception as db_err:
            logger.warning(f"Failed to log to Supabase: {db_err}")

        return final_output
    except Exception as e:
        logger.error(f"CRITICAL Error generating answer: {e}")
        return f"I'm having trouble thinking right now. Error Details: {str(e)}"
