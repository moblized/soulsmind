// ===== game flow, saving, UI, main loop =====
const KEY = 'rimebell.save.v1';
const UPS = {
  staff: { name: 'Temper the staff', what: 'Strikes hit harder', costs: [120, 300] },
  flask: { name: 'Deepen the flask', what: 'One more drink per rest', costs: [80, 160, 280] },
  lantern: { name: 'Feed the lantern', what: 'One more ember of health', costs: [100, 200, 350] },
};
const RELICS = {
  spine: { name: "Matriarch's Spine", what: 'Your strikes reach a third farther.' },
  clapper: { name: 'The Swallowed Clapper', what: 'Your Peal mends one ember.' },
};
function relicPickup(id, x, y) { return { kind: 'K', relic: id, key: 'relic:' + id, x, y }; }
const Store = {
  get() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
  clear() { try { localStorage.removeItem(KEY); } catch (e) {} },
};
function freshSave() {
  return {
    v: 2, abilities: { claws: false, dash: false }, maxHp: 5, lit: { 'gate:3,12': 1 }, got: {}, visited: {}, boss: false, mini: false, done: false, time: 0, deaths: 0,
    chimes: 0, echo: null, up: { staff: 0, flask: 0, lantern: 0 }, relics: { spine: false, clapper: false },
    brazier: { room: 'gate', x: 3 * T + T / 2 + 8, y: 13 * T - 22, key: 'gate:3,12' },
  };
}
function normalizeSave(s) {
  const f = freshSave(); if (!s || typeof s !== 'object' || !ROOMS[(s.brazier || {}).room]) return f;
  return Object.assign(f, s, { v: 2, abilities: Object.assign(f.abilities, s.abilities || {}), up: Object.assign(f.up, s.up || {}), relics: Object.assign(f.relics, s.relics || {}) });
}
function persist() { if (G.save) Store.set(G.save); }
// device settings live apart from the journey, so a new journey keeps them
const Settings = {
  muted: false, vib: true,
  load() { try { const s = JSON.parse(localStorage.getItem('rimebell.settings') || '{}'); this.muted = !!s.muted; this.vib = s.vib !== false; } catch (e) {} },
  save() { try { localStorage.setItem('rimebell.settings', JSON.stringify({ muted: this.muted, vib: this.vib })); } catch (e) {} },
};
// a short rumble through the Android app; does nothing in a browser
function buzz(ms) { if (!G.app || !Settings.vib) return; try { if (window.RimebellApp && window.RimebellApp.buzz) window.RimebellApp.buzz(ms | 0); } catch (e) {} }
function later(t, fn, keep) { G.later.push({ t, fn, keep: !!keep }); }
function fadeOut(dur, cb) { G.fade = { dir: 1, speed: 1 / dur, cb }; }
function updateFade(dt) {
  const f = G.fade; if (!f) return;
  G.fadeA += f.dir * f.speed * dt;
  if (f.dir > 0 && G.fadeA >= 1) { G.fadeA = 1; G.fade = { dir: -1, speed: f.speed }; if (f.cb) f.cb(); }
  else if (f.dir < 0 && G.fadeA <= 0) { G.fadeA = 0; G.fade = null; }
}

function loadRoom(id, spawn) {
  const def = ROOMS[id], grid = buildRoom(def.w, def.h, def.build), S = G.save, p = G.player;
  const room = { id, def, w: def.w, h: def.h, grid, kind: def.kind, gateClosed: false, gateK: 0, braziers: [], signs: [], pickups: [], exitTiles: {}, bell: null };
  for (const d of G.drops) S.chimes += d.v; // chimes still in the air come with you
  G.room = room; G.enemies = []; G.shots = []; G.parts = []; G.drops = []; G.boss = null; G.later = G.later.filter((l) => l.keep); G.nearSign = null; G.nearProp = null; Sfx.mood = 'calm';
  for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) {
    const ch = grid[y][x]; let clear = true;
    if (ch === 'B') { const key = id + ':' + x + ',' + y; room.braziers.push({ x: x * T + T / 2, y: (y + 1) * T, key, lit: !!S.lit[key] }); }
    else if (ch === 'S') room.signs.push({ x: x * T + T / 2, y: (y + 1) * T, text: def.signs[x + ',' + y] || '' });
    else if (ch === '1' || ch === '2' || ch === 'H') {
      const key = id + ':' + ch, pk = { kind: ch, key, x: x * T + T / 2, y: y * T + T / 2 };
      if (ch === '1' && !S.mini) room.clawSpot = pk; // the Matriarch sleeps on these
      else if (!S.got[key]) room.pickups.push(pk);
    }
    else if (ch === 'r' || ch === 'w' || ch === 'm') spawnEnemy(ch, x, y);
    else if (ch === 'Z') { /* the Abbot arrives when the hero steps in */ }
    else if (ch === 'L') room.bell = { x: x * T + T / 2, y: (y + 1) * T, active: !!S.boss, drop: S.boss ? 1 : 0, swing: 0, hitId: -1 };
    else { clear = false; if (def.exits[ch]) (room.exitTiles[ch] = room.exitTiles[ch] || []).push({ x, y }); }
    if (clear) grid[y][x] = '.';
  }
  if (spawn.exit) {
    const ts = room.exitTiles[spawn.exit]; let maxY = 0; for (const t of ts) maxY = Math.max(maxY, t.y);
    p.y = (maxY + 1) * T - p.h;
    if (ts[0].x === 0) { p.x = T + 14; p.face = 1; } else { p.x = ts[0].x * T - 14 - p.w; p.face = -1; }
  } else { p.x = spawn.x; p.y = spawn.y; }
  if (id === 'cellar') { if (!S.mini) spawnMatriarch(); else if (!S.relics.spine) room.pickups.push(relicPickup('spine', 28 * T, PIT.floor - 14)); }
  if (id === 'sanctum' && S.boss && !S.relics.clapper) room.pickups.push(relicPickup('clapper', 8 * T, ARENA.floor - 14));
  if (S.echo && S.echo.room === id) room.echo = S.echo;
  p.vx = 0; p.vy = 0; p.dashT = 0; p.atkT = 0; p.healT = 0; p.sliding = false; p.jumping = false; p.hurtT = 0; p.dead = false; p.hidden = false;
  p.safe.x = p.x; p.safe.y = p.y; p.trail.length = 0; p.wasGround = true; p.coyote = 0;
  S.visited[id] = 1;
  updateCamera(0, true);
  setCaption(null);
  return room;
}

function updateCamera(dt, snap) {
  const p = G.player, room = G.room, V = View, cam = G.cam;
  let tx = p.x + p.w / 2 + p.face * 26 - V.w / 2, ty = p.y + p.h / 2 - V.h * 0.58;
  const maxX = room.w * T - V.w, maxY = room.h * T - V.h;
  tx = maxX < 0 ? maxX / 2 : clamp(tx, 0, maxX); ty = maxY < 0 ? maxY / 2 : clamp(ty, 0, maxY);
  if (snap) { cam.x = tx; cam.y = ty; }
  else { const kx = 1 - Math.exp(-dt * 5), ky = 1 - Math.exp(-dt * 8); cam.x += (tx - cam.x) * kx; cam.y += (ty - cam.y) * ky; }
}

function startTransition(to, at) {
  if (G.state !== 'play') return;
  G.state = 'trans';
  fadeOut(0.16, () => { loadRoom(to, { exit: at }); G.state = 'play'; banner(G.room.def.name); });
}
function killPlayer() {
  const p = G.player, S = G.save; p.dead = true; G.state = 'dead'; S.deaths++; Sfx.play('die'); Sfx.mood = 'calm'; buzz(240);
  // everything you carried stays where you last stood. Fall again before reclaiming it and it is gone.
  S.echo = S.chimes > 0 ? { room: G.room.id, x: p.safe.x + p.w / 2, y: p.safe.y + p.h, n: S.chimes } : null; S.chimes = 0; G.drops = [];
  banner('The cold takes you');
  burst(p.x + p.w / 2, p.y + p.h / 2, 30, 190, '#ffb347', 1, 3, 200); ringFx(p.x + p.w / 2, p.y + p.h / 2, 60, '#ffb347', 0.6);
  later(1.1, () => fadeOut(0.3, respawnAtBrazier));
}
// after a death you wake mended; walking back from the pause menu mends nothing (rest at the brazier for that)
function respawnAtBrazier(walked) {
  const s = G.save.brazier, p = G.player; if (walked !== true) { p.hp = p.maxHp; p.flask = maxFlask(); } p.res = 0; p.inv = 0;
  loadRoom(s.room, { x: s.x, y: s.y }); G.state = 'play'; persist();
}
function recoverFromHazard() {
  G.state = 'hazard';
  later(0.3, () => fadeOut(0.14, () => {
    const p = G.player; p.x = p.safe.x; p.y = p.safe.y; p.vx = 0; p.vy = 0; p.hurtT = 0; p.trail.length = 0; p.wasGround = true;
    updateCamera(0, true); G.state = 'play';
  }));
}
function bossDefeated() {
  const b = G.boss, cx = b.x + b.w / 2, cy = b.y + b.h / 2, S = G.save, room = G.room;
  burst(cx, cy, 40, 240, '#bff4ff', 1.1, 3, 100); burst(cx, cy, 20, 160, '#ffd27a', 1.2, 3, 60); ringFx(cx, cy, 160, '#eafcff', 0.8);
  G.boss = null; G.shots.length = 0; Sfx.mood = 'calm'; Sfx.play('shatter'); buzz(180);
  // loot: a heap of chimes and the boss's relic
  if (b.kind === 'abbot') {
    S.boss = true; room.gateClosed = false; if (room.bell) room.bell.active = true;
    dropChimes(cx, cy, 150); if (!S.relics.clapper) room.pickups.push(relicPickup('clapper', clamp(cx, ARENA.x0 + 40, ARENA.x1 - 40), ARENA.floor - 14));
    banner('The Abbot is silent at last');
  } else {
    S.mini = true; dropChimes(cx, cy, 80);
    if (!S.relics.spine) room.pickups.push(relicPickup('spine', clamp(cx, PIT.x0 + 30, PIT.x1 - 30), PIT.floor - 14));
    if (room.clawSpot && !S.got[room.clawSpot.key]) room.pickups.push(room.clawSpot);
    banner('The pit falls quiet');
  }
  persist();
}
function ringBell() {
  const bell = G.room.bell; bell.swing = 1; Sfx.play('greatbell'); G.shake = Math.max(G.shake, 8);
  for (let i = 0; i < 3; i++) part(bell.x, bell.y - 36, 90 + i * 70, 0, 0.7 + i * 0.25, 0, '#ffd27a', 0, 2);
  burst(bell.x, bell.y - 30, 20, 140, '#ffd27a', 0.9, 2.5, -30);
  if (!G.save.done) { G.save.done = true; persist(); later(2.2, showEnd, true); }
}
function collect(k) {
  const S = G.save, p = G.player; S.got[k.key] = 1;
  G.room.pickups.splice(G.room.pickups.indexOf(k), 1);
  Sfx.play('pickup'); ringFx(k.x, k.y, 70, '#eafcff', 0.6); burst(k.x, k.y, 24, 150, k.kind === 'H' || k.kind === 'K' ? '#ffb347' : '#bff4ff', 0.9, 2.5);
  if (k.kind === '1') { S.abilities.claws = true; toast('Ice Claws', 'Press toward a wall in mid-air to cling. {J} leaps away. Climb by leaping back onto the same wall, or between two.'); }
  else if (k.kind === '2') { S.abilities.dash = true; toast('Gale Sash', '{D} surges forward, on the ground or in the air. One surge per leap.'); layout(); }
  else if (k.kind === 'K') { S.relics[k.relic] = true; toast(RELICS[k.relic].name, 'Boss relic. ' + RELICS[k.relic].what); }
  else { S.maxHp++; p.maxHp = S.maxHp; p.hp = p.maxHp; toast('Ember Shard', 'Your lantern holds one more ember.'); }
  persist();
}
function setCheckpoint(b) { G.save.brazier = { room: G.room.id, x: b.x + 8, y: b.y - G.player.h, key: b.key }; }
function kindle(b) {
  b.lit = true; G.save.lit[b.key] = 1; setCheckpoint(b); persist();
  Sfx.play('brazier'); burst(b.x, b.y - 26, 16, 90, '#ffb347', 0.8, 2, -60); ringFx(b.x, b.y - 24, 50, '#ffb347', 0.5); note('Flame kindled');
}
// Resting mends you and refills the flask, and every foe you felled stands up again.
function restAt(b) {
  const p = G.player; setCheckpoint(b); p.hp = p.maxHp; p.flask = maxFlask(); persist(); Sfx.play('brazier');
  const x = p.x, y = p.y, face = p.face; loadRoom(G.room.id, { x, y }); p.face = face;
  G.state = 'menu'; renderBrazier(); show('brazier', true);
  try { $('btn-leave').focus({ preventScroll: true }); } catch (e) {}
}
function closeBrazier() { if (G.state !== 'menu') return; show('brazier', false); G.state = 'play'; blurAll(); }
function renderBrazier() {
  const S = G.save, box = $('bz-ups'); $('bz-chimes').textContent = S.chimes + (S.chimes === 1 ? ' chime to spend' : ' chimes to spend');
  box.textContent = '';
  for (const k in UPS) {
    const u = UPS[k], cost = u.costs[S.up[k]], btn = document.createElement('button'); btn.type = 'button'; btn.className = 'up';
    const a = document.createElement('b'), w = document.createElement('span'), c = document.createElement('i');
    a.textContent = u.name + (S.up[k] ? ' +' + S.up[k] : ''); w.textContent = cost === undefined ? 'As far as it will go' : u.what; c.textContent = cost === undefined ? 'Done' : cost + ' chimes';
    btn.append(a, w, c); btn.disabled = cost === undefined || S.chimes < cost;
    btn.addEventListener('click', () => buy(k)); box.appendChild(btn);
  }
}
function buy(k) {
  const S = G.save, cost = UPS[k].costs[S.up[k]];
  if (cost === undefined || S.chimes < cost) { Sfx.play('deny'); return; }
  S.chimes -= cost; S.up[k]++;
  if (k === 'lantern') { S.maxHp++; G.player.maxHp = S.maxHp; G.player.hp = S.maxHp; }
  if (k === 'flask') G.player.flask = maxFlask();
  persist(); Sfx.play('buy'); renderBrazier();
  try { $('btn-leave').focus({ preventScroll: true }); } catch (e) {}
}

function resolveCombat() {
  const p = G.player, b = G.boss, pcx = p.x + p.w / 2;
  if (p.atkT > 0) {
    const ab = attackBox(p), dmg = strikeDmg(p.atkPeal); let hit = false;
    const dirX = p.atkDir === 'side' ? p.atkFace : 0, dirY = p.atkDir === 'up' ? -1 : p.atkDir === 'down' ? 1 : 0;
    for (const e of G.enemies) if (!e.dead && e.hitId !== p.atkId && overlap(ab, e)) { e.hitId = p.atkId; hurtEnemy(e, dmg, dirX || (e.x + e.w / 2 > pcx ? 0.5 : -0.5), dirY); hit = true; }
    if (b && bossVulnerable(b) && b.hitId !== p.atkId && overlap(ab, b)) { b.hitId = p.atkId; hurtBoss(dmg); hit = true; }
    for (let i = G.shots.length - 1; i >= 0; i--) { const s = G.shots[i]; if (s.k === 'orb' && overlap(ab, shotBox(s))) { burst(s.x, s.y, 8, 110, '#e9fbff', 0.3, 2); G.shots.splice(i, 1); hit = true; Sfx.play('hit'); } }
    const bell = G.room.bell;
    if (bell && bell.active && bell.drop >= 1 && bell.hitId !== p.atkId && overlap(ab, { x: bell.x - 22, y: bell.y - 64, w: 44, h: 64 })) { bell.hitId = p.atkId; ringBell(); hit = true; }
    if (hit && p.atkDone !== p.atkId) {
      p.atkDone = p.atkId; G.hitstop = Math.max(G.hitstop, p.atkPeal ? 0.08 : 0.04); G.shake = Math.max(G.shake, p.atkPeal ? 6 : 2.5);
      if (!p.atkPeal && p.res < PH.RESMAX) { p.res++; if (p.res >= PH.RESMAX) Sfx.play('charged'); }
      if (p.atkDir === 'down') { p.vy = -400; p.jumping = false; p.canDash = true; }
      else if (p.atkDir === 'side') p.vx -= p.atkFace * 70;
    }
  }
  const body = { x: p.x + 1, y: p.y + 2, w: p.w - 2, h: p.h - 3 };
  for (const e of G.enemies) if (!e.dead && e.stun <= 0 && overlap(body, { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 3 })) { hurtPlayer(e.x + e.w / 2, false, 1); break; }
  const touch = b ? bossTouch(b) : 0;
  if (touch && overlap(body, { x: b.x + 6, y: b.y + 5, w: b.w - 12, h: b.h - 7 })) hurtPlayer(b.x + b.w / 2, false, touch);
  for (const s of G.shots) { if (s.k === 'ice' && s.warn > 0) continue; if (overlap(body, shotBox(s))) { if (hurtPlayer(s.k === 'orb' ? s.x : s.x + s.w / 2, false, s.dmg || 1) && s.k === 'orb') s.life = 0; break; } }
}

function updateWorld(dt) {
  const p = G.player, room = G.room, S = G.save, pcx = p.x + p.w / 2;
  room.gateK = approach(room.gateK, room.gateClosed ? 1 : 0, dt * 5);
  const bell = room.bell;
  if (bell) { if (bell.active && bell.drop < 1) { bell.drop = Math.min(1, bell.drop + dt / 1.4); if (bell.drop >= 1) { G.shake = Math.max(G.shake, 6); Sfx.play('slam'); burst(bell.x, bell.y, 14, 120, '#dff6fb', 0.5, 2.5, 300); } } bell.swing = Math.max(0, bell.swing - dt * 0.5); }
  if (p.dead || G.state !== 'play') return;
  // exits
  const ch = tileAt(room, Math.floor(pcx / T), Math.floor((p.y + p.h / 2) / T)), ex = room.def.exits[ch];
  if (ex) { startTransition(ex[0], ex[1]); return; }
  // pits and icicles
  if (p.y > room.h * T + 40) { if (G.god) { p.x = p.safe.x; p.y = p.safe.y; p.vy = 0; } else { p.inv = 0; hurtPlayer(pcx, true); } return; }
  if (p.inv <= 0 && hazardHit(room, p)) { hurtPlayer(pcx + p.face, true); return; }
  // braziers, tablets, relics
  let nb = null;
  for (const b of room.braziers) if (Math.abs(pcx - b.x) < 18 && Math.abs(p.y + p.h - b.y) < 26) { if (!b.lit) kindle(b); nb = b; }
  let near = null; for (const s of room.signs) if (Math.abs(pcx - s.x) < 20 && Math.abs(p.y + p.h - s.y) < 30) near = s;
  G.nearSign = near; const prop = near || nb;
  if (prop !== G.nearProp) { G.nearProp = prop; setCaption(near ? near.text : nb ? '{R} to rest at the brazier.' : null); }
  if (nb && nb.lit && Input.pressed.up && p.onGround && p.healT <= 0 && !(G.boss && bossAwake(G.boss))) { restAt(nb); return; }
  const echo = room.echo;
  if (echo && Math.abs(pcx - echo.x) < 18 && Math.abs(p.y + p.h - echo.y) < 34) {
    S.chimes += echo.n; S.echo = null; room.echo = null; persist();
    Sfx.play('echo'); ringFx(echo.x, echo.y - 16, 60, '#ffd27a', 0.6); burst(echo.x, echo.y - 16, 18, 120, '#ffd27a', 0.7, 2.5, -40); note(echo.n + ' chimes reclaimed');
  }
  for (const k of room.pickups) if (Math.abs(pcx - k.x) < 16 && Math.abs(p.y + p.h / 2 - k.y) < 20) { collect(k); break; }
  // the Abbot
  if (room.id === 'sanctum' && !S.boss && !G.boss && p.x + p.w < ARENA.trigger) { room.gateClosed = true; spawnBoss(); }
}

function tick(dt) {
  G.time += dt; G.shake = Math.max(0, G.shake - dt * 30);
  if (G.state !== 'play') { if (G.state !== 'pause' && G.state !== 'msg' && G.state !== 'menu') updateParticles(dt); return; }
  if (G.hitstop > 0) { G.hitstop -= dt; return; }
  G.save.time += dt;
  updatePlayer(dt); updateEnemies(dt); updateBoss(dt); updateShots(dt); updateDrops(dt); resolveCombat(); updateWorld(dt); updateParticles(dt); updateCamera(dt, false);
}

// ---------- UI ----------
function show(id, on) { const el = $(id); if (el) el.classList.toggle('on', !!on); }
function setCaption(text) { const el = $('caption'); if (!el) return; G.captionRaw = text || ''; if (text) { el.textContent = Input.fill(text); const rn = $('roomname'); if (rn) rn.classList.remove('show'); } el.classList.toggle('on', !!text); }
function banner(text) { const el = $('roomname'); if (!el) return; el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
function note(text) { const el = $('note'); if (!el) return; el.textContent = text; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
function toast(title, body) { G.state = 'msg'; G.msgT = 0; $('toast-title').textContent = title; $('toast-body').textContent = Input.fill(body); show('toast', true); setCaption(null); }
function dismissToast() { if (G.state !== 'msg') return; show('toast', false); G.state = 'play'; blurAll(); }
function blurAll() { try { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } catch (e) {} }
function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + (r < 10 ? '0' : '') + r; }
function showEnd() {
  if (G.state !== 'play') { later(0.5, showEnd, true); return; }
  const S = G.save; G.state = 'msg'; G.msgT = -99;
  $('end-stats').textContent = 'Time ' + fmtTime(S.time) + '  ·  Falls ' + S.deaths + '  ·  Ember Shard ' + (S.got['gallery:H'] ? 'found' : 'still hidden');
  show('end', true); setCaption(null);
}
function showTitle() {
  const saved = Store.get();
  G.state = 'title'; G.save = freshSave(); G.player = newPlayer(); G.fadeA = 0; G.fade = null;
  // title scene: the hero keeping a flame on the gate steps, placed right of the title text
  const room = loadRoom('gate', { x: 16 * T, y: 11 * T - 22 });
  room.braziers.push({ x: 15 * T, y: 11 * T, key: 'title', lit: true }); G.player.face = -1; G.enemies = [];
  G.cam.x = clamp(G.player.x - View.w * (View.portrait ? 0.6 : 0.7), 0, Math.max(0, room.w * T - View.w));
  for (const k of ['pause', 'toast', 'end', 'brazier']) show(k, false);
  $('btn-continue').hidden = !saved; $('btn-new').textContent = 'New journey'; $('btn-new').classList.toggle('primary', !saved); G.confirmNew = false;
  show('title', true);
  try { (saved ? $('btn-continue') : $('btn-new')).focus({ preventScroll: true }); } catch (e) {}
}
function beginPlay() {
  show('title', false); blurAll();
  const p = (G.player = newPlayer()), b = G.save.brazier; p.maxHp = p.hp = G.save.maxHp; p.flask = maxFlask();
  G.fadeA = 1; G.fade = { dir: -1, speed: 2.2 };
  loadRoom(b.room, { x: b.x, y: b.y }); G.state = 'play'; banner(G.room.def.name); persist();
}
function newGame() { Store.clear(); G.save = freshSave(); beginPlay(); }
function continueGame() { G.save = normalizeSave(Store.get()); beginPlay(); }
function pause() {
  if (G.state !== 'play') return; G.state = 'pause'; show('pause', true); drawMap();
  const S = G.save, own = Object.keys(RELICS).filter((k) => S.relics[k]).map((k) => RELICS[k].name + ': ' + RELICS[k].what);
  $('relics').textContent = (own.length ? own.join(' ') : 'No relics yet. Bosses carry them.') + ' Staff +' + S.up.staff + ', flask ' + maxFlask() + ', ' + S.chimes + ' chimes.';
  const locked = !!(G.boss && bossAwake(G.boss)); $('btn-rest').disabled = locked;
  $('btn-rest').textContent = locked ? 'No escape mid-fight' : 'Walk back to last brazier';   try { $('btn-resume').focus({ preventScroll: true }); } catch (e) {}
}
function resume() { if (G.state !== 'pause') return; show('pause', false); G.state = 'play'; blurAll(); }
// the app shell calls these: sleep/wake when it leaves or returns to the foreground, back for the system Back button
function sleep() { pause(); if (G.state !== 'title' && G.state !== 'boot') persist(); try { if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend(); } catch (e) {} }
function wake() { Sfx.resume(); }
function back() {
  if (G.state === 'play') { pause(); return true; }
  if (G.state === 'pause') { resume(); return true; }
  if (G.state === 'menu') { closeBrazier(); return true; }
  if (G.state === 'msg' && $('toast').classList.contains('on')) { dismissToast(); return true; }
  return false;
}
function soundLabel() {
  const t = 'Sound: ' + (Sfx.muted ? 'off' : 'on'); $('btn-sound').textContent = t; $('btn-psound').textContent = t;
  $('btn-pvib').textContent = 'Vibration: ' + (Settings.vib ? 'on' : 'off');
}
function toggleSound() { Sfx.init(); Sfx.setMuted(!Sfx.muted); Settings.muted = Sfx.muted; Settings.save(); soundLabel(); }
function toggleVib() { Settings.vib = !Settings.vib; Settings.save(); soundLabel(); buzz(40); }
function toggleFull() {
  try {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    const el = document.documentElement, r = el.requestFullscreen && el.requestFullscreen();
    if (r && r.then) r.then(() => { try { const l = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (l && l.catch) l.catch(() => {}); } catch (e) {} }).catch(() => {});
  } catch (e) {}
}
function drawMap() {
  const cv = $('map'); if (!cv || !cv.getContext) return;
  const d = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth || 300, h = cv.clientHeight || 120;
  cv.width = w * d; cv.height = h * d; const c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, w, h);
  const u = Math.min(w / 20.6, h / 6.6), ox = (w - 20 * u) / 2, oy = (h - 6 * u) / 2 - 2 * u, S = G.save;
  for (const id in ROOMS) {
    const m = ROOMS[id].map, seen = !!S.visited[id];
    let hinted = false; for (const o in ROOMS) if (S.visited[o]) for (const e in ROOMS[o].exits) if (ROOMS[o].exits[e][0] === id) hinted = true;
    if (!seen && !hinted) continue;
    const x = ox + m[0] * u + 1.5, y = oy + m[1] * u + 1.5, ww = m[2] * u - 3, hh = m[3] * u - 3, here = G.room.id === id;
    c.setLineDash(seen ? [] : [3, 3]); c.lineWidth = here ? 2 : 1.2;
    c.fillStyle = here ? 'rgba(255,171,61,0.25)' : seen ? 'rgba(143,211,224,0.14)' : 'rgba(0,0,0,0)'; c.fillRect(x, y, ww, hh);
    c.strokeStyle = here ? '#ffab3d' : seen ? '#8fd3e0' : 'rgba(143,211,224,0.4)'; c.strokeRect(x, y, ww, hh);
    if (here) { c.fillStyle = '#ffd27a'; c.beginPath(); c.arc(x + ww / 2, y + hh / 2, 3, 0, TAU); c.fill(); }
  }
  c.setLineDash([]);
  $('map-name').textContent = G.room.def.name;
}

// ---------- touch controls ----------
const Stick = { id: -1, ox: 0, oy: 0, x: 0, y: 0 };
const ptrs = new Map();
function btnAt(x, y) {
  let best = null, bd = 1e9;
  for (const n of ['jump', 'attack', 'dash', 'heal', 'pause']) {
    if (n === 'dash' && !(G.save && G.save.abilities.dash)) continue;
    const b = View.btn[n], d = Math.hypot(x - b.x, y - b.y);
    if (d < b.r * 1.3 && d < bd) { bd = d; best = n; }
  }
  return best;
}
function syncTouch() {
  const t = Input.touch; t.jump = t.attack = t.dash = t.heal = false;
  for (const v of ptrs.values()) if (v.n && v.n !== 'pause') t[v.n] = true;
  const S = Stick; t.left = t.right = t.up = t.down = false;
  if (S.id >= 0) {
    const dx = S.x - S.ox, dy = S.y - S.oy;
    t.left = dx < -12; t.right = dx > 12;
    t.up = dy < -22 && -dy > Math.abs(dx) * 0.75; t.down = dy > 22 && dy > Math.abs(dx) * 0.75;
  }
}
function moveStick(x, y) {
  const S = Stick; S.x = x; S.y = y;
  const dx = x - S.ox, dy = y - S.oy, d = Math.hypot(dx, dy), R = 48;
  if (d > R) { S.ox = x - (dx / d) * R; S.oy = y - (dy / d) * R; }
}
function bindInput() {
  const cv = canvas;
  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); Sfx.init();
    if (e.pointerType !== 'mouse') Input.setDevice('touch');
    if (Input.device !== 'touch') return;
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    const n = btnAt(e.clientX, e.clientY);
    if (n) { ptrs.set(e.pointerId, { n }); Input.edge[n] = true; }
    else if (Stick.id < 0 && e.clientX < View.W * 0.55) { Stick.id = e.pointerId; Stick.ox = e.clientX; Stick.oy = e.clientY; Stick.x = e.clientX; Stick.y = e.clientY; }
    syncTouch();
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerId === Stick.id) { moveStick(e.clientX, e.clientY); syncTouch(); return; }
    const v = ptrs.get(e.pointerId); if (!v) return;
    const n = btnAt(e.clientX, e.clientY);
    if (n !== v.n && n !== 'pause') { v.n = n; if (n) Input.edge[n] = true; syncTouch(); }
  });
  const up = (e) => { if (e.pointerId === Stick.id) Stick.id = -1; ptrs.delete(e.pointerId); syncTouch(); };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const inButton = e.target && e.target.tagName === 'BUTTON';
    if (!inButton && (e.code.startsWith('Arrow') || e.code === 'Space')) e.preventDefault();
    if (e.repeat) return;
    Sfx.init(); Input.keys[e.code] = true;
    if (e.code !== 'Tab' && e.code !== 'Enter') Input.setDevice('keys');
    if (e.code === 'Escape' || e.code === 'KeyP') Input.edge.pause = true;
    if (inButton) return;
    if (e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyK') Input.edge.jump = true;
    if (e.code === 'KeyX' || e.code === 'KeyJ') Input.edge.attack = true;
    if (e.code === 'KeyC' || e.code === 'KeyL' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') Input.edge.dash = true;
    if (e.code === 'KeyV' || e.code === 'KeyF' || e.code === 'KeyQ') Input.edge.heal = true;
  });
  window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in Input.keys) Input.keys[k] = false; ptrs.clear(); Stick.id = -1; syncTouch(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) sleep(); else wake(); });
  window.addEventListener('pagehide', () => { if (G.state !== 'title') persist(); });
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 120));
}
function bindUI() {
  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', () => { Sfx.init(); Sfx.play('ui'); fn(); }); };
  on('btn-continue', continueGame);
  on('btn-new', () => {
    if (Store.get() && !G.confirmNew) { G.confirmNew = true; $('btn-new').textContent = 'Erase the old journey? Press again'; return; }
    newGame();
  });
  on('btn-sound', toggleSound); on('btn-psound', toggleSound); on('btn-full', toggleFull); on('btn-pfull', toggleFull);
  on('btn-resume', resume);
  on('btn-rest', () => { if (G.boss && bossAwake(G.boss)) return; show('pause', false); G.state = 'trans'; fadeOut(0.25, () => respawnAtBrazier(true)); });
  on('btn-pvib', toggleVib);
  on('btn-quit', () => { persist(); showTitle(); });
  on('btn-ok', dismissToast); on('btn-leave', closeBrazier);
  on('btn-keep', () => { show('end', false); G.state = 'play'; blurAll(); });
  on('btn-end-title', () => { persist(); showTitle(); });
  soundLabel();
}

// ---------- main loop ----------
let lastT = 0, acc = 0;
function advance(dt) {
  Input.poll();
  if (Input.pressed.pause) { if (G.state === 'play') pause(); else if (G.state === 'pause') resume(); }
  if (G.state === 'msg') { G.msgT += dt; if (G.msgT > 0.7 && (Input.pressed.jump || Input.pressed.attack)) dismissToast(); }
  for (let i = G.later.length - 1; i >= 0; i--) { const l = G.later[i]; if (!l) continue; l.t -= dt; if (l.t <= 0) { G.later.splice(i, 1); l.fn(); } }
  updateFade(dt);
  acc += dt; let n = 0;
  while (acc >= STEP && n < 12) { tick(STEP); acc -= STEP; n++; if (n === 1) Input.clearPressed(); }
  if (n === 12) acc = 0;
}
function frame(ts) {
  requestAnimationFrame(frame);
  if (G.manual) return; // tests drive the clock themselves
  const now = ts / 1000, dt = Math.min(0.1, lastT ? now - lastT : 0); lastT = now;
  advance(dt); Sfx.music(dt); render(dt);
}
function start(data) {
  canvas = $('game'); ctx = canvas.getContext('2d');
  G.app = !!window.RIMEBELL_APP; if (G.app) document.documentElement.classList.add('app');
  Settings.load(); Sfx.muted = Settings.muted;
  // canvas text does not wait for web fonts, so ask for every face up front
  try { for (const f of ['300 20px "Grenze Gotisch"', '500 20px "Grenze Gotisch"', '400 16px "Alegreya Sans"', '500 16px "Alegreya Sans"', '700 16px "Alegreya Sans"']) document.fonts.load(f).catch(() => {}); } catch (e) {}
  Input.device = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0 ? 'touch' : 'keys';
  Input.onDevice = () => { layout(); if (G.captionRaw) setCaption(G.captionRaw); };
  try { G.reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  layout(); bindInput(); bindUI();
  if (data && data.save && data.playing) { G.save = normalizeSave(data.save); beginPlay(); } else showTitle();
  requestAnimationFrame(frame);
}
window.__rimebell = {
  G, Input, ROOMS, PH, T, STEP, View, ARENA, Sfx, tick, loadRoom, updatePlayer, hazardHit, newPlayer, freshSave, beginPlay, newGame, showTitle,
  layout, render, advance, spawnBoss, spawnMatriarch, hurtBoss, pause, resume, sleep, wake, back, restAt, closeBrazier, buy, PIT, setRnd(f) { rnd = f; },
};
try { const hot = window.claude && window.claude.hot; if (hot && hot.snapshot) hot.snapshot(() => ({ save: G.save, playing: G.state !== 'title' && G.state !== 'boot' })); } catch (e) {}
(function boot() {
  const hot = window.claude && window.claude.hot;
  const go = (d) => { try { start(d || {}); } catch (e) { const el = $('fatal'); if (el) { el.hidden = false; el.textContent = 'Rimebell could not start: ' + e.message; } throw e; } };
  if (hot && hot.ready) hot.ready(go); else go((hot && hot.data) || {});
})();
