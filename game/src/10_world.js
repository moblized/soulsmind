// ===== world: rooms and tile collision =====
// Tile legend: # stone, = one-way beam, ^ floor icicles, v hanging icicles, G boss gate,
// B brazier, S tablet, r/w/m enemies, 1 Ice Claws, 2 Gale Sash, H Ember Shard, Z boss, L great bell,
// a-d exits (see each room's `exits`).
function buildRoom(w, h, fn) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const o = {
    f(x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < h && x >= 0 && x < w) g[y][x] = c || '#'; return o; },
    p(x, y, c) { g[y][x] = c; return o; },
  };
  fn(o);
  return g;
}

const ARENA = { x0: T, x1: 24 * T, floor: 14 * T, ceil: 2 * T, trigger: 22.5 * T };

const ROOMS = {
  gate: {
    name: "Pilgrim's Gate", kind: 'outdoor', w: 40, h: 16, map: [3, 6, 5, 2],
    exits: { a: ['cloister', 'a'] },
    signs: {
      '6,12': '{M} to walk. {J} leaps. Hold it longer to leap higher.',
      '15,10': '{H} drinks from your ember flask and mends two embers. Stand still on firm ground while you drink. It refills only when you rest at a brazier.',
      '24,12': '{A} swings your bell-staff. {U} as you strike to aim. Eight clean strikes charge a Peal: one heavy blow.',
      '36,12': 'HUSHPEAK. Its bells have slept a hundred winters. Pilgrim, if you carry a flame, carry it upward.',
    },
    build(o) {
      o.f(0, 13, 39, 15).f(0, 0, 0, 12).f(39, 0, 39, 10);
      o.p(39, 11, 'a').p(39, 12, 'a');
      o.f(11, 12, 13, 12).f(14, 11, 16, 12);          // two steps
      o.p(20, 12, '^').p(21, 12, '^');                 // first hazard
      o.f(29, 9, 33, 9);                               // floating ledge
      o.p(3, 12, 'B').p(6, 12, 'S').p(15, 10, 'S').p(24, 12, 'S').p(36, 12, 'S');
      o.p(29, 12, 'r').p(31, 7, 'w');
    },
  },
  cloister: {
    name: 'The Frozen Cloister', kind: 'indoor', w: 44, h: 26, map: [8, 2, 5, 6],
    exits: { a: ['gate', 'a'], b: ['cellar', 'a'], c: ['gallery', 'a'], d: ['approach', 'a'] },
    signs: {
      '18,23': 'Braziers keep your flame. {R} beside a lit one to rest: it mends you, refills your flask, and wakes every foe you felled. Fall, and your chimes stay where you fell. They wait for you once.',
      '36,23': 'Sheer ice, floor to rafters. The novices climbed it with claws of black iron.',
      '26,11': 'The bridge fell the night the Abbot went silent. Only the wind crosses now.',
    },
    build(o) {
      o.f(0, 0, 43, 1).f(0, 24, 43, 25).f(0, 2, 0, 23).f(43, 2, 43, 23);
      o.p(0, 22, 'a').p(0, 23, 'a').p(43, 22, 'b').p(43, 23, 'b').p(43, 10, 'c').p(43, 11, 'c').p(0, 10, 'd').p(0, 11, 'd');
      o.f(1, 12, 17, 13);                              // upper-left gallery
      o.f(24, 12, 39, 13);                             // upper-right gallery
      o.f(39, 12, 39, 20);                             // shaft wall
      o.f(40, 12, 42, 12, '=');                        // beam capping the shaft
      o.f(7, 22, 10, 22).f(13, 20, 17, 20).f(27, 22, 31, 22);
      o.p(21, 23, 'B').p(18, 23, 'S').p(36, 23, 'S').p(26, 11, 'S');
      o.p(12, 23, 'r').p(29, 21, 'r').p(24, 18, 'w').p(32, 8, 'm').p(9, 8, 'w');
    },
  },
  cellar: {
    name: 'Bell Cellar', kind: 'indoor', w: 36, h: 18, map: [13, 6, 4, 2],
    exits: { a: ['cloister', 'b'] },
    signs: {
      '22,9': 'Something large breathes down there. The novices used to feed it. No one has, lately.',
      '27,15': 'Each dawn a novice climbed out of this pit to wake the low bell. The pit remembers how.',
    },
    build(o) {
      o.f(0, 0, 35, 0).f(0, 1, 0, 17).f(35, 1, 35, 17).f(0, 16, 35, 17);
      o.p(0, 8, 'a').p(0, 9, 'a');
      o.f(1, 10, 23, 15);                              // raised floor; the pit is columns 24-34
      o.f(9, 6, 12, 6);
      o.f(15, 1, 18, 1, 'v');
      o.p(3, 9, 'B').p(31, 15, '1').p(27, 15, 'S').p(22, 9, 'S');
      o.p(8, 9, 'r').p(19, 9, 'r').p(21, 4, 'm').p(11, 4, 'w');
    },
  },
  gallery: {
    name: 'Wind Gallery', kind: 'outdoor', w: 56, h: 20, map: [13, 2, 7, 2],
    exits: { a: ['cloister', 'c'] },
    signs: { '5,11': 'The wind took the sash-dancers first. Their sashes still snap on the far ledge.' },
    build(o) {
      o.f(0, 0, 0, 9).f(0, 12, 7, 19).f(55, 0, 55, 19);
      o.p(0, 10, 'a').p(0, 11, 'a');
      o.f(11, 12, 13, 19);                             // pillar
      o.f(17, 6, 19, 19);                              // first ice wall
      o.f(23, 8, 27, 8);                               // floating slab
      o.f(31, 10, 34, 19);                             // pillar
      o.f(38, 4, 40, 19);                              // second ice wall
      o.f(41, 7, 44, 7, '=').f(45, 8, 47, 8, '=');     // broken bridge
      o.f(48, 10, 54, 19);                             // far ledge
      o.f(7, 6, 10, 6).f(1, 4, 4, 4);                  // hidden perch (needs the sash)
      o.p(3, 11, 'B').p(5, 11, 'S').p(52, 9, '2').p(2, 3, 'H');
      o.p(25, 5, 'w').p(33, 9, 'r').p(44, 3, 'm').p(36, 6, 'w');
    },
  },
  approach: {
    name: 'Hall of Hush', kind: 'indoor', w: 32, h: 16, map: [4, 2, 4, 2],
    exits: { a: ['cloister', 'd'], b: ['sanctum', 'a'] },
    signs: { '23,13': 'Beyond this hall the Abbot keeps his vigil. He rang the last bell, then swallowed its sound.' },
    build(o) {
      o.f(0, 0, 31, 1).f(0, 14, 31, 15).f(0, 2, 0, 13).f(31, 2, 31, 13);
      o.p(31, 12, 'a').p(31, 13, 'a').p(0, 12, 'b').p(0, 13, 'b');
      o.f(12, 2, 18, 11);                              // low lintel over the trench
      o.f(14, 14, 16, 14, '^');
      o.p(27, 13, 'B').p(23, 13, 'S');
      o.p(21, 6, 'w').p(6, 7, 'm').p(5, 13, 'r');
    },
  },
  sanctum: {
    name: 'The Silent Sanctum', kind: 'indoor', w: 28, h: 16, map: [0, 2, 4, 2],
    exits: { a: ['approach', 'b'] },
    signs: {},
    build(o) {
      o.f(0, 0, 27, 1).f(0, 14, 27, 15).f(0, 2, 0, 13).f(27, 2, 27, 13);
      o.p(27, 12, 'a').p(27, 13, 'a');
      o.f(24, 2, 26, 11);                              // entry corridor
      o.p(24, 12, 'G').p(24, 13, 'G');
      o.f(4, 12, 7, 12, '=').f(16, 12, 19, 12, '=');
      o.p(12, 6, 'Z').p(12, 13, 'L');
    },
  },
};

function tileAt(room, tx, ty) { return tx < 0 || ty < 0 || tx >= room.w || ty >= room.h ? '' : room.grid[ty][tx]; }
function solidAt(room, tx, ty) {
  if (tx < 0 || tx >= room.w) return true;
  if (ty < 0 || ty >= room.h) return false;
  const c = room.grid[ty][tx];
  return c === '#' || c === 'X' || (c === 'G' && room.gateClosed);
}
function onewayAt(room, tx, ty) { return tx >= 0 && ty >= 0 && tx < room.w && ty < room.h && room.grid[ty][tx] === '='; }
// true if there is a wall the hero can cling to on that side
function wallAt(room, e, dir) {
  const px = dir > 0 ? e.x + e.w + 1 : e.x - 1, tx = Math.floor(px / T);
  if (tx < 0 || tx >= room.w) return false;
  const y0 = Math.floor((e.y + 3) / T), y1 = Math.floor((e.y + e.h - 4) / T);
  for (let ty = y0; ty <= y1; ty++) if (ty >= 0 && ty < room.h && room.grid[ty][tx] === '#') return true;
  return false;
}
function moveX(e, dx, room) {
  e.x += dx; e.hitWall = 0;
  const y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  if (dx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(room, tx, ty)) { e.x = tx * T - e.w; e.hitWall = 1; e.vx = 0; break; }
  } else if (dx < 0) {
    const tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (solidAt(room, tx, ty)) { e.x = (tx + 1) * T; e.hitWall = -1; e.vx = 0; break; }
  }
}
function moveY(e, dy, room) {
  const prevBottom = e.y + e.h;
  e.y += dy; e.onGround = false; e.hitCeil = false; e.onOneWay = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
  if (dy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / T); let solid = false, one = false;
    for (let tx = x0; tx <= x1; tx++) {
      if (solidAt(room, tx, ty)) solid = true;
      else if (onewayAt(room, tx, ty) && !e.dropThrough && prevBottom <= ty * T + 0.01) one = true;
    }
    if (solid || one) { e.y = ty * T - e.h; e.onGround = true; e.onOneWay = !solid; e.vy = 0; }
  } else if (dy < 0) {
    const ty = Math.floor(e.y / T);
    for (let tx = x0; tx <= x1; tx++) if (solidAt(room, tx, ty)) { e.y = (ty + 1) * T; e.hitCeil = true; e.vy = 0; break; }
  }
}
// icicles: returns true if box touches a hazard tile's sharp part
function hazardHit(room, b) {
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T), y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = tileAt(room, tx, ty);
    if (c === '^' && b.y + b.h > ty * T + 9 && b.x + b.w > tx * T + 3 && b.x < tx * T + T - 3) return true;
    if (c === 'v' && b.y < ty * T + 15 && b.x + b.w > tx * T + 3 && b.x < tx * T + T - 3) return true;
  }
  return false;
}
