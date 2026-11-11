// ===== drawing for Level 2: Duskmarch =====
// The sky: violet overhead burning down to ember at the horizon, a vast sun that never finishes setting,
// and the broken towers of a fallen kingdom in three layers of distance.
function drawDuskSky(c, a, s, t) {
  const g = c.createLinearGradient(0, a.y, 0, a.y + a.h);
  g.addColorStop(0, '#170d22'); g.addColorStop(0.45, '#45203a'); g.addColorStop(0.78, '#9c432e'); g.addColorStop(1, '#d8823c');
  c.fillStyle = g; c.fillRect(a.x, a.y, a.w, a.h);
  c.fillStyle = '#f2dcc0';
  for (let i = 0; i < 26; i++) { c.globalAlpha = 0.15 + 0.35 * Math.abs(Math.sin(t * 0.5 + i * 2.3)); c.fillRect(a.x + hash2(i, 7) * a.w, a.y + hash2(i, 8) * a.h * 0.32, 1.3, 1.3); }
  c.globalAlpha = 1;
  const sx = a.x + a.w * 0.6 - G.cam.x * 0.01 * s, sy = a.y + a.h * 0.8, sr = Math.min(a.h * 0.36, 170);
  const halo = c.createRadialGradient(sx, sy, sr * 0.7, sx, sy, sr * 2.4);
  halo.addColorStop(0, 'rgba(255,190,110,0.32)'); halo.addColorStop(1, 'rgba(255,150,80,0)');
  c.fillStyle = halo; c.fillRect(sx - sr * 2.4, sy - sr * 2.4, sr * 4.8, sr * 4.8);
  const disc = c.createLinearGradient(0, sy - sr, 0, sy + sr * 0.3);
  disc.addColorStop(0, '#ffe2a8'); disc.addColorStop(1, '#f39a4a');
  c.fillStyle = disc; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
  c.fillStyle = 'rgba(120,40,40,0.18)'; for (let i = 0; i < 4; i++) c.fillRect(sx - sr, sy - sr * 0.5 + i * sr * 0.22, sr * 2, sr * 0.04);
  ridge(c, a, 0.05, 0.9, 90, '#5e2a34', 51, 0.004);
  ruins(c, a, s, 0.12, 0.93, '#43202d', 61, 1.0);
  ridge(c, a, 0.14, 1.0, 80, '#3a1b27', 63, 0.006);
  ruins(c, a, s, 0.24, 1.04, '#24121a', 71, 1.4);
  ridge(c, a, 0.26, 1.1, 70, '#1d0f16', 77, 0.009);
}
// silhouettes of towers and arches that stopped being finished
function ruins(c, a, s, par, base, col, seed, k) {
  const sp = 150 * k, off = G.cam.x * par, i0 = Math.floor(off / sp) - 1, i1 = Math.floor((off + View.w) / sp) + 1;
  c.fillStyle = col;
  for (let i = i0; i <= i1; i++) {
    const r = hash2(i, seed); if (r < 0.35) continue;
    const x = a.x + (i * sp - off + hash2(i, seed + 1) * sp * 0.5) * s, w = (14 + r * 20) * k * s, h = (50 + hash2(i, seed + 2) * 90) * k * s, y = a.y + a.h * base;
    c.fillRect(x, y - h, w, h + 40 * s);
    const n = 3, mw = w / (n * 2 - 1); for (let m = 0; m < n; m++) c.fillRect(x + m * mw * 2, y - h - 5 * s * k, mw, 5 * s * k);
    if (r > 0.75) { c.beginPath(); c.moveTo(x + w, y - h * 0.55); c.quadraticCurveTo(x + w + 26 * s * k, y - h * 0.8, x + w + 52 * s * k, y - h * 0.55); c.lineTo(x + w + 52 * s * k, y - h * 0.4); c.quadraticCurveTo(x + w + 26 * s * k, y - h * 0.64, x + w, y - h * 0.4); c.closePath(); c.fill(); }
    if (r > 0.6) { c.fillStyle = 'rgba(255,170,90,0.18)'; c.fillRect(x + w * 0.4, y - h * 0.7, Math.max(1.5, w * 0.18), 5 * s); c.fillStyle = col; }
  }
}
// The crypt: rows of burial niches, a few candles still burning
function drawCryptWall(c, a, s, t) {
  const g = c.createLinearGradient(0, a.y, 0, a.y + a.h); g.addColorStop(0, '#0d0909'); g.addColorStop(1, '#1b1311');
  c.fillStyle = g; c.fillRect(a.x, a.y, a.w, a.h);
  const par = 0.45, cw = 34, rh = 40, offx = G.cam.x * par, offy = G.cam.y * par;
  const i0 = Math.floor(offx / cw) - 1, i1 = Math.floor((offx + View.w) / cw) + 1, j0 = Math.floor(offy / rh) - 1, j1 = Math.floor((offy + View.h) / rh) + 1;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x = a.x + (i * cw - offx) * s, y = a.y + (j * rh - offy) * s, r = hash2(i, j * 3 + 1);
    c.fillStyle = '#160f0e'; c.fillRect(x, y + rh * 0.78 * s, cw * s, 3 * s);
    c.fillStyle = '#0b0707'; c.beginPath(); c.moveTo(x + 7 * s, y + 30 * s); c.lineTo(x + 7 * s, y + 16 * s); c.arc(x + 17 * s, y + 16 * s, 10 * s, Math.PI, 0); c.lineTo(x + 27 * s, y + 30 * s); c.closePath(); c.fill();
    if (r < 0.12) { c.fillStyle = '#3a322c'; c.beginPath(); c.ellipse(x + 17 * s, y + 25 * s, 4.5 * s, 4 * s, 0, 0, TAU); c.fill(); c.fillStyle = '#080505'; c.fillRect(x + 14.5 * s, y + 24 * s, 1.6 * s, 1.6 * s); c.fillRect(x + 18 * s, y + 24 * s, 1.6 * s, 1.6 * s); }
    else if (r > 0.94) {
      const fx = x + 17 * s, fy = y + 26 * s, fl = 1 + Math.sin(t * 11 + i * 3) * 0.15;
      c.fillStyle = '#d8cbb0'; c.fillRect(fx - 1.2 * s, fy - 4 * s, 2.4 * s, 5 * s);
      c.fillStyle = '#ffb347'; c.beginPath(); c.ellipse(fx, fy - 6.5 * s * fl, 1.6 * s, 3 * s * fl, 0, 0, TAU); c.fill();
      glow(c, fx, fy - 6 * s, 26 * s, 'rgba(255,160,70,0.18)');
    }
  }
  for (let k = Math.floor(G.cam.x * 0.6 / 260) - 1; k <= Math.floor((G.cam.x * 0.6 + View.w) / 260) + 1; k++) {
    const x = a.x + (k * 260 - G.cam.x * 0.6) * s; c.fillStyle = '#120c0b'; c.fillRect(x - 13 * s, a.y, 26 * s, a.h); c.fillStyle = '#1e1715'; c.fillRect(x - 13 * s, a.y, 3 * s, a.h);
  }
}

function drawDuskFoe(c, e, t) {
  const cx = e.x + e.w / 2, white = e.flash > 0, W = (col) => (white ? '#fff' : col);
  c.save(); c.translate(cx, e.y + e.h); c.scale(e.dir, 1);
  if (e.type === 'h') { // Barrow Hound: gaunt, ribs showing, amber eyes
    const crouch = e.mode === 'crouch', lunge = e.mode === 'lunge', run = !crouch && Math.abs(e.vx) > 10;
    const sy = crouch ? 0.8 : 1, stretch = lunge ? 1.25 : 1, leg = run ? Math.sin(e.t * 16) * 3 : 0;
    c.strokeStyle = W('#2a2427'); c.lineWidth = 2; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-7, -6 * sy); c.lineTo(-8 + leg, 0); c.moveTo(-3, -6 * sy); c.lineTo(-2 - leg, 0); c.moveTo(5, -6 * sy); c.lineTo(5 + leg, 0); c.moveTo(8, -6 * sy); c.lineTo(9 - leg, 0); c.stroke();
    c.fillStyle = W('#3a3436'); c.beginPath(); c.ellipse(0, -9 * sy, 10 * stretch, 4.6 * sy, lunge ? -0.12 : 0, 0, TAU); c.fill();
    c.strokeStyle = W('#6b6060'); c.lineWidth = 0.9; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-3 + i * 2.6, -12 * sy); c.lineTo(-4 + i * 2.6, -6.5 * sy); c.stroke(); }
    c.fillStyle = W('#3a3436'); c.beginPath(); c.moveTo(-9 * stretch, -10 * sy); c.lineTo(-15 * stretch, -12 * sy); c.lineTo(-10 * stretch, -8 * sy); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(11 * stretch, (crouch ? -8 : -12) * sy, 5, 3.6, 0.2, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(14 * stretch, -12 * sy); c.lineTo(19 * stretch, -10 * sy); c.lineTo(14 * stretch, -9 * sy); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(8 * stretch, -14 * sy); c.lineTo(7 * stretch, -19 * sy); c.lineTo(11 * stretch, -15 * sy); c.closePath(); c.fill();
    c.fillStyle = '#ffb347'; c.fillRect(12.5 * stretch, (crouch ? -9.5 : -13.5) * sy, 1.8, 1.4);
    c.restore();
    if (crouch) glow(c, cx + e.dir * 12, e.y + 4, 14, 'rgba(255,170,70,0.35)');
    return;
  }
  if (e.type === 'k') { // Oathbound Knight: tarnished plate, tower shield marked with a setting sun, a long spear
    const wind = e.mode === 'wind', thrust = e.mode === 'thrust', guardDown = !e.guard;
    const step = Math.abs(e.vx) > 5 ? Math.sin(e.t * 9) * 2 : 0;
    c.fillStyle = W('#3b332b'); c.fillRect(-5 + step, -8, 4, 8); c.fillRect(1 - step, -8, 4, 8);
    c.fillStyle = W('#6d5e46'); c.beginPath(); c.moveTo(-7, -9); c.lineTo(7, -9); c.lineTo(6, -22); c.lineTo(-6, -22); c.closePath(); c.fill();
    c.fillStyle = W('#4b2c35'); c.fillRect(-6, -12, 12, 4);
    c.fillStyle = W('#5e5240'); c.beginPath(); c.ellipse(0, -25, 5.4, 5.6, 0, 0, TAU); c.fill();
    c.fillStyle = '#120d0b'; c.fillRect(0, -26.5, 6, 1.8); c.fillStyle = wind || thrust ? '#ffcf7a' : 'rgba(255,207,122,0.45)'; c.fillRect(2, -26.3, 3, 1.2);
    // spear behind, drawn back in the wind-up, driven forward in the thrust
    const sx = wind ? -14 : thrust ? 6 : -4, len = 30;
    c.strokeStyle = W('#4a3826'); c.lineWidth = 1.6; c.beginPath(); c.moveTo(sx, -15); c.lineTo(sx + len, -15); c.stroke();
    c.fillStyle = W('#cfc8b8'); c.beginPath(); c.moveTo(sx + len, -17.5); c.lineTo(sx + len + 7, -15); c.lineTo(sx + len, -12.5); c.closePath(); c.fill();
    if (wind) { c.fillStyle = 'rgba(255,230,160,' + (0.5 + 0.5 * Math.sin(t * 30)) + ')'; c.fillRect(sx + len + 4, -16, 2, 2); }
    // the shield
    c.save(); c.translate(7, guardDown ? -6 : -10); if (guardDown) c.rotate(0.55);
    c.fillStyle = W('#4a3f32'); c.fillRect(-1, -14, 6, 26); c.strokeStyle = W('#a88a52'); c.lineWidth = 1; c.strokeRect(-1, -14, 6, 26);
    c.strokeStyle = W('#c9a45a'); c.beginPath(); c.arc(2, -1, 2.2, Math.PI, 0); c.moveTo(-0.5, -1); c.lineTo(4.5, -1); c.stroke();
    c.restore();
    c.restore();
    return;
  }
  // Ash Archer: a hooded skeleton with a longbow
  const draw = e.mode === 'draw' ? clamp(e.mt / 0.8, 0, 1) : 0;
  c.strokeStyle = W('#cfc4b0'); c.lineWidth = 1.6; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2, -9); c.lineTo(-3, 0); c.moveTo(2, -9); c.lineTo(3, 0); c.stroke();
  c.fillStyle = W('#4a3d3a'); c.beginPath(); c.moveTo(-6, -8); c.lineTo(6, -8); c.lineTo(4, -21); c.lineTo(-4, -21); c.closePath(); c.fill();
  for (let i = 0; i < 3; i++) { c.fillStyle = W('#3a302e'); c.fillRect(-6 + i * 4, -8, 3, 2 + (i % 2) * 2); }
  c.fillStyle = W('#4a3d3a'); c.beginPath(); c.arc(0, -22, 5.5, Math.PI * 0.9, Math.PI * 2.1); c.lineTo(3, -16); c.lineTo(-4, -16); c.closePath(); c.fill();
  c.fillStyle = W('#d9cfbf'); c.beginPath(); c.ellipse(1.5, -20.5, 3, 3.2, 0, 0, TAU); c.fill();
  c.fillStyle = '#120d0b'; c.fillRect(1.6, -21.5, 1.4, 1.4); c.fillRect(-0.4, -21.5, 1.2, 1.2);
  c.strokeStyle = W('#6b5236'); c.lineWidth = 1.5; c.beginPath(); c.arc(4, -14, 9, -1.2, 1.2); c.stroke();
  const by = Math.sin(1.2) * 9, bx = 4 + Math.cos(1.2) * 9, pull = draw * 6;
  c.strokeStyle = 'rgba(230,220,200,0.8)'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(bx, -14 - by); c.lineTo(bx - pull, -14); c.lineTo(bx, -14 + by); c.stroke();
  if (draw > 0) { c.strokeStyle = '#c8b48a'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx - pull, -14); c.lineTo(bx - pull + 16, -14); c.stroke(); }
  c.restore();
  if (draw > 0.8) glow(c, cx + e.dir * 14, e.y + e.h - 14, 12, 'rgba(255,220,150,0.5)');
}

function drawWarden(c, b) {
  const t = G.time, white = b.flash > 0, W = (col) => (white ? '#fff' : col), asleep = b.state === 'sleep';
  const cx = b.x + b.w / 2 + (b.state === 'dying' || b.state === 'enrage' ? (Math.random() - 0.5) * 2.5 : 0), fy = b.y + b.h;
  const lx = b.state === 'raise' ? 6 : b.state === 'slam' ? 40 : b.state === 'swingWind' ? -26 : b.state === 'swing' ? 46 : b.state === 'throw' ? 22 : 18 + Math.sin(t * 2) * 2;
  const ly = b.state === 'raise' ? -66 : b.state === 'slam' ? -8 : b.state === 'swing' ? -28 : b.state === 'swingWind' ? -32 : -14;
  c.save(); c.translate(cx, fy); c.scale(b.face, 1);
  if (b.state === 'dying') c.globalAlpha = clamp(1 - b.st / 1.8, 0.05, 1);
  // legs and a hunched body wrapped in chains
  c.fillStyle = W('#2b2625'); c.fillRect(-12, -14, 9, 14); c.fillRect(4, -14, 9, 14);
  c.fillStyle = W('#4b4544'); c.beginPath(); c.moveTo(-18, -12); c.quadraticCurveTo(-22, -40, -6, -48); c.quadraticCurveTo(14, -50, 18, -30); c.lineTo(16, -12); c.closePath(); c.fill();
  c.strokeStyle = W('#8a8277'); c.lineWidth = 1.6; c.beginPath(); c.moveTo(-17, -36); c.quadraticCurveTo(0, -24, 17, -32); c.moveTo(-18, -24); c.quadraticCurveTo(0, -14, 16, -22); c.stroke();
  // caged head
  c.fillStyle = W('#1a1514'); c.beginPath(); c.arc(8, -44, 8, 0, TAU); c.fill();
  c.strokeStyle = W('#6b645c'); c.lineWidth = 1.2; for (let i = -1; i <= 2; i++) { c.beginPath(); c.moveTo(3 + i * 3.5, -52); c.lineTo(3 + i * 3.5, -36); c.stroke(); }
  c.beginPath(); c.arc(8, -44, 8.5, Math.PI, 0); c.stroke();
  if (!asleep) { c.fillStyle = '#ffb347'; c.fillRect(8, -46, 2, 2); c.fillRect(11.5, -46, 2, 2); }
  // arm and chain to the lantern
  c.strokeStyle = W('#4b4544'); c.lineWidth = 5; c.lineCap = 'round'; c.beginPath(); c.moveTo(10, -32); c.lineTo(lx * 0.45 + 8, (ly - 30) * 0.5); c.stroke();
  c.strokeStyle = W('#8a8277'); c.lineWidth = 1.2; c.setLineDash([2, 2]); c.beginPath(); c.moveTo(lx * 0.45 + 8, (ly - 30) * 0.5); c.lineTo(lx, ly - 7); c.stroke(); c.setLineDash([]);
  c.fillStyle = W('#2a2321'); c.beginPath(); c.moveTo(lx - 7, ly - 8); c.lineTo(lx + 7, ly - 8); c.lineTo(lx + 5, ly + 8); c.lineTo(lx - 5, ly + 8); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,190,90,' + (0.35 + b.lamp * 0.6) + ')'; c.fillRect(lx - 4, ly - 5, 8, 10);
  c.restore();
  const gx = cx + lx * b.face, gy = fy + ly;
  glow(c, gx, gy, 30 + b.lamp * 50, 'rgba(255,160,60,' + (0.15 + b.lamp * 0.3) + ')');
  if (b.state === 'swing' && b.st < 0.16) drawSlash(c, cx + b.face * 30, b.y + 24, b.face > 0 ? 0 : Math.PI, 46, 1 - b.st / 0.16, true);
}

function drawVarhelm(c, b) {
  const t = G.time, white = b.flash > 0, W = (col) => (white ? '#fff' : col), kneel = b.state === 'sleep' || b.state === 'wake' && b.st < 1.0;
  const cx = b.x + b.w / 2 + (b.state === 'dying' ? (Math.random() - 0.5) * 2 : 0), fy = b.y + b.h;
  if (b.state === 'hang' || b.state === 'fall') { c.fillStyle = 'rgba(255,220,150,' + (0.12 + 0.08 * Math.sin(t * 30)) + ')'; c.fillRect(cx - 18, COURT.floor - 3, 36, 3); }
  glow(c, cx, b.y + 16, 70, b.phase === 2 ? 'rgba(255,190,110,0.22)' : 'rgba(255,170,90,0.12)');
  c.save(); c.translate(cx, fy); c.scale(b.face, 1);
  if (b.state === 'dying') c.globalAlpha = clamp(1 - b.st / 2.4, 0.05, 1);
  const kn = kneel ? 12 : 0;
  // legs
  c.fillStyle = W('#5a4626');
  if (kneel) { c.fillRect(-8, -12, 6, 12); c.fillRect(2, -6, 12, 6); }
  else { const st = b.state === 'stride' ? Math.sin(t * 9) * 2.5 : 0; c.fillRect(-7 + st, -18, 6, 18); c.fillRect(2 - st, -18, 6, 18); }
  // tabard and armour
  c.save(); c.translate(0, kn);
  c.fillStyle = W('#3d2240'); c.beginPath(); c.moveTo(-9, -18); c.lineTo(9, -18); c.lineTo(7, -6); c.lineTo(-7, -6); c.closePath(); c.fill();
  c.fillStyle = W('#b08d48'); c.beginPath(); c.moveTo(-10, -18); c.lineTo(10, -18); c.lineTo(9, -38); c.lineTo(-9, -38); c.closePath(); c.fill();
  c.fillStyle = W('#7a5f2c'); c.fillRect(-10, -38, 5, 20); c.fillStyle = W('#d9b968'); c.fillRect(-3, -36, 2, 16);
  c.fillStyle = W('#9a7a3c'); c.beginPath(); c.ellipse(-9, -36, 5, 4, 0, 0, TAU); c.ellipse(9, -36, 5, 4, 0, 0, TAU); c.fill();
  // helm with a broken crown
  c.fillStyle = W('#a07f40'); c.beginPath(); c.ellipse(0, -44, 6.5, 7, 0, 0, TAU); c.fill();
  c.fillStyle = '#160f0a'; c.fillRect(0, -45, 7, 2); c.fillStyle = b.phase === 2 ? '#fff0c4' : '#ffcf7a'; c.fillRect(2, -44.8, 4, 1.4);
  c.fillStyle = W('#d9b968'); c.beginPath(); c.moveTo(-6, -49); c.lineTo(-4, -56); c.lineTo(-2, -50); c.lineTo(0, -58); c.lineTo(2, -50); c.lineTo(3, -53); c.lineTo(6, -49); c.closePath(); c.fill();
  // the greatsword
  const S = b.state;
  let ang = 0.35, hx = 9, hy = -26;
  if (kneel) { ang = Math.PI / 2; hx = 14; hy = -30; }
  else if (S === 'lungeWind') { ang = Math.PI - 0.12; hx = -6; hy = -30; }
  else if (S === 'lunge') { ang = 0; hx = 10; hy = -28; }
  else if (S === 'cWind') { ang = -1.9; hx = 2; hy = -40; }
  else if (S === 'cSlash') { ang = lerp(-1.2, 0.9, clamp(b.st / 0.13, 0, 1)); hx = 8; hy = -32; }
  else if (S === 'leap' || S === 'hang' || S === 'fall') { ang = Math.PI / 2; hx = 6; hy = -18; }
  else if (S === 'raise' || S === 'enrage') { ang = -Math.PI / 2; hx = 4; hy = -42; }
  const len = 46, ex = hx + Math.cos(ang) * len, ey = hy + Math.sin(ang) * len;
  c.strokeStyle = W('#3a2a16'); c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(hx - Math.cos(ang) * 6, hy - Math.sin(ang) * 6); c.lineTo(hx, hy); c.stroke();
  c.strokeStyle = W('#c9a45a'); c.lineWidth = 2; c.beginPath(); c.moveTo(hx + Math.cos(ang + Math.PI / 2) * 5, hy + Math.sin(ang + Math.PI / 2) * 5); c.lineTo(hx - Math.cos(ang + Math.PI / 2) * 5, hy - Math.sin(ang + Math.PI / 2) * 5); c.stroke();
  c.strokeStyle = W('#efe2bf'); c.lineWidth = 3.2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
  c.strokeStyle = 'rgba(255,214,140,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(hx, hy); c.lineTo(ex, ey); c.stroke();
  c.restore();
  c.restore();
  if ((S === 'lungeWind' && b.glint) || S === 'hang') { const gx = cx + b.face * (S === 'hang' ? 6 : -40), gy = b.y + (S === 'hang' ? b.h + 20 : 20); glow(c, gx, gy, 18, 'rgba(255,240,200,0.8)'); }
  if (S === 'cSlash' && b.st < 0.13) drawSlash(c, cx + b.face * 22, b.y + 22, b.face > 0 ? 0 : Math.PI, 40, 1 - b.st / 0.13, true);
  if (S === 'lunge' && b.st < 0.2) drawSlash(c, cx + b.face * 26, b.y + 26, b.face > 0 ? 0 : Math.PI, 34, 1 - b.st / 0.2, true);
}

function drawDuskShot(c, s, t) {
  if (s.k === 'arrow') {
    const a = Math.atan2(s.vy, s.vx); c.save(); c.translate(s.x, s.y); c.rotate(a);
    c.strokeStyle = '#8a6a44'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-10, 0); c.lineTo(5, 0); c.stroke();
    c.fillStyle = '#d8d0c0'; c.beginPath(); c.moveTo(5, -2); c.lineTo(9, 0); c.lineTo(5, 2); c.closePath(); c.fill();
    c.fillStyle = '#c9a45a'; c.fillRect(-11, -2, 3, 1.2); c.fillRect(-11, 0.8, 3, 1.2);
    c.restore(); return;
  }
  if (s.k === 'fire') {
    if (s.burn > 0) {
      glow(c, s.x, s.floor - 6, 26, 'rgba(255,140,50,0.35)');
      for (let i = 0; i < 4; i++) { const fx = s.x - 10 + i * 7, h = 7 + 4 * Math.abs(Math.sin(t * 12 + i * 1.7 + s.x)); c.fillStyle = i % 2 ? '#ffab3d' : '#e8641b'; flamePath(c, fx, s.floor - h * 0.6, h * 0.6); c.fill(); }
    } else { glow(c, s.x, s.y, 18, 'rgba(255,150,60,0.45)'); c.fillStyle = '#e8641b'; flamePath(c, s.x, s.y, 6); c.fill(); c.fillStyle = '#fff0c4'; flamePath(c, s.x, s.y + 1, 2.6); c.fill(); }
    return;
  }
  if (s.k === 'blade') {
    if (s.warn > 0) { c.fillStyle = 'rgba(255,220,150,' + (0.1 + 0.12 * Math.abs(Math.sin(t * 16))) + ')'; c.fillRect(s.x + 3, s.y, 2, s.floor - s.y); }
    c.globalAlpha = 0.85; glow(c, s.x + 4, s.y + 13, 16, 'rgba(255,214,140,0.35)');
    c.fillStyle = '#fff0c4'; c.beginPath(); c.moveTo(s.x + 1.5, s.y + 6); c.lineTo(s.x + 6.5, s.y + 6); c.lineTo(s.x + 4, s.y + s.h); c.closePath(); c.fill();
    c.fillStyle = '#c9a45a'; c.fillRect(s.x - 1, s.y + 4, 10, 2); c.fillRect(s.x + 3, s.y, 2, 5);
    c.globalAlpha = 1;
  }
}
