// Sliding-window rate limiter: 20 req/min per IP (persists across warm invocations)
const rateMap = new Map();
const RATE_LIMIT  = 20;
const RATE_WINDOW = 60_000;

function checkRate(ip) {
  const now = Date.now();
  const hits = (rateMap.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (hits.length >= RATE_LIMIT) return { ok: false, remaining: 0, reset: Math.ceil((hits[0] + RATE_WINDOW - now) / 1000) };
  hits.push(now);
  rateMap.set(ip, hits);
  return { ok: true, remaining: RATE_LIMIT - hits.length };
}

// Prune IPs that have had no requests for > 5 minutes to avoid unbounded growth
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [ip, hits] of rateMap) {
    if (!hits.length || hits[hits.length - 1] < cutoff) rateMap.delete(ip);
  }
}, 60_000);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();
  const rate = checkRate(ip);

  res.setHeader('X-RateLimit-Limit',     String(RATE_LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(rate.remaining));

  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.reset));
    return res.status(429).json({
      error: `Demasiadas peticiones. Espera ${rate.reset}s antes de volver a intentarlo.`,
    });
  }

  const { system, messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Parámetros inválidos: messages vacío' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY no está configurada' });
  }

  const groqMessages = [
    { role: 'system', content: system },
    ...messages,
  ];

  let groqRes;
  try {
    groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 2048,
        stream: true,
      }),
    });
  } catch (err) {
    console.error('[/api/chat] fetch error:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }

  if (!groqRes.ok) {
    const data = await groqRes.json();
    const msg = data?.error?.message || JSON.stringify(data);
    console.error('[/api/chat] Groq error', groqRes.status, msg);
    return res.status(groqRes.status).json({ error: `Groq ${groqRes.status}: ${msg}` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = groqRes.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    console.error('[/api/chat] stream error:', err);
  } finally {
    res.end();
  }
}
