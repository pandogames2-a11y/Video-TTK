// EP13 sets (3D), all in one scene at different spots:
//   FIELD (around x=0): the "batatinha frita" field by day — grass with mowed stripes, white start line (z=0), red finish line (z=-30), high concrete walls, floodlight towers, a dead tree behind the doll (the doll itself is 2D, at z=-40).
//   STREET (x=300): a quiet street by day — road, sidewalk, houses with lit windows, street lamps, and the black van.
//   DORM (x=-300): a big grey hall full of metal bunk beds, ceiling lamps and a big screen on the front wall.
const THREE = window.THREE;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.fog = new THREE.Fog('#cfe4f6', 60, 260);
// daytime sky (screen-space gradient behind everything)
{ const cv = document.createElement('canvas'); cv.width = 8; cv.height = 512; const c = cv.getContext('2d'); const gr = c.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#3f8fe0'); gr.addColorStop(0.55, '#86c0f0'); gr.addColorStop(1, '#d6ecfa'); c.fillStyle = gr; c.fillRect(0, 0, 8, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; scene.background = t; }
const cam3 = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.1, 400);
const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
const inkM = new THREE.MeshBasicMaterial({ color: '#0a0710', side: THREE.BackSide });
function inked(geo, mat, ink = 0.03, parent = scene) { const grp = new THREE.Group(); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; grp.add(m); const k = new THREE.Mesh(geo, inkM); k.scale.setScalar(1 + ink); grp.add(k); parent.add(grp); return grp; }
function box3(w, h, d, col, x, y, z, parent = scene, ink = 0.02) { const b = inked(new THREE.BoxGeometry(w, h, d), toon(col), ink, parent); b.position.set(x, y, z); return b; }
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
let rs = 11; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
const HEMI = new THREE.HemisphereLight('#cfe6ff', '#6a7a50', 1.6); scene.add(HEMI);
const moon = new THREE.DirectionalLight('#fff1d6', 2.6); moon.position.set(-30, 60, 30); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 200 }); scene.add(moon); scene.add(moon.target);
function sunAt(x, z) { moon.position.set(x - 30, 60, z + 30); moon.target.position.set(x, 0, z); moon.target.updateMatrixWorld(); }

// ================= FIELD =================
const FINISH = -30, DOLLZ = -40;
{ const tex = canvasTex(64, 512, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#7cb85a' : '#8cc664'; c.fillRect(0, i * h / 16, w, h / 16); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(30, 64), toon('#ffffff', { map: tex })); gr.rotation.x = -Math.PI / 2; gr.position.set(0, 0, -20); gr.receiveShadow = true; scene.add(gr); }
const lineMesh = (z, col, w = 26, d = 0.35) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.012, z); scene.add(m); return m; };
lineMesh(0, '#f4f2ea');
{ const tex = canvasTex(256, 16, (c) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#f4f2ea' : '#d8262c'; c.fillRect(i * 8, j * 8, 8, 8); } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.7), new THREE.MeshBasicMaterial({ map: tex })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.013, FINISH); scene.add(m); }
// high walls painted like nature on the inside (sky, clouds, hills, trees, flowers): the "box" the players are in; the real sky above them
function muralTex(seed, w = 2048, h = 640) {
  let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  return canvasTex(w, h, (c) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fb2ec'); gr.addColorStop(0.6, '#b4dcf6'); gr.addColorStop(1, '#e6f4fc'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const x = r() * w, y = 60 + r() * 200, k = 0.6 + r() * 0.8; c.fillStyle = '#ffffff'; for (let j = 0; j < 5; j++) { c.beginPath(); c.ellipse(x + (j - 2) * 46 * k, y - (j % 2) * 22 * k, 60 * k, 38 * k, 0, 0, 7); c.fill(); } c.fillStyle = 'rgba(160,190,220,0.35)'; c.fillRect(x - 130 * k, y + 20 * k, 260 * k, 10 * k); }
    const hills = (base, amp, col, n) => { c.fillStyle = col; c.beginPath(); c.moveTo(0, h); for (let x = 0; x <= w; x += 16) c.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(x / w * Math.PI * n + seed))); c.lineTo(w, h); c.closePath(); c.fill(); };
    hills(h * 0.62, 90, '#9cc8a0', 3); hills(h * 0.72, 70, '#6fb36a', 5); hills(h * 0.82, 40, '#4f9a48', 7);
    for (let i = 0; i < 26; i++) { const x = r() * w, y = h * (0.7 + r() * 0.2), k = 0.6 + r() * 0.7; c.fillStyle = '#6a4a2a'; c.fillRect(x - 6 * k, y - 40 * k, 12 * k, 44 * k); c.fillStyle = ['#2f7a34', '#3f8f3a', '#27662e'][i % 3]; c.beginPath(); c.arc(x, y - 60 * k, 36 * k, 0, 7); c.arc(x - 26 * k, y - 44 * k, 26 * k, 0, 7); c.arc(x + 26 * k, y - 44 * k, 26 * k, 0, 7); c.fill(); }
    c.fillStyle = '#58a84e'; c.fillRect(0, h * 0.9, w, h * 0.1);
    for (let i = 0; i < 120; i++) { c.fillStyle = ['#ffe25a', '#ffffff', '#ff7aa8'][i % 3]; c.beginPath(); c.arc(r() * w, h * (0.91 + r() * 0.08), 3 + r() * 3, 0, 7); c.fill(); }
    c.strokeStyle = 'rgba(40,40,60,0.25)'; c.lineWidth = 3; for (let x = 0; x < w; x += w / 8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }   // panel seams
  });
}
const WALLH = 11;
for (const [w, x, z, ry, sd] of [[64, -14, -20, Math.PI / 2, 3], [64, 14, -20, -Math.PI / 2, 7], [30, 0, 10, Math.PI, 11], [30, 0, -50, 0, 5]]) {
  const wall = box3(w, WALLH, 0.6, '#d8d4c8', x, WALLH / 2, z); wall.rotation.y = ry;
  const tx = muralTex(sd, w > 40 ? 4096 : 2048, 700); tx.anisotropy = 4;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, WALLH), new THREE.MeshBasicMaterial({ map: tx })); m.position.set(x, WALLH / 2, z); m.rotation.y = ry; m.translateZ(0.31); scene.add(m);
  const cap = box3(w + 0.6, 0.4, 0.9, '#bfb8a8', x, WALLH + 0.2, z); cap.rotation.y = ry;
}
// real clouds in the open sky above the walls
for (let i = 0; i < 16; i++) { const grp = new THREE.Group(); const k = 3 + rnd() * 4; for (let j = 0; j < 5; j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(k * (0.6 + rnd() * 0.5), 16, 10), new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#c8d8ee', emissiveIntensity: 0.5 })); s.position.set((j - 2) * k * 0.8, (j % 2) * k * 0.3, rnd() * k * 0.5); grp.add(s); }
  grp.position.set((rnd() - 0.5) * 180, 45 + rnd() * 30, -20 + (rnd() - 0.5) * 200); grp.scale.y = 0.55; scene.add(grp); }
const FLOOD = [];
// the doll's eye scanner: a light that sweeps the field while she is facing it
const scanL = new THREE.SpotLight('#ff4a3a', 0, 70, 0.22, 0.4, 1.0); scanL.position.set(0, 12, DOLLZ); scene.add(scanL); scene.add(scanL.target);
function scan(on, x = 0, z = -5, col = '#ff6a4a') { scanL.intensity = 18 * on; scanL.color.set(col); scanL.target.position.set(x, 0, z); }

// ================= STREET (x = 300) =================
const SX = 300;
{ const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 120), toon('#2a2c34')); road.rotation.x = -Math.PI / 2; road.position.set(SX, 0, -30); road.receiveShadow = true; scene.add(road);
  for (let z = 20; z > -90; z -= 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.6), new THREE.MeshBasicMaterial({ color: '#d8c45a' })); d.rotation.x = -Math.PI / 2; d.position.set(SX, 0.01, z); scene.add(d); }
  for (const sx of [-1, 1]) { const sw = box3(3, 0.2, 120, '#6a6e78', SX + sx * 6, 0.1, -30, scene, 0.0); const grass = new THREE.Mesh(new THREE.PlaneGeometry(20, 120), toon('#2e4a2a')); grass.rotation.x = -Math.PI / 2; grass.position.set(SX + sx * 17.5, 0.005, -30); scene.add(grass); }
  for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) {   // houses: box + roof + lit windows
    const z = 14 - i * 12 + (sx > 0 ? 5 : 0), x = SX + sx * 13, col = ['#8a6e5a', '#6e7a8a', '#9a8a6a', '#7a5e6a'][(i + (sx > 0 ? 1 : 0)) % 4];
    const h = box3(8, 5, 8, col, x, 2.5, z);
    const roof = inked(new THREE.ConeGeometry(6.4, 2.6, 4), toon('#3a2a2a'), 0.03); roof.position.set(x, 6.3, z); roof.rotation.y = Math.PI / 4;
    for (const wz of [-2, 2]) { const lit = rnd() > 0.35; const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: lit ? '#a8cce4' : '#7fa6c4' })); win.position.set(x - sx * 4.01, 2.6, z + wz); win.rotation.y = -sx * Math.PI / 2; scene.add(win); }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), toon('#4a2e22')); door.position.set(x - sx * 4.01, 1.05, z); door.rotation.y = -sx * Math.PI / 2; scene.add(door);
  }
  for (let i = 0; i < 6; i++) { const z = 10 - i * 18, x = SX + 4.6; box3(0.16, 6, 0.16, '#2a2f3a', x, 3, z, scene, 0.0); box3(1.4, 0.12, 0.16, '#2a2f3a', x - 0.6, 6, z, scene, 0.0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe6a8' })); bulb.position.set(x - 1.2, 5.85, z); scene.add(bulb);
    }
}
// the black van: body + cab + windows + wheels; a sliding side door (VAN.door.position.z moves)
const VAN = new THREE.Group(); scene.add(VAN);
{ box3(2.1, 1.9, 5.0, '#16181e', 0, 1.35, 0, VAN); box3(2.0, 0.9, 1.3, '#16181e', 0, 0.85, 2.9, VAN);
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), new THREE.MeshBasicMaterial({ color: '#2a3550' })); ws.position.set(0, 1.85, 2.52); ws.rotation.x = -0.35; VAN.add(ws);
  for (const sx of [-1, 1]) { const sw = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.7), new THREE.MeshBasicMaterial({ color: '#232c44' })); sw.position.set(sx * 1.06, 1.85, 1.6); sw.rotation.y = sx * Math.PI / 2; VAN.add(sw); }
  for (const [sx, z] of [[-1, 1.9], [1, 1.9], [-1, -1.7], [1, -1.7]]) { const w = inked(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), toon('#0c0c10'), 0.03, VAN); w.rotation.z = Math.PI / 2; w.position.set(sx * 1.02, 0.42, z); }
  for (const sx of [-1, 1]) { const hl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: '#fff4c8' })); hl.position.set(sx * 0.7, 0.95, 3.56); VAN.add(hl); }
  VAN.door = box3(0.06, 1.6, 1.6, '#0f1014', -1.08, 1.3, 0.6, VAN, 0.0);
  VAN.dark = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.55), new THREE.MeshBasicMaterial({ color: '#000000' })); VAN.dark.position.set(-1.051, 1.3, 0.6); VAN.dark.rotation.y = -Math.PI / 2; VAN.add(VAN.dark);
}
const vanL = new THREE.SpotLight('#fff4c8', 0, 30, 0.5, 0.5, 1.2); scene.add(vanL); scene.add(vanL.target);
function vanAt(x, z, doorOpen = 0, lights = 1) { VAN.position.set(x, 0, z); VAN.rotation.y = Math.PI; VAN.door.position.z = 0.6 + doorOpen * 1.6; VAN.dark.visible = doorOpen > 0.05;
  vanL.position.set(x, 1, z - 3.6); vanL.target.position.set(x, 0, z - 14); vanL.intensity = 80 * lights; }
vanAt(SX - 2, 80);

// ================= DORM (x = -300) =================
const DX = -300;
{ const fl = new THREE.Mesh(new THREE.PlaneGeometry(30, 40), toon('#4a4f58')); fl.rotation.x = -Math.PI / 2; fl.position.set(DX, 0, -10); fl.receiveShadow = true; scene.add(fl);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 40), toon('#2a2e38')); ceil.rotation.x = Math.PI / 2; ceil.position.set(DX, 9, -10); scene.add(ceil);
  for (const [w, x, z, ry] of [[40, DX - 15, -10, Math.PI / 2], [40, DX + 15, -10, -Math.PI / 2], [30, DX, 10, Math.PI], [30, DX, -30, 0]]) { const wl = box3(w, 9, 0.4, '#4a5a66', x, 4.5, z); wl.rotation.y = ry; const b = box3(w + 0.02, 1.4, 0.44, '#465458', x, 0.7, z, scene, 0.0); b.rotation.y = ry; }
  // bunk beds in rows (metal frame + 2 mattresses + pillows)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    const x = DX - 10 + c * 5, z = 4 - r * 7.5;
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box3(0.1, 3.4, 0.1, '#8a96a2', x + px * 0.95, 1.7, z + pz * 1.0, scene, 0.0);
    for (const y of [0.4, 2.1]) { box3(2.0, 0.12, 2.1, '#7a8894', x, y, z, scene, 0.0); box3(1.9, 0.26, 2.0, '#b8b4a8', x, y + 0.19, z, scene, 0.02); box3(0.6, 0.18, 1.6, '#d0ccc0', x - 0.6, y + 0.4, z, scene, 0.02);
      box3(1.2, 0.08, 1.98, '#5a7ab8', x + 0.3, y + 0.35, z, scene, 0.0); }   // blue blanket
  }
  for (let i = 0; i < 4; i++) { const lp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.6), new THREE.MeshBasicMaterial({ color: '#f4f4e8' })); lp.position.set(DX, 8.9, 2 - i * 8); scene.add(lp);
    const pl = new THREE.PointLight('#e8eeff', 45, 18, 1.3); pl.position.set(DX, 8.2, 2 - i * 8); scene.add(pl); }
}
// the big screen on the front wall (its picture is a canvas redrawn each frame: screenDraw(mode, t))
const SCREEN_CV = document.createElement('canvas'); SCREEN_CV.width = 1024; SCREEN_CV.height = 576;
const SCREEN_TEX = new THREE.CanvasTexture(SCREEN_CV); SCREEN_TEX.colorSpace = THREE.SRGBColorSpace;
{ box3(10.6, 6.2, 0.3, '#14161c', DX, 5.2, -29.6); const scr = new THREE.Mesh(new THREE.PlaneGeometry(10, 5.625), new THREE.MeshBasicMaterial({ map: SCREEN_TEX })); scr.position.set(DX, 5.2, -29.43); scene.add(scr); }
const scrL = new THREE.PointLight('#9fd0ff', 0, 22, 1.2); scrL.position.set(DX, 5, -26); scene.add(scrL);

scene.traverse(o => { if (o.isLight) o.layers.enable(1); });   // lights also light the van-only pass
function proj(x, y, z) { const v = new THREE.Vector3(x, y, z).project(cam3); return [(v.x + 1) / 2 * SW, (1 - v.y) / 2 * SH, cam3.position.distanceTo(new THREE.Vector3(x, y, z))]; }
function ppm(d) { return (SH / 2) / (d * Math.tan(cam3.fov * Math.PI / 360)); }
