/* ============================================================
   CHATARRA CÓSMICA v2 — motor 3D estilo ROBLOX
   Avatar R6 · cubiertas caminables con salto · jetpack ·
   piratas espaciales · bláster · 5 SECTORES con hipersalto ·
   asteroides minables · studs · tienda · misiones · minimapa
   GameLab by AliceLabs · three.js
   ============================================================ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { Avatar } from "../../game/avatar";
import { STUD } from "../../game/util";
import { rbox } from "../../game/shapes";
import {
  SpaceAudio, TAU, rand, clamp, lerp,
  dotTexture, radialSprite, hullTexture,
} from "./util";

export type ModuleType = "oxygen" | "energy" | "workshop" | "shield" | "hangar" | "antenna";

export const MODULE_INFO: Record<ModuleType, { name: string; cost: number; desc: string }> = {
  oxygen:   { name: "Oxígeno",   cost: 40,  desc: "+radio de recarga de O₂" },
  energy:   { name: "Energía",   cost: 60,  desc: "más velocidad y turbo" },
  workshop: { name: "Taller",    cost: 80,  desc: "autorepara módulos" },
  shield:   { name: "Escudo",    cost: 120, desc: "protege en tormentas" },
  hangar:   { name: "Hangar",    cost: 150, desc: "dron recolector auto" },
  antenna:  { name: "Antena",    cost: 200, desc: "+25% metal entregado" },
};

export type Tool = "magnet" | "blaster" | "wrench";
export const TOOL_INFO: Record<Tool, { name: string; key: string }> = {
  magnet:  { name: "IMÁN",   key: "1" },
  blaster: { name: "BLÁSTER", key: "2" },
  wrench:  { name: "LLAVE",  key: "3" },
};

export type UpgradeId = "magnet" | "boots" | "tank" | "blaster" | "nano" | "drone";
export const UPGRADE_INFO: { id: UpgradeId; name: string; desc: string; max: number; cost: number }[] = [
  { id: "magnet",  name: "Imán V2",        desc: "+4 de alcance del gancho magnético",  max: 3, cost: 80 },
  { id: "boots",   name: "Botas Grav",     desc: "+25% velocidad y salto en cubierta",  max: 2, cost: 60 },
  { id: "tank",    name: "Tanque de O₂",   desc: "+30 de oxígeno máximo",               max: 2, cost: 70 },
  { id: "blaster", name: "Bláster Turbo",  desc: "+8 de daño por láser",                max: 3, cost: 90 },
  { id: "nano",    name: "Nanoreparación", desc: "los módulos se autorreparan solos",   max: 2, cost: 110 },
  { id: "drone",   name: "Dron Supremo",   desc: "el dron recolector va el doble de rápido", max: 1, cost: 130 },
];

export type SectorDef = {
  name: string;
  sub: string;
  fog: number;
  sky: number;
  neb: number[];
  hp: number; dmg: number; spd: number;
  alloy: number;
  goalM: number;      // módulos exigidos
  goalMetal: number;  // metal total exigido
  boss: boolean;
};
export const SECTORS: SectorDef[] = [
  { name: "SECTOR 7",  sub: "Cinturón de Cobre",  fog: 0x05070e, sky: 0x1b2b4a, neb: [0x38e1d4, 0x965aff], hp: 1,    dmg: 1,    spd: 1,    alloy: 0.07, goalM: 2, goalMetal: 0,    boss: false },
  { name: "SECTOR 3",  sub: "Nebulosa Escarlata", fog: 0x1a060a, sky: 0x3d0a12, neb: [0xff4038, 0xff8c2e], hp: 1.45, dmg: 1.3,  spd: 1.12, alloy: 0.08, goalM: 3, goalMetal: 260,  boss: true },
  { name: "SECTOR 11", sub: "Anillo Dorado",      fog: 0x141004, sky: 0x3a2c08, neb: [0xf4c542, 0xff8c2e], hp: 1.95, dmg: 1.55, spd: 1.2,  alloy: 0.16, goalM: 4, goalMetal: 650,  boss: false },
  { name: "SECTOR 0",  sub: "Silentium",          fog: 0x0a0618, sky: 0x150a2e, neb: [0x7a3cff, 0x38e1d4], hp: 2.5,  dmg: 1.85, spd: 1.35, alloy: 0.1,  goalM: 5, goalMetal: 1150, boss: true },
  { name: "SECTOR ∞",  sub: "El Vacío",           fog: 0x020208, sky: 0x050510, neb: [0x552299],           hp: 3.2,  dmg: 2.15, spd: 1.5,  alloy: 0.12, goalM: 99, goalMetal: Infinity, boss: false },
];

type MissionKey = "delivered" | "pirates" | "mined" | "studs" | "storms" | "built" | "bosses" | "sectors";
const MISSION_POOL: { text: string; key: MissionKey; goal: number; reward: number }[] = [
  { text: "Entrega metal en la fundidora", key: "delivered", goal: 120, reward: 40 },
  { text: "Destruye drones piratas",       key: "pirates",   goal: 6,   reward: 45 },
  { text: "Rompe asteroides con la llave", key: "mined",     goal: 2,   reward: 35 },
  { text: "Recoge studs dorados",          key: "studs",     goal: 10,  reward: 30 },
  { text: "Sobrevive tormentas solares",   key: "storms",    goal: 1,   reward: 35 },
  { text: "Construye módulos",             key: "built",     goal: 2,   reward: 50 },
  { text: "Derrota la nave CRUSHER",       key: "bosses",    goal: 1,   reward: 120 },
  { text: "Haz el hipersalto a un sector", key: "sectors",   goal: 1,   reward: 80 },
];

export type SpaceHud = {
  phase: "intro" | "playing";
  paused: boolean;
  o2: number;
  maxO2: number;
  hp: number;
  metal: number;
  totalMetal: number;
  record: number;
  recordSector: number;
  towing: number;
  modules: number;
  storm: "calm" | "warning" | "active";
  stormIn: number;
  prompt: string;
  repairProgress: number;
  hurtFlash: number;
  legend: boolean;
  sector: number;
  sectorName: string;
  sectorSub: string;
  tool: Tool;
  wave: number;
  waveIn: number;
  waveState: "calm" | "warning" | "active";
  pirates: number;
  portal: { ready: boolean; metal: number; goal: number; mods: number; goalM: number };
  boss: { hp: number; max: number } | null;
  missions: { text: string; prog: number; goal: number; reward: number }[];
  upgrades: { name: string; desc: string; level: number; cost: number; maxed: boolean }[];
  walk: boolean;
  minimap: { px: number; pz: number; enemies: number[]; items: number[]; rocks: number[]; portal: [number, number] | null };
};

export type SpaceCallbacks = {
  onHud: (s: SpaceHud) => void;
  onToast: (msg: string, kind?: "ok" | "bad" | "info") => void;
  onBanner: (title: string, sub: string) => void;
};

type DebrisKind = "panel" | "tank" | "sat" | "hull" | "alloy";
type Debris = {
  mesh: THREE.Mesh;
  kind: DebrisKind;
  value: number;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  towed: boolean;
  respawnAt: number;
};
type StationModule = { type: ModuleType; group: THREE.Group; integrity: number; off: boolean };
type P = { vx: number; vy: number; vz: number; life: number; max: number; size: number };

const DEBRIS_STATS: Record<DebrisKind, { value: number; scale: number }> = {
  panel: { value: 8,  scale: 1 },
  tank:  { value: 10, scale: 1 },
  sat:   { value: 15, scale: 1 },
  hull:  { value: 25, scale: 1.2 },
  alloy: { value: 60, scale: 0.9 },
};

type Deck = { x: number; z: number; r: number; y: number };
type Pirate = {
  mesh: THREE.Group;
  hp: number; maxHp: number; dmg: number; speed: number;
  cd: number; bar: THREE.Mesh; elite: boolean; orbit: number; dir: 1 | -1; phase: number;
};
type Bolt = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number; dmg: number; hostile: boolean };
type Asteroid = { mesh: THREE.Mesh; hp: number; spin: THREE.Vector3 };
type Chunk = { mesh: THREE.Mesh; vel: THREE.Vector3; life: number };
type Stud = { mesh: THREE.Mesh; respawnAt: number };
type Mission = { text: string; key: MissionKey; goal: number; reward: number; base: number };

const OUTLINE = 0x15171c;

export class SpaceGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private cb: SpaceCallbacks;
  audio = new SpaceAudio();
  private canvas: HTMLCanvasElement;

  /* estado */
  private raf = 0;
  private paused = true;
  private uiOpen = false;
  private started = false;
  private disposed = false;
  private clock = new THREE.Clock();
  private hudTimer = 0;
  private logCount = 0;

  /* jugador R6 */
  private player = new THREE.Group();
  private avatar: Avatar | null = null;
  private pVel = new THREE.Vector3();
  private pYaw = 0;
  private camYaw = 0;
  private camPitch = -0.12;
  private camDist = 7.5;
  private mode: "walk" | "fly" = "walk";
  private onGround = true;
  private jumpT = -1;
  private o2 = 100;
  private maxO2 = 100;
  private hp = 100;
  private tool: Tool = "magnet";
  private toolMeshes: Record<Tool, THREE.Group | null> = { magnet: null, blaster: null, wrench: null };
  private swingT = 0;
  private shootCd = 0;
  private meleeCd = 0;
  private thrustGlow: THREE.Mesh | null = null;
  private jetGlow: THREE.Mesh | null = null;
  private keys: Record<string, boolean> = {};
  private joy = { x: 0, y: 0 };
  private touchBoost = false;
  private lookBuf = { x: 0, y: 0 };
  private hurtFlash = 0;
  private upLevels: Record<UpgradeId, number> = { magnet: 0, boots: 0, tank: 0, blaster: 0, nano: 0, drone: 0 };

  /* cubiertas caminables */
  private decks: Deck[] = [
    { x: 0, z: 0, r: 13.2, y: -1.02 },   // plataforma principal con studs
    { x: 4.6, z: -3.4, r: 1.15, y: 0.62 }, // caja de salto 1
    { x: 3.1, z: -5.6, r: 1.15, y: 1.42 }, // caja de salto 2
    { x: 0, z: 0, r: 3.35, y: 2.18 },     // cúpula central
  ];

  /* gancho */
  private towed: Debris[] = [];
  private towLines: THREE.Line[] = [];
  private aimTarget: Debris | null = null;

  /* estación */
  private modules: StationModule[] = [];
  private stationCore = new THREE.Group();
  private evolutionRing: THREE.Mesh | null = null;
  private shieldDome: THREE.Mesh | null = null;
  private foundryPos = new THREE.Vector3(0, 0.4, 10.5);
  private metal = 0;
  private totalMetal = 0;
  private record = 0;
  private recordSector = 0;

  /* sector */
  private sector = 0;
  private portal: THREE.Group | null = null;
  private portalRing: THREE.Mesh | null = null;
  private portalLabel: THREE.Sprite | null = null;
  private warpFx = 0;

  /* piratas */
  private pirates: Pirate[] = [];
  private wave = 0;
  private waveState: "calm" | "warning" | "active" = "calm";
  private waveTimer = 40;
  private boss: Pirate | null = null;
  private bossPending = false;

  /* proyectiles */
  private bolts: Bolt[] = [];
  private boltPool: THREE.Mesh[] = [];
  private hostilePool: THREE.Mesh[] = [];

  /* asteroides + chunks + studs */
  private asteroids: Asteroid[] = [];
  private chunks: Chunk[] = [];
  private studs: Stud[] = [];

  /* tormenta */
  private storm: "calm" | "warning" | "active" = "calm";
  private stormTimer = 45;
  private stormLeft = 0;
  private stormFx = 0;
  private boltTimer = 0;
  private fogCalm = new THREE.Color(0x05070e);
  private fogStorm = new THREE.Color("#3a1206");

  /* dron */
  private drone: THREE.Group | null = null;
  private droneState: "idle" | "out" | "home" = "idle";
  private droneTimer = 12;
  private droneTarget: Debris | null = null;

  /* escombros + partículas */
  private debris: Debris[] = [];
  private debrisGeos: Record<string, THREE.BufferGeometry> = {};
  private debrisMats: Record<string, THREE.Material> = {};
  private particles: THREE.Points;
  private pPos: Float32Array;
  private pCol: Float32Array;
  private pool: P[] = [];
  private pHead = 0;
  readonly P_MAX = 90;

  /* misiones */
  private counters: Record<MissionKey, number> = { delivered: 0, pirates: 0, mined: 0, studs: 0, storms: 0, built: 0, bosses: 0, sectors: 0 };
  private missions: Mission[] = [];

  /* misc escena */
  private sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
  private nebulaMats: THREE.SpriteMaterial[] = [];
  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private fwd = new THREE.Vector3();
  private legendShown = false;

  constructor(canvas: HTMLCanvasElement, cb: SpaceCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = false;

    this.camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.scene.fog = new THREE.FogExp2(0x05070e, 0.0016);

    this.ambient = new THREE.AmbientLight(0x8899bb, 0.55);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    this.sun.position.set(180, 240, 280);
    this.scene.add(this.sun);
    const rim = new THREE.HemisphereLight(0x44597f, 0x0a0e16, 0.62);
    this.scene.add(rim);

    for (let i = 0; i < MISSION_POOL.length && this.missions.length < 3; i++) {
      const m = MISSION_POOL[i];
      this.missions.push({ ...m, base: 0 });
    }

    this.buildSky();
    this.buildStation();
    this.buildPortal();
    this.buildDebrisAssets();
    for (let i = 0; i < 26; i++) this.spawnDebris(true);
    this.buildAsteroids();
    this.buildStuds();
    this.buildPlayer();

    /* partículas (Points + pool) */
    this.pPos = new Float32Array(this.P_MAX * 3);
    this.pCol = new Float32Array(this.P_MAX * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(this.pCol, 3));
    for (let i = 0; i < this.P_MAX; i++) {
      this.pool.push({ vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1 });
      this.pPos[i * 3 + 1] = 9999;
    }
    this.particles = new THREE.Points(
      pg,
      new THREE.PointsMaterial({
        size: 0.45, map: dotTexture(), transparent: true, depthWrite: false,
        vertexColors: true, blending: THREE.AdditiveBlending, sizeAttenuation: true,
      })
    );
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    /* líneas de remolque */
    for (let i = 0; i < 2; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x38e1d4, transparent: true, opacity: 0.75 }));
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.towLines.push(line);
    }

    /* pool de proyectiles */
    const boltGeo = new THREE.CapsuleGeometry(0.07, 0.7, 3, 6);
    const myMat = new THREE.MeshBasicMaterial({ color: 0x5affd4 });
    const foeMat = new THREE.MeshBasicMaterial({ color: 0xff5040 });
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(boltGeo, myMat);
      m.visible = false;
      this.scene.add(m);
      this.boltPool.push(m);
    }
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(boltGeo, foeMat);
      m.visible = false;
      this.scene.add(m);
      this.hostilePool.push(m);
    }

    this.record = Number(localStorage.getItem("chatarra_record") || 0);
    this.recordSector = Number(localStorage.getItem("chatarra_sector") || 0);
    this.bindEvents();
  }

  /* ------------------------------ cielo ------------------------------ */
  private buildSky() {
    const starGeo = new THREE.BufferGeometry();
    const n = 1500;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = rand(420, 900);
      const th = rand(0, TAU);
      const ph = Math.acos(rand(-1, 1));
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      size: rand(1.4, 2.2), map: dotTexture(), transparent: true, depthWrite: false,
      color: 0xffffff, sizeAttenuation: true, opacity: 0.9,
    }));
    stars.frustumCulled = false;
    this.scene.add(stars);

    const sunSpr = new THREE.Sprite(new THREE.SpriteMaterial({
      map: radialSprite([[0, "rgba(255,250,230,1)"], [0.25, "rgba(255,225,160,0.9)"], [0.5, "rgba(255,180,80,0.25)"], [1, "rgba(255,160,60,0)"]], 256),
      transparent: true, depthWrite: false,
    }));
    sunSpr.position.copy(this.sun.position).multiplyScalar(2.2);
    sunSpr.scale.setScalar(260);
    this.scene.add(sunSpr);

    const nebs: [string, number][] = [
      ["rgba(56,225,212,0.55)", 520], ["rgba(150,90,255,0.4)", 420], ["rgba(255,160,47,0.35)", 480],
    ];
    nebs.forEach(([col, s], i) => {
      const sm = new THREE.SpriteMaterial({
        map: radialSprite([[0, col], [1, "rgba(0,0,0,0)"]], 256),
        transparent: true, opacity: 0.14, depthWrite: false,
      });
      const sp = new THREE.Sprite(sm);
      sp.position.set(rand(-700, 700), rand(-260, 340), i === 0 ? -800 : rand(-700, 700));
      sp.scale.setScalar(s);
      this.nebulaMats.push(sm);
      this.scene.add(sp);
    });
  }

  /** aplica la paleta del sector actual al cielo/niebla */
  private applySectorTheme() {
    const S = SECTORS[this.sector];
    (this.scene.fog as THREE.FogExp2).color.setHex(S.fog);
    this.fogCalm.setHex(S.fog);
    this.nebulaMats.forEach((m, i) => {
      const nc = new THREE.Color(S.neb[i % S.neb.length]);
      m.color.lerp(nc, 1);
    });
  }

  /* ---------------------------- estación ----------------------------- */
  private studsTexture(): THREE.Texture {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d")!;
    g.fillStyle = "#3b4a63";
    g.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const cx = 32 + x * 64, cy = 32 + y * 64;
        g.fillStyle = "#46587a";
        g.beginPath(); g.arc(cx, cy, 22, 0, TAU); g.fill();
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.beginPath(); g.arc(cx - 5, cy - 6, 9, 0, TAU); g.fill();
        g.fillStyle = "rgba(0,0,0,0.22)";
        g.beginPath(); g.arc(cx + 4, cy + 7, 11, 0, TAU); g.fill();
      }
    }
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    return t;
  }

  private buildStation() {
    const hull = hullTexture();
    const white = new THREE.MeshStandardMaterial({ map: hull, roughness: 0.55, metalness: 0.35 });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x38e1d4, emissive: 0x0e6f68, roughness: 0.4, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x30404f, roughness: 0.6, metalness: 0.5 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xbfefff, emissive: 0x2ec9ff, emissiveIntensity: 0.9, roughness: 0.2 });
    this.stationMats = { white, cyanMat, darkMat, winMat };

    /* PLATAFORMA principal estilo baseplate Roblox con studs */
    const deck = new THREE.Mesh(
      new THREE.CylinderGeometry(13.2, 13.6, 0.5, 48),
      new THREE.MeshStandardMaterial({ map: this.studsTexture(), roughness: 0.7, metalness: 0.15 })
    );
    deck.position.y = -1.28;
    this.stationCore.add(deck);
    const deckEdge = new THREE.Mesh(new THREE.TorusGeometry(13.2, 0.14, 8, 56),
      new THREE.MeshBasicMaterial({ color: 0x38e1d4, transparent: true, opacity: 0.5 }));
    deckEdge.rotation.x = Math.PI / 2;
    deckEdge.position.y = -1.02;
    this.stationCore.add(deckEdge);

    /* cajas de salto estilo obby */
    const crateMats = [0xff8c2e, 0x38e1d4].map((col) =>
      new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.2 })
    );
    const crateAt = (x: number, z: number, top: number, col: number) => {
      const h = top + 1.02;
      const m = new THREE.Mesh(rbox(1.9, h, 1.9, 0.06, 2), crateMats[col]);
      m.position.set(x, top - h / 2, z);
      this.stationCore.add(m);
    };
    crateAt(4.6, -3.4, 0.62, 0);
    crateAt(3.1, -5.6, 1.42, 1);
    /* plataforma cúpula central */
    const top = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.6, 0.4, 28), darkMat);
    top.position.y = 1.98;
    this.stationCore.add(top);

    const core = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(2.2, 3.4, 6, 14), white);
    body.rotation.z = Math.PI / 2;
    core.add(body);
    const ring0 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.42, 10, 28), darkMat);
    ring0.rotation.x = Math.PI / 2;
    core.add(ring0);
    for (let i = 0; i < 6; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.08), winMat);
      const a = (i / 6) * TAU;
      w.position.set(Math.cos(a) * 2.15, 0.9, Math.sin(a) * 2.15);
      w.lookAt(w.position.clone().multiplyScalar(2));
      core.add(w);
    }
    const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 1.6, 8), darkMat);
    capTop.position.y = 3.4;
    core.add(capTop);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), winMat);
    beacon.position.y = 4.3;
    core.add(beacon);
    this.beacon = beacon;
    core.add(new THREE.AmbientLight(0x445566, 0.2));
    this.stationCore.add(core);

    /* anillo de slots */
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.28, 18), darkMat);
      pad.position.set(Math.cos(a) * 7, -0.85, Math.sin(a) * 7);
      this.stationCore.add(pad);
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.05, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0x2a5a66, transparent: true, opacity: 0.8 }));
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.copy(pad.position).setY(-0.68);
      this.stationCore.add(glowRing);
    }

    /* fundidora: anillo verde + horno */
    const foundry = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.4, 1.5, 14, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x51423a, roughness: 0.8, metalness: 0.4, side: THREE.DoubleSide }));
    pot.position.y = 0.75;
    foundry.add(pot);
    const lava = new THREE.Mesh(new THREE.CircleGeometry(1.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xff8c2e, emissive: 0xff6a00, emissiveIntensity: 1.4, roughness: 0.4 }));
    lava.rotation.x = -Math.PI / 2;
    lava.position.y = 1.42;
    foundry.add(lava);
    this.lava = lava;
    const fRing = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.09, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0x66ff9c, transparent: true, opacity: 0.85 }));
    fRing.rotation.x = Math.PI / 2;
    fRing.position.y = 0.12;
    foundry.add(fRing);
    this.fRing = fRing;
    const fLight = new THREE.PointLight(0x66ff9c, 2.2, 9);
    fLight.position.set(0, 1.6, 0);
    foundry.add(fLight);
    foundry.position.set(0, -1.02, 10.5);
    this.stationCore.add(foundry);
    this.foundryPos.set(0, 0.4, 10.5);

    /* escudo (domo, oculto) */
    const dome = new THREE.Mesh(new THREE.SphereGeometry(17, 24, 16), new THREE.MeshPhysicalMaterial({
      color: 0x38e1d4, transparent: true, opacity: 0.12, roughness: 0.1, metalness: 0,
      transmission: 0.4, side: THREE.DoubleSide,
    }));
    dome.visible = false;
    this.stationCore.add(dome);
    this.shieldDome = dome;

    /* anillo de evolución (oculto) */
    const evo = new THREE.Mesh(new THREE.TorusGeometry(10.5, 0.22, 8, 48), cyanMat);
    evo.rotation.x = Math.PI / 2;
    evo.position.y = -0.6;
    evo.visible = false;
    this.stationCore.add(evo);
    this.evolutionRing = evo;

    this.scene.add(this.stationCore);
  }

  /* portal de hipersalto */
  private buildPortal() {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.28, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0x965aff, emissive: 0x5a1ea0, emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.6 }));
    g.add(ring);
    this.portalRing = ring;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.85, 32),
      new THREE.MeshBasicMaterial({ color: 0xb58aff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(disc);
    for (const sx of [-1, 1]) {
      const py = new THREE.Mesh(rbox(0.5, 4.6, 0.5, 0.08, 2),
        new THREE.MeshStandardMaterial({ color: 0x30404f, roughness: 0.5, metalness: 0.5 }));
      py.position.set(sx * 3.7, 2.3, 0);
      g.add(py);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x965aff }));
      lamp.position.set(sx * 3.7, 4.75, 0);
      g.add(lamp);
    }
    const label = this.makeTextSprite("HIPERSALTO [E] — cumple la meta", "#b58aff");
    label.position.set(0, 5.6, 0);
    g.add(label);
    this.portalLabel = label;
    g.position.set(0, 3.1, -15.5);
    this.stationCore.add(g);
    this.portal = g;
  }

  private makeTextSprite(text: string, color = "#ffffff"): THREE.Sprite {
    const c = document.createElement("canvas");
    c.width = 768; c.height = 96;
    const g = c.getContext("2d")!;
    g.font = "bold 36px 'Arial Black', sans-serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.strokeStyle = "rgba(0,0,0,0.9)"; g.lineWidth = 10;
    g.strokeText(text, 384, 50);
    g.fillStyle = color;
    g.fillText(text, 384, 50);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false,
    }));
    sp.scale.set(8.4, 1.05, 1);
    return sp;
  }

  /* ------------------------ assets de chatarra ----------------------- */
  private buildDebrisAssets() {
    const g = this.debrisGeos;
    const m = this.debrisMats;
    g.panel = new THREE.BoxGeometry(2.6, 0.12, 1.7);
    g.tank = new THREE.CapsuleGeometry(0.62, 1.5, 4, 10);
    g.sat = new THREE.BoxGeometry(1.25, 1.05, 1.05);
    g.hull = new THREE.CapsuleGeometry(0.85, 3, 5, 12);
    g.alloy = new RoundedBoxGeometry(1.1, 1.1, 1.1, 3, 0.18);
    m.panel = new THREE.MeshStandardMaterial({ color: 0x2a5c8f, roughness: 0.35, metalness: 0.6 });
    m.tank = new THREE.MeshStandardMaterial({ color: 0xb35c2e, roughness: 0.7, metalness: 0.3 });
    m.sat = new THREE.MeshStandardMaterial({ color: 0x9aa7b2, roughness: 0.5, metalness: 0.55 });
    m.hull = new THREE.MeshStandardMaterial({ map: hullTexture("#cfd8e2", "#8b98a6"), roughness: 0.6, metalness: 0.4 });
    m.alloy = new THREE.MeshStandardMaterial({ color: 0xf4c542, emissive: 0x8a6a10, emissiveIntensity: 0.55, roughness: 0.25, metalness: 0.85 });
    m.pick = new THREE.MeshStandardMaterial({ color: 0x38e1d4, emissive: 0x38e1d4, emissiveIntensity: 0.9, roughness: 0.4 });
  }

  private spawnDebris(initial = false) {
    const kinds: DebrisKind[] = ["panel", "panel", "tank", "tank", "sat", "hull", "panel", "tank"];
    const kind: DebrisKind = Math.random() < SECTORS[this.sector].alloy && !this.debris.some((d) => d.kind === "alloy" && d.respawnAt <= 0)
      ? "alloy" : kinds[Math.floor(rand(0, kinds.length))];
    const mesh = new THREE.Mesh(this.debrisGeos[kind], this.debrisMats[kind]);
    const s = DEBRIS_STATS[kind].scale;
    mesh.scale.setScalar(s);
    const a = rand(0, TAU);
    const r = initial ? rand(25, 70) : rand(40, 80);
    mesh.position.set(Math.cos(a) * r, rand(-14, 14), Math.sin(a) * r);
    mesh.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
    const d: Debris = {
      mesh, kind, value: DEBRIS_STATS[kind].value,
      vel: new THREE.Vector3(rand(-0.25, 0.25), rand(-0.12, 0.12), rand(-0.25, 0.25)),
      spin: new THREE.Vector3(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3)),
      towed: false, respawnAt: 0,
    };
    this.debris.push(d);
    this.scene.add(mesh);
  }

  /* --------------------------- asteroides ---------------------------- */
  private buildAsteroids() {
    for (const a of this.asteroids) this.scene.remove(a.mesh);
    this.asteroids = [];
    const geo = new THREE.IcosahedronGeometry(1.6, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b5d4f, roughness: 0.95, metalness: 0.05, flatShading: true });
    for (let i = 0; i < 7; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      const s = rand(0.9, 1.6);
      mesh.scale.setScalar(s);
      const a = rand(0, TAU);
      const r = rand(30, 62);
      mesh.position.set(Math.cos(a) * r, rand(-8, 12), Math.sin(a) * r);
      mesh.rotation.set(rand(0, TAU), rand(0, TAU), rand(0, TAU));
      this.scene.add(mesh);
      this.asteroids.push({ mesh, hp: 4, spin: new THREE.Vector3(rand(-0.1, 0.1), rand(-0.1, 0.1), rand(-0.1, 0.1)) });
    }
  }

  /* ----------------------------- studs ------------------------------- */
  private buildStuds() {
    for (const s of this.studs) this.scene.remove(s.mesh);
    this.studs = [];
    const geo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 14);
    const mat = new THREE.MeshStandardMaterial({ color: 0xf4c542, emissive: 0x8a6a10, emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.8 });
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = Math.PI / 2;
      this.placeStud(mesh);
      this.scene.add(mesh);
      this.studs.push({ mesh, respawnAt: 0 });
    }
  }

  private placeStud(mesh: THREE.Mesh) {
    const a = rand(0, TAU);
    const r = rand(16, 68);
    mesh.position.set(Math.cos(a) * r, rand(-10, 12), Math.sin(a) * r);
  }

  /* --------------------------- astronauta R6 -------------------------- */
  private buildPlayer() {
    /* avatar R6 clásico: cabeza tambor con cara + contorno negro */
    const avatar = new Avatar({
      skin: "#f5cd30", torso: "#e8eef4", arms: "#ff8c2e", legs: "#3a4756",
      face: "happy", hat: "cap", hatColor: "#e8eef4",
    });
    avatar.group.rotation.y = Math.PI; // el modelo mira +z; el juego avanza hacia -z
    this.avatar = avatar;
    this.player.add(avatar.group);

    /* casco de cristal */
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 18, 14),
      new THREE.MeshPhysicalMaterial({ color: 0xbfefff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, side: THREE.DoubleSide })
    );
    dome.position.y = 1.46;
    this.player.add(dome);

    /* jetpack */
    const pack = new THREE.Mesh(rbox(0.62, 0.78, 0.3, 0.08, 2),
      new THREE.MeshStandardMaterial({ color: 0x38e1d4, roughness: 0.4, metalness: 0.3 }));
    pack.position.set(0, 1.0, 0.3);
    this.player.add(pack);
    const dark = new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.6 });
    for (const sx of [-0.2, 0.2]) {
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.26, 8), dark);
      noz.position.set(sx, 0.56, 0.3);
      this.player.add(noz);
    }
    const glow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.75, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9df3ec, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(0, 0.15, 0.3);
    glow.rotation.x = Math.PI;
    glow.visible = false;
    this.player.add(glow);
    this.thrustGlow = glow;
    const jetGlow = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.9, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9df3ec, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
    jetGlow.position.set(0, -0.1, 0.3);
    jetGlow.rotation.x = Math.PI;
    jetGlow.visible = false;
    this.player.add(jetGlow);
    this.jetGlow = jetGlow;

    /* herramientas (malla en la mano derecha) */
    const mkBlaster = () => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(rbox(0.16, 0.2, 0.42, 0.04, 2),
        new THREE.MeshStandardMaterial({ color: 0x38e1d4, roughness: 0.35, metalness: 0.5 }));
      g.add(body);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), dark);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = -0.3;
      g.add(barrel);
      g.position.set(0.5, 1.05, -0.18);
      return g;
    };
    const mkWrench = () => {
      const g = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.66, 8),
        new THREE.MeshStandardMaterial({ color: 0xb8c4d0, roughness: 0.3, metalness: 0.85 }));
      shaft.rotation.x = Math.PI / 2;
      g.add(shaft);
      const head = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 6, 12, Math.PI * 1.4),
        new THREE.MeshStandardMaterial({ color: 0xb8c4d0, roughness: 0.3, metalness: 0.85 }));
      head.position.z = -0.36;
      g.add(head);
      g.position.set(0.5, 1.0, -0.2);
      g.rotation.x = 0.3;
      return g;
    };
    const mkMagnet = () => {
      const g = new THREE.Group();
      const horseshoe = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 14, Math.PI),
        new THREE.MeshStandardMaterial({ color: 0xff5a4e, roughness: 0.35, metalness: 0.6 }));
      horseshoe.rotation.z = Math.PI;
      g.add(horseshoe);
      for (const sx of [-0.16, 0.16]) {
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xb8c4d0, roughness: 0.25, metalness: 0.9 }));
        tip.position.set(sx, -0.12, 0);
        g.add(tip);
      }
      g.position.set(0.5, 1.02, -0.2);
      return g;
    };
    this.toolMeshes.magnet = mkMagnet();
    this.toolMeshes.blaster = mkBlaster();
    this.toolMeshes.wrench = mkWrench();
    this.setTool("magnet");

    this.player.position.set(2.8, -1.02, 5.8);
    this.scene.add(this.player);
  }

  private setTool(t: Tool) {
    this.tool = t;
    for (const k of Object.keys(this.toolMeshes) as Tool[]) {
      const m = this.toolMeshes[k];
      if (m) m.visible = k === t;
    }
  }

  /** altura de cubierta bajo (x,z) o null si cae al vacío */
  private deckUnder(x: number, z: number, y: number): number | null {
    let best: number | null = null;
    for (const d of this.decks) {
      const dist = Math.hypot(x - d.x, z - d.z);
      if (dist <= d.r && y >= d.y - 0.45) {
        if (best === null || d.y > best) best = d.y;
      }
    }
    return best;
  }

  /* ------------------------------ eventos ----------------------------- */
  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (this.started && !this.paused && !e.repeat) {
      if (e.code === "KeyE") this.pressAction();
      if (e.code === "Digit1") this.setTool("magnet");
      if (e.code === "Digit2") this.setTool("blaster");
      if (e.code === "Digit3") this.setTool("wrench");
    }
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };
  private onMouseDown = () => {
    if (this.started && !this.paused && !this.uiOpen && !this.isCoarse) {
      if (this.tool === "blaster") this.shoot();
      else this.canvas.requestPointerLock?.();
    }
  };
  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === this.canvas) {
      this.camYaw -= e.movementX * 0.0026;
      this.camPitch = clamp(this.camPitch - e.movementY * 0.0022, -1.2, 1.2);
    }
  };
  private onWheel = (e: WheelEvent) => {
    if (document.pointerLockElement === this.canvas || !this.started) return;
    this.camDist = clamp(this.camDist + Math.sign(e.deltaY) * 0.8, 4.5, 13);
  };
  private onResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  };
  private onVis = () => {
    if (document.hidden && this.started && !this.paused && !localStorage.getItem("gamelab_nopause")) {
      this.paused = true;
      document.exitPointerLock?.();
    }
  };
  private onCtxLost = (e: Event) => {
    e.preventDefault();
    this.paused = true;
  };
  private onCtxRestored = () => {
    if (this.started) this.paused = false;
  };
  private isCoarse =
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

  private bindEvents() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("wheel", this.onWheel, { passive: true });
    this.canvas.addEventListener("webglcontextlost", this.onCtxLost, false);
    this.canvas.addEventListener("webglcontextrestored", this.onCtxRestored, false);

    /* anillo de puntería */
    this.aimRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.06, 6, 26),
      new THREE.MeshBasicMaterial({ color: 0x38e1d4, transparent: true, opacity: 0.9 })
    );
    this.aimRing.visible = false;
    this.scene.add(this.aimRing);
  }

  /* ---------------------------- API pública --------------------------- */
  start() {
    if ( this.raf) return;
    this.clock.getDelta();
    this.renderer.setAnimationLoop(this.tick);
  }

  begin() {
    this.started = true;
    this.paused = false;
    this.audio.resume();
    this.cb.onToast("Camina por la plataforma, salta con ESPACIO y vuela con el jetpack", "info");
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) document.exitPointerLock?.();
    else this.clock.getDelta();
  }

  setUiOpen(open: boolean) {
    this.uiOpen = open;
    if (open) document.exitPointerLock?.();
  }

  setJoystick(x: number, y: number) {
    this.joy.x = x;
    this.joy.y = y;
  }

  setLook(dx: number, dy: number) {
    this.lookBuf.x += dx;
    this.lookBuf.y += dy;
  }

  setBoost(b: boolean) {
    this.touchBoost = b;
  }

  setToolPublic(t: Tool) {
    this.setTool(t);
  }

  /** acción de la herramienta activa */
  pressAction() {
    if (!this.started || this.paused || this.uiOpen) return;
    if (this.tool === "magnet") {
      if (this.towed.length > 0 && !this.aimTarget) {
        this.releaseAll();
        return;
      }
      const t = this.aimTarget;
      if (t && !t.towed && this.towed.length < 2) {
        t.towed = true;
        t.vel.set(0, 0, 0);
        this.towed.push(t);
        this.audio.hook();
      } else if (this.towed.length > 0) {
        this.releaseAll();
      }
    } else if (this.tool === "blaster") {
      this.shoot();
    } else {
      this.melee();
    }
  }

  hasModule(type: ModuleType) {
    return this.modules.some((m) => m.type === type && !m.off);
  }

  buildModule(type: ModuleType): boolean {
    if (this.modules.length >= 8) return false;
    const info = MODULE_INFO[type];
    if (this.metal < info.cost) {
      this.cb.onToast(`Faltan ${info.cost - Math.floor(this.metal)} ✦ de metal`, "bad");
      return false;
    }
    const existing = this.modules.filter((m) => m.type === type).length;
    if (existing >= 2 && type !== "oxygen" && type !== "energy") {
      this.cb.onToast("Ya hay 2 de ese módulo", "bad");
      return false;
    }
    this.metal -= info.cost;

    const slot = this.modules.length;
    const a = (slot / 8) * TAU;
    const g = new THREE.Group();
    const mats = {
      body: this.stationMats.white.clone(),
      accent: this.stationMats.cyanMat.clone(),
      dark: this.stationMats.darkMat.clone(),
    };
    g.userData.mats = mats;
    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 10), mats.dark);
    tunnel.rotation.x = Math.PI / 2;
    tunnel.position.z = 3.5;
    g.add(tunnel);

    if (type === "oxygen") {
      const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 1.9, 5, 12), mats.accent);
      tank.position.y = 1.35;
      g.add(tank);
      for (const y of [0.8, 1.9]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.08, 6, 16), mats.dark);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = y;
        g.add(ring);
      }
    } else if (type === "energy") {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 8), mats.dark);
      mast.position.y = 0.7;
      g.add(mast);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x1c4f8f, emissive: 0x113a75, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.5 }));
      panel.position.y = 1.6;
      panel.rotation.z = 0.4;
      g.add(panel);
      g.userData.panel = panel;
    } else if (type === "workshop") {
      const box = new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.5, 1.8, 2, 0.16), mats.body);
      box.position.y = 0.75;
      g.add(box);
      const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.4, 6), mats.accent);
      arm1.position.set(0.7, 1.9, 0.3);
      arm1.rotation.z = -0.7;
      g.add(arm1);
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), mats.accent);
      claw.position.set(1.25, 2.35, 0.3);
      g.add(claw);
    } else if (type === "shield") {
      const emitter = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 8), mats.accent);
      emitter.position.y = 1.1;
      g.add(emitter);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({
        color: 0x9df3ec, emissive: 0x38e1d4, emissiveIntensity: 1.4, roughness: 0.2,
      }));
      orb.position.y = 1.9;
      g.add(orb);
      g.userData.orb = orb;
    } else if (type === "hangar") {
      const box = new THREE.Mesh(new RoundedBoxGeometry(2.8, 1.7, 2.1, 2, 0.18), mats.body);
      box.position.y = 0.85;
      g.add(box);
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1, 0.1), new THREE.MeshStandardMaterial({ color: 0x101c26, roughness: 0.7 }));
      door.position.set(0, 0.6, -1.08);
      g.add(door);
    } else {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 2.2, 8), mats.dark);
      pole.position.y = 1.1;
      g.add(pole);
      const dish = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.5, 14, 1, true),
        new THREE.MeshStandardMaterial({ color: 0xdfe7ef, roughness: 0.4, metalness: 0.3, side: THREE.DoubleSide }));
      dish.position.y = 2.4;
      dish.rotation.x = -0.7;
      g.add(dish);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshStandardMaterial({
        color: 0xff5a4e, emissive: 0xff5a4e, emissiveIntensity: 1.6,
      }));
      tip.position.y = 2.75;
      g.add(tip);
      g.userData.tip = tip;
    }

    g.position.set(Math.cos(a) * 7, -0.7, Math.sin(a) * 7);
    g.lookAt(0, -0.7, 0);
    g.scale.setScalar(0.01);
    g.userData.s = 0;
    this.stationCore.add(g);
    this.modules.push({ type, group: g, integrity: 100, off: false });

    if (type === "hangar") this.makeDrone();
    this.audio.build();
    this.cb.onToast(`${info.name} construido`, "ok");
    this.burst(g.position.clone().setY(1), 0x38e1d4, 14, 3);
    this.counters.built++;

    if (this.modules.length >= 8 && !this.legendShown) {
      this.legendShown = true;
      this.record = Math.max(this.record, Math.floor(this.totalMetal));
      localStorage.setItem("chatarra_record", String(this.record));
      this.cb.onBanner("★ ESTACIÓN LEYENDA ★", "8 módulos operativos · los cazadores de chatarra legendarios");
      this.audio.legend();
    } else if (this.modules.length % 2 === 0 && this.evolutionRing) {
      this.evolutionRing.visible = true;
      this.cb.onToast(`La estación evoluciona · nivel ${Math.ceil(this.modules.length / 2)}`, "ok");
    }
    return true;
  }

  upgradeInfo() {
    return UPGRADE_INFO.map((u) => {
      const level = this.upLevels[u.id];
      const cost = Math.round(u.cost * Math.pow(1.7, level));
      return { name: u.name, desc: u.desc, level, cost, maxed: level >= u.max };
    });
  }

  buyUpgrade(i: number): boolean {
    const u = UPGRADE_INFO[i];
    if (!u) return false;
    const level = this.upLevels[u.id];
    if (level >= u.max) {
      this.cb.onToast("Nivel máximo", "bad");
      return false;
    }
    const cost = Math.round(u.cost * Math.pow(1.7, level));
    if (this.metal < cost) {
      this.cb.onToast(`Faltan ${cost - Math.floor(this.metal)} ✦`, "bad");
      return false;
    }
    this.metal -= cost;
    this.upLevels[u.id] = level + 1;
    if (u.id === "tank") {
      this.maxO2 += 30;
      this.o2 = this.maxO2;
    }
    if (u.id === "drone" && this.drone) this.droneTimer = Math.min(this.droneTimer, 3);
    this.audio.build();
    this.cb.onToast(`${u.name} · nivel ${level + 1}`, "ok");
    return true;
  }

  private makeDrone() {
    if (this.drone) return;
    const d = new THREE.Group();
    const bodyM = new THREE.Mesh(new RoundedBoxGeometry(0.7, 0.4, 0.7, 2, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xf4c542, roughness: 0.4, metalness: 0.5 }));
    d.add(bodyM);
    const rot = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 6, 14),
      new THREE.MeshStandardMaterial({ color: 0x30404f, roughness: 0.5 }));
    rot.position.y = 0.3;
    d.add(rot);
    d.userData.rotor = rot;
    const light = new THREE.PointLight(0xf4c542, 1.4, 6);
    d.add(light);
    d.position.set(0, 1, 0);
    this.stationCore.add(d);
    this.drone = d;
    this.droneState = "idle";
    this.droneTimer = 6;
  }

  /* --------------------------- sistemas ------------------------------- */
  private releaseAll() {
    for (const t of this.towed) t.towed = false;
    this.towed.length = 0;
    for (const l of this.towLines) l.visible = false;
    this.audio.release();
  }

  private burst(pos: THREE.Vector3, color: number, n: number, speed: number) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const p = this.pool[this.pHead];
      const idx = this.pHead;
      this.pHead = (this.pHead + 1) % this.P_MAX;
      p.life = p.max = rand(0.5, 1.1);
      p.vx = rand(-1, 1) * speed;
      p.vy = rand(-0.4, 1) * speed;
      p.vz = rand(-1, 1) * speed;
      this.pPos[idx * 3] = pos.x;
      this.pPos[idx * 3 + 1] = pos.y;
      this.pPos[idx * 3 + 2] = pos.z;
      this.pCol[idx * 3] = c.r;
      this.pCol[idx * 3 + 1] = c.g;
      this.pCol[idx * 3 + 2] = c.b;
    }
  }

  /* ---------------------- jugador: andar / volar ---------------------- */
  private updatePlayer(dt: number) {
    const k = this.keys;
    const boost = k["ShiftLeft"] || k["ShiftRight"] || this.touchBoost;
    let ix = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0) + this.joy.x;
    let iy = (k["KeyW"] ? 1 : 0) - (k["KeyS"] ? 1 : 0) - this.joy.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    const mag = Math.min(1, len);
    const fwd = this.tmpV.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = this.tmpV2.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const boots = 1 + this.upLevels.boots * 0.25;
    const moving = mag > 0.05;

    if (this.mode === "walk") {
      const speed = (boost ? 10.5 : 7) * boots;
      if (moving) {
        this.pVel.x = fwd.x * iy * speed + right.x * ix * speed;
        this.pVel.z = fwd.z * iy * speed + right.z * ix * speed;
      } else {
        this.pVel.x *= Math.exp(-10 * dt);
        this.pVel.z *= Math.exp(-10 * dt);
      }
      /* salto → jetpack si mantienes ESPACIO */
      const deckY = this.deckUnder(this.player.position.x, this.player.position.z, this.player.position.y);
      if (deckY !== null && this.player.position.y <= deckY + 0.05 && this.pVel.y <= 0.01) {
        this.player.position.y = deckY;
        this.pVel.y = 0;
        this.onGround = true;
      } else this.onGround = false;
      if (k["Space"] && this.onGround) {
        this.pVel.y = 8.6 * boots;
        this.jumpT = 0;
        this.onGround = false;
      }
      if (!this.onGround) {
        this.jumpT = this.jumpT < 0 ? 0 : this.jumpT + dt;
        if (k["Space"] && this.jumpT > 0.26 && this.pVel.y < 4) {
          this.mode = "fly";
          this.pVel.y = Math.max(this.pVel.y, 3.5);
        }
        this.pVel.y -= 22 * dt;
      }
      this.player.position.addScaledVector(this.pVel, dt);
      const dy = this.deckUnder(this.player.position.x, this.player.position.z, this.player.position.y);
      if (dy !== null && this.player.position.y < dy && this.pVel.y <= 0) {
        this.player.position.y = dy;
        this.pVel.y = 0;
        this.onGround = true;
        this.jumpT = -1;
      }
      if (this.player.position.y < -14) {
        /* rescate de caída: el jetpack se enciende solo */
        this.mode = "fly";
        this.pVel.set(0, 6, 0);
      }
      if (this.jetGlow) this.jetGlow.visible = false;
      this.thrustGlow && (this.thrustGlow.visible = false);
      this.audio.setThrust(0);
    } else {
      /* vuelo libre con jetpack */
      const up = (k["Space"] ? 1 : 0) - (k["KeyC"] ? 1 : 0) - (this.touchBoost ? 1 : 0) + (this.onGround ? 0 : 0);
      const accel = (boost ? 30 : 17) * (this.hasModule("energy") ? 1.25 : 1);
      this.pVel.addScaledVector(fwd, iy * accel * dt);
      this.pVel.addScaledVector(right, ix * accel * dt);
      this.pVel.y += up * accel * 0.8 * dt;
      this.pVel.multiplyScalar(Math.exp(-1.05 * dt));
      const maxSpeed = (boost ? 22 : 13) * (this.hasModule("energy") ? 1.12 : 1);
      if (this.pVel.length() > maxSpeed) this.pVel.setLength(maxSpeed);
      this.player.position.addScaledVector(this.pVel, dt);
      const dy = this.deckUnder(this.player.position.x, this.player.position.z, this.player.position.y);
      if (dy !== null && this.player.position.y <= dy && this.pVel.y <= 0) {
        this.player.position.y = dy;
        this.pVel.set(0, 0, 0);
        this.mode = "walk";
        this.onGround = true;
        this.jumpT = -1;
        this.audio.droneBlip();
      }
      if (this.jetGlow) {
        this.jetGlow.visible = up > 0;
        this.jetGlow.rotation.z += dt * 4;
      }
      this.thrustGlow && (this.thrustGlow.visible = mag > 0.05 || up !== 0);
      this.audio.setThrust(mag > 0.05 || up !== 0 ? (boost ? 1 : 0.55) : 0);
    }

    /* límites del cinturón */
    const L = Math.hypot(this.player.position.x, this.player.position.z);
    if (L > 110) {
      this.player.position.x *= 110 / L;
      this.player.position.z *= 110 / L;
      this.pVel.x *= -0.25;
      this.pVel.z *= -0.25;
    }
    if (this.player.position.y > 60) { this.player.position.y = 60; this.pVel.y = Math.min(0, this.pVel.y); }
    if (this.player.position.y < -60) this.player.position.y = -60;

    /* oxígeno */
    const rechargeR = this.hasModule("oxygen") ? 22 : 16;
    const nearStation = Math.hypot(this.player.position.x, this.player.position.z) < rechargeR && this.player.position.y < 14;
    if (nearStation) this.o2 = Math.min(this.maxO2, this.o2 + 13 * dt);
    else this.o2 = Math.max(0, this.o2 - (boost ? 2.2 : 1) * dt);
    if (this.o2 <= 0) this.rescue("RESCATE: un dron te pescó del vacío — cuida tu oxígeno");

    /* traje dañado → rescate */
    if (this.hp <= 0) this.rescue("TRAJE ROTO: reparado de emergencia en el hangar — ¡esquiva los láseres!");

    /* animación del avatar R6 */
    const sp = this.mode === "walk" ? Math.hypot(this.pVel.x, this.pVel.z) : this.pVel.length();
    const flying = this.mode === "fly" || (!this.onGround && this.mode === "walk" && this.jumpT > 0.1);
    this.avatar?.update(dt, moving, Math.min(1, sp / 7), flying);
    if (sp > 0.8) {
      const target = Math.atan2(-this.pVel.x, -this.pVel.z);
      let d = target - this.pYaw;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.pYaw += d * Math.min(1, dt * 8);
      this.player.rotation.y = this.pYaw;
    }
    /* swing de herramienta */
    const tm = this.toolMeshes[this.tool];
    if (tm) {
      if (this.swingT > 0) {
        this.swingT = Math.max(0, this.swingT - dt * 3.2);
        tm.rotation.x = -Math.sin((1 - this.swingT) * Math.PI) * 1.5;
      } else tm.rotation.x = Math.sin(this.clock.elapsedTime * 2) * 0.06;
    }
    this.shootCd = Math.max(0, this.shootCd - dt);
    this.meleeCd = Math.max(0, this.meleeCd - dt);
  }

  private rescue(msg: string) {
    this.o2 = this.maxO2;
    this.hp = 100;
    this.releaseAll();
    this.player.position.set(2.8, -1.02, 5.8);
    this.pVel.set(0, 0, 0);
    this.mode = "walk";
    this.hurtFlash = 3;
    const loss = Math.floor(this.metal * 0.12);
    this.metal -= loss;
    this.audio.rescue();
    this.cb.onToast(msg + (loss > 0 ? ` (−${loss} ✦)` : ""), "bad");
  }

  /* -------------------------- armas ----------------------------------- */
  private aimDir(): THREE.Vector3 {
    const cp = Math.cos(this.camPitch);
    return new THREE.Vector3(
      -Math.sin(this.camYaw) * cp,
      Math.sin(-this.camPitch) * 0.9 + 0.08,
      -Math.cos(this.camYaw) * cp
    ).normalize();
  }

  private fireBolt(from: THREE.Vector3, dir: THREE.Vector3, dmg: number, hostile: boolean, speed: number) {
    const pool = hostile ? this.hostilePool : this.boltPool;
    const mesh = pool.find((m) => !m.visible);
    if (!mesh) return;
    mesh.position.copy(from);
    mesh.visible = true;
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.bolts.push({ mesh, vel: dir.clone().multiplyScalar(speed), life: 1.5, dmg, hostile });
  }

  private shoot() {
    if (this.shootCd > 0) return;
    this.shootCd = 0.24;
    this.swingT = 1;
    const dir = this.aimDir();
    const from = this.player.position.clone().add(new THREE.Vector3(0, 1.2, 0)).addScaledVector(dir, 0.8);
    this.fireBolt(from, dir, 16 + this.upLevels.blaster * 8, false, 46);
    this.audio.droneBlip();
  }

  private melee() {
    if (this.meleeCd > 0) return;
    this.meleeCd = 0.5;
    this.swingT = 1;
    const dir = this.aimDir();
    let hitSomething = false;
    /* piratas delante */
    for (const p of this.pirates) {
      const v = this.tmpV.copy(p.mesh.position).sub(this.player.position);
      if (v.length() < 3.6 && v.normalize().dot(dir) > 0.55) {
        this.hitPirate(p, 34);
        hitSomething = true;
      }
    }
    if (this.boss) {
      const v = this.tmpV.copy(this.boss.mesh.position).sub(this.player.position);
      if (v.length() < 4.6 && v.normalize().dot(dir) > 0.5) {
        this.hitPirate(this.boss, 30);
        hitSomething = true;
      }
    }
    /* asteroides */
    for (const a of this.asteroids) {
      const v = this.tmpV2.copy(a.mesh.position).sub(this.player.position);
      if (v.length() < 4 && v.normalize().dot(dir) > 0.4) {
        this.mineAsteroid(a);
        hitSomething = true;
      }
    }
    if (hitSomething) this.audio.hook();
    else this.audio.release();
  }

  /* ---------------------- puntería del imán --------------------------- */
  private updateHook(dt: number) {
    if (this.tool !== "magnet") {
      this.aimRing.visible = false;
      return;
    }
    const camDir = this.tmpV.copy(this.player.position)
      .add(new THREE.Vector3(0, 1.6, 0)).sub(this.camera.position).normalize();
    let best: Debris | null = null;
    let bestD = 18 + this.upLevels.magnet * 4;
    for (const d of this.debris) {
      if (d.respawnAt || d.towed) continue;
      const v = this.tmpV2.copy(d.mesh.position).sub(this.player.position);
      const dist = v.length();
      if (dist > bestD || dist < 1.5) continue;
      v.normalize();
      if (v.dot(camDir) < 0.88) continue;
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    this.aimTarget = best;
    if (best) {
      this.aimRing.visible = true;
      this.aimRing.position.copy(best.mesh.position);
      this.aimRing.lookAt(this.camera.position);
      const s = 1 + Math.sin(this.clock.elapsedTime * 6) * 0.08;
      this.aimRing.scale.setScalar(s);
    } else this.aimRing.visible = false;

    /* física de remolque */
    const back = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    for (let i = 0; i < this.towed.length; i++) {
      const d = this.towed[i];
      const side = i === 0 ? -1.1 : 1.1;
      const anchor = this.tmpV.copy(this.player.position).addScaledVector(back, 2)
        .add(new THREE.Vector3(-back.z, 0, back.x).multiplyScalar(side)).add(new THREE.Vector3(0, -0.4, 0));
      d.vel.addScaledVector(this.tmpV2.copy(anchor).sub(d.mesh.position), 7 * dt);
      d.vel.multiplyScalar(Math.exp(-2.4 * dt));
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin.x * dt * 0.4;
      d.mesh.rotation.y += d.spin.y * dt * 0.4;
      const line = this.towLines[i];
      const arr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
      const pp = this.player.position;
      arr.setXYZ(0, pp.x - back.x * 0.4, pp.y + 1.5, pp.z - back.z * 0.4);
      arr.setXYZ(1, d.mesh.position.x, d.mesh.position.y, d.mesh.position.z);
      arr.needsUpdate = true;
      line.visible = true;
    }

    /* entrega en la fundidora */
    const fp = this.foundryPos;
    if (this.towed.length > 0 && this.player.position.distanceTo(fp) < 4.6) {
      let gain = 0;
      for (const d of this.towed) {
        const g = d.value * (this.hasModule("antenna") ? 1.25 : 1);
        gain += g;
        d.mesh.visible = false;
        d.respawnAt = this.clock.elapsedTime + 8;
        d.towed = false;
      }
      this.towed.length = 0;
      for (const l of this.towLines) l.visible = false;
      this.metal += gain;
      this.totalMetal += gain;
      this.counters.delivered += gain;
      if (this.totalMetal > this.record) this.record = Math.floor(this.totalMetal);
      this.audio.deliver();
      this.cb.onToast(`+${Math.round(gain)} ✦ metal refinado`, "ok");
      this.burst(fp.clone().setY(1.4), 0xf4c542, 16, 3.4);
    }
  }

  /* -------------------------- proyectiles ----------------------------- */
  private updateBolts(dt: number) {
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      let dead = b.life <= 0;
      if (!dead && !b.hostile) {
        /* impactos del jugador */
        for (const p of this.pirates) {
          if (b.mesh.position.distanceTo(p.mesh.position) < 1.35) {
            this.hitPirate(p, b.dmg);
            dead = true;
            break;
          }
        }
        if (!dead && this.boss && b.mesh.position.distanceTo(this.boss.mesh.position) < 2.6) {
          this.hitPirate(this.boss, b.dmg);
          dead = true;
        }
        if (!dead) {
          for (const a of this.asteroids) {
            if (b.mesh.position.distanceTo(a.mesh.position) < a.mesh.scale.x * 1.5) {
              this.mineAsteroid(a);
              dead = true;
              break;
            }
          }
        }
      } else if (!dead && b.hostile) {
        if (b.mesh.position.distanceTo(this.player.position) < 1.05) {
          this.hp -= b.dmg;
          this.hurtFlash = Math.max(this.hurtFlash, 1.6);
          this.lastDmgSfx = this.clock.elapsedTime;
          this.audio.damage();
          dead = true;
        }
      }
      if (dead) {
        b.mesh.visible = false;
        this.bolts.splice(i, 1);
      }
    }
  }

  /* ---------------------------- piratas ------------------------------- */
  private spawnPirate() {
    const S = SECTORS[this.sector];
    const g = new THREE.Group();
    const elite = this.sector >= 2 && Math.random() < 0.15;
    const red = new THREE.MeshStandardMaterial({ color: elite ? 0x8a6a10 : 0x8f1e1e, roughness: 0.45, metalness: 0.35 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x1c2228, roughness: 0.6 });
    const body = new THREE.Mesh(rbox(1.0, 0.62, 1.5, 0.09, 2), red);
    g.add(body);
    const outline = new THREE.Mesh(body.geometry, new THREE.MeshBasicMaterial({ color: OUTLINE, side: THREE.BackSide }));
    outline.scale.setScalar(1.06);
    body.add(outline);
    const visor = new THREE.Mesh(rbox(0.72, 0.3, 0.2, 0.05, 2), darkM);
    visor.position.set(0, 0.08, -0.78);
    g.add(visor);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6),
      new THREE.MeshBasicMaterial({ color: elite ? 0xffd34e : 0xff2418 }));
    eye.position.set(0, 0.08, -0.9);
    g.add(eye);
    for (const sx of [-0.72, 0.72]) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.8, 8), darkM);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(sx, -0.05, -0.2);
      g.add(pod);
    }
    const fin = new THREE.Mesh(rbox(0.12, 0.5, 0.6, 0.04, 2), red);
    fin.position.set(0, 0.5, 0.4);
    g.add(fin);

    /* barra de vida */
    const bar = this.makeBar(elite ? 0xffd34e : 0xff5040);
    bar.position.y = 1.1;
    g.add(bar);

    const a = rand(0, TAU);
    g.position.set(Math.cos(a) * 62, rand(4, 14), Math.sin(a) * 62);
    this.scene.add(g);
    const hp = Math.round((52 + this.wave * 9 + this.sector * 30) * S.hp * (elite ? 1.7 : 1));
    this.pirates.push({
      mesh: g, hp, maxHp: hp,
      dmg: (7 + this.sector * 2.2) * S.dmg,
      speed: (6.5 + this.wave * 0.18) * S.spd,
      cd: rand(1, 2.4), bar, elite,
      orbit: rand(11, 17), dir: Math.random() < 0.5 ? 1 : -1, phase: rand(0, TAU),
    });
  }

  private makeBar(color: number): THREE.Mesh {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 0.15),
      new THREE.MeshBasicMaterial({ color: 0x301010, transparent: true, opacity: 0.8, depthWrite: false })
    );
    const fg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.1),
      new THREE.MeshBasicMaterial({ color, depthWrite: false })
    );
    fg.position.z = 0.001;
    bg.add(fg);
    bg.userData.fg = fg;
    return bg;
  }

  private hitPirate(p: Pirate, dmg: number) {
    p.hp -= dmg;
    (p.bar.userData.fg as THREE.Mesh).userData.hit = 0.15;
    this.burst(p.mesh.position.clone(), 0xff8c2e, 5, 2.2);
    if (p.hp <= 0) this.killPirate(p);
  }

  private killPirate(p: Pirate) {
    const idx = this.pirates.indexOf(p);
    if (idx >= 0) this.pirates.splice(idx, 1);
    this.scene.remove(p.mesh);
    this.counters.pirates++;
    this.burst(p.mesh.position.clone(), 0xff5040, 14, 3.4);
    this.audio.zap();
    /* botín */
    const gain = p.elite ? 26 : 12;
    this.metal += gain;
    this.cb.onToast(p.elite ? `¡Pirata ÉLITE destruido! +${gain} ✦` : `Pirata destruido +${gain} ✦`, "ok");
    if (p === this.boss) {
      this.counters.bosses++;
      this.boss = null;
      this.metal += 140;
      for (let i = 0; i < 3; i++) this.spawnDebris(true);
      this.cb.onBanner("☠ CRUSHER DESTRUIDA", "+140 ✦ · la chatarra premium es tuya");
      this.audio.legend();
    }
  }

  private spawnBoss() {
    const S = SECTORS[this.sector];
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0x6f1212, roughness: 0.4, metalness: 0.5 });
    const darkM = new THREE.MeshStandardMaterial({ color: 0x151b20, roughness: 0.6 });
    const hull = new THREE.Mesh(rbox(3.2, 1.3, 5.6, 0.22, 2), red);
    g.add(hull);
    const bridge = new THREE.Mesh(rbox(1.6, 1.1, 1.8, 0.14, 2), darkM);
    bridge.position.set(0, 1.05, -0.6);
    g.add(bridge);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xff2418 }));
    eye.position.set(0, 0.35, -2.9);
    g.add(eye);
    for (const sx of [-2.1, 2.1]) {
      for (const sz of [-1.4, 1.6]) {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 2.2, 8), darkM);
        pod.rotation.x = Math.PI / 2;
        pod.position.set(sx, -0.2, sz);
        g.add(pod);
      }
    }
    const bar = this.makeBar(0xff2418);
    bar.position.y = 2.4;
    bar.scale.setScalar(2.2);
    g.add(bar);
    const a = rand(0, TAU);
    g.position.set(Math.cos(a) * 55, 8, Math.sin(a) * 55);
    g.scale.setScalar(1.3);
    this.scene.add(g);
    const hp = Math.round(560 * S.hp);
    this.boss = {
      mesh: g, hp, maxHp: hp, dmg: 11 * S.dmg, speed: 4.4 * S.spd,
      cd: 3, bar, elite: false, orbit: 18, dir: 1, phase: 0,
    };
    this.audio.alarm();
    this.cb.onBanner("☠ NAVE PIRATA CRUSHER", "¡Hunde la nave nodriza con el bláster!");
  }

  private updatePirates(dt: number) {
    /* oleadas */
    if (this.waveState === "calm") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.waveState = "warning";
        this.waveTimer = 5;
        this.audio.alarm();
        this.cb.onBanner(`☠ PIRATAS · OLEADA ${this.wave}`, "¡Defiende la estación con el bláster [2]!");
      }
    } else if (this.waveState === "warning") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveState = "active";
        const n = Math.min(8, 2 + this.wave + this.sector);
        for (let i = 0; i < n; i++) if (this.pirates.length < 9) this.spawnPirate();
        this.cb.onToast(`${this.pirates.length} piratas entran al sector`, "bad");
      }
    } else if (this.pirates.length === 0 && !this.boss) {
      this.waveState = "calm";
      this.waveTimer = Math.max(30, 68 - this.wave * 2 - this.sector * 4);
      this.cb.onToast(`Oleada ${this.wave} repelida · +respiro de ${Math.ceil(this.waveTimer)}s`, "ok");
      const bonus = 20 + this.wave * 4 + this.sector * 8;
      this.metal += bonus;
      this.cb.onToast(`+${bonus} ✦ de botín por defender el sector`, "ok");
    }

    /* jefe pendiente por sector */
    if (SECTORS[this.sector].boss && !this.boss && !this.bossPending && this.wave >= 1) {
      this.bossPending = true;
      window.setTimeout(() => {
        if (!this.disposed && this.started && SECTORS[this.sector].boss) this.spawnBoss();
        this.bossPending = false;
      }, 9000);
    }

    for (const p of this.pirates) {
      const mp = p.mesh.position;
      p.phase += dt;
      p.cd -= dt;
      /* orbitar la estación */
      const ang = Math.atan2(mp.z, mp.x) + p.dir * (p.speed / Math.max(6, p.orbit)) * dt;
      const targetR = this.player.position.distanceTo(mp) < 16 ? p.orbit : p.orbit;
      const tgt = this.tmpV.set(Math.cos(ang) * targetR, 4 + Math.sin(p.phase * 0.7) * 2.2, Math.sin(ang) * targetR);
      const v = this.tmpV2.copy(tgt).sub(mp);
      const dist = v.length();
      if (dist > 0.4) mp.addScaledVector(v.normalize(), Math.min(p.speed * dt, dist));
      p.mesh.lookAt(this.player.position.x, mp.y, this.player.position.z);
      /* disparar */
      if (p.cd <= 0 && mp.distanceTo(this.player.position) < 46) {
        p.cd = rand(1.9, 3.1);
        const dir = this.tmpV.copy(this.player.position).add(new THREE.Vector3(0, 1, 0)).sub(mp).normalize();
        this.fireBolt(mp.clone().addScaledVector(dir, 1.1), dir, p.dmg, true, 20 + this.sector * 1.6);
        this.audio.zap();
      }
      /* dañar módulos cercanos */
      if (p.phase % 2 < dt) {
        for (const m of this.modules) {
          if (!m.off && m.group.getWorldPosition(this.tmpV).distanceTo(mp) < 3.2) {
            m.integrity -= 6;
            if (m.integrity <= 0) this.setModuleOff(m, true);
            break;
          }
        }
      }
      /* barra */
      p.bar.quaternion.copy(this.camera.quaternion);
      const fg = p.bar.userData.fg as THREE.Mesh;
      const hit = fg.userData.hit as number | undefined;
      if (hit && hit > 0) { fg.userData.hit = hit - dt; (fg.material as THREE.MeshBasicMaterial).color.setHex(0xffffff); }
      else (fg.material as THREE.MeshBasicMaterial).color.setHex(p.elite ? 0xffd34e : 0xff5040);
      fg.scale.x = Math.max(0.02, p.hp / p.maxHp);
      fg.position.x = -(1 - p.hp / p.maxHp) * 0.55;
    }

    /* jefe */
    const B = this.boss;
    if (B) {
      const mp = B.mesh.position;
      B.phase += dt;
      B.cd -= dt;
      const ang = Math.atan2(mp.z, mp.x) + B.dir * (B.speed / B.orbit) * dt;
      const tgt = this.tmpV.set(Math.cos(ang) * B.orbit, 6.5 + Math.sin(B.phase * 0.5) * 2, Math.sin(ang) * B.orbit);
      const v = this.tmpV2.copy(tgt).sub(mp);
      const dist = v.length();
      if (dist > 0.5) mp.addScaledVector(v.normalize(), Math.min(B.speed * dt, dist));
      B.mesh.lookAt(this.player.position.x, mp.y, this.player.position.z);
      if (B.cd <= 0) {
        B.cd = 2.6;
        const base = this.tmpV.copy(this.player.position).add(new THREE.Vector3(0, 1, 0)).sub(mp).normalize();
        for (const spread of [-0.16, 0, 0.16]) {
          const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
          this.fireBolt(mp.clone().addScaledVector(dir, 2.4), dir, B.dmg, true, 22);
        }
        this.audio.zap();
      }
      B.bar.quaternion.copy(this.camera.quaternion);
      const fg = B.bar.userData.fg as THREE.Mesh;
      fg.scale.x = Math.max(0.02, B.hp / B.maxHp);
      fg.position.x = -(1 - B.hp / B.maxHp) * 0.55;
    }
  }

  private mineAsteroid(a: Asteroid) {
    a.hp--;
    a.mesh.rotation.x += 0.2;
    this.burst(a.mesh.position.clone(), 0xb59a72, 6, 2.4);
    if (a.hp <= 0) {
      const idx = this.asteroids.indexOf(a);
      if (idx >= 0) this.asteroids.splice(idx, 1);
      this.scene.remove(a.mesh);
      this.counters.mined++;
      this.burst(a.mesh.position.clone(), 0xb59a72, 16, 3.6);
      this.audio.zap();
      /* suelta trozos metálicos */
      const chunkGeo = new THREE.OctahedronGeometry(0.34);
      const chunkMat = new THREE.MeshStandardMaterial({ color: 0xd8a04e, emissive: 0x6a4a10, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.8 });
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(chunkGeo, chunkMat);
        m.position.copy(a.mesh.position);
        this.scene.add(m);
        this.chunks.push({ mesh: m, vel: new THREE.Vector3(rand(-3, 3), rand(-1, 3), rand(-3, 3)), life: 40 });
      }
      this.cb.onToast("Asteroide reventado · recoge los trozos de metal", "ok");
    }
  }

  /* --------------------- escombros / chunks / studs ------------------- */
  private updateDebris(dt: number) {
    const t = this.clock.elapsedTime;
    for (const d of this.debris) {
      if (!d.mesh.visible) {
        if (t > d.respawnAt) {
          const a = rand(0, TAU);
          const r = rand(40, 85);
          d.mesh.position.set(Math.cos(a) * r, rand(-14, 14), Math.sin(a) * r);
          d.mesh.visible = true;
          d.respawnAt = 0;
        }
        continue;
      }
      if (!d.towed) {
        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.x += d.spin.x * dt;
        d.mesh.rotation.y += d.spin.y * dt;
        const L = d.mesh.position.length();
        if (L > 92) {
          d.mesh.position.setLength(92);
          d.vel.multiplyScalar(-0.35);
        }
      }
    }
    const pulse = 1.2 + Math.sin(t * 5) * 0.35;
    (this.lava.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    if (this.fRing) this.fRing.rotation.z = t * 0.7;
  }

  private updatePickups(dt: number) {
    const t = this.clock.elapsedTime;
    /* trozos de asteroide */
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const c = this.chunks[i];
      c.life -= dt;
      const v = this.tmpV.copy(this.player.position).sub(c.mesh.position);
      const d = v.length();
      if (d < 5) c.mesh.position.addScaledVector(v.normalize(), Math.min(11 * dt, d));
      else {
        c.mesh.position.addScaledVector(c.vel, dt);
        c.vel.multiplyScalar(0.985);
      }
      c.mesh.rotation.y += dt * 3;
      if (d < 1.5 || c.life <= 0) {
        if (c.life > 0) {
          this.metal += 8;
          this.audio.droneBlip();
          this.burst(c.mesh.position.clone(), 0xd8a04e, 6, 2);
        }
        this.scene.remove(c.mesh);
        this.chunks.splice(i, 1);
      }
    }
    /* studs dorados */
    for (const s of this.studs) {
      if (!s.mesh.visible) {
        if (t > s.respawnAt) {
          this.placeStud(s.mesh);
          s.mesh.visible = true;
        }
        continue;
      }
      s.mesh.rotation.z = t * 2.4;
      const d = s.mesh.position.distanceTo(this.player.position);
      if (d < 5) s.mesh.position.lerp(this.player.position, Math.min(1, dt * 5));
      if (d < 1.5) {
        s.mesh.visible = false;
        s.respawnAt = t + 30;
        this.metal += 5;
        this.counters.studs++;
        this.audio.deliver();
        this.burst(s.mesh.position.clone(), 0xf4c542, 8, 2.4);
      }
    }
    /* asteroides giran */
    for (const a of this.asteroids) {
      a.mesh.rotation.x += a.spin.x * dt;
      a.mesh.rotation.y += a.spin.y * dt;
    }
  }

  /* ---------------------------- módulos ------------------------------- */
  private updateModules(dt: number) {
    const t = this.clock.elapsedTime;
    const nanoRegen = this.upLevels.nano * 1.2;
    for (const m of this.modules) {
      const g = m.group;
      if (g.userData.s < 1) {
        g.userData.s = Math.min(1, g.userData.s + dt * 2);
        const s = g.userData.s;
        g.scale.setScalar(0.01 + (1 - Math.pow(1 - s, 3)) * 0.99);
      }
      if (m.type === "energy" && g.userData.panel) g.userData.panel.rotation.y = Math.sin(t * 0.5) * 0.3;
      if (m.type === "shield" && g.userData.orb) {
        (g.userData.orb.material as THREE.MeshStandardMaterial).emissiveIntensity = m.off ? 0.1 : 1.2 + Math.sin(t * 4) * 0.5;
      }
      if (m.type === "antenna" && g.userData.tip) {
        (g.userData.tip.material as THREE.MeshStandardMaterial).emissiveIntensity = m.off ? 0.1 : (Math.sin(t * 3) > 0 ? 1.6 : 0.15);
      }
      if (!m.off && m.integrity < 100 && nanoRegen > 0) {
        m.integrity = Math.min(100, m.integrity + nanoRegen * dt);
      }
      if (m.off && (this.hasModule("workshop") || nanoRegen > 0)) {
        m.integrity = Math.min(100, m.integrity + (this.hasModule("workshop") ? 5 : 2) * dt);
        if (m.integrity >= 100) this.setModuleOff(m, false);
      }
    }
    /* reparación manual con la LLAVE */
    if (this.keys["KeyE"] && !this.uiOpen && this.tool === "wrench") {
      const near = this.modules.find((m) => m.off && m.group.getWorldPosition(this.tmpV).distanceTo(this.player.position) < 3.6);
      if (near) {
        this.repairProgress += dt / 2;
        this.swingT = Math.max(this.swingT, 0.4);
        if (this.repairProgress >= 1) {
          this.repairProgress = 0;
          near.integrity = 100;
          this.setModuleOff(near, false);
          this.audio.build();
          this.cb.onToast("Módulo reparado", "ok");
        }
      } else this.repairProgress = 0;
    } else this.repairProgress = 0;

    if (this.beacon) {
      (this.beacon.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(t * 2.4) > 0 ? 1.4 : 0.2;
    }
    if (this.evolutionRing?.visible) this.evolutionRing.rotation.z = t * 0.4;
  }

  private setModuleOff(m: StationModule, off: boolean) {
    m.off = off;
    const mats = m.group.userData.mats as { body: THREE.MeshStandardMaterial; accent: THREE.MeshStandardMaterial };
    if (mats) {
      mats.body.color.setHex(off ? 0x5c6066 : 0xffffff);
      mats.accent.color.setHex(off ? 0x4a5258 : 0x38e1d4);
    }
    if (off) this.cb.onToast("Módulo dañado — equípate la LLAVE [3] y mantén E junto a él", "bad");
  }

  /* ----------------------------- dron --------------------------------- */
  private updateDrone(dt: number) {
    const d = this.drone;
    if (!d) return;
    (d.userData.rotor as THREE.Mesh).rotation.y += dt * 12;
    const speed = 7 * (this.upLevels.drone > 0 ? 2 : 1);
    const step = (target: THREE.Vector3) => {
      const v = this.tmpV.copy(target).sub(d.position);
      const dist = v.length();
      if (dist < 1.3) return true;
      d.position.addScaledVector(v.normalize(), Math.min(speed * dt, dist));
      d.position.y += Math.sin(this.clock.elapsedTime * 4) * 0.004;
      return false;
    };
    if (this.droneState === "idle") {
      this.droneTimer -= dt;
      d.position.lerp(this.tmpV.set(0, 1.2, 0), dt * 2);
      if (this.droneTimer <= 0) {
        const target = this.debris
          .filter((x) => x.mesh.visible && !x.towed && (x.kind === "panel" || x.kind === "tank"))
          .sort((a, b) => a.mesh.position.length() - b.mesh.position.length())[0];
        if (target) {
          this.droneTarget = target;
          this.droneState = "out";
        } else this.droneTimer = 4;
      }
    } else if (this.droneState === "out") {
      const tgt = this.droneTarget;
      if (!tgt || !tgt.mesh.visible) {
        this.droneState = "home";
      } else if (step(tgt.mesh.position)) {
        tgt.mesh.visible = false;
        tgt.respawnAt = this.clock.elapsedTime + 10;
        this.droneState = "home";
      }
    } else if (step(this.foundryPos)) {
      const gain = 8 * (this.hasModule("antenna") ? 1.25 : 1);
      this.metal += gain;
      this.totalMetal += gain;
      this.counters.delivered += gain;
      if (this.totalMetal > this.record) this.record = Math.floor(this.totalMetal);
      this.audio.droneBlip();
      this.burst(this.foundryPos.clone().setY(1.4), 0xf4c542, 8, 2.4);
      this.droneState = "idle";
      this.droneTimer = 18;
    }
  }

  /* ---------------------------- tormenta ------------------------------ */
  private updateStorm(dt: number) {
    const t = this.clock.elapsedTime;
    if (this.storm === "calm") {
      this.stormTimer -= dt;
      this.stormFx = Math.max(0, this.stormFx - dt * 0.6);
      if (this.stormTimer <= 0) {
        this.storm = "warning";
        this.stormLeft = 10;
        this.audio.alarm();
        this.cb.onBanner("⚠ TORMENTA SOLAR EN 10 s", "¡Refúgiate en el radio de la estación!");
      }
    } else if (this.storm === "warning") {
      this.stormLeft -= dt;
      this.stormFx = Math.min(0.4, this.stormFx + dt * 0.1);
      if (this.stormLeft <= 0) {
        this.storm = "active";
        this.stormLeft = 12;
        this.moduleHitTimer = 2.2;
        this.audio.zap();
        this.cb.onBanner("☀ TORMENTA SOLAR", this.hasModule("shield") ? "El escudo protege la estación" : "¡Cuidado con los módulos!");
      }
    } else {
      this.stormLeft -= dt;
      this.stormFx = Math.min(1, this.stormFx + dt * 0.5);
      this.boltTimer -= dt;
      if (this.boltTimer <= 0) {
        this.boltTimer = rand(0.5, 1.4);
        this.flash = 1;
        if (Math.random() < 0.6) this.audio.zap();
      }
      const dist = Math.hypot(this.player.position.x, this.player.position.z);
      if (dist > 16 || this.player.position.y > 15) {
        this.o2 = Math.max(0, this.o2 - 11 * dt);
        this.hurtFlash = Math.max(this.hurtFlash, 1.4);
        if (t - this.lastDmgSfx > 0.9) {
          this.lastDmgSfx = t;
          this.audio.damage();
        }
      }
      this.moduleHitTimer -= dt;
      if (this.moduleHitTimer <= 0 && !this.hasModule("shield")) {
        this.moduleHitTimer = 2.6;
        const act = this.modules.filter((m) => !m.off);
        if (act.length > 0) {
          const m = act[Math.floor(rand(0, act.length))];
          m.integrity -= 20;
          if (m.integrity <= 0) this.setModuleOff(m, true);
        }
      }
      if (this.stormLeft <= 0) {
        this.storm = "calm";
        this.stormTimer = rand(65, 90);
        this.counters.storms++;
        this.cb.onToast("La tormenta pasó", "info");
      }
    }

    /* ambiente tormenta */
    this.flash *= Math.exp(-7 * dt);
    this.ambient.intensity = 0.55 + this.flash * 2 + this.stormFx * 0.25;
    this.ambient.color.setHex(this.stormFx > 0.02 ? 0xff9a5c : 0x8899bb).lerp(new THREE.Color(0x8899bb), 1 - this.stormFx);
    this.sun.intensity = lerp(1.6, 0.75, this.stormFx);
    (this.scene.fog as THREE.FogExp2).color.copy(this.fogCalm).lerp(this.fogStorm, this.stormFx);
    if (this.shieldDome) {
      const on = this.hasModule("shield") && this.storm !== "calm";
      this.shieldDome.visible = on;
      if (on) {
        const mat = this.shieldDome.material as THREE.MeshPhysicalMaterial;
        mat.opacity = 0.1 + Math.sin(t * 6) * 0.05 + this.flash * 0.08;
      }
    }
  }

  /* ----------------------- sectores / portal -------------------------- */
  private portalReady(): boolean {
    const S = SECTORS[this.sector];
    if (this.sector >= SECTORS.length - 1) return false;
    return this.modules.length >= S.goalM && this.totalMetal >= S.goalMetal;
  }

  private updatePortal(dt: number) {
    if (!this.portal || !this.portalRing) return;
    const ready = this.portalReady();
    const t = this.clock.elapsedTime;
    const mat = this.portalRing.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = ready ? 1.2 + Math.sin(t * 5) * 0.5 : 0.35;
    this.portal.rotation.z = t * (ready ? 0.8 : 0.15);
    if (this.portalLabel) {
      const m = this.portalLabel.material as THREE.SpriteMaterial;
      m.opacity = ready ? 0.95 : 0.35;
    }
    /* activar hipersalto */
    if (ready && this.player.position.distanceTo(this.portal.getWorldPosition(this.tmpV)) < 4.6) {
      this.warpFx += dt;
      if (this.warpFx > 0.4) this.warpSector();
    } else this.warpFx = Math.max(0, this.warpFx - dt);
  }

  private warpSector() {
    this.warpFx = 0;
    this.sector++;
    this.counters.sectors++;
    this.recordSector = Math.max(this.recordSector, this.sector);
    localStorage.setItem("chatarra_sector", String(this.recordSector));
    const S = SECTORS[this.sector];
    this.applySectorTheme();
    /* renovar el campo de escombros */
    for (const d of this.debris) {
      if (d.towed) continue;
      const a = rand(0, TAU);
      const r = rand(28, 80);
      d.mesh.position.set(Math.cos(a) * r, rand(-14, 14), Math.sin(a) * r);
      d.mesh.visible = true;
      d.respawnAt = 0;
    }
    this.buildAsteroids();
    this.buildStuds();
    /* limpiar piratas y calmar oleadas */
    for (const p of this.pirates) this.scene.remove(p.mesh);
    this.pirates = [];
    if (this.boss) { this.scene.remove(this.boss.mesh); this.boss = null; }
    this.wave = 0;
    this.waveState = "calm";
    this.waveTimer = 34;
    this.storm = "calm";
    this.stormTimer = rand(60, 85);
    this.releaseAll();
    this.player.position.set(2.8, -1.02, 5.8);
    this.pVel.set(0, 0, 0);
    this.mode = "walk";
    this.burst(this.player.position.clone().setY(2), 0xb58aff, 30, 6);
    this.audio.legend();
    this.cb.onBanner(`⚡ HIPERSALTO · ${S.name}`, `${S.sub} — piratas más fieros y chatarra mejor pagada`);
  }

  /* ---------------------------- misiones ------------------------------ */
  private nextMission(slot: number) {
    const used = this.missions.map((m) => m.text);
    const candidate = MISSION_POOL.find((m) => !used.includes(m.text));
    if (candidate) this.missions[slot] = { ...candidate, base: this.counters[candidate.key] };
    else this.missions.splice(slot, 1);
  }

  private updateMissions() {
    for (let i = this.missions.length - 1; i >= 0; i--) {
      const m = this.missions[i];
      if (this.counters[m.key] - m.base >= m.goal) {
        this.metal += m.reward;
        this.cb.onToast(`✔ MISIÓN: ${m.text} · +${m.reward} ✦`, "ok");
        this.audio.legend();
        this.nextMission(i);
      }
    }
  }

  /* --------------------------- partículas ----------------------------- */
  private updateParticles(dt: number) {
    for (let i = 0; i < this.P_MAX; i++) {
      const p = this.pool[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.pPos[i * 3 + 1] = 9999;
        continue;
      }
      this.pPos[i * 3] += p.vx * dt;
      this.pPos[i * 3 + 1] += p.vy * dt;
      this.pPos[i * 3 + 2] += p.vz * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.vz *= 0.985;
    }
    (this.particles.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.particles.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }

  /* ----------------------------- cámara ------------------------------- */
  private updateCamera(dt: number) {
    this.camYaw -= this.lookBuf.x * 0.005;
    this.camPitch = clamp(this.camPitch - this.lookBuf.y * 0.004, -1.2, 1.2);
    this.lookBuf.x = 0;
    this.lookBuf.y = 0;
    const cp = Math.cos(this.camPitch);
    const dist = this.mode === "walk" ? Math.min(this.camDist, 8.5) : this.camDist;
    this.tmpV.set(
      Math.sin(this.camYaw) * cp,
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * cp
    ).multiplyScalar(dist);
    this.camera.position.copy(this.player.position).add(this.tmpV).add(new THREE.Vector3(0, 1.4, 0));
    /* la cámara no baja de la cubierta */
    const dy = this.deckUnder(this.camera.position.x, this.camera.position.z, this.camera.position.y);
    if (dy !== null && this.camera.position.y < dy + 0.5) this.camera.position.y = dy + 0.5;
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1.5, this.player.position.z);
  }

  private updateIntroCam(dt: number) {
    const t = this.clock.elapsedTime * 0.12;
    this.camera.position.set(Math.cos(t) * 19, 4.5 + Math.sin(t * 0.7) * 2, Math.sin(t) * 19);
    this.camera.lookAt(0, 0.5, 0);
  }

  /* ------------------------------ prompt ------------------------------ */
  private buildPrompt(): string {
    if (!this.started) return "";
    const S = SECTORS[this.sector];
    if (this.portalReady() && this.portal &&
        this.player.position.distanceTo(this.portal.getWorldPosition(this.tmpV)) < 4.6) {
      return `⚡ HIPERSALTO A ${SECTORS[this.sector + 1].name}…`;
    }
    if (this.portalReady()) return `⚡ PORTAL ACTIVO — vuela al anillo morado para saltar de sector`;
    if (this.storm === "active" && Math.hypot(this.player.position.x, this.player.position.z) > 16) return "¡VUELVE A LA ESTACIÓN! El calor drena tu oxígeno";
    if (this.repairProgress > 0) return `REPARANDO ${Math.floor(this.repairProgress * 100)}%`;
    const nearOff = this.modules.find((m) => m.off && m.group.getWorldPosition(this.tmpV).distanceTo(this.player.position) < 3.6);
    if (nearOff && this.tool === "wrench") return "MANTÉN [E] — REPARAR MÓDULO";
    if (nearOff) return "Equipa la LLAVE [3] para reparar este módulo";
    if (this.tool === "magnet") {
      if (this.aimTarget && this.towed.length < 2) return "[E] — ENGANCHAR CHATARRA";
      if (this.towed.length > 0) return "Lleva la chatarra al anillo VERDE de la fundidora · [E] soltar";
    }
    if (this.tool === "blaster") return "CLIC / [E] — disparar láser";
    if (this.tool === "wrench") return "CLIC / [E] — golpear piratas y picar asteroides";
    if (this.modules.length < S.goalM) return `Meta del sector: ${this.modules.length}/${S.goalM} módulos`;
    return "";
  }

  private emitHud() {
    const S = SECTORS[this.sector];
    this.cb.onHud({
      phase: this.started ? "playing" : "intro",
      paused: this.paused,
      o2: Math.round(this.o2),
      maxO2: this.maxO2,
      hp: Math.max(0, Math.round(this.hp)),
      metal: Math.floor(this.metal),
      totalMetal: Math.floor(this.totalMetal),
      record: this.record,
      recordSector: this.recordSector,
      towing: this.towed.length,
      modules: this.modules.filter((m) => !m.off).length,
      storm: this.storm,
      stormIn: Math.max(0, Math.ceil(this.storm === "calm" ? this.stormTimer : this.stormLeft)),
      prompt: this.buildPrompt(),
      repairProgress: this.repairProgress,
      hurtFlash: this.hurtFlash,
      legend: this.legendShown,
      sector: this.sector,
      sectorName: S.name,
      sectorSub: S.sub,
      tool: this.tool,
      wave: this.wave,
      waveIn: Math.max(0, Math.ceil(this.waveState === "calm" ? this.waveTimer : this.waveTimer)),
      waveState: this.waveState,
      pirates: this.pirates.length + (this.boss ? 1 : 0),
      portal: {
        ready: this.portalReady(),
        metal: Math.floor(this.totalMetal),
        goal: S.goalMetal,
        mods: this.modules.length,
        goalM: S.goalM,
      },
      boss: this.boss ? { hp: Math.max(0, Math.round(this.boss.hp)), max: this.boss.maxHp } : null,
      missions: this.missions.map((m) => ({
        text: m.text, prog: Math.min(m.goal, Math.floor(this.counters[m.key] - m.base)), goal: m.goal, reward: m.reward,
      })),
      upgrades: this.upgradeInfo(),
      walk: this.mode === "walk",
      minimap: {
        px: this.player.position.x,
        pz: this.player.position.z,
        enemies: this.pirates.flatMap((p) => [p.mesh.position.x, p.mesh.position.z]),
        items: this.studs.filter((s) => s.mesh.visible).flatMap((s) => [s.mesh.position.x, s.mesh.position.z]),
        rocks: this.asteroids.flatMap((a) => [a.mesh.position.x, a.mesh.position.z]),
        portal: this.sector < SECTORS.length - 1 ? [-15.5, 0] : null,
      },
    });
  }

  /* campos creados en buildStation / loop */
  private stationMats!: {
    white: THREE.MeshStandardMaterial;
    cyanMat: THREE.MeshStandardMaterial;
    darkMat: THREE.MeshStandardMaterial;
    winMat: THREE.MeshStandardMaterial;
  };
  private beacon!: THREE.Mesh;
  private lava!: THREE.Mesh;
  private fRing!: THREE.Mesh;
  private aimRing!: THREE.Mesh;

  private errorShown = false;
  private flash = 0;
  private moduleHitTimer = 0;
  private lastDmgSfx = 0;
  private repairProgress = 0;

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    try {
      if (this.started && !this.paused) {
        this.updatePlayer(dt);
        this.updateHook(dt);
        this.updateBolts(dt);
        this.updatePirates(dt);
        this.updateDebris(dt);
        this.updatePickups(dt);
        this.updateModules(dt);
        this.updateDrone(dt);
        this.updateStorm(dt);
        this.updatePortal(dt);
        this.updateMissions();
        this.updateCamera(dt);
        this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2);
      } else {
        this.audio.setThrust(0);
        if (!this.started) this.updateIntroCam(dt);
        this.updateDebris(dt);
      }
      this.updateParticles(dt);
      this.hudTimer -= dt;
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.1;
        this.emitHud();
      }
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      if (this.logCount < 5) {
        this.logCount++;
        console.error("[SpaceGame] error en el bucle:", err);
      }
      if (!this.errorShown) {
        this.errorShown = true;
        this.paused = true;
        this.cb.onBanner("ERROR DEL MOTOR", "El juego se pausó para proteger la partida. Recarga la página.");
      }
    }
  };

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("wheel", this.onWheel);
    this.canvas.removeEventListener("webglcontextlost", this.onCtxLost);
    this.canvas.removeEventListener("webglcontextrestored", this.onCtxRestored);
    localStorage.setItem("chatarra_record", String(this.record));
    localStorage.setItem("chatarra_sector", String(this.recordSector));
    this.avatar?.dispose();
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
  }
}
