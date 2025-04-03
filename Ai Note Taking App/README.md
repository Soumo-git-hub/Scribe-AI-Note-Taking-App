# Scribe - AI Note Taking App

Scribe is an intelligent note-taking application with AI-powered features for summarization, quiz generation, and mind mapping. It also includes PDF text extraction capabilities.

![Scribe Screenshot](frontend/img/screenshot.png)

## Features

- **Create and manage notes** with a clean, modern interface
- **Extract text from PDFs** with automatic content saving
- **Generate AI summaries** of your notes
- **Create quizzes** based on your note content
- **Build mind maps** to visualize relationships between concepts
- **Dark mode support** for comfortable use in any environment
- **Markdown support** for rich text formatting

## Technology Stack

### Frontend
- HTML5, CSS3, JavaScript
- Bootstrap 5 for responsive design
- Marked.js for Markdown parsing

### Backend
- Python with FastAPI
- SQLite for data storage
- PyPDF2 for PDF text extraction
- Hugging Face API integration for AI features

## Setup and Installation

### Prerequisites
- Python 3.8+ installed
- A modern web browser
- Optional: Hugging Face API key for enhanced AI features

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install required Python packages:
   ```
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```
   python app.py
   ```
   The server will run on http://localhost:8001 by default.

### Frontend Setup

1. No build steps required! Simply open the `frontend/index.html` file in your browser.

2. For the best experience, use a local server to serve the frontend files.

## Usage

1. **Creating Notes**: Click "New Note" to create a note with title and content.

2. **Uploading PDFs**: Use the "Upload PDF" button to extract text from PDF files.

3. **AI Features**: After creating a note, use the AI tools to generate summaries, quizzes, and mind maps.

4. **Saving and Editing**: All notes are automatically saved and can be edited later.

## Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```
# Hugging Face API credentials
HUGGINGFACE_API_KEY=your_api_key_here
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.3

# CORS settings
ALLOWED_ORIGINS=*
```

You can use the provided `.env.example` file as a template.

### Securing API Keys

For security reasons:
1. Never commit your actual API keys to version control
2. Use environment variables instead of hardcoding keys
3. When deploying, use secure methods to manage secrets
4. For local development, keep your .env file in .gitignore

## Project Structure

```
.
├── backend/
│   ├── app.py                  # Main FastAPI application
│   ├── ai_service.py           # AI feature integration
│   ├── database.py             # Database operations
│   ├── requirements.txt        # Python dependencies
│   └── temp/                   # Temporary storage for uploads
├── frontend/
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript files
│   │   ├── main.js             # Core application logic
│   │   ├── pdf-handler.js      # PDF processing
│   │   ├── ai-features.js      # AI feature integration
│   │   └── dark-mode.js        # Theme switching
│   ├── img/                    # Images and icons
│   └── index.html              # Main HTML page
└── README.md                   # Project documentation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) for the backend framework
- [Bootstrap](https://getbootstrap.com/) for the frontend framework
- [Hugging Face](https://huggingface.co/) for AI model APIs
- [PyPDF2](https://pypdf2.readthedocs.io/) for PDF processing 