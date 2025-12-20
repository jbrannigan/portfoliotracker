import { db } from '../db/database.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/portfolio.db';

export interface AdminStats {
  orphanSymbols: number;
  transactions: number;
  quotesCache: number;
  removedMembers: number;
}

export interface DeleteResult {
  success: boolean;
  deleted: number;
}

/**
 * Get database file path for backup
 */
export function getDatabasePath(): string {
  return path.resolve(DB_PATH);
}

/**
 * Get admin statistics for cleanup operations
 */
export function getStats(): AdminStats {
  // Count orphan symbols (no positions and no active watchlist membership)
  const orphanSymbols = db.prepare(`
    SELECT COUNT(*) as count FROM symbols s
    WHERE NOT EXISTS (
      SELECT 1 FROM positions p WHERE p.symbol = s.symbol
    )
    AND NOT EXISTS (
      SELECT 1 FROM watchlist_members wm
      WHERE wm.symbol = s.symbol AND wm.removed_at IS NULL
    )
  `).get() as { count: number };

  // Count transactions
  const transactions = db.prepare(`
    SELECT COUNT(*) as count FROM transactions
  `).get() as { count: number };

  // Count cached quotes
  const quotesCache = db.prepare(`
    SELECT COUNT(*) as count FROM quotes_cache
  `).get() as { count: number };

  // Count removed watchlist members (soft deleted)
  const removedMembers = db.prepare(`
    SELECT COUNT(*) as count FROM watchlist_members
    WHERE removed_at IS NOT NULL
  `).get() as { count: number };

  return {
    orphanSymbols: orphanSymbols.count,
    transactions: transactions.count,
    quotesCache: quotesCache.count,
    removedMembers: removedMembers.count
  };
}

/**
 * Delete orphan symbols (no positions, no active watchlist membership)
 */
export function deleteOrphanSymbols(): DeleteResult {
  const result = db.prepare(`
    DELETE FROM symbols
    WHERE NOT EXISTS (
      SELECT 1 FROM positions p WHERE p.symbol = symbols.symbol
    )
    AND NOT EXISTS (
      SELECT 1 FROM watchlist_members wm
      WHERE wm.symbol = symbols.symbol AND wm.removed_at IS NULL
    )
  `).run();

  return {
    success: true,
    deleted: result.changes
  };
}

/**
 * Clear all transactions
 */
export function clearTransactions(): DeleteResult {
  const result = db.prepare('DELETE FROM transactions').run();

  return {
    success: true,
    deleted: result.changes
  };
}

/**
 * Clear quotes cache
 */
export function clearQuotesCache(): DeleteResult {
  const result = db.prepare('DELETE FROM quotes_cache').run();

  return {
    success: true,
    deleted: result.changes
  };
}

/**
 * Purge soft-deleted watchlist members (hard delete)
 */
export function purgeRemovedMembers(): DeleteResult {
  const result = db.prepare(`
    DELETE FROM watchlist_members
    WHERE removed_at IS NOT NULL
  `).run();

  return {
    success: true,
    deleted: result.changes
  };
}

/**
 * Get position count for an account
 */
export function getAccountPositionCount(accountId: number): number {
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM positions WHERE account_id = ?
  `).get(accountId) as { count: number };

  return result.count;
}

/**
 * Delete account with cascade and return deleted counts
 */
export function deleteAccountWithCounts(accountId: number): {
  success: boolean;
  deleted: {
    account: string;
    positions: number;
  };
} | null {
  // Get account name first
  const account = db.prepare('SELECT name FROM accounts WHERE id = ?').get(accountId) as { name: string } | undefined;

  if (!account) {
    return null;
  }

  // Count positions before delete
  const positionCount = getAccountPositionCount(accountId);

  // Delete account (cascades to positions due to foreign key)
  db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId);

  return {
    success: true,
    deleted: {
      account: account.name,
      positions: positionCount
    }
  };
}

/**
 * Get member and rating counts for a watchlist
 */
export function getWatchlistCounts(watchlistId: number): { members: number; ratings: number } {
  const members = db.prepare(`
    SELECT COUNT(*) as count FROM watchlist_members WHERE watchlist_id = ?
  `).get(watchlistId) as { count: number };

  // Get watchlist source to determine rating table
  const watchlist = db.prepare('SELECT source FROM watchlists WHERE id = ?').get(watchlistId) as { source: string } | undefined;

  let ratingsCount = 0;
  if (watchlist) {
    const ratingTable = watchlist.source === 'seeking_alpha' ? 'seeking_alpha_ratings' : 'motley_fool_ratings';
    const ratings = db.prepare(`
      SELECT COUNT(*) as count FROM ${ratingTable} WHERE watchlist_id = ?
    `).get(watchlistId) as { count: number };
    ratingsCount = ratings.count;
  }

  return {
    members: members.count,
    ratings: ratingsCount
  };
}

/**
 * Delete watchlist with cascade and return deleted counts
 */
export function deleteWatchlistWithCounts(watchlistId: number): {
  success: boolean;
  deleted: {
    watchlist: string;
    members: number;
    ratings: number;
  };
} | null {
  // Get watchlist info first
  const watchlist = db.prepare('SELECT name, source FROM watchlists WHERE id = ?').get(watchlistId) as { name: string; source: string } | undefined;

  if (!watchlist) {
    return null;
  }

  // Get counts before delete
  const counts = getWatchlistCounts(watchlistId);

  // Delete watchlist (cascades to members and ratings due to foreign keys)
  db.prepare('DELETE FROM watchlists WHERE id = ?').run(watchlistId);

  return {
    success: true,
    deleted: {
      watchlist: watchlist.name,
      members: counts.members,
      ratings: counts.ratings
    }
  };
}

/**
 * Remove symbol from watchlist (soft delete)
 */
export function removeSymbolFromWatchlist(watchlistId: number, symbol: string): {
  success: boolean;
  removed: {
    symbol: string;
    watchlist: string;
  };
} | null {
  // Get watchlist name
  const watchlist = db.prepare('SELECT name FROM watchlists WHERE id = ?').get(watchlistId) as { name: string } | undefined;

  if (!watchlist) {
    return null;
  }

  // Check if member exists and is not already removed
  const member = db.prepare(`
    SELECT 1 FROM watchlist_members
    WHERE watchlist_id = ? AND symbol = ? AND removed_at IS NULL
  `).get(watchlistId, symbol);

  if (!member) {
    return null;
  }

  // Soft delete by setting removed_at
  db.prepare(`
    UPDATE watchlist_members
    SET removed_at = datetime('now')
    WHERE watchlist_id = ? AND symbol = ?
  `).run(watchlistId, symbol);

  return {
    success: true,
    removed: {
      symbol,
      watchlist: watchlist.name
    }
  };
}
