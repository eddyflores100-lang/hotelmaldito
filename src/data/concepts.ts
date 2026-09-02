export type Scenario = {
  code: string;
  name: string;
  desc: string;
  risk: "Bajo" | "Medio" | "Alto";
  reward: string;
};

export type GameConcept = {
  id: string;
  num: string;
  title: string;
  titleAccent: string;
  genres: string[];
  tagline: string;
  color: string;
  colorSoft: string;
  age: string;
  devDiff: 1 | 2 | 3;
  devLabel: string;
  viral: number;
  session: string;
  unique: string[];
  loop: { step: string; desc: string }[];
  scenarios: Scenario[];
  monetization: { item: string; price: string }[];
  refs: string[];
  icon: "magnet" | "keycard" | "ant";
};

export const marketStats = [
  {
    value: 144.5,
    decimals: 1,
    suffix: " M",
    label: "jugadores diarios (DAU)",
    note: "Q4 2025 · +69% interanual",
    color: "var(--color-cyan)",
  },
  {
    value: 2.8,
    decimals: 1,
    suffix: " h",
    label: "de juego por usuario al día",
    note: "promedio Q3 2025",
    color: "var(--color-amber)",
  },
  {
    value: 21.6,
    decimals: 1,
    suffix: " M",
    label: "jugadores simultáneos de Grow a Garden",
    note: "récord histórico del videojuego · 2025",
    color: "var(--color-lime)",
  },
  {
    value: 39.6,
    decimals: 1,
    suffix: " B",
    label: "horas jugadas en un trimestre",
    note: "Q3 2025 · +91% interanual",
    color: "var(--color-cyan)",
  },
];

export const insights = [
  {
    icon: "signal" as const,
    title: "Loops de 90 segundos",
    text: "Los juegos que dominan completan un ciclo de recompensa en menos de dos minutos. Cada ciclo debe generar un momento digno de clip.",
    color: "var(--color-cyan)",
  },
  {
    icon: "swap" as const,
    title: "Coleccionar + intercambiar",
    text: "Semillas, mascotas, «brainrots»: la economía de intercambio entre jugadores es el motor de retención nº1 demostrado en 2025.",
    color: "var(--color-lime)",
  },
  {
    icon: "users" as const,
    title: "Cooperativo con roles",
    text: "Jugar con amigos retiene más que cualquier mecánica solitaria. Asignar trabajos distintos crea dependencia divertida del equipo.",
    color: "var(--color-amber)",
  },
  {
    icon: "ghost" as const,
    title: "Terror que da risa",
    text: "El horror ligero con sustos cómicos (estilo Doors) es el género con más crecimiento en clips de TikTok y YouTube Shorts.",
    color: "var(--color-cyan)",
  },
  {
    icon: "sprout" as const,
    title: "Progreso visible al minuto uno",
    text: "Desde la primera sesión el jugador necesita ver algo crecer: una base, un jardín, una reputación. El estilo tycoon/idle sigue imbatible.",
    color: "var(--color-lime)",
  },
];

export const tickerItems = [
  "144,5 M de jugadores diarios",
  "2,8 h/día por usuario",
  "21,6 M simultáneos · récord Grow a Garden",
  "39.600 M de horas en Q3 2025",
  "géneros calientes: terror co-op · tycoon · sims de colección",
  "audiencia 13+ en máximos históricos",
  "los clips de TikTok deciden el top 10",
];

export const games: GameConcept[] = [
  {
    id: "chatarra",
    num: "01",
    title: "CHATARRA",
    titleAccent: "CÓSMICA",
    genres: ["Tycoon físico", "Gravedad cero", "Co-op 4 jug."],
    tagline:
      "Vuela en gravedad cero con un gancho magnético, arrastra basura espacial y convierte chatarra en la estación orbital más brutal del servidor.",
    color: "var(--color-cyan)",
    colorSoft: "rgba(56,225,212,0.12)",
    age: "10 – 16",
    devDiff: 2,
    devLabel: "Media",
    viral: 72,
    session: "20 – 30 min",
    unique: [
      "No existe un tycoon de físicas en gravedad cero con tracción en Roblox: el nicho está vacío.",
      "La chatarra que recoges ES tu material de construcción: recolección y progresión son la misma mecánica.",
      "Tormentas solares cada 20 minutos obligan a defender y reconfigurar la estación en equipo.",
    ],
    loop: [
      { step: "Lánzate", desc: "Sales al vacío con propulsor y gancho magnético." },
      { step: "Arrastra", desc: "Capturas escombros con físicas reales de inercia." },
      { step: "Fundir", desc: "Conviertes chatarra en módulos: oxígeno, energía, talleres." },
      { step: "Expande", desc: "Amplía la estación y sobrevive a la tormenta solar." },
    ],
    scenarios: [
      {
        code: "Z-1",
        name: "Cinturón de Chatarra",
        desc: "Órbita tutorial llena de escombros comunes. Gravedad asistida, sin tormentas. Aquí se aprende a volar y a soldar.",
        risk: "Bajo",
        reward: "Chatarra común y planos básicos",
      },
      {
        code: "Z-2",
        name: "Nebulosa Ámbar",
        desc: "Zona tóxica con oxígeno limitado y corrientes que empujan. Escondidos entre el gas flotan cargueros abandonados.",
        risk: "Medio",
        reward: "Aleaciones raras y motores iónicos",
      },
      {
        code: "Z-3",
        name: "Cementerio de Satélites",
        desc: "Endgame: piezas legendarias de estaciones caídas, tormentas dobles y fauna mecánica hostil que caza chatarra… y jugadores.",
        risk: "Alto",
        reward: "Núcleo de reactor y cosméticos legendarios",
      },
    ],
    monetization: [
      { item: "Gancho magnético doble", price: "249 R$" },
      { item: "Turbo de oxígeno", price: "149 R$" },
      { item: "Hangar VIP dorado", price: "399 R$" },
      { item: "Dron gemelo recolector", price: "299 R$" },
    ],
    refs: ["Tycoons clásicos", "Hardspace: Shipbreaker (lite)", "Físicas de sandbox espacial"],
    icon: "magnet",
  },
  {
    id: "hotel",
    num: "02",
    title: "HOTEL",
    titleAccent: "∞ INFINITO",
    genres: ["Terror cómico", "Co-op con roles", "Procedural"],
    tagline:
      "Turno de noche en un hotel con pisos infinitos. Cada piso se genera solo, tiene sus propias reglas… y huéspedes que no deberían existir.",
    color: "var(--color-amber)",
    colorSoft: "rgba(255,160,47,0.12)",
    age: "12 – 18",
    devDiff: 2,
    devLabel: "Media",
    viral: 95,
    session: "15 – 40 min",
    unique: [
      "Pisos procedurales: ninguna partida se repite. Contenido infinito sin construir mapas a mano.",
      "Nadie muere: si fallas, te «despiden» y reapareces en recepción con una penalización cómica. Apto 12+ sin censura.",
      "Roles de trabajo (limpieza, mantenimiento, recepción) + sustos coreografiados = clips de TikTok garantizados.",
    ],
    loop: [
      { step: "Ascensor", desc: "El ascensor asigna piso, regla secreta y tu puesto." },
      { step: "Trabaja", desc: "Completa tareas del hotel cumpliendo la regla del piso." },
      { step: "Sobrevive", desc: "Apagones, huéspedes espejo, la piscina que no acaba…" },
      { step: "Propinas", desc: "Cobra, sube reputación y desbloquea el piso siguiente." },
    ],
    scenarios: [
      {
        code: "P-13",
        name: "La Piscina Sin Fin",
        desc: "Un piso entero inundado: pasillos submarinos, flotadores a la deriva y algo que nada en círculos. Regla: no salpiques, no corras, no respires fuerte.",
        risk: "Medio",
        reward: "Propinas dobles y el bañador dorado",
      },
      {
        code: "P-∞",
        name: "El Piso Espejo",
        desc: "Todo está invertido: controles, mapas y los huéspedes, que te imitan con tres segundos de retraso. Si te alcanzan, ocupan tu turno.",
        risk: "Alto",
        reward: "Llave maestra espejada",
      },
      {
        code: "P--1",
        name: "La Caldera",
        desc: "El corazón del hotel, bajo el sótano. Evento final cooperativo: mantener la caldera encendida mientras el hotel entero intenta apagarte.",
        risk: "Alto",
        reward: "Contrato permanente y título «Gerente»",
      },
    ],
    monetization: [
      { item: "Uniformes de recepción", price: "199 R$" },
      { item: "Emote «susto épico»", price: "99 R$" },
      { item: "Llave de habitación dorada", price: "349 R$" },
      { item: "Contrato extra (revivir)", price: "129 R$" },
    ],
    refs: ["Doors", "Lethal Company (lite)", "Work at a Pizza Place"],
    icon: "keycard",
  },
  {
    id: "hormiguero",
    num: "03",
    title: "HORMIGUERO:",
    titleAccent: "GUERRA DEL JARDÍN",
    genres: ["Estrategia de colonias", "Mundo macro", "PvP ligero"],
    tagline:
      "Dirige una colonia de hormigas en un jardín a escala épica: excava túneles, cultiva hongos y asalta hormigueros rivales antes de que llegue la lluvia.",
    color: "var(--color-lime)",
    colorSoft: "rgba(168,230,60,0.12)",
    age: "10 – 15",
    devDiff: 3,
    devLabel: "Alta",
    viral: 68,
    session: "25 – 45 min",
    unique: [
      "Escala micro casi sin explotar en Roblox: una gota de lluvia es un bombardeo y la cortadora de césped, un jefe de raid.",
      "Castas asimétricas jugables: reina, obrera, soldado y jardinera de hongos, cada una con árbol de habilidades propio.",
      "Guerras de territorio persistentes entre servidores: el mapa del jardín recuerda quién manda en cada parterre.",
    ],
    loop: [
      { step: "Excava", desc: "Amplía túneles y cámaras: criadero, granero, sala real." },
      { step: "Recolecta", desc: "Expediciones al jardín: migas, áfidos, gotas de rocío." },
      { step: "Cultiva", desc: "Haz crecer el hongo que alimenta y evoluciona castas." },
      { step: "Asalta", desc: "Defiende tu colonia o invade túneles de otros equipos." },
    ],
    scenarios: [
      {
        code: "J-1",
        name: "El Jardín Salvaje",
        desc: "Mapa inicial: hierba alta como selva, pulgones que ordeñar y mariquitas aliadas. La lluvia suave marca el ritmo de las expediciones.",
        risk: "Bajo",
        reward: "Recursos base y primeras castas",
      },
      {
        code: "J-2",
        name: "El Invernadero",
        desc: "Zona media: plantas exóticas con néctar raro, calor que agota y arañas tejedoras que cobran peaje por cada túnel.",
        risk: "Medio",
        reward: "Néctar raro y mutaciones de hormiga",
      },
      {
        code: "J-3",
        name: "La Compostera",
        desc: "Endgame PvP: el territorio más rico del jardín, en disputa permanente. Nutrientes legendarios, avispas y guerras de colonias a gran escala.",
        risk: "Alto",
        reward: "Territorio permanente y corona de la reina",
      },
    ],
    monetization: [
      { item: "Skins de hormiga (cromadas)", price: "249 R$" },
      { item: "Temas de túnel neón", price: "179 R$" },
      { item: "Pase «Temporada de Lluvias»", price: "499 R$" },
      { item: "Mascota áfido brillante", price: "149 R$" },
    ],
    refs: ["Grounded (lite)", "Empires de Roblox", "Empire of the Ants"],
    icon: "ant",
  },
];

export const comparisonRows = [
  {
    label: "Género central",
    values: ["Tycoon físico espacial", "Terror cómico procedural", "Estrategia de colonias"],
  },
  {
    label: "Edad ideal",
    values: ["10 – 16", "12 – 18", "10 – 15"],
  },
  {
    label: "Dificultad de desarrollo",
    values: ["Media", "Media", "Alta"],
  },
  {
    label: "Tiempo a prototipo",
    values: ["4 – 5 semanas", "3 semanas", "6 – 7 semanas"],
  },
  {
    label: "Potencial viral (TikTok)",
    values: ["● ● ○", "● ● ●", "● ● ○"],
  },
  {
    label: "Techo de monetización",
    values: ["Alto", "Muy alto", "Medio-alto"],
  },
];

export const verdict = {
  pick: "HOTEL ∞ INFINITO",
  reasons: [
    {
      title: "Riesgo bajo, techo altísimo",
      text: "Desarrollo medio (sin físicas complejas ni multitudes) pero con el mayor potencial de clip del portfolio: el terror cómico es el género que más crece en vídeo corto.",
    },
    {
      title: "Contenido infinito por diseño",
      text: "El generador procedural de pisos permite publicar un piso nuevo cada 2 semanas sin construir mapas a mano. Live-ops barato para siempre.",
    },
    {
      title: "Encaja con la audiencia que crece",
      text: "Roblox empuja su demográfica 13+ y 17–24. Un juego «de noche con amigos» apunta justo ahí, con dificultad escalable para los de 12.",
    },
  ],
  alt:
    "¿Tu equipo ama los sistemas y las físicas? Empieza por CHATARRA CÓSMICA (nicho vacío, progreso tipo tycoon adictivo). HORMIGUERO es la apuesta grande: déjalo para cuando el estudio tenga músculo.",
};

export const roadmap = [
  {
    phase: "Fase 1",
    weeks: "Semanas 1 – 3",
    title: "Prototipo vertical",
    text: "Un solo piso (La Piscina Sin Fin), un rol y un evento de apagón. El loop de 90 segundos tiene que ser divertido sin arte final.",
  },
  {
    phase: "Fase 2",
    weeks: "Semanas 4 – 8",
    title: "Generador + 3 escenarios",
    text: "Construir el generador procedural de pisos y los tres escenarios firma: Piscina, Piso Espejo y La Caldera.",
  },
  {
    phase: "Fase 3",
    weeks: "Semanas 9 – 10",
    title: "Beta cerrada + teasers",
    text: "Beta con 30–50 jugadores reclutados en Discord. Grabar los mejores sustos y publicar 10 clips antes del lanzamiento.",
  },
  {
    phase: "Fase 4",
    weeks: "Semana 12 +",
    title: "Lanzamiento y live-ops",
    text: "Salida con 6 pisos. Desde ahí, un piso nuevo cada 2 semanas, eventos de «Noche de Reyes» y cosméticos de temporada.",
  },
];
