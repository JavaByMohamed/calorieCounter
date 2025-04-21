const defaultMockNutritionDB = {
  "chicken breast": { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  "rice": { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  "broccoli": { calories: 55, protein: 3.7, fat: 0.6, carbs: 11 },
  "egg": { calories: 155, protein: 13, fat: 11, carbs: 1.1 },
};

// Load the database from localStorage or use the default data
export const mockNutritionDB = JSON.parse(localStorage.getItem("mockNutritionDB")) || defaultMockNutritionDB;

// Save the database to localStorage
export function saveMockNutritionDB() {
  localStorage.setItem("mockNutritionDB", JSON.stringify(mockNutritionDB));
}

// Function to add a new ingredient to the database
export function addIngredient(name, calories, protein, fat, carbs) {
  mockNutritionDB[name.toLowerCase()] = {
    calories: parseFloat(calories),
    protein: parseFloat(protein),
    fat: parseFloat(fat),
    carbs: parseFloat(carbs),
  };
  saveMockNutritionDB(); // Save the updated database to localStorage
}