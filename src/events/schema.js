
const EVENT_TYPES = {
  ORDER_CREATED: 'ORDER_CREATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  INVENTORY_RESERVED: 'INVENTORY_RESERVED',
  INVENTORY_FAILED: 'INVENTORY_FAILED',
};

function createEvent(eventType, orderId, payload) {
  return {
    eventId: `${orderId}-${Date.now()}`,
    eventType,
    orderId,
    payload,
    timestamp: new Date().toISOString(),
  };
}

module.exports = {
  EVENT_TYPES,
  createEvent,
};
