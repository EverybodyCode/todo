const STORAGE_KEY = "todo-flow-items";
const FILTERS = {
  all: () => true,
  open: (item) => !item.completed,
  done: (item) => item.completed,
};

const listEl = document.getElementById("todo-list");
const template = document.getElementById("todo-item-template");
const addBtn = document.getElementById("add-btn");
const titleInput = document.getElementById("todo-title");
const notesInput = document.getElementById("todo-notes");
const emptyState = document.getElementById("empty-state");
const totalCount = document.getElementById("total-count");
const openCount = document.getElementById("open-count");
const doneCount = document.getElementById("done-count");
const exportBtn = document.getElementById("export-btn");
const importFile = document.getElementById("import-file");
const clearBtn = document.getElementById("clear-btn");
const filterButtons = Array.from(document.querySelectorAll(".filter"));

let currentFilter = "all";
let todos = loadTodos();

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      id: item.id || crypto.randomUUID(),
      title: item.title || "",
      notes: item.notes || "",
      completed: Boolean(item.completed),
      createdAt: item.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.warn("Failed to load todos", error);
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function updateStats() {
  const total = todos.length;
  const done = todos.filter((todo) => todo.completed).length;
  const open = total - done;
  totalCount.textContent = total;
  openCount.textContent = open;
  doneCount.textContent = done;
}

function formatDate(iso) {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderTodos() {
  listEl.innerHTML = "";
  const visible = todos.filter(FILTERS[currentFilter]);
  emptyState.hidden = visible.length > 0;

  visible
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((todo) => {
      const clone = template.content.cloneNode(true);
      const itemEl = clone.querySelector(".todo-item");
      const checkbox = clone.querySelector("input[type='checkbox']");
      const titleEl = clone.querySelector("h3");
      const notesEl = clone.querySelector("p");
      const metaEl = clone.querySelector(".meta");
      const deleteBtn = clone.querySelector(".icon-btn");

      itemEl.classList.toggle("completed", todo.completed);
      checkbox.checked = todo.completed;
      titleEl.textContent = todo.title;
      notesEl.textContent = todo.notes || "No notes added.";
      metaEl.textContent = todo.completed ? "Completed" : "Created " + formatDate(todo.createdAt);

      checkbox.addEventListener("change", () => {
        todo.completed = checkbox.checked;
        saveTodos();
        updateStats();
        renderTodos();
      });

      deleteBtn.addEventListener("click", () => {
        todos = todos.filter((item) => item.id !== todo.id);
        saveTodos();
        updateStats();
        renderTodos();
      });

      listEl.appendChild(clone);
    });
}

function addTodo() {
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    return;
  }
  const notes = notesInput.value.trim();
  const newTodo = {
    id: crypto.randomUUID(),
    title,
    notes,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.unshift(newTodo);
  titleInput.value = "";
  notesInput.value = "";
  saveTodos();
  updateStats();
  renderTodos();
  titleInput.focus();
}

function exportTodos() {
  const payload = {
    exportedAt: new Date().toISOString(),
    items: todos,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "todo-flow-backup.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function importTodos(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(reader.result);
      const items = Array.isArray(payload) ? payload : payload.items;
      if (!Array.isArray(items)) {
        throw new Error("Invalid import format");
      }
      const mapped = items.map((item) => ({
        id: item.id || crypto.randomUUID(),
        title: item.title || "Untitled task",
        notes: item.notes || "",
        completed: Boolean(item.completed),
        createdAt: item.createdAt || new Date().toISOString(),
      }));
      todos = mapped;
      saveTodos();
      updateStats();
      renderTodos();
    } catch (error) {
      alert("Sorry, we could not import that file.");
      console.error(error);
    }
  };
  reader.readAsText(file);
}

function clearCompleted() {
  todos = todos.filter((todo) => !todo.completed);
  saveTodos();
  updateStats();
  renderTodos();
}

function setFilter(filter) {
  currentFilter = filter;
  filterButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filter);
  });
  renderTodos();
}

addBtn.addEventListener("click", addTodo);
notesInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTodo();
  }
});

titleInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTodo();
  }
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter));
});

exportBtn.addEventListener("click", exportTodos);
importFile.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    importTodos(file);
  }
  importFile.value = "";
});

clearBtn.addEventListener("click", clearCompleted);

updateStats();
renderTodos();
