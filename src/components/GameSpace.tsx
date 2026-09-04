/* ============================================================
   CHATARRA CÓSMICA — interfaz React del juego
   GameLab by AliceLabs
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Anchor, Cog, Hash, Heart, Magnet, Pause, Play, Radio, Shield, Sun, Volume2, VolumeX, X, Zap } from "lucide-react";
import { SpaceGame, MODULE_INFO, type ModuleType, type SpaceHud } from "../games/space/SpaceGame";

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
  const o2Color = o2 > 35 ? "#38e1d4" : o2 > 15 ? "#ffa02f" : "#ff5a4e";
  const metal = hud?.metal ?? 0;
  const storm = hud?.storm ?? "calm";
  const stormIn = hud?.stormIn ?? 0;
  const mods = hud?.modules ?? 0;

  const openBuild = (open: boolean) => {
    setBuildOpen(open);
    gameRef.current?.setUiOpen(open);
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
          {/* arriba-izquierda: O2 + metal + remolque */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            <div className="rounded-xl border border-[#223350] bg-[#0b1526]/85 px-3 py-2 backdrop-blur">
              <div className="flex items-center gap-2">
                <Heart size={14} style={{ color: o2Color }} />
                <div className="h-2.5 w-28 overflow-hidden rounded-full bg-[#13213c] sm:w-36">
                  <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${o2}%`, background: o2Color }} />
                </div>
                <span className="font-display text-[11px] text-[#8fa4c2]">O₂</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="font-display text-lg leading-none text-[#f4c542]">{metal} ✦</span>
                <span className="flex items-center gap-1 font-display text-[11px] text-[#38e1d4]">
                  <Magnet size={12} /> {hud?.towing ?? 0}/2
                </span>
              </div>
            </div>
          </div>

          {/* arriba-centro: estación + tormenta */}
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-[#223350] bg-[#0b1526]/85 px-3 py-1.5 backdrop-blur">
              <span className="font-display text-[11px] text-[#8fa4c2]">ESTACIÓN</span>
              <span className="font-display text-sm text-[#38e1d4]">{mods}/8</span>
              <div className="h-2 w-16 overflow-hidden rounded-full bg-[#13213c] sm:w-24">
                <div className="h-full rounded-full bg-[#38e1d4] transition-[width]" style={{ width: `${(mods / 8) * 100}%` }} />
              </div>
            </div>
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
          </div>

          {/* arriba-derecha: botones */}
          <div className="absolute right-3 top-3 flex gap-2">
            {onExit && (
              <button
                onClick={onExit}
                className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur transition hover:text-white"
                aria-label="Salir del juego"
              >
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => {
                const m = !muted;
                setMuted(m);
                gameRef.current!.audio.setMuted(m);
              }}
              className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur transition hover:text-white"
              aria-label="Sonido"
            >
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => doPause(true)}
              className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur transition hover:text-white"
              aria-label="Pausa"
            >
              <Pause size={16} />
            </button>
          </div>

          {/* prompt contextual */}
          {hud?.prompt && !buildOpen && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-[#38e1d4]/40 bg-[#0b1526]/90 px-4 py-1.5 font-display text-[11px] text-[#9df3ec] backdrop-blur sm:bottom-8 sm:text-xs">
              {hud.prompt}
            </div>
          )}

          {/* toasts */}
          <div className="pointer-events-none absolute right-3 top-16 flex w-56 flex-col items-end gap-1.5">
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

          {/* botón construir (móvil) */}
          {isTouch.current && !buildOpen && (
            <button
              onClick={() => openBuild(true)}
              className="absolute bottom-40 right-4 flex items-center gap-1.5 rounded-full border border-[#38e1d4]/50 bg-[#0b1526]/90 px-4 py-2.5 font-display text-xs text-[#9df3ec] backdrop-blur active:scale-95"
            >
              <Cog size={15} /> CONSTRUIR
            </button>
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
                onPointerDown={() => gameRef.current?.pressHook()}
                className="absolute bottom-24 right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#38e1d4]/60 bg-[#0b1526]/85 font-display text-[10px] text-[#9df3ec] backdrop-blur active:scale-95"
              >
                <Magnet size={22} />
              </button>
              <button
                onPointerDown={() => gameRef.current?.setBoost(true)}
                onPointerUp={() => gameRef.current?.setBoost(false)}
                onPointerLeave={() => gameRef.current?.setBoost(false)}
                className="absolute bottom-6 right-24 flex h-14 w-14 items-center justify-center rounded-full border border-[#223350] bg-[#0b1526]/85 text-[#8fa4c2] backdrop-blur active:scale-95"
                aria-label="Turbo"
              >
                <Zap size={20} />
              </button>
            </>
          )}
        </>
      )}

      {/* ========================= MODAL CONSTRUIR ========================= */}
      {buildOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070e]/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#223350] bg-[#0b1526] p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-display text-lg text-[#38e1d4]">CONSTRUIR MÓDULOS</div>
                <div className="text-[11px] text-[#8fa4c2]">Convierte metal ✦ en una estación legendaria</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-display text-[#f4c542]">{metal} ✦</span>
                <button onClick={() => openBuild(false)} className="rounded-lg border border-[#223350] p-1.5 text-[#8fa4c2] hover:text-white" aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(MODULE_INFO) as ModuleType[]).map((k) => {
                const info = MODULE_INFO[k];
                const Icon = MODULE_ICONS[k];
                const afford = metal >= info.cost;
                return (
                  <button
                    key={k}
                    onClick={() => gameRef.current?.buildModule(k)}
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
            <div className="mt-3 flex items-center justify-between text-[10px] text-[#8fa4c2]">
              <span className="flex items-center gap-1"><Hash size={10} /> Máx. 2 por tipo (excepto Oxígeno/Energía)</span>
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
            <div className="mt-1 text-xs text-[#8fa4c2]">Metal total refinado: {hud?.totalMetal ?? 0} ✦</div>
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
              Vuela en gravedad cero con tu gancho magnético, arrastra chatarra orbital hasta la fundidora
              y convierte el metal en la estación más brutal del cinturón. Sobrevive a las tormentas solares.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {["Tycoon físico", "Gravedad cero", "Demo jugable"].map((c) => (
                <span key={c} className="rounded-full border border-[#38e1d4]/35 bg-[#38e1d4]/10 px-2.5 py-0.5 text-[10px] text-[#9df3ec]">
                  {c}
                </span>
              ))}
            </div>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 text-left text-[11px] text-[#8fa4c2]">
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">WASD</kbd> propulsarse</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">ESPACIO</kbd> / <kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">C</kbd> subir/bajar</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">SHIFT</kbd> turbo (gasta O₂)</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">E</kbd> gancho magnético</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">B</kbd> construir módulos</span>
              <span>Ratón: cámara · clic para capturar</span>
            </div>
            {hud && hud.record > 0 && (
              <div className="mt-3 font-display text-[11px] text-[#f4c542]">★ RÉCORD: {hud.record} ✦ refinados</div>
            )}
            <button
              onClick={play}
              className="mt-5 w-full rounded-2xl bg-[#38e1d4] py-3.5 font-display text-base text-[#062024] shadow-[0_0_30px_rgba(56,225,212,0.35)] transition hover:brightness-110 active:scale-[0.98]"
            >
              ▶ JUGAR
            </button>
            <div className="mt-2 text-[10px] text-[#5a6f8f]">Móvil: joystick + botones IMÁN / TURBO / CONSTRUIR</div>
          </div>
        </div>
      )}
    </div>
  );
}
