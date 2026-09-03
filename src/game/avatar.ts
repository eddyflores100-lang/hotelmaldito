/* ============================================================
   HOTEL ∞ INFINITO — Avatar estilo Roblox (R6) con
   animación procedural de caminar / saltar / idle.
   ============================================================ */
import * as THREE from "three";
import { STUD, faceTexture, type FaceVariant, rnd } from "./util";

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
  private torso!: THREE.Mesh;
  private arms: Limb[] = [];
  private legs: Limb[] = [];
  private walkT = 0;
  private bobT = 0;
  private jumpT = 0; // >0 mientras dura el salto
  private speedFactor = 0;
  private mats: THREE.MeshStandardMaterial[] = [];
  readonly height: number;

  constructor(cfg: AvatarConfig) {
    const legLen = 2 * (cfg.tall ?? 1);
    this.height = (legLen + 2 + 1.2) * STUD;

    const mkMat = (color: string) => {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05 });
      this.mats.push(m);
      return m;
    };
    const mkLimb = (
      w: number, h: number, d: number, mat: THREE.Material,
      px: number, py: number, pz: number, // posición del pivote
      oy: number // offset del mesh respecto al pivote (cuelga)
    ): Limb => {
      const pivot = new THREE.Group();
      pivot.position.set(px, py, pz);
      const geo = new THREE.BoxGeometry(w * STUD, h * STUD, d * STUD);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = oy;
      mesh.castShadow = !cfg.noShadow;
      mesh.receiveShadow = true;
      pivot.add(mesh);
      this.group.add(pivot);
      return { pivot, mesh };
    };

    const legMat = mkMat(cfg.legs);
    const armMat = mkMat(cfg.arms);
    const torsoMat = mkMat(cfg.torso);

    // piernas: pivote en la cadera
    const hipY = legLen * STUD;
    this.legs = [
      mkLimb(1, legLen, 1, legMat, -0.5 * STUD, hipY, 0, -legLen * STUD * 0.5),
      mkLimb(1, legLen, 1, legMat, 0.5 * STUD, hipY, 0, -legLen * STUD * 0.5),
    ];

    // torso (2×2×1 studs), centro en hipY + 1 stud
    const torsoY = hipY + 1 * STUD;
    this.torso = new THREE.Mesh(new THREE.BoxGeometry(2 * STUD, 2 * STUD, 1 * STUD), torsoMat);
    this.torso.position.y = torsoY;
    this.torso.castShadow = !cfg.noShadow;
    this.torso.receiveShadow = true;
    this.group.add(this.torso);

    // brazos: pivote en el hombro
    const shoulderY = torsoY + 1 * STUD - 0.1 * STUD;
    this.arms = [
      mkLimb(1, 2, 1, armMat, -1.5 * STUD, shoulderY, 0, -1 * STUD - 0.1 * STUD),
      mkLimb(1, 2, 1, armMat, 1.5 * STUD, shoulderY, 0, -1 * STUD - 0.1 * STUD),
    ];

    // cabeza con cara (6 materiales, cara al frente −z; el avatar mira a +z → rotate)
    const skinMat = mkMat(cfg.skin);
    const faceMat = new THREE.MeshStandardMaterial({
      map: faceTexture(cfg.face, cfg.skin),
      roughness: 0.8,
      emissive: cfg.glow ? new THREE.Color("#ff2418") : new THREE.Color("#000000"),
      emissiveIntensity: cfg.glow ? 0.55 : 0,
    });
    this.mats.push(faceMat);
    const headGeo = new THREE.BoxGeometry(1.2 * STUD, 1.2 * STUD, 1.2 * STUD);
    // orden materiales: +x, −x, +y, −y, +z, −z → cara en +z (frente del avatar)
    const headMats = [skinMat, skinMat, skinMat, skinMat, faceMat, skinMat];
    this.head = new THREE.Mesh(headGeo, headMats);
    this.head.position.y = torsoY + 1 * STUD + 0.6 * STUD;
    this.head.castShadow = !cfg.noShadow;
    this.group.add(this.head);

    this.buildHat(cfg, torsoY + 1 * STUD + 1.2 * STUD);
  }

  private buildHat(cfg: AvatarConfig, topY: number): void {
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
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.3 * s, 1.3 * s, 0.14 * s, 20), mat);
        brim.position.y = topY + 0.07 * s;
        add(brim);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.85 * s, 0.85 * s, 1.1 * s, 20), mat);
        tube.position.y = topY + 0.7 * s;
        add(tube);
        break;
      }
      case "cap": {
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.78 * s, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
        dome.position.y = topY;
        add(dome);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(1.3 * s, 0.1 * s, 0.9 * s), mat);
        brim.position.set(0, topY + 0.02 * s, 0.75 * s);
        add(brim);
        break;
      }
      case "party": {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62 * s, 1.3 * s, 16), mat);
        cone.position.y = topY + 0.6 * s;
        add(cone);
        break;
      }
      case "crown": {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * s, 0.8 * s, 0.4 * s, 16), mat);
        band.position.y = topY + 0.2 * s;
        add(band);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, 0.45 * s, 8), mat);
          spike.position.set(Math.cos(a) * 0.62 * s, topY + 0.55 * s, Math.sin(a) * 0.62 * s);
          add(spike);
        }
        break;
      }
      case "bellhop": {
        // gorra de botones: banda + visera + hebilla dorada
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.82 * s, 0.86 * s, 0.42 * s, 18), mat);
        band.position.y = topY + 0.18 * s;
        add(band);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.86 * s, 0.86 * s, 0.1 * s, 18), mat);
        top.position.y = topY + 0.44 * s;
        add(top);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(1.5 * s, 0.08 * s, 0.85 * s), mat);
        brim.position.set(0, topY - 0.02 * s, 0.85 * s);
        add(brim);
        const gold = new THREE.MeshStandardMaterial({ color: "#e9b23c", roughness: 0.3, metalness: 0.8 });
        this.mats.push(gold);
        const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.22 * s, 0.05 * s), gold);
        buckle.position.set(0, topY + 0.2 * s, 0.87 * s);
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

    this.torso.position.y += 0; // noop para claridad
    const base = (this.legs[0].pivot.position.y);
    this.torso.position.y = base + 1 * STUD + idleBob;
    this.head.position.y = base + 1 * STUD + 1.6 * STUD + idleBob;
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
