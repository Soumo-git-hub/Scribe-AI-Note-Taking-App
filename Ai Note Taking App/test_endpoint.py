import requests
import json

def test_structure_note():
    url = "http://localhost:8000/api/structure-note"
    headers = {"Content-Type": "application/json"}
    data = {"content": "This is a test note that needs to be structured. It contains multiple ideas and concepts that should be organized better. The first concept is about AI and machine learning. The second concept is about web development and APIs. Finally, there's a section about database design and optimization."}
    
    try:
        print(f"Sending request to {url}")
        print(f"Request data: {json.dumps(data, indent=2)}")
        
        response = requests.post(url, headers=headers, json=data)
        print(f"\nStatus Code: {response.status_code}")
        
        try:
            json_response = response.json()
            print(f"\nResponse JSON: {json.dumps(json_response, indent=2)}")
        except json.JSONDecodeError:
            print(f"\nRaw Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the server. Make sure it's running on port 8000.")
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_structure_note() 