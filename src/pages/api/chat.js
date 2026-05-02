export async function POST({ request }) {
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
    },
  });
}

function jsonErr(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
