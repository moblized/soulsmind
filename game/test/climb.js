// Scripted check of the single-wall climb in the Wind Gallery (pillar -> first ice wall -> top).
const puppeteer = require('puppeteer-core'), path = require('path');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') ? r.continue() : r.abort()));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'), { waitUntil: 'domcontentloaded' });
  const res = await page.evaluate(() => {
    const R = window.__rimebell, { G, Input, T, STEP } = R, out = [];
    for (const delay of [0.0, 0.05, 0.1, 0.2, 0.3]) {
      R.newGame(); G.state = 'pause'; G.save.abilities.claws = true;
      R.loadRoom('gallery', { x: 12 * T, y: 12 * T - 22 }); G.enemies = []; G.state = 'pause';
      const p = G.player; let t = 0, slideT = 0, jumps = 0, minY = p.y, log = [];
      Input.held.right = true; Input.held.left = false; Input.held.jump = true;
      let jumped = false;
      while (t < 8) {
        if (!jumped && p.x > 13 * T + 4) { Input.pressed.jump = true; jumped = true; }
        if (p.sliding) { slideT += STEP; if (slideT >= delay) { Input.pressed.jump = true; slideT = 0; jumps++; } } else slideT = 0;
        R.updatePlayer(STEP); Input.pressed.jump = false; t += STEP; minY = Math.min(minY, p.y);
        if (p.onGround && p.y < 7 * T) { log.push('reached top at t=' + t.toFixed(2)); break; }
        if (p.y > 20 * T) { log.push('fell at t=' + t.toFixed(2)); break; }
      }
      out.push({ delay, jumps, minRow: ((minY + 22) / T).toFixed(2), log });
    }
    Input.held.right = Input.held.jump = false;
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
