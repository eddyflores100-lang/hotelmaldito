/* ============================================================
   HOTEL ∞ INFINITO — Enemigos: las anomalías se vuelven hostiles.
   9 tipos · élites dorados · IA por alas · ataques melee/rango ·
   teletransporte · knockback · barra de vida.
   ============================================================ */
import * as THREE from "three";
import { Avatar, type AvatarConfig } from "./avatar";
import { type AABB, type Zone, pointInZone } from "./world";
import { clamp, rnd } from "./util";

export type EnemyType =
  | "sombra" | "maleta" | "altisimo" | "fantasma" | "gerente"
  | "cucaracha" | "camarista" | "golem" | "nino";

export type ObstacleRef = {
  pos: THREE.Vector3;
  aabb: AABB;
  kind: "door" | "barricade";
  hp: number;
  alive: boolean;
};

export type EnemyWorld = {
  playerPos: THREE.Vector3;
  playerAlive: boolean;
  colliders: AABB[];
  zones: Zone[];
  obstacles: ObstacleRef[];
  damagePlayer: (dmg: number, from: THREE.Vector3) => void;
  damageObstacle: (o: ObstacleRef, dmg: number) => void;
  spawnEnemyProjectile: (from: THREE.Vector3, dir: THREE.Vector3, dmg: number) => void;
  fx: (pos: THREE.Vector3, color: string, n: number, speed: number) => void;
};

type Stats = { hp: number; speed: number; dmg: number; radius: number; scale: number; reach: number };

const BASE: Record<EnemyType, Stats> = {
  sombra:    { hp: 40,  speed: 2.7, dmg: 8,  radius: 0.45, scale: 1.0,  reach: 1.05 },
  maleta:    { hp: 22,  speed: 4.7, dmg: 6,  radius: 0.36, scale: 0.72, reach: 0.9 },
  altisimo:  { hp: 80,  speed: 2.2, dmg: 14, radius: 0.5,  scale: 1.0,  reach: 1.35 },
  fantasma:  { hp: 46,  speed: 3.1, dmg: 10, radius: 0.45, scale: 1.0,  reach: 1.05 },
  gerente:   { hp: 340, speed: 1.9, dmg: 22, radius: 0.75, scale: 1.55, reach: 1.6 },
  cucaracha: { hp: 14,  speed: 5.3, dmg: 5,  radius: 0.3,  scale: 0.52, reach: 0.75 },
  camarista: { hp: 55,  speed: 2.9, dmg: 9,  radius: 0.42, scale: 1.0,  reach: 0 },
  golem:     { hp: 230, speed: 1.55, dmg: 20, radius: 0.62, scale: 1.35, reach: 1.5 },
  nino:      { hp: 34,  speed: 3.5, dmg: 7,  radius: 0.35, scale: 0.62, reach: 0.85 },
};

const ELITE_K = { hp: 1.9, speed: 1.08, dmg: 1.35, scale: 1.18 };

export function configFor(type: EnemyType): AvatarConfig {
  switch (type) {
    case "sombra":
      return { skin: "#9aa0a6", torso: "#3c4248", arms: "#565b60", legs: "#2e3237", face: "empty", hat: "none" };
    case "maleta":
      return { skin: "#c98850", torso: "#7a1f1f", arms: "#c98850", legs: "#3a1a1a", face: "red", hat: "cap", hatColor: "#2a0808", glow: true };
    case "altisimo":
      return { skin: "#cfd6dd", torso: "#1f2430", arms: "#aeb6bd", legs: "#14181f", face: "worried", hat: "top", hatColor: "#0d1017" };
    case "fantasma":
      return { skin: "#bcd8e8", torso: "#7ea8c0", arms: "#a8c8d8", legs: "#5f88a0", face: "empty", hat: "none", float: true, noShadow: true };
    case "gerente":
      return { skin: "#e8c9a0", torso: "#1a1030", arms: "#e8c9a0", legs: "#0d0a18", face: "red", hat: "crown", hatColor: "#e9b23c", glow: true, tall: 1.25 };
    case "cucaracha":
      return { skin: "#4a2c18", torso: "#33200f", arms: "#4a2c18", legs: "#241507", face: "red", hat: "none", glow: true };
    case "camarista":
      return { skin: "#d8c8b8", torso: "#2e7d6e", arms: "#d8c8b8", legs: "#1d5548", face: "empty", hat: "cap", hatColor: "#e8e4da" };
    case "golem":
      return { skin: "#8a6a3f", torso: "#5a4326", arms: "#6e5230", legs: "#3a2c16", face: "empty", hat: "none", glow: true, tall: 1.15 };
    case "nino":
      return { skin: "#cdd4da", torso: "#4a5a78", arms: "#cdd4da", legs: "#2a3448", face: "worried", hat: "none" };
  }
}

export class Enemy {
  readonly group = new THREE.Group();
  private avatar: Avatar;
  readonly type: EnemyType;
  readonly elite: boolean;
  readonly stats: Stats;
  hp: number;
  maxHp: number;
  alive = true;
  dying = false;
  slowK = 1; // 1 normal · <1 ralentizado por el velador

  private vel = new THREE.Vector3();
  state: "emerge" | "chase" | "windup" | "stun" | "die" = "emerge";
  private t = 0;
  private attackCd = 0;
  private wobble = rnd(0, 6.28);
  private waypoints: THREE.Vector3[] = [];
  private hpSprite: THREE.Sprite;
  private hpCanvas: HTMLCanvasElement;
  private hpTex: THREE.CanvasTexture;
  private mats: THREE.MeshStandardMaterial[] = [];
  private flashT = 0;
  private lastPush = new THREE.Vector3();
  private floatT = rnd(0, 6.28);
  private throwT = rnd(1.2, 2.4);   // camarista
  private tpT = rnd(2.5, 4.5);      // niño

  constructor(type: EnemyType, difficulty: number, spawn: THREE.Vector3, elite = false) {
    this.type = type;
    this.elite = elite;
    const base = BASE[type];
    const k = 1 + difficulty * 0.16;
    const ek = elite ? ELITE_K : { hp: 1, speed: 1, dmg: 1, scale: 1 };
    this.stats = {
      hp: Math.round(base.hp * k * ek.hp),
      speed: base.speed * (1 + difficulty * 0.02) * ek.speed,
      dmg: Math.round(base.dmg * (1 + difficulty * 0.1) * ek.dmg),
      radius: base.radius * (elite ? 1.15 : 1),
      scale: base.scale * ek.scale,
      reach: base.reach,
    };
    this.maxHp = this.stats.hp;
    this.hp = this.maxHp;

    const cfg = configFor(type);
    this.avatar = new Avatar(cfg);
    this.group.add(this.avatar.group);
    this.group.scale.setScalar(this.stats.scale);
    this.group.position.copy(spawn);

    // la cucaracha se aplasta y le salen antenas (menos humanoide)
    if (type === "cucaracha") {
      this.avatar.group.scale.y = 0.6;
      const antMat = new THREE.MeshStandardMaterial({ color: "#241507", roughness: 0.8 });
      for (const sd of [-1, 1]) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.6, 5), antMat);
        ant.position.set(0.15 * sd, 1.55, 0.22);
        ant.rotation.x = -0.75;
        ant.rotation.z = 0.4 * sd;
        this.avatar.group.add(ant);
      }
    }

    const collectMats = (ghost: boolean) => {
      this.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            if (ghost) {
              std.transparent = true;
              std.opacity = 0.62;
              std.depthWrite = false;
            }
            this.mats.push(std);
          }
        }
      });
    };
    collectMats(type === "fantasma");

    // élite: tinte dorado
    if (elite) {
      for (const m of this.mats) {
        m.emissive = new THREE.Color("#c9861a");
        m.emissiveIntensity = 0.42;
      }
    }

    // barra de vida
    this.hpCanvas = document.createElement("canvas");
    this.hpCanvas.width = 64;
    this.hpCanvas.height = 8;
    this.hpTex = new THREE.CanvasTexture(this.hpCanvas);
    const smat = new THREE.SpriteMaterial({ map: this.hpTex, transparent: true, depthTest: false });
    this.hpSprite = new THREE.Sprite(smat);
    this.hpSprite.scale.set(0.9, 0.12, 1);
    this.hpSprite.position.y = 2.35 * this.stats.scale * (type === "altisimo" ? 1.5 : 1);
    this.hpSprite.renderOrder = 20;
    this.group.add(this.hpSprite);
    this.drawHp();

    if (this.type === "fantasma") this.group.position.y = 0.5;
    else this.group.position.y = -1.7; // emerge del suelo
  }

  get pos(): THREE.Vector3 {
    return this.group.position;
  }

  private drawHp(): void {
    const g = this.hpCanvas.getContext("2d")!;
    g.clearRect(0, 0, 64, 8);
    g.fillStyle = "rgba(6,10,18,0.85)";
    g.fillRect(0, 0, 64, 8);
    const f = clamp(this.hp / this.maxHp, 0, 1);
    g.fillStyle = this.elite ? "#f4c542" : f > 0.5 ? "#a8e63c" : f > 0.25 ? "#ffa02f" : "#ff5a4e";
    g.fillRect(1, 1, 62 * f, 6);
    this.hpTex.needsUpdate = true;
  }

  takeHit(dmg: number, from: THREE.Vector3): boolean {
    if (!this.alive) return false;
    const armor = this.type === "golem" ? 0.45 : 1;
    this.hp -= dmg * armor;
    this.drawHp();
    this.flashT = 0.12;
    for (const m of this.mats) {
      m.emissive = new THREE.Color(this.elite ? "#ffd24a" : "#ff2418");
      m.emissiveIntensity = 0.9;
    }
    const dir = new THREE.Vector3(this.group.position.x - from.x, 0, this.group.position.z - from.z).normalize();
    const power = this.type === "gerente" ? 0.6 : this.type === "golem" ? 0.9 : this.type === "altisimo" ? 2.2 : 3.4;
    this.vel.add(dir.multiplyScalar(power));
    if (this.state !== "die") {
      this.state = this.type === "gerente" || this.type === "golem" ? "chase" : "stun";
      this.t = 0.18;
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.alive = false;
    this.dying = true;
    this.state = "die";
    this.t = 0;
    this.hpSprite.visible = false;
  }

  update(dt: number, w: EnemyWorld): void {
    const p = this.group.position;

    // flash de daño
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        for (const m of this.mats) {
          m.emissiveIntensity = this.elite ? 0.42 : this.type === "maleta" || this.type === "gerente" || this.type === "golem" || this.type === "cucaracha" ? 0.5 : 0;
          if (this.type === "fantasma") m.emissiveIntensity = 0.15;
        }
      }
    }

    if (this.state === "die") {
      this.t += dt;
      this.group.rotation.x = Math.min(Math.PI / 2, this.t * 3.2);
      p.y = Math.max(-1.4, p.y - dt * 0.8);
      const s = Math.max(0.01, 1 - Math.max(0, this.t - 0.5) * 1.4);
      this.group.scale.setScalar(this.stats.scale * s);
      if (this.t > 1.2) this.group.visible = false;
      this.avatar.update(dt, false, 0, false);
      return;
    }

    if (this.state === "emerge") {
      this.t += dt;
      if (this.type === "fantasma") {
        p.y = 0.5;
        const fade = Math.min(0.62, this.t * 0.9);
        for (const m of this.mats) m.opacity = fade;
        if (this.t > 0.8) { this.state = "chase"; this.t = 0; }
      } else {
        p.y = -1.7 + Math.min(1.7, this.t * 2.4);
        if (p.y >= 0) { p.y = 0; this.state = "chase"; this.t = 0; }
      }
      this.avatar.update(dt, false, 0, false);
      return;
    }

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.wobble += dt * 3;

    /* ---------------- selección de objetivo/waypoints ---------------- */
    this.t -= dt;
    if (this.t <= 0 || this.waypoints.length === 0) {
      this.t = 0.35 + rnd(0, 0.2);
      this.waypoints = this.planRoute(w);
    }

    let target = this.waypoints.length > 0 ? this.waypoints[0] : w.playerPos;
    const dTarget = Math.hypot(target.x - p.x, target.z - p.z);
    if (dTarget < 0.5 && this.waypoints.length > 0) {
      this.waypoints.shift();
      target = this.waypoints.length > 0 ? this.waypoints[0] : w.playerPos;
    }

    /* ---------------- estados ---------------- */
    let moving = false;
    const speed = this.stats.speed * this.slowK;

    if (this.state === "stun") {
      this.t -= dt;
      if (this.t <= 0) this.state = "chase";
    } else if (this.state === "windup") {
      this.t -= dt;
      this.group.rotation.x = -0.25 * Math.sin((1 - Math.max(0, this.t) / 0.32) * Math.PI);
      if (this.t <= 0) {
        if (this.type === "camarista") {
          // lanzar botella de lejía
          const dir = new THREE.Vector3(w.playerPos.x - p.x, 0, w.playerPos.z - p.z).normalize();
          w.spawnEnemyProjectile(new THREE.Vector3(p.x, 1.3, p.z), dir, this.stats.dmg);
          w.fx(p, "#7dffa8", 5, 1.6);
        } else {
          const dp = Math.hypot(w.playerPos.x - p.x, w.playerPos.z - p.z);
          if (dp < this.stats.reach + 0.45 && w.playerAlive) {
            w.damagePlayer(this.stats.dmg, p);
          }
        }
        this.group.rotation.x = 0;
        this.state = "chase";
        this.attackCd = this.type === "camarista" ? 2.3 : 1.15;
        if (this.type !== "camarista") {
          this.vel.add(new THREE.Vector3(w.playerPos.x - p.x, 0, w.playerPos.z - p.z).normalize().multiplyScalar(2.2));
        }
      }
    } else {
      // chase
      const dPlayer = Math.hypot(w.playerPos.x - p.x, w.playerPos.z - p.z);

      // teletransporte del niño
      if (this.type === "nino") {
        this.tpT -= dt;
        if (this.tpT <= 0 && dPlayer > 5.5) {
          this.tpT = rnd(3.2, 5);
          w.fx(p, "#b8e0ff", 10, 2);
          const a = rnd(0, Math.PI * 2);
          const dest = new THREE.Vector3(
            w.playerPos.x + Math.cos(a) * 3.2,
            0,
            w.playerPos.z + Math.sin(a) * 3.2
          );
          // empujar fuera de colisiones
          for (const c of w.colliders) this.pushOut(dest, c, this.stats.radius);
          p.x = dest.x;
          p.z = dest.z;
          w.fx(p, "#b8e0ff", 10, 2);
          this.waypoints = [];
        }
      }

      // camarista: mantiene distancia y lanza
      if (this.type === "camarista") {
        if (this.attackCd <= 0 && dPlayer < 11 && dPlayer > 3) {
          this.state = "windup";
          this.t = 0.5;
        } else if (dPlayer > 10 || dPlayer < 2.6) {
          moving = true;
          const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z).normalize();
          if (dPlayer < 2.6) dir.multiplyScalar(-1); // retrocede
          p.x += dir.x * speed * dt;
          p.z += dir.z * speed * dt;
          this.faceTowards(w.playerPos.x, w.playerPos.z, dt);
        } else {
          this.faceTowards(w.playerPos.x, w.playerPos.z, dt);
        }
      } else if (dPlayer < this.stats.reach && this.attackCd <= 0 && w.playerAlive) {
        this.state = "windup";
        this.t = this.type === "cucaracha" ? 0.22 : 0.32;
      } else {
        moving = true;
        const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z).normalize();
        const wob = Math.sin(this.wobble) * 0.25;
        const wx = dir.x * Math.cos(wob) - dir.z * Math.sin(wob);
        const wz = dir.x * Math.sin(wob) + dir.z * Math.cos(wob);
        p.x += wx * speed * dt;
        p.z += wz * speed * dt;
        this.faceTowards(target.x, target.z, dt);
      }
    }

    /* ---------------- colisiones + ataque a estructuras ---------------- */
    if (this.type !== "fantasma") {
      const r = this.stats.radius;
      for (const c of w.colliders) this.pushOut(p, c, r);
      let blocked = false;
      for (const c of w.colliders) {
        if (p.x > c.minX - r && p.x < c.maxX + r && p.z > c.minZ - r && p.z < c.maxZ + r) blocked = true;
      }
      // obstáculos (puertas cerradas y barricadas)
      for (const o of w.obstacles) {
        if (!o.alive) continue;
        const ox = clamp(p.x, o.aabb.minX, o.aabb.maxX);
        const oz = clamp(p.z, o.aabb.minZ, o.aabb.maxZ);
        const d = Math.hypot(p.x - ox, p.z - oz);
        if (d < r + 0.12) {
          const dx = p.x - ox, dz = p.z - oz;
          const l = Math.max(0.001, Math.hypot(dx, dz));
          p.x = ox + (dx / l) * (r + 0.12);
          p.z = oz + (dz / l) * (r + 0.12);
          blocked = true;
          if (this.state === "chase" && this.attackCd <= 0) {
            const mult = this.type === "gerente" ? 3 : this.type === "golem" ? 2.4 : 1.4;
            w.damageObstacle(o, this.stats.dmg * mult);
            this.attackCd = 1.0;
            this.avatar.update(dt, false, 0, false);
            return;
          }
        }
      }
      if (blocked) this.lastPush.set(p.x, 0, p.z);
    }

    // knockback decay
    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    this.vel.multiplyScalar(Math.max(0, 1 - dt * 6));

    if (this.type === "fantasma") {
      this.floatT += dt * 2;
      p.y = 0.5 + Math.sin(this.floatT) * 0.14;
    }

    this.avatar.update(dt, moving, moving ? 0.9 : 0, false);
  }

  private planRoute(w: EnemyWorld): THREE.Vector3[] {
    const p = this.group.position;
    const t = w.playerPos;
    const myZone = this.zoneOf(w, p.x, p.z);
    const targetZone = this.zoneOf(w, t.x, t.z);
    if (myZone.idx === targetZone.idx || this.type === "fantasma") return [t.clone()];

    const route: THREE.Vector3[] = [];
    if (myZone.kind === "room") route.push(myZone.doorPos.clone());
    if (myZone.wing !== targetZone.wing) {
      // cruzar por el lobby
      route.push(new THREE.Vector3(0, 0, 0));
      if (targetZone.kind === "room") route.push(targetZone.doorPos.clone());
    } else if (targetZone.kind === "room") {
      route.push(targetZone.doorPos.clone());
    }
    route.push(t.clone());
    return route;
  }

  private zoneOf(w: EnemyWorld, x: number, z: number): Zone {
    for (const zn of w.zones) {
      if (zn.kind === "room" && pointInZone(zn, x, z)) return zn;
    }
    // pasillo o hub
    for (const zn of w.zones) {
      if (zn.kind !== "room" && pointInZone(zn, x, z)) return zn;
    }
    return w.zones[0];
  }

  private faceTowards(x: number, z: number, dt: number): void {
    const dx = x - this.group.position.x;
    const dz = z - this.group.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.01) {
      const target = Math.atan2(dx, dz);
      let diff = target - this.group.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.group.rotation.y += diff * Math.min(1, dt * 8);
    }
  }

  private pushOut(p: THREE.Vector3, c: AABB, r: number): void {
    if (p.x > c.minX - r && p.x < c.maxX + r && p.z > c.minZ - r && p.z < c.maxZ + r) {
      const dxl = p.x - (c.minX - r);
      const dxr = c.maxX + r - p.x;
      const dzl = p.z - (c.minZ - r);
      const dzr = c.maxZ + r - p.z;
      const m = Math.min(dxl, dxr, dzl, dzr);
      if (m === dxl) p.x = c.minX - r;
      else if (m === dxr) p.x = c.maxX + r;
      else if (m === dzl) p.z = c.minZ - r;
      else p.z = c.maxZ + r;
    }
  }

  dispose(): void {
    this.avatar.dispose();
    this.hpTex.dispose();
    (this.hpSprite.material as THREE.SpriteMaterial).dispose();
  }
}
