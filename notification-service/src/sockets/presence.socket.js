const { verifyToken } = require('../middlewares/auth.middleware');
const logger = require('../config/logger');
const redisClient = require('../config/redis');
const { presenceEvents } = require('../config/prometheus');

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Auth required'));
    try {
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { id: userId, username } = socket.user;
    logger.info('Presence connected', { userId });

    await redisClient.hset('online:users', userId, Date.now());
    await redisClient.set(`user:${userId}:lastSeen`, Date.now());
    presenceEvents.inc({ status: 'online' });

    socket.broadcast.emit('user:online', { userId, username });

    socket.on('update-status', async ({ status }) => {
      const allowed = ['online', 'away', 'offline'];
      if (!allowed.includes(status)) return;
      await redisClient.hset('online:users', userId, JSON.stringify({ timestamp: Date.now(), status }));
      io.emit('user:status-changed', { userId, status });
    });

    socket.on('disconnect', async () => {
      await redisClient.hdel('online:users', userId);
      await redisClient.set(`user:${userId}:lastSeen`, Date.now());
      presenceEvents.inc({ status: 'offline' });
      socket.broadcast.emit('user:offline', { userId, username });
      logger.info('Presence disconnected', { userId });
    });
  });
};
