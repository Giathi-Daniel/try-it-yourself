// 1. Set the name letter by letter, each one a touch crooked, like type on a press.
const name = document.getElementById("name");
const text = name.textContent;
name.textContent = "";

[...text].forEach((c, i) => {
  const span = document.createElement("span");
  span.className = "ch";
  span.textContent = c === " " ? " " : c;
  span.style.setProperty("--i", i);
  span.style.setProperty("--r", (Math.random() * 10 - 5).toFixed(1) + "deg");
  name.appendChild(span);
});

const dot = document.createElement("span");
dot.className = "dot";
dot.textContent = ".";
name.appendChild(dot);

requestAnimationFrame(() => requestAnimationFrame(() => {
  name.classList.add("go");
  document.body.classList.add("go");
}));

// 2. Reveal things as they scroll into view.
document.querySelectorAll(".row").forEach((row, i) => row.style.setProperty("--n", i));

const seen = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    seen.unobserve(e.target);
  });
}, { threshold: 0.3 });

document.querySelectorAll(".rv").forEach((el) => seen.observe(el));

// 3. A preview card that chases the cursor and leans into its own speed.
const peek = document.getElementById("peek");
const pos = { x: 0, y: 0 };
const target = { x: 0, y: 0 };
let tilt = 0;

window.addEventListener("pointermove", (e) => {
  target.x = e.clientX;
  target.y = e.clientY;
});

document.querySelectorAll(".row").forEach((row) => {
  row.addEventListener("pointerenter", () => {
    peek.dataset.art = row.dataset.art;
    peek.classList.add("on");
  });
  row.addEventListener("pointerleave", () => peek.classList.remove("on"));
});

function loop() {
  const vx = target.x - pos.x;
  pos.x += vx * 0.14;
  pos.y += (target.y - pos.y) * 0.14;

  const want = Math.max(-14, Math.min(14, vx * 0.12));
  tilt += (want - tilt) * 0.12;

  peek.style.transform = `translate(${pos.x}px, ${pos.y}px) rotate(${tilt}deg)`;
  requestAnimationFrame(loop);
}
loop();

// 4. The clock in the footer.
const time = document.getElementById("time");
const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Nairobi" });

function tick() { time.textContent = fmt.format(new Date()); }
tick();
setInterval(tick, 15000);
