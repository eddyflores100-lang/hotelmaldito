import { useMemo, useState } from "react";
import {
  porOrden,
  programa,
  graficos,
  estructuraExplorer,
  instrucciones,
  faseLabels,
  semanaLabels,
  type LuauFile,
} from "../data/codebase";
import { IconArrow, IconCube } from "./Icons";

/* ------------------------- resaltador Luau ------------------------- */

type Token = { text: string; cls: string };

const KEYWORDS = new Set([
  "local","function","end","if","then","else","elseif","for","while","do",
  "repeat","until","return","in","not","and","or","break","continue",
  "true","false","nil","export","type","interface",
]);

const BUILTINS = new Set([
  "game","script","workspace","Instance","task","math","os","table","string",
  "pairs","ipairs","next","pcall","xpcall","print","warn","error","assert",
  "tostring","tonumber","type","typeof","select","unpack","require","tick",
  "wait","spawn","delay","Color3","Vector3","Vector2","CFrame","UDim2","UDim",
  "Enum","TweenInfo","BrickColor","NumberRange","NumberSequence","ColorSequence",
  "Rect","Ray","Region3","Players","Workspace","Lighting","ReplicatedStorage",
  "ServerScriptService","DataStoreService","MarketplaceService","PathfindingService",
  "RunService","TweenService","UserInputService","TextService","SoundService",
  "ProximityPrompt","ScreenGui","TextLabel","TextButton","Frame","Part","Model",
  "Folder","RemoteEvent","RemoteFunction","PointLight","UIStroke",
]);

function resaltar(codigo: string): Token[][] {
  const lineas: Token[][] = [];
  let actual: Token[] = [];
  let i = 0;
  const n = codigo.length;
  let enBloque = false;

  const push = (texto: string, cls: string) => {
    const partes = texto.split("\n");
    for (let k = 0; k < partes.length; k++) {
      if (k > 0) {
        lineas.push(actual);
        actual = [];
      }
      if (partes[k]) actual.push({ text: partes[k], cls });
    }
  };

  while (i < n) {
    const resto = codigo.slice(i);
    const ch = codigo[i];

    if (enBloque) {
      const fin = resto.indexOf("]]");
      if (fin === -1) {
        push(resto, "tok-comment");
        i = n;
      } else {
        push(resto.slice(0, fin + 2), "tok-comment");
        i += fin + 2;
        enBloque = false;
      }
      continue;
    }
    if (resto.startsWith("--[[")) {
      enBloque = true;
      push("--[[", "tok-comment");
      i += 4;
      continue;
    }
    if (resto.startsWith("--")) {
      const nl = resto.indexOf("\n");
      if (nl === -1) {
        push(resto, "tok-comment");
        i = n;
      } else {
        push(resto.slice(0, nl), "tok-comment");
        i += nl;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && codigo[j] !== ch) {
        if (codigo[j] === "\\") j++;
        else if (codigo[j] === "\n") break;
        j++;
      }
      j = Math.min(j + 1, n);
      push(codigo.slice(i, j), "tok-string");
      i = j;
      continue;
    }
    const num = resto.match(/^(0[xX][0-9a-fA-F]+|\d+\.?\d*([eE][+-]?\d+)?)/);
    if (num) {
      push(num[0], "tok-number");
      i += num[0].length;
      continue;
    }
    const id = resto.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (id) {
      const palabra = id[0];
      let cls = "tok-ident";
      if (KEYWORDS.has(palabra)) cls = "tok-keyword";
      else if (BUILTINS.has(palabra)) cls = "tok-builtin";
      else if (/^\s*\(/.test(resto.slice(palabra.length))) cls = "tok-func";
      push(palabra, cls);
      i += palabra.length;
      continue;
    }
    const op = resto.match(/^(==|~=|<=|>=|\.\.|\.\.\.|[-+*/%^#=<>(){}[\];:,.])/);
    if (op) {
      push(op[0], "tok-op");
      i += op[0].length;
      continue;
    }
    push(ch, "tok-plain");
    i++;
  }
  lineas.push(actual);
  return lineas;
}

/* ----------------------------- helpers UI ----------------------------- */

function kindColor(kind: LuauFile["kind"]): string {
  if (kind === "Script") return "var(--color-amber)";
  if (kind === "LocalScript") return "var(--color-lime)";
  return "var(--color-cyan)";
}

function kindGlyph(kind: LuauFile["kind"]): string {
  if (kind === "Script") return "▶";
  if (kind === "LocalScript") return "◈";
  return "⬢";
}

function Stat({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="flex flex-col border border-line bg-panel/60 px-5 py-4">
      <span className="font-display text-2xl text-paper md:text-3xl">{valor}</span>
      <span className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
        {etiqueta}
      </span>
    </div>
  );
}

/* --------------------- pipeline gráfico (Fase 5) --------------------- */

const ETAPAS_PIPELINE = [
  { num: "01", titulo: "Geometría PBR", modulo: "MaterialStudio", archivoId: "material-studio", color: "var(--color-cyan)", texto: "Materiales con relieve (normal + roughness maps) y aristas biseladas. Adiós al look cuadrado." },
  { num: "02", titulo: "Iluminación", modulo: "LightingDirector", archivoId: "lighting-director", color: "var(--color-amber)", texto: "Future Lighting, sombras suaves al 55% y paleta de color que cambia según la tensión de la escena." },
  { num: "03", titulo: "Atmósfera y agua", modulo: "WaterSurface", archivoId: "water-surface", color: "var(--color-cyan)", texto: "Niebla volumétrica, atmósfera con haz de luz y agua con olas, cáusticas y ondas al caminar." },
  { num: "04", titulo: "Partículas", modulo: "VFXLibrary", archivoId: "vfx-library", color: "var(--color-lime)", texto: "Polvo en suspensión, brasas de la caldera, auras frías de entidades y esquirlas de espejo." },
  { num: "05", titulo: "Cámara y peso", modulo: "CameraDirector", archivoId: "camera-director", color: "var(--color-amber)", texto: "FOV que respira con la velocidad, balanceo al caminar e inclinación real al girar." },
  { num: "06", titulo: "Post-procesado", modulo: "PostProcessRig", archivoId: "postprocess-rig", color: "var(--color-lime)", texto: "Grading de cine, bloom controlado, depth of field y aberración cromática en los sustos." },
];

function PipelineGrafico({ onVer }: { onVer: (id: string) => void }) {
  return (
    <section className="relative overflow-hidden border-t border-line/60 bg-deep/50 py-16 md:py-24">
      {/* halo ambiental */}
      <div className="pointer-events-none absolute -top-40 left-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan/10 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 right-1/4 h-[26rem] w-[26rem] rounded-full bg-amber/10 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10 flex flex-col gap-3 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan">
              Fase 5 · Gráficos de primera calidad
            </p>
            <h2 className="font-display mt-3 text-3xl leading-[1.02] text-paper md:text-5xl">
              Del blocky al <span className="text-cyan">fotorrealista</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-relaxed text-fog">
            Seis etapas de render que transforman salas planas en espacios con volumen,
            profundidad y peso físico. Cada etapa es un módulo Luau listo para pegar.
          </p>
        </div>

        {/* línea del pipeline */}
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {ETAPAS_PIPELINE.map((etapa, i) => (
            <button
              key={etapa.num}
              onClick={() => onVer(etapa.archivoId)}
              className="group relative flex flex-col border border-line bg-panel/60 p-5 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-cyan/50 hover:shadow-[0_16px_40px_-18px_rgba(56,225,212,0.35)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-2xl text-line transition-colors duration-300 group-hover:text-cyan">
                  {etapa.num}
                </span>
                <span className="h-2.5 w-2.5 rounded-full transition-transform duration-300 group-hover:scale-150" style={{ background: etapa.color }} />
              </div>
              <p className="font-display mt-4 text-sm tracking-wide text-paper">{etapa.titulo}</p>
              <p className="mt-1 font-mono text-[11px] text-cyan/80">{etapa.modulo}</p>
              <p className="mt-3 text-xs leading-relaxed text-fog">{etapa.texto}</p>
              {i < ETAPAS_PIPELINE.length - 1 && (
                <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-cyan/60 xl:block">→</span>
              )}
            </button>
          ))}
        </div>

        {/* módulos gráficos */}
        <div className="mt-14">
          <p className="font-display mb-5 text-sm tracking-wider text-paper">
            LOS 7 MÓDULOS DEL PIPELINE
          </p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {graficos.map((g) => (
              <button
                key={g.id}
                onClick={() => onVer(g.id)}
                className="group flex items-start gap-3 border border-line bg-panel/50 p-4 text-left transition-all duration-200 hover:border-lime/50 hover:bg-panel2"
              >
                <span className="mt-0.5 text-lime">⬢</span>
                <span>
                  <span className="font-display block text-[13px] text-paper group-hover:text-lime">{g.name}</span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-fog">{g.description}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- vista ------------------------------- */

export default function CodebaseView({
  onOpenGdd,
  onOpenRoadmap,
  onOpenLab,
}: {
  onOpenGdd: () => void;
  onOpenRoadmap: () => void;
  onOpenLab: () => void;
}) {
  const archivos = useMemo(() => porOrden(), []);
  const [selId, setSelId] = useState(archivos[0].id);
  const [copiado, setCopiado] = useState(false);

  const sel = archivos.find((a) => a.id === selId) ?? archivos[0];
  const idx = archivos.findIndex((a) => a.id === sel.id);
  const lineas = useMemo(() => resaltar(sel.code), [sel.code]);

  const totalLineas = useMemo(
    () => programa.reduce((acc, f) => acc + f.code.split("\n").length, 0),
    [],
  );

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sel.code);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1600);
    } catch {
      setCopiado(false);
    }
  };

  // Agrupar la lista por fase para mostrar separadores.
  const lista: { tipo: "fase" | "archivo"; fase?: string; archivo?: LuauFile }[] = [];
  let faseActual = "";
  for (const f of archivos) {
    if (f.phase !== faseActual) {
      faseActual = f.phase;
      lista.push({ tipo: "fase", fase: f.phase });
    }
    lista.push({ tipo: "archivo", archivo: f });
  }

  return (
    <div className="relative pt-14">
      {/* cabecera */}
      <section className="border-b border-line/60 bg-deep/60 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-lime">
            Fase de construcción · Roblox Studio · Luau
          </p>
          <h1 className="font-display mt-4 text-4xl leading-[1.02] text-paper md:text-6xl">
            EL PROGRAMA <span className="text-lime">COMPLETO</span>
          </h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-fog">
            Todo el código de <span className="font-semibold text-paper">HOTEL ∞ INFINITO</span>,
            escrito en Luau y ordenado exactamente como se construye en Roblox Studio.
            Cada archivo solo depende de los anteriores: sigue la lista de arriba abajo,
            pega cada uno en su lugar del Explorer y el juego funciona.
          </p>
          <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat valor={String(programa.length)} etiqueta="Archivos Luau" />
            <Stat valor={totalLineas.toLocaleString("es-ES")} etiqueta="Líneas de código" />
            <Stat valor="3" etiqueta="Capas (compartida · server · cliente)" />
            <Stat valor="12" etiqueta="Semanas del roadmap" />
          </div>
        </div>
      </section>

      {/* explorador + código */}
      <section id="codigo" className="scroll-mt-20 py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
            {/* lista de archivos */}
            <aside>
              <p className="font-display mb-4 flex items-center gap-2 text-sm tracking-wider text-paper">
                <IconCube className="h-4 w-4 text-lime" /> ORDEN DE CONSTRUCCIÓN
              </p>
              <div className="max-h-[560px] space-y-1 overflow-y-auto border border-line bg-panel/50 p-3 code-scroll">
                {lista.map((item, i) =>
                  item.tipo === "fase" ? (
                    <div key={`fase-${item.fase}`} className="pt-3 pb-1.5 first:pt-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber">
                        {faseLabels[item.fase ?? "F1"]}
                      </p>
                    </div>
                  ) : (
                    <button
                      key={item.archivo!.id}
                      onClick={() => setSelId(item.archivo!.id)}
                      className={`group flex w-full cursor-pointer items-center gap-2.5 border px-3 py-2 text-left transition-all duration-150 ${
                        sel.id === item.archivo!.id
                          ? "border-lime/70 bg-lime/10"
                          : "border-transparent hover:border-line hover:bg-panel2/70"
                      }`}
                    >
                      <span
                        className="text-[11px]"
                        style={{ color: kindColor(item.archivo!.kind) }}
                      >
                        {kindGlyph(item.archivo!.kind)}
                      </span>
                      <span
                        className={`flex-1 truncate text-sm ${
                          sel.id === item.archivo!.id ? "font-semibold text-paper" : "text-fog group-hover:text-paper"
                        }`}
                      >
                        {item.archivo!.name}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-fog/70">
                        S{item.archivo!.week}
                      </span>
                    </button>
                  ),
                )}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-fog">
                ▶ Script (servidor) · ⬢ ModuleScript · ◈ LocalScript (cliente)
              </p>
            </aside>

            {/* panel de código */}
            <div className="flex min-w-0 flex-col border border-line bg-panel/40">
              <div className="flex flex-wrap items-center gap-3 border-b border-line bg-deep/70 px-4 py-3">
                <span
                  className="font-display border px-2 py-0.5 text-[11px] tracking-wider"
                  style={{ color: kindColor(sel.kind), borderColor: kindColor(sel.kind) }}
                >
                  {sel.kind.toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-xs text-fog md:text-sm">
                  {sel.path}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-fog">
                  {semanaLabels[sel.phase]}
                </span>
                <button
                  onClick={copiar}
                  className={`font-display cursor-pointer border px-3 py-1.5 text-[11px] tracking-wider transition-all duration-200 ${
                    copiado
                      ? "border-lime bg-lime text-deep"
                      : "border-line text-fog hover:border-lime hover:text-lime"
                  }`}
                >
                  {copiado ? "¡COPIADO!" : "COPIAR"}
                </button>
              </div>

              <p className="border-b border-line/60 bg-panel/60 px-4 py-3 text-xs leading-relaxed text-fog md:text-sm">
                {sel.description}
              </p>

              <div className="code-scroll max-h-[600px] overflow-auto bg-deep/90">
                <table className="w-full border-collapse font-mono text-[12.5px] leading-[1.55]">
                  <tbody>
                    {lineas.map((tokens, li) => (
                      <tr key={li} className="align-top">
                        <td className="w-10 select-none border-r border-line/50 px-2 text-right text-fog/50">
                          {li + 1}
                        </td>
                        <td className="whitespace-pre px-3">
                          {tokens.length === 0 ? (
                            <span> </span>
                          ) : (
                            tokens.map((t, ti) => (
                              <span key={ti} className={t.cls}>
                                {t.text}
                              </span>
                            ))
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* navegación anterior / siguiente */}
              <div className="flex items-center justify-between border-t border-line bg-deep/70 px-4 py-3">
                <button
                  onClick={() => setSelId(archivos[Math.max(0, idx - 1)].id)}
                  disabled={idx === 0}
                  className="font-display flex cursor-pointer items-center gap-2 text-[11px] tracking-wider text-fog transition-colors hover:text-lime disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <IconArrow className="h-3.5 w-3.5 rotate-180" /> ANTERIOR
                </button>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-fog">
                  {idx + 1} / {archivos.length}
                </span>
                <button
                  onClick={() => setSelId(archivos[Math.min(archivos.length - 1, idx + 1)].id)}
                  disabled={idx === archivos.length - 1}
                  className="font-display flex cursor-pointer items-center gap-2 text-[11px] tracking-wider text-fog transition-colors hover:text-lime disabled:cursor-not-allowed disabled:opacity-30"
                >
                  SIGUIENTE <IconArrow className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* pipeline gráfico */}
      <PipelineGrafico
        onVer={(id) => {
          const destino = archivos.find((a) => a.id === id) ?? archivos.find((a) => a.id.startsWith(id));
          if (destino) setSelId(destino.id);
          document.getElementById("codigo")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      {/* árbol explorer + instrucciones */}
      <section className="border-t border-line/60 bg-deep/40 py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* árbol del Explorer */}
            <div>
              <p className="font-display mb-6 text-sm tracking-wider text-paper">
                ÁRBOL DEL EXPLORER EN STUDIO
              </p>
              <div className="border border-line bg-panel/50 p-5 font-mono text-[13px] leading-[1.7]">
                {estructuraExplorer.map((nodo, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2"
                    style={{ paddingLeft: nodo.profundidad * 20 }}
                  >
                    <span
                      className="text-[11px]"
                      style={{
                        color:
                          nodo.tipo === "contenedor"
                            ? "var(--color-amber)"
                            : nodo.tipo === "LocalScript"
                              ? "var(--color-lime)"
                              : nodo.tipo === "Script"
                                ? "var(--color-amber)"
                                : "var(--color-cyan)",
                      }}
                    >
                      {nodo.tipo === "contenedor" ? "▸" : kindGlyph(nodo.tipo as LuauFile["kind"])}
                    </span>
                    <span className={nodo.tipo === "contenedor" ? "font-semibold text-paper" : "text-fog"}>
                      {nodo.nombre}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* instrucciones */}
            <div>
              <p className="font-display mb-6 text-sm tracking-wider text-paper">
                CÓMO INSTALARLO EN ROBLOX
              </p>
              <div className="space-y-4">
                {instrucciones.map((ins) => (
                  <div key={ins.paso} className="flex gap-4 border border-line bg-panel/50 p-4 transition-colors hover:border-lime/50">
                    <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center border border-lime/60 text-sm text-lime">
                      {ins.paso}
                    </span>
                    <div>
                      <p className="font-display text-sm text-paper">{ins.titulo}</p>
                      <p className="mt-1 text-xs leading-relaxed text-fog">{ins.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* navegación entre vistas */}
      <section className="border-t border-line/60 bg-deep/60 py-14">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center md:px-8">
          <div>
            <p className="font-display text-xl text-paper md:text-2xl">
              El código está listo. <span className="text-lime">Ahora toca construirlo.</span>
            </p>
            <p className="mt-2 text-sm text-fog">
              Repasa el GDD para el diseño o el Plan de Obra para el calendario semana a semana.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={onOpenGdd}
              className="font-display cursor-pointer border-2 border-amber px-5 py-3 text-xs tracking-wider text-amber transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber hover:text-deep"
            >
              VER EL GDD
            </button>
            <button
              onClick={onOpenRoadmap}
              className="font-display cursor-pointer border-2 border-lime px-5 py-3 text-xs tracking-wider text-lime transition-all duration-200 hover:-translate-y-0.5 hover:bg-lime hover:text-deep"
            >
              PLAN DE OBRA
            </button>
            <button
              onClick={onOpenLab}
              className="font-display cursor-pointer border-2 border-line px-5 py-3 text-xs tracking-wider text-fog transition-all duration-200 hover:border-cyan hover:text-cyan"
            >
              VOLVER AL LAB
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
