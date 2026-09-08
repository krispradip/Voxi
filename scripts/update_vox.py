#!/usr/bin/env python3

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


VOX_URL = "https://uae.voxcinemas.com/movies/whatson"

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
MOVIES_FILE = DATA_DIR / "movies.json"


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/150.0.0.0 Safari/537.36"
    ),
    "Accept": (
        "text/html,application/xhtml+xml,"
        "application/xml;q=0.9,image/avif,"
        "image/webp,*/*;q=0.8"
    ),
    "Accept-Language": "en-AE,en;q=0.9",
    "Cache-Control": "no-cache",
}


LANGUAGE_RE = re.compile(
    r"Language\s*:\s*([A-Za-z]+)",
    re.IGNORECASE
)

RATING_RE = re.compile(
    r"\b("
    r"PG15|PG13|PG|"
    r"18TC|18\+|15\+|21\+|"
    r"12\+|G|TBC"
    r")\b",
    re.IGNORECASE
)


def clean_text(value):
    return re.sub(r"\s+", " ", value or "").strip()


def create_session():
    session = requests.Session()

    retries = Retry(
        total=3,
        connect=3,
        read=3,
        backoff_factor=1,
        status_forcelist=[
            429,
            500,
            502,
            503,
            504
        ],
        allowed_methods=["GET"]
    )

    adapter = HTTPAdapter(
        max_retries=retries
    )

    session.mount(
        "https://",
        adapter
    )

    session.headers.update(
        HEADERS
    )

    return session


def fetch_page():
    session = create_session()

    response = session.get(
        VOX_URL,
        timeout=30
    )

    response.raise_for_status()

    if len(response.text) < 5000:
        raise RuntimeError(
            "VOX returned an unexpectedly small page."
        )

    return response.text


def find_movie_container(heading):
    """
    Walk upwards from the movie heading until
    we find the smallest container containing
    both Language and Showtimes.
    """

    current = heading

    for _ in range(8):

        current = current.parent

        if current is None:
            break

        text = clean_text(
            current.get_text(
                " ",
                strip=True
            )
        )

        if (
            "Language:" in text
            and "Showtimes" in text
            and len(text) < 3000
        ):
            return current

    return None


def get_image_url(container):
    if not container:
        return ""

    image = container.find("img")

    if not image:
        return ""

    attributes = [
        "src",
        "data-src",
        "data-lazy-src",
        "data-original",
        "data-image"
    ]

    for attribute in attributes:
        value = image.get(attribute)

        if value and not value.startswith(
            "data:"
        ):
            return urljoin(
                VOX_URL,
                value.strip()
            )

    srcset = (
        image.get("srcset")
        or image.get("data-srcset")
    )

    if srcset:
        first = (
            srcset
            .split(",")[0]
            .strip()
            .split(" ")[0]
        )

        if first:
            return urljoin(
                VOX_URL,
                first
            )

    return ""


def get_existing_posters():
    """
    Preserve the last known poster if VOX
    temporarily returns a movie without one.
    """

    if not MOVIES_FILE.exists():
        return {}

    try:
        existing = json.loads(
            MOVIES_FILE.read_text(
                encoding="utf-8"
            )
        )
    except Exception:
        return {}

    posters = {}

    for movie in existing.get(
        "movies",
        []
    ):
        key = (
            clean_text(
                movie.get(
                    "title",
                    ""
                )
            ).casefold(),
            clean_text(
                movie.get(
                    "language",
                    ""
                )
            ).casefold()
        )

        poster = movie.get(
            "poster",
            ""
        )

        if poster:
            posters[key] = poster

    return posters


def parse_movies(html):
    soup = BeautifulSoup(
        html,
        "html.parser"
    )

    existing_posters = (
        get_existing_posters()
    )

    movies = []
    seen = set()

    headings = soup.find_all(
        ["h2", "h3", "h4"]
    )

    for heading in headings:

        title = clean_text(
            heading.get_text(
                " ",
                strip=True
            )
        )

        if not title:
            continue

        container = (
            find_movie_container(
                heading
            )
        )

        if not container:
            continue

        text = clean_text(
            container.get_text(
                " ",
                strip=True
            )
        )

        language_match = (
            LANGUAGE_RE.search(text)
        )

        if not language_match:
            continue

        language = (
            language_match
            .group(1)
            .strip()
            .title()
        )

        rating_match = (
            RATING_RE.search(text)
        )

        rating = (
            rating_match
            .group(1)
            .upper()
            if rating_match
            else "NR"
        )

        link = heading.find(
            "a",
            href=True
        )

        if not link:
            link = container.find(
                "a",
                href=re.compile(
                    r"/movies/"
                )
            )

        movie_url = (
            urljoin(
                VOX_URL,
                link["href"]
            )
            if link
            else VOX_URL
        )

        key = (
            title.casefold(),
            language.casefold()
        )

        if key in seen:
            continue

        poster = get_image_url(
            container
        )

        if not poster:
            poster = (
                existing_posters
                .get(
                    key,
                    ""
                )
            )

        movies.append({
            "title": title,
            "language": language,
            "rating": rating,
            "url": movie_url,
            "poster": poster
        })

        seen.add(key)

    return movies


def validate_movies(movies):
    """
    Do not overwrite a good catalogue if
    VOX changes its HTML or blocks GitHub.
    """

    if len(movies) < 20:
        raise RuntimeError(
            f"Only {len(movies)} movies "
            "were extracted. "
            "Expected at least 20. "
            "Existing movies.json has "
            "NOT been overwritten."
        )

    valid_titles = sum(
        1
        for movie in movies
        if movie.get("title")
    )

    valid_languages = sum(
        1
        for movie in movies
        if movie.get("language")
    )

    if valid_titles != len(movies):
        raise RuntimeError(
            "One or more movies "
            "have no title."
        )

    if valid_languages != len(movies):
        raise RuntimeError(
            "One or more movies "
            "have no language."
        )


def save_movies(movies):
    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    timestamp = (
        datetime.now(
            timezone.utc
        )
        .isoformat()
        .replace(
            "+00:00",
            "Z"
        )
    )

    payload = {
        "source": VOX_URL,
        "updated_at": timestamp,
        "count": len(movies),
        "movies": movies
    }

    temporary_file = (
        DATA_DIR /
        "movies.tmp.json"
    )

    temporary_file.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2
        ) + "\n",
        encoding="utf-8"
    )

    temporary_file.replace(
        MOVIES_FILE
    )


def main():
    print(
        "Fetching live VOX UAE catalogue..."
    )

    html = fetch_page()

    movies = parse_movies(
        html
    )

    print(
        f"Found {len(movies)} movie entries."
    )

    validate_movies(
        movies
    )

    save_movies(
        movies
    )

    print(
        f"Successfully updated "
        f"{MOVIES_FILE}"
    )

    print(
        f"Catalogue contains "
        f"{len(movies)} movies."
    )


if __name__ == "__main__":
    main()
