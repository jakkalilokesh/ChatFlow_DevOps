const OLLAMA_URL    = process.env.OLLAMA_URL    || 'http://ollama:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL  || 'phi3.5:mini';

/**
 * Stream chat completions from Ollama.
 * onChunk(text) is called for every token received.
 */
export async function ollamaChat(messages, onChunk, model = DEFAULT_MODEL) {
  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      model,
      messages,
      stream:  true,
      options: { temperature: 0.7, num_ctx: 4096 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);

  const reader  = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText  = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          fullText += data.message.content;
          onChunk?.(data.message.content);
        }
      } catch { /* skip malformed line */ }
    }
  }
  return fullText;
}

/**
 * Single-shot generation (non-streaming).
 */
export async function ollamaGenerate(prompt, model = DEFAULT_MODEL) {
  const res  = await fetch(`${OLLAMA_URL}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ model, prompt, stream: false }),
  });
  const data = await res.json();
  return data.response || '';
}

/**
 * Check if Ollama is reachable.
 */
export async function ollamaHealth() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return { ok: true, models: (data.models || []).map((m) => m.name) };
  } catch {
    return { ok: false, models: [] };
  }
}
