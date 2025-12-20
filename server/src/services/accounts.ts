import { db } from '../db/database.js';
import type { Account, CreateAccountRequest } from '../../../shared/src/types.js';

/**
 * Get all accounts
 */
export function getAllAccounts(): Account[] {
  const stmt = db.prepare('SELECT * FROM accounts ORDER BY name');
  return stmt.all() as Account[];
}

/**
 * Get a single account by ID
 */
export function getAccount(id: number): Account | undefined {
  const stmt = db.prepare('SELECT * FROM accounts WHERE id = ?');
  return stmt.get(id) as Account | undefined;
}

/**
 * Create a new account
 */
export function createAccount(data: CreateAccountRequest): Account {
  const stmt = db.prepare(`
    INSERT INTO accounts (name, account_number_suffix, broker)
    VALUES (?, ?, ?)
    RETURNING *
  `);

  return stmt.get(
    data.name,
    data.account_number_suffix || null,
    data.broker || null
  ) as Account;
}

/**
 * Update an existing account
 */
export function updateAccount(
  id: number,
  data: Partial<CreateAccountRequest>
): Account | undefined {
  const existing = getAccount(id);
  if (!existing) {
    return undefined;
  }

  const stmt = db.prepare(`
    UPDATE accounts
    SET name = COALESCE(?, name),
        account_number_suffix = COALESCE(?, account_number_suffix),
        broker = COALESCE(?, broker)
    WHERE id = ?
    RETURNING *
  `);

  return stmt.get(
    data.name || null,
    data.account_number_suffix || null,
    data.broker || null,
    id
  ) as Account;
}

/**
 * Delete an account
 * Note: Will cascade delete related positions and transactions
 */
export function deleteAccount(id: number): boolean {
  const stmt = db.prepare('DELETE FROM accounts WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * Get account by name
 */
export function getAccountByName(name: string): Account | undefined {
  const stmt = db.prepare('SELECT * FROM accounts WHERE name = ?');
  return stmt.get(name) as Account | undefined;
}
