const { randomUUID } = require('crypto');
const { Router } = require('express');
const { z } = require('zod');
const { getDb } = require('./db');
const logger = require('./logger');
const validate = require('./middleware/validate');

const router = Router();

const createCustomerSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email('email must be valid'),
  phone: z.string().optional(),
  address: z.string().optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// POST /customers — create a new customer
router.post('/', validate(createCustomerSchema), async (req, res) => {
  const { name, email, phone, address } = req.body;
  const id = randomUUID();
  const now = new Date();

  try {
    const db = getDb();
    const result = await db.query(
      `INSERT INTO customers (id, name, email, phone, address, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, name, email, phone || null, address || null, now, now]
    );

    logger.info({ requestId: req.requestId, customerId: id }, 'Customer created');
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Customer with this email already exists' } });
    }
    logger.error({ requestId: req.requestId, err }, 'Failed to create customer');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create customer' } });
  }
});

// GET /customers — list all customers
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM customers ORDER BY created_at DESC, id DESC');
    return res.json({ success: true, data: result.rows, meta: { total: result.rowCount } });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to list customers');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list customers' } });
  }
});

// GET /customers/:id — fetch a single customer
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    logger.error({ requestId: req.requestId, err, customerId: req.params.id }, 'Failed to get customer');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get customer' } });
  }
});

// PATCH /customers/:id — update a customer
router.patch('/:id', validate(updateCustomerSchema), async (req, res) => {
  const fields = req.body;
  const now = new Date();

  try {
    const db = getDb();
    const existing = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`${key} = $${idx}`);
      values.push(value);
      idx++;
    }
    setClauses.push(`updated_at = $${idx}`);
    values.push(now);
    idx++;
    values.push(req.params.id);

    const result = await db.query(
      `UPDATE customers SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    logger.info({ requestId: req.requestId, customerId: req.params.id }, 'Customer updated');
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ success: false, error: { code: 'DUPLICATE', message: 'Customer with this email already exists' } });
    }
    logger.error({ requestId: req.requestId, err, customerId: req.params.id }, 'Failed to update customer');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to update customer' } });
  }
});

// DELETE /customers/:id — delete a customer
router.delete('/:id', async (req, res) => {
  try {
    const db = getDb();
    const result = await db.query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Customer not found' } });
    }

    logger.info({ requestId: req.requestId, customerId: req.params.id }, 'Customer deleted');
    return res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ success: false, error: { code: 'FOREIGN_KEY', message: 'Cannot delete customer with existing orders' } });
    }
    logger.error({ requestId: req.requestId, err, customerId: req.params.id }, 'Failed to delete customer');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to delete customer' } });
  }
});

module.exports = { router };