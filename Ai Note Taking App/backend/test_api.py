import requests
import json
import time

def test_api():
    base_url = "http://localhost:8000"
    
    # Test the debug endpoint
    print("\nTesting debug endpoint...")
    try:
        response = requests.get(f"{base_url}/api/debug/ai-service")
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure the server is running.")
        return
    except Exception as e:
        print(f"Error testing debug endpoint: {str(e)}")
        return
    
    # Wait a bit before the next request
    time.sleep(1)
    
    # Test the summarize endpoint
    print("\nTesting summarize endpoint...")
    test_content = {
        "content": "Artificial intelligence (AI) is intelligence demonstrated by machines, as opposed to natural intelligence displayed by animals including humans. AI research has been defined as the field of study of intelligent agents, which refers to any system that perceives its environment and takes actions that maximize its chance of achieving its goals."
    }
    try:
        response = requests.post(f"{base_url}/api/summarize", json=test_content)
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error testing summarize endpoint: {str(e)}")

if __name__ == "__main__":
    test_api() 