// ===== the hero =====
const PH = {
  RUN: 140, GACC: 1900, AACC: 1400, GFRIC: 2200, AFRIC: 500, GRAV: 1500, MAXFALL: 520, JUMP: 490,
  WSLIDE: 70, WJX: 165, WJY: 455, WLOCK: 0.12, DASHV: 440, DASHT: 0.2, DASHCD: 0.45, RESMAX: 8, DODGE: 0.17, HEALT: 0.85,
};
const maxFlask = () => 2 + G.save.up.flask;
const strikeDmg = (peal) => (peal ? 3 + G.save.up.staff * 2 : 1 + G.save.up.staff);
function newPlayer() {
  return {
    x: 0, y: 0, w: 12, h: 22, vx: 0, vy: 0, face: 1, onGround: false, onOneWay: false, hitWall: 0, hitCeil: false, dropThrough: false,
    coyote: 0, jumpBuf: 0, jumping: false, wallDir: 0, wallCoyote: 0, wallLock: 0, sliding: false,
    dashT: 0, dashCd: 0, dashDir: 1, canDash: true, dashBuf: 0,
    atkT: 0, atkCd: 0, atkBuf: 0, atkDir: 'side', atkFace: 1, atkId: 0, atkPeal: false, atkDone: -1,
    inv: 0, hurtT: 0, hp: 5, maxHp: 5, res: 0, dropT: 0, safeT: 0, safe: { x: 0, y: 0 },
    runPhase: 0, trail: [], dead: false, hidden: false, landT: 0, wasGround: false, flask: 2, healT: 0, dodge: 0,
  };
}

function updatePlayer(dt) {
  const p = G.player, I = Input, room = G.room, ab = G.save.abilities;
  if (p.dead) return;
  p.inv = Math.max(0, p.inv - dt); p.hurtT = Math.max(0, p.hurtT - dt); p.dashCd = Math.max(0, p.dashCd - dt);
  p.atkCd = Math.max(0, p.atkCd - dt); p.atkT = Math.max(0, p.atkT - dt); p.coyote = Math.max(0, p.coyote - dt);
  p.wallCoyote = Math.max(0, p.wallCoyote - dt); p.jumpBuf = Math.max(0, p.jumpBuf - dt); p.dashBuf = Math.max(0, p.dashBuf - dt);
  p.atkBuf = Math.max(0, p.atkBuf - dt); p.dropT = Math.max(0, p.dropT - dt); p.landT = Math.max(0, p.landT - dt);
  const stunned = p.hurtT > 0;
  let mx = (I.held.right ? 1 : 0) - (I.held.left ? 1 : 0);
  if (stunned) mx = 0;
  if (I.pressed.jump) p.jumpBuf = 0.13;
  if (I.pressed.dash) p.dashBuf = 0.12;
  if (I.pressed.attack) p.atkBuf = 0.14;
  p.dodge = Math.max(0, p.dodge - dt);

  // the ember flask: a slow drink, only on firm ground, only what the last brazier gave you
  if (I.pressed.heal && p.healT <= 0 && !stunned && p.dashT <= 0) {
    if (p.flask > 0 && p.hp < p.maxHp && p.onGround) { p.healT = PH.HEALT; Sfx.play('drink'); }
    else Sfx.play('deny');
  }
  if (p.healT > 0) {
    p.healT -= dt; mx = 0; p.jumpBuf = 0; p.dashBuf = 0; p.atkBuf = 0;
    if (Math.random() < 0.35) part(p.x + Math.random() * p.w, p.y + p.h, (Math.random() - 0.5) * 16, -50 - Math.random() * 40, 0.5, 2, '#ffb347');
    if (!p.onGround || stunned) p.healT = 0;
    else if (p.healT <= 0) { p.flask--; p.hp = Math.min(p.maxHp, p.hp + 2); Sfx.play('mend'); ringFx(p.x + p.w / 2, p.y + p.h / 2, 40, '#ffb347', 0.4); }
  }

  // dash
  if (p.dashBuf > 0 && ab.dash && p.dashCd <= 0 && p.canDash && !stunned && p.dashT <= 0) {
    p.dashDir = p.sliding ? -p.wallDir : (mx || p.face); p.face = p.dashDir;
    p.dashT = PH.DASHT; p.dashCd = PH.DASHCD; p.dashBuf = 0; p.wallLock = 0; p.sliding = false; p.jumping = false; p.dodge = PH.DODGE;
    if (!p.onGround) p.canDash = false;
    Sfx.play('dash');
    for (let i = 0; i < 6; i++) part(p.x + p.w / 2, p.y + 4 + Math.random() * 16, -p.dashDir * (40 + Math.random() * 80), (Math.random() - 0.5) * 30, 0.3, 2, '#bfeaf2');
  }
  if (p.dashT > 0) {
    p.dashT -= dt; p.vx = p.dashDir * PH.DASHV; p.vy = 0;
    if (p.dashT <= 0) p.vx = p.dashDir * PH.RUN;
  } else {
    if (p.wallLock > 0) p.wallLock -= dt;
    else if (mx) { p.vx = approach(p.vx, mx * PH.RUN, (p.onGround ? PH.GACC : PH.AACC) * dt); p.face = mx; }
    else p.vx = approach(p.vx, 0, (p.onGround ? PH.GFRIC : PH.AFRIC) * dt);
    p.vy = Math.min(p.vy + PH.GRAV * dt, PH.MAXFALL);
  }

  // walls (needs the Ice Claws)
  const wasSliding = p.sliding; p.sliding = false;
  if (ab.claws && !p.onGround && p.dashT <= 0) {
    const tl = wallAt(room, p, -1), tr = wallAt(room, p, 1);
    if (tl || tr) { p.wallDir = tl && tr ? (mx || p.face) : tr ? 1 : -1; p.wallCoyote = 0.12; }
    if (p.vy > 0 && p.wallLock <= 0 && ((mx < 0 && tl) || (mx > 0 && tr))) {
      p.sliding = true; p.wallDir = mx; p.vy = Math.min(p.vy, PH.WSLIDE); p.canDash = true;
      if (!wasSliding) Sfx.noise && Sfx.ctx && !Sfx.muted && Sfx.noise(0.05, 0.06, 2600, 2);
      if (Math.random() < 0.25) part(p.x + (mx > 0 ? p.w : 0), p.y + 4, -mx * 20, 30, 0.35, 1.5, '#dff6fb', 200);
    }
  }

  // jump
  if (p.jumpBuf > 0 && !stunned) {
    if (p.coyote > 0) {
      if (I.held.down && p.onOneWay) { p.dropT = 0.2; p.coyote = 0; p.jumpBuf = 0; }
      else {
        if (p.dashT > 0) { p.dashT = 0; p.vx = p.dashDir * PH.RUN; }
        p.vy = -PH.JUMP; p.jumping = true; p.coyote = 0; p.jumpBuf = 0; p.onGround = false; Sfx.play('jump');
        for (let i = 0; i < 4; i++) part(p.x + p.w / 2, p.y + p.h, (Math.random() - 0.5) * 60, -Math.random() * 20, 0.3, 2, '#e6f1f6');
      }
    } else if (ab.claws && p.wallCoyote > 0 && p.dashT <= 0) {
      p.vy = -PH.WJY; p.vx = -p.wallDir * PH.WJX; p.wallLock = PH.WLOCK; p.face = -p.wallDir;
      p.wallCoyote = 0; p.jumpBuf = 0; p.jumping = true; p.canDash = true; p.sliding = false; Sfx.play('jump');
      for (let i = 0; i < 5; i++) part(p.x + (p.wallDir > 0 ? p.w : 0), p.y + 10 + Math.random() * 10, -p.wallDir * Math.random() * 50, (Math.random() - 0.3) * 60, 0.3, 2, '#dff6fb', 200);
    }
  }
  if (p.jumping) { if (p.vy >= 0) p.jumping = false; else if (!I.held.jump) { p.vy *= 0.45; p.jumping = false; } }

  // move
  p.dropThrough = p.dropT > 0;
  moveX(p, p.vx * dt, room);
  moveY(p, p.vy * dt, room);
  if (p.onGround) {
    if (!p.wasGround) { p.landT = 0.12; if (p.coyote <= 0) Sfx.play('land'); }
    p.coyote = 0.1; p.canDash = true; p.wallCoyote = 0;
    if (Math.abs(p.vx) > 20) p.runPhase += dt * 18;
    // remember the last firm footing, for hazard recovery
    p.safeT -= dt;
    if (p.safeT <= 0 && p.inv <= 0) {
      p.safeT = 0.12;
      const tx = Math.floor((p.x + p.w / 2) / T), ty = Math.floor((p.y + p.h + 1) / T);
      const firm = (x) => solidAt(room, x, ty) && x >= 0 && x < room.w;
      const sharp = (x) => { const c = tileAt(room, x, ty - 1), d = tileAt(room, x, ty); return c === '^' || c === 'v' || d === '^'; };
      if (firm(tx) && firm(tx - 1) && firm(tx + 1) && !sharp(tx - 1) && !sharp(tx) && !sharp(tx + 1)) { p.safe.x = tx * T + (T - p.w) / 2; p.safe.y = ty * T - p.h; }
    }
  }
  p.wasGround = p.onGround;

  // strike
  if (p.atkBuf > 0 && p.atkCd <= 0 && !stunned) {
    p.atkBuf = 0; p.atkCd = 0.36; p.atkT = 0.13; p.atkId++;
    p.atkDir = I.held.up ? 'up' : I.held.down && !p.onGround ? 'down' : 'side';
    p.atkFace = p.sliding ? -p.wallDir : p.face;
    p.atkPeal = p.res >= PH.RESMAX;
    if (p.atkPeal) {
      p.res = 0; if (G.save.relics.clapper && p.hp < p.maxHp) p.hp++;
      ringFx(p.x + p.w / 2, p.y + p.h / 2, 70, '#ffd27a', 0.45); G.shake = Math.max(G.shake, 3);
      burst(p.x + p.w / 2, p.y + p.h / 2, 14, 120, '#ffd27a', 0.5, 2);
    }
    Sfx.play(p.atkPeal ? 'peal' : 'swing');
  }

  // scarf trail
  const tr = p.trail, ax = p.x + p.w / 2 - p.face * 3, ay = p.y + 9;
  if (!tr.length) for (let i = 0; i < 6; i++) tr.push({ x: ax, y: ay });
  let lx = ax, ly = ay;
  for (let i = 0; i < tr.length; i++) {
    const s = tr[i]; s.y += 14 * dt; s.x -= p.face * 6 * dt;
    const dx = s.x - lx, dy = s.y - ly, d = Math.hypot(dx, dy) || 1, seg = 3.2;
    if (d > seg) { s.x = lx + (dx / d) * seg; s.y = ly + (dy / d) * seg; }
    lx = s.x; ly = s.y;
  }
}

function attackBox(p) {
  const cx = p.x + p.w / 2, cy = p.y + p.h / 2, k = (p.atkPeal ? 1.5 : 1) * (G.save.relics.spine ? 1.3 : 1);
  if (p.atkDir === 'up') return { x: cx - 17 * k, y: p.y - 30 * k, w: 34 * k, h: 34 * k };
  if (p.atkDir === 'down') return { x: cx - 17 * k, y: p.y + p.h - 4, w: 34 * k, h: 32 * k };
  const w = 38 * k, h = 30 * k;
  return { x: p.atkFace > 0 ? cx - 2 : cx - w + 2, y: cy - h / 2 - 2, w, h };
}

function hurtPlayer(fromX, hazard, dmg) {
  const p = G.player;
  if (p.inv > 0 || p.dead || G.state !== 'play' || G.god) return false;
  if (!hazard && p.dodge > 0) return false; // the first instant of a dash slips through blows
  p.hp -= dmg || 1; p.inv = 1.0; p.hurtT = 0.28; p.dashT = 0; p.jumping = false; p.atkT = 0; p.healT = 0;
  p.vx = (p.x + p.w / 2 < fromX ? -1 : 1) * 190; p.vy = -250;
  G.shake = Math.max(G.shake, (dmg || 1) > 1 ? 11 : 7); G.hitstop = (dmg || 1) > 1 ? 0.14 : 0.09; Sfx.play('hurt'); buzz((dmg || 1) > 1 ? 110 : 55);
  burst(p.x + p.w / 2, p.y + p.h / 2, 12, 150, '#ffb347', 0.5, 2.5, 300);
  if (p.hp <= 0) killPlayer();
  else if (hazard) recoverFromHazard();
  return true;
}
