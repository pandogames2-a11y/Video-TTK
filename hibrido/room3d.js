// Hybrid style test: the set is real 3D (three.js, toon shading + ink outlines, night light),
// the characters stay 2D (drawn on a transparent canvas on top, with the light rim), placed by projecting 3D points.
const THREE = window.THREE;
const SHOT = new URLSearchParams(location.search).get('shot') || 'a';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#070a1c'); scene.fog = new THREE.Fog('#0a0e26', 9, 22);
const cam3 = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.1, 100);
// toon look: 3-step gradient + inverted-hull ink outline
const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
const inkM = new THREE.MeshBasicMaterial({ color: '#120c16', side: THREE.BackSide });
function box3(w, h, d, c, x, y, z, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(g, o.mat || toon(c, o.matOpt)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  if (o.ink !== false) { const ink = new THREE.Mesh(g, inkM); ink.scale.setScalar(1); ink.position.copy(m.position); const s = 0.035; ink.scale.set(1 + s / w * 2, 1 + s / h * 2, 1 + s / d * 2); scene.add(ink); }
  return m;
}
// room: floor, back wall (z=-4), left wall (x=-4), baseboard
box3(10, 0.1, 10, '#6b4630', 0, -0.05, 0, { ink: false });
for (let i = -4; i < 5; i++) box3(0.02, 0.012, 10, '#4e2c18', i * 0.7 + 0.3, 0.005, 0, { ink: false });
box3(10, 6, 0.2, '#46557a', 0, 3, -4.1, { ink: false }); box3(0.2, 6, 10, '#3e4c6e', -4.1, 3, 0, { ink: false });
for (let i = 0; i < 14; i++) box3(0.03, 6, 0.02, '#3a4868', -4 + i * 0.7, 3, -3.99, { ink: false });
box3(10, 0.18, 0.06, '#e8dcc4', 0, 0.09, -3.97); box3(0.06, 0.18, 10, '#e8dcc4', -3.97, 0.09, 0);
// window on the left wall with the moon outside
box3(0.08, 1.9, 1.6, '#efe6d6', -3.95, 2.6, -1.4); box3(0.1, 1.7, 1.4, '#0b1030', -3.92, 2.6, -1.4, { mat: new THREE.MeshBasicMaterial({ color: '#141c4a' }), ink: false });
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), new THREE.MeshBasicMaterial({ color: '#f7f1d0' })); moon.position.set(-3.85, 3.05, -1.0); scene.add(moon);
box3(0.12, 0.05, 1.6, '#efe6d6', -3.9, 2.6, -1.4); box3(0.12, 1.7, 0.05, '#efe6d6', -3.9, 2.6, -1.4);
// bed on the right
box3(1.6, 0.45, 2.6, '#7a4a2c', 2.6, 0.32, -2.6); box3(1.5, 0.25, 2.5, '#c9d4e6', 2.6, 0.66, -2.6); box3(1.52, 0.2, 1.7, '#3a6fb0', 2.6, 0.82, -2.2);
box3(1.6, 1.3, 0.12, '#6b3d26', 2.6, 0.75, -3.9); const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.8, 8, 16), toon('#f2efe6')); pil.rotation.z = Math.PI / 2; pil.position.set(2.6, 0.9, -3.5); scene.add(pil);
// desk, monitor (glowing), keyboard, energy cans
box3(2.4, 0.08, 0.9, '#3a3a44', -0.6, 1.1, -3.4); box3(0.08, 1.1, 0.08, '#22222a', -1.7, 0.55, -3.0); box3(0.08, 1.1, 0.08, '#22222a', 0.5, 0.55, -3.0); box3(0.08, 1.1, 0.08, '#22222a', -1.7, 0.55, -3.8); box3(0.08, 1.1, 0.08, '#22222a', 0.5, 0.55, -3.8);
box3(1.3, 0.78, 0.08, '#16161c', -0.6, 1.75, -3.65); box3(1.18, 0.66, 0.02, '#3ad0ff', -0.6, 1.75, -3.6, { mat: new THREE.MeshBasicMaterial({ color: '#3ad0ff' }), ink: false }); box3(0.1, 0.3, 0.1, '#22222a', -0.6, 1.28, -3.68);
box3(0.7, 0.04, 0.25, '#22222a', -0.6, 1.16, -3.15);
for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 16), toon(['#46e05a', '#e0e040', '#46e05a'][i])); c.position.set(0.15 + i * 0.15, 1.25, -3.25); scene.add(c); }
// gamer chair (empty; Pedrinho is 2D and sits on it)
box3(0.7, 0.1, 0.7, '#2a2a34', -0.6, 0.72, -2.4); box3(0.7, 1.0, 0.12, '#c0392b', -0.6, 1.3, -2.75); box3(0.08, 0.6, 0.08, '#22222a', -0.6, 0.38, -2.4); box3(0.8, 0.05, 0.08, '#22222a', -0.6, 0.06, -2.4); box3(0.08, 0.05, 0.8, '#22222a', -0.6, 0.06, -2.4);
// shelf with books, clock, poster
box3(1.4, 0.06, 0.3, '#7a4a2c', 1.2, 2.5, -3.85); for (let i = 0; i < 5; i++) box3(0.14, 0.4, 0.24, ['#3a8fd6', '#46a35a', '#d64036', '#f2c53d', '#8a5ad6'][i], 0.75 + i * 0.2, 2.73, -3.85);
const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 32), toon('#f3ece0')); clock.rotation.x = Math.PI / 2; clock.position.set(2.6, 3.4, -3.95); scene.add(clock);
box3(0.9, 1.2, 0.04, '#2a8a5a', -2.6, 2.8, -3.95);
// rug
const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.02, 48), toon('#5a2a6a')); rug.scale.z = 0.6; rug.position.set(0.4, 0.02, -1.3); rug.receiveShadow = true; scene.add(rug);
// lights: cool moonlight + the monitor's cyan glow + a dim warm fill
scene.add(new THREE.HemisphereLight('#6a7ad0', '#2a1a30', 1.3));
const moonL = new THREE.DirectionalLight('#8fa8ff', 1.1); moonL.position.set(-6, 6, 2); moonL.castShadow = true; moonL.shadow.mapSize.set(2048, 2048); Object.assign(moonL.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); scene.add(moonL);
const mon = new THREE.PointLight('#3ad0ff', 6, 6, 1.6); mon.position.set(-0.6, 1.8, -3.2); scene.add(mon);
const warm = new THREE.PointLight('#ffb070', 1.2, 8, 2); warm.position.set(2.6, 2.6, -1); scene.add(warm);
// camera
if (SHOT === 'a') { cam3.position.set(1.2, 2.6, 5.2); cam3.lookAt(0.2, 1.4, -2.4); }
else { cam3.position.set(0.2, 1.5, 0.9); cam3.lookAt(-0.6, 1.2, -2.4); }
renderer.render(scene, cam3);
// 2D layer: project the chair seat to the screen and draw Pedrinho there (asleep, controller in hand)
function proj(x, y, z) { const v = new THREE.Vector3(x, y, z).project(cam3); return [(v.x + 1) / 2 * SW, (1 - v.y) / 2 * SH, cam3.position.distanceTo(new THREE.Vector3(x, y, z))]; }
const [sx, sy, d] = proj(-0.6, 0.78, -2.4), s = 0.9 * (SH / 2) / (d * Math.tan(cam3.fov * Math.PI / 360)) / 330;
const SCR = { x: SW / 2, y: SH / 2, z: 1 };
main.clearRect(0, 0, SW, SH);
characters(SCR, () => { bean(sx, sy + 40 * s, { sit: true, s, blink: SHOT === 'a' ? 1 : 0, mouth: 'o', tilt: SHOT === 'a' ? 0.2 : 0, look: [0, -0.3], armL: [-120, -170, -60, -120], armR: [120, -170, 60, -120] }); }, 'rgba(190,220,255,0.95)', 0.25);
vignette(main, 0.55);
window.READY = true;
