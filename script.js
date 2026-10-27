// ---------- 1. DATA ----------
// Each task: { id, title, priority, dueDate, status, createdAt }
// Statuses: "Pending" | "In Progress" | "Completed"
let tasks = [];
let currentFilter = "All";
let editingId = null;
const STORAGE_KEY = "taskManager.tasks";

// ---------- 2. ELEMENTS ----------
const form = document.getElementById("taskForm");
const titleInput = document.getElementById("title");
const priorityInput = document.getElementById("priority");
const dueInput = document.getElementById("dueDate");
const saveBtn = document.getElementById("saveBtn");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const errorBox = document.getElementById("error");
const listEl = document.getElementById("taskList");
const emptyEl = document.getElementById("empty");
const searchInput = document.getElementById("search");

// ---------- 3. STORAGE (data stays after refresh) ----------
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    tasks = [];
  }
}
function saveTasks() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); } catch (e) {}
}

// ---------- 4. CREATE / UPDATE ----------
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const title = titleInput.value.trim();
  if (title === "") {
    errorBox.textContent = "Please enter a task name.";
    return;
  }
  errorBox.textContent = "";

  if (editingId) {
    const t = tasks.find(x => x.id === editingId);
    t.title = title;
    t.priority = priorityInput.value;
    t.dueDate = dueInput.value;
    stopEditing();
  } else {
    tasks.unshift({
      id: Date.now().toString(),
      title: title,
      priority: priorityInput.value,
      dueDate: dueInput.value,
      status: "Pending",
      createdAt: new Date().toISOString()
    });
    form.reset();
    priorityInput.value = "Medium";
  }
  saveTasks();
  render();
});

function startEditing(id) {
  const t = tasks.find(x => x.id === id);
  editingId = id;
  titleInput.value = t.title;
  priorityInput.value = t.priority;
  dueInput.value = t.dueDate;
  formTitle.textContent = "Edit Task";
  saveBtn.textContent = "Update Task";
  cancelBtn.classList.remove("hidden");
  titleInput.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function stopEditing() {
  editingId = null;
  form.reset();
  priorityInput.value = "Medium";
  formTitle.textContent = "Add New Task";
  saveBtn.textContent = "Add Task";
  cancelBtn.classList.add("hidden");
}
cancelBtn.addEventListener("click", stopEditing);

// ---------- 5. DELETE / STATUS ----------
function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  tasks = tasks.filter(t => t.id !== id);
  if (editingId === id) stopEditing();
  saveTasks();
  render();
}
function setStatus(id, status) {
  const t = tasks.find(x => x.id === id);
  t.status = status;
  saveTasks();
  render();
}
document.getElementById("clearDone").addEventListener("click", function () {
  const count = tasks.filter(t => t.status === "Completed").length;
  if (count === 0) return;
  if (!confirm("Remove " + count + " completed task(s)?")) return;
  tasks = tasks.filter(t => t.status !== "Completed");
  saveTasks();
  render();
});

// ---------- 6. FILTER + SEARCH ----------
document.querySelectorAll(".filter").forEach(btn => {
  btn.addEventListener("click", function () {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    render();
  });
});
searchInput.addEventListener("input", render);

// ---------- 7. RENDER (draw everything on screen) ----------
function isOverdue(t) {
  if (!t.dueDate || t.status === "Completed") return false;
  const today = new Date().toISOString().slice(0, 10);
  return t.dueDate < today;
}

function makeTaskItem(t) {
  const li = document.createElement("li");
  li.className = "task " + t.priority + (t.status === "Completed" ? " done" : "");

  // top row: checkbox + title
  const top = document.createElement("div");
  top.className = "top";
  const check = document.createElement("input");
  check.type = "checkbox";
  check.checked = t.status === "Completed";
  check.addEventListener("change", () => setStatus(t.id, check.checked ? "Completed" : "Pending"));
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = t.title; // textContent keeps user text safe from HTML injection
  top.append(check, name);

  // info chips
  const meta = document.createElement("div");
  meta.className = "meta";
  const pr = document.createElement("span");
  pr.className = "chip";
  pr.textContent = t.priority + " priority";
  meta.appendChild(pr);
  if (t.dueDate) {
    const due = document.createElement("span");
    due.className = "chip" + (isOverdue(t) ? " overdue" : "");
    due.textContent = (isOverdue(t) ? "⚠ Overdue: " : "Due: ") + t.dueDate;
    meta.appendChild(due);
  }

  // actions: status dropdown, edit, delete
  const actions = document.createElement("div");
  actions.className = "actions";
  const select = document.createElement("select");
  ["Pending", "In Progress", "Completed"].forEach(s => {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    if (s === t.status) o.selected = true;
    select.appendChild(o);
  });
  select.addEventListener("change", () => setStatus(t.id, select.value));
  const edit = document.createElement("button");
  edit.className = "icon";
  edit.textContent = "✏️";
  edit.title = "Edit";
  edit.addEventListener("click", () => startEditing(t.id));
  const del = document.createElement("button");
  del.className = "icon";
  del.textContent = "🗑️";
  del.title = "Delete";
  del.addEventListener("click", () => deleteTask(t.id));
  actions.append(select, edit, del);

  li.append(top, meta, actions);
  return li;
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = tasks.filter(t =>
    (currentFilter === "All" || t.status === currentFilter) &&
    t.title.toLowerCase().includes(query)
  );

  listEl.innerHTML = "";
  visible.forEach(t => listEl.appendChild(makeTaskItem(t)));
  emptyEl.classList.toggle("hidden", visible.length > 0);

  // counters + progress bar
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === "Pending").length;
  const progress = tasks.filter(t => t.status === "In Progress").length;
  const done = tasks.filter(t => t.status === "Completed").length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  document.getElementById("totalCount").textContent = total;
  document.getElementById("pendingCount").textContent = pending;
  document.getElementById("progressCount").textContent = progress;
  document.getElementById("doneCount").textContent = done;
  document.getElementById("barFill").style.width = percent + "%";
  document.getElementById("barText").textContent = percent + "% completed";
}

// ---------- 8. START ----------
document.getElementById("today").textContent =
  new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
loadTasks();
render();
