const logger = require('../logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';

  logger.error(
    { requestId: req.requestId, err, url: req.url, method: req.method },
    err.message
  );

  res.status(status).json({
    success: false,
    error: {
      code,
      message: status === 500 ? 'Internal server error' : err.message,
    },
  });
}

module.exports = errorHandler;
