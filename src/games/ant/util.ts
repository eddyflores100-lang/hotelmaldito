/* ============================================================
   HORMIGUERO: GUERRA DEL JARDÍN — utilidades + audio sintetizado
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

function tex(c: HTMLCanvasElement, repeat = 1): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  return t;
}

/** Suelo de tierra moteada. */
export function soilTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = "#6b4a2f";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = ["#5d3f27", "#7a5636", "#84613e", "#513620"][Math.floor(rand(0, 4))];
    ctx.beginPath();
    ctx.arc(rand(0, 256), rand(0, 256), rand(1, 4), 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = "rgba(60,40,22,0.18)";
    ctx.beginPath();
    ctx.arc(rand(0, 256), rand(0, 256), rand(8, 22), 0, TAU);
    ctx.fill();
  }
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = "#8a8f7a";
    ctx.beginPath();
    ctx.arc(rand(0, 256), rand(0, 256), rand(1, 2.4), 0, TAU);
    ctx.fill();
  }
  return tex(c, 7);
}

/** Montículo del hormiguero (granulado más oscuro). */
export function moundTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(256, 256);
  ctx.fillStyle = "#7c5433";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = ["#6a4527", "#8a5f3a", "#96703f", "#5a3a1f"][Math.floor(rand(0, 4))];
    ctx.beginPath();
    ctx.arc(rand(0, 256), rand(0, 256), rand(0.8, 3.4), 0, TAU);
    ctx.fill();
  }
  return tex(c, 3);
}

/** Cielo degradado para el fondo del jardín. */
export function skyTexture(): THREE.Texture {
  const [c, ctx] = makeCanvas(64, 256);
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#4da3e8");
  g.addColorStop(0.55, "#a8d8f0");
  g.addColorStop(0.8, "#d8ecd8");
  g.addColorStop(1, "#b7d489");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Etiqueta flotante (nombre de cámara del hormiguero). */
export function labelSprite(text: string, color = "#a8e63c"): THREE.Sprite {
  const [c, ctx] = makeCanvas(256, 64);
  ctx.font = "bold 34px 'Bungee', 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 7;
  ctx.strokeStyle = "rgba(10,14,8,0.9)";
  ctx.strokeText(text, 128, 34);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  sp.scale.set(4.4, 1.1, 1);
  return sp;
}

/** Punto redondo para partículas. */
export function dotTexture(size = 64): THREE.Texture {
  const [c, ctx] = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ */
/* AUDIO — 100% sintetizado                                            */
/* ------------------------------------------------------------------ */
export class AntAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainSrc: AudioBufferSourceNode | null = null;
  muted = false;

  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  private env(dur: number, peak = 0.25, attack = 0.005): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master!);
    return g;
  }

  private beep(freq: number, dur: number, type: OscillatorType = "sine", peak = 0.22, slideTo?: number) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.ctx.currentTime + dur);
    o.connect(this.env(dur, peak));
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.05);
  }

  private noise(dur: number, freq: number, peak = 0.2, type: BiquadFilterType = "bandpass", q = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f);
    f.connect(this.env(dur, peak, 0.02));
    src.start();
  }

  pickup() {
    this.beep(720, 0.09, "sine", 0.18, 940);
  }
  deposit() {
    this.beep(620, 0.12, "sine", 0.2);
    window.setTimeout(() => this.beep(930, 0.2, "sine", 0.2), 90);
  }
  bite() {
    this.noise(0.09, 1500, 0.24, "bandpass", 0.8);
    this.beep(180, 0.08, "square", 0.12, 90);
  }
  breed() {
    const notes = [523, 659, 784];
    notes.forEach((n, i) => window.setTimeout(() => this.beep(n, 0.14, "triangle", 0.18), i * 80));
  }
  dig() {
    this.noise(0.3, 240, 0.2, "lowpass", 0.5);
  }
  milk() {
    this.beep(880, 0.12, "sine", 0.14, 660);
  }
  alarm() {
    for (let i = 0; i < 2; i++) {
      window.setTimeout(() => this.beep(340, 0.3, "square", 0.16, 460), i * 380);
    }
  }
  buzz() {
    this.beep(190, 0.4, "sawtooth", 0.08, 230);
  }
  thunder() {
    this.noise(1.1, 120, 0.4, "lowpass", 0.4);
  }
  splash() {
    this.noise(0.25, 900, 0.18, "bandpass", 0.7);
  }
  hurt() {
    this.beep(140, 0.14, "sawtooth", 0.2, 80);
  }
  kill() {
    this.beep(300, 0.16, "square", 0.14, 120);
  }
  legend() {
    [523, 659, 784, 1047].forEach((n, i) => window.setTimeout(() => this.beep(n, 0.3, "triangle", 0.22), i * 130));
  }
  bird() {
    const f = rand(1800, 2600);
    this.beep(f, 0.09, "sine", 0.05, f * 1.3);
    window.setTimeout(() => this.beep(f * 0.9, 0.08, "sine", 0.04), 110);
  }

  setRain(on: boolean) {
    if (!this.ctx) return;
    if (on && !this.rainSrc) {
      const ctx = this.ctx;
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.rainSrc = ctx.createBufferSource();
      this.rainSrc.buffer = buf;
      this.rainSrc.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 900;
      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = 0;
      this.rainSrc.connect(f);
      f.connect(this.rainGain);
      this.rainGain.connect(this.master!);
      this.rainSrc.start();
    }
    if (this.rainGain) this.rainGain.gain.setTargetAtTime(on ? 0.12 : 0, this.ctx.currentTime, 0.4);
    if (!on && this.rainSrc) {
      window.setTimeout(() => {
        try {
          this.rainSrc?.stop();
        } catch {
          /* ya parado */
        }
        this.rainSrc = null;
      }, 900);
    }
  }
}
