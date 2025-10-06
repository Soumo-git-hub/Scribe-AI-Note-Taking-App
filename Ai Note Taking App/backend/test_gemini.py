#!/usr/bin/env python3
"""
Test script to verify Gemini API integration
"""

import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
from ai_service import get_ai_service

def test_gemini_integration():
    """Test the Gemini API integration"""
    print("Testing Gemini API Integration...")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Check if API key is loaded
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        return False
    
    print(f"✅ API Key loaded: {api_key[:10]}...")
    
    # Get AI service instance
    try:
        ai_service = get_ai_service()
        print("✅ AI Service initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize AI Service: {e}")
        return False
    
    # Test API connection
    print("\n🔧 Testing API connection...")
    debug_result = ai_service.debug_api_connection()
    
    if debug_result.get('success'):
        print("✅ API connection successful!")
        print(f"   Model: {debug_result.get('model', 'Unknown')}")
        print(f"   Test response: {debug_result.get('test_response', 'No response')}")
    else:
        print(f"❌ API connection failed: {debug_result.get('error', 'Unknown error')}")
        return False
    
    # Test summarization
    print("\n📝 Testing summarization...")
    test_text = """
    Artificial Intelligence (AI) is transforming the way we work and live. 
    Machine learning algorithms can now process vast amounts of data to identify patterns 
    and make predictions. This technology is being applied in healthcare, finance, 
    transportation, and many other industries to improve efficiency and outcomes.
    """
    
    try:
        summary = ai_service.summarize_text(test_text)
        print(f"✅ Summary generated: {summary[:100]}...")
    except Exception as e:
        print(f"❌ Summarization failed: {e}")
        return False
    
    # Test quiz generation
    print("\n🧠 Testing quiz generation...")
    try:
        quiz = ai_service.generate_quiz(test_text)
        print(f"✅ Quiz generated with {len(quiz.get('mcq', []))} MCQ questions")
    except Exception as e:
        print(f"❌ Quiz generation failed: {e}")
        return False
    
    # Test mindmap generation
    print("\n🗺️  Testing mindmap generation...")
    try:
        mindmap = ai_service.generate_mindmap(test_text)
        print(f"✅ Mindmap generated with central topic: {mindmap.get('central', 'Unknown')}")
    except Exception as e:
        print(f"❌ Mindmap generation failed: {e}")
        return False
    
    print("\n🎉 All tests passed! Gemini API integration is working correctly.")
    return True

if __name__ == "__main__":
    success = test_gemini_integration()
    exit(0 if success else 1)