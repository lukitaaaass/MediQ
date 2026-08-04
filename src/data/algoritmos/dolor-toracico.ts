import type { Algoritmo } from './tipos';

export const dolorToracico: Algoritmo = {
  id: 'dolor-toracico',
  titulo: 'Dolor torácico agudo en Urgencias',
  subtitulo: 'Aproximación diagnóstica inicial en el adulto con sospecha de síndrome coronario agudo (SCA), basada en el marco A.C.S. de la ESC 2023.',
  fuente: {
    sociedad: 'ESC',
    guia: '2023 ESC Guidelines for the management of acute coronary syndromes',
    version: '2023',
    urls: [
      'https://academic.oup.com/eurheartj/article/44/38/3720/7243210',
      'https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/acute-coronary-syndromes/',
      'https://academic.oup.com/eurheartj/article/45/14/1193/7516285',
      'https://www.acc.org/latest-in-cardiology/ten-points-to-remember/2023/08/29/14/01/2023-esc-guidelines-acs-esc-2023',
    ],
    fechaRevision: '2026-08-04',
    revisadoPor: 'Pendiente',
  },
  nodoInicial: 'inicio',
  nodos: {
    inicio: {
      pregunta: 'Marco A.C.S. inicial: ¿ECG realizado en <10 minutos desde el primer contacto médico?',
      ayuda: 'La ESC 2023 exige ECG de 12 derivaciones dentro de los primeros 10 minutos. Si no se ha hecho, es el paso prioritario antes de continuar.',
      opciones: [
        { texto: 'Sí, ECG hecho', siguiente: 'ecg-elevacion-st' },
        { texto: 'No, hacer ECG ahora', siguiente: 'accion-hacer-ecg' },
      ],
    },

    'accion-hacer-ecg': {
      terminal: true,
      conclusion: 'Realizar ECG de 12 derivaciones de inmediato',
      siguientesPasos: [
        'ECG de 12 derivaciones en <10 min desde el primer contacto médico',
        'Monitorización continua y acceso venoso',
        'Volver al algoritmo con el ECG interpretado',
      ],
      variante: 'warn',
    },

    'ecg-elevacion-st': {
      pregunta: '¿ECG con elevación persistente del segmento ST (o equivalente STEMI)?',
      ayuda: 'Equivalentes STEMI incluyen bloqueo de rama izquierda de novo, patrón de De Winter, elevación en aVR con descensos difusos. Si hay dudas, consultar con cardiología antes de descartar la vía STEMI.',
      opciones: [
        { texto: 'Sí — elevación ST o equivalente', siguiente: 'via-stemi' },
        { texto: 'No — sin elevación ST', siguiente: 'nste-muy-alto-riesgo' },
      ],
    },

    'via-stemi': {
      terminal: true,
      conclusion: 'Activar código infarto — ICP primaria inmediata',
      siguientesPasos: [
        'Activar código infarto según protocolo local',
        'ICP primaria como estrategia de reperfusión preferente',
        'Tratamiento antitrombótico inicial: antiagregación + anticoagulación parenteral [PENDIENTE REVISIÓN CLÍNICA — combinación y dosis según protocolo local y ESC 2023]',
        'Objetivo de tiempos según protocolo local [PENDIENTE REVISIÓN CLÍNICA — ventanas de puerta-balón / puerta-fibrinolisis según ESC 2023]',
      ],
      redFlag: true,
    },

    'nste-muy-alto-riesgo': {
      pregunta: '¿Presenta algún criterio de muy alto riesgo?',
      ayuda: 'Criterios de muy alto riesgo ESC 2023: inestabilidad hemodinámica o shock cardiogénico, dolor torácico refractario a tratamiento, insuficiencia cardíaca aguda atribuible a isquemia, arritmias amenazantes para la vida, complicaciones mecánicas del infarto o cambios ECG dinámicos y recurrentes.',
      opciones: [
        { texto: 'Sí — al menos un criterio de muy alto riesgo', siguiente: 'ica-inmediata' },
        { texto: 'No — estable, sin criterios de muy alto riesgo', siguiente: 'troponina-algoritmo' },
      ],
    },

    'ica-inmediata': {
      terminal: true,
      conclusion: 'ICA inmediata (<2 h)',
      siguientesPasos: [
        'Coronariografía inmediata y revascularización si procede',
        'Estabilización simultánea: soporte hemodinámico, control de arritmias, tratamiento antiisquémico',
        'Antitrombóticos según protocolo local [PENDIENTE REVISIÓN CLÍNICA — pauta ESC 2023 §aplicable]',
      ],
      redFlag: true,
    },

    'troponina-algoritmo': {
      pregunta: '¿Aplicar algoritmo 0/1 h o 0/2 h de troponina de alta sensibilidad (hs-cTn)?',
      ayuda: 'La ESC 2023 recomienda algoritmos 0/1 h o 0/2 h de hs-cTn para rule-in / rule-out rápido de NSTEMI. Los umbrales son ESPECÍFICOS DE CADA ASSAY (hs-cTnT vs hs-cTnI, distintos fabricantes) — consultar los cutoffs de tu laboratorio.',
      opciones: [
        { texto: 'Sí — resultado disponible', siguiente: 'resultado-troponina' },
        { texto: 'No hay hs-cTn — usar troponina convencional (0/3 h)', siguiente: 'troponina-convencional' },
      ],
    },

    'troponina-convencional': {
      terminal: true,
      conclusion: 'Repetir troponina a las 3 h y reevaluar',
      siguientesPasos: [
        'Segunda determinación a las 3 h del primer valor',
        'Estratificar riesgo con GRACE score en paralelo',
        'Reingresar al algoritmo tras el resultado',
        'Considerar traslado a centro con hs-cTn si es viable',
      ],
      variante: 'warn',
    },

    'resultado-troponina': {
      pregunta: '¿Cuál es la clasificación del algoritmo hs-cTn?',
      ayuda: 'Umbrales absolutos y de delta [PENDIENTE REVISIÓN CLÍNICA — usar cutoffs del assay concreto del laboratorio, publicados en la Tabla del algoritmo 0/1 h de la ESC 2023].',
      opciones: [
        { texto: 'Rule-out (bajo probabilidad NSTEMI)', siguiente: 'rule-out-riesgo' },
        { texto: 'Rule-in (alto probabilidad NSTEMI)', siguiente: 'rule-in' },
        { texto: 'Zona indeterminada (observe)', siguiente: 'observe' },
      ],
    },

    'observe': {
      terminal: true,
      conclusion: 'Observación y nueva determinación',
      siguientesPasos: [
        'Repetir hs-cTn a las 3 h (o según protocolo de tu assay)',
        'Considerar imagen no invasiva o angio-TC coronario según probabilidad pre-test',
        'Estratificar con GRACE si aún no se ha hecho',
        'Reingresar al algoritmo con el nuevo valor',
      ],
      variante: 'warn',
    },

    'rule-in': {
      pregunta: 'NSTEMI confirmado — ¿estratificación de riesgo GRACE u otros criterios de alto riesgo?',
      ayuda: 'Criterios de alto riesgo ESC 2023: diagnóstico establecido de NSTEMI, cambios ST-T dinámicos o recurrentes, resucitación tras parada cardíaca sin elevación ST persistente ni shock, GRACE >140.',
      opciones: [
        { texto: 'Alto riesgo (GRACE >140 o criterios equivalentes)', siguiente: 'ica-24h' },
        { texto: 'Riesgo intermedio/bajo', siguiente: 'estrategia-selectiva' },
      ],
    },

    'ica-24h': {
      terminal: true,
      conclusion: 'ICA precoz (<24 h)',
      siguientesPasos: [
        'Coronariografía dentro de las primeras 24 h del ingreso',
        'Antiagregación doble + anticoagulación parenteral [PENDIENTE REVISIÓN CLÍNICA — pauta ESC 2023]',
        'Ingreso en unidad de cuidados cardíacos',
      ],
      variante: 'danger',
    },

    'estrategia-selectiva': {
      terminal: true,
      conclusion: 'Estrategia selectiva / no invasiva inicial',
      siguientesPasos: [
        'Pruebas de detección de isquemia (imagen de estrés, angio-TC coronario) según disponibilidad',
        'ICA guiada por resultado de las pruebas',
        'Tratamiento médico óptimo mientras se decide',
        'Reevaluar clínica y biomarcadores en 24-48 h',
      ],
      variante: 'ok',
    },

    'rule-out-riesgo': {
      pregunta: 'Rule-out NSTEMI — ¿hay factores que justifiquen mantener observación o completar estudio?',
      ayuda: 'El rule-out por hs-cTn no descarta angina inestable ni causas no coronarias graves de dolor torácico (TEP, disección aórtica, pericarditis, síndrome de Boerhaave). Reevaluar contexto clínico antes de dar de alta.',
      opciones: [
        { texto: 'Alta probabilidad pre-test o sospecha persistente de SCA', siguiente: 'observe' },
        { texto: 'Sospecha de causa no coronaria grave', siguiente: 'buscar-alternativas' },
        { texto: 'Bajo riesgo clínico y sin sospecha alternativa', siguiente: 'alta-orientada' },
      ],
    },

    'buscar-alternativas': {
      terminal: true,
      conclusion: 'Descartar causas no coronarias graves',
      siguientesPasos: [
        'Considerar angio-TC de tórax (TEP, disección aórtica)',
        'Ecocardiografía urgente si sospecha de pericarditis o taponamiento',
        'Amilasa/lipasa y valoración de causas gastroesofágicas',
        'Reevaluar dolor torácico como signo aislado de otra patología',
      ],
      variante: 'warn',
    },

    'alta-orientada': {
      terminal: true,
      conclusion: 'Alta con plan de seguimiento',
      siguientesPasos: [
        'Confirmar rule-out con criterios completos (clínica, ECG, hs-cTn seriada, ausencia de red flags)',
        'Seguimiento ambulatorio precoz por cardiología o atención primaria',
        'Instrucciones de reconsulta ante recurrencia del dolor',
        'Educación sobre síntomas de alarma',
      ],
      variante: 'ok',
    },
  },
};
