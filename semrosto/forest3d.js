// EP11 set (3D): a dark forest at night — toon trunks with ink outlines, fog, moonlight, fallen leaves, pages pinned on trees, and the flashlight cone.
const THREE = window.THREE;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#05081a'); scene.fog = new THREE.FogExp2('#101838', 0.06);
const cam3 = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.1, 200);
const grad = new THREE.DataTexture(new Uint8Array([60, 60, 60, 255, 140, 140, 140, 255, 255, 255, 255, 255]), 3, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
const inkM = new THREE.MeshBasicMaterial({ color: '#0a0710', side: THREE.BackSide });
function inked(geo, mat, ink = 0.04) { const grp = new THREE.Group(); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; grp.add(m); const k = new THREE.Mesh(geo, inkM); k.scale.setScalar(1 + ink); grp.add(k); scene.add(grp); return grp; }
// ground
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), toon('#1e2a1c')); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < 260; i++) { const l = new THREE.Mesh(new THREE.CircleGeometry(0.08 + rnd() * 0.08, 5), toon(['#5a3a1e', '#7a4a22', '#3a2a14'][i % 3])); l.rotation.x = -Math.PI / 2; l.rotation.z = rnd() * 6; l.position.set((rnd() - 0.5) * 16, 0.01, -rnd() * 30 + 4); scene.add(l); }
// trees: tall thin trunks + a few bare branches (keeps the path at x≈0 clear)
const TREES = [];
for (let i = 0; i < 70; i++) {
  let x = (rnd() - 0.5) * 22, z = -rnd() * 40 + 3; if (Math.abs(x) < 1.6 && z > -18) x += Math.sign(x || 1) * 2.2;
  const r = 0.14 + rnd() * 0.18, h = 9 + rnd() * 6;
  const t = inked(new THREE.CylinderGeometry(r * 0.7, r, h, 10), toon(['#3a2e26', '#2e241e', '#463a30'][i % 3])); t.position.set(x, h / 2, z); TREES.push(t);
  for (let b = 0; b < 3; b++) { const br = inked(new THREE.CylinderGeometry(0.03, 0.06, 1.6, 6), toon('#2e241e'), 0.08); br.position.set(x, 3 + b * 1.6 + rnd(), z); br.rotation.z = (rnd() - 0.5) * 2.2; br.rotation.y = rnd() * 6; }
}
// pages pinned on trees
function page(x, y, z, ry = 0) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.42), new THREE.MeshToonMaterial({ color: '#f3eedc', gradientMap: grad, side: THREE.DoubleSide })); p.position.set(x, y, z); p.rotation.y = ry; scene.add(p); return p; }
const PAGE1 = page(1.3, 1.5, -3.1, -0.4);
// lights: cold moonlight, a faint blue fill, and the phone flashlight (spot)
scene.add(new THREE.HemisphereLight('#3a4a9a', '#14141c', 1.1));
const moonL = new THREE.DirectionalLight('#8fa8ff', 0.6); moonL.position.set(-8, 14, 4); moonL.castShadow = true; scene.add(moonL);
const flash = new THREE.SpotLight('#fff3d0', 40, 18, 0.42, 0.5, 1.4); flash.castShadow = true; scene.add(flash); scene.add(flash.target);
function proj(x, y, z) { const v = new THREE.Vector3(x, y, z).project(cam3); return [(v.x + 1) / 2 * SW, (1 - v.y) / 2 * SH, cam3.position.distanceTo(new THREE.Vector3(x, y, z))]; }
// pixels per world meter at distance d (for sizing the 2D characters): the boy's art is ~900 px tall at s=1 (1.7 m)
function ppm(d) { return (SH / 2) / (d * Math.tan(cam3.fov * Math.PI / 360)); }

// visible flashlight beam (a soft additive cone), aimed like the spot light
const beamMat = new THREE.MeshBasicMaterial({ color: '#fff3c8', transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 32, 1, true), beamMat); scene.add(beam);
function aimFlash(from, to, on = 1) {
  flash.position.set(...from); flash.target.position.set(...to); flash.intensity = 40 * on; beam.visible = on > 0.05; beamMat.opacity = 0.1 * on;
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), dir = b.clone().sub(a).normalize();
  beam.position.copy(a.clone().add(dir.clone().multiplyScalar(3.5))); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
}
