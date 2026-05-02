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
