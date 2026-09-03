/* ============================================================
   HOTEL ∞ INFINITO — NOCHE INFINITA · interfaz del juego
   HUD · misiones · construcción · oleadas · mejoras · táctil.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import {
  Coins, Cross, Crosshair, Expand, Gamepad2, Heart, KeyRound, Magnet,
  MousePointer2, Pause, Play, RotateCcw, Shield, ShieldAlert, Sword,
  Target, Volume2, VolumeX, Wind, Zap, Swords, Trophy,
  type LucideIcon,
} from "lucide-react";
import { Game, type GameStats, type HudState, type UpgradeCard } from "../game/Game";
import type { BuildKind } from "../game/builds";

const HEX = {
  lime: "#a8e63c",
  cyan: "#38e1d4",
  amber: "#ffa02f",
  red: "#ff5a4e",
  gold: "#f4c542",
};

type Toast = { id: number; msg: string; kind: "ok" | "bad" | "info" };
type Banner = { id: number; title: string; sub: string };

const UPGRADE_ICONS: Record<string, LucideIcon> = {
  sword: Sword, heart: Heart, zap: Zap, target: Target, expand: Expand,
  shield: Shield, magnet: Magnet, wind: Wind, cross: Cross,
};

const BUILD_SLOTS: { kind: BuildKind; icon: LucideIcon; label: string; cost: number }[] = [
  { kind: "barricade", icon: Shield, label: "BARRICADA", cost: 25 },
  { kind: "turret", icon: Crosshair, label: "TORRETA", cost: 60 },
  { kind: "medkit", icon: Cross, label: "BOTIQUÍN", cost: 40 },
];

export default function Game3D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const idRef = useRef(0);

  const [hud, setHud] = useState<HudState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [upgrades, setUpgrades] = useState<UpgradeCard[] | null>(null);
  const [gameOver, setGameOver] = useState<GameStats | null>(null);
  const [muted, setMuted] = useState(false);
  const [hurtFx, setHurtFx] = useState(0);
  const [started, setStarted] = useState(false);
  const isTouch = useRef(false);

  useEffect(() => {
    isTouch.current = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current, {
      onHud: (s) => setHud({ ...s }),
      onToast: (msg, kind) => {
        const id = ++idRef.current;
        setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
      },
      onBanner: (title, sub) => setBanner({ id: ++idRef.current, title, sub }),
      onHurt: () => setHurtFx((n) => n + 1),
      onUpgrades: (cards) => setUpgrades(cards),
      onGameOver: (stats) => setGameOver(stats),
    });
    gameRef.current = game;
    return () => game.dispose();
  }, []);

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 3200);
    return () => window.clearTimeout(t);
  }, [banner]);

  const play = () => {
    gameRef.current?.begin();
    setStarted(true);
  };

  const restart = () => {
    setGameOver(null);
    gameRef.current?.restart();
  };

  const phase = hud?.phase ?? "intro";
  const showIntro = !started;
  const buildMode = hud?.buildMode ?? null;
  const hpPct = hud ? (hud.hp / hud.maxHp) * 100 : 100;

  /* ------------------------------ joystick ------------------------------ */
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
  const joyUp = (e: React.PointerEvent) => {
    const j = joyRef.current;
    if (!j || j.id !== e.pointerId) return;
    joyRef.current = null;
    setJoyKnob({ x: 0, y: 0, active: false });
    gameRef.current?.setJoystick(0, 0);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#070d18] select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none" />

      {/* flash de daño */}
      <div
        key={hurtFx}
        className="pointer-events-none absolute inset-0 animate-hurt z-30"
        style={{ boxShadow: "inset 0 0 120px 30px rgba(255,60,40,0.55)" }}
      />

      {/* ============================== HUD ============================== */}
      {hud && !showIntro && phase !== "over" && (
        <>
          {/* barra superior */}
          <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-between gap-2 p-2 pt-12 sm:p-3 sm:pt-13">
            {/* vida */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 rounded-xl border border-[#223350] bg-[#0f1b31]/90 px-3 py-2 backdrop-blur">
                <Heart size={16} style={{ color: HEX.red, fill: HEX.red }} />
                <div className="h-3.5 w-24 sm:w-32 overflow-hidden rounded-full bg-[#1a2740]">
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      width: `${hpPct}%`,
                      background: hpPct > 50 ? "linear-gradient(90deg,#7dffa8,#a8e63c)" : hpPct > 25 ? "linear-gradient(90deg,#ffa02f,#ffc46b)" : "linear-gradient(90deg,#ff5a4e,#ff8a5e)",
                    }}
                  />
                </div>
                <span className="font-display text-[11px] text-[#e9f1fc]">{hud.hp}/{hud.maxHp}</span>
              </div>
              {/* dash */}
              <div className="flex items-center gap-1.5 rounded-lg border border-[#223350] bg-[#0f1b31]/80 px-2.5 py-1">
                <Wind size={12} style={{ color: hud.dashReady >= 1 ? HEX.cyan : "#4a5c7d" }} />
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#1a2740]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, hud.dashReady * 100)}%`, background: HEX.cyan }} />
                </div>
              </div>
              {/* misiones */}
              <div className="hidden sm:flex flex-col gap-1">
                {hud.missions.map((m, i) => (
                  <div key={i} className={`rounded-lg border px-2.5 py-1.5 backdrop-blur ${m.done ? "border-[#a8e63c]/50 bg-[#0f1b31]/85" : "border-[#223350] bg-[#0f1b31]/80"}`}>
                    <div className="flex items-center gap-1.5">
                      {m.done ? <ShieldAlert size={12} style={{ color: HEX.lime }} /> : <Target size={12} style={{ color: HEX.amber }} />}
                      <span className={`text-[10.5px] leading-tight ${m.done ? "text-[#a8e63c] line-through" : "text-[#c9d6ec]"}`}>{m.desc}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <div className="h-1 w-20 overflow-hidden rounded-full bg-[#1a2740]">
                        <div className="h-full rounded-full" style={{ width: `${(m.progress / m.target) * 100}%`, background: m.done ? HEX.lime : HEX.amber }} />
                      </div>
                      <span className="text-[9px] text-[#8fa4c2]">+{m.reward}🪙</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* fase central */}
            <div className="flex flex-col items-center gap-1">
              <div className="rounded-xl border border-[#223350] bg-[#0f1b31]/90 px-3 py-1.5 text-center backdrop-blur">
                <div className="font-display text-[11px] tracking-wide" style={{ color: phase === "night" ? HEX.red : phase === "cleared" ? HEX.lime : HEX.cyan }}>
                  {hud.phaseLabel || "HOTEL ∞"}
                </div>
                <div className="mt-1 h-1.5 w-28 sm:w-40 overflow-hidden rounded-full bg-[#1a2740]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${hud.phaseProgress * 100}%`, background: phase === "night" ? HEX.red : HEX.amber }} />
                </div>
              </div>
              <div className="rounded-lg border border-[#223350] bg-[#0f1b31]/85 px-2.5 py-1 font-display text-[10px] text-[#8fa4c2]">
                {hud.floorCode} · {hud.floorName}
              </div>
              {phase === "night" && (
                <div className="rounded-lg bg-[#3a0d0d]/90 border border-[#ff5a4e]/40 px-2.5 py-0.5 text-[10px] font-bold" style={{ color: HEX.red }}>
                  ANOMALÍAS: {hud.enemiesAlive}
                </div>
              )}
            </div>

            {/* economía */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-3 rounded-xl border border-[#223350] bg-[#0f1b31]/90 px-3 py-2 backdrop-blur">
                <span className="flex items-center gap-1 font-display text-xs" style={{ color: HEX.gold }}>
                  <Coins size={14} /> {hud.coins}
                </span>
                {hud.keys > 0 && (
                  <span className="flex items-center gap-1 font-display text-xs" style={{ color: HEX.cyan }}>
                    <KeyRound size={14} /> {hud.keys}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-[#223350] bg-[#0f1b31]/90 px-3 py-1.5">
                <span className="font-display text-xs text-[#e9f1fc]">{hud.score} PTS</span>
                <span className="flex items-center gap-1 text-[10px] text-[#8fa4c2]"><Trophy size={11} style={{ color: HEX.amber }} />{hud.best}</span>
              </div>
              {hud.combo >= 2 && (
                <div key={hud.combo} className="animate-pop rounded-lg px-3 py-1 font-display text-lg" style={{ background: "rgba(168,230,60,0.15)", color: HEX.lime, border: `1px solid ${HEX.lime}55` }}>
                  COMBO ×{hud.combo}
                </div>
              )}
              <button
                onClick={() => { setMuted((m) => { gameRef.current?.setMuted(!m); return !m; }); }}
                className="rounded-lg border border-[#223350] bg-[#0f1b31]/90 p-1.5 text-[#8fa4c2] hover:text-[#e9f1fc]"
                aria-label="Silenciar"
              >
                {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
            </div>
          </div>

          {/* prompt de interacción */}
          {hud.prompt && (
            <div className="absolute bottom-36 sm:bottom-24 left-1/2 z-20 -translate-x-1/2 animate-pop">
              <div className="flex items-center gap-2 rounded-full border px-4 py-2 backdrop-blur" style={{ borderColor: `${HEX.lime}66`, background: "rgba(10,18,32,0.9)" }}>
                {!isTouch.current && <kbd className="rounded bg-[#223350] px-1.5 py-0.5 font-display text-[10px] text-[#e9f1fc]">E</kbd>}
                <span className="text-xs font-bold" style={{ color: HEX.lime }}>{hud.prompt}</span>
              </div>
            </div>
          )}

          {/* banner de oleada */}
          {banner && (
            <div key={banner.id} className="absolute inset-x-0 top-[22%] z-20 flex justify-center animate-banner">
              <div className="text-center">
                <div className="font-display text-2xl sm:text-4xl drop-shadow-[0_4px_0_rgba(0,0,0,0.6)]" style={{ color: banner.title.includes("GERENTE") ? HEX.red : banner.title.includes("6:00") ? HEX.lime : HEX.amber }}>
                  {banner.title}
                </div>
                <div className="mt-1 text-xs sm:text-sm text-[#c9d6ec]">{banner.sub}</div>
              </div>
            </div>
          )}

          {/* barra de construcción */}
          <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
            <div className="flex items-end gap-1.5">
              {BUILD_SLOTS.map((slot, i) => {
                const afford = hud.coins >= slot.cost;
                const active = buildMode === slot.kind;
                const Icon = slot.icon;
                return (
                  <button
                    key={slot.kind}
                    onClick={() => gameRef.current?.selectBuild(active ? null : slot.kind)}
                    className={`relative flex w-[76px] sm:w-[92px] flex-col items-center gap-0.5 rounded-xl border px-1 py-2 backdrop-blur transition-all ${
                      active ? "scale-105" : afford ? "hover:scale-105" : "opacity-45"
                    }`}
                    style={{
                      borderColor: active ? HEX.lime : "#223350",
                      background: active ? "rgba(168,230,60,0.12)" : "rgba(15,27,49,0.9)",
                      boxShadow: active ? `0 0 14px ${HEX.lime}44` : "none",
                    }}
                  >
                    <span className="absolute -top-1.5 -left-1 rounded px-1 font-display text-[9px] bg-[#223350] text-[#c9d6ec]">{i + 1}</span>
                    <Icon size={18} style={{ color: active ? HEX.lime : "#8fa4c2" }} />
                    <span className="font-display text-[8.5px] text-[#c9d6ec]">{slot.label}</span>
                    <span className="flex items-center gap-0.5 text-[9px]" style={{ color: afford ? HEX.gold : HEX.red }}>
                      <Coins size={9} /> {slot.cost}
                    </span>
                  </button>
                );
              })}
            </div>
            {buildMode && (
              <div className="mt-1 text-center text-[10px] font-bold animate-pulse" style={{ color: HEX.lime }}>
                {isTouch.current ? "TOCA EL SUELO PARA COLOCAR" : "CLIC PARA COLOCAR · Q CANCELAR"}
              </div>
            )}
          </div>

          {/* pausa */}
          <button
            onClick={() => gameRef.current?.togglePause()}
            className="absolute right-2 bottom-3 sm:bottom-4 z-20 rounded-lg border border-[#223350] bg-[#0f1b31]/90 p-2 text-[#8fa4c2] hover:text-[#e9f1fc]"
            aria-label="Pausa"
          >
            <Pause size={16} />
          </button>
        </>
      )}

      {/* ====================== controles táctiles ====================== */}
      {isTouch.current && !showIntro && phase !== "over" && phase !== "intro" && (
        <>
          <div
            className="absolute bottom-0 left-0 z-20 h-44 w-44 touch-none"
            onPointerDown={joyDown}
            onPointerMove={joyMove}
            onPointerUp={joyUp}
            onPointerCancel={joyUp}
          >
            <div className={`absolute bottom-6 left-6 h-28 w-28 rounded-full border-2 ${joyKnob.active ? "border-[#a8e63c]/60" : "border-[#223350]"} bg-[#0f1b31]/50 backdrop-blur`}>
              <div
                className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#a8e63c]/40 bg-[#1a2740]/90"
                style={{ transform: `translate(calc(-50% + ${joyKnob.x}px), calc(-50% + ${joyKnob.y}px))` }}
              />
            </div>
          </div>
          <div className="absolute bottom-24 right-3 z-20 flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <TouchBtn label="SALTO" onPress={() => gameRef.current?.pressJump()} color={HEX.cyan} />
              <TouchBtn label="TURBO" onPress={() => gameRef.current?.pressDash()} color={HEX.amber} />
            </div>
            <div className="flex gap-2">
              <TouchBtn label="USAR" onPress={() => gameRef.current?.pressInteract()} color={HEX.gold} small />
              <TouchBtn label="GOLPEAR" big onPress={() => gameRef.current?.pressAttack()} color={HEX.red} />
            </div>
          </div>
        </>
      )}

      {/* ============================== intro ============================== */}
      {showIntro && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-gradient-to-b from-[#070d18ee] via-[#0a1220dd] to-[#070d18f5] p-4">
          <div className="max-w-lg text-center">
            <div className="font-display text-4xl sm:text-5xl leading-none" style={{ color: HEX.gold }}>
              HOTEL ∞
            </div>
            <div className="mt-1 font-display text-xl sm:text-2xl" style={{ color: HEX.red }}>
              NOCHE INFINITA
            </div>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#c9d6ec]">
              Explora habitaciones, saquea monedas, <b className="text-[#e9f1fc]">construye defensas</b> y
              sobrevive a las <b style={{ color: HEX.red }}>3 oleadas de anomalías</b> de cada noche.
              Sube al ascensor… los pisos nunca terminan.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-left text-[11px] sm:grid-cols-4">
              {[
                { icon: Gamepad2, txt: "WASD moverse · ratón cámara" },
                { icon: Swords, txt: "Clic / J: golpe de escoba" },
                { icon: Shield, txt: "1·2·3: construir defensas" },
                { icon: MousePointer2, txt: "E: puertas · cofres · ascensor" },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-[#223350] bg-[#0f1b31]/80 p-2">
                  <c.icon size={14} style={{ color: HEX.cyan, flexShrink: 0 }} />
                  <span className="text-[#c9d6ec]">{c.txt}</span>
                </div>
              ))}
            </div>
            <button
              onClick={play}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl px-10 py-4 font-display text-lg text-[#08101f] shadow-[0_8px_0_rgba(90,130,20,1)] transition-all hover:translate-y-0.5 hover:shadow-[0_5px_0_rgba(90,130,20,1)] active:shadow-none"
              style={{ background: HEX.lime }}
            >
              <Play size={20} fill="#08101f" /> JUGAR
            </button>
            {isTouch.current && (
              <div className="mt-3 text-[11px] text-[#8fa4c2]">Móvil: joystick + botones · barra de construcción abajo</div>
            )}
          </div>
        </div>
      )}

      {/* ============================== pausa ============================== */}
      {phase === "paused" && !gameOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070d18e0] backdrop-blur-sm">
          <div className="w-72 rounded-2xl border border-[#223350] bg-[#0f1b31] p-6 text-center">
            <div className="font-display text-xl text-[#e9f1fc]">PAUSA</div>
            <div className="mt-4 flex flex-col gap-2">
              <button onClick={() => gameRef.current?.togglePause()} className="flex items-center justify-center gap-2 rounded-xl py-3 font-display text-sm text-[#08101f]" style={{ background: HEX.lime }}>
                <Play size={16} /> CONTINUAR
              </button>
              <button onClick={restart} className="flex items-center justify-center gap-2 rounded-xl border border-[#223350] py-3 font-display text-sm text-[#c9d6ec]">
                <RotateCcw size={15} /> REINICIAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================== mejoras ============================== */}
      {upgrades && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070d18e6] p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl text-center">
            <div className="font-display text-2xl" style={{ color: HEX.gold }}>PISO SUPERADO</div>
            <p className="mt-1 text-sm text-[#c9d6ec]">Elige una mejora para el siguiente piso:</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {upgrades.map((u) => {
                const Icon = UPGRADE_ICONS[u.icon] ?? Zap;
                return (
                  <button
                    key={u.id}
                    onClick={() => gameRef.current?.chooseUpgrade(u.id)}
                    className="group flex flex-col items-center gap-2 rounded-2xl border-2 border-[#223350] bg-[#0f1b31] p-5 transition-all hover:-translate-y-1 hover:border-[#a8e63c] hover:shadow-[0_10px_30px_rgba(168,230,60,0.15)]"
                  >
                    <span className="rounded-xl p-3" style={{ background: "rgba(168,230,60,0.12)" }}>
                      <Icon size={28} className="text-[#a8e63c]" />
                    </span>
                    <span className="font-display text-sm text-[#e9f1fc]">{u.title}</span>
                    <span className="text-[11px] leading-snug text-[#8fa4c2]">{u.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================== game over ============================== */}
      {gameOver && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#180a0af0] p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-[#ff5a4e]/30 bg-[#0f1b31] p-8 text-center">
            <div className="font-display text-3xl" style={{ color: HEX.red }}>FIN DEL TURNO</div>
            <p className="mt-1 text-sm text-[#c9d6ec]">Las anomalías te alcanzaron…</p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-left">
              {[
                { k: "PUNTOS", v: gameOver.score, hot: true },
                { k: "RÉCORD", v: gameOver.best, hot: false },
                { k: "BAJAS", v: gameOver.kills, hot: false },
                { k: "MONEDAS", v: gameOver.coinsEarned, hot: false },
                { k: "HABITACIONES", v: gameOver.rooms, hot: false },
                { k: "PISOS", v: gameOver.floors, hot: false },
              ].map((s) => (
                <div key={s.k} className="rounded-xl border border-[#223350] bg-[#0a1220] px-4 py-3">
                  <div className="text-[10px] tracking-widest text-[#8fa4c2]">{s.k}</div>
                  <div className="font-display text-xl" style={{ color: s.hot ? HEX.gold : "#e9f1fc" }}>{s.v}</div>
                </div>
              ))}
            </div>
            {gameOver.score >= gameOver.best && gameOver.score > 0 && (
              <div className="mt-3 font-display text-sm animate-pulse" style={{ color: HEX.lime }}>¡NUEVO RÉCORD!</div>
            )}
            <button
              onClick={restart}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl px-8 py-4 font-display text-base text-[#08101f] shadow-[0_6px_0_rgba(90,130,20,1)] transition-all hover:translate-y-0.5"
              style={{ background: HEX.lime }}
            >
              <RotateCcw size={18} /> OTRA NOCHE
            </button>
          </div>
        </div>
      )}

      {/* toasts */}
      <div className="pointer-events-none absolute left-1/2 top-[13%] z-20 flex w-max -translate-x-1/2 flex-col items-center gap-1.5">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-pop rounded-full border px-4 py-1.5 text-xs font-bold backdrop-blur"
            style={{
              borderColor: t.kind === "ok" ? `${HEX.lime}66` : t.kind === "bad" ? `${HEX.red}66` : "#223350",
              background: "rgba(10,18,32,0.92)",
              color: t.kind === "ok" ? HEX.lime : t.kind === "bad" ? HEX.red : "#c9d6ec",
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>

      {/* animaciones locales */}
      <style>{`
        @keyframes hurtFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
        .animate-hurt { animation: hurtFlash 0.5s ease-out forwards; }
        @keyframes popIn { 0% { transform: scale(0.7); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .animate-pop { animation: popIn 0.18s ease-out; }
        @keyframes bannerIn { 0% { transform: scale(0.8); opacity: 0; } 12% { transform: scale(1.05); opacity: 1; } 20% { transform: scale(1); } 85% { opacity: 1; } 100% { opacity: 0; } }
        .animate-banner { animation: bannerIn 3.2s ease-out forwards; }
      `}</style>
    </div>
  );
}

function TouchBtn({
  label, onPress, color, big, small,
}: {
  label: string;
  onPress: () => void;
  color: string;
  big?: boolean;
  small?: boolean;
}) {
  const size = big ? "h-20 w-20 text-[11px]" : small ? "h-12 w-12 text-[9px]" : "h-14 w-14 text-[10px]";
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      className={`${size} rounded-full border-2 font-display backdrop-blur active:scale-90 transition-transform`}
      style={{ borderColor: `${color}88`, background: `${color}22`, color }}
    >
      {label}
    </button>
  );
}
