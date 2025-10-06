from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(slots=True)
class Config:
    secret_key: str = os.getenv("SECRET_KEY", "change-me")
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://postgres:postgres@localhost:5432/bookwheel",
    )
    goodreads_max_pages: int = int(os.getenv("GOODREADS_MAX_PAGES", "10"))
    timeout_seconds: float = float(os.getenv("HTTP_TIMEOUT_SECONDS", "20"))


def load_config() -> Config:
    return Config()
