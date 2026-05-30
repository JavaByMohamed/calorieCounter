// ☁️ Cloud Storage using JSONBin.io (Free tier: 10,000 requests/month)
// 
// HOW TO SET UP:
// 1. Go to https://jsonbin.io and create a free account
// 2. Go to API Keys and copy your X-Master-Key
// 3. Paste it below in JSONBIN_API_KEY
// 4. On first run, the app will create a bin automatically and save the ID to localStorage
//
// If no API key is set, the app will fall back to localStorage only.

const JSONBIN_API_KEY = "$2a$10$t/4D4oqS7HjgdAK4oFCEh.edlMkwvaV9j.qoxrcd6o0TUGQZRKq4m"; // <-- Paste your JSONBin.io X-Master-Key here
const JSONBIN_BIN_ID_KEY = "jsonbin_bin_id"; // localStorage key to store the bin ID

export function isCloudEnabled() {
  return JSONBIN_API_KEY.length > 0;
}

// Create a new bin on JSONBin.io
async function createBin(data) {
  try {
    const response = await fetch("https://api.jsonbin.io/v3/b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
        "X-Bin-Name": "calorieCounter-ingredients",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (result.metadata && result.metadata.id) {
      localStorage.setItem(JSONBIN_BIN_ID_KEY, result.metadata.id);
      console.log("☁️ Created cloud bin:", result.metadata.id);
      return result.metadata.id;
    }
  } catch (error) {
    console.error("☁️ Failed to create bin:", error);
  }
  return null;
}

// Get the bin ID (from localStorage)
function getBinId() {
  return localStorage.getItem(JSONBIN_BIN_ID_KEY);
}

// Save data to JSONBin.io
export async function saveToCloud(data) {
  if (!isCloudEnabled()) return false;

  let binId = getBinId();

  // If no bin exists yet, create one
  if (!binId) {
    binId = await createBin(data);
    return binId !== null;
  }

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    console.log("☁️ Saved to cloud");
    return result.metadata !== undefined;
  } catch (error) {
    console.error("☁️ Failed to save to cloud:", error);
    return false;
  }
}

// Load data from JSONBin.io
export async function loadFromCloud() {
  if (!isCloudEnabled()) return null;

  const binId = getBinId();
  if (!binId) return null;

  try {
    const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
      method: "GET",
      headers: {
        "X-Master-Key": JSONBIN_API_KEY,
      },
    });
    const result = await response.json();
    if (result.record) {
      console.log("☁️ Loaded from cloud");
      return result.record;
    }
  } catch (error) {
    console.error("☁️ Failed to load from cloud:", error);
  }
  return null;
}

