/**
 * Proxy del chat hacia Gemini — version de DESARROLLO.
 *
 * OJO — hay DOS ficheros para la misma ruta y no son intercambiables:
 *   · este, ruta de Astro, es el que responde en local con `npm run dev`;
 *   · api/chat.js, en la raiz, funcion serverless de Vercel, es el que
 *     responde EN PRODUCCION (Vercel enruta /api/* a esa carpeta antes que
 *     a Astro).
 * Si cambias el proveedor o el modelo, cambialo en LOS DOS. Tocar solo este
 * no cambia nada de lo que ven los usuarios.
 *
 * Se usa la capa compatible con OpenAI de Gemini en vez de su API nativa a
 * proposito: mantiene identico el formato de streaming (data: {...} con
 * choices[0].delta.content), que es justo lo que parsea el cliente en
 * chat.astro. Con la API nativa habria que reescribir tambien ese parseo y
 * la forma de los mensajes, a cambio de nada que aqui necesitemos.
 *
 * Requiere GEMINI_API_KEY en las variables de entorno de Vercel. Sin ella el
 * chat responde 500 con un mensaje explicito: no hay fallback a otro
 * proveedor, para que siempre se sepa que modelo contesto.
 */
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

/* Mismo criterio que en api/chat.js: el modelo se puede fijar con la
   variable GEMINI_MODEL, porque Google retira modelos para cuentas nuevas
   sin previo aviso. Por defecto, el alias que apunta al Flash vigente. */
const GEMINI_MODEL = import.meta.env.GEMINI_MODEL || 'gemini-flash-latest';

/* Mismo criterio que en api/chat.js: 2048 venia de la epoca de Llama y con
   Gemini se queda corto, porque el razonamiento interno consume del mismo
   presupuesto y cortaba la respuesta a media frase. El techo real no lo pone
   el modelo (Flash admite ~65k de salida) sino el maxDuration de la funcion
   en produccion; ver el comentario largo en api/chat.js. */
const MAX_TOKENS = Number(import.meta.env.GEMINI_MAX_TOKENS) || 16384;

/* Mismo criterio que en api/chat.js: un 503 UNAVAILABLE de Gemini es un pico
   de demanda temporal, no un error del prompt, y sin reintento llega crudo
   al usuario. Se reintenta solo 429 y 5xx, y solo antes de empezar a emitir
   el stream. Ver el comentario largo en api/chat.js. */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS   = 3;
const BACKOFF_MS     = 600;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function requestWithRetry(payload, apiKey) {
  let last = { upstream: null, status: 0, msg: 'sin respuesta del proveedor' };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      await sleep(BACKOFF_MS * 2 ** (attempt - 2) + Math.random() * 200);
    }

    let res;
    try {
      res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      last = { upstream: null, status: 502, msg: String(err.message || err) };
      console.error(`[/api/chat] fetch error (intento ${attempt}/${MAX_ATTEMPTS}):`, err);
      continue;
    }

    if (res.ok) return { upstream: res, status: res.status, msg: '' };

    const raw = await res.text();
    let msg = raw;
    try { msg = JSON.parse(raw)?.error?.message || raw; } catch (_) {}
    last = { upstream: null, status: res.status, msg };

    console.error(`[/api/chat] Gemini ${res.status} (intento ${attempt}/${MAX_ATTEMPTS}):`, msg);
    if (!RETRY_STATUSES.has(res.status)) break;
  }

  return last;
}

// Sliding-window rate limiter: 20 req/min per IP
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

export async function POST({ request }) {
  const ip = (request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'dev')
    .split(',')[0].trim();
  const rate = checkRate(ip);

  if (!rate.ok) {
    return new Response(
      JSON.stringify({ error: `Demasiadas peticiones. Espera ${rate.reset}s antes de volver a intentarlo.` }),
      {
        status: 429,
        headers: {
          'content-type': 'application/json',
          'Retry-After': String(rate.reset),
          'X-RateLimit-Limit': String(RATE_LIMIT),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const { system, messages } = await request.json();

  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonErr('Parámetros inválidos: messages vacío', 400);
  }

  const apiKey = import.meta.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonErr('El servidor no está configurado: falta GEMINI_API_KEY.', 500);
  }

  const aiMessages = [
    { role: 'system', content: system },
    ...messages,
  ];

  const { upstream: aiRes, status } = await requestWithRetry({
    model: GEMINI_MODEL,
    messages: aiMessages,
    max_tokens: MAX_TOKENS,
    stream: true,
  }, apiKey);

  if (!aiRes) {
    // El detalle del proveedor queda en la consola; al usuario, el motivo.
    const isTransient = RETRY_STATUSES.has(status);
    return isTransient
      ? jsonErr('El modelo está saturado ahora mismo. Ya lo he reintentado un par de veces; espera unos segundos y vuelve a enviar el mensaje.', 503)
      : jsonErr(`El modelo ha rechazado la petición (${status}). Revisa la consola del servidor.`, status || 502);
  }

  return new Response(aiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-RateLimit-Limit': String(RATE_LIMIT),
      'X-RateLimit-Remaining': String(rate.remaining),
    },
  });
}

function jsonErr(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
