import { db } from '../db/database.js';
import type { Symbol } from '../../../shared/src/types.js';
import { normalizeSymbol } from '../../../shared/src/utils.js';

/**
 * Get all symbols
 */
export function getAllSymbols(): Symbol[] {
  const stmt = db.prepare('SELECT * FROM symbols ORDER BY symbol');
  return stmt.all() as Symbol[];
}

/**
 * Get a single symbol by ticker
 */
export function getSymbol(symbol: string): Symbol | undefined {
  const normalized = normalizeSymbol(symbol);
  const stmt = db.prepare('SELECT * FROM symbols WHERE symbol = ?');
  return stmt.get(normalized) as Symbol | undefined;
}

/**
 * Create a new symbol (or update if exists)
 */
export function upsertSymbol(data: {
  symbol: string;
  company_name?: string;
  sector?: string;
}): Symbol {
  const normalized = normalizeSymbol(data.symbol);

  const stmt = db.prepare(`
    INSERT INTO symbols (symbol, company_name, sector, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(symbol) DO UPDATE SET
      company_name = COALESCE(excluded.company_name, company_name),
      sector = COALESCE(excluded.sector, sector),
      updated_at = datetime('now')
    RETURNING *
  `);

  return stmt.get(
    normalized,
    data.company_name || null,
    data.sector || null
  ) as Symbol;
}

/**
 * Update an existing symbol
 */
export function updateSymbol(
  symbol: string,
  data: {
    company_name?: string;
    sector?: string;
  }
): Symbol | undefined {
  const normalized = normalizeSymbol(symbol);

  const existing = getSymbol(normalized);
  if (!existing) {
    return undefined;
  }

  const stmt = db.prepare(`
    UPDATE symbols
    SET company_name = COALESCE(?, company_name),
        sector = COALESCE(?, sector),
        updated_at = datetime('now')
    WHERE symbol = ?
    RETURNING *
  `);

  return stmt.get(
    data.company_name || null,
    data.sector || null,
    normalized
  ) as Symbol;
}

/**
 * Delete a symbol
 * Note: Will cascade delete related records due to foreign key constraints
 */
export function deleteSymbol(symbol: string): boolean {
  const normalized = normalizeSymbol(symbol);

  const stmt = db.prepare('DELETE FROM symbols WHERE symbol = ?');
  const result = stmt.run(normalized);

  return result.changes > 0;
}

/**
 * Search symbols by company name or symbol
 */
export function searchSymbols(query: string): Symbol[] {
  const searchPattern = `%${query}%`;

  const stmt = db.prepare(`
    SELECT * FROM symbols
    WHERE symbol LIKE ? OR company_name LIKE ?
    ORDER BY symbol
    LIMIT 50
  `);

  return stmt.all(searchPattern, searchPattern) as Symbol[];
}
