# BookWheel

BookWheel is a Flask application that scrapes a public Goodreads shelf, stores the books in a database, and visualises them as a spinning wheel so you can pick your next read. You can also add or remove books manually. The project is production-ready for self-hosting or deployment to Azure App Service.

## Requirements

- Python 3.11+
- SQLite (bundled with Python) for local development
- (Optional) PostgreSQL 13+ if you prefer running against Postgres
- (Optional) Docker / Azure CLI for deployment

## Local Development

1. Create and activate a virtual environment (Windows PowerShell shown):

   ```powershell
   py -3 -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Install dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

3. (Optional) If you want to use PostgreSQL instead of the default SQLite database, export a `DATABASE_URL`, e.g.:

   ```powershell
   $Env:DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/bookwheel"
   ```

4. Create the tables (this generates `bookwheel.db` when using SQLite):

   ```powershell
   python create_tables.py
   ```

5. Run the app:

   ```powershell
   flask --app app run --debug
   ```

Open http://127.0.0.1:5000 in your browser.

## Azure Deployment

### Option A: Azure App Service (Linux, code-based)

1. Push the source tree to a Git repo.
2. Create a Linux App Service with the Python runtime (3.11+).
3. Configure the following App Settings:
   - `DATABASE_URL` - connection string to your Azure Database for PostgreSQL.
   - `SECRET_KEY` - random string for Flask sessions.
   - `GOODREADS_MAX_PAGES` / `HTTP_TIMEOUT_SECONDS` (optional overrides).
4. Set the Startup Command to:
   ```
   gunicorn app:app --bind=0.0.0.0:${PORT:-8000} --workers=4 --timeout=120
   ```
   (The same command is provided in `Procfile` for reference.)
5. Deploy via `git push`, GitHub Actions, or Azure DevOps.

### Option B: Azure App Service for Containers

1. Build and push the Docker image:

   ```bash
   az acr build --registry <acr-name> --image bookwheel:latest .
   ```

2. Create an App Service for Containers pointing to the ACR image.
3. Set App Settings / Connection Strings for the same environment variables as above. Ensure `WEBSITES_PORT=8000`.
4. Restart the app after configuration.

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///bookwheel.db` | SQLAlchemy connection string (override for PostgreSQL) |
| `SECRET_KEY` | `change-me` | Flask session signing key |
| `GOODREADS_MAX_PAGES` | `10` | Maximum Goodreads pagination pages to fetch |
| `HTTP_TIMEOUT_SECONDS` | `20` | Timeout for Goodreads HTTP requests |

## Usage

- Paste the URL of your public Goodreads shelf and click **Sync** to import the books.
- Add manual books via the **Add Book Manually** form.
- Remove any book from the list using the **Remove** button.
- Click **Spin The Wheel** to animate the wheel and highlight a random book.

Syncing again replaces the previously imported Goodreads books while keeping manual entries.

## Notes

- Goodreads shelf must be public and accessible without authentication.
- Scraper fetches up to the configured number of pages. Increase `GOODREADS_MAX_PAGES` if needed.
- When deploying, provision a managed Postgres instance (Azure Database for PostgreSQL flexible server is recommended).
