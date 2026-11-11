// ===== drawing =====
const View = { w: 480, h: 270, scale: 1, dpr: 1, W: 0, H: 0, area: { x: 0, y: 0, w: 0, h: 0 }, portrait: false, touchUI: false, btn: {}, stickHome: { x: 0, y: 0 }, inL: 0, inR: 0 };
let canvas = null, ctx = null;
const PAL = {
  indoor: { edge: ['#2a3552', '#2e3a59', '#27314c'], inner: ['#151c30', '#171f35', '#131a2c'], side: '#42527a', under: '#0f1526', snow: '#dcebf2', shade: 'rgba(110,160,195,0.4)' },
  outdoor: { edge: ['#31405f', '#364667', '#2c3a57'], inner: ['#18213a', '#1b2540', '#161e35'], side: '#4c5f8a', under: '#111a2e', snow: '#eef6fa', shade: 'rgba(110,160,195,0.45)' },
  // Duskmarch: weathered sandstone under dry golden grass, and crypt stone the colour of old bone
  dusk: { edge: ['#4a3a3a', '#52403d', '#443535'], inner: ['#261c20', '#2a1f23', '#22191c'], side: '#6b5450', under: '#1a1316', snow: '#c9a45a', shade: 'rgba(120,70,40,0.5)', drip: '#3a2c22', dusk: true },
  crypt: { edge: ['#3a3230', '#3f3633', '#352d2b'], inner: ['#1a1514', '#1d1716', '#171211', '#1a1514'], side: '#5a4c46', under: '#110d0c', snow: '#6f6458', shade: 'rgba(0,0,0,0.35)', drip: '#2c2522', dusk: true },
};
const isOpen = (room) => room.kind === 'outdoor' || room.kind === 'dusk' || room.kind === 'star';
const snow = []; for (let i = 0; i < 90; i++) snow.push({ x: Math.random(), y: Math.random(), z: 0.4 + Math.random() * 0.6, ph: Math.random() * TAU });

function layout() {
  const W = Math.max(200, window.innerWidth || 800), H = Math.max(200, window.innerHeight || 450), V = View;
  V.W = W; V.H = H; V.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * V.dpr); canvas.height = Math.round(H * V.dpr);
  V.touchUI = Input.device === 'touch'; V.portrait = H > W * 1.05;
  // keep the HUD and thumbs clear of a camera hole or rounded corner (the app draws edge to edge)
  try { const cs = getComputedStyle($('safe')); V.inL = parseFloat(cs.paddingLeft) || 0; V.inR = parseFloat(cs.paddingRight) || 0; } catch (e) { V.inL = V.inR = 0; }
  const L = V.inL, R = V.inR;
  const a = V.area; a.x = 0; a.y = 0; a.w = W;
  a.h = V.portrait && V.touchUI ? Math.round(Math.min(H - 250, W * 1.2)) : H;
  V.scale = Math.min(a.w / (V.portrait ? 340 : 420), a.h / 240);
  V.w = a.w / V.scale; V.h = a.h / V.scale;
  const b = V.btn;
  if (V.portrait && V.touchUI) {
    const y0 = a.h, ch = H - a.h;
    b.jump = { x: W - 76, y: y0 + ch * 0.6, r: 44 }; b.attack = { x: W - 172, y: y0 + ch * 0.74, r: 40 }; b.dash = { x: W - 158, y: y0 + ch * 0.34, r: 34 }; b.heal = { x: W - 62, y: y0 + ch * 0.22, r: 30 };
    V.stickHome.x = 96; V.stickHome.y = y0 + ch * 0.55;
  } else {
    b.jump = { x: W - R - 84, y: H - 80, r: 42 }; b.attack = { x: W - R - 176, y: H - 58, r: 38 }; b.dash = { x: W - R - 64, y: H - 172, r: 33 }; b.heal = { x: W - R - 160, y: H - 148, r: 30 };
    V.stickHome.x = L + 100; V.stickHome.y = H - 92;
  }
  b.pause = { x: a.x + a.w - R - 30, y: a.y + 30, r: 20 };
  document.documentElement.style.setProperty('--area-h', a.h + 'px');
}

function noise1(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash2(i, seed), hash2(i + 1, seed), u); }
function ridge(c, a, par, base, amp, col, seed, freq) {
  const s = View.scale; c.fillStyle = col; c.beginPath(); c.moveTo(a.x, a.y + a.h);
  for (let sx = 0; sx <= a.w + 10; sx += 10) {
    const wx = (sx / s + G.cam.x * par) * freq;
    const n = (1 - Math.abs(2 * noise1(wx, seed) - 1)) * 0.7 + noise1(wx * 3.1, seed + 9) * 0.3;
    c.lineTo(a.x + sx, a.y + a.h * base - amp * s * n);
  }
  c.lineTo(a.x + a.w, a.y + a.h); c.closePath(); c.fill();
}
function drawBackground(c) {
  const a = View.area, s = View.scale, t = G.time;
  if (G.room.kind === 'dusk') { drawDuskSky(c, a, s, t); return; }
  if (G.room.kind === 'crypt') { drawCryptWall(c, a, s, t); return; }
  if (G.room.kind === 'star') { drawStarSky(c, a, s, t); return; }
  if (G.room.kind === 'vault') { drawVault(c, a, s, t); return; }
  if (G.room.kind === 'outdoor') {
    const g = c.createLinearGradient(0, a.y, 0, a.y + a.h); g.addColorStop(0, '#060a1c'); g.addColorStop(0.55, '#12264a'); g.addColorStop(1, '#2c5570');
    c.fillStyle = g; c.fillRect(a.x, a.y, a.w, a.h);
    c.fillStyle = '#dbe9f5';
    for (let i = 0; i < 46; i++) { c.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 0.7 + i * 1.7)); c.fillRect(a.x + hash2(i, 1) * a.w, a.y + hash2(i, 2) * a.h * 0.55, 1.4, 1.4); }
    c.globalAlpha = 1;
    const mx = a.x + a.w * 0.76 - G.cam.x * 0.015 * s, my = a.y + a.h * 0.22, mr = Math.min(a.h * 0.1, 44);
    const hg = c.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 3.2); hg.addColorStop(0, 'rgba(190,220,240,0.28)'); hg.addColorStop(1, 'rgba(190,220,240,0)');
    c.fillStyle = hg; c.fillRect(mx - mr * 3.2, my - mr * 3.2, mr * 6.4, mr * 6.4);
    c.fillStyle = '#e4eef5'; c.beginPath(); c.arc(mx, my, mr, 0, TAU); c.fill();
    c.fillStyle = 'rgba(150,175,200,0.35)'; c.beginPath(); c.arc(mx - mr * 0.3, my - mr * 0.15, mr * 0.22, 0, TAU); c.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.15, 0, TAU); c.fill();
    ridge(c, a, 0.05, 0.86, 120, '#27456a', 11, 0.004);
    ridge(c, a, 0.12, 0.96, 110, '#1b3252', 23, 0.006);
    ridge(c, a, 0.22, 1.08, 95, '#12233c', 37, 0.009);
  } else {
    const g = c.createLinearGradient(0, a.y, 0, a.y + a.h); g.addColorStop(0, '#080c17'); g.addColorStop(1, '#141c30');
    c.fillStyle = g; c.fillRect(a.x, a.y, a.w, a.h);
    const par = 0.45, sp = 190, off = G.cam.x * par, oy = -G.cam.y * 0.12 * s;
    const k0 = Math.floor(off / sp) - 1, k1 = Math.floor((off + View.w) / sp) + 1;
    for (let k = k0; k <= k1; k++) {
      const x = a.x + (k * sp - off) * s;
      // tall window with a shaft of moonlight
      const wx = x + sp * 0.5 * s, ww = 30 * s, wt = a.y + a.h * 0.16 + oy, wh = a.h * 0.44;
      c.fillStyle = 'rgba(120,170,215,0.035)'; c.beginPath(); c.moveTo(wx - ww / 2, wt + wh); c.lineTo(wx + ww / 2, wt + wh); c.lineTo(wx + ww / 2 + 120 * s, a.y + a.h); c.lineTo(wx - ww / 2 + 50 * s, a.y + a.h); c.closePath(); c.fill();
      const wg = c.createLinearGradient(0, wt, 0, wt + wh); wg.addColorStop(0, 'rgba(140,190,230,0.20)'); wg.addColorStop(1, 'rgba(90,130,180,0.07)');
      c.fillStyle = wg; c.beginPath(); c.moveTo(wx - ww / 2, wt + wh); c.lineTo(wx - ww / 2, wt + ww / 2); c.arc(wx, wt + ww / 2, ww / 2, Math.PI, 0); c.lineTo(wx + ww / 2, wt + wh); c.closePath(); c.fill();
      c.fillStyle = '#0c1220'; c.fillRect(wx - 1 * s, wt, 2 * s, wh);
      // column
      c.fillStyle = '#10172a'; c.fillRect(x - 15 * s, a.y, 30 * s, a.h);
      c.fillStyle = '#18223a'; c.fillRect(x - 15 * s, a.y, 3 * s, a.h);
      c.fillStyle = '#0d1322'; c.fillRect(x - 20 * s, a.y + a.h * 0.1 + oy, 40 * s, 7 * s);
      // a silent bell on a chain
      if (((k % 2) + 2) % 2 === 0) {
        const bx = x + sp * 0.25 * s, by = a.y + (26 + hash2(k, 5) * 34) * s + oy;
        c.strokeStyle = '#0c1221'; c.lineWidth = 1.2 * s; c.beginPath(); c.moveTo(bx, a.y); c.lineTo(bx, by); c.stroke();
        c.fillStyle = '#0c1221'; c.beginPath(); c.moveTo(bx - 4 * s, by); c.quadraticCurveTo(bx - 5 * s, by + 9 * s, bx - 9 * s, by + 13 * s); c.lineTo(bx + 9 * s, by + 13 * s); c.quadraticCurveTo(bx + 5 * s, by + 9 * s, bx + 4 * s, by); c.closePath(); c.fill();
      }
    }
  }
}

function drawTiles(c) {
  const room = G.room, pal = PAL[room.kind], V = View;
  const x0 = Math.max(0, Math.floor(G.cam.x / T) - 1), x1 = Math.min(room.w - 1, Math.floor((G.cam.x + V.w) / T) + 1);
  const y0 = Math.max(0, Math.floor(G.cam.y / T) - 1), y1 = Math.min(room.h - 1, Math.floor((G.cam.y + V.h) / T) + 1);
  const sol = (x, y) => (x < 0 || x >= room.w ? true : y < 0 ? !isOpen(room) : y >= room.h ? true : room.grid[y][x] === '#' || room.grid[y][x] === 'X');
  // rock beyond the room's edges
  c.fillStyle = pal.inner[1];
  c.fillRect(-2000, -2000, 2000, room.h * T + 4000); c.fillRect(room.w * T, -2000, 2000, room.h * T + 4000);
  if (!isOpen(room)) { c.fillRect(0, -2000, room.w * T, 2000); c.fillRect(0, room.h * T, room.w * T, 2000); }
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const ch = room.grid[ty][tx]; if (ch === '.') continue;
    const x = tx * T, y = ty * T, h = hash2(tx, ty);
    if (ch === '#') {
      const u = sol(tx, ty - 1), d = sol(tx, ty + 1), l = sol(tx - 1, ty), r = sol(tx + 1, ty), inner = u && d && l && r;
      c.fillStyle = (inner ? pal.inner : pal.edge)[(h * 3) | 0]; c.fillRect(x, y, T + 0.5, T + 0.5);
      if (inner) { if (h < 0.2) { c.fillStyle = 'rgba(255,255,255,0.035)'; c.fillRect(x + 3, y + 11, 17, 1.2); } continue; }
      if (!l) { c.fillStyle = pal.side; c.fillRect(x, y, 2, T); }
      if (!r) { c.fillStyle = pal.side; c.fillRect(x + T - 2, y, 2, T); }
      if (!d) {
        c.fillStyle = pal.under; c.fillRect(x, y + T - 3, T, 3);
        if (h > 0.45 && !pal.dusk && !pal.star) { const ix = x + 4 + h * 12, il = 4 + h * 9; c.fillStyle = '#9fd4e2'; c.beginPath(); c.moveTo(ix - 2.5, y + T); c.lineTo(ix + 2.5, y + T); c.lineTo(ix, y + T + il); c.closePath(); c.fill(); }
        else if (h > 0.5 && pal.dusk) { c.strokeStyle = pal.drip; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x + 6 + h * 10, y + T); c.quadraticCurveTo(x + 9 + h * 10, y + T + 6, x + 5 + h * 12, y + T + 6 + h * 8); c.stroke(); }
      }
      if (!u) {
        c.fillStyle = pal.snow; c.fillRect(x - 0.5, y - 1.5, T + 1, 5.5);
        c.beginPath(); c.ellipse(x + 5 + h * 14, y - 1, 6 + h * 4, 2.6, 0, Math.PI, 0); c.fill();
        c.fillStyle = pal.shade; c.fillRect(x, y + 4, T, 1.5);
      }
    } else if (ch === 'X') { // a sealed door: stone slab with a bell rune that has not woken yet
      c.fillStyle = '#1d2236'; c.fillRect(x, y, T + 0.5, T + 0.5); c.fillStyle = '#2a3150'; c.fillRect(x + 2, y + 2, T - 4, T - 4);
      if (tileAt(room, tx, ty + 1) === 'X') { c.strokeStyle = 'rgba(255,207,122,' + (0.35 + 0.2 * Math.sin(G.time * 2)) + ')'; c.lineWidth = 1.5; c.beginPath(); c.arc(x + T / 2, y + T, 7, 0, TAU); c.stroke(); }
    } else if (ch === '=' && pal.star) { // brass rails
      c.fillStyle = '#4a3f5e'; c.fillRect(x, y, T + 0.5, 5); c.fillStyle = '#c99f3f'; c.fillRect(x, y - 0.5, T + 0.5, 1.8);
      c.fillStyle = '#2a2440'; c.fillRect(x, y + 4.5, T + 0.5, 1.5); if (h > 0.6) { c.fillStyle = '#c99f3f'; c.fillRect(x + 10, y + 5, 2, 4); }
    } else if ((ch === '^' || ch === 'v') && pal.star) { // broken lenses
      for (let i = 0; i < 3; i++) {
        const bx = x + 2 + i * 7.5, len = 9 + hash2(tx * 3 + i, ty) * 9, base = ch === '^' ? y + T : y, tip = ch === '^' ? y + T - len : y + len;
        c.fillStyle = i === 1 ? 'rgba(232,225,255,0.9)' : 'rgba(170,160,235,0.8)'; c.beginPath(); c.moveTo(bx, base); c.lineTo(bx + 6, base); c.lineTo(bx + 2 + hash2(i, tx) * 3, tip); c.closePath(); c.fill();
      }
    } else if (ch === '=' && pal.dusk) {
      c.fillStyle = '#4a3a2c'; c.fillRect(x, y, T + 0.5, 6); c.fillStyle = '#2b2018'; c.fillRect(x, y + 5, T + 0.5, 1.5);
      c.fillStyle = '#a8894e'; c.fillRect(x, y - 0.5, T + 0.5, 1.6);
    } else if ((ch === '^' || ch === 'v') && pal.dusk) { // broken spears driven into the ground
      for (let i = 0; i < 3; i++) {
        const bx = x + 4 + i * 8, lean = (hash2(tx * 3 + i, ty) - 0.5) * 4, top = y + T - 14 - hash2(tx + i, ty * 5) * 8;
        c.strokeStyle = '#3b2c22'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, y + T); c.lineTo(bx + lean, top); c.stroke();
        c.fillStyle = '#b9b2a4'; c.beginPath(); c.moveTo(bx + lean - 2.5, top + 2); c.lineTo(bx + lean + 2.5, top + 2); c.lineTo(bx + lean, top - 6); c.closePath(); c.fill();
      }
    } else if (ch === '=') {
      c.fillStyle = '#3b2e2a'; c.fillRect(x, y, T + 0.5, 6); c.fillStyle = '#261d1b'; c.fillRect(x, y + 5, T + 0.5, 1.5);
      c.fillStyle = '#d3e7ef'; c.fillRect(x, y - 1, T + 0.5, 2.2);
      if (h > 0.5) { c.fillStyle = '#9fd4e2'; c.beginPath(); c.moveTo(x + 8, y + 6); c.lineTo(x + 12, y + 6); c.lineTo(x + 10, y + 11); c.closePath(); c.fill(); }
    } else if (ch === '^' || ch === 'v') {
      const up = ch === '^';
      for (let i = 0; i < 3; i++) {
        const bx = x + 1 + i * 7.5, len = 13 + hash2(tx * 3 + i, ty) * 7, base = up ? y + T : y, tip = up ? y + T - len : y + len;
        c.fillStyle = i === 1 ? '#c9f0f7' : '#8fcfe0'; c.beginPath(); c.moveTo(bx, base); c.lineTo(bx + 7, base); c.lineTo(bx + 3.5, tip); c.closePath(); c.fill();
      }
    } else if (ch === 'G') {
      const k = room.gateK || 0; if (k <= 0.01) continue;
      const top = tileAt(room, tx, ty - 1) !== 'G'; if (!top) continue;
      const hh = 2 * T * k; c.fillStyle = pal.dusk ? 'rgba(40,30,25,0.4)' : pal.star ? 'rgba(150,130,230,0.2)' : 'rgba(160,220,240,0.18)'; c.fillRect(x + 2, y, T - 4, hh);
      c.fillStyle = pal.dusk ? '#5a4c40' : pal.star ? '#b9a8ff' : '#a6dcea'; for (let i = 0; i < 3; i++) c.fillRect(x + 4 + i * 7, y, 3, hh);
      c.fillStyle = pal.dusk ? '#8a7356' : pal.star ? '#c99f3f' : '#6fb3c8'; c.fillRect(x + 2, y + hh - 4, T - 4, 3);
    } else if (room.def.exits[ch]) {
      const g = c.createLinearGradient(tx === 0 ? x + T : x, 0, tx === 0 ? x : x + T, 0);
      g.addColorStop(0, 'rgba(150,200,235,0)'); g.addColorStop(1, 'rgba(150,200,235,0.16)'); c.fillStyle = g; c.fillRect(x, y, T, T);
    }
  }
}

function flamePath(c, x, y, s) {
  c.beginPath(); c.moveTo(x, y - s);
  c.bezierCurveTo(x + s * 0.95, y - s * 0.1, x + s * 0.75, y + s * 0.8, x, y + s * 0.8);
  c.bezierCurveTo(x - s * 0.75, y + s * 0.8, x - s * 0.95, y - s * 0.1, x, y - s); c.closePath();
}
function glow(c, x, y, r, col) {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalCompositeOperation = 'source-over';
}

function drawProps(c) {
  const room = G.room, t = G.time;
  for (const s of room.signs) {
    c.fillStyle = '#3d4a69'; c.beginPath(); c.moveTo(s.x - 7, s.y); c.lineTo(s.x - 7, s.y - 14); c.quadraticCurveTo(s.x, s.y - 22, s.x + 7, s.y - 14); c.lineTo(s.x + 7, s.y); c.closePath(); c.fill();
    c.fillStyle = '#8fa3c7'; c.fillRect(s.x - 4, s.y - 13, 8, 1.2); c.fillRect(s.x - 4, s.y - 10, 6, 1.2); c.fillRect(s.x - 4, s.y - 7, 8, 1.2);
    c.fillStyle = '#dcebf2'; c.fillRect(s.x - 6, s.y - 18.5, 12, 2);
    if (G.nearSign === s) { c.fillStyle = '#ffd27a'; c.fillRect(s.x - 1, s.y - 30 + Math.sin(t * 5) * 1.5, 2, 5); c.fillRect(s.x - 1, s.y - 23 + Math.sin(t * 5) * 1.5, 2, 2); }
  }
  for (const b of room.braziers) {
    c.fillStyle = '#232b42'; c.fillRect(b.x - 2, b.y - 12, 4, 12); c.fillRect(b.x - 7, b.y - 2, 14, 2);
    c.fillStyle = '#39445f'; c.beginPath(); c.moveTo(b.x - 11, b.y - 19); c.lineTo(b.x + 11, b.y - 19); c.lineTo(b.x + 6, b.y - 11); c.lineTo(b.x - 6, b.y - 11); c.closePath(); c.fill();
    c.fillStyle = '#55627f'; c.fillRect(b.x - 12, b.y - 20.5, 24, 2.2);
    if (b.lit) {
      const f = 1 + Math.sin(t * 13 + b.x) * 0.12 + Math.sin(t * 7.3) * 0.08;
      c.fillStyle = '#e8641b'; flamePath(c, b.x + Math.sin(t * 9) * 0.8, b.y - 29, 10 * f); c.fill();
      c.fillStyle = '#ffab3d'; flamePath(c, b.x, b.y - 27, 7 * f); c.fill();
      c.fillStyle = '#fff0c4'; flamePath(c, b.x, b.y - 25, 3.6 * f); c.fill();
      glow(c, b.x, b.y - 26, 90, 'rgba(255,150,50,0.22)');
      if (Math.random() < 0.12) part(b.x + (Math.random() - 0.5) * 8, b.y - 30, (Math.random() - 0.5) * 12, -30 - Math.random() * 30, 0.9, 1.6, '#ffb347');
    } else { c.fillStyle = '#5d7fa8'; c.fillRect(b.x - 5, b.y - 22, 3, 1.5); c.fillRect(b.x + 1, b.y - 22.5, 3, 1.5); }
  }
  if (room.hoard) drawHoardHeap(c, room.hoard, t);
  for (const k of room.pickups) {
    const y = k.y + Math.sin(t * 2.4 + k.x) * 3;
    glow(c, k.x, y, 46, k.kind === 'H' || k.kind === 'E' ? 'rgba(255,160,60,0.32)' : k.kind === 'M' ? 'rgba(200,185,255,0.4)' : 'rgba(140,220,240,0.32)');
    c.save(); c.translate(k.x, y);
    if (k.kind === '1') { // three iron claws
      c.strokeStyle = '#1b2233'; c.lineWidth = 3; c.lineCap = 'round';
      for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 5, 7); c.quadraticCurveTo(i * 6 + 2, -3, i * 5 + 5, -8); c.stroke(); }
      c.strokeStyle = '#bfeaf2'; c.lineWidth = 1.1; for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(i * 5 + 3, -4); c.lineTo(i * 5 + 5, -8); c.stroke(); }
    } else if (k.kind === '2') { // a sash caught in the wind
      c.strokeStyle = '#3fb8b0'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-10, 2);
      c.bezierCurveTo(-4, -8 + Math.sin(t * 6) * 3, 3, 8 + Math.sin(t * 6 + 1) * 3, 11, -3 + Math.sin(t * 6 + 2) * 3); c.stroke();
      c.strokeStyle = '#e6fbf8'; c.lineWidth = 1; c.stroke();
    } else if (k.kind === 'E') { // equipment lying in the world: weapons and armour on a cloth, relics as small charms
      const it = ITEMS[k.item];
      if (it.slot === 'weapon') { c.rotate(-0.6 + Math.sin(t * 1.4) * 0.1); drawCarried(c, k.item, false, 1.2); }
      else if (it.slot === 'armor') { c.fillStyle = k.item === 'mail' ? '#8a7a5c' : k.item === 'shroud' ? '#5c5562' : k.item === 'robe' ? '#3b3a8a' : '#c4621a'; c.beginPath(); c.moveTo(-6, -8); c.lineTo(6, -8); c.lineTo(9, 8); c.lineTo(-9, 8); c.closePath(); c.fill(); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-6, -8, 12, 2); }
      else { c.fillStyle = k.item === 'purse' ? '#c99f3f' : '#9fd4e2'; c.beginPath(); c.arc(0, 0, 5, 0, TAU); c.fill(); c.strokeStyle = '#e2b64f'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, 0, 8, 0, TAU); c.stroke(); }
    } else if (k.kind === 'M') { drawMantlePickup(c, t);
    } else if (k.kind === 'K') { // a boss relic: a pale shard ringed in gold
      c.rotate(Math.sin(t * 1.5) * 0.2); c.strokeStyle = '#e2b64f'; c.lineWidth = 1.6; c.beginPath(); c.arc(0, 0, 10, 0, TAU); c.stroke();
      c.fillStyle = '#eafcff'; c.beginPath(); c.moveTo(0, -8); c.lineTo(4, 0); c.lineTo(0, 8); c.lineTo(-4, 0); c.closePath(); c.fill();
      c.fillStyle = '#8fd3e0'; c.beginPath(); c.moveTo(0, -8); c.lineTo(4, 0); c.lineTo(0, 0); c.closePath(); c.fill();
    } else { c.rotate(Math.PI / 4); c.fillStyle = '#ffab3d'; c.fillRect(-6, -6, 12, 12); c.fillStyle = '#fff0c4'; c.fillRect(-2.5, -2.5, 5, 5); }
    c.restore();
  }
  const echo = room.echo;
  if (echo) { // the chimes you dropped when you fell
    const y = echo.y - 16 + Math.sin(t * 2) * 2.5;
    glow(c, echo.x, y, 44, 'rgba(255,200,90,0.3)');
    c.globalAlpha = 0.7 + Math.sin(t * 4) * 0.15; c.fillStyle = '#ffd27a';
    c.beginPath(); c.moveTo(echo.x - 3, y - 9); c.quadraticCurveTo(echo.x - 4, y + 1, echo.x - 9, y + 7); c.lineTo(echo.x + 9, y + 7); c.quadraticCurveTo(echo.x + 4, y + 1, echo.x + 3, y - 9); c.closePath(); c.fill();
    c.globalAlpha = 1; c.font = '700 9px "Alegreya Sans", sans-serif'; c.textAlign = 'center'; c.fillStyle = '#fff0c4'; c.fillText(String(echo.n), echo.x, y - 14);
  }
  for (const d of G.drops) { c.fillStyle = '#e2b64f'; c.fillRect(d.x - 2, d.y - 2, 4, 4); c.fillStyle = '#fff6dc'; c.fillRect(d.x - 0.8, d.y - 0.8, 1.6, 1.6); }
  const bell = room.bell;
  if (bell && bell.drop > 0) {
    const by = bell.y - 400 * (1 - bell.drop) * (1 - bell.drop);
    c.fillStyle = '#2b2320'; c.fillRect(bell.x - 30, by - 64, 5, 64); c.fillRect(bell.x + 25, by - 64, 5, 64); c.fillRect(bell.x - 34, by - 68, 68, 6);
    c.fillStyle = '#dcebf2'; c.fillRect(bell.x - 34, by - 70, 68, 2.5);
    c.save(); c.translate(bell.x, by - 62); c.rotate(Math.sin(t * 9) * bell.swing * 0.35);
    c.fillStyle = '#c99f3f'; c.beginPath(); c.moveTo(-8, 2); c.quadraticCurveTo(-10, 26, -21, 44); c.lineTo(21, 44); c.quadraticCurveTo(10, 26, 8, 2); c.closePath(); c.fill();
    c.fillStyle = '#f0d27c'; c.beginPath(); c.moveTo(-5, 4); c.quadraticCurveTo(-7, 24, -14, 41); c.lineTo(-8, 41); c.quadraticCurveTo(-2, 24, -1, 4); c.closePath(); c.fill();
    c.fillStyle = '#8a6a22'; c.fillRect(-21, 42, 42, 3.5); c.beginPath(); c.arc(0, 49, 3.5, 0, TAU); c.fill();
    c.restore();
    if (bell.active) glow(c, bell.x, by - 36, 80, 'rgba(255,200,90,' + (0.12 + Math.sin(t * 3) * 0.04 + bell.swing * 0.2) + ')');
  }
}

// the weapon slung on the hero's back (or lying on the ground, scaled)
function drawCarried(c, id, glowBell, scale) {
  c.save(); if (scale) c.scale(scale, scale); c.lineCap = 'round';
  if (id === 'sickle') {
    c.strokeStyle = '#4a352b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -5); c.lineTo(-7, -18); c.stroke();
    c.strokeStyle = '#cfefff'; c.lineWidth = 2; c.beginPath(); c.arc(-11, -18, 5, -0.4, Math.PI * 0.75, true); c.stroke();
  } else if (id === 'censer') {
    c.strokeStyle = '#4a352b'; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, -5); c.lineTo(-6, -15); c.stroke();
    c.strokeStyle = '#8a8277'; c.lineWidth = 1; c.setLineDash([1.5, 1.5]); c.beginPath(); c.moveTo(-6, -15); c.lineTo(-9, -21); c.stroke(); c.setLineDash([]);
    c.fillStyle = '#b8913a'; c.beginPath(); c.arc(-9.5, -24, 3.8, 0, TAU); c.fill(); c.fillStyle = glowBell ? '#fff0b0' : '#ffab3d'; c.fillRect(-10.5, -24.5, 2, 1.5);
  } else if (id === 'spear') {
    c.strokeStyle = '#4a3826'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-2, -1); c.lineTo(-11, -32); c.stroke();
    c.fillStyle = '#d8d0c0'; c.beginPath(); c.moveTo(-13, -31); c.lineTo(-9.5, -32.5); c.lineTo(-12.5, -38); c.closePath(); c.fill();
  } else if (id === 'rod') {
    c.strokeStyle = '#c99f3f'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-3, -3); c.lineTo(-9, -27); c.stroke();
    c.strokeStyle = '#c99f3f'; c.lineWidth = 0.9; c.beginPath(); c.ellipse(-9.5, -29, 4, 1.6, -0.3, 0, TAU); c.stroke();
    c.fillStyle = glowBell ? '#fff6dc' : '#fff1c9'; c.beginPath(); c.arc(-9.5, -29, 1.8, 0, TAU); c.fill();
  } else if (id === 'greatsword') {
    c.strokeStyle = '#efe2bf'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(-3, -6); c.lineTo(-10, -34); c.stroke();
    c.strokeStyle = '#c9a45a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(-6.5, -9); c.lineTo(-1, -10.5); c.stroke();
    c.strokeStyle = '#3a2a16'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-3, -6); c.lineTo(-2, -2); c.stroke();
  } else {
    c.strokeStyle = '#4a352b'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-4, -4); c.lineTo(-8, -24); c.stroke();
    c.fillStyle = glowBell ? '#fff0b0' : '#e2b64f'; c.beginPath(); c.arc(-8.4, -25.5, 2.3, 0, TAU); c.fill();
  }
  c.restore();
}
function drawSlash(c, x, y, ang, r, k, peal, thin) {
  c.save(); c.translate(x, y); c.rotate(ang); c.globalAlpha = clamp(k, 0, 1) * 0.92; if (thin) c.scale(1, 0.55);
  c.fillStyle = peal ? '#ffe6a0' : '#eafcff';
  c.beginPath(); c.arc(0, 0, r, -1.15, 1.15); c.arc(-r * 0.38, 0, r * 0.98, 0.93, -0.93, true); c.closePath(); c.fill();
  c.restore();
}
function drawPlayer(c) {
  const p = G.player; if (!p || p.hidden || p.dead) return;
  const cx = p.x + p.w / 2, fy = p.y + p.h, f = p.sliding ? -p.wallDir : p.face, t = G.time;
  glow(c, cx, p.y + 8, 78, 'rgba(255,170,70,0.16)');
  if (p.inv > 0 && Math.floor(t * 18) % 2 === 0) c.globalAlpha = 0.4;
  const tr = p.trail;
  if (tr.length) { c.strokeStyle = '#3fb8b0'; c.lineWidth = 3; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(cx - f * 3, p.y + 9); for (let i = 0; i < tr.length; i++) c.lineTo(tr[i].x, tr[i].y); c.stroke(); }
  if (p.dashT > 0) { c.fillStyle = 'rgba(255,190,110,0.28)'; for (let i = 1; i <= 3; i++) c.fillRect(p.x - p.dashDir * i * 9, p.y + 3, p.w, p.h - 4); }
  c.save(); c.translate(cx, fy);
  const sx = p.dashT > 0 ? 1.25 : 1, sy = p.dashT > 0 ? 0.84 : p.landT > 0 ? 1 - p.landT * 1.4 : p.vy < -60 ? 1.07 : 1;
  c.scale(f * sx, sy); if (p.sliding) c.rotate(-0.12);
  const run = p.onGround && Math.abs(p.vx) > 20, air = !p.onGround, sw = run ? Math.sin(p.runPhase) * 3.6 : 0;
  c.strokeStyle = '#2a1c16'; c.lineWidth = 2.4; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-2.5, -6); c.lineTo(-2.5 + sw, air ? -2.5 : 0); c.moveTo(2.5, -6); c.lineTo(2.5 - sw, air ? -1 : 0); c.stroke();
  // staff on the back, with its small bell
  if (p.atkT <= 0) drawCarried(c, G.save ? G.save.equip.weapon : 'staff', p.res >= resMax());
  // bell-shaped coat
  c.fillStyle = '#f29a2e'; c.beginPath(); c.moveTo(-4, -15); c.quadraticCurveTo(-8.5, -9, -8.5, -4.5); c.lineTo(8.5, -4.5); c.quadraticCurveTo(8.5, -9, 4, -15); c.closePath(); c.fill();
  c.fillStyle = '#d97a1e'; c.beginPath(); c.moveTo(-4, -15); c.quadraticCurveTo(-8.5, -9, -8.5, -4.5); c.lineTo(-4.5, -4.5); c.quadraticCurveTo(-4, -10, -1, -15); c.closePath(); c.fill();
  c.fillStyle = '#ffe0a6'; c.fillRect(-8.5, -6, 17, 2);
  // hood, face
  c.fillStyle = '#c4621a'; c.beginPath(); c.arc(0, -17.5, 5.7, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-3.5, -21.5); c.lineTo(-9, -25); c.lineTo(-5, -18.5); c.closePath(); c.fill();
  c.fillStyle = '#ffe6c4'; c.beginPath(); c.ellipse(1.4, -17, 3.7, 3.5, 0, 0, TAU); c.fill();
  c.fillStyle = '#2a1c16'; c.fillRect(1.3, -18.2, 1.2, 2); c.fillRect(3.7, -18.2, 1.2, 2);
  c.restore(); c.globalAlpha = 1;
  if (p.gliding) drawGlide(c, p);
  if (p.atkT > 0) {
    const W = weapon(), k = p.atkT / (W.heavy ? 0.16 : 0.13), r = (p.atkPeal ? 40 : 27) * W.reach * (eq('spine') ? 1.3 : 1), cy = p.y + p.h / 2, warm = p.atkPeal || W.heavy;
    if (p.atkDir === 'up') drawSlash(c, cx, p.y - 2, -Math.PI / 2, r, k, warm);
    else if (p.atkDir === 'down') drawSlash(c, cx, fy, Math.PI / 2, r, k, warm);
    else drawSlash(c, cx + p.atkFace * 6, cy - 2, p.atkFace > 0 ? 0 : Math.PI, r, k, warm, W.long);
  }
  if (p.res >= resMax()) glow(c, cx, p.y + 4, 26 + Math.sin(t * 8) * 4, 'rgba(255,225,130,0.35)');
  if (p.healT > 0) glow(c, cx, p.y + 10, 30 + (1 - p.healT / PH.HEALT) * 26, 'rgba(255,170,70,0.4)');
}

function drawEnemies(c) {
  const t = G.time;
  for (const e of G.enemies) {
    if (FOES[e.type].hoard) { drawHoardling(c, e, t); continue; }
    if (FOES[e.type].dusk) { drawDuskFoe(c, e, t); continue; }
    if (FOES[e.type].star) { drawStarFoe(c, e, t); continue; }
    const cx = e.x + e.w / 2, white = e.flash > 0;
    if (e.type === 'r') {
      c.save(); c.translate(cx, e.y + e.h); c.scale(e.dir, 1);
      c.fillStyle = white ? '#fff' : '#7cc6d6';
      for (let i = 0; i < 4; i++) { const bx = -8 + i * 5; c.beginPath(); c.moveTo(bx - 3, -9); c.lineTo(bx + 3, -9); c.lineTo(bx - 1, -19 - (i % 2) * 3); c.closePath(); c.fill(); }
      c.fillStyle = white ? '#fff' : '#dfeef5'; c.beginPath(); c.ellipse(0, -7, 10.5, 7.5, 0, 0, TAU); c.fill();
      c.fillStyle = white ? '#fff' : '#b9d3e0'; c.beginPath(); c.ellipse(-2, -4.5, 8, 4, 0, 0, Math.PI); c.fill();
      c.fillStyle = '#1b2233'; c.fillRect(5, -9.5, 1.8, 2.4); c.fillRect(8, -9, 1.5, 2);
      const st = Math.sin(e.t * 12) * 1.5; c.fillRect(-6 + st, -1.5, 3, 1.5); c.fillRect(3 - st, -1.5, 3, 1.5);
      c.restore();
    } else if (e.type === 'w') {
      const cy = e.y + e.h / 2; glow(c, cx, cy, 30, 'rgba(150,220,245,0.28)');
      c.save(); c.translate(cx, cy); c.rotate(e.t * 1.4);
      c.strokeStyle = white ? '#fff' : '#bfeaf5'; c.lineWidth = 1.6; c.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6, r = 8 + Math.sin(e.t * 5 + i) * 1.2; c.beginPath(); c.moveTo(Math.cos(a) * 3, Math.sin(a) * 3); c.lineTo(Math.cos(a) * r, Math.sin(a) * r); c.stroke(); }
      c.fillStyle = '#f4fcff'; c.beginPath(); c.arc(0, 0, 3.6, 0, TAU); c.fill();
      c.restore();
    } else {
      const sway = Math.sin(e.t * 2.3) * 1.5, casting = e.cast > 0;
      c.save(); c.translate(cx, e.y); c.globalAlpha = 0.86;
      const g = c.createLinearGradient(0, 0, 0, e.h + 6); g.addColorStop(0, white ? '#fff' : '#8ea3d6'); g.addColorStop(1, white ? '#fff' : 'rgba(170,215,240,0.25)');
      c.fillStyle = g; c.beginPath(); c.moveTo(-5, 4); c.quadraticCurveTo(-12, 16, -10 + sway, e.h + 2);
      for (let i = 0; i <= 4; i++) c.lineTo(-10 + i * 5 + sway * (1 - i / 4), e.h + 2 + (i % 2 ? 5 : 0));
      c.quadraticCurveTo(12, 16, 5, 4); c.closePath(); c.fill();
      c.fillStyle = white ? '#fff' : '#5c6fa8'; c.beginPath(); c.arc(0, 4, 6.5, 0, TAU); c.fill();
      c.fillStyle = '#0a0e1a'; c.beginPath(); c.ellipse(e.dir * 1.2, 5, 4, 4.2, 0, 0, TAU); c.fill();
      c.fillStyle = '#cfefff'; c.fillRect(e.dir * 1.2 - 2.5, 4.3, 1.4, 1.4); c.fillRect(e.dir * 1.2 + 1.1, 4.3, 1.4, 1.4);
      c.globalAlpha = 1;
      if (casting) { const k = 1 - e.cast / 0.6; c.fillStyle = '#e9fbff'; c.beginPath(); c.arc(e.dir * 9, 12, 1.5 + k * 3.5, 0, TAU); c.fill(); }
      c.restore();
      if (casting) glow(c, cx + e.dir * 9, e.y + 12, 22, 'rgba(160,230,250,0.4)');
    }
  }
}

function drawMatriarch(c, b) {
  const t = G.time, white = b.flash > 0, asleep = b.state === 'sleep';
  const cx = b.x + b.w / 2 + (b.state === 'dazed' || b.state === 'dying' || b.state === 'wake' ? (Math.random() - 0.5) * 2.5 : 0);
  if (b.state === 'rear') { c.fillStyle = 'rgba(190,240,255,' + (0.1 + 0.08 * Math.sin(t * 30)) + ')'; c.fillRect(PIT.x0, PIT.floor - 26, PIT.x1 - PIT.x0, 26); }
  const angry = !asleep && (b.state === 'rear' || b.state === 'charge' || b.phase === 2);
  c.save(); c.translate(cx, b.y + b.h); c.scale(b.face, asleep ? 0.78 : 1);
  if (b.state === 'dying') c.globalAlpha = clamp(1 - b.st / 1.6, 0.05, 1);
  if (b.state === 'rear') c.rotate(-0.16); else if (b.state === 'charge') c.rotate(0.08);
  c.fillStyle = white ? '#fff' : '#7cc6d6';
  for (let i = 0; i < 7; i++) { const bx = -20 + i * 6.2, len = 16 + (i % 2) * 7 + (i === 3 ? 5 : 0); c.beginPath(); c.moveTo(bx - 4, -22); c.lineTo(bx + 4, -22); c.lineTo(bx - 2, -22 - len); c.closePath(); c.fill(); }
  c.fillStyle = white ? '#fff' : '#dfeef5'; c.beginPath(); c.ellipse(-2, -16, 23, 15, 0, 0, TAU); c.fill();
  c.fillStyle = white ? '#fff' : '#b9d3e0'; c.beginPath(); c.ellipse(-4, -9, 19, 8, 0, 0, Math.PI); c.fill();
  c.fillStyle = white ? '#fff' : '#cfe2ec'; c.beginPath(); c.ellipse(15, -13, 10, 10, 0, 0, TAU); c.fill();
  c.fillStyle = '#9fd4e2'; c.beginPath(); c.moveTo(19, -8); c.lineTo(27, -6); c.lineTo(20, -3.5); c.closePath(); c.fill();
  if (asleep) { c.fillStyle = '#1b2233'; c.fillRect(15, -14, 5.5, 1.4); }
  else { c.fillStyle = angry ? '#bff4ff' : '#1b2233'; c.fillRect(15, -17, 2.4, 3.4); c.fillRect(20, -16.5, 2, 3); }
  const st = b.state === 'stalk' || b.state === 'charge' ? Math.sin(t * (b.state === 'charge' ? 30 : 12)) * 2.5 : 0;
  c.fillStyle = '#1b2233'; c.fillRect(-16 + st, -2.5, 6, 2.5); c.fillRect(-4 - st, -2.5, 6, 2.5); c.fillRect(8 + st, -2.5, 6, 2.5);
  c.restore();
  if (angry) glow(c, cx + b.face * 17, b.y + 15, 20, 'rgba(160,230,250,0.35)');
  if (asleep && Math.random() < 0.03) part(cx + b.face * 16, b.y + 6, 5, -14, 1.4, 1.6, '#dfeef5');
}
function drawBoss(c) {
  const b = G.boss; if (!b) return;
  if (b.kind === 'matriarch') { drawMatriarch(c, b); return; }
  if (b.kind === 'warden') { drawWarden(c, b); return; }
  if (b.kind === 'varhelm') { drawVarhelm(c, b); return; }
  if (b.kind === 'moth') { drawNightMoth(c, b); return; }
  if (b.kind === 'orren') { drawOrren(c, b); return; }
  const t = G.time, A = ARENA, white = b.flash > 0;
  const jitter = b.state === 'slamHold' || b.state === 'dying' || b.state === 'enrage' ? (Math.random() - 0.5) * 3 : 0;
  const cx = b.x + b.w / 2 + jitter;
  if (b.state === 'slam' || b.state === 'slamHold') { c.fillStyle = 'rgba(190,240,255,' + (0.12 + 0.1 * Math.sin(t * 30)) + ')'; c.fillRect(cx - 22, A.floor - 3, 44, 3); }
  if (b.state === 'sweepWarn') { c.fillStyle = 'rgba(190,240,255,' + (0.1 + 0.08 * Math.sin(t * 30)) + ')'; c.fillRect(A.x0, b.y + 6, A.x1 - A.x0, b.h - 12); }
  glow(c, cx, b.y + 30, 110, b.phase === 2 ? 'rgba(150,230,255,0.2)' : 'rgba(120,150,230,0.14)');
  c.save(); c.translate(cx, b.y);
  if (b.state === 'dying') c.globalAlpha = clamp(1 - b.st / 2.3, 0.05, 1);
  const sway = Math.sin(t * 2.2) * 2 - clamp(b.vx / 60, -5, 5);
  const robe = c.createLinearGradient(0, 0, 0, b.h + 10); robe.addColorStop(0, white ? '#fff' : '#3a4480'); robe.addColorStop(1, white ? '#fff' : 'rgba(150,195,235,0.5)');
  c.fillStyle = robe; c.beginPath(); c.moveTo(-10, 8); c.quadraticCurveTo(-28, 32, -24 + sway, b.h + 2);
  for (let i = 0; i <= 6; i++) c.lineTo(-24 + i * 8 + sway * (1 - i / 6), b.h + 2 + (i % 2 ? 7 : 0) + Math.sin(t * 5 + i) * 1.5);
  c.quadraticCurveTo(28, 32, 10, 8); c.closePath(); c.fill();
  // sleeves
  const lift = b.state === 'volley' || b.state === 'rain' || b.state === 'enrage' ? -12 : b.state === 'slam' || b.state === 'slamHold' ? -18 : 0;
  c.fillStyle = white ? '#fff' : '#2e376b';
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * 9, 14); c.quadraticCurveTo(s * 24, 18 + lift * 0.4, s * 27, 34 + lift); c.lineTo(s * 17, 38 + lift); c.quadraticCurveTo(s * 14, 26, s * 7, 24); c.closePath(); c.fill(); }
  // tall hood with a gold seam
  c.fillStyle = white ? '#fff' : '#242b55'; c.beginPath(); c.moveTo(-11.5, 14); c.quadraticCurveTo(-14, -4, 0, -22); c.quadraticCurveTo(14, -4, 11.5, 14); c.closePath(); c.fill();
  c.strokeStyle = '#d9b45a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, -20); c.lineTo(0, -3); c.stroke();
  c.fillStyle = '#070a14'; c.beginPath(); c.ellipse(b.face * 1.5, 6, 7.5, 6.5, 0, 0, TAU); c.fill();
  c.fillStyle = b.phase === 2 ? '#d8fbff' : '#8fd3e0'; c.fillRect(b.face * 1.5 - 5, 5, 10, 1.7);
  // the swallowed bell, cracked
  c.save(); c.translate(0, 26); c.rotate(clamp(-b.vx / 500, -0.5, 0.5) + Math.sin(t * 3) * 0.06);
  c.fillStyle = white ? '#fff' : '#c99f3f'; c.beginPath(); c.moveTo(-4, 0); c.quadraticCurveTo(-5, 11, -11, 19); c.lineTo(11, 19); c.quadraticCurveTo(5, 11, 4, 0); c.closePath(); c.fill();
  c.strokeStyle = '#3a2a10'; c.lineWidth = 1.1; c.beginPath(); c.moveTo(1, 3); c.lineTo(-2, 9); c.lineTo(2, 13); c.lineTo(0, 19); c.stroke();
  c.restore();
  c.restore();
}

function drawShots(c) {
  const t = G.time;
  for (const s of G.shots) {
    if (s.k === 'orb') { glow(c, s.x, s.y, 20, 'rgba(160,230,250,0.4)'); c.fillStyle = '#eafcff'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); c.fillStyle = '#8fd3e0'; c.beginPath(); c.arc(s.x, s.y, s.r * 0.5, 0, TAU); c.fill(); }
    else if (s.k === 'wave') {
      const dk = G.room.level === 2;
      for (let i = 0; i < 3; i++) { const bx = s.x + i * 5, h = s.h * (0.6 + 0.4 * Math.abs(Math.sin(t * 20 + i * 2))); c.fillStyle = dk ? (i === 1 ? '#ffe6a0' : '#c98a4a') : i === 1 ? '#eafcff' : '#9fd8e6'; c.beginPath(); c.moveTo(bx - 1, s.y + s.h); c.lineTo(bx + 7, s.y + s.h); c.lineTo(bx + 3 + s.dir * 3, s.y + s.h - h); c.closePath(); c.fill(); }
    } else if (STAR_SHOTS[s.k]) drawStarShot(c, s, t);
    else if (s.k !== 'ice') drawDuskShot(c, s, t);
    else {
      if (s.warn > 0) { c.fillStyle = 'rgba(190,240,255,' + (0.1 + 0.12 * Math.abs(Math.sin(t * 16))) + ')'; c.fillRect(s.x + 3, s.y, 2, s.floor - s.y); }
      const wob = s.warn > 0 ? Math.sin(t * 40) * 1 : 0;
      c.fillStyle = '#c9f0f7'; c.beginPath(); c.moveTo(s.x + wob, s.y); c.lineTo(s.x + s.w + wob, s.y); c.lineTo(s.x + s.w / 2 + wob, s.y + s.h); c.closePath(); c.fill();
    }
  }
}

function drawParticles(c) {
  for (const p of G.parts) {
    const k = p.life / p.max;
    if (p.kind === 2) { c.globalAlpha = k * 0.8; c.strokeStyle = p.color; c.lineWidth = 2.5 * k + 0.5; c.beginPath(); c.arc(p.x, p.y, p.vx * (1 - k) + 4, 0, TAU); c.stroke(); }
    else { c.globalAlpha = Math.min(1, k * 1.6); c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  }
  c.globalAlpha = 1;
}

function drawSnow(c, dt) {
  const a = View.area, out = isOpen(G.room), lv3 = G.room.kind === 'star' || G.room.kind === 'vault', dusk = G.room.kind === 'dusk' || G.room.kind === 'crypt' || lv3;
  const n = out ? (dusk ? 60 : snow.length) : 34, wind = out ? (dusk ? (lv3 ? 14 : 30) : 60) : 10;
  c.fillStyle = lv3 ? (out ? '#e6e2ff' : '#a99fe0') : dusk ? (out ? '#ffcf7a' : '#bfae94') : '#eaf4f9';
  for (let i = 0; i < n; i++) {
    const s = snow[i]; s.ph += dt * 1.3;
    s.x += ((-wind * s.z + Math.sin(s.ph) * 8) * dt) / a.w; s.y += ((dusk ? (out ? 10 : 6) : out ? 46 : 16) * s.z * dt) / a.h;
    if (s.x < -0.02) s.x += 1.04; if (s.y > 1.02) { s.y -= 1.04; s.x = Math.random(); }
    const px = a.x + (((s.x * a.w - G.cam.x * View.scale * 0.3 * s.z) % a.w) + a.w) % a.w, py = a.y + (((s.y * a.h - G.cam.y * View.scale * 0.3 * s.z) % a.h) + a.h) % a.h;
    c.globalAlpha = (dusk ? 0.45 + 0.3 * Math.sin(s.ph * 2) : out ? 0.75 : 0.4) * s.z; const z = s.z * (dusk ? 1.6 : 2.1); c.fillRect(px, py, z, z);
  }
  c.globalAlpha = 1;
}

function drawHUD(c) {
  const a = View.area, p = G.player, t = G.time; if (!p || G.state === 'title') return;
  const x0 = a.x + 18 + View.inL, y0 = a.y + 22;
  const gap = p.maxHp > 10 ? Math.max(12, Math.floor(210 / p.maxHp)) : 21;
  for (let i = 0; i < p.maxHp; i++) {
    const x = x0 + i * gap;
    if (i < p.hp) { c.fillStyle = '#e8641b'; flamePath(c, x, y0, 9); c.fill(); c.fillStyle = '#ffb347'; flamePath(c, x, y0 + 1.5, 6); c.fill(); c.fillStyle = '#fff0c4'; flamePath(c, x, y0 + 3, 2.8); c.fill(); }
    else { c.strokeStyle = 'rgba(200,222,236,0.4)'; c.lineWidth = 1.4; flamePath(c, x, y0, 8); c.stroke(); }
  }
  const rm = resMax(), full = p.res >= rm, ry = y0 + 19;
  for (let i = 0; i < rm; i++) { c.fillStyle = i < p.res ? (full ? (Math.sin(t * 10) > 0 ? '#fff0b0' : '#e2b64f') : '#e2b64f') : 'rgba(220,235,245,0.2)'; c.fillRect(x0 - 8 + i * 10, ry, 7, 3.5); }
  // ember flask and chimes
  const fx = x0 + p.maxHp * gap + 6, mf = maxFlask();
  for (let i = 0; i < mf; i++) {
    const x = fx + i * 13; c.strokeStyle = 'rgba(230,241,246,0.75)'; c.lineWidth = 1.3;
    c.beginPath(); c.moveTo(x + 2.5, y0 - 8); c.lineTo(x + 2.5, y0 - 4); c.lineTo(x, y0 - 1); c.lineTo(x, y0 + 7); c.lineTo(x + 8, y0 + 7); c.lineTo(x + 8, y0 - 1); c.lineTo(x + 5.5, y0 - 4); c.lineTo(x + 5.5, y0 - 8); c.closePath();
    if (i < p.flask) { c.fillStyle = '#ffab3d'; c.fill(); } c.stroke();
  }
  c.fillStyle = '#e2b64f'; c.beginPath(); c.moveTo(x0 - 5, ry + 13); c.quadraticCurveTo(x0 - 5.5, ry + 18, x0 - 9, ry + 22); c.lineTo(x0 + 1, ry + 22); c.quadraticCurveTo(x0 - 2.5, ry + 18, x0 - 3, ry + 13); c.closePath(); c.fill();
  c.font = '700 14px "Alegreya Sans", "Gill Sans", sans-serif'; c.textAlign = 'left'; c.fillStyle = '#f3e3b4'; c.fillText(String(G.save.chimes), x0 + 6, ry + 23);
  const b = G.boss;
  if (b && bossAwake(b) && b.state !== 'intro') {
    const w = Math.min(a.w * 0.5, 340), x = a.x + (a.w - w) / 2, y = a.y + a.h - 24;
    c.font = '500 17px "Grenze Gotisch", "Palatino Linotype", serif'; c.textAlign = 'center'; c.fillStyle = '#dcebf2'; c.fillText(b.name, a.x + a.w / 2, y - 8);
    const dk = G.room.level === 2, st = G.room.level === 3;
    c.fillStyle = 'rgba(8,12,22,0.7)'; c.fillRect(x - 2, y - 2, w + 4, 9); c.fillStyle = dk ? '#4a2a2a' : st ? '#2c2652' : '#3a4480'; c.fillRect(x, y, w, 5);
    c.fillStyle = dk ? (b.phase === 2 ? '#ffe6a0' : '#d9a54a') : st ? (b.phase === 2 ? '#fff1c9' : '#b9a8ff') : b.phase === 2 ? '#bff4ff' : '#8fd3e0'; c.fillRect(x, y, w * clamp(b.hp / b.maxHp, 0, 1), 5);
    c.fillStyle = 'rgba(8,12,22,0.8)'; c.fillRect(x + w / 2 - 1, y - 2, 2, 9);
  }
}

function drawTouchUI(c) {
  const V = View; if (!V.touchUI) return;
  const st = G.state, a = V.area;
  if (V.portrait) { const g = c.createLinearGradient(0, a.h, 0, V.H); g.addColorStop(0, '#0d1322'); g.addColorStop(1, '#070a12'); c.fillStyle = g; c.fillRect(0, a.h, V.W, V.H - a.h); c.fillStyle = '#26314d'; c.fillRect(0, a.h, V.W, 1.5); }
  if (st !== 'play' && st !== 'hazard' && st !== 'trans' && st !== 'dead') return;
  const b = V.btn, I = Input.touch, hasDash = G.save && G.save.abilities.dash;
  const draw = (n, label, on) => {
    const o = b[n]; c.fillStyle = on ? 'rgba(255,171,61,0.4)' : 'rgba(18,26,46,0.5)'; c.beginPath(); c.arc(o.x, o.y, o.r, 0, TAU); c.fill();
    c.strokeStyle = on ? '#ffd27a' : 'rgba(205,228,240,0.55)'; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = on ? '#fff6dc' : 'rgba(230,241,246,0.85)'; c.font = '700 ' + (o.r > 36 ? 12 : 11) + 'px "Alegreya Sans", "Gill Sans", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, o.x, o.y + 1); c.textBaseline = 'alphabetic';
  };
  draw('jump', 'JUMP', I.jump); draw('attack', 'STRIKE', I.attack); if (hasDash) draw('dash', 'DASH', I.dash);
  draw('heal', 'FLASK ' + G.player.flask, I.heal || G.player.healT > 0);
  const pz = b.pause; c.fillStyle = 'rgba(18,26,46,0.5)'; c.beginPath(); c.arc(pz.x, pz.y, 16, 0, TAU); c.fill(); c.fillStyle = 'rgba(230,241,246,0.85)'; c.fillRect(pz.x - 5, pz.y - 6, 3.5, 12); c.fillRect(pz.x + 1.5, pz.y - 6, 3.5, 12);
  const S = Stick, ox = S.id >= 0 ? S.ox : V.stickHome.x, oy = S.id >= 0 ? S.oy : V.stickHome.y;
  c.strokeStyle = 'rgba(205,228,240,' + (S.id >= 0 ? 0.5 : 0.28) + ')'; c.lineWidth = 1.6; c.beginPath(); c.arc(ox, oy, 46, 0, TAU); c.stroke();
  c.fillStyle = 'rgba(230,241,246,' + (S.id >= 0 ? 0.55 : 0.22) + ')'; c.beginPath(); c.arc(S.id >= 0 ? S.x : ox, S.id >= 0 ? S.y : oy, 19, 0, TAU); c.fill();
}

function render(dt) {
  const c = ctx, V = View, d = V.dpr, a = V.area; if (!G.room) return;
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#070a12'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.save(); c.setTransform(d, 0, 0, d, 0, 0); c.beginPath(); c.rect(a.x, a.y, a.w, a.h); c.clip();
  drawBackground(c);
  const sh = G.reduceMotion ? 0 : G.shake, shx = (Math.random() - 0.5) * sh, shy = (Math.random() - 0.5) * sh, s = V.scale;
  c.setTransform(s * d, 0, 0, s * d, (a.x - (G.cam.x + shx) * s) * d, (a.y - (G.cam.y + shy) * s) * d);
  drawTiles(c); drawProps(c); drawEnemies(c); drawBoss(c); drawPlayer(c); drawShots(c); drawBolts(c); drawParticles(c);
  c.setTransform(d, 0, 0, d, 0, 0);
  drawSnow(c, dt);
  const vg = c.createRadialGradient(a.x + a.w / 2, a.y + a.h / 2, Math.min(a.w, a.h) * 0.45, a.x + a.w / 2, a.y + a.h / 2, Math.max(a.w, a.h) * 0.8);
  vg.addColorStop(0, 'rgba(4,6,12,0)'); vg.addColorStop(1, 'rgba(4,6,12,0.62)'); c.fillStyle = vg; c.fillRect(a.x, a.y, a.w, a.h);
  drawHUD(c);
  if (G.fadeA > 0) { c.fillStyle = 'rgba(5,7,13,' + clamp(G.fadeA, 0, 1) + ')'; c.fillRect(a.x, a.y, a.w, a.h); }
  c.restore();
  c.setTransform(d, 0, 0, d, 0, 0);
  drawTouchUI(c);
}
