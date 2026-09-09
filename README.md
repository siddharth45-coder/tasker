# Tasker

A clean, responsive task-management web app built with vanilla HTML, CSS and JavaScript.

## Included

- Create, edit, complete and delete tasks
- Due dates, priorities and tags
- Inbox, Today, Upcoming and Completed views
- Search and sorting
- Progress and task statistics
- Light/dark theme
- Responsive layout for desktop and mobile
- LocalStorage persistence (no backend required yet)

## Run locally

Open `index.html` in a browser. For a local dev server, use any static server such as VS Code Live Server or:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Project structure

```text
index.html   # app markup
styles.css   # responsive UI styles
app.js       # task state and interactions
```

The frontend is intentionally framework-free so a Figma-generated UI can be integrated without having to rewrite a component framework first.
