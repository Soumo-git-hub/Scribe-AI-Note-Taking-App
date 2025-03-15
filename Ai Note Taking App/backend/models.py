import sqlite3
import json
import os
import logging
from typing import List, Dict, Optional, Any
from pathlib import Path

# Configure logging
logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path(__file__).parent / "notes.db"

def init_db():
    """Initialize the database with the notes table if it doesn't exist."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # Create notes table if it doesn't exist
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            summary TEXT,
            quiz TEXT,
            mindmap TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        ''')
        
        conn.commit()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {str(e)}")
    finally:
        if conn:
            conn.close()

def get_all_notes() -> List[Dict]:
    """Get all notes from the database."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row  # This enables column access by name
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM notes ORDER BY updated_at DESC')
        rows = cursor.fetchall()
        
        # Convert rows to dictionaries
        notes = []
        for row in rows:
            note = dict(row)
            
            # Parse JSON fields if they exist and are not empty
            for field in ['quiz', 'mindmap']:
                if note.get(field) and isinstance(note[field], str):
                    try:
                        note[field] = json.loads(note[field])
                    except json.JSONDecodeError:
                        # If JSON parsing fails, keep as string
                        pass
            
            notes.append(note)
        
        return notes
    except Exception as e:
        logger.error(f"Error getting all notes: {str(e)}")
        return []  # Return empty list on error
    finally:
        if conn:
            conn.close()

def get_note_by_id(note_id: int) -> Optional[Dict]:
    """Get a specific note by ID."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM notes WHERE id = ?', (note_id,))
        row = cursor.fetchone()
        
        if not row:
            return None
        
        note = dict(row)
        
        # Parse JSON fields if they exist and are not empty
        for field in ['quiz', 'mindmap']:
            if note.get(field) and isinstance(note[field], str):
                try:
                    note[field] = json.loads(note[field])
                except json.JSONDecodeError:
                    # If JSON parsing fails, keep as string
                    pass
        
        return note
    except Exception as e:
        logger.error(f"Error getting note by ID {note_id}: {str(e)}")
        return None
    finally:
        if conn:
            conn.close()

def save_note(title: str, content: str, summary: Optional[str] = None, 
              quiz: Optional[str] = None, mindmap: Optional[str] = None) -> int:
    """Save a new note to the database."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # Insert the note
        cursor.execute('''
        INSERT INTO notes (title, content, summary, quiz, mindmap)
        VALUES (?, ?, ?, ?, ?)
        ''', (
            title,
            content,
            summary,
            quiz,
            mindmap
        ))
        
        # Get the ID of the inserted note
        note_id = cursor.lastrowid
        conn.commit()
        
        logger.info(f"Note saved with ID: {note_id}")
        return note_id
    except Exception as e:
        logger.error(f"Error saving note: {str(e)}")
        if conn:
            conn.rollback()
        return -1
    finally:
        if conn:
            conn.close()

def update_note(note_id: int, note_data: Dict) -> Optional[Dict]:
    """Update an existing note."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # Get the existing note
        existing_note = get_note_by_id(note_id)
        if not existing_note:
            return None
        
        # Prepare data for update
        note_to_update = {**existing_note, **note_data}
        
        # Convert JSON fields to strings for storage
        for field in ['quiz', 'mindmap']:
            if field in note_to_update and note_to_update[field] and not isinstance(note_to_update[field], str):
                note_to_update[field] = json.dumps(note_to_update[field])
        
        # Update the note
        cursor.execute('''
        UPDATE notes
        SET title = ?, content = ?, summary = ?, quiz = ?, mindmap = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        ''', (
            note_to_update.get('title', ''),
            note_to_update.get('content', ''),
            note_to_update.get('summary', ''),
            note_to_update.get('quiz', ''),
            note_to_update.get('mindmap', ''),
            note_id
        ))
        
        conn.commit()
        
        # Return the updated note
        return get_note_by_id(note_id)
    except Exception as e:
        logger.error(f"Error updating note {note_id}: {str(e)}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def delete_note(note_id: int) -> bool:
    """Delete a note from the database."""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM notes WHERE id = ?', (note_id,))
        conn.commit()
        
        return True
    except Exception as e:
        logger.error(f"Error deleting note {note_id}: {str(e)}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()