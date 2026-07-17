/**
 * Endpoint de la waitlist de MIR/residentes.
 * Vercel serverless function (auto-detectada desde /api).
 *
 * Guarda email + universidad + nivel en Supabase (tabla `mir_waitlist`).
 * Sin autenticacion. Rate-limit sencillo por email (upsert: 1 fila por email).
 */

const VALID_LEVELS = new Set([
  'estudiante', 'mir_r1', 'mir_r2', 'mir_r3', 'mir_r4', 'mir_r5', 'preparando_mir',
]);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
  const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[/api/mir-waitlist] Supabase env vars ausentes');
    return res.status(500).json({ error: 'El servidor no está configurado.' });
  }

  const { email, university, level } = req.body || {};

  if (typeof email !== 'string' || typeof university !== 'string' || typeof level !== 'string') {
    return res.status(400).json({ error: 'Parámetros inválidos.' });
  }

  const emailNorm = email.trim().toLowerCase();
  const uniNorm = university.trim();
  const levelNorm = level.trim();

  // Validaciones defensivas — el frontend ya valida, esto es la última línea.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm) || emailNorm.length > 200) {
    return res.status(400).json({ error: 'Correo inválido.' });
  }
  if (uniNorm.length < 2 || uniNorm.length > 120) {
    return res.status(400).json({ error: 'Facultad/hospital inválido.' });
  }
  if (!VALID_LEVELS.has(levelNorm)) {
    return res.status(400).json({ error: 'Nivel inválido.' });
  }

  const emailDomain = emailNorm.split('@')[1] || '';

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim();

  // Upsert: si el mismo email vuelve, actualizamos su universidad/nivel en vez de duplicar fila.
  const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/mir_waitlist?on_conflict=email`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({
      email:         emailNorm,
      university:    uniNorm,
      level:         levelNorm,
      email_domain:  emailDomain,
      ip_last_seen:  ip,
      updated_at:    new Date().toISOString(),
    }),
  });

  if (!upsertRes.ok) {
    const txt = await upsertRes.text().catch(() => '');
    console.error('[/api/mir-waitlist] Supabase error', upsertRes.status, txt);
    return res.status(500).json({ error: 'No se pudo registrar. Vuelve a intentarlo en unos minutos.' });
  }

  return res.status(200).json({ ok: true });
}
