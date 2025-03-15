from fastapi import FastAPI, HTTPException, Body, Depends, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import os
from pathlib import Path
import uvicorn
import logging
from typing import List, Dict, Optional, Any, Union
import json
import requests
import time
# Remove dotenv import since we're not using it
# from dotenv import load_dotenv
from functools import lru_cache
import asyncio
import httpx  # Add this import for async HTTP requests
from contextlib import asynccontextmanager
from ai_service import get_ai_service

# Configure logging with more structure
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log")
    ]
)
logger = logging.getLogger(__name__)

# Remove loading of environment variables
# load_dotenv()

# Import database models with better error handling
try:
    from models import init_db, get_all_notes, get_note_by_id, save_note, update_note, delete_note
except ImportError:
    logger.critical("Failed to import database models. Ensure models.py exists and is properly configured.")
    raise

# Application startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the database
    logger.info("Initializing database...")
    try:
        init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.critical(f"Database initialization failed: {str(e)}")
        raise
    
    yield
    
    # Shutdown: Cleanup resources if needed
    logger.info("Shutting down application...")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Smart Note-Taking API",
    description="An API for managing notes with AI-powered summarization, quiz generation, and mind mapping",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware with more specific configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,  # 24 hours
)

# Add error handling middleware
@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error. Please try again later."}
        )

# Define the path to the frontend directory with better error handling
frontend_dir = Path(__file__).parent.parent / "frontend"
if not frontend_dir.exists():
    logger.warning(f"Frontend directory not found at {frontend_dir}. Static files may not be served correctly.")

# Mount the static files (CSS, JS, images) with proper error handling
try:
    for static_dir in ["css", "js", "img"]:
        static_path = frontend_dir / static_dir
        if static_path.exists():
            app.mount(f"/{static_dir}", StaticFiles(directory=str(static_path)), name=static_dir)
        else:
            logger.warning(f"Static directory {static_dir} not found at {static_path}")
except Exception as e:
    logger.error(f"Failed to mount static directories: {str(e)}")

# Serve the main index.html file at the root
@app.get("/", response_class=FileResponse)
async def read_index():
    index_path = frontend_dir / "index.html"
    if not index_path.exists():
        logger.error(f"Index file not found at {index_path}")
        raise HTTPException(status_code=404, detail="Frontend not found")
    return FileResponse(str(index_path))

# Define data models with validation
class NoteContent(BaseModel):
    content: str = Field(..., min_length=1, description="The content of the note")

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="The title of the note")
    content: str = Field(..., min_length=1, description="The content of the note")
    summary: Optional[str] = Field(None, description="The summary of the note")
    quiz: Optional[str] = Field(None, description="Quiz related to the note content")
    mindmap: Optional[str] = Field(None, description="Mind map of the note content")
    
    class Config:
        schema_extra = {
            "example": {
                "title": "My Note",
                "content": "This is the content of my note."
            }
        }

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="The updated title of the note")
    content: Optional[str] = Field(None, min_length=1, description="The updated content of the note")
    summary: Optional[str] = Field(None, description="The updated summary of the note")
    quiz: Optional[str] = Field(None, description="Updated quiz related to the note content")
    mindmap: Optional[str] = Field(None, description="Updated mind map of the note content")
    
    class Config:
        schema_extra = {
            "example": {
                "title": "Updated Title",
                "content": "This is the updated content of my note."
            }
        }

# API Configuration class
class APIConfig:
    def __init__(self):
        # Use the hardcoded API key that we confirmed is working
        self.huggingface_api_key = "Your_API_Key"
        self.huggingface_api_url = "https://api-inference.huggingface.co/models/"
        # Using only one model for all AI features
        self.model = "mistralai/Mistral-7B-Instruct-v0.3"  # Using Mistral as our single model
        self.max_retries = 3  # Hardcoded value instead of using env var
        self.retry_delay = 5  # Hardcoded value instead of using env var
        
        # Log API configuration for debugging
        logger.info(f"API Key present: {bool(self.huggingface_api_key)}")
        logger.info(f"API Key length: {len(self.huggingface_api_key) if self.huggingface_api_key else 0}")
        logger.info(f"Using model: {self.model}")

# Create API config singleton
@lru_cache()
def get_api_config():
    return APIConfig()

# API endpoints for notes with improved error handling
@app.get("/api/notes", response_model=Dict[str, List[Dict[str, Any]]])
async def api_get_notes():
    """Return all notes from the database."""
    try:
        notes = get_all_notes()
        return {"notes": notes}
    except Exception as e:
        logger.error(f"Failed to retrieve notes: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notes")

@app.get("/api/notes/{note_id}", response_model=Dict[str, Any])
async def api_get_note(note_id: int):
    """Return a specific note by ID."""
    try:
        note = get_note_by_id(note_id)
        if not note:
            raise HTTPException(status_code=404, detail=f"Note with ID {note_id} not found")
        return note
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve note {note_id}")

@app.post("/api/notes", response_model=Dict[str, Union[int, str]])
async def api_create_note(note: NoteCreate):
    """Create a new note."""
    try:
        note_id = save_note(
            title=note.title,
            content=note.content,
            summary=note.summary,
            quiz=note.quiz,
            mindmap=note.mindmap
        )
        if note_id == -1:
            raise HTTPException(status_code=500, detail="Failed to create note")
        return {"id": note_id, "message": "Note created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create note: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create note")

@app.put("/api/notes/{note_id}", response_model=Dict[str, str])
async def api_update_note(note_id: int, note: NoteUpdate):
    """Update an existing note."""
    try:
        # Verify note exists before updating
        existing_note = get_note_by_id(note_id)
        if not existing_note:
            raise HTTPException(status_code=404, detail=f"Note with ID {note_id} not found")
        
        # Create a dictionary of fields to update
        update_data = {}
        if note.title is not None:
            update_data["title"] = note.title
        if note.content is not None:
            update_data["content"] = note.content
        if note.summary is not None:
            update_data["summary"] = note.summary
        if note.quiz is not None:
            update_data["quiz"] = note.quiz
        if note.mindmap is not None:
            update_data["mindmap"] = note.mindmap
            
        # Call update_note with just the note_id and the update_data dictionary
        # This assumes update_note takes only 2 arguments: note_id and a dictionary of fields to update
        success = update_note(note_id, update_data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Update failed")
        return {"message": "Note updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update note {note_id}")

@app.delete("/api/notes/{note_id}", response_model=Dict[str, str])
async def api_delete_note(note_id: int):
    """Delete a note."""
    try:
        # Verify note exists before deleting
        existing_note = get_note_by_id(note_id)
        if not existing_note:
            raise HTTPException(status_code=404, detail=f"Note with ID {note_id} not found")
            
        success = delete_note(note_id)
        if not success:
            raise HTTPException(status_code=500, detail="Delete failed")
        return {"message": "Note deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete note {note_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete note {note_id}")

# Improved HuggingFace API client with better debugging
async def query_huggingface(
    payload: Dict[str, Any],
    task_type: str = "general",  # Changed from model_key to task_type
    config: APIConfig = Depends(get_api_config)
) -> Optional[Any]:
    """
    Send a request to the Hugging Face API with retry logic and better error handling.
    """
    if not config.huggingface_api_key:
        logger.warning("No Hugging Face API key provided")
        return None
        
    model = config.model
    api_url = f"{config.huggingface_api_url}{model}"
    headers = {"Authorization": f"Bearer {config.huggingface_api_key}"}
    
    # Adjust payload based on task type
    if task_type == "summarize":
        # Add summarization-specific instructions
        if "inputs" in payload:
            payload["inputs"] = f"Summarize the following text concisely: {payload['inputs']}"
    elif task_type == "quiz":
        # Add quiz generation specific instructions
        if "inputs" in payload:
            payload["inputs"] = f"Create a quiz with multiple choice, true/false, and fill-in-the-blank questions based on this text: {payload['inputs']}"
    elif task_type == "mindmap":
        # Add mindmap specific instructions
        if "inputs" in payload:
            payload["inputs"] = f"Create a mind map with a central topic and branches based on this text: {payload['inputs']}"
    
    # Log request details for debugging
    logger.info(f"Sending request to model for task: {task_type}")
    logger.info(f"Request payload type: {type(payload['inputs'])}")
    logger.info(f"Request payload length: {len(str(payload['inputs']))}")
    
    for attempt in range(config.max_retries):
        try:
            logger.info(f"API attempt {attempt+1}/{config.max_retries} for {task_type}")
            
            # Use requests library for more reliable API calls
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
            
            # Log response status for debugging
            logger.info(f"API response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    result = response.json()
                    logger.info(f"API request successful, received data type: {type(result)}")
                    return result
                except json.JSONDecodeError:
                    logger.error(f"Failed to decode JSON response: {response.text[:100]}...")
                    return None
                
            if response.status_code == 429:  # Rate limit
                if attempt < config.max_retries - 1:
                    wait_time = config.retry_delay * (attempt + 1)
                    logger.warning(f"Rate limit exceeded, retrying in {wait_time} seconds...")
                    time.sleep(wait_time)
                    continue
            
            # Log error response for debugging
            logger.error(f"API request failed with status {response.status_code}: {response.text[:100]}...")
            return None
                
        except requests.Timeout:
            logger.warning(f"Request for {task_type} timed out (attempt {attempt+1}/{config.max_retries})")
            if attempt < config.max_retries - 1:
                time.sleep(config.retry_delay)
                
        except Exception as e:
            logger.error(f"Error querying Hugging Face API for {task_type}: {str(e)}")
            logger.exception("Full exception details:")
            return None
            
    logger.error(f"All attempts to query for {task_type} failed")
    return None

# Basic fallback summarization function
def basic_summarize(content: str) -> str:
    """Provide a better summarization when the API fails."""
    sentences = content.split('.')
    sentences = [s.strip() for s in sentences if len(s.strip()) > 0]
    
    if not sentences:
        return "No content to summarize."
    
    # Create a more concise summary
    if len(sentences) >= 3:
        # Use first sentence as introduction
        summary = sentences[0] + "."
        
        # Extract key concepts
        words = content.lower().split()
        # Remove common words
        common_words = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "about", "like", "through", "over", "before", "after", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "can", "could", "will", "would", "shall", "should", "may", "might", "must"]
        filtered_words = [word for word in words if word not in common_words and len(word) > 3]
        
        # Count word frequency
        from collections import Counter
        word_counts = Counter(filtered_words)
        
        # Get most common words as key concepts
        key_concepts = [word for word, count in word_counts.most_common(5)]
        
        # Add key concepts to summary
        if key_concepts:
            summary += " Key concepts include: " + ", ".join(key_concepts) + "."
        
        return summary
    else:
        # For very short content
        return sentences[0] + "."

# Updated summarize endpoint with better error handling
@app.post("/api/summarize", response_model=Dict[str, str])
async def generate_summary(note: NoteContent):
    """Generate a summary of the provided note content."""
    content = note.content.strip()
    
    if not content:
        return {"summary": "No content to summarize."}
    
    try:
        # Get the AI service
        ai_service = get_ai_service()
        
        # Generate summary - Change this line from summarize to summarize_text
        summary = ai_service.summarize_text(content)
        
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Failed to generate summary: {str(e)}")
        return {"summary": "Failed to generate summary due to an error."}

@app.post("/api/generate-quiz", response_model=Dict[str, Dict[str, List[Dict[str, Any]]]])
async def generate_quiz(note: NoteContent):
    """Generate a quiz based on the provided note content."""
    content = note.content.strip()
    
    if not content:
        return {"quiz": {"mcq": [], "true_false": [], "fill_blank": []}}
    
    try:
        # Get the AI service
        ai_service = get_ai_service()
        
        # Generate quiz
        quiz = ai_service.generate_quiz(content)
        
        return {"quiz": quiz}
    except Exception as e:
        logger.error(f"Failed to generate quiz: {str(e)}")
        return {"quiz": {"mcq": [], "true_false": [], "fill_blank": []}}

@app.post("/api/mindmap", response_model=Dict[str, Dict[str, Any]])
async def generate_mindmap(note: NoteContent):
    """Generate a mind map based on the provided note content."""
    content = note.content.strip()
    
    if not content:
        return {"mindmap": {"central": "Empty", "branches": []}}
    
    try:
        # Get the AI service
        ai_service = get_ai_service()
        
        # Generate mind map
        mindmap = ai_service.generate_mindmap(content)
        
        return {"mindmap": mindmap}
    except Exception as e:
        logger.error(f"Failed to generate mind map: {str(e)}")
        return {"mindmap": {"central": "Error", "branches": []}}

# Helper function to extract items from text
def extract_items_from_text(text: str) -> List[str]:
    """Extract a list of items from generated text."""
    items = []
    
    # Try to extract by list format (1. Item, 2. Item, etc.)
    list_pattern = r'\d+\.\s*(.*?)(?=\d+\.|$)'
    import re
    list_matches = re.findall(list_pattern, text, re.DOTALL)
    if list_matches:
        items = [item.strip() for item in list_matches if item.strip()]
    
    # If no list format, try to extract by lines
    if not items:
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            items = lines
    
    # If no lines, try to extract by commas or semicolons
    if not items:
        if ',' in text:
            items = [item.strip() for item in text.split(',') if item.strip()]
        elif ';' in text:
            items = [item.strip() for item in text.split(';') if item.strip()]
    
    # If still no items, try to extract by sentences
    if not items:
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        items = sentences
    
    # If we have a single long item, try to break it down
    if len(items) == 1 and len(items[0].split()) > 10:
        words = items[0].split()
        items = [" ".join(words[i:i+5]) for i in range(0, len(words), 5)][:4]
    
    return items

# Handwriting recognition endpoint
@app.post("/api/handwriting", response_model=Dict[str, str])
async def process_handwriting(file: UploadFile = File(...)):
    """Process handwritten text from an uploaded image."""
    try:
        # Implementation for handwriting recognition would go here
        # This is a placeholder that returns a simple response
        return {"text": "Handwriting recognition feature coming soon!"}
    except Exception as e:
        logger.error(f"Failed to process handwriting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process handwriting: {str(e)}")

# Text-to-speech endpoint
@app.post("/api/text-to-speech", response_model=Dict[str, str])
async def text_to_speech(note: NoteContent):
    """Convert note content to speech (placeholder)."""
    try:
        # Implementation for text-to-speech would go here
        # This is a placeholder that returns a simple response
        return {"message": "Text-to-speech feature coming soon!"}
    except Exception as e:
        logger.error(f"Failed to convert text to speech: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to convert text to speech: {str(e)}")

# Start the application
if __name__ == "__main__":
    import socket
    
    # Try to find an available port
    def find_available_port(start_port=8000, max_attempts=10):
        for port_attempt in range(start_port, start_port + max_attempts):
            try:
                # Try to create a socket with the port
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('0.0.0.0', port_attempt))
                    return port_attempt
            except OSError:
                logger.warning(f"Port {port_attempt} is already in use, trying next port...")
                continue
        
        # If we get here, no ports were available
        logger.warning(f"No available ports found in range {start_port}-{start_port + max_attempts - 1}")
        return start_port + max_attempts  # Return a port anyway, might fail but worth trying
    
    # Hardcoded port instead of using env var
    preferred_port = 8000
    port = find_available_port(preferred_port)
    
    logger.info(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)


# Add this endpoint after your other API endpoints

@app.post("/api/test-ai", response_model=Dict[str, str])
async def test_ai_service(content: NoteContent):
    """Test the AI service with a simple request."""
    try:
        ai_service = get_ai_service()
        
        # Test the summarization
        summary = ai_service.summarize_text(content.content)
        
        # Test the quiz generation
        quiz_result = ai_service.generate_quiz(content.content)
        quiz_json = json.dumps(quiz_result)
        
        # Test the mindmap generation
        mindmap_result = ai_service.generate_mindmap(content.content)
        mindmap_json = json.dumps(mindmap_result)
        
        return {
            "status": "success",
            "summary": summary,
            "quiz": quiz_json,
            "mindmap": mindmap_json
        }
    except Exception as e:
        logger.error(f"AI service test failed: {str(e)}")
        return {"status": "error", "message": str(e)}


@app.get("/api/debug/ai-service", response_model=Dict[str, Any])
async def debug_ai_service():
    """Debug the AI service connection"""
    try:
        ai_service = get_ai_service()
        result = ai_service.debug_api_connection()
        return result
    except Exception as e:
        logger.error(f"AI service debug failed: {str(e)}")
        return {"success": False, "error": str(e)}