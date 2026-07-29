# Activar el Analizador de Informes Médicos

Guía para poner en producción la feature `/informes` (subir informe → análisis con IA).

**Tiempo:** 5 min (todo Supabase — no hay nuevas env vars).

**Por qué:** el endpoint [`api/analyze-report.js`](api/analyze-report.js) llama a una RPC `check_report_usage` en Supabase para el rate-limit persistente por IP. La página [`src/pages/informes.astro`](src/pages/informes.astro) extrae texto de PDF/DOCX en el navegador y solo manda el texto plano al servidor (RGPD: no se guarda nada del informe).

---

## 1. SQL en Supabase (3 min)

Supabase Dashboard → SQL Editor → New query, pegar y ejecutar:

```sql
-- Tabla igual a demo_usage pero para el analizador de informes.
create table if not exists public.report_usage (
  ip_hash text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.report_usage enable row level security;
-- Sin policy: solo service_role puede tocarla (bypassa RLS).

create index if not exists report_usage_window_start_idx
  on public.report_usage(window_start);

-- Funcion atomica: check-and-increment. Idéntica a check_demo_usage pero contra
-- otra tabla, para no mezclar contadores de features distintas.
create or replace function public.check_report_usage(
  p_ip_hash text,
  p_limit int,
  p_window_minutes int
) returns table(allowed boolean, remaining int, reset_sec int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.report_usage%rowtype;
  v_window_expires_at timestamptz;
begin
  insert into public.report_usage (ip_hash, count, window_start)
  values (p_ip_hash, 0, now())
  on conflict (ip_hash) do nothing;

  select * into v_row
  from public.report_usage
  where ip_hash = p_ip_hash
  for update;

  v_window_expires_at := v_row.window_start + make_interval(mins => p_window_minutes);

  if now() >= v_window_expires_at then
    update public.report_usage
    set count = 1, window_start = now()
    where ip_hash = p_ip_hash;
    return query select true, p_limit - 1, 0;
    return;
  end if;

  if v_row.count < p_limit then
    update public.report_usage
    set count = count + 1
    where ip_hash = p_ip_hash;
    return query select true, p_limit - (v_row.count + 1), 0;
    return;
  end if;

  return query select false, 0, ceil(extract(epoch from (v_window_expires_at - now())))::int;
end;
$$;

revoke all on function public.check_report_usage(text, int, int) from public, anon, authenticated;
grant execute on function public.check_report_usage(text, int, int) to service_role;
```

Verificación (misma ventana SQL):

```sql
-- 6 llamadas simuladas con limite = 5 y ventana 24h. Las 5 primeras allowed=true, la 6a false.
with pruebas as (
  select 1 as n, (public.check_report_usage('test-report-hash', 5, 1440)).*
  union all select 2, (public.check_report_usage('test-report-hash', 5, 1440)).*
  union all select 3, (public.check_report_usage('test-report-hash', 5, 1440)).*
  union all select 4, (public.check_report_usage('test-report-hash', 5, 1440)).*
  union all select 5, (public.check_report_usage('test-report-hash', 5, 1440)).*
  union all select 6, (public.check_report_usage('test-report-hash', 5, 1440)).*
)
select * from pruebas order by n;
```

Limpiar despues:

```sql
delete from public.report_usage where ip_hash = 'test-report-hash';
```

---

## 2. Env vars en Vercel (0 min — ya están)

Reutiliza las mismas que el rate-limit de la demo:

- `PUBLIC_SUPABASE_URL` ✅ (ya la tienes de Supabase)
- `SUPABASE_SERVICE_ROLE_KEY` ✅ (ya la tienes)
- `GROQ_API_KEY` ✅ (ya la tienes)
- `DEMO_RATE_SALT` ✅ (ya la tienes; se reutiliza para hashear IPs en ambas features)

**No hay env vars nuevas.** Si alguna falta, verlas en `SETUP_DEMO_RATE_LIMIT.md`.

---

## 3. Redeploy en Vercel

Vercel → Deployments → tres puntos del último deploy → Redeploy. Espera al badge verde "Ready".

---

## 4. Test end-to-end en producción

Entra en `https://<tu-dominio>/informes` y verifica:

1. **PDF:** subir cualquier informe médico anonimizado (una analítica, un alta hospitalaria). Debe:
   - Ver progress bar mientras extrae texto
   - Detectar tipo (aparece un pill con "analítica de sangre", "alta hospitalaria", etc.)
   - Mostrar 6 tarjetas con contenido coherente
2. **DOCX:** subir un `.docx`. Debe cargar mammoth.js dinámicamente y funcionar igual.
3. **Texto pegado:** pegar un informe (≥ 200 chars). Debe analizar sin extracción previa.
4. **Rechazo de no-medical:** pegar la letra de una canción o un artículo de blog. Debe mostrar el mensaje "Esto no parece un informe médico".
5. **Rate-limit:** hacer 6 análisis consecutivos. El 6º debe responder 429 con "Has usado los 5 análisis diarios. Vuelve en X h."
6. **Móvil (375px):** una sola columna, botones ≥ 44px, sin scroll horizontal.

Si los 6 pasan, la feature está activa.

---

## Troubleshooting

**Sale 503 en cada análisis**
- `SUPABASE_SERVICE_ROLE_KEY` mal puesta en Vercel, o la RPC `check_report_usage` no existe (paso 1 no se ejecutó).
- Ver Vercel Function Logs → buscar `[/api/analyze-report] Supabase RPC error`.

**Sale "El servidor devolvió un formato inesperado"**
- Groq no está devolviendo JSON válido. Suele ser un fallo puntual del modelo — reintentar suele solucionarlo.
- Si es persistente, revisar logs para ver el `raw` del modelo.

**El PDF se sube pero dice "El texto es demasiado corto"**
- El PDF es una imagen escaneada sin OCR. `pdf.js` extrae solo texto, no reconoce imagenes.
- Alternativa: recomendar al usuario que copie y pegue el texto manualmente, o pruebe con un OCR previo.

**La página tarda demasiado en cargar mammoth.js**
- CDN de cdnjs puede fallar en algún país. Considerar auto-hostear `mammoth.browser.min.js` en `/public` si hay quejas.

**Cómo consultar cuántas veces se ha usado hoy (analytics)**

```sql
-- IPs unicas hoy
select count(distinct ip_hash) as ips_hoy
from public.report_usage
where window_start > now() - interval '24 hours';

-- Total de analisis en las ultimas 24h
select sum(count) as analisis_hoy
from public.report_usage
where window_start > now() - interval '24 hours';
```

También Plausible tiene los eventos `Report analyze start` / `Report analyze success` / `Report analyze error` — útiles para funnel de éxito.

---

## Limpieza opcional (más adelante)

La tabla `report_usage` acumula 1 fila por IP única. Cuando pase 10.000 registros, purga periódica con `pg_cron`:

```sql
select cron.schedule(
  'purge-report-usage',
  '0 4 * * *',
  $$ delete from public.report_usage where window_start < now() - interval '3 days'; $$
);
```
