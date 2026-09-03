import type { LuauFile } from "./codebase-types";

export const clientFiles: LuauFile[] = [
  {
    id: "client-main",
    name: "ClientMain",
    path: "StarterPlayer/StarterPlayerScripts/ClientMain",
    kind: "LocalScript",
    folder: "Cliente",
    week: 9,
    phase: "F4",
    description:
      "Punto de entrada del cliente. Espera los remotes, carga los datos del jugador y arranca los controladores de UI.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · StarterPlayerScripts/ClientMain
-- Punto de entrada del cliente.
-- ============================================================

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild("Remotes")

local HUDController = require(script.UI.HUDController)
local TaskController = require(script.Input.TaskController)
local ScareController = require(script.Effects.ScareController)
local ShopUI = require(script.UI.ShopUI)

-- 1. Cargar datos del jugador desde el servidor.
local fnDatos = remotes:WaitForChild("ObtenerDatosJugador")
local datos = fnDatos:InvokeServer()
print("[Cliente] Datos cargados. Reputacion: " .. tostring(datos.reputacion))

-- 2. Arrancar controladores.
HUDController.iniciar(datos)
TaskController.iniciar()
ScareController.iniciar()
ShopUI.iniciar()

-- 3. Escuchar eventos del servidor.
local evTurno = remotes:WaitForChild("TurnoIniciado")
evTurno.OnClientEvent:Connect(function(floorDef, regla, rol)
	HUDController.mostrarTurno(floorDef, regla, rol)
	TaskController.activarTurno(floorDef)
end)

local evFin = remotes:WaitForChild("TurnoTerminado")
evFin.OnClientEvent:Connect(function(resumen)
	HUDController.mostrarResumen(resumen)
	TaskController.desactivar()
end)

local evApagon = remotes:WaitForChild("Apagon")
evApagon.OnClientEvent:Connect(function(activo)
	ScareController.apagon(activo)
end)

local evPropinas = remotes:WaitForChild("PropinasActualizadas")
evPropinas.OnClientEvent:Connect(function(propinas, racha)
	HUDController.actualizarPropinas(propinas, racha)
end)

print("[Cliente] Hotel Infinito listo. Que tengas buen turno.")`,
  },
  {
    id: "hud-controller",
    name: "HUDController",
    path: "StarterPlayer/StarterPlayerScripts/UI/HUDController",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 10,
    phase: "F4",
    description:
      "Construye la interfaz del jugador: panel de turno, contador de propinas, racha y pantalla de resumen. Todo con ScreenGui.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · UI/HUDController
-- Interfaz del jugador (ScreenGui construida por codigo).
-- ============================================================

local Players = game:GetService("Players")
local player = Players.LocalPlayer

local HUDController = {}

local gui: ScreenGui? = nil
local labelPropinas: TextLabel? = nil
local labelRacha: TextLabel? = nil
local panelTurno: Frame? = nil

local function crearLabel(nombre: string, texto: string, pos: UDim2, tam: UDim2): TextLabel
	local label = Instance.new("TextLabel")
	label.Name = nombre
	label.Text = texto
	label.Position = pos
	label.Size = tam
	label.BackgroundTransparency = 0.3
	label.BackgroundColor3 = Color3.fromRGB(10, 12, 18)
	label.TextColor3 = Color3.fromRGB(255, 160, 47)
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.BorderSizePixel = 0
	return label
end

function HUDController.iniciar(datos)
	gui = Instance.new("ScreenGui")
	gui.Name = "HotelHUD"
	gui.ResetOnSpawn = false
	gui.Parent = player:WaitForChild("PlayerGui")

	-- Contador de propinas (arriba a la derecha).
	labelPropinas = crearLabel(
		"Propinas",
		"PROPINAS: 0",
		UDim2.new(1, -220, 0, 10),
		UDim2.new(0, 210, 0, 44)
	)
	labelPropinas.Parent = gui

	-- Contador de racha.
	labelRacha = crearLabel(
		"Racha",
		"RACHA x0",
		UDim2.new(1, -220, 0, 60),
		UDim2.new(0, 210, 0, 32)
	)
	labelRacha.TextColor3 = Color3.fromRGB(168, 230, 60)
	labelRacha.Parent = gui

	-- Panel del turno (arriba a la izquierda): piso + regla + rol.
	panelTurno = Instance.new("Frame")
	panelTurno.Name = "PanelTurno"
	panelTurno.Position = UDim2.new(0, 10, 0, 10)
	panelTurno.Size = UDim2.new(0, 340, 0, 90)
	panelTurno.BackgroundColor3 = Color3.fromRGB(10, 12, 18)
	panelTurno.BackgroundTransparency = 0.3
	panelTurno.BorderSizePixel = 0
	panelTurno.Visible = false
	panelTurno.Parent = gui

	local titulo = crearLabel("Titulo", "—", UDim2.new(0, 8, 0, 6), UDim2.new(1, -16, 0, 26))
	titulo.TextXAlignment = Enum.TextXAlignment.Left
	titulo.Parent = panelTurno

	local regla = crearLabel("Regla", "—", UDim2.new(0, 8, 0, 34), UDim2.new(1, -16, 0, 22))
	regla.TextXAlignment = Enum.TextXAlignment.Left
	regla.TextColor3 = Color3.fromRGB(56, 225, 212)
	regla.Parent = panelTurno

	local rol = crearLabel("Rol", "—", UDim2.new(0, 8, 0, 58), UDim2.new(1, -16, 0, 22))
	rol.TextXAlignment = Enum.TextXAlignment.Left
	rol.TextColor3 = Color3.fromRGB(233, 241, 252)
	rol.Parent = panelTurno
end

function HUDController.mostrarTurno(floorDef, regla, rol)
	if not panelTurno then return end
	local titulo = panelTurno:FindFirstChild("Titulo") :: TextLabel
	local labelRegla = panelTurno:FindFirstChild("Regla") :: TextLabel
	local labelRol = panelTurno:FindFirstChild("Rol") :: TextLabel

	titulo.Text = floorDef.codigo .. " · " .. floorDef.nombre
	labelRegla.Text = "REGLA: " .. regla.texto
	labelRol.Text = "TU PUESTO: " .. tostring(rol)
	panelTurno.Visible = true
end

function HUDController.actualizarPropinas(propinas: number, racha: number)
	if labelPropinas then
		labelPropinas.Text = "PROPINAS: " .. propinas
	end
	if labelRacha then
		labelRacha.Text = "RACHA x" .. racha
	end
end

function HUDController.mostrarResumen(resumen)
	if not gui then return end
	local panel = Instance.new("Frame")
	panel.Name = "Resumen"
	panel.Position = UDim2.new(0.5, -160, 0.5, -90)
	panel.Size = UDim2.new(0, 320, 0, 180)
	panel.BackgroundColor3 = Color3.fromRGB(10, 12, 18)
	panel.BackgroundTransparency = 0.15
	panel.BorderSizePixel = 0
	panel.Parent = gui

	local texto = Instance.new("TextLabel")
	texto.Size = UDim2.new(1, -20, 1, -60)
	texto.Position = UDim2.new(0, 10, 0, 10)
	texto.BackgroundTransparency = 1
	texto.TextColor3 = Color3.fromRGB(255, 160, 47)
	texto.Font = Enum.Font.GothamBold
	texto.TextScaled = true
	texto.Text = "FIN DEL TURNO\\nPiso " .. resumen.piso .. "\\nPropinas: +" .. resumen.propinas
	texto.Parent = panel

	-- Se cierra solo a los 6 segundos.
	task.delay(6, function()
		panel:Destroy()
	end)
end

return HUDController`,
  },
  {
    id: "task-controller",
    name: "TaskController",
    path: "StarterPlayer/StarterPlayerScripts/Input/TaskController",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 10,
    phase: "F4",
    description:
      "Convierte los spawns de tarea del piso en ProximityPrompts ('E' para trabajar) y reporta la tarea completada al servidor.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Input/TaskController
-- Interaccion con tareas via ProximityPrompt.
-- ============================================================

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild("Remotes")

local TaskController = {}

local turnoActivo = false
local promptsCreados: { ProximityPrompt } = {}

-- Lista de tareas simples (nombre -> duracion en segundos).
local TAREAS = {
	"Hacer la cama",
	"Barrer el pasillo",
	"Cambiar bombilla",
	"Llevar equipaje",
	"Limpiar el mostrador",
}

local function crearPrompt(spawn: BasePart)
	local prompt = Instance.new("ProximityPrompt")
	prompt.ObjectText = "Tarea"
	prompt.ActionText = TAREAS[math.random(1, #TAREAS)]
	prompt.HoldDuration = 1.5
	prompt.MaxActivationDistance = 8
	prompt.RequiresLineOfSight = false
	prompt.Parent = spawn

	prompt.Triggered:Connect(function(triggerPlayer)
		if triggerPlayer ~= player or not turnoActivo then return end
		-- Avisamos al servidor (el valida y da la recompensa).
		local ev = remotes:FindFirstChild("TareaCompletada")
		if ev and ev:IsA("RemoteEvent") then
			ev:FireServer(prompt.ActionText)
		end
		prompt:Destroy()
	end)

	table.insert(promptsCreados, prompt)
end

function TaskController.iniciar()
	-- Nada que hacer hasta que empiece un turno.
end

function TaskController.activarTurno(_floorDef)
	turnoActivo = true

	-- Buscamos los spawns de tarea del piso generado.
	local pisos = Workspace:FindFirstChild("Pisos")
	if not pisos then return end

	for _, piso in pisos:GetChildren() do
		for _, obj in piso:GetDescendants() do
			if obj:IsA("BasePart") and obj:GetAttribute("EsSpawnTarea") then
				crearPrompt(obj)
			end
		end
	end
end

function TaskController.desactivar()
	turnoActivo = false
	for _, p in promptsCreados do
		if p.Parent then p:Destroy() end
	end
	promptsCreados = {}
end

return TaskController`,
  },
  {
    id: "scare-controller",
    name: "ScareController",
    path: "StarterPlayer/StarterPlayerScripts/Effects/ScareController",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 11,
    phase: "F4",
    description:
      "Los sustos y el apagón: sacudida de cámara, viñeta roja, parpadeo de luces y sonido. El 'terror que da risa'.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/ScareController
-- Efectos de susto y apagon (camara + pantalla).
-- ============================================================

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local remotes = ReplicatedStorage:WaitForChild("Remotes")
local camara = Workspace.CurrentCamera

local ScareController = {}

local viñeta: Frame? = nil
local sacudiendo = false

local function crearViñeta()
	local gui = player:WaitForChild("PlayerGui"):FindFirstChild("HotelHUD")
	if not gui then return end
	viñeta = Instance.new("Frame")
	viñeta.Name = "Vineta"
	viñeta.Size = UDim2.new(1, 0, 1, 0)
	viñeta.BackgroundTransparency = 1
	viñeta.BorderSizePixel = 0
	viñeta.ZIndex = 10
	viñeta.Parent = gui

	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(180, 20, 20)
	stroke.Thickness = 40
	stroke.Transparency = 1
	stroke.Parent = viñeta
end

-- Sacudida de camara durante 'duracion' segundos.
local function sacudirCamara(duracion: number, intensidad: number)
	if sacudiendo then return end
	sacudiendo = true

	local t0 = tick()
	local conn
	conn = RunService.RenderStepped:Connect(function()
		local elapsed = tick() - t0
		if elapsed > duracion then
			conn:Disconnect()
			sacudiendo = false
			return
		end
		-- Amortiguamos con el tiempo para que termine suave.
		local decaimiento = 1 - (elapsed / duracion)
		camara.CFrame = camara.CFrame * CFrame.new(
			(math.random() - 0.5) * intensidad * decaimiento,
			(math.random() - 0.5) * intensidad * decaimiento,
			0
		)
	end)
end

function ScareController.iniciar()
	crearViñeta()

	local evSusto = remotes:WaitForChild("Susto")
	evSusto.OnClientEvent:Connect(function(tipo, intensidad)
		-- Flash rojo de la viñeta.
		if viñeta then
			local stroke = viñeta:FindFirstChildOfClass("UIStroke")
			if stroke then
				stroke.Transparency = 0.2
				TweenService:Create(
					stroke,
					TweenInfo.new(0.8),
					{ Transparency = 1 }
				):Play()
			end
		end
		sacudirCamara(0.6, 0.5)
	end)
end

function ScareController.apagon(activo: boolean)
	-- Parpadeo de "se va la luz" + musica de tension.
	if activo then
		sacudirCamara(0.4, 0.25)
	end
	-- El cambio real de brillo lo hace el servidor en Lighting.
end

return ScareController`,
  },
  {
    id: "shop-ui",
    name: "ShopUI",
    path: "StarterPlayer/StarterPlayerScripts/UI/ShopUI",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 11,
    phase: "F4",
    description:
      "El botón de la tienda y el diálogo de compra. El pago siempre lo gestiona Roblox (PromptPurchase), nunca el juego.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · UI/ShopUI
-- Boton de tienda + prompts de compra.
-- ============================================================

local Players = game:GetService("Players")
local MarketplaceService = game:GetService("MarketplaceService")

local player = Players.LocalPlayer

local ShopUI = {}

-- Ids reales de gamepasses (poner los del Creator Dashboard).
local PASES = {
	{ id = 0, nombre = "Llave Maestra",  precio = "R$ 199" },
	{ id = 0, nombre = "Uniforme Dorado", precio = "R$ 349" },
}

function ShopUI.iniciar()
	local gui = player:WaitForChild("PlayerGui"):FindFirstChild("HotelHUD")
	if not gui then return end

	local boton = Instance.new("TextButton")
	boton.Name = "BotonTienda"
	boton.Text = "TIENDA"
	boton.Position = UDim2.new(0.5, -60, 1, -54)
	boton.Size = UDim2.new(0, 120, 0, 44)
	boton.BackgroundColor3 = Color3.fromRGB(255, 160, 47)
	boton.TextColor3 = Color3.fromRGB(10, 12, 18)
	boton.Font = Enum.Font.GothamBold
	boton.TextScaled = true
	boton.BorderSizePixel = 0
	boton.Parent = gui

	boton.MouseButton1Click:Connect(function()
		-- Abrimos la tienda: pedimos el primer pase como ejemplo.
		-- En produccion aqui se abre un frame con la lista completa.
		if PASES[1] and PASES[1].id ~= 0 then
			MarketplaceService:PromptGamePassPurchase(player, PASES[1].id)
		end
	end)
end

return ShopUI`,
  },
];
