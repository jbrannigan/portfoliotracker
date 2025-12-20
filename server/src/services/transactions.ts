import { db } from '../db/database.js';
import type { Transaction, CreateTransactionRequest } from '../../../shared/src/types.js';

export interface TransactionFilters {
  symbol?: string;
  account_id?: number;
  transaction_type?: 'BUY' | 'SELL';
  start_date?: string;
  end_date?: string;
  reason_type?: 'watchlist_add' | 'watchlist_drop' | 'rebalance' | 'other';
  limit?: number;
  offset?: number;
}

/**
 * Get all transactions with optional filters
 */
export function getTransactions(filters: TransactionFilters = {}): Transaction[] {
  let query = `
    SELECT * FROM transactions
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.symbol) {
    query += ` AND symbol = ?`;
    params.push(filters.symbol);
  }

  if (filters.account_id) {
    query += ` AND account_id = ?`;
    params.push(filters.account_id);
  }

  if (filters.transaction_type) {
    query += ` AND transaction_type = ?`;
    params.push(filters.transaction_type);
  }

  if (filters.start_date) {
    query += ` AND transaction_date >= ?`;
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    query += ` AND transaction_date <= ?`;
    params.push(filters.end_date);
  }

  if (filters.reason_type) {
    query += ` AND reason_type = ?`;
    params.push(filters.reason_type);
  }

  // Order by transaction date descending (newest first)
  query += ` ORDER BY transaction_date DESC, created_at DESC`;

  // Pagination
  if (filters.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);

    if (filters.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as Transaction[];
}

/**
 * Get transaction count with filters (for pagination)
 */
export function getTransactionCount(filters: TransactionFilters = {}): number {
  let query = `
    SELECT COUNT(*) as count FROM transactions
    WHERE 1=1
  `;
  const params: any[] = [];

  if (filters.symbol) {
    query += ` AND symbol = ?`;
    params.push(filters.symbol);
  }

  if (filters.account_id) {
    query += ` AND account_id = ?`;
    params.push(filters.account_id);
  }

  if (filters.transaction_type) {
    query += ` AND transaction_type = ?`;
    params.push(filters.transaction_type);
  }

  if (filters.start_date) {
    query += ` AND transaction_date >= ?`;
    params.push(filters.start_date);
  }

  if (filters.end_date) {
    query += ` AND transaction_date <= ?`;
    params.push(filters.end_date);
  }

  if (filters.reason_type) {
    query += ` AND reason_type = ?`;
    params.push(filters.reason_type);
  }

  const stmt = db.prepare(query);
  const result = stmt.get(...params) as { count: number };
  return result.count;
}

/**
 * Get transaction by ID
 */
export function getTransactionById(id: number): Transaction | undefined {
  const stmt = db.prepare('SELECT * FROM transactions WHERE id = ?');
  return stmt.get(id) as Transaction | undefined;
}

/**
 * Create a new transaction
 */
export function createTransaction(data: CreateTransactionRequest): Transaction {
  const now = new Date().toISOString();

  // Calculate total_amount if not provided
  const totalAmount = data.total_amount ?? data.shares * data.price_per_share;

  const stmt = db.prepare(`
    INSERT INTO transactions (
      account_id,
      symbol,
      transaction_type,
      shares,
      price_per_share,
      total_amount,
      transaction_date,
      reason_type,
      reason_watchlist_id,
      reason_notes,
      reason_url,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    data.account_id,
    data.symbol,
    data.transaction_type,
    data.shares,
    data.price_per_share,
    totalAmount,
    data.transaction_date,
    data.reason_type ?? null,
    data.reason_watchlist_id ?? null,
    data.reason_notes ?? null,
    data.reason_url ?? null,
    now
  );

  const transaction = getTransactionById(result.lastInsertRowid as number);
  if (!transaction) {
    throw new Error('Failed to retrieve created transaction');
  }

  return transaction;
}

/**
 * Delete a transaction (for testing/corrections)
 */
export function deleteTransaction(id: number): boolean {
  const stmt = db.prepare('DELETE FROM transactions WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Get transactions by symbol
 */
export function getTransactionsBySymbol(symbol: string): Transaction[] {
  const stmt = db.prepare(`
    SELECT * FROM transactions
    WHERE symbol = ?
    ORDER BY transaction_date DESC
  `);
  return stmt.all(symbol) as Transaction[];
}

/**
 * Get transactions by account
 */
export function getTransactionsByAccount(accountId: number): Transaction[] {
  const stmt = db.prepare(`
    SELECT * FROM transactions
    WHERE account_id = ?
    ORDER BY transaction_date DESC
  `);
  return stmt.all(accountId) as Transaction[];
}

/**
 * Get recent transactions (for dashboard)
 */
export function getRecentTransactions(limit: number = 10): Transaction[] {
  const stmt = db.prepare(`
    SELECT * FROM transactions
    ORDER BY transaction_date DESC, created_at DESC
    LIMIT ?
  `);
  return stmt.all(limit) as Transaction[];
}
