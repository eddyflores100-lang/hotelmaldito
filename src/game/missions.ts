/* ============================================================
   HOTEL ∞ INFINITO — Misiones dinámicas con recompensas.
   ============================================================ */

export type MissionEvent =
  | { kind: "kill"; enemy: string; elite?: boolean }
  | { kind: "coin"; amount: number }
  | { kind: "build"; what: string }
  | { kind: "room" }
  | { kind: "key" }
  | { kind: "break" }
  | { kind: "vault" }
  | { kind: "boss" }
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
  (f) => mk("Explora 3 habitaciones", 3, 45 + f * 5, (e) => (e.kind === "room" ? 1 : 0)),
  (f) => mk(`Recoge ${25 + f * 5} monedas en loot`, 25 + f * 5, 45, (e) => (e.kind === "coin" ? e.amount : 0)),
  () => mk("Construye una defensa", 1, 30, (e) => (e.kind === "build" ? 1 : 0)),
  () => mk("Construye 4 defensas", 4, 65, (e) => (e.kind === "build" ? 1 : 0)),
  (f) => mk(`Derrota ${5 + f} anomalías`, 5 + f, 50 + f * 5, (e) => (e.kind === "kill" ? 1 : 0)),
  () => mk("Encuentra una llave-tarjeta", 1, 45, (e) => (e.kind === "key" ? 1 : 0)),
  () => mk("Consigue un cofre del tesoro", 1, 60, (e) => (e.kind === "coin" && e.amount >= 40 ? 1 : 0)),
  () => mk("Construye 2 torretas", 2, 65, (e) => (e.kind === "build" && e.what === "turret" ? 1 : 0)),
  () => mk("Rompe 4 muebles con la escoba", 4, 40, (e) => (e.kind === "break" ? 1 : 0)),
  () => mk("Coloca una trampa de pinchos", 1, 45, (e) => (e.kind === "build" && e.what === "trap" ? 1 : 0)),
  () => mk("ABRE LA BÓVEDA", 1, 90, (e) => (e.kind === "vault" ? 1 : 0)),
  (f) => mk(`Extermina 3 cucarachas`, 3, 40 + f * 4, (e) => (e.kind === "kill" && e.enemy === "cucaracha" ? 1 : 0)),
  () => mk("Derrota a un ÉLITE dorado", 1, 70, (e) => (e.kind === "kill" && e.elite ? 1 : 0)),
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
    this.missions = pool.slice(0, 3).map((t) => t(floor));
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
