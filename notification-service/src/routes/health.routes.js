const express = require('express');
const redisClient = require('../config/redis');
const { register } = require('../config/prometheus');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

router.get('/ready', asyncHandler(async (req, res) => {
  await redisClient.ping();
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
}));

router.get('/metrics', asyncHandler(async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}));

module.exports = router;
