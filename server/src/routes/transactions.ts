import { Router } from 'express';
import * as transactionsService from '../services/transactions.js';
import * as accountsService from '../services/accounts.js';
import * as symbolsService from '../services/symbols.js';
import * as watchlistsService from '../services/watchlists.js';
import { normalizeSymbol } from '../../../shared/src/utils.js';
import type { CreateTransactionRequest } from '../../../shared/src/types.js';

export const transactionsRouter = Router();

/**
 * GET /api/transactions
 * Get all transactions with filters and pagination
 */
transactionsRouter.get('/', (req, res) => {
  try {
    const filters: transactionsService.TransactionFilters = {};

    if (req.query.symbol) {
      filters.symbol = normalizeSymbol(req.query.symbol as string);
    }

    if (req.query.account_id) {
      filters.account_id = parseInt(req.query.account_id as string);
    }

    if (req.query.transaction_type) {
      filters.transaction_type = req.query.transaction_type as 'BUY' | 'SELL';
    }

    if (req.query.start_date) {
      filters.start_date = req.query.start_date as string;
    }

    if (req.query.end_date) {
      filters.end_date = req.query.end_date as string;
    }

    if (req.query.reason_type) {
      filters.reason_type = req.query.reason_type as any;
    }

    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string);
    }

    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string);
    }

    const transactions = transactionsService.getTransactions(filters);
    const total = transactionsService.getTransactionCount(filters);

    res.json({
      transactions,
      total,
      limit: filters.limit,
      offset: filters.offset ?? 0
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch transactions',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/transactions/recent
 * Get recent transactions (for dashboard)
 */
transactionsRouter.get('/recent', (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const transactions = transactionsService.getRecentTransactions(limit);
    res.json(transactions);
  } catch (error: any) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch recent transactions',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction by ID
 */
transactionsRouter.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const transaction = transactionsService.getTransactionById(id);

    if (!transaction) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    res.json(transaction);
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch transaction',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/transactions
 * Create a new transaction
 */
transactionsRouter.post('/', (req, res) => {
  try {
    const data: CreateTransactionRequest = req.body;

    // Validation
    if (!data.account_id || !data.symbol || !data.transaction_type || !data.shares || !data.price_per_share || !data.transaction_date) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: account_id, symbol, transaction_type, shares, price_per_share, transaction_date'
        }
      });
    }

    // Validate account exists
    const account = accountsService.getAccount(data.account_id);
    if (!account) {
      return res.status(404).json({
        error: {
          code: 'ACCOUNT_NOT_FOUND',
          message: `Account with ID ${data.account_id} not found`
        }
      });
    }

    // Normalize symbol
    data.symbol = normalizeSymbol(data.symbol);

    // Ensure symbol exists (create if needed)
    let symbol = symbolsService.getSymbol(data.symbol);
    if (!symbol) {
      symbol = symbolsService.upsertSymbol({ symbol: data.symbol });
    }

    // Validate watchlist if provided
    if (data.reason_watchlist_id) {
      const watchlist = watchlistsService.getWatchlist(data.reason_watchlist_id);
      if (!watchlist) {
        return res.status(404).json({
          error: {
            code: 'WATCHLIST_NOT_FOUND',
            message: `Watchlist with ID ${data.reason_watchlist_id} not found`
          }
        });
      }
    }

    // Validate transaction type
    if (data.transaction_type !== 'BUY' && data.transaction_type !== 'SELL') {
      return res.status(400).json({
        error: {
          code: 'INVALID_TYPE',
          message: 'transaction_type must be "BUY" or "SELL"'
        }
      });
    }

    // Validate shares and price
    if (data.shares <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SHARES',
          message: 'shares must be greater than 0'
        }
      });
    }

    if (data.price_per_share <= 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PRICE',
          message: 'price_per_share must be greater than 0'
        }
      });
    }

    const transaction = transactionsService.createTransaction(data);
    res.status(201).json(transaction);
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create transaction',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/transactions/:id
 * Delete a transaction
 */
transactionsRouter.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = transactionsService.deleteTransaction(id);

    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction not found'
        }
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete transaction',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/transactions/export/csv
 * Export transactions to CSV
 */
transactionsRouter.get('/export/csv', (req, res) => {
  try {
    const filters: transactionsService.TransactionFilters = {};

    // Apply same filters as GET /api/transactions
    if (req.query.symbol) {
      filters.symbol = normalizeSymbol(req.query.symbol as string);
    }
    if (req.query.account_id) {
      filters.account_id = parseInt(req.query.account_id as string);
    }
    if (req.query.transaction_type) {
      filters.transaction_type = req.query.transaction_type as 'BUY' | 'SELL';
    }
    if (req.query.start_date) {
      filters.start_date = req.query.start_date as string;
    }
    if (req.query.end_date) {
      filters.end_date = req.query.end_date as string;
    }
    if (req.query.reason_type) {
      filters.reason_type = req.query.reason_type as any;
    }

    const transactions = transactionsService.getTransactions(filters);

    // Get account names for display
    const accounts = accountsService.getAllAccounts();
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));

    // Get watchlist names
    const watchlists = watchlistsService.getAllWatchlists();
    const watchlistMap = new Map(watchlists.map(w => [w.id, w.name]));

    // Build CSV
    const csvLines: string[] = [];

    // Header
    csvLines.push('Date,Symbol,Type,Shares,Price,Amount,Account,Reason,Watchlist,Notes,URL');

    // Data rows
    for (const t of transactions) {
      const accountName = accountMap.get(t.account_id) || '';
      const watchlistName = t.reason_watchlist_id ? watchlistMap.get(t.reason_watchlist_id) || '' : '';

      csvLines.push([
        t.transaction_date,
        t.symbol,
        t.transaction_type,
        t.shares.toString(),
        t.price_per_share.toString(),
        (t.total_amount ?? 0).toString(),
        `"${accountName}"`,
        t.reason_type || '',
        `"${watchlistName}"`,
        `"${(t.reason_notes || '').replace(/"/g, '""')}"`,
        t.reason_url || ''
      ].join(','));
    }

    const csv = csvLines.join('\n');

    // Generate filename with date range
    const dateRange = filters.start_date && filters.end_date
      ? `${filters.start_date}_to_${filters.end_date}`
      : new Date().toISOString().split('T')[0];
    const filename = `transactions_${dateRange}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({
      error: {
        code: 'EXPORT_ERROR',
        message: 'Failed to export transactions to CSV',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/transactions/export/excel
 * Export transactions to Excel
 */
transactionsRouter.get('/export/excel', async (req, res) => {
  try {
    // Import xlsx dynamically
    const XLSX = await import('xlsx');

    const filters: transactionsService.TransactionFilters = {};

    // Apply same filters
    if (req.query.symbol) {
      filters.symbol = normalizeSymbol(req.query.symbol as string);
    }
    if (req.query.account_id) {
      filters.account_id = parseInt(req.query.account_id as string);
    }
    if (req.query.transaction_type) {
      filters.transaction_type = req.query.transaction_type as 'BUY' | 'SELL';
    }
    if (req.query.start_date) {
      filters.start_date = req.query.start_date as string;
    }
    if (req.query.end_date) {
      filters.end_date = req.query.end_date as string;
    }
    if (req.query.reason_type) {
      filters.reason_type = req.query.reason_type as any;
    }

    const transactions = transactionsService.getTransactions(filters);

    // Get account and watchlist names
    const accounts = accountsService.getAllAccounts();
    const accountMap = new Map(accounts.map(a => [a.id, a.name]));
    const watchlists = watchlistsService.getAllWatchlists();
    const watchlistMap = new Map(watchlists.map(w => [w.id, w.name]));

    // Prepare data for Excel
    const excelData = transactions.map(t => ({
      Date: t.transaction_date,
      Symbol: t.symbol,
      Type: t.transaction_type,
      Shares: t.shares,
      Price: t.price_per_share,
      Amount: t.total_amount ?? 0,
      Account: accountMap.get(t.account_id) || '',
      Reason: t.reason_type || '',
      Watchlist: t.reason_watchlist_id ? watchlistMap.get(t.reason_watchlist_id) || '' : '',
      Notes: t.reason_notes || '',
      URL: t.reason_url || ''
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Generate filename
    const dateRange = filters.start_date && filters.end_date
      ? `${filters.start_date}_to_${filters.end_date}`
      : new Date().toISOString().split('T')[0];
    const filename = `transactions_${dateRange}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  } catch (error: any) {
    console.error('Error exporting Excel:', error);
    res.status(500).json({
      error: {
        code: 'EXPORT_ERROR',
        message: 'Failed to export transactions to Excel',
        details: error.message
      }
    });
  }
});
