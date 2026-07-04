#!/bin/bash
# start.sh - Start the ESCS system
# Compatible with macOS and Linux (including Raspberry Pi)
set -e

echo "Starting ESCS - Ecosocial Design Case Studies"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
    Darwin*)  PLATFORM="macos" ;;
    Linux*)   PLATFORM="linux" ;;
    *)        echo "Unsupported OS: $OS"; exit 1 ;;
esac

echo "Platform: $PLATFORM ($ARCH)"

# ── Configuration ─────────────────────────────────────────────────────────────
# URLs the deployed app uses. Override by exporting these before running, e.g.:
#   BACKEND_URL=https://api.example.com FRONTEND_URL=https://app.example.com ./start.sh
#BACKEND_URL="${BACKEND_URL:-https://backend.terrarium.edt.bz}"
#FRONTEND_URL="${FRONTEND_URL:-https://terrarium.edt.bz}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

# Strip any trailing slash for consistency.
BACKEND_URL="${BACKEND_URL%/}"
FRONTEND_URL="${FRONTEND_URL%/}"

echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"

install_python() {
    if [ "$PLATFORM" = "macos" ]; then
        brew install python
    else
        sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv
    fi
}

install_node() {
    if [ "$PLATFORM" = "macos" ]; then
        brew install node
    else
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
}

if [ "$PLATFORM" = "macos" ] && ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Please install: https://brew.sh/"
    exit 1
fi

command -v python3 &> /dev/null || { echo "Installing Python..."; install_python; }
command -v node   &> /dev/null || { echo "Installing Node.js..."; install_node; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Backend ───────────────────────────────────────────────────────────────────
echo "Setting up backend..."
cd "$SCRIPT_DIR/backend"
[ ! -d "venv" ] && python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# ── Frontend ──────────────────────────────────────────────────────────────────
echo "Setting up frontend..."
cd "$SCRIPT_DIR/frontend"
npm install

# ── Start backend ─────────────────────────────────────────────────────────────
echo "Starting backend..."
cd "$SCRIPT_DIR/backend"
PYTHONPATH="$SCRIPT_DIR/backend" \
    CORS_ORIGINS="$FRONTEND_URL" \
    "$SCRIPT_DIR/backend/venv/bin/uvicorn" main:app \
    --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# ── Start frontend ────────────────────────────────────────────────────────────
echo "Starting frontend..."
cd "$SCRIPT_DIR/frontend"
NEXT_PUBLIC_API_URL="$BACKEND_URL" \
    FRONTEND_URL="$FRONTEND_URL" \
    npm run dev -- --hostname 0.0.0.0 --port 3000 &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"
echo $BACKEND_PID > .backend_pid
echo $FRONTEND_PID > .frontend_pid

echo ""
echo "ESCS is running!"
echo "  Frontend:    $FRONTEND_URL/"
echo "  Backend API: $BACKEND_URL/"
echo "  (locally:    http://0.0.0.0:3000 / :8000)"
echo ""
echo "Press Ctrl+C to stop"

trap 'echo "Stopping..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM
wait
