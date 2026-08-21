const config = {
  port: parseInt(process.env.PORT, 10) || 8000,
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/mini_order',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    topic: process.env.KAFKA_TOPIC || 'orders',
    groupId: process.env.KAFKA_GROUP_ID || 'order-service',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'mini-order-system',
    groupId: process.env.KAFKA_GROUP_ID || 'order-workflow',
    topics: {
      orderCreated: 'orders.created',
      orderPayment: 'orders.payment',
      orderInventory: 'orders.inventory',
    },
  },
};

module.exports = config;
