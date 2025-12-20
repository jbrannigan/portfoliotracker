import { db } from '../db/database.js';
import type { Watchlist, CreateWatchlistRequest, UpdateWatchlistRequest } from '../../../shared/src/types.js';

/**
 * Get all watchlists
 */
export function getAllWatchlists(): Watchlist[] {
  const stmt = db.prepare('SELECT * FROM watchlists ORDER BY name');
  return stmt.all() as Watchlist[];
}

/**
 * Get a single watchlist by ID
 */
export function getWatchlist(id: number): Watchlist | undefined {
  const stmt = db.prepare('SELECT * FROM watchlists WHERE id = ?');
  return stmt.get(id) as Watchlist | undefined;
}

/**
 * Create a new watchlist
 */
export function createWatchlist(data: CreateWatchlistRequest): Watchlist {
  const stmt = db.prepare(`
    INSERT INTO watchlists (name, source, dollar_allocation)
    VALUES (?, ?, ?)
    RETURNING *
  `);

  return stmt.get(
    data.name,
    data.source,
    data.dollar_allocation || null
  ) as Watchlist;
}

/**
 * Update an existing watchlist
 */
export function updateWatchlist(
  id: number,
  data: UpdateWatchlistRequest
): Watchlist | undefined {
  const existing = getWatchlist(id);
  if (!existing) {
    return undefined;
  }

  const stmt = db.prepare(`
    UPDATE watchlists
    SET name = COALESCE(?, name),
        dollar_allocation = COALESCE(?, dollar_allocation),
        updated_at = datetime('now')
    WHERE id = ?
    RETURNING *
  `);

  return stmt.get(
    data.name || null,
    data.dollar_allocation !== undefined ? data.dollar_allocation : null,
    id
  ) as Watchlist;
}

/**
 * Delete a watchlist
 * Note: Will cascade delete related members and ratings
 */
export function deleteWatchlist(id: number): boolean {
  const stmt = db.prepare('DELETE FROM watchlists WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

/**
 * Get watchlist by name
 */
export function getWatchlistByName(name: string): Watchlist | undefined {
  const stmt = db.prepare('SELECT * FROM watchlists WHERE name = ?');
  return stmt.get(name) as Watchlist | undefined;
}

/**
 * Get watchlists by source
 */
export function getWatchlistsBySource(source: 'seeking_alpha' | 'motley_fool'): Watchlist[] {
  const stmt = db.prepare('SELECT * FROM watchlists WHERE source = ? ORDER BY name');
  return stmt.all(source) as Watchlist[];
}
