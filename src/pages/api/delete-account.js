export async function POST({ request }) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return jsonErr('No autorizado', 401);

  const SUPABASE_URL      = import.meta.env.PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const SERVICE_KEY       = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  // Verificar JWT
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return jsonErr('No autorizado', 401);
  const user = await userRes.json();

  // Eliminar usuario con la service role key (admin API)
  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });
  if (!delRes.ok) {
    const err = await delRes.text();
    console.error('[delete-account]', err);
    return jsonErr('No se pudo eliminar la cuenta', 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function jsonErr(msg, status) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
