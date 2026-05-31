const historyOutput = document.getElementById("historyOutput");
const dailySummary = document.getElementById("dailySummary");
const filterDate = document.getElementById("filterDate");
const filterUser = document.getElementById("filterUser");

// Firebase-only meal history
async function getMealHistory() {
  if (typeof cloudLoadAllMealHistory === "function" && typeof isFirebaseReady === "function" && isFirebaseReady()) {
    const meals = await cloudLoadAllMealHistory();
    return meals || [];
  }
  return [];
}

async function saveMealHistory(history) {
  if (typeof cloudSaveAllMealHistory === "function" && typeof isFirebaseReady === "function" && isFirebaseReady()) {
    await cloudSaveAllMealHistory(history);
    console.log("☁️ Meal history saved to database");
  }
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Populate user filter dropdown
async function populateUserFilter() {
  const history = await getMealHistory();
  const users = [...new Set(history.map((m) => m.username || "unknown").filter(Boolean))];
  filterUser.innerHTML = '<option value="">All Users</option>';
  users.sort().forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u.charAt(0).toUpperCase() + u.slice(1);
    filterUser.appendChild(opt);
  });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "Unknown";
}

function getUserColor(username) {
  const colors = ["#3498db", "#e74c3c", "#2ecc71", "#9b59b6", "#f39c12", "#1abc9c", "#e67e22", "#e91e63"];
  let hash = 0;
  for (let i = 0; i < (username || "").length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

async function displayHistory(filterDateStr, filterUsername) {
  let history = await getMealHistory();

  if (filterDateStr) {
    history = history.filter((meal) => meal.date.startsWith(filterDateStr));
  }
  if (filterUsername) {
    history = history.filter((meal) => (meal.username || "").toLowerCase() === filterUsername.toLowerCase());
  }

  if (history.length === 0) {
    historyOutput.innerHTML = "<p>No saved meals found.</p>";
    dailySummary.innerHTML = "";
    return;
  }

  // Daily totals
  const dayTotals = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  history.forEach((meal) => {
    dayTotals.calories += meal.totals.calories;
    dayTotals.protein += meal.totals.protein;
    dayTotals.fat += meal.totals.fat;
    dayTotals.carbs += meal.totals.carbs;
    dayTotals.fiber += (meal.totals.fiber || 0);
  });

  const label = filterUsername ? capitalize(filterUsername) + "'s" : (filterDateStr ? "Day" : "All Time");
  dailySummary.innerHTML = `
    <div class="daily-totals">
      <h4>📊 ${label} Totals (${history.length} meal${history.length > 1 ? "s" : ""})</h4>
      <p>
        <strong>Calories:</strong> ${dayTotals.calories.toFixed(1)} |
        <strong>Protein:</strong> ${dayTotals.protein.toFixed(1)}g |
        <strong>Fat:</strong> ${dayTotals.fat.toFixed(1)}g |
        <strong>Carbs:</strong> ${dayTotals.carbs.toFixed(1)}g |
        <strong>Fiber:</strong> ${dayTotals.fiber.toFixed(1)}g
      </p>
    </div>
  `;

  let html = "";
  history.forEach((meal) => {
    const username = meal.username || "unknown";
    const userColor = getUserColor(username);
    const totalServingWeight = meal.items.reduce((sum, item) => sum + item.amount, 0);

    html += `
      <div class="saved-meal-card">
        <div class="meal-card-header">
          <span class="user-badge" style="background:${userColor};">👤 ${capitalize(username)}</span>
          <h4>${meal.name}</h4>
          <span class="meal-date">${formatDate(meal.date)}</span>
          <span class="serving-badge">🍽️ ${totalServingWeight.toFixed(0)}g total${meal.servings > 1 ? ` · ${meal.servings} servings · ${(totalServingWeight / meal.servings).toFixed(0)}g/serving` : ''}</span>
          <button class="delete-btn delete-meal-btn" data-id="${meal.id}">🗑️ Delete</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Amount (g)</th>
              <th>Calories</th>
              <th>Protein (g)</th>
              <th>Fat (g)</th>
              <th>Carbs (g)</th>
              <th>Fiber (g)</th>
            </tr>
          </thead>
          <tbody>
    `;
    meal.items.forEach((item) => {
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.amount.toFixed(1)}</td>
          <td>${item.calories.toFixed(1)}</td>
          <td>${item.protein.toFixed(1)}</td>
          <td>${item.fat.toFixed(1)}</td>
          <td>${item.carbs.toFixed(1)}</td>
          <td>${(item.fiber || 0).toFixed(1)}</td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
        <p class="meal-totals">
          <strong>Total:</strong> ${meal.totals.calories.toFixed(1)} cal |
          ${meal.totals.protein.toFixed(1)}g protein |
          ${meal.totals.fat.toFixed(1)}g fat |
          ${meal.totals.carbs.toFixed(1)}g carbs |
          ${(meal.totals.fiber || 0).toFixed(1)}g fiber
        </p>
        ${meal.servings > 1 ? `<p class="meal-totals"><strong>Per Serving (1/${meal.servings}):</strong> ${(meal.totals.calories / meal.servings).toFixed(1)} cal | ${(meal.totals.protein / meal.servings).toFixed(1)}g protein | ${(meal.totals.fat / meal.servings).toFixed(1)}g fat | ${(meal.totals.carbs / meal.servings).toFixed(1)}g carbs | ${((meal.totals.fiber || 0) / meal.servings).toFixed(1)}g fiber</p>` : ''}
      </div>
    `;
  });

  historyOutput.innerHTML = html;

  // Delete buttons
  document.querySelectorAll(".delete-meal-btn").forEach((btn) => {
    btn.addEventListener("click", async function () {
      const id = parseInt(this.getAttribute("data-id"));
      if (confirm("Delete this saved meal?")) {
        let h = await getMealHistory();
        h = h.filter((m) => m.id !== id);
        await saveMealHistory(h);
        displayHistory(filterDate.value || null, filterUser.value || null);
      }
    });
  });
}

// Filters
filterDate.addEventListener("change", function () {
  displayHistory(this.value || null, filterUser.value || null);
});

filterUser.addEventListener("change", function () {
  displayHistory(filterDate.value || null, this.value || null);
});

document.getElementById("clearFilterBtn").addEventListener("click", function () {
  filterDate.value = "";
  filterUser.value = "";
  displayHistory(null, null);
});

// Init — wait for Firebase to be ready
async function initMealHistory() {
  // Small delay to allow Firebase to initialize
  await new Promise(resolve => setTimeout(resolve, 1000));
  await populateUserFilter();
  await displayHistory(null, null);
}
initMealHistory();
