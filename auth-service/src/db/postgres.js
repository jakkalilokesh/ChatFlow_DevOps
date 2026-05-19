'use strict';

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  host:                    process.env.DB_HOST || 'postgres',
  port:                    parseInt(process.env.DB_PORT || '5432', 10),
  database:                process.env.DB_NAME || 'chatflow',
  user:                    process.env.DB_USER || 'chatflow_user',
  password:                process.env.DB_PASSWORD || 'password',
  max:                     10,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production' && process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { err: err.message });
});

async function connectWithRetry(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      logger.info('✅ PostgreSQL connected');
      return pool;
    } catch (err) {
      logger.warn(`PostgreSQL attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('PostgreSQL connection failed after all retries');
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username                  VARCHAR(30) UNIQUE NOT NULL,
      email                     VARCHAR(255) UNIQUE NOT NULL,
      password_hash             VARCHAR(255),
      full_name                 VARCHAR(120),
      avatar_url                TEXT,
      bio                       TEXT DEFAULT '',
      status                    VARCHAR(20) DEFAULT 'offline',
      custom_status             TEXT,
      public_key                TEXT,
      two_factor_secret         TEXT,
      two_factor_secret_verified BOOLEAN DEFAULT false,
      two_factor_enabled        BOOLEAN DEFAULT false,
      backup_codes              TEXT[],
      google_id                 VARCHAR(255) UNIQUE,
      github_id                 VARCHAR(255) UNIQUE,
      email_verified            BOOLEAN DEFAULT false,
      is_online                 BOOLEAN DEFAULT false,
      is_banned                 BOOLEAN DEFAULT false,
      created_at                TIMESTAMPTZ DEFAULT NOW(),
      updated_at                TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_status TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS public_key TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret_verified BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT[];
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(255) UNIQUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;


    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash  VARCHAR(512) NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      device_info JSONB,
      ip_address  INET,
      last_active TIMESTAMPTZ DEFAULT NOW(),
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash  VARCHAR(512) NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash  VARCHAR(512) NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email       ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username    ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_google_id   ON users(google_id);
    CREATE INDEX IF NOT EXISTS idx_users_github_id   ON users(github_id);
    CREATE INDEX IF NOT EXISTS idx_refresh_user      ON refresh_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_prt_user          ON password_reset_tokens(user_id);
  `);
  logger.info('✅ Database migrations complete');
}

module.exports = { pool, connectWithRetry, runMigrations };
