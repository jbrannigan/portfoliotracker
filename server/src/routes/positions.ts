import express from 'express';
import * as positionsService from '../services/positions.js';
import * as watchlistsService from '../services/watchlists.js';

export const positionsRouter = express.Router();

/**
 * GET /api/positions/summary - Get aggregated positions grouped by symbol
 */
positionsRouter.get('/summary', (req, res) => {
  try {
    const positionSummaries = positionsService.getPositionSummary();

    // Enrich with watchlist names
    const watchlists = watchlistsService.getAllWatchlists();
    const watchlistMap = new Map(watchlists.map(w => [w.id, w.name]));

    const enriched = positionSummaries.map(pos => ({
      ...pos,
      watchlists: pos.watchlist_ids.map((id: number) => watchlistMap.get(id)).filter(Boolean)
    }));

    res.json(enriched);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch position summary',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/positions - Get all positions
 */
positionsRouter.get('/', (req, res) => {
  try {
    const positions = positionsService.getAllPositions();
    res.json(positions);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch positions',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/positions/by-symbol/:symbol - Get positions for a specific symbol
 */
positionsRouter.get('/by-symbol/:symbol', (req, res) => {
  try {
    const { symbol } = req.params;
    const positions = positionsService.getPositionsBySymbol(symbol);
    res.json(positions);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch positions by symbol',
        details: error.message
      }
    });
  }
});
