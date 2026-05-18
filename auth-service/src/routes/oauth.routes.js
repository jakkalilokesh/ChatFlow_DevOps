'use strict';

const express = require('express');
const passport = require('../oauth/passport.config');
const { pool } = require('../db/postgres');
const { signRefresh } = require('../utils/tokens');
const logger = require('../utils/logger');

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function buildRedirectParams(user, tokens) {
  return new URLSearchParams({
    accessToken:  tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId:       user.id,
    username:     user.username,
    email:        user.email,
    avatarUrl:    user.avatar_url || '',
  }).toString();
}

async function storeRefreshToken(userId, refreshToken) {
  await pool.query(
    'UPDATE users SET is_online = true WHERE id = $1',
    [userId]
  );
  // Store refresh token in postgres for persistence
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hash, expiresAt]
  );
}

// ── Google OAuth ─────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      const { user, tokens } = req.user;
      await storeRefreshToken(user.id, tokens.refreshToken);
      logger.info('Google OAuth login success', { userId: user.id });
      res.redirect(`${FRONTEND_URL}/oauth/callback?${buildRedirectParams(user, tokens)}`);
    } catch (err) {
      logger.error('Google callback error', { err: err.message });
      res.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
    }
  }
);

// ── GitHub OAuth ─────────────────────────────────────────
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'], session: false })
);

router.get('/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${FRONTEND_URL}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      const { user, tokens } = req.user;
      await storeRefreshToken(user.id, tokens.refreshToken);
      logger.info('GitHub OAuth login success', { userId: user.id });
      res.redirect(`${FRONTEND_URL}/oauth/callback?${buildRedirectParams(user, tokens)}`);
    } catch (err) {
      logger.error('GitHub callback error', { err: err.message });
      res.redirect(`${FRONTEND_URL}/login?error=oauth_error`);
    }
  }
);

module.exports = router;
