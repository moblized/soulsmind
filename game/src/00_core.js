// ===== core: constants, helpers, shared state, input, sound =====
const T = 24, STEP = 1 / 120, TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
let rnd = Math.random; // gameplay randomness (tests may swap this for a seeded one)
const rr = (a, b) => a + rnd() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const $ = (id) => document.getElementById(id);

const G = {
  state: 'boot', time: 0, room: null, player: null, enemies: [], shots: [], parts: [], boss: null,
  cam: { x: 0, y: 0 }, shake: 0, hitstop: 0, fadeA: 0, fade: null, later: [], save: null,
  nearSign: null, nearBrazier: null, drops: [], god: false, reduceMotion: false, app: false,
};

// ---------- input ----------
const NAMES = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash'];
const blank = () => ({ left: false, right: false, up: false, down: false, jump: false, attack: false, dash: false, heal: false, pause: false });
const EDGES = ['jump', 'attack', 'dash', 'heal', 'pause', 'up'];
const edges = () => ({ jump: false, attack: false, dash: false, heal: false, pause: false, up: false });
const Input = {
  keys: Object.create(null), touch: blank(), pad: blank(), bot: null,
  held: blank(), pressed: edges(), edge: edges(), prev: edges(),
  device: 'keys', onDevice: null,
  setDevice(d) { if (this.device !== d) { this.device = d; if (this.onDevice) this.onDevice(d); } },
  readPad() {
    const g = this.pad; let pad = null;
    try { const pads = navigator.getGamepads ? navigator.getGamepads() : []; for (let i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { pad = pads[i]; break; } } catch (e) { pad = null; }
    if (!pad) { for (const n in g) g[n] = false; return; }
    const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed), ax = pad.axes || [];
    g.left = b(14) || ax[0] < -0.4; g.right = b(15) || ax[0] > 0.4;
    g.up = b(12) || ax[1] < -0.55; g.down = b(13) || ax[1] > 0.55;
    g.jump = b(0); g.attack = b(2); g.heal = b(3); g.dash = b(1) || b(5) || b(7); g.pause = b(9);
    if (g.left || g.right || g.jump || g.attack || g.dash) this.setDevice('pad');
  },
  poll() {
    this.readPad();
    const k = this.keys, t = this.touch, g = this.pad, b = this.bot || {}, h = this.held;
    h.left = !!(k.ArrowLeft || k.KeyA || t.left || g.left || b.left);
    h.right = !!(k.ArrowRight || k.KeyD || t.right || g.right || b.right);
    h.up = !!(k.ArrowUp || k.KeyW || t.up || g.up || b.up);
    h.down = !!(k.ArrowDown || k.KeyS || t.down || g.down || b.down);
    h.jump = !!(k.Space || k.KeyZ || k.KeyK || t.jump || g.jump || b.jump);
    h.attack = !!(k.KeyX || k.KeyJ || t.attack || g.attack || b.attack);
    h.dash = !!(k.KeyC || k.KeyL || k.ShiftLeft || k.ShiftRight || t.dash || g.dash || b.dash);
    h.heal = !!(k.KeyV || k.KeyF || k.KeyQ || t.heal || g.heal || b.heal);
    h.pause = !!g.pause;
    for (const n of EDGES) {
      if (this.edge[n] || (h[n] && !this.prev[n])) this.pressed[n] = true;
      this.prev[n] = h[n]; this.edge[n] = false;
    }
  },
  clearPressed() { const p = this.pressed; for (const n of EDGES) p[n] = false; },
  label(n) {
    const d = this.device;
    const L = {
      jump: { touch: 'JUMP', keys: 'Z or Space', pad: 'A' },
      attack: { touch: 'STRIKE', keys: 'X', pad: 'X' },
      dash: { touch: 'DASH', keys: 'C', pad: 'RB' },
      heal: { touch: 'FLASK', keys: 'V', pad: 'Y' },
      rest: { touch: 'Push the stick up', keys: 'Press Up', pad: 'Press up' },
      move: { touch: 'Drag on the left side of the screen', keys: 'Use the arrow keys', pad: 'Use the left stick' },
      aim: { touch: 'Drag up or down', keys: 'Hold Up or Down', pad: 'Hold up or down' },
    };
    return L[n][d] || L[n].keys;
  },
  fill(s) { return String(s).replace(/\{(\w)\}/g, (m, c) => this.label({ J: 'jump', A: 'attack', D: 'dash', M: 'move', U: 'aim', H: 'heal', R: 'rest' }[c] || 'jump')); },
};

// ---------- sound (all synthesized) ----------
const Sfx = {
  ctx: null, out: null, muted: false, nbuf: null, musicT: 2, mood: 'calm', pulse: 0, lv: 1,
  init() {
    if (this.ctx) { this.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = (this.ctx = new AC());
      this.out = c.createGain(); this.out.gain.value = this.muted ? 0 : 0.7; this.out.connect(c.destination);
      const len = c.sampleRate; this.nbuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.nbuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // wind bed
      const src = c.createBufferSource(); src.buffer = this.nbuf; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 0.7;
      const g = c.createGain(); g.gain.value = 0.045;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const l1 = c.createGain(); l1.gain.value = 180; lfo.connect(l1); l1.connect(bp.frequency);
      const l2 = c.createGain(); l2.gain.value = 0.02; lfo.connect(l2); l2.connect(g.gain);
      src.connect(bp); bp.connect(g); g.connect(this.out); src.start(); lfo.start();
      this.resume();
    } catch (e) { this.ctx = null; }
  },
  resume() { try { if (this.ctx && this.ctx.state === 'suspended') { const r = this.ctx.resume(); if (r && r.catch) r.catch(() => {}); } } catch (e) {} },
  setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 0.7; },
  tone(f, dur, type, vol, slideTo, delay) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain(); o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.03);
  },
  noise(dur, vol, f, q, slideTo, delay) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(); s.buffer = this.nbuf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(f, t);
    if (slideTo) bp.frequency.exponentialRampToValueAtTime(slideTo, t + dur); bp.Q.value = q || 1;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  bell(f, vol, dur, delay) {
    const ratios = [0.5, 1, 1.19, 1.5, 2, 2.74, 3.01, 4.1], amps = [0.5, 1, 0.6, 0.4, 0.5, 0.25, 0.2, 0.1];
    for (let i = 0; i < ratios.length; i++) this.tone(f * ratios[i], dur / (1 + i * 0.35), 'sine', vol * amps[i], 0, delay);
  },
  play(n) {
    if (!this.ctx || this.muted) return;
    try {
      switch (n) {
        case 'jump': this.tone(300, 0.12, 'triangle', 0.07, 520); break;
        case 'land': this.noise(0.08, 0.1, 180, 0.8); break;
        case 'swing': this.noise(0.11, 0.13, 1800, 0.9, 600); break;
        case 'hit': this.bell(880, 0.06, 0.5); this.noise(0.06, 0.14, 900, 1); break;
        case 'charged': this.bell(1174.7, 0.05, 0.9); this.bell(1568, 0.04, 0.9, 0.08); break;
        case 'peal': this.bell(392, 0.2, 2.4); this.bell(587.3, 0.09, 1.8, 0.03); break;
        case 'hurt': this.tone(220, 0.25, 'sawtooth', 0.1, 70); this.noise(0.15, 0.18, 300, 0.7); break;
        case 'dash': this.noise(0.2, 0.18, 500, 0.6, 2400); break;
        case 'kill': this.noise(0.25, 0.16, 1200, 0.7, 200); this.tone(660, 0.18, 'sine', 0.05, 1320); break;
        case 'brazier': this.noise(0.6, 0.18, 300, 0.5, 1400); this.bell(523.25, 0.07, 1.6, 0.1); break;
        case 'pickup': [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, 0.08, 1.6, i * 0.12)); break;
        case 'orb': this.tone(520, 0.3, 'sine', 0.05, 180); break;
        case 'slam': this.tone(90, 0.5, 'sine', 0.35, 35); this.noise(0.35, 0.28, 140, 0.6); break;
        case 'warn': this.tone(1400, 0.12, 'sine', 0.04); break;
        case 'shatter': this.noise(0.3, 0.16, 3000, 1.2, 800); break;
        case 'roar': this.tone(70, 1.1, 'sawtooth', 0.16, 45); this.bell(98, 0.18, 2.5); break;
        case 'greatbell': this.bell(130.8, 0.4, 5); this.bell(196, 0.2, 4, 0.02); this.bell(261.6, 0.12, 3.5, 0.05); break;
        case 'ui': this.tone(660, 0.07, 'sine', 0.05); break;
        case 'chime': this.tone(1568 + Math.random() * 300, 0.09, 'sine', 0.035); break;
        case 'drink': this.noise(0.5, 0.08, 700, 1.2, 1600); break;
        case 'mend': this.bell(659.25, 0.09, 1.2); this.bell(987.8, 0.05, 1.2, 0.06); break;
        case 'buy': this.bell(392, 0.1, 1.4); this.bell(783.99, 0.07, 1.4, 0.1); break;
        case 'deny': this.tone(160, 0.12, 'square', 0.04); break;
        case 'echo': this.bell(293.7, 0.1, 2); this.bell(440, 0.06, 2, 0.12); break;
        case 'clang': this.tone(1240, 0.16, 'square', 0.035, 860); this.bell(1760, 0.03, 0.5); this.noise(0.05, 0.14, 3400, 2); break;
        case 'thrust': this.noise(0.14, 0.15, 1500, 1, 500); break;
        case 'bow': this.tone(170, 0.3, 'triangle', 0.05, 250); break;
        case 'arrow': this.noise(0.16, 0.09, 2800, 2, 1300); break;
        case 'step2': this.noise(0.18, 0.13, 900, 0.8, 2600); this.tone(520, 0.14, 'triangle', 0.05, 900); break;
        case 'fire': this.noise(0.45, 0.15, 500, 0.6, 1700); break;
        case 'heavy': this.noise(0.24, 0.2, 420, 0.7, 120); break;
        case 'growl': this.tone(92, 0.4, 'sawtooth', 0.07, 66); break;
        case 'gleam': this.tone(2400, 0.22, 'sine', 0.03, 3200); break;
        case 'flutter': this.noise(0.22, 0.09, 700, 3, 1300); break;
        case 'blink': this.tone(1800, 0.25, 'sine', 0.04, 600); this.tone(900, 0.2, 'sine', 0.03, 2400); break;
        case 'zap': this.noise(0.18, 0.12, 2600, 2, 4200); this.tone(1320, 0.14, 'square', 0.025, 660); break;
        case 'bolt': this.tone(1046.5, 0.16, 'sine', 0.05, 1568); this.noise(0.08, 0.07, 3000, 2); break;
        case 'glide': this.noise(0.25, 0.06, 900, 2, 500); break;
        case 'warp': [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.bell(f, 0.06, 1.4, i * 0.07)); this.noise(0.6, 0.1, 600, 1, 2400); break;
        case 'die': this.tone(300, 0.9, 'triangle', 0.13, 50); this.noise(0.6, 0.18, 400, 0.6, 100); break;
      }
    } catch (e) {}
  },
  music(dt) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    this.musicT -= dt; if (this.musicT > 0) return;
    try {
      if (this.mood === 'boss') {
        this.musicT = 0.46; this.pulse++;
        this.tone(this.pulse % 4 === 0 ? 55 : 41.2, 0.3, 'triangle', 0.14);
        if (this.pulse % 8 === 6) this.bell(155.6, 0.045, 1.2);
      } else {
        this.musicT = 2.2 + Math.random() * 4;
        const sc = this.lv === 3 ? [261.6, 293.7, 329.6, 392, 440, 523.25, 587.3, 659.25] : this.lv === 2 ? [146.8, 174.6, 196, 220, 233.1, 293.7, 349.2] : [196, 220, 261.6, 293.7, 329.6, 392, 440];
        const f = sc[(Math.random() * sc.length) | 0] * (Math.random() < 0.3 ? 2 : 1);
        this.bell(f, 0.03, 3); if (Math.random() < 0.35) this.bell(f * 1.5, 0.018, 3, 0.4);
      }
    } catch (e) {}
  },
};

// ---------- particles ----------
function part(x, y, vx, vy, life, size, color, grav, kind) {
  if (G.parts.length < 420) G.parts.push({ x, y, vx, vy, life, max: life, size, color, grav: grav || 0, kind: kind || 0 });
}
function burst(x, y, n, speed, color, life, size, grav) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = speed * (0.3 + Math.random() * 0.7);
    part(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.5), size, color, grav);
  }
}
function ringFx(x, y, r, color, life) { part(x, y, r, 0, life, 0, color, 0, 2); }
function updateParticles(dt) {
  const ps = G.parts;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i]; p.life -= dt;
    if (p.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
    if (p.kind !== 2) { p.vy += p.grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
}
