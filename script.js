let transactions = [];
let vendors = ["AMAZON", "WALMART", "PIZZA PIZZA", "FORTINOS", "DOLLARAMA"];
let budget = 0;

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
  if (isNaN(budget) || budget <= 0) {
    alert("Please enter a valid budget amount.");
    return;
  }
  saveData();
}

function addTransaction() {
  const desc = document.getElementById("vendorDropdown").value;
  const amt = Number(document.getElementById("amount").value);
  if (!desc || amt <= 0 || isNaN(amt)) {
    alert("Please select a vendor and enter a valid amount.");
    return;
  }
  transactions.push({ description: desc, amount: amt, timestamp: new Date().toISOString() });
  document.getElementById("amount").value = "";
  saveData();
}

function deleteTransaction(index) {
  transactions.splice(index, 1);
  saveData();
}

function saveData() {
  fetch("/.netlify/functions/saveData", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions, vendors, budget })
  })
    .then(res => res.json())
    .then(data => {
      console.log("Saved:", data);
      fetchData();
    })
    .catch(err => {
      console.error("Save failed:", err);
    });
}

function fetchData() {
  fetch("/.netlify/functions/saveData", {
    method: "GET"
  })
    .then(res => res.json())
    .then(data => {
      transactions = data.transactions || [];
      vendors = data.vendors || vendors;
      budget = data.budget || 0;
      updateUI();
    });
}

fetchData();