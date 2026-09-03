import { serverFiles } from "./code-server";
import { clientFiles } from "./code-client";
import { graphicsFiles } from "./code-graphics";
import type { LuauFile } from "./codebase-types";

export type { LuauFile };
export { faseLabels, semanaLabels } from "./codebase-types";

/** Todo el programa, en el orden exacto en que se construye en Roblox Studio. */
export const programa: LuauFile[] = [...serverFiles, ...clientFiles, ...graphicsFiles];

/** Solo los sistemas del pipeline gráfico (Fase 5). */
export const graficos: LuauFile[] = graphicsFiles;

export const ordenConstruccion: string[] = [
  "types",
  "config",
  "remotes",
  "rule-registry",
  "data-service",
  "floor-templates",
  "floor-registry",
  "floor-generator",
  "rule-engine",
  "role-manager",
  "tip-economy",
  "entity-manager",
  "shift-manager",
  "shop-service",
  "game-server",
  "client-main",
  "hud-controller",
  "task-controller",
  "scare-controller",
  "shop-ui",
  "lighting-director",
  "postprocess-rig",
  "camera-director",
  "material-studio",
  "water-surface",
  "vfx-library",
  "character-polish",
];

export function porOrden(): LuauFile[] {
  const mapa = new Map(programa.map((f) => [f.id, f]));
  const lista: LuauFile[] = [];
  for (const id of ordenConstruccion) {
    const archivo = mapa.get(id);
    if (archivo) lista.push(archivo);
  }
  return lista;
}

export const estructuraExplorer = [
  { profundidad: 0, nombre: "ReplicatedStorage", tipo: "contenedor" },
  { profundidad: 1, nombre: "Shared", tipo: "contenedor" },
  { profundidad: 2, nombre: "Types", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "Config", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "Remotes", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "RuleRegistry", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "FloorRegistry", tipo: "ModuleScript" },
  { profundidad: 0, nombre: "ServerScriptService", tipo: "contenedor" },
  { profundidad: 1, nombre: "GameServer", tipo: "Script" },
  { profundidad: 1, nombre: "Core", tipo: "contenedor" },
  { profundidad: 2, nombre: "DataService", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "FloorGenerator", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "RuleEngine", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "RoleManager", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "TipEconomy", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "ShiftManager", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "ShopService", tipo: "ModuleScript" },
  { profundidad: 1, nombre: "Entities", tipo: "contenedor" },
  { profundidad: 2, nombre: "EntityManager", tipo: "ModuleScript" },
  { profundidad: 1, nombre: "Maps", tipo: "contenedor" },
  { profundidad: 2, nombre: "FloorTemplates", tipo: "ModuleScript" },
  { profundidad: 0, nombre: "StarterPlayer", tipo: "contenedor" },
  { profundidad: 1, nombre: "StarterPlayerScripts", tipo: "contenedor" },
  { profundidad: 2, nombre: "ClientMain", tipo: "LocalScript" },
  { profundidad: 2, nombre: "UI", tipo: "contenedor" },
  { profundidad: 3, nombre: "HUDController", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "ShopUI", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "Input", tipo: "contenedor" },
  { profundidad: 3, nombre: "TaskController", tipo: "ModuleScript" },
  { profundidad: 2, nombre: "Effects", tipo: "contenedor" },
  { profundidad: 3, nombre: "ScareController", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "LightingDirector", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "PostProcessRig", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "CameraDirector", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "MaterialStudio", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "WaterSurface", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "VFXLibrary", tipo: "ModuleScript" },
  { profundidad: 3, nombre: "CharacterPolish", tipo: "ModuleScript" },
];

export const instrucciones = [
  {
    paso: "1",
    titulo: "Crea el lugar en Roblox Studio",
    texto:
      "Abre Studio → New → Baseplate. Guarda el lugar con File → Publish to Roblox As… (necesitas una cuenta de creador).",
  },
  {
    paso: "2",
    titulo: "Replica la estructura del Explorer",
    texto:
      "En el panel Explorer crea las carpetas y scripts tal como se muestra. Cada ModuleScript y Script de la lista corresponde a un objeto real en el árbol.",
  },
  {
    paso: "3",
    titulo: "Pega cada archivo, en orden",
    texto:
      "Sigue el orden de construcción: primero los tipos y la configuración, luego el servidor y al final el cliente. Cada archivo solo depende de los anteriores.",
  },
  {
    paso: "4",
    titulo: "Crea los pases y productos",
    texto:
      "En el Creator Dashboard crea los Game Passes y Developer Products. Copia sus IDs numéricos y sustituye los ceros (0) en ShopService y ShopUI.",
  },
  {
    paso: "5",
    titulo: "Activa los servicios de la API",
    texto:
      "En Game Settings → Security activa Enable Studio Access to API Services y habilita las ventas en el juego (Enable in-game purchases).",
  },
  {
    paso: "6",
    titulo: "Prueba con F5 y publica",
    texto:
      "Pulsa Play (F5) para probar en Studio. Cuando el loop funcione, Publish to Roblox y abre la experiencia desde la web o la app.",
  },
  {
    paso: "7",
    titulo: "Licencia AliceLabs",
    texto:
      "Todo el código y la documentación llevan Licencia AliceLabs v1.0: puedes implementarlos en tu experiencia de Roblox manteniendo visible el crédito «GameLab by AliceLabs» en la página del juego y en el lobby.",
  },
];
