from sqlalchemy import Column, String, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped
from sqlalchemy.sql import func
from database import Base
import uuid


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str | None] = Column(String, nullable=True)
    status: Mapped[str] = Column(String, default="pending")
    filename: Mapped[str] = Column(String, nullable=False)
    file_path: Mapped[str] = Column(String, nullable=False)
    error_msg: Mapped[str | None] = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Result(Base):
    __tablename__ = "results"

    id: Mapped[str] = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = Column(String, nullable=False)
    transcript: Mapped[str] = Column(Text, nullable=False)
    overview: Mapped[str] = Column(Text, nullable=False)
    key_points: Mapped[str] = Column(Text, nullable=False)
    decisions: Mapped[str] = Column(Text, nullable=False)
    open_questions: Mapped[str] = Column(Text, nullable=False)
    action_items: Mapped[str] = Column(Text, nullable=False)
    risks: Mapped[str] = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TaskStatus(Base):
    __tablename__ = "task_statuses"
    id: Mapped[str] = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = Column(String, nullable=False)
    task_index = Column(String, nullable=False)       # ✅ removed Mapped[int] — stored as string
    checked = Column(Boolean, default=False)           # ✅ Boolean not String
    completed_at = Column(DateTime(timezone=True), nullable=True)