import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  FLOORS,
  FIRED_REASONS,
  FLAVOR_EVENTS,
  TASK_POOL,
  randomTip,
  rankForTips,
  type DemoTask,
} from "../data/demo";
import { IconArrow } from "./Icons";

/* ============================================================
   HOTEL ∞ INFINITO — Demo del turno de noche
   Piso P-13 (agua), P-∞ (controles invertidos + reflejos)
   y P--1 (la caldera). Loop de ~90 s por piso.
   ============================================================ */

const COLS = 11;
const ROWS = 7;
const TICK_MS = 120;
const GUEST_EVERY = 10; // ticks por paso de los reflejos
const DOOR_TOP_X = [2, 4, 6];
const DOOR_BOTTOM_X = [4, 6, 8];
const WATER_COUNT = 6;

type Pos = { x: number; y: number };
type Door = { x: number; y: number; side: "top" | "bottom"; task: DemoTask | null };
type Guest = Pos;
type Toast = { id: number; text: string; kind: "flavor" | "danger" | "good" };
type Phase = "intro" | "floor-intro" | "playing" | "cleared" | "fired" | "ending";

const isWall = (x: number, y: number) =>
  x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1;

const samePos = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;

function buildDoors(floorIndex: number): Door[] {
  const pool = [...TASK_POOL];
  // orden distinto por piso para que las tareas no se repitan igual
  const offset = floorIndex * 3;
  const make = (x: number, side: "top" | "bottom", i: number): Door => ({
    x,
    y: side === "top" ? 0 : ROWS - 1,
    side,
    task: pool[(offset + i) % pool.length],
  });
  return [
    ...DOOR_TOP_X.map((x, i) => make(x, "top", i)),
    ...DOOR_BOTTOM_X.map((x, i) => make(x, "bottom", i + 3)),
  ];
}

function randomInner(exclude: Pos[]): Pos {
  for (let tries = 0; tries < 80; tries++) {
    const p = {
      x: 1 + Math.floor(Math.random() * (COLS - 2)),
      y: 1 + Math.floor(Math.random() * (ROWS - 2)),
    };
    if (exclude.some((e) => samePos(e, p))) continue;
    return p;
  }
  return { x: 1, y: 1 };
}

function buildWater(start: Pos, doors: Door[]): Pos[] {
  const frontCells = doors.map((d) => ({
    x: d.x,
    y: d.side === "top" ? 1 : ROWS - 2,
  }));
  const exclude = [start, ...frontCells];
  const out: Pos[] = [];
  for (let i = 0; i < WATER_COUNT; i++) {
    const p = randomInner([...exclude, ...out]);
    out.push(p);
  }
  return out;
}

function farCorner(from: Pos): Pos {
  const corners: Pos[] = [
    { x: 1, y: 1 },
    { x: COLS - 2, y: 1 },
    { x: 1, y: ROWS - 2 },
    { x: COLS - 2, y: ROWS - 2 },
  ];
  return corners
    .map((c) => ({ c, d: Math.abs(c.x - from.x) + Math.abs(c.y - from.y) }))
    .sort((a, b) => b.d - a.d)[0].c;
}

function stepToward(from: Pos, to: Pos): Pos {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const tryX: Pos | null = dx !== 0 ? { x: from.x + Math.sign(dx), y: from.y } : null;
  const tryY: Pos | null = dy !== 0 ? { x: from.x, y: from.y + Math.sign(dy) } : null;
  return (tryX && !isWall(tryX.x, tryX.y) ? tryX : null) ?? (tryY && !isWall(tryY.x, tryY.y) ? tryY : from);
}

type Dir = "up" | "down" | "left" | "right";

function delta(dir: Dir, inverted: boolean): Pos {
  const map: Record<Dir, Pos> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const d = map[dir];
  if (!inverted) return d;
  return { x: -d.x, y: -d.y };
}

export default function DemoView({
  onOpenLab,
  onOpenGdd,
}: {
  onOpenLab: () => void;
  onOpenGdd: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [floorIndex, setFloorIndex] = useState(0);
  const [name, setName] = useState("");
  const floor = FLOORS[floorIndex];
  const inverted = floor.hazard === "espejos";

  // estado del piso
  const [doors, setDoors] = useState<Door[]>(() => buildDoors(0));
  const [water, setWater] = useState<Pos[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [heat, setHeat] = useState<number[]>([80, 80, 80]);
  const [player, setPlayer] = useState<Pos>({ x: 5, y: 3 });
  const [timeLeft, setTimeLeft] = useState(floor.time);
  const [hearts, setHearts] = useState(floor.hearts);
  const [completed, setCompleted] = useState(0);
  const [floorTips, setFloorTips] = useState(0);
  const [totalTips, setTotalTips] = useState(0);
  const [progress, setProgress] = useState(0);
  const [workingDoor, setWorkingDoor] = useState<number | null>(null);
  const [stun, setStun] = useState(0);
  const [invuln, setInvuln] = useState(0);
  const [blackout, setBlackout] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [firedReason, setFiredReason] = useState<string>(FIRED_REASONS.tiempo);
  const [hurtFlash, setHurtFlash] = useState(false);

  // refs de control
  const intent = useRef<Dir | null>(null);
  const actionHeld = useRef(false);
  const tick = useRef(0);
  const playerRef = useRef<Pos>({ x: 5, y: 3 });
  const guestsRef = useRef<Guest[]>([]);
  const waterRef = useRef<Pos[]>([]);
  const invulnRef = useRef(0);
  const stunRef = useRef(0);
  const heatRef = useRef<number[]>([80, 80, 80]);
  const timeRef = useRef(floor.time);
  const heartsRef = useRef(floor.hearts);
  const completedRef = useRef(0);
  const tipsRef = useRef({ floor: 0, total: 0 });
  const phaseRef = useRef<Phase>("intro");
  const hazardRef = useRef<"agua" | "espejos" | "caldera">("agua");
  const frontDoorRef = useRef<number | null>(null);
  const completeTaskRef = useRef<(i: number) => void>(() => {});
  const toastId = useRef(0);
  const eventTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  phaseRef.current = phase;
  hazardRef.current = floor.hazard;

  const pushToast = useCallback((text: string, kind: Toast["kind"] = "flavor") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  const damage = useCallback(
    (source: string) => {
      heartsRef.current -= 1;
      setHearts(heartsRef.current);
      setHurtFlash(true);
      setTimeout(() => setHurtFlash(false), 450);
      if (heartsRef.current <= 0) {
        setFiredReason(FIRED_REASONS[source] ?? FIRED_REASONS.tiempo);
        setPhase("fired");
      }
    },
    [],
  );

  /** Un paso inmediato en la dirección dada (respuesta táctil al toque). */
  const tryStep = useCallback(
    (dir: Dir) => {
      if (stunRef.current > 0) return;
      const hazard = hazardRef.current;
      const d = delta(dir, hazard === "espejos");
      const nx = playerRef.current.x + d.x;
      const ny = playerRef.current.y + d.y;
      if (isWall(nx, ny)) return;
      const next = { x: nx, y: ny };
      playerRef.current = next;
      setPlayer(next);
      if (hazard === "agua" && waterRef.current.some((w) => samePos(w, next))) {
        damage("agua");
        stunRef.current = 6;
        setStun(6);
        pushToast("¡Resbalón! Las toallas vuelan por los aires.", "danger");
      }
    },
    [damage, pushToast],
  );

  const startFloor = useCallback(
    (index: number) => {
      const f = FLOORS[index];
      const d = buildDoors(index);
      const start: Pos = { x: 5, y: 3 };
      setDoors(d);
      setPlayer(start);
      playerRef.current = start;
      setTimeLeft(f.time);
      timeRef.current = f.time;
      setHearts(f.hearts);
      heartsRef.current = f.hearts;
      setCompleted(0);
      completedRef.current = 0;
      setFloorTips(0);
      tipsRef.current.floor = 0;
      setProgress(0);
      setWorkingDoor(null);
      setStun(0);
      setInvuln(0);
      stunRef.current = 0;
      invulnRef.current = 0;
      setBlackout(false);
      intent.current = null;
      actionHeld.current = false;
      if (f.hazard === "agua") {
        const w = buildWater(start, d);
        setWater(w);
        waterRef.current = w;
        setGuests([]);
        guestsRef.current = [];
      } else if (f.hazard === "espejos") {
        setWater([]);
        waterRef.current = [];
        const g: Guest[] = [
          { x: 2, y: 4 },
          { x: 8, y: 2 },
        ];
        setGuests(g);
        guestsRef.current = g;
      } else {
        setWater([]);
        waterRef.current = [];
        setGuests([]);
        guestsRef.current = [];
        const h = [80, 80, 80];
        setHeat(h);
        heatRef.current = h;
      }
      setFloorIndex(index);
      setPhase("playing");
    },
    [],
  );

  const finishFloor = useCallback(() => {
    setTotalTips(tipsRef.current.total);
    setPhase("cleared");
  }, []);

  const completeTask = useCallback(
    (doorIdx: number) => {
      const tip = randomTip();
      const f = FLOORS[floorIndex];

      // Piso caldera: alimentar la caldera correspondiente (las puertas
      // inferiores son tuberías de la misma caldera).
      if (f.hazard === "caldera") {
        const calderaIdx = doorIdx <= 2 ? doorIdx : doorIdx - 3;
        heatRef.current[calderaIdx] = Math.min(100, heatRef.current[calderaIdx] + 45);
        setHeat([...heatRef.current]);
        tipsRef.current.floor += tip;
        tipsRef.current.total += tip;
        setFloorTips(tipsRef.current.floor);
        setTotalTips(tipsRef.current.total);
        setProgress(0);
        setWorkingDoor(null);
        pushToast(`+${tip} R$ · caldera alimentada`, "good");
        return;
      }

      tipsRef.current.floor += tip;
      tipsRef.current.total += tip;
      setFloorTips(tipsRef.current.floor);
      setTotalTips(tipsRef.current.total);
      completedRef.current += 1;
      setCompleted(completedRef.current);
      setProgress(0);
      setWorkingDoor(null);
      pushToast(`Propina +${tip} R$ · tarea lista`, "good");
      // la piscina se reorganiza tras cada tarea
      if (waterRef.current.length > 0) {
        const w = buildWater(playerRef.current, doors);
        setWater(w);
        waterRef.current = w;
      }
      const nextTask = TASK_POOL[Math.floor(Math.random() * TASK_POOL.length)];
      const completedCount = completedRef.current;
      setDoors((prev) =>
        prev.map((d, i) => (i === doorIdx ? { ...d, task: null } : d)),
      );
      setTimeout(() => {
        if (phaseRef.current !== "playing") return;
        setDoors((prev) =>
          prev.map((d, i) =>
            i === doorIdx ? { ...d, task: nextTask } : d,
          ),
        );
      }, 2200);
      if (f.quota > 0 && completedCount >= f.quota) {
        pushToast("Cuota cumplida. El ascensor te espera…", "good");
        finishFloor();
      }
    },
    [doors, floorIndex, finishFloor, pushToast],
  );

  /* ---------------- puerta en frente del jugador ---------------- */
  const frontDoorIdx = useMemo(() => {
    if (phase !== "playing") return null;
    const idx = doors.findIndex(
      (d) =>
        d.task != null &&
        (d.side === "top"
          ? d.x === player.x && player.y === 1
          : d.x === player.x && player.y === ROWS - 2),
    );
    return idx >= 0 ? idx : null;
  }, [doors, phase, player]);

  frontDoorRef.current = frontDoorIdx;
  completeTaskRef.current = completeTask;

  /* ---------------- loop principal ---------------- */
  useEffect(() => {
    if (phase !== "playing") return;
    const f = FLOORS[floorIndex];

    const moveIntent = intent;
    const onTick = () => {
      tick.current += 1;
      if (stunRef.current > 0) {
        stunRef.current -= 1;
        setStun(stunRef.current);
      }
      if (invulnRef.current > 0) {
        invulnRef.current -= 1;
        setInvuln(invulnRef.current);
      }

      // movimiento del jugador (manteniendo pulsada la dirección)
      if (moveIntent.current) tryStep(moveIntent.current);

      // reflejos
      if (f.hazard === "espejos" && tick.current % GUEST_EVERY === 0) {
        const next = guestsRef.current.map((g) => stepToward(g, playerRef.current));
        guestsRef.current = next;
        setGuests(next);
        if (
          invulnRef.current <= 0 &&
          next.some((g) => samePos(g, playerRef.current))
        ) {
          damage("espejos");
          invulnRef.current = 12;
          setInvuln(12);
          pushToast("Tu reflejo te alcanzó y firmó por ti.", "danger");
          const g2 = guestsRef.current.map((g) =>
            samePos(g, playerRef.current) ? farCorner(playerRef.current) : g,
          );
          guestsRef.current = g2;
          setGuests(g2);
        }
      }
    };

    const moveId = setInterval(onTick, TICK_MS);

    // reloj de turno + caldera + fin
    const clockId = setInterval(() => {
      timeRef.current -= 1;
      setTimeLeft(timeRef.current);

      if (f.hazard === "caldera") {
        const drain = [3, 4, 5];
        heatRef.current = heatRef.current.map((h, i) => h - drain[i]);
        setHeat([...heatRef.current]);
        const dead = heatRef.current.findIndex((h) => h <= 0);
        if (dead >= 0) {
          heatRef.current[dead] = 55;
          setHeat([...heatRef.current]);
          damage("caldera");
          pushToast("¡La caldera " + ["este", "central", "oeste"][dead] + " explotó!", "danger");
        }
      }

      if (f.quota > 0 && timeRef.current <= 0 && phaseRef.current === "playing") {
        setFiredReason(FIRED_REASONS.tiempo);
        setPhase("fired");
      }
      if (f.quota === 0 && timeRef.current <= 0 && phaseRef.current === "playing") {
        pushToast("Turno sobrevivido. El hotel suspira… por ahora.", "good");
        finishFloor();
      }
    }, 1000);

    // eventos aleatorios
    const scheduleEvent = () => {
      eventTimer.current = setTimeout(() => {
        if (phaseRef.current !== "playing") return;
        const roll = Math.random();
        if (roll < 0.34 && f.hazard === "agua") {
          const w = buildWater(playerRef.current, doors);
          setWater(w);
          waterRef.current = w;
          pushToast("EVENTO: la piscina se reorganiza. Otra vez.");
        } else if (roll < 0.62 && f.hazard === "espejos") {
          const g = [...guestsRef.current, farCorner(playerRef.current)].slice(0, 3);
          guestsRef.current = g;
          setGuests(g);
          pushToast("EVENTO: un reflejo extra entra al turno.");
        } else if (roll < 0.5 && f.hazard === "caldera") {
          heatRef.current = heatRef.current.map((h) => Math.max(5, h - 18));
          setHeat([...heatRef.current]);
          pushToast("EVENTO: caída de presión en las tres calderas.", "danger");
        } else if (roll < 0.8) {
          setBlackout(true);
          pushToast("EVENTO: apagón. Cuenta hasta tres…");
          setTimeout(() => setBlackout(false), 2200);
        } else {
          pushToast(FLAVOR_EVENTS[Math.floor(Math.random() * FLAVOR_EVENTS.length)]);
        }
        scheduleEvent();
      }, 12000 + Math.floor(Math.random() * 7000));
    };
    scheduleEvent();

    return () => {
      clearInterval(moveId);
      clearInterval(clockId);
      if (eventTimer.current) clearTimeout(eventTimer.current);
    };
  }, [phase, floorIndex, doors, damage, finishFloor, pushToast, tryStep]);

  /* ---------------- progreso de tarea (mantener pulsado) ---------------- */
  useEffect(() => {
    if (phase !== "playing") return;
    let progressRef = 0;
    let doorRef: number | null = null;
    const id = setInterval(() => {
      const door = frontDoorRef.current;
      if (!actionHeld.current || door == null) {
        if (doorRef !== null || progressRef !== 0) {
          doorRef = null;
          progressRef = 0;
          setWorkingDoor(null);
          setProgress(0);
        }
        return;
      }
      if (door !== doorRef) {
        doorRef = door;
        progressRef = 0;
        setWorkingDoor(door);
        setProgress(0);
        return;
      }
      progressRef += 9;
      setProgress(progressRef);
      if (progressRef >= 100) {
        const done = door;
        progressRef = 0;
        doorRef = null;
        setTimeout(() => completeTaskRef.current(done), 0);
      }
    }, 100);
    return () => clearInterval(id);
  }, [phase]);

  /* ---------------- teclado ---------------- */
  useEffect(() => {
    if (phase !== "playing") return;
    const keyDir = (k: string): Dir | null => {
      switch (k) {
        case "ArrowUp":
        case "w":
        case "W":
          return "up";
        case "ArrowDown":
        case "s":
        case "S":
          return "down";
        case "ArrowLeft":
        case "a":
        case "A":
          return "left";
        case "ArrowRight":
        case "d":
        case "D":
          return "right";
        default:
          return null;
      }
    };
    const down = (e: KeyboardEvent) => {
      const dir = keyDir(e.key);
      if (dir) {
        e.preventDefault();
        intent.current = dir;
        tryStep(dir);
        return;
      }
      if (e.key === "e" || e.key === "E" || e.key === " ") {
        e.preventDefault();
        actionHeld.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = keyDir(e.key);
      if (dir && intent.current === dir) intent.current = null;
      if (e.key === "e" || e.key === "E" || e.key === " ") actionHeld.current = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [phase, tryStep]);

  /* ---------------- helpers de render ---------------- */
  const cellPct = { w: 100 / COLS, h: 100 / ROWS };
  const tileStyle = (p: Pos) => ({
    left: `${p.x * cellPct.w}%`,
    top: `${p.y * cellPct.h}%`,
    width: `${cellPct.w}%`,
    height: `${cellPct.h}%`,
  });

  const press = (dir: Dir) => (e: ReactPointerEvent) => {
    e.preventDefault();
    intent.current = dir;
    tryStep(dir);
  };
  const release = () => {
    intent.current = null;
  };
  const holdWork = (e: ReactPointerEvent) => {
    e.preventDefault();
    actionHeld.current = true;
    if (frontDoorIdx != null) {
      setWorkingDoor(frontDoorIdx);
      setProgress(12);
    }
  };
  const dropWork = () => {
    actionHeld.current = false;
  };

  const rank = rankForTips(totalTips);
  const mmss = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`;

  /* ============================ INTRO ============================ */
  if (phase === "intro") {
    return (
      <section className="relative min-h-screen pt-24 pb-16">
        <div className="mx-auto max-w-3xl px-4 md:px-8">
          <div className="hud-corners panel-in border border-line bg-panel/80 p-6 md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-amber">
              Demo jugable · turno de noche
            </p>
            <h1 className="font-display mt-4 text-3xl leading-tight text-paper md:text-5xl">
              HOTEL <span className="text-amber">∞</span> INFINITO
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-fog md:text-base">
              Firma tu contrato de mantenimiento nocturno: tres pisos, tres reglas, ninguna
              explicación. Completa tus tareas, cobra propinas y <span className="text-paper">no
              te despidan</span>. Aquí nadie muere: si fallas, te «despedimos» y reapareces en
              recepción con una penalización cómica.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-fog">
              <li className="flex gap-2">
                <span className="text-cyan">▸</span> Muévete con <span className="text-paper">WASD / flechas</span> o con la cruceta en móvil.
              </li>
              <li className="flex gap-2">
                <span className="text-cyan">▸</span> Colócate frente a una puerta y mantén pulsado <span className="text-paper">TRABAJAR (E)</span>.
              </li>
              <li className="flex gap-2">
                <span className="text-cyan">▸</span> Respeta la regla de cada piso. El hotel la vigila. Siempre.
              </li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre del empleado (opcional)"
                maxLength={18}
                aria-label="Nombre del empleado"
                className="w-full border border-line bg-deep px-4 py-3 text-sm text-paper placeholder:text-fog/50 focus:border-amber focus:outline-none sm:max-w-xs"
              />
              <button
                onClick={() => {
                  setFloorIndex(0);
                  setTotalTips(0);
                  tipsRef.current.total = 0;
                  setPhase("floor-intro");
                }}
                className="font-display inline-flex cursor-pointer items-center justify-center gap-3 border-2 border-amber bg-amber px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_32px_rgba(255,160,47,0.35)] active:translate-y-0"
              >
                FIRMAR CONTRATO ▶
              </button>
            </div>
            <p className="mt-6 text-xs text-fog/70">
              Demo web del loop central (~5 min). El juego completo vive en Roblox Studio —{" "}
              <button onClick={onOpenGdd} className="cursor-pointer text-cyan underline underline-offset-4 hover:text-paper">
                lee el GDD
              </button>{" "}
              o{" "}
              <button onClick={onOpenLab} className="cursor-pointer text-cyan underline underline-offset-4 hover:text-paper">
                vuelve al laboratorio
              </button>
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  /* ============================ FLOOR INTRO ============================ */
  if (phase === "floor-intro") {
    return (
      <section className="relative flex min-h-screen items-center pt-20 pb-16">
        <div className="mx-auto w-full max-w-3xl px-4 md:px-8">
          <div className="panel-in border border-line bg-panel/80 p-6 md:p-10" style={{ borderColor: floor.accent + "55" }}>
            <div className="flex items-center justify-between border-b border-line pb-4">
              <span className="font-display text-sm" style={{ color: floor.accent }}>
                {floor.code}
              </span>
              <span className="text-[11px] uppercase tracking-[0.25em] text-fog">{floor.subtitle}</span>
            </div>
            <h2 className="font-display mt-6 text-2xl text-paper md:text-4xl">{floor.name}</h2>
            <p className="mt-4 text-sm leading-relaxed text-fog md:text-base">{floor.intro}</p>
            <div className="mt-6 border-l-2 pl-4" style={{ borderColor: floor.accent }}>
              <p className="font-display text-xs tracking-wider" style={{ color: floor.accent }}>
                {floor.ruleTitle}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-fog">{floor.ruleDesc}</p>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-fog">
              <span className="border border-line px-3 py-1.5">🎯 {floor.objective}</span>
              <span className="border border-line px-3 py-1.5">⏱ Turno: {floor.time}s</span>
              <span className="border border-line px-3 py-1.5">❤ × {floor.hearts}</span>
            </div>
            <button
              onClick={() => startFloor(floorIndex)}
              className="font-display mt-8 inline-flex cursor-pointer items-center gap-3 border-2 px-7 py-3.5 text-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{ borderColor: floor.accent, background: floor.accent, color: "#070d18" }}
            >
              EMPEZAR TURNO <IconArrow className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ============================ CLEARED ============================ */
  if (phase === "cleared") {
    const last = floorIndex >= FLOORS.length - 1;
    return (
      <section className="relative flex min-h-screen items-center pt-20 pb-16">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-8">
          <div className="panel-in hud-corners border border-line bg-panel/80 p-6 text-center md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-lime">Turno completado</p>
            <h2 className="font-display mt-4 text-2xl text-paper md:text-4xl">
              {floor.code} · SUPERADO
            </h2>
            <div className="mx-auto mt-6 max-w-sm border border-dashed border-line p-5 text-left text-sm text-fog">
              <p className="flex justify-between">
                <span>Propinas del piso</span>
                <span className="font-display text-amber">{floorTips} R$</span>
              </p>
              <p className="mt-2 flex justify-between">
                <span>Tareas</span>
                <span className="text-paper">{completed}</span>
              </p>
              <p className="mt-2 flex justify-between">
                <span>Corazones restantes</span>
                <span className="text-paper">{"❤".repeat(hearts) || "—"}</span>
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {!last ? (
                <button
                  onClick={() => {
                    setFloorIndex((i) => Math.min(i + 1, FLOORS.length - 1));
                    setPhase("floor-intro");
                  }}
                  className="font-display inline-flex cursor-pointer items-center gap-3 border-2 border-lime bg-lime px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  SUBIR AL SIGUIENTE PISO ▲
                </button>
              ) : (
                <button
                  onClick={() => setPhase("ending")}
                  className="font-display inline-flex cursor-pointer items-center gap-3 border-2 border-amber bg-amber px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                >
                  VER MI CONTRATO ★
                </button>
              )}
              <button
                onClick={onOpenLab}
                className="font-display cursor-pointer border-2 border-line px-6 py-3 text-xs text-fog transition-colors hover:border-cyan hover:text-cyan"
              >
                SALIR AL PASILLO
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ============================ FIRED ============================ */
  if (phase === "fired") {
    return (
      <section className="relative flex min-h-screen items-center pt-20 pb-16">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-8">
          <div className="panel-in border border-line bg-panel/80 p-6 text-center md:p-10">
            <p className="font-display text-[11px] tracking-[0.35em] text-[#ff6a3d]">DESPEDIDO</p>
            <h2 className="font-display mt-4 text-2xl text-paper md:text-4xl">
              REAPARECES EN RECEPCIÓN
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-fog">{firedReason}</p>
            <p className="mt-3 text-xs text-fog/70">
              Nadie muere en el Hotel ∞. Solo firmas otra vez.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => startFloor(floorIndex)}
                className="font-display inline-flex cursor-pointer items-center gap-3 border-2 border-amber bg-amber px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                FIRMAR OTRA VEZ ↺
              </button>
              <button
                onClick={onOpenLab}
                className="font-display cursor-pointer border-2 border-line px-6 py-3 text-xs text-fog transition-colors hover:border-cyan hover:text-cyan"
              >
                ABANDONAR TURNO
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ============================ ENDING ============================ */
  if (phase === "ending") {
    return (
      <section className="relative flex min-h-screen items-center pt-20 pb-16">
        <div className="mx-auto w-full max-w-2xl px-4 md:px-8">
          <div className="panel-in hud-corners border border-line bg-panel/80 p-6 text-center md:p-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-lime">
              Contrato permanente
            </p>
            <h2 className="font-display mt-4 text-3xl text-paper md:text-5xl">{rank.title}</h2>
            <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-fog">{rank.note}</p>
            <div className="mx-auto mt-6 max-w-xs border border-dashed border-line p-5">
              <p className="flex justify-between text-sm">
                <span className="text-fog">Propinas totales</span>
                <span className="font-display text-amber">{totalTips} R$</span>
              </p>
              <p className="mt-2 flex justify-between text-sm">
                <span className="text-fog">Empleado</span>
                <span className="text-paper">{name.trim() || "Anónimo"}</span>
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => {
                  setFloorIndex(0);
                  setTotalTips(0);
                  tipsRef.current.total = 0;
                  setPhase("floor-intro");
                }}
                className="font-display inline-flex cursor-pointer items-center gap-3 border-2 border-amber bg-amber px-7 py-3.5 text-sm text-deep transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                OTRO TURNO ↺
              </button>
              <button
                onClick={onOpenGdd}
                className="font-display cursor-pointer border-2 border-line px-6 py-3 text-xs text-fog transition-colors hover:border-cyan hover:text-cyan"
              >
                LEER EL GDD COMPLETO
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  /* ============================ PLAYING ============================ */
  const walls: Pos[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) if (isWall(x, y)) walls.push({ x, y });

  return (
    <section className="relative min-h-screen pt-20 pb-10">
      <div className="mx-auto max-w-3xl px-4 md:px-8">
        {/* HUD */}
        <div className="flex flex-wrap items-center justify-between gap-3 border border-line bg-panel/80 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-sm" style={{ color: floor.accent }}>
              {floor.code}
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em] text-fog">{floor.name}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-fog">
            <span aria-label="Tiempo restante">⏱ {mmss(timeLeft)}</span>
            <span className="text-amber" aria-label="Propinas">◉ {floorTips} R$</span>
            <span aria-label={floor.quota > 0 ? "Tareas completadas" : "Turno de supervivencia"}>
              {floor.quota > 0 ? `☑ ${completed}/${floor.quota}` : "soportar"}
            </span>
            <span aria-label="Corazones">{"❤".repeat(hearts) || "✗"}</span>
          </div>
        </div>
        {/* regla visible siempre */}
        <div
          className="border border-t-0 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: floor.accent, background: floor.accentSoft, borderColor: floor.accent + "44" }}
        >
          {floor.ruleTitle}
        </div>

        {/* calderas (piso 3) */}
        {floor.hazard === "caldera" && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {heat.map((h, i) => (
              <div key={i} className="border border-line bg-panel/60 p-2">
                <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-fog">
                  Caldera {["este", "central", "oeste"][i]}
                </p>
                <div className="h-2.5 w-full bg-deep" role="meter" aria-valuenow={Math.max(0, h)} aria-valuemin={0} aria-valuemax={100} aria-label={`Calor caldera ${i}`}>
                  <div
                    className="grow-bar h-full transition-all duration-500"
                    style={{
                      width: `${Math.max(0, Math.min(100, h))}%`,
                      background: h < 30 ? "#ff6a3d" : h < 55 ? "#ffa02f" : "#a8e63c",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TABLERO */}
        <div
          className={`relative mt-3 select-none overflow-hidden border border-line bg-deep ${hurtFlash ? "demo-shake" : ""}`}
          style={{ aspectRatio: `${COLS}/${ROWS}` }}
          role="application"
          aria-label={`Tablero del piso ${floor.code}. Muévete con la cruceta y trabaja frente a las puertas.`}
        >
          {/* paredes */}
          {walls.map((w) => (
            <div key={`w${w.x}-${w.y}`} className="absolute bg-panel2" style={tileStyle(w)} />
          ))}
          {/* puertas */}
          {doors.map((d, i) => (
            <div
              key={`d${i}`}
              className="absolute flex items-center justify-center"
              style={{ ...tileStyle(d), background: d.task ? floor.accent + "33" : "transparent" }}
            >
              <span
                className="font-display text-[9px] leading-none md:text-[11px]"
                style={{ color: d.task ? floor.accent : "#33496f" }}
              >
                {d.task ? d.task.room : "···"}
              </span>
            </div>
          ))}
          {/* agua */}
          {water.map((w, i) => (
            <div
              key={`wt${i}`}
              className="demo-water absolute"
              style={{ ...tileStyle(w), background: "rgba(56,225,212,0.22)" }}
            />
          ))}
          {/* decorado pasillo central piso caldera */}
          {floor.hazard === "caldera" && (
            <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: "#223350" }} aria-hidden="true" />
          )}
          {/* reflejos */}
          {guests.map((g, i) => (
            <div
              key={`g${i}`}
              className="absolute flex items-center justify-center transition-all duration-200"
              style={tileStyle(g)}
              aria-hidden="true"
            >
              <span
                className="block h-3/5 w-3/5 opacity-80"
                style={{
                  background: "rgba(233,241,252,0.25)",
                  border: "1px solid rgba(233,241,252,0.5)",
                }}
              />
            </div>
          ))}
          {/* jugador */}
          <div
            className="absolute flex items-center justify-center transition-all duration-150"
            style={{ ...tileStyle(player), zIndex: 5 }}
          >
            <span
              className={`block h-3/5 w-3/5 ${invuln > 0 ? "demo-blink" : ""}`}
              style={{
                background: floor.accent,
                boxShadow: `0 0 14px ${floor.accent}66`,
              }}
              aria-label="Tu empleado"
              role="img"
            />
          </div>
          {/* apagón */}
          {blackout && <div className="demo-blackout absolute inset-0" style={{ zIndex: 8 }} aria-hidden="true" />}
          {/* progreso de tarea sobre la puerta activa */}
          {workingDoor != null && progress > 0 && (
            <div
              className="absolute"
              style={{ ...tileStyle(doors[workingDoor]), zIndex: 9 }}
              aria-hidden="true"
            >
              <div className="absolute inset-x-1 bottom-1 h-1.5 bg-deep">
                <div className="h-full" style={{ width: `${progress}%`, background: floor.accent }} />
              </div>
            </div>
          )}
        </div>

        {/* pista de objetivo */}
        <p className="mt-2 text-center text-[11px] text-fog">
          {floor.quota > 0
            ? `${floor.objective} · quédate frente a una puerta con número y mantén TRABAJAR`
            : "Alimenta las calderas: colócate frente a una puerta-número y mantén TRABAJAR"}
        </p>

        {/* CONTROLES */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="grid grid-cols-3 gap-1.5" aria-label="Cruceta de movimiento">
            <span />
            <button aria-label="Arriba" onPointerDown={press("up")} onPointerUp={release} onPointerLeave={release} onContextMenu={(e) => e.preventDefault()} className="demo-pad">▲</button>
            <span />
            <button aria-label="Izquierda" onPointerDown={press("left")} onPointerUp={release} onPointerLeave={release} onContextMenu={(e) => e.preventDefault()} className="demo-pad">◀</button>
            <span />
            <button aria-label="Derecha" onPointerDown={press("right")} onPointerUp={release} onPointerLeave={release} onContextMenu={(e) => e.preventDefault()} className="demo-pad">▶</button>
            <span />
            <button aria-label="Abajo" onPointerDown={press("down")} onPointerUp={release} onPointerLeave={release} onContextMenu={(e) => e.preventDefault()} className="demo-pad">▼</button>
            <span />
          </div>
          <button
            aria-label="Trabajar: mantén pulsado frente a una puerta"
            onPointerDown={holdWork}
            onPointerUp={dropWork}
            onPointerLeave={dropWork}
            onContextMenu={(e) => e.preventDefault()}
            className={`font-display min-h-[64px] min-w-[44%] cursor-pointer border-2 text-sm transition-all active:translate-y-0.5 ${
              frontDoorIdx != null ? "" : "opacity-50"
            }`}
            style={{ borderColor: floor.accent, color: frontDoorIdx != null ? "#070d18" : floor.accent, background: frontDoorIdx != null ? floor.accent : "transparent" }}
          >
            TRABAJAR
          </button>
        </div>
        <p className="mt-2 text-center text-[11px] text-fog/60">
          Teclado: WASD / flechas + E · {inverted && "ojo: controles invertidos en este piso"}
        </p>
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="panel-in max-w-md border bg-deep/95 px-4 py-2.5 text-center text-xs md:text-sm"
            style={{
              borderColor:
                t.kind === "danger" ? "#ff6a3d" : t.kind === "good" ? "#a8e63c" : "#223350",
              color: t.kind === "danger" ? "#ffb59e" : t.kind === "good" ? "#c9e88a" : "#8fa4c2",
            }}
          >
            {t.text}
          </div>
        ))}
      </div>
    </section>
  );
}
