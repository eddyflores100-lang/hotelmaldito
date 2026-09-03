/* ============================================================
   HOTEL ∞ INFINITO — Enemigos: las anomalías se vuelvenhostiles.
   5 tipos · IA por zonas · ataques · knockback · barra de vida.
   ============================================================ */
import * as THREE from "three";
import { Avatar, type AvatarConfig } from "./avatar";
import { type AABB, type Zone, pointInZone } from "./world";
import { clamp, rnd } from "./util";

export type EnemyType = "sombra" | "maleta" | "altisimo" | "fantasma" | "gerente";

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
};

type Stats = { hp: number; speed: number; dmg: number; radius: number; scale: number; reach: number };

const BASE: Record<EnemyType, Stats> = {
  sombra:   { hp: 40,  speed: 2.7, dmg: 8,  radius: 0.45, scale: 1.0,  reach: 1.05 },
  maleta:   { hp: 22,  speed: 4.7, dmg: 6,  radius: 0.36, scale: 0.72, reach: 0.9 },
  altisimo: { hp: 80,  speed: 2.2, dmg: 14, radius: 0.5,  scale: 1.0,  reach: 1.35 },
  fantasma: { hp: 46,  speed: 3.1, dmg: 10, radius: 0.45, scale: 1.0,  reach: 1.05 },
  gerente:  { hp: 340, speed: 1.9, dmg: 22, radius: 0.75, scale: 1.55, reach: 1.6 },
};

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
  }
}

export class Enemy {
  readonly group = new THREE.Group();
  private avatar: Avatar;
  readonly type: EnemyType;
  readonly stats: Stats;
  hp: number;
  maxHp: number;
  alive = true;
  dying = false;

  private vel = new THREE.Vector3();
  state: "emerge" | "chase" | "windup" | "stun" | "die" = "emerge";
  private t = 0;               // tiempo en estado
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

  constructor(type: EnemyType, difficulty: number, spawn: THREE.Vector3) {
    this.type = type;
    const base = BASE[type];
    const k = 1 + difficulty * 0.16;
    this.stats = {
      hp: Math.round(base.hp * k),
      speed: base.speed * (1 + difficulty * 0.02),
      dmg: Math.round(base.dmg * (1 + difficulty * 0.1)),
      radius: base.radius,
      scale: base.scale,
      reach: base.reach,
    };
    this.maxHp = this.stats.hp;
    this.hp = this.maxHp;

    const cfg = configFor(type);
    this.avatar = new Avatar(cfg);
    this.group.add(this.avatar.group);
    this.group.scale.setScalar(base.scale);
    this.group.position.copy(spawn);

    // fantasma: transparencia
    if (type === "fantasma") {
      this.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as THREE.MeshStandardMaterial;
            std.transparent = true;
            std.opacity = 0.62;
            std.depthWrite = false;
            this.mats.push(std);
          }
        }
      });
    } else {
      this.group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) this.mats.push(mat as THREE.MeshStandardMaterial);
        }
      });
    }

    // barra de vida
    this.hpCanvas = document.createElement("canvas");
    this.hpCanvas.width = 64;
    this.hpCanvas.height = 8;
    this.hpTex = new THREE.CanvasTexture(this.hpCanvas);
    const smat = new THREE.SpriteMaterial({ map: this.hpTex, transparent: true, depthTest: false });
    this.hpSprite = new THREE.Sprite(smat);
    this.hpSprite.scale.set(0.9, 0.12, 1);
    this.hpSprite.position.y = 2.35 * base.scale * (type === "altisimo" ? 1.5 : 1);
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
    g.fillStyle = f > 0.5 ? "#a8e63c" : f > 0.25 ? "#ffa02f" : "#ff5a4e";
    g.fillRect(1, 1, 62 * f, 6);
    this.hpTex.needsUpdate = true;
  }

  takeHit(dmg: number, from: THREE.Vector3): boolean {
    if (!this.alive) return false;
    this.hp -= dmg;
    this.drawHp();
    this.flashT = 0.12;
    for (const m of this.mats) {
      m.emissive = new THREE.Color("#ff2418");
      m.emissiveIntensity = 0.9;
    }
    // knockback
    const dir = new THREE.Vector3(this.group.position.x - from.x, 0, this.group.position.z - from.z).normalize();
    const power = this.type === "gerente" ? 0.6 : this.type === "altisimo" ? 2.2 : 3.4;
    this.vel.add(dir.multiplyScalar(power));
    if (this.state !== "die") {
      this.state = this.type === "gerente" ? "chase" : "stun";
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
          m.emissiveIntensity = this.type === "maleta" || this.type === "gerente" ? 0.5 : 0;
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
      if (this.t > 1.2) {
        this.group.visible = false;
      }
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

    if (this.state === "stun") {
      this.t -= dt;
      if (this.t <= 0) this.state = "chase";
    } else if (this.state === "windup") {
      this.t -= dt;
      // inclinarse hacia atrás
      this.group.rotation.x = -0.25 * Math.sin((1 - Math.max(0, this.t) / 0.32) * Math.PI);
      if (this.t <= 0) {
        // embestida
        const dp = Math.hypot(w.playerPos.x - p.x, w.playerPos.z - p.z);
        if (dp < this.stats.reach + 0.45 && w.playerAlive) {
          w.damagePlayer(this.stats.dmg, p);
        }
        this.group.rotation.x = 0;
        this.state = "chase";
        this.attackCd = 1.15;
        this.vel.add(new THREE.Vector3(
          (w.playerPos.x - p.x), 0, (w.playerPos.z - p.z)
        ).normalize().multiplyScalar(2.2));
      }
    } else {
      // chase
      const dPlayer = Math.hypot(w.playerPos.x - p.x, w.playerPos.z - p.z);
      if (dPlayer < this.stats.reach && this.attackCd <= 0 && w.playerAlive) {
        this.state = "windup";
        this.t = 0.32;
      } else {
        moving = true;
        const dir = new THREE.Vector3(target.x - p.x, 0, target.z - p.z).normalize();
        const wob = Math.sin(this.wobble) * 0.25;
        const wx = dir.x * Math.cos(wob) - dir.z * Math.sin(wob);
        const wz = dir.x * Math.sin(wob) + dir.z * Math.cos(wob);
        p.x += wx * this.stats.speed * dt;
        p.z += wz * this.stats.speed * dt;
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
          // empujar fuera
          const dx = p.x - ox, dz = p.z - oz;
          const l = Math.max(0.001, Math.hypot(dx, dz));
          p.x = ox + (dx / l) * (r + 0.12);
          p.z = oz + (dz / l) * (r + 0.12);
          blocked = true;
          // atacarlo
          if (this.state === "chase" && this.attackCd <= 0) {
            w.damageObstacle(o, this.stats.dmg * (this.type === "gerente" ? 3 : 1.4));
            this.attackCd = 1.0;
            this.avatar.update(dt, false, 0, false);
            return;
          }
        }
      }
      if (blocked) {
        this.lastPush.set(p.x, 0, p.z);
      }
    }

    /* ---------------- separación entre enemigos la hace Game ---------------- */

    // knockback decay
    p.x += this.vel.x * dt;
    p.z += this.vel.z * dt;
    this.vel.multiplyScalar(Math.max(0, 1 - dt * 6));

    // flotación del fantasma
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
    if (myZone.idx === targetZone.idx || this.type === "fantasma") {
      return [t.clone()];
    }
    const route: THREE.Vector3[] = [];
    if (myZone.kind === "room") {
      route.push(this.doorOf(w, myZone.idx));
    }
    if (targetZone.kind === "room") {
      // punto en pasillo frente a la puerta del jugador
      const door = this.doorOf(w, targetZone.idx);
      route.push(new THREE.Vector3(door.x, 0, clamp(p.z, -1.6, 1.6)));
      route.push(door.clone());
    } else {
      route.push(t.clone());
    }
    return route.length > 0 ? route : [t.clone()];
  }

  private zoneOf(w: EnemyWorld, x: number, z: number): Zone {
    for (const zn of w.zones) {
      if (zn.kind === "corridor") continue;
      if (pointInZone(zn, x, z)) return zn;
    }
    return w.zones[0]; // pasillo por defecto
  }

  private doorOf(w: EnemyWorld, roomIdx: number): THREE.Vector3 {
    // el pasillo idx -1; para habitación idx → puerta en su borde hacia el pasillo
    const zn = w.zones.find((z2) => z2.kind === "room" && z2.idx === roomIdx) ?? w.zones[0];
    const northSide = zn.maxZ < 0;
    return new THREE.Vector3((zn.minX + zn.maxX) / 2, 0, northSide ? zn.maxZ + 0.4 : zn.minZ - 0.4);
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
