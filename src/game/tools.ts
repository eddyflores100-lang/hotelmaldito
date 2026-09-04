/* ============================================================
   HOTEL ∞ INFINITO — Herramientas recogibles (6).
   Cada herramienta es una malla estilizada (cero cubos crudos)
   con estadísticas propias de daño / alcance / cadencia.
   Se recogen caminando sobre ellas y se equipan al instante.
   ============================================================ */
import * as THREE from "three";
import { bristleFan, rbox, std } from "./shapes";

export type ToolType = "escoba" | "plumero" | "sarten" | "bate" | "hacha" | "varita";

export type ToolStats = {
  name: string;
  desc: string;
  dmg: number;
  reach: number;      // alcance del arco (unidades de mundo)
  cd: number;         // segundos entre golpes
  knock: number;      // multiplicador de empuje
  arcDot: number;     // cos mínimo del arco (menor = más ancho)
  color: string;      // color de destellos
  glow: string;       // color del anillo de recogida
};

export const TOOLS: Record<ToolType, ToolStats> = {
  escoba:  { name: "ESCOBA",       desc: "Fiel y ligera",        dmg: 19, reach: 2.15, cd: 0.42, knock: 1.0, arcDot: 0.35, color: "#d9a44a", glow: "#a8e63c" },
  plumero: { name: "PLUMERO",      desc: "Ráfagas veloces",      dmg: 13, reach: 1.9,  cd: 0.24, knock: 0.7, arcDot: 0.4,  color: "#ff9ad5", glow: "#ff9ad5" },
  sarten:  { name: "SARTÉN",       desc: "Golpes contundentes",  dmg: 34, reach: 2.05, cd: 0.6,  knock: 1.7, arcDot: 0.3,  color: "#8fa3b8", glow: "#8fd0ff" },
  bate:    { name: "BATE DE MADERA", desc: "Alcance y empuje",   dmg: 27, reach: 2.5,  cd: 0.55, knock: 2.1, arcDot: 0.3,  color: "#c98d4a", glow: "#ffc46b" },
  hacha:   { name: "HACHA DE BOMBERO", desc: "Daño brutal",      dmg: 44, reach: 2.15, cd: 0.8,  knock: 1.3, arcDot: 0.35, color: "#ff6a4e", glow: "#ff6a4e" },
  varita:  { name: "VARITA ∞",     desc: "Arco etéreo amplio",   dmg: 24, reach: 2.75, cd: 0.36, knock: 1.0, arcDot: 0.05, color: "#57e6ff", glow: "#57e6ff" },
};

export const TOOL_ORDER: ToolType[] = ["escoba", "plumero", "sarten", "bate", "hacha", "varita"];

/* ------------------------------ mallas ------------------------------ */

/**
 * Malla de la herramienta con el ORIGEN en la empuñadura y la parte
 * activa hacia +Z (lista para acoplar al pivote del arma del jugador).
 */
export function makeToolMesh(type: ToolType): THREE.Group {
  const g = new THREE.Group();
  const wood = std("#8a5a30", 0.65);
  const darkWood = std("#5a3a22", 0.7);

  const pole = (len: number, rTop: number, rBottom: number, mat: THREE.Material, z0 = 0): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, len, 10), mat);
    m.rotation.x = Math.PI / 2;
    m.position.z = z0 + len / 2;
    m.castShadow = true;
    return m;
  };

  switch (type) {
    case "escoba": {
      // mango cónico + férula + abanico de cerdas de verdad
      g.add(pole(1.35, 0.028, 0.042, wood));
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.12, 10), std("#b0893a", 0.4, 0.6));
      ferrule.rotation.x = Math.PI / 2;
      ferrule.position.z = 1.4;
      g.add(ferrule);
      const bristles = bristleFan(18, 2.0, 0.6, 0.024, std("#d9a44a", 0.9));
      bristles.position.z = 1.44;
      bristles.rotation.x = 0.85; // caen hacia adelante
      g.add(bristles);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 14), std("#a8e63c", 0.5, 0.2, "#4a7a10", 0.35));
      collar.position.z = 1.5;
      collar.rotation.y = Math.PI / 2;
      g.add(collar);
      break;
    }
    case "plumero": {
      g.add(pole(1.3, 0.02, 0.026, darkWood));
      const fluff = new THREE.Group();
      fluff.position.z = 1.34;
      const featherMat = std("#ff9ad5", 0.85, 0, "#c24a8a", 0.25);
      const featherMat2 = std("#e8b8ff", 0.85, 0, "#9a5ac2", 0.25);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const feather = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.34, 7), i % 2 ? featherMat : featherMat2);
        feather.position.set(Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0.05);
        feather.rotation.x = Math.cos(a) * 0.85 + Math.PI / 2.6;
        feather.rotation.y = -Math.sin(a) * 0.85;
        feather.castShadow = true;
        fluff.add(feather);
      }
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), featherMat);
      fluff.add(core);
      g.add(fluff);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 8, 12), std("#e9b23c", 0.4, 0.7));
      band.position.z = 1.22;
      g.add(band);
      break;
    }
    case "sarten": {
      // mango + disco con borde remachado
      const grip = pole(0.72, 0.032, 0.036, std("#1c2026", 0.55, 0.3));
      g.add(grip);
      for (const z of [0.16, 0.3, 0.44]) {
        const gripRing = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.011, 8, 12), std("#2c333c", 0.5, 0.4));
        gripRing.position.z = z;
        g.add(gripRing);
      }
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.14, 10), std("#4a5560", 0.45, 0.6));
      neck.rotation.x = Math.PI / 2;
      neck.position.z = 0.78;
      g.add(neck);
      const panMat = std("#39424e", 0.35, 0.75, "#101820", 0.3);
      const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.28, 0.1, 20), panMat);
      pan.rotation.x = Math.PI / 2;
      pan.position.z = 1.0;
      pan.castShadow = true;
      g.add(pan);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.022, 8, 22), std("#5a6674", 0.3, 0.85));
      rim.position.z = 1.0;
      g.add(rim);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 18), std("#222831", 0.4, 0.6));
      base.rotation.x = Math.PI / 2;
      base.position.z = 0.94;
      g.add(base);
      break;
    }
    case "bate": {
      // goma de agarre + mazo cónico + punta redondeada
      const tape = pole(0.34, 0.05, 0.05, std("#26292e", 0.8));
      g.add(tape);
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.042, 1.05, 12), std("#c98d4a", 0.6));
      barrel.rotation.x = Math.PI / 2;
      barrel.position.z = 0.34 + 1.05 / 2;
      barrel.castShadow = true;
      g.add(barrel);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 10), std("#c98d4a", 0.6));
      tip.position.z = 1.44;
      g.add(tip);
      const ringBand = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.014, 8, 12), std("#8a5a30", 0.6));
      ringBand.position.z = 0.36;
      g.add(ringBand);
      break;
    }
    case "hacha": {
      g.add(pole(1.4, 0.03, 0.042, std("#7a3a28", 0.65)));
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), std("#3a3f46", 0.4, 0.7));
      collar.rotation.x = Math.PI / 2;
      collar.position.z = 1.12;
      g.add(collar);
      // hoja: sector cónico aplastado
      const blade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.42, 0.52, 14, 1, false, 0, Math.PI * 1.05),
        std("#c9ccd4", 0.22, 0.9, "#4a5560", 0.25)
      );
      blade.rotation.set(Math.PI / 2, 0, Math.PI * 0.975);
      blade.scale.set(1, 1, 0.32);
      blade.position.set(0.02, 0, 1.28);
      blade.castShadow = true;
      g.add(blade);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), std("#8a9098", 0.35, 0.8));
      spike.rotation.x = Math.PI / 2;
      spike.position.set(-0.16, 0, 1.28);
      g.add(spike);
      const wedge = new THREE.Mesh(rbox(0.16, 0.2, 0.14, 0.05), std("#3a3f46", 0.4, 0.7));
      wedge.position.set(0, 0, 1.26);
      g.add(wedge);
      break;
    }
    case "varita": {
      g.add(pole(1.25, 0.018, 0.024, std("#2a2438", 0.4, 0.4)));
      const gripGold = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.22, 10), std("#e9b23c", 0.35, 0.8));
      gripGold.rotation.x = Math.PI / 2;
      gripGold.position.z = 0.12;
      g.add(gripGold);
      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.11),
        std("#57e6ff", 0.15, 0.2, "#57e6ff", 2.6)
      );
      orb.position.z = 1.36;
      g.add(orb);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.014, 8, 20), std("#9af0ff", 0.2, 0.3, "#57e6ff", 1.4));
      halo.position.z = 1.36;
      halo.rotation.x = 0.6;
      g.add(halo);
      const star2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), std("#ffffff", 0.1, 0, "#baf6ff", 3));
      star2.position.set(0.09, 0.07, 1.44);
      g.add(star2);
      break;
    }
  }
  return g;
}

/** Pedestal de recogida: herramienta en vertical + anillo de luz + chispa. */
export function makeToolPickupMesh(type: ToolType): { group: THREE.Group; spinner: THREE.Group } {
  const stats = TOOLS[type];
  const group = new THREE.Group();
  const spinner = new THREE.Group();

  const tool = makeToolMesh(type);
  tool.rotation.x = -Math.PI / 2; // de tumbada a vertical
  tool.position.y = 0.62;
  tool.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; });
  spinner.add(tool);
  group.add(spinner);

  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.035, 8, 26),
    std(stats.glow, 0.3, 0.2, stats.glow, 2.2)
  );
  glowRing.rotation.x = Math.PI / 2;
  glowRing.position.y = 0.07;
  group.add(glowRing);

  const inner = new THREE.Mesh(
    new THREE.TorusGeometry(0.3, 0.018, 8, 22),
    std("#ffffff", 0.3, 0.1, stats.glow, 1.4)
  );
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.07;
  group.add(inner);

  const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.075), std("#ffffff", 0.1, 0, stats.glow, 3));
  spark.position.y = 1.85;
  group.add(spark);

  return { group, spinner };
}
