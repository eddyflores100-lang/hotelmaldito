/* ============================================================
   HOTEL ∞ INFINITO — Demo 3D · interfaz del juego
   HUD + ficha de registro + menús + controles táctiles.
   ============================================================ */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight, BadgeCheck, Ban, BookOpen, Clock, Coins, Gauge,
  Gamepad2, Heart, Moon, MousePointer2, Pause, Play, RotateCcw,
  ShieldAlert, Sparkles, Users, Volume2, VolumeX,
} from "lucide-react";
import type { Game, GameStats, HudState } from "../game/Game";
import type { GuestCardData } from "../game/guest";

type Toast = { id: number; msg: string; kind: "ok" | "bad" | "info" };

const HEX = {
  amber: "#ffa02f",
  lime: "#a8e63c",
  cyan: "#38e1d4",
  red: "#ff5a4e",
};

function Hearts({ n }: { n: number }) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <Heart
          key={i}
          size={18}
          strokeWidth={2.5}
          className="transition-all duration-300"
          style={{
            color: i < n ? HEX.red : "#31405c",
            fill: i < n ? HEX.red : "transparent",
            transform: i < n ? "scale(1)" : "scale(0.82)",
          }}
        />
      ))}
    </div>
  );
}

function GameButton({
  children, onClick, kind = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  kind?: "primary" | "danger" | "ghost";
}) {
  const bg = kind === "primary" ? HEX.lime : kind === "danger" ? HEX.red : "var(--color-panel)";
  const fg = kind === "ghost" ? "var(--color-paper)" : "#08101f";
  return (
    <button
      onClick={onClick}
      className="font-display inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/30 px-6 py-3.5 text-sm tracking-wide shadow-[0_6px_0_rgba(0,0,0,0.45)] transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-none md:text-base"
      style={{ background: bg, color: fg }}
    >
      {children}
    </button>
  );
}

export default function Game3D({ onOpenGdd }: { onOpenLab: () => void; onOpenGdd: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const joyRef = useRef<HTMLDivElement>(null);
  const toastId = useRef(0);

  const [hud, setHud] = useState<HudState | null>(null);
  const [card, setCard] = useState<GuestCardData | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [hurt, setHurt] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cleared, setCleared] = useState<GameStats | null>(null);
  const [over, setOver] = useState<GameStats | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [booted, setBooted] = useState(false);

  /* ------------------------- init del motor ------------------------- */
  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const mobileUA = /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
    setIsTouch(coarse || (hasTouch && window.innerWidth < 820) || (mobileUA && window.innerWidth < 820));
    const canvas = canvasRef.current;
    if (!canvas || gameRef.current) return;
    let mounted = true;

    import("../game/Game").then(({ Game }) => {
      if (!mounted || !canvasRef.current) return;
      const g = new Game(canvasRef.current, {
        onHud: (s) => setHud(s),
        onCard: (c) => setCard(c),
        onToast: (msg, kind) => {
          const id = ++toastId.current;
          setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
          window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
        },
        onHurt: () => {
          setHurt(true);
          window.setTimeout(() => setHurt(false), 550);
        },
        onCleared: (stats) => setCleared(stats),
        onGameOver: (stats) => setOver(stats),
      });
      gameRef.current = g;
      (window as unknown as { __hotelGame?: Game }).__hotelGame = g;
      setBooted(true);
    });

    return () => {
      mounted = false;
      gameRef.current?.dispose();
      gameRef.current = null;
    };
  }, []);

  /* --------------------------- teclas ficha --------------------------- */
  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "e" || k === "enter" || k === "1") {
        e.preventDefault();
        gameRef.current?.decide(true);
      } else if (k === "q" || k === "backspace" || k === "2") {
        e.preventDefault();
        gameRef.current?.decide(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  /* ----------------------------- joystick ----------------------------- */
  const joyActive = useRef(false);
  const updateJoy = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = r.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    setKnob({ x: dx, y: dy });
    gameRef.current?.setJoystick(dx / max, dy / max);
  };
  const endJoy = () => {
    joyActive.current = false;
    setKnob({ x: 0, y: 0 });
    gameRef.current?.setJoystick(0, 0);
  };

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      gameRef.current?.audio.setMuted(!m);
      return !m;
    });
  }, []);

  const phase = hud?.phase ?? "intro";
  const showIntroCard = phase === "intro";
  const promptVisible = phase === "play" && hud?.prompt;

  return (
    <div id="jugar-top" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 md:pt-12">
      {/* ------------------------- cabecera ------------------------- */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 font-display text-xs tracking-[0.3em]" style={{ color: HEX.amber }}>
            DEMO JUGABLE 3D
          </p>
          <h2 className="font-display text-3xl leading-none text-paper md:text-5xl">
            TURNO DE NOCHE ∞
          </h2>
        </div>
        <p className="max-w-sm text-sm text-fog">
          Prototipo jugable del loop del GDD: atiende la recepción, detecta anomalías
          y sobrevive hasta las 6:00 AM. Construido con Three.js.
        </p>
      </div>

      {/* --------------------------- lienzo --------------------------- */}
      <div
        className="relative overflow-hidden rounded-2xl border border-line bg-deep shadow-2xl"
        style={{ height: "min(76vh, 720px)", minHeight: 420 }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full touch-none select-none" />

        {/* flash de daño */}
        {hurt && (
          <div
            className="pointer-events-none absolute inset-0 z-30 animate-pulse"
            style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(255,36,24,0.55) 100%)" }}
          />
        )}

        {/* --------------------------- HUD --------------------------- */}
        {hud && (phase === "play" || phase === "card" || phase === "paused") && (
          <>
            {/* fila superior */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 md:p-4">
              <div className="rounded-lg border border-line bg-deep/80 px-3 py-2 backdrop-blur-sm">
                <p className="font-display text-[11px] leading-tight" style={{ color: hud.floorCode === "P-∞" ? HEX.amber : HEX.cyan }}>
                  {hud.floorCode}
                </p>
                <p className="text-[11px] text-fog">{hud.floorName}</p>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2 rounded-lg border border-line bg-deep/80 px-3 py-1.5 backdrop-blur-sm">
                  <Moon size={14} style={{ color: HEX.cyan }} />
                  <span className="font-display text-sm text-paper">{hud.timeLabel}</span>
                </div>
                <div className="h-1.5 w-36 overflow-hidden rounded-full bg-panel">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${hud.nightProgress * 100}%`, background: `linear-gradient(90deg, ${HEX.cyan}, ${HEX.amber})` }}
                  />
                </div>
                {hud.combo >= 2 && (
                  <span className="font-display rounded-full px-2 py-0.5 text-[10px]" style={{ background: HEX.lime, color: "#08101f" }}>
                    RACHA ×{hud.combo}
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <Hearts n={hud.hearts} />
                <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-deep/80 px-2.5 py-1 backdrop-blur-sm">
                  <Coins size={13} style={{ color: HEX.amber }} />
                  <span className="font-display text-xs text-paper">{hud.money} R$</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-fog">
                  <Users size={11} /> {hud.waiting} en fila
                </div>
              </div>
            </div>

            {/* botones pausa/mute */}
            <div className="absolute right-3 top-28 z-20 flex flex-col gap-2 md:top-20">
              <button
                onClick={() => gameRef.current?.togglePause()}
                className="cursor-pointer rounded-lg border border-line bg-deep/80 p-2 text-fog backdrop-blur-sm transition hover:text-paper"
                aria-label="Pausa"
              >
                <Pause size={15} />
              </button>
              <button
                onClick={toggleMute}
                className="cursor-pointer rounded-lg border border-line bg-deep/80 p-2 text-fog backdrop-blur-sm transition hover:text-paper"
                aria-label={muted ? "Activar sonido" : "Silenciar"}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>

            {/* prompt de atención */}
            {promptVisible && !isTouch && (
              <div className="pointer-events-none absolute bottom-20 left-1/2 z-20 -translate-x-1/2">
                <div className="font-display flex items-center gap-2 rounded-xl border px-4 py-2 text-xs backdrop-blur-sm"
                  style={{ borderColor: HEX.lime, background: "rgba(7,13,24,0.85)", color: HEX.lime }}>
                  <kbd className="rounded bg-lime px-1.5 py-0.5 text-[10px] text-deep">E</kbd>
                  ATENDER HUÉSPED
                </div>
              </div>
            )}

            {/* pausa */}
            {phase === "paused" && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-deep/80 backdrop-blur-sm">
                <p className="font-display text-2xl text-paper">PAUSA</p>
                <p className="text-sm text-fog">El hotel también descansa. Poco.</p>
                <GameButton onClick={() => gameRef.current?.togglePause()}>
                  <Play size={16} /> CONTINUAR
                </GameButton>
              </div>
            )}

            {/* ------------------ controles táctiles ------------------ */}
            {isTouch && phase === "play" && (
              <>
                <div
                  ref={joyRef}
                  className="absolute bottom-5 left-5 z-20 h-28 w-28 rounded-full border-2 border-line bg-deep/60 backdrop-blur-sm"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    joyActive.current = true;
                    updateJoy(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => joyActive.current && updateJoy(e.clientX, e.clientY)}
                  onPointerUp={endJoy}
                  onPointerCancel={endJoy}
                >
                  <div
                    className="absolute h-12 w-12 rounded-full border border-line bg-panel2 shadow-lg"
                    style={{
                      left: `calc(50% - 24px + ${knob.x}px)`,
                      top: `calc(50% - 24px + ${knob.y}px)`,
                    }}
                  />
                </div>
                <div className="absolute bottom-6 right-5 z-20 flex gap-3">
                  <button
                    onClick={() => gameRef.current?.pressJump()}
                    className="font-display h-16 w-16 rounded-full border border-line bg-panel/90 text-[10px] text-fog backdrop-blur-sm active:scale-95"
                  >
                    SALTAR
                  </button>
                  <button
                    onClick={() => gameRef.current?.pressInteract()}
                    className="font-display h-16 w-16 rounded-full border text-[10px] shadow-lg active:scale-95"
                    style={{
                      borderColor: promptVisible ? HEX.lime : "var(--color-line)",
                      background: promptVisible ? HEX.lime : "rgba(19,33,60,0.9)",
                      color: promptVisible ? "#08101f" : "var(--color-fog)",
                    }}
                  >
                    ATENDER
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ------------------- ficha de registro ------------------- */}
        {card && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-deep/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border-2 bg-panel p-5 shadow-2xl" style={{ borderColor: HEX.amber }}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-display text-xs tracking-widest" style={{ color: HEX.amber }}>
                  FICHA DE REGISTRO
                </p>
                <span className="flex items-center gap-1 text-[11px] text-fog">
                  <Clock size={12} /> verificación obligatoria
                </span>
              </div>

              <div className="mb-4 flex items-start gap-4">
                {/* foto declarada */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="h-16 w-16 rounded-lg border-2 border-line shadow-inner"
                    style={{ background: card.cardColor }}
                  />
                  <span className="text-[10px] uppercase tracking-wider text-fog">foto ficha</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display truncate text-lg text-paper">{card.name}</p>
                  <p className="text-xs text-fog">{card.reason}</p>
                </div>
              </div>

              <div className="mb-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-line bg-deep px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-fog">habitación</p>
                  <p className="font-display text-sm text-paper">{card.room}</p>
                </div>
                <div className="rounded-lg border border-line bg-deep px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-fog">llegada</p>
                  <p className="font-display text-sm text-paper">{card.hour}</p>
                </div>
                <div className="rounded-lg border border-line bg-deep px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-fog">noches</p>
                  <p className="font-display text-sm text-paper">{card.nights}</p>
                </div>
              </div>

              <div className="mb-4 rounded-lg border border-line bg-deep/60 px-3 py-2 text-[11px] leading-relaxed text-fog">
                <span className="font-display" style={{ color: HEX.cyan }}>MANUAL:</span>{" "}
                compara el color de la ficha con la chaqueta real del huésped · habitaciones válidas
                P-01 a P-99 · llegadas válidas 22:00–04:00 · mira bien sus ojos, su sombra y sus piernas.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => gameRef.current?.decide(false)}
                  className="font-display flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/30 px-4 py-3 text-xs shadow-[0_5px_0_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
                  style={{ background: HEX.red, color: "#1a0505" }}
                >
                  <ShieldAlert size={16} /> DENUNCIAR <span className="opacity-60">[Q]</span>
                </button>
                <button
                  onClick={() => gameRef.current?.decide(true)}
                  className="font-display flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/30 px-4 py-3 text-xs shadow-[0_5px_0_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5"
                  style={{ background: HEX.lime, color: "#08101f" }}
                >
                  <BadgeCheck size={16} /> DAR ENTRADA <span className="opacity-60">[E]</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --------------------- intro de piso --------------------- */}
        {showIntroCard && hud && !over && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-deep/85 p-6 text-center backdrop-blur-sm">
            <p className="font-display text-xs tracking-[0.4em]" style={{ color: HEX.cyan }}>
              {hud.floorIndex === 0 ? "TURNO 1 · 12:00 AM" : `TURNO ${hud.floorIndex + 1} · ASCENSOR`}
            </p>
            <div>
              <p className="font-display text-4xl md:text-5xl" style={{ color: HEX.amber }}>
                {hud.floorCode}
              </p>
              <h3 className="font-display mt-2 text-xl text-paper md:text-2xl">{hud.floorName}</h3>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-fog">{hud.floorName && "Atiende la recepción hasta las 6:00 AM. Los huéspedes normales entran y pagan. Las anomalías se denuncian: ojos rojos, cuerpo gris, piernas imposibles, sombra ausente, flotación o fichas falsificadas."}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-fog">
              {isTouch ? (
                <>
                  <span className="flex items-center gap-1"><Gamepad2 size={13} /> joystick para moverte</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><MousePointer2 size={13} /> arrastra fuera del joystick para girar la cámara</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1"><Gamepad2 size={13} /> WASD / flechas</span>
                  <span>·</span>
                  <span>ESPACIO salta</span>
                  <span>·</span>
                  <span>E atiende</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><MousePointer2 size={13} /> arrastra para la cámara</span>
                </>
              )}
            </div>
            <GameButton
              onClick={() => {
                if (hud.floorIndex > 0) gameRef.current?.beginShift();
                else gameRef.current?.beginShift();
              }}
            >
              <Play size={17} /> {hud.floorIndex === 0 ? "EMPEZAR TURNO" : "BAJAR EN EL PISO"}
            </GameButton>
            {!booted && <p className="text-xs text-fog">cargando el hotel…</p>}
          </div>
        )}

        {/* --------------------- noche superada --------------------- */}
        {cleared && phase === "cleared" && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-deep/85 p-6 text-center backdrop-blur-sm">
            <p className="font-display text-xs tracking-[0.4em]" style={{ color: HEX.lime }}>
              06:00 AM · AMANECE
            </p>
            <h3 className="font-display text-3xl text-paper md:text-4xl">NOCHE SUPERADA</h3>
            <p className="max-w-sm text-sm text-fog">
              El ascensor se abre con un ding demasiado amable. Abajo siempre hay otro piso.
            </p>
            <div className="flex gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-paper"><Coins size={15} style={{ color: HEX.amber }} /> {cleared.money} R$</span>
              <span className="flex items-center gap-1.5 text-paper"><BadgeCheck size={15} style={{ color: HEX.lime }} /> {cleared.correct} aciertos</span>
              <span className="flex items-center gap-1.5 text-paper"><ShieldAlert size={15} style={{ color: HEX.red }} /> {cleared.mistakes} errores</span>
            </div>
            <GameButton
              onClick={() => {
                setCleared(null);
                gameRef.current?.nextFloor();
              }}
            >
              <ArrowRight size={17} /> SUBIR AL SIGUIENTE PISO
            </GameButton>
          </div>
        )}

        {/* ------------------------ game over ------------------------ */}
        {over && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-deep/90 p-6 text-center backdrop-blur-sm">
            <p className="font-display text-xs tracking-[0.4em]" style={{ color: HEX.red }}>
              EXPEDIENTE CERRADO
            </p>
            <h3 className="font-display text-3xl text-paper md:text-4xl">DESPEDEDO</h3>
            <p className="max-w-sm text-sm text-fog">
              El hotel te entrega un sobre con tu última propina y una foto tuya que no recuerdas.
              Mañana hay otra plaza libre. Siempre la hay.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-paper"><Gauge size={15} style={{ color: HEX.cyan }} /> pisos: {over.floorsCleared}</span>
              <span className="flex items-center gap-1.5 text-paper"><Coins size={15} style={{ color: HEX.amber }} /> {over.money} R$</span>
              <span className="flex items-center gap-1.5 text-paper"><BadgeCheck size={15} style={{ color: HEX.lime }} /> {over.correct} aciertos</span>
            </div>
            <GameButton
              onClick={() => {
                setOver(null);
                gameRef.current?.restart();
              }}
            >
              <RotateCcw size={17} /> OTRO TURNO
            </GameButton>
          </div>
        )}

        {/* --------------------------- toasts --------------------------- */}
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex w-max max-w-[92%] -translate-x-1/2 flex-col items-center gap-1.5">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="font-display rounded-lg border px-3 py-1.5 text-[11px] backdrop-blur-sm"
              style={{
                borderColor: t.kind === "ok" ? HEX.lime : t.kind === "bad" ? HEX.red : "var(--color-line)",
                background: "rgba(7,13,24,0.85)",
                color: t.kind === "ok" ? HEX.lime : t.kind === "bad" ? HEX.red : "var(--color-fog)",
              }}
            >
              {t.msg}
            </div>
          ))}
        </div>
      </div>

      {/* ------------------- ayuda bajo el lienzo ------------------- */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-fog">
        {!isTouch ? (
          <>
            <span><kbd className="rounded bg-panel px-1.5 py-0.5 font-display text-[10px] text-paper">WASD</kbd> moverse</span>
            <span><kbd className="rounded bg-panel px-1.5 py-0.5 font-display text-[10px] text-paper">ESPACIO</kbd> saltar</span>
            <span><kbd className="rounded bg-panel px-1.5 py-0.5 font-display text-[10px] text-paper">E</kbd> atender / aceptar</span>
            <span><kbd className="rounded bg-panel px-1.5 py-0.5 font-display text-[10px] text-paper">Q</kbd> denunciar</span>
            <span><kbd className="rounded bg-panel px-1.5 py-0.5 font-display text-[10px] text-paper">P</kbd> pausa</span>
            <span className="flex items-center gap-1"><MousePointer2 size={11} /> arrastrar = cámara</span>
          </>
        ) : (
          <span className="flex items-center gap-1"><Sparkles size={11} /> joystick + botones en pantalla</span>
        )}
      </div>

      {/* ----------------------- cómo jugar ----------------------- */}
      <div id="reglas" className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          {
            icon: <Users size={18} style={{ color: HEX.cyan }} />,
            title: "ATIENDE LA FILA",
            body: "Cada noche llegan huéspedes a recepción. Acércate, revisa su ficha y decide: ¿entran o se denuncian? Los normales dejan propina; la fila no espera para siempre.",
          },
          {
            icon: <Ban size={18} style={{ color: HEX.red }} />,
            title: "CAZA ANOMALÍAS",
            body: "Ojos rojos brillantes, cuerpo gris, piernas larguísimas, flotación, cara vacía o sin sombra. También mienten en la ficha: color distinto, habitación P-∞ o llegada a las 04:44.",
          },
          {
            icon: <BookOpen size={18} style={{ color: HEX.amber }} />,
            title: "SUBE EL HOTEL",
            body: "Sobrevive de 12:00 AM a 6:00 AM y el ascensor bajará a un piso peor: P-13, el Piso Espejo, la Caldera y más allá, pisos que no aparecen en ningún plano.",
          },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-deep">
              {c.icon}
            </div>
            <h4 className="font-display mb-2 text-sm text-paper">{c.title}</h4>
            <p className="text-xs leading-relaxed text-fog">{c.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-deep p-4">
        <p className="text-xs text-fog">
          Esta demo web es el <span className="text-paper">prototipo del loop central</span> del GDD.
          El juego completo se construye en Roblox Studio con Luau.
        </p>
        <button
          onClick={onOpenGdd}
          className="font-display inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-xs text-paper transition hover:border-amber hover:text-amber"
        >
          LEER EL GDD <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
