const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const toggle = document.getElementById('scan-toggle');
const status = document.getElementById('status');

const GROUND_H = 6;          // dark brown strip along the bottom edge
const SPRITE_PX_W = SNOOP_W * SNOOP_SCALE;
const SPRITE_PX_H = SNOOP_H * SNOOP_SCALE;
const RUN_SPEED = 2;         // px per frame at 60fps
const RUN_FRAME_TICKS = 6;   // frames between run-cycle steps
const WAG_TICKS = 20;        // frames between tail wags
const EAR_FLOP_TICKS = 12;   // frames the ear stays flopped after turning

const DEMO = new URLSearchParams(location.search).has('demo');  // ?demo: run forever, for fun
const DEMO_REST_MS = 2000;   // sit and wag between demo laps

const snoop = { x: 40, dir: 1, tick: 0, frame: 0, flop: 0, scanning: false };
let stopScanFn = null;

// Placeholder scan: fakes progress so the animation can be tested.
// Replace the body with the real work. Returns a cancel function.
function scan(onProgress, onDone) {
  let p = 0;
  const id = setInterval(() => {
    p = Math.min(1, p + 0.01);
    onProgress(p);
    if (p >= 1) {
      clearInterval(id);
      onDone();
    }
  }, 100);
  return () => clearInterval(id);
}

function resize() {
  canvas.width = document.documentElement.clientWidth;
  canvas.height = 160;
  snoop.x = Math.min(snoop.x, canvas.width - SPRITE_PX_W);
}

function drawGrid(grid, x, y, flip) {
  for (let r = 0; r < SNOOP_H; r++) {
    for (let c = 0; c < SNOOP_W; c++) {
      const key = grid[r][c];
      if (key === '.') continue;
      const col = flip ? SNOOP_W - 1 - c : c;
      ctx.fillStyle = SNOOP_PALETTE[key];
      ctx.fillRect(x + col * SNOOP_SCALE, y + r * SNOOP_SCALE, SNOOP_SCALE, SNOOP_SCALE);
    }
  }
}

// Turning around flops the ear for a moment.
function turn(dir) {
  if (snoop.dir !== dir) snoop.flop = EAR_FLOP_TICKS;
  snoop.dir = dir;
}

function update() {
  snoop.tick++;
  if (!snoop.scanning) return;

  if (snoop.flop > 0) snoop.flop--;
  snoop.x += RUN_SPEED * snoop.dir;
  const maxX = canvas.width - SPRITE_PX_W;
  if (snoop.x <= 0) {
    snoop.x = 0;
    turn(1);
  } else if (snoop.x >= maxX) {
    snoop.x = maxX;
    turn(-1);
  }

  if (snoop.tick % RUN_FRAME_TICKS === 0) {
    snoop.frame = (snoop.frame + 1) % SNOOP.run.length;
  }
}

function render() {
  const h = canvas.height;
  ctx.clearRect(0, 0, canvas.width, h);

  ctx.fillStyle = SNOOP_PALETTE.D;
  ctx.fillRect(0, h - GROUND_H, canvas.width, GROUND_H);

  const runFrames = snoop.flop > 0 ? SNOOP.runFlop : SNOOP.run;
  const grid = snoop.scanning
    ? runFrames[snoop.frame]
    : SNOOP.idle[Math.floor(snoop.tick / WAG_TICKS) % SNOOP.idle.length];
  const spriteY = h - GROUND_H - SPRITE_PX_H;
  drawGrid(grid, snoop.x, spriteY, snoop.dir < 0);
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

function startScan() {
  snoop.scanning = true;
  toggle.textContent = 'Stop Scan';
  status.textContent = 'Scanning… 0%';
  stopScanFn = scan(
    (p) => { status.textContent = `Scanning… ${Math.round(p * 100)}%`; },
    () => {
      stopScan('Scan complete. Snoop is sitting.');
      if (DEMO) setTimeout(startScan, DEMO_REST_MS);
    },
  );
}

function stopScan(message = 'Snoop is sitting. Idle.') {
  if (stopScanFn) stopScanFn();
  stopScanFn = null;
  snoop.scanning = false;
  toggle.textContent = 'Start Scan';
  status.textContent = message;
}

toggle.addEventListener('click', () => {
  if (snoop.scanning) {
    stopScan('Scan stopped. Snoop is sitting.');
  } else {
    startScan();
  }
});

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(loop);
if (DEMO) startScan();
