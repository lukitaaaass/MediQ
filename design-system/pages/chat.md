# MediQ — Design Override: Chat
> Overrides sobre `design-system/MASTER.md`.

## Patrón de página
Interfaz conversacional de uso clínico. Prioridades: legibilidad, densidad de información, distinción clara médico/IA.

## Diferenciación de roles
| Rol | Color | Fuente |
|-----|-------|--------|
| Dr. (usuario) | `var(--ink)` | `var(--f-body)` |
| AI | `var(--ink-soft)` | `var(--f-body)` |
| AI label | `var(--accent)` | `var(--f-mono)` |
| Código / cálculo | `var(--ink-soft)` mono | `var(--f-mono)` |

## Componentes específicos
- Input de chat: border `var(--rule-2)`, focus `var(--ink-soft)`, border-radius `var(--radius)`
- Botón enviar: deshabilitar durante streaming, mostrar spinner
- Burbujas: sin border-radius exagerado — preferir 10px consistente con --radius
- Markdown render: usar `var(--f-body)` para párrafos, `var(--f-mono)` para code blocks

## Performance
- Virtualizar mensajes cuando > 50 en el hilo
- Skeleton loader mientras carga historial
- `will-change: transform` en el scroll container si hay muchos mensajes
