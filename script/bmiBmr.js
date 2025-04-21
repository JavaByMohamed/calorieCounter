// 📊 BMI and BMR Calculation
const bmiBmrForm = document.getElementById("bmiBmrForm");
const bmiValue = document.getElementById("bmiValue");
const bmiCategory = document.getElementById("bmiCategory");
const bmiAdvice = document.getElementById("bmiAdvice");
const bmrValue = document.getElementById("bmrValue");
const bmrAdvice = document.getElementById("bmrAdvice");

// 🧮 Handle BMI and BMR form submission
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

// 🍽️ Diet Options Calculation
function calculateDietOptions(bmr) {

  const dietOptions = [
    {
      name: "Balanced Diet (Maintenance)",
      carbs: 40,
      protein: 30,
      fat: 30,
    },
    {
      name: "High Protein (Fat Loss)",
      carbs: 30,
      protein: 40,
      fat: 30,
    },
    {
      name: "Muscle Gain (Higher Carbs)",
      carbs: 50,
      protein: 30,
      fat: 20,
    },
    {
      name: "Low Carbs (Keto)",
      carbs: 10,
      protein: 60,
      fat: 30,
    },
  ];

  let html = `
    <h2>Choose Your Diet Plan</h2>
    <p>Based on your BMI and BMR, we recommend the following diet plans:</p>
    <ul>
  `;

  dietOptions.forEach((option, index) => {
    const carbCalories = (bmr * option.carbs) / 100;
    const proteinCalories = (bmr * option.protein) / 100;
    const fatCalories = (bmr * option.fat) / 100;

    const carbGrams = (carbCalories / 4).toFixed(1);
    const proteinGrams = (proteinCalories / 4).toFixed(1);
    const fatGrams = (fatCalories / 9).toFixed(1);

    html += `
      <li>
        <h4 class="diet-title" data-index="${index}">${option.name}</h4>
        <div class="diet-details" id="dietDetails-${index}" style="display: none;">
          <p>
            <strong>Calories:</strong> ${bmr.toFixed(1)} kcal<br>
            <strong>Carbs:</strong> ${carbCalories.toFixed(1)} kcal (${carbGrams} g, ${option.carbs}% of total)<br>
            <strong>Protein:</strong> ${proteinCalories.toFixed(1)} kcal (${proteinGrams} g, ${option.protein}% of total)<br>
            <strong>Fat:</strong> ${fatCalories.toFixed(1)} kcal (${fatGrams} g, ${option.fat}% of total)
          </p>
        </div>
      </li>
    `;
  });

  html += "</ul>";

  const dietResults = document.getElementById("dietResults");
  if (!dietResults) {
    console.error("Element with id 'dietResults' not found.");
    return;
  }
  dietResults.innerHTML = html;

  const dietOptionsSection = document.getElementById("dietOptions");
  if (dietOptionsSection) {
    dietOptionsSection.style.display = "block";
    console.log("Diet options section is now visible."); // Debugging
  }

  // Add click event listeners to toggle diet details
  document.querySelectorAll(".diet-title").forEach((title) => {
    title.addEventListener("click", function () {
      const index = this.getAttribute("data-index");
      const details = document.getElementById(`dietDetails-${index}`);
      details.style.display = details.style.display === "none" ? "block" : "none";
    });
  });
}