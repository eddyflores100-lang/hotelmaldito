/* ============================================================
   HOTEL ∞ INFINITO — Huéspedes: generación, anomalías,
   IA de movimiento (llegar → cola → marcharse) y ficha.
   ============================================================ */
import * as THREE from "three";
import { Avatar, type AvatarConfig, type HatType } from "./avatar";
import { STUD, irnd, pick, rnd } from "./util";

export type AnomalyKind =
  | "red-eyes"    // ojos rojos brillantes
  | "tall"        // piernas larguísimas
  | "floating"    // flota sobre el suelo
  | "gray"        // piel gris, sin color
  | "empty"       // cara vacía
  | "no-shadow";  // proyecta sombra… o no

export type GuestCardData = {
  name: string;
  hour: string;
  room: string;
  reason: string;
  cardColor: string;      // color que declara el carnet
  anomaly: AnomalyKind | null;
  nights: number;
};

const NAMES = [
  "Sr. Almeida", "Sra. Vassily", "Tío Grillo", "Ms. Holloway", "Don Rueda",
  "Fam. Cravo", "Sr. Nueve", "Anselmo B.", "Sra. Páramo", "Nino Crudo",
  "Vda. de Sótano", "Cap. Astillero", "La Prima Lejana", "Sr. y Sra. Once",
];
const REASONS = [
  "Reserva de 1 noche. Paga en efectivo antiguo.",
  "Vino por el bufet de las 3:33 AM.",
  "Dice que ya se quedó aquí. En 1987.",
  "Pide una habitación que no dé al pasillo.",
  "Trae su propio espejo. Cubierto.",
  "Quiere la última planta. La que no existe.",
  "Reservó por teléfono. En 1962.",
  "Dice conocer al gerente. El anterior.",
  "Solo necesita la nevera, no la cama.",
  "Llega cada mes. Nunca se le ha visto salir.",
];
const ROOMS = ["P-07", "P-13", "P-21", "P-33", "P-40", "P-42", "P-88"];
const BAD_ROOMS = ["P-∞", "P-13½", "P-???", "P-00", "P--2"];
const HOURS = ["22:30", "23:15", "00:40", "01:20", "02:05", "03:33"];

const SKINS = ["#f5cd30", "#eab98a", "#c98850", "#8a5a34", "#f0d9b8"];
const CLOTHES = [
  "#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f97316", "#14b8a6",
  "#eab308", "#ec4899", "#6366f1", "#84cc16", "#06b6d4", "#f43f5e",
];
const HATS: HatType[] = ["none", "none", "cap", "top", "party", "crown", "none", "cap"];

export function makeGuestConfig(anomaly: AnomalyKind | null): AvatarConfig {
  const skin = pick(SKINS);
  const torso = pick(CLOTHES);
  const legs = pick(CLOTHES);
  const cfg: AvatarConfig = {
    skin,
    torso,
    arms: skin,
    legs,
    face: pick(["happy", "happy", "worried", "angry"] as const),
    hat: pick(HATS),
    hatColor: pick(["#20242c", "#7a1f1f", "#1f3a7a", "#3a3a3a", "#5a2a7a"]),
  };
  if (anomaly) {
    switch (anomaly) {
      case "red-eyes":
        cfg.face = "red";
        cfg.glow = true;
        break;
      case "tall":
        cfg.tall = rnd(1.8, 2.3);
        break;
      case "gray":
        cfg.skin = "#9aa0a6";
        cfg.torso = "#565b60";
        cfg.legs = "#43474b";
        cfg.arms = "#84898e";
        cfg.face = "worried";
        break;
      case "empty":
        cfg.face = "empty";
        break;
      case "no-shadow":
        cfg.noShadow = true;
        break;
      default:
        break;
    }
  }
  return cfg;
}

export function makeCardData(anomaly: AnomalyKind | null, honestColor: string): GuestCardData {
  const cardColor =
    anomaly && Math.random() < 0.55 ? pick(CLOTHES.filter((c) => c !== honestColor)) : honestColor;
  const room =
    anomaly && (anomaly === "red-eyes" || anomaly === "empty") && Math.random() < 0.6
      ? pick(BAD_ROOMS)
      : pick(ROOMS);
  return {
    name: anomaly && Math.random() < 0.3 ? "G̷U̷E̷S̷T̷" : pick(NAMES),
    hour: anomaly && Math.random() < 0.35 ? "04:44" : pick(HOURS),
    room,
    reason: pick(REASONS),
    cardColor,
    anomaly,
    nights: irnd(1, 7),
  };
}

export function createGuest(
  anomaly: AnomalyKind | null,
  spawn: THREE.Vector3,
  target: THREE.Vector3
): Guest {
  const cfg = makeGuestConfig(anomaly);
  const card = makeCardData(anomaly, cfg.torso);
  return new Guest(cfg, card, spawn, target);
}

export type GuestState = "arriving" | "waiting" | "leaving" | "glitching";

export class Guest {
  readonly avatar: Avatar;
  readonly card: GuestCardData;
  readonly isAnomaly: boolean;
  readonly anomaly: AnomalyKind | null;
  state: GuestState = "arriving";
  private path: THREE.Vector3[] = [];
  private pathIdx = 0;
  private speed = rnd(1.5, 2.1);
  private glitchT = 0;
  private pendingGlitch = false;
  private fade = 1;
  readonly group = new THREE.Group();
  done = false; // terminó (se fue del mundo)
  onArrived?: () => void;
  patience = 0; // seg esperando

  constructor(cfg: AvatarConfig, card: GuestCardData, spawn: THREE.Vector3, target: THREE.Vector3) {
    this.anomaly = card.anomaly;
    this.isAnomaly = card.anomaly !== null;
    this.card = card;
    this.avatar = new Avatar(cfg);
    this.group.add(this.avatar.group);
    this.group.position.copy(spawn);
    this.group.position.y = this.anomaly === "floating" ? 0.45 : 0;
    if (this.anomaly === "floating") this.speed *= 0.8;
    if (this.anomaly === "tall") this.speed *= 0.9;
    this.path = [target.clone()];
    // mirar hacia el objetivo
    this.faceTowards(target);
  }

  private faceTowards(p: THREE.Vector3): void {
    const dx = p.x - this.group.position.x;
    const dz = p.z - this.group.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  setPath(points: THREE.Vector3[], state: GuestState): void {
    this.path = points.map((p) => p.clone());
    this.pathIdx = 0;
    this.state = state;
  }

  glitchOut(): void {
    if (this.done) return;
    this.state = "glitching";
    this.glitchT = 0;
  }

  /** camina hasta un punto y luego se desvanece con glitch (anomalía aceptada) */
  glitchAfterWalk(point: THREE.Vector3, delayMs: number): void {
    this.path = [point.clone()];
    this.pathIdx = 0;
    this.state = "leaving";
    this.pendingGlitch = true;
    window.setTimeout(() => this.glitchOut(), delayMs);
  }

  update(dt: number, timeScale: number): void {
    const g = this.group;

    if (this.state === "glitching") {
      this.glitchT += dt;
      this.avatar.glitch(dt);
      const s = Math.max(0, 1 - this.glitchT / 0.9);
      g.scale.setScalar(s * (1 + Math.sin(this.glitchT * 40) * 0.06));
      if (this.glitchT >= 0.9) {
        this.done = true;
      }
      return;
    }

    // flotar (anomalía)
    if (this.anomaly === "floating" && this.state !== "leaving") {
      g.position.y = 0.42 + Math.sin(performance.now() * 0.0018) * 0.12;
    }

    if (this.state === "arriving" || this.state === "leaving") {
      if (this.pathIdx < this.path.length) {
        const target = this.path[this.pathIdx];
        const dx = target.x - g.position.x;
        const dz = target.z - g.position.z;
        const dist = Math.hypot(dx, dz);
        const step = this.speed * dt * timeScale;
        if (dist <= step) {
          g.position.x = target.x;
          g.position.z = target.z;
          this.pathIdx++;
          if (this.state === "arriving" && this.pathIdx >= this.path.length) {
            this.state = "waiting";
            // mirar hacia la recepción (−z, hacia el mostrador)
            this.faceTowards(new THREE.Vector3(g.position.x, 0, g.position.z - 2));
            this.onArrived?.();
          }
          if (this.state === "leaving" && this.pathIdx >= this.path.length) {
            if (this.pendingGlitch) {
              this.pendingGlitch = false;
              this.glitchOut();
            } else {
              this.done = true;
            }
          }
        } else {
          g.position.x += (dx / dist) * step;
          g.position.z += (dz / dist) * step;
          this.faceTowards(target);
        }
        this.avatar.update(dt, true, 0.8, false);
      }
    } else {
      // waiting: idle + mirar alrededor de vez en cuando
      this.patience += dt * timeScale;
      this.avatar.update(dt, false, 0, false);
      g.rotation.y += Math.sin(performance.now() * 0.0007 + this.patience) * dt * 0.4;
    }
  }

  get headPos(): THREE.Vector3 {
    return new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + this.avatar.height + 0.25,
      this.group.position.z
    );
  }

  distanceTo(p: THREE.Vector3): number {
    return Math.hypot(p.x - this.group.position.x, p.z - this.group.position.z);
  }

  dispose(): void {
    this.avatar.dispose();
  }
}

export { STUD };
