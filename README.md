# TaskFlow

A production-style task management web app based on the TaskFlow Figma design. The project now uses Flask, SQLite and a vanilla HTML/CSS/JavaScript frontend.

## Features

- Figma-inspired responsive dashboard
- User registration, login and logout
- Secure password hashing with Flask/Werkzeug
- SQLite persistence per user
- Create, edit, delete and move tasks
- Drag-and-drop Kanban board
- Projects and priority filters
- Live search
- Calendar view
- Analytics view and productivity stats
- Persistent light/dark theme
- JSON REST API
- Health endpoint for deployment checks
- Mobile-friendly responsive layout

## Run locally

```bash
python -m venv .venv

# Windows
.venv\\Scripts\\activate

# Linux/macOS
# source .venv/bin/activate

pip install -r requirements.txt
python app.py
```

Open `http://localhost:5000`.

On first run, create an account. Demo tasks are automatically seeded for the new account.

## Environment variables

```text
SECRET_KEY=replace-with-a-long-random-secret
PORT=5000
FLASK_DEBUG=0
```

## Project structure

```text
app.py                    # Flask app, auth, API and SQLite setup
requirements.txt          # Python dependencies
.gitignore

templates/
  index.html              # Main TaskFlow dashboard
  login.html              # Sign-in page
  register.html           # Registration page

static/
  styles.css              # Figma-inspired responsive styling
  app.js                  # API-connected frontend interactions

database/
  tasker.db               # Created automatically at runtime; ignored by Git
```

## API

- `GET /api/me`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/<id>`
- `DELETE /api/tasks/<id>`
- `PATCH /api/tasks/<id>/status`
- `GET /health`

## Deployment direction

For the VPS production setup, run Flask behind Gunicorn and Nginx, keep `SECRET_KEY` in the environment, enable HTTPS, and use a persistent database path. The app is intentionally dependency-light so it can be deployed easily on a small VPS.
