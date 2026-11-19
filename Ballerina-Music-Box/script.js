import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------- scene, camera, renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color("#2b1d33");
scene.fog = new THREE.Fog("#2b1d33", 9, 20);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 2.8, Math.max(6.4, 5.8 / camera.aspect)); // step back on tall screens
camera.lookAt(0, 1.6, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// ---------- a spotlight on a dark table ----------
scene.add(new THREE.HemisphereLight("#ffe9f1", "#3a2026", 1.2));

const spot = new THREE.SpotLight("#ffe6d0", 90, 16, 0.55, 0.6);
spot.position.set(2, 7, 4);
spot.target.position.set(0, 1, 0);
spot.castShadow = true;
spot.shadow.mapSize.set(1024, 1024);
scene.add(spot, spot.target);

const rim = new THREE.DirectionalLight("#ff9ec4", 1.2);
rim.position.set(-4, 3, -5);
scene.add(rim);

const table = new THREE.Mesh(new THREE.CircleGeometry(7, 64), new THREE.MeshStandardMaterial({ color: "#3a2620" }));
table.rotation.x = -Math.PI / 2;
table.receiveShadow = true;
scene.add(table);

// ---------- materials and a helper ----------
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
const PINK = mat("#f2a7bd");
const ROSE = mat("#e27a9b");
const GOLD = mat("#e2b44c", { metalness: 0.3, roughness: 0.35 });
const VELVET = mat("#7a1f3d", { roughness: 0.9 });
const SKIN = mat("#f6d7c4");
const HAIR = mat("#4a2a1f");
const TUTU = mat("#ffd6e4", { side: THREE.DoubleSide });
const MIRROR = mat("#cfe0ee", { roughness: 0.15, emissive: "#3d4b5a" });

function part(geo, material, x, y, z, parent = scene) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

// ---------- the music box ----------
part(new THREE.BoxGeometry(3.2, 1.2, 2.2), PINK, 0, 0.6, 0);
part(new THREE.BoxGeometry(3.3, 0.08, 2.3), GOLD, 0, 1.2, 0);
part(new THREE.BoxGeometry(3.3, 0.08, 2.3), GOLD, 0, 0.04, 0);
part(new THREE.PlaneGeometry(3, 2), VELVET, 0, 1.245, 0).rotation.x = -Math.PI / 2;

const badge = part(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 32), GOLD, 0, 0.62, 1.11);
badge.rotation.x = Math.PI / 2;
part(new THREE.SphereGeometry(0.1, 16, 12), ROSE, 0, 0.62, 1.13).scale.z = 0.4;

// ---------- the lid, hinged at the back, with a mirror inside ----------
const lid = new THREE.Group();
lid.position.set(0, 1.24, -1.1);
lid.rotation.x = -1.95;
scene.add(lid);
part(new THREE.BoxGeometry(3.2, 0.16, 2.2), PINK, 0, 0.08, 1.1, lid);
part(new THREE.BoxGeometry(3.3, 0.05, 2.3), GOLD, 0, 0.17, 1.1, lid);
part(new THREE.PlaneGeometry(2.8, 1.8), GOLD, 0, -0.004, 1.1, lid).rotation.x = Math.PI / 2;
part(new THREE.PlaneGeometry(2.6, 1.6), MIRROR, 0, -0.008, 1.1, lid).rotation.x = Math.PI / 2;

// ---------- the dancer, on a platform that will spin ----------
const spinner = new THREE.Group();
spinner.position.y = 1.25;
scene.add(spinner);
part(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 32), GOLD, 0, 0.03, 0, spinner);

const dancer = new THREE.Group();
dancer.position.y = 0.06;
dancer.scale.setScalar(0.95);
spinner.add(dancer);

// standing leg, en pointe
part(new THREE.CylinderGeometry(0.035, 0.05, 0.62, 12), SKIN, 0, 0.36, 0, dancer);
part(new THREE.ConeGeometry(0.035, 0.08, 12), ROSE, 0, 0.04, 0, dancer).rotation.x = Math.PI;

// the other leg bent, toe at the knee (passé)
const thigh = new THREE.Group();
thigh.position.set(0.06, 0.64, 0);
thigh.rotation.z = 0.98;
dancer.add(thigh);
part(new THREE.CylinderGeometry(0.05, 0.045, 0.29, 12), SKIN, 0, -0.145, 0, thigh);
const shin = new THREE.Group();
shin.position.set(0.3, 0.48, 0.02);
shin.rotation.z = -1.37;
dancer.add(shin);
part(new THREE.CylinderGeometry(0.042, 0.03, 0.28, 12), SKIN, 0, -0.14, 0, shin);

// body and head
part(new THREE.CylinderGeometry(0.12, 0.09, 0.3, 16), ROSE, 0, 0.86, 0, dancer);
part(new THREE.CylinderGeometry(0.035, 0.04, 0.1, 12), SKIN, 0, 1.05, 0, dancer);
part(new THREE.SphereGeometry(0.1, 24, 16), SKIN, 0, 1.16, 0, dancer);
const hair = part(new THREE.SphereGeometry(0.104, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), HAIR, 0, 1.165, 0, dancer);
hair.rotation.x = -0.5;
part(new THREE.SphereGeometry(0.055, 16, 12), HAIR, 0, 1.25, -0.05, dancer);

// the tutu: two layers and a soft frill
part(new THREE.CylinderGeometry(0.5, 0.52, 0.04, 40), TUTU, 0, 0.68, 0, dancer);
part(new THREE.CylinderGeometry(0.4, 0.46, 0.05, 40), PINK, 0, 0.72, 0, dancer);
part(new THREE.TorusGeometry(0.51, 0.035, 8, 64), TUTU, 0, 0.68, 0, dancer).rotation.x = Math.PI / 2;

// arms raised above the head (fifth position): two arcs of a torus
for (const side of [-1, 1]) {
  const arm = part(new THREE.TorusGeometry(0.23, 0.022, 8, 32, 2.5), SKIN, 0, 1.23, 0.03, dancer);
  arm.rotation.set(0.25, side === 1 ? 0 : Math.PI, -1.07);
}

// ---------- the winding key ----------
part(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 12), GOLD, 1.72, 0.6, 0).rotation.z = Math.PI / 2;
const key = new THREE.Group();
key.position.set(1.9, 0.6, 0);
scene.add(key);
for (const side of [-1, 1]) {
  part(new THREE.TorusGeometry(0.11, 0.03, 8, 24), GOLD, 0, side * 0.13, 0, key).rotation.y = Math.PI / 2;
}

// ---------- sparkles: 220 points around the box ----------
const sparkleGeo = new THREE.BufferGeometry();
const points = [];
for (let i = 0; i < 220; i++) {
  points.push((Math.random() - 0.5) * 7, Math.random() * 4.5, (Math.random() - 0.5) * 5);
}
sparkleGeo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
const sparkles = new THREE.Points(sparkleGeo, new THREE.PointsMaterial({ color: "#ffe9b0", size: 0.04, transparent: true, opacity: 0.8 }));
scene.add(sparkles);

// ---------- orbit controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.6, 0);
controls.enableDamping = true;
controls.minDistance = 4;
controls.maxDistance = 11;
controls.maxPolarAngle = Math.PI / 2.1;

// ---------- the tune: a tiny music-box synth ----------
const NOTES = [76, 79, 84, 79, 83, 79, 81, 77, 84, 81, 79, 76, 74, 77, 83, 79, 84, 88, 86, 83, 79, 76, 74, 72];
let audio;

function pluck(midi) {
  const f = 440 * 2 ** ((midi - 69) / 12);
  const now = audio.currentTime;
  for (const [mult, vol] of [[1, 0.22], [4.2, 0.05]]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = f * mult;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8 / mult);
    osc.connect(gain).connect(audio.destination);
    osc.start(now);
    osc.stop(now + 2);
  }
}

// ---------- click (not drag) to wind it up ----------
let speed = 0, open = 0, beat = 0, step = 0, downAt = null;

function wind() {
  audio ??= new AudioContext();
  audio.resume();
  speed = 1;
}

renderer.domElement.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) wind();
});

// ---------- the loop ----------
const clock = new THREE.Clock();
const ease = (x) => x * x * (3 - 2 * x);

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);

  // unwind slowly; the lid follows, then the dancer rises
  speed = Math.max(0, speed - dt * 0.05);
  open += ((speed > 0 ? 1 : 0) - open) * Math.min(1, dt * 2.5);
  lid.rotation.x = -1.95 * open;
  const rise = ease(Math.min(1, Math.max(0, (open - 0.3) / 0.7)));
  spinner.position.y = 1.25 - 1.05 * (1 - rise);
  spinner.scale.setScalar(0.3 + 0.7 * rise);

  spinner.rotation.y += dt * speed * 2;
  key.rotation.x -= dt * speed * 3;
  sparkles.rotation.y += dt * 0.05;
  sparkles.material.opacity = 0.8 * open;

  // the tune slows down with the spring
  if (audio && speed > 0.02) {
    beat += dt * speed * 4.5;
    while (beat >= 1) {
      beat -= 1;
      pluck(NOTES[step++ % NOTES.length]);
    }
  }

  controls.update();
  renderer.render(scene, camera);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
