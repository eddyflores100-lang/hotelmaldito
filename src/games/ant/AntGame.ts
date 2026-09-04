/* ============================================================
   HORMIGUERO: GUERRA DEL JARDÍN — motor 3D (colonias · jardín macro)
   GameLab by AliceLabs · three.js
   ============================================================ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { AntAudio, TAU, rand, clamp, lerp, soilTexture, moundTexture, skyTexture, labelSprite, dotTexture } from "./util";

export type ChamberKind = "criadero" | "granero" | "hongo" | "real";
export const CHAMBER_INFO: Record<ChamberKind, { name: string; cost: number; desc: string }> = {
  criadero: { name: "CRIADERO", cost: 30, desc: "permite criar obreras" },
  granero: { name: "GRANERO", cost: 30, desc: "+25% comida al depositar" },
  hongo: { name: "HUERTO DE HONGOS", cost: 45, desc: "siembra: +1 🍃 cada 8 s" },
  real: { name: "SALA REAL", cost: 60, desc: "Reina +50 HP y se cura" },
};

export type AntHud = {
  phase: "intro" | "playing";
  paused: boolean;
  hp: number;
  maxHp: number;
  food: number;
  carry: number;
  workers: number;
  soldiers: number;
  queenHp: number;
  queenMax: number;
  wave: number;
  waveIn: number;
  waveState: "calm" | "warning" | "active";
  rainIn: number;
  rain: "none" | "warning" | "active";
  digProgress: number;
  prompt: string;
  missions: { text: string; prog: number; goal: number; reward: number }[];
  upgrades: { name: string; desc: string; level: number; cost: number; maxed: boolean }[];
  chambers: { name: string; desc: string; built: boolean; cost: number }[];
  legend: boolean;
  over: boolean;
  stats: { wave: number; food: number; kills: number };
  minimap: { px: number; pz: number; items: number[]; enemies: number[] };
};

export type AntCallbacks = {
  onHud: (s: AntHud) => void;
  onToast: (msg: string, kind?: "ok" | "bad" | "info") => void;
  onBanner: (title: string, sub: string) => void;
};

type ItemKind = "crumb" | "dew" | "seed";
type Item = { mesh: THREE.Object3D; kind: ItemKind; taken: boolean; respawnAt: number };
type Aphid = { mesh: THREE.Mesh; ready: boolean; timer: number };
type EnemyKind = "ant" | "wasp" | "spider";
type Enemy = {
  mesh: THREE.Group;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  dmg: number;
  speed: number;
  cd: number;
  alive: boolean;
  bar: THREE.Mesh;
  phase: number;
  target: "mound" | "player" | "steal" | "flee";
};
type P = { vx: number; vy: number; vz: number; life: number };

const ITEM_VALUE: Record<ItemKind, number> = { crumb: 5, dew: 8, seed: 10 };
const MAP_R = 40;

export class AntGame {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private cb: AntCallbacks;
  audio = new AntAudio();
  private canvas: HTMLCanvasElement;
  private isCoarse =
    typeof window !== "undefined" &&
    (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

  private clock = new THREE.Clock();
  private hudTimer = 0;
  private logCount = 0;
  private errorShown = false;
  private disposed = false;
  private raf = 0;
  private started = false;
  private paused = true;

  /* jugador */
  private player = new THREE.Group();
  private pVel = new THREE.Vector3();
  private pYaw = Math.PI;
  private camYaw = Math.PI;
  private camPitch = 0.32;
  private camDist = 9;
  private keys: Record<string, boolean> = {};
  private joy = { x: 0, y: 0 };
  private touchSprint = false;
  private holdAction = false;
  private lookBuf = { x: 0, y: 0 };
  private hp = 100;
  private maxHp = 100;
  private lastHurt = -10;
  private biteT = 0;
  private legs: THREE.Object3D[] = [];
  private mandibles: THREE.Object3D[] = [];
  private carryMeshes: THREE.Group[] = [];

  /* colonia */
  private food = 20;
  private queenMax = 100;
  private queenHp = 100;
  private workers: { mesh: THREE.Group; state: "seek" | "return" | "flee"; item: Item | null; legs: THREE.Object3D[] }[] = [];
  private soldiers: { mesh: THREE.Group; legs: THREE.Object3D[]; cd: number }[] = [];
  private carry: { kind: ItemKind | "honey"; value: number }[] = [];
  private chambers: Map<ChamberKind, { x: number; z: number; built: boolean; group: THREE.Group | null; ring: THREE.Mesh; seeded: boolean }> = new Map();
  private digProgress = 0;
  private digTarget: ChamberKind | "afido" | null = null;
  private mushTimer = 0;
  private upLevels = [0, 0, 0];

  /* oleadas */
  private wave = 0;
  private wavesSurvived = 0;
  private waveState: "calm" | "warning" | "active" = "calm";
  private waveTimer = 50;
  private enemies: Enemy[] = [];
  private kills = 0;

  /* lluvia */
  private rain: "none" | "warning" | "active" = "none";
  private rainTimer = 95;
  private rainLeft = 0;
  private drops: { mesh: THREE.Mesh; ring: THREE.Mesh; target: THREE.Vector3; warn: number; falling: boolean }[] = [];

  /* misiones */
  private counters = { deposited: 0, chambers: 0, kills: 0, milked: 0, bred: 0, waves: 0 };
  private missionIdx = [0, 1, 2];
  private missionPool = [
    { text: "Deposita comida en el hormiguero", goal: 6, reward: 15, key: "deposited" as const },
    { text: "Excava una cámara", goal: 1, reward: 25, key: "chambers" as const },
    { text: "Derrota enemigos", goal: 3, reward: 20, key: "kills" as const },
    { text: "Ordeña áfidos", goal: 2, reward: 15, key: "milked" as const },
    { text: "Cría hormigas", goal: 2, reward: 20, key: "bred" as const },
    { text: "Sobrevive oleadas", goal: 2, reward: 30, key: "waves" as const },
  ];
  private missionBase = [0, 0, 0];

  /* items + mundo */
  private items: Item[] = [];
  private itemGeos: Record<string, THREE.BufferGeometry> = {};
  private itemMats: Record<string, THREE.Material> = {};
  private aphids: Aphid[] = [];
  private legendShown = false;
  private record = 0;
  private birdTimer = 12;

  /* partículas */
  private particles: THREE.Points;
  private pPos: Float32Array;
  private pCol: Float32Array;
  private pool: P[] = [];
  private pHead = 0;
  readonly P_MAX = 60;

  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private moundPos = new THREE.Vector3(0, 0, 16);
  private depositPos = new THREE.Vector3(0, 0, 11.4);

  constructor(canvas: HTMLCanvasElement, cb: AntCallbacks) {
    this.canvas = canvas;
    this.cb = cb;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = false;

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);
    this.scene.fog = new THREE.Fog(0xa8d8f0, 55, 160);
    this.scene.background = skyTexture();

    this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x6b4a2f, 0.95));
    const sun = new THREE.DirectionalLight(0xfff3d8, 1.5);
    sun.position.set(30, 45, -20);
    this.scene.add(sun);

    this.buildGround();
    this.buildNest();
    this.buildChamberSpots();
    this.buildItems();
    this.buildPlayer();

    /* lluvia: gotas + avisos */
    const dropGeo = new THREE.SphereGeometry(1.1, 12, 10);
    const dropMat = new THREE.MeshPhysicalMaterial({ color: 0x9ed2ff, transparent: true, opacity: 0.55, roughness: 0.1 });
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(dropGeo, dropMat);
      m.visible = false;
      this.scene.add(m);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.7, 20),
        new THREE.MeshBasicMaterial({ color: 0x9ed2ff, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      ring.visible = false;
      this.scene.add(ring);
      this.drops.push({ mesh: m, ring, target: new THREE.Vector3(), warn: 0, falling: false });
    }

    /* partículas */
    this.pPos = new Float32Array(this.P_MAX * 3);
    this.pCol = new Float32Array(this.P_MAX * 3);
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(this.pCol, 3));
    for (let i = 0; i < this.P_MAX; i++) {
      this.pool.push({ vx: 0, vy: 0, vz: 0, life: 0 });
      this.pPos[i * 3 + 1] = 9999;
    }
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({
      size: 0.4, map: dotTexture(), transparent: true, depthWrite: false, vertexColors: true, blending: THREE.AdditiveBlending,
    }));
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);

    this.record = Number(localStorage.getItem("hormiguero_record") || 0);
    this.bindEvents();
  }

  /* ------------------------------ mundo ------------------------------ */
  private buildGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(160, 160),
      new THREE.MeshStandardMaterial({ map: soilTexture(), roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    /* hierba: matas de conos (instanciado) */
    const blade = new THREE.ConeGeometry(0.16, 4.4, 5);
    blade.translate(0, 2.2, 0);
    const grassMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
    const tufts = 34;
    const perTuft = 5;
    const inst = new THREE.InstancedMesh(blade, grassMat, tufts * perTuft);
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    let idx = 0;
    for (let i = 0; i < tufts; i++) {
      const a = rand(0, TAU);
      const r = rand(10, 44);
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      if (Math.hypot(cx - this.moundPos.x, cz - this.moundPos.z) < 8) continue;
      for (let j = 0; j < perTuft; j++) {
        const x = cx + rand(-0.9, 0.9);
        const z = cz + rand(-0.9, 0.9);
        const s = rand(0.7, 1.5);
        m4.makeRotationZ(rand(-0.22, 0.22));
        m4.setPosition(x, 0, z);
        m4.scale(new THREE.Vector3(s, s, s));
        inst.setMatrixAt(idx, m4);
        col.setHSL(rand(0.24, 0.3), rand(0.55, 0.75), rand(0.32, 0.45));
        inst.setColorAt(idx, col);
        idx++;
      }
    }
    inst.count = idx;
    this.scene.add(inst);

    /* guijarros y palos */
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.9 });
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rand(0.8, 1.7), 10, 8), stoneMat);
      s.scale.y = 0.55;
      const a = rand(0, TAU);
      const r = rand(14, 46);
      s.position.set(Math.cos(a) * r, 0.35, Math.sin(a) * r);
      this.scene.add(s);
    }
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x7a5636, roughness: 0.9 });
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(rand(0.16, 0.3), rand(0.22, 0.38), rand(4, 8), 7), stickMat);
      st.rotation.z = Math.PI / 2;
      st.rotation.y = rand(0, TAU);
      const a = rand(0, TAU);
      const r = rand(16, 44);
      st.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r);
      this.scene.add(st);
    }

    /* flores decorativas */
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4c9a3f, roughness: 0.9 });
    const petalCols = [0xff8ac2, 0xffd23e, 0xff6a4e, 0xb48aff];
    for (let i = 0; i < 8; i++) {
      const a = rand(0, TAU);
      const r = rand(18, 46);
      const fx = Math.cos(a) * r;
      const fz = Math.sin(a) * r;
      const h = rand(2.2, 3.6);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 6), stemMat);
      stem.position.set(fx, h / 2, fz);
      this.scene.add(stem);
      const pm = new THREE.MeshStandardMaterial({ color: petalCols[i % 4], roughness: 0.7 });
      for (let p = 0; p < 5; p++) {
        const petal = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), pm);
        petal.scale.set(1, 0.4, 0.65);
        const pa = (p / 5) * TAU;
        petal.position.set(fx + Math.cos(pa) * 0.42, h, fz + Math.sin(pa) * 0.42);
        this.scene.add(petal);
      }
      const heart = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffe9a8, roughness: 0.6 }));
      heart.position.set(fx, h + 0.1, fz);
      this.scene.add(heart);
    }

    /* tallo con pulgones */
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 6.5, 7), stemMat);
    stalk.position.set(-24, 3.25, -6);
    this.scene.add(stalk);
    const aphidMat = new THREE.MeshStandardMaterial({ color: 0x8fd44a, roughness: 0.5 });
    for (const y of [2.2, 3.6]) {
      const ap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), aphidMat.clone());
      ap.scale.set(1.3, 0.9, 0.9);
      ap.position.set(-24 + rand(-0.1, 0.1), y, -6 + rand(-0.1, 0.1));
      this.scene.add(ap);
      this.aphids.push({ mesh: ap, ready: true, timer: 0 });
    }

    /* nubes */
    const cloudMat = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const sp = new THREE.Sprite(cloudMat.clone());
        sp.position.set(j * 5 - 5 + rand(-1, 1), rand(-0.6, 0.6), rand(-1, 1));
        sp.scale.setScalar(rand(6, 9));
        g.add(sp);
      }
      g.position.set(rand(-60, 60), rand(22, 34), rand(-60, 60));
      this.scene.add(g);
    }
  }

  private buildNest() {
    const mound = new THREE.Mesh(
      new THREE.ConeGeometry(4.4, 2.6, 20),
      new THREE.MeshStandardMaterial({ map: moundTexture(), roughness: 1 })
    );
    mound.position.set(this.moundPos.x, 1.3, this.moundPos.z);
    this.scene.add(mound);
    const hole = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 16),
      new THREE.MeshStandardMaterial({ color: 0x1c120a, roughness: 1 })
    );
    hole.position.set(this.moundPos.x, 0.62, this.moundPos.z - 3.55);
    hole.rotation.x = -Math.PI / 2.6;
    this.scene.add(hole);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.5, 0.1, 6, 28),
      new THREE.MeshBasicMaterial({ color: 0xa8e63c, transparent: true, opacity: 0.85 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(this.depositPos.x, 0.07, this.depositPos.z);
    this.scene.add(ring);
    const lbl = labelSprite("HORMIGUERO");
    lbl.position.set(this.moundPos.x, 4.6, this.moundPos.z);
    this.scene.add(lbl);
  }

  private buildChamberSpots() {
    const defs: [ChamberKind, number, number][] = [
      ["criadero", -15, 2],
      ["granero", 15, 2],
      ["hongo", -15, -12],
      ["real", 15, -12],
    ];
    for (const [kind, x, z] of defs) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.9, 2.35, 6, 1),
        new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.8, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.08, z);
      ring.rotation.z = Math.PI / 6;
      this.scene.add(ring);
      this.chambers.set(kind, { x, z, built: false, group: null, ring, seeded: false });
    }
  }

  private buildChamber(kind: ChamberKind) {
    const c = this.chambers.get(kind)!;
    const g = new THREE.Group();
    const soilMat = new THREE.MeshStandardMaterial({ map: moundTexture(), roughness: 1 });
    for (const sx of [-1.7, 1.7]) {
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 2, 8), soilMat);
      pillar.position.set(sx, 1, 0);
      g.add(pillar);
    }
    const lintel = new THREE.Mesh(new RoundedBoxGeometry(4.6, 0.8, 1.4, 2, 0.2), soilMat);
    lintel.position.y = 2.3;
    g.add(lintel);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 2),
      new THREE.MeshBasicMaterial({ color: kind === "hongo" ? 0xd8b4ff : 0xa8e63c, transparent: true, opacity: 0.25 })
    );
    glow.position.set(0, 1.1, -0.5);
    g.add(glow);
    if (kind === "hongo") {
      const mushMat = new THREE.MeshStandardMaterial({ color: 0xe8d5ff, roughness: 0.6 });
      const stemMat = new THREE.MeshStandardMaterial({ color: 0xf5eee2, roughness: 0.8 });
      for (let i = 0; i < 3; i++) {
        const mg = new THREE.Group();
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.8, 6), stemMat);
        mg.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mushMat);
        cap.scale.y = 0.5;
        cap.position.y = 0.45;
        mg.add(cap);
        mg.position.set(rand(-1.2, 1.2), 0.4, rand(-0.6, 0.2));
        mg.scale.setScalar(0.01);
        mg.userData.grow = 0;
        g.add(mg);
      }
      g.userData.mushrooms = true;
    }
    const lbl = labelSprite(CHAMBER_INFO[kind].name, kind === "real" ? "#f4c542" : "#a8e63c");
    lbl.position.y = 3.6;
    g.add(lbl);
    g.position.set(c.x, 0, c.z);
    g.rotation.y = Math.atan2(this.moundPos.x - c.x, this.moundPos.z - c.z);
    this.scene.add(g);
    c.group = g;
    c.built = true;
    c.ring.visible = false;
    this.burst(new THREE.Vector3(c.x, 1, c.z), 0x8a5f3a, 14, 3);
  }

  private buildItems() {
    this.itemGeos.crumb = new THREE.CapsuleGeometry(0.32, 0.42, 4, 8);
    this.itemGeos.dew = new THREE.SphereGeometry(0.42, 10, 8);
    this.itemGeos.seed = new THREE.SphereGeometry(0.4, 8, 6);
    this.itemGeos.honey = new THREE.SphereGeometry(0.34, 10, 8);
    this.itemMats.crumb = new THREE.MeshStandardMaterial({ color: 0xe8cfa0, roughness: 0.9 });
    this.itemMats.dew = new THREE.MeshPhysicalMaterial({ color: 0x9ed2ff, transparent: true, opacity: 0.75, roughness: 0.05 });
    this.itemMats.seed = new THREE.MeshStandardMaterial({ color: 0xf4c542, roughness: 0.6 });
    this.itemMats.honey = new THREE.MeshStandardMaterial({ color: 0xffb347, roughness: 0.3 });
    for (let i = 0; i < 14; i++) this.spawnItem();
  }

  private spawnItem(kind?: ItemKind) {
    const kinds: ItemKind[] = ["crumb", "crumb", "crumb", "dew", "dew", "seed"];
    const k = kind || kinds[Math.floor(rand(0, kinds.length))];
    const mesh = new THREE.Mesh(this.itemGeos[k], this.itemMats[k]);
    const a = rand(0, TAU);
    const r = rand(8, 38);
    mesh.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
    if (Math.hypot(mesh.position.x - this.moundPos.x, mesh.position.z - this.moundPos.z) < 7) mesh.position.x += 10;
    mesh.rotation.z = k === "crumb" ? Math.PI / 2 : 0;
    if (k === "seed") mesh.scale.set(1, 0.55, 0.65);
    this.scene.add(mesh);
    this.items.push({ mesh, kind: k, taken: false, respawnAt: 0 });
  }

  /* ---------------------- constructores de hormigas ------------------- */
  private buildAntBody(
    scale: number,
    bodyCol: number,
    accentCol: number,
    withMandibles: boolean
  ): { group: THREE.Group; legs: THREE.Object3D[]; mandibles: THREE.Object3D[] } {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.55, metalness: 0.1 });
    const accent = new THREE.MeshStandardMaterial({ color: accentCol, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x241812, roughness: 0.6 });

    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.52, 12, 10), body);
    abdomen.scale.set(1, 0.9, 1.35);
    abdomen.position.set(0, 0.52, 0.62);
    g.add(abdomen);
    const thorax = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 4, 10), body);
    thorax.rotation.x = Math.PI / 2;
    thorax.position.set(0, 0.5, -0.12);
    g.add(thorax);
    const waist = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), dark);
    waist.position.set(0, 0.5, 0.32);
    g.add(waist);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), body);
    head.position.set(0, 0.56, -0.62);
    g.add(head);
    for (const sx of [-0.17, 0.17]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.25 }));
      eye.position.set(sx, 0.66, -0.9);
      g.add(eye);
    }
    const antennae: THREE.Object3D[] = [];
    for (const sx of [-0.14, 0.14]) {
      const ant = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.5, 3, 6), dark);
      ant.position.set(sx, 0.85, -0.78);
      ant.rotation.x = -0.8;
      g.add(ant);
      antennae.push(ant);
    }
    const legs: THREE.Object3D[] = [];
    const legGeo = new THREE.CapsuleGeometry(0.055, 0.62, 3, 6);
    for (const sz of [-0.28, 0.06, 0.42]) {
      for (const sx of [-1, 1]) {
        const grp = new THREE.Group();
        const leg = new THREE.Mesh(legGeo, dark);
        leg.position.y = -0.3;
        grp.add(leg);
        grp.position.set(sx * 0.3, 0.5, sz);
        grp.rotation.z = sx * -0.85;
        grp.rotation.x = sz * 0.4;
        g.add(grp);
        legs.push(grp);
      }
    }
    const mandibles: THREE.Object3D[] = [];
    if (withMandibles) {
      for (const sx of [-1, 1]) {
        const piv = new THREE.Group();
        piv.position.set(sx * 0.16, 0.5, -0.92);
        const m = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 6), accent);
        m.rotation.x = -Math.PI / 2;
        m.position.z = -0.2;
        piv.add(m);
        piv.rotation.y = sx * 0.5;
        g.add(piv);
        mandibles.push(piv);
      }
    }
    g.scale.setScalar(scale);
    return { group: g, legs, mandibles };
  }

  private buildPlayer() {
    const { group, legs, mandibles } = this.buildAntBody(1.05, 0xb3541e, 0xa8e63c, true);
    this.player = group;
    this.legs = legs;
    this.mandibles = mandibles;
    /* carga visual: 2 slots sobre la espalda */
    for (let i = 0; i < 2; i++) {
      const holder = new THREE.Group();
      holder.position.set(0, 1.15 + i * 0.42, 0.62);
      holder.visible = false;
      group.add(holder);
      this.carryMeshes.push(holder);
    }
    this.player.position.set(0, 0, 8);
    this.scene.add(this.player);
  }

  private makeWorker(): { mesh: THREE.Group; state: "seek" | "return" | "flee"; item: Item | null; legs: THREE.Object3D[] } {
    const { group, legs } = this.buildAntBody(0.72, 0xc9702e, 0xd8b4ff, false);
    this.scene.add(group);
    const a = rand(0, TAU);
    group.position.set(Math.cos(a) * 4, 0, this.moundPos.z + Math.sin(a) * 4);
    return { mesh: group, state: "seek", item: null, legs };
  }

  private makeSoldier(): { mesh: THREE.Group; legs: THREE.Object3D[]; cd: number } {
    const { group, legs } = this.buildAntBody(0.9, 0x8a3c14, 0xa8e63c, true);
    this.scene.add(group);
    group.position.copy(this.player.position).add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2)));
    return { mesh: group, legs, cd: 0 };
  }

  private makeBar(): THREE.Mesh {
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x301010, transparent: true, opacity: 0.8, depthWrite: false })
    );
    const fg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.09),
      new THREE.MeshBasicMaterial({ color: 0xa8e63c, depthWrite: false })
    );
    fg.position.z = 0.001;
    bg.add(fg);
    bg.position.y = 1.5;
    bg.userData.fg = fg;
    return bg;
  }

  private spawnEnemy(kind: EnemyKind) {
    const g = new THREE.Group();
    let hp = 45, dmg = 8, speed = 3.1;
    let barY = 1.5;
    if (kind === "ant") {
      const { group } = this.buildAntBody(0.85, 0x8f1e1e, 0x301010, true);
      g.add(group);
      hp = 45 + this.wave * 7;
      speed = 3.1 + this.wave * 0.08;
    } else if (kind === "wasp") {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf4c542, roughness: 0.4 });
      const blackMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.5 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), bodyMat);
      body.scale.set(0.8, 0.8, 1.5);
      body.position.z = 0.35;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), blackMat);
      head.position.z = -0.75;
      g.add(head);
      for (const y of [0.15, 0.5]) {
        const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12), blackMat);
        stripe.rotation.x = Math.PI / 2;
        stripe.position.set(0, 0, y);
        g.add(stripe);
      }
      const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), blackMat);
      stinger.rotation.x = Math.PI / 2;
      stinger.position.z = 1.25;
      g.add(stinger);
      const wingGeo = new THREE.PlaneGeometry(0.9, 0.4);
      for (const sx of [-1, 1]) {
        const wing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({
          color: 0xdfefff, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
        }));
        wing.position.set(sx * 0.55, 0.45, 0.2);
        wing.rotation.z = sx * 0.35;
        wing.userData.sx = sx;
        g.add(wing);
      }
      g.userData.wings = true;
      hp = 35 + this.wave * 4;
      dmg = 10;
      speed = 5;
      barY = 1.3;
    } else {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3c2f42, roughness: 0.7 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(1.05, 14, 12), bodyMat);
      body.scale.set(1, 0.8, 1.25);
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), bodyMat);
      head.position.z = -1.15;
      head.position.y = 0.15;
      g.add(head);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff5a4e, emissive: 0xff2a1e, emissiveIntensity: 1.2 });
      for (const sx of [-0.2, 0.2]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), eyeMat);
        eye.position.set(sx, 0.28, -1.62);
        g.add(eye);
      }
      const legGeo = new THREE.CapsuleGeometry(0.07, 1.5, 3, 6);
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? -1 : 1;
        const k = i % 4;
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.set(side * 0.9, 0.55, -0.9 + k * 0.6);
        leg.rotation.z = side * 1.05;
        leg.rotation.x = (k - 1.5) * 0.25;
        g.add(leg);
      }
      hp = 170 + this.wave * 14;
      dmg = 14;
      speed = 2.7;
      barY = 1.9;
      g.scale.setScalar(0.95);
    }
    const bar = this.makeBar();
    bar.position.y = barY + 0.5;
    g.add(bar);
    const a = rand(0, TAU);
    g.position.set(Math.cos(a) * MAP_R, kind === "wasp" ? 6 : 0.2, Math.sin(a) * MAP_R);
    this.scene.add(g);
    this.enemies.push({
      mesh: g, kind, hp, maxHp: hp, dmg, speed, cd: rand(0, 1), alive: true, bar, phase: rand(0, TAU),
      target: kind === "wasp" ? "steal" : Math.random() < 0.3 ? "player" : "mound",
    });
  }

  /* ------------------------------ eventos ----------------------------- */
  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === "KeyE" && !e.repeat && this.started && !this.paused) this.pressAction();
    if (e.code === "Space") e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };
  private onMouseDown = () => {
    if (this.started && !this.paused && !this.isCoarse) this.canvas.requestPointerLock?.();
  };
  private onMouseMove = (e: MouseEvent) => {
    if (document.pointerLockElement === this.canvas) {
      this.camYaw -= e.movementX * 0.0026;
      this.camPitch = clamp(this.camPitch - e.movementY * 0.002, -0.1, 1.1);
    }
  };
  private onWheel = (e: WheelEvent) => {
    this.camDist = clamp(this.camDist + Math.sign(e.deltaY) * 0.8, 5, 14);
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
  }

  /* ---------------------------- API pública --------------------------- */
  start() {
    if (this.raf) return;
    this.clock.getDelta();
    this.renderer.setAnimationLoop(this.tick);
  }

  begin() {
    this.started = true;
    this.paused = false;
    this.audio.resume();
    this.cb.onToast("Recoge migas y rocío, depósitalas en el anillo verde y haz crecer la colonia", "info");
  }

  setPaused(p: boolean) {
    this.paused = p;
    if (p) document.exitPointerLock?.();
    else this.clock.getDelta();
  }

  setUiOpen(open: boolean) {
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

  setSprint(b: boolean) {
    this.touchSprint = b;
  }

  setHold(b: boolean) {
    this.holdAction = b;
  }

  upgradeInfo() {
    const names = ["Mandíbulas", "Coraza", "Patas"];
    const descs = ["+10 de daño de mordisco", "+25 de vida máxima", "+15% de velocidad"];
    return names.map((name, i) => {
      const level = this.upLevels[i];
      const cost = Math.round(60 * Math.pow(1.6, level) / 10) * 10;
      return { name, desc: descs[i], level, cost, maxed: level >= 3 };
    });
  }

  buyUpgrade(i: number): boolean {
    const info = this.upgradeInfo()[i];
    if (info.maxed || this.food < info.cost) {
      this.cb.onToast(info.maxed ? "Nivel máximo" : "Comida insuficiente", "bad");
      return false;
    }
    this.food -= info.cost;
    this.upLevels[i]++;
    if (i === 1) {
      this.maxHp += 25;
      this.hp += 25;
    }
    this.audio.breed();
    this.cb.onToast(`${info.name} · nivel ${this.upLevels[i]}`, "ok");
    return true;
  }

  chamberList() {
    return (["criadero", "granero", "hongo", "real"] as ChamberKind[]).map((k) => ({
      name: CHAMBER_INFO[k].name,
      desc: CHAMBER_INFO[k].desc,
      built: this.chambers.get(k)!.built,
      cost: CHAMBER_INFO[k].cost,
    }));
  }

  /** Reinicio total tras game over. */
  reset() {
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
    for (const w of this.workers) this.scene.remove(w.mesh);
    this.workers = [];
    for (const s of this.soldiers) this.scene.remove(s.mesh);
    this.soldiers = [];
    for (const kind of this.chambers.keys()) {
      const c = this.chambers.get(kind)!;
      if (c.group) this.scene.remove(c.group);
      c.group = null;
      c.built = false;
      c.seeded = false;
      c.ring.visible = true;
    }
    for (const it of this.items) {
      it.taken = false;
      it.mesh.visible = true;
    }
    for (const ap of this.aphids) {
      ap.ready = true;
      ap.timer = 0;
      (ap.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x8fd44a);
    }
    this.carry = [];
    this.carryMeshes.forEach((m) => (m.visible = false));
    this.food = 20;
    this.queenMax = 100;
    this.queenHp = 100;
    this.hp = 100;
    this.maxHp = 100;
    this.upLevels = [0, 0, 0];
    this.wave = 0;
    this.wavesSurvived = 0;
    this.waveState = "calm";
    this.waveTimer = 50;
    this.rain = "none";
    this.rainTimer = 95;
    this.kills = 0;
    this.counters = { deposited: 0, chambers: 0, kills: 0, milked: 0, bred: 0, waves: 0 };
    this.missionIdx = [0, 1, 2];
    this.missionBase = [0, 0, 0];
    this.legendShown = false;
    this.player.position.set(0, 0, 8);
    this.pVel.set(0, 0, 0);
    this.drops.forEach((d) => {
      d.mesh.visible = false;
      d.ring.visible = false;
      d.falling = false;
    });
    this.audio.setRain(false);
  }

  /* ----------------------------- acciones ----------------------------- */
  private nearItem(): Item | null {
    let best: Item | null = null;
    let bd = 2.3;
    for (const it of this.items) {
      if (it.taken) continue;
      const d = it.mesh.position.distanceTo(this.player.position);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }

  private nearestEnemy(range: number, lowFly = true): Enemy | null {
    let best: Enemy | null = null;
    let bd = range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (!lowFly && e.mesh.position.y > 3.2) continue;
      const d = e.mesh.position.distanceTo(this.player.position);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  pressAction() {
    if (!this.started || this.paused) return;
    const biteDmg = 25 + this.upLevels[0] * 10;
    const enemy = this.nearestEnemy(2.5);
    if (enemy && enemy.mesh.position.y < 3.4) {
      enemy.hp -= biteDmg;
      this.biteT = 0.2;
      this.audio.bite();
      enemy.mesh.position.addScaledVector(
        this.tmpV.copy(enemy.mesh.position).sub(this.player.position).normalize(),
        0.5
      );
      this.burst(enemy.mesh.position.clone().setY(1), 0xff5a4e, 6, 2.4);
      (enemy.bar.userData.fg as THREE.Mesh).userData.hit = 0.2;
      if (enemy.hp <= 0) this.killEnemy(enemy);
      return;
    }
    if (this.carry.length < 2) {
      const aphid = this.aphids.find(
        (a) => a.ready && a.mesh.position.distanceTo(this.player.position) < 2.6
      );
      if (aphid) {
        this.carry.push({ kind: "honey", value: 15 });
        this.setCarryVisual();
        this.counters.milked++;
        this.audio.milk();
        aphid.ready = false;
        aphid.timer = 22;
        (aphid.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x5a7a3a);
        this.cb.onToast("Miel de áfido recogida (+15 al depositar)", "ok");
        return;
      }
    }
    const item = this.nearItem();
    if (item && this.carry.length < 2) {
      item.taken = true;
      item.mesh.visible = false;
      item.respawnAt = this.clock.elapsedTime + 14;
      this.carry.push({ kind: item.kind, value: ITEM_VALUE[item.kind] });
      this.setCarryVisual();
      this.audio.pickup();
      return;
    }
    if (this.carry.length > 0 && this.player.position.distanceTo(this.depositPos) < 3.6) {
      this.deposit();
    }
  }

  private deposit() {
    const mult = this.chambers.get("granero")!.built ? 1.25 : 1;
    let gain = 0;
    for (const c of this.carry) gain += c.value;
    gain = Math.round(gain * mult);
    this.food += gain;
    this.counters.deposited += this.carry.length;
    this.carry = [];
    this.setCarryVisual();
    this.audio.deposit();
    this.cb.onToast(`+${gain} 🍃 almacenadas`, "ok");
    this.burst(this.depositPos.clone().setY(0.8), 0xa8e63c, 10, 2.6);
  }

  private setCarryVisual() {
    for (let i = 0; i < 2; i++) {
      const holder = this.carryMeshes[i];
      holder.visible = i < this.carry.length;
      if (holder.visible && holder.children.length === 0) {
        const m = new THREE.Mesh(this.itemGeos.crumb, this.itemMats.crumb);
        m.scale.setScalar(0.8);
        holder.add(m);
      }
    }
  }

  private killEnemy(e: Enemy) {
    e.alive = false;
    this.scene.remove(e.mesh);
    this.kills++;
    this.counters.kills++;
    this.audio.kill();
    if (e.kind === "wasp") {
      this.food += 10;
      this.cb.onToast("¡Avispa derrotada! +10 🍃 recuperadas", "ok");
    } else {
      this.cb.onToast("Enemigo derrotado", "ok");
    }
  }

  private gameOver() {
    this.paused = true;
    document.exitPointerLock?.();
    this.record = Math.max(this.record, this.wavesSurvived);
    localStorage.setItem("hormiguero_record", String(this.record));
    this.cb.onBanner("COLONIA CONQUISTADA", "Las hormigas rojas tomaron la Sala Real");
  }

  /* ----------------------------- updates ------------------------------ */
  private updatePlayer(dt: number) {
    const k = this.keys;
    const sprint = k["ShiftLeft"] || k["ShiftRight"] || this.touchSprint;
    let ix = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0) + this.joy.x;
    let iy = (k["KeyW"] ? 1 : 0) - (k["KeyS"] ? 1 : 0) - this.joy.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) {
      ix /= len;
      iy /= len;
    }
    const speed = 7 * (1 + this.upLevels[2] * 0.15) * (sprint ? 1.45 : 1);
    const fwd = this.tmpV.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = this.tmpV2.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const moving = Math.hypot(ix, iy) > 0.05;
    if (moving) {
      this.pVel.x = fwd.x * iy * speed + right.x * ix * speed;
      this.pVel.z = fwd.z * iy * speed + right.z * ix * speed;
    } else {
      this.pVel.x *= Math.exp(-8 * dt);
      this.pVel.z *= Math.exp(-8 * dt);
    }
    this.player.position.x += this.pVel.x * dt;
    this.player.position.z += this.pVel.z * dt;

    /* salto */
    const onGround = this.player.position.y <= 0.02;
    if (k["Space"] && onGround) this.pVel.y = 8.5;
    this.pVel.y -= 25 * dt;
    this.player.position.y = Math.max(0, this.player.position.y + this.pVel.y * dt);
    if (this.player.position.y === 0) this.pVel.y = Math.max(0, this.pVel.y);

    const L = Math.hypot(this.player.position.x, this.player.position.z);
    if (L > MAP_R + 6) {
      this.player.position.x *= (MAP_R + 6) / L;
      this.player.position.z *= (MAP_R + 6) / L;
    }

    if (moving) {
      const target = Math.atan2(-this.pVel.x, -this.pVel.z);
      let d = target - this.pYaw;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.pYaw += d * Math.min(1, dt * 8);
      this.player.rotation.y = this.pYaw;
    }
    const t = this.clock.elapsedTime;
    const sp2 = Math.hypot(this.pVel.x, this.pVel.z);
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].rotation.y = Math.sin(t * (sprint ? 16 : 11) + i * 1.1) * 0.5 * Math.min(1, sp2 / 4);
    }
    this.mandibles.forEach((m, i) => {
      m.rotation.y = (i === 0 ? 1 : -1) * (0.5 + (this.biteT > 0 ? 0.5 : 0));
    });
    this.biteT = Math.max(0, this.biteT - dt);

    if (t - this.lastHurt > 5 && this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 2.5 * dt);
    if (this.hp <= 0) {
      this.hp = this.maxHp * 0.5;
      this.carry = [];
      this.setCarryVisual();
      this.player.position.set(this.depositPos.x, 0, this.depositPos.z + 1.5);
      this.cb.onToast("Te reanimaron en el hormiguero — ¡cuidado!", "bad");
      this.audio.hurt();
    }
  }

  private updateCamera(dt: number) {
    this.camYaw -= this.lookBuf.x * 0.005;
    this.camPitch = clamp(this.camPitch - this.lookBuf.y * 0.004, -0.05, 1.15);
    this.lookBuf.x = 0;
    this.lookBuf.y = 0;
    const cp = Math.cos(this.camPitch);
    this.tmpV.set(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp).multiplyScalar(this.camDist);
    this.camera.position.copy(this.player.position).add(this.tmpV).add(new THREE.Vector3(0, 2.2, 0));
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1, this.player.position.z);
  }

  private holdTick(dt: number) {
    const holding = this.keys["KeyE"] || this.holdAction;
    const t = this.clock.elapsedTime;
    /* excavar cámaras */
    let spot: { kind: ChamberKind; x: number; z: number } | null = null;
    for (const [kind, c] of this.chambers) {
      if (!c.built && Math.hypot(this.player.position.x - c.x, this.player.position.z - c.z) < 3.4) {
        spot = { kind, x: c.x, z: c.z };
        break;
      }
    }
    if (holding && spot) {
      const info = CHAMBER_INFO[spot.kind];
      if (this.food >= info.cost) {
        this.digProgress += dt / 3;
        this.digTarget = spot.kind;
        if (Math.floor(this.digProgress * 10) !== Math.floor((this.digProgress - dt / 3) * 10)) {
          this.burst(new THREE.Vector3(spot.x, 0.6, spot.z), 0x8a5f3a, 5, 2.2);
          this.audio.dig();
        }
        if (this.digProgress >= 1) {
          this.digProgress = 0;
          this.digTarget = null;
          this.food -= info.cost;
          this.buildChamber(spot.kind);
          this.counters.chambers++;
          this.cb.onToast(`${info.name} excavada`, "ok");
          if (spot.kind === "criadero") this.cb.onToast("¡Ya puedes criar OBRERAS (20🍃)!", "info");
        }
        return;
      }
    }
    /* sembrar hongo */
    const hongo = this.chambers.get("hongo")!;
    if (holding && hongo.built && !hongo.seeded && this.food >= 15 &&
      Math.hypot(this.player.position.x - hongo.x, this.player.position.z - hongo.z) < 3.6) {
      this.digProgress += dt / 2;
      this.digTarget = "hongo";
      if (this.digProgress >= 1) {
        this.digProgress = 0;
        this.digTarget = null;
        this.food -= 15;
        hongo.seeded = true;
        this.audio.breed();
        this.cb.onToast("Huerto sembrado: +1 🍃 cada 8 s", "ok");
      }
      return;
    }
    /* ordeñar áfidos */
    const aphid = this.aphids.find((a) => a.ready && a.mesh.position.distanceTo(this.player.position) < 2.8);
    if (holding && aphid && this.carry.length < 2) {
      this.digProgress += dt / 2;
      this.digTarget = "afido";
      if (this.digProgress >= 1) {
        this.digProgress = 0;
        this.digTarget = null;
        this.carry.push({ kind: "honey", value: 15 });
        this.setCarryVisual();
        this.counters.milked++;
        this.audio.milk();
        aphid.ready = false;
        aphid.timer = 22;
        (aphid.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x5a7a3a);
      }
      return;
    }
    if (this.digProgress > 0 && (!holding || !spot && !aphid && !(hongo.built && !hongo.seeded))) {
      this.digProgress = 0;
      this.digTarget = null;
    }
  }

  private updateWorkers(dt: number) {
    for (const w of this.workers) {
      const p = w.mesh.position;
      /* huir de enemigos */
      const threat = this.enemies.find((e) => e.alive && e.kind !== "wasp" && e.mesh.position.distanceTo(p) < 5);
      if (threat) {
        const dir = this.tmpV.copy(this.moundPos).sub(p).normalize();
        p.addScaledVector(dir, 5.5 * dt);
        this.animLegs(w.legs, dt, true);
        continue;
      }
      if (w.state === "seek") {
        if (!w.item || !w.item.mesh.visible || w.item.taken) {
          let best: Item | null = null;
          let bd = 44;
          for (const it of this.items) {
            if (it.taken) continue;
            const d = it.mesh.position.distanceTo(p);
            if (d < bd) {
              bd = d;
              best = it;
            }
          }
          w.item = best;
          if (!best) {
            this.wander(w.mesh, dt, 3.4);
            this.animLegs(w.legs, dt, false);
            continue;
          }
        }
        const tgt = w.item!.mesh.position;
        const dir = this.tmpV.copy(tgt).sub(p);
        if (dir.length() < 1.3) {
          w.item!.taken = true;
          w.item!.mesh.visible = false;
          w.item!.respawnAt = this.clock.elapsedTime + 14;
          w.state = "return";
        } else {
          p.addScaledVector(dir.normalize(), 3.8 * dt);
          this.faceTo(w.mesh, tgt);
          this.animLegs(w.legs, dt, false);
        }
      } else {
        const dir = this.tmpV.copy(this.depositPos).sub(p);
        if (dir.length() < 1.8) {
          if (w.item) {
            const gain = Math.round(w.item.kind === "crumb" ? ITEM_VALUE.crumb : ITEM_VALUE[w.item.kind as ItemKind] * (this.chambers.get("granero")!.built ? 1.25 : 1));
            this.food += gain;
            this.counters.deposited++;
          }
          w.item = null;
          w.state = "seek";
        } else {
          p.addScaledVector(dir.normalize(), 4.2 * dt);
          this.faceTo(w.mesh, this.depositPos);
          this.animLegs(w.legs, dt, false);
        }
      }
      p.y = 0;
    }
  }

  private wander(mesh: THREE.Group, dt: number, speed: number) {
    const a = mesh.userData.wa ?? rand(0, TAU);
    if (!mesh.userData.wt || this.clock.elapsedTime > mesh.userData.wt) {
      mesh.userData.wa = a + rand(-1.4, 1.4);
      mesh.userData.wt = this.clock.elapsedTime + rand(1.5, 3);
    }
    const dir = this.tmpV.set(Math.sin(a), 0, Math.cos(a));
    const p = mesh.position;
    p.addScaledVector(dir, speed * dt);
    const L = Math.hypot(p.x, p.z);
    if (L > MAP_R) {
      p.x *= MAP_R / L;
      p.z *= MAP_R / L;
      mesh.userData.wa = a + Math.PI;
    }
    this.faceTo(mesh, p.clone().add(dir));
  }

  private faceTo(mesh: THREE.Object3D, tgt: THREE.Vector3) {
    const target = Math.atan2(tgt.x - mesh.position.x, tgt.z - mesh.position.z);
    let d = target - mesh.rotation.y;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    mesh.rotation.y += d * 0.15;
  }

  private animLegs(legs: THREE.Object3D[], dt: number, fast: boolean) {
    const t = this.clock.elapsedTime;
    void dt;
    for (let i = 0; i < legs.length; i++) {
      legs[i].rotation.y = Math.sin(t * (fast ? 16 : 10) + i * 1.1) * 0.5;
    }
  }

  private updateSoldiers(dt: number) {
    for (const s of this.soldiers) {
      const p = s.mesh.position;
      const foe = this.enemies.find((e) => e.alive && e.kind !== "wasp" && e.mesh.position.distanceTo(p) < 9);
      if (foe) {
        const dir = this.tmpV.copy(foe.mesh.position).sub(p);
        if (dir.length() > 1.7) {
          p.addScaledVector(dir.normalize(), 5 * dt);
          this.faceTo(s.mesh, foe.mesh.position);
        } else {
          s.cd -= dt;
          if (s.cd <= 0) {
            s.cd = 0.8;
            foe.hp -= 20;
            this.burst(foe.mesh.position.clone().setY(1), 0xff5a4e, 4, 2);
            if (foe.hp <= 0) this.killEnemy(foe);
          }
        }
      } else {
        const dir = this.tmpV.copy(this.player.position).sub(p);
        if (dir.length() > 4) {
          p.addScaledVector(dir.normalize(), 6.4 * dt);
          this.faceTo(s.mesh, this.player.position);
        } else if (dir.length() < 2.2) {
          p.addScaledVector(dir.normalize(), -2.5 * dt);
        }
      }
      this.animLegs(s.legs, dt, false);
      p.y = 0;
    }
    void dt;
  }

  private updateEnemies(dt: number) {
    const t = this.clock.elapsedTime;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const p = e.mesh.position;
      e.cd -= dt;
      const hit = (e.bar.userData.fg as THREE.Mesh).userData.hit as number | undefined;
      if (hit && hit > 0) {
        (e.bar.userData.fg as THREE.Mesh).userData.hit = hit - dt;
        ((e.bar.userData.fg as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(0xffffff);
      } else {
        ((e.bar.userData.fg as THREE.Mesh).material as THREE.MeshBasicMaterial).color.setHex(0xa8e63c);
      }
      if (e.kind === "ant") {
        const tgt = e.target === "player" ? this.player.position : this.moundPos;
        const dir = this.tmpV.copy(tgt).sub(p);
        dir.y = 0;
        const dist = dir.length();
        if (e.target === "player" && dist > 2 || e.target === "mound") {
          if (dist > (e.target === "mound" ? 3.6 : 1.8)) {
            p.addScaledVector(dir.normalize(), e.speed * dt);
            this.faceTo(e.mesh, tgt);
            const legs = e.mesh.children[0] as THREE.Group;
            if (legs) this.animLegs(legs.children.filter((c) => c.userData.leg) as THREE.Object3D[], dt, false);
          }
        }
        const pd = p.distanceTo(this.player.position);
        if (pd < 2 && e.cd <= 0) {
          e.cd = 1;
          this.hp -= e.dmg;
          this.lastHurt = t;
          this.audio.hurt();
          this.knockPlayer(p);
        }
        if (e.target === "mound" && Math.hypot(p.x - this.moundPos.x, p.z - this.moundPos.z) < 4.4 && e.cd <= 0) {
          e.cd = 1.1;
          this.queenHp = Math.max(0, this.queenHp - 4);
          this.burst(this.moundPos.clone().setY(1.5), 0xff5a4e, 3, 1.6);
          if (this.queenHp <= 0) this.gameOver();
        }
        if (e.target === "player" && pd > 14) e.target = "mound";
      } else if (e.kind === "wasp") {
        const wings = e.mesh.children.filter((c) => c.userData.sx !== undefined);
        for (const w of wings) w.rotation.x = Math.sin(t * 40) * 0.6;
        if (e.target === "steal") {
          const hover = this.tmpV.set(this.depositPos.x, 2.6, this.depositPos.z);
          const dir = this.tmpV2.copy(hover).sub(p);
          if (dir.length() > 0.6) {
            p.addScaledVector(dir.normalize(), e.speed * dt);
          } else {
            this.audio.buzz();
            e.phase += dt;
            if (e.phase > 4) {
              const stolen = Math.min(20, this.food);
              this.food -= stolen;
              this.cb.onToast(`¡La avispa robó ${Math.round(stolen)} 🍃!`, "bad");
              e.target = "flee";
            }
          }
          p.y = 2.6 + Math.sin(t * 3) * 0.3;
          this.faceTo(e.mesh, this.player.position);
        } else {
          const dir = this.tmpV.copy(p).setY(0);
          p.addScaledVector(dir.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI), 6 * dt);
          p.y += 1.2 * dt;
          if (Math.hypot(p.x, p.z) > MAP_R + 8) {
            e.alive = false;
            this.scene.remove(e.mesh);
          }
        }
        const pd = p.distanceTo(this.player.position);
        if (pd < 2.4 && e.cd <= 0 && e.target === "steal") {
          e.cd = 1.6;
          this.hp -= e.dmg;
          this.lastHurt = t;
          this.audio.hurt();
        }
      } else {
        const dir = this.tmpV.copy(this.player.position).sub(p);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 2.1) {
          p.addScaledVector(dir.normalize(), e.speed * dt);
          this.faceTo(e.mesh, this.player.position);
          p.y = Math.abs(Math.sin(t * 6)) * 0.12;
        }
        if (dist < 2.6 && e.cd <= 0) {
          e.cd = 1.2;
          this.hp -= e.dmg;
          this.lastHurt = t;
          this.audio.hurt();
          this.knockPlayer(p);
        }
      }
      e.bar.quaternion.copy(this.camera.quaternion);
      (e.bar.userData.fg as THREE.Mesh).scale.x = Math.max(0.02, e.hp / e.maxHp);
      (e.bar.userData.fg as THREE.Mesh).position.x = -(1 - e.hp / e.maxHp) * 0.48;
    }
  }

  private knockPlayer(from: THREE.Vector3) {
    const dir = this.tmpV2.copy(this.player.position).sub(from).setY(0).normalize();
    this.player.position.addScaledVector(dir, 0.9);
  }

  private updateWaves(dt: number) {
    if (this.waveState === "calm") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.wave++;
        this.waveState = "warning";
        this.waveTimer = 5;
        this.audio.alarm();
        this.cb.onBanner(`⚔ OLEADA ${this.wave}`, "¡Hormigas rojas avanzan hacia el hormiguero!");
      }
    } else if (this.waveState === "warning") {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) {
        this.waveState = "active";
        const ants = Math.min(9, 2 + this.wave);
        for (let i = 0; i < ants; i++) this.spawnEnemy("ant");
        if (this.wave % 2 === 0) this.spawnEnemy("wasp");
        if (this.wave % 3 === 0) this.spawnEnemy("spider");
        this.cb.onToast(`${this.enemies.filter((e) => e.alive).length} enemigos entraron al jardín`, "bad");
      }
    } else if (this.enemies.every((e) => !e.alive)) {
      this.waveState = "calm";
      this.wavesSurvived = this.wave;
      this.counters.waves = this.wavesSurvived;
      this.waveTimer = Math.max(28, 62 - this.wave * 2.5);
      this.cb.onToast(`Oleada ${this.wave} superada · +respiro de ${Math.ceil(this.waveTimer)}s`, "ok");
      this.record = Math.max(this.record, this.wavesSurvived);
    }
  }

  private updateRain(dt: number) {
    if (this.rain === "none") {
      this.rainTimer -= dt;
      if (this.rainTimer <= 0) {
        this.rain = "warning";
        this.rainLeft = 10;
        this.audio.thunder();
        this.cb.onBanner("🌧 LLEGAN LAS NUBES", "¡Refúgiate junto al hormiguero!");
      }
    } else if (this.rain === "warning") {
      this.rainLeft -= dt;
      if (this.rainLeft <= 0) {
        this.rain = "active";
        this.rainLeft = 15;
        this.audio.setRain(true);
      }
    } else {
      this.rainLeft -= dt;
      if (this.rainLeft <= 0) {
        this.rain = "none";
        this.rainTimer = rand(85, 115);
        this.audio.setRain(false);
        for (let i = 0; i < 6; i++) this.spawnItem("dew");
        this.cb.onToast("Pasó la lluvia: el rocío brilla por doquier", "info");
      }
    }
    /* gotas */
    for (const d of this.drops) {
      if (!d.falling && !d.mesh.visible && this.rain === "active" && Math.random() < dt * 1.4) {
        const a = rand(0, TAU);
        const r = rand(10, 42);
        d.target.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        d.warn = 1.1;
        d.ring.visible = true;
        d.ring.position.set(d.target.x, 0.06, d.target.z);
        d.warn = 1.1;
      }
      if (d.ring.visible && !d.falling) {
        d.warn -= dt;
        if (d.warn <= 0) {
          d.falling = true;
          d.mesh.visible = true;
          d.mesh.position.set(d.target.x, 20, d.target.z);
        }
      }
      if (d.falling) {
        d.mesh.position.y -= 26 * dt;
        if (d.mesh.position.y <= 0.8) {
          d.falling = false;
          d.mesh.visible = false;
          d.ring.visible = false;
          this.audio.splash();
          this.burst(d.target.clone().setY(0.5), 0x9ed2ff, 8, 3);
          if (d.target.distanceTo(this.player.position) < 2.3) {
            this.hp -= 15;
            this.lastHurt = this.clock.elapsedTime;
            this.knockPlayer(d.target);
            this.audio.hurt();
          }
        }
      }
    }
  }

  private updateWorldBits(dt: number) {
    const t = this.clock.elapsedTime;
    /* respawn de ítems */
    for (const it of this.items) {
      if (it.taken && t > it.respawnAt) {
        const a = rand(0, TAU);
        const r = rand(8, 38);
        it.mesh.position.set(Math.cos(a) * r, 0.5, Math.sin(a) * r);
        if (Math.hypot(it.mesh.position.x - this.moundPos.x, it.mesh.position.z - this.moundPos.z) < 7) it.mesh.position.x += 10;
        it.taken = false;
        it.mesh.visible = true;
      }
      if (!it.taken && it.kind === "dew") {
        it.mesh.position.y = 0.5 + Math.sin(t * 2 + it.mesh.position.x) * 0.08;
      }
    }
    /* áfidos se recuperan */
    for (const ap of this.aphids) {
      if (!ap.ready) {
        ap.timer -= dt;
        if (ap.timer <= 0) {
          ap.ready = true;
          (ap.mesh.material as THREE.MeshStandardMaterial).color.setHex(0x8fd44a);
        }
      }
    }
    /* anillos de excavación pulsan */
    for (const [, c] of this.chambers) {
      if (!c.built) c.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.07);
      if (c.built && c.group) {
        for (const ch of c.group.children) {
          if (ch.userData.grow !== undefined && ch.userData.grow < 1) {
            ch.userData.grow = Math.min(1, ch.userData.grow + dt / 4);
            ch.scale.setScalar(ch.userData.grow);
          }
        }
      }
    }
    /* hongo pasivo */
    const hongo = this.chambers.get("hongo")!;
    if (hongo.built && hongo.seeded) {
      this.mushTimer -= dt;
      if (this.mushTimer <= 0) {
        this.mushTimer = 8;
        this.food += 1;
      }
    }
    /* pájaros ambiente */
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = rand(10, 20);
      this.audio.bird();
    }
  }

  private checkMissions() {
    for (let i = 0; i < this.missionIdx.length; i++) {
      const m = this.missionPool[this.missionIdx[i]];
      const prog = (this.counters[m.key] as number) - this.missionBase[i];
      if (prog >= m.goal) {
        this.food += m.reward;
        this.cb.onToast(`Misión: ${m.text} — +${m.reward} 🍃`, "ok");
        this.missionBase[i] = this.counters[m.key];
        this.missionIdx[i] = (this.missionIdx[i] + 3) % this.missionPool.length;
      }
    }
  }

  private checkLegend() {
    if (this.legendShown) return;
    const chambersBuilt = [...this.chambers.values()].filter((c) => c.built).length;
    const pop = this.workers.length + this.soldiers.length + 1;
    if (chambersBuilt === 4 && pop >= 10 && this.wavesSurvived >= 5) {
      this.legendShown = true;
      this.record = Math.max(this.record, this.wavesSurvived);
      localStorage.setItem("hormiguero_record", String(this.record));
      this.cb.onBanner("👑 COLONIA LEGENDARIA", "4 cámaras · población 10 · 5 oleadas — el jardín es vuestro");
      this.audio.legend();
    }
  }

  /** Cría obreras/soldados desde la UI (modal de evolución también lo usa). */
  breed(caste: "worker" | "soldier"): boolean {
    if (caste === "worker") {
      if (!this.chambers.get("criadero")!.built) {
        this.cb.onToast("Necesitas excavar el CRIADERO", "bad");
        return false;
      }
      if (this.workers.length >= 8) {
        this.cb.onToast("Colmena de obreras llena (8)", "bad");
        return false;
      }
      if (this.food < 20) {
        this.cb.onToast("Faltan 🍃 (20)", "bad");
        return false;
      }
      this.food -= 20;
      this.workers.push(this.makeWorker());
    } else {
      if (this.soldiers.length >= 4) {
        this.cb.onToast("Máximo de soldados (4)", "bad");
        return false;
      }
      if (this.food < 30) {
        this.cb.onToast("Faltan 🍃 (30)", "bad");
        return false;
      }
      this.food -= 30;
      this.soldiers.push(this.makeSoldier());
    }
    this.counters.bred++;
    this.audio.breed();
    this.cb.onToast(caste === "worker" ? "¡Obrera criada!" : "¡Soldado criado!", "ok");
    return true;
  }

  royalChamberBonus() {
    const real = this.chambers.get("real")!;
    if (real.built && this.queenMax === 100) {
      this.queenMax = 150;
      this.queenHp = Math.min(150, this.queenHp + 50);
    }
  }

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
      p.vy -= 3 * dt;
    }
    (this.particles.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.particles.geometry.getAttribute("color") as THREE.BufferAttribute).needsUpdate = true;
  }

  private burst(pos: THREE.Vector3, color: number, n: number, speed: number) {
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const p = this.pool[this.pHead];
      const idx = this.pHead;
      this.pHead = (this.pHead + 1) % this.P_MAX;
      p.life = rand(0.4, 0.9);
      p.vx = rand(-1, 1) * speed;
      p.vy = rand(0.4, 1.2) * speed;
      p.vz = rand(-1, 1) * speed;
      this.pPos[idx * 3] = pos.x;
      this.pPos[idx * 3 + 1] = pos.y;
      this.pPos[idx * 3 + 2] = pos.z;
      this.pCol[idx * 3] = c.r;
      this.pCol[idx * 3 + 1] = c.g;
      this.pCol[idx * 3 + 2] = c.b;
    }
  }

  private buildPrompt(): string {
    if (!this.started) return "";
    const p = this.player.position;
    if (this.digProgress > 0) {
      const names: Record<string, string> = { criadero: "EXCAVAR", granero: "EXCAVAR", hongo: "SEMBRAR", real: "EXCAVAR", afido: "ORDEÑAR" };
      return `${names[this.digTarget || "criadero"]} ${Math.floor(this.digProgress * 100)}%`;
    }
    for (const [kind, c] of this.chambers) {
      if (!c.built && Math.hypot(p.x - c.x, p.z - c.z) < 3.4) {
        const info = CHAMBER_INFO[kind];
        return this.food >= info.cost
          ? `MANTÉN [E] — EXCAVAR ${info.name} (${info.cost}🍃)`
          : `${info.name}: necesitas ${info.cost}🍃`;
      }
    }
    const hongo = this.chambers.get("hongo")!;
    if (hongo.built && !hongo.seeded && Math.hypot(p.x - hongo.x, p.z - hongo.z) < 3.6) {
      return this.food >= 15 ? "MANTÉN [E] — SEMBRAR HONGO (15🍃)" : "Sembrar: necesitas 15🍃";
    }
    if (this.aphids.some((a) => a.ready && a.mesh.position.distanceTo(p) < 2.8)) {
      return "MANTÉN [E] — ORDEÑAR ÁFIDO";
    }
    const enemy = this.nearestEnemy(2.5);
    if (enemy && enemy.mesh.position.y < 3.4) return "[E] — ¡MORDISCO!";
    if (this.nearItem() && this.carry.length < 2) return "[E] — RECOGER";
    if (this.carry.length > 0 && p.distanceTo(this.depositPos) < 3.6) return "[E] — DEPOSITAR EN EL HORMIGUERO";
    return "";
  }

  private emitHud() {
    const mmItems: number[] = [];
    for (const it of this.items) {
      if (!it.taken) mmItems.push(it.mesh.position.x, it.mesh.position.z);
    }
    const mmEnemies: number[] = [];
    for (const e of this.enemies) {
      if (e.alive) mmEnemies.push(e.mesh.position.x, e.mesh.position.z);
    }
    const upgrades = this.upgradeInfo();
    this.cb.onHud({
      phase: this.started ? "playing" : "intro",
      paused: this.paused,
      hp: Math.max(0, Math.round(this.hp)),
      maxHp: this.maxHp,
      food: Math.floor(this.food),
      carry: this.carry.length,
      workers: this.workers.length,
      soldiers: this.soldiers.length,
      queenHp: Math.max(0, Math.round(this.queenHp)),
      queenMax: this.queenMax,
      wave: this.wave,
      waveIn: Math.max(0, Math.ceil(this.waveTimer)),
      waveState: this.waveState,
      rainIn: Math.max(0, Math.ceil(this.rainLeft > 0 ? this.rainLeft : this.rainTimer)),
      rain: this.rain,
      digProgress: this.digProgress,
      prompt: this.buildPrompt(),
      missions: this.missionIdx.map((idx, i) => {
        const m = this.missionPool[idx];
        return {
          text: m.text,
          prog: Math.min(m.goal, (this.counters[m.key] as number) - this.missionBase[i]),
          goal: m.goal,
          reward: m.reward,
        };
      }),
      upgrades,
      chambers: this.chamberList(),
      legend: this.legendShown,
      over: this.queenHp <= 0,
      stats: { wave: this.wavesSurvived, food: Math.floor(this.food), kills: this.kills },
      minimap: { px: this.player.position.x, pz: this.player.position.z, items: mmItems, enemies: mmEnemies },
    });
  }

  private tick = () => {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    try {
      if (this.started && !this.paused && this.queenHp > 0) {
        this.updatePlayer(dt);
        this.holdTick(dt);
        this.updateWorkers(dt);
        this.updateSoldiers(dt);
        this.updateEnemies(dt);
        this.updateWaves(dt);
        this.updateRain(dt);
        this.updateWorldBits(dt);
        this.checkMissions();
        this.checkLegend();
        this.royalChamberBonus();
        this.updateCamera(dt);
      } else if (!this.started) {
        const t = this.clock.elapsedTime * 0.1;
        this.camera.position.set(Math.cos(t) * 22, 9 + Math.sin(t * 0.6) * 2, 16 + Math.sin(t) * 14);
        this.camera.lookAt(0, 1.5, 8);
        this.updateWorldBits(dt);
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
        console.error("[AntGame] error en el bucle:", err);
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
    this.audio.setRain(false);
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
    localStorage.setItem("hormiguero_record", String(this.record));
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
