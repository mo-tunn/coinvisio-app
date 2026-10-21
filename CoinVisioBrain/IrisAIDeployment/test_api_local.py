import requests
import json

# Local URL (0.0.0.0 maps to localhost)
API_URL = "http://localhost:7860"

def test_chat():
    print(f"Testing API at {API_URL}...")
    
    # 1. Health Check
    try:
        resp = requests.get(f"{API_URL}/")
        print(f"Health Check: {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"❌ Could not connect to server. Is it running? Error: {e}")
        return

    # 2. First Chat (New Session)
    payload = {"query": "What is the price of Bitcoin?"}
    print(f"\nSending Query: {payload['query']}")
    
    resp = requests.post(f"{API_URL}/chat", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        print(f"Response: {data['response'][:100]}...") # Print first 100 chars
        session_id = data.get("session_id")
        print(f"Session ID Created: {session_id}")
        
        # 3. Follow-up (Identify Session)
        if session_id:
            payload_2 = {"query": "Should I buy it?", "session_id": session_id}
            print(f"\nSending Follow-up: {payload_2['query']} (with Session ID)")
            resp_2 = requests.post(f"{API_URL}/chat", json=payload_2)
            print(f"Follow-up Response: {resp_2.json().get('response')[:100]}...")
    else:
        print(f"❌ Chat Error: {resp.text}")

if __name__ == "__main__":
    test_chat()
