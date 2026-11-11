// Usage: node test/shot.js <name> <width> <height> <touch 0|1> [scenario]
const puppeteer = require('puppeteer-core'), path = require('path');
const [name = 'title', w = '844', h = '390', touch = '1', scenario = 'title'] = process.argv.slice(2);
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: +w, height: +h, deviceScaleFactor: 2, hasTouch: touch === '1', isMobile: touch === '1' });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') ? r.continue() : r.abort()));
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'), { waitUntil: 'domcontentloaded' });
  await new Promise((r) => setTimeout(r, 500));
  const out = await page.evaluate(async (scenario) => {
    const R = window.__rimebell, G = R.G, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const go = async (room, pos, ab) => { R.newGame(); Object.assign(G.save.abilities, ab || {}); R.loadRoom(room, pos); G.fadeA = 0; G.fade = null; await wait(300); };
    if (scenario === 'title') { await wait(400); }
    else if (scenario === 'gate') { await go('gate', { x: 26 * 24, y: 13 * 24 - 22 }); R.Input.bot = { attack: true }; await wait(60); }
    else if (scenario === 'cloister') { await go('cloister', { x: 22 * 24, y: 24 * 24 - 22 }); }
    else if (scenario === 'cloisterTop') { await go('cloister', { x: 27 * 24, y: 12 * 24 - 22 }, { claws: true }); }
    else if (scenario === 'cellar') { await go('cellar', { x: 21 * 24, y: 10 * 24 - 22 }); }
    else if (scenario === 'gallery') { await go('gallery', { x: 12 * 24, y: 12 * 24 - 22 }, { claws: true }); }
    else if (scenario === 'approach') { await go('approach', { x: 22 * 24, y: 14 * 24 - 22 }, { claws: true, dash: true }); }
    else if (scenario === 'boss') { await go('sanctum', { exit: 'a' }, { claws: true, dash: true }); G.god = true; R.Input.bot = { left: true }; await wait(4200); R.Input.bot = null; await wait(600); }
    else if (scenario === 'sign') { await go('gate', { x: 24 * 24, y: 13 * 24 - 22 }); G.enemies = []; await wait(500); }
    else if (scenario === 'toast') { await go('cellar', { x: 31 * 24, y: 16 * 24 - 22 }); await wait(500); }
    else if (scenario === 'end') { await go('sanctum', { x: 10 * 24, y: 14 * 24 - 22 }, { claws: true, dash: true }); G.save.boss = true; R.loadRoom('sanctum', { x: 10 * 24, y: 14 * 24 - 22 }); R.Input.bot = { right: true, attack: true }; await wait(400); R.Input.bot = {}; await wait(3200); }
    else if (scenario === 'rest') { await go('cloister', { x: 21 * 24 + 4, y: 24 * 24 - 22 }); G.save.chimes = 260; G.player.hp = 2; await wait(200); R.Input.bot = { up: true }; await wait(120); R.Input.bot = null; await wait(300); }
    else if (scenario === 'matriarch') { await go('cellar', { x: 26 * 24, y: 10 * 24 - 22 }); G.enemies = []; G.god = true; G.save.chimes = 46; G.player.flask = 1; R.Input.bot = { right: true }; await wait(2600); R.Input.bot = { left: true, attack: true }; await wait(700); R.Input.bot = null; }
    else if (scenario === 'pause') { await go('cloister', { x: 22 * 24, y: 24 * 24 - 22 }); R.pause(); await wait(200); }
    return { state: G.state, room: G.room && G.room.id, px: G.player.x, py: G.player.y, view: [R.View.w, R.View.h, R.View.scale] };
  }, scenario);
  await page.screenshot({ path: path.join(__dirname, name + '.png') });
  console.log(JSON.stringify(out), errors.length ? '\nERRORS:\n' + errors.join('\n') : '\nno errors');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
