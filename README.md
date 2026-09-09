# TaskFlow

A polished, production-style task management web app based on the TaskFlow Figma design. It uses Flask, SQLite and a lightweight vanilla HTML/CSS/JavaScript frontend.

## Features

- Figma-inspired responsive dashboard
- User registration, login and logout
- Secure password hashing
- SQLite persistence isolated per user
- Create, edit, delete and move tasks
- Drag-and-drop Kanban board
- Projects and priority filters
- Live search
- Calendar view
- Analytics and productivity stats
- Persistent light/dark theme
- Smooth micro-interactions and page/card/modal animations
- Reduced-motion support
- Keyboard shortcuts: `Ctrl/Cmd + K` search, `Ctrl/Cmd + N` new task, `Esc` close modal
- JSON REST API
- Health endpoint for deployment checks
- Security headers, secure session cookie options and request-size limits
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

Open `http://localhost:5000` and create an account. Demo tasks are automatically seeded for each new account.

## Environment

Copy `.env.example` to `.env` and set a long random `SECRET_KEY`.

```text
SECRET_KEY=replace-with-a-long-random-secret
PORT=5000
FLASK_DEBUG=0
COOKIE_SECURE=1
```

Use `COOKIE_SECURE=1` when the application is served over HTTPS.

## Project structure

```text
app.py
requirements.txt
Procfile
.env.example
.gitignore

templates/
  index.html
  login.html
  register.html

static/
  styles.css
  app.js

deploy/
  nginx.conf
  tasker.service

database/
  tasker.db       # generated at runtime; ignored by Git
```

## API

- `GET /api/me`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/<id>`
- `DELETE /api/tasks/<id>`
- `PATCH /api/tasks/<id>/status`
- `GET /health`

All task endpoints require an authenticated session and scope records to the logged-in user.

## Production VPS

The repository includes a Gunicorn process definition plus example Nginx and systemd configuration under `deploy/`. A typical Linux deployment is:

```bash
git clone https://github.com/siddharth45-coder/tasker.git /opt/tasker
cd /opt/tasker
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env and set SECRET_KEY
sudo cp deploy/tasker.service /etc/systemd/system/tasker.service
sudo cp deploy/nginx.conf /etc/nginx/sites-available/tasker
sudo ln -s /etc/nginx/sites-available/tasker /etc/nginx/sites-enabled/tasker
sudo systemctl daemon-reload
sudo systemctl enable --now tasker
sudo nginx -t && sudo systemctl reload nginx
```

Before exposing the site publicly, configure the real domain in Nginx and enable HTTPS. Do not commit the real `.env` file or the SQLite database.
