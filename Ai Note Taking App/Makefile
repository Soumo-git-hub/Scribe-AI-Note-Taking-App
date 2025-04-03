.PHONY: setup backend frontend clean lint test help

# Default target
help:
	@echo "Available commands:"
	@echo "  make setup     - Install dependencies"
	@echo "  make backend   - Start the backend server"
	@echo "  make frontend  - Open the frontend in a browser"
	@echo "  make clean     - Clean temporary files"
	@echo "  make lint      - Run linting"
	@echo "  make test      - Run tests"

# Setup dependencies
setup:
	@echo "Setting up the project..."
	cd backend && pip install -r requirements.txt
	@echo "Setup complete!"

# Start the backend server
backend:
	@echo "Starting backend server..."
	cd backend && python app.py

# Open the frontend
frontend:
	@echo "Opening frontend..."
	cd frontend && start index.html

# Clean temporary files
clean:
	@echo "Cleaning temporary files..."
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".DS_Store" -delete
	find backend/temp -type f -not -name ".gitkeep" -delete
	@echo "Cleaning complete!"

# Run linting
lint:
	@echo "Running linting..."
	cd backend && python -m flake8 --count --select=E9,F63,F7,F82 --show-source --statistics .
	@echo "Linting complete!"

# Run tests
test:
	@echo "Running tests..."
	cd backend && python -m pytest -xvs
	@echo "Tests complete!" 