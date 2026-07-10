import Stripe from 'stripe';

export async function POST({ request }) {
  const STRIPE_KEY            = import.meta.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL          = import.meta.env.PUBLIC_SUPABASE_URL;
  const SERVICE_KEY           = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

  const sig  = request.headers.get('stripe-signature');
  const body = await request.text();

  let event;
  try {
    const stripe = new Stripe(STRIPE_KEY);
    event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  const sb = (path, opts = {}) =>
    fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      ...opts,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
        ...opts.headers,
      },
    });

  if (event.type === 'checkout.session.completed') {
    const session    = event.data.object;
    const userId     = session.metadata?.user_id;
    const customerId = session.customer;
    const subId      = session.subscription;

    if (!userId) return ok();

    const stripe = new Stripe(STRIPE_KEY);
    const sub    = await stripe.subscriptions.retrieve(subId);

    await sb('subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        user_id:            userId,
        stripe_customer_id: customerId,
        stripe_sub_id:      subId,
        status:             sub.status,
        price_id:           sub.items.data[0]?.price?.id,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }),
    });
  }

  if (
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const sub    = event.data.object;
    const subId  = sub.id;

    await sb(`subscriptions?stripe_sub_id=eq.${subId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status:             sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }),
    });
  }

  // Renovación fallida: la tarjeta no cargó. La suscripción entra en past_due.
  // Marcamos el estado para que el paywall del chat se active y el usuario
  // reciba el email de reintento de Stripe.
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subId   = invoice.subscription;
    if (subId) {
      await sb(`subscriptions?stripe_sub_id=eq.${subId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'past_due' }),
      });
    }
  }

  // Trial a punto de terminar (por defecto 3 días antes).
  // Por ahora solo lo logueamos; cuando integremos email (Resend/Postmark)
  // aqui se dispara el aviso "quedan X dias de prueba, activa tu tarjeta".
  if (event.type === 'customer.subscription.trial_will_end') {
    const sub = event.data.object;
    console.log('[stripe] trial_will_end for sub', sub.id, 'user', sub.metadata?.user_id);
    // TODO: integrar email service. Sub.trial_end trae el timestamp del fin.
  }

  return ok();
}

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
