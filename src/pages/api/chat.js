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

  const apiKey = import.meta.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonErr('GROQ_API_KEY no está en el .env', 500);
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
    return jsonErr(String(err.message || err), 500);
  }

  if (!groqRes.ok) {
    const data = await groqRes.json();
    const msg = data?.error?.message || JSON.stringify(data);
    console.error('[/api/chat] Groq error', groqRes.status, msg);
    return jsonErr(`Groq ${groqRes.status}: ${msg}`, groqRes.status);
  }

  return new Response(groqRes.body, {
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
