/* ============================================================
   HOTEL ∞ INFINITO — Generador de pisos: pasillo + habitaciones
   reales (explorables), puertas, cerraduras, loot y ascensor.
   ============================================================ */
import * as THREE from "three";
import { type FloorTheme } from "./hotel";
import { carpetTexture, paintingTexture, signTexture, woodTexture, disposeObject, rnd, irnd, pick } from "./util";

export type AABB = { minX: number; maxX: number; minZ: number; maxZ: number };

export type Zone = { minX: number; maxX: number; minZ: number; maxZ: number; kind: "corridor" | "room"; idx: number };

export type LootKind = "coin" | "medkit" | "key" | "chest";
export type LootItem = {
  kind: LootKind;
  group: THREE.Group;
  pos: THREE.Vector3;
  taken: boolean;
  value: number;
  phase: number;
};

export type DoorInfo = {
  roomIdx: number;
  panel: THREE.Mesh;
  sign: THREE.Mesh;
  signMat: THREE.MeshBasicMaterial;
  frame: THREE.Group;
  locked: boolean;
  broken: boolean;
  open01: number;      // 0 cerrada, 1 abierta
  target: number;      // animación objetivo
  collider: AABB;      // válido solo cuando open01 < 0.5
  hp: number;
  baseColor: string;
};

export type RoomInfo = {
  idx: number;
  zone: Zone;
  center: THREE.Vector3;
  door: DoorInfo;
  explored: boolean;
  chest: LootItem | null;
};

export type WorldRefs = {
  group: THREE.Group;
  colliders: AABB[];
  zones: Zone[];
  rooms: RoomInfo[];
  corridor: Zone;
  loot: LootItem[];
  elevatorPos: THREE.Vector3;
  playerStart: THREE.Vector3;
  spawnPoints: THREE.Vector3[];
  setElevatorGlow: (t01: number) => void;
  dispose: () => void;
};

/* geometría fija del piso */
const HW = 15;          //半 ancho total
const HD = 9.5;         // semiprofundidad
const CORR_HALF = 2.2;  // semiancho del pasillo
const ROOM_W = 7.2;
const ROOM_D = 6.9;     // de z=2.5 a z=9.4
const DOOR_W = 1.8;

const ROOM_CX = [-11.1, -3.7, 3.7, 11.1];

export function pointInZone(z: Zone, x: number, zz: number): boolean {
  return x >= z.minX && x <= z.maxX && zz >= z.minZ && zz <= z.maxZ;
}

export function buildWorld(scene: THREE.Scene, theme: FloorTheme, quality: "high" | "low", floorIndex: number): WorldRefs {
  const group = new THREE.Group();
  const colliders: AABB[] = [];
  const accent = new THREE.Color(theme.accent);
  const wood = woodTexture();

  /* ------------------------------ suelo ------------------------------ */
  const floorMat = new THREE.MeshStandardMaterial({ map: marbleFloor(), roughness: 0.4, metalness: 0.05 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(HW * 2, 0.3, HD * 2), floorMat);
  floor.position.y = -0.15;
  floor.receiveShadow = true;
  group.add(floor);

  // alfombra del pasillo
  const carpetMat = new THREE.MeshStandardMaterial({
    map: carpetTexture(theme.carpet, "#c99b3f"),
    roughness: 0.95,
  });
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(HW * 2 - 1, 0.04, CORR_HALF * 2 - 0.4), carpetMat);
  carpet.position.set(0, 0.02, 0);
  carpet.receiveShadow = true;
  group.add(carpet);

  /* ------------------------------ muros ------------------------------ */
  const wallMat = new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.9 });
  const T = 0.3; // grosor

  const wallX = (cx: number, cz: number, len: number, alongX: boolean) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? len : T, 4.6, alongX ? T : len),
      wallMat
    );
    m.position.set(cx, 2.3, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    const half = len / 2;
    colliders.push(
      alongX
        ? { minX: cx - half, maxX: cx + half, minZ: cz - T / 2, maxZ: cz + T / 2 }
        : { minX: cx - T / 2, maxX: cx + T / 2, minZ: cz - half, maxZ: cz + half }
    );
  };

  // perímetro
  wallX(0, -HD, HW * 2, true);
  wallX(0, HD, HW * 2, true);
  wallX(-HW, 0, HD * 2, false);
  wallX(HW, 0, HD * 2, false);

  // muro del pasillo (norte y sur) con huecos de puerta por habitación
  for (let i = 0; i < 4; i++) {
    const cx = ROOM_CX[i];
    const segW = (ROOM_W - DOOR_W) / 2;
    // segmentos a cada lado de la puerta
    wallX(cx - DOOR_W / 2 - segW / 2, -CORR_HALF - T / 2, segW, true);
    wallX(cx + DOOR_W / 2 + segW / 2, -CORR_HALF - T / 2, segW, true);
    wallX(cx - DOOR_W / 2 - segW / 2, CORR_HALF + T / 2, segW, true);
    wallX(cx + DOOR_W / 2 + segW / 2, CORR_HALF + T / 2, segW, true);
    // dintel sobre la puerta (sin colisión)
    const lintelN = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.3, 1.6, T), wallMat);
    lintelN.position.set(cx, 3.8, -CORR_HALF - T / 2);
    group.add(lintelN);
    const lintelS = lintelN.clone();
    lintelS.position.z = CORR_HALF + T / 2;
    group.add(lintelS);
  }

  // divisores entre habitaciones (norte y sur)
  const divX = [-7.4, 0, 7.4];
  for (const dx of divX) {
    wallX(dx, -(CORR_HALF + T + ROOM_D / 2) + T, ROOM_D, false);
    wallX(dx, CORR_HALF + T + ROOM_D / 2 - T, ROOM_D, false);
  }

  // pared trasera de cada habitación ya está (perímetro) — añadir cabeceras internas no hace falta

  /* --------------------------- ascensor (oeste) --------------------------- */
  const brassMat = new THREE.MeshStandardMaterial({ color: "#8a6a2f", roughness: 0.35, metalness: 0.85 });
  // hueco en muro oeste del pasillo: tapamos el muro oeste solo fuera del pasillo,
  // el hueco ya existe porque el perímetro cruza… → añadimos jambas dentro
  const jambN = new THREE.Mesh(new THREE.BoxGeometry(T + 0.2, 4.6, 0.55), brassMat);
  jambN.position.set(-HW + 0.1, 2.3, -1.15);
  group.add(jambN);
  const jambS = jambN.clone();
  jambS.position.z = 1.15;
  group.add(jambS);
  const lintelE = new THREE.Mesh(new THREE.BoxGeometry(T + 0.2, 1.4, 2.9), brassMat);
  lintelE.position.set(-HW + 0.1, 3.9, 0);
  group.add(lintelE);

  // vestíbulo del ascensor (fuera del muro oeste)
  const elevInside = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 3.2, 2.3),
    new THREE.MeshStandardMaterial({ color: theme.accent, emissive: accent, emissiveIntensity: 1.1, roughness: 0.4 })
  );
  elevInside.position.set(-HW - 0.05, 1.6, 0);
  group.add(elevInside);

  const doorMat = new THREE.MeshStandardMaterial({ color: "#9a7a3a", roughness: 0.28, metalness: 0.9 });
  const eDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 1.16), doorMat);
  eDoorL.position.set(-HW + 0.28, 1.6, -0.58);
  eDoorL.castShadow = true;
  group.add(eDoorL);
  const eDoorR = eDoorL.clone();
  eDoorR.position.z = 0.58;
  group.add(eDoorR);

  const setElevatorGlow = (t01: number) => {
    eDoorL.position.z = -0.58 - 1.12 * t01;
    eDoorR.position.z = 0.58 + 1.12 * t01;
    (elevInside.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1 + t01 * 1.6;
  };

  const elevGlow = new THREE.PointLight(accent, 16, 9, 1.8);
  elevGlow.position.set(-HW + 0.8, 2.4, 0);
  group.add(elevGlow);

  const floorSign = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 1.15),
    new THREE.MeshBasicMaterial({ map: signTexture(theme.code, "#0a0f1a", theme.accent, theme.name) })
  );
  floorSign.position.set(-HW + 0.24, 4.35, 0);
  floorSign.rotation.y = Math.PI / 2;
  group.add(floorSign);

  colliders.push({ minX: -HW - 0.5, maxX: -HW, minZ: -HD, maxZ: -1.45 });
  colliders.push({ minX: -HW - 0.5, maxX: -HW, minZ: 1.45, maxZ: HD });
  // bloqueo del hueco del ascensor cuando las puertas están cerradas (lo gestiona Game vía door collider)

  /* --------------------------- habitaciones --------------------------- */
  const rooms: RoomInfo[] = [];
  const loot: LootItem[] = [];
  const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12);
  const coinMat = new THREE.MeshStandardMaterial({ color: "#f4c542", emissive: "#a97f10", emissiveIntensity: 0.5, metalness: 0.8, roughness: 0.25 });

  // decidir habitaciones cerradas y dónde cae la llave
  const lockedCount = Math.min(3, 1 + Math.floor(floorIndex / 2));
  const idxs = [0, 1, 2, 3, 4, 5, 6, 7];
  const shuffled = idxs.sort(() => Math.random() - 0.5);
  const lockedSet = new Set(shuffled.slice(0, lockedCount));
  const keyRoom = pick(shuffled.filter((i) => !lockedSet.has(i)));

  for (let i = 0; i < 8; i++) {
    const north = i < 4;
    const cx = ROOM_CX[i % 4];
    const czMid = north ? -(CORR_HALF + T + ROOM_D / 2) : CORR_HALF + T + ROOM_D / 2;
    const zone: Zone = {
      minX: cx - ROOM_W / 2, maxX: cx + ROOM_W / 2,
      minZ: north ? -(HD - 0.15) : CORR_HALF + T,
      maxZ: north ? -(CORR_HALF + T) : HD - 0.15,
      kind: "room",
      idx: i,
    };
    const center = new THREE.Vector3(cx, 0, czMid);

    /* --- puerta --- */
    const doorZ = north ? -CORR_HALF : CORR_HALF;
    const locked = lockedSet.has(i);
    const frame = new THREE.Group();
    frame.position.set(cx, 0, doorZ);
    const fMat = new THREE.MeshStandardMaterial({ color: "#20130a", roughness: 0.6 });
    const jambL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.3, 0.24), fMat);
    jambL.position.set(-DOOR_W / 2 - 0.06, 1.65, 0);
    frame.add(jambL);
    const jambR = jambL.clone();
    jambR.position.x = DOOR_W / 2 + 0.06;
    frame.add(jambR);
    const header = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.36, 0.16, 0.24), fMat);
    header.position.y = 3.3;
    frame.add(header);
    group.add(frame);

    const baseColor = locked ? "#5a1414" : "#3a2517";
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_W, 3.2, 0.14),
      new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.65 })
    );
    panel.position.set(cx, 1.6, doorZ);
    panel.castShadow = true;
    panel.receiveShadow = true;
    group.add(panel);

    const signMat = new THREE.MeshBasicMaterial({
      map: locked ? signTexture("CERRADA", "#2a0808", "#ff5a4e") : signTexture(roomNumber(floorIndex, i), "#151009", locked ? "#ff5a4e" : "#d9b04c"),
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.45), signMat);
    sign.position.set(cx, 2.95, doorZ + (north ? 0.2 : -0.2));
    if (!north) sign.rotation.y = Math.PI;
    group.add(sign);

    // aplique emisivo junto a la puerta
    const sconce = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 8),
      new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: locked ? 2.2 : 1.3, roughness: 0.4 })
    );
    sconce.position.set(cx + DOOR_W / 2 + 0.35, 2.5, doorZ + (north ? 0.16 : -0.16));
    group.add(sconce);

    const door: DoorInfo = {
      roomIdx: i,
      panel,
      sign,
      signMat,
      frame,
      locked,
      broken: false,
      open01: 0,
      target: 0,
      collider: { minX: cx - DOOR_W / 2, maxX: cx + DOOR_W / 2, minZ: doorZ - 0.18, maxZ: doorZ + 0.18 },
      hp: 80,
      baseColor,
    };

    const room: RoomInfo = { idx: i, zone, center, door, explored: false, chest: null };
    rooms.push(room);

    /* --- interior --- */
    const bedX = cx - 1.6;
    const bedZ = north ? -(HD - 1.2) : HD - 1.2;
    const bedG = new THREE.Group();
    bedG.position.set(bedX, 0, bedZ);
    const bedBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.42, 2.4),
      new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6 })
    );
    bedBase.position.y = 0.21;
    bedG.add(bedBase);
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.3, 2.25),
      new THREE.MeshStandardMaterial({ color: "#d8d2c2", roughness: 0.9 })
    );
    mattress.position.y = 0.55;
    bedG.add(mattress);
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.18, 0.55),
      new THREE.MeshStandardMaterial({ color: "#f0ece0", roughness: 0.95 })
    );
    pillow.position.set(0, 0.74, north ? 0.75 : -0.75);
    bedG.add(pillow);
    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(1.44, 0.12, 1.35),
      new THREE.MeshStandardMaterial({ color: theme.accent, roughness: 0.9 })
    );
    blanket.position.set(0, 0.72, north ? -0.5 : 0.5);
    bedG.add(blanket);
    bedG.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    group.add(bedG);
    colliders.push({ minX: bedX - 0.78, maxX: bedX + 0.78, minZ: bedZ - 1.24, maxZ: bedZ + 1.24 });

    // mesita + lámpara emisiva
    const nX = cx + 1.6;
    const stand = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.62, 0.7),
      new THREE.MeshStandardMaterial({ map: wood, roughness: 0.6 })
    );
    stand.position.set(nX, 0.31, bedZ);
    stand.castShadow = true;
    group.add(stand);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 10, 8),
      new THREE.MeshStandardMaterial({ color: "#ffe8b0", emissive: "#ffcf7a", emissiveIntensity: 2.2 })
    );
    bulb.position.set(nX, 0.86, bedZ);
    group.add(bulb);
    colliders.push({ minX: nX - 0.38, maxX: nX + 0.38, minZ: bedZ - 0.38, maxZ: bedZ + 0.38 });

    // alfombrilla interior
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.03, 1.9),
      new THREE.MeshStandardMaterial({ color: theme.wall, roughness: 0.98 })
    );
    rug.position.set(cx, 0.025, czMid + (north ? 0.6 : -0.6));
    rug.receiveShadow = true;
    group.add(rug);

    // cuadro en la pared del fondo
    const art = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.95, 0.07),
      new THREE.MeshStandardMaterial({ map: paintingTexture((floorIndex * 8 + i) % 7 + 1), roughness: 0.9 })
    );
    art.position.set(cx, 2.7, north ? -(HD - 0.25) : HD - 0.25);
    if (!north) art.rotation.y = Math.PI;
    group.add(art);

    /* --- loot --- */
    const coinCount = irnd(2, 4);
    for (let c = 0; c < coinCount; c++) {
      const coin = new THREE.Mesh(coinGeo, coinMat);
      coin.rotation.x = Math.PI / 2;
      coin.castShadow = true;
      const g = new THREE.Group();
      g.add(coin);
      const px = cx + rnd(-2, 2);
      const pz = czMid + rnd(-1.8, 1.8);
      g.position.set(px, 0.5, pz);
      group.add(g);
      loot.push({ kind: "coin", group: g, pos: g.position.clone(), taken: false, value: irnd(3, 8), phase: rnd(0, 6.28) });
    }

    // botiquín (40%)
    if (Math.random() < 0.4) {
      const kit = makeMedkitMesh();
      kit.position.set(cx + rnd(-2.4, 2.4), 0.55, czMid + rnd(-2.2, 2.2));
      group.add(kit);
      loot.push({ kind: "medkit", group: kit, pos: kit.position.clone(), taken: false, value: 30, phase: rnd(0, 6.28) });
    }
  }

  /* llave garantizada en una habitación libre */
  {
    const kx = ROOM_CX[keyRoom % 4] + rnd(-1, 1);
    const kz = (keyRoom < 4 ? -1 : 1) * (CORR_HALF + T + ROOM_D / 2);
    const key = makeKeyMesh();
    key.position.set(kx, 0.6, kz);
    group.add(key);
    loot.push({ kind: "key", group: key, pos: key.position.clone(), taken: false, value: 1, phase: rnd(0, 6.28) });
  }

  // cofre grande en una habitación cerrada (recompensa)
  if (lockedSet.size > 0) {
    const chestRoom = [...lockedSet][0];
    const cx = ROOM_CX[chestRoom % 4];
    const north = chestRoom < 4;
    const cz = north ? -(HD - 1.1) : HD - 1.1;
    const chest = makeChestMesh(theme.accent);
    chest.position.set(cx + 2.4, 0.45, cz);
    chest.rotation.y = north ? 0 : Math.PI;
    group.add(chest);
    colliders.push({ minX: cx + 2.0, maxX: cx + 2.8, minZ: cz - 0.45, maxZ: cz + 0.45 });
    rooms[chestRoom].chest = { kind: "chest", group: chest, pos: chest.position.clone(), taken: false, value: irnd(50, 90), phase: 0 };
  }

  /* --------------------------- decoración pasillo --------------------------- */
  const potMat = new THREE.MeshStandardMaterial({ color: "#6e3b22", roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: "#1e5c33", roughness: 0.9 });
  const addPlant = (x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 12), potMat);
    pot.position.y = 0.27;
    pot.castShadow = true;
    g.add(pot);
    for (let l = 0; l < 4; l++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.26 - l * 0.03, 10, 8), leafMat);
      leaf.position.set(rnd(-0.12, 0.12), 0.72 + l * 0.22, rnd(-0.12, 0.12));
      leaf.castShadow = true;
      g.add(leaf);
    }
    group.add(g);
    colliders.push({ minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.35, maxZ: z + 0.35 });
  };
  addPlant(-13.4, 1.6);
  addPlant(13.4, -1.6);
  addPlant(-6.5, -1.7);
  addPlant(6.5, 1.7);

  // cuadros del pasillo
  for (let i = 0; i < 6; i++) {
    const art = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.95, 0.07),
      new THREE.MeshStandardMaterial({ map: paintingTexture((i + floorIndex * 3) % 7 + 1), roughness: 0.9 })
    );
    art.position.set(-9 + (i % 3) * 8, 2.9, i < 3 ? -(CORR_HALF + T + 0.06) : CORR_HALF + T + 0.06);
    if (i >= 3) art.rotation.y = Math.PI;
    group.add(art);
  }

  // lámparas del pasillo (emisivas) + 2 luces reales
  for (let i = 0; i < 4; i++) {
    const x = -9 + i * 6;
    const z = i % 2 ? CORR_HALF - 0.12 : -(CORR_HALF - 0.12);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 10, 8),
      new THREE.MeshStandardMaterial({ color: "#ffe8b0", emissive: "#ffcf7a", emissiveIntensity: 2.4 })
    );
    bulb.position.set(x, 4.1, z);
    group.add(bulb);
  }
  const hallLight1 = new THREE.PointLight(new THREE.Color("#ffd9a0"), 34, 18, 1.7);
  hallLight1.position.set(-7, 4.0, 0);
  group.add(hallLight1);
  const hallLight2 = new THREE.PointLight(new THREE.Color("#ffd9a0"), 34, 18, 1.7);
  hallLight2.position.set(7, 4.0, 0);
  group.add(hallLight2);

  // techo
  const ceil = new THREE.Mesh(
    new THREE.BoxGeometry(HW * 2, 0.2, HD * 2),
    new THREE.MeshStandardMaterial({ color: "#0c1320", roughness: 1 })
  );
  ceil.position.y = 4.75;
  group.add(ceil);

  // máquina de vending al este (decor + collider)
  const vend = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 2.2, 0.9),
    new THREE.MeshStandardMaterial({ color: "#16324a", roughness: 0.4, emissive: "#0d5f8a", emissiveIntensity: 0.5 })
  );
  vend.position.set(HW - 0.8, 1.1, -CORR_HALF + 0.9);
  vend.castShadow = true;
  group.add(vend);
  colliders.push({ minX: HW - 1.4, maxX: HW - 0.2, minZ: -CORR_HALF + 0.4, maxZ: -CORR_HALF + 1.4 });

  /* --------------------------- niebla / fondo --------------------------- */
  scene.background = new THREE.Color(theme.fog);
  scene.fog = new THREE.Fog(new THREE.Color(theme.fog), 20, 46);

  scene.add(group);

  const corridor: Zone = { minX: -HW + 1, maxX: HW - 1, minZ: -CORR_HALF, maxZ: CORR_HALF, kind: "corridor", idx: -1 };
  const zones: Zone[] = [corridor, ...rooms.map((r) => r.zone)];
  const spawnPoints: THREE.Vector3[] = [
    new THREE.Vector3(-HW + 1.2, 0, 0),
    ...rooms.map((r) => r.center.clone()),
  ];

  return {
    group,
    colliders,
    zones,
    rooms,
    corridor,
    loot,
    elevatorPos: new THREE.Vector3(-HW + 0.9, 0, 0),
    playerStart: new THREE.Vector3(-HW + 3.6, 0, 0),
    spawnPoints,
    setElevatorGlow,
    dispose: () => {
      scene.remove(group);
      disposeObject(group);
    },
  };
}

function roomNumber(floorIndex: number, i: number): string {
  const base = 100 + floorIndex * 13;
  return String(base + i * 2);
}

/* ------------------------------ loot meshes ------------------------------ */

export function makeMedkitMesh(): THREE.Group {
  const g = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.34, 0.36),
    new THREE.MeshStandardMaterial({ color: "#f2f2f2", roughness: 0.5 })
  );
  box.castShadow = true;
  g.add(box);
  const crossMat = new THREE.MeshStandardMaterial({ color: "#ff3b30", emissive: "#ff3b30", emissiveIntensity: 0.8 });
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.08, 0.02), crossMat);
  c1.position.z = 0.19;
  g.add(c1);
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.02), crossMat);
  c2.position.z = 0.19;
  g.add(c2);
  return g;
}

export function makeKeyMesh(): THREE.Group {
  const g = new THREE.Group();
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.22, 0.04),
    new THREE.MeshStandardMaterial({ color: "#38e1d4", emissive: "#38e1d4", emissiveIntensity: 1.4, roughness: 0.3 })
  );
  card.castShadow = true;
  g.add(card);
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.06, 0.05),
    new THREE.MeshStandardMaterial({ color: "#0a2a28", roughness: 0.4 })
  );
  g.add(band);
  return g;
}

export function makeChestMesh(accent: string): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: "#5a3a22", roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.6), woodMat);
  body.position.y = 0.06;
  body.castShadow = true;
  g.add(body);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.2, 0.64), woodMat);
  lid.position.y = 0.4;
  lid.rotation.x = -0.35;
  g.add(lid);
  const goldMat = new THREE.MeshStandardMaterial({ color: "#e9b23c", metalness: 0.8, roughness: 0.3, emissive: accent, emissiveIntensity: 0.35 });
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.1, 0.66), goldMat);
  band.position.y = 0.28;
  g.add(band);
  return g;
}

function marbleFloor(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const tile = 64;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const even = (x + y) % 2 === 0;
      g.fillStyle = even ? "#20293c" : "#39445c";
      g.fillRect(x * tile, y * tile, tile, tile);
      g.strokeStyle = "rgba(0,0,0,0.4)";
      g.lineWidth = 2;
      g.strokeRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
      // vetas sutiles
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 6);
  tex.anisotropy = 8;
  return tex;
}
