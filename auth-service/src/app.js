'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { createClient } = require('redis');
const Joi = require('joi');
const { createLogger, format, transports } = require('winston');
const client = require('prom-client');
require('dotenv').config();

// ── Logger ──────────────────────────────────────────────
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ── Prometheus ──────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'auth_http_requests_total',
  help: 'Total HTTP requests to auth-service',
  labelNames: ['method', 'route', 'status'],
  registers: [register],
});

const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

// ── PostgreSQL ──────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'chatflow',
  user: process.env.DB_USER || 'chatflow_user',
  password: process.env.DB_PASSWORD || 'password',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// ── Redis ───────────────────────────────────────────────
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error', (err) => logger.error('Redis error', { err: err.message }));

// ── DB Schema ───────────────────────────────────────────
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(30) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      is_online BOOLEAN DEFAULT false,
      two_factor_secret TEXT,
      two_factor_secret_verified BOOLEAN DEFAULT false,
      two_factor_enabled BOOLEAN DEFAULT false,
      backup_codes TEXT[],
      public_key TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
  logger.info('Database schema initialised');
}

// ── JWT Helpers ─────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-at-least-64-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-at-least-64-chars';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function signRefresh(payload) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRY });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}

// ── Validation Schemas ──────────────────────────────────
const registerSchema = Joi.object({
  fullName: Joi.string().min(2).max(60).required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  avatarEmoji: Joi.string().max(10).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ── Express App ─────────────────────────────────────────
const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// Request timing middleware
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    end();
  });
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts. Please wait 15 minutes.' },
});

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use(limiter);

// ── Error handler middleware ─────────────────────────────
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── Health endpoints ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.get('/ready', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  await redisClient.ping();
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
}));

app.get('/metrics', asyncHandler(async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}));

// ── Auth Routes ──────────────────────────────────────────

// POST /auth/register
app.post('/auth/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { fullName, username, email, password, avatarEmoji } = value;

  // Check duplicates
  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email.toLowerCase(), username.toLowerCase()]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Email or username already in use' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, bio)
     VALUES ($1, $2, $3, $4)
     RETURNING id, username, email, avatar_url, bio, created_at`,
    [username.toLowerCase(), email.toLowerCase(), passwordHash, '']
  );

  const user = result.rows[0];
  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    createdAt: user.created_at,
  };

  const token = signToken({ id: user.id, username: user.username, email: user.email });
  const refreshToken = signRefresh({ id: user.id });

  // Store refresh token in Redis (TTL: 7 days)
  await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

  logger.info('User registered', { userId: user.id, username: user.username });

  return res.status(201).json({ user: userData, token, refreshToken });
}));

// POST /auth/login
app.post('/auth/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  const { email, password } = value;

  const result = await pool.query(
    'SELECT id, username, email, password_hash, avatar_url, bio, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const user = result.rows[0];
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // Mark online
  await pool.query('UPDATE users SET is_online = true, updated_at = NOW() WHERE id = $1', [user.id]);

  const userData = {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatar_url,
    bio: user.bio,
    createdAt: user.created_at,
  };

  const token = signToken({ id: user.id, username: user.username, email: user.email });
  const refreshToken = signRefresh({ id: user.id });

  await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, refreshToken);

  logger.info('User logged in', { userId: user.id });

  return res.json({ user: userData, token, refreshToken });
}));

// POST /auth/logout
app.post('/auth/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = verifyRefresh(refreshToken);
      await redisClient.del(`refresh:${decoded.id}`);
      await pool.query('UPDATE users SET is_online = false, updated_at = NOW() WHERE id = $1', [decoded.id]);
    } catch {
      // Token invalid — still OK to logout
    }
  }
  return res.json({ message: 'Logged out successfully' });
}));

// POST /auth/refresh
app.post('/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' });
  }

  let decoded;
  try {
    decoded = verifyRefresh(refreshToken);
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token' });
  }

  const stored = await redisClient.get(`refresh:${decoded.id}`);
  if (!stored || stored !== refreshToken) {
    return res.status(401).json({ message: 'Refresh token revoked' });
  }

  const result = await pool.query(
    'SELECT id, username, email FROM users WHERE id = $1',
    [decoded.id]
  );
  if (result.rows.length === 0) {
    return res.status(401).json({ message: 'User not found' });
  }

  const user = result.rows[0];
  const newToken = signToken({ id: user.id, username: user.username, email: user.email });
  const newRefreshToken = signRefresh({ id: user.id });

  await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, newRefreshToken);

  return res.json({ token: newToken, refreshToken: newRefreshToken });
}));

// GET /auth/verify — used by other services as a middleware proxy check
app.get('/auth/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    return res.json({ valid: true, user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}));

// ── 2FA Endpoints ────────────────────────────────────────

// POST /auth/2fa/setup — generate secret + QR code
app.post('/auth/2fa/setup', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  let user;
  try { user = verifyToken(authHeader.slice(7)); } catch { return res.status(401).json({ message: 'Invalid token' }); }

  try {
    const { authenticator } = require('otplib');
    const QRCode = require('qrcode');

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, process.env.TOTP_ISSUER || 'ChatFlow', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Store unverified secret
    await pool.query('UPDATE users SET two_factor_secret = $1, two_factor_secret_verified = false WHERE id = $2', [secret, user.id]);

    // Generate backup codes
    const crypto = require('crypto');
    const backupCodes = Array.from({ length: 10 }, () =>
      `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(2).toString('hex')}`
    );

    return res.json({ secret, qrCodeDataUrl, backupCodes });
  } catch (err) {
    logger.error('2FA setup error', { err: err.message });
    return res.status(500).json({ message: '2FA setup failed — ensure otplib and qrcode are installed' });
  }
}));

// POST /auth/2fa/verify — confirm TOTP code and enable 2FA
app.post('/auth/2fa/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  let user;
  try { user = verifyToken(authHeader.slice(7)); } catch { return res.status(401).json({ message: 'Invalid token' }); }

  const { token: totpToken } = req.body;
  if (!totpToken) return res.status(400).json({ message: 'TOTP token required' });

  try {
    const { authenticator } = require('otplib');
    const bcrypt = require('bcryptjs');

    const result = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [user.id]);
    if (!result.rows[0]?.two_factor_secret) return res.status(400).json({ message: '2FA not set up yet' });

    const isValid = authenticator.check(totpToken, result.rows[0].two_factor_secret);
    if (!isValid) return res.status(400).json({ message: 'Invalid TOTP code' });

    await pool.query(
      'UPDATE users SET two_factor_enabled = true, two_factor_secret_verified = true WHERE id = $1',
      [user.id]
    );

    return res.json({ success: true });
  } catch (err) {
    logger.error('2FA verify error', { err: err.message });
    return res.status(500).json({ message: '2FA verification failed' });
  }
}));

// POST /auth/2fa/disable
app.post('/auth/2fa/disable', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  let user;
  try { user = verifyToken(authHeader.slice(7)); } catch { return res.status(401).json({ message: 'Invalid token' }); }

  await pool.query('UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [user.id]);
  return res.json({ success: true });
}));

// ── E2EE Public Key Endpoints ─────────────────────────────

// GET /api/keys/:userId — get a user's public key
app.get('/api/keys/:userId', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT public_key FROM users WHERE id = $1', [req.params.userId]);
  if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
  return res.json({ publicKey: result.rows[0].public_key || null });
}));

// POST /api/keys — store caller's public key
app.post('/api/keys', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  let user;
  try { user = verifyToken(authHeader.slice(7)); } catch { return res.status(401).json({ message: 'Invalid token' }); }

  const { publicKey } = req.body;
  if (!publicKey) return res.status(400).json({ message: 'publicKey required' });

  await pool.query('UPDATE users SET public_key = $1 WHERE id = $2', [publicKey, user.id]);
  return res.json({ success: true });
}));

// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ message: 'Internal server error' });
});

// ── Startup ──────────────────────────────────────────────
const PORT = parseInt(process.env.AUTH_SERVICE_PORT || '3001', 10);

async function start() {
  try {
    await redisClient.connect();
    logger.info('Redis connected');

    await pool.connect();
    logger.info('PostgreSQL connected');

    await initDb();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Auth service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

start();
