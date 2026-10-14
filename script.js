"use strict";

const STORAGE_KEY = "beginner-todo-list-tasks";
const ACHIEVEMENTS_KEY = "tiny-wins-achievements";
const COMPLETION_HISTORY_KEY = "tiny-wins-completion-history-v1";
const FILTERS = ["all", "active", "completed"];
const ENCOURAGEMENTS = [
  "做得好！",
  "又完成一件！",
  "这就是进步。",
  "一步一步，真棒。",
  "今天也向前了一点。",
];
const ACHIEVEMENTS = [
  { id: "first-completion", label: "迈出第一步", detail: "完成了第一项任务。" },
  { id: "all-complete", label: "今日清单完成", detail: "完成了清单上的所有任务。" },
];

const form = document.querySelector("#add-form");
const input = document.querySelector("#task-input");
const list = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const emptyAction = document.querySelector("#empty-action");
const noMatches = document.querySelector("#no-matches");
const statusMessage = document.querySelector("#status-message");
const progressBar = document.querySelector("#progress-bar");
const progressFill = document.querySelector("#progress-fill");
const progressCount = document.querySelector("#progress-count");
const progressRing = document.querySelector("#progress-ring");
const progressPercentage = document.querySelector("#progress-percentage");
const totalCount = document.querySelector("#total-count");
const completedCount = document.querySelector("#completed-count");
const remainingCount = document.querySelector("#remaining-count");
const progressEmpty = document.querySelector("#progress-empty");
const trendChart = document.querySelector("#trend-chart");
const trendNote = document.querySelector("#trend-note");
const celebrationMessage = document.querySelector("#celebration-message");
const achievementsSection = document.querySelector("#achievements-section");
const achievementList = document.querySelector("#achievement-list");
const filterButtons = document.querySelectorAll(".filter-button");
const filterControls = document.querySelector(".filters");
const filterIndicator = document.querySelector(".filter-indicator");
const pointerGlow = document.querySelector(".pointer-glow");

let tasks = loadTasks();
let achievements = loadAchievements();
let completionHistory = loadCompletionHistory();
let activeFilter = "all";
let celebrationTimer;

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadCompletionHistory() {
  try {
    const savedHistory = localStorage.getItem(COMPLETION_HISTORY_KEY);
    const parsedHistory = savedHistory ? JSON.parse(savedHistory) : [];
    if (!Array.isArray(parsedHistory)) {
      return [];
    }

    const uniqueEntries = new Map();
    for (const entry of parsedHistory) {
      if (
        !entry ||
        typeof entry.taskId !== "string" ||
        typeof entry.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
        typeof entry.completedAt !== "string" ||
        !Number.isFinite(Date.parse(entry.completedAt))
      ) {
        continue;
      }

      const [year, month, day] = entry.date.split("-").map(Number);
      const entryDate = new Date(year, month - 1, day);
      if (getLocalDateKey(entryDate) !== entry.date) {
        continue;
      }

      const entryKey = JSON.stringify([entry.date, entry.taskId]);
      if (!uniqueEntries.has(entryKey)) {
        uniqueEntries.set(entryKey, {
          taskId: entry.taskId,
          date: entry.date,
          completedAt: entry.completedAt,
        });
      }
    }

    return [...uniqueEntries.values()];
  } catch (error) {
    statusMessage.textContent = "无法读取完成趋势记录，请检查浏览器存储设置。";
    return [];
  }
}

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : [];
    return Array.isArray(parsedTasks)
      ? parsedTasks.filter(
          (task) =>
            task &&
            typeof task.id === "string" &&
            typeof task.text === "string" &&
            typeof task.completed === "boolean",
        )
      : [];
  } catch (error) {
    statusMessage.textContent = "无法读取已保存的任务，请检查浏览器存储设置。";
    return [];
  }
}

function loadAchievements() {
  try {
    const savedAchievements = localStorage.getItem(ACHIEVEMENTS_KEY);
    const parsedAchievements = savedAchievements ? JSON.parse(savedAchievements) : [];
    const knownIds = ACHIEVEMENTS.map((achievement) => achievement.id);
    return Array.isArray(parsedAchievements)
      ? [...new Set(parsedAchievements.filter((id) => knownIds.includes(id)))]
      : [];
  } catch (error) {
    statusMessage.textContent = "无法读取已保存的成就，请检查浏览器存储设置。";
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    statusMessage.textContent = "";
    return true;
  } catch (error) {
    statusMessage.textContent = "无法保存任务，请检查浏览器存储设置。";
    return false;
  }
}

function saveAchievements() {
  try {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
    statusMessage.textContent = "";
    return true;
  } catch (error) {
    statusMessage.textContent = "无法保存成就，请检查浏览器存储设置。";
    return false;
  }
}

function recordTaskCompletion(task) {
  const now = new Date();
  const date = getLocalDateKey(now);
  const alreadyRecorded = completionHistory.some(
    (entry) => entry.taskId === task.id && entry.date === date,
  );

  if (alreadyRecorded) {
    return;
  }

  completionHistory.push({
    taskId: task.id,
    date,
    completedAt: now.toISOString(),
  });

  try {
    localStorage.setItem(COMPLETION_HISTORY_KEY, JSON.stringify(completionHistory));
  } catch (error) {
    statusMessage.textContent = "无法保存完成趋势记录，请检查浏览器存储设置。";
  }
}

function unlockEligibleAchievements() {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const allTasksComplete = tasks.length > 0 && completedTasks === tasks.length;
  const newlyUnlocked = [];

  if (completedTasks > 0 && !achievements.includes("first-completion")) {
    achievements.push("first-completion");
    newlyUnlocked.push("解锁成就：迈出第一步。");
  }

  if (allTasksComplete && !achievements.includes("all-complete")) {
    achievements.push("all-complete");
    newlyUnlocked.push("解锁成就：今日清单完成。");
  }

  if (newlyUnlocked.length > 0) {
    if (!saveAchievements()) {
      return [];
    }
  }

  return newlyUnlocked;
}

function showCelebration() {
  const message = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
  celebrationMessage.textContent = message;
  celebrationMessage.classList.remove("is-visible");
  void celebrationMessage.offsetWidth;
  celebrationMessage.classList.add("is-visible");

  window.clearTimeout(celebrationTimer);
  celebrationTimer = window.setTimeout(() => {
    celebrationMessage.textContent = "";
    celebrationMessage.classList.remove("is-visible");
  }, 2400);
}

function renderProgress() {
  const completedTasks = tasks.filter((task) => task.completed).length;
  const totalTasks = tasks.length;
  const percentage = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;
  const roundedPercentage = Math.round(percentage);

  progressCount.textContent = `已完成 ${completedTasks} / ${totalTasks} 项`;
  progressPercentage.textContent = `${roundedPercentage}%`;
  progressRing.style.setProperty("--progress-angle", `${percentage * 3.6}deg`);
  progressRing.setAttribute("aria-valuenow", String(roundedPercentage));
  progressBar.setAttribute("aria-valuenow", String(roundedPercentage));
  progressFill.style.width = `${percentage}%`;
  totalCount.textContent = String(totalTasks);
  completedCount.textContent = String(completedTasks);
  remainingCount.textContent = String(totalTasks - completedTasks);
  progressEmpty.hidden = totalTasks !== 0;

  renderTrend();
}

function renderTrend() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const days = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const dateKey = getLocalDateKey(date);
    const completed = completionHistory.filter((entry) => entry.date === dateKey).length;
    days.push({ date, dateKey, completed, isToday: offset === 0 });
  }

  const maxCompleted = Math.max(...days.map((day) => day.completed), 1);
  trendChart.replaceChildren();

  for (const day of days) {
    const item = document.createElement("li");
    item.className = "trend-day";
    if (day.isToday) {
      item.classList.add("is-today");
    }
    item.setAttribute(
      "aria-label",
      `${day.dateKey}，完成 ${day.completed} 项${day.isToday ? "，今天" : ""}`,
    );

    const countLabel = document.createElement("span");
    countLabel.className = "trend-count";
    countLabel.textContent = String(day.completed);
    countLabel.setAttribute("aria-hidden", "true");

    const track = document.createElement("span");
    track.className = "trend-bar-track";
    track.setAttribute("aria-hidden", "true");

    const fill = document.createElement("span");
    fill.className = "trend-bar-fill";
    fill.style.height = `${(day.completed / maxCompleted) * 100}%`;
    track.append(fill);

    const dayLabel = document.createElement("span");
    dayLabel.className = "trend-day-label";
    dayLabel.textContent = day.isToday
      ? "今天"
      : new Intl.DateTimeFormat("zh-CN", { weekday: "short" }).format(day.date);
    dayLabel.setAttribute("aria-hidden", "true");

    item.append(countLabel, track, dayLabel);
    trendChart.append(item);
  }

  trendNote.textContent =
    completionHistory.length === 0
      ? "从今天起记录新完成的任务；此前的任务没有完成时间，因此不会补录历史数据。"
      : "仅统计开始记录后完成的任务；删除任务不会抹去已记录的完成历史。";
}

function renderAchievements() {
  const unlockedAchievements = ACHIEVEMENTS.filter((achievement) =>
    achievements.includes(achievement.id),
  );

  achievementList.replaceChildren();
  for (const achievement of unlockedAchievements) {
    const item = document.createElement("li");
    item.className = "achievement-item";

    const mark = document.createElement("span");
    mark.className = "achievement-mark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "✓";

    const description = document.createElement("span");
    description.textContent = `${achievement.label}：${achievement.detail}`;

    item.append(mark, description);
    achievementList.append(item);
  }

  achievementsSection.hidden = unlockedAchievements.length === 0;
}

function renderTasks(celebratedTaskId = null, newAchievements = []) {
  list.replaceChildren();

  const visibleTasks = tasks.filter((task) => {
    if (activeFilter === "active") {
      return !task.completed;
    }
    if (activeFilter === "completed") {
      return task.completed;
    }
    return true;
  });

  for (const task of visibleTasks) {
    const item = document.createElement("li");
    item.className = "task-item";
    if (task.completed) {
      item.classList.add("is-completed");
    }
    if (task.id === celebratedTaskId) {
      item.classList.add("is-celebrating");
    }

    const checkbox = document.createElement("input");
    checkbox.className = "task-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute(
      "aria-label",
      task.completed ? `将“${task.text}”标记为待完成` : `将“${task.text}”标记为已完成`,
    );
    checkbox.addEventListener("change", () => {
      const wasCompleted = task.completed;
      task.completed = checkbox.checked;
      saveTasks();

      let unlockedAchievements = [];
      if (task.completed && !wasCompleted) {
        recordTaskCompletion(task);
        showCelebration();
        unlockedAchievements = unlockEligibleAchievements();
      }

      renderTasks(task.completed ? task.id : null, unlockedAchievements);
    });

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "删除";
    deleteButton.setAttribute("aria-label", `删除任务：${task.text}`);
    deleteButton.addEventListener("click", () => {
      if (deleteButton.disabled) {
        return;
      }

      deleteButton.disabled = true;
      item.classList.add("is-removing");
      window.setTimeout(() => {
        tasks = tasks.filter((savedTask) => savedTask.id !== task.id);
        saveTasks();
        const unlockedAchievements = unlockEligibleAchievements();
        renderTasks(null, unlockedAchievements);
      }, 170);
    });

    item.append(checkbox, text, deleteButton);
    list.append(item);
  }

  renderProgress();
  renderAchievements();

  emptyState.hidden = tasks.length !== 0;
  noMatches.hidden = tasks.length === 0 || visibleTasks.length !== 0;

  if (newAchievements.length > 0) {
    statusMessage.textContent = newAchievements.join(" ");
  }
}

function selectFilter(selectedFilter) {
  if (!FILTERS.includes(selectedFilter)) {
    return;
  }

  activeFilter = selectedFilter;
  const selectedIndex = FILTERS.indexOf(selectedFilter);
  const selectedButton = filterButtons[selectedIndex];
  const indicatorOffset =
    selectedButton.getBoundingClientRect().left -
    filterControls.getBoundingClientRect().left -
    filterControls.clientLeft -
    5;
  filterIndicator.style.setProperty("--filter-offset", `${indicatorOffset}px`);
  for (const button of filterButtons) {
    const isActive = button.dataset.filter === selectedFilter;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    selectFilter(button.dataset.filter);
    renderTasks();
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) {
    input.focus();
    return;
  }

  tasks.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    text,
    completed: false,
  });
  saveTasks();
  selectFilter("all");
  const unlockedAchievements = unlockEligibleAchievements();
  renderTasks(null, unlockedAchievements);
  input.value = "";
  input.focus();
});

emptyAction.addEventListener("click", () => {
  input.focus();
});

function enablePointerGlow() {
  const canTrackPointer = window.matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  if (!canTrackPointer.matches) {
    return;
  }

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight / 3;
  let currentX = targetX;
  let currentY = targetY;
  let animationFrame = 0;
  let pointerIsInside = false;

  function followPointer() {
    currentX += (targetX - currentX) * 0.085;
    currentY += (targetY - currentY) * 0.085;
    pointerGlow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;

    const isCloseToTarget = Math.abs(targetX - currentX) < 0.5 && Math.abs(targetY - currentY) < 0.5;
    if (isCloseToTarget && !pointerIsInside) {
      currentX = targetX;
      currentY = targetY;
      pointerGlow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`;
      animationFrame = 0;
      return;
    }

    animationFrame = window.requestAnimationFrame(followPointer);
  }

  function requestFollow() {
    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(followPointer);
    }
  }

  window.addEventListener("pointermove", (event) => {
    targetX = event.clientX;
    targetY = event.clientY;
    if (!pointerIsInside) {
      pointerIsInside = true;
      document.body.classList.add("is-pointer-active");
    }
    requestFollow();
  });

  document.documentElement.addEventListener("pointerleave", () => {
    pointerIsInside = false;
    targetX = window.innerWidth / 2;
    targetY = window.innerHeight / 3;
    document.body.classList.remove("is-pointer-active");
    requestFollow();
  });

  window.addEventListener("resize", () => {
    selectFilter(activeFilter);
    if (!pointerIsInside) {
      targetX = window.innerWidth / 2;
      targetY = window.innerHeight / 3;
      requestFollow();
    }
  });
}

selectFilter("all");
enablePointerGlow();

const initiallyUnlocked = unlockEligibleAchievements();
renderTasks(null, initiallyUnlocked);
