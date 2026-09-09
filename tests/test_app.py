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
        for path in (self.db_file.name, self.db_file.name + "-wal", self.db_file.name + "-shm"):
            try:
                os.unlink(path)
            except FileNotFoundError:
                pass

    def csrf(self, path="/register"):
        response = self.client.get(path)
        self.assertEqual(response.status_code, 200)
        with self.client.session_transaction() as session:
            return session["csrf_token"]

    def register(self, email="test@example.com"):
        token = self.csrf()
        response = self.client.post(
            "/register",
            data={"name": "Test User", "email": email, "password": "secret123", "csrf_token": token},
            follow_redirects=False,
        )
        self.assertEqual(response.status_code, 302)
        # Login/registration rotates the session, so fetch the dashboard once
        # to let the context processor issue the fresh CSRF token.
        self.client.get("/")

    def session_csrf(self):
        return self.csrf("/")

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
        self.assertEqual(response.json["error"], "CSRF validation failed")

    def test_auth_mutation_requires_csrf(self):
        response = self.client.post(
            "/register",
            data={"name": "Blocked", "email": "blocked@example.com", "password": "secret123"},
        )
        self.assertEqual(response.status_code, 403)

    def test_create_update_and_delete_task(self):
        self.register()
        token = self.session_csrf()
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

    def test_tasks_are_isolated_between_users(self):
        self.register("one@example.com")
        first_user_id = self.client.get("/api/me").json["user"]["id"]
        token = self.session_csrf()

        created = self.client.post(
            "/api/tasks",
            json={"title": "Private task"},
            headers={"X-CSRF-Token": token},
        )
        self.assertEqual(created.status_code, 201)
        task_id = created.json["task"]["id"]

        self.client.post("/logout", data={"csrf_token": token})
        self.register("two@example.com")
        second_user_id = self.client.get("/api/me").json["user"]["id"]
        self.assertNotEqual(first_user_id, second_user_id)
        second_token = self.session_csrf()

        tasks = self.client.get("/api/tasks")
        self.assertEqual(tasks.status_code, 200)
        self.assertTrue(all(task["title"] != "Private task" for task in tasks.json["tasks"]))

        response = self.client.put(
            f"/api/tasks/{task_id}",
            json={"title": "Hijacked"},
            headers={"X-CSRF-Token": second_token},
        )
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()
