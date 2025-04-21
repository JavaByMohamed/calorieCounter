// Import other scripts
import './mockDatabase.js';
import './mealForm.js';
import './bmiBmr.js';
import './ingredientManagement.js';
import './dropdownMenu.js';

// 🛠️ Initialize the app
const addIngredientForm = document.getElementById("addIngredientForm");
addIngredientForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("ingredientName").value.trim().toLowerCase();
  const calories = parseFloat(document.getElementById("ingredientCalories").value);
  const protein = parseFloat(document.getElementById("ingredientProtein").value);
  const fat = parseFloat(document.getElementById("ingredientFat").value);
  const carbs = parseFloat(document.getElementById("ingredientCarbs").value);

  // Validate inputs
  if (!name || isNaN(calories) || isNaN(protein) || isNaN(fat) || isNaN(carbs)) {
    alert("Please enter valid ingredient details.");
    return;
  }

  // Add the new ingredient to the database
  mockNutritionDB[name] = {
    calories: calories,
    protein: protein,
    fat: fat,
    carbs: carbs,
  };

  // Refresh the ingredient list
  displayIngredients();

  // Reset the form
  addIngredientForm.reset();
});

// Populate dropdown and display ingredients on page load
populateIngredientDropdown();
displayIngredients();