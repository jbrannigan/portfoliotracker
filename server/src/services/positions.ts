import { db } from '../db/database.js';
import type { Position } from '../../../shared/src/types.js';
import { normalizeSymbol } from '../../../shared/src/utils.js';

/**
 * Get all positions
 */
export function getAllPositions(): Position[] {
  const stmt = db.prepare('SELECT * FROM positions ORDER BY symbol');
  return stmt.all() as Position[];
}

/**
 * Get a single position by ID
 */
export function getPosition(id: number): Position | undefined {
  const stmt = db.prepare('SELECT * FROM positions WHERE id = ?');
  return stmt.get(id) as Position | undefined;
}

/**
 * Get all positions for an account
 */
export function getPositionsByAccount(accountId: number): Position[] {
  const stmt = db.prepare('SELECT * FROM positions WHERE account_id = ? ORDER BY symbol');
  return stmt.all(accountId) as Position[];
}

/**
 * Get all positions for a symbol
 */
export function getPositionsBySymbol(symbol: string): Position[] {
  const normalized = normalizeSymbol(symbol);
  const stmt = db.prepare('SELECT * FROM positions WHERE symbol = ? ORDER BY account_id');
  return stmt.all(normalized) as Position[];
}

/**
 * Get a specific position by account and symbol
 */
export function getPositionByAccountAndSymbol(accountId: number, symbol: string): Position | undefined {
  const normalized = normalizeSymbol(symbol);
  const stmt = db.prepare('SELECT * FROM positions WHERE account_id = ? AND symbol = ?');
  return stmt.get(accountId, normalized) as Position | undefined;
}

/**
 * Create or update a position (upsert)
 */
export function upsertPosition(data: {
  account_id: number;
  symbol: string;
  shares: number;
  cost_basis?: number;
}): Position {
  const normalized = normalizeSymbol(data.symbol);

  const stmt = db.prepare(`
    INSERT INTO positions (account_id, symbol, shares, cost_basis, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(account_id, symbol) DO UPDATE SET
      shares = excluded.shares,
      cost_basis = COALESCE(excluded.cost_basis, cost_basis),
      updated_at = datetime('now')
    RETURNING *
  `);

  return stmt.get(
    data.account_id,
    normalized,
    data.shares,
    data.cost_basis || null
  ) as Position;
}

/**
 * Update an existing position
 */
export function updatePosition(
  id: number,
  data: {
    shares?: number;
    cost_basis?: number;
  }
): Position | undefined {
  const existing = getPosition(id);
  if (!existing) {
    return undefined;
  }

  const stmt = db.prepare(`
    UPDATE positions
    SET shares = COALESCE(?, shares),
        cost_basis = COALESCE(?, cost_basis),
        updated_at = datetime('now')
    WHERE id = ?
    RETURNING *
  `);

  return stmt.get(
    data.shares !== undefined ? data.shares : null,
    data.cost_basis !== undefined ? data.cost_basis : null,
    id
  ) as Position;
}

/**
 * Delete a position
 */
export function deletePosition(id: number): boolean {
  const stmt = db.prepare('DELETE FROM positions WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * Delete all positions for an account
 */
export function deletePositionsByAccount(accountId: number): number {
  const stmt = db.prepare('DELETE FROM positions WHERE account_id = ?');
  const result = stmt.run(accountId);

  return result.changes;
}

/**
 * Get positions with enriched data (joins with symbols table)
 */
export function getEnrichedPositions(accountId?: number): any[] {
  let query = `
    SELECT
      p.*,
      s.company_name,
      s.sector
    FROM positions p
    LEFT JOIN symbols s ON p.symbol = s.symbol
  `;

  if (accountId !== undefined) {
    query += ' WHERE p.account_id = ?';
  }

  query += ' ORDER BY p.symbol';

  const stmt = db.prepare(query);

  return accountId !== undefined
    ? stmt.all(accountId)
    : stmt.all();
}

/**
 * Get aggregated position summary (grouped by symbol)
 */
export function getPositionSummary(): any[] {
  const query = `
    SELECT
      s.symbol,
      s.company_name,
      s.sector,
      SUM(p.shares) as total_shares,
      SUM(p.cost_basis) as total_cost_basis,
      GROUP_CONCAT(DISTINCT wm.watchlist_id) as watchlist_ids
    FROM symbols s
    LEFT JOIN positions p ON s.symbol = p.symbol
    LEFT JOIN watchlist_members wm ON s.symbol = wm.symbol AND wm.removed_at IS NULL
    WHERE p.id IS NOT NULL
    GROUP BY s.symbol
    ORDER BY s.symbol
  `;

  const stmt = db.prepare(query);
  const results = stmt.all() as any[];

  // Process watchlist_ids into an array
  return results.map(row => ({
    ...row,
    watchlist_ids: row.watchlist_ids ? row.watchlist_ids.split(',').map(Number) : []
  }));
}
