/* ============================================================
   HOTEL ∞ INFINITO — Demo 3D · utilidades y texturas
   ============================================================ */
import * as THREE from "three";

export const STUD = 0.32; // 1 stud Roblox → unidades de mundo

export function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}
export function irnd(a: number, b: number): number {
  return Math.floor(rnd(a, b + 1));
}
export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
export function damp(a: number, b: number, k: number, dt: number): number {
  return lerp(a, b, 1 - Math.exp(-k * dt));
}

/* ------------------------------ caras ------------------------------ */

export type FaceVariant = "happy" | "worried" | "angry" | "empty" | "red";

export function faceTexture(variant: FaceVariant, skin: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = skin;
  g.fillRect(0, 0, 256, 256);

  const eye = (x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    g.fill();
  };

  if (variant === "red") {
    // cuencas negras + ojos rojos brillantes
    eye(88, 108, 30, 34, "#0a0a0a");
    eye(168, 108, 30, 34, "#0a0a0a");
    eye(88, 108, 12, 14, "#ff2418");
    eye(168, 108, 12, 14, "#ff2418");
    g.strokeStyle = "#1a0505";
    g.lineWidth = 7;
    g.beginPath();
    g.arc(128, 190, 40, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  } else if (variant === "empty") {
    g.strokeStyle = "#1b1b1b";
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(66, 104); g.lineTo(108, 104);
    g.moveTo(148, 104); g.lineTo(190, 104);
    g.stroke();
    g.beginPath();
    g.moveTo(96, 186); g.lineTo(160, 186);
    g.stroke();
  } else {
    const dark = "#161616";
    if (variant === "happy") {
      eye(92, 104, 11, 16, dark);
      eye(164, 104, 11, 16, dark);
      g.strokeStyle = dark;
      g.lineWidth = 8;
      g.lineCap = "round";
      g.beginPath();
      g.arc(128, 158, 42, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    } else if (variant === "worried") {
      eye(92, 108, 12, 15, dark);
      eye(164, 108, 12, 15, dark);
      g.strokeStyle = dark;
      g.lineWidth = 7;
      g.lineCap = "round";
      g.beginPath();
      g.arc(128, 205, 34, Math.PI * 1.2, Math.PI * 1.8);
      g.stroke();
      g.beginPath();
      g.moveTo(74, 86); g.lineTo(106, 94);
      g.moveTo(182, 86); g.lineTo(150, 94);
      g.stroke();
    } else {
      // angry
      eye(92, 110, 12, 12, dark);
      eye(164, 110, 12, 12, dark);
      g.strokeStyle = dark;
      g.lineWidth = 8;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(72, 84); g.lineTo(108, 98);
      g.moveTo(184, 84); g.lineTo(148, 98);
      g.stroke();
      g.beginPath();
      g.arc(128, 214, 30, Math.PI * 1.25, Math.PI * 1.75);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Cara como decal transparente (para cabezas esféricas). */
export function faceDecalTexture(variant: FaceVariant): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.clearRect(0, 0, 256, 256);
  g.lineCap = "round";

  const eye = (x: number, y: number, w: number, h: number, color: string) => {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    g.fill();
  };
  const dark = variant === "red" || variant === "empty" ? "#101014" : "#161616";

  if (variant === "red") {
    eye(88, 112, 26, 30, "#0a0a0a");
    eye(168, 112, 26, 30, "#0a0a0a");
    eye(88, 112, 11, 13, "#ff2418");
    eye(168, 112, 11, 13, "#ff2418");
    g.strokeStyle = "#1a0505";
    g.lineWidth = 8;
    g.beginPath();
    g.arc(128, 186, 38, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  } else if (variant === "empty") {
    g.strokeStyle = "#0c0c10";
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(70, 112); g.lineTo(106, 112);
    g.moveTo(150, 112); g.lineTo(186, 112);
    g.stroke();
    g.beginPath();
    g.moveTo(100, 188); g.lineTo(156, 188);
    g.stroke();
  } else if (variant === "happy") {
    eye(94, 110, 11, 16, dark);
    eye(162, 110, 11, 16, dark);
    g.strokeStyle = dark;
    g.lineWidth = 9;
    g.beginPath();
    g.arc(128, 150, 42, Math.PI * 0.15, Math.PI * 0.85);
    g.stroke();
  } else if (variant === "worried") {
    eye(94, 114, 12, 15, dark);
    eye(162, 114, 12, 15, dark);
    g.strokeStyle = dark;
    g.lineWidth = 8;
    g.beginPath();
    g.arc(128, 214, 34, Math.PI * 1.2, Math.PI * 1.8);
    g.stroke();
    g.beginPath();
    g.moveTo(76, 92); g.lineTo(108, 100);
    g.moveTo(180, 92); g.lineTo(148, 100);
    g.stroke();
  } else {
    // angry
    eye(94, 116, 12, 12, dark);
    eye(162, 116, 12, 12, dark);
    g.strokeStyle = dark;
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(74, 90); g.lineTo(110, 104);
    g.moveTo(182, 90); g.lineTo(146, 104);
    g.stroke();
    g.beginPath();
    g.arc(128, 226, 30, Math.PI * 1.25, Math.PI * 1.75);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* --------------------------- mármol (suelo) --------------------------- */

export function marbleTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const tile = 128;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const even = (x + y) % 2 === 0;
      g.fillStyle = even ? "#e8e2d4" : "#141d2e";
      g.fillRect(x * tile, y * tile, tile, tile);
      // vetas
      g.strokeStyle = even ? "rgba(120,110,90,0.25)" : "rgba(140,170,220,0.12)";
      g.lineWidth = 1.4;
      for (let v = 0; v < 5; v++) {
        g.beginPath();
        const sx = x * tile + rnd(0, tile);
        const sy = y * tile + rnd(0, tile);
        g.moveTo(sx, sy);
        g.bezierCurveTo(sx + rnd(-40, 40), sy + rnd(-40, 40), sx + rnd(-60, 60), sy + rnd(-60, 60), sx + rnd(-80, 80), sy + rnd(-80, 80));
        g.stroke();
      }
      // junta
      g.strokeStyle = "rgba(0,0,0,0.35)";
      g.lineWidth = 2;
      g.strokeRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(7, 5);
  tex.anisotropy = 8;
  return tex;
}

/* ----------------------------- alfombra ----------------------------- */

export function carpetTexture(base: string, border: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 512);
  // ruido de fibra
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${irnd(0, 60)},0,0,${rnd(0.03, 0.1)})`;
    g.fillRect(rnd(0, 256), rnd(0, 512), 2, 2);
  }
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(255,220,190,${rnd(0.02, 0.06)})`;
    g.fillRect(rnd(0, 256), rnd(0, 512), 2, 2);
  }
  // cenefa
  g.strokeStyle = border;
  g.lineWidth = 18;
  g.strokeRect(14, 14, 228, 484);
  g.lineWidth = 5;
  g.strokeRect(40, 40, 176, 432);
  // rombos
  g.strokeStyle = border;
  g.lineWidth = 4;
  for (let y = 80; y < 480; y += 64) {
    g.beginPath();
    g.moveTo(128, y); g.lineTo(158, y + 32); g.lineTo(128, y + 64); g.lineTo(98, y + 32);
    g.closePath();
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------------- madera ------------------------------- */

export function woodTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#5a3a22";
  g.fillRect(0, 0, 256, 256);
  for (let p = 0; p < 4; p++) {
    g.fillStyle = p % 2 ? "#63412a" : "#54351f";
    g.fillRect(p * 64, 0, 64, 256);
    g.strokeStyle = "rgba(30,15,5,0.6)";
    g.lineWidth = 2;
    g.strokeRect(p * 64 + 1, 0, 62, 256);
  }
  // vetas
  g.strokeStyle = "rgba(35,18,8,0.35)";
  for (let i = 0; i < 70; i++) {
    g.lineWidth = rnd(0.6, 1.8);
    const x = rnd(0, 256);
    g.beginPath();
    g.moveTo(x, 0);
    g.bezierCurveTo(x + rnd(-14, 14), 64, x + rnd(-14, 14), 192, x + rnd(-10, 10), 256);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------ cuadros ------------------------------ */

export function paintingTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 192;
  const g = c.getContext("2d")!;
  g.fillStyle = seed % 2 ? "#1a2436" : "#241a20";
  g.fillRect(0, 0, 256, 192);
  // silueta
  g.fillStyle = "#0c0f16";
  g.beginPath();
  g.ellipse(128, 84, 34 + (seed % 3) * 6, 42, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(84, 118, 88, 74);
  // ojos (a veces)
  if (seed % 3 !== 0) {
    g.fillStyle = seed % 3 === 1 ? "#e8e2d4" : "#ff2418";
    g.beginPath(); g.ellipse(114, 78, 4, 5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(142, 78, 4, 5, 0, 0, Math.PI * 2); g.fill();
  }
  // polvo
  for (let i = 0; i < 500; i++) {
    g.fillStyle = `rgba(255,255,255,${rnd(0.01, 0.05)})`;
    g.fillRect(rnd(0, 256), rnd(0, 192), 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* --------------------------- rótulos varios --------------------------- */

export function signTexture(text: string, bg: string, fg: string, sub?: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 128);
  g.strokeStyle = fg;
  g.lineWidth = 6;
  g.strokeRect(6, 6, 244, 116);
  g.fillStyle = fg;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "bold 56px 'Bungee', 'Arial Black', sans-serif";
  g.fillText(text, 128, sub ? 52 : 64);
  if (sub) {
    g.font = "bold 26px 'Arial', sans-serif";
    g.fillText(sub, 128, 94);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/* --------------------------- papel pintado --------------------------- */

export function wallpaperTexture(base: string, accent: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  // rayas verticales sutiles
  for (let x = 0; x < 256; x += 32) {
    g.fillStyle = "rgba(255,255,255,0.03)";
    g.fillRect(x, 0, 14, 256);
  }
  // damasco simple (rombos + puntos)
  g.strokeStyle = accent;
  g.globalAlpha = 0.22;
  g.lineWidth = 2.2;
  for (let y = 0; y < 256; y += 64) {
    for (let x = 0; x < 256; x += 64) {
      const ox = (y / 64) % 2 ? 32 : 0;
      g.beginPath();
      g.moveTo(x + ox, y + 8);
      g.quadraticCurveTo(x + ox + 16, y + 26, x + ox, y + 44);
      g.quadraticCurveTo(x + ox - 16, y + 26, x + ox, y + 8);
      g.stroke();
      g.beginPath();
      g.arc(x + ox, y + 54, 2.4, 0, Math.PI * 2);
      g.fillStyle = accent;
      g.fill();
    }
  }
  g.globalAlpha = 1;
  // polvo
  for (let i = 0; i < 700; i++) {
    g.fillStyle = `rgba(0,0,0,${rnd(0.02, 0.06)})`;
    g.fillRect(rnd(0, 256), rnd(0, 256), 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/* ------------------------------- parqué ------------------------------- */

export function parquetTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  const pl = 32;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const shade = ((x + y) % 2 ? 0.5 : 0) + rnd(-0.08, 0.08);
      const l = Math.round(96 + shade * 90);
      g.fillStyle = `hsl(${irnd(24, 34)}, ${irnd(38, 52)}%, ${irnd(18, 30)}%)`;
      g.fillRect(x * pl, y * pl, pl, pl);
      g.strokeStyle = "rgba(20,10,4,0.5)";
      g.lineWidth = 1.4;
      g.strokeRect(x * pl + 0.7, y * pl + 0.7, pl - 1.4, pl - 1.4);
      g.strokeStyle = "rgba(255,220,170,0.08)";
      g.beginPath();
      g.moveTo(x * pl, y * pl + pl / 2);
      g.lineTo(x * pl + pl, y * pl + pl / 2);
      g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------- baldosas (baño) ------------------------- */

export function tileTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#b8c6c4";
  g.fillRect(0, 0, 256, 256);
  const t = 64;
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const l = irnd(0, 3);
      g.fillStyle = l === 0 ? "#aebcbc" : l === 1 ? "#c2cfcd" : "#9fb0ae";
      g.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
      g.strokeStyle = "rgba(50,70,70,0.5)";
      g.lineWidth = 3;
      g.strokeRect(x * t + 2, y * t + 2, t - 4, t - 4);
      // brillo
      g.fillStyle = "rgba(255,255,255,0.16)";
      g.beginPath();
      g.moveTo(x * t + 6, y * t + t - 10);
      g.lineTo(x * t + 20, y * t + 6);
      g.lineTo(x * t + 30, y * t + 6);
      g.lineTo(x * t + 14, y * t + t - 10);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

/* ------------------------- lingotes / oro ------------------------- */

export function goldMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: "#f0c244",
    metalness: 0.95,
    roughness: 0.22,
    emissive: "#7a5210",
    emissiveIntensity: 0.35,
  });
}

export function gemMaterial(color = "#3ce0c8"): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.2,
    roughness: 0.05,
    emissive: color,
    emissiveIntensity: 1.6,
    transparent: true,
    opacity: 0.9,
  });
}

/* ------------------------------ limpieza ------------------------------ */

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      if (!mat) continue;
      const map = mat.map as THREE.Texture | null;
      if (map) map.dispose();
      mat.dispose();
    }
  });
}
