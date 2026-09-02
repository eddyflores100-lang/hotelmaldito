import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  antiCheat,
  codeSnippets,
  coreLoop,
  currencies,
  dataStoreSchema,
  devProducts,
  difficultyTiers,
  entities,
  floorRules,
  folderTree,
  gamePasses,
  gddMeta,
  gddNav,
  integrationSteps,
  kpis,
  liveOps,
  monetizationPrinciples,
  pitch,
  pillars,
  proceduralCatalog,
  publishingChecklist,
  remotes,
  repLadder,
  risks,
  robloxServices,
  roles,
  sessionActs,
  shopItems,
  signatureScenarios,
} from "../data/gdd";
import { roadmap } from "../data/concepts";
import { useInView } from "../hooks";
import {
  IconArrow,
  IconBell,
  IconBook,
  IconBolt,
  IconBroom,
  IconCalendar,
  IconCart,
  IconCheck,
  IconClipboard,
  IconClock,
  IconCode,
  IconCoin,
  IconDatabase,
  IconDroplet,
  IconElevator,
  IconEye,
  IconFlame,
  IconGhost,
  IconKeycard,
  IconMap,
  IconMirror,
  IconShield,
  IconStar,
  IconTarget,
  IconWrench,
} from "./Icons";

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
  const { ref, inView } = useInView<HTMLDivElement>(0.1);
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

function Head({
  code,
  kicker,
  title,
}: {
  code: string;
  kicker: string;
  title: ReactNode;
}) {
  return (
    <Reveal className="mb-12 md:mb-14">
      <div className="flex items-baseline gap-4 md:gap-6">
        <span className="font-display text-5xl leading-none text-outline select-none md:text-7xl" aria-hidden="true">
          {code}
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-fog">{kicker}</p>
          <h2 className="font-display mt-2 text-3xl leading-[1.02] text-paper md:text-5xl">{title}</h2>
        </div>
      </div>
      <div className="mt-6 h-px w-full bg-gradient-to-r from-line via-line to-transparent" />
    </Reveal>
  );
}

function Glyph({ name, className }: { name: string; className?: string }) {
  switch (name) {
    case "bell": return <IconBell className={className} />;
    case "broom": return <IconBroom className={className} />;
    case "wrench": return <IconWrench className={className} />;
    case "cart": return <IconCart className={className} />;
    case "eye": return <IconEye className={className} />;
    case "mirror": return <IconMirror className={className} />;
    case "droplet": return <IconDroplet className={className} />;
    case "flame": return <IconFlame className={className} />;
    case "clipboard": return <IconClipboard className={className} />;
    case "coin": return <IconCoin className={className} />;
    case "star": return <IconStar className={className} />;
    default: return null;
  }
}

function SeverityPill({ level }: { level: string }) {
  const map: Record<string, string> = {
    Baja: "text-lime border-lime/50",
    Media: "text-cyan border-cyan/50",
    Alta: "text-amber border-amber/60",
  };
  return (
    <span className={`shrink-0 border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${map[level] ?? ""}`}>
      {level}
    </span>
  );
}

function ThreatDots({ level, color }: { level: number; color?: string }) {
  return (
    <span className="flex items-center gap-1.5" title={`Amenaza ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="h-2.5 w-2.5 rotate-45"
          style={{ background: i <= level ? color ?? "var(--color-amber)" : "var(--color-line)" }}
        />
      ))}
    </span>
  );
}

const floors = ["PB", "7", "13", "∞", "−1", "66", "∞", "3:33"];

function ElevatorIndicator() {
  const [i, setI] = useState(0);
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setI((v) => (v + 1) % floors.length), 1500);
    return () => clearInterval(t);
  }, [reduced]);
  return (
    <div className="mx-auto flex w-36 flex-col items-center border-2 border-line bg-deep px-4 py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-fog">Piso actual</p>
      <div key={i} className="panel-in font-display mt-2 text-5xl leading-none text-amber">
        {floors[i]}
      </div>
      <div className="mt-3 flex items-center gap-3 text-fog">
        <span className="text-[10px]">▲</span>
        <span className="h-px w-8 bg-line" />
        <span className="text-[10px]">▼</span>
      </div>
    </div>
  );
}

/* ----------------------------------- portada ---------------------------------- */

function Portada({ onBack }: { onBack: () => void }) {
  return (
    <section className="relative overflow-hidden pt-14">
      <div
        className="font-display pointer-events-none absolute -bottom-10 left-0 w-full text-center text-[26vw] leading-none text-outline opacity-40 select-none"
        aria-hidden="true"
      >
        ∞
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 md:px-8 md:py-24 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center lg:gap-16">
        <div className="relative z-10">
          <Reveal>
            <div className="flex flex-wrap items-center gap-3">
              <span className="hud-corners inline-flex items-center gap-2 border border-line bg-panel/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-fog">
                <IconBook className="h-4 w-4 text-amber" />
                Game Design Document · v1.0
              </span>
              <span className="inline-flex -rotate-2 items-center border border-amber/70 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-amber">
                Confidencial · uso interno
              </span>
            </div>
          </Reveal>
          <h1 className="font-display mt-8 leading-[0.95]">
            <Reveal delay={80}>
              <span className="block text-5xl text-paper sm:text-7xl xl:text-[5.5rem]">HOTEL</span>
            </Reveal>
            <Reveal delay={180}>
              <span className="block text-5xl text-amber sm:text-7xl xl:text-[5.5rem]">
                ∞ INFINITO
                <span className="blink ml-3 inline-block h-[0.8em] w-[0.42em] translate-y-[0.1em] bg-amber align-baseline" />
              </span>
            </Reveal>
          </h1>
          <Reveal delay={280}>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-fog md:text-lg">
              {pitch.lead}
            </p>
          </Reveal>
          <Reveal delay={380}>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#sinopsis"
                className="font-display group inline-flex items-center gap-3 border-2 border-amber bg-amber px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 hover:bg-transparent hover:text-amber hover:shadow-[0_0_32px_rgba(255,160,47,0.35)] active:translate-y-0"
              >
                BAJAR AL LOBBY
                <IconArrow className="h-4 w-4 rotate-90 transition-transform duration-200 group-hover:translate-y-1" />
              </a>
              <button
                onClick={onBack}
                className="font-display inline-flex cursor-pointer items-center gap-3 border-2 border-line px-7 py-3.5 text-sm text-fog transition-all duration-200 hover:border-cyan hover:text-cyan"
              >
                Volver al laboratorio
              </button>
            </div>
          </Reveal>
        </div>

        <Reveal delay={300} className="relative z-10">
          <div className="hud-corners border border-amber/40 bg-panel/80 p-6 md:p-7">
            <div className="mb-5 flex items-center justify-between border-b border-line pb-4">
              <span className="font-display text-xs tracking-wider text-paper">FICHA TÉCNICA</span>
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-lime">
                <span className="pulse-dot h-2 w-2 rounded-full bg-lime" /> GDD activo
              </span>
            </div>
            <ElevatorIndicator />
            <dl className="mt-6 space-y-3.5 text-sm">
              {gddMeta.map((m) => (
                <div key={m.k} className="flex items-start justify-between gap-4 border-b border-line/50 pb-3 last:border-0">
                  <dt className="text-fog">{m.k}</dt>
                  <dd className="text-right font-semibold text-paper">{m.v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border border-line bg-deep/70 p-3.5">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.22em]">
                <span className="text-fog">Prototipo vertical</span>
                <span className="text-amber">en curso · 35%</span>
              </div>
              <div className="h-1.5 w-full bg-line/60">
                <div className="grow-bar h-full bg-amber" style={{ width: "35%" }} />
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-fog">
                <IconGhost className="h-4 w-4 shrink-0 text-amber" />
                Objetivo: un piso jugable (P-13) con un rol y un evento de apagón.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ----------------------------------- sub-nav ---------------------------------- */

function SubNav() {
  const [active, setActive] = useState("sinopsis");
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  useEffect(() => {
    const sections = gddNav
      .map((n) => document.getElementById(n.id))
      .filter((el): el is HTMLElement => Boolean(el));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-38% 0px -55% 0px" },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="sticky top-14 z-40 border-y border-line bg-deep/92 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2.5 md:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <IconElevator className="mr-1 h-4 w-4 shrink-0 text-amber" />
        {gddNav.map((n) => (
          <button
            key={n.id}
            onClick={() =>
              document.getElementById(n.id)?.scrollIntoView({
                behavior: reduced ? "auto" : "smooth",
                block: "start",
              })
            }
            className={`font-display shrink-0 cursor-pointer border px-3 py-1.5 text-[11px] tracking-wider transition-all duration-200 ${
              active === n.id
                ? "border-amber bg-amber text-deep"
                : "border-line text-fog hover:border-fog hover:text-paper"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------ P0 -------------------------------------- */

function Sinopsis() {
  return (
    <section id="sinopsis" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P0" kicker="Sinopsis ejecutiva" title={<>La primera noche <span className="text-amber">nunca se olvida</span></>} />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <Reveal>
            <p className="text-xl leading-relaxed text-paper md:text-2xl">{pitch.lead}</p>
            <p className="mt-6 leading-relaxed text-fog">{pitch.body}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {["Turnos de 90 s", "1–4 jugadores", "Sin muertes: despidos", "Pisos procedurales", "Clip-friendly"].map((t) => (
                <span key={t} className="border border-line bg-panel/60 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-fog transition-colors hover:border-amber hover:text-amber">
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
          <div className="space-y-4">
            {pillars.map((p, i) => (
              <Reveal key={p.num} delay={i * 120}>
                <div
                  className="card-lift group border border-line bg-panel/60 p-5 hover:bg-panel2/80"
                  style={{ borderLeft: `3px solid ${p.color}` }}
                >
                  <div className="flex items-baseline gap-4">
                    <span className="font-display text-2xl text-outline transition-colors group-hover:text-paper" style={{ WebkitTextStroke: `1.5px ${p.color}` }}>
                      {p.num}
                    </span>
                    <h3 className="font-display text-base tracking-wide text-paper">{p.title}</h3>
                  </div>
                  <p className="mt-2.5 pl-11 text-sm leading-relaxed text-fog">{p.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ P1 -------------------------------------- */

function Plan() {
  return (
    <section id="plan" className="scroll-mt-28 border-t border-line/60 bg-deep/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P1" kicker="Plan de juego" title={<>El turno perfecto, <span className="text-amber">en 90 segundos</span></>} />

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          {/* core loop as elevator shaft */}
          <Reveal>
            <p className="font-display mb-8 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconClock className="h-4 w-4 text-amber" /> LOOP CENTRAL · UN CICLO POR PISO
            </p>
            <div className="relative ml-4 border-l-2 border-line pl-8">
              {coreLoop.map((s, i) => (
                <div key={s.step} className="group relative pb-9 last:pb-0">
                  <span className="absolute top-0.5 -left-[41px] flex h-5 w-5 rotate-45 items-center justify-center border-2 border-amber bg-deep transition-all duration-300 group-hover:bg-amber">
                    <span className="h-1.5 w-1.5 -rotate-45 bg-amber transition-colors group-hover:bg-deep" />
                  </span>
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="font-display border border-line bg-deep px-2 py-0.5 text-xs text-amber">{s.time}</span>
                    <h3 className="font-display text-lg tracking-wide text-paper">{s.step}</h3>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-fog">{s.desc}</p>
                  {i < coreLoop.length - 1 && (
                    <span className="font-display absolute -bottom-1 left-0 text-[10px] tracking-[0.3em] text-line">▼</span>
                  )}
                </div>
              ))}
            </div>
          </Reveal>

          {/* session acts */}
          <Reveal delay={150}>
            <p className="font-display mb-8 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconElevator className="h-4 w-4 text-amber" /> ESTRUCTURA DE SESIÓN
            </p>
            <div className="space-y-4">
              {sessionActs.map((a) => (
                <div key={a.act} className="card-lift hud-corners border border-line bg-panel/60 p-5 hover:border-amber/50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-2xl text-amber">{a.act}</span>
                      <h3 className="font-display text-base tracking-wide text-paper">{a.name}</h3>
                    </div>
                    <span className="shrink-0 border border-line px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-fog">
                      {a.mins}
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm leading-relaxed text-fog">{a.desc}</p>
                </div>
              ))}
            </div>

            <p className="font-display mt-10 mb-4 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconTarget className="h-4 w-4 text-amber" /> DIFICULTAD POR EDAD
            </p>
            <div className="overflow-hidden border border-line">
              {difficultyTiers.map((t, i) => (
                <div
                  key={t.ages}
                  className={`grid gap-1 p-4 transition-colors hover:bg-panel2/70 sm:grid-cols-[110px_150px_1fr] sm:gap-4 ${i % 2 ? "bg-deep/30" : "bg-panel/40"}`}
                >
                  <span className="font-display text-sm text-amber">{t.ages}</span>
                  <span className="font-display text-sm text-paper">{t.name}</span>
                  <span className="text-xs leading-relaxed text-fog sm:text-sm">{t.desc}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ P2 -------------------------------------- */

function Roles() {
  const [idx, setIdx] = useState(0);
  const role = roles[idx];
  return (
    <section id="roles" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P2" kicker="Roles de trabajo" title={<>Cuatro puestos, <span className="text-amber">un equipo</span></>} />
        <Reveal>
          <div className="flex flex-wrap gap-2.5">
            {roles.map((r, i) => (
              <button
                key={r.id}
                onClick={() => setIdx(i)}
                className={`font-display flex cursor-pointer items-center gap-2.5 border px-4 py-2.5 text-xs tracking-wider transition-all duration-200 md:text-sm ${
                  i === idx ? "border-amber bg-amber text-deep" : "border-line text-fog hover:border-fog hover:text-paper"
                }`}
              >
                <Glyph name={r.icon} className="h-4 w-4" />
                {r.name.toUpperCase()}
              </button>
            ))}
          </div>
        </Reveal>

        <div key={role.id} className="panel-in mt-8 grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="hud-corners border border-line bg-panel/70 p-6 md:p-7" style={{ borderTop: `3px solid ${role.color}` }}>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center border border-line bg-deep" style={{ color: role.color }}>
                <Glyph name={role.icon} className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-xl tracking-wide text-paper">{role.name}</h3>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fog">Puesto de turno</p>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-fog">{role.desc}</p>
            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-start justify-between gap-4 border-t border-line/60 pt-3">
                <span className="text-fog">Herramienta</span>
                <span className="text-right font-semibold" style={{ color: role.color }}>{role.tool}</span>
              </div>
              <div className="flex items-start justify-between gap-4 border-t border-line/60 pt-3">
                <span className="text-fog">Perk del rol</span>
                <span className="max-w-[240px] text-right text-paper">{role.perk}</span>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {Object.entries(role.stats).map(([k, v]) => (
                <div key={k}>
                  <div className="mb-1 flex justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
                    <span className="text-fog">{k}</span>
                    <span style={{ color: role.color }}>{v}</span>
                  </div>
                  <div className="h-1.5 w-full bg-line/60">
                    <div className="grow-bar h-full" style={{ width: `${v}%`, background: role.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-line bg-panel/50 p-6 md:p-7">
            <p className="font-display mb-5 text-xs tracking-wider text-fog">TAREAS DEL TURNO</p>
            <ul className="space-y-4">
              {role.tasks.map((t, i) => (
                <li key={t} className="flex items-start gap-3.5">
                  <span className="font-display mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border border-line bg-deep text-xs text-fog">
                    {i + 1}
                  </span>
                  <span className="pt-1 text-sm leading-relaxed text-paper">{t}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 border border-dashed border-line bg-deep/50 p-4">
              <p className="flex items-start gap-2.5 text-xs leading-relaxed text-fog">
                <IconBolt className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                Regla de oro: las tareas de <span className="font-semibold text-amber">dos roles a la vez</span> pagan ×3.
                El generador siempre siembra al menos una por piso para forzar la comunicación.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ P3 -------------------------------------- */

function Reglas() {
  return (
    <section id="reglas" className="scroll-mt-28 border-t border-line/60 bg-deep/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P3" kicker="Banco de reglas" title={<>Cada piso <span className="text-amber">tiene la suya</span></>} />
        <Reveal>
          <p className="mb-8 max-w-2xl leading-relaxed text-fog">
            El ModuleScript <span className="font-mono text-cyan">Rules</span> guarda más de 30 reglas. Cada piso sortea 1 o 2
            según la dificultad. Romperla no mata: te «despiden» — reapareces en el lobby con un cono de cartón y el equipo
            pierde parte de las propinas del turno.
          </p>
        </Reveal>
        <div className="grid gap-3 md:grid-cols-2">
          {floorRules.map((r, i) => (
            <Reveal key={r.rule} delay={(i % 2) * 100}>
              <div className="card-lift group flex items-center justify-between gap-4 border border-line bg-panel/60 px-5 py-4 hover:border-amber/50 hover:bg-panel2/70">
                <div className="min-w-0">
                  <p className="font-medium text-paper">«{r.rule}»</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fog">{r.floor}</p>
                </div>
                <SeverityPill level={r.severity} />
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={120}>
          <p className="mt-6 text-xs text-fog">
            + 22 reglas más en el banco interno: «No tararear en los ascensores», «El minibar cobra en sustos»…
            Cada temporada añade 4 reglas nuevas votadas por la comunidad.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------ P4 -------------------------------------- */

function Escenarios() {
  const [open, setOpen] = useState(0);
  return (
    <section id="escenarios" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P4" kicker="Escenarios" title={<>Tres pisos firma + <span className="text-amber">generador infinito</span></>} />

        <div className="space-y-3">
          {signatureScenarios.map((s, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={s.code} delay={i * 90}>
                <div className={`border transition-colors duration-300 ${isOpen ? "border-amber/60 bg-panel/70" : "border-line bg-panel/50 hover:border-fog/60"}`}>
                  <button
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left md:gap-6 md:px-7 md:py-5"
                  >
                    <span className="font-display shrink-0 border border-amber/60 bg-deep px-2.5 py-1 text-sm text-amber">{s.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="font-display block text-base tracking-wide text-paper md:text-xl">{s.name}</span>
                      <span className="mt-0.5 hidden text-xs text-fog sm:block">{s.tagline}</span>
                    </span>
                    <ThreatDots level={s.threat} />
                    <span className={`font-display shrink-0 text-xl text-amber transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}>+</span>
                  </button>

                  {isOpen && (
                    <div className="panel-in grid gap-6 border-t border-line/70 px-5 py-6 md:grid-cols-2 md:px-7 lg:grid-cols-[1fr_1fr_1fr]">
                      <div>
                        <p className="font-display mb-3 text-[11px] tracking-[0.2em] text-amber">OBJETIVOS</p>
                        <ul className="space-y-2.5">
                          {s.objectives.map((o) => (
                            <li key={o} className="flex items-start gap-2.5 text-sm leading-relaxed text-paper">
                              <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" /> {o}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="font-display mb-3 text-[11px] tracking-[0.2em] text-amber">EVENTOS CLAVE</p>
                        <ul className="space-y-2.5">
                          {s.events.map((e) => (
                            <li key={e} className="flex items-start gap-2.5 text-sm leading-relaxed text-fog">
                              <IconBolt className="mt-0.5 h-4 w-4 shrink-0 text-cyan" /> {e}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-5 border border-line bg-deep/60 p-3.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fog">Entidad del piso</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-paper">{s.entity}</p>
                        </div>
                      </div>
                      <div className="md:col-span-2 lg:col-span-1">
                        <p className="font-display mb-3 text-[11px] tracking-[0.2em] text-amber">BOTÍN</p>
                        <p className="text-sm leading-relaxed text-paper">{s.loot}</p>
                        <p className="font-display mt-5 mb-3 text-[11px] tracking-[0.2em] text-amber">NOTA DE DISEÑO</p>
                        <p className="border-l-2 border-amber/60 pl-3.5 text-sm leading-relaxed text-fog">{s.design}</p>
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-14">
          <p className="font-display mb-6 flex items-center gap-2.5 text-sm tracking-wider text-paper">
            <IconMap className="h-4 w-4 text-amber" /> CATÁLOGO PROCEDURAL · SE SORTEAN EN CADA TURNO
          </p>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {proceduralCatalog.map((p, i) => (
            <Reveal key={p.code} delay={(i % 3) * 90}>
              <div className="card-lift h-full border border-line bg-panel/50 p-5 hover:border-cyan/60">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-display border border-line bg-deep px-2 py-0.5 text-xs text-cyan">{p.code}</span>
                  <ThreatDots level={p.threat} color="var(--color-cyan)" />
                </div>
                <h3 className="font-display mt-3 text-sm tracking-wide text-paper">{p.name}</h3>
                <p className="mt-2 text-xs leading-relaxed text-fog">{p.rule}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ P5 -------------------------------------- */

function Entidades() {
  return (
    <section id="entidades" className="scroll-mt-28 border-t border-line/60 bg-deep/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P5" kicker="Bestiario del hotel" title={<>Los huéspedes <span className="text-amber">que no existen</span></>} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((e, i) => (
            <Reveal key={e.name} delay={(i % 3) * 100}>
              <div className="card-lift group h-full border border-line bg-panel/60 p-5 hover:bg-panel2/80" style={{ borderTop: `3px solid ${e.color}` }}>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-11 w-11 items-center justify-center border border-line bg-deep transition-transform duration-300 group-hover:-rotate-6" style={{ color: e.color }}>
                    <Glyph name={e.glyph} className="h-5 w-5" />
                  </span>
                  <span className="border border-line px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-fog">{e.floor}</span>
                </div>
                <h3 className="font-display mt-4 text-base tracking-wide text-paper">{e.name}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-fog">
                  <span className="font-bold uppercase tracking-[0.15em] text-paper/70">Patrón · </span>
                  {e.pattern}
                </p>
                <p className="mt-3 border-t border-line/60 pt-3 text-xs leading-relaxed text-fog">
                  <span className="font-bold uppercase tracking-[0.15em]" style={{ color: e.color }}>Cómo frenarlo · </span>
                  {e.counter}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={150}>
          <p className="mt-6 flex items-start gap-2.5 text-xs leading-relaxed text-fog">
            <IconGhost className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            Todas las entidades se deciden en el servidor (EntityDirector) y se animan con PathfindingService.
            El cliente solo recibe el aviso y reproduce el susto: imposible hacer trampas «viendo» al huésped antes de tiempo.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------ P6 -------------------------------------- */

function Economia() {
  return (
    <section id="economia" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P6" kicker="Economía y progresión" title={<>De botones <span className="text-amber">a Gerente ∞</span></>} />
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <Reveal>
            <p className="font-display mb-8 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconElevator className="h-4 w-4 text-amber" /> ESCALERA DE REPUTACIÓN
            </p>
            <div className="relative ml-3 border-l-2 border-line pl-7">
              {[...repLadder].reverse().map((r) => (
                <div key={r.rank} className="group relative pb-7 last:pb-0">
                  <span className="absolute top-1 -left-[35px] h-4 w-4 rotate-45 border-2 bg-deep transition-transform duration-300 group-hover:scale-125" style={{ borderColor: r.color }} />
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-base tracking-wide" style={{ color: r.color }}>{r.rank}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fog">{r.range}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-fog">{r.perk}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="font-display mb-6 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconCoin className="h-4 w-4 text-amber" /> DOS MONEDAS, CERO PAY-TO-WIN
            </p>
            <div className="space-y-4">
              {currencies.map((c) => (
                <div key={c.name} className="card-lift hud-corners border border-line bg-panel/60 p-5 hover:bg-panel2/80">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center border border-line bg-deep" style={{ color: c.color }}>
                      <Glyph name={c.icon} className="h-5 w-5" />
                    </span>
                    <h3 className="font-display text-base tracking-wide text-paper">{c.name}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-fog">{c.desc}</p>
                </div>
              ))}
            </div>
            <p className="font-display mt-8 mb-4 text-xs tracking-wider text-fog">TIENDA DE PROPINAS · COSMÉTICOS</p>
            <div className="flex flex-wrap gap-2.5">
              {shopItems.map((s) => (
                <span key={s} className="border border-line bg-panel/50 px-3 py-1.5 text-xs text-fog transition-all duration-200 hover:-translate-y-0.5 hover:border-lime hover:text-lime">
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ P7 -------------------------------------- */

function Monetizacion() {
  return (
    <section id="monetizacion" className="scroll-mt-28 border-t border-line/60 bg-deep/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P7" kicker="Monetización" title={<>Robux que <span className="text-amber">no rompen el susto</span></>} />
        <div className="grid gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
          <div>
            <Reveal>
              <p className="font-display mb-5 text-xs tracking-wider text-fog">GAME PASSES · COMPRA ÚNICA</p>
            </Reveal>
            <div className="space-y-3">
              {gamePasses.map((g, i) => (
                <Reveal key={g.name} delay={i * 80}>
                  <div className="card-lift flex flex-wrap items-center gap-4 border border-line bg-panel/60 p-5 hover:border-amber/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-base tracking-wide text-paper">{g.name}</h3>
                        <span className="border border-amber/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber">{g.tag}</span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-fog">{g.desc}</p>
                    </div>
                    <span className="font-display shrink-0 border border-line bg-deep px-3.5 py-2 text-lg text-amber">{g.price}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal delay={120}>
              <p className="font-display mt-8 mb-4 text-xs tracking-wider text-fog">DEV PRODUCTS · CONSUMIBLES</p>
            </Reveal>
            <div className="grid gap-3 sm:grid-cols-2">
              {devProducts.map((d) => (
                <Reveal key={d.name}>
                  <div className="border border-line bg-panel/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-sm text-paper">{d.name}</h3>
                      <span className="font-display text-base text-cyan">{d.price}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-fog">{d.note}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={150}>
            <div className="hud-corners sticky top-36 border border-line bg-panel/70 p-6 md:p-7">
              <p className="font-display mb-5 flex items-center gap-2.5 text-sm tracking-wider text-paper">
                <IconKeycard className="h-4 w-4 text-amber" /> PRINCIPIOS DE TIENDA
              </p>
              <ul className="space-y-4">
                {monetizationPrinciples.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" />
                    <span className="text-sm leading-relaxed text-fog">{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-line pt-5">
                <p className="text-xs leading-relaxed text-fog">
                  Modelo de referencia: los top del género venden <span className="font-semibold text-paper">cosméticos 70 / conveniencia 30</span>.
                  Nada de ventajas competitivas: un jugador gratis debe poder ganar a uno de pago en un turno perfecto.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ P8 -------------------------------------- */

function LineaArbol({ line }: { line: string }) {
  const [left, right] = line.split("←");
  const isRoot = !left.trim().startsWith("│") && !left.trim().startsWith("├") && !left.trim().startsWith("└") && left.trim().length > 0;
  return (
    <div>
      <span className={isRoot ? "text-cyan" : "text-paper/85"}>{left}</span>
      {right !== undefined && <span className="text-fog/80">←{right}</span>}
    </div>
  );
}

function LineaCodigo({ line }: { line: string }) {
  const trimmed = line.trim();
  if (trimmed.startsWith("--")) return <div className="text-fog/70 italic">{line}</div>;
  const idx = line.indexOf(" --");
  if (idx > -1) {
    return (
      <div>
        <span className="text-paper/90">{line.slice(0, idx)}</span>
        <span className="text-fog/70 italic">{line.slice(idx)}</span>
      </div>
    );
  }
  return <div className="text-paper/90">{line || " "}</div>;
}

function Tecnica() {
  const [snippet, setSnippet] = useState(0);
  const active = codeSnippets[snippet];
  return (
    <section id="tecnica" className="scroll-mt-28 border-t border-line/60 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P8" kicker="Integración en Roblox" title={<>Cómo se conecta <span className="text-amber">a la plataforma</span></>} />

        <Reveal>
          <p className="mb-10 max-w-3xl leading-relaxed text-fog">
            Un juego de Roblox es una <span className="font-semibold text-paper">«experiencia»</span> publicada en la nube de la plataforma:
            se construye en <span className="font-mono text-cyan">Roblox Studio</span>, se programa en <span className="font-mono text-cyan">Luau</span> y
            Roblox sirve los servidores, el matchmaking, los pagos y el guardado. Así se organiza HOTEL ∞:
          </p>
        </Reveal>

        {/* steps */}
        <div className="mb-14 grid gap-3 md:grid-cols-2">
          {integrationSteps.map((s, i) => (
            <Reveal key={s.title} delay={(i % 2) * 90}>
              <div className="card-lift flex h-full gap-4 border border-line bg-panel/60 p-5 hover:border-amber/50">
                <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center border border-amber/60 bg-deep text-sm text-amber">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-display text-sm tracking-wide text-paper">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-fog">{s.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* tree + code */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Reveal>
            <p className="font-display mb-4 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconDatabase className="h-4 w-4 text-amber" /> EXPLORER · ESTRUCTURA DEL LUGAR
            </p>
            <div className="overflow-x-auto border border-line bg-deep p-5 font-mono text-[12px] leading-[1.75] md:text-[13px]">
              {folderTree.split("\n").map((l, i) => (
                <LineaArbol key={i} line={l} />
              ))}
            </div>
            <p className="mt-3 text-xs text-fog">
              Todo lo que el jugador no debe ver vive en <span className="font-mono text-cyan">ServerStorage</span>: los rigs de
              entidades nunca llegan al cliente hasta que el servidor decide que aparecen.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <p className="font-display mb-4 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconCode className="h-4 w-4 text-amber" /> LUAU · TRES SISTEMAS CLAVE
            </p>
            <div className="flex flex-wrap gap-2">
              {codeSnippets.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => setSnippet(i)}
                  className={`font-display cursor-pointer border px-3 py-1.5 text-[11px] tracking-wider transition-all duration-200 ${
                    i === snippet ? "border-amber bg-amber text-deep" : "border-line text-fog hover:border-fog hover:text-paper"
                  }`}
                >
                  {c.tab.toUpperCase()}
                </button>
              ))}
            </div>
            <div key={active.id} className="panel-in mt-3 border border-line bg-deep">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
                <span className="font-mono text-[11px] text-amber">{active.file}</span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fog">Luau</span>
              </div>
              <pre className="max-h-[430px] overflow-auto p-4 font-mono text-[11.5px] leading-[1.7] md:text-[12.5px]">
                {active.code.split("\n").map((l, i) => (
                  <LineaCodigo key={i} line={l} />
                ))}
              </pre>
            </div>
            <p className="mt-3 text-xs text-fog">{active.note}</p>
          </Reveal>
        </div>

        {/* tables */}
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          <Reveal>
            <p className="font-display mb-4 text-sm tracking-wider text-paper">DATASTORE · PERFIL DEL JUGADOR</p>
            <div className="overflow-x-auto border border-line bg-panel/50">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b-2 border-line text-left">
                    <th className="p-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fog">Campo</th>
                    <th className="p-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fog">Tipo</th>
                    <th className="p-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fog">Qué guarda</th>
                  </tr>
                </thead>
                <tbody>
                  {dataStoreSchema.map((r, i) => (
                    <tr key={r.field} className={`border-b border-line/60 transition-colors hover:bg-panel2/70 ${i % 2 ? "bg-deep/30" : ""}`}>
                      <td className="p-3.5 font-mono text-xs text-amber">{r.field}</td>
                      <td className="p-3.5 font-mono text-xs text-cyan">{r.type}</td>
                      <td className="p-3.5 text-xs text-fog">{r.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className="font-display mb-4 text-sm tracking-wider text-paper">REMOTES · RED CLIENTE ↔ SERVIDOR</p>
            <div className="overflow-x-auto border border-line bg-panel/50">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b-2 border-line text-left">
                    <th className="p-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fog">Evento</th>
                    <th className="p-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fog">Dirección</th>
                    <th className="p-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-fog">Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {remotes.map((r, i) => (
                    <tr key={r.name} className={`border-b border-line/60 transition-colors hover:bg-panel2/70 ${i % 2 ? "bg-deep/30" : ""}`}>
                      <td className="p-3.5 font-mono text-xs text-amber">{r.name}</td>
                      <td className="p-3.5">
                        <span className={`border px-2 py-0.5 font-mono text-[10px] font-bold ${r.dir.startsWith("S") ? "border-cyan/50 text-cyan" : "border-lime/50 text-lime"}`}>
                          {r.dir}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-fog">{r.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>

        {/* services + security */}
        <Reveal className="mt-14">
          <p className="font-display mb-4 text-sm tracking-wider text-paper">SERVICIOS DE ROBLOX QUE USA EL JUEGO</p>
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {robloxServices.map((s, i) => (
            <Reveal key={s.name} delay={(i % 4) * 70}>
              <div className="card-lift h-full border border-line bg-panel/50 p-4 hover:border-cyan/60">
                <p className="font-mono text-xs font-bold text-cyan">{s.name}</p>
                <p className="mt-2 text-xs leading-relaxed text-fog">{s.use}</p>
              </div>
            </Reveal>
          ))}
          <Reveal delay={210}>
            <div className="card-lift h-full border border-amber/50 bg-panel/60 p-4 hover:border-amber">
              <p className="font-mono text-xs font-bold text-amber">Studio → Publicar</p>
              <p className="mt-2 text-xs leading-relaxed text-fog">Cada build se publica como versión nueva con rollback de un clic.</p>
            </div>
          </Reveal>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full border border-line bg-panel/60 p-6">
              <p className="font-display mb-4 flex items-center gap-2.5 text-sm tracking-wider text-paper">
                <IconShield className="h-4 w-4 text-amber" /> SERVIDOR AUTORITATIVO · ANTI-EXPLOITS
              </p>
              <ul className="space-y-3">
                {antiCheat.map((a) => (
                  <li key={a} className="flex items-start gap-3 text-sm leading-relaxed text-fog">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-amber" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="h-full border border-line bg-panel/60 p-6">
              <p className="font-display mb-4 flex items-center gap-2.5 text-sm tracking-wider text-paper">
                <IconCheck className="h-4 w-4 text-lime" /> CHECKLIST DE PUBLICACIÓN
              </p>
              <ul className="space-y-3">
                {publishingChecklist.map((c) => (
                  <li key={c} className="flex items-start gap-3 text-sm leading-relaxed text-fog">
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-lime" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------ P9 -------------------------------------- */

function Produccion() {
  const chanceColor: Record<string, string> = {
    Bajo: "text-lime border-lime/50",
    Medio: "text-cyan border-cyan/50",
    Alto: "text-amber border-amber/60",
  };
  return (
    <section id="produccion" className="scroll-mt-28 border-t border-line/60 bg-deep/40 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Head code="P9" kicker="Producción y live-ops" title={<>12 semanas hasta <span className="text-amber">la inauguración</span></>} />

        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <p className="font-display mb-8 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconFlagIcon /> ROADMAP DE LANZAMIENTO
            </p>
            <div className="relative space-y-6 border-l border-line pl-6">
              {roadmap.map((r, i) => (
                <div key={r.phase} className="group relative">
                  <span
                    className="absolute top-1 -left-[31px] h-2.5 w-2.5 rotate-45 transition-transform duration-300 group-hover:scale-150"
                    style={{ background: ["var(--color-amber)", "var(--color-cyan)", "var(--color-lime)", "var(--color-paper)"][i] }}
                  />
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-fog">
                    <span className="text-paper">{r.phase}</span> · {r.weeks}
                  </p>
                  <p className="font-display mt-1 text-sm text-paper">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-fog">{r.text}</p>
                </div>
              ))}
            </div>

            <p className="font-display mt-12 mb-5 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconCalendar className="h-4 w-4 text-amber" /> TEMPORADAS DE LIVE-OPS
            </p>
            <div className="space-y-3">
              {liveOps.map((s) => (
                <div key={s.season} className="card-lift border border-line bg-panel/60 p-4 hover:border-amber/50">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-sm text-amber">{s.season}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fog">{s.window}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-fog">{s.content}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <p className="font-display mb-6 flex items-center gap-2.5 text-sm tracking-wider text-paper">
              <IconTarget className="h-4 w-4 text-amber" /> KPIs DEL PRIMER TRIMESTRE
            </p>
            <div className="grid grid-cols-2 gap-3">
              {kpis.map((k) => (
                <div key={k.metric} className="card-lift border border-line bg-panel/60 p-4 hover:border-cyan/60">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fog">{k.metric}</p>
                  <p className="font-display mt-2 text-2xl text-cyan">{k.target}</p>
                  <p className="mt-1 text-[11px] text-fog">{k.note}</p>
                </div>
              ))}
              <div className="border border-amber/50 bg-amber/8 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber">Meta global</p>
                <p className="font-display mt-2 text-lg leading-tight text-paper">Entrar al top-100 del género en 90 días</p>
              </div>
            </div>

            <p className="font-display mt-12 mb-5 text-sm tracking-wider text-paper">RIESGOS Y MITIGACIÓN</p>
            <div className="overflow-hidden border border-line">
              {risks.map((r, i) => (
                <div key={r.risk} className={`p-4 transition-colors hover:bg-panel2/70 ${i % 2 ? "bg-deep/30" : "bg-panel/40"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm text-paper">{r.risk}</h3>
                    <span className={`border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${chanceColor[r.chance]}`}>
                      Prob. {r.chance}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-fog">{r.mitigation}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function IconFlagIcon() {
  return <IconClock className="h-4 w-4 text-amber" />;
}

/* ------------------------------------ CTA -------------------------------------- */

function Closing({ onBack }: { onBack: () => void }) {
  return (
    <section className="relative overflow-hidden border-t border-line/60 py-24 md:py-32">
      <div className="glow-amber pointer-events-none absolute top-0 left-1/2 h-[30rem] w-[50rem] -translate-x-1/2" />
      <div className="relative mx-auto max-w-4xl px-4 text-center md:px-8">
        <Reveal>
          <p className="font-display text-xs tracking-[0.3em] text-fog">FIN DEL DOCUMENTO · EMPIEZA EL TURNO</p>
          <h2 className="font-display mt-6 text-4xl leading-[0.98] text-paper md:text-6xl">
            ¿LISTOS PARA LA<br />
            <span className="text-amber">PRIMERA NOCHE?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-fog">
            El GDD está cerrado y el prototipo vertical en marcha. Siguiente parada: P-13 jugable en tres semanas,
            con un rol, una regla y un apagón que dé risa.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#sinopsis"
              className="font-display group inline-flex items-center gap-3 border-2 border-amber bg-amber px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 hover:bg-transparent hover:text-amber hover:shadow-[0_0_32px_rgba(255,160,47,0.35)]"
            >
              RELEER EL PLAN
              <IconArrow className="h-4 w-4 -rotate-90 transition-transform duration-200 group-hover:-translate-y-1" />
            </a>
            <button
              onClick={onBack}
              className="font-display inline-flex cursor-pointer items-center gap-3 border-2 border-line px-7 py-3.5 text-sm text-fog transition-all duration-200 hover:border-cyan hover:text-cyan"
            >
              Volver al laboratorio
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------- view ------------------------------------- */

export default function GddView({ onBack }: { onBack: () => void }) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    window.scrollTo(0, 0);
  }, []);
  return (
    <div className="panel-in">
      <Portada onBack={onBack} />
      <SubNav />
      <Sinopsis />
      <Plan />
      <Roles />
      <Reglas />
      <Escenarios />
      <Entidades />
      <Economia />
      <Monetizacion />
      <Tecnica />
      <Produccion />
      <Closing onBack={onBack} />
    </div>
  );
}
