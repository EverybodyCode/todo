const STORAGE_KEY = "todo-bloom-items";
const THEME_KEY = "todo-bloom-theme";

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const list = document.querySelector("#todo-list");
const taskCount = document.querySelector("#task-count");
const completedCount = document.querySelector("#completed-count");
const clearCompletedButton = document.querySelector("#clear-completed");
const exportButton = document.querySelector("#export-data");
const importInput = document.querySelector("#import-file");
const filterButtons = Array.from(document.querySelectorAll(".filters button"));
const themeToggle = document.querySelector("#theme-toggle");

let todos = [];
let activeFilter = "all";
let themePreferenceLocked = false;
let editingId = null;

const getPreferredTheme = () => {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") {
    themePreferenceLocked = true;
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (theme, { persist = true } = {}) => {
  if (theme !== "light" && theme !== "dark") return;
  document.body.dataset.theme = theme;
  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }
  if (persist) {
    localStorage.setItem(THEME_KEY, theme);
  }
};

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

const getMetaText = (todo) => {
  const created = `Created ${formatDate(todo.createdAt)}`;
  if (todo.updatedAt) {
    return `${created} · Edited ${formatDate(todo.updatedAt)}`;
  }
  return created;
};

const updateCounts = () => {
  const total = todos.length;
  const completed = todos.filter((todo) => todo.completed).length;
  taskCount.textContent = total;
  completedCount.textContent = completed;
};

const launchConfetti = (originElement) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const container = document.createElement("div");
  container.className = "confetti-burst";

  const originRect = originElement?.getBoundingClientRect();
  const startX = originRect
    ? originRect.left + originRect.width / 2
    : window.innerWidth / 2;
  const startY = originRect
    ? originRect.top + originRect.height / 2
    : window.innerHeight / 2;

  const colors = [
    "#5b4bff",
    "#ffb347",
    "#7bd389",
    "#ff6f91",
    "#8bd3dd",
    "#ffd166",
  ];

  const pieceCount = 28;
  let maxDuration = 0;

  for (let i = 0; i < pieceCount; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";

    const x = (Math.random() * 2 - 1) * 140;
    const y = -Math.random() * 140 - 60;
    const xEnd = x + (Math.random() * 2 - 1) * 40;
    const fall = Math.random() * 120 + 180;
    const duration = Math.random() * 0.4 + 0.9;
    maxDuration = Math.max(maxDuration, duration);

    piece.style.left = `${startX}px`;
    piece.style.top = `${startY}px`;
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.setProperty("--x", `${x}px`);
    piece.style.setProperty("--y", `${y}px`);
    piece.style.setProperty("--x-end", `${xEnd}px`);
    piece.style.setProperty("--fall", `${fall}px`);
    piece.style.setProperty("--duration", `${duration}s`);

    container.appendChild(piece);
  }

  document.body.appendChild(container);

  window.setTimeout(() => {
    container.remove();
  }, (maxDuration + 0.2) * 1000);
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
  let inputToFocus = null;

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
    const isEditing = editingId === todo.id;
    let editInput = null;
    const item = document.createElement("li");
    item.className = "todo-item";
    if (todo.completed) {
      item.classList.add("completed");
    }
    if (isEditing) {
      item.classList.add("editing");
    }

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `Mark ${todo.text} as complete`);
    checkbox.disabled = isEditing;
    checkbox.addEventListener("change", () => toggleTodo(todo.id, checkbox));

    const content = document.createElement("div");
    content.className = "todo-content";

    if (isEditing) {
      const editLabel = document.createElement("label");
      editLabel.className = "sr-only";
      editLabel.setAttribute("for", `edit-${todo.id}`);
      editLabel.textContent = "Edit task";

      editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "edit-input";
      editInput.id = `edit-${todo.id}`;
      editInput.value = todo.text;
      editInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          saveEdit(todo.id, editInput);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          cancelEditing();
        }
      });

      const meta = document.createElement("div");
      meta.className = "todo-meta";
      meta.textContent = `Editing task created ${formatDate(todo.createdAt)}`;

      content.appendChild(editLabel);
      content.appendChild(editInput);
      content.appendChild(meta);
      inputToFocus = editInput;
    } else {
      const text = document.createElement("p");
      text.textContent = todo.text;
      const meta = document.createElement("div");
      meta.className = "todo-meta";
      meta.textContent = getMetaText(todo);
      content.appendChild(text);
      content.appendChild(meta);
    }

    const actions = document.createElement("div");
    actions.className = "todo-actions";

    if (isEditing) {
      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "primary";
      saveButton.textContent = "Save";
      saveButton.addEventListener("click", () => saveEdit(todo.id, editInput));

      const cancelButton = document.createElement("button");
      cancelButton.type = "button";
      cancelButton.className = "ghost";
      cancelButton.textContent = "Cancel";
      cancelButton.addEventListener("click", () => cancelEditing());

      actions.appendChild(saveButton);
      actions.appendChild(cancelButton);
    } else {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "secondary";
      editButton.textContent = "Edit";
      editButton.addEventListener("click", () => startEditing(todo.id));

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => removeTodo(todo.id));

      actions.appendChild(editButton);
      actions.appendChild(deleteButton);
    }

    item.appendChild(checkbox);
    item.appendChild(content);
    item.appendChild(actions);
    list.appendChild(item);
  });

  updateCounts();
  if (inputToFocus) {
    requestAnimationFrame(() => {
      inputToFocus.focus();
      inputToFocus.select();
    });
  }
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
  editingId = null;
  persistTodos();
  renderTodos();
};

const toggleTodo = (id, originElement) => {
  const targetTodo = todos.find((todo) => todo.id === id);
  const wasCompleted = targetTodo?.completed;
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  if (targetTodo && !wasCompleted) {
    launchConfetti(originElement);
  }
  persistTodos();
  renderTodos();
};

const removeTodo = (id) => {
  todos = todos.filter((todo) => todo.id !== id);
  if (editingId === id) {
    editingId = null;
  }
  persistTodos();
  renderTodos();
};

const clearCompleted = () => {
  todos = todos.filter((todo) => !todo.completed);
  if (editingId && !todos.some((todo) => todo.id === editingId)) {
    editingId = null;
  }
  persistTodos();
  renderTodos();
};

const startEditing = (id) => {
  editingId = id;
  renderTodos();
};

const cancelEditing = () => {
  editingId = null;
  renderTodos();
};

const saveEdit = (id, inputElement) => {
  const trimmed = inputElement?.value.trim() || "";
  if (!trimmed) {
    inputElement?.focus();
    inputElement?.select();
    return;
  }
  todos = todos.map((todo) =>
    todo.id === id
      ? { ...todo, text: trimmed, updatedAt: new Date().toISOString() }
      : todo
  );
  editingId = null;
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
        updatedAt: item.updatedAt || null,
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

const initialTheme = getPreferredTheme();
applyTheme(initialTheme, { persist: themePreferenceLocked });

if (!themePreferenceLocked) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", (event) => {
    applyTheme(event.matches ? "dark" : "light", { persist: false });
  });
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    themePreferenceLocked = true;
    const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme, { persist: true });
  });
}
