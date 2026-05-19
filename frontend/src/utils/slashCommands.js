/**
 * Slash Commands Registry
 * All commands available via '/' in the chat input.
 */
import { API_URL } from '../config';

export const SLASH_COMMANDS = [
  { name: '/gif',        desc: 'Search and send a GIF',           icon: '🎬' },
  { name: '/poll',       desc: 'Create a poll for the channel',   icon: '📊' },
  { name: '/ai',         desc: 'Ask the AI assistant',            icon: '🤖' },
  { name: '/imagine',    desc: 'Generate an AI image (Stable Diffusion)', icon: '🎨' },
  { name: '/summarize',  desc: 'Summarize this channel',          icon: '📋' },
  { name: '/translate',  desc: 'Translate your message',          icon: '🌐' },
  { name: '/remind',     desc: 'Set a reminder (e.g. /remind 30m do thing)', icon: '⏰' },
  { name: '/code',       desc: 'Insert a code block',             icon: '💻' },
  { name: '/run',        desc: 'Run code in sandbox',             icon: '▶️' },
  { name: '/whiteboard', desc: 'Open shared whiteboard',          icon: '🖊️' },
  { name: '/shrug',      desc: '¯\\_(ツ)_/¯',                    icon: '🤷' },
  { name: '/tableflip',  desc: '(╯°□°）╯彡┻━┻',                 icon: '😤' },
  { name: '/me',         desc: 'Send an action message',          icon: '👤' },
];

/**
 * Execute a slash command.
 * @returns {boolean} true if the command was handled, false otherwise
 */
export function executeSlashCommand(cmdName, args, ctx) {
  const {
    setInput,
    openGiphy,
    openPoll,
    sendMessage,
    currentRoom,
    navigate,
  } = ctx;

  switch (cmdName) {
    case '/gif':
      openGiphy?.();
      return true;

    case '/poll':
      openPoll?.();
      return true;

    case '/shrug':
      sendMessage?.('¯\\_(ツ)_/¯');
      return true;

    case '/tableflip':
      sendMessage?.('(╯°□°）╯彡┻━┻');
      return true;

    case '/me':
      if (args) sendMessage?.(`_${args}_`);
      return true;

    case '/code':
      setInput?.('```\n\n```');
      return false; // Don't send, just insert

    case '/ai':
      // Handled by opening the AI panel — dispatch a custom event
      window.dispatchEvent(new CustomEvent('chatflow:openAI', { detail: { prompt: args } }));
      return true;

    case '/summarize':
      window.dispatchEvent(new CustomEvent('chatflow:summarize', { detail: { roomId: currentRoom?._id } }));
      return true;

    case '/imagine':
      if (args) {
        fetch(`${API_URL}/ai/imagine`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('chatflow_token')}` },
          body: JSON.stringify({ prompt: args }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.imageUrl) sendMessage?.(d.imageUrl, 'image'); })
          .catch(() => {});
      }
      return true;

    case '/remind':
      // Simple reminder: parse "30m" or "1h" etc.
      parseAndSetReminder(args, currentRoom?._id);
      return true;

    case '/translate':
      // Emit translate event — frontend can pick it up
      window.dispatchEvent(new CustomEvent('chatflow:translate', { detail: { lang: args || 'en' } }));
      return true;

    case '/whiteboard':
      window.dispatchEvent(new CustomEvent('chatflow:whiteboard'));
      return true;

    default:
      return false;
  }
}

function parseAndSetReminder(args, roomId) {
  if (!args) return;
  const match = args.match(/^(\d+)(s|m|h|d)\s*(.*)$/i);
  if (!match) return;
  const [, amount, unit, note] = match;
  const ms = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit.toLowerCase()];
  if (!ms) return;
  const reminderText = note || "Time's up!";
  setTimeout(() => {
    // Fire a custom event so the app's Toaster (react-hot-toast) can pick it up
    window.dispatchEvent(
      new CustomEvent('chatflow:reminder', { detail: { text: `⏰ Reminder: ${reminderText}` } })
    );
  }, parseInt(amount, 10) * ms);
}
