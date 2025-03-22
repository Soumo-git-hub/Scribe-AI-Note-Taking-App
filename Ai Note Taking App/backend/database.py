import sqlite3
import os
import logging
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

# Database file path - use absolute path to match models.py
DB_PATH = Path(__file__).parent / "notes.db"

def init_db():
    """Initialize the database with required tables"""
    try:
        # Check if database file exists
        db_exists = os.path.exists(DB_PATH)
        
        if db_exists:
            logger.info(f"Using existing database file: {DB_PATH}")
            # Just verify connection and structure
            conn = sqlite3.connect(str(DB_PATH))
            cursor = conn.cursor()
            
            # Check if notes table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
            if cursor.fetchone():
                logger.info("Notes table exists in database")
            else:
                logger.warning("Notes table not found in existing database, creating it")
                create_notes_table(cursor)
                
            conn.commit()
            conn.close()
        else:
            logger.info(f"Database file not found, creating new one: {DB_PATH}")
            conn = sqlite3.connect(str(DB_PATH))
            cursor = conn.cursor()
            create_notes_table(cursor)
            conn.commit()
            conn.close()
            logger.info("Database created successfully")
            
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        raise

def create_notes_table(cursor):
    """Create the notes table if it doesn't exist"""
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

def get_all_notes():
    """Retrieve all notes from the database"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM notes ORDER BY updated_at DESC")
        notes = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        return notes
    except Exception as e:
        logger.error(f"Error retrieving notes: {str(e)}")
        return []

def get_note_by_id(note_id):
    """Retrieve a specific note by ID"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM notes WHERE id = ?", (note_id,))
        note = cursor.fetchone()
        
        conn.close()
        
        if note:
            return dict(note)
        return None
    except Exception as e:
        logger.error(f"Error retrieving note {note_id}: {str(e)}")
        return None

def save_note(title, content, summary=None, quiz=None, mindmap=None):
    """Save a new note to the database"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO notes (title, content, summary, quiz, mindmap) VALUES (?, ?, ?, ?, ?)",
            (title, content, summary, quiz, mindmap)
        )
        
        note_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        return note_id
    except Exception as e:
        logger.error(f"Error saving note: {str(e)}")
        return -1

def update_note(note_id, update_data):
    """Update an existing note"""
    try:
        if not update_data:
            return True
            
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # Build the update query dynamically
        set_clause = ", ".join([f"{key} = ?" for key in update_data.keys()])
        values = list(update_data.values())
        
        # Add updated_at timestamp
        set_clause += ", updated_at = CURRENT_TIMESTAMP"
        
        # Add the note_id to the values
        values.append(note_id)
        
        query = f"UPDATE notes SET {set_clause} WHERE id = ?"
        cursor.execute(query, values)
        
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        logger.error(f"Error updating note {note_id}: {str(e)}")
        return False

def delete_note(note_id):
    """Delete a note from the database"""
    try:
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        
        conn.commit()
        conn.close()
        
        return True
    except Exception as e:
        logger.error(f"Error deleting note {note_id}: {str(e)}")
        return False