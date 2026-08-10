/**
 * Proxy del chat hacia Gemini. ESTE es el endpoint que sirve /api/chat en
 * produccion.
 *
 * OJO — hay DOS ficheros para la misma ruta y no son intercambiables:
 *   · este, api/chat.js, funcion serverless de Vercel, es el que responde
 *     en produccion (Vercel enruta /api/* a esta carpeta antes que a Astro);
 *   · src/pages/api/chat.js, ruta de Astro, es el que responde en local con
 *     `npm run dev`, donde las funciones de esta carpeta no se ejecutan.
 * Si cambias el proveedor o el modelo, cambialo en LOS DOS o produccion y
 * local dejaran de comportarse igual.
 *
 * Se usa la capa compatible con OpenAI de Gemini en vez de su API nativa a
 * proposito: mantiene identico el formato de streaming (data: {...} con
 * choices[0].delta.content), que es justo lo que parsea el cliente en
 * chat.astro. Con la API nativa habria que reescribir tambien ese parseo.
 *
 * Requiere GEMINI_API_KEY en las variables de entorno de Vercel. Sin ella
 * responde 500 con un mensaje explicito: no hay fallback a otro proveedor,
 * para que siempre se sepa que modelo contesto.
 */
const GEMINI_URL   = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// Cambiar a 'gemini-2.5-pro' si se quiere mas profundidad a costa de latencia.
const GEMINI_MODEL = 'gemini-2.5-flash';

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'El servidor no está configurado: falta GEMINI_API_KEY.' });
  }

  const aiMessages = [
    { role: 'system', content: system },
    ...messages,
  ];

  let aiRes;
  try {
    aiRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: aiMessages,
        max_tokens: 2048,
        stream: true,
      }),
    });
  } catch (err) {
    console.error('[/api/chat] fetch error:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }

  if (!aiRes.ok) {
    // El cuerpo de error puede no ser JSON (502/504 de un proxy, HTML de
    // error). Leerlo como texto primero evita que un fallo del proveedor se
    // convierta aqui en un throw sin mensaje util.
    const raw = await aiRes.text();
    let msg = raw;
    try { msg = JSON.parse(raw)?.error?.message || raw; } catch (_) {}
    console.error('[/api/chat] Gemini error', aiRes.status, msg);
    return res.status(aiRes.status).json({ error: `Gemini ${aiRes.status}: ${msg}` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const reader = aiRes.body.getReader();
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
