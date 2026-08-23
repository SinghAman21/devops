const { initDatabase, getDb, closeDatabase } = require('./db');
const logger = require('./logger');

const users = [
  [1, 'Aman Singh', 2500.00],
  [2, 'Priya Sharma', 1200.00],
  [3, 'Rahul Verma', 750.00],
  [4, 'Neha Kapoor', 5000.00],
  [5, 'Vikram Patel', 300.00],
];

const inventory = [
  [1, 'Mechanical Keyboard', 25, 89.99],
  [2, 'Wireless Mouse', 40, 34.50],
  [3, 'USB-C Monitor', 12, 299.99],
  [4, 'Laptop Stand', 30, 49.99],
  [5, 'Noise Cancelling Headphones', 18, 149.00],
];

async function seed() {
  await initDatabase();
  const db = getDb();
  try {
    await db.query('BEGIN');

    for (const [id, name, balance] of users) {
      await db.query(
        `INSERT INTO users (id, name, balance)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [id, name, balance]
      );
    }

    for (const [id, name, quantity, cost] of inventory) {
      await db.query(
        `INSERT INTO inventory (inventory_id, name, quantity, cost)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (inventory_id) DO NOTHING`,
        [id, name, quantity, cost]
      );
    }

    await db.query("SELECT setval('users_id_seq', GREATEST((SELECT COALESCE(MAX(id), 1) FROM users), 1), true)");
    await db.query("SELECT setval('inventory_inventory_id_seq', GREATEST((SELECT COALESCE(MAX(inventory_id), 1) FROM inventory), 1), true)");
    await db.query('COMMIT');
    logger.info({ users: users.length, inventory: inventory.length }, 'Seed data loaded');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    await closeDatabase();
  }
}

seed().catch((err) => {
  logger.error({ err }, 'Failed to load seed data');
  process.exit(1);
});
