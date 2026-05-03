#!/bin/bash

# stop.sh - Stop the ESCS system
# Kills running backend and frontend processes.

echo "Stopping ESCS..."

if [ -f .backend_pid ]; then
    BACKEND_PID=$(cat .backend_pid)
    if kill -0 $BACKEND_PID 2>/dev/null; then
        echo "Stopping backend (PID: $BACKEND_PID)"
        kill $BACKEND_PID
    fi
    rm .backend_pid
fi

if [ -f .frontend_pid ]; then
    FRONTEND_PID=$(cat .frontend_pid)
    if kill -0 $FRONTEND_PID 2>/dev/null; then
        echo "Stopping frontend (PID: $FRONTEND_PID)"
        kill $FRONTEND_PID
    fi
    rm .frontend_pid
fi

echo "ESCS stopped."