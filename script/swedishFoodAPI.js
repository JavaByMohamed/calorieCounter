/**
 * Swedish Food Agency (Livsmedelsverket) API Integration
 * Fetches nutritional data per 100g from Sweden's official food database.
 * API docs: https://dataportal.livsmedelsverket.se/livsmedel/api/v1/
 */

const API_BASE = "https://dataportal.livsmedelsverket.se/livsmedel/api/v1";

// Cache all food items since the API doesn't support server-side text search
let cachedFoods = null;
let cachePromise = null;

/**
 * Load and cache the full food list from the API (2575 items, loaded once)
 */
function loadFoodCache() {
  if (cachePromise) return cachePromise;
  cachePromise = fetch(`${API_BASE}/livsmedel?offset=0&limit=3000&sprak=1`)
    .then(res => {
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      return res.json();
    })
    .then(data => {
      cachedFoods = (data.livsmedel || []).map(item => ({
        id: item.nummer,
        name: item.namn,
      }));
      console.log(`Swedish Food DB loaded: ${cachedFoods.length} items cached.`);
      return cachedFoods;
    })
    .catch(err => {
      console.error("Failed to load Swedish food database:", err);
      cachePromise = null; // Allow retry
      cachedFoods = [];
      return [];
    });
  return cachePromise;
}

/**
 * Search for foods by name (Swedish) — filters cached list client-side
 * @param {string} query - Search term
 * @returns {Promise<Array>} - Array of food items with basic info
 */
export async function searchSwedishFood(query) {
  if (!query || query.trim().length < 2) return [];

  const foods = cachedFoods || await loadFoodCache();
  const q = query.trim().toLowerCase();

  return foods
    .filter(item => item.name && item.name.toLowerCase().includes(q))
    .slice(0, 20);
}

// Start loading the cache immediately on import
loadFoodCache();

// ============================================================
// Open Food Facts API — Swedish grocery store products (Willys, ICA, Coop, Lidl, etc.)
// ============================================================

/**
 * Search Open Food Facts for products sold in Sweden (includes Willys, ICA, Coop, Hemköp, Lidl etc.)
 * @param {string} query - Search term (Swedish or English)
 * @returns {Promise<Array>} - Array of products with nutrition info
 */
export async function searchSwedishStoreProducts(query) {
  if (!query || query.trim().length < 2) return [];

  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query.trim())}&search_simple=1&action=process&json=1&page_size=10&countries_tags_en=sweden&fields=product_name,brands,stores,nutriments,code`;

  // Retry up to 3 times since Open Food Facts can return 503
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`[Store Search] Attempt ${attempt}, URL:`, url);
      const response = await fetch(url);
      console.log("[Store Search] Status:", response.status);

      if (response.status === 503) {
        console.warn(`[Store Search] 503 on attempt ${attempt}, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * attempt));
        continue;
      }
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      const products = data.products || [];
      console.log("[Store Search] Products found:", products.length);

      return products
        .filter(p => p.product_name)
        .map(p => ({
          id: p.code || "",
          name: p.product_name,
          brand: p.brands || "",
          stores: p.stores || "",
          calories: (p.nutriments && (p.nutriments["energy-kcal_100g"] || p.nutriments["energy-kcal"])) || 0,
          protein: (p.nutriments && p.nutriments["proteins_100g"]) || 0,
          fat: (p.nutriments && p.nutriments["fat_100g"]) || 0,
          carbs: (p.nutriments && p.nutriments["carbohydrates_100g"]) || 0,
          fiber: (p.nutriments && p.nutriments["fiber_100g"]) || 0,
          source: "Open Food Facts (Swedish stores)",
        }));
    } catch (err) {
      console.error(`[Store Search] Attempt ${attempt} failed:`, err.message);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  return [];
}

/**
 * Get full nutritional info for a food item by its ID
 * @param {number|string} foodId
 * @returns {Promise<Object|null>} - { name, calories, protein, fat, carbs, fiber } per 100g
 */
export async function getFoodNutrition(foodId) {
  try {
    const response = await fetch(`${API_BASE}/livsmedel/${foodId}/naringsvarden?sprak=1`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const nutrients = await response.json();

    const nutrientList = Array.isArray(nutrients) ? nutrients : nutrients.naringsvarden || [];

    const getValue = (abbr, unit) => {
      const n = nutrientList.find(item =>
        (item.forkortning || "").toLowerCase() === abbr.toLowerCase() &&
        (!unit || (item.enhet || "").toLowerCase() === unit.toLowerCase())
      );
      return n ? parseFloat(n.varde || 0) : 0;
    };

    // Get name from cache
    const foods = cachedFoods || await loadFoodCache();
    const foodItem = foods.find(f => f.id == foodId);

    return {
      name: foodItem ? foodItem.name : "Unknown",
      calories: getValue("Ener", "kcal"),
      protein: getValue("Prot"),
      fat: getValue("Fett"),
      carbs: getValue("Kolh"),
      fiber: getValue("Fibe"),
      source: "Livsmedelsverket (Swedish Food Agency)",
    };
  } catch (err) {
    console.error("Swedish Food API nutrition error:", err);
    return null;
  }
}
