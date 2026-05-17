const Redis = require('ioredis');
const logger = require('./logger');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
};

const redisClient = new Redis(redisConfig);
redisClient.on('error', (err) => logger.error('Redis error', { err: err.message }));

module.exports = redisClient;
