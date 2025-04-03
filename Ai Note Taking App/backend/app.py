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
from functools import lru_cache
import asyncio
import httpx
from contextlib import asynccontextmanager
from ai_service import get_ai_service
from PyPDF2 import PdfReader
from werkzeug.utils import secure_filename
from PIL import Image
import pytesseract

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log")
    ]
)
logger = logging.getLogger(__name__)

# Application startup and shutdown events
# Import the init_db function from database module
from database import init_db, get_all_notes, get_note_by_id, save_note, update_note, delete_note

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing database...")
    try:
        init_db()  # This line was causing the error
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.critical(f"Database initialization failed: {str(e)}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")

    logger.info("Shutting down application...")

# Create FastAPI app with lifespan
app = FastAPI(
    title="Smart Note-Taking API",
    description="An API for managing notes with AI-powered summarization, quiz generation, and mind mapping",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,  # 24 hours
    expose_headers=["Content-Length", "Content-Type", "Content-Disposition"],
)

# Status endpoint for health checks
@app.get("/api/status")
async def get_status():
    return {"status": "ok", "version": "2.0.0"}

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

# Define the path to the frontend directory
frontend_dir = Path(__file__).parent.parent / "frontend"
if not frontend_dir.exists():
    logger.warning(f"Frontend directory not found at {frontend_dir}. Static files may not be served correctly.")

# Mount the static files
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

# Define data models
class NoteContent(BaseModel):
    content: str = Field(..., min_length=1, description="The content of the note")

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200, description="The title of the note")
    content: str = Field(..., min_length=1, description="The content of the note")
    summary: Optional[str] = Field(None, description="The summary of the note")
    quiz: Optional[str] = Field(None, description="Quiz related to the note content")
    mindmap: Optional[str] = Field(None, description="Mind map of the note content")

class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="The updated title of the note")
    content: Optional[str] = Field(None, min_length=1, description="The updated content of the note")
    summary: Optional[str] = Field(None, description="The updated summary of the note")
    quiz: Optional[str] = Field(None, description="Updated quiz related to the note content")
    mindmap: Optional[str] = Field(None, description="Updated mind map of the note content")

# API Configuration class
class APIConfig:
    def __init__(self):
        self.huggingface_api_key = os.getenv("HUGGINGFACE_API_KEY", "")
        self.huggingface_api_url = "https://api-inference.huggingface.co/models/"
        self.model = "mistralai/Mistral-7B-Instruct-v0.3"
        self.max_retries = 3
        self.retry_delay = 5

        logger.info(f"API Key present: {bool(self.huggingface_api_key)}")
        logger.info(f"Using model: {self.model}")

# Create API config singleton
@lru_cache()
def get_api_config():
    return APIConfig()

# API endpoints for notes
@app.get("/api/notes", response_model=Dict[str, List[Dict[str, Any]]])
async def api_get_notes():
    try:
        notes = get_all_notes()
        return {"notes": notes}
    except Exception as e:
        logger.error(f"Failed to retrieve notes: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve notes")

@app.get("/api/notes/{note_id}", response_model=Dict[str, Any])
async def api_get_note(note_id: int):
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
    try:
        existing_note = get_note_by_id(note_id)
        if not existing_note:
            raise HTTPException(status_code=404, detail=f"Note with ID {note_id} not found")

        update_data = {key: value for key, value in note.dict().items() if value is not None}
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
    try:
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

# PDF processing endpoints
# Add PDF processing configuration
UPLOAD_FOLDER = 'uploads/'
ALLOWED_EXTENSIONS = {'pdf'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Single PDF upload endpoint
@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Process an uploaded PDF file and extract text content.
    """
    try:
        logger.info(f"Received PDF upload: {file.filename}")
        
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            return JSONResponse(
                status_code=400,
                content={"detail": "Only PDF files are accepted"}
            )
        
        # Create temp directory if it doesn't exist
        temp_dir = Path(__file__).parent / "temp"
        temp_dir.mkdir(exist_ok=True)
        
        # Save the uploaded file with a timestamp to avoid conflicts
        timestamp = int(time.time())
        safe_filename = secure_filename(file.filename)
        file_path = temp_dir / f"{timestamp}_{safe_filename}"
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        logger.info(f"Saved PDF to {file_path}")
        
        # Extract text from PDF
        extracted_text = ""
        try:
            with open(file_path, "rb") as pdf_file:
                pdf_reader = PdfReader(pdf_file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n\n"
            
            # Clean up the extracted text
            extracted_text = extracted_text.strip()
            
            # Get a title suggestion from the first few words
            title_suggestion = " ".join(extracted_text.split()[:5]) + "..."
            if len(title_suggestion) > 50:
                title_suggestion = title_suggestion[:50] + "..."
            
            logger.info(f"Successfully extracted {len(extracted_text)} characters from PDF")
            
            # Schedule file for deletion after 10 minutes
            asyncio.create_task(delete_file_after_delay(file_path, delay=600))
            
            return {
                "text": extracted_text,
                "title": title_suggestion,
                "pages": len(pdf_reader.pages),
                "filename": file.filename
            }
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            # Try to clean up the file
            try:
                if file_path.exists():
                    file_path.unlink()
            except:
                pass
                
            return JSONResponse(
                status_code=500,
                content={"detail": f"Error extracting text from PDF: {str(e)}"}
            )
    except Exception as e:
        logger.error(f"Error processing PDF upload: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": f"Error processing PDF upload: {str(e)}"}
        )

# Helper function to delete files after a delay
async def delete_file_after_delay(file_path: Path, delay: int = 600):
    """Delete a file after a specified delay in seconds"""
    try:
        await asyncio.sleep(delay)
        if file_path.exists():
            file_path.unlink()
            logger.info(f"Deleted temporary file {file_path} after {delay} seconds")
    except Exception as e:
        logger.error(f"Error deleting temporary file {file_path}: {str(e)}")

# Helper function to extract items from text
def extract_items_from_text(text: str) -> List[str]:
    items = []
    list_pattern = r'\d+\.\s*(.*?)(?=\d+\.|$)'
    import re
    list_matches = re.findall(list_pattern, text, re.DOTALL)
    if list_matches:
        items = [item.strip() for item in list_matches if item.strip()]

    if not items:
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            items = lines

    if not items:
        if ',' in text:
            items = [item.strip() for item in text.split(',') if item.strip()]
        elif ';' in text:
            items = [item.strip() for item in text.split(';') if item.strip()]

    if not items:
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        items = sentences

    if len(items) == 1 and len(items[0].split()) > 10:
        words = items[0].split()
        items = [" ".join(words[i:i+5]) for i in range(0, len(words), 5)][:4]

    return items

# Handwriting recognition endpoint
@app.post("/api/handwriting")
async def process_handwriting(file: UploadFile = File(...)):
    """
    Process handwritten notes from an image or PDF file.
    """
    logger.info(f"Processing handwriting from file: {file.filename}")
    
    # Create a temporary directory if it doesn't exist
    temp_dir = Path(__file__).parent / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    # Secure the filename to prevent path traversal attacks
    timestamp = int(time.time())
    safe_filename = secure_filename(file.filename)
    file_path = temp_dir / f"{timestamp}_{safe_filename}"
    
    try:
        # Save the uploaded file
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        logger.info(f"File saved to {file_path}")
        
        # Check if it's a PDF file
        if file.filename.lower().endswith('.pdf'):
            logger.info("Processing PDF file")
            
            # Extract text from PDF
            text = ""
            title = "Notes from " + file.filename
            
            try:
                with open(file_path, "rb") as f:
                    pdf = PdfReader(f)
                    
                    # Extract text from each page
                    for page_num in range(len(pdf.pages)):
                        page = pdf.pages[page_num]
                        page_text = page.extract_text()
                        if page_text:
                            text += page_text + "\n\n"
                    
                    # If we have a title page, use it as the title
                    if len(pdf.pages) > 0:
                        first_page = pdf.pages[0].extract_text()
                        if first_page:
                            # Try to extract a title from the first few lines
                            lines = first_page.split('\n')
                            if lines and len(lines[0].strip()) > 0 and len(lines[0].strip()) < 100:
                                title = lines[0].strip()
                
                logger.info(f"Successfully extracted {len(text)} characters from PDF")
                
                # Schedule file for deletion after 10 minutes
                asyncio.create_task(delete_file_after_delay(file_path, delay=600))
                
                # Return in the same format as the upload-pdf endpoint for consistency
                return {
                    "text": text,
                    "title": title,
                    "pages": len(pdf.pages),
                    "filename": file.filename
                }
                
            except Exception as e:
                logger.error(f"Error extracting text from PDF: {str(e)}")
                # Try to clean up the file
                try:
                    if file_path.exists():
                        file_path.unlink()
                except:
                    pass
                    
                return JSONResponse(
                    status_code=500,
                    content={"detail": f"Error extracting text from PDF: {str(e)}"}
                )
        else:
            # For non-PDF files, use pytesseract for OCR
            logger.info("Processing non-PDF file with OCR")
            try:
                # Load the image
                image = Image.open(file_path)
                
                # Perform OCR
                text = pytesseract.image_to_string(image)
                
                if not text or len(text.strip()) < 10:
                    # Try to clean up the file
                    try:
                        if file_path.exists():
                            file_path.unlink()
                    except:
                        pass
                        
                    return JSONResponse(
                        status_code=400, 
                        content={"detail": "Could not extract meaningful text from the image"}
                    )
                
                # Schedule file for deletion after 10 minutes
                asyncio.create_task(delete_file_after_delay(file_path, delay=600))
                
                return {
                    "text": text,
                    "title": "Notes from " + file.filename,
                    "filename": file.filename
                }
            except Exception as e:
                logger.error(f"Error processing image with OCR: {str(e)}")
                # Try to clean up the file
                try:
                    if file_path.exists():
                        file_path.unlink()
                except:
                    pass
                    
                return JSONResponse(
                    status_code=500,
                    content={"detail": f"Error processing image: {str(e)}"}
                )
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}")
        # Try to clean up the file
        try:
            if file_path.exists():
                file_path.unlink()
        except:
            pass
            
        return JSONResponse(
            status_code=500, 
            content={"detail": f"Error processing file: {str(e)}"}
        )

# Text-to-speech endpoint
@app.post("/api/text-to-speech", response_model=Dict[str, str])
async def text_to_speech(note: NoteContent):
    try:
        return {"message": "Text-to-speech feature coming soon!"}
    except Exception as e:
        logger.error(f"Failed to convert text to speech: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to convert text to speech: {str(e)}")

# Start the application
if __name__ == "__main__":
    import socket

    def find_available_port(start_port=8000, max_attempts=10):
        for port_attempt in range(start_port, start_port + max_attempts):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('0.0.0.0', port_attempt))
                    return port_attempt
            except OSError:
                logger.warning(f"Port {port_attempt} is already in use, trying next port...")
                continue

        logger.warning(f"No available ports found in range {start_port}-{start_port + max_attempts - 1}")
        return start_port + max_attempts

    preferred_port = 8000
    port = find_available_port(preferred_port)

    logger.info(f"Starting server on port {port}")
    
    import sys
    if "--reload" in sys.argv:
        # Development mode with auto-reload
        import uvicorn
        uvicorn.run("app:app", host="0.0.0.0", port=port, reload=True)
    else:
        # Production mode
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=port)

# Add this endpoint after your other API endpoints
@app.post("/api/test-ai", response_model=Dict[str, str])
async def test_ai_service(content: NoteContent):
    try:
        ai_service = get_ai_service()
        summary = ai_service.summarize_text(content.content)
        quiz_result = ai_service.generate_quiz(content.content)
        quiz_json = json.dumps(quiz_result)
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
    try:
        ai_service = get_ai_service()
        result = ai_service.debug_api_connection()
        return result
    except Exception as e:
        logger.error(f"AI service debug failed: {str(e)}")
        return {"success": False, "error": str(e)}

# Improved HuggingFace API client
async def query_huggingface(
    payload: Dict[str, Any],
    task_type: str = "general",
    config: APIConfig = Depends(get_api_config)
) -> Optional[Any]:
    if not config.huggingface_api_key:
        logger.warning("No Hugging Face API key provided")
        return None

    model = config.model
    api_url = f"{config.huggingface_api_url}{model}"
    headers = {"Authorization": f"Bearer {config.huggingface_api_key}"}

    if task_type == "summarize":
        payload["inputs"] = f"Summarize the following text concisely: {payload['inputs']}"
    elif task_type == "quiz":
        payload["inputs"] = f"Create a quiz with multiple choice, true/false, and fill-in-the-blank questions based on this text: {payload['inputs']}"
    elif task_type == "mindmap":
        payload["inputs"] = f"Create a mind map with a central topic and branches based on this text: {payload['inputs']}"

    logger.info(f"Sending request to model for task: {task_type}")

    for attempt in range(config.max_retries):
        try:
            logger.info(f"API attempt {attempt+1}/{config.max_retries} for {task_type}")
            response = requests.post(api_url, headers=headers, json=payload, timeout=30)
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
    sentences = content.split('.')
    sentences = [s.strip() for s in sentences if len(s.strip()) > 0]

    if not sentences:
        return "No content to summarize."

    if len(sentences) >= 3:
        summary = sentences[0] + "."
        words = content.lower().split()
        common_words = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "about", "like", "through", "over", "before", "after", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "can", "could", "will", "would", "shall", "should", "may", "might", "must"]
        filtered_words = [word for word in words if word not in common_words and len(word) > 3]

        from collections import Counter
        word_counts = Counter(filtered_words)
        key_concepts = [word for word, count in word_counts.most_common(5)]

        if key_concepts:
            summary += " Key concepts include: " + ", ".join(key_concepts) + "."

        return summary
    else:
        return sentences[0] + "."

# Updated summarize endpoint
@app.post("/api/summarize", response_model=Dict[str, str])
async def generate_summary(note: NoteContent):
    content = note.content.strip()

    if not content:
        return {"summary": "No content to summarize."}

    try:
        ai_service = get_ai_service()
        summary = ai_service.summarize_text(content)
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Failed to generate summary: {str(e)}")
        return {"summary": "Failed to generate summary due to an error."}

@app.post("/api/generate-quiz", response_model=Dict[str, Dict[str, List[Dict[str, Any]]]])
async def generate_quiz(note: NoteContent):
    content = note.content.strip()

    if not content:
        return {"quiz": {"mcq": [], "true_false": [], "fill_blank": []}}

    try:
        ai_service = get_ai_service()
        quiz = ai_service.generate_quiz(content)
        return {"quiz": quiz}
    except Exception as e:
        logger.error(f"Failed to generate quiz: {str(e)}")
        return {"quiz": {"mcq": [], "true_false": [], "fill_blank": []}}

@app.post("/api/mindmap", response_model=Dict[str, Dict[str, Any]])
async def generate_mindmap(note: NoteContent):
    content = note.content.strip()

    if not content:
        return {"mindmap": {"central": "Empty", "branches": []}}

    try:
        ai_service = get_ai_service()
        mindmap = ai_service.generate_mindmap(content)
        return {"mindmap": mindmap}
    except Exception as e:
        logger.error(f"Failed to generate mind map: {str(e)}")
        return {"mindmap": {"central": "Error", "branches": []}}
