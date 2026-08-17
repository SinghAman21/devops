const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./logger');
const { initDatabase, getDb } = require('./db');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const { router: ordersRouter } = require('./orders');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  })
);

// Middleware
app.use(requestId);
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health checks for K8s
app.get('/healthz', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.get('/readyz', (_req, res) => {
  try {
    getDb().prepare('SELECT 1').get();
    res.json({ success: true, data: { status: 'ready' } });
  } catch {
    res.status(503).json({ success: false, error: { code: 'NOT_READY', message: 'Database unavailable' } });
  }
});

// Routes
app.use('/orders', ordersRouter);

// 404 for unknown API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler
app.use(errorHandler);

// Initialize DB and start server
initDatabase();

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
});

// Graceful shutdown for K8s SIGTERM
function shutdown(signal) {
  logger.info({ signal }, 'Received signal, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
