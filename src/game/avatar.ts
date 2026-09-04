/* ============================================================
   HOTEL ∞ INFINITO — Avatar estilizado (anti-bloques):
   extremidades de CÁPSULA, torso BISELADO y cabeza ESFÉRICA
   con cara tipo decal. Animación procedural caminar/saltar/idle.
   ============================================================ */
import * as THREE from "three";
import { STUD, faceDecalTexture, type FaceVariant, rnd } from "./util";
import { rbox } from "./shapes";

export type HatType = "none" | "top" | "cap" | "party" | "crown" | "bellhop";

export type AvatarConfig = {
  skin: string;
  torso: string;
  arms: string;
  legs: string;
  face: FaceVariant;
  hat: HatType;
  hatColor?: string;
  /** escala vertical extra de piernas (anomalía "altísimo") */
  tall?: number;
  /** flota en el aire (anomalía) */
  float?: boolean;
  /** sin sombra (anomalía) */
  noShadow?: boolean;
  /** brillo rojo en ojos */
  glow?: boolean;
};

type Limb = { pivot: THREE.Group; mesh: THREE.Mesh };

export class Avatar {
  readonly group = new THREE.Group();
  private head!: THREE.Mesh;
  private decal!: THREE.Mesh;
  private torso!: THREE.Mesh;
  private arms: Limb[] = [];
  private legs: Limb[] = [];
  private walkT = 0;
  private bobT = 0;
  private jumpT = 0; // >0 mientras dura el salto
  private speedFactor = 0;
  private mats: THREE.Material[] = [];
  readonly height: number;

  constructor(cfg: AvatarConfig) {
    const legLen = 2 * (cfg.tall ?? 1);
    this.height = (legLen + 2 + 1.2) * STUD;

    const mkMat = (color: string, rough = 0.72) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.04 });
      this.mats.push(m);
      return m;
    };
    const shadow = (mesh: THREE.Mesh) => {
      mesh.castShadow = !cfg.noShadow;
      mesh.receiveShadow = true;
    };

    /** extremidad cápsula: pivote en la articulación superior, cuelga hacia abajo */
    const mkLimb = (
      radius: number, length: number, mat: THREE.Material,
      px: number, py: number, pz: number
    ): Limb => {
      const pivot = new THREE.Group();
      pivot.position.set(px, py, pz);
      const total = length + radius * 2;
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 12), mat);
      mesh.position.y = -total / 2 + radius * 0.55; // hunde el hombro dentro del torso
      shadow(mesh);
      pivot.add(mesh);
      this.group.add(pivot);
      return { pivot, mesh };
    };

    const legMat = mkMat(cfg.legs, 0.85);
    const armMat = mkMat(cfg.arms);
    const torsoMat = mkMat(cfg.torso);

    const s = STUD;
    const limbR = 0.42 * s;

    // piernas: pivote en la cadera
    const hipY = legLen * s;
    const legCapsule = legLen * s - 0.24 * s; // sección recta
    this.legs = [
      mkLimb(limbR, legCapsule, legMat, -0.5 * s, hipY, 0),
      mkLimb(limbR, legCapsule, legMat, 0.5 * s, hipY, 0),
    ];

    // torso biselado (2×2×1 studs), centro en hipY + 1 stud
    const torsoY = hipY + 1 * s;
    this.torso = new THREE.Mesh(rbox(2 * s, 2 * s, 1.02 * s, 0.3 * s, 3), torsoMat);
    this.torso.position.y = torsoY;
    shadow(this.torso);
    this.group.add(this.torso);

    // brazos: pivote en el hombro
    const shoulderY = torsoY + 0.82 * s;
    this.arms = [
      mkLimb(limbR * 0.92, 2 * s - 0.34 * s, armMat, -1.18 * s, shoulderY, 0),
      mkLimb(limbR * 0.92, 2 * s - 0.34 * s, armMat, 1.18 * s, shoulderY, 0),
    ];

    // cabeza esférica + cara decal
    const skinMat = mkMat(cfg.skin, 0.62);
    const headR = 0.72 * s;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(headR, 22, 18), skinMat);
    this.head.position.y = torsoY + 1 * s + headR * 0.82;
    shadow(this.head);
    this.group.add(this.head);

    const decalMat = new THREE.MeshBasicMaterial({
      map: faceDecalTexture(cfg.face),
      transparent: true,
    });
    this.mats.push(decalMat);
    this.decal = new THREE.Mesh(new THREE.PlaneGeometry(headR * 1.35, headR * 1.35), decalMat);
    this.decal.position.set(0, this.head.position.y + headR * 0.06, headR * 1.005);
    this.group.add(this.decal);

    this.buildHat(cfg, this.head.position.y + headR * 0.94, headR);
  }

  private buildHat(cfg: AvatarConfig, topY: number, headR: number): void {
    const color = cfg.hatColor ?? "#20242c";
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.35 });
    this.mats.push(mat);
    const add = (mesh: THREE.Mesh) => {
      mesh.castShadow = !cfg.noShadow;
      this.group.add(mesh);
    };
    const s = STUD;
    switch (cfg.hat) {
      case "top": {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.92, headR * 0.98, 0.12 * s, 20), mat);
        brim.position.y = topY;
        add(brim);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.62, headR * 0.66, 1.0 * s, 20), mat);
        tube.position.y = topY + 0.55 * s;
        add(tube);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.67, headR * 0.67, 0.14 * s, 20),
          new THREE.MeshStandardMaterial({ color: "#8a2a2a", roughness: 0.5 }));
        band.position.y = topY + 0.22 * s;
        this.mats.push(band.material as THREE.Material);
        add(band);
        break;
      }
      case "cap": {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.92, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        dome.position.y = topY - headR * 0.1;
        add(dome);
        const brim = new THREE.Mesh(rbox(1.35 * s, 0.09 * s, 0.95 * s, 0.04 * s), mat);
        brim.position.set(0, topY - headR * 0.08, headR * 0.85);
        add(brim);
        break;
      }
      case "party": {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.58 * s, 1.25 * s, 16), mat);
        cone.position.y = topY + 0.55 * s;
        add(cone);
        const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 10, 8),
          new THREE.MeshStandardMaterial({ color: "#ff7ab8", roughness: 0.6 }));
        pompom.position.y = topY + 1.2 * s;
        this.mats.push(pompom.material as THREE.Material);
        add(pompom);
        break;
      }
      case "crown": {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.72, headR * 0.78, 0.36 * s, 16), mat);
        band.position.y = topY + 0.14 * s;
        add(band);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15 * s, 0.42 * s, 8), mat);
          spike.position.set(Math.cos(a) * headR * 0.66, topY + 0.5 * s, Math.sin(a) * headR * 0.66);
          add(spike);
        }
        const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.11 * s),
          new THREE.MeshStandardMaterial({ color: "#ff4a6e", emissive: "#ff2450", emissiveIntensity: 1.2, roughness: 0.2 }));
        jewel.position.set(0, topY + 0.16 * s, headR * 0.78);
        this.mats.push(jewel.material as THREE.Material);
        add(jewel);
        break;
      }
      case "bellhop": {
        // gorra de botones: cúpula + banda + visera + hebilla dorada
        const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.95, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), mat);
        dome.position.y = topY - headR * 0.42;
        dome.scale.y = 0.9;
        add(dome);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.98, headR * 1.0, 0.3 * s, 20), mat);
        band.position.y = topY - headR * 0.36;
        add(band);
        const brim = new THREE.Mesh(rbox(1.55 * s, 0.08 * s, 0.95 * s, 0.04 * s), mat);
        brim.position.set(0, topY - headR * 0.42, headR * 0.78);
        add(brim);
        const gold = new THREE.MeshStandardMaterial({ color: "#e9b23c", roughness: 0.3, metalness: 0.8 });
        this.mats.push(gold);
        const buckle = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 0.05 * s, 12), gold);
        buckle.rotation.x = Math.PI / 2;
        buckle.position.set(0, topY - headR * 0.3, headR * 0.99);
        add(buckle);
        break;
      }
      default:
        break;
    }
  }

  /** t: fase de andar; speed: 0..1 */
  update(dt: number, moving: boolean, speed01: number, jumping: boolean): void {
    this.speedFactor = moving ? speed01 : 0;
    if (jumping) this.jumpT = Math.min(this.jumpT + dt * 6, 1);
    else this.jumpT = Math.max(this.jumpT - dt * 6, 0);

    this.bobT += dt * (this.speedFactor > 0 ? 2.2 : 1.1);
    const idleBob = Math.sin(this.bobT * 2) * 0.008;

    if (this.speedFactor > 0.02) {
      this.walkT += dt * (4.4 + 4.6 * this.speedFactor);
      const swing = Math.sin(this.walkT) * (0.55 + 0.35 * this.speedFactor);
      this.legs[0].pivot.rotation.x = swing;
      this.legs[1].pivot.rotation.x = -swing;
      this.arms[0].pivot.rotation.x = -swing * 0.85;
      this.arms[1].pivot.rotation.x = swing * 0.85;
      this.arms[0].pivot.rotation.z = 0.06;
      this.arms[1].pivot.rotation.z = -0.06;
    } else {
      // volver a pose neutra
      const k = 8;
      for (const l of this.legs) l.pivot.rotation.x += (0 - l.pivot.rotation.x) * Math.min(1, k * dt);
      for (const a of this.arms) {
        a.pivot.rotation.x += (0 - a.pivot.rotation.x) * Math.min(1, k * dt);
        a.pivot.rotation.z += ((a === this.arms[0] ? 0.06 : -0.06) - a.pivot.rotation.z) * Math.min(1, k * dt);
      }
    }

    // salto: piernas recogidas, brazos arriba
    const j = this.jumpT;
    if (j > 0) {
      this.legs[0].pivot.rotation.x = -0.7 * j + this.legs[0].pivot.rotation.x * (1 - j);
      this.legs[1].pivot.rotation.x = 0.35 * j + this.legs[1].pivot.rotation.x * (1 - j);
      this.arms[0].pivot.rotation.x = -2.4 * j + this.arms[0].pivot.rotation.x * (1 - j);
      this.arms[1].pivot.rotation.x = -2.4 * j + this.arms[1].pivot.rotation.x * (1 - j);
    }

    const base = this.legs[0].pivot.position.y;
    this.torso.position.y = base + 1 * STUD + idleBob;
    const headY = base + 1 * STUD + 1.6 * STUD + idleBob;
    const headDelta = headY - this.head.position.y;
    this.head.position.y += headDelta;
    this.decal.position.y += headDelta;
    this.head.rotation.z = Math.sin(this.bobT * 1.3) * 0.02;
  }

  /** parpadeo/glitch de anomalía */
  glitch(dt: number): void {
    this.group.rotation.y += rnd(-0.2, 0.2) * dt * 60;
    this.group.position.y += Math.sin(performance.now() * 0.05) * 0.004;
  }

  dispose(): void {
    for (const m of this.mats) m.dispose();
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
  }
}
