import express from 'express';
import * as positionLinksService from '../services/positionLinks.js';
import type { NeedsAttentionItem } from '../../../shared/src/types.js';

export const dashboardRouter = express.Router();

/**
 * GET /api/dashboard/needs-attention - Get items needing user action
 * Returns dropped recommendations, buy signals, and rebalancing needs
 */
dashboardRouter.get('/needs-attention', (req, res) => {
  try {
    const items: NeedsAttentionItem[] = [];

    // Get dropped recommendations (still holding but recommendation ended)
    const droppedLinks = positionLinksService.getDroppedLinksWithDetails();
    for (const link of droppedLinks) {
      items.push({
        type: 'dropped',
        symbol: link.symbol,
        watchlist: link.watchlist_name,
        message: `${link.symbol} dropped from ${link.watchlist_name}`,
        position_value: link.shares, // TODO: multiply by current price when quote service is integrated
        dropped_at: link.dropped_at
      });
    }

    // TODO: Add buy signals (watchlist members without positions)
    // TODO: Add underweight/overweight positions based on allocation targets

    res.json({ items });
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch needs-attention items',
        details: error.message
      }
    });
  }
});
