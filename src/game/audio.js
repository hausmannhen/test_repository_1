/* Ton: alles synthetisch über WebAudio, keine Dateien. Hintergrundmusik als langsame Akkordfläche, Effekte kurz. */
export const SETTINGS_KEY = "eldenfeld_settings";
const DEFAULTS = { music: 0.6, sfx: 0.3, muted: false };

export function loadSettings() {
  try { const raw = localStorage.getItem(SETTINGS_KEY); return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }; } catch (e) { return { ...DEFAULTS }; }
}
export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* egal */ }
}

/* Tonleitern je Region (Grundton in Hz, Akkordfolge als Halbtonschritte) */
const MOODS = {
  wiese:  { root: 220, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], wave: "triangle", tempo: 6 },
  wald:   { root: 196, chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [0, 3, 7]], wave: "sine", tempo: 7 },
  berg:   { root: 165, chords: [[0, 7, 12], [5, 12, 17], [3, 10, 15], [0, 7, 12]], wave: "triangle", tempo: 8 },
  wueste: { root: 233, chords: [[0, 4, 7], [1, 5, 8], [0, 4, 7], [8, 12, 15]], wave: "sawtooth", tempo: 6 },
  sumpf:  { root: 175, chords: [[0, 3, 6], [1, 4, 7], [0, 3, 6], [10, 13, 16]], wave: "sine", tempo: 9 },
  eis:    { root: 262, chords: [[0, 7, 14], [2, 9, 16], [0, 7, 14], [9, 16, 23]], wave: "sine", tempo: 8 },
  vulkan: { root: 147, chords: [[0, 6, 12], [1, 7, 13], [0, 6, 12], [4, 10, 16]], wave: "sawtooth", tempo: 5 },
  dungeon:{ root: 131, chords: [[0, 3, 7], [0, 1, 7], [0, 3, 7], [11, 14, 18]], wave: "sine", tempo: 10 },
};

export class GameAudio {
  constructor() {
    this.ctx = null; this.settings = loadSettings();
    this.mood = null; this.chordI = 0; this.nextChordAt = 0; this.voices = []; this.nextPluckAt = 0; this.pluckI = 0; this.chord = null;
    this.lastSfx = {};
  }
  /* Muss aus einer Nutzeraktion heraus aufgerufen werden (Tipp, Taste) */
  unlock() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
    this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
    this.filter = this.ctx.createBiquadFilter(); this.filter.type = "lowpass"; this.filter.frequency.value = 2400; this.filter.connect(this.musicGain);
    this.applySettings();
  }
  applySettings(s = this.settings) {
    this.settings = s; saveSettings(s);
    if (!this.ctx) return;
    this.master.gain.value = s.muted ? 0 : 1;
    this.musicGain.gain.value = s.music * 0.55;
    this.sfxGain.gain.value = s.sfx * 0.9;
  }
  setMood(name) {
    if (this.mood === name) return;
    this.mood = name; this.chordI = 0; this.nextChordAt = 0;
  }
  /* pro Frame: Akkorde weiterschalten */
  update(time) {
    if (!this.ctx || !this.mood || this.settings.muted) return;
    if (this.ctx.state === "suspended") { this.ctx.resume(); return; }
    const m = MOODS[this.mood] || MOODS.wiese;
    const now = this.ctx.currentTime;
    if (time >= this.nextChordAt) {
      this.nextChordAt = time + m.tempo;
      const chord = m.chords[this.chordI % m.chords.length]; this.chordI++; this.chord = chord;
      for (const v of this.voices) { v.g.gain.setTargetAtTime(0, now, 1.2); v.o.stop(now + 4); }
      this.voices = [];
      // Fläche: Grundlage eine Oktave höher als früher, Handylautsprecher geben unter 200 Hz kaum etwas wieder
      chord.forEach((semi, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = m.wave; o.frequency.value = m.root * Math.pow(2, semi / 12);
        o.detune.value = (i - 1) * 6;
        g.gain.value = 0; g.gain.setTargetAtTime(0.4 / chord.length, now, 1.5);
        o.connect(g); g.connect(this.filter); o.start(now);
        this.voices.push({ o, g });
      });
    }
    // Zupfstimme: alle halben Takte ein Akkordton eine Oktave höher, kurz und leise
    if (this.chord && time >= this.nextPluckAt) {
      this.nextPluckAt = time + m.tempo / 8;
      const semi = this.chord[this.pluckI % this.chord.length]; this.pluckI++;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = "sine"; o.frequency.value = m.root * 2 * Math.pow(2, semi / 12);
      g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.22, now + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      o.connect(g); g.connect(this.musicGain); o.start(now); o.stop(now + 1);
    }
  }
  /* kurzer Effekt */
  sfx(type, data = {}) {
    if (!this.ctx || this.settings.muted) return;
    const now = this.ctx.currentTime;
    if (this.lastSfx[type] && now - this.lastSfx[type] < 0.04) return;
    this.lastSfx[type] = now;
    const tone = (freq, dur, wave = "square", vol = 0.25, slide = 0) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = wave; o.frequency.setValueAtTime(freq, now);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), now + dur);
      g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      o.connect(g); g.connect(this.sfxGain); o.start(now); o.stop(now + dur + 0.02);
    };
    const noise = (dur, vol = 0.2, freq = 1200) => {
      const buf = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 0.8;
      const g = this.ctx.createGain(); g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.sfxGain); src.start(now);
    };
    switch (type) {
      case "swing": noise(0.12, 0.18, 2400); break;
      case "shoot": noise(0.08, 0.15, 3000); tone(900, 0.08, "triangle", 0.1, 0.5); break;
      case "hit": tone(data.crit ? 420 : 300, 0.1, "square", data.crit ? 0.3 : 0.2, 0.5); noise(0.06, 0.12, 800); break;
      case "kill": tone(220, 0.25, "sawtooth", 0.2, 0.3); noise(0.2, 0.15, 500); break;
      case "hurt": tone(140, 0.2, "square", 0.3, 0.6); noise(0.1, 0.2, 300); break;
      case "gold": tone(1320, 0.06, "sine", 0.15); setTimeout(() => this.ctx && tone(1760, 0.08, "sine", 0.15), 40); break;
      case "pickup": tone(660, 0.08, "triangle", 0.2); setTimeout(() => this.ctx && tone(990, 0.12, "triangle", 0.2), 70); break;
      case "potion": tone(500, 0.1, "sine", 0.2, 1.6); setTimeout(() => this.ctx && tone(800, 0.15, "sine", 0.15), 90); break;
      case "levelup": [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.ctx && tone(f, 0.25, "triangle", 0.25), i * 90)); break;
      case "fanfare": [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.ctx && tone(f, 0.35, "square", 0.2), i * 120)); break;
      case "spell": {
        const el = data.element;
        if (el === "feuer" || el === "blut") { noise(0.25, 0.25, 600); tone(180, 0.3, "sawtooth", 0.15, 0.4); }
        else if (el === "eis" || el === "wasser") { tone(1400, 0.2, "sine", 0.15, 0.4); noise(0.15, 0.1, 4000); }
        else if (el === "blitz") { noise(0.12, 0.35, 5000); tone(2000, 0.08, "square", 0.1, 0.2); }
        else if (el === "erde") { tone(90, 0.35, "square", 0.3, 0.5); noise(0.3, 0.2, 200); }
        else if (el === "wind") { noise(0.3, 0.2, 1800); }
        else if (el === "licht") { tone(880, 0.3, "sine", 0.15, 2); tone(1320, 0.3, "sine", 0.1, 2); }
        else { tone(220, 0.3, "sine", 0.2, 0.5); noise(0.2, 0.1, 400); }
        break;
      }
      default: break;
    }
  }
}
