const logger = require('../../logger');
const config = require('../../config');
const { createConsumer } = require('../../kafka');
const { EVENT_TYPES } = require('../schema');

async function startNotificationConsumer() {
  const consumer = createConsumer('notification');
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafka.topics.orderPayment, fromBeginning: false });
  await consumer.subscribe({ topic: config.kafka.topics.orderInventory, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const value = message.value?.toString();
      if (!value) return;

      const event = JSON.parse(value);
      const orderId = event.orderId;

      if (event.eventType === EVENT_TYPES.PAYMENT_FAILED) {
        logger.info({ topic, partition, orderId, status: 'PAYMENT_FAILED', reason: event.payload?.failureReason }, 'Notification worker: payment failed notification queued');
        return;
      }

      if (event.eventType === EVENT_TYPES.INVENTORY_FAILED) {
        logger.info({ topic, partition, orderId, status: 'INVENTORY_FAILED', reason: event.payload?.failureReason }, 'Notification worker: inventory failure notification queued');
        return;
      }

      if (event.eventType === EVENT_TYPES.INVENTORY_RESERVED) {
        logger.info({ topic, partition, orderId, status: 'CONFIRMED' }, 'Notification worker: order confirmation notification queued');
      }
    },
  });

  return consumer;
}

module.exports = { startNotificationConsumer };
