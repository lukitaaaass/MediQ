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

  return ok();
}

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
