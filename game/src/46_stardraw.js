// ===== drawing for Level 3: Starwell =====
// moonstone under a sky that will not stop falling, and the brass-and-indigo halls of the old observatory
Object.assign(PAL, {
  star: { edge: ['#3b3a5e', '#413f66', '#36355a'], inner: ['#1a1830', '#1d1b35', '#17152b'], side: '#5d5a8c', under: '#121022', snow: '#d9d4f2', shade: 'rgba(150,140,220,0.4)', star: true },
  vault: { edge: ['#32304f', '#363354', '#2d2b48'], inner: ['#14122a', '#16142d', '#121026'], side: '#4f4b7a', under: '#0e0c1d', snow: '#b8b0e0', shade: 'rgba(120,110,200,0.35)', star: true },
});

function drawStarSky(c, a, s, t) {
  const g = c.createLinearGradient(0, a.y, 0, a.y + a.h);
  g.addColorStop(0, '#05041a'); g.addColorStop(0.5, '#130e38'); g.addColorStop(0.85, '#2a1b52'); g.addColorStop(1, '#3d2a63');
  c.fillStyle = g; c.fillRect(a.x, a.y, a.w, a.h);
  // a river of light across the sky
  for (let i = 0; i < 5; i++) {
    const nx = a.x + ((i * 0.23 + 0.08) * a.w - G.cam.x * 0.01 * s), ny = a.y + a.h * (0.18 + i * 0.07), r = a.h * (0.22 + hash2(i, 41) * 0.12);
    const ng = c.createRadialGradient(nx, ny, 0, nx, ny, r);
    ng.addColorStop(0, i % 2 ? 'rgba(120,200,230,0.10)' : 'rgba(170,120,230,0.12)'); ng.addColorStop(1, 'rgba(60,40,120,0)');
    c.fillStyle = ng; c.fillRect(nx - r, ny - r, r * 2, r * 2);
  }
  for (let i = 0; i < 110; i++) {
    const big = i % 13 === 0;
    c.globalAlpha = 0.2 + 0.6 * Math.abs(Math.sin(t * (0.4 + hash2(i, 4)) + i * 2.1));
    c.fillStyle = i % 7 === 0 ? '#fff1c9' : '#e6e2ff';
    const x = a.x + ((hash2(i, 11) * a.w - G.cam.x * 0.02 * s) % a.w + a.w) % a.w, y = a.y + hash2(i, 12) * a.h * 0.7;
    c.fillRect(x, y, big ? 2 : 1.2, big ? 2 : 1.2);
    if (big) { c.fillRect(x - 2, y + 0.5, 6, 0.8); c.fillRect(x + 0.6, y - 2, 0.8, 6); }
  }
  c.globalAlpha = 1;
  // shooting stars
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.17 + hash2(i, 31)) % 1; if (ph > 0.14) continue;
    const k = ph / 0.14, sx = a.x + a.w * (0.15 + hash2(i + Math.floor(t * 0.17 + hash2(i, 31)), 33) * 0.8), sy = a.y + a.h * 0.08;
    const x = sx - k * 140 * s, y = sy + k * 70 * s;
    const lg = c.createLinearGradient(x, y, x + 50 * s, y - 25 * s); lg.addColorStop(0, 'rgba(255,241,201,' + (1 - k) + ')'); lg.addColorStop(1, 'rgba(255,241,201,0)');
    c.strokeStyle = lg; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 50 * s, y - 25 * s); c.stroke();
  }
  ridge(c, a, 0.04, 0.92, 80, '#2a2050', 81, 0.004);
  observatories(c, a, s, 0.08, 0.9, '#221a44', 91);
  ridge(c, a, 0.13, 1.02, 70, '#1b1538', 93, 0.006);
  ridge(c, a, 0.24, 1.12, 60, '#120e28', 97, 0.009);
}
// the domes of the old observatory on the far peaks
function observatories(c, a, s, par, base, col, seed) {
  const sp = 220, off = G.cam.x * par, i0 = Math.floor(off / sp) - 1, i1 = Math.floor((off + View.w) / sp) + 1;
  for (let i = i0; i <= i1; i++) {
    const r = hash2(i, seed); if (r < 0.4) continue;
    const x = a.x + (i * sp - off + hash2(i, seed + 1) * sp * 0.4) * s, y = a.y + a.h * base - 30 * s, w = (22 + r * 18) * s, h = (40 + r * 50) * s;
    c.fillStyle = col; c.fillRect(x - w / 2, y - h, w, h + 60 * s);
    c.beginPath(); c.arc(x, y - h, w * 0.62, Math.PI, 0); c.fill();
    c.strokeStyle = col; c.lineWidth = 2.5 * s; c.beginPath(); c.moveTo(x, y - h - w * 0.3); c.lineTo(x + w * 0.9, y - h - w * 1.0); c.stroke();
    c.fillStyle = 'rgba(255,220,150,' + (0.18 + 0.1 * Math.sin(G.time * 1.3 + i)) + ')'; c.fillRect(x - 1.5 * s, y - h * 0.6, 3 * s, 4 * s);
  }
}
// inside: dark indigo walls, star charts, and great brass rings that still turn
function drawVault(c, a, s, t) {
  const g = c.createLinearGradient(0, a.y, 0, a.y + a.h); g.addColorStop(0, '#07061a'); g.addColorStop(1, '#16123a');
  c.fillStyle = g; c.fillRect(a.x, a.y, a.w, a.h);
  const par = 0.4, sp = 230, off = G.cam.x * par, oy = -G.cam.y * 0.12 * s;
  for (let k = Math.floor(off / sp) - 1; k <= Math.floor((off + View.w) / sp) + 1; k++) {
    const x = a.x + (k * sp - off) * s, cy = a.y + a.h * 0.42 + oy, r = (58 + hash2(k, 3) * 26) * s, sp2 = t * (0.15 + hash2(k, 5) * 0.2) * (k % 2 ? 1 : -1);
    // an arched window full of stars
    const wx = x + sp * 0.5 * s, ww = 34 * s, wt = a.y + a.h * 0.14 + oy, wh = a.h * 0.42;
    c.fillStyle = '#0d0b2a'; c.beginPath(); c.moveTo(wx - ww / 2, wt + wh); c.lineTo(wx - ww / 2, wt + ww / 2); c.arc(wx, wt + ww / 2, ww / 2, Math.PI, 0); c.lineTo(wx + ww / 2, wt + wh); c.closePath(); c.fill();
    c.fillStyle = '#e6e2ff'; for (let i = 0; i < 6; i++) { c.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t + i + k)); c.fillRect(wx - ww / 2 + 4 * s + hash2(k, i) * (ww - 8 * s), wt + 6 * s + hash2(i, k) * (wh - 10 * s), 1.3, 1.3); }
    c.globalAlpha = 1;
    // orrery rings
    c.strokeStyle = 'rgba(201,159,63,0.16)'; c.lineWidth = 2 * s;
    for (let j = 0; j < 3; j++) { c.beginPath(); c.ellipse(x, cy, r * (1 - j * 0.22), r * (0.32 + j * 0.2), sp2 + j * 0.9, 0, TAU); c.stroke(); }
    c.fillStyle = 'rgba(201,159,63,0.22)'; c.beginPath(); c.arc(x, cy, 6 * s, 0, TAU); c.fill();
    const pa = sp2 * 3; c.fillStyle = 'rgba(230,220,255,0.28)'; c.beginPath(); c.arc(x + Math.cos(pa) * r, cy + Math.sin(pa) * r * 0.32, 3.5 * s, 0, TAU); c.fill();
    // a pillar
    c.fillStyle = '#0f0d26'; c.fillRect(x - 14 * s, a.y, 28 * s, a.h); c.fillStyle = '#1b1840'; c.fillRect(x - 14 * s, a.y, 3 * s, a.h);
    // star chart lines on the wall
    c.strokeStyle = 'rgba(180,170,255,0.08)'; c.lineWidth = 1; c.beginPath();
    for (let i = 0; i < 4; i++) { const px = x + (40 + hash2(k, i + 9) * 80) * s, py = a.y + a.h * (0.6 + hash2(i, k + 9) * 0.3) + oy; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
    c.stroke();
  }
}

function drawStarFoe(c, e, t) {
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, white = e.flash > 0, W = (col) => (white ? '#fff' : col);
  if (e.type === 'n') { // Starling Moth
    const tell = e.mode === 'tell', dive = e.mode === 'dive', flap = dive ? 0.25 : Math.sin(e.t * (tell ? 30 : 14)) * 0.5 + 0.5;
    glow(c, cx, cy, tell ? 34 : 22, tell ? 'rgba(255,241,201,0.45)' : 'rgba(190,170,255,0.25)');
    c.save(); c.translate(cx, cy); c.scale(e.dir, 1); if (dive) c.rotate(Math.atan2(e.vy, Math.abs(e.vx) + 1) * 0.6);
    for (const sy of [-1, 1]) {
      c.fillStyle = W(tell ? '#fff1c9' : '#b9a8ff'); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-9, sy * (4 + flap * 9), -13, sy * (2 + flap * 6)); c.quadraticCurveTo(-8, sy * 1, 0, 0); c.fill();
      c.fillStyle = W('#8a78e0'); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, sy * (4 + flap * 7), 9, sy * (3 + flap * 4)); c.quadraticCurveTo(5, sy, 0, 0); c.fill();
    }
    c.fillStyle = W('#e8ddff'); c.beginPath(); c.ellipse(0, 0, 5.5, 2.6, 0, 0, TAU); c.fill();
    c.fillStyle = tell ? '#fff' : '#3a2f6a'; c.fillRect(3.5, -1.2, 1.5, 1.5);
    c.strokeStyle = W('#e8ddff'); c.lineWidth = 0.8; c.beginPath(); c.moveTo(4, -1.5); c.quadraticCurveTo(8, -5, 10, -4); c.stroke();
    c.restore();
    return;
  }
  if (e.type === 'o') { // Orrery Sentinel
    const charge = e.mode === 'charge', k = charge ? clamp(e.mt / 0.65, 0, 1) : 0;
    glow(c, cx, cy, 30 + k * 16, 'rgba(255,210,130,' + (0.18 + k * 0.3) + ')');
    c.save(); c.translate(cx, cy);
    c.strokeStyle = W('#c99f3f'); c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(0, 0, 14, 5, e.spin, 0, TAU); c.stroke();
    c.beginPath(); c.ellipse(0, 0, 13, 6, -e.spin * 0.7 + 1.2, 0, TAU); c.stroke();
    c.fillStyle = W('#6b5a8a'); c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill();
    c.fillStyle = W('#8f7ab8'); c.beginPath(); c.arc(-2, -2, 4, 0, TAU); c.fill();
    c.fillStyle = charge ? '#fff1c9' : '#ffd27a'; c.beginPath(); c.arc(0, 0, 2.4 + k * 2, 0, TAU); c.fill();
    for (let i = 0; i < 3; i++) { const a = e.spin * 1.6 + (i * TAU) / 3; c.fillStyle = '#ffe6a0'; c.beginPath(); c.arc(Math.cos(a) * 13, Math.sin(a) * 5, 1.6, 0, TAU); c.fill(); }
    c.restore();
    return;
  }
  // Blink Acolyte: a hooded student in a cloak stitched with stars, carrying a curved blade
  const alpha = e.alpha == null ? 1 : e.alpha, wind = e.mode === 'wind', slash = e.mode === 'slash';
  c.save(); c.globalAlpha = clamp(alpha, 0.05, 1); c.translate(cx, e.y + e.h); c.scale(e.dir, 1);
  c.fillStyle = W('#26245a'); c.beginPath(); c.moveTo(-4, -24); c.quadraticCurveTo(-10, -12, -9, 0); c.lineTo(9, 0); c.quadraticCurveTo(9, -12, 4, -24); c.closePath(); c.fill();
  c.fillStyle = '#e6e2ff'; for (let i = 0; i < 5; i++) c.fillRect(-6 + hash2(i, 3) * 12, -20 + hash2(3, i) * 18, 1, 1);
  c.fillStyle = W('#1d1b48'); c.beginPath(); c.arc(0, -22, 5.5, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-3, -26); c.lineTo(-7, -31); c.lineTo(-5, -23); c.closePath(); c.fill();
  c.fillStyle = '#0a0918'; c.beginPath(); c.ellipse(1.5, -21.5, 3.2, 3, 0, 0, TAU); c.fill();
  c.fillStyle = '#cfc6ff'; c.fillRect(1.5, -22.5, 2.5, 1.2);
  // the blade
  c.save(); c.translate(5, -14); c.rotate(wind ? -1.8 : slash ? 0.9 : -0.4);
  c.strokeStyle = W('#d9d2ff'); c.lineWidth = 1.8; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(10, -4, 16, 2); c.stroke();
  c.restore();
  c.restore();
  if (wind) glow(c, cx + e.dir * 8, e.y + 8, 18, 'rgba(207,198,255,0.4)');
  if (slash) { c.save(); c.globalAlpha = 0.7; drawSlash(c, cx + e.dir * 10, e.y + 13, e.dir > 0 ? 0 : Math.PI, 26, 1, false, true); c.restore(); }
}

function drawNightMoth(c, b) {
  const t = G.time, white = b.flash > 0, W = (col) => (white ? '#fff' : col), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  const asleep = b.state === 'sleep' || b.state === 'wake' && b.st < 0.8, dive = b.state === 'dive', fast = b.phase === 2;
  if (asleep) { c.strokeStyle = 'rgba(230,225,255,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx, b.A.ceil); c.lineTo(cx, b.y + 4); c.stroke(); }
  glow(c, cx, cy, 120, fast ? 'rgba(255,241,201,0.18)' : 'rgba(170,150,255,0.16)');
  c.save(); c.translate(cx, cy); c.scale(b.face, 1);
  if (b.state === 'dying') c.globalAlpha = clamp(1 - b.st / 2.2, 0.05, 1);
  if (dive) c.rotate(clamp(Math.atan2(b.vy, Math.abs(b.vx) + 1) * 0.5, -0.8, 0.8));
  if (asleep) { // hanging folded, head down
    c.rotate(Math.PI);
    c.fillStyle = W('#5a4a9a'); c.beginPath(); c.moveTo(0, -14); c.quadraticCurveTo(18, -4, 6, 16); c.lineTo(-6, 16); c.quadraticCurveTo(-18, -4, 0, -14); c.fill();
    c.fillStyle = W('#e8ddff'); c.beginPath(); c.ellipse(0, 2, 5, 13, 0, 0, TAU); c.fill();
    c.restore(); return;
  }
  const flap = dive ? 0.15 : Math.sin(t * (b.state === 'gust' ? 22 : fast ? 12 : 9)) * 0.5 + 0.5;
  for (const sy of [-1, 1]) {
    // fore wing with an eye
    c.fillStyle = W(fast ? '#8f7ad8' : '#6b58b8');
    c.beginPath(); c.moveTo(4, sy * 2); c.bezierCurveTo(-4, sy * (16 + flap * 22), -30, sy * (20 + flap * 18), -32, sy * (10 + flap * 10)); c.quadraticCurveTo(-16, sy * 3, 4, sy * 2); c.fill();
    const ex = -19, ey = sy * (11 + flap * 11);
    c.fillStyle = W('#fff1c9'); c.beginPath(); c.arc(ex, ey, 5, 0, TAU); c.fill();
    c.fillStyle = W('#2b2160'); c.beginPath(); c.arc(ex, ey, 2.8, 0, TAU); c.fill();
    // hind wing
    c.fillStyle = W('#b9a8ff'); c.beginPath(); c.moveTo(2, sy * 2); c.bezierCurveTo(12, sy * (12 + flap * 14), 22, sy * (12 + flap * 10), 20, sy * (6 + flap * 5)); c.quadraticCurveTo(10, sy * 2, 2, sy * 2); c.fill();
  }
  c.fillStyle = W('#e8ddff'); c.beginPath(); c.ellipse(0, 0, 14, 5.5, 0, 0, TAU); c.fill();
  c.fillStyle = W('#cfc6ff'); for (let i = 0; i < 4; i++) c.fillRect(-10 + i * 5, -4.5, 1.2, 9);
  c.fillStyle = W('#f4f0ff'); c.beginPath(); c.arc(13, 0, 4.5, 0, TAU); c.fill();
  c.fillStyle = fast ? '#fff1c9' : '#2b2160'; c.fillRect(14, -2.5, 2, 2); c.fillRect(14, 0.8, 2, 2);
  c.strokeStyle = W('#f4f0ff'); c.lineWidth = 1; for (const sy of [-1, 1]) { c.beginPath(); c.moveTo(15, sy * 2); c.quadraticCurveTo(22, sy * 9, 27, sy * 7); c.stroke(); }
  c.restore();
  if (b.state === 'diveTell') { c.fillStyle = 'rgba(255,241,201,' + (0.12 + 0.1 * Math.sin(t * 30)) + ')'; c.beginPath(); c.arc(cx, cy, 30, 0, TAU); c.fill(); }
}

function drawOrren(c, b) {
  const t = G.time, white = b.flash > 0, W = (col) => (white ? '#fff' : col), cx = b.x + b.w / 2, fast = b.phase === 2, A = b.A;
  if (b.state === 'sleep') { // the great telescope he bends over
    c.strokeStyle = '#6b5a3a'; c.lineWidth = 7; c.beginPath(); c.moveTo(cx - 34, A.floor - 30); c.lineTo(cx - 80, A.floor - 92); c.stroke();
    c.strokeStyle = '#c99f3f'; c.lineWidth = 2; c.stroke();
    c.fillStyle = '#3a2f22'; c.fillRect(cx - 38, A.floor - 30, 8, 30);
  }
  c.save(); c.globalAlpha = clamp(b.alpha == null ? 1 : b.alpha, 0, 1);
  if (b.state === 'dying') c.globalAlpha = clamp(b.alpha, 0.05, 1);
  glow(c, cx, b.y + 18, fast ? 90 : 70, fast ? 'rgba(255,241,201,0.22)' : 'rgba(160,150,255,0.18)');
  // a turning armillary behind him
  c.strokeStyle = W(fast ? 'rgba(255,225,150,0.75)' : 'rgba(201,159,63,0.6)'); c.lineWidth = 1.4;
  for (let j = 0; j < 2; j++) { c.beginPath(); c.ellipse(cx, b.y + 14, 22 - j * 4, 8 + j * 6, b.ring * (j ? -0.8 : 0.6) + j, 0, TAU); c.stroke(); }
  c.translate(cx, b.y); c.scale(b.face, 1);
  const bow = b.state === 'sleep' ? 0.35 : 0;
  c.rotate(bow);
  // long robe
  const robe = c.createLinearGradient(0, 0, 0, b.h); robe.addColorStop(0, W('#2c2a6a')); robe.addColorStop(1, W('#181640'));
  c.fillStyle = robe; c.beginPath(); c.moveTo(-6, 10); c.quadraticCurveTo(-14, 30, -13, b.h); c.lineTo(13, b.h); c.quadraticCurveTo(14, 30, 6, 10); c.closePath(); c.fill();
  c.fillStyle = '#e6e2ff'; for (let i = 0; i < 8; i++) c.fillRect(-10 + hash2(i, 77) * 20, 16 + hash2(77, i) * 30, 1.2, 1.2);
  c.strokeStyle = W('#c99f3f'); c.lineWidth = 1.3; c.beginPath(); c.moveTo(-12, b.h - 3); c.lineTo(12, b.h - 3); c.stroke();
  // hood and the lens over one eye
  c.fillStyle = W('#201e52'); c.beginPath(); c.moveTo(-7.5, 12); c.quadraticCurveTo(-9, -2, 0, -9); c.quadraticCurveTo(9, -2, 7.5, 12); c.closePath(); c.fill();
  c.fillStyle = '#07061a'; c.beginPath(); c.ellipse(1.5, 4, 4.8, 4.5, 0, 0, TAU); c.fill();
  c.fillStyle = fast ? '#fff1c9' : '#ffd27a'; c.beginPath(); c.arc(2.6, 3.6, 1.9, 0, TAU); c.fill();
  c.strokeStyle = '#c99f3f'; c.lineWidth = 1; c.beginPath(); c.arc(2.6, 3.6, 2.8, 0, TAU); c.stroke();
  // the rod, raised when he calls the sky
  const raise = b.state === 'starfall' || b.state === 'constellation' || b.state === 'enrage' ? -1.2 : b.state === 'swingWind' ? -2.2 : b.state === 'swing' ? 0.9 : b.state === 'comet' ? -0.3 : 0.2;
  c.save(); c.translate(6, 18); c.rotate(raise);
  c.strokeStyle = W('#c99f3f'); c.lineWidth = 2; c.lineCap = 'round'; c.beginPath(); c.moveTo(0, 0); c.lineTo(26, 0); c.stroke();
  c.fillStyle = '#fff1c9'; c.beginPath(); c.arc(28, 0, 3 + Math.sin(t * 9) * 0.6, 0, TAU); c.fill();
  c.restore();
  c.restore();
  if (b.state === 'swing' && b.st < 0.15) drawSlash(c, cx + b.face * 14, b.y + 24, b.face > 0 ? 0 : Math.PI, 40, 1 - b.st / 0.15, true);
  if (b.state === 'starfall' || b.state === 'constellation') glow(c, cx + b.face * 10, b.y - 6, 30, 'rgba(255,241,201,0.45)');
}

function drawStarShot(c, s, t) {
  if (s.k === 'fstar') {
    if (s.warn > 0) {
      const a = 0.08 + 0.1 * Math.abs(Math.sin(t * 14));
      c.fillStyle = 'rgba(255,241,201,' + a + ')'; c.fillRect(s.x + 4, s.y, 2, Math.max(0, s.floor - s.y));
      if (s.floor < G.room.h * T) { c.strokeStyle = 'rgba(255,241,201,' + (a + 0.25) + ')'; c.lineWidth = 1.2; c.beginPath(); c.ellipse(s.x + 5, s.floor - 1, 9, 2.5, 0, 0, TAU); c.stroke(); }
      c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 20); c.fillStyle = '#fff1c9'; c.fillRect(s.x + 3, s.y + 2, 4, 4); c.globalAlpha = 1;
      return;
    }
    glow(c, s.x + 5, s.y + 8, 26, 'rgba(255,230,170,0.45)');
    c.fillStyle = 'rgba(255,241,201,0.35)'; c.beginPath(); c.moveTo(s.x + 2, s.y + 4); c.lineTo(s.x + 8, s.y + 4); c.lineTo(s.x + 5, s.y - 30); c.closePath(); c.fill();
    c.fillStyle = '#fff6dc'; c.beginPath(); c.moveTo(s.x + 5, s.y); c.lineTo(s.x + 10, s.y + 7); c.lineTo(s.x + 5, s.y + 14); c.lineTo(s.x, s.y + 7); c.closePath(); c.fill();
    return;
  }
  if (s.k === 'mote') { glow(c, s.x, s.y, 14, 'rgba(210,200,255,0.5)'); c.fillStyle = '#efeaff'; c.beginPath(); c.arc(s.x, s.y, 2.6 + Math.sin(s.ph * 2) * 0.6, 0, TAU); c.fill(); return; }
  if (s.k === 'node') { c.fillStyle = '#fff1c9'; const r = 2.5 + Math.sin(t * 16) * 0.8; c.fillRect(s.x - r, s.y - 0.6, r * 2, 1.2); c.fillRect(s.x - 0.6, s.y - r, 1.2, r * 2); glow(c, s.x, s.y, 14, 'rgba(255,241,201,0.4)'); return; }
  if (s.k === 'line') {
    if (s.warn > 0) { c.strokeStyle = 'rgba(255,241,201,' + (0.2 + 0.25 * Math.abs(Math.sin(t * 18))) + ')'; c.lineWidth = 1; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke(); c.setLineDash([]); return; }
    c.strokeStyle = 'rgba(255,230,170,0.35)'; c.lineWidth = 9; c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke();
    c.strokeStyle = '#fff6dc'; c.lineWidth = 2.6; c.stroke();
    return;
  }
  if (s.k === 'orbiter') { glow(c, s.x, s.y, 20, 'rgba(255,230,170,0.45)'); c.fillStyle = '#fff6dc'; c.beginPath(); c.arc(s.x, s.y, 4.5, 0, TAU); c.fill(); c.strokeStyle = '#c99f3f'; c.lineWidth = 1; c.beginPath(); c.arc(s.x, s.y, 7, 0, TAU); c.stroke(); }
}
function drawBolts(c) {
  for (const s of G.pshots) {
    glow(c, s.x, s.y, 18, 'rgba(255,230,170,0.5)');
    c.fillStyle = '#fff6dc'; c.beginPath(); c.moveTo(s.x + 5, s.y); c.lineTo(s.x, s.y - 4); c.lineTo(s.x - 5, s.y); c.lineTo(s.x, s.y + 4); c.closePath(); c.fill();
  }
}
// the Starsilk spread over the hero's head
function drawGlide(c, p) {
  const cx = p.x + p.w / 2, y = p.y - 2, t = G.time, w = 15 + Math.min(1, p.glideT * 6) * 5, rip = Math.sin(t * 14) * 1.5;
  c.save(); c.globalAlpha = 0.9;
  c.fillStyle = '#e8ddff'; c.beginPath(); c.moveTo(cx - w, y + 6); c.quadraticCurveTo(cx - w * 0.6, y - 9 + rip, cx, y - 8); c.quadraticCurveTo(cx + w * 0.6, y - 9 - rip, cx + w, y + 6);
  c.quadraticCurveTo(cx + w * 0.5, y - 1, cx, y); c.quadraticCurveTo(cx - w * 0.5, y - 1, cx - w, y + 6); c.closePath(); c.fill();
  c.fillStyle = '#b9a8ff'; for (let i = 0; i < 3; i++) c.fillRect(cx - w * 0.6 + i * w * 0.6, y - 5, 1.2, 4);
  c.strokeStyle = 'rgba(232,221,255,0.6)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(cx - w, y + 6); c.lineTo(cx - 3, y + 12); c.moveTo(cx + w, y + 6); c.lineTo(cx + 3, y + 12); c.stroke();
  c.restore();
  glow(c, cx, y - 2, 30, 'rgba(210,200,255,0.25)');
}
// the Starsilk Mantle where it lies
function drawMantlePickup(c, t) {
  c.fillStyle = '#e8ddff'; c.beginPath(); c.moveTo(-11, 4); c.quadraticCurveTo(-6, -8 + Math.sin(t * 3) * 2, 0, -9); c.quadraticCurveTo(6, -8 - Math.sin(t * 3) * 2, 11, 4); c.quadraticCurveTo(0, -1, -11, 4); c.fill();
  c.fillStyle = '#b9a8ff'; c.fillRect(-6, -4, 1.2, 4); c.fillRect(0, -6, 1.2, 4); c.fillRect(6, -4, 1.2, 4);
  c.fillStyle = '#fff1c9'; c.fillRect(-1, -11, 2, 2);
}
