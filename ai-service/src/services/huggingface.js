const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_TOKEN   = process.env.HF_API_TOKEN || '';

async function hfRequest(model, body) {
  if (!HF_TOKEN) throw new Error('HF_API_TOKEN not configured');
  const res = await fetch(`${HF_API_URL}/${model}`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HuggingFace API error: ${res.statusText}`);
  return res.json();
}

export async function sentimentAnalysis(text) {
  // Returns: [{label:'POSITIVE'|'NEGATIVE'|'NEUTRAL', score:0.99}]
  const result = await hfRequest('cardiffnlp/twitter-roberta-base-sentiment-latest', { inputs: text });
  return Array.isArray(result[0]) ? result[0] : result;
}

export async function generateImage(prompt) {
  if (!HF_TOKEN) throw new Error('HF_API_TOKEN not configured');
  const res = await fetch(`${HF_API_URL}/stabilityai/stable-diffusion-xl-base-1.0`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ inputs: prompt }),
  });
  if (!res.ok) throw new Error(`Image generation failed: ${res.statusText}`);
  return res.arrayBuffer(); // raw image bytes
}

export async function detectLanguage(text) {
  const result = await hfRequest('papluca/xlm-roberta-base-language-detection', { inputs: text });
  const top    = (Array.isArray(result[0]) ? result[0] : result)
    .sort((a, b) => b.score - a.score)[0];
  return top?.label || 'en';
}
