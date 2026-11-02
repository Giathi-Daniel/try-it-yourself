// ===== SETUP =====
const params = new URLSearchParams(location.search);
const SHORT = params.has('short');          // quick version
if (params.has('video')) document.body.classList.add('video');

const stage = document.getElementById('stage');
const wires = document.getElementById('wires');
const timing = document.getElementById('timing');
const caption = document.getElementById('caption');
const chip = document.getElementById('chip');
const inspector = document.getElementById('inspector');
const inspectorTitle = document.getElementById('inspector-title');

const ICONS = {
  laptop: '<rect x="6" y="8" width="28" height="18" rx="2"/><path d="M2 31h36"/>',
  globe: '<circle cx="20" cy="20" r="14"/><path d="M6 20h28M20 6c-6 8-6 20 0 28M20 6c6 8 6 20 0 28"/>',
  split: '<path d="M4 20h12M16 20l10-10h8M16 20l10 10h8M30 6l4 4-4 4M30 26l4 4-4 4"/>',
  server: '<rect x="7" y="6" width="26" height="10" rx="2"/><rect x="7" y="22" width="26" height="10" rx="2"/><path d="M12 11h2M12 27h2"/>',
  bolt: '<path d="M22 4L9 22h10l-2 14 14-20H21z"/>',
  db: '<ellipse cx="20" cy="9" rx="13" ry="5"/><path d="M7 9v22c0 3 6 5 13 5s13-2 13-5V9M7 20c0 3 6 5 13 5s13-2 13-5"/>',
};

// step lengths and start times for this mode
const lengths = STEPS.map((s) => (SHORT ? s.short : s.dur));
const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
const TOTAL = lengths.reduce((a, b) => a + b, 0);

// in quick mode every time inside a step is squeezed to fit
const scale = (i) => (SHORT ? STEPS[i].short / STEPS[i].dur : 1);

// ===== BUILD THE STAGE =====
const nodeEls = {};
for (const [id, n] of Object.entries(NODES)) {
  const el = document.createElement('div');
  el.className = 'node';
  el.innerHTML = `<svg viewBox="0 0 40 40">${ICONS[n.icon]}</svg>
    <b>${n.label}</b><small>${n.sub}</small>`;
  stage.appendChild(el);
  nodeEls[id] = el;
}

const lock = document.createElement('div');
lock.className = 'lock';
lock.textContent = '🔒';
stage.appendChild(lock);

const profile = document.createElement('div');
profile.className = 'profile';
profile.innerHTML = '<i>A</i><div><b>Amina</b><br><em>PRO</em></div>';
stage.appendChild(profile);

const wireEls = WIRES.map(() => {
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  wires.appendChild(l);
  return l;
});

const dots = STEPS.map((s, i) => {
  const b = document.createElement('button');
  b.title = s.title;
  b.onclick = () => seek(starts[i]);
  document.getElementById('dots').appendChild(b);
  return b;
});

const packetEls = [];

// where every node sits right now (px inside the stage)
function centres() {
  const tall = innerHeight > innerWidth * 1.25;
  const L = tall ? LAYOUT.tall : LAYOUT.wide;
  const w = stage.clientWidth;
  const h = stage.clientHeight - 50;   // keep clear of the timing bar
  const out = {};
  for (const id in L) out[id] = { x: (L[id][0] / 100) * w, y: (L[id][1] / 100) * h + 6 };
  return out;
}

// [k:GET] → <span class="k">GET</span>
const markup = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/\[(k|s|n|h|c|ok|warn|err):([^\]]*)\]/g, '<span class="$1">$2</span>');

const ease = (t) => t * t * (3 - 2 * t);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ===== RENDER ANY MOMENT =====
// Everything is worked out from the time alone, so seeking just works.
let lastInspect = '';
let lastCap = '';

function render(time) {
  const P = centres();
  const step = Math.max(0, starts.findLastIndex((s) => s <= time));
  const local = (time - starts[step]) / scale(step);   // time inside the step, unscaled

  // nodes and wires
  for (const id in nodeEls) {
    nodeEls[id].style.left = P[id].x + 'px';
    nodeEls[id].style.top = P[id].y + 'px';
  }
  const secure = step > 3 || (step === 3 && local >= 8);
  const lockFade = step > 3 ? 1 : step === 3 ? clamp01((local - 8) / 0.4) : 0;
  WIRES.forEach(([a, b], i) => {
    const l = wireEls[i];
    l.setAttribute('x1', P[a].x); l.setAttribute('y1', P[a].y);
    l.setAttribute('x2', P[b].x); l.setAttribute('y2', P[b].y);
    l.classList.toggle('secure', secure && a === 'client' && b === 'lb');
  });
  lock.style.left = (P.client.x + P.lb.x) / 2 + 'px';
  lock.style.top = (P.client.y + P.lb.y) / 2 - 18 + 'px';
  lock.style.opacity = lockFade;

  // the actions of the current step
  const acts = STEPS[step].actions;
  const lit = new Set();
  let cap = '', inspect = null;
  const showProfile = step > 8 ? 1 : step === 8 ? clamp01((local - 0.8) / 0.4) : 0;
  const live = [];
  for (const a of acts) {
    if (a.at > local) continue;
    if (a.cap !== undefined && (!SHORT || a.s)) cap = SHORT ? a.s : a.cap;
    if (a.focus) lit.add(a.focus);
    if (a.inspect) inspect = a;
    if (a.packet && local < a.at + a.dur) {
      live.push({ ...a, u: (local - a.at) / a.dur });
      lit.add(a.packet[0]); lit.add(a.packet[1]);
    }
  }
  for (const id in nodeEls) nodeEls[id].classList.toggle('on', lit.has(id));

  // packets
  while (packetEls.length < live.length) {
    const el = document.createElement('div');
    stage.appendChild(el);
    packetEls.push(el);
  }
  packetEls.forEach((el, i) => {
    const p = live[i];
    el.style.display = p ? '' : 'none';
    if (!p) return;
    const A = P[p.packet[0]], B = P[p.packet[1]];
    const e = ease(Math.min(1, p.u));
    el.className = 'packet ' + p.kind;
    el.textContent = p.label;
    el.style.left = A.x + (B.x - A.x) * e + 'px';
    el.style.top = A.y + (B.y - A.y) * e - Math.sin(Math.PI * e) * 30 + 'px';
  });

  // the profile card
  const tall = innerHeight > innerWidth * 1.25;
  profile.style.left = (tall ? (P.client.x + P.dns.x) / 2 : P.client.x) + 'px';
  profile.style.top = (tall ? P.client.y - 24 : P.client.y + 62) + 'px';
  profile.style.opacity = showProfile;

  // caption (fades when it changes)
  if (cap !== lastCap) {
    caption.textContent = cap;
    lastCap = cap;
  }

  // inspector: only lines whose time has come
  let html = '', title = '';
  if (inspect) {
    title = inspect.inspect;
    for (const [dt, line] of inspect.lines) {
      if (dt > local) continue;
      const fade = Math.min(1, (local - dt) / 0.35);   // each line fades in
      html += `<div style="opacity:${fade.toFixed(2)};translate:${((1 - fade) * -8).toFixed(1)}px 0">`
        + `${markup(line) || '&nbsp;'}</div>`;
    }
  }
  if (html !== lastInspect) {
    inspector.innerHTML = html;
    inspectorTitle.textContent = title;
    lastInspect = html;
  }

  // header chip + dots
  chip.textContent = `${step + 1} / ${STEPS.length} · ${STEPS[step].title}`;
  dots.forEach((d, i) => d.classList.toggle('on', i === step));

  // timing bar: every ms entry that has happened so far
  const seg = [];
  STEPS.forEach((s, i) => s.actions.forEach((a) => {
    if (a.ms && (i < step || (i === step && a.at <= local))) seg.push(a.ms);
  }));
  const total = seg.reduce((sum, m) => sum + m[1], 0);
  const key = seg.map((m) => m[0]).join();
  if (timing.dataset.key !== key) {
    timing.dataset.key = key;
    timing.innerHTML = seg.map(([name, ms, kind]) =>
      `<span style="flex:${ms} 0 0; background:var(--${kind})">${name} ${ms}ms</span>`).join('')
      + `<span class="total">${total} ms</span>`;
  }
}

// ===== PLAYBACK =====
let time = 0;
let playing = true;
let last = performance.now();

function seek(t) {
  time = Math.max(0, Math.min(TOTAL - 0.001, t));
  render(time);
}

function frame(now) {
  if (playing) time = Math.min(TOTAL - 0.001, time + (now - last) / 1000);
  last = now;
  render(time);
  requestAnimationFrame(frame);
}

const playBtn = document.getElementById('play');
function toggle() {
  playing = !playing;
  playBtn.textContent = playing ? '❚❚' : '▶';
  if (playing && time >= TOTAL - 0.01) time = 0;
}
playBtn.onclick = toggle;
document.getElementById('prev').onclick = () => {
  const i = starts.findLastIndex((s) => s <= time - 0.5);
  seek(starts[Math.max(0, i)]);
};
document.getElementById('next').onclick = () => {
  const i = starts.findIndex((s) => s > time);
  if (i >= 0) seek(starts[i]);
};
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); toggle(); }
  if (e.code === 'ArrowRight') document.getElementById('next').click();
  if (e.code === 'ArrowLeft') document.getElementById('prev').click();
});

requestAnimationFrame(frame);
