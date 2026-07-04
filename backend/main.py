# main.py - Main FastAPI application
# This is the entry point for the backend server.
# It defines API endpoints for user auth, case management, and collections.
# See ARCHITECTURE.md for how this fits into the system.

import json
from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import database, models, schemas, auth, crud
from typing import List, Optional
import os
import shutil
from datetime import timedelta

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# Mount static files for uploads
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Allow CORS for frontend.
# Origins are configurable via the CORS_ORIGINS env var (comma-separated,
# set by start.sh); the local dev server is always allowed as a fallback.
_default_origins = ["http://localhost:3000", "https://terrarium.edt.bz"]
_env_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
allow_origins = list(dict.fromkeys(_default_origins + _env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    token = credentials.credentials
    email = auth.verify_token(token)
    if email is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = crud.get_user_by_email(db, email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

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
    access_token = auth.create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES))
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id, "email": user.email}

# Case endpoints
@app.get("/cases", response_model=List[schemas.Case])
def read_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cases = crud.get_cases(db, skip=skip, limit=limit)
    return cases

@app.get("/cases/{case_id}", response_model=schemas.Case)
def read_case(case_id: int, db: Session = Depends(get_db)):
    case = crud.get_case(db, case_id)
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

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
    current_user: models.User = Depends(get_current_user),
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

    image_path = None
    if image:
        os.makedirs(uploads_dir, exist_ok=True)
        image_path = image.filename
        with open(os.path.join(uploads_dir, image.filename), "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    location_data = None
    if location:
        try:
            location_data = json.loads(location)
        except json.JSONDecodeError:
            location_data = {"display_name": location}

    case_data = schemas.CaseCreate(
        type=type,
        name=name,
        description=description,
        link=link,
        location=location_data,
        keywords=kw_list,
        agents=ag_list,
        organizations=org_list
    )

    return crud.create_case(db, case_data, current_user.id, image_path)

@app.put("/cases/{case_id}", response_model=schemas.Case)
def update_case(
    case_id: int,
    type: str = Form(...),
    name: str = Form(...),
    description: str = Form(...),
    link: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    keywords: str = Form(...),
    agents: str = Form(...),
    organizations: str = Form(...),
    image: Optional[UploadFile] = File(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_case = crud.get_case(db, case_id)
    if db_case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if db_case.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this case")

    kw_list = [k.strip() for k in keywords.split(',') if k.strip()]
    ag_list = [a.strip() for a in agents.split(',') if a.strip()]
    org_list = [o.strip() for o in organizations.split(',') if o.strip()]

    image_path = None
    if image:
        os.makedirs(uploads_dir, exist_ok=True)
        image_path = image.filename
        with open(os.path.join(uploads_dir, image.filename), "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

    location_data = None
    if location:
        try:
            location_data = json.loads(location)
        except json.JSONDecodeError:
            location_data = {"display_name": location}

    case_data = schemas.CaseCreate(
        type=type,
        name=name,
        description=description,
        link=link,
        location=location_data,
        keywords=kw_list,
        agents=ag_list,
        organizations=org_list
    )

    return crud.update_case(db, db_case, case_data, image_path)

@app.delete("/cases/{case_id}")
def delete_case(case_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_case = crud.get_case(db, case_id)
    if db_case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    if db_case.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this case")
    crud.delete_case(db, db_case)
    return {"detail": "Case deleted"}

# Collections
@app.get("/collections", response_model=List[schemas.Collection])
def read_collections(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.get_user_collections(db, current_user.id)

@app.post("/collections", response_model=schemas.Collection)
def create_collection(name: str, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return crud.create_collection(db, current_user.id, name)

@app.post("/collections/{collection_id}/cases/{case_id}", response_model=schemas.Collection)
def add_to_collection(collection_id: int, case_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if collection belongs to user
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id, models.Collection.user_id == current_user.id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return crud.add_case_to_collection(db, collection_id, case_id)

@app.put("/collections/{collection_id}", response_model=schemas.Collection)
def update_collection_route(collection_id: int, collection_update: schemas.CollectionBase, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id, models.Collection.user_id == current_user.id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return crud.update_collection(db, collection, collection_update.name)

@app.delete("/collections/{collection_id}")
def delete_collection_route(collection_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id, models.Collection.user_id == current_user.id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    crud.delete_collection(db, collection)
    return {"detail": "Collection deleted"}

@app.delete("/collections/{collection_id}/cases/{case_id}")
def remove_from_collection(collection_id: int, case_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if collection belongs to user
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id, models.Collection.user_id == current_user.id).first()
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Remove the case from the collection
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    if case in collection.cases:
        collection.cases.remove(case)
        db.commit()
    
    return {"detail": "Case removed from collection"}

@app.put("/user/change-password")
def change_password(request: schemas.ChangePasswordRequest, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(request.old_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect current password")
    current_user.hashed_password = auth.get_password_hash(request.new_password)
    db.commit()
    return {"detail": "Password updated successfully"}

@app.delete("/user")
def delete_user_account(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Preserve user-uploaded case studies by clearing ownership first.
    user_cases = db.query(models.Case).filter(models.Case.user_id == current_user.id).all()
    for db_case in user_cases:
        db_case.user_id = None

    user_collections = db.query(models.Collection).filter(models.Collection.user_id == current_user.id).all()
    for collection in user_collections:
        collection.cases = []
        db.delete(collection)

    db.delete(current_user)
    db.commit()
    return {"detail": "User account deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
