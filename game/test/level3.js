// Scripted checks for Level 3 (Starwell): the Court's west door, falling stars, the new foes, the Night Moth,
// the Starsilk glide, the new gear, Orren and the end of the level. Then a stretch of random play for errors.
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
    const R = window.__rimebell, { G, Input, T } = R, log = [], bossStates = new Set(), shotKinds = new Set();
    const ok = (name, cond, extra) => log.push((cond ? 'ok   ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
    G.manual = true;
    let seed = 11; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const watch = () => { if (G.boss) bossStates.add(G.boss.kind[0] + ':' + G.boss.state + G.boss.phase); for (const s of G.shots) shotKinds.add(s.k); };
    const step = (n, b) => { Input.bot = b || {}; for (let i = 0; i < n; i++) { R.advance(1 / 60); watch(); if (i % 9 === 0) R.render(1 / 60); } };
    const bot = {};
    const run = (secs, opts) => {
      opts = opts || {}; let segT = 0;
      for (let t = 0; t < secs; t += 1 / 60) {
        segT -= 1 / 60;
        if (segT <= 0) { segT = 0.05 + rnd() * 0.5; const r = rnd(); bot.left = r < 0.42; bot.right = r >= 0.42 && r < 0.86; bot.jump = rnd() < 0.5; bot.attack = rnd() < 0.55; bot.dash = rnd() < 0.25; bot.up = rnd() < 0.25; bot.down = rnd() < 0.2; bot.heal = rnd() < 0.05; }
        if (opts.chase && G.boss) { const dx = G.boss.x + G.boss.w / 2 - (G.player.x + G.player.w / 2); if (Math.abs(dx) > 30 && rnd() < 0.7) { bot.left = dx < 0; bot.right = dx > 0; } if (G.boss.y + G.boss.h < G.player.y && rnd() < 0.5) { bot.up = true; bot.jump = true; } }
        Input.bot = bot; R.advance(1 / 60); if ((t * 60 | 0) % 9 === 0) R.render(1 / 60);
        watch();
        if (G.state === 'msg') { if (document.getElementById('end').classList.contains('on')) document.getElementById('btn-keep').click(); else document.getElementById('btn-ok').click(); }
        if (G.state === 'menu') document.getElementById('btn-leave').click();
        if (opts.until && opts.until()) return t;
      }
      return secs;
    };
    const lv3 = (glide) => {
      R.newGame(); Object.assign(G.save.abilities, { claws: true, dash: true, jump2: true, glide: !!glide });
      Object.assign(G.save, { boss: true, mini: true, done: true, warden: true, knight: true, done2: true });
      G.player.maxHp = G.player.hp = 7;
    };
    const place = (room, tx, ty) => { R.loadRoom(room, { x: tx * T + 6, y: ty * T - 22 }); G.state = 'play'; G.fadeA = 0; G.fade = null; };
    const clearOverlays = () => { for (let i = 0; i < 4; i++) { if (document.getElementById('toast').classList.contains('on')) document.getElementById('btn-ok').click(); if (document.getElementById('end').classList.contains('on')) document.getElementById('btn-keep').click(); } };
    try {
      // 1. the Court's west door: sealed while Varhelm stands, open after, and it leads up into the Starwell
      lv3(); G.save.knight = false; R.loadRoom('court', { exit: 'a' }); G.state = 'play';
      ok('the Court west door is sealed while Varhelm stands', G.room.grid[12][0] === 'X' && G.room.grid[13][0] === 'X');
      G.boss.hp = 1; G.boss.state = 'idle'; R.hurtBoss(5); step(200, {}); clearOverlays(); step(120, {}); clearOverlays();
      ok('it opens when he falls', G.save.knight && G.room.grid[13][0] === 'b', G.room.grid[13][0]);
      G.room.pickups.length = 0; G.player.x = 2 * T; G.player.y = 14 * T - 22; step(60, { left: true });
      ok('the door leads to the Starwell', G.room.id === 'stair' && /Level 3/.test(document.getElementById('roomname').textContent), document.getElementById('roomname').textContent);

      // 2. falling stars in the open rooms, and none near a lit brazier
      lv3(); place('stair', 18, 32); G.enemies = []; G.player.hp = G.player.maxHp = 9; let stars = 0, landed = 0; const seen = new Set();
      for (let i = 0; i < 60 * 14; i++) { step(1, {}); for (const s of G.shots) if (s.k === 'fstar' && !seen.has(s)) { seen.add(s); stars++; } }
      for (const s of seen) if (G.shots.indexOf(s) < 0) landed++;
      ok('stars fall in the open (with a warning first)', stars >= 2 && landed >= 1, stars + ' stars, ' + landed + ' landed, hp ' + G.player.hp + '/' + G.player.maxHp);
      lv3(); place('stair', 30, 32); G.save.lit['stair:30,31'] = 1; R.loadRoom('stair', { x: 30 * T, y: 32 * T - 22 }); G.state = 'play'; G.enemies = []; let near = 0;
      for (let i = 0; i < 60 * 12; i++) { step(1, {}); for (const s of G.shots) if (s.k === 'fstar') near++; }
      ok('a lit brazier keeps the sky off', near === 0, near);

      // 3. the new foes
      lv3(); place('stair', 14, 25); const moth = G.enemies.find((e) => e.type === 'n' && Math.abs(e.x - 14 * T) < 30); G.enemies = [moth];
      G.player.x = moth.x; G.player.y = 29 * T - 22; G.player.inv = 0; G.player.hp = 7; moth.cd = 0; let dived = false;
      for (let i = 0; i < 300; i++) { step(1, {}); if (moth.mode === 'dive') dived = true; }
      ok('a Starling Moth dives at the hero below it', dived, 'hp ' + G.player.hp);
      lv3(); place('orrery', 44, 22); const sen = G.enemies.find((e) => e.type === 'o' && e.x > 35 * T); G.enemies = [sen]; G.player.inv = 0; sen.cd = 0; let ring = 0;
      for (let i = 0; i < 120; i++) { step(1, {}); ring = Math.max(ring, G.shots.filter((s) => s.k === 'orb').length); }
      ok('an Orrery Sentinel turns a ring of shots', ring >= 6, ring + ' orbs');
      lv3(); place('orrery', 44, 22); const aco = G.enemies.find((e) => e.type === 'y' && e.x > 35 * T); G.enemies = [aco]; G.player.inv = 0; G.player.hp = 7; G.player.face = -1; aco.cd = 0;
      let blinked = false, behind = false, slashed = false;
      for (let i = 0; i < 200; i++) { step(1, {}); if (aco.mode === 'wind' && !blinked) { blinked = true; behind = Math.sign(aco.x - G.player.x) === -G.player.face || Math.abs(aco.x - G.player.x) < 50; } if (aco.mode === 'slash') slashed = true; }
      ok('a Blink Acolyte steps behind the hero and cuts', blinked && behind && slashed, 'hp ' + G.player.hp);

      // 4. the Night Moth
      lv3(); R.loadRoom('silk', { exit: 'a' }); G.state = 'play'; G.enemies = [];
      ok('the Night Moth sleeps in the roof; the door on is sealed and no mantle shows', G.boss && G.boss.kind === 'moth' && G.boss.state === 'sleep' && G.room.grid[19][0] === 'X' && !G.room.pickups.some((q) => q.kind === 'M'));
      step(240, { left: true }); ok('she wakes and the gate shuts', G.boss.state !== 'sleep' && G.room.gateClosed, G.boss.state);
      G.god = true; let pushed = 0;
      const mothRun = (secs) => run(secs, { chase: true, until: () => { if (G.wind && G.wind.t > 0) pushed++; return !G.boss || G.boss.hp <= 2; } });
      mothRun(60); if (G.boss && G.boss.hp > 15) { G.boss.hp = 15; mothRun(60); }
      const mothPhase = G.boss ? G.boss.phase : 2;
      if (G.boss) { G.boss.hp = 1; G.boss.state = 'circle'; G.boss.st = 0; R.hurtBoss(5); }
      for (let i = 0; i < 300 && G.boss; i++) step(1, {});
      step(100, {}); clearOverlays();
      const has = (kind, got) => G.room.pickups.some((q) => q.kind === kind) || got;
      ok('she falls: gate opens, the door on opens, Starsilk and the locket appear', G.save.moth && !G.room.gateClosed && G.room.grid[19][0] === 'b' && has('M', G.save.abilities.glide) && has('K', G.save.own.locket), 'phase ' + mothPhase + ', wingbeats ' + pushed + ', pickups ' + G.room.pickups.map((q) => q.kind).join(''));
      let cards = '';
      for (const kind of ['K', 'M']) { const q = G.room.pickups.find((x) => x.kind === kind); if (!q) continue; G.player.x = q.x - 6; G.player.y = q.y - 11; step(6, {}); cards += document.getElementById('toast-title').textContent + '; '; document.getElementById('btn-ok').click(); step(2, {}); }
      ok('Starsilk Mantle and Moth-wing Locket collected', G.save.abilities.glide && G.save.own.locket && G.save.equip.relics.indexOf('locket') >= 0, cards);
      G.god = false;

      // 5. gliding
      lv3(true); place('bridge', 58, 11); G.enemies = []; step(20, {});
      const peakFall = () => { let m = -1e9, g = false; step(1, { jump: true }); for (let i = 0; i < 60; i++) { step(1, { jump: true, left: true }); if (!G.player.onGround) m = Math.max(m, G.player.vy); g = g || G.player.gliding; } return [m, g]; };
      const [vyG, gl] = peakFall();
      lv3(false); place('bridge', 58, 11); G.enemies = []; step(20, {});
      const [vyN] = peakFall();
      ok('holding jump while falling glides, and only with the Starsilk', gl && vyG < 70 && vyN > 200, 'with ' + vyG.toFixed(0) + ', without ' + vyN.toFixed(0));
      // the glide carries the hero over the first gap of the bridge
      lv3(true); place('bridge', 55, 11); G.enemies = []; step(20, {}); step(1, { jump: true, left: true }); step(16, { jump: true, left: true }); step(4, { left: true }); step(1, { jump: true, left: true }); step(200, { jump: true, left: true });
      ok('a glide crosses the broken bridge', G.player.x < 38 * T && G.player.y < 12 * T, 'x ' + (G.player.x / T).toFixed(1) + ' y ' + (G.player.y / T).toFixed(1));

      // 6. the gear: locket, robe, rod, lens
      lv3(true); G.save.own.locket = true; G.save.equip.relics = ['locket']; place('orrery', 40, 22); const foe = G.enemies.find((e) => e.type === 'y' && e.x > 35 * T); G.enemies = [foe];
      foe.x = G.player.x + 40; foe.y = 22 * T - foe.h; foe.cd = 9; G.player.face = 1; const fh = foe.hp; step(1, { right: true, dash: true }); step(20, { right: true });
      ok('the Moth-wing Locket: a dash cuts through a foe', foe.hp < fh, fh + ' → ' + foe.hp.toFixed(2));
      lv3(); G.save.own.robe = true; G.save.equip.armor = 'robe'; place('orrery', 44, 22); G.enemies = []; G.player.hp = 3; const f0 = R.maxFlask();
      step(60 * 21, {}); ok('the Starwoven Robe mends an ember every twenty seconds and costs a drink', G.player.hp === 4 && f0 === 1, 'hp ' + G.player.hp + ', flask ' + f0);
      lv3(); G.save.own.rod = true; G.save.equip.weapon = 'rod'; place('orrery', 36, 22); const tgt = G.enemies.find((e) => e.type === 'y' && e.x > 35 * T); G.enemies = [tgt];
      tgt.x = G.player.x + 130; tgt.y = 22 * T - tgt.h; tgt.cd = 9; G.player.face = 1; const th = tgt.hp; step(2, { attack: true }); step(30, {});
      ok("the Astronomer's Rod looses a star that hits at range", tgt.hp < th, th + ' → ' + tgt.hp.toFixed(2));
      lv3(); G.save.own.lens = true; G.save.equip.relics = ['lens']; place('orrery', 44, 22); G.player.hp = G.player.maxHp; const full = R.strikeDmg(false); G.player.hp--; const hurt = R.strikeDmg(false);
      ok("Orren's Lens: a third harder at full health", Math.abs(full / hurt - 1.33) < 0.01, full.toFixed(2) + ' vs ' + hurt.toFixed(2));

      // 7. Orren
      lv3(true); G.save.moth = true; R.loadRoom('dome', { exit: 'a' }); G.state = 'play'; G.enemies = [];
      ok('Orren bends over his telescope', G.boss && G.boss.kind === 'orren' && G.boss.state === 'sleep');
      step(90, { left: true }); ok('he turns and the gate shuts', G.boss.state !== 'sleep' && G.room.gateClosed, G.boss.state);
      G.god = true; run(90, { chase: true, until: () => !G.boss || G.boss.hp <= 2 });
      if (G.boss && G.boss.hp > 28) { G.boss.hp = 28; run(90, { chase: true, until: () => !G.boss || G.boss.hp <= 2 }); }
      const op = G.boss ? G.boss.phase : 2, orbiters = G.shots.filter((s) => s.k === 'orbiter').length;
      if (G.boss) { G.boss.hp = 1; G.boss.state = 'drift'; G.boss.st = 0; G.boss.alpha = 1; R.hurtBoss(5); }
      for (let i = 0; i < 300 && G.boss; i++) step(1, {});
      ok('Orren falls and leaves the lens and the rod', G.save.astro && !G.room.gateClosed && has('K', G.save.own.lens) && has('E', G.save.own.rod), 'phase ' + op + ', orbiters ' + orbiters);
      let t3 = '';
      for (let i = 0; i < 900 && !document.getElementById('end').classList.contains('on'); i++) {
        if (document.getElementById('toast').classList.contains('on')) { t3 += document.getElementById('toast-title').textContent + '; '; document.getElementById('btn-ok').click(); }
        const loot = G.room.pickups[0]; if (loot && G.state === 'play') { G.player.x = loot.x - 6; G.player.y = loot.y - 11; }
        step(1, {});
      }
      ok('Level 3 end card', document.getElementById('end').classList.contains('on') && document.getElementById('end-title').textContent === 'Starfall', t3 + ' / ' + document.getElementById('end-stats').textContent);
      document.getElementById('btn-keep').click(); G.god = false;

      // 8. title, map and random play in the Starwell
      G.save.brazier = { room: 'bridge', x: 6 * T + 20, y: 11 * T - 22, key: 'bridge:6,10' };
      R.pause(); R.sleep(); R.render(1 / 60); const mapName = document.getElementById('map-name').textContent; R.resume();
      R.showTitle(); const stage = document.getElementById('title-stage').textContent;
      ok('the title shows Level 3', stage === 'Level 3 · Starwell', stage + ' / map: ' + mapName);
      document.getElementById('btn-continue').click(); step(30, {});
      for (const room of ['stair', 'silk', 'orrery', 'bridge']) {
        lv3(true); G.save.moth = room !== 'silk'; R.loadRoom(room, { exit: 'a' }); G.state = 'play'; const d0 = G.save.deaths;
        run(60); log.push('     random play in ' + room + ': falls ' + (G.save.deaths - d0) + ', chimes ' + G.save.chimes + ', now in ' + G.room.id);
      }
    } catch (e) { log.push('EXCEPTION ' + e.stack); }
    return { log, bossStates: [...bossStates].sort(), shotKinds: [...shotKinds].sort() };
  });
  console.log(res.log.join('\n')); console.log('boss states:', res.bossStates.join(' ')); console.log('shots seen:', res.shotKinds.join(' '));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length || res.log.some((l) => /^FAIL|EXCEPTION/.test(l)) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
