/* ============================================================
   HOTEL ∞ INFINITO — Audio sintetizado (WebAudio, sin assets)
   ============================================================ */

export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];
  muted = false;

  /** debe llamarse desde un gesto del usuario */
  init(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  private tone(
    freq: number, dur: number, type: OscillatorType, vol: number,
    slideTo?: number, delay = 0
  ): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol: number, freq = 800, delay = 0): void {
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  /* --------------------------- efectos --------------------------- */

  ding(): void {
    this.tone(880, 0.5, "sine", 0.16);
    this.tone(1320, 0.4, "sine", 0.08, undefined, 0.03);
  }
  chimeArrival(): void {
    this.tone(660, 0.28, "triangle", 0.1);
    this.tone(990, 0.32, "triangle", 0.09, undefined, 0.09);
  }
  stampOk(): void {
    this.noise(0.09, 0.35, 1400);
    this.tone(220, 0.12, "square", 0.1, 160);
    this.tone(587, 0.18, "sine", 0.09, undefined, 0.08);
  }
  alarm(): void {
    this.tone(440, 0.16, "sawtooth", 0.12, 300);
    this.tone(440, 0.16, "sawtooth", 0.12, 300, 0.2);
    this.noise(0.3, 0.12, 500);
  }
  jump(): void {
    this.tone(300, 0.16, "sine", 0.07, 520);
  }
  heartbeat(): void {
    this.tone(55, 0.14, "sine", 0.3, 40);
    this.tone(50, 0.12, "sine", 0.24, 36, 0.18);
  }
  lose(): void {
    this.tone(220, 0.6, "sawtooth", 0.14, 90);
    this.tone(110, 0.8, "square", 0.1, 55, 0.1);
  }
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.35, "triangle", 0.12, undefined, i * 0.13));
  }
  elevator(): void {
    this.tone(196, 1.1, "sine", 0.06, 210);
    this.noise(1.0, 0.05, 300);
  }

  /* ------------------- combate / acción ------------------- */

  swing(): void {
    this.noise(0.12, 0.14, 2600);
    this.tone(320, 0.08, "sine", 0.05, 480);
  }
  hitEnemy(): void {
    this.noise(0.08, 0.3, 900);
    this.tone(160, 0.1, "square", 0.12, 90);
  }
  enemyDie(): void {
    this.tone(420, 0.3, "sawtooth", 0.1, 80);
    this.noise(0.25, 0.18, 600);
  }
  coin(): void {
    this.tone(1240, 0.09, "square", 0.07);
    this.tone(1860, 0.14, "square", 0.06, undefined, 0.06);
  }
  key(): void {
    [880, 1174, 1568].forEach((f, i) => this.tone(f, 0.16, "triangle", 0.1, undefined, i * 0.08));
  }
  build(): void {
    this.noise(0.12, 0.3, 700);
    this.tone(140, 0.14, "square", 0.12, 100);
  }
  buildError(): void {
    this.tone(180, 0.14, "square", 0.08, 120);
  }
  turret(): void {
    this.tone(980, 0.07, "square", 0.05, 1400);
  }
  hurt(): void {
    this.tone(220, 0.18, "sawtooth", 0.16, 110);
    this.noise(0.14, 0.16, 500);
  }
  dash(): void {
    this.noise(0.14, 0.1, 3400);
  }
  wave(): void {
    this.tone(98, 0.9, "sawtooth", 0.14, 82);
    this.tone(196, 0.7, "square", 0.05, 165, 0.1);
    this.noise(0.8, 0.08, 300);
  }
  door(): void {
    this.noise(0.3, 0.1, 420);
    this.tone(90, 0.24, "sine", 0.08, 70);
  }
  locked(): void {
    this.tone(240, 0.1, "square", 0.09, 200);
    this.tone(200, 0.12, "square", 0.08, 160, 0.11);
  }
  upgrade(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, "triangle", 0.11, undefined, i * 0.09));
  }
  heal(): void {
    this.tone(520, 0.2, "sine", 0.09, 780);
    this.tone(780, 0.25, "sine", 0.07, 1040, 0.1);
  }
  roar(): void {
    this.tone(65, 1.2, "sawtooth", 0.2, 48);
    this.noise(1.1, 0.16, 260);
  }
  shatter(): void {
    this.noise(0.16, 0.28, 3200);
    this.tone(720, 0.14, "triangle", 0.08, 240);
  }
  teleport(): void {
    this.tone(900, 0.22, "sine", 0.09, 180);
    this.tone(180, 0.18, "sine", 0.06, 720, 0.16);
  }
  trapSnap(): void {
    this.noise(0.06, 0.32, 1800);
    this.tone(140, 0.09, "square", 0.12, 70);
  }
  throwSfx(): void {
    this.noise(0.1, 0.1, 2200);
    this.tone(520, 0.12, "sine", 0.05, 260);
  }

  /* --------------------------- ambiente --------------------------- */

  startAmbient(): void {
    if (!this.ctx || !this.master || this.ambientNodes.length) return;
    const t0 = this.ctx.currentTime;
    // zumbido grave del hotel
    const hum = this.ctx.createOscillator();
    const humGain = this.ctx.createGain();
    hum.type = "sine";
    hum.frequency.value = 54;
    humGain.gain.setValueAtTime(0, t0);
    humGain.gain.linearRampToValueAtTime(0.035, t0 + 2);
    hum.connect(humGain).connect(this.master);
    hum.start();
    // aire / ruido muy leve
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const air = this.ctx.createBufferSource();
    air.buffer = buf;
    air.loop = true;
    const airFilter = this.ctx.createBiquadFilter();
    airFilter.type = "lowpass";
    airFilter.frequency.value = 240;
    const airGain = this.ctx.createGain();
    airGain.gain.value = 0.028;
    air.connect(airFilter).connect(airGain).connect(this.master);
    air.start();
    this.ambientNodes = [hum, air];
  }

  stopAmbient(): void {
    for (const n of this.ambientNodes) {
      const src = n as OscillatorNode & AudioBufferSourceNode;
      try { src.stop(); } catch { /* noop */ }
      n.disconnect();
    }
    this.ambientNodes = [];
  }

  dispose(): void {
    this.stopAmbient();
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
    this.master = null;
  }
}
