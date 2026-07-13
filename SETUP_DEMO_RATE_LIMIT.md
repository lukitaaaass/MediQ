# Activar el rate-limit persistente de la demo

Guía para pasar de "el código está listo" a "el rate-limit funciona de verdad".
El código de [`api/demo-chat.js`](api/demo-chat.js) ya está reescrito para llamar a la RPC `check_demo_usage` en Supabase. Solo faltan la SQL y una env var.

**Tiempo estimado:** 15 min.

**Por qué:** el rate-limit anterior estaba en memoria (`new Map()`). En Vercel serverless, cada cold start levanta un contenedor vacío, y varias invocaciones simultáneas pueden caer en contenedores distintos. Resultado: cualquiera podía spammear la demo abriendo pestañas rápido. Ahora el conteo vive en Supabase y es compartido entre todos los contenedores.

---

## 1. SQL en Supabase (5 min)

Supabase Dashboard → SQL Editor → New query, pegar y ejecutar:

```sql
-- Tabla: una fila por hash de IP
create table if not exists public.demo_usage (
  ip_hash text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

-- Solo el service_role puede tocarla; RLS activo sin policy = tabla cerrada para
-- todo lo que no sea el backend.
alter table public.demo_usage enable row level security;

create index if not exists demo_usage_window_start_idx
  on public.demo_usage(window_start);

-- Función atómica: check-and-increment en una sola transacción con FOR UPDATE.
-- Devuelve (allowed, remaining, reset_sec).
--   - allowed: si la petición puede pasar
--   - remaining: cuántas quedan en la ventana actual (0 si allowed=false)
--   - reset_sec: segundos hasta que la ventana se resetee (0 si allowed=true)
create or replace function public.check_demo_usage(
  p_ip_hash text,
  p_limit int,
  p_window_minutes int
) returns table(allowed boolean, remaining int, reset_sec int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.demo_usage%rowtype;
  v_window_expires_at timestamptz;
begin
  -- Upsert idempotente
  insert into public.demo_usage (ip_hash, count, window_start)
  values (p_ip_hash, 0, now())
  on conflict (ip_hash) do nothing;

  -- Bloqueo de fila para evitar carreras entre invocaciones concurrentes
  select * into v_row
  from public.demo_usage
  where ip_hash = p_ip_hash
  for update;

  v_window_expires_at := v_row.window_start + make_interval(mins => p_window_minutes);

  -- Ventana expirada → reset y consumir 1
  if now() >= v_window_expires_at then
    update public.demo_usage
    set count = 1, window_start = now()
    where ip_hash = p_ip_hash;
    return query select true, p_limit - 1, 0;
    return;
  end if;

  -- Aún hay margen → incrementar
  if v_row.count < p_limit then
    update public.demo_usage
    set count = count + 1
    where ip_hash = p_ip_hash;
    return query select true, p_limit - (v_row.count + 1), 0;
    return;
  end if;

  -- Superado → 429
  return query select false, 0, ceil(extract(epoch from (v_window_expires_at - now())))::int;
end;
$$;

-- Cerrar la función a todo menos service_role. La demo la invoca con la
-- SUPABASE_SERVICE_ROLE_KEY desde el endpoint serverless; anon jamás debería llamarla.
revoke all on function public.check_demo_usage(text, int, int) from public, anon, authenticated;
grant execute on function public.check_demo_usage(text, int, int) to service_role;
```

Verificación (misma ventana SQL):

```sql
-- Simular 9 invocaciones (límite = 8, ventana = 30 min).
-- Las 8 primeras deben devolver allowed=true; la 9ª allowed=false.
do $$
declare i int;
begin
  for i in 1..9 loop
    raise notice 'llamada % → %', i, (select row_to_json(x) from (select * from public.check_demo_usage('test-hash-manual', 8, 30)) x);
  end loop;
end $$;
```

Después, si quieres jugar más, borra la fila de prueba:

```sql
delete from public.demo_usage where ip_hash = 'test-hash-manual';
```

---

## 2. Env var en Vercel (2 min)

Vercel → Project → Settings → Environment Variables (Production):

| Variable | Valor | Cómo generarlo |
|----------|-------|----------------|
| `DEMO_RATE_SALT` | string aleatorio 32+ chars | `openssl rand -hex 32` en terminal, o cualquier password manager. **No lo commitees ni compartas** — con él más el hash de la tabla se podría hacer reverse-lookup de IPs si se filtra el hash. |

Después: Vercel → Deployments → Redeploy last.

Si no la pones, el endpoint sigue funcionando pero:
- Usa un salt hardcodeado (visible en el repo)
- Loguea un warning `[/api/demo-chat] DEMO_RATE_SALT no definido — usando fallback publico` en cada invocación

Esto no bloquea el rate-limit, pero abarata el reverse-lookup si alguien roba la tabla `demo_usage`. Es tarea de 30 seg añadirla, hazla.

---

## 3. Verificación end-to-end

Después de aplicar SQL + env + redeploy:

1. Abrir `https://<tu-dominio>/demo` en el navegador.
2. Hacer 3 consultas (usar los casos precargados es más rápido). El contador visible baja `3 → 2 → 1 → 0` y aparece el modal de fin de demo.
3. Abrir `/demo` en una **ventana incognito** (para partir de localStorage limpio).
4. Antes de escribir nada, abrir DevTools → Application → Local Storage → borrar la clave `mediq.demo.used` si existe. El contador del cliente vuelve a `3`.
5. Intentar hacer una 4ª consulta (recuerda: el servidor ya te ha visto 3 veces desde esta IP).
6. **La consulta debe fallar con "Has alcanzado el limite de la demo. Vuelve en X min o crea una cuenta gratuita para continuar."** — es la prueba de que el límite es del servidor, no del cliente.
7. Comprobar en Supabase → Table Editor → `demo_usage` que hay una fila con `count = 4` (o el número real de intentos) y `window_start` reciente.

Si los 7 pasos van bien, P2 está cerrado.

---

## 4. Simulación de caída de Supabase (opcional)

Para verificar el fail-closed:

1. Vercel → Environment Variables → renombrar `SUPABASE_SERVICE_ROLE_KEY` a algo inválido (ej. `SUPABASE_SERVICE_ROLE_KEY_OFF`).
2. Redeploy.
3. Ir a `/demo` e intentar una consulta.
4. Debe responder **503** con `"Servicio temporalmente no disponible. Reintenta en unos segundos."` — NO permite pasar sin control (fail-closed).
5. Renombrar de vuelta, redeploy, comprobar que funciona.

---

## Troubleshooting

**Sale 503 en cada consulta**
- Muy probable: la env var `SUPABASE_SERVICE_ROLE_KEY` no está bien puesta en Vercel, o el proyecto Supabase está pausado. Vercel → Function Logs → buscar `[/api/demo-chat] Supabase RPC error`.
- Si el log dice `function public.check_demo_usage does not exist`: no has ejecutado la SQL. Vuelve al paso 1.

**Sale 429 sin haber tocado la demo**
- Estás detrás de un NAT corporativo con IP compartida (hospital, universidad). Otro usuario en la misma red ya ha usado sus 8 consultas.
- Solución temporal: `delete from public.demo_usage where ip_hash = '<hash>';` — pero necesitas conocer el hash. Alternativa: bajar la ventana a 5 min si el tráfico compartido es habitual.

**Cómo resetear el conteo de una IP concreta en desarrollo**

Si estás debugando y quieres empezar de cero con tu IP:

```sql
truncate public.demo_usage;
```

Esto vacía la tabla entera. Solo usar en dev.

**Cómo ver todas las IPs cerca del límite**

```sql
select ip_hash, count, window_start,
       make_interval(mins => 30) - (now() - window_start) as tiempo_restante
from public.demo_usage
where count >= 6
order by count desc;
```

---

## Limpieza a futuro (no urgente)

La tabla acumula una fila por hash de IP. Con 10.000 visitantes únicos → 10.000 filas → aún sub-MB. Cuando pase los 100.000, añadir un job:

```sql
-- Con pg_cron (extensión de Supabase)
select cron.schedule(
  'purge-demo-usage',
  '0 3 * * *',           -- Cada día a las 3 AM UTC
  $$ delete from public.demo_usage where window_start < now() - interval '2 days'; $$
);
```
