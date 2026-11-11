// Drives the whole game with a random-input bot at accelerated speed to shake out runtime errors,
// then checks each souls-style system (flask, echo, rest + upgrades, boss loot) with direct scenarios.
const puppeteer = require('puppeteer-core'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') ? r.continue() : r.abort()));
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  const res = await page.evaluate(() => {
    const R = window.__rimebell, { G, Input, T } = R, log = [], seenStates = new Set(), bossStates = new Set(), rooms = new Set();
    const ok = (name, cond, extra) => log.push((cond ? 'ok   ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
    G.manual = true;
    let seed = 42; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const bot = (Input.bot = {});
    const step = (n, b) => { if (b) Input.bot = b; for (let i = 0; i < n; i++) R.advance(1 / 60); };
    const run = (secs, opts) => {
      opts = opts || {}; let segT = 0; Input.bot = bot;
      for (let t = 0; t < secs; t += 1 / 60) {
        segT -= 1 / 60;
        if (segT <= 0) { segT = 0.05 + rnd() * 0.5; const r = rnd(); bot.left = r < 0.4; bot.right = r >= 0.4 && r < 0.85; bot.jump = rnd() < 0.5; bot.attack = rnd() < 0.5; bot.dash = rnd() < 0.25; bot.up = rnd() < 0.2; bot.down = rnd() < 0.2; bot.heal = rnd() < 0.08; if (opts.bias) { bot.left = opts.bias < 0 ? rnd() < 0.7 : rnd() < 0.15; bot.right = !bot.left; } }
        R.advance(1 / 60); if ((t * 60 | 0) % 7 === 0) R.render(1 / 60);
        seenStates.add(G.state); rooms.add(G.room.id); if (G.boss) bossStates.add(G.boss.kind[0] + ':' + G.boss.state + G.boss.phase);
        if (G.state === 'msg') { if (document.getElementById('end').classList.contains('on')) { document.getElementById('btn-keep').click(); log.push('     end screen shown and dismissed'); } else document.getElementById('btn-ok').click(); }
        if (G.state === 'menu') document.getElementById('btn-leave').click();
        if (opts.until && opts.until()) return t;
      }
      return secs;
    };
    try {
      // 1. wander with and without abilities
      R.newGame(); run(90); log.push('     wander (no abilities): rooms=' + [...rooms].join(',') + ' falls=' + G.save.deaths + ' chimes=' + G.save.chimes);
      R.newGame(); G.save.abilities.claws = G.save.abilities.dash = true; G.save.mini = true; R.loadRoom('cloister', { exit: 'a' }); run(240);
      log.push('     wander (all abilities): rooms=' + [...rooms].join(',') + ' falls=' + G.save.deaths + ' chimes=' + G.save.chimes + ' echo=' + JSON.stringify(G.save.echo && G.save.echo.n));

      // 2. flask
      R.newGame(); G.enemies = []; step(20, {}); const p0 = G.player; p0.hp = 2;
      step(2, { heal: true }); const mid = p0.healT > 0; step(70, {}); ok('flask heals 2 and spends a charge', G.player.hp === 4 && G.player.flask === 1 && mid, 'hp ' + G.player.hp + ' flask ' + G.player.flask);
      G.player.hp = 1; step(2, { heal: true }); step(20, {}); G.player.inv = 0; R.G.god = false; G.player.healT > 0 && (G.player.hurtT = 0.2); step(70, {});
      ok('a hit interrupts the drink without spending it', G.player.hp === 1 && G.player.flask === 1, 'hp ' + G.player.hp + ' flask ' + G.player.flask);
      G.player.flask = 0; G.player.hp = 1; step(2, { heal: true }); step(70, {}); ok('empty flask does nothing', G.player.hp === 1);

      // 3. death drops chimes as an echo; reclaim; second death loses it
      R.newGame(); G.enemies = []; step(20, {}); G.save.chimes = 77; G.player.x = 9 * T; step(30, {}); const dx = G.player.x;
      G.player.hp = 1; G.player.inv = 0; G.player.x = 20 * T + 8; G.player.y = 13 * T - 30; step(400, {});
      ok('death leaves an echo and empties the purse', G.save.echo && G.save.echo.n === 77 && G.save.chimes === 0 && G.state === 'play' && G.save.deaths === 1, JSON.stringify(G.save.echo));
      ok('respawn refills hp and flask', G.player.hp === G.player.maxHp && G.player.flask === 2);
      G.enemies = []; G.player.x = G.save.echo.x - 6; G.player.y = G.save.echo.y - 22; step(10, {});
      ok('touching the echo returns the chimes', G.save.chimes === 77 && G.save.echo === null, G.save.chimes);
      G.player.hp = 1; G.player.inv = 0; G.player.x = 20 * T + 8; G.player.y = 13 * T - 30; step(400, {}); G.enemies = [];
      G.player.hp = 1; G.player.inv = 0; G.player.x = 20 * T + 8; G.player.y = 13 * T - 30; step(400, {});
      ok('dying again before reclaiming loses the echo', G.save.echo === null && G.save.chimes === 0, JSON.stringify(G.save.echo));

      // 4. rest at a brazier: explicit, respawns foes, opens upgrades
      R.newGame(); step(20, {}); G.enemies.length = 0; G.save.chimes = 500; G.player.hp = 2; G.player.flask = 0; G.player.x = 3 * T + 6; step(5, {});
      ok('standing at a brazier does not rest by itself', G.player.hp === 2 && G.state === 'play');
      const cap = document.getElementById('caption').textContent;
      step(3, { up: true }); step(3, {});
      ok('pushing up rests and opens the menu', G.state === 'menu' && G.player.hp === G.player.maxHp && G.player.flask === 2 && G.enemies.length > 0, 'caption "' + cap + '" foes ' + G.enemies.length);
      const btns = [...document.querySelectorAll('#bz-ups button')]; const labels = btns.map((b) => b.textContent);
      btns[0].click(); [...document.querySelectorAll('#bz-ups button')][1].click(); [...document.querySelectorAll('#bz-ups button')][2].click();
      ok('upgrades spend chimes', G.save.chimes === 500 - 120 - 80 - 100 && G.save.up.staff === 1 && G.save.up.flask === 1 && G.save.up.lantern === 1 && G.player.maxHp === 6 && G.player.flask === 3, G.save.chimes + ' left; ' + labels.join(' | '));
      G.save.chimes = 0; R.buy('staff'); ok('cannot buy without chimes', G.save.up.staff === 1);
      R.render(1 / 60); document.getElementById('btn-leave').click(); ok('leaving returns to play', G.state === 'play');

      // 5. the Rime Matriarch: wakes when you drop in, fights, drops loot and frees the claws
      R.newGame(); R.loadRoom('cellar', { x: 21 * T, y: 10 * T - 22 }); G.state = 'play'; G.enemies = [];
      ok('she sleeps on the claws', G.boss && G.boss.state === 'sleep' && G.room.pickups.length === 0);
      G.player.x = 26 * T; step(60, {}); ok('she wakes when the hero lands in the pit', G.boss.state !== 'sleep', G.boss.state);
      G.god = true; run(120, { until: () => !G.boss || G.boss.hp <= 2 });
      if (G.boss && G.boss.hp > 9) { G.boss.hp = 10; run(90, { until: () => !G.boss || G.boss.hp <= 2 }); }
      if (G.boss) { G.boss.hp = 1; run(60, { until: () => !G.boss }); }
      const kinds = G.room.pickups.map((k) => k.kind).sort().join('');
      ok('her death drops chimes, a relic and frees the claws', G.save.mini && !G.boss, 'pickups ' + kinds + ' drops ' + G.drops.length + ' chimes ' + G.save.chimes);
      run(40, { until: () => G.save.relics.spine && G.save.abilities.claws });
      ok('relic and claws collected', G.save.relics.spine && G.save.abilities.claws, 'chimes ' + G.save.chimes);
      G.god = false;

      // 6. the Silent Abbot: loot and ending
      G.save.abilities.dash = true; G.god = true; R.loadRoom('sanctum', { exit: 'a' }); G.state = 'play';
      run(12, { bias: -1, until: () => !!G.boss }); ok('abbot appears and the gate shuts', !!G.boss && G.room.gateClosed);
      run(150); if (G.boss && G.boss.hp > 18) G.boss.hp = 18;
      run(240, { until: () => !G.boss || G.boss.hp <= 3 }); const ph = G.boss ? G.boss.phase : 0;
      if (G.boss) { G.boss.hp = 1; run(120, { until: () => !G.boss }); }
      const c0 = G.save.chimes;
      ok('abbot falls, gate opens, relic appears', G.save.boss && !G.room.gateClosed && G.room.pickups.some((k) => k.kind === 'K'), 'phase reached ' + ph);
      { const k = G.room.pickups.find((q) => q.kind === 'K'); G.enemies = []; step(90, {}); G.player.x = k.x - 6; G.player.y = k.y - 8; step(20, {}); const title = document.getElementById('toast-title').textContent + ' / ' + document.getElementById('toast-body').textContent; document.getElementById('btn-ok').click(); log.push('     relic toast: ' + title);
        const bell = G.room.bell; G.player.x = bell.x - 30; G.player.y = bell.y - 22; G.player.face = 1; step(100, {}); step(3, { attack: true }); step(200, {}); if (document.getElementById('end').classList.contains('on')) { document.getElementById('btn-keep').click(); log.push('     end screen shown and dismissed'); } }
      ok('clapper collected, bell rung, chimes paid out', G.save.relics.clapper && G.save.done && G.save.chimes >= c0, 'chimes ' + G.save.chimes);
      run(6); G.god = false;
      R.loadRoom('sanctum', { x: 10 * T, y: 14 * T - 22 }); G.state = 'play'; G.fadeA = 0; G.fade = null; step(30, {}); // the open west door may have taken the bot away
      G.player.res = 8; G.player.hp = 2; G.enemies = []; step(3, { attack: true }); ok('with the clapper a Peal mends', G.player.hp === 3, G.player.hp);

      // 7. mortal run at the boss, hazards, shell hooks
      G.save.boss = false; R.loadRoom('sanctum', { exit: 'a' }); G.state = 'play'; G.player.hp = G.player.maxHp; const d0 = G.save.deaths; run(90, { bias: -1 });
      log.push('     mortal vs abbot for 90s: falls=' + (G.save.deaths - d0) + ' room=' + G.room.id);
      R.loadRoom('gallery', { x: 5 * T, y: 12 * T - 22 }); G.state = 'play'; G.enemies = []; G.player.hp = 5; step(20, {});
      G.player.x = 9 * T; G.player.y = 13 * T; step(200, {}); ok('the void costs one ember and returns you', G.player.hp === 4 && G.state === 'play' && G.player.x < 8 * T, 'hp ' + G.player.hp);
      R.loadRoom('cloister', { exit: 'a' }); G.state = 'play';
      ok('back pauses', R.back() === true && G.state === 'pause'); R.render(1 / 60); const rel = document.getElementById('relics').textContent;
      ok('back resumes', R.back() === true && G.state === 'play'); R.sleep(); ok('sleep pauses and saves', G.state === 'pause'); R.wake(); R.resume();
      R.showTitle(); ok('back on title is not handled', R.back() === false);
      document.getElementById('btn-continue').click(); step(60, {});
      ok('continue restores progress', G.state === 'play' && G.save.relics.clapper && G.save.relics.spine && G.save.up.staff === 0, rel);
    } catch (e) { log.push('EXCEPTION ' + e.stack); }
    return { log, states: [...seenStates], bossStates: [...bossStates].sort(), rooms: [...rooms] };
  });
  console.log(res.log.join('\n')); console.log('states:', res.states.join(' ')); console.log('boss states:', res.bossStates.join(' ')); console.log('rooms:', res.rooms.join(' '));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length || res.log.some((l) => /^FAIL|EXCEPTION/.test(l)) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
