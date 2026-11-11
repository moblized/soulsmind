// ===== Level 2 foes: Barrow Hound, Oathbound Knight, Ash Archer; bosses: the Barrow Warden and Varhelm =====
Object.assign(FOES, {
  h: { w: 22, h: 14, hp: 3, chimes: 9, dusk: true },
  k: { w: 18, h: 28, hp: 6, chimes: 20, dusk: true },
  q: { w: 14, h: 26, hp: 2, chimes: 12, dusk: true }, // letters a-d are doorways, so the archer is q
});

// is there floor to stand on one step ahead?
function groundAhead(e, room, dir) {
  const ax = dir > 0 ? e.x + e.w + 2 : e.x - 2, tx = Math.floor(ax / T), ty = Math.floor((e.y + e.h + 2) / T);
  const ahead = tileAt(room, tx, ty - 1), below = tileAt(room, tx, ty);
  return (below === '#' || below === '=') && ahead !== '^' && !room.def.exits[ahead] && tx > 0 && tx < room.w - 1;
}
function lineOfSight(x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10);
  for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(G.room, Math.floor(lerp(x0, x1, t) / T), Math.floor(lerp(y0, y1, t) / T))) return false; }
  return true;
}
// a knight's shield stops strikes from the front, unless it is a Peal or a strike from above
function knightBlocks(e, p) {
  return e.type === 'k' && e.guard && !p.atkPeal && !weapon().heavy && p.atkDir !== 'down' && Math.sign(p.x + p.w / 2 - (e.x + e.w / 2)) === e.dir;
}

function updateDuskFoe(e, dt, dx, dy, d) {
  const room = G.room; e.hit = null; e.mt = (e.mt || 0) + dt; e.cd = Math.max(0, e.cd - dt);
  e.vy = Math.min(e.vy + 1400 * dt, 520);
  if (e.type === 'h') hound(e, dt, dx, dy, room);
  else if (e.type === 'k') knight(e, dt, dx, dy, room);
  else archer(e, dt, dx, dy, d, room);
  if (e.y > room.h * T + 60) e.dead = true;
}

// Barrow Hound: patrols, growls, crouches, then lunges. Turns quickly.
function hound(e, dt, dx, dy, room) {
  const sees = Math.abs(dy) < 28 && Math.abs(dx) < 175;
  if (e.stun > 0) { e.stun -= dt; e.vx = approach(e.vx, 0, 500 * dt); if (e.mode === 'lunge' || e.mode === 'crouch') { e.mode = 'rest'; e.mt = 0; } }
  else switch (e.mode || 'walk') {
    case 'walk':
      if (sees && Math.sign(dx) !== e.dir && Math.abs(dx) < 130) { e.turn = (e.turn || 0) + dt; if (e.turn > 0.22) { e.dir = -e.dir; e.turn = 0; } } else e.turn = 0;
      e.vx = e.dir * (sees ? 72 : 44);
      if (sees && Math.sign(dx) === e.dir && e.cd <= 0 && Math.abs(dx) < 150) { e.mode = 'crouch'; e.mt = 0; e.vx = 0; Sfx.play('growl'); }
      break;
    case 'crouch': e.vx = 0; if (e.mt > 0.38) { e.mode = 'lunge'; e.mt = 0; e.vx = e.dir * 310; e.vy = -190; } break;
    case 'lunge': if (e.onGround && e.mt > 0.12) { e.mode = 'rest'; e.mt = 0; } break;
    case 'rest': e.vx = approach(e.vx, 0, 900 * dt); if (e.mt > 0.5) { e.mode = 'walk'; e.cd = 0.7; } break;
  }
  if (e.onGround && e.mode !== 'lunge' && e.stun <= 0 && !groundAhead(e, room, e.dir)) {
    if (sees && e.mode !== 'rest') e.vx = 0; else if (!e.mode || e.mode === 'walk') { e.dir = -e.dir; e.vx = 0; }
  }
  moveX(e, e.vx * dt, room); if (e.hitWall && (!e.mode || e.mode === 'walk')) e.dir = -e.hitWall;
  moveY(e, e.vy * dt, room);
}

// Oathbound Knight: advances behind a tower shield, turns slowly, then a telegraphed spear thrust.
// The shield is down while it winds up and recovers, and for a while after a Peal.
function knight(e, dt, dx, dy, room) {
  e.broken = Math.max(0, (e.broken || 0) - dt);
  const sees = Math.abs(dy) < 34 && Math.abs(dx) < 190, want = dx > 0 ? 1 : -1;
  if (e.stun > 0) { e.stun -= dt; e.vx = approach(e.vx, 0, 600 * dt); if (e.mode && e.mode !== 'walk') { e.mode = 'walk'; e.mt = 0; } }
  else switch (e.mode || 'walk') {
    case 'walk':
      if (sees) {
        if (want !== e.dir) { e.turn = (e.turn || 0) + dt; if (e.turn > 0.42) { e.dir = want; e.turn = 0; } } else e.turn = 0;
        e.vx = want === e.dir && Math.abs(dx) > 44 ? e.dir * 36 : 0;
        if (want === e.dir && Math.abs(dx) < 58 && e.cd <= 0) { e.mode = 'wind'; e.mt = 0; e.vx = 0; Sfx.play('gleam'); }
      } else { e.turn = 0; e.vx = e.dir * 24; }
      break;
    case 'wind': e.vx = 0; if (e.mt > 0.55) { e.mode = 'thrust'; e.mt = 0; e.vx = e.dir * 250; Sfx.play('thrust'); } break;
    case 'thrust':
      e.vx = approach(e.vx, 0, 1000 * dt);
      e.hit = { x: e.dir > 0 ? e.x + e.w - 2 : e.x - 32, y: e.y + 9, w: 34, h: 10, dmg: 2 };
      if (e.mt > 0.22) { e.mode = 'recover'; e.mt = 0; }
      break;
    case 'recover': e.vx = 0; if (e.mt > 0.65) { e.mode = 'walk'; e.mt = 0; e.cd = 0.6; } break;
  }
  e.guard = (!e.mode || e.mode === 'walk') && e.stun <= 0 && e.broken <= 0;
  if (e.onGround && Math.sign(e.vx) === e.dir && !groundAhead(e, room, e.dir)) { if (sees) e.vx = 0; else { e.dir = -e.dir; e.vx = 0; } }
  moveX(e, e.vx * dt, room); if (e.hitWall && !sees && (!e.mode || e.mode === 'walk')) e.dir = -e.hitWall;
  moveY(e, e.vy * dt, room);
}

// Ash Archer: stands its ground, draws for a long moment, and lobs an arrow that leads its target.
function archer(e, dt, dx, dy, d, room) {
  const p = G.player;
  if (e.stun > 0) { e.stun -= dt; e.vx = approach(e.vx, 0, 600 * dt); e.mode = 'stand'; e.mt = 0; }
  else {
    e.vx = approach(e.vx, 0, 600 * dt);
    if (e.mode === 'draw') { if (e.mt > 0.8) { shootArrow(e); e.mode = 'stand'; e.cd = 2.1; } }
    else {
      e.dir = dx > 0 ? 1 : -1;
      if (e.cd <= 0 && d < 330) {
        if (lineOfSight(e.x + e.w / 2, e.y + 9, p.x + p.w / 2, p.y + p.h / 2)) { e.mode = 'draw'; e.mt = 0; Sfx.play('bow'); } else e.cd = 0.5;
      }
    }
  }
  moveX(e, e.vx * dt, room); moveY(e, e.vy * dt, room);
}
function shootArrow(e) {
  const p = G.player, ox = e.x + e.w / 2 + e.dir * 6, oy = e.y + 9, tx = p.x + p.w / 2 + p.vx * 0.25, ty = p.y + p.h / 2, g = 420;
  const t = clamp(Math.abs(tx - ox) / 250, 0.25, 1.5);
  G.shots.push({ k: 'arrow', x: ox, y: oy, vx: clamp((tx - ox) / t, -330, 330), vy: clamp((ty - oy) / t - 0.5 * g * t, -420, 260), g, life: 3, dmg: 1 });
  Sfx.play('arrow');
}

// level 2 projectiles: arrows, the Warden's lantern fire, and Varhelm's falling blades
function updateDuskShot(s, dt, room) {
  if (s.k === 'arrow') {
    s.vy += s.g * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.life <= 0 || solidAt(room, Math.floor(s.x / T), Math.floor(s.y / T)) || s.y > room.h * T + 40) { burst(s.x, s.y, 4, 60, '#c8b48a', 0.25, 1.5); return true; }
    return false;
  }
  if (s.k === 'fire') {
    if (s.burn > 0) {
      s.burn -= dt; if (s.burn <= 0) return true;
      if (Math.random() < 0.3) part(s.x + (Math.random() - 0.5) * 24, s.floor - 4, 0, -40 - Math.random() * 40, 0.5, 2, '#ffb347', -20);
      return false;
    }
    s.vy += 900 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.y >= s.floor - 4) { s.y = s.floor - 4; s.burn = s.burnT; Sfx.play('fire'); burst(s.x, s.floor - 4, 8, 90, '#ffb347', 0.4, 2, 200); return false; }
    return s.life <= 0 || solidAt(room, Math.floor(s.x / T), Math.floor(s.y / T));
  }
  if (s.k === 'blade') {
    if (s.warn > 0) { s.warn -= dt; if (s.warn <= 0) s.vy = 160; return false; }
    s.vy = Math.min(s.vy + 1800 * dt, 700); s.y += s.vy * dt;
    if (s.y + s.h >= s.floor) { burst(s.x + s.w / 2, s.floor - 2, 10, 130, '#ffe6a0', 0.45, 2, 300); Sfx.play('shatter'); return true; }
    return false;
  }
  return true;
}

// ---------- The Barrow Warden: a jailer of the dead with a lantern on a chain ----------
function spawnWarden() {
  G.boss = { kind: 'warden', name: 'The Barrow Warden', A: WARD, x: 6 * T, y: WARD.floor - 50, w: 40, h: 50, vx: 0, vy: 0, hp: 30, maxHp: 30, state: 'sleep', st: 0, phase: 1, flash: 0, dir: -1, face: -1, n: 0, hitId: -1, hold: 0, dur: 1, hit: null, lamp: 0.2, sweeps: 0 };
}
function updateWarden(b, dt) {
  const p = G.player, A = b.A, pcx = p.x + p.w / 2, bcx = b.x + b.w / 2, dx = pcx - bcx, fast = b.phase === 2;
  b.hit = null;
  if (b.state !== 'hop') { b.vy = Math.min(b.vy + 1500 * dt, 800); b.y += b.vy * dt; if (b.y + b.h >= A.floor) { b.y = A.floor - b.h; b.vy = 0; } }
  const front = (reach, top, h, dmg) => ({ x: b.face > 0 ? bcx : bcx - reach, y: top, w: reach, h, dmg });
  const walk = () => { bossGo(b, 'walk'); b.dur = fast ? rr(0.4, 0.9) : rr(0.7, 1.4); };
  switch (b.state) {
    case 'sleep':
      if (p.y > A.top && p.x < A.x1 - 6) { bossGo(b, 'wake'); Sfx.play('roar'); Sfx.mood = 'boss'; }
      break;
    case 'wake':
      G.room.gateClosed = true; b.face = dx > 0 ? 1 : -1; G.shake = Math.max(G.shake, 2);
      if (b.st > 1.3) walk();
      break;
    case 'walk':
      b.face = dx > 0 ? 1 : -1;
      if (Math.abs(dx) > 50) b.x += b.face * (fast ? 58 : 42) * dt;
      if (b.st > b.dur) {
        const ad = Math.abs(dx), r = rnd();
        const pick = ad < 80 ? (r < 0.55 ? 'raise' : 'swingWind') : ad < 170 ? (r < 0.5 ? 'raise' : 'hop') : (r < 0.65 ? 'hop' : 'raise');
        bossGo(b, pick); b.sweeps = 0;
        if (pick === 'raise') { b.hold = fast ? rr(0.3, 1.4) : rr(0.45, 1.15); Sfx.play('heavy'); }
        if (pick === 'hop') { b.vy = -330; b.vx = -b.face * 130; Sfx.play('jump'); }
      }
      break;
    case 'raise': // the lantern hangs overhead for an unpredictable moment
      if (b.st < b.hold * 0.5) b.face = dx > 0 ? 1 : -1;
      if (b.st > b.hold) bossGo(b, 'slam');
      break;
    case 'slam':
      if (b.n === 0) {
        b.n = 1; G.shake = Math.max(G.shake, 9); Sfx.play('slam'); buzz(30);
        burst(bcx + b.face * 40, A.floor - 2, 16, 150, '#ffb347', 0.5, 2.5, 400);
        wave(bcx + b.face * 40, A.floor, b.face, fast ? 240 : 200, A.x0, A.x1);
        if (fast) wave(bcx - b.face * 20, A.floor, -b.face, 200, A.x0, A.x1);
      }
      if (b.st < 0.14) b.hit = front(74, A.floor - 44, 44, 2);
      if (b.st > (fast ? 0.6 : 0.85)) walk();
      break;
    case 'swingWind':
      if (b.st > (fast ? 0.36 : 0.5)) { bossGo(b, 'swing'); Sfx.play('thrust'); }
      break;
    case 'swing':
      if (b.st < 0.16) b.hit = front(82, b.y + 6, 36, 2);
      if (b.st > 0.3) {
        if (fast && !b.sweeps) { b.sweeps = 1; b.face = -b.face; bossGo(b, 'swingWind'); b.st = 0.12; } // second swing behind him
        else bossGo(b, 'rest');
      }
      break;
    case 'hop':
      b.vy += 1500 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.vy > 0 && b.y + b.h >= A.floor) { b.y = A.floor - b.h; b.vy = 0; b.vx = 0; bossGo(b, 'throw'); Sfx.play('land'); }
      break;
    case 'throw':
      b.face = dx > 0 ? 1 : -1;
      if (b.st > 0.42 && b.n === 0) {
        b.n = 1; const k = fast ? 5 : 3;
        for (let i = 0; i < k; i++) {
          const tx = pcx + (i - (k - 1) / 2) * 46;
          G.shots.push({ k: 'fire', x: bcx + b.face * 14, y: b.y + 8, vx: (tx - bcx) / 0.85, vy: -330, floor: A.floor, life: 4, burn: 0, burnT: fast ? 3.2 : 2.6, dmg: 1 });
        }
        Sfx.play('fire');
      }
      if (b.st > 1.0) walk();
      break;
    case 'rest':
      if (b.st > (fast ? 0.45 : 0.7)) walk();
      break;
    case 'enrage':
      G.shake = Math.max(G.shake, 4);
      if (Math.random() < 0.5) part(bcx + (Math.random() - 0.5) * 40, b.y + Math.random() * b.h, (Math.random() - 0.5) * 80, -60, 0.6, 2.5, '#ffb347');
      if (b.st > 1.1) walk();
      break;
    case 'dying':
      G.shake = Math.max(G.shake, 4);
      if (Math.random() < 0.7) part(bcx + (Math.random() - 0.5) * 40, b.y + Math.random() * b.h, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.8, 3, Math.random() < 0.5 ? '#8a8277' : '#ffb347');
      if (b.st > 1.8) bossDefeated();
      break;
  }
  b.x = clamp(b.x, A.x0, A.x1 - b.w);
  b.lamp = approach(b.lamp, b.state === 'sleep' ? 0.2 : b.state === 'raise' ? 1 : 0.6, dt * 2);
}

// ---------- Varhelm, the Unsetting Knight: swore to guard the sun until it set ----------
function spawnVarhelm() {
  G.boss = { kind: 'varhelm', name: 'Varhelm, the Unsetting Knight', A: COURT, x: 13 * T - 15, y: COURT.floor - 52, w: 30, h: 52, vx: 0, vy: 0, hp: 48, maxHp: 48, state: 'sleep', st: 0, phase: 1, flash: 0, dir: 1, face: 1, n: 0, hitId: -1, hold: 0, dur: 1, hit: null, chain: 0, count: 0, last: '', restT: 0, glint: 0 };
}
function updateVarhelm(b, dt) {
  const p = G.player, A = b.A, pcx = p.x + p.w / 2, bcx = b.x + b.w / 2, dx = pcx - bcx, fast = b.phase === 2;
  b.hit = null;
  const air = b.state === 'leap' || b.state === 'hang' || b.state === 'fall';
  if (!air) { b.vy = Math.min(b.vy + 1500 * dt, 900); b.y += b.vy * dt; if (b.y + b.h >= A.floor) { b.y = A.floor - b.h; b.vy = 0; } }
  const front = (reach, top, h, dmg) => ({ x: b.face > 0 ? bcx : bcx - reach, y: top, w: reach, h, dmg });
  const stride = () => { bossGo(b, 'stride'); b.dur = fast ? rr(0.25, 0.65) : rr(0.45, 1.0); };
  const turn = () => { b.face = dx > 0 ? 1 : -1; };
  switch (b.state) {
    case 'sleep': // kneeling, sword planted, until the hero steps into the Court
      b.face = 1;
      if (p.x + p.w < A.trigger) { bossGo(b, 'wake'); Sfx.play('roar'); Sfx.mood = 'boss'; }
      break;
    case 'wake':
      G.room.gateClosed = true; turn();
      if (b.st > 1.7) stride();
      break;
    case 'stride': {
      turn(); const ad = Math.abs(dx);
      if (ad > 70) b.x += b.face * (fast ? 96 : 72) * dt; else if (ad < 34) b.x -= b.face * 50 * dt;
      if (b.st > b.dur) {
        const r = rnd();
        let pick = ad < 85 ? (r < 0.6 ? 'combo' : r < 0.8 ? 'plunge' : 'lunge') : ad < 230 ? (r < 0.5 ? 'lunge' : r < 0.8 ? 'plunge' : 'combo') : (r < 0.6 ? 'lunge' : 'plunge');
        if (fast && rnd() < 0.25 && b.last !== 'blades') pick = 'blades';
        if (pick === b.last && pick !== 'combo' && rnd() < 0.6) pick = pick === 'lunge' ? 'plunge' : 'lunge';
        b.last = pick;
        if (pick === 'lunge') { bossGo(b, 'lungeWind'); b.hold = rr(0.35, 1.1); b.chain = fast && rnd() < 0.45 ? 1 : 0; b.glint = 0; }
        else if (pick === 'combo') { bossGo(b, 'cWind'); b.count = fast ? 3 : 2; b.hold = 0.3 + rnd() * 0.3; }
        else if (pick === 'plunge') { bossGo(b, 'leap'); b.vy = -760; Sfx.play('jump'); }
        else { bossGo(b, 'raise'); Sfx.play('gleam'); }
      }
      break;
    }
    case 'lungeWind': // sword drawn back; the strike comes when he chooses, not when you expect
      if (b.st < b.hold * 0.6) turn();
      b.x -= b.face * 12 * dt;
      if (b.st > b.hold - 0.14 && !b.glint) { b.glint = 1; Sfx.play('gleam'); }
      if (b.st > b.hold) { bossGo(b, 'lunge'); b.glint = 0; b.vx = b.face * 760; Sfx.play('dash'); }
      break;
    case 'lunge':
      b.vx = approach(b.vx, 0, 2400 * dt); b.x += b.vx * dt;
      b.hit = front(58, b.y + 10, 30, 2);
      if (Math.random() < 0.6) part(bcx - b.face * 10, b.y + 20 + Math.random() * 20, -b.face * 60, (Math.random() - 0.5) * 30, 0.35, 2.5, '#ffcf7a');
      if (b.st > 0.3) { if (b.chain) { b.chain = 0; turn(); bossGo(b, 'lungeWind'); b.hold = 0.3; b.glint = 0; } else { bossGo(b, 'rest'); b.restT = fast ? 0.45 : 0.7; } }
      break;
    case 'cWind':
      if (b.st < b.hold * 0.5) turn();
      if (b.st > b.hold) { bossGo(b, 'cSlash'); Sfx.play('thrust'); }
      break;
    case 'cSlash':
      if (b.st < 0.13) { b.x += b.face * 140 * dt; b.hit = front(56, b.y + 4, 40, 2); }
      if (b.st > 0.22) { b.count--; if (b.count > 0) { bossGo(b, 'cWind'); b.hold = 0.26 + rnd() * 0.22; } else { bossGo(b, 'rest'); b.restT = fast ? 0.5 : 0.75; } }
      break;
    case 'leap':
      b.vy += 1500 * dt; b.y += b.vy * dt; b.x += clamp((pcx - bcx) * 3, -280, 280) * dt;
      if (b.vy >= 0) { bossGo(b, 'hang'); b.vy = 0; Sfx.play('gleam'); }
      break;
    case 'hang':
      if (b.st < 0.15) b.x += clamp((pcx - bcx) * 2, -120, 120) * dt;
      if (b.st > (fast ? 0.22 : 0.32)) { bossGo(b, 'fall'); b.vy = 500; }
      break;
    case 'fall':
      b.vy = Math.min(b.vy + 4000 * dt, 1000); b.y += b.vy * dt;
      b.hit = { x: b.x + 2, y: b.y + b.h - 22, w: b.w - 4, h: 24, dmg: 2 };
      if (b.y + b.h >= A.floor) {
        b.y = A.floor - b.h; b.vy = 0; G.shake = Math.max(G.shake, 10); Sfx.play('slam'); buzz(30);
        for (const d of [-1, 1]) wave(bcx, A.floor, d, fast ? 270 : 230, A.x0, A.x1);
        burst(bcx, A.floor - 2, 18, 170, '#ffcf7a', 0.5, 2.5, 500);
        bossGo(b, 'rest'); b.restT = 0.75;
      }
      break;
    case 'raise': // phase two: blades of dusk light fall where you stand
      if (b.st > 0.5 && b.n === 0) {
        b.n = 1;
        for (let i = 0; i < 4; i++) {
          const x = clamp(pcx + (i - 1.5) * 44 + rr(-10, 10), A.x0 + 10, A.x1 - 14);
          G.shots.push({ k: 'blade', x: x - 4, y: A.ceil, w: 8, h: 26, warn: 0.55 + i * 0.22, vy: 0, floor: A.floor, dmg: 1 });
        }
      }
      if (b.st > 1.6) stride();
      break;
    case 'rest':
      if (b.st > b.restT) stride();
      break;
    case 'enrage':
      G.shake = Math.max(G.shake, 4);
      if (Math.random() < 0.6) part(bcx + (Math.random() - 0.5) * 40, b.y + Math.random() * b.h, (Math.random() - 0.5) * 80, -70, 0.7, 2.5, '#ffcf7a');
      if (b.st > 1.3) stride();
      break;
    case 'dying':
      G.shake = Math.max(G.shake, 3);
      if (Math.random() < 0.8) part(bcx + (Math.random() - 0.5) * 34, b.y + Math.random() * b.h, (Math.random() - 0.5) * 60, -50 - Math.random() * 90, 1.0, 2.5, Math.random() < 0.6 ? '#ffcf7a' : '#fff0c4', -40);
      if (b.st > 2.4) bossDefeated();
      break;
  }
  b.x = clamp(b.x, A.x0, A.x1 - b.w);
}
