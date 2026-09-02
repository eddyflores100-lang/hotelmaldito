export type Phase = {
  id: number;
  name: string;
  weeks: string;
  color: string;
  desc: string;
};

export const phases: Phase[] = [
  {
    id: 1,
    name: "Preproducción",
    weeks: "Semana 1",
    color: "#8fa4c2",
    desc: "Planos, repo y biblia visual. Nadie construye sin plano.",
  },
  {
    id: 2,
    name: "Prototipo vertical",
    weeks: "Semanas 2 – 3",
    color: "#a8e63c",
    desc: "Un piso y un loop. Si no es divertido en gris, no lo será en color.",
  },
  {
    id: 3,
    name: "Motor infinito",
    weeks: "Semanas 4 – 5",
    color: "#38e1d4",
    desc: "El generador que convierte el juego en contenido infinito.",
  },
  {
    id: 4,
    name: "Contenido y sistemas",
    weeks: "Semanas 6 – 10",
    color: "#ffa02f",
    desc: "Los 3 escenarios firma, co-op seguro y economía persistente.",
  },
  {
    id: 5,
    name: "Beta y lanzamiento",
    weeks: "Semanas 11 – 12",
    color: "#e9f1fc",
    desc: "Pulido, beta cerrada, clips y apertura de puertas.",
  },
];

export type Week = {
  week: number;
  phaseId: number;
  title: string;
  tasks: string[];
  deliverable: string;
  milestone?: string;
  gate?: string;
};

export const weeks: Week[] = [
  {
    week: 1,
    phaseId: 1,
    title: "Planos y cimientos",
    tasks: [
      "Montar el repo del proyecto (Rojo + GitHub para versionar el .rbxl)",
      "Crear el place en Roblox Studio: recepción base, spawn y lighting nocturno",
      "Definir la biblia visual: paleta, niebla, materiales y tipografía del hotel",
      "Repartir roles del equipo y fijar la entrega semanal de los viernes",
      "Abrir el Discord de desarrollo con canal de feedback y bugs",
    ],
    deliverable: "Repo + place base + biblia visual v1",
    milestone: "M1 · Cimientos listos",
    gate: "La biblia visual está aprobada y el repo sincroniza con Studio sin conflictos.",
  },
  {
    week: 2,
    phaseId: 2,
    title: "El ascensor y el primer piso",
    tasks: [
      "Construir la Recepción jugable: mostrador, tablero de tareas y ascensor",
      "Programar el ascensor: puertas, selección de piso y teletransporte",
      "Levantar P-13 «La Piscina Sin Fin» en bloques grises (greybox)",
      "Implementar 3 tareas básicas de limpieza con progreso y propina",
      "Primer pase de movimiento: correr, agacharse y linterna",
    ],
    deliverable: "Lobby + ascensor + P-13 greybox jugable",
  },
  {
    week: 3,
    phaseId: 2,
    title: "El loop de 90 segundos",
    tasks: [
      "Sistema de apagón: luces, sonido y aviso 5 segundos antes",
      "Primera entidad: «La Dama del Agua» con IA de persecución simple",
      "Mecánica de despido: captura → recepción, con penalización (sin muerte)",
      "Cerrar el loop: tareas → propinas → subida de piso → evento",
      "Test interno: 3 personas juegan sin explicaciones; medir dónde se atascan",
    ],
    deliverable: "Loop completo jugable de punta a punta",
    milestone: "M2 · Loop de 90 s validado",
    gate: "2 de cada 3 testers completan el loop sin ayuda y piden «otra ronda».",
  },
  {
    week: 4,
    phaseId: 3,
    title: "El generador de pisos",
    tasks: [
      "Crear plantillas modulares: pasillos, habitaciones y salas en ServerStorage",
      "Programar FloorGenerator con semilla aleatoria y pesos por tipo de sala",
      "Sistema de reglas por piso: oscuridad, agua, espejos, gravedad baja",
      "Conectar el ascensor con el generador: cada parada crea un piso nuevo",
      "Activar StreamingEnabled y chunking para cargar el piso sin lag",
    ],
    deliverable: "Pisos procedurales infinitos sin repetición visible",
  },
  {
    week: 5,
    phaseId: 3,
    title: "Tareas y reglas infinitas",
    tasks: [
      "TaskManager: pool de 20+ tareas asignadas por peso según el piso",
      "Reglas secretas: se anuncian en el ascensor y se validan en servidor",
      "Sistema de pistas: el recepcionista vende pistas a cambio de propinas",
      "Presupuesto de rendimiento: 60 fps en móvil para un piso estándar",
      "Test de variedad: 10 pisos seguidos sin que dos se sientan iguales",
    ],
    deliverable: "Motor de contenido validado",
    milestone: "M3 · 10 pisos únicos generados",
    gate: "El generador produce 10 pisos seguidos sin repetición ni crash.",
  },
  {
    week: 6,
    phaseId: 4,
    title: "P-13: La Piscina Sin Fin",
    tasks: [
      "Arte final del piso: azulejos, agua con reflejos, flotadores y vapor",
      "IA final de «La Dama del Agua»: patrones, telegrafía y captura cómica",
      "Eventos: oleadas, «no mires al fondo» y socorrista espectral",
      "Diseño de sonido submarino y sustos de goteo",
      "Botín del piso: propinas dobles y bañador dorado (cosmético)",
    ],
    deliverable: "Escenario firma nº 1 terminado",
  },
  {
    week: 7,
    phaseId: 4,
    title: "P-∞: El Piso Espejo",
    tasks: [
      "Sistema de inversión: controles y mapa espejados por jugador",
      "Entidad «Espejo Tú»: copia los movimientos con 3 s de retraso",
      "Salas trampa: pasillos que se cierran si corres",
      "Iluminación fría + niebla de espejos con partículas",
      "QA específico: que la inversión no rompa tareas ni accesibilidad",
    ],
    deliverable: "Escenario firma nº 2 terminado",
  },
  {
    week: 8,
    phaseId: 4,
    title: "P--1: La Caldera",
    tasks: [
      "Evento final cooperativo: mantener la caldera encendida 10 minutos",
      "Roles en el evento: cada puesto tiene una sub-misión simultánea",
      "«El hotel entero» como antagonista: apagones, puertas y voces",
      "Reaparición rápida tras despido para no frenar el clímax",
      "Recompensa: Contrato Permanente y título «Gerente ∞»",
    ],
    deliverable: "Escenario firma nº 3 + endgame",
  },
  {
    week: 9,
    phaseId: 4,
    title: "Cooperativo y seguridad",
    tasks: [
      "Los 4 roles con herramientas propias y progresión independiente",
      "RemoteEvents auditados: toda acción validada en servidor",
      "Matchmaking por edades: Turno de Día separado de Hora Extra",
      "Voz espacial de Roblox + pitidos contextuales en consola y móvil",
      "Prueba de estrés: servidor de 8 jugadores sin caídas de frame",
    ],
    deliverable: "Multijugador estable y seguro",
  },
  {
    week: 10,
    phaseId: 4,
    title: "Persistencia y tienda",
    tasks: [
      "DataStore con session lock: propinas, reputación, pisos y cosméticos",
      "BindToClose + autoguardado cada 60 s y al salir",
      "Tienda del lobby con MarketplaceService: 4 gamepasses + 2 dev products",
      "Probador de pases (test IDs) y verificación de recibos idempotente",
      "Revisión de economía: ningún pase puede romper el equilibrio",
    ],
    deliverable: "Economía persistente funcionando",
    milestone: "M4 · Sesión de 4 jugadores con datos guardados",
    gate: "Una sesión de 4 jugadores termina y los datos sobreviven al rejoin.",
  },
  {
    week: 11,
    phaseId: 5,
    title: "Beta cerrada y pulido",
    tasks: [
      "Beta cerrada: 30–50 jugadores de Discord con formulario de feedback",
      "Pulido de sustos: timing, sonido y cámara en los 3 escenarios",
      "Icono, miniatura y descripción de la página (test A/B en comunidad)",
      "Optimización final: carga < 20 s y 60 fps en móvil de gama media",
      "Corrección de los bugs críticos detectados en la beta",
    ],
    deliverable: "Build candidato a lanzamiento",
  },
  {
    week: 12,
    phaseId: 5,
    title: "Apertura de puertas",
    tasks: [
      "Checklist de publicación: privacidad, apto 12+, moderación activa",
      "Publicar v1.0 con 6 pisos: los 3 firma + 3 procedurales",
      "Campaña de clips: 10 vídeos de sustos en TikTok/Shorts la semana 1",
      "Evento de apertura: «doble propina» todo el fin de semana",
      "Monitorizar KPIs del día 1–7 y preparar el parche 1.0.1",
    ],
    deliverable: "HOTEL ∞ INFINITO en producción",
    milestone: "M5 · Lanzamiento v1.0",
    gate: "Carga < 20 s, 60 fps en móvil medio y cero bugs bloqueantes.",
  },
];

export type GanttSpan = { from: number; to: number; intensity: 1 | 2 | 3 };

export type GanttRow = { name: string; color: string; spans: GanttSpan[] };

export const ganttRows: GanttRow[] = [
  {
    name: "Diseño y guion",
    color: "#38e1d4",
    spans: [
      { from: 1, to: 2, intensity: 3 },
      { from: 3, to: 5, intensity: 1 },
      { from: 6, to: 8, intensity: 2 },
      { from: 11, to: 11, intensity: 1 },
    ],
  },
  {
    name: "Programación",
    color: "#a8e63c",
    spans: [
      { from: 1, to: 3, intensity: 2 },
      { from: 4, to: 5, intensity: 3 },
      { from: 6, to: 8, intensity: 2 },
      { from: 9, to: 10, intensity: 3 },
      { from: 11, to: 12, intensity: 2 },
    ],
  },
  {
    name: "Arte y 3D",
    color: "#ffa02f",
    spans: [
      { from: 2, to: 2, intensity: 1 },
      { from: 3, to: 5, intensity: 2 },
      { from: 6, to: 8, intensity: 3 },
      { from: 9, to: 10, intensity: 1 },
      { from: 11, to: 11, intensity: 2 },
    ],
  },
  {
    name: "Sonido y música",
    color: "#e9f1fc",
    spans: [
      { from: 6, to: 6, intensity: 1 },
      { from: 7, to: 8, intensity: 2 },
      { from: 9, to: 10, intensity: 1 },
      { from: 11, to: 11, intensity: 3 },
    ],
  },
  {
    name: "QA y beta",
    color: "#8fa4c2",
    spans: [
      { from: 3, to: 3, intensity: 1 },
      { from: 5, to: 5, intensity: 1 },
      { from: 8, to: 8, intensity: 1 },
      { from: 9, to: 10, intensity: 2 },
      { from: 11, to: 12, intensity: 3 },
    ],
  },
  {
    name: "Marketing y clips",
    color: "#ffa02f",
    spans: [
      { from: 10, to: 10, intensity: 1 },
      { from: 11, to: 11, intensity: 2 },
      { from: 12, to: 12, intensity: 3 },
    ],
  },
];

export type Milestone = { id: string; week: number; title: string; desc: string };

export const milestones: Milestone[] = [
  {
    id: "M1",
    week: 1,
    title: "Cimientos listos",
    desc: "Repo, place base y biblia visual aprobados por todo el equipo.",
  },
  {
    id: "M2",
    week: 3,
    title: "Loop de 90 s validado",
    desc: "Un jugador nuevo completa tareas → propina → evento sin ayuda.",
  },
  {
    id: "M3",
    week: 5,
    title: "10 pisos únicos",
    desc: "El generador encadena 10 pisos sin repetición ni crash.",
  },
  {
    id: "M4",
    week: 10,
    title: "Sesión completa de 4",
    desc: "Cuatro jugadores terminan un turno y sus datos sobreviven al rejoin.",
  },
  {
    id: "M5",
    week: 12,
    title: "Lanzamiento v1.0",
    desc: "El hotel abre sus puertas con 6 pisos y campaña de clips activa.",
  },
];

export const phaseGates = [
  {
    id: "PUERTA 1",
    after: "Semana 1",
    phaseId: 1,
    text: "La biblia visual está aprobada y el repo sincroniza con Studio sin conflictos.",
  },
  {
    id: "PUERTA 2",
    after: "Semana 3",
    phaseId: 2,
    text: "2 de cada 3 testers completan el loop sin ayuda y piden «otra ronda».",
  },
  {
    id: "PUERTA 3",
    after: "Semana 5",
    phaseId: 3,
    text: "El generador produce 10 pisos seguidos sin repetición ni crash.",
  },
  {
    id: "PUERTA 4",
    after: "Semana 10",
    phaseId: 4,
    text: "Una sesión de 4 jugadores termina y los datos sobreviven al rejoin.",
  },
  {
    id: "PUERTA 5",
    after: "Semana 12",
    phaseId: 5,
    text: "Carga < 20 s, 60 fps en móvil medio y cero bugs bloqueantes.",
  },
];

export const liveOpsUpdates = [
  {
    version: "v1.0.1",
    when: "Semana 14",
    title: "El Buffet",
    text: "Piso procedural nuevo + doble propina de fin de semana y correcciones de la beta.",
  },
  {
    version: "v1.1",
    when: "Semana 16",
    title: "Noche de Reyes",
    text: "Evento de temporada: el Rey se hospeda en Recepción y exige 13 almohadas exactas.",
  },
  {
    version: "v1.2",
    when: "Semana 18",
    title: "El Cine",
    text: "Piso firma nº 4 + Pase de Temporada de Lluvias con cosméticos exclusivos.",
  },
];

export const kpiTargets = [
  { k: "> 35 %", v: "retención día 1" },
  { k: "> 12 min", v: "sesión media" },
  { k: "> 12 %", v: "retención día 7" },
  { k: "> 85 %", v: "valoraciones positivas" },
  { k: "3 clips", v: "de +100 K vistas en el mes 1" },
];
