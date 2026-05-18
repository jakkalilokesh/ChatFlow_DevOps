'use strict';

const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: GitHubStrategy } = require('passport-github2');
const { pool } = require('../db/postgres');
const { signToken, signRefresh } = require('../utils/tokens');
const logger = require('../utils/logger');

function generateUsername(base) {
  return (base || 'user').replace(/\s+/g, '').toLowerCase().slice(0, 20) + Math.floor(Math.random() * 9000 + 1000);
}

async function findOrCreateOAuthUser({ googleId, githubId, email, displayName, avatarUrl }) {
  // Try to find by OAuth ID first, then by email
  let query, params;
  if (googleId) {
    query = 'SELECT * FROM users WHERE google_id = $1 OR email = $2 LIMIT 1';
    params = [googleId, email];
  } else {
    query = 'SELECT * FROM users WHERE github_id = $1 OR email = $2 LIMIT 1';
    params = [githubId, email];
  }

  let result = await pool.query(query, params);

  if (result.rows.length === 0) {
    // Create new user
    const username = generateUsername(displayName);
    result = await pool.query(
      `INSERT INTO users (username, email, full_name, google_id, github_id, avatar_url, email_verified, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, true, '')
       RETURNING *`,
      [username, email, displayName, googleId || null, githubId || null, avatarUrl]
    );
    logger.info('OAuth user created', { username, email });
  } else {
    const existingUser = result.rows[0];
    // Link OAuth ID if not already linked
    if (googleId && !existingUser.google_id) {
      await pool.query('UPDATE users SET google_id = $1, email_verified = true WHERE id = $2', [googleId, existingUser.id]);
    }
    if (githubId && !existingUser.github_id) {
      await pool.query('UPDATE users SET github_id = $1, email_verified = true WHERE id = $2', [githubId, existingUser.id]);
    }
  }

  return result.rows[0];
}

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  `${process.env.API_URL || 'http://localhost:80'}/auth/google/callback`,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email provided by Google'));

      const user = await findOrCreateOAuthUser({
        googleId:    profile.id,
        email,
        displayName: profile.displayName,
        avatarUrl:   profile.photos?.[0]?.value,
      });

      const tokens = {
        accessToken:  signToken({ id: user.id, username: user.username, email: user.email }),
        refreshToken: signRefresh({ id: user.id }),
      };

      done(null, { user, tokens });
    } catch (err) {
      logger.error('Google OAuth error', { err: err.message });
      done(err);
    }
  }));
  logger.info('Google OAuth strategy registered');
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(new GitHubStrategy({
    clientID:     process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL:  `${process.env.API_URL || 'http://localhost:80'}/auth/github/callback`,
    scope:        ['user:email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;

      const user = await findOrCreateOAuthUser({
        githubId:    String(profile.id),
        email,
        displayName: profile.displayName || profile.username,
        avatarUrl:   profile.photos?.[0]?.value,
      });

      const tokens = {
        accessToken:  signToken({ id: user.id, username: user.username, email: user.email }),
        refreshToken: signRefresh({ id: user.id }),
      };

      done(null, { user, tokens });
    } catch (err) {
      logger.error('GitHub OAuth error', { err: err.message });
      done(err);
    }
  }));
  logger.info('GitHub OAuth strategy registered');
}

module.exports = passport;
