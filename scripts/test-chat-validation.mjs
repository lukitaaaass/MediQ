/**
 * Comprueba las rutas de validacion de api/chat.js sin tocar la red.
 *
 * Todas las peticiones de aqui salen del handler ANTES del fetch a Gemini, asi
 * que el test no necesita GEMINI_API_KEY ni conexion. El caso que motivo esto:
 * `const { system, messages } = req.body` petaba con un TypeError cuando el
 * cuerpo no venia parseado, y el usuario recibia un 500 mudo.
 *
 * Uso: node scripts/test-chat-validation.mjs
 */
import handler from '../api/chat.js';

function mockRes() {
  const res = { statusCode: null, body: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  res.write = () => {};
  res.end = () => {};
  return res;
}

let ipCounter = 0;
function mockReq({ method = 'POST', body } = {}) {
  // IP distinta por peticion: el rate limiter es de 20/min y no queremos que
  // un test contamine al siguiente con un 429.
  ipCounter += 1;
  return { method, body, headers: { 'x-forwarded-for': `10.0.0.${ipCounter}` }, socket: {} };
}

const cases = [
  {
    desc: 'metodo GET -> 405',
    req: () => mockReq({ method: 'GET' }),
    expect: (r) => r.statusCode === 405,
  },
  {
    desc: 'req.body undefined -> 400, NO TypeError (el bug original)',
    req: () => mockReq({ body: undefined }),
    expect: (r) => r.statusCode === 400 && /messages/.test(r.body.error),
  },
  {
    desc: 'messages no es array -> 400',
    req: () => mockReq({ body: { messages: 'hola' } }),
    expect: (r) => r.statusCode === 400,
  },
  {
    desc: 'messages vacio -> 400',
    req: () => mockReq({ body: { messages: [] } }),
    expect: (r) => r.statusCode === 400,
  },
  {
    desc: 'todos los turnos malformados -> 400',
    req: () => mockReq({ body: { messages: [{ role: 'system', content: 1 }, null] } }),
    expect: (r) => r.statusCode === 400 && /utilizable/.test(r.body.error),
  },
  {
    desc: 'system gigante (300k) -> 413 accionable',
    req: () => mockReq({
      body: { system: 'x'.repeat(300_000), messages: [{ role: 'user', content: 'hola' }] },
    }),
    expect: (r) => r.statusCode === 413 && /base de conocimiento/.test(r.body.error),
  },
  {
    desc: 'cabeceras de rate limit presentes en toda respuesta',
    req: () => mockReq({ body: { messages: [] } }),
    expect: (r) => r.headers['X-RateLimit-Limit'] === '20' && 'X-RateLimit-Remaining' in r.headers,
  },
];

let ok = 0, fail = 0;

for (const c of cases) {
  const res = mockRes();
  let threw = null;
  try {
    await handler(c.req(), res);
  } catch (err) {
    threw = err;
  }

  const pass = !threw && c.expect(res);
  pass ? ok++ : fail++;
  console.log(`${pass ? 'PASA ' : 'FALLA'}  ${c.desc}`);
  if (threw) console.log(`      lanzo excepcion: ${threw.message}`);
  else if (!pass) console.log(`      status=${res.statusCode} body=${JSON.stringify(res.body)}`);
}

console.log(`\n${ok} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
