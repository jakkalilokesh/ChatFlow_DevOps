# 🔧 ChatFlow — Complete Fix, Upgrade & Feature Expansion Agent Prompt
> Paste this into Claude Code, Cursor, Aider, or any AI coding agent.
> Fix ALL bugs, gaps, errors + upgrade UI/UX + add AI/ML + add missing features.
> Everything is 100% open-source and free.

---

## SECTION 0 — MASTER LIST OF ALL ISSUES & MISSING THINGS

### 🐛 Critical Bugs to Fix
- No mobile responsiveness — app breaks on phone/tablet
- Chat functionality completely broken — cannot send/receive messages
- WebSocket connection failing — Socket.io not connecting
- OAuth missing — no Google/GitHub login
- Database connection errors — MongoDB/PostgreSQL not connecting properly
- Environment variables not loading correctly
- CORS errors blocking frontend ↔ backend communication
- JWT token not being passed in request headers
- Redis pub/sub not working for multi-instance chat
- File uploads failing — MinIO presigned URLs broken
- Socket rooms not persisting after page refresh
- User online/offline status not updating
- Message history not loading on room join
- Emoji picker not rendering
- Typing indicators not broadcasting
- Notifications not appearing
- Infinite scroll broken in message list
- Avatar images not loading
- Search returning 0 results even with matches
- 2FA QR code not generating
- Voice/video call WebRTC ICE candidates failing

### 📱 Mobile Responsiveness (Complete Overhaul)
- Sidebar not collapsible on mobile
- Chat input too small on mobile keyboard
- Message bubbles overflowing viewport
- No touch gestures (swipe to reply, swipe sidebar open)
- Font sizes too small on mobile
- Buttons too small for touch targets (must be min 44×44px)
- No bottom navigation bar for mobile
- Modals not full-screen on mobile
- File upload not working on iOS Safari
- Video calls layout broken on mobile

### 🔐 Auth & OAuth (Missing)
- Google OAuth missing
- GitHub OAuth missing
- No password reset flow (forgot password)
- No email verification on register
- No "remember me" functionality
- Session persistence across browser refreshes broken

### 🎨 UI/UX Gaps
- No skeleton loading screens (blank flashes)
- No empty state illustrations
- No error state pages (404, 500)
- No onboarding flow for new users
- Inconsistent spacing and typography
- No toast notification system properly wired
- No confirmation dialogs for destructive actions
- No image lazy loading
- No virtual scrolling for large message lists
- Scroll-to-bottom button missing when scrolled up
- No message timestamps on hover
- No "jump to latest" button

### 🤖 AI/ML Features (Missing — All Free/Open Source)
- No AI chat assistant (Ollama — local LLM, free)
- No smart message suggestions / autocomplete
- No sentiment analysis on messages
- No automatic spam/toxicity detection
- No AI-powered search (semantic search)
- No message summarization for long threads
- No language auto-detection
- No smart notification filtering (ML-based priority)
- No AI image generation (Stable Diffusion via free API)
- No voice-to-text transcription (Whisper.cpp — free)

### 🔧 Free Tool Integrations Missing
- Ollama (local AI/LLM)
- Whisper.cpp (voice transcription)
- Stable Diffusion (AI image gen)
- Hugging Face Inference API (free tier)
- Meilisearch (full-text search — may not be wired up)
- LibreTranslate (translation — may not be wired up)
- MinIO (object storage — connection broken)
- Prometheus metrics not exported from all services
- Grafana dashboards incomplete
- Loki log collection not working
- Redis Sentinel not configured

### 🎬 UI Visual Assets Missing
- No proper logo SVG component
- No background videos on landing page
- No background animated meshes on auth pages
- No illustrations on empty states
- No animation on page transitions
- No loading animations (spinners/skeletons)
- No confetti on successful registration
- No proper favicon
- No PWA manifest (installable app)
- No dark/light mode transition animation
- No micro-animations on interactive elements

---

## SECTION 1 — COMPLETE FIX INSTRUCTIONS

---

### FIX 1: Mobile Responsiveness (Full Overhaul)

Apply responsive design to EVERY component. Use Tailwind CSS breakpoints:
`sm: 640px | md: 768px | lg: 1024px | xl: 1280px`

**Mobile Layout Architecture:**

```jsx
// frontend/src/layouts/AppLayout.jsx — Complete rewrite
// Mobile (< 768px): Single column, bottom nav, drawer sidebar
// Tablet (768-1024px): Sidebar collapsible with overlay
// Desktop (> 1024px): Full 3-column layout (sidebar + chat + info panel)

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Mobile: Drawer overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        ${isMobile
          ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300
             ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
          : 'relative flex-shrink-0'
        }
        w-72 md:w-64 lg:w-72 flex flex-col
      `}>
        <WorkspaceSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header with hamburger */}
        {isMobile && (
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
            <button onClick={() => setSidebarOpen(true)} className="p-2 touch-target">
              <MenuIcon />
            </button>
            <span className="font-semibold"># general</span>
          </div>
        )}
        <ChatArea />
      </main>

      {/* Mobile: Bottom Navigation Bar */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-30 
                        bg-[var(--bg-secondary)] border-t border-[var(--border)]
                        flex items-center justify-around px-2 py-2 pb-safe">
          <NavItem icon={<HomeIcon />} label="Home" to="/chat" />
          <NavItem icon={<SearchIcon />} label="Search" to="/search" />
          <NavItem icon={<BellIcon />} label="Alerts" to="/notifications" />
          <NavItem icon={<UserIcon />} label="Profile" to="/profile" />
        </nav>
      )}
    </div>
  );
};
```

**Touch Gestures (install: `npm install @use-gesture/react`):**
```jsx
// Swipe right to open sidebar
useGesture({
  onDrag: ({ movement: [mx], direction: [dx], velocity }) => {
    if (dx > 0 && mx > 80 && velocity > 0.3) setSidebarOpen(true);
    if (dx < 0 && mx < -80) setSidebarOpen(false);
  }
}, { target: mainRef });

// Swipe left on message to reply
useGesture({
  onDrag: ({ movement: [mx], direction: [dx] }) => {
    if (dx < 0 && mx < -60) triggerReply(message);
  }
}, { target: messageRef });
```

**Mobile Chat Input (critical fix):**
```jsx
// frontend/src/components/chat/MobileChatInput.jsx
// Problem: keyboard pushes input off screen on iOS/Android
// Fix: use Visual Viewport API
useEffect(() => {
  const handleResize = () => {
    if (window.visualViewport) {
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${window.innerHeight - window.visualViewport.height}px`
      );
    }
  };
  window.visualViewport?.addEventListener('resize', handleResize);
  return () => window.visualViewport?.removeEventListener('resize', handleResize);
}, []);

// CSS: input area stays above keyboard
.chat-input-area {
  padding-bottom: max(env(safe-area-inset-bottom), var(--keyboard-height, 0px));
}

// Touch targets: ALL buttons minimum 44×44px
.touch-target { min-width: 44px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
```

**Responsive Typography & Spacing:**
```css
/* globals.css */
html { font-size: clamp(14px, 2.5vw, 16px); }
h1 { font-size: clamp(1.5rem, 5vw, 3rem); }
h2 { font-size: clamp(1.25rem, 4vw, 2rem); }
.message-bubble { max-width: min(75%, 480px); }
/* Mobile: full width bubbles */
@media (max-width: 480px) { .message-bubble { max-width: 88%; } }
```

---

### FIX 2: WebSocket / Socket.io Connection (Critical)

**Problem:** Socket.io fails to connect due to CORS, missing auth, wrong URL.

**Fix in `chat-service/src/app.js`:**
```javascript
import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Fix for nginx proxy:
  path: '/socket.io/',
  transports: ['websocket', 'polling'],  // polling as fallback
  pingTimeout: 60000,
  pingInterval: 25000,
  // Auth middleware:
  allowRequest: (req, callback) => {
    const token = req.auth || req._query.token;
    if (!token) return callback('Unauthorized', false);
    callback(null, true);
  }
});

// Socket auth middleware:
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) return next(new Error('Authentication error'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

httpServer.listen(process.env.PORT || 3002, '0.0.0.0');
```

**Fix in `frontend/src/context/SocketContext.jsx`:**
```javascript
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io(process.env.REACT_APP_SOCKET_URL || window.location.origin, {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') socket.connect(); // reconnect
    });

    socket.on('connect_error', (err) => {
      setConnectionError(err.message);
      console.error('Socket error:', err);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected, connectionError }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

**Fix nginx WebSocket proxying (`nginx/nginx.conf`):**
```nginx
map $http_upgrade $connection_upgrade {
  default upgrade;
  ''      close;
}

upstream chat_service {
  server chat-service:3002;
  keepalive 32;
}

server {
  listen 80;

  location /socket.io/ {
    proxy_pass         http://chat_service;
    proxy_http_version 1.1;
    proxy_set_header   Upgrade $http_upgrade;
    proxy_set_header   Connection $connection_upgrade;
    proxy_set_header   Host $host;
    proxy_set_header   X-Real-IP $remote_addr;
    proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 86400;   # 24h for long-lived WS connections
    proxy_send_timeout 86400;
  }
}
```

---

### FIX 3: Database Connections (Critical)

**Fix PostgreSQL connection (`auth-service/src/db/postgres.js`):**
```javascript
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host:            process.env.DB_HOST || 'postgres',
  port:            parseInt(process.env.DB_PORT) || 5432,
  database:        process.env.DB_NAME || 'chatapp',
  user:            process.env.DB_USER || 'postgres',
  password:        process.env.DB_PASSWORD,
  max:             10,             // max connections in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Retry logic:
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup with retry:
const connectWithRetry = async (retries = 10, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      console.log('✅ PostgreSQL connected');
      return pool;
    } catch (err) {
      console.log(`PostgreSQL connection attempt ${i+1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('PostgreSQL connection failed after all retries');
};

// Run migrations on startup:
const runMigrations = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(30) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      avatar_url TEXT,
      bio TEXT DEFAULT '',
      status VARCHAR(20) DEFAULT 'offline',
      custom_status TEXT,
      public_key TEXT,
      two_factor_secret TEXT,
      two_factor_enabled BOOLEAN DEFAULT false,
      backup_codes TEXT[],
      google_id VARCHAR(255) UNIQUE,
      github_id VARCHAR(255) UNIQUE,
      email_verified BOOLEAN DEFAULT false,
      is_banned BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      device_info JSONB,
      ip_address INET,
      last_active TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  `);
  console.log('✅ Database migrations complete');
};

export { pool, connectWithRetry, runMigrations };
```

**Fix MongoDB connection (`chat-service/src/db/mongo.js`):**
```javascript
import mongoose from 'mongoose';

const connectMongo = async (retries = 10, delay = 3000) => {
  const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/chatdb';

  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
        retryWrites: true,
      });
      console.log('✅ MongoDB connected');
      return;
    } catch (err) {
      console.log(`MongoDB attempt ${i+1}/${retries}: ${err.message}`);
      if (i < retries - 1) await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('MongoDB failed to connect');
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected, retrying...');
  setTimeout(() => connectMongo(), 3000);
});

export default connectMongo;
```

**Fix Redis connection (`chat-service/src/db/redis.js`):**
```javascript
import { createClient } from 'redis';

const createRedisClient = async (name = 'client') => {
  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      reconnectStrategy: (retries) => {
        if (retries > 20) return new Error('Redis max retries');
        return Math.min(retries * 100, 3000);
      },
    },
    password: process.env.REDIS_PASSWORD || undefined,
  });

  client.on('error', (err) => console.error(`Redis ${name} error:`, err.message));
  client.on('connect', () => console.log(`✅ Redis ${name} connected`));
  client.on('reconnecting', () => console.log(`Redis ${name} reconnecting...`));

  await client.connect();
  return client;
};

// Export separate clients for pub and sub (Redis requires separate connections for pub/sub)
let pubClient, subClient, cacheClient;

export const initRedis = async () => {
  cacheClient = await createRedisClient('cache');
  pubClient   = await createRedisClient('publisher');
  subClient   = await createRedisClient('subscriber');
  return { pub: pubClient, sub: subClient, cache: cacheClient };
};

export const getRedis = () => ({ pub: pubClient, sub: subClient, cache: cacheClient });
```

---

### FIX 4: CORS Configuration (Fix All Services)

**Fix CORS in every service:**
```javascript
// Add to every service's app.js — BEFORE all routes
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
    if (!origin || allowed.includes(origin) || allowed.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page'],
  maxAge: 86400,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // pre-flight for all routes
```

**Fix environment variable for frontend:**
```env
# .env (frontend)
REACT_APP_API_URL=http://localhost:80
REACT_APP_SOCKET_URL=http://localhost:80
REACT_APP_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80
```

---

### FIX 5: OAuth — Google & GitHub Login

**Install:**
```bash
# auth-service
npm install passport passport-google-oauth20 passport-github2 express-session
```

**auth-service: `src/oauth/passport.config.js`**
```javascript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { pool } from '../db/postgres.js';
import { generateTokens } from '../utils/tokens.js';

passport.use(new GoogleStrategy({
  clientID:     process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL:  `${process.env.API_URL}/auth/google/callback`,
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    const avatar = profile.photos[0]?.value;
    let result = await pool.query('SELECT * FROM users WHERE google_id = $1 OR email = $2', [profile.id, email]);

    if (result.rows.length === 0) {
      // New user: create account
      result = await pool.query(
        `INSERT INTO users (username, email, google_id, avatar_url, email_verified)
         VALUES ($1, $2, $3, $4, true) RETURNING *`,
        [profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random()*1000),
         email, profile.id, avatar]
      );
    } else if (!result.rows[0].google_id) {
      // Existing user: link Google account
      await pool.query('UPDATE users SET google_id = $1, email_verified = true WHERE id = $2', [profile.id, result.rows[0].id]);
    }

    const user = result.rows[0];
    const tokens = await generateTokens(user);
    done(null, { user, tokens });
  } catch (err) { done(err); }
}));

passport.use(new GitHubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  `${process.env.API_URL}/auth/github/callback`,
  scope:        ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || `${profile.username}@github.local`;
    let result = await pool.query('SELECT * FROM users WHERE github_id = $1 OR email = $2', [String(profile.id), email]);

    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO users (username, email, github_id, avatar_url, email_verified)
         VALUES ($1, $2, $3, $4, true) RETURNING *`,
        [profile.username, email, String(profile.id), profile.photos[0]?.value]
      );
    } else if (!result.rows[0].github_id) {
      await pool.query('UPDATE users SET github_id = $1 WHERE id = $2', [String(profile.id), result.rows[0].id]);
    }

    const user = result.rows[0];
    const tokens = await generateTokens(user);
    done(null, { user, tokens });
  } catch (err) { done(err); }
}));
```

**auth-service: OAuth routes:**
```javascript
// src/routes/oauth.routes.js
import express from 'express';
import passport from 'passport';
const router = express.Router();

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const { user, tokens } = req.user;
    const params = new URLSearchParams({
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId:       user.id,
      username:     user.username,
    });
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?${params}`);
  }
);

// GitHub OAuth
router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=oauth_failed` }),
  (req, res) => {
    const { user, tokens } = req.user;
    const params = new URLSearchParams({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, userId: user.id, username: user.username });
    res.redirect(`${process.env.FRONTEND_URL}/oauth/callback?${params}`);
  }
);

export default router;
```

**Frontend: `frontend/src/pages/OAuthCallback.jsx`**
```javascript
// Route: /oauth/callback
// Reads tokens from URL params, stores in localStorage, redirects to /chat
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId       = params.get('userId');
    const username     = params.get('username');
    const error        = params.get('error');

    if (error) { navigate('/login?error=oauth_failed'); return; }
    if (accessToken) {
      login({ accessToken, refreshToken, userId, username });
      navigate('/chat', { replace: true });
    } else {
      navigate('/login?error=no_token');
    }
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mb-4" />
        <p className="text-[var(--text-secondary)]">Signing you in...</p>
      </div>
    </div>
  );
}
```

**Frontend Login Page — Add OAuth buttons:**
```jsx
// In Login.jsx and Register.jsx — add after form divider:
<div className="flex flex-col gap-3 mt-4">
  <button
    onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/auth/google`}
    className="oauth-btn google-btn"
  >
    <GoogleIcon className="w-5 h-5" />
    Continue with Google
  </button>
  <button
    onClick={() => window.location.href = `${process.env.REACT_APP_API_URL}/auth/github`}
    className="oauth-btn github-btn"
  >
    <GitHubIcon className="w-5 h-5" />
    Continue with GitHub
  </button>
</div>

// .env additions:
// GOOGLE_CLIENT_ID=your-google-client-id
// GOOGLE_CLIENT_SECRET=your-google-client-secret
// GITHUB_CLIENT_ID=your-github-client-id
// GITHUB_CLIENT_SECRET=your-github-client-secret
```

**To get free OAuth credentials:**
```
Google: console.cloud.google.com → Create Project → OAuth 2.0 Credentials → Free
GitHub: github.com/settings/developers → OAuth Apps → Free
```

---

### FIX 6: Auth Context & Token Management

**Fix `frontend/src/context/AuthContext.jsx` — complete rewrite:**
```javascript
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Restore session on page load:
  useEffect(() => {
    const stored = localStorage.getItem('chatflow_auth');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.accessToken && data.expiresAt > Date.now()) {
          setToken(data.accessToken);
          setUser(data.user);
          setIsAuthenticated(true);
          api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        } else if (data.refreshToken) {
          refreshToken(data.refreshToken); // try to refresh
        }
      } catch { localStorage.removeItem('chatflow_auth'); }
    }
    setLoading(false);
  }, []);

  const login = useCallback((data) => {
    const authData = {
      accessToken:  data.accessToken,
      refreshToken: data.refreshToken,
      user:         { id: data.userId, username: data.username, ...data.user },
      expiresAt:    Date.now() + 14 * 60 * 1000, // 14 min (token is 15min)
    };
    localStorage.setItem('chatflow_auth', JSON.stringify(authData));
    setToken(data.accessToken);
    setUser(authData.user);
    setIsAuthenticated(true);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('chatflow_auth');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    delete api.defaults.headers.common['Authorization'];
  }, []);

  const refreshToken = useCallback(async (rt) => {
    try {
      const res = await api.post('/auth/refresh', { refreshToken: rt });
      login({ ...res.data, user: res.data.user });
    } catch { logout(); }
  }, [login, logout]);

  // Auto-refresh token before expiry:
  useEffect(() => {
    if (!isAuthenticated) return;
    const stored = JSON.parse(localStorage.getItem('chatflow_auth') || '{}');
    const timeUntilRefresh = stored.expiresAt - Date.now() - 60000; // refresh 1 min early
    if (timeUntilRefresh <= 0) { refreshToken(stored.refreshToken); return; }
    const timer = setTimeout(() => refreshToken(stored.refreshToken), timeUntilRefresh);
    return () => clearTimeout(timer);
  }, [isAuthenticated, refreshToken]);

  return (
    <AuthContext.Provider value={{ user, token, loading, isAuthenticated, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

---

### FIX 7: API Client with Interceptors

**Create `frontend/src/utils/api.js`:**
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('chatflow_auth');
  if (stored) {
    const { accessToken } = JSON.parse(stored);
    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor — handle 401 token expiry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = JSON.parse(localStorage.getItem('chatflow_auth') || '{}');
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/auth/refresh`,
          { refreshToken: stored.refreshToken });
        const newToken = res.data.accessToken;
        localStorage.setItem('chatflow_auth', JSON.stringify({ ...stored, accessToken: newToken }));
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('chatflow_auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

### FIX 8: Password Reset & Email Verification

**Install: `npm install nodemailer` (auth-service)**

**auth-service: `src/services/email.service.js`**
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const emailTemplates = {
  verification: (username, link) => ({
    subject: '✅ Verify your ChatFlow account',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f9fafb;padding:32px;border-radius:16px">
        <h1 style="color:#6c63ff;margin-bottom:8px">ChatFlow</h1>
        <h2>Welcome, ${username}! 👋</h2>
        <p style="color:#9ca3af">Click below to verify your email and start chatting.</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#6c63ff,#4ecdc4);color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Verify Email Address
        </a>
        <p style="color:#6b7280;font-size:12px">Link expires in 24 hours. If you didn't create an account, ignore this email.</p>
      </div>`
  }),

  passwordReset: (username, link) => ({
    subject: '🔑 Reset your ChatFlow password',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0a0f1e;color:#f9fafb;padding:32px;border-radius:16px">
        <h1 style="color:#6c63ff">ChatFlow</h1>
        <h2>Password Reset Request</h2>
        <p style="color:#9ca3af">Hi ${username}, click below to reset your password.</p>
        <a href="${link}" style="display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">
          Reset Password
        </a>
        <p style="color:#6b7280;font-size:12px">Link expires in 1 hour. If you didn't request this, ignore it.</p>
      </div>`
  }),
};

export const sendEmail = async (to, template, data) => {
  const { subject, html } = emailTemplates[template](...data);
  await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, html });
};
```

**New endpoints:**
```
POST /auth/forgot-password  → { email } → send reset link (rate limited: 3/hr)
POST /auth/reset-password   → { token, newPassword } → reset password
GET  /auth/verify-email/:token → verify email, redirect to login with ?verified=true
POST /auth/resend-verification → resend verification email
```

---

### FIX 9: UI/UX Overhaul — Missing Visual Assets

**Skeleton Loading Screens:**
```jsx
// frontend/src/components/ui/Skeleton.jsx
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-[var(--bg-tertiary)] rounded-md ${className}`} />
);

// Message list skeleton:
export const MessageSkeleton = () => (
  <div className="flex gap-3 p-4">
    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

// Channel list skeleton:
export const ChannelSkeleton = () => (
  <div className="space-y-1 p-2">
    {[...Array(8)].map((_, i) => (
      <div key={i} className="flex items-center gap-2 px-2 py-1.5">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 flex-1" style={{ width: `${60 + Math.random() * 40}%` }} />
      </div>
    ))}
  </div>
);
```

**Empty State Illustrations (CSS/SVG — no external assets needed):**
```jsx
// frontend/src/components/ui/EmptyState.jsx
export const EmptyMessages = () => (
  <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
    {/* Animated SVG illustration */}
    <svg viewBox="0 0 200 200" className="w-40 h-40 opacity-30">
      <circle cx="100" cy="80" r="50" fill="none" stroke="var(--accent)" strokeWidth="3">
        <animate attributeName="r" from="50" to="55" dur="2s" repeatCount="indefinite" direction="alternate" />
      </circle>
      <rect x="70" y="60" width="60" height="8" rx="4" fill="var(--accent)" opacity="0.5">
        <animate attributeName="width" from="60" to="40" dur="2s" repeatCount="indefinite" />
      </rect>
      <rect x="70" y="76" width="45" height="8" rx="4" fill="var(--accent)" opacity="0.3" />
      <rect x="70" y="92" width="55" height="8" rx="4" fill="var(--accent)" opacity="0.2" />
    </svg>
    <h3 className="text-xl font-semibold text-[var(--text-primary)]">No messages yet</h3>
    <p className="text-[var(--text-secondary)] max-w-sm">
      Be the first to say something! Type a message below to get the conversation started.
    </p>
  </div>
);

export const EmptySearch = ({ query }) => ( /* similar SVG illustration */ );
export const EmptyNotifications = () => ( /* similar SVG illustration */ );
export const Empty404 = () => ( /* 404 page illustration */ );
```

**Background Animated Mesh (`frontend/src/components/ui/AnimatedBackground.jsx`):**
```jsx
// CSS-only animated gradient mesh — no video needed for auth pages
export const AnimatedMesh = () => (
  <div className="fixed inset-0 -z-10 overflow-hidden">
    <div className="absolute inset-0 bg-[var(--bg-primary)]" />
    {/* Animated blobs */}
    <div className="blob blob-1" />
    <div className="blob blob-2" />
    <div className="blob blob-3" />
    <div className="noise-overlay" />
  </div>
);

// globals.css:
/*
.blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; }
.blob-1 { width: 600px; height: 600px; background: #6c63ff;
           top: -200px; left: -200px; animation: float1 20s ease-in-out infinite; }
.blob-2 { width: 500px; height: 500px; background: #4ecdc4;
           bottom: -150px; right: -150px; animation: float2 25s ease-in-out infinite; }
.blob-3 { width: 400px; height: 400px; background: #ff6b6b;
           top: 50%; left: 50%; transform: translate(-50%,-50%);
           animation: float3 15s ease-in-out infinite; }
.noise-overlay { position: absolute; inset: 0;
  background-image: url("data:image/svg+xml,..."); opacity: 0.03; }

@keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)}
  33%{transform:translate(80px,-40px) scale(1.05)}
  66%{transform:translate(-40px,60px) scale(0.95)} }
@keyframes float2 { 0%,100%{transform:translate(0,0)}
  33%{transform:translate(-60px,40px)} 66%{transform:translate(40px,-50px)} }
@keyframes float3 { 0%,100%{transform:translate(-50%,-50%) scale(1)}
  50%{transform:translate(-50%,-50%) scale(1.1)} }
*/
```

**Landing Page Background Video:**
```jsx
// frontend/src/components/landing/HeroVideo.jsx
// Use free video from Pexels (no signup required — direct MP4 link)
const VIDEO_URLS = [
  // Add these free Pexels videos (no API key needed for direct links):
  'https://www.pexels.com/download/video/3129671/', // abstract network
  // Fallback: CSS animated gradient
];

export const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <video
      autoPlay muted loop playsInline
      className="absolute inset-0 w-full h-full object-cover scale-105"
      poster="/hero-poster.jpg"
    >
      {/* Replace src with actual hosted video URL */}
      <source src="/videos/hero-bg.mp4" type="video/mp4" />
    </video>
    {/* Dark gradient overlay */}
    <div className="absolute inset-0 bg-gradient-to-b from-[rgba(5,5,20,0.85)] via-[rgba(5,5,20,0.7)] to-[rgba(5,5,20,0.95)]" />
    {/* Particle canvas on top */}
    <ParticleCanvas />
  </div>
);
```

**ChatFlow Logo SVG Component:**
```jsx
// frontend/src/components/ui/Logo.jsx
export const Logo = ({ size = 32, showText = true }) => (
  <div className="flex items-center gap-2">
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      {/* Speech bubble */}
      <defs>
        <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6c63ff"/>
          <stop offset="100%" stopColor="#4ecdc4"/>
        </linearGradient>
      </defs>
      <path d="M4 8C4 5.79 5.79 4 8 4h24c2.21 0 4 1.79 4 4v18c0 2.21-1.79 4-4 4H22l-6 6v-6H8c-2.21 0-4-1.79-4-4V8z"
            fill="url(#logoGrad)" />
      {/* Lightning bolt */}
      <path d="M23 10l-6 10h5l-2 10 8-12h-6l3-8h-2z" fill="white" fillOpacity="0.9"/>
    </svg>
    {showText && (
      <span className="font-bold text-xl bg-gradient-to-r from-[#6c63ff] to-[#4ecdc4] bg-clip-text text-transparent">
        ChatFlow
      </span>
    )}
  </div>
);
```

**Favicon + PWA Manifest:**
```html
<!-- frontend/public/index.html -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#6c63ff">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

```json
// frontend/public/manifest.json
{
  "name": "ChatFlow",
  "short_name": "ChatFlow",
  "description": "Real-time team communication platform",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0f1e",
  "theme_color": "#6c63ff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

### FIX 10: Virtual Scrolling for Messages (Performance)

**Install: `npm install @tanstack/react-virtual`**

```jsx
// frontend/src/components/chat/VirtualMessageList.jsx
import { useVirtualizer } from '@tanstack/react-virtual';

export const VirtualMessageList = ({ messages, fetchMoreMessages }) => {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // avg message height
    overscan: 10,
    // Scroll from bottom:
    initialOffset: Number.MAX_SAFE_INTEGER,
  });

  // Infinite scroll upward (load older messages):
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const handler = () => { if (el.scrollTop < 200) fetchMoreMessages(); };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [fetchMoreMessages]);

  return (
    <div ref={parentRef} className="flex-1 overflow-y-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div key={virtualRow.index}
               style={{ position: 'absolute', top: 0, left: 0, width: '100%',
                        transform: `translateY(${virtualRow.start}px)` }}>
            <MessageBubble message={messages[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## SECTION 2 — AI / ML INTEGRATIONS (All Free & Open Source)

---

### AI 1: Ollama — Local LLM AI Assistant

**What it is:** Run LLaMA 3, Mistral, Phi-3 locally — completely free, no API key.

**Add to docker-compose.yml:**
```yaml
ollama:
  image: ollama/ollama:latest
  ports: ["11434:11434"]
  volumes:
    - ollama_data:/root/.ollama
  environment:
    - OLLAMA_KEEP_ALIVE=24h
  # GPU support (if available):
  # deploy:
  #   resources:
  #     reservations:
  #       devices:
  #         - driver: nvidia
  #           capabilities: [gpu]
```

**New microservice: `ai-service/` (Port 3006)**
```
ai-service/
├── src/
│   ├── app.js
│   ├── ollama/
│   │   └── client.js          ← HTTP client for Ollama API
│   ├── routes/
│   │   ├── chat.routes.js     ← /ai/chat endpoint (streaming)
│   │   ├── summarize.routes.js ← /ai/summarize
│   │   ├── suggest.routes.js  ← /ai/suggest-reply
│   │   └── moderate.routes.js ← /ai/moderate
│   └── services/
│       ├── chatAssistant.js   ← AI chat with conversation history
│       ├── summarize.js       ← Thread/channel summarization
│       ├── suggest.js         ← Smart reply suggestions
│       └── moderate.js        ← Content moderation
├── Dockerfile
└── package.json
```

**ai-service: `src/ollama/client.js`**
```javascript
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://ollama:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'; // ~2GB, fast

export const ollamaChat = async (messages, onChunk) => {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      stream: true,
      options: { temperature: 0.7, num_ctx: 4096 }
    }),
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      const data = JSON.parse(line);
      if (data.message?.content) {
        fullText += data.message.content;
        onChunk?.(data.message.content);
      }
    }
  }
  return fullText;
};

export const ollamaGenerate = async (prompt, model = DEFAULT_MODEL) => {
  const res = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
  });
  const data = await res.json();
  return data.response;
};
```

**AI Features endpoints:**
```javascript
// POST /ai/chat — streaming AI assistant
// Body: { messages: [{role, content}], channelContext: "tech team channel" }
// Response: Server-Sent Events stream

// POST /ai/summarize — summarize a thread or channel
// Body: { messages: [{ username, content, createdAt }], type: 'thread'|'channel' }
// Prompt: "Summarize these chat messages in 3-5 bullet points: ..."
// Response: { summary: "• Point 1\n• Point 2\n..." }

// POST /ai/suggest-reply — smart reply suggestions
// Body: { lastMessages: [...], userInput: "" }
// Response: { suggestions: ["Sure!", "Can you elaborate?", "I'll look into it"] }

// POST /ai/moderate — detect toxic/spam content
// Body: { content: "..." }
// Response: { isToxic: bool, confidence: 0.95, category: "hate_speech"|"spam"|"safe" }

// POST /ai/translate-chat — translate using LLM (better than LibreTranslate for context)
// Body: { content, targetLanguage }
// Response: { translatedContent }
```

**Frontend: AI Assistant UI**
```jsx
// frontend/src/components/ai/AIAssistantButton.jsx
// Floating button (⚡ or 🤖) in bottom-right of chat area
// Click → opens slide-up panel (AI assistant chat)
// Panel shows streaming responses (typewriter effect as tokens arrive)
// "Summarize this channel" button in channel header (admin/member)
// Smart Reply chips: 3 suggestion chips below message input (click to fill input)
// Moderation: auto-flag messages with toxic content (show warning badge, hide by default)
```

**AI Command in chat (`/ai` slash command):**
```javascript
// In message input: detect text starting with /ai, /summarize, /translate
const SLASH_COMMANDS = {
  '/ai':        (args) => openAIAssistant(args),
  '/summarize': ()     => summarizeChannel(),
  '/translate': (lang) => setAutoTranslate(lang),
  '/giphy':     (query)=> searchGiphy(query),    // Giphy has free tier
};
```

---

### AI 2: Whisper.cpp — Voice-to-Text Transcription

**What it is:** OpenAI's Whisper model running locally, completely free.

**Add to docker-compose.yml:**
```yaml
whisper:
  image: onerahmet/openai-whisper-asr-webservice:latest
  ports: ["9000:9000"]
  environment:
    - ASR_MODEL=base.en      # small model, fast on CPU
    - ASR_ENGINE=openai_whisper
  volumes:
    - whisper_cache:/root/.cache/whisper
```

**chat-service: voice transcription on upload:**
```javascript
// When voice note is uploaded:
// POST to Whisper: multipart form with audio file
// Response: { text: "transcribed text here" }
// Store transcript alongside voice note in MongoDB

const transcribeAudio = async (audioBuffer, mimeType) => {
  const formData = new FormData();
  formData.append('audio_file', new Blob([audioBuffer], { type: mimeType }), 'audio.webm');
  formData.append('encode', 'true');
  formData.append('task', 'transcribe');
  formData.append('language', 'en');
  formData.append('output', 'json');

  const res = await fetch(`${process.env.WHISPER_URL}/asr`, {
    method: 'POST', body: formData,
  });
  const data = await res.json();
  return data.text;
};
```

**Frontend: Show transcript below voice note:**
```jsx
// VoiceMessageBubble: show "📝 Show transcript" button
// Expands to show transcript text (helps deaf/hard-of-hearing users)
// Also: real-time transcription while recording (live captions)
```

---

### AI 3: Hugging Face Inference API (Free Tier)

**What it is:** 30,000 free requests/month for 1000s of open-source models.

**ai-service: `src/services/huggingface.js`**
```javascript
const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_TOKEN = process.env.HF_API_TOKEN; // Free at huggingface.co

export const sentimentAnalysis = async (text) => {
  const res = await fetch(`${HF_API_URL}/cardiffnlp/twitter-roberta-base-sentiment-latest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text }),
  });
  return await res.json();
  // Returns: [{label: "POSITIVE"|"NEGATIVE"|"NEUTRAL", score: 0.99}]
};

export const textClassification = async (text, labels) => {
  // Zero-shot classification — categorize text without training
  const res = await fetch(`${HF_API_URL}/facebook/bart-large-mnli`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text, parameters: { candidate_labels: labels } }),
  });
  return await res.json();
};

export const generateImage = async (prompt) => {
  // Stable Diffusion XL — free on HF
  const res = await fetch(`${HF_API_URL}/stabilityai/stable-diffusion-xl-base-1.0`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt }),
  });
  const blob = await res.blob();
  return blob; // image/jpeg
};
```

**Features using HF models:**
- **Sentiment emoji:** Auto-add 😊/😤/😐 badge to messages based on sentiment
- **AI Image Generation:** `/imagine a sunset over mountains` → generates image via Stable Diffusion
- **Smart Notification Priority:** ML classifies if a message urgently needs your attention
- **Language Detection:** Auto-detect message language, show flag emoji

---

### AI 4: Smart Features Using Local Logic (No API Needed)

```javascript
// frontend/src/utils/smartFeatures.js

// 1. Smart Reply Suggestions (rule-based + Ollama)
// Detect question → suggest answers
// Detect greeting → suggest greetings back
// Fallback to Ollama for complex context

// 2. Typing Suggestions (localStorage-based ML)
// Store user's common phrases in IndexedDB
// Autocomplete as they type (like mobile keyboard)
const FrequencyModel = {
  learn: (message) => { /* update phrase frequency in IndexedDB */ },
  suggest: (prefix) => { /* return top 3 completions */ }
};

// 3. Smart Notifications (rule-based prioritization)
// Priority score: mentioned_you=10 + replied_to_your_message=8 + keyword_match=5
// + sent_by_close_collaborator=3 + in_active_channel=2
// Only show desktop notification if priority > threshold

// 4. Message Clustering (group similar topics)
// TF-IDF similarity between messages
// Show "5 related messages" link on search results

// 5. Auto-emoji Suggestions
// Detect keywords → suggest relevant emojis
const emojiKeywords = {
  happy: ['😊','🎉','😄'], sad: ['😢','💙','🤗'],
  fire: ['🔥','⚡','🚀'], code: ['💻','🖥️','⌨️']
};
```

---

## SECTION 3 — COMPLETE MISSING FEATURES LIST & IMPLEMENTATION

### M1. GIF Support (Giphy Free API)
```javascript
// Giphy has a FREE tier: 100 req/day, search + trending
// Sign up at developers.giphy.com — free API key
// REACT_APP_GIPHY_KEY=your-free-giphy-key

// frontend/src/components/chat/GiphyPicker.jsx
// Button: GIF icon in message toolbar
// Opens search panel: search input + trending GIFs grid (infinite scroll)
// Click GIF → sends as image message with giphy source URL
// No backend needed — direct Giphy CDN URLs
```

### M2. Message Scheduling
```javascript
// Schedule a message to be sent at a specific time
// UI: clock icon in message input → date/time picker
// Backend: store in MongoDB { content, channelId, sendAt, scheduledBy }
// Cron job (node-cron): check every minute, send due messages
// npm install node-cron
```

### M3. Polls & Voting
```javascript
// /poll "Best framework?" "React" "Vue" "Angular" "Svelte"
// MongoDB schema: Poll { question, options: [{text, votes: [userId]}], channelId, createdBy, endsAt }
// Real-time vote updates via Socket.io
// Results: horizontal bar chart (CSS only, animated fill)
// One vote per user, can change vote before deadline
```

### M4. Code Execution Sandbox (Judge0 — Free Self-Hosted)
```yaml
# docker-compose.yml:
judge0:
  image: judge0/judge0:1.13.0
  ports: ["2358:2358"]
  environment:
    REDIS_HOST: redis
    POSTGRES_HOST: postgres
```
```javascript
// In chat: code block has "▶ Run" button (if language is JS/Python/etc.)
// Sends code to Judge0 API → returns stdout/stderr
// Shows output below code block
// Time limit: 5 seconds, memory: 128MB
// Supported: 40+ languages
```

### M5. Whiteboard / Collaborative Drawing (tldraw — Open Source)
```bash
npm install @tldraw/tldraw
```
```jsx
// /whiteboard command → opens shared whiteboard panel
// Multiple users can draw simultaneously
// Sync via Socket.io (broadcast drawing operations)
// Save as PNG to MinIO, share in chat
```

### M6. Custom Emoji / Sticker Packs
```javascript
// Workspace admins can upload custom emoji (PNG, GIF, up to 512KB)
// Stored in MinIO: minio/emoji/{workspaceId}/{emojiName}.png
// Available in emoji picker under "Custom" tab
// :custom_emoji_name: syntax in messages
// Backend: POST /api/emoji (admin only), GET /api/emoji/{workspaceId}
```

### M7. Message Export
```javascript
// Export channel history as: JSON, CSV, or PDF
// PDF: use puppeteer (open source) to render HTML → PDF
// Rate limited: 1 export per hour per user
// Delivered as download via presigned MinIO URL
// Endpoint: POST /api/channels/:id/export → { downloadUrl }
```

### M8. Slash Commands Framework
```javascript
// frontend/src/utils/slashCommands.js
const commands = {
  '/gif':       { desc: 'Search GIFs',      action: (q) => openGiphySearch(q) },
  '/poll':      { desc: 'Create a poll',     action: (args) => openPollCreator(args) },
  '/ai':        { desc: 'Ask AI assistant',  action: (q) => openAIChat(q) },
  '/imagine':   { desc: 'Generate AI image', action: (p) => generateImage(p) },
  '/summarize': { desc: 'Summarize channel', action: () => summarizeChannel() },
  '/translate': { desc: 'Set auto-translate',action: (l) => setLanguage(l) },
  '/remind':    { desc: 'Set a reminder',    action: (args) => setReminder(args) },
  '/shrug':     { desc: '¯\\_(ツ)_/¯',     action: () => insertText('¯\\_(ツ)_/¯') },
  '/tableflip': { desc: '(╯°□°）╯',        action: () => insertText('(╯°□°）╯彡┻━┻') },
  '/code':      { desc: 'Insert code block', action: () => insertCodeBlock() },
  '/run':       { desc: 'Run code',          action: () => runCode() },
  '/whiteboard':{ desc: 'Open whiteboard',   action: () => openWhiteboard() },
  '/me':        { desc: 'Action text',       action: (t) => sendAction(t) },
};
// Show autocomplete dropdown when user types '/'
// Arrow keys to navigate, Enter to select, Esc to close
```

### M9. User Achievements & Gamification (Optional but Impressive)
```javascript
// Unlock badges based on activity:
const ACHIEVEMENTS = [
  { id: 'first_message',  name: 'First Words',    icon: '💬', condition: messages >= 1 },
  { id: 'century',        name: 'Century Club',   icon: '💯', condition: messages >= 100 },
  { id: 'early_adopter',  name: 'Early Adopter',  icon: '🚀', condition: joinedIn < launchDate + 7days },
  { id: 'helpful',        name: 'Helpful',        icon: '🤝', condition: reactionsReceived >= 50 },
  { id: 'night_owl',      name: 'Night Owl',      icon: '🦉', condition: messagesBetween2am6am >= 10 },
];
// Show badges on profile page + hover tooltip on username in chat
// Unlock animation: confetti + toast notification
```

### M10. Advanced Search Filters UI
```jsx
// frontend/src/components/search/SearchFilters.jsx
// Filter chips row (horizontal scroll on mobile):
// [📅 Date Range] [👤 From User] [#️⃣ In Channel] [📎 Has File] [🔗 Has Link] [🤖 From Bot]
// Each chip: click → opens mini dropdown with options
// Applied filters show as dismissible chips
// "Save search" button → save filter set for quick reuse
```

---

## SECTION 4 — DEVOPS ADDITIONS FOR NEW SERVICES 

### Make sure Follow the Industry Standard Folder Structures for all devops files slit them to maintain easy maintanence 
### New services to add to Kubernetes:
```yaml
# Add deployments for:
# - ai-service (Port 3006)
# - ollama (Port 11434) — NOTE: needs minimum 4GB RAM, may not fit t2.micro
#   Workaround: use ollama with smallest model (phi3.mini ~1.8GB) OR
#   use HuggingFace Inference API only (no local Ollama on free tier)
# - whisper (Port 9000) — needs 2GB RAM for base model
#   Workaround for free tier: only run Whisper on-demand (start/stop via script)
# - judge0 (Port 2358) — only if enough RAM

# Free tier RAM budget (t2.micro = 1GB):
# k3s overhead:   ~250MB
# chat-service:   ~80MB
# auth-service:   ~60MB
# user-service:   ~60MB
# notification:   ~40MB
# frontend+nginx: ~30MB
# redis:          ~30MB
# mongo:          ~100MB
# postgres:       ~80MB
# TOTAL:          ~730MB ← already tight!
# Ollama/Whisper: Need t3.medium (2GB RAM) — still free for 750hrs/month on t3.medium!

# RECOMMENDATION: Use t3.medium instead of t2.micro for k3s node
# t3.medium: 2 vCPU, 4GB RAM — still Free Tier eligible (750hrs/month)!
# Update terraform/ec2.tf: change k3s instance_type to "t3.medium"
```

**Update Terraform for t3.medium k3s node:**
```hcl
# terraform/ec2.tf — k3s instance
resource "aws_instance" "k3s" {
  instance_type = "t3.medium"  # 4GB RAM, still free tier eligible
  # ... rest unchanged
}
```

**Update Ansible for Ollama:**
```yaml
# ansible/playbooks/ollama.yml
- name: Install Ollama on k3s server
  hosts: k3s
  become: yes
  tasks:
    - name: Install Ollama
      shell: curl -fsSL https://ollama.ai/install.sh | sh
      args:
        creates: /usr/local/bin/ollama

    - name: Pull default model (phi3.mini — smallest, fastest)
      shell: ollama pull phi3.5:mini
      async: 600
      poll: 30

    - name: Configure Ollama service to start on boot
      systemd:
        name: ollama
        enabled: yes
        state: started
```

**Update Prometheus scrape for new services:**
```yaml
# Add to prometheus-config:
- job_name: 'ai-service'
  static_configs:
    - targets: ['ai-service:3006']

- job_name: 'ollama'
  static_configs:
    - targets: ['ollama:11434']
  metrics_path: /metrics
```

**New Grafana Dashboard: AI Usage Dashboard**
```json
// kubernetes/monitoring/ai-dashboard.json
// Panels:
// - AI requests per minute (Ollama)
// - Average response time (Ollama)
// - Voice transcriptions per day
// - Image generations per day
// - Moderation flags per day (pie chart by category)
// - HuggingFace API usage (remaining free quota)
```

---

## SECTION 5 — COMPLETE ENVIRONMENT VARIABLES (.env.example)

```env
# === Application ===
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:80
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80

# === Services Ports ===
AUTH_SERVICE_PORT=3001
CHAT_SERVICE_PORT=3002
USER_SERVICE_PORT=3003
NOTIFICATION_SERVICE_PORT=3004
CALL_SERVICE_PORT=3005
AI_SERVICE_PORT=3006

# === JWT ===
JWT_SECRET=change-this-to-a-256-bit-random-string-minimum
JWT_REFRESH_SECRET=change-this-to-another-256-bit-random-string
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# === PostgreSQL ===
DB_HOST=postgres
DB_PORT=5432
DB_NAME=chatapp
DB_USER=postgres
DB_PASSWORD=change-this-secure-password

# === MongoDB ===
MONGO_URI=mongodb://mongo:27017/chatdb
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=change-this-secure-password

# === Redis ===
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=change-this-redis-password

# === OAuth — Google (free at console.cloud.google.com) ===
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# === OAuth — GitHub (free at github.com/settings/developers) ===
GITHUB_CLIENT_ID=your-github-oauth-client-id
GITHUB_CLIENT_SECRET=your-github-oauth-client-secret

# === Email — Gmail SMTP (free) ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=ChatFlow <noreply@chatflow.app>

# === MinIO (self-hosted, free) ===
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=chatflow_admin
MINIO_SECRET_KEY=change-this-minio-secret
MINIO_ROOT_USER=chatflow_admin
MINIO_ROOT_PASSWORD=change-this-minio-password

# === Meilisearch (self-hosted, free) ===
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_MASTER_KEY=change-this-meilisearch-key

# === Ollama (self-hosted, free) ===
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=phi3.5:mini

# === Whisper (self-hosted, free) ===
WHISPER_URL=http://whisper:9000
WHISPER_MODEL=base.en

# === Hugging Face (free tier — 30k req/month) ===
HF_API_TOKEN=hf_your-free-token-from-huggingface-co

# === Giphy (free tier — 100 req/day) ===
REACT_APP_GIPHY_API_KEY=your-free-giphy-key

# === Judge0 (self-hosted, free) ===
JUDGE0_URL=http://judge0:2358
JUDGE0_AUTH_TOKEN=change-this-judge0-token

# === LibreTranslate (self-hosted, free) ===
LIBRETRANSLATE_URL=http://libretranslate:5000

# === Web Push VAPID (generate: npx web-push generate-vapid-keys) ===
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=admin@chatflow.app

# === AWS (free tier) ===
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
S3_BACKUP_BUCKET=chatflow-backups

# === mediasoup WebRTC ===
ANNOUNCED_IP=127.0.0.1
RTC_MIN_PORT=40000
RTC_MAX_PORT=49999

# === 2FA ===
TOTP_ISSUER=ChatFlow

# === Monitoring ===
GRAFANA_ADMIN_PASSWORD=change-this-grafana-password
MEILISEARCH_ADMIN_PASSWORD=change-this-password
```

---

## SECTION 6 — COMPLETE IMPLEMENTATION CHECKLIST

```
CRITICAL FIXES:
[ ] WebSocket connects successfully (test: open browser console, no socket errors)
[ ] Can send and receive messages in real-time
[ ] Can join/create chat rooms
[ ] Login works (email/password)
[ ] Register works (creates user in PostgreSQL)
[ ] OAuth works (Google + GitHub buttons redirect correctly)
[ ] JWT tokens persist across page refresh
[ ] No CORS errors in browser console
[ ] All database connections succeed on startup (check docker logs)
[ ] File upload works (drag image into chat, see it in message)
[ ] Password reset email sends
[ ] Email verification sends on register

MOBILE:
[ ] App usable on 375px width (iPhone SE)
[ ] App usable on 768px width (iPad)
[ ] Sidebar opens/closes with swipe gesture on mobile
[ ] Chat input stays above keyboard on iOS
[ ] All buttons are min 44×44px
[ ] Bottom nav bar visible on mobile
[ ] Landscape mode works
[ ] PWA: "Add to Home Screen" works on iOS/Android

UI/UX:
[ ] Skeleton screens show while loading (not blank)
[ ] Empty states have illustrations (not blank)
[ ] 404 page exists and looks good
[ ] All forms have validation with error messages
[ ] Toast notifications appear for actions
[ ] Loading spinners on async actions
[ ] Scroll to bottom button works
[ ] Message timestamps show on hover
[ ] Theme switcher works (dark/light/AMOLED)
[ ] Logo appears in navbar, login, favicon, browser tab

AI FEATURES:
[ ] Ollama starts and responds to chat requests
[ ] /ai command opens AI assistant in chat
[ ] Voice notes get transcribed by Whisper
[ ] "Summarize channel" button works
[ ] Smart reply suggestions appear
[ ] Content moderation flags toxic messages

DEVOPS:
[ ] All 7 services build without errors
[ ] docker-compose up starts everything successfully
[ ] All health checks pass
[ ] Prometheus scrapes all services
[ ] Grafana dashboards load with data
[ ] Loki shows logs from all services
[ ] Jenkins pipeline runs end-to-end
[ ] kubectl apply works for all manifests
```

---

## AGENT INSTRUCTIONS

Fix and implement everything in this exact order:

**STEP 1 — Fix all critical bugs first:**
Database connections → CORS → JWT/Auth → WebSocket → then everything else

**STEP 2 — Mobile responsiveness:**
Start with AppLayout.jsx → then ChatInput → then MessageList → then all modals

**STEP 3 — OAuth:**
Passport.js config → routes → frontend OAuth buttons → OAuthCallback page

**STEP 4 — Missing UI assets:**
Logo → AnimatedBackground → Skeleton screens → Empty states → 404 page

**STEP 5 — AI services:**
Ollama docker setup → ai-service → Whisper → HuggingFace integration

**STEP 6 — Missing features:**
GIF picker → Polls → Slash commands → Achievements → Code runner

**STEP 7 — DevOps updates:**
Update docker-compose → Terraform → K8s manifests → Prometheus → Scripts

**RULE:** Do NOT skip any step. Do NOT use placeholders.
Write COMPLETE, working code for every file. Test each fix before moving on.
Every component must handle: loading state, error state, empty state, mobile state.

---

*ChatFlow — Complete Fix & Upgrade | Open Source Only | AWS Free Tier*
*All AI: Ollama + Whisper + HuggingFace | All Storage: MinIO | All Search: Meilisearch*