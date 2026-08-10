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
   presupuesto y cortaba la respuesta a media frase. */
const MAX_TOKENS = Number(import.meta.env.GEMINI_MAX_TOKENS) || 8192;

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
    return jsonErr(String(err.message || err), 500);
  }

  if (!aiRes.ok) {
    // El cuerpo de error puede no ser JSON (502/504 de un proxy, HTML de
    // error). Leerlo como texto primero evita que un fallo del proveedor se
    // convierta aqui en un throw sin mensaje util.
    const raw = await aiRes.text();
    let msg = raw;
    try { msg = JSON.parse(raw)?.error?.message || raw; } catch (_) {}
    console.error('[/api/chat] Gemini error', aiRes.status, msg);
    return jsonErr(`Gemini ${aiRes.status}: ${msg}`, aiRes.status);
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
