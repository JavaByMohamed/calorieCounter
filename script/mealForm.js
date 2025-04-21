import { mockNutritionDB, addIngredient, saveMockNutritionDB } from './mockDatabase.js';

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

// Call the function to populate the dropdown on page load
document.addEventListener("DOMContentLoaded", () => {
  populateIngredientDropdown();
});

// 🥗 Meal Form Handling
const form = document.getElementById("mealForm");
const output = document.getElementById("mealOutput");
const ingredientDropdown = document.getElementById("ingredient");
let mealItems = [];

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
      };
    }
    groupedItems[item.name].amount += item.amount;
    groupedItems[item.name].calories += item.calories;
    groupedItems[item.name].protein += item.protein;
    groupedItems[item.name].fat += item.fat;
    groupedItems[item.name].carbs += item.carbs;
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
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
  `;

  let total = { calories: 0, protein: 0, fat: 0, carbs: 0 };

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
        <td>
          <button class="delete-btn" data-name="${item.name}">Delete</button>
        </td>
      </tr>
    `;
    total.calories += item.calories;
    total.protein += item.protein;
    total.fat += item.fat;
    total.carbs += item.carbs;
  });

  html += `
      </tbody>
    </table>
    <h4>Total</h4>
    <p>
      <strong>Calories:</strong> ${total.calories.toFixed(1)} |
      <strong>Protein:</strong> ${total.protein.toFixed(1)}g |
      <strong>Fat:</strong> ${total.fat.toFixed(1)}g |
      <strong>Carbs:</strong> ${total.carbs.toFixed(1)}g
    </p>
  `;

  output.innerHTML = html;

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
  mealItems = mealItems.filter((item) => item.name !== name); // Remove all items with the specified name
  displayMeal(); // Refresh the meal summary
}

// ✏️ Function to edit a meal item's amount
function editMealItem(name, newAmount) {
  // Update the amount for all items with the specified name
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
      };
    }
    return item;
  });
  displayMeal(); // Refresh the meal summary
}