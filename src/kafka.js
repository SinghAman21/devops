const { Kafka, logLevel } = require('kafkajs');
const config = require('./config');
const logger = require('./logger');

const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
  logLevel: logLevel.NOTHING,
});

const producer = kafka.producer();
let producerConnected = false;
let producerConnecting = null;

async function connectProducer() {
  if (producerConnected) return true;
  if (producerConnecting) return producerConnecting;

  producerConnecting = producer.connect()
    .then(() => {
      producerConnected = true;
      logger.info({ brokers: config.kafka.brokers }, 'Kafka producer connected');
      return true;
    })
    .catch((err) => {
      producerConnected = false;
      throw err;
    })
    .finally(() => {
      producerConnecting = null;
    });

  return producerConnecting;
}

async function disconnectProducer() {
  if (!producerConnected) return;
  await producer.disconnect();
  producerConnected = false;
  logger.info('Kafka producer disconnected');
}

function isProducerConnected() {
  return producerConnected;
}

async function produce(topic, event) {
  if (!producerConnected) {
    await connectProducer();
  }

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
  isProducerConnected,
  produce,
  createConsumer,
};
