(() => {
  'use strict';

  // ===== CONFIG =====
  const SNAP_RADIUS = 60;              // px from slot center to count as a drop
  const LOCK_ORIGINAL_BRICKS = false;  // true = starting bricks can't be moved
  const wallLayout = [                 // 1 = brick, 0 = gap
    [1, 0, 1, 1, 0],
    [1, 1, 0, 1, 1],
    [0, 1, 1, 0, 1],
    [1, 0, 1, 1, 0]
  ];

  const wall = document.getElementById('wall');
  const tray = document.getElementById('tray');
  const slots = [];

  // ===== BUILD =====
  function createPiece(kind) {
    const el = document.createElement('div');
    el.className = `piece ${kind}`;
    return el;
  }

  wallLayout.flat().forEach((cell) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    if (cell === 1) {
      const brick = createPiece('brick');
      if (LOCK_ORIGINAL_BRICKS) brick.dataset.locked = 'true';
      slot.appendChild(brick);
    }
    wall.appendChild(slot);
    slots.push(slot);
  });

  const emptySlots = slots.filter((s) => !occupantOf(s)).length;
  for (let i = 0; i < emptySlots; i++) tray.appendChild(createPiece('stone'));

  // ===== HELPERS =====
  function occupantOf(slot) {
    return slot.querySelector(':scope > .piece');
  }

  function center(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  // Restartable one-shot animation; cleans itself up (no stale timers)
  function playOnce(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth; // force reflow so the animation restarts
    el.classList.add(cls);
    el.addEventListener('animationend', () => el.classList.remove(cls), { once: true });
  }

  // ===== DRAG STATE =====
  let drag = null;

  function onPointerDown(e) {
    if (drag) return;                                    // one drag at a time (multi-touch safe)
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const piece = e.target.closest('.piece');
    if (!piece || piece.dataset.locked === 'true') return;

    e.preventDefault();
    const rect = piece.getBoundingClientRect();
    const origin = piece.parentElement;

    // Leave a ghost so the tray/wall layout doesn't jump
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    origin.replaceChild(placeholder, piece);

    piece.classList.remove('shake', 'snap');
    document.body.appendChild(piece);
    piece.classList.add('dragging');

    drag = {
      piece, origin, placeholder,
      pointerId: e.pointerId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      x: e.clientX,
      y: e.clientY,
      target: null,
      raf: 0
    };
    render();
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (!drag.raf) drag.raf = requestAnimationFrame(render); // throttle to 1 update/frame
  }

  function render() {
    if (!drag) return;
    drag.raf = 0;
    const { piece, x, y, offsetX, offsetY } = drag;
    const left = x - offsetX;
    const top = y - offsetY;
    piece.style.transform = `translate3d(${left}px, ${top}px, 0) scale(1.1) rotate(-3deg)`;
    setTarget(findTarget(left + piece.offsetWidth / 2, top + piece.offsetHeight / 2));
  }

  // Nearest slot within radius wins; otherwise the tray if the pointer is over it
  function findTarget(cx, cy) {
    let best = null;
    for (const slot of slots) {
      const occ = occupantOf(slot);
      if (occ && occ.dataset.locked === 'true') continue; // can't swap with a locked brick
      const c = center(slot.getBoundingClientRect());
      const d = Math.hypot(cx - c.x, cy - c.y);
      if (d < SNAP_RADIUS && (!best || d < best.dist)) best = { type: 'slot', el: slot, dist: d };
    }
    if (best) return best;

    const t = tray.getBoundingClientRect();
    if (cx >= t.left && cx <= t.right && cy >= t.top && cy <= t.bottom) {
      return { type: 'tray', el: tray };
    }
    return null;
  }

  function setTarget(target) {
    if (drag.target && (!target || drag.target.el !== target.el)) {
      drag.target.el.classList.remove('active');
    }
    if (target) target.el.classList.add('active');
    drag.target = target;
  }

  function finishDrag(commit) {
    if (!drag) return;
    if (drag.raf) cancelAnimationFrame(drag.raf);
    if (commit) render(); // resolve target from the final pointer position

    const { piece, placeholder, origin } = drag;
    const target = commit ? drag.target : null;
    if (drag.target) drag.target.el.classList.remove('active');

    piece.classList.remove('dragging');
    piece.style.transform = '';

    if (!target || target.el === origin) {
      // Cancelled, dropped on nothing, or dropped back where it came from
      placeholder.replaceWith(piece);
      if (commit && !target) playOnce(piece, 'shake');
    } else if (target.type === 'tray') {
      placeholder.remove();
      tray.appendChild(piece);
      playOnce(piece, 'snap');
    } else {
      // Slot: fill if empty, swap if occupied
      const occupant = occupantOf(target.el);
      if (occupant) {
        placeholder.replaceWith(occupant);
        playOnce(occupant, 'snap');
      } else {
        placeholder.remove();
      }
      target.el.appendChild(piece);
      playOnce(piece, 'snap');
      const c = center(target.el.getBoundingClientRect());
      createDust(c.x, c.y);
    }

    drag = null;
    checkCompletion();
  }

  // ===== EVENTS (Pointer Events = mouse + touch + pen in one path) =====
  document.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', (e) => { if (drag && e.pointerId === drag.pointerId) finishDrag(true); });
  window.addEventListener('pointercancel', (e) => { if (drag && e.pointerId === drag.pointerId) finishDrag(false); });
  window.addEventListener('blur', () => finishDrag(false));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') finishDrag(false); });

  // ===== DUST =====
  function createDust(x, y) {
    const count = 15;
    for (let i = 0; i < count; i++) {
      const dust = document.createElement('div');
      dust.className = 'dust';
      const size = 3 + Math.random() * 6;
      const angle = (Math.PI * 2 * i) / count;
      const dist = 30 + Math.random() * 50;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;

      Object.assign(dust.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px` });
      document.body.appendChild(dust);

      const anim = dust.animate([
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(0)`, opacity: 0 }
      ], { duration: 800 + Math.random() * 400, easing: 'cubic-bezier(0, 0.9, 0.3, 1)' });
      anim.onfinish = () => dust.remove();
    }
  }

  // ===== COMPLETION =====
  let completed = false;
  function checkCompletion() {
    const allFilled = slots.every((s) => occupantOf(s));
    if (allFilled && !completed) {
      completed = true;
      setTimeout(() => {
        playOnce(wall, 'celebrate');
        const c = center(wall.getBoundingClientRect());
        createDust(c.x, c.y);
      }, 300);
    } else if (!allFilled) {
      completed = false; // re-arm if the player pulls a brick back out
    }
  }
})();
