// ===== User Profiles & Daily Tracker =====
// Only shows the currently logged-in (active) user's data — fully private.
const USERS_KEY = "userProfiles";
const MEAL_HISTORY_KEY = "mealHistory";
const ACTIVE_USER_KEY = "activeUser";

// --- User Profile helpers ---
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getActiveUsername() {
  return localStorage.getItem(ACTIVE_USER_KEY) || "";
}

function getActiveUser() {
  const key = getActiveUsername();
  if (!key) return null;
  const users = getUsers();
  return users[key] || null;
}

function updateUserGoals(username, goals) {
  const users = getUsers();
  const key = username.toLowerCase();
  if (!users[key]) return;
  users[key].goals = {
    calories: parseFloat(goals.calories) || 2000,
    protein: parseFloat(goals.protein) || 150,
    fat: parseFloat(goals.fat) || 65,
    carbs: parseFloat(goals.carbs) || 250,
    fiber: parseFloat(goals.fiber) || 30,
  };
  saveUsers(users);
}

// --- Meal History ---
function getMealHistory() {
  return JSON.parse(localStorage.getItem(MEAL_HISTORY_KEY)) || [];
}

function getMealsForUserAndDate(username, dateStr) {
  return getMealHistory().filter((meal) => {
    const mealUser = (meal.username || "").toLowerCase();
    const mealDate = meal.date ? meal.date.substring(0, 10) : "";
    return mealUser === username.toLowerCase() && mealDate === dateStr;
  });
}

// --- Workout History ---
function getWorkoutsForUser(username) {
  const data = localStorage.getItem(`workout_${username}`);
  return data ? JSON.parse(data) : [];
}

function getWorkoutsForUserAndDate(username, dateStr) {
  return getWorkoutsForUser(username).filter((w) => w.date === dateStr);
}

// --- Compute daily totals (uses per-serving when servings > 1) ---
function computeDayTotals(meals) {
  const totals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  meals.forEach((meal) => {
    const servings = meal.servings || 1;
    totals.calories += (meal.totals.calories || 0) / servings;
    totals.protein += (meal.totals.protein || 0) / servings;
    totals.fat += (meal.totals.fat || 0) / servings;
    totals.carbs += (meal.totals.carbs || 0) / servings;
    totals.fiber += (meal.totals.fiber || 0) / servings;
  });
  return totals;
}

// --- UI Elements ---
const notLoggedInSection = document.getElementById("notLoggedInSection");
const profileSection = document.getElementById("profileSection");
const trackerContent = document.getElementById("trackerContent");
const trackerDate = document.getElementById("trackerDate");
const macroProgress = document.getElementById("macroProgress");
const dayMeals = document.getElementById("dayMeals");
const dayWorkouts = document.getElementById("dayWorkouts");
const updateGoalsBtn = document.getElementById("updateGoalsBtn");
const userStatsSection = document.getElementById("userStatsSection");
const userStatsContent = document.getElementById("userStatsContent");

function getTodayStr() {
  return new Date().toISOString().substring(0, 10);
}

function shiftDate(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().substring(0, 10);
}

// ==================== DONUT CHART (pure canvas) ====================
function drawDonutChart(canvas, consumed, goals) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  const cx = w / 2, cy = h / 2, radius = 80, thickness = 28;

  ctx.clearRect(0, 0, w, h);

  const macros = [
    { label: "Protein", value: consumed.protein, goal: goals.protein, color: "#3498db" },
    { label: "Fat", value: consumed.fat, goal: goals.fat, color: "#f39c12" },
    { label: "Carbs", value: consumed.carbs, goal: goals.carbs, color: "#9b59b6" },
    { label: "Fiber", value: consumed.fiber, goal: goals.fiber, color: "#1abc9c" },
  ];

  const total = macros.reduce((s, m) => s + (m.value || 0), 0);

  if (total === 0) {
    // Empty state
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = thickness;
    ctx.stroke();
    ctx.fillStyle = "#999";
    ctx.font = "14px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No data yet", cx, cy + 5);
    return macros;
  }

  let startAngle = -Math.PI / 2;
  macros.forEach((m) => {
    const sliceAngle = (m.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.strokeStyle = m.color;
    ctx.lineWidth = thickness;
    ctx.stroke();
    startAngle += sliceAngle;
  });

  // Center text
  ctx.fillStyle = "#333";
  ctx.font = "bold 18px Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${consumed.calories.toFixed(0)}`, cx, cy - 5);
  ctx.font = "12px Segoe UI, sans-serif";
  ctx.fillStyle = "#888";
  ctx.fillText(`/ ${goals.calories.toFixed(0)} kcal`, cx, cy + 14);

  return macros;
}

function renderDonutLegend(macros) {
  const legend = document.getElementById("donutLegend");
  legend.innerHTML = macros.map((m) =>
    `<span class="legend-item"><span class="legend-dot" style="background:${m.color}"></span>${m.label}: ${(m.value || 0).toFixed(1)}g / ${(m.goal || 0).toFixed(0)}g</span>`
  ).join("");
}

// ==================== PROGRESS BARS ====================
function renderMacroProgress(goals, consumed) {
  const macros = [
    { label: "Calories", key: "calories", unit: "kcal", color: "#e74c3c" },
    { label: "Protein", key: "protein", unit: "g", color: "#3498db" },
    { label: "Fat", key: "fat", unit: "g", color: "#f39c12" },
    { label: "Carbs", key: "carbs", unit: "g", color: "#9b59b6" },
    { label: "Fiber", key: "fiber", unit: "g", color: "#1abc9c" },
  ];

  let html = '<div class="macro-progress-container">';
  macros.forEach((m) => {
    const goal = goals[m.key] || 0;
    const eaten = consumed[m.key] || 0;
    const remaining = Math.max(0, goal - eaten);
    const pct = goal > 0 ? Math.min(100, (eaten / goal) * 100) : 0;
    const over = eaten > goal;

    html += `
      <div class="macro-row">
        <div class="macro-label">
          <strong>${m.label}</strong>
          <span class="macro-numbers">${eaten.toFixed(1)} / ${goal.toFixed(0)} ${m.unit}</span>
        </div>
        <div class="macro-bar-bg">
          <div class="macro-bar-fill ${over ? 'over' : ''}" style="width:${pct}%; background:${over ? '#e74c3c' : m.color};"></div>
        </div>
        <div class="macro-remaining ${over ? 'over-text' : ''}">
          ${over ? `⚠️ Over by ${(eaten - goal).toFixed(1)} ${m.unit}` : `✅ ${remaining.toFixed(1)} ${m.unit} left`}
        </div>
      </div>
    `;
  });
  html += "</div>";
  macroProgress.innerHTML = html;
}

// ==================== DAY MEALS ====================
function renderDayMeals(meals) {
  if (meals.length === 0) {
    dayMeals.innerHTML = '<p>No meals logged for this day. <a href="meal.html">Add a meal →</a></p>';
    return;
  }

  let html = `<h4>🍽️ Meals Eaten (${meals.length})</h4>`;
  meals.forEach((meal) => {
    const time = new Date(meal.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    html += `
      <div class="saved-meal-card">
        <div class="meal-card-header">
          <h4>${meal.name}</h4>
          <span class="meal-date">🕐 ${time}</span>
          ${meal.servings > 1 ? `<span class="serving-badge">🍽️ ${meal.servings} servings</span>` : ''}
        </div>
        <table>
          <thead><tr><th>Ingredient</th><th>Amount (g)</th><th>Calories</th><th>Protein</th><th>Fat</th><th>Carbs</th><th>Fiber</th></tr></thead>
          <tbody>
    `;
    meal.items.forEach((item) => {
      html += `<tr><td>${item.name}</td><td>${item.amount.toFixed(1)}</td><td>${item.calories.toFixed(1)}</td><td>${item.protein.toFixed(1)}</td><td>${item.fat.toFixed(1)}</td><td>${item.carbs.toFixed(1)}</td><td>${(item.fiber || 0).toFixed(1)}</td></tr>`;
    });
    html += `</tbody></table>
        <p class="meal-totals">
          <strong>Calories:</strong> ${meal.totals.calories.toFixed(1)} |
          <strong>Protein:</strong> ${meal.totals.protein.toFixed(1)}g |
          <strong>Fat:</strong> ${meal.totals.fat.toFixed(1)}g |
          <strong>Carbs:</strong> ${meal.totals.carbs.toFixed(1)}g |
          <strong>Fiber:</strong> ${(meal.totals.fiber || 0).toFixed(1)}g
        </p>
      </div>`;
  });
  dayMeals.innerHTML = html;
}

// ==================== DAY WORKOUTS ====================
function renderDayWorkouts(workouts) {
  if (workouts.length === 0) {
    dayWorkouts.innerHTML = '<p>No workouts logged for this day. <a href="workout.html">Log a workout →</a></p>';
    return;
  }

  let html = `<h4>💪 Workouts (${workouts.length} exercises)</h4>
    <table class="workout-table"><thead><tr><th>Muscle</th><th>Exercise</th><th>Weight (kg)</th><th>Sets</th><th>Reps</th></tr></thead><tbody>`;
  workouts.forEach((w) => {
    html += `<tr>
      <td><span class="muscle-tag ${w.muscleGroup}">${capitalize(w.muscleGroup)}</span></td>
      <td>${w.name}</td><td>${w.weight}</td><td>${w.sets}</td><td>${w.reps}</td>
    </tr>`;
  });
  html += "</tbody></table>";
  dayWorkouts.innerHTML = html;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== USER STATS (BMI/BMR/Diet Plan) ====================
function renderUserStats(user) {
  if (!user.bmi && !user.bmr && !user.dietPlan) {
    userStatsSection.style.display = "none";
    return;
  }
  userStatsSection.style.display = "block";

  let html = '<div class="stats-cards">';
  if (user.bmi) {
    html += `<div class="stat-card">
      <span class="stat-icon">⚖️</span>
      <div><strong>BMI:</strong> ${user.bmi} <span class="stat-sub">(${user.bmiCategory || ''})</span></div>
    </div>`;
  }
  if (user.bmr) {
    html += `<div class="stat-card">
      <span class="stat-icon">🔥</span>
      <div><strong>BMR:</strong> ${user.bmr} kcal/day</div>
    </div>`;
  }
  if (user.tdee) {
    html += `<div class="stat-card">
      <span class="stat-icon">⚡</span>
      <div><strong>TDEE:</strong> ${user.tdee} kcal/day</div>
    </div>`;
  }
  if (user.dietPlan) {
    html += `<div class="stat-card">
      <span class="stat-icon">🥗</span>
      <div><strong>Diet Plan:</strong> ${user.dietPlan}</div>
    </div>`;
  }
  html += '</div>';

  if (user.bodyStats) {
    html += `<p class="body-stats-line">
      <strong>Age:</strong> ${user.bodyStats.age || '—'} |
      <strong>Height:</strong> ${user.bodyStats.height || '—'} cm |
      <strong>Weight:</strong> ${user.bodyStats.weight || '—'} kg |
      <strong>Gender:</strong> ${user.bodyStats.gender === 'm' ? 'Male' : 'Female'} |
      <strong>Activity:</strong> ${user.bodyStats.activityLabel || '—'}
    </p>`;
  }

  html += `<p style="margin-top:10px;"><a href="bmi-bmr.html">📊 Recalculate BMI & BMR →</a></p>`;
  userStatsContent.innerHTML = html;
}

// ==================== WEEK SUMMARY ====================
function renderWeekSummary(username, currentDate) {
  const container = document.getElementById("weekSummary");
  let html = '<div class="week-grid">';

  for (let i = 6; i >= 0; i--) {
    const dateStr = shiftDate(currentDate, -i);
    const meals = getMealsForUserAndDate(username, dateStr);
    const totals = computeDayTotals(meals);
    const workouts = getWorkoutsForUserAndDate(username, dateStr);
    const isToday = dateStr === getTodayStr();
    const dayLabel = new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

    html += `
      <div class="week-day-card ${isToday ? 'today' : ''} ${meals.length === 0 ? 'empty' : ''}">
        <div class="week-day-label">${dayLabel}</div>
        <div class="week-day-cal">${totals.calories.toFixed(0)} kcal</div>
        <div class="week-day-detail">
          🍽️ ${meals.length} meal${meals.length !== 1 ? 's' : ''} · 💪 ${workouts.length} exercise${workouts.length !== 1 ? 's' : ''}
        </div>
      </div>
    `;
  }
  html += "</div>";
  container.innerHTML = html;
}

// ==================== MAIN REFRESH ====================
function refreshTracker() {
  const username = getActiveUsername();
  const user = getActiveUser();

  if (!username || !user) {
    // Not logged in
    notLoggedInSection.style.display = "block";
    profileSection.style.display = "none";
    trackerContent.style.display = "none";
    userStatsSection.style.display = "none";
    return;
  }

  // Logged in — show only this user's data
  notLoggedInSection.style.display = "none";
  profileSection.style.display = "block";
  document.getElementById("profileUsername").textContent = user.name;

  // Fill goals
  document.getElementById("editCalories").value = user.goals.calories;
  document.getElementById("editProtein").value = user.goals.protein;
  document.getElementById("editFat").value = user.goals.fat;
  document.getElementById("editCarbs").value = user.goals.carbs;
  document.getElementById("editFiber").value = user.goals.fiber;

  // User stats (BMI/BMR/Diet)
  renderUserStats(user);

  // Show tracker
  trackerContent.style.display = "block";
  if (!trackerDate.value) trackerDate.value = getTodayStr();

  const dateStr = trackerDate.value;
  const meals = getMealsForUserAndDate(username, dateStr);
  const consumed = computeDayTotals(meals);
  const workouts = getWorkoutsForUserAndDate(username, dateStr);

  // Donut chart
  const canvas = document.getElementById("macroDonut");
  const macros = drawDonutChart(canvas, consumed, user.goals);
  renderDonutLegend(macros);

  // Progress bars
  renderMacroProgress(user.goals, consumed);

  // Day meals & workouts
  renderDayMeals(meals);
  renderDayWorkouts(workouts);

  // Week summary
  renderWeekSummary(username, dateStr);
}

// --- Event Listeners ---
trackerDate.addEventListener("change", refreshTracker);

document.getElementById("todayBtn").addEventListener("click", () => {
  trackerDate.value = getTodayStr();
  refreshTracker();
});

document.getElementById("prevDayBtn").addEventListener("click", () => {
  if (trackerDate.value) {
    trackerDate.value = shiftDate(trackerDate.value, -1);
    refreshTracker();
  }
});

document.getElementById("nextDayBtn").addEventListener("click", () => {
  if (trackerDate.value) {
    trackerDate.value = shiftDate(trackerDate.value, 1);
    refreshTracker();
  }
});

updateGoalsBtn.addEventListener("click", () => {
  const username = getActiveUsername();
  if (!username) return;
  updateUserGoals(username, {
    calories: document.getElementById("editCalories").value,
    protein: document.getElementById("editProtein").value,
    fat: document.getElementById("editFat").value,
    carbs: document.getElementById("editCarbs").value,
    fiber: document.getElementById("editFiber").value,
  });
  alert("Goals updated!");
  refreshTracker();
});

// --- Init ---
refreshTracker();
