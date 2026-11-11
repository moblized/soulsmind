// Travel between braziers: the Travel tab lists every lit brazier by level, takes you there, and makes it your checkpoint.
const puppeteer = require('puppeteer-core'), path = require('path');
const file = process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.setRequestInterception(true);
  page.on('request', (r) => (r.url().startsWith('file:') || r.url().startsWith('data:') ? r.continue() : r.abort()));
  const errors = []; page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto('file://' + file, { waitUntil: 'domcontentloaded' });
  const res = await page.evaluate(async () => {
    const R = window.__rimebell, { G, Input, T } = R, log = [], $ = (id) => document.getElementById(id);
    const ok = (name, cond, extra) => log.push((cond ? 'ok   ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
    G.manual = true;
    const step = (n, b) => { Input.bot = b || {}; for (let i = 0; i < n; i++) { R.advance(1 / 60); if (i % 9 === 0) R.render(1 / 60); } };
    try {
      const all = R.allBraziers();
      ok('every brazier in the game is known, each with a name', all.length >= 16 && all.every((b) => b.name && R.ROOMS[b.room]), all.length + ' braziers: ' + all.map((b) => b.name).join(', '));
      R.newGame(); Object.assign(G.save.abilities, { claws: true, dash: true, jump2: true, glide: true });
      Object.assign(G.save, { boss: true, mini: true, done: true, warden: true, knight: true, done2: true, moth: true });
      for (const k of ['cloister:21,23', 'oldroad:46,17', 'rampart:19,16', 'rampart:50,16', 'stair:30,31', 'bridge:6,10']) G.save.lit[k] = 1;
      R.loadRoom('cloister', { x: 21 * T + 4, y: 24 * T - 22 }); G.state = 'play'; G.enemies = []; step(10, {}); step(2, { up: true }); step(5, {});
      ok('resting opens the brazier menu', G.state === 'menu' && $('brazier').classList.contains('on'));
      $('tab-travel').click();
      const rows = [...document.querySelectorAll('#lv-stats .eq-row')], heads = [...document.querySelectorAll('#lv-stats .tv-level')].map((h) => h.textContent);
      ok('the Travel tab lists only the lit braziers, grouped by level', rows.length === 7 && heads.join('|') === 'Level 1 · Rimebell|Level 2 · Duskmarch|Level 3 · Starwell', rows.length + ' rows; ' + heads.join(' / '));
      const here = rows.find((r) => r.disabled);
      ok('the brazier you rest at is marked and cannot be picked', here && /Frozen Cloister/.test(here.textContent) && /Here/.test(here.textContent), here && here.textContent);
      ok('two braziers in one room are told apart', rows.some((r) => /Rampart Walk \(west\)/.test(r.textContent)) && rows.some((r) => /Rampart Walk \(east\)/.test(r.textContent)));
      await new Promise((r) => setTimeout(r, 50));
      window.__travelShot = true;
      return { log, pending: true };
    } catch (e) { log.push('EXCEPTION ' + e.stack); return { log }; }
  });
  await page.screenshot({ path: path.join(__dirname, 'travel.png') });
  const res2 = await page.evaluate(() => {
    const R = window.__rimebell, { G, Input, T } = R, log = [], $ = (id) => document.getElementById(id);
    const ok = (name, cond, extra) => log.push((cond ? 'ok   ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
    const step = (n, b) => { Input.bot = b || {}; for (let i = 0; i < n; i++) { R.advance(1 / 60); if (i % 9 === 0) R.render(1 / 60); } };
    try {
      const row = [...document.querySelectorAll('#lv-stats .eq-row')].find((r) => /Switchback Stair/.test(r.textContent)); row.click(); step(90, {});
      ok('picking one takes you there', G.state === 'play' && G.room.id === 'stair' && !$('brazier').classList.contains('on'), G.room.id + ' ' + G.state);
      const b = G.room.braziers[0];
      ok('you arrive beside its flame, mended, and it is your checkpoint now', Math.abs(G.player.x - b.x) < 24 && G.player.onGround && G.save.brazier.key === 'stair:30,31' && G.player.hp === G.player.maxHp);
      ok('the banner names the new level', /Level 3/.test($('roomname').textContent), $('roomname').textContent);
      // a falling star finishes the hero off
      G.save.chimes = 0; G.player.hp = 1; G.player.inv = 0; G.enemies = [];
      G.shots.push({ k: 'fstar', x: G.player.x, y: G.player.y - 40, w: 10, h: 12, warn: 0, vy: 300, floor: G.player.y + 22, dmg: 1 }); step(200, {});
      ok('falling again wakes you at the brazier you travelled to', G.room.id === 'stair' && G.save.deaths === 1 && Math.abs(G.player.x - (b.x + 8)) < 30, 'deaths ' + G.save.deaths + ', room ' + G.room.id);
      // travel back across levels, then reload the save
      step(10, {}); G.player.x = b.x - 4; G.player.y = b.y - 22; step(10, {}); step(2, { up: true }); step(5, {}); $('tab-travel').click();
      [...document.querySelectorAll('#lv-stats .eq-row')].find((r) => /Pilgrim/.test(r.textContent)).click(); step(90, {});
      ok('and back down to Level 1', G.room.id === 'gate' && G.save.brazier.key === 'gate:3,12' && /Level 1/.test($('roomname').textContent));
      R.showTitle(); ok('the title then shows Level 1', $('title-stage').textContent === 'Level 1 · Rimebell', $('title-stage').textContent);
      $('btn-continue').click(); step(30, {});
      ok('continuing wakes you at the gate', G.room.id === 'gate');
    } catch (e) { log.push('EXCEPTION ' + e.stack); }
    return { log };
  });
  console.log(res.log.concat(res2.log).join('\n'));
  console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
  await browser.close();
  process.exit(errors.length || res.log.concat(res2.log).some((l) => /^FAIL|EXCEPTION/.test(l)) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
