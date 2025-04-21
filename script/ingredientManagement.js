import { mockNutritionDB, addIngredient, saveMockNutritionDB } from './mockDatabase.js';

// Populate the ingredient dropdown
function populateIngredientDropdown() {
  const ingredientDropdown = document.getElementById("ingredient");
  ingredientDropdown.innerHTML = ""; // Clear existing options

  // Add a default placeholder option
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select an ingredient";
  defaultOption.disabled = true;
  defaultOption.selected = true;
  ingredientDropdown.appendChild(defaultOption);

  // Get sorted ingredient names
  const sortedIngredients = Object.keys(mockNutritionDB).sort();

  // Populate the dropdown with sorted ingredients
  sortedIngredients.forEach((ingredient) => {
    const option = document.createElement("option");
    option.value = ingredient;
    option.textContent = ingredient.charAt(0).toUpperCase() + ingredient.slice(1); // Capitalize the first letter
    ingredientDropdown.appendChild(option);
  });
}

// Populate the ingredient list
function displayIngredients() {
  const ingredientList = document.getElementById("ingredientList");
  if (!ingredientList) {
    console.error("Element with id 'ingredientList' not found.");
    return;
  }

  if (Object.keys(mockNutritionDB).length === 0) {
    ingredientList.innerHTML = "<p>No ingredients added yet.</p>";
    return;
  }

  let html = "<ul>";
  Object.keys(mockNutritionDB).sort().forEach((name) => {
    const data = mockNutritionDB[name];
    html += `
      <li>
        <strong>${name}</strong> - 
        Calories: ${data.calories.toFixed(2)}, 
        Protein: ${data.protein.toFixed(2)}g, 
        Fat: ${data.fat.toFixed(2)}g, 
        Carbs: ${data.carbs.toFixed(2)}g
        <button class="edit-ingredient-btn" data-name="${name}">Edit</button>
        <button class="delete-ingredient-btn" data-name="${name}">Delete</button>
      </li>
    `;
  });
  html += "</ul>";

  ingredientList.innerHTML = html;

  // Add event listeners for delete buttons
  document.querySelectorAll(".delete-ingredient-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const name = this.getAttribute("data-name");
      deleteIngredient(name);
    });
  });

  // Add event listeners for edit buttons
  document.querySelectorAll(".edit-ingredient-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const name = this.getAttribute("data-name");
      editIngredient(name);
    });
  });
}

// Handle form submission to add a new ingredient
const addIngredientForm = document.getElementById("addIngredientForm");
addIngredientForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("ingredientName").value.trim();
  const calories = document.getElementById("ingredientCalories").value;
  const protein = document.getElementById("ingredientProtein").value;
  const fat = document.getElementById("ingredientFat").value;
  const carbs = document.getElementById("ingredientCarbs").value;

  if (!name || isNaN(calories) || isNaN(protein) || isNaN(fat) || isNaN(carbs)) {
    alert("Please enter valid ingredient details.");
    return;
  }

  // Add the new ingredient to the database
  addIngredient(name, calories, protein, fat, carbs);

  // Refresh the ingredient list
  displayIngredients();

  // Reset the form
  addIngredientForm.reset();
});

// Delete an ingredient
function deleteIngredient(name) {
  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    delete mockNutritionDB[name]; // Remove the ingredient from the database
    saveMockNutritionDB(); // Save the updated database to localStorage
    displayIngredients(); // Refresh the ingredient list
  }
}

// Edit an ingredient
let isEditing = false; // Track if an ingredient is being edited

function editIngredient(name) {
  if (isEditing) {
    alert("You are already editing an ingredient. Please save or cancel the current edit before editing another.");
    return;
  }

  isEditing = true;

  const ingredientData = mockNutritionDB[name];

  // Populate the form with the ingredient's current values
  document.getElementById("ingredientName").value = name;
  document.getElementById("ingredientCalories").value = ingredientData.calories;
  document.getElementById("ingredientProtein").value = ingredientData.protein;
  document.getElementById("ingredientFat").value = ingredientData.fat;
  document.getElementById("ingredientCarbs").value = ingredientData.carbs;

  // Disable all "Edit" buttons except the one being edited
  document.querySelectorAll(".edit-ingredient-btn").forEach((button) => {
    button.disabled = true;
  });

  // Enable the "Edit" button for the current ingredient
  const currentEditButton = document.querySelector(`.edit-ingredient-btn[data-name="${name}"]`);
  if (currentEditButton) {
    currentEditButton.disabled = false;
  }

  // Remove the ingredient from the database temporarily
  delete mockNutritionDB[name];
  saveMockNutritionDB();

  // Add a listener to reset the editing state when the form is submitted
  addIngredientForm.addEventListener("submit", () => {
    isEditing = false;
    document.querySelectorAll(".edit-ingredient-btn").forEach((button) => {
      button.disabled = false;
    });
  });
}

// Call the functions on page load
document.addEventListener("DOMContentLoaded", () => {
  displayIngredients();
});