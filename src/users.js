const { Router } = require('express');
const { z } = require('zod');
const { getDb } = require('./db');
const logger = require('./logger');
const validate = require('./middleware/validate');

const router = Router();
const createUserSchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  balance: z.number().nonnegative('balance cannot be negative').default(0),
});

router.post('/', validate(createUserSchema), async (req, res) => {
  try {
    const result = await getDb().query(
      'INSERT INTO users (name, balance) VALUES ($1, $2) RETURNING *',
      [req.body.name, req.body.balance]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to create user');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create user' } });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM users ORDER BY id ASC');
    return res.json({ success: true, data: result.rows, meta: { total: result.rowCount } });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to list users');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list users' } });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err, userId: req.params.id }, 'Failed to get user');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get user' } });
  }
});

module.exports = { router };
