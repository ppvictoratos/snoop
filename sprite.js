// Snoop: pixel-art dog frames. Each frame is a 2D array of palette keys.
// '.' is transparent. Colors are sampled to match Snoop's real coat.

const SNOOP_PALETTE = {
  O: '#2B1A0E', // outline
  D: '#5A3418', // dark brown: ears, tail
  S: '#8E4E22', // shadow fawn: topline, far legs, haunch shading
  F: '#B5652B', // fawn body
  L: '#CF8A4E', // light fawn: belly, front of legs
  W: '#F7F3EC', // white: blaze, chest, socks
  G: '#D8CDBD', // shaded white: far-side socks
  K: '#1A1A1A', // nose, muzzle mask, pupil
  M: '#3B2E28', // muzzle edge
  A: '#8B5A24', // amber-chocolate eye
  C: '#3E8E7E', // turquoise collar
  T: '#6CC5B3', // light turquoise collar tiles
};

const SNOOP_W = 36;
const SNOOP_H = 24;
const SNOOP_SCALE = 4;

// Standing: head, neck and torso (rows 0-15). Legs are added per frame.
const SNOOP_BODY = [
  '..........................OOOOO.....',
  '.........................ODDFFWO....',
  '........................ODDDFFWWO...',
  '........................ODDDFFFWWO..',
  '........................ODDFFAKFWWO.',
  '........................ODFFFFFFWWWK',
  '........................OFFFFFFMKKKK',
  '.......OOOOOOOOOOOOOOOOOOFFFWWWMKKO.',
  '......OSSSSSSSSSSSSSSSSSFFFWWWWO....',
  '.....OSFFFFFFFFFFFFFFFFFFFWWWWO.....',
  '.....OFFFFFFFFFFFFFFFFFFFWWWWWO.....',
  '.....OFFFFFFFFFFFFFFFFFWWWWWWWO.....',
  '.....OFFFFFFLLLLLLLLLLWWWWWWWO......',
  '.....OFFFFFLOOOOOOOOOWWWWWWWO.......',
  '.....OFFFFFO.........OWWWWWO........',
  '......OFFFO...........OWWWO.........',
];

// Sitting upright: same head and chest, steep back down to a round haunch
// tucked under him, back foot flat on the ground with white toes forward,
// front legs straight.
const SNOOP_SIT_BODY = [
  '..........................OOOOO.....',
  '.........................ODDFFWO....',
  '........................ODDDFFWWO...',
  '........................ODDDFFFWWO..',
  '........................ODDFFAKFWWO.',
  '.......................OODFFFFFFWWWK',
  '.....................OOSFFFFFFFMKKKK',
  '....................OSSFFFFFWWWMKKO.',
  '...................OSSSSFFFWWWWO....',
  '..................OSFFFFFFWWWWO.....',
  '.................OSFFFFFFWWWWWO.....',
  '................OSFFFFFWWWWWWWO.....',
  '...............OSFFFFFWWWWWWWO......',
  '..............OSFFFFFWWWWWWWO.......',
  '.............OSFFFFFFWWWWWWO........',
  '............OSFFFFLLLWWWWWO.........',
  '...........OSFSFFFOOOOOLFOSSO.......',
  '..........OSSFSFFFFFFFOLFOSSO.......',
  '..........OSSFFSFFFFFFOLFOSSO.......',
  '..........OSSFFFSSFFFFOLFOSSO.......',
  '..........OSSFFFFFSSSSOLFOSSO.......',
  '..........OSFFFFFFWWWWOWWOGGO.......',
  '...........OFFFFFFWWWWOWWOGGO.......',
  '...........OOOOOOOOOOOOOOOOOO.......',
];

// A leg is four pixels wide (outline, two colors, outline) and runs from the
// body down to a white sock. `lift` raises the paw two rows off the ground.
function leg(x, front, back, sock, lift) {
  const foot = lift ? 20 : 22;
  const cells = [];
  for (let y = 15; y <= foot + 1; y++) {
    let row;
    if (y < foot - 1) row = ['O', front, back, 'O'];
    else if (y <= foot) row = ['O', sock, sock, 'O'];
    else row = ['O', 'O', 'O', 'O'];
    row.forEach((key, i) => cells.push([x + i, y, key]));
  }
  return cells;
}

const nearFront = (x, lift) => leg(x, 'L', 'F', 'W', lift);
const farFront = (x, lift) => leg(x, 'S', 'S', 'G', lift);
const nearBack = (x, lift) => leg(x, 'F', 'S', 'W', lift);
const farBack = (x, lift) => leg(x, 'S', 'D', 'G', lift);

// Whip tail: dark brown with a near-black tip. Held up while running; lying on
// the ground and sweeping (wag) while sitting.
const SNOOP_TAIL_RUN = [
  [5, 9, 'S'], [5, 8, 'D'], [4, 7, 'D'], [4, 6, 'D'], [3, 5, 'D'],
  [3, 4, 'D'], [3, 3, 'K'], [2, 2, 'K'],
];
const SNOOP_TAIL_SIT = [
  [9, 22, 'D'], [8, 22, 'D'], [7, 22, 'D'], [6, 22, 'D'], [5, 22, 'D'],
  [4, 22, 'K'], [3, 22, 'K'],
];
const SNOOP_TAIL_WAG = [
  [9, 21, 'D'], [8, 21, 'D'], [7, 20, 'D'], [6, 20, 'D'], [5, 19, 'D'],
  [4, 19, 'K'], [3, 18, 'K'],
];

// Collar: a band of turquoise tiles running from the back of the neck down
// across the white throat. Same place in every pose.
const SNOOP_COLLAR = [
  [25, 7, 'C'], [26, 7, 'T'],
  [26, 8, 'T'], [27, 8, 'C'],
  [27, 9, 'C'], [28, 9, 'T'],
  [28, 10, 'T'], [29, 10, 'C'],
];
// The sitting neck is taller, so the collar reaches one row higher.
const SNOOP_COLLAR_SIT = [[24, 6, 'T'], [24, 7, 'C']];

// Ear flop: for a moment after Snoop turns around, the ear tip lifts and
// kicks back a couple of pixels. Overrides the resting ear.
const SNOOP_EAR_FLOP = [
  [23, 0, 'O'], [24, 0, 'O'], [25, 0, 'O'],
  [22, 1, 'O'], [23, 1, 'D'], [24, 1, 'D'], [25, 1, 'D'],
  [22, 2, 'O'], [23, 2, 'D'], [24, 2, 'D'],
  [23, 3, 'O'],
  [25, 4, 'F'], [26, 4, 'F'],
  [25, 5, 'F'],
];

function buildFrame(body, cells, tail, extra = []) {
  const grid = [];
  for (let y = 0; y < SNOOP_H; y++) {
    const row = body[y] || '.'.repeat(SNOOP_W);
    grid.push(row.split(''));
  }
  for (const [x, y, key] of [...tail, ...cells, ...SNOOP_COLLAR, ...extra]) grid[y][x] = key;
  return grid;
}

// Leg positions for the 4-frame run cycle. Far legs are drawn first so near
// legs overlap them.
const SNOOP_RUN_LEGS = [
  [...farFront(21), ...farBack(7), ...nearFront(25), ...nearBack(3)],
  [...farFront(22), ...farBack(7, true), ...nearFront(23, true), ...nearBack(5)],
  [...farFront(24), ...farBack(4), ...nearFront(21), ...nearBack(8)],
  [...farFront(22, true), ...farBack(5), ...nearFront(23), ...nearBack(6, true)],
];

const SNOOP = {
  // 4-frame run cycle.
  run: SNOOP_RUN_LEGS.map((legs) => buildFrame(SNOOP_BODY, legs, SNOOP_TAIL_RUN)),
  // Same run cycle with the ear flopped, shown briefly after turning around.
  runFlop: SNOOP_RUN_LEGS.map((legs) => buildFrame(SNOOP_BODY, legs, SNOOP_TAIL_RUN, SNOOP_EAR_FLOP)),
  // 2-frame idle: sitting upright, tail wagging.
  idle: [
    buildFrame(SNOOP_SIT_BODY, [], SNOOP_TAIL_SIT, SNOOP_COLLAR_SIT),
    buildFrame(SNOOP_SIT_BODY, [], SNOOP_TAIL_WAG, SNOOP_COLLAR_SIT),
  ],
};

// Lets the sprite be checked from Node. Browsers ignore this.
if (typeof module !== 'undefined') {
  module.exports = { SNOOP, SNOOP_PALETTE, SNOOP_W, SNOOP_H, SNOOP_SCALE };
}
