// ============================================================
// Firebase Cloud Storage Integration
// Provides permanent cloud-based storage for user accounts,
// meals, and workouts using Firebase Firestore.
//
// SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (e.g., "calorieCounter")
// 3. Add a Web App (Project Settings > General > Your Apps > Add App > Web)
// 4. Copy your Firebase config below
// 5. Enable Firestore Database (Build > Firestore Database > Create)
//    - Choose "Start in test mode" for development
// 6. Enable Authentication (Build > Authentication > Get Started)
//    - Enable "Email/Password" sign-in method
// ============================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBQqGp1jcqqKEopkb1X37-z91tEIO73XSs",
  authDomain: "caloriecounter-7411c.firebaseapp.com",
  projectId: "caloriecounter-7411c",
  storageBucket: "caloriecounter-7411c.firebasestorage.app",
  messagingSenderId: "599834101168",
  appId: "1:599834101168:web:156656bfefa14ca35bc275",
};

// ============================================================
// Firebase Initialization
// ============================================================

let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;
let firebaseReady = false;

async function initFirebase() {
  if (FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
    console.warn("⚠️ Firebase not configured. Using localStorage only.");
    return false;
  }

  try {
    // Initialize Firebase app
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    } else {
      firebaseApp = firebase.apps[0];
    }

    firebaseDb = firebase.firestore();
    firebaseAuth = firebase.auth();

    // Sign in anonymously so Firestore rules can verify requests come from the app
    try {
      await firebaseAuth.signInAnonymously();
      console.log("✅ Firebase anonymous auth successful");
    } catch (authError) {
      console.warn("⚠️ Anonymous auth failed:", authError.message);
    }

    firebaseReady = true;
    console.log("✅ Firebase initialized — cloud storage active");
    return true;
  } catch (error) {
    console.error("❌ Firebase initialization failed:", error);
    return false;
  }
}

function isFirebaseReady() {
  return firebaseReady && firebaseDb !== null;
}

// ============================================================
// Cloud User Account Management
// ============================================================

/**
 * Save a user profile to Firestore
 */
async function cloudSaveUser(userKey, userData) {
  if (!isFirebaseReady()) return false;
  try {
    await firebaseDb.collection("users").doc(userKey).set(userData, { merge: true });
    console.log(`☁️ User "${userKey}" saved to cloud`);
    return true;
  } catch (error) {
    console.error("❌ Cloud save user failed:", error);
    return false;
  }
}

/**
 * Load a user profile from Firestore
 */
async function cloudLoadUser(userKey) {
  if (!isFirebaseReady()) return null;
  try {
    const doc = await firebaseDb.collection("users").doc(userKey).get();
    if (doc.exists) {
      console.log(`☁️ User "${userKey}" loaded from cloud`);
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error("❌ Cloud load user failed:", error);
    return null;
  }
}

/**
 * Load all users from Firestore
 */
async function cloudLoadAllUsers() {
  if (!isFirebaseReady()) return null;
  try {
    const snapshot = await firebaseDb.collection("users").get();
    const users = {};
    snapshot.forEach((doc) => {
      users[doc.id] = doc.data();
    });
    console.log(`☁️ Loaded ${Object.keys(users).length} users from cloud`);
    return users;
  } catch (error) {
    console.error("❌ Cloud load all users failed:", error);
    return null;
  }
}

/**
 * Delete a user from Firestore
 */
async function cloudDeleteUser(userKey) {
  if (!isFirebaseReady()) return false;
  try {
    await firebaseDb.collection("users").doc(userKey).delete();
    console.log(`☁️ User "${userKey}" deleted from cloud`);
    return true;
  } catch (error) {
    console.error("❌ Cloud delete user failed:", error);
    return false;
  }
}

/**
 * Check if a user exists in the cloud by email
 */
async function cloudFindUserByEmail(email) {
  if (!isFirebaseReady()) return null;
  try {
    const snapshot = await firebaseDb.collection("users")
      .where("email", "==", email.toLowerCase())
      .limit(1)
      .get();
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { key: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error("❌ Cloud find user by email failed:", error);
    return null;
  }
}

// ============================================================
// Cloud Meal History Management
// ============================================================

/**
 * Save meal history to Firestore (per user)
 */
async function cloudSaveMealHistory(userKey, meals) {
  if (!isFirebaseReady()) return false;
  try {
    await firebaseDb.collection("mealHistory").doc(userKey).set({ meals: meals });
    console.log(`☁️ Meal history for "${userKey}" saved to cloud`);
    return true;
  } catch (error) {
    console.error("❌ Cloud save meal history failed:", error);
    return false;
  }
}

/**
 * Load meal history from Firestore (per user)
 */
async function cloudLoadMealHistory(userKey) {
  if (!isFirebaseReady()) return null;
  try {
    const doc = await firebaseDb.collection("mealHistory").doc(userKey).get();
    if (doc.exists) {
      return doc.data().meals || [];
    }
    return [];
  } catch (error) {
    console.error("❌ Cloud load meal history failed:", error);
    return null;
  }
}

/**
 * Save all meal history (for all users combined)
 */
async function cloudSaveAllMealHistory(mealHistory) {
  if (!isFirebaseReady()) return false;
  try {
    await firebaseDb.collection("mealHistory").doc("_all").set({ meals: mealHistory });
    console.log(`☁️ Full meal history saved to cloud`);
    return true;
  } catch (error) {
    console.error("❌ Cloud save all meal history failed:", error);
    return false;
  }
}

/**
 * Load all meal history
 */
async function cloudLoadAllMealHistory() {
  if (!isFirebaseReady()) return null;
  try {
    const doc = await firebaseDb.collection("mealHistory").doc("_all").get();
    if (doc.exists) {
      return doc.data().meals || [];
    }
    return [];
  } catch (error) {
    console.error("❌ Cloud load all meal history failed:", error);
    return null;
  }
}

// ============================================================
// Cloud Workout Management
// ============================================================

/**
 * Save workouts to Firestore (per user)
 */
async function cloudSaveWorkouts(userKey, workouts) {
  if (!isFirebaseReady()) return false;
  try {
    await firebaseDb.collection("workouts").doc(userKey).set({ workouts: workouts });
    console.log(`☁️ Workouts for "${userKey}" saved to cloud`);
    return true;
  } catch (error) {
    console.error("❌ Cloud save workouts failed:", error);
    return false;
  }
}

/**
 * Load workouts from Firestore (per user)
 */
async function cloudLoadWorkouts(userKey) {
  if (!isFirebaseReady()) return null;
  try {
    const doc = await firebaseDb.collection("workouts").doc(userKey).get();
    if (doc.exists) {
      return doc.data().workouts || [];
    }
    return [];
  } catch (error) {
    console.error("❌ Cloud load workouts failed:", error);
    return null;
  }
}

// ============================================================
// Cloud Ingredients Management
// ============================================================

/**
 * Save custom ingredients to Firestore
 */
async function cloudSaveIngredients(ingredients) {
  if (!isFirebaseReady()) return false;
  try {
    await firebaseDb.collection("app").doc("ingredients").set({ data: ingredients });
    console.log("☁️ Ingredients saved to cloud");
    return true;
  } catch (error) {
    console.error("❌ Cloud save ingredients failed:", error);
    return false;
  }
}

/**
 * Load custom ingredients from Firestore
 */
async function cloudLoadIngredients() {
  if (!isFirebaseReady()) return null;
  try {
    const doc = await firebaseDb.collection("app").doc("ingredients").get();
    if (doc.exists) {
      return doc.data().data || {};
    }
    return null;
  } catch (error) {
    console.error("❌ Cloud load ingredients failed:", error);
    return null;
  }
}

// ============================================================
// Sync: localStorage ↔ Cloud
// ============================================================

/**
 * Full sync: Push all localStorage data to cloud
 */
async function syncLocalToCloud() {
  if (!isFirebaseReady()) return false;

  try {
    // Sync users
    const users = JSON.parse(localStorage.getItem("userProfiles")) || {};
    for (const key in users) {
      await cloudSaveUser(key, users[key]);
    }

    // Sync meal history
    const mealHistory = JSON.parse(localStorage.getItem("mealHistory")) || [];
    await cloudSaveAllMealHistory(mealHistory);

    // Sync workouts per user
    for (const key in users) {
      const workouts = JSON.parse(localStorage.getItem(`workouts_${key}`)) || [];
      if (workouts.length > 0) {
        await cloudSaveWorkouts(key, workouts);
      }
    }

    // Sync ingredients
    const ingredients = JSON.parse(localStorage.getItem("customIngredients")) || {};
    if (Object.keys(ingredients).length > 0) {
      await cloudSaveIngredients(ingredients);
    }

    console.log("✅ Full sync: local → cloud complete");
    return true;
  } catch (error) {
    console.error("❌ Sync local to cloud failed:", error);
    return false;
  }
}

/**
 * Full sync: Pull all cloud data to localStorage
 */
async function syncCloudToLocal() {
  if (!isFirebaseReady()) return false;

  try {
    // Sync users
    const cloudUsers = await cloudLoadAllUsers();
    if (cloudUsers && Object.keys(cloudUsers).length > 0) {
      const localUsers = JSON.parse(localStorage.getItem("userProfiles")) || {};
      // Merge: cloud wins for conflicts, keep local-only entries
      const merged = { ...localUsers, ...cloudUsers };
      localStorage.setItem("userProfiles", JSON.stringify(merged));
    }

    // Sync meal history
    const cloudMeals = await cloudLoadAllMealHistory();
    if (cloudMeals && cloudMeals.length > 0) {
      const localMeals = JSON.parse(localStorage.getItem("mealHistory")) || [];
      // Merge by ID (cloud wins for duplicates)
      const mealMap = {};
      localMeals.forEach((m) => (mealMap[m.id] = m));
      cloudMeals.forEach((m) => (mealMap[m.id] = m));
      const merged = Object.values(mealMap).sort((a, b) => new Date(b.date) - new Date(a.date));
      localStorage.setItem("mealHistory", JSON.stringify(merged));
    }

    // Sync workouts
    const users = JSON.parse(localStorage.getItem("userProfiles")) || {};
    for (const key in users) {
      const cloudWorkouts = await cloudLoadWorkouts(key);
      if (cloudWorkouts && cloudWorkouts.length > 0) {
        localStorage.setItem(`workouts_${key}`, JSON.stringify(cloudWorkouts));
      }
    }

    // Sync ingredients
    const cloudIngredients = await cloudLoadIngredients();
    if (cloudIngredients && Object.keys(cloudIngredients).length > 0) {
      localStorage.setItem("customIngredients", JSON.stringify(cloudIngredients));
    }

    console.log("✅ Full sync: cloud → local complete");
    return true;
  } catch (error) {
    console.error("❌ Sync cloud to local failed:", error);
    return false;
  }
}

/**
 * Auto-sync on page load: pull from cloud, then push local changes
 */
async function autoSync() {
  if (!isFirebaseReady()) return;
  await syncCloudToLocal();
  // Small delay then push any local-only data
  setTimeout(() => syncLocalToCloud(), 1000);
}

// Auto-initialize Firebase when this script loads
initFirebase();

