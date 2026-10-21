import requests
import uuid
import time

# Generate a random session ID
session_id = str(uuid.uuid4())
url = "http://localhost:8000/chat"

def ask_iris(question):
    print(f"\n🟢 Kullanıcı: {question}")
    payload = {
        "query": question,
        "session_id": session_id
    }
    
    try:
        start = time.time()
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        duration = time.time() - start
        
        print(f"🟣 Iris AI ({duration:.2f}s): {data['response']}")
        print("-" * 50)
    except Exception as e:
        print(f"❌ Hata: {e}")

if __name__ == "__main__":
    print(f"Test Başlıyor... Session ID: {session_id}")
    
    # Soru 1: Bağlam oluştur
    ask_iris("Bitcoin'in bugünkü durumu nedir?")
    
    # Soru 2: Hafızayı test et ('O' diyerek Bitcoin'i kastediyoruz)
    ask_iris("Peki sence O'nu almak için iyi bir zaman mı?")
