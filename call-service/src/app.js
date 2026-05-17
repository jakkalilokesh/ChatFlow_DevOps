'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Redis = require('ioredis');
const { createLogger, format, transports } = require('winston');
const client = require('prom-client');
const { createWorkers } = require('./mediasoup/worker');
const { registerCallEvents } = require('./socket/callEvents');
const roomManager = require('./rooms/RoomManager');
require('dotenv').config();

// ── Logger ────────────────────────────────────────────────
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});

// ── Prometheus ────────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const activeCallsGauge = new client.Gauge({
  name: 'call_service_active_calls',
  help: 'Number of active call rooms',
  registers: [register],
});

const activeParticipantsGauge = new client.Gauge({
  name: 'call_service_active_participants',
  help: 'Total participants in all calls',
  registers: [register],
});

// ── Redis ─────────────────────────────────────────────────
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => Math.min(times * 100, 3000),
});

// ── JWT ───────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-at-least-64-chars';

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Express App ───────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// ── Socket.io ─────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Socket auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    socket.user = verifyToken(token);
    next();
  } catch {
    next(new Error('Invalid authentication token'));
  }
});

// Socket connections
io.on('connection', (socket) => {
  logger.info('Call socket connected', { userId: socket.user.id, socketId: socket.id });
  registerCallEvents(io, socket, socket.user, logger);
});

// ── REST Endpoints ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'call-service', timestamp: new Date().toISOString() });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

app.get('/metrics', async (req, res) => {
  // Update gauges
  const stats = roomManager.getStats();
  activeCallsGauge.set(stats.length);
  activeParticipantsGauge.set(stats.reduce((sum, r) => sum + r.peerCount, 0));
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/api/calls/rooms', (req, res) => {
  res.json({ rooms: roomManager.getStats() });
});

// ── Startup ───────────────────────────────────────────────
const PORT = parseInt(process.env.CALL_SERVICE_PORT || '3005', 10);

async function start() {
  try {
    logger.info('Starting call-service...');
    await createWorkers();
    logger.info('mediasoup workers ready');

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Call service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  server.close(() => process.exit(0));
});

start();
