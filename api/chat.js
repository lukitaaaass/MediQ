export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      console.error('[/api/chat] Groq error', groqRes.status, msg);
      return res.status(groqRes.status).json({ error: `Groq ${groqRes.status}: ${msg}` });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: 'Groq no devolvió texto: ' + JSON.stringify(data) });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error('[/api/chat] excepción:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
