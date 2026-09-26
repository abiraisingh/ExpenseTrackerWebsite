const entriesBody = document.getElementById('entriesBody');
const balanceValue = document.getElementById('balanceValue');
const incomeValue = document.getElementById('incomeValue');
const expenseValue = document.getElementById('expenseValue');
const categorySummary = document.getElementById('categorySummary');
const entryFilter = document.getElementById('entryFilter');
const expenseBtn = document.getElementById('expenseBtn');
const incomeBtn = document.getElementById('incomeBtn');
const transactionForm = document.getElementById('transactionForm');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');

let entries = [];
let entryType = 'expense';

const STORAGE_KEY = 'ledgerEntries';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function setTodayDate() {
  const today = new Date().toISOString().slice(0, 10);
  dateInput.value = today;
}

function loadEntries() {
  const stored = localStorage.getItem(STORAGE_KEY);
  entries = stored ? JSON.parse(stored) : [];
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function renderSummary() {
  const incomeTotal = entries
    .filter((entry) => entry.type === 'income')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenseTotal = entries
    .filter((entry) => entry.type === 'expense')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const balanceTotal = incomeTotal - expenseTotal;

  incomeValue.textContent = formatCurrency(incomeTotal);
  expenseValue.textContent = formatCurrency(expenseTotal);
  balanceValue.textContent = formatCurrency(balanceTotal);

  const expenseEntries = entries.filter((entry) => entry.type === 'expense');
  if (expenseEntries.length === 0) {
    categorySummary.innerHTML = '<p>No expenses logged yet.</p>';
    return;
  }

  const categoryTotals = expenseEntries.reduce((acc, entry) => {
    acc[entry.category] = (acc[entry.category] || 0) + entry.amount;
    return acc;
  }, {});

  const rows = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([category, total]) => `
        <div class="category-row">
          <span class="category-label">${category}</span>
          <span class="category-value">${formatCurrency(total)}</span>
        </div>`
    )
    .join('');

  categorySummary.innerHTML = rows;
}

function renderEntries() {
  const filter = entryFilter.value;
  const filtered = entries.filter((entry) => {
    return filter === 'all' ? true : entry.type === filter;
  });

  if (filtered.length === 0) {
    entriesBody.innerHTML = `
      <tr class="empty-row">
        <td colspan="4">No entries found for the selected filter.</td>
      </tr>`;
    return;
  }

  entriesBody.innerHTML = filtered
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .map(
      (entry) => `
        <tr>
          <td>${entry.date}</td>
          <td>${entry.description}</td>
          <td>${entry.category}</td>
          <td class="${entry.type === 'expense' ? 'amount-expense' : 'amount-income'}">${
        entry.type === 'expense' ? '-' : '+'
      }${formatCurrency(entry.amount)}</td>
        </tr>`
    )
    .join('');
}

function updateTypeButtons() {
  expenseBtn.classList.toggle('active', entryType === 'expense');
  incomeBtn.classList.toggle('active', entryType === 'income');
}

function addEntry(event) {
  event.preventDefault();
  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!description || Number.isNaN(amount) || amount <= 0 || !date) {
    alert('Please enter a valid description, amount, and date.');
    return;
  }

  entries.push({
    description,
    amount,
    category,
    date,
    type: entryType,
  });

  saveEntries();
  renderSummary();
  renderEntries();
  transactionForm.reset();
  setTodayDate();
}

expenseBtn.addEventListener('click', () => {
  entryType = 'expense';
  updateTypeButtons();
});

incomeBtn.addEventListener('click', () => {
  entryType = 'income';
  updateTypeButtons();
});

transactionForm.addEventListener('submit', addEntry);
entryFilter.addEventListener('change', renderEntries);

setTodayDate();
loadEntries();
renderSummary();
renderEntries();
updateTypeButtons();
