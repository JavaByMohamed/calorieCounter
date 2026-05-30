import { isCloudEnabled, saveToCloud, loadFromCloud } from './cloudStorage.js';

const defaultMockNutritionDB = {
  "chicken breast": { calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0 },
  "rice": { calories: 130, protein: 2.7, fat: 0.3, carbs: 28, fiber: 0.4 },
  "broccoli": { calories: 34, protein: 2.8, fat: 0.4, carbs: 7, fiber: 2.6 },
  "egg": { calories: 143, protein: 12.6, fat: 9.5, carbs: 0.7, fiber: 0 },
};

// Load the database from localStorage or use the default data
export const mockNutritionDB = JSON.parse(localStorage.getItem("mockNutritionDB")) || { ...defaultMockNutritionDB };

// Save the database to localStorage AND cloud (if configured)
export function saveMockNutritionDB() {
  localStorage.setItem("mockNutritionDB", JSON.stringify(mockNutritionDB));
  if (isCloudEnabled()) {
    saveToCloud(mockNutritionDB);
  }
}

// Function to add a new ingredient to the database
export function addIngredient(name, calories, protein, fat, carbs, fiber = 0) {
  mockNutritionDB[name.toLowerCase()] = {
    calories: parseFloat(calories),
    protein: parseFloat(protein),
    fat: parseFloat(fat),
    carbs: parseFloat(carbs),
    fiber: parseFloat(fiber) || 0,
  };
  saveMockNutritionDB();
}

// Sync from cloud on startup (if configured)
export async function syncFromCloud() {
  if (!isCloudEnabled()) return false;
  const cloudData = await loadFromCloud();
  if (cloudData) {
    // Merge cloud data into the local DB
    Object.keys(cloudData).forEach((key) => {
      mockNutritionDB[key] = cloudData[key];
    });
    localStorage.setItem("mockNutritionDB", JSON.stringify(mockNutritionDB));
    console.log("☁️ Synced ingredients from cloud");
    return true;
  }
  return false;
}