import sqlite3
import os
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database file path
DB_PATH = Path(__file__).parent / "notes.db"

def initialize_database():
    """Initialize the database with required tables"""
    try:
        # Remove existing database if it exists
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
            logger.info(f"Removed existing database: {DB_PATH}")
        
        # Create new database
        conn = sqlite3.connect(str(DB_PATH))
        cursor = conn.cursor()
        
        # Create the notes table
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
        
        # Add a sample note to verify it works
        cursor.execute(
            "INSERT INTO notes (title, content) VALUES (?, ?)",
            ("Sample Note", "This is a sample note to verify the database is working correctly.")
        )
        
        conn.commit()
        logger.info("Database initialized successfully with sample note")
        
        # Verify the note was added
        cursor.execute("SELECT * FROM notes")
        notes = cursor.fetchall()
        logger.info(f"Found {len(notes)} notes in the database")
        
        conn.close()
        logger.info("Database connection closed")
        
        return True
    except Exception as e:
        logger.error(f"Database initialization error: {str(e)}")
        return False

if __name__ == "__main__":
    logger.info("Starting database initialization")
    result = initialize_database()
    if result:
        logger.info("Database initialization complete")
    else:
        logger.error("Database initialization failed") 