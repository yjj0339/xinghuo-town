// ============================================================
// 程序化背景音乐：白天欢快 / 夜晚宁静 / Boss紧张（WebAudio 音序器）
// ============================================================

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Hz

// 和弦进行（MIDI 音，根音区）
const PROGRESSIONS = {
  day: { chords: [[60, 64, 67], [67, 71, 74], [69, 72, 76], [65, 69, 72]], beat: .42, wave: 'triangle', vol: .05 },
  night: { chords: [[57, 60, 64], [53, 57, 60], [60, 63, 67], [55, 59, 62]], beat: .62, wave: 'sine', vol: .045 },
  boss: { chords: [[50, 53, 57], [50, 56, 59], [49, 52, 56], [51, 55, 58]], beat: .3, wave: 'square', vol: .035 },
};
// 旋律音阶（C大调五声 / A小调五声）
const MELODY = {
  day: [72, 74, 76, 79, 81, 79, 76, 74],
  night: [69, 72, 74, 76, 74, 72, 69, 67],
  boss: [62, 65, 62, 68, 67, 65, 62, 60],
};

class BGM {
  constructor() {
    this.ctx = null; this.master = null;
    this.mode = null; this.timer = null; this.step = 0; this.on = true;
  }
  ensure() {
    if (this.ctx) return this.ctx;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = .9;
      this.master.connect(this.ctx.destination);
    } catch (e) { }
    return this.ctx;
  }
  tone(freq, dur, wave, vol, when = 0) {
    const c = this.ensure(); if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator(), g = c.createGain();
    o.type = wave; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + .02);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + .05);
  }
  drum(when = 0) {
    const c = this.ensure(); if (!c) return;
    const t = c.currentTime + when;
    const n = c.sampleRate * .12, buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 200;
    const g = c.createGain(); g.gain.value = .12;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }
  play(mode) {
    if (!this.on) return;
    if (this.mode === mode && this.timer) return;
    this.stop();
    this.mode = mode;
    const cfg = PROGRESSIONS[mode]; if (!cfg) return;
    this.ensure(); if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.step = 0;
    const tickFn = () => {
      if (!this.on) { this.stop(); return; }
      const s = this.step;
      const chord = cfg.chords[Math.floor(s / 8) % cfg.chords.length];
      const beatPos = s % 8;
      // 和弦低音（每小节头）
      if (beatPos === 0) this.tone(NOTE(chord[0] - 12), cfg.beat * 7, cfg.wave === 'square' ? 'sawtooth' : 'triangle', cfg.vol * .9);
      // 琶音伴奏
      if (beatPos % 2 === 0) {
        const n = chord[(beatPos / 2) % 3];
        this.tone(NOTE(n), cfg.beat * 1.8, cfg.wave, cfg.vol * .55);
      }
      // 旋律（隔拍）
      if (beatPos % 4 === 2 || (mode === 'boss' && beatPos % 2 === 1)) {
        const mel = MELODY[mode][(s / 2 | 0) % MELODY[mode].length];
        this.tone(NOTE(mel + 12), cfg.beat * 1.2, 'sine', cfg.vol * 1.1);
      }
      // Boss鼓点
      if (mode === 'boss' && beatPos % 4 === 0) this.drum();
      this.step++;
    };
    tickFn();
    this.timer = setInterval(tickFn, cfg.beat * 1000);
  }
  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.mode = null;
  }
  toggle() {
    this.on = !this.on;
    if (!this.on) this.stop();
    return this.on;
  }
}

export const bgm = new BGM();
