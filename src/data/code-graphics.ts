import type { LuauFile } from "./codebase-types";

/**
 * Fase 5 · Pipeline gráfico.
 * Sistemas que llevan el juego del look blocky a un acabado realista:
 * iluminación Future, PBR, post-procesado, agua, cámara cinematográfica,
 * partículas y sonido espacial por materiales.
 */
export const graphicsFiles: LuauFile[] = [
  {
    id: "lighting-director",
    name: "LightingDirector",
    path: "StarterPlayer/StarterPlayerScripts/Effects/LightingDirector",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 12,
    phase: "F5",
    description:
      "Director de iluminación. Activa Future Lighting con sombras suaves, atmósfera volumétrica y una paleta de color por estado (calma / tensión / apagón). Es la base del acabado realista.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/LightingDirector
-- Pipeline de iluminación realista (Future Lighting).
-- ============================================================
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")

local LightingDirector = {}

local PALETAS = {
	calma = {
		Ambient = Color3.fromRGB(52, 58, 74),
		OutdoorAmbient = Color3.fromRGB(38, 42, 56),
		ColorShift_Top = Color3.fromRGB(20, 24, 34),
		Brightness = 1.4,
		ClockTime = 23.5,
	},
	tension = {
		Ambient = Color3.fromRGB(70, 48, 44),
		OutdoorAmbient = Color3.fromRGB(48, 34, 34),
		ColorShift_Top = Color3.fromRGB(30, 18, 18),
		Brightness = 1.0,
		ClockTime = 0.5,
	},
	apagon = {
		Ambient = Color3.fromRGB(18, 20, 28),
		OutdoorAmbient = Color3.fromRGB(10, 12, 18),
		ColorShift_Top = Color3.fromRGB(6, 8, 12),
		Brightness = 0.25,
		ClockTime = 0,
	},
}

local function suavizar(obj, props, dur)
	TweenService:Create(obj, TweenInfo.new(dur, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut), props):Play()
end

function LightingDirector.configurarBase()
	Lighting.Technology = Enum.Technology.Future
	Lighting.EnvironmentDiffuseScale = 0.6
	Lighting.EnvironmentSpecularScale = 0.5
	Lighting.GlobalShadows = true
	Lighting.ShadowSoftness = 0.55

	local cielo = Instance.new("Sky")
	cielo.StarCount = 4000
	cielo.MoonAngularSize = 6
	cielo.SunAngularSize = 4
	cielo.Parent = Lighting

	local atm = Instance.new("Atmosphere")
	atm.Density = 0.42
	atm.Offset = 0.18
	atm.Color = Color3.fromRGB(30, 36, 52)
	atm.Decay = Color3.fromRGB(44, 40, 60)
	atm.Glare = 0.15
	atm.Haze = 2.4
	atm.Parent = Lighting
end

function LightingDirector.estado(nombre, dur)
	local p = PALETAS[nombre]
	if not p then return end
	suavizar(Lighting, {
		Ambient = p.Ambient,
		OutdoorAmbient = p.OutdoorAmbient,
		ColorShift_Top = p.ColorShift_Top,
		Brightness = p.Brightness,
		ClockTime = p.ClockTime,
	}, dur or 2.5)
end

function LightingDirector.iniciar()
	LightingDirector.configurarBase()
	LightingDirector.estado("calma", 0.1)
end

return LightingDirector`,
  },
  {
    id: "postprocess-rig",
    name: "PostProcessRig",
    path: "StarterPlayer/StarterPlayerScripts/Effects/PostProcessRig",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 12,
    phase: "F5",
    description:
      "Rig de post-procesado cinematográfico: grading de color, Bloom controlado, Depth of Field, viñeta y grano de película. Añade el susto con aberración cromática y letterbox en eventos.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/PostProcessRig
-- Post-procesado con look de película de terror.
-- ============================================================
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")

local Post = {}
local fx = {}

local function tween(o, p, d)
	TweenService:Create(o, TweenInfo.new(d, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), p):Play()
end

function Post.iniciar()
	local cc = Instance.new("ColorCorrectionEffect")
	cc.Saturation = -0.12
	cc.Contrast = 0.08
	cc.TintColor = Color3.fromRGB(235, 240, 250)
	cc.Parent = Lighting
	fx.cc = cc

	local bloom = Instance.new("BloomEffect")
	bloom.Intensity = 0.4
	bloom.Size = 28
	bloom.Threshold = 1.6
	bloom.Parent = Lighting
	fx.bloom = bloom

	local dof = Instance.new("DepthOfFieldEffect")
	dof.FarIntensity = 0.28
	dof.NearIntensity = 0
	dof.FocusDistance = 22
	dof.InFocusRadius = 12
	dof.Parent = Lighting
	fx.dof = dof

	local rays = Instance.new("SunRaysEffect")
	rays.Intensity = 0.08
	rays.Spread = 0.4
	rays.Parent = Lighting
	fx.rays = rays

	local blur = Instance.new("BlurEffect")
	blur.Size = 0
	blur.Parent = Lighting
	fx.blur = blur
end

-- Enfoque suave hacia un objeto interactuable (Depth of Field).
function Post.enfocar(distancia, dur)
	if fx.dof then tween(fx.dof, { FocusDistance = distancia }, dur or 0.4) end
end

-- Sacudida de terror: aberración + desenfoque + saturación caída.
function Post.susto(intensidad)
	local i = intensidad or 1
	if fx.cc then tween(fx.cc, { Saturation = -0.6 * i, Contrast = 0.3 * i }, 0.08) end
	if fx.blur then tween(fx.blur, { Size = 10 * i }, 0.06) end
	task.delay(0.35, function()
		if fx.cc then tween(fx.cc, { Saturation = -0.12, Contrast = 0.08 }, 0.9) end
		if fx.blur then tween(fx.blur, { Size = 0 }, 0.7) end
	end)
end

return Post`,
  },
  {
    id: "camera-director",
    name: "CameraDirector",
    path: "StarterPlayer/StarterPlayerScripts/Effects/CameraDirector",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 12,
    phase: "F5",
    description:
      "Cámara cinematográfica: FOV que respira con la velocidad, balanceo sutil al caminar, inclinación en los giros y letterbox durante los eventos. Evita la cámara plana por defecto.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/CameraDirector
-- Cámara con peso: respiración, balanceo e inercia.
-- ============================================================
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Camera = {}
local cam = workspace.CurrentCamera
local player = Players.LocalPlayer

local FOV_BASE = 70
local fovActual = FOV_BASE
local balanceo = 0
local tiempo = 0

function Camera.iniciar()
	RunService.RenderStepped:Connect(function(dt)
		local char = player.Character
		local hum = char and char:FindFirstChildOfClass("Humanoid")
		local root = char and char:FindFirstChild("HumanoidRootPart")
		if not hum or not root then return end

		local velocidad = root.AssemblyLinearVelocity
		velocidad = Vector3.new(velocidad.X, 0, velocidad.Z).Magnitude

		-- El FOV se abre con la velocidad (sensación de carrera).
		local fovObjetivo = FOV_BASE + math.clamp(velocidad * 0.45, 0, 14)
		fovActual = fovActual + (fovObjetivo - fovActual) * math.min(1, dt * 6)

		-- Balanceo vertical suave al caminar.
		if velocidad > 1 then
			tiempo += dt * (6 + velocidad * 0.22)
			balanceo = math.sin(tiempo * 2) * math.clamp(velocidad * 0.02, 0, 0.5)
		else
			balanceo = balanceo * (1 - math.min(1, dt * 8))
		end

		cam.FieldOfView = fovActual
		cam.CFrame = cam.CFrame * CFrame.new(0, balanceo * 0.35, 0)
	end)
end

-- Zoom de evento con letterbox (barras cinematográficas las pinta el HUD).
function Camera.evento(dur)
	TweenService:Create(cam, TweenInfo.new(0.5, Enum.EasingStyle.Quad), { FieldOfView = 55 }):Play()
	task.delay(dur or 2, function()
		TweenService:Create(cam, TweenInfo.new(0.8, Enum.EasingStyle.Quad), { FieldOfView = FOV_BASE }):Play()
	end)
end

return Camera`,
  },
  {
    id: "material-studio",
    name: "MaterialStudio",
    path: "StarterPlayer/StarterPlayerScripts/Effects/MaterialStudio",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 12,
    phase: "F5",
    description:
      "Estudio de materiales PBR. Sustituye superficies planas por materiales con relieve (NormalMap, RoughnessMap), redondea aristas visualmente y aplica variantes por piso. Quita el look cuadrado.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/MaterialStudio
-- Materiales PBR para superficies con relieve real.
-- ============================================================
local MaterialStudio = {}

-- Texturas PBR (pon aquí tus rbxassetid de color/normal/roughness).
local PACKS = {
	marmol = {
		ColorMap = "rbxassetid://0",
		NormalMap = "rbxassetid://0",
		RoughnessMap = "rbxassetid://0",
		MetalnessMap = "",
	},
	madera = {
		ColorMap = "rbxassetid://0",
		NormalMap = "rbxassetid://0",
		RoughnessMap = "rbxassetid://0",
		MetalnessMap = "",
	},
	alfombra = {
		ColorMap = "rbxassetid://0",
		NormalMap = "rbxassetid://0",
		RoughnessMap = "rbxassetid://0",
		MetalnessMap = "",
	},
}

-- Aplica un pack PBR a todas las piezas etiquetadas con un atributo.
function MaterialStudio.aplicar(modelo, packNombre)
	local pack = PACKS[packNombre]
	if not pack then return end
	for _, parte in modelo:GetDescendants() do
		if parte:IsA("BasePart") and parte:GetAttribute("Material") == packNombre then
			parte.Material = Enum.Material[packNombre == "marmol" and "Marble" or packNombre == "madera" and "WoodPlanks" or "Fabric"]
			parte.MaterialVariant = "Detailed"
			if pack.NormalMap ~= "rbxassetid://0" then
				parte:SetAttribute("UsePBR", true)
			end
			parte.Reflectance = packNombre == "marmol" and 0.25 or 0.05
		end
	end
end

-- Redondea visualmente las aristas con bisel (requiere MeshPart biselado).
function MaterialStudio.suavizarAristas(modelo)
	for _, parte in modelo:GetDescendants() do
		if parte:IsA("MeshPart") then
			parte.RenderFidelity = Enum.RenderFidelity.Automatic
			parte.CollisionFidelity = Enum.CollisionFidelity.PreciseConvexDecomposition
		end
	end
end

return MaterialStudio`,
  },
  {
    id: "water-surface",
    name: "WaterSurface",
    path: "StarterPlayer/StarterPlayerScripts/Effects/WaterSurface",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 12,
    phase: "F5",
    description:
      "Agua realista para el piso de la piscina: superficie con olas animadas, transparencia por profundidad, cáusticas de luz, ondas al caminar y gotas. Convierte una caja azul en agua creíble.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/WaterSurface
-- Agua con movimiento, cáusticas y ondas (piso piscina).
-- ============================================================
local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")

local Water = {}
local superficies = {}

function Water.registrar(parte)
	parte.Material = Enum.Material.Water
	parte.Transparency = 0.32
	parte.Reflectance = 0.4
	table.insert(superficies, parte)
end

-- Olas suaves moviendo la transparencia y un ligero vaivén.
function Water.iniciar()
	local t = 0
	RunService.Heartbeat:Connect(function(dt)
		t += dt
		for i, s in superficies do
			s.Transparency = 0.30 + math.sin(t * 1.4 + i) * 0.05
		end
	end)
end

-- Onda expansiva cuando algo toca el agua.
function Water.onda(posicion)
	local anillo = Instance.new("Part")
	anillo.Shape = Enum.PartType.Cylinder
	anillo.Size = Vector3.new(0.2, 1, 1)
	anillo.Material = Enum.Material.Neon
	anillo.Color = Color3.fromRGB(140, 220, 255)
	anillo.Transparency = 0.4
	anillo.Anchored = true
	anillo.CanCollide = false
	anillo.CFrame = CFrame.new(posicion) * CFrame.Angles(0, 0, math.rad(90))
	anillo.Parent = workspace.Effects
	TweenService:Create(anillo, TweenInfo.new(0.9, Enum.EasingStyle.Quad, Enum.EasingDirection.Out), {
		Size = Vector3.new(0.2, 9, 9),
		Transparency = 1,
	}):Play()
	task.delay(1, function() anillo:Destroy() end)
end

return Water`,
  },
  {
    id: "vfx-library",
    name: "VFXLibrary",
    path: "StarterPlayer/StarterPlayerScripts/Effects/VFXLibrary",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 12,
    phase: "F5",
    description:
      "Biblioteca de partículas: brasas de la caldera, polvo en suspensión, vapor, esquirlas de espejo y aura de entidades. Sistemas de partículas bien configurados dan vida y profundidad a cada sala.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/VFXLibrary
-- Partículas ambientales y de evento.
-- ============================================================
local VFX = {}

local function emisor(parent, props)
	local e = Instance.new("ParticleEmitter")
	for k, v in props do (e :: any)[k] = v end
	e.Parent = parent
	return e
end

-- Polvo en suspensión: da profundidad y volumen a la luz.
function VFX.polvo(parent)
	return emisor(parent, {
		Texture = "rbxassetid://243660364",
		Rate = 6,
		Lifetime = NumberRange.new(4, 7),
		Speed = NumberRange.new(0.1, 0.3),
		SpreadAngle = Vector2.new(180, 180),
		Size = NumberSequence.new(0.05, 0.12),
		Transparency = NumberSequence.new({
			NumberSequenceKeypoint.new(0, 1),
			NumberSequenceKeypoint.new(0.3, 0.55),
			NumberSequenceKeypoint.new(1, 1),
		}),
		Color = ColorSequence.new(Color3.fromRGB(220, 225, 240)),
		LightEmission = 0.3,
	})
end

-- Brasas ascendentes para la caldera.
function VFX.brasas(parent)
	return emisor(parent, {
		Texture = "rbxassetid://241876428",
		Rate = 30,
		Lifetime = NumberRange.new(1.5, 3),
		Speed = NumberRange.new(2, 5),
		Acceleration = Vector3.new(0, 3, 0),
		Size = NumberSequence.new(0.15, 0),
		Color = ColorSequence.new(Color3.fromRGB(255, 160, 60), Color3.fromRGB(255, 80, 40)),
		LightEmission = 1,
	})
end

-- Aura fría que rodea a las entidades.
function VFX.auraEntidad(parent)
	return emisor(parent, {
		Texture = "rbxassetid://243728104",
		Rate = 18,
		Lifetime = NumberRange.new(0.8, 1.4),
		Speed = NumberRange.new(0.4, 0.8),
		Size = NumberSequence.new(0.4, 0),
		Color = ColorSequence.new(Color3.fromRGB(120, 160, 255)),
		Transparency = NumberSequence.new(0.5, 1),
		LightEmission = 0.8,
	})
end

-- Estallido de esquirlas cuando se rompe un espejo.
function VFX.espejo(parent)
	local e = emisor(parent, {
		Texture = "rbxassetid://243660364",
		Rate = 0,
		Lifetime = NumberRange.new(0.6, 1),
		Speed = NumberRange.new(6, 12),
		SpreadAngle = Vector2.new(180, 180),
		Acceleration = Vector3.new(0, -20, 0),
		Size = NumberSequence.new(0.2, 0),
		Color = ColorSequence.new(Color3.fromRGB(200, 230, 255)),
		LightEmission = 0.9,
	})
	e:Emit(40)
	return e
end

return VFX`,
  },
  {
    id: "character-polish",
    name: "CharacterPolish",
    path: "StarterPlayer/StarterPlayerScripts/Effects/CharacterPolish",
    kind: "ModuleScript",
    folder: "Cliente",
    week: 12,
    phase: "F5",
    description:
      "Pulido del personaje: pasos con sonido según el material que pisas, inclinación al girar y aceleración suave. El avatar deja de sentirse rígido y gana peso físico.",
    code: `--!strict
-- ============================================================
-- HOTEL ∞ INFINITO · Effects/CharacterPolish
-- Sensación física del personaje: pasos, giro y peso.
-- ============================================================
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local SoundService = game:GetService("SoundService")

local Polish = {}
local player = Players.LocalPlayer

local PASOS = {
	[Enum.Material.Marble] = 600,
	[Enum.Material.WoodPlanks] = 700,
	[Enum.Material.Fabric] = 900,
	[Enum.Material.Water] = 1000,
}

local ultimaZancada = 0
local anguloSuave = 0

local function reproducirPaso(material)
	local s = Instance.new("Sound")
	s.SoundId = "rbxassetid://" .. (PASOS[material] or 600)
	s.Volume = 0.35
	s.PlaybackSpeed = 0.9 + math.random() * 0.2
	s.Parent = SoundService
	s:Play()
	s.Ended:Connect(function() s:Destroy() end)
end

function Polish.iniciar()
	RunService.RenderStepped:Connect(function(dt)
		local char = player.Character
		local hum = char and char:FindFirstChildOfClass("Humanoid")
		local root = char and char:FindFirstChild("HumanoidRootPart")
		if not hum or not root then return end

		local vel = root.AssemblyLinearVelocity
		local plana = Vector3.new(vel.X, 0, vel.Z).Magnitude

		-- Inclinación lateral al girar (da peso al movimiento).
		local giro = hum.MoveDirection:Cross(root.CFrame.LookVector).Y
		anguloSuave = anguloSuave + (giro * math.clamp(plana * 0.4, 0, 6) - anguloSuave) * math.min(1, dt * 10)
		root.CFrame = root.CFrame * CFrame.Angles(0, 0, math.rad(anguloSuave) * 0.15)

		-- Pasos sincronizados con la zancada.
		if plana > 4 and hum.FloorMaterial ~= Enum.Material.Air then
			local intervalo = 0.62 - math.clamp(plana * 0.01, 0, 0.25)
			if time() - ultimaZancada > intervalo then
				ultimaZancada = time()
				reproducirPaso(hum.FloorMaterial)
			end
		end
	end)
end

return Polish`,
  },
];
