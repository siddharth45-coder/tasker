const $ = (id) => document.getElementById(id);
const state = { tasks: [], view: "all", project: null, editingId: null };
const statusNext = { todo: "progress", progress: "done", done: "todo" };
const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json", ...(options.headers || {}) }, ...options });
  if (res.status === 401) { window.location.href = "/login"; throw new Error("Authentication required"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function toast(message) { const el = $("toast"); el.textContent = message; el.classList.remove("hidden"); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => el.classList.add("hidden"), 2200); }
function formatDue(value) { if (!value) return "No due date"; if (value === today()) return "Due today"; if (value === plusDays(1)) return "Due tomorrow"; return `Due ${new Date(`${value}T00:00:00`).toLocaleDateString(undefined,{month:"short",day:"numeric"})}`; }
function filteredTasks() {
  const q = $("searchInput").value.trim().toLowerCase(); const priority = $("filterSelect").value;
  return state.tasks.filter(t => {
    if (state.project && t.project !== state.project) return false;
    if (priority !== "all" && t.priority !== priority) return false;
    if (state.view === "active" && t.status === "done") return false;
    if (q && !`${t.title} ${t.description} ${t.project} ${t.priority}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
function render() {
  const visible = filteredTasks();
  ["todo","progress","done"].forEach(s => $(s+"List").innerHTML = "");
  const groups = {todo:[],progress:[],done:[]}; visible.forEach(t => groups[t.status].push(t));
  Object.entries(groups).forEach(([s,items]) => items.forEach(t => renderTask(t,$(s+"List"))));
  $("todoCount").textContent=groups.todo.length; $("progressCount").textContent=groups.progress.length; $("doneCount").textContent=groups.done.length;
  $("emptyState").classList.toggle("hidden", visible.length > 0 || state.view === "calendar" || state.view === "analytics");
  const done=state.tasks.filter(t=>t.status==="done").length, progress=state.tasks.filter(t=>t.status==="progress").length, overdue=state.tasks.filter(t=>t.status!=="done"&&t.due&&t.due<today()).length;
  $("statTotal").textContent=state.tasks.length; $("statDone").textContent=done; $("statProgress").textContent=progress; $("statOverdue").textContent=overdue;
  $("productivity").textContent=state.tasks.length?`${Math.round(done/state.tasks.length*100)}%`:"0%";
  $("productivityTrend").textContent=`${done} completed`;
  $("activeCount").textContent=state.view==="calendar"?"Tasks due this month":state.view==="analytics"?"Performance overview":`${state.tasks.filter(t=>t.status!=="done").length} active tasks`;
  renderSpecialView();
}
function renderTask(task,list) {
  const node=$("taskTemplate").content.firstElementChild.cloneNode(true), accent=node.querySelector(".task-accent"), bar=node.querySelector(".task-progress-bar");
  node.dataset.id=task.id; node.querySelector(".task-title").textContent=task.title; node.querySelector(".task-tagline").textContent=task.project; node.querySelector(".task-due").textContent=formatDue(task.due); node.querySelector(".task-priority").textContent=task.priority;
  bar.style.width=`${task.status==="done"?100:Math.max(8,task.progress||0)}%`;
  const tone={todo:"var(--purple)",progress:"var(--blue)",done:"var(--green)"}[task.status]; accent.style.background=tone; bar.style.background=tone;
  node.querySelector(".more-btn").addEventListener("click",e=>{e.stopPropagation();document.querySelectorAll(".task-menu").forEach(m=>m.classList.add("hidden"));node.querySelector(".task-menu").classList.toggle("hidden")});
  node.querySelector(".edit-btn").addEventListener("click",()=>openModal(task.id)); node.querySelector(".delete-btn").addEventListener("click",()=>removeTask(task.id)); node.querySelector(".next-btn").addEventListener("click",()=>moveTask(task.id,statusNext[task.status]));
  node.addEventListener("dragstart",()=>{node.classList.add("dragging");window.dragId=task.id}); node.addEventListener("dragend",()=>node.classList.remove("dragging")); list.appendChild(node);
}
function renderSpecialView(){
  const cal=$("calendarView"), analytics=$("analyticsView"), board=$("board"); cal.classList.toggle("hidden",state.view!=="calendar"); analytics.classList.toggle("hidden",state.view!=="analytics"); board.classList.toggle("hidden",state.view==="calendar"||state.view==="analytics");
  if(state.view==="calendar") renderCalendar(cal); if(state.view==="analytics") renderAnalytics(analytics);
}
function renderCalendar(el){
  const now=new Date(), year=now.getFullYear(), month=now.getMonth(), first=new Date(year,month,1), days=new Date(year,month+1,0).getDate(), start=first.getDay();
  let html=`<h3>${now.toLocaleDateString(undefined,{month:"long",year:"numeric"})}</h3><div class="calendar-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="calendar-head">${x}</div>`).join("")}`;
  for(let i=0;i<start;i++) html+="<div></div>";
  for(let d=1;d<=days;d++){const key=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, items=state.tasks.filter(t=>t.due===key);html+=`<div class="calendar-day ${key===today()?"today":""}"><strong>${d}</strong>${items.map(t=>`<span class="calendar-task">${escapeHtml(t.title)}</span>`).join("")}</div>`}
  el.innerHTML=html+"</div>";
}
function renderAnalytics(el){
  const total=state.tasks.length, done=state.tasks.filter(t=>t.status==="done").length, high=state.tasks.filter(t=>t.priority==="high"&&t.status!=="done").length, completion=total?Math.round(done/total*100):0;
  el.innerHTML=`<div class="analytics-cards"><div class="analytics-card"><span>Completion rate</span><strong>${completion}%</strong><div class="progress-wide"><span style="width:${completion}%"></span></div></div><div class="analytics-card"><span>Open work</span><strong>${total-done}</strong><small> tasks remaining</small></div><div class="analytics-card"><span>High priority</span><strong>${high}</strong><small> need attention</small></div></div>`;
}
function escapeHtml(s){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
async function loadTasks(){try{state.tasks=(await api("/api/tasks")).tasks;render()}catch(e){toast(e.message)}}
function openModal(id=null){state.editingId=id;const t=state.tasks.find(x=>x.id===id);$("modalTitle").textContent=t?"Edit task":"Create task";$("taskId").value=id||"";$("taskTitle").value=t?.title||"";$("taskDescription").value=t?.description||"";$("taskDue").value=t?.due||today();$("taskPriority").value=t?.priority||"medium";$("taskProject").value=t?.project||"Website Redesign";$("taskStatus").value=t?.status||"todo";$("modal").classList.remove("hidden");setTimeout(()=>$("taskTitle").focus(),30)}
function closeModal(){$("modal").classList.add("hidden");state.editingId=null;$("taskForm").reset()}
async function saveTask(e){e.preventDefault();const data={title:$("taskTitle").value.trim(),description:$("taskDescription").value.trim(),due:$("taskDue").value,priority:$("taskPriority").value,project:$("taskProject").value,status:$("taskStatus").value};if(!data.title)return;try{if(state.editingId)await api(`/api/tasks/${state.editingId}`,{method:"PUT",body:JSON.stringify(data)});else await api("/api/tasks",{method:"POST",body:JSON.stringify(data)});closeModal();await loadTasks();toast(state.editingId?"Task updated":"Task created")}catch(e){toast(e.message)}}
async function removeTask(id){if(!confirm("Delete this task?"))return;try{await api(`/api/tasks/${id}`,{method:"DELETE"});await loadTasks();toast("Task deleted")}catch(e){toast(e.message)}}
async function moveTask(id,status){try{await api(`/api/tasks/${id}/status`,{method:"PATCH",body:JSON.stringify({status})});await loadTasks();toast(status==="done"?"Task completed":"Task moved")}catch(e){toast(e.message)}}
function setView(view){state.view=view;state.project=null;document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===view));$("viewTitle").textContent={all:"My tasks",active:"My tasks",board:"Board",calendar:"Calendar",analytics:"Analytics"}[view]||"My tasks";render()}

document.querySelectorAll(".nav-item").forEach(el=>el.addEventListener("click",()=>setView(el.dataset.view)));
document.querySelectorAll(".project-item").forEach(el=>el.addEventListener("click",()=>{state.project=el.dataset.project;state.view="all";document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view==="all"));$("viewTitle").textContent=state.project;render()}));
$("allTasksBtn").addEventListener("click",()=>{state.project=null;setView("all")});$("searchInput").addEventListener("input",render);$("filterSelect").addEventListener("change",render);$("newTaskBtn").addEventListener("click",()=>openModal());$("newTaskTop").addEventListener("click",()=>openModal());$("closeModal").addEventListener("click",closeModal);$("cancelBtn").addEventListener("click",closeModal);$("modal").addEventListener("click",e=>{if(e.target===$("modal"))closeModal()});$("taskForm").addEventListener("submit",saveTask);
["todo","progress","done"].forEach(status=>$(status+"List").addEventListener("dragover",e=>e.preventDefault()));document.querySelectorAll(".board-column").forEach(col=>col.addEventListener("drop",()=>{if(window.dragId)moveTask(window.dragId,col.dataset.status)}));
$("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("dark");localStorage.setItem("taskflow.theme",document.body.classList.contains("dark")?"dark":"light")});if(localStorage.getItem("taskflow.theme")==="dark")document.body.classList.add("dark");
document.addEventListener("click",()=>document.querySelectorAll(".task-menu").forEach(m=>m.classList.add("hidden")));
const hour=new Date().getHours(), name=$("greeting").textContent.split(", ").slice(1).join(", ");$("greeting").textContent=`${hour<12?"Good morning":hour<18?"Good afternoon":"Good evening"}, ${name}`;
loadTasks();
