// Climbing with the Ice Claws the way a thumb plays it: hold the stick toward the wall and either tap JUMP
// at a steady rhythm (not timed to the wall) or simply hold JUMP. Each climb runs from many start offsets.
const puppeteer = require('puppeteer-core'), path = require('path');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage(); await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') ? r.continue() : r.abort()));
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'));
  const res = await page.evaluate(() => {
    const R = window.__rimebell, { G, Input, T, STEP } = R;
    // [label, room, start tile x, feet row, hold direction, success test]
    const CLIMBS = [
      ['Wind Gallery: one sheer wall', 'gallery', 13, 12, 1, (p) => p.onGround && p.y + p.h <= 6 * T + 1],
      ['Cloister shaft, right wall (from the beam)', 'cloister', 41, 21, 1, (p) => (p.y + p.h <= 12 * T + 1 && p.onGround) || p.x + p.w / 2 >= 43 * T],
      ['Cloister shaft, left wall (from the beam)', 'cloister', 41, 21, -1, (p) => p.y + p.h <= 12 * T + 1 && p.onGround],
      ['Barrow shaft: back up from the crypt', 'barrow', 31, 24, 1, (p) => p.y + p.h <= 8 * T + 1 && p.onGround],
      ['Cellar pit: climbing out', 'cellar', 30, 16, -1, (p) => p.onGround && p.y + p.h <= 10 * T + 1 && p.x < 23 * T],
    ];
    // every style starts with a fresh press of JUMP, then keeps its rhythm
    const styles = { 'tap every 0.25s': (t) => t % 0.25 < 0.08, 'tap every 0.4s': (t) => t % 0.4 < 0.1, 'hold JUMP': () => true, 'tap, then hold at the wall': (t, p) => t < 0.08 || p.wallCoyote > 0 || p.sliding || (p.onGround && Math.abs(p.vx) < 1) };
    const out = [];
    for (const [label, room, tx, row, dir, done] of CLIMBS) for (const name in styles) {
      let wins = 0; const N = 12;
      for (let k = 0; k < N; k++) {
        R.newGame(); G.state = 'pause'; Object.assign(G.save.abilities, { claws: true, dash: false, jump2: false }); G.save.mini = true; G.save.warden = true;
        R.loadRoom(room, { x: tx * T + 6, y: row * T - 22 }); G.enemies = []; G.boss = null; G.state = 'pause';
        const p = G.player; Input.held.left = Input.held.right = Input.held.up = Input.held.down = false; Input.held.jump = false;
        for (let i = 0; i < 30; i++) { R.updatePlayer(STEP); Input.clearPressed(); }
        let t = 0, prev = false, ok = false; for (let w = 0; w < k; w++) { R.updatePlayer(STEP); Input.clearPressed(); }
        for (let i = 0; i < 1200; i++) {
          const j = styles[name](t, p); Input.held.left = dir < 0; Input.held.right = dir > 0; Input.held.jump = j;
          if (j && !prev) Input.pressed.jump = true; prev = j;
          R.updatePlayer(STEP); Input.clearPressed(); t += STEP;
          if (done(p)) { ok = true; break; }
        }
        if (ok) wins++;
      }
      out.push(label.padEnd(44) + name.padEnd(28) + wins + '/' + N);
    }
    Input.held.left = Input.held.right = Input.held.jump = false;
    return out;
  });
  console.log(res.join('\n')); await browser.close();
})();
