const DPR = Math.min(window.devicePixelRatio || 1, 2);

// SIMPLE DETERMINISTIC NOISE
function h(n, s = 0) {
  return ((Math.sin(n * 127.1 + s * 311.7) * 43758.5453) % 1 + 1) % 1;
}

function snoise(x, s = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);

  return h(i, s) * (1 - u) + h(i + 1, s) * u;
}

function fbm(x, o = 4, s = 0) {
  let v = 0;
  let a = 0.5;
  let f = 1;

  for (let i = 0; i < o; i++) {
    v += snoise(x * f, s + i) * a;
    a *= 0.5;
    f *= 2.1;
  }

  return v;
}

// STAR CACHE
let stars = null;

function getStars() {
  return stars || (
    stars = Array.from({ length: 140 }, (_, i) => ({
      x: h(i * 3, 1),
      y: h(i * 3 + 1, 2) * 0.42,
      r: h(i * 3 + 2, 3) * 1.2 + 0.2,
      a: h(i * 3 + 3, 4) * 0.65 + 0.15
    }))
  );
}

// DRAW FUNCTIONS 
function drawSky(ctx, W, H) {

  const g = ctx.createLinearGradient(0, 0, 0, H);

  g.addColorStop(0, '#180928');
  g.addColorStop(0.28, '#2b175a');
  g.addColorStop(0.52, '#8a3568');
  g.addColorStop(0.70, '#e86840');
  g.addColorStop(1, '#ffd070');

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const sx = W * 0.62;
  const sy = H * 0.66;

  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.5);

  sg.addColorStop(0, 'rgba(255,220,90,0.20)');
  sg.addColorStop(0.35, 'rgba(255,110,50,0.09)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, H);

  const dr = H * 0.052;

  const dg = ctx.createRadialGradient(sx, sy, 0, sx, sy, dr);

  dg.addColorStop(0, 'rgba(255,245,190,0.92)');
  dg.addColorStop(0.55, 'rgba(255,170,70,0.65)');
  dg.addColorStop(1, 'rgba(255,100,30,0)');

  ctx.beginPath();
  ctx.arc(sx, sy, dr, 0, Math.PI * 2);
  ctx.fillStyle = dg;
  ctx.fill();

  getStars().forEach(s => {
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,250,230,${s.a})`;
    ctx.fill();
  });
}

function drawMountains(ctx, W, H) {

  [
    [0.50, 0.20, 11, 7, '#1c2a4e', '#0e1828'],
    [0.56, 0.16, 9, 44, '#212f56', '#101c30']
  ].forEach(([by, amp, freq, seed, c0, c1]) => {

    ctx.beginPath();
    ctx.moveTo(-10, H + 10);

    for (let x = 0; x <= W + 10; x += 2) {
      const y = H * by - fbm(x / W * freq, 5, seed) * H * amp;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();

    const g = ctx.createLinearGradient(0, H * (by - amp), 0, H);

    g.addColorStop(0, c0);
    g.addColorStop(1, c1);

    ctx.fillStyle = g;
    ctx.fill();
  });
}

function drawHills(ctx, W, H) {

  [
    [0.60, 0.12, 6, 200, '#183040', '#0b1e2a'],
    [0.66, 0.08, 5, 250, '#122535', '#081620']
  ].forEach(([by, amp, freq, seed, c0, c1]) => {

    ctx.beginPath();
    ctx.moveTo(-10, H + 10);

    for (let x = 0; x <= W + 10; x += 2) {
      const y = H * by - fbm(x / W * freq, 4, seed) * H * amp;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();

    const g = ctx.createLinearGradient(0, H * (by - amp), 0, H);

    g.addColorStop(0, c0);
    g.addColorStop(1, c1);

    ctx.fillStyle = g;
    ctx.fill();
  });
}

function drawFog(ctx, W, H) {

  const yc = H * 0.64;

  const g = ctx.createLinearGradient(
    0,
    yc - H * 0.09,
    0,
    yc + H * 0.09
  );

  g.addColorStop(0, 'rgba(200,160,120,0)');
  g.addColorStop(0.4, 'rgba(210,170,130,0.20)');
  g.addColorStop(0.5, 'rgba(220,180,140,0.28)');
  g.addColorStop(0.6, 'rgba(200,165,125,0.17)');
  g.addColorStop(1, 'rgba(180,145,110,0)');

  ctx.fillStyle = g;
  ctx.fillRect(0, yc - H * 0.1, W, H * 0.22);
}

function pine(ctx, x, y, h, w) {

  for (let l = 0; l < 3; l++) {

    const ly = y - h * 0.32 * l;
    const lw = w * (1 - l * 0.17);
    const lh = h * (0.52 - l * 0.04);

    ctx.beginPath();
    ctx.moveTo(x, ly - lh);
    ctx.lineTo(x - lw / 2, ly);
    ctx.lineTo(x + lw / 2, ly);
    ctx.closePath();

    ctx.fillStyle = ['#0a1910','#0d2018','#112518'][l];
    ctx.fill();
  }

  ctx.fillStyle = '#180f06';
  ctx.fillRect(x - w * 0.07, y, w * 0.14, h * 0.24);
}

function drawTrees(ctx, W, H) {

  const g = ctx.createLinearGradient(0, H * 0.70, 0, H);

  g.addColorStop(0, '#0a1e12');
  g.addColorStop(1, '#040b08');

  ctx.fillStyle = g;
  ctx.fillRect(0, H * 0.70, W, H);

  const sr = (n) =>
    ((Math.sin(n * 97.3 + 8.1) * 12345.678) % 1 + 1) % 1;

  const scale = W / 1440;

  const n1 = Math.ceil(W / 40);

  for (let i = 0; i < n1; i++) {

    const x = i / n1 * W + sr(i) * 24 - 12;

    const hh = (55 + sr(i + n1) * 55) * scale;

    pine(
      ctx,
      x,
      H * (0.76 + sr(i + n1 * 2) * 0.025),
      hh,
      hh * (0.5 + sr(i + n1 * 3) * 0.2)
    );
  }
}

function drawFore(ctx, W, H) {

  ctx.beginPath();
  ctx.moveTo(-10, H + 10);

  for (let x = 0; x <= W + 10; x += 3) {
    const y = H * 0.87 - fbm(x / W * 2.5, 3, 500) * H * 0.055;
    ctx.lineTo(x, y);
  }

  ctx.lineTo(W + 10, H + 10);
  ctx.closePath();

  ctx.fillStyle = '#020705';
  ctx.fill();
}

// PAINT ALL LAYERS
const DRAWS = [
  drawSky,
  drawMountains,
  drawHills,
  drawFog,
  drawTrees,
  drawFore
];

function paintAll() {

  DRAWS.forEach((fn, i) => {

    const c = document.getElementById('c' + i);

    const p = c.parentElement;

    const W = p.offsetWidth;
    const H = p.offsetHeight;

    c.width = Math.round(W * DPR);
    c.height = Math.round(H * DPR);

    c.style.width = W + 'px';
    c.style.height = H + 'px';

    const ctx = c.getContext('2d');

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    fn(ctx, W, H);
  });
}

paintAll();

// PARALLAX ENGINE 
const allLayers = [...document.querySelectorAll('.pl')];

const MAX_X = 90;
const MAX_Y = 55;
const LERP = 0.055;

let tx = 0;
let ty = 0;
let cx = 0;
let cy = 0;

document.addEventListener('mousemove', e => {

  tx = (e.clientX / window.innerWidth - 0.5) * 2;
  ty = (e.clientY / window.innerHeight - 0.5) * 2;

  const cur = document.getElementById('cur');
  const ring = document.getElementById('cur-r');

  cur.style.left = e.clientX + 'px';
  cur.style.top = e.clientY + 'px';

  ring.style.left = e.clientX + 'px';
  ring.style.top = e.clientY + 'px';

}, { passive:true });

window.addEventListener('deviceorientation', e => {

  if (e.gamma != null) {

    tx = Math.max(-1, Math.min(1, e.gamma / 28));

    ty = Math.max(
      -1,
      Math.min(1, (e.beta - 15) / 28)
    );
  }

}, { passive:true });

function lerp(a, b, t) {
  return a + (b - a) * t;
}

(function frame() {

  cx = lerp(cx, tx, LERP);
  cy = lerp(cy, ty, LERP);

  allLayers.forEach(l => {

    const d = parseFloat(l.dataset.d);

    const lx = -cx * MAX_X * d * 100;
    const ly = -cy * MAX_Y * d * 100;

    l.style.transform = `translate3d(${lx}px, ${ly}px, 0)`;
  });

  requestAnimationFrame(frame);

})();

// Resize
let rt;

window.addEventListener('resize', () => {

  clearTimeout(rt);

  rt = setTimeout(() => {

    stars = null;
    paintAll();

  }, 100);

});
