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
   valor en un diferencial. Configurable por si hiciera falta ajustarlo.

   El limite NO lo pone el modelo: Flash admite ~65k tokens de salida. Lo
   pone el tiempo de ejecucion de la funcion, porque la respuesta va en
   streaming y la funcion sigue viva hasta que termina de generar. Si se
   agota el maxDuration de vercel.json la respuesta se corta a media frase
   igual que antes, pero sin finish_reason que lo explique — mismo sintoma,
   causa distinta y mas dificil de diagnosticar. Por eso este valor y el
   maxDuration de vercel.json se suben juntos: pasar de aqui sin tocar
   aquel solo cambia por que se rompe. */
const MAX_TOKENS = Number(process.env.GEMINI_MAX_TOKENS) || 16384;

/* Reintentos ante fallos transitorios del proveedor.

   Un 503 UNAVAILABLE ("This model is currently experiencing high demand")
   no es un error del prompt ni de la configuracion: es capacidad de Google,
   y ellos mismos dicen que los picos suelen ser temporales. Sin reintento
   ese pico llega al usuario como un error crudo en mitad de una consulta
   clinica, cuando lo que hacia falta era esperar dos segundos.

   Se reintenta solo lo que tiene sentido reintentar: 429 y 5xx. Un 400 o un
   401 volverian a fallar igual, asi que reintentarlos solo gastaria tiempo
   de funcion y retrasaria el mensaje de error.

   Importante: solo se reintenta ANTES de empezar a emitir el stream. Una
   vez enviado el primer byte al cliente, reintentar duplicaria texto a
   media respuesta.

   El presupuesto se mantiene corto a proposito (3 intentos, ~1,8s de espera
   acumulada en el peor caso) porque los reintentos consumen del mismo
   maxDuration que la generacion. */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS   = 3;
const BACKOFF_MS     = 600;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/* Devuelve { upstream, status, msg }: upstream es la respuesta lista para
   hacer streaming, o null si se agotaron los intentos. */
async function requestWithRetry(payload, apiKey) {
  let last = { upstream: null, status: 0, msg: 'sin respuesta del proveedor' };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) {
      // Backoff exponencial con algo de jitter, para no reintentar todas las
      // peticiones a la vez y volver a saturar lo que ya estaba saturado.
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

    // El cuerpo de error puede no ser JSON (502/504 de un proxy, HTML de
    // error). Leerlo como texto primero evita que un fallo del proveedor se
    // convierta aqui en un throw sin mensaje util.
    const raw = await res.text();
    let msg = raw;
    try { msg = JSON.parse(raw)?.error?.message || raw; } catch (_) {}
    last = { upstream: null, status: res.status, msg };

    console.error(`[/api/chat] Gemini ${res.status} (intento ${attempt}/${MAX_ATTEMPTS}):`, msg);
    if (!RETRY_STATUSES.has(res.status)) break;
  }

  return last;
}

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

  const { upstream: aiRes, status, msg } = await requestWithRetry({
    model: GEMINI_MODEL,
    messages: aiMessages,
    max_tokens: MAX_TOKENS,
    stream: true,
  }, apiKey);

  if (!aiRes) {
    /* Al usuario se le da el motivo, no el volcado del proveedor: un JSON de
       Google con su stack no le dice si tiene que reintentar o avisar a
       alguien. El detalle completo queda en la consola del servidor. */
    const isTransient = RETRY_STATUSES.has(status);
    const userMsg = isTransient
      ? 'El modelo está saturado ahora mismo. Ya lo he reintentado un par de veces; espera unos segundos y vuelve a enviar el mensaje.'
      : `El modelo ha rechazado la petición (${status}). Revisa la consola del servidor.`;
    return res.status(isTransient ? 503 : status || 502).json({ error: userMsg });
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
