// ===== game flow, saving, UI, main loop =====
const KEY = 'rimebell.save.v1';
// ---------- leveling: spend chimes at a brazier to raise one stat per level; each level costs more ----------
const STATS = {
  vit: { name: 'Vitality', cap: 15, label: 'Health', val: (v, S) => String(5 + shardCount(S) + v) },
  mig: { name: 'Might', cap: 10, label: 'Strike damage', val: (v) => Math.round(100 * (1 + 0.15 * v)) + '%' },
  spi: { name: 'Spirit', cap: 4, label: 'Flask drinks', val: (v) => String(2 + v) },
  res: { name: 'Resonance', cap: 6, label: 'Peal', val: (v, S) => '\u00d7' + +(3 * (1 + 0.25 * v)).toFixed(2) + ' (' + pealStrikes(v, S) + ' hits)' },
};
const levelCost = (L) => Math.round(40 + 18 * L + 2.2 * L * L); // chimes to go from level L to L + 1
const charLevel = (S) => 1 + S.stats.vit + S.stats.mig + S.stats.spi + S.stats.res;
const shardCount = (S) => Object.keys(S.got).filter((k) => k.endsWith(':H')).length;
const maxHpOf = (S) => 5 + shardCount(S) + S.stats.vit;
const pealStrikes = (res, S) => Math.max(4, (S.equip.relics.indexOf('oath') >= 0 ? 6 : 8) - Math.floor(res / 2));
// what the old brazier upgrades cost, refunded when an older save is loaded
const OLD_UPS = { staff: [120, 300, 600], flask: [80, 160, 280, 480], lantern: [100, 200, 350, 560] };
// ---------- equipment: one weapon, one armour, three relics; changed at a brazier ----------
const ITEMS = {
  staff: { slot: 'weapon', name: 'Bell-staff', what: 'Even reach and speed. A good teacher.', dmg: 1, reach: 1, cd: 0.36 },
  sickle: { slot: 'weapon', name: 'Rime Sickle', what: 'Light and very quick. Builds a Peal fast, hits soft.', dmg: 0.65, reach: 0.9, cd: 0.2 },
  censer: { slot: 'weapon', name: "Abbot's Censer", what: 'Slow, crushing swings. Shields cannot stop it.', dmg: 1.9, reach: 1.05, cd: 0.62, heavy: true },
  spear: { slot: 'weapon', name: 'Oathbound Spear', what: 'Reaches half again as far to the side.', dmg: 0.95, reach: 1.5, cd: 0.42, long: true },
  greatsword: { slot: 'weapon', name: 'Dusk Greatsword', what: 'Huge, slow sweeps that hit hardest of all. Shields cannot stop it.', dmg: 2.6, reach: 1.35, cd: 0.8, heavy: true },
  coat: { slot: 'armor', name: "Pilgrim's Coat", what: 'Plain wool. Nothing gained, nothing lost.' },
  mail: { slot: 'armor', name: 'Oathbound Mail', what: 'Heavy blows take one ember instead of two. You move a little slower.', speed: 0.88 },
  shroud: { slot: 'armor', name: 'Ashen Shroud', what: 'You move faster, and a dash slips through blows for twice as long.', speed: 1.1, dodge: 2 },
  spine: { slot: 'relic', name: "Matriarch's Spine", what: 'Your strikes reach a third farther.' },
  clapper: { slot: 'relic', name: 'The Swallowed Clapper', what: 'Your Peal mends one ember.' },
  wardlamp: { slot: 'relic', name: "Warden's Lantern", what: 'Each drink from the flask mends three embers.' },
  oath: { slot: 'relic', name: 'Oath of the Unsetting', what: 'Your Peal charges in six strikes instead of eight.' },
  purse: { slot: 'relic', name: 'Chime Purse', what: 'Foes drop a third more chimes.' },
  wraps: { slot: 'relic', name: 'Rimewalker Wraps', what: 'Spikes and icicles no longer hurt you.' },
};
const RELIC_SLOTS = 3;
const SLOT_NAMES = { weapon: 'Weapon', armor: 'Armour', relic: 'Relics' };
const eq = (id) => !!G.save && G.save.equip.relics.indexOf(id) >= 0;
const weapon = () => ITEMS[(G.save && G.save.equip.weapon) || 'staff'];
const armor = () => ITEMS[(G.save && G.save.equip.armor) || 'coat'];
const RELICS = ITEMS; // boss relics are items too
// each boss: the save flag it sets, its relic and weapon, how many chimes it drops, and the ability it sits on (if any)
const BOSSES = {
  cellar: { flag: 'mini', spawn: () => spawnMatriarch(), A: () => PIT, relic: 'spine', chimes: 80, hides: '1', line: 'The pit falls quiet' },
  sanctum: { flag: 'boss', spawn: null, A: () => ARENA, relic: 'clapper', item: 'censer', chimes: 150, line: 'The Abbot is silent at last' },
  barrow: { flag: 'warden', spawn: () => spawnWarden(), A: () => WARD, relic: 'wardlamp', chimes: 220, hides: 'J', line: 'The lantern goes dark' },
  court: { flag: 'knight', spawn: () => spawnVarhelm(), A: () => COURT, relic: 'oath', item: 'greatsword', chimes: 420, line: 'The sun over Duskmarch sets at last' },
};
const ENDS = {
  1: { stage: 'Level 1 complete', title: 'The First Bell', text: 'Its voice rolls down the mountain and wakes the snow from the eaves. Behind you, the west door of the sanctum grinds open onto a road that leads down into a kingdom at dusk.' },
  2: { stage: 'Level 2 complete', title: 'Sunset', text: 'Varhelm lowers his sword, and the sun over Duskmarch finally sets. In the first true dark in a hundred years, a light moves on the far mountains. More levels are coming.' },
};
function relicPickup(id, x, y) { return { kind: 'K', relic: id, key: 'relic:' + id, x, y }; }
function itemPickup(id, x, y) { return { kind: 'E', item: id, key: 'item:' + id, x, y }; }
function wearIfRoom(id) { const r = G.save.equip.relics; if (r.length >= RELIC_SLOTS || r.indexOf(id) >= 0) return false; r.push(id); return true; }
const Store = {
  get() { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} },
  clear() { try { localStorage.removeItem(KEY); } catch (e) {} },
};
function freshSave() {
  return {
    v: 5, abilities: { claws: false, dash: false, jump2: false }, lit: { 'gate:3,12': 1 }, got: {}, visited: {},
    boss: false, mini: false, done: false, warden: false, knight: false, done2: false, time: 0, deaths: 0,
    chimes: 0, echo: null, stats: { vit: 0, mig: 0, spi: 0, res: 0 },
    own: { staff: true, coat: true }, equip: { weapon: 'staff', armor: 'coat', relics: [] },
    brazier: { room: 'gate', x: 3 * T + T / 2 + 8, y: 13 * T - 22, key: 'gate:3,12' },
  };
}
function normalizeSave(s) {
  const f = freshSave(); if (!s || typeof s !== 'object' || !ROOMS[(s.brazier || {}).room]) return f;
  const n = Object.assign(f, s, { v: 5, abilities: Object.assign(f.abilities, s.abilities || {}), stats: Object.assign(f.stats, s.stats || {}),
    own: Object.assign(f.own, s.own || {}), equip: Object.assign(f.equip, s.equip || {}) });
  if (s.relics) { // older saves wore every relic at once; keep them all, wearing the first three
    n.equip.relics = (n.equip.relics || []).slice();
    for (const k in s.relics) if (s.relics[k] && ITEMS[k]) { n.own[k] = true; if (n.equip.relics.length < RELIC_SLOTS && n.equip.relics.indexOf(k) < 0) n.equip.relics.push(k); }
    delete n.relics;
  }
  if (!n.own[n.equip.weapon] || !ITEMS[n.equip.weapon]) n.equip.weapon = 'staff';
  if (!n.own[n.equip.armor] || !ITEMS[n.equip.armor]) n.equip.armor = 'coat';
  n.equip.relics = (n.equip.relics || []).filter((k) => n.own[k] && ITEMS[k] && ITEMS[k].slot === 'relic').slice(0, RELIC_SLOTS);
  if (n.up) { // older saves bought fixed upgrades; give the chimes back so they can be spent on levels
    for (const k in OLD_UPS) for (let i = 0; i < (n.up[k] || 0); i++) n.chimes += OLD_UPS[k][i] || 0;
    delete n.up;
  }
  delete n.maxHp;
  return n;
}
function persist() { if (G.save) Store.set(G.save); }
// device settings live apart from the journey, so a new journey keeps them
const Settings = {
  muted: false, vib: true,
  load() { try { const s = JSON.parse(localStorage.getItem('rimebell.settings') || '{}'); this.muted = !!s.muted; this.vib = s.vib !== false; } catch (e) {} },
  save() { try { localStorage.setItem('rimebell.settings', JSON.stringify({ muted: this.muted, vib: this.vib })); } catch (e) {} },
};
// ---------- app updates: the Android shell finds new releases on GitHub and reports here ----------
const bridge = () => (G.app && window.RimebellApp) || null;
function appVersion() { try { const b = bridge(); return b && b.appVersion ? b.appVersion() : ''; } catch (e) { return ''; } }
const Updater = {
  info: null, mode: 'idle', dismissed: '',
  // the card has one primary action that depends on the moment
  set(mode, text, title) {
    this.mode = mode;
    $('up-title').textContent = title || (this.info ? 'Souls Mind ' + this.info.version + ' is ready' : 'Update');
    $('up-text').textContent = text;
    const go = $('btn-up-go'), bar = $('up-bar');
    bar.hidden = mode !== 'downloading';
    go.hidden = mode === 'downloading' || mode === 'installing';
    go.textContent = mode === 'permission' ? 'Open settings' : mode === 'error' ? 'Try again' : 'Update now';
    $('btn-up-later').textContent = mode === 'installing' ? 'Close' : 'Later';
    $('btn-up-later').hidden = mode === 'downloading';
  },
  show() {
    if (!this.info) return;
    if (this.mode === 'idle') this.set('ready', 'A new version is out (you have ' + (this.info.current || appVersion()) + '). Updating takes a few seconds; the game closes to install it and your progress is kept.');
    show('update', true);
    try { $(this.mode === 'downloading' ? 'btn-up-later' : 'btn-up-go').focus({ preventScroll: true }); } catch (e) {}
  },
  showIfDue() { if (this.info && this.dismissed !== this.info.version) this.show(); },
  hide() { show('update', false); if (this.info) this.dismissed = this.info.version; if (this.mode !== 'downloading' && this.mode !== 'installing') this.mode = 'idle'; },
  primary() {
    const b = bridge(); if (!b) return;
    if (this.mode === 'permission') { b.openInstallSettings(); return; }
    this.set('downloading', 'Downloading the update…'); $('up-fill').style.width = '0%'; b.installUpdate();
  },
};
function appUpdate(info) {
  Updater.info = info; Updater.mode = 'idle';
  if (G.state === 'title' || G.state === 'pause') Updater.show();
}
function updateProgress(p) { if (Updater.mode !== 'downloading') Updater.set('downloading', ''); $('up-fill').style.width = clamp(p, 0, 100) + '%'; $('up-text').textContent = 'Downloading the update… ' + (p | 0) + '%'; }
function updateStatus(s) {
  if (s.kind === 'latest') { $('up-note').textContent = s.text; return; }
  if (!$('update').classList.contains('on') && s.kind === 'error' && !Updater.info) { $('up-note').textContent = s.text; return; }
  Updater.set(s.kind === 'cancelled' ? 'ready' : s.kind, s.text); show('update', true);
}

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
  const room = { id, def, w: def.w, h: def.h, grid, kind: def.kind, level: def.level || 1, gateClosed: false, gateK: 0, braziers: [], signs: [], pickups: [], exitTiles: {}, bell: null, hidden: null };
  const cfg = BOSSES[id];
  for (const d of G.drops) S.chimes += d.v; // chimes still in the air come with you
  G.room = room; G.enemies = []; G.shots = []; G.parts = []; G.drops = []; G.boss = null; G.later = G.later.filter((l) => l.keep); G.nearSign = null; G.nearProp = null; Sfx.mood = 'calm'; Sfx.lv = room.level;
  for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) {
    const ch = grid[y][x]; let clear = true;
    if (ch === 'B') { const key = id + ':' + x + ',' + y; room.braziers.push({ x: x * T + T / 2, y: (y + 1) * T, key, lit: !!S.lit[key] }); }
    else if (ch === 'S') room.signs.push({ x: x * T + T / 2, y: (y + 1) * T, text: def.signs[x + ',' + y] || '' });
    else if (ch === '1' || ch === '2' || ch === 'H' || ch === 'J') {
      const key = id + ':' + ch, pk = { kind: ch, key, x: x * T + T / 2, y: y * T + T / 2 };
      if (cfg && cfg.hides === ch && !S[cfg.flag]) room.hidden = pk; // a boss sits on it
      else if (!S.got[key]) room.pickups.push(pk);
    }
    else if (ch === 'E') { const id = (def.items || {})[x + ',' + y]; if (id && !S.own[id]) room.pickups.push(itemPickup(id, x * T + T / 2, y * T + T / 2)); }
    else if (FOES[ch]) spawnEnemy(ch, x, y);
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
  // doors that stay sealed until something is done
  for (const L in def.locks || {}) if (!S[def.locks[L]]) for (const t of room.exitTiles[L] || []) grid[t.y][t.x] = 'X';
  if (cfg) {
    if (!S[cfg.flag]) { if (cfg.spawn) cfg.spawn(); }
    else {
      const A = cfg.A();
      // left where the boss fell, clear of the great bell
      if (!S.own[cfg.relic]) room.pickups.push(relicPickup(cfg.relic, A.x0 + 5 * T, A.floor - 14));
      if (cfg.item && !S.own[cfg.item]) room.pickups.push(itemPickup(cfg.item, A.x0 + 8 * T, A.floor - 14));
    }
  }
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
  const from = levelOf(G.room.id);
  fadeOut(0.16, () => { loadRoom(to, { exit: at }); G.state = 'play'; enterBanner(from); });
}
function enterBanner(fromLevel) {
  const lv = G.room.level;
  if (lv !== fromLevel) banner('Level ' + lv + ' · ' + LEVELS[lv].name); else banner(G.room.def.name);
}
function openSeal(L) {
  const room = G.room;
  for (const t of room.exitTiles[L] || []) { room.grid[t.y][t.x] = L; burst(t.x * T + T / 2, t.y * T + T / 2, 10, 90, '#ffcf7a', 0.7, 2.5, -20); }
  Sfx.play('slam'); G.shake = Math.max(G.shake, 6);
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
  // loot: a heap of chimes, the boss's relic, and whatever it was guarding
  const cfg = BOSSES[room.id], A = b.A;
  S[cfg.flag] = true; room.gateClosed = false;
  dropChimes(cx, cy, cfg.chimes);
  const lx = clamp(cx, A.x0 + 60, A.x1 - 60);
  if (!S.own[cfg.relic]) room.pickups.push(relicPickup(cfg.relic, lx - (cfg.item ? 26 : 0), A.floor - 14));
  if (cfg.item && !S.own[cfg.item]) room.pickups.push(itemPickup(cfg.item, lx + 26, A.floor - 14));
  if (room.hidden && !S.got[room.hidden.key]) { room.pickups.push(room.hidden); room.hidden = null; }
  if (room.bell) room.bell.active = true;
  banner(cfg.line);
  persist();
}
function ringBell() {
  const bell = G.room.bell; bell.swing = 1; Sfx.play('greatbell'); G.shake = Math.max(G.shake, 8);
  for (let i = 0; i < 3; i++) part(bell.x, bell.y - 36, 90 + i * 70, 0, 0.7 + i * 0.25, 0, '#ffd27a', 0, 2);
  burst(bell.x, bell.y - 30, 20, 140, '#ffd27a', 0.9, 2.5, -30);
  if (!G.save.done) { G.save.done = true; openSeal('b'); persist(); later(2.2, () => showEnd(1), true); }
}
function collect(k) {
  const S = G.save, p = G.player; S.got[k.key] = 1;
  G.room.pickups.splice(G.room.pickups.indexOf(k), 1);
  Sfx.play('pickup'); ringFx(k.x, k.y, 70, '#eafcff', 0.6); burst(k.x, k.y, 24, 150, k.kind === 'H' || k.kind === 'K' ? '#ffb347' : '#bff4ff', 0.9, 2.5);
  if (k.kind === '1') { S.abilities.claws = true; toast('Ice Claws', 'Press toward a wall in mid-air to cling. Keep pressing toward it and hold {J} to climb. Let go of the stick and press {J} to leap away.'); }
  else if (k.kind === '2') { S.abilities.dash = true; toast('Gale Sash', '{D} surges forward, on the ground or in the air. One surge per leap.'); layout(); }
  else if (k.kind === 'J') { S.abilities.jump2 = true; toast('Cinder Step', 'Press {J} again in mid-air to leap off a burst of embers. Once per leap; the ground or a wall gives it back.'); }
  else if (k.kind === 'K') {
    S.own[k.relic] = true; const worn = wearIfRoom(k.relic);
    toast(ITEMS[k.relic].name, 'Boss relic. ' + ITEMS[k.relic].what + (worn ? ' You are wearing it.' : ' Your relic slots are full: wear it at a brazier.'));
    if (k.relic === 'oath' && !S.done2) { S.done2 = true; later(0.6, () => showEnd(2), true); }
  }
  else if (k.kind === 'E') {
    const it = ITEMS[k.item]; S.own[k.item] = true;
    const worn = it.slot === 'relic' && wearIfRoom(k.item);
    toast(it.name, (it.slot === 'weapon' ? 'Weapon. ' : it.slot === 'armor' ? 'Armour. ' : 'Relic. ') + it.what + (worn ? ' You are wearing it.' : ' Equip it at a brazier.'));
  }
  else { p.maxHp = maxHpOf(S); p.hp = p.maxHp; toast('Ember Shard', 'Your lantern holds one more ember.'); }
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
  Lv.pend = { vit: 0, mig: 0, spi: 0, res: 0 }; G.state = 'menu'; renderBrazier(); show('brazier', true);
  try { $('btn-leave').focus({ preventScroll: true }); } catch (e) {}
}
function closeBrazier() { if (G.state !== 'menu') return; show('brazier', false); G.state = 'play'; blurAll(); }
// the level-up screen: allot points with + and -, see the cost and the effect, then confirm
const Lv = { pend: { vit: 0, mig: 0, spi: 0, res: 0 }, tab: 'level', cat: 'weapon', msg: '' };
function pendLevels() { const q = Lv.pend; return q.vit + q.mig + q.spi + q.res; }
function pendCost() { const L = charLevel(G.save); let c = 0; for (let i = 0; i < pendLevels(); i++) c += levelCost(L + i); return c; }
function allot(k, d) {
  const S = G.save, q = Lv.pend, nv = S.stats[k] + q[k] + d;
  if (d < 0 && q[k] <= 0) return;
  if (d > 0 && (nv > STATS[k].cap || S.chimes - pendCost() < levelCost(charLevel(S) + pendLevels()))) { Sfx.play('deny'); return; }
  q[k] += d; Sfx.play('ui'); renderBrazier();
}
function confirmLevel() {
  const S = G.save, p = G.player, n = pendLevels(); if (!n) return;
  S.chimes -= pendCost(); for (const k in Lv.pend) { S.stats[k] += Lv.pend[k]; Lv.pend[k] = 0; }
  p.maxHp = maxHpOf(S); p.hp = p.maxHp; p.flask = maxFlask(); persist();
  Sfx.play('buy'); buzz(60); ringFx(p.x + p.w / 2, p.y + p.h / 2, 60, '#ffcf7a', 0.6); burst(p.x + p.w / 2, p.y + p.h / 2, 18, 120, '#ffcf7a', 0.8, 2.5, -40);
  renderBrazier(); note('Level ' + charLevel(S));
}
function renderBrazier() {
  const lvl = Lv.tab !== 'equip';
  $('tab-level').setAttribute('aria-selected', String(lvl)); $('tab-equip').setAttribute('aria-selected', String(!lvl));
  $('tab-level').classList.toggle('on', lvl); $('tab-equip').classList.toggle('on', !lvl);
  $('btn-lv-ok').hidden = !lvl;
  if (lvl) renderLevel(); else renderEquip();
}
function brazierTab(t) { Lv.tab = t; Lv.msg = ''; Sfx.play('ui'); renderBrazier(); }
function summary(rows) {
  const dl = $('lv-sum'); dl.textContent = '';
  for (const [k, v, cls, id] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; if (cls) dd.className = cls; if (id) dd.id = id; dl.append(dt, dd); }
}
function renderLevel() {
  const S = G.save, L = charLevel(S), P = pendLevels(), cost = pendCost(), left = S.chimes - cost, next = levelCost(L + P);
  const keep = document.activeElement && document.activeElement.id;
  summary([['Level', P ? L + ' \u2192 ' + (L + P) : String(L), '', 'lv-level'], ['Chimes', P ? S.chimes + ' \u2192 ' + left : String(S.chimes), '', 'lv-chimes'], ['Next level', next + ' chimes', left < next ? 'short' : '', 'lv-next']]);
  const ok = $('btn-lv-ok'); ok.disabled = !P; ok.textContent = P ? 'Level up (' + cost + ')' : 'Level up';
  const box = $('lv-stats'); box.textContent = '';
  for (const k in STATS) {
    const st = STATS[k], cur = S.stats[k], nv = cur + Lv.pend[k], row = document.createElement('div'); row.className = 'lv-row' + (Lv.pend[k] ? ' up' : '');
    const minus = document.createElement('button'), plus = document.createElement('button'), info = document.createElement('div');
    minus.type = plus.type = 'button'; minus.className = plus.className = 'lv-btn';
    minus.id = 'lv-' + k + '-minus'; plus.id = 'lv-' + k + '-plus'; minus.textContent = '\u2212'; plus.textContent = '+';
    minus.setAttribute('aria-label', 'Lower ' + st.name); plus.setAttribute('aria-label', 'Raise ' + st.name);
    minus.disabled = !Lv.pend[k]; plus.disabled = nv >= st.cap || left < next;
    minus.addEventListener('click', () => allot(k, -1)); plus.addEventListener('click', () => allot(k, 1));
    const name = document.createElement('b'), eff = document.createElement('span');
    name.textContent = st.name + '  ' + (Lv.pend[k] ? cur + ' \u2192 ' + nv : cur) + (nv >= st.cap ? ' (max)' : '');
    eff.textContent = st.label + ' ' + (Lv.pend[k] ? st.val(cur, S) + ' \u2192 ' + st.val(nv, S) : st.val(cur, S));
    info.className = 'lv-info'; info.append(name, eff); row.append(minus, info, plus); box.appendChild(row);
  }
  try { const el = keep && $(keep); (el && !el.disabled ? el : $(P ? 'btn-lv-ok' : 'lv-vit-plus').disabled ? $('btn-leave') : $(P ? 'btn-lv-ok' : 'lv-vit-plus')).focus({ preventScroll: true }); } catch (e) {}
}
// equipment: pick a category, then tap an item to wear it (relics toggle, up to three)
function renderEquip() {
  const S = G.save, E = S.equip, keep = document.activeElement && document.activeElement.id;
  summary([['Weapon', ITEMS[E.weapon].name], ['Armour', ITEMS[E.armor].name], ['Relics', E.relics.length + ' of ' + RELIC_SLOTS + ' worn']]);
  const box = $('lv-stats'); box.textContent = '';
  const seg = document.createElement('div'); seg.className = 'seg cats';
  for (const c of ['weapon', 'armor', 'relic']) {
    const b = document.createElement('button'); b.type = 'button'; b.id = 'eq-cat-' + c; b.className = Lv.cat === c ? 'on' : '';
    b.textContent = SLOT_NAMES[c] + (c === 'relic' ? ' ' + E.relics.length + '/' + RELIC_SLOTS : '');
    b.setAttribute('aria-pressed', String(Lv.cat === c)); b.addEventListener('click', () => { Lv.cat = c; Lv.msg = ''; Sfx.play('ui'); renderEquip(); });
    seg.appendChild(b);
  }
  box.appendChild(seg);
  const list = document.createElement('div'); list.className = 'eq-list';
  if (Lv.msg) { const m = document.createElement('p'); m.className = 'eq-msg'; m.setAttribute('role', 'status'); m.textContent = Lv.msg; list.appendChild(m); }
  for (const id in ITEMS) {
    const it = ITEMS[id]; if (it.slot !== Lv.cat || !S.own[id]) continue;
    const on = it.slot === 'relic' ? E.relics.indexOf(id) >= 0 : E[it.slot] === id;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'eq-' + id; b.className = 'eq-row' + (on ? ' on' : '');
    b.setAttribute('aria-pressed', String(on));
    const n = document.createElement('b'), w = document.createElement('span'), tag = document.createElement('i');
    n.textContent = it.name; w.textContent = it.what; tag.textContent = on ? (it.slot === 'relic' ? 'Worn' : 'Equipped') : it.slot === 'relic' ? 'Wear' : 'Equip';
    b.append(n, w, tag); b.addEventListener('click', () => equipItem(id)); list.appendChild(b);
  }
  if (!list.querySelector('.eq-row')) { const m = document.createElement('p'); m.className = 'eq-msg'; m.textContent = 'Nothing here yet. Bosses and hidden corners hold more.'; list.appendChild(m); }
  box.appendChild(list);
  try { const el = keep && $(keep); (el || $('eq-cat-' + Lv.cat)).focus({ preventScroll: true }); } catch (e) {}
}
function equipItem(id) {
  const S = G.save, it = ITEMS[id], E = S.equip; Lv.msg = '';
  if (!S.own[id]) return;
  if (it.slot === 'relic') {
    const i = E.relics.indexOf(id);
    if (i >= 0) E.relics.splice(i, 1);
    else if (E.relics.length >= RELIC_SLOTS) { Lv.msg = 'All three relic slots are full. Take one off first.'; Sfx.play('deny'); renderEquip(); return; }
    else E.relics.push(id);
  } else E[it.slot] = id;
  persist(); Sfx.play('buy'); renderEquip();
}

function resolveCombat() {
  const p = G.player, b = G.boss, pcx = p.x + p.w / 2;
  if (p.atkT > 0) {
    const ab = attackBox(p), dmg = strikeDmg(p.atkPeal); let hit = false;
    const dirX = p.atkDir === 'side' ? p.atkFace : 0, dirY = p.atkDir === 'up' ? -1 : p.atkDir === 'down' ? 1 : 0;
    let blocked = null;
    for (const e of G.enemies) if (!e.dead && e.hitId !== p.atkId && overlap(ab, e)) {
      e.hitId = p.atkId;
      if (knightBlocks(e, p)) { blocked = e; continue; }
      if (e.type === 'k' && p.atkPeal) e.broken = 1.4; // a Peal knocks the shield aside
      hurtEnemy(e, dmg, dirX || (e.x + e.w / 2 > pcx ? 0.5 : -0.5), dirY); hit = true;
    }
    if (blocked && !hit) {
      Sfx.play('clang'); G.hitstop = Math.max(G.hitstop, 0.05); G.shake = Math.max(G.shake, 2); p.vx = -p.atkFace * 200;
      burst(blocked.x + blocked.w / 2 + blocked.dir * 9, blocked.y + 14, 8, 160, '#ffe6a0', 0.25, 1.5);
    }
    if (b && bossVulnerable(b) && b.hitId !== p.atkId && overlap(ab, b)) { b.hitId = p.atkId; hurtBoss(dmg); hit = true; }
    for (let i = G.shots.length - 1; i >= 0; i--) { const s = G.shots[i]; if ((s.k === 'orb' || s.k === 'arrow') && overlap(ab, shotBox(s))) { burst(s.x, s.y, 8, 110, '#e9fbff', 0.3, 2); G.shots.splice(i, 1); hit = true; Sfx.play('hit'); } }
    const bell = G.room.bell;
    if (bell && bell.active && bell.drop >= 1 && bell.hitId !== p.atkId && overlap(ab, { x: bell.x - 22, y: bell.y - 64, w: 44, h: 64 })) { bell.hitId = p.atkId; ringBell(); hit = true; }
    if (hit && p.atkDone !== p.atkId) {
      p.atkDone = p.atkId; G.hitstop = Math.max(G.hitstop, p.atkPeal ? 0.08 : 0.04); G.shake = Math.max(G.shake, p.atkPeal ? 6 : 2.5);
      if (!p.atkPeal && p.res < resMax()) { p.res++; if (p.res >= resMax()) Sfx.play('charged'); }
      if (p.atkDir === 'down') { p.vy = -400; p.jumping = false; p.canDash = true; p.air2 = true; }
      else if (p.atkDir === 'side') p.vx -= p.atkFace * 70;
    }
  }
  const body = { x: p.x + 1, y: p.y + 2, w: p.w - 2, h: p.h - 3 };
  for (const e of G.enemies) if (!e.dead && e.stun <= 0 && overlap(body, { x: e.x + 2, y: e.y + 2, w: e.w - 4, h: e.h - 3 })) { hurtPlayer(e.x + e.w / 2, false, 1); break; }
  for (const e of G.enemies) if (!e.dead && e.hit && overlap(body, e.hit)) { hurtPlayer(e.x + e.w / 2, false, e.hit.dmg); break; }
  if (b && b.hit && overlap(body, b.hit)) hurtPlayer(b.x + b.w / 2, false, b.hit.dmg);
  const touch = b ? bossTouch(b) : 0;
  if (touch && overlap(body, { x: b.x + 6, y: b.y + 5, w: b.w - 12, h: b.h - 7 })) hurtPlayer(b.x + b.w / 2, false, touch);
  for (const s of G.shots) {
    if ((s.k === 'ice' || s.k === 'blade') && s.warn > 0) continue;
    if (overlap(body, shotBox(s))) { const pt = s.k === 'orb' || s.k === 'arrow' || s.k === 'fire'; if (hurtPlayer(pt ? s.x : s.x + s.w / 2, false, s.dmg || 1) && (s.k === 'orb' || s.k === 'arrow')) s.life = 0; break; }
  }
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
  if (p.inv <= 0 && !eq('wraps') && hazardHit(room, p)) { hurtPlayer(pcx + p.face, true); return; }
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
function showEnd(level) {
  if (G.state !== 'play') { later(0.5, () => showEnd(level), true); return; }
  const S = G.save, E = ENDS[level], shards = ['gallery:H', 'barrow:H'].filter((k) => S.got[k]).length;
  G.state = 'msg'; G.msgT = -99;
  $('end-stage').textContent = E.stage; $('end-title').textContent = E.title; $('end-text').textContent = E.text;
  $('end-stats').textContent = 'Time ' + fmtTime(S.time) + '  ·  Falls ' + S.deaths + '  ·  Ember Shards ' + shards + ' of 2';
  show('end', true); setCaption(null);
}
function showTitle() {
  const saved = Store.get();
  G.state = 'title'; G.save = freshSave(); G.player = newPlayer(); G.fadeA = 0; G.fade = null;
  // title scene: the hero keeping a flame on the gate steps, placed right of the title text
  const room = loadRoom('gate', { x: 16 * T, y: 11 * T - 22 });
  room.braziers.push({ x: 15 * T, y: 11 * T, key: 'title', lit: true }); G.player.face = -1; G.enemies = [];
  G.cam.x = clamp(G.player.x - View.w * (View.portrait ? 0.6 : 0.86), 0, Math.max(0, room.w * T - View.w));
  for (const k of ['pause', 'toast', 'end', 'brazier']) show(k, false);
  $('btn-continue').hidden = !saved; $('btn-new').textContent = 'New journey'; $('btn-new').classList.toggle('primary', !saved); G.confirmNew = false;
  const lv = saved && saved.brazier && ROOMS[saved.brazier.room] ? levelOf(saved.brazier.room) : 1;
  $('title-stage').textContent = 'Level ' + lv + ' · ' + LEVELS[lv].name; $('title-tag').textContent = LEVELS[lv].tag;
  show('title', true);
  try { (saved ? $('btn-continue') : $('btn-new')).focus({ preventScroll: true }); } catch (e) {}
  Updater.showIfDue();
}
function beginPlay() {
  show('title', false); blurAll();
  const p = (G.player = newPlayer()), b = G.save.brazier; p.maxHp = p.hp = maxHpOf(G.save); p.flask = maxFlask();
  G.fadeA = 1; G.fade = { dir: -1, speed: 2.2 };
  loadRoom(b.room, { x: b.x, y: b.y }); G.state = 'play'; enterBanner(0); persist();
}
function newGame() { Store.clear(); G.save = freshSave(); beginPlay(); }
function continueGame() { G.save = normalizeSave(Store.get()); beginPlay(); }
function pause() {
  if (G.state !== 'play') return; G.state = 'pause'; show('pause', true); drawMap();
  const S = G.save, worn = S.equip.relics.map((k) => ITEMS[k].name + ': ' + ITEMS[k].what);
  $('relics').textContent = weapon().name + ', ' + armor().name + '. ' + (worn.length ? 'Relics: ' + worn.join(' ') : 'No relics worn.') + ' Level ' + charLevel(S) + ': ' + Object.keys(STATS).map((k) => STATS[k].name + ' ' + S.stats[k]).join(', ') + '. ' + S.chimes + ' chimes.';
  if (G.app) { const v = appVersion(); $('up-note').textContent = v ? 'Version ' + v : ''; }
  Updater.showIfDue();
  const locked = !!(G.boss && bossAwake(G.boss)); $('btn-rest').disabled = locked;
  $('btn-rest').textContent = locked ? 'No escape mid-fight' : 'Walk back to last brazier';
  try { $('btn-resume').focus({ preventScroll: true }); } catch (e) {}
}
function resume() { if (G.state !== 'pause') return; Updater.hide(); show('pause', false); G.state = 'play'; blurAll(); }
// the app shell calls these: sleep/wake when it leaves or returns to the foreground, back for the system Back button
function sleep() { pause(); if (G.state !== 'title' && G.state !== 'boot') persist(); try { if (Sfx.ctx && Sfx.ctx.state === 'running') Sfx.ctx.suspend(); } catch (e) {} }
function wake() {
  Sfx.resume();
  if (Updater.mode === 'permission') Updater.set('ready', 'If you allowed it, tap Update now to download and install.');
}
function back() {
  if ($('update').classList.contains('on') && Updater.mode !== 'downloading') { Updater.hide(); return true; }
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
  // each level has its own map
  const S = G.save, lv = G.room.level, ids = Object.keys(ROOMS).filter((id) => levelOf(id) === lv);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const id of ids) { const m = ROOMS[id].map; x0 = Math.min(x0, m[0]); y0 = Math.min(y0, m[1]); x1 = Math.max(x1, m[0] + m[2]); y1 = Math.max(y1, m[1] + m[3]); }
  const u = Math.min(w / (x1 - x0 + 0.6), h / (y1 - y0 + 0.6)), ox = (w - (x1 - x0) * u) / 2 - x0 * u, oy = (h - (y1 - y0) * u) / 2 - y0 * u;
  for (const id of ids) {
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
  $('map-name').textContent = 'Level ' + lv + ' · ' + LEVELS[lv].name + ' · ' + G.room.def.name;
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
  on('btn-ok', dismissToast); on('btn-leave', closeBrazier); on('btn-lv-ok', confirmLevel);
  on('tab-level', () => brazierTab('level')); on('tab-equip', () => brazierTab('equip'));
  on('btn-up-go', () => Updater.primary()); on('btn-up-later', () => Updater.hide());
  on('btn-pupdate', () => { const b = bridge(); if (b) { $('up-note').textContent = 'Checking GitHub for updates…'; b.checkUpdate(); } });
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
  appUpdate, updateProgress, updateStatus, Updater,
  layout, render, advance, spawnBoss, spawnMatriarch, spawnWarden, spawnVarhelm, hurtBoss, WARD, COURT, LEVELS, openSeal, pause, resume, sleep, wake, back, restAt, closeBrazier, allot, confirmLevel, equipItem, brazierTab, ITEMS, weapon, armor, eq, levelCost, charLevel, maxHpOf, PIT, setRnd(f) { rnd = f; },
};
try { const hot = window.claude && window.claude.hot; if (hot && hot.snapshot) hot.snapshot(() => ({ save: G.save, playing: G.state !== 'title' && G.state !== 'boot' })); } catch (e) {}
(function boot() {
  const hot = window.claude && window.claude.hot;
  const go = (d) => { try { start(d || {}); } catch (e) { const el = $('fatal'); if (el) { el.hidden = false; el.textContent = 'Souls Mind could not start: ' + e.message; } throw e; } };
  if (hot && hot.ready) hot.ready(go); else go((hot && hot.data) || {});
})();
