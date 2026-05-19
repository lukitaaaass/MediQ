# MediQ — Design Override: Pricing
> Overrides sobre `design-system/MASTER.md`.

## Patrón de página
Trust & Authority + Pricing clarity. Plan recomendado destacado visualmente.

## Cards de plan
- Plan recomendado: border `var(--accent)`, badge "Más popular" en pill teal
- Otros planes: border `var(--rule-2)` estándar
- Precio: `var(--f-display)` serif italic para el número, mono para "/mes"
- Feature list: check SVG en `var(--accent)` para incluidas, dash en `var(--ink-mute)` para excluidas

## Trust signals en pricing
- Badges HIPAA / GDPR visibles cerca del CTA
- "Sin tarjeta de crédito" en `var(--f-mono)` mute bajo el botón
- Social proof (nº de médicos) si disponible

## Comparativa de planes
- Usar tabla o grid horizontal en desktop, stack vertical en mobile
- Toggle anual/mensual: segmented control (`.seg` existente)
