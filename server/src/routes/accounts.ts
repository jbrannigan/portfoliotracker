import express from 'express';
import * as accountsService from '../services/accounts.js';
import * as positionsService from '../services/positions.js';

export const accountsRouter = express.Router();

/**
 * GET /api/accounts - List all accounts
 */
accountsRouter.get('/', (req, res) => {
  try {
    const accounts = accountsService.getAllAccounts();
    res.json(accounts);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch accounts',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/accounts/:id - Get account detail
 */
accountsRouter.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid account ID'
        }
      });
    }

    const account = accountsService.getAccount(id);

    if (!account) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Account with ID ${id} not found`
        }
      });
    }

    res.json(account);
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch account',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/accounts/:id/positions - Get all positions for an account
 */
accountsRouter.get('/:id/positions', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid account ID'
        }
      });
    }

    const account = accountsService.getAccount(id);

    if (!account) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Account with ID ${id} not found`
        }
      });
    }

    const positions = positionsService.getEnrichedPositions(id);
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
 * POST /api/accounts - Create a new account
 */
accountsRouter.post('/', (req, res) => {
  try {
    const { name, account_number_suffix, broker } = req.body;

    if (!name) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Account name is required'
        }
      });
    }

    const account = accountsService.createAccount({
      name,
      account_number_suffix,
      broker
    });

    res.status(201).json(account);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'An account with this name already exists'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create account',
        details: error.message
      }
    });
  }
});

/**
 * PATCH /api/accounts/:id - Update account
 */
accountsRouter.patch('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid account ID'
        }
      });
    }

    const { name, account_number_suffix, broker } = req.body;

    const account = accountsService.updateAccount(id, {
      name,
      account_number_suffix,
      broker
    });

    if (!account) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Account with ID ${id} not found`
        }
      });
    }

    res.json(account);
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: {
          code: 'DUPLICATE_ERROR',
          message: 'An account with this name already exists'
        }
      });
    }

    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update account',
        details: error.message
      }
    });
  }
});

/**
 * DELETE /api/accounts/:id - Delete account
 */
accountsRouter.delete('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid account ID'
        }
      });
    }

    const success = accountsService.deleteAccount(id);

    if (!success) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Account with ID ${id} not found`
        }
      });
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete account',
        details: error.message
      }
    });
  }
});
