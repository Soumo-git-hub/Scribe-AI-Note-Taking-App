# Scribe Backend

This directory contains the backend code for the Scribe AI Note Taking App.

## Technology Stack

- FastAPI - Modern Python web framework
- SQLite - Database for note storage
- PyPDF2 - PDF text extraction
- Hugging Face API - AI model integration

## Setup

1. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
   
3. Edit the `.env` file to include your Hugging Face API key.

4. Start the server:
   ```
   python app.py
   ```

The server will run on `http://localhost:8001` by default.

## API Endpoints

### Notes
- `GET /api/notes` - Get all notes
- `GET /api/notes/{note_id}` - Get a specific note
- `POST /api/notes` - Create a new note
- `PUT /api/notes/{note_id}` - Update a note
- `DELETE /api/notes/{note_id}` - Delete a note

### PDF Processing
- `POST /api/upload-pdf` - Extract text from a PDF file
- `POST /api/handwriting` - Extract text from images or PDFs (fallback)

### AI Features
- `POST /api/summarize` - Generate a summary of note content
- `POST /api/generate-quiz` - Generate quiz questions from note content
- `POST /api/mindmap` - Generate a mind map from note content
- `POST /api/text-to-speech` - Convert text to speech (placeholder)

### System
- `GET /api/status` - Check API status

## Project Structure

- `app.py` - Main FastAPI application with route definitions
- `database.py` - Database operations for note storage
- `ai_service.py` - AI feature integration with Hugging Face
- `requirements.txt` - Python dependencies
- `temp/` - Temporary storage for uploaded files

## Development

The server automatically reloads when code changes are detected. 