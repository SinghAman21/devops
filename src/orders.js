const { randomUUID } = require('crypto');
const { Router } = require('express');
const { z } = require('zod');
const { getDb } = require('./db');
const logger = require('./logger');
const validate = require('./middleware/validate');

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

const createOrderSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z.number().int().positive('quantity must be a positive integer'),
  customerEmail: z.string().email('customerEmail must be a valid email'),
});

const updateStatusSchema = z.object({
  status: z.enum(ALLOWED_STATUSES, { error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` }),
});

// POST /orders — create a new order in PENDING status.
router.post('/', validate(createOrderSchema), (req, res) => {
  const { productId, quantity, customerEmail } = req.body;

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

    logger.info({ requestId: req.requestId, orderId: order.id }, 'Order created');
    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to create order');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to create order' } });
  }
});

// GET /orders — list all orders, newest first.
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id DESC').all();
    return res.json({ success: true, data: orders, meta: { total: orders.length } });
  } catch (err) {
    logger.error({ requestId: req.requestId, err }, 'Failed to list orders');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to list orders' } });
  }
});

// GET /orders/:id — fetch a single order.
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }
    return res.json({ success: true, data: order });
  } catch (err) {
    logger.error({ requestId: req.requestId, err, orderId: req.params.id }, 'Failed to get order');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to get order' } });
  }
});

// PATCH /orders/:id/status — manually set an order's status.
// Temporary endpoint for local simulation before Kafka workers take over.
router.patch('/:id/status', validate(updateStatusSchema), (req, res) => {
  const { status } = req.body;

  try {
    const db = getDb();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    const updated = new Date().toISOString();
    db.prepare('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?').run(status, updated, req.params.id);

    const result = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    logger.info({ requestId: req.requestId, orderId: req.params.id, status }, 'Order status updated');
    return res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ requestId: req.requestId, err, orderId: req.params.id }, 'Failed to update order status');
    return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Failed to update order status' } });
  }
});

module.exports = { router, ALLOWED_STATUSES };
