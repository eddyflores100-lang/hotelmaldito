/* ============================================================
   HOTEL ∞ INFINITO — Hotel 3D: lobby, recepción, ascensor,
   puertas de habitaciones, iluminación y tema por piso.
   ============================================================ */
import * as THREE from "three";
import { carpetTexture, marbleTexture, paintingTexture, signTexture, woodTexture, disposeObject, rnd } from "./util";

export type FloorTheme = {
  code: string;
  name: string;
  subtitle: string;
  intro: string;
  accent: string;   // luz/rótulos
  carpet: string;   // alfombra base
  wall: string;     // pintura muros
  fog: string;      // niebla
  anomalyChance: number;      // 0..1
  arrivalMin: number;         // seg entre llegadas
  arrivalMax: number;
};

export const CURATED_FLOORS: FloorTheme[] = [
  {
    code: "P-13",
    name: "LA PISCINA SIN FIN",
    subtitle: "Piso 13 · área húmeda",
    intro: "Huele a cloro viejo y algo nada en círculos. Atiende el turno y no mires demasiado el agua de los cuadros.",
    accent: "#38e1d4",
    carpet: "#0f6a60",
    wall: "#1d4a58",
    fog: "#0e2833",
    anomalyChance: 0.28,
    arrivalMin: 7,
    arrivalMax: 12,
  },
  {
    code: "P-∞",
    name: "EL PISO ESPEJO",
    subtitle: "Piso infinito · área reflejada",
    intro: "Todo está al revés: los pasillos, los números y algunos huéspedes. Los espejos copian cada paso que das.",
    accent: "#ffa02f",
    carpet: "#6e3413",
    wall: "#4a3223",
    fog: "#241811",
    anomalyChance: 0.38,
    arrivalMin: 5.5,
    arrivalMax: 9.5,
  },
  {
    code: "P--1",
    name: "LA CALDERA",
    subtitle: "Subsótano · corazón del hotel",
    intro: "El corazón del hotel late abajo. Aquí llegan los huéspedes que ningún otro piso quiere registrar.",
    accent: "#ff6a3d",
    carpet: "#5c1a14",
    wall: "#43241d",
    fog: "#221109",
    anomalyChance: 0.46,
    arrivalMin: 4.5,
    arrivalMax: 8,
  },
];

const EXTRA_NAMES = [
  ["LA NIEBLA", "Niebla hasta las rodillas."],
  ["EL SÓTANO DOBLE", "Dos sótanos, un solo plano."],
  ["LA PLANTA PERDIDA", "Nadie recuerda haberla construido."],
  ["EL ALA SILENCIOSA", "Los pasos no hacen eco aquí."],
  ["LA SUITE 0", "Reservada desde antes del hotel."],
  ["EL BUZÓN", "El correo llega solo, de noche."],
  ["LA LAVANDERÍA ∞", "Máquinas que nunca acabaron."],
];

export function floorThemeFor(index: number): FloorTheme {
  if (index < CURATED_FLOORS.length) return CURATED_FLOORS[index];
  const i = index - CURATED_FLOORS.length;
  const [name, intro] = EXTRA_NAMES[i % EXTRA_NAMES.length];
  const hue = (0.08 + i * 0.13) % 1;
  const col = new THREE.Color().setHSL(hue, 0.45, 0.2).getHexString();
  const accent = new THREE.Color().setHSL(hue, 0.85, 0.6).getHexString();
  const fog = new THREE.Color().setHSL(hue, 0.4, 0.08).getHexString();
  return {
    code: `P-${13 + (i + 1) * 9}`,
    name: `PISO ${name}`,
    subtitle: `Piso profundo ${i + 1} · sin plano`,
    intro,
    accent: `#${accent}`,
    carpet: `#${col}`,
    wall: `#${new THREE.Color().setHSL(hue, 0.34, 0.17).getHexString()}`,
    fog: `#${fog}`,
    anomalyChance: Math.min(0.62, 0.5 + i * 0.04),
    arrivalMin: Math.max(3.2, 4.2 - i * 0.25),
    arrivalMax: Math.max(6, 7 - i * 0.4),
  };
}

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

export type HotelRefs = {
  group: THREE.Group;
  colliders: AABB[];
  cameraBlockers: AABB[];
  queueSlots: THREE.Vector3[];
  entrance: THREE.Vector3;
  elevatorSpot: THREE.Vector3;
  playerStart: THREE.Vector3;
  setElevatorOpen: (t01: number) => void;
  dispose: () => void;
};

const W = 26, D = 18, H = 5.6; // dimensiones lobby

export function buildHotel(scene: THREE.Scene, theme: FloorTheme, quality: "high" | "low"): HotelRefs {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const accent = new THREE.Color(theme.accent);
  const wood = woodTexture();

  /* ------------------------------ suelo ------------------------------ */
  const floorMat = new THREE.MeshStandardMaterial({ map: marbleTexture(), roughness: 0.35, metalness: 0.08 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, D), floorMat);
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  group.add(floor);

  // alfombra central (entrada → ascensor)
  const carpetMat = new THREE.MeshStandardMaterial({
    map: carpetTexture(theme.carpet, "#c99b3f"),
    roughness: 0.95,
  });
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.04, D - 1), carpetMat);
  carpet.position.set(0, 0.02, 0);
  carpet.receiveShadow = true;
  group.add(carpet);

  /* ------------------------------ muros ------------------------------ */
  const wallMat = new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.9 });
  const wainMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.7 });

  const wallSeg = (w: number, h: number, x: number, y: number, z: number, ry = 0, mat = wallMat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.4), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    m.castShadow = true;
    group.add(m);
    return m;
  };

  // trasera (con hueco de ascensor 2.6)
  const backSegW = (W - 2.6) / 2;
  wallSeg(backSegW, H, -(2.6 / 2 + backSegW / 2), H / 2, -D / 2);
  wallSeg(backSegW, H, (2.6 / 2 + backSegW / 2), H / 2, -D / 2);
  // frontal (con hueco de entrada 2.4)
  const frontSegW = (W - 2.4) / 2;
  wallSeg(frontSegW, H, -(2.4 / 2 + frontSegW / 2), H / 2, D / 2);
  wallSeg(frontSegW, H, (2.4 / 2 + frontSegW / 2), H / 2, D / 2);
  // laterales
  wallSeg(D, H, -W / 2, H / 2, 0, Math.PI / 2);
  wallSeg(D, H, W / 2, H / 2, 0, Math.PI / 2);

  // zócalo de madera (friso bajo) en las 4 paredes
  const skirt = (w: number, x: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, 0.12), wainMat);
    m.position.set(x, 0.75, z);
    m.rotation.y = ry;
    m.receiveShadow = true;
    group.add(m);
  };
  skirt(W - 2.6, 0, -D / 2 + 0.26, 0);
  skirt(W - 2.4, 0, D / 2 - 0.26, 0);
  skirt(D - 0.5, -W / 2 + 0.26, 0, Math.PI / 2);
  skirt(D - 0.5, W / 2 - 0.26, 0, Math.PI / 2);

  // moldura de techo
  const crownMat = new THREE.MeshStandardMaterial({ color: "#d8cdb8", roughness: 0.6 });
  const crown = (w: number, x: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.34, 0.22), crownMat);
    m.position.set(x, H - 0.3, z);
    m.rotation.y = ry;
    group.add(m);
  };
  crown(W, 0, -D / 2 + 0.2, 0);
  crown(W, 0, D / 2 - 0.2, 0);
  crown(D, -W / 2 + 0.2, 0, Math.PI / 2);
  crown(D, W / 2 - 0.2, 0, Math.PI / 2);

  // techo
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.2, D),
    new THREE.MeshStandardMaterial({ color: "#0c1320", roughness: 1 })
  );
  ceil.position.y = H + 0.1;
  group.add(ceil);

  /* ---------------------------- ascensor ---------------------------- */
  const brassMat = new THREE.MeshStandardMaterial({ color: "#8a6a2f", roughness: 0.35, metalness: 0.85 });
  const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.4, 0.5), brassMat);
  frameL.position.set(-1.5, 1.7, -D / 2 + 0.1);
  group.add(frameL);
  const frameR = frameL.clone();
  frameR.position.x = 1.5;
  group.add(frameR);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.4, 0.5), brassMat);
  lintel.position.set(0, 3.6, -D / 2 + 0.1);
  group.add(lintel);

  // interior brillante + puertas batientes deslizantes
  const inside = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 3.4, 0.1),
    new THREE.MeshStandardMaterial({ color: theme.accent, emissive: accent, emissiveIntensity: 0.9, roughness: 0.4 })
  );
  inside.position.set(0, 1.7, -D / 2 + 0.2);
  group.add(inside);

  const doorMat = new THREE.MeshStandardMaterial({ color: "#9a7a3a", roughness: 0.28, metalness: 0.9 });
  const doorL = new THREE.Mesh(new THREE.BoxGeometry(1.32, 3.3, 0.12), doorMat);
  doorL.position.set(-0.66, 1.65, -D / 2 + 0.42);
  doorL.castShadow = true;
  group.add(doorL);
  const doorR = doorL.clone();
  doorR.position.x = 0.66;
  group.add(doorR);

  const setElevatorOpen = (t01: number) => {
    doorL.position.x = -0.66 - 1.28 * t01;
    doorR.position.x = 0.66 + 1.28 * t01;
  };

  // rótulo del piso sobre el ascensor
  const signMat = new THREE.MeshBasicMaterial({
    map: signTexture(theme.code, "#0a0f1a", theme.accent, theme.name),
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), signMat);
  sign.position.set(0, 4.6, -D / 2 + 0.22);
  group.add(sign);

  const elevatorGlow = new THREE.PointLight(accent, 20, 8, 1.8);
  elevatorGlow.position.set(0, 2.4, -D / 2 + 1);
  group.add(elevatorGlow);

  colliders.push({ minX: -1.7, maxX: -1.3, minZ: -D / 2 - 0.1, maxZ: -D / 2 + 0.6 });
  colliders.push({ minX: 1.3, maxX: 1.7, minZ: -D / 2 - 0.1, maxZ: -D / 2 + 0.6 });

  /* --------------------------- recepción --------------------------- */
  const deskX = -6, deskZ = 3;
  const deskWoodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55 });
  const deskBody = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.15, 1.3), deskWoodMat);
  deskBody.position.set(deskX, 0.575, deskZ);
  deskBody.castShadow = true;
  deskBody.receiveShadow = true;
  group.add(deskBody);
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.12, 1.6), deskWoodMat);
  deskTop.position.set(deskX, 1.2, deskZ);
  deskTop.castShadow = true;
  group.add(deskTop);
  // panel frontal tallado
  const frontPanel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.5, 0.08), brassMat);
  frontPanel.position.set(deskX, 0.75, deskZ + 0.68);
  group.add(frontPanel);
  colliders.push({ minX: deskX - 2.4, maxX: deskX + 2.4, minZ: deskZ - 0.85, maxZ: deskZ + 0.85 });

  // campanilla + lámpara del mostrador
  const bell = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: "#e9b23c", roughness: 0.2, metalness: 0.95 })
  );
  bell.position.set(deskX + 1.6, 1.26, deskZ + 0.3);
  group.add(bell);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.34, 10), brassMat);
  lampBase.position.set(deskX - 1.7, 1.4, deskZ - 0.2);
  group.add(lampBase);
  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.3, 14, 1, true),
    new THREE.MeshStandardMaterial({ color: "#5f8f6f", emissive: "#7fd8a8", emissiveIntensity: 0.7, side: THREE.DoubleSide, roughness: 0.6 })
  );
  lampShade.position.set(deskX - 1.7, 1.62, deskZ - 0.2);
  group.add(lampShade);
  const deskLampLight = new THREE.PointLight(new THREE.Color("#8fe8b0"), 10, 5.5, 1.8);
  deskLampLight.position.set(deskX - 1.7, 1.6, deskZ - 0.2);
  group.add(deskLampLight);

  // placa pequeña de RECEPCIÓN sobre el frente del mostrador
  const recSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.55),
    new THREE.MeshBasicMaterial({ map: signTexture("RECEPCIÓN", "#0d1526", "#e9b23c") })
  );
  recSign.position.set(deskX, 0.75, deskZ + 0.72);
  group.add(recSign);

  /* ------------------- puertas de habitaciones ------------------- */
  const doorNums = ["013", "0∞", "404", "666", "5B", "??"];
  let doorIdx = 0;
  const addRoomDoor = (x: number, z: number, ry: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 3.1, 0.14),
      new THREE.MeshStandardMaterial({ color: "#3a2517", roughness: 0.65 })
    );
    slab.position.y = 1.55;
    slab.castShadow = true;
    slab.receiveShadow = true;
    g.add(slab);
    const knob = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshStandardMaterial({ color: "#d9b04c", metalness: 0.9, roughness: 0.25 })
    );
    knob.position.set(0.55, 1.5, 0.12);
    g.add(knob);
    const num = doorNums[doorIdx % doorNums.length];
    doorIdx++;
    const numSign = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.35),
      new THREE.MeshBasicMaterial({ map: signTexture(num, "#151009", "#d9b04c") })
    );
    numSign.position.set(0, 2.62, 0.1);
    g.add(numSign);
    // marco
    const fMat = new THREE.MeshStandardMaterial({ color: "#20130a", roughness: 0.6 });
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.2), fMat);
    jambL.position.set(-0.81, 1.6, 0);
    g.add(jambL);
    const jambR = jambL.clone();
    jambR.position.x = 0.81;
    g.add(jambR);
    const header = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.14, 0.2), fMat);
    header.position.y = 3.2;
    g.add(header);
    // aplique junto a la puerta (emisivo, sin luz)
    const sconce = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 1.6, roughness: 0.4 })
    );
    sconce.position.set(-1.15, 2.4, 0.14);
    g.add(sconce);
    group.add(g);
  };
  addRoomDoor(-W / 2 + 0.22, -4.5, Math.PI / 2);
  addRoomDoor(-W / 2 + 0.22, -0.5, Math.PI / 2);
  addRoomDoor(-W / 2 + 0.22, 5.5, Math.PI / 2);
  addRoomDoor(W / 2 - 0.22, -4.5, -Math.PI / 2);
  addRoomDoor(W / 2 - 0.22, 1.5, -Math.PI / 2);
  addRoomDoor(W / 2 - 0.22, 5.5, -Math.PI / 2);

  /* -------------------------- ventanas -------------------------- */
  const winMat = new THREE.MeshStandardMaterial({
    color: "#0d1c3a",
    emissive: new THREE.Color("#2a4f8e"),
    emissiveIntensity: 0.85,
    roughness: 0.2,
    metalness: 0.1,
  });
  const addWindow = (x: number, z: number, ry: number) => {
    const g = new THREE.Group();
    g.position.set(x, 2.6, z);
    g.rotation.y = ry;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.06), winMat);
    g.add(glass);
    const bars = new THREE.MeshStandardMaterial({ color: "#1c1710", roughness: 0.5, metalness: 0.6 });
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 0.1), bars);
    g.add(vBar);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.1), bars);
    hBar.position.y = 0;
    g.add(hBar);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.9, 0.1), bars);
    frame.position.z = -0.02;
    g.add(frame);
    group.add(g);
  };
  addWindow(W / 2 - 0.24, -7.2, -Math.PI / 2);
  addWindow(W / 2 - 0.24, 7.8, -Math.PI / 2);

  /* --------------------------- plantas --------------------------- */
  const potMat = new THREE.MeshStandardMaterial({ color: "#6e3b22", roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: "#1e5c33", roughness: 0.9 });
  const addPlant = (x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 12), potMat);
    pot.position.y = 0.27;
    pot.castShadow = true;
    g.add(pot);
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26 - i * 0.03, 10, 8), leafMat);
      leaf.position.set(rnd(-0.12, 0.12), 0.72 + i * 0.22, rnd(-0.12, 0.12));
      leaf.castShadow = true;
      g.add(leaf);
    }
    group.add(g);
    colliders.push({ minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.35, maxZ: z + 0.35 });
  };
  addPlant(-11.8, -7.4);
  addPlant(11.8, -7.4);
  addPlant(-11.8, 7.4);
  addPlant(11.8, 7.4);

  /* --------------------------- cuadros --------------------------- */
  for (let i = 0; i < 4; i++) {
    const art = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.12, 0.08),
      [
        new THREE.MeshStandardMaterial({ color: "#8a6a2f", metalness: 0.7, roughness: 0.35 }),
        new THREE.MeshStandardMaterial({ color: "#8a6a2f", metalness: 0.7, roughness: 0.35 }),
        new THREE.MeshStandardMaterial({ color: "#8a6a2f", metalness: 0.7, roughness: 0.35 }),
        new THREE.MeshStandardMaterial({ color: "#8a6a2f", metalness: 0.7, roughness: 0.35 }),
        new THREE.MeshStandardMaterial({ map: paintingTexture(i + 1), roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: "#101014" }),
      ]
    );
    if (i < 2) {
      art.position.set(-7 + i * 8.5, 3.3, -D / 2 + 0.24);
      (art.position.x === -7) && (art.position.x = -9.5);
    } else {
      art.position.set(-9.5 + (i - 2) * 8.5, 3.3, D / 2 - 0.24);
      art.rotation.y = Math.PI;
    }
    group.add(art);
  }

  /* ------------------------- lámpara central ------------------------- */
  const chain = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1.1, 6),
    new THREE.MeshStandardMaterial({ color: "#3a3a3a", metalness: 0.6, roughness: 0.5 })
  );
  chain.position.set(0, H - 0.55, 0);
  group.add(chain);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.07, 10, 28),
    new THREE.MeshStandardMaterial({ color: "#c9a24a", metalness: 0.85, roughness: 0.3 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, H - 1.15, 0);
  group.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: "#ffe8b0", emissive: "#ffcf7a", emissiveIntensity: 2.4 })
    );
    bulb.position.set(Math.cos(a) * 0.85, H - 1.02, Math.sin(a) * 0.85);
    group.add(bulb);
  }
  const chandelierLight = new THREE.PointLight(new THREE.Color("#ffd9a0"), 62, 24, 1.6);
  chandelierLight.position.set(0, H - 1.5, 0);
  chandelierLight.castShadow = quality === "high";
  if (chandelierLight.castShadow) {
    chandelierLight.shadow.mapSize.set(1024, 1024);
    chandelierLight.shadow.bias = -0.004;
  }
  group.add(chandelierLight);

  /* ------------------------ entrada principal ------------------------ */
  const entranceFrame = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.24, 0.5), brassMat
  );
  entranceFrame.position.set(0, 3.75, D / 2 - 0.1);
  group.add(entranceFrame);
  const glowAboveDoor = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 0.5),
    new THREE.MeshBasicMaterial({ map: signTexture("HOTEL ∞", "#0a0f1a", "#e9b23c") })
  );
  glowAboveDoor.position.set(0, 4.5, D / 2 - 0.24);
  glowAboveDoor.rotation.y = Math.PI;
  group.add(glowAboveDoor);

  /* --------------------------- niebla / fondo --------------------------- */
  scene.background = new THREE.Color(theme.fog);
  scene.fog = new THREE.Fog(new THREE.Color(theme.fog), 22, 52);

  scene.add(group);

  // bloqueadores de cámara: muros (con huecos) + muebles grandes
  const HW = W / 2, HD = D / 2;
  const cameraBlockers: AABB[] = [
    { minX: -HW, maxX: -1.3, minZ: -HD - 0.3, maxZ: -HD + 0.3 }, // muro trasero izq
    { minX: 1.3, maxX: HW, minZ: -HD - 0.3, maxZ: -HD + 0.3 },  // muro trasero der
    { minX: -HW, maxX: -1.2, minZ: HD - 0.3, maxZ: HD + 0.3 },  // muro frontal izq
    { minX: 1.2, maxX: HW, minZ: HD - 0.3, maxZ: HD + 0.3 },    // muro frontal der
    { minX: -HW - 0.3, maxX: -HW + 0.3, minZ: -HD, maxZ: HD },  // muro izquierdo
    { minX: HW - 0.3, maxX: HW + 0.3, minZ: -HD, maxZ: HD },    // muro derecho
    { minX: deskX - 2.4, maxX: deskX + 2.4, minZ: deskZ - 0.9, maxZ: deskZ + 0.9 }, // mostrador
  ];

  return {
    group,
    colliders,
    cameraBlockers,
    queueSlots: [
      new THREE.Vector3(-6, 0, 3.9),
      new THREE.Vector3(-3.7, 0, 5.2),
      new THREE.Vector3(-8.3, 0, 5.2),
      new THREE.Vector3(-6, 0, 6.3),
    ],
    entrance: new THREE.Vector3(0, 0, 8.3),
    elevatorSpot: new THREE.Vector3(0, 0, -7.4),
    playerStart: new THREE.Vector3(-6, 0, 1.6),
    setElevatorOpen,
    dispose: () => {
      scene.remove(group);
      disposeObject(group);
    },
  };
}
