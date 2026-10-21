import os
import uuid
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client
import uvicorn
import threading
from fastapi.responses import StreamingResponse

# Load env in dev (in Spaces variables are pre-loaded)
load_dotenv()

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("IrisAPI")

# Initialize App
app = FastAPI(title="CoinVisio Iris AI API")

# --- CORS CONFIGURATION ---
# Restrict access to only trusted clients (React App)
origins = [
    "http://localhost:5173",  # Local Development
    "http://localhost:3000",  # Alternative Local
    "https://coinvisio.pages.dev", # Cloudflare Pages
    "https://coinvisio.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-ID"],
)

# Initialize Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("Supabase credentials missing. DB features will fail.")
    supabase: Client = None
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase connected.")
    except Exception as e:
        logger.error(f"Supabase connection error: {e}")
        supabase = None

# Import Iris Core
try:
    from modules.iris import ask_iris, get_chat_history, get_chat_history_messages, redis_client
except ImportError as e:
    logger.error(f"Failed to import iris module: {e}")

class ChatRequest(BaseModel):
    query: str
    user_id: str
    user_tier: Optional[str] = "Free"
    session_id: Optional[str] = None

@app.get("/")
@app.head("/")
def health_check():
    return {"status": "active", "service": "CoinVisio Iris AI"}

@app.get("/health/redis")
def redis_health_check():
    """
    Checks if Redis is actually connected.
    """
    try:
        if redis_client.ping():
            return {"status": "connected", "info": str(redis_client)}
        return {"status": "unknown"}
    except Exception as e:
        return {"status": "error", "details": str(e), "hint": "Check REDIS_URL"}

@app.get("/history/{session_id}")
def history_endpoint(session_id: str):
    """
    Retrieve chat history for a given session as structured JSON.
    """
    history_msgs = get_chat_history_messages(session_id)
    if not history_msgs:
        return {"session_id": session_id, "messages": []}
    return {"session_id": session_id, "messages": history_msgs}

@app.delete("/history/{session_id}")
def delete_history_endpoint(session_id: str, user_id: str):
    """
    Soft-delete chat history for a given session.
    Marks as hidden in Supabase (for usage counting) but removes from Redis (context).
    """
    hidden_count = 0
    
    # 1. Delete from Redis (clear context memory)
    try:
        redis_client.delete(f"chat_history:{session_id}")
    except Exception as e:
        logger.warning(f"Redis delete failed for {session_id}: {e}")
    
    # 2. Soft-delete in Supabase (UPDATE hidden=true, NOT DELETE)
    # This preserves the record for daily usage counting
    if supabase:
        try:
            res = supabase.table("user_queries") \
                .update({"hidden": True}) \
                .eq("session_id", session_id) \
                .eq("user_id", user_id) \
                .execute()
            hidden_count = len(res.data) if res.data else 0
            logger.info(f"Soft-deleted (hidden) {hidden_count} records for session {session_id}")
        except Exception as e:
            logger.error(f"Supabase soft-delete failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to hide history")
    
    return {"success": True, "hidden_count": hidden_count}

@app.get("/history/list/{user_id}")
def list_history_endpoint(user_id: str):
    """
    List past chat sessions for a user.
    """
    if not supabase:
         return []
         
    try:
        # Fetch last 100 interactions, excluding hidden (soft-deleted) ones
        res = supabase.table("user_queries") \
            .select("session_id, created_at, user_question, hidden") \
            .eq("user_id", user_id) \
            .or_("hidden.is.null,hidden.eq.false") \
            .order("created_at", desc=True) \
            .limit(100) \
            .execute()
            
        logger.info(f"History fetch for {user_id}: {len(res.data)} records")

        session_map = {}
        for item in res.data:
            sid = item.get('session_id')
            if not sid: continue
            
            created_at = item.get('created_at', '')
            user_q = item.get('user_question') or "New Chat"

            if sid not in session_map:
                session_map[sid] = {
                    "id": sid,
                    "title": user_q[:40] + "...",
                    "first_msg_time": created_at,
                    "last_msg_time": created_at,
                    "date": created_at.split('T')[0]
                }
            else:
                # Track last activity
                if created_at > session_map[sid]["last_msg_time"]:
                    session_map[sid]["last_msg_time"] = created_at
                    session_map[sid]["date"] = created_at.split('T')[0]
                
                # Track first message for Title
                if created_at < session_map[sid]["first_msg_time"]:
                    session_map[sid]["first_msg_time"] = created_at
                    session_map[sid]["title"] = user_q[:40] + "..."

        # Return sorted by most recent activity
        return sorted(session_map.values(), key=lambda x: x['last_msg_time'], reverse=True)

    except Exception as e:
        logger.error(f"History List Error: {e}")
        return []

@app.get("/usage/{user_id}")
def get_usage_endpoint(user_id: str, tier: str = "free"):
    """
    Returns the current daily usage count and limit for a user.
    """
    if not supabase or not user_id:
        return {"used": 0, "limit": 20, "tier": tier}
    
    try:
        today_start = datetime.utcnow().strftime('%Y-%m-%d 00:00:00')
        
        res = supabase.table("user_queries") \
            .select("*", count="exact") \
            .eq("user_id", user_id) \
            .gte("created_at", today_start) \
            .execute()
            
        count = res.count if res.count else 0
        limit = 100 if tier and tier.lower() == 'premium' else 20
        
        return {"used": count, "limit": limit, "tier": tier}
    except Exception as e:
        logger.error(f"Usage fetch error: {e}")
        return {"used": 0, "limit": 20, "tier": tier}

def check_daily_limit(user_id: str, tier: str):
    """
    Enforces daily prompt limits.
    Free: 20
    Premium: 100
    """
    if not user_id:
        return # Should probably error, but for safety
        
    try:
        today_start = datetime.utcnow().strftime('%Y-%m-%d 00:00:00')
        
        # Count queries for this user today
        # Note: 'user_queries' must have 'user_id' column and 'created_at'
        res = supabase.table("user_queries") \
            .select("*", count="exact") \
            .eq("user_id", user_id) \
            .gte("created_at", today_start) \
            .execute()
            
        count = res.count
        
        limit = 100 if tier and tier.lower() == 'premium' else 20
        
        logger.info(f"User {user_id} ({tier}) usage: {count}/{limit}")
        
        if count >= limit:
             raise HTTPException(status_code=429, detail="Daily limit reached")
             
    except Exception as e:
        # If DB fails, we default to allowing (fail open) or logging error
        logger.error(f"Rate limit check failed: {e}")
        if isinstance(e, HTTPException):
            raise e

def stream_generator(session_id: str):
    """
    Yields data from Redis Pub/Sub for the given session_id.
    """
    if not redis_client:
        yield "Error: Redis not connected.\n"
        return

    pubsub = redis_client.pubsub()
    channel = f"iris_response:{session_id}"
    pubsub.subscribe(channel)
    
    try:
        # Listen for messages
        for message in pubsub.listen():
            if message['type'] == 'message':
                data = message['data']
                if isinstance(data, bytes):
                    data = data.decode('utf-8')
                    
                if data == "[DONE]":
                    break
                    
                yield data
    except Exception as e:
        logger.error(f"Stream Generator Error: {e}")
        yield f"Error: {str(e)}"
    finally:
        try:
            pubsub.unsubscribe()
        except:
            pass

@app.post("/chat")
def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint.
    Checks daily limits and streams response via Server-Sent Events (SSE).
    """
    if not supabase:
        raise HTTPException(status_code=503, detail="Database Unavailable")
    
    # 1. Check Daily Limit
    check_daily_limit(request.user_id, request.user_tier)

    # If no session_id provided, generate one for internal logic consistency
    session_id = request.session_id or str(uuid.uuid4())
    
    # 2. Run Iris in a Background Thread
    def run_iris():
        try:
            # Pass user_id to ask_iris
            try:
                ask_iris(supabase, request.query, session_id=session_id, user_id=request.user_id)
            except TypeError:
                ask_iris(supabase, request.query, session_id=session_id)
        except Exception as e:
            logger.error(f"Background Iris Execution Error: {e}")
            if redis_client:
                try:
                    redis_client.publish(f"iris_response:{session_id}", f"Error: {str(e)}")
                    redis_client.publish(f"iris_response:{session_id}", "[DONE]")
                except:
                    pass

    thread = threading.Thread(target=run_iris)
    thread.start()
    
    # 3. Return Streaming Response
    return StreamingResponse(
        stream_generator(session_id), 
        media_type="text/event-stream",
        headers={"X-Session-ID": session_id}
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 7860)) # HF Spaces defaults to 7860
    uvicorn.run(app, host="0.0.0.0", port=port)
