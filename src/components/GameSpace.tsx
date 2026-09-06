/* ============================================================
   CHATARRA CÓSMICA v2 — interfaz React del juego
   Avatar R6 · sectores · piratas · herramientas · misiones
   GameLab by AliceLabs
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Anchor, Cog, Crosshair, Gem, Hash, Heart, Magnet, Pause, Play, Radio, Shield, Skull, Sun, Swords, Volume2, VolumeX, Wrench, X, Zap } from "lucide-react";
import { SpaceGame, MODULE_INFO, SECTORS, TOOL_INFO, type ModuleType, type SpaceHud, type Tool } from "../games/space/SpaceGame";

type Toast = { id: number; msg: string; kind: "ok" | "bad" | "info" };
type Banner = { id: number; title: string; sub: string };

const MODULE_ICONS: Record<ModuleType, typeof Heart> = {
  oxygen: Heart,
  energy: Zap,
  workshop: Cog,
  shield: Shield,
  hangar: Anchor,
  antenna: Radio,
};

const TOOL_ICONS: Record<Tool, typeof Heart> = { magnet: Magnet, blaster: Crosshair, wrench: Wrench };

export default function GameSpace({ onExit }: { onExit?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SpaceGame | null>(null);
  const idRef = useRef(0);

  const [hud, setHud] = useState<SpaceHud | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [buildOpen, setBuildOpen] = useState(false);
  const [tab, setTab] = useState<"mods" | "shop" | "missions">("mods");
  const [, setTick] = useState(0);
  const isTouch = useRef(false);

  useEffect(() => {
    isTouch.current = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (!canvasRef.current) return;
    const game = new SpaceGame(canvasRef.current, {
      onHud: (s) => setHud({ ...s }),
      onToast: (msg, kind = "info") => {
        const id = ++idRef.current;
        setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
      },
      onBanner: (title, sub) => setBanner({ id: ++idRef.current, title, sub }),
    });
    gameRef.current = game;
    game.start();
    if (window.location.hostname === "localhost") {
      (window as unknown as { __space?: SpaceGame }).__space = game;
    }
    return () => game.dispose();
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 3400);
    return () => window.clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (hud?.paused && started && !paused && hud.phase === "playing") setPaused(true);
  }, [hud?.paused, started, paused, hud?.phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyB" && started && !paused) {
        e.preventDefault();
        setBuildOpen((o) => {
          const next = !o;
          gameRef.current?.setUiOpen(next);
          return next;
        });
      }
      if (e.code === "Escape" && buildOpen) {
        setBuildOpen(false);
        gameRef.current?.setUiOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, paused, buildOpen]);

  const play = () => {
    gameRef.current?.begin();
    setStarted(true);
  };

  const doPause = (p: boolean) => {
    setPaused(p);
    gameRef.current?.setPaused(p);
  };

  /* joystick táctil */
  const joyRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0, active: false });
  const joyDown = (e: React.PointerEvent) => {
    if (joyRef.current) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    joyRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
    setJoyKnob({ x: 0, y: 0, active: true });
  };
  const joyMove = (e: React.PointerEvent) => {
    const j = joyRef.current;
    if (!j || j.id !== e.pointerId) return;
    const dx = e.clientX - j.ox;
    const dy = e.clientY - j.oy;
    const max = 46;
    const len = Math.hypot(dx, dy);
    const cl = len > max ? max / len : 1;
    const nx = dx * cl, ny = dy * cl;
    setJoyKnob({ x: nx, y: ny, active: true });
    gameRef.current?.setJoystick(nx / max, ny / max);
  };
  const joyUp = () => {
    joyRef.current = null;
    setJoyKnob({ x: 0, y: 0, active: false });
    gameRef.current?.setJoystick(0, 0);
  };

  /* zona de cámara táctil */
  const lookRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const lookDown = (e: React.PointerEvent) => {
    if (lookRef.current) return;
    lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const lookMove = (e: React.PointerEvent) => {
    const l = lookRef.current;
    if (!l || l.id !== e.pointerId) return;
    gameRef.current?.setLook(e.clientX - l.x, e.clientY - l.y);
    lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
  };
  const lookUp = () => {
    lookRef.current = null;
  };

  const phase = hud?.phase ?? "intro";
  const showIntro = !started;
  const o2 = hud?.o2 ?? 100;
  const maxO2 = hud?.maxO2 ?? 100;
  const o2Pct = Math.round((o2 / maxO2) * 100);
  const o2Color = o2Pct > 35 ? "#38e1d4" : o2Pct > 15 ? "#ffa02f" : "#ff5a4e";
  const hp = hud?.hp ?? 100;
  const hpColor = hp > 50 ? "#7dff6a" : hp > 25 ? "#ffa02f" : "#ff5a4e";
  const metal = hud?.metal ?? 0;
  const storm = hud?.storm ?? "calm";
  const stormIn = hud?.stormIn ?? 0;
  const mods = hud?.modules ?? 0;
  const tool = hud?.tool ?? "magnet";
  const portal = hud?.portal;

  const openBuild = (open: boolean) => {
    setBuildOpen(open);
    gameRef.current?.setUiOpen(open);
    if (open) setTick((t) => t + 1);
  };

  /* minimapa canvas */
  const miniRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = miniRef.current;
    const mm = hud?.minimap;
    if (!cv || !mm) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const S = 128, R = S / 2 - 4, WORLD = 90;
    g.clearRect(0, 0, S, S);
    g.fillStyle = "rgba(8,14,26,0.85)";
    g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 1, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#223350"; g.lineWidth = 1.5;
    g.stroke();
    const px = (x: number) => S / 2 + (x / WORLD) * R;
    const pz = (z: number) => S / 2 + (z / WORLD) * R;
    /* estación */
    g.fillStyle = "#38e1d4";
    g.beginPath(); g.arc(S / 2, S / 2, 7, 0, Math.PI * 2); g.fill();
    /* portal */
    if (mm.portal) {
      g.strokeStyle = "#b58aff"; g.lineWidth = 2;
      g.beginPath(); g.arc(px(mm.portal[0]), pz(mm.portal[1]), 4, 0, Math.PI * 2); g.stroke();
    }
    /* asteroides */
    g.fillStyle = "#8a7a62";
    for (let i = 0; i < mm.rocks.length; i += 2) {
      g.fillRect(px(mm.rocks[i]) - 1.5, pz(mm.rocks[i + 1]) - 1.5, 3, 3);
    }
    /* studs */
    g.fillStyle = "#f4c542";
    for (let i = 0; i < mm.items.length; i += 2) {
      g.fillRect(px(mm.items[i]) - 1, pz(mm.items[i + 1]) - 1, 2, 2);
    }
    /* piratas */
    g.fillStyle = "#ff5040";
    for (let i = 0; i < mm.enemies.length; i += 2) {
      g.beginPath(); g.arc(px(mm.enemies[i]), pz(mm.enemies[i + 1]), 2.6, 0, Math.PI * 2); g.fill();
    }
    /* jugador */
    g.fillStyle = "#ffffff";
    g.beginPath(); g.arc(px(mm.px), pz(mm.pz), 3, 0, Math.PI * 2); g.fill();
  }, [hud?.minimap]);

  const ToolChip = ({ t }: { t: Tool }) => {
    const Icon = TOOL_ICONS[t];
    const active = tool === t;
    return (
      <button
        onClick={() => gameRef.current?.setToolPublic(t)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-display text-[10px] backdrop-blur transition ${
          active
            ? "border-[#38e1d4] bg-[#0f2b3a] text-[#9df3ec] shadow-[0_0_12px_rgba(56,225,212,0.3)]"
            : "border-[#223350] bg-[#0b1526]/85 text-[#8fa4c2] hover:text-white"
        }`}
      >
        <Icon size={13} />
        <span className="hidden sm:inline">{TOOL_INFO[t].name}</span>
        <span className="rounded bg-[#223350] px-1 text-[9px]">{TOOL_INFO[t].key}</span>
      </button>
    );
  };

  return (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-[#05070e]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {/* flash de daño / calor */}
      {hud && hud.hurtFlash > 0 && (
        <div className="pointer-events-none absolute inset-0 bg-red-500" style={{ opacity: Math.min(0.4, hud.hurtFlash * 0.18) }} />
      )}

      {/* ============================== HUD ============================== */}
      {phase === "playing" && !showIntro && (
        <>
          {/* arriba-izquierda: vida + O2 + metal + remolque */}
          <div className="absolute left-3 top-3 flex max-w-[46vw] flex-col gap-1.5">
            <div className="rounded-xl border border-[#223350] bg-[#0b1526]/85 px-3 py-2 backdrop-blur">
              <div className="flex items-center gap-2">
                <Heart size={13} style={{ color: hpColor }} />
                <div className="h-2 w-20 overflow-hidden rounded-full bg-[#13213c] sm:w-28">
                  <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${hp}%`, background: hpColor }} />
                </div>
                <Heart size={13} style={{ color: o2Color }} />
                <div className="h-2 w-20 overflow-hidden rounded-full bg-[#13213c] sm:w-28">
                  <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${o2Pct}%`, background: o2Color }} />
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="font-display text-lg leading-none text-[#f4c542]">{metal} ✦</span>
                <span className="flex items-center gap-1 font-display text-[11px] text-[#38e1d4]">
                  <Magnet size={12} /> {hud?.towing ?? 0}/2
                </span>
                {(hud?.deaths ?? 0) > 0 && (
                  <span className="flex items-center gap-1 font-display text-[11px] text-[#ff6b5e]">
                    <Skull size={12} /> {hud?.deaths ?? 0}
                  </span>
                )}
              </div>
            </div>
            {/* misiones */}
            <div className="flex flex-col gap-1">
              {hud?.missions.map((m, i) => (
                <div key={i} className="rounded-lg border border-[#223350] bg-[#0b1526]/75 px-2.5 py-1 text-[10px] text-[#8fa4c2] backdrop-blur">
                  <span className="text-[#e9f1fc]">{m.text}</span>
                  <span className="ml-1 text-[#f4c542]">{m.prog}/{m.goal}</span>
                  <span className="ml-1 text-[#38e1d4]">+{m.reward}✦</span>
                </div>
              ))}
            </div>
          </div>

          {/* arriba-centro: sector + metas + tormenta + oleada */}
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-[#5a3ca0] bg-[#160d2c]/85 px-3 py-1.5 backdrop-blur">
              <Gem size={13} className="text-[#b58aff]" />
              <span className="font-display text-xs text-[#b58aff]">{hud?.sectorName ?? SECTORS[0].name}</span>
              <span className="hidden text-[10px] text-[#8fa4c2] sm:inline">· {hud?.sectorSub}</span>
            </div>
            {portal && hud && hud.sector < SECTORS.length - 1 && (
              <div className="flex items-center gap-2 rounded-lg border border-[#223350] bg-[#0b1526]/85 px-2.5 py-1 text-[10px] backdrop-blur">
                <span className={portal.ready ? "text-[#b58aff]" : "text-[#8fa4c2]"}>
                  {portal.ready ? "⚡ PORTAL ACTIVO" : `Módulos ${portal.mods}/${portal.goalM}`}
                </span>
                {portal.goal > 0 && (
                  <span className={portal.ready ? "text-[#b58aff]" : "text-[#8fa4c2]"}>
                    {portal.ready ? "" : `· Metal ${portal.metal}/${portal.goal}`}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[10px] backdrop-blur"
                style={
                  storm === "active"
                    ? { borderColor: "#ff5a4e", background: "rgba(120,20,10,0.75)", color: "#ff8a80" }
                    : storm === "warning"
                      ? { borderColor: "#ffa02f", background: "rgba(90,55,10,0.75)", color: "#ffcf8a", animation: "pulse 1s infinite" }
                      : { borderColor: "#223350", background: "rgba(11,21,38,0.85)", color: "#8fa4c2" }
                }
              >
                <Sun size={12} />
                {storm === "calm" && <>tormenta en {stormIn}s</>}
                {storm === "warning" && <>¡TORMENTA EN {stormIn}s!</>}
                {storm === "active" && <>TORMENTA · {stormIn}s</>}
              </div>
              <div
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[10px] backdrop-blur"
                style={
                  hud?.waveState === "active"
                    ? { borderColor: "#ff5a4e", background: "rgba(120,20,10,0.75)", color: "#ff8a80" }
                    : { borderColor: "#223350", background: "rgba(11,21,38,0.85)", color: "#8fa4c2" }
                }
              >
                <Swords size={12} />
                {hud?.waveState === "active" ? <>OLEADA {hud?.wave} · {hud?.pirates} piratas</> : <>oleada {hud ? hud.wave + 1 : 1} en {hud?.waveIn}s</>}
              </div>
            </div>
          </div>

          {/* arriba-derecha: minimapa + botones */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
            <div className="flex gap-2">
              {onExit && (
                <button onClick={onExit} className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur transition hover:text-white" aria-label="Salir del juego">
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => { const m = !muted; setMuted(m); gameRef.current!.audio.setMuted(m); }}
                className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur transition hover:text-white"
                aria-label="Sonido"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button onClick={() => doPause(true)} className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur transition hover:text-white" aria-label="Pausa">
                <Pause size={16} />
              </button>
            </div>
            <canvas ref={miniRef} width={128} height={128} className="h-24 w-24 rounded-full border border-[#223350] sm:h-32 sm:w-32" />
          </div>

          {/* herramientas */}
          <div className="absolute left-1/2 top-[13.5rem] flex -translate-x-1/2 gap-1.5 sm:top-auto sm:bottom-3">
            <ToolChip t="magnet" />
            <ToolChip t="blaster" />
            <ToolChip t="wrench" />
            {!isTouch.current && (
              <button
                onClick={() => openBuild(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#38e1d4]/40 bg-[#0b1526]/85 px-2.5 py-1.5 font-display text-[10px] text-[#9df3ec] backdrop-blur hover:border-[#38e1d4]"
              >
                <Cog size={13} /> CONSTRUIR <span className="rounded bg-[#223350] px-1 text-[9px]">B</span>
              </button>
            )}
          </div>

          {/* barra del jefe */}
          {hud?.boss && (
            <div className="absolute left-1/2 top-[9.5rem] w-72 -translate-x-1/2 sm:w-96">
              <div className="mb-0.5 text-center font-display text-[10px] tracking-widest text-[#ff8a80]">☠ CRUSHER</div>
              <div className="h-2.5 overflow-hidden rounded-full border border-[#ff5a4e]/50 bg-[#1a0808]">
                <div className="h-full bg-gradient-to-r from-[#ff2418] to-[#ff8a5c] transition-[width]" style={{ width: `${(hud.boss.hp / hud.boss.max) * 100}%` }} />
              </div>
            </div>
          )}

          {/* prompt contextual */}
          {hud?.prompt && !buildOpen && (
            <div className="pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full border border-[#38e1d4]/40 bg-[#0b1526]/90 px-4 py-1.5 font-display text-[11px] text-[#9df3ec] backdrop-blur sm:bottom-16 sm:text-xs">
              {hud.prompt}
            </div>
          )}

          {/* toasts */}
          <div className="pointer-events-none absolute right-3 top-36 flex w-48 flex-col items-end gap-1.5 sm:top-44 sm:w-56">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border px-3 py-1.5 text-right text-[11px] backdrop-blur"
                style={{
                  borderColor: t.kind === "ok" ? "rgba(168,230,60,0.4)" : t.kind === "bad" ? "rgba(255,90,78,0.45)" : "rgba(56,225,212,0.4)",
                  background: "rgba(11,21,38,0.9)",
                  color: t.kind === "ok" ? "#c8f58a" : t.kind === "bad" ? "#ffb0aa" : "#9df3ec",
                }}
              >
                {t.msg}
              </div>
            ))}
          </div>

          {/* banner */}
          {banner && (
            <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-center" key={banner.id}>
              <div className="font-display text-2xl text-[#f4c542] drop-shadow-[0_0_18px_rgba(244,197,66,0.55)] sm:text-4xl">
                {banner.title}
              </div>
              <div className="mt-1 text-xs text-[#e9f1fc]/85 sm:text-sm">{banner.sub}</div>
            </div>
          )}

          {/* controles táctiles */}
          {isTouch.current && !paused && (
            <>
              <div
                className="absolute inset-y-0 right-0 w-1/2 touch-none"
                onPointerDown={lookDown}
                onPointerMove={lookMove}
                onPointerUp={lookUp}
                onPointerCancel={lookUp}
              />
              <div
                className="absolute bottom-6 left-4 h-32 w-32 touch-none rounded-full border border-[#223350] bg-[#0b1526]/60"
                onPointerDown={joyDown}
                onPointerMove={joyMove}
                onPointerUp={joyUp}
                onPointerCancel={joyUp}
              >
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#38e1d4]/50 bg-[#13213c]"
                  style={{ transform: `translate(calc(-50% + ${joyKnob.x}px), calc(-50% + ${joyKnob.y}px))` }}
                />
              </div>
              <button
                onPointerDown={() => gameRef.current?.pressAction()}
                className="absolute bottom-24 right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#38e1d4]/60 bg-[#0b1526]/85 text-[#9df3ec] backdrop-blur active:scale-95"
                aria-label="Acción"
              >
                {(() => { const I = TOOL_ICONS[tool]; return <I size={22} />; })()}
              </button>
              <button
                onPointerDown={() => gameRef.current?.setBoost(true)}
                onPointerUp={() => gameRef.current?.setBoost(false)}
                onPointerLeave={() => gameRef.current?.setBoost(false)}
                className="absolute bottom-6 right-24 flex h-14 w-14 items-center justify-center rounded-full border border-[#223350] bg-[#0b1526]/85 text-[#8fa4c2] backdrop-blur active:scale-95"
                aria-label="Turbo / subir"
              >
                <Zap size={20} />
              </button>
            </>
          )}
        </>
      )}

      {/* ========================= MODAL ESTACIÓN ========================= */}
      {buildOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070e]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#223350] bg-[#0b1526] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-display text-lg text-[#38e1d4]">ESTACIÓN</div>
                <div className="text-[11px] text-[#8fa4c2]">Módulos · mejoras · misiones</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[#f4c542]">{hud?.metal ?? metal} ✦</span>
                <button onClick={() => openBuild(false)} className="rounded-lg border border-[#223350] p-1.5 text-[#8fa4c2] hover:text-white" aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="mb-3 flex gap-1.5">
              {(["mods", "shop", "missions"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`rounded-lg px-3 py-1.5 font-display text-[11px] transition ${tab === k ? "bg-[#38e1d4] text-[#062024]" : "border border-[#223350] text-[#8fa4c2] hover:text-white"}`}
                >
                  {k === "mods" ? "MÓDULOS" : k === "shop" ? "MEJORAS" : "MISIONES"}
                </button>
              ))}
            </div>

            <div className="max-h-[52vh] overflow-y-auto pr-1">
              {tab === "mods" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {(Object.keys(MODULE_INFO) as ModuleType[]).map((k) => {
                    const info = MODULE_INFO[k];
                    const Icon = MODULE_ICONS[k];
                    const afford = (hud?.metal ?? 0) >= info.cost;
                    return (
                      <button
                        key={k}
                        onClick={() => { gameRef.current?.buildModule(k); setTick((t) => t + 1); }}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                          afford ? "border-[#38e1d4]/40 bg-[#0f1b31] hover:border-[#38e1d4]" : "border-[#223350] bg-[#0f1b31]/50 opacity-60"
                        }`}
                      >
                        <Icon size={20} className="mt-0.5 shrink-0 text-[#38e1d4]" />
                        <div className="min-w-0">
                          <div className="font-display text-xs text-[#e9f1fc]">
                            {info.name} <span className="text-[#f4c542]">· {info.cost}✦</span>
                          </div>
                          <div className="text-[11px] leading-tight text-[#8fa4c2]">{info.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {tab === "shop" && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {hud?.upgrades.map((u, i) => (
                    <button
                      key={i}
                      onClick={() => { gameRef.current?.buyUpgrade(i); setTick((t) => t + 1); }}
                      className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                        u.maxed ? "border-[#f4c542]/40 bg-[#1a1508]" : (hud.metal ?? 0) >= u.cost ? "border-[#38e1d4]/40 bg-[#0f1b31] hover:border-[#38e1d4]" : "border-[#223350] bg-[#0f1b31]/50 opacity-60"
                      }`}
                    >
                      <Zap size={18} className={`mt-0.5 shrink-0 ${u.maxed ? "text-[#f4c542]" : "text-[#38e1d4]"}`} />
                      <div className="min-w-0">
                        <div className="font-display text-xs text-[#e9f1fc]">
                          {u.name} <span className="text-[#8fa4c2]">· Nv {u.level}</span>
                        </div>
                        <div className="text-[11px] leading-tight text-[#8fa4c2]">{u.desc}</div>
                        <div className="mt-0.5 font-display text-[10px] text-[#f4c542]">{u.maxed ? "MÁXIMO" : `${u.cost} ✦`}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {tab === "missions" && (
                <div className="flex flex-col gap-2">
                  {hud?.missions.length === 0 && (
                    <div className="rounded-xl border border-[#223350] p-4 text-center text-xs text-[#8fa4c2]">
                      Has completado todas las misiones del sector. ¡Leyenda!
                    </div>
                  )}
                  {hud?.missions.map((m, i) => (
                    <div key={i} className="rounded-xl border border-[#223350] bg-[#0f1b31] p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#e9f1fc]">{m.text}</span>
                        <span className="font-display text-[11px] text-[#f4c542]">+{m.reward} ✦</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#13213c]">
                        <div className="h-full rounded-full bg-[#38e1d4]" style={{ width: `${Math.min(100, (m.prog / m.goal) * 100)}%` }} />
                      </div>
                      <div className="mt-1 text-right text-[10px] text-[#8fa4c2]">{m.prog}/{m.goal}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] text-[#8fa4c2]">
              <span className="flex items-center gap-1"><Hash size={10} /> Récord sector: {hud?.recordSector ?? 0}</span>
              <span>[B] o ESC para cerrar</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================== PAUSA ============================== */}
      {paused && started && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#05070e]/85 backdrop-blur-sm">
          <div className="w-72 rounded-2xl border border-[#223350] bg-[#0b1526] p-6 text-center">
            <div className="font-display text-2xl text-[#38e1d4]">PAUSA</div>
            <div className="mt-1 text-xs text-[#8fa4c2]">
              {hud?.sectorName} · {hud?.totalMetal ?? 0} ✦ refinados en total
            </div>
            <button
              onClick={() => doPause(false)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#38e1d4] py-2.5 font-display text-sm text-[#062024] transition hover:brightness-110"
            >
              <Play size={16} /> REANUDAR
            </button>
            {onExit && (
              <button onClick={onExit} className="mt-2 w-full rounded-xl border border-[#223350] py-2 font-display text-xs text-[#8fa4c2] transition hover:text-white">
                SALIR AL SITIO
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================== INTRO ============================== */}
      {showIntro && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-gradient-to-b from-[#05070e]/70 via-[#05070e]/85 to-[#05070e] p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[#223350] bg-[#0b1526]/92 p-6 text-center shadow-[0_0_80px_rgba(56,225,212,0.12)] sm:p-8">
            <div className="font-display text-[10px] tracking-[0.3em] text-[#8fa4c2]">GAMELAB BY ALICELABS PRESENTA</div>
            <h1 className="mt-2 font-display text-4xl text-[#38e1d4] drop-shadow-[0_0_24px_rgba(56,225,212,0.45)] sm:text-5xl">
              CHATARRA<br />CÓSMICA
            </h1>
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#8fa4c2] sm:text-sm">
              Constructor espacial estilo Roblox: camina por tu estación con studs, salta entre cajas, vuela con
              el jetpack, remolca chatarra con el imán, defiéndete de los piratas con el bláster y haz el
              hipersalto a través de <span className="text-[#b58aff]">5 sectores</span> hasta El Vacío.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {["Avatar R6", "5 Sectores", "Piratas + CRUSHER", "Tycoon físico"].map((c) => (
                <span key={c} className="rounded-full border border-[#38e1d4]/35 bg-[#38e1d4]/10 px-2.5 py-0.5 text-[10px] text-[#9df3ec]">
                  {c}
                </span>
              ))}
            </div>
            <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-x-4 gap-y-1 text-left text-[11px] text-[#8fa4c2]">
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">WASD</kbd> moverse</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">ESPACIO</kbd> saltar · mantener = jetpack</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">1·2·3</kbd> imán / bláster / llave</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">E</kbd> usar herramienta</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">B</kbd> estación: módulos y mejoras</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">C</kbd> descender (vuelo)</span>
            </div>
            {hud && hud.record > 0 && (
              <div className="mt-3 font-display text-[11px] text-[#f4c542]">
                ★ RÉCORD: {hud.record} ✦ · SECTOR MÁXIMO: {SECTORS[Math.min(hud.recordSector, SECTORS.length - 1)].name}
              </div>
            )}
            <button
              onClick={play}
              className="mt-5 w-full rounded-2xl bg-[#38e1d4] py-3.5 font-display text-base text-[#062024] shadow-[0_0_30px_rgba(56,225,212,0.35)] transition hover:brightness-110 active:scale-[0.98]"
            >
              ▶ JUGAR
            </button>
            <div className="mt-2 text-[10px] text-[#5a6f8f]">Móvil: joystick + botones de herramienta / acción / jetpack</div>
          </div>
        </div>
      )}
    </div>
  );
}
