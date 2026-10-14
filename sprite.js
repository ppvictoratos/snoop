// Snoop: pixel-art dog frames. Each frame is a 2D array of palette keys.
// '.' is transparent. Only the five colors from the brief are used.

const SNOOP_PALETTE = {
  F: '#B5652B', // fawn body
  D: '#5A3418', // dark brown: ears, back shading, shadows
  W: '#F2EDE4', // white: blaze, chest, front paws
  K: '#1A1A1A', // eye and nose
  C: '#3E8E7E', // teal collar
};

const SNOOP_W = 24;
const SNOOP_H = 16;
const SNOOP_SCALE = 6;

// Head, neck and torso (rows 0-10). Shared by every frame.
const SNOOP_BODY = [
  '................FFFFF...',
  '..............DDFFFFFF..',
  '..............DDDFKFWW..',
  '..............DDDFFFWWW.',
  '..............DDFFWWWWK.',
  '..DDDDDDDDDDDDDDFFWWW...',
  '..FFFFFFFFFFFFCCFFWW....',
  '..FFFFFFFFFFFFFFWWWW....',
  '..FFFFFFFFFFFFFWWWW.....',
  '...FFFFFFFFFFFFWWWW.....',
  '...FFFFFFFFFFFFFFWW.....',
];

// A leg is two pixels wide and drops from the body to the ground (row 15).
// `lift` shortens it by one row so the paw hangs in the air.
function leg(x, paw, lift) {
  const foot = lift ? 14 : 15;
  const cells = [];
  for (let y = 11; y <= foot; y++) {
    if (y === foot) {
      cells.push([x, y, paw], [x + 1, y, paw]);
    } else {
      cells.push([x, y, 'F'], [x + 1, y, 'D']);
    }
  }
  return cells;
}

// Folded hind leg for the sitting pose.
function haunch() {
  const cells = [];
  for (let y = 11; y <= 14; y++) {
    for (let x = 3; x <= 8; x++) cells.push([x, y, x === 3 ? 'D' : 'F']);
  }
  for (let x = 3; x <= 8; x++) cells.push([x, 15, x >= 7 ? 'W' : 'D']);
  return cells;
}

// Tail positions: up (default) and mid (wag).
const SNOOP_TAIL_UP = [[1, 5, 'D'], [0, 4, 'F'], [1, 4, 'D'], [0, 3, 'D'], [1, 3, 'F']];
const SNOOP_TAIL_MID = [[1, 5, 'D'], [0, 5, 'F'], [0, 4, 'D'], [1, 4, 'F']];

function buildFrame(cells, tail) {
  const grid = [];
  for (let y = 0; y < SNOOP_H; y++) {
    const row = SNOOP_BODY[y] || '.'.repeat(SNOOP_W);
    grid.push(row.split(''));
  }
  for (const [x, y, key] of [...tail, ...cells]) grid[y][x] = key;
  return grid;
}

const SNOOP = {
  // 4-frame run cycle: front and back legs alternate stride.
  run: [
    buildFrame([...leg(17, 'W', false), ...leg(2, 'F', false)], SNOOP_TAIL_UP),
    buildFrame([...leg(15, 'W', true), ...leg(3, 'F', false)], SNOOP_TAIL_UP),
    buildFrame([...leg(13, 'W', false), ...leg(5, 'F', false)], SNOOP_TAIL_UP),
    buildFrame([...leg(15, 'W', false), ...leg(3, 'F', true)], SNOOP_TAIL_UP),
  ],
  // 2-frame idle: sitting, tail wags side to side.
  idle: [
    buildFrame([...haunch(), ...leg(15, 'W', false)], SNOOP_TAIL_UP),
    buildFrame([...haunch(), ...leg(15, 'W', false)], SNOOP_TAIL_MID),
  ],
};

// Lets the sprite be checked from Node. Browsers ignore this.
if (typeof module !== 'undefined') {
  module.exports = { SNOOP, SNOOP_PALETTE, SNOOP_W, SNOOP_H, SNOOP_SCALE };
}
