/**
 * Verificacion del reintento de api/chat.js ante fallos transitorios.
 *
 * Se ejecuta con `npm run test:chat-retry`. No toca la red ni necesita una
 * GEMINI_API_KEY real: sustituye globalThis.fetch por un doble antes de
 * importar el handler, y comprueba el comportamiento observable.
 *
 * Existe porque el caso que cubre es dificil de reproducir a mano —hay que
 * pillar a Gemini saturado— y facil de romper sin darse cuenta: basta con
 * anadir un status a RETRY_STATUSES que no deberia reintentarse, o mover el
 * reintento por debajo del primer byte del stream, para que el fallo solo
 * aparezca en produccion y en mitad de una consulta.
 */
process.env.GEMINI_API_KEY = 'test-key';

let calls = 0;
let scenario = 'recovers';

const err503 = () => new Response(
  JSON.stringify({ error: { code: 503, message: 'This model is currently experiencing high demand.', status: 'UNAVAILABLE' } }),
  { status: 503, headers: { 'content-type': 'application/json' } },
);
const err400 = () => new Response(
  JSON.stringify({ error: { code: 400, message: 'Invalid argument' } }),
  { status: 400, headers: { 'content-type': 'application/json' } },
);
const ok = () => new Response('data: {"choices":[{"delta":{"content":"hola"}}]}\n\n', { status: 200 });

globalThis.fetch = async () => {
  calls++;
  if (scenario === 'recovers')  return calls < 3 ? err503() : ok();
  if (scenario === 'exhausted') return err503();
  if (scenario === 'fatal')     return calls === 1 ? err400() : ok();
  throw new Error(`escenario desconocido: ${scenario}`);
};

const { default: handler } = await import('../api/chat.js');

function makeRes() {
  const out = { status: 200, body: null, chunks: [], headers: {} };
  return {
    out,
    setHeader(k, v) { out.headers[k] = v; },
    status(code) { out.status = code; return this; },
    json(payload) { out.body = payload; return this; },
    write(chunk) { out.chunks.push(chunk); },
    end() {},
  };
}

/* Cada escenario usa una IP distinta a proposito: el rate limiter del
   endpoint es por IP y compartirla haria que unas pruebas contaminaran a
   otras al acumular peticiones. */
async function run(name, sc, ip) {
  calls = 0;
  scenario = sc;
  const res = makeRes();
  const started = Date.now();

  await handler(
    {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
      body: { system: 'eres un asistente', messages: [{ role: 'user', content: 'hola' }] },
    },
    res,
  );

  const ms = Date.now() - started;
  console.log(`\n--- ${name}`);
  console.log(`    llamadas a Gemini : ${calls}`);
  console.log(`    status devuelto   : ${res.out.status}`);
  console.log(`    tiempo            : ${ms}ms`);
  console.log(`    error al usuario  : ${res.out.body?.error ?? '(ninguno, va en streaming)'}`);
  console.log(`    bytes streameados : ${res.out.chunks.join('').length}`);

  return { calls, ms, status: res.out.status, error: res.out.body?.error, streamed: res.out.chunks.join('') };
}

const recovers  = await run('503 dos veces y luego OK', 'recovers',  '203.0.113.1');
const exhausted = await run('503 permanente',           'exhausted', '203.0.113.2');
const fatal     = await run('400 (no reintentable)',    'fatal',     '203.0.113.3');

const checks = [
  ['reintenta hasta recuperarse',                recovers.calls === 3 && recovers.status === 200],
  ['al recuperarse el stream llega entero',      recovers.streamed.includes('hola')],
  ['no reintenta indefinidamente',               exhausted.calls === 3],
  ['503 persistente se propaga como 503',        exhausted.status === 503],
  ['el usuario ve el motivo, no el JSON crudo',  /saturado/.test(exhausted.error) && !/UNAVAILABLE/.test(exhausted.error)],
  ['un 400 no se reintenta',                     fatal.calls === 1],
  ['un 400 se propaga como 400',                 fatal.status === 400],
  ['hay backoff real entre intentos',            exhausted.ms >= 600],
];

console.log('\n=== RESULTADOS ===');
const fallidas = checks.filter(([, pass]) => !pass);
for (const [label, pass] of checks) console.log(`${pass ? 'PASS ' : 'FALLO'}  ${label}`);
console.log(fallidas.length === 0 ? '\nTodo OK' : `\n${fallidas.length} comprobacion(es) fallidas`);

process.exit(fallidas.length === 0 ? 0 : 1);
