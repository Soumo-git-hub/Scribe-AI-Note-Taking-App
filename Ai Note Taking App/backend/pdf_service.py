from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
from fpdf import FPDF
import base64
import tempfile
from io import BytesIO

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/generate-pdf', methods=['POST'])
def generate_pdf():
    try:
        data = request.json
        
        # Extract data from request
        note = data.get('note', {})
        summary = data.get('summary', '')
        quiz = data.get('quiz', [])
        mindmap_base64 = data.get('mindmap', '')
        
        # Create a temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        temp_filename = temp_file.name
        temp_file.close()
        
        # Create PDF using FPDF
        pdf = FPDF()
        pdf.add_page()
        
        # Set up fonts
        pdf.set_font("Arial", "B", 16)
        
        # Title
        title = note.get('title', 'Untitled Note')
        pdf.cell(0, 10, title, 0, 1, 'C')
        pdf.ln(5)
        
        # Note content
        pdf.set_font("Arial", "B", 12)
        pdf.cell(0, 10, "Note Content:", 0, 1)
        pdf.set_font("Arial", "", 10)
        
        # Handle multiline content
        content = note.get('content', '')
        pdf.multi_cell(0, 10, content)
        pdf.ln(10)
        
        # Summary
        if summary:
            pdf.set_font("Arial", "B", 12)
            pdf.cell(0, 10, "Summary:", 0, 1)
            pdf.set_font("Arial", "", 10)
            pdf.multi_cell(0, 10, summary)
            pdf.ln(10)
        
        # Quiz
        if quiz:
            pdf.set_font("Arial", "B", 12)
            pdf.cell(0, 10, "Quiz Questions:", 0, 1)
            
            for i, question in enumerate(quiz):
                # Add a new page if we're running out of space
                if pdf.get_y() > 250:
                    pdf.add_page()
                
                pdf.set_font("Arial", "B", 10)
                q_text = f"Q{i+1}: {question.get('question', '')}"
                pdf.multi_cell(0, 10, q_text)
                
                # Options
                pdf.set_font("Arial", "", 10)
                options = question.get('options', [])
                for j, option in enumerate(options):
                    opt_text = f"{chr(65 + j)}. {option}"
                    pdf.multi_cell(0, 10, opt_text, 0, 'L')
                
                # Answer
                pdf.set_font("Arial", "I", 10)
                answer_text = f"Answer: {question.get('answer', '')}"
                pdf.multi_cell(0, 10, answer_text)
                pdf.ln(5)
        
        # Mindmap
        if mindmap_base64:
            # Add a new page for the mindmap
            pdf.add_page()
            pdf.set_font("Arial", "B", 12)
            pdf.cell(0, 10, "Mind Map:", 0, 1)
            
            # Remove the data URL prefix if present
            if ',' in mindmap_base64:
                mindmap_base64 = mindmap_base64.split(',')[1]
            
            # Save base64 to a temporary image file
            image_data = base64.b64decode(mindmap_base64)
            img_temp = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
            img_temp_filename = img_temp.name
            img_temp.close()
            
            with open(img_temp_filename, 'wb') as f:
                f.write(image_data)
            
            # Add the image to the PDF
            pdf.image(img_temp_filename, x=10, y=pdf.get_y(), w=190)
            
            # Clean up the temporary image file
            os.unlink(img_temp_filename)
        
        # Save the PDF
        pdf.output(temp_filename)
        
        # Return the PDF file - Updated for Flask 3.x compatibility
        return send_file(
            temp_filename,
            download_name=f"{note.get('title', 'note')}.pdf",
            mimetype='application/pdf',
            as_attachment=True
        )
    
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        return jsonify({'error': str(e)}), 500
    
    finally:
        # Clean up the temporary file
        if 'temp_filename' in locals() and os.path.exists(temp_filename):
            os.unlink(temp_filename)

if __name__ == '__main__':
    app.run(debug=True, port=5000)