// API Configuration
const API_URL = location.protocol === 'file:' 
    ? 'http://localhost:8001' 
    : `${window.location.protocol}//${window.location.hostname}:8001`;

// Global variables
let notes = [];
let currentNote = null;
let summaryData = null;
let quizData = null;
let mindmapData = null;

// Add protection against refreshes during PDF processing
document.addEventListener('DOMContentLoaded', function() {
    // Prevent automatic form submissions when processing PDFs
    const noteForm = document.getElementById('note-form');
    if (noteForm) {
        noteForm.addEventListener('submit', function(e) {
            if (window.pdfProcessingInProgress) {
                console.log('Form submission prevented during PDF processing');
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true); // Use capturing phase to intercept early
    }
});

// DOM Elements
const elements = {
    navNotes: document.getElementById('nav-notes'),
    navCreate: document.getElementById('nav-create'),
    notesView: document.getElementById('notes-view'),
    createEditView: document.getElementById('create-edit-view'),
    noteView: document.getElementById('note-view'),
    notesList: document.getElementById('notes-list'),
    createNoteBtn: document.getElementById('create-note-btn'),
    noteForm: document.getElementById('note-form'),
    noteId: document.getElementById('note-id'),
    title: document.getElementById('title'),
    content: document.getElementById('content'),
    formTitle: document.getElementById('form-title'),
    summarizeBtn: document.getElementById('summarize-btn'),
    quizBtn: document.getElementById('quiz-btn'),
    mindmapBtn: document.getElementById('mindmap-btn'),
    ttsBtn: document.getElementById('tts-btn'),
    uploadHandwritingBtn: document.getElementById('upload-handwriting-btn'),
    handwritingInput: document.getElementById('handwriting-input'),
    summaryContent: document.getElementById('summary-content'),
    quizContent: document.getElementById('quiz-content'),
    mindmapContent: document.getElementById('mindmap-content'),
    viewTitle: document.getElementById('view-title'),
    viewContent: document.getElementById('view-content'),
    viewSummaryContent: document.getElementById('view-summary-content'),
    viewQuizContent: document.getElementById('view-quiz-content'),
    viewMindmapContent: document.getElementById('view-mindmap-content'),
    cancelBtn: document.getElementById('cancel-btn'),
    saveBtn: document.getElementById('save-btn'),
    editNoteBtn: document.getElementById('edit-note-btn'),
    deleteNoteBtn: document.getElementById('delete-note-btn'),
    backToListBtn: document.getElementById('back-to-list-btn'),
    deleteModal: new bootstrap.Modal(document.getElementById('delete-modal')),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn')
};

// View Management Functions
// Add this near the top of the file with other global variables
let stayInEditMode = false;

// Modify the showNotesView function to avoid using note IDs
function showNotesView() {
    console.log('Showing notes view');
    
    // Check if we should stay in edit mode
    if (window.stayInEditMode) {
        console.log('Staying in edit mode due to recent PDF upload');
        window.stayInEditMode = false; // Reset the flag
        return;
    }
    
    toggleViews('notesView');
    loadNotes();
}

function showCreateView() {
    console.log('Showing create view');
    resetForm();
    elements.formTitle.textContent = 'Create New Note';
    
    toggleViews('createEditView');
}

function showMarkdownGuide() {
    const modal = new bootstrap.Modal(document.getElementById('markdown-modal') || createMarkdownModal());
    modal.show();
}

function createMarkdownModal() {
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal fade';
    modalDiv.id = 'markdown-modal';
    modalDiv.tabIndex = '-1';
    modalDiv.setAttribute('aria-hidden', 'true');
    
    modalDiv.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Markdown Guide</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Headers</h6>
                            <pre><code># Header 1
## Header 2
### Header 3</code></pre>
                            
                            <h6>Emphasis</h6>
                            <pre><code>*italic* or _italic_
**bold** or __bold__
~~strikethrough~~</code></pre>
                            
                            <h6>Lists</h6>
                            <pre><code>1. Ordered item 1
2. Ordered item 2

- Unordered item
- Unordered item</code></pre>
                        </div>
                        <div class="col-md-6">
                            <h6>Links & Images</h6>
                            <pre><code>[Link text](https://example.com)
![Alt text](image-url.jpg)</code></pre>
                            
                            <h6>Blockquotes</h6>
                            <pre><code>> This is a blockquote</code></pre>
                            
                            <h6>Code</h6>
                            <pre><code>\`inline code\`

\`\`\`
// code block
function example() {
  return true;
}
\`\`\`</code></pre>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalDiv);
    return modalDiv;
}

function showNoteView(note) {
    console.log('Showing note view for:', note);
    currentNote = note;
    
    elements.viewTitle.textContent = note.title;
    elements.viewContent.innerHTML = formatContent(note.content);
    
    if (note.summary) {
        elements.viewSummaryContent.innerHTML = formatContent(note.summary);
    } else {
        elements.viewSummaryContent.innerHTML = '<p>No summary available.</p>';
    }
    
    // Handle quiz data
    if (note.quiz) {
        try {
            const quizData = typeof note.quiz === 'string' ? JSON.parse(note.quiz) : note.quiz;
            window.aiFeatures.renderQuiz(quizData, elements.viewQuizContent);
        } catch (e) {
            console.error('Error parsing quiz data:', e);
            elements.viewQuizContent.innerHTML = '<p>Error loading quiz data.</p>';
        }
    } else {
        elements.viewQuizContent.innerHTML = '<p>No quiz available.</p>';
    }
    
    // Handle mindmap data
    if (note.mindmap) {
        try {
            const mindmapData = typeof note.mindmap === 'string' ? JSON.parse(note.mindmap) : note.mindmap;
            window.aiFeatures.renderMindMap(mindmapData, elements.viewMindmapContent);
        } catch (e) {
            console.error('Error parsing mindmap data:', e);
            elements.viewMindmapContent.innerHTML = '<p>Error loading mind map data.</p>';
        }
    } else {
        elements.viewMindmapContent.innerHTML = '<p>No mind map available.</p>';
    }
    
    toggleViews('noteView');
}

function toggleViews(viewToShow) {
    console.log('Toggling view to:', viewToShow);
    
    // Hide all views first
    elements.notesView.style.display = 'none';
    elements.createEditView.style.display = 'none';
    elements.noteView.style.display = 'none';
    
    // Show the requested view
    if (viewToShow === 'notesView') {
        elements.notesView.style.display = 'block';
    } else if (viewToShow === 'createEditView') {
        elements.createEditView.style.display = 'block';
    } else if (viewToShow === 'noteView') {
        elements.noteView.style.display = 'block';
    }
    
    // Update active state in navigation
    elements.navNotes.classList.remove('active');
    elements.navCreate.classList.remove('active');
    
    if (viewToShow === 'notesView') {
        elements.navNotes.classList.add('active');
    } else if (viewToShow === 'createEditView') {
        elements.navCreate.classList.add('active');
    }
}

// CRUD Operations
async function loadNotes() {
    try {
        console.log('Loading notes from API...');
        const response = await fetch(`${API_URL}/api/notes`);
        
        if (!response.ok) {
            console.error('API response not OK:', response.status, response.statusText);
            throw new Error('Failed to load notes');
        }
        
        const data = await response.json();
        console.log('Notes loaded:', data);
        
        notes = data.notes || [];
        console.log('Notes array:', notes);
        
        renderNotesList();
    } catch (error) {
        console.error('Error loading notes:', error);
        window.aiFeatures.showAlert('Error loading notes: ' + error.message, 'danger');
        notes = [];
        renderNotesList();
    }
}

// Modify the saveNote function to work with the entire note object
async function saveNote(e) {
    if (e) {
    e.preventDefault();
    }
    
    console.log('Saving note...');
    
    // Check if we are in the process of PDF extraction but exempt auto-save
    const isPdfAutoSave = window.pdfAutoSave === true;
    
    // If we're processing a PDF but not doing an auto-save, prevent saving
    if (window.pdfProcessingInProgress && !isPdfAutoSave) {
        console.log('PDF processing in progress, save prevented');
        window.aiFeatures.showAlert('Please wait for PDF processing to complete before saving', 'warning');
        return false;
    }
    
    const noteData = {
        title: elements.title.value,
        content: elements.content.value,
        summary: summaryData,
        quiz: quizData ? JSON.stringify(quizData) : null,
        mindmap: mindmapData ? JSON.stringify(mindmapData) : null
    };

    console.log('Saving note with data:', noteData);

    try {
        // Use the note object directly instead of just the ID
        const noteId = elements.noteId.value;
        const url = `${API_URL}/api/notes${noteId ? '/' + noteId : ''}`;
        console.log(`Saving to URL: ${url}, method: ${noteId ? 'PUT' : 'POST'}`);
        
        const response = await fetch(url, {
            method: noteId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to save note:', response.status, errorText);
            throw new Error('Failed to save note: ' + errorText);
        }
        
        // Get the response data
        const responseData = await response.json();
        console.log('Save response:', responseData);
        
        // If this was a new note, update the note ID field
        if (!elements.noteId.value && responseData.id) {
            elements.noteId.value = responseData.id;
            elements.formTitle.textContent = 'Edit Note';
            console.log('Updated note ID field to:', responseData.id);
            
            // Store the new note ID
            localStorage.setItem('lastCreatedNoteId', responseData.id);
            localStorage.setItem('lastCreatedNoteTimestamp', Date.now().toString());
        }
        
        // Show success message
        window.aiFeatures.showAlert('Note saved successfully!', 'success');
        
        // Check if we should stay in edit mode
        if (window.stayInEditMode) {
            console.log('Staying in edit mode after save due to stayInEditMode flag');
            window.stayInEditMode = false; // Reset the flag
            // Don't redirect, just stay in the current view
            return;
        }
        
        // Check if we're in the middle of PDF processing
        if (window.pdfProcessingInProgress) {
            console.log('Staying in edit mode after save due to PDF processing');
            // Don't redirect, just stay in the current view
            return;
        }
        
        // Only refresh the notes list in the background
        loadNotesInBackground();
        
    } catch (error) {
        console.error('Error saving note:', error);
        window.aiFeatures.showAlert('Error saving note: ' + error.message, 'danger');
    }
}

// New function to load notes in the background without changing the view
async function loadNotesInBackground() {
    try {
        const response = await fetch(`${API_URL}/api/notes`);
        
        if (!response.ok) {
            console.error('API response not OK:', response.status, response.statusText);
            throw new Error('Failed to load notes');
        }
        
        const data = await response.json();
        notes = data.notes || [];
        
        // Don't render the notes list or change the view
    } catch (error) {
        console.error('Error loading notes in background:', error);
    }
}

async function deleteCurrentNote() {
    try {
        const noteId = currentNote.id;
        const response = await fetch(`${API_URL}/api/notes/${noteId}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete note');
        
        // Close the modal and show success message
        elements.deleteModal.hide();
        window.aiFeatures.showAlert('Note deleted successfully!', 'success');
        
        // Clean up any stored references to the deleted note
        localStorage.removeItem('lastCreatedNoteId');
        localStorage.removeItem('lastCreatedNoteTimestamp');
        sessionStorage.removeItem('forceEditModeNoteId');
        sessionStorage.removeItem('forceEditModeTimestamp');
        
        // Clear currentNote reference
        currentNote = null;
        
        // Navigate to notes view
        showNotesView();
    } catch (error) {
        window.aiFeatures.showAlert('Error deleting note: ' + error.message, 'danger');
    }
}

// AI Feature Wrappers (using ai-features.js)
async function generateSummary() {
    const noteContent = elements.content.value;
    try {
        summaryData = await window.aiFeatures.generateSummary(noteContent, elements.summaryContent);
        if (summaryData) {
            const summaryAccordion = bootstrap.Collapse.getOrCreateInstance(document.getElementById('summary-section'));
            summaryAccordion.show();
        }
    } catch (error) {
        console.error('Error in summary generation:', error);
    }
}

async function generateQuiz() {
    const noteContent = elements.content.value;
    try {
        quizData = await window.aiFeatures.generateQuiz(noteContent, elements.quizContent);
        if (quizData) {
            const quizAccordion = bootstrap.Collapse.getOrCreateInstance(document.getElementById('quiz-section'));
            quizAccordion.show();
        }
    } catch (error) {
        console.error('Error in quiz generation:', error);
    }
}

async function generateMindMap() {
    const noteContent = elements.content.value;
    try {
        mindmapData = await window.aiFeatures.generateMindMap(noteContent, elements.mindmapContent);
        if (mindmapData) {
            const mindmapAccordion = bootstrap.Collapse.getOrCreateInstance(document.getElementById('mindmap-section'));
            mindmapAccordion.show();
        }
    } catch (error) {
        console.error('Error in mindmap generation:', error);
    }
}

function textToSpeech() {
    const text = elements.content.value;
    window.aiFeatures.textToSpeech(text, { language: 'en-US', rate: 1.0 });
}

// Helper Functions
function renderNotesList() {
    console.log('Rendering notes list with', notes.length, 'notes');
    
    if (!elements.notesList) {
        console.error('Notes list element not found!');
        return;
    }
    
    if (!notes || notes.length === 0) {
        elements.notesList.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    No notes found. Click "New Note" to create one.
                </div>
            </div>
        `;
        return;
    }
    
    let html = '';
    notes.forEach(note => {
        // Get plain text for preview by stripping HTML tags
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = formatContent(note.content);
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        
        const truncatedContent = plainText.length > 100 
            ? plainText.substring(0, 100) + '...' 
            : plainText;
            
        html += `
            <div class="col-md-4 mb-4">
                <div class="card note-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${note.title}</h5>
                        <p class="card-text">${truncatedContent}</p>
                    </div>
                    <div class="card-footer d-flex justify-content-end">
                        <button class="btn btn-sm btn-primary view-note" data-note-index="${notes.indexOf(note)}">
                            <i class="bi bi-eye"></i> View
                        </button>
                    </div>
                </div>
            </div>
        `;
    });
    
    elements.notesList.innerHTML = html;
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-note').forEach(button => {
        button.addEventListener('click', () => {
            const noteIndex = parseInt(button.getAttribute('data-note-index'));
            if (noteIndex >= 0 && noteIndex < notes.length) {
                showNoteView(notes[noteIndex]);
            }
        });
    });
    
    console.log('Notes list rendered');
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
    if (!currentNote) {
        console.error('No current note to edit');
        showAlert('No note selected for editing', 'warning');
        return;
    }
    
    console.log('Editing current note:', currentNote);
    
    elements.noteId.value = currentNote.id;
    elements.title.value = currentNote.title;
    elements.content.value = currentNote.content;
    elements.formTitle.textContent = 'Edit Note';

    summaryData = currentNote.summary;
    if (summaryData) {
        elements.summaryContent.innerHTML = formatContent(summaryData);
    } else {
        elements.summaryContent.innerHTML = 'No summary generated yet.';
    }

    if (currentNote.quiz) {
        try {
            quizData = typeof currentNote.quiz === 'string' ? JSON.parse(currentNote.quiz) : currentNote.quiz;
            window.aiFeatures.renderQuiz(quizData, elements.quizContent);
        } catch (e) {
            console.error('Error parsing quiz data:', e);
            quizData = null;
            elements.quizContent.innerHTML = 'Error loading quiz data.';
        }
    } else {
        elements.quizContent.innerHTML = 'No quiz generated yet.';
    }

    if (currentNote.mindmap) {
        try {
            mindmapData = typeof currentNote.mindmap === 'string' ? JSON.parse(currentNote.mindmap) : currentNote.mindmap;
            window.aiFeatures.renderMindMap(mindmapData, elements.mindmapContent);
        } catch (e) {
            console.error('Error parsing mindmap data:', e);
            mindmapData = null;
            elements.mindmapContent.innerHTML = 'Error loading mind map data.';
        }
    } else {
        elements.mindmapContent.innerHTML = 'No mind map generated yet.';
    }

    toggleViews('createEditView');
}

function confirmDeleteNote() {
    elements.deleteModal.show();
}

// Add this function to your main.js file
function formatContent(text) {
    if (!text) return '';
    
    // Use marked.js to parse markdown
    try {
        // Configure marked options
        marked.setOptions({
            breaks: true,        // Add line breaks on single newlines
            gfm: true,           // Enable GitHub Flavored Markdown
            headerIds: true,     // Add IDs to headers for linking
            mangle: false,       // Don't mangle header IDs
            sanitize: false      // Don't sanitize HTML
        });
        
        // Parse markdown to HTML
        return marked.parse(text);
    } catch (e) {
        console.error('Error parsing markdown:', e);
        // Fallback to basic formatting if markdown parsing fails
        return text.split('\n\n')
            .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners
    if (elements.navNotes) elements.navNotes.addEventListener('click', function(e) {
        // Don't navigate away during PDF processing
        if (window.pdfProcessingInProgress) {
            e.preventDefault();
            window.aiFeatures.showAlert('Please wait for PDF processing to complete', 'warning');
            return false;
        }
        showNotesView();
    });
    
    if (elements.navCreate) elements.navCreate.addEventListener('click', function(e) {
        // Don't navigate away during PDF processing
        if (window.pdfProcessingInProgress) {
            e.preventDefault();
            window.aiFeatures.showAlert('Please wait for PDF processing to complete', 'warning');
            return false;
        }
        showCreateView();
    });
    
    if (elements.createNoteBtn) elements.createNoteBtn.addEventListener('click', function(e) {
        // Don't navigate away during PDF processing
        if (window.pdfProcessingInProgress) {
            e.preventDefault();
            window.aiFeatures.showAlert('Please wait for PDF processing to complete', 'warning');
            return false;
        }
        showCreateView();
    });
    
    if (elements.noteForm) {
        elements.noteForm.addEventListener('submit', function(e) {
            // Check if PDF is being processed
            if (window.pdfProcessingInProgress) {
                console.log('Form submission prevented during PDF processing');
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            // Regular form submission can continue
            console.log('Form submission allowed');
            saveNote(e);
        }, true); // Use capturing phase to intercept early
    }
    if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', showNotesView);
    if (elements.summarizeBtn) elements.summarizeBtn.addEventListener('click', generateSummary);
    if (elements.quizBtn) elements.quizBtn.addEventListener('click', generateQuiz);
    if (elements.mindmapBtn) elements.mindmapBtn.addEventListener('click', generateMindMap);
    if (elements.ttsBtn) elements.ttsBtn.addEventListener('click', textToSpeech);
    if (elements.backToListBtn) elements.backToListBtn.addEventListener('click', showNotesView);
    if (elements.editNoteBtn) elements.editNoteBtn.addEventListener('click', editCurrentNote);
    if (elements.deleteNoteBtn) elements.deleteNoteBtn.addEventListener('click', confirmDeleteNote);
    if (elements.confirmDeleteBtn) elements.confirmDeleteBtn.addEventListener('click', deleteCurrentNote);
    
    // Load notes on startup
    loadNotes();
    
    // Check URL parameters to see if we should open a specific note in edit mode
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const idParam = urlParams.get('id');
    
    if (viewParam === 'edit' && idParam) {
        console.log('URL parameters indicate edit mode for note:', idParam);
        editNote(parseInt(idParam));
    } else {
        // Check if we have a recent note creation that should be opened in edit mode
        const lastNoteId = localStorage.getItem('lastCreatedNoteId');
        const lastTimestamp = parseInt(localStorage.getItem('lastCreatedNoteTimestamp') || '0');
        const now = Date.now();
        
        if (lastNoteId && (now - lastTimestamp < 30000)) {
            console.log('Found recent note creation, opening in edit mode:', lastNoteId);
            editNote(parseInt(lastNoteId));
        } else {
            // Show notes view by default
            showNotesView();
        }
    }
    
    console.log('Application initialized');
});

// Make loadNotes function available globally
window.loadNotes = loadNotes;

// Add a function to save PDF content without refreshing
window.savePdfContent = async function(title, content) {
    try {
        console.log('Saving PDF content with title:', title);
        // Ensure we have content and a title
        const titleToUse = title || 'Notes from PDF';
        
        // Create the note data
        const noteData = {
            title: titleToUse,
            content: content,
            summary: null,
            quiz: null,
            mindmap: null
        };

        console.log('Sending note data to API:', noteData);
        const response = await fetch(`${API_URL}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to save PDF content, status:', response.status, errorText);
            throw new Error('Failed to save PDF content: ' + errorText);
        }
        
        // Parse the response
        const result = await response.json();
        console.log('PDF content saved successfully, response:', result);
        
        // Ensure we have an ID
        if (!result.id) {
            console.error('No ID returned from API');
            throw new Error('No ID returned from API');
        }
        
        // Store the new note ID in both localStorage and in the form
        localStorage.setItem('lastCreatedNoteId', result.id);
        localStorage.setItem('lastCreatedNoteTimestamp', Date.now().toString());
        
        // Update the form if we're in edit mode
        const noteIdField = document.getElementById('note-id');
        if (noteIdField) {
            noteIdField.value = result.id;
            console.log('Updated note ID field to:', result.id);
        }
        
        // Show success message
        if (window.aiFeatures && window.aiFeatures.showAlert) {
            window.aiFeatures.showAlert('PDF content saved as a new note!', 'success');
        } else {
            showAlert('PDF content saved as a new note!', 'success');
        }
        
        // Set flag to prevent navigation away from edit view
        window.stayInEditMode = true;
        
        // Also update the notes list without changing the view
        await loadNotesInBackground();
        
        return {
            id: result.id,
            title: titleToUse,
            content: content
        };
    } catch (error) {
        console.error('Error saving PDF content:', error);
        if (window.aiFeatures && window.aiFeatures.showAlert) {
        window.aiFeatures.showAlert('Error saving PDF content: ' + error.message, 'danger');
        } else {
            showAlert('Error saving PDF content: ' + error.message, 'danger');
        }
        return null;
    }
};

// Helper function to edit a note - modified to work with note object instead of just ID
window.editNote = function(noteObj) {
    if (!noteObj) return;
    
    console.log('Opening note for editing:', noteObj);
    
    // If we received an ID instead of an object, convert it to an object format
    let noteToEdit = noteObj;
    if (typeof noteObj === 'number' || typeof noteObj === 'string') {
        // Find the note in our notes array
        const foundNote = notes.find(n => n.id == noteObj);
        if (foundNote) {
            noteToEdit = foundNote;
            editCurrentNote();
        } else {
            // Try to fetch the note from the server
            fetch(`${API_URL}/api/notes/${noteObj}`)
                .then(response => {
                    if (!response.ok) {
                        if (response.status === 404) {
                            throw new Error('Note not found - it may have been deleted');
                        }
                        throw new Error('Failed to fetch note');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.note) {
                        noteToEdit = data.note;
                        editCurrentNote();
                    } else {
                        console.error('Note not found in the database');
                        window.aiFeatures.showAlert('Note not found in the database', 'warning');
                        showNotesView();
                    }
                })
                .catch(error => {
                    console.error('Error fetching note:', error);
                    window.aiFeatures.showAlert('Error fetching note: ' + error.message, 'warning');
                    
                    // If note is not found or there's an error, escape from edit mode and show notes list
                    if (error.message.includes('not found') || error.message.includes('deleted')) {
                        console.log('Note not found, redirecting to notes list');
                    showNotesView();
                    }
                });
            return; // Return early since we're handling this asynchronously
        }
    }
    
    if (noteToEdit) {
        console.log('Opening note for editing:', noteToEdit);
        editCurrentNote();
    } else {
        console.error('Note not found for editing');
        window.aiFeatures.showAlert('Note not found for editing', 'warning');
        showNotesView();
    }
};

// Add a direct content save function for PDF extraction
window.saveCurrentContent = async function() {
    try {
        console.log('Saving current content directly');
        
        // Get the content and title
        const title = elements.title.value || 'Notes from PDF';
        const content = elements.content.value;
        
        if (!content || content.trim() === '') {
            console.error('No content to save');
            return null;
        }
        
        // Create note data
        const noteData = {
            title: title,
            content: content,
            summary: summaryData,
            quiz: quizData ? JSON.stringify(quizData) : null,
            mindmap: mindmapData ? JSON.stringify(mindmapData) : null
        };
        
        console.log('Saving content with data:', noteData);
        
        // Check if we're editing an existing note
        const noteId = elements.noteId.value;
        const url = `${API_URL}/api/notes${noteId ? '/' + noteId : ''}`;
        
        // Perform the save
        const response = await fetch(url, {
            method: noteId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Failed to save content:', response.status, errorText);
            throw new Error('Failed to save content: ' + errorText);
        }
        
        // Get the response
        const responseData = await response.json();
        console.log('Save content response:', responseData);
        
        // If this was a new note, update the note ID
        if (!noteId && responseData.id) {
            elements.noteId.value = responseData.id;
            elements.formTitle.textContent = 'Edit Note';
            console.log('Updated note ID to:', responseData.id);
            
            // Store the ID for navigation
            localStorage.setItem('lastCreatedNoteId', responseData.id);
            localStorage.setItem('lastCreatedNoteTimestamp', Date.now().toString());
        }
        
        // Show success
        window.aiFeatures.showAlert('Content saved successfully!', 'success');
        
        // Update notes list in background
        loadNotesInBackground();
        
        return responseData;
    } catch (error) {
        console.error('Error saving content directly:', error);
        window.aiFeatures.showAlert('Error saving content: ' + error.message, 'danger');
        return null;
    }
};