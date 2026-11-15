const items = [
  { name: "Wireless headphones", price: 5999, qty: 1 },
  { name: "USB-C cable, 2 m", price: 899, qty: 2 },
];
const DELIVERY = 499, TAX = 0.16;

const $ = (id) => document.getElementById(id);
const money = (cents) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

// 1. Items and totals. Money is kept in cents so the maths stays exact.
function render() {
  $("items").innerHTML = items.map((it, i) => `
    <li>
      <span>${it.name}</span>
      <button data-i="${i}" data-d="-1" aria-label="Remove one">−</button>
      <b>${it.qty}</b>
      <button data-i="${i}" data-d="1" aria-label="Add one">+</button>
      <strong>${money(it.price * it.qty)}</strong>
    </li>`).join("");
  const sub = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const tax = Math.round(sub * TAX);
  $("sub").textContent = money(sub);
  $("delivery").textContent = money(DELIVERY);
  $("tax").textContent = money(tax);
  $("total").textContent = money(sub + DELIVERY + tax);
}

$("items").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const it = items[b.dataset.i];
  it.qty = Math.max(1, it.qty + Number(b.dataset.d));
  render();
});

// 2. The card form: format as you type and mirror it on the card.
const digits = (s) => s.replace(/\D/g, "");

function brandOf(n) {
  if (/^4/.test(n)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "MASTERCARD";
  if (/^3[47]/.test(n)) return "AMEX";
  return "CARD";
}

$("number").addEventListener("input", (e) => {
  const n = digits(e.target.value).slice(0, 16);
  e.target.value = n.replace(/(.{4})/g, "$1 ").trim();
  $("showNumber").textContent = n.padEnd(16, "•").replace(/(.{4})/g, "$1 ");
  $("brand").textContent = brandOf(n);
  validate();
});

$("name").addEventListener("input", (e) => {
  $("showName").textContent = e.target.value.toUpperCase() || "YOUR NAME";
  validate();
});

$("exp").addEventListener("input", (e) => {
  const d = digits(e.target.value).slice(0, 4);
  e.target.value = d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d;
  $("showExp").textContent = e.target.value || "MM/YY";
  validate();
});

$("cvc").addEventListener("input", (e) => {
  e.target.value = digits(e.target.value).slice(0, 4);
  validate();
});

// 3. Validation. The Luhn check catches typos and made-up numbers.
function luhn(n) {
  let sum = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return n.length >= 13 && sum % 10 === 0;
}

function expOk(v) {
  const [m, y] = v.split("/").map(Number);
  if (!m || !y || m > 12) return false;
  return new Date(2000 + y, m) > new Date();
}

function validate() {
  const ok = {
    number: luhn(digits($("number").value)),
    name: $("name").value.trim().length > 1,
    exp: expOk($("exp").value),
    cvc: $("cvc").value.length >= 3,
  };
  for (const id in ok) $(id).setAttribute("aria-invalid", $(id).value !== "" && !ok[id]);
  $("place").disabled = !Object.values(ok).every(Boolean);
}

// 4. Place the order. A real shop hands the card to its payment provider here.
$("place").addEventListener("click", () => {
  $("place").textContent = "Order placed ✓";
  $("place").disabled = true;
  $("note").textContent = "Thanks! This was a demo, so nothing was charged.";
});

render();
