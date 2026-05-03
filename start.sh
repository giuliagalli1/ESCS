#!/bin/bash

# start.sh - Start the ESCS system
# Installs dependencies, starts backend and frontend services.

set -e

echo "Starting ESCS - Ecosocial Design Case Studies"

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Please install Homebrew first: https://brew.sh/"
    exit 1
fi

# Install Python if not present
if ! command -v python3 &> /dev/null; then
    echo "Installing Python..."
    brew install python
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    brew install node
fi

# Backend setup
echo "Setting up backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Frontend setup
echo "Setting up frontend..."
cd frontend
npm install
cd ..

# Start backend
echo "Starting backend on http://localhost:8000"
cd backend
PYTHONPATH=/Users/giuliagalli/Desktop/ESCS/backend /Users/giuliagalli/Desktop/ESCS/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Start frontend
echo "Starting frontend on http://localhost:3000"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Save PIDs for stopping
echo $BACKEND_PID > .backend_pid
echo $FRONTEND_PID > .frontend_pid

echo "ESCS is running!"
echo "Frontend: http://localhost:3000"
echo "Backend API: http://localhost:8000"
echo "Press Ctrl+C to stop"

# Wait for processes
wait