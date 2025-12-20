import express from 'express';
import * as watchlistsService from '../services/watchlists.js';
import * as positionsService from '../services/positions.js';
import * as quotesService from '../services/quotes.js';
import { db } from '../db/database.js';

export const watchlistsRouter = express.Router();

/**
 * GET /api/watchlists - List all watchlists
 */
watchlistsRouter.get('/', (req, res) => {
  try {
    const { source } = req.query;

    const watchlists = source && (source === 'seeking_alpha' || source === 'motley_fool')
      ? watchlistsService.getWatchlistsBySource(source)
      : watchlistsService.getAllWatchlists();

    res.json(watchlists);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch watchlists',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/watchlists/:id - Get watchlist detail
 */
watchlistsRouter.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid watchlist ID'
        }
      });
    }

    const watchlist = watchlistsService.getWatchlist(id);

    if (!watchlist) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Watchlist with ID ${id} not found`
        }
      });
    }

    res.json(watchlist);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch watchlist',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/watchlists - Create a new watchlist
 */
watchlistsRouter.post('/', (req, res) => {
  try {
    const { name, source, dollar_allocation } = req.body;

    if (!name) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Watchlist name is required'
        }
      });
    }

    if (!source || (source !== 'seeking_alpha' && source !== 'motley_fool')) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Source must be "seeking_alpha" or "motley_fool"'
        }
      });
    }

    const watchlist = watchlistsService.createWatchlist({
      name,
      source,
      dollar_allocation
    });

    res.status(201).json(watchlist);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'A watchlist with this name already exists'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create watchlist',
        details: error.message
      }
    });
  }
});

/**
 * PATCH /api/watchlists/:id - Update watchlist
 */
watchlistsRouter.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid watchlist ID'
        }
      });
    }

    const { name, dollar_allocation } = req.body;

    const watchlist = watchlistsService.updateWatchlist(id, {
      name,
      dollar_allocation
    });

    if (!watchlist) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Watchlist with ID ${id} not found`
        }
      });
    }

    res.json(watchlist);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'A watchlist with this name already exists'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update watchlist',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/watchlists/:id - Delete watchlist
 */
watchlistsRouter.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid watchlist ID'
        }
      });
    }

    const success = watchlistsService.deleteWatchlist(id);

    if (!success) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Watchlist with ID ${id} not found`
        }
      });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete watchlist',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/watchlists/:id/members - Get watchlist members with position data
 */
watchlistsRouter.get('/:id/members', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid watchlist ID'
        }
      });
    }

    const watchlist = watchlistsService.getWatchlist(id);

    if (!watchlist) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Watchlist with ID ${id} not found`
        }
      });
    }

    // Get members with symbol info
    const query = db.prepare(`
      SELECT
        wm.symbol,
        s.company_name,
        s.sector
      FROM watchlist_members wm
      LEFT JOIN symbols s ON wm.symbol = s.symbol
      WHERE wm.watchlist_id = ? AND wm.removed_at IS NULL
      ORDER BY wm.symbol
    `);

    const members = query.all(id) as any[];

    // Enrich with position data and quotes
    const enrichedMembers = await Promise.all(
      members.map(async (member) => {
        // Get total shares across all accounts
        const positions = positionsService.getPositionsBySymbol(member.symbol);
        const totalShares = positions.reduce((sum, p) => sum + p.shares, 0);
        const totalCostBasis = positions.reduce((sum, p) => sum + (p.cost_basis || 0), 0);

        // Try to get quote
        let quote = null;
        try {
          quote = await quotesService.getQuote(member.symbol);
        } catch (error) {
          // Quote not available, continue without it
        }

        const currentValue = quote?.price ? totalShares * quote.price : null;

        return {
          ...member,
          total_shares: totalShares,
          total_cost_basis: totalCostBasis,
          current_price: quote?.price || null,
          current_value: currentValue
        };
      })
    );

    res.json({
      watchlist,
      members: enrichedMembers
    });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch watchlist members',
        details: error.message
      }
    });
  }
});
