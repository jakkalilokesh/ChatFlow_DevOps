const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(500).json({ message: 'Internal server error' });
}

module.exports = errorHandler;
