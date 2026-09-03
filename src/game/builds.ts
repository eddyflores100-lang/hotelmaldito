/* ============================================================
   HOTEL ∞ INFINITO — Construcciones defensivas: barricadas,
   torretas y botiquines colocables por el jugador.
   ============================================================ */
import * as THREE from "three";
import { disposeObject } from "./util";

export type BuildKind = "barricade" | "turret" | "medkit";

export const BUILD_COST: Record<BuildKind, number> = {
  barricade: 25,
  turret: 60,
  medkit: 40,
};

export const BUILD_INFO: Record<BuildKind, { name: string; desc: string; color: string }> = {
  barricade: { name: "BARRICADA", desc: "Muro de maletas. Bloquea a las anomalías.", color: "#e9b23c" },
  turret: { name: "TORRETA", desc: "Dispara sola a las anomalías cercanas.", color: "#38e1d4" },
  medkit: { name: "BOTIQUÍN", desc: "Estación de curación (+30 vida).", color: "#ff5a4e" },
};

export type Buildable = {
  kind: BuildKind;
  group: THREE.Group;
  pos: THREE.Vector3;
  hp: number;
  maxHp: number;
  alive: boolean;
  // torreta
  head?: THREE.Group;
  cd?: number;
  range?: number;
  dmg?: number;
  // botiquín
  recharge?: number;
  // barricada
  aabb?: { minX: number; maxX: number; minZ: number; maxZ: number };
};

export function makeGhostMesh(kind: BuildKind): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: "#a8e63c", transparent: true, opacity: 0.4, depthWrite: false });
  if (kind === "barricade") {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.4, 0.6), mat);
    m.position.y = 0.7;
    g.add(m);
  } else if (kind === "turret") {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.35, 12), mat);
    base.position.y = 0.17;
    g.add(base);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.7), mat);
    head.position.y = 0.62;
    g.add(head);
  } else {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.5), mat);
    m.position.y = 0.4;
    g.add(m);
  }
  return g;
}

export function buildStructure(kind: BuildKind, pos: THREE.Vector3, difficulty: number): Buildable {
  const g = new THREE.Group();
  g.position.copy(pos);
  const b: Buildable = {
    kind,
    group: g,
    pos: pos.clone(),
    hp: 100,
    maxHp: 100,
    alive: true,
  };

  if (kind === "barricade") {
    b.maxHp = 130 + difficulty * 6;
    b.hp = b.maxHp;
    const woodMat = new THREE.MeshStandardMaterial({ color: "#6b4a2a", roughness: 0.7 });
    const caseMats = ["#7a1f1f", "#1f3a7a", "#3a6b2a", "#6b4a2a"];
    for (let i = 0; i < 3; i++) {
      const suitcase = new THREE.Mesh(
        new THREE.BoxGeometry(0.52, 0.42, 0.34),
        new THREE.MeshStandardMaterial({ color: caseMats[i % caseMats.length], roughness: 0.6 })
      );
      suitcase.position.set(-0.56 + i * 0.56, 0.21 + (i === 1 ? 0.02 : 0), 0);
      suitcase.rotation.y = (i - 1) * 0.08;
      suitcase.castShadow = true;
      g.add(suitcase);
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.32),
        new THREE.MeshStandardMaterial({ color: caseMats[(i + 2) % caseMats.length], roughness: 0.6 })
      );
      top.position.set(-0.56 + i * 0.56, 0.64, 0);
      top.rotation.y = (i - 1) * -0.06;
      top.castShadow = true;
      g.add(top);
    }
    const plank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.7), woodMat);
    plank.position.y = 0.9;
    plank.rotation.z = 0.03;
    g.add(plank);
    b.aabb = { minX: pos.x - 0.85, maxX: pos.x + 0.85, minZ: pos.z - 0.35, maxZ: pos.z + 0.35 };
  } else if (kind === "turret") {
    b.maxHp = 90;
    b.hp = b.maxHp;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.62, 0.36, 14),
      new THREE.MeshStandardMaterial({ color: "#2b3648", roughness: 0.45, metalness: 0.5 })
    );
    base.position.y = 0.18;
    base.castShadow = true;
    g.add(base);
    const head = new THREE.Group();
    head.position.y = 0.62;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.4, 0.7),
      new THREE.MeshStandardMaterial({ color: "#38e1d4", emissive: "#0d6b64", emissiveIntensity: 0.7, roughness: 0.35, metalness: 0.4 })
    );
    body.castShadow = true;
    head.add(body);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.55, 10),
      new THREE.MeshStandardMaterial({ color: "#131a26", metalness: 0.7, roughness: 0.3 })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, 0.5);
    head.add(barrel);
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      new THREE.MeshStandardMaterial({ color: "#a8e63c", emissive: "#a8e63c", emissiveIntensity: 2 })
    );
    eye.position.set(0, 0.26, -0.18);
    head.add(eye);
    g.add(head);
    b.head = head;
    b.cd = 0;
    b.range = 9;
    b.dmg = 12;
  } else {
    b.maxHp = 70;
    b.hp = b.maxHp;
    b.recharge = 0;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.78, 0.48),
      new THREE.MeshStandardMaterial({ color: "#e8e4da", roughness: 0.5 })
    );
    box.position.y = 0.39;
    box.castShadow = true;
    g.add(box);
    const crossMat = new THREE.MeshStandardMaterial({ color: "#ff3b30", emissive: "#ff3b30", emissiveIntensity: 1.1 });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.11, 0.03), crossMat);
    c1.position.set(0, 0.5, 0.25);
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.34, 0.03), crossMat);
    c2.position.set(0, 0.5, 0.25);
    g.add(c2);
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.12, 0.4),
      new THREE.MeshStandardMaterial({ color: "#8a8a8a", metalness: 0.6, roughness: 0.4 })
    );
    legs.position.y = 0.06;
    g.add(legs);
  }

  return b;
}

export function disposeBuildable(b: Buildable): void {
  disposeObject(b.group);
}

/* proyectiles de torreta */
export type Projectile = {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  dmg: number;
};

export function makeProjectile(pos: THREE.Vector3, dir: THREE.Vector3, dmg: number): Projectile {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 6),
    new THREE.MeshBasicMaterial({ color: "#8dff5e" })
  );
  mesh.position.copy(pos);
  return {
    mesh,
    vel: dir.multiplyScalar(16),
    life: 1.1,
    dmg,
  };
}
