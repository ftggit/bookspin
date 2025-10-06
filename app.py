from __future__ import annotations

import logging

from flask import Flask, jsonify, render_template, request

from bookwheel.config import load_config
from bookwheel.db import get_session, init_engine
from bookwheel.models import AppSetting, Book, BookSource
from bookwheel.scraper import GoodreadsScrapeError, scrape_shelf

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app() -> Flask:
    app = Flask(__name__)
    config = load_config()
    init_engine(config.database_url)

    app.config["BOOKWHEEL_CONFIG"] = config
    app.secret_key = config.secret_key

    @app.get("/")
    def index() -> str:
        with get_session() as session:
            shelf_url = _get_setting(session, "shelf_url")
        return render_template("index.html", shelf_url=shelf_url)

    @app.get("/api/books")
    def list_books():
        with get_session() as session:
            books = session.query(Book).order_by(Book.title.asc()).all()
            payload = [
                {
                    "id": book.id,
                    "title": book.title,
                    "author": book.author,
                    "source": book.source,
                    "goodreads_url": book.goodreads_url,
                    "image_url": book.image_url,
                }
                for book in books
            ]
        return jsonify(payload)

    @app.post("/books")
    def add_book():
        payload = request.get_json(silent=True) or request.form
        title = (payload.get("title") or "").strip()
        author = (payload.get("author") or "").strip() or None

        if not title:
            return jsonify({"error": "Title is required"}), 400

        with get_session() as session:
            book = Book(title=title, author=author, source=BookSource.MANUAL)
            session.add(book)
            session.flush()
            created = {
                "id": book.id,
                "title": book.title,
                "author": book.author,
                "source": book.source,
            }
        return jsonify(created), 201

    @app.delete("/books/<int:book_id>")
    def delete_book(book_id: int):
        with get_session() as session:
            book = session.get(Book, book_id)
            if not book:
                return jsonify({"error": "Book not found"}), 404
            session.delete(book)
        return ("", 204)

    @app.post("/sync")
    def sync_shelf():
        payload = request.get_json(silent=True) or request.form
        shelf_url = (payload.get("shelf_url") or "").strip()
        if not shelf_url:
            return jsonify({"error": "Shelf URL is required"}), 400

        app_config = app.config["BOOKWHEEL_CONFIG"]

        try:
            scraped_books = scrape_shelf(
                shelf_url,
                max_pages=app_config.goodreads_max_pages,
                timeout=app_config.timeout_seconds,
            )
        except GoodreadsScrapeError as exc:  # pragma: no cover - network runtime
            logger.exception("Goodreads scrape failed: %s", exc)
            return jsonify({"error": str(exc)}), 502

        with get_session() as session:
            _set_setting(session, "shelf_url", shelf_url)
            session.query(Book).filter(Book.source == BookSource.GOODREADS).delete()

            created = 0
            for scraped in scraped_books:
                book = Book(
                    title=scraped.title,
                    author=scraped.author,
                    goodreads_id=scraped.goodreads_id,
                    goodreads_url=scraped.goodreads_url,
                    image_url=scraped.image_url,
                    source=BookSource.GOODREADS,
                    shelf_url=shelf_url,
                )
                session.add(book)
                created += 1

        return jsonify({"imported": created})

    return app


def _get_setting(session, key: str) -> str | None:
    setting = session.get(AppSetting, key)
    return setting.value if setting else None


def _set_setting(session, key: str, value: str) -> None:
    setting = session.get(AppSetting, key)
    if setting:
        setting.value = value
    else:
        session.add(AppSetting(key=key, value=value))


app = create_app()


if __name__ == "__main__":
    app.run(debug=True)
