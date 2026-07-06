# ESCS - Ecosocial Design Case Studies

A digital platform for students and teachers from the Ecosocial Design course at the Free University of Bolzano to upload, explore, save, and modify case studies related to ecosocial design practices.

## What it does

ESCS provides a shared archive where users can:
- Sign in with UNIBZ email accounts
- Upload case studies (projects or organizations) with details like keywords, agents, organizations, images, links, and locations
- Browse existing case studies
- Save cases to personal collections
- Avoid duplicates by checking for similar existing cases

## Prerequisites

- macOS
- Homebrew (https://brew.sh/)
- Python 3 (installed via Homebrew if needed)
- Node.js (installed via Homebrew if needed)

## How to start

1. Clone or download this repository
2. Run `./start../stop.sh` in the project root
3. Open http://localhost:3000 in your browser

The script will:
- Install required dependencies (Python, Node.js)
- Set up virtual environments
- Start the backend API on port 8000
- Start the frontend on port 3000

## How to stop

Run `./stop.sh` in the project root.

## Project Structure

- `ARCHITECTURE.md` - Tech stack diagram and component details
- `DECISIONS.md` - Implementation decisions and rationale
- `backend/` - FastAPI backend with SQLite database
- `frontend/` - Next.js frontend with Tailwind CSS
- `start.sh` - Startup script
- `stop.sh` - Shutdown script

## Development

- Backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload`
- Frontend: `cd frontend && npm run dev`

See ARCHITECTURE.md and DECISIONS.md for technical details.