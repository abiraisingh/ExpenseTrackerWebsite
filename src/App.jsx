import { useEffect, useMemo, useState } from 'react';

const categories = [
  'Food',
  'Transport',
  'Bills',
  'Shopping',
  'Health',
  'Salary',
  'Freelance',
  'Other',
];

const currencies = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
];

const formatCurrency = (value, currency) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);

function App() {
  const [entries, setEntries] = useState([]);
  const [entryType, setEntryType] = useState('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [currency, setCurrency] = useState(() => localStorage.getItem('ledger-currency') || 'USD');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem('ledger-currency', currency);
  }, [currency]);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const response = await fetch('/api/transactions');
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const data = await response.json();
        setEntries(data);
      } catch {
        setError('Failed to load transactions.');
      } finally {
        setLoading(false);
      }
    }

    fetchEntries();
  }, []);

  const totals = useMemo(() => {
    const incomeTotal = entries
      .filter((entry) => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);
    const expenseTotal = entries
      .filter((entry) => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);

    return {
      incomeTotal,
      expenseTotal,
      balanceTotal: incomeTotal - expenseTotal,
    };
  }, [entries]);

  const filteredEntries = useMemo(
    () =>
      entries
        .filter((entry) => (filter === 'all' ? true : entry.type === filter))
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [entries, filter]
  );

  const categoryTotals = useMemo(() => {
    return entries
      .filter((entry) => entry.type === 'expense')
      .reduce((totals, entry) => {
        totals[entry.category] = (totals[entry.category] || 0) + entry.amount;
        return totals;
      }, {});
  }, [entries]);

  const resetForm = () => {
    setEditingId(null);
    setEntryType('expense');
    setDescription('');
    setAmount('');
    setCategory(categories[0]);
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleEdit = (entry) => {
    setEditingId(entry.id);
    setEntryType(entry.type);
    setDescription(entry.description);
    setAmount(String(entry.amount));
    setCategory(entry.category);
    setDate(entry.date);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete "${entry.description}" from the ledger?`)) return;

    try {
      const response = await fetch(`/api/transactions/${entry.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Unable to delete transaction.');
      setEntries((prev) => prev.filter((item) => item.id !== entry.id));
      if (editingId === entry.id) resetForm();
      setError(null);
    } catch {
      setError('Unable to delete transaction.');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (!description.trim() || Number.isNaN(parsedAmount) || parsedAmount <= 0 || !date) {
      setError('Please fill all fields with valid values.');
      return;
    }

    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      category,
      date,
      type: entryType,
    };

    try {
      const response = await fetch(editingId ? `/api/transactions/${editingId}` : '/api/transactions', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Unable to save transaction.');
      }

      const savedEntry = await response.json();
      setEntries((prev) =>
        editingId
          ? prev.map((entry) => (entry.id === editingId ? savedEntry : entry))
          : [...prev, savedEntry]
      );
      resetForm();
      setError(null);
    } catch {
      setError('Unable to save transaction.');
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">PERSONAL ACCOUNT BOOK</p>
          <h1>The Ledger</h1>
          <p className="header-note">A clear view of where your money is moving.</p>
        </div>
        <div className="header-tools">
          <label className="currency-picker">
            <span>Currency</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {currencies.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} - {option.name}
                </option>
              ))}
            </select>
          </label>
          <div className="header-mark" aria-hidden="true">TL</div>
        </div>
      </header>

      <main className="dashboard">
        <section className="panel panel-form">
          <div className="panel-head">
            <h2>{editingId ? 'Edit entry' : 'New entry'}</h2>
            <div className="switcher" role="tablist">
              <button
                type="button"
                className={`switcher-btn ${entryType === 'expense' ? 'active' : ''}`}
                onClick={() => setEntryType('expense')}
              >
                EXPENSE
              </button>
              <button
                type="button"
                className={`switcher-btn ${entryType === 'income' ? 'active' : ''}`}
                onClick={() => setEntryType('income')}
              >
                INCOME
              </button>
            </div>
          </div>

          <form className="transaction-form" onSubmit={handleSubmit}>
            <label>
              <span>Description</span>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Coffee, rent, freelance..."
              />
            </label>

            <label>
              <span>Amount</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>

            <label>
              <span>Category</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Date</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </label>

            <div className="form-actions">
              <button className="primary-btn" type="submit">
                {editingId ? 'Save changes' : 'Add to ledger'}
              </button>
              {editingId && (
                <button className="secondary-btn" type="button" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
            {error && <p className="form-error">{error}</p>}
          </form>
        </section>

        <section className="panel panel-summary">
          <div className="summary-grid">
            <article className="summary-card balance-card">
              <span>BALANCE</span>
              <strong>{formatCurrency(totals.balanceTotal, currency)}</strong>
            </article>
            <article className="summary-card income-card">
              <span>INCOME</span>
              <strong>{formatCurrency(totals.incomeTotal, currency)}</strong>
            </article>
            <article className="summary-card expense-card">
              <span>EXPENSES</span>
              <strong>{formatCurrency(totals.expenseTotal, currency)}</strong>
            </article>
          </div>

          <div className="spending-card">
            <div className="spending-card-head">
              <h3>Spending by category</h3>
            </div>
            <div className="spending-body">
              {Object.keys(categoryTotals).length === 0 ? (
                <p>No expenses logged yet.</p>
              ) : (
                Object.entries(categoryTotals)
                  .sort(([, a], [, b]) => b - a)
                  .map(([categoryName, total]) => (
                    <div key={categoryName} className="category-row">
                      <span className="category-label">{categoryName}</span>
                      <span className="category-value">{formatCurrency(total, currency)}</span>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div className="entries-card">
            <div className="entries-head">
              <h3>Entries</h3>
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="all">All entries</option>
                <option value="expense">Expenses</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div className="table-wrap">
              <table className="entries-table">
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>DESCRIPTION</th>
                    <th>CATEGORY</th>
                    <th>AMOUNT</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr className="empty-row">
                      <td colSpan="5">Loading entries...</td>
                    </tr>
                  ) : filteredEntries.length === 0 ? (
                    <tr className="empty-row">
                      <td colSpan="5">No entries yet - add your first one on the left.</td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.date}</td>
                        <td>{entry.description}</td>
                        <td>{entry.category}</td>
                        <td className={entry.type === 'expense' ? 'amount-expense' : 'amount-income'}>
                          {entry.type === 'expense' ? '-' : '+'}
                          {formatCurrency(entry.amount, currency)}
                        </td>
                        <td className="entry-actions">
                          <button type="button" className="row-action edit-action" onClick={() => handleEdit(entry)}>
                            Edit
                          </button>
                          <button type="button" className="row-action delete-action" onClick={() => handleDelete(entry)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
