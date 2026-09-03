export interface LuauFile {
  id: string;
  name: string;
  path: string;
  kind: "Script" | "ModuleScript" | "LocalScript";
  folder: "Compartido" | "Servidor" | "Cliente";
  week: number;
  phase: "F1" | "F2" | "F3" | "F4";
  description: string;
  code: string;
}

export const faseLabels: Record<string, string> = {
  F1: "Fase 1 · Cimientos",
  F2: "Fase 2 · Núcleo jugable",
  F3: "Fase 3 · Economía y tienda",
  F4: "Fase 4 · Pulido y cliente",
};

export const semanaLabels: Record<string, string> = {
  F1: "Semanas 1–3",
  F2: "Semanas 4–8",
  F3: "Semanas 9–10",
  F4: "Semana 12",
};
