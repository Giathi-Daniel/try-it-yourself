// ===== SETUP =====
const params = new URLSearchParams(location.search);
const SHORT = params.has('short');            // the quick version
if (params.has('video')) document.body.classList.add('video');

const stage = document.getElementById('stage');
const caption = document.getElementById('caption');
const chip = document.getElementById('chip');
const inspector = document.getElementById('inspector');
const inspectorTitle = document.getElementById('inspector-title');
const page = document.getElementById('page');
const likes = document.getElementById('likes');
const pointer = document.getElementById('pointer');
const layerTag = document.getElementById('layer-tag');
const pipe = document.getElementById('pipe');

const SCENES = {
  files: document.getElementById('sc-files'),
  layers: document.getElementById('sc-layers'),
  dom: document.getElementById('sc-dom'),
  pipeline: document.getElementById('sc-pipeline'),
  stack: document.getElementById('sc-stack'),
};

// step lengths and start times for this mode
const lengths = STEPS.map((s) => (SHORT ? s.short : s.dur));
const starts = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0));
const TOTAL = lengths.reduce((a, b) => a + b, 0);

// in quick mode every time inside a step is squeezed to fit
const scale = (i) => (SHORT ? STEPS[i].short / STEPS[i].dur : 1);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (t) => t * t * (3 - 2 * t);
const tall = () => innerHeight > innerWidth * 1.25;

// ===== THINGS WE BUILD ONCE =====
const dots = STEPS.map((s, i) => {
  const b = document.createElement('button');
  b.title = s.title;
  b.onclick = () => seek(starts[i]);
  document.getElementById('dots').appendChild(b);
  return b;
});

// lay the DOM tree out: x by leaf order, y by depth
function layoutTree(root) {
  const flat = [];
  let leaf = 0;
  (function walk(node, depth, parent) {
    const me = { name: node.name, depth, parent, kids: [] };
    flat.push(me);
    if (!node.children) {
      me.x = leaf++;
    } else {
      for (const c of node.children) me.kids.push(walk(c, depth + 1, me));
      me.x = (me.kids[0].x + me.kids[me.kids.length - 1].x) / 2;
    }
    return me;
  })(root, 0, null);
  return flat;
}

const TREE = layoutTree(DOM_TREE);
const TREE_W = Math.max(...TREE.map((n) => n.x));
const TREE_D = Math.max(...TREE.map((n) => n.depth));

const treeEls = TREE.map((n) => {
  const el = document.createElement('div');
  el.className = 'tnode';
  el.textContent = n.name;
  SCENES.dom.appendChild(el);
  return el;
});
const treeWires = document.getElementById('tree-wires');
const treeLines = TREE.filter((n) => n.parent).map(() => {
  const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  treeWires.appendChild(l);
  return l;
});

const fileEls = [...document.querySelectorAll('#sc-files .file')];
const pipeSteps = [...pipe.children];

// one pool of travelling messages per scene
function makePool(sceneEl) {
  return { el: sceneEl, items: [] };
}
const pools = { files: makePool(SCENES.files), stack: makePool(SCENES.stack) };

function drawPackets(pool, pos, live) {
  while (pool.items.length < live.length) {
    const el = document.createElement('div');
    pool.el.appendChild(el);
    pool.items.push(el);
  }
  pool.items.forEach((el, i) => {
    const p = live[i];
    el.style.display = p ? '' : 'none';
    if (!p) return;
    const A = pos[p.packet[0]];
    const B = pos[p.packet[1]];
    const e = ease(clamp01(p.u));
    el.className = 'packet ' + p.kind;
    el.textContent = p.label;
    el.style.left = A.x + (B.x - A.x) * e + 'px';
    el.style.top = A.y + (B.y - A.y) * e - Math.sin(Math.PI * e) * 26 + 'px';
  });
}

// percentages in LAYOUT -> pixels inside the stage
function placeBoxes(which, ids) {
  const L = LAYOUT[which][tall() ? 'tall' : 'wide'];
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const out = {};
  for (const id in L) out[id] = { x: (L[id][0] / 100) * w, y: (L[id][1] / 100) * h };
  for (const id in ids) {
    ids[id].style.left = out[id].x + 'px';
    ids[id].style.top = out[id].y + 'px';
  }
  return out;
}

function wire(svg, i, A, B, cls) {
  let l = svg.children[i];
  if (!l) {
    l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    svg.appendChild(l);
  }
  l.setAttribute('x1', A.x); l.setAttribute('y1', A.y);
  l.setAttribute('x2', B.x); l.setAttribute('y2', B.y);
  l.setAttribute('class', cls || '');
}

// [t:<nav>] -> <span class="t">&lt;nav&gt;</span>
const markup = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/\[(t|a|v|p|c|k):([^\]]*)\]/g, '<span class="$1">$2</span>');

const capMarkup = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*([^*]+)\*/g, '<em>$1</em>');

// ===== DRAW ANY MOMENT =====
// Everything comes from the time alone, so seeking and video capture just work.
let lastInspect = '';
let lastCap = '';

function render(time) {
  const step = Math.max(0, starts.findLastIndex((s) => s <= time));
  const local = (time - starts[step]) / scale(step);
  const S = STEPS[step];

  for (const name in SCENES) SCENES[name].classList.toggle('on', name === S.scene);

  // what the actions so far add up to
  let cap = '';
  let inspect = null;
  let level = S.level || 0;
  let nodes = 0;
  let pstep = -1;
  let fileCount = -1;
  let clickAt = null;
  const braces = new Set();
  const lit = new Set();
  const live = [];
  for (const a of S.actions) {
    if (a.at > local) continue;
    if (a.cap !== undefined && (!SHORT || a.s)) cap = SHORT ? a.s : a.cap;
    if (a.level) level = a.level;
    if (a.nodes) nodes = Math.max(nodes, a.nodes);
    if (a.pstep !== undefined) pstep = a.pstep;
    if (a.file !== undefined) fileCount = Math.max(fileCount, a.file);
    if (a.brace) braces.add(a.brace);
    if (a.lit) lit.add(a.lit);
    if (a.inspect) inspect = a;
    if (a.click) clickAt = a.at;
    if (a.packet && local < a.at + a.dur) {
      live.push({ ...a, u: (local - a.at) / a.dur });
      lit.add(a.packet[0]); lit.add(a.packet[1]);
    }
  }

  if (S.scene === 'files') drawFiles(lit, fileCount, live);
  if (S.scene === 'layers') drawLayers(level, clickAt, local);
  if (S.scene === 'dom') drawTree(nodes);
  if (S.scene === 'pipeline') drawPipe(pstep);
  if (S.scene === 'stack') drawStack(lit, braces, live);

  if (cap !== lastCap) {
    caption.innerHTML = capMarkup(cap);
    lastCap = cap;
  }

  let html = '';
  let title = '';
  if (inspect) {
    title = inspect.inspect;
    for (const [dt, line] of inspect.lines) {
      if (dt > local) continue;
      const fade = clamp01((local - dt) / 0.35);     // each line fades in
      html += `<div style="opacity:${fade.toFixed(2)};translate:${((1 - fade) * -8).toFixed(1)}px 0">`
        + `${markup(line) || '&nbsp;'}</div>`;
    }
  }
  if (html !== lastInspect) {
    inspector.innerHTML = html;
    inspectorTitle.textContent = title;
    lastInspect = html;
  }

  chip.textContent = `${step + 1} / ${STEPS.length} · ${S.title}`;
  dots.forEach((d, i) => d.classList.toggle('on', i === step));
}

// --- scene 1 and 2: files on a server
function drawFiles(lit, fileCount, live) {
  const client = document.getElementById('fb-client');
  const server = document.getElementById('fb-server');
  const pos = placeBoxes('files', { client, server });
  client.classList.toggle('on', lit.has('client'));
  server.classList.toggle('on', lit.has('server'));
  wire(document.getElementById('files-wires'), 0, pos.client, pos.server);
  fileEls.forEach((el, i) => { el.style.opacity = i <= fileCount ? 1 : 0; });
  drawPackets(pools.files, pos, live);
}

// --- scene 3: the page gains CSS, then JavaScript
function drawLayers(level, clickAt, local) {
  page.classList.toggle('styled', level >= 2);
  const clicked = clickAt !== null && local >= clickAt + 0.55;
  page.classList.toggle('live', level >= 3 && clicked);
  likes.textContent = clicked ? '129' : '128';

  const tags = { 1: ['HTML only', 'var(--html)'], 2: ['HTML + CSS', 'var(--css)'],
                 3: ['HTML + CSS + JS', 'var(--js)'] };
  const t = tags[level];
  layerTag.textContent = t ? t[0] : '';
  layerTag.style.background = t ? t[1] : 'transparent';

  // the fake cursor reaching over to press the like button
  if (clickAt === null || local < clickAt) {
    pointer.style.opacity = 0;
    return;
  }
  const btn = document.getElementById('like').getBoundingClientRect();
  const box = stage.getBoundingClientRect();
  const to = { x: btn.left - box.left + btn.width / 2, y: btn.top - box.top + btn.height / 2 };
  const from = { x: to.x + 150, y: to.y + 120 };
  const u = clamp01((local - clickAt) / 0.55);
  const e = ease(u);
  pointer.style.left = from.x + (to.x - from.x) * e + 'px';
  pointer.style.top = from.y + (to.y - from.y) * e + 'px';
  const press = local >= clickAt + 0.55 && local < clickAt + 0.75;
  pointer.style.scale = press ? 0.7 : 1;
  pointer.style.opacity = local > clickAt + 2 ? clamp01(1 - (local - clickAt - 2)) : 1;
}

// --- scene 4: the DOM tree
function drawTree(n) {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  const pos = TREE.map((node) => (tall()
    ? { x: 70 + (node.depth / TREE_D) * (w - 150), y: 40 + (node.x / TREE_W) * (h - 90) }
    : { x: 60 + (node.x / TREE_W) * (w - 120), y: 50 + (node.depth / TREE_D) * (h - 110) }));
  treeEls.forEach((el, i) => {
    el.style.left = pos[i].x + 'px';
    el.style.top = pos[i].y + 'px';
    el.style.opacity = i < n ? 1 : 0;
    el.classList.toggle('lit', i < n);
  });
  let k = 0;
  TREE.forEach((node, i) => {
    if (!node.parent) return;
    const j = TREE.indexOf(node.parent);
    const l = treeLines[k++];
    l.setAttribute('x1', pos[j].x); l.setAttribute('y1', pos[j].y);
    l.setAttribute('x2', pos[i].x); l.setAttribute('y2', pos[i].y);
    l.style.opacity = i < n ? 1 : 0;
  });
}

// --- scene 5: files to pixels
function drawPipe(active) {
  pipeSteps.forEach((el, i) => {
    el.classList.toggle('on', i === active);
    el.classList.toggle('done', active >= 0 && i < active);
  });
}

// --- scene 6: front-end and back-end
function drawStack(lit, braces, live) {
  const client = document.getElementById('sb-client');
  const server = document.getElementById('sb-server');
  const db = document.getElementById('sb-db');
  const pos = placeBoxes('stack', { client, server, db });
  client.classList.toggle('on', lit.has('client'));
  server.classList.toggle('on', lit.has('server'));
  db.classList.toggle('on', lit.has('db'));
  const svg = document.getElementById('stack-wires');
  wire(svg, 0, pos.client, pos.server);
  wire(svg, 1, pos.server, pos.db);

  const front = document.getElementById('brace-front');
  const back = document.getElementById('brace-back');
  const y = tall() ? 0 : stage.clientHeight - 48;
  front.style.opacity = braces.has('front') ? 1 : 0;
  back.style.opacity = braces.has('back') ? 1 : 0;
  if (tall()) {
    front.style.left = pos.client.x + 'px';
    front.style.top = pos.client.y - 72 + 'px';
    back.style.left = pos.server.x + 'px';
    back.style.top = (pos.server.y + pos.db.y) / 2 - 16 + 'px';
  } else {
    front.style.left = pos.client.x + 'px';
    front.style.top = y + 'px';
    back.style.left = (pos.server.x + pos.db.x) / 2 + 'px';
    back.style.top = y + 'px';
  }
  drawPackets(pools.stack, pos, live);
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
