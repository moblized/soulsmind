// Draws the launcher icon (a gold bell with an ember for a clapper, rimed with frost, on a night sky)
// and writes every density Android needs into android/res. Run once after changing the art:
//   node android/tools/make-icons.js
// Needs Chrome and the game's dev dependencies (cd game && npm install).
const fs = require('fs'), path = require('path');
const puppeteer = require(path.join(__dirname, '..', '..', 'game', 'node_modules', 'puppeteer-core'));
const RES = path.join(__dirname, '..', 'res');
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

function art() {
  const TAU = Math.PI * 2;
  function bg(c, s) {
    const g = c.createLinearGradient(0, 0, 0, s); g.addColorStop(0, '#13244a'); g.addColorStop(0.6, '#0b1430'); g.addColorStop(1, '#060a16');
    c.fillStyle = g; c.fillRect(0, 0, s, s);
    const stars = [[0.18, 0.2], [0.3, 0.12], [0.76, 0.16], [0.86, 0.3], [0.12, 0.42], [0.64, 0.08], [0.9, 0.52]];
    c.fillStyle = 'rgba(225,238,248,0.7)'; for (const [x, y] of stars) c.fillRect(x * s, y * s, s * 0.008, s * 0.008);
    c.fillStyle = '#152a4a'; c.beginPath(); c.moveTo(0, s * 0.8);
    const pts = [[0.12, 0.7], [0.26, 0.76], [0.42, 0.64], [0.58, 0.74], [0.74, 0.66], [0.9, 0.75], [1, 0.71]];
    for (const [x, y] of pts) c.lineTo(x * s, y * s); c.lineTo(s, s); c.lineTo(0, s); c.closePath(); c.fill();
    c.fillStyle = 'rgba(220,235,242,0.55)'; c.beginPath(); c.moveTo(s * 0.36, s * 0.68); c.lineTo(s * 0.42, s * 0.64); c.lineTo(s * 0.48, s * 0.68); c.lineTo(s * 0.44, s * 0.67); c.closePath(); c.fill();
  }
  function bellPath(c, s) {
    const cx = s / 2, top = s * 0.3, lip = s * 0.6, hw = s * 0.205;
    c.beginPath();
    c.moveTo(cx - s * 0.06, top + s * 0.012);
    c.bezierCurveTo(cx - s * 0.12, top + s * 0.02, cx - s * 0.115, lip - s * 0.14, cx - hw + s * 0.03, lip - s * 0.04);
    c.quadraticCurveTo(cx - hw - s * 0.01, lip - s * 0.005, cx - hw, lip);
    c.lineTo(cx + hw, lip);
    c.quadraticCurveTo(cx + hw + s * 0.01, lip - s * 0.005, cx + hw - s * 0.03, lip - s * 0.04);
    c.bezierCurveTo(cx + s * 0.115, lip - s * 0.14, cx + s * 0.12, top + s * 0.02, cx + s * 0.06, top + s * 0.012);
    c.quadraticCurveTo(cx, top - s * 0.02, cx - s * 0.06, top + s * 0.012);
    c.closePath();
  }
  function flamePath(c, x, y, r) {
    c.beginPath(); c.moveTo(x, y - r);
    c.bezierCurveTo(x + r * 0.95, y - r * 0.1, x + r * 0.75, y + r * 0.8, x, y + r * 0.8);
    c.bezierCurveTo(x - r * 0.75, y + r * 0.8, x - r * 0.95, y - r * 0.1, x, y - r); c.closePath();
  }
  function fg(c, s, mono) {
    const cx = s / 2, lip = s * 0.6, hw = s * 0.205;
    if (mono) {
      c.fillStyle = '#fff'; bellPath(c, s); c.fill();
      c.lineWidth = s * 0.022; c.strokeStyle = '#fff'; c.beginPath(); c.arc(cx, s * 0.27, s * 0.04, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      flamePath(c, cx, s * 0.675, s * 0.06); c.fill();
      return;
    }
    const halo = c.createRadialGradient(cx, s * 0.52, s * 0.05, cx, s * 0.52, s * 0.36);
    halo.addColorStop(0, 'rgba(255,170,70,0.38)'); halo.addColorStop(1, 'rgba(255,170,70,0)'); c.fillStyle = halo; c.fillRect(0, 0, s, s);
    // crown loop
    c.lineWidth = s * 0.024; c.strokeStyle = '#a8812d'; c.beginPath(); c.arc(cx, s * 0.27, s * 0.042, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
    // body
    const g = c.createLinearGradient(cx - hw, 0, cx + hw, 0);
    g.addColorStop(0, '#8a6a22'); g.addColorStop(0.28, '#e9c766'); g.addColorStop(0.45, '#f6dd92'); g.addColorStop(0.75, '#c99f3f'); g.addColorStop(1, '#7c5d1c');
    c.fillStyle = g; bellPath(c, s); c.fill();
    // a band around the waist, and the dark mouth under the lip
    c.fillStyle = 'rgba(90,64,18,0.55)'; c.fillRect(cx - s * 0.135, s * 0.505, s * 0.27, s * 0.016);
    c.fillStyle = '#3a2a10'; c.beginPath(); c.ellipse(cx, lip, hw * 0.94, s * 0.022, 0, 0, Math.PI); c.fill();
    // frost along the lip, with icicles
    c.fillStyle = '#e6f6fb'; c.beginPath(); c.ellipse(cx, lip - s * 0.004, hw * 1.02, s * 0.016, 0, Math.PI, TAU); c.fill();
    c.fillStyle = '#bfeaf2';
    for (const [dx, len] of [[-0.15, 0.05], [-0.09, 0.034], [0.1, 0.044], [0.16, 0.03]]) {
      const x = cx + dx * s; c.beginPath(); c.moveTo(x - s * 0.012, lip + s * 0.004); c.lineTo(x + s * 0.012, lip + s * 0.004); c.lineTo(x, lip + len * s); c.closePath(); c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(cx - s * 0.06, s * 0.31, s * 0.04, s * 0.012, -0.25, 0, TAU); c.fill();
    // the ember clapper
    const eg = c.createRadialGradient(cx, s * 0.665, 0, cx, s * 0.665, s * 0.12); eg.addColorStop(0, 'rgba(255,190,90,0.7)'); eg.addColorStop(1, 'rgba(255,150,50,0)');
    c.fillStyle = eg; c.fillRect(cx - s * 0.13, s * 0.54, s * 0.26, s * 0.26);
    c.fillStyle = '#e8641b'; flamePath(c, cx, s * 0.672, s * 0.062); c.fill();
    c.fillStyle = '#ffab3d'; flamePath(c, cx, s * 0.684, s * 0.042); c.fill();
    c.fillStyle = '#fff0c4'; flamePath(c, cx, s * 0.694, s * 0.02); c.fill();
  }
  function make(kind, px) {
    const cv = document.createElement('canvas'); cv.width = cv.height = px; const c = cv.getContext('2d');
    if (kind === 'bg') bg(c, px);
    else if (kind === 'fg') fg(c, px, false);
    else if (kind === 'mono') fg(c, px, true);
    else { // legacy square icon: the middle 72 of the 108 grid, in a rounded square
      const s = px * 108 / 72, o = -(s - px) / 2, r = px * 0.2;
      c.beginPath(); c.moveTo(r, 0); c.arcTo(px, 0, px, px, r); c.arcTo(px, px, 0, px, r); c.arcTo(0, px, 0, 0, r); c.arcTo(0, 0, px, 0, r); c.closePath(); c.clip();
      c.translate(o, o); bg(c, s); fg(c, s, false);
    }
    return cv.toDataURL('image/png');
  }
  return make;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.evaluate('window.make = (' + art.toString() + ')()');
  const write = (dir, name, url) => { fs.mkdirSync(path.join(RES, dir), { recursive: true }); fs.writeFileSync(path.join(RES, dir, name), Buffer.from(url.split(',')[1], 'base64')); };
  for (const [d, k] of Object.entries(DENS)) {
    write('mipmap-' + d, 'ic_launcher.png', await page.evaluate((px) => window.make('legacy', px), Math.round(48 * k)));
    for (const kind of ['bg', 'fg', 'mono']) write('mipmap-' + d, 'ic_launcher_' + kind + '.png', await page.evaluate((kind, px) => window.make(kind, px), kind, Math.round(108 * k)));
  }
  fs.mkdirSync(path.join(RES, 'mipmap-anydpi-v26'), { recursive: true });
  fs.writeFileSync(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
    '    <background android:drawable="@mipmap/ic_launcher_bg" />\n    <foreground android:drawable="@mipmap/ic_launcher_fg" />\n' +
    '    <monochrome android:drawable="@mipmap/ic_launcher_mono" />\n</adaptive-icon>\n');
  // a preview sheet for checking the art by eye
  const sheet = await page.evaluate(() => {
    const W = 760, cv = document.createElement('canvas'); cv.width = W; cv.height = 260; const c = cv.getContext('2d'); c.fillStyle = '#2b2f36'; c.fillRect(0, 0, W, 260);
    const load = (u) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    return (async () => {
      const bg = await load(window.make('bg', 432)), fg = await load(window.make('fg', 432)), mono = await load(window.make('mono', 432)), leg = await load(window.make('legacy', 192));
      const shape = (x, y, d, clip) => { c.save(); c.beginPath(); clip(x, y, d); c.clip(); c.drawImage(bg, x - d * 0.25, y - d * 0.25, d * 1.5, d * 1.5); c.drawImage(fg, x - d * 0.25, y - d * 0.25, d * 1.5, d * 1.5); c.restore(); };
      shape(20, 30, 200, (x, y, d) => c.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2));
      shape(250, 30, 200, (x, y, d) => { const r = 60; c.moveTo(x + r, y); c.arcTo(x + d, y, x + d, y + d, r); c.arcTo(x + d, y + d, x, y + d, r); c.arcTo(x, y + d, x, y, r); c.arcTo(x, y, x + d, y, r); });
      c.fillStyle = '#d6e4ff'; c.beginPath(); c.arc(580, 130, 70, 0, Math.PI * 2); c.fill(); c.globalCompositeOperation = 'source-over';
      const m = document.createElement('canvas'); m.width = m.height = 210; const mc = m.getContext('2d'); mc.drawImage(mono, -52, -52, 315, 315); mc.globalCompositeOperation = 'source-in'; mc.fillStyle = '#23345e'; mc.fillRect(0, 0, 210, 210);
      c.drawImage(m, 475, 25); c.drawImage(leg, 680, 100, 64, 64);
      return cv.toDataURL('image/png');
    })();
  });
  fs.writeFileSync(path.join(__dirname, 'icon-preview.png'), Buffer.from(sheet.split(',')[1], 'base64'));
  await browser.close();
  console.log('icons written to', RES);
})().catch((e) => { console.error(e); process.exit(1); });
