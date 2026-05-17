## CONTEXT: EXISTING PROJECT
 
You are working on an **existing** project called **ChatFlow** — a Real-Time Chat Application
built with the following stack:
 
- **Frontend:** React.js + Framer Motion + Tailwind CSS + Socket.io-client
- **Backend:** 5 Node.js microservices (Auth, Chat, User, Notification, API Gateway/Nginx)
- **Databases:** PostgreSQL + MongoDB + Redis
- **DevOps:** Docker + k3s (Kubernetes) + Jenkins + Terraform + Ansible + Prometheus + Grafana + Loki
Your job is to **add all the features listed below** to the existing codebase without breaking anything.
Work on ALL features in parallel — frontend components, backend APIs, Socket.io events,
database schema changes, and Kubernetes manifests at the same time.
 
---
 
## OPEN-SOURCE TOOL REPLACEMENTS (No paid services)
 
Use ONLY these open-source/free alternatives:
 
| Feature | Use Instead Of |
|---------|---------------|
| Video/Voice Calls | **mediasoup** (open-source WebRTC SFU) — NOT Twilio |
| File Storage | **MinIO** (self-hosted S3-compatible) — NOT AWS S3 paid |
| Link Preview Scraping | **open-graph-scraper** npm package — NOT LinkPreview API |
| 2FA / TOTP | **otplib** npm package — NOT Authy paid API |
| E2EE Encryption | **libsodium-wrappers** (TweetNaCl.js) — NOT paid SDK |
| Full-Text Search | **Meilisearch** (self-hosted, Docker) — NOT Algolia |
| Code Syntax Highlighting | **Prism.js** — NOT paid highlight service |
| Markdown Rendering | **marked** + **DOMPurify** — NOT paid CMS |
| Analytics Charts | **Recharts** (already installed) — NOT paid analytics |
| Push Notifications | **web-push** npm + VAPID keys — NOT Firebase |
| Email (2FA codes) | **Nodemailer** + Gmail SMTP free — NOT SendGrid paid |
| Video Compression | **ffmpeg** (Docker sidecar) — NOT paid transcoding |
| Avatar Storage | **MinIO** (self-hosted) — NOT Cloudinary paid |
 
---
 
## FEATURE GROUP A — NEXT-LEVEL MESSAGING (Implement in Parallel)
 
---
 
### A1. Voice & Video Calling (WebRTC + mediasoup)
 
**Packages to install:**
```
# chat-service
npm install mediasoup socket.io-mediasoup
 
# frontend
npm install mediasoup-client
```
 
**New microservice: `call-service/` (Port 3005)**
 
Create a dedicated Node.js microservice for WebRTC signaling and mediasoup SFU:
 
```
call-service/
├── src/
│   ├── app.js                  ← Express + Socket.io server
│   ├── mediasoup/
│   │   ├── worker.js           ← Create mediasoup Worker (1 per CPU core)
│   │   ├── router.js           ← Create Router per room with RTP capabilities
│   │   ├── transport.js        ← WebRTC transports (send + recv per peer)
│   │   └── producer-consumer.js← Audio/video producers and consumers
│   ├── rooms/
│   │   └── RoomManager.js      ← In-memory Map of active call rooms
│   ├── socket/
│   │   └── callEvents.js       ← All Socket.io call event handlers
│   └── config/
│       └── mediasoup.config.js ← Codec capabilities, transport options
├── Dockerfile
└── package.json
```
 
**Socket.io Events to implement:**
 
```javascript
// Client → Server (call signaling)
'call:initiate'        → { roomId, callType: 'audio'|'video'|'screen' }
'call:join'            → { callRoomId }
'call:leave'           → { callRoomId }
'call:end'             → { callRoomId }           // initiator ends for all
'webrtc:get-rtp-capabilities' → { callRoomId }    // Step 1: get router capabilities
'webrtc:create-transport'     → { callRoomId, direction: 'send'|'recv' }
'webrtc:connect-transport'    → { transportId, dtlsParameters }
'webrtc:produce'              → { transportId, kind, rtpParameters, appData }
'webrtc:consume'              → { producerId, transportId, rtpCapabilities }
'call:toggle-audio'    → { callRoomId, muted: boolean }
'call:toggle-video'    → { callRoomId, hidden: boolean }
'call:screen-share'    → { callRoomId, sharing: boolean }
 
// Server → Client
'call:incoming'        → { callRoomId, callerId, callerName, callType }
'call:participant-joined' → { userId, username, avatar }
'call:participant-left'   → { userId }
'call:ended'              → {}
'call:declined'           → { userId }
'webrtc:rtp-capabilities' → { rtpCapabilities }
'webrtc:transport-created' → { id, iceParameters, iceCandidates, dtlsParameters }
'webrtc:new-producer'      → { producerId, peerId, kind }
```
 
**mediasoup.config.js:**
```javascript
module.exports = {
  worker: {
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
    logLevel: 'warn',
    logTags: ['info', 'ice', 'dtls', 'rtp']
  },
  router: {
    mediaCodecs: [
      { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
      { kind: 'video', mimeType: 'video/VP8',  clockRate: 90000,
        parameters: { 'x-google-start-bitrate': 1000 } },
      { kind: 'video', mimeType: 'video/H264', clockRate: 90000,
        parameters: { 'packetization-mode': 1, 'profile-level-id': '4d0032',
                      'level-asymmetry-allowed': 1 } }
    ]
  },
  webRtcTransport: {
    listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP }],
    maxIncomingBitrate: 1500000,
    initialAvailableOutgoingBitrate: 1000000
  }
}
```
 
**Frontend Call UI Components:**
 
```
frontend/src/components/calls/
├── CallButton.jsx         ← Camera + Phone icons in chat header
├── CallModal.jsx          ← Full-screen call overlay (dark glassmorphism)
├── CallControls.jsx       ← Mute, camera off, screen share, end call buttons
├── ParticipantGrid.jsx    ← CSS Grid of video tiles (auto-layout: 1→2→4 tiles)
├── VideoTile.jsx          ← Individual participant video + name badge
├── AudioCallScreen.jsx    ← Audio-only view with avatar circles and waveform
├── IncomingCallAlert.jsx  ← Toast-style alert with Accept/Decline buttons
├── ScreenSharePreview.jsx ← Small floating preview of your screen share
└── hooks/
    ├── useMediasoup.js    ← mediasoup-client Device, Transport management
    ├── useLocalMedia.js   ← getUserMedia, device switching
    └── useCallState.js    ← Global call state (Zustand store)
```
 
**CallModal.jsx design:**
- Full-screen dark overlay (rgba 5,5,15, 0.95)
- Floating glassmorphism call card for 1:1 calls (avatar, name, duration timer)
- CSS Grid for group calls: auto-calculates columns (1 person = centered, 2 = side by side, 3-4 = 2x2 grid, 5+ = 3-column)
- Control bar at bottom: Mute (🎤), Camera (📷), Screen Share (🖥️), Effects (✨), End Call (🔴)
- Each control button: circle 52px, glassmorphism bg, icon 24px, hover scale animation
- End call button: red gradient background, shake animation on hover
- Floating duration timer in top-right corner
- Speaking indicator: glowing green border on active speaker's tile (detect via audio level API)
**Kubernetes manifest additions:**
 
```yaml
# kubernetes/deployments/call-service.yaml
# Add to security groups (terraform): UDP 40000-49999 (mediasoup RTP)
# Add ENV: ANNOUNCED_IP = k3s elastic IP (from terraform output)
```
 
---
 
### A2. Voice Notes / Audio Messages
 
**Packages:**
```
npm install lamejs recorder-js  # frontend — MP3 encoding in browser
npm install fluent-ffmpeg       # chat-service — audio processing
```
 
**Frontend: `frontend/src/components/chat/VoiceRecorder.jsx`**
 
Complete implementation:
 
```javascript
// State machine: idle → recording → processing → preview → sent
// UI States:
// IDLE:       Microphone icon button (animated breathing glow when available)
// RECORDING:  Red pulsing record button + waveform visualizer (Canvas API)
//             + duration counter (MM:SS) + Cancel button
// PREVIEW:    Audio player with waveform thumbnail + Send / Re-record buttons
// SENT:       Voice message bubble with playback controls in chat
 
// Waveform visualizer: use Web Audio API AnalyserNode
// - Connect MediaStream → AudioContext → AnalyserNode → Canvas
// - requestAnimationFrame loop: getByteTimeDomainData → draw bars
// - Bar colors: gradient from #6c63ff to #4ecdc4
 
// Recording flow:
// 1. navigator.mediaDevices.getUserMedia({ audio: true })
// 2. new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
// 3. Collect chunks → Blob → File
// 4. Upload to MinIO via user-service /upload/audio endpoint
// 5. Emit socket event: send-message with type: 'voice', audioUrl, duration
 
// Voice message bubble in chat:
// - Waveform bars (static, pre-generated on upload) as decoration
// - Play/pause button (animated morphing icon)
// - Duration display
// - Download button
// - Playback speed toggle: 1x / 1.5x / 2x
```
 
**chat-service additions:**
```javascript
// New message type: 'voice'
// Schema addition to Message model:
voiceNote: {
  url: String,         // MinIO URL
  duration: Number,    // seconds
  waveformData: [Number], // array of 40 amplitude values for visual
  mimeType: String     // 'audio/webm' or 'audio/mp3'
}
 
// Add to send-message handler:
if (message.type === 'voice') {
  // Validate audioUrl is from our MinIO instance
  // Store voiceNote data in MongoDB
  // No text content required
}
```
 
---
 
### A3. Rich Media Link Previews
 
**Packages:**
```
npm install open-graph-scraper  # chat-service — scrape OG tags
npm install cheerio             # fallback HTML scraping
npm install node-cache          # cache previews (avoid re-scraping same URL)
```
 
**chat-service: `src/services/linkPreview.service.js`**
 
```javascript
// Detect URLs in message content using regex
// For each unique URL:
//   1. Check Redis cache (key: preview:<base64url>, TTL: 24h)
//   2. If miss: scrape with open-graph-scraper (timeout: 5000ms)
//   3. Fallback: cheerio to get <title> and <meta description>
//   4. Store in Redis cache
//   5. Return preview data
 
// Preview object shape:
{
  url: String,
  title: String,
  description: String,
  image: String,       // OG image URL
  siteName: String,    // e.g. "YouTube", "GitHub"
  favicon: String,     // favicon URL
  type: 'youtube'|'github'|'twitter'|'generic'
}
 
// Special handling per platform:
// YouTube: extract video ID → thumbnail: https://img.youtube.com/vi/{id}/hqdefault.jpg
//          embed URL for video player on expand
// GitHub:  show repo stats (stars, language, description) via GitHub public API
// Twitter/X: use OG tags (public tweets only, no auth required)
```
 
**Frontend: `frontend/src/components/chat/LinkPreviewCard.jsx`**
```javascript
// Design: glassmorphism card below message text
// Layout: image on left (120px) + title/description/site-name on right
// YouTube special: shows video thumbnail with play button overlay
//                  clicking opens embedded player in modal (no iframe autoplay)
// GitHub special: shows repo name, description, star count, primary language badge
// Generic: title + description + favicon + domain
// Animation: slide down + fade in (0.3s) after message appears
// Hover: slight lift (translateY -2px) with shadow
// Close button: ✕ to dismiss the preview (stored in localStorage per URL)
```
 
---
 
### A4. Message Threads (Slack-style)
 
**Database schema addition (MongoDB):**
```javascript
// Add to Message model:
threadId: { type: String, index: true },   // null = root message
replyCount: { type: Number, default: 0 },
lastReplyAt: { type: Date },
lastReplyBy: { type: String },             // username of last replier
parentMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' }
```
 
**chat-service: New Socket.io events:**
```javascript
'thread:open'          → { messageId }                 // open thread panel
'thread:reply'         → { parentMessageId, content, type } // send reply
'thread:load'          → { parentMessageId, page, limit }   // load replies
'thread:updated'       → { parentMessageId, replyCount }    // broadcast to room
```
 
**New REST endpoint:**
```
GET /api/chat/messages/:id/thread?page=1&limit=50
→ Returns parent message + paginated replies
```
 
**Frontend: `frontend/src/components/chat/ThreadPanel.jsx`**
```javascript
// Slides in from the RIGHT side of the chat area
// Width: 360px, glassmorphism panel, border-left
// Animation: translateX(100%) → translateX(0) in 0.3s ease
// Header: "Thread" title + parent message preview + close button
// Body: scrollable reply list (same message bubble design as main chat)
// Footer: reply input box (same as main chat input, mini version)
// When thread panel is open: main chat area shrinks (CSS transition)
// Thread reply count badge on parent message (e.g. "4 replies, 2h ago")
// Clicking reply count badge opens thread panel
// Reply notification: if user replied to thread, show badge in room list
```
 
---
 
### A5. Markdown & Code Snippet Rendering
 
**Packages:**
```
npm install marked dompurify prismjs  # frontend
npm install highlight.js               # alternative/additional
```
 
**Frontend: `frontend/src/utils/messageRenderer.js`**
```javascript
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
// Import Prism languages:
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-dockerfile';
 
// Configure marked renderer:
const renderer = new marked.Renderer();
 
// Code blocks: wrap in Prism-highlighted pre+code, add copy button + language badge
renderer.code = (code, language) => {
  const highlighted = language && Prism.languages[language]
    ? Prism.highlight(code, Prism.languages[language], language)
    : escapeHtml(code);
  return `
    <div class="code-block">
      <div class="code-block-header">
        <span class="code-lang">${language || 'text'}</span>
        <button class="copy-btn" data-code="${escapeAttr(code)}">Copy</button>
      </div>
      <pre class="language-${language}"><code>${highlighted}</code></pre>
    </div>
  `;
};
 
// Links: open in new tab, rel noopener
renderer.link = (href, title, text) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
 
marked.setOptions({ renderer, breaks: true, gfm: true });
 
export const renderMessage = (content) => {
  const raw = marked.parse(content);
  return DOMPurify.sanitize(raw, { ADD_ATTR: ['data-code'] });
};
```
 
**Frontend: Markdown Toolbar in message input**
```javascript
// Toolbar buttons above input (show on focus):
// B (bold) | I (italic) | ` (inline code) | ``` (code block) | > (quote)
// Each button wraps selected text with markdown syntax
// Keyboard shortcuts: Ctrl+B, Ctrl+I, Ctrl+` 
// The input area shows a "Preview" toggle to see rendered markdown before sending
// Code blocks in input: monospace font, different background
```
 
**CSS for code blocks (dark theme):**
```css
.code-block { background: #0d1117; border-radius: 8px; overflow: hidden; }
.code-block-header { display: flex; justify-content: space-between;
                     padding: 8px 16px; background: #161b22; }
.code-lang { color: #8b949e; font-size: 12px; font-family: monospace; }
.copy-btn { background: none; border: 1px solid #30363d; color: #8b949e;
            border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 12px; }
.copy-btn:hover { background: #21262d; color: #fff; }
pre[class*="language-"] { margin: 0; padding: 16px; overflow-x: auto; }
/* Use Prism Okaidia or One Dark theme CSS */
```
 
---
 
## FEATURE GROUP B — UI/UX & PRODUCTIVITY (Implement in Parallel)
 
---
 
### B1. Command Palette (Ctrl+K)
 
**Frontend: `frontend/src/components/CommandPalette.jsx`**
 
```javascript
// Global keyboard listener: Ctrl+K or Cmd+K → open/close
// Esc → close
 
// Design: centered modal overlay (backdrop blur)
// Modal: 600px wide, dark glassmorphism, rounded-2xl
// Top: search input with magnifier icon (auto-focused on open)
// Below input: scrollable results list
 
// Commands and search categories:
const categories = {
  'Jump to Channel': rooms.map(r => ({ icon: '#', label: r.name, action: () => navigate(`/chat/${r.id}`) })),
  'Direct Messages': dms.map(u => ({ icon: <Avatar/>, label: u.username, action: () => openDM(u) })),
  'Recent': recentVisited.slice(0, 5),
  'Actions': [
    { icon: '🔔', label: 'Toggle Notifications', shortcut: 'Alt+N' },
    { icon: '🎨', label: 'Change Theme' },
    { icon: '🔍', label: 'Search Messages', shortcut: 'Ctrl+F' },
    { icon: '⚙️', label: 'Open Settings' },
    { icon: '📞', label: 'Start a Call' },
    { icon: '🔇', label: 'Mute Channel' },
    { icon: '📌', label: 'View Pinned Messages' },
  ]
}
 
// Filtering: fuzzy search (use fuse.js) across all categories simultaneously
// Navigation: Up/Down arrows scroll through results, Enter executes
// Each result item: icon (left) + label + description (right) + shortcut badge
// Selected item: glassmorphism highlight with left gradient border
 
// Animation: scale(0.95)+opacity(0) → scale(1)+opacity(1) in 150ms
// Results animate in with stagger (each item: 30ms delay)
 
// Install: npm install fuse.js
```
 
**Global keyboard shortcuts (implement in `useKeyboardShortcuts.js`):**
```javascript
const shortcuts = {
  'Ctrl+K':       () => toggleCommandPalette(),
  'Ctrl+F':       () => toggleGlobalSearch(),
  'Escape':       () => { closeModals(); markChannelRead(); },
  'ArrowUp':      () => editLastMessage(),     // in empty input only
  'Alt+ArrowUp':  () => navigateToPrevChannel(),
  'Alt+ArrowDown':() => navigateToNextChannel(),
  'Ctrl+Shift+M': () => toggleMute(),
  'Ctrl+Shift+D': () => toggleDoNotDisturb(),
  'Alt+N':        () => openNotificationSettings(),
  'Ctrl+/':       () => showShortcutsModal(),
}
```
 
---
 
### B2. Customizable Themes
 
**Frontend: `frontend/src/context/ThemeContext.jsx`**
 
```javascript
// Theme system using CSS custom properties (variables)
// Stored in localStorage + synced to user preferences in DB
 
const themes = {
  dark: {
    '--bg-primary':    '#0a0f1e',
    '--bg-secondary':  '#111827',
    '--bg-tertiary':   '#1f2937',
    '--text-primary':  '#f9fafb',
    '--text-secondary':'#9ca3af',
    '--border':        'rgba(255,255,255,0.08)',
  },
  light: {
    '--bg-primary':    '#ffffff',
    '--bg-secondary':  '#f3f4f6',
    '--bg-tertiary':   '#e5e7eb',
    '--text-primary':  '#111827',
    '--text-secondary':'#6b7280',
    '--border':        'rgba(0,0,0,0.08)',
  },
  amoled: {
    '--bg-primary':    '#000000',
    '--bg-secondary':  '#0a0a0a',
    '--bg-tertiary':   '#111111',
    '--text-primary':  '#ffffff',
    '--text-secondary':'#888888',
    '--border':        'rgba(255,255,255,0.05)',
  }
}
 
const accents = {
  'Ocean Blue':    { '--accent': '#3b82f6', '--accent-2': '#06b6d4', '--accent-glow': 'rgba(59,130,246,0.3)' },
  'Neon Purple':   { '--accent': '#8b5cf6', '--accent-2': '#6c63ff', '--accent-glow': 'rgba(139,92,246,0.3)' },
  'Emerald Green': { '--accent': '#10b981', '--accent-2': '#059669', '--accent-glow': 'rgba(16,185,129,0.3)' },
  'Coral Red':     { '--accent': '#ef4444', '--accent-2': '#f97316', '--accent-glow': 'rgba(239,68,68,0.3)' },
  'Rose Pink':     { '--accent': '#ec4899', '--accent-2': '#f43f5e', '--accent-glow': 'rgba(236,72,153,0.3)' },
  'Amber Gold':    { '--accent': '#f59e0b', '--accent-2': '#fbbf24', '--accent-glow': 'rgba(245,158,11,0.3)' },
}
 
// Theme switcher UI: `frontend/src/components/settings/ThemePicker.jsx`
// - 3 base theme cards (Dark/Light/AMOLED) with preview miniature
// - 6 accent color swatches (circular, colored)
// - Live preview: changing accent updates the page instantly (no reload)
// - Smooth transition: apply transition: all 0.3s ease to :root
// - Theme change animation: brief ripple effect from click point
```
 
---
 
### B3. Drag-and-Drop File Uploads (MinIO)
 
**New microservice addition: MinIO (Docker)**
 
Add to docker-compose.yml:
```yaml
minio:
  image: minio/minio:latest
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: ${MINIO_ROOT_USER}
    MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
  ports:
    - "9000:9000"
    - "9001:9001"  # MinIO console
  volumes:
    - minio_data:/data
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 30s
    timeout: 20s
    retries: 3
```
 
Add to Kubernetes:
```yaml
# kubernetes/deployments/minio.yaml
# Single replica, 5Gi PVC, NodePort 32002 for MinIO console
# Create buckets on startup: avatars, attachments, voice-notes, thumbnails
# CORS policy: allow GET from * (public read for media)
# Presigned URL approach: backend generates presigned PUT URL → frontend uploads directly
```
 
**user-service: `src/services/minio.service.js`**
```javascript
import * as Minio from 'minio';  // npm install minio
 
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,    // 'minio' in k8s
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});
 
// Initialize buckets on startup:
const BUCKETS = ['avatars', 'attachments', 'voice-notes', 'thumbnails'];
 
// Methods:
// getPresignedUploadUrl(bucket, objectName, expiry=300) → URL for direct browser upload
// getPresignedDownloadUrl(bucket, objectName, expiry=3600) → URL for download
// deleteObject(bucket, objectName) → delete file
// getPublicUrl(bucket, objectName) → permanent public URL (if bucket is public)
```
 
**New endpoints in user-service:**
```
POST /api/upload/presign    → { bucket, fileName, fileType } → { uploadUrl, fileUrl }
POST /api/upload/avatar     → { fileUrl } → update user avatar in DB
DELETE /api/upload/:bucket/:objectName → delete file (owner only)
```
 
**Frontend: `frontend/src/components/chat/DropZone.jsx`**
```javascript
// Wrap the entire chat area with a DropZone (not just the input)
// When user drags file over chat: 
//   - Full overlay appears with dashed border animation
//   - "Drop files here" text with upload icon
//   - Shows accepted types: Images, PDFs, Audio, Video (max 50MB)
// On drop:
//   1. Get presigned URL from backend
//   2. Upload directly to MinIO with progress (XMLHttpRequest for progress events)
//   3. Show upload progress bar in input area
//   4. On success: send message with attachment URL + metadata
// Multiple files: queue them, upload in parallel with individual progress
// Error: shake animation + error toast
// File type icons: 📷 📄 🎵 🎬 based on mime type
 
// Also: paste from clipboard (Ctrl+V image paste)
// Also: click paperclip button → file picker
```
 
**Frontend: File message bubble:**
```javascript
// Images: full preview inline, lightbox on click (use yet-another-react-lightbox: free)
// PDFs: card with PDF icon, filename, size, preview thumbnail if possible, download button
// Video: HTML5 video player (muted autoplay for short clips < 30s)
// Audio: HTML5 audio player with custom styled controls
// Other: generic attachment card with download button
```
 
---
 
### B4. Full Keyboard Shortcuts + Edit Last Message
 
**Frontend additions:**
 
```javascript
// In ChatInput.jsx — detect ArrowUp when input is empty:
const handleKeyDown = (e) => {
  if (e.key === 'ArrowUp' && inputValue === '') {
    const lastMsg = getLastSentMessageByCurrentUser();
    if (lastMsg) enterEditMode(lastMsg);
  }
  // Shift+Enter = newline (already handled)
  // Enter = send
  // Escape = cancel edit mode / collapse thread panel / deselect message
}
 
// Edit mode UI:
// - Input fills with message content
// - Yellow border glow on input
// - "Editing message" label above input with ✕ cancel button
// - Send button changes to "Save Edit" 
// - Escape cancels edit, restores input
 
// chat-service: New socket event 'message:edit' → { messageId, newContent }
// Add to Message model: isEdited: Boolean, editHistory: [{ content, editedAt }]
// Broadcast 'message:edited' to room → clients update the message in place
 
// Shortcuts modal (Ctrl+/):
// Grid layout of all shortcuts in categorized sections
// Glassmorphism modal, keyboard key badges (styled like physical keys)
```
 
---
 
## FEATURE GROUP C — ORGANIZATIONAL FEATURES (Implement in Parallel)
 
---
 
### C1. Workspaces & Channels (Server/Channel Structure)
 
**This is a significant schema change. Apply carefully.**
 
**New MongoDB schema:**
```javascript
// Workspace (server) model:
{
  _id: ObjectId,
  name: String,           // "My Company"
  slug: String,           // "my-company" (URL-safe, unique)
  iconUrl: String,        // MinIO URL
  bannerUrl: String,
  description: String,
  ownerId: String,        // user ID
  members: [{
    userId: String,
    role: 'owner'|'admin'|'moderator'|'member',
    joinedAt: Date,
    nickname: String
  }],
  isPublic: Boolean,
  inviteCode: String,     // random 8-char code for joining
  maxMembers: Number,     // default: 500 (no limit for open source)
  createdAt: Date
}
 
// Channel model (replaces generic Room):
{
  _id: ObjectId,
  workspaceId: ObjectId,  // belongs to a workspace
  name: String,           // "general" (no # prefix in DB)
  topic: String,          // channel topic shown in header
  description: String,
  type: 'text'|'voice'|'announcement'|'forum',
  category: String,       // e.g. "GENERAL", "ENGINEERING" (collapsible group)
  isPrivate: Boolean,
  allowedRoles: [String], // which roles can see this channel
  slowMode: Number,       // seconds between messages (0 = off)
  pinnedMessages: [ObjectId],
  position: Number,       // order within category
  createdBy: String,
  createdAt: Date
}
```
 
**New API endpoints in chat-service:**
```
POST   /api/workspaces              → create workspace
GET    /api/workspaces/:slug        → get workspace with channels
PUT    /api/workspaces/:id          → update workspace (owner/admin only)
DELETE /api/workspaces/:id          → delete workspace
POST   /api/workspaces/:id/invite   → generate invite link
POST   /api/workspaces/join/:code   → join via invite code
POST   /api/workspaces/:id/channels → create channel in workspace
PUT    /api/channels/:id            → update channel
DELETE /api/channels/:id            → delete channel
GET    /api/workspaces/:id/members  → list members with roles
PUT    /api/workspaces/:id/members/:userId/role → change member role
DELETE /api/workspaces/:id/members/:userId      → kick/ban member
```
 
**Frontend: Workspace Sidebar Layout:**
```javascript
// Left-most rail (72px): workspace icons (like Discord)
// - Each icon: 48px circle, workspace icon image
// - Hover: tooltip with workspace name
// - Active: white indicator bar on left + rounded → square morph animation
// - "+" button at bottom: create or join workspace
// - User avatar at very bottom with status indicator
 
// Channel sidebar (240px): appears when workspace is selected
// - Workspace name at top with dropdown chevron
//   - Clicking opens: Edit Workspace, Invite, Notification Settings, Leave
// - Channel categories as collapsible sections (animated accordion)
// - # channels listed under each category
// - Hover on channel: shows settings gear icon
// - Active channel: gradient left border + slightly brighter bg
// - Category header: can be collapsed (arrow animation)
 
// Routes: /workspace/:slug/:channelName
```
 
---
 
### C2. Pinned Messages & Bookmarks
 
**chat-service additions:**
```javascript
// New endpoints:
POST   /api/channels/:id/pin/:messageId    → pin message (admin/mod only)
DELETE /api/channels/:id/pin/:messageId    → unpin message
GET    /api/channels/:id/pins              → get all pinned messages
 
POST   /api/bookmarks                      → bookmark message (private, per user)
DELETE /api/bookmarks/:messageId           → remove bookmark
GET    /api/bookmarks                      → get user's bookmarks (paginated)
 
// MongoDB: Channel model already has pinnedMessages: [ObjectId]
// New collection: Bookmark { userId, messageId, channelId, note, createdAt }
 
// Socket event: 'message:pinned' → broadcast to channel when message is pinned
```
 
**Frontend:**
```javascript
// Pinned messages: slide-down panel from channel header (like GitHub pinned repos)
// Appears when clicking pin icon (📌) in channel header
// Shows message list with jump-to-message button
// "X messages pinned" label in header
 
// Bookmarks: accessible from sidebar or user menu
// Bookmark button: 🔖 in message hover actions
// Bookmarks page: /bookmarks — shows all bookmarked messages grouped by channel
// Can add private note to bookmark
// Search within bookmarks
```
 
---
 
### C3. Global Full-Text Search (Meilisearch)
 
**New service: Meilisearch (Docker)**
 
Add to docker-compose.yml:
```yaml
meilisearch:
  image: getmeili/meilisearch:v1.5
  environment:
    MEILI_ENV: production
    MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY}
  ports:
    - "7700:7700"
  volumes:
    - meilisearch_data:/meili_data
```
 
Add to Kubernetes: `kubernetes/deployments/meilisearch.yaml` (1 replica, 3Gi PVC)
 
**chat-service: `src/services/search.service.js`**
```javascript
import { MeiliSearch } from 'meilisearch';  // npm install meilisearch
 
const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST,
  apiKey: process.env.MEILISEARCH_MASTER_KEY,
});
 
// On startup, create and configure indexes:
// Index: 'messages' → searchableAttributes: ['content', 'senderName', 'channelName']
//                   → filterableAttributes: ['channelId', 'workspaceId', 'senderId', 'hasLink', 'hasFile', 'createdAt']
//                   → sortableAttributes: ['createdAt']
 
// Indexing: when message is saved to MongoDB, also index to Meilisearch
// Deletion: when message is deleted, remove from Meilisearch
 
// Search function:
async function searchMessages(query, filters, workspaceId) {
  // Parse filter syntax:
  // "from:@lokesh" → senderId = lokesh's userId
  // "in:#general"  → channelName = "general"  
  // "has:link"     → hasLink = true
  // "has:file"     → hasFile = true
  // "before:2024-01-01" → createdAt < timestamp
  // "after:2024-01-01"  → createdAt > timestamp
 
  return await client.index('messages').search(query, {
    filter: buildMeilisearchFilter(filters, workspaceId),
    sort: ['createdAt:desc'],
    limit: 20,
    attributesToHighlight: ['content'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>'
  });
}
```
 
**New endpoint:**
```
GET /api/search?q=hello&in=general&from=lokesh&has=link&page=1
```
 
**Frontend: `frontend/src/pages/SearchPage.jsx`**
```javascript
// Dedicated full-page search (accessible from Ctrl+F or sidebar search icon)
// Design: full-page or slide-in panel (560px from right)
// Search bar at top (same as command palette style)
// Filter chips below search bar:
//   [in: #general ✕] [from: @lokesh ✕] [has: link ✕] [after: Jan 2024 ✕]
// Filter dropdowns: click to add filters
// Results: message cards showing:
//   - Channel name + workspace name (breadcrumb style)
//   - Sender avatar + name + timestamp
//   - Message content with search term highlighted in yellow
//   - "Jump to message" button → navigates to that channel and scrolls to message
// Infinite scroll for results
// Empty state: animated illustration with "No results for ..."
// Recent searches: stored in localStorage, shown before typing
```
 
---
 
## FEATURE GROUP D — NEW PAGES (Implement in Parallel)
 
---
 
### D1. Landing Page (Enhanced)
 
Enhance `frontend/src/pages/Landing.jsx` with these additions beyond what's already built:
 
```javascript
// Section 1: Hero (already exists — enhance with video background)
// Add: HTML5 <video> element with:
//   src: use a free Creative Commons video (suggest adding a placeholder URL
//        with instructions to replace with Pexels/Coverr free video)
//   autoPlay muted loop playsInline
//   Object-fit: cover, absolute positioned behind content
//   Dark overlay: rgba(5,5,20,0.75)
// The animated particle canvas should be ON TOP of the video
 
// Section 2: DEMO / HOW IT WORKS (NEW)
// Animated step-by-step: 3 steps with icons and descriptions
// Steps: "Create Workspace" → "Invite Team" → "Start Chatting"
// Each step connected by animated dashed line (SVG stroke-dasharray animation)
// Icons animate in with spring physics (Framer Motion)
 
// Section 3: FEATURES GRID (Enhanced with call screenshots)
// Feature cards should have animated GIF-like CSS demos:
// - "Real-time chat" card: animated typing indicators + message bubbles appearing
// - "Voice calls" card: animated circular avatar with sound wave rings
// - "File sharing" card: animated upload progress bar
// - "Search" card: animated search with highlighted results appearing
// Each card flips on hover to show more detail (CSS 3D perspective flip)
 
// Section 4: SOCIAL PROOF / STATS
// Animated counter: count up when in viewport (Intersection Observer)
// Numbers: 10,000+ Users | 1M+ Messages | 50+ Integrations | 99.9% Uptime
// Behind stats: subtle grid pattern background
 
// Section 5: PRICING (Open Source = Free!) 
// Single card: "ChatFlow is 100% open source and free forever"
// Self-host in minutes, link to GitHub
// GitHub stars counter (fetch from GitHub API: https://api.github.com/repos/...)
 
// Section 6: TESTIMONIALS
// Carousel with 5-6 fake/placeholder testimonials (instruct agent to use realistic names)
// Auto-plays, pauses on hover
// Framer Motion drag-to-scroll on mobile
 
// Section 7: CTA BOTTOM + FOOTER
// Large gradient CTA: "Start chatting in 30 seconds"
// Footer: Logo, links (Features, Docs, GitHub), social links, "Self-hosted" badge
```
 
---
 
### D2. Admin / Analytics Dashboard Page
 
**New page: `frontend/src/pages/AdminDashboard.jsx`**
**Route:** `/admin` (protected — only workspace owner/admin role)
 
```javascript
// Backend: New analytics endpoints in a new admin-service OR add to user-service:
// GET /api/admin/stats → { totalUsers, activeToday, totalMessages, storageUsed }
// GET /api/admin/messages-over-time?days=30 → [{ date, count }]
// GET /api/admin/active-users-over-time?days=30 → [{ date, count }]
// GET /api/admin/top-channels → [{ channel, messageCount }]
// GET /api/admin/user-growth → [{ date, newUsers }]
 
// All data comes from: MongoDB aggregation pipelines + Redis counters
 
// Dashboard Layout (CSS Grid):
// Row 1: 4 stat cards
// Row 2: Line chart (messages over time) + Bar chart (top channels)
// Row 3: User growth chart + Active users heatmap
// Row 4: Recent activity feed + Members table
 
// Stat Cards design:
// Large number with animated count-up
// Trend indicator (↑ +12% vs last week) with green/red color
// Sparkline mini-chart (7-day trend)
// Glassmorphism card with colored gradient border-left
 
// Charts (using Recharts — already installed):
// LineChart: Messages per day (30 days) — gradient area fill, custom tooltip
// BarChart: Top 10 channels by message count — horizontal bars with gradient
// AreaChart: Daily active users — smooth curve, purple gradient fill
// PieChart: Message types (text vs image vs voice vs file) — doughnut style
// CalendarHeatmap: Message activity by hour/day (like GitHub contribution graph)
//   Build this from scratch using SVG: 7 rows (days) × 24 cols (hours)
//   Cell color intensity = message count, hover tooltip with exact count
 
// Members Table:
// Paginated table with: Avatar | Username | Role | Messages Sent | Joined | Status
// Role badge: colored chips (owner=gold, admin=purple, member=blue)
// Actions: Change role dropdown, Kick button (with confirmation modal)
// Search/filter above table
// Export to CSV button
 
// Storage Usage:
// Progress bars for each bucket (avatars, attachments, voice-notes)
// Total: X.XX GB / 5 GB (free tier limit visual indicator)
// Data from MinIO admin API
 
// Real-time updates: WebSocket subscription to admin events
// e.g., new user joins → stat card animates
```
 
---
 
### D3. Advanced Settings Page (Multi-Tab)
 
**New page: `frontend/src/pages/Settings.jsx`**
**Route:** `/settings` with sub-routes: `/settings/profile`, `/settings/security`, 
           `/settings/notifications`, `/settings/appearance`, `/settings/privacy`
 
```javascript
// Layout: Left sidebar with tab navigation + Right content area
// Sidebar active tab: gradient left border indicator (animated translateX)
// Tab transition: content slides + fades (Framer Motion)
 
// TAB 1: Profile
// - Avatar upload with drag & drop (uploads to MinIO)
//   - Preview before upload, crop modal (use react-easy-crop: open source)
//   - Upload progress ring around avatar
// - Display name, username (with live availability check — debounced API call)
// - Bio textarea with character counter (200 max)
// - Status selector: Online | Away | Do Not Disturb | Invisible
//   Custom status: emoji picker + text (up to 100 chars)
// - Timezone dropdown (full list, detect current timezone automatically)
// - Language preference (EN, etc.)
// - Save button with success animation (checkmark morphs in)
 
// TAB 2: Security
// - Current password + New password + Confirm (form with validation)
// - Password strength meter (4 levels with animated bar + label)
// - 2FA section (see Feature E1 below for full implementation)
// - Active Sessions list:
//   - Current session highlighted
//   - Each session: Device icon, Browser/OS, IP address (masked), Location, Last active
//   - "Revoke" button on non-current sessions
//   - "Revoke All Other Sessions" button (red, confirmation required)
//   - Sessions stored in Redis as: sessions:<userId> → Set of session tokens
 
// TAB 3: Notifications
// - Master toggle: Enable/Disable all notifications
// - Desktop notifications toggle + test button
// - Sound toggle + volume slider + sound preview
// - Per-channel muting:
//   - List of all joined channels
//   - Each: toggle for mute + duration (1h, 8h, 24h, Until I turn it on)
//   - Muted channels: grey in sidebar with 🔇 icon
// - Do Not Disturb schedule:
//   - Toggle DND
//   - Set schedule: Start time + End time (time pickers)
//   - Days of week selector
//   - "Allow calls even in DND" toggle
// - Notification keywords: add words that trigger mentions
 
// TAB 4: Appearance (links to ThemePicker component)
// - Theme selector (Dark/Light/AMOLED)
// - Accent color picker
// - Font size slider (compact/normal/large)
// - Message density: Cozy / Compact (changes padding in message list)
// - Show avatars in compact mode toggle
// - Animated emoji toggle (some users prefer static)
// - Custom CSS box (advanced users can paste CSS to customize)
 
// TAB 5: Privacy
// - Profile visibility: Public / Workspace members only / Nobody
// - Show online status: Everyone / Only friends / Nobody
// - Read receipts: Enable/Disable (show "Seen" indicators)
// - Data export: "Request my data" button → generates JSON archive → download
// - Account deletion: "Delete Account" (red, behind confirmation dialog with typing "DELETE")
```
 
---
 
## FEATURE GROUP E — ENTERPRISE SECURITY (Implement in Parallel)
 
---
 
### E1. Two-Factor Authentication (2FA) — TOTP
 
**Packages:**
```
npm install otplib qrcode  # auth-service
npm install @otplib/preset-default  # auth-service
```
 
**auth-service: `src/controllers/twoFactor.controller.js`**
 
```javascript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
 
// Endpoints:
// POST /auth/2fa/setup
//   → Generate secret: authenticator.generateSecret()
//   → Store in DB temporarily (not confirmed yet): user.twoFactorSecret = secret (unverified)
//   → Generate OTP URI: authenticator.keyuri(email, 'ChatFlow', secret)
//   → Generate QR code PNG: QRCode.toDataURL(otpauth)
//   → Return: { secret, qrCodeDataUrl, backupCodes: generateBackupCodes() }
 
// POST /auth/2fa/verify
//   → Body: { token: '123456' }
//   → Verify: authenticator.check(token, user.twoFactorSecret)
//   → If valid: set user.twoFactorEnabled = true, store hashed backupCodes in DB
//   → Return: { success: true }
 
// POST /auth/2fa/disable
//   → Body: { password, token }
//   → Verify password + TOTP token
//   → Set user.twoFactorEnabled = false, clear secret
 
// Modify POST /auth/login:
//   → After password verification, if user.twoFactorEnabled:
//     → Return: { requiresTwoFactor: true, tempToken: <short-lived 5min JWT> }
//     → Don't return full JWT yet
 
// POST /auth/2fa/validate  (new endpoint)
//   → Body: { tempToken, totpCode }
//   → Verify tempToken → get userId
//   → Verify TOTP code OR backup code
//   → If valid: return full JWT + refreshToken (same as normal login)
 
// Backup codes:
function generateBackupCodes() {
  return Array.from({ length: 10 }, () =>
    `${randomHex(4)}-${randomHex(4)}-${randomHex(4)}`
  );
  // Hash with bcrypt before storing, show plaintext only once to user
}
 
// PostgreSQL schema additions:
ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN backup_codes TEXT[];  -- hashed codes
```
 
**Frontend: 2FA Setup Flow in Settings → Security**
```javascript
// Step 1: "Enable 2FA" button
// Step 2: Modal with instructions + QR code (from dataUrl)
//         "Scan this with Google Authenticator, Authy, or any TOTP app"
//         Below QR: show secret in text (for manual entry)
// Step 3: Input for 6-digit code (auto-advance when 6 chars entered)
//         Numeric-only input, large font, centered
// Step 4: Success! Show backup codes (10 codes)
//         Download button (plain text file)
//         Copy all button
//         "I've saved my backup codes" checkbox → confirm button
// Login page: after password, show 2FA prompt:
//         6-digit input (same large numeric style)
//         "Use backup code" link → text input
//         Auto-submit on 6 chars
```
 
---
 
### E2. End-to-End Encryption (E2EE) for Direct Messages
 
**Packages:**
```
npm install libsodium-wrappers  # frontend + auth-service
```
 
**Encryption scheme: X25519 + XSalsa20-Poly1305 (NaCl box)**
 
```
Implementation architecture:
1. On registration: generate X25519 keypair in browser (libsodium)
2. Public key: upload to server (stored in DB per user) — plaintext, public
3. Private key: store ENCRYPTED in localStorage using user's password as key
   (never sent to server)
4. For DM with another user:
   - Fetch their public key from server
   - Derive shared secret: box.before(theirPublicKey, myPrivateKey)
   - Encrypt message: box.after(message, nonce, sharedSecret)
   - Send: { ciphertext, nonce } instead of plaintext
5. Receiving user:
   - Derive same shared secret
   - Decrypt: box.open.after(ciphertext, nonce, sharedSecret)
6. Server stores ONLY ciphertext — cannot read DM content
```
 
**auth-service: `src/controllers/keys.controller.js`**
```javascript
// GET  /api/keys/:userId     → { publicKey: base64 }  (public info — no auth needed for pubkey)
// POST /api/keys             → store user's public key { publicKey: base64 }
// PostgreSQL: ALTER TABLE users ADD COLUMN public_key TEXT;
```
 
**Frontend: `frontend/src/utils/encryption.js`**
```javascript
import sodium from 'libsodium-wrappers';
 
await sodium.ready;
 
export async function generateKeypair() {
  const keypair = sodium.crypto_box_keypair();
  return {
    publicKey:  sodium.to_base64(keypair.publicKey),
    privateKey: sodium.to_base64(keypair.privateKey)  // never leaves device
  };
}
 
export function encryptMessage(plaintext, myPrivateKeyB64, theirPublicKeyB64) {
  const myPrivateKey   = sodium.from_base64(myPrivateKeyB64);
  const theirPublicKey = sodium.from_base64(theirPublicKeyB64);
  const nonce          = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const messageBytes   = sodium.from_string(plaintext);
  const ciphertext     = sodium.crypto_box_easy(messageBytes, nonce, theirPublicKey, myPrivateKey);
  return {
    ciphertext: sodium.to_base64(ciphertext),
    nonce:      sodium.to_base64(nonce)
  };
}
 
export function decryptMessage(ciphertextB64, nonceB64, myPrivateKeyB64, theirPublicKeyB64) {
  const myPrivateKey   = sodium.from_base64(myPrivateKeyB64);
  const theirPublicKey = sodium.from_base64(theirPublicKeyB64);
  const ciphertext     = sodium.from_base64(ciphertextB64);
  const nonce          = sodium.from_base64(nonceB64);
  const decrypted      = sodium.crypto_box_open_easy(ciphertext, nonce, theirPublicKey, myPrivateKey);
  return sodium.to_string(decrypted);
}
 
// Key management:
// Store private key encrypted in IndexedDB (not localStorage — more secure, more storage)
// Use the user's password to derive a symmetric key (PBKDF2) to encrypt private key
// On login: decrypt private key from IndexedDB using password
// On password change: re-encrypt private key with new password
```
 
**DM UI indicators:**
```javascript
// Lock icon 🔒 in DM header when E2EE is active
// "Messages are end-to-end encrypted" label (like WhatsApp)
// Encrypted messages in DB show as [ENCRYPTED] in admin view — confirm this works
// If recipient doesn't have a public key yet (old account): show warning
//   "This conversation is not encrypted. Ask your contact to log in to enable E2EE."
```
 
---
 
## FEATURE GROUP F — ADDITIONAL MISSING FEATURES (Add These Too)
 
---
 
### F1. Direct Messages (DMs)
 
Implement 1:1 private messaging separate from channels:
 
```javascript
// New collection: DirectMessageConversation {
//   _id, participants: [userId, userId] (sorted, always 2),
//   isEncrypted: Boolean,
//   lastMessage: { content, senderId, createdAt },
//   createdAt
// }
// Messages use same Message model with channelId = null, dmId = conversation._id
 
// Endpoints:
POST /api/dm/conversations        → start or get existing DM with a user
GET  /api/dm/conversations        → list all DM conversations for current user
GET  /api/dm/conversations/:id/messages → paginated DM messages
 
// Sidebar: "Direct Messages" section below channels
// DM list: avatar (with online indicator) + username + last message preview
// "New DM" button: user search modal → click to open DM
```
 
---
 
### F2. Message Reactions (Enhanced)
 
Already partially planned — complete full implementation:
 
```javascript
// Emoji Picker: use emoji-mart (open source: npm install @emoji-mart/react @emoji-mart/data)
// Reaction bar: appears on message hover (slide up from bottom-right of message)
// Quick reactions: 6 most-used emojis always visible
// "+" button opens full emoji-mart picker
// Reaction counts below message: grouped by emoji with count
// Hover on reaction group: tooltip showing who reacted
// Your reaction: highlighted with accent color border
// Click your reaction: toggle (remove it)
// Animated: reaction "pops" in with spring animation (scale 0→1.3→1)
// Socket events: 'message:react' → { messageId, emoji } → broadcast 'message:reaction-updated'
```
 
---
 
### F3. User Presence & Status System
 
```javascript
// Status types: Online | Away | Do Not Disturb | Invisible | Custom
// Custom status: emoji + text (e.g., "🎧 In a meeting")
 
// Implementation:
// Redis key: user:<userId>:status → { status, customEmoji, customText, updatedAt }
// TTL: 30 minutes (auto-expire to "offline")
// Heartbeat: client sends ping every 20s → server refreshes TTL
 
// Presence events via Socket.io:
// User connects → publish 'user:online' to all their workspace members
// User disconnects (handle reconnection grace period: 10s before marking offline)
// Status change → publish 'user:status-changed'
 
// In sidebar: colored dot on avatar:
// Green (filled) = Online
// Yellow (filled) = Away  
// Red (filled) = Do Not Disturb
// Grey (empty ring) = Offline
// Purple (filled) = Custom (show custom emoji instead of dot)
```
 
---
 
### F4. Notification System (Web Push + In-App)
 
```javascript
// Backend: npm install web-push (notification-service)
// Generate VAPID keys: webpush.generateVAPIDKeys() → store in .env
 
// In-App Notifications:
// Notification bell in top nav with count badge
// Dropdown: list of notifications (mention, reply, reaction, DM, join request)
// Each: avatar + action text + time + message preview
// Mark all read button
// Click → navigate to the relevant message
 
// Web Push Notifications (when tab is not in focus):
// Service Worker (frontend/public/sw.js):
//   - Register push subscription on login
//   - Handle push events → show browser notification
//   - Notification click → open/focus tab + navigate to message
// Backend:
//   - Store push subscriptions in Redis: push:<userId> → [subscription JSON]
//   - On mention/DM/reply: send push via web-push library
//   - Respect DND schedule (check user's DND settings before sending)
 
// New endpoint:
POST /api/notify/push/subscribe → save push subscription
DELETE /api/notify/push/unsubscribe → remove subscription
GET  /api/notify/               → get paginated notifications
PUT  /api/notify/read/:id       → mark notification as read
PUT  /api/notify/read-all       → mark all read
```
 
---
 
### F5. Message Translation (Open Source)
 
```javascript
// Use LibreTranslate (self-hosted, Docker) — fully open source, no API key needed
// Add to docker-compose.yml:
// libretranslate:
//   image: libretranslate/libretranslate:latest
//   ports: ["5000:5000"]
//   environment:
//     LT_LOAD_ONLY: "en,es,fr,de,zh,ar,hi,pt,ja,ko,ru"
//   volumes:
//     - libretranslate_data:/home/libretranslate
 
// New endpoint in chat-service:
POST /api/chat/translate → { text, targetLang } → { translatedText, detectedLang }
// Proxy to LibreTranslate internally
 
// Frontend: "Translate" option in message context menu (right-click or ... menu)
// Shows translated text below original message (toggle show/hide)
// Language auto-detected, translates to user's preferred language (from settings)
```
 
---
 
### F6. Read Receipts & Message Status
 
```javascript
// Message status: Sending → Sent → Delivered → Read
// Icons: ⏳ (sending) → ✓ (sent) → ✓✓ (delivered) → ✓✓ (blue, read)
// In DMs: show "Seen" timestamp below last message read by other person
// In channels: show read count "Seen by 4 members" with avatar stack
 
// Redis tracking:
// message:<messageId>:reads → Set of userIds who have read it
// When user views a channel: mark all visible messages as read (IntersectionObserver)
// Socket event: 'message:read' → { messageId, channelId } → update for sender
 
// Note: E2EE DMs still support read receipts (encrypted content, plaintext metadata)
// Privacy setting: allow user to disable sending read receipts
```
 
---
 
### F7. Channel Permissions & Moderation Tools
 
```javascript
// Admin/Moderator actions (add to chat-service):
// - Mute user in channel (prevents sending for N minutes)
// - Kick user from workspace
// - Ban user (+ optional ban reason)
// - Slow mode: set N seconds between messages per user
// - Lock channel: only admins can send messages
// - Delete any message
// - View audit log of all admin actions
 
// New collection: AuditLog { workspaceId, adminId, action, targetId, reason, createdAt }
// New endpoint: GET /api/admin/audit-log?page=1&limit=50
 
// Frontend: Right-click user → context menu with moderation options (visible to admins only)
// Admin role badge next to username in member list
// Muted users: speech bubble icon with strike through next to their name
```
 
---
 
## DEVOPS UPDATES FOR NEW FEATURES
 
### Update docker-compose.yml — Add New Services
 
Add these to the existing docker-compose.yml:
```yaml
  call-service:
    build: ./call-service
    ports:
      - "3005:3005"
      - "40000-49999:40000-49999/udp"  # mediasoup RTP
    environment:
      - ANNOUNCED_IP=127.0.0.1  # override in production with actual IP
 
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]
 
  meilisearch:
    image: getmeili/meilisearch:v1.5
    ports: ["7700:7700"]
    volumes: [meilisearch_data:/meili_data]
 
  libretranslate:
    image: libretranslate/libretranslate:latest
    ports: ["5000:5000"]
    volumes: [libretranslate_data:/home/libretranslate]
    # Note: takes 10-15 min to download language models on first start
 
volumes:
  minio_data:
  meilisearch_data:
  libretranslate_data:
```
 
### Update Terraform — New Security Group Rules
 
Add to `terraform/security-groups.tf` k3s SG:
```hcl
# mediasoup RTP UDP range
ingress {
  from_port   = 40000
  to_port     = 49999
  protocol    = "udp"
  cidr_blocks = ["0.0.0.0/0"]
}
# MinIO API
ingress { from_port = 9000; to_port = 9001; protocol = "tcp"; cidr_blocks = ["${var.my_ip}/32"] }
# Meilisearch
ingress { from_port = 7700; to_port = 7700; protocol = "tcp"; cidr_blocks = ["${var.my_ip}/32"] }
```
 
### Update Kubernetes Manifests — New Deployments
 
Write complete K8s manifests for:
 
**`kubernetes/deployments/call-service.yaml`**
- 1 replica (resource intensive: 256Mi RAM, 200m CPU)
- ENV: ANNOUNCED_IP from ConfigMap (set to k3s elastic IP)
- HostNetwork: false (use NodePort for UDP RTP)
- UDP ports 40000-49999 (mediasoup) — use hostPort in container spec
**`kubernetes/deployments/minio.yaml`**
- 1 replica (storage: 5Gi PVC)
- Readiness probe: GET /minio/health/live
- Init container: create required buckets using mc (MinIO client)
**`kubernetes/deployments/meilisearch.yaml`**
- 1 replica (storage: 3Gi PVC)
- Resource limits: 512Mi RAM (Meilisearch can be memory-hungry)
- Readiness probe: GET /health
**`kubernetes/deployments/libretranslate.yaml`**
- 1 replica (storage: 5Gi PVC for language models)
- Resource limits: 1Gi RAM (NLP models are large)
- Note: large init time — initialDelaySeconds: 120 for probes
### Update Jenkinsfile — New Build Stages
 
Add new service to SERVICES array:
```groovy
environment {
  SERVICES = 'frontend auth-service chat-service user-service notification-service call-service nginx'
}
```
 
Add new stage after Deploy:
```groovy
stage('Smoke Tests') {
  steps {
    sh '''
      # Test new services are responding
      curl -f http://$K3S_IP:30005/health || exit 1   # call-service
      curl -f http://$K3S_IP:9000/minio/health/live || exit 1  # minio
      curl -f http://$K3S_IP:7700/health || exit 1    # meilisearch
    '''
  }
}
```
 
### Update Prometheus Monitoring
 
Add scrape targets for new services:
```yaml
# Add to prometheus-config ConfigMap:
- job_name: 'call-service'
  static_configs:
    - targets: ['call-service:3005']
 
- job_name: 'minio'
  metrics_path: /minio/v2/metrics/cluster
  static_configs:
    - targets: ['minio:9000']
 
- job_name: 'meilisearch'
  static_configs:
    - targets: ['meilisearch:7700']
  metrics_path: /metrics
```
 
Add new Grafana dashboard: `kubernetes/monitoring/call-service-dashboard.json`
- Active calls count
- Participants per call (average)
- Call duration histogram
- mediasoup bitrate (audio/video)
- WebRTC transport errors
### Update Shell Scripts
 
**Update `scripts/health-check.sh`** — add new services:
```bash
# Add to SERVICES array:
SERVICES=("auth-service" "chat-service" "user-service" "notification-service" 
          "call-service" "frontend" "minio" "meilisearch")
```
 
**Update `scripts/backup.sh`** — add MinIO and Meilisearch backup:
```bash
# Backup MinIO data using mc (MinIO client)
mc alias set myminio http://minio-service:9000 $MINIO_ACCESS_KEY $MINIO_SECRET_KEY
mc mirror myminio/attachments ./backup/minio-attachments-$DATE
tar -czf ./backup/minio-$DATE.tar.gz ./backup/minio-attachments-$DATE
aws s3 cp ./backup/minio-$DATE.tar.gz s3://$S3_BUCKET/minio/minio-$DATE.tar.gz
 
# Meilisearch: use task dump API
curl -X POST http://meilisearch-service:7700/dumps \
  -H "Authorization: Bearer $MEILISEARCH_MASTER_KEY"
```
 
---
 
## UPDATED .env.example
 
Add these new variables to .env.example:
```env
# Call Service
CALL_SERVICE_PORT=3005
ANNOUNCED_IP=127.0.0.1           # Replace with your server public IP
 
# MinIO
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=chatflow_admin
MINIO_SECRET_KEY=your-secure-minio-password
MINIO_ROOT_USER=chatflow_admin
MINIO_ROOT_PASSWORD=your-secure-minio-password
MINIO_BUCKET_ATTACHMENTS=attachments
MINIO_BUCKET_AVATARS=avatars
MINIO_BUCKET_VOICE=voice-notes
 
# Meilisearch
MEILISEARCH_HOST=http://meilisearch:7700
MEILISEARCH_MASTER_KEY=your-meilisearch-master-key
 
# LibreTranslate
LIBRETRANSLATE_URL=http://libretranslate:5000
 
# Web Push (VAPID — generate with: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=your-email@example.com
 
# Email (Gmail SMTP — for 2FA backup codes)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-gmail-app-password   # Gmail App Password (not account password)
SMTP_FROM=ChatFlow <noreply@chatflow.app>
 
# 2FA
TOTP_ISSUER=ChatFlow
```
 
---
 
## UPDATED README.md SECTIONS
 
Add these sections to the existing README:
 
### New Features Section
```markdown
## ✨ Features
 
### 💬 Messaging
- Real-time messaging with WebSocket (Socket.io)
- Message threads (Slack-style side panels)
- Voice notes / audio messages
- Rich link previews (YouTube, GitHub, Twitter)
- Markdown + syntax-highlighted code blocks
- Message reactions with emoji picker
- Edit / delete messages
- Read receipts
 
### 📞 Calls
- Voice & video calls (WebRTC + mediasoup SFU)
- Screen sharing
- Group calls (up to 8 participants on free tier)
- Toggle mute / camera / screen share
 
### 🏢 Organization
- Workspaces with channels and categories
- Direct messages (E2EE encrypted)
- Pinned messages & personal bookmarks
- Full-text search with filters (Meilisearch)
- Drag & drop file uploads (MinIO self-hosted)
- Translate messages (LibreTranslate)
 
### 🔒 Security
- JWT + refresh tokens
- Two-Factor Authentication (TOTP — Google Authenticator / Authy)
- End-to-End Encryption for Direct Messages
- Active session management
- Role-based permissions (Owner / Admin / Moderator / Member)
 
### 🎨 Experience
- Command palette (Ctrl+K)
- Customizable themes (Dark / Light / AMOLED + 6 accent colors)
- Keyboard shortcuts
- Web Push notifications
- Analytics dashboard (for admins)
```
 
---
 
## IMPLEMENTATION CHECKLIST
 
After generating all changes, verify:
 
```
FRONTEND:
[ ] All new pages render without console errors
[ ] Command palette opens on Ctrl+K, closes on Escape
[ ] Theme switching updates colors instantly across all components
[ ] File drag-and-drop works with visual feedback
[ ] Voice recording works (getUserMedia permission flow)
[ ] mediasoup-client connects to call-service
[ ] Markdown renders correctly with Prism highlighting
[ ] 2FA setup flow completes end-to-end
[ ] E2EE: messages encrypt before send, decrypt on receive
 
BACKEND:
[ ] call-service starts mediasoup worker without errors
[ ] MinIO buckets created on startup
[ ] Meilisearch index created and messages indexed
[ ] 2FA endpoints return correct TOTP validation
[ ] E2EE: server stores ciphertext, NOT plaintext for DMs
[ ] All new services have /health and /metrics endpoints
 
DEVOPS:
[ ] docker-compose up --build starts ALL services (including new ones)
[ ] All Dockerfiles build without errors
[ ] All K8s manifests pass kubectl --dry-run=client validation
[ ] Terraform plan shows no errors for new security group rules
[ ] Jenkins pipeline builds all 7 images (including call-service)
[ ] Prometheus scrapes new services (check targets page)
[ ] Grafana dashboard shows call-service metrics
```
 
---
 
## PARALLEL IMPLEMENTATION INSTRUCTIONS FOR AGENT
 
Implement ALL features simultaneously in this order:
 
**Round 1 (Parallel):**
- Frontend: All UI components (A1 CallModal, A2 VoiceRecorder, A3 LinkPreviewCard, A4 ThreadPanel, A5 MessageRenderer, B1 CommandPalette, B2 ThemePicker, B3 DropZone)
- Backend: All new endpoints (A1 call-service, A3 linkPreview.service, A4 thread routes, C3 search.service, E1 2FA controller, E2 encryption controller)
- New services: call-service complete implementation
**Round 2 (Parallel):**
- Frontend: All new pages (D1 Landing enhancements, D2 AdminDashboard, D3 Settings all tabs)
- Backend: Schema updates (MongoDB + PostgreSQL migration scripts)
- DevOps: New Docker Compose services, K8s manifests, updated Terraform
**Round 3 (Parallel):**
- Frontend: Integration (connect all UI to backend APIs)
- Backend: Integration tests for all new endpoints
- DevOps: Updated monitoring dashboards, updated scripts, final README
---
 
*Project: ChatFlow — Real-Time Chat Application | Complete Feature Set*
*All tools: 100% Open Source | AWS Free Tier Compatible*
*Stack: React + Node.js + Socket.io + mediasoup + MinIO + Meilisearch + LibreTranslate + Kubernetes*