# Scribe: A Personalized Learning Companion 🏆

<div align="center">
  <img src="Ai%20Note%20Taking%20App/frontend/favicon.ico" alt="Scribe Logo" width="200"/>
  
  <h3>Winner of SeamEdu Award 2025 for Best Performing Web Application</h3>
  <p>Developed by Soumyadyuti Dey</p>
</div>

## 📝 Overview

A cutting-edge web application that revolutionizes note-taking with AI-powered features. This award-winning application combines modern web technologies with advanced AI capabilities to create an intuitive and powerful note-taking experience.

## 🏆 Recognition

- **SeamEdu Award 2024** - Best Performing Web Application
- Recognized for innovative implementation of AI features in education technology
- Demonstrated excellence in user experience and technical implementation

## ✨ Key Features

### 🤖 AI-Powered Capabilities
- **Smart Summarization**: Automatically generates concise summaries of your notes
- **Quiz Generation**: Creates interactive quizzes from your notes
- **Mind Map Creation**: Visualizes note content in interactive mind maps
- **Text-to-Speech**: Converts written notes to spoken words

### 📚 Content Management
- **PDF Processing**: Upload and extract text from PDF documents
- **Handwriting Recognition**: Convert handwritten notes to digital text
- **Markdown Support**: Rich text formatting with Markdown
- **Responsive Design**: Works seamlessly across all devices

## 🛠️ Technical Stack

### Frontend
- **Core**: HTML5, CSS3, JavaScript
- **UI Framework**: Bootstrap 5
- **Markdown**: Marked.js
- **Visualization**: Chart.js
- **Speech**: Web Speech API

### Backend
- **Framework**: Python FastAPI
- **Database**: SQLite
- **AI/ML**: 
  - Hugging Face Transformers
  - NLTK
  - PyPDF2
  - Pytesseract (OCR)

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Modern web browser
- pip (Python package manager)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-note-taking-app
```

2. Set up the backend:
```bash
cd backend
pip install -r requirements.txt
```

### Running the Application

1. Start the backend server:
```bash
cd backend
python app.py
```

2. Open the frontend:
```bash
cd frontend
start index.html
```

The application will be available at:
- Frontend: http://localhost:8000
- Backend API: http://localhost:8000/api
- API Documentation: http://localhost:8000/docs

## 📁 Project Structure

```
ai-note-taking-app/
├── frontend/
│   ├── js/
│   │   ├── main.js          # Main application logic
│   │   └── ai-features.js   # AI feature implementations
│   ├── css/
│   │   └── styles.css       # Custom styling
│   ├── img/
│   │   └── logo.png         # Application logo
│   ├── index.html           # Main application page
│   └── login.html           # Login page
├── backend/
│   ├── app.py              # FastAPI application
│   ├── database.py         # Database operations
│   ├── ai_service.py       # AI service implementations
│   ├── models.py           # Data models
│   ├── requirements.txt    # Python dependencies
│   └── notes.db            # SQLite database
├── Content/
│   ├── Images/
│   ├── Video/
│   ├── logo.png
│   ├── AI-Powered Note-Taking App.pdf
│   └── Scribe - AI Note Taking App - Documentation.pdf
└── README.md
```

## 🔌 API Endpoints

### Note Management
- `GET /api/notes` - Retrieve all notes
- `GET /api/notes/{id}` - Get specific note
- `POST /api/notes` - Create new note
- `PUT /api/notes/{id}` - Update note
- `DELETE /api/notes/{id}` - Delete note

### AI Features
- `POST /api/summarize` - Generate note summary
- `POST /api/generate-quiz` - Create quiz from note
- `POST /api/mindmap` - Generate mind map
- `POST /api/text-to-speech` - Convert text to speech

### File Processing
- `POST /api/upload-pdf` - Process PDF files
- `POST /api/handwriting` - Process handwritten notes

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
- All contributors and supporters of the project
- The open-source community for their invaluable tools and libraries 