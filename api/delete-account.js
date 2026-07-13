export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  const SUPABASE_URL      = process.env.PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[/api/delete-account] Env vars ausentes');
    return res.status(500).json({ error: 'Servidor mal configurado.' });
  }

  // Verificar JWT
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return res.status(401).json({ error: 'No autorizado' });
  const user = await userRes.json();

  // Eliminar usuario con service role (admin API)
  const delRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
  });

  if (!delRes.ok) {
    const err = await delRes.text();
    console.error('[/api/delete-account]', err);
    return res.status(500).json({ error: 'No se pudo eliminar la cuenta' });
  }

  return res.status(200).json({ ok: true });
}
