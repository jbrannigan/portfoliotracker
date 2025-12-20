import { parse } from 'csv-parse/sync';
import { normalizeSymbol } from '../../../shared/src/utils.js';
import * as accountsService from '../services/accounts.js';
import * as symbolsService from '../services/symbols.js';
import * as positionsService from '../services/positions.js';
import type { ImportResult } from '../../../shared/src/types.js';

interface SchwabPosition {
  symbol: string;
  company_name: string;
  shares: number;
  cost_basis?: number;
}

interface SchwabImportResult extends ImportResult {
  account?: {
    id: number;
    name: string;
    created: boolean;
  };
  positions?: {
    added: number;
    updated: number;
  };
}

/**
 * Parse currency string to number
 * "$1,234.56" → 1234.56
 */
function parseCurrency(value: string): number {
  if (!value || value === '--' || value === 'N/A') return 0;
  return parseFloat(value.replace(/[$,]/g, ''));
}

/**
 * Parse number string with commas
 * "1,234.5" → 1234.5
 */
function parseNumber(value: string): number {
  if (!value || value === '--' || value === 'N/A') return 0;
  return parseFloat(value.replace(/,/g, ''));
}

/**
 * Import Schwab position CSV file
 */
export async function importSchwabCSV(csvContent: string): Promise<SchwabImportResult> {
  try {
    const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    if (lines.length < 4) {
      return {
        success: false,
        message: 'Invalid Schwab CSV format: file too short',
        errors: ['File must have at least 4 lines (header, blank, column headers, data)']
      };
    }

    // Extract account info from first line
    const headerLine = lines[0];
    const accountMatch = headerLine.match(/Positions for account (.+?) \.\.\.(\d+)/);

    if (!accountMatch) {
      return {
        success: false,
        message: 'Could not extract account name from header',
        errors: ['Expected format: "Positions for account NAME ...SUFFIX"']
      };
    }

    const accountName = accountMatch[1].trim();
    const accountSuffix = accountMatch[2];

    // Get or create account
    let account = accountsService.getAccountByName(accountName);
    let accountCreated = false;

    if (!account) {
      account = accountsService.createAccount({
        name: accountName,
        account_number_suffix: accountSuffix,
        broker: 'Schwab'
      });
      accountCreated = true;
    }

    // Parse CSV data starting from line 2 (0-indexed: line 1)
    // Line 0: header with account info
    // Line 1: column headers
    // Line 2+: data
    const csvData = lines.slice(1).join('\n');

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true
    });

    const positions: SchwabPosition[] = [];
    const errors: string[] = [];

    console.log('Parsed records count:', records.length);
    console.log('First record keys:', records.length > 0 ? Object.keys(records[0]) : 'none');

    for (const record of records) {
      const symbol = record['Symbol']?.trim();

      // Skip non-equity rows
      if (!symbol ||
          symbol === 'Cash & Cash Investments' ||
          symbol === 'Account Total' ||
          symbol.includes('Total')) {
        continue;
      }

      try {
        const normalizedSymbol = normalizeSymbol(symbol);
        const companyName = record['Description']?.trim() || '';
        const shares = parseNumber(record['Qty (Quantity)'] || record['Quantity'] || '0');
        const costBasis = parseCurrency(record['Cost Basis'] || '0');

        if (shares <= 0) {
          errors.push(`Skipped ${symbol}: invalid share quantity`);
          continue;
        }

        positions.push({
          symbol: normalizedSymbol,
          company_name: companyName,
          shares,
          cost_basis: costBasis > 0 ? costBasis : undefined
        });
      } catch (error: any) {
        errors.push(`Error parsing ${symbol}: ${error.message}`);
      }
    }

    // Upsert symbols and positions
    let added = 0;
    let updated = 0;

    for (const pos of positions) {
      // Upsert symbol
      symbolsService.upsertSymbol({
        symbol: pos.symbol,
        company_name: pos.company_name
      });

      // Check if position exists
      const existing = positionsService.getPositionByAccountAndSymbol(account.id, pos.symbol);

      // Upsert position
      positionsService.upsertPosition({
        account_id: account.id,
        symbol: pos.symbol,
        shares: pos.shares,
        cost_basis: pos.cost_basis
      });

      if (existing) {
        updated++;
      } else {
        added++;
      }
    }

    return {
      success: true,
      message: `Imported ${positions.length} positions for ${accountName}`,
      account: {
        id: account.id,
        name: account.name,
        created: accountCreated
      },
      positions: {
        added,
        updated
      },
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to import Schwab CSV',
      errors: [error.message]
    };
  }
}
