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

const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener("pointermove", (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

// ---------- the body chases the cursor ----------
const body = { x: innerWidth / 2, y: innerHeight / 2, angle: -Math.PI / 2, vx: 0, vy: 0 };

function moveBody(k) {
  const dx = mouse.x - body.x, dy = mouse.y - body.y;
  const dist = Math.hypot(dx, dy);
  const speed = dist > 2 ? Math.min(dist * 0.06, 7) : 0;
  body.vx = (dx / (dist || 1)) * speed;
  body.vy = (dy / (dist || 1)) * speed;
  body.x += body.vx * k;
  body.y += body.vy * k;
  if (dist > 8) {
    let turn = Math.atan2(dy, dx) - body.angle;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn));
    body.angle += turn * 0.08 * k;
  }
}

// a point measured from the body: forward, and out to the side
function local(forward, side) {
  const c = Math.cos(body.angle), s = Math.sin(body.angle);
  return { x: body.x + c * forward - s * side, y: body.y + s * forward + c * side };
}

// ---------- eight legs ----------
const UPPER = 52, LOWER = 62;
const REST = [[72, 62], [30, 92], [-16, 94], [-62, 70]];
const legs = [];

for (const side of [-1, 1]) {
  REST.forEach(([f, s], i) => {
    legs.push({
      side,
      hip: [10 - i * 5, side * 7],
      rest: [f, s * side],
      bend: [1.5 - i, side],
      foot: local(f, s * side),
      group: (i + (side > 0 ? 1 : 0)) % 2,
      t: 1,
    });
  });
}

// two-bone IK: given hip and foot, where is the knee?
function knee(hip, foot, bend) {
  const dx = foot.x - hip.x, dy = foot.y - hip.y;
  const d = Math.min(Math.hypot(dx, dy), UPPER + LOWER - 0.1);
  const cos = (UPPER * UPPER + d * d - LOWER * LOWER) / (2 * UPPER * d);
  const a = Math.atan2(dy, dx), b = Math.acos(Math.max(-1, Math.min(1, cos)));
  const k1 = { x: hip.x + Math.cos(a + b) * UPPER, y: hip.y + Math.sin(a + b) * UPPER };
  const k2 = { x: hip.x + Math.cos(a - b) * UPPER, y: hip.y + Math.sin(a - b) * UPPER };
  // two answers: keep the one that bends the way this leg should
  const c = Math.cos(body.angle), s = Math.sin(body.angle);
  const bx = c * bend[0] - s * bend[1], by = s * bend[0] + c * bend[1];
  const score = (p) => (p.x - hip.x) * bx + (p.y - hip.y) * by;
  return score(k1) > score(k2) ? k1 : k2;
}

// ---------- feet stay planted until they fall too far behind ----------
function updateLegs(k) {
  for (const leg of legs) {
    if (leg.t < 1) {
      leg.t = Math.min(1, leg.t + 0.16 * k);
      const e = leg.t * leg.t * (3 - 2 * leg.t);
      leg.foot = {
        x: leg.from.x + (leg.to.x - leg.from.x) * e,
        y: leg.from.y + (leg.to.y - leg.from.y) * e,
      };
      continue;
    }
    const home = local(...leg.rest);
    const gap = Math.hypot(home.x - leg.foot.x, home.y - leg.foot.y);
    const busy = legs.some((o) => o.t < 1 && o.group !== leg.group);
    if ((gap > 40 && !busy) || gap > 85) {
      leg.from = leg.foot;
      leg.to = { x: home.x + body.vx * 8, y: home.y + body.vy * 8 };
      leg.t = 0;
    }
  }
}

function segment(a, b) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function oval(x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

// a faint web behind everything
function web() {
  const cx = W * 0.5, cy = H * 0.4, R = Math.hypot(W, H);
  ctx.strokeStyle = "#00000018";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    segment({ x: cx, y: cy }, { x: cx + Math.cos(a) * R, y: cy + Math.sin(a) * R });
  }
  for (let r = 30; r < R; r += 34) {
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    ctx.stroke();
  }
}

// ---------- drawing ----------
function draw() {
  ctx.fillStyle = "#ece7dd";
  ctx.fillRect(0, 0, W, H);
  web();

  ctx.strokeStyle = "#16141a";
  ctx.lineCap = "round";
  for (const leg of legs) {
    const hip = local(...leg.hip);
    const k = knee(hip, leg.foot, leg.bend);
    ctx.lineWidth = 6;
    segment(hip, k);
    ctx.lineWidth = 3.5;
    segment(k, leg.foot);
  }

  // abdomen, thorax, head, the red hourglass and two eyes
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate(body.angle);
  ctx.fillStyle = "#16141a";
  oval(-36, 0, 30, 24);
  oval(2, 0, 17, 14);
  oval(20, 0, 9, 8);
  ctx.fillStyle = "#d9352b";
  ctx.beginPath();
  ctx.moveTo(-48, -7);
  ctx.lineTo(-36, 0);
  ctx.lineTo(-48, 7);
  ctx.moveTo(-24, -7);
  ctx.lineTo(-36, 0);
  ctx.lineTo(-24, 7);
  ctx.fill();
  ctx.fillStyle = "#fff";
  oval(25, -3.5, 2, 2);
  oval(25, 3.5, 2, 2);
  ctx.restore();
}

// ---------- the loop ----------
let last = 0;
function loop(now) {
  const k = Math.min((now - last) / 16.7, 3) || 1;
  last = now;
  moveBody(k);
  updateLegs(k);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
