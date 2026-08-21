const { Router } = require('express');
const { z } = require('zod');
const { getDb } = require('./db');
const logger = require('./logger');
const validate = require('./middleware/validate');

const router = Router();
const createInventorySchema = z.object({
  name: z.string().trim().min(1, 'name is required'),
  quantity: z.number().int().nonnegative('quantity cannot be negative').default(0),
  cost: z.number().nonnegative('cost cannot be negative'),
});

router.post('/', validate(createInventorySchema), async (req, res) => {
  try {
    const result = await getDb().query(
      'INSERT INTO inventory (name, quantity, cost) VALUES ($1, $2, $3) RETURNING *',
      [req.body.name, req.body.quantity, req.body.cost]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to create inventory item');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create inventory item' } });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM inventory ORDER BY inventory_id ASC');
    return res.json({ success: true, data: result.rows, meta: { total: result.rowCount } });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to list inventory');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list inventory' } });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await getDb().query('SELECT * FROM inventory WHERE inventory_id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Inventory item not found' } });
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err, inventoryId: req.params.id }, 'Failed to get inventory item');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get inventory item' } });
  }
});

module.exports = { router };
