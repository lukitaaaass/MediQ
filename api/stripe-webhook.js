import Stripe from 'stripe';

// Vercel: deshabilitar el body parser para leer el raw body (necesario para verificar la firma)
export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Llama a la API REST de Supabase con el service role key (sin SDK)
async function upsertSubscription(payload) {
  const url = `${process.env.PUBLIC_SUPABASE_URL}/rest/v1/subscriptions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[webhook] supabase upsert error:', text);
  }
}

async function updateSubscription(stripeSubId, patch) {
  const url = `${process.env.PUBLIC_SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${stripeSubId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error('[webhook] supabase update error:', text);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const sig     = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);
  const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] signature error:', err.message);
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId  = session.metadata?.user_id;
        if (!userId) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const planId = sub.items.data[0]?.price?.id;
        const plan = planId === process.env.STRIPE_PRICE_ANNUAL ? 'practica_annual' : 'practica_monthly';

        await upsertSubscription({
          user_id:                userId,
          stripe_customer_id:     session.customer,
          stripe_subscription_id: session.subscription,
          status:                 sub.status,
          plan,
          trial_end:              sub.trial_end     ? new Date(sub.trial_end * 1000).toISOString()             : null,
          current_period_end:     new Date(sub.current_period_end * 1000).toISOString(),
          updated_at:             new Date().toISOString(),
        });
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await updateSubscription(sub.id, {
          status:             sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          trial_end:          sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          updated_at:         new Date().toISOString(),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await updateSubscription(sub.id, {
          status:     'canceled',
          updated_at: new Date().toISOString(),
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await updateSubscription(invoice.subscription, {
            status:     'past_due',
            updated_at: new Date().toISOString(),
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err);
  }

  res.json({ received: true });
}
