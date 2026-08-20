# Hygia — Design Override: Landing (index)
> Overrides sobre `design-system/MASTER.md`. Solo aplica aquí lo que difiere.

## Patrón de página
**Editorial clínico con hero de conversación.** Estructura:
1. Hero (2 columnas: copy + demo card)
2. Cómo funciona (steps lineares)
3. Features (grid 3 cols)
4. FAQ (accordion)
5. Recursos (cards editoriales)
6. CTA strip centrado
7. Footer 4 columnas

## Tipografía específica
- H1: `clamp(48px, 7.2vw, 112px)` — impacto de revista médica
- H1 `em`: Fraunces italic + `var(--accent)` — firma visual
- Eyebrows: IBM Plex Mono, 11px, uppercase, letter-spacing 0.12em

## Hero card (demo de IA)
- Fondo: `var(--surface)` con shadow `0 20px 60px -40px #0000001a`
- Rol AI: `color: var(--accent)` — diferenciado del médico
- Typing indicator: 3 dots blink a 1.2s, offset 0.2s entre cada uno
- Pulse AI activo: animación `0 0 0 10px transparent` en 2s loop

## Animaciones de entrada
- Primera visita: `.reveal` slide desde `translateY(18px)` + word-reveal en H1
- Visitas SPA / back navigation: mostrar inmediato (sin animación)
- Threshold IntersectionObserver: `0.14`, rootMargin `-40px`

## Tweaks panel (dev/design mode)
- Solo visible cuando `panel.classList.add('open')` via postMessage
- No debe aparecer en producción para usuarios reales
- Persiste en `localStorage['mediq:tweaks']`

## Pendiente / mejoras
- [ ] Reemplazar emojis 🩺 del footer con SVG de stethoscope (Lucide)
- [ ] Reemplazar emoji 🔒 y ⚠️ en modales legales con SVG
- [ ] Añadir `<a href="#main" class="skip-link">Ir al contenido</a>` antes del nav
- [ ] Verificar contraste de `--ink-mute` (#7a7f82) sobre `--bg` (#f6f5f1) — actualmente ~3.8:1, bajo para texto informativo
