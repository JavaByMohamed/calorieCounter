// Workout Tracker - stores data per username in localStorage

// 🏋️ Predefined exercise database by muscle group
const exerciseDatabase = {
  chest: [
    "Bench Press", "Incline Bench Press", "Decline Bench Press",
    "Dumbbell Fly", "Incline Dumbbell Fly", "Cable Crossover",
    "Push-Ups", "Chest Dips", "Machine Chest Press",
    "Pec Deck Machine", "Landmine Press"
  ],
  back: [
    "Pull-Ups", "Chin-Ups", "Lat Pulldown",
    "Barbell Row", "Dumbbell Row", "Seated Cable Row",
    "T-Bar Row", "Face Pulls", "Deadlift",
    "Rack Pull", "Straight Arm Pulldown", "Inverted Row"
  ],
  shoulders: [
    "Overhead Press", "Dumbbell Shoulder Press", "Arnold Press",
    "Lateral Raise", "Front Raise", "Rear Delt Fly",
    "Upright Row", "Cable Lateral Raise", "Machine Shoulder Press",
    "Shrugs", "Barbell Shrug", "Dumbbell Shrug"
  ],
  biceps: [
    "Barbell Curl", "Dumbbell Curl", "Hammer Curl",
    "Preacher Curl", "Concentration Curl", "Cable Curl",
    "Incline Dumbbell Curl", "EZ-Bar Curl", "Spider Curl",
    "Reverse Curl", "Zottman Curl"
  ],
  triceps: [
    "Tricep Pushdown", "Overhead Tricep Extension", "Skull Crushers",
    "Close-Grip Bench Press", "Dips", "Kickbacks",
    "Cable Overhead Extension", "Diamond Push-Ups", "JM Press"
  ],
  legs: [
    "Squat", "Front Squat", "Leg Press",
    "Leg Extension", "Leg Curl", "Romanian Deadlift",
    "Bulgarian Split Squat", "Lunges", "Walking Lunges",
    "Hack Squat", "Goblet Squat", "Step-Ups",
    "Hip Thrust", "Sumo Deadlift"
  ],
  glutes: [
    "Hip Thrust", "Barbell Hip Thrust", "Glute Bridge",
    "Cable Kickback", "Donkey Kicks", "Fire Hydrants",
    "Sumo Squat", "Step-Ups", "Bulgarian Split Squat",
    "Good Morning"
  ],
  abs: [
    "Crunches", "Sit-Ups", "Leg Raises",
    "Hanging Leg Raise", "Plank", "Side Plank",
    "Russian Twist", "Cable Crunch", "Ab Rollout",
    "Mountain Climbers", "Bicycle Crunches", "Toe Touches"
  ],
  forearms: [
    "Wrist Curl", "Reverse Wrist Curl", "Farmer's Walk",
    "Dead Hang", "Plate Pinch", "Towel Pull-Up",
    "Grip Squeeze", "Reverse Curl"
  ],
  calves: [
    "Standing Calf Raise", "Seated Calf Raise", "Donkey Calf Raise",
    "Single-Leg Calf Raise", "Smith Machine Calf Raise",
    "Leg Press Calf Raise", "Jump Rope"
  ]
};

let currentUser = "";

// Populate username dropdown with active user only
function populateWorkoutUserDropdown() {
  const select = document.getElementById("workoutUsername");
  if (!select) return;
  const activeUser = localStorage.getItem("activeUser") || "";
  const users = JSON.parse(localStorage.getItem("userProfiles")) || {};
  if (activeUser && users[activeUser]) {
    select.innerHTML = `<option value="${activeUser}">${users[activeUser].name}</option>`;
  } else {
    select.innerHTML = '<option value="">-- Not logged in --</option>';
  }
}
populateWorkoutUserDropdown();

document.getElementById("loadUserBtn").addEventListener("click", loadUser);
document.getElementById("exerciseForm").addEventListener("submit", saveExercise);
document.getElementById("filterMuscle").addEventListener("change", renderHistory);
document.getElementById("muscleGroup").addEventListener("change", populateExerciseDropdown);

function loadUser() {
  const username = document.getElementById("workoutUsername").value;
  if (!username) {
    alert("Please select a user.");
    return;
  }
  currentUser = username;
  localStorage.setItem("lastSelectedUser", username);
  document.getElementById("workoutContent").style.display = "block";
  renderHistory();
}

function getStorageKey() {
  return `workout_${currentUser}`;
}

function getWorkouts() {
  const data = localStorage.getItem(getStorageKey());
  return data ? JSON.parse(data) : [];
}

function saveWorkouts(workouts) {
  localStorage.setItem(getStorageKey(), JSON.stringify(workouts));
  // Sync to Firebase cloud
  if (typeof cloudSaveWorkouts === "function" && typeof isFirebaseReady === "function" && isFirebaseReady() && currentUser) {
    cloudSaveWorkouts(currentUser, workouts);
  }
}

function toggleDateInput() {
  const manual = document.querySelector('input[name="dateOption"][value="manual"]').checked;
  document.getElementById("exerciseDate").style.display = manual ? "block" : "none";
}

function getSelectedDate() {
  const manual = document.querySelector('input[name="dateOption"][value="manual"]').checked;
  if (manual) {
    return document.getElementById("exerciseDate").value;
  }
  return new Date().toISOString().split("T")[0];
}

function saveExercise(e) {
  e.preventDefault();
  const date = getSelectedDate();
  if (!date) {
    alert("Please select a date.");
    return;
  }
  const exerciseName = document.getElementById("exerciseName").value;
  if (!exerciseName) {
    alert("Please select an exercise.");
    return;
  }
  const exercise = {
    id: Date.now(),
    muscleGroup: document.getElementById("muscleGroup").value,
    name: exerciseName,
    weight: parseFloat(document.getElementById("exerciseWeight").value),
    sets: parseInt(document.getElementById("exerciseSets").value),
    reps: parseInt(document.getElementById("exerciseReps").value),
    date: date,
  };

  const workouts = getWorkouts();
  workouts.push(exercise);
  saveWorkouts(workouts);

  document.getElementById("exerciseForm").reset();
  document.getElementById("exerciseDate").style.display = "none";
  renderHistory();
}

function renderHistory() {
  const filter = document.getElementById("filterMuscle").value;
  let workouts = getWorkouts();

  if (filter !== "all") {
    workouts = workouts.filter((w) => w.muscleGroup === filter);
  }

  // Sort by date descending
  workouts.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by date
  const grouped = {};
  workouts.forEach((w) => {
    if (!grouped[w.date]) grouped[w.date] = [];
    grouped[w.date].push(w);
  });

  const container = document.getElementById("workoutHistoryList");

  if (workouts.length === 0) {
    container.innerHTML = "<p>No exercises logged yet.</p>";
    return;
  }

  let html = "";
  for (const date in grouped) {
    html += `<div class="workout-day"><h4>${date}</h4><table class="workout-table"><thead><tr><th>Muscle</th><th>Exercise</th><th>Weight (kg)</th><th>Sets</th><th>Reps</th><th></th></tr></thead><tbody>`;
    grouped[date].forEach((w) => {
      html += `<tr>
        <td><span class="muscle-tag ${w.muscleGroup}">${capitalize(w.muscleGroup)}</span></td>
        <td>${w.name}</td>
        <td>${w.weight}</td>
        <td>${w.sets}</td>
        <td>${w.reps}</td>
        <td><button class="delete-btn" onclick="deleteExercise(${w.id})">✕</button></td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
  }

  container.innerHTML = html;
}

function deleteExercise(id) {
  let workouts = getWorkouts();
  workouts = workouts.filter((w) => w.id !== id);
  saveWorkouts(workouts);
  renderHistory();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function populateExerciseDropdown() {
  const muscleGroup = document.getElementById("muscleGroup").value;
  const exerciseSelect = document.getElementById("exerciseName");
  exerciseSelect.innerHTML = "";

  if (!muscleGroup) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "-- Select a muscle group first --";
    opt.disabled = true;
    opt.selected = true;
    exerciseSelect.appendChild(opt);
    return;
  }

  // Default placeholder
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Select an exercise --";
  placeholder.disabled = true;
  placeholder.selected = true;
  exerciseSelect.appendChild(placeholder);

  // Load custom exercises for this muscle group
  const customExercises = getCustomExercises(muscleGroup);
  const allExercises = [...(exerciseDatabase[muscleGroup] || []), ...customExercises].sort();

  allExercises.forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    exerciseSelect.appendChild(opt);
  });

  // "Add custom..." option
  const customOpt = document.createElement("option");
  customOpt.value = "__custom__";
  customOpt.textContent = "➕ Add custom exercise...";
  exerciseSelect.appendChild(customOpt);
}

// Handle custom exercise selection
document.getElementById("exerciseName").addEventListener("change", function () {
  if (this.value === "__custom__") {
    const customName = prompt("Enter custom exercise name:");
    if (customName && customName.trim()) {
      const muscleGroup = document.getElementById("muscleGroup").value;
      saveCustomExercise(muscleGroup, customName.trim());
      populateExerciseDropdown();
      this.value = customName.trim();
    } else {
      this.value = "";
    }
  }
});

// Custom exercise persistence
function getCustomExercises(muscleGroup) {
  const data = JSON.parse(localStorage.getItem("customExercises") || "{}");
  return data[muscleGroup] || [];
}

function saveCustomExercise(muscleGroup, name) {
  const data = JSON.parse(localStorage.getItem("customExercises") || "{}");
  if (!data[muscleGroup]) data[muscleGroup] = [];
  if (!data[muscleGroup].includes(name)) {
    data[muscleGroup].push(name);
    localStorage.setItem("customExercises", JSON.stringify(data));
  }
}
