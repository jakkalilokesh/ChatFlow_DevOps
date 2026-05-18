'use strict';

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { createLogger, format, transports } = require('winston');
const client = require('prom-client');
require('dotenv').config();

// ── Logger ──────────────────────────────────────────────
const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.errors({ stack: true }), format.json()),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
});

// ── Prometheus ──────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const messagesSentTotal = new client.Counter({
  name: 'chat_messages_sent_total',
  help: 'Total messages sent through chat-service',
  labelNames: ['roomId'],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'chat_active_websocket_connections',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

// ── MongoDB Schemas ─────────────────────────────────────
const messageSchema = new mongoose.Schema(
  {
    roomId:          { type: String, index: true, default: null },
    dmId:            { type: String, index: true, default: null },
    senderId:        { type: String, required: true },
    senderUsername:  { type: String, required: true },
    senderAvatar:    { type: String, default: null },
    content:         { type: String, maxlength: 2000, default: '' },
    type:            { type: String, enum: ['text', 'image', 'voice', 'file', 'system'], default: 'text' },
    reactions:       [{ emoji: String, users: [String] }],
    replyTo:         { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    replyToContent:  { type: String, default: null },
    isEdited:        { type: Boolean, default: false },
    isDeleted:       { type: Boolean, default: false },
    editHistory:     [{ content: String, editedAt: Date }],
    // Thread support
    threadId:        { type: String, index: true, default: null },
    parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    replyCount:      { type: Number, default: 0 },
    lastReplyAt:     { type: Date, default: null },
    lastReplyBy:     { type: String, default: null },
    // File attachment
    attachment: {
      url:      String,
      name:     String,
      size:     Number,
      mimeType: String,
    },
    // Voice note
    voiceNote: {
      url:          String,
      duration:     Number,
      waveformData: [Number],
      mimeType:     String,
    },
    // Link preview
    linkPreview: {
      url:         String,
      title:       String,
      description: String,
      image:       String,
      siteName:    String,
      type:        String,
    },
    // E2EE for DMs
    isEncrypted:  { type: Boolean, default: false },
    ciphertext:   { type: String, default: null },
    nonce:        { type: String, default: null },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } }
);

messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ dmId: 1, createdAt: -1 });
messageSchema.index({ parentMessageId: 1, createdAt: 1 });

const roomSchema = new mongoose.Schema(
  {
    name:          { type: String, required: true, unique: true, trim: true, maxlength: 50 },
    description:   { type: String, default: '', maxlength: 200 },
    type:          { type: String, enum: ['public', 'private'], default: 'public' },
    members:       [{ type: String }],
    createdBy:     { type: String, required: true },
    memberCount:   { type: Number, default: 1 },
    lastMessage:   { type: String, default: '' },
    lastMessageAt: { type: Date, default: null },
    pinnedMessages:[{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    topic:         { type: String, default: '' },
    slowMode:      { type: Number, default: 0 },
    isLocked:      { type: Boolean, default: false },
  },
  { timestamps: true }
);

// DM Conversation schema
const dmConversationSchema = new mongoose.Schema(
  {
    participants:  [{ type: String }], // sorted [userId1, userId2]
    isEncrypted:   { type: Boolean, default: false },
    lastMessage:   { content: String, senderId: String, createdAt: Date },
  },
  { timestamps: true }
);
dmConversationSchema.index({ participants: 1 });

// Bookmark schema
const bookmarkSchema = new mongoose.Schema(
  {
    userId:    { type: String, required: true, index: true },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', required: true },
    channelId: { type: String },
    note:      { type: String, default: '' },
  },
  { timestamps: true }
);

const Message        = mongoose.model('Message', messageSchema);
const Room           = mongoose.model('Room', roomSchema);
const DmConversation = mongoose.model('DmConversation', dmConversationSchema);
const Bookmark       = mongoose.model('Bookmark', bookmarkSchema);

// ── Redis ───────────────────────────────────────────────
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 100, 3000),
};

const redisClient = new Redis(redisConfig);
const redisPub = new Redis(redisConfig);
const redisSub = new Redis(redisConfig);

redisClient.on('error', (err) => logger.error('Redis client error', { err: err.message }));

// ── JWT Auth ────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production-at-least-64-chars';

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// ── Express App ─────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use(limiter);

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Auth middleware for REST
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

// ── Socket.io ───────────────────────────────────────────
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

// ── Redis Pub/Sub — subscribed after connection in start() ─
redisSub.on('message', (channel, payload) => {
  if (channel === 'chat:message') {
    try {
      const data = JSON.parse(payload);
      // Route to the correct room: channel room (roomId) or DM conversation (dmId)
      const targetRoom = data.roomId || data.dmId;
      if (targetRoom) {
        io.to(targetRoom).emit('new-message', data.message);
      }
    } catch (err) {
      logger.error('Redis pub/sub parse error', { err: err.message });
    }
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  const { id: userId, username } = socket.user;
  activeConnections.inc();
  logger.info('Socket connected', { userId, socketId: socket.id });

  // Mark user online in Redis
  redisClient.hset('online:users', userId, Date.now()).catch(() => {});

  // join-room
  socket.on('join-room', async ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
    await redisClient.sadd(`room:${roomId}:members`, userId).catch(() => {});
    await redisClient.set(`user:${userId}:room`, roomId).catch(() => {});
    io.to(roomId).emit('user-joined', { userId, username, roomId });
    logger.info('User joined room', { userId, roomId });
  });

  // leave-room
  socket.on('leave-room', async ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    await redisClient.srem(`room:${roomId}:members`, userId).catch(() => {});
    io.to(roomId).emit('user-left', { userId, username, roomId });
  });

  // send-message
  socket.on('send-message', async ({ roomId, dmId, content, type = 'text', replyTo = null, voiceNote, attachment }) => {
    const targetId = roomId || dmId;
    if (!targetId || (!content?.trim() && !voiceNote && !attachment)) return;
    if (content && content.length > 2000) {
      socket.emit('error', { message: 'Message too long (max 2000 characters)' });
      return;
    }

    try {
      let replyToContent = null;
      if (replyTo) {
        const orig = await Message.findById(replyTo).select('content').lean();
        replyToContent = orig?.content || null;
      }

      const msgData = {
        senderId: userId,
        senderUsername: username,
        content: content?.trim() || '',
        type,
        replyTo: replyTo || null,
        replyToContent,
        ...(roomId ? { roomId } : { dmId }),
        ...(voiceNote ? { voiceNote } : {}),
        ...(attachment ? { attachment } : {}),
      };

      const message = await Message.create(msgData);

      if (roomId) {
        await Room.updateOne(
          { _id: roomId },
          { lastMessage: (content || 'Attachment').trim().slice(0, 80), lastMessageAt: new Date() }
        ).catch(() => {});
      }

      const msgObj = message.toObject();
      messagesSentTotal.inc({ roomId: targetId });

      await redisPub.publish('chat:message', JSON.stringify({ roomId: targetId, message: msgObj }));
      logger.info('Message sent', { userId, targetId, messageId: message._id });
    } catch (err) {
      logger.error('Error sending message', { err: err.message });
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // thread:reply — send a reply in a thread
  socket.on('thread:reply', async ({ parentMessageId, content, type = 'text' }) => {
    if (!parentMessageId || !content?.trim()) return;
    try {
      const parent = await Message.findById(parentMessageId);
      if (!parent) return;

      const reply = await Message.create({
        roomId: parent.roomId,
        dmId: parent.dmId,
        parentMessageId,
        senderId: userId,
        senderUsername: username,
        content: content.trim(),
        type,
      });

      // Update parent reply count
      await Message.updateOne(
        { _id: parentMessageId },
        { $inc: { replyCount: 1 }, lastReplyAt: new Date(), lastReplyBy: username }
      );

      const replyObj = reply.toObject();
      const targetRoom = parent.roomId || parent.dmId;
      io.to(targetRoom).emit('thread:new-reply', replyObj);
      io.to(targetRoom).emit('thread:updated', { parentMessageId, replyCount: parent.replyCount + 1 });
    } catch (err) {
      logger.error('thread:reply error', { err: err.message });
    }
  });

  // message:edit — edit own message via socket
  socket.on('message:edit', async ({ messageId, newContent }) => {
    if (!messageId || !newContent?.trim()) return;
    try {
      const message = await Message.findById(messageId);
      if (!message || message.senderId !== userId) return;
      message.editHistory.push({ content: message.content, editedAt: new Date() });
      message.content = newContent.trim();
      message.isEdited = true;
      await message.save();
      const targetRoom = message.roomId || message.dmId;
      io.to(targetRoom).emit('message:edited', message.toObject());
    } catch (err) {
      logger.error('message:edit error', { err: err.message });
    }
  });

  // user:presence — heartbeat to keep online status alive
  socket.on('user:presence', async ({ status = 'online', customEmoji, customText }) => {
    const presenceData = JSON.stringify({ status, customEmoji, customText, updatedAt: Date.now() });
    await redisClient.setex(`user:${userId}:status`, 1800, presenceData).catch(() => {});
  });

  // typing-start
  socket.on('typing-start', async ({ roomId }) => {
    if (!roomId) return;
    await redisClient.setex(`room:${roomId}:typing:${userId}`, 3, username).catch(() => {});
    socket.to(roomId).emit('user-typing', { userId, username, roomId });
  });

  // typing-stop
  socket.on('typing-stop', async ({ roomId }) => {
    if (!roomId) return;
    await redisClient.del(`room:${roomId}:typing:${userId}`).catch(() => {});
    socket.to(roomId).emit('user-stopped-typing', { userId, roomId });
  });

  // mark-read
  socket.on('mark-read', async ({ roomId }) => {
    if (!roomId) return;
    await redisClient.del(`unread:${userId}:${roomId}`).catch(() => {});
  });

  // disconnect
  socket.on('disconnect', async () => {
    activeConnections.dec();
    await redisClient.hdel('online:users', userId).catch(() => {});
    const currentRoom = await redisClient.get(`user:${userId}:room`).catch(() => null);
    if (currentRoom) {
      await redisClient.srem(`room:${currentRoom}:members`, userId).catch(() => {});
      io.to(currentRoom).emit('user-left', { userId, username, roomId: currentRoom });
    }
    logger.info('Socket disconnected', { userId, socketId: socket.id });
  });
});

// ── REST Endpoints ───────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'chat-service', timestamp: new Date().toISOString() });
});

app.get('/ready', asyncHandler(async (req, res) => {
  const dbState = mongoose.connection.readyState;
  if (dbState !== 1) throw new Error('MongoDB not connected');
  await redisClient.ping();
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
}));

app.get('/metrics', asyncHandler(async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}));

// GET /api/chat/rooms
app.get('/api/chat/rooms', authMiddleware, asyncHandler(async (req, res) => {
  const rooms = await Room.find({ type: 'public' }).sort({ lastMessageAt: -1 }).limit(50).lean();
  res.json({ rooms });
}));

// POST /api/chat/rooms
app.post('/api/chat/rooms', authMiddleware, asyncHandler(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(200).default(''),
    type: Joi.string().valid('public', 'private').default('public'),
  });

  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.details[0].message });

  const existing = await Room.findOne({ name: value.name });
  if (existing) return res.status(409).json({ message: 'Room name already in use' });

  const room = await Room.create({
    ...value,
    createdBy: req.user.id,
    members: [req.user.id],
    memberCount: 1,
  });

  res.status(201).json({ room });
}));

// GET /api/chat/rooms/:id
app.get('/api/chat/rooms/:id', authMiddleware, asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).lean();
  if (!room) return res.status(404).json({ message: 'Room not found' });

  // Get online members from Redis
  const members = await Promise.all(
    (room.members || []).slice(0, 50).map(async (uid) => {
      const isOnline = await redisClient.hexists('online:users', uid).catch(() => false);
      return { id: uid, isOnline: Boolean(isOnline) };
    })
  );

  res.json({ room, members });
}));

// GET /api/chat/rooms/:id/messages
app.get('/api/chat/rooms/:id/messages', authMiddleware, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ roomId: req.params.id, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Message.countDocuments({ roomId: req.params.id, isDeleted: false }),
  ]);

  res.json({
    messages: messages.reverse(),
    total,
    page,
    hasMore: skip + limit < total,
  });
}));

// POST /api/chat/messages/:id/react
app.post('/api/chat/messages/:id/react', authMiddleware, asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: 'Message not found' });

  const existing = message.reactions.find((r) => r.emoji === emoji);
  if (existing) {
    const idx = existing.users.indexOf(req.user.id);
    if (idx > -1) {
      existing.users.splice(idx, 1);
      if (existing.users.length === 0) {
        message.reactions = message.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      existing.users.push(req.user.id);
    }
  } else {
    message.reactions.push({ emoji, users: [req.user.id] });
  }

  await message.save();

  // Broadcast updated message to room
  io.to(message.roomId).emit('message-updated', message.toObject());

  res.json({ message: message.toObject() });
}));

// DELETE /api/chat/messages/:id
app.delete('/api/chat/messages/:id', authMiddleware, asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: 'Message not found' });
  if (message.senderId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

  message.isDeleted = true;
  message.content = 'This message was deleted';
  await message.save();

  io.to(message.roomId).emit('message-deleted', { messageId: message._id, roomId: message.roomId });

  res.json({ success: true });
}));

// PUT /api/chat/messages/:id  — edit message
app.put('/api/chat/messages/:id', authMiddleware, asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: 'Content required' });

  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: 'Message not found' });
  if (message.senderId !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

  message.editHistory.push({ content: message.content, editedAt: new Date() });
  message.content = content.trim();
  message.isEdited = true;
  await message.save();

  io.to(message.roomId).emit('message-edited', message.toObject());
  res.json({ message: message.toObject() });
}));

// GET /api/chat/messages/:id/thread  — load thread replies
app.get('/api/chat/messages/:id/thread', authMiddleware, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const skip = (page - 1) * limit;

  const [parent, replies, total] = await Promise.all([
    Message.findById(req.params.id).lean(),
    Message.find({ parentMessageId: req.params.id, isDeleted: false })
      .sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments({ parentMessageId: req.params.id, isDeleted: false }),
  ]);

  if (!parent) return res.status(404).json({ message: 'Message not found' });
  res.json({ parent, replies, total, hasMore: skip + limit < total });
}));

// GET /api/chat/link-preview — scrape OG tags for URL
app.get('/api/chat/link-preview', authMiddleware, asyncHandler(async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ message: 'URL required' });

  // Check Redis cache
  const cacheKey = `preview:${Buffer.from(url).toString('base64').slice(0, 40)}`;
  const cached = await redisClient.get(cacheKey).catch(() => null);
  if (cached) return res.json(JSON.parse(cached));

  try {
    // Dynamic import of open-graph-scraper (ESM)
    const { default: ogs } = await import('open-graph-scraper');
    const { result } = await ogs({ url, timeout: 5000, headers: { 'user-agent': 'ChatflowBot/1.0' } });

    let type = 'generic';
    if (url.includes('youtube.com') || url.includes('youtu.be')) type = 'youtube';
    else if (url.includes('github.com')) type = 'github';
    else if (url.includes('twitter.com') || url.includes('x.com')) type = 'twitter';

    const preview = {
      url,
      title: result.ogTitle || result.twitterTitle || '',
      description: result.ogDescription || result.twitterDescription || '',
      image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || '',
      siteName: result.ogSiteName || '',
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
      type,
    };

    await redisClient.setex(cacheKey, 86400, JSON.stringify(preview)).catch(() => {});
    res.json(preview);
  } catch {
    res.status(422).json({ message: 'Could not fetch preview for this URL' });
  }
}));

// POST /api/chat/translate — translate a message
app.post('/api/chat/translate', authMiddleware, asyncHandler(async (req, res) => {
  const { text, targetLang = 'en' } = req.body;
  if (!text) return res.status(400).json({ message: 'Text required' });

  try {
    const libreUrl = process.env.LIBRETRANSLATE_URL || 'http://libretranslate:5000';
    const response = await fetch(`${libreUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: 'auto', target: targetLang, format: 'text' }),
    });
    const data = await response.json();
    res.json({ translatedText: data.translatedText, detectedLang: data.detectedLanguage?.language || 'auto' });
  } catch {
    res.status(502).json({ message: 'Translation service unavailable' });
  }
}));

// ── DM Endpoints ─────────────────────────────────────────

// POST /api/dm/conversations — start or get DM with user
app.post('/api/dm/conversations', authMiddleware, asyncHandler(async (req, res) => {
  const { userId: otherUserId } = req.body;
  if (!otherUserId) return res.status(400).json({ message: 'userId required' });

  const participants = [req.user.id, otherUserId].sort();
  let conv = await DmConversation.findOne({ participants });
  if (!conv) {
    conv = await DmConversation.create({ participants, isEncrypted: true });
  }
  res.json({ conversation: conv });
}));

// GET /api/dm/conversations — list all DM conversations
app.get('/api/dm/conversations', authMiddleware, asyncHandler(async (req, res) => {
  const convs = await DmConversation.find({ participants: req.user.id }).sort({ updatedAt: -1 }).lean();
  res.json({ conversations: convs });
}));

// GET /api/dm/conversations/:id/messages — DM messages
app.get('/api/dm/conversations/:id/messages', authMiddleware, asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    Message.find({ dmId: req.params.id, isDeleted: false }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Message.countDocuments({ dmId: req.params.id, isDeleted: false }),
  ]);

  res.json({ messages: messages.reverse(), total, page, hasMore: skip + limit < total });
}));

// ── Bookmark Endpoints ────────────────────────────────────

app.post('/api/bookmarks', authMiddleware, asyncHandler(async (req, res) => {
  const { messageId, channelId, note } = req.body;
  const bm = await Bookmark.findOneAndUpdate(
    { userId: req.user.id, messageId },
    { userId: req.user.id, messageId, channelId, note: note || '' },
    { upsert: true, new: true }
  );
  res.json({ bookmark: bm });
}));

app.delete('/api/bookmarks/:messageId', authMiddleware, asyncHandler(async (req, res) => {
  await Bookmark.deleteOne({ userId: req.user.id, messageId: req.params.messageId });
  res.json({ success: true });
}));

app.get('/api/bookmarks', authMiddleware, asyncHandler(async (req, res) => {
  const bookmarks = await Bookmark.find({ userId: req.user.id }).sort({ createdAt: -1 }).populate('messageId').lean();
  res.json({ bookmarks });
}));

// ── Channel Pin Endpoints ─────────────────────────────────

app.post('/api/channels/:id/pin/:messageId', authMiddleware, asyncHandler(async (req, res) => {
  await Room.updateOne({ _id: req.params.id }, { $addToSet: { pinnedMessages: req.params.messageId } });
  io.to(req.params.id).emit('message:pinned', { messageId: req.params.messageId, channelId: req.params.id });
  res.json({ success: true });
}));

app.delete('/api/channels/:id/pin/:messageId', authMiddleware, asyncHandler(async (req, res) => {
  await Room.updateOne({ _id: req.params.id }, { $pull: { pinnedMessages: req.params.messageId } });
  res.json({ success: true });
}));

app.get('/api/channels/:id/pins', authMiddleware, asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('pinnedMessages').lean();
  res.json({ pins: room?.pinnedMessages || [] });
}));

// ── Admin Analytics ───────────────────────────────────────

app.get('/api/admin/stats', authMiddleware, asyncHandler(async (req, res) => {
  const [totalMessages] = await Promise.all([
    Message.countDocuments({ isDeleted: false }),
  ]);
  const onlineCount = await redisClient.hlen('online:users').catch(() => 0);
  res.json({ totalUsers: 0, activeToday: onlineCount, totalMessages, storageUsed: 0 });
}));

app.get('/api/admin/top-channels', authMiddleware, asyncHandler(async (req, res) => {
  const channels = await Message.aggregate([
    { $match: { isDeleted: false, roomId: { $ne: null } } },
    { $group: { _id: '$roomId', messageCount: { $sum: 1 } } },
    { $sort: { messageCount: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'rooms', localField: '_id', foreignField: '_id', as: 'room' } },
    { $project: { channel: { $arrayElemAt: ['$room.name', 0] }, messageCount: 1 } },
  ]);
  res.json({ channels });
}));

app.get('/api/admin/messages-over-time', authMiddleware, asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days || '30', 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const data = await Message.aggregate([
    { $match: { createdAt: { $gte: since }, isDeleted: false } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $project: { date: '$_id', count: 1, _id: 0 } },
  ]);
  res.json({ data });
}));

app.get('/api/admin/user-growth', authMiddleware, asyncHandler(async (req, res) => {
  res.json({ data: [] }); // Populated from user-service in future
}));

app.get('/api/admin/members', authMiddleware, asyncHandler(async (req, res) => {
  res.json({ members: [] }); // Populated from user-service in future
}));


// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, path: req.path });
  res.status(500).json({ message: 'Internal server error' });
});

// ── Startup ──────────────────────────────────────────────
const PORT = parseInt(process.env.CHAT_SERVICE_PORT || '3002', 10);

async function start() {
  try {
    // Connect all Redis instances before subscribing
    await redisClient.connect();
    await redisPub.connect();
    await redisSub.connect();

    // Subscribe AFTER connection is established
    redisSub.subscribe('chat:message', (err) => {
      if (err) logger.error('Redis subscribe error', { err: err.message });
      else logger.info('Subscribed to chat:message channel');
    });

    const mongoUser = process.env.MONGO_INITDB_ROOT_USERNAME || 'chatflow_user';
    const mongoPass = process.env.MONGO_INITDB_ROOT_PASSWORD || 'password';
    const mongoDb = process.env.MONGO_INITDB_DATABASE || 'chatflow';
    const mongoUri = process.env.MONGO_URI || `mongodb://${mongoUser}:${mongoPass}@mongo:27017/${mongoDb}?authSource=admin`;
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected');

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Chat service listening on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Startup failed', { error: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await mongoose.disconnect().catch(() => {});
  await redisClient.quit().catch(() => {});
  await redisPub.quit().catch(() => {});
  await redisSub.quit().catch(() => {});
  process.exit(0);
});

start();
