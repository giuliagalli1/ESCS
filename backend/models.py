# models.py - Database models
# Defines the SQLAlchemy models for users, cases, keywords, etc.
# Each model represents a table in the relational database.

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, Table
from sqlalchemy.orm import relationship
from database import Base

# Association tables for many-to-many relationships
case_keywords = Table('case_keywords', Base.metadata,
    Column('case_id', Integer, ForeignKey('cases.id')),
    Column('keyword_id', Integer, ForeignKey('keywords.id'))
)

case_agents = Table('case_agents', Base.metadata,
    Column('case_id', Integer, ForeignKey('cases.id')),
    Column('agent_id', Integer, ForeignKey('agents.id'))
)

case_organizations = Table('case_organizations', Base.metadata,
    Column('case_id', Integer, ForeignKey('cases.id')),
    Column('organization_id', Integer, ForeignKey('organizations.id'))
)

# Association for collections and cases
collection_cases = Table('collection_cases', Base.metadata,
    Column('collection_id', Integer, ForeignKey('collections.id')),
    Column('case_id', Integer, ForeignKey('cases.id'))
)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_teacher = Column(Boolean, default=False)  # Assuming based on email or input

    collections = relationship("Collection", back_populates="user")

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)  # 'project' or 'organization'
    name = Column(String, index=True)
    description = Column(Text)
    image_path = Column(String, nullable=True)
    link = Column(String, nullable=True)
    location = Column(String, nullable=True)  # Simple text

    keywords = relationship("Keyword", secondary=case_keywords)
    agents = relationship("Agent", secondary=case_agents)
    organizations = relationship("Organization", secondary=case_organizations)

class Keyword(Base):
    __tablename__ = "keywords"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    cases = relationship("Case", secondary=case_keywords)

class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    cases = relationship("Case", secondary=case_agents)

class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    cases = relationship("Case", secondary=case_organizations)

class Collection(Base):
    __tablename__ = "collections"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)

    user = relationship("User", back_populates="collections")
    cases = relationship("Case", secondary=collection_cases)