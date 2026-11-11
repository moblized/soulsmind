// ===== Level 2: Duskmarch, a fallen kingdom where the sun never finished setting =====
const LEVELS = {
  1: { name: 'Rimebell', tag: 'A hundred winters of silence. One small flame.' },
  2: { name: 'Duskmarch', tag: 'A sun that never finished setting.' },
};
const levelOf = (id) => (ROOMS[id] && ROOMS[id].level) || 1;
// boss arenas: the Barrow Warden's crypt floor, and the Court where Varhelm kneels
const WARD = { x0: T, x1: 30 * T, floor: 24 * T, top: 11 * T };
const COURT = { x0: T, x1: 26 * T, floor: 14 * T, ceil: 2 * T, trigger: 24 * T };

// h = Barrow Hound, k = Oathbound Knight, q = Ash Archer, J = Cinder Step (behind the Warden)
Object.assign(ROOMS, {
  oldroad: {
    name: 'The Old Road', level: 2, kind: 'dusk', w: 52, h: 20, map: [10, 2, 7, 3], items: { '2,6': 'mail' },
    exits: { a: ['sanctum', 'b'], b: ['barrow', 'a'], c: ['rampart', 'a'] },
    signs: {
      '43,17': 'DUSKMARCH. The sun over this kingdom began to set a hundred years ago and never finished. Its knights still keep their oaths to a king long dead.',
      '28,17': 'Oathbound knights raise their shields to anything in front of them. Strike from behind or from above, or wait out the thrust and punish it. A Peal breaks any guard.',
    },
    build(o) {
      o.f(0, 18, 51, 19);                               // the road
      o.f(51, 0, 51, 15).p(51, 16, 'a').p(51, 17, 'a'); // back up to the monastery
      o.f(0, 0, 0, 4).f(0, 7, 0, 15);
      o.p(0, 5, 'c').p(0, 6, 'c').p(0, 16, 'b').p(0, 17, 'b');
      o.f(18, 16, 20, 17).f(12, 13, 16, 13).f(5, 10, 9, 10).f(1, 7, 4, 7); // ruined stair to the ramparts
      o.f(36, 15, 38, 17);                              // a fallen wall
      o.p(25, 17, '^').p(26, 17, '^');                  // broken spears
      o.p(46, 17, 'B').p(43, 17, 'S').p(28, 17, 'S').p(2, 6, 'E');
      o.p(33, 17, 'h').p(22, 17, 'k').p(14, 12, 'q').p(7, 17, 'h');
    },
  },
  barrow: {
    name: 'The Barrow Crypt', level: 2, kind: 'crypt', w: 34, h: 26, map: [5, 4, 5, 4], items: { '26,5': 'shroud' },
    exits: { a: ['oldroad', 'b'] },
    signs: {
      '30,7': 'The barrows keep the knights who would not stop fighting. Their warden still walks the lowest crypt, swinging the lantern that once rang the dead to sleep.',
    },
    build(o) {
      o.f(0, 0, 33, 1).f(0, 24, 33, 25).f(0, 2, 0, 23).f(33, 2, 33, 5).f(33, 8, 33, 23);
      o.p(33, 6, 'a').p(33, 7, 'a');
      o.f(20, 8, 30, 9);                 // upper gallery
      o.f(31, 8, 32, 8, '=');            // boards over the shaft
      o.f(30, 10, 30, 21);               // shaft wall; the crawlway under it is gated during the fight
      o.p(30, 22, 'G').p(30, 23, 'G');
      o.f(24, 6, 26, 7);                 // a knight's tomb
      o.f(10, 3, 12, 3, '=');            // a beam far above the crypt floor
      o.p(28, 7, 'B').p(30, 7, 'S').p(3, 23, 'J').p(11, 2, 'H').p(26, 5, 'E');
      o.p(25, 5, 'q').p(21, 7, 'h');
    },
  },
  rampart: {
    name: 'Rampart Walk', level: 2, kind: 'dusk', w: 56, h: 22, map: [3, 0, 7, 3], items: { '41,13': 'spear' },
    exits: { a: ['oldroad', 'c'], b: ['court', 'a'] },
    signs: {
      '47,16': 'The rampart road ends at the Court of the Unsetting Knight. He swore to guard the sun until it set.',
      '15,16': 'The stair to the Court fell long ago. Only stones hang in the air now. Pilgrims who could step on embers went up.',
    },
    build(o) {
      o.f(55, 0, 55, 14).f(55, 17, 55, 21).p(55, 15, 'a').p(55, 16, 'a');
      o.f(34, 17, 54, 21);               // east rampart
      o.f(14, 17, 27, 21);               // west rampart; a collapse between them
      o.f(0, 0, 0, 2).f(0, 5, 0, 21).p(0, 3, 'b').p(0, 4, 'b');
      o.f(1, 5, 3, 5);                   // the Court's door step
      o.f(8, 13, 10, 13, '=').f(4, 9, 6, 9, '='); // hanging stones
      o.f(40, 14, 41, 16).f(24, 14, 25, 16);      // watchtowers
      o.p(50, 16, 'B').p(47, 16, 'S').p(19, 16, 'B').p(15, 16, 'S').p(41, 13, 'E');
      o.p(40, 13, 'q').p(24, 13, 'q').p(37, 16, 'h').p(45, 16, 'k').p(26, 16, 'k');
    },
  },
  court: {
    name: 'Court of the Unsetting', level: 2, kind: 'crypt', w: 30, h: 16, map: [0, 0, 3, 2],
    exits: { a: ['rampart', 'b'] },
    signs: {},
    build(o) {
      o.f(0, 0, 29, 1).f(0, 14, 29, 15).f(0, 2, 0, 13).f(29, 2, 29, 11).p(29, 12, 'a').p(29, 13, 'a');
      o.f(26, 2, 28, 11).p(26, 12, 'G').p(26, 13, 'G');
      o.f(4, 10, 7, 10, '=').f(18, 10, 21, 10, '=');
    },
  },
});

// The sanctum gains a west door that stays sealed until the great bell rings.
(function () {
  const s = ROOMS.sanctum, build = s.build;
  s.exits.b = ['oldroad', 'a']; s.locks = { b: 'done' };
  s.build = (o) => { build(o); o.p(0, 12, 'b').p(0, 13, 'b'); };
})();
