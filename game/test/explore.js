// Monte-Carlo reachability check: from each standing spot it finds, plays many random input sequences
// through the real player physics and records which exits / relics can be touched with a given ability set.
const puppeteer = require('puppeteer-core'), path = require('path');
const T = 24, feet = (ty) => ty * T - 22;
const CASES = [
  ['gate', {}, { x: 2 * T, y: feet(13) }, { exits: ['a'] }, {}],
  ['cloister', {}, { exit: 'a' }, { exits: ['a', 'b'] }, { exits: ['c', 'd'] }],
  ['cellar', {}, { exit: 'a' }, { pickups: ['1'] }, {}],
  ['cellar (in pit, no claws)', {}, { x: 29 * T, y: feet(16) }, { pickups: ['1'] }, { exits: ['a'] }],
  ['cellar (in pit, claws)', { claws: true }, { x: 29 * T, y: feet(16) }, { exits: ['a'] }, {}],
  ['cloister', { claws: true }, { exit: 'b' }, { exits: ['a', 'b', 'c'] }, { exits: ['d'] }],
  ['gallery', { claws: true }, { exit: 'a' }, { pickups: ['2'], exits: ['a'] }, { pickups: ['H'] }],
  ['gallery (from far ledge)', { claws: true, dash: true }, { x: 51 * T, y: feet(10) }, { exits: ['a'], pickups: ['H'] }, {}],
  ['cloister', { claws: true, dash: true }, { exit: 'c' }, { exits: ['a', 'b', 'c', 'd'] }, {}],
  ['approach', { claws: true, dash: true }, { exit: 'a' }, { exits: ['a', 'b'] }, {}],
  ['approach (return)', { claws: true, dash: true }, { exit: 'b' }, { exits: ['a'] }, {}],
  ['sanctum', { claws: true, dash: true }, { exit: 'a' }, { exits: ['a', 'b'], bell: true }, {}],
  ['sanctum (door still sealed)', { claws: true, dash: true }, { exit: 'a' }, { exits: ['a'] }, { exits: ['b'] }, { done: false }],
  // Level 2: arrives with claws and dash; the Cinder Step (jump2) waits behind the Barrow Warden
  ['oldroad', { claws: true, dash: true }, { exit: 'a' }, { exits: ['a', 'b', 'c'] }, {}],
  ['barrow', { claws: true, dash: true }, { exit: 'a' }, { exits: ['a'], pickups: ['J'] }, { pickups: ['H'] }],
  ['barrow (from crypt floor)', { claws: true, dash: true }, { x: 12 * T, y: feet(24) }, { exits: ['a'], pickups: ['J'] }, {}],
  ['barrow (with Cinder Step)', { claws: true, dash: true, jump2: true }, { exit: 'a' }, { exits: ['a'], pickups: ['J', 'H'] }, {}],
  ['rampart', { claws: true, dash: true }, { exit: 'a' }, { exits: ['a'] }, { exits: ['b'] }],
  ['rampart (with Cinder Step)', { claws: true, dash: true, jump2: true }, { exit: 'a' }, { exits: ['a', 'b'] }, {}],
  ['rampart (from the Court)', { claws: true, dash: true, jump2: true }, { exit: 'b' }, { exits: ['a', 'b'] }, {}],
  ['court', { claws: true, dash: true, jump2: true }, { exit: 'a' }, { exits: ['a'] }, {}],
];
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') ? r.continue() : r.abort()));
  page.on('pageerror', (e) => console.log('pageerror: ' + e.message));
  await page.goto('file://' + path.join(__dirname, '..', 'dist', 'index.html'), { waitUntil: 'domcontentloaded' });
  let bad = 0;
  for (const [label, ab, start, must, mustNot, flags] of CASES) {
    const roomId = label.split(' ')[0];
    const res = await page.evaluate((roomId, ab, start, K, flags) => {
      const R = window.__rimebell, { G, Input, T, STEP } = R;
      R.newGame(); G.state = 'pause'; Object.assign(G.save.abilities, { claws: false, dash: false, jump2: false }, ab);
      Object.assign(G.save, { boss: true, mini: true, warden: true, knight: true, done: true }, flags || {});
      for (const k in G.save.relics) G.save.relics[k] = true;
      const room = R.loadRoom(roomId, start); G.enemies = []; G.state = 'pause';
      let seed = 987654321; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      const seen = new Set(), queue = [], found = { exits: {}, pickups: {}, bell: false };
      const push = (x, y) => { const k = Math.round(x / 10) + ',' + Math.round(y / 12); if (!seen.has(k)) { seen.add(k); queue.push([x, y]); } };
      const check = (p) => {
        const cx = p.x + p.w / 2, ch = (room.grid[Math.floor((p.y + p.h / 2) / T)] || [])[Math.floor(cx / T)];
        if (ch && room.def.exits[ch]) { found.exits[ch] = 1; return true; }
        if (p.y > room.h * T + 40 || R.hazardHit(room, p)) return true;
        for (const k of room.pickups) if (Math.abs(cx - k.x) < 16 && Math.abs(p.y + p.h / 2 - k.y) < 20) found.pickups[k.kind] = 1;
        if (room.bell && Math.abs(cx - room.bell.x) < 30 && p.onGround) found.bell = true;
        return false;
      };
      const mk = (x, y) => (G.player = Object.assign(R.newPlayer(), { x, y, onGround: true, wasGround: true, coyote: 0.1 }));
      // settle the start position
      let p = mk(G.player.x, G.player.y); Input.held.left = Input.held.right = Input.held.jump = Input.held.up = Input.held.down = false;
      for (let i = 0; i < 240 && !(i > 5 && p.onGround); i++) R.updatePlayer(STEP);
      push(p.x, p.y);
      let nodes = 0;
      while (queue.length && nodes < 4000) {
        const [sx, sy] = queue.shift(); nodes++;
        for (let k = 0; k < K; k++) {
          p = mk(sx, sy);
          let t = 0, segT = 0, dir = 0, jumpHeld = false, down = false; const commit = rnd() < 0.4, cdir = rnd() < 0.5 ? -1 : 1, flipAt = rnd() < 0.3 ? 0.5 + rnd() * 3 : 99;
          const dur = commit ? 2 + rnd() * 4 : 0.8 + rnd() * 2.6, mash = commit || rnd() < 0.7, mashP = 0.04 + rnd() * 0.3;
          while (t < dur) {
            if (commit) {
              if (segT <= 0) { segT = 0.1 + rnd() * 0.6; if (rnd() < 0.6) Input.pressed.jump = true; if (ab.dash && rnd() < 0.3) Input.pressed.dash = true; }
              dir = t > flipAt ? -cdir : cdir; jumpHeld = true; down = false;
            } else if (segT <= 0) {
              segT = 0.04 + rnd() * 0.5; const r = rnd(); dir = r < 0.43 ? -1 : r < 0.86 ? 1 : 0; down = false;
              const j = rnd(); if (j < 0.45) { Input.pressed.jump = true; jumpHeld = rnd() < 0.8; } else if (j < 0.6) jumpHeld = false; else if (j < 0.64) { down = true; Input.pressed.jump = true; }
              if (ab.dash && rnd() < 0.22) Input.pressed.dash = true;
            }
            if (ab.claws && mash && !p.onGround && p.wallCoyote > 0 && rnd() < mashP) { Input.pressed.jump = true; jumpHeld = true; }
            Input.held.left = dir < 0; Input.held.right = dir > 0; Input.held.jump = jumpHeld; Input.held.down = down; Input.held.up = false;
            R.updatePlayer(STEP);
            Input.pressed.jump = Input.pressed.dash = Input.pressed.attack = false;
            t += STEP; segT -= STEP;
            if (check(p)) break;
            if (p.onGround) push(p.x, p.y);
          }
        }
      }
      Input.held.left = Input.held.right = Input.held.jump = Input.held.down = false;
      return { found, nodes, left: queue.length };
    }, roomId, ab, start, 70, flags || null);
    const f = res.found, problems = [];
    for (const e of must.exits || []) if (!f.exits[e]) problems.push('cannot reach exit ' + e);
    for (const k of must.pickups || []) if (!f.pickups[k]) problems.push('cannot reach relic ' + k);
    if (must.bell && !f.bell) problems.push('cannot reach bell');
    for (const e of mustNot.exits || []) if (f.exits[e]) problems.push('SKIP: reaches exit ' + e + ' without the ability');
    for (const k of mustNot.pickups || []) if (f.pickups[k]) problems.push('SKIP: reaches relic ' + k + ' without the ability');
    bad += problems.length;
    console.log((problems.length ? 'FAIL ' : 'ok   ') + label.padEnd(28) + JSON.stringify(ab).padEnd(28) + ' exits=' + Object.keys(f.exits).join('') + ' relics=' + Object.keys(f.pickups).join('') + (f.bell ? ' bell' : '') + ' nodes=' + res.nodes + (problems.length ? '\n     ' + problems.join('; ') : ''));
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
