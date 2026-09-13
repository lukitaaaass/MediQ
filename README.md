# MediQ

Asistente clínico con IA para médicos hispanohablantes. Resume historias, interpreta
analíticas, analiza informes médicos y sostiene un razonamiento diferencial — sin
sustituir el criterio del profesional.

**Demo en vivo:** https://medi-q-bice.vercel.app

> **Aviso.** MediQ es una herramienta de apoyo a la decisión clínica, no un producto
> sanitario certificado ni un sustituto del juicio médico. No emite diagnósticos ni
> debe usarse como única base para una decisión asistencial.

## A quién está dirigido

Médicos en ejercicio de cualquier especialidad, residentes (MIR) y estudiantes de
medicina, en español. El contexto de uso manda sobre todo lo demás: se consulta entre
paciente y paciente, durante la guardia, antes de firmar una receta. De ahí que el
producto esté construido alrededor de dos exigencias que no se negocian —
**velocidad** y **evidencia a la vista**.

## Qué hace

| Sección | Qué resuelve |
|---------|--------------|
| **Chat clínico** | Razonamiento diferencial en conversación, con las fuentes enlazadas |
| **Intérprete de analíticas** | Traduce una analítica de sangre a hallazgos ordenados por relevancia |
| **Analizador de informes** | Extrae lo accionable de un informe de alta o una prueba diagnóstica |
| **Tríadas clínicas** | Consulta de tríadas y patrones de presentación |
| **Práctica clínica** | Entrenamiento sobre casos para residentes y estudiantes |
| **MIR** | Acceso gratuito durante la formación, con lista de espera |
| **Demo pública** | Prueba sin registro, con límite de uso por IP |

Incluye además un blog con contenido clínico (diagnóstico diferencial de disnea,
interacciones farmacológicas, cómo leer un informe de alta, cronograma MIR 2027).

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Astro 4 con MDX, desplegado en Vercel |
| Autenticación y datos | Supabase |
| Chat clínico | Google Gemini (`gemini-flash-latest`) |
| Analíticas, informes y demo | Groq — Llama 3.3 70B (`llama-3.3-70b-versatile`) |
| Pagos | Stripe (checkout, portal de facturación y webhooks) |
| Analítica de uso | Plausible (opcional) |
| Resaltado de código | Shiki |

Los endpoints viven en `api/` como funciones serverless. Ninguna clave de IA llega al
navegador: las llamadas a Groq y a Gemini salen siempre del servidor.

## Planes

| Plan | Precio |
|------|--------|
| Estudiante | 0 € |
| Práctica | 29 €/mes · 23 €/mes en pago anual |
| Institución | A medida |

## Puesta en marcha

```bash
npm install
cp .env.example .env    # rellena las credenciales
npm run dev
```

Necesitas cuenta en **Supabase** (autenticación y base de datos), **Groq** (tiene
nivel gratuito) y **Stripe** si quieres probar el cobro. Las variables están
documentadas en [`.env.example`](.env.example); las que empiezan por `PUBLIC_` son las
únicas que se exponen al cliente.

Guías de configuración por funcionalidad:

- [`STRIPE_SETUP.md`](STRIPE_SETUP.md) — productos, precios y webhooks
- [`SETUP_ANALITICAS.md`](SETUP_ANALITICAS.md) — intérprete de analíticas
- [`SETUP_ANALIZADOR_INFORMES.md`](SETUP_ANALIZADOR_INFORMES.md) — analizador de informes
- [`SETUP_MIR_WAITLIST.md`](SETUP_MIR_WAITLIST.md) — lista de espera MIR
- [`SETUP_DEMO_RATE_LIMIT.md`](SETUP_DEMO_RATE_LIMIT.md) — límite de uso de la demo

## Diseño

El criterio visual está documentado y es deliberado, no decorativo. Ver
[`PRODUCT.md`](PRODUCT.md) y [`DESIGN.md`](DESIGN.md); el sistema de diseño por páginas
está en [`design-system/`](design-system/).

La idea de fondo: un médico asocia el blanco hospitalario con el software de historia
clínica que detesta, y el degradado morado con herramientas de productividad que no
tienen nada que ver con su trabajo. MediQ evita las dos cosas. La interfaz habla a un
experto — sin explicar medicina básica, sin suavizantes y diciendo explícitamente
cuándo no está segura.

Accesibilidad: WCAG AA como mínimo, navegación completa por teclado, `prefers-reduced-motion`
respetado y contraste suficiente en tema claro y oscuro.
