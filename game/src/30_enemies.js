// ===== enemies, bosses, and things that fly at you =====
// r = Rimeling (spiny snow-beast that patrols), w = Drift Wisp (floats after you), m = Hushed Monk (throws frost)
const FOES = { r: { w: 20, h: 14, hp: 3, chimes: 6 }, w: { w: 14, h: 14, hp: 2, chimes: 4 }, m: { w: 18, h: 30, hp: 4, chimes: 10 } };
function spawnEnemy(type, tx, ty) {
  const f = FOES[type];
  const e = { type, w: f.w, h: f.h, hp: f.hp, vx: 0, vy: 0, flash: 0, dead: false, t: rr(0, 6), hitId: -1, stun: 0, onGround: false, hitWall: 0, dir: rnd() < 0.5 ? -1 : 1, cd: rr(1.0, 1.8), cast: 0 };
  e.x = tx * T + (T - e.w) / 2; e.y = (ty + 1) * T - e.h; e.hx = e.x; e.hy = e.y;
  G.enemies.push(e); return e;
}

function updateEnemies(dt) {
  const p = G.player, room = G.room, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2;
  for (let i = G.enemies.length - 1; i >= 0; i--) {
    const e = G.enemies[i];
    if (e.dead) { G.enemies.splice(i, 1); continue; }
    e.t += dt; e.flash = Math.max(0, e.flash - dt);
    const ecx = e.x + e.w / 2, ecy = e.y + e.h / 2, dx = pcx - ecx, dy = pcy - ecy, d = Math.hypot(dx, dy) || 1;
    if (FOES[e.type].hoard) { updateHoardling(e, dt, dx); continue; }
    if (FOES[e.type].dusk) { updateDuskFoe(e, dt, dx, dy, d); continue; }
    if (FOES[e.type].star) { updateStarFoe(e, dt, dx, dy, d); continue; }
    if (e.type === 'r') {
      // patrols, and hurries toward the hero when they share a ledge
      const sees = Math.abs(dy) < 22 && Math.abs(dx) < 120 && Math.sign(dx) === e.dir;
      if (e.stun > 0) { e.stun -= dt; e.vx = approach(e.vx, 0, 400 * dt); }
      else e.vx = e.dir * (sees ? 78 : 46);
      e.vy = Math.min(e.vy + 1400 * dt, 500);
      moveX(e, e.vx * dt, room); if (e.hitWall && e.stun <= 0) e.dir = -e.hitWall;
      moveY(e, e.vy * dt, room);
      if (e.onGround && e.stun <= 0) {
        const ax = e.dir > 0 ? e.x + e.w + 2 : e.x - 2, tx = Math.floor(ax / T), ty = Math.floor((e.y + e.h + 2) / T);
        const ahead = tileAt(room, tx, ty - 1), below = tileAt(room, tx, ty);
        if (!(below === '#' || below === '=') || ahead === '^' || room.def.exits[ahead] || tx <= 0 || tx >= room.w - 1) e.dir = -e.dir;
      }
      if (e.y > room.h * T + 60) e.dead = true;
    } else if (e.type === 'w') {
      if (e.stun > 0) { e.stun -= dt; e.vx *= 1 - 3 * dt; e.vy *= 1 - 3 * dt; }
      else if (d < 220) { e.vx += (dx / d) * 170 * dt; e.vy += (dy / d) * 170 * dt; }
      else { e.vx += (e.hx - e.x) * 0.6 * dt; e.vy += (e.hy - e.y) * 0.6 * dt; e.vx *= 1 - 1.2 * dt; e.vy *= 1 - 1.2 * dt; }
      const sp = Math.hypot(e.vx, e.vy), mxs = e.stun > 0 ? 220 : 82; if (sp > mxs) { e.vx *= mxs / sp; e.vy *= mxs / sp; }
      e.x += e.vx * dt; e.y += e.vy * dt + Math.sin(e.t * 3) * 6 * dt;
      e.x = clamp(e.x, 4, room.w * T - e.w - 4); e.y = clamp(e.y, 4, room.h * T - e.h - 4);
    } else {
      if (e.stun > 0) { e.stun -= dt; e.vx *= 1 - 4 * dt; e.vy *= 1 - 4 * dt; }
      else {
        const side = dx > 0 ? -1 : 1, near = d < 300;
        const tx = near ? pcx + side * 105 : e.hx + e.w / 2, tyy = near ? pcy - 34 : e.hy + e.h / 2;
        e.vx = approach(e.vx, clamp((tx - ecx) * 1.2, -60, 60), 160 * dt);
        e.vy = approach(e.vy, clamp((tyy - ecy) * 1.2, -46, 46), 130 * dt);
        if (near) e.cd -= dt;
        if (e.cast > 0) {
          e.cast -= dt; e.vx *= 0.9; e.vy *= 0.9;
          if (e.cast <= 0) {
            // leads the shot a little, so standing still or running straight both get punished
            const s = 150, lead = d / s * 0.45, ax = dx + p.vx * lead, ay = dy + p.vy * lead * 0.3, ad = Math.hypot(ax, ay) || 1;
            G.shots.push({ k: 'orb', x: ecx, y: ecy - 4, vx: (ax / ad) * s, vy: (ay / ad) * s, r: 5, life: 4.5, dmg: 1 }); Sfx.play('orb'); e.cd = 2.0;
          }
        } else if (e.cd <= 0 && d < 280) { e.cast = 0.5; }
      }
      e.x += e.vx * dt; e.y += e.vy * dt;
      e.x = clamp(e.x, 4, room.w * T - e.w - 4); e.y = clamp(e.y, 4, room.h * T - e.h - 4);
      e.dir = dx > 0 ? 1 : -1;
    }
  }
}

function hurtEnemy(e, dmg, dirX, dirY) {
  const heavy = !!weapon().heavy;
  e.hp -= dmg; e.flash = 0.12; e.stun = heavy ? 0.45 : 0.22; if (heavy) { dirX *= 1.5; G.shake = Math.max(G.shake, 4); }
  if (e.type === 'r' || FOES[e.type].dusk || FOES[e.type].ground) { const kb = e.type === 'k' ? 70 : 140; e.vx = dirX * kb; e.vy = dirY < 0 ? -200 : -100; e.mode = e.type === 'k' ? 'walk' : e.mode; }
  else { e.vx = dirX * 190; e.vy = dirY * 190; e.cast = 0; }
  const cx = e.x + e.w / 2, cy = e.y + e.h / 2, F = FOES[e.type];
  burst(cx, cy, 6, 130, '#e9fbff', 0.3, 2);
  if (F.hoard) { e.mode = 'awake'; wakeHoard(cx, cy); }
  if (e.hp <= 0) {
    e.dead = true; Sfx.play('kill'); dropChimes(cx, cy, e.chimes || F.chimes);
    const col = F.hoard ? '#ffd27a' : F.star ? '#d9d2ff' : F.dusk ? '#d8c9a8' : e.type === 'r' ? '#dfeef5' : '#a9dff0';
    burst(cx, cy, 16, 150, col, 0.6, 2.5, 150); ringFx(cx, cy, 26, F.star || F.hoard ? '#fff1c9' : F.dusk ? '#ffcf7a' : '#cfefff', 0.3);
  } else Sfx.play('hit');
}

// ---------- chimes: what the cold things drop ----------
function dropChimes(x, y, total) {
  if (eq('purse')) total = Math.round(total * 1.35);
  const n = Math.min(26, Math.max(1, Math.ceil(total / 5))); let left = total;
  for (let i = 0; i < n; i++) {
    const v = i === n - 1 ? left : Math.round(total / n); left -= v;
    const a = Math.random() * TAU, s = 60 + Math.random() * 120;
    G.drops.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, v, t: -Math.random() * 0.15 });
  }
}
function updateDrops(dt) {
  const p = G.player, px = p.x + p.w / 2, py = p.y + p.h / 2;
  G.chimeSfx = Math.max(0, (G.chimeSfx || 0) - dt);
  for (let i = G.drops.length - 1; i >= 0; i--) {
    const d = G.drops[i]; d.t += dt;
    if (d.t < 0.4) { d.vx *= 1 - 3 * dt; d.vy = d.vy * (1 - 3 * dt) + 260 * dt; d.x += d.vx * dt; d.y += d.vy * dt; continue; }
    const dx = px - d.x, dy = py - d.y, dist = Math.hypot(dx, dy) || 1, sp = 140 + (d.t - 0.4) * 700;
    if (dist < 10 || dist < sp * dt) {
      G.save.chimes += d.v; G.drops.splice(i, 1);
      if (G.chimeSfx <= 0) { Sfx.play('chime'); G.chimeSfx = 0.05; }
    } else { d.x += (dx / dist) * sp * dt; d.y += (dy / dist) * sp * dt; }
  }
}

// ---------- shots ----------
function updateShots(dt) {
  const room = G.room;
  for (let i = G.shots.length - 1; i >= 0; i--) {
    const s = G.shots[i]; let dead = false;
    if (s.k === 'orb') {
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      if (s.life <= 0 || solidAt(room, Math.floor(s.x / T), Math.floor(s.y / T)) || s.y > room.h * T + 40) { dead = true; burst(s.x, s.y, 5, 60, '#a9e3ee', 0.3, 2); }
    } else if (s.k === 'wave') {
      s.x += s.dir * s.speed * dt; s.life -= dt;
      if (s.life <= 0 || s.x < s.lo - 4 || s.x + s.w > s.hi + 4) dead = true;
      if (Math.random() < 0.5) part(s.x + s.w / 2, s.y + s.h, (Math.random() - 0.5) * 40, -40 - Math.random() * 60, 0.3, 2, '#dff6fb', 300);
    } else if (s.k === 'ice') {
      if (s.warn > 0) { s.warn -= dt; if (s.warn <= 0) s.vy = 120; }
      else { s.vy = Math.min(s.vy + 1500 * dt, 600); s.y += s.vy * dt; if (s.y + s.h >= s.floor) { dead = true; burst(s.x + s.w / 2, s.floor - 2, 8, 120, '#cfefff', 0.4, 2, 400); Sfx.play('shatter'); } }
    } else if (STAR_SHOTS[s.k]) dead = updateStarShot(s, dt, room);
    else dead = updateDuskShot(s, dt, room);
    if (dead) G.shots.splice(i, 1);
  }
}
function shotBox(s) {
  if (s.k === 'orb') return { x: s.x - s.r, y: s.y - s.r, w: s.r * 2, h: s.r * 2 };
  if (s.k === 'arrow') return { x: s.x - 4, y: s.y - 3, w: 8, h: 6 };
  if (s.k === 'mote') return { x: s.x - 4, y: s.y - 4, w: 8, h: 8 };
  if (s.k === 'orbiter') return { x: s.x - 6, y: s.y - 6, w: 12, h: 12 };
  if (s.k === 'fire') return s.burn > 0 ? { x: s.x - 13, y: s.floor - 12, w: 26, h: 12 } : { x: s.x - 5, y: s.y - 5, w: 10, h: 10 };
  return s;
}
function wave(x, floor, dir, speed, lo, hi) { G.shots.push({ k: 'wave', x: x - 8 + dir * 14, y: floor - 20, w: 16, h: 20, dir, speed, life: 3, lo, hi, dmg: 1 }); }

// ---------- bosses ----------
const PIT = { x0: 24 * T, x1: 35 * T, floor: 16 * T };
function bossGo(b, state) { b.state = state; b.st = 0; b.n = 0; }
function bossAwake(b) { return b && b.state !== 'sleep'; }
function bossVulnerable(b) { return b && b.state !== 'intro' && b.state !== 'enrage' && b.state !== 'dying' && !(b.kind === 'orren' && b.state === 'blink'); }
// how hard touching the boss hurts right now (0 = harmless)
function bossTouch(b) {
  if (b.state === 'intro' || b.state === 'dying' || b.state === 'sleep' || b.state === 'wake') return 0;
  if (b.kind === 'abbot') return b.state === 'slamFall' || b.state === 'sweepGo' ? 2 : 1;
  if (b.kind === 'matriarch') return b.state === 'charge' || b.state === 'leap' ? 2 : 1;
  if (b.kind === 'varhelm') return b.state === 'lunge' || b.state === 'fall' ? 2 : 1;
  if (b.kind === 'moth') return b.state === 'dive' ? 2 : b.state === 'enrage' ? 0 : 1;
  if (b.kind === 'orren') return b.state === 'blink' || b.state === 'enrage' ? 0 : 1;
  return 1;
}
function hurtBoss(dmg) {
  const b = G.boss; b.hp -= dmg; b.flash = 0.1;
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  burst(cx, cy, 6, 150, '#e9fbff', 0.3, 2);
  if (b.state === 'sleep') { bossGo(b, 'wake'); Sfx.play('roar'); Sfx.mood = 'boss'; }
  if (b.hp <= 0) { b.hp = 0; bossGo(b, 'dying'); G.shots.length = 0; Sfx.play('roar'); G.hitstop = 0.25; return; }
  Sfx.play('hit');
  if (b.phase === 1 && b.hp <= b.maxHp / 2) {
    b.phase = 2; G.shots.length = 0; Sfx.play('roar'); ringFx(cx, cy, 120, '#bff4ff', 0.6);
    bossGo(b, b.kind === 'matriarch' ? 'wake' : 'enrage');
  }
}
function updateBoss(dt) {
  const b = G.boss; if (!b) return;
  b.st += dt; b.flash = Math.max(0, b.flash - dt);
  if (b.kind === 'abbot') updateAbbot(b, dt);
  else if (b.kind === 'matriarch') updateMatriarch(b, dt);
  else if (b.kind === 'warden') updateWarden(b, dt);
  else if (b.kind === 'moth') updateNightMoth(b, dt);
  else if (b.kind === 'orren') updateOrren(b, dt);
  else updateVarhelm(b, dt);
}

// The Silent Abbot: floats, slams, throws frost, sweeps the hall, and in his second voice brings the ceiling down.
function spawnBoss() {
  const cx = (ARENA.x0 + ARENA.x1) / 2;
  G.boss = { kind: 'abbot', name: 'The Silent Abbot', A: ARENA, x: cx - 22, y: ARENA.ceil - 90, w: 44, h: 64, vx: 0, vy: 0, hp: 34, maxHp: 34, state: 'intro', st: 0, phase: 1, flash: 0, last: '', dir: -1, face: -1, sweeps: 0, n: 0, hitId: -1 };
  Sfx.mood = 'boss'; Sfx.play('roar');
}
function bossSteer(b, tx, ty, maxV, dt) {
  const k = 5;
  b.vx = approach(b.vx, clamp((tx - b.x) * k, -maxV, maxV), maxV * 5 * dt);
  b.vy = approach(b.vy, clamp((ty - b.y) * k, -maxV, maxV), maxV * 5 * dt);
  b.x += b.vx * dt; b.y += b.vy * dt;
  b.x = clamp(b.x, ARENA.x0, ARENA.x1 - b.w); b.y = clamp(b.y, ARENA.ceil - 100, ARENA.floor - b.h);
}
function updateAbbot(b, dt) {
  const p = G.player, pcx = p.x + p.w / 2, A = ARENA, fast = b.phase === 2, bcx = b.x + b.w / 2;
  b.face = b.state === 'sweepWarn' || b.state === 'sweepGo' ? b.dir : pcx > bcx ? 1 : -1;
  switch (b.state) {
    case 'intro':
      bossSteer(b, (A.x0 + A.x1) / 2 - b.w / 2, A.floor - 190, 90, dt);
      if (b.st > 1.9) bossGo(b, 'idle');
      break;
    case 'idle': {
      const side = pcx < (A.x0 + A.x1) / 2 ? 1 : -1;
      bossSteer(b, pcx + side * 110 - b.w / 2, A.floor - 170 + Math.sin(G.time * 2) * 10, 120, dt);
      if (b.st > (fast ? 0.55 : 0.9)) {
        const opts = fast ? ['slam', 'volley', 'sweep', 'rain'] : ['slam', 'volley', 'sweep'];
        let pick; do { pick = opts[(rnd() * opts.length) | 0]; } while (pick === b.last);
        b.last = pick; bossGo(b, pick);
      }
      break;
    }
    case 'slam': // drift above the hero, then hold
      bossSteer(b, pcx - b.w / 2, A.floor - 205, 270, dt);
      if (b.st > (fast ? 0.5 : 0.7)) { bossGo(b, 'slamHold'); Sfx.play('warn'); }
      break;
    case 'slamHold':
      b.vx = 0; b.vy = 0;
      if (b.st > (fast ? 0.2 : 0.26)) { bossGo(b, 'slamFall'); b.vy = 300; }
      break;
    case 'slamFall':
      b.vy = Math.min(b.vy + 4200 * dt, 950); b.y += b.vy * dt;
      if (b.y + b.h >= A.floor) {
        b.y = A.floor - b.h; b.vy = 0; G.shake = Math.max(G.shake, 10); Sfx.play('slam');
        for (const dir of [-1, 1]) wave(bcx, A.floor, dir, fast ? 285 : 240, A.x0, A.x1);
        burst(bcx, A.floor - 2, 18, 170, '#dff6fb', 0.5, 2.5, 500);
        bossGo(b, 'slamRest');
      }
      break;
    case 'slamRest':
      if (b.st > (fast ? 0.65 : 0.95)) bossGo(b, 'idle');
      break;
    case 'volley': {
      const side = pcx < (A.x0 + A.x1) / 2 ? 1 : -1;
      bossSteer(b, side > 0 ? A.x1 - b.w - 30 : A.x0 + 30, A.floor - 175, 200, dt);
      const total = fast ? 6 : 4, first = 0.7, gap = 0.15;
      if (b.n < total && b.st > first + b.n * gap) {
        const ox = bcx, oy = b.y + 30, base = Math.atan2(p.y + p.h / 2 - oy, pcx - ox), a = base + (b.n - (total - 1) / 2) * 0.22, s = fast ? 195 : 170;
        G.shots.push({ k: 'orb', x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 5, life: 5, dmg: 1 }); Sfx.play('orb'); b.n++;
      }
      if (b.st > first + total * gap + 0.5) bossGo(b, 'idle');
      break;
    }
    case 'sweep': { // line up at head height on the far side, then cross the hall
      const side = pcx < (A.x0 + A.x1) / 2 ? 1 : -1;
      bossSteer(b, side > 0 ? A.x1 - b.w - 4 : A.x0 + 4, A.floor - 36 - b.h, 260, dt);
      if (b.st > 0.9) { b.dir = -side; b.sweeps = 0; bossGo(b, 'sweepWarn'); Sfx.play('warn'); }
      break;
    }
    case 'sweepWarn':
      b.vx = 0; b.vy = 0; b.x -= b.dir * 14 * dt;
      b.x = clamp(b.x, A.x0, A.x1 - b.w);
      if (b.st > (fast ? 0.4 : 0.52)) { bossGo(b, 'sweepGo'); Sfx.play('dash'); }
      break;
    case 'sweepGo':
      b.x += b.dir * (fast ? 560 : 480) * dt;
      if (Math.random() < 0.6) part(bcx, b.y + 20 + Math.random() * 40, -b.dir * 60, (Math.random() - 0.5) * 40, 0.4, 2.5, '#a9c7f0');
      if (b.x <= A.x0 + 2 || b.x >= A.x1 - b.w - 2) {
        b.x = clamp(b.x, A.x0 + 2, A.x1 - b.w - 2);
        if (fast && b.sweeps === 0) { b.sweeps = 1; b.dir = -b.dir; bossGo(b, 'sweepWarn'); Sfx.play('warn'); }
        else bossGo(b, 'sweepRest');
      }
      break;
    case 'sweepRest':
      if (b.st > 0.5) bossGo(b, 'idle');
      break;
    case 'rain': {
      bossSteer(b, (A.x0 + A.x1) / 2 - b.w / 2, A.ceil + 14, 230, dt);
      const waves = 2;
      if (b.n < waves && b.st > 0.6 + b.n * 1.05) {
        const count = 8, span = (A.x1 - A.x0 - 30) / count, off = b.n % 2 ? span / 2 : 0;
        for (let i = 0; i < count; i++) {
          const x = A.x0 + 15 + off + i * span + rr(-8, 8);
          if (x < A.x1 - 12) G.shots.push({ k: 'ice', x: x - 4, y: A.ceil, w: 8, h: 22, warn: 0.75 + i * 0.03, vy: 0, floor: A.floor, dmg: 2 });
        }
        Sfx.play('warn'); b.n++;
      }
      if (b.st > 0.6 + waves * 1.05 + 0.8) bossGo(b, 'idle');
      break;
    }
    case 'enrage':
      b.vx = 0; b.vy = 0; G.shake = Math.max(G.shake, 4);
      if (Math.random() < 0.5) part(bcx + (Math.random() - 0.5) * 50, b.y + Math.random() * b.h, (Math.random() - 0.5) * 80, -60, 0.6, 2.5, '#bff4ff');
      if (b.st > 1.3) bossGo(b, 'idle');
      break;
    case 'dying':
      G.shake = Math.max(G.shake, 5);
      if (Math.random() < 0.7) part(bcx + (Math.random() - 0.5) * 50, b.y + Math.random() * b.h, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.8, 3, Math.random() < 0.5 ? '#bff4ff' : '#ffd27a');
      if (b.st > 2.3) bossDefeated();
      break;
  }
}

// The Rime Matriarch: sleeps in the cellar pit on top of the Ice Claws. Stalks, rears, charges wall to wall, and leaps.
function spawnMatriarch() {
  G.boss = { kind: 'matriarch', name: 'The Rime Matriarch', A: PIT, x: PIT.x1 - 78, y: PIT.floor - 30, w: 46, h: 30, vx: 0, vy: 0, hp: 18, maxHp: 18, state: 'sleep', st: 0, phase: 1, flash: 0, dir: -1, face: -1, sweeps: 0, n: 0, hitId: -1, dur: 1 };
}
function updateMatriarch(b, dt) {
  const p = G.player, pcx = p.x + p.w / 2, bcx = b.x + b.w / 2, fast = b.phase === 2, P = PIT;
  const stalk = () => { bossGo(b, 'stalk'); b.dur = fast ? rr(0.35, 0.8) : rr(0.6, 1.3); };
  if (b.state !== 'leap' && b.y + b.h < P.floor) { b.vy = Math.min(b.vy + 1500 * dt, 700); b.y = Math.min(P.floor - b.h, b.y + b.vy * dt); if (b.y + b.h >= P.floor) b.vy = 0; }
  switch (b.state) {
    case 'sleep':
      if (p.x > P.x0 + 4 && p.y + p.h > P.floor - 60) { bossGo(b, 'wake'); Sfx.play('roar'); Sfx.mood = 'boss'; }
      break;
    case 'wake':
      G.shake = Math.max(G.shake, 3); b.face = pcx > bcx ? 1 : -1;
      if (b.st > 1.0) stalk();
      break;
    case 'stalk':
      b.face = pcx > bcx ? 1 : -1;
      if (Math.abs(pcx - bcx) > 20) b.x += b.face * (fast ? 74 : 54) * dt;
      b.x = clamp(b.x, P.x0, P.x1 - b.w);
      if (b.st > b.dur) {
        b.dir = b.face; b.sweeps = 0;
        if (rnd() < 0.42) { bossGo(b, 'leap'); b.vy = -560; b.vx = clamp((pcx - bcx) / 0.74, -270, 270); Sfx.play('jump'); }
        else { bossGo(b, 'rear'); Sfx.play('warn'); }
      }
      break;
    case 'rear':
      b.x = clamp(b.x - b.dir * 16 * dt, P.x0, P.x1 - b.w);
      if (b.st > (fast ? 0.4 : 0.58)) { bossGo(b, 'charge'); Sfx.play('dash'); }
      break;
    case 'charge':
      b.face = b.dir; b.x += b.dir * (fast ? 390 : 320) * dt;
      if (Math.random() < 0.6) part(bcx - b.dir * 16, P.floor - 2, -b.dir * 50, -30 - Math.random() * 50, 0.35, 2.5, '#dff6fb', 300);
      if (b.x <= P.x0 || b.x + b.w >= P.x1) {
        b.x = clamp(b.x, P.x0, P.x1 - b.w); G.shake = Math.max(G.shake, 9); Sfx.play('slam');
        burst(b.dir > 0 ? b.x + b.w : b.x, b.y + 10, 14, 150, '#dff6fb', 0.5, 2.5, 400);
        if (fast && b.sweeps === 0) { b.sweeps = 1; b.dir = -b.dir; bossGo(b, 'rear'); b.st = 0.2; }
        else bossGo(b, 'dazed');
      }
      break;
    case 'dazed':
      if (b.st > (fast ? 0.85 : 1.2)) stalk();
      break;
    case 'leap':
      b.vy += 1500 * dt; b.x = clamp(b.x + b.vx * dt, P.x0, P.x1 - b.w); b.y += b.vy * dt;
      if (b.vy > 0 && b.y + b.h >= P.floor) {
        b.y = P.floor - b.h; b.vy = 0; b.vx = 0; G.shake = Math.max(G.shake, 8); Sfx.play('slam');
        for (const dir of [-1, 1]) wave(b.x + b.w / 2, P.floor, dir, fast ? 230 : 190, P.x0, P.x1);
        burst(b.x + b.w / 2, P.floor - 2, 14, 150, '#dff6fb', 0.5, 2.5, 500);
        bossGo(b, 'land');
      }
      break;
    case 'land':
      if (b.st > (fast ? 0.4 : 0.65)) stalk();
      break;
    case 'dying':
      G.shake = Math.max(G.shake, 4);
      if (Math.random() < 0.7) part(bcx + (Math.random() - 0.5) * 50, b.y + Math.random() * b.h, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.8, 3, Math.random() < 0.5 ? '#dfeef5' : '#ffd27a');
      if (b.st > 1.6) bossDefeated();
      break;
  }
}
