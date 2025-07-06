const SHEET_URL = "https://script.google.com/macros/s/AKfycbxIBDX-ny3nfzVIA9tpmzt8Vx1--zLizxfZCgQyF5eQIzNI423_gugKJfj4GEOYBsxL/exec";

let transactions = [];
let vendors = [];
let budget = 0;

async function fetchData() {
  const res = await fetch(SHEET_URL);
  const data = await res.json();
  transactions = data.transactions || [];
  vendors = data.vendors || [];
  budget = data.budget || 0;
  updateUI();
}

function updateUI() {
  document.getElementById("weeklyBudget").value = budget;
  document.getElementById("remaining").innerText = `Remaining: $${(budget - transactions.reduce((acc, t) => acc + Number(t.amount), 0)).toFixed(2)}`;

  const list = document.getElementById("transactionList");
  list.innerHTML = "";
  transactions.forEach((t, index) => {
    const li = document.createElement("li");
    li.className = "transaction-item";
    li.innerHTML = \`
      \${new Date(t.timestamp).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: 'numeric' })} - \${t.description}: $\${t.amount}
      <button onclick="deleteTransaction(\${index})">X</button>
    \`;
    list.appendChild(li);
  });

  const dropdown = document.getElementById("vendorDropdown");
  dropdown.innerHTML = vendors.map(v => \`<option value="\${v}">\${v}</option>\`).join('');
}

function setBudget() {
  budget = Number(document.getElementById("weeklyBudget").value);
  saveData();
}

function addTransaction() {
  const desc = document.getElementById("vendorDropdown").value;
  const amt = Number(document.getElementById("amount").value);
  if (!desc || amt <= 0) return;
  transactions.push({ description: desc, amount: amt, timestamp: new Date().toISOString() });
  document.getElementById("amount").value = "";
  saveData();
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  saveData();
}

function saveData() {
  updateUI(); // Optimistic update
  fetch(SHEET_URL, {
    method: "POST",
    body: JSON.stringify({ transactions, vendors, budget }),
    headers: { "Content-Type": "application/json" }
  }).then(() => fetchData()); // Full sync
}

fetchData();