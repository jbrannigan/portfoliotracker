import express from 'express';
import fs from 'fs';
import path from 'path';
import * as adminService from '../services/admin.js';

export const adminRouter = express.Router();

/**
 * GET /api/admin/backup - Download database backup
 */
adminRouter.get('/backup', (req, res) => {
  try {
    const dbPath = adminService.getDatabasePath();

    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Database file not found'
        }
      });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `portfolio-backup-${timestamp}.db`;

    res.setHeader('Content-Type', 'application/x-sqlite3');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(dbPath);
    fileStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create backup',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/admin/stats - Get cleanup statistics
 */
adminRouter.get('/stats', (req, res) => {
  try {
    const stats = adminService.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get stats',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/admin/orphan-symbols - Delete orphan symbols
 */
adminRouter.delete('/orphan-symbols', (req, res) => {
  try {
    const result = adminService.deleteOrphanSymbols();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete orphan symbols',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/admin/transactions - Clear all transactions
 */
adminRouter.delete('/transactions', (req, res) => {
  try {
    const result = adminService.clearTransactions();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear transactions',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/admin/quotes-cache - Clear quotes cache
 */
adminRouter.delete('/quotes-cache', (req, res) => {
  try {
    const result = adminService.clearQuotesCache();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to clear quotes cache',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/admin/purge-removed-members - Hard delete soft-deleted members
 */
adminRouter.delete('/purge-removed-members', (req, res) => {
  try {
    const result = adminService.purgeRemovedMembers();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to purge removed members',
        details: error.message
      }
    });
  }
});
