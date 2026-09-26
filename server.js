import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { mkdir, readFile, rename, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = Number(process.env.PORT || 4000);
const host = process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';
const appDirectory = dirname(fileURLToPath(import.meta.url));
const dataDirectory = process.env.DATA_DIR || join(appDirectory, 'data');
const dataFile = join(dataDirectory, 'transactions.json');
const frontendDirectory = join(appDirectory, 'dist');
const categories = new Set(['Food', 'Transport', 'Bills', 'Shopping', 'Health', 'Salary', 'Freelance', 'Other']);
const transactionTypes = new Set(['income', 'expense']);

let transactions = [];
let writeQueue = Promise.resolve();

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(cors({ origin: process.env.CORS_ORIGIN || (isProduction ? false : true) }));
app.use(express.json({ limit: '32kb' }));

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateTransaction(payload) {
  if (!payload || typeof payload !== 'object') return 'Request body must be an object.';
  const { description, amount, category, date, type } = payload;
  if (typeof description !== 'string' || description.trim().length < 1 || description.trim().length > 120) {
    return 'Description must be between 1 and 120 characters.';
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
    return 'Amount must be a finite number greater than zero.';
  }
  if (!categories.has(category)) return 'Category is not supported.';
  if (!transactionTypes.has(type)) return 'Type must be income or expense.';
  if (!isValidDate(date)) return 'Date must be a valid YYYY-MM-DD date.';
  return null;
}

async function loadTransactions() {
  await mkdir(dataDirectory, { recursive: true });
  try {
    const content = await readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(content || '[]');
    if (!Array.isArray(parsed)) throw new Error('Transaction store must be an array.');
    transactions = parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      transactions = [];
      await saveTransactions();
      return;
    }
    throw new Error(`Unable to read transaction store: ${error.message}`);
  }
}

function saveTransactions() {
  writeQueue = writeQueue.then(async () => {
    const temporaryFile = `${dataFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, JSON.stringify(transactions, null, 2), 'utf-8');
    await rename(temporaryFile, dataFile);
  });
  return writeQueue;
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'expense-tracker', environment: process.env.NODE_ENV || 'development' });
});

app.get('/api/transactions', (req, res) => {
  res.json(transactions);
});

app.post('/api/transactions', async (req, res, next) => {
  const validationError = validateTransaction(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const { description, amount, category, date, type } = req.body;
  const transaction = { id: randomUUID(), description: description.trim(), amount, category, date, type };
  transactions.push(transaction);

  try {
    await saveTransactions();
    return res.status(201).json(transaction);
  } catch (error) {
    transactions = transactions.filter((item) => item.id !== transaction.id);
    return next(error);
  }
});

app.put('/api/transactions/:id', async (req, res, next) => {
  const validationError = validateTransaction(req.body);
  if (validationError) return res.status(400).json({ message: validationError });

  const index = transactions.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Transaction not found.' });

  const previous = transactions[index];
  const { description, amount, category, date, type } = req.body;
  const updated = { id: previous.id, description: description.trim(), amount, category, date, type };
  transactions[index] = updated;

  try {
    await saveTransactions();
    return res.json(updated);
  } catch (error) {
    transactions[index] = previous;
    return next(error);
  }
});

app.delete('/api/transactions/:id', async (req, res, next) => {
  const index = transactions.findIndex((item) => item.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Transaction not found.' });

  const [deleted] = transactions.splice(index, 1);
  try {
    await saveTransactions();
    return res.status(204).end();
  } catch (error) {
    transactions.splice(index, 0, deleted);
    return next(error);
  }
});

if (isProduction) {
  app.use(express.static(frontendDirectory, { index: false }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    return res.sendFile(join(frontendDirectory, 'index.html'));
  });
}

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
});

async function start() {
  await loadTransactions();
  const server = app.listen(port, host, () => {
    console.log(`Expense Tracker server listening on http://${host}:${port}`);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
