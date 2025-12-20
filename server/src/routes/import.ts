import express from 'express';
import multer from 'multer';
import { importSchwabCSV } from '../importers/schwab.js';
import { importSeekingAlphaExcel } from '../importers/seekingAlpha.js';
import { importMotleyFoolCSV } from '../importers/motleyFool.js';

export const importRouter = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  }
});

/**
 * POST /api/import/schwab - Import Schwab positions CSV
 */
importRouter.post('/schwab', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await importSchwabCSV(csvContent);

    if (!result.success) {
      return res.status(400).json({ error: result });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'IMPORT_ERROR',
        message: 'Failed to import Schwab file',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/import/seeking-alpha - Import Seeking Alpha Excel
 */
importRouter.post('/seeking-alpha', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const watchlistId = parseInt(req.body.watchlist_id);

    if (isNaN(watchlistId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_WATCHLIST',
          message: 'watchlist_id is required and must be a number'
        }
      });
    }

    const result = await importSeekingAlphaExcel(req.file.buffer, watchlistId);

    if (!result.success) {
      return res.status(400).json({ error: result });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'IMPORT_ERROR',
        message: 'Failed to import Seeking Alpha file',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/import/motley-fool - Import Motley Fool CSV
 */
importRouter.post('/motley-fool', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'NO_FILE',
          message: 'No file uploaded'
        }
      });
    }

    const watchlistId = parseInt(req.body.watchlist_id);

    if (isNaN(watchlistId)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_WATCHLIST',
          message: 'watchlist_id is required and must be a number'
        }
      });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const result = await importMotleyFoolCSV(csvContent, watchlistId);

    if (!result.success) {
      return res.status(400).json({ error: result });
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'IMPORT_ERROR',
        message: 'Failed to import Motley Fool file',
        details: error.message
      }
    });
  }
});
