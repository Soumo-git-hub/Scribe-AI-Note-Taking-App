// API Configuration
const API_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

// Global variables
let notes = [];
let currentNote = null;
let summaryData = null;
let quizData = null;
let mindmapData = null;

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

// Modify the showNotesView function to check if we should stay in edit mode
function showNotesView() {
    console.log('Showing notes view');
    
    // Check if we should stay in edit mode
    if (window.stayInEditMode) {
        console.log('Staying in edit mode due to recent PDF upload');
        window.stayInEditMode = false; // Reset the flag
        
        // Get the last created note ID
        const lastNoteId = localStorage.getItem('lastCreatedNoteId');
        if (lastNoteId) {
            console.log('Opening last created note:', lastNoteId);
            editNote(parseInt(lastNoteId));
            return;
        }
    }
    
    toggleViews('notesView');
    loadNotes();
}

// Add this function to handle editing a note by ID
function editNote(noteId) {
    if (!noteId) return;
    
    console.log('Editing note with ID:', noteId);
    
    // Fetch the note data
    fetch(`${API_URL}/api/notes/${noteId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch note');
            return response.json();
        })
        .then(note => {
            // Populate the form
            elements.noteId.value = note.id;
            elements.title.value = note.title;
            elements.content.value = note.content;
            
            // Update form title
            elements.formTitle.textContent = 'Edit Note';
            
            // Show the edit view
            toggleViews('createEditView');
            
            // Load AI features if available
            if (note.summary) {
                elements.summaryContent.innerHTML = note.summary;
                summaryData = note.summary;
            }
            
            if (note.quiz) {
                try {
                    quizData = JSON.parse(note.quiz);
                } catch (e) {
                    console.error('Error parsing quiz data:', e);
                }
            }
            
            if (note.mindmap) {
                try {
                    mindmapData = JSON.parse(note.mindmap);
                } catch (e) {
                    console.error('Error parsing mindmap data:', e);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching note:', error);
            showAlert('Error fetching note: ' + error.message, 'danger');
        });
}

// Make the editNote function available globally
window.editNote = editNote;

function showCreateView() {
    console.log('Showing create view');
    resetForm();
    elements.formTitle.textContent = 'Create New Note';
    toggleViews('createEditView');
}

function showNoteView(note) {
    console.log('Showing note view for:', note);
    currentNote = note;
    
    elements.viewTitle.textContent = note.title;
    elements.viewContent.innerHTML = formatContent(note.content);
    
    elements.viewSummaryContent.innerHTML = note.summary 
        ? formatContent(note.summary) 
        : 'No summary available.';
    
    // Handle quiz data
    if (note.quiz) {
        try {
            const quizData = JSON.parse(note.quiz);
            window.aiFeatures.renderQuiz(quizData, elements.viewQuizContent);
        } catch (e) {
            console.error('Error parsing quiz data:', e);
            elements.viewQuizContent.textContent = 'Error loading quiz data.';
        }
    } else {
        elements.viewQuizContent.textContent = 'No quiz available.';
    }
    
    // Handle mindmap data
    if (note.mindmap) {
        try {
            const mindmapData = JSON.parse(note.mindmap);
            window.aiFeatures.renderMindMap(mindmapData, elements.viewMindmapContent);
        } catch (e) {
            console.error('Error parsing mindmap data:', e);
            elements.viewMindmapContent.textContent = 'Error loading mind map data.';
        }
    } else {
        elements.viewMindmapContent.textContent = 'No mind map available.';
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

// Modify the saveNote function to prevent redirection
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
        const response = await fetch(`${API_URL}/api/notes${elements.noteId.value ? '/' + elements.noteId.value : ''}`, {
            method: elements.noteId.value ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (!response.ok) throw new Error('Failed to save note');
        
        // Get the response data
        const responseData = await response.json();
        
        // If this was a new note, update the note ID field
        if (!elements.noteId.value && responseData.id) {
            elements.noteId.value = responseData.id;
            elements.formTitle.textContent = 'Edit Note';
            
            // Store the ID for potential redirects
            localStorage.setItem('lastCreatedNoteId', responseData.id);
            sessionStorage.setItem('lastCreatedNoteId', responseData.id);
            localStorage.setItem('lastCreatedNoteTimestamp', Date.now().toString());
            sessionStorage.setItem('lastCreatedNoteTimestamp', Date.now().toString());
            
            // Update URL without refreshing
            if (window.history && window.history.pushState) {
                window.history.pushState(
                    {noteId: responseData.id}, 
                    `Edit Note ${responseData.id}`, 
                    `?view=edit&id=${responseData.id}`
                );
            }
        }
        
        // Show success message
        window.aiFeatures.showAlert('Note saved successfully!', 'success');
        
        // Check if we should stay in edit mode
        if (window.stayInEditMode) {
            console.log('Staying in edit mode after save due to stayInEditMode flag');
            // Don't redirect, just stay in the current view
            return;
        }
        
        // Check if we're in the middle of PDF processing
        if (window.pdfProcessingInProgress) {
            console.log('Staying in edit mode after save due to PDF processing');
            // Don't redirect, just stay in the current view
            return;
        }
        
        // Check if there's a recent note creation from PDF
        const lastNoteId = localStorage.getItem('lastCreatedNoteId');
        const lastTimestamp = parseInt(localStorage.getItem('lastCreatedNoteTimestamp') || '0');
        const now = Date.now();
        
        if (lastNoteId && (now - lastTimestamp < 10000)) {
            console.log('Staying in edit mode after save due to recent PDF extraction');
            // Don't redirect, just stay in the current view
            return;
        }
        
        // Only refresh the notes list in the background
        loadNotesInBackground();
        
        // IMPORTANT: Don't call showNotesView() here to prevent redirection
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
        const response = await fetch(`${API_URL}/api/notes/${currentNote.id}`, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Failed to delete note');
        elements.deleteModal.hide();
        window.aiFeatures.showAlert('Note deleted successfully!', 'success');
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
        const truncatedContent = note.content.length > 100 
            ? note.content.substring(0, 100) + '...' 
            : note.content;
            
        html += `
            <div class="col-md-4 mb-4">
                <div class="card note-card h-100">
                    <div class="card-body">
                        <h5 class="card-title">${note.title}</h5>
                        <p class="card-text">${truncatedContent}</p>
                    </div>
                    <div class="card-footer d-flex justify-content-end">
                        <button class="btn btn-sm btn-primary view-note" data-id="${note.id}">
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
            const noteId = parseInt(button.getAttribute('data-id'));
            const selectedNote = notes.find(note => note.id === noteId);
            if (selectedNote) showNoteView(selectedNote);
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
    elements.noteId.value = currentNote.id;
    elements.title.value = currentNote.title;
    elements.content.value = currentNote.content;
    elements.formTitle.textContent = 'Edit Note';

    summaryData = currentNote.summary;
    if (summaryData) {
        elements.summaryContent.textContent = summaryData;
    }

    if (currentNote.quiz) {
        try {
            quizData = JSON.parse(currentNote.quiz);
            window.aiFeatures.renderQuiz(quizData, elements.quizContent);
        } catch (e) {
            quizData = null;
            elements.quizContent.textContent = 'Error loading quiz data.';
        }
    }

    if (currentNote.mindmap) {
        try {
            mindmapData = JSON.parse(currentNote.mindmap);
            window.aiFeatures.renderMindMap(mindmapData, elements.mindmapContent);
        } catch (e) {
            mindmapData = null;
            elements.mindmapContent.textContent = 'Error loading mind map data.';
        }
    }

    toggleViews('createEditView');
}

function confirmDeleteNote() {
    elements.deleteModal.show();
}

function formatContent(text) {
    if (!text) return '';
    return text.split('\n\n')
        .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

// Initialize the application
// Add this to the DOMContentLoaded event listener
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
            // Don't submit if PDF processing is in progress
            if (window.pdfProcessingInProgress) {
                e.preventDefault();
                window.aiFeatures.showAlert('Please wait for PDF processing to complete', 'warning');
                return false;
            }
            saveNote(e);
        });
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
        const noteData = {
            title: title || 'Notes from PDF',
            content: content,
            summary: null,
            quiz: null,
            mindmap: null
        };

        const response = await fetch(`${API_URL}/api/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(noteData)
        });

        if (!response.ok) throw new Error('Failed to save PDF content');
        
        const result = await response.json();
        window.aiFeatures.showAlert('PDF content saved as a new note!', 'success');
        
        // Refresh the notes list without changing the view
        await loadNotes();
        
        return result.id;
    } catch (error) {
        console.error('Error saving PDF content:', error);
        window.aiFeatures.showAlert('Error saving PDF content: ' + error.message, 'danger');
        return null;
    }
};

// Add this function after the document ready event

// Helper function to edit a note by ID
window.editNote = function(noteId) {
    if (!noteId) return;
    
    console.log('Opening note for editing:', noteId);
    
    // Fetch the note data
    fetch(`${API_URL}/api/notes/${noteId}`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch note');
            return response.json();
        })
        .then(note => {
            // Populate the form
            document.getElementById('note-id').value = note.id;
            document.getElementById('title').value = note.title;
            document.getElementById('content').value = note.content;
            
            // Update form title
            const formTitle = document.getElementById('form-title');
            if (formTitle) formTitle.textContent = 'Edit Note';
            
            // Show the edit view
            toggleViews('createEditView');
            
            // Load AI features if available
            if (note.summary) {
                const summaryContent = document.getElementById('summary-content');
                if (summaryContent) {
                    summaryContent.innerHTML = `
                        <div class="card">
                            <div class="card-header bg-primary text-white">
                                <i class="fas fa-robot me-2"></i> AI Summary
                            </div>
                            <div class="card-body">
                                <p class="card-text">${note.summary}</p>
                            </div>
                        </div>
                    `;
                }
                window.summaryData = note.summary;
            }
            
            if (note.quiz) {
                try {
                    const quizData = JSON.parse(note.quiz);
                    const quizContent = document.getElementById('quiz-content');
                    if (quizContent && window.aiFeatures && window.aiFeatures.renderQuiz) {
                        window.aiFeatures.renderQuiz(quizData, quizContent);
                    }
                    window.quizData = quizData;
                } catch (e) {
                    console.error('Error parsing quiz data:', e);
                }
            }
            
            if (note.mindmap) {
                try {
                    const mindmapData = JSON.parse(note.mindmap);
                    const mindmapContent = document.getElementById('mindmap-content');
                    if (mindmapContent && window.aiFeatures && window.aiFeatures.renderMindMap) {
                        window.aiFeatures.renderMindMap(mindmapData, mindmapContent);
                    }
                    window.mindmapData = mindmapData;
                } catch (e) {
                    console.error('Error parsing mindmap data:', e);
                }
            }
        })
        .catch(error => {
            console.error('Error fetching note:', error);
            showAlert('Error fetching note: ' + error.message, 'danger');
        });
};

// Add this at the end of the file
// Global function to force edit mode for a specific note
window.forceEditMode = function(noteId) {
    if (!noteId) return;
    
    console.log('Forcing edit mode for note:', noteId);
    
    // Set a flag to stay in edit mode
    window.stayInEditMode = true;
    
    // Store the ID in localStorage and sessionStorage for redundancy
    localStorage.setItem('lastCreatedNoteId', noteId);
    sessionStorage.setItem('lastCreatedNoteId', noteId);
    localStorage.setItem('lastCreatedNoteTimestamp', Date.now().toString());
    sessionStorage.setItem('lastCreatedNoteTimestamp', Date.now().toString());
    
    // Call the editNote function
    editNote(parseInt(noteId));
    
    // Update URL without refreshing
    if (window.history && window.history.pushState) {
        window.history.pushState(
            {noteId: noteId}, 
            `Edit Note ${noteId}`, 
            `?view=edit&id=${noteId}`
        );
    }
};