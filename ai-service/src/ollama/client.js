const OLLAMA_URL    = process.env.OLLAMA_URL    || 'http://ollama:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL  || 'phi3.5:mini';

/**
 * Stream chat completions from Ollama.
 * onChunk(text) is called for every token received.
 */
export async function ollamaChat(messages, onChunk, model = DEFAULT_MODEL) {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        model,
        messages,
        stream:  true,
        options: { temperature: 0.7, num_ctx: 4096 },
      }),
      signal: AbortSignal.timeout(120000), // 120 s — LLM inference can take a while
    });

    if (!response.ok) throw new Error(`Ollama status: ${response.statusText}`);

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
  } catch (err) {
    if (process.env.HF_API_TOKEN) {
      console.log('🔄 Local Ollama offline. Falling back to Hugging Face serverless (Qwen2.5-7B-Instruct)...');
      const hfRes = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!hfRes.ok) throw new Error(`HuggingFace API error: ${hfRes.statusText}`);
      const data = await hfRes.json();
      const content = data.choices?.[0]?.message?.content || '';

      // Simulate streaming chunks for responsive UI feedback
      const words = content.split(' ');
      for (let i = 0; i < words.length; i++) {
        onChunk?.(words[i] + (i === words.length - 1 ? '' : ' '));
        await new Promise((r) => setTimeout(r, 20));
      }
      return content;
    }
    throw err;
  }
}

/**
 * Single-shot generation (non-streaming).
 */
export async function ollamaGenerate(prompt, model = DEFAULT_MODEL) {
  try {
    const res  = await fetch(`${OLLAMA_URL}/api/generate`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model, prompt, stream: false }),
      signal: AbortSignal.timeout(90000), // 90 s for single-shot generation
    });
    if (!res.ok) throw new Error(`Ollama status: ${res.statusText}`);
    const data = await res.json();
    return data.response || '';
  } catch (err) {
    if (process.env.HF_API_TOKEN) {
      console.log('🔄 Local Ollama offline. Falling back to Hugging Face serverless (Qwen2.5-7B-Instruct)...');
      const hfRes = await fetch('https://api-inference.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!hfRes.ok) throw new Error(`HuggingFace API error: ${hfRes.statusText}`);
      const data = await hfRes.json();
      return data.choices?.[0]?.message?.content || '';
    }
    throw err;
  }
}

/**
 * Check if Ollama is reachable, or report Hugging Face availability.
 */
export async function ollamaHealth() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    return { ok: true, type: 'ollama', models: (data.models || []).map((m) => m.name) };
  } catch {
    if (process.env.HF_API_TOKEN) {
      return { ok: true, type: 'huggingface_fallback', models: ['Qwen2.5-7B-Instruct (Serverless)'] };
    }
    return { ok: false, type: 'none', models: [] };
  }
}
