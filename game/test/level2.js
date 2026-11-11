// Scripted checks for Level 2 (Duskmarch): the sealed door, shields, archers, hounds, both bosses,
// the Cinder Step, the new relics and the end of the level. Then a stretch of random play for errors.
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
    const R = window.__rimebell, { G, Input, T } = R, log = [], bossStates = new Set();
    const ok = (name, cond, extra) => log.push((cond ? 'ok   ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
    G.manual = true;
    let seed = 7; const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    const step = (n, b) => { Input.bot = b || {}; for (let i = 0; i < n; i++) { R.advance(1 / 60); if (G.boss) bossStates.add(G.boss.kind[0] + ':' + G.boss.state + G.boss.phase); if (i % 9 === 0) R.render(1 / 60); } };
    const bot = {};
    const run = (secs, opts) => {
      opts = opts || {}; let segT = 0;
      for (let t = 0; t < secs; t += 1 / 60) {
        segT -= 1 / 60;
        if (segT <= 0) { segT = 0.05 + rnd() * 0.5; const r = rnd(); bot.left = r < 0.42; bot.right = r >= 0.42 && r < 0.86; bot.jump = rnd() < 0.5; bot.attack = rnd() < 0.55; bot.dash = rnd() < 0.25; bot.up = rnd() < 0.15; bot.down = rnd() < 0.2; bot.heal = rnd() < 0.05; }
        if (opts.chase && G.boss) { const dx = G.boss.x + G.boss.w / 2 - (G.player.x + G.player.w / 2); if (Math.abs(dx) > 40 && rnd() < 0.7) { bot.left = dx < 0; bot.right = dx > 0; } }
        Input.bot = bot; R.advance(1 / 60); if ((t * 60 | 0) % 9 === 0) R.render(1 / 60);
        if (G.boss) bossStates.add(G.boss.kind[0] + ':' + G.boss.state + G.boss.phase);
        if (G.state === 'msg') { if (document.getElementById('end').classList.contains('on')) document.getElementById('btn-keep').click(); else document.getElementById('btn-ok').click(); }
        if (G.state === 'menu') document.getElementById('btn-leave').click();
        if (opts.until && opts.until()) return t;
      }
      return secs;
    };
    const lv2 = () => { R.newGame(); Object.assign(G.save.abilities, { claws: true, dash: true }); Object.assign(G.save, { boss: true, mini: true, done: true }); };
    const place = (room, tx, ty) => { R.loadRoom(room, { x: tx * T + 6, y: ty * T - 22 }); G.state = 'play'; G.fadeA = 0; G.fade = null; };
    try {
      // 1. the sealed west door of the sanctum, and the end of Level 1
      R.newGame(); Object.assign(G.save.abilities, { claws: true, dash: true }); G.save.boss = true; R.loadRoom('sanctum', { x: 10 * T, y: 14 * T - 22 }); G.state = 'play';
      ok('the west door is sealed before the bell', G.room.grid[12][0] === 'X' && G.room.grid[13][0] === 'X');
      const bell = G.room.bell; step(100, {}); G.player.x = bell.x - 30; G.player.y = bell.y - 22; G.player.face = 1; step(4, { attack: true }); step(10, {});
      ok('ringing the bell opens it', G.room.grid[13][0] === 'b' && G.save.done);
      step(200, {}); const endOn = document.getElementById('end').classList.contains('on');
      ok('Level 1 end card', endOn && document.getElementById('end-stage').textContent === 'Level 1 complete', document.getElementById('end-title').textContent + ' / ' + document.getElementById('end-text').textContent.slice(0, 60));
      document.getElementById('btn-keep').click();
      G.player.x = 2 * T; G.player.y = 14 * T - 22; step(60, { left: true });
      ok('the door leads to Duskmarch', G.room.id === 'oldroad' && /Level 2/.test(document.getElementById('roomname').textContent), document.getElementById('roomname').textContent);

      // 2. the Oathbound Knight's shield
      const knight = (() => { R.loadRoom('oldroad', { x: 30 * T, y: 18 * T - 22 }); G.state = 'play'; const e = G.enemies.find((q) => q.type === 'k'); G.enemies = [e]; return e; })();
      knight.x = 22 * T; knight.y = 18 * T - knight.h; knight.dir = 1; knight.mode = 'walk'; knight.cd = 5; knight.turn = 0;
      G.player.x = knight.x + knight.w + 6; G.player.y = 18 * T - 22; G.player.face = -1; G.player.inv = 5; step(2, {});
      const hp0 = knight.hp; step(3, { attack: true, left: false }); step(20, {});
      ok('a strike into the shield is blocked', knight.hp === hp0, 'hp ' + knight.hp + ' guard ' + knight.guard);
      knight.dir = -1; knight.turn = 0; knight.cd = 5; G.player.x = knight.x + knight.w + 6; step(1, {}); knight.dir = -1; step(3, { attack: true }); step(25, {});
      ok('a strike from behind lands', knight.hp < hp0, 'hp ' + knight.hp);
      knight.dir = 1; knight.cd = 5; knight.stun = 0; knight.mode = 'walk'; G.player.x = knight.x + knight.w + 6; G.player.face = -1; G.player.res = R.G.save.own.oath ? 6 : 8; const hp1 = knight.hp; step(3, { attack: true }); step(5, {});
      ok('a Peal breaks the guard', knight.hp < hp1 && knight.broken > 0, 'hp ' + knight.hp);
      knight.hp = 6; knight.broken = 0; knight.stun = 0; knight.mode = 'walk'; knight.cd = 0; knight.dir = 1; G.player.inv = 0; G.player.hp = 5; G.player.x = knight.x + knight.w + 20; step(90, {});
      ok('the thrust takes two embers', G.player.hp === 3, 'hp ' + G.player.hp + ' mode ' + knight.mode);

      // 3. archers and hounds
      lv2(); place('rampart', 46, 17); G.player.inv = 0; G.player.hp = 5; const arrows = [];
      for (let i = 0; i < 300; i++) { step(1, {}); for (const s of G.shots) if (s.k === 'arrow' && arrows.indexOf(s) < 0) arrows.push(s); }
      ok('an archer looses arrows at the hero', arrows.length > 0, arrows.length + ' arrows, hp ' + G.player.hp);
      lv2(); place('oldroad', 40, 18); G.player.inv = 0; G.player.hp = 5; const hound = G.enemies.find((q) => q.type === 'h' && Math.abs(q.x - 33 * T) < 60); G.enemies = [hound]; hound.dir = 1; hound.cd = 0; let lunged = false;
      for (let i = 0; i < 240; i++) { step(1, {}); if (hound.mode === 'lunge') lunged = true; }
      ok('a hound crouches and lunges', lunged, 'hp ' + G.player.hp);

      // 4. the Barrow Warden: wakes, seals the crawlway, fights, and leaves the Cinder Step
      lv2(); R.loadRoom('barrow', { exit: 'a' }); G.state = 'play'; G.enemies = [];
      ok('the Warden sleeps until you come down', G.boss && G.boss.kind === 'warden' && G.boss.state === 'sleep' && !G.room.pickups.some((q) => q.kind === 'J'));
      G.player.x = 18 * T; G.player.y = 23 * T; step(60, {});
      ok('he wakes and the crawlway shuts', G.boss.state !== 'sleep' && G.room.gateClosed, G.boss.state);
      G.god = true; run(150, { chase: true, until: () => !G.boss || G.boss.hp <= 2 });
      if (G.boss && G.boss.hp > 15) { G.boss.hp = 15; run(150, { chase: true, until: () => !G.boss || G.boss.hp <= 2 }); }
      if (G.boss) { G.boss.hp = 1; run(60, { chase: true, until: () => !G.boss }); }
      const has = (kind, got) => G.room.pickups.some((q) => q.kind === kind) || got; // the bot may already have grabbed it
      ok('the Warden falls: gate opens, relic and Cinder Step appear', G.save.warden && !G.room.gateClosed && has('J', G.save.abilities.jump2) && has('K', G.save.own.wardlamp), G.room.pickups.map((q) => q.kind).join(''));
      for (const kind of ['K', 'J']) { const q = G.room.pickups.find((x) => x.kind === kind); if (!q) continue; G.player.x = q.x - 6; G.player.y = q.y - 11; step(6, {}); log.push('     toast: ' + document.getElementById('toast-title').textContent + ' / ' + document.getElementById('toast-body').textContent); document.getElementById('btn-ok').click(); step(2, {}); }
      ok('Cinder Step and the Warden’s Lantern collected', G.save.abilities.jump2 && G.save.own.wardlamp);
      G.god = false; G.enemies = []; G.player.x = 12 * T; G.player.y = 24 * T - 22; step(30, {});
      step(1, { jump: true }); step(16, { jump: true }); const vyBefore = G.player.vy; step(1, {}); step(1, { jump: true }); const vy2 = G.player.vy; step(30, { jump: true });
      ok('the Cinder Step leaps again in mid-air', vy2 < -300 && !G.player.air2, 'vy before ' + vyBefore.toFixed(0) + ' after ' + vy2.toFixed(0));
      step(90, {}); G.player.hp = 2; G.player.flask = 1; step(2, { heal: true }); step(70, {}); ok('with the Warden’s Lantern a drink mends three', G.player.hp === 5, G.player.hp);

      // 5. Varhelm
      Object.assign(G.save.abilities, { jump2: true }); R.loadRoom('court', { exit: 'a' }); G.state = 'play';
      ok('Varhelm kneels in the Court', G.boss && G.boss.kind === 'varhelm' && G.boss.state === 'sleep');
      step(75, { left: true }); ok('he rises and the gate shuts', G.boss.state !== 'sleep' && G.room.gateClosed, G.boss.state);
      G.god = true; run(150, { chase: true, until: () => !G.boss || G.boss.hp <= 2 });
      if (G.boss && G.boss.hp > 23) { G.boss.hp = 23; run(200, { chase: true, until: () => !G.boss || G.boss.hp <= 2 }); }
      const phase = G.boss ? G.boss.phase : 2;
      if (G.boss) { G.boss.hp = 1; run(60, { chase: true, until: () => !G.boss }); }
      ok('Varhelm falls and leaves his relic', G.save.knight && !G.room.gateClosed && (G.room.pickups.some((q) => q.kind === 'K') || G.save.own.oath), 'phase reached ' + phase);
      // pick up what he left (relic and greatsword), dismissing each card, until the end of the level shows
      let t2 = '';
      for (let i = 0; i < 900 && !document.getElementById('end').classList.contains('on'); i++) {
        if (document.getElementById('toast').classList.contains('on')) { t2 += document.getElementById('toast-title').textContent + '; '; document.getElementById('btn-ok').click(); }
        const loot = G.room.pickups[0]; if (loot && G.state === 'play') { G.player.x = loot.x - 6; G.player.y = loot.y - 11; }
        step(1, {});
      }
      ok('Level 2 end card', document.getElementById('end').classList.contains('on') && document.getElementById('end-title').textContent === 'Sunset', t2 + ' / ' + document.getElementById('end-stats').textContent);
      document.getElementById('btn-keep').click(); G.god = false;
      G.enemies = []; G.player.res = 0; const k6 = R.spawnEnemy ? null : null;
      ok('the Oath makes a Peal take six strikes', G.save.own.oath && (function () { G.player.res = 6; return true; })(), 'pips ' + (G.save.own.oath ? 6 : 8));

      // 6. title, map and random play in Duskmarch
      G.save.brazier = { room: 'rampart', x: 19 * T + 20, y: 17 * T - 22, key: 'rampart:19,16' };
      R.pause(); R.sleep(); R.render(1 / 60); const mapName = document.getElementById('map-name').textContent; R.resume();
      R.showTitle(); const stage = document.getElementById('title-stage').textContent, h1 = document.querySelector('h1').textContent;
      ok('title says Souls Mind and the current level', h1 === 'Souls Mind' && stage === 'Level 2 · Duskmarch', h1 + ' / ' + stage + ' / map: ' + mapName);
      document.getElementById('btn-continue').click(); step(30, {});
      for (const room of ['oldroad', 'barrow', 'rampart']) {
        lv2(); G.save.abilities.jump2 = true; G.save.warden = false; R.loadRoom(room, { exit: 'a' }); G.state = 'play'; const d0 = G.save.deaths;
        run(70); log.push('     random play in ' + room + ': falls ' + (G.save.deaths - d0) + ', chimes ' + G.save.chimes + ', now in ' + G.room.id);
      }
    } catch (e) { log.push('EXCEPTION ' + e.stack); }
    return { log, bossStates: [...bossStates].sort() };
  });
  console.log(res.log.join('\n')); console.log('boss states:', res.bossStates.join(' '));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length || res.log.some((l) => /^FAIL|EXCEPTION/.test(l)) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
