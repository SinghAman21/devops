const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, '..', 'orders.db');
const SCHEMA_PATH = path.join(__dirname, '..', 'schema.sql');

let db = null;

// Opens the SQLite database (creating the file if needed) and
// applies schema.sql so tables always exist before we use them.
function initDatabase() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db = new Database(DB_PATH);
  db.exec(schema);
  return db;
}

// Returns the shared database connection, initializing it on first use.
function getDb() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

// Allow `npm run init-db` to initialize the database without starting the server.
if (require.main === module) {
  const database = initDatabase();
  console.log(`Database initialized at ${DB_PATH}`);
  database.close();
}

module.exports = { initDatabase, getDb, DB_PATH };
