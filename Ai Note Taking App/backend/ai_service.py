import os
import json
import io
import logging
from PIL import Image
import pytesseract
from transformers import pipeline, AutoModelForSeq2SeqLM, AutoTokenizer
from collections import Counter
from typing import List, Dict

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load models once at module level for efficiency
try:
    # Initialize summarization model
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    
    # Initialize tokenizer and model for quiz generation
    tokenizer = AutoTokenizer.from_pretrained("t5-small")
    quiz_model = AutoModelForSeq2SeqLM.from_pretrained("t5-small")
except Exception as e:
    logger.warning(f"Could not load AI models: {e}")
    # Provide fallback options
    summarizer = None
    tokenizer = None
    quiz_model = None

def summarize_text(text: str, max_length: int = 150) -> str:
    """Generate a concise summary of the provided text."""
    if not summarizer or len(text) < 50:
        return text[:100] + "..." if len(text) > 100 else text
        
    try:
        summary = summarizer(text, 
                           max_length=max_length, 
                           min_length=30, 
                           do_sample=False)
        return summary[0]['summary_text']
    except Exception as e:
        logger.error(f"Error in summarization: {e}")
        return text[:100] + "..." if len(text) > 100 else text

def generate_quiz(text: str, num_questions: int = 5) -> str:
    """Generate quiz questions from the provided text."""
    if not quiz_model or not tokenizer:
        return json.dumps({
            "mcq": [{"question": "Sample question?", 
                     "options": ["A", "B", "C", "D"], 
                     "answer": "A"}],
            "true_false": [{"question": "Sample true/false", "answer": True}],
            "fill_blank": [{"question": "Sample ___ question", "answer": "fill-in"}]
        })
    
    try:
        # Extract key sentences for question generation
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 10]
        selected = sentences[:min(num_questions*2, len(sentences))]
        
        # Generate MCQs
        mcq: List[Dict] = []
        true_false: List[Dict] = []
        fill_blank: List[Dict] = []
        
        for i, sentence in enumerate(selected):
            if i % 3 == 0 and len(mcq) < num_questions // 3:
                # Generate MCQ
                input_text = f"generate multiple choice question: {sentence}"
                inputs = tokenizer(input_text, return_tensors="pt", max_length=512, truncation=True)
                outputs = quiz_model.generate(**inputs, max_length=150)
                question = tokenizer.decode(outputs[0], skip_special_tokens=True)
                
                # Simple parsing of generated question
                parts = question.split("?")
                q = parts[0] + "?"
                options = ["Option A", "Option B", "Option C", "Option D"]
                
                mcq.append({
                    "question": q,
                    "options": options,
                    "answer": "Option A"  # In real implementation, determine correct answer
                })
            
            elif i % 3 == 1 and len(true_false) < num_questions // 3:
                # Generate true/false
                true_false.append({
                    "question": sentence,
                    "answer": bool(i % 2)  # Alternate true/false
                })
            
            elif len(fill_blank) < num_questions // 3:
                # Generate fill-in-the-blank
                words = sentence.split()
                if len(words) > 4:
                    blank_idx = len(words) // 2
                    answer = words[blank_idx]
                    words[blank_idx] = "___"
                    fill_blank.append({
                        "question": " ".join(words),
                        "answer": answer
                    })
        
        return json.dumps({
            "mcq": mcq, 
            "true_false": true_false, 
            "fill_blank": fill_blank
        })
        
    except Exception as e:
        logger.error(f"Error in quiz generation: {e}")
        return json.dumps({
            "mcq": [{"question": "Error generating quiz", 
                    "options": ["A", "B", "C", "D"], 
                    "answer": "A"}],
            "true_false": [],
            "fill_blank": []
        })

def convert_handwriting(image_bytes: bytes) -> str:
    """Convert handwritten image to text using OCR."""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        text = pytesseract.image_to_string(image)
        return text
    except Exception as e:
        logger.error(f"Error in handwriting conversion: {e}")
        return "Error processing handwriting. Please try a clearer image."

def create_mind_map(text: str) -> str:
    """Generate a simple mind map representation from text."""
    try:
        # Simple keyword extraction
        words = text.lower().split()
        stopwords = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by'}
        keywords = [w for w in words if len(w) > 3 and w not in stopwords]
        
        # Count keyword frequency
        word_count = Counter(keywords)
        top_words = word_count.most_common(10)
        
        # Create simple mind map structure
        central_topic = "Main Topic"
        
        # If we have enough words, use the most common as the central topic
        if top_words and len(top_words) > 0:
            central_topic = top_words[0][0].capitalize()
        
        branches = []
        for word, count in top_words[1:7]:  # Use the next 6 most common words as branches
            # Find sentences containing this keyword
            sentence_with_word = next((s for s in text.split('.') if word in s.lower()), "")
            related = [w for w in sentence_with_word.split() 
                      if len(w) > 3 and w.lower() != word and w.lower() not in stopwords][:3]
            
            branches.append({
                "topic": word.capitalize(),
                "subtopics": [r.capitalize() for r in related]
            })
        
        mindmap = {
            "central": central_topic,
            "branches": branches
        }
        
        return json.dumps(mindmap)
    except Exception as e:
        logger.error(f"Error in mind map generation: {e}")
        return json.dumps({
            "central": "Main Topic",
            "branches": [{"topic": "Subtopic", "subtopics": ["Detail 1", "Detail 2"]}]
        })

# AI processing services