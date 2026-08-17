const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    path: process.env.DATABASE_PATH || './orders.db',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topic: process.env.KAFKA_TOPIC || 'orders',
    groupId: process.env.KAFKA_GROUP_ID || 'order-service',
  },
};

module.exports = config;
