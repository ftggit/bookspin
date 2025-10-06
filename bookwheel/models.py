from __future__ import annotations

from sqlalchemy import Column, Enum, Integer, String, Text, UniqueConstraint

from .db import Base


class BookSource:
    MANUAL = "manual"
    GOODREADS = "goodreads"


class AppSetting(Base):
    __tablename__ = "app_settings"

    key = Column(String(50), primary_key=True)
    value = Column(Text, nullable=False)


class Book(Base):
    __tablename__ = "books"
    __table_args__ = (UniqueConstraint("goodreads_id", name="uq_books_goodreads_id"),)

    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    author = Column(String(255))
    goodreads_id = Column(String(64))
    goodreads_url = Column(String(255))
    image_url = Column(String(255))
    source = Column(
        Enum(BookSource.MANUAL, BookSource.GOODREADS, name="book_source"),
        nullable=False,
        default=BookSource.MANUAL,
    )
    shelf_url = Column(Text)
