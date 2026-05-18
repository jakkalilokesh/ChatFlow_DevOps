// frontend/src/utils/smartFeatures.js
// Local ML-like smart features — no external API needed.

// ── 1. Emoji keyword suggestions ─────────────────────────
const EMOJI_MAP = {
  happy: ['😊','🎉','😄'], sad: ['😢','💙','🤗'],
  fire:  ['🔥','⚡','🚀'], code: ['💻','🖥️','⌨️'],
  love:  ['❤️','💕','🥰'], thanks: ['🙏','👍','🤝'],
  done:  ['✅','🎯','💪'], error: ['🐛','❌','⚠️'],
  idea:  ['💡','🧠','✨'], meet:  ['📅','🤝','📞'],
  money: ['💰','💵','📈'], ship:  ['🚢','🚀','📦'],
};

export function suggestEmojis(text) {
  const lower = text.toLowerCase();
  for (const [keyword, emojis] of Object.entries(EMOJI_MAP)) {
    if (lower.includes(keyword)) return emojis;
  }
  return [];
}

// ── 2. Smart notification priority ───────────────────────
export function notificationPriority(message, currentUserId, activeChannelId) {
  let score = 0;
  if (message.mentions?.includes(currentUserId))           score += 10;
  if (message.replyToSenderId === currentUserId)           score += 8;
  if (message.channelId === activeChannelId)               score -= 5; // already visible
  if (/urgent|asap|immediately|critical/i.test(message.content)) score += 5;
  return score;
}

// ── 3. Typing autocomplete (IndexedDB frequency model) ───
const DB_NAME    = 'chatflow_phrases';
const STORE_NAME = 'phrases';

function openPhraseDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME, { keyPath: 'phrase' });
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = reject;
  });
}

export async function learnPhrase(message) {
  if (!message || message.length > 200) return;
  const words = message.trim().split(/\s+/);
  if (words.length < 2) return;
  try {
    const db  = await openPhraseDB();
    const tx  = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const phrase = words.slice(0, 4).join(' ');
    const existing = await new Promise((r) => { const req = store.get(phrase); req.onsuccess = () => r(req.result); });
    store.put({ phrase, count: (existing?.count || 0) + 1 });
  } catch { /* non-critical */ }
}

export async function suggestCompletion(prefix) {
  if (!prefix || prefix.length < 3) return [];
  try {
    const db    = await openPhraseDB();
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const all   = await new Promise((r) => { const req = store.getAll(); req.onsuccess = () => r(req.result); });
    return all
      .filter((p) => p.phrase.toLowerCase().startsWith(prefix.toLowerCase()))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((p) => p.phrase);
  } catch { return []; }
}

// ── 4. Smart reply suggestions (rule-based) ──────────────
export function getSmartReplies(lastMessage) {
  if (!lastMessage) return [];
  const text = lastMessage.toLowerCase();

  if (/\?$/.test(text.trim()))   return ['Yes!', 'Not sure, let me check', 'Can you share more details?'];
  if (/thank/.test(text))        return ['You\'re welcome! 😊', 'Happy to help!', 'Anytime!'];
  if (/hello|hi|hey/.test(text)) return ['Hey! 👋', 'Hi there!', 'Hello!'];
  if (/done|completed|finished/.test(text)) return ['Great job! 🎉', 'Awesome!', 'Thanks for the update'];
  if (/meeting|call|sync/.test(text))       return ['I\'ll be there!', 'What time works?', 'Can you send a calendar invite?'];
  return ['👍', 'Got it!', 'Thanks for sharing'];
}

// ── 5. Language detection (simple heuristic) ─────────────
const LANG_PATTERNS = {
  es: /\b(hola|gracias|por favor|buenos|días|señor)\b/i,
  fr: /\b(bonjour|merci|s'il vous plaît|oui|non|très)\b/i,
  de: /\b(danke|bitte|guten|morgen|abend|ja|nein)\b/i,
  ja: /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/,
  zh: /[\u4e00-\u9fff]{2,}/,
  ar: /[\u0600-\u06ff]{2,}/,
};

export function detectLanguage(text) {
  for (const [lang, pattern] of Object.entries(LANG_PATTERNS)) {
    if (pattern.test(text)) return lang;
  }
  return 'en';
}
