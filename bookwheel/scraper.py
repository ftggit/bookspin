from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

GOODREADS_BASE = "https://www.goodreads.com"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)


class GoodreadsScrapeError(RuntimeError):
    """Raised when Goodreads scraping fails."""


@dataclass
class ScrapedBook:
    title: str
    author: str | None
    goodreads_id: str | None
    goodreads_url: str | None
    image_url: str | None

    def as_dict(self) -> dict[str, str | None]:
        return {
            "title": self.title,
            "author": self.author,
            "goodreads_id": self.goodreads_id,
            "goodreads_url": self.goodreads_url,
            "image_url": self.image_url,
        }


def scrape_shelf(
    shelf_url: str,
    *,
    max_pages: int = 10,
    timeout: float = 20.0,
) -> list[ScrapedBook]:
    """Scrape a public Goodreads shelf and return the books found."""
    if not shelf_url:
        raise ValueError("shelf_url is required")

    books: list[ScrapedBook] = []
    page = 1

    with requests.Session() as session:
        session.headers.update({"User-Agent": USER_AGENT})

        while page <= max_pages:
            page_url = _build_page_url(shelf_url, page)
            try:
                response = session.get(page_url, timeout=timeout)
            except requests.RequestException as exc:  # pragma: no cover - transient
                raise GoodreadsScrapeError(
                    f"Network error while fetching Goodreads page {page_url}: {exc}"
                ) from exc

            if response.status_code >= 400:
                raise GoodreadsScrapeError(
                    f"Goodreads responded with status {response.status_code} for {page_url}"
                )

            page_books, has_next = _parse_shelf_html(response.text)
            if not page_books:
                break

            books.extend(page_books)
            if not has_next:
                break
            page += 1

    return books


def _build_page_url(base_url: str, page: int) -> str:
    if page == 1:
        return base_url

    parsed = urlparse(base_url)
    query = parse_qs(parsed.query)
    query["page"] = [str(page)]
    new_query = urlencode(query, doseq=True)
    return parsed._replace(query=new_query).geturl()


def _parse_shelf_html(html: str) -> tuple[list[ScrapedBook], bool]:
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("table.tableList tr")

    books: list[ScrapedBook] = []
    for row in rows:
        book = _parse_row(row)
        if book:
            books.append(book)

    has_next = False
    next_link = soup.select_one("a.next_page")
    if next_link and "disabled" not in next_link.get("class", []):
        has_next = True

    return books, has_next


def _parse_row(row) -> ScrapedBook | None:
    title_anchor = row.select_one("td.field.title a.bookTitle")
    if not title_anchor:
        title_anchor = row.select_one("td.field.title a")
    if not title_anchor:
        return None

    title = title_anchor.get_text(" ", strip=True)
    goodreads_path = title_anchor.get("href")
    goodreads_url = urljoin(GOODREADS_BASE, goodreads_path) if goodreads_path else None
    goodreads_id = _extract_goodreads_id(goodreads_path) if goodreads_path else None

    author_anchor = row.select_one("td.field.author a.authorName")
    if not author_anchor:
        author_anchor = row.select_one("td.field.author a")
    author = author_anchor.get_text(" ", strip=True) if author_anchor else None

    image_tag = row.select_one("td.field.cover img")
    image_url = image_tag.get("src") if image_tag else None

    return ScrapedBook(
        title=title,
        author=author,
        goodreads_id=goodreads_id,
        goodreads_url=goodreads_url,
        image_url=image_url,
    )


def _extract_goodreads_id(path: str) -> str | None:
    if not path:
        return None

    segments = [segment for segment in path.split("/") if segment]
    try:
        idx = segments.index("show")
    except ValueError:
        return None

    if idx + 1 >= len(segments):
        return None

    identifier = segments[idx + 1]
    return identifier.split("-")[0]
