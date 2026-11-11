// The chime farms: each level's hoard room is sealed until that level's first boss, the hoardlings never hurt you,
// a loop (clear the pile, rest, clear it again) pays out, and resting brings the whole pile back.
const puppeteer = require('puppeteer-core'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') || r.url().startsWith('data:') ? r.continue() : r.abort()));
  const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  const res = await page.evaluate(() => {
    const R = window.__rimebell, { G, Input, T } = R, log = [];
    const ok = (name, cond, extra) => log.push((cond ? 'ok   ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
    G.manual = true;
    const step = (n, b) => { Input.bot = b || {}; for (let i = 0; i < n; i++) { R.advance(1 / 60); if (i % 9 === 0) R.render(1 / 60); if (G.state === 'menu') document.getElementById('btn-leave').click(); if (G.state === 'msg') document.getElementById('btn-ok').click(); } };
    const hoard = () => G.enemies.filter((e) => e.type === 'g');
    // hunt the pile down: walk at the nearest hoardling and strike when close
    const clear = (limit) => {
      let t = 0;
      for (; t < limit && hoard().length; t += 1 / 60) {
        const p = G.player, pcx = p.x + p.w / 2; let best = null, bd = 1e9;
        for (const e of hoard()) { const d = Math.abs(e.x + e.w / 2 - pcx) + Math.abs(e.y - p.y) * 0.3; if (d < bd) { bd = d; best = e; } }
        const dx = best.x + best.w / 2 - pcx, b = { left: dx < -14, right: dx > 14, attack: Math.abs(dx) < 34 && Math.random() < 0.5 };
        if (Math.abs(dx) < 34) { p.face = dx > 0 ? 1 : -1; }
        step(1, b);
      }
      step(90, {}); // let the chimes fly in
      return t;
    };
    const FARMS = [
      { lv: 1, room: 'hoard', parent: 'gate', door: 'b', flag: 'mini', ab: { claws: true } },
      { lv: 2, room: 'tithe', parent: 'oldroad', door: 'd', flag: 'warden', ab: { claws: true, dash: true } },
      { lv: 3, room: 'glimmer', parent: 'stair', door: 'c', flag: 'moth', ab: { claws: true, dash: true, jump2: true, glide: true } },
    ];
    try {
      for (const F of FARMS) {
        const fresh = (flagOn) => {
          R.newGame(); Object.assign(G.save.abilities, F.ab);
          Object.assign(G.save, { boss: true, mini: true, done: true, warden: true, knight: true, done2: true, moth: true });
          G.save[F.flag] = flagOn;
        };
        fresh(false); R.loadRoom(F.parent, { exit: 'a' }); G.state = 'play';
        const doorTiles = G.room.exitTiles[F.door] || [];
        ok('L' + F.lv + ': the door in ' + F.parent + ' is sealed before the first boss', doorTiles.length === 2 && doorTiles.every((t) => G.room.grid[t.y][t.x] === 'X'));
        fresh(true); R.loadRoom(F.parent, { exit: 'a' }); G.state = 'play';
        ok('L' + F.lv + ': and open after', doorTiles.every((t) => G.room.grid[t.y][t.x] === F.door));
        const t0 = doorTiles[0]; G.player.x = t0.x * T + (t0.x ? -4 : 4); G.player.y = (t0.y + 2) * T - 22; G.player.vy = 0; step(30, { [t0.x ? 'right' : 'left']: true }); step(30, {});
        ok('L' + F.lv + ': it leads into ' + R.ROOMS[F.room].name, G.room.id === F.room, G.room.id);
        const pile = hoard();
        ok('L' + F.lv + ': eight hoardlings asleep in a pile', pile.length === 8 && pile.every((e) => e.mode === 'sleep') && Math.max(...pile.map((e) => e.x)) - Math.min(...pile.map((e) => e.x)) < 60);
        G.player.hp = G.player.maxHp; G.player.inv = 0; G.player.x = pile[3].x; G.player.y = pile[3].y + pile[3].h - G.player.h; step(60, {});
        ok('L' + F.lv + ': they never hurt you', G.player.hp === G.player.maxHp, 'hp ' + G.player.hp);
        // one loop: clear the pile, then rest
        G.player.x = R.G.room.braziers[0].x - 6; G.player.y = R.G.room.braziers[0].y - 22; step(20, {});
        const c0 = G.save.chimes, t = clear(60), got = G.save.chimes - c0;
        ok('L' + F.lv + ': clearing the pile pays ' + 8 * R.HOARD_CHIMES[F.lv] + ' chimes', got === 8 * R.HOARD_CHIMES[F.lv] && !hoard().length, got + ' chimes in ' + t.toFixed(1) + 's');
        const br = G.room.braziers[0]; G.player.x = br.x - 6; G.player.y = br.y - 22; step(20, {}); step(2, { up: true }); step(10, {});
        ok('L' + F.lv + ': resting brings the whole pile back', hoard().length === 8 && hoard().every((e) => e.mode === 'sleep'));
        const t2 = clear(60) + 1.5 + 1; // plus the walk back to the brazier and the rest
        log.push('     L' + F.lv + ' loop: about ' + Math.round((8 * R.HOARD_CHIMES[F.lv] * 60) / (t2 + 3)) + ' chimes a minute with the starting staff');
      }
      // a struck pile scatters, and a Peal takes most of it at once
      R.newGame(); Object.assign(G.save, { mini: true }); R.loadRoom('hoard', { exit: 'a' }); G.state = 'play';
      const pile = hoard(), mid = pile[4]; G.player.x = mid.x - 20; G.player.y = mid.y + mid.h - 22; G.player.face = 1; G.player.res = 99; step(1, {}); step(2, { attack: true }); step(4, {});
      const left = hoard();
      ok('a Peal into the pile kills most of it, and the rest wake and scatter', left.length <= 3 && left.every((e) => e.mode !== 'sleep'), (8 - left.length) + ' killed by one Peal');
    } catch (e) { log.push('EXCEPTION ' + e.stack); }
    return { log };
  });
  console.log(res.log.join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length || res.log.some((l) => /^FAIL|EXCEPTION/.test(l)) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
