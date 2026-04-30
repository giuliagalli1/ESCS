# schemas.py - Pydantic schemas for API
# Defines request/response models for API endpoints.

from pydantic import BaseModel
from typing import List, Optional

class UserBase(BaseModel):
    email: str
    is_teacher: bool = False

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int

    class Config:
        from_attributes = True

class KeywordBase(BaseModel):
    name: str

class Keyword(KeywordBase):
    id: int

    class Config:
        from_attributes = True

class AgentBase(BaseModel):
    name: str

class Agent(AgentBase):
    id: int

    class Config:
        from_attributes = True

class OrganizationBase(BaseModel):
    name: str

class Organization(OrganizationBase):
    id: int

    class Config:
        from_attributes = True

class CaseBase(BaseModel):
    type: str  # 'project' or 'organization'
    name: str
    description: str
    link: Optional[str] = None
    location: Optional[str] = None

class CaseCreate(CaseBase):
    keywords: List[str]
    agents: List[str]
    organizations: List[str]

class Case(CaseBase):
    id: int
    image_path: Optional[str] = None
    keywords: List[Keyword] = []
    agents: List[Agent] = []
    organizations: List[Organization] = []

    class Config:
        from_attributes = True

class CollectionBase(BaseModel):
    name: str

class Collection(CollectionBase):
    id: int
    cases: List[Case] = []

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: str
    password: str