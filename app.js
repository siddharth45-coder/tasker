const STORAGE_KEY = "taskflow.tasks.v2";

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const seedTasks = [
  { id: crypto.randomUUID(), title: "Finalize homepage wireframe", tag: "Design", due: today(), priority: "high", status: "todo", progress: 40, createdAt: Date.now() - 9000 },
  { id: crypto.randomUUID(), title: "Update portfolio content", tag: "Design", due: today(), priority: "medium", status: "todo", progress: 40, createdAt: Date.now() - 8000 },
  { id: crypto.randomUUID(), title: "Set up analytics", tag: "Design", due: today(), priority: "low", status: "todo", progress: 40, createdAt: Date.now() - 7000 },
  { id: crypto.randomUUID(), title: "Build authentication flow", tag: "Development", due: plusDays(1), priority: "high", status: "progress", progress: 68, createdAt: Date.now() - 6000 },
  { id: crypto.randomUUID(), title: "Design mobile dashboard", tag: "Development", due: plusDays(1), priority: "medium", status: "progress", progress: 68, createdAt: Date.now() - 5000 },
  { id: crypto.randomUUID(), title: "API integration", tag: "Development", due: plusDays(1), priority: "medium", status: "progress", progress: 68, createdAt: Date.now() - 4000 },
  { id: crypto.randomUUID(), title: "QA and bug fixes", tag: "Development", due: plusDays(2), priority: "low", status: "progress", progress: 68, createdAt: Date.now() - 3000 },
  { id: crypto.randomUUID(), title: "Project proposal", tag: "Marketing", due: plusDays(-1), priority: "high", status: "done", progress: 100, createdAt: Date.now() - 2000 },
  { id: crypto.randomUUID(), title: "Database schema", tag: "Development", due: plusDays(-2), priority: "medium", status: "done", progress: 100, createdAt: Date.now() - 1000 },
  { id: crypto.randomUUID(), title: "Landing page copy", tag: "Marketing", due: plusDays(-3), priority: "low", status: "done", progress: 100, createdAt: Date.now() - 500 }
];

let tasks = loadTasks();
let activeTag = null;
let currentView = "all";
let editingId = null;

const $ = (id) => document.getElementById(id);
const lists = { todo: $("todoList"), progress: $("progressList"), done: $("doneList") };
const priorityRank = { high: 3, medium: 2, low: 1 };

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) && saved.length ? saved : seedTasks;
  } catch { return seedTasks; }
}
function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function parseDay(value) { return value ? new Date(`${value}T00:00:00`) : null; }
function formatDue(value) {
  if (!value) return "No due date";
  const d = parseDay(value);
  if (value === today()) return "Due today";
  if (value === plusDays(1)) return "Due tomorrow";
  return `Due ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}
function visibleTasks() {
  const q = $("searchInput").value.trim().toLowerCase();
  const filter = $("filterSelect").value;
  return tasks.filter((task) => {
    if (activeTag && task.tag !== activeTag) return false;
    if (filter !== "all" && task.priority !== filter) return false;
    if (currentView === "active" && task.status === "done") return false;
    if (currentView === "calendar" && task.due !== today()) return false;
    if (currentView === "analytics") return true;
    if (q && !`${task.title} ${task.tag} ${task.priority}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
function render() {
  Object.values(lists).forEach((list) => list.innerHTML = "");
  const visible = visibleTasks();
  const groups = { todo: [], progress: [], done: [] };
  visible.forEach((task) => groups[task.status].push(task));
  Object.entries(groups).forEach(([status, group]) => group.forEach((task) => renderTask(task, lists[status])));
  $("todoCount").textContent = groups.todo.length;
  $("progressCount").textContent = groups.progress.length;
  $("doneCount").textContent = groups.done.length;
  $("emptyState").classList.toggle("hidden", visible.length > 0);
  updateStats();
  updateActiveCount();
}
function renderTask(task, list) {
  const node = $("taskTemplate").content.firstElementChild.cloneNode(true);
  const accent = node.querySelector(".task-accent");
  const bar = node.querySelector(".task-progress-bar");
  node.querySelector(".task-title").textContent = task.title;
  node.querySelector(".task-tagline").textContent = task.tag || "General";
  node.querySelector(".task-due").textContent = formatDue(task.due);
  bar.style.width = `${task.status === "done" ? 100 : Math.max(8, Math.min(100, task.progress || 0))}%`;
  if (task.status === "progress") { accent.style.background = "var(--blue)"; bar.style.background = "var(--blue)"; }
  if (task.status === "done") { accent.style.background = "var(--green)"; bar.style.background = "var(--green)"; node.classList.add("done-task"); }
  const menu = node.querySelector(".task-menu");
  node.querySelector(".more-btn").addEventListener("click", (e) => { e.stopPropagation(); document.querySelectorAll(".task-menu").forEach(m => m.classList.add("hidden")); menu.classList.toggle("hidden"); });
  node.querySelector(".edit-btn").addEventListener("click", () => openModal(task.id));
  node.querySelector(".delete-btn").addEventListener("click", () => deleteTask(task.id));
  node.querySelector(".complete-btn").addEventListener("click", () => advanceTask(task.id));
  document.addEventListener("click", () => menu.classList.add("hidden"), { once: true });
  list.appendChild(node);
}
function updateStats() {
  const done = tasks.filter(t => t.status === "done").length;
  const progress = tasks.filter(t => t.status === "progress").length;
  const overdue = tasks.filter(t => t.status !== "done" && t.due && t.due < today()).length;
  $("statTotal").textContent = tasks.length;
  $("statDone").textContent = done;
  $("statProgress").textContent = progress;
  $("statOverdue").textContent = overdue;
  const productivity = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  $("productivity").textContent = `${productivity}%`;
}
function updateActiveCount() {
  const active = tasks.filter(t => t.status !== "done").length;
  $("activeCount").textContent = `${active} active tasks`;
}
function openModal(id = null) {
  editingId = id;
  const task = tasks.find(t => t.id === id);
  $("modalTitle").textContent = task ? "Edit task" : "Create task";
  $("taskId").value = id || "";
  $("taskTitle").value = task?.title || "";
  $("taskDescription").value = task?.description || "";
  $("taskDue").value = task?.due || today();
  $("taskPriority").value = task?.priority || "medium";
  $("taskTag").value = task?.tag || "Design";
  $("taskStatus").value = task?.status || "todo";
  $("modal").classList.remove("hidden");
  setTimeout(() => $("taskTitle").focus(), 20);
}
function closeModal() { $("modal").classList.add("hidden"); editingId = null; $("taskForm").reset(); }
function advanceTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.status = task.status === "todo" ? "progress" : task.status === "progress" ? "done" : "todo";
  task.progress = task.status === "done" ? 100 : task.status === "progress" ? 68 : 40;
  saveTasks(); render();
}
function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  tasks = tasks.filter(t => t.id !== id); saveTasks(); render();
}
function setView(view) {
  currentView = view; activeTag = null;
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === view));
  const titles = { all: "My tasks", active: "My tasks", board: "My tasks", calendar: "Calendar", analytics: "Analytics" };
  $("viewTitle").textContent = titles[view] || "My tasks";
  if (view === "calendar") $("activeCount").textContent = "Tasks due today";
  render();
}

$("taskForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const data = { title: $("taskTitle").value.trim(), description: $("taskDescription").value.trim(), due: $("taskDue").value, priority: $("taskPriority").value, tag: $("taskTag").value, status: $("taskStatus").value };
  if (!data.title) return;
  data.progress = data.status === "done" ? 100 : data.status === "progress" ? 68 : 40;
  if (editingId) Object.assign(tasks.find(t => t.id === editingId), data);
  else tasks.unshift({ id: crypto.randomUUID(), ...data, createdAt: Date.now() });
  saveTasks(); closeModal(); render();
});

$("newTaskTop").addEventListener("click", () => openModal());
$("newTaskBtn").addEventListener("click", () => openModal());
$("closeModal").addEventListener("click", closeModal);
$("cancelBtn").addEventListener("click", closeModal);
$("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
$("searchInput").addEventListener("input", render);
$("filterSelect").addEventListener("change", render);
$("allTasksBtn").addEventListener("click", () => { activeTag = null; currentView = "all"; document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === "all")); render(); });

document.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", () => setView(el.dataset.view)));
document.querySelectorAll("[data-tag]").forEach(el => el.addEventListener("click", () => { activeTag = el.dataset.tag; currentView = "all"; $("viewTitle").textContent = el.textContent.trim(); render(); }));

$("themeBtn").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  $("themeBtn").textContent = document.body.classList.contains("dark") ? "☀" : "◌";
});

const hour = new Date().getHours();
$("greeting").textContent = `${hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}, Siddharth`;
render();
