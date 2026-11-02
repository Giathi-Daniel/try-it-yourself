// ===== SETUP =====
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');

const GRAVITY = 2400;    // px per second²
const PASSES = 8;        // constraint passes per step
const STEP_TIME = 0.28;  // seconds per footstep
const DT = 1 / 60;       // fixed physics step

let W, H, GROUND, S;     // S = body scale in px

const mouse = { x: 0, y: 0, last: -1e9 };
let grab = null;         // the point being dragged

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  GROUND = H * 0.82;
  S = Math.min(H, W * 1.4) / 10;
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => t * t * (3 - 2 * t);

// ===== RAGDOLL: points joined by sticks =====
let P, points, sticks;

function point(x, y, r = 0) {
  return { x, y, px: x, py: y, r };  // px/py = last position
}

function buildRagdoll(x) {
  const g = GROUND;
  P = {
    head:   point(x, g - 4.3 * S, 0.42 * S),
    neck:   point(x, g - 3.5 * S),
    hip:    point(x, g - 2 * S),
    elbowL: point(x - 0.1 * S, g - 2.8 * S),
    handL:  point(x - 0.2 * S, g - 2.1 * S),
    elbowR: point(x + 0.1 * S, g - 2.8 * S),
    handR:  point(x + 0.2 * S, g - 2.1 * S),
    kneeL:  point(x - 0.1 * S, g - 1 * S),
    footL:  point(x - 0.2 * S, g),
    kneeR:  point(x + 0.1 * S, g - 1 * S),
    footR:  point(x + 0.2 * S, g),
  };
  points = Object.values(P);
  sticks = [
    ['head', 'neck'], ['neck', 'hip'],
    ['neck', 'elbowL'], ['elbowL', 'handL'],
    ['neck', 'elbowR'], ['elbowR', 'handR'],
    ['hip', 'kneeL'], ['kneeL', 'footL'],
    ['hip', 'kneeR'], ['kneeR', 'footR'],
  ].map(([a, b]) => ({
    a: P[a],
    b: P[b],
    len: Math.hypot(P[a].x - P[b].x, P[a].y - P[b].y),
  }));
}

// ===== DRAW =====
function draw() {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
  sky.addColorStop(0, '#141a3a');
  sky.addColorStop(1, '#5b3f86');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND);

  ctx.fillStyle = '#1a1430';
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = '#ff9e6d';
  ctx.fillRect(0, GROUND, W, 3);

  // shadow shrinks as the body leaves the ground
  const air = clamp((GROUND - P.hip.y) / (6 * S), 0, 1);
  ctx.fillStyle = `rgba(0, 0, 0, ${0.4 - air * 0.3})`;
  ctx.beginPath();
  ctx.ellipse(P.hip.x, GROUND + 6, S * (1 - air / 2),
    S * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 0.22 * S;
  limb('#b9aee0', P.footL, P.kneeL, P.hip);    // far side
  limb('#b9aee0', P.handL, P.elbowL, P.neck);
  limb('#fff4e6', P.hip, P.neck);              // body
  limb('#fff4e6', P.footR, P.kneeR, P.hip);    // near side
  limb('#fff4e6', P.handR, P.elbowR, P.neck);

  ctx.fillStyle = '#fff4e6';
  ctx.beginPath();
  ctx.arc(P.head.x, P.head.y, P.head.r, 0, Math.PI * 2);
  ctx.fill();
}

function limb(color, ...pts) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (const p of pts.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

// ===== PHYSICS: Verlet integration =====
function integrate(dt) {
  for (const p of points) {
    const vx = (p.x - p.px) * 0.99;   // velocity = last move
    const vy = (p.y - p.py) * 0.99;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + GRAVITY * dt * dt;
  }
}

function solve() {
  for (let i = 0; i < PASSES; i++) {
    for (const s of sticks) {
      // push or pull both ends back to the stick length
      const dx = s.b.x - s.a.x;
      const dy = s.b.y - s.a.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const k = (d - s.len) / d / 2;
      s.a.x += dx * k;
      s.a.y += dy * k;
      s.b.x -= dx * k;
      s.b.y -= dy * k;
    }
    if (grab) {
      grab.x = mouse.x;
      grab.y = mouse.y;
    }
    collide();
  }
}

function collide() {
  for (const p of points) {
    const floor = GROUND - p.r;
    if (p.y > floor) {
      p.y = floor;
      p.px = p.x - (p.x - p.px) * 0.95;   // friction
    }
    p.x = clamp(p.x, p.r + 4, W - p.r - 4);
  }
}

// ===== BRAIN: balance and walking =====
let state = 'walk';   // 'walk' | 'held' | 'fallen'
let strength = 1;     // 0 = floppy ragdoll, 1 = in control
let fallTimer = 0;
let facing = 1;
let targetX = 0;
const feet = {
  L: { x: 0, t: 1, from: 0, to: 0, lift: 0 },  // t < 1 = mid-step
  R: { x: 0, t: 1, from: 0, to: 0, lift: 0 },
};

function plantFeet() {
  for (const side of ['L', 'R']) {
    feet[side].x = P['foot' + side].x;
    feet[side].t = 1;
  }
}

// steer a point toward a target by changing its speed
// (x or y can be null to leave that axis alone)
function pull(p, x, y, k) {
  if (x !== null) {
    const vx = p.x - p.px;
    p.px = p.x - (vx + ((x - p.x) * 0.5 - vx) * k);
  }
  if (y !== null) {
    const vy = p.y - p.py;
    p.py = p.y - (vy + ((y - p.y) * 0.5 - vy) * k);
  }
}

// where the knee goes for a leg from hip a to foot c
// (bend = 1 or -1 picks which way the knee points)
function joint(a, c, len, bend) {
  const dx = c.x - a.x;
  const dy = c.y - a.y;
  const d = Math.min(Math.hypot(dx, dy), len * 1.98) || 0.001;
  const h = Math.sqrt(Math.max(0, len * len - (d / 2) ** 2));
  return {
    x: (a.x + c.x) / 2 - (dy / d) * h * bend,
    y: (a.y + c.y) / 2 + (dx / d) * h * bend,
  };
}

function think(dt) {
  if (state === 'fallen' && (fallTimer -= dt) <= 0) {
    state = 'walk';
    plantFeet();
  }
  // lose control fast, get it back slowly
  const goal = state === 'walk' ? 1 : 0;
  const rate = goal ? 1.2 : 12;
  strength += (goal - strength) * Math.min(1, rate * dt);
  if (strength < 0.01) return;
  const k = strength * 0.5;

  // walk toward the target
  const dx = targetX - P.hip.x;
  if (Math.abs(dx) > 0.5 * S) facing = Math.sign(dx);
  const speed = clamp(dx * 1.8, -2.4 * S, 2.4 * S);
  const vx = (P.hip.x - P.hip.px) / dt;   // px per second
  P.hip.px -= (speed - vx) * dt * 0.2 * strength;

  stepFeet(dt, vx);

  // the pose it wants to be in; physics does the rest
  const spread = Math.abs(feet.L.x - feet.R.x);
  const hip = { x: P.hip.x, y: GROUND - 1.9 * S + spread * 0.15 };
  const neck = { x: hip.x + facing * 0.15 * S, y: hip.y - 1.5 * S };
  pull(P.hip, null, hip.y, k);
  pull(P.neck, neck.x, neck.y, k);
  pull(P.head, neck.x + facing * 0.1 * S, neck.y - 0.8 * S, k);

  for (const [side, other] of [['L', 'R'], ['R', 'L']]) {
    const f = feet[side];
    const foot = { x: f.x, y: GROUND - f.lift };
    const knee = joint(hip, foot, S, -facing);
    pull(P['foot' + side], foot.x, foot.y, k * 1.4);
    pull(P['knee' + side], knee.x, knee.y, k);

    // arms swing with the opposite leg
    const swing = ((feet[other].x - hip.x) / S) * 0.7;
    const elbow = {
      x: neck.x + Math.sin(swing) * 0.7 * S,
      y: neck.y + Math.cos(swing) * 0.7 * S,
    };
    const bend = swing + facing * 0.6;
    pull(P['elbow' + side], elbow.x, elbow.y, k * 0.5);
    pull(P['hand' + side], elbow.x + Math.sin(bend) * 0.7 * S,
      elbow.y + Math.cos(bend) * 0.7 * S, k * 0.5);
  }
}

function stepFeet(dt, vx) {
  const center = P.hip.x + vx * 0.2;   // where hips are heading
  const reach = 0.5 * S;
  for (const [side, other] of [['L', 'R'], ['R', 'L']]) {
    const f = feet[side];
    if (f.t < 1) {
      // mid-step: the foot travels along an arc
      f.t = Math.min(1, f.t + dt / STEP_TIME);
      f.x = f.from + (f.to - f.from) * ease(f.t);
      f.lift = Math.sin(f.t * Math.PI) * 0.4 * S;
      continue;
    }
    f.lift = 0;
    // step when this foot is left behind
    const far = Math.abs(f.x - center);
    const otherFar = Math.abs(feet[other].x - center);
    if (feet[other].t >= 1 && far > reach && far >= otherFar) {
      f.from = f.x;
      f.to = center + Math.sign(center - f.x) * reach * 0.8;
      f.t = 0;
    }
  }
}

// ===== MOUSE: lead, grab and throw =====
canvas.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  mouse.last = performance.now();
});

canvas.addEventListener('pointerdown', (e) => {
  let best = null;
  let bestD = 0.8 * S;
  for (const p of points) {
    const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (d < bestD) {
      best = p;
      bestD = d;
    }
  }
  if (!best) return;
  grab = best;
  state = 'held';
  mouse.x = e.clientX;
  mouse.y = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

function release() {
  if (!grab) return;
  grab = null;            // it keeps its speed: a throw
  state = 'fallen';
  fallTimer = 1.2;
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);

function chooseTarget(now) {
  if (now - mouse.last < 3000) {
    targetX = mouse.x;                  // follow the pointer
  } else if (Math.abs(targetX - P.hip.x) < S) {
    targetX = S * 1.5 + Math.random() * (W - 3 * S);  // wander
  }
  targetX = clamp(targetX, S, W - S);
}

// ===== LOOP =====
let last = performance.now();
let acc = 0;

function frame(now) {
  acc += Math.min(0.1, (now - last) / 1000);
  last = now;
  chooseTarget(now);
  while (acc >= DT) {
    integrate(DT);
    think(DT);
    solve();
    acc -= DT;
  }
  draw();
  requestAnimationFrame(frame);
}

function start() {
  resize();
  buildRagdoll(W / 2);
  plantFeet();
  targetX = W / 2;
}

addEventListener('resize', start);
start();
requestAnimationFrame(frame);
