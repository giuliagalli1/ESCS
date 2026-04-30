# Decisions Made During Implementation

## 1. Frontend Framework
**Unclear/Missing**: The specification describes a web interface with multiple views (homepage, sign-in, upload forms) but does not specify the technology.

**Decision**: Use Next.js with Tailwind CSS and shadcn/ui components. This provides client-side routing, reusable components for forms and buttons, and a modern UI that matches the guided, step-by-step user experience described.

**Alternatives**: Vanilla HTML/CSS/JS (simpler but harder for multiple views), React without Next.js (not preferred per guidelines).

**Changeable**: Yes, can switch to vanilla if needed, but would require rewriting the UI logic.

## 2. Backend Framework
**Unclear/Missing**: Specification requires backend logic for authentication and database interactions but does not specify technology.

**Decision**: Use FastAPI (Python) as preferred for backends.

**Alternatives**: Flask (also Python, but FastAPI is more modern for APIs).

**Changeable**: Yes, but FastAPI fits well.

## 3. Database
**Unclear/Missing**: Need to store users, cases, keywords, etc., relationally.

**Decision**: SQLite, as it's local, simple, and no shared access needed.

**Alternatives**: PostgreSQL (overkill for local), but SQLite is fine.

**Changeable**: Yes, can migrate later.

## 4. UNIBZ Email Check
**Unclear/Missing**: How to verify UNIBZ student/teacher account.

**Decision**: Check if email ends with '@unibz.it'. Simple regex check.

**Alternatives**: External API (but no local alternative, and guidelines prefer local).

**Changeable**: Yes, can add more validation.

## 5. Image Storage
**Unclear/Missing**: How to store uploaded images.

**Decision**: Save as files in 'uploads' folder, store path in DB.

**Alternatives**: Store as BLOB in DB (but files are simpler for serving).

**Changeable**: Yes.

## 6. Locations
**Unclear/Missing**: "checks a map/location database" – no details.

**Decision**: Simple text input, no external map service. Store as text in DB.

**Alternatives**: Integrate with local map DB, but keep minimal.

**Changeable**: Yes, can add later.

## 7. Authentication Mechanism
**Unclear/Missing**: How to handle sessions.

**Decision**: Use session-based auth with cookies in FastAPI.

**Alternatives**: JWT tokens.

**Changeable**: Yes.

## 8. Duplicate Checking
**Unclear/Missing**: How to check for similar cases.

**Decision**: Exact name match. If exists, show and ask to modify or create new.

**Alternatives**: Fuzzy matching, but exact is simple.

**Changeable**: Yes.

## 9. User Registration
**Unclear/Missing**: Specification mentions sign-in but not how accounts are created.

**Decision**: Add a registration page for UNIBZ emails to make the system buildable.

**Alternatives**: Pre-populate users, but registration allows testing.

**Changeable**: Yes.