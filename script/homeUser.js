// Home page user login / create account logic
const USERS_KEY = "userProfiles";
const ACTIVE_USER_KEY = "activeUser";

function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  // Sync each user to cloud
  if (typeof cloudSaveUser === "function" && typeof isFirebaseReady === "function" && isFirebaseReady()) {
    for (const key in users) {
      cloudSaveUser(key, users[key]).then(ok => {
        if (ok) console.log(`☁️ User "${key}" synced to Firebase`);
        else console.warn(`⚠️ User "${key}" failed to sync to Firebase`);
      });
    }
  } else {
    console.warn("⚠️ Firebase not ready — user saved to localStorage only. firebaseReady:", typeof isFirebaseReady === "function" ? isFirebaseReady() : "N/A");
  }
}

function getActiveUser() {
  return localStorage.getItem(ACTIVE_USER_KEY) || "";
}

function setActiveUser(username) {
  localStorage.setItem(ACTIVE_USER_KEY, username);
  localStorage.setItem("lastSelectedUser", username);
}

function clearActiveUser() {
  localStorage.removeItem(ACTIVE_USER_KEY);
}

// Simple hash for password (not cryptographically secure — localStorage demo only)
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36);
}

// Generate a 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Pending registration data (stored temporarily until verified)
let pendingRegistration = null;
let pendingVerificationCode = null;

// Password reset state
let resetVerificationCode = null;
let resetTargetUserKey = null;

// UI
const loginSection = document.getElementById("loginSection");
const welcomeSection = document.getElementById("welcomeSection");
const activeUserBar = document.getElementById("activeUserBar");
const activeUserName = document.getElementById("activeUserName");

function refreshHomeUI() {
  const active = getActiveUser();
  const users = getUsers();

  if (active && users[active]) {
    loginSection.style.display = "none";
    welcomeSection.style.display = "block";
    activeUserBar.style.display = "flex";
    activeUserName.textContent = users[active].name;
  } else {
    clearActiveUser();
    loginSection.style.display = "block";
    welcomeSection.style.display = "none";
    activeUserBar.style.display = "none";
  }
}

// Login — supports username or email
document.getElementById("loginBtn").addEventListener("click", () => {
  const input = document.getElementById("loginUsername").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value;
  if (!input) { alert("Please enter your username or email."); return; }
  if (!password) { alert("Please enter your password."); return; }

  const users = getUsers();
  const hashedPw = simpleHash(password);

  // Find user by username or email
  let foundKey = null;
  if (users[input] && users[input].password === hashedPw) {
    foundKey = input;
  } else {
    // Search by email
    for (const key in users) {
      if (users[key].email === input && users[key].password === hashedPw) {
        foundKey = key;
        break;
      }
    }
  }

  if (!foundKey) {
    alert("Invalid username/email or password.");
    return;
  }

  setActiveUser(foundKey);
  refreshHomeUI();
});

// Show create form
document.getElementById("showCreateBtn").addEventListener("click", () => {
  document.getElementById("createAccountForm").style.display = "block";
});

document.getElementById("cancelCreateBtn").addEventListener("click", () => {
  document.getElementById("createAccountForm").style.display = "none";
});

// Create account — Step 1: Validate and show email verification
document.getElementById("createAccountBtn").addEventListener("click", () => {
  const name = document.getElementById("createUsername").value.trim();
  const email = document.getElementById("createEmail").value.trim().toLowerCase();
  const password = document.getElementById("createPassword").value;
  const passwordConfirm = document.getElementById("createPasswordConfirm").value;

  if (!name) { alert("Please enter a username."); return; }
  if (!email) { alert("Please enter an email."); return; }
  if (!password) { alert("Please enter a password."); return; }
  if (password.length < 4) { alert("Password must be at least 4 characters."); return; }
  if (password !== passwordConfirm) { alert("Passwords do not match."); return; }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("Please enter a valid email address.");
    return;
  }

  // Collect health conditions
  const healthConditions = [];
  if (document.getElementById("condHypothyroid").checked) healthConditions.push("hypothyroid");
  if (document.getElementById("condHyperthyroid").checked) healthConditions.push("hyperthyroid");
  if (document.getElementById("condDiabetes").checked) healthConditions.push("diabetes");
  if (document.getElementById("condHighBP").checked) healthConditions.push("highBloodPressure");

  const key = name.toLowerCase();
  const users = getUsers();

  // Check username uniqueness
  if (users[key]) {
    alert("Username already taken. Please choose another.");
    return;
  }

  // Check email uniqueness
  for (const k in users) {
    if (users[k].email === email) {
      alert("An account with this email already exists. Please log in.");
      return;
    }
  }

  // Base goals
  let calories = 2000, protein = 150, fat = 65, carbs = 250, fiber = 30;

  // Adjust goals based on health conditions
  const tips = [];
  if (healthConditions.includes("hypothyroid")) {
    calories -= 200;
    carbs -= 30;
    fiber += 5;
    tips.push("🦋 Hypothyroidism: Reduced calorie & carb targets to support slower metabolism. Focus on fiber-rich foods.");
  }
  if (healthConditions.includes("hyperthyroid")) {
    calories += 300;
    protein += 20;
    carbs += 30;
    tips.push("🦋 Hyperthyroidism: Increased calorie & protein targets to compensate for faster metabolism.");
  }
  if (healthConditions.includes("diabetes")) {
    carbs -= 50;
    fiber += 5;
    fat -= 10;
    tips.push("🩸 Diabetes: Reduced carbs and increased fiber to help manage blood sugar levels.");
  }
  if (healthConditions.includes("highBloodPressure")) {
    fat -= 10;
    tips.push("❤️ High Blood Pressure: Reduced fat target. Remember to limit sodium intake to <2300mg/day.");
  }

  // Store pending registration (not saved until email verified)
  pendingRegistration = {
    key: key,
    name: name,
    email: email,
    password: simpleHash(password),
    healthConditions: healthConditions,
    goals: {
      calories: Math.max(calories, 1200),
      protein: Math.max(protein, 50),
      fat: Math.max(fat, 30),
      carbs: Math.max(carbs, 100),
      fiber: Math.max(fiber, 20),
    },
    tips: tips,
    createdAt: new Date().toISOString(),
  };

  // Generate and "send" verification code
  pendingVerificationCode = generateVerificationCode();

  // Show verification form
  document.getElementById("createAccountForm").style.display = "none";
  document.getElementById("emailVerificationForm").style.display = "block";
  document.getElementById("verifyEmailDisplay").textContent = email;
  document.getElementById("verifyCode").value = "";

  // Send email (or show code in demo mode)
  sendVerificationEmail(email, name, pendingVerificationCode, "verification").then((sent) => {
    if (sent) {
      // Real email sent — hide the demo code display
      document.getElementById("verifyCodeDisplay").style.display = "none";
      document.querySelector("#emailVerificationForm .sim-notice").style.display = "none";
    } else {
      // Demo mode — show code on screen
      document.getElementById("verifyCodeDisplay").style.display = "block";
      document.getElementById("verifyCodeDisplay").textContent = pendingVerificationCode;
      document.querySelector("#emailVerificationForm .sim-notice").style.display = "block";
    }
  });
});

// Create account — Step 2: Verify email code and complete registration
document.getElementById("confirmVerifyBtn").addEventListener("click", () => {
  const enteredCode = document.getElementById("verifyCode").value.trim();

  if (!enteredCode) { alert("Please enter the verification code."); return; }
  if (enteredCode !== pendingVerificationCode) {
    alert("❌ Invalid verification code. Please try again.");
    return;
  }

  // Code is correct — save the user
  const users = getUsers();
  users[pendingRegistration.key] = {
    name: pendingRegistration.name,
    email: pendingRegistration.email,
    password: pendingRegistration.password,
    healthConditions: pendingRegistration.healthConditions,
    goals: pendingRegistration.goals,
    emailVerified: true,
    createdAt: pendingRegistration.createdAt,
  };
  saveUsers(users);
  setActiveUser(pendingRegistration.key);

  document.getElementById("emailVerificationForm").style.display = "none";
  refreshHomeUI();

  let msg = `Welcome, ${pendingRegistration.name}! Your email has been verified and account created. 🎉\n\nYou can set your daily macro goals on the Daily Tracker page.`;
  if (pendingRegistration.tips.length > 0) {
    msg += `\n\n📋 Your goals have been adjusted for your health conditions:\n\n` + pendingRegistration.tips.join("\n\n");
  }
  alert(msg);

  pendingRegistration = null;
  pendingVerificationCode = null;
});

// Resend verification code
document.getElementById("resendVerifyBtn").addEventListener("click", () => {
  pendingVerificationCode = generateVerificationCode();
  document.getElementById("verifyCode").value = "";

  sendVerificationEmail(pendingRegistration.email, pendingRegistration.name, pendingVerificationCode, "verification").then((sent) => {
    if (sent) {
      document.getElementById("verifyCodeDisplay").style.display = "none";
      document.querySelector("#emailVerificationForm .sim-notice").style.display = "none";
      alert("🔄 A new verification code has been sent to your email.");
    } else {
      document.getElementById("verifyCodeDisplay").style.display = "block";
      document.getElementById("verifyCodeDisplay").textContent = pendingVerificationCode;
      alert("🔄 A new verification code has been generated (demo mode).");
    }
  });
});

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  clearActiveUser();
  refreshHomeUI();
});

// === FORGOT PASSWORD ===
document.getElementById("forgotPasswordLink").addEventListener("click", (e) => {
  e.preventDefault();
  document.getElementById("forgotPasswordForm").style.display = "block";
  document.getElementById("resetCodeSection").style.display = "none";
  document.getElementById("resetEmail").value = "";
});

document.getElementById("cancelResetBtn").addEventListener("click", () => {
  document.getElementById("forgotPasswordForm").style.display = "none";
  resetVerificationCode = null;
  resetTargetUserKey = null;
});

// Send reset code
document.getElementById("sendResetCodeBtn").addEventListener("click", () => {
  const email = document.getElementById("resetEmail").value.trim().toLowerCase();
  if (!email) { alert("Please enter your email address."); return; }

  const users = getUsers();
  let foundKey = null;
  for (const key in users) {
    if (users[key].email === email) {
      foundKey = key;
      break;
    }
  }

  if (!foundKey) {
    alert("No account found with that email address.");
    return;
  }

  // Generate and "send" reset code
  resetVerificationCode = generateVerificationCode();
  resetTargetUserKey = foundKey;

  document.getElementById("resetCodeSection").style.display = "block";
  document.getElementById("resetCode").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("newPasswordConfirm").value = "";

  sendVerificationEmail(email, users[foundKey].name, resetVerificationCode, "reset").then((sent) => {
    if (sent) {
      document.getElementById("resetCodeDisplay").style.display = "none";
      document.querySelector("#forgotPasswordForm .sim-notice").style.display = "none";
      alert("📧 A reset code has been sent to your email.");
    } else {
      document.getElementById("resetCodeDisplay").style.display = "block";
      document.getElementById("resetCodeDisplay").textContent = resetVerificationCode;
      if (document.querySelector("#forgotPasswordForm .sim-notice")) {
        document.querySelector("#forgotPasswordForm .sim-notice").style.display = "block";
      }
    }
  });
});

// Confirm reset
document.getElementById("confirmResetBtn").addEventListener("click", () => {
  const code = document.getElementById("resetCode").value.trim();
  const newPw = document.getElementById("newPassword").value;
  const newPwConfirm = document.getElementById("newPasswordConfirm").value;

  if (!code) { alert("Please enter the verification code."); return; }
  if (code !== resetVerificationCode) { alert("❌ Invalid verification code."); return; }
  if (!newPw) { alert("Please enter a new password."); return; }
  if (newPw.length < 4) { alert("Password must be at least 4 characters."); return; }
  if (newPw !== newPwConfirm) { alert("Passwords do not match."); return; }

  // Update password
  const users = getUsers();
  users[resetTargetUserKey].password = simpleHash(newPw);
  saveUsers(users);

  document.getElementById("forgotPasswordForm").style.display = "none";
  resetVerificationCode = null;
  resetTargetUserKey = null;

  alert(`✅ Password has been reset successfully for "${users[resetTargetUserKey]?.name || resetTargetUserKey}". You can now log in with your new password.`);
});

// Allow Enter key on login inputs
document.getElementById("loginUsername").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("loginPassword").focus();
});
document.getElementById("loginPassword").addEventListener("keydown", (e) => {
  if (e.key === "Enter") document.getElementById("loginBtn").click();
});

// Init
initEmailService();
initFirebase();
refreshHomeUI();

// Auto-sync with cloud after page loads
if (typeof autoSync === "function") {
  autoSync().then(() => refreshHomeUI());
}
