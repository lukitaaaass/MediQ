import Stripe from 'stripe';

const PRICE_IDS = {
  monthly: 'price_XXXXXXXXXXXXXXXXXXXXXXXX',  // reemplaza con tu price_id mensual de Stripe
  annual:  'price_XXXXXXXXXXXXXXXXXXXXXXXX',  // reemplaza con tu price_id anual de Stripe
};

export async function POST({ request }) {
  const token = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!token) return jsonErr('No autorizado', 401);

  const SUPABASE_URL      = import.meta.env.PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const STRIPE_KEY        = import.meta.env.STRIPE_SECRET_KEY;
  const SITE_URL          = import.meta.env.PUBLIC_SITE_URL || 'https://mediq.app';

  // Verificar JWT con Supabase
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) return jsonErr('No autorizado', 401);
  const user = await userRes.json();

  const body = await request.json();
  const plan = body.plan === 'annual' ? 'annual' : 'monthly';
  const priceId = PRICE_IDS[plan];

  const stripe = new Stripe(STRIPE_KEY);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { user_id: user.id },
    },
    customer_email: user.email,
    metadata: { user_id: user.id },
    success_url: `${SITE_URL}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${SITE_URL}/pricing`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
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
