# Hygia — Design System MASTER
> Source of truth. Page-specific overrides live in `design-system/pages/`.

---

## 1. Identity

| Attribute | Value |
|-----------|-------|
| Product | Clinical AI SaaS — soporte médico con IA |
| Audience | Médicos, residentes, estudiantes hispanohablantes |
| Tone | Confiable · Preciso · Humano. Nunca frío ni robótico |
| Style | **Editorial clínico** — serif editorial + mono técnico. Print-inspired. |
| Market position | Premium de nicho: rigor académico + accesibilidad cotidiana |

---

## 2. Color System

### Tokens CSS (producción actual)

```css
:root {
  /* ─── Fondos ─── */
  --bg:      #f6f5f1;   /* Lino clínico — fondo principal */
  --bg-2:    #efede6;   /* Lino oscuro — hover, chips, inputs */
  --surface: #ffffff;   /* Cards, modales, popovers */

  /* ─── Texto ─── */
  --ink:      #161a1d;  /* Titulares y texto principal */
  --ink-soft: #3c4246;  /* Cuerpo secundario */
  --ink-mute: #7a7f82;  /* Labels, metadata, placeholders */

  /* ─── Bordes ─── */
  --rule:   #1e23270d;  /* Divisor sutil (5% opacidad) */
  --rule-2: #1e232714;  /* Divisor medio (8% opacidad) */

  /* ─── Acento ─── */
  --accent:     oklch(54% 0.09 195);  /* Teal clínico */
  --accent-ink: #ffffff;              /* Texto sobre acento */

  /* ─── Semántico ─── */
  --warn: oklch(62% 0.14 40);  /* Advertencias, estados críticos */
}
```

### Temas

| Tema | Descripción | Uso recomendado |
|------|-------------|-----------------|
| `clinical` (default) | Lino cálido + teal | Landing, marketing |
| `paper` | Beige pergamino + naranja suave | Modo lectura, recursos |
| `ink` | Dark total + verde menta | Turno de noche, modo oscuro |

```css
[data-theme="paper"] {
  --bg: #f3ecdf; --bg-2: #e8dfcd; --ink: #211a13;
  --accent: oklch(52% 0.13 45); --surface: #fbf6ec;
}
[data-theme="ink"] {
  color-scheme: dark;
  --bg: #0e1113; --bg-2: #14181b; --ink: #f2f0ea;
  --accent: oklch(78% 0.13 155); --accent-ink: #0e1113;
}
```

### Paleta semántica recomendada (expandir)

| Rol | Token | Hex aprox. |
|-----|-------|-----------|
| Success / Resultado seguro | `--success` | `oklch(62% 0.15 145)` verde |
| Danger / Alerta crítica | `--danger` | `oklch(55% 0.19 25)` rojo |
| Info / Nota clínica | `--info` | `oklch(60% 0.12 240)` azul |
| Warning (ya existe) | `--warn` | `oklch(62% 0.14 40)` ámbar |

---

## 3. Tipografía

### Stack actual

```css
--f-display: "Fraunces", "Newsreader", Georgia, serif;
--f-body:    "Inter", system-ui, -apple-system, sans-serif;
--f-mono:    "IBM Plex Mono", ui-monospace, monospace;
```

| Fuente | Rol | Uso |
|--------|-----|-----|
| **Fraunces** | Display / serif expresivo | H1, H2 cursivas, logo |
| **Instrument Serif** | Display alternativo | Modo `serif-soft` |
| **Inter** | Body / sans | Párrafos, UI general |
| **IBM Plex Mono** | Mono técnico | Labels, números, código, eyebrows |

### Escala tipográfica

```css
h1   { font-size: clamp(48px, 7.2vw, 112px); line-height: 0.98; }
h2   { font-size: clamp(36px, 5vw, 68px);    line-height: 1.02; }
h3   { font-size: clamp(22px, 2.2vw, 28px);  line-height: 1.15; }
.lede { font-size: clamp(17px, 1.3vw, 20px); line-height: 1.5;  }
body  { font-size: 16px; line-height: 1.6; }  /* mínimo obligatorio */
```

### Reglas tipográficas

- Máximo **72 caracteres** por línea en cuerpo
- Line-height **1.5–1.7** en párrafos
- Mono para: números de versión, scores, IDs, labels técnicos (e.g. "IAM cara inferior")
- Serif + italic en acento = firma visual de Hygia (`<em>`)
- **Nunca** usar font-weight < 300 en mobile

---

## 4. Espaciado y Layout

```css
--container: 1240px;
--pad:       clamp(20px, 4vw, 56px);   /* padding lateral responsive */
--radius:    10px;                      /* cards estándar */
--radius-sm: 6px;                       /* chips, badges, inputs */
```

### Grid system

| Breakpoint | Columnas | Uso |
|-----------|----------|-----|
| < 480px | 1 col | Mobile stack |
| 480–720px | 1–2 col | Tablet small |
| 720–1040px | 2 col | Tablet/desktop |
| > 1040px | 3 col (features), 4 col (footer) | Desktop full |

### Z-index scale

| Nivel | Valor | Uso |
|-------|-------|-----|
| Contenido | 0–9 | Normal flow |
| Sticky elements | 10 | Navbar |
| Dropdowns | 20 | Menús, tooltips |
| Overlays | 30 | Drawers, sidebars |
| Modales | 50 | Diálogos, alerts |
| Tweaks panel | 100 | Panel de edición (dev only) |

---

## 5. Componentes Base

### Botones

```css
/* Primario — CTA principal */
.btn-primary {
  background: var(--ink); color: var(--bg);
  padding: 12px 22px; border-radius: var(--radius-sm);
  font-weight: 500; transition: opacity 150ms ease;
}
.btn-primary:hover { opacity: 0.85; }

/* Ghost — acción secundaria */
.btn-ghost {
  border: 1px solid var(--rule-2); color: var(--ink-soft);
  padding: 12px 22px; border-radius: var(--radius-sm);
  transition: border-color 150ms, color 150ms;
}
.btn-ghost:hover { border-color: var(--ink-soft); color: var(--ink); }
```

**Reglas:**
- Mínimo `44×44px` de touch target en mobile
- Añadir `cursor-pointer` explícitamente
- Deshabilitar durante operaciones async (`disabled`, `aria-busy`)
- Usar `opacity` para hover, no `transform scale` (evita layout shift)

### Cards

```css
.card {
  background: var(--surface);
  border: 1px solid var(--rule-2);
  border-radius: var(--radius);
  box-shadow: 0 1px 0 var(--rule), 0 20px 60px -40px #0000001a;
  transition: transform 0.3s ease, border-color 0.3s ease;
}
.card:hover { transform: translateY(-3px); border-color: var(--ink-soft); }
```

### Badges / Pills

```css
.pill {
  background: var(--bg-2); color: var(--ink-soft);
  padding: 4px 10px; border-radius: 999px;
  font-family: var(--f-mono); font-size: 11px; letter-spacing: 0.04em;
}
```

### Eyebrow / Labels

```css
.eyebrow {
  font-family: var(--f-mono); font-size: 11px;
  color: var(--ink-mute); letter-spacing: 0.12em;
  text-transform: uppercase;
}
```

---

## 6. Iconografía

- **Set principal:** SVG inline — Heroicons o Lucide (24×24 viewBox)
- **Tamaño estándar:** `w-4 h-4` (16px) UI, `w-5 h-5` (20px) features
- **Glifos editoriales** (Σ, Δ, ℞, π, ∮): tipografía display, solo en features/hero
- **Prohibido:** emojis como íconos UI (los modales usan emojis solo en contexto legal/decorativo — revisar y migrar a SVG)
- Color: `currentColor` para heredar del contexto

---

## 7. Animaciones

```css
/* Micro-interacciones */
transition: 150ms–300ms ease;

/* Reveal de scroll */
.reveal {
  transform: translateY(18px);
  transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
}
.reveal.in { transform: none; }

/* Word reveal — heading animado */
.word-reveal .w {
  transform: translateY(0.4em);
  transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
}

/* Pulse — indicador AI activo */
@keyframes pulse { /* expandir sombra → fade */ }

/* Blink — typing indicator */
@keyframes blink { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }
```

**Reglas:**
- Respeta siempre `prefers-reduced-motion` (eliminar animaciones de posición)
- Usa `transform` y `opacity`, nunca `width/height` para animaciones
- Delays de stagger: máximo 300–400ms total para una serie de elementos

---

## 8. Accesibilidad (WCAG AA mínimo, AAA donde sea posible)

| Regla | Implementación |
|-------|----------------|
| Contraste texto normal | ≥ 4.5:1 — verificado con `--ink` sobre `--bg` |
| Contraste texto grande | ≥ 3:1 |
| Focus rings | Visible en todos los interactivos (no se elimina con `outline: none` sin alternativa) |
| Navegación por teclado | Tab order = orden visual |
| Alt text | Todas las imágenes con significado |
| ARIA | `aria-label` en botones solo-icono, `role="dialog"` en modales |
| Touch targets | Mínimo 44×44px |
| Skip links | Añadir `<a href="#main">Ir al contenido</a>` (pendiente) |

---

## 9. Patrones de Contenido Médico

| Patrón | Tratamiento visual |
|--------|-------------------|
| Score/cálculo clínico | `font-family: var(--f-mono)`, badge de color |
| Diagnóstico diferencial | Lista numerada con nivel de certeza |
| Alerta crítica | Borde izquierdo `--danger`, icono de alerta SVG |
| Fuente/evidencia | Texto mute + enlace con underline, `font-size: 13px` |
| Fórmulas/símbolos | Render con subscript/superscript HTML, mono font |
| Datos del paciente | Nunca mostrar en texto plano; placeholder anonimizado |

---

## 10. Anti-patrones (NO hacer en Hygia)

| Anti-patrón | Por qué |
|-------------|---------|
| Neon / gradientes AI cliché (purple-pink) | Rompe credibilidad clínica |
| Animaciones pesadas (3D, partículas) | Distracción en contexto de emergencia |
| Cards sin hover state | Parece no-interactivo |
| Texto en `--ink-mute` como body | Contraste insuficiente |
| Emojis como íconos UI | Inconsistencia multiplataforma |
| Bordes `border-white/10` en light mode | Invisibles |
| `outline: none` sin alternativa de focus | Accesibilidad rota |
| Fuentes < 16px en body mobile | Ilegible en guardia |

---

## 11. Checklist Pre-entrega

### Visual
- [ ] Sin emojis como íconos (solo SVG de Heroicons/Lucide)
- [ ] Hover states sin layout shift
- [ ] Contraste de texto ≥ 4.5:1 en light mode

### Interacción
- [ ] `cursor-pointer` en todos los elementos clicables
- [ ] Transiciones 150–300ms
- [ ] Focus ring visible

### Modo oscuro / claro
- [ ] Cards con opacidad de fondo visible en light mode
- [ ] Borders visibles en ambos modos

### Layout
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] Sin scroll horizontal en mobile
- [ ] Contenido no tapado por navbar fijo

### Accesibilidad
- [ ] Alt text en imágenes
- [ ] Labels en formularios
- [ ] `prefers-reduced-motion` respetado
- [ ] ARIA roles en modales

---

*Generado con UI/UX Pro Max — 2026-05-19*
