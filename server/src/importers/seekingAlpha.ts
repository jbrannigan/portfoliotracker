import * as XLSX from 'xlsx';
import { normalizeSymbol } from '../../../shared/src/utils.js';
import * as symbolsService from '../services/symbols.js';
import * as watchlistsService from '../services/watchlists.js';
import { db } from '../db/database.js';
import type { ImportResult } from '../../../shared/src/types.js';

interface SeekingAlphaRating {
  symbol: string;
  quant_score?: number;
  sa_analyst_score?: number;
  wall_st_score?: number;
  valuation_grade?: string;
  growth_grade?: string;
  profitability_grade?: string;
  momentum_grade?: string;
  eps_revision_grade?: string;
}

interface SeekingAlphaImportResult extends ImportResult {
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
 * Parse grade string, handling "-" as null
 */
function parseGrade(value: any): string | undefined {
  if (!value || value === '-' || value === '--') return undefined;
  return String(value).trim();
}

/**
 * Parse numeric score, handling "-" as null
 */
function parseScore(value: any): number | undefined {
  if (!value || value === '-' || value === '--') return undefined;
  const num = parseFloat(value);
  return isNaN(num) ? undefined : num;
}

/**
 * Import Seeking Alpha Excel file
 */
export async function importSeekingAlphaExcel(
  fileBuffer: Buffer,
  watchlistId: number
): Promise<SeekingAlphaImportResult> {
  try {
    // Verify watchlist exists
    const watchlist = watchlistsService.getWatchlist(watchlistId);
    if (!watchlist) {
      return {
        success: false,
        message: `Watchlist with ID ${watchlistId} not found`
      };
    }

    if (watchlist.source !== 'seeking_alpha') {
      return {
        success: false,
        message: 'This watchlist is not a Seeking Alpha watchlist'
      };
    }

    // Try to parse Excel file
    let workbook: XLSX.WorkBook;

    try {
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    } catch (error: any) {
      // If standard parsing fails, we could implement XML extraction here
      // For now, return error with suggestion
      return {
        success: false,
        message: 'Failed to parse Excel file',
        errors: [
          error.message,
          'The file may contain non-standard formatting.',
          'Please try re-exporting from Seeking Alpha or use a different export format.'
        ]
      };
    }

    // Look for "Ratings" sheet
    const ratingsSheet = workbook.Sheets['Ratings'] || workbook.Sheets['ratings'];

    if (!ratingsSheet) {
      return {
        success: false,
        message: 'Could not find "Ratings" sheet in Excel file',
        errors: [`Available sheets: ${workbook.SheetNames.join(', ')}`]
      };
    }

    // Convert sheet to JSON
    const data = XLSX.utils.sheet_to_json(ratingsSheet, { header: 1 });

    if (data.length < 2) {
      return {
        success: false,
        message: 'Ratings sheet is empty or has no data rows'
      };
    }

    // First row should be headers
    const headers = data[0] as any[];
    const rows = data.slice(1) as any[][];

    const ratings: SeekingAlphaRating[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row || row.length === 0) continue;

      const symbol = row[0];

      if (!symbol || symbol === '-') continue;

      try {
        const normalizedSymbol = normalizeSymbol(String(symbol));

        ratings.push({
          symbol: normalizedSymbol,
          quant_score: parseScore(row[1]),
          sa_analyst_score: parseScore(row[2]),
          wall_st_score: parseScore(row[3]),
          valuation_grade: parseGrade(row[4]),
          growth_grade: parseGrade(row[5]),
          profitability_grade: parseGrade(row[6]),
          momentum_grade: parseGrade(row[7]),
          eps_revision_grade: parseGrade(row[8])
        });
      } catch (error: any) {
        errors.push(`Error parsing row ${i + 2}: ${error.message}`);
      }
    }

    // Import ratings
    let added = 0;
    let updated = 0;

    for (const rating of ratings) {
      // Upsert symbol
      symbolsService.upsertSymbol({
        symbol: rating.symbol
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
        SELECT id FROM seeking_alpha_ratings
        WHERE symbol = ? AND watchlist_id = ?
      `).get(rating.symbol, watchlistId);

      if (existingRating) {
        db.prepare(`
          UPDATE seeking_alpha_ratings
          SET quant_score = ?,
              sa_analyst_score = ?,
              wall_st_score = ?,
              valuation_grade = ?,
              growth_grade = ?,
              profitability_grade = ?,
              momentum_grade = ?,
              eps_revision_grade = ?,
              imported_at = datetime('now')
          WHERE symbol = ? AND watchlist_id = ?
        `).run(
          rating.quant_score || null,
          rating.sa_analyst_score || null,
          rating.wall_st_score || null,
          rating.valuation_grade || null,
          rating.growth_grade || null,
          rating.profitability_grade || null,
          rating.momentum_grade || null,
          rating.eps_revision_grade || null,
          rating.symbol,
          watchlistId
        );
        updated++;
      } else {
        db.prepare(`
          INSERT INTO seeking_alpha_ratings (
            symbol, watchlist_id, quant_score, sa_analyst_score, wall_st_score,
            valuation_grade, growth_grade, profitability_grade, momentum_grade,
            eps_revision_grade, imported_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
          rating.symbol,
          watchlistId,
          rating.quant_score || null,
          rating.sa_analyst_score || null,
          rating.wall_st_score || null,
          rating.valuation_grade || null,
          rating.growth_grade || null,
          rating.profitability_grade || null,
          rating.momentum_grade || null,
          rating.eps_revision_grade || null
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
      message: 'Failed to import Seeking Alpha Excel file',
      errors: [error.message]
    };
  }
}
