/* ============================================================
   CHATARRA CÓSMICA — utilidades: texturas procedurales + audio
   GameLab by AliceLabs
   ============================================================ */
import * as THREE from "three";

export const TAU = Math.PI * 2;
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

/** Sprite radial suave (sol, nebulosas, glow, chispas). */
export function radialSprite(stops: [number, string][], size = 128): THREE.Texture {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Puntito redondo para estrellas / partículas. */
export function dotTexture(size = 64): THREE.Texture {
  return radialSprite(
    [
      [0, "rgba(255,255,255,1)"],
      [0.4, "rgba(255,255,255,0.9)"],
      [1, "rgba(255,255,255,0)"],
    ],
    size
  );
}

/** Cara simple estilo Roblox para el visor del casco. */
export function visorTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = "#0e2a3a";
  ctx.fillRect(0, 34, 128, 62);
  const g = ctx.createLinearGradient(0, 34, 0, 96);
  g.addColorStop(0, "rgba(120,235,255,0.45)");
  g.addColorStop(1, "rgba(10,40,60,0.05)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 34, 128, 62);
  // brillo diagonal
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(24, 88);
  ctx.lineTo(62, 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(48, 90);
  ctx.lineTo(88, 40);
  ctx.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Textura de paneles metálicos para la estación. */
export function hullTexture(base = "#dfe7ef", seam = "#9fb0c0"): THREE.Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = seam;
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 64, 0);
    ctx.lineTo(i * 64, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i * 64);
    ctx.lineTo(256, i * 64);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let i = 0; i < 40; i++) ctx.fillRect(rand(0, 250), rand(0, 250), rand(2, 8), rand(2, 4));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ------------------------------------------------------------------ */
/* AUDIO — 100% sintetizado con WebAudio                               */
/* ------------------------------------------------------------------ */
export class SpaceAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private thrustSrc: AudioBufferSourceNode | null = null;
  private thrustGain: GainNode | null = null;
  private ambGain: GainNode | null = null;
  muted = false;

  /** Debe llamarse tras un gesto del usuario. */
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  private env(dur: number, peak = 0.3, attack = 0.005): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master!);
    return g;
  }

  private beep(freq: number, dur: number, type: OscillatorType = "sine", peak = 0.25, slideTo?: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    o.connect(this.env(dur, peak));
    o.start();
    o.stop(ctx.currentTime + dur + 0.05);
  }

  private noiseBurst(dur: number, freq: number, peak = 0.3, q = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f);
    f.connect(this.env(dur, peak, 0.01));
    src.start();
  }

  /** Propulsor continuo: level 0..1. */
  setThrust(level: number) {
    if (!this.ctx) return;
    if (!this.thrustSrc) {
      const ctx = this.ctx;
      const len = ctx.sampleRate * 1.5;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.thrustSrc = ctx.createBufferSource();
      this.thrustSrc.buffer = buf;
      this.thrustSrc.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 420;
      this.thrustGain = ctx.createGain();
      this.thrustGain.gain.value = 0;
      this.thrustSrc.connect(f);
      f.connect(this.thrustGain);
      this.thrustGain.connect(this.master!);
      this.thrustSrc.start();
    }
    this.thrustGain!.gain.setTargetAtTime(level * 0.35, this.ctx.currentTime, 0.08);
  }

  hook() {
    this.beep(880, 0.18, "square", 0.16, 220);
    this.noiseBurst(0.12, 1800, 0.1);
  }
  release() {
    this.beep(300, 0.12, "square", 0.1, 160);
  }
  deliver() {
    this.beep(660, 0.12, "sine", 0.22);
    window.setTimeout(() => this.beep(990, 0.22, "sine", 0.22), 90);
  }
  build() {
    const notes = [392, 494, 587, 784];
    notes.forEach((n, i) => window.setTimeout(() => this.beep(n, 0.16, "triangle", 0.2), i * 90));
  }
  alarm() {
    for (let i = 0; i < 3; i++) {
      window.setTimeout(() => {
        this.beep(520, 0.28, "square", 0.14, 700);
        window.setTimeout(() => this.beep(700, 0.28, "square", 0.14, 520), 280);
      }, i * 600);
    }
  }
  zap() {
    this.noiseBurst(0.18, 2400, 0.28, 0.6);
    this.beep(120, 0.2, "sawtooth", 0.16, 60);
  }
  rescue() {
    this.beep(500, 0.4, "sine", 0.2, 140);
    this.noiseBurst(0.5, 700, 0.14, 0.5);
  }
  droneBlip() {
    this.beep(1200, 0.08, "sine", 0.08);
  }
  legend() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((n, i) => window.setTimeout(() => this.beep(n, 0.3, "triangle", 0.22), i * 120));
  }
  damage() {
    this.beep(160, 0.15, "sawtooth", 0.2, 90);
  }

  private startAmbient() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 48;
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 72.5;
    this.ambGain = ctx.createGain();
    this.ambGain.gain.value = 0.045;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 0.02;
    lfo.connect(lfoG);
    lfoG.connect(this.ambGain.gain);
    o.connect(this.ambGain);
    o2.connect(this.ambGain);
    this.ambGain.connect(this.master!);
    o.start();
    o2.start();
    lfo.start();
  }
}
