/* ============================================================
   HORMIGUERO: GUERRA DEL JARDÍN — interfaz React del juego
   GameLab by AliceLabs
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import { Bug, CloudRain, Crown, Egg, Heart, Pause, Play, Shield, Sparkles, Swords, Volume2, VolumeX, X } from "lucide-react";
import { AntGame, type AntHud } from "../games/ant/AntGame";

type Toast = { id: number; msg: string; kind: "ok" | "bad" | "info" };
type Banner = { id: number; title: string; sub: string };

const LIME = "#a8e63c";

export default function GameAnt({ onExit }: { onExit?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AntGame | null>(null);
  const idRef = useRef(0);
  const miniRef = useRef<HTMLCanvasElement>(null);

  const [hud, setHud] = useState<AntHud | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [muted, setMuted] = useState(false);
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [evoOpen, setEvoOpen] = useState(false);
  const isTouch = useRef(false);

  /* joystick táctil */
  const joyRef = useRef<{ id: number; ox: number; oy: number } | null>(null);
  const lookRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const [joyKnob, setJoyKnob] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    isTouch.current = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (!canvasRef.current) return;
    const game = new AntGame(canvasRef.current, {
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
      (window as unknown as { __ant?: AntGame }).__ant = game;
    }
    return () => game.dispose();
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 3400);
    return () => window.clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    if (hud?.paused && started && !paused && !hud?.over && hud.phase === "playing") setPaused(true);
  }, [hud?.paused, started, paused, hud?.over, hud?.phase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyU" && started && !paused) {
        e.preventDefault();
        setEvoOpen((o) => {
          gameRef.current?.setUiOpen(!o);
          return !o;
        });
      }
      if (e.code === "Escape" && evoOpen) {
        setEvoOpen(false);
        gameRef.current?.setUiOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, paused, evoOpen]);

  /* minimapa */
  useEffect(() => {
    const cv = miniRef.current;
    if (!cv || !hud) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const W = cv.width, H = cv.height, S = W / 96;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(10,16,10,0.82)";
    ctx.fillRect(0, 0, W, H);
    const map = (x: number, z: number): [number, number] => [W / 2 + x * S, H / 2 + z * S];
    ctx.fillStyle = "#8a5f3a";
    const [mx, mz] = map(0, 16);
    ctx.beginPath();
    ctx.arc(mx, mz, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd23e";
    for (let i = 0; i < hud.minimap.items.length; i += 2) {
      const [x, y] = map(hud.minimap.items[i], hud.minimap.items[i + 1]);
      ctx.fillRect(x - 1, y - 1, 2.4, 2.4);
    }
    ctx.fillStyle = "#ff5a4e";
    for (let i = 0; i < hud.minimap.enemies.length; i += 2) {
      const [x, y] = map(hud.minimap.enemies[i], hud.minimap.enemies[i + 1]);
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    const [px, pz] = map(hud.minimap.px, hud.minimap.pz);
    ctx.fillStyle = LIME;
    ctx.beginPath();
    ctx.arc(px, pz, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }, [hud]);

  const play = () => {
    gameRef.current?.begin();
    setStarted(true);
  };

  const doPause = (p: boolean) => {
    setPaused(p);
    gameRef.current?.setPaused(p);
  };

  const restart = () => {
    gameRef.current?.reset();
    setPaused(false);
    gameRef.current?.setPaused(false);
  };

  const hp = hud?.hp ?? 100;
  const maxHp = hud?.maxHp ?? 100;
  const hpPct = (hp / maxHp) * 100;
  const qPct = hud ? (hud.queenHp / hud.queenMax) * 100 : 100;

  return (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-[#87b7d4]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {/* ============================== HUD ============================== */}
      {started && hud && !hud.over && (
        <>
          {/* arriba-izquierda */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            <div className="rounded-xl border border-[#223350] bg-[#0b1526]/85 px-3 py-2 backdrop-blur">
              <div className="flex items-center gap-2">
                <Heart size={13} className="text-[#a8e63c]" />
                <div className="h-2.5 w-24 overflow-hidden rounded-full bg-[#13213c] sm:w-32">
                  <div className="h-full rounded-full bg-[#a8e63c] transition-[width]" style={{ width: `${hpPct}%` }} />
                </div>
                <span className="font-display text-[10px] text-[#8fa4c2]">{hp}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="font-display text-lg leading-none text-[#a8e63c]">{hud.food} 🍃</span>
                <span className="font-display text-[10px] text-[#8fa4c2]">carga {hud.carry}/2</span>
              </div>
              <div className="mt-1 flex gap-2 text-[10px] text-[#8fa4c2]">
                <span className="flex items-center gap-1"><Bug size={11} /> {hud.workers}/8</span>
                <span className="flex items-center gap-1"><Swords size={11} /> {hud.soldiers}/4</span>
              </div>
            </div>
            {/* misiones */}
            <div className="flex flex-col gap-1">
              {hud.missions.map((m, i) => (
                <div key={i} className="rounded-lg border border-[#223350] bg-[#0b1526]/80 px-2.5 py-1 text-[10px] text-[#c9d6ea] backdrop-blur">
                  {m.text} <span className="text-[#a8e63c]">{m.prog}/{m.goal}</span> <span className="text-[#f4c542]">+{m.reward}🍃</span>
                </div>
              ))}
            </div>
          </div>

          {/* arriba-centro: oleada + lluvia */}
          <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center gap-1.5">
            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5 font-display text-[11px] backdrop-blur"
              style={
                hud.waveState === "active"
                  ? { borderColor: "#ff5a4e", background: "rgba(120,20,10,0.8)", color: "#ffb0aa" }
                  : hud.waveState === "warning"
                    ? { borderColor: "#ffa02f", background: "rgba(90,55,10,0.8)", color: "#ffcf8a", animation: "pulse 1s infinite" }
                    : { borderColor: "#223350", background: "rgba(11,21,38,0.85)", color: "#8fa4c2" }
              }
            >
              <Swords size={12} />
              {hud.waveState === "calm" && <>oleada {hud.wave + 1} en {hud.waveIn}s</>}
              {hud.waveState === "warning" && <>¡OLEADA {hud.wave} EN {hud.waveIn}s!</>}
              {hud.waveState === "active" && <>¡DEFIENDE! · oleada {hud.wave}</>}
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-[#223350] bg-[#0b1526]/85 px-2.5 py-1 font-display text-[10px] text-[#8fa4c2] backdrop-blur">
              <CloudRain size={11} />
              {hud.rain === "none" && <>lluvia en {hud.rainIn}s</>}
              {hud.rain === "warning" && <span className="text-[#9ed2ff]">¡LLUVIA EN {hud.rainIn}s!</span>}
              {hud.rain === "active" && <span className="text-[#9ed2ff]">¡LLUVIA! refúgiate</span>}
            </div>
          </div>

          {/* arriba-derecha: reina + botones */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-[#223350] bg-[#0b1526]/85 px-3 py-1.5 backdrop-blur">
              <Crown size={13} className="text-[#f4c542]" />
              <div className="h-2.5 w-20 overflow-hidden rounded-full bg-[#13213c] sm:w-28">
                <div className="h-full rounded-full bg-[#f4c542] transition-[width]" style={{ width: `${qPct}%` }} />
              </div>
              <span className="font-display text-[10px] text-[#8fa4c2]">REINA</span>
            </div>
            <div className="flex gap-2">
              {onExit && (
                <button onClick={onExit} className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur hover:text-white" aria-label="Salir">
                  <X size={16} />
                </button>
              )}
              <button
                onClick={() => {
                  const m = !muted;
                  setMuted(m);
                  gameRef.current!.audio.setMuted(m);
                }}
                className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur hover:text-white"
                aria-label="Sonido"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button onClick={() => doPause(true)} className="rounded-lg border border-[#223350] bg-[#0b1526]/85 p-2 text-[#8fa4c2] backdrop-blur hover:text-white" aria-label="Pausa">
                <Pause size={16} />
              </button>
            </div>
          </div>

          {/* minimapa */}
          <canvas ref={miniRef} width={128} height={128} className="absolute bottom-40 left-3 h-24 w-24 rounded-xl border border-[#223350] backdrop-blur sm:bottom-6 sm:h-32 sm:w-32" />

          {/* prompt */}
          {hud.prompt && !evoOpen && (
            <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full border border-[#a8e63c]/40 bg-[#0b1526]/90 px-4 py-1.5 font-display text-[11px] text-[#d3f58a] backdrop-blur sm:bottom-8 sm:text-xs">
              {hud.prompt}
            </div>
          )}

          {/* toasts */}
          <div className="pointer-events-none absolute right-3 top-28 flex w-56 flex-col items-end gap-1.5">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border px-3 py-1.5 text-right text-[11px] backdrop-blur"
                style={{
                  borderColor: t.kind === "ok" ? "rgba(168,230,60,0.4)" : t.kind === "bad" ? "rgba(255,90,78,0.45)" : "rgba(56,225,212,0.4)",
                  background: "rgba(11,21,38,0.9)",
                  color: t.kind === "ok" ? "#d3f58a" : t.kind === "bad" ? "#ffb0aa" : "#9df3ec",
                }}
              >
                {t.msg}
              </div>
            ))}
          </div>

          {/* banner */}
          {banner && (
            <div className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 text-center" key={banner.id}>
              <div className="font-display text-2xl text-[#a8e63c] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-4xl">{banner.title}</div>
              <div className="mt-1 text-xs text-[#e9f1fc]/90 sm:text-sm">{banner.sub}</div>
            </div>
          )}

          {/* botones móviles */}
          {isTouch.current && !paused && (
            <>
              <div
                className="absolute inset-y-0 right-0 w-1/2 touch-none"
                onPointerDown={(e) => {
                  lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
                }}
                onPointerMove={(e) => {
                  const l = lookRef.current;
                  if (!l || l.id !== e.pointerId) return;
                  gameRef.current?.setLook(e.clientX - l.x, e.clientY - l.y);
                  lookRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
                }}
                onPointerUp={() => (lookRef.current = null)}
                onPointerCancel={() => (lookRef.current = null)}
              />
              <div
                className="absolute bottom-6 left-4 h-32 w-32 touch-none rounded-full border border-[#223350] bg-[#0b1526]/60"
                onPointerDown={(e) => {
                  if (joyRef.current) return;
                  (e.target as HTMLElement).setPointerCapture(e.pointerId);
                  joyRef.current = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
                  setJoyKnob({ x: 0, y: 0, active: true });
                }}
                onPointerMove={(e) => {
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
                }}
                onPointerUp={() => {
                  joyRef.current = null;
                  setJoyKnob({ x: 0, y: 0, active: false });
                  gameRef.current?.setJoystick(0, 0);
                }}
                onPointerCancel={() => {
                  joyRef.current = null;
                  setJoyKnob({ x: 0, y: 0, active: false });
                  gameRef.current?.setJoystick(0, 0);
                }}
              >
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a8e63c]/50 bg-[#13213c]"
                  style={{ transform: `translate(calc(-50% + ${joyKnob.x}px), calc(-50% + ${joyKnob.y}px))` }}
                />
              </div>
              <button
                onPointerDown={() => gameRef.current?.pressAction()}
                className="absolute bottom-24 right-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#a8e63c]/60 bg-[#0b1526]/85 font-display text-[9px] text-[#d3f58a] backdrop-blur active:scale-95"
              >
                ACCIÓN
              </button>
              <button
                onPointerDown={() => gameRef.current?.setHold(true)}
                onPointerUp={() => gameRef.current?.setHold(false)}
                onPointerLeave={() => gameRef.current?.setHold(false)}
                className="absolute bottom-6 right-24 flex h-14 w-14 items-center justify-center rounded-full border border-[#223350] bg-[#0b1526]/85 font-display text-[9px] text-[#8fa4c2] backdrop-blur active:scale-95"
              >
                MANTENER
              </button>
              <button
                onClick={() => {
                  setEvoOpen(true);
                  gameRef.current?.setUiOpen(true);
                }}
                className="absolute bottom-44 right-4 flex items-center gap-1.5 rounded-full border border-[#a8e63c]/50 bg-[#0b1526]/90 px-3.5 py-2 font-display text-[10px] text-[#d3f58a] backdrop-blur active:scale-95"
              >
                <Sparkles size={13} /> COLONIA
              </button>
            </>
          )}

          {/* botón colonia escritorio */}
          {!isTouch.current && (
            <button
              onClick={() => {
                setEvoOpen(true);
                gameRef.current?.setUiOpen(true);
              }}
              className="absolute bottom-8 right-8 flex items-center gap-2 rounded-xl border border-[#a8e63c]/50 bg-[#0b1526]/90 px-4 py-2.5 font-display text-xs text-[#d3f58a] backdrop-blur transition hover:border-[#a8e63c]"
            >
              <Sparkles size={15} /> COLONIA · [U]
            </button>
          )}
        </>
      )}

      {/* ===================== MODAL COLONIA ===================== */}
      {evoOpen && hud && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#05070e]/75 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[#223350] bg-[#0b1526] p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-display text-lg text-[#a8e63c]">TU COLONIA</div>
                <div className="text-[11px] text-[#8fa4c2]">Comida: {hud.food} 🍃 · cría, excava y evoluciona</div>
              </div>
              <button onClick={() => { setEvoOpen(false); gameRef.current?.setUiOpen(false); }} className="rounded-lg border border-[#223350] p-1.5 text-[#8fa4c2] hover:text-white" aria-label="Cerrar">
                <X size={16} />
              </button>
            </div>

            <div className="mb-2 font-display text-[10px] tracking-widest text-[#8fa4c2]">CRIAR</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => gameRef.current?.breed("worker")}
                className="flex items-center gap-2 rounded-xl border border-[#a8e63c]/40 bg-[#0f1b31] p-3 text-left transition hover:border-[#a8e63c]"
              >
                <Bug size={18} className="text-[#a8e63c]" />
                <div>
                  <div className="font-display text-[11px] text-[#e9f1fc]">OBRERA · 20🍃</div>
                  <div className="text-[10px] text-[#8fa4c2]">recolecta sola ({hud.workers}/8)</div>
                </div>
              </button>
              <button
                onClick={() => gameRef.current?.breed("soldier")}
                className="flex items-center gap-2 rounded-xl border border-[#a8e63c]/40 bg-[#0f1b31] p-3 text-left transition hover:border-[#a8e63c]"
              >
                <Swords size={18} className="text-[#a8e63c]" />
                <div>
                  <div className="font-display text-[11px] text-[#e9f1fc]">SOLDADO · 30🍃</div>
                  <div className="text-[10px] text-[#8fa4c2]">te acompaña y lucha ({hud.soldiers}/4)</div>
                </div>
              </button>
            </div>

            <div className="mb-2 mt-4 font-display text-[10px] tracking-widest text-[#8fa4c2]">EVOLUCIONAR CASTA</div>
            <div className="flex flex-col gap-2">
              {hud.upgrades.map((u, i) => (
                <button
                  key={u.name}
                  disabled={u.maxed}
                  onClick={() => gameRef.current?.buyUpgrade(i)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left transition ${u.maxed ? "border-[#223350] opacity-60" : "border-[#223350] hover:border-[#a8e63c]"}`}
                >
                  <div>
                    <div className="font-display text-[11px] text-[#e9f1fc]">
                      {u.name} · nv {u.level}/3
                    </div>
                    <div className="text-[10px] text-[#8fa4c2]">{u.desc}</div>
                  </div>
                  <span className="font-display text-[11px] text-[#f4c542]">{u.maxed ? "MÁX" : `${u.cost}🍃`}</span>
                </button>
              ))}
            </div>

            <div className="mb-2 mt-4 font-display text-[10px] tracking-widest text-[#8fa4c2]">CÁMARAS (excávalas en el jardín)</div>
            <div className="grid grid-cols-2 gap-2">
              {hud.chambers.map((c) => (
                <div key={c.name} className={`rounded-xl border p-2.5 text-[10px] ${c.built ? "border-[#a8e63c]/50 bg-[#a8e63c]/10" : "border-[#223350]"}`}>
                  <div className="flex items-center gap-1.5 font-display text-[10px] text-[#e9f1fc]">
                    {c.built ? <Egg size={12} className="text-[#a8e63c]" /> : <Shield size={12} className="text-[#8fa4c2]" />}
                    {c.name}
                  </div>
                  <div className="text-[9px] text-[#8fa4c2]">{c.built ? "construida" : c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================== PAUSA ============================== */}
      {paused && started && !hud?.over && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#05070e]/85 backdrop-blur-sm">
          <div className="w-72 rounded-2xl border border-[#223350] bg-[#0b1526] p-6 text-center">
            <div className="font-display text-2xl text-[#a8e63c]">PAUSA</div>
            <div className="mt-1 text-xs text-[#8fa4c2]">Oleadas sobrevividas: {hud?.stats.wave ?? 0}</div>
            <button
              onClick={() => doPause(false)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#a8e63c] py-2.5 font-display text-sm text-[#12220a] transition hover:brightness-110"
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

      {/* ============================ GAME OVER ============================ */}
      {hud?.over && started && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#1a0505]/90 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-[#5a2020] bg-[#160a0a] p-7 text-center">
            <Crown size={34} className="mx-auto text-[#ff8a80]" />
            <div className="mt-2 font-display text-2xl text-[#ff8a80]">COLONIA CONQUISTADA</div>
            <div className="mt-1 text-xs text-[#c9a0a0]">Las hormigas rojas tomaron la Sala Real…</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#241414] p-2.5">
                <div className="font-display text-lg text-[#a8e63c]">{hud.stats.wave}</div>
                <div className="text-[9px] text-[#8fa4c2]">OLEADAS</div>
              </div>
              <div className="rounded-xl bg-[#241414] p-2.5">
                <div className="font-display text-lg text-[#a8e63c]">{hud.stats.kills}</div>
                <div className="text-[9px] text-[#8fa4c2]">ENEMIGOS</div>
              </div>
              <div className="rounded-xl bg-[#241414] p-2.5">
                <div className="font-display text-lg text-[#a8e63c]">{hud.stats.food}</div>
                <div className="text-[9px] text-[#8fa4c2]">🍃 FINALES</div>
              </div>
            </div>
            <button
              onClick={restart}
              className="mt-5 w-full rounded-2xl bg-[#a8e63c] py-3 font-display text-sm text-[#12220a] transition hover:brightness-110"
            >
              ⟳ REINTENTAR
            </button>
            {onExit && (
              <button onClick={onExit} className="mt-2 w-full rounded-xl border border-[#3a2828] py-2 font-display text-xs text-[#c9a0a0] hover:text-white">
                SALIR AL SITIO
              </button>
            )}
          </div>
        </div>
      )}

      {/* ============================== INTRO ============================== */}
      {!started && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-gradient-to-b from-[#0b1526]/60 via-[#0b1526]/85 to-[#0b1526] p-4">
          <div className="w-full max-w-xl rounded-3xl border border-[#223350] bg-[#0b1526]/94 p-6 text-center shadow-[0_0_80px_rgba(168,230,60,0.14)] sm:p-8">
            <div className="font-display text-[10px] tracking-[0.3em] text-[#8fa4c2]">GAMELAB BY ALICELABS PRESENTA</div>
            <h1 className="mt-2 font-display text-4xl leading-none text-[#a8e63c] drop-shadow-[0_0_24px_rgba(168,230,60,0.4)] sm:text-5xl">
              HORMIGUERO
            </h1>
            <div className="mt-1 font-display text-lg text-[#e9f1fc] sm:text-xl">GUERRA DEL JARDÍN</div>
            <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-[#8fa4c2] sm:text-sm">
              Dirige tu colonia en un jardín a escala épica: recolecta migas y rocío, excava cámaras,
              cría obreras y soldados… y defiende a la Reina de hormigas rojas, avispas y arañas antes de que llegue la lluvia.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-1.5">
              {["Estrategia de colonias", "Mundo macro", "Demo jugable"].map((c) => (
                <span key={c} className="rounded-full border border-[#a8e63c]/35 bg-[#a8e63c]/10 px-2.5 py-0.5 text-[10px] text-[#d3f58a]">
                  {c}
                </span>
              ))}
            </div>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-x-4 gap-y-1 text-left text-[11px] text-[#8fa4c2]">
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">WASD</kbd> moverse</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">ESPACIO</kbd> saltar</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">E</kbd> recoger / morder</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">MANTÉN E</kbd> excavar / ordeñar</span>
              <span><kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">U</kbd> panel de colonia</span>
              <span>Ratón: cámara · clic para capturar</span>
            </div>
            {hud && hud.stats.wave > 0 && (
              <div className="mt-3 font-display text-[11px] text-[#f4c542]">★ RÉCORD: {hud.stats.wave} oleadas sobrevividas</div>
            )}            <button
              onClick={play}
              className="mt-5 w-full rounded-2xl bg-[#a8e63c] py-3.5 font-display text-base text-[#12220a] shadow-[0_0_30px_rgba(168,230,60,0.35)] transition hover:brightness-110 active:scale-[0.98]"
            >
              ▶ JUGAR
            </button>
            <div className="mt-2 text-[10px] text-[#5a6f8f]">Móvil: joystick + botones ACCIÓN / MANTENER / COLONIA</div>
          </div>
        </div>
      )}
    </div>
  );
}
