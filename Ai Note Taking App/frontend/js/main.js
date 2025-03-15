// API Configuration
// Make sure this API_URL is correct - update port if needed
const API_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

// When fetching notes, ensure you're using the correct URL
async function fetchNotes() {
    try {
        const response = await fetch(`${API_URL}/api/notes`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.notes || [];
    } catch (error) {
        console.error('Error loading notes:', error);
        showAlert('Error loading notes: ' + error.message, 'danger');
        return [];
    }
}

// DOM Elements
const elements = {
    // Navigation
    navNotes: document.getElementById('nav-notes'),
    navCreate: document.getElementById('nav-create'),
    
    // Views
    notesView: document.getElementById('notes-view'),
    createEditView: document.getElementById('create-edit-view'),
    noteView: document.getElementById('note-view'),
    
    // Notes List
    notesList: document.getElementById('notes-list'),
    createNoteBtn: document.getElementById('create-note-btn'),
    
    // Form Elements
    noteForm: document.getElementById('note-form'),
    noteId: document.getElementById('note-id'),
    title: document.getElementById('title'),
    content: document.getElementById('content'),
    formTitle: document.getElementById('form-title'),
    
    // AI Tool Buttons
    summarizeBtn: document.getElementById('summarize-btn'),
    quizBtn: document.getElementById('quiz-btn'),
    mindmapBtn: document.getElementById('mindmap-btn'),
    ttsBtn: document.getElementById('tts-btn'),
    uploadHandwritingBtn: document.getElementById('upload-handwriting-btn'),
    handwritingInput: document.getElementById('handwriting-input'),
    
    // Form Content Areas
    summaryContent: document.getElementById('summary-content'),
    quizContent: document.getElementById('quiz-content'),
    mindmapContent: document.getElementById('mindmap-content'),
    
    // View Note
    viewTitle: document.getElementById('view-title'),
    viewContent: document.getElementById('view-content'),
    viewSummaryContent: document.getElementById('view-summary-content'),
    viewQuizContent: document.getElementById('view-quiz-content'),
    viewMindmapContent: document.getElementById('view-mindmap-content'),
    
    // Buttons
    cancelBtn: document.getElementById('cancel-btn'),
    saveBtn: document.getElementById('save-btn'),
    editNoteBtn: document.getElementById('edit-note-btn'),
    deleteNoteBtn: document.getElementById('delete-note-btn'),
    backToListBtn: document.getElementById('back-to-list-btn'),
    
    // Delete Modal
    deleteModal: new bootstrap.Modal(document.getElementById('delete-modal')),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn')
};

// State Management
let currentNote = null;
let notes = [];
let summaryData = null;
let quizData = null;
let mindmapData = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Navigation
    elements.navNotes.addEventListener('click', showNotesView);
    elements.navCreate.addEventListener('click', showCreateView);
    elements.createNoteBtn.addEventListener('click', showCreateView);
    
    // Form Actions
    elements.noteForm.addEventListener('submit', saveNote);
    elements.cancelBtn.addEventListener('click', showNotesView);
    
    // AI Tools
    elements.summarizeBtn.addEventListener('click', generateSummary);
    elements.quizBtn.addEventListener('click', generateQuiz);
    elements.mindmapBtn.addEventListener('click', generateMindMap);
    elements.ttsBtn.addEventListener('click', textToSpeech);
    elements.uploadHandwritingBtn.addEventListener('click', () => elements.handwritingInput.click());
    elements.handwritingInput.addEventListener('change', processHandwriting);
    
    // Note View Actions
    elements.backToListBtn.addEventListener('click', showNotesView);
    elements.editNoteBtn.addEventListener('click', editCurrentNote);
    elements.deleteNoteBtn.addEventListener('click', confirmDeleteNote);
    elements.confirmDeleteBtn.addEventListener('click', deleteCurrentNote);
    
    // Load notes on startup
    loadNotes();
});

// View Management
function showNotesView() {
    elements.noteView.style.display = 'none';
    elements.createEditView.style.display = 'none';
    elements.notesView.style.display = 'block';
    loadNotes();
}

function showCreateView() {
    resetForm();
    elements.formTitle.textContent = 'Create New Note';
    elements.noteView.style.display = 'none';
    elements.notesView.style.display = 'none';
    elements.createEditView.style.display = 'block';
}

function showNoteView(note) {
    currentNote = note;
    
    elements.viewTitle.textContent = note.title;
    elements.viewContent.innerHTML = formatContent(note.content);
    elements.viewSummaryContent.innerHTML = note.summary ? formatContent(note.summary) : 'No summary available.';
    
    // Handle quiz rendering
    if (note.quiz) {
        try {
            renderQuiz(JSON.parse(note.quiz), elements.viewQuizContent);
        } catch (e) {
            elements.viewQuizContent.textContent = 'Error displaying quiz.';
        }
    } else {
        elements.viewQuizContent.textContent = 'No quiz available.';
    }
    
    // Handle mindmap rendering
    if (note.mindmap) {
        try {
            renderMindMap(JSON.parse(note.mindmap), elements.viewMindmapContent);
        } catch (e) {
            elements.viewMindmapContent.textContent = 'Error displaying mind map.';
        }
    } else {
        elements.viewMindmapContent.textContent = 'No mind map available.';
    }
    
    elements.notesView.style.display = 'none';
    elements.createEditView.style.display = 'none';
    elements.noteView.style.display = 'block';
}

// API Functions
async function loadNotes() {
    try {
        // Changed from /notes/ to /api/notes
        const response = await fetch(`${API_URL}/api/notes`);
        if (!response.ok) throw new Error('Failed to load notes');
        
        const data = await response.json();
        
        // Add defensive programming to handle different response formats
        if (data && Array.isArray(data)) {
            // If the response is directly an array of notes
            notes = data;
        } else if (data && data.notes && Array.isArray(data.notes)) {
            // If the response has a notes property that is an array
            notes = data.notes;
        } else if (data && typeof data === 'object') {
            // If the response is an object but doesn't have a notes array
            console.warn('Unexpected response format, converting to array:', data);
            notes = Object.values(data).filter(item => typeof item === 'object');
        } else {
            // Fallback to empty array
            console.error('Unexpected response format:', data);
            notes = [];
        }
        
        renderNotesList();
    } catch (error) {
        console.error('Error loading notes:', error);
        showAlert('Error loading notes: ' + error.message, 'danger');
        notes = []; // Ensure notes is always an array
        renderNotesList(); // Still render the empty list
    }
}

async function saveNote(e) {
    e.preventDefault();
    
    const noteData = {
        title: elements.title.value,
        content: elements.content.value,
        summary: summaryData,
        quiz: quizData ? JSON.stringify(quizData) : null,
        mindmap: mindmapData ? JSON.stringify(mindmapData) : null
    };
    
    try {
        let response;
        if (elements.noteId.value) {
            // Update existing note - changed from /notes/ to /api/notes
            response = await fetch(`${API_URL}/api/notes/${elements.noteId.value}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });
        } else {
            // Create new note - changed from /notes/ to /api/notes
            response = await fetch(`${API_URL}/api/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(noteData)
            });
        }
        
        if (!response.ok) throw new Error('Failed to save note');
        
        showAlert('Note saved successfully!', 'success');
        showNotesView();
    } catch (error) {
        showAlert('Error saving note: ' + error.message, 'danger');
    }
}

async function deleteCurrentNote() {
    try {
        // Changed from /notes/ to /api/notes
        const response = await fetch(`${API_URL}/api/notes/${currentNote.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete note');
        
        elements.deleteModal.hide();
        showAlert('Note deleted successfully!', 'success');
        showNotesView();
    } catch (error) {
        showAlert('Error deleting note: ' + error.message, 'danger');
    }
}

// AI Feature Functions
// Function to generate summary
async function generateSummary() {
    const noteContent = elements.content.value;
    if (!noteContent.trim()) {
        showAlert('Please enter some content to summarize', 'warning');
        return;
    }
    
    // Show loading indicator
    elements.summaryContent.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Generating summary...</p></div>';
    
    try {
        console.log("Sending content for summarization:", noteContent.substring(0, 50) + "...");
        
        const response = await fetch(`${API_URL}/api/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content: noteContent })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Received summary response:", data);
        
        if (!data.summary) {
            throw new Error("No summary received from API");
        }
        
        // Format and display the summary
        elements.summaryContent.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <i class="fas fa-robot me-2"></i> AI Summary
                </div>
                <div class="card-body">
                    <p class="card-text">${data.summary}</p>
                </div>
            </div>
        `;
        
        // Save the summary data
        summaryData = data.summary;
        
        // Auto-open the summary accordion
        const summaryAccordion = bootstrap.Collapse.getOrCreateInstance(document.getElementById('summary-section'));
        summaryAccordion.show();
        
        showAlert('Summary generated successfully!', 'success');
        
    } catch (error) {
        console.error('Error generating summary:', error);
        elements.summaryContent.innerHTML = '<div class="alert alert-danger">Failed to generate summary. Please try again.</div>';
        showAlert('Error generating summary: ' + error.message, 'danger');
    }
}

// Remove the duplicate summarizeContent function at the bottom of the file
// as it's redundant with the generateSummary function above

async function generateQuiz() {
    const text = elements.content.value;
    if (!text.trim()) {
        showAlert('Please enter content to generate quiz', 'warning');
        return;
    }
    
    try {
        elements.quizContent.textContent = 'Generating quiz...';
        
        const response = await fetch(`${API_URL}/api/generate-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text })
        });
        
        if (!response.ok) throw new Error('Failed to generate quiz');
        
        const data = await response.json();
        quizData = data.quiz;
        renderQuiz(quizData, elements.quizContent);
        
        // Auto-open the quiz accordion
        const quizAccordion = bootstrap.Collapse.getOrCreateInstance(document.getElementById('quiz-section'));
        quizAccordion.show();
    } catch (error) {
        showAlert('Error generating quiz: ' + error.message, 'danger');
    }
}

async function generateMindMap() {
    const text = elements.content.value;
    if (!text.trim()) {
        showAlert('Please enter content to create mind map', 'warning');
        return;
    }
    
    try {
        elements.mindmapContent.textContent = 'Generating mind map...';
        
        const response = await fetch(`${API_URL}/api/mindmap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text })
        });
        
        if (!response.ok) throw new Error('Failed to create mind map');
        
        const data = await response.json();
        mindmapData = data.mindmap;
        renderMindMap(mindmapData, elements.mindmapContent);
        
        // Auto-open the mindmap accordion
        const mindmapAccordion = bootstrap.Collapse.getOrCreateInstance(document.getElementById('mindmap-section'));
        mindmapAccordion.show();
    } catch (error) {
        showAlert('Error creating mind map: ' + error.message, 'danger');
    }
}

async function processHandwriting() {
    const file = elements.handwritingInput.files[0];
    if (!file) return;
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_URL}/handwriting/`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Failed to process handwriting');
        
        const data = await response.json();
        elements.content.value += '\n\n' + data.text;
        showAlert('Handwriting processed successfully!', 'success');
    } catch (error) {
        showAlert('Error processing handwriting: ' + error.message, 'danger');
    }
}

function textToSpeech() {
    const text = elements.content.value;
    if (!text.trim()) {
        showAlert('Please enter content to read aloud', 'warning');
        return;
    }
    
    // Use browser's built-in speech synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

// Helper Functions
function renderNotesList() {
    elements.notesList.innerHTML = '';
    
    if (notes.length === 0) {
        elements.notesList.innerHTML = '<div class="col-12"><p>No notes found. Create your first note!</p></div>';
        return;
    }
    
    notes.forEach(note => {
        const noteCard = document.createElement('div');
        noteCard.className = 'col-md-4 mb-4';
        
        const summary = note.summary ? note.summary.substring(0, 100) + '...' : 
                        note.content.substring(0, 100) + '...';
        
        noteCard.innerHTML = `
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${note.title}</h5>
                    <p class="card-text">${summary}</p>
                </div>
                <div class="card-footer d-flex justify-content-end">
                    <button class="btn btn-sm btn-primary view-note" data-id="${note.id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                </div>
            </div>
        `;
        
        elements.notesList.appendChild(noteCard);
        
        // Add click event for viewing note
        noteCard.querySelector('.view-note').addEventListener('click', () => {
            const selectedNote = notes.find(n => n.id === parseInt(note.id));
            if (selectedNote) showNoteView(selectedNote);
        });
    });
}

function renderQuiz(quiz, container) {
    if (!quiz || !quiz.mcq) {
        container.textContent = 'No quiz data available.';
        return;
    }

    let html = '<div class="quiz-container">';
    
    // Multiple Choice Questions
    if (quiz.mcq && quiz.mcq.length) {
        html += '<h4>Multiple Choice Questions</h4>';
        quiz.mcq.forEach((q, idx) => {
            html += `
                <div class="question-item mb-3">
                    <p><strong>Q${idx+1}:</strong> ${q.question}</p>
                    <div class="options">
                        ${q.options.map((opt, i) => `
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="mcq-${idx}" id="mcq-${idx}-${i}">
                                <label class="form-check-label" for="mcq-${idx}-${i}">${opt}</label>
                            </div>
                        `).join('')}
                    </div>
                    <p class="mt-2 text-success answer-reveal" style="display:none;"><strong>Answer:</strong> ${q.answer}</p>
                </div>
            `;
        });
    }
    
    // True/False Questions
    if (quiz.true_false && quiz.true_false.length) {
        html += '<h4>True or False</h4>';
        quiz.true_false.forEach((q, idx) => {
            html += `
                <div class="question-item mb-3">
                    <p><strong>Q${idx+1}:</strong> ${q.question}</p>
                    <div class="options">
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="tf-${idx}" id="tf-${idx}-true">
                            <label class="form-check-label" for="tf-${idx}-true">True</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="tf-${idx}" id="tf-${idx}-false">
                            <label class="form-check-label" for="tf-${idx}-false">False</label>
                        </div>
                    </div>
                    <p class="mt-2 text-success answer-reveal" style="display:none;"><strong>Answer:</strong> ${q.answer ? 'True' : 'False'}</p>
                </div>
            `;
        });
    }
    
    // Fill in the Blanks
    if (quiz.fill_blank && quiz.fill_blank.length) {
        html += '<h4>Fill in the Blanks</h4>';
        quiz.fill_blank.forEach((q, idx) => {
            html += `
                <div class="question-item mb-3">
                    <p><strong>Q${idx+1}:</strong> ${q.question}</p>
                    <div class="mt-2 mb-2">
                        <input type="text" class="form-control form-control-sm" placeholder="Your answer">
                    </div>
                    <p class="mt-2 text-success answer-reveal" style="display:none;"><strong>Answer:</strong> ${q.answer}</p>
                </div>
            `;
        });
    }
    
    html += `
        <div class="d-flex justify-content-between mt-3">
            <button class="btn btn-outline-primary btn-sm check-answers">Check Answers</button>
            <button class="btn btn-outline-secondary btn-sm reset-quiz">Reset</button>
        </div>
    </div>`;
    
    container.innerHTML = html;
    
    // Add event listeners for the quiz buttons
    container.querySelector('.check-answers').addEventListener('click', () => {
        container.querySelectorAll('.answer-reveal').forEach(el => {
            el.style.display = 'block';
        });
    });
    
    container.querySelector('.reset-quiz').addEventListener('click', () => {
        container.querySelectorAll('input[type="radio"]').forEach(el => {
            el.checked = false;
        });
        container.querySelectorAll('input[type="text"]').forEach(el => {
            el.value = '';
        });
        container.querySelectorAll('.answer-reveal').forEach(el => {
            el.style.display = 'none';
        });
    });
}

function renderMindMap(mindmap, container) {
    if (!mindmap || !mindmap.central) {
        container.textContent = 'No mind map data available.';
        return;
    }
    
    // Create a more visually appealing mind map
    let html = `
        <div class="mindmap-container">
            <div class="central-topic">
                <div class="central-node">${mindmap.central}</div>
            </div>
            <div class="branches-container">
    `;
    
    if (mindmap.branches && mindmap.branches.length) {
        // Assign different colors to branches
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA62B', '#A178DF', '#98D8C8'];
        
        mindmap.branches.forEach((branch, index) => {
            const branchColor = colors[index % colors.length];
            
            html += `
                <div class="branch" style="--branch-color: ${branchColor}">
                    <div class="branch-line"></div>
                    <div class="branch-content">
                        <div class="branch-topic">${branch.topic}</div>
                        <div class="subtopics">
            `;
            
            if (branch.subtopics && branch.subtopics.length) {
                branch.subtopics.forEach(subtopic => {
                    html += `
                        <div class="subtopic-container">
                            <div class="subtopic-line"></div>
                            <div class="subtopic">${subtopic}</div>
                        </div>
                    `;
                });
            } else {
                html += '<div class="subtopic-container"><div class="subtopic">(No subtopics)</div></div>';
            }
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    html += `
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Add CSS for the mind map
    const style = document.createElement('style');
    style.textContent = `
        .mindmap-container {
            font-family: 'Arial', sans-serif;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .central-topic {
            margin-bottom: 30px;
            position: relative;
        }
        
        .central-node {
            background-color: #3498db;
            color: white;
            padding: 15px 25px;
            border-radius: 50px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            max-width: 250px;
            margin: 0 auto;
            z-index: 2;
        }
        
        .branches-container {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 20px;
            width: 100%;
        }
        
        .branch {
            flex: 1;
            min-width: 200px;
            max-width: 300px;
            position: relative;
            --branch-color: #3498db;
        }
        
        .branch-line {
            position: absolute;
            top: -30px;
            left: 50%;
            width: 2px;
            height: 30px;
            background-color: var(--branch-color);
        }
        
        .branch-content {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .branch-topic {
            background-color: var(--branch-color);
            color: white;
            padding: 10px 15px;
            border-radius: 30px;
            text-align: center;
            margin-bottom: 15px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            width: 100%;
            z-index: 1;
        }
        
        .subtopics {
            display: flex;
            flex-direction: column;
            gap: 10px;
            width: 100%;
        }
        
        .subtopic-container {
            position: relative;
            padding-left: 15px;
        }
        
        .subtopic-line {
            position: absolute;
            top: 50%;
            left: 0;
            width: 15px;
            height: 2px;
            background-color: var(--branch-color);
        }
        
        .subtopic {
            background-color: #f8f9fa;
            border: 2px solid var(--branch-color);
            color: #333;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 0.9rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .branches-container {
                flex-direction: column;
                align-items: center;
            }
            
            .branch {
                width: 100%;
                max-width: 100%;
            }
        }
    `;
    
    // Add the style to the container
    container.appendChild(style);
    
    // Add hover effects with JavaScript
    const branchTopics = container.querySelectorAll('.branch-topic');
    branchTopics.forEach(topic => {
        topic.addEventListener('mouseenter', () => {
            topic.style.transform = 'scale(1.05)';
            topic.style.transition = 'transform 0.2s ease';
        });
        
        topic.addEventListener('mouseleave', () => {
            topic.style.transform = 'scale(1)';
        });
    });
    
    const subtopics = container.querySelectorAll('.subtopic');
    subtopics.forEach(subtopic => {
        subtopic.addEventListener('mouseenter', () => {
            subtopic.style.transform = 'scale(1.03)';
            subtopic.style.transition = 'transform 0.2s ease';
        });
        
        subtopic.addEventListener('mouseleave', () => {
            subtopic.style.transform = 'scale(1)';
        });
    });
}

function resetForm() {
    elements.noteForm.reset();
    elements.noteId.value = '';
    elements.summaryContent.textContent = 'No summary generated yet.';
    elements.quizContent.textContent = 'No quiz generated yet.';
    elements.mindmapContent.textContent = 'No mind map generated yet.';
    summaryData = null;
    quizData = null;
    mindmapData = null;
}

function editCurrentNote() {
    elements.noteId.value = currentNote.id;
    elements.title.value = currentNote.title;
    elements.content.value = currentNote.content;
    elements.formTitle.textContent = 'Edit Note';
    
    // Set AI data
    summaryData = currentNote.summary;
    if (summaryData) {
        elements.summaryContent.textContent = summaryData;
    }
    
    if (currentNote.quiz) {
        try {
            quizData = JSON.parse(currentNote.quiz);
            renderQuiz(quizData, elements.quizContent);
        } catch (e) {
            quizData = null;
            elements.quizContent.textContent = 'Error loading quiz data.';
        }
    }
    
    if (currentNote.mindmap) {
        try {
            mindmapData = JSON.parse(currentNote.mindmap);
            renderMindMap(mindmapData, elements.mindmapContent);
        } catch (e) {
            mindmapData = null;
            elements.mindmapContent.textContent = 'Error loading mind map data.';
        }
    }
    
    elements.noteView.style.display = 'none';
    elements.notesView.style.display = 'none';
    elements.createEditView.style.display = 'block';
}

function confirmDeleteNote() {
    elements.deleteModal.show();
}

function formatContent(text) {
    // Convert plain text to formatted HTML with paragraphs
    return text.split('\n\n')
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

function showAlert(message, type = 'info') {
    // Create alert element
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertEl.role = 'alert';
    alertEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Add to document
    document.body.appendChild(alertEl);
    
    // Auto dismiss after 3 seconds
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertEl);
        bsAlert.close();
    }, 3000);
}

// Add this function to your main.js file

async function testAIService() {
    const testContent = elements.content.value || "This is a test content to verify the AI service is working correctly. The AI should generate a summary, quiz, and mind map from this text.";
    
    try {
        showAlert('Testing AI service...', 'info');
        
        const response = await fetch(`${API_URL}/api/test-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: testContent })
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('AI Test Results:', result);
            showAlert('AI service test successful! Check console for details.', 'success');
            
            // Display the results
            elements.summaryContent.textContent = result.summary;
            
            try {
                const quizData = JSON.parse(result.quiz);
                renderQuiz(quizData, elements.quizContent);
                quizData = quizData; // Update the global variable
            } catch (e) {
                console.error('Error parsing quiz data:', e);
                elements.quizContent.textContent = 'Error parsing quiz data.';
            }
            
            try {
                const mindmapData = JSON.parse(result.mindmap);
                renderMindMap(mindmapData, elements.mindmapContent);
                mindmapData = mindmapData; // Update the global variable
            } catch (e) {
                console.error('Error parsing mindmap data:', e);
                elements.mindmapContent.textContent = 'Error parsing mindmap data.';
            }
        } else {
            throw new Error(result.message || 'Unknown error');
        }
    } catch (error) {
        console.error('AI Test Error:', error);
        showAlert(`AI service test failed: ${error.message}`, 'danger');
    }
}

// Add this to your event listeners section
document.getElementById('testAiBtn').addEventListener('click', testAIService);