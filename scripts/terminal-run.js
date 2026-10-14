#!/usr/bin/env node
// Snoop runs back and forth across your terminal. Ctrl+C to stop.
// Needs a truecolor terminal (Terminal.app, iTerm2, VS Code, Ghostty all work).

const { SNOOP, SNOOP_PALETTE, SNOOP_W } = require('../sprite.js');

const RESET = '\x1b[0m';
const bg = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `\x1b[48;2;${n >> 16};${(n >> 8) & 255};${n & 255}m`;
};

function draw(grid, x, flip) {
  let out = '\x1b[H';
  for (const row of grid) {
    const cells = flip ? [...row].reverse() : row;
    const pixels = cells.map((k) => (k === '.' ? RESET : bg(SNOOP_PALETTE[k])) + '  ').join('');
    out += ' '.repeat(x) + pixels + RESET + '\x1b[K\n';
  }
  process.stdout.write(out);
}

let x = 0;
let dir = 1;
let tick = 0;

process.stdout.write('\x1b[2J\x1b[?25l');  // clear screen, hide cursor
process.on('SIGINT', () => {
  process.stdout.write(RESET + '\x1b[?25h\n');
  process.exit(0);
});

setInterval(() => {
  const maxX = Math.max(0, (process.stdout.columns || 80) - SNOOP_W * 2);
  x += dir;
  if (x >= maxX) {
    x = maxX;
    dir = -1;
  } else if (x <= 0) {
    x = 0;
    dir = 1;
  }
  tick++;
  draw(SNOOP.run[Math.floor(tick / 3) % SNOOP.run.length], x, dir < 0);
}, 50);
