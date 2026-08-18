const path = require('path');
const express = require('express');
const logger = require('./logger');

const app = express();
const port = parseInt(process.env.FRONTEND_PORT, 10) || 3000;
const publicDir = path.join(__dirname, '..', 'public');

app.use(express.static(publicDir));

app.listen(port, () => {
  logger.info({ port }, 'Frontend started');
});
