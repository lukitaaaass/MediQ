# Activar Stripe en producción

Guía paso a paso para pasar de "código listo" a "cobrar de verdad".
El código ya está en el repo (`src/pages/api/stripe-checkout.js`, `stripe-webhook.js`, `billing-portal.js`). Solo faltan configuración y datos.

**Tiempo estimado:** 1h — 30 min de configuración + 15 min de tests + margen.

---

## 1. Crear tabla `subscriptions` en Supabase

Ir a Supabase Dashboard → SQL Editor → New query, pegar y ejecutar:

```sql
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_sub_id text unique,
  status text,
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

-- Los usuarios solo ven su propia fila
create policy "users can read own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

-- Solo el service_role (usado por el webhook) puede escribir.
-- No hace falta policy explícita: service_role bypasea RLS.

create index if not exists subscriptions_stripe_sub_id_idx
  on public.subscriptions(stripe_sub_id);
```

Verifica ejecutando:

```sql
select * from public.subscriptions;
```

Debe devolver una tabla vacía sin errores.

---

## 2. Variables de entorno en Vercel

Vercel → Project → Settings → Environment Variables → añadir para **Production** (y Preview si quieres):

| Variable | Valor | Dónde sacarlo |
|----------|-------|---------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (empezar) o `sk_live_...` | Stripe → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Se rellena en paso 3 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (empieza por eyJ) | Supabase → Project Settings → API → `service_role` (¡es secreto!) |
| `PUBLIC_SITE_URL` | `https://mediq.app` | Tu dominio de producción |

Después de añadirlas, **Vercel → Deployments → Redeploy** el último deploy.

---

## 3. Configurar webhook en Stripe

Stripe Dashboard → Developers → Webhooks → Add endpoint:

- **Endpoint URL:** `https://<tu-dominio>/api/stripe-webhook`
- **Description:** Hygia production webhook
- **Events to send:** seleccionar estos cinco:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end`

Guardar. Después, en la página del endpoint recién creado, **Reveal signing secret** (`whsec_...`) y pegarlo en Vercel como `STRIPE_WEBHOOK_SECRET`. Redeploy.

---

## 4. Verificar Price IDs

En [`src/pages/api/stripe-checkout.js:3-6`](src/pages/api/stripe-checkout.js) están hardcodeados:

```js
const PRICE_IDS = {
  monthly: 'price_1TUBopQ7vgQfCtG2Pr5iXJuH',
  annual:  'price_1TUBpNQ7vgQfCtG2bjO1q2Du',
};
```

**Comprobación crítica:** esos IDs deben corresponder al **mismo modo** (test o live) que la `STRIPE_SECRET_KEY` que has puesto en Vercel. Si no coinciden Stripe devolvería `No such price` al hacer checkout.

- Stripe → Products → seleccionar el producto → copiar el Price ID de cada plan
- Comprobar el toggle **Test/Live mode** en la esquina superior derecha de Stripe
- Si necesitas cambiar los IDs: editar el archivo, commit, push

---

## 5. Test end-to-end en modo test

Con `sk_test_...` como `STRIPE_SECRET_KEY`:

1. Abrir el sitio en incognito → registrarse con un email nuevo
2. Ir a `/pricing` → click en el plan mensual
3. En Stripe Checkout, pagar con tarjeta de prueba: **`4242 4242 4242 4242`**
   - Cualquier fecha futura (`12/34`)
   - Cualquier CVC (`123`)
   - Cualquier código postal
4. Debe redirigir a `/checkout-success`

**Verificaciones:**

- [ ] Stripe Dashboard → Webhooks → tu endpoint → ver evento `checkout.session.completed` con status `200`
- [ ] Supabase → Table editor → `subscriptions` → una fila nueva con tu `user_id`, `stripe_sub_id`, `status = 'trialing'`
- [ ] Ir a `/chat` → el paywall **no aparece** y puedes escribir
- [ ] Ir a `/account` → hay opción de gestionar suscripción, abre Stripe Customer Portal
- [ ] En Stripe → Customers → seleccionar el customer → Cancel subscription
- [ ] Volver a `/chat` → paywall vuelve a aparecer

Si los 6 pasos van bien, la integración funciona.

---

## 6. Cambiar a modo Live

Solo cuando el test end-to-end esté verde:

1. Stripe → toggle a **Live mode**
2. Crear los productos Hygia en Live (los de Test no se transfieren automáticamente)
3. Copiar los nuevos Price IDs → actualizar `PRICE_IDS` en [`stripe-checkout.js`](src/pages/api/stripe-checkout.js) → commit + push
4. En Vercel, cambiar `STRIPE_SECRET_KEY` de `sk_test_...` a `sk_live_...`
5. En Stripe Live → crear un nuevo webhook con la misma URL, mismos eventos, y copiar su `whsec_...` a `STRIPE_WEBHOOK_SECRET` en Vercel
6. Redeploy
7. Hacer un checkout real con **tu propia tarjeta** por 29 € → verificar que la fila en `subscriptions` se crea con `status = 'trialing'`. Cancelar antes de que acabe el trial de 14 días para no cobrar.

**A partir de este punto, cualquier usuario puede pagar de verdad.**

---

## Handlers del webhook — resumen

| Evento Stripe | Qué hace el código | Archivo |
|---------------|-------------------|---------|
| `checkout.session.completed` | Inserta fila en `subscriptions` con datos del cliente y suscripción | `stripe-webhook.js` |
| `customer.subscription.updated` | Actualiza `status` y `current_period_end` (renovación, cambio de plan, cancelación programada) | `stripe-webhook.js` |
| `customer.subscription.deleted` | Actualiza `status` a `canceled` | `stripe-webhook.js` |
| `invoice.payment_failed` | Marca la suscripción como `past_due` → el paywall se activa automáticamente | `stripe-webhook.js` |
| `customer.subscription.trial_will_end` | Solo log por ahora. Cuando integremos email (Resend/Postmark), aquí se dispara el aviso al usuario | `stripe-webhook.js` |

---

## Problemas típicos

**El webhook devuelve 400 "Webhook error"**
Signing secret mal configurado. Verifica que `STRIPE_WEBHOOK_SECRET` en Vercel coincide con el `whsec_...` del webhook activo en Stripe. Redeploy después de cambiarlo.

**El webhook devuelve 200 pero no aparece fila en `subscriptions`**
`SUPABASE_SERVICE_ROLE_KEY` incorrecta o la tabla no existe. Comprueba los logs de Vercel Functions.

**El checkout devuelve `No such price`**
Los Price IDs en `stripe-checkout.js` no corresponden al modo (test/live) de la API key. Ver paso 4.

**El paywall no desaparece tras pagar**
El chat consulta la tabla `subscriptions` en tiempo real. Recarga con Ctrl+Shift+R. Si sigue, verifica en Supabase que la fila existe con `status = 'trialing'` o `'active'`.
