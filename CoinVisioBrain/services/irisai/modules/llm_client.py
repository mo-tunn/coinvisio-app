import os
import logging
from groq import Groq
from tavily import TavilyClient
from typing import Optional, List, Tuple

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_symbol(user_query: str) -> Optional[str]:
    """
    Uses Llama 3 to extract the crypto symbol from the user's question.
    Returns format "SYMBOL-USD" or None.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY is missing.")
        return None
        
    client = Groq(api_key=api_key)
    
    prompt = f"""
    Extract the crypto symbol from this query: "{user_query}"
    Output ONLY the symbol formatted for yfinance (e.g., "BTC-USD", "ETH-USD", "PEPE-USD").
    If no specific coin is mentioned, output "None".
    """
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a symbol extractor. Output only the symbol string or None."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.0
        )
        result = completion.choices[0].message.content.strip().replace('"', '')
        if result == "None":
            return None
        return result
    except Exception as e:
        logger.error(f"Error extracting symbol: {e}")
        return None

def perform_web_search(query: str) -> Tuple[str, List[str]]:
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
            search_depth="basic", 
            max_results=3,
            include_domains=trusted_domains,
            topic="news"
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

def generate_iris_response(prompt: str) -> str:
    """
    Generates the final response using Groq.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return "Error: LLM API Key missing."

    client = Groq(api_key=api_key)
    
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are CoinVisio Iris, a helpful AI crypto assistant."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=800
        )
        return completion.choices[0].message.content
    except Exception as e:
        logger.error(f"Error generating answer: {e}")
        return "I'm having trouble thinking right now. Please try again."
