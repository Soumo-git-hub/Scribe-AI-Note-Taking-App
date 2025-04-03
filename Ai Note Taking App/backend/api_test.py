import os
import requests
import json
import logging
import time

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("api_test.log")
    ]
)
logger = logging.getLogger("api_test")

# Use a placeholder instead of the actual API key
API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")  # Get from environment variable

def test_api_key():
    """Test if the API key is present and valid"""
    api_key = API_KEY
    
    logger.info(f"API Key present: {bool(api_key)}")
    logger.info(f"API Key length: {len(api_key) if api_key else 0}")
    
    if not api_key:
        logger.error("No API key found. Please set the HUGGINGFACE_API_KEY environment variable.")
        return False
    
    return True

def test_model_availability(model_name):
    """Test if the specified model is available"""
    api_key = API_KEY
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"
    
    logger.info(f"Testing model availability: {model_name}")
    
    headers = {"Authorization": f"Bearer {api_key}"}
    
    try:
        # Just check the model info without sending a full request
        response = requests.get(api_url, headers=headers, timeout=10)
        
        logger.info(f"Model check response status: {response.status_code}")
        
        if response.status_code == 200:
            logger.info("Model is available!")
            return True
        elif response.status_code == 401:
            logger.error("Authentication failed. Your API key may be invalid.")
            return False
        elif response.status_code == 404:
            logger.error(f"Model '{model_name}' not found. Check the model name.")
            return False
        else:
            logger.error(f"Unexpected status code: {response.status_code}")
            logger.error(f"Response: {response.text[:200]}")
            return False
            
    except Exception as e:
        logger.error(f"Error checking model availability: {str(e)}")
        return False

def test_api_request(model_name, task_type="summarize"):
    """Test a simple API request to the model"""
    # Use the same API_KEY variable that's used in other functions
    api_key = API_KEY
    api_url = f"https://api-inference.huggingface.co/models/{model_name}"
    
    logger.info(f"Testing API request for task: {task_type}")
    
    headers = {"Authorization": f"Bearer {api_key}"}
    
    # Create a simple test input
    test_text = "This is a test input to check if the API is working correctly. The quick brown fox jumps over the lazy dog."
    
    # Adjust prompt based on task
    if task_type == "summarize":
        prompt = f"Summarize the following text: {test_text}"
    elif task_type == "quiz":
        prompt = f"Create a quiz based on this text: {test_text}"
    elif task_type == "mindmap":
        prompt = f"Create a mind map for this text: {test_text}"
    else:
        prompt = test_text
    
    payload = {
        "inputs": prompt,
        "parameters": {
            "max_length": 100,
            "temperature": 0.7,
            "top_p": 0.9,
            "do_sample": True
        }
    }
    
    try:
        logger.info("Sending test request to API...")
        start_time = time.time()
        
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        
        elapsed_time = time.time() - start_time
        logger.info(f"Request completed in {elapsed_time:.2f} seconds")
        logger.info(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                logger.info("API request successful!")
                logger.info(f"Response type: {type(result)}")
                logger.info(f"Response preview: {str(result)[:200]}...")
                return True
            except json.JSONDecodeError:
                logger.error(f"Failed to decode JSON response: {response.text[:200]}...")
                return False
        elif response.status_code == 429:
            logger.warning("Rate limit exceeded. The model might be busy or you've made too many requests.")
            return False
        elif response.status_code == 503:
            logger.warning("Service unavailable. The model might be loading or under maintenance.")
            return False
        else:
            logger.error(f"API request failed with status {response.status_code}")
            logger.error(f"Response: {response.text[:200]}")
            return False
            
    except requests.Timeout:
        logger.error("Request timed out. The server might be busy or the model is too large.")
        return False
    except Exception as e:
        logger.error(f"Error making API request: {str(e)}")
        return False

def test_alternative_models():
    """Test some alternative models that might work better"""
    alternative_models = [
        "google/flan-t5-base",  # Smaller, faster model
        "facebook/bart-large-cnn",  # Good for summarization
        "gpt2",  # Smaller GPT model
        "distilbert-base-uncased"  # Lightweight model
    ]
    
    logger.info("Testing alternative models...")
    
    for model in alternative_models:
        logger.info(f"\n--- Testing model: {model} ---")
        if test_model_availability(model):
            test_api_request(model)
        logger.info(f"--- Finished testing: {model} ---\n")

def main():
    """Run all API tests"""
    logger.info("=== Starting API Tests ===")
    
    # Test the API key
    if not test_api_key():
        logger.error("API key test failed. Exiting tests.")
        return
    
    # Test the current model
    current_model = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.3")
    logger.info(f"\n--- Testing current model: {current_model} ---")
    
    if test_model_availability(current_model):
        # Test different tasks
        for task in ["summarize", "quiz", "mindmap"]:
            logger.info(f"\n--- Testing task: {task} with model: {current_model} ---")
            test_api_request(current_model, task)
    
    # Test alternative models
    test_alternative_models()
    
    logger.info("=== API Tests Completed ===")

if __name__ == "__main__":
    main()