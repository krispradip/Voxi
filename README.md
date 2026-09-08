# VOX Cinemas UAE - Live Catalogue Mock-up

Responsive GitHub Pages prototype inspired by VOX Cinemas UAE. The movie catalogue and cinema list are data-driven rather than hard-coded.

## How the live catalogue works

- The browser reads `data/movies.json` and `data/cinemas.json`.
- `.github/workflows/update-vox-data.yml` runs every 3 hours and can also be run manually.
- `scripts/update_vox.py` reads the public VOX UAE **What's On** and cinema pages and refreshes those JSON files.
- If VOX is temporarily unavailable or its markup changes enough to fail validation, the Action fails without overwriting the last successful catalogue.
- The UI displays the last catalogue update time.

This keeps the public GitHub Pages site static and avoids exposing API keys or relying on browser-side cross-origin scraping.

## First GitHub setup

1. Upload **all files and folders** in this project to the repository root, including `.github`, `data`, `scripts` and `assets`.
2. Go to **Settings -> Pages**.
3. Choose **Deploy from a branch**, then `main` and `/(root)`.
4. Go to **Actions -> Refresh VOX live catalogue -> Run workflow** once to force the first refresh.
5. Allow Actions write access if your repo policy blocks the bot from committing: **Settings -> Actions -> General -> Workflow permissions -> Read and write permissions**.

## Run locally

Because the app fetches JSON, run it through a tiny local web server instead of opening `index.html` directly:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

To test the catalogue updater locally:

```bash
pip install -r requirements.txt
python scripts/update_vox.py
```

## Current prototype scope

Connected to live/public catalogue data:
- currently showing movie titles
- languages
- content ratings when exposed by the listing
- poster URLs when exposed by the page markup
- cinema list

Still simulated:
- showtimes
- seat availability / seat map
- basket and food ordering
- payment / checkout
- authentication

For truly real-time showtimes on every page load, use a small backend/serverless proxy or an authorised VOX integration rather than direct browser scraping.
