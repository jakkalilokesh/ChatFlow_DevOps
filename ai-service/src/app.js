import express        from 'express';
import helmet         from 'helmet';
import cors           from 'cors';
import rateLimit      from 'express-rate-limit';
import jwt            from 'jsonwebtoken';
import client         from 'prom-client';
import { ollamaChat, ollamaGenerate, ollamaHealth } from './ollama/client.js';
import { sentimentAnalysis, generateImage, detectLanguage } from './services/huggingface.js';
import 'dotenv/config';

const app = express();

// ── Prometheus ───────────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const aiRequestsTotal = new client.Counter({
  name: 'ai_requests_total', help: 'Total AI requests',
  labelNames: ['endpoint', 'model'], registers: [register],
});
const aiLatency = new client.Histogram({
  name: 'ai_request_duration_seconds', help: 'AI request duration',
  labelNames: ['endpoint'], buckets: [0.1, 0.5, 1, 2, 5, 10, 30], registers: [register],
});

// ── Middleware ───────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || '*').split(','),
  credentials: true,
}));
app.use(express.json({ limit: '4mb' }));

const limiter = rateLimit({ windowMs: 60000, max: 30, message: { error: 'Rate limit exceeded' } });
app.use(limiter);

// ── JWT Auth Middleware ───────────────────────────────────
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET || 'change-me');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// ── Health / Metrics ─────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'ai-service', timestamp: new Date().toISOString() })
);

app.get('/ready', asyncHandler(async (req, res) => {
  const ollama = await ollamaHealth();
  res.json({ status: 'ready', ollama });
}));

app.get('/metrics', asyncHandler(async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}));

// ── POST /ai/chat — streaming AI assistant ───────────────
app.post('/ai/chat', requireAuth, asyncHandler(async (req, res) => {
  const { messages = [], channelContext = '' } = req.body;

  const systemMsg = {
    role:    'system',
    content: `You are a helpful AI assistant embedded in ChatFlow, a team chat platform. ${channelContext ? `The user is in the "${channelContext}" channel.` : ''} Be concise, friendly, and professional. Format code with markdown code blocks.`,
  };

  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const end = aiLatency.startTimer({ endpoint: 'chat' });
  aiRequestsTotal.inc({ endpoint: 'chat', model: process.env.OLLAMA_MODEL || 'phi3.5:mini' });

  try {
    await ollamaChat(
      [systemMsg, ...messages],
      (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
    );
    res.write('data: [DONE]\n\n');
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'AI unavailable: ' + err.message })}\n\n`);
  } finally {
    end();
    res.end();
  }
}));

// ── POST /ai/summarize ────────────────────────────────────
app.post('/ai/summarize', requireAuth, asyncHandler(async (req, res) => {
  const { messages = [], channelName = 'channel', type = 'channel' } = req.body;

  if (!messages.length) return res.json({ summary: 'No messages to summarize.' });

  const formatted = messages
    .slice(-50)
    .map((m) => `${m.username}: ${m.content}`)
    .join('\n');

  const prompt = `Summarize the following ${type} chat messages from "${channelName}" in 3-5 concise bullet points. Focus on key decisions, action items, and topics discussed:\n\n${formatted}\n\nSummary:`;

  const end = aiLatency.startTimer({ endpoint: 'summarize' });
  aiRequestsTotal.inc({ endpoint: 'summarize', model: 'ollama' });

  try {
    const summary = await ollamaGenerate(prompt);
    res.json({ summary: summary.trim() });
  } catch (err) {
    res.status(503).json({ error: 'Summarization failed: ' + err.message });
  } finally {
    end();
  }
}));

// ── POST /ai/suggest-reply ────────────────────────────────
app.post('/ai/suggest-reply', requireAuth, asyncHandler(async (req, res) => {
  const { lastMessages = [] } = req.body;
  const context  = lastMessages.slice(-5).map((m) => `${m.username}: ${m.content}`).join('\n');
  const prompt   = `Given this chat conversation:\n${context}\n\nSuggest 3 short, natural reply options (one line each, no numbering, no quotes):`;

  const end = aiLatency.startTimer({ endpoint: 'suggest-reply' });
  aiRequestsTotal.inc({ endpoint: 'suggest-reply', model: 'ollama' });

  try {
    const raw        = await ollamaGenerate(prompt);
    const suggestions = raw.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);
    res.json({ suggestions });
  } catch (err) {
    res.json({ suggestions: ['👍', 'Got it!', 'Thanks for sharing'] });
  } finally {
    end();
  }
}));

// ── POST /ai/moderate ─────────────────────────────────────
app.post('/ai/moderate', requireAuth, asyncHandler(async (req, res) => {
  const { content } = req.body;
  if (!content) return res.json({ isToxic: false, category: 'safe', confidence: 1 });

  const prompt = `Classify the following message as one of: "safe", "spam", "hate_speech", "harassment", "explicit". Reply with only the category word.\n\nMessage: "${content.slice(0, 500)}"\n\nCategory:`;

  const end = aiLatency.startTimer({ endpoint: 'moderate' });
  aiRequestsTotal.inc({ endpoint: 'moderate', model: 'ollama' });

  try {
    const category = (await ollamaGenerate(prompt)).trim().toLowerCase().replace(/[^a-z_]/g, '') || 'safe';
    const isToxic  = category !== 'safe';
    res.json({ isToxic, category, confidence: 0.85 });
  } catch {
    res.json({ isToxic: false, category: 'safe', confidence: 0.5 });
  } finally {
    end();
  }
}));

// ── POST /ai/sentiment ───────────────────────────────────
app.post('/ai/sentiment', requireAuth, asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text) return res.json({ label: 'NEUTRAL', score: 1, emoji: '😐' });

  const end = aiLatency.startTimer({ endpoint: 'sentiment' });
  aiRequestsTotal.inc({ endpoint: 'sentiment', model: 'hf' });

  try {
    const result = await sentimentAnalysis(text);
    const top    = result.sort((a, b) => b.score - a.score)[0];
    const emojiMap = { POSITIVE: '😊', NEGATIVE: '😔', NEUTRAL: '😐' };
    res.json({ label: top.label, score: top.score, emoji: emojiMap[top.label] || '😐' });
  } catch {
    res.json({ label: 'NEUTRAL', score: 0.5, emoji: '😐' });
  } finally {
    end();
  }
}));

// ── POST /ai/imagine — Stable Diffusion ─────────────────
app.post('/ai/imagine', requireAuth, asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const end = aiLatency.startTimer({ endpoint: 'imagine' });
  aiRequestsTotal.inc({ endpoint: 'imagine', model: 'sdxl' });

  try {
    const imageBuffer = await generateImage(prompt);
    res.setHeader('Content-Type', 'image/jpeg');
    res.send(Buffer.from(imageBuffer));
  } catch (err) {
    res.status(503).json({ error: 'Image generation failed: ' + err.message });
  } finally {
    end();
  }
}));

// ── POST /ai/translate ───────────────────────────────────
app.post('/ai/translate', requireAuth, asyncHandler(async (req, res) => {
  const { content, targetLanguage = 'English' } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });

  const prompt = `Translate the following text to ${targetLanguage}. Reply with only the translation, no explanation:\n\n${content}`;

  try {
    const translated = await ollamaGenerate(prompt);
    res.json({ translatedContent: translated.trim() });
  } catch (err) {
    res.status(503).json({ error: 'Translation failed: ' + err.message });
  }
}));

// ── Global Error Handler ─────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('AI service error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ────────────────────────────────────────────────
const PORT = parseInt(process.env.AI_SERVICE_PORT || '3006', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ AI service listening on port ${PORT}`);
});
