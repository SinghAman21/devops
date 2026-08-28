const { initDatabase, closeDatabase } = require('./db');
const logger = require('./logger');
const { ensureTopics } = require('./kafka');
const { startNotificationConsumer } = require('./events/consumers/notification.consumer');

let consumer;

async function start() {
  await initDatabase();
  await ensureTopics();
  consumer = await startNotificationConsumer();
  logger.info('Notification worker started');
}

async function shutdown(signal) {
  logger.info({ signal }, 'Notification worker shutting down');
  if (consumer) await consumer.disconnect();
  await closeDatabase();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((err) => {
  logger.error({ err }, 'Notification worker failed to start');
  process.exit(1);
});
