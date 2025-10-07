from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Iterator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

load_dotenv()

Base = declarative_base()
_engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def init_engine(database_url: str | None = None) -> Engine:
    """Initialise the SQLAlchemy engine lazily."""
    global _engine, SessionLocal

    if _engine is not None:
        return _engine

    resolved_url = database_url or os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/bookwheel",
    )
    engine_kwargs = {"future": True, "pool_pre_ping": True}
    if resolved_url.startswith("sqlite"):
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    _engine = create_engine(resolved_url, **engine_kwargs)
    SessionLocal = sessionmaker(
        bind=_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    return _engine


@contextmanager
def get_session() -> Iterator[Session]:
    if SessionLocal is None:
        init_engine()

    assert SessionLocal is not None  # for type checkers
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
