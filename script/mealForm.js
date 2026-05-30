import { mockNutritionDB, syncFromCloud } from './mockDatabase.js';
import { isCloudEnabled, saveToCloud, loadFromCloud } from './cloudStorage.js';

// Example usage
console.log(mockNutritionDB);

// Populate the ingredient dropdown
function populateIngredientDropdown() {
  const ingredientDropdown = document.getElementById("ingredient");
  if (!ingredientDropdown) {
    console.error("Element with id 'ingredient' not found.");
    return;
  }

  ingredientDropdown.innerHTML = ""; // Clear existing options

  // Add a default placeholder option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select an ingredient";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  ingredientDropdown.appendChild(defaultOption);

  // Populate the dropdown with sorted ingredients
  Object.keys(mockNutritionDB).sort().forEach((ingredient) => {
    const option = document.createElement("option");
    option.value = ingredient;
    option.textContent = ingredient.charAt(0).toUpperCase() + ingredient.slice(1);
    ingredientDropdown.appendChild(option);
  });
}

// Show active user on the meal page
function populateUsernameDropdown() {
  const userSelect = document.getElementById("mealUsername");
  if (!userSelect) return;
  const activeUser = localStorage.getItem("activeUser") || "";
  const users = JSON.parse(localStorage.getItem("userProfiles")) || {};
  if (activeUser && users[activeUser]) {
    userSelect.innerHTML = `<option value="${activeUser}" selected>${users[activeUser].name}</option>`;
  } else {
    userSelect.innerHTML = '<option value="">-- Not logged in --</option>';
  }
}

// Call the function to populate the dropdown on page load
document.addEventListener("DOMContentLoaded", async () => {
  await syncFromCloud();
  populateIngredientDropdown();
  populateUsernameDropdown();
  loadMealFromStorage();
});

// 🥗 Meal Form Handling
const form = document.getElementById("mealForm");
const output = document.getElementById("mealOutput");
const ingredientDropdown = document.getElementById("ingredient");
let mealItems = [];

// 💾 Meal persistence
function saveMealToStorage() {
  localStorage.setItem("currentMeal", JSON.stringify(mealItems));
}

function loadMealFromStorage() {
  const saved = localStorage.getItem("currentMeal");
  if (saved) {
    mealItems = JSON.parse(saved);
    displayMeal();
  }
}

// 📋 Handle form submission for adding meal items
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const ingredientInput = ingredientDropdown.value.trim().toLowerCase();
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
  saveMealToStorage();
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

  Object.values(groupedItems).forEach((item, index) => {
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
      saveMealToStorage();
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
  saveMealToStorage();
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
  saveMealToStorage();
  displayMeal();
}

// 💾 Save meal to long-term history
const MEAL_HISTORY_KEY = "mealHistory";

function getMealHistory() {
  return JSON.parse(localStorage.getItem(MEAL_HISTORY_KEY)) || [];
}

function saveMealHistory(history) {
  localStorage.setItem(MEAL_HISTORY_KEY, JSON.stringify(history));
  // Also save to cloud if enabled
  if (isCloudEnabled()) {
    const cloudData = { mealHistory: history };
    saveToCloud(cloudData);
  }
  // Also save to Firebase if available
  if (typeof cloudSaveAllMealHistory === "function" && typeof isFirebaseReady === "function" && isFirebaseReady()) {
    cloudSaveAllMealHistory(history);
  }
}

document.getElementById("saveMealBtn").addEventListener("click", function () {
  if (mealItems.length === 0) {
    alert("No items in the current meal to save.");
    return;
  }

  const mealUsernameSelect = document.getElementById("mealUsername");
  const selectedUser = mealUsernameSelect ? mealUsernameSelect.value : "";
  if (!selectedUser) {
    alert("Please log in first from the Home page to save meals.");
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
    username: selectedUser,
    name: mealName,
    servings: servings,
    date: new Date().toISOString(),
    items: [...mealItems],
    totals: totals,
    perServing: perServing,
  };

  const history = getMealHistory();
  history.unshift(savedMeal); // newest first
  saveMealHistory(history);

  alert(`Meal "${mealName}" saved to history!`);
  mealNameInput.value = "";

  // Optionally clear current meal
  if (confirm("Clear current meal?")) {
    mealItems = [];
    saveMealToStorage();
    displayMeal();
  }
});
