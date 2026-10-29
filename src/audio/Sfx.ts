// Простые процедурные звуки на WebAudio: гудок (пока держат), щелчки реле поворотника, удар.
// Контекст создаётся при первом касании/клавише: браузер разрешает звук только после жеста.

type AudioCtor = typeof AudioContext;

/** Частоты двухтонового гудка, Гц. */
const HORN_TONES = [392, 494];
const HORN_LEVEL = 0.22;
const CLICK_SECONDS = 0.025;
const CRASH_SECONDS = 0.6;

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hornGain: GainNode | null = null;
  private click: AudioBuffer | null = null;
  private crashBuf: AudioBuffer | null = null;
  private volume = 0.5;
  private hornOn = false;

  /** Вызывать из обработчика жеста пользователя. Ошибки WebAudio не мешают игре. */
  unlock(): void {
    try {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private init(): void {
    const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.volume;
    master.connect(ctx.destination);
    // Гудок: два «пилообразных» тона через фильтр, звучат всегда, громкость 0 — пока не нажат
    const horn = ctx.createGain();
    horn.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    filter.connect(horn);
    horn.connect(master);
    for (const f of HORN_TONES) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      osc.connect(filter);
      osc.start();
    }
    // Щелчок реле: короткий затухающий шум
    const n = Math.round(ctx.sampleRate * CLICK_SECONDS);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.exp((-6 * i) / n);
    // Удар: низкий «бум» и шум с затуханием
    const cn = Math.round(ctx.sampleRate * CRASH_SECONDS);
    const crash = ctx.createBuffer(1, cn, ctx.sampleRate);
    const cd = crash.getChannelData(0);
    for (let i = 0; i < cn; i++) {
      const t = i / ctx.sampleRate;
      cd[i] = ((Math.random() * 2 - 1) * 0.7 + Math.sin(2 * Math.PI * 55 * t) * 0.8) * Math.exp(-7 * t);
    }
    this.crashBuf = crash;
    this.ctx = ctx;
    this.master = master;
    this.hornGain = horn;
    this.click = buf;
  }

  setVolume(v: number): void {
    if (v === this.volume) return;
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  horn(on: boolean): void {
    if (on === this.hornOn) return;
    this.hornOn = on;
    if (!this.ctx || !this.hornGain) return;
    this.hornGain.gain.setTargetAtTime(on ? HORN_LEVEL : 0, this.ctx.currentTime, 0.015);
  }

  /** Щелчок поворотника: «тик» при загорании, «так» (ниже) при погасании. */
  tick(on: boolean): void {
    if (!this.ctx || !this.master || !this.click || this.ctx.state !== 'running') return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.click;
    src.playbackRate.value = on ? 1 : 0.7;
    src.connect(this.master);
    src.start();
  }

  /** Удар; strength 0..1 — громкость и «тяжесть» звука. */
  crash(strength: number): void {
    if (!this.ctx || !this.master || !this.crashBuf || this.ctx.state !== 'running') return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.crashBuf;
    src.playbackRate.value = 1.2 - strength * 0.5;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.3 + strength * 0.9;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600 + strength * 2400;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  destroy(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }
}
