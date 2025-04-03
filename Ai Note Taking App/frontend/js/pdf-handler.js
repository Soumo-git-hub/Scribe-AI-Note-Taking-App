// PDF Upload and Processing Handler
const PDF_API_URL = location.protocol === 'file:' 
    ? 'http://localhost:8001' 
    : `${window.location.protocol}//${window.location.hostname}:8001`;

// Global flag to track PDF processing
window.pdfProcessingInProgress = false;

// Initialize PDF handler
document.addEventListener('DOMContentLoaded', function() {
    const uploadHandwritingBtn = document.getElementById('upload-handwriting-btn');
    const handwritingInput = document.getElementById('handwriting-input');
    
    if (uploadHandwritingBtn && handwritingInput) {
        // Update button text to be more specific
        uploadHandwritingBtn.innerHTML = '<i class="bi bi-file-earmark-pdf"></i> Upload PDF';
        
        // Find the form that contains the button to prevent form submission
        const form = uploadHandwritingBtn.closest('form');
        if (form) {
            // Prevent form submission during PDF processing
            form.addEventListener('submit', function(e) {
                if (window.pdfProcessingInProgress) {
                    e.preventDefault();
                    console.log('Prevented form submission during PDF processing');
                    return false;
                }
            });
        }
        
        // Handle PDF button click
        uploadHandwritingBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation(); // Stop event propagation
            handwritingInput.click();
            return false; // Prevent default behavior
        });
        
        // Handle file selection
        handwritingInput.addEventListener('change', function(event) {
            event.preventDefault();
            event.stopPropagation(); // Stop event propagation
            handlePdfUpload(event);
            return false; // Prevent default behavior
        });
    }
    
    // Add custom loader style
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
    
    console.log('PDF Handler initialized');
});

// Improved PDF upload handler
async function handlePdfUpload(event) {
    // Make sure we don't refresh the page
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    // Set processing flag
    window.pdfProcessingInProgress = true;
    
    // Get the file
    const file = event.target.files[0];
    if (!file) {
        window.pdfProcessingInProgress = false;
        return;
    }
    
    // Check if file is PDF
    if (!file.type.includes('pdf')) {
        showAlert('Please upload a PDF file', 'warning');
        window.pdfProcessingInProgress = false;
        return;
    }
    
    // Check file size - 50MB limit
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        showAlert(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB.`, 'warning');
        window.pdfProcessingInProgress = false;
        return;
    }
    
    console.log(`Processing PDF file: ${file.name} (${file.size} bytes)`);
    
    // Show processing overlay
    const overlay = document.createElement('div');
    overlay.className = 'pdf-processing-overlay';
    overlay.innerHTML = `
        <div class="pdf-processing-spinner"></div>
        <div class="pdf-processing-message">
            Processing PDF file...<br>
            This may take a few moments.
        </div>
    `;
    document.body.appendChild(overlay);
    
    try {
        // Create form data for the API
        const formData = new FormData();
        formData.append('file', file);

        // First try the upload-pdf endpoint
        let response;
        let result;
        let usedEndpoint = '/api/upload-pdf';
        
        try {
            console.log('Sending PDF to upload-pdf endpoint');
            console.log('PDF API URL:', `${PDF_API_URL}/api/upload-pdf`);
            response = await fetch(`${PDF_API_URL}/api/upload-pdf`, {
            method: 'POST',
                body: formData
        });
        
            console.log('Upload response status:', response.status);
        
        if (!response.ok) {
                const errorText = await response.text();
                console.log(`Primary endpoint failed with status ${response.status}: ${errorText}`);
                throw new Error('Primary endpoint failed');
            }
            
            result = await response.json();
            console.log('Successfully processed PDF with upload-pdf endpoint');
        } catch (primaryError) {
            // If upload-pdf fails, try the handwriting endpoint as fallback
            console.log('Trying fallback endpoint /api/handwriting', primaryError);
            console.log('Error details:', primaryError.message);
            usedEndpoint = '/api/handwriting';
            
            // Create a new FormData since the previous one might have been consumed
            const fallbackFormData = new FormData();
            fallbackFormData.append('file', file);
            
            console.log('Sending PDF to fallback endpoint:', `${PDF_API_URL}/api/handwriting`);
            response = await fetch(`${PDF_API_URL}/api/handwriting`, {
                method: 'POST',
                body: fallbackFormData
            });
            
            console.log('Fallback response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(errorData.detail || `Server returned ${response.status}: ${response.statusText}`);
            }
            
            result = await response.json();
            console.log('Successfully processed PDF with handwriting endpoint');
        }
        
        // Get references to the content and title fields
        const contentField = document.getElementById('content');
        const titleField = document.getElementById('title');
        
        // Check if we received valid results
        if (!result || !result.text) {
            throw new Error('No text extracted from PDF');
        }
        
        console.log(`Extracted ${result.text.length} characters of text from PDF`);
        
        // Set the extracted text in the content field
        if (contentField) {
            contentField.value = result.text;
            console.log('Updated content field with extracted text');
            
            // If there's a title suggestion and the title field is empty, use the suggestion
            if (titleField && (!titleField.value || titleField.value.trim() === '') && result.title) {
                titleField.value = result.title;
                console.log('Updated title field with suggested title');
            }
            
            const pageCount = result.pages || 'unknown number of';
            showAlert(`PDF processed successfully using ${usedEndpoint}. Extracted ${result.text.length} characters from ${pageCount} page(s).`, 'success');
            
            // Attempt to auto-save the content
            console.log('Attempting to auto-save PDF content');
            setTimeout(() => {
                try {
                    // Set auto-save flag to bypass PDF processing check
                    window.pdfAutoSave = true;
                    
                    // Try to use the direct save function first
                    if (window.saveCurrentContent) {
                        console.log('Using saveCurrentContent function for direct save');
                        window.saveCurrentContent()
                            .then(result => {
                                console.log('Direct save completed:', result);
                                // Reset auto-save flag
                                window.pdfAutoSave = false;
                            })
                            .catch(error => {
                                console.error('Direct save failed:', error);
                                // Try the fallback methods
                                tryFallbackSave();
                            });
                    } else {
                        // If direct save function not available, try fallback methods
                        tryFallbackSave();
                    }
                    
                    function tryFallbackSave() {
                        // Try to get the save button
                        const saveBtn = document.getElementById('save-btn');
                        if (saveBtn) {
                            console.log('Found save button, triggering click');
                            saveBtn.click();
                        } else {
                            console.log('Save button not found, looking for form');
                            // Try to get and submit the form
                            const form = document.getElementById('note-form');
                            if (form) {
                                console.log('Found form, triggering submit event');
                                // Create and dispatch a submit event
                                const submitEvent = new Event('submit', {
                                    bubbles: true,
                                    cancelable: true
                                });
                                
                                // Submit the form
                                form.dispatchEvent(submitEvent);
                            } else {
                                console.error('Note form not found, cannot auto-save');
                                window.pdfAutoSave = false;
                            }
                        }
                    }
                    
                    // Reset the auto-save flag after a short delay as backup
                    setTimeout(() => {
                        window.pdfAutoSave = false;
                    }, 3000);
                } catch (e) {
                    console.error('Error during auto-save attempt:', e);
                    window.pdfAutoSave = false;
                }
            }, 500); // Short delay to ensure everything is ready
        } else {
            console.error('Content field not found in the DOM');
            showAlert('PDF processed but could not update content field.', 'warning');
        }
    } catch (error) {
        console.error('Error processing PDF:', error);
        showAlert(`Error processing PDF: ${error.message}`, 'danger');
    } finally {
        // Remove overlay
        if (document.body.contains(overlay)) {
            document.body.removeChild(overlay);
        }
        
        // Reset the file input to allow selecting the same file again
        if (event.target) {
            event.target.value = '';
        }
        
        // Clear the processing flag
        setTimeout(() => {
            // Delay clearing the flag to ensure the auto-save has time to complete
        window.pdfProcessingInProgress = false;
            window.pdfAutoSave = false;
            console.log('PDF processing flags reset');
        }, 2000);
        
        console.log('PDF processing completed');
    }
    
    // Return false to prevent form submission
    return false;
}

// Helper function to show alerts
function showAlert(message, type = 'info', autoDismiss = true, id = null) {
    // Generate a unique ID for the alert if not provided
    const alertId = id || `alert-${Date.now()}`;
    
    // Create the alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.id = alertId;
    
    // Set the content
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Find alert container or create one if it doesn't exist
    let alertContainer = document.querySelector('.alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.className = 'alert-container mb-3';
        const container = document.querySelector('.container');
        if (container && container.firstChild) {
            container.insertBefore(alertContainer, container.firstChild);
        } else {
            document.body.prepend(alertContainer);
            // If adding to body, style it as a floating alert
            alertDiv.style.position = 'fixed';
            alertDiv.style.top = '20px';
            alertDiv.style.right = '20px';
            alertDiv.style.zIndex = '9999';
            alertDiv.style.maxWidth = '300px';
        }
    }
    
    // Add the alert to the container
    alertContainer.prepend(alertDiv);
    
    // Initialize the Bootstrap alert
    try {
        const bsAlert = new bootstrap.Alert(alertDiv);
        
        // Auto-dismiss after 5 seconds if specified
        if (autoDismiss) {
            setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    bsAlert.close();
                }
            }, 5000);
        }
    } catch (error) {
        console.error('Error initializing Bootstrap alert:', error);
        // Fallback for dismissing alert
    if (autoDismiss) {
        setTimeout(() => {
                if (alertDiv && alertDiv.parentNode) {
                    alertDiv.remove();
                }
        }, 5000);
        }
    }
    
    return alertId;
}

// Helper function to remove an alert by ID
function removeAlert(id) {
    const alertDiv = document.getElementById(id);
    if (alertDiv) {
        try {
            const bsAlert = bootstrap.Alert.getInstance(alertDiv);
            if (bsAlert) {
                bsAlert.close();
            } else {
                alertDiv.remove();
            }
        } catch (error) {
            console.error('Error removing alert:', error);
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }
    }
}

// Export functions for use in other modules
window.pdfHandler = {
    handlePdfUpload,
    showAlert,
    removeAlert
};

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
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('Note not found - it may have been deleted');
                    }
                    throw new Error('Failed to fetch note');
                }
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
                
                // If note is not found or there's an error, escape from edit mode
                if (error.message.includes('not found') || error.message.includes('deleted')) {
                    console.log('Note not found, redirecting to notes list');
                    // Show notes list instead
                    if (notesListView) {
                        notesListView.style.display = 'block';
                        createEditView.style.display = 'none';
                    }
                    
                    // Clear session storage flags
                    sessionStorage.removeItem('forceEditModeNoteId');
                    sessionStorage.removeItem('forceEditModeTimestamp');
                    
                    // Also try using the showNotesView function
                    if (typeof window.showNotesView === 'function') {
                        window.showNotesView();
                    }
                    
                    // Reset the form
                    const form = document.getElementById('note-form');
                    if (form) {
                        form.reset();
                    }
                }
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
    
    // Add escape mechanism - if Cancel button exists, add click listener
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            // Clear storage and show notes list
            sessionStorage.removeItem('forceEditModeNoteId');
            sessionStorage.removeItem('forceEditModeTimestamp');
            
            if (typeof window.showNotesView === 'function') {
                window.showNotesView();
            }
        });
    }
}