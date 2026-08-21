const { Kafka, logLevel } = require('kafkajs');
const config = require('./config');
const logger = require('./logger');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.NOTHING,
});

const producer = kafka.producer();

async function connectProducer() {
  await producer.connect();
  logger.info({ brokers: config.kafka.brokers }, 'Kafka producer connected');
}

async function disconnectProducer() {
  await producer.disconnect();
  logger.info('Kafka producer disconnected');
}

async function produce(topic, event) {
  await producer.send({
    topic,
    messages: [
      {
        key: event.orderId,
        value: JSON.stringify(event),
      },
    ],
  });

  logger.info(
    {
      topic,
      eventType: event.eventType,
      orderId: event.orderId,
      eventId: event.eventId,
    },
    'Kafka event produced'
  );
}

function createConsumer(groupIdSuffix) {
  return kafka.consumer({
    groupId: `${config.kafka.groupId}-${groupIdSuffix}`,
  });
}

module.exports = {
  connectProducer,
  disconnectProducer,
  produce,
  createConsumer,
};
