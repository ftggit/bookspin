from __future__ import annotations

from bookwheel.config import load_config
from bookwheel.db import Base, init_engine
from bookwheel import models  # noqa: F401 - ensure models are registered


def main() -> None:
    config = load_config()
    engine = init_engine(config.database_url)
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")


if __name__ == "__main__":
    main()
