import os
import tempfile
import unittest

os.environ.setdefault("SECRET_KEY", "taskflow-test-secret")
os.environ.setdefault("FLASK_DEBUG", "1")
os.environ.setdefault("COOKIE_SECURE", "0")

import app as tasker


class TaskFlowAppTests(unittest.TestCase):
    def setUp(self):
        self.db_file = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.db_file.close()
        tasker.DB_PATH = self.db_file.name
        tasker.app.config.update(TESTING=True, COOKIE_SECURE=False)
        with tasker.app.app_context():
            tasker.init_db()
        self.client = tasker.app.test_client()

    def tearDown(self):
        try:
            os.unlink(self.db_file.name)
        except FileNotFoundError:
            pass

    def csrf(self):
        response = self.client.get("/register")
        self.assertEqual(response.status_code, 200)
        with self.client.session_transaction() as session:
            return session["csrf_token"]

    def register(self):
        token = self.csrf()
        response = self.client.post(
            "/register",
            data={"name": "Test User", "email": "test@example.com", "password": "secret123", "csrf_token": token},
            follow_redirects=False,
        )
        self.assertEqual(response.status_code, 302)

    def test_health_is_public(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json["status"], "ok")

    def test_registration_seeds_tasks(self):
        self.register()
        response = self.client.get("/api/tasks")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json["tasks"]), 10)

    def test_api_mutation_requires_csrf(self):
        self.register()
        response = self.client.post("/api/tasks", json={"title": "Blocked"})
        self.assertEqual(response.status_code, 403)

    def test_create_update_and_delete_task(self):
        self.register()
        with self.client.session_transaction() as session:
            token = session["csrf_token"]

        headers = {"X-CSRF-Token": token}
        created = self.client.post(
            "/api/tasks",
            json={"title": "Ship QA", "priority": "high", "status": "todo", "project": "Website Redesign"},
            headers=headers,
        )
        self.assertEqual(created.status_code, 201)
        task_id = created.json["task"]["id"]

        updated = self.client.put(
            f"/api/tasks/{task_id}",
            json={"title": "Ship final QA", "status": "progress"},
            headers=headers,
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json["task"]["title"], "Ship final QA")
        self.assertEqual(updated.json["task"]["status"], "progress")

        deleted = self.client.delete(f"/api/tasks/{task_id}", headers=headers)
        self.assertEqual(deleted.status_code, 200)
        self.assertTrue(deleted.json["ok"])


if __name__ == "__main__":
    unittest.main()
