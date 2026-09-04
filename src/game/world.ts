/* ============================================================
   HOTEL ∞ INFINITO — GRAND HOTEL v4.0
   Lobby central + 3 alas + 12 habitaciones GRANDES (91 m²),
   salas especiales (Salón de Baile, Cocina, Bóveda, Suite ∞),
   tesoros, mobiliario detallado, objetos rompibles y minimapa.
   ============================================================ */
import * as THREE from "three";
import { type FloorTheme } from "./hotel";
import {
  carpetTexture, paintingTexture, signTexture, woodTexture, wallpaperTexture,
  parquetTexture, tileTexture, goldMaterial, gemMaterial, drawStuds,
  disposeObject, damp, rnd, irnd,
} from "./util";
import { rbox, lathe, std } from "./shapes";
import { makeToolPickupMesh, TOOL_ORDER, type ToolType } from "./tools";

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Wing = "hub" | "west" | "east" | "north";

export type Zone = {
  minX: number; maxX: number; minZ: number; maxZ: number;
  kind: "corridor" | "room" | "hub";
  idx: number;
  wing: Wing;
  doorPos: THREE.Vector3;
};

export type LootKind = "coin" | "gold" | "medkit" | "key" | "chest";
export type LootItem = {
  kind: LootKind;
  group: THREE.Group;
  pos: THREE.Vector3;
  taken: boolean;
  value: number;
  phase: number;
};

export type Breakable = {
  group: THREE.Group;
  pos: THREE.Vector3;
  broken: boolean;
  value: number;
  phase: number;
  radius: number;
};

export type ToolPickup = {
  type: ToolType;
  group: THREE.Group;
  spinner: THREE.Group;
  pos: THREE.Vector3;
  taken: boolean;
  phase: number;
};

export type DoorInfo = {
  roomIdx: number;
  panel: THREE.Mesh;
  sign: THREE.Mesh;
  signMat: THREE.MeshBasicMaterial;
  frame: THREE.Group;
  locked: boolean;
  locks: number;        // 0 abierta · 1 llave · 2 bóveda
  broken: boolean;
  open01: number;
  target: number;
  axis: "x" | "z";      // eje de deslizamiento del panel
  baseX: number;
  baseZ: number;
  collider: AABB;
  hp: number;
};

export type RoomInfo = {
  idx: number;
  zone: Zone;
  center: THREE.Vector3;
  door: DoorInfo;
  explored: boolean;
  chest: LootItem | null;
  name: string;
  special: string | null;
  wing: Wing;
};

export type MapRoom = {
  idx: number;
  x1: number; z1: number; x2: number; z2: number;
  door: { x: number; z: number };
  special: string | null;
  locks: number;
};

export type MapData = {
  hub: { x1: number; z1: number; x2: number; z2: number };
  wings: { x1: number; z1: number; x2: number; z2: number }[];
  rooms: MapRoom[];
  elevator: { x: number; z: number };
  bounds: Bounds;
};

export type WorldRefs = {
  group: THREE.Group;
  colliders: AABB[];
  zones: Zone[];
  rooms: RoomInfo[];
  corridor: Zone;
  loot: LootItem[];
  breakables: Breakable[];
  tools: ToolPickup[];
  elevatorPos: THREE.Vector3;
  playerStart: THREE.Vector3;
  spawnPoints: THREE.Vector3[];
  bounds: Bounds;
  map: MapData;
  setElevatorGlow: (t01: number) => void;
  update: (dt: number) => void;
  dispose: () => void;
};

/* ------------------------- planta del hotel ------------------------- */

const T = 0.4;      // grosor de muro
const H = 5.0;      // altura de muro
const CORR = 2.3;   // semiancho de pasillos
const BOUNDS: Bounds = { minX: -33.4, maxX: 33.4, minZ: -30.4, maxZ: 11.3 };

type RoomDef = {
  x1: number; z1: number; x2: number; z2: number;
  dx: number; dz: number;         // centro de la puerta (en el muro)
  axis: "x" | "z";
  wing: Wing;
  special?: string;
  locks?: number;
};

const ROOM_DEFS: RoomDef[] = [
  // ala oeste (2 por lado, 12×8.2 cada una)
  { x1: -33.0, z1: -10.9, x2: -20.6, z2: -2.7, dx: -26.8, dz: -2.5, axis: "x", wing: "west" },
  { x1: -20.2, z1: -10.9, x2: -8.4,  z2: -2.7, dx: -14.3, dz: -2.5, axis: "x", wing: "west" },
  { x1: -20.2, z1: 2.7,   x2: -8.4,  z2: 10.9, dx: -14.3, dz: 2.5,  axis: "x", wing: "west" },
  { x1: -33.0, z1: 2.7,   x2: -20.6, z2: 10.9, dx: -26.8, dz: 2.5,  axis: "x", wing: "west" },
  // ala este
  { x1: 8.4,  z1: -10.9, x2: 20.2, z2: -2.7, dx: 14.3, dz: -2.5, axis: "x", wing: "east" },
  { x1: 20.6, z1: -10.9, x2: 33.0, z2: -2.7, dx: 26.8, dz: -2.5, axis: "x", wing: "east" },
  { x1: 20.6, z1: 2.7,   x2: 33.0, z2: 10.9, dx: 26.8, dz: 2.5,  axis: "x", wing: "east" },
  { x1: 8.4,  z1: 2.7,   x2: 20.2, z2: 10.9, dx: 14.3, dz: 2.5,  axis: "x", wing: "east" },
  // ala norte · salas especiales
  { x1: -10.9, z1: -19.7, x2: -2.7, z2: -8.4,  dx: -2.5, dz: -14.05, axis: "z", wing: "north", special: "SALÓN DE BAILE" },
  { x1: 2.7,   z1: -19.7, x2: 10.9, z2: -8.4,  dx: 2.5,  dz: -14.05, axis: "z", wing: "north", special: "COCINA" },
  { x1: -10.9, z1: -30.0, x2: -2.7, z2: -20.1, dx: -2.5, dz: -25.05, axis: "z", wing: "north", special: "BÓVEDA", locks: 2 },
  { x1: 2.7,   z1: -30.0, x2: 10.9, z2: -20.1, dx: 2.5,  dz: -25.05, axis: "z", wing: "north", special: "SUITE ∞", locks: 1 },
];

function segmentsWithGaps(a: number, b: number, gaps: [number, number][]): [number, number][] {
  const edges = [...gaps].sort((p, q) => p[0] - q[0]);
  const segs: [number, number][] = [];
  let cur = a;
  for (const [gs, ge] of edges) {
    if (gs > cur) segs.push([cur, Math.min(gs, b)]);
    cur = Math.max(cur, ge);
  }
  if (cur < b) segs.push([cur, b]);
  return segs;
}

export function pointInZone(z: Zone, x: number, zz: number): boolean {
  return x >= z.minX && x <= z.maxX && zz >= z.minZ && zz <= z.maxZ;
}

/* ============================ construcción ============================ */

export function buildWorld(scene: THREE.Scene, theme: FloorTheme, quality: "high" | "low", floorIndex: number): WorldRefs {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const accent = new THREE.Color(theme.accent);
  const HiQ = quality === "high";
  const wood = woodTexture();

  /* ------------------------------ suelo ------------------------------ */
  const floorMat = new THREE.MeshStandardMaterial({
    map: (() => {
      const t = marbleFloorTex();
      t.repeat.set(16, 10);
      return t;
    })(),
    roughness: 0.38,
    metalness: 0.06,
  });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(BOUNDS.maxX - BOUNDS.minX, 0.3, BOUNDS.maxZ - BOUNDS.minZ), floorMat);
  floor.position.set((BOUNDS.minX + BOUNDS.maxX) / 2, -0.15, (BOUNDS.minZ + BOUNDS.maxZ) / 2);
  floor.receiveShadow = true;
  group.add(floor);

  /* ------------------------- materiales comunes ------------------------- */
  const wallTex = wallpaperTexture(theme.wall, theme.accent);
  wallTex.repeat.set(4, 1.5);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.55, metalness: 0.02 });
  const trimMat = new THREE.MeshStandardMaterial({ color: "#241610", roughness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62 });
  const brassMat = new THREE.MeshStandardMaterial({ color: "#8a6a2f", roughness: 0.32, metalness: 0.85 });
  const fabricMat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
  const bulbMat = new THREE.MeshStandardMaterial({ color: "#ffe8b0", emissive: "#ffcf7a", emissiveIntensity: 2.2 });

  /* ------------------------------ helpers ------------------------------ */
  const addWall = (axis: "x" | "z", c: number, from: number, to: number, h = H, mat: THREE.Material = wallMat): void => {
    const len = to - from;
    if (len <= 0.05) return;
    const m = new THREE.Mesh(
      axis === "x" ? new THREE.BoxGeometry(len, h, T) : new THREE.BoxGeometry(T, h, len),
      mat
    );
    m.position.set(axis === "x" ? (from + to) / 2 : c, h / 2, axis === "x" ? c : (from + to) / 2);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    colliders.push(
      axis === "x"
        ? { minX: from, maxX: to, minZ: c - T / 2, maxZ: c + T / 2 }
        : { minX: c - T / 2, maxX: c + T / 2, minZ: from, maxZ: to }
    );
  };

  // rodapié decorativo (sin colisión)
  const addTrim = (axis: "x" | "z", c: number, from: number, to: number, side: number): void => {
    const len = to - from;
    if (len <= 0.05) return;
    const m = new THREE.Mesh(
      axis === "x" ? new THREE.BoxGeometry(len, 0.34, 0.09) : new THREE.BoxGeometry(0.09, 0.34, len),
      trimMat
    );
    m.position.set(axis === "x" ? (from + to) / 2 : c + side * (T / 2 + 0.05), 0.17, axis === "x" ? c + side * (T / 2 + 0.05) : (from + to) / 2);
    group.add(m);
  };

  const addBox = (
    w: number, h: number, d: number, x: number, y: number, z: number,
    mat: THREE.Material, solid = false, ry = 0
  ): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    if (solid) {
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    }
    return m;
  };

  const addPainting = (x: number, y: number, z: number, ry: number, seed: number, big = false): void => {
    const w = big ? 2.0 : 1.35, h = big ? 1.5 : 0.98;
    const frame = addBox(w + 0.14, h + 0.14, 0.07, x, y, z, trimMat, false, ry);
    void frame;
    const art = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.08),
      new THREE.MeshStandardMaterial({ map: paintingTexture(seed % 7 + 1), roughness: 0.9 })
    );
    art.position.set(x, y, z);
    art.rotation.y = ry;
    art.castShadow = true;
    group.add(art);
    // desplazar el lienzo medio paso fuera del marco según orientación
    art.translateZ(0.012);
  };

  const addPlant = (x: number, z: number): void => {
    const potMat = new THREE.MeshStandardMaterial({ color: "#6e3b22", roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: "#1e5c33", roughness: 0.9 });
    const leafMat2 = new THREE.MeshStandardMaterial({ color: "#2a7a44", roughness: 0.9 });
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pot = new THREE.Mesh(
      lathe([[0.02, 0], [0.4, 0], [0.46, 0.18], [0.34, 0.56], [0.38, 0.62], [0.42, 0.66], [0.4, 0.7], [0.36, 0.7]], 0.78, 14),
      potMat
    );
    pot.position.y = 0;
    pot.castShadow = true;
    g.add(pot);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.55, 8), new THREE.MeshStandardMaterial({ color: "#4a2f18", roughness: 0.9 }));
    trunk.position.y = 0.95;
    g.add(trunk);
    for (let l = 0; l < 6; l++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.3 - l * 0.03, 10, 8), l % 2 ? leafMat : leafMat2);
      leaf.position.set(rnd(-0.16, 0.16), 1.18 + l * 0.2, rnd(-0.16, 0.16));
      leaf.scale.set(1, 0.82, 1);
      leaf.castShadow = true;
      g.add(leaf);
    }
    group.add(g);
    colliders.push({ minX: x - 0.38, maxX: x + 0.38, minZ: z - 0.38, maxZ: z + 0.38 });
  };

  /* =============================== LOBBY =============================== */
  // El lobby es la caja x[-8.4, 8.4] × z[-8.4, 8.4].
  // Huecos del muro NORTE (z=-8.2): nicho del ascensor x[-6.7,-4.3] y
  // boca del pasillo norte x[-2.3,2.3]. Los muros llegan hasta x=±11.3
  // para empalmar con el ala norte y no dejar esquinas abiertas.
  addWall("x", -8.2, -11.3, -6.7);   // norte · izquierda del ascensor
  addWall("x", -8.2, -4.3, -2.3);    // norte · entre ascensor y pasillo
  addWall("x", -8.2, 2.3, 11.3);     // norte · derecha del pasillo
  // Muros OESTE / ESTE (x=∓8.2) con la boca del pasillo z[-2.3,2.3];
  // bajan hasta z=±11.3 para cerrar el borde este de las hab 103/108.
  addWall("z", -8.2, -11.3, -2.3);   // oeste · tramo norte
  addWall("z", -8.2, 2.3, 11.3);     // oeste · tramo sur
  addWall("z", 8.2, -11.3, -2.3);    // este · tramo norte
  addWall("z", 8.2, 2.3, 11.3);      // este · tramo sur
  // Muro SUR (z=8.2) cerrado del todo (protege la cámara)
  addWall("x", 8.2, -8.4, 8.4);

  // Macizos de esquina: donde se cruzan las tres crujías las plantas se
  // solapan 2,5 × 2,5 m; los sellamos como pilares estructurales.
  addBox(2.5, H, 2.5, -9.65, H / 2, -9.65, wallMat, true);  // NO · salón × hab oeste
  addBox(2.5, H, 2.5, 9.65, H / 2, -9.65, wallMat, true);   // NE · cocina × hab este

  // Testeros laterales del nicho del ascensor (sin ellos el nicho
  // quedaría abierto hacia el SALÓN DE BAILE que está justo detrás).
  addWall("z", -6.7, -9.5, -8.3);
  addWall("z", -4.3, -9.5, -8.3);

  // alfombra grande del lobby
  const hubCarpet = new THREE.Mesh(
    new THREE.BoxGeometry(12.5, 0.05, 12.5),
    new THREE.MeshStandardMaterial({ map: carpetTexture(theme.carpet, "#c99b3f"), roughness: 0.95 })
  );
  hubCarpet.position.set(0, 0.03, 0.4);
  hubCarpet.receiveShadow = true;
  group.add(hubCarpet);

  // fuente central (vasija torneada + agua + orbe)
  {
    const stone = new THREE.MeshStandardMaterial({ color: "#3a4356", roughness: 0.55, metalness: 0.15 });
    const basin = new THREE.Mesh(
      lathe([[0.02, 0], [1.6, 0], [1.85, 0.12], [1.92, 0.42], [1.78, 0.52], [1.66, 0.5], [1.6, 0.34], [0.35, 0.3], [0.3, 0]], 0.62, 24),
      stone
    );
    basin.position.set(0, 0, 0);
    basin.castShadow = true;
    basin.receiveShadow = true;
    group.add(basin);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.86, 0.075, 10, 28), stone);
    lip.rotation.x = Math.PI / 2;
    lip.position.y = 0.63;
    group.add(lip);
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(1.52, 1.45, 0.09, 24),
      new THREE.MeshStandardMaterial({ color: theme.accent, emissive: accent, emissiveIntensity: 0.8, roughness: 0.12, metalness: 0.45 })
    );
    water.position.set(0, 0.36, 0);
    group.add(water);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 1.0, 12), stone);
    pillar.position.set(0, 0.85, 0);
    pillar.castShadow = true;
    group.add(pillar);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.34, 0.16, 16), stone);
    bowl.position.set(0, 1.32, 0);
    group.add(bowl);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 14), goldMaterial());
    orb.position.set(0, 1.72, 0);
    group.add(orb);
    colliders.push({ minX: -2.0, maxX: 2.0, minZ: -2.0, maxZ: 2.0 });
  }

  // lámpara de araña
  {
    const g = new THREE.Group();
    g.position.set(0, 0, 0);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 6), brassMat);
    chain.position.y = 4.3;
    g.add(chain);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.06, 8, 24), brassMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 3.55;
    g.add(ring);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), bulbMat);
      bulb.position.set(Math.cos(a) * 0.85, 3.72, Math.sin(a) * 0.85);
      g.add(bulb);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), bulbMat);
    core.position.y = 3.55;
    g.add(core);
    group.add(g);
  }
  const chandelier = new THREE.PointLight(new THREE.Color("#ffd9a0"), HiQ ? 46 : 30, 24, 1.7);
  chandelier.position.set(0, 3.9, 0);
  group.add(chandelier);

  // recepción (norte del lobby, junto al ascensor)
  {
    addBox(4.4, 1.05, 0.9, -1.6, 0.52, -6.6, woodMat, true);
    addBox(4.5, 0.08, 1.0, -1.6, 1.1, -6.6, brassMat);
    // campanilla y lámpara del mostrador
    const bell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), goldMaterial());
    bell.position.set(-2.9, 1.24, -6.5);
    group.add(bell);
    addBox(0.5, 0.34, 0.4, -0.6, 1.32, -6.6, trimMat);
    const screen = addBox(0.46, 0.3, 0.04, -0.6, 1.34, -6.38, new THREE.MeshStandardMaterial({ color: "#0d2438", emissive: theme.accent, emissiveIntensity: 0.5 }));
    void screen;
    addPainting(-1.6, 3.4, -7.85, 0, floorIndex + 3, true);
  }

  // sofás y mesita (cojines biselados + apoyacodos cápsula)
  const sofa = (x: number, z: number, ry: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    const c = fabricMat("#5a2230");
    const cushion = fabricMat("#743044");
    const seat = new THREE.Mesh(rbox(2.4, 0.42, 0.95, 0.1, 3), c);
    seat.position.y = 0.26;
    seat.castShadow = true;
    g.add(seat);
    const back = new THREE.Mesh(rbox(2.4, 0.8, 0.26, 0.12, 3), c);
    back.position.set(0, 0.72, -0.37);
    back.rotation.x = -0.1;
    back.castShadow = true;
    g.add(back);
    for (const side of [-1.08, 1.08]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.62, 4, 10), c);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(side, 0.55, 0.02);
      arm.castShadow = true;
      g.add(arm);
    }
    for (const cx of [-0.57, 0.57]) {
      const cush = new THREE.Mesh(rbox(1.06, 0.15, 0.78, 0.07, 2), cushion);
      cush.position.set(cx, 0.54, 0.03);
      cush.castShadow = true;
      g.add(cush);
    }
    // patas
    for (const px of [-1.0, 1.0]) {
      for (const pz of [-0.32, 0.32]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.16, 8), trimMat);
        leg.position.set(px, 0.07, pz);
        g.add(leg);
      }
    }
    group.add(g);
    colliders.push({ minX: x - 1.3, maxX: x + 1.3, minZ: z - 0.62, maxZ: z + 0.62 });
  };
  sofa(5.2, 4.6, Math.PI * 0.75);
  sofa(-5.2, 4.6, -Math.PI * 0.75);

  // carrito de equipaje
  {
    const g = new THREE.Group();
    g.position.set(-5.6, 0, -2.9);
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.85), brassMat);
    cart.position.y = 0.34;
    cart.castShadow = true;
    g.add(cart);
    for (let i = 0; i < 4; i++) {
      const handleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), brassMat);
      handleBar.position.set(i < 2 ? -0.55 : 0.55, 0.75, i % 2 ? -0.36 : 0.36);
      g.add(handleBar);
    }
    const cases = ["#7a1f1f", "#1f3a7a", "#3a2a1a"];
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.44), fabricMat(cases[i]));
      s.position.set(rnd(-0.18, 0.18), 0.6 + i * 0.42, rnd(-0.1, 0.1));
      s.rotation.y = rnd(-0.3, 0.3);
      s.castShadow = true;
      g.add(s);
    }
    group.add(g);
    colliders.push({ minX: -6.3, maxX: -4.9, minZ: -3.4, maxZ: -2.4 });
  }

  addPlant(-6.9, 6.9);
  addPlant(6.9, 6.9);
  addPlant(6.9, -6.9);
  addPainting(0, 3.0, 7.97, Math.PI, floorIndex * 2 + 1, true);
  addPainting(-7.95, 3.0, 5.4, Math.PI / 2, floorIndex * 2 + 4);
  addPainting(7.95, 3.0, 5.4, -Math.PI / 2, floorIndex * 2 + 6);

  /* ---------------------------- ascensor (norte) ---------------------------- */
  const elevatorPos = new THREE.Vector3(-5.5, 0, -6.4);
  let setElevatorGlow: (t01: number) => void = () => undefined;
  {
    const jambL = addBox(0.24, 4.6, 0.6, -6.75, 2.3, -8.2, brassMat);
    void jambL;
    addBox(0.24, 4.6, 0.6, -4.25, 2.3, -8.2, brassMat);
    addBox(2.75, 1.2, 0.6, -5.5, 4.0, -8.2, brassMat);
    // fondo del hueco
    addBox(2.7, 3.4, 0.25, -5.5, 1.7, -9.35, new THREE.MeshStandardMaterial({ color: theme.accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.4 }));
    colliders.push({ minX: -6.9, maxX: -4.1, minZ: -9.5, maxZ: -8.45 });
    const doorMat = new THREE.MeshStandardMaterial({ color: "#9a7a3a", roughness: 0.26, metalness: 0.92 });
    const eDoorL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 0.12), doorMat);
    eDoorL.position.set(-6.1, 1.6, -8.2);
    eDoorL.castShadow = true;
    group.add(eDoorL);
    const eDoorR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.2, 0.12), doorMat);
    eDoorR.position.set(-4.9, 1.6, -8.2);
    eDoorR.castShadow = true;
    group.add(eDoorR);
    const elevLight = new THREE.PointLight(accent, HiQ ? 18 : 12, 10, 1.8);
    elevLight.position.set(-5.5, 2.6, -7.2);
    group.add(elevLight);
    setElevatorGlow = (t01: number) => {
      eDoorL.position.x = -6.1 - 1.14 * t01;
      eDoorR.position.x = -4.9 + 1.14 * t01;
    };
    const floorSign = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 1.1),
      new THREE.MeshBasicMaterial({ map: signTexture(theme.code, "#0a0f1a", theme.accent, theme.name) })
    );
    floorSign.position.set(-5.5, 4.78, -7.86);
    group.add(floorSign);
  }

  /* ============================ ALAS / PASILLOS ============================ */
  // muros exteriores de cada ala
  addWall("z", -33.2, -11.3, 11.3);   // ala oeste · muro exterior
  addWall("z", 33.2, -11.3, 11.3);    // ala este · muro exterior
  addWall("x", -11.1, -33.4, -8.2);   // ala oeste · muro norte exterior
  addWall("x", 11.1, -33.4, -8.2);    // ala oeste · muro sur exterior
  addWall("x", -11.1, 8.2, 33.4);     // ala este · muro norte exterior
  addWall("x", 11.1, 8.2, 33.4);      // ala este · muro sur exterior
  addWall("x", -11.1, -11.3, -8.2);   // ala norte · muros exteriores laterales
  addWall("x", 11.1, -11.3, -8.2);
  addWall("z", -11.1, -30.4, -8.2);
  addWall("z", 11.1, -30.4, -8.2);
  addWall("x", -30.2, -11.3, 11.3);   // ala norte · muro del fondo

  // divisores entre habitaciones de alas este/oeste
  for (const dx of [-20.4, 20.4]) {
    addWall("z", dx, -10.9, -2.7);
    addWall("z", dx, 2.7, 10.9);
  }
  // divisores del ala norte
  addWall("x", -19.9, -10.9, -2.7);
  addWall("x", -19.9, 2.7, 10.9);

  // muros de pasillo con huecos de puerta
  // (llegan hasta x=∓8.0 para penetrar los muros del lobby y no dejar rendijas)
  for (const wing of ["west", "east"] as const) {
    const sx = wing === "west" ? -1 : 1;
    for (const sz of [-1, 1] as const) {
      const zc = 2.5 * sz;
      const gaps: [number, number][] = ROOM_DEFS
        .filter((r) => r.wing === wing && Math.sign(r.dz) === sz)
        .map((r) => [r.dx - 1.0, r.dx + 1.0] as [number, number]);
      const a = sx < 0 ? -33.2 : 8.0;
      const b = sx < 0 ? -8.0 : 33.2;
      for (const [s, e] of segmentsWithGaps(a, b, gaps)) {
        addWall("x", zc, s, e);
        addTrim("x", zc, s, e, -sz);
      }
    }
  }
  for (const sx of [-1, 1] as const) {
    const xc = 2.5 * sx;
    const gaps: [number, number][] = ROOM_DEFS
      .filter((r) => r.wing === "north" && Math.sign(r.dx) === sx)
      .map((r) => [r.dz - 1.0, r.dz + 1.0] as [number, number]);
    for (const [s, e] of segmentsWithGaps(-30.2, -8.2, gaps)) {
      addWall("z", xc, s, e);
      addTrim("z", xc, s, e, -sx);
    }
  }

  // dinteles sobre cada puerta
  for (const r of ROOM_DEFS) {
    if (r.axis === "x") {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.7, T + 0.06), wallMat);
      lintel.position.set(r.dx, 4.15, r.dz);
      group.add(lintel);
    } else {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(T + 0.06, 1.7, 2.1), wallMat);
      lintel.position.set(r.dx, 4.15, r.dz);
      group.add(lintel);
    }
  }

  // alfombras de pasillo
  const corrCarpetMat = new THREE.MeshStandardMaterial({
    map: carpetTexture(theme.carpet, "#c99b3f"),
    roughness: 0.95,
  });
  const corrCarpet = (x1: number, z1: number, x2: number, z2: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1, 0.045, z2 - z1), corrCarpetMat);
    m.position.set((x1 + x2) / 2, 0.024, (z1 + z2) / 2);
    m.receiveShadow = true;
    group.add(m);
  };
  corrCarpet(-32.9, -2.05, -8.3, 2.05);
  corrCarpet(8.3, -2.05, 32.9, 2.05);
  corrCarpet(-2.05, -29.9, 2.05, -8.3);

  // luces y apliques de pasillo
  const hallLights: [number, number][] = [[-20, 0], [20, 0], [0, -19]];
  for (const [lx, lz] of hallLights) {
    if (!HiQ && Math.abs(lx) > 25) continue;
    const pl = new THREE.PointLight(new THREE.Color("#ffd9a0"), HiQ ? 34 : 24, 20, 1.8);
    pl.position.set(lx, 4.2, lz);
    group.add(pl);
  }
  for (let i = 0; i < 10; i++) {
    const x = -28 + i * 6.2;
    if (Math.abs(x) < 9) continue;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bulbMat);
    bulb.position.set(x, 4.3, i % 2 ? 2.2 : -2.2);
    group.add(bulb);
  }
  for (let i = 0; i < 4; i++) {
    const z = -27 + i * 6.2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bulbMat);
    bulb.position.set(i % 2 ? 2.2 : -2.2, 4.3, z);
    group.add(bulb);
  }
  // cuadros de pasillo (a ras del muro, sin hundirse)
  for (let i = 0; i < 8; i++) {
    const x = -26 + (i % 4) * 17.3;
    addPainting(x, 3.1, i % 2 ? 2.25 : -2.25, i % 2 ? Math.PI : 0, floorIndex * 5 + i);
  }

  /* ============================ HABITACIONES ============================ */
  const rooms: RoomInfo[] = [];
  const loot: LootItem[] = [];
  const breakables: Breakable[] = [];
  const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12);
  const coinMat = new THREE.MeshStandardMaterial({ color: "#f4c542", emissive: "#a97f10", emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.25 });

  const addCoin = (x: number, z: number, value: number): void => {
    const coin = new THREE.Mesh(coinGeo, coinMat);
    coin.rotation.x = Math.PI / 2;
    coin.castShadow = true;
    const g = new THREE.Group();
    g.add(coin);
    g.position.set(x, 0.5, z);
    group.add(g);
    loot.push({ kind: "coin", group: g, pos: g.position.clone(), taken: false, value, phase: rnd(0, 6.28) });
  };
  const addGoldPile = (x: number, z: number, value: number): void => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const nug = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.14, 0.24), 10, 8), goldMaterial());
      nug.position.set(rnd(-0.16, 0.16), 0.08 + i * 0.1, rnd(-0.16, 0.16));
      nug.scale.y = 0.55;
      nug.castShadow = true;
      g.add(nug);
    }
    g.position.set(x, 0, z);
    group.add(g);
    loot.push({ kind: "gold", group: g, pos: g.position.clone(), taken: false, value, phase: rnd(0, 6.28) });
  };
  const addGem = (x: number, z: number, value: number): void => {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), gemMaterial("#3ce0c8"));
    gem.castShadow = true;
    const g = new THREE.Group();
    g.add(gem);
    g.position.set(x, 0.55, z);
    group.add(g);
    loot.push({ kind: "gold", group: g, pos: g.position.clone(), taken: false, value, phase: rnd(0, 6.28) });
  };
  const addMedkit = (x: number, z: number): void => {
    const kit = makeMedkitMesh();
    kit.position.set(x, 0.55, z);
    group.add(kit);
    loot.push({ kind: "medkit", group: kit, pos: kit.position.clone(), taken: false, value: 30, phase: rnd(0, 6.28) });
  };

  const addVase = (x: number, z: number, onY = 0): Breakable => {
    const g = new THREE.Group();
    const clayMat = new THREE.MeshStandardMaterial({ color: "#b8874f", roughness: 0.32, metalness: 0.25 });
    const body = new THREE.Mesh(
      lathe([[0.02, 0], [0.24, 0.04], [0.34, 0.32], [0.3, 0.62], [0.16, 0.85], [0.12, 0.95], [0.15, 1.05], [0.13, 1.1]], 0.5, 14),
      clayMat
    );
    body.position.y = 0;
    body.castShadow = true;
    g.add(body);
    const bandMat = new THREE.MeshStandardMaterial({ color: "#e9b23c", metalness: 0.7, roughness: 0.35 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.014, 6, 14), bandMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.42;
    g.add(band);
    // ramita seca
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 5), new THREE.MeshStandardMaterial({ color: "#5a4028", roughness: 0.9 }));
    twig.position.set(0.02, 0.62, 0);
    twig.rotation.z = 0.25;
    g.add(twig);
    g.position.set(x, onY, z);
    group.add(g);
    const b: Breakable = { group: g, pos: g.position.clone(), broken: false, value: irnd(6, 14), phase: rnd(0, 6.28), radius: 0.42 };
    breakables.push(b);
    return b;
  };

  const addPlate = (x: number, y: number, z: number): void => {
    const plate = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.12, 0.05, 14),
      new THREE.MeshStandardMaterial({ color: "#e8e4da", roughness: 0.3, metalness: 0.1 })
    );
    plate.castShadow = true;
    const g = new THREE.Group();
    g.add(plate);
    g.position.set(x, y, z);
    group.add(g);
    breakables.push({ group: g, pos: g.position.clone(), broken: false, value: irnd(4, 9), phase: rnd(0, 6.28), radius: 0.4 });
  };

  const addBed = (x: number, z: number, facing: 1 | -1, king = false): void => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const w = king ? 2.2 : 1.6;
    const base = new THREE.Mesh(rbox(w, 0.42, 2.5, 0.1, 3), woodMat);
    base.position.y = 0.22;
    base.castShadow = true;
    g.add(base);
    const mattress = new THREE.Mesh(rbox(w - 0.12, 0.32, 2.35, 0.13, 3), fabricMat("#d8d2c2"));
    mattress.position.y = 0.56;
    g.add(mattress);
    // almohadas almohadadas (biseles altos = forma de cojín)
    const pillow = new THREE.Mesh(rbox(w - 0.55, 0.2, 0.56, 0.09, 3), fabricMat("#f0ece0"));
    pillow.position.set(0, 0.78, facing * -0.78);
    pillow.rotation.x = facing * -0.06;
    g.add(pillow);
    if (king) {
      const p2 = pillow.clone();
      p2.position.x = 0.55;
      pillow.position.x = -0.55;
      g.add(p2);
    }
    // manta con doble pliegue
    const blanket = new THREE.Mesh(rbox(w, 0.1, 1.45, 0.05, 2), fabricMat(theme.accent));
    blanket.position.set(0, 0.74, facing * 0.45);
    g.add(blanket);
    const fold = new THREE.Mesh(rbox(w - 0.14, 0.055, 0.3, 0.025, 2), fabricMat(theme.wall));
    fold.position.set(0, 0.8, facing * -0.14);
    g.add(fold);
    const head = new THREE.Mesh(rbox(w + 0.2, 1.15, 0.16, 0.07, 3), woodMat);
    head.position.set(0, 0.88, facing * -1.28);
    head.castShadow = true;
    g.add(head);
    if (king) {
      for (const px of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.1, 10), woodMat);
        post.position.set(px * (w / 2 + 0.05), 1.05, facing * -1.25);
        g.add(post);
        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), goldMaterial());
        finial.position.set(px * (w / 2 + 0.05), 2.13, facing * -1.25);
        g.add(finial);
      }
    }
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    group.add(g);
    colliders.push({ minX: x - w / 2 - 0.05, maxX: x + w / 2 + 0.05, minZ: z - 1.32, maxZ: z + 1.32 });
  };

  const addNightstand = (x: number, z: number, withLamp = true): void => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const body = new THREE.Mesh(rbox(0.68, 0.6, 0.68, 0.07, 2), woodMat);
    body.position.y = 0.3;
    body.castShadow = true;
    g.add(body);
    const drawer = new THREE.Mesh(rbox(0.52, 0.16, 0.03, 0.02, 2), trimMat);
    drawer.position.set(0, 0.38, 0.35);
    g.add(drawer);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), brassMat);
    knob.position.set(0, 0.38, 0.38);
    g.add(knob);
    group.add(g);
    colliders.push({ minX: x - 0.36, maxX: x + 0.36, minZ: z - 0.36, maxZ: z + 0.36 });
    if (withLamp) {
      const lampG = new THREE.Group();
      lampG.position.set(x, 0.6, z);
      const foot = new THREE.Mesh(
        lathe([[0.02, 0], [0.14, 0], [0.1, 0.06], [0.035, 0.2], [0.03, 0.26]], 0.28, 12), brassMat
      );
      lampG.add(foot);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), bulbMat);
      bulb.position.y = 0.36;
      lampG.add(bulb);
      const shade = new THREE.Mesh(
        lathe([[0.09, 0], [0.2, 0.5], [0.24, 1]], 0.3, 14),
        new THREE.MeshStandardMaterial({ color: "#e8c890", roughness: 0.8, emissive: "#e8b06a", emissiveIntensity: 0.35, side: THREE.DoubleSide })
      );
      shade.position.y = 0.32;
      lampG.add(shade);
      group.add(lampG);
    }
  };

  const addWardrobe = (x: number, z: number, ry: number): void => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    const body = new THREE.Mesh(rbox(1.9, 2.6, 0.72, 0.1, 3), woodMat);
    body.position.y = 1.3;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    const seam = new THREE.Mesh(rbox(0.03, 2.2, 0.05, 0.01, 1), trimMat);
    seam.position.set(0, 1.2, 0.37);
    g.add(seam);
    // moldura superior + zócalo
    const crown = new THREE.Mesh(rbox(2.02, 0.14, 0.84, 0.04, 2), trimMat);
    crown.position.y = 2.62;
    g.add(crown);
    const plinth = new THREE.Mesh(rbox(1.96, 0.16, 0.78, 0.03, 2), trimMat);
    plinth.position.y = 0.08;
    g.add(plinth);
    for (const px of [-0.22, 0.22]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), brassMat);
      knob.position.set(px, 1.25, 0.39);
      g.add(knob);
    }
    group.add(g);
    colliders.push({ minX: x - 0.98, maxX: x + 0.98, minZ: z - 0.4, maxZ: z + 0.4 });
  };

  const addDresserTV = (x: number, z: number, ry: number): void => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    const d = new THREE.Mesh(rbox(1.7, 0.72, 0.55, 0.08, 3), woodMat);
    d.position.y = 0.36;
    d.castShadow = true;
    g.add(d);
    for (const px of [-0.42, 0.42]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), brassMat);
      knob.position.set(px, 0.42, 0.29);
      g.add(knob);
    }
    const tv = new THREE.Mesh(
      rbox(1.3, 0.78, 0.09, 0.035, 2),
      new THREE.MeshStandardMaterial({ color: "#0a0d14", roughness: 0.3, emissive: "#16283f", emissiveIntensity: 0.55 })
    );
    tv.position.set(0, 1.15, -0.05);
    tv.castShadow = true;
    g.add(tv);
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.18, 10), trimMat);
    stand.position.set(0, 0.81, -0.05);
    g.add(stand);
    const foot = new THREE.Mesh(rbox(0.5, 0.04, 0.24, 0.015, 2), trimMat);
    foot.position.set(0, 0.74, -0.05);
    g.add(foot);
    group.add(g);
    colliders.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.45, maxZ: z + 0.45 });
  };

  const addRug = (x: number, z: number, w: number, d: number, color: string): void => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), fabricMat(color));
    m.position.set(x, 0.03, z);
    m.receiveShadow = true;
    group.add(m);
  };

  const addCrateStack = (x: number, z: number): void => {
    const crateMat = new THREE.MeshStandardMaterial({ color: "#7a5a34", roughness: 0.85 });
    const bandMat = new THREE.MeshStandardMaterial({ color: "#4a3320", roughness: 0.8 });
    const n = irnd(2, 3);
    for (let i = 0; i < n; i++) {
      const s = rnd(0.55, 0.8);
      const c = new THREE.Mesh(rbox(s, s * 0.8, s, 0.05, 2), crateMat);
      c.position.set(x + rnd(-0.2, 0.2), s * 0.4 + i * s * 0.8, z + rnd(-0.2, 0.2));
      c.rotation.y = rnd(-0.4, 0.4);
      c.castShadow = true;
      c.receiveShadow = true;
      const band = new THREE.Mesh(new THREE.TorusGeometry(s * 0.52, 0.018, 6, 4), bandMat);
      band.rotation.x = Math.PI / 2;
      band.rotation.z = Math.PI / 4;
      band.position.y = -s * 0.05;
      c.add(band);
      group.add(c);
    }
    colliders.push({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 });
  };

  const chestAt = (room: RoomInfo, x: number, z: number, value: number, scale = 1): void => {
    const chest = makeChestMesh(theme.accent);
    chest.position.set(x, 0.02, z);
    chest.scale.setScalar(scale);
    chest.rotation.y = room.zone.maxZ < 0 ? Math.PI : 0;
    if (room.zone.wing === "north") chest.rotation.y = room.zone.minX < 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(chest);
    colliders.push({ minX: x - 0.5 * scale, maxX: x + 0.5 * scale, minZ: z - 0.4 * scale, maxZ: z + 0.4 * scale });
    room.chest = { kind: "chest", group: chest, pos: chest.position.clone(), taken: false, value, phase: 0 };
  };

  /* ---- FIN PARTE 2 ---- */

  /* ------------------- bucle de habitaciones ------------------- */
  for (let i = 0; i < ROOM_DEFS.length; i++) {
    const def = ROOM_DEFS[i];
    const cx = (def.x1 + def.x2) / 2;
    const cz = (def.z1 + def.z2) / 2;
    const sz: 1 | -1 = def.z1 < 0 && def.z2 < 0 ? -1 : def.wing === "north" ? -1 : 1;
    const facing: 1 | -1 = (sz === -1 ? 1 : -1) as 1 | -1;
    const locks = def.locks ?? 0;
    const name = def.special ?? `HAB ${100 + floorIndex * 13 + i * 2}`;

    const zone: Zone = {
      minX: def.x1, maxX: def.x2, minZ: def.z1, maxZ: def.z2,
      kind: "room", idx: i, wing: def.wing,
      doorPos: def.axis === "x"
        ? new THREE.Vector3(def.dx, 0, def.dz - Math.sign(def.dz) * 1.35)
        : new THREE.Vector3(def.dx - Math.sign(def.dx) * 1.35, 0, def.dz),
    };
    const center = new THREE.Vector3(cx, 0, cz);

    /* ---- puerta ---- */
    const frame = new THREE.Group();
    const jambGeo = def.axis === "x" ? new THREE.BoxGeometry(0.14, 3.45, 0.3) : new THREE.BoxGeometry(0.3, 3.45, 0.14);
    const jambL = new THREE.Mesh(jambGeo, trimMat);
    if (def.axis === "x") jambL.position.set(def.dx - 1.02, 1.72, def.dz);
    else jambL.position.set(def.dx, 1.72, def.dz - 1.02);
    frame.add(jambL);
    const jambR = jambL.clone();
    if (def.axis === "x") jambR.position.x = def.dx + 1.02;
    else jambR.position.z = def.dz + 1.02;
    frame.add(jambR);
    const header = def.axis === "x"
      ? new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.2, 0.3), trimMat)
      : new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 2.24), trimMat);
    header.position.set(def.dx, 3.45, def.dz);
    frame.add(header);
    group.add(frame);

    const vault = def.special === "BÓVEDA";
    const panelMat = vault
      ? new THREE.MeshStandardMaterial({ color: "#a3801f", roughness: 0.3, metalness: 0.95, emissive: "#6a4d08", emissiveIntensity: 0.25 })
      : new THREE.MeshStandardMaterial({ color: locks > 0 ? (locks > 1 ? "#6a5518" : "#5a1414") : "#3a2517", roughness: 0.62 });
    const panel = new THREE.Mesh(
      def.axis === "x" ? new THREE.BoxGeometry(1.9, 3.35, 0.15) : new THREE.BoxGeometry(0.15, 3.35, 1.9),
      panelMat
    );
    panel.position.set(def.dx, 1.67, def.dz);
    panel.castShadow = true;
    panel.receiveShadow = true;
    group.add(panel);

    const signMat = new THREE.MeshBasicMaterial({
      map: def.special
        ? signTexture(def.special, locks > 0 ? "#221a06" : "#151009", locks > 0 ? "#e9b23c" : theme.accent)
        : signTexture(name.replace("HAB ", ""), "#151009", locks > 0 ? "#ff5a4e" : "#d9b04c"),
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(def.special ? 1.6 : 0.95, 0.5), signMat);
    if (def.axis === "x") {
      sign.position.set(def.dx, 2.98, def.dz + (def.dz < 0 ? 0.2 : -0.2));
      if (def.dz > 0) sign.rotation.y = Math.PI;
    } else {
      sign.position.set(def.dx + (def.dx < 0 ? 0.2 : -0.2), 2.98, def.dz);
      sign.rotation.y = def.dx < 0 ? Math.PI / 2 : -Math.PI / 2;
    }
    group.add(sign);

    const sconce = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: locks > 0 ? 2.2 : 1.3, roughness: 0.4 }));
    if (def.axis === "x") sconce.position.set(def.dx + 1.35, 2.5, def.dz + (def.dz < 0 ? 0.24 : -0.24));
    else sconce.position.set(def.dx + (def.dx < 0 ? 0.24 : -0.24), 2.5, def.dz + 1.35);
    group.add(sconce);

    const door: DoorInfo = {
      roomIdx: i,
      panel,
      sign,
      signMat,
      frame,
      locked: locks > 0,
      locks,
      broken: false,
      open01: 0,
      target: 0,
      axis: def.axis,
      baseX: def.dx,
      baseZ: def.dz,
      collider: def.axis === "x"
        ? { minX: def.dx - 0.95, maxX: def.dx + 0.95, minZ: def.dz - 0.2, maxZ: def.dz + 0.2 }
        : { minX: def.dx - 0.2, maxX: def.dx + 0.2, minZ: def.dz - 0.95, maxZ: def.dz + 0.95 },
      hp: vault ? 340 : 95,
    };

    const room: RoomInfo = { idx: i, zone, center, door, explored: false, chest: null, name, special: def.special ?? null, wing: def.wing };
    rooms.push(room);

    /* ---- interiores ---- */
    if (def.wing === "north") {
      buildSpecialRoom(room, def, cx, cz, facing);
    } else {
      const arch = i % 4 === 3 ? 3 : (i + floorIndex) % 3;
      buildWingRoom(room, def, arch, cx, cz, facing, sz);
    }
  }

  /* ------------------- constructores de interiores ------------------- */

  function buildWingRoom(room: RoomInfo, def: RoomDef, arch: number, cx: number, cz: number, facing: 1 | -1, sz: 1 | -1): void {
    const w = def.x2 - def.x1;
    const d = def.z2 - def.z1;

    if (arch === 0) {
      // DOBLE · dos camas, mesitas, armario, cómoda con TV
      addBed(cx - 2.3, cz + sz * 2.4, facing);
      addBed(cx + 2.3, cz + sz * 2.4, facing);
      addNightstand(cx - 3.9, cz + sz * 2.4);
      addNightstand(cx + 3.9, cz + sz * 2.4);
      addVase(cx + 3.9, cz + sz * 2.4, 0.66);
      addWardrobe(cx + 4.6, cz - sz * 3.15, 0);
      addDresserTV(cx - 4.4, cz - sz * 3.15, Math.PI);
      addRug(cx, cz - sz * 0.5, 4.6, 3.1, theme.wall);
      addPainting(cx - 1.7, 3.0, cz + sz * 4.02, sz > 0 ? Math.PI : 0, room.idx + floorIndex);
      addPainting(cx + 1.7, 3.0, cz + sz * 4.02, sz > 0 ? Math.PI : 0, room.idx + floorIndex + 2);
      addVase(cx - 5.1, cz - sz * 3.5);
      for (let c = 0; c < 5; c++) addCoin(cx + rnd(-4, 4), cz + rnd(-2.6, 2.6), irnd(3, 8));
      if (Math.random() < 0.35) addMedkit(cx + rnd(-3, 3), cz + rnd(-2, 2));
    } else if (arch === 1) {
      // KING · cama grande, sofá, escritorio
      addBed(cx, cz + sz * 2.4, facing, true);
      addNightstand(cx - 1.8, cz + sz * 2.4);
      addNightstand(cx + 1.8, cz + sz * 2.4);
      addVase(cx - 1.8, cz + sz * 2.4, 0.66);
      sofa(cx - 3.4, cz - sz * 1.3, -Math.PI / 2);
      addBox(1.15, 0.42, 0.75, cx - 1.9, 0.21, cz - sz * 1.3, woodMat, true);
      addBox(1.5, 0.75, 0.6, cx + 4.3, 0.38, cz - sz * 2.9, woodMat, true);      // escritorio
      addBox(0.5, 0.55, 0.5, cx + 3.5, 0.28, cz - sz * 2.9, trimMat, true);      // silla
      addWardrobe(cx - 4.6, cz + sz * 3.3, Math.PI / 2);
      addRug(cx, cz, 5.2, 3.6, theme.carpet);
      addPainting(cx, 3.1, cz + sz * 4.02, sz > 0 ? Math.PI : 0, room.idx * 3 + floorIndex, true);
      addPlant(cx + 5.0, cz + sz * 3.4);
      addVase(cx + 5.0, cz - sz * 3.4);
      for (let c = 0; c < 5; c++) addCoin(cx + rnd(-4, 4), cz + rnd(-2.8, 2.8), irnd(4, 9));
      if (Math.random() < 0.4) chestAt(room, cx + 2.2, cz - sz * 2.9, irnd(45, 70) + floorIndex * 8);
    } else if (arch === 2) {
      // BAÑO · baldosas, bañera, lavabos, espejos
      const tile = new THREE.Mesh(new THREE.BoxGeometry(w - 0.5, 0.03, d - 0.5), new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.25, metalness: 0.1 }));
      tile.position.set(cx, 0.018, cz);
      tile.receiveShadow = true;
      group.add(tile);
      const tubMat = new THREE.MeshStandardMaterial({ color: "#e8ecee", roughness: 0.25 });
      // bañera con paredes curvas: cápsula aplastada + borde torneado
      const tub = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.3, 6, 18), tubMat);
      tub.rotation.x = Math.PI / 2;
      tub.scale.set(1.02, 1, 0.58);
      tub.position.set(cx - 1.5, 0.42, cz + sz * 3.1);
      tub.castShadow = true;
      group.add(tub);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 10, 24), tubMat);
      rim.rotation.x = Math.PI / 2;
      rim.scale.set(1.02, 2.05, 1);
      rim.position.set(cx - 1.5, 0.74, cz + sz * 3.1);
      group.add(rim);
      const faucet = new THREE.Mesh(
        lathe([[0.03, 0], [0.05, 0.4], [0.035, 0.8], [0.035, 1]], 0.42, 10),
        new THREE.MeshStandardMaterial({ color: "#c9ccd4", metalness: 0.85, roughness: 0.25 })
      );
      faucet.position.set(cx - 2.5, 0.76, cz + sz * 3.1);
      group.add(faucet);
      const water = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.52, 1.15, 4, 16),
        new THREE.MeshStandardMaterial({ color: theme.accent, emissive: accent, emissiveIntensity: 0.7, roughness: 0.1 })
      );
      water.rotation.x = Math.PI / 2;
      water.scale.set(0.94, 1, 0.05);
      water.position.set(cx - 1.5, 0.66, cz + sz * 3.1);
      group.add(water);
      colliders.push({ minX: cx - 2.8, maxX: cx - 0.2, minZ: cz + sz * 2.4, maxZ: cz + sz * 3.8 });
      for (const sx of [2.3, 3.7]) {
        addBox(0.55, 0.82, 0.45, cx + sx, 0.41, cz + sz * 3.45, tubMat, true);   // pedestal
        const mirror = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.9, 0.05),
          new THREE.MeshStandardMaterial({ color: "#aebfd0", roughness: 0.06, metalness: 0.95, emissive: "#20303f", emissiveIntensity: 0.4 })
        );
        mirror.position.set(cx + sx, 2.15, cz + sz * 3.95);
        if (sz < 0) mirror.rotation.y = Math.PI;
        group.add(mirror);
      }
      addBox(0.5, 0.72, 0.62, cx + 5.0, 0.36, cz + sz * 1.4, tubMat, true);       // retrete
      const bar = addBox(1.4, 0.06, 0.06, cx + 1.4, 1.7, cz + sz * 3.95, brassMat);
      void bar;
      addBox(0.5, 0.8, 0.09, cx + 1.1, 1.28, cz + sz * 3.93, fabricMat("#7ab8c9"), false);
      addBox(0.5, 0.8, 0.09, cx + 1.75, 1.28, cz + sz * 3.93, fabricMat("#c9d7de"), false);
      addRug(cx - 1.5, cz + sz * 1.6, 2.2, 1.4, "#8fb3bd");
      for (let c = 0; c < 3; c++) addCoin(cx + rnd(-3.5, 3.5), cz + rnd(-2.4, 1.6), irnd(3, 7));
      if (Math.random() < 0.6) addMedkit(cx + rnd(-2, 2), cz - sz * 1.8);
      addVase(cx - 4.9, cz - sz * 2.2);
    } else {
      // ALMACÉN · cajas, estantería, cofre garantizado
      addCrateStack(cx - 4.2, cz + sz * 2.9);
      addCrateStack(cx + 4.3, cz + sz * 2.9);
      addCrateStack(cx - 3.6, cz - sz * 2.7);
      addCrateStack(cx + 3.9, cz - sz * 1.6);
      addBox(3.4, 0.09, 0.85, cx, 1.15, cz + sz * 3.75, woodMat, false);          // estante alto
      addBox(3.4, 0.09, 0.85, cx, 2.15, cz + sz * 3.75, woodMat, false);
      addBox(0.5, 0.6, 0.5, cx - 1.1, 1.5, cz + sz * 3.75, fabricMat("#5a4632"), false);
      addBox(0.45, 0.5, 0.5, cx + 0.6, 1.45, cz + sz * 3.75, fabricMat("#3e4a5a"), false);
      addBox(3.4, 2.3, 0.14, cx, 1.15, cz + sz * 4.16, woodMat, false);           // trasera estante
      for (const bx of [-1.8, 1.6]) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12), woodMat);
        barrel.position.set(cx + bx, 0.5, cz - sz * 3.2);
        barrel.castShadow = true;
        group.add(barrel);
        colliders.push({ minX: cx + bx - 0.45, maxX: cx + bx + 0.45, minZ: cz - sz * 3.65, maxZ: cz - sz * 2.75 });
      }
      chestAt(room, cx, cz, irnd(70, 110) + floorIndex * 12);
      for (let c = 0; c < 2; c++) addCoin(cx + rnd(-4, 4), cz + rnd(-2, 2), irnd(3, 6));
      if (floorIndex >= 1 && Math.random() < 0.35) addGoldPile(cx + rnd(-3, 3), cz + rnd(-1.5, 1.5), irnd(18, 30));
    }
  }

  function buildSpecialRoom(room: RoomInfo, def: RoomDef, cx: number, cz: number, facing: 1 | -1): void {
    const x1 = def.x1, x2 = def.x2, z1 = def.z1, z2 = def.z2;
    if (def.special === "SALÓN DE BAILE") {
      const parquet = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1 - 0.4, 0.03, z2 - z1 - 0.4), new THREE.MeshStandardMaterial({ map: parquetTexture(), roughness: 0.4 }));
      parquet.position.set(cx, 0.018, cz);
      parquet.receiveShadow = true;
      group.add(parquet);
      // columnas (se omite la del NO: ahí queda el macizo estructural)
      for (const [px, pz] of [[x1 + 1.2, z1 + 1.2], [x2 - 1.2, z1 + 1.2], [x1 + 1.2, z2 - 1.2], [x2 - 1.2, z2 - 1.2]]) {
        if (pz > -10.9 && Math.abs(px) > 8.3) continue;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.46, H, 14), new THREE.MeshStandardMaterial({ color: "#cfc4ae", roughness: 0.5 }));
        col.position.set(px, H / 2, pz);
        col.castShadow = true;
        group.add(col);
        addBox(1.0, 0.22, 1.0, px, H - 0.1, pz, brassMat);
        colliders.push({ minX: px - 0.48, maxX: px + 0.48, minZ: pz - 0.48, maxZ: pz + 0.48 });
      }
      // piano de cola (cuerpo curvo simplificado con tapa alzada)
      const blackMat = new THREE.MeshStandardMaterial({ color: "#101014", roughness: 0.2, metalness: 0.4 });
      const pianoBody = new THREE.Mesh(rbox(2.3, 1.0, 1.15, 0.12, 3), blackMat);
      pianoBody.position.set(cx + 0.7, 0.55, cz - 3.7);
      pianoBody.castShadow = true;
      group.add(pianoBody);
      const keys = new THREE.Mesh(rbox(1.9, 0.08, 0.34, 0.02, 2), std("#e8e4da", 0.4));
      keys.position.set(cx + 0.7, 0.86, cz - 3.05);
      group.add(keys);
      for (let k = 0; k < 7; k++) {
        const bk = new THREE.Mesh(rbox(0.09, 0.06, 0.16, 0.012, 1), blackMat);
        bk.position.set(cx - 0.05 + k * 0.25, 0.93, cz - 3.12);
        group.add(bk);
      }
      const lid = new THREE.Mesh(rbox(2.2, 0.06, 1.05, 0.03, 2), blackMat);
      lid.position.set(cx + 0.7, 1.16, cz - 3.85);
      lid.rotation.x = -0.42;
      lid.castShadow = true;
      group.add(lid);
      const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 6), blackMat);
      prop.position.set(cx + 1.55, 1.32, cz - 3.5);
      prop.rotation.z = 0.5;
      group.add(prop);
      for (const lx of [cx - 0.3, cx + 1.7]) {
        for (const lz of [cz - 3.2, cz - 4.2]) {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.62, 8), blackMat);
          leg.position.set(lx, 0.31, lz);
          group.add(leg);
        }
      }
      addBox(0.9, 0.45, 0.4, cx + 2.4, 0.23, cz - 2.9, blackMat, true);            // banqueta
      const benchTop = new THREE.Mesh(rbox(0.95, 0.08, 0.46, 0.03, 2), std("#7a1f2e", 0.8));
      benchTop.position.set(cx + 2.4, 0.49, cz - 2.9);
      group.add(benchTop);
      sofa(cx - 1.9, cz + 2.6, Math.PI);
      sofa(cx + 1.9, cz + 2.6, Math.PI);
      addBox(1.3, 0.42, 0.8, cx, 0.21, cz + 3.4, woodMat, true);
      // lámpara pequeña
      const ch = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), bulbMat);
      ch.position.set(cx, 3.4, cz);
      group.add(ch);
      if (HiQ) {
        const pl = new THREE.PointLight(new THREE.Color("#ffd9a0"), 20, 14, 1.8);
        pl.position.set(cx, 3.6, cz);
        group.add(pl);
      }
      addGoldPile(cx - 2.8, cz - 3.9, irnd(20, 30));
      addGoldPile(cx + 2.9, cz - 1.9, irnd(20, 30));
      addVase(cx - 3.2, cz + 0.6);
      addVase(cx + 3.1, cz + 1.4);
      addVase(cx - 3.4, cz - 1.8);
      addPainting(x1 + 0.12, 3.0, cz - 1.5, Math.PI / 2, floorIndex + 9);
      addPainting(x1 + 0.12, 3.0, cz + 1.7, Math.PI / 2, floorIndex + 11);
      for (let c = 0; c < 5; c++) addCoin(cx + rnd(-3, 3), cz + rnd(-2, 3), irnd(4, 9));
      chestAt(room, cx - 2.6, cz - 4.7, irnd(55, 85) + floorIndex * 8);
    } else if (def.special === "COCINA") {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1 - 0.4, 0.03, z2 - z1 - 0.4), new THREE.MeshStandardMaterial({ map: tileTexture(), roughness: 0.3 }));
      tile.position.set(cx, 0.018, cz);
      tile.receiveShadow = true;
      group.add(tile);
      const steel = new THREE.MeshStandardMaterial({ color: "#9aa4ac", roughness: 0.3, metalness: 0.75 });
      addBox(0.8, 0.95, 4.6, x1 + 0.55, 0.47, cz - 0.8, steel, true);              // encimera oeste
      addBox(0.86, 0.06, 4.66, x1 + 0.55, 0.98, cz - 0.8, new THREE.MeshStandardMaterial({ color: "#5a646c", roughness: 0.25, metalness: 0.8 }));
      for (let p = 0; p < 3; p++) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.3, 12), steel);
        pot.position.set(x1 + 0.55, 1.18, cz - 2.4 + p * 1.6);
        pot.castShadow = true;
        group.add(pot);
      }
      addBox(1.15, 2.4, 0.95, x1 + 0.75, 1.2, cz + 3.6, steel, true);              // nevera
      addBox(0.06, 1.6, 0.06, x1 + 1.38, 1.35, cz + 3.25, brassMat);
      addBox(1.5, 0.95, 1.1, x1 + 0.7, 0.47, cz - 3.85, blackMetal(), true);       // horno
      for (const bx of [-0.35, 0.35]) {
        const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 12), new THREE.MeshStandardMaterial({ color: "#0a0c10", emissive: "#ff4a1e", emissiveIntensity: 0.55 }));
        burner.position.set(x1 + 0.7 + bx, 0.99, cz - 3.85);
        group.add(burner);
      }
      // isla central con platos rompibles
      addBox(2.9, 1.0, 1.45, cx + 0.7, 0.5, cz + 0.3, woodMat, true);
      addBox(2.98, 0.06, 1.53, cx + 0.7, 1.03, cz + 0.3, steel);
      for (const [px, pz] of [[-0.9, -0.35], [0.1, -0.35], [-0.5, 0.4], [0.6, 0.4]]) {
        addPlate(cx + 0.7 + px, 1.14, cz + 0.3 + pz);
      }
      addVase(cx + 1.75, cz + 0.05, 1.06);
      addCrateStack(cx + 3.2, cz + 2.9);
      addMedkit(cx + 3.4, cz - 2.2);
      for (let c = 0; c < 4; c++) addCoin(cx + rnd(-2.5, 3.5), cz + rnd(-3.4, 2), irnd(3, 8));
      addPainting(x2 - 0.12, 3.0, cz - 2.4, -Math.PI / 2, floorIndex + 5);
    } else if (def.special === "BÓVEDA") {
      const dark = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1 - 0.4, 0.03, z2 - z1 - 0.4), new THREE.MeshStandardMaterial({ color: "#1a1622", roughness: 0.35, metalness: 0.5 }));
      dark.position.set(cx, 0.018, cz);
      dark.receiveShadow = true;
      group.add(dark);
      // filos dorados del suelo
      addBox(x2 - x1 - 0.4, 0.05, 0.14, cx, 0.035, z1 + 0.28, goldMaterial());
      addBox(x2 - x1 - 0.4, 0.05, 0.14, cx, 0.035, z2 - 0.28, goldMaterial());
      addBox(0.14, 0.05, z2 - z1 - 0.4, x1 + 0.28, 0.035, cz, goldMaterial());
      addBox(0.14, 0.05, z2 - z1 - 0.4, x2 - 0.28, 0.035, cz, goldMaterial());
      // tesoro
      addGoldPile(cx - 2.6, cz - 3.2, irnd(22, 32));
      addGoldPile(cx, cz - 3.6, irnd(22, 32));
      addGoldPile(cx + 2.6, cz - 3.2, irnd(22, 32));
      addGoldPile(cx - 2.9, cz + 0.6, irnd(22, 32));
      addGoldPile(cx + 2.9, cz + 0.9, irnd(22, 32));
      addGoldPile(cx + 0.4, cz + 3.2, irnd(22, 32));
      addGem(cx - 1.6, cz - 1.6, irnd(40, 55));
      addGem(cx + 1.9, cz - 1.2, irnd(40, 55));
      addGem(cx - 0.6, cz + 2.2, irnd(40, 55));
      chestAt(room, cx, cz - 1.2, 240 + floorIndex * 30, 1.5);
      for (const bx of [x1 + 1.0, x2 - 1.0]) {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12), woodMat);
        barrel.position.set(bx, 0.5, cz + 3.9);
        barrel.castShadow = true;
        group.add(barrel);
        colliders.push({ minX: bx - 0.45, maxX: bx + 0.45, minZ: cz + 3.45, maxZ: cz + 4.35 });
      }
      // antorchas rojas
      for (const [tx, tz] of [[x1 + 0.3, cz - 2.5], [x1 + 0.3, cz + 2.5], [x2 - 0.3, cz - 2.5], [x2 - 0.3, cz + 2.5]]) {
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: "#ff7a30", emissive: "#ff3a10", emissiveIntensity: 2.4 }));
        flame.position.set(tx, 3.1, tz);
        group.add(flame);
      }
      if (HiQ) {
        const pl = new THREE.PointLight(new THREE.Color("#ff8a4a"), 22, 15, 1.8);
        pl.position.set(cx, 3.2, cz);
        group.add(pl);
      }
      addCrateStack(cx + 3.6, cz - 4.3);
    } else {
      // SUITE ∞
      const rich = new THREE.Mesh(new THREE.BoxGeometry(x2 - x1 - 0.4, 0.035, z2 - z1 - 0.4), fabricMat(theme.carpet));
      rich.position.set(cx, 0.02, cz);
      rich.receiveShadow = true;
      group.add(rich);
      addBed(cx + 0.6, cz - 3.0, 1, true);
      // dosel
      for (const px of [cx + 0.6 - 1.2, cx + 0.6 + 1.2]) {
        for (const pz of [cz - 3.0 - 1.35, cz - 3.0 + 1.35]) {
          addBox(0.1, 2.6, 0.1, px, 1.3, pz, brassMat);
        }
      }
      addBox(2.9, 0.08, 3.1, cx + 0.6, 2.62, cz - 3.0, fabricMat(theme.accent));
      // jacuzzi
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.3, 0.85, 18), new THREE.MeshStandardMaterial({ color: "#e8ecee", roughness: 0.22 }));
      tub.position.set(cx - 2.7, 0.43, cz + 2.6);
      tub.castShadow = true;
      group.add(tub);
      const water = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.06, 18), new THREE.MeshStandardMaterial({ color: theme.accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.1 }));
      water.position.set(cx - 2.7, 0.82, cz + 2.6);
      group.add(water);
      colliders.push({ minX: cx - 4.05, maxX: cx - 1.35, minZ: cz + 1.25, maxZ: cz + 3.95 });
      // chaise longue
      addBox(0.85, 0.42, 1.9, cx + 3.1, 0.21, cz + 2.2, fabricMat("#5a2230"), true);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.22), fabricMat("#5a2230"));
      back.position.set(cx + 3.1, 0.75, cz + 3.0);
      back.rotation.x = 0.4;
      back.castShadow = true;
      group.add(back);
      addDresserTV(cx + 3.4, cz - 4.3, Math.PI);
      addPlant(x1 + 0.9, cz - 4.3);
      addPlant(x2 - 0.9, cz + 4.2);
      addPainting(x2 - 0.12, 3.1, cz - 1.6, -Math.PI / 2, floorIndex + 13, true);
      addPainting(x1 + 0.12, 3.1, cz + 0.4, Math.PI / 2, floorIndex + 15);
      addVase(cx - 4.2, cz - 3.9);
      addVase(cx + 1.9, cz + 3.9, 0);
      addGoldPile(cx - 3.4, cz - 1.2, irnd(22, 32));
      chestAt(room, cx - 0.9, cz + 4.0, irnd(110, 150) + floorIndex * 14);
      for (let c = 0; c < 6; c++) addCoin(cx + rnd(-3.5, 3.5), cz + rnd(-3, 3), irnd(5, 10));
    }
  }

  function blackMetal(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color: "#14161c", roughness: 0.35, metalness: 0.6 });
  }

  /* ------------------- llaves garantizadas ------------------- */
  {
    const unlockedWing = rooms.filter((r) => r.wing !== "north" && !r.door.locked);
    const shuffled = [...unlockedWing].sort(() => Math.random() - 0.5);
    const keyRooms = shuffled.slice(0, 3);
    for (const kr of keyRooms) {
      const key = makeKeyMesh();
      key.position.set(kr.center.x + rnd(-2.5, 2.5), 0.6, kr.center.z + rnd(-2, 2));
      group.add(key);
      loot.push({ kind: "key", group: key, pos: key.position.clone(), taken: false, value: 1, phase: rnd(0, 6.28) });
    }
  }

  /* ------------------- herramientas recogibles ------------------- */
  const tools: ToolPickup[] = [];
  const addToolPickup = (type: ToolType, x: number, y: number, z: number, ry = 0): void => {
    const { group: tg, spinner } = makeToolPickupMesh(type);
    tg.position.set(x, y, z);
    tg.rotation.y = ry;
    group.add(tg);
    tools.push({ type, group: tg, spinner, pos: tg.position.clone(), taken: false, phase: rnd(0, 6.28) });
  };
  {
    // MESA DE BIENVENIDA en el lobby: el jugador empieza sin herramienta
    // y aquí coge la primera (bate / sartén / plumero a la vista).
    const tblX = 3.6, tblZ = -6.1;
    addBox(2.7, 0.1, 1.05, tblX, 0.85, tblZ, woodMat, true);
    for (const lx of [-1.15, 1.15]) {
      for (const lz of [-0.38, 0.38]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.8, 8), trimMat);
        leg.position.set(tblX + lx, 0.4, tblZ + lz);
        leg.castShadow = true;
        group.add(leg);
      }
    }
    // cartel inclinado sobre poste
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.85, 8), brassMat);
    post.position.set(tblX, 1.32, tblZ - 0.36);
    group.add(post);
    const tblSign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: signTexture("HERRAMIENTAS", "#151009", "#e9b23c") })
    );
    tblSign.position.set(tblX, 1.78, tblZ - 0.3);
    tblSign.rotation.x = -0.55;
    group.add(tblSign);
    addToolPickup("bate", tblX - 0.8, 0.9, tblZ + 0.26, 0.4);
    addToolPickup("sarten", tblX, 0.9, tblZ + 0.26, -0.35);
    addToolPickup("plumero", tblX + 0.8, 0.9, tblZ + 0.26, 1.25);

    // 3 herramientas extra repartidas por salas del piso (siempre incluye una potente)
    const pool: ToolType[] = [...TOOL_ORDER].sort(() => Math.random() - 0.5);
    const chosen = pool.slice(0, 3);
    if (!chosen.includes("hacha") && Math.random() < 0.4) chosen[2] = "hacha";
    const candidates = rooms.filter((r) => !r.door.locked);
    const sorted = [...candidates].sort((a, b) => Math.hypot(b.center.x, b.center.z) - Math.hypot(a.center.x, a.center.z));
    const spots = sorted.slice(0, Math.max(3, Math.floor(sorted.length * 0.6))).sort(() => Math.random() - 0.5);
    for (let i = 0; i < chosen.length && i < spots.length; i++) {
      addToolPickup(chosen[i], spots[i].center.x + rnd(-2.2, 2.2), 0, spots[i].center.z + rnd(-1.8, 1.8), rnd(0, Math.PI * 2));
    }
  }

  /* ------------------- techo ------------------- */
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(BOUNDS.maxX - BOUNDS.minX + 1, 0.22, BOUNDS.maxZ - BOUNDS.minZ + 1),
    new THREE.MeshStandardMaterial({ color: "#0c1320", roughness: 1 })
  );
  ceil.position.set(0, 5.12, -9.5);
  group.add(ceil);

  /* ------------------- zonas para la IA ------------------- */
  const hubZone: Zone = { minX: -8.2, maxX: 8.2, minZ: -8.2, maxZ: 8.2, kind: "hub", idx: -2, wing: "hub", doorPos: new THREE.Vector3(0, 0, 0) };
  const corrW: Zone = { minX: -33.2, maxX: -8.2, minZ: -2.3, maxZ: 2.3, kind: "corridor", idx: -1, wing: "west", doorPos: new THREE.Vector3(0, 0, 0) };
  const corrE: Zone = { minX: 8.2, maxX: 33.2, minZ: -2.3, maxZ: 2.3, kind: "corridor", idx: -1, wing: "east", doorPos: new THREE.Vector3(0, 0, 0) };
  const corrN: Zone = { minX: -2.3, maxX: 2.3, minZ: -30.2, maxZ: -8.2, kind: "corridor", idx: -1, wing: "north", doorPos: new THREE.Vector3(0, 0, 0) };
  const zones: Zone[] = [hubZone, corrW, corrE, corrN, ...rooms.map((r) => r.zone)];

  /* ------------------- niebla / fondo ------------------- */
  scene.background = new THREE.Color(theme.fog);
  scene.fog = new THREE.Fog(new THREE.Color(theme.fog), 26, 62);

  scene.add(group);

  const map: MapData = {
    hub: { x1: -8.4, z1: -8.4, x2: 8.4, z2: 8.4 },
    wings: [
      { x1: -33.2, z1: -2.3, x2: -8.2, z2: 2.3 },
      { x1: 8.2, z1: -2.3, x2: 33.2, z2: 2.3 },
      { x1: -2.3, z1: -30.2, x2: 2.3, z2: -8.2 },
    ],
    rooms: rooms.map((r) => ({
      idx: r.idx,
      x1: r.zone.minX, z1: r.zone.minZ, x2: r.zone.maxX, z2: r.zone.maxZ,
      door: { x: r.door.baseX, z: r.door.baseZ },
      special: r.special,
      locks: r.door.locks,
    })),
    elevator: { x: -5.5, z: -8.2 },
    bounds: BOUNDS,
  };

  const spawnPoints: THREE.Vector3[] = [
    new THREE.Vector3(-5.5, 0, -6.4),
    new THREE.Vector3(-31.5, 0, 0),
    new THREE.Vector3(31.5, 0, 0),
    new THREE.Vector3(0, 0, -28.5),
  ];

  const update = (dt: number): void => {
    for (const r of rooms) {
      const d = r.door;
      d.open01 = damp(d.open01, d.target, 8, dt);
      const slide = d.open01 * 1.85;
      if (d.axis === "x") d.panel.position.x = d.baseX + (d.baseZ < 0 ? -1 : 1) * slide;
      else d.panel.position.z = d.baseZ + (d.baseX < 0 ? 1 : -1) * slide;
      d.panel.visible = !d.broken || d.open01 < 0.9;
    }
    // herramientas: giro + levitación + chispa orbital
    for (const t of tools) {
      if (t.taken) continue;
      t.phase += dt;
      t.spinner.rotation.y += dt * 1.4;
      t.spinner.position.y = Math.sin(t.phase * 2.1) * 0.07;
    }
  };

  return {
    group,
    colliders,
    zones,
    rooms,
    corridor: corrW,
    loot,
    breakables,
    tools,
    elevatorPos,
    playerStart: new THREE.Vector3(0, 0, 3.0),
    spawnPoints,
    bounds: BOUNDS,
    map,
    setElevatorGlow,
    update,
    dispose: () => {
      scene.remove(group);
      disposeObject(group);
    },
  };
}

/* ------------------------------ loot meshes ------------------------------ */

export function makeMedkitMesh(): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    rbox(0.5, 0.34, 0.36, 0.07, 2),
    new THREE.MeshStandardMaterial({ color: "#f2f2f2", roughness: 0.5 })
  );
  box.castShadow = true;
  g.add(box);
  const latch = new THREE.Mesh(rbox(0.1, 0.06, 0.03, 0.012, 1), new THREE.MeshStandardMaterial({ color: "#9aa4ac", metalness: 0.7, roughness: 0.3 }));
  latch.position.set(0, 0.08, 0.19);
  g.add(latch);
  const crossMat = new THREE.MeshStandardMaterial({ color: "#ff3b30", emissive: "#ff3b30", emissiveIntensity: 0.8 });
  const c1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 3, 8), crossMat);
  c1.rotation.z = Math.PI / 2;
  c1.position.z = 0.19;
  g.add(c1);
  const c2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.14, 3, 8), crossMat);
  c2.position.z = 0.19;
  g.add(c2);
  return g;
}

export function makeKeyMesh(): THREE.Group {
  const g = new THREE.Group();
  const card = new THREE.Mesh(
    rbox(0.34, 0.22, 0.045, 0.05, 2),
    new THREE.MeshStandardMaterial({ color: "#38e1d4", emissive: "#38e1d4", emissiveIntensity: 1.4, roughness: 0.3 })
  );
  card.castShadow = true;
  g.add(card);
  const chip = new THREE.Mesh(
    rbox(0.09, 0.07, 0.05, 0.02, 2),
    new THREE.MeshStandardMaterial({ color: "#0a2a28", roughness: 0.4 })
  );
  chip.position.set(-0.08, 0.03, 0.01);
  g.add(chip);
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.016, 6, 14, Math.PI),
    new THREE.MeshStandardMaterial({ color: "#0a2a28", roughness: 0.4 })
  );
  band.rotation.z = Math.PI;
  band.position.y = -0.02;
  g.add(band);
  return g;
}

export function makeChestMesh(accent: string): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 0.6 });
  const goldMat2 = new THREE.MeshStandardMaterial({ color: "#e9b23c", metalness: 0.8, roughness: 0.3, emissive: accent, emissiveIntensity: 0.35 });
  // cuerpo biselado
  const body = new THREE.Mesh(rbox(0.92, 0.5, 0.62, 0.07, 3), woodMat);
  body.position.y = 0.25;
  body.castShadow = true;
  g.add(body);
  // tapa curva (medio cilindro)
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.9, 14, 1, false, 0, Math.PI), woodMat);
  lid.rotation.z = Math.PI / 2;
  lid.rotation.y = Math.PI / 2;
  lid.position.y = 0.5;
  lid.castShadow = true;
  g.add(lid);
  // bandas doradas (una frontal curva + dos planas)
  const bandF = new THREE.Mesh(new THREE.TorusGeometry(0.315, 0.028, 8, 16, Math.PI), goldMat2);
  bandF.position.set(0, 0.5, 0.3);
  bandF.rotation.y = Math.PI / 2;
  bandF.rotation.z = Math.PI;
  g.add(bandF);
  const bandB = bandF.clone();
  bandB.position.z = -0.3;
  g.add(bandB);
  const strap = new THREE.Mesh(rbox(0.96, 0.09, 0.66, 0.02, 2), goldMat2);
  strap.position.y = 0.42;
  g.add(strap);
  // candado colgante
  const lockBody = new THREE.Mesh(rbox(0.15, 0.17, 0.09, 0.035, 2), goldMat2);
  lockBody.position.set(0, 0.36, 0.34);
  g.add(lockBody);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 12, Math.PI), goldMat2);
  shackle.position.set(0, 0.45, 0.34);
  g.add(shackle);
  // patas
  for (const px of [-0.36, 0.36]) {
    for (const pz of [-0.22, 0.22]) {
      const foot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), goldMat2);
      foot.position.set(px, 0.03, pz);
      g.add(foot);
    }
  }
  return g;
}

/* ------------------------------ mármol ------------------------------ */

function marbleFloorTex(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const tile = 64;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const even = (x + y) % 2 === 0;
      g.fillStyle = even ? "#26334e" : "#414f6e";
      g.fillRect(x * tile, y * tile, tile, tile);
      g.strokeStyle = "rgba(0,0,0,0.4)";
      g.lineWidth = 2;
      g.strokeRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
      g.strokeStyle = even ? "rgba(150,170,210,0.14)" : "rgba(210,190,150,0.1)";
      g.lineWidth = 1.2;
      for (let v = 0; v < 3; v++) {
        g.beginPath();
        const sx = x * tile + rnd(0, tile);
        const sy = y * tile + rnd(0, tile);
        g.moveTo(sx, sy);
        g.lineTo(sx + rnd(-24, 24), sy + rnd(-24, 24));
        g.stroke();
      }
    }
  }
  // rejilla de studs clásica Roblox sobre el mármol
  drawStuds(g, 256, 256, 32, 0.09);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
