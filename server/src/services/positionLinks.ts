import { db } from '../db/database.js';
import type { PositionWatchlistLink, PositionWatchlistLinkDetail } from '../../../shared/src/types.js';

/**
 * Get all watchlist links for a position
 */
export function getLinksForPosition(positionId: number): PositionWatchlistLinkDetail[] {
  const stmt = db.prepare(`
    SELECT
      pwl.*,
      w.name as watchlist_name,
      w.source as watchlist_source
    FROM position_watchlist_links pwl
    JOIN watchlists w ON pwl.watchlist_id = w.id
    WHERE pwl.position_id = ?
    ORDER BY pwl.linked_at DESC
  `);
  return stmt.all(positionId) as PositionWatchlistLinkDetail[];
}

/**
 * Get all links for a watchlist
 */
export function getLinksForWatchlist(watchlistId: number): PositionWatchlistLink[] {
  const stmt = db.prepare(`
    SELECT * FROM position_watchlist_links
    WHERE watchlist_id = ?
    ORDER BY linked_at DESC
  `);
  return stmt.all(watchlistId) as PositionWatchlistLink[];
}

/**
 * Get a specific link
 */
export function getLink(positionId: number, watchlistId: number): PositionWatchlistLink | undefined {
  const stmt = db.prepare(`
    SELECT * FROM position_watchlist_links
    WHERE position_id = ? AND watchlist_id = ?
  `);
  return stmt.get(positionId, watchlistId) as PositionWatchlistLink | undefined;
}

/**
 * Create a new position-watchlist link
 */
export function createLink(positionId: number, watchlistId: number): PositionWatchlistLink {
  const stmt = db.prepare(`
    INSERT INTO position_watchlist_links (position_id, watchlist_id, status, linked_at)
    VALUES (?, ?, 'active', datetime('now'))
    ON CONFLICT(position_id, watchlist_id) DO UPDATE SET
      status = 'active',
      dropped_at = NULL
    RETURNING *
  `);
  return stmt.get(positionId, watchlistId) as PositionWatchlistLink;
}

/**
 * Mark a link as dropped (watchlist no longer recommends symbol)
 */
export function markLinkDropped(positionId: number, watchlistId: number): PositionWatchlistLink | undefined {
  const stmt = db.prepare(`
    UPDATE position_watchlist_links
    SET status = 'dropped', dropped_at = datetime('now')
    WHERE position_id = ? AND watchlist_id = ?
    RETURNING *
  `);
  return stmt.get(positionId, watchlistId) as PositionWatchlistLink | undefined;
}

/**
 * Reactivate a dropped link (symbol re-added to watchlist)
 */
export function reactivateLink(positionId: number, watchlistId: number): PositionWatchlistLink | undefined {
  const stmt = db.prepare(`
    UPDATE position_watchlist_links
    SET status = 'active', dropped_at = NULL
    WHERE position_id = ? AND watchlist_id = ?
    RETURNING *
  `);
  return stmt.get(positionId, watchlistId) as PositionWatchlistLink | undefined;
}

/**
 * Delete a link (hard delete - use sparingly)
 */
export function deleteLink(positionId: number, watchlistId: number): boolean {
  const stmt = db.prepare(`
    DELETE FROM position_watchlist_links
    WHERE position_id = ? AND watchlist_id = ?
  `);
  const result = stmt.run(positionId, watchlistId);
  return result.changes > 0;
}

/**
 * Get all active links (not dropped)
 */
export function getActiveLinks(): PositionWatchlistLink[] {
  const stmt = db.prepare(`
    SELECT * FROM position_watchlist_links
    WHERE status = 'active'
    ORDER BY linked_at DESC
  `);
  return stmt.all() as PositionWatchlistLink[];
}

/**
 * Get all dropped links
 */
export function getDroppedLinks(): PositionWatchlistLinkDetail[] {
  const stmt = db.prepare(`
    SELECT
      pwl.*,
      w.name as watchlist_name,
      w.source as watchlist_source
    FROM position_watchlist_links pwl
    JOIN watchlists w ON pwl.watchlist_id = w.id
    WHERE pwl.status = 'dropped'
    ORDER BY pwl.dropped_at DESC
  `);
  return stmt.all() as PositionWatchlistLinkDetail[];
}

/**
 * Bulk mark links as dropped for a symbol/watchlist (used during import)
 */
export function markLinksDroppedBySymbol(symbol: string, watchlistId: number): number {
  const stmt = db.prepare(`
    UPDATE position_watchlist_links
    SET status = 'dropped', dropped_at = datetime('now')
    WHERE watchlist_id = ?
    AND position_id IN (
      SELECT p.id FROM positions p WHERE p.symbol = ?
    )
    AND status = 'active'
  `);
  const result = stmt.run(watchlistId, symbol);
  return result.changes;
}

/**
 * Bulk reactivate links for a symbol/watchlist (used during import)
 */
export function reactivateLinksBySymbol(symbol: string, watchlistId: number): number {
  const stmt = db.prepare(`
    UPDATE position_watchlist_links
    SET status = 'active', dropped_at = NULL
    WHERE watchlist_id = ?
    AND position_id IN (
      SELECT p.id FROM positions p WHERE p.symbol = ?
    )
    AND status = 'dropped'
  `);
  const result = stmt.run(watchlistId, symbol);
  return result.changes;
}

/**
 * Get links with position and symbol info (for dashboard needs-attention)
 */
export function getDroppedLinksWithDetails(): Array<{
  position_id: number;
  watchlist_id: number;
  watchlist_name: string;
  symbol: string;
  company_name: string | null;
  shares: number;
  dropped_at: string;
}> {
  const stmt = db.prepare(`
    SELECT
      pwl.position_id,
      pwl.watchlist_id,
      w.name as watchlist_name,
      p.symbol,
      s.company_name,
      p.shares,
      pwl.dropped_at
    FROM position_watchlist_links pwl
    JOIN watchlists w ON pwl.watchlist_id = w.id
    JOIN positions p ON pwl.position_id = p.id
    LEFT JOIN symbols s ON p.symbol = s.symbol
    WHERE pwl.status = 'dropped'
    AND p.shares > 0
    ORDER BY pwl.dropped_at DESC
  `);
  return stmt.all() as any[];
}
