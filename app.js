async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  return res.json();
}

function getStartOfWeek(date = new Date()) {
  const day = date.getDay(); // Sunday = 0
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

async function loadTransactions() {
  try {
    const transactions = await fetchJSON('/.netlify/functions/getTransactions');
    const tableBody = document.querySelector('#transactions-body');
    tableBody.innerHTML = '';
    let total = 0;

    transactions.forEach(t => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${formatDate(t.date)}</td>
        <td>${t.vendor}</td>
        <td>$${(t.amount_cents / 100).toFixed(2)}</td>
        <td><button class="delete-btn" onclick="deleteTransaction('${t.id}')">🗑️</button></td>
      `;
      tableBody.appendChild(row);
      total += t.amount_cents;
    });

    const budgetRes = await fetchJSON('/.netlify/functions/getBudget');
    const remaining = (budgetRes.amount_cents - total) / 100;
    document.getElementById('remaining').textContent = remaining.toFixed(2);
  } catch (err) {
    console.error("Error loading transactions:", err);
  }
}

async function deleteTransaction(id) {
  await fetchJSON('/.netlify/functions/deleteTransaction', {
    method: 'POST',
    body: JSON.stringify({ id }),
    headers: { 'Content-Type': 'application/json' }
  });
  await loadTransactions();
}

document.getElementById('budget-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('budget').value);
  if (!isNaN(amount)) {
    await fetchJSON('/.netlify/functions/setBudget', {
      method: 'POST',
      body: JSON.stringify({ amount_cents: Math.round(amount * 100) }),
      headers: { 'Content-Type': 'application/json' }
    });
    await loadTransactions();
  }
});

document.getElementById('transaction-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const vendor = document.getElementById('vendor').value;
  const amount = parseFloat(document.getElementById('amount').value);
  const date = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });

  if (vendor && !isNaN(amount)) {
    await fetchJSON('/.netlify/functions/addTransaction', {
      method: 'POST',
      body: JSON.stringify({
        vendor,
        amount_cents: Math.round(amount * 100),
        date
      }),
      headers: { 'Content-Type': 'application/json' }
    });
    e.target.reset();
    await loadTransactions();
  }
});

function updateWeekLabel() {
  const sunday = getStartOfWeek();
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  const weekText = `Week of ${sunday.toLocaleDateString(undefined, options)}`;
  const label = document.getElementById('week-range');
  if (label) label.textContent = weekText;
}

window.onload = () => {
  updateWeekLabel();
  loadTransactions();
};
