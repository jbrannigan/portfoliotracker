import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (two levels up from server/src/)
dotenv.config({ path: join(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import './db/migrate.js';
import { symbolsRouter } from './routes/symbols.js';
import { accountsRouter } from './routes/accounts.js';
import { watchlistsRouter } from './routes/watchlists.js';
import { importRouter } from './routes/import.js';
import { quotesRouter } from './routes/quotes.js';
import { transactionsRouter } from './routes/transactions.js';
import { positionsRouter } from './routes/positions.js';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Portfolio Tracker API is running' });
});

// API Routes
app.use('/api/symbols', symbolsRouter);
app.use('/api/accounts', accountsRouter);
app.use('/api/watchlists', watchlistsRouter);
app.use('/api/positions', positionsRouter);
app.use('/api/import', importRouter);
app.use('/api/quotes', quotesRouter);
app.use('/api/transactions', transactionsRouter);

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
