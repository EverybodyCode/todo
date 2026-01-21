const STORAGE_KEY = "todo-bloom-items";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const taskCount = document.querySelector("#task-count");
const completedCount = document.querySelector("#completed-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const exportButton = document.querySelector("#export-data");
const importInput = document.querySelector("#import-file");
const filterButtons = Array.from(document.querySelectorAll(".filters button"));

let todos = [];
let activeFilter = "all";

const generateId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const loadTodos = () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    todos = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      todos = parsed;
    } else {
      todos = [];
    }
  } catch (error) {
    console.warn("Failed to parse stored data", error);
    todos = [];
  }
};

const persistTodos = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
};

const formatDate = (isoString) => {
  if (!isoString) return "Just now";
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const updateCounts = () => {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;
  taskCount.textContent = total;
  completedCount.textContent = completed;
};

const applyFilter = (items) => {
  if (activeFilter === "active") {
    return items.filter((todo) => !todo.completed);
  }
  if (activeFilter === "completed") {
    return items.filter((todo) => todo.completed);
  }
  return items;
};

const renderTodos = () => {
  list.innerHTML = "";
  const filtered = applyFilter(todos);

  if (filtered.length === 0) {
    const empty = document.createElement("li");
    empty.className = "todo-item";
    empty.innerHTML = `
      <div class="todo-content">
        <p>No tasks here yet.</p>
        <div class="todo-meta">Add something above to get started.</div>
      </div>
    `;
    list.appendChild(empty);
    updateCounts();
    return;
  }

  filtered.forEach((todo) => {
    const item = document.createElement("li");
    item.className = "todo-item";
    if (todo.completed) {
      item.classList.add("completed");
    }

    item.innerHTML = `
      <input type="checkbox" aria-label="Mark ${todo.text} as complete" ${
        todo.completed ? "checked" : ""
      } />
      <div class="todo-content">
        <p>${todo.text}</p>
        <div class="todo-meta">Created ${formatDate(todo.createdAt)}</div>
      </div>
      <div class="todo-actions">
        <button type="button" data-action="delete">Delete</button>
      </div>
    `;

    const checkbox = item.querySelector("input[type=checkbox]");
    checkbox.addEventListener("change", () => toggleTodo(todo.id));

    const deleteButton = item.querySelector("button[data-action=delete]");
    deleteButton.addEventListener("click", () => removeTodo(todo.id));

    list.appendChild(item);
  });

  updateCounts();
};

const addTodo = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return;

  todos.unshift({
    id: generateId(),
    text: trimmed,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  persistTodos();
  renderTodos();
};

const toggleTodo = (id) => {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  persistTodos();
  renderTodos();
};

const removeTodo = (id) => {
  todos = todos.filter((todo) => todo.id !== id);
  persistTodos();
  renderTodos();
};

const clearCompleted = () => {
  todos = todos.filter((todo) => !todo.completed);
  persistTodos();
  renderTodos();
};

const exportTodos = () => {
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
  link.download = `todo-bloom-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const importTodos = async (file) => {
  if (!file) return;

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const incoming = Array.isArray(payload) ? payload : payload.items;
    if (!Array.isArray(incoming)) {
      throw new Error("Invalid import file");
    }

    const sanitized = incoming
      .filter((item) => item && typeof item.text === "string")
      .map((item) => ({
        id: item.id || generateId(),
        text: item.text.trim(),
        completed: Boolean(item.completed),
        createdAt: item.createdAt || new Date().toISOString(),
      }))
      .filter((item) => item.text.length > 0);

    const existingIds = new Set(todos.map((todo) => todo.id));
    const merged = [...todos];

    sanitized.forEach((item) => {
      if (!existingIds.has(item.id)) {
        merged.push(item);
      }
    });

    todos = merged;
    persistTodos();
    renderTodos();
  } catch (error) {
    console.error(error);
    alert("Unable to import that file. Please use a valid export.");
  } finally {
    importInput.value = "";
  }
};

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(input.value);
  input.value = "";
});

clearCompletedButton.addEventListener("click", clearCompleted);
exportButton.addEventListener("click", exportTodos);
importInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  importTodos(file);
});

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filterButtons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    renderTodos();
  });
});

loadTodos();
renderTodos();
