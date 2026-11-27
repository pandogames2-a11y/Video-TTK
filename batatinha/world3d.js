// EP13 sets (3D), all in one scene at different spots:
//   FIELD (around x=0): the "batatinha frita" field at night — grass with mowed stripes, white start line (z=0), red finish line (z=-30), high concrete walls, floodlight towers, a dead tree behind the doll (the doll itself is 2D, at z=-40).
//   STREET (x=300): a quiet street at night — road, sidewalk, houses with lit windows, street lamps, and the black van.
//   DORM (x=-300): a big grey hall full of metal bunk beds, ceiling lamps and a big screen on the front wall.
const THREE = window.THREE;
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1080, 1920, false); renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color('#070b20'); scene.fog = new THREE.FogExp2('#0e1530', 0.012);
const cam3 = new THREE.PerspectiveCamera(42, 1080 / 1920, 0.1, 400);
const grad = new THREE.DataTexture(new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]), 3, 1); grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
const toon = (c, o = {}) => new THREE.MeshToonMaterial({ color: c, gradientMap: grad, ...o });
const inkM = new THREE.MeshBasicMaterial({ color: '#0a0710', side: THREE.BackSide });
function inked(geo, mat, ink = 0.03, parent = scene) { const grp = new THREE.Group(); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = true; grp.add(m); const k = new THREE.Mesh(geo, inkM); k.scale.setScalar(1 + ink); grp.add(k); parent.add(grp); return grp; }
function box3(w, h, d, col, x, y, z, parent = scene, ink = 0.02) { const b = inked(new THREE.BoxGeometry(w, h, d), toon(col), ink, parent); b.position.set(x, y, z); return b; }
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; }
let rs = 11; const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
const HEMI = new THREE.HemisphereLight('#4a5aa8', '#1a1a22', 1.0); scene.add(HEMI);
const moon = new THREE.DirectionalLight('#9fb4ff', 0.7); moon.position.set(-30, 60, 30); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048);
Object.assign(moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, far: 200 }); scene.add(moon); scene.add(moon.target);

// ================= FIELD =================
const FINISH = -30, DOLLZ = -40;
{ const tex = canvasTex(64, 512, (c, w, h) => { for (let i = 0; i < 16; i++) { c.fillStyle = i % 2 ? '#2c5a2a' : '#326430'; c.fillRect(0, i * h / 16, w, h / 16); } });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(30, 64), toon('#ffffff', { map: tex })); gr.rotation.x = -Math.PI / 2; gr.position.set(0, 0, -20); gr.receiveShadow = true; scene.add(gr); }
const lineMesh = (z, col, w = 26, d = 0.35) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.012, z); scene.add(m); return m; };
lineMesh(0, '#f4f2ea');
{ const tex = canvasTex(256, 16, (c) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#f4f2ea' : '#d8262c'; c.fillRect(i * 8, j * 8, 8, 8); } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.7), new THREE.MeshBasicMaterial({ map: tex })); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.013, FINISH); scene.add(m); }
// walls (concrete, with a darker band) around the field
for (const [w, x, z, ry] of [[64, -14, -20, Math.PI / 2], [64, 14, -20, -Math.PI / 2], [30, 0, 10, Math.PI], [30, 0, -50, 0]]) {
  const wall = box3(w, 9, 0.6, '#5a6478', x, 4.5, z); wall.rotation.y = ry;
  const band = box3(w + 0.02, 1.2, 0.64, '#3a4256', x, 0.6, z, scene, 0.0); band.rotation.y = ry;
}
// floodlight towers
const FLOOD = [];
for (const [x, z] of [[-12.5, -6], [12.5, -6], [-12.5, -36], [12.5, -36]]) {
  box3(0.35, 12, 0.35, '#2a2f3a', x, 6, z);
  const head = box3(1.8, 0.9, 0.5, '#2a2f3a', x - Math.sign(x) * 0.3, 12.2, z); head.lookAt(0, 0, z + (z > -20 ? -10 : 6));
  const lamp = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ color: '#fff6dc' })); lamp.position.copy(head.position); lamp.lookAt(0, 0, z + (z > -20 ? -10 : 6)); lamp.translateZ(0.27); scene.add(lamp);
  const sp = new THREE.SpotLight('#fff0d0', 70, 60, 0.75, 0.6, 1.3); sp.position.set(x, 12, z); sp.target.position.set(-x * 0.2, 0, z + (z > -20 ? -12 : 8)); sp.castShadow = false; scene.add(sp); scene.add(sp.target); FLOOD.push(sp);
}
// the dead tree behind the doll
{ const trunk = inked(new THREE.CylinderGeometry(0.5, 0.8, 9, 10), toon('#3a2e26'), 0.04); trunk.position.set(4.5, 4.5, -46);
  for (let i = 0; i < 6; i++) { const br = inked(new THREE.CylinderGeometry(0.08, 0.22, 4, 6), toon('#3a2e26'), 0.05); br.position.set(4.5 + (rnd() - 0.5) * 2, 6.5 + rnd() * 2.5, -46); br.rotation.z = (rnd() - 0.5) * 2.4; br.rotation.x = (rnd() - 0.5) * 0.6; } }
// the doll's eye scanner: a light that sweeps the field while she is facing it
const scanL = new THREE.SpotLight('#ffe9a8', 0, 70, 0.22, 0.4, 1.0); scanL.position.set(0, 12, DOLLZ); scene.add(scanL); scene.add(scanL.target);
function scan(on, x = 0, z = -5, col = '#ffe9a8') { scanL.intensity = 160 * on; scanL.color.set(col); scanL.target.position.set(x, 0, z); }

// ================= STREET (x = 300) =================
const SX = 300;
{ const road = new THREE.Mesh(new THREE.PlaneGeometry(9, 120), toon('#2a2c34')); road.rotation.x = -Math.PI / 2; road.position.set(SX, 0, -30); road.receiveShadow = true; scene.add(road);
  for (let z = 20; z > -90; z -= 6) { const d = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 2.6), new THREE.MeshBasicMaterial({ color: '#d8c45a' })); d.rotation.x = -Math.PI / 2; d.position.set(SX, 0.01, z); scene.add(d); }
  for (const sx of [-1, 1]) { const sw = box3(3, 0.2, 120, '#6a6e78', SX + sx * 6, 0.1, -30, scene, 0.0); const grass = new THREE.Mesh(new THREE.PlaneGeometry(20, 120), toon('#2e4a2a')); grass.rotation.x = -Math.PI / 2; grass.position.set(SX + sx * 17.5, 0.005, -30); scene.add(grass); }
  for (let i = 0; i < 9; i++) for (const sx of [-1, 1]) {   // houses: box + roof + lit windows
    const z = 14 - i * 12 + (sx > 0 ? 5 : 0), x = SX + sx * 13, col = ['#8a6e5a', '#6e7a8a', '#9a8a6a', '#7a5e6a'][(i + (sx > 0 ? 1 : 0)) % 4];
    const h = box3(8, 5, 8, col, x, 2.5, z);
    const roof = inked(new THREE.ConeGeometry(6.4, 2.6, 4), toon('#3a2a2a'), 0.03); roof.position.set(x, 6.3, z); roof.rotation.y = Math.PI / 4;
    for (const wz of [-2, 2]) { const lit = rnd() > 0.35; const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.2), new THREE.MeshBasicMaterial({ color: lit ? '#ffd88a' : '#1e2436' })); win.position.set(x - sx * 4.01, 2.6, z + wz); win.rotation.y = -sx * Math.PI / 2; scene.add(win); }
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.1), toon('#4a2e22')); door.position.set(x - sx * 4.01, 1.05, z); door.rotation.y = -sx * Math.PI / 2; scene.add(door);
  }
  for (let i = 0; i < 6; i++) { const z = 10 - i * 18, x = SX + 4.6; box3(0.16, 6, 0.16, '#2a2f3a', x, 3, z, scene, 0.0); box3(1.4, 0.12, 0.16, '#2a2f3a', x - 0.6, 6, z, scene, 0.0);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffe6a8' })); bulb.position.set(x - 1.2, 5.85, z); scene.add(bulb);
    const pl = new THREE.PointLight('#ffd48a', 110, 20, 1.4); pl.position.set(x - 1.2, 5.6, z); scene.add(pl); }
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
    for (const y of [0.55, 2.25]) { box3(2.0, 0.12, 2.1, '#7a8894', x, y, z, scene, 0.0); box3(1.9, 0.26, 2.0, '#b8b4a8', x, y + 0.19, z, scene, 0.02); box3(0.6, 0.18, 1.6, '#d0ccc0', x - 0.6, y + 0.4, z, scene, 0.02);
      box3(1.2, 0.08, 1.98, '#5a7ab8', x + 0.3, y + 0.35, z, scene, 0.0); }   // blue blanket
  }
  for (let i = 0; i < 4; i++) { const lp = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.6), new THREE.MeshBasicMaterial({ color: '#f4f4e8' })); lp.position.set(DX, 8.9, 2 - i * 8); scene.add(lp);
    const pl = new THREE.PointLight('#b8c8ff', 22, 16, 1.5); pl.position.set(DX, 8.2, 2 - i * 8); scene.add(pl); }
}
// the big screen on the front wall (its picture is a canvas redrawn each frame: screenDraw(mode, t))
const SCREEN_CV = document.createElement('canvas'); SCREEN_CV.width = 1024; SCREEN_CV.height = 576;
const SCREEN_TEX = new THREE.CanvasTexture(SCREEN_CV); SCREEN_TEX.colorSpace = THREE.SRGBColorSpace;
{ box3(10.6, 6.2, 0.3, '#14161c', DX, 5.2, -29.6); const scr = new THREE.Mesh(new THREE.PlaneGeometry(10, 5.625), new THREE.MeshBasicMaterial({ map: SCREEN_TEX })); scr.position.set(DX, 5.2, -29.43); scene.add(scr); }
const scrL = new THREE.PointLight('#9fd0ff', 0, 22, 1.2); scrL.position.set(DX, 5, -26); scene.add(scrL);

scene.traverse(o => { if (o.isLight) o.layers.enable(1); });   // lights also light the van-only pass
function proj(x, y, z) { const v = new THREE.Vector3(x, y, z).project(cam3); return [(v.x + 1) / 2 * SW, (1 - v.y) / 2 * SH, cam3.position.distanceTo(new THREE.Vector3(x, y, z))]; }
function ppm(d) { return (SH / 2) / (d * Math.tan(cam3.fov * Math.PI / 360)); }
