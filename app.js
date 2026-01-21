const STORAGE_KEY = "todo-bloom-items";

const todoForm = document.querySelector("#todo-form");
const taskInput = document.querySelector("#task-input");
const tagInput = document.querySelector("#tag-input");
const dateInput = document.querySelector("#date-input");
const todoList = document.querySelector("#todo-list");
const todoTemplate = document.querySelector("#todo-template");
const taskCount = document.querySelector("#task-count");
const completeCount = document.querySelector("#complete-count");
const exportBtn = document.querySelector("#export-btn");
const importInput = document.querySelector("#import-input");
const editDialog = document.querySelector("#edit-dialog");
const editTitle = document.querySelector("#edit-title");
const editTag = document.querySelector("#edit-tag");
const editDate = document.querySelector("#edit-date");

let todos = loadTodos();
let activeFilter = "all";
let editId = null;

const filters = document.querySelectorAll(".chip");

filters.forEach((chip) => {
  chip.addEventListener("click", () => {
    filters.forEach((button) => button.classList.remove("is-active"));
    chip.classList.add("is-active");
    activeFilter = chip.dataset.filter;
    renderTodos();
  });
});

todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }
  const newTodo = {
    id: crypto.randomUUID(),
    title,
    tag: tagInput.value.trim(),
    due: dateInput.value,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  todos.unshift(newTodo);
  persistTodos();
  todoForm.reset();
  taskInput.focus();
  renderTodos();
});

function renderTodos() {
  todoList.innerHTML = "";
  const filtered = todos.filter((todo) => {
    if (activeFilter === "active") return !todo.completed;
    if (activeFilter === "complete") return todo.completed;
    return true;
  });

  filtered.forEach((todo) => {
    const clone = todoTemplate.content.cloneNode(true);
    const card = clone.querySelector(".todo-card");
    const checkbox = clone.querySelector(".checkbox");
    const title = clone.querySelector("h3");
    const meta = clone.querySelector(".meta");
    const editButton = clone.querySelector('[data-action="edit"]');
    const deleteButton = clone.querySelector('[data-action="delete"]');

    card.dataset.id = todo.id;
    if (todo.completed) card.classList.add("completed");
    title.textContent = todo.title;
    meta.textContent = formatMeta(todo);

    checkbox.addEventListener("click", () => toggleTodo(todo.id));
    editButton.addEventListener("click", () => openEdit(todo));
    deleteButton.addEventListener("click", () => removeTodo(todo.id));

    todoList.appendChild(clone);
  });

  taskCount.textContent = String(todos.length);
  completeCount.textContent = String(todos.filter((todo) => todo.completed).length);
}

function formatMeta(todo) {
  const parts = [];
  if (todo.tag) parts.push(todo.tag);
  if (todo.due) {
    const formatted = new Date(todo.due + "T00:00:00").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    parts.push(`Due ${formatted}`);
  }
  if (!parts.length) return "No tag or due date";
  return parts.join(" · ");
}

function toggleTodo(id) {
  todos = todos.map((todo) =>
    todo.id === id ? { ...todo, completed: !todo.completed } : todo
  );
  persistTodos();
  renderTodos();
}

function removeTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  persistTodos();
  renderTodos();
}

function openEdit(todo) {
  editId = todo.id;
  editTitle.value = todo.title;
  editTag.value = todo.tag;
  editDate.value = todo.due;
  editDialog.showModal();
}

editDialog.addEventListener("close", () => {
  if (editDialog.returnValue !== "default") {
    editId = null;
    return;
  }
  const updatedTitle = editTitle.value.trim();
  if (!updatedTitle) {
    editId = null;
    return;
  }
  todos = todos.map((todo) =>
    todo.id === editId
      ? { ...todo, title: updatedTitle, tag: editTag.value.trim(), due: editDate.value }
      : todo
  );
  editId = null;
  persistTodos();
  renderTodos();
});

exportBtn.addEventListener("click", () => {
  const payload = JSON.stringify(todos, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `todo-bloom-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) throw new Error("Invalid payload");
    const normalized = parsed
      .filter((item) => item && item.title)
      .map((item) => ({
        id: item.id || crypto.randomUUID(),
        title: String(item.title),
        tag: item.tag ? String(item.tag) : "",
        due: item.due || "",
        completed: Boolean(item.completed),
        createdAt: item.createdAt || new Date().toISOString(),
      }));
    todos = normalized;
    persistTodos();
    renderTodos();
  } catch (error) {
    alert("Sorry, that file doesn't look like a Todo Bloom export.");
  } finally {
    importInput.value = "";
  }
});

function persistTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function loadTodos() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    return [];
  }
}

renderTodos();
