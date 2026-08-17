const { randomUUID } = require('crypto');
const { Router } = require('express');
const { getDb } = require('./db');

const router = Router();

const ALLOWED_STATUSES = [
  'PENDING',
  'PAYMENT_COMPLETED',
  'PAYMENT_FAILED',
  'INVENTORY_RESERVED',
  'INVENTORY_FAILED',
  'CONFIRMED',
  'FAILED',
];

// POST /orders — create a new order in PENDING status.
router.post('/', (req, res) => {
  const { productId, quantity, customerEmail } = req.body || {};

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'productId is required and must be a string' });
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ error: 'quantity must be an integer greater than 0' });
  }

  if (!customerEmail || typeof customerEmail !== 'string' || !customerEmail.includes('@')) {
    return res.status(400).json({ error: 'customerEmail must be a valid email address' });
  }

  const now = new Date().toISOString();
  const order = {
    id: randomUUID(),
    product_id: productId,
    quantity,
    customer_email: customerEmail,
    status: 'PENDING',
    failure_reason: null,
    created_at: now,
    updated_at: now,
  };

  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO orders (id, product_id, quantity, customer_email, status, failure_reason, created_at, updated_at)
       VALUES (@id, @product_id, @quantity, @customer_email, @status, @failure_reason, @created_at, @updated_at)`
    ).run(order);
    return res.status(201).json(order);
  } catch (err) {
    console.error('Failed to create order:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

// GET /orders — list all orders, newest first.
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC').all();
    return res.json(orders);
  } catch (err) {
    console.error('Failed to list orders:', err);
    return res.status(500).json({ error: 'Failed to list orders' });
  }
});

// GET /orders/:id — fetch a single order.
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json(order);
  } catch (err) {
    console.error('Failed to get order:', err);
    return res.status(500).json({ error: 'Failed to get order' });
  }
});

// PATCH /orders/:id/status — manually set an order's status.
// Temporary endpoint for local simulation before Kafka workers take over.
router.patch('/:id/status', (req, res) => {
  const { status } = req.body || {};

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }

  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updated = new Date().toISOString();
    db.prepare(
      `UPDATE orders SET status = ?, updated_at = ? WHERE id = ?`
    ).run(status, updated, req.params.id);

    const result = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    return res.json(result);
  } catch (err) {
    console.error('Failed to update order status:', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = { router, ALLOWED_STATUSES };
