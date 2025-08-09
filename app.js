// ====== Global State ======
let currentUser = null;
let users = JSON.parse(localStorage.getItem("users") || "[]");
let theme = localStorage.getItem("theme") || "light";

// ====== DOM Elements ======
const userSelect = document.getElementById("userSelect");
const datePicker = document.getElementById("datePicker");
const mealSections = document.getElementById("mealSections");
const progressBars = document.getElementById("progressBars");
const goalDisplay = document.getElementById("goalDisplay");

// ====== Init ======
init();

function init() {
  if (users.length === 0) {
    const name = prompt("Enter new username:");
    if (name) addUser(name);
  }
  populateUserSelect();
  loadUser(users[0]);
  datePicker.valueAsDate = new Date();
  render();
  if (theme === "dark") document.body.classList.add("dark");
}

// ====== User Handling ======
document.getElementById("switchUserBtn").onclick = () => {
  loadUser(userSelect.value);
  render();
};
document.getElementById("addUserBtn").onclick = () => {
  const name = prompt("Enter new username:");
  if (name) addUser(name);
};

function addUser(name) {
  if (!users.includes(name)) {
    users.push(name);
    localStorage.setItem("users", JSON.stringify(users));
    saveUserData(name, {
      logs: {},
      goals: { calories: 1850, protein: 150, carbs: 120, fat: 50 },
      apiKey: ""
    });
    populateUserSelect();
    loadUser(name);
  }
}

function populateUserSelect() {
  userSelect.innerHTML = "";
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    userSelect.appendChild(opt);
  });
}

function loadUser(name) {
  currentUser = name;
  userSelect.value = name;
  const data = getUserData();
  document.getElementById("apiKey").value = data.apiKey;
  document.getElementById("goalCalories").value = data.goals.calories;
  document.getElementById("goalProtein").value = data.goals.protein;
  document.getElementById("goalCarbs").value = data.goals.carbs;
  document.getElementById("goalFat").value = data.goals.fat;
}

// ====== Storage Helpers ======
function getUserData() {
  return JSON.parse(localStorage.getItem(`userdata_${currentUser}`));
}
function saveUserData(user, data) {
  localStorage.setItem(`userdata_${user}`, JSON.stringify(data));
}
function updateUserData(partial) {
  const data = getUserData();
  saveUserData(currentUser, { ...data, ...partial });
}

// ====== Goals ======
document.getElementById("saveGoalsBtn").onclick = () => {
  const goals = {
    calories: +document.getElementById("goalCalories").value || 0,
    protein: +document.getElementById("goalProtein").value || 0,
    carbs: +document.getElementById("goalCarbs").value || 0,
    fat: +document.getElementById("goalFat").value || 0
  };
  updateUserData({ goals });
  render();
};

// ====== Theme Toggle ======
document.getElementById("toggleThemeBtn").onclick = () => {
  document.body.classList.toggle("dark");
  theme = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem("theme", theme);
};

// ====== API Key ======
document.getElementById("saveApiKeyBtn").onclick = () => {
  const key = document.getElementById("apiKey").value.trim();
  const data = getUserData();
  data.apiKey = key;
  saveUserData(currentUser, data);
  alert("API key saved.");
};

// ====== Clear Data ======
document.getElementById("clearDataBtn").onclick = () => {
  if (confirm("Clear all logs for this user?")) {
    const data = getUserData();
    data.logs = {};
    saveUserData(currentUser, data);
    render();
  }
};

// ====== Add Food ======
document.getElementById("addFoodBtn").onclick = addFood;
document.getElementById("searchBtn").onclick = searchFood;

function currentDateKey() {
  return datePicker.value;
}

function addFood() {
  const meal = document.getElementById("mealSelect").value;
  const name = document.getElementById("foodName").value.trim();
  const grams = parseFloat(document.getElementById("grams").value) || 0;
  const calories = parseFloat(document.getElementById("calories").value) || 0;
  const protein = parseFloat(document.getElementById("protein").value) || 0;
  const carbs = parseFloat(document.getElementById("carbs").value) || 0;
  const fat = parseFloat(document.getElementById("fat").value) || 0;
  if (!name) return alert("Enter food name");

  const data = getUserData();
  if (!data.logs[currentDateKey()]) data.logs[currentDateKey()] = {};
  if (!data.logs[currentDateKey()][meal]) data.logs[currentDateKey()][meal] = [];

  data.logs[currentDateKey()][meal].push({ name, grams, calories, protein, carbs, fat });
  saveUserData(currentUser, data);
  clearForm();
  render();
}

function clearForm() {
  ["foodName", "grams", "calories", "protein", "carbs", "fat"].forEach(id => {
    document.getElementById(id).value = "";
  });
}

// ====== Delete Item ======
function deleteItem(meal, index) {
  const data = getUserData();
  data.logs[currentDateKey()][meal].splice(index, 1);
  saveUserData(currentUser, data);
  render();
}

// ====== Render ======
function render() {
  const data = getUserData();
  const dateLogs = data.logs[currentDateKey()] || {};
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  mealSections.innerHTML = "";
  goalDisplay.textContent = `Goals: ${data.goals.calories} cal / ${data.goals.protein}P / ${data.goals.carbs}C / ${data.goals.fat}F`;

  ["Breakfast", "Lunch", "Dinner", "Snacks"].forEach(meal => {
    const items = dateLogs[meal] || [];
    const mealDiv = document.createElement("div");
    mealDiv.className = "meal";
    mealDiv.innerHTML = `<h3>${meal}</h3>`;
    items.forEach((item, idx) => {
      totals.calories += item.calories;
      totals.protein += item.protein;
      totals.carbs += item.carbs;
      totals.fat += item.fat;

      const foodDiv = document.createElement("div");
      foodDiv.className = "food-item";
      foodDiv.innerHTML = `
        <span>${item.name} - ${item.grams}g | ${item.calories} cal | P:${item.protein} C:${item.carbs} F:${item.fat}</span>
        <div class="delete-btn" onclick="deleteItem('${meal}', ${idx})">Delete</div>
      `;
      attachSwipeHandler(foodDiv);
      mealDiv.appendChild(foodDiv);
    });
    mealSections.appendChild(mealDiv);
  });
  renderProgressBars(totals, data.goals);
}

function renderProgressBars(totals, goals) {
  progressBars.innerHTML = "";
  Object.keys(goals).forEach(k => {
    const percent = Math.min((totals[k] / goals[k]) * 100, 100);
    progressBars.innerHTML += `<div>${k}: ${totals[k].toFixed(1)} / ${goals[k]}</div>
      <div class="progress-bar"><div class="progress-bar-inner" style="width:${percent}%"></div></div>`;
  });
}

// ====== Swipe Handling ======
function attachSwipeHandler(el) {
  let startX = 0;
  el.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  });
  el.addEventListener("touchmove", e => {
    const diff = e.touches[0].clientX - startX;
    if (diff < -50) el.classList.add("swipe-delete");
    if (diff > 50) el.classList.remove("swipe-delete");
  });
}

// ====== ChatGPT Search ======
async function searchFood() {
  const data = getUserData();
  if (!data.apiKey) return alert("Enter your API key in settings first.");
  const query = prompt("Enter food and quantity (e.g., 'Grilled salmon 150g'):");
  if (!query) return;
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${data.apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: `Provide calories, protein, carbs, and fat for: ${query}. Respond in JSON with keys: calories, protein, carbs, fat.` }
        ]
      })
    });
    const out = await res.json();
    const macros = JSON.parse(out.choices[0].message.content);
    document.getElementById("foodName").value = query;
    document.getElementById("calories").value = macros.calories;
    document.getElementById("protein").value = macros.protein;
    document.getElementById("carbs").value = macros.carbs;
    document.getElementById("fat").value = macros.fat;
  } catch (err) {
    alert("Error fetching from ChatGPT");
    console.error(err);
  }
}
