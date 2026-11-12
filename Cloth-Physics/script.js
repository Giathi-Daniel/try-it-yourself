const canvas = document.getElementById("cloth");
const ctx = canvas.getContext("2d");

const COLS = 34, ROWS = 22, GAP = 16;
const GRAVITY = 0.45, DRAG = 0.985, TEAR = 3.4;

let points = [], sticks = [], t = 0;
const mouse = { x: 0, y: 0, grab: null };

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = innerWidth * dpr;
  canvas.height = innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  build();
}

// A grid of points, each one tied to its neighbours.
function build() {
  points = [];
  sticks = [];
  const left = (innerWidth - (COLS - 1) * GAP) / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = left + c * GAP, y = 70 + r * GAP;
      const p = { x, y, px: x, py: y, hue: 185 + r * 7, pinned: r === 0 && c % 3 === 0 };
      if (c > 0) link(points[points.length - 1], p);
      if (r > 0) link(points[points.length - COLS], p);
      points.push(p);
    }
  }
}

function link(a, b) {
  sticks.push({ a, b });
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.lineWidth = 1.3;
  for (const s of sticks) {
    ctx.strokeStyle = `hsl(${s.a.hue}, 85%, 68%)`;
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y);
    ctx.lineTo(s.b.x, s.b.y);
    ctx.stroke();
  }
}

const fixed = (p) => p.pinned || p === mouse.grab;

// Verlet: next = pos + (pos - prev) + gravity
function step() {
  t++;
  for (const p of points) {
    if (fixed(p)) continue;
    const vx = (p.x - p.px) * DRAG;
    const vy = (p.y - p.py) * DRAG;
    p.px = p.x;
    p.py = p.y;
    p.x += vx + Math.sin(t * 0.03 + p.y * 0.02) * 0.05;
    p.y += vy + GRAVITY;
  }
  if (mouse.grab) {
    mouse.grab.x = mouse.x;
    mouse.grab.y = mouse.y;
  }
  for (let i = 0; i < 5; i++) satisfy();
  sticks = sticks.filter((s) => !s.torn);
}

// Pull every stick back to its length. Too far, and it tears.
function satisfy() {
  for (const s of sticks) {
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const d = Math.hypot(dx, dy);
    if (d > GAP * TEAR) { s.torn = true; continue; }
    const pull = (d - GAP) / d / 2;
    if (!fixed(s.a)) { s.a.x += dx * pull; s.a.y += dy * pull; }
    if (!fixed(s.b)) { s.b.x -= dx * pull; s.b.y -= dy * pull; }
  }
}

canvas.addEventListener("pointerdown", (e) => {
  let best = 40;
  for (const p of points) {
    const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (d < best) { best = d; mouse.grab = p; }
  }
});

addEventListener("pointermove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

addEventListener("pointerup", () => { mouse.grab = null; });
addEventListener("dblclick", build);
addEventListener("resize", resize);

function loop() {
  step();
  draw();
  requestAnimationFrame(loop);
}

resize();
loop();
