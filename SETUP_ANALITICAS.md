# Activar el Intérprete de Analíticas

Guía para poner en producción la feature `/analiticas` (interpretación avanzada de analíticas de sangre / orina, con semáforo por parámetro).

**Tiempo:** 3 min (todo Supabase — sin env vars nuevas).

**Cómo funciona:** [`src/pages/analiticas.astro`](src/pages/analiticas.astro) extrae texto del PDF con pdf.js en el navegador (o del textarea o del modo manual) y lo manda a [`api/analyze-analitica.js`](api/analyze-analitica.js). Este endpoint llama a Groq con un system prompt específico que devuelve JSON con cada parámetro (nombre, valor, unidad, rango, status en 🟢🟡🟠🔴, qué mide, por qué puede estar alterado, cuándo preocuparse) más un resumen global y recomendaciones. Rate-limit: 5 interpretaciones / 24h por IP (misma lógica que /informes, tabla separada para no mezclar contadores).

---

## 1. SQL en Supabase (3 min)

Supabase Dashboard → SQL Editor → New query, pegar y ejecutar:

```sql
-- Tabla dedicada para el rate-limit de /analiticas.
create table if not exists public.analitica_usage (
  ip_hash text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

alter table public.analitica_usage enable row level security;
-- Sin policy: solo service_role puede tocarla.

create index if not exists analitica_usage_window_start_idx
  on public.analitica_usage(window_start);

-- Función atómica, misma lógica que check_report_usage / check_demo_usage.
create or replace function public.check_analitica_usage(
  p_ip_hash text,
  p_limit int,
  p_window_minutes int
) returns table(allowed boolean, remaining int, reset_sec int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.analitica_usage%rowtype;
  v_window_expires_at timestamptz;
begin
  insert into public.analitica_usage (ip_hash, count, window_start)
  values (p_ip_hash, 0, now())
  on conflict (ip_hash) do nothing;

  select * into v_row
  from public.analitica_usage
  where ip_hash = p_ip_hash
  for update;

  v_window_expires_at := v_row.window_start + make_interval(mins => p_window_minutes);

  if now() >= v_window_expires_at then
    update public.analitica_usage
    set count = 1, window_start = now()
    where ip_hash = p_ip_hash;
    return query select true, p_limit - 1, 0;
    return;
  end if;

  if v_row.count < p_limit then
    update public.analitica_usage
    set count = count + 1
    where ip_hash = p_ip_hash;
    return query select true, p_limit - (v_row.count + 1), 0;
    return;
  end if;

  return query select false, 0, ceil(extract(epoch from (v_window_expires_at - now())))::int;
end;
$$;

revoke all on function public.check_analitica_usage(text, int, int) from public, anon, authenticated;
grant execute on function public.check_analitica_usage(text, int, int) to service_role;
```

Verificación (misma ventana SQL):

```sql
with pruebas as (
  select 1 as n, (public.check_analitica_usage('test-analitica', 5, 1440)).*
  union all select 2, (public.check_analitica_usage('test-analitica', 5, 1440)).*
  union all select 3, (public.check_analitica_usage('test-analitica', 5, 1440)).*
  union all select 4, (public.check_analitica_usage('test-analitica', 5, 1440)).*
  union all select 5, (public.check_analitica_usage('test-analitica', 5, 1440)).*
  union all select 6, (public.check_analitica_usage('test-analitica', 5, 1440)).*
)
select * from pruebas order by n;
-- 5 primeras allowed=true, la 6ª allowed=false.
```

Limpieza:

```sql
delete from public.analitica_usage where ip_hash = 'test-analitica';
```

---

## 2. Env vars en Vercel

**Ninguna nueva.** Reutiliza las 4 que ya tienes:
- `PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `DEMO_RATE_SALT`

---

## 3. Redeploy

Vercel → Deployments → tres puntos del último deploy → Redeploy.

---

## 4. Test end-to-end

Entra en `https://<tu-dominio>/analiticas` y prueba:

1. **Pegar analítica:** copia este texto en la tab "Pegar analítica":
   ```
   Hemoglobina 11.2 g/dL (12.0-16.0)
   Leucocitos 8.5 10^3/uL (4.0-10.0)
   Colesterol total 245 mg/dL (<200)
   Glucosa 108 mg/dL (70-100)
   Creatinina 0.9 mg/dL (0.6-1.2)
   ```
   Debe interpretar:
   - Overall status probablemente "attention" o "abnormal"
   - Hemoglobina: yellow o orange (11.2 está bajo)
   - Colesterol: orange (245 > 200)
   - Glucosa: yellow (108 apenas encima)
   - Leucocitos y creatinina: green
   - Los alterados aparecen **primero** y **abiertos** por defecto

2. **Manual:** ir a la tab "Introducir a mano", verificar que hay 3 filas prellenadas, rellenar con "Hemoglobina 10.5 g/dL", "Colesterol 300 mg/dL" y comprobar que el botón se habilita y funciona.

3. **PDF:** subir cualquier PDF de analítica de laboratorio. Verificar extracción → interpretación → semáforo correcto.

4. **Rate-limit:** hacer 6 interpretaciones seguidas. La 6ª debe fallar con 429 "Has usado las 5 interpretaciones diarias".

5. **No analítica:** pegar la letra de una canción. Debe mostrar la pantalla "Esto no parece una analítica".

6. **Móvil (375px):** una columna, filas del manual pasan a 2 columnas + botón borrar, cards del resultado ocupan ancho completo, rango se pinta a la derecha del valor.

---

## Troubleshooting

**Sale 503 en cada análisis** — `SUPABASE_SERVICE_ROLE_KEY` mal puesta o RPC no creada. Ver logs `[/api/analyze-analitica] Supabase RPC error`.

**"El modelo devolvió un formato inesperado"** — Groq no devolvió JSON válido. Suele solucionarse reintentando (temperatura 0.2 hace raro pero no imposible).

**El modelo devuelve pocos parámetros del PDF** — Puede ser que el PDF sea imagen escaneada (pdf.js no OCR). Sugerir al usuario que pruebe el modo "Pegar analítica" copiando los valores manualmente.

**Un parámetro sale con status equivocado** — El modelo puede fallar en interpretaciones concretas (edad-dependiente, embarazo, etc.). Reintentar suele bastar; si es persistente, mejor tirar por el modo manual con rango explícito para forzar contexto.

---

## Consultas útiles

```sql
-- IPs únicas hoy
select count(distinct ip_hash) as ips_hoy
from public.analitica_usage
where window_start > now() - interval '24 hours';

-- Total interpretaciones hoy
select sum(count) as interpretaciones_hoy
from public.analitica_usage
where window_start > now() - interval '24 hours';
```

Plausible eventos: `Analitica analyze start` / `Analitica analyze success` (con `overall` y número de `params`) / `Analitica analyze error`.
