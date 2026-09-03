/* ============================================================
   HOTEL ∞ INFINITO — Demo 3D · motor del juego
   Turno de noche: atiende a los huéspedes, detecta anomalías,
   sobrevive hasta las 6:00 AM y sube al siguiente piso.
   ============================================================ */
import * as THREE from "three";
import { Avatar, type AvatarConfig } from "./avatar";
import { buildHotel, floorThemeFor, type HotelRefs } from "./hotel";
import { createGuest, Guest, type GuestCardData } from "./guest";
import { GameAudio } from "./audio";
import { clamp, damp, rnd } from "./util";

export type GamePhase = "intro" | "play" | "card" | "cleared" | "over" | "paused";

export type HudState = {
  phase: GamePhase;
  timeLabel: string;
  hour: number;
  hearts: number;
  money: number;
  floorCode: string;
  floorName: string;
  floorIndex: number;
  waiting: number;
  prompt: boolean;
  nightProgress: number;
  combo: number;
};

export type GameStats = {
  money: number;
  correct: number;
  mistakes: number;
  floorsCleared: number;
  floorIndex: number;
};

export type GameCallbacks = {
  onHud: (s: HudState) => void;
  onCard: (c: GuestCardData | null) => void;
  onToast: (msg: string, kind: "ok" | "bad" | "info") => void;
  onHurt: () => void;
  onCleared: (stats: GameStats) => void;
  onGameOver: (stats: GameStats) => void;
};

const HOUR_SEC = 30;
const NIGHT_HOURS = 6;
const QUEUE_MAX = 4;
const PATIENCE_MAX = 40;

const PLAYER_CFG: AvatarConfig = {
  skin: "#f5cd30",
  torso: "#1d3a6e",   // uniforme azul marino
  arms: "#f5cd30",
  legs: "#20242c",
  face: "happy",
  hat: "bellhop",
  hatColor: "#1d3a6e",
};

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;

  private hotel!: HotelRefs;
  private theme = floorThemeFor(0);

  // jugador
  private player: Avatar;
  private playerGroup = new THREE.Group();
  private vy = 0;
  private grounded = true;
  private facing = 0;

  // cámara
  private camYaw = Math.PI;
  private camPitch = 0.24;
  private camPos = new THREE.Vector3(0, 3, 8);

  // estado
  phase: GamePhase = "intro";
  private floorIndex = 0;
  private nightElapsed = 0;
  private hearts = 3;
  private money = 0;
  private correct = 0;
  private mistakes = 0;
  private combo = 0;
  private spawnTimer = 4;
  private guests: Guest[] = [];
  private decisionTarget: Guest | null = null;
  private shakeT = 0;
  private heartBeatT = 0;
  private introT = 0;
  private fade = 1; // fundido entre pisos (1 = negro)

  // entrada
  private keys = new Set<string>();
  private joy = { x: 0, z: 0 };
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };

  readonly audio = new GameAudio();
  private isTouch: boolean;
  private quality: "high" | "low";
  private cb: GameCallbacks;

  constructor(private canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.cb = cb;
    this.isTouch = window.matchMedia("(pointer: coarse)").matches;
    this.quality = this.isTouch ? "low" : "high";

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === "high", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === "high" ? 2 : 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 90);
    this.scene.add(this.camera);

    // luces base (por piso se añaden las del hotel)
    const hemi = new THREE.HemisphereLight(new THREE.Color("#4a6298"), new THREE.Color("#0e1420"), 1.55);
    this.scene.add(hemi);
    const moon = new THREE.DirectionalLight(new THREE.Color("#9db8e8"), 2.1);
    moon.position.set(-9, 11, 7);
    moon.castShadow = true;
    moon.shadow.mapSize.set(this.quality === "high" ? 2048 : 1024, this.quality === "high" ? 2048 : 1024);
    moon.shadow.camera.left = -16;
    moon.shadow.camera.right = 16;
    moon.shadow.camera.top = 16;
    moon.shadow.camera.bottom = -16;
    moon.shadow.bias = -0.003;
    this.scene.add(moon);
    const fill = new THREE.AmbientLight(new THREE.Color("#2e3d5e"), 0.9);
    this.scene.add(fill);

    this.player = new Avatar(PLAYER_CFG);
    this.playerGroup.add(this.player.group);
    this.scene.add(this.playerGroup);

    this.buildFloor(0);

    this.bindInput();
    this.onResize();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.loop();
  }

  /* ------------------------------ pisos ------------------------------ */

  private buildFloor(index: number): void {
    if (this.hotel) this.hotel.dispose();
    this.theme = floorThemeFor(index);
    this.hotel = buildHotel(this.scene, this.theme, this.quality);
    for (const g of this.guests) {
      this.scene.remove(g.group);
      g.dispose();
    }
    this.guests = [];
    this.nightElapsed = 0;
    this.spawnTimer = 3.5;
    const s = this.hotel.playerStart;
    this.playerGroup.position.set(s.x, 0, s.z);
    this.playerGroup.rotation.y = 0; // mirando al mostrador (+z)
    this.facing = 0;
    this.camYaw = Math.PI; // cámara al norte del jugador, espacio abierto
    this.camPos.set(s.x, 3.2, s.z - 5.6);
    this.fade = 1;
  }

  private stats(): GameStats {
    return {
      money: this.money,
      correct: this.correct,
      mistakes: this.mistakes,
      floorsCleared: this.floorIndex,
      floorIndex: this.floorIndex,
    };
  }

  private pushHud(): void {
    const hours = ["12:00 AM", "01:00 AM", "02:00 AM", "03:00 AM", "04:00 AM", "05:00 AM", "06:00 AM"];
    const hour = Math.min(NIGHT_HOURS, Math.floor(this.nightElapsed / HOUR_SEC));
    const minutes = Math.floor(((this.nightElapsed % HOUR_SEC) / HOUR_SEC) * 60);
    const label = hour >= NIGHT_HOURS ? "06:00 AM" : `${hours[hour].slice(0, 3)}${String(minutes).padStart(2, "0")} AM`;
    this.cb.onHud({
      phase: this.phase,
      timeLabel: label,
      hour,
      hearts: this.hearts,
      money: this.money,
      floorCode: this.theme.code,
      floorName: this.theme.name,
      floorIndex: this.floorIndex,
      waiting: this.guests.filter((g) => g.state === "waiting" || g.state === "arriving").length,
      prompt: this.nearGuest !== null,
      nightProgress: clamp(this.nightElapsed / (HOUR_SEC * NIGHT_HOURS), 0, 1),
      combo: this.combo,
    });
  }

  /* ------------------------------ entrada ------------------------------ */

  private bindInput(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
    this.keys.add(k);
    if (k === " " && this.phase === "play") this.pressJump();
    if (k === "e" && this.phase === "play") this.pressInteract();
    if (k === "p") this.togglePause();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };
  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  };
  private onPointerMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.orbit(dx * 0.0052, dy * 0.0034);
  };
  private onPointerUp = () => {
    this.dragging = false;
  };

  orbit(dx: number, dy: number): void {
    this.camYaw -= dx;
    this.camPitch = clamp(this.camPitch + dy, -0.1, 0.85);
  }

  setJoystick(x: number, z: number): void {
    this.joy.x = x;
    this.joy.z = z;
  }
  pressJump(): void {
    if (this.grounded && this.phase === "play") {
      this.vy = 5.2;
      this.grounded = false;
      this.audio.jump();
    }
  }
  pressInteract(): void {
    if (this.phase !== "play") return;
    const g = this.nearGuest;
    if (g) {
      this.phase = "card";
      this.decisionTarget = g;
      this.cb.onCard(g.card);
      this.pushHud();
    }
  }
  togglePause(): void {
    if (this.phase === "play") {
      this.phase = "paused";
    } else if (this.phase === "paused") {
      this.phase = "play";
    }
    this.pushHud();
  }

  /** decisión sobre el huésped en la ficha */
  decide(accept: boolean): void {
    const g = this.decisionTarget;
    if (!g) return;
    this.decisionTarget = null;
    this.cb.onCard(null);
    this.phase = "play";

    const anom = g.isAnomaly;
    if (accept && !anom) {
      // correcto: entra
      this.money += rnd(14, 32) | 0;
      this.correct++;
      this.combo++;
      g.setPath([this.hotel.elevatorSpot], "leaving");
      this.audio.stampOk();
      this.cb.onToast(
        this.combo >= 3 ? `ENTRADA ✓  ·  RACHA ×${this.combo}` : "ENTRADA ✓  ·  propina recibida",
        "ok"
      );
    } else if (accept && anom) {
      // error: dejaste entrar una anomalía
      g.glitchAfterWalk(
        new THREE.Vector3(g.group.position.x + rnd(-0.5, 0.5), 0, g.group.position.z - 1.4),
        700
      );
      this.loseHeart("dejaste entrar una anomalía");
      this.audio.alarm();
      this.combo = 0;
    } else if (!accept && anom) {
      // correcto: denunciada
      this.money += 25;
      this.correct++;
      this.combo++;
      g.setPath([this.hotel.entrance], "leaving");
      this.audio.stampOk();
      this.cb.onToast("ANOMALÍA DENUNCIADA ✓  ·  +25 R$", "ok");
    } else {
      // error: denunciaste a un huésped normal
      g.setPath([this.hotel.entrance], "leaving");
      this.loseHeart("denunciaste a un huésped normal");
      this.audio.alarm();
      this.combo = 0;
    }
    this.pushHud();
  }

  private loseHeart(reason: string): void {
    this.hearts--;
    this.mistakes++;
    this.shakeT = 0.5;
    this.cb.onHurt();
    this.cb.onToast(`CORAZÓN PERDIDO · ${reason}`, "bad");
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.endGame();
    }
  }

  private endGame(): void {
    this.phase = "over";
    this.audio.lose();
    this.audio.stopAmbient();
    this.cb.onGameOver(this.stats());
    this.pushHud();
  }

  /* --------------------------- flujo de turno --------------------------- */

  beginShift(): void {
    this.audio.init();
    this.audio.startAmbient();
    this.phase = "play";
    this.pushHud();
  }

  nextFloor(): void {
    this.floorIndex++;
    this.buildFloor(this.floorIndex);
    this.phase = "intro";
    this.audio.elevator();
    this.pushHud();
  }

  restart(): void {
    this.hearts = 3;
    this.money = 0;
    this.correct = 0;
    this.mistakes = 0;
    this.combo = 0;
    this.floorIndex = 0;
    this.buildFloor(0);
    this.phase = "intro";
    this.pushHud();
  }

  private clearNight(): void {
    this.phase = "cleared";
    this.audio.win();
    this.hotel.setElevatorOpen(1);
    this.audio.ding();
    // los que esperan se marchan
    for (const g of this.guests) {
      if (g.state === "waiting" || g.state === "arriving") {
        g.setPath([this.hotel.entrance], "leaving");
      }
    }
    this.cb.onCleared(this.stats());
    this.pushHud();
  }

  /* ------------------------------ bucle ------------------------------ */

  private get nearGuest(): Guest | null {
    let best: Guest | null = null;
    let bestD = 2.45;
    const p = this.playerGroup.position;
    for (const g of this.guests) {
      if (g.state !== "waiting") continue;
      const d = g.distanceTo(p);
      if (d < bestD) {
        bestD = d;
        best = g;
      }
    }
    return best;
  }

  private spawnGuest(): void {
    const waiting = this.guests.filter((g) => g.state === "waiting" || g.state === "arriving").length;
    if (waiting >= QUEUE_MAX) return;
    const anomalyChance = this.theme.anomalyChance;
    const anomaly =
      Math.random() < anomalyChance
        ? (["red-eyes", "tall", "floating", "gray", "empty", "no-shadow"] as const)[
            Math.floor(Math.random() * 6)
          ]
        : null;
    const slotIdx = waiting % QUEUE_MAX;
    const target = this.hotel.queueSlots[slotIdx];
    const guest = createGuest(anomaly, this.hotel.entrance, target);
    guest.onArrived = () => this.audio.chimeArrival();
    this.guests.push(guest);
    this.scene.add(guest.group);
  }

  private updatePlayer(dt: number): void {
    // dirección relativa a cámara
    let ix = 0, iz = 0;
    if (this.keys.has("w") || this.keys.has("arrowup")) iz -= 1;
    if (this.keys.has("s") || this.keys.has("arrowdown")) iz += 1;
    if (this.keys.has("a") || this.keys.has("arrowleft")) ix -= 1;
    if (this.keys.has("d") || this.keys.has("arrowright")) ix += 1;
    ix += this.joy.x;
    iz += this.joy.z;
    const len = Math.hypot(ix, iz);
    const p = this.playerGroup.position;

    if (len > 0.12 && this.phase === "play") {
      const nx = ix / len, nz = iz / len;
      // base relativa a cámara: F = adelante, R = derecha
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = nz * sin + nx * cos;
      const wz = nz * cos - nx * sin;
      const speed = 4.4;
      p.x += wx * speed * dt;
      p.z += wz * speed * dt;
      this.facing = Math.atan2(wx, wz);
    }
    // límites del lobby
    p.x = clamp(p.x, -12.2, 12.2);
    p.z = clamp(p.z, -8.2, 8.2);
    // colisión AABB simple (empuja fuera)
    const r = 0.42;
    for (const c of this.hotel.colliders) {
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

    // gravedad
    if (!this.grounded) {
      this.vy -= 13.5 * dt;
      p.y += this.vy * dt;
      if (p.y <= 0) {
        p.y = 0;
        this.vy = 0;
        this.grounded = true;
      }
    }

    this.playerGroup.rotation.y = damp(this.playerGroup.rotation.y, this.facing, 14, dt);
    const moving = len > 0.12 && this.phase === "play";
    this.player.update(dt, moving, Math.min(1, len), !this.grounded);
  }

  private updateCamera(dt: number): void {
    const p = this.playerGroup.position;
    const dist = 5.6;
    const height = 2.4 + this.camPitch * 3.2;
    const dirX = Math.sin(this.camYaw);
    const dirZ = Math.cos(this.camYaw);

    // raycast 2D jugador→cámara contra muros/muebles: acorta la distancia
    let tMin = 1;
    for (const b of this.hotel.cameraBlockers) {
      const t = this.rayAABB(p.x, p.z, dirX, dirZ, b);
      if (t < tMin) tMin = t;
    }
    const finalDist = Math.max(1.5, dist * tMin - 0.3);

    const target = new THREE.Vector3(
      p.x + dirX * finalDist,
      p.y + height,
      p.z + dirZ * finalDist
    );
    // seguridad extra: dentro de la sala y bajo el techo
    target.x = clamp(target.x, -12.3, 12.3);
    target.z = clamp(target.z, -8.3, 8.3);
    target.y = clamp(target.y, 1.1, 4.9);
    this.camPos.x = damp(this.camPos.x, target.x, 7, dt);
    this.camPos.y = damp(this.camPos.y, target.y, 7, dt);
    this.camPos.z = damp(this.camPos.z, target.z, 7, dt);
    this.camera.position.copy(this.camPos);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.24;
      this.camera.position.x += rnd(-s, s);
      this.camera.position.y += rnd(-s, s);
    }

    const look = new THREE.Vector3(p.x, p.y + 1.5, p.z);
    this.camera.lookAt(look);
  }

  /** rayo 2D (origen, dirección normalizada) vs AABB en XZ → t en (0,1] o 1 si no golpea */
  private rayAABB(ox: number, oz: number, dx: number, dz: number, b: { minX: number; maxX: number; minZ: number; maxZ: number }): number {
    let tmin = 0;
    let tmax = 1;
    if (Math.abs(dx) < 1e-8) {
      if (ox < b.minX || ox > b.maxX) return 1;
    } else {
      let t1 = (b.minX - ox) / dx;
      let t2 = (b.maxX - ox) / dx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return 1;
    }
    if (Math.abs(dz) < 1e-8) {
      if (oz < b.minZ || oz > b.maxZ) return 1;
    } else {
      let t1 = (b.minZ - oz) / dz;
      let t2 = (b.maxZ - oz) / dz;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return 1;
    }
    return tmin > 0.001 ? tmin : 1;
  }

  private updateIntro(dt: number): void {
    // cámara orbital lenta mostrando el lobby
    this.introT += dt;
    const a = this.introT * 0.14 + Math.PI;
    const r = 10.5;
    this.camera.position.set(Math.sin(a) * r, 4.4, Math.cos(a) * r + 1.5);
    this.camera.lookAt(0, 1.6, -0.5);
    this.camPos.copy(this.camera.position);
    this.player.update(dt, false, 0, false);
    this.fade = Math.max(0, this.fade - dt * 1.2);
  }

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this.phase === "intro") {
      this.updateIntro(dt);
      this.updateGuests(dt, true);
    } else if (this.phase === "play" || this.phase === "card" || this.phase === "cleared") {
      if (this.phase === "play") {
        this.nightElapsed += dt;
        if (this.nightElapsed >= HOUR_SEC * NIGHT_HOURS) {
          this.clearNight();
        } else {
          this.spawnTimer -= dt;
          if (this.spawnTimer <= 0) {
            this.spawnGuest();
            this.spawnTimer = rnd(this.theme.arrivalMin, this.theme.arrivalMax);
          }
        }
        if (this.hearts === 1) {
          this.heartBeatT -= dt;
          if (this.heartBeatT <= 0) {
            this.audio.heartbeat();
            this.heartBeatT = 1.5;
          }
        }
      }
      this.updatePlayer(dt);
      this.updateGuests(dt, false);
      this.updateCamera(dt);
      // paciencia
      if (this.phase === "play") {
        for (const g of this.guests) {
          if (g.state === "waiting" && g.patience > PATIENCE_MAX) {
            g.setPath([this.hotel.entrance], "leaving");
            this.cb.onToast(`${g.card.name} se cansó de esperar y se fue`, "info");
          }
        }
      }
      this.fade = Math.max(0, this.fade - dt * 1.2);
    } else if (this.phase === "over" || this.phase === "paused") {
      this.updateCamera(dt);
    }

    this.pushHudThrottled(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private updateGuests(dt: number, introMode: boolean): void {
    for (let i = this.guests.length - 1; i >= 0; i--) {
      const g = this.guests[i];
      g.update(dt, introMode ? 1 : 1);
      if (g.done) {
        this.scene.remove(g.group);
        g.dispose();
        this.guests.splice(i, 1);
      }
    }
  }

  private hudAcc = 0;
  private pushHudThrottled(dt: number): void {
    this.hudAcc += dt;
    if (this.hudAcc > 0.12) {
      this.hudAcc = 0;
      this.pushHud();
    }
  }

  private onResize = (): void => {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  private onVisibility = (): void => {
    if (document.hidden && this.phase === "play") {
      this.phase = "paused";
      this.pushHud();
    }
  };

  /* ------------------------------ cierre ------------------------------ */

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.audio.dispose();
    if (this.hotel) this.hotel.dispose();
    for (const g of this.guests) g.dispose();
    this.player.dispose();
    this.renderer.dispose();
  }
}
