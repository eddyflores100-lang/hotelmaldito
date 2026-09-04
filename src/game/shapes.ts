/* ============================================================
   HOTEL ∞ INFINITO — Kit de geometría estilizada.
   Nada de cubos crudos: biseles redondeados, tornamesas
   (lathe) para vasijas/lámparas, cápsulas y abanicos.
   ============================================================ */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

/** Caja con aristas redondeadas (el caballo de batalla anti-bloques). */
export function rbox(w: number, h: number, d: number, r = 0.06, seg = 2): RoundedBoxGeometry {
  const rad = Math.min(r, w / 2.02, h / 2.02, d / 2.02);
  return new RoundedBoxGeometry(w, h, d, seg, rad);
}

/**
 * Tornamesa (lathe) a partir de un perfil [radio, altura] normalizado a
 * `height`. Ideal para jarrones, lámparas, fuentes y pomos.
 */
export function lathe(profile: [number, number][], height: number, seg = 14): THREE.LatheGeometry {
  const pts = profile.map(([rr, t]) => new THREE.Vector2(Math.max(0.001, rr), t * height));
  return new THREE.LatheGeometry(pts, seg);
}

/** Cápsula vertical: total = length + 2·radius. */
export function capsule(radius: number, length: number, capSeg = 4, radialSeg = 10): THREE.CapsuleGeometry {
  return new THREE.CapsuleGeometry(radius, Math.max(0.01, length), capSeg, radialSeg);
}

/**
 * Abanico de cerdas (escobas/plumeros): varillas cónicas dispuestas en
 * arco alrededor de un origen, con caída natural.
 */
export function bristleFan(
  count: number,
  spread: number,       // apertura total del abanico (radianes)
  len: number,          // largo de cerda
  rBase: number,        // radio base de cada cerda
  mat: THREE.Material
): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const ang = (t - 0.5) * spread;
    const tilt = Math.abs(ang) * 0.9;
    const bristle = new THREE.Mesh(new THREE.CylinderGeometry(rBase * 0.35, rBase, len, 5), mat);
    bristle.position.set(Math.sin(ang) * len * 0.42, -Math.cos(tilt * 0.4) * len * 0.46, 0);
    bristle.rotation.z = ang * 1.35;
    bristle.castShadow = true;
    g.add(bristle);
  }
  return g;
}

/** Material rápido estándar. */
export function std(
  color: string,
  rough = 0.7,
  metal = 0.05,
  emissive?: string,
  emissiveIntensity = 0
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    ...(emissive ? { emissive: new THREE.Color(emissive), emissiveIntensity } : {}),
  });
}

/** Aro/toro fino helper. */
export function ring(radius: number, tube: number, mat: THREE.Material, seg = 18): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, seg), mat);
  m.rotation.x = Math.PI / 2;
  return m;
}
