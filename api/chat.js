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
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

/* El modelo se puede fijar con la variable GEMINI_MODEL sin tocar codigo.
   No es un lujo: Google retira modelos para cuentas nuevas sin previo aviso
   —'gemini-2.5-flash' dejo de servirse asi, con un 404 en produccion— y
   cuando pasa conviene poder cambiarlo desde Vercel en un minuto en vez de
   esperar a un deploy.

   Por defecto se usa el alias 'latest', que Google mantiene apuntando al
   Flash vigente, precisamente para no quedarse anclado a una version
   retirada. Si hiciera falta uno concreto, ponerlo en GEMINI_MODEL. */
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

/* Techo de tokens de la respuesta. Heredamos 2048 de la epoca de Llama y con
   Gemini se quedo corto: estos modelos razonan internamente antes de
   contestar y ESOS tokens cuentan contra el mismo presupuesto, asi que el
   razonamiento se comia casi todo y la respuesta se cortaba a media frase
   (finish_reason: "length" con apenas 300 caracteres visibles).

   Se sube el techo en vez de recortar el razonamiento a proposito: en una
   herramienta de apoyo clinico, el razonamiento es justo lo que aporta
   valor en un diferencial. Configurable por si hiciera falta ajustarlo. */
const MAX_TOKENS = Number(process.env.GEMINI_MAX_TOKENS) || 8192;

/* Techo del system prompt. Ojo: este endpoint NO construye el system prompt, lo
   recibe del cliente (systemPrompt() en src/pages/chat.astro) y ahi dentro va la
   base de conocimiento entera. train.astro capa cada documento a 8000 caracteres
   pero no limita CUANTOS documentos hay, y el corpus completo se reenvia en cada
   mensaje. Sin este techo, un corpus grande desborda el contexto del modelo y
   dispara el coste, y el usuario solo ve un error opaco de Gemini.
   256 KB ~ 32 documentos: holgado para uso real, suficiente para frenar el caso
   patologico. */
const MAX_SYSTEM_CHARS = 256_000;

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

  /* `|| {}` no es decorativo: sin el, una peticion sin cuerpo JSON (o con un
     content-type que Vercel no parsea) deja req.body undefined y este destructuring
     lanza un TypeError que sale como un 500 sin mensaje util. */
  const { system, messages } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Parámetros inválidos: messages vacío' });
  }

  // Nos quedamos solo con turnos bien formados; un elemento corrupto no debe
  // llegar al proveedor ni tumbar la peticion entera.
  const safeMessages = messages.filter(
    m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
  );

  if (safeMessages.length === 0) {
    return res.status(400).json({ error: 'Parámetros inválidos: ningún mensaje utilizable' });
  }

  const systemText = typeof system === 'string' ? system : '';

  if (systemText.length > MAX_SYSTEM_CHARS) {
    return res.status(413).json({
      error: 'Tu base de conocimiento es demasiado grande para enviarla en cada consulta. Quita algún documento en Entrenar y vuelve a intentarlo.',
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'El servidor no está configurado: falta GEMINI_API_KEY.' });
  }

  const aiMessages = [
    { role: 'system', content: systemText },
    ...safeMessages,
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
        max_tokens: MAX_TOKENS,
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
