// Loads the Android build of the page with every network request refused and a stand-in for the
// app's vibration bridge, then checks fonts, saving, back/pause handling and haptics.
const puppeteer = require('puppeteer-core'), path = require('path');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 915, height: 412, deviceScaleFactor: 2.6, hasTouch: true, isMobile: true });
  await page.setRequestInterception(true);
  const blocked = [];
  page.on('request', (r) => { if (r.url().startsWith('file:') || r.url().startsWith('data:')) r.continue(); else { blocked.push(r.url()); r.abort(); } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluateOnNewDocument(() => { window.__buzz = []; window.RimebellApp = { buzz: (ms) => window.__buzz.push(ms) }; });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'app', 'index.html'), { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 600));
  const out = await page.evaluate(async () => {
    const R = window.__rimebell, G = R.G, T = R.T, step = (n, b) => { R.Input.bot = b || {}; for (let i = 0; i < n; i++) R.advance(1 / 60); };
    await document.fonts.ready;
    const fonts = ['500 20px "Grenze Gotisch"', '400 16px "Alegreya Sans"', '700 16px "Alegreya Sans"'].map((f) => document.fonts.check(f));
    const fsHidden = getComputedStyle(document.getElementById('btn-full')).display === 'none';
    const vibShown = getComputedStyle(document.getElementById('btn-pvib')).display !== 'none';
    G.manual = true; document.getElementById('btn-new').click(); step(30);
    G.enemies = []; G.player.inv = 0; G.player.x = 20 * T + 8; G.player.y = 13 * T - 30; step(60);
    const afterHurt = window.__buzz.slice();
    R.back(); const paused = G.state; document.getElementById('btn-pvib').click(); const vibLabel = document.getElementById('btn-pvib').textContent; R.back();
    G.player.inv = 0; G.player.x = 20 * T + 8; G.player.y = 13 * T - 30; step(60);
    const afterOff = window.__buzz.length;
    R.sleep(); const saved = !!localStorage.getItem('rimebell.save.v1'); const settings = localStorage.getItem('rimebell.settings');
    return { fonts, fsHidden, vibShown, afterHurt, paused, vibLabel, afterOff, saved, settings, app: G.app };
  });
  await page.screenshot({ path: path.join(__dirname, 'app.png') });
  console.log(JSON.stringify(out), '\nblocked requests:', blocked.length ? blocked : 'none', '\n' + (errors.length ? 'ERRORS ' + errors.join('; ') : 'no page errors'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
