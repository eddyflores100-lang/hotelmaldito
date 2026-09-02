import { useState, type CSSProperties, type ReactNode } from "react";
import {
  comparisonRows,
  games,
  insights,
  marketStats,
  roadmap,
  tickerItems,
  verdict,
  type GameConcept,
} from "./data/concepts";
import { useCountUp, useInView } from "./hooks";
import {
  GameIcon,
  IconArrow,
  IconBolt,
  IconCheck,
  IconClock,
  IconCoin,
  IconCube,
  IconFlag,
  IconMap,
  IconWrench,
  InsightIcon,
  VoxelCube,
} from "./components/Icons";

/* ---------------------------------- helpers --------------------------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function SectionHead({
  num,
  kicker,
  title,
  accent,
}: {
  num: string;
  kicker: string;
  title: string;
  accent: string;
}) {
  return (
    <Reveal className="mb-12 md:mb-16">
      <div className="flex items-baseline gap-4 md:gap-6">
        <span
          className="font-display text-5xl leading-none md:text-7xl text-outline select-none"
          aria-hidden="true"
        >
          {num}
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-fog">
            {kicker}
          </p>
          <h2 className="font-display mt-2 text-3xl leading-[1.02] text-paper md:text-5xl">
            {title.split("|")[0]}
            {title.includes("|") && (
              <span style={{ color: accent }}>{title.split("|")[1]}</span>
            )}
          </h2>
        </div>
      </div>
      <div className="mt-6 h-px w-full bg-gradient-to-r from-line via-line to-transparent" />
    </Reveal>
  );
}

/* ------------------------------ ambient background --------------------------- */

function Ambient() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <div className="grid-bg absolute inset-0" />
      <div className="glow-cyan absolute -top-40 -left-40 h-[42rem] w-[42rem]" />
      <div className="glow-amber absolute top-1/3 -right-52 h-[46rem] w-[46rem]" />
      <div className="glow-lime absolute -bottom-64 left-1/4 h-[40rem] w-[40rem]" />
      <div className="noise-overlay absolute inset-0" />
      <div className="absolute inset-0 overflow-hidden">
        <div className="scan-sweep absolute inset-x-0 top-0 h-[26vh] bg-gradient-to-b from-transparent via-cyan/5 to-transparent" />
      </div>
    </div>
  );
}

function FloatingCubes() {
  const cubes = [
    { c: "#38e1d4", s: "w-16", pos: "top-[16%] right-[8%]", d: "0s", t: "7s" },
    { c: "#ffa02f", s: "w-10", pos: "top-[58%] right-[16%]", d: "1.2s", t: "9s" },
    { c: "#a8e63c", s: "w-24", pos: "top-[64%] left-[4%]", d: "0.6s", t: "11s" },
    { c: "#38e1d4", s: "w-8", pos: "top-[24%] left-[12%]", d: "2s", t: "8s" },
    { c: "#ffa02f", s: "w-12", pos: "top-[8%] left-[44%]", d: "1.6s", t: "10s" },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {cubes.map((cube, i) => (
        <div
          key={i}
          className={`cube-float absolute ${cube.pos} ${cube.s} opacity-50`}
          style={{ animationDelay: cube.d, animationDuration: cube.t }}
        >
          <VoxelCube color={cube.c} className="h-auto w-full drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]" />
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------- top HUD --------------------------------- */

function TopHud() {
  const links = [
    ["01", "Mercado", "#mercado"],
    ["02", "Conceptos", "#conceptos"],
    ["03", "Comparativa", "#comparativa"],
    ["04", "Veredicto", "#veredicto"],
  ];
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/70 bg-deep/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:px-8">
        <a href="#top" className="group flex items-center gap-2.5">
          <IconCube className="h-6 w-6 text-cyan transition-transform duration-300 group-hover:rotate-12" />
          <span className="font-display text-sm tracking-wide text-paper">
            GAME<span className="text-amber">LAB</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 md:flex">
          {links.map(([n, label, href]) => (
            <a
              key={href}
              href={href}
              className="group text-xs font-semibold uppercase tracking-[0.22em] text-fog transition-colors hover:text-paper"
            >
              <span className="mr-1.5 text-line transition-colors group-hover:text-amber">{n}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-lime">
          <span className="pulse-dot h-2 w-2 rounded-full bg-lime" />
          <span className="hidden sm:inline">Servidor en línea</span>
          <span className="sm:hidden">Online</span>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------- opening ---------------------------------- */

function Opening() {
  return (
    <section id="top" className="relative flex min-h-screen flex-col overflow-hidden pt-14">
      <FloatingCubes />
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-10 px-4 py-16 md:px-8 lg:flex-row lg:items-center lg:gap-16">
        {/* left: title block */}
        <div className="relative z-10 lg:flex-1">
          <Reveal>
            <div className="hud-corners mb-8 inline-block border border-line bg-panel/70 px-4 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-fog">
                Doc de diseño · <span className="text-cyan">temporada 2026</span> · Roblox Studio
              </p>
            </div>
          </Reveal>
          <h1 className="font-display leading-[0.98]">
            <Reveal delay={80}>
              <span className="block text-5xl text-paper sm:text-7xl xl:text-8xl">TRES JUEGOS</span>
            </Reveal>
            <Reveal delay={180}>
              <span className="text-outline block text-5xl sm:text-7xl xl:text-8xl">QUE AÚN NO</span>
            </Reveal>
            <Reveal delay={280}>
              <span className="block text-5xl text-amber sm:text-7xl xl:text-8xl">EXISTEN</span>
              <span className="blink ml-2 inline-block h-[0.85em] w-[0.45em] translate-y-[0.12em] bg-amber align-baseline" />
            </Reveal>
          </h1>
          <Reveal delay={380}>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-fog md:text-lg">
              Mercado verificado, jugabilidad definida y escenarios dibujados. Tres conceptos
              únicos pensados para jugadores de <span className="font-semibold text-paper">10 a 18 años</span> —
              cada uno ataca un hueco distinto del catálogo de Roblox.
            </p>
          </Reveal>
          <Reveal delay={480}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#conceptos"
                className="font-display group inline-flex items-center gap-3 border-2 border-amber bg-amber px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 hover:bg-transparent hover:text-amber hover:shadow-[0_0_32px_rgba(255,160,47,0.35)] active:translate-y-0"
              >
                PRESS START
                <IconArrow className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </a>
              <a
                href="#mercado"
                className="font-display inline-flex items-center gap-3 border-2 border-line px-7 py-3.5 text-sm text-fog transition-all duration-200 hover:border-cyan hover:text-cyan"
              >
                Ver el mercado
              </a>
            </div>
          </Reveal>
        </div>

        {/* right: mission card */}
        <Reveal delay={300} className="relative z-10 lg:w-[380px] lg:shrink-0">
          <div className="hud-corners border border-line bg-panel/80 p-6 md:p-7">
            <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
              <span className="font-display text-xs tracking-wider text-paper">FICHA DE MISIÓN</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-fog">ID: RBX-26</span>
            </div>
            <dl className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-fog">Objetivo</dt>
                <dd className="text-right font-semibold text-paper">Crear el próximo top-100 de Roblox</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-fog">Público</dt>
                <dd className="text-right font-semibold text-paper">10 – 18 años</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-fog">Plataforma</dt>
                <dd className="text-right font-semibold text-paper">Roblox · PC, móvil, consola</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-fog">Método</dt>
                <dd className="text-right font-semibold text-paper">Datos 2025 + nichos vacíos</dd>
              </div>
            </dl>
            <div className="mt-6 border border-line bg-deep/70 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em]">
                <span className="text-fog">Análisis de mercado</span>
                <span className="text-lime">completado</span>
              </div>
              <div className="h-1.5 w-full bg-line/60">
                <div className="grow-bar h-full bg-lime" style={{ width: "100%" }} />
              </div>
              <p className="mt-3 text-xs text-fog">
                <span className="text-paper">4 fuentes</span> cruzadas · tendencias de género ·
                récords de concurrencia<span className="blink text-lime">▌</span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* ticker */}
      <div className="relative z-10 border-y border-line bg-deep/80 py-3">
        <div className="overflow-hidden">
          <div className="marquee-track flex items-center gap-8">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span
                key={i}
                className="flex items-center gap-8 whitespace-nowrap text-xs font-semibold uppercase tracking-[0.22em] text-fog"
              >
                {item}
                <span className="text-amber">◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- mercado ---------------------------------- */

function StatCard({
  value,
  decimals,
  suffix,
  label,
  note,
  color,
  delay,
}: (typeof marketStats)[number] & { delay: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);
  const display = useCountUp(value, decimals, inView);
  return (
    <div
      ref={ref}
      className={`reveal card-lift hud-corners border border-line bg-panel/70 p-6 md:p-8 ${inView ? "is-visible" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="font-display text-4xl leading-none md:text-6xl" style={{ color }}>
        {display}
        <span className="text-xl md:text-3xl">{suffix}</span>
      </p>
      <p className="mt-4 text-sm font-semibold text-paper">{label}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-fog">{note}</p>
    </div>
  );
}

function Market() {
  return (
    <section id="mercado" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHead num="01" kicker="Datos verificados · Q3–Q4 2025" title="Radiografía del| mercado" accent="var(--color-cyan)" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {marketStats.map((s, i) => (
            <StatCard key={s.label} {...s} delay={i * 100} />
          ))}
        </div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal>
            <h3 className="font-display text-2xl leading-tight text-paper md:text-3xl">
              ¿Qué está premiando <span className="text-lime">el algoritmo</span> de Roblox ahora mismo?
            </h3>
            <p className="mt-5 leading-relaxed text-fog">
              Cruzamos los reportes oficiales de Roblox con el ranking de experiencias de 2025.
              El patrón es claro: los juegos que explotan combinan un <span className="text-paper">loop cortísimo</span>,
              una <span className="text-paper">economía coleccionable</span> y momentos diseñados para
              convertirse en clip. Todo lo que proponemos abajo nace de estas cinco reglas.
            </p>
            <p className="mt-5 border-l-2 border-amber pl-4 text-sm text-fog">
              Fuentes: reportes trimestrales de Roblox (2025), brands.roblox.com, ranking oficial de
              experiencias y cobertura del récord de Grow a Garden (21,6 M CCU).
            </p>
          </Reveal>

          <div className="space-y-3">
            {insights.map((ins, i) => (
              <Reveal key={ins.title} delay={i * 90}>
                <div className="group flex gap-4 border border-line bg-panel/60 p-4 transition-all duration-300 hover:translate-x-1.5 hover:border-fog/60 hover:bg-panel md:gap-5 md:p-5">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center border transition-colors duration-300"
                    style={{ color: ins.color, borderColor: "var(--color-line)" }}
                  >
                    <InsightIcon name={ins.icon} className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm tracking-wide text-paper md:text-base">
                      <span className="mr-2 text-fog">0{i + 1}</span>
                      {ins.title}
                    </h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-fog">{ins.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- conceptos --------------------------------- */

function LoopDiagram({ game }: { game: GameConcept }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-0">
      {game.loop.map((step, i) => (
        <div key={step.step} className="flex flex-1 items-center md:flex-col md:items-stretch">
          <div
            className="card-lift hud-corners w-full flex-1 border border-line bg-deep/60 p-4"
            style={{ borderTopColor: game.color, borderTopWidth: 2 }}
          >
            <span className="font-display text-xs" style={{ color: game.color }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <p className="font-display mt-1 text-base text-paper">{step.step}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-fog">{step.desc}</p>
          </div>
          {i < game.loop.length - 1 && (
            <IconArrow className="mx-1 h-5 w-5 shrink-0 -rotate-90 text-fog md:mx-0 md:my-2 md:self-center md:rotate-0" />
          )}
        </div>
      ))}
    </div>
  );
}

const riskStyles: Record<string, string> = {
  Bajo: "text-lime border-lime/50 bg-lime/10",
  Medio: "text-amber border-amber/50 bg-amber/10",
  Alto: "text-[#ff6b6b] border-[#ff6b6b]/50 bg-[#ff6b6b]/10",
};

function ConceptDetail({ game }: { game: GameConcept }) {
  return (
    <div key={game.id} className="panel-in space-y-10">
      {/* header */}
      <div className="relative">
        <span
          className="font-display pointer-events-none absolute -top-8 right-0 text-[6rem] leading-none text-outline opacity-40 select-none md:text-[9rem]"
          aria-hidden="true"
        >
          {game.num}
        </span>
        <div className="relative flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center border md:h-16 md:w-16"
            style={{ color: game.color, borderColor: game.color, background: game.colorSoft }}
          >
            <GameIcon name={game.icon} className="h-8 w-8" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-fog">
              Concepto {game.num} · {game.genres.join(" · ")}
            </p>
            <h3 className="font-display mt-1.5 text-3xl leading-[1.02] text-paper md:text-5xl">
              {game.title} <span style={{ color: game.color }}>{game.titleAccent}</span>
            </h3>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-fog md:text-lg">{game.tagline}</p>
      </div>

      {/* stat badges */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="border border-line bg-panel/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">Edad objetivo</p>
          <p className="font-display mt-2 text-lg text-paper">{game.age}</p>
        </div>
        <div className="border border-line bg-panel/60 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">
            <IconWrench className="h-3.5 w-3.5" /> Dificultad dev
          </p>
          <div className="mt-2.5 flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-3.5 w-6"
                style={{
                  background: i < game.devDiff ? "var(--color-amber)" : "var(--color-line)",
                }}
              />
            ))}
            <span className="font-display ml-2 text-sm text-paper">{game.devLabel}</span>
          </div>
        </div>
        <div className="border border-line bg-panel/60 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">
            <IconBolt className="h-3.5 w-3.5" /> Potencial viral
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <div className="h-2 flex-1 bg-line/60">
              <div className="grow-bar h-full" style={{ width: `${game.viral}%`, background: game.color }} />
            </div>
            <span className="font-display text-sm text-paper">{game.viral}</span>
          </div>
        </div>
        <div className="border border-line bg-panel/60 p-4">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">
            <IconClock className="h-3.5 w-3.5" /> Sesión media
          </p>
          <p className="font-display mt-2 text-lg text-paper">{game.session}</p>
        </div>
      </div>

      {/* loop */}
      <div>
        <h4 className="font-display mb-4 text-sm tracking-wider text-fog">
          <span style={{ color: game.color }}>▸</span> LOOP DE JUGABILIDAD (≈ 90 SEGUNDOS)
        </h4>
        <LoopDiagram game={game} />
      </div>

      {/* unique */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div>
          <h4 className="font-display mb-4 text-sm tracking-wider text-fog">
            <span style={{ color: game.color }}>▸</span> ¿POR QUÉ NO EXISTE TODAVÍA?
          </h4>
          <ul className="space-y-3.5">
            {game.unique.map((u) => (
              <li key={u} className="flex gap-3 text-sm leading-relaxed text-fog">
                <span className="mt-0.5 shrink-0" style={{ color: game.color }}>
                  <IconCheck className="h-4 w-4" />
                </span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-display mb-4 flex items-center gap-2 text-sm tracking-wider text-fog">
            <span style={{ color: game.color }}>▸</span> CRUCE DE REFERENCIAS
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {game.refs.map((r, i) => (
              <span
                key={r}
                className="border border-line bg-deep/60 px-3.5 py-2 text-sm font-semibold text-paper transition-colors duration-200 hover:border-fog"
              >
                {r}
                {i < game.refs.length - 1 && <span className="ml-2.5 text-fog">+</span>}
              </span>
            ))}
          </div>
          <h4 className="font-display mb-4 mt-8 flex items-center gap-2 text-sm tracking-wider text-fog">
            <span style={{ color: game.color }}>
              <IconCoin className="h-4 w-4" />
            </span>
            <span>MONETIZACIÓN (GAMEPASSES)</span>
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {game.monetization.map((m) => (
              <div
                key={m.item}
                className="flex items-center justify-between gap-3 border border-line bg-deep/60 px-3.5 py-2.5 text-sm transition-colors duration-200 hover:border-fog"
              >
                <span className="text-fog">{m.item}</span>
                <span className="font-display whitespace-nowrap text-xs" style={{ color: game.color }}>
                  {m.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* scenarios */}
      <div>
        <h4 className="font-display mb-5 flex items-center gap-2 text-sm tracking-wider text-fog">
          <IconMap className="h-4 w-4" /> <span>ESCENARIOS · 3 MAPAS FIRMA</span>
        </h4>
        <div className="grid gap-4 md:grid-cols-3">
          {game.scenarios.map((sc, i) => (
            <div
              key={sc.name}
              className={`card-lift hud-corners group border border-line bg-panel/70 p-5 hover:shadow-[0_18px_50px_-18px_rgba(0,0,0,0.9)] ${i === 1 ? "md:translate-y-4" : ""}`}
              style={{ borderTopColor: game.color, borderTopWidth: 2 }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="font-display border px-2 py-1 text-[11px] tracking-wider"
                  style={{ color: game.color, borderColor: game.color }}
                >
                  {sc.code}
                </span>
                <span className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${riskStyles[sc.risk]}`}>
                  Riesgo {sc.risk.toLowerCase()}
                </span>
              </div>
              <h5 className="font-display mt-4 text-lg leading-tight text-paper">{sc.name}</h5>
              <p className="mt-2.5 text-sm leading-relaxed text-fog">{sc.desc}</p>
              <p className="mt-4 border-t border-line pt-3 text-xs text-fog">
                <span className="font-bold uppercase tracking-[0.16em]" style={{ color: game.color }}>
                  Botín:
                </span>{" "}
                {sc.reward}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Concepts() {
  const [activeId, setActiveId] = useState(games[1].id);
  const active = games.find((g) => g.id === activeId) ?? games[0];

  return (
    <section id="conceptos" className="relative scroll-mt-20 border-t border-line/60 bg-deep/50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHead num="02" kicker="Jugabilidad definida · nichos vacíos" title="Tres conceptos,| tres huecos" accent="var(--color-amber)" />

        <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
          {/* selector rail */}
          <Reveal>
            <div className="flex gap-3 overflow-x-auto pb-2 lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0">
              {games.map((g) => {
                const isActive = g.id === activeId;
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveId(g.id)}
                    aria-pressed={isActive}
                    className={`group min-w-[230px] border p-4 text-left transition-all duration-300 lg:min-w-0 lg:p-5 ${
                      isActive
                        ? "border-transparent bg-panel2 shadow-[0_14px_40px_-18px_rgba(0,0,0,0.9)]"
                        : "border-line bg-panel/50 hover:translate-x-1 hover:bg-panel"
                    }`}
                    style={isActive ? { borderColor: g.color, boxShadow: `inset 3px 0 0 ${g.color}` } : undefined}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-xs" style={{ color: isActive ? g.color : "var(--color-fog)" }}>
                        {g.num}
                      </span>
                      <span style={{ color: isActive ? g.color : "var(--color-fog)" }}>
                        <GameIcon name={g.icon} className="h-5 w-5" />
                      </span>
                    </div>
                    <p className={`font-display mt-2.5 text-base leading-tight ${isActive ? "text-paper" : "text-fog group-hover:text-paper"}`}>
                      {g.title} <span style={{ color: g.color }}>{g.titleAccent}</span>
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">
                      {g.genres[0]}
                    </p>
                  </button>
                );
              })}
              <div className="hidden border border-dashed border-line p-4 text-xs leading-relaxed text-fog lg:block">
                <IconFlag className="mb-2 h-4 w-4 text-amber" />
                Cada concepto ataca un género caliente con un giro que nadie está haciendo en el top 500.
              </div>
            </div>
          </Reveal>

          {/* detail panel */}
          <ConceptDetail game={active} />
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- comparativa -------------------------------- */

function Compare() {
  return (
    <section id="comparativa" className="relative scroll-mt-20 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHead num="03" kicker="Frente a frente" title="La tabla| de decisiones" accent="var(--color-lime)" />
        <Reveal>
          <div className="overflow-x-auto border border-line bg-panel/50">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b-2 border-line">
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-[0.22em] text-fog md:p-5">
                    Criterio
                  </th>
                  {games.map((g) => (
                    <th key={g.id} className="p-4 text-left md:p-5">
                      <span className="font-display flex items-center gap-2.5 text-sm" style={{ color: g.color }}>
                        <span className="h-2.5 w-2.5" style={{ background: g.color }} />
                        {g.title} {g.titleAccent}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, ri) => (
                  <tr
                    key={row.label}
                    className={`border-b border-line/60 transition-colors duration-200 hover:bg-panel2/70 ${ri % 2 ? "bg-deep/30" : ""}`}
                  >
                    <td className="p-4 font-semibold text-paper md:p-5">{row.label}</td>
                    {row.values.map((v, ci) => (
                      <td key={ci} className={`p-4 text-fog md:p-5 ${v.includes("●") ? "tracking-[0.3em]" : ""}`} style={v.includes("●") ? { color: games[ci].color } : undefined}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <Reveal delay={150}>
          <p className="mt-5 text-xs text-fog">
            ● Potencial estimado a partir de tendencias de género, saturación del catálogo y formato de clip en vídeo corto.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------- veredicto --------------------------------- */

function Verdict() {
  return (
    <section id="veredicto" className="relative scroll-mt-20 border-t border-line/60 bg-deep/50 py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHead num="04" kicker="Recomendación del laboratorio" title="Nuestro| veredicto" accent="var(--color-amber)" />

        <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <Reveal>
            <div className="hud-corners relative overflow-hidden border border-amber/60 bg-panel/70 p-7 md:p-10">
              <div className="glow-amber pointer-events-none absolute -top-24 -right-24 h-96 w-96" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber">
                Construir primero
              </p>
              <h3 className="font-display mt-3 text-4xl leading-[0.98] text-paper md:text-6xl">
                HOTEL <span className="text-amber">∞ INFINITO</span>
              </h3>
              <p className="mt-5 max-w-xl leading-relaxed text-fog">
                De los tres, es el que mejor cumple la ecuación dorada del mercado 2025–2026:
                <span className="text-paper"> coste de desarrollo contenido × techo viral altísimo × contenido infinito</span>.
                El terror cómico cooperativo es el género con más crecimiento en clips, y el generador
                de pisos convierte cada actualización en un evento.
              </p>
              <ul className="mt-8 space-y-5">
                {verdict.reasons.map((r, i) => (
                  <li key={r.title} className="flex gap-4">
                    <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center border border-amber/60 text-sm text-amber">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-display text-sm tracking-wide text-paper md:text-base">{r.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-fog">{r.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="flex h-full flex-col gap-6">
              <div className="border border-line bg-panel/60 p-6">
                <p className="font-display mb-2 flex items-center gap-2 text-sm text-paper">
                  <IconFlag className="h-4 w-4 text-cyan" /> PLAN B Y PLAN C
                </p>
                <p className="text-sm leading-relaxed text-fog">{verdict.alt}</p>
              </div>
              <div className="hud-corners flex-1 border border-line bg-panel/60 p-6">
                <p className="font-display mb-5 text-sm tracking-wider text-paper">
                  ROADMAP · 12 SEMANAS
                </p>
                <div className="relative space-y-6 border-l border-line pl-6">
                  {roadmap.map((r, i) => (
                    <div key={r.phase} className="relative">
                      <span
                        className="absolute top-1 -left-[31px] h-2.5 w-2.5 rotate-45"
                        style={{
                          background: ["var(--color-amber)", "var(--color-cyan)", "var(--color-lime)", "var(--color-paper)"][i],
                        }}
                      />
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fog">
                        <span className="text-paper">{r.phase}</span> · {r.weeks}
                      </p>
                      <p className="font-display mt-1 text-sm text-paper">{r.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-fog">{r.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------- footer ----------------------------------- */

function Footer() {
  return (
    <footer className="border-t border-line bg-deep/80">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 md:flex-row md:items-center md:px-8">
        <div className="flex items-center gap-2.5">
          <IconCube className="h-5 w-5 text-cyan" />
          <span className="font-display text-xs text-paper">
            GAME<span className="text-amber">LAB</span>
          </span>
          <span className="ml-3 text-xs text-fog">Doc de conceptos · v2.6 · 2026</span>
        </div>
        <p className="max-w-md text-xs leading-relaxed text-fog">
          Documento conceptual no oficial, sin afiliación con Roblox Corporation.
          Cifras de mercado de reportes públicos (2025). Precios en Robux orientativos.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------- app ------------------------------------ */

export default function App() {
  return (
    <div className="relative min-h-screen">
      <Ambient />
      <TopHud />
      <main className="relative z-10">
        <Opening />
        <Market />
        <Concepts />
        <Compare />
        <Verdict />
      </main>
      <Footer />
    </div>
  );
}
