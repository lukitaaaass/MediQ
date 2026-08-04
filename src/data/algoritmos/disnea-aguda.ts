/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ALGORITMO DE DISNEA AGUDA — ESQUELETO PARA REVISIÓN CLÍNICA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️  ESTE FICHERO CONTIENE NODOS DE EJEMPLO ("A", "B", "C") CON TEXTO DE
 *     RELLENO. NO ES CONTENIDO CLÍNICO REAL. DEBE SUSTITUIRSE POR EL ÁRBOL
 *     REVISADO POR UN MÉDICO ANTES DE PUBLICAR.
 *
 * Todo texto marcado con [PENDIENTE REVISIÓN CLÍNICA] es un placeholder
 * literal para dejar claro al revisor qué falta rellenar.
 *
 *
 * ───────────────────────────────────────────────────────────────────────────
 * CÓMO AÑADIR UN NODO
 * ───────────────────────────────────────────────────────────────────────────
 *
 * 1) NODO DE PREGUNTA (bifurca en 2 o más opciones)
 *
 *    nodo_id: {
 *      pregunta: 'Enunciado de la pregunta',
 *      ayuda: 'Aclaración clínica opcional',   // opcional
 *      opciones: [
 *        { texto: 'Opción A', siguiente: 'otro_nodo' },
 *        { texto: 'Opción B', siguiente: 'otro_nodo_2' },
 *      ],
 *    }
 *
 * 2) NODO TERMINAL (final de una rama)
 *
 *    nodo_id: {
 *      terminal: true,
 *      conclusion: 'Conclusión clínica del nodo',
 *      siguientesPasos: [
 *        'Paso concreto 1',
 *        'Paso concreto 2',
 *      ],
 *      variante: 'ok' | 'warn' | 'danger',   // opcional
 *      redFlag: true,                         // opcional, atajo para danger
 *    }
 *
 *    Variantes visuales:
 *      'ok'     → verde. Actuación estándar.
 *      'warn'   → ámbar. Requiere atención prioritaria pero no urgente.
 *      'danger' → rojo. Actuación inmediata.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * REGLAS
 * ───────────────────────────────────────────────────────────────────────────
 * - Los `id` de nodo son kebab-case. El id del algoritmo también.
 * - `nodoInicial` debe existir en `nodos`.
 * - Toda opción `siguiente` debe apuntar a un nodo existente.
 * - Preferible que cada nodo terminal tenga `siguientesPasos` (2–5 items).
 * - Mantén las preguntas cortas (≤ 15 palabras). El detalle va en `ayuda`.
 * - Máximo 4 opciones por pregunta. Si son 5+, replantea el nodo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Algoritmo } from './tipos';

export const disneaAguda: Algoritmo = {
  id: 'disnea-aguda',
  titulo: 'Algoritmo de disnea aguda [PENDIENTE REVISIÓN CLÍNICA]',
  subtitulo: '[PENDIENTE REVISIÓN CLÍNICA — describir población y escenario, p. ej. "Adulto que consulta en Urgencias por disnea de menos de 24 h"]',
  nodoInicial: 'A',
  nodos: {
    // ─── NODOS DE EJEMPLO ───────────────────────────────────────────────
    // Sustituir todos por el árbol real. Se conservan tres niveles para
    // que el componente se pueda validar visualmente en dev.

    A: {
      pregunta: '[PENDIENTE REVISIÓN CLÍNICA — primera pregunta del algoritmo]',
      ayuda: '[PENDIENTE REVISIÓN CLÍNICA — aclaración clínica opcional]',
      opciones: [
        { texto: 'Opción A1 (placeholder)', siguiente: 'B' },
        { texto: 'Opción A2 (placeholder)', siguiente: 'C' },
      ],
    },

    B: {
      pregunta: '[PENDIENTE REVISIÓN CLÍNICA — segunda pregunta de la rama izquierda]',
      opciones: [
        { texto: 'Opción B1 (placeholder)', siguiente: 'D' },
        { texto: 'Opción B2 (placeholder)', siguiente: 'E' },
      ],
    },

    C: {
      pregunta: '[PENDIENTE REVISIÓN CLÍNICA — segunda pregunta de la rama derecha]',
      opciones: [
        { texto: 'Opción C1 (placeholder)', siguiente: 'F' },
        { texto: 'Opción C2 (placeholder)', siguiente: 'G' },
      ],
    },

    D: {
      terminal: true,
      conclusion: '[PENDIENTE REVISIÓN CLÍNICA — conclusión del nodo D]',
      siguientesPasos: [
        '[PENDIENTE REVISIÓN CLÍNICA — paso 1]',
        '[PENDIENTE REVISIÓN CLÍNICA — paso 2]',
      ],
      variante: 'ok',
    },

    E: {
      terminal: true,
      conclusion: '[PENDIENTE REVISIÓN CLÍNICA — conclusión del nodo E]',
      siguientesPasos: [
        '[PENDIENTE REVISIÓN CLÍNICA — paso 1]',
        '[PENDIENTE REVISIÓN CLÍNICA — paso 2]',
      ],
      variante: 'warn',
    },

    F: {
      terminal: true,
      conclusion: '[PENDIENTE REVISIÓN CLÍNICA — conclusión del nodo F]',
      siguientesPasos: [
        '[PENDIENTE REVISIÓN CLÍNICA — paso 1]',
      ],
      redFlag: true,
    },

    G: {
      terminal: true,
      conclusion: '[PENDIENTE REVISIÓN CLÍNICA — conclusión del nodo G]',
      siguientesPasos: [
        '[PENDIENTE REVISIÓN CLÍNICA — paso 1]',
        '[PENDIENTE REVISIÓN CLÍNICA — paso 2]',
        '[PENDIENTE REVISIÓN CLÍNICA — paso 3]',
      ],
      variante: 'ok',
    },
  },
};
