import os
import sqlite3
from datetime import date, timedelta
from functools import wraps
from flask import Flask, jsonify, render_template, request, session, redirect, url_for, g
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DB_DIR, "tasker.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "tasker-dev-change-me")
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = os.environ.get("COOKIE_SECURE", "0") == "1"
app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024


def get_db():
    if "db" not in g:
        os.makedirs(DB_DIR, exist_ok=True)
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
        g.db.execute("PRAGMA journal_mode = WAL")
        g.db.execute("PRAGMA busy_timeout = 5000")
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            project TEXT NOT NULL DEFAULT 'Personal',
            priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
            status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','progress','done')),
            due_date TEXT,
            progress INTEGER NOT NULL DEFAULT 0 CHECK(progress BETWEEN 0 AND 100),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(user_id, due_date);
    """)
    db.commit()


def login_required(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        if "user_id" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"error": "Authentication required"}), 401
            return redirect(url_for("login"))
        return fn(*args, **kwargs)
    return wrapped


def current_user():
    if "user_id" not in session:
        return None
    return get_db().execute("SELECT id, name, email FROM users WHERE id = ?", (session["user_id"],)).fetchone()


def task_json(row):
    return {
        "id": row["id"], "title": row["title"], "description": row["description"],
        "project": row["project"], "tag": row["project"], "priority": row["priority"],
        "status": row["status"], "due": row["due_date"], "progress": row["progress"],
        "createdAt": row["created_at"], "updatedAt": row["updated_at"]
    }


def seed_tasks(user_id):
    db = get_db()
    today = date.today()
    samples = [
        ("Finalize homepage wireframe", "Polish the main landing page layout and responsive states.", "Website Redesign", "high", "todo", today.isoformat(), 40),
        ("Update portfolio content", "Refresh case studies, screenshots and project descriptions.", "Website Redesign", "medium", "todo", today.isoformat(), 40),
        ("Set up analytics", "Connect analytics and verify the key conversion events.", "Marketing", "low", "todo", today.isoformat(), 40),
        ("Build authentication flow", "Implement secure sign in, sign up and session handling.", "Mobile App", "high", "progress", (today + timedelta(days=1)).isoformat(), 68),
        ("Design mobile dashboard", "Translate the dashboard experience to mobile layouts.", "Mobile App", "medium", "progress", (today + timedelta(days=1)).isoformat(), 68),
        ("API integration", "Connect task CRUD screens to the Flask API.", "Mobile App", "medium", "progress", (today + timedelta(days=1)).isoformat(), 68),
        ("QA and bug fixes", "Run the main flows and resolve edge cases.", "Mobile App", "low", "progress", (today + timedelta(days=2)).isoformat(), 68),
        ("Project proposal", "Finalize and submit the project proposal.", "Marketing", "high", "done", (today - timedelta(days=1)).isoformat(), 100),
        ("Database schema", "Create the first normalized SQLite schema.", "Mobile App", "medium", "done", (today - timedelta(days=2)).isoformat(), 100),
        ("Landing page copy", "Approve the final marketing copy.", "Marketing", "low", "done", (today - timedelta(days=3)).isoformat(), 100),
    ]
    db.executemany("INSERT INTO tasks (user_id,title,description,project,priority,status,due_date,progress) VALUES (?,?,?,?,?,?,?,?)", [(user_id, *item) for item in samples])
    db.commit()


@app.after_request
def security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    return response


@app.errorhandler(413)
def too_large(_error):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Request is too large"}), 413
    return "Request is too large", 413


@app.route("/")
@login_required
def index():
    return render_template("index.html", user=current_user())


@app.route("/login", methods=["GET", "POST"])
def login():
    if "user_id" in session:
        return redirect(url_for("index"))
    error = None
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if user and check_password_hash(user["password_hash"], password):
            session.clear()
            session["user_id"] = user["id"]
            return redirect(url_for("index"))
        error = "Invalid email or password."
    return render_template("login.html", error=error)


@app.route("/register", methods=["GET", "POST"])
def register():
    if "user_id" in session:
        return redirect(url_for("index"))
    error = None
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        if len(name) < 2 or len(name) > 80 or "@" not in email or len(email) > 160 or len(password) < 6:
            error = "Enter a valid name, email and password (6+ characters)."
        else:
            db = get_db()
            try:
                cur = db.execute("INSERT INTO users (name,email,password_hash) VALUES (?,?,?)", (name, email, generate_password_hash(password)))
                db.commit()
                session.clear()
                session["user_id"] = cur.lastrowid
                seed_tasks(cur.lastrowid)
                return redirect(url_for("index"))
            except sqlite3.IntegrityError:
                error = "An account with that email already exists."
    return render_template("register.html", error=error)


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.get("/api/me")
@login_required
def me():
    user = current_user()
    return jsonify({"user": {"id": user["id"], "name": user["name"], "email": user["email"]}})


@app.get("/api/tasks")
@login_required
def list_tasks():
    db = get_db()
    rows = db.execute("SELECT * FROM tasks WHERE user_id = ? ORDER BY CASE status WHEN 'progress' THEN 1 WHEN 'todo' THEN 2 ELSE 3 END, due_date IS NULL, due_date, id DESC", (session["user_id"],)).fetchall()
    return jsonify({"tasks": [task_json(row) for row in rows]})


def validate_task(data):
    title = str(data.get("title", "")).strip()
    if not title or len(title) > 120:
        raise ValueError("Invalid title")
    priority = data.get("priority", "medium")
    status = data.get("status", "todo")
    if priority not in {"low", "medium", "high"} or status not in {"todo", "progress", "done"}:
        raise ValueError("Invalid priority or status")
    due = data.get("due") or None
    if due:
        try: date.fromisoformat(str(due))
        except ValueError: raise ValueError("Invalid due date")
    progress = 100 if status == "done" else int(data.get("progress", 68 if status == "progress" else 40))
    progress = max(0, min(100, progress))
    return (title, str(data.get("description", "")).strip()[:500], str(data.get("project", data.get("tag", "Personal"))).strip()[:60] or "Personal", priority, status, due, progress)


@app.post("/api/tasks")
@login_required
def create_task():
    try: values = validate_task(request.get_json(silent=True) or {})
    except (ValueError, TypeError): return jsonify({"error": "Invalid task data"}), 400
    db = get_db()
    cur = db.execute("INSERT INTO tasks (user_id,title,description,project,priority,status,due_date,progress,updated_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)", (session["user_id"], *values))
    db.commit()
    row = db.execute("SELECT * FROM tasks WHERE id = ? AND user_id = ?", (cur.lastrowid, session["user_id"])).fetchone()
    return jsonify({"task": task_json(row)}), 201


@app.put("/api/tasks/<int:task_id>")
@login_required
def update_task(task_id):
    db = get_db(); existing = db.execute("SELECT * FROM tasks WHERE id = ? AND user_id = ?", (task_id, session["user_id"])).fetchone()
    if not existing: return jsonify({"error": "Task not found"}), 404
    data = request.get_json(silent=True) or {}; merged = dict(data)
    for key, column in (("title","title"),("description","description"),("project","project"),("priority","priority"),("status","status"),("due","due_date"),("progress","progress")):
        merged.setdefault(key, existing[column])
    try: values = validate_task(merged)
    except (ValueError, TypeError): return jsonify({"error": "Invalid task data"}), 400
    db.execute("UPDATE tasks SET title=?,description=?,project=?,priority=?,status=?,due_date=?,progress=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?", (*values, task_id, session["user_id"]))
    db.commit()
    row = db.execute("SELECT * FROM tasks WHERE id = ? AND user_id = ?", (task_id, session["user_id"])).fetchone()
    return jsonify({"task": task_json(row)})


@app.delete("/api/tasks/<int:task_id>")
@login_required
def delete_task(task_id):
    db = get_db(); cur = db.execute("DELETE FROM tasks WHERE id = ? AND user_id = ?", (task_id, session["user_id"])); db.commit()
    if cur.rowcount == 0: return jsonify({"error": "Task not found"}), 404
    return jsonify({"ok": True})


@app.patch("/api/tasks/<int:task_id>/status")
@login_required
def move_task(task_id):
    status = (request.get_json(silent=True) or {}).get("status")
    if status not in {"todo", "progress", "done"}: return jsonify({"error": "Invalid status"}), 400
    progress = 100 if status == "done" else 68 if status == "progress" else 40
    db = get_db(); cur = db.execute("UPDATE tasks SET status=?,progress=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?", (status, progress, task_id, session["user_id"])); db.commit()
    if cur.rowcount == 0: return jsonify({"error": "Task not found"}), 404
    row = db.execute("SELECT * FROM tasks WHERE id=? AND user_id=?", (task_id, session["user_id"])).fetchone()
    return jsonify({"task": task_json(row)})


@app.get("/health")
def health():
    return jsonify({"status": "ok", "service": "taskflow"})


with app.app_context():
    init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=os.environ.get("FLASK_DEBUG", "0") == "1")
