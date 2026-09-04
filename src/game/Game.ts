/* ============================================================
   HOTEL ∞ INFINITO — NOCHE INFINITA · motor de juego
   Acción-survival 3D: explora pisos infinitos, saquea
   habitaciones, construye defensas y sobrevive las oleadas.
   ============================================================ */
import * as THREE from "three";
import { Avatar } from "./avatar";
import { buildWorld, makeKeyMesh, type AABB, type DoorInfo, type LootItem, type MapData, type WorldRefs, pointInZone } from "./world";
import { floorThemeFor } from "./hotel";
import { Enemy, type EnemyType, type EnemyWorld, type ObstacleRef } from "./enemy";
import {
  BUILD_COST, BUILD_INFO, buildStructure, disposeBuildable, makeGhostMesh, makeProjectile,
  type BuildKind, type Buildable, type Projectile,
} from "./builds";
import { MissionBoard } from "./missions";
import { GameAudio } from "./audio";
import { TOOLS, makeToolMesh, makeToolPickupMesh, type ToolType } from "./tools";
import { clamp, damp, rnd, irnd, disposeObject } from "./util";

export type GamePhase = "intro" | "day" | "night" | "cleared" | "upgrade" | "over" | "paused";

export type HudMission = { desc: string; progress: number; target: number; done: boolean; reward: number };

export type HudState = {
  phase: GamePhase;
  hp: number;
  maxHp: number;
  coins: number;
  keys: number;
  score: number;
  best: number;
  floorCode: string;
  floorName: string;
  floorIndex: number;
  phaseLabel: string;
  phaseProgress: number;
  wave: number;
  waveTotal: number;
  enemiesAlive: number;
  combo: number;
  buildMode: BuildKind | null;
  prompt: string | null;
  missions: HudMission[];
  dashReady: number; // 0..1
  roomName: string;
  roomsExplored: number;
  roomsTotal: number;
  map: MapData | null;
  playerPt: { x: number; z: number; ang: number };
  enemyPts: { x: number; z: number; elite: boolean }[];
  chestPts: { x: number; z: number }[];
  tool: { name: string; dmg: number; reach: number; color: string };
};

export type GameStats = {
  score: number;
  best: number;
  kills: number;
  coinsEarned: number;
  rooms: number;
  floors: number;
  nights: number;
};

export type UpgradeCard = { id: string; title: string; desc: string; icon: string };

export type GameCallbacks = {
  onHud: (s: HudState) => void;
  onToast: (msg: string, kind: "ok" | "bad" | "info") => void;
  onBanner: (title: string, sub: string) => void;
  onHurt: () => void;
  onUpgrades: (cards: UpgradeCard[] | null) => void;
  onGameOver: (stats: GameStats) => void;
};

const DAY_LEN = 60;
const WAVES_PER_NIGHT = 3;
const BEST_KEY = "hotelinf-best-v4";

type Upgrade = UpgradeCard & { apply: () => void };

const PLAYER_SPEED = 4.7;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;

  private world!: WorldRefs;
  private theme = floorThemeFor(0);
  private floorIndex = 0;

  private hemi: THREE.HemisphereLight;
  private moon: THREE.DirectionalLight;
  private targetLightK = 1; // 1 = día, 0 = noche
  private lightK = 1;

  // jugador
  private player: Avatar;
  private playerGroup = new THREE.Group();
  private weaponPivot = new THREE.Group();
  private vy = 0;
  private grounded = true;
  private facing = 0;
  private hp = 100;
  private maxHp = 100;
  private armor = 1;
  private dmgMult = 1;
  private speedMult = 1;
  private reachMult = 1;
  private magnetMult = 1;
  private coinMult = 1;
  private tool: ToolType = "escoba";
  private toolMesh: THREE.Group | null = null;
  private toolDrops: { type: ToolType; group: THREE.Group; spinner: THREE.Group; pos: THREE.Vector3; phase: number }[] = [];
  private dashCd = 0;
  private dashCdMax = 1.5;
  private dashing = 0;
  private iframes = 0;
  private swingT = 0;
  private swingCd = 0;
  private knock = new THREE.Vector3();

  // economía / progreso
  private coins = 0;
  private keys = 0;
  private score = 0;
  private best = 0;
  private kills = 0;
  private coinsEarned = 0;
  private nights = 0;
  private combo = 0;
  private comboT = 0;

  // fases y oleadas
  phase: GamePhase = "intro";
  private phaseT = 0;
  private wave = 0;
  private waveTotal = WAVES_PER_NIGHT;
  private toSpawn = 0;
  private spawnTimer = 0;
  private waveGapT = 0;
  private bossWave = false;
  private bossSpawned = false;

  private enemies: Enemy[] = [];
  private builds: Buildable[] = [];
  private projectiles: Projectile[] = [];
  private obstacles: ObstacleRef[] = [];

  // construcción
  private buildMode: BuildKind | null = null;
  private ghosts: Record<BuildKind, THREE.Group>;
  private ghostValid = false;
  private ghostPos = new THREE.Vector3();
  private pointerNdc = new THREE.Vector2();

  // interacción
  private prompt: string | null = null;
  private promptAction: (() => void) | null = null;

  // efectos
  private particles: { mesh: THREE.Mesh; vel: THREE.Vector3; life: number }[] = [];
  private floaters: { sprite: THREE.Sprite; life: number; vy: number }[] = [];
  private shakeT = 0;

  // misiones
  private board = new MissionBoard(
    (m) => {
      this.coins += m.reward;
      this.score += m.reward * 2;
      this.audio.coin();
      this.cb.onToast(`MISIÓN COMPLETADA ✓ +${m.reward} monedas`, "ok");
    },
    (m) => this.cb.onToast(`NUEVA MISIÓN: ${m.desc}`, "info")
  );

  // cámara
  private camYaw = 0;
  private camPitch = 0.3;
  private camPos = new THREE.Vector3(0, 4, 8);

  // entrada
  private keysDown = new Set<string>();
  private joy = { x: 0, z: 0 };
  private dragging = false;
  private dragMoved = 0;
  private lastPointer = { x: 0, y: 0 };

  readonly audio = new GameAudio();
  private isTouch: boolean;
  private quality: "high" | "low";
  private cb: GameCallbacks;

  constructor(private canvas: HTMLCanvasElement, cb: GameCallbacks) {
    this.cb = cb;
    this.isTouch = window.matchMedia("(pointer: coarse)").matches;
    this.quality = this.isTouch ? "low" : "high";
    this.best = Number(localStorage.getItem(BEST_KEY) ?? 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: this.quality === "high", powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality === "high" ? 2 : 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 130);
    this.scene.add(this.camera);

    this.hemi = new THREE.HemisphereLight(new THREE.Color("#5a72a8"), new THREE.Color("#12182a"), 1.5);
    this.scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(new THREE.Color("#9db8e8"), 1.9);
    this.moon.position.set(-9, 12, 7);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(this.quality === "high" ? 2048 : 1024, this.quality === "high" ? 2048 : 1024);
    this.moon.shadow.camera.left = -36;
    this.moon.shadow.camera.right = 36;
    this.moon.shadow.camera.top = 36;
    this.moon.shadow.camera.bottom = -36;
    this.moon.shadow.bias = -0.003;
    this.scene.add(this.moon);
    const fill = new THREE.AmbientLight(new THREE.Color("#2e3d5e"), 0.8);
    this.scene.add(fill);

    // jugador
    this.player = new Avatar({
      skin: "#f5cd30",
      torso: "#1d3a6e",
      arms: "#f5cd30",
      legs: "#20242c",
      face: "happy",
      hat: "bellhop",
      hatColor: "#1d3a6e",
    });
    this.playerGroup.add(this.player.group);
    this.equipTool("escoba", true);
    this.scene.add(this.playerGroup);

    // fantasmas de construcción
    this.ghosts = {
      barricade: makeGhostMesh("barricade"),
      turret: makeGhostMesh("turret"),
      medkit: makeGhostMesh("medkit"),
      trap: makeGhostMesh("trap"),
      totem: makeGhostMesh("totem"),
    };
    for (const k of Object.keys(this.ghosts) as BuildKind[]) {
      this.ghosts[k].visible = false;
      this.scene.add(this.ghosts[k]);
    }

    // pool de partículas (octaedros, no cubos)
    const pGeo = new THREE.OctahedronGeometry(0.075);
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(pGeo, new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true }));
      m.visible = false;
      this.scene.add(m);
      this.particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0 });
    }

    this.buildFloor(0);
    this.bindInput();
    this.onResize();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.loop();
    // hook de depuración/E2E
    (window as unknown as { __hotelGame?: Game }).__hotelGame = this;
  }

  /* --------------------------- herramienta --------------------------- */

  private equipTool(type: ToolType, silent = false): void {
    this.tool = type;
    if (this.toolMesh) {
      this.weaponPivot.remove(this.toolMesh);
      this.toolMesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (!m.material) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) mat?.dispose();
      });
    }
    this.toolMesh = makeToolMesh(type);
    this.weaponPivot.add(this.toolMesh);
    if (this.weaponPivot.parent !== this.playerGroup) this.playerGroup.add(this.weaponPivot);
    // pose de reposo: ligeramente abierta del cuerpo y con la punta visible
    this.weaponPivot.position.set(0.52, 1.0, 0.05);
    this.weaponPivot.rotation.set(-0.55, 0.14, -0.1);
    if (!silent) {
      const t = TOOLS[type];
      this.audio.upgrade();
      this.spawnParticles(this.playerGroup.position, t.glow, 10, 2.2);
      this.spawnFloater(this.playerGroup.position, t.name, t.glow);
      this.cb.onToast(`⚔ ${t.name} EQUIPADA · Daño ${t.dmg} · ${t.desc}`, "ok");
      this.pushHud();
    }
  }

  /** suelta una herramienta como botín brillante en el suelo */
  private spawnToolDrop(type: ToolType, pos: THREE.Vector3): void {
    const { group, spinner } = makeToolPickupMesh(type);
    group.position.set(pos.x + rnd(-0.5, 0.5), 0, pos.z + rnd(-0.5, 0.5));
    group.rotation.y = rnd(0, Math.PI * 2);
    this.scene.add(group);
    this.toolDrops.push({ type, group, spinner, pos: group.position.clone(), phase: rnd(0, 6.28) });
  }

  /* ------------------------------ piso ------------------------------ */

  private buildFloor(index: number): void {
    if (this.world) this.world.dispose();
    for (const e of this.enemies) { this.scene.remove(e.group); e.dispose(); }
    this.enemies = [];
    for (const b of this.builds) { this.scene.remove(b.group); disposeBuildable(b); }
    this.builds = [];
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    for (const t of this.toolDrops) { this.scene.remove(t.group); disposeObject(t.group); }
    this.toolDrops = [];

    this.theme = floorThemeFor(index);
    this.world = buildWorld(this.scene, this.theme, this.quality, index);

    const s = this.world.playerStart;
    this.playerGroup.position.set(s.x, 0, s.z);
    this.facing = Math.PI; // mirando al norte (ascensor)
    this.playerGroup.rotation.y = this.facing;
    this.camYaw = 0; // cámara detrás (sur)
    this.camPos.set(s.x, 3.4, s.z + 5);
    this.fadeK = 1;

    this.board.seedForFloor(index);
    this.wave = 0;
    this.toSpawn = 0;
    this.bossWave = index % 3 === 2;
    this.bossSpawned = false;
  }

  private fadeK = 1; // fundido entre pisos

  /* ------------------------------ HUD ------------------------------ */

  private stats(): GameStats {
    return { score: this.score, best: this.best, kills: this.kills, coinsEarned: this.coinsEarned, rooms: this.exploredCount(), floors: this.floorIndex, nights: this.nights };
  }

  private exploredCount(): number {
    return this.world ? this.world.rooms.filter((r) => r.explored).length : 0;
  }

  private pushHud(): void {
    let phaseLabel = "";
    let progress = 0;
    if (this.phase === "day") {
      phaseLabel = "PREPARACIÓN";
      progress = 1 - this.phaseT / DAY_LEN;
    } else if (this.phase === "night") {
      phaseLabel = `NOCHE · OLEADA ${Math.min(this.wave + 1, this.waveTotal)}/${this.waveTotal}`;
      progress = this.wave / this.waveTotal;
    } else if (this.phase === "cleared") {
      phaseLabel = "6:00 AM · PISO SUPERADO";
      progress = 1;
    }
    // sala actual
    const pp = this.playerGroup.position;
    let roomName = "LOBBY ∞";
    for (const z of this.world.zones) {
      if (!pointInZone(z, pp.x, pp.z)) continue;
      if (z.kind === "room") {
        const r = this.world.rooms[z.idx];
        roomName = r.special ?? r.name;
      } else if (z.kind === "corridor") {
        roomName = z.wing === "west" ? "PASILLO OESTE" : z.wing === "east" ? "PASILLO ESTE" : "PASILLO NORTE";
      } else {
        roomName = "LOBBY ∞";
      }
      break;
    }
    this.cb.onHud({
      phase: this.phase,
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: this.maxHp,
      coins: this.coins,
      keys: this.keys,
      score: this.score,
      best: this.best,
      floorCode: this.theme.code,
      floorName: this.theme.name,
      floorIndex: this.floorIndex,
      phaseLabel,
      phaseProgress: progress,
      wave: this.wave,
      waveTotal: this.waveTotal,
      enemiesAlive: this.enemies.filter((e) => e.alive).length + this.toSpawn,
      combo: this.combo,
      buildMode: this.buildMode,
      prompt: this.prompt,
      missions: this.board.missions.map((m) => ({ desc: m.desc, progress: m.progress, target: m.target, done: m.done, reward: m.reward })),
      dashReady: 1 - this.dashCd / this.dashCdMax,
      roomName,
      roomsExplored: this.exploredCount(),
      roomsTotal: this.world.rooms.length,
      map: this.world.map,
      playerPt: { x: pp.x, z: pp.z, ang: this.facing },
      enemyPts: this.enemies.filter((e) => e.alive).map((e) => ({ x: e.pos.x, z: e.pos.z, elite: e.elite })),
      chestPts: this.world.rooms.filter((r) => r.chest && !r.chest.taken).map((r) => ({ x: r.chest!.pos.x, z: r.chest!.pos.z })),
      tool: { name: TOOLS[this.tool].name, dmg: Math.round(TOOLS[this.tool].dmg * this.dmgMult), reach: Math.round(TOOLS[this.tool].reach * this.reachMult * 10) / 10, color: TOOLS[this.tool].glow },
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
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "shift"].includes(k)) e.preventDefault();
    this.keysDown.add(k);
    if (this.phase !== "day" && this.phase !== "night") return;
    if (k === " ") this.pressJump();
    if (k === "j") this.pressAttack();
    if (k === "shift") this.pressDash();
    if (k === "e") this.pressInteract();
    if (k === "1") this.selectBuild(this.buildMode === "barricade" ? null : "barricade");
    if (k === "2") this.selectBuild(this.buildMode === "turret" ? null : "turret");
    if (k === "3") this.selectBuild(this.buildMode === "medkit" ? null : "medkit");
    if (k === "4") this.selectBuild(this.buildMode === "trap" ? null : "trap");
    if (k === "5") this.selectBuild(this.buildMode === "totem" ? null : "totem");
    if (k === "q") this.selectBuild(null);
    if (k === "p" || k === "escape") this.togglePause();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keysDown.delete(e.key.toLowerCase());
  };

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true;
    this.dragMoved = 0;
    this.lastPointer = { x: e.clientX, y: e.clientY };
  };
  private onPointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.dragMoved += Math.abs(dx) + Math.abs(dy);
    this.orbit(dx * 0.0052, dy * 0.0034);
  };
  private onPointerUp = (e: PointerEvent) => {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.dragMoved < 8 && this.phase !== "intro") {
      const rect = this.canvas.getBoundingClientRect();
      this.pointerNdc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      if (this.buildMode) this.tryPlaceBuild();
      else this.pressAttack();
    }
  };

  orbit(dx: number, dy: number): void {
    this.camYaw -= dx;
    this.camPitch = clamp(this.camPitch + dy, 0.05, 0.95);
  }

  setJoystick(x: number, z: number): void {
    this.joy.x = x;
    this.joy.z = z;
  }

  pressJump(): void {
    if (this.grounded && (this.phase === "day" || this.phase === "night")) {
      this.vy = 5.4;
      this.grounded = false;
      this.audio.jump();
    }
  }

  pressDash(): void {
    if (this.dashCd > 0 || (this.phase !== "day" && this.phase !== "night")) return;
    this.dashing = 0.16;
    this.iframes = Math.max(this.iframes, 0.3);
    this.dashCd = this.dashCdMax;
    this.audio.dash();
    this.spawnParticles(this.playerGroup.position, "#cfe8ff", 6, 1.5);
  }

  pressAttack(): void {
    if (this.swingCd > 0 || (this.phase !== "day" && this.phase !== "night")) return;
    const tool = TOOLS[this.tool];
    this.swingT = 1;
    this.swingCd = tool.cd;
    this.audio.swing();
    // golpe en arco (el arco depende de la herramienta)
    const p = this.playerGroup.position;
    const fx = Math.sin(this.facing);
    const fz = Math.cos(this.facing);
    const reach = tool.reach * this.reachMult;
    let hitAny = false;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - p.x;
      const dz = e.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > reach + e.stats.radius) continue;
      const dot = (dx * fx + dz * fz) / Math.max(0.001, d);
      if (dot < tool.arcDot) continue; // fuera del arco
      const killed = e.takeHit(Math.round(tool.dmg * this.dmgMult), p);
      hitAny = true;
      this.spawnParticles(e.pos, tool.color, 5, 2.2);
      if (killed) this.onEnemyKilled(e);
    }
    // objetos rompibles (jarrones, platos…)
    for (const br of this.world.breakables) {
      if (br.broken) continue;
      const dx = br.pos.x - p.x;
      const dz = br.pos.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > reach + 0.3) continue;
      const dot = (dx * fx + dz * fz) / Math.max(0.001, d);
      if (dot < 0.2) continue;
      br.broken = true;
      br.group.visible = false;
      hitAny = true;
      this.audio.shatter();
      this.spawnParticles(br.pos, "#d8b06a", 9, 2.2);
      const v = Math.round(br.value * this.coinMult);
      this.coins += v;
      this.coinsEarned += v;
      this.score += 5;
      this.spawnFloater(br.pos, `+${v}`, "#f4c542");
      this.board.emit({ kind: "break" });
    }
    if (hitAny) {
      this.audio.hitEnemy();
      this.shakeT = Math.max(this.shakeT, 0.14);
    }
  }

  pressInteract(): void {
    if (this.promptAction && (this.phase === "day" || this.phase === "night" || this.phase === "cleared")) this.promptAction();
  }

  selectBuild(kind: BuildKind | null): void {
    if (kind && this.coins < BUILD_COST[kind]) {
      this.audio.buildError();
      this.cb.onToast(`Te faltan monedas: ${BUILD_INFO[kind].name} cuesta ${BUILD_COST[kind]}`, "bad");
      return;
    }
    this.buildMode = this.buildMode === kind ? null : kind;
    for (const k of Object.keys(this.ghosts) as BuildKind[]) this.ghosts[k].visible = this.buildMode === k;
    this.pushHud();
  }

  togglePause(): void {
    if (this.phase === "day" || this.phase === "night") {
      this.phase = "paused";
    } else if (this.phase === "paused") {
      this.phase = this.wave > 0 ? "night" : "day";
    }
    this.pushHud();
  }

  setMuted(m: boolean): void {
    this.audio.setMuted(m);
  }

  /* --------------------------- flujo de fases --------------------------- */

  begin(): void {
    this.audio.init();
    this.audio.startAmbient();
    this.startDay();
  }

  private startDay(): void {
    this.phase = "day";
    this.phaseT = DAY_LEN;
    this.targetLightK = 1;
    this.cb.onBanner(`PISO ${this.theme.code} — ${this.theme.name}`, "Explora, saquea y construye defensas antes de la noche");
    this.audio.ding();
    this.pushHud();
  }

  private startNight(): void {
    this.phase = "night";
    this.targetLightK = 0;
    this.wave = 0;
    this.waveGapT = 0;
    this.nights++;
    this.startWave();
    this.audio.wave();
    this.pushHud();
  }

  private startWave(): void {
    const f = this.floorIndex;
    const count = 5 + f * 2 + this.wave * 3;
    this.toSpawn = count;
    this.spawnTimer = 1.2;
    const isBossWave = this.bossWave && this.wave === this.waveTotal - 1;
    this.cb.onBanner(
      isBossWave ? "⚠ EL GERENTE HA LLEGADO ⚠" : `OLEADA ${this.wave + 1} / ${this.waveTotal}`,
      isBossWave ? "Sobrevive. Él rompe todo a su paso." : "Las anomalías avanzan desde el ascensor",
    );
    if (isBossWave) this.audio.roar();
    else this.audio.wave();
  }

  private clearFloor(): void {
    this.phase = "cleared";
    this.targetLightK = 1;
    this.score += 500;
    this.audio.win();
    this.audio.ding();
    this.world.setElevatorGlow(1);
    this.cb.onBanner("6:00 AM — SOBREVIVISTE LA NOCHE", "Sube al ascensor para el siguiente piso (+500 puntos)");
    this.pushHud();
  }

  private offerUpgrades(): void {
    const pool: Upgrade[] = [
      { id: "dmg", title: "HERRAMIENTA AFILADA", desc: "+30% de daño con tu herramienta", icon: "sword", apply: () => { this.dmgMult += 0.3; } },
      { id: "hp", title: "CORAZÓN EXTRA", desc: "+25 vida máxima y curación total", icon: "heart", apply: () => { this.maxHp += 25; this.hp = this.maxHp; } },
      { id: "speed", title: "ZAPATILLAS TURBO", desc: "+12% de velocidad de movimiento", icon: "zap", apply: () => { this.speedMult += 0.12; } },
      { id: "turret", title: "TORRETAS PRO", desc: "Torretas +50% de daño y cadencia", icon: "target", apply: () => { this.turretBoost *= 1.5; } },
      { id: "reach", title: "BRAZO LARGO", desc: "+35% de alcance de golpe", icon: "expand", apply: () => { this.reachMult += 0.35; } },
      { id: "armor", title: "UNIFORME ACORAZADO", desc: "-20% de daño recibido", icon: "shield", apply: () => { this.armor *= 0.8; } },
      { id: "magnet", title: "IMÁN DE PROPINAS", desc: "Radio de recogida ×2 y +25% monedas", icon: "magnet", apply: () => { this.magnetMult *= 2; this.coinMult += 0.25; } },
      { id: "dash", title: "BOTAS DE BRUMA", desc: "Dash con 35% menos de espera", icon: "wind", apply: () => { this.dashCdMax *= 0.65; } },
      { id: "med", title: "KIT DE CAMPO", desc: "Botiquines y veladores curan 50% más", icon: "cross", apply: () => { this.medBoost += 0.5; } },
      { id: "trap", title: "PINCHOS MORTALES", desc: "Trampas +50% de daño", icon: "zap", apply: () => { this.trapBoost += 0.5; } },
      { id: "vault", title: "OJO DE TESORERO", desc: "Cofres y rompibles +30% de monedas", icon: "magnet", apply: () => { this.coinMult += 0.3; } },
    ];
    const picked: Upgrade[] = [];
    while (picked.length < 3 && pool.length) {
      picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    this.pendingUpgrades = picked;
    this.cb.onUpgrades(picked.map(({ id, title, desc, icon }) => ({ id, title, desc, icon })));
  }

  private pendingUpgrades: Upgrade[] = [];
  private turretBoost = 1;
  private medBoost = 1;
  private trapBoost = 1;

  chooseUpgrade(id: string): void {
    const up = this.pendingUpgrades.find((u) => u.id === id);
    this.pendingUpgrades = [];
    this.cb.onUpgrades(null);
    if (up) {
      up.apply();
      this.audio.upgrade();
      this.cb.onToast(`MEJORA: ${up.title}`, "ok");
    }
    this.floorIndex++;
    this.buildFloor(this.floorIndex);
    this.startDay();
  }

  restart(): void {
    this.hp = 100;
    this.maxHp = 100;
    this.armor = 1;
    this.dmgMult = 1;
    this.speedMult = 1;
    this.reachMult = 1;
    this.magnetMult = 1;
    this.coinMult = 1;
    this.turretBoost = 1;
    this.medBoost = 1;
    this.trapBoost = 1;
    this.dashCdMax = 1.5;
    this.coins = 0;
    this.keys = 0;
    this.score = 0;
    this.kills = 0;
    this.coinsEarned = 0;
    this.nights = 0;
    this.combo = 0;
    this.floorIndex = 0;
    this.buildMode = null;
    for (const k of Object.keys(this.ghosts) as BuildKind[]) this.ghosts[k].visible = false;
    this.equipTool("escoba", true);
    this.buildFloor(0);
    this.audio.init();
    this.audio.startAmbient();
    this.startDay();
  }

  private endGame(): void {
    this.phase = "over";
    if (this.score > this.best) {
      this.best = this.score;
      localStorage.setItem(BEST_KEY, String(this.best));
    }
    this.audio.lose();
    this.audio.stopAmbient();
    this.cb.onGameOver(this.stats());
    this.pushHud();
  }

  nextFloorFromElevator(): void {
    this.phase = "upgrade";
    this.world.setElevatorGlow(0);
    this.offerUpgrades();
    this.audio.elevator();
    this.pushHud();
  }

  /* --------------------------- enemigos --------------------------- */

  private spawnEnemy(): number {
    const alive = this.enemies.filter((e) => e.alive).length;
    if (alive > 11 + this.floorIndex * 2) return 0;

    let type: EnemyType = "sombra";
    const f = this.floorIndex;
    const roll = Math.random();
    if (roll < 0.2) type = "cucaracha";
    else if (roll < 0.42) type = "maleta";
    else if (roll < 0.56 && f >= 1) type = "altisimo";
    else if (roll < 0.66 && f >= 2) type = "fantasma";
    else if (roll < 0.76 && f >= 1) type = "camarista";
    else if (roll < 0.85 && f >= 2) type = "nino";
    else if (roll < 0.93 && f >= 2) type = "golem";

    const elite = f >= 2 && Math.random() < Math.min(0.22, 0.07 + f * 0.025);
    const pack = type === "cucaracha" ? 3 : 1;

    // emboscada: a veces sale de una habitación sin explorar
    const useAmbush = Math.random() < 0.3;
    const unexplored = this.world.rooms.filter((r) => !r.explored && !r.door.locked);
    const base = useAmbush && unexplored.length > 0
      ? unexplored[Math.floor(Math.random() * unexplored.length)].center.clone()
      : this.world.spawnPoints[Math.floor(Math.random() * this.world.spawnPoints.length)].clone();

    for (let i = 0; i < pack; i++) {
      const spawn = base.clone().add(new THREE.Vector3(rnd(-1.2, 1.2), 0, rnd(-1.2, 1.2)));
      const enemy = new Enemy(type, this.floorIndex, spawn, elite);
      this.scene.add(enemy.group);
      this.enemies.push(enemy);
      this.spawnParticles(spawn, this.theme.accent, 10, 2.5);
    }
    return pack;
  }

  private onEnemyKilled(e: Enemy): void {
    this.kills++;
    this.comboT = 4.5;
    this.combo = Math.min(8, this.combo + 1);
    const mult = 1 + (this.combo - 1) * 0.25;
    const pts = Math.round((e.elite ? 30 : e.type === "gerente" ? 60 : e.type === "golem" ? 25 : 10) * mult);
    this.score += pts;
    this.spawnFloater(e.pos, `+${pts}${this.combo >= 2 ? ` ×${this.combo}` : ""}`, e.elite ? "#f4c542" : "#a8e63c");
    this.spawnParticles(e.pos, this.theme.accent, 12, 3);
    this.audio.enemyDie();
    this.board.emit({ kind: "kill", enemy: e.type, elite: e.elite });
    if (e.type === "gerente") this.board.emit({ kind: "boss" });
    // suelta monedas
    const n = e.type === "gerente" ? 10 : e.elite ? irnd(4, 6) : irnd(1, 3);
    for (let i = 0; i < n; i++) {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.05, 10),
        new THREE.MeshStandardMaterial({ color: "#f4c542", emissive: "#a97f10", emissiveIntensity: 0.6, metalness: 0.8, roughness: 0.25 })
      );
      coin.rotation.x = Math.PI / 2;
      const g = new THREE.Group();
      g.add(coin);
      g.position.set(e.pos.x + rnd(-0.5, 0.5), 0.5, e.pos.z + rnd(-0.5, 0.5));
      this.scene.add(g);
      this.world.loot.push({ kind: "coin", group: g, pos: g.position.clone(), taken: false, value: irnd(2, 5), phase: rnd(0, 6.28) });
    }
    if (e.type === "gerente") {
      this.cb.onToast("GERENTE DERROTADO ✓ botín épico", "ok");
    } else if (e.elite) {
      this.cb.onToast("ÉLITE DORADO derrotado ✓", "ok");
    }
    // rara vez suelta una llave
    if (Math.random() < 0.05 && this.keys < 2) {
      const g = new THREE.Group();
      g.add(makeKeyMesh());
      g.position.set(e.pos.x, 0.6, e.pos.z);
      this.scene.add(g);
      this.world.loot.push({ kind: "key", group: g, pos: g.position.clone(), taken: false, value: 1, phase: rnd(0, 6.28) });
    }
    // ¡los élites y el jefe sueltan herramientas!
    const toolChance = e.type === "gerente" ? 1 : e.elite ? 0.16 : 0;
    if (Math.random() < toolChance) {
      const pool: ToolType[] = ["plumero", "sarten", "bate", "hacha", "varita"];
      this.spawnToolDrop(pool[Math.floor(Math.random() * pool.length)], e.pos);
      this.cb.onToast("La anomalía ha soltado una HERRAMIENTA — recógela", "info");
    }
  }

  /* --------------------------- construcción --------------------------- */

  private updateGhost(): void {
    if (!this.buildMode) return;
    // ray desde la cámara al plano y=0
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const o = this.raycaster.ray.origin;
    const d = this.raycaster.ray.direction;
    if (d.y > -0.05) return;
    const t = -o.y / d.y;
    const x = o.x + d.x * t;
    const z = o.z + d.z * t;
    const gx = Math.round(x * 2) / 2;
    const gz = Math.round(z * 2) / 2;
    this.ghostPos.set(gx, 0, gz);
    const ghost = this.ghosts[this.buildMode];
    ghost.position.copy(this.ghostPos);
    const p = this.playerGroup.position;
    const near = Math.hypot(gx - p.x, gz - p.z) < 6.5;
    const b = this.world.bounds;
    const inside = gx > b.minX + 0.9 && gx < b.maxX - 0.9 && gz > b.minZ + 0.9 && gz < b.maxZ - 0.9;
    const free = !this.overlapsAnything(gx, gz);
    this.ghostValid = near && inside && free;
    const mat = (ghost.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial;
    mat.color.set(this.ghostValid ? "#a8e63c" : "#ff5a4e");
  }

  private overlapsAnything(x: number, z: number): boolean {
    const boxes: AABB[] = [
      ...this.world.colliders,
      ...this.builds.filter((b) => b.alive && b.aabb).map((b) => b.aabb as AABB),
    ];
    const pad = 0.5;
    for (const c of boxes) {
      if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return true;
    }
    for (const d of this.world.rooms) {
      if (!d.door.broken && d.door.open01 < 0.5) {
        const c = d.door.collider;
        if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) return true;
      }
    }
    return false;
  }

  private tryPlaceBuild(): void {
    if (!this.buildMode) return;
    if (!this.ghostValid) {
      this.audio.buildError();
      this.cb.onToast("No puedes construir aquí", "bad");
      return;
    }
    const cost = BUILD_COST[this.buildMode];
    if (this.coins < cost) {
      this.audio.buildError();
      return;
    }
    this.coins -= cost;
    const b = buildStructure(this.buildMode, this.ghostPos.clone(), this.floorIndex);
    this.scene.add(b.group);
    this.builds.push(b);
    this.audio.build();
    this.spawnParticles(this.ghostPos, "#e9b23c", 8, 2);
    this.board.emit({ kind: "build", what: this.buildMode });
    this.cb.onToast(`${BUILD_INFO[this.buildMode].name} construida ✓`, "ok");
    this.selectBuild(null);
    this.pushHud();
  }

  private updateBuilds(dt: number): void {
    for (const b of this.builds) {
      if (!b.alive) continue;
      if (b.kind === "turret" && b.head) {
        b.cd = (b.cd ?? 0) - dt;
        // buscar enemigo más cercano
        let best: Enemy | null = null;
        let bestD = (b.range ?? 9) * Math.sqrt(this.turretBoost);
        for (const e of this.enemies) {
          if (!e.alive || e.state === "emerge") continue;
          const d = Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z);
          if (d < bestD) { bestD = d; best = e; }
        }
        if (best) {
          const yaw = Math.atan2(best.pos.x - b.pos.x, best.pos.z - b.pos.z);
          b.head.rotation.y = damp(b.head.rotation.y, yaw, 10, dt);
          if ((b.cd ?? 0) <= 0) {
            b.cd = 0.55 / this.turretBoost;
            const dir = new THREE.Vector3(best.pos.x - b.pos.x, 0, best.pos.z - b.pos.z).normalize();
            const muzzle = new THREE.Vector3(b.pos.x, 0.72, b.pos.z).addScaledVector(dir, 0.6);
            const pr = makeProjectile(muzzle, dir, Math.round((b.dmg ?? 12) * this.turretBoost));
            this.scene.add(pr.mesh);
            this.projectiles.push(pr);
            this.audio.turret();
          }
        }
      } else if (b.kind === "medkit") {
        b.recharge = Math.max(0, (b.recharge ?? 0) - dt);
        const p = this.playerGroup.position;
        const d = Math.hypot(p.x - b.pos.x, p.z - b.pos.z);
        if (d < 1.25 && (b.recharge ?? 0) <= 0 && this.hp < this.maxHp) {
          b.recharge = 18;
          const heal = Math.round(30 * this.medBoost);
          this.hp = Math.min(this.maxHp, this.hp + heal);
          this.audio.heal();
          this.spawnFloater(this.playerGroup.position, `+${heal} VIDA`, "#7dffa8");
          this.spawnParticles(b.pos, "#7dffa8", 8, 2);
        }
        const glow = 1.1 + (b.recharge ?? 0) > 0 ? 0.3 : 2;
        b.group.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) {
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) {
              const std = mat as THREE.MeshStandardMaterial;
              if (std.emissive && std.emissive.getHex() === 0xff3b30) std.emissiveIntensity = glow;
            }
          }
        });
      } else if (b.kind === "trap") {
        b.cd = Math.max(0, (b.cd ?? 0) - dt);
        if ((b.cd ?? 0) <= 0 && (b.uses ?? 0) > 0) {
          for (const e of this.enemies) {
            if (!e.alive || e.state === "emerge") continue;
            if (Math.hypot(e.pos.x - b.pos.x, e.pos.z - b.pos.z) < 1.0) {
              b.uses = (b.uses ?? 1) - 1;
              b.cd = 0.5;
              const killed = e.takeHit(Math.round((16 + this.floorIndex * 3) * this.trapBoost), b.pos);
              this.audio.trapSnap();
              this.spawnParticles(e.pos, "#ffa02f", 8, 2.2);
              if (killed) this.onEnemyKilled(e);
              break;
            }
          }
        }
        if ((b.uses ?? 0) <= 0) {
          this.destroyBuild(b);
          continue;
        }
      } else if (b.kind === "totem") {
        const orb = b.head as unknown as THREE.Mesh | undefined;
        if (orb) {
          const mat = orb.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 1.9 + Math.sin(performance.now() / 280 + b.pos.x) * 0.55;
        }
        const p = this.playerGroup.position;
        if (Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 3.6 && this.hp < this.maxHp) {
          b.recharge = (b.recharge ?? 0) + dt;
          if ((b.recharge ?? 0) >= 1) {
            b.recharge = 0;
            this.hp = Math.min(this.maxHp, this.hp + Math.round(2 * this.medBoost));
          }
        }
      }
    }
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      pr.mesh.position.addScaledVector(pr.vel, dt);
      let hit = false;
      if (pr.hostile) {
        const p = this.playerGroup.position;
        if (Math.hypot(p.x - pr.mesh.position.x, p.z - pr.mesh.position.z) < 0.55) {
          this.damagePlayer(pr.dmg, pr.mesh.position);
          this.spawnParticles(pr.mesh.position, "#7dffa8", 6, 2);
          hit = true;
        }
      } else {
        for (const e of this.enemies) {
          if (!e.alive) continue;
          if (Math.hypot(e.pos.x - pr.mesh.position.x, e.pos.z - pr.mesh.position.z) < e.stats.radius + 0.15) {
            const killed = e.takeHit(pr.dmg, pr.mesh.position);
            this.spawnParticles(e.pos, "#8dff5e", 4, 2);
            if (killed) this.onEnemyKilled(e);
            hit = true;
            break;
          }
        }
      }
      if (hit || pr.life <= 0) {
        this.scene.remove(pr.mesh);
        pr.mesh.geometry.dispose();
        (pr.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private damageObstacle(o: ObstacleRef, dmg: number): void {
    o.hp -= dmg;
    this.spawnParticles(o.pos, "#c9a24a", 4, 2);
    if (o.hp <= 0) {
      o.alive = false;
      if (o.kind === "door") {
        const room = this.world.rooms.find((r) => r.door === this.doorByRef(o));
        if (room) this.breakDoor(room.door);
      } else {
        const b = this.builds.find((bb) => bb.aabb === o.aabb);
        if (b) this.destroyBuild(b);
      }
    }
  }

  private doorByRef(o: ObstacleRef) {
    return this.world.rooms.map((r) => r.door).find((d) => d.collider === o.aabb);
  }

  private destroyBuild(b: Buildable): void {
    b.alive = false;
    this.scene.remove(b.group);
    disposeBuildable(b);
    this.spawnParticles(b.pos, "#8a6a2f", 12, 2.5);
    this.cb.onToast(`${BUILD_INFO[b.kind].name} destruida ✗`, "bad");
    this.builds = this.builds.filter((x) => x !== b);
  }

  private breakDoor(d: ReturnType<Game["doorByRef"]>): void {
    if (!d || d.broken) return;
    d.broken = true;
    d.target = 1;
    d.open01 = 1;
    this.audio.door();
    this.spawnParticles(new THREE.Vector3(d.panel.position.x, 1, d.panel.position.z), "#5a3a22", 12, 2.5);
  }

  /* --------------------------- interacción --------------------------- */

  private raycaster = new THREE.Raycaster();

  private updateInteract(): void {
    this.prompt = null;
    this.promptAction = null;
    const p = this.playerGroup.position;

    // ascensor
    const dElev = Math.hypot(p.x - this.world.elevatorPos.x, p.z - this.world.elevatorPos.z);
    if (this.phase === "cleared") {
      if (dElev < 1.6) {
        this.prompt = "SUBIR AL SIGUIENTE PISO";
        this.promptAction = () => this.nextFloorFromElevator();
      }
      return;
    }
    if (this.phase !== "day" && this.phase !== "night") return;

    // puertas
    for (const r of this.world.rooms) {
      const d = r.door;
      if (d.broken) continue;
      const dist = Math.hypot(p.x - d.panel.position.x, p.z - d.panel.position.z);
      if (dist < 1.7 && d.open01 < 0.5) {
        if (d.locked) {
          if (this.keys > 0) {
            this.prompt = d.locks > 1 ? `USAR LLAVE · FALTAN ${d.locks} (tienes ${this.keys})` : "USAR LLAVE-TARJETA";
            this.promptAction = () => this.unlockDoor(r.door);
          } else {
            this.prompt = d.locks > 1 ? "BÓVEDA — NECESITA 2 LLAVES" : "CERRADA — busca la llave-tarjeta";
          }
        } else {
          this.prompt = "ABRIR PUERTA";
          this.promptAction = () => { d.target = 1; this.audio.door(); };
        }
        return;
      }
    }

    // cofre
    for (const r of this.world.rooms) {
      if (!r.chest || r.chest.taken) continue;
      const dist = Math.hypot(p.x - r.chest.pos.x, p.z - r.chest.pos.z);
      if (dist < 1.5) {
        this.prompt = "ABRIR COFRE";
        this.promptAction = () => this.openChest(r.chest!);
        return;
      }
    }

    // reparar barricada dañada
    for (const b of this.builds) {
      if (!b.alive || b.hp >= b.maxHp) continue;
      const dist = Math.hypot(p.x - b.pos.x, p.z - b.pos.z);
      if (dist < 1.4 && this.coins >= 10) {
        this.prompt = `REPARAR (${BUILD_INFO[b.kind].name}) · 10 monedas`;
        this.promptAction = () => {
          if (this.coins < 10) return;
          this.coins -= 10;
          b.hp = b.maxHp;
          this.audio.build();
          this.cb.onToast("Estructura reparada ✓", "ok");
        };
        return;
      }
    }
  }

  private unlockDoor(d: DoorInfo): void {
    if (this.keys <= 0 || !d.locked) return;
    this.keys--;
    d.locks = Math.max(0, d.locks - 1);
    this.audio.key();
    if (d.locks === 0) {
      d.locked = false;
      d.target = 1;
      (d.panel.material as THREE.MeshStandardMaterial).color.set("#3a2517");
      d.signMat.map = null;
      d.signMat.needsUpdate = true;
      this.audio.door();
      this.cb.onToast("Puerta desbloqueada ✓", "ok");
    } else {
      this.cb.onToast(`Falta 1 llave más para la BÓVEDA (te quedan ${this.keys})`, "info");
    }
  }

  private openChest(c: LootItem): void {
    if (c.taken) return;
    c.taken = true;
    const value = c.value;
    this.coins += value;
    this.coinsEarned += value;
    this.score += value * 2;
    this.audio.coin();
    this.audio.upgrade();
    this.spawnFloater(c.pos, `+${value} MONEDAS`, "#f4c542");
    this.spawnParticles(c.pos, "#f4c542", 20, 3.4);
    this.board.emit({ kind: "coin", amount: value });
    const room = this.world.rooms.find((r) => r.chest === c);
    if (room?.special === "BÓVEDA") {
      this.board.emit({ kind: "vault" });
      this.score += 250;
      this.cb.onToast("BÓVEDA SAQUEADA ✓ +250 puntos · ¡jackpot!", "ok");
    }
    c.group.visible = false;
    this.pushHud();
  }

  /* --------------------------- jugador --------------------------- */

  private damagePlayer(dmg: number, from: THREE.Vector3): void {
    if (this.iframes > 0 || this.phase === "over") return;
    this.hp -= dmg * this.armor;
    this.iframes = 0.8;
    this.combo = 0;
    const dir = new THREE.Vector3(this.playerGroup.position.x - from.x, 0, this.playerGroup.position.z - from.z).normalize();
    this.knock.copy(dir).multiplyScalar(5);
    this.shakeT = 0.4;
    this.audio.hurt();
    this.cb.onHurt();
    this.spawnFloater(this.playerGroup.position, `-${Math.round(dmg * this.armor)}`, "#ff5a4e");
    if (this.hp <= 0) {
      this.hp = 0;
      this.endGame();
    }
  }

  private updatePlayer(dt: number): void {
    let ix = 0, iz = 0;
    if (this.keysDown.has("w") || this.keysDown.has("arrowup")) iz -= 1;
    if (this.keysDown.has("s") || this.keysDown.has("arrowdown")) iz += 1;
    if (this.keysDown.has("a") || this.keysDown.has("arrowleft")) ix -= 1;
    if (this.keysDown.has("d") || this.keysDown.has("arrowright")) ix += 1;
    ix += this.joy.x;
    iz += this.joy.z;
    const len = Math.hypot(ix, iz);
    const p = this.playerGroup.position;
    const active = this.phase === "day" || this.phase === "night" || this.phase === "cleared";

    if (len > 0.12 && active) {
      const nx = ix / len, nz = iz / len;
      const sin = Math.sin(this.camYaw), cos = Math.cos(this.camYaw);
      const wx = nz * sin + nx * cos;
      const wz = nz * cos - nx * sin;
      let speed = PLAYER_SPEED * this.speedMult;
      if (this.dashing > 0) speed *= 3.2;
      p.x += wx * speed * dt;
      p.z += wz * speed * dt;
      if (this.dashing <= 0) this.facing = Math.atan2(wx, wz);
      if (this.dashing > 0 && Math.random() < 0.5) this.spawnParticles(p, "#cfe8ff", 1, 1);
    }

    // knockback
    p.x += this.knock.x * dt;
    p.z += this.knock.z * dt;
    this.knock.multiplyScalar(Math.max(0, 1 - dt * 8));

    // colisión con muros, puertas cerradas y barricadas
    const r = 0.42;
    const colliders: AABB[] = [
      ...this.world.colliders,
      ...this.builds.filter((b) => b.alive && b.aabb).map((b) => b.aabb as AABB),
    ];
    for (const room of this.world.rooms) {
      if (!room.door.broken && room.door.open01 < 0.5) colliders.push(room.door.collider);
    }
    for (const c of colliders) {
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
      if (p.y <= 0) { p.y = 0; this.vy = 0; this.grounded = true; }
    }

    // dash
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.dashing = Math.max(0, this.dashing - dt);
    this.iframes = Math.max(0, this.iframes - dt);
    this.swingCd = Math.max(0, this.swingCd - dt);

    // animación de golpe
    if (this.swingT > 0) {
      this.swingT = Math.max(0, this.swingT - dt * 5.5);
      const phase = 1 - this.swingT;
      this.weaponPivot.rotation.x = -0.55 - Math.sin(phase * Math.PI) * 1.6;
      this.weaponPivot.rotation.y = 0.14 + Math.sin(phase * Math.PI) * 0.6;
    } else {
      this.weaponPivot.rotation.x = damp(this.weaponPivot.rotation.x, -0.55, 10, dt);
      this.weaponPivot.rotation.y = damp(this.weaponPivot.rotation.y, 0.14, 10, dt);
    }

    // parpadeo con iframes
    this.player.group.visible = this.iframes > 0 ? Math.floor(performance.now() / 80) % 2 === 0 : true;

    this.playerGroup.rotation.y = damp(this.playerGroup.rotation.y, this.facing, 14, dt);
    this.player.update(dt, len > 0.12 && active, Math.min(1, len), !this.grounded);
  }

  /* --------------------------- loot / puertas --------------------------- */

  private updateLoot(dt: number): void {
    const p = this.playerGroup.position;
    const magnetR = 1.7 * this.magnetMult;
    const loot = this.world.loot;
    for (let i = loot.length - 1; i >= 0; i--) {
      const l = loot[i];
      if (l.taken) { loot.splice(i, 1); continue; }
      l.phase += dt;
      l.group.position.y = 0.5 + Math.sin(l.phase * 2.4) * 0.09;
      l.group.rotation.y += dt * 2.2;
      const d = Math.hypot(p.x - l.pos.x, p.z - l.pos.z);
      if (d < magnetR) {
        // imán
        const dir = new THREE.Vector3(p.x - l.pos.x, 0, p.z - l.pos.z).normalize();
        l.group.position.addScaledVector(dir, dt * 5.5);
        l.pos.copy(l.group.position);
      }
      if (d < 0.55) {
        l.taken = true;
        this.scene.remove(l.group);
        if (l.kind === "coin" || l.kind === "gold") {
          const v = Math.round(l.value * this.coinMult);
          this.coins += v;
          this.coinsEarned += v;
          this.score += v * 2;
          this.audio.coin();
          this.spawnFloater(l.pos, `+${v}`, "#f4c542");
          this.spawnParticles(l.pos, "#f4c542", 4, 1.8);
          this.board.emit({ kind: "coin", amount: l.value });
        } else if (l.kind === "medkit") {
          if (this.hp < this.maxHp) {
            const heal = Math.round(l.value * this.medBoost);
            this.hp = Math.min(this.maxHp, this.hp + heal);
            this.audio.heal();
            this.spawnFloater(l.pos, `+${heal} VIDA`, "#7dffa8");
          } else {
            this.coins += 10;
            this.audio.coin();
            this.spawnFloater(l.pos, "+10", "#f4c542");
          }
          this.spawnParticles(l.pos, "#7dffa8", 6, 2);
        } else if (l.kind === "key") {
          this.keys++;
          this.audio.key();
          this.cb.onToast("LLAVE-TARJETA conseguida — abre las puertas cerradas", "ok");
          this.board.emit({ kind: "key" });
        }
        loot.splice(i, 1);
        continue;
      }
    }

    // ---------------- herramientas: equipar al pasar por encima ----------------
    const tryTool = (t: { type: ToolType; pos: THREE.Vector3 }): boolean => {
      const d = Math.hypot(p.x - t.pos.x, p.z - t.pos.z);
      if (d >= 0.95) return false;
      this.spawnParticles(t.pos, TOOLS[t.type].glow, 14, 2.6);
      if (t.type === this.tool) {
        // duplicada: se convierte en monedas
        this.coins += 15;
        this.coinsEarned += 15;
        this.audio.coin();
        this.spawnFloater(t.pos, "+15", "#f4c542");
      } else {
        this.equipTool(t.type);
      }
      return true;
    };
    for (let i = this.world.tools.length - 1; i >= 0; i--) {
      const t = this.world.tools[i];
      if (t.taken) { this.world.tools.splice(i, 1); continue; }
      if (tryTool(t)) { t.taken = true; t.group.visible = false; this.world.tools.splice(i, 1); }
    }
    for (let i = this.toolDrops.length - 1; i >= 0; i--) {
      const t = this.toolDrops[i];
      t.phase += dt;
      t.spinner.rotation.y += dt * 1.4;
      t.spinner.position.y = Math.sin(t.phase * 2.1) * 0.07;
      if (tryTool(t)) {
        this.scene.remove(t.group);
        disposeObject(t.group);
        this.toolDrops.splice(i, 1);
      }
    }

    // puertas y puertas animadas las gestiona world.update
    this.world.update(dt);

    // exploración de habitaciones
    for (const r of this.world.rooms) {
      if (!r.explored && pointInZoneRoom(r, p.x, p.z)) {
        r.explored = true;
        const bonus = r.special ? 150 : 75;
        this.score += bonus;
        this.audio.chimeArrival();
        this.cb.onToast(`${r.special ?? r.name} explorada · +${bonus} puntos`, "info");
        this.board.emit({ kind: "room" });
      }
    }
  }

  /* --------------------------- oleadas --------------------------- */

  private updateNight(dt: number): void {
    if (this.waveGapT > 0) {
      // pausa entre oleadas: no spawn ni chequeo de limpieza
      this.waveGapT -= dt;
      if (this.waveGapT <= 0) this.startWave();
      return;
    }

    if (this.toSpawn > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.toSpawn -= this.spawnEnemy();
        this.spawnTimer = rnd(1.2, 2.2) / (1 + this.floorIndex * 0.05);
      }
      // jefe con esbirros
      if (this.bossWave && this.wave === this.waveTotal - 1 && !this.bossSpawned && this.toSpawn <= 2) {
        this.bossSpawned = true;
        const boss = new Enemy("gerente", this.floorIndex, this.world.elevatorPos.clone());
        this.scene.add(boss.group);
        this.enemies.push(boss);
        for (let i = 0; i < 2; i++) {
          const add = new Enemy("camarista", this.floorIndex, this.world.elevatorPos.clone().add(new THREE.Vector3(i ? 1.6 : -1.6, 0, 1.3)));
          this.scene.add(add.group);
          this.enemies.push(add);
        }
        this.audio.roar();
        this.spawnParticles(boss.pos, "#ff5a4e", 20, 3.5);
      }
    } else if (this.enemies.every((e) => !e.alive)) {
      // oleada limpiada
      if (this.wave + 1 >= this.waveTotal) {
        this.clearFloor();
      } else {
        this.wave++;
        this.waveGapT = 2.2;
        this.cb.onBanner(`OLEADA ${this.wave + 1} / ${this.waveTotal}`, "Respira… vienen más");
      }
    }
  }

  /* --------------------------- efectos --------------------------- */

  private spawnParticles(pos: THREE.Vector3, color: string, n: number, speed: number): void {
    let spawned = 0;
    for (const pt of this.particles) {
      if (pt.life > 0) continue;
      pt.life = rnd(0.35, 0.7);
      pt.mesh.visible = true;
      pt.mesh.position.set(pos.x + rnd(-0.2, 0.2), pos.y + 0.8 + rnd(0, 0.5), pos.z + rnd(-0.2, 0.2));
      (pt.mesh.material as THREE.MeshBasicMaterial).color.set(color);
      (pt.mesh.material as THREE.MeshBasicMaterial).opacity = 1;
      pt.vel.set(rnd(-speed, speed) * 0.6, rnd(speed * 0.5, speed), rnd(-speed, speed) * 0.6);
      if (++spawned >= n) break;
    }
  }

  private updateParticles(dt: number): void {
    for (const pt of this.particles) {
      if (pt.life <= 0) continue;
      pt.life -= dt;
      pt.vel.y -= 9 * dt;
      pt.mesh.position.addScaledVector(pt.vel, dt);
      (pt.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, pt.life * 2);
      pt.mesh.rotation.x += dt * 6;
      pt.mesh.rotation.y += dt * 5;
      if (pt.life <= 0) pt.mesh.visible = false;
    }
  }

  private spawnFloater(pos: THREE.Vector3, text: string, color: string): void {
    const c = document.createElement("canvas");
    c.width = 160; c.height = 64;
    const g = c.getContext("2d")!;
    g.font = "bold 34px 'Space Grotesk', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 6;
    g.strokeStyle = "rgba(6,10,18,0.9)";
    g.strokeText(text, 80, 32);
    g.fillStyle = color;
    g.fillText(text, 80, 32);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sprite.scale.set(1.6, 0.64, 1);
    sprite.position.set(pos.x, pos.y + 2.1, pos.z);
    sprite.renderOrder = 30;
    this.scene.add(sprite);
    this.floaters.push({ sprite, life: 1, vy: 1.6 });
    if (this.floaters.length > 14) {
      const old = this.floaters.shift()!;
      this.scene.remove(old.sprite);
      old.sprite.material.map?.dispose();
      old.sprite.material.dispose();
    }
  }

  private updateFloaters(dt: number): void {
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt;
      f.sprite.position.y += f.vy * dt;
      (f.sprite.material as THREE.SpriteMaterial).opacity = Math.max(0, f.life);
      if (f.life <= 0) {
        this.scene.remove(f.sprite);
        f.sprite.material.map?.dispose();
        f.sprite.material.dispose();
        this.floaters.splice(i, 1);
      }
    }
  }

  /* --------------------------- cámara --------------------------- */

  private updateCamera(dt: number): void {
    const p = this.playerGroup.position;
    const dist = 5.8;
    const height = 2.2 + this.camPitch * 3.6;
    const dirX = Math.sin(this.camYaw);
    const dirZ = Math.cos(this.camYaw);

    let tHit = Number.POSITIVE_INFINITY;
    for (const b of this.world.colliders) {
      const t = this.rayAABB(p.x, p.z, dirX, dirZ, b);
      if (t < tHit) tHit = t;
    }
    const finalDist = Math.max(1.0, Math.min(dist, tHit - 0.35));

    const target = new THREE.Vector3(p.x + dirX * finalDist, p.y + height, p.z + dirZ * finalDist);
    const wb = this.world.bounds;
    target.x = clamp(target.x, wb.minX + 0.8, wb.maxX - 0.8);
    target.z = clamp(target.z, wb.minZ + 0.8, wb.maxZ - 0.8);
    target.y = clamp(target.y, 1.2, 4.5);
    const k = this.phase === "intro" ? 2.2 : 7;
    this.camPos.x = damp(this.camPos.x, target.x, k, dt);
    this.camPos.y = damp(this.camPos.y, target.y, k, dt);
    this.camPos.z = damp(this.camPos.z, target.z, k, dt);
    this.camera.position.copy(this.camPos);

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.26;
      this.camera.position.x += rnd(-s, s);
      this.camera.position.y += rnd(-s, s);
    }

    this.camera.lookAt(p.x, p.y + 1.5, p.z);
  }

  /** distancia (unidades de mundo) hasta el AABB por un rayo 2D, o Infinity si no golpea */
  private rayAABB(ox: number, oz: number, dx: number, dz: number, b: AABB): number {
    let tmin = 0;
    let tmax = Number.POSITIVE_INFINITY;
    if (Math.abs(dx) < 1e-8) {
      if (ox < b.minX || ox > b.maxX) return Number.POSITIVE_INFINITY;
    } else {
      let t1 = (b.minX - ox) / dx;
      let t2 = (b.maxX - ox) / dx;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Number.POSITIVE_INFINITY;
    }
    if (Math.abs(dz) < 1e-8) {
      if (oz < b.minZ || oz > b.maxZ) return Number.POSITIVE_INFINITY;
    } else {
      let t1 = (b.minZ - oz) / dz;
      let t2 = (b.maxZ - oz) / dz;
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Number.POSITIVE_INFINITY;
    }
    return tmin > 0.001 ? tmin : Number.POSITIVE_INFINITY;
  }

  /* --------------------------- bucle --------------------------- */

  private introT = 0;

  private loop = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    // iluminación día/noche
    this.lightK = damp(this.lightK, this.targetLightK, 1.2, dt);
    this.hemi.intensity = 0.92 + this.lightK * 0.7;
    this.moon.intensity = 1.3 + this.lightK * 0.75;
    this.moon.color.setHSL(0.6, 0.5, 0.55 + this.lightK * 0.1);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.near = 20 + this.lightK * 6;
      this.scene.fog.far = 34 + this.lightK * 28;
    }

    if (this.fadeK > 0) this.fadeK = Math.max(0, this.fadeK - dt * 1.4);

    if (this.phase === "intro") {
      this.introT += dt;
      const a = this.introT * 0.12 + Math.PI;
      const r = 7; // órbita dentro del lobby (fuera chocaría con la fachada sur)
      this.camera.position.set(Math.sin(a) * r, 4.0, Math.cos(a) * r);
      this.camera.lookAt(0, 1.4, 0);
      this.camPos.copy(this.camera.position);
      this.player.update(dt, false, 0, false);
    } else if (this.phase === "day" || this.phase === "night" || this.phase === "cleared") {
      if (this.phase === "day") {
        this.phaseT -= dt;
        if (this.phaseT <= 0) this.startNight();
      }
      if (this.phase === "night") this.updateNight(dt);

      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateBuilds(dt);
      this.updateProjectiles(dt);
      this.updateLoot(dt);
      this.updateGhost();
      this.updateInteract();

      // combo
      if (this.comboT > 0) {
        this.comboT -= dt;
        if (this.comboT <= 0) this.combo = 0;
      }
    } else if (this.phase === "over" || this.phase === "paused" || this.phase === "upgrade") {
      this.updateCamera(dt);
      this.player.update(dt, false, 0, false);
    }

    this.updateParticles(dt);
    this.updateFloaters(dt);
    if (this.phase !== "intro") this.updateCamera(dt);

    this.pushHudThrottled(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private updateEnemies(dt: number): void {
    const w: EnemyWorld = {
      playerPos: this.playerGroup.position,
      playerAlive: this.phase !== "over",
      colliders: this.world.colliders,
      zones: this.world.zones,
      obstacles: this.obstacles,
      damagePlayer: (dmg, from) => this.damagePlayer(dmg, from),
      damageObstacle: (o, dmg) => this.damageObstacle(o, dmg),
      spawnEnemyProjectile: (from, dir, dmg) => {
        const pr = makeProjectile(from, dir, dmg, true);
        this.scene.add(pr.mesh);
        this.projectiles.push(pr);
        this.audio.throwSfx();
      },
      fx: (pos, color, n, speed) => this.spawnParticles(pos, color, n, speed),
    };
    // reconstruir obstáculos: puertas cerradas + barricadas
    this.obstacles = [];
    for (const r of this.world.rooms) {
      const d = r.door;
      if (!d.broken && d.open01 < 0.5) {
        this.obstacles.push({
          pos: new THREE.Vector3((d.collider.minX + d.collider.maxX) / 2, 0, (d.collider.minZ + d.collider.maxZ) / 2),
          aabb: d.collider,
          kind: "door",
          hp: d.hp,
          alive: true,
        });
      }
    }
    for (const b of this.builds) {
      if (b.alive && b.aabb) {
        this.obstacles.push({ pos: b.pos, aabb: b.aabb, kind: "barricade", hp: b.hp, alive: true });
      }
    }

    // aura del velador santo: ralentiza enemigos
    const totems = this.builds.filter((b) => b.kind === "totem" && b.alive);
    for (const e of this.enemies) {
      if (!e.alive) { e.slowK = 1; continue; }
      e.slowK = 1;
      for (const t of totems) {
        if (Math.hypot(e.pos.x - t.pos.x, e.pos.z - t.pos.z) < 4.4) {
          e.slowK = 0.55;
          break;
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update(dt, w);
      // sincronizar hp de obstáculos tras ataques
      if (!e.alive && !e.dying) {
        this.scene.remove(e.group);
        e.dispose();
        this.enemies.splice(i, 1);
        continue;
      }
      if (!e.alive && e.group.visible === false) {
        this.scene.remove(e.group);
        e.dispose();
        this.enemies.splice(i, 1);
      }
    }

    // separación entre enemigos
    const arr = this.enemies.filter((e) => e.alive);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b2 = arr[j];
        const dx = b2.pos.x - a.pos.x;
        const dz = b2.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const min = a.stats.radius + b2.stats.radius;
        if (d > 0.001 && d < min) {
          const push = (min - d) / 2;
          const ux = dx / d, uz = dz / d;
          a.pos.x -= ux * push; a.pos.z -= uz * push;
          b2.pos.x += ux * push; b2.pos.z += uz * push;
        }
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
    this.camera.fov = w / h < 0.9 ? 72 : 58; // más ángulo en pantallas verticales
    this.camera.updateProjectionMatrix();
  };

  private onVisibility = (): void => {
    if (document.hidden && (this.phase === "day" || this.phase === "night")) {
      this.phase = "paused";
      this.pushHud();
    }
  };

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
    if (this.world) this.world.dispose();
    for (const e of this.enemies) e.dispose();
    for (const b of this.builds) disposeBuildable(b);
    this.player.dispose();
    this.renderer.dispose();
  }
}

/* helpers locales */

function pointInZoneRoom(r: { zone: { minX: number; maxX: number; minZ: number; maxZ: number } }, x: number, z: number): boolean {
  return x >= r.zone.minX && x <= r.zone.maxX && z >= r.zone.minZ && z <= r.zone.maxZ;
}
