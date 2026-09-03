/* ============================================================
   HOTEL ∞ INFINITO — Misiones dinámicas con recompensas.
   ============================================================ */

export type MissionEvent =
  | { kind: "kill"; enemy: string }
  | { kind: "coin"; amount: number }
  | { kind: "build"; what: string }
  | { kind: "room" }
  | { kind: "key" }
  | { kind: "night"; floor: number };

export type Mission = {
  id: number;
  desc: string;
  target: number;
  progress: number;
  reward: number;
  done: boolean;
  test: (e: MissionEvent) => number; // cuánto progresa este evento
};

let nextId = 1;

function mk(desc: string, target: number, reward: number, test: (e: MissionEvent) => number): Mission {
  return { id: nextId++, desc, target, reward, progress: 0, done: false, test };
}

const TEMPLATES: Array<(floor: number) => Mission> = [
  (f) => mk("Explora 2 habitaciones", 2, 35 + f * 5, (e) => (e.kind === "room" ? 1 : 0)),
  (f) => mk(`Recoge ${20 + f * 5} monedas en loot`, 20 + f * 5, 40, (e) => (e.kind === "coin" ? e.amount : 0)),
  () => mk("Construye una defensa", 1, 30, (e) => (e.kind === "build" ? 1 : 0)),
  () => mk("Construye 3 defensas", 3, 55, (e) => (e.kind === "build" ? 1 : 0)),
  (f) => mk(`Derrota ${4 + f} anomalías`, 4 + f, 45 + f * 5, (e) => (e.kind === "kill" ? 1 : 0)),
  () => mk("Encuentra la llave-tarjeta", 1, 50, (e) => (e.kind === "key" ? 1 : 0)),
  () => mk("Consigue un cofre del tesoro", 1, 60, (e) => (e.kind === "coin" && e.amount >= 40 ? 1 : 0)),
  () => mk("Construye 2 torretas", 2, 65, (e) => (e.kind === "build" && e.what === "turret" ? 1 : 0)),
];

export class MissionBoard {
  missions: Mission[] = [];
  private onReward?: (m: Mission) => void;
  private onNew?: (m: Mission) => void;

  constructor(onReward?: (m: Mission) => void, onNew?: (m: Mission) => void) {
    this.onReward = onReward;
    this.onNew = onNew;
  }

  seedForFloor(floor: number): void {
    this.missions = [];
    const pool = [...TEMPLATES].sort(() => Math.random() - 0.5);
    this.missions = pool.slice(0, 2).map((t) => t(floor));
    for (const m of this.missions) this.onNew?.(m);
  }

  emit(e: MissionEvent): void {
    for (const m of this.missions) {
      if (m.done) continue;
      m.progress = Math.min(m.target, m.progress + m.test(e));
      if (m.progress >= m.target) {
        m.done = true;
        this.onReward?.(m);
      }
    }
  }

  get allDone(): boolean {
    return this.missions.every((m) => m.done);
  }
}
