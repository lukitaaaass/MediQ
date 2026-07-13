import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = (req.headers['authorization'] || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  const SUPABASE_URL      = process.env.PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const SERVICE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const STRIPE_KEY        = process.env.STRIPE_SECRET_KEY;
  const SITE_URL          = process.env.PUBLIC_SITE_URL || 'https://mediq.app';

  if (!SUPABASE_URL || !SERVICE_KEY || !STRIPE_KEY) {
    console.error('[/api/billing-portal] Env vars ausentes');
    return res.status(500).json({ error: 'Servidor mal configurado.' });
  }

  // Verificar JWT con Supabase
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return res.status(401).json({ error: 'No autorizado' });
  const user = await userRes.json();

  // Buscar stripe_customer_id en subscriptions
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&select=stripe_customer_id&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const subs = await subRes.json();
  const customerId = subs?.[0]?.stripe_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No hay suscripción activa' });

  try {
    const stripe = new Stripe(STRIPE_KEY);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${SITE_URL}/account`,
    });
    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error('[/api/billing-portal] Stripe error:', err);
    return res.status(500).json({ error: 'No se pudo abrir el portal.' });
  }
}
