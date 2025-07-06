const SHEET_URL = "https://script.google.com/macros/s/AKfycbzXFTEU7PPq5Yg1CSbOPAKqImlgdew9eloNJ7ia0pN0AFFCiHZxa30nJl2UACqtj1hX6w/exec";

let transactions = [];
let vendors = [];
let budget = 0;

async function fetchData() {
  try {
    console.log("[fetchData] Fetching data...");
    const res = await fetch(SHEET_URL);
    const data = await res.json();
    console.log("[fetchData] Received data:", data);

    transactions = data.transactions || [];
    vendors = data.vendors || [];
    budget = data.budget || 0;
    updateUI();
  } catch (err) {
    console.error("[fetchData] Error fetching data:", err);
  }
}

function updateUI() {
  document.getElementById("weeklyBudget").value = budget;
  document.getElementById("remaining").innerText = `Remaining: $${(budget - transactions.reduce((acc, t) => acc + Number(t.amount), 0)).toFixed(2)}`;

  const list = document.getElementById("transactionList");
  list.innerHTML = "";
  transactions.forEach((t, index) => {
    const li = document.createElement("li");
    li.className = "transaction-item";
    li.innerHTML = `
      ${new Date(t.timestamp).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric' })} - ${t.description}: $${t.amount}
      <button onclick="deleteTransaction(${index})">X</button>
    `;
    list.appendChild(li);
  });

  const dropdown = document.getElementById("vendorDropdown");
  dropdown.innerHTML = vendors.map(v => `<option value="${v}">${v}</option>`).join('');
}

function setBudget() {
  const input = document.getElementById("weeklyBudget").value;
  budget = Number(input);
  console.log("[setBudget] Input:", input);
  console.log("[setBudget] Parsed Budget:", budget);

  if (isNaN(budget) || budget <= 0) {
    alert("Please enter a valid budget amount.");
    return;
  }

  saveData();
}

function addTransaction() {
  const desc = document.getElementById("vendorDropdown").value;
  const amt = Number(document.getElementById("amount").value);
  console.log("[addTransaction] Description:", desc);
  console.log("[addTransaction] Amount:", amt);

  if (!desc || amt <= 0 || isNaN(amt)) {
    alert("Please select a vendor and enter a valid amount.");
    return;
  }

  transactions.push({ description: desc, amount: amt, timestamp: new Date().toISOString() });
  document.getElementById("amount").value = "";
  saveData();
}

function deleteTransaction(index) {
  console.log("[deleteTransaction] Removing index:", index);
  transactions.splice(index, 1);
  saveData();
}

function saveData() {
  console.log("[saveData] Saving:", { transactions, vendors, budget });

  updateUI(); // Optimistic UI update

  fetch(SHEET_URL, {
    method: "POST",
    body: JSON.stringify({ transactions, vendors, budget }),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(data => {
      console.log("[saveData] Response from server:", data);
      fetchData(); // Full sync from server
    })
    .catch(err => {
      console.error("[saveData] Error sending data:", err);
    });
}

fetchData();
