import { mockNutritionDB, syncFromCloud } from './mockDatabase.js';
import { isCloudEnabled, saveToCloud, loadFromCloud } from './cloudStorage.js';
import { searchSwedishFood, getFoodNutrition, searchSwedishStoreProducts } from './swedishFoodAPI.js';

// Example usage
console.log(mockNutritionDB);

// 🇸🇪 Swedish Food API Search Integration
let apiSelectedFood = null;
let currentSearchSource = "stores"; // "stores" (Open Food Facts) or "livsmedelsverket"

function initAPISearch() {
  const searchInput = document.getElementById("apiSearch");
  const resultsDiv = document.getElementById("apiSearchResults");
  const previewDiv = document.getElementById("apiNutritionPreview");
  if (!searchInput) return;

  // Source toggle buttons
  const sourceToggles = document.querySelectorAll(".api-source-btn");
  sourceToggles.forEach(btn => {
    btn.addEventListener("click", () => {
      sourceToggles.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentSearchSource = btn.getAttribute("data-source");
      // Re-trigger search if there's text
      if (searchInput.value.trim().length >= 2) {
        searchInput.dispatchEvent(new Event("input"));
      }
    });
  });

  let debounceTimer = null;

  searchInput.addEventListener("input", function () {
    clearTimeout(debounceTimer);
    const query = this.value.trim();
    if (query.length < 2) {
      resultsDiv.style.display = "none";
      return;
    }
    debounceTimer = setTimeout(async () => {
      resultsDiv.innerHTML = '<div class="ingredient-option disabled">Searching...</div>';
      resultsDiv.style.display = "block";
      console.log("[API Search] Source:", currentSearchSource, "Query:", query);

      if (currentSearchSource === "stores") {
        // Open Food Facts — Swedish grocery store products
        let results = [];
        try {
          results = await searchSwedishStoreProducts(query);
        } catch (e) {
          console.error("Store search failed:", e);
        }
        if (results.length === 0) {
          resultsDiv.innerHTML = '<div class="ingredient-option disabled">No store products found.</div>';
        } else {
          // Store results in a temporary array to avoid JSON-in-attribute issues
          window._storeSearchResults = results;
          resultsDiv.innerHTML = results.map((item, idx) =>
            `<div class="ingredient-option" data-index="${idx}">
              <strong>${item.name}</strong>${item.brand ? ` <small>(${item.brand})</small>` : ""}
              ${item.stores ? `<br><small>🏪 ${item.stores}</small>` : ""}
            </div>`
          ).join("");
          resultsDiv.querySelectorAll(".ingredient-option:not(.disabled)").forEach(opt => {
            opt.addEventListener("click", () => {
              const item = window._storeSearchResults[parseInt(opt.getAttribute("data-index"))];
              searchInput.value = item.name;
              resultsDiv.style.display = "none";
              showNutritionPreview(previewDiv, {
                name: `${item.name}${item.brand ? " (" + item.brand + ")" : ""}`,
                calories: item.calories,
                protein: item.protein,
                fat: item.fat,
                carbs: item.carbs,
                fiber: item.fiber,
                source: item.source,
                stores: item.stores,
              });
            });
          });
        }
      } else {
        // Livsmedelsverket — generic Swedish foods
        const results = await searchSwedishFood(query);
        if (results.length === 0) {
          resultsDiv.innerHTML = '<div class="ingredient-option disabled">No results found. Try searching in Swedish.</div>';
        } else {
          resultsDiv.innerHTML = results.map(item =>
            `<div class="ingredient-option" data-id="${item.id}">${item.name}</div>`
          ).join("");
          resultsDiv.querySelectorAll(".ingredient-option:not(.disabled)").forEach(opt => {
            opt.addEventListener("click", async () => {
              searchInput.value = opt.textContent;
              resultsDiv.style.display = "none";
              previewDiv.style.display = "block";
              previewDiv.innerHTML = "<p>Loading nutritional data...</p>";

              const nutrition = await getFoodNutrition(opt.getAttribute("data-id"));
              if (nutrition) {
                showNutritionPreview(previewDiv, nutrition);
              } else {
                previewDiv.innerHTML = "<p>❌ Could not load nutrition data for this item.</p>";
              }
            });
          });
        }
      }
    }, 400);
  });

  // Close results on outside click
  document.addEventListener("click", (e) => {
    if (!searchInput.parentElement.contains(e.target)) {
      resultsDiv.style.display = "none";
    }
  });
}

function showNutritionPreview(previewDiv, nutrition) {
  apiSelectedFood = nutrition;
  previewDiv.style.display = "block";
  previewDiv.innerHTML = `
    <h5>📊 ${nutrition.name} (per 100g)</h5>
    <p>
      <strong>Calories:</strong> ${nutrition.calories} kcal |
      <strong>Protein:</strong> ${nutrition.protein}g |
      <strong>Fat:</strong> ${nutrition.fat}g |
      <strong>Carbs:</strong> ${nutrition.carbs}g |
      <strong>Fiber:</strong> ${nutrition.fiber || 0}g
    </p>
    ${nutrition.stores ? `<p><small>🏪 Sold at: ${nutrition.stores}</small></p>` : ""}
    <p><small>Source: ${nutrition.source}</small></p>
    <button type="button" id="useApiDataBtn">✅ Use this ingredient</button>
  `;
  document.getElementById("useApiDataBtn").addEventListener("click", () => {
    useApiFood(nutrition);
  });
}

// Use API food data — adds it as a temporary entry to the local DB and fills the form
function useApiFood(nutrition) {
  const name = nutrition.name.toLowerCase();
  // Add to local mock DB so the meal form can use it
  mockNutritionDB[name] = {
    calories: nutrition.calories,
    protein: nutrition.protein,
    fat: nutrition.fat,
    carbs: nutrition.carbs,
    fiber: nutrition.fiber,
  };
  // Fill in the ingredient input and focus on amount
  const ingredientInput = document.getElementById("ingredient");
  if (ingredientInput) {
    ingredientInput.value = name;
  }
  const amountInput = document.getElementById("amount");
  if (amountInput) {
    amountInput.focus();
    amountInput.value = 100;
  }
  // Refresh dropdown
  renderIngredientList("");
}

// Populate the ingredient dropdown with search/filter capability
function populateIngredientDropdown() {
  const ingredientDropdown = document.getElementById("ingredient");
  if (!ingredientDropdown) {
    console.error("Element with id 'ingredient' not found.");
    return;
  }

  // Convert select to a searchable input if not already done
  if (ingredientDropdown.tagName === "SELECT") {
    const wrapper = document.createElement("div");
    wrapper.className = "ingredient-search-wrapper";
    wrapper.style.position = "relative";

    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.id = "ingredient";
    searchInput.placeholder = "Search ingredients...";
    searchInput.autocomplete = "off";
    searchInput.required = true;

    const dropdown = document.createElement("div");
    dropdown.id = "ingredientDropdownList";
    dropdown.className = "ingredient-dropdown-list";

    ingredientDropdown.parentNode.replaceChild(wrapper, ingredientDropdown);
    wrapper.appendChild(searchInput);
    wrapper.appendChild(dropdown);

    // Build the filtered list
    searchInput.addEventListener("input", function () {
      renderIngredientList(this.value);
    });

    searchInput.addEventListener("focus", function () {
      renderIngredientList(this.value);
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
      if (!wrapper.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  renderIngredientList("");
}

function renderIngredientList(filter) {
  const dropdown = document.getElementById("ingredientDropdownList");
  if (!dropdown) return;

  const query = filter.toLowerCase().trim();
  const sorted = Object.keys(mockNutritionDB).sort();
  const filtered = query
    ? sorted.filter(name => name.includes(query))
    : sorted;

  if (filtered.length === 0) {
    dropdown.innerHTML = '<div class="ingredient-option disabled">No ingredients found</div>';
    dropdown.style.display = "block";
    return;
  }

  dropdown.innerHTML = filtered.map(name =>
    `<div class="ingredient-option" data-value="${name}">${name.charAt(0).toUpperCase() + name.slice(1)}</div>`
  ).join("");

  dropdown.style.display = "block";

  // Click handlers for options
  dropdown.querySelectorAll(".ingredient-option:not(.disabled)").forEach(opt => {
    opt.addEventListener("click", function () {
      const input = document.getElementById("ingredient");
      input.value = this.getAttribute("data-value");
      dropdown.style.display = "none";
    });
  });
}

// Call the function to populate the dropdown on page load
document.addEventListener("DOMContentLoaded", async () => {
  if (typeof waitForFirebase === "function") {
    await waitForFirebase();
  }
  await syncFromCloud();
  populateIngredientDropdown();
  initAPISearch();
});

// 🥗 Meal Form Handling
const form = document.getElementById("mealForm");
const output = document.getElementById("mealOutput");
let mealItems = []; // In-memory only — no localStorage

// 📋 Handle form submission for adding meal items
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const ingredientInput = document.getElementById("ingredient").value.trim().toLowerCase();
  const amountInput = parseFloat(document.getElementById("amount").value);

  // Validate inputs
  if (!ingredientInput || isNaN(amountInput) || amountInput <= 0) {
    alert("Please enter a valid ingredient and amount.");
    return;
  }

  // Check if ingredient exists in the database
  const ingredientData = mockNutritionDB[ingredientInput];
  if (!ingredientData) {
    alert("Ingredient not found in the database.");
    return;
  }

  // Calculate nutritional values
  const factor = amountInput / 100;
  const entry = {
    name: ingredientInput,
    amount: amountInput,
    calories: +(ingredientData.calories * factor).toFixed(1),
    protein: +(ingredientData.protein * factor).toFixed(1),
    fat: +(ingredientData.fat * factor).toFixed(1),
    carbs: +(ingredientData.carbs * factor).toFixed(1),
    fiber: +((ingredientData.fiber || 0) * factor).toFixed(1),
  };

  // Add entry to meal items and update the display
  mealItems.push(entry);
  displayMeal();
  form.reset();
});


// 🖥️ Display meal summary
function displayMeal() {
  if (mealItems.length === 0) {
    output.innerHTML = "<p>No ingredients added yet.</p>";
    return;
  }

  // Group ingredients by name and calculate totals
  const groupedItems = {};
  mealItems.forEach((item) => {
    if (!groupedItems[item.name]) {
      groupedItems[item.name] = {
        name: item.name,
        amount: 0,
        calories: 0,
        protein: 0,
        fat: 0,
        carbs: 0,
        fiber: 0,
      };
    }
    groupedItems[item.name].amount += item.amount;
    groupedItems[item.name].calories += item.calories;
    groupedItems[item.name].protein += item.protein;
    groupedItems[item.name].fat += item.fat;
    groupedItems[item.name].carbs += item.carbs;
    groupedItems[item.name].fiber += (item.fiber || 0);
  });

  let html = `
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
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  let total = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };

  Object.values(groupedItems).forEach((item) => {
    html += `
      <tr>
        <td>${item.name}</td>
        <td>
          <input type="number" class="edit-amount" data-name="${item.name}" value="${item.amount.toFixed(1)}" step="0.1" />
        </td>
        <td>${item.calories.toFixed(1)}</td>
        <td>${item.protein.toFixed(1)}</td>
        <td>${item.fat.toFixed(1)}</td>
        <td>${item.carbs.toFixed(1)}</td>
        <td>${item.fiber.toFixed(1)}</td>
        <td>
          <button class="delete-btn" data-name="${item.name}">Delete</button>
        </td>
      </tr>
    `;
    total.calories += item.calories;
    total.protein += item.protein;
    total.fat += item.fat;
    total.carbs += item.carbs;
    total.fiber += item.fiber;
  });

  html += `
      </tbody>
    </table>
    <h4>Total</h4>
    <p>
      <strong>Calories:</strong> ${total.calories.toFixed(1)} |
      <strong>Protein:</strong> ${total.protein.toFixed(1)}g |
      <strong>Fat:</strong> ${total.fat.toFixed(1)}g |
      <strong>Carbs:</strong> ${total.carbs.toFixed(1)}g |
      <strong>Fiber:</strong> ${total.fiber.toFixed(1)}g
    </p>
    <button id="clearMealBtn">Clear Meal</button>
  `;

  output.innerHTML = html;

  // Add event listener for clear meal button
  document.getElementById("clearMealBtn").addEventListener("click", function () {
    if (confirm("Clear all meal items?")) {
      mealItems = [];
      displayMeal();
    }
  });

  // Add event listeners for delete buttons
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const name = this.getAttribute("data-name");
      deleteMealItem(name);
    });
  });

  // Add event listeners for editing amounts
  document.querySelectorAll(".edit-amount").forEach((input) => {
    input.addEventListener("change", function () {
      const name = this.getAttribute("data-name");
      const newAmount = parseFloat(this.value);
      if (isNaN(newAmount) || newAmount <= 0) {
        alert("Please enter a valid amount.");
        return;
      }
      editMealItem(name, newAmount);
    });
  });
}

// 🗑️ Function to delete a meal item
function deleteMealItem(name) {
  mealItems = mealItems.filter((item) => item.name !== name);
  displayMeal();
}

// ✏️ Function to edit a meal item's amount
function editMealItem(name, newAmount) {
  mealItems = mealItems.map((item) => {
    if (item.name === name) {
      const ingredientData = mockNutritionDB[name];
      const factor = newAmount / 100;
      return {
        ...item,
        amount: newAmount,
        calories: +(ingredientData.calories * factor).toFixed(1),
        protein: +(ingredientData.protein * factor).toFixed(1),
        fat: +(ingredientData.fat * factor).toFixed(1),
        carbs: +(ingredientData.carbs * factor).toFixed(1),
        fiber: +((ingredientData.fiber || 0) * factor).toFixed(1),
      };
    }
    return item;
  });
  displayMeal();
}

// 💾 Meal history — Firebase only
async function getMealHistory() {
  // Try Firebase first
  if (typeof cloudLoadAllMealHistory === "function" && typeof isFirebaseReady === "function" && isFirebaseReady()) {
    const cloudMeals = await cloudLoadAllMealHistory();
    if (cloudMeals) return cloudMeals;
  }
  return [];
}

async function saveMealHistory(history) {
  // Save to Firebase only
  if (typeof cloudSaveAllMealHistory === "function" && typeof isFirebaseReady === "function" && isFirebaseReady()) {
    await cloudSaveAllMealHistory(history);
    console.log("☁️ Meal history saved to database");
  }
}

document.getElementById("saveMealBtn").addEventListener("click", async function () {
  if (mealItems.length === 0) {
    alert("No items in the current meal to save.");
    return;
  }

  const mealNameInput = document.getElementById("mealName");
  const mealName = mealNameInput.value.trim() || `Meal ${new Date().toLocaleString()}`;

  const servingsInput = document.getElementById("mealServings");
  const servings = Math.max(1, parseInt(servingsInput.value) || 1);

  // Calculate totals
  const totals = mealItems.reduce((acc, item) => {
    acc.calories += item.calories;
    acc.protein += item.protein;
    acc.fat += item.fat;
    acc.carbs += item.carbs;
    acc.fiber += (item.fiber || 0);
    return acc;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });

  // Calculate per-serving totals
  const perServing = {
    calories: +(totals.calories / servings).toFixed(1),
    protein: +(totals.protein / servings).toFixed(1),
    fat: +(totals.fat / servings).toFixed(1),
    carbs: +(totals.carbs / servings).toFixed(1),
    fiber: +(totals.fiber / servings).toFixed(1),
  };

  const savedMeal = {
    id: Date.now(),
    username: "anonymous",
    name: mealName,
    servings: servings,
    date: new Date().toISOString(),
    items: [...mealItems],
    totals: totals,
    perServing: perServing,
  };

  const history = await getMealHistory();
  history.unshift(savedMeal); // newest first
  await saveMealHistory(history);

  alert(`Meal "${mealName}" saved to database!`);
  mealNameInput.value = "";

  // Optionally clear current meal
  if (confirm("Clear current meal?")) {
    mealItems = [];
    displayMeal();
  }
});

// 📅 Add to Today's Tracker — requires login
document.getElementById("addToTrackerBtn").addEventListener("click", async function () {
  if (mealItems.length === 0) {
    alert("No items in the current meal. Add ingredients first.");
    return;
  }

  // Get active user from cookie
  const selectedUser = getActiveUserFromCookie();

  if (!selectedUser) {
    alert("⚠️ You must be logged in to add meals to your daily tracker.\n\nPlease log in from the Home page first.");
    return;
  }

  const mealNameInput = document.getElementById("mealName");
  const mealName = mealNameInput.value.trim() || `Meal ${new Date().toLocaleString()}`;

  const servingsInput = document.getElementById("mealServings");
  const totalServings = Math.max(1, parseInt(servingsInput.value) || 1);

  const trackerServingsInput = document.getElementById("trackerServings");
  const servingsEaten = Math.max(1, parseInt(trackerServingsInput.value) || 1);

  // Calculate totals for the full recipe
  const totals = mealItems.reduce((acc, item) => {
    acc.calories += item.calories;
    acc.protein += item.protein;
    acc.fat += item.fat;
    acc.carbs += item.carbs;
    acc.fiber += (item.fiber || 0);
    return acc;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });

  // Per serving
  const perServing = {
    calories: +(totals.calories / totalServings).toFixed(1),
    protein: +(totals.protein / totalServings).toFixed(1),
    fat: +(totals.fat / totalServings).toFixed(1),
    carbs: +(totals.carbs / totalServings).toFixed(1),
    fiber: +(totals.fiber / totalServings).toFixed(1),
  };

  // What gets logged to tracker = perServing * servingsEaten
  const trackerEntry = {
    id: Date.now(),
    username: selectedUser,
    name: mealName + (servingsEaten > 1 ? ` (x${servingsEaten})` : ""),
    servings: totalServings,
    servingsEaten: servingsEaten,
    date: new Date().toISOString(),
    items: [...mealItems],
    totals: {
      calories: +(perServing.calories * servingsEaten).toFixed(1),
      protein: +(perServing.protein * servingsEaten).toFixed(1),
      fat: +(perServing.fat * servingsEaten).toFixed(1),
      carbs: +(perServing.carbs * servingsEaten).toFixed(1),
      fiber: +(perServing.fiber * servingsEaten).toFixed(1),
    },
    perServing: perServing,
    addedToTracker: true,
  };

  const history = await getMealHistory();
  history.unshift(trackerEntry);
  await saveMealHistory(history);

  alert(`✅ "${mealName}" (${servingsEaten} serving${servingsEaten > 1 ? 's' : ''}) added to today's tracker!\n\nView your daily progress on the Daily Tracker page.`);
});

// Helper: get active user from cookie
function getActiveUserFromCookie() {
  const match = document.cookie.match(/(?:^|; )activeUser=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}
