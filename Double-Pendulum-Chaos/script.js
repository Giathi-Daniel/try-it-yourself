const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
let W, H;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resize();
addEventListener("resize", resize);

// ---------- the pendulums: two angles and two speeds each ----------
const N = 6, NUDGE = 0.0001;
let pendulums = [];

function reset(start = 2.5) {
  pendulums = [];
  for (let i = 0; i < N; i++) {
    pendulums.push({ a1: start + i * NUDGE, a2: start, w1: 0, w2: 0, trail: [], hue: (i / N) * 300 });
  }
}
reset();

// where the pivot and the two bobs are on screen
function bobs(p) {
  const L = Math.min(W, H) * 0.22, cx = W / 2, cy = H * 0.36;
  const x1 = cx + Math.sin(p.a1) * L, y1 = cy + Math.cos(p.a1) * L;
  return [{ x: cx, y: cy }, { x: x1, y: y1 }, { x: x1 + Math.sin(p.a2) * L, y: y1 + Math.cos(p.a2) * L }];
}

// ---------- the equations of motion ----------
const G = 9.81, L1 = 1, L2 = 1, M1 = 1, M2 = 1;

function accel(p) {
  const { a1, a2, w1, w2 } = p;
  const d = a1 - a2;
  const den = 2 * M1 + M2 - M2 * Math.cos(2 * d);
  const acc1 = (-G * (2 * M1 + M2) * Math.sin(a1) - M2 * G * Math.sin(a1 - 2 * a2)
    - 2 * Math.sin(d) * M2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) / (L1 * den);
  const acc2 = (2 * Math.sin(d) * (w1 * w1 * L1 * (M1 + M2) + G * (M1 + M2) * Math.cos(a1)
    + w2 * w2 * L2 * M2 * Math.cos(d))) / (L2 * den);
  return [acc1, acc2];
}

function step(p, dt) {
  const [acc1, acc2] = accel(p);
  p.w1 += acc1 * dt;
  p.w2 += acc2 * dt;
  p.a1 += p.w1 * dt;
  p.a2 += p.w2 * dt;
}

// ---------- drawing ----------
function draw() {
  ctx.fillStyle = "#0b0d14";
  ctx.fillRect(0, 0, W, H);
  ctx.lineCap = "round";

  for (const p of pendulums) {
    const [o, b1, b2] = bobs(p);
    // the trail fades from old to new
    ctx.lineWidth = 2;
    for (let i = 1; i < p.trail.length; i++) {
      ctx.strokeStyle = `hsla(${p.hue}, 90%, 62%, ${i / p.trail.length})`;
      ctx.beginPath();
      ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
      ctx.lineTo(p.trail[i].x, p.trail[i].y);
      ctx.stroke();
    }
    ctx.strokeStyle = "#ffffff55";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.stroke();
    ctx.fillStyle = `hsl(${p.hue}, 90%, 62%)`;
    dot(b1, 6);
    dot(b2, 9);
  }
}

function dot(p, r) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- a timer, and click to try again ----------
const timer = document.getElementById("time");
let time = 0;

addEventListener("pointerdown", () => {
  reset(2 + Math.random() * 0.9);
  time = 0;
});

// ---------- the loop ----------
let last = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30) || 1 / 60;
  last = now;
  for (const p of pendulums) {
    for (let s = 0; s < 20; s++) step(p, dt / 20);
    p.trail.push(bobs(p)[2]);
    if (p.trail.length > 180) p.trail.shift();
  }
  time += dt;
  timer.textContent = time.toFixed(1) + " s";
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
