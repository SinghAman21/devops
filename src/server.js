const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./logger');
const { initDatabase, getDb, closeDatabase } = require('./db');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const { router: ordersRouter } = require('./orders');
const { router: usersRouter } = require('./users');
const { router: inventoryRouter } = require('./inventory');
const { connectProducer, disconnectProducer } = require('./kafka');
const { initWss, broadcast, closeWss } = require('./ws');
const { getInfraSnapshot } = require('./infra');

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


// Health checks for K8s
app.get('/healthz', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.get('/readyz', async (_req, res) => {
  try {
    await getDb().query('SELECT 1');
    res.json({ success: true, data: { status: 'ready' } });
  } catch {
    res.status(503).json({ success: false, error: { code: 'NOT_READY', message: 'Database unavailable' } });
  }
});

// Routes
app.use('/orders', ordersRouter);
app.use('/users', usersRouter);
app.use('/inventory', inventoryRouter);

// 404 for unknown backend routes
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Error handler
app.use(errorHandler);

// Graceful shutdown for K8s SIGTERM
async function shutdown(signal) {
  logger.info({ signal }, 'Received signal, shutting down gracefully');
  server.close(async () => {
    closeWss();
    await disconnectProducer();
    await closeDatabase();
    logger.info('HTTP server closed');
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Initialize DB and start server
let server;

initDatabase()
  .then(async () => {
    await connectProducer();
    server = app.listen(config.port, () => {
      initWss(server);
      logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
    });
    setInterval(async () => {
      try {
        const snapshot = await getInfraSnapshot();
        broadcast({ type: 'infra', data: snapshot });
      } catch (err) {
        logger.error({ err }, 'Failed to broadcast infra snapshot');
      }
    }, 5000);
  })
  .catch((err) => {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  });
