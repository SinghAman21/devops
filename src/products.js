const { randomUUID } = require('crypto');
const { Router } = require('express');
const { z } = require('zod');
const { getDb } = require('./db');
const logger = require('./logger');
const validate = require('./middleware/validate');

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  price: z.number().positive('price must be positive'),
  stock: z.number().int().min(0, 'stock cannot be negative').optional().default(0),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().min(0).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// POST /products — create a new product
router.post('/', validate(createProductSchema), async (req, res) => {
  const { name, description, price, stock } = req.body;
  const id = randomUUID();
  const now = new Date();

  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO products (id, name, description, price, stock, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, description || null, price, stock, now, now]
    );

    logger.info({ requestId: req.requestId, productId: id }, 'Product created');
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to create product');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create product' } });
  }
});

// GET /products — list all products
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM products ORDER BY created_at DESC, id DESC');
    return res.json({ success: true, data: result.rows, meta: { total: result.rowCount } });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to list products');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list products' } });
  }
});

// GET /products/:id — fetch a single product
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err, productId: req.params.id }, 'Failed to get product');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get product' } });
  }
});

// PATCH /products/:id — update a product
router.patch('/:id', validate(updateProductSchema), async (req, res) => {
  const fields = req.body;
  const now = new Date();

  try {
    const db = getDb();
    const existing = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      const col = key === 'name' ? 'name' : key === 'description' ? 'description' : key === 'price' ? 'price' : 'stock';
      setClauses.push(`${col} = $${idx}`);
      values.push(value);
      idx++;
    }
    setClauses.push(`updated_at = $${idx}`);
    values.push(now);
    idx++;
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE products SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    logger.info({ requestId: req.requestId, productId: req.params.id }, 'Product updated');
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err, productId: req.params.id }, 'Failed to update product');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to update product' } });
  }
});

// DELETE /products/:id — delete a product
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }

    logger.info({ requestId: req.requestId, productId: req.params.id }, 'Product deleted');
    return res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ success: false, error: { code: 'FOREIGN_KEY', message: 'Cannot delete product with existing orders' } });
    }
    logger.error({ requestId: req.requestId, err, productId: req.params.id }, 'Failed to delete product');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to delete product' } });
  }
});

module.exports = { router };