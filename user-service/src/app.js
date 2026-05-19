'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { Pool } = require('pg');
const { createClient } = require('redis');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { createLogger, format, transports } = require('winston');
const client = require('prom-client');
const crypto = require('crypto');
require('dotenv').config();

// ── Logger ──────────────────────────────────────────────
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console(), new transports.File({ filename: 'logs/combined.log' })],
});

// ── Prometheus ──────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// ── PostgreSQL ──────────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'chatflow',
  user: process.env.DB_USER || 'chatflow_user',
  password: process.env.DB_PASSWORD || 'password',
  max: 10,
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
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

// ── S3 Client ───────────────────────────────────────────
const s3Config = { region: process.env.AWS_REGION || 'us-east-1' };
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}
const s3Client = new S3Client(s3Config);

const S3_BUCKET = process.env.S3_BUCKET_NAME || 'chatflow-avatars';

// ── JWT ─────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-at-least-64-chars';

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  try {
    req.user = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ── Multer (memory storage for S3 upload) ───────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ── Express App ─────────────────────────────────────────
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── Health ───────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
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

// ── User Routes ──────────────────────────────────────────

// GET /api/users/search
app.get('/api/users/search', authMiddleware, asyncHandler(async (req, res) => {
  const q = req.query.q?.trim();
  if (!q || q.length < 2) return res.status(400).json({ message: 'Search query too short' });

  const result = await pool.query(
    `SELECT id, username, avatar_url, bio, is_online
     FROM users
     WHERE username ILIKE $1
     LIMIT 20`,
    [`%${q}%`]
  );

  const users = result.rows.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatar_url,
    bio: u.bio,
    isOnline: u.is_online,
  }));

  res.json({ users });
}));

// GET /api/users/online
app.get('/api/users/online', authMiddleware, asyncHandler(async (req, res) => {
  const onlineIds = await redisClient.hKeys('online:users');
  if (!onlineIds.length) return res.json({ users: [] });

  const placeholders = onlineIds.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query(
    `SELECT id, username, avatar_url, bio FROM users WHERE id = ANY(ARRAY[${placeholders}]::uuid[])`,
    onlineIds
  );

  const users = result.rows.map((u) => ({
    id: u.id,
    username: u.username,
    avatarUrl: u.avatar_url,
    bio: u.bio,
    isOnline: true,
  }));

  res.json({ users });
}));

// GET /api/users/:id
app.get('/api/users/:id', authMiddleware, asyncHandler(async (req, res) => {
  const cacheKey = `user:profile:${req.params.id}`;
  const cached = await redisClient.get(cacheKey).catch(() => null);
  if (cached) return res.json({ user: JSON.parse(cached) });

  const result = await pool.query(
    'SELECT id, username, email, avatar_url, bio, is_online, created_at FROM users WHERE id = $1',
    [req.params.id]
  );

  if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

  const u = result.rows[0];
  const user = {
    id: u.id,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatar_url,
    bio: u.bio,
    isOnline: u.is_online,
    createdAt: u.created_at,
  };

  // Cache for 60 seconds
  await redisClient.setEx(cacheKey, 60, JSON.stringify(user)).catch(() => {});

  res.json({ user });
}));

// PUT /api/users/:id
app.put('/api/users/:id', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ message: 'Forbidden' });

  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional(),
    bio: Joi.string().max(200).optional().allow(''),
    avatarUrl: Joi.string().uri().optional().allow(''),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  if (value.username) {
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [value.username.toLowerCase(), req.params.id]
    );
    if (existing.rows.length > 0) return res.status(409).json({ message: 'Username already taken' });
  }

  const fields = [];
  const values = [];
  let idx = 1;

  if (value.username !== undefined) { fields.push(`username = $${idx++}`); values.push(value.username.toLowerCase()); }
  if (value.bio !== undefined) { fields.push(`bio = $${idx++}`); values.push(value.bio); }
  if (value.avatarUrl !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(value.avatarUrl); }
  fields.push(`updated_at = NOW()`);
  values.push(req.params.id);

  const result = await pool.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, username, email, avatar_url, bio, created_at`,
    values
  );

  const u = result.rows[0];
  const user = { id: u.id, username: u.username, email: u.email, avatarUrl: u.avatar_url, bio: u.bio, createdAt: u.created_at };

  // Invalidate cache
  await redisClient.del(`user:profile:${req.params.id}`).catch(() => {});

  logger.info('User profile updated', { userId: req.params.id });
  res.json({ user });
}));

// PUT /api/users/me/password
app.put('/api/users/me/password', authMiddleware, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ message: 'Both passwords required' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'New password must be at least 8 characters' });

  const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!result.rows.length) return res.status(404).json({ message: 'User not found' });

  const bcrypt = require('bcryptjs');
  const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!match) return res.status(401).json({ message: 'Current password is incorrect' });

  const hash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

  res.json({ message: 'Password updated successfully' });
}));

// POST /api/users/:id/avatar — upload to S3
app.post('/api/users/:id/avatar', authMiddleware, upload.single('avatar'), asyncHandler(async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json({ message: 'Forbidden' });
  if (!req.file) return res.status(400).json({ message: 'No file provided' });

  const ext = req.file.mimetype.split('/')[1] || 'jpg';
  const key = `avatars/${req.params.id}/${crypto.randomUUID()}.${ext}`;

  await s3Client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    ACL: 'public-read',
  }));

  const avatarUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`;

  await pool.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, req.params.id]);
  await redisClient.del(`user:profile:${req.params.id}`).catch(() => {});

  res.json({ avatarUrl });
}));

// POST /api/upload/presign  — generate a presigned URL for direct browser→S3 upload
app.post('/api/upload/presign', authMiddleware, asyncHandler(async (req, res) => {
  const { bucket = 'attachments', fileName, fileType } = req.body;
  if (!fileName || !fileType) return res.status(400).json({ message: 'fileName and fileType are required' });

  // Use a single media bucket with prefix paths, or multiple buckets depending on setup.
  // Here we use the S3_BUCKET as the main bucket, and use the 'bucket' param as a folder prefix.
  const ALLOWED_FOLDERS = ['avatars', 'attachments', 'voice-notes', 'thumbnails'];
  if (!ALLOWED_FOLDERS.includes(bucket)) return res.status(400).json({ message: 'Invalid folder' });

  try {
    const ext = fileName.split('.').pop().toLowerCase();
    const objectName = `${bucket}/${req.user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectName,
      ContentType: fileType,
      ACL: 'public-read',
    });

    // Generate presigned URL (PUT) valid for 15 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 });

    const fileUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${objectName}`;

    res.json({ uploadUrl, fileUrl, bucket: S3_BUCKET, objectName });
  } catch (err) {
    logger.error('S3 presign error', { err: err.message });
    res.status(500).json({ message: 'Failed to generate upload URL' });
  }
}));

// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  if (err.message === 'Only image files are allowed') return res.status(400).json({ message: err.message });
  res.status(500).json({ message: 'Internal server error' });
});

// ── Startup ──────────────────────────────────────────────
const PORT = parseInt(process.env.USER_SERVICE_PORT || '3003', 10);

async function start() {
  try {
    await redisClient.connect();
    await pool.connect();
    logger.info('User service dependencies connected');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`User service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  await redisClient.quit();
  await pool.end();
  process.exit(0);
});

start();
