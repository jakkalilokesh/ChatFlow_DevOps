'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET         = process.env.JWT_SECRET         || 'change-me-in-production-at-least-64-chars';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change-me-refresh-at-least-64-chars';
const JWT_EXPIRY         = process.env.JWT_EXPIRY         || '15m';
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

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

module.exports = { signToken, signRefresh, verifyToken, verifyRefresh };
