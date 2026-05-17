const redisClient = require('../config/redis');

exports.getStatus = async (req, res) => {
  const raw = await redisClient.hget('online:users', req.params.userId);
  const lastSeenRaw = await redisClient.get(`user:${req.params.userId}:lastSeen`);

  let isOnline = false;
  let status = 'offline';

  if (raw) {
    isOnline = true;
    try {
      const parsed = JSON.parse(raw);
      status = parsed.status || 'online';
    } catch {
      status = 'online';
    }
  }

  const lastSeen = lastSeenRaw ? new Date(parseInt(lastSeenRaw, 10)).toISOString() : null;

  res.json({ userId: req.params.userId, isOnline, status, lastSeen });
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body;
  const allowed = ['online', 'away', 'offline'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Invalid status' });

  await redisClient.hset('online:users', req.user.id, JSON.stringify({ timestamp: Date.now(), status }));
  
  const io = req.app.get('io');
  if (io) {
    io.emit('user:status-changed', { userId: req.user.id, status });
  }

  res.json({ userId: req.user.id, status });
};

exports.getOnlineUsers = async (req, res) => {
  const onlineData = await redisClient.hgetall('online:users');
  const onlineIds = Object.keys(onlineData || {});
  res.json({ onlineIds, count: onlineIds.length });
};
