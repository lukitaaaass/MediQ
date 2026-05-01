export const prerender = false;

export async function POST({ request }) {
  try {
    const { system, messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Parámetros inválidos: messages vacío' }, 400);
    }

    const apiKey = import.meta.env.GROQ_API_KEY;
    if (!apiKey) {
      return json({ error: 'GROQ_API_KEY no está en el .env' }, 500);
    }

    // Groq usa formato OpenAI: system va como primer mensaje
    const groqMessages = [
      { role: 'system', content: system },
      ...messages,
    ];

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: groqMessages,
        max_tokens: 2048,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      console.error('[/api/chat] Groq error', res.status, msg);
      return json({ error: `Groq ${res.status}: ${msg}` }, res.status);
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return json({ error: 'Groq no devolvió texto: ' + JSON.stringify(data) }, 500);
    }

    return json({ text });

  } catch (err) {
    console.error('[/api/chat] excepción:', err);
    return json({ error: String(err.message || err) }, 500);
  }
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
