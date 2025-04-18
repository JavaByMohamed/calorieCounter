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
  
  form.addEventListener("submit", function (e) {
    e.preventDefault();
  
    const ingredient = document.getElementById("ingredient").value.toLowerCase();
    const amount = parseFloat(document.getElementById("amount").value);
  
    if (!mockNutritionDB[ingredient]) {
      alert("Ingredient not found in mock database.");
      return;
    }
  
    const base = mockNutritionDB[ingredient];
    const factor = amount / 100;
  
    const entry = {
      name: ingredient,
      amount: amount,
      calories: +(base.calories * factor).toFixed(1),
      protein: +(base.protein * factor).toFixed(1),
      fat: +(base.fat * factor).toFixed(1),
      carbs: +(base.carbs * factor).toFixed(1),
    };
  
    mealItems.push(entry);
    displayMeal();
    form.reset();
  });
  
  function displayMeal() {
    let html = `
      <table>
        <thead>
          <tr>
            <th>Ingredient</th><th>Amount (g)</th><th>Calories</th>
            <th>Protein</th><th>Fat</th><th>Carbs</th>
          </tr>
        </thead>
        <tbody>
    `;
  
    let total = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  
    mealItems.forEach(item => {
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.amount}</td>
          <td>${item.calories}</td>
          <td>${item.protein}</td>
          <td>${item.fat}</td>
          <td>${item.carbs}</td>
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
      <p><strong>Calories:</strong> ${total.calories.toFixed(1)} | 
         <strong>Protein:</strong> ${total.protein.toFixed(1)}g |
         <strong>Fat:</strong> ${total.fat.toFixed(1)}g | 
         <strong>Carbs:</strong> ${total.carbs.toFixed(1)}g</p>
    `;
  
    output.innerHTML = html;
  }
  