# Activar la waitlist de /mir

Guía para conectar el formulario de reserva de plaza de la landing MIR con Supabase.
El código ya está desplegado ([`src/pages/mir.astro`](src/pages/mir.astro) + [`api/mir-waitlist.js`](api/mir-waitlist.js)). Solo falta crear la tabla en Supabase.

**Tiempo:** 3 min.

**Por qué waitlist antes que feature completa:** validar demanda real antes de construir el mecanismo de verificación por dominio universitario + acceso ilimitado en el chat. Si en 2-3 semanas hay 30+ registros, activamos la Fase 2 (verificación real). Si no llega, el trabajo ahorrado.

---

## 1. SQL en Supabase (1 min)

Supabase Dashboard → SQL Editor → New query, pegar y ejecutar:

```sql
create table if not exists public.mir_waitlist (
  email         text primary key,
  university    text not null,
  level         text not null,
  email_domain  text,
  ip_last_seen  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.mir_waitlist enable row level security;
-- Sin policy: solo service_role puede leer/escribir. El endpoint usa la
-- SUPABASE_SERVICE_ROLE_KEY.

create index if not exists mir_waitlist_email_domain_idx
  on public.mir_waitlist(email_domain);

create index if not exists mir_waitlist_created_at_idx
  on public.mir_waitlist(created_at desc);

-- Constraint para validar niveles conocidos (defensa en profundidad;
-- el endpoint ya filtra, pero por si en el futuro alguien mete filas manualmente)
alter table public.mir_waitlist
  add constraint mir_waitlist_level_check
  check (level in ('estudiante','mir_r1','mir_r2','mir_r3','mir_r4','mir_r5','preparando_mir'));
```

Verificación:

```sql
select 'tabla mir_waitlist' as objeto, count(*) as ok
from information_schema.tables
where table_schema='public' and table_name='mir_waitlist';
-- Debe devolver ok = 1
```

---

## 2. Probar el formulario (1 min)

- Ir a `https://<tu-dominio>/mir`
- Bajar hasta la sección "Reservar plaza"
- Rellenar con:
  - Correo: `test@universidad.es`
  - Facultad: `Test`
  - Nivel: `Estudiante`
- Enviar
- Debe salir el mensaje verde "✓ Reservado. Te avisaremos por correo cuando abramos tu tanda."

En Supabase → Table Editor → `mir_waitlist` debería aparecer una fila con esos datos.

Después, borra la fila de test:

```sql
delete from public.mir_waitlist where email = 'test@universidad.es';
```

---

## 3. Consultas útiles para ver la waitlist

**Total de solicitudes:**
```sql
select count(*) from public.mir_waitlist;
```

**Por nivel:**
```sql
select level, count(*) as n
from public.mir_waitlist
group by level
order by n desc;
```

**Por dominio de universidad (top 20):**
```sql
select email_domain, count(*) as n
from public.mir_waitlist
group by email_domain
order by n desc
limit 20;
```

**Últimas 10 solicitudes:**
```sql
select email, university, level, created_at
from public.mir_waitlist
order by created_at desc
limit 10;
```

**Exportar todo a CSV** (desde Supabase Table Editor → botón de export). Útil para el día que decidamos activar el mecanismo real y mandarles el email de "ya podéis entrar".

---

## Criterio de decisión: cuándo activar la Fase 2

Fase 2 = verificación real por dominio + acceso ilimitado en el chat. Requiere ~4h de código.

**Regla:** cuando la waitlist tenga **≥ 30 solicitudes** en dominios `.es` de facultades de medicina reconocidas, se activa la Fase 2. Antes de eso, la waitlist es suficiente.

Sí, es un umbral arbitrario. Ajústalo según lo veas. La idea es no invertir tiempo en construir un embudo sofisticado si nadie va a pasar por él.

---

## Troubleshooting

**El formulario devuelve "No se pudo registrar"**
- Vercel Function Logs → buscar `[/api/mir-waitlist]` → ver el error real
- Muy probable: la tabla `mir_waitlist` no existe todavía en Supabase (paso 1 pendiente)
- O `SUPABASE_SERVICE_ROLE_KEY` no está bien puesta en Vercel (mismo problema que tuvimos con el rate-limit de la demo)

**El formulario dice "El servidor no está configurado"**
- Faltan env vars en Vercel: `PUBLIC_SUPABASE_URL` o `SUPABASE_SERVICE_ROLE_KEY`
- Solución idéntica al `SETUP_DEMO_RATE_LIMIT.md`

**Alguien mete `x@x.x` como email y pasa**
- La validación es regex básica; deja pasar `x@x.x`. No es un problema real (esos emails no reciben nada útil), pero si te molesta podemos endurecer con [zod](https://zod.dev) más adelante.
