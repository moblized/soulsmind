// ===== Level 3 foes: Starling Moth, Orrery Sentinel, Blink Acolyte; bosses: the Night Moth and Orren =====
Object.assign(FOES, {
  n: { w: 16, h: 12, hp: 2, chimes: 14, star: true },
  o: { w: 18, h: 18, hp: 4, chimes: 22, star: true },
  y: { w: 16, h: 26, hp: 4, chimes: 24, star: true, ground: true },
});

function updateStarFoe(e, dt, dx, dy, d) {
  const room = G.room; e.hit = null; e.mt = (e.mt || 0) + dt; e.cd = Math.max(0, e.cd - dt);
  if (e.type === 'n') starling(e, dt, dx, dy, d, room);
  else if (e.type === 'o') sentinel(e, dt, d);
  else acolyte(e, dt, dx, dy, room);
  if (e.y > room.h * T + 60) e.dead = true;
}

// Starling Moth: drifts near its perch; when you pass beneath it, it flares and dives at you.
function starling(e, dt, dx, dy, d, room) {
  const steer = (tx, ty, sp, k) => { e.vx = approach(e.vx, clamp((tx - e.x) * k, -sp, sp), sp * 4 * dt); e.vy = approach(e.vy, clamp((ty - e.y) * k, -sp, sp), sp * 4 * dt); };
  if (e.stun > 0) { e.stun -= dt; e.vx *= 1 - 3 * dt; e.vy *= 1 - 3 * dt; e.mode = 'return'; }
  else switch (e.mode || 'hover') {
    case 'hover':
      steer(e.hx + Math.sin(e.t * 1.3) * 26, e.hy + Math.sin(e.t * 2.1) * 10, 60, 2);
      if (e.cd <= 0 && dy > 24 && dy < 230 && Math.abs(dx) < 150) { e.mode = 'tell'; e.mt = 0; Sfx.play('flutter'); }
      break;
    case 'tell': e.vx *= 0.85; e.vy *= 0.85; if (e.mt > 0.45) { const p = G.player, ax = p.x + p.w / 2 - (e.x + e.w / 2), ay = p.y + p.h / 2 - (e.y + e.h / 2), m = Math.hypot(ax, ay) || 1; e.vx = (ax / m) * 270; e.vy = (ay / m) * 270; e.mode = 'dive'; e.mt = 0; } break;
    case 'dive': if (e.mt > 0.85) { e.mode = 'return'; e.mt = 0; } break;
    case 'return': steer(e.hx, e.hy, 95, 2); if (Math.hypot(e.hx - e.x, e.hy - e.y) < 12 || e.mt > 3) { e.mode = 'hover'; e.cd = 1.5; } break;
  }
  e.x += e.vx * dt; e.y += e.vy * dt;
  if (solidAt(room, Math.floor((e.x + e.w / 2) / T), Math.floor((e.y + e.h / 2) / T))) { e.x -= e.vx * dt; e.y -= e.vy * dt; e.vx = -e.vx * 0.3; e.vy = -e.vy * 0.3; if (e.mode === 'dive') { e.mode = 'return'; e.mt = 0; } }
  e.x = clamp(e.x, 4, room.w * T - e.w - 4); e.y = clamp(e.y, 4, room.h * T - e.h - 4);
  e.dir = e.vx >= 0 ? 1 : -1;
}

// Orrery Sentinel: a floating brass sphere that turns a ring of shots toward anything nearby.
function sentinel(e, dt, d) {
  if (e.stun > 0) e.stun -= dt;
  e.vx *= 1 - 5 * dt; e.vy *= 1 - 5 * dt; e.x += e.vx * dt + (e.hx - e.x) * 3 * dt; e.y += e.vy * dt + (e.hy - e.y) * 3 * dt;
  e.spin = (e.spin || 0) + dt * (e.mode === 'charge' ? 5 : 1.3);
  if (e.mode === 'charge') {
    if (e.mt > 0.65) {
      const n = 6, off = (e.turn = (e.turn || 0) + 0.38);
      for (let i = 0; i < n; i++) { const a = off + (i * TAU) / n; G.shots.push({ k: 'orb', x: e.x + e.w / 2, y: e.y + e.h / 2, vx: Math.cos(a) * 82, vy: Math.sin(a) * 82, r: 5, life: 4.2, dmg: 1, star: true }); }
      Sfx.play('orb'); e.mode = ''; e.cd = 2.6;
    }
  } else if (d < 270 && e.cd <= 0 && e.stun <= 0) { e.mode = 'charge'; e.mt = 0; }
}

// Blink Acolyte: fades, steps through the air to stand behind you, and cuts.
function acolyte(e, dt, dx, dy, room) {
  const p = G.player;
  e.vy = Math.min(e.vy + 1400 * dt, 520);
  if (e.stun > 0) { e.stun -= dt; e.vx = approach(e.vx, 0, 600 * dt); if (e.mode && e.mode !== 'idle') { e.mode = 'idle'; e.alpha = 1; } }
  else switch (e.mode || 'idle') {
    case 'idle':
      e.alpha = 1; e.vx = approach(e.vx, 0, 600 * dt);
      if (Math.abs(dx) < 230 && Math.abs(dy) < 60) { e.dir = dx > 0 ? 1 : -1; if (e.cd <= 0 && p.onGround) { e.mode = 'fade'; e.mt = 0; Sfx.play('blink'); } }
      break;
    case 'fade':
      e.alpha = 1 - e.mt / 0.45;
      if (e.mt > 0.45) {
        // reappear behind the hero if there is floor there, otherwise in front
        for (const side of [-p.face, p.face]) {
          const nx = p.x + p.w / 2 + side * 34 - e.w / 2, ny = p.y + p.h - e.h;
          const tx0 = Math.floor(nx / T), tx1 = Math.floor((nx + e.w - 1) / T), fy = Math.floor((ny + e.h + 2) / T);
          let ok = nx > T && nx + e.w < (room.w - 1) * T;
          for (let tx = tx0; ok && tx <= tx1; tx++) { if (solidAt(room, tx, Math.floor(ny / T)) || solidAt(room, tx, Math.floor((ny + e.h - 1) / T))) ok = false; }
          const fl = tileAt(room, Math.floor((nx + e.w / 2) / T), fy);
          if (ok && (fl === '#' || fl === '=')) { e.x = nx; e.y = ny; e.vx = 0; e.vy = 0; break; }
        }
        e.dir = p.x + p.w / 2 > e.x + e.w / 2 ? 1 : -1; e.mode = 'wind'; e.mt = 0; e.alpha = 1;
        burst(e.x + e.w / 2, e.y + e.h / 2, 10, 90, '#cfc6ff', 0.4, 2);
      }
      break;
    case 'wind': if (e.mt > 0.38) { e.mode = 'slash'; e.mt = 0; Sfx.play('thrust'); } break;
    case 'slash': e.hit = { x: e.dir > 0 ? e.x + e.w - 4 : e.x - 30, y: e.y + 4, w: 34, h: 20, dmg: 2 }; if (e.mt > 0.15) { e.mode = 'rest'; e.mt = 0; } break;
    case 'rest': if (e.mt > 0.8) { e.mode = 'idle'; e.cd = 2.0; } break;
  }
  moveX(e, e.vx * dt, room); moveY(e, e.vy * dt, room);
}

// ---------- The Night Moth: the mother of the gallery moths ----------
function spawnNightMoth() {
  G.boss = { kind: 'moth', name: 'The Night Moth', A: MOTHA, x: 13 * T - 26, y: MOTHA.ceil + 2, w: 52, h: 34, vx: 0, vy: 0, hp: 30, maxHp: 30, state: 'sleep', st: 0, phase: 1, flash: 0, face: 1, dir: 1, n: 0, hitId: -1, hit: null, dur: 1, last: '', side: 1 };
}
function updateNightMoth(b, dt) {
  const p = G.player, A = b.A, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, bcx = b.x + b.w / 2, fast = b.phase === 2;
  b.hit = null;
  const fly = (tx, ty, sp, k) => {
    b.vx = approach(b.vx, clamp((tx - b.x) * k, -sp, sp), sp * 4 * dt); b.vy = approach(b.vy, clamp((ty - b.y) * k, -sp, sp), sp * 4 * dt);
    b.x += b.vx * dt; b.y += b.vy * dt;
  };
  const circle = () => { bossGo(b, 'circle'); b.dur = fast ? rr(0.6, 1.2) : rr(1.0, 1.8); };
  switch (b.state) {
    case 'sleep': // hanging from the roof, wings folded
      if (p.x + p.w < A.trigger && p.y > A.ceil) { bossGo(b, 'wake'); Sfx.play('roar'); Sfx.mood = 'boss'; }
      break;
    case 'wake':
      G.room.gateClosed = true; G.shake = Math.max(G.shake, 2); // drops out of the roof into view
      if (b.st > 0.5) fly(b.x, A.floor - 200, 260, 3);
      if (b.st > 1.6) circle();
      break;
    case 'circle': {
      const cx = (A.x0 + A.x1) / 2 - b.w / 2, t = G.time;
      fly(cx + Math.sin(t * 1.1) * (A.x1 - A.x0) * 0.32, A.floor - 175 + Math.sin(t * 2.2) * 35, fast ? 220 : 170, 3);
      b.face = pcx > bcx ? 1 : -1;
      if (b.st > b.dur) {
        let pick = ['dive', 'dust', 'gust'][(rnd() * 3) | 0]; if (pick === b.last && rnd() < 0.7) pick = pick === 'dive' ? 'dust' : 'dive';
        b.last = pick; b.n = 0;
        if (pick === 'dive') { bossGo(b, 'diveTell'); b.chain = fast ? 1 : 0; }
        else if (pick === 'dust') bossGo(b, 'dust');
        else { b.side = pcx < (A.x0 + A.x1) / 2 ? 1 : -1; bossGo(b, 'gust'); }
        Sfx.play('flutter');
      }
      break;
    }
    case 'diveTell':
      fly(pcx - b.w / 2, Math.max(A.floor - 215, p.y - 140), 240, 4); b.face = pcx > bcx ? 1 : -1;
      if (b.st > (fast ? 0.42 : 0.6)) {
        const ax = pcx - bcx, ay = pcy - (b.y + b.h / 2), m = Math.hypot(ax, ay) || 1, sp = fast ? 480 : 420;
        b.vx = (ax / m) * sp; b.vy = (ay / m) * sp; bossGo(b, 'dive'); Sfx.play('dash');
      }
      break;
    case 'dive':
      b.x += b.vx * dt; b.y += b.vy * dt; b.hit = { x: b.x + 8, y: b.y + 6, w: b.w - 16, h: b.h - 10, dmg: 2 };
      if (b.y + b.h >= A.floor || b.x <= A.x0 || b.x + b.w >= A.x1 || b.st > 1) {
        if (b.y + b.h >= A.floor) { // she ploughs into the floor and struggles a moment: strike now
          b.y = A.floor - b.h; b.vx = 0; b.vy = 0; G.shake = Math.max(G.shake, 7); Sfx.play('slam'); burst(bcx, A.floor - 2, 14, 140, '#d9d2f0', 0.5, 2.5, 300); bossGo(b, 'grounded');
        } else if (b.chain > 0) { b.chain--; bossGo(b, 'diveTell'); b.st = 0.2; } else bossGo(b, 'rise');
      }
      break;
    case 'grounded':
      b.vx = 0; b.vy = 0; if (Math.random() < 0.3) part(bcx + rr(-24, 24), A.floor - 4, rr(-30, 30), -rr(20, 60), 0.4, 2, '#e8ddff');
      if (b.st > (fast ? 0.55 : 0.85)) { if (b.chain > 0) { b.chain--; bossGo(b, 'diveTell'); b.st = 0.15; } else bossGo(b, 'rise'); }
      break;
    case 'rise':
      fly(b.x, A.floor - 190, 220, 3);
      if (b.st > 0.75) circle();
      break;
    case 'dust': // sheds glowing scales that drift down
      fly((A.x0 + A.x1) / 2 - b.w / 2 + Math.sin(G.time * 1.6) * 90, A.floor - 215, 160, 3);
      if (b.st > 0.45 && b.n < (fast ? 13 : 9) && b.st > 0.45 + b.n * 0.09) {
        G.shots.push({ k: 'mote', x: bcx + rr(-28, 28), y: b.y + b.h - 4, vx: rr(-30, 30), vy: rr(34, 62), ph: rnd() * TAU, r: 4, life: 7, dmg: 1 }); b.n++;
      }
      if (b.st > 1.9) circle();
      break;
    case 'gust': { // beats its wings from one side and pushes you toward the other
      const tx = b.side > 0 ? A.x1 - b.w - 20 : A.x0 + 20; fly(tx, A.floor - 150, 260, 4); b.face = -b.side;
      if (b.st > 0.75) {
        const k = b.st - 0.75;
        G.wind = { vx: -b.side * (fast ? 125 : 100), t: 0.05 };
        if (Math.random() < 0.7) part(bcx - b.side * 20, b.y + rr(0, b.h), -b.side * 260, rr(-20, 20), 0.6, 2, 'rgba(220,210,255,0.8)');
        if (b.n < 3 && k > 0.25 + b.n * 0.35) { G.shots.push({ k: 'mote', x: bcx - b.side * 20, y: b.y + b.h / 2, vx: -b.side * 130, vy: rr(-10, 25), ph: 0, r: 4, life: 5, dmg: 1 }); b.n++; }
        if (k > (fast ? 1.6 : 1.3)) circle();
      }
      break;
    }
    case 'enrage':
      G.shake = Math.max(G.shake, 4); b.vx *= 0.9; b.vy *= 0.9;
      if (Math.random() < 0.6) part(bcx + rr(-26, 26), b.y + rr(0, b.h), rr(-60, 60), rr(-60, 20), 0.6, 2.5, '#e8ddff');
      if (b.st > 1.2) circle();
      break;
    case 'dying':
      b.vy = Math.min(b.vy + 300 * dt, 200); b.y = Math.min(A.floor - b.h, b.y + b.vy * dt); G.shake = Math.max(G.shake, 3);
      if (Math.random() < 0.7) part(bcx + rr(-26, 26), b.y + rr(0, b.h), rr(-40, 40), rr(-90, -30), 1.0, 2.5, Math.random() < 0.5 ? '#e8ddff' : '#9be8ff', -20);
      if (b.st > 2.2) bossDefeated();
      break;
  }
  b.x = clamp(b.x, A.x0, A.x1 - b.w); b.y = clamp(b.y, A.ceil, A.floor - b.h);
}

// ---------- Orren, the Last Astronomer: stopped counting the stars and started keeping them ----------
function spawnOrren() {
  G.boss = { kind: 'orren', name: 'Orren, the Last Astronomer', A: DOME, x: 13 * T - 14, y: DOME.floor - 50, w: 28, h: 50, vx: 0, vy: 0, hp: 60, maxHp: 60, state: 'sleep', st: 0, phase: 1, flash: 0, face: -1, dir: -1, n: 0, hitId: -1, hit: null, dur: 1, last: '', alpha: 1, ring: 0 };
}
function updateOrren(b, dt) {
  const p = G.player, A = b.A, pcx = p.x + p.w / 2, pcy = p.y + p.h / 2, bcx = b.x + b.w / 2, fast = b.phase === 2;
  b.hit = null; b.ring += dt;
  const fly = (tx, ty, sp, k) => {
    b.vx = approach(b.vx, clamp((tx - b.x) * k, -sp, sp), sp * 4 * dt); b.vy = approach(b.vy, clamp((ty - b.y) * k, -sp, sp), sp * 4 * dt);
    b.x += b.vx * dt; b.y += b.vy * dt;
  };
  const drift = () => { bossGo(b, 'drift'); b.dur = fast ? rr(0.4, 0.8) : rr(0.65, 1.15); b.alpha = 1; };
  const turn = () => { b.face = pcx > bcx ? 1 : -1; };
  switch (b.state) {
    case 'sleep': // bent over the great telescope, back to the door
      b.face = -1;
      if (p.x + p.w < A.trigger) { bossGo(b, 'wake'); Sfx.play('roar'); Sfx.mood = 'boss'; }
      break;
    case 'wake':
      G.room.gateClosed = true; turn(); fly(b.x, A.floor - b.h - 40, 60, 2);
      if (b.st > 1.8) drift();
      break;
    case 'drift': {
      turn(); const side = pcx < (A.x0 + A.x1) / 2 ? 1 : -1;
      fly(clamp(pcx + side * 110 - b.w / 2, A.x0, A.x1 - b.w), A.floor - 130 + Math.sin(G.time * 1.7) * 14, fast ? 200 : 150, 3);
      if (b.st > b.dur) {
        const opts = ['starfall', 'constellation', 'blink', 'comet']; let pick = opts[(rnd() * opts.length) | 0];
        if (pick === b.last) pick = opts[(opts.indexOf(pick) + 1 + ((rnd() * 3) | 0)) % opts.length];
        b.last = pick; bossGo(b, pick); if (pick === 'blink') Sfx.play('blink'); else Sfx.play('gleam');
      }
      break;
    }
    case 'starfall': { // calls the stars he keeps down on the dome floor
      b.vx *= 0.9; b.vy *= 0.9; b.x += b.vx * dt; b.y += b.vy * dt;
      const waves = fast ? 2 : 1;
      if (b.n < waves && b.st > 0.5 + b.n * 1.1) {
        const k = fast ? 8 : 6, span = (A.x1 - A.x0 - 40) / k, off = rr(0, span);
        for (let i = 0; i < k; i++) { const x = A.x0 + 20 + ((off + i * span) % (A.x1 - A.x0 - 40)); G.shots.push({ k: 'fstar', x: x - 5, y: A.ceil, w: 10, h: 12, warn: 0.85 + i * 0.04, vy: 0, floor: A.floor, dmg: 1 }); }
        G.shots.push({ k: 'fstar', x: clamp(pcx, A.x0 + 10, A.x1 - 10) - 5, y: A.ceil, w: 10, h: 12, warn: 0.95, vy: 0, floor: A.floor, dmg: 1 });
        Sfx.play('warn'); b.n++;
      }
      if (b.st > 0.5 + waves * 1.1 + 0.9) drift();
      break;
    }
    case 'constellation': { // pins stars around you, then the lines between them burn
      b.vx *= 0.9; b.vy *= 0.9;
      if (b.n === 0 && b.st > 0.3) {
        b.n = 1; const k = fast ? 5 : 4, a0 = rnd() * TAU, pts = [];
        for (let i = 0; i < k; i++) { const a = a0 + (i * TAU) / k + rr(-0.25, 0.25), r = rr(70, 115); pts.push([clamp(pcx + Math.cos(a) * r, A.x0 + 6, A.x1 - 6), clamp(pcy + Math.sin(a) * r, A.ceil + 6, A.floor - 4)]); }
        for (let i = 0; i < k; i++) {
          const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % k];
          G.shots.push({ k: 'line', x1, y1, x2, y2, warn: fast ? 0.75 : 0.95, act: 0.32, dmg: 1 });
          G.shots.push({ k: 'node', x: x1, y: y1, life: (fast ? 0.75 : 0.95) + 0.4 });
        }
      }
      if (b.st > 1.7) drift();
      break;
    }
    case 'blink': // fades out and steps behind you
      b.alpha = Math.max(0, 1 - b.st / 0.4); b.vx = 0; b.vy = 0;
      if (b.st > 0.4) {
        b.x = clamp(pcx - p.face * 40 - b.w / 2, A.x0, A.x1 - b.w); b.y = clamp(p.y + p.h - b.h, A.ceil, A.floor - b.h);
        turn(); b.alpha = 1; burst(b.x + b.w / 2, b.y + b.h / 2, 14, 120, '#cfc6ff', 0.4, 2); bossGo(b, 'swingWind');
      }
      break;
    case 'swingWind': if (b.st > (fast ? 0.28 : 0.36)) { bossGo(b, 'swing'); Sfx.play('thrust'); } break;
    case 'swing':
      if (b.st < 0.15) b.hit = { x: b.face > 0 ? bcx : bcx - 52, y: b.y + 8, w: 52, h: 34, dmg: 2 };
      if (b.st > 0.3) { bossGo(b, 'rest'); }
      break;
    case 'rest': if (b.st > (fast ? 0.4 : 0.6)) drift(); break;
    case 'comet': { // aimed bolts, one after another
      b.vx *= 0.9; b.vy *= 0.9; turn();
      const k = fast ? 5 : 3;
      if (b.n < k && b.st > 0.35 + b.n * 0.22) {
        const ox = bcx + b.face * 10, oy = b.y + 14, a = Math.atan2(pcy - oy, pcx - ox), s = fast ? 250 : 220;
        G.shots.push({ k: 'orb', x: ox, y: oy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 5, life: 4, dmg: 1, star: true }); Sfx.play('orb'); b.n++;
      }
      if (b.st > 0.35 + k * 0.22 + 0.4) drift();
      break;
    }
    case 'enrage': // his kept stars come out to circle him
      b.vx *= 0.9; b.vy *= 0.9; G.shake = Math.max(G.shake, 4);
      if (b.n === 0) { b.n = 1; for (let i = 0; i < 3; i++) G.shots.push({ k: 'orbiter', a: (i * TAU) / 3, r: 46, x: 0, y: 0, life: 999, dmg: 1 }); }
      if (b.st > 1.3) drift();
      break;
    case 'dying':
      b.vy = -30; b.y += b.vy * dt; b.alpha = clamp(1 - b.st / 2.6, 0.05, 1); G.shake = Math.max(G.shake, 3);
      if (Math.random() < 0.8) part(bcx + rr(-16, 16), b.y + rr(0, b.h), rr(-50, 50), rr(-90, -20), 1.1, 2.5, Math.random() < 0.5 ? '#fff6d8' : '#bfb6ff', -30);
      if (b.st > 2.6) bossDefeated();
      break;
  }
  b.x = clamp(b.x, A.x0, A.x1 - b.w); b.y = clamp(b.y, A.ceil, A.floor - b.h);
}

const STAR_SHOTS = { fstar: 1, mote: 1, line: 1, node: 1, orbiter: 1 };
// level 3 projectiles: falling stars, moth dust, constellation lines and nodes, and the stars that circle Orren
function updateStarShot(s, dt, room) {
  if (s.k === 'fstar') {
    if (s.warn > 0) { s.warn -= dt; if (s.warn <= 0) s.vy = 200; return false; }
    s.vy = Math.min(s.vy + 1600 * dt, 640); s.y += s.vy * dt;
    if (Math.random() < 0.6) part(s.x + s.w / 2, s.y, rr(-10, 10), -40, 0.35, 2, '#fff1c9');
    if (s.y + s.h >= s.floor) { burst(s.x + s.w / 2, s.floor - 2, 12, 140, '#fff1c9', 0.45, 2, 300); ringFx(s.x + s.w / 2, s.floor - 3, 22, '#fff1c9', 0.3); Sfx.play('shatter'); return true; }
    return false;
  }
  if (s.k === 'mote') {
    s.ph += dt * 3; s.x += (s.vx + Math.sin(s.ph) * 30) * dt; s.y += s.vy * dt; s.life -= dt;
    return s.life <= 0 || s.y > room.h * T + 20 || solidAt(room, Math.floor(s.x / T), Math.floor(s.y / T));
  }
  if (s.k === 'line') { if (s.warn > 0) { s.warn -= dt; if (s.warn <= 0) { Sfx.play('zap'); } return false; } s.act -= dt; return s.act <= 0; }
  if (s.k === 'node') { s.life -= dt; return s.life <= 0; }
  if (s.k === 'orbiter') {
    const b = G.boss; if (!b || b.kind !== 'orren' || b.state === 'dying') return true;
    s.a += dt * 2.4; s.x = b.x + b.w / 2 + Math.cos(s.a) * s.r; s.y = b.y + b.h / 2 + Math.sin(s.a) * s.r * 0.8; return false;
  }
  return true;
}
// the ground under a falling star, so its warning shows where it will land
function groundBelow(room, x, y) {
  const tx = Math.floor(x / T);
  for (let ty = Math.max(0, Math.floor(y / T)); ty < room.h; ty++) { const c = tileAt(room, tx, ty); if (c === '#' || c === '=' || c === 'X') return ty * T; }
  return room.h * T + 40;
}
function segDist(px, py, s) {
  const vx = s.x2 - s.x1, vy = s.y2 - s.y1, l2 = vx * vx + vy * vy || 1, t = clamp(((px - s.x1) * vx + (py - s.y1) * vy) / l2, 0, 1);
  return Math.hypot(px - (s.x1 + vx * t), py - (s.y1 + vy * t));
}

// ---------- the Astronomer's Rod: side strikes loose a small star ----------
function fireBolt(p, dmg) {
  G.pshots.push({ x: p.x + p.w / 2 + p.atkFace * 12, y: p.y + 10, vx: p.atkFace * 390, life: 0.5, dmg });
  Sfx.play('bolt');
}
function updateBolts(dt) {
  const room = G.room, b = G.boss;
  for (let i = G.pshots.length - 1; i >= 0; i--) {
    const s = G.pshots[i]; s.x += s.vx * dt; s.life -= dt;
    let dead = s.life <= 0 || solidAt(room, Math.floor(s.x / T), Math.floor(s.y / T));
    if (Math.random() < 0.6) part(s.x, s.y, -s.vx * 0.1, rr(-15, 15), 0.25, 1.5, '#fff1c9');
    const box = { x: s.x - 5, y: s.y - 5, w: 10, h: 10 };
    if (!dead) for (const e of G.enemies) if (!e.dead && overlap(box, e)) {
      // an Oathbound shield turns a star that comes at its face
      if (e.type === 'k' && e.guard && Math.sign(s.vx) === -e.dir) Sfx.play('clang'); else hurtEnemy(e, s.dmg, Math.sign(s.vx) * 0.5, 0);
      dead = true; break;
    }
    if (!dead && b && bossVulnerable(b) && overlap(box, b)) { hurtBoss(s.dmg); dead = true; }
    if (dead) { burst(s.x, s.y, 6, 90, '#fff1c9', 0.3, 2); G.pshots.splice(i, 1); }
  }
}

// ---------- open sky: in the Starwell's open rooms, stars keep falling. A lit brazier keeps them off. ----------
function updateSky(dt) {
  const room = G.room, p = G.player;
  if (room.kind !== 'star' || p.dead) return;
  G.skyT -= dt; if (G.skyT > 0) return;
  G.skyT = rr(2.4, 4.4);
  const pcx = p.x + p.w / 2;
  for (const br of room.braziers) if (br.lit && Math.abs(br.x - pcx) < 110 && Math.abs(br.y - (p.y + p.h)) < 80) return;
  const x = clamp(pcx + p.vx * 0.8 + rr(-110, 110), T + 8, room.w * T - T - 8), top = Math.max(0, G.cam.y - 14);
  G.shots.push({ k: 'fstar', x: x - 5, y: top, w: 10, h: 12, warn: 1.05, vy: 0, floor: groundBelow(room, x, top + 30), dmg: 1, sky: true });
  Sfx.play('gleam');
}
