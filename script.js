// 🔧 Mock nutrition database (grams per 100g)
const mockNutritionDB = {
  "chicken breast": { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  "rice": { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  "broccoli": { calories: 55, protein: 3.7, fat: 0.6, carbs: 11 },
  "egg": { calories: 155, protein: 13, fat: 11, carbs: 1.1 },
};

const form = document.getElementById("mealForm");
const output = document.getElementById("mealOutput");

let mealItems = [];

// Handle form submission
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
  };

  // Add entry to meal items and update the display
  mealItems.push(entry);
  displayMeal();
  form.reset();
});

// Display meal summary
function displayMeal() {
  if (mealItems.length === 0) {
    output.innerHTML = "<p>No ingredients added yet.</p>";
    return;
  }

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

  mealItems.forEach((item, index) => {
    html += `
      <tr>
        <td>${item.name}</td>
        <td>${item.amount}</td>
        <td>${item.calories}</td>
        <td>${item.protein}</td>
        <td>${item.fat}</td>
        <td>${item.carbs}</td>
        <td>
          <button class="edit-btn" data-index="${index}">Edit</button>
          <button class="delete-btn" data-index="${index}">Delete</button>
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
      const index = parseInt(this.getAttribute("data-index"));
      deleteMealItem(index);
    });
  });

  // Add event listeners for edit buttons
  document.querySelectorAll(".edit-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const index = parseInt(this.getAttribute("data-index"));
      editMealItem(index);
    });
  });
}

// Function to delete a meal item
function deleteMealItem(index) {
  mealItems.splice(index, 1); // Remove the item at the specified index
  displayMeal(); // Refresh the meal summary
}

// Function to edit a meal item
function editMealItem(index) {
  const item = mealItems[index];
  const ingredientInput = document.getElementById("ingredient");
  const amountInput = document.getElementById("amount");

  // Populate the form with the item's current values
  ingredientInput.value = item.name;
  amountInput.value = item.amount;

  // Remove the item from the list and refresh the display
  mealItems.splice(index, 1);
  displayMeal();
}

// Function to calculate and display diet options
function calculateDietOptions(bmr) {
  const dietOptions = [
    {
      name: "Balanced Diet Maintenance",
      carbs: 40,
      protein: 30,
      fat: 30,
    },
    {
      name: "High Protein Fat Loss",
      carbs: 30,
      protein: 40,
      fat: 30,
    },
    {
      name: "Muscle Gain Higher Carbs",
      carbs: 50,
      protein: 30,
      fat: 20,
    },
    {
      name: "Low Carbs Keto",
      carbs: 10,
      protein: 60,
      fat: 30,
    },
  ];

  let html = "<ul>";

  dietOptions.forEach((option, index) => {
    const carbCalories = (bmr * option.carbs) / 100;
    const proteinCalories = (bmr * option.protein) / 100;
    const fatCalories = (bmr * option.fat) / 100;

    const carbGrams = (carbCalories / 4).toFixed(1);
    const proteinGrams = (proteinCalories / 4).toFixed(1);
    const fatGrams = (fatCalories / 9).toFixed(1);

    html += `
              <h4 class="diet-title" data-index="${index}">${option.name}</h4>
        <div class="diet-details" id="dietDetails-${index}" style="display: none;">
          <p>
            <strong>Calories:</strong> ${bmr.toFixed(1)} kcal<br>
            <strong>Carbs:</strong> ${carbCalories.toFixed(1)} kcal (${carbGrams} g)<br>
            <strong>Protein:</strong> ${proteinCalories.toFixed(1)} kcal (${proteinGrams} g)<br>
            <strong>Fat:</strong> ${fatCalories.toFixed(1)} kcal (${fatGrams} g)
          </p>
        </div>
          `;
  });

  html += "</ul>";

  const dietResults = document.getElementById("dietResults");
  dietResults.innerHTML = html;

  const dietOptionsSection = document.getElementById("dietOptions");
  dietOptionsSection.style.display = "block";

  // Add click event listeners to toggle diet details
  document.querySelectorAll(".diet-title").forEach((title) => {
    title.addEventListener("click", function () {
      const index = this.getAttribute("data-index");
      const details = document.getElementById(`dietDetails-${index}`);
      details.style.display = details.style.display === "none" ? "block" : "none";
    });
  });
}

// Combined BMI and BMR Calculation Logic
const bmiBmrForm = document.getElementById("bmiBmrForm");
const bmiValue = document.getElementById("bmiValue");
const bmiCategory = document.getElementById("bmiCategory");
const bmiAdvice = document.getElementById("bmiAdvice");
const bmrValue = document.getElementById("bmrValue");
const bmrAdvice = document.getElementById("bmrAdvice");

bmiBmrForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const gender = document.querySelector('input[name="sex"]:checked').value;
  const age = parseInt(document.getElementById("age").value);
  const height = parseFloat(document.getElementById("height").value);
  const weight = parseFloat(document.getElementById("weight").value);

  // Validate inputs
  if (age <= 0 || height <= 0 || weight <= 0) {
    alert("Please enter valid age, height, and weight values.");
    return;
  }

  // Calculate BMI
  const heightInMeters = height / 100; // Convert cm to meters
  const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
  bmiValue.textContent = bmi;

  // Determine BMI category
  if (bmi < 18.5) {
    bmiCategory.textContent = "Underweight";
    bmiAdvice.textContent = "Consider eating more nutritious meals.";
  } else if (bmi >= 18.5 && bmi < 24.9) {
    bmiCategory.textContent = "Normal weight";
    bmiAdvice.textContent = "Keep up the good work!";
  } else if (bmi >= 25 && bmi < 29.9) {
    bmiCategory.textContent = "Overweight";
    bmiAdvice.textContent = "Consider a balanced diet and regular exercise.";
  } else {
    bmiCategory.textContent = "Obese";
    bmiAdvice.textContent = "Consult a healthcare provider for guidance.";
  }

  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr;
  if (gender === "m") {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  bmrValue.textContent = bmr.toFixed(1);
  bmrAdvice.textContent = "This is your Basal Metabolic Rate. Adjust your calorie intake accordingly.";

  // Calculate and display diet options
  calculateDietOptions(bmr);
});

// Function to populate the ingredient dropdown
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

// Function to display the current ingredients in the database
function displayIngredients() {
  const ingredientList = document.getElementById("ingredientList");

  if (Object.keys(mockNutritionDB).length === 0) {
    ingredientList.innerHTML = "<p>No ingredients added yet.</p>";
    return;
  }

  // Get sorted ingredient names
  const sortedIngredients = Object.keys(mockNutritionDB).sort();

  let html = "<ul>";
  sortedIngredients.forEach((name) => {
    const data = mockNutritionDB[name];
    html += `
      <li>
        <strong>${name}</strong> - 
        Calories: ${data.calories}, 
        Protein: ${data.protein}g, 
        Fat: ${data.fat}g, 
        Carbs: ${data.carbs}g
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

// Function to delete an ingredient
function deleteIngredient(name) {
  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    delete mockNutritionDB[name]; // Remove the ingredient from the database
    displayIngredients(); // Refresh the ingredient list
    populateIngredientDropdown(); // Update the dropdown
  }
}

// Function to edit an ingredient
function editIngredient(name) {
  const ingredientData = mockNutritionDB[name];

  // Populate the form with the ingredient's current values
  document.getElementById("ingredientName").value = name;
  document.getElementById("ingredientCalories").value = ingredientData.calories;
  document.getElementById("ingredientProtein").value = ingredientData.protein;
  document.getElementById("ingredientFat").value = ingredientData.fat;
  document.getElementById("ingredientCarbs").value = ingredientData.carbs;

  // Remove the ingredient from the database temporarily
  delete mockNutritionDB[name];
  displayIngredients(); // Refresh the ingredient list
  populateIngredientDropdown(); // Update the dropdown
}

// Handle adding a new ingredient
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

// Call the functions to populate the dropdown and display ingredients on page load
populateIngredientDropdown();
displayIngredients();
