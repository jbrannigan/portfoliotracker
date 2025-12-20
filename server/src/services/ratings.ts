import { db } from '../db/database.js';
import type { SeekingAlphaRating, MotleyFoolRating } from '../../../shared/src/types.js';
import { normalizeSymbol } from '../../../shared/src/utils.js';

/**
 * Get all Seeking Alpha ratings for a symbol
 */
export function getSeekingAlphaRatings(symbol: string): SeekingAlphaRating[] {
  const normalized = normalizeSymbol(symbol);
  const stmt = db.prepare(`
    SELECT * FROM seeking_alpha_ratings
    WHERE symbol = ?
    ORDER BY imported_at DESC
  `);
  return stmt.all(normalized) as SeekingAlphaRating[];
}

/**
 * Get all Motley Fool ratings for a symbol
 */
export function getMotleyFoolRatings(symbol: string): MotleyFoolRating[] {
  const normalized = normalizeSymbol(symbol);
  const stmt = db.prepare(`
    SELECT * FROM motley_fool_ratings
    WHERE symbol = ?
    ORDER BY imported_at DESC
  `);
  return stmt.all(normalized) as MotleyFoolRating[];
}

/**
 * Get combined ratings for a symbol
 */
export function getCombinedRatings(symbol: string): {
  seekingAlpha: SeekingAlphaRating[];
  motleyFool: MotleyFoolRating[];
} {
  return {
    seekingAlpha: getSeekingAlphaRatings(symbol),
    motleyFool: getMotleyFoolRatings(symbol)
  };
}

/**
 * Get ratings with watchlist names
 */
export function getRatingsWithWatchlists(symbol: string): {
  seekingAlpha: any[];
  motleyFool: any[];
} {
  const normalized = normalizeSymbol(symbol);

  const saStmt = db.prepare(`
    SELECT
      sa.*,
      w.name as watchlist_name,
      w.source as watchlist_source
    FROM seeking_alpha_ratings sa
    LEFT JOIN watchlists w ON sa.watchlist_id = w.id
    WHERE sa.symbol = ?
    ORDER BY sa.imported_at DESC
  `);

  const mfStmt = db.prepare(`
    SELECT
      mf.*,
      w.name as watchlist_name,
      w.source as watchlist_source
    FROM motley_fool_ratings mf
    LEFT JOIN watchlists w ON mf.watchlist_id = w.id
    WHERE mf.symbol = ?
    ORDER BY mf.imported_at DESC
  `);

  return {
    seekingAlpha: saStmt.all(normalized),
    motleyFool: mfStmt.all(normalized)
  };
}
