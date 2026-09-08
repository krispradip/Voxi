#!/usr/bin/env python3
"""Refresh public VOX UAE movie and cinema catalogue data for the static prototype."""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
MOVIES_URL = "https://uae.voxcinemas.com/movies/whatson"
CINEMAS_URL = "https://uae.voxcinemas.com/cinemas"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; VOXPrototypeCatalogue/1.0; +https://github.com/)",
    "Accept-Language": "en-AE,en;q=0.9",
}
RATING_RE = re.compile(r"^(G|PG|PG13|PG15|15\+|18\+|21\+|TBC)$", re.I)
LANG_RE = re.compile(r"Language\s*:\s*([A-Za-z]+)", re.I)


def fetch(url: str) -> BeautifulSoup:
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")


def clean(text: str | None) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def movie_container(heading):
    for parent in heading.parents:
        text = clean(parent.get_text(" ", strip=True))
        if "Showtimes" in text and len(text) < 1800:
            return parent
    return heading.parent


def parse_movies(soup: BeautifulSoup) -> list[dict]:
    movies = []
    seen = set()

    # Primary strategy: cards/headings on the current What's On page.
    for h in soup.find_all(["h2", "h3", "h4"]):
        title = clean(h.get_text(" ", strip=True))
        if not title or title.lower() in {"what's on", "whats on", "coming soon"}:
            continue
        container = movie_container(h)
        text = clean(container.get_text(" ", strip=True)) if container else ""
        if "Showtimes" not in text:
            continue
        lm = LANG_RE.search(text)
        language = lm.group(1).title() if lm else ""
        rating = ""
        for token in re.split(r"\s+", text):
            token = token.strip("|•,.;()")
            if RATING_RE.match(token):
                rating = token.upper() if "+" not in token else token
                break
        link = container.find("a", href=re.compile(r"/movies/")) if container else None
        url = urljoin(MOVIES_URL, link.get("href")) if link and link.get("href") else MOVIES_URL
        img = container.find("img") if container else None
        poster = ""
        if img:
            poster = img.get("src") or img.get("data-src") or img.get("data-lazy-src") or ""
            if poster:
                poster = urljoin(MOVIES_URL, poster)
        key = (title.casefold(), language.casefold())
        if key not in seen:
            seen.add(key)
            movies.append({
                "title": title,
                "language": language or "Other",
                "rating": rating or "NR",
                "url": url,
                "poster": poster,
            })

    # Fallback: movie picker inputs. This keeps the catalogue useful if card markup changes.
    if len(movies) < 5:
        movies = []
        seen = set()
        for label in soup.find_all(["label", "option", "li"]):
            raw = clean(label.get_text(" ", strip=True))
            if not raw or len(raw) > 120:
                continue
            m = re.match(r"^\(([^)]+)\)\s*(.+)$", raw)
            language, title = (m.group(1).title(), m.group(2)) if m else ("Other", raw)
            if any(x in title.lower() for x in ["clear all", "done", "any movie", "select your"]):
                continue
            key = (title.casefold(), language.casefold())
            if key in seen:
                continue
            seen.add(key)
            movies.append({"title": title, "language": language, "rating": "NR", "url": MOVIES_URL, "poster": ""})

    if len(movies) < 5:
        raise RuntimeError(f"Parser returned only {len(movies)} movies; retaining previous catalogue")
    return movies


def parse_cinemas(soup: BeautifulSoup) -> list[str]:
    names = []
    seen = set()
    for h in soup.find_all(["h2", "h3", "h4"]):
        name = clean(h.get_text(" ", strip=True))
        if not name or name.lower() in {"find us", "experiences available"}:
            continue
        parent_text = clean(h.parent.get_text(" ", strip=True)) if h.parent else ""
        if "Address:" not in parent_text and "Showtimes" not in parent_text:
            continue
        if name.casefold() not in seen:
            seen.add(name.casefold())
            names.append(name)
    if len(names) < 10:
        # Existing current list remains a safe fallback if cinema markup changes.
        old = json.loads((DATA / "cinemas.json").read_text(encoding="utf-8"))
        return old.get("cinemas", [])
    return names


def write_json(path: Path, payload: dict):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    DATA.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    movies = parse_movies(fetch(MOVIES_URL))
    write_json(DATA / "movies.json", {"source": MOVIES_URL, "updated_at": stamp, "movies": movies})
    print(f"Updated {len(movies)} movies")

    cinemas = parse_cinemas(fetch(CINEMAS_URL))
    write_json(DATA / "cinemas.json", {"source": CINEMAS_URL, "updated_at": stamp, "cinemas": cinemas})
    print(f"Updated {len(cinemas)} cinemas")


if __name__ == "__main__":
    main()
