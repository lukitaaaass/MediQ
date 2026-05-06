import Stripe from 'stripe';

export async function POST({ request }) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return jsonErr('No autorizado', 401);

  const SUPABASE_URL      = import.meta.env.PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const SERVICE_KEY       = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  const STRIPE_KEY        = import.meta.env.STRIPE_SECRET_KEY;
  const SITE_URL          = import.meta.env.PUBLIC_SITE_URL || 'https://mediq.app';

  // Verificar JWT con Supabase
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return jsonErr('No autorizado', 401);
  const user = await userRes.json();

  // Buscar stripe_customer_id en subscriptions
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${user.id}&select=stripe_customer_id&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );
  const subs = await subRes.json();
  const customerId = subs?.[0]?.stripe_customer_id;
  if (!customerId) return jsonErr('No hay suscripción activa', 400);

  // Crear sesión del portal de Stripe
  const stripe = new Stripe(STRIPE_KEY);
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${SITE_URL}/account`,
  });

  return new Response(JSON.stringify({ url: portalSession.url }), {
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
