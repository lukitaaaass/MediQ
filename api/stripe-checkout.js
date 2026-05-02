import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify Supabase session from Authorization header
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  const sbRes = await fetch(`${process.env.PUBLIC_SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': process.env.PUBLIC_SUPABASE_ANON_KEY,
    },
  });
  if (!sbRes.ok) return res.status(401).json({ error: 'Sesión inválida. Inicia sesión de nuevo.' });
  const user = await sbRes.json();

  const { plan = 'monthly' } = req.body;
  const priceId = plan === 'annual'
    ? process.env.STRIPE_PRICE_ANNUAL
    : process.env.STRIPE_PRICE_MONTHLY;

  if (!priceId) return res.status(500).json({ error: 'Plan no configurado. Contacta con soporte.' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const origin = process.env.PUBLIC_SITE_URL || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { trial_period_days: 14 },
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      allow_promotion_codes: true,
      metadata: { user_id: user.id },
      locale: 'es',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe-checkout] error:', err);
    res.status(500).json({ error: err.message });
  }
}
