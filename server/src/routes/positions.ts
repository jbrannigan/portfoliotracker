import express from 'express';
import * as positionsService from '../services/positions.js';
import * as watchlistsService from '../services/watchlists.js';
import * as positionLinksService from '../services/positionLinks.js';

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

/**
 * GET /api/positions/dropped-links - Get all positions with dropped watchlist recommendations
 * NOTE: This route must be defined before /:id routes to avoid matching "dropped-links" as an ID
 */
positionsRouter.get('/dropped-links', (req, res) => {
  try {
    const droppedLinks = positionLinksService.getDroppedLinksWithDetails();
    res.json(droppedLinks);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch dropped links',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/positions/:id/watchlist-links - Get watchlist links for a position
 */
positionsRouter.get('/:id/watchlist-links', (req, res) => {
  try {
    const positionId = parseInt(req.params.id, 10);
    if (isNaN(positionId)) {
      return res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid position ID' }
      });
    }

    const position = positionsService.getPosition(positionId);
    if (!position) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Position not found' }
      });
    }

    const links = positionLinksService.getLinksForPosition(positionId);
    res.json({ position_id: positionId, links });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch watchlist links',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/positions/:id/watchlist-links - Link a position to a watchlist
 */
positionsRouter.post('/:id/watchlist-links', (req, res) => {
  try {
    const positionId = parseInt(req.params.id, 10);
    if (isNaN(positionId)) {
      return res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid position ID' }
      });
    }

    const { watchlist_id } = req.body;
    if (!watchlist_id || typeof watchlist_id !== 'number') {
      return res.status(400).json({
        error: { code: 'INVALID_WATCHLIST_ID', message: 'watchlist_id is required and must be a number' }
      });
    }

    const position = positionsService.getPosition(positionId);
    if (!position) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Position not found' }
      });
    }

    const watchlist = watchlistsService.getWatchlist(watchlist_id);
    if (!watchlist) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Watchlist not found' }
      });
    }

    const link = positionLinksService.createLink(positionId, watchlist_id);
    res.status(201).json(link);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create watchlist link',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/positions/:id/watchlist-links/:watchlistId - Remove a link
 */
positionsRouter.delete('/:id/watchlist-links/:watchlistId', (req, res) => {
  try {
    const positionId = parseInt(req.params.id, 10);
    const watchlistId = parseInt(req.params.watchlistId, 10);

    if (isNaN(positionId) || isNaN(watchlistId)) {
      return res.status(400).json({
        error: { code: 'INVALID_ID', message: 'Invalid position ID or watchlist ID' }
      });
    }

    const deleted = positionLinksService.deleteLink(positionId, watchlistId);
    if (!deleted) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Link not found' }
      });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete watchlist link',
        details: error.message
      }
    });
  }
});
