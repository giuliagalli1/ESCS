# ESCS Architecture

## Tech Stack Diagram

```
┌─────────────────┐     HTTP/JSON     ┌─────────────────┐     SQL      ┌──────────┐
│    Frontend     │ ─────────────────► │    Backend      │ ───────────► │ Database │
│   (Next.js)     │ ◄───────────────── │   (FastAPI)     │ ◄─────────── │ (SQLite) │
└─────────────────┘                   └─────────────────┘             └──────────┘
```

## Explanation

The stack was chosen based on the specification's requirements for a web platform with user authentication, data upload, and relational database interactions.

- **Frontend**: Next.js with Tailwind CSS and shadcn/ui components. The specification implies a richer interactive interface with multiple views (homepage, sign-in portal, upload forms, user account), client-side routing, and reusable components like forms and buttons. This decision was made by the builder as the specification describes guided step-by-step forms and user interactions that benefit from a component-based framework.

- **Backend**: FastAPI (Python). Preferred for Python backends as per guidelines. Handles API endpoints for authentication, case uploads, and database queries.

- **Database**: SQLite. Chosen because it's simple, self-contained, and suitable for a local single-service system without needing shared access.

All components run locally on macOS.

## Component Runtime Details

- **Frontend (Next.js)**: local/python - runs as a Node.js process via npm/yarn.
- **Backend (FastAPI)**: local/python - runs as a Python process via uvicorn.
- **Database (SQLite)**: local/python - embedded in Python via sqlite3.

No external components are used.