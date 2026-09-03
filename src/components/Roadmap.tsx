import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ganttRows,
  kpiTargets,
  liveOpsUpdates,
  milestones,
  phaseGates,
  phases,
  weeks,
} from "../data/roadmap";
import { useInView } from "../hooks";
import { IconArrow, IconCheck, IconClock, IconFlag, IconKeycard, IconStar } from "./Icons";

/* ---------------------------------- helpers ---------------------------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>(0.08);
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

function Head({ code, kicker, title }: { code: string; kicker: string; title: ReactNode }) {
  return (
    <Reveal className="mb-10 md:mb-12">
      <div className="flex items-center gap-4">
        <span className="font-display hud-corners flex h-12 w-12 shrink-0 items-center justify-center border border-line bg-panel text-sm text-amber">
          {code}
        </span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-fog">{kicker}</p>
          <h3 className="font-display mt-1 text-2xl leading-tight text-paper md:text-4xl">{title}</h3>
        </div>
      </div>
      <div className="mt-5 h-px w-full bg-gradient-to-r from-line to-transparent" />
    </Reveal>
  );
}

const phaseById = (id: number) => phases.find((p) => p.id === id)!;

/* ----------------------------------- cover ----------------------------------- */

function Cover() {
  return (
    <section id="top" className="relative overflow-hidden pt-14">
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 md:px-8 md:pb-20 md:pt-20">
        <Reveal>
          <div className="hud-corners inline-block border border-line bg-panel/70 px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-fog">
              HOTEL ∞ INFINITO · <span className="text-amber">plan de obra</span> · v1.0
            </p>
          </div>
        </Reveal>
        <h1 className="font-display mt-8 leading-[0.98]">
          <Reveal delay={80}>
            <span className="block text-5xl text-paper sm:text-7xl xl:text-8xl">PLAN DE OBRA</span>
          </Reveal>
          <Reveal delay={180}>
            <span className="text-outline block text-5xl sm:text-7xl xl:text-8xl">12 SEMANAS,</span>
          </Reveal>
          <Reveal delay={280}>
            <span className="block text-5xl text-amber sm:text-7xl xl:text-8xl">1 LANZAMIENTO</span>
            <span className="blink ml-2 inline-block h-[0.85em] w-[0.45em] translate-y-[0.12em] bg-amber align-baseline" />
          </Reveal>
        </h1>
        <Reveal delay={380}>
          <p className="mt-7 max-w-2xl text-base leading-relaxed text-fog md:text-lg">
            Cada semana es una <span className="font-semibold text-paper">planta del hotel</span>: se construye de
            abajo arriba, se inspecciona en cada puerta de fase y se inaugura con todas las luces encendidas.
            <span className="text-paper"> 60+ tareas concretas</span>, entregable semanal y criterios de éxito medibles.
          </p>
        </Reveal>

        <Reveal delay={460}>
          <div className="mt-10 flex flex-wrap gap-3">
            {phases.map((p) => (
              <div
                key={p.id}
                className="group flex items-center gap-2.5 border border-line bg-panel/60 px-3.5 py-2.5 transition-colors duration-200 hover:border-fog/60"
              >
                <span className="h-2.5 w-2.5 rotate-45 transition-transform duration-300 group-hover:rotate-[135deg]" style={{ background: p.color }} />
                <span className="text-xs font-semibold text-paper">
                  F{p.id} · {p.name}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-fog">{p.weeks}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={540}>
          <div className="mt-10 grid max-w-3xl grid-cols-2 gap-px border border-line bg-line/60 sm:grid-cols-4">
            {[
              ["12", "semanas"],
              ["5", "hitos de obra"],
              ["5", "puertas de fase"],
              ["6", "líneas de trabajo"],
            ].map(([n, l]) => (
              <div key={l} className="bg-panel/80 px-5 py-4">
                <p className="font-display text-3xl text-paper">{n}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-fog">{l}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------ week-by-week plan ----------------------------- */

function WeekPlanner() {
  const [selected, setSelected] = useState(3);
  const week = weeks[selected - 1];
  const phase = phaseById(week.phaseId);

  const goTo = (n: number) => setSelected(((n - 1 + 12) % 12) + 1);

  return (
    <section id="semanas" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head
          code="R1"
          kicker="El plan, semana a semana"
          title={
            <>
              Pulsa una semana y mira <span className="text-lime">qué se construye</span>
            </>
          }
        />

        {/* week tiles */}
        <Reveal>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
            {weeks.map((w) => {
              const p = phaseById(w.phaseId);
              const active = w.week === selected;
              return (
                <button
                  key={w.week}
                  onClick={() => setSelected(w.week)}
                  className={`group relative cursor-pointer border px-1 pb-2.5 pt-2 transition-all duration-200 ${
                    active
                      ? "-translate-y-1 border-transparent bg-panel2"
                      : "border-line bg-panel/50 hover:-translate-y-0.5 hover:bg-panel"
                  }`}
                  style={active ? { boxShadow: `inset 0 0 0 1.5px ${p.color}, 0 8px 24px rgba(0,0,0,0.35)` } : undefined}
                >
                  <span
                    className="font-display block text-sm leading-none md:text-base"
                    style={{ color: active ? p.color : "var(--color-fog)" }}
                  >
                    S{String(w.week).padStart(2, "0")}
                  </span>
                  <span className="mt-2 block h-1 w-full" style={{ background: p.color, opacity: active ? 1 : 0.35 }} />
                  {w.milestone && (
                    <span
                      className="absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rotate-45 border border-deep"
                      style={{ background: p.color }}
                      title={w.milestone}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </Reveal>

        {/* detail panel */}
        <div key={week.week} className="panel-in mt-8">
          <div className="hud-corners relative overflow-hidden border border-line bg-panel/70 p-6 md:p-9">
            <div
              className="pointer-events-none absolute -top-28 -right-28 h-80 w-80 rounded-full blur-3xl"
              style={{ background: phase.color, opacity: 0.07 }}
            />
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="font-display border px-3 py-1.5 text-xs tracking-wider"
                    style={{ color: phase.color, borderColor: phase.color, background: `${phase.color}14` }}
                  >
                    FASE {phase.id} · {phase.name.toUpperCase()}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fog">{phase.weeks}</span>
                </div>
                <h4 className="font-display mt-4 text-3xl leading-tight text-paper md:text-5xl">
                  <span style={{ color: phase.color }}>S{String(week.week).padStart(2, "0")}</span> — {week.title}
                </h4>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goTo(week.week - 1)}
                  aria-label="Semana anterior"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center border border-line text-fog transition-all duration-200 hover:border-fog hover:text-paper active:scale-95"
                >
                  <IconArrow className="h-4 w-4 rotate-180" />
                </button>
                <button
                  onClick={() => goTo(week.week + 1)}
                  aria-label="Semana siguiente"
                  className="flex h-11 w-11 cursor-pointer items-center justify-center border border-line text-fog transition-all duration-200 hover:border-fog hover:text-paper active:scale-95"
                >
                  <IconArrow className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
              {/* tasks */}
              <div>
                <p className="font-display mb-4 flex items-center gap-2 text-sm tracking-wider text-paper">
                  <span style={{ color: phase.color }}>
                    <IconCheck className="h-4 w-4" />
                  </span>
                  TAREAS DE LA SEMANA
                </p>
                <ul className="space-y-2.5">
                  {week.tasks.map((t, i) => (
                    <li
                      key={t}
                      className="group flex items-start gap-3.5 border border-line/70 bg-deep/50 px-4 py-3 transition-all duration-200 hover:translate-x-1 hover:bg-panel2"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span
                        className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center border transition-colors duration-200"
                        style={{ borderColor: `${phase.color}88` }}
                      >
                        <IconCheck className="h-3 w-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ color: phase.color } as CSSProperties} />
                      </span>
                      <span className="text-sm leading-relaxed text-fog transition-colors duration-200 group-hover:text-paper">
                        {t}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* deliverable + milestone + gate */}
              <div className="space-y-4">
                <div className="border border-line bg-deep/60 p-5">
                  <p className="font-display mb-3 flex items-center gap-2 text-xs tracking-wider text-fog">
                    <IconStar className="h-4 w-4 text-amber" /> ENTREGABLE DEL VIERNES
                  </p>
                  <p className="font-display text-lg leading-snug text-paper">{week.deliverable}</p>
                  <div className="mt-3 h-1 w-full bg-line/50">
                    <div className="grow-bar h-full" style={{ width: "100%", background: phase.color }} />
                  </div>
                </div>

                {week.milestone && (
                  <div
                    className="flex items-start gap-3.5 border p-5"
                    style={{ borderColor: `${phase.color}66`, background: `${phase.color}0d` }}
                  >
                    <span className="mt-0.5 h-3 w-3 shrink-0 rotate-45" style={{ background: phase.color }} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: phase.color }}>
                        Hito de obra
                      </p>
                      <p className="font-display mt-1 text-base text-paper">{week.milestone}</p>
                    </div>
                  </div>
                )}

                {week.gate && (
                  <div className="border border-amber/50 bg-amber/5 p-5">
                    <p className="font-display mb-2 flex items-center gap-2 text-xs tracking-wider text-amber">
                      <IconKeycard className="h-4 w-4" /> PUERTA DE FASE
                    </p>
                    <p className="text-sm leading-relaxed text-fog">
                      <span className="font-semibold text-paper">No se avanza hasta que:</span> {week.gate}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- gantt chart ------------------------------- */

function Gantt() {
  const [hoverWeek, setHoverWeek] = useState<number | null>(null);
  const milestoneWeeks = milestones.map((m) => m.week);

  return (
    <section id="gantt" className="scroll-mt-28 border-t border-line/60 bg-deep/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head
          code="R2"
          kicker="Quién trabaja cuándo"
          title={
            <>
              Líneas de trabajo <span className="text-cyan">× semanas</span>
            </>
          }
        />

        <Reveal>
          <div className="overflow-x-auto border border-line bg-panel/50 p-4 md:p-6">
            <div className="min-w-[860px]">
              {/* header */}
              <div className="grid" style={{ gridTemplateColumns: "170px 1fr" }}>
                <div className="border-b-2 border-line pb-3 pr-4 text-[10px] font-bold uppercase tracking-[0.24em] text-fog">
                  Línea de trabajo
                </div>
                <div className="grid grid-cols-12 border-b-2 border-line pb-2">
                  {weeks.map((w) => (
                    <div
                      key={w.week}
                      onMouseEnter={() => setHoverWeek(w.week)}
                      onMouseLeave={() => setHoverWeek(null)}
                      className={`cursor-default pb-1 text-center transition-colors duration-150 ${
                        hoverWeek === w.week ? "text-paper" : "text-fog"
                      }`}
                    >
                      <span className="font-display text-[11px]">S{w.week}</span>
                      {milestoneWeeks.includes(w.week) && (
                        <span
                          className="mx-auto mt-1 block h-1.5 w-1.5 rotate-45"
                          style={{ background: phaseById(w.phaseId).color }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* rows */}
              {ganttRows.map((row) => (
                <div key={row.name} className="grid" style={{ gridTemplateColumns: "170px 1fr" }}>
                  <div className="flex items-center gap-2.5 border-b border-line/50 py-3.5 pr-4">
                    <span className="h-2 w-2 shrink-0" style={{ background: row.color }} />
                    <span className="text-xs font-semibold text-paper">{row.name}</span>
                  </div>
                  <div className="relative border-b border-line/50">
                    {/* week gridlines */}
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute inset-y-0 border-l border-line/30"
                        style={{ left: `${(i / 12) * 100}%` }}
                      />
                    ))}
                    {/* hover highlight */}
                    {hoverWeek !== null && (
                      <div
                        className="absolute inset-y-0 bg-paper/5 transition-all duration-150"
                        style={{ left: `${((hoverWeek - 1) / 12) * 100}%`, width: `${100 / 12}%` }}
                      />
                    )}
                    {/* bars */}
                    {row.spans.map((s, i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 h-5 -translate-y-1/2 transition-all duration-200"
                        style={{
                          left: `calc(${((s.from - 1) / 12) * 100}% + 3px)`,
                          width: `calc(${((s.to - s.from + 1) / 12) * 100}% - 6px)`,
                          background: row.color,
                          opacity: 0.18 + s.intensity * 0.26,
                          boxShadow: hoverWeek !== null && hoverWeek >= s.from && hoverWeek <= s.to
                            ? `0 0 14px ${row.color}66`
                            : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {/* legend */}
              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-fog">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-8 bg-paper/20" /> apoyo
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-8 bg-paper/45" /> dedicación media
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-3 w-8 bg-paper/80" /> dedicación alta
                </span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rotate-45 bg-amber" /> hito (M1 – M5)
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------------------------- milestones -------------------------------- */

function Milestones() {
  return (
    <section id="hitos" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head
          code="R3"
          kicker="Momentos que no se negocian"
          title={
            <>
              5 hitos <span className="text-amber">de obra</span>
            </>
          }
        />
        <Reveal>
          <div className="relative">
            <div className="absolute top-5 right-0 left-0 hidden h-px bg-gradient-to-r from-line via-amber/50 to-line md:block" />
            <div className="grid gap-4 md:grid-cols-5 md:gap-5">
              {milestones.map((m, i) => {
                const p = phaseById(weeks[m.week - 1].phaseId);
                return (
                  <div
                    key={m.id}
                    className="card-lift group relative border border-line bg-panel/70 p-5 hover:border-amber/60"
                    style={{ transitionDelay: `${i * 40}ms` }}
                  >
                    <span
                      className="absolute -top-2.5 left-5 hidden h-4 w-4 rotate-45 border-2 border-deep transition-transform duration-300 group-hover:scale-125 md:block"
                      style={{ background: p.color }}
                    />
                    <p className="font-display text-2xl" style={{ color: p.color }}>
                      {m.id}
                    </p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-fog">
                      Semana {m.week} · <IconFlag className="inline h-3 w-3 -translate-y-px" />
                    </p>
                    <p className="font-display mt-2.5 text-sm leading-snug text-paper">{m.title}</p>
                    <p className="mt-2 text-xs leading-relaxed text-fog">{m.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------- gates ---------------------------------- */

function Gates() {
  return (
    <section id="puertas" className="scroll-mt-28 border-t border-line/60 bg-deep/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head
          code="R4"
          kicker="Control de calidad"
          title={
            <>
              Puertas de fase: <span className="text-cyan">cruzar o corregir</span>
            </>
          }
        />
        <Reveal>
          <p className="-mt-4 mb-8 max-w-2xl text-sm leading-relaxed text-fog">
            Regla de oro del proyecto: <span className="font-semibold text-paper">ninguna fase empieza sin cruzar su puerta</span>.
            Si un criterio no se cumple, se congela el calendario y se corrige — nunca se arrastra deuda a la fase siguiente.
          </p>
        </Reveal>
        <div className="space-y-3">
          {phaseGates.map((g, i) => {
            const p = phaseById(g.phaseId);
            return (
              <Reveal key={g.id} delay={i * 70}>
                <div
                  className="group flex flex-col gap-3 border border-line bg-panel/60 p-5 transition-all duration-200 hover:translate-x-1.5 hover:bg-panel md:flex-row md:items-center md:gap-6"
                  style={{ borderLeftWidth: "4px", borderLeftColor: p.color }}
                >
                  <div className="flex items-center gap-4 md:w-56 md:shrink-0">
                    <IconKeycard className="h-5 w-5 shrink-0" style={{ color: p.color } as CSSProperties} />
                    <div>
                      <p className="font-display text-sm text-paper">{g.id}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fog">tras {g.after}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-fog transition-colors duration-200 group-hover:text-paper">
                    {g.text}
                  </p>
                  <span
                    className="ml-auto hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.2em] md:block"
                    style={{ color: p.color }}
                  >
                    {p.name}
                  </span>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ live-ops -------------------------------- */

function LiveOps() {
  return (
    <section id="liveops" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head
          code="R5"
          kicker="Después de abrir las puertas"
          title={
            <>
              El hotel <span className="text-lime">nunca cierra</span>
            </>
          }
        />
        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal>
            <div className="hud-corners flex h-full flex-col border border-lime/50 bg-panel/70 p-6 md:p-7">
              <p className="font-display mb-4 flex items-center gap-2 text-xs tracking-wider text-lime">
                <IconClock className="h-4 w-4" /> CADENCIA DE CONTENIDO
              </p>
              <p className="font-display text-5xl leading-none text-paper md:text-6xl">
                1 PISO<span className="text-lime">/</span>
              </p>
              <p className="font-display mt-1 text-5xl leading-none text-lime md:text-6xl">2 SEMANAS</p>
              <p className="mt-5 text-sm leading-relaxed text-fog">
                El generador procedural convierte cada actualización en un evento: piso nuevo + regla nueva +
                cosmético de temporada. La comunidad vuelve porque <span className="text-paper">el hotel cambia antes de que se lo aprendan</span>.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="flex h-full flex-col border border-line bg-panel/60 p-6 md:p-7">
              <p className="font-display mb-5 flex items-center gap-2 text-xs tracking-wider text-paper">
                <IconStar className="h-4 w-4 text-amber" /> PRIMERAS ACTUALIZACIONES
              </p>
              <div className="space-y-4">
                {liveOpsUpdates.map((u) => (
                  <div key={u.version} className="group border border-line/70 bg-deep/50 p-4 transition-all duration-200 hover:border-amber/50 hover:bg-panel2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-display text-sm text-amber">{u.version}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fog">{u.when}</span>
                    </div>
                    <p className="font-display mt-1.5 text-base text-paper">«{u.title}»</p>
                    <p className="mt-1 text-xs leading-relaxed text-fog">{u.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={240}>
            <div className="flex h-full flex-col border border-line bg-panel/60 p-6 md:p-7">
              <p className="font-display mb-5 flex items-center gap-2 text-xs tracking-wider text-paper">
                <IconFlag className="h-4 w-4 text-cyan" /> KPIs OBJETIVO (MES 1)
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {kpiTargets.map((k) => (
                  <div
                    key={k.v}
                    className={`border border-line/70 bg-deep/50 p-3.5 transition-colors duration-200 hover:border-cyan/50 ${k.v.includes("clips") ? "col-span-2" : ""}`}
                  >
                    <p className="font-display text-lg leading-none text-cyan">{k.k}</p>
                    <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-fog">{k.v}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-fog">
                Medidos con el <span className="text-paper">Game Analytics de Roblox</span> cada lunes. Si la D1 cae de 30 %,
                se pausa el contenido nuevo y se pule el primer piso.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------- view ------------------------------------ */

export default function RoadmapView({
  onOpenGdd,
  onOpenLab,
  onOpenCode,
}: {
  onOpenGdd: () => void;
  onOpenLab: () => void;
  onOpenCode?: () => void;
}) {
  return (
    <div className="relative">
      <Cover />
      <WeekPlanner />
      <Gantt />
      <Milestones />
      <Gates />
      <LiveOps />

      <div className="border-t border-line/60 bg-deep/60 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-4 md:flex-row md:px-8">
          <p className="text-center text-xs leading-relaxed text-fog md:text-left">
            Este plan vive junto al GDD: cada viernes se marca el entregable y se revisa la puerta de fase.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={onOpenGdd}
              className="font-display cursor-pointer border-2 border-amber px-6 py-3 text-xs tracking-wider text-amber transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber hover:text-deep active:translate-y-0"
            >
              VER EL GDD COMPLETO
            </button>
            {onOpenCode && (
              <button
                onClick={onOpenCode}
                className="font-display cursor-pointer border-2 border-cyan px-6 py-3 text-xs tracking-wider text-cyan transition-all duration-200 hover:-translate-y-0.5 hover:bg-cyan hover:text-deep active:translate-y-0"
              >
                VER EL CÓDIGO COMPLETO →
              </button>
            )}
            <button
              onClick={onOpenLab}
              className="font-display cursor-pointer border-2 border-line px-6 py-3 text-xs tracking-wider text-fog transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan hover:text-cyan active:translate-y-0"
            >
              ← VOLVER AL LABORATORIO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
