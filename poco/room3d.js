// EP12 set (3D): Pedrinho's bedroom at 3 a.m. — an old CRT TV on a stand with a VCR, a beanbag in front of it, bed, window with the moon,
// toon shading + ink outlines. The TV screen is a live canvas texture (tvDraw) and the TV lights the room with its own glow.
const THREE = window.THREE;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#05081a'); scene.fog = new THREE.Fog('#070a1e', 6, 16);
const cam3 = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.05, 100);
const grad = new THREE.DataTexture(new Uint8Array([60, 60, 60, 255, 140, 140, 140, 255, 255, 255, 255, 255]), 3, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad });
const inkM = new THREE.MeshBasicMaterial({ color: '#0a0710', side: THREE.BackSide });
function box3(w, h, d, c, x, y, z, o = {}) {
  const geo = new THREE.BoxGeometry(w, h, d), m = new THREE.Mesh(geo, o.mat || toon(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  if (o.ink !== false) { const k = new THREE.Mesh(geo, inkM); k.position.copy(m.position); const s = 0.03; k.scale.set(1 + s / w * 2, 1 + s / h * 2, 1 + s / d * 2); scene.add(k); }
  return m;
}
function texCanvas(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d')); return new THREE.CanvasTexture(cv); }
// room shell: floor (wood planks), 4 walls, baseboards
box3(8, 0.1, 8, '#5e3e2a', 0, -0.05, 0, { ink: false });
for (let i = 0; i < 12; i++) box3(0.015, 0.012, 8, '#3e2618', -3.8 + i * 0.68, 0.005, 0, { ink: false });
box3(8, 4, 0.2, '#3e4a6e', 0, 2, -4.1, { ink: false }); box3(0.2, 4, 8, '#36426a', -4.1, 2, 0, { ink: false }); box3(0.2, 4, 8, '#36426a', 4.1, 2, 0, { ink: false });
const FRONT = box3(8, 4, 0.2, '#3e4a6e', 0, 2, 4.1, { ink: false });
box3(8, 0.1, 8, '#2a3050', 0, 4.05, 0, { ink: false });
for (const [w, d, x, z] of [[8, 0.06, 0, -3.97], [0.06, 8, -3.97, 0], [0.06, 8, 3.97, 0], [8, 0.06, 0, 3.97]]) box3(w, 0.16, d, '#d8ccb4', x, 0.08, z);
// window on the left wall + moon + blinds
box3(0.08, 1.6, 1.4, '#e8e0cc', -3.96, 2.3, -1.2); box3(0.04, 1.4, 1.2, '#0b1030', -3.93, 2.3, -1.2, { mat: new THREE.MeshBasicMaterial({ color: '#16205a' }), ink: false });
const moon = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), new THREE.MeshBasicMaterial({ color: '#f7f1d0' })); moon.position.set(-3.9, 2.7, -0.9); scene.add(moon);
for (let i = 0; i < 6; i++) box3(0.05, 0.03, 1.2, '#cfc6b0', -3.88, 1.75 + i * 0.22, -1.2, { ink: false });
// TV stand (open shelf) + CRT TV + rabbit ears + VCR with an LED clock
box3(1.7, 0.06, 0.75, '#6a4128', 0, 0.62, -3.5); box3(1.7, 0.06, 0.75, '#6a4128', 0, 0.06, -3.5); box3(0.06, 0.6, 0.75, '#5a3520', -0.82, 0.34, -3.5); box3(0.06, 0.6, 0.75, '#5a3520', 0.82, 0.34, -3.5);
box3(1.15, 0.92, 0.8, '#2a2a30', 0, 1.11, -3.5); box3(1.0, 0.8, 0.02, '#1a1a1e', 0, 1.13, -3.09, { ink: false });
box3(0.12, 0.6, 0.02, '#3a3a40', 0.47, 1.11, -3.085, { ink: false }); for (let i = 0; i < 3; i++) { const kb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), toon('#888890')); kb.rotation.x = Math.PI / 2; kb.position.set(0.47, 1.3 - i * 0.12, -3.07); scene.add(kb); }
for (const sx of [-1, 1]) { const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.8, 6), toon('#b8b8c0')); ant.position.set(sx * 0.2, 1.9, -3.55); ant.rotation.z = -sx * 0.5; scene.add(ant); }
const SCREEN_CV = document.createElement('canvas'); SCREEN_CV.width = 512; SCREEN_CV.height = 400; const SCREEN_TX = new THREE.CanvasTexture(SCREEN_CV); SCREEN_TX.colorSpace = THREE.SRGBColorSpace;
const SCREEN = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.64), new THREE.MeshBasicMaterial({ map: SCREEN_TX })); SCREEN.position.set(-0.08, 1.13, -3.075); scene.add(SCREEN);
const SCR3 = { x: -0.08, y: 1.13, z: -3.07, w: 0.82, h: 0.64 };
box3(0.95, 0.13, 0.5, '#1c1c22', 0, 0.16, -3.4);
const LED_CV = document.createElement('canvas'); LED_CV.width = 128; LED_CV.height = 40; const LED_TX = new THREE.CanvasTexture(LED_CV);
{ const c = LED_CV.getContext('2d'); c.fillStyle = '#080808'; c.fillRect(0, 0, 128, 40); c.fillStyle = '#ff3a2a'; c.font = 'bold 30px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('03:00', 64, 21); }
const LED = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.07), new THREE.MeshBasicMaterial({ map: LED_TX })); LED.position.set(0.25, 0.17, -3.145); scene.add(LED);
box3(0.4, 0.02, 0.02, '#050505', -0.2, 0.17, -3.145, { ink: false });   // tape slot
// wall socket + TV cable (the "right thing to do": pull the plug)
box3(0.16, 0.22, 0.03, '#e8e2d4', 1.3, 0.45, -3.98); box3(0.07, 0.07, 0.04, '#2a2a30', 1.3, 0.45, -3.95);
const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.3, 0.45, -3.93), new THREE.Vector3(1.2, 0.05, -3.85), new THREE.Vector3(0.6, 0.03, -3.8), new THREE.Vector3(0.4, 0.9, -3.88)]), 24, 0.015, 6), toon('#101014')); scene.add(cable);
// beanbag in front of the TV
const BEANBAG = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), toon('#b8323a')); BEANBAG.scale.set(1, 0.6, 1); BEANBAG.position.set(0, 0.3, 0.45); BEANBAG.castShadow = BEANBAG.receiveShadow = true; scene.add(BEANBAG);
{ const k = new THREE.Mesh(BEANBAG.geometry, inkM); k.scale.set(1.04, 0.63, 1.04); k.position.copy(BEANBAG.position); scene.add(k); }
// rug
const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.02, 48), toon('#3a2a5a')); rug.scale.z = 0.7; rug.position.set(0, 0.015, -0.9); rug.receiveShadow = true; scene.add(rug);
// bed on the right wall, nightstand
box3(1.5, 0.42, 2.4, '#6a4128', 3.15, 0.25, 0.2); box3(1.42, 0.22, 2.3, '#c9d4e6', 3.15, 0.56, 0.2); box3(1.44, 0.16, 1.5, '#2f6a9a', 3.15, 0.7, 0.6); box3(0.12, 1.2, 1.5, '#5a3520', 3.9, 0.7, 0.2);
const pil = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 8, 16), toon('#f2efe6')); pil.rotation.x = Math.PI / 2; pil.position.set(3.55, 0.78, 0.2); pil.rotation.z = Math.PI / 2; scene.add(pil);
box3(0.5, 0.55, 0.45, '#5a3520', 3.4, 0.28, -1.5); box3(0.06, 0.3, 0.06, '#d0c0a0', 3.4, 0.7, -1.5); const shade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.2, 16, 1, true), toon('#e8d8b0')); shade.position.set(3.4, 0.92, -1.5); scene.add(shade);
// posters (left + back walls), a shelf with game boxes, door + shelf on the front wall (seen in the reverse shots)
box3(0.03, 1.0, 0.7, '#a03030', -3.96, 2.1, 1.4, { mat: new THREE.MeshBasicMaterial({ map: texCanvas(140, 200, c => { c.fillStyle = '#2a1430'; c.fillRect(0, 0, 140, 200); c.fillStyle = '#ffcc33'; c.font = '900 30px sans-serif'; c.textAlign = 'center'; c.fillText('GAME', 70, 50); c.fillStyle = '#e8463a'; c.beginPath(); c.arc(70, 120, 40, 0, 7); c.fill(); }) }) });
box3(0.8, 1.1, 0.03, '#2a6a8a', -2.2, 2.3, -3.96, { mat: new THREE.MeshBasicMaterial({ map: texCanvas(160, 220, c => { c.fillStyle = '#102a3a'; c.fillRect(0, 0, 160, 220); c.fillStyle = '#5fe0ff'; for (let i = 0; i < 5; i++) c.fillRect(20, 30 + i * 36, 120 - i * 18, 14); }) }) });
box3(1.2, 0.05, 0.28, '#6a4128', 2.1, 2.2, -3.85); for (let i = 0; i < 6; i++) box3(0.12, 0.34, 0.22, ['#3a8fd6', '#46a35a', '#d64036', '#f2c53d', '#8a5ad6', '#e07a2a'][i], 1.65 + i * 0.17, 2.4, -3.85);
box3(1.0, 2.1, 0.06, '#7a4e30', 1.8, 1.05, 3.96);
const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), toon('#e0c060')); knob.position.set(1.42, 1.0, 3.9); scene.add(knob);
box3(1.4, 0.05, 0.3, '#6a4128', -1.6, 1.8, 3.85); for (let i = 0; i < 5; i++) box3(0.14, 0.4 - i * 0.03, 0.22, ['#d64036', '#f2c53d', '#3a8fd6', '#46a35a', '#8a5ad6'][i], -2.1 + i * 0.22, 2.0, 3.85);
box3(1.0, 0.7, 0.03, '#ffffff', -1.6, 2.6, 3.96, { mat: new THREE.MeshBasicMaterial({ map: texCanvas(200, 140, c => { c.fillStyle = '#f0e8d8'; c.fillRect(0, 0, 200, 140); c.fillStyle = '#c03030'; c.fillRect(0, 0, 200, 30); c.fillStyle = '#333'; for (let r = 0; r < 4; r++) for (let q = 0; q < 7; q++) c.fillRect(12 + q * 26, 42 + r * 24, 18, 14); }) }) });   // calendar
// game controller + soda cans on the floor by the beanbag
box3(0.2, 0.05, 0.12, '#222228', -0.65, 0.03, 0.0); for (let i = 0; i < 2; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.13, 12), toon(['#46e05a', '#e04646'][i])); c.position.set(0.6 + i * 0.12, 0.065, 0.1 - i * 0.1); scene.add(c); }
// lights: dim blue ambience + moonlight from the window + the TV glow (color/intensity set per frame)
scene.add(new THREE.HemisphereLight('#3a4a9a', '#141420', 0.9));
const moonL = new THREE.DirectionalLight('#8fa8ff', 0.6); moonL.position.set(-8, 5, 1); moonL.castShadow = true; Object.assign(moonL.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); scene.add(moonL);
const TVL = new THREE.PointLight('#bfe0ff', 6, 7, 1.4); TVL.position.set(0, 1.15, -2.7); TVL.castShadow = true; scene.add(TVL);
function proj(x, y, z) { const v = new THREE.Vector3(x, y, z).project(cam3); return [(v.x + 1) / 2 * SW, (1 - v.y) / 2 * SH, cam3.position.distanceTo(new THREE.Vector3(x, y, z))]; }
function ppm(d) { return (SH / 2) / (d * Math.tan(cam3.fov * Math.PI / 360)); }
// layer 1 = things that must be drawn OVER the 2D characters in some shots (the beanbag in the back shots), plus the lights so they stay lit
for (const o of scene.children) if (o === BEANBAG || (o.geometry === BEANBAG.geometry) || o.isLight) o.layers.enable(1);
const FILL = new THREE.PointLight('#c8d4ff', 0, 3, 1.5); FILL.layers.enable(1); scene.add(FILL);   // a soft fill light for close-ups (off by default)
