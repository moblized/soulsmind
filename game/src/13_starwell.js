// ===== Level 3: Starwell, the mountaintop observatory where the old astronomers caught falling stars =====
LEVELS[3] = { name: 'Starwell', tag: 'Where the stars come down.' };
// boss arenas: the Silk Gallery's roof (the Night Moth) and the Starwell Dome (Orren)
const MOTHA = { x0: T, x1: 27 * T, ceil: 2 * T, floor: 20 * T, trigger: 26 * T };
const DOME = { x0: T, x1: 26 * T, floor: 16 * T, ceil: 2 * T, trigger: 24 * T };

// n = Starling Moth, o = Orrery Sentinel, y = Blink Acolyte, M = Starsilk Mantle (behind the Night Moth)
Object.assign(ROOMS, {
  stair: {
    name: 'The Switchback Stair', level: 3, kind: 'star', w: 34, h: 34, map: [22, 1, 4, 5],
    exits: { a: ['court', 'b'], b: ['silk', 'a'] },
    signs: {
      '27,31': 'THE STARWELL. Astronomers built this house to catch what the sky drops. Since the sun went down in Duskmarch, the sky has not stopped dropping. Watch for light above you.',
      '4,20': 'The stair was cut for pilgrims with lighter feet. Leap twice where it breaks.',
    },
    build(o) {
      o.f(0, 32, 33, 33);
      o.f(33, 0, 33, 29).p(33, 30, 'a').p(33, 31, 'a');
      o.f(0, 0, 0, 3).f(0, 6, 0, 31).p(0, 4, 'b').p(0, 5, 'b');
      o.f(20, 29, 26, 29).f(10, 25, 16, 25).f(2, 21, 8, 21).f(12, 17, 20, 17).f(24, 13, 31, 13).f(14, 9, 20, 9).f(1, 6, 8, 6);
      o.p(30, 31, 'B').p(27, 31, 'S').p(4, 20, 'S');
      o.p(14, 22, 'n').p(27, 10, 'n').p(16, 16, 'y');
    },
  },
  silk: {
    name: 'The Silk Gallery', level: 3, kind: 'vault', w: 44, h: 22, map: [16, 1, 6, 3],
    exits: { a: ['stair', 'b'], b: ['orrery', 'a'] }, locks: { b: 'moth' },
    signs: {
      '34,19': 'The moths came for the light and stayed for the silk. Their mother sleeps in the gallery roof. The way on lies past her.',
    },
    build(o) {
      o.f(0, 0, 43, 1).f(0, 20, 43, 21);
      o.f(0, 2, 0, 17).p(0, 18, 'b').p(0, 19, 'b');
      o.f(43, 2, 43, 17).p(43, 18, 'a').p(43, 19, 'a');
      o.f(27, 2, 28, 17).p(27, 18, 'G').p(27, 19, 'G');
      o.f(5, 15, 8, 15, '=').f(18, 15, 21, 15, '=').f(11, 11, 15, 11, '=');
      o.p(40, 19, 'B').p(34, 19, 'S').p(2, 19, 'M');
      o.p(37, 12, 'n');
    },
  },
  orrery: {
    name: 'The Orrery Hall', level: 3, kind: 'vault', w: 50, h: 24, map: [10, 1, 6, 3], items: { '31,11': 'robe' },
    exits: { a: ['silk', 'b'], b: ['bridge', 'a'] },
    signs: {
      '43,21': 'The orreries still turn. They were built to follow the stars; now they fire on anything that moves like one.',
    },
    build(o) {
      o.f(0, 0, 49, 1).f(0, 22, 49, 23);
      o.f(49, 2, 49, 19).p(49, 20, 'a').p(49, 21, 'a');
      o.f(0, 2, 0, 2).f(0, 5, 0, 21).p(0, 3, 'b').p(0, 4, 'b');
      o.f(14, 21, 29, 21, '^');          // a pit of broken lenses
      o.f(30, 12, 33, 21);               // the launch tower
      o.f(1, 16, 12, 16);                // the far ledge
      o.f(7, 12, 10, 12, '=').f(2, 8, 5, 8, '=').f(1, 5, 3, 5);
      o.p(46, 21, 'B').p(43, 21, 'S').p(31, 11, 'E');
      o.p(40, 14, 'o').p(20, 8, 'o').p(9, 9, 'o').p(39, 21, 'y').p(5, 15, 'y');
    },
  },
  bridge: {
    name: 'The Star Bridge', level: 3, kind: 'star', w: 64, h: 20, map: [2, 0, 8, 2],
    exits: { a: ['orrery', 'b'], b: ['dome', 'a'] },
    signs: {
      '58,10': 'The bridge fell in pieces. Hold {J} as you fall and the Starsilk carries you across.',
      '10,10': 'Beyond this door Orren keeps his count. He has stopped counting the stars and started keeping them.',
    },
    build(o) {
      o.f(54, 11, 62, 12);
      o.f(63, 0, 63, 8).f(63, 11, 63, 19).p(63, 9, 'a').p(63, 10, 'a');
      o.f(31, 11, 37, 12).f(33, 7, 34, 10);   // the middle span and a broken arch post
      o.f(1, 11, 14, 12);                     // the west span, under Orren's door
      o.f(0, 0, 0, 8).f(0, 11, 0, 19).p(0, 9, 'b').p(0, 10, 'b');
      o.f(27, 15, 29, 19);                    // a lone pillar in the void
      o.p(6, 10, 'B').p(10, 10, 'S').p(58, 10, 'S').p(28, 14, 'H');
      o.p(46, 6, 'n').p(24, 5, 'n').p(22, 3, 'o').p(56, 10, 'y');
    },
  },
  dome: {
    name: 'The Starwell Dome', level: 3, kind: 'vault', w: 30, h: 18, map: [0, 0, 2, 2],
    exits: { a: ['bridge', 'b'] },
    signs: {},
    build(o) {
      o.f(0, 0, 29, 1).f(0, 16, 29, 17).f(0, 2, 0, 15).f(29, 2, 29, 13).p(29, 14, 'a').p(29, 15, 'a');
      o.f(26, 2, 28, 13).p(26, 14, 'G').p(26, 15, 'G');
      o.f(4, 12, 7, 12, '=').f(18, 12, 21, 12, '=');
    },
  },
});

// The Court gains a west door that opens when Varhelm falls.
(function () {
  const c = ROOMS.court, build = c.build;
  c.exits.b = ['stair', 'a']; c.locks = { b: 'knight' };
  c.build = (o) => { build(o); o.p(0, 12, 'b').p(0, 13, 'b'); };
})();
