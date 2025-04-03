// AI Features Handler
// This file contains functions for AI-powered features like summary, quiz, and mindmap generation

// API Configuration (shared with main.js)
const AI_API_URL = location.protocol === 'file:' 
    ? 'http://localhost:8001' 
    : `${window.location.protocol}//${window.location.hostname}:8001`;

// AI Feature Functions
async function generateSummary(content, summaryContainer) {
    if (!content.trim()) {
        showAlert('Please enter some content to summarize', 'warning');
        return null;
    }

    summaryContainer.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Generating summary...</p></div>';

    try {
        const response = await fetch(`${AI_API_URL}/api/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        });

        if (!response.ok) throw new Error('Failed to generate summary');
        const data = await response.json();
        if (!data.summary) throw new Error('No summary received from API');

        summaryContainer.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <i class="fas fa-robot me-2"></i> AI Summary
                </div>
                <div class="card-body">
                    <p class="card-text">${data.summary}</p>
                </div>
            </div>
        `;

        showAlert('Summary generated successfully!', 'success');
        return data.summary;
    } catch (error) {
        console.error('Error generating summary:', error);
        summaryContainer.innerHTML = '<div class="alert alert-danger">Failed to generate summary. Please try again.</div>';
        showAlert('Error generating summary: ' + error.message, 'danger');
        return null;
    }
}

async function generateQuiz(content, quizContainer) {
    if (!content.trim()) {
        showAlert('Please enter content to generate quiz', 'warning');
        return null;
    }

    try {
        quizContainer.textContent = 'Generating quiz...';
        const response = await fetch(`${AI_API_URL}/api/generate-quiz`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        });

        if (!response.ok) throw new Error('Failed to generate quiz');
        const data = await response.json();
        if (!data.quiz || (!data.quiz.mcq && !data.quiz.true_false && !data.quiz.fill_blank)) 
            throw new Error('Invalid quiz data received from server');

        renderQuiz(data.quiz, quizContainer);
        return data.quiz;
    } catch (error) {
        console.error('Error generating quiz:', error);
        showAlert('Error generating quiz: ' + error.message, 'danger');
        return null;
    }
}

async function generateMindMap(content, mindmapContainer) {
    if (!content.trim()) {
        showAlert('Please enter content to create mind map', 'warning');
        return null;
    }

    try {
        mindmapContainer.textContent = 'Generating mind map...';
        const response = await fetch(`${AI_API_URL}/api/mindmap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content })
        });

        if (!response.ok) throw new Error('Failed to create mind map');
        const data = await response.json();
        if (!data.mindmap || !data.mindmap.central) 
            throw new Error('Invalid mind map data received from server');

        renderMindMap(data.mindmap, mindmapContainer);
        return data.mindmap;
    } catch (error) {
        console.error('Error generating mind map:', error);
        showAlert('Error creating mind map: ' + error.message, 'danger');
        return null;
    }
}

function renderQuiz(quiz, container) {
    if (!quiz || !quiz.mcq) {
        container.textContent = 'No quiz data available.';
        return;
    }

    let html = '<div class="quiz-container">';
    if (quiz.mcq && quiz.mcq.length) {
        html += '<h4>Multiple Choice Questions</h4>';
        quiz.mcq.forEach((q, idx) => {
            html += `
                <div class="question-item mb-3">
                    <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
                    <div class="options">
                        ${q.options.map((opt, i) => `
                            <div class="form-check">
                                <input class="form-check-input" type="radio" name="mcq-${idx}" id="mcq-${idx}-${i}" value="${opt}">
                                <label class="form-check-label" for="mcq-${idx}-${i}">${opt}</label>
                            </div>
                        `).join('')}
                    </div>
                    <div class="feedback mt-2" style="display:none;"></div>
                </div>
            `;
        });
    }

    if (quiz.true_false && quiz.true_false.length) {
        html += '<h4>True or False</h4>';
        quiz.true_false.forEach((q, idx) => {
            html += `
                <div class="question-item mb-3">
                    <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
                    <div class="options">
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="tf-${idx}" id="tf-${idx}-true" value="true">
                            <label class="form-check-label" for="tf-${idx}-true">True</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="radio" name="tf-${idx}" id="tf-${idx}-false" value="false">
                            <label class="form-check-label" for="tf-${idx}-false">False</label>
                        </div>
                    </div>
                    <div class="feedback mt-2" style="display:none;"></div>
                </div>
            `;
        });
    }

    if (quiz.fill_blank && quiz.fill_blank.length) {
        html += '<h4>Fill in the Blanks</h4>';
        quiz.fill_blank.forEach((q, idx) => {
            html += `
                <div class="question-item mb-3">
                    <p><strong>Q${idx + 1}:</strong> ${q.question}</p>
                    <div class="mt-2 mb-2">
                        <input type="text" class="form-control form-control-sm fill-blank-input" placeholder="Your answer">
                    </div>
                    <div class="feedback mt-2" style="display:none;"></div>
                </div>
            `;
        });
    }

    html += `
        <div class="d-flex justify-content-between mt-3">
            <button type="button" class="btn btn-outline-primary btn-sm check-answers">Check Answers</button>
            <button type="button" class="btn btn-outline-secondary btn-sm reset-quiz">Reset</button>
        </div>
    </div>`;

    container.innerHTML = html;

    container.querySelector('.check-answers').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        let correctCount = 0;
        let totalQuestions = 0;

        quiz.mcq.forEach((q, idx) => {
            const selectedAnswer = container.querySelector(`input[name="mcq-${idx}"]:checked`);
            const feedbackDiv = container.querySelector(`#mcq-${idx}-0`).closest('.question-item').querySelector('.feedback');
            if (selectedAnswer) {
                totalQuestions++;
                const isCorrect = selectedAnswer.value === q.answer;
                if (isCorrect) correctCount++;
                feedbackDiv.innerHTML = `
                    <div class="alert ${isCorrect ? 'alert-success' : 'alert-danger'}">
                        <strong>${isCorrect ? 'Correct!' : 'Incorrect'}</strong><br>
                        ${isCorrect ? 'Well done!' : `The correct answer is: ${q.answer}`}
                    </div>
                `;
            } else {
                feedbackDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>Not answered</strong><br>
                        Please select an answer
                    </div>
                `;
            }
            feedbackDiv.style.display = 'block';
        });

        quiz.true_false.forEach((q, idx) => {
            const selectedAnswer = container.querySelector(`input[name="tf-${idx}"]:checked`);
            const feedbackDiv = container.querySelector(`#tf-${idx}-true`).closest('.question-item').querySelector('.feedback');
            if (selectedAnswer) {
                totalQuestions++;
                const isCorrect = (selectedAnswer.value === 'true') === q.answer;
                if (isCorrect) correctCount++;
                feedbackDiv.innerHTML = `
                    <div class="alert ${isCorrect ? 'alert-success' : 'alert-danger'}">
                        <strong>${isCorrect ? 'Correct!' : 'Incorrect'}</strong><br>
                        ${isCorrect ? 'Well done!' : `The correct answer is: ${q.answer ? 'True' : 'False'}`}
                    </div>
                `;
            } else {
                feedbackDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>Not answered</strong><br>
                        Please select an answer
                    </div>
                `;
            }
            feedbackDiv.style.display = 'block';
        });

        quiz.fill_blank.forEach((q, idx) => {
            const input = container.querySelectorAll('.fill-blank-input')[idx];
            const feedbackDiv = input.closest('.question-item').querySelector('.feedback');
            if (input.value.trim()) {
                totalQuestions++;
                const isCorrect = input.value.trim().toLowerCase() === q.answer.toLowerCase();
                if (isCorrect) correctCount++;
                feedbackDiv.innerHTML = `
                    <div class="alert ${isCorrect ? 'alert-success' : 'alert-danger'}">
                        <strong>${isCorrect ? 'Correct!' : 'Incorrect'}</strong><br>
                        ${isCorrect ? 'Well done!' : `The correct answer is: ${q.answer}`}
                    </div>
                `;
            } else {
                feedbackDiv.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>Not answered</strong><br>
                        Please enter your answer
                    </div>
                `;
            }
            feedbackDiv.style.display = 'block';
        });

        if (totalQuestions > 0) {
            const score = Math.round((correctCount / totalQuestions) * 100);
            const scoreMessage = `
                <div class="alert alert-info mt-3">
                    <strong>Quiz Results:</strong><br>
                    You scored ${score}% (${correctCount} out of ${totalQuestions} correct)
                </div>
            `;
            container.querySelector('.d-flex').insertAdjacentHTML('beforebegin', scoreMessage);
        }
    });

    container.querySelector('.reset-quiz').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        container.querySelectorAll('input[type="radio"]').forEach(el => {
            el.checked = false;
        });
        container.querySelectorAll('input[type="text"]').forEach(el => {
            el.value = '';
        });
        container.querySelectorAll('.feedback').forEach(el => {
            el.style.display = 'none';
        });
        const scoreMessage = container.querySelector('.alert-info');
        if (scoreMessage) {
            scoreMessage.remove();
        }
    });
}

function renderMindMap(mindmap, container) {
    if (!mindmap || !mindmap.central) {
        container.textContent = 'No mind map data available.';
        return;
    }

    let html = `
        <div class="mindmap-container">
            <div class="central-topic">
                <div class="central-node">${mindmap.central}</div>
            </div>
            <div class="branches-container">
    `;

    if (mindmap.branches && mindmap.branches.length) {
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

// Helper function for alerts
function showAlert(message, type = 'info') {
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
    alertEl.role = 'alert';
    alertEl.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alertEl);
    setTimeout(() => {
        const bsAlert = new bootstrap.Alert(alertEl);
        bsAlert.close();
    }, 3000);
}

// Text-to-Speech functionality
async function textToSpeech(text, voiceOptions = {}) {
    if (!text || !text.trim()) {
        showAlert('Please provide text for text-to-speech conversion', 'warning');
        return false;
    }

    try {
        // Check if browser supports speech synthesis
        if (!window.speechSynthesis) {
            throw new Error('Your browser does not support text-to-speech functionality');
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice options if provided
        if (voiceOptions.rate) utterance.rate = voiceOptions.rate;
        if (voiceOptions.pitch) utterance.pitch = voiceOptions.pitch;
        if (voiceOptions.volume) utterance.volume = voiceOptions.volume;
        
        // Get available voices
        let voices = window.speechSynthesis.getVoices();
        
        // If voices aren't loaded yet, wait for them
        if (voices.length === 0) {
            return new Promise((resolve) => {
                window.speechSynthesis.onvoiceschanged = () => {
                    voices = window.speechSynthesis.getVoices();
                    
                    // Try to find an English voice
                    if (voiceOptions.language) {
                        const preferredVoice = voices.find(voice => 
                            voice.lang.includes(voiceOptions.language));
                        if (preferredVoice) utterance.voice = preferredVoice;
                    }
                    
                    window.speechSynthesis.speak(utterance);
                    resolve(true);
                };
            });
        }
        
        // Try to find an English voice
        if (voiceOptions.language) {
            const preferredVoice = voices.find(voice => 
                voice.lang.includes(voiceOptions.language));
            if (preferredVoice) utterance.voice = preferredVoice;
        }
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
        return true;
    } catch (error) {
        console.error('Text-to-speech error:', error);
        showAlert('Error with text-to-speech: ' + error.message, 'danger');
        return false;
    }
}

// Process handwritten notes or PDF
async function processHandwriting(file, container) {
    if (!file) {
        showAlert('Please select a file first', 'warning');
        return null;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        container.innerHTML = '<div class="text-center"><div class="spinner-border text-primary" role="status"></div><p>Processing file...</p></div>';
        
        const response = await fetch(`${AI_API_URL}/api/ocr`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Failed to process file');
        const data = await response.json();
        
        if (!data.text) throw new Error('No text could be extracted from the file');
        
        container.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <i class="fas fa-file-alt me-2"></i> Extracted Text
                </div>
                <div class="card-body">
                    <p class="card-text">${data.text.replace(/\n/g, '<br>')}</p>
                </div>
            </div>
        `;
        
        showAlert('Text extracted successfully!', 'success');
        return data.text;
    } catch (error) {
        console.error('Error processing file:', error);
        container.innerHTML = '<div class="alert alert-danger">Failed to process file. Please try again.</div>';
        showAlert('Error processing file: ' + error.message, 'danger');
        return null;
    }
}

// Test AI service functionality
async function testAIService(content, summaryContainer, quizContainer, mindmapContainer) {
    const testContent = content || "This is a test content to verify the AI service is working correctly. The AI should generate a summary, quiz, and mind map from this text.";
    
    try {
        showAlert('Testing AI service...', 'info');
        const response = await fetch(`${AI_API_URL}/api/test-ai`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: testContent })
        });

        if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('AI Test Results:', result);
            showAlert('AI service test successful!', 'success');
            
            if (summaryContainer && result.summary) {
                summaryContainer.textContent = result.summary;
            }
            
            if (quizContainer && result.quiz) {
                try {
                    const quizData = JSON.parse(result.quiz);
                    renderQuiz(quizData, quizContainer);
                } catch (e) {
                    console.error('Error parsing quiz data:', e);
                    quizContainer.textContent = 'Error parsing quiz data.';
                }
            }
            
            if (mindmapContainer && result.mindmap) {
                try {
                    const mindmapData = JSON.parse(result.mindmap);
                    renderMindMap(mindmapData, mindmapContainer);
                } catch (e) {
                    console.error('Error parsing mindmap data:', e);
                    mindmapContainer.textContent = 'Error parsing mindmap data.';
                }
            }
            
            return result;
        } else {
            throw new Error(result.message || 'Unknown error');
        }
    } catch (error) {
        console.error('AI Test Error:', error);
        showAlert(`AI service test failed: ${error.message}`, 'danger');
        return null;
    }
}

// Add this function to remove alerts by ID
function removeAlert(id) {
    if (!id) return;
    
    const alert = document.getElementById(id);
    if (alert) {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }
}

// Export functions to be used in main.js
window.aiFeatures = {
    generateSummary,
    generateQuiz,
    generateMindMap,
    renderQuiz,
    renderMindMap,
    textToSpeech,
    processHandwriting,
    testAIService,
    showAlert
};

// Log when the AI features module is loaded
console.log('AI Features module loaded successfully');