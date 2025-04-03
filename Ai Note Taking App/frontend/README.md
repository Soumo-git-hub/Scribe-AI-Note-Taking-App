# Scribe Frontend

This directory contains the frontend code for the Scribe AI Note Taking App.

## Structure

- `index.html` - Main HTML file
- `css/` - Stylesheets
- `js/` - JavaScript files
  - `main.js` - Core application logic
  - `pdf-handler.js` - PDF processing functionality
  - `ai-features.js` - AI-powered features
  - `dark-mode.js` - Theme switching functionality
- `img/` - Images and logos

## Features

- Modern, responsive UI using Bootstrap 5
- Dark mode support
- PDF text extraction
- Markdown formatting support
- AI-powered summarization, quiz generation, and mind mapping

## Usage

Simply open `index.html` in a web browser. Make sure the backend server is running for full functionality.

## API Integration

The frontend communicates with the FastAPI backend at `http://localhost:8001` by default. If your backend is running on a different port, update the API_URL variables in:

- `js/main.js`
- `js/pdf-handler.js`
- `js/ai-features.js` 