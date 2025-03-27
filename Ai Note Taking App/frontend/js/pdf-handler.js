// PDF Upload and Processing Handler
const PDF_API_URL = window.location.protocol + '//' + window.location.hostname + ':8000';

// Global flag to track PDF processing
window.pdfProcessingInProgress = false;

// Add this at the end of the DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
    const uploadHandwritingBtn = document.getElementById('upload-handwriting-btn');
    const handwritingInput = document.getElementById('handwriting-input');
    
    if (uploadHandwritingBtn && handwritingInput) {
        // Update button text to be more specific
        uploadHandwritingBtn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Upload PDF';
        
        // Find the form that contains the button
        const form = uploadHandwritingBtn.closest('form');
        if (form) {
            // Prevent form submission when PDF button is clicked
            uploadHandwritingBtn.type = 'button';
            
            // Completely override the form's submit event to prevent any refreshes
            const originalSubmit = form.onsubmit;
            form.onsubmit = function(e) {
                if (window.pdfProcessingInProgress) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
                
                // If we're not processing a PDF, use the original submit handler
                if (typeof originalSubmit === 'function') {
                    return originalSubmit.call(this, e);
                }
            };
            
            // Also intercept the form's action to prevent navigation
            form.addEventListener('submit', function(e) {
                if (window.pdfProcessingInProgress) {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }, true);
            
            // Completely override the form's action attribute to prevent navigation
            const originalAction = form.action;
            Object.defineProperty(form, 'action', {
                get: function() {
                    return window.pdfProcessingInProgress ? 'javascript:void(0);' : originalAction;
                },
                set: function() {
                    // Ignore attempts to set the action while processing
                    if (!window.pdfProcessingInProgress) {
                        originalAction = value;
                    }
                }
            });
        }
        
        // Handle PDF button click
        uploadHandwritingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            handwritingInput.click();
            return false;
        });
        
        // Handle file selection
        handwritingInput.addEventListener('change', function(event) {
            event.preventDefault();
            event.stopPropagation();
            handlePdfUpload(event);
            return false;
        });
    }
    
    // Add a custom loader style if not already present
    if (!document.getElementById('pdf-loader-style')) {
        const style = document.createElement('style');
        style.id = 'pdf-loader-style';
        style.textContent = `
            .pdf-processing-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                justify-content: center;
                align-items: center;
                flex-direction: column;
            }
            .pdf-processing-spinner {
                width: 80px;
                height: 80px;
                border: 8px solid #f3f3f3;
                border-top: 8px solid #3498db;
                border-radius: 50%;
                animation: pdf-spin 2s linear infinite;
            }
            .pdf-processing-message {
                color: white;
                font-size: 18px;
                margin-top: 20px;
                text-align: center;
                max-width: 80%;
                background-color: rgba(0, 0, 0, 0.7);
                padding: 15px;
                border-radius: 5px;
            }
            @keyframes pdf-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Disable the beforeunload event to prevent reload popups
    window.addEventListener('beforeunload', function(e) {
        if (window.pdfProcessingInProgress) {
            // Just log a message, don't set returnValue
            console.log('PDF processing in progress');
            // Don't return anything to prevent the popup
        }
    }, {capture: true});
    
    console.log('PDF Handler initialized with enhanced refresh prevention');
});

// In the handlePdfUpload function, let's modify the file size handling

// Modify the handlePdfUpload function
async function handlePdfUpload(event) {
    // Set processing flag
    window.pdfProcessingInProgress = true;
    
    // Prevent default behavior more aggressively
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }
    
    // Get the file only once
    const file = event.target.files[0];
    if (!file) {
        window.pdfProcessingInProgress = false;
        return false;
    }
    
    // Disable all form elements to prevent interaction during processing
    const form = document.querySelector('form');
    if (form) {
        const formElements = form.elements;
        for (let i = 0; i < formElements.length; i++) {
            if (formElements[i].type !== 'file') {
                formElements[i].disabled = true;
            }
        }
    }
    
    // Prevent any form submissions during PDF processing
    const originalSubmit = HTMLFormElement.prototype.submit;
    HTMLFormElement.prototype.submit = function() {
        if (window.pdfProcessingInProgress) {
            console.log('Form submission prevented during PDF processing');
            return false;
        }
        return originalSubmit.apply(this, arguments);
    };
    
    // Check if file is PDF
    if (!file.type.includes('pdf')) {
        showAlert('Please upload a PDF file', 'warning');
        window.pdfProcessingInProgress = false;
        // Re-enable form elements
        if (form) {
            const formElements = form.elements;
            for (let i = 0; i < formElements.length; i++) {
                formElements[i].disabled = false;
            }
        }
        // Restore original submit
        HTMLFormElement.prototype.submit = originalSubmit;
        return false;
    }
    
    // Increase max file size to handle larger PDFs - 50MB should be sufficient
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showAlert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB.`, 'warning');
        window.pdfProcessingInProgress = false;
        return;
    }
    
    console.log(`Processing PDF file: ${file.name} (${file.size} bytes)`);
    
    // Get the content textarea
    const contentArea = document.getElementById('content');
    const titleInput = document.getElementById('title');
    const originalContent = contentArea.value;
    
    // Always show the overlay for PDF processing regardless of size
    // This gives user feedback that something is happening
    const overlay = document.createElement('div');
    overlay.className = 'pdf-processing-overlay';
    overlay.id = 'pdf-processing-overlay';
    overlay.innerHTML = `
        <div class="pdf-processing-spinner"></div>
        <div class="pdf-processing-message">
            <strong>Extracting text from PDF...</strong><br>
            Please wait while we process your file. Larger PDFs may take longer.
        </div>
    `;
    document.body.appendChild(overlay);
    
    try {
        // Use the handwriting endpoint which can handle PDFs
        const endpoint = `${PDF_API_URL}/api/handwriting`;
        console.log('Processing PDF file using:', endpoint);

        const formData = new FormData();
        formData.append('file', file);

        // Set a longer timeout for larger files
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutes timeout

        const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to process PDF');
        }
        
        // Get the extracted text
        const extractedText = result.text;
        const suggestedTitle = result.title || 'Notes from PDF';
        
        if (!extractedText || extractedText.trim().length === 0) {
            throw new Error('No text could be extracted from the PDF');
        }
        
        console.log(`Successfully extracted ${extractedText.length} characters from PDF`);
        
        // Update the content area with the extracted text
        if (contentArea) {
            // Format the extracted text as markdown
            contentArea.value = extractedText;
            
            // Update the title if it's empty
            if (titleInput && (!titleInput.value || titleInput.value.trim() === '')) {
                titleInput.value = suggestedTitle;
            }
            
            // Important: Save the note immediately to prevent loss of data
            // But don't navigate away from the page
            window.stayInEditMode = true;
            
            // Create a new note with the extracted content
            const savedNote = await window.savePdfContent(
                titleInput ? titleInput.value : suggestedTitle,
                extractedText
            );
            
            if (savedNote && savedNote.id) {
                // Store the ID for later use
                localStorage.setItem('lastCreatedNoteId', savedNote.id);
                localStorage.setItem('lastCreatedNoteTimestamp', Date.now());
                
                // Update the note ID field if we're in edit mode
                if (document.getElementById('note-id')) {
                    document.getElementById('note-id').value = savedNote.id;
                }
                
                // Update the form title to indicate we're now editing
                const formTitle = document.getElementById('form-title');
                if (formTitle) {
                    formTitle.textContent = 'Edit Note';
                }
                
                // Show success message
                showAlert('PDF content extracted and saved as a new note!', 'success');
                
                // Redirect to edit the newly created note
                if (typeof window.editNote === 'function') {
                    window.editNote(savedNote.id);
                }
            }
        }
        
        // Remove the overlay
        const overlay = document.getElementById('pdf-processing-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Re-enable form elements
        if (form) {
            const formElements = form.elements;
            for (let i = 0; i < formElements.length; i++) {
                formElements[i].disabled = false;
            }
        }
        
        // Restore original submit
        HTMLFormElement.prototype.submit = originalSubmit;
        
        // Reset the file input
        event.target.value = '';
        
        // Clear the processing flag
        window.pdfProcessingInProgress = false;
        
        return false;
    } catch (error) {
        console.error('Error processing PDF:', error);
        showAlert('Error processing PDF: ' + error.message, 'danger');
    }
}

// Helper function to redirect to edit mode
function redirectToEditMode(noteId) {
    if (!noteId) return;
    
    // Clear the storage to prevent infinite redirects
    localStorage.removeItem('lastCreatedNoteId');
    sessionStorage.removeItem('lastCreatedNoteId');
    
    console.log('Redirecting to edit mode for note:', noteId);
    
    // Try multiple approaches to open the note
    
    // 1. Try using the editNote function if available
    if (typeof window.editNote === 'function') {
        console.log('Using editNote function');
        window.editNote(noteId);
        return;
    }
    
    // 2. Try clicking the edit button if it exists
    const editBtn = document.querySelector(`[data-note-id="${noteId}"]`);
    if (editBtn) {
        console.log('Found edit button, clicking it');
        editBtn.click();
        return;
    }
    
    // 3. Try manual navigation
    console.log('Using manual navigation');
    
    // Update URL and navigate
    window.location.href = `?view=edit&id=${noteId}`;
}

// Add the editNote function to the window object if it doesn't exist
if (typeof window.editNote !== 'function') {
    window.editNote = function(noteId) {
        if (!noteId) return;
        
        console.log('Opening note for editing:', noteId);
        
        // Fetch the note data
        fetch(`${PDF_API_URL}/api/notes/${noteId}`)
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
                if (typeof window.toggleViews === 'function') {
                    window.toggleViews('createEditView');
                } else {
                    // Manual toggle if function not available
                    const views = ['notesListView', 'createEditView', 'noteDetailView'];
                    views.forEach(view => {
                        const element = document.getElementById(view);
                        if (element) {
                            element.style.display = view === 'createEditView' ? 'block' : 'none';
                        }
                    });
                }
                
                // Load AI features if available
                if (note.summary) {
                    const summaryContent = document.getElementById('summary-content');
                    if (summaryContent) {
                        summaryContent.innerHTML = note.summary;
                    }
                    window.summaryData = note.summary;
                }
                
                if (note.quiz) {
                    try {
                        window.quizData = JSON.parse(note.quiz);
                    } catch (e) {
                        console.error('Error parsing quiz data:', e);
                    }
                }
                
                if (note.mindmap) {
                    try {
                        window.mindmapData = JSON.parse(note.mindmap);
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
}

// Helper function to show alerts
function showAlert(message, type = 'info', autoDismiss = true, id = null) {
    // Use the global alert function if available
    if (window.aiFeatures && window.aiFeatures.showAlert) {
        return window.aiFeatures.showAlert(message, type, autoDismiss);
    }
    
    // Otherwise create our own alert
    const alertsContainer = document.querySelector('.alerts-container') || 
                           document.createElement('div');
    
    if (!document.querySelector('.alerts-container')) {
        alertsContainer.className = 'alerts-container';
        alertsContainer.style.position = 'fixed';
        alertsContainer.style.top = '20px';
        alertsContainer.style.right = '20px';
        alertsContainer.style.zIndex = '1050';
        document.body.appendChild(alertsContainer);
    }
    
    // Remove existing alert with the same ID if it exists
    if (id) {
        const existingAlert = document.getElementById(id);
        if (existingAlert) {
            existingAlert.remove();
        }
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    if (id) {
        alert.id = id;
    }
    
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    alertsContainer.appendChild(alert);
    
    if (autoDismiss) {
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 150);
        }, 5000);
    }
    
    // Add click handler to close button
    alert.querySelector('.btn-close').addEventListener('click', function() {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    });
    
    return id || alert;
}

// Helper function to remove an alert by ID
function removeAlert(id) {
    if (!id) return;
    
    const alert = document.getElementById(id);
    if (alert) {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }
}

// Add a listener to check for redirections
window.addEventListener('load', function() {
    const lastNoteId = localStorage.getItem('lastCreatedNoteId');
    const lastTimestamp = localStorage.getItem('lastCreatedNoteTimestamp');
    
    // Only process if we have a note ID and it's recent (within the last minute)
    if (lastNoteId && lastTimestamp) {
        const now = Date.now();
        const timestamp = parseInt(lastTimestamp);
        
        // If the timestamp is within the last minute
        if (now - timestamp < 60000) {
            console.log('Found recent note creation, checking if we need to redirect');
            
            // Check if we're on the notes list page
            const notesListElement = document.getElementById('notes-list');
            if (notesListElement && 
                window.getComputedStyle(notesListElement).display !== 'none') {
                
                console.log('On notes list page, redirecting to edit mode');
                if (typeof window.editNote === 'function') {
                    window.editNote(parseInt(lastNoteId));
                }
            } else {
                // Clear old data
                localStorage.removeItem('lastCreatedNoteId');
                localStorage.removeItem('lastCreatedNoteTimestamp');
            }
        }
    }
}); // Added the missing closing bracket here

// Add this at the end of the file
window.addEventListener('load', function() {
    console.log('Page loaded, checking for pending edit mode redirections');
    
    // Check all storage locations for note IDs
    const lastNoteId = localStorage.getItem('lastCreatedNoteId') || 
                      sessionStorage.getItem('lastCreatedNoteId') || 
                      sessionStorage.getItem('forceEditModeNoteId');
    
    if (lastNoteId) {
        console.log('Found note ID in storage:', lastNoteId);
        
        // Force edit mode with a slight delay to ensure DOM is ready
        setTimeout(() => {
            forceEditMode(lastNoteId);
        }, 300);
    }
});

// Add this after the load event listener
document.addEventListener('DOMContentLoaded', function() {
    // Set up a MutationObserver to detect when notes list becomes visible
    const setupNotesListObserver = function() {
        const notesListElement = document.getElementById('notes-list');
        if (!notesListElement) {
            // Try again later if the element doesn't exist yet
            setTimeout(setupNotesListObserver, 500);
            return;
        }
        
        console.log('Setting up MutationObserver for notes list');
        
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'style' &&
                    window.getComputedStyle(notesListElement).display !== 'none') {
                    
                    const lastNoteId = localStorage.getItem('lastCreatedNoteId');
                    const lastTimestamp = localStorage.getItem('lastCreatedNoteTimestamp');
                    
                    if (lastNoteId && lastTimestamp) {
                        const now = Date.now();
                        const timestamp = parseInt(lastTimestamp);
                        
                        // If the timestamp is within the last minute
                        if (now - timestamp < 60000) {
                            console.log('Notes list became visible, redirecting to edit mode');
                            
                            // Clear the storage to prevent future redirects
                            localStorage.removeItem('lastCreatedNoteId');
                            localStorage.removeItem('lastCreatedNoteTimestamp');
                            
                            if (typeof window.editNote === 'function') {
                                window.editNote(parseInt(lastNoteId));
                            }
                            
                            // Disconnect the observer after handling
                            observer.disconnect();
                        }
                    }
                }
            });
        });
        
        observer.observe(notesListElement, { 
            attributes: true, 
            attributeFilter: ['style'] 
        });
    };
    
    // Start the setup process
    setupNotesListObserver();
});

// Export the functions to be accessible from other scripts
window.pdfHandler = {
    handlePdfUpload,
    showAlert,
    removeAlert
};


// Add this function at the top of your file, before it's called
function forceEditMode(noteId) {
    if (!noteId) return;
    
    console.log('Forcing edit mode for note:', noteId);
    
    // Set a flag in sessionStorage that will be checked frequently
    sessionStorage.setItem('forceEditModeNoteId', noteId);
    sessionStorage.setItem('forceEditModeTimestamp', Date.now().toString());
    
    // Try direct DOM manipulation first - this is the most reliable method
    const createEditView = document.getElementById('createEditView') || document.getElementById('create-edit-view');
    const notesListView = document.getElementById('notesListView') || document.getElementById('notes-list-view') || document.getElementById('notes-list');
    const noteDetailView = document.getElementById('noteDetailView') || document.getElementById('note-detail-view');
    
    if (createEditView) {
        console.log('Found edit view element, showing it directly');
        createEditView.style.display = 'block';
        
        // Hide other views
        if (notesListView) notesListView.style.display = 'none';
        if (noteDetailView) noteDetailView.style.display = 'none';
        
        // Try to fetch and populate the note data
        fetch(`${PDF_API_URL}/api/notes/${noteId}`)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch note');
                return response.json();
            })
            .then(note => {
                // Populate the form
                const noteIdInput = document.getElementById('note-id');
                const titleInput = document.getElementById('title');
                const contentInput = document.getElementById('content');
                
                if (noteIdInput) noteIdInput.value = note.id;
                if (titleInput) titleInput.value = note.title;
                if (contentInput) contentInput.value = note.content;
                
                // Update form title
                const formTitle = document.getElementById('form-title');
                if (formTitle) formTitle.textContent = 'Edit Note';
                
                console.log('Successfully populated note data in edit form');
                
                // Load AI features if available
                if (note.summary) {
                    const summaryContent = document.getElementById('summary-content');
                    if (summaryContent) {
                        summaryContent.innerHTML = note.summary;
                    }
                    window.summaryData = note.summary;
                }
                
                if (note.quiz) {
                    try {
                        window.quizData = JSON.parse(note.quiz);
                    } catch (e) {
                        console.error('Error parsing quiz data:', e);
                    }
                }
                
                if (note.mindmap) {
                    try {
                        window.mindmapData = JSON.parse(note.mindmap);
                    } catch (e) {
                        console.error('Error parsing mindmap data:', e);
                    }
                }
                
                // Force URL update to match the edit mode
                if (window.history && window.history.replaceState) {
                    window.history.replaceState(
                        {noteId: noteId}, 
                        `Edit Note ${noteId}`, 
                        `?view=edit&id=${noteId}`
                    );
                }
            })
            .catch(error => {
                console.error('Error fetching note:', error);
                showAlert('Error fetching note: ' + error.message, 'danger');
            });
    } else {
        // If we can't find the view elements directly, try using the toggleViews function
        console.log('Using toggleViews function');
        if (typeof window.toggleViews === 'function') {
            window.toggleViews('createEditView');
            
            // Also try to use the editNote function
            if (typeof window.editNote === 'function') {
                window.editNote(parseInt(noteId));
            }
        } else {
            // Last resort: try to navigate to the edit page
            console.log('Using URL navigation as last resort');
            window.location.href = `?view=edit&id=${noteId}`;
        }
    }
    
    // Set up an interval to check and enforce edit mode
    const checkInterval = setInterval(() => {
        const storedNoteId = sessionStorage.getItem('forceEditModeNoteId');
        const timestamp = parseInt(sessionStorage.getItem('forceEditModeTimestamp') || '0');
        
        // Stop checking after 10 seconds
        if (!storedNoteId || Date.now() - timestamp > 10000) {
            clearInterval(checkInterval);
            sessionStorage.removeItem('forceEditModeNoteId');
            sessionStorage.removeItem('forceEditModeTimestamp');
            return;
        }
        
        // Check if we're in edit mode
        const createEditView = document.getElementById('createEditView') || document.getElementById('create-edit-view');
        
        if (createEditView && window.getComputedStyle(createEditView).display === 'none') {
            console.log('Not in edit mode, forcing it again');
            
            // Try all possible methods to show edit view
            createEditView.style.display = 'block';
            
            // Hide other views
            const notesListView = document.getElementById('notesListView') || document.getElementById('notes-list-view') || document.getElementById('notes-list');
            const noteDetailView = document.getElementById('noteDetailView') || document.getElementById('note-detail-view');
            
            if (notesListView) notesListView.style.display = 'none';
            if (noteDetailView) noteDetailView.style.display = 'none';
            
            // Also try using the toggleViews function
            if (typeof window.toggleViews === 'function') {
                window.toggleViews('createEditView');
            }
            
            // Also try using the editNote function
            if (typeof window.editNote === 'function') {
                window.editNote(parseInt(storedNoteId));
            }
        }
    }, 500);
}