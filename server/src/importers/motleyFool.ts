import { parse } from 'csv-parse/sync';
import { normalizeSymbol } from '../../../shared/src/utils.js';
import * as symbolsService from '../services/symbols.js';
import * as watchlistsService from '../services/watchlists.js';
import { db } from '../db/database.js';
import type { ImportResult } from '../../../shared/src/types.js';

interface MotleyFoolRating {
  symbol: string;
  company_name?: string;
  sector?: string;
  rec_date?: string;
  cost_basis?: number;
  quant_5y?: number;
  allocation?: number;
  est_low_return?: number;
  est_high_return?: number;
  est_max_drawdown?: number;
  risk_tag?: 'Aggressive' | 'Moderate' | 'Cautious';
  times_recommended?: number;
  fcf_growth_1y?: number;
  gross_margin?: number;
}

interface MotleyFoolImportResult extends ImportResult {
  watchlist?: {
    id: number;
    name: string;
  };
  symbols?: {
    added: number;
    updated: number;
  };
}

/**
 * Parse percentage (0.1234 or 12.34)
 */
function parsePercentage(value: any): number | undefined {
  if (!value || value === '-' || value === '--') return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse optional number
 */
function parseOptionalNumber(value: any): number | undefined {
  if (!value || value === '-' || value === '--') return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse risk tag
 */
function parseRiskTag(value: any): 'Aggressive' | 'Moderate' | 'Cautious' | undefined {
  if (!value || value === '-') return undefined;
  const tag = String(value).trim();
  if (tag === 'Aggressive' || tag === 'Moderate' || tag === 'Cautious') {
    return tag;
  }
  return undefined;
}

/**
 * Import Motley Fool scorecard CSV file
 */
export async function importMotleyFoolCSV(
  csvContent: string,
  watchlistId: number
): Promise<MotleyFoolImportResult> {
  try {
    // Verify watchlist exists
    const watchlist = watchlistsService.getWatchlist(watchlistId);
    if (!watchlist) {
      return {
        success: false,
        message: `Watchlist with ID ${watchlistId} not found`
      };
    }

    if (watchlist.source !== 'motley_fool') {
      return {
        success: false,
        message: 'This watchlist is not a Motley Fool watchlist'
      };
    }

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true  // Handle UTF-8 BOM
    });

    if (records.length === 0) {
      return {
        success: false,
        message: 'CSV file is empty or has no data rows'
      };
    }

    const ratings: MotleyFoolRating[] = [];
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const symbol = record['Symbol']?.trim();

      if (!symbol || symbol === '-') continue;

      try {
        const normalizedSymbol = normalizeSymbol(symbol);

        ratings.push({
          symbol: normalizedSymbol,
          company_name: record['Company']?.trim() || undefined,
          sector: record['Sector']?.trim() || undefined,
          rec_date: record['Rec Date']?.trim() || undefined,
          cost_basis: parseOptionalNumber(record['Cost Basis']),
          quant_5y: parseOptionalNumber(record['Quant: 5Y']),
          allocation: parsePercentage(record['Allocation']),
          est_low_return: parsePercentage(record['Est. Low Return']),
          est_high_return: parsePercentage(record['Est. High Return']),
          est_max_drawdown: parsePercentage(record['Est. Max Drawdown']),
          risk_tag: parseRiskTag(record['cmaTagLabel']),
          times_recommended: parseInt(record['Times Rec\'d']) || undefined,
          fcf_growth_1y: parsePercentage(record['1Y FCF Growth']),
          gross_margin: parsePercentage(record['Gross Margin'])
        });
      } catch (error: any) {
        errors.push(`Error parsing row ${i + 2} (${symbol}): ${error.message}`);
      }
    }

    // Import ratings
    let added = 0;
    let updated = 0;

    for (const rating of ratings) {
      // Upsert symbol with company name and sector if available
      symbolsService.upsertSymbol({
        symbol: rating.symbol,
        company_name: rating.company_name,
        sector: rating.sector
      });

      // Add to watchlist if not already there
      const memberCheck = db.prepare(`
        SELECT id FROM watchlist_members
        WHERE watchlist_id = ? AND symbol = ? AND removed_at IS NULL
      `).get(watchlistId, rating.symbol);

      if (!memberCheck) {
        db.prepare(`
          INSERT INTO watchlist_members (watchlist_id, symbol, added_at)
          VALUES (?, ?, datetime('now'))
        `).run(watchlistId, rating.symbol);
      }

      // Upsert rating
      const existingRating = db.prepare(`
        SELECT id FROM motley_fool_ratings
        WHERE symbol = ? AND watchlist_id = ?
      `).get(rating.symbol, watchlistId);

      if (existingRating) {
        db.prepare(`
          UPDATE motley_fool_ratings
          SET rec_date = ?,
              cost_basis = ?,
              quant_5y = ?,
              allocation = ?,
              est_low_return = ?,
              est_high_return = ?,
              est_max_drawdown = ?,
              risk_tag = ?,
              times_recommended = ?,
              fcf_growth_1y = ?,
              gross_margin = ?,
              imported_at = datetime('now')
          WHERE symbol = ? AND watchlist_id = ?
        `).run(
          rating.rec_date || null,
          rating.cost_basis || null,
          rating.quant_5y || null,
          rating.allocation || null,
          rating.est_low_return || null,
          rating.est_high_return || null,
          rating.est_max_drawdown || null,
          rating.risk_tag || null,
          rating.times_recommended || null,
          rating.fcf_growth_1y || null,
          rating.gross_margin || null,
          rating.symbol,
          watchlistId
        );
        updated++;
      } else {
        db.prepare(`
          INSERT INTO motley_fool_ratings (
            symbol, watchlist_id, rec_date, cost_basis, quant_5y, allocation,
            est_low_return, est_high_return, est_max_drawdown, risk_tag,
            times_recommended, fcf_growth_1y, gross_margin, imported_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          rating.symbol,
          watchlistId,
          rating.rec_date || null,
          rating.cost_basis || null,
          rating.quant_5y || null,
          rating.allocation || null,
          rating.est_low_return || null,
          rating.est_high_return || null,
          rating.est_max_drawdown || null,
          rating.risk_tag || null,
          rating.times_recommended || null,
          rating.fcf_growth_1y || null,
          rating.gross_margin || null
        );
        added++;
      }
    }

    return {
      success: true,
      message: `Imported ${ratings.length} ratings for ${watchlist.name}`,
      watchlist: {
        id: watchlist.id,
        name: watchlist.name
      },
      symbols: {
        added,
        updated
      },
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to import Motley Fool CSV',
      errors: [error.message]
    };
  }
}
