import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

// ---------- scene, camera, renderer ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color("#f3d9c4");
scene.fog = new THREE.Fog("#f3d9c4", 8, 18);

const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.6, 6.5);
camera.lookAt(0, 1.1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// ---------- light and ground ----------
scene.add(new THREE.HemisphereLight("#fff4e8", "#5a3a2a", 1.4));

const sun = new THREE.DirectionalLight("#ffe2c4", 2.2);
sun.position.set(3, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const ground = new THREE.Mesh(new THREE.CircleGeometry(6, 48), new THREE.MeshStandardMaterial({ color: "#d9b79a" }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const disc = new THREE.Mesh(new THREE.CircleGeometry(2.4, 64), new THREE.MeshBasicMaterial({ color: "#d9452b", fog: false }));
disc.position.set(0, 3.2, -9);
scene.add(disc);

// ---------- materials and a helper ----------
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7, ...extra });
const RED = mat("#b3241f");
const BLACK = mat("#1d1a1f");
const BLACK2 = mat("#1d1a1f", { side: THREE.DoubleSide });
const CLOTH = mat("#2b2f45");
const SKIN = mat("#e0b08a");
const GOLD = mat("#e8b53e", { metalness: 0.3, roughness: 0.4 });
const STEEL = mat("#e8eef4", { roughness: 0.3, emissive: "#4a525c" });

const samurai = new THREE.Group();
scene.add(samurai);

function part(geo, material, x, y, z, parent = samurai) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

// ---------- legs: wide hakama trousers ----------
for (const side of [-1, 1]) {
  part(new THREE.CylinderGeometry(0.2, 0.36, 1, 8), CLOTH, side * 0.24, 0.5, 0);
  part(new THREE.BoxGeometry(0.22, 0.1, 0.36), BLACK, side * 0.24, 0.05, 0.06);
}

// ---------- body armour (do), belt and laces ----------
part(new THREE.CylinderGeometry(0.42, 0.34, 0.8, 8), RED, 0, 1.38, 0);
part(new THREE.CylinderGeometry(0.36, 0.44, 0.22, 8), BLACK, 0, 1.0, 0);

for (let i = 0; i < 4; i++) {
  const lace = part(new THREE.TorusGeometry(0.36 + i * 0.017, 0.018, 4, 16), GOLD, 0, 1.12 + i * 0.17, 0);
  lace.rotation.x = Math.PI / 2;
}

// ---------- armoured skirt (kusazuri): six plates in a ring ----------
for (let i = 0; i < 6; i++) {
  const a = (i / 6) * Math.PI * 2;
  const plate = part(new THREE.BoxGeometry(0.3, 0.42, 0.05), RED, Math.sin(a) * 0.42, 0.74, Math.cos(a) * 0.42);
  plate.rotation.order = "YXZ";
  plate.rotation.set(-0.25, a, 0);
}

// ---------- head and helmet (kabuto) ----------
part(new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8), SKIN, 0, 1.84, 0);
part(new THREE.SphereGeometry(0.22, 12, 10), SKIN, 0, 2.05, 0);
part(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), BLACK, 0, 2.1, 0);
part(new THREE.CylinderGeometry(0.28, 0.4, 0.22, 12, 1, true, Math.PI * 0.3, Math.PI * 1.4), BLACK2, 0, 2.0, 0);

// the face mask (menpo) and two dark eyes
part(new THREE.BoxGeometry(0.28, 0.13, 0.1), RED, 0, 1.97, 0.17);
for (const side of [-1, 1]) part(new THREE.BoxGeometry(0.06, 0.025, 0.02), BLACK, side * 0.08, 2.08, 0.21);

// ---------- the crest (kuwagata): two golden horns ----------
for (const side of [-1, 1]) {
  const horn = part(new THREE.BoxGeometry(0.05, 0.55, 0.02), GOLD, side * 0.13, 2.45, 0.2);
  horn.rotation.z = -side * 0.45;
}
const badge = part(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 16), GOLD, 0, 2.22, 0.26);
badge.rotation.x = Math.PI / 2;

// ---------- shoulder guards (sode): stacked plates ----------
for (const side of [-1, 1]) {
  const sode = new THREE.Group();
  sode.position.set(side * 0.56, 1.74, 0);
  sode.rotation.z = side * 0.35;
  samurai.add(sode);
  for (let i = 0; i < 4; i++) {
    part(new THREE.BoxGeometry(0.06, 0.12, 0.42), i === 3 ? GOLD : RED, 0, -i * 0.12, 0, sode);
  }
}

// ---------- arms and the katana, in one group so they swing together ----------
const arms = new THREE.Group();
arms.position.set(0, 1.66, 0);
samurai.add(arms);

for (const side of [-1, 1]) {
  const arm = new THREE.Group();
  arm.position.x = side * 0.46;
  arm.rotation.set(-0.9, 0, -side * 0.75);
  arms.add(arm);
  part(new THREE.CylinderGeometry(0.1, 0.15, 0.55, 8), CLOTH, 0, -0.28, 0, arm);
  part(new THREE.SphereGeometry(0.075, 8, 6), SKIN, 0, -0.6, 0, arm);
}

const katana = new THREE.Group();
katana.position.set(0, -0.3, 0.34);
katana.rotation.x = 0.8;
arms.add(katana);
part(new THREE.CylinderGeometry(0.035, 0.035, 0.34, 8), BLACK, 0, 0, 0, katana);
part(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16), GOLD, 0, 0.18, 0, katana);
part(new THREE.BoxGeometry(0.07, 1.1, 0.025), STEEL, 0, 0.74, 0, katana);

// ---------- falling sakura petals: one InstancedMesh, 160 copies ----------
const COUNT = 160;
const petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.05), new THREE.MeshBasicMaterial({ color: "#f7b3c7", side: THREE.DoubleSide }), COUNT);
scene.add(petals);

const seeds = Array.from({ length: COUNT }, () => ({
  x: (Math.random() - 0.5) * 10,
  y: Math.random() * 6,
  z: (Math.random() - 0.5) * 8,
  speed: 0.3 + Math.random() * 0.5,
  spin: Math.random() * 6,
}));

const dummy = new THREE.Object3D();
function updatePetals(t, dt) {
  seeds.forEach((p, i) => {
    p.y -= p.speed * dt;
    if (p.y < 0) p.y = 6;
    dummy.position.set(p.x + Math.sin(t + p.spin) * 0.4, p.y, p.z);
    dummy.rotation.set(t * p.speed * 2 + p.spin, t + p.spin, 0);
    dummy.updateMatrix();
    petals.setMatrixAt(i, dummy.matrix);
  });
  petals.instanceMatrix.needsUpdate = true;
}

// ---------- orbit controls ----------
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.1, 0);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.6;
controls.minDistance = 4;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI / 2.05;

// ---------- double-click to strike ----------
let slash = 0;
addEventListener("dblclick", () => { if (!slash) slash = 1; });

function swing(k) {
  if (k < 0.45) return -1.5 * Math.sin((k / 0.45) * (Math.PI / 2));
  if (k < 0.6) return -1.5 + 2.2 * ((k - 0.45) / 0.15);
  return 0.7 * (1 - (k - 0.6) / 0.4);
}

// ---------- the loop ----------
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  samurai.position.y = Math.sin(t * 2) * 0.01;
  if (slash > 0) slash = Math.max(0, slash - dt * 1.6);
  arms.rotation.x = slash > 0 ? swing(1 - slash) : Math.sin(t * 1.5) * 0.03;
  updatePetals(t, dt);
  controls.update();
  renderer.render(scene, camera);
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
