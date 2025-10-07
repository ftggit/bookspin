from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_SQLITE_URL = f"sqlite:///{(_BASE_DIR / 'bookwheel.db').as_posix()}"


@dataclass(slots=True)
class Config:
    secret_key: str = os.getenv("SECRET_KEY", "change-me")
    database_url: str = os.getenv(
        "DATABASE_URL",
        _DEFAULT_SQLITE_URL,
    )
    goodreads_max_pages: int = int(os.getenv("GOODREADS_MAX_PAGES", "10"))
    timeout_seconds: float = float(os.getenv("HTTP_TIMEOUT_SECONDS", "20"))


def load_config() -> Config:
    return Config()
