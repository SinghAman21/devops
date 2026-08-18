const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('./config');
const logger = require('./logger');

const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

let pool = null;

async function initDatabase() {
  pool = new Pool({
    connectionString: config.database.url,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'Unexpected database pool error');
  });

  const client = await pool.connect();
  try {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    await client.query(schema);
    logger.info('Database initialized');
  } finally {
    client.release();
  }

  return pool;
}

function getDb() {
  if (!pool) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return pool;
}

async function closeDatabase() {
  if (pool) {
    await pool.end();
    logger.info('Database pool closed');
  }
}

// Allow `pnpm run init-db` to initialize the database without starting the server.
if (require.main === module) {
  initDatabase()
    .then(() => {
      logger.info('Database initialized successfully');
      return closeDatabase();
    })
    .catch((err) => {
      logger.error({ err }, 'Failed to initialize database');
      process.exit(1);
    });
}

module.exports = { initDatabase, getDb, closeDatabase };
