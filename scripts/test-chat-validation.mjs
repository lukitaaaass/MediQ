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

// Este test asume que GEMINI_API_KEY NO esta definida, para poder ejercitar la
// rama not_configured sin llegar nunca a la red.
delete process.env.GEMINI_API_KEY;

const OK_BODY = { system: 'eres un asistente', messages: [{ role: 'user', content: 'hola' }] };

const cases = [
  {
    desc: 'metodo GET -> 405 method_not_allowed',
    req: () => mockReq({ method: 'GET' }),
    expect: (r) => r.statusCode === 405 && r.body.code === 'method_not_allowed',
  },
  {
    desc: 'req.body undefined -> 400 bad_request, NO TypeError (el bug original)',
    req: () => mockReq({ body: undefined }),
    expect: (r) => r.statusCode === 400 && r.body.code === 'bad_request' && /messages/.test(r.body.error),
  },
  {
    desc: 'messages no es array -> 400 bad_request',
    req: () => mockReq({ body: { messages: 'hola' } }),
    expect: (r) => r.statusCode === 400 && r.body.code === 'bad_request',
  },
  {
    desc: 'messages vacio -> 400 bad_request',
    req: () => mockReq({ body: { messages: [] } }),
    expect: (r) => r.statusCode === 400 && r.body.code === 'bad_request',
  },
  {
    desc: 'todos los turnos malformados -> 400 bad_request',
    req: () => mockReq({ body: { messages: [{ role: 'system', content: 1 }, null] } }),
    expect: (r) => r.statusCode === 400 && r.body.code === 'bad_request' && /utilizable/.test(r.body.error),
  },
  {
    desc: 'system gigante (300k) -> 413 context_too_large, accionable',
    req: () => mockReq({
      body: { system: 'x'.repeat(300_000), messages: [{ role: 'user', content: 'hola' }] },
    }),
    expect: (r) => r.statusCode === 413 && r.body.code === 'context_too_large'
                && /base de conocimiento/.test(r.body.error),
  },
  {
    desc: 'sin GEMINI_API_KEY -> 500 not_configured (no transitorio)',
    req: () => mockReq({ body: OK_BODY }),
    expect: (r) => r.statusCode === 500 && r.body.code === 'not_configured',
  },
  {
    desc: 'cabeceras de rate limit presentes en toda respuesta',
    req: () => mockReq({ body: { messages: [] } }),
    expect: (r) => r.headers['X-RateLimit-Limit'] === '20' && 'X-RateLimit-Remaining' in r.headers,
  },
  {
    desc: 'toda respuesta de error trae code ademas de error',
    req: () => mockReq({ body: { messages: [] } }),
    expect: (r) => typeof r.body.code === 'string' && typeof r.body.error === 'string',
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

/* El rate limit necesita varias peticiones desde la MISMA IP, asi que no encaja
   en la tabla de arriba (que usa una IP distinta por caso a proposito).
   Importa que salga rate_limited y no upstream_error: son el mismo 429 para el
   cliente, pero solo en este caso tiene sentido que el usuario espere y reintente. */
{
  const fixedIp = { 'x-forwarded-for': '203.0.113.7' };
  let last = null;
  for (let i = 0; i < 21; i++) {
    last = mockRes();
    await handler({ method: 'POST', body: OK_BODY, headers: fixedIp, socket: {} }, last);
  }

  const pass = last.statusCode === 429
    && last.body.code === 'rate_limited'
    && 'Retry-After' in last.headers;
  pass ? ok++ : fail++;
  console.log(`${pass ? 'PASA ' : 'FALLA'}  peticion 21 desde la misma IP -> 429 rate_limited + Retry-After`);
  if (!pass) console.log(`      status=${last.statusCode} body=${JSON.stringify(last.body)}`);
}

console.log(`\n${ok} pasan, ${fail} fallan`);
process.exit(fail ? 1 : 0);
