const logger = require('../../logger');
const config = require('../../config');
const { createConsumer } = require('../../kafka');
const { EVENT_TYPES } = require('../schema');
const { broadcast } = require('../../ws');

function toDashboardEvent(event) {
  if (event.eventType === EVENT_TYPES.PAYMENT_COMPLETED) {
    return { type: 'order_event', stage: 'payment', orderId: event.orderId, status: 'PAYMENT_COMPLETED', timestamp: Date.now() };
  }
  if (event.eventType === EVENT_TYPES.PAYMENT_FAILED) {
    return { type: 'order_event', stage: 'payment', orderId: event.orderId, status: 'PAYMENT_FAILED', timestamp: Date.now() };
  }
  if (event.eventType === EVENT_TYPES.INVENTORY_FAILED) {
    return { type: 'order_event', stage: 'inventory', orderId: event.orderId, status: 'INVENTORY_FAILED', timestamp: Date.now() };
  }
  if (event.eventType === EVENT_TYPES.INVENTORY_RESERVED) {
    return { type: 'order_event', stage: 'confirmed', orderId: event.orderId, status: 'CONFIRMED', timestamp: Date.now() };
  }
  return null;
}

async function startDashboardConsumer() {
  const consumer = createConsumer('dashboard-live');
  await consumer.connect();
  await consumer.subscribe({ topic: config.kafka.topics.orderPayment, fromBeginning: false });
  await consumer.subscribe({ topic: config.kafka.topics.orderInventory, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const value = message.value?.toString();
      if (!value) return;

      try {
        const event = JSON.parse(value);
        const dashboardEvent = toDashboardEvent(event);
        if (dashboardEvent) broadcast(dashboardEvent);
      } catch (err) {
        logger.error({ err }, 'Dashboard consumer failed to parse Kafka event');
      }
    },
  });

  return consumer;
}

module.exports = { startDashboardConsumer };
