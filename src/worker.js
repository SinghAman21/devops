const { initDatabase, closeDatabase } = require('./db');
const logger = require('./logger');
const { connectProducer, disconnectProducer } = require('./kafka');
const { startPaymentConsumer } = require('./events/consumers/payment.consumer');

let paymentConsumer;

async function start() {
  await initDatabase();
  await connectProducer();
  paymentConsumer = await startPaymentConsumer();
  logger.info('Worker started');
}

async function shutdown(signal) {
  logger.info({ signal }, 'Worker shutting down');

  if (paymentConsumer) {
    await paymentConsumer.disconnect();
  }

  await disconnectProducer();
  await closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
