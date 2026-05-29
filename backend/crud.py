# crud.py - CRUD operations
# Functions to create, read, update, delete database records.

from sqlalchemy.orm import Session
from . import models, schemas, auth
from typing import List

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    if not auth.is_unibz_email(user.email):
        raise ValueError("Only UNIBZ emails allowed")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(email=user.email, hashed_password=hashed_password, is_teacher=user.is_teacher)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_cases(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Case).offset(skip).limit(limit).all()

def get_case_by_name(db: Session, name: str):
    return db.query(models.Case).filter(models.Case.name == name).first()

def get_case(db: Session, case_id: int):
    return db.query(models.Case).filter(models.Case.id == case_id).first()

def create_case(db: Session, case: schemas.CaseCreate, user_id: int = None, image_path: str = None):
    # Get or create keywords, agents, orgs
    keywords = []
    for kw_name in case.keywords:
        kw = db.query(models.Keyword).filter(models.Keyword.name == kw_name).first()
        if not kw:
            kw = models.Keyword(name=kw_name)
            db.add(kw)
            db.commit()
            db.refresh(kw)
        keywords.append(kw)

    agents = []
    for ag_name in case.agents:
        ag = db.query(models.Agent).filter(models.Agent.name == ag_name).first()
        if not ag:
            ag = models.Agent(name=ag_name)
            db.add(ag)
            db.commit()
            db.refresh(ag)
        agents.append(ag)

    organizations = []
    for org_name in case.organizations:
        org = db.query(models.Organization).filter(models.Organization.name == org_name).first()
        if not org:
            org = models.Organization(name=org_name)
            db.add(org)
            db.commit()
            db.refresh(org)
        organizations.append(org)

    db_case = models.Case(
        type=case.type,
        name=case.name,
        description=case.description,
        link=case.link,
        location=case.location,
        image_path=image_path,
        user_id=user_id,
        keywords=keywords,
        agents=agents,
        organizations=organizations
    )
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

def update_case(db: Session, db_case: models.Case, case: schemas.CaseCreate, image_path: str = None):
    db_case.type = case.type
    db_case.name = case.name
    db_case.description = case.description
    db_case.link = case.link
    db_case.location = case.location
    if image_path is not None:
        db_case.image_path = image_path

    db_case.keywords.clear()
    for kw_name in case.keywords:
        kw = db.query(models.Keyword).filter(models.Keyword.name == kw_name).first()
        if not kw:
            kw = models.Keyword(name=kw_name)
            db.add(kw)
            db.commit()
            db.refresh(kw)
        db_case.keywords.append(kw)

    db_case.agents.clear()
    for ag_name in case.agents:
        ag = db.query(models.Agent).filter(models.Agent.name == ag_name).first()
        if not ag:
            ag = models.Agent(name=ag_name)
            db.add(ag)
            db.commit()
            db.refresh(ag)
        db_case.agents.append(ag)

    db_case.organizations.clear()
    for org_name in case.organizations:
        org = db.query(models.Organization).filter(models.Organization.name == org_name).first()
        if not org:
            org = models.Organization(name=org_name)
            db.add(org)
            db.commit()
            db.refresh(org)
        db_case.organizations.append(org)

    db.commit()
    db.refresh(db_case)
    return db_case

def delete_case(db: Session, db_case: models.Case):
    db.delete(db_case)
    db.commit()
    return True


def get_user_collections(db: Session, user_id: int):
    return db.query(models.Collection).filter(models.Collection.user_id == user_id).all()

def create_collection(db: Session, user_id: int, name: str):
    db_collection = models.Collection(user_id=user_id, name=name)
    db.add(db_collection)
    db.commit()
    db.refresh(db_collection)
    return db_collection

def add_case_to_collection(db: Session, collection_id: int, case_id: int):
    collection = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if collection and case and case not in collection.cases:
        collection.cases.append(case)
        db.commit()
    return collection