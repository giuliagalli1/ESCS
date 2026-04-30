# main.py - Main FastAPI application
# This is the entry point for the backend server.
# It defines API endpoints for user auth, case management, and collections.
# See ARCHITECTURE.md for how this fits into the system.

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import database, models, schemas, auth, crud
from typing import List, Optional
import os
import shutil

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Auth endpoints
@app.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        return crud.create_user(db, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/login")
def login(request: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, request.email, request.password)
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    # For simplicity, return user id; in real app, use sessions or JWT
    return {"user_id": user.id, "email": user.email}

# Case endpoints
@app.get("/cases", response_model=List[schemas.Case])
def read_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cases = crud.get_cases(db, skip=skip, limit=limit)
    return cases

@app.post("/cases", response_model=schemas.Case)
def create_case(
    type: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    link: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    keywords: str = Form(...),  # Comma-separated
    agents: str = Form(...),
    organizations: str = Form(...),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Check if case exists
    existing = crud.get_case_by_name(db, name)
    if existing:
        raise HTTPException(status_code=400, detail="Case with this name exists. Please modify or choose different name.")

    # Parse lists
    kw_list = [k.strip() for k in keywords.split(',') if k.strip()]
    ag_list = [a.strip() for a in agents.split(',') if a.strip()]
    org_list = [o.strip() for o in organizations.split(',') if o.strip()]

    case_data = schemas.CaseCreate(
        type=type,
        name=name,
        description=description,
        link=link,
        location=location,
        keywords=kw_list,
        agents=ag_list,
        organizations=org_list
    )

    image_path = None
    if image:
        os.makedirs("uploads", exist_ok=True)
        image_path = f"uploads/{image.filename}"
        with open(image_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    return crud.create_case(db, case_data, image_path)

# Collections
@app.get("/collections/{user_id}", response_model=List[schemas.Collection])
def read_collections(user_id: int, db: Session = Depends(get_db)):
    return crud.get_user_collections(db, user_id)

@app.post("/collections")
def create_collection(user_id: int, name: str, db: Session = Depends(get_db)):
    return crud.create_collection(db, user_id, name)

@app.post("/collections/{collection_id}/cases/{case_id}")
def add_to_collection(collection_id: int, case_id: int, db: Session = Depends(get_db)):
    return crud.add_case_to_collection(db, collection_id, case_id)