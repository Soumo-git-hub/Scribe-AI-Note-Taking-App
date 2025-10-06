# Scribe: A Personalized Learning Companion
<div align="center">
<img src="Ai%20Note%20Taking%20App/Content/Images/logo.png" alt="Scribe Logo" width="200"/>

<h3>Winner of SeamEdu Award 2025 for Best Performing Web Application 🏆</h3>
<p>Developed by Soumyadyuti Dey</p>
</div>

## 📝 Overview
Scribe is an award-winning agentic web application designed to transform standard notes into dynamic, personalized learning modules. Moving beyond simple note-taking, Scribe leverages a Retrieval-Augmented Generation (RAG) pipeline to provide a deeply adaptive and human-centric learning experience. This project was created to explore how agentic AI can actively assist in education, reducing study time and improving comprehension.

## 🏆 Recognition
SeamEdu Award 2025 - Best Performing Web Application

Recognized for its innovative use of agentic AI to create personalized educational experiences.

Praised for its scalable backend architecture and responsive, user-focused design.

## ✨ Key Features
### 🤖 Agentic & Adaptive Capabilities
Adaptive Quiz Generation: An intelligent agent that creates contextual quizzes from note content, adapting to the material to reinforce learning.

Agentic Summarization: Utilizes a RAG pipeline to generate concise, context-aware summaries that capture the essence of complex notes.

Mind Map Creation: Visualizes note content in interactive mind maps to aid in conceptual understanding.

Text-to-Speech: Converts written notes into spoken words for accessible, on-the-go learning.

### 📚 Content Management
PDF Processing: Upload and intelligently extract text and key concepts from PDF documents.

Handwriting Recognition (OCR): Convert scanned handwritten notes into editable digital text using Tesseract.

Markdown Support: Full support for rich text formatting with Markdown.

Responsive Design: A seamless and intuitive experience across all devices.

## 🛠️ Technical Stack
### Frontend
Core: HTML5, CSS3, JavaScript

UI Framework: Bootstrap 5

Markdown: Marked.js

Visualization: Chart.js

Speech: Web Speech API

### Backend
Frameworks: FastAPI, LangChain

Architecture: RAG (Retrieval-Augmented Generation)

Core Libraries: Hugging Face Transformers, PyPDF2, Pytesseract (OCR)

Database: SQLite

## 🚀 Getting Started
### Prerequisites
Python 3.8+

Modern web browser

pip (Python package manager)

### Installation
Clone the repository:

```bash
git clone <repository-url>
cd scribe-learning-companion
```

Set up the backend:

```bash
cd backend
pip install -r requirements.txt
```

### Running the Application
Start the backend server:

```bash
cd backend
uvicorn app:app --reload
```

Open the frontend:

Navigate to the frontend directory and open index.html in your browser.

The application will be available at:

Frontend: frontend/index.html

Backend API: http://127.0.0.1:8000

API Documentation: http://127.0.0.1:8000/docs

## 📁 Project Structure
```
scribe-learning-companion/
├── frontend/
│   ├── js/
│   │   ├── main.js          # Main application logic
│   │   └── ai-features.js   # Agentic feature implementations
│   ├── css/
│   │   └── styles.css       # Custom styling
│   ├── img/
│   │   └── logo.png         # Application logo
│   ├── index.html           # Main application page
│   └── login.html           # Login page
├── backend/
│   ├── app.py               # FastAPI application
│   ├── database.py          # Database operations
│   ├── ai_service.py        # AI service implementations (LangChain, RAG)
│   ├── models.py            # Data models
│   ├── requirements.txt     # Python dependencies
│   └── notes.db             # SQLite database
├── Content/
│   ├── Images/
│   └── Video/
└── README.md
```

## 🔌 API Endpoints
### Note Management
GET /api/notes - Retrieve all notes

POST /api/notes - Create new note

DELETE /api/notes/{id} - Delete note

### AI Features
POST /api/summarize - Generate note summary via RAG agent

POST /api/generate-quiz - Create adaptive quiz from note

POST /api/mindmap - Generate mind map

POST /api/text-to-speech - Convert text to speech

### File Processing
POST /api/upload-pdf - Process PDF files

POST /api/handwriting - Process handwritten notes

## 🎥 Demo

[Watch the full demo video](Ai%20Note%20Taking%20App/Content/Video/Demo%20Video%20-%20Scribe%20-%20AI%20Note%20Taking%20Web%20App.mp4)

## 📸 Screenshots

### Application Architecture
<div align="center">
  <img src="Ai%20Note%20Taking%20App/Content/Images/AI_Note_App_Architecture.png" alt="Application Architecture" width="600"/>
  <br><b>Application Architecture</b>
</div>

### Key Features

<div align="center">
  <img src="Ai%20Note%20Taking%20App/Content/Images/AI%20Summary.png" alt="AI Summary Feature" width="400"/>
  <br><b>AI-Powered Summarization</b><br><br>
  <img src="Ai%20Note%20Taking%20App/Content/Images/Quiz.png" alt="Quiz Generation" width="400"/>
  <br><b>Quiz Generation</b><br><br>
  <img src="Ai%20Note%20Taking%20App/Content/Images/Mind%20Map.png" alt="Mind Map Creation" width="400"/>
  <br><b>Mind Map Creation</b>
</div>

### User Interface

<div align="center">
  <img src="Ai%20Note%20Taking%20App/Content/Images/Authentication%20Login.png" alt="Login Interface" width="400"/>
  <br><b>Authentication/Login</b><br><br>
  <img src="Ai%20Note%20Taking%20App/Content/Images/Pdf%20Upload.png" alt="PDF Upload" width="400"/>
  <br><b>PDF Upload & Extraction</b><br><br>
  <img src="Ai%20Note%20Taking%20App/Content/Images/Markdown%20Support.png" alt="Markdown Support" width="400"/>
  <br><b>Markdown Support</b><br><br>
  <img src="Ai%20Note%20Taking%20App/Content/Images/Dark%20Mode.png" alt="Dark Mode" width="400"/>
  <br><b>Dark Mode</b>
</div>

## 📄 Documentation

- [AI-Powered Note-Taking App (PDF)](Ai%20Note%20Taking%20App/Content/AI-Powered%20Note-Taking%20App.pdf)
- [Scribe - AI Note Taking App - Documentation (PDF)](Ai%20Note%20Taking%20App/Content/Scribe%20-%20AI%20Note%20Taking%20App%20-%20Documentation.pdf)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Soumyadyuti Dey**
- GitHub: [@Soumo-git-hub](https://github.com/Soumo-git-hub)
- LinkedIn: [Soumyadyuti Dey](https://www.linkedin.com/in/soumyadyuti-dey-245sd/)

## 🙏 Acknowledgments

- SeamEdu for recognizing the project's innovation
- The open-source community for their invaluable tools and libraries