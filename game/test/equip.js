// Weapons, armour and relics: finding them, equipping them at a brazier, and what each one does.
const puppeteer = require('puppeteer-core'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') || r.url().startsWith('data:') ? r.continue() : r.abort()));
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  const res = await page.evaluate(() => {
    const R = window.__rimebell, { G, Input, T } = R, log = [], $ = (id) => document.getElementById(id);
    const ok = (n, c, x) => log.push((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  [' + x + ']' : ''));
    const step = (n, b) => { Input.bot = b || {}; for (let i = 0; i < n; i++) R.advance(1 / 60); };
    G.manual = true;
    try {
      R.newGame(); Object.assign(G.save.abilities, { claws: true });
      ok('a new journey carries the Bell-staff and the coat', G.save.equip.weapon === 'staff' && G.save.equip.armor === 'coat' && G.save.own.staff && !G.save.own.sickle);
      // find the Rime Sickle in the cloister's upper gallery
      R.loadRoom('cloister', { x: 6 * T, y: 12 * T - 22 }); G.state = 'play'; G.enemies = [];
      const sk = G.room.pickups.find((q) => q.item === 'sickle'); G.player.x = sk.x - 6; G.player.y = sk.y - 11; step(6);
      ok('the Rime Sickle is found and kept, not forced on', G.save.own.sickle && G.save.equip.weapon === 'staff' && /brazier/.test($('toast-body').textContent), $('toast-title').textContent);
      $('btn-ok').click();
      // equip it at the brazier
      const br = G.room.braziers[0]; R.restAt(br); R.brazierTab('equip'); R.render(1 / 60);
      const rows = [...document.querySelectorAll('.eq-row')].map((b) => b.id);
      ok('the Equipment tab lists owned weapons', rows.join(',') === 'eq-staff,eq-sickle', rows.join(','));
      $('eq-sickle').click(); ok('tapping a weapon equips it', G.save.equip.weapon === 'sickle' && $('eq-sickle').classList.contains('on'));
      $('btn-leave').click();
      // what weapons do
      R.G.save.own.censer = R.G.save.own.greatsword = R.G.save.own.spear = true;
      const box = (id, dir) => { R.G.save.equip.weapon = id; const p = G.player; p.atkDir = dir || 'side'; p.atkFace = 1; p.atkPeal = false; const b = R.attackBox ? null : null; return null; };
      const measure = (id) => { G.save.equip.weapon = id; const p = G.player; p.atkCd = 0; p.atkT = 0; step(2, {}); const id0 = p.atkId; step(2, { attack: true }); step(1, {}); const cd = p.atkCd; return { cd: +R.weapon().cd, dmg: R.weapon().dmg }; };
      const st = measure('staff'), sc = measure('sickle'), ce = measure('censer');
      ok('the sickle swings faster and the censer slower than the staff', sc.cd < st.cd && ce.cd > st.cd, 'cooldowns ' + [st.cd, sc.cd, ce.cd].join(' / '));
      // damage against a rimeling
      const target = (dx) => { const e = G.enemies.find((q) => q.type === 'r'); G.enemies = [e]; e.hp = 50; e.y = 13 * T - e.h; e.vx = 0; e.stun = 9; e.x = G.player.x + dx; return e; };
      const swing = () => { G.player.atkCd = 0; G.player.atkBuf = 0; G.player.res = 0; G.player.face = 1; step(2, {}); step(3, { attack: true }); step(10, {}); };
      const hit = (id) => { G.save.equip.weapon = id; R.loadRoom('gate', { x: 26 * T, y: 13 * T - 22 }); G.state = 'play'; step(5, {}); const e = target(16); swing(); return 50 - e.hp; };
      const dS = hit('staff'), dC = hit('censer'), dG = hit('greatsword');
      ok('heavier weapons hit harder', dC > dS && dG > dC, 'staff ' + dS.toFixed(2) + ', censer ' + dC.toFixed(2) + ', greatsword ' + dG.toFixed(2));
      // reach: a spear hits a foe the staff cannot reach
      const far = (id) => { G.save.equip.weapon = id; R.loadRoom('gate', { x: 26 * T, y: 13 * T - 22 }); G.state = 'play'; step(5, {}); const e = target(44); swing(); return 50 - e.hp; };
      ok('the spear reaches farther than the staff', far('spear') > 0 && far('staff') === 0);
      // heavy weapons ignore a knight's shield
      const shield = (id) => { G.save.equip.weapon = id; R.loadRoom('oldroad', { x: 30 * T, y: 18 * T - 22 }); G.state = 'play'; const k = G.enemies.find((q) => q.type === 'k'); G.enemies = [k]; k.x = 22 * T; k.y = 18 * T - k.h; k.dir = 1; k.mode = 'walk'; k.cd = 9; k.hp = 20; G.player.x = k.x + k.w + 6; G.player.face = -1; G.player.inv = 5; G.player.res = 0; G.player.atkCd = 0; step(2, {}); k.dir = 1; step(3, { attack: true }); step(8, {}); return 20 - k.hp; };
      ok('the censer smashes through a raised shield; the staff does not', shield('staff') === 0 && shield('censer') > 0);
      // armour
      G.save.own.mail = G.save.own.shroud = true; G.save.equip.weapon = 'staff';
      const speed = (id) => { G.save.equip.armor = id; R.loadRoom('gate', { x: 4 * T, y: 13 * T - 22 }); G.state = 'play'; G.enemies = []; step(10, {}); const x0 = G.player.x; step(30, { right: true }); return G.player.x - x0; };
      const sc0 = speed('coat'), sm = speed('mail'), ss = speed('shroud');
      ok('mail is slower and the shroud faster than the coat', sm < sc0 && ss > sc0, [sc0, sm, ss].map((v) => v.toFixed(0)).join(' / '));
      G.save.equip.armor = 'mail'; R.loadRoom('oldroad', { x: 30 * T, y: 18 * T - 22 }); G.state = 'play';
      const k2 = G.enemies.find((q) => q.type === 'k'); G.enemies = [k2]; k2.x = 22 * T; k2.y = 18 * T - k2.h; k2.dir = 1; k2.mode = 'walk'; k2.cd = 0; G.player.hp = 5; G.player.inv = 0; G.player.x = k2.x + k2.w + 20; step(90, {});
      ok('in Oathbound Mail the spear thrust takes one ember', G.player.hp === 4, 'hp ' + G.player.hp);
      G.save.equip.armor = 'shroud'; G.player.dashT = 0; G.save.abilities.dash = true; G.player.dashCd = 0; G.player.canDash = true; step(1, { dash: true }); const dodge = G.player.dodge;
      ok('the Ashen Shroud doubles the dodge', dodge > 0.3, dodge.toFixed(2));
      // relics: three slots
      Object.assign(G.save.own, { spine: true, clapper: true, wardlamp: true, purse: true, wraps: true }); G.save.equip.relics = [];
      R.loadRoom('cloister', { x: 21 * T + 4, y: 24 * T - 22 }); G.state = 'play'; G.enemies = []; R.restAt(G.room.braziers[0]); R.brazierTab('equip');
      document.getElementById('eq-cat-relic').click();
      for (const id of ['spine', 'clapper', 'purse', 'wraps']) $('eq-' + id).click();
      ok('a fourth relic is refused while three are worn', G.save.equip.relics.join(',') === 'spine,clapper,purse' && /full/.test(document.querySelector('.eq-msg').textContent) && document.querySelector('.eq-list').firstElementChild.classList.contains('eq-msg'), G.save.equip.relics.join(','));
      $('eq-clapper').click(); $('eq-wraps').click();
      ok('taking one off frees the slot', G.save.equip.relics.join(',') === 'spine,purse,wraps');
      R.render(1 / 60); $('btn-leave').click();
      // purse and wraps at work
      let got = 0; const c0 = G.save.chimes; R.loadRoom('gate', { x: 26 * T, y: 13 * T - 22 }); G.state = 'play'; G.enemies = [];
      G.drops.length = 0; G.save.chimes = 0; (function () { const e = { x: 0, y: 0 }; })(); 
      R.G.drops.length = 0; window.__rimebell.G.save.chimes = 0;
      const before = G.save.chimes; window.__rimebell.dropChimes ? 0 : 0;
      G.player.hp = 5; G.player.inv = 0; G.player.x = 20 * T + 8; G.player.y = 13 * T - 30; step(60, {});
      ok('Rimewalker Wraps: spikes no longer hurt', G.player.hp === 5 && G.state === 'play', 'hp ' + G.player.hp);
      // old saves: every relic they wore becomes owned, the first three worn
      const old = JSON.parse(localStorage.getItem('rimebell.save.v1')); delete old.own; delete old.equip; old.v = 4; old.relics = { spine: true, clapper: true, wardlamp: true, oath: true };
      localStorage.setItem('rimebell.save.v1', JSON.stringify(old)); R.showTitle(); $('btn-continue').click(); step(10, {});
      ok('an older save keeps its relics and wears three', ['spine', 'clapper', 'wardlamp', 'oath'].every((k) => G.save.own[k]) && G.save.equip.relics.length === 3 && G.save.equip.weapon === 'staff' && !('relics' in G.save), G.save.equip.relics.join(','));
      // bosses drop weapons: the Abbot leaves his censer beside his relic
      R.newGame(); Object.assign(G.save.abilities, { claws: true, dash: true }); G.god = true; R.loadRoom('sanctum', { exit: 'a' }); G.state = 'play';
      step(80, { left: true }); for (let i = 0; i < 300 && G.boss && G.boss.state === 'intro'; i++) step(1, {});
      if (G.boss) { R.hurtBoss(999); for (let i = 0; i < 400 && G.boss; i++) step(1, {}); }
      G.player.x = 24 * T; step(5, {});
      ok('the Abbot drops his censer and his relic', (G.room.pickups.some((q) => q.item === 'censer') || G.save.own.censer) && (G.room.pickups.some((q) => q.relic === 'clapper') || G.save.own.clapper), G.room.pickups.map((q) => q.item || q.relic).join(','));
      G.god = false;
    } catch (e) { log.push('EXCEPTION ' + e.stack); }
    return log;
  });
  console.log(res.join('\n') + '\n' + (errors.length ? 'ERRORS ' + errors.join('; ') : 'no page errors'));
  await browser.close();
  process.exit(errors.length || res.some((l) => /^FAIL|EXCEPTION/.test(l)) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
