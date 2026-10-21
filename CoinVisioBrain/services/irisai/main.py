from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from db_client import get_supabase_client
from modules.rag_engine import process_query
import logging
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="CoinVisio Iris AI API")

# Initialize Supabase Client
try:
    supabase = get_supabase_client()
    logger.info("Supabase Client Initialized.")
except Exception as e:
    logger.error(f"Failed to initialize Supabase: {e}")
    supabase = None

from typing import Optional

class QueryRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    user_id: Optional[str] = None

class QueryResponse(BaseModel):
    response: str

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Iris AI"}

@app.post("/chat", response_model=QueryResponse)
def chat_endpoint(request: QueryRequest):
    if not supabase:
        raise HTTPException(status_code=500, detail="Database connection unavailable.")
    
    try:
        response_text = process_query(supabase, request.query, request.session_id, request.user_id)
        return QueryResponse(response=response_text)
    except Exception as e:
        logger.error(f"Error processing chat request: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
