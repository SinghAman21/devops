const path = require('path');
const express = require('express');
const { initDatabase } = require('./db');
const { router: ordersRouter } = require('./orders');

const app = express();
const PORT = process.env.PORT || 3000;

// Create/verify the SQLite database on startup.
initDatabase();

// Parse incoming JSON request bodies.
app.use(express.json());

// Serve the frontend from the public/ directory.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check.
app.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// Order routes.
app.use('/orders', ordersRouter);

// Catch-all 404 for unknown API routes.
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Mini Order System running at http://localhost:${PORT}`);
});
