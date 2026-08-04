/**
 * Tipos de un algoritmo clínico interactivo.
 *
 * Un algoritmo es un grafo dirigido de nodos. Cada nodo es:
 *   - Una PREGUNTA con N opciones que llevan a otros nodos.
 *   - O un nodo TERMINAL con una conclusión y (opcionalmente) siguientes pasos.
 *
 * La `variante` de un nodo terminal define su color y semántica visual:
 *   - 'ok'      → verde. Actuación estándar, seguimiento normal.
 *   - 'warn'    → ámbar. Requiere atención prioritaria pero no urgente
 *                 (ej. consulta preferente 24–48h).
 *   - 'danger'  → rojo. Red flag. Requiere actuación inmediata.
 *
 * `redFlag: true` es un atajo semántico equivalente a `variante: 'danger'`.
 * Si defines los dos, `variante` gana.
 */

export interface NodoPregunta {
  /** No terminal — pregunta al lector con opciones */
  terminal?: false;
  /** Enunciado de la pregunta */
  pregunta: string;
  /** Aclaración clínica opcional que se muestra bajo la pregunta */
  ayuda?: string;
  /** Opciones que el lector puede elegir */
  opciones: OpcionRama[];
}

export interface NodoTerminal {
  /** Marca el nodo como terminal (final de una rama) */
  terminal: true;
  /** Conclusión del nodo, mostrada como titular */
  conclusion: string;
  /** Lista de pasos concretos o recomendaciones */
  siguientesPasos?: string[];
  /** Semántica visual del nodo. Ver arriba. */
  variante?: 'ok' | 'warn' | 'danger';
  /** Atajo para `variante: 'danger'`. Si defines ambos, `variante` gana. */
  redFlag?: boolean;
}

export type Nodo = NodoPregunta | NodoTerminal;

export interface OpcionRama {
  /** Texto de la opción tal como se muestra al lector */
  texto: string;
  /** ID del nodo al que se navega al pulsar esta opción */
  siguiente: string;
}

/**
 * Trazabilidad de la fuente clínica del algoritmo. Permite en el futuro
 * localizar qué algoritmos dependen de una guía concreta cuando salga
 * una revisión (p. ej. ESC 2027) y actualizarlos de forma dirigida.
 */
export interface Fuente {
  /** Sociedad emisora de la guía */
  sociedad:
    | 'ESC' | 'AHA' | 'ACC' | 'AHA/ACC' | 'NICE' | 'SEMES' | 'ERC'
    | 'GOLD' | 'GINA' | 'KDIGO' | 'IDSA' | 'CDC' | 'OMS'
    | 'Ministerio de Sanidad España' | 'otro';
  /** Título literal de la guía */
  guia: string;
  /** Versión o año de la guía */
  version: string;
  /** URLs oficiales consultadas para construir el algoritmo */
  urls: string[];
  /** Fecha en que este algoritmo fue verificado/actualizado por última vez (AAAA-MM-DD) */
  fechaRevision: string;
  /**
   * Firma del revisor médico. Formato: "Dr/a Nombre Apellidos (col. NNNNN)".
   * "Pendiente" hasta que un médico valide el contenido → no publicar hasta
   * que este campo tenga una firma real.
   */
  revisadoPor: string;
}

export interface Algoritmo {
  /** Identificador único, kebab-case. Se usa en eventos de analítica. */
  id: string;
  /** Titular visible del algoritmo */
  titulo: string;
  /** Subtítulo opcional que da contexto (población, escenario clínico) */
  subtitulo?: string;
  /** ID del nodo desde el que arranca el algoritmo */
  nodoInicial: string;
  /** Mapa de nodos por ID */
  nodos: Record<string, Nodo>;
  /** Trazabilidad clínica. Ver interface Fuente. */
  fuente: Fuente;
}

/**
 * Devuelve la variante efectiva de un nodo terminal, resolviendo el atajo
 * `redFlag: true` → `'danger'`. Si no está definido nada, devuelve 'ok'.
 */
export function varianteEfectiva(nodo: NodoTerminal): 'ok' | 'warn' | 'danger' {
  if (nodo.variante) return nodo.variante;
  if (nodo.redFlag) return 'danger';
  return 'ok';
}
