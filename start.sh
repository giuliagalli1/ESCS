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

# ── Start backend (binds to 127.0.0.1, nginx proxies from outside) ────────────
echo "Starting backend..."
cd "$SCRIPT_DIR/backend"
PYTHONPATH="$SCRIPT_DIR/backend" \
    "$SCRIPT_DIR/backend/venv/bin/uvicorn" main:app \
    --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

# ── Start frontend (binds to 127.0.0.1, nginx proxies from outside) ───────────
echo "Starting frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev -- --host 127.0.0.1 --port 3000 &
FRONTEND_PID=$!

cd "$SCRIPT_DIR"
echo $BACKEND_PID > .backend_pid
echo $FRONTEND_PID > .frontend_pid

echo ""
echo "ESCS is running!"
echo "  Frontend:    https://terrarium.edt.bz/"
echo "  Backend API: https://backend.terrarium.edt.bz/"
echo "  (locally:    http://127.0.0.1:3000 / :8000)"
echo ""
echo "Press Ctrl+C to stop"

trap 'echo "Stopping..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM
wait
