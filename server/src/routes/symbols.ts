import express from 'express';
import * as symbolsService from '../services/symbols.js';
import * as positionsService from '../services/positions.js';
import * as ratingsService from '../services/ratings.js';
import * as quotesService from '../services/quotes.js';
import * as watchlistsService from '../services/watchlists.js';
import * as accountsService from '../services/accounts.js';

export const symbolsRouter = express.Router();

/**
 * GET /api/symbols - List all symbols
 */
symbolsRouter.get('/', (req, res) => {
  try {
    const { q } = req.query;

    const symbols = q && typeof q === 'string'
      ? symbolsService.searchSymbols(q)
      : symbolsService.getAllSymbols();

    res.json(symbols);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch symbols',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/symbols/:symbol/detail - Get comprehensive symbol detail
 * Includes symbol info, positions, ratings, quote, and watchlist membership
 * NOTE: This route must come BEFORE /:symbol route to avoid route collision
 */
symbolsRouter.get('/:symbol/detail', async (req, res) => {
  try {
    const { symbol } = req.params;

    // Get base symbol info
    const symbolInfo = symbolsService.getSymbol(symbol);
    if (!symbolInfo) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Symbol '${symbol}' not found`
        }
      });
    }

    // Get positions by account
    const positions = positionsService.getPositionsBySymbol(symbol);

    // Enrich positions with account names
    const enrichedPositions = positions.map(pos => {
      const account = accountsService.getAccount(pos.account_id);
      return {
        ...pos,
        account_name: account?.name
      };
    });

    // Get ratings
    const ratings = ratingsService.getRatingsWithWatchlists(symbol);

    // Get quote (may be cached or null)
    let quote = null;
    try {
      quote = await quotesService.getQuote(symbol);
    } catch (error) {
      // Quote fetch failed, that's okay - we'll just have null quote
    }

    // Get watchlist membership - query from database directly
    const { db } = await import('../db/database.js');
    const watchlistQuery = db.prepare(`
      SELECT DISTINCT w.*
      FROM watchlists w
      JOIN watchlist_members wm ON w.id = wm.watchlist_id
      WHERE wm.symbol = ? AND wm.removed_at IS NULL
    `);
    const memberWatchlists = watchlistQuery.all(symbol);

    res.json({
      symbol: symbolInfo,
      positions: enrichedPositions,
      ratings,
      quote,
      watchlists: memberWatchlists
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch symbol detail',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/symbols/:symbol - Get symbol detail
 */
symbolsRouter.get('/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;

    const result = symbolsService.getSymbol(symbol);

    if (!result) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Symbol '${symbol}' not found`
        }
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch symbol',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/symbols - Create or update a symbol
 */
symbolsRouter.post('/', (req, res) => {
  try {
    const { symbol, company_name, sector } = req.body;

    if (!symbol) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Symbol is required'
        }
      });
    }

    const result = symbolsService.upsertSymbol({
      symbol,
      company_name,
      sector
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create/update symbol',
        details: error.message
      }
    });
  }
});

/**
 * PATCH /api/symbols/:symbol - Update symbol
 */
symbolsRouter.patch('/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const { company_name, sector } = req.body;

    const result = symbolsService.updateSymbol(symbol, {
      company_name,
      sector
    });

    if (!result) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Symbol '${symbol}' not found`
        }
      });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update symbol',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/symbols/:symbol - Delete symbol
 */
symbolsRouter.delete('/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;

    const success = symbolsService.deleteSymbol(symbol);

    if (!success) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Symbol '${symbol}' not found`
        }
      });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete symbol',
        details: error.message
      }
    });
  }
});
