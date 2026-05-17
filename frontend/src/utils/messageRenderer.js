import { marked } from 'marked';
import DOMPurify from 'dompurify';
import Prism from 'prismjs';
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
import 'prismjs/components/prism-docker';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/\n/g, '\\n');
}

// Configure marked renderer
const renderer = new marked.Renderer();

// Code blocks with Prism highlighting + copy button
renderer.code = (code, language) => {
  const lang = language || 'text';
  const highlighted =
    lang && Prism.languages[lang]
      ? Prism.highlight(code, Prism.languages[lang], lang)
      : escapeHtml(code);

  return `
    <div class="code-block">
      <div class="code-block-header">
        <span class="code-lang">${lang}</span>
        <button class="copy-btn" data-code="${escapeAttr(code)}" onclick="navigator.clipboard.writeText(this.dataset.code).then(()=>{this.textContent='Copied!';setTimeout(()=>{this.textContent='Copy'},2000)})">Copy</button>
      </div>
      <pre class="language-${lang}"><code>${highlighted}</code></pre>
    </div>
  `;
};

// Links open in new tab
renderer.link = (href, title, text) =>
  `<a href="${href}" target="_blank" rel="noopener noreferrer" ${title ? `title="${title}"` : ''}>${text}</a>`;

// Inline code
renderer.codespan = (code) => `<code class="inline-code">${code}</code>`;

marked.setOptions({ renderer, breaks: true, gfm: true });

/**
 * Render message content as sanitized HTML.
 * Supports full markdown + Prism syntax highlighting.
 */
export function renderMessage(content) {
  if (!content) return '';
  try {
    const raw = marked.parse(content);
    return DOMPurify.sanitize(raw, {
      ADD_ATTR: ['data-code', 'onclick', 'class', 'target', 'rel'],
      ADD_TAGS: ['code', 'pre'],
    });
  } catch {
    return escapeHtml(content);
  }
}

/**
 * Check if content has markdown syntax (to decide whether to render)
 */
export function hasMarkdown(content) {
  return /[*_`#\[\]>~]/.test(content);
}

/**
 * Extract first URL from text content
 */
export function extractUrl(content) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = content.match(urlRegex);
  return matches ? matches[0] : null;
}

/**
 * Extract all URLs from content
 */
export function extractUrls(content) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  return content.match(urlRegex) || [];
}
