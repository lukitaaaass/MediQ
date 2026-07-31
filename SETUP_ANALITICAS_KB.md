# Base de conocimiento de /analiticas

Guía para activar el retrieval estructurado que enriquece las respuestas del intérprete de analíticas.

**Qué hace:** antes de llamar al modelo, el endpoint busca en una tabla `analitica_kb` las entradas correspondientes a cada parámetro que menciona el usuario (via matching por nombre + aliases). Si hay match, esa información curada se inyecta en el prompt como "referencia autoritativa". Si no hay match, el modelo cae a su conocimiento general.

**Por qué esta arquitectura y no vector RAG:** los nombres de parámetros de laboratorio son estándar en España (Hemoglobina, Glucosa, HbA1c…). Un matching por alias es funcionalmente equivalente a búsqueda semántica en este dominio, sin necesidad de embeddings ni proveedores externos.

**Tiempo:** 5-10 min setup + revisión médica del contenido.

---

## 1. SQL en Supabase (5 min)

Supabase Dashboard → SQL Editor → New query, pegar y ejecutar:

```sql
-- Tabla de conocimiento estructurado sobre parametros de laboratorio.
-- Una fila por parametro canonico. Los aliases permiten matchear formas
-- alternativas que use el usuario o el laboratorio.
create table if not exists public.analitica_kb (
  id                uuid primary key default gen_random_uuid(),
  parameter_name    text not null unique,       -- nombre canonico (ej. "Hemoglobina")
  aliases           text[] not null default '{}', -- ej. ["Hb", "HGB", "hemoglobinaHb"]
  category          text,                        -- hematimetria, bioquimica, lipidos, hepatico, renal, hormonal, coagulacion
  what_it_measures  text not null,               -- 2-4 lineas: que es y para que sirve
  reference_ranges  jsonb,                       -- {"adult_m": "13.5-17.5 g/dL", "adult_f": "12-16 g/dL", "elderly": "..."} etc.
  causes_high       text,                        -- causas frecuentes de valor alto (paciente-facing)
  causes_low        text,                        -- causas frecuentes de valor bajo
  when_to_worry     text,                        -- cuando la alteracion suele ser clinicamente relevante
  source            text,                        -- referencia bibliografica (SEQC 2023, NICE, etc.)
  reviewed_by       text,                        -- nombre + especialidad del revisor medico. NULL = borrador sin revisar
  reviewed_at       timestamptz,
  updated_at        timestamptz not null default now()
);

alter table public.analitica_kb enable row level security;

-- Los usuarios normales no leen esta tabla directamente. Solo el service_role del backend.
-- Si en el futuro quieres exponer un buscador publico, anades un policy for select con auth.uid().

-- Indice para matching por alias (importante para el lookup)
create index if not exists analitica_kb_aliases_gin
  on public.analitica_kb using gin (aliases);

create index if not exists analitica_kb_parameter_name_idx
  on public.analitica_kb (lower(parameter_name));

-- Actualizar updated_at automaticamente en cambios
create or replace function public.touch_analitica_kb() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists analitica_kb_touch on public.analitica_kb;
create trigger analitica_kb_touch
before update on public.analitica_kb
for each row execute function public.touch_analitica_kb();
```

Verificación:

```sql
select 'tabla creada' as objeto, count(*) as ok
from information_schema.tables
where table_schema='public' and table_name='analitica_kb';
```

---

## 2. Seed inicial (5 min)

Pegar en el SQL Editor. Son 10 parámetros de laboratorio de los más frecuentes en analíticas rutinarias en España. Contenido redactado por MediQ basándose en referencias SEQC, NICE y UpToDate patient info. **REQUIERE REVISIÓN MÉDICA ANTES DE CONSIDERARSE VALIDADO** — dejamos `reviewed_by` NULL para marcarlo como borrador.

```sql
insert into public.analitica_kb
(parameter_name, aliases, category, what_it_measures, reference_ranges, causes_high, causes_low, when_to_worry, source, reviewed_by)
values

-- ─── Hematimetría ───

('Hemoglobina',
 array['hb','hgb','hemoglobina total','hemog'],
 'hematimetria',
 'Proteína de los glóbulos rojos que transporta el oxígeno desde los pulmones al resto del cuerpo. Es el indicador principal para diagnosticar anemia.',
 '{"adult_m": "13.5-17.5 g/dL", "adult_f": "12.0-16.0 g/dL", "child": "11.5-15.5 g/dL", "elderly_note": "En mayores de 65 años pueden aceptarse valores ligeramente menores"}',
 'Deshidratación, tabaquismo, vivir en altitud, trastornos que aumentan la producción de glóbulos rojos (policitemia), algunos tumores renales.',
 'Anemia por déficit de hierro (la causa más frecuente), pérdidas de sangre (menstruaciones abundantes, sangrado digestivo), déficit de vitamina B12 o ácido fólico, enfermedad crónica, insuficiencia renal, algunos tumores.',
 'Valores por debajo de 10 g/dL suelen requerir estudio; por debajo de 8 g/dL pueden necesitar transfusión según síntomas. Valores muy altos también deben estudiarse.',
 'SEQC 2023',
 null),

('Leucocitos',
 array['leu','wbc','globulos blancos','globulos_blancos','glóbulos blancos','recuento leucocitario'],
 'hematimetria',
 'Células del sistema inmunitario, encargadas de defender al cuerpo frente a infecciones y otras agresiones. Un valor alterado suele indicar que el sistema inmune está respondiendo a algo.',
 '{"adult": "4.0-10.0 x10^3/uL", "child_1_5y": "5.0-15.5 x10^3/uL"}',
 'Infección bacteriana activa, inflamación, estrés físico intenso, algunos medicamentos (corticoides), leucemias.',
 'Infección viral, algunos medicamentos (quimioterapia, algunos antibióticos), enfermedades autoinmunes, déficits vitamínicos, fallo de la médula ósea.',
 'Valores por encima de 15-20 x10^3/uL con fiebre suelen indicar infección importante. Valores por debajo de 1.0 (neutropenia) aumentan mucho el riesgo de infección.',
 'SEQC 2023',
 null),

('Plaquetas',
 array['plq','plt','trombocitos','recuento plaquetario'],
 'hematimetria',
 'Fragmentos celulares que participan en la coagulación de la sangre. Son fundamentales para detener sangrados cuando hay una herida.',
 '{"adult": "150-400 x10^3/uL"}',
 'Inflamación crónica, déficit de hierro, extirpación del bazo, algunos síndromes mieloproliferativos, período de recuperación tras sangrado.',
 'Infecciones virales (dengue, VIH), enfermedades autoinmunes, hepatopatía, medicamentos (heparina, algunos antibióticos), quimioterapia.',
 'Valores por debajo de 50 x10^3/uL aumentan el riesgo de sangrado; por debajo de 20 el riesgo es alto y suele requerir tratamiento. Valores muy elevados (>1000) también requieren estudio.',
 'SEQC 2023',
 null),

-- ─── Bioquímica básica ───

('Glucosa',
 array['glc','glucemia','glucosa basal','azucar','azúcar','glucemia en ayunas'],
 'bioquimica',
 'Nivel de azúcar en sangre en un momento concreto. Refleja el equilibrio entre la ingesta, la producción hepática y el uso por los tejidos.',
 '{"adult_fasting": "70-100 mg/dL", "adult_postprandial_2h": "<140 mg/dL", "note": "Ideal en ayunas de 8-12 horas para basal"}',
 'Diabetes, prediabetes (100-125 mg/dL en ayunas), estrés agudo, algunos medicamentos (corticoides), infecciones, comer poco antes de la extracción.',
 'Ayuno prolongado, algunos medicamentos para la diabetes en dosis excesiva, insulinoma (raro), consumo de alcohol.',
 'En ayunas: 100-125 mg/dL indica glucemia basal alterada; ≥126 mg/dL en dos ocasiones diagnostica diabetes. Valores <54 mg/dL con síntomas requieren atención médica urgente.',
 'ADA 2024, redGDPS 2023',
 null),

('Hemoglobina glicosilada',
 array['hba1c','a1c','hemoglobina glicada','hemoglobina glucosilada','hgb a1c'],
 'bioquimica',
 'Refleja el promedio de glucosa en sangre de los últimos 2-3 meses. A diferencia de una glucemia puntual, no cambia con lo que hayas comido o si estás en ayunas.',
 '{"normal": "<5.7 %", "prediabetes": "5.7-6.4 %", "diabetes": ">=6.5 %", "target_diabetic": "generalmente <7 %, individualizado"}',
 'Diabetes mal controlada, prediabetes progresando, situaciones que alargan la vida de los glóbulos rojos (déficit de hierro grave).',
 'Anemia hemolítica, sangrados recientes, transfusión reciente, embarazo (por dilución).',
 'HbA1c ≥6.5% diagnostica diabetes; entre 5.7-6.4% indica prediabetes y suele requerir intervención sobre estilo de vida. En diabéticos, el objetivo se individualiza (habitualmente <7%).',
 'ADA 2024',
 null),

('Creatinina',
 array['cr','crea','creat','creatinina serica','creatinina sérica'],
 'bioquimica',
 'Producto de desecho del metabolismo muscular que los riñones filtran y eliminan por la orina. Es el marcador básico para valorar la función renal.',
 '{"adult_m": "0.7-1.2 mg/dL", "adult_f": "0.6-1.0 mg/dL", "note": "Aumenta con la masa muscular; puede ser normal-alta en personas muy musculadas"}',
 'Deshidratación, insuficiencia renal aguda o crónica, obstrucción de las vías urinarias, algunos medicamentos (nefrotóxicos), gran masa muscular (no patológico).',
 'Muy poca masa muscular (personas mayores, caquexia), embarazo (por dilución fisiológica), hepatopatía avanzada.',
 'Elevación brusca de creatinina (>1.5 mg/dL o duplicación del valor basal) sugiere fallo renal agudo y requiere valoración médica urgente. Elevación crónica leve suele indicar insuficiencia renal crónica en seguimiento.',
 'KDIGO 2024',
 null),

-- ─── Perfil lipídico ───

('Colesterol total',
 array['ct','colesterol','col total','colesterol serico','colesterol sérico'],
 'lipidos',
 'Suma del colesterol transportado por todas las lipoproteínas de la sangre (LDL, HDL, VLDL). Un valor alto se asocia con mayor riesgo cardiovascular a largo plazo.',
 '{"desirable": "<200 mg/dL", "borderline": "200-239 mg/dL", "high": ">=240 mg/dL"}',
 'Dieta rica en grasas saturadas y trans, sedentarismo, obesidad, hipotiroidismo, enfermedades hereditarias (hipercolesterolemia familiar), colestasis hepática.',
 'Malnutrición grave, hipertiroidismo, hepatopatía avanzada, algunos medicamentos.',
 'Un valor >240 mg/dL en presencia de otros factores de riesgo (hipertensión, tabaco, diabetes) suele requerir intervención dietética o farmacológica. Se valora siempre junto al LDL, HDL y triglicéridos, no aislado.',
 'ESC/EAS 2019',
 null),

('LDL',
 array['ldl-c','col ldl','colesterol ldl','ldl colesterol','c-ldl'],
 'lipidos',
 'Conocido como "colesterol malo". Transporta colesterol desde el hígado hacia los tejidos y, en exceso, se deposita en las paredes de las arterias formando placas.',
 '{"optimal": "<100 mg/dL", "borderline": "130-159 mg/dL", "high": "160-189 mg/dL", "very_high_risk_target": "<70 mg/dL en pacientes con enfermedad cardiovascular"}',
 'Dieta rica en grasas saturadas, obesidad, sedentarismo, hipotiroidismo, hipercolesterolemia familiar, diabetes mal controlada.',
 'Hipertiroidismo, malabsorción intestinal, hepatopatía avanzada, malnutrición.',
 'Los objetivos varían según el riesgo cardiovascular global. Un paciente sano puede estar bien con LDL <130 mg/dL; un diabético o cardiópata debería estar por debajo de 70 mg/dL.',
 'ESC/EAS 2019',
 null),

('HDL',
 array['hdl-c','col hdl','colesterol hdl','hdl colesterol','c-hdl'],
 'lipidos',
 'Conocido como "colesterol bueno". Retira colesterol de los tejidos y lo lleva de vuelta al hígado para eliminarlo. Valores altos se asocian con menor riesgo cardiovascular.',
 '{"low_m": "<40 mg/dL", "low_f": "<50 mg/dL", "protective": ">=60 mg/dL"}',
 'Ejercicio físico regular, consumo moderado de alcohol, algunos factores genéticos. No suele ser problemático.',
 'Sedentarismo, obesidad, tabaquismo, síndrome metabólico, diabetes tipo 2, algunos medicamentos.',
 'HDL bajo aumenta el riesgo cardiovascular incluso con LDL normal. En hombres <40 y en mujeres <50 mg/dL se considera factor de riesgo.',
 'ESC/EAS 2019',
 null),

('Triglicéridos',
 array['tg','trig','triglicéridos','trigliceridos','triglycerides'],
 'lipidos',
 'Tipo de grasa presente en la sangre. El cuerpo los usa como reserva de energía. Se elevan sobre todo con la ingesta de azúcares y alcohol.',
 '{"normal": "<150 mg/dL", "borderline": "150-199 mg/dL", "high": "200-499 mg/dL", "very_high": ">=500 mg/dL"}',
 'Dieta rica en azúcares y alcohol, obesidad, diabetes mal controlada, hipotiroidismo, algunos medicamentos (betabloqueantes, corticoides), enfermedades genéticas.',
 'Malnutrición, hipertiroidismo, malabsorción, dieta muy baja en grasas.',
 'Valores >500 mg/dL aumentan el riesgo de pancreatitis aguda y suelen requerir tratamiento médico. Se debe estar en ayunas de 12h para una medición fiable.',
 'ESC/EAS 2019',
 null);

-- Verificar que se insertaron
select count(*) as total, count(*) filter (where reviewed_by is null) as sin_revisar
from public.analitica_kb;
```

Al terminar deberías ver: `total=10, sin_revisar=10`.

---

## 3. Cómo marcar un parámetro como validado

Cuando un médico revise el contenido de un parámetro y lo dé por bueno:

```sql
update public.analitica_kb
set reviewed_by = 'Dra. XXX, Medicina Interna',
    reviewed_at = now()
where parameter_name = 'Hemoglobina';
```

El endpoint devuelve ambos casos (revisado y no revisado) por igual — el flag es solo interno para saber qué tenéis validado.

---

## 4. Cómo añadir un parámetro nuevo

Cualquiera puede añadir vía SQL. Ejemplo:

```sql
insert into public.analitica_kb
(parameter_name, aliases, category, what_it_measures, reference_ranges, causes_high, causes_low, when_to_worry, source, reviewed_by)
values (
  'TSH',
  array['tsh','tirotropina','hormona estimulante del tiroides'],
  'hormonal',
  'Hormona producida por la hipófisis que regula la función del tiroides. Es el mejor marcador para detectar problemas tiroideos.',
  '{"adult": "0.4-4.0 mUI/L", "pregnancy_1t": "0.1-2.5 mUI/L"}',
  'Hipotiroidismo (el tiroides funciona poco → la hipófisis intenta estimularlo más), tiroiditis en fase inicial.',
  'Hipertiroidismo, hipófisis dañada, algunos medicamentos.',
  'TSH >10 mUI/L o <0.1 mUI/L requieren consulta con endocrinología. Alteraciones leves pueden ser transitorias.',
  'ATA 2023',
  null
);
```

---

## 5. Cómo funciona el retrieval en el endpoint

Al recibir el texto de una analítica:

1. Extrae candidatos de parámetros del texto (regex simple: líneas con nombre + número + unidad)
2. Para cada candidato, hace lookup en `analitica_kb`:
   - Match exacto (case-insensitive) contra `parameter_name`
   - Match contra el array `aliases` (usa el índice GIN — instantáneo)
3. Los que matchean se inyectan en el prompt del LLM como bloque REFERENCIA AUTORITATIVA
4. El LLM combina la referencia + el valor específico del usuario para generar la respuesta

Ver [`api/analyze-analitica.js`](api/analyze-analitica.js) — funciones `extractCandidates()` y `fetchKbEntries()`.

---

## 6. Queries útiles

```sql
-- Parámetros sin revisar (para pasar al médico)
select parameter_name, updated_at
from public.analitica_kb
where reviewed_by is null
order by updated_at desc;

-- Cobertura de la KB (cuántos parámetros por categoría)
select category, count(*) as n
from public.analitica_kb
group by category
order by n desc;

-- Buscar por alias
select parameter_name, aliases
from public.analitica_kb
where 'hb' = any(aliases);
```
