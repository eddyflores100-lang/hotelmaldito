/* ============================================================
   HOTEL ∞ INFINITO — Game Design Document v1.0
   Contenido completo del dossier interactivo
   ============================================================ */

export const gddMeta = [
  { k: "Género", v: "Terror cómico co-op" },
  { k: "Jugadores", v: "1–4 por equipo · 12/servidor" },
  { k: "Edad objetivo", v: "12 – 18 años" },
  { k: "Motor", v: "Roblox Studio · Luau" },
  { k: "Plataformas", v: "PC · Móvil · Consola" },
  { k: "Sesión media", v: "15 – 40 min" },
];

export const pitch = {
  lead: "Es tu primera noche en el Hotel Infinito: un rascacielos con más pisos de los que caben en el ascensor. Cada planta se genera sola, cada planta tiene una regla, y los huéspedes… bueno, algunos huéspedes no existen.",
  body: "No es un juego de huir: es un juego de trabajar. El equipo firma un turno, el ascensor reparte puestos (recepción, limpieza, mantenimiento, botones) y cada tarea completada paga propinas. Romper la regla del piso no mata a nadie: te «despiden», y reapareces en el lobby con un cono de cartón en la cabeza. El terror viene de la anticipación y de la risa nerviosa, no de la sangre — por eso encaja con la franja 12+ que Roblox está empujando y con el formato clip de 15 segundos.",
};

export const pillars = [
  {
    num: "01",
    title: "Terror que da risa",
    text: "Sustos coreografiados con remate cómico. Cero gore, cero muerte: el castigo es el ridículo. El miedo se comparte, el clip se viraliza.",
    color: "var(--color-amber)",
  },
  {
    num: "02",
    title: "Trabajar juntos o flotar solos",
    text: "Roles con herramientas distintas obligan a comunicarse. Una tarea de dos personas vale el triple: el equipo es la mecánica.",
    color: "var(--color-cyan)",
  },
  {
    num: "03",
    title: "Infinito por diseño",
    text: "Generador procedural de pisos + banco de reglas: contenido nuevo cada actualización sin construir mapas a mano. Live-ops barato para siempre.",
    color: "var(--color-lime)",
  },
];

export const coreLoop = [
  {
    time: "0:10",
    step: "El ascensor decide",
    desc: "Sorteo de piso, regla secreta y puesto de trabajo. La cabina sube y las luces parpadean: empieza el turno.",
  },
  {
    time: "1:30",
    step: "Trabaja el piso",
    desc: "Cada rol completa sus tareas: hacer camas, cambiar fusibles, escoltar maletas. Cada tarea pagada es un punto de checkpoint.",
  },
  {
    time: "0:40",
    step: "La regla se tuerce",
    desc: "Evento de escalada: apagón, huésped imposible, pasillo que respira. Cumplir la regla del piso es la única defensa.",
  },
  {
    time: "0:20",
    step: "Checkout",
    desc: "Vuelta al ascensor, reparto de propinas, risa floja en el lobby y botón del siguiente piso. 90 segundos por ciclo, siempre.",
  },
];

export const sessionActs = [
  {
    act: "Acto I",
    name: "El Lobby",
    mins: "2 – 5 min",
    desc: "Hub social: taquillas, cosméticos, pizarra de récords del servidor y la máquina de café que a veces habla. Aquí se forma el equipo y se firma el turno.",
  },
  {
    act: "Acto II",
    name: "El Turno",
    mins: "12 – 30 min",
    desc: "De 3 a 6 pisos encadenados. Cada piso sube la dificultad una marcha y presenta una regla nueva. Si el equipo cae, «cierre de turno»: resumen cómico de los despidos.",
  },
  {
    act: "Acto III",
    name: "El Informe",
    mins: "1 – 2 min",
    desc: "Pantalla de resumen: propinas, tareas, reglas rotas y el rating del hotel (★). Las estrellas desbloquean la siguiente zona de pisos.",
  },
];

export const difficultyTiers = [
  {
    ages: "12 – 13",
    name: "Turno de día",
    desc: "Reglas avisadas con antelación, entidades lentas y visibles, sustos con aviso sonoro de 2 s. El hotel «es amable».",
  },
  {
    ages: "14 – 16",
    name: "Turno de noche",
    desc: "Reglas descubiertas en marcha, eventos encadenados y el Auditor patrullando si se rompen 3 reglas.",
  },
  {
    ages: "17 – 18",
    name: "Hora extra",
    desc: "Modo para valientes: sin avisos, pisos espejo más frecuentes, propinas ×3 y leaderboard global de turnos perfectos.",
  },
];

export const roles = [
  {
    id: "recepcion",
    name: "Recepción",
    icon: "bell" as const,
    color: "var(--color-amber)",
    desc: "El cerebro del turno. Ve el nombre de los huéspedes antes de que lleguen y sabe qué habitación piden… si pregunta a tiempo.",
    tool: "Libro de reservas",
    perk: "Anticipa 5 s la llegada de cada huésped y su «rareza».",
    tasks: [
      "Registrar huéspedes antes de que lleguen al mostrador",
      "Asignar la habitación correcta (cuidado con la 1313)",
      "Responder el teléfono: si suena 3 veces, no cuelgues tú",
      "Avisar al equipo cuando un huésped es «de los otros»",
    ],
    stats: { Comunicación: 95, Acción: 25, Riesgo: 20 },
  },
  {
    id: "limpieza",
    name: "Limpieza",
    icon: "broom" as const,
    color: "var(--color-cyan)",
    desc: "Nadie conoce el hotel como quien lo friega. La suciedad anómala es su radar: donde hay moho que brilla, hay algo cerca.",
    tool: "Carrito multiusos",
    perk: "Detecta rastros de entidades 3 s antes de que aparezcan.",
    tasks: [
      "Hacer camas sin mirar debajo (a menos que el juego diga lo contrario)",
      "Fregar las baldosas señaladas por la regla del piso",
      "Vaciar papeleras: algunas muerden",
      "Dejar el carrito impecable antes del evento o La Gobernanta aparece",
    ],
    stats: { Comunicación: 60, Acción: 55, Riesgo: 45 },
  },
  {
    id: "mantenimiento",
    name: "Mantenimiento",
    icon: "wrench" as const,
    color: "var(--color-lime)",
    desc: "Si hay un fusible, es suyo. Los apagones son su hora de gloria: 2 segundos de ventaja para reiniciar la caja antes que nadie.",
    tool: "Caja de fusibles portátil",
    perk: "Reinicia apagones 2 s más rápido y ve los cables «mentirosos».",
    tasks: [
      "Cambiar bombillas que parpadean en código morse",
      "Reparar la caldera auxiliar de cada piso",
      "Sellar rejillas de ventilación cuando algo golpea desde dentro",
      "Mantener el generador por encima del 40% durante el evento",
    ],
    stats: { Comunicación: 40, Acción: 75, Riesgo: 65 },
  },
  {
    id: "botones",
    name: "Botones",
    icon: "cart" as const,
    color: "var(--color-amber)",
    desc: "Piernas del equipo. Corre maletas entre pisos, escolta huéspedes nerviosos y es el único que puede usar las escaleras de servicio sin permiso.",
    tool: "Carro de equipaje",
    perk: "Sprint infinito en pasillos de servicio + abre atajos para el equipo.",
    tasks: [
      "Llevar cada maleta a su piso antes del tercer timbre",
      "Escoltar huéspedes a su habitación sin perderlos de vista",
      "Activar palancas y botones lejanos que el resto no alcanza",
      "Recoger propinas físicas del suelo (sí, hay que agacharse)",
    ],
    stats: { Comunicación: 50, Acción: 90, Riesgo: 55 },
  },
];

export const floorRules = [
  { rule: "Saluda a todo huésped. A TODOS.", severity: "Alta", floor: "Cualquier piso" },
  { rule: "No mires al espejo más de 3 segundos", severity: "Alta", floor: "P-∞" },
  { rule: "No pises las baldosas húmedas", severity: "Media", floor: "P-13" },
  { rule: "Si oyes el carrito, apaga la linterna", severity: "Media", floor: "Pasillos" },
  { rule: "El ascensor solo baja si alguien ríe", severity: "Media", floor: "Cualquier piso" },
  { rule: "No uses el teléfono después de las 3:33", severity: "Alta", floor: "P-9 en adelante" },
  { rule: "Devuelve las llaves antes del timbre", severity: "Baja", floor: "P-0 a P-6" },
  { rule: "La música solo suena cuando nadie canta", severity: "Media", floor: "P-11" },
];

export const signatureScenarios = [
  {
    code: "P-13",
    name: "La Piscina Sin Fin",
    tagline: "Un piso entero bajo el agua. La superficie queda muy arriba.",
    threat: 2,
    objectives: [
      "Recuperar 6 toallas doradas del fondo sin tocar el agua «equivocada»",
      "Mantener inflados 3 flotadores-baliza que marcan zona segura",
      "Sacar al socorrista ausente de su silla (¿dónde está el socorrista?)",
    ],
    events: [
      "Marea interior: el nivel sube 10 cm cada 20 s hasta el evento final",
      "Carril rápido: algo nada en círculos y salpica donde vas a pisar",
      "Silbido del socorrista: todos quietos o el agua se «ofende»",
    ],
    entity: "El Nadador — se mueve solo bajo tu estela; pisa las zonas que ya secó.",
    loot: "Propinas dobles · Traje de baño dorado (cosmético) · Llave de taquilla",
    design: "Iluminación cáustica, sonido de burbujas direccional. Todo es azul y amable… hasta que cuentas las siluetas del fondo y sobra una.",
  },
  {
    code: "P-∞",
    name: "El Piso Espejo",
    tagline: "Todo está invertido. Tus controles también. Tus compañeros… casi.",
    threat: 3,
    objectives: [
      "Recolocar 4 cuadros que se mueven cuando nadie los mira",
      "Llevar el carrito de limpieza por el pasillo invertido sin chocar",
      "Encontrar la puerta real entre 12 puertas espejo",
    ],
    events: [
      "Eco de 3 segundos: tus movimientos se repiten solos… ¿seguro que son tuyos?",
      "Cambio de inversión cada 45 s: izquierda pasa a ser izquierda otra vez",
      "Cierre del piso: las puertas se multiplican hasta encontrar la real",
    ],
    entity: "El Botones Espejo — te imita con 3 s de retraso. Si coincide contigo, cambia de sitio.",
    loot: "Llave maestra espejada (1 uso) · Título «Reflejo» · Propinas ×2",
    design: "Shaders de simetría en tiempo real. El truco: el espejo refleja todo MENOS a una persona del equipo. Que lo descubran solos.",
  },
  {
    code: "P--1",
    name: "La Caldera",
    tagline: "Bajo el sótano. El corazón del hotel. No dejes de hablarle.",
    threat: 3,
    objectives: [
      "Mantener la caldera encendida durante 4 minutos de ronda final",
      "Alimentarla con carbón… o con tareas sin completar",
      "Sellar 3 válvulas que silban en morse",
    ],
    events: [
      "Apagón total: solo la caldera ilumina; el radio de luz es el equipo",
      "El hotel entero baja: los pisos superiores colapsan con estruendo cada 30 s",
      "Última llama: evento cooperativo de 20 s con los 4 roles a la vez",
    ],
    entity: "Don Caldera — se apaga si nadie le habla. Cuando se apaga él, se apaga el hotel.",
    loot: "Contrato permanente (cosmético) · Título «Gerente de Noche» · 500 propinas",
    design: "Evento final del turno. Se juega con el ruido del servidor en el chat de voz: la caldera «escucha». Escalofriante y absurdo a partes iguales.",
  },
];

export const proceduralCatalog = [
  { code: "P-0", name: "El Restaurante sin Cocina", rule: "Los pedidos llegan a una cocina que no existe. Cocínalos igual.", threat: 1 },
  { code: "P-2", name: "La Lavandería Giratoria", rule: "Las máquinas centrifugan el mapa cada 60 s. Sujétate a lo limpio.", threat: 2 },
  { code: "P-7", name: "El Jardín Interior", rule: "Las plantas crecen cuando nadie las mira. Pódalas mirándolas.", threat: 1 },
  { code: "P-9", name: "La Sala de Trofeos", rule: "Los trofeos cambian de sitio. Nadie pregunta cuáles faltan.", threat: 2 },
  { code: "P-11", name: "El Gimnasio de Medianoche", rule: "Las cintas no paran. Si te subes, termina la rutina.", threat: 2 },
  { code: "P-66", name: "La Sala de Máquinas", rule: "No toques nada rojo. Hay mucho rojo.", threat: 3 },
];

export const entities = [
  {
    name: "El Huésped del 13",
    floor: "Cualquier piso",
    glyph: "eye" as const,
    color: "var(--color-amber)",
    pattern: "Solo se mueve cuando nadie del equipo le mira. Pide habitación… en un piso que no existe.",
    counter: "Asignarle la habitación que pide en menos de 30 s. Aunque no exista.",
  },
  {
    name: "La Gobernanta",
    floor: "Pisos con limpieza",
    glyph: "broom" as const,
    color: "var(--color-cyan)",
    pattern: "Persigue a quien acumule 2+ tareas sin completar. Su carrito siempre está impecable. Siempre.",
    counter: "Repartir tareas en voz alta: nadie puede acumular dos pendientes.",
  },
  {
    name: "El Botones Espejo",
    floor: "P-∞",
    glyph: "mirror" as const,
    color: "var(--color-cyan)",
    pattern: "Te imita con 3 s de retraso. Si sus movimientos coinciden con los tuyos en el presente, cambia de sitio.",
    counter: "Rompe el ritmo: cambia de dirección y velocidad al azar. No pares de moverte.",
  },
  {
    name: "El Nadador",
    floor: "P-13",
    glyph: "droplet" as const,
    color: "var(--color-cyan)",
    pattern: "Nada en círculos bajo el suelo inundado. Salpica exactamente donde vas a pisar.",
    counter: "Lee su estela y pisa solo las zonas que ya dejó secas.",
  },
  {
    name: "Don Caldera",
    floor: "P--1",
    glyph: "flame" as const,
    color: "var(--color-amber)",
    pattern: "Una caldera con carácter. Se apaga si nadie le habla. Cuando se apaga, el hotel se apaga con ella.",
    counter: "Rotación de «voz»: un jugador le habla cada 15 s. Vale cualquier cosa. Vale TODO.",
  },
  {
    name: "El Auditor",
    floor: "Turnos difíciles",
    glyph: "clipboard" as const,
    color: "var(--color-lime)",
    pattern: "Aparece si el equipo rompe 3 reglas. Revisa el turno con una carpeta infinita y cara de decepción.",
    counter: "Cumplir la regla del piso. Siempre. Su presencia se anuncia con el sonido de un bolígrafo.",
  },
];

export const repLadder = [
  { rank: "Botones", range: "Pisos 0 – 4", perk: "Nada. Todos empezamos con la gorra.", color: "var(--color-fog)" },
  { rank: "Recepcionista", range: "Pisos 5 – 14", perk: "Puedes llevar 2 tareas simultáneas sin penalización.", color: "var(--color-cyan)" },
  { rank: "Conserje", range: "Pisos 15 – 34", perk: "Acceso al minibar: 1 cura de «despido» por turno.", color: "var(--color-lime)" },
  { rank: "Subgerente", range: "Pisos 35 – 74", perk: "Veto de piso: evita un escenario por turno.", color: "var(--color-amber)" },
  { rank: "Gerente ∞", range: "Piso 75 +", perk: "Llave maestra: abre cualquier puerta 1 vez por piso. Brilla en la oscuridad.", color: "var(--color-amber)" },
];

export const currencies = [
  {
    name: "Propinas",
    icon: "coin" as const,
    color: "var(--color-amber)",
    desc: "Moneda blanda de cada turno. Compra cosméticos, uniformes y emotes. Se gana trabajando bien y cumpliendo reglas.",
  },
  {
    name: "Insignias de Gerencia",
    icon: "star" as const,
    color: "var(--color-cyan)",
    desc: "Moneda de prestigio: se gana con turnos perfectos y ratings de 5★. Desbloquea títulos, la sala VIP del lobby y el modo Hora Extra.",
  },
];

export const shopItems = [
  "Uniformes de época (6 estilos)",
  "Emotes de susto (4 animaciones)",
  "Llaves cosméticas que brillan",
  "Mascota «Campanita»",
  "Taquillas temáticas del lobby",
  "Cono del despido personalizado",
];

export const gamePasses = [
  {
    name: "Contrato Plus",
    price: "349 R$",
    tag: "Mejor valor",
    desc: "+25% propinas permanentes, taquilla extra y reaparición en recepción sin el cono del despido.",
  },
  {
    name: "Llave Maestra ∞",
    price: "499 R$",
    tag: "Prestigio",
    desc: "Abre cualquier puerta 1 vez por piso y desbloquea el Atajo de Servicio para todo el equipo.",
  },
  {
    name: "Uniforme de Gala",
    price: "199 R$",
    tag: "Cosmético",
    desc: "Traje completo con efecto de brillo. Puro estilo: cero ventaja mecánica, mucha envidia.",
  },
  {
    name: "Mascota Campanita",
    price: "249 R$",
    tag: "Utilidad",
    desc: "Campana flotante que suena 2 s antes de cada evento. El equipo la querrá cerca.",
  },
];

export const devProducts = [
  { name: "Propinas ×2", price: "99 R$", note: "Consumible · solo durante 1 turno" },
  { name: "«Segunda Oportunidad»", price: "129 R$", note: "Consumible · el hotel «te readmite» tras un despido" },
];

export const monetizationPrinciples = [
  "Cosméticos primero: nada que cambie el equilibrio de los sustos.",
  "Consumibles solo de conveniencia, nunca de poder.",
  "Todo lo jugable se puede conseguir gratis con propinas.",
  "Premium de Roblox da +10% propinas y sala VIP social (recompensa a la plataforma).",
];

/* ------------------------- integración técnica Roblox ------------------------- */

export const integrationSteps = [
  {
    title: "La experiencia vive en la nube de Roblox",
    text: "Se crea en Roblox Studio como un «Universe» con su Place principal. Publicar (File → Publish to Roblox) sube el juego a los servidores de Roblox; los jugadores entran desde la app o la web, sin descarga propia.",
  },
  {
    title: "Arquitectura cliente-servidor con Luau",
    text: "La lógica real (pisos, entidades, propinas) corre en scripts de servidor dentro de ServerScriptService. El cliente solo pinta HUD y efectos con LocalScripts. Se comunican por RemoteEvents guardados en ReplicatedStorage.",
  },
  {
    title: "Persistencia con DataStoreService",
    text: "Cada perfil se guarda con clave «u_UserId» en un DataStore con session lock, para que dos servidores no pisen la misma cuenta. BindToClose guarda todo si el servidor se apaga.",
  },
  {
    title: "Monetización vía MarketplaceService",
    text: "Los game passes se configuran en create.roblox.com (obtienen un ID) y se compran en juego con PromptGamePassPurchase. Los consumibles pasan por ProcessReceipt, que debe ser idempotente.",
  },
  {
    title: "Comunicación entre servidores",
    text: "MessagingService permite eventos de live-ops globales: un «doble propinas para todo el mundo» se publica una vez y lo reciben todos los servidores del universo a la vez.",
  },
  {
    title: "Publicación y ficha del juego",
    text: "Icono 512×512, miniaturas 1920×1080, banda de edad (9+/13+), género «Comedia» y descripción con las palabras clave del género. Las versiones publicadas permiten rollback instantáneo si una update rompe algo.",
  },
];

export const folderTree = `ReplicatedStorage/
├─ Modules/           ← ModuleScripts compartidos
│   FloorTypes · Rules · Roles · Entities · Economy
├─ Remotes/           ← RemoteEvents y RemoteFunctions
│   FloorReady · TaskCompleted · RuleBroken · EntityWarning
└─ Assets/            ← prefabs de UI del HUD

ServerScriptService/
└─ Systems/           ← toda la lógica autoritativa
    FloorGenerator · EntityDirector · RoleManager
    EconomyService · ShopService · LiveOpsService

ServerStorage/
└─ Assets/            ← nunca llega al cliente hasta usarse
    ├─ Floors/        ← plantillas por arquetipo (Models)
    └─ Entities/      ← rigs de huéspedes y eventos

StarterPlayer/StarterPlayerScripts/
└─ Client/            ← LocalScripts: solo presentación
    HUD · InteractionController · Effects · Audio

Workspace/
└─ Floors/            ← pisos generados en runtime`;

export const codeSnippets = [
  {
    id: "generator",
    tab: "Generador de pisos",
    file: "ServerScriptService/Systems/FloorGenerator.server.lua",
    note: "El corazón del juego: cada piso es una semilla, no un mapa construido.",
    code: `-- Generador procedural de pisos (servidor, autoritativo)
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage     = game:GetService("ServerStorage")
local CollectionService = game:GetService("CollectionService")

local Remotes     = ReplicatedStorage:WaitForChild("Remotes")
local FloorReady  = Remotes:WaitForChild("FloorReady")
local Archetypes  = require(ReplicatedStorage.Modules.FloorTypes)
local Rules       = require(ReplicatedStorage.Modules.Rules)

local FloorGenerator = {}

function FloorGenerator.build(seed: number, difficulty: number)
    local rng      = Random.new(seed)
    local arch     = Archetypes.pick(rng, difficulty)   -- arquetipo de piso
    local rule     = Rules.pick(rng, arch)              -- regla secreta
    local template = ServerStorage.Assets.Floors[arch.modelName]:Clone()

    template:PivotTo(CFrame.new(0, difficulty * 40, 0)) -- apila pisos
    template.Parent = workspace.Floors

    -- conecta la regla con los objetos interactivos del piso
    for _, pad in CollectionService:GetTagged("Interactivo") do
        if pad:IsDescendantOf(template) and pad:HasTag(rule.tag) then
            pad:SetAttribute("ReglaActiva", true)
        end
    end

    FloorReady:FireAllClients({ code = arch.code, rule = rule.text, seed = seed })
end

return FloorGenerator`,
  },
  {
    id: "economy",
    tab: "Guardado de perfil",
    file: "ServerScriptService/Systems/EconomyService.server.lua",
    note: "Session lock contra cuentas duplicadas entre servidores.",
    code: `-- Persistencia con DataStoreService + session lock
local DataStoreService = game:GetService("DataStoreService")
local Profiles         = DataStoreService:GetDataStore("HotelProfiles_v1")

local Economy = { cache = {} }

function Economy.load(player: Player)
    local key = "u_" .. player.UserId
    local ok, data = pcall(function()
        return Profiles:UpdateAsync(key, function(saved)
            saved = saved or { propinas = 0, reputacion = 0, pisos = 0, cosmetics = {} }
            if saved.locked then return nil end  -- ya hay sesión abierta: rechaza
            saved.locked = true
            return saved
        end)
    end)
    if ok and data then Economy.cache[player] = data end
    return ok and data or nil
end

function Economy.save(player: Player)
    local data = Economy.cache[player]
    if not data then return end
    data.locked = nil                            -- libera la sesión
    pcall(function()
        Profiles:SetAsync("u_" .. player.UserId, data)
    end)
end

game.Players.PlayerRemoving:Connect(Economy.save)
game:BindToClose(function()                      -- guarda TODO si el servidor cae
    for player, _ in Economy.cache do Economy.save(player) end
end)

return Economy`,
  },
  {
    id: "shop",
    tab: "Tienda y game passes",
    file: "ServerScriptService/Systems/ShopService.server.lua",
    note: "Los IDs reales aparecen al crear cada pass en create.roblox.com.",
    code: `-- Monetización: game passes + productos consumibles
local MarketplaceService = game:GetService("MarketplaceService")
local Economy            = require(script.Parent.EconomyService)

local PASSES = {
    [1111111] = "contratoPlus",    -- +25% propinas
    [2222222] = "llaveMaestra",    -- abre cualquier puerta 1 vez/piso
    [3333333] = "mascotaCampanita" -- avisa 2 s antes de eventos
}

-- Compra desde el HUD:
-- MarketplaceService:PromptGamePassPurchase(player, passId)

MarketplaceService.ProcessReceipt = function(receipt)
    local player = game.Players:GetPlayerByUserId(receipt.PlayerId)
    if not player then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    if receipt.ProductId == 4444444 then         -- Propinas x2 (1 turno)
        Economy.applyBoost(player, 2, 600)
        return Enum.ProductPurchaseDecision.PurchaseGranted
    end
    if receipt.ProductId == 5555555 then         -- Segunda Oportunidad
        Economy.rehire(player)
        return Enum.ProductPurchaseDecision.PurchaseGranted
    end
    return Enum.ProductPurchaseDecision.NotProcessedYet
end`,
  },
];

export const dataStoreSchema = [
  { field: "propinas", type: "int", desc: "Moneda blanda acumulada" },
  { field: "reputacion", type: "int", desc: "Rango en la escalera (Botones → Gerente ∞)" },
  { field: "pisosCompletados", type: "map<string, int>", desc: "Contador por código de piso (P-13: 7…)" },
  { field: "cosmetics", type: "array<string>", desc: "Objetos cosméticos en propiedad" },
  { field: "turnosPerfectos", type: "int", desc: "Racha de turnos sin despidos (Insignias)" },
  { field: "locked", type: "bool", desc: "Session lock temporal (nunca persiste)" },
];

export const remotes = [
  { name: "FloorReady", dir: "S → C", payload: "{ code, rule, seed }", note: "Broadcast al empezar cada piso" },
  { name: "TaskCompleted", dir: "C → S", payload: "{ taskId }", note: "El servidor valida posición y rol antes de pagar" },
  { name: "RuleBroken", dir: "S → C", payload: "{ player, rule }", note: "Dispara el «despido» cómico" },
  { name: "EntityWarning", dir: "S → C", payload: "{ type, delay }", note: "Solo para Campanita y perks de rol" },
  { name: "RequestElevator", dir: "C → S", payload: "{ teamId }", note: "Llama al ascensor para el checkout" },
];

export const robloxServices = [
  { name: "DataStoreService", use: "Perfiles, récords y session lock" },
  { name: "MarketplaceService", use: "Game passes y dev products" },
  { name: "PathfindingService", use: "Rutas de huéspedes y entidades" },
  { name: "CollectionService", use: "Tags en interactivos («Limpiable», «Reparable»)" },
  { name: "MessagingService", use: "Eventos de live-ops entre servidores" },
  { name: "TweenService + RunService", use: "Luces, ascensor y timing de sustos" },
  { name: "LocalizationService", use: "Textos ES / EN / PT-BR desde una hoja de cálculo" },
];

export const antiCheat = [
  "Servidor autoritativo: propinas, entidades y reglas solo existen en el servidor.",
  "TaskCompleted se valida con posición del jugador, rol asignado y cooldown.",
  "Rate limit en todos los remotes: 10 peticiones/s por jugador.",
  "Sanity check de distancia: nadie completa tareas a más de 12 studs del objeto.",
  "Los sustos se deciden en servidor; el cliente solo los reproduce.",
];

export const publishingChecklist = [
  "Universe creado en create.roblox.com con Place principal",
  "Icono 512×512 y 3 miniaturas 1920×1080 (susto + lobby + piscina)",
  "Game passes creados y sus IDs volcados al ModuleScript de configuración",
  "Banda de edad 9+/13+ · género Comedia · descripción con keywords",
  "Versiones publicadas con nombres legibles para rollback",
  "Test en móvil (Controles táctiles) y consola antes de cada update",
];

/* ------------------------------- producción ------------------------------- */

export const liveOps = [
  {
    season: "Inauguración",
    window: "Lanzamiento",
    content: "6 pisos (los 3 firma + 3 procedurales), 4 roles, 2 eventos de apagón y el modo Turno de Día.",
  },
  {
    season: "Noche de Reyes",
    window: "Invierno · semanas 14–16",
    content: "Evento temporal P-25 «El Piso de los Regalos»: los huéspedes piden regalos; abrir el equivocado despierta al Auditor. Cosméticos de nieve.",
  },
  {
    season: "Temporada de Piscina",
    window: "Verano · semanas 30+",
    content: "Expansión de P-13 con 3 variantes de marea, traje de baño dorado como recompensa de temporada y torneo de turnos perfectos.",
  },
];

export const kpis = [
  { metric: "Retención D1", target: "≥ 35%", note: "benchmark del top-100" },
  { metric: "Sesión media", target: "18 min", note: "3+ pisos por visita" },
  { metric: "Retención D7", target: "≥ 12%", note: "motor: rango nuevo" },
  { metric: "Conversión pagador", target: "2 – 4%", note: "cosméticos + conveniencia" },
  { metric: "Rondas por sesión", target: "≥ 2,5", note: "mide el loop de 90 s" },
];

export const risks = [
  {
    risk: "Miedo demasiado intenso para 12 años",
    chance: "Medio",
    mitigation: "Sustos cómicos, cero gore, «despido» en vez de muerte y el modo Turno de Día con avisos. Test con el rango bajo antes de cada evento nuevo.",
  },
  {
    risk: "El generador se vuelve repetitivo",
    chance: "Medio",
    mitigation: "Banco de 30+ reglas y 12+ arquetipos, seeds semanales compartidas por todo el servidor y votación de piso en el lobby.",
  },
  {
    risk: "Equipos grandes se aburren",
    chance: "Bajo",
    mitigation: "Roles obligatorios desde 3 jugadores y tareas de 2 personas con pago ×3 que obligan a emparejarse.",
  },
  {
    risk: "Saturación de terror en el top",
    chance: "Alto",
    mitigation: "El ángulo laboral-cómico es el diferencial: no huyes del hotel, trabajas en él. Los clips venden la risa, no el susto.",
  },
];

export const gddNav = [
  { id: "sinopsis", label: "P0 · Sinopsis" },
  { id: "plan", label: "P1 · Plan de juego" },
  { id: "roles", label: "P2 · Roles" },
  { id: "reglas", label: "P3 · Reglas" },
  { id: "escenarios", label: "P4 · Escenarios" },
  { id: "entidades", label: "P5 · Entidades" },
  { id: "economia", label: "P6 · Economía" },
  { id: "monetizacion", label: "P7 · Monetización" },
  { id: "tecnica", label: "P8 · Técnica Roblox" },
  { id: "produccion", label: "P9 · Producción" },
];
