// ===== chime farms: one hoard room per level, behind a door that opens after that level's first boss =====
// P = a pile of eight hoardlings asleep on their chimes. They never fight back. Struck, they wake and scatter,
// but the pit keeps them in. Rest at the brazier by the door (or step out and back) and the pile is whole again.
FOES.g = { w: 14, h: 10, hp: 1.5, chimes: 10, hoard: true, harmless: true, ground: true };
const HOARD_CHIMES = { 1: 10, 2: 24, 3: 45 }; // per hoardling; eight to a pile
const HOARD_LOOK = {
  1: { name: 'Bell Mite', body: '#dfeef5', shade: '#9fc3d3', accent: '#e2b64f', eye: '#1b2233' },
  2: { name: 'Tithe Beetle', body: '#c9a14a', shade: '#7a5a22', accent: '#ffe6a0', eye: '#2a1c16' },
  3: { name: 'Glimmer Grub', body: '#cfc6ff', shade: '#8a78e0', accent: '#fff1c9', eye: '#2b2160' },
};

function spawnHoard(tx, ty) {
  const n = 8, v = HOARD_CHIMES[G.room.level] || 10, heap = [1, 6, 3, 9, 8, 2, 5, 0];
  G.room.hoard = { x: tx * T + T / 2, y: (ty + 1) * T };
  for (let i = 0; i < n; i++) {
    const e = spawnEnemy('g', tx, ty);
    e.x += (i - (n - 1) / 2) * 6 + rr(-1.5, 1.5); e.hx = e.x; e.chimes = v; e.mode = 'sleep'; e.dir = i % 2 ? 1 : -1; e.cower = 0;
    e.heap = heap[i] * (1 - Math.abs(i - (n - 1) / 2) / n); // asleep, they lie heaped on the chimes
  }
}
function wakeHoard(x, y) {
  for (const o of G.enemies) if (o.type === 'g' && o.mode === 'sleep' && Math.hypot(o.x + o.w / 2 - x, o.y + o.h / 2 - y) < 120) { o.mode = 'awake'; o.vy = -170 - rnd() * 80; }
}
function updateHoardling(e, dt, dx) {
  const room = G.room;
  e.vy = Math.min(e.vy + 1400 * dt, 500);
  if (e.mode === 'sleep') e.vx = approach(e.vx, 0, 400 * dt);
  else if (e.stun > 0) { e.stun -= dt; e.vx = approach(e.vx, 0, 500 * dt); }
  else if (e.cower > 0) { e.cower -= dt; e.vx = 0; }
  else if (Math.abs(dx) > 130) e.vx = approach(e.vx, 0, 300 * dt); // far enough away: stop and tremble
  else { const away = dx > 0 ? -1 : 1; e.dir = away; e.vx = approach(e.vx, away * 92, 900 * dt); }
  moveX(e, e.vx * dt, room);
  if (e.hitWall && e.mode !== 'sleep' && e.stun <= 0 && e.cower <= 0) { e.cower = 0.7; e.vx = 0; } // cornered
  moveY(e, e.vy * dt, room);
  if (e.y > room.h * T + 60) e.dead = true;
}

function drawHoardling(c, e, t) {
  const L = HOARD_LOOK[G.room.level] || HOARD_LOOK[1], cx = e.x + e.w / 2, white = e.flash > 0, W = (col) => (white ? '#fff' : col);
  const asleep = e.mode === 'sleep', lv = G.room.level, shake = !asleep && e.cower > 0 ? (Math.random() - 0.5) * 1.6 : 0;
  if (asleep) {
    glow(c, cx, e.y + e.h - 2, 18, 'rgba(255,210,122,0.16)');
    c.fillStyle = '#e2b64f'; c.fillRect(cx - 5 + (e.hx % 7), e.y + e.h - 1.5, 2, 1.5);
    if (Math.sin(t * 3 + e.hx) > 0.95) { c.fillStyle = '#fff6dc'; c.fillRect(cx + 3, e.y + e.h - 3, 1.5, 1.5); }
  }
  c.save(); c.translate(cx + shake, e.y + e.h - (asleep ? 4 + e.heap : 0)); c.scale(e.dir * 1.25, 1.25 * (asleep ? 0.86 + 0.05 * Math.sin(t * 2 + e.hx) : 1));
  const run = !asleep && Math.abs(e.vx) > 10, leg = run ? Math.sin(e.t * 26) * 1.8 : 0;
  if (lv !== 3) { c.strokeStyle = W(L.shade); c.lineWidth = 1.3; c.beginPath(); for (const lx of [-4, 0, 4]) { c.moveTo(lx, -3); c.lineTo(lx + leg * (lx === 0 ? -1 : 1), 0); } c.stroke(); }
  if (lv === 3) { // a soft segmented grub, glowing from inside
    for (let i = 0; i < 4; i++) { c.fillStyle = W(i % 2 ? L.shade : L.body); c.beginPath(); c.ellipse(-5 + i * 3.4, -3.5 - Math.sin(e.t * (run ? 14 : 3) + i) * 0.8, 3.4, 3.2, 0, 0, TAU); c.fill(); }
    if (!white) glow(c, 0, -4, 10, 'rgba(255,241,201,0.35)');
  } else {
    c.fillStyle = W(L.body); c.beginPath(); c.ellipse(0, -5, 7, 4.8, 0, 0, TAU); c.fill();
    c.fillStyle = W(L.shade); c.beginPath(); c.ellipse(-1, -3, 6, 2.4, 0, 0, Math.PI); c.fill();
    if (lv === 2) { c.strokeStyle = W(L.shade); c.lineWidth = 0.9; c.beginPath(); c.moveTo(-1, -9.6); c.lineTo(-1, -1); c.stroke(); c.fillStyle = W(L.accent); c.beginPath(); c.arc(-3.5, -6.5, 1.3, 0, TAU); c.arc(2, -6.5, 1.3, 0, TAU); c.fill(); }
    else { c.fillStyle = W(L.accent); c.beginPath(); c.moveTo(-3, -9); c.quadraticCurveTo(-3.5, -12.5, -1, -13); c.quadraticCurveTo(1.5, -12.5, 1, -9); c.closePath(); c.fill(); } // a tiny stolen bell
  }
  c.fillStyle = L.eye;
  if (asleep) c.fillRect(3.5, -6, 2.4, 0.9); else c.fillRect(4, -7, 1.6, 1.8);
  c.restore();
}

// the heap of chimes the pile sleeps on (it stays when they scatter)
function drawHoardHeap(c, h, t) {
  glow(c, h.x, h.y - 6, 60, 'rgba(255,200,90,0.2)');
  c.fillStyle = '#8a6a22'; c.beginPath(); c.ellipse(h.x, h.y, 38, 9, 0, Math.PI, 0); c.fill();
  c.fillStyle = '#c99f3f'; c.beginPath(); c.ellipse(h.x, h.y, 32, 7, 0, Math.PI, 0); c.fill();
  for (let i = 0; i < 14; i++) {
    const a = hash2(i, 5), x = h.x - 30 + a * 60, y = h.y - 1 - (1 - Math.abs(a - 0.5) * 2) * 6 * hash2(i, 9);
    c.fillStyle = Math.sin(t * 3 + i * 1.7) > 0.8 ? '#fff6dc' : '#e2b64f'; c.fillRect(x, y, 2.2, 1.6);
  }
}

// ---------- the three hoard rooms ----------
function hoardRoom(o) {
  const right = o.door === 'right', X = (x) => (right ? x : 25 - x);
  const span = (x0, y0, x1, y1, c) => [Math.min(X(x0), X(x1)), y0, Math.max(X(x0), X(x1)), y1, c];
  return {
    name: o.name, level: o.level, kind: o.kind, w: 26, h: 13, map: o.map, exits: { a: o.back },
    signs: { [X(19) + ',9']: o.sign },
    build(b) {
      b.f(0, 0, 25, 1).f(0, 10, 25, 12).f(X(0), 2, X(0), 9);
      b.f(...span(25, 2, 25, 7)).p(X(25), 8, 'a').p(X(25), 9, 'a');
      b.f(...span(4, 10, 16, 11, '.'));              // the hoard pit: two tiles deep, so nothing in it can climb out
      b.f(...span(2, 6, 3, 6, '='));                 // a perch over the pit
      b.p(X(21), 9, 'B').p(X(19), 9, 'S').p(X(10), 11, 'P');
    },
  };
}
Object.assign(ROOMS, {
  hoard: hoardRoom({ name: 'The Offering Hoard', level: 1, kind: 'indoor', map: [0, 6, 3, 2], door: 'right', back: ['gate', 'b'],
    sign: 'Pilgrims left chimes here as offerings, and the Bell Mites made a nest of them. They never fight back. Strike the pile, then rest at the brazier: the mites creep back to their hoard.' }),
  tithe: hoardRoom({ name: 'The Tithe Vault', level: 2, kind: 'crypt', map: [17, 2, 3, 2], door: 'left', back: ['oldroad', 'd'],
    sign: 'Every chime Duskmarch ever taxed ended up in this vault. The Tithe Beetles are still counting it. Rest at the brazier and they come back to count again.' }),
  glimmer: hoardRoom({ name: 'The Glimmer Well', level: 3, kind: 'vault', map: [26, 2, 3, 2], door: 'left', back: ['stair', 'c'],
    sign: 'Fallen starlight pools here, and the Glimmer Grubs grow fat on it. Rest at the brazier and more crawl up out of the well.' }),
});
// doors into them, each sealed until that level's first boss falls
(function () {
  const add = (id, L, flag, fn) => { const r = ROOMS[id], build = r.build; r.exits[L] = [{ b: 'hoard', d: 'tithe', c: 'glimmer' }[L], 'a']; r.locks = Object.assign(r.locks || {}, { [L]: flag }); r.build = (o) => { build(o); fn(o); }; };
  add('gate', 'b', 'mini', (o) => o.p(0, 11, 'b').p(0, 12, 'b'));
  add('oldroad', 'd', 'warden', (o) => o.p(51, 5, 'd').p(51, 6, 'd').f(48, 7, 50, 7, '='));
  add('stair', 'c', 'moth', (o) => o.p(32, 13, '#').p(33, 11, 'c').p(33, 12, 'c'));
})();
