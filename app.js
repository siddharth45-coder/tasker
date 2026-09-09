const STORAGE_KEY = "tasker.tasks.v1";
const THEME_KEY = "tasker.theme.v1";

const seedTasks = [
  { id: crypto.randomUUID(), title: "Plan semester project", description: "Define the feature list and break the work into milestones.", due: new Date().toISOString().slice(0,10), priority: "high", tag: "College", completed: false, createdAt: Date.now() - 4000 },
  { id: crypto.randomUUID(), title: "Practice Java DSA", description: "Solve 3 array and string problems.", due: new Date(Date.now()+86400000).toISOString().slice(0,10), priority: "medium", tag: "Study", completed: false, createdAt: Date.now() - 3000 },
  { id: crypto.randomUUID(), title: "Review portfolio", description: "Clean up projects and make the README files consistent.", due: new Date(Date.now()+3*86400000).toISOString().slice(0,10), priority: "low", tag: "Personal", completed: true, createdAt: Date.now() - 2000 }
];

let tasks = loadTasks();
let activeView = "all";
let activePriority = null;
let editingId = null;

const $ = (id) => document.getElementById(id);
const taskList = $("taskList");
const template = $("taskTemplate");

function loadTasks(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return Array.isArray(saved) ? saved : seedTasks;
  } catch { return seedTasks; }
}
function saveTasks(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
function startOfToday(){ const d=new Date(); d.setHours(0,0,0,0); return d; }
function parseDate(value){ return value ? new Date(`${value}T00:00:00`) : null; }
function dateText(value){
  if(!value) return "No due date";
  const d=parseDate(value); if(!d) return "No due date";
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric"});
}
function priorityRank(p){ return ({high:3,medium:2,low:1})[p] || 0; }
function filteredTasks(){
  const q=$("searchInput").value.trim().toLowerCase();
  let result=tasks.filter(t=>{
    const due=parseDate(t.due); const today=startOfToday();
    if(activePriority && t.priority!==activePriority) return false;
    if(activeView==="today" && (!due || due.getTime()!==today.getTime())) return false;
    if(activeView==="upcoming" && (!due || due<=today)) return false;
    if(activeView==="completed" && !t.completed) return false;
    if(activeView==="all" && t.completed && false) return false;
    if(q && !`${t.title} ${t.description||""} ${t.tag||""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const sort=$("sortSelect").value;
  result.sort((a,b)=>{
    if(sort==="due") return (parseDate(a.due)?.getTime()??Infinity)-(parseDate(b.due)?.getTime()??Infinity);
    if(sort==="priority") return priorityRank(b.priority)-priorityRank(a.priority);
    if(sort==="title") return a.title.localeCompare(b.title);
    return b.createdAt-a.createdAt;
  });
  return result;
}
function render(){
  const visible=filteredTasks(); taskList.innerHTML="";
  if(!visible.length){
    taskList.innerHTML='<div class="empty"><strong>No tasks here</strong><span>Create a task or change your filters to see more.</span></div>';
  } else visible.forEach(renderTask);
  updateStats(); updateNavCounts();
}
function renderTask(task){
  const node=template.content.firstElementChild.cloneNode(true);
  if(task.completed) node.classList.add("completed");
  node.querySelector(".task-title").textContent=task.title;
  node.querySelector(".task-description").textContent=task.description||"";
  node.querySelector(".task-description").hidden=!task.description;
  const badge=node.querySelector(".priority-badge"); badge.textContent=task.priority; badge.classList.add(task.priority);
  const due=node.querySelector(".task-due"); due.textContent=`Due ${dateText(task.due)}`;
  if(task.tag) node.querySelector(".task-tag").textContent=task.tag; else node.querySelector(".task-tag").hidden=true;
  node.querySelector(".check-btn").addEventListener("click",()=>toggleTask(task.id));
  node.querySelector(".edit-btn").addEventListener("click",()=>openModal(task.id));
  node.querySelector(".delete-btn").addEventListener("click",()=>deleteTask(task.id));
  taskList.appendChild(node);
}
function updateStats(){
  const done=tasks.filter(t=>t.completed).length;
  $("statTotal").textContent=tasks.length;
  $("statOpen").textContent=tasks.length-done;
  $("statDone").textContent=done;
  $("statHigh").textContent=tasks.filter(t=>t.priority==="high"&&!t.completed).length;
  const pct=tasks.length?Math.round(done/tasks.length*100):0;
  $("progressText").textContent=`${pct}%`;
  $("progressBar").style.width=`${pct}%`;
}
function updateNavCounts(){
  const today=startOfToday();
  $("allCount").textContent=tasks.filter(t=>!t.completed).length;
  $("todayCount").textContent=tasks.filter(t=>!t.completed&&parseDate(t.due)?.getTime()===today.getTime()).length;
  $("upcomingCount").textContent=tasks.filter(t=>!t.completed&&parseDate(t.due)>today).length;
  $("completedCount").textContent=tasks.filter(t=>t.completed).length;
}
function setView(view){
  activeView=view; activePriority=null;
  document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.view===view));
  const titles={all:["All tasks","Everything you need to get done in one place."],today:["Today","Stay focused on what needs your attention today."],upcoming:["Upcoming","See what is coming next."],completed:["Completed","A record of the work you have finished."]};
  $("viewTitle").textContent=titles[view][0]; $("viewSubtitle").textContent=titles[view][1]; render();
}
function setPriority(priority){ activePriority=priority; activeView="all"; document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.priority===priority)); $("viewTitle").textContent=`${priority[0].toUpperCase()+priority.slice(1)} priority`; $("viewSubtitle").textContent=`Tasks marked ${priority} priority.`; render(); }
function openModal(id=null){
  editingId=id; const task=tasks.find(t=>t.id===id);
  $("modalTitle").textContent=task?"Edit task":"Create task";
  $("taskId").value=id||""; $("taskTitle").value=task?.title||""; $("taskDescription").value=task?.description||""; $("taskDue").value=task?.due||""; $("taskPriority").value=task?.priority||"medium"; $("taskTag").value=task?.tag||"";
  $("modal").classList.remove("hidden"); setTimeout(()=>$("taskTitle").focus(),30);
}
function closeModal(){ $("modal").classList.add("hidden"); editingId=null; $("taskForm").reset(); }
function toggleTask(id){ const t=tasks.find(x=>x.id===id); if(t){t.completed=!t.completed; saveTasks(); render();} }
function deleteTask(id){ if(confirm("Delete this task?")){ tasks=tasks.filter(t=>t.id!==id); saveTasks(); render(); } }

$("taskForm").addEventListener("submit",e=>{
  e.preventDefault();
  const data={title:$("taskTitle").value.trim(),description:$("taskDescription").value.trim(),due:$("taskDue").value,priority:$("taskPriority").value,tag:$("taskTag").value.trim()};
  if(!data.title) return;
  if(editingId){ const t=tasks.find(x=>x.id===editingId); Object.assign(t,data); }
  else tasks.unshift({id:crypto.randomUUID(),...data,completed:false,createdAt:Date.now()});
  saveTasks(); closeModal(); render();
});
$("newTaskTop").addEventListener("click",()=>openModal()); $("closeModal").addEventListener("click",closeModal); $("cancelBtn").addEventListener("click",closeModal);
$("modal").addEventListener("click",e=>{if(e.target===$("modal")) closeModal();});
$("searchInput").addEventListener("input",render); $("sortSelect").addEventListener("change",render);

document.querySelectorAll("[data-view]").forEach(el=>el.addEventListener("click",()=>setView(el.dataset.view)));
document.querySelectorAll("[data-priority]").forEach(el=>el.addEventListener("click",()=>setPriority(el.dataset.priority)));

function updateThemeIcon(){ $("themeBtn").textContent=document.body.classList.contains("dark")?"☀":"☾"; }
if(localStorage.getItem(THEME_KEY)==="dark") document.body.classList.add("dark");
updateThemeIcon();
$("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("dark"); localStorage.setItem(THEME_KEY,document.body.classList.contains("dark")?"dark":"light"); updateThemeIcon();});
$("focusBtn").addEventListener("click",()=>{activePriority=null;activeView="today";setView("today");document.querySelector(".hero").scrollIntoView({behavior:"smooth",block:"start"});});
$("dateLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"});
render();
