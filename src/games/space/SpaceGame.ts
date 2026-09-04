/* ============================================================
   CHATARRA CÓSMICA — motor 3D (gravedad cero · tycoon orbital)
   GameLab by AliceLabs · three.js
   ============================================================ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  SpaceAudio, TAU, rand, clamp, lerp,
  dotTexture, radialSprite, visorTexture, hullTexture,
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

export type SpaceHud = {
  phase: "intro" | "playing";
  paused: boolean;
  o2: number;
  metal: number;
  totalMetal: number;
  record: number;
  towing: number;
  modules: number;
  storm: "calm" | "warning" | "active";
  stormIn: number;
  prompt: string;
  repairProgress: number;
  hurtFlash: number;
  legend: boolean;
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

  /* jugador */
  private player = new THREE.Group();
  private pVel = new THREE.Vector3();
  private pYaw = Math.PI;                 // orientación visual
  private camYaw = Math.PI;
  private camPitch = -0.15;
  private camDist = 7.5;
  private o2 = 100;
  private limbs: THREE.Object3D[] = [];
  private thrustGlow: THREE.Mesh | null = null;
  private keys: Record<string, boolean> = {};
  private joy = { x: 0, y: 0 };
  private touchBoost = false;
  private lookBuf = { x: 0, y: 0 };
  private hurtFlash = 0;

  /* gancho */
  private towed: Debris[] = [];
  private towLines: THREE.Line[] = [];
  private aimTarget: Debris | null = null;

  /* estación */
  private modules: StationModule[] = [];
  private stationCore = new THREE.Group();
  private evolutionRing: THREE.Mesh | null = null;
  private shieldDome: THREE.Mesh | null = null;
  private foundryPos = new THREE.Vector3(0, -1.4, 0);
  private metal = 0;
  private totalMetal = 0;
  private record = 0;

  /* tormenta */
  private storm: "calm" | "warning" | "active" = "calm";
  private stormTimer = 45;
  private stormLeft = 0;
  private stormFx = 0;      // 0..1 tinte
  private boltTimer = 0;
  private fogCalm: THREE.Color;
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

  /* misc escena */
  private sun: THREE.DirectionalLight;
  private ambient: THREE.AmbientLight;
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
    this.fogCalm = new THREE.Color(0x05070e);

    this.ambient = new THREE.AmbientLight(0x8899bb, 0.55);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
    this.sun.position.set(260, 150, -320);
    this.scene.add(this.sun);
    const rim = new THREE.HemisphereLight(0x33445f, 0x080a10, 0.5);
    this.scene.add(rim);

    this.buildSky();
    this.buildStation();
    this.buildDebrisAssets();
    for (let i = 0; i < 26; i++) this.spawnDebris(true);
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

    this.record = Number(localStorage.getItem("chatarra_record") || 0);
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
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: radialSprite([[0, col], [1, "rgba(0,0,0,0)"]], 256),
        transparent: true, opacity: 0.14, depthWrite: false,
      }));
      sp.position.set(rand(-700, 700), rand(-260, 340), i === 0 ? -800 : rand(-700, 700));
      sp.scale.setScalar(s);
      this.scene.add(sp);
    });
  }

  /* ---------------------------- estación ----------------------------- */
  private buildStation() {
    const hull = hullTexture();
    const white = new THREE.MeshStandardMaterial({ map: hull, roughness: 0.55, metalness: 0.35 });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x38e1d4, emissive: 0x0e6f68, roughness: 0.4, metalness: 0.3 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x30404f, roughness: 0.6, metalness: 0.5 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xbfefff, emissive: 0x2ec9ff, emissiveIntensity: 0.9, roughness: 0.2 });
    this.stationMats = { white, cyanMat, darkMat, winMat };

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
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 1.6, 8), darkMat);
    top.position.y = 3.4;
    core.add(top);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), winMat);
    beacon.position.y = 4.3;
    core.add(beacon);
    this.beacon = beacon;
    core.add(new THREE.AmbientLight(0x445566, 0.2));

    /* anillo de slots */
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, 0.28, 18), darkMat);
      pad.position.set(Math.cos(a) * 7, -1.55, Math.sin(a) * 7);
      core.add(pad);
      const glowRing = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.05, 6, 24),
        new THREE.MeshBasicMaterial({ color: 0x2a5a66, transparent: true, opacity: 0.8 }));
      glowRing.rotation.x = Math.PI / 2;
      glowRing.position.copy(pad.position).setY(-1.38);
      core.add(glowRing);
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
    foundry.position.set(0, -1.55, 10.5);
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

    const base = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.2, 0.5, 24), darkMat);
    base.position.y = -1.7;
    this.stationCore.add(base);
    this.scene.add(this.stationCore);
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
    const kind: DebrisKind = Math.random() < 0.07 && !this.debris.some((d) => d.kind === "alloy" && d.respawnAt <= 0)
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

  /* --------------------------- astronauta ---------------------------- */
  private buildPlayer() {
    const suit = new THREE.MeshStandardMaterial({ color: 0xe8eef4, roughness: 0.5, metalness: 0.15 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x38e1d4, roughness: 0.4, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x22303c, roughness: 0.6 });
    const visorMat = new THREE.MeshStandardMaterial({ map: visorTexture(), transparent: true, roughness: 0.15 });

    const torso = new THREE.Mesh(new RoundedBoxGeometry(1.15, 1.3, 0.72, 3, 0.2), suit);
    torso.position.y = 1.45;
    this.player.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 14), new THREE.MeshStandardMaterial({ color: 0xf4f8fb, roughness: 0.25, metalness: 0.1 }));
    head.position.y = 2.5;
    this.player.add(head);
    const visor = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.5), visorMat);
    visor.position.set(0, 2.52, -0.47);
    visor.rotation.y = Math.PI;
    this.player.add(visor);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.17, 0.2, 0.74), accent);
    stripe.position.y = 1.62;
    this.player.add(stripe);

    const pack = new THREE.Mesh(new RoundedBoxGeometry(0.86, 1.05, 0.42, 2, 0.12), accent);
    pack.position.set(0, 1.5, 0.56);
    this.player.add(pack);
    for (const sx of [-0.28, 0.28]) {
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.34, 8), dark);
      noz.position.set(sx, 0.86, 0.56);
      this.player.add(noz);
    }
    const glow = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x9df3ec, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(0, 0.42, 0.56);
    glow.rotation.x = Math.PI;
    glow.visible = false;
    this.player.add(glow);
    this.thrustGlow = glow;

    const limbGeo = new THREE.CapsuleGeometry(0.19, 0.62, 4, 8);
    const mk = (x: number, y: number) => {
      const grp = new THREE.Group();
      const m = new THREE.Mesh(limbGeo, suit);
      m.position.y = -0.42;
      grp.add(m);
      const glove = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), accent);
      glove.position.y = -0.86;
      grp.add(glove);
      grp.position.set(x, y, 0);
      this.player.add(grp);
      this.limbs.push(grp);
      return grp;
    };
    mk(-0.78, 1.95);
    mk(0.78, 1.95);
    mk(-0.36, 0.85);
    mk(0.36, 0.85);

    this.player.position.set(4, 2.5, 16);
    this.scene.add(this.player);
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

  /* ------------------------------ eventos ----------------------------- */
  private onKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;
    if (e.code === "KeyE" && !e.repeat && this.started && !this.paused) this.pressHook();
  };
  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };
  private onMouseDown = () => {
    if (this.started && !this.paused && !this.uiOpen && !this.isCoarse) {
      this.canvas.requestPointerLock?.();
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
    if (this.raf) return;
    this.clock.getDelta();
    this.renderer.setAnimationLoop(this.tick);
  }

  begin() {
    this.started = true;
    this.paused = false;
    this.audio.resume();
    this.cb.onToast("¡A recoger chatarra! Engancha escombros y tráelos a la fundidora", "info");
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

  pressHook() {
    if (!this.started || this.paused || this.uiOpen) return;
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

    g.position.set(Math.cos(a) * 7, -1.4, Math.sin(a) * 7);
    g.lookAt(0, -1.4, 0);
    g.scale.setScalar(0.01);
    g.userData.s = 0;
    this.stationCore.add(g);
    this.modules.push({ type, group: g, integrity: 100, off: false });

    if (type === "hangar") this.makeDrone();
    this.audio.build();
    this.cb.onToast(`${info.name} construido`, "ok");
    this.burst(g.position.clone().setY(1), 0x38e1d4, 14, 3);

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

  private updatePlayer(dt: number) {
    const k = this.keys;
    const boost = k["ShiftLeft"] || k["ShiftRight"] || this.touchBoost;
    let ix = (k["KeyD"] ? 1 : 0) - (k["KeyA"] ? 1 : 0) + this.joy.x;
    let iy = (k["KeyW"] ? 1 : 0) - (k["KeyS"] ? 1 : 0) - this.joy.y;
    const up = (k["Space"] ? 1 : 0) - (k["KeyC"] ? 1 : 0);
    const mag = Math.min(1, Math.hypot(ix, iy));
    if (mag > 0.01) {
      ix /= Math.max(1, Math.hypot(ix, iy));
      iy /= Math.max(1, Math.hypot(ix, iy));
    }
    const fwd = this.tmpV.set(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = this.tmpV2.set(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw));
    const accel = (boost ? 30 : 18) * (this.hasModule("energy") ? 1.25 : 1);
    this.pVel.addScaledVector(fwd, iy * accel * dt);
    this.pVel.addScaledVector(right, ix * accel * dt);
    this.pVel.y += up * accel * 0.8 * dt;
    this.pVel.multiplyScalar(Math.exp(-1.05 * dt));
    const maxSpeed = (boost ? 22 : 14) * (this.hasModule("energy") ? 1.12 : 1);
    if (this.pVel.length() > maxSpeed) this.pVel.setLength(maxSpeed);
    this.player.position.addScaledVector(this.pVel, dt);

    const L = this.player.position.length();
    if (L > 110) {
      this.player.position.setLength(110);
      this.pVel.multiplyScalar(-0.25);
    }
    L < 2.2 && this.player.position.setLength(2.2);

    /* oxígeno */
    const rechargeR = this.hasModule("oxygen") ? 22 : 16;
    const nearStation = this.player.position.length() < rechargeR;
    if (nearStation) this.o2 = Math.min(100, this.o2 + 13 * dt);
    else this.o2 = Math.max(0, this.o2 - (boost ? 2.2 : 1) * dt);
    if (this.o2 <= 0 && !this.paused) {
      this.o2 = 100;
      this.releaseAll();
      this.player.position.set(3, 2.5, 6);
      this.pVel.set(0, 0, 0);
      this.hurtFlash = 3;
      this.audio.rescue();
      this.cb.onToast("RESCATE: un dron te pescó del vacío — cuida tu oxígeno", "bad");
    }

    /* animación */
    const sp = this.pVel.length();
    const t = this.clock.elapsedTime;
    for (let i = 0; i < this.limbs.length; i++) {
      this.limbs[i].rotation.x = Math.sin(t * 3 + i * 1.6) * (0.12 + Math.min(0.3, sp * 0.02));
    }
    if (sp > 0.8) {
      const target = Math.atan2(-this.pVel.x, -this.pVel.z);
      let d = target - this.pYaw;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      this.pYaw += d * Math.min(1, dt * 6);
      this.player.rotation.y = this.pYaw;
    }
    const thrusting = mag > 0.05 || up !== 0;
    if (this.thrustGlow) this.thrustGlow.visible = thrusting;
    this.audio.setThrust(thrusting ? (boost ? 1 : 0.55) : 0);
  }

  private updateHook(dt: number) {
    const camDir = this.tmpV.copy(this.player.position)
      .add(new THREE.Vector3(0, 1.6, 0)).sub(this.camera.position).normalize();
    let best: Debris | null = null;
    let bestD = 18;
    for (const d of this.debris) {
      if (d.respawnAt || d.towed) continue;
      const v = this.tmpV2.copy(d.mesh.position).sub(this.player.position);
      const dist = v.length();
      if (dist > 18 || dist < 1.5) continue;
      v.normalize();
      if (v.dot(camDir) < 0.9) continue;
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
      if (this.totalMetal > this.record) this.record = Math.floor(this.totalMetal);
      this.audio.deliver();
      this.cb.onToast(`+${Math.round(gain)} ✦ metal refinado`, "ok");
      this.burst(fp.clone().setY(1.4), 0xf4c542, 16, 3.4);
    }
  }

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

  private updateModules(dt: number) {
    const t = this.clock.elapsedTime;
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
      if (m.off && this.hasModule("workshop")) {
        m.integrity = Math.min(100, m.integrity + 5 * dt);
        if (m.integrity >= 100) this.setModuleOff(m, false);
      }
    }
    /* reparación manual */
    if (this.keys["KeyE"] && !this.uiOpen) {
      const near = this.modules.find((m) => m.off && m.group.getWorldPosition(this.tmpV).distanceTo(this.player.position) < 3.6);
      if (near) {
        this.repairProgress += dt / 3;
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
    if (off) this.cb.onToast("Módulo dañado por la tormenta — manten E junto a él para repararlo", "bad");
  }

  private updateDrone(dt: number) {
    const d = this.drone;
    if (!d) return;
    (d.userData.rotor as THREE.Mesh).rotation.y += dt * 12;
    const speed = 7;
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
      if (this.totalMetal > this.record) this.record = Math.floor(this.totalMetal);
      this.audio.droneBlip();
      this.burst(this.foundryPos.clone().setY(1.4), 0xf4c542, 8, 2.4);
      this.droneState = "idle";
      this.droneTimer = 18;
    }
  }

  private updateStorm(dt: number) {
    const t = this.clock.elapsedTime;
    if (this.storm === "calm") {
      this.stormTimer -= dt;
      this.stormFx = Math.max(0, this.stormFx - dt * 0.6);
      if (this.stormTimer <= 0) {
        this.storm = "warning";
        this.stormLeft = 10;
        this.audio.alarm();
        this.cb.onBanner("⚠ TORMENTA SOLAR EN 10 s", "¡Regresa al radio de la estación!");
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
      const dist = this.player.position.length();
      if (dist > 16) {
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

  private updateCamera(dt: number) {
    this.camYaw -= this.lookBuf.x * 0.005;
    this.camPitch = clamp(this.camPitch - this.lookBuf.y * 0.004, -1.2, 1.2);
    this.lookBuf.x = 0;
    this.lookBuf.y = 0;
    const cp = Math.cos(this.camPitch);
    this.tmpV.set(
      Math.sin(this.camYaw) * cp,
      Math.sin(this.camPitch),
      Math.cos(this.camYaw) * cp
    ).multiplyScalar(this.camDist);
    this.camera.position.copy(this.player.position).add(this.tmpV).add(new THREE.Vector3(0, 1.4, 0));
    this.camera.lookAt(this.player.position.x, this.player.position.y + 1.5, this.player.position.z);
  }

  private updateIntroCam(dt: number) {
    const t = this.clock.elapsedTime * 0.12;
    this.camera.position.set(Math.cos(t) * 17, 5.5 + Math.sin(t * 0.7) * 2, Math.sin(t) * 17);
    this.camera.lookAt(0, 0.5, 0);
  }

  private buildPrompt(): string {
    if (!this.started) return "";
    if (this.storm === "active" && this.player.position.length() > 16) return "¡VUELVE A LA ESTACIÓN! El calor drena tu oxígeno";
    if (this.repairProgress > 0) return `REPARANDO ${Math.floor(this.repairProgress * 100)}%`;
    const nearOff = this.modules.find((m) => m.off && m.group.getWorldPosition(this.tmpV).distanceTo(this.player.position) < 3.6);
    if (nearOff) return "MANTÉN [E] — REPARAR MÓDULO";
    if (this.aimTarget && this.towed.length < 2) return "[E] — ENGANCHAR CHATARRA";
    if (this.towed.length > 0) return "Lleva la chatarra al anillo VERDE de la fundidora · [E] soltar";
    if (this.player.position.length() < 13) return "[B] — CONSTRUIR MÓDULOS";
    return "";
  }

  private emitHud() {
    this.cb.onHud({
      phase: this.started ? "playing" : "intro",
      paused: this.paused,
      o2: Math.round(this.o2),
      metal: Math.floor(this.metal),
      totalMetal: Math.floor(this.totalMetal),
      record: this.record,
      towing: this.towed.length,
      modules: this.modules.filter((m) => !m.off).length,
      storm: this.storm,
      stormIn: Math.max(0, Math.ceil(this.storm === "calm" ? this.stormTimer : this.stormLeft)),
      prompt: this.buildPrompt(),
      repairProgress: this.repairProgress,
      hurtFlash: this.hurtFlash,
      legend: this.legendShown,
    });
  }

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
        this.updateDebris(dt);
        this.updateModules(dt);
        this.updateDrone(dt);
        this.updateStorm(dt);
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
