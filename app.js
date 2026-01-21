const STORAGE_KEY = "todo-bloom-items";

const taskInput = document.getElementById("taskInput");
const addBtn = document.getElementById("addBtn");
const taskList = document.getElementById("taskList");
const taskCount = document.getElementById("taskCount");
const taskMeta = document.getElementById("taskMeta");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");
const statusText = document.getElementById("statusText");
const taskTemplate = document.getElementById("taskTemplate");

let tasks = loadTasks();

function loadTasks() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (error) {
    console.error("Failed to parse stored tasks", error);
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  statusText.textContent = "All changes saved locally";
}

function updateSummary() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.completed).length;
  taskCount.textContent = `${total} task${total === 1 ? "" : "s"}`;

  if (total === 0) {
    taskMeta.textContent = "Start by adding your first task.";
  } else if (completed === total) {
    taskMeta.textContent = "Everything is complete. Celebrate the win!";
  } else {
    taskMeta.textContent = `${completed} complete · ${total - completed} remaining`;
  }

  clearCompletedBtn.disabled = completed === 0;
}

function renderTasks() {
  taskList.innerHTML = "";
  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "task task--empty";
    empty.textContent = "No tasks yet. Add one above.";
    taskList.appendChild(empty);
    updateSummary();
    return;
  }

  tasks.forEach((task) => {
    const clone = taskTemplate.content.cloneNode(true);
    const listItem = clone.querySelector("li");
    const checkbox = clone.querySelector(".task__toggle");
    const text = clone.querySelector(".task__text");
    const actions = clone.querySelectorAll("[data-action]");

    checkbox.checked = task.completed;
    text.textContent = task.title;
    text.classList.toggle("completed", task.completed);

    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      text.classList.toggle("completed", task.completed);
      saveTasks();
      updateSummary();
    });

    actions.forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        if (action === "delete") {
          tasks = tasks.filter((item) => item.id !== task.id);
          saveTasks();
          renderTasks();
        }

        if (action === "edit") {
          const updated = prompt("Edit task", task.title);
          if (updated === null) return;
          const trimmed = updated.trim();
          if (!trimmed) return;
          task.title = trimmed;
          saveTasks();
          renderTasks();
        }
      });
    });

    taskList.appendChild(clone);
  });

  updateSummary();
}

function addTask() {
  const title = taskInput.value.trim();
  if (!title) return;
  tasks.unshift({
    id: crypto.randomUUID(),
    title,
    completed: false,
    createdAt: new Date().toISOString(),
  });
  taskInput.value = "";
  saveTasks();
  renderTasks();
}

function exportTasks() {
  const data = {
    exportedAt: new Date().toISOString(),
    tasks,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `todo-bloom-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function importTasks(file) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const parsed = JSON.parse(event.target.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.tasks;
      if (!Array.isArray(incoming)) {
        throw new Error("Invalid file format");
      }
      const sanitized = incoming
        .filter((task) => task && typeof task.title === "string")
        .map((task) => ({
          id: task.id || crypto.randomUUID(),
          title: task.title.trim(),
          completed: Boolean(task.completed),
          createdAt: task.createdAt || new Date().toISOString(),
        }))
        .filter((task) => task.title.length > 0);

      tasks = sanitized;
      saveTasks();
      renderTasks();
    } catch (error) {
      alert("Sorry, we couldn't read that file. Please use a valid export.");
      console.error(error);
    }
  };
  reader.readAsText(file);
}

addBtn.addEventListener("click", addTask);

taskInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTask();
  }
});

clearCompletedBtn.addEventListener("click", () => {
  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
});

exportBtn.addEventListener("click", exportTasks);

importInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  importTasks(file);
  event.target.value = "";
});

renderTasks();
