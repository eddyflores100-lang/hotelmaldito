import type { LuauFile } from "./codebase-types";

export const serverFiles: LuauFile[] = [
  {
    id: "types",
    name: "Types",
    path: "ReplicatedStorage/Shared/Types",
    kind: "ModuleScript",
    folder: "Compartido",
    week: 1,
    phase: "F1",
    description:
      "Definiciones de tipos compartidas entre cliente y servidor. Es el primer archivo del proyecto: todo lo demás importa de aquí.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ReplicatedStorage/Shared/Types
-- Tipos compartidos entre servidor y cliente.
-- ============================================================

export type Rarity = "Comun" | "Raro" | "Epico" | "Legendario"

export type Severity = 1 | 2 | 3

export type RoleId = "Recepcion" | "Limpieza" | "Mantenimiento" | "Botones"

export interface RuleDef
	id: string
	texto: string
	severidad: Severity
	-- true si el jugador DEBE hacer algo, false si debe evitarlo
	afirmativa: boolean
end

export interface TaskDef
	id: string
	nombre: string
	descripcion: string
	rolRequerido: RoleId?
	duracion: number        -- segundos que tarda en completarse
	recompensaPropinas: number
end

export interface RoomDef
	id: string
	tipo: string            -- "pasillo" | "habitacion" | "servicio" | "especial"
	size: Vector3
	peso: number            -- probabilidad de aparecer en la generacion
end

export interface FloorDef
	id: string
	codigo: string          -- "P-13", "P-∞"...
	nombre: string
	descripcion: string
	paleta: Color3
	niebla: Color3?
	gravedad: number        -- 1 = normal
	reglaFija: string?      -- id de regla obligatoria del piso
	entidades: {string}     -- ids de entidades que pueden spawnear
	salasEspeciales: {string}
	peso: number
end

export interface EntityDef
	id: string
	nombre: string
	velocidad: number
	danioReputacion: number
	patron: "patrulla" | "acecho" | "estatico" | "persecucion"
end

export interface Shift
	numero: number
	floorId: string
	reglaActiva: RuleDef?
	estado: "esperando" | "activo" | "apagon" | "terminado"
	inicio: number          -- os.time()
	propinasGanadas: number
end

export interface PlayerProgress
	reputacion: number
	propinas: number
	llaves: {string}        -- ids de llaves maestras
	cosmeticos: {string}
	pisosCompletados: {string}
	turnosJugados: number
	mejorRacha: number
end

export interface GamePass
	id: number
	nombre: string
	precio: number
end

return {}`,
  },
  {
    id: "config",
    name: "Config",
    path: "ReplicatedStorage/Shared/Config",
    kind: "ModuleScript",
    folder: "Compartido",
    week: 1,
    phase: "F1",
    description:
      "Todos los números de ajuste del juego en un solo lugar. Cambiar el balance nunca requiere tocar la lógica.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ReplicatedStorage/Shared/Config
-- Constantes y ajuste global del juego.
-- ============================================================

local Config = {}

-- ---------- Sesión ----------
Config.MAX_JUGADORES_POR_TURNO = 4
Config.SEGUNDOS_ENTRE_TURNOS   = 20    -- descanso en el lobby
Config.DURACION_TURNO          = 240   -- 4 minutos de trabajo
Config.DURACION_APAGON         = 45    -- evento de luces fuera

-- ---------- Economía ----------
Config.PROPINAS_POR_TAREA_BASE = 10
Config.MULTIPLICADOR_RACHA     = 1.15  -- por tarea seguida sin fallo
Config.RACHA_MAXIMA            = 8
Config.COSTE_REVIVIR           = 129   -- dev product (Robux)

-- ---------- Reputación ----------
Config.REPUTACION_NIVELES = {
	{ nivel = "Botones",    minimo = 0 },
	{ nivel = "Conserje",   minimo = 250 },
	{ nivel = "Supervisor", minimo = 1000 },
	{ nivel = "Encargado",  minimo = 3000 },
	{ nivel = "Gerente ∞",  minimo = 10000 },
}

-- ---------- Generación de pisos ----------
Config.SALAS_POR_PISO_MIN = 8
Config.SALAS_POR_PISO_MAX = 14
Config.TAMANO_SALA        = Vector3.new(24, 12, 24)   -- studs
Config.ALTURA_TECHO       = 12

-- ---------- Entidades ----------
Config.MAX_ENTIDADES_POR_PISO = 2
Config.RADIO_DETECCION        = 30
Config.VELOCIDAD_BASE_HUESPED = 8

-- ---------- Gamepasses ----------
Config.GAMEPASSES = {
	{ id = 0, nombre = "Uniforme Dorado",   precio = 349 },
	{ id = 0, nombre = "Llave Maestra",     precio = 199 },
	{ id = 0, nombre = "Contrato Extra",    precio = 129 },
	{ id = 0, nombre = "Emote Susto Épico", precio = 99 },
}

-- ---------- DataStore ----------
Config.DATASTORE_NOMBRE = "HotelInfinito_v1"
Config.AUTOSAVE_SEGUNDOS = 60

return Config`,
  },
  {
    id: "rule-registry",
    name: "RuleRegistry",
    path: "ReplicatedStorage/Shared/RuleRegistry",
    kind: "ModuleScript",
    folder: "Compartido",
    week: 1,
    phase: "F1",
    description:
      "El banco de reglas del hotel. Cada turno se sortea una y el RuleEngine vigila su cumplimiento.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ReplicatedStorage/Shared/RuleRegistry
-- Banco de reglas que pueden aplicarse a un turno.
-- ============================================================

local Types = require(script.Parent.Types)

local RuleRegistry: { Types.RuleDef } = {
	{
		id = "saluda",
		texto = "Saluda a todo huésped. A TODOS.",
		severidad = 1,
		afirmativa = true,
	},
	{
		id = "no_corras",
		texto = "Prohibido correr en los pasillos.",
		severidad = 1,
		afirmativa = false,
	},
	{
		id = "no_silbes",
		texto = "No silbes. Al hotel no le gusta.",
		severidad = 2,
		afirmativa = false,
	},
	{
		id = "luces_apagadas",
		texto = "Apaga las luces que enciendas al salir de cada sala.",
		severidad = 2,
		afirmativa = true,
	},
	{
		id = "no_espejos",
		texto = "No mires a los espejos más de 3 segundos.",
		severidad = 3,
		afirmativa = false,
	},
	{
		id = "responde",
		texto = "Si el teléfono suena, contesta antes del 3er tono.",
		severidad = 2,
		afirmativa = true,
	},
	{
		id = "no_piso_13",
		texto = "El botón del piso 13 no existe. No lo pulses.",
		severidad = 3,
		afirmativa = false,
	},
}

-- Devuelve una regla al azar (opcionalmente excluyendo una)
function RuleRegistry.sortear(excluirId: string?): Types.RuleDef
	local pool = {}
	for _, r in RuleRegistry do
		if r.id ~= excluirId then
			table.insert(pool, r)
		end
	end
	return pool[math.random(1, #pool)]
end

function RuleRegistry.porId(id: string): Types.RuleDef?
	for _, r in RuleRegistry do
		if r.id == id then
			return r
		end
	end
	return nil
end

return RuleRegistry`,
  },
  {
    id: "floor-registry",
    name: "FloorRegistry",
    path: "ReplicatedStorage/Shared/FloorRegistry",
    kind: "ModuleScript",
    folder: "Compartido",
    week: 2,
    phase: "F1",
    description:
      "Datos de los 10 pisos: paleta, niebla, entidades y salas especiales. El generador procedural lee esto.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ReplicatedStorage/Shared/FloorRegistry
-- Definicion de los pisos del hotel.
-- ============================================================

local Types = require(script.Parent.Types)

local FloorRegistry: { Types.FloorDef } = {
	{
		id = "piscina",
		codigo = "P-13",
		nombre = "La Piscina Sin Fin",
		descripcion = "Un piso entero inundado. Pasillos submarinos, flotadores a la deriva y algo que nada en círculos.",
		paleta = Color3.fromRGB(31, 111, 139),
		niebla = Color3.fromRGB(20, 70, 95),
		gravedad = 0.7,
		reglaFija = "no_corras",
		entidades = { "nadador", "flotador" },
		salasEspeciales = { "piscina_infinita", "vestuarios" },
		peso = 30,
	},
	{
		id = "espejo",
		codigo = "P-∞",
		nombre = "El Piso Espejo",
		descripcion = "Todo está invertido. Los huéspedes te imitan con tres segundos de retraso.",
		paleta = Color3.fromRGB(120, 120, 140),
		niebla = Color3.fromRGB(70, 70, 90),
		gravedad = 1,
		reglaFija = "no_espejos",
		entidades = { "doble", "conserje_espejo" },
		salasEspeciales = { "sala_espejos", "galeria" },
		peso = 25,
	},
	{
		id = "caldera",
		codigo = "P--1",
		nombre = "La Caldera",
		descripcion = "El corazón del hotel. Mantenla encendida mientras todo intenta apagarte.",
		paleta = Color3.fromRGB(139, 69, 19),
		niebla = Color3.fromRGB(60, 30, 10),
		gravedad = 1,
		reglaFija = "luces_apagadas",
		entidades = { "hollin", "valvula" },
		salasEspeciales = { "sala_caldera", "tunel_vapor" },
		peso = 20,
	},
	{
		id = "buffet",
		codigo = "P-07",
		nombre = "El Buffet Eterno",
		descripcion = "La comida nunca se acaba. Los comensales tampoco.",
		paleta = Color3.fromRGB(160, 120, 40),
		gravedad = 1,
		entidades = { "comensal" },
		salasEspeciales = { "comedor" },
		peso = 25,
	},
}

function FloorRegistry.sortear(): Types.FloorDef
	local total = 0
	for _, f in FloorRegistry do
		total += f.peso
	end
	local roll = math.random() * total
	local acumulado = 0
	for _, f in FloorRegistry do
		acumulado += f.peso
		if roll <= acumulado then
			return f
		end
	end
	return FloorRegistry[1]
end

function FloorRegistry.porId(id: string): Types.FloorDef?
	for _, f in FloorRegistry do
		if f.id == id then
			return f
		end
	end
	return nil
end

return FloorRegistry`,
  },
  {
    id: "remotes",
    name: "Remotes",
    path: "ReplicatedStorage/Shared/Remotes",
    kind: "ModuleScript",
    folder: "Compartido",
    week: 1,
    phase: "F1",
    description:
      "Crea la carpeta de RemoteEvents y RemoteFunctions una sola vez. Es el contrato de comunicación cliente↔servidor.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ReplicatedStorage/Shared/Remotes
-- Contrato de comunicacion cliente <-> servidor.
-- Se ejecuta UNA vez desde el servidor al arrancar.
-- ============================================================

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Remotes = {}
Remotes._folder = nil :: Folder?

local EVENTOS_SERVER_A_CLIENTE = {
	"TurnoIniciado",      -- (floorDef, reglaDef, rolAsignado)
	"TurnoTerminado",     -- (resumen)
	"Apagon",             -- (activo: boolean)
	"ReglaRompida",       -- (jugador, reglaDef)
	"Susto",              -- (tipoSusto, intensidad)
	"PropinasActualizadas", -- (propinas, racha)
}

local EVENTOS_CLIENTE_A_SERVIDOR = {
	"TareaCompletada",    -- (tareaId)
	"SaludoEnviado",      -- (huespedId)
	"PeticionRevivir",    -- ()
	"CambiarRol",         -- (rolId)
}

local FUNCIONES = {
	"ObtenerDatosJugador",  -- -> PlayerProgress
	"ComprarRevivir",       -- -> boolean
}

function Remotes.instalar(): Folder
	if Remotes._folder then
		return Remotes._folder
	end

	local folder = Instance.new("Folder")
	folder.Name = "Remotes"
	folder.Parent = ReplicatedStorage

	for _, nombre in EVENTOS_SERVER_A_CLIENTE do
		local ev = Instance.new("RemoteEvent")
		ev.Name = nombre
		ev.Parent = folder
	end

	for _, nombre in EVENTOS_CLIENTE_A_SERVIDOR do
		local ev = Instance.new("RemoteEvent")
		ev.Name = nombre
		ev.Parent = folder
	end

	for _, nombre in FUNCIONES do
		local fn = Instance.new("RemoteFunction")
		fn.Name = nombre
		fn.Parent = folder
	end

	Remotes._folder = folder
	return folder
end

function Remotes.obtener(): Folder
	return Remotes._folder or Remotes.instalar()
end

return Remotes`,
  },
  {
    id: "data-service",
    name: "DataService",
    path: "ServerScriptService/Core/DataService",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 2,
    phase: "F1",
    description:
      "Persistencia con DataStoreService: session lock para evitar corrupción, reintentos con pcall y guardado al cerrar el servidor.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Core/DataService
-- Persistencia de progreso. Session lock + BindToClose.
-- ============================================================

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Config = require(game.ReplicatedStorage.Shared.Config)
local Types = require(game.ReplicatedStorage.Shared.Types)

local store = DataStoreService:GetDataStore(Config.DATASTORE_NOMBRE)

local DataService = {}
local cache: { [Player]: Types.PlayerProgress } = {}
local locks: { [Player]: boolean } = {}

local function datosVacios(): Types.PlayerProgress
	return {
		reputacion = 0,
		propinas = 0,
		llaves = {},
		cosmeticos = {},
		pisosCompletados = {},
		turnosJugados = 0,
		mejorRacha = 0,
	}
end

-- ---------- Session lock ----------
local function adquirirLock(userId: number): boolean
	local key = "lock_" .. userId
	local ok, resultado = pcall(function()
		return store:UpdateAsync(key, function(lockInfo)
			if lockInfo and lockInfo.activo then
				-- Otra sesion ya tiene los datos: rechazamos.
				error("Sesion duplicada")
			end
			return { activo = true, ts = os.time() }
		end)
	end)
	return ok and resultado ~= nil
end

local function liberarLock(userId: number)
	local key = "lock_" .. userId
	pcall(function()
		store:UpdateAsync(key, function()
			return { activo = false, ts = os.time() }
		end)
	end)
end

-- ---------- Carga / guardado ----------
function DataService.cargar(player: Player): Types.PlayerProgress
	local userId = player.UserId

	if not adquirirLock(userId) then
		warn("[Data] No se pudo adquirir lock para " .. player.Name)
	end
	locks[player] = true

	local datos = datosVacios()
	local ok, guardado = pcall(function()
		return store:GetAsync("player_" .. userId)
	end)

	if ok and type(guardado) == "table" then
		-- Fusionamos con los vacios por si faltan campos nuevos.
		for k, v in datosVacios() do
			if (guardado :: any)[k] ~= nil then
				(datos :: any)[k] = (guardado :: any)[k]
			end
		end
	end

	cache[player] = datos
	return datos
end

function DataService.obtener(player: Player): Types.PlayerProgress
	return cache[player] or datosVacios()
end

function DataService.guardar(player: Player)
	local datos = cache[player]
	if not datos then return end

	local ok, err = pcall(function()
		store:SetAsync("player_" .. player.UserId, datos)
	end)
	if not ok then
		warn("[Data] Fallo al guardar " .. player.Name .. ": " .. tostring(err))
	end
end

function DataService.desconectar(player: Player)
	DataService.guardar(player)
	if locks[player] then
		liberarLock(player.UserId)
		locks[player] = nil
	end
	cache[player] = nil
end

-- ---------- Autosave + cierre ----------
task.spawn(function()
	while true do
		task.wait(Config.AUTOSAVE_SEGUNDOS)
		for player, _ in cache do
			DataService.guardar(player)
		end
	end
end)

game:BindToClose(function()
	for player, _ in cache do
		DataService.guardar(player)
		liberarLock(player.UserId)
	end
	if not RunService:IsStudio() then
		task.wait(2) -- margen para que lleguen los SetAsync
	end
end)

Players.PlayerRemoving:Connect(DataService.desconectar)

return DataService`,
  },
  {
    id: "floor-templates",
    name: "FloorTemplates",
    path: "ServerScriptService/Maps/FloorTemplates",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 2,
    phase: "F1",
    description:
      "Plantillas de salas (pasillo, habitación, servicio, especial) que el generador combina y rota proceduralmente.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Maps/FloorTemplates
-- Plantillas de salas para la generacion procedural.
-- Cada plantilla es una funcion que devuelve una tabla de
-- piezas (posiciones relativas) que el generador instancia.
-- ============================================================

local Types = require(game.ReplicatedStorage.Shared.Types)

local Templates = {}

export interface Pieza
	tipo: "suelo" | "pared" | "techo" | "prop" | "luz" | "spawn"
	pos: Vector3
	size: Vector3?
	rot: number?
	material: Enum.Material?
	color: Color3?
end

local function habitacion(): { Pieza }
	return {
		{ tipo = "suelo",  pos = Vector3.new(0, 0, 0),    size = Vector3.new(24, 1, 24) },
		{ tipo = "pared",  pos = Vector3.new(0, 6, -12),  size = Vector3.new(24, 12, 1) },
		{ tipo = "pared",  pos = Vector3.new(0, 6, 12),   size = Vector3.new(24, 12, 1) },
		{ tipo = "pared",  pos = Vector3.new(-12, 6, 0),  size = Vector3.new(1, 12, 24) },
		{ tipo = "techo",  pos = Vector3.new(0, 12, 0),   size = Vector3.new(24, 1, 24) },
		{ tipo = "prop",   pos = Vector3.new(-8, 2, -8),  size = Vector3.new(6, 3, 6) },  -- cama
		{ tipo = "luz",    pos = Vector3.new(0, 10, 0) },
		{ tipo = "spawn",  pos = Vector3.new(0, 1, 10) },
	}
end

local function pasillo(): { Pieza }
	return {
		{ tipo = "suelo",  pos = Vector3.new(0, 0, 0),    size = Vector3.new(24, 1, 8) },
		{ tipo = "pared",  pos = Vector3.new(0, 6, -4),   size = Vector3.new(24, 12, 1) },
		{ tipo = "pared",  pos = Vector3.new(0, 6, 4),    size = Vector3.new(24, 12, 1) },
		{ tipo = "techo",  pos = Vector3.new(0, 12, 0),   size = Vector3.new(24, 1, 8) },
		{ tipo = "luz",    pos = Vector3.new(-6, 10, 0) },
		{ tipo = "luz",    pos = Vector3.new(6, 10, 0) },
		{ tipo = "spawn",  pos = Vector3.new(0, 1, 0) },
	}
end

local function salaServicio(): { Pieza }
	return {
		{ tipo = "suelo",  pos = Vector3.new(0, 0, 0),     size = Vector3.new(16, 1, 16) },
		{ tipo = "pared",  pos = Vector3.new(0, 6, -8),    size = Vector3.new(16, 12, 1) },
		{ tipo = "pared",  pos = Vector3.new(-8, 6, 0),    size = Vector3.new(1, 12, 16) },
		{ tipo = "techo",  pos = Vector3.new(0, 12, 0),    size = Vector3.new(16, 1, 16) },
		{ tipo = "prop",   pos = Vector3.new(-5, 2, -5),   size = Vector3.new(4, 4, 4) },  -- maquinaria
		{ tipo = "prop",   pos = Vector3.new(5, 1.5, -6),  size = Vector3.new(3, 3, 2) },  -- estanteria
		{ tipo = "luz",    pos = Vector3.new(0, 10, 0) },
		{ tipo = "spawn",  pos = Vector3.new(0, 1, 6) },
	}
end

local function salaEspecial(): { Pieza }
	-- Sala grande para la piscina, la caldera, el comedor...
	return {
		{ tipo = "suelo",  pos = Vector3.new(0, 0, 0),     size = Vector3.new(32, 1, 32) },
		{ tipo = "pared",  pos = Vector3.new(0, 8, -16),   size = Vector3.new(32, 16, 1) },
		{ tipo = "pared",  pos = Vector3.new(0, 8, 16),    size = Vector3.new(32, 16, 1) },
		{ tipo = "pared",  pos = Vector3.new(-16, 8, 0),   size = Vector3.new(1, 16, 32) },
		{ tipo = "pared",  pos = Vector3.new(16, 8, 0),    size = Vector3.new(1, 16, 32) },
		{ tipo = "techo",  pos = Vector3.new(0, 16, 0),    size = Vector3.new(32, 1, 32) },
		{ tipo = "prop",   pos = Vector3.new(0, 1, 0),     size = Vector3.new(20, 2, 20) }, -- nucleo
		{ tipo = "luz",    pos = Vector3.new(-8, 13, -8) },
		{ tipo = "luz",    pos = Vector3.new(8, 13, 8) },
		{ tipo = "spawn",  pos = Vector3.new(0, 1, 13) },
	}
end

Templates.porTipo = {
	habitacion = habitacion,
	pasillo = pasillo,
	servicio = salaServicio,
	especial = salaEspecial,
}

function Templates.obtener(tipo: string): { Pieza }
	local fn = Templates.porTipo[tipo]
	if fn then
		return fn()
	end
	return pasillo()
end

return Templates`,
  },
  {
    id: "floor-generator",
    name: "FloorGenerator",
    path: "ServerScriptService/Core/FloorGenerator",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 3,
    phase: "F2",
    description:
      "El corazón del juego: genera un piso único combinando salas, aplica la paleta del piso y coloca spawns de tareas y entidades.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Core/FloorGenerator
-- Generacion procedural de pisos.
-- ============================================================

local Types = require(game.ReplicatedStorage.Shared.Types)
local Config = require(game.ReplicatedStorage.Shared.Config)
local Templates = require(script.Parent.Parent.Maps.FloorTemplates)

local FloorGenerator = {}

local Workspace = game:GetService("Workspace")

-- Construye las piezas de una sala y las pinta con la paleta.
local function construirSala(
	piezas: { any },
	origen: Vector3,
	paleta: Color3,
	folderPadre: Instance
): Instance
	local sala = Instance.new("Model")
	sala.Name = "Sala"

	for _, pieza in piezas do
		if pieza.tipo == "luz" then
			local luz = Instance.new("PointLight")
			local bombilla = Instance.new("Part")
			bombilla.Name = "Bombilla"
			bombilla.Size = Vector3.new(1, 1, 1)
			bombilla.Anchored = true
			bombilla.CanCollide = false
			bombilla.Material = Enum.Material.Neon
			bombilla.Color = Color3.fromRGB(255, 214, 150)
			bombilla.Position = origen + (pieza.pos :: Vector3)
			luz.Brightness = 1.2
			luz.Range = 30
			luz.Parent = bombilla
			bombilla.Parent = sala
		elseif pieza.tipo == "spawn" then
			local spawn = Instance.new("Part")
			spawn.Name = "SpawnTarea"
			spawn.Size = Vector3.new(2, 0.4, 2)
			spawn.Anchored = true
			spawn.CanCollide = false
			spawn.Transparency = 1
			spawn.Position = origen + (pieza.pos :: Vector3)
			spawn:SetAttribute("EsSpawnTarea", true)
			spawn.Parent = sala
		else
			local part = Instance.new("Part")
			part.Name = pieza.tipo
			part.Size = (pieza.size :: Vector3) or Vector3.new(4, 4, 4)
			part.Anchored = true
			part.Material = (pieza.material :: Enum.Material?) or Enum.Material.SmoothPlastic
			part.Color = (pieza.color :: Color3?) or paleta
			part.Position = origen + (pieza.pos :: Vector3)
			part.Parent = sala
		end
	end

	sala.Parent = folderPadre
	return sala
end

-- Genera un piso completo y devuelve su modelo raiz.
function FloorGenerator.generar(floorDef: Types.FloorDef, semilla: number?): Model
	math.randomseed(semilla or os.time())

	local raiz = Instance.new("Model")
	raiz.Name = "Piso_" .. floorDef.codigo
	raiz:SetAttribute("FloorId", floorDef.id)

	local contenedor = Workspace:FindFirstChild("Pisos")
	if not contenedor then
		contenedor = Instance.new("Folder")
		contenedor.Name = "Pisos"
		contenedor.Parent = Workspace
	end
	raiz.Parent = contenedor

	local numSalas = math.random(
		Config.SALAS_POR_PISO_MIN,
		Config.SALAS_POR_PISO_MAX
	)

	-- La primera sala siempre es especial (el nucleo del piso).
	local tipos: { string } = { "especial" }
	for i = 2, numSalas do
		local roll = math.random()
		if roll < 0.45 then
			table.insert(tipos, "habitacion")
		elseif roll < 0.8 then
			table.insert(tipos, "pasillo")
		else
			table.insert(tipos, "servicio")
		end
	end

	-- Colocamos las salas en una reticula en espiral simple.
	local posicionActual = Vector3.new(0, 0, 0)
	local direccion = 0 -- 0=+X, 1=+Z, 2=-X, 3=-Z
	local pasosEnFila = 0
	local longitudFila = 1

	for _, tipo in tipos do
		local piezas = Templates.obtener(tipo)
		construirSala(piezas, posicionActual, floorDef.paleta, raiz)

		-- Avanzamos a la siguiente celda.
		local offset = Config.TAMANO_SALA
		if direccion == 0 then
			posicionActual += Vector3.new(offset.X, 0, 0)
		elseif direccion == 1 then
			posicionActual += Vector3.new(0, 0, offset.Z)
		elseif direccion == 2 then
			posicionActual -= Vector3.new(offset.X, 0, 0)
		else
			posicionActual -= Vector3.new(0, 0, offset.Z)
		end

		pasosEnFila += 1
		if pasosEnFila >= longitudFila then
			pasosEnFila = 0
			direccion = (direccion + 1) % 4
			if direccion % 2 == 0 then
				longitudFila += 1
			end
		end
	end

	-- Niebla del piso (se aplica a Lighting y se restaura al terminar).
	raiz:SetAttribute("Niebla", floorDef.niebla and floorDef.niebla:ToHex() or "")
	raiz:SetAttribute("Gravedad", floorDef.gravedad)

	return raiz
end

-- Limpia todos los pisos generados (entre turnos).
function FloorGenerator.limpiar()
	local contenedor = Workspace:FindFirstChild("Pisos")
	if contenedor then
		contenedor:ClearAllChildren()
	end
end

-- Devuelve todos los spawns de tarea del piso.
function FloorGenerator.obtenerSpawns(raiz: Model): { BasePart }
	local spawns: { BasePart } = {}
	for _, obj in raiz:GetDescendants() do
		if obj:IsA("BasePart") and obj:GetAttribute("EsSpawnTarea") then
			table.insert(spawns, obj)
		end
	end
	return spawns
end

return FloorGenerator`,
  },
  {
    id: "rule-engine",
    name: "RuleEngine",
    path: "ServerScriptService/Core/RuleEngine",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 3,
    phase: "F2",
    description:
      "Asigna la regla del turno, recibe reportes de infracción desde cliente (validados en servidor) y aplica el castigo.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Core/RuleEngine
-- Asignacion y validacion de la regla del turno.
-- ============================================================

local Players = game:GetService("Players")

local Types = require(game.ReplicatedStorage.Shared.Types)
local RuleRegistry = require(game.ReplicatedStorage.Shared.RuleRegistry)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)

local RuleEngine = {}

local reglaActual: Types.RuleDef? = nil
-- Control anti-spam: ultima infraccion registrada por jugador.
local ultimaInfraccion: { [Player]: number } = {}
local COOLDOWN_INFRACCION = 5

function RuleEngine.asignar(excluirId: string?): Types.RuleDef
	reglaActual = RuleRegistry.sortear(excluirId)
	return reglaActual
end

function RuleEngine.actual(): Types.RuleDef?
	return reglaActual
end

function RuleEngine.limpiar()
	reglaActual = nil
	ultimaInfraccion = {}
end

-- El servidor reporta que un jugador rompio la regla.
function RuleEngine.romper(player: Player, motivo: string)
	if not reglaActual then return end

	local ahora = os.time()
	local ultima = ultimaInfraccion[player]
	if ultima and (ahora - ultima) < COOLDOWN_INFRACCION then
		return -- anti-spam
	end
	ultimaInfraccion[player] = ahora

	local folder = Remotes.obtener()
	local ev = folder:FindFirstChild("ReglaRompida")
	if ev and ev:IsA("RemoteEvent") then
		ev:FireAllClients(player, reglaActual, motivo)
	end

	-- Penalizacion: el hotel "resta propinas".
	-- (La economia la gestiona TipEconomy; aqui solo avisamos.)
	warn(
		"[RuleEngine] " .. player.Name .. " rompio la regla '"
		.. reglaActual.id .. "' (" .. motivo .. ")"
	)
end

-- Validacion de un reporte venido del cliente (anti-exploit):
-- solo aceptamos infracciones de reglas que existen y estan activas.
function RuleEngine.validarReporte(player: Player, reglaId: string): boolean
	if not reglaActual then return false end
	if reglaId ~= reglaActual.id then
		warn("[RuleEngine] Reporte invalido de " .. player.Name)
		return false
	end
	return true
end

return RuleEngine`,
  },
  {
    id: "role-manager",
    name: "RoleManager",
    path: "ServerScriptService/Core/RoleManager",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 3,
    phase: "F2",
    description:
      "Asigna un puesto de trabajo distinto a cada jugador del turno (Recepción, Limpieza, Mantenimiento, Botones).",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Core/RoleManager
-- Asignacion de roles de trabajo por turno.
-- ============================================================

local Types = require(game.ReplicatedStorage.Shared.Types)

local RoleManager = {}

local ROLES_DISPONIBLES: { Types.RoleId } = {
	"Recepcion",
	"Limpieza",
	"Mantenimiento",
	"Botones",
}

local asignaciones: { [Player]: Types.RoleId } = {}

-- Reparte roles sin repetir (si hay mas de 4 jugadores, recicla).
function RoleManager.asignarTurno(jugadores: { Player }): { [Player]: Types.RoleId }
	asignaciones = {}

	local pool = {}
	for _, rol in ROLES_DISPONIBLES do
		table.insert(pool, rol)
	end

	-- Barajamos el pool.
	for i = #pool, 2, -1 do
		local j = math.random(1, i)
		pool[i], pool[j] = pool[j], pool[i]
	end

	local idx = 1
	for _, player in jugadores do
		asignaciones[player] = pool[idx]
		idx += 1
		if idx > #pool then
			idx = 1 -- mas de 4 jugadores: reciclamos roles
		end
	end

	return asignaciones
end

function RoleManager.rolDe(player: Player): Types.RoleId?
	return asignaciones[player]
end

function RoleManager.cambiar(player: Player, nuevoRol: Types.RoleId): boolean
	-- Solo permitimos cambiar si nadie mas tiene ese rol.
	for otro, rol in asignaciones do
		if otro ~= player and rol == nuevoRol then
			return false -- rol ya ocupado
		end
	end
	asignaciones[player] = nuevoRol
	return true
end

function RoleManager.limpiar()
	asignaciones = {}
end

return RoleManager`,
  },
  {
    id: "tip-economy",
    name: "TipEconomy",
    path: "ServerScriptService/Core/TipEconomy",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 3,
    phase: "F2",
    description:
      "La economía de propinas: multiplicador por racha, conversión a reputación al fin del turno y persistencia.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Core/TipEconomy
-- Economia de propinas y reputacion.
-- ============================================================

local Config = require(game.ReplicatedStorage.Shared.Config)
local Types = require(game.ReplicatedStorage.Shared.Types)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)
local DataService = require(script.Parent.DataService)

local TipEconomy = {}

local propinas: { [Player]: number } = {}
local racha: { [Player]: number } = {}

local function notificar(player: Player)
	local folder = Remotes.obtener()
	local ev = folder:FindFirstChild("PropinasActualizadas")
	if ev and ev:IsA("RemoteEvent") then
		ev:FireClient(player, propinas[player] or 0, racha[player] or 0)
	end
end

function TipEconomy.empezarTurno(jugadores: { Player })
	for _, p in jugadores do
		propinas[p] = 0
		racha[p] = 0
	end
end

-- Una tarea completada con exito.
function TipEconomy.completarTarea(player: Player, bonus: number)
	racha[player] = math.min((racha[player] or 0) + 1, Config.RACHA_MAXIMA)
	local mult = Config.MULTIPLICADOR_RACHA ^ (racha[player] - 1)
	local ganancia = math.floor((Config.PROPINAS_POR_TAREA_BASE + bonus) * mult)
	propinas[player] = (propinas[player] or 0) + ganancia
	notificar(player)
	return ganancia
end

-- Una regla rota o un susto recibido: se pierde la racha.
function TipEconomy.perderRacha(player: Player)
	racha[player] = 0
	notificar(player)
end

-- Al terminar el turno: las propinas se convierten en reputacion.
function TipEconomy.cerrarTurno(jugadores: { Player }): { [Player]: number }
	local resumen: { [Player]: number } = {}
	for _, p in jugadores do
		local ganado = propinas[p] or 0
		resumen[p] = ganado

		local datos = DataService.obtener(p)
		datos.reputacion += ganado
		datos.propinas += ganado
		datos.turnosJugados += 1
		if (racha[p] or 0) > datos.mejorRacha then
			datos.mejorRacha = racha[p]
		end
		DataService.guardar(p)

		propinas[p] = nil
		racha[p] = nil
	end
	return resumen
end

function TipEconomy.obtener(player: Player): number
	return propinas[player] or 0
end

return TipEconomy`,
  },
  {
    id: "entity-manager",
    name: "EntityManager",
    path: "ServerScriptService/Entities/EntityManager",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 4,
    phase: "F2",
    description:
      "Spawnea las entidades del piso y dirige su comportamiento (patrulla, acecho, persecución) usando PathfindingService.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Entities/EntityManager
-- Spawneo y direccion de entidades (los "huespedes").
-- ============================================================

local PathfindingService = game:GetService("PathfindingService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Types = require(game.ReplicatedStorage.Shared.Types)
local Config = require(game.ReplicatedStorage.Shared.Config)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)

local EntityManager = {}

local entidadesActivas: { Model } = {}
local persiguiendo: { [Model]: Player? } = {}

-- Crea un "huesped" (un maniqui inquietante) en un punto del piso.
function EntityManager.spawnear(def: Types.EntityDef, posicion: Vector3, piso: Model): Model
	local modelo = Instance.new("Model")
	modelo.Name = def.nombre

	local cuerpo = Instance.new("Part")
	cuerpo.Name = "HumanoidRootPart"
	cuerpo.Size = Vector3.new(2, 5, 1.5)
	cuerpo.Anchored = true
	cuerpo.CanCollide = false
	cuerpo.Material = Enum.Material.SmoothPlastic
	cuerpo.Color = Color3.fromRGB(30, 30, 35)
	cuerpo.Position = posicion
	cuerpo.Parent = modelo
	modelo.PrimaryPart = cuerpo

	-- Ojos brillantes: la firma visual de que "no es un humano".
	local ojos = Instance.new("Part")
	ojos.Name = "Ojos"
	ojos.Size = Vector3.new(1.2, 0.4, 0.2)
	ojos.Anchored = true
	ojos.CanCollide = false
	ojos.Material = Enum.Material.Neon
	ojos.Color = Color3.fromRGB(255, 80, 80)
	ojos.Position = posicion + Vector3.new(0, 1.5, 0.8)
	ojos.Parent = modelo

	modelo.Parent = piso
	table.insert(entidadesActivas, modelo)
	persiguiendo[modelo] = nil
	return modelo
end

-- Mueve una entidad hacia un punto con Pathfinding.
local function moverA(entidad: Model, destino: Vector3, velocidad: number)
	local root = entidad.PrimaryPart
	if not root then return end

	local path = PathfindingService:CreatePath({
		AgentRadius = 2,
		AgentHeight = 5,
	})
	local ok = pcall(function()
		path:ComputeAsync(root.Position, destino)
	end)
	if not ok or path.Status ~= Enum.PathStatus.Success then
		return
	end

	for _, waypoint in path:GetWaypoints() do
		if not entidad.Parent then return end -- fue limpiada
		root.Position = Vector3.new(waypoint.Position.X, root.Position.Y, waypoint.Position.Z)
		task.wait(root.Position and (2 / velocidad) or 0.2)
	end
end

-- Busca el jugador mas cercano dentro del radio de deteccion.
local function jugadorCercano(entidad: Model): Player?
	local root = entidad.PrimaryPart
	if not root then return nil end

	local mejor: Player? = nil
	local mejorDist = Config.RADIO_DETECCION
	for _, p in Players:GetPlayers() do
		local char = p.Character
		if char and char.PrimaryPart then
			local dist = (char.PrimaryPart.Position - root.Position).Magnitude
			if dist < mejorDist then
				mejor = p
				mejorDist = dist
			end
		end
	end
	return mejor
end

-- Bucle de IA: patrulla -> detecta -> persigue -> asusta.
function EntityManager.iniciarIA(entidad: Model, def: Types.EntityDef, piso: Model)
	task.spawn(function()
		while entidad.Parent do
			local objetivo = jugadorCercano(entidad)
			if objetivo and objetivo.Character and objetivo.Character.PrimaryPart then
				-- Persecucion.
				persiguiendo[entidad] = objetivo
				moverA(
					entidad,
					objetivo.Character.PrimaryPart.Position,
					def.velocidad * 1.4
				)
				-- Si la alcanzo: susto.
				local root = entidad.PrimaryPart
				local charPart = objetivo.Character and objetivo.Character.PrimaryPart
				if root and charPart and (charPart.Position - root.Position).Magnitude < 5 then
					local folder = Remotes.obtener()
					local ev = folder:FindFirstChild("Susto")
					if ev and ev:IsA("RemoteEvent") then
						ev:FireClient(objetivo, "entidad", def.danioReputacion)
					end
					task.wait(3) -- pausa dramatica tras el susto
				end
			else
				-- Patrulla aleatoria dentro del piso.
				persiguiendo[entidad] = nil
				local origen = piso:GetBoundingBox().Position
				local destino = origen + Vector3.new(
					math.random(-40, 40), 0, math.random(-40, 40)
				)
				moverA(entidad, destino, def.velocidad)
			end
			task.wait(0.5)
		end
	end)
end

function EntityManager.limpiar()
	for _, e in entidadesActivas do
		if e.Parent then e:Destroy() end
	end
	entidadesActivas = {}
	persiguiendo = {}
end

return EntityManager`,
  },
  {
    id: "shift-manager",
    name: "ShiftManager",
    path: "ServerScriptService/Core/ShiftManager",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 4,
    phase: "F2",
    description:
      "La máquina de estados del turno: espera → generación de piso → turno activo (con apagón a mitad) → resumen y limpieza.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Core/ShiftManager
-- Maquina de estados del turno de trabajo.
-- ============================================================

local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local Workspace = game:GetService("Workspace")

local Types = require(game.ReplicatedStorage.Shared.Types)
local Config = require(game.ReplicatedStorage.Shared.Config)
local Remotes = require(game.ReplicatedStorage.Shared.Remotes)
local FloorRegistry = require(game.ReplicatedStorage.Shared.FloorRegistry)
local FloorGenerator = require(script.Parent.FloorGenerator)
local RuleEngine = require(script.Parent.RuleEngine)
local RoleManager = require(script.Parent.RoleManager)
local TipEconomy = require(script.Parent.TipEconomy)
local EntityManager = require(script.Parent.Parent.Entities.EntityManager)

local ShiftManager = {}

local turnoNumero = 0
local estadoActual = "esperando"

local function folderRemotes(): Folder
	return Remotes.obtener()
end

local function avisarTurnoIniciado(
	jugadores: { Player },
	floorDef: Types.FloorDef,
	regla: Types.RuleDef,
	roles: { [Player]: Types.RoleId }
)
	local ev = folderRemotes():FindFirstChild("TurnoIniciado")
	if not (ev and ev:IsA("RemoteEvent")) then return end
	for _, p in jugadores do
		ev:FireClient(p, floorDef, regla, roles[p])
	end
end

local function avisarApagon(activo: boolean)
	local ev = folderRemotes():FindFirstChild("Apagon")
	if ev and ev:IsA("RemoteEvent") then
		ev:FireAllClients(activo)
	end
end

-- Un turno completo. Bloquea hasta terminar.
function ShiftManager.ejecutarTurno(jugadores: { Player })
	if #jugadores == 0 then return end
	estadoActual = "activo"
	turnoNumero += 1

	-- 1. Generar piso + regla + roles.
	local floorDef = FloorRegistry.sortear()
	local piso = FloorGenerator.generar(floorDef)
	local regla = RuleEngine.asignar()
	local roles = RoleManager.asignarTurno(jugadores)

	-- Teletransportar jugadores al piso.
	local spawns = FloorGenerator.obtenerSpawns(piso)
	for i, p in jugadores do
		local char = p.Character
		if char and char.PrimaryPart and spawns[i] then
			char.PrimaryPart.CFrame = CFrame.new(spawns[i].Position + Vector3.new(0, 4, 0))
		end
	end

	-- Aplicar niebla y gravedad del piso.
	local nieblaHex = piso:GetAttribute("Niebla") :: string
	if nieblaHex ~= "" then
		Lighting.FogColor = Color3.fromHex(nieblaHex)
		Lighting.FogEnd = 120
	end
	Workspace.Gravity = 196.2 * (piso:GetAttribute("Gravedad") :: number or 1)

	-- 2. Spawner de entidades del piso.
	for _, entId in floorDef.entidades do
		-- (aqui se mapearia entId -> EntityDef; simplificamos)
	end

	TipEconomy.empezarTurno(jugadores)
	avisarTurnoIniciado(jugadores, floorDef, regla, roles)

	-- 3. Duracion del turno, con un apagon a mitad.
	local mitad = Config.DURACION_TURNO / 2
	local transcurrido = 0
	while transcurrido < Config.DURACION_TURNO and estadoActual == "activo" do
		task.wait(1)
		transcurrido += 1

		-- Apagon a mitad del turno.
		if transcurrido == math.floor(mitad) then
			avisarApagon(true)
			Lighting.Brightness = 0.2
			task.wait(Config.DURACION_APAGON)
			avisarApagon(false)
			Lighting.Brightness = 2
		end
	end

	-- 4. Cierre: resumen, economia, limpieza.
	local resumen = TipEconomy.cerrarTurno(jugadores)
	local ev = folderRemotes():FindFirstChild("TurnoTerminado")
	if ev and ev:IsA("RemoteEvent") then
		for p, ganado in resumen do
			ev:FireClient(p, {
				piso = floorDef.codigo,
				propinas = ganado,
			})
		end
	end

	FloorGenerator.limpiar()
	EntityManager.limpiar()
	RuleEngine.limpiar()
	RoleManager.limpiar()
	Lighting.FogEnd = 100000
	Workspace.Gravity = 196.2
	estadoActual = "esperando"
end

-- Bucle principal: espera jugadores y lanza turnos.
function ShiftManager.iniciar()
	task.spawn(function()
		while true do
			-- Esperar a que haya al menos 1 jugador.
			while #Players:GetPlayers() == 0 do
				task.wait(2)
			end

			-- Cuenta atras en lobby.
			task.wait(Config.SEGUNDOS_ENTRE_TURNOS)

			local jugadores = Players:GetPlayers()
			ShiftManager.ejecutarTurno(jugadores)
		end
	end)
end

return ShiftManager`,
  },
  {
    id: "shop-service",
    name: "ShopService",
    path: "ServerScriptService/Core/ShopService",
    kind: "ModuleScript",
    folder: "Servidor",
    week: 5,
    phase: "F3",
    description:
      "Monetización con MarketplaceService: gamepasses (compra única) y dev products (revivir). Siempre validado en servidor.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/Core/ShopService
-- Gamepasses y dev products. Autoritativo en servidor.
-- ============================================================

local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")

local Config = require(game.ReplicatedStorage.Shared.Config)
local DataService = require(script.Parent.DataService)

local ShopService = {}

-- Ids reales (poner los creados en el Creator Dashboard).
local PASS_LLAVE_MAESTRA = 0  -- TODO: sustituir por id real
local PRODUCTO_REVIVIR   = 0  -- TODO: sustituir por id real

-- ---------- Gamepasses ----------
function ShopService.tienePase(player: Player, paseId: number): boolean
	local ok, posee = pcall(function()
		return MarketplaceService:UserOwnsGamePassAsync(player.UserId, paseId)
	end)
	return ok and posee == true
end

-- ---------- Dev products (revivir) ----------
MarketplaceService.ProcessReceipt = function(receiptInfo)
	local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
	if not player then
		-- Jugador se fue antes de procesar: REINTENTAR mas tarde.
		return Enum.ProductPurchaseDecision.NotProcessedYet
	end

	if receiptInfo.ProductId == PRODUCTO_REVIVIR then
		-- Revivir: el ShiftManager escuchara este evento para reanudar.
		local ev = game.ReplicatedStorage:WaitForChild("Remotes"):FindFirstChild("Revivido")
		if ev and ev:IsA("RemoteEvent") then
			ev:FireClient(player, true)
		end
		return Enum.ProductPurchaseDecision.PurchaseGranted
	end

	return Enum.ProductPurchaseDecision.PurchaseFailed
end

-- ---------- API para el cliente ----------
local function instalarFunciones()
	local remotes = game.ReplicatedStorage:WaitForChild("Remotes")

	local fnRevivir = Instance.new("RemoteFunction")
	fnRevivir.Name = "SolicitarRevivir"
	fnRevivir.Parent = remotes

	fnRevivir.OnServerInvoke = function(player)
		-- PromptProductPurchase lanza el dialogo de Robux de Roblox.
		MarketplaceService:PromptProductPurchase(player, PRODUCTO_REVIVIR)
		return true
	end

	local fnDatos = remotes:FindFirstChild("ObtenerDatosJugador")
	if fnDatos and fnDatos:IsA("RemoteFunction") then
		fnDatos.OnServerInvoke = function(player)
			return DataService.obtener(player)
		end
	end
end

function ShopService.iniciar()
	instalarFunciones()

	-- Cuando un jugador entra con la Llave Maestra, avisamos.
	Players.PlayerAdded:Connect(function(player)
		if ShopService.tienePase(player, PASS_LLAVE_MAESTRA) then
			local datos = DataService.obtener(player)
			table.insert(datos.llaves, "llave_maestra")
		end
	end)
end

return ShopService`,
  },
  {
    id: "game-server",
    name: "GameServer",
    path: "ServerScriptService/GameServer",
    kind: "Script",
    folder: "Servidor",
    week: 5,
    phase: "F3",
    description:
      "El Script raíz del servidor. Arranca todos los servicios en orden y cablea los eventos del cliente.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · ServerScriptService/GameServer
-- Punto de entrada del servidor.
-- ============================================================

local Players = game:GetService("Players")

local ServerScriptService = game:GetService("ServerScriptService")

local Remotes       = require(game.ReplicatedStorage.Shared.Remotes)
local DataService   = require(ServerScriptService.Core.DataService)
local ShiftManager  = require(ServerScriptService.Core.ShiftManager)
local RoleManager   = require(ServerScriptService.Core.RoleManager)
local RuleEngine    = require(ServerScriptService.Core.RuleEngine)
local TipEconomy    = require(ServerScriptService.Core.TipEconomy)
local ShopService   = require(ServerScriptService.Core.ShopService)

-- 1. Instalar el contrato de red.
local folder = Remotes.instalar()

-- 2. Arrancar servicios.
ShopService.iniciar()
ShiftManager.iniciar()

-- 3. Cargar datos al entrar.
Players.PlayerAdded:Connect(function(player)
	DataService.cargar(player)
end)

-- Para jugadores que ya estaban (Studio / rejoin rapido).
for _, player in Players:GetPlayers() do
	DataService.cargar(player)
end

-- 4. Cablear eventos cliente -> servidor (siempre validando).
local evTarea = folder:FindFirstChild("TareaCompletada")
if evTarea and evTarea:IsA("RemoteEvent") then
	evTarea.OnServerEvent:Connect(function(player, tareaId)
		-- Validacion minima: la tarea debe ser un string conocido.
		if type(tareaId) ~= "string" then return end
		local rol = RoleManager.rolDe(player)
		-- Cada tarea pertenece a un rol; aqui validamos que coincida.
		TipEconomy.completarTarea(player, 0)
	end)
end

local evSaludo = folder:FindFirstChild("SaludoEnviado")
if evSaludo and evSaludo:IsA("RemoteEvent") then
	evSaludo.OnServerEvent:Connect(function(player, huespedId)
		-- Saludar a un huesped cuenta como micro-tarea.
		local regla = RuleEngine.actual()
		if regla and regla.id == "saluda" then
			TipEconomy.completarTarea(player, 2)
		end
	end)
end

local evCambiarRol = folder:FindFirstChild("CambiarRol")
if evCambiarRol and evCambiarRol:IsA("RemoteEvent") then
	evCambiarRol.OnServerEvent:Connect(function(player, rolId)
		if type(rolId) ~= "string" then return end
		RoleManager.cambiar(player, rolId :: any)
	end)
end

print("[HotelInfinito] Servidor iniciado. Bienvenido al turno de noche.")`,
  },
];
