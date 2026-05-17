'use strict';

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');
const redisClient = require('./config/redis');
const setupSockets = require('./sockets/presence.socket');
const errorHandler = require('./middlewares/error.middleware');

const healthRoutes = require('./routes/health.routes');
const notificationRoutes = require('./routes/notification.routes');

// ── Express App ─────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT'] }));
app.use(express.json({ limit: '256kb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300 });
app.use(limiter);

// ── Socket.io ───────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});
app.set('io', io); // make it accessible to express req.app.get('io')
setupSockets(io);

// ── Routes ──────────────────────────────────────────────
app.use('/', healthRoutes);
app.use('/api/notify', notificationRoutes);

// ── Global Error Handler ─────────────────────────────────
app.use(errorHandler);

// ── Startup ──────────────────────────────────────────────
const PORT = parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3004', 10);

async function start() {
  try {
    // ioredis with lazyConnect: true requires explicit .connect() call
    await redisClient.connect();
    logger.info('Redis connected for notification service');

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Notification service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  try {
    await redisClient.quit();
  } catch {
    // ignore
  }
  process.exit(0);
});

if (require.main === module) {
  start();
}

module.exports = server;
