'use strict';

const express        = require('express');
const helmet         = require('helmet');
const cors           = require('cors');
const rateLimit      = require('express-rate-limit');
const bcrypt         = require('bcryptjs');
const crypto         = require('crypto');
const Joi            = require('joi');
const client         = require('prom-client');
const passport       = require('passport');
require('dotenv').config();

const logger                 = require('./utils/logger');
const { pool, connectWithRetry, runMigrations } = require('./db/postgres');
const { signToken, signRefresh, verifyToken, verifyRefresh } = require('./utils/tokens');
const { sendEmail }          = require('./services/email.service');
const { createClient }       = require('redis');
const oauthRouter            = require('./routes/oauth.routes');

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

// ── Redis ────────────────────────────────────────────────
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    reconnectStrategy: (retries) => {
      if (retries > 20) return new Error('Redis max retries exceeded');
      return Math.min(retries * 100, 3000);
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
});

redisClient.on('error',        (err) => logger.error('Redis error', { err: err.message }));
redisClient.on('connect',      ()    => logger.info('✅ Redis connected'));
redisClient.on('reconnecting', ()    => logger.warn('Redis reconnecting...'));

// ── CORS ─────────────────────────────────────────────────
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || '*').split(',');
    if (!origin || allowed.includes('*') || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge:         86400,
};

// ── Express App ──────────────────────────────────────────
const app = express();

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

// ── Metrics middleware ───────────────────────────────────
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer({ method: req.method, route: req.path });
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, route: req.path, status: res.statusCode });
    end();
  });
  next();
});

// ── Rate Limiters ────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: 'Too many auth attempts. Please wait 15 minutes.' },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 3,
  message: { error: 'Too many email requests. Please wait an hour.' },
});

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Health check routes (above rate limiters)
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() })
);

app.get('/ready', asyncHandler(async (req, res) => {
  await pool.query('SELECT 1');
  await redisClient.ping();
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
}));

app.get('/metrics', asyncHandler(async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}));

app.use(globalLimiter);
app.use('/auth/login',               authLimiter);
app.use('/auth/register',            authLimiter);
app.use('/auth/forgot-password',     emailLimiter);
app.use('/auth/resend-verification', emailLimiter);

// ── Validation Schemas ───────────────────────────────────
const registerSchema = Joi.object({
  fullName:    Joi.string().min(2).max(60).required(),
  username:    Joi.string().alphanum().min(3).max(30).required(),
  email:       Joi.string().email().required(),
  password:    Joi.string().min(8).max(128).required(),
  avatarEmoji: Joi.string().max(10).optional(),
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
  rememberMe: Joi.boolean().optional(),
});

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}



// ── OAuth Routes ─────────────────────────────────────────
app.use('/auth', oauthRouter);

// ── POST /auth/register ──────────────────────────────────
app.post('/auth/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { fullName, username, email, password } = value;

  const existing = await pool.query(
    'SELECT id FROM users WHERE email = $1 OR username = $2',
    [email.toLowerCase(), username.toLowerCase()]
  );
  if (existing.rows.length > 0) {
    return res.status(409).json({ message: 'Email or username already in use' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const result = await pool.query(
    `INSERT INTO users (username, email, full_name, password_hash, bio)
     VALUES ($1, $2, $3, $4, '')
     RETURNING id, username, email, full_name, avatar_url, bio, created_at`,
    [username.toLowerCase(), email.toLowerCase(), fullName, passwordHash]
  );

  const user  = result.rows[0];
  const token = signToken({ id: user.id, username: user.username, email: user.email });
  const rt    = signRefresh({ id: user.id });

  await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, rt);

  // Send verification email (non-blocking)
  if (process.env.SMTP_USER) {
    const verToken = generateToken();
    const verHash  = hashToken(verToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, verHash, expiresAt]
    );
    const verLink = `${process.env.API_URL || 'http://localhost:80'}/auth/verify-email/${verToken}`;
    sendEmail(user.email, 'verification', [user.username, verLink]).catch(
      (err) => logger.warn('Verification email failed (non-blocking)', { err: err.message })
    );
  }

  logger.info('User registered', { userId: user.id, username: user.username });

  return res.status(201).json({
    user: {
      id: user.id, username: user.username, email: user.email,
      fullName: user.full_name, avatarUrl: user.avatar_url, bio: user.bio,
    },
    token,
    refreshToken: rt,
  });
}));

// ── POST /auth/login ─────────────────────────────────────
app.post('/auth/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const { email, password } = value;

  const result = await pool.query(
    'SELECT id, username, email, full_name, password_hash, avatar_url, bio, is_banned, created_at FROM users WHERE email = $1',
    [email.toLowerCase()]
  );
  if (result.rows.length === 0) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  const user = result.rows[0];
  if (user.is_banned) return res.status(403).json({ message: 'Account suspended' });
  if (!user.password_hash) return res.status(400).json({ message: 'Please use OAuth to sign in' });

  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) return res.status(401).json({ message: 'Invalid email or password' });

  await pool.query('UPDATE users SET is_online = true, updated_at = NOW() WHERE id = $1', [user.id]);

  const token = signToken({ id: user.id, username: user.username, email: user.email });
  const rt    = signRefresh({ id: user.id });

  await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, rt);

  logger.info('User logged in', { userId: user.id });

  return res.json({
    user: {
      id: user.id, username: user.username, email: user.email,
      fullName: user.full_name, avatarUrl: user.avatar_url, bio: user.bio,
      createdAt: user.created_at,
    },
    token,
    refreshToken: rt,
  });
}));

// ── POST /auth/logout ────────────────────────────────────
app.post('/auth/logout', asyncHandler(async (req, res) => {
  const { refreshToken: rt } = req.body;
  if (rt) {
    try {
      const decoded = verifyRefresh(rt);
      await redisClient.del(`refresh:${decoded.id}`);
      await pool.query('UPDATE users SET is_online = false, updated_at = NOW() WHERE id = $1', [decoded.id]);
    } catch { /* silent */ }
  }
  return res.json({ message: 'Logged out successfully' });
}));

// ── POST /auth/refresh ───────────────────────────────────
app.post('/auth/refresh', asyncHandler(async (req, res) => {
  const { refreshToken: rt } = req.body;
  if (!rt) return res.status(401).json({ message: 'Refresh token required' });

  let decoded;
  try { decoded = verifyRefresh(rt); }
  catch { return res.status(401).json({ message: 'Invalid or expired refresh token' }); }

  const stored = await redisClient.get(`refresh:${decoded.id}`);
  if (!stored || stored !== rt) return res.status(401).json({ message: 'Refresh token revoked' });

  const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [decoded.id]);
  if (!result.rows[0]) return res.status(401).json({ message: 'User not found' });

  const user    = result.rows[0];
  const newToken = signToken({ id: user.id, username: user.username, email: user.email });
  const newRt    = signRefresh({ id: user.id });

  await redisClient.setEx(`refresh:${user.id}`, 7 * 24 * 60 * 60, newRt);

  return res.json({ token: newToken, refreshToken: newRt });
}));

// ── GET /auth/verify ──────────────────────────────────────
app.get('/auth/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
  const token = authHeader.slice(7);
  try {
    const decoded = verifyToken(token);
    return res.json({ valid: true, user: decoded });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}));

// ── POST /auth/forgot-password ───────────────────────────
app.post('/auth/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const result = await pool.query('SELECT id, username FROM users WHERE email = $1', [email.toLowerCase()]);

  // Always return 200 to prevent email enumeration
  if (result.rows.length === 0) {
    return res.json({ message: 'If that email exists, a reset link has been sent.' });
  }

  const user  = result.rows[0];
  const token = generateToken();
  const hash  = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate old tokens
  await pool.query('UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false', [user.id]);

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, hash, expiresAt]
  );

  if (process.env.SMTP_USER) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendEmail(email, 'passwordReset', [user.username, resetLink]);
  }

  logger.info('Password reset requested', { userId: user.id });
  return res.json({ message: 'If that email exists, a reset link has been sent.' });
}));

// ── POST /auth/reset-password ────────────────────────────
app.post('/auth/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: 'Token and new password required' });
  if (newPassword.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

  const hash = hashToken(token);
  const result = await pool.query(
    `SELECT prt.id, prt.user_id, prt.expires_at, prt.used
     FROM password_reset_tokens prt
     WHERE prt.token_hash = $1`,
    [hash]
  );

  if (!result.rows[0]) return res.status(400).json({ message: 'Invalid or expired reset token' });
  const { id: tokenId, user_id, expires_at, used } = result.rows[0];

  if (used)                        return res.status(400).json({ message: 'Reset token already used' });
  if (new Date() > new Date(expires_at)) return res.status(400).json({ message: 'Reset token expired' });

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, user_id]);
  await pool.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenId]);
  // Invalidate all refresh tokens
  await redisClient.del(`refresh:${user_id}`);

  logger.info('Password reset successful', { userId: user_id });
  return res.json({ message: 'Password reset successfully. Please log in.' });
}));

// ── GET /auth/verify-email/:token ────────────────────────
app.get('/auth/verify-email/:token', asyncHandler(async (req, res) => {
  const hash   = hashToken(req.params.token);
  const result = await pool.query(
    `SELECT evt.id, evt.user_id, evt.expires_at, evt.used, u.username, u.email
     FROM email_verification_tokens evt
     JOIN users u ON evt.user_id = u.id
     WHERE evt.token_hash = $1`,
    [hash]
  );

  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (!result.rows[0])                               return res.redirect(`${FRONTEND}/login?error=invalid_token`);
  const { id, user_id, expires_at, used, username, email } = result.rows[0];
  if (used)                                           return res.redirect(`${FRONTEND}/login?verified=already`);
  if (new Date() > new Date(expires_at))              return res.redirect(`${FRONTEND}/login?error=token_expired`);

  await pool.query('UPDATE users SET email_verified = true, updated_at = NOW() WHERE id = $1', [user_id]);
  await pool.query('UPDATE email_verification_tokens SET used = true WHERE id = $1', [id]);

  if (process.env.SMTP_USER) {
    sendEmail(email, 'welcomeBack', [username]).catch(() => {});
  }

  logger.info('Email verified', { userId: user_id });
  return res.redirect(`${FRONTEND}/login?verified=true`);
}));

// ── POST /auth/resend-verification ───────────────────────
app.post('/auth/resend-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  const result = await pool.query(
    'SELECT id, username, email_verified FROM users WHERE email = $1', [email.toLowerCase()]
  );
  if (!result.rows[0]) return res.json({ message: 'If that email exists and is unverified, a link has been sent.' });

  const user = result.rows[0];
  if (user.email_verified) return res.status(400).json({ message: 'Email already verified' });

  const verToken  = generateToken();
  const verHash   = hashToken(verToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [user.id, verHash, expiresAt]
  );

  if (process.env.SMTP_USER) {
    const verLink = `${process.env.API_URL || 'http://localhost:80'}/auth/verify-email/${verToken}`;
    await sendEmail(email, 'verification', [user.username, verLink]);
  }

  return res.json({ message: 'If that email exists and is unverified, a link has been sent.' });
}));

// ── 2FA Endpoints ────────────────────────────────────────
app.post('/auth/2fa/setup', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  let user;
  try { user = verifyToken(authHeader.slice(7)); } catch { return res.status(401).json({ message: 'Invalid token' }); }

  const { authenticator } = require('otplib');
  const QRCode            = require('qrcode');

  const secret     = authenticator.generateSecret();
  const otpauth    = authenticator.keyuri(user.email, process.env.TOTP_ISSUER || 'ChatFlow', secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  await pool.query(
    'UPDATE users SET two_factor_secret = $1, two_factor_secret_verified = false WHERE id = $2',
    [secret, user.id]
  );

  const backupCodes = Array.from({ length: 10 }, () =>
    `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(2).toString('hex')}`
  );
  const bcryptedCodes = await Promise.all(backupCodes.map((c) => bcrypt.hash(c, 10)));
  await pool.query('UPDATE users SET backup_codes = $1 WHERE id = $2', [bcryptedCodes, user.id]);

  return res.json({ secret, qrCodeDataUrl, backupCodes });
}));

app.post('/auth/2fa/verify', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  let user;
  try { user = verifyToken(authHeader.slice(7)); } catch { return res.status(401).json({ message: 'Invalid token' }); }

  const { token: totpToken } = req.body;
  if (!totpToken) return res.status(400).json({ message: 'TOTP token required' });

  const { authenticator } = require('otplib');
  const result = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [user.id]);
  if (!result.rows[0]?.two_factor_secret) return res.status(400).json({ message: '2FA not set up yet' });

  const isValid = authenticator.check(totpToken, result.rows[0].two_factor_secret);
  if (!isValid) return res.status(400).json({ message: 'Invalid TOTP code' });

  await pool.query(
    'UPDATE users SET two_factor_enabled = true, two_factor_secret_verified = true WHERE id = $1',
    [user.id]
  );

  return res.json({ success: true });
}));

app.post('/auth/2fa/disable', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'Unauthorized' });
  let user;
  try { user = verifyToken(authHeader.slice(7)); } catch { return res.status(401).json({ message: 'Invalid token' }); }
  await pool.query('UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [user.id]);
  return res.json({ success: true });
}));

// ── E2EE Key Endpoints ───────────────────────────────────
app.get('/api/keys/:userId', asyncHandler(async (req, res) => {
  const result = await pool.query('SELECT public_key FROM users WHERE id = $1', [req.params.userId]);
  if (!result.rows[0]) return res.status(404).json({ message: 'User not found' });
  return res.json({ publicKey: result.rows[0].public_key || null });
}));

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
    await connectWithRetry();
    await runMigrations();

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ Auth service listening on port ${PORT}`);
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
