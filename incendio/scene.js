import * as THREE from 'three';

const W = 1280, H = 720;   // overlay design size (16:9)
const VERT = new URLSearchParams(location.search).has('vertical');   // native 9:16 for TikTok
const SW = VERT ? 720 : 1280, SH = VERT ? 1280 : 720;
const UIK = VERT ? 0.75 : 1, UIOX = VERT ? (SW - 1280 * 0.75) / 2 : 0, UIOY = VERT ? 210 : 0;
const UIL = VERT ? 172 : 0, UIR = 1280 - UIL;   // visible design x range on the vertical screen   // where the 16:9 overlay design sits on the vertical screen
for (const id of ['gl', 'ui']) { const c = document.getElementById(id); c.width = SW; c.height = SH; }
{ const w = document.getElementById('wrap'); if (w) { w.style.width = SW + 'px'; w.style.height = SH + 'px'; } }
const TL = await (await fetch('/timeline.json')).json();
const S = {}; TL.segs.forEach(s => S[s.scene] = s);

// ---------- helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ss = (a, b, x) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, t) => a + (b - a) * t;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const vl = (a, b, t) => a.clone().lerp(b, t);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const R = rnd(7);

// ---------- renderer ----------
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(SW, SH, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, SW / SH, 0.1, 1200);

// sky dome
const skyU = { top: { value: new THREE.Color(0x2f7fd8) }, bot: { value: new THREE.Color(0xbfe6ff) }, sunDir: { value: V(0.5, 0.45, -0.75).normalize() }, sunCol: { value: new THREE.Color(0xfff2c0) } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, uniforms: skyU,
  vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform vec3 top,bot,sunDir,sunCol; varying vec3 vP;
   void main(){ float h = clamp(vP.y*1.6,0.,1.); vec3 c = mix(bot, top, pow(h,0.7));
   float s = max(dot(vP, sunDir),0.); c += sunCol*pow(s,600.)*3. + sunCol*pow(s,8.)*0.35;
   gl_FragColor = vec4(c,1.); }`
}));
scene.add(sky);
scene.fog = new THREE.Fog(0xbfe6ff, 110, 460);

const hemi = new THREE.HemisphereLight(0xcfeaff, 0xd9b98a, 0.9); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 250;
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
scene.add(sun); scene.add(sun.target);

// ---------- terrain: a flat city block with a small park and a channelled stream ----------
const HILL = { x: -300, z: 300 };
const ROAD = { x: 22, z: 17.6, half: 95, y: 1.056 };
const CANAL = { z: 6, half: 2.2, bottom: -0.6 };
const ROAD2 = { z: -1.6 };                                 // street on the far side of the stream
function terrainH(x, z) {
  const c = Math.abs(z - CANAL.z);
  if (c < CANAL.half) return CANAL.bottom;
  if (c < CANAL.half + 0.6) return lerp(CANAL.bottom, ROAD.y, ss(CANAL.half, CANAL.half + 0.6, c));
  return ROAD.y;
}
{
  const g = new THREE.PlaneGeometry(310, 255, 210, 200); g.rotateX(-Math.PI / 2); g.translate(15, 0, -2.5);   // stays clear of the indoor sets at z=150
  const p = g.attributes.position, col = [];
  const walk = new THREE.Color(0xb7b0a4), walk2 = new THREE.Color(0xa59e93), grass = new THREE.Color(0x5f9a3c), grass2 = new THREE.Color(0x6fa846), conc = new THREE.Color(0x8c8780), asph = new THREE.Color(0x56595d);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrainH(x, z); p.setY(i, h);
    let c;
    const cz = Math.abs(z - CANAL.z);
    if (cz < CANAL.half + 0.7) c = conc.clone();
    else if (z > CANAL.z + 3.2 && z < ROAD.z - 2.6 && x > -45 && x < 75) c = (R() > 0.5 ? grass : grass2).clone();      // the park
    else if (Math.abs(z - ROAD2.z) < 1.6) c = asph.clone();
    else c = ((Math.floor(x / 1.5) + Math.floor(z / 1.5)) % 2 ? walk : walk2).clone();                                 // paving stones
    c.offsetHSL(0, 0, (R() - 0.5) * 0.03);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  m.receiveShadow = true; scene.add(m);
}

// ---------- water ----------
const WX = 120, WZ0 = -235, WZ1 = 70;
const wg = new THREE.PlaneGeometry(WX * 2, WZ1 - WZ0, 110, 380); wg.rotateX(-Math.PI / 2); wg.translate(0, 0, (WZ0 + WZ1) / 2);
const wp = wg.attributes.position; const wN = wp.count;
const wTer = new Float32Array(wN), wcol = new Float32Array(wN * 3);
for (let i = 0; i < wN; i++) wTer[i] = terrainH(wp.getX(i), wp.getZ(i));
wg.setAttribute('color', new THREE.BufferAttribute(wcol, 3));
const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.93 }));
water.receiveShadow = true; scene.add(water);
const cDeep = new THREE.Color(0x0b4f8a), cMid = new THREE.Color(0x1a8fb5), cShal = new THREE.Color(0x4fd6d0), cFoam = new THREE.Color(0xf4fbff), cMud = new THREE.Color(0x5f7f78);

// world state (all functions take WORLD time) -------------------
let GAG = false, REAL_T = 0;
const HAS = n => !!S[n];
function T0(n) { return S[n] ? S[n].start : 0; } function TE(n) { return S[n] ? S[n].start + S[n].dur : 0; }
function seaBase(t) { return 0; }
const HIT = 1e9;
function front(t) { return -400; }
const waveForm = t => 0;
function flood(t) { return 0; }
const backflow = t => 0;
function secondFront(t) { return -400; }
function surferAt(t) { return { x: 0, z: -10, on: false }; }
const swellOf = (x, z, t) => Math.sin(0.22 * z - 1.0 * t + 0.08 * x);
function waterH(x, z, t) {
  let h = 0.07 * Math.sin(0.45 * x + 1.2 * t) + 0.06 * Math.sin(0.6 * z - 1.6 * t + x * 0.2) + 0.035 * Math.sin(1.7 * x + 2.3 * z + 2.9 * t);
  const off = ss(-6, -40, z);
  h += off * (0.2 * swellOf(x, z, t) + 0.09 * Math.sin(0.31 * x + 0.17 * z - 1.3 * t) + 0.05 * Math.sin(0.9 * x - 0.5 * z + 2.1 * t));
  h += 0.14 * Math.max(0, Math.sin(z * 0.9 + t * 2.2)) * ss(-12, -2, z) * ss(2, -1, z);
  return h;
}
const muddy = t => 0.45;
function updateWater(t) {
  const zf = front(t), mud = muddy(t), z2 = secondFront(t), sfo = surferAt(t);
  const tmp = new THREE.Color(), face = new THREE.Color(0x14806f);
  for (let i = 0; i < wN; i++) {
    const x = wp.getX(i), z = wp.getZ(i);
    let h = waterH(x, z, t);
    const depth = h - wTer[i];
    if (depth < 0) h = wTer[i] - 0.3;
    wp.setY(i, h);
    tmp.copy(cShal).lerp(cMid, ss(0.5, 3, depth)).lerp(cDeep, ss(3, 14, depth));
    tmp.lerp(cMud, mud * 0.7);
    let foam = ss(0.35, 0.0, depth);
    if (zf > -300) {
      if (z > zf - 2.5 && z < zf + 1) tmp.lerp(face, 0.5);
      foam = Math.max(foam, Math.exp(-Math.pow((z - (zf - 3.6)) / 1.3, 2)) * 0.95, 0.5 * ss(zf - 14, zf - 5, z) * ss(zf - 2, zf - 5, z));
    }
    if (z2 > -300) foam = Math.max(foam, 0.8 * Math.exp(-Math.pow((z - z2 - 1.5) / 1.5, 2)));
    if (zf < -300 || GAG) foam = Math.max(foam, 0.32 * ss(0.9, 1.0, swellOf(x, z, t)) * ss(-8, -30, z));
    if (sfo.on) foam = Math.max(foam, 0.85 * Math.exp(-Math.pow((z - sfo.z - 0.2) / 0.8, 2)) * Math.exp(-Math.pow((x - sfo.x - 3) / 3.5, 2)));
    tmp.lerp(cFoam, clamp(foam));
    wcol[i * 3] = tmp.r; wcol[i * 3 + 1] = tmp.g; wcol[i * 3 + 2] = tmp.b;
  }
  wp.needsUpdate = true; wg.attributes.color.needsUpdate = true; wg.computeVertexNormals();
}

// ---------- textures ----------
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
const stripeTex = (a, b, n) => canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * w / n, 0, w / n + 1, h); } });

// ---------- props ----------
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.6 }, o));
function shadowAll(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }
function place(o, x, z, dy = 0) { o.position.set(x, terrainH(x, z) + dy, z); scene.add(o); return o; }

function palm(h, lean) {
  const g = new THREE.Group(); const trunkM = std(0x8a6a45, { roughness: 0.9 });
  let p = V(0, 0, 0); const segs = 9;
  const pts = [];
  for (let i = 0; i <= segs; i++) { const u = i / segs; pts.push(V(Math.sin(u * 1.4) * lean, u * h, 0)); }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[i + 1]; const len = a.distanceTo(b);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22 - i * 0.012, 0.26 - i * 0.012, len * 1.05, 8), trunkM);
    m.position.copy(a).lerp(b, 0.5); m.lookAt(b); m.rotateX(Math.PI / 2); g.add(m);
  }
  const top = new THREE.Group(); top.position.copy(pts[segs]); g.add(top);
  const leafM = std(0x3f8f2f, { side: THREE.DoubleSide, roughness: 0.7 });
  for (let i = 0; i < 8; i++) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(1.6, 0.6, 3.4, 0); shape.quadraticCurveTo(1.6, -0.6, 0, 0);
    const lg = new THREE.ShapeGeometry(shape, 8);
    const pa = lg.attributes.position; for (let k = 0; k < pa.count; k++) { const x = pa.getX(k); pa.setZ(k, -0.12 * x * x); }
    lg.computeVertexNormals();
    const leaf = new THREE.Mesh(lg, leafM); leaf.rotation.order = 'YXZ'; leaf.rotation.y = i / 8 * Math.PI * 2 + 0.3; leaf.rotation.x = -Math.PI / 2 + 0.25;
    const holder = new THREE.Group(); holder.add(leaf); top.add(holder);
  }
  for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), std(0x5a3d1f)); c.position.set(Math.cos(i * 2.1) * 0.25, -0.15, Math.sin(i * 2.1) * 0.25); top.add(c); }
  g.userData.top = top;
  return shadowAll(g);
}
const palms = [];
[[-6, 9, 7, 1.4], [9, 11, 8, -1.6], [-16, 16, 7.5, 1.0], [22, 14, 6.5, -1.0], [-2, 21.5, 8.5, 0.6], [30, 23, 7, 1.2], [-40, 18, 7, -1.2], [14, 33, 6, 0.8], [-12, 40, 7, 0.5], [40, 34, 8, -0.8]].forEach(([x, z, h, l]) => {
  const p = palm(h, l); p.rotation.y = R() * 6; place(p, x, z, -0.1); p.userData.ph = R() * 6; p.visible = false; palms.push(p);
});

// umbrella + towel + cooler
const umbrella = new THREE.Group();
{
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6, 8), std(0xeeeeee)); pole.position.y = 1.3; umbrella.add(pole);
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.8, 0.6, 16, 1, true), std(0xffffff, { map: stripeTex('#e8443a', '#fff7e6', 16), side: THREE.DoubleSide, roughness: 0.8 }));
  canopy.position.y = 2.55; umbrella.add(canopy);
  shadowAll(umbrella); place(umbrella, 1.5, 5.5); umbrella.rotation.z = 0.1;
}
const towel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), std(0xffffff, { map: canvasTex(128, 256, (g, w, h) => { const cs = ['#2b9fd9', '#ffd23f', '#2b9fd9', '#ffffff']; for (let i = 0; i < 8; i++) { g.fillStyle = cs[i % 4]; g.fillRect(0, i * h / 8, w, h / 8 + 1); } }), roughness: 0.9 }));
towel.rotation.x = -Math.PI / 2; towel.rotation.z = 0.3; towel.receiveShadow = true; place(towel, 2.6, 6.2, 0.02);
const cooler = shadowAll(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), std(0x2e7dd1))); place(cooler, 3.9, 4.6, 0.22); cooler.rotation.y = 0.4;
const ball = shadowAll(new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), std(0xffffff, { map: stripeTex('#ff4d4d', '#ffffff', 6) }))); place(ball, 6, 3, 0.3);
const lounger = new THREE.Group();
{
  const frameM = std(0xf2f2f2, { roughness: 0.4, metalness: 0.2 });
  const fabric = std(0xffffff, { map: canvasTex(128, 256, (g, w, h) => { const cs = ['#2b9fd9', '#ffd23f', '#2b9fd9', '#ffffff']; for (let i = 0; i < 8; i++) { g.fillStyle = cs[i % 4]; g.fillRect(0, i * h / 8, w, h / 8 + 1); } }), roughness: 0.85 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 1.55), fabric); seat.position.set(0, 0.32, 0.42); lounger.add(seat);
  const back = new THREE.Group(); back.position.set(0, 0.32, -0.36); back.rotation.x = -0.95; lounger.add(back);
  const bk = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.95), fabric); bk.position.set(0, 0, -0.47); back.add(bk);
  for (const sx of [-0.38, 0.38]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 1.6), frameM); rail.position.set(sx, 0.29, 0.42); lounger.add(rail);
    for (const z of [-0.3, 1.15]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), frameM); leg.position.set(sx, 0.15, z); lounger.add(leg); }
  }
  shadowAll(lounger); place(lounger, 2.6, 6.4); lounger.rotation.y = Math.PI - 0.35;
}
const floaters = [umbrella, cooler, ball, lounger]; floaters.forEach(o => o.userData.home = o.position.clone());

// evacuation sign
const signTex = canvasTex(512, 384, (g, w, h) => {
  g.fillStyle = '#1557b0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 14; g.strokeRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#fff'; g.font = '900 64px "Inter Display"'; g.textAlign = 'center'; g.fillText('ROTA DE FUGA', w / 2, 100);
  g.font = '700 40px "Inter Display"'; g.fillText('TSUNAMI', w / 2, 160);
  // wave icon (mirrored so the arrow points left, toward the hill)
  g.save(); g.translate(w, 0); g.scale(-1, 1);
  g.beginPath(); g.moveTo(60, 300); g.quadraticCurveTo(110, 200, 190, 230); g.quadraticCurveTo(140, 240, 150, 300); g.closePath(); g.fill();
  // arrow
  g.beginPath(); g.moveTo(230, 250); g.lineTo(380, 250); g.lineTo(380, 210); g.lineTo(460, 280); g.lineTo(380, 350); g.lineTo(380, 310); g.lineTo(230, 310); g.closePath(); g.fill();
  g.restore();
});
const sign = new THREE.Group();
{
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 8), std(0x999999, { metalness: 0.6, roughness: 0.4 })); post.position.y = 1.3; sign.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.05), [std(0x1557b0), std(0x1557b0), std(0x1557b0), std(0x1557b0), std(0xffffff, { map: signTex }), std(0xcccccc)]);
  board.position.y = 2.6; sign.add(board); shadowAll(sign);
  place(sign, -6, 13.5); sign.rotation.y = Math.PI - 0.45;
}

// building (square to the street)
const BROT = 0;
const building = new THREE.Group();
{
  const bw = 9, bh = 13, bd = 8;
  const wt = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#f2e3c6'; g.fillRect(0, 0, w, h);
    for (let f = 0; f < 4; f++) for (let k = 0; k < 4; k++) {
      const x = 30 + k * 120, y = 30 + f * 125; g.fillStyle = '#5f8fb3'; g.fillRect(x, y, 80, 70); g.fillStyle = '#d9c7a6'; g.fillRect(x - 6, y + 70, 92, 12);
    }
    g.fillStyle = '#c98a5a'; for (let f = 1; f < 4; f++) g.fillRect(0, f * 125 + 8, w, 6);
  });
  const sideM = std(0xffffff, { map: wt, roughness: 0.85 }), roofTop = std(0xb8ad9c, { roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), [sideM, sideM, roofTop, roofTop, sideM, sideM]); body.position.y = bh / 2; building.add(body);
  const roofM = std(0xb0a090);
  const parapets = [[0, bd / 2, bw, 0.3], [0, -bd / 2, bw, 0.3], [bw / 2, 0, 0.3, bd], [-bw / 2, 0, 0.3, bd]];
  parapets.forEach(([x, z, sx, sz]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.7, sz), roofM); m.position.set(x, bh + 0.35, z); building.add(m); });
  const hinge = new THREE.Group(); hinge.position.set(-0.8, 0, -bd / 2 - 0.06); building.add(hinge); building.userData.hinge = hinge;
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), std(0x6b4425)); door.position.set(0.8, 1.2, 0); hinge.add(door);
  const doorway = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.4), new THREE.MeshBasicMaterial({ color: 0x1a140f })); doorway.position.set(0, 1.2, -bd / 2 - 0.015); doorway.rotation.y = Math.PI; building.add(doorway);
  const stoop = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.0), std(0x9a9288)); stoop.position.set(0, 0.095, -bd / 2 - 0.5); building.add(stoop);
  const step2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.5), std(0x8f877d)); step2.position.set(0, -0.08, -bd / 2 - 1.25); building.add(step2);
  const stairs = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), std(0x888888)); stairs.position.set(-2.5, bh + 0.15, 0); building.add(stairs);
  shadowAll(building); place(building, 17, 25, -0.3); building.rotation.y = BROT;
}
const BTOP = building.position.y + 13;

// bushes and rocks on hill
for (let i = 0; i < 26; i++) {
  const a = R() * Math.PI * 2, r = 5 + R() * 13, x = HILL.x + Math.cos(a) * r, z = HILL.z + Math.sin(a) * r;
  const b = shadowAll(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + R() * 0.9, 1), std(R() > 0.5 ? 0x3e7d2b : 0x5a9a35, { flatShading: true })));
  place(b, x, z, 0.2);
}
// clouds
const clouds = new THREE.Group(); scene.add(clouds);
for (let i = 0; i < 12; i++) {
  const c = new THREE.Group();
  for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(4 + R() * 4, 12, 8), std(0xffffff, { roughness: 1, emissive: 0x8899aa, emissiveIntensity: 0.25 })); m.position.set(k * 5 - 10, R() * 2, R() * 3); m.scale.y = 0.6; c.add(m); }
  c.position.set(-200 + i * 38 + R() * 20, 45 + R() * 30, -160 - R() * 120); clouds.add(c);
}

// fish
const fishes = [];
for (let i = 0; i < 9; i++) {
  const f = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), std([0xff8a2a, 0xffd23f, 0x5ab4ff][i % 3], { roughness: 0.3 })); b.scale.set(1.4, 0.8, 0.5); f.add(b);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.25, 8), b.material); tail.rotation.z = Math.PI / 2; tail.position.x = -0.38; f.add(tail);
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), std(0x111111)); e.position.set(0.18, 0.05, 0.08); f.add(e);
  shadowAll(f); const x = -10 + R() * 22, z = -6 - R() * 14; f.userData = { x, z, ph: R() * 6 }; scene.add(f); fishes.push(f);
}

// spray particles
const sprayN = 900; const spG = new THREE.BufferGeometry(); const spP = new Float32Array(sprayN * 3); const spSeed = [];
for (let i = 0; i < sprayN; i++) spSeed.push([R(), R(), R()]);
spG.setAttribute('position', new THREE.BufferAttribute(spP, 3));
const spray = new THREE.Points(spG, new THREE.PointsMaterial({ color: 0xffffff, size: 0.7, transparent: true, opacity: 0.85, depthWrite: false, map: canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }) })); scene.add(spray);
function updateSpray(t) {
  const zf = front(t); spray.visible = zf > -300 && zf < 70;
  if (!spray.visible) return;
  for (let i = 0; i < sprayN; i++) {
    const [a, b, c] = spSeed[i]; const life = (t * 0.9 + c) % 1;
    const x = (a - 0.5) * 200; const z = zf - 2 + life * 2.5 - b;
    const crest = waterH(x, zf - 2.2, t);
    spP[i * 3] = x + Math.sin(i) * life; spP[i * 3 + 1] = crest + life * (3 + b * 3) - life * life * 4; spP[i * 3 + 2] = z;
  }
  spG.attributes.position.needsUpdate = true;
}

// ---------- coffee-bean characters ----------
// ---------- fire and smoke helpers ----------
const flameTex = canvasTex(64, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.75, 2, w / 2, h * 0.6, h * 0.6); gr.addColorStop(0, 'rgba(255,255,220,1)'); gr.addColorStop(0.25, 'rgba(255,214,90,1)'); gr.addColorStop(0.6, 'rgba(255,120,30,0.85)'); gr.addColorStop(1, 'rgba(220,40,10,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(w / 2, 0); g.quadraticCurveTo(w, h * 0.55, w * 0.78, h * 0.9); g.quadraticCurveTo(w / 2, h, w * 0.22, h * 0.9); g.quadraticCurveTo(0, h * 0.55, w / 2, 0); g.fill(); });
const smokeTex = canvasTex(128, 128, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(70,70,72,0.9)'); gr.addColorStop(0.6, 'rgba(60,60,62,0.5)'); gr.addColorStop(1, 'rgba(50,50,52,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
function makeFlame(n = 7, spread = 0.35) {   // a bunch of flickering flame sprites
  const g = new THREE.Group(); const r = rnd(n * 7 + 3);
  for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    sp.userData = { x: (r() - 0.5) * spread * 2, z: (r() - 0.5) * spread, h: 0.6 + r() * 0.6, ph: r() * 6, sp: 9 + r() * 6 }; g.add(sp); }
  const core = new THREE.PointLight(0xff8a30, 0, 7, 1.6); g.add(core); g.userData.light = core; g.visible = false; return g;
}
function updateFlame(g, t, s) {   // s = size (0 = out)
  g.visible = s > 0.02; if (!g.visible) { g.userData.light.intensity = 0; return; }
  g.children.forEach(c => { if (!c.isSprite) return; const u = c.userData, f = 0.8 + 0.25 * Math.sin(t * u.sp + u.ph) + 0.12 * Math.sin(t * 23 + u.ph * 3);
    const hh = u.h * s * f; c.scale.set(hh * 0.55, hh, 1); c.position.set(u.x * s, hh * 0.45, u.z * s); });
  g.userData.light.intensity = (2.5 + 0.8 * Math.sin(t * 17)) * Math.min(1.6, s); g.userData.light.position.y = 0.4 * s;
}
function makeSmokeColumn(n = 26) { const g = new THREE.Group(); for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, fog: true })); sp.userData = { o: i / n, x: Math.sin(i * 2.3) * 0.3 }; g.add(sp); } g.visible = false; return g; }
function updateSmokeColumn(g, t, s, rise = 6, drift = 1.2) {
  g.visible = s > 0.02; if (!g.visible) return;
  g.children.forEach(c => { const u = c.userData, life = (t * 0.25 + u.o) % 1; const sz = (0.6 + life * 3.2) * s; c.scale.set(sz, sz, 1); c.position.set(u.x + life * drift, life * rise, life * 0.6); c.material.opacity = (1 - life) * 0.85 * Math.min(1, s * 1.5); });
}

class Bean {
  constructor(o) {
    this.root = new THREE.Group(); scene.add(this.root);
    this.body = new THREE.Group(); this.body.position.y = 0.95; this.root.add(this.body);
    const skin = new THREE.MeshPhysicalMaterial({ color: o.color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25 }); this.skinM = skin; this.baseColor = new THREE.Color(o.color);
    const dark = std(o.limb || 0x2a170c, { roughness: 0.5 });
    const bean = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), skin); bean.scale.set(0.42, 0.6, 0.37); this.body.add(bean);
    // crease (back)
    const pts = []; for (let i = 0; i <= 30; i++) { const y = -0.5 + i / 30; const x = 0.07 * Math.sin(y * Math.PI * 1.3); const zz = 1 - (x / 0.42) ** 2 - (y / 0.6) ** 2; pts.push(V(x, y, -0.37 * Math.sqrt(Math.max(zz, 0)) + 0.005)); }
    this.body.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 8), std(0x1a0d05)));
    // eyes
    const white = std(0xffffff, { roughness: 0.2 }), black = std(0x111111, { roughness: 0.15 });
    this.eyes = []; this.lids = []; this.pupils = [];
    for (const s of [-1, 1]) {
      const eg = new THREE.Group(); eg.position.set(s * 0.13, 0.2, 0.27); this.body.add(eg);
      const ew = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), white); ew.scale.set(1, 1.25, 0.9); eg.add(ew);
      const pu = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 10), black); pu.position.set(0, 0, 0.085); pu.scale.set(1, 1.2, 0.6); eg.add(pu);
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), std(0xffffff, { emissive: 0xffffff })); hl.position.set(0.02, 0.03, 0.03); pu.add(hl);
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), skin); lid.scale.set(1, 1.25, 0.95); eg.add(lid);
      this.eyes.push(eg); this.pupils.push(pu); this.lids.push(lid);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.035, 0.04), dark); brow.position.set(s * 0.13, 0.4, 0.29); this.body.add(brow); (this.brows ||= []).push(brow);
    }
    // mouth
    this.mouth = new THREE.Group(); this.mouth.position.set(0, -0.06, 0.345); this.mouth.rotation.x = -0.15; this.body.add(this.mouth);
    this.mouthIn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 12), std(0x3a0a0a, { roughness: 0.6 })); this.mouthIn.scale.set(1, 0.25, 0.3); this.mouth.add(this.mouthIn);
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), std(0xe0505a)); tongue.position.set(0, -0.04, 0.02); tongue.scale.set(1.2, 0.5, 0.5); this.mouthIn.add(tongue);
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 8, 20, Math.PI), std(0x1a0d05)); smile.rotation.z = Math.PI; smile.position.y = 0.03; this.mouth.add(smile); this.smile = smile;
    // limbs
    const limb = (len, r) => { const g = new THREE.CapsuleGeometry(r, len, 4, 8); g.translate(0, -len / 2, 0); return new THREE.Mesh(g, dark); };
    this.arms = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * 0.38, 0.0, 0); this.body.add(sh);
      sh.add(limb(0.28, 0.04)); const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      el.add(limb(0.26, 0.037)); const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), std(o.glove || 0xffffff, { roughness: 0.5 })); hand.position.y = -0.31; hand.scale.set(1, 1.1, 0.8); el.add(hand);
      const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.05, 4, 6), hand.material); th.position.set(-s * 0.06, -0.27, 0.03); th.rotation.z = s * 0.8; el.add(th);
      this.arms.push({ sh, el, hand, s });
    }
    this.legs = [];
    for (const s of [-1, 1]) {
      const hip = new THREE.Group(); hip.position.set(s * 0.15, -0.5, 0); this.body.add(hip);
      hip.add(limb(0.2, 0.045)); const kn = new THREE.Group(); kn.position.y = -0.22; hip.add(kn);
      kn.add(limb(0.18, 0.042)); const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), std(o.shoe || 0xd93a2b, { roughness: 0.4 })); shoe.scale.set(0.9, 0.55, 1.5); shoe.position.set(0, -0.23, 0.06); kn.add(shoe);
      this.legs.push({ hip, kn, s });
    }
    // accessories
    if (o.hat === 'straw') {
      const h = new THREE.Group(); this.hatG = h; h.position.y = 0.5; h.rotation.x = -0.12; h.rotation.z = 0.08;
      const straw = std(0xe8cf8a, { roughness: 0.9 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.03, 32), straw); h.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.22, 24), straw); crown.position.y = 0.11; h.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.06, 24), std(0xc0392b)); band.position.y = 0.04; h.add(band);
      this.body.add(h);
    }
    if (o.goatee) {
      const gm = std(0x1a0d05, { roughness: 0.8 });
      const g1 = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 10), gm); g1.position.set(0, -0.33, 0.285); g1.rotation.x = Math.PI - 0.45; this.body.add(g1);
      const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), gm); g2.scale.set(0.9, 1.0, 0.7); g2.position.set(0, -0.285, 0.305); this.body.add(g2);
    }
    if (o.hair === 'curly') {
      // short dark textured hair with faded sides
      const h = new THREE.Group(); h.position.set(0, 0.36, -0.02); const hm = std(0x17110c, { roughness: 0.85 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), hm); cap.scale.set(1.04, 0.62, 0.96); h.add(cap);
      const rr = rnd(11);
      for (let i = 0; i < 26; i++) { const a = rr() * Math.PI * 2, r = Math.sqrt(rr()) * 0.3; const c = new THREE.Mesh(new THREE.SphereGeometry(0.075 + rr() * 0.04, 8, 6), hm); c.position.set(Math.cos(a) * r, 0.2 - r * 0.45 + rr() * 0.04, Math.sin(a) * r * 0.95); h.add(c); }
      for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), hm); c.position.set(-0.16 + i * 0.08, 0.1 + (i % 2) * 0.03, 0.3); h.add(c); }
      this.body.add(h); this.hairG = h;
    }
    if (o.hat === 'cap') {
      const h = new THREE.Group(); this.hatG = h; h.position.set(0, 0.46, 0); h.rotation.x = -0.2;
      const m = std(0x1f6fd1);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m); dome.scale.set(1.1, 0.8, 1.05); h.add(dome);
      const bill = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), m); bill.position.set(0, 0.0, 0.2); bill.scale.set(1, 1, 0.9); h.add(bill);
      this.body.add(h);
    }
    if (o.camera) {
      const c = new THREE.Group(); const cb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.12), std(0x222222)); c.add(cb);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 16), std(0x444444, { metalness: 0.5 })); lens.rotation.x = Math.PI / 2; lens.position.z = 0.1; c.add(lens);
      c.position.set(0.06, -0.38, 0.08); this.arms[0].el.add(c); this.cam = c;
    }
    if (o.coconut) {
      const c = new THREE.Group(); const nut = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), std(0x6aa84f)); c.add(nut);
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), std(0xff5ea8)); straw.position.set(0.03, 0.15, 0); straw.rotation.z = -0.3; c.add(straw);
      c.position.set(0, -0.42, 0.06); this.arms[1].el.add(c); this.nut = c;
    }
    // sunglasses
    this.shades = new THREE.Group(); const lensM = std(0x111111, { roughness: 0.1, metalness: 0.6 });
    for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 20), lensM); l.rotation.x = Math.PI / 2; l.scale.set(1.1, 1, 0.85); l.position.set(s * 0.13, 0.21, 0.39); this.shades.add(l); }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.02), lensM); br.position.set(0, 0.24, 0.39); this.shades.add(br);
    this.body.add(this.shades);
    // fish in hand
    const hf = new THREE.Group(); const fb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), std(0xff8a2a, { roughness: 0.3 })); fb.scale.set(1.5, 0.8, 0.5); hf.add(fb);
    const ft = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.24, 8), fb.material); ft.rotation.z = Math.PI / 2; ft.position.x = -0.38; hf.add(ft);
    const fe = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), std(0x111111)); fe.position.set(0.17, 0.05, 0.08); hf.add(fe);
    hf.position.set(0.0, -0.42, 0.05); hf.rotation.z = 1.4; this.arms[1].el.add(hf); this.heldFish = hf;
    // game controller (both hands) and a candle (left hand)
    { const c = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.16), std(0x2b2f36, { roughness: 0.4 })); c.add(b);
      for (const s of [-1, 1]) { const grip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), b.material); grip.position.set(s * 0.15, -0.02, 0.03); c.add(grip); }
      const btn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), std(0xe8443a, { emissive: 0x551111 })); btn.position.set(0.08, 0.04, 0); c.add(btn);
      c.position.set(-0.12, -0.36, -0.04); this.arms[1].el.add(c); this.ctrl = c; c.visible = false; }
    { const c = new THREE.Group(); const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), std(0xfff4dc)); wax.position.y = 0.06; c.add(wax);
      const fl = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb030 })); fl.scale.set(0.8, 1.6, 0.8); fl.position.y = 0.22; c.add(fl);
      c.position.set(0, -0.38, 0.05); this.arms[0].el.add(c); this.candle = c; this.flame = fl; c.visible = false; }
    { const c = new THREE.Group(); const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.24, 14), std(0xffffff, { map: stripeTex('#e8443a', '#ffffff', 8) })); c.add(tub);
      const rp = rnd(3); for (let i = 0; i < 9; i++) { const k = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), std(0xfff3b0, { flatShading: true, roughness: 1 })); k.position.set((rp() - 0.5) * 0.18, 0.13 + rp() * 0.05, (rp() - 0.5) * 0.18); c.add(k); }
      c.position.set(0, -0.42, 0.08); this.arms[0].el.add(c); this.popc = c; c.visible = false; }
    { const c = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.025), std(0x1b1b1f, { roughness: 0.3 })); const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.14), new THREE.MeshBasicMaterial({ color: 0x7fd3ff })); scr.position.z = 0.014; c.add(scr);
      c.position.set(0, -0.36, 0.06); this.arms[1].el.add(c); this.phone = c; c.visible = false; }
    { const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.12), std(0xfafafa, { roughness: 0.4 })); c.position.set(0, -0.38, 0.06); this.arms[1].el.add(c); this.soap = c; c.visible = false; }
    { const c = new THREE.Group(); const bag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), std(0xe8443a, { roughness: 0.8 })); c.add(bag); const pk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.06), std(0xc0392b)); pk.position.set(0, -0.1, -0.13); c.add(pk);
      for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.03), std(0x333333)); st.position.set(s * 0.15, 0.02, 0.12); c.add(st); }
      c.position.set(0, 0.0, -0.45); this.body.add(c); this.pack = c; c.visible = false; }
    { const c = new THREE.Group(); const pm = std(0xf2d33c, { roughness: 0.7, side: THREE.DoubleSide });
      for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), pm); p.scale.set(0.55, 1.6, 0.35); p.rotation.set(Math.PI + 0.9, i * Math.PI / 2, 0); p.position.set(Math.sin(i * Math.PI / 2) * 0.05, 0, Math.cos(i * Math.PI / 2) * 0.05); c.add(p); }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.08, 6), std(0x6b4a2b)); stem.position.y = 0.05; c.add(stem);
      c.position.set(0.05, 0.62, 0); c.rotation.z = -0.3; this.body.add(c); this.peel = c; c.visible = false; }
    { const c = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), std(0xf4f4f4, { roughness: 0.9 })); c.position.set(0, -0.08, 0.36); c.rotation.x = -0.15; this.body.add(c); this.cloth = c; c.visible = false; }
    { const j = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.24, 14), std(0x5fb0e8, { transparent: true, opacity: 0.7, roughness: 0.1 })); j.add(b); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.16, 14), std(0x2e7dd1, { roughness: 0.1 })); w.position.y = -0.03; j.add(w); j.position.set(0, -0.4, 0.06); this.arms[1].el.add(j); this.jug = j; j.visible = false; }
    { const suit = new THREE.Group(); this.body.add(suit); this.suit = suit; suit.visible = false;
      const coatM = std(0xc9a646, { roughness: 0.8 }), refl = std(0xe9ff6a, { emissive: 0x9aa040, emissiveIntensity: 0.6, roughness: 0.3 }), redM = std(0xc62828, { roughness: 0.35 });
      const coat = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, Math.PI * 0.52, Math.PI * 0.48), coatM); coat.scale.set(0.455, 0.63, 0.4); suit.add(coat);
      for (const y of [-0.12, -0.36]) { const b = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 40), refl); b.rotation.x = Math.PI / 2; const k = Math.sqrt(1 - (y / 0.63) ** 2); b.scale.set(0.46 * k, 0.4 * k, 0.6); b.position.y = y; suit.add(b); }
      const helm = new THREE.Group(); helm.position.y = 0.43; suit.add(helm);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), redM); dome.scale.set(1.05, 0.8, 1.1); helm.add(dome);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.04, 28), redM); brim.scale.set(1, 1, 1.15); brim.position.set(0, 0.0, -0.06); helm.add(brim);
      const badgeH = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), std(0xffd23f, { metalness: 0.6, roughness: 0.3 })); badgeH.position.set(0, 0.17, 0.4); badgeH.rotation.x = -0.4; helm.add(badgeH);
      const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.45, 6, 12), std(0xdadada, { metalness: 0.6, roughness: 0.3 })); tank.position.set(0, -0.05, -0.47); suit.add(tank);
      const ext = new THREE.Group(); const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 14), redM); ext.add(cyl); const capE = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 10), std(0x1b1b1b)); capE.position.y = 0.3; ext.add(capE);
      const hoseE = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6), std(0x1b1b1b)); hoseE.position.set(0, 0.3, 0.18); hoseE.rotation.x = Math.PI / 2; ext.add(hoseE); const nz = new THREE.Object3D(); nz.position.set(0, 0.3, 0.38); ext.add(nz); this.nozzle = nz;
      ext.position.set(0, -0.42, 0.1); ext.rotation.x = 1.1; this.arms[1].el.add(ext); this.ext = ext; ext.visible = false; }
    { this.backFire = makeFlame(6, 0.2); this.backFire.remove(this.backFire.userData.light); this.backFire.userData.light = { intensity: 0, position: { y: 0 } }; this.backFire.position.set(0.1, 0.3, -0.25); this.backFire.scale.setScalar(2.4); this.body.add(this.backFire); }
    if (this.hatG) this.hatG.traverse(m => { if (m.isMesh) m.userData.c0 = m.material.color.clone(); });
    shadowAll(this.root);
    this.blinkSeed = R() * 10;
  }
  // p: {x,z,y?,ry,run,phase,armL,armR,legs:'sit',mouth,brow,look,lean,wob,smile}
  pose(t, p) {
    const y = p.y !== undefined ? p.y : terrainH(p.x, p.z);
    this.root.position.set(p.x, y, p.z); this.root.rotation.y = p.ry || 0;
    const run = p.run || 0, ph = p.phase || 0;
    const b = this.body; b.position.set(0, 0.95 + Math.abs(Math.sin(ph)) * 0.1 * run + (p.bob || 0), 0);
    b.rotation.set((p.lean || 0) + run * 0.3, 0, (p.tilt || 0));
    if (p.wob) { b.rotation.z += Math.sin(t * 30) * 0.12 * p.wob; b.rotation.x += Math.sin(t * 23) * 0.08 * p.wob; }
    // legs
    this.legs.forEach((L, i) => {
      const sgn = i ? 1 : -1;
      if (p.legs === 'crouch') { const cs = Math.sin(ph + (i ? Math.PI : 0)), cc = Math.max(0, Math.cos(ph + (i ? Math.PI : 0))); L.hip.rotation.set(-0.55 - cs * 0.55 * run, 0, sgn * 0.3); L.kn.rotation.set(1.0 + cc * 0.7 * run, 0, -sgn * 0.15); return; }
      if (p.legs === 'sit') { L.hip.rotation.set(-1.45 - (p.lean || 0), 0, sgn * 0.12); L.kn.rotation.set(0.25, 0, 0); return; }
      const sw = Math.sin(ph + (i ? Math.PI : 0));
      L.hip.rotation.set(-sw * 0.9 * run, 0, 0);
      L.kn.rotation.set(Math.max(0, Math.cos(ph + (i ? Math.PI : 0))) * 1.4 * run, 0, 0);
    });
    if (p.legs === 'sit') b.position.y = p.sitY ?? 0.6;
    if (p.legs === 'crouch') b.position.y = 0.83 + Math.abs(Math.sin(ph)) * 0.05 * run;
    // arms
    const swing = (i) => { const sw = Math.sin(ph + (i ? 0 : Math.PI)); return [sw * 1.0 * run, 0.15, -1.2 * run - 0.25]; };
    this.arms.forEach((A, i) => {
      let a = (i ? p.armR : p.armL) || swing(i);
      if (typeof a === 'function') a = a(t);
      const [fw, out, elb, ez = 0] = a;
      A.sh.rotation.set(-fw, 0, A.s * out);
      A.el.rotation.set(elb, 0, A.s * ez);
    });
    // face
    const bl = p.blink ? 1 : 0;
        this.lids.forEach(l => { l.rotation.x = lerp(-1.3 + (p.eyesWide ? -0.3 : 0) + (p.squint || 0), 1.5, bl); });
    const look = p.look || [0, 0];
    this.pupils.forEach(pu => { pu.position.x = look[0] * 0.04; pu.position.y = look[1] * 0.04; const sc = p.eyesWide ? 0.75 : 1; pu.scale.set(sc, sc * 1.2, 0.6); });
    this.eyes.forEach(e => e.scale.setScalar(p.eyesWide ? 1.15 : 1));
    const brow = p.brow || 0; // + worried, - angry
    this.brows.forEach((br, i) => { const s = i ? 1 : -1; br.rotation.z = -s * brow * 0.4; br.position.y = 0.4 + Math.abs(brow) * 0.03 + (p.eyesWide ? 0.05 : 0); if (p.smirk && i === 1) { br.position.y += 0.05; br.rotation.z = -0.25; } });
    const m = clamp(p.mouth || 0);
    this.mouthIn.scale.set(lerp(0.8, 1.0, m), lerp(0.08, 0.75, m) + (p.shout || 0) * 0.6, 0.3);
    this.mouthIn.visible = m > 0.05 || p.shout;
    this.smile.visible = (p.smile ?? 1) > 0 && m <= 0.05 && !p.shout;
    this.smile.rotation.z = (p.smile ?? 1) > 0 ? Math.PI : 0;
    if (p.smirk) { this.smile.visible = true; this.smile.rotation.z = Math.PI + 0.2; this.smile.scale.set(0.95, 1.05, 1.3); this.smile.position.set(0.025, 0.05, 0.01); } else { this.smile.scale.set(1, 1, 1); this.smile.position.set(0, 0.03, 0); }
    if (this.nut) this.nut.visible = p.nut === true;
    if (this.cam) this.cam.visible = p.camOn !== false;
    this.root.visible = p.visible !== false;
    this.shades.visible = !!(p.shades || p.shadesUp); this.shades.position.set(0, p.shadesUp ? 0.17 : 0, p.shadesUp ? 0.02 : 0); this.shades.rotation.x = p.shadesUp ? -0.3 : 0;
    this.heldFish.visible = !!p.fish; if (p.fish) this.heldFish.rotation.y = Math.sin(t * 14) * 0.4;
    if (this.hatG) this.hatG.visible = p.hat !== false;
    const soot = p.soot || 0, zap = p.zap || 0, dust = p.dust || 0, mud = p.mud || 0;
    this.skinM.color.copy(this.baseColor).lerp(new THREE.Color(0x231a14), soot * 0.85).lerp(new THREE.Color(0xe9e4da), dust * 0.85).lerp(new THREE.Color(0x8a6a3a), mud * 0.8);
    this.skinM.roughness = 0.35 + mud * 0.5; this.skinM.clearcoat = 0.8 * (1 - mud);
    this.popc.visible = !!p.popc; this.phone.visible = !!p.phone; this.cloth.visible = !!p.cloth; this.suit.visible = !!p.suit; this.ext.visible = !!p.ext; if (this.hairG) this.hairG.visible = !p.suit; if (this.hatG && p.suit) this.hatG.visible = false; this.jug.visible = !!p.jug; updateFlame(this.backFire, t, p.backFire || 0);
    if (this.hatG) this.hatG.traverse(m => { if (m.isMesh && m.userData.c0) m.material.color.copy(m.userData.c0).lerp(new THREE.Color(0x221a14), (p.soot || 0) * 0.85); }); this.soap.visible = !!p.soap; this.pack.visible = !!p.pack; this.peel.visible = !!p.peel;
    if (this.ctrl) this.ctrl.visible = !!p.ctrl;
    if (this.candle) { this.candle.visible = !!p.candle; this.flame.visible = !!p.flame; if (p.flame) this.flame.scale.set(1, 1 + 0.25 * Math.sin(t * 30), 1); }
    this.skinM.emissive.setRGB(0.55 * zap, 0.8 * zap, zap); this.skinM.emissiveIntensity = zap ? (Math.floor(t * 30) % 2 ? 1.6 : 0.2) : 0;
    if (this.hairG) { const fz = 1 + 0.45 * soot + 0.25 * zap; this.hairG.scale.set(fz, fz * (1 + 0.3 * soot), fz); this.hairG.rotation.z = zap ? Math.sin(t * 60) * 0.15 : 0; }
  }
}
const hero = new Bean({ color: 0x7a4421, hat: 'straw', coconut: true, shoe: 0xd93a2b, goatee: true });
const friend = new Bean({ color: 0x6e3b1b, hair: 'curly', shoe: 0x2a170c, glove: 0x2a170c });
const board = new THREE.Group();
{ const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), std(0xffffff, { roughness: 0.3 })); b.scale.set(1.05, 0.045, 0.27); board.add(b);
  const st = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), std(0xff5a36, { roughness: 0.3 })); st.scale.set(0.9, 0.047, 0.07); board.add(st);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.02), std(0x222222)); fin.position.set(0.85, -0.1, 0); board.add(fin);
  shadowAll(board); scene.add(board); }

// arm poses: [forward, outward, elbow, elbowTwist]
const A = {
  rest: [0.1, 0.18, -0.25],
  hips: [-0.2, 0.7, -2.2],
  relax: [-0.3, 2.5, 0, 2.0],
  talk: (k) => (t) => [0.55 + 0.25 * Math.sin(t * 4 + k), 0.35 + 0.1 * Math.sin(t * 3 + k), -1.3 + 0.3 * Math.sin(t * 5 + k)],
  up: (t) => [0.3, 2.6 + 0.15 * Math.sin(t * 14), -0.3],
  wave: (t) => [0.2, 2.5, -0.3, 0.5 + 0.5 * Math.sin(t * 11)],
  fishUp: (t) => [2.7, 0.35, -0.2 + 0.15 * Math.sin(t * 6)],
  pointUp: [2.7, 0.2, -0.1],
  point: [1.55, 0.05, -0.05],
  drink: [2.05, -0.35, -2.25],
  hold: [0.9, 0.0, -1.3],
  thumb: [1.25, 0.25, -1.6],
  shrug: [0.4, 0.9, -1.6],
  knee: [0.6, 0.15, -0.4],
  glasses: [2.35, -0.45, -2.3],
  facepalm: [2.0, -0.6, -1.2],
  stop: [1.45, 0.25, -0.2],
  no: (t) => [1.3, 0.3 + 0.35 * Math.sin(t * 12), -1.0],
  dive: [2.9, 0.15, 0],
  drive: [1.3, -0.1, -0.9],
  cheer: (t) => [0.6, 2.2 + 0.25 * Math.sin(t * 10), -0.6],
};
const mouthOf = (arr, t) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(t * TL.fps)))] || 0;
const capAt = (word, after = 0) => { const c = TL.caps.find(c => c.t0 >= after - 0.01 && c.text.toLowerCase().includes(word)); return c ? c.t0 : after; };

// key places
const TOWEL = { x: 2.6, z: 6.4 }, FISH = { x: 4.6, z: -5.0 }, TOP = { x: -29, z: 33.5 };
const HS = { x: TOP.x - 1.15, z: TOP.z - 0.95 }, HRY = Math.PI * 0.75 + 0.2;    // friend's spot on the hill
const STRAND = { x: 2.4, z: -15 };                                                  // where the friend gets stranded
const FTOWEL = { x: TOWEL.x - 1.5, z: TOWEL.z + 1.1 };
fishes[0].userData.x = FISH.x - 0.8; fishes[0].userData.z = FISH.z - 0.6;
fishes[1].userData.x = FISH.x + 1.2; fishes[1].userData.z = FISH.z - 1.5;
// ---------- the lost dog they rescue ----------
const dog = new THREE.Group(); scene.add(dog);
const dogParts = {};
{
  const fur = std(0xc98b4a, { roughness: 0.8 }), light = std(0xf3dfc0, { roughness: 0.8 }), darkM = std(0x2a1a10, { roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), fur); body.scale.set(0.2, 0.19, 0.34); body.position.set(0, 0.36, 0); dog.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), light); belly.scale.set(0.15, 0.13, 0.26); belly.position.set(0, 0.3, 0.02); dog.add(belly);
  const head = new THREE.Group(); head.position.set(0, 0.56, 0.3); dog.add(head); dogParts.head = head;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), fur); head.add(skull);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), light); snout.scale.set(1, 0.8, 1.2); snout.position.set(0, -0.04, 0.15); head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), darkM); nose.position.set(0, 0.0, 0.26); head.add(nose);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std(0xffffff)); eye.position.set(sx * 0.07, 0.05, 0.13); head.add(eye);
    const pu = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6), darkM); pu.position.set(sx * 0.072, 0.05, 0.165); head.add(pu);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), std(0x8a5a2b, { roughness: 0.8 })); ear.scale.set(0.05, 0.13, 0.08); ear.position.set(sx * 0.15, -0.02, -0.02); ear.rotation.z = sx * 0.35; head.add(ear);
  }
  const tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), std(0xe0505a)); tongue.scale.set(0.035, 0.012, 0.05); tongue.position.set(0, -0.1, 0.17); head.add(tongue); dogParts.tongue = tongue;
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.022, 6, 16), std(0xd93a2b)); collar.rotation.x = Math.PI / 2 - 0.4; collar.position.set(0, 0.48, 0.22); dog.add(collar);
  const tail = new THREE.Group(); tail.position.set(0, 0.45, -0.32); dog.add(tail); dogParts.tail = tail;
  const tm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.26, 6), fur); tm.position.y = 0.13; tail.add(tm); tail.rotation.x = -0.6;
  dogParts.legs = [];
  for (const [lx, lz] of [[-0.11, 0.2], [0.11, 0.2], [-0.11, -0.2], [0.11, -0.2]]) { const lg = new THREE.Group(); lg.position.set(lx, 0.3, lz); const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), fur); m.position.y = -0.15; lg.add(m); const paw = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), light); paw.position.y = -0.3; lg.add(paw); dog.add(lg); dogParts.legs.push(lg); }
  shadowAll(dog);
}
const dogHelmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), std(0xc62828, { roughness: 0.35 })); dogHelmet.position.set(0, 0.08, -0.02); dogParts.head.add(dogHelmet); dogHelmet.visible = false;
function dogPose(t, mode, x, y, z, ry) {
  dog.visible = mode !== 'hide'; if (mode === 'hide') return;
  dog.position.set(x, y, z); dog.rotation.set(0, ry, 0);
  dogParts.tail.rotation.z = Math.sin(t * 18) * 0.6;
  dogParts.tongue.visible = mode !== 'scared';
  dogParts.head.rotation.set(mode === 'scared' ? 0.25 : -0.1 + 0.05 * Math.sin(t * 6), mode === 'scared' ? Math.sin(t * 4) * 0.4 : 0, mode === 'tilt' ? 0.4 : 0);
  dogParts.legs.forEach((lg, i) => { lg.rotation.x = mode === 'carried' ? (i < 2 ? -0.7 : 0.7) : (mode === 'lie' ? (i < 2 ? -1.4 : 1.4) : (mode === 'scared' ? Math.sin(t * 25 + i) * 0.08 : 0)); });
  dog.position.y = y - (mode === 'lie' ? 0.2 : 0);
}
const heroPath = new THREE.CatmullRomCurve3([V(FISH.x, 0, FISH.z), V(3.8, 0, 1.5), V(1.4, 0, 7.6), V(-2.5, 0, 11), V(-6.2, 0, 14.6), V(-11, 0, 21.5), V(-18, 0, 26.5), V(-24.5, 0, 31), V(TOP.x, 0, TOP.z)]);
const pathU = (x, z) => { let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const p = heroPath.getPointAt(i / 400); const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i / 400; } } return best; };
const U_TOWEL = pathU(1.4, 7.6), U_SIGN = pathU(-6.2, 14.6);
function onPath(curve, u) { u = clamp(u, 0, 0.999); const p = curve.getPointAt(u), tg = curve.getTangentAt(u); return { x: p.x, z: p.z, ry: Math.atan2(tg.x, tg.z) }; }
const bp = building.position;
const DOOR = { x: bp.x - 4.2 * Math.sin(BROT), z: bp.z - 4.2 * Math.cos(BROT) };
const doorPath = new THREE.CatmullRomCurve3([V(6, 0, 11.5), V(10.8, 0, 14.4), V(12.0, 0, 16.6), V(12.3, 0, 18.9), V(DOOR.x, 0, DOOR.z)]);

// ---------- road, cars (bigger, glass you can see through), poles ----------
const CAR_S = 1.6;
const cars = [];
[[-2, 0xe8443a], [3.6, 0x2e7dd1], [9.2, 0xffd23f], [14.8, 0xf2f2f2]].forEach(([x, c]) => {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.1), std(c, { roughness: 0.3, metalness: 0.3 })); b.position.y = 0.5; g.add(b);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.55, 1.02), std(0x9fd3ff, { roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false })); cab.position.set(-0.1, 1.05, 0); g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 1.04), std(c, { roughness: 0.3, metalness: 0.3 })); roof.position.set(-0.1, 1.34, 0); g.add(roof);
  for (const [wx, wz] of [[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.55], [0.7, -0.55]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12), std(0x222222)); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.22, wz); g.add(w); }
  for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0xfff6c0, { emissive: 0xfff2a0, emissiveIntensity: 0.6 })); l.position.set(-1.1, 0.55, s * 0.35); g.add(l); }
  g.scale.setScalar(CAR_S); shadowAll(g); cab.castShadow = false; place(g, x, ROAD.z); g.rotation.y = 0.04; g.userData.home = g.position.clone(); cars.push(g); floaters.push(g);
});
const myCar = cars[1];
cars[3].userData.home.x = 22.5; cars[3].position.x = 22.5;
cars[0].userData.home.x = 48; cars[0].position.x = 48; cars[2].userData.home.x = 30; cars[2].position.x = 30;   // keep the road in front of the building door clear
{ const r = new THREE.Mesh(new THREE.BoxGeometry(2 * ROAD.half, 0.12, 3.4), std(0xffffff, { roughness: 0.95, map: canvasTex(2048, 64, (g, w, h) => { g.fillStyle = '#6e7276'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c9c9'; g.fillRect(0, 3, w, 2); g.fillRect(0, h - 5, w, 2); g.fillStyle = '#f4f4f4'; for (let i = 0; i < 40; i++) g.fillRect(i * 51 + 6, h / 2 - 2, 28, 4); }) })); r.receiveShadow = true; r.position.set(ROAD.x, ROAD.y + 0.02, ROAD.z); scene.add(r); }
// tunnel mouths: a rocky hillside with a concrete portal and a flat black opening (no interior)
function tunnel(x, dir) {   // dir: +1 opening faces +x, -1 faces -x
  const g = new THREE.Group(); g.position.set(x, ROAD.y, ROAD.z); g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2; scene.add(g);
  const rock = std(0x7d7466, { roughness: 1, flatShading: true }), grassM = std(0x5f9a3c, { roughness: 1, flatShading: true });
  const face = new THREE.Mesh(new THREE.BoxGeometry(14, 7.5, 1.2), rock); face.position.set(0, 3.5, -0.6); g.add(face);
  const mound = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), grassM); mound.scale.set(9, 7, 9); mound.position.set(0, 2.5, -8.5); g.add(mound);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(14.4, 0.7, 2.0), grassM); cap.position.set(0, 7.4, -0.9); g.add(cap);
  const arch = (w, h) => { const sh = new THREE.Shape(); sh.moveTo(-w / 2, 0); sh.lineTo(-w / 2, h - w / 2); sh.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); sh.lineTo(w / 2, 0); sh.lineTo(-w / 2, 0); return new THREE.ShapeGeometry(sh, 24); };
  const portal = new THREE.Mesh(arch(5.6, 5.6), std(0xb9b4aa, { roughness: 0.9 })); portal.position.set(0, 0, 0.02); g.add(portal);
  const hole = new THREE.Mesh(arch(4.6, 4.9), new THREE.MeshBasicMaterial({ color: 0x050505 })); hole.position.set(0, 0, 0.05); g.add(hole);
  shadowAll(g); hole.castShadow = false; hole.receiveShadow = false;
}

const poles = [];
for (const px of [-1, 12]) {
  const g = new THREE.Group(); const wm = std(0x6b5a48, { roughness: 0.9 });
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 6.5, 8), wm); p.position.y = 3.25; g.add(p);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.6), wm); bar.position.y = 6.1; g.add(bar);
  for (const s of [-0.7, 0, 0.7]) { const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6), std(0x9fd3e8)); ins.position.set(0, 6.25, s); g.add(ins); }
  shadowAll(g); place(g, px, ROAD.z + 2.3); poles.push(g);
}
const wires = new THREE.Group(); scene.add(wires);
{ const a = poles[0].position, b = poles[1].position;
  for (const s of [-0.7, 0, 0.7]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, b.x - a.x, 4), std(0x111111)); w.rotation.z = Math.PI / 2; w.position.set((a.x + b.x) / 2, (a.y + b.y) / 2 + 6.2, a.z + s); wires.add(w); } }
const sparkG = new THREE.BufferGeometry(); const sparkP = new Float32Array(60 * 3); sparkG.setAttribute('position', new THREE.BufferAttribute(sparkP, 3));
const sparks = new THREE.Points(sparkG, new THREE.PointsMaterial({ color: 0xffe066, size: 0.18, transparent: true, depthWrite: false })); scene.add(sparks);

// ---------- the city: buildings, shops, rooftops, street furniture, the park and the stream ----------
const CR = rnd(2024);
const facadeTex = (() => { const cache = {}; return (base, glass, floors, cols) => { const k = base + glass + floors + cols; if (cache[k]) return cache[k];
  return cache[k] = canvasTex(256, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); const fh = h / floors, cw = w / cols;
    for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) { const x = c * cw + cw * 0.18, y = f * fh + fh * 0.2, ww = cw * 0.64, hh = fh * 0.55;
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - 3, y - 3, ww + 6, hh + 8); g.fillStyle = glass; g.fillRect(x, y, ww, hh); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 3, y + 3, ww * 0.3, hh - 6);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(x, y + hh / 2 - 1, ww, 2); }
    g.fillStyle = 'rgba(0,0,0,0.12)'; for (let f = 1; f < floors; f++) g.fillRect(0, f * fh - 3, w, 4); }); }; })();
const SHOPS = [['PADARIA', '#c0392b'], ['FARMÁCIA', '#1e9e57'], ['MERCADINHO', '#e67e22'], ['LANCHES', '#d4a017'], ['BAR DO ZÉ', '#2c3e50'], ['ÓTICA', '#2e7dd1'], ['SALÃO', '#8e44ad'], ['PET SHOP', '#16a085'], ['PIZZARIA', '#b03a2e'], ['LIVRARIA', '#6d4c41']];
const signTexOf = (txt, col) => canvasTex(512, 96, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12); g.fillStyle = '#fff'; g.font = '900 56px "Inter Display"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 3); });
const shopFront = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#3a3f45'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fc8dc'; g.fillRect(10, 10, 150, 108); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(16, 14, 40, 100); g.fillStyle = '#6b4425'; g.fillRect(176, 22, 66, 106); g.fillStyle = '#d9b44a'; g.fillRect(230, 72, 6, 6); g.fillStyle = '#e8d7a8'; for (let i = 0; i < 4; i++) g.fillRect(24 + i * 34, 78, 26, 20); });
const tankM = std(0x2f6fb0, { roughness: 0.5 }), metalM = std(0x9aa3ab, { metalness: 0.6, roughness: 0.4 }), darkM = std(0x2b2e33, { roughness: 0.6 }), whiteM = std(0xeeeeee, { roughness: 0.6 });
const cityBuildings = [];
function cityBuilding(x, z, w, d, h, base, frontDir, opts = {}) {   // frontDir: -1 = front faces -z, +1 = front faces +z
  const g = new THREE.Group(); const floors = Math.max(2, Math.round(h / 3)), cols = Math.max(2, Math.round(w / 2.2));
  const glass = ['#5f8fb3', '#6c9bc0', '#4f7f9f', '#7aa7c4'][Math.floor(CR() * 4)];
  const side = std(0xffffff, { map: facadeTex(base, glass, floors, cols), roughness: 0.85 }), roofM = std(0xa79f92, { roughness: 0.95 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, roofM, roofM, side, side]); body.position.y = h / 2; g.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.5, d + 0.25), std(0xc9c0b2)); top.position.y = h + 0.25; g.add(top);
  const fz = frontDir * (d / 2);
  // shop on the ground floor: front, awning and sign
  if (opts.shop !== false && CR() < 0.85) {
    const [txt, col] = SHOPS[Math.floor(CR() * SHOPS.length)];
    const sf = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, 2.6), std(0xffffff, { map: shopFront, roughness: 0.5 })); sf.position.set(0, 1.3, fz + frontDir * 0.03); if (frontDir < 0) sf.rotation.y = Math.PI; g.add(sf);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.08, 1.2), std(0xffffff, { map: stripeTex(col, '#ffffff', 10), roughness: 0.8 })); aw.position.set(0, 2.85, fz + frontDir * 0.6); aw.rotation.x = frontDir * 0.25; g.add(aw);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w * 0.8, 5), 0.85), std(0xffffff, { map: signTexOf(txt, col), emissive: 0x222222 })); sg.position.set(0, 3.55, fz + frontDir * 0.04); if (frontDir < 0) sg.rotation.y = Math.PI; g.add(sg);
  }
  // balconies and air conditioners on the front
  for (let f = 1; f < floors; f++) {
    if (opts.balcony !== false && CR() < 0.45) { const bal = new THREE.Group(); const fl = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.1, 0.7), whiteM); bal.add(fl); const rail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.5, 0.04), std(0x444444, { metalness: 0.4 })); rail.position.set(0, 0.3, frontDir * 0.34); bal.add(rail); const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), std(0x3f8f2f, { flatShading: true })); plant.position.set(w * 0.12, 0.25, 0); bal.add(plant); bal.position.set((CR() - 0.5) * w * 0.4, f * (h / floors) - 0.2, fz + frontDir * 0.35); g.add(bal); }
    if (CR() < 0.5) { const ac = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.4), whiteM); ac.position.set((CR() - 0.5) * w * 0.8, f * (h / floors) + 0.9, fz + frontDir * 0.2); g.add(ac); const grill = new THREE.Mesh(new THREE.CircleGeometry(0.15, 12), darkM); grill.position.set(ac.position.x, ac.position.y, ac.position.z + frontDir * 0.205); if (frontDir < 0) grill.rotation.y = Math.PI; g.add(grill); }
  }
  // rooftop: water tank (caixa d'água), antennas, a little stair house
  if (CR() < 0.8) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.6, 1.0, 16), tankM); t.position.set((CR() - 0.5) * w * 0.5, h + 1.0, (CR() - 0.5) * d * 0.4); g.add(t); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 16), tankM); lid.position.set(t.position.x, h + 1.56, t.position.z); g.add(lid); }
  if (CR() < 0.6) { const an = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), metalM); an.position.set((CR() - 0.5) * w * 0.7, h + 1.6, (CR() - 0.5) * d * 0.6); g.add(an); const dish = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 6, 0, Math.PI * 2, 0, Math.PI / 3), std(0xdddddd, { side: THREE.DoubleSide })); dish.position.set(an.position.x + 0.5, h + 1.1, an.position.z); dish.rotation.z = 1.1; g.add(dish); }
  if (CR() < 0.5) { const sh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), std(0xc9c0b2)); sh.position.set((CR() - 0.5) * w * 0.4, h + 0.95, (CR() - 0.5) * d * 0.3); g.add(sh); }
  shadowAll(g); g.position.set(x, ROAD.y - 0.02, z); scene.add(g); cityBuildings.push(g); return g;
}
const PAL = ['#f6c8a0', '#a8d8ea', '#ffe6a7', '#e9e2f5', '#f7a7a7', '#d6f0c8', '#fde2c4', '#cfd8dc', '#f3d9b1', '#c5e1a5', '#ffccbc', '#d7ccc8'];
const pick = () => PAL[Math.floor(CR() * PAL.length)];
// our side of the street (fronts face the road)
[[-44, 7], [-35.5, 8], [-27, 7], [-19, 7.5], [-10.5, 7], [-2, 7.5], [6.5, 8]].forEach(([x, w]) => cityBuilding(x, 26, w, 8, 7 + CR() * 14, pick(), -1));
[[26.5, 6.5], [34, 7.5], [42, 7], [50, 8], [58.5, 7.5], [67, 8], [75.5, 7.5]].forEach(([x, w]) => cityBuilding(x, 26, w, 8, 8 + CR() * 16, pick(), -1));
// the block behind (taller)
for (let x = -50; x < 90; x += 10) cityBuilding(x + CR() * 2, 41, 8, 9, 14 + CR() * 22, pick(), -1, { shop: false });
// across the stream (fronts face the stream street)
for (let x = -52; x < 92; x += 8.5) cityBuilding(x + CR(), -8.6, 7.5, 7.5, 8 + CR() * 16, pick(), 1);
for (let x = -60; x < 100; x += 11) cityBuilding(x + CR() * 3, -22, 9, 9, 18 + CR() * 26, pick(), 1, { shop: false, balcony: false });
// skyline far away (fog turns it into silhouettes)
for (let i = 0; i < 70; i++) { const a = i / 70 * Math.PI * 2, r = 105 + CR() * 25, h = 20 + CR() * 45, w = 8 + CR() * 10;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), std(0xffffff, { map: facadeTex(pick(), '#6c8aa0', Math.round(h / 3), 4), roughness: 0.9 })); m.position.set(15 + Math.cos(a) * r, ROAD.y + h / 2, 10 + Math.sin(a) * r); m.rotation.y = CR() * 3; scene.add(m); }
// the far-side street
{ const r = new THREE.Mesh(new THREE.BoxGeometry(2 * ROAD.half, 0.12, 3.2), std(0xffffff, { roughness: 0.95, map: canvasTex(2048, 64, (g, w, h) => { g.fillStyle = '#6e7276'; g.fillRect(0, 0, w, h); g.fillStyle = '#f4f4f4'; for (let i = 0; i < 40; i++) g.fillRect(i * 51 + 6, h / 2 - 2, 28, 4); }) })); r.receiveShadow = true; r.position.set(ROAD.x, ROAD.y + 0.02, ROAD2.z); scene.add(r); }
// curbs along the main road
for (const dz of [-1.75, 1.75]) { const c = new THREE.Mesh(new THREE.BoxGeometry(2 * ROAD.half, 0.2, 0.18), std(0xd9d4ca)); c.position.set(ROAD.x, ROAD.y + 0.1, ROAD.z + dz); c.receiveShadow = true; scene.add(c); }
// crosswalks
for (const cx of [24.5, -6]) { const zc = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.3), new THREE.MeshStandardMaterial({ transparent: true, map: canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#f4f4f4'; for (let i = 0; i < 6; i++) g.fillRect(0, 6 + i * 26, w, 14); }) })); zc.rotation.x = -Math.PI / 2; zc.position.set(cx, ROAD.y + 0.085, ROAD.z); zc.receiveShadow = true; scene.add(zc); }
// stream walls, railings, water, and a footbridge
const canalWater = new THREE.Mesh(new THREE.PlaneGeometry(2 * ROAD.half + 60, CANAL.half * 2), new THREE.MeshStandardMaterial({ color: 0x7d6a4c, roughness: 0.15, metalness: 0.2 })); canalWater.rotation.x = -Math.PI / 2; canalWater.position.set(ROAD.x, 0.2, CANAL.z); scene.add(canalWater);
for (const s2 of [-1, 1]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2 * ROAD.half + 60, 1.8, 0.3), std(0x9a958c, { map: canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#9a958c'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,60,60,0.25)'; for (let i = 0; i < 16; i++) g.fillRect(i * 32, 0, 2, h); g.fillStyle = 'rgba(70,90,60,0.35)'; g.fillRect(0, h - 14, w, 14); g.font = '900 22px "Inter Display"'; g.fillStyle = '#d9534f'; g.fillText('VIVA A PRAÇA', 300, 34); }) })); wall.position.set(ROAD.x, ROAD.y - 0.85, CANAL.z + s2 * (CANAL.half + 0.15)); wall.receiveShadow = true; scene.add(wall);
  for (let x = -70; x < 115; x += 2) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), metalM); post.position.set(x, ROAD.y + 0.45, CANAL.z + s2 * (CANAL.half + 0.35)); scene.add(post); }
  const rail = new THREE.Mesh(new THREE.BoxGeometry(185, 0.06, 0.06), metalM); rail.position.set(22, ROAD.y + 0.9, CANAL.z + s2 * (CANAL.half + 0.35)); scene.add(rail);
  const rail2 = rail.clone(); rail2.position.y = ROAD.y + 0.5; scene.add(rail2);
}
{ const br = new THREE.Group(); const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, CANAL.half * 2 + 1.6), std(0x8a6a45)); deck.position.y = ROAD.y + 0.1; br.add(deck); for (const s2 of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, CANAL.half * 2 + 1.6), metalM); r.position.set(s2 * 1.15, ROAD.y + 0.6, 0); br.add(r); } shadowAll(br); br.position.set(-14, 0, CANAL.z); scene.add(br); }
// park: trees, benches, flower beds, lamps
function tree(x, z, h = 4) { const g = new THREE.Group(); const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h * 0.55, 8), std(0x6b4a2b)); tr.position.y = h * 0.27; g.add(tr);
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(h * (0.22 + CR() * 0.08), 1), std(CR() > 0.5 ? 0x3e7d2b : 0x4f9435, { flatShading: true })); c.position.set((CR() - 0.5) * h * 0.3, h * (0.62 + CR() * 0.15), (CR() - 0.5) * h * 0.3); g.add(c); }
  const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.25, 12), std(0x9a958c)); pl.position.y = 0.12; g.add(pl);
  shadowAll(g); g.position.set(x, ROAD.y, z); g.userData.ph = CR() * 6; scene.add(g); return g; }
const trees = [];
[[-40, 11.5], [-33, 13.5], [-26, 11], [-19, 13.8], [-9, 11.2], [-3, 13.6], [30, 11.6], [37, 13.6], [44, 11.2], [52, 13.5], [60, 11.5], [68, 13.4]].forEach(([x, z]) => trees.push(tree(x, z, 3.6 + CR() * 1.8)));
[[-40, 22.3], [-23, 22.3], [-6, 22.3], [32, 22.3], [46, 22.3], [62, 22.3], [-30, -4.4], [-5, -4.4], [20, -4.4], [45, -4.4], [70, -4.4]].forEach(([x, z]) => trees.push(tree(x, z, 3.2 + CR() * 1.2)));
function bench(x, z, ry) { const g = new THREE.Group(); const wood = std(0x9c6a3c); for (let i = 0; i < 3; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.14), wood); sl.position.set(0, 0.45, -0.18 + i * 0.17); g.add(sl); } for (let i = 0; i < 2; i++) { const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.14), wood); b2.position.set(0, 0.65 + i * 0.18, -0.28); b2.rotation.x = -0.2; g.add(b2); } for (const s2 of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.5), darkM); l.position.set(s2, 0.22, 0); g.add(l); } shadowAll(g); g.position.set(x, ROAD.y, z); g.rotation.y = ry; scene.add(g); }
[[-36, 12.3, 0], [-22, 12.6, 0], [-6, 12.4, 0], [34, 12.4, 0], [48, 12.4, 0], [64, 12.4, 0]].forEach(([x, z, r]) => bench(x, z, r));
for (const [x, z] of [[-30, 10.2], [-14, 10.4], [40, 10.3], [56, 10.3]]) { const bed = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1.0), std(0x8a5a32)); bed.position.set(x, ROAD.y + 0.15, z); scene.add(bed); for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), std([0xff5a8a, 0xffd23f, 0xff8a2a, 0xb48bff][i % 4])); f.position.set(x - 1.2 + i * 0.4, ROAD.y + 0.42, z + (i % 2 ? 0.2 : -0.2)); scene.add(f); } }
function lamp(x, z, ry, h = 5.2) { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 8), std(0x3b4248, { metalness: 0.5 })); p.position.y = h / 2; g.add(p);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), p.material); arm.position.set(0, h - 0.05, 0.55); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.6), p.material); head.position.set(0, h - 0.1, 1.1); g.add(head);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.5), new THREE.MeshBasicMaterial({ color: 0xfff1c0 })); glow.rotation.x = Math.PI / 2; glow.position.set(0, h - 0.19, 1.1); g.add(glow);
  shadowAll(g); g.position.set(x, ROAD.y, z); g.rotation.y = ry; scene.add(g); }
[[-30, 15.5], [-16, 15.5], [-2, 15.5], [33, 15.5], [47, 15.5], [61, 15.5]].forEach(([x, z]) => lamp(x, z, 0));
[[-36, 19.9], [-20, 19.9], [-9, 19.9], [6, 19.9], [30, 19.9], [44, 19.9], [58, 19.9]].forEach(([x, z]) => lamp(x, z, Math.PI));
// traffic lights at the crosswalk
for (const [x, z, ry] of [[23.2, 15.6, 0], [25.8, 19.7, Math.PI]]) { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 8), darkM); p.position.y = 1.6; g.add(p); const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.95, 0.3), std(0x1d1f22)); box.position.set(0, 3.3, 0.1); g.add(box); [[0xe8443a, 0.3], [0xffb020, 0], [0x2ecc71, -0.3]].forEach(([c, dy], i) => { const l = new THREE.Mesh(new THREE.CircleGeometry(0.1, 12), new THREE.MeshBasicMaterial({ color: i === 0 ? c : new THREE.Color(c).multiplyScalar(0.25) })); l.position.set(0, 3.3 + dy, 0.26); g.add(l); }); shadowAll(g); g.position.set(x, ROAD.y, z); g.rotation.y = ry; scene.add(g); }
// bus stop
{ const g = new THREE.Group(); const roof = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 1.4), std(0x2e7dd1)); roof.position.y = 2.5; g.add(roof); const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 0.05), std(0xbfe3ff, { transparent: true, opacity: 0.45 })); back.position.set(0, 1.4, -0.65); g.add(back);
  for (const s2 of [-1.65, 1.65]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.5, 0.08), metalM); p.position.set(s2, 1.25, -0.6); g.add(p); }
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 0.4), metalM); b2.position.set(0, 0.5, -0.4); g.add(b2);
  const sgn = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), std(0xffffff, { map: canvasTex(128, 64, (g2, w, h) => { g2.fillStyle = '#1557b0'; g2.fillRect(0, 0, w, h); g2.fillStyle = '#fff'; g2.font = '900 26px "Inter Display"'; g2.textAlign = 'center'; g2.fillText('ÔNIBUS', w / 2, 42); }) })); sgn.position.set(1.4, 3.0, 0); g.add(sgn);
  const ad = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), std(0xffffff, { map: canvasTex(128, 160, (g2, w, h) => { g2.fillStyle = '#ffd23f'; g2.fillRect(0, 0, w, h); g2.fillStyle = '#7a4421'; g2.beginPath(); g2.ellipse(64, 70, 34, 48, 0, 0, Math.PI * 2); g2.fill(); g2.fillStyle = '#c0392b'; g2.font = '900 20px "Inter Display"'; g2.textAlign = 'center'; g2.fillText('CAFÉ', 64, 145); }) })); ad.position.set(-0.9, 1.4, -0.62); g.add(ad);
  shadowAll(g); g.position.set(38, ROAD.y, 15.2); g.rotation.y = Math.PI; scene.add(g); }
// newspaper kiosk (banca)
{ const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.3, 1.8), std(0x1e7a4a)); body.position.y = 1.15; g.add(body); const roof = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.15, 2.3), std(0x16613a)); roof.position.y = 2.38; g.add(roof);
  const mags = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.2), std(0xffffff, { map: canvasTex(256, 128, (g2, w, h) => { const cs = ['#e8443a', '#2e7dd1', '#ffd23f', '#8e44ad', '#16a085', '#f28c28']; for (let i = 0; i < 12; i++) { g2.fillStyle = cs[i % 6]; g2.fillRect((i % 6) * 42 + 3, Math.floor(i / 6) * 64 + 4, 38, 56); g2.fillStyle = '#fff'; g2.fillRect((i % 6) * 42 + 7, Math.floor(i / 6) * 64 + 10, 30, 6); } }) })); mags.position.set(0, 1.3, 0.91); g.add(mags);
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.4), std(0xffffff, { map: signTexOf('BANCA', '#16613a') })); sg.position.set(0, 2.6, 1.0); g.add(sg);
  shadowAll(g); g.position.set(-24, ROAD.y, 13.2); scene.add(g); }
// trash bins, hydrant, mailbox, parking signs
for (const [x, z] of [[-12, 19.8], [3, 19.8], [33, 19.8], [-26, 15.6], [27, 15.6], [52, 15.6]]) { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), metalM); p.position.y = 0.45; g.add(p); const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.55, 12), std(0xf28c28)); b2.position.y = 0.95; g.add(b2); shadowAll(g); g.position.set(x, ROAD.y, z); scene.add(g); }
{ const g = new THREE.Group(); const b2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.7, 12), std(0xd62f2f)); b2.position.y = 0.35; g.add(b2); const c = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), b2.material); c.position.y = 0.72; g.add(c); for (const s2 of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 8), b2.material); n.rotation.z = Math.PI / 2; n.position.set(s2 * 0.2, 0.45, 0); g.add(n); } shadowAll(g); g.position.set(9.5, ROAD.y, 20.0); scene.add(g); }
for (const [x, z] of [[-16, 19.8], [40, 19.8]]) { const g = new THREE.Group(); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), metalM); p.position.y = 1.2; g.add(p); const sg = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20), std(0xffffff, { map: canvasTex(64, 64, (g2, w) => { g2.fillStyle = '#c62828'; g2.beginPath(); g2.arc(32, 32, 31, 0, Math.PI * 2); g2.fill(); g2.fillStyle = '#1557b0'; g2.beginPath(); g2.arc(32, 32, 24, 0, Math.PI * 2); g2.fill(); g2.strokeStyle = '#c62828'; g2.lineWidth = 6; g2.beginPath(); g2.moveTo(14, 14); g2.lineTo(50, 50); g2.stroke(); }) })); sg.position.set(0, 2.3, 0.05); sg.rotation.y = Math.PI; g.add(sg); shadowAll(g); g.position.set(x, ROAD.y, z); scene.add(g); }

// ---------- sun with a rotating glow ----------
const sunTex = canvasTex(512, 512, (g, w, h) => {
  const c = w / 2; const gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(0.12, 'rgba(255,240,170,1)'); gr.addColorStop(0.2, 'rgba(255,220,120,0.55)'); gr.addColorStop(0.5, 'rgba(255,210,120,0.12)'); gr.addColorStop(1, 'rgba(255,210,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.translate(c, c); g.fillStyle = 'rgba(255,236,160,0.33)';
  for (let i = 0; i < 14; i++) { g.rotate(Math.PI * 2 / 14); g.beginPath(); g.moveTo(-10, 60); g.lineTo(10, 60); g.lineTo(0, 240); g.closePath(); g.fill(); }
  g.restore();
});
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
sunSprite.scale.set(95, 95, 1); scene.add(sunSprite);
const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 256, (g, w) => { const c = w / 2, gr = g.createRadialGradient(c, c, 0, c, c, c); gr.addColorStop(0, 'rgba(255,240,190,0.5)'); gr.addColorStop(1, 'rgba(255,240,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
sunHalo.scale.set(220, 220, 1); scene.add(sunHalo);

// ---------- storm clouds over the sea (appear with the wave) ----------
const stormM = std(0x4f5a66, { roughness: 1, transparent: true, opacity: 0, depthWrite: false });
const stormG = new THREE.Group(); scene.add(stormG);
for (let i = 0; i < 16; i++) {
  const c = new THREE.Group();
  for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(6 + R() * 6, 12, 8), stormM); m.position.set(k * 7 - 14, R() * 3, R() * 4); m.scale.y = 0.55; c.add(m); }
  c.position.set(-230 + i * 30 + R() * 10, 24 + R() * 14, -190 - R() * 50); stormG.add(c);
}

// ---------- debris that the water carries in and out ----------
const debris = [];
for (let i = 0; i < 34; i++) {
  const k = i % 4; let m;
  if (k === 0) m = new THREE.Mesh(new THREE.BoxGeometry(1.4 + R(), 0.12, 0.3), std(0x8a6a45));
  else if (k === 1) m = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 8, 14), std(0x1d1d1d));
  else if (k === 2) m = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.6), std([0xc9b28a, 0x6aa0c8, 0xd96b4f][i % 3]));
  else { m = new THREE.Group(); const br = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2, 6), std(0x6b4a2b)); br.rotation.z = Math.PI / 2; m.add(br); const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), std(0x4e8a32, { flatShading: true })); lf.position.x = 0.9; m.add(lf); }
  shadowAll(m); m.userData = { x: -18 + R() * 46, z: -4 + R() * 38, ph: R() * 6, sp: 0.7 + R() * 0.6 }; m.visible = false; scene.add(m); debris.push(m);
}

// ---------- floating leftovers for the ending gag ----------
const hatF = new THREE.Group();
{ const straw = std(0xe8cf8a, { roughness: 0.9 }); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.03, 32), straw); hatF.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.22, 24), straw); crown.position.y = 0.11; hatF.add(crown);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.06, 24), std(0xc0392b)); band.position.y = 0.04; hatF.add(band); scene.add(hatF); }
const shadesF = new THREE.Group(); { const lm = std(0x111111, { metalness: 0.6, roughness: 0.1 }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16), lm); l.position.x = s * 0.13; shadesF.add(l); } scene.add(shadesF); }

// ---------- seagulls ----------
const gulls = [];
for (let i = 0; i < 6; i++) {
  const g = new THREE.Group(); const wm = std(0xffffff, { roughness: 0.7 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), wm); b.scale.set(0.8, 0.8, 2); g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), wm); hd.position.set(0, 0.08, 0.42); g.add(hd);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), std(0xffb020)); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.06, 0.6); g.add(bk);
  const wings = [];
  for (const s of [-1, 1]) { const piv = new THREE.Group(); const w = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.35), std(0xf0f0f0)); w.position.x = s * 0.5; const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.3), std(0x333333)); tip.position.x = s * 0.45; w.add(tip); piv.add(w); g.add(piv); wings.push([piv, s]); }
  g.userData = { wings, r: 8 + i * 2.5, h: 9 + (i % 3) * 2.5, sp: 0.25 + (i % 2) * 0.1, ph: i * 1.3, cx: 2 + (i % 2) * 4, cz: -4 + (i % 3) * 3 };
  scene.add(g); gulls.push(g);
}
function updateGulls(wt, t, flee = 0) {
  gulls.forEach(g => {
    const u = g.userData, a = u.ph + wt * u.sp;
    g.position.set(u.cx + Math.cos(a) * u.r, u.h + flee * 40 + Math.sin(wt * 0.7 + u.ph) * 0.5, u.cz + Math.sin(a) * u.r - flee * 60);
    g.rotation.set(0, -a + Math.PI, 0.3);
    u.wings.forEach(([p, s]) => p.rotation.z = s * Math.sin(t * (flee > 0 ? 14 : 5) + u.ph) * 0.6);
    g.visible = flee < 0.98;
  });
}

// ---------- building interior (lobby + stairwell), built away from the beach ----------
const IO = V(150, 0, 150);
const interior = new THREE.Group(); interior.position.copy(IO); scene.add(interior);
const FLOOR_H = 3;
const stairPts = [];
{
  const wallM = std(0xe9e1d2, { roughness: 0.95, side: THREE.DoubleSide });
  const tile = canvasTex(256, 256, (g, w) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#d8d2c6' : '#ece7dd'; g.fillRect(i * 32, j * 32, 32, 32); } }); tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(5, 3);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 5.2), std(0xffffff, { map: tile, roughness: 0.6 })); floor.position.set(-1.5, -0.1, 1.6); interior.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), wallM); back.position.set(-1.5, 8, -1.0); interior.add(back);
  const west = new THREE.Mesh(new THREE.PlaneGeometry(11, 16), wallM); west.rotation.y = Math.PI / 2; west.position.set(-9.5, 8, 4.5); interior.add(west);
  const east = new THREE.Mesh(new THREE.PlaneGeometry(11, 16), wallM); east.rotation.y = -Math.PI / 2; east.position.set(6.5, 8, 4.5); interior.add(east);
  const base = new THREE.Mesh(new THREE.BoxGeometry(16, 0.5, 0.05), std(0x8c7a64)); base.position.set(-1.5, 0.25, -0.97); interior.add(base);
  // elevator
  const steel = std(0xb9c2c8, { metalness: 0.7, roughness: 0.3 });
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.3, 0.08), steel); d.position.set(-6 + s * 0.39, 1.15, -0.93); interior.add(d); }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.06), std(0x6d7378, { metalness: 0.5 })); frame.position.set(-6, 1.3, -0.97); interior.add(frame);
  const elevSign = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#c62828'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 54px "Inter Display"'; g.fillText('EM EMERGÊNCIA', w / 2, 90); g.font = '900 64px "Inter Display"'; g.fillText('USE A ESCADA', w / 2, 175); });
  const es = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), std(0xffffff, { map: elevSign })); es.position.set(-6, 3.2, -0.95); interior.add(es);
  const lift = canvasTex(256, 96, (g, w, h) => { g.fillStyle = '#222'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffcf33'; g.textAlign = 'center'; g.font = '700 54px "JetBrains Mono", monospace'; g.fillText('▲ ▼', w / 2, 68); });
  const lp = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.19), std(0xffffff, { map: lift, emissive: 0x333333 })); lp.position.set(-4.75, 1.4, -0.95); interior.add(lp);
  // plant + bench
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 12), std(0xb8643c)); pot.position.set(-8.6, 0.25, -0.4); interior.add(pot);
  const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), std(0x3f8f2f, { flatShading: true })); leaves.position.set(-8.6, 0.95, -0.4); interior.add(leaves);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.5), std(0x8a6a45)); bench.position.set(-3, 0.23, -0.6); interior.add(bench);
  // switch-back stairs: 6 flights, 1.5 high each, between x=0 and x=4
  const stepM = std(0xcfc8bb, { roughness: 0.8 }), railM = std(0x6d7378, { metalness: 0.5 });
  const lanes = [0.55, 2.15];
  for (let f = 0; f < 6; f++) {
    const z = lanes[f % 2], y0 = f * 1.5, dir = f % 2 ? -1 : 1, x0 = f % 2 ? 4 : 0;
    for (let k = 0; k < 10; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.15, 1.45), stepM); st.position.set(x0 + dir * (k * 0.4 + 0.2), y0 + (k + 1) * 0.15 - 0.075, z); interior.add(st); }
    const slab = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.12, 1.45), stepM); slab.position.set(2, y0 + 0.7, z); slab.rotation.z = dir * Math.atan2(1.5, 4); interior.add(slab);
    const ly = y0 + 1.5, lx = f % 2 ? -0.5 : 4.5;
    const land = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.15, 3.1), stepM); land.position.set(lx, ly - 0.075, 1.35); interior.add(land);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 0.06), railM); rail.position.set(2, y0 + 0.75 + 0.95, lanes[1] + 0.75); rail.rotation.z = dir * Math.atan2(1.5, 4); if (f % 2) interior.add(rail);
  }
  // solid floors on every storey (the stairwell opening stays clear) so the climb never floats over empty space
  const slabM = std(0xffffff, { map: tile, roughness: 0.6 }), edgeM = std(0xb9b0a2, { roughness: 0.9 });
  for (let n = 1; n <= 3; n++) {
    const y = n * FLOOR_H;
    for (const [x0, x1] of [[-9.5, -1.0], [5.0, 6.5]]) {
      const w = x1 - x0; const sl = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, 5.2), slabM); sl.position.set((x0 + x1) / 2, y - 0.15, 1.6); interior.add(sl);
      const ed = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, 0.06), edgeM); ed.position.set((x0 + x1) / 2, y - 0.15, 4.21); interior.add(ed);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.3, 0.9), slabM); back.position.set(2, y - 0.15, -0.55); interior.add(back);
  }
  // floor numbers on the west wall at each landing
  [1, 2, 3].forEach(n => {
    const tx = canvasTex(512, 256, (g, w, h) => { g.fillStyle = n === 3 ? '#1e9e57' : '#1557b0'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 120px "Inter Display"'; g.fillText(n + 'º', w / 2 - 110, 170); g.font = '900 70px "Inter Display"'; g.fillText('ANDAR', w / 2 + 110, 160); });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), std(0xffffff, { map: tx })); pl.position.set(-0.6, n * FLOOR_H + 1.5, -0.95); interior.add(pl);
  });
  // a window with sea view at the 3rd floor
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), std(0xffffff, { map: canvasTex(256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6f7a85'); gr.addColorStop(0.55, '#aab3bb'); gr.addColorStop(0.56, '#8a6a45'); gr.addColorStop(1, '#5e4630'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2f2'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); }), emissive: 0x335566, emissiveIntensity: 0.3 }));
  win.position.set(2.5, 9 + 1.8, -0.95); interior.add(win);
  // the climbing route (local coordinates)
  stairPts.push(V(-4.5, 0, 1.6), V(-0.4, 0, 0.55));
  for (let f = 0; f < 6; f++) {
    const z = lanes[f % 2], y0 = f * 1.5, x0 = f % 2 ? 4 : 0, x1 = f % 2 ? 0 : 4, lx = f % 2 ? -0.45 : 4.45;
    stairPts.push(V(x0, y0, z), V(x1, y0 + 1.5, z), V(lx, y0 + 1.5, 1.35));
  }
  stairPts.push(V(2.5, 9, 0.2));
  interior.traverse(m => { if (m.isMesh) m.receiveShadow = true; });
}
const stairLen = []; { let acc = 0; stairLen.push(0); for (let i = 1; i < stairPts.length; i++) { acc += stairPts[i].distanceTo(stairPts[i - 1]); stairLen.push(acc); } }
function onStairs(d) {   // distance along the route -> local position + heading
  d = clamp(d, 0, stairLen[stairLen.length - 1] - 0.001);
  let i = 1; while (stairLen[i] < d) i++;
  const a = stairPts[i - 1], b = stairPts[i], k = (d - stairLen[i - 1]) / (stairLen[i] - stairLen[i - 1]);
  const p = a.clone().lerp(b, k); return { x: IO.x + p.x, y: IO.y + p.y, z: IO.z + p.z, ry: Math.atan2(b.x - a.x, b.z - a.z) };
}
const STAIR_TOTAL = stairLen[stairLen.length - 1];
// top floor: elevator doors too, and the smoke layers that fill the upper part of every floor
const ioSmoke = [];
{ const steel = std(0xb9c2c8, { metalness: 0.7, roughness: 0.3 }); const elev = new THREE.Group(); elev.position.set(-6, 9, -0.93); interior.add(elev);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.6, 0.06), std(0x6d7378, { metalness: 0.5 })); frame.position.set(0, 1.3, -0.04); elev.add(frame);
  const doors = []; for (const sx of [-1, 1]) { const d = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.3, 0.08), steel); d.position.set(sx * 0.39, 1.15, 0); elev.add(d); doors.push(d); } interior.userData.elevDoors = doors;
  const btn = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.28), new THREE.MeshBasicMaterial({ color: 0xffcf33 })); btn.position.set(1.25, 1.4, 0.02); elev.add(btn); interior.userData.elevBtn = btn;
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), std(0xffffff, { map: canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#c62828'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 120px "Inter Display"'; g.fillText('3º', w / 2 - 110, 170); g.font = '900 70px "Inter Display"'; g.fillText('ANDAR', w / 2 + 110, 160); }) })); fl.position.set(-3.0, 10.5, -0.95);
  { const CW = 2.4, CD = 2.4, CH = 2.8;   // a roomy cab so the camera fits inside with both beans
    const cab = new THREE.Group(); cab.position.set(-6, 9, -1.0 - CD / 2); interior.add(cab); const stM = std(0xb7bec4, { metalness: 0.55, roughness: 0.35, side: THREE.DoubleSide });
    const fl = new THREE.Mesh(new THREE.BoxGeometry(CW, 0.08, CD), std(0x4a4e53, { roughness: 0.8 })); fl.position.y = 0.04; cab.add(fl);
    const bk = new THREE.Mesh(new THREE.PlaneGeometry(CW, CH), stM); bk.position.set(0, CH / 2, -CD / 2); cab.add(bk);
    const mir = new THREE.Mesh(new THREE.PlaneGeometry(CW - 0.5, 1.3), std(0xdfe8ee, { metalness: 0.9, roughness: 0.08 })); mir.position.set(0, 1.55, -CD / 2 + 0.01); cab.add(mir);
    for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(CD, CH), stM); w.rotation.y = Math.PI / 2; w.position.set(sx * CW / 2, CH / 2, 0); cab.add(w);
      for (let k = 0; k < 3; k++) { const pnl = new THREE.Mesh(new THREE.PlaneGeometry(CD / 3 - 0.08, CH - 0.5), std(0xa5adb4, { metalness: 0.6, roughness: 0.3 })); pnl.rotation.y = -sx * Math.PI / 2; pnl.position.set(sx * (CW / 2 - 0.01), CH / 2 + 0.1, -CD / 2 + CD / 6 + k * CD / 3); cab.add(pnl); }
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, CD - 0.3, 8), std(0xdadada, { metalness: 0.8 })); rail.rotation.x = Math.PI / 2; rail.position.set(sx * (CW / 2 - 0.06), 0.95, 0); cab.add(rail); }
    const bp = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.7), std(0x2a2d31, { metalness: 0.5 })); bp.rotation.y = -Math.PI / 2; bp.position.set(CW / 2 - 0.02, 1.25, CD / 2 - 0.3); cab.add(bp);
    for (let k = 0; k < 6; k++) { const bt = new THREE.Mesh(new THREE.CircleGeometry(0.035, 12), new THREE.MeshBasicMaterial({ color: k === 3 ? 0xffcf33 : 0xd8d8d8 })); bt.rotation.y = -Math.PI / 2; bt.position.set(CW / 2 - 0.03, 1.0 + k * 0.09, CD / 2 - 0.3); cab.add(bt); }
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(CW, CD), stM); ce.rotation.x = Math.PI / 2; ce.position.y = CH; cab.add(ce);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0xfff3d0 })); panel.rotation.x = Math.PI / 2; panel.position.y = CH - 0.01; cab.add(panel);
    const lt0 = new THREE.PointLight(0xfff1d6, 2.2, 6, 1.5); lt0.position.y = CH - 0.3; cab.add(lt0); const red = new THREE.PointLight(0xff2020, 0, 6, 1.5); red.position.set(0, CH - 0.4, -CD / 2 + 0.3); cab.add(red);
    const redB = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0x441010 })); redB.position.set(0, CH - 0.2, -CD / 2 + 0.06); cab.add(redB);
    const sm = new THREE.Mesh(new THREE.BoxGeometry(CW - 0.02, 1, CD - 0.02), new THREE.MeshBasicMaterial({ color: 0x3c3e42, transparent: true, opacity: 0.6, depthWrite: false })); cab.add(sm);
    interior.userData.cab = { cab, panel, lt0, red, redB, sm }; }
  for (let n = 0; n <= 3; n++) { const b = new THREE.Mesh(new THREE.BoxGeometry(16, 1.3, 5.2), new THREE.MeshBasicMaterial({ color: 0x3c3e42, transparent: true, opacity: 0.6, depthWrite: false })); b.position.set(-1.5, n * FLOOR_H + 2.3, 1.6); b.renderOrder = 2; interior.add(b); ioSmoke.push(b); } }
// 3rd-floor hallway: a ceiling, a front wall with flat doors, lights, exit sign and a railing round the stairwell
{ const Y = 9, HY = 12, wallM = std(0xe9e1d2, { roughness: 0.95, side: THREE.DoubleSide });
  const tile = canvasTex(256, 256, (g) => { for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = (i + j) % 2 ? '#c9b89c' : '#ddd0b8'; g.fillRect(i * 32, j * 32, 32, 32); } }); tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.repeat.set(8, 2);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 4.3), std(0xffffff, { map: tile, roughness: 0.6 })); fr.position.set(-1.5, Y - 0.15, 6.35); interior.add(fr);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 9.5), std(0xf4efe6, { roughness: 1, side: THREE.DoubleSide })); ceil.rotation.x = Math.PI / 2; ceil.position.set(-1.5, HY, 3.75); interior.add(ceil);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(16, 3.2), wallM); front.position.set(-1.5, Y + 1.5, 8.5); interior.add(front);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(16, 0.18, 0.05), std(0x8c7a64)); skirt.position.set(-1.5, Y + 0.09, 8.47); interior.add(skirt);
  const doorM = std(0x7a4a2a, { roughness: 0.7 }), knobM = std(0xd9b44a, { metalness: 0.8, roughness: 0.3 });
  [[-7.5, '301'], [-3.5, '302'], [1.5, '303'], [5.0, '304']].forEach(([x, num]) => {
    const d = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 0.08), doorM); d.position.set(x, Y + 1.1, 8.44); interior.add(d);
    const fm = new THREE.Mesh(new THREE.BoxGeometry(1.16, 2.3, 0.04), std(0xd8ccb8)); fm.position.set(x, Y + 1.15, 8.47); interior.add(fm);
    const kb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), knobM); kb.position.set(x + 0.36, Y + 1.05, 8.38); interior.add(kb);
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.2), std(0xffffff, { map: canvasTex(128, 64, (g, w, h) => { g.fillStyle = '#d9b44a'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a2a10'; g.textAlign = 'center'; g.font = '900 44px "Inter Display"'; g.fillText(num, w / 2, 48); }) })); pl.rotation.y = Math.PI; pl.position.set(x, Y + 1.9, 8.39); interior.add(pl);
    const mat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.5), std(0x8a3a2a)); mat.position.set(x, Y + 0.01, 8.0); interior.add(mat); });
  for (const x of [-7.5, -4.0, -0.5, 3.5]) { const lp = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({ color: 0xfff6e0 })); lp.rotation.x = Math.PI / 2; lp.position.set(x, HY - 0.01, 5.6); interior.add(lp); }
  const hl1 = new THREE.PointLight(0xffeccc, 1.6, 9, 1.2); hl1.position.set(-6.5, HY - 0.4, 5.0); interior.add(hl1);
  const hl2 = new THREE.PointLight(0xffeccc, 1.6, 9, 1.2); hl2.position.set(-1.5, HY - 0.4, 5.0); interior.add(hl2);
  const exitS = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.45), new THREE.MeshBasicMaterial({ map: canvasTex(256, 90, (g, w, h) => { g.fillStyle = '#12a150'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 52px "Inter Display"'; g.fillText('SAÍDA ➜', w / 2, 66); }) }));
  exitS.position.set(-1.2, HY - 0.45, 2.15); exitS.rotation.y = -Math.PI / 2; interior.add(exitS);
  const alarm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), new THREE.MeshBasicMaterial({ color: 0xc62828 })); alarm.position.set(-8.0, Y + 1.5, 8.43); interior.add(alarm); interior.userData.alarm = alarm;
  const ext = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.55, 12), std(0xc62828, { roughness: 0.4 })); ext.position.set(-9.3, Y + 0.6, 6.5); interior.add(ext);
  const railM = std(0x5d6368, { metalness: 0.6, roughness: 0.4 });
  const bar = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(z1 - z0, x1 - x0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(L, 0.06, 0.06), railM); top.position.set((x0 + x1) / 2, Y + 1.0, (z0 + z1) / 2); top.rotation.y = -ang; interior.add(top);
    const mid = top.clone(); mid.position.y = Y + 0.5; interior.add(mid);
    const n = Math.max(2, Math.round(L / 1.0) + 1); for (let i = 0; i < n; i++) { const k = i / (n - 1); const po = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.0, 0.05), railM); po.position.set(lerp(x0, x1, k), Y + 0.5, lerp(z0, z1, k)); interior.add(po); } };
  bar(-1.0, 4.2, 5.0, 4.2); bar(5.0, -0.1, 5.0, 4.2); bar(-1.0, 2.95, -1.0, 4.2); bar(-1.0, -0.1, -1.0, 1.4);
  ioSmoke[3].geometry.dispose(); ioSmoke[3].geometry = new THREE.BoxGeometry(16, 1.3, 9.5); ioSmoke[3].position.z = 3.75; ioSmoke[3].position.y = HY - 0.6;
}
// ---------- fire truck ----------
const truck = new THREE.Group();
{ const red = std(0xd62f2f, { roughness: 0.4, metalness: 0.2 }), chrome = std(0xdadada, { metalness: 0.7, roughness: 0.3 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.1, 1.4), red); body.position.set(0.3, 0.85, 0); truck.add(body);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 1.36), red); cab.position.set(-2.0, 1.15, 0); truck.add(cab);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 1.2), std(0x9fd3ff, { roughness: 0.05 })); glass.position.set(-2.61, 1.35, 0); truck.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.82, 0.12, 1.42), std(0xffffff)); stripe.position.set(-0.3, 0.75, 0); truck.add(stripe);
  for (const [x, z] of [[-1.9, 0.68], [1.3, 0.68], [-1.9, -0.68], [1.3, -0.68]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14), std(0x1b1b1b)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.34, z); truck.add(w); }
  const lights = []; for (const [z, c] of [[-0.4, 0xff2020], [0.4, 0x2060ff]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.14, 0.25), new THREE.MeshBasicMaterial({ color: c })); l.position.set(-2.0, 1.72, z); truck.add(l); lights.push(l); } truck.userData.lights = lights;
  const lad = new THREE.Group(); lad.position.set(1.4, 1.5, 0); truck.add(lad); truck.userData.ladder = lad;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 0.2, 14), chrome); lad.add(base);
  const arm = new THREE.Group(); arm.position.y = 0.15; lad.add(arm); truck.userData.arm = arm;
  for (const z of [-0.25, 0.25]) { const r = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.07, 0.07), chrome); r.position.set(-2.75, 0, z); arm.add(r); }
  for (let i = 0; i < 12; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), chrome); r.position.set(-0.2 - i * 0.45, 0, 0); arm.add(r); }
  const nozzle = new THREE.Object3D(); nozzle.position.set(-5.5, 0, 0); arm.add(nozzle); truck.userData.nozzle = nozzle;
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.36), std(0xffffff, { map: canvasTex(256, 42, (g, w, h) => { g.fillStyle = '#d62f2f'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 32px "Inter Display"'; g.textAlign = 'center'; g.fillText('BOMBEIROS 193', w / 2, 32); }) })); tag.position.set(0.3, 1.05, 0.71); truck.add(tag);
  const tag2 = tag.clone(); tag2.position.z = -0.71; tag2.rotation.y = Math.PI; truck.add(tag2);
  shadowAll(truck); truck.scale.setScalar(1.25); scene.add(truck); truck.visible = false; }
const hoseN = 140; const hoseG = new THREE.BufferGeometry(); const hoseP = new Float32Array(hoseN * 3); hoseG.setAttribute('position', new THREE.BufferAttribute(hoseP, 3));
const hose = new THREE.Points(hoseG, new THREE.PointsMaterial({ color: 0xcfe8ff, size: 0.22, transparent: true, opacity: 0.85, depthWrite: false })); hose.frustumCulled = false; scene.add(hose); hose.visible = false;
const DOG_HILL = { x: TOP.x - 0.2, z: TOP.z - 1.6 };
// water's edge at the foot of the hill (for the electric-shock gag)
const EDGE = (() => { const dir = V(-6 - TOP.x, 0, 12 - TOP.z).normalize(); let p = V(TOP.x, 0, TOP.z); for (let i = 0; i < 400; i++) { p.addScaledVector(dir, 0.1); if (terrainH(p.x, p.z) < 1.3 + 0.45) break; } return { x: p.x, z: p.z, ry: Math.atan2(dir.x, dir.z), dir }; })();

// =====================================================================
//  EPISÓDIO 3 — ENCHENTE
// =====================================================================
const WORDS = await (await fetch('/audio/words.json')).json().catch(() => []);
const wordAt = (w, after) => { const x = WORDS.find(k => k.t0 >= after - 0.01 && k.text.toLowerCase().replace(/[^a-zà-ú]/g, '').startsWith(w)); return x ? x.t0 : after; };
const GAGN = ['q1', 'q3', 'ohoh'];                    // the ending, in the flat
const APTN = ['calm', 'friend1'];
const IOSC = ['exit1', 'exit2', 'elevgag', 'idea', 'crawl'];
function seg(t) { for (let i = TL.segs.length - 1; i >= 0; i--) if (t >= TL.segs[i].start) return TL.segs[i]; return TL.segs[0]; }

// ---------- key times (EP4 v2: the whole building burns) ----------
const W_CURTO = wordAt('curto', T0('fire')), F0 = wordAt('incêndio', T0('fire')), W_MINUTOS = wordAt('minutos', T0('fire')), W_FOGO = wordAt('fogo', W_MINUTOS);
const W_ENERGIA = wordAt('energia', T0('exit2')), W_RESPIRA = 1e9;
const W_PANO = wordAt('pano', T0('crawl')), W_ESCADA = wordAt('escada', T0('crawl'));
const EMBER_T = T0('roll') + 0.7;
const W_CORRER = wordAt('correr', T0('roll')), W_PARE = wordAt('pare', T0('roll')), W_DEITE = wordAt('deite', T0('roll')), W_ROLE = wordAt('role', T0('roll')), W_APAGAR = TE('roll') - 0.1;
const W_VESTIR = wordAt('vestir', T0('suit')), W_EXT = wordAt('extintores', T0('suit')), W_APAGAR_P = wordAt('apagar', T0('suit'));
const W_TREINOU = wordAt('treinou', T0('real')), W_VIDA = wordAt('vida', T0('real')), W_LONGE = wordAt('fique', T0('real')), W_193 = wordAt('cento', T0('real'));
const W_LIBERAREM = 1e9;
const ASSIMS = [['crawl', 'ASSIM, A FUMAÇA NÃO TE PEGA'], ['real', 'ASSIM, O FOGO NÃO TE PEGA']].map(([n, txt]) => ({ n, t: wordAt('assim', T0(n)), txt }));
const CRASH = T0('jump') + 0.75, LAND = T0('jump') + 2.35;
const WRONGS = () => [wordAt('não', T0('exit2'))];
// names from the first version of this episode (no longer reached)
const W_CEL = 1e9, W_OLEO = 1e9, W_TAMPO = 1e9, W_DESLIGO = 1e9, W_APAGA = 1e9, W_CORTINA = 1e9, W_SAIR = 1e9, BOOM_T = 1e9, BLAST = 1e9, BACK_IN = 1e9;
// EP3 names still referenced by shared code paths (never reached in this episode)
const R0 = 1e9, W_RUA = 1e9, W_PORTA = 1e9, W_BOIAR = 1e9, W_CERTO = 1e9, W_TOMADAS = 1e9, W_SUBA = 1e9, W_NUNCA = 1e9, W_TUNEIS = 1e9, W_ARRANCAR = 1e9, W_BARRENTA = 1e9, W_TELHADO = 1e9, W_BUEIROS = 1e9;
const PLOFT = 1e9, POPUP = 1e9, W_SABAO = 1e9, W_LAVE = 1e9, W_FIO = 1e9, BONK_T = 1e9;
const BOLTS = [];
const bolt = t => BOLTS.reduce((m, b) => Math.max(m, t > b && t < b + 0.5 ? (Math.floor((t - b) * 20) % 3 === 0 ? 1 : 0.35) * (1 - (t - b) / 0.5) : 0), 0);

// ---------- the flood out in the street ----------
const FL = { x0: -110, x1: 150, z0: -45, z1: 60 };
const flTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#8f7550'; g.fillRect(0, 0, w, h); const r = rnd(31);
  for (let i = 0; i < 200; i++) { g.strokeStyle = `rgba(${r() > 0.4 ? '225,210,180' : '110,85,55'},${0.12 + r() * 0.18})`; g.lineWidth = 1.5 + r() * 2.5; const x = r() * w, y = r() * h, l = 30 + r() * 90; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (r() - 0.5) * 16, x + l, y); g.stroke(); }
});
flTex.wrapS = flTex.wrapT = THREE.RepeatWrapping; flTex.repeat.set(24, 7);
const flG = new THREE.PlaneGeometry(FL.x1 - FL.x0, FL.z1 - FL.z0, 200, 80); flG.rotateX(-Math.PI / 2); flG.translate((FL.x0 + FL.x1) / 2, 0, (FL.z0 + FL.z1) / 2);
const floodMesh = new THREE.Mesh(flG, new THREE.MeshStandardMaterial({ map: flTex, color: 0xd9ccb4, roughness: 0.12, metalness: 0.35 }));
floodMesh.receiveShadow = true; scene.add(floodMesh);
function floodD(t) {   // water depth above the road
  return -1;   // no flood in this episode
  if (t < R0 + 1.0) return -1;
  if (t < TE('rain')) return lerp(0.14, 0.3, ss(R0 + 1.0, TE('rain'), t));
  if (t < T0('car2')) return 0.35;
  if (t < T0('gag1')) return lerp(0.35, 0.6, ss(T0('car2'), W_BOIAR + 0.3, t));
  if (t >= T0('rise') && t < T0('end')) { const n = seg(t).scene, k = t - T0(n); return Math.max(0.35, aptLevel(t, n, k) - 0.25); }
  if (t < T0('end')) return 0.35;
  return -1;
}
const FLOW = -1;   // the street current runs toward -x (west)
function updateFlood(t, L) {
  floodMesh.visible = L > 0; if (!floodMesh.visible) return;
  const p = flG.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, L + 0.035 * Math.sin(0.9 * x - FLOW * 3.2 * t + z * 0.4) + 0.025 * Math.sin(1.7 * z + 2.1 * t)); }
  p.needsUpdate = true; flG.computeVertexNormals();
  flTex.offset.x = FLOW * t * 0.09;
}
// manhole on the road in front of the building
const MAN = { x: DOOR.x - Math.sin(BROT) * 2.9 - 0.4, z: DOOR.z - Math.cos(BROT) * 2.9 };
const manCover = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), std(0x3b3b3e, { metalness: 0.6, roughness: 0.5, map: canvasTex(128, 128, (g, w) => { g.fillStyle = '#4a4a4f'; g.fillRect(0, 0, w, w); g.strokeStyle = '#2a2a2e'; g.lineWidth = 6; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(10, 14 + i * 20); g.lineTo(118, 14 + i * 20); g.stroke(); } }) }));
manCover.castShadow = true; scene.add(manCover);
const manHole = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({ color: 0x0c0a08 })); manHole.rotation.x = -Math.PI / 2; manHole.position.set(MAN.x, ROAD.y + 0.09, MAN.z); scene.add(manHole);
const swirl = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(256, 256, (g, w) => { g.translate(w / 2, w / 2); g.lineCap = 'round'; for (let k = 0; k < 4; k++) { g.rotate(Math.PI / 2); g.strokeStyle = 'rgba(70,48,26,0.75)'; g.lineWidth = 9; g.beginPath(); for (let a = 0; a < 5; a += 0.1) g.lineTo(Math.cos(a) * (8 + a * 22), Math.sin(a) * (8 + a * 22)); g.stroke(); g.strokeStyle = 'rgba(230,215,180,0.55)'; g.lineWidth = 4; g.beginPath(); for (let a = 0.3; a < 5; a += 0.1) g.lineTo(Math.cos(a) * (14 + a * 22), Math.sin(a) * (14 + a * 22)); g.stroke(); } }) }));
swirl.rotation.x = -Math.PI / 2; scene.add(swirl);
const geyser = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 1, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xb59a74, transparent: true, opacity: 0.85, roughness: 0.3 })); scene.add(geyser);
// rescue boat
const boat = new THREE.Group();
{ const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 2.4, 6, 16), std(0xff6a1a, { roughness: 0.6 })); hull.rotation.z = Math.PI / 2; hull.scale.set(1, 1, 1.25); hull.position.y = 0.2; boat.add(hull);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.9), std(0x333333)); floor.position.y = 0.45; boat.add(floor);
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.32), std(0xffffff, { map: canvasTex(256, 52, (g, w, h) => { g.fillStyle = '#ff6a1a'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.font = '900 40px "Inter Display"'; g.textAlign = 'center'; g.fillText('BOMBEIROS', w / 2, 42); }) })); tag.position.set(0, 0.3, 0.72); boat.add(tag);
  const tag2 = tag.clone(); tag2.position.z = -0.72; tag2.rotation.y = Math.PI; boat.add(tag2);
  const motorB = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.3), std(0x222222)); motorB.position.set(1.7, 0.6, 0); boat.add(motorB);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3030 })); light.position.set(-0.6, 0.75, 0); boat.add(light); boat.userData.light = light;
  shadowAll(boat); scene.add(boat); }
// broken power line (the shock callback)
const wireHalves = [];
{ const a = poles[0].position, b = poles[1].position, len = (b.x - a.x) / 2;
  for (const [p, dir] of [[a, 1], [b, -1]]) { const piv = new THREE.Group(); piv.position.set(p.x, p.y + 6.2, p.z + 0.7); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, len, 4), std(0x111111)); w.rotation.z = Math.PI / 2; w.position.x = dir * len / 2; piv.add(w); piv.userData.dir = dir; scene.add(piv); wireHalves.push(piv); } }
// rain streaks around the camera
const RAIN_N = 2600; const rainG = new THREE.BufferGeometry(); const rainP = new Float32Array(RAIN_N * 6); const rainSeed = [];
for (let i = 0; i < RAIN_N; i++) rainSeed.push([R(), R(), R()]);
rainG.setAttribute('position', new THREE.BufferAttribute(rainP, 3));
const rain = new THREE.LineSegments(rainG, new THREE.LineBasicMaterial({ color: 0xcfd8e2, transparent: true, opacity: 0.5, depthWrite: false })); rain.frustumCulled = false; scene.add(rain);
function updateRain(t, strength, center) {
  rain.visible = strength > 0; if (!rain.visible) return;
  const c = center || camera.position, BX = 36, BY = 22, n = Math.floor(RAIN_N * Math.min(1, strength));
  for (let i = 0; i < RAIN_N; i++) {
    const [a, b, d] = rainSeed[i]; const k = i * 6;
    if (i >= n) { rainP.fill(0, k, k + 6); continue; }
    const x = c.x + (a - 0.5) * BX, z = c.z + (b - 0.5) * BX, y = c.y + BY / 2 - (((t * 26 + d * BY) % BY));
    rainP[k] = x; rainP[k + 1] = y; rainP[k + 2] = z; rainP[k + 3] = x - 0.08; rainP[k + 4] = y - 0.9; rainP[k + 5] = z - 0.05;
  }
  rainG.attributes.position.needsUpdate = true; rain.material.opacity = 0.45 * Math.min(1, strength);
}
// rainbow for the ending
const rainbow = new THREE.Group();
['#ff5a5a', '#ffa23a', '#ffe14d', '#5fd16b', '#4aa8ff', '#8e6bff'].forEach((c, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(120 - i * 3.2, 1.6, 6, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.5, fog: false, depthWrite: false })); rainbow.add(m); });
rainbow.position.set(-40, -20, -200); scene.add(rainbow);

// ---------- live view for the house window ----------
const winRT = new THREE.WebGLRenderTarget(640, 400, { samples: 4 });
const winCam = new THREE.PerspectiveCamera(55, 2.4 / 1.5, 0.1, 600);
// ---------- TV news (round 1) ----------
let movieTexRef = null;
const VS_TV = () => 1e9;
const newsTex = canvasTex(512, 288, (g, w, h) => { g.fillStyle = '#123a6b'; g.fillRect(0, 0, w, h); g.fillStyle = '#c62828'; g.fillRect(0, 200, w, 60); g.fillStyle = '#fff'; g.font = '900 34px "Inter Display"'; g.fillText('PLANTÃO: ENCHENTE', 20, 242); g.fillStyle = '#8a6a44'; g.fillRect(250, 40, 230, 140); g.fillStyle = '#d9b89a'; g.fillRect(270, 60, 50, 80); g.fillRect(400, 50, 60, 90); g.fillStyle = '#e8e2d6'; g.beginPath(); g.ellipse(80, 110, 40, 60, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = '#2b2b2b'; g.fillRect(40, 160, 80, 40); });

// ---------- the house (a cutaway set, open toward the camera) ----------
const AO = V(-150, 0, 150);
const apt = new THREE.Group(); apt.position.copy(AO); scene.add(apt);
const AP = (x, y, z) => V(AO.x + x, AO.y + y, AO.z + z);
const aptParts = {}; const pops = [];
const winC = document.createElement('canvas'); winC.width = 512; winC.height = 320; const winG = winC.getContext('2d');
const winTex = new THREE.CanvasTexture(winC); winTex.colorSpace = THREE.SRGBColorSpace;
function drawWindow(t, level, storm) {   // street view through the window: rain, and the water rising outside
  const g = winG, w = 512, h = 320;
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, storm > 0.5 ? '#59636e' : '#7d8a96'); gr.addColorStop(1, storm > 0.5 ? '#9aa4ad' : '#b8c3cc'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  [[20, 150, '#d9b89a'], [120, 120, '#8fb3c4'], [210, 170, '#d8cf9e'], [320, 130, '#c99a9a'], [420, 160, '#a9c4a0']].forEach(([x, bh, c]) => { g.fillStyle = c; g.fillRect(x, h * 0.78 - bh, 80, bh); g.fillStyle = '#4c6577'; for (let r = 0; r < bh / 28 - 1; r++) for (let k = 0; k < 3; k++) g.fillRect(x + 10 + k * 22, h * 0.78 - bh + 12 + r * 28, 13, 15); });
  g.fillStyle = '#5c5f63'; g.fillRect(0, h * 0.78, w, h);
  if (level > 0) { const wy = h * 0.8 - level * h * 0.75; const wg = g.createLinearGradient(0, wy, 0, h); wg.addColorStop(0, '#9c7b52'); wg.addColorStop(1, '#6b5034'); g.fillStyle = wg; g.fillRect(0, wy, w, h - wy); g.strokeStyle = 'rgba(235,220,190,0.7)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); const x0 = ((i * 97 - t * 60) % (w + 100) + w + 100) % (w + 100) - 50; g.moveTo(x0, wy + 4 + (i % 3) * 8); g.lineTo(x0 + 40, wy + 4 + (i % 3) * 8); g.stroke(); } }
  g.strokeStyle = `rgba(230,240,250,${0.25 + 0.45 * storm})`; g.lineWidth = 2; const nR = Math.floor(30 + 120 * storm);
  for (let i = 0; i < nR; i++) { const x = (i * 53.7) % w, y = ((i * 91.3 + t * 700) % (h + 60)) - 30; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 26); g.stroke(); }
  const b = bolt(t); if (b > 0) { g.fillStyle = `rgba(255,255,255,${0.7 * b})`; g.fillRect(0, 0, w, h); }
  g.strokeStyle = '#f4f4f4'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke();
  winTex.needsUpdate = true;
}
{
  const wood = canvasTex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#b07a48', '#a8703f', '#b98452', '#a06a3b'][i % 4]; g.fillRect(0, i * h / 8, w, h / 8); g.fillStyle = 'rgba(60,30,10,0.35)'; g.fillRect(0, i * h / 8, w, 3); g.fillRect((i * 173) % w, i * h / 8, 3, h / 8); } }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(3, 2);
  const wallM = std(0xf1e6d2, { roughness: 0.95, side: THREE.DoubleSide }), accent = std(0x9cc58f, { roughness: 0.95, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.2, 7.2), std(0xffffff, { map: wood, roughness: 0.7 })); floor.position.set(0, -0.1, 0); apt.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 3.8), accent); back.position.set(0, 1.9, -3.5); apt.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.8), wallM); left.rotation.y = Math.PI / 2; left.position.set(-4.6, 1.9, 0); apt.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.8), wallM); right.rotation.y = -Math.PI / 2; right.position.set(4.6, 1.9, 0); apt.add(right);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 7.2), std(0xf7f2ea, { side: THREE.DoubleSide, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.8, 0); apt.add(ceil);
  const base = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.18, 0.04), std(0xffffff)); base.position.set(0, 0.09, -3.48); apt.add(base);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), std(0xffffff, { map: canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#c0504d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2d16b'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#e7c35a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(40 + i * 44, h / 2, 10, 0, Math.PI * 2); g.fill(); } }), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.0, 0.012, -0.6); apt.add(rug);
  // sofa (a group, so it can float in the ending)
  const sofa = new THREE.Group(); sofa.position.set(-1.0, 0, -2.75); apt.add(sofa); aptParts.sofa = sofa;
  const sofaM = std(0x3d6fa8, { roughness: 0.9 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 1.1), sofaM); seat.position.set(0, 0.25, 0); sofa.add(seat);
  const cush = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.95), std(0x4a80bd, { roughness: 0.9 })); cush.position.set(0, 0.54, 0.05); sofa.add(cush);
  const sback = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.3), sofaM); sback.position.set(0, 0.85, -0.45); sofa.add(sback);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 1.1), sofaM); arm.position.set(s * 1.6, 0.4, 0); sofa.add(arm); }
  // coffee table with drinks and a popcorn bowl
  const ctM = std(0x6b4a2e, { roughness: 0.6 });
  const CTZ = -0.6;   // coffee table, with room to stand between it and the sofa
  const ct = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.75), ctM); ct.position.set(-1.0, 0.48, CTZ); apt.add(ct);
  for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), ctM); l.position.set(-1.0 + x, 0.22, CTZ + z); apt.add(l); }
  for (const [x, c] of [[-1.4, 0xe8443a], [-1.15, 0x2e7dd1]]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 12), std(c, { roughness: 0.3 })); cup.position.set(x, 0.59, CTZ + 0.05); apt.add(cup); }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xe8443a)); bowl.position.set(-0.6, 0.72, CTZ); apt.add(bowl);
  const pop = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), std(0xfff3b0, { roughness: 1, flatShading: true })); pop.scale.y = 0.5; pop.position.set(-0.6, 0.66, CTZ); apt.add(pop);
  // TV showing a movie
  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.5), std(0x2e2e33)); tvStand.position.set(-1.0, 0.25, 2.9); apt.add(tvStand);
  const gameTex = canvasTex(512, 288, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5ec8ff'); gr.addColorStop(1, '#bff0ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#58b947'; g.fillRect(0, 230, w, 58); g.fillStyle = '#8a5a2b'; g.fillRect(0, 250, w, 38); g.fillStyle = '#c9773c'; for (let i = 0; i < 5; i++) g.fillRect(120 + i * 40, 140, 34, 34); g.fillStyle = '#ffd23f'; g.fillRect(150, 100, 28, 28); g.fillStyle = '#e8443a'; g.fillRect(60, 196, 26, 34); g.fillStyle = '#1b1b1b'; g.fillRect(360, 204, 30, 26); g.fillStyle = '#fff'; g.font = 'bold 26px monospace'; g.fillText('P1 3400   HI 9900', 14, 32); });
  const movieTex = canvasTex(512, 288, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(1, '#ffd98a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(380, 120, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5a3b6e'; g.beginPath(); g.moveTo(0, 230); g.lineTo(120, 150); g.lineTo(230, 220); g.lineTo(330, 160); g.lineTo(512, 240); g.lineTo(512, 288); g.lineTo(0, 288); g.fill(); g.fillStyle = '#2b2140'; g.fillRect(150, 170, 14, 60); g.beginPath(); g.arc(157, 162, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26); });
  movieTexRef = gameTex;
  const tv = new THREE.Group(); tv.position.set(-1.0, 1.2, 2.95); apt.add(tv); aptParts.tv = tv;
  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 0.1), std(0x16161a, { roughness: 0.4 })); tv.add(tvBody);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.02), new THREE.MeshBasicMaterial({ map: gameTex })); screen.position.z = -0.056; screen.rotation.y = Math.PI; tv.add(screen); aptParts.screen = screen;
  const tvLight = new THREE.PointLight(0xffb27a, 1.2, 6, 2); tvLight.position.set(-1.0, 1.2, 2.3); apt.add(tvLight); aptParts.tvLight = tvLight;
  // sturdy table with the emergency backpack on it
  const tabM = std(0x8a5a32, { roughness: 0.5 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1.7), tabM); top.position.set(2.5, 0.8, -0.5); apt.add(top);
  for (const [x, z] of [[-1.15, -0.72], [1.15, -0.72], [-1.15, 0.72], [1.15, 0.72]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.76, 0.1), tabM); l.position.set(2.5 + x, 0.38, -0.5 + z); apt.add(l); }
  const packT = new THREE.Group(); const bag = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.22), std(0xe8443a, { roughness: 0.8 })); packT.add(bag); const pk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.06), std(0xc0392b)); pk.position.set(0, -0.1, 0.13); packT.add(pk);
  packT.position.set(2.9, 1.82, -0.6); packT.rotation.y = 0.3; apt.add(packT); aptParts.packT = packT;
  // bookshelf on the left wall
  const shelfM = std(0x6e4a2b, { roughness: 0.7 });
  const shelf = new THREE.Group(); shelf.position.set(-4.35, 0, -1.0); apt.add(shelf);
  for (const y of [0.05, 0.75, 1.45, 2.15, 2.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 1.9), shelfM); b.position.y = y; shelf.add(b); }
  for (const z of [-0.95, 0.95]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.8, 0.06), shelfM); sd.position.set(0, 1.4, z); shelf.add(sd); }
  const bcol = [0xe8443a, 0x2e7dd1, 0xffd23f, 0x1e9e57, 0x8e5bd6, 0xf28c28, 0x34495e]; const rb = rnd(21);
  for (const y of [0.78, 1.48, 2.18]) { let z = -0.85; while (z < 0.8) { const th = 0.07 + rb() * 0.07, hh = 0.38 + rb() * 0.2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, hh, th), std(bcol[Math.floor(rb() * bcol.length)], { roughness: 0.7 })); b.position.set(-4.35, y + hh / 2, -1.0 + z + th / 2); apt.add(b); z += th + 0.015; } }
  // window (back wall) with the rainy street outside
  // the window looks at the real street outside (rendered live from a camera on the building's front)
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: winRT.texture })); win.position.set(2.3, 2.1, -3.47); apt.add(win);
  const glassM = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: canvasTex(256, 256, (g, w, h) => { const r = rnd(8); for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, l = 6 + r() * 26; g.strokeStyle = `rgba(220,235,255,${0.25 + r() * 0.35})`; g.lineWidth = 1.5 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + l); g.stroke(); g.fillStyle = 'rgba(230,240,255,0.5)'; g.beginPath(); g.arc(x, y + l, 2 + r() * 2, 0, Math.PI * 2); g.fill(); } }) });
  glassM.map.wrapS = glassM.map.wrapT = THREE.RepeatWrapping; glassM.map.repeat.set(1.6, 1); aptParts.glass = glassM;
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), glassM); glass.position.set(2.3, 2.1, -3.455); apt.add(glass);
  const frameM = std(0xf4f4f4, { roughness: 0.5 });
  for (const [w, h, x, y] of [[2.6, 0.1, 0, 0.8], [2.6, 0.14, 0, -0.8], [0.1, 1.6, -1.25, 0], [0.1, 1.6, 1.25, 0], [0.07, 1.5, 0, 0]]) { const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), frameM); f.position.set(2.3 + x, 2.1 + y, -3.43); apt.add(f); }
  const sill = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.06, 0.3), frameM); sill.position.set(2.3, 1.28, -3.35); apt.add(sill);
  // pictures above the sofa
  [[-1.8, 0xf2c14e], [-0.2, 0x8fd16b]].forEach(([x, c]) => { const p = new THREE.Group(); p.position.set(x, 2.55, -3.45); const fr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), std(0x3a2a1a)); p.add(fr); const art = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), std(c)); art.position.z = 0.03; p.add(art); const sunA = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), std(0xffffff)); sunA.position.set(0.15, 0.1, 0.035); p.add(sunA); apt.add(p); });
  // ceiling lamp
  const ch = new THREE.Group(); ch.position.set(-1.0, 3.8, -1.0); apt.add(ch); aptParts.chand = ch;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), std(0x222222)); cord.position.y = -0.25; ch.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 20, 1, true), std(0xfff0c8, { side: THREE.DoubleSide, emissive: 0xffd27a, emissiveIntensity: 0.35 })); shade.position.y = -0.65; ch.add(shade); aptParts.shade = shade;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 })); bulb.position.y = -0.75; ch.add(bulb); aptParts.bulb = bulb;
  const lamp = new THREE.PointLight(0xffe2a8, 2.2, 10, 1.6); lamp.position.y = -0.8; ch.add(lamp); aptParts.lamp = lamp;
  // kitchen corner: counter + stove
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 2.0), std(0xe9e4da)); counter.position.set(4.1, 0.5, -1.6); apt.add(counter);
  const ctop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 2.05), std(0x5a5a5a)); ctop.position.set(4.1, 1.03, -1.6); apt.add(ctop);
  // breaker box (quadro de luz) and a wall outlet
  const qb = new THREE.Group(); qb.position.set(4.55, 1.35, 1.3); apt.add(qb);
  const qbox = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.5), std(0xdedede, { roughness: 0.5 })); qb.add(qbox);
  const qdoor = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), std(0x9aa3ab, { map: canvasTex(128, 160, (g, w, h) => { g.fillStyle = '#c9cfd4'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(w / 2 + 8, 14); g.lineTo(w / 2 - 14, 64); g.lineTo(w / 2 + 2, 64); g.lineTo(w / 2 - 8, 110); g.lineTo(w / 2 + 16, 52); g.lineTo(w / 2, 52); g.closePath(); g.fill(); g.fillStyle = '#333'; for (let i = 0; i < 4; i++) g.fillRect(14 + i * 28, 124, 18, 26); }) }));
  qdoor.rotation.y = -Math.PI / 2; qdoor.position.x = -0.052; qb.add(qdoor);
  const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), std(0xe8443a)); lever.position.set(-0.09, 0.1, 0); qb.add(lever); aptParts.lever = lever;
  const outlet = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), std(0xffffff, { map: canvasTex(64, 84, (g, w, h) => { g.fillStyle = '#f7f7f7'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; g.beginPath(); g.arc(22, 42, 5, 0, Math.PI * 2); g.arc(42, 42, 5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#bbb'; g.lineWidth = 3; g.strokeRect(4, 4, w - 8, h - 8); }) })); outlet.position.set(0.9, 0.34, -3.47); apt.add(outlet);
  // front door (right wall, near the camera)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.1), std(0x8a5a32)); door.position.set(4.56, 1.2, 2.9); apt.add(door);
  // water: a puddle seeping in under the door, then the whole floor
  const wM = new THREE.MeshStandardMaterial({ color: 0x6e5536, transparent: true, opacity: 0.88, roughness: 0.15, map: flTex.clone() });
  wM.map.repeat.set(3, 2); wM.map.needsUpdate = true;
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 40), wM); puddle.rotation.x = -Math.PI / 2; apt.add(puddle); aptParts.puddle = puddle;
  const aw = new THREE.Mesh(new THREE.BoxGeometry(9.18, 1, 7.18), wM); apt.add(aw); aptParts.water = aw;
  // popcorn that floats away in the ending
  const pr = rnd(77);
  for (let i = 0; i < 18; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), std(0xfff3b0, { flatShading: true, roughness: 1 })); c.userData = { x: -2.4 + pr() * 3.2, z: -2.0 + pr() * 2.6, ph: pr() * 6 }; apt.add(c); pops.push(c); }
  { const PX = 4.1, PZ = -2.3;
    const hob = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.7), std(0x2b2b2e, { roughness: 0.3 })); hob.position.set(PX, 1.08, PZ); apt.add(hob);
    for (const dz of [-0.17, 0.17]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), std(0x111111)); b.position.set(PX - 0.15, 1.11, PZ + dz); apt.add(b); }
    const pan = new THREE.Group(); pan.position.set(PX - 0.15, 1.12, PZ + 0.17); apt.add(pan);
    const pb = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.12, 20, 1, true), std(0x3a3d42, { metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide })); pb.position.y = 0.06; pan.add(pb);
    const pbot = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20), pb.material); pbot.rotation.x = -Math.PI / 2; pbot.position.y = 0.005; pan.add(pbot);
    const oil = new THREE.Mesh(new THREE.CircleGeometry(0.2, 20), std(0xd9a12b, { roughness: 0.1, metalness: 0.2 })); oil.rotation.x = -Math.PI / 2; oil.position.y = 0.07; pan.add(oil);
    for (let i = 0; i < 9; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.12), std(0xf2c14e)); f.position.set(Math.sin(i * 2.1) * 0.11, 0.085, Math.cos(i * 1.7) * 0.11); f.rotation.y = i; pan.add(f); }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.03, 0.05), std(0x1b1b1b)); handle.position.set(-0.36, 0.1, 0); pan.add(handle);
    aptParts.pan = pan;
    const lid = new THREE.Group(); const ld = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.02, 20), std(0xb9c2c8, { metalness: 0.7, roughness: 0.3 })); lid.add(ld); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), std(0x1b1b1b)); kn.position.y = 0.04; lid.add(kn); apt.add(lid); aptParts.lid = lid;
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), std(0xd62f2f)); knob.rotation.z = Math.PI / 2; knob.position.set(3.62, 0.9, PZ + 0.17); apt.add(knob); aptParts.knob = knob;
    const kmark = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.06, 0.012), std(0xffffff)); kmark.position.set(-0.03, 0, 0); knob.add(kmark);
    const pf = makeFlame(8, 0.18); pf.position.set(PX - 0.15, 1.2, PZ + 0.17); apt.add(pf); aptParts.panFlame = pf;
    // curtain beside the window, close to the stove
    const curtM = std(0xd65a7a, { side: THREE.DoubleSide, roughness: 0.9 });
    const cg = new THREE.PlaneGeometry(0.75, 2.6, 6, 12); const cp = cg.attributes.position; for (let i = 0; i < cp.count; i++) cp.setZ(i, 0.05 * Math.sin(cp.getX(i) * 22)); cg.computeVertexNormals();
    const curt = new THREE.Mesh(cg, curtM); curt.position.set(3.95, 1.95, -3.36); apt.add(curt); aptParts.curtain = curt;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 3.4, 8), std(0x333333)); rod.rotation.z = Math.PI / 2; rod.position.set(2.7, 3.28, -3.36); apt.add(rod);
    const cf = makeFlame(9, 0.35); cf.position.set(3.95, 1.0, -3.3); apt.add(cf); aptParts.curtFlame = cf;
    // smoke gathering under the ceiling
    const sm = new THREE.Mesh(new THREE.BoxGeometry(9.15, 1, 7.15), new THREE.MeshBasicMaterial({ color: 0x3c3e42, transparent: true, opacity: 0.62, depthWrite: false })); apt.add(sm); aptParts.smoke = sm;
    const det = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 16), std(0xf4f4f4)); det.position.set(1.2, 3.77, -1.0); apt.add(det);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020 })); led.position.set(1.25, 3.74, -0.92); apt.add(led); aptParts.led = led;
    aptParts.doorSmoke = makeSmokeColumn(12); aptParts.doorSmoke.position.set(4.3, 0.1, 2.9); aptParts.doorSmoke.scale.setScalar(0.45); apt.add(aptParts.doorSmoke);
    aptParts.doorGlow = new THREE.PointLight(0xff7a2a, 0, 6, 1.5); aptParts.doorGlow.position.set(4.2, 0.3, 2.9); apt.add(aptParts.doorGlow);
    aptParts.wisps = makeSmokeColumn(10); aptParts.wisps.position.set(PX - 0.15, 1.2, PZ + 0.17); aptParts.wisps.scale.setScalar(0.25); apt.add(aptParts.wisps);
  }
  apt.traverse(m => { if (m.isMesh && m !== win) { m.castShadow = true; m.receiveShadow = true; } });
  aw.castShadow = puddle.castShadow = false;
  ceil.castShadow = back.castShadow = left.castShadow = right.castShadow = false;
}

// ---------- fire seen from the street: flames out of their window, smoke above ----------
const facadeFire = makeFlame(12, 0.9); facadeFire.scale.setScalar(1.6); scene.add(facadeFire);
const facadeSmoke = makeSmokeColumn(30); scene.add(facadeSmoke);
const doorFire = makeFlame(12, 0.7); doorFire.scale.setScalar(1.7); scene.add(doorFire);
// the whole building on fire: one flame per front window, smoke from the roof
const BFIRE = []; const noLight = f => { f.remove(f.userData.light); f.userData.light = { intensity: 0, position: { y: 0 } }; return f; };
{ const cols = [-3.375, -1.125, 1.125, 3.375], floors = [4.85, 8.1, 11.35, 1.75];
  floors.forEach((y, fi) => cols.forEach((x, ci) => { if (fi === 3 && Math.abs(x) < 1.2) return;   // not over the front door
    const f = noLight(makeFlame(9, 0.85)); f.scale.setScalar(2.1); scene.add(f);
    const d = Math.abs(fi === 3 ? -1 : fi) + Math.abs(ci - 1) * 0.6;   // starts on the 2nd floor, left of their window column
    BFIRE.push({ f, lx: x, ly: y - 0.9, d, out: (fi + 0.2 * ci) / 4 }); })); }
const roofSmoke = [0, 1, 2].map(i => { const c = makeSmokeColumn(24); scene.add(c); return c; });
const fireGlow = [new THREE.PointLight(0xff7a2a, 0, 40, 1.2), new THREE.PointLight(0xff9a3a, 0, 40, 1.2)]; fireGlow.forEach(l => scene.add(l));
// glass shards bursting out of their window
const SHARDS = [];
{ const gm = new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide });
  const r = rnd(99); for (let i = 0; i < 46; i++) { const g = new THREE.BufferGeometry(); const a = 0.08 + r() * 0.18; g.setAttribute('position', new THREE.Float32BufferAttribute([0, a, 0, -a * 0.7, -a * 0.6, 0, a * 0.8, -a * 0.4, 0], 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, gm); m.userData = { vx: (r() - 0.5) * 3.2, vy: 0.5 + r() * 2.2, vz: -(1.5 + r() * 3.0), sp: (r() - 0.5) * 14, ox: (r() - 0.5) * 1.6, oy: (r() - 0.5) * 1.0 }; m.visible = false; scene.add(m); SHARDS.push(m); } }
// extinguisher spray (one cloud per bean)
function makeSpray() { const n = 160, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xf4f7fb, size: 0.75, transparent: true, opacity: 0.85, depthWrite: false, map: canvasTex(64, 64, (c, w) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }) })); pts.frustumCulled = false; pts.visible = false; scene.add(pts); return pts; }
const sprays = [makeSpray(), makeSpray()];
function updateExtSpray(pts, from, to, t, on) {
  pts.visible = on; if (!on) return; const P = pts.geometry.attributes.position, n = P.count;
  for (let i = 0; i < n; i++) { const u = ((i / n) + t * 1.6) % 1, q = from.clone().lerp(to, u); q.y += Math.sin(u * Math.PI) * 0.8; const sp = 0.15 + u * 1.4; P.setXYZ(i, q.x + Math.sin(i * 7.3) * sp, q.y + Math.cos(i * 3.1) * sp, q.z + Math.sin(i * 1.7) * sp); }
  P.needsUpdate = true;
}
// a falling ember
const ember = makeFlame(5, 0.15); ember.remove(ember.userData.light); ember.userData.light = { intensity: 0, position: { y: 0 } }; scene.add(ember);
// ---------- soft fill light for the house (so faces never go dark) ----------
const houseFill = new THREE.DirectionalLight(0xfff1e0, 0.9); houseFill.position.copy(AP(1.5, 4.5, 9)); houseFill.target.position.copy(AP(-0.5, 1.0, -1.5)); scene.add(houseFill); scene.add(houseFill.target);
const windowLight = new THREE.PointLight(0xcfe3ff, 0, 9, 1.4); windowLight.position.copy(AP(2.3, 2.1, -2.6)); scene.add(windowLight);
// ---------- the kitchen fire (and the smoke) ----------
function aptLevel() { return 0; }
let powerOff = false;
function fireState(t, n, lt) {   // this time the fire comes from the building: smoke under the door, glow outside
  const gag = GAGN.includes(n) || (n === 'jump' && lt < 0.85);
  let smoke = 0, door = 0;
  if (n === 'explain') { smoke = ss(E.fum, E.sobe, t) * 0.12 + ss(E.sobe, E.teto + 0.4, t) * 0.25 + ss(E.desce - 0.1, E.desce + 1.3, t) * 0.55; door = 1; }
  else if (!gag) { smoke = clamp(ss(F0, W_FOGO + 1.5, t) * 0.35 + ss(T0('friend1'), TE('friend1'), t) * 0.2, 0, 0.6); door = ss(F0 + 0.5, W_FOGO, t); }
  else { smoke = 0.5; door = 1; }
  return { pan: 0, curt: 0, smoke, lidOn: false, knobOff: false, soot: 0, gag, door };
}
function updateHouse(t, n, lt) {
  const F = fireState(t, n, lt);
  updateFlame(aptParts.panFlame, t, F.pan); updateFlame(aptParts.curtFlame, t, F.curt * 1.9);
  aptParts.curtain.material.color.set(0xd65a7a).lerp(new THREE.Color(0x2a1d18), F.curt * 0.8);
  aptParts.curtain.scale.y = 1 - 0.25 * F.curt; aptParts.curtain.position.y = 1.95 + 0.32 * F.curt;
  const L = aptParts.lid; if (F.lidOn) { L.position.set(aptParts.pan.position.x, 1.27, aptParts.pan.position.z); L.rotation.set(0, 0, 0); } else { L.position.set(4.05, 1.12, -1.2); L.rotation.set(0, 0, 0); }
  aptParts.knob.rotation.x = F.knobOff ? Math.PI / 2 : 0;
  const sh = F.smoke * 2.3; aptParts.smoke.visible = sh > 0.02; aptParts.smoke.scale.y = Math.max(sh, 0.01); aptParts.smoke.position.set(0, 3.8 - sh / 2, 0);
  aptParts.led.material.color.setHex(F.smoke > 0.06 && Math.floor(t * 3) % 2 ? 0xff2020 : 0x330000);
  updateSmokeColumn(aptParts.wisps, t, 0, 3, 0.3);
  updateSmokeColumn(aptParts.doorSmoke, t, F.door, 2.6, -0.6); aptParts.doorGlow.intensity = F.door * (2.2 + 0.6 * Math.sin(t * 13));
  aptParts.glass.visible = !(n === 'jump' || n === 'gag3');
  powerOff = false;
  aptParts.lamp.intensity = 2.2; aptParts.tvLight.intensity = 1.0; aptParts.screen.material.map = movieTexRef;
  houseFill.visible = windowLight.visible = apt.visible; houseFill.intensity = 0.8; windowLight.intensity = 1.0;
  aptParts.water.visible = false; aptParts.puddle.visible = false; pops.forEach(c => c.visible = false);
  aptParts.sofa.position.set(-1.0, 0, -2.75); aptParts.sofa.rotation.set(0, 0, 0); aptParts.tv.position.set(-1.0, 1.2, 2.95); aptParts.tv.rotation.set(0, 0, 0); aptParts.chand.visible = true; aptParts.packT.visible = false;
  return { W: 0, lift: 0, bob: 0, F };
}

// ---------- director ----------
let shake = 0, flash = 0;
function setParent(bean, parent) { if (bean.root.parent !== parent) parent.add(bean.root); }
const SOFA_H = { x: AO.x - 1.65, z: AO.z - 2.65 }, SOFA_F = { x: AO.x - 0.35, z: AO.z - 2.65 }, SOFA_Y = AO.y + 0.55;
const BREAKER = { x: AO.x + 3.95, z: AO.z + 0.75 };
const BY = bp.y, STOOP_Y = BY + 0.545, STEP2_Y = BY + 0.22;
const bw = (lx, ly, lz) => { const v = V(lx, ly, lz); return v.applyAxisAngle(V(0, 1, 0), BROT).add(bp); };   // building local -> world
const ROOF = (lx, lz) => bw(lx, 13, lz);
const FRONT_RY = Math.PI + BROT;     // facing out of the building's front
const DOORWAY = bw(0, 0, -4.15), STOOP_FRONT = bw(0, 0, -4.75), STEP2 = bw(0, 0, -5.25);
const stairsDist = (y) => { let best = 0; for (let d = 0; d < STAIR_TOTAL; d += 0.05) { if (onStairs(d).y - IO.y <= y + 1e-3) best = d; } return best; };
const D_FLOOR2 = stairsDist(6.0);
const WINPOS = () => bw(1.0, 7.3, -4.15), LANDPOS = () => bw(1.0, 0, -6.9);
function direct(t, n, lt, g, H) {
  const p = clamp(lt / g.dur);
  const hm = clamp(mouthOf(TL.heroMouth, REAL_T) * 1.4), fm = clamp(mouthOf(TL.friendMouth, REAL_T) * 1.4);
  let cam = { pos: V(0, 5, -10), tgt: V(0, 1, 5), fov: 45 };
  shake = 0; flash = 0; dogHelmet.visible = false; sprays.forEach(sp => sp.visible = false);
  const gaming = { legs: 'sit', sitY: 0.6, lean: -0.15, ctrl: true, look: [0, -0.2] };
  let hp = Object.assign({ x: SOFA_H.x, y: SOFA_Y, z: SOFA_H.z, ry: 0.15, smile: 1 }, gaming, { armL: [0.25, -0.5, -1.2 + 0.1 * Math.sin(t * 12)], armR: [0.25, -0.5, -1.2 + 0.1 * Math.sin(t * 10 + 2)] });
  let fp = Object.assign({ x: SOFA_F.x, y: SOFA_Y, z: SOFA_F.z, ry: -0.15, smile: 1 }, gaming, { armL: [0.25, -0.5, -1.2 + 0.1 * Math.sin(t * 11)], armR: [0.25, -0.5, -1.2 + 0.1 * Math.sin(t * 13 + 1)] });
  let dg = { mode: 'lie', x: AO.x - 2.6, y: AO.y + 0.02, z: AO.z + 0.2, ry: 0.6 };
  board.visible = false;
  setParent(hero, scene); setParent(friend, scene); hero.root.scale.setScalar(1); friend.root.scale.setScalar(1);
  const PH = { x: AO.x + 0.45, z: AO.z - 1.6 }, PF = { x: AO.x - 0.6, z: AO.z - 1.6 }, WIN_F = { x: AO.x + 1.3, z: AO.z - 1.95 };
  const HD = bw(0.62, 0, -4.6), DD = bw(-1.0, 0, -4.45);
  const park = { h: V(16.4, ROAD.y, 13.0), f: V(17.9, ROAD.y, 13.1), d: V(17.2, ROAD.y, 12.4) };
  const stand = (o, ex) => Object.assign({ x: o.x, z: o.z, y: AO.y }, ex);
  const alarmed = { eyesWide: true, brow: 0.9, smile: 0 };

  if (n === 'title') {
    const u = ease(p); cam.pos = vl(V(-4, 26, 3), V(9, 6.5, 9), u); cam.tgt = vl(V(14, 4, 22), V(bp.x, 7, bp.z), u); cam.fov = 52;
    hp.visible = fp.visible = false; dg.mode = 'hide';
  } else if (n === 'home') {
    const c1 = wordAt('você', g.start) - g.start + 0.4, c2 = wordAt('cachorro', g.start) - g.start;
    if (lt < c1) { const k = ease(clamp(lt / c1)); cam.pos = vl(V(bp.x - 6, 3.5, bp.z - 19), V(bp.x - 3, 4.5, bp.z - 13), k); cam.tgt = V(bp.x, 7.5, bp.z); cam.fov = 56; hp.visible = fp.visible = false; dg.mode = 'hide'; }
    else if (lt < c2) { cam.pos = AP(1.6, 2.1, 4.4); cam.tgt = AP(-1.1, 1.0, -2.3); cam.fov = 50; }
    else { cam.pos = AP(-2.0, 0.9, 1.7); cam.tgt = AP(-2.6, 0.3, 0.2); cam.fov = 42; }
  } else if (n === 'calm') {
    if (lt < 1.4) { cam.pos = vl(AP(-0.9, 1.5, 1.6), AP(-0.9, 1.45, 1.1), p); cam.tgt = AP(-1.0, 1.25, -2.6); cam.fov = 44; }
    else { cam.pos = AP(-1.4, 1.45, -0.3); cam.tgt = AP(-1.6, 1.3, -2.6); cam.fov = 36; hp.look = [Math.sin(lt * 2.5) * 0.9, 0.2]; hp.brow = -0.4; hp.smile = 0; }
  } else if (n === 'fire') {
    const wm = W_MINUTOS - g.start, wf = W_FOGO - g.start;
    if (lt < wm - 0.3) { hp.visible = fp.visible = false; dg.mode = 'hide'; const k = ease(clamp(lt / (wm - 0.3))); cam.pos = vl(V(12.5, 3.2, 12.5), V(13.5, 4.0, 13.5), k); cam.tgt = bw(-1.1, 4.4, -4.1); cam.fov = 44; }
    else if (lt < wf - 0.6) { hp.visible = fp.visible = false; dg.mode = 'hide'; const k = ease(clamp((lt - wm + 0.3) / (wf - wm))); cam.pos = vl(V(19, 3, 7), V(25, 6.5, 4), k); cam.tgt = V(17, 7, 22); cam.fov = 54; }
    else { hp = stand(PH, Object.assign({ ry: 1.4, armL: A.up, armR: A.up, shout: 0.4 }, alarmed)); fp = stand(PF, Object.assign({ ry: 1.2, armL: A.up, armR: A.up }, alarmed)); dg.mode = 'scared'; cam.pos = AP(-1.8, 1.9, 2.3); cam.tgt = AP(2.4, 1.0, 0.8); cam.fov = 58; }
  } else if (n === 'friend1') {
    hp = stand(PH, Object.assign({ ry: 0, armL: A.rest, armR: A.rest, look: [-0.5, 0] }, alarmed));
    fp = stand(PF, Object.assign({ ry: 0.1, armL: A.up, armR: A.up, mouth: fm }, alarmed));
    dg.mode = 'scared'; cam.pos = AP(-0.1, 1.55, 0.9); cam.tgt = AP(-0.1, 1.2, -1.8); cam.fov = 48; shake = 0.1;
  } else if (n === 'explain') {
    hp.visible = fp.visible = false; dg.mode = 'hide';
    if (t > E.fum - 0.4) { const k = ease(clamp((t - E.fum + 0.4) / 9)); cam.pos = vl(AP(0.3, 1.5, 3.2), AP(0.6, 1.3, 2.8), k); cam.tgt = vl(AP(1.6, 2.4, -1.0), AP(1.6, 1.8, -1.0), k); cam.fov = 58; }
    else { const dc = dioCam(t); cam.pos = dc.pos; cam.tgt = dc.tgt; cam.fov = 48; }
  } else if (IOSC.includes(n)) {
    const ELH = { x: IO.x - 6.45, z: IO.z - 2.5 }, ELF = { x: IO.x - 5.55, z: IO.z - 2.45 };
    const inCab = n === 'elevgag' || (n === 'exit2' && t > W_ENERGIA - 0.5);
    const H1 = { x: IO.x - 3.4, z: IO.z + 1.8 }, F1 = { x: IO.x - 5.0, z: IO.z + 1.6 };
    if (n === 'exit1' || (n === 'exit2' && !inCab)) {
      // the bad idea, for real: into the elevator
      const k = n === 'exit2' ? ss(0.1, 1.3, lt) : 0;
      hp = { x: lerp(H1.x, ELH.x, k), y: IO.y + 9, z: lerp(H1.z, ELH.z, k), ry: k > 0 ? Math.atan2(ELH.x - H1.x, ELH.z - H1.z) : -0.5, run: k > 0 && k < 1 ? 0.7 : 0, phase: lt * 11, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.6, smile: 0, look: [-0.5, 0] };
      fp = { x: lerp(F1.x, ELF.x, k), y: IO.y + 9, z: lerp(F1.z, ELF.z, k), ry: k > 0 ? Math.atan2(ELF.x - F1.x, ELF.z - F1.z) : -2.6, run: k > 0 && k < 1 ? 0.7 : 0, phase: lt * 11 + 1, armL: A.rest, armR: n === 'exit1' ? A.point : A.rest, mouth: n === 'exit1' ? fm : 0, smile: 1, brow: -0.3 };
      if (k >= 1) { hp.ry = fp.ry = 0; }
      dg = { mode: 'carried' };
      if (n === 'exit1') { cam.pos = V(IO.x - 4.0, IO.y + 11.0, IO.z + 5.8); cam.tgt = V(IO.x - 4.6, IO.y + 9.6, IO.z + 0.8); cam.fov = 50; }
      else { cam.pos = V(IO.x - 4.4, IO.y + 11.0, IO.z + 5.8); cam.tgt = V(IO.x - 5.6, IO.y + 9.6, IO.z - 0.6); cam.fov = 48; }
    } else if (inCab) {
      // inside the elevator, filmed from the top corner like a security camera: the power goes, the smoke comes in
      const k = n === 'elevgag' ? lt : t - W_ENERGIA, bad = n === 'elevgag';
      hp = { x: ELH.x, y: IO.y + 9, z: ELH.z, ry: 0.5, armL: bad ? [2.2, -0.4, -2.3] : A.rest, armR: bad ? A.up : A.rest, eyesWide: true, brow: 1, smile: 0, mouth: bad && k > 0.9 ? 0.5 + 0.3 * Math.abs(Math.sin(k * 9)) : 0, shout: bad && k < 0.9 ? 0.6 : 0, wob: bad ? 0.2 : 0.05, soot: bad ? ss(0, 2, k) * 0.6 : 0, look: [0.3, 0.2] };
      fp = { x: ELF.x, y: IO.y + 9, z: ELF.z, ry: 0.25, armL: A.up, armR: bad ? [2.2, -0.4, -2.3] : A.up, eyesWide: true, brow: 1, smile: 0, shout: 0.6, wob: bad ? 0.3 : 0.1, soot: bad ? ss(0, 2, k) * 0.6 : 0, look: [0.3, 0.2] };
      dg = { mode: 'carried' };
      cam.pos = V(IO.x - 5.05, IO.y + 11.45, IO.z - 1.2); cam.tgt = V(IO.x - 6.05, IO.y + 10.0, IO.z - 2.6); cam.fov = VERT ? 66 : 60; shake = bad ? 0.08 : 0;
    } else {
      // idea + crawl: same hallway, the camera follows them crouching to the stairs and down a few steps... then out of the front door
      const P = (x, y, z) => V(IO.x + x, IO.y + y, IO.z + z);
      const pathH = [P(-3.4, 9, 1.8), P(-1.4, 9, 2.15), P(0, 9, 2.15), P(4, 7.5, 2.15)], pathF = [P(-5.0, 9, 1.6), P(-2.2, 9, 2.15), P(-1.4, 9, 2.15), P(0, 9, 2.15), P(4, 7.5, 2.15)];
      const along = (pts, d) => { d = Math.max(0, d); for (let i = 1; i < pts.length; i++) { const L = pts[i].distanceTo(pts[i - 1]); if (d <= L || i === pts.length - 1) { const k = Math.min(1, d / L), q = pts[i - 1].clone().lerp(pts[i], k); return { x: q.x, y: q.y, z: q.z, ry: Math.atan2(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z) }; } d -= L; } };
      const tGo = wordAt('vem', T0('idea')), cutT = W_ESCADA + 0.5, Ltot = 5.6, sp = Ltot / (cutT - tGo);
      const dH = clamp((t - tGo) * sp, 0, Ltot), walking = t > tGo && dH < Ltot;
      const h0 = along(pathH, dH), f0 = along(pathF, dH - 0.2);
      const cl = t > W_PANO - 0.2;
      if (t < cutT) {
        const still = !walking;
        hp = { x: h0.x, y: h0.y, z: h0.z, ry: still ? -0.4 : h0.ry, legs: 'crouch', lean: 0.45, run: walking ? 0.8 : 0, phase: t * 9, brow: n === 'idea' ? -0.3 : 0.4, smile: n === 'idea' ? 1 : 0, mouth: n === 'idea' ? hm : 0, cloth: cl,
          armL: n === 'idea' && !walking ? A.pointUp : cl ? [2.3, -0.3, -2.4] : [0.95, -0.15, -1.5], armR: A.rest };
        fp = { x: f0.x, y: f0.y, z: f0.z, ry: still ? 0.5 : f0.ry, legs: 'crouch', lean: 0.45, run: walking ? 0.8 : 0, phase: t * 9 + 1.3, armL: [0.95, -0.15, -1.5], armR: cl ? [2.3, -0.3, -2.4] : [0.95, -0.15, -1.5], brow: 0.4, smile: 0, cloth: cl };
        dg = { mode: 'carried' };
        const cx = Math.min(h0.x, IO.x + 3.0);
        const kB = ease(ss(2.2, 3.8, dH));   // crane over the stairwell to face them as they come down the flight
        cam.pos = vl(V(cx - 0.5, IO.y + 11.3, IO.z + 6.0), V(IO.x + 4.4, IO.y + 10.0, IO.z + 3.3), kB); cam.tgt = vl(V(cx + 0.3, h0.y + 0.4, IO.z + 2.0), V(h0.x - 0.6, h0.y + 0.6, IO.z + 2.1), kB); cam.fov = VERT ? 52 : 48;
      } else {
        const lt2 = t - cutT, k = ss(0.1, 1.3, lt2), up = lt2 > 1.4;
        const hz = lerp(-3.9, -4.6, k), fz = lerp(-3.6, -4.55, ss(0.3, 1.5, lt2));
        const HP = bw(0.6, 0, hz), FP = bw(-0.5, 0, fz), wk = lt2 < 1.4;
        hp = { x: HP.x, y: STOOP_Y, z: HP.z, ry: FRONT_RY, legs: up ? undefined : 'crouch', run: wk ? 0.8 : 0, phase: t * 9, lean: up ? -0.1 : 0.5, brow: up ? -0.3 : 0.4, smile: up ? 1 : 0, cloth: !up, armL: up ? A.cheer : [2.3, -0.3, -2.4], armR: up ? A.thumb : A.rest, visible: hz < -3.95 };
        fp = { x: FP.x, y: STOOP_Y, z: FP.z, ry: FRONT_RY, legs: up ? undefined : 'crouch', run: wk ? 0.8 : 0, phase: t * 9 + 1.3, lean: up ? -0.1 : 0.5, brow: 0.2, smile: up ? 1 : 0, cloth: !up, armL: up ? A.up : [0.95, -0.15, -1.5], armR: up ? A.up : [2.3, -0.3, -2.4], visible: fz < -3.95, mouth: up ? 0.6 : 0 };
        dg = { mode: 'carried' };
        cam.pos = bw(0.1, 0, -9.0); cam.pos.y = STOOP_Y + 1.5; cam.tgt = bw(0.1, 0, -4.6); cam.tgt.y = STOOP_Y + 1.1; cam.fov = 44;
      }
    }
  } else if (n === 'roll') {
    // outside: an ember falls on the friend's back; stop, drop and roll
    const C = bw(-0.6, 0, -7.0), wc = W_CORRER - g.start, wp = W_PARE - g.start, wd = W_DEITE - g.start, wr = W_ROLE - g.start, wa = W_APAGAR - g.start, we = EMBER_T - g.start;
    hp = { x: HD.x, y: STOOP_Y, z: HD.z, ry: FRONT_RY, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.6, smile: 0, look: [-0.4, -0.3] };
    dg = { mode: 'scared', x: DD.x, y: STOOP_Y, z: DD.z, ry: FRONT_RY };
    let fx = C.x, fz = C.z, extra = {}, fire = 0;
    if (lt < we) { extra = { armL: A.rest, armR: A.rest, look: [0, 0.6], brow: 0.3 }; }
    else if (lt < wc) { extra = { armL: A.up, armR: A.up, shout: 0.5, eyesWide: true, wob: 0.3 }; fire = ss(we, we + 0.3, lt) * 0.7; }
    else if (lt < wp) { const an = (lt - wc) * 4.5; fx = C.x + Math.cos(an) * 1.1; fz = C.z + Math.sin(an) * 1.1; extra = { ry: -an, run: 1, phase: lt * 15, armL: A.up, armR: A.up, shout: 0.6, eyesWide: true }; fire = lerp(0.7, 1.6, ss(wc, wp, lt)); }
    else if (lt < wd) { extra = { armL: A.rest, armR: A.rest, eyesWide: true }; fire = 1.6; }
    else { extra = { lie: true, armL: A.up, armR: A.up, smile: lt > wa ? 1 : 0, eyesWide: lt < wa }; fire = lt < wr ? 1.6 : lerp(1.6, 0, ss(wr, wa, lt)); if (lt > wr) fx = C.x + 0.9 * Math.sin((lt - wr) * 2.4); }
    fp = Object.assign({ x: fx, z: fz, y: ROAD.y, ry: FRONT_RY + 0.4, smile: 0, brow: 0.6, backFire: fire }, extra);
    cam.pos = bw(2.6, 0, -11.2); cam.pos.y = STOOP_Y + 1.9; cam.tgt = bw(-0.6, 0, -6.6); cam.tgt.y = ROAD.y + 0.9; cam.fov = 50;
  } else if (n === 'suit' || n === 'blast') {
    // option 1 (the cool one): suit up, grab extinguishers and put the whole building out
    const suited = t > W_VESTIR + 0.2, armed = t > W_EXT + 0.2, spraying = t > W_APAGAR_P - 0.1;
    const H0 = bw(0.9, 0, -9.6), F1 = bw(-0.9, 0, -9.6), D0 = bw(0, 0, -10.2);
    const face = spraying ? FRONT_RY + Math.PI : FRONT_RY;
    const aim = [2.2, 0.0, -0.4];
    hp = { x: H0.x, y: ROAD.y, z: H0.z, ry: face, suit: suited, ext: armed, armR: armed ? (spraying ? aim : [1.0, 0.2, -1.3]) : A.hips, armL: suited && !spraying ? A.thumb : A.rest, smile: 1, brow: -0.4, smirk: suited && !spraying };
    fp = { x: F1.x, y: ROAD.y, z: F1.z, ry: face, suit: suited, ext: armed, armR: armed ? (spraying ? aim : [1.0, 0.2, -1.3]) : A.rest, armL: suited && !spraying ? A.cheer : A.rest, smile: 1, brow: -0.3 };
    dg = { mode: 'sit', x: D0.x, y: ROAD.y, z: D0.z, ry: face }; dogHelmet.visible = suited;
    if (!spraying) { const k = ease(clamp(lt / 2.5)); cam.pos = vl(bw(0, 0, -12.2), bw(0, 0, -12.8), k); cam.pos.y = ROAD.y + 0.7; cam.tgt = bw(0, 0, -9.6); cam.tgt.y = ROAD.y + 1.3; cam.fov = 48; if (Math.abs(t - W_VESTIR - 0.2) < 0.12) flash = 0.6; }
    else { const k = ease(clamp((t - W_APAGAR_P) / 6)); cam.pos = vl(bw(3.4, 0, -15.6), bw(2.4, 0, -17.0), k); cam.pos.y = ROAD.y + lerp(2.0, 2.8, k); cam.tgt = bw(0, 0, -6); cam.tgt.y = ROAD.y + lerp(3.4, 4.6, k); cam.fov = 60; }
  } else if (n === 'real' || n === 'q0') {
    hp = { x: park.h.x, y: ROAD.y, z: park.h.z, ry: Math.PI, armL: A.rest, armR: A.rest, smile: 1, brow: 0 };
    fp = { x: park.f.x, y: ROAD.y, z: park.f.z, ry: Math.PI, armL: A.rest, armR: A.rest, smile: 1, soot: 0.6 };
    dg = { mode: 'sit', x: park.d.x, y: ROAD.y, z: park.d.z, ry: Math.PI };
    if (lt < W_LONGE - g.start - 0.2) { hp = Object.assign(hp, { armL: A.shrug, armR: A.shrug, brow: 0.4, smile: 0 }); cam.pos = V(17.0, 2.0, 9.6); cam.tgt = V(17.0, 1.6, 13); cam.fov = 46; }
    else if (lt < W_193 - g.start + 1.4) { hp = Object.assign(hp, { phone: true, armR: [2.1, -0.35, -2.4], brow: -0.4 }); cam.pos = V(17.0, 2.0, 9.6); cam.tgt = V(17.0, 1.6, 13); cam.fov = 44; }
    else { hp.ry = 0.2; fp.ry = -0.2; dg.ry = 0; cam.pos = V(25, 4.6, 7.5); cam.tgt = V(14, 6.0, 20); cam.fov = 52; }
  } else if (GAGN.includes(n) || (n === 'jump' && lt < 0.85)) {
    // the ending: smoke in the flat, and the friend eyeing the window
    hp = stand(PH, Object.assign({ ry: 0.4, armL: A.rest, armR: A.rest, look: [0.6, 0] }, alarmed));
    fp = stand(WIN_F, { ry: 2.4, armL: A.rest, armR: A.rest, smile: 1, brow: -0.3, look: [0.3, 0] });
    dg = { mode: 'scared', x: AO.x - 1.6, y: AO.y, z: AO.z - 1.4, ry: 0.4 };
    if (n === 'q1') { cam.pos = AP(-1.0, 1.9, 1.8); cam.tgt = AP(1.2, 1.3, -2.4); cam.fov = 52; }
    else if (n === 'q3') { fp = Object.assign(fp, { mouth: fm, armR: [1.5, 0.3, -0.1], ry: 0.6, smirk: true }); cam.pos = AP(0.9, 1.5, 0.4); cam.tgt = AP(1.3, 1.2, -1.9); cam.fov = 44; if (VERT) { cam.pos = AP(-0.2, 2.0, 1.4); cam.tgt = AP(1.4, 1.2, -2.2); cam.fov = 50; } }
    else if (n === 'ohoh') { hp = Object.assign(hp, { mouth: Math.max(hm, 0.2), ry: 0.2 }); cam.pos = AP(-0.4, 1.6, 0.7); cam.tgt = AP(0.7, 1.3, -1.8); cam.fov = 46; if (VERT) { cam.pos = AP(-0.6, 1.9, 1.3); cam.tgt = AP(1.2, 1.2, -2.0); cam.fov = 50; } }
    else { const k = clamp(lt / 0.75); fp = stand({ x: lerp(WIN_F.x, AO.x + 2.3, k), z: lerp(WIN_F.z, AO.z - 3.0, k) }, { ry: Math.PI - 0.6, run: 1, phase: lt * 16, armL: A.up, armR: A.up, shout: 0.6, smile: 1, brow: -0.5 }); fp.y = AO.y + 0.4 * Math.sin(k * Math.PI); hp = Object.assign(hp, { armL: A.stop, armR: A.stop, shout: 0.5 }); cam.pos = AP(0.6, 1.9, 1.2); cam.tgt = AP(2.2, 1.6, -3.0); cam.fov = 54; flash = lt > 0.72 ? 0.5 : 0; }
  } else if (n === 'jump' || n === 'gag3') {
    // out of the window, glass everywhere, face first onto the sidewalk, on fire
    hp.visible = false; dg.mode = 'hide';
    const A0 = WINPOS(), B0 = LANDPOS();
    if (n === 'jump') {
      const k = clamp((t - CRASH) / (LAND - CRASH)), down = t > LAND;
      const pos = A0.clone().lerp(B0, k); pos.y = lerp(A0.y - 0.9, ROAD.y, k * k) + Math.sin(k * Math.PI) * 0.6;
      fp = { x: pos.x, y: down ? ROAD.y : pos.y, z: pos.z, ry: FRONT_RY, armL: A.up, armR: A.up, shout: down ? 0 : 0.7, eyesWide: !down, smile: 0, backFire: down ? ss(LAND, LAND + 0.3, t) * 0.55 : 0, faceDown: down, tumble: down ? 0 : k * 1.4, soot: down ? 0.7 : 0 };
      cam.pos = bw(5.5, 0, -14.0); cam.pos.y = ROAD.y + 4.2; cam.tgt = V(pos.x, Math.max(ROAD.y + 0.8, (down ? ROAD.y : pos.y) + 0.6), pos.z); cam.fov = 56; shake = Math.abs(t - LAND) < 0.4 && t > LAND ? 0.6 : 0;
    } else {
      fp = { x: B0.x, y: ROAD.y, z: B0.z, ry: FRONT_RY, armL: A.thumb, armR: A.rest, mouth: fm, smile: 1, squint: 0.6, backFire: 0.45, faceDown: true, soot: 0.7 };
      cam.pos = bw(3.0, 0, -10.2); cam.pos.y = ROAD.y + 1.6; cam.tgt = B0.clone(); cam.tgt.y = ROAD.y + 0.4; cam.fov = 44;
    }
  } else if (n === 'end') {
    hp = { x: park.h.x, y: ROAD.y, z: park.h.z, ry: Math.PI, armL: A.wave, armR: A.hips, shades: true, smile: 1 };
    fp = { x: park.f.x, y: ROAD.y, z: park.f.z, ry: Math.PI, armL: A.rest, armR: A.thumb, shades: true, smile: 1, soot: 0.7 };
    dg = { mode: 'sit', x: park.d.x, y: ROAD.y, z: park.d.z, ry: Math.PI };
    cam.pos = vl(V(17.2, 2.4, 10.0), VERT ? V(17.2, 3.4, 9.2) : V(17.2, 6.5, 4.0), ease(p)); cam.tgt = V(17.2, VERT ? 3.0 : 2.4, 14); cam.fov = 48;
  }
  for (const [pp, b] of [[hp, hero], [fp, friend]]) if (b.root.parent === scene && pp.legs !== 'sit') keepOut(pp, 0.46);
  if (dg.mode !== 'carried' && dg.mode !== 'hide') keepOut(dg, 0.38);
  hero.pose(t, hp); friend.pose(t, fp);
  if (fp.lie) { const rollA = n === 'roll' && t > W_ROLE ? (t - W_ROLE) * 7 : 0; friend.body.rotation.set(-Math.PI / 2, rollA, 0, 'XYZ'); friend.body.position.y = 0.42; }
  if (fp.faceDown) { friend.body.rotation.set(Math.PI / 2, 0, 0, 'XYZ'); friend.body.position.y = 0.4; }
  if (fp.tumble) friend.body.rotation.set(fp.tumble, 0, Math.sin(t * 9) * 0.2, 'XYZ');
  // extinguisher spray
  if ((n === 'suit' || n === 'blast') && t > W_APAGAR_P - 0.1) { [hero, friend].forEach((b, i) => { const from = new THREE.Vector3(); b.nozzle.getWorldPosition(from); const tg = BFIRE[(Math.max(0, Math.floor((t - W_APAGAR_P) * 0.9)) * 2 + i * 5) % BFIRE.length]; const to = bw(tg.lx, tg.ly + 0.8, -4.2); updateExtSpray(sprays[i], from, to, t, true); }); }
  if (dg.mode === 'carried') { if (dog.parent !== friend.body) friend.body.add(dog); dog.scale.setScalar(1); dogPose(t, 'carried', 0, -0.28, 0.42, 0); }
  else { if (dog.parent !== scene) scene.add(dog); dogPose(t, dg.mode, dg.x, dg.y, dg.z, dg.ry); }
  const sh = shake * 0.12;
  cam.pos.add(V(Math.sin(t * 47) * sh, Math.sin(t * 61) * sh, Math.sin(t * 53) * sh));
  let fov = cam.fov; if (VERT) { const hh = Math.atan(Math.tan(fov * Math.PI / 360) * 16 / 9) * 0.8; fov = Math.atan(Math.tan(hh) * 16 / 9) * 360 / Math.PI; }
  camera.position.copy(cam.pos); camera.fov = fov; camera.updateProjectionMatrix(); camera.lookAt(cam.tgt);
  const focus = cam.tgt.clone(); focus.y = 0;
  if (APTN.includes(n) || GAGN.includes(n) || (IOSC.includes(n) && !(n === 'crawl' && t > W_ESCADA + 0.5)) || n === 'explain' || isIndoorShot(n, lt)) { sun.target.position.copy(focus); sun.position.copy(focus).add(V(10, 30, 40)); }
  else { focus.z = clamp(focus.z, -40, 45); focus.x = clamp(focus.x, -45, 40); sun.target.position.copy(focus); sun.position.copy(focus).add(V(40, 70, -30)); }
}
// solid furniture in the house (local x0, x1, z0, z1); characters are pushed out of these and kept inside the walls
const SOLIDS = [[-1.75, -0.25, -0.975, -0.225], [1.2, 3.8, -1.35, 0.35], [-2.6, 0.6, -3.3, -2.2], [3.65, 4.55, -2.6, -0.6], [-4.6, -4.1, -1.95, -0.05], [-2.0, 0.0, 2.65, 3.15]];
function keepOut(p, r) {
  if (p.x === undefined || Math.abs(p.x - AO.x) > 6 || Math.abs(p.z - AO.z) > 5) return;
  let x = p.x - AO.x, z = p.z - AO.z;
  for (let it = 0; it < 3; it++) for (const [x0, x1, z0, z1] of SOLIDS) {
    if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) {
      const d = [x - (x0 - r), (x1 + r) - x, z - (z0 - r), (z1 + r) - z], m = Math.min(...d);
      if (m === d[0]) x = x0 - r; else if (m === d[1]) x = x1 + r; else if (m === d[2]) z = z0 - r; else z = z1 + r;
    }
  }
  x = clamp(x, -4.6 + r, 4.6 - r); z = clamp(z, -3.5 + r, 3.6);
  p.x = x + AO.x; p.z = z + AO.z;
}
// the car in the bad idea: drives in, then the current lifts it and carries it away
function carState(t) {
  const t0 = T0('car2'), tb = W_BOIAR, L = ROAD.y + floodD(t);
  const drive = ss(t0, tb, t), fl = ss(tb - 0.3, tb + 1.2, t);
  const drift = Math.max(0, t - tb);
  const x = lerp(13, 6.5, drive) - drift * 1.6, z = ROAD.z - 0.2 + Math.min(0.5, drift * 0.12);
  const y = lerp(ROAD.y, L - 0.45, fl) + fl * 0.06 * Math.sin(t * 3);
  return { x, y, z, rx: fl * 0.08 * Math.sin(t * 2.3), ry: 0.04 + fl * Math.min(0.35, drift * 0.12), rz: fl * 0.07 * Math.sin(t * 1.7), float: fl };
}
function isIndoorShot(n, lt) {
  if (n === 'home') return lt >= wordAt('você', S.home.start) - S.home.start + 0.4;
  if (n === 'fire') return lt >= W_FOGO - S.fire.start - 0.6;
  if (n === 'jump') return lt < 0.85;
  return false;
}

// ---------- world (outdoors) ----------
const debrisOn = n => ['high', 'gag1', 'gag1b', 'car2', 'carfloat', 'wait2', 'q1'].includes(n);
// ---------- 3D explanation: a stove flame, then the oxygen molecules feeding it ----------
const DIO = V(0, 0, 205);
const dio = new THREE.Group(); dio.position.copy(DIO); scene.add(dio);
const dioP = {};
const EW = (k, after) => wordAt(k, after ?? T0('explain'));
const E = { calor: EW('calor'), comb: EW('combustível'), oxi: EW('oxigênio') }; E.ar = EW('sem', E.oxi + 0.1); E.apaga = EW('apaga', E.ar); E.fum = EW('fumaça', E.apaga); E.toxi = EW('tóxica', E.fum); E.desm = EW('desmaiar', E.fum); E.sobe = EW('sobe', E.desm); E.teto = EW('teto', E.sobe); E.desce = EW('desce', E.teto);
const MZ = V(60, 0, 0);   // the molecule zone
{
  // a kitchen corner with a gas stove
  const tiles = canvasTex(256, 256, (g, w) => { g.fillStyle = '#e9eef0'; g.fillRect(0, 0, w, w); g.strokeStyle = '#c3ccd1'; g.lineWidth = 4; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, w); g.stroke(); g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); } }); tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(3, 2);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 5), std(0xffffff, { map: tiles })); wall.position.set(0, 2.5, -0.6); dio.add(wall);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), std(0xb07a48)); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 2); dio.add(fl);
  const stove = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 1.0), std(0xf4f4f4, { roughness: 0.35 })); stove.position.set(0, 0.45, 0); dio.add(stove);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.03, 1.0), std(0x2b2b2e, { roughness: 0.3 })); top.position.set(0, 0.915, 0); dio.add(top);
  const oven = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.5), std(0x1b1b1f, { roughness: 0.1, metalness: 0.4 })); oven.position.set(0, 0.42, 0.502); dio.add(oven);
  for (const [x, z] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.22], [0.4, 0.22]]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 18), std(0x111111)); b.position.set(x, 0.95, z); dio.add(b); }
  for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), std(0x333333)); k.rotation.x = Math.PI / 2; k.position.set(-0.6 + i * 0.4, 0.78, 0.52); dio.add(k); }
  const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(1.4, 0.05, -0.3), V(1.1, 0.3, -0.5), V(0.9, 0.6, -0.5)]), 20, 0.03, 8), std(0xd9a441)); dio.add(hose);
  const gas = new THREE.Group(); gas.position.set(1.4, 0, -0.25); dio.add(gas); const gb = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.55, 18), std(0x5b8fd6, { metalness: 0.2 })); gb.position.y = 0.3; gas.add(gb); const gt = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), gb.material); gt.position.y = 0.57; gas.add(gt);
  dioP.flame = makeFlame(9, 0.1); dioP.flame.position.set(0.4, 0.97, 0.22); dioP.flame.scale.setScalar(0.32); dio.add(dioP.flame);
  dioP.flame.children.forEach((c, i) => { if (c.isSprite && i % 2 === 0) c.material.color.set(0x7fb8ff); });
  // the molecule zone: a big flame, oxygen molecules flowing in, and a glass dome that cuts the air
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), new THREE.MeshBasicMaterial({ map: canvasTex(256, 160, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.6, 10, w / 2, h * 0.6, w * 0.7); gr.addColorStop(0, '#2b2f5a'); gr.addColorStop(1, '#0b0d1f'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })); bg.position.copy(MZ).add(V(0, 3, -4)); dio.add(bg);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.3, 24), std(0x2b2b2e, { metalness: 0.5 })); base.position.copy(MZ).add(V(0, 0.15, 0)); dio.add(base);
  const flo = new THREE.Mesh(new THREE.PlaneGeometry(30, 14), std(0x14162e)); flo.rotation.x = -Math.PI / 2; flo.position.copy(MZ).add(V(0, 0, 2)); dio.add(flo);
  dioP.big = makeFlame(12, 0.45); dioP.big.position.copy(MZ).add(V(0, 0.3, 0)); dioP.big.scale.setScalar(2.4); dio.add(dioP.big);
  dioP.mols = [];
  const oM = std(0xe8443a, { roughness: 0.3, emissive: 0x551010, emissiveIntensity: 0.4 }), r = rnd(55);
  for (let i = 0; i < 34; i++) { const m = new THREE.Group(); for (const sx of [-1, 1]) { const at = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), oM); at.position.x = sx * 0.13; m.add(at); }
    m.userData = { a: r() * Math.PI * 2, r0: 3.2 + r() * 2.5, y0: 0.3 + r() * 3.2, o: r(), sp: 0.18 + r() * 0.12, rot: r() * 6 }; dio.add(m); dioP.mols.push(m); }
  dioP.dome = new THREE.Mesh(new THREE.SphereGeometry(1.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false })); dio.add(dioP.dome);
  dioP.puff = makeSmokeColumn(14); dioP.puff.position.copy(MZ).add(V(0, 0.8, 0)); dio.add(dioP.puff);
  dio.visible = false;
}
function updateDio(t) {
  updateFlame(dioP.flame, t, 1);
  const cover = ss(E.ar - 0.3, E.ar + 0.5, t), out = ss(E.ar + 0.4, E.apaga + 0.6, t);
  dioP.dome.position.copy(MZ).add(V(0, lerp(7, 0.3, cover), 0));
  updateFlame(dioP.big, t, 1 - out);
  updateSmokeColumn(dioP.puff, t, out > 0.3 && t < E.apaga + 3 ? 1 : 0, 4, 0.4);
  dioP.mols.forEach(m => { const u = m.userData, life = (t * u.sp + u.o) % 1; let rr = lerp(u.r0, 0.5, life); if (cover > 0.95) rr = Math.max(rr, 1.95 + 0.1 * Math.sin(t * 3 + u.a));
    m.position.copy(MZ).add(V(Math.cos(u.a + life * 1.2) * rr, lerp(u.y0, 0.9, life * (cover > 0.95 ? 0.2 : 1)), Math.sin(u.a + life * 1.2) * rr * 0.6));
    m.rotation.set(t * 1.3 + u.rot, t + u.rot, 0); m.scale.setScalar(cover > 0.95 ? 1 : (life > 0.9 ? (1 - life) * 10 : 1)); });
}
function dioCam(t) {
  const keys = [[T0('explain') + 0.2, V(1.7, 1.9, 3.4), V(0.2, 0.9, 0)], [E.calor - 0.2, V(1.0, 1.35, 1.5), V(0.4, 1.05, 0.2)], [E.comb - 0.2, V(1.9, 1.1, 1.6), V(0.9, 0.6, -0.3)]];
  if (t > E.oxi - 0.25) { const k = ease(clamp((t - E.oxi + 0.25) / 4)); return { pos: vl(V(0, 2.2, 8.5), V(0, 2.0, 6.8), k).add(MZ).add(DIO), tgt: V(0, 1.5, 0).add(MZ).add(DIO) }; }
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], k = b === a ? 1 : ease(clamp((t - a[0]) / Math.max(0.6, Math.min(1.0, b[0] - a[0]))));
  const pos = i === keys.length - 1 ? a[1].clone() : vl(a[1], b[1], k), tgt = i === keys.length - 1 ? a[2].clone() : vl(a[2], b[2], k);
  return { pos: pos.add(DIO), tgt: tgt.add(DIO) };
}
function explain3D(t, g) {
  const lt = t - g.start, a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  const at = (v) => proj(v.clone().add(DIO));
  if (t < E.oxi - 0.25) {
    if (t > E.calor - 0.2) { const [x, y] = at(V(0.4, 1.25, 0.22)); pointer(x - 20, y - 10, -Math.PI * 0.2, 'CALOR', E.calor - 0.2, t, '#ff6b5a'); }
    if (t > E.comb - 0.2) { const [x, y] = at(V(1.4, 0.55, -0.25)); pointer(x, y, -Math.PI * 0.75, 'COMBUSTÍVEL: O GÁS', E.comb - 0.2, t); }
  } else if (t < E.fum - 0.4) {
    if (t < E.ar + 0.2) { label('OXIGÊNIO DO AR', 640, 110, 48, ss(E.oxi - 0.2, E.oxi + 0.2, t), '#ff6b5a'); label('cada bolinha dupla é uma molécula de O₂', 640, 160, 26, ss(E.oxi, E.oxi + 0.4, t), '#ffffff'); }
    else label(t > E.apaga ? 'SEM AR, O FOGO APAGA!' : 'TAMPA O AR...', 640, 120, 50, ss(E.ar - 0.1, E.ar + 0.2, t), t > E.apaga ? '#5ff08a' : '#ffffff');
  } else {
    if (t < E.sobe - 0.1) {
      const k1 = ss(E.toxi - 0.6, E.toxi - 0.2, t), k2 = ss(E.desm - 0.2, E.desm + 0.2, t);
      if (k1 > 0) { ui.save(); ui.globalAlpha = k1; ui.translate(VERT ? 400 : 330, VERT ? 420 : 300); const s1 = pop(t - E.toxi + 0.6, 0.3); ui.scale(s1, s1); ui.fillStyle = 'rgba(10,20,40,0.82)'; rr(-170, -110, 340, 220, 24); ui.fill();
        ui.fillStyle = '#fff'; rr(-112, -70, 34, 120, 17); ui.fill(); ui.fillStyle = '#e8443a'; ui.beginPath(); ui.arc(-95, 58, 30, 0, Math.PI * 2); ui.fill(); ui.fillRect(-103, -30, 16, 90);
        ui.fillStyle = '#9aa3ab'; ui.beginPath(); ui.arc(40, -20, 52, 0, Math.PI * 2); ui.fill(); ui.fillRect(10, 20, 60, 34); ui.fillStyle = '#0a1428'; ui.beginPath(); ui.arc(20, -22, 14, 0, Math.PI * 2); ui.arc(60, -22, 14, 0, Math.PI * 2); ui.fill(); ui.fillRect(26, 30, 8, 18); ui.fillRect(46, 30, 8, 18);
        ui.textAlign = 'center'; outlined('QUENTE E TÓXICA', 0, 90, 30, '#ffd23f', '#0a1428', 900, 0.15); ui.restore(); }
      if (k2 > 0) { ui.save(); ui.globalAlpha = k2; ui.translate(VERT ? 880 : 950, VERT ? 420 : 300); const s2 = pop(t - E.desm + 0.2, 0.3); ui.scale(s2, s2); ui.fillStyle = 'rgba(10,20,40,0.82)'; rr(-180, -110, 360, 220, 24); ui.fill();
        ui.fillStyle = '#7a4421'; ui.beginPath(); ui.ellipse(0, -20, 50, 66, 0.25, 0, Math.PI * 2); ui.fill(); ui.strokeStyle = '#fff'; ui.lineWidth = 6; for (const ex of [-18, 18]) { ui.beginPath(); ui.moveTo(ex - 9, -40); ui.lineTo(ex + 9, -24); ui.moveTo(ex + 9, -40); ui.lineTo(ex - 9, -24); ui.stroke(); }
        stars(0, -80, t - E.desm); ui.textAlign = 'center'; outlined('DESMAIA EM POUCOS MINUTOS', 0, 90, 28, '#ff6b5a', '#0a1428', 900, 0.15); ui.restore(); }
    }
    else if (t < E.teto) { upArrows(t - E.sobe, 1000, 'A FUMAÇA SOBE'); }
    else if (t < E.desce - 0.1) label('TOMA O TETO', 640, 120, 50, ss(E.teto - 0.1, E.teto + 0.2, t), '#ffffff');
    else { for (let i = 0; i < 3; i++) { const life = ((t - E.desce) * 0.9 + i / 3) % 1; ui.save(); ui.globalAlpha = Math.sin(life * Math.PI); arrowShape(1020 + i * 46, 160 + life * 260, Math.PI / 2, 90, 30, '#ff6b5a'); ui.restore(); } label('E DESCE RAPIDINHO!', 640, 120, 50, ss(E.desce - 0.1, E.desce + 0.2, t), '#ff6b5a'); }
  }
  chip('COMO O FOGO FUNCIONA');
}

function fireLevel(t, n, i) {   // how much each front window burns
  if (['title', 'home', 'calm'].includes(n) || t < F0) return 0;
  if (n === 'end') return 0;
  const B = BFIRE[i];
  if (n === 'fire') return ss(F0 + B.d * 0.55, F0 + B.d * 0.55 + 0.6, t);
  if (n === 'suit' || n === 'blast') { const off = W_APAGAR_P + 0.6 + B.out * (TE('blast') - W_APAGAR_P - 1.6); return 1 - ss(off, off + 0.6, t); }
  return 1;
}
function world(t, n, lt) {
  const gag = GAGN.includes(n), storm = 0;
  trees.forEach(tr => { tr.rotation.z = 0.01 * Math.sin(t * 1.3 + tr.userData.ph); tr.rotation.x = 0; });
  canalWater.position.y = 0.2; canalWater.visible = true;
  palms.forEach(pl => pl.visible = false);
  [umbrella, cooler, ball, lounger, towel].forEach(o => o.visible = false); fishes.forEach(f => f.visible = false); hatF.visible = shadesF.visible = false; sign.visible = false;
  cars.forEach(c => { c.position.copy(c.userData.home); c.position.z = 18.45; c.rotation.set(0, 0.04, 0); });
  updateFlood(t, -1); debris.forEach(d => d.visible = false);
  manCover.position.set(MAN.x, ROAD.y + 0.1, MAN.z); manCover.rotation.set(0, 0, 0); manHole.visible = geyser.visible = swirl.visible = false; manCover.visible = false; boat.visible = false;
  wireHalves.forEach(w => w.visible = false); wires.children[2].visible = true;
  updateGulls(t, t, 0); gulls.forEach(g => g.visible = n === 'end');
  // the burning building
  let total = 0;
  BFIRE.forEach((B, i) => { const lv = fireLevel(t, n, i); total += lv; const pp = bw(B.lx, B.ly, -4.25); B.f.position.copy(pp); updateFlame(B.f, t + i * 0.37, lv * 1.15); });
  total /= BFIRE.length;
  const sm = n === 'end' ? 0.35 : (['suit', 'blast'].includes(n) ? Math.max(0.4, total) : total);
  roofSmoke.forEach((c, i) => { c.position.copy(bw(-3 + i * 3, 13.2, -1 + i)); updateSmokeColumn(c, t + i, sm * 1.4, 22, 5); });
  facadeFire.visible = false;
  fireGlow[0].position.copy(bw(-2, 5, -7)); fireGlow[1].position.copy(bw(2, 10, -7)); fireGlow.forEach((l, i) => l.intensity = total * (14 + 3 * Math.sin(t * 9 + i)));
  // early sparks at the 2nd-floor window (the short circuit)
  sparks.visible = n === 'fire' && t > W_CURTO - 0.2 && t < F0 + 0.6;
  if (sparks.visible) { const c0 = bw(-1.125, 4.6, -4.3); for (let i = 0; i < 60; i++) { const a = i * 2.4 + t * 13, r = ((t * 3 + i * 0.37) % 1) * 0.8; sparkP[i * 3] = c0.x + Math.cos(a) * r; sparkP[i * 3 + 1] = c0.y + Math.abs(Math.sin(a * 1.3)) * r; sparkP[i * 3 + 2] = c0.z - Math.abs(Math.sin(a)) * r; } sparkG.attributes.position.needsUpdate = true; }
  doorFire.position.copy(bw(0, 0, -4.15)); doorFire.position.y = STOOP_Y; updateFlame(doorFire, t, n === 'roll' ? 0.9 : 0);
  // ember falling on the friend
  const ef = n === 'roll' && t > EMBER_T - 0.9 && t < EMBER_T; if (ef) { const k = clamp((t - EMBER_T + 0.9) / 0.9); const a0 = bw(-0.6, 7.5, -4.3), a1 = bw(-0.6, 1.6, -7.2); ember.position.copy(a0.lerp(a1, k)); ember.position.x += Math.sin(k * 9) * 0.3; } updateFlame(ember, t, ef ? 0.6 : 0);
  // glass shards out of their window
  const sk = n === 'jump' ? t - CRASH - 0.1 : -1;
  SHARDS.forEach(m => { m.visible = sk > 0 && sk < 2.5 && !isIndoorShot(n, lt); if (!m.visible) return; const u = m.userData, w0 = WINPOS(); const y = w0.y + u.oy + u.vy * sk - 4.9 * sk * sk; m.position.set(w0.x + u.ox + u.vx * sk * 0.6, Math.max(ROAD.y + 0.03, y), w0.z + u.vz * sk * 0.6); m.rotation.set(u.sp * sk, u.sp * 0.7 * sk, 0); });
  // the fire truck (option 2)
  const wTruck = W_193 + 2.2; truck.visible = n === 'real' && t > W_193 + 0.5;
  if (truck.visible) { const k = ss(W_193 + 0.5, wTruck, t); truck.position.set(lerp(-26, 10.5, 1 - Math.pow(1 - k, 2)), ROAD.y, 16.6); truck.rotation.set(0, Math.PI, 0);
    const up = ss(wTruck, wTruck + 1.4, t); truck.userData.ladder.rotation.y = -0.49 * up; truck.userData.arm.rotation.z = -0.62 * up; truck.userData.lights.forEach((l, i) => l.visible = (Math.floor(t * 4) + i) % 2 === 0); }
  hose.visible = truck.visible && t > wTruck + 1.4;
  if (hose.visible) { const a0 = new THREE.Vector3(); truck.userData.nozzle.getWorldPosition(a0); const a1 = WINPOS();
    for (let i = 0; i < hoseN; i++) { const u = ((i / hoseN) + t * 1.4) % 1; const pnt = a0.clone().lerp(a1, u); pnt.y += Math.sin(u * Math.PI) * 1.6; hoseP[i * 3] = pnt.x + Math.sin(i * 7.1) * 0.08; hoseP[i * 3 + 1] = pnt.y + Math.cos(i * 3.3) * 0.08; hoseP[i * 3 + 2] = pnt.z; } hoseG.attributes.position.needsUpdate = true; }
  // sky: late afternoon, sunset at the end
  const eve = n === 'end' ? 1 : 0.6;
  skyU.top.value.set(0x2f7fd8).lerp(new THREE.Color(0x3b5aa8), eve * 0.8); skyU.bot.value.set(0xbfe6ff).lerp(new THREE.Color(0xffc48a), eve * 0.9);
  skyU.sunCol.value.set(0xfff2c0);
  scene.fog.color.copy(skyU.bot.value); scene.fog.near = 110; scene.fog.far = 460;
  const expApt = n === 'explain' && t > E.fum - 0.4;
  const crawlOut = n === 'crawl' && t > W_ESCADA + 0.5;
  const inside = APTN.includes(n) || gag || (IOSC.includes(n) && !crawlOut) || isIndoorShot(n, lt) || expApt;
  sun.intensity = inside ? 1.4 : 2.3; sun.color.set(0xfff1d6).lerp(new THREE.Color(0xffb070), eve);
  hemi.intensity = inside ? 1.25 : 0.95;
  clouds.position.x = t * 0.6; clouds.children.forEach(c => c.children.forEach(m => m.material.color.setHex(0xffffff)));
  stormM.opacity = 0; stormG.visible = false;
  sunSprite.visible = sunHalo.visible = !inside && n !== 'explain';
  rainbow.visible = false;
  apt.visible = APTN.includes(n) || gag || isIndoorShot(n, lt) || expApt;
  interior.visible = IOSC.includes(n) && !crawlOut; lobbyW.visible = false;
  ioSmoke.forEach((b, i) => b.visible = interior.visible && (i === 3 || !['idea', 'crawl'].includes(n)));
  const ed = interior.userData.elevDoors; const shut = n === 'exit1' ? 0 : n === 'exit2' ? ss(1.3, 1.9, lt) : 1; ed[0].position.x = -0.39 - 0.75 * (1 - shut); ed[1].position.x = 0.39 + 0.75 * (1 - shut);
  { const C = interior.userData.cab, dark = (n === 'exit2' && t > W_ENERGIA) || n === 'elevgag'; C.lt0.intensity = dark ? 0 : 2.2; C.panel.material.color.setHex(dark ? 0x202020 : 0xfff3d0);
    C.red.intensity = dark ? 1.6 + 0.8 * Math.sin(t * 6) : 0; C.redB.material.color.setHex(dark ? 0xff2020 : 0x441010);
    const sh = n === 'elevgag' ? 0.5 + 0.9 * ss(0, S.elevgag.dur, lt) : (n === 'exit2' && t > W_ENERGIA ? 0.5 * ss(W_ENERGIA, W_ENERGIA + 1.5, t) : 0); C.sm.visible = sh > 0.02; C.sm.scale.y = Math.max(0.01, sh); C.sm.position.y = 2.78 - sh / 2; }
  interior.userData.elevBtn.material.color.setHex(n === 'exit2' && t > W_ENERGIA ? 0x222222 : 0xffcf33);
  building.userData.hinge.rotation.y = n === 'roll' || crawlOut ? -1.7 : 0;
  { const dp = bw(0, 1.4, -4.3); facadeSmoke.position.copy(dp); updateSmokeColumn(facadeSmoke, t, crawlOut ? 1 : (n === 'roll' ? 0.6 : 0), 6, -1.5); }
  water.visible = false; spray.visible = false;
  dio.visible = n === 'explain' && !expApt; if (dio.visible) updateDio(t);
  return { storm, inside };
}
// water in the building lobby
const lobbyW = new THREE.Mesh(new THREE.BoxGeometry(16, 0.32, 5.2), new THREE.MeshStandardMaterial({ color: 0x9a7a52, transparent: true, opacity: 0.85, roughness: 0.15 })); lobbyW.position.set(IO.x - 1.5, IO.y + 0.16, IO.z + 1.6); scene.add(lobbyW);

// ---------- 2D overlay ----------
// ---------- 2D overlay ----------
const ui = document.getElementById('ui').getContext('2d');
const NOCAP = new URLSearchParams(location.search).has('nocap');
const NOTITLE = new URLSearchParams(location.search).has('notitle');   // vertical version shows the title above the video instead   // vertical (TikTok) version draws its own bigger captions
function rr(x, y, w, h, r) { ui.beginPath(); ui.roundRect(x, y, w, h, r); }
function outlined(text, x, y, size, fill = '#fff', stroke = '#1b1b1b', weight = 900, lw = 0.16) {
  ui.font = `${weight} ${size}px "Inter Display", Inter, "DejaVu Sans", sans-serif`; ui.lineJoin = 'round';
  ui.lineWidth = size * lw; ui.strokeStyle = stroke; ui.strokeText(text, x, y); ui.fillStyle = fill; ui.fillText(text, x, y);
}
const HL_EP1 = ['tsunami', 'dez metros', 'correr', 'pra cima', 'longe do mar', 'rota de fuga', 'terceiro andar', 'várias ondas', 'autoridades', 'avião', 'paredão de água', 'de repente', 'peixe', 'terremoto', 'péssima ideia', 'carros', 'árvores', 'último aviso', 'freia', 'cresce', 'tomando sol', 'morro', 'prédio alto', 'resistente', 'densa', 'forte', 'elevador', 'escada', 'mesma força', 'fios elétricos', 'trânsito trava', 'ainda não'];
function caption(t) {
  const c = TL.caps.find(c => t >= c.t0 && t < c.t1 + 0.12);
  if (!c) return;
  const age = t - c.t0; const a = ss(0, 0.12, age);
  const size = 42;
  ui.save(); ui.globalAlpha = a; ui.textBaseline = 'middle';
  ui.font = `900 ${size}px "Inter Display"`;
  const low = c.text.toLowerCase(); const marks = new Array(c.text.length).fill(false);
  HL.forEach(k => { let i = low.indexOf(k); while (i >= 0) { for (let j = i; j < i + k.length; j++) marks[j] = true; i = low.indexOf(k, i + 1); } });
  const tw = ui.measureText(c.text).width; const s = 1 + 0.08 * (1 - ss(0, 0.15, age));
  ui.translate(640, 642); ui.scale(s, s);
  let x = -tw / 2; let buf = '', cur = null;
  const flush = () => { if (!buf) return; outlined(buf, x, 2, size, cur ? '#ffd23f' : '#ffffff', '#0a1428', 900, 0.2); x += ui.measureText(buf).width; buf = ''; };
  for (let i = 0; i < c.text.length; i++) { if (marks[i] !== cur) { flush(); cur = marks[i]; ui.font = `900 ${size}px "Inter Display"`; } buf += c.text[i]; }
  flush();
  ui.restore();
}
function badge(text, a, color) {
  if (a <= 0) return;
  ui.save(); ui.globalAlpha = a; ui.font = '900 32px "Inter Display"'; const w = ui.measureText(text).width + 50; const x = UIL + 24 - (1 - a) * 200;
  ui.translate(x, 40); ui.rotate(-0.03); ui.fillStyle = color; rr(0, 0, w, 60, 14); ui.fill(); ui.lineWidth = 5; ui.strokeStyle = '#fff'; ui.stroke();
  ui.fillStyle = '#fff'; ui.textBaseline = 'middle'; ui.fillText(text, 25, 32); ui.restore();
}
function pop(lt, d = 0.35) { const x = clamp(lt / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; }
function vignette(a, rgb = '0,0,0') { if (a <= 0) return; const g = ui.createRadialGradient(640, 360, 200, 640, 360, 760); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a})`); ui.fillStyle = g; fullRect(); }
function headOnScreen(bean, dy = 0.75) { const v = new THREE.Vector3(); bean.body.getWorldPosition(v); v.y += dy; return proj(v); }

function questionMarks(k, hx, hy) {
  const tint = ui.createRadialGradient(hx, hy, 50, hx, hy, 700); tint.addColorStop(0, 'rgba(120,60,200,0)'); tint.addColorStop(1, `rgba(70,20,140,${0.35 + 0.1 * Math.sin(k * 8)})`);
  ui.fillStyle = tint; fullRect();
  ui.save(); ui.textAlign = 'center'; ui.textBaseline = 'middle';
  ui.save(); ui.translate(hx, hy - 95); ui.strokeStyle = 'rgba(255,255,255,0.85)'; ui.lineWidth = 5; ui.lineCap = 'round'; ui.beginPath();
  for (let a = 0; a < Math.PI * 5; a += 0.15) { const r = 4 + a * 6; ui.lineTo(Math.cos(a + k * 7) * r, Math.sin(a + k * 7) * r * 0.32); } ui.stroke(); ui.restore();
  const cols = ['#ffd23f', '#ff6b5a', '#5fd0ff', '#ffffff', '#b48bff', '#5ff08a'];
  for (let i = 0; i < 10; i++) {
    const t0 = i * 0.1; if (k < t0) continue;
    const a = i / 10 * Math.PI * 2 + k * 1.6; const rx = 250 + (i % 3) * 50, ry = 130 + (i % 2) * 40;
    const x = hx + Math.cos(a) * rx, y = hy + Math.sin(a) * ry + Math.sin(k * 5 + i) * 12;
    const sc = pop(k - t0, 0.25) * (0.8 + 0.2 * Math.sin(k * 7 + i));
    ui.save(); ui.translate(x, y); ui.scale(sc, sc); ui.rotate(Math.sin(k * 4 + i * 1.7) * 0.4); outlined('?', 0, 0, 70 + (i % 4) * 18, cols[i % cols.length], '#0a1428', 900, 0.18); ui.restore();
  }
  for (let i = 0; i < 8; i++) {
    const life = ((k * 0.8 + i / 8) % 1); const x = hx + (i - 3.5) * 70 + Math.sin(k * 3 + i) * 15, y = hy - 30 - life * 260;
    ui.save(); ui.globalAlpha = (1 - life) * ss(0, 0.3, k); outlined('?', x, y, 30, cols[(i + 2) % cols.length], '#0a1428', 900, 0.18); ui.restore();
  }
  ui.restore();
}
function vhs(t, k) {
  ui.save();
  ui.fillStyle = 'rgba(40,30,80,0.25)'; fullRect();
  for (let y = 0; y < H; y += 4) { ui.fillStyle = `rgba(0,0,0,${0.18 + 0.05 * Math.sin(y * 0.3 + t * 40)})`; ui.fillRect(0, y, W, 2); }
  const band = (t * 900) % (H + 120) - 60; ui.fillStyle = 'rgba(255,255,255,0.18)'; ui.fillRect(0, band, W, 24);
  for (let i = 0; i < 40; i++) { const r = Math.sin(i * 91.7 + Math.floor(t * 30) * 13.1) * 1e4; const f = r - Math.floor(r); ui.fillStyle = `rgba(255,255,255,${0.15 + f * 0.25})`; ui.fillRect(f * W, ((f * 7.3) % 1) * H, 30 + f * 120, 2); }
  ui.textBaseline = 'middle'; ui.font = '700 44px "JetBrains Mono", monospace'; ui.fillStyle = '#ffffff'; ui.shadowColor = '#ff2bd6'; ui.shadowOffsetX = 3;
  if (Math.floor(t * 3) % 2 === 0) ui.fillText('◀◀ REPLAY', 60, 80);
  ui.font = '700 28px "JetBrains Mono", monospace'; ui.fillText('VOLTANDO NO TEMPO...', 60, 130);
  ui.restore();
}
function lightbulb(x, y, k) {
  ui.save(); ui.translate(x, y); const s = pop(k, 0.3); ui.scale(s, s);
  ui.fillStyle = `rgba(255,230,90,${0.35 + 0.15 * Math.sin(k * 10)})`; ui.beginPath(); ui.arc(0, 0, 70, 0, Math.PI * 2); ui.fill();
  ui.fillStyle = '#ffe14d'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 6; ui.beginPath(); ui.arc(0, -8, 34, Math.PI * 0.8, Math.PI * 2.2); ui.lineTo(14, 34); ui.lineTo(-14, 34); ui.closePath(); ui.fill(); ui.stroke();
  ui.fillStyle = '#9aa3ab'; ui.fillRect(-15, 36, 30, 16); ui.strokeRect(-15, 36, 30, 16);
  ui.strokeStyle = '#ffe14d'; ui.lineWidth = 6; ui.lineCap = 'round';
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.42; ui.beginPath(); ui.moveTo(Math.cos(a) * 52, Math.sin(a) * 52 - 8); ui.lineTo(Math.cos(a) * 72, Math.sin(a) * 72 - 8); ui.stroke(); }
  ui.restore();
}

const HL = [];
function stars(x, y, k) { for (let i = 0; i < 5; i++) { const an = k * 4 + i / 5 * Math.PI * 2; ui.save(); ui.translate(x + Math.cos(an) * 70, y + Math.sin(an) * 22); ui.rotate(k * 5 + i); ui.fillStyle = '#ffd23f'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 3; ui.beginPath(); for (let j = 0; j < 10; j++) { const r2 = j % 2 ? 7 : 16, a2 = j / 10 * Math.PI * 2; ui.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2); } ui.closePath(); ui.fill(); ui.stroke(); ui.restore(); } }
function smoke(x, y, k, n2 = 9) { for (let i = 0; i < n2; i++) { const ang = i / n2 * Math.PI * 2, rad = 20 + k * 90; ui.fillStyle = `rgba(90,90,90,${0.55 * (1 - k / 0.9)})`; ui.beginPath(); ui.arc(x + Math.cos(ang) * rad, y - 60 - k * 80 + Math.sin(ang) * rad * 0.5, 26 + k * 30, 0, Math.PI * 2); ui.fill(); } }
function chip(text) { ui.save(); ui.textAlign = 'left'; ui.font = '900 18px "Inter Display"'; const tw2 = ui.measureText(text).width; ui.fillStyle = 'rgba(10,20,40,0.75)'; rr(UIR - 20 - tw2 - 36, 20, tw2 + 36, 40, 20); ui.fill(); ui.fillStyle = '#fff'; ui.textBaseline = 'middle'; ui.fillText(text, UIR - 20 - tw2 - 18, 41); ui.restore(); }
function arrowShape(x, y, dir, len, w, col) { ui.save(); ui.translate(x, y); ui.rotate(dir); ui.fillStyle = col; ui.strokeStyle = '#0a1428'; ui.lineWidth = 3; ui.beginPath(); ui.moveTo(0, -w / 2); ui.lineTo(len - w, -w / 2); ui.lineTo(len - w, -w); ui.lineTo(len, 0); ui.lineTo(len - w, w); ui.lineTo(len - w, w / 2); ui.lineTo(0, w / 2); ui.closePath(); ui.fill(); ui.stroke(); ui.restore(); }
function label(text, x, y, size, a, col = '#ffffff', stroke = '#0a1428') { if (a <= 0) return; ui.save(); ui.globalAlpha *= a; ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.font = `900 ${size}px "Inter Display"`; { const hw = ui.measureText(text).width / 2 + 12; if (hw * 2 > UIR - UIL) { size *= (UIR - UIL) / (hw * 2); x = 640; } else x = clamp(x, UIL + hw, UIR - hw); } outlined(text, x, y, size, col, stroke, 900, 0.2); ui.restore(); }
function floodDiagram(t, g) {
  const lt = t - g.start; const a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  if (a <= 0) return;
  const w = k => wordAt(k, g.start) - g.start;
  const wCh = w('chove'), wAb = w('absorver'), wCi = w('cidade'), wAs = w('asfalto'), wLi = w('lixo'), wRi = w('rios'), wTr = w('transbordam'), wIn = w('invade');
  ui.save(); ui.globalAlpha = a;
  const GY = 390;
  const sky = ui.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#3f4b5a'); sky.addColorStop(1, '#8e9aa6'); ui.fillStyle = sky; ui.fillRect(0, 0, W, GY + 4);
  // storm clouds and rain
  const rainA = ss(wCh - 0.5, wCh + 0.3, lt) * 0.9 + 0.1;
  ui.strokeStyle = `rgba(200,225,255,${0.55 * rainA})`; ui.lineWidth = 2;
  for (let i = 0; i < 160; i++) { const x = (i * 83.3) % W, y = 70 + ((i * 37.1 + lt * 520) % (GY - 70)); ui.beginPath(); ui.moveTo(x, y); ui.lineTo(x - 6, y + 22); ui.stroke(); }
  for (let i = 0; i < 9; i++) { const cx = 40 + i * 150 + Math.sin(lt * 0.4 + i) * 8, cy = 55 + (i % 2) * 18; ui.fillStyle = i % 2 ? '#525d6a' : '#5f6b78'; ui.beginPath(); ui.arc(cx, cy, 46, 0, Math.PI * 2); ui.arc(cx + 50, cy - 16, 56, 0, Math.PI * 2); ui.arc(cx + 100, cy, 44, 0, Math.PI * 2); ui.fill(); }
  // --- countryside (left): the soil soaks up water, until it can't
  const sat = ss(wAb + 0.3, wAb + 2.6, lt);
  ui.fillStyle = '#6fae4a'; ui.fillRect(0, GY - 12, 470, 16);
  [['#a5794a', '#5d4026', 0, 70], ['#8f6a40', '#4e3520', 70, 170], ['#7a5835', '#3f2c19', 170, 330]].forEach(([c1, c2, y0, y1]) => { ui.fillStyle = '#' + new THREE.Color(c1).lerp(new THREE.Color(c2), sat).getHexString(); ui.fillRect(0, GY + 4 + y0, 470, y1 - y0); });
  [[90, GY - 12, '#3f8f2f'], [330, GY - 12, '#4e9a3a']].forEach(([x, y, c]) => { ui.fillStyle = '#7a5230'; ui.fillRect(x - 6, y - 50, 12, 50); ui.fillStyle = c; ui.beginPath(); ui.arc(x, y - 70, 34, 0, Math.PI * 2); ui.fill(); });
  if (lt > wCh - 0.2) {
    for (let i = 0; i < 6; i++) { const x = 40 + i * 72, life = (lt * 0.9 + i * 0.17) % 1; const sink = sat < 0.7; const y = sink ? GY + 10 + life * 120 : GY - 8 - Math.sin(life * Math.PI) * 30; ui.globalAlpha = a * (1 - life) * 0.9; arrowShape(x + (sink ? 0 : life * 40), y, sink ? Math.PI / 2 : 0, 36, 14, '#5fd0ff'); }
    ui.globalAlpha = a;
    label(sat < 0.5 ? 'O SOLO ABSORVE' : 'ENCHARCADO: NÃO ABSORVE MAIS', 235, GY + 210, 26, ss(wCh - 0.2, wCh + 0.3, lt), sat < 0.5 ? '#ffffff' : '#ffd23f');
  }
  // --- river (middle): rises and overflows
  const rise = ss(wRi - 0.6, wTr + 0.6, lt), over = ss(wTr, wTr + 1.2, lt), inv = ss(wIn - 0.2, wIn + 1.5, lt);
  ui.fillStyle = '#7a5835'; ui.beginPath(); ui.moveTo(470, GY - 4); ui.lineTo(530, GY + 110); ui.lineTo(690, GY + 110); ui.lineTo(750, GY - 4); ui.lineTo(750, H); ui.lineTo(470, H); ui.fill();
  const rl = lerp(GY + 70, GY - 6, rise);
  ui.fillStyle = '#6b8fa8'; ui.beginPath(); ui.moveTo(470 + (GY + 110 - rl) * 0 , rl); const half = lerp(110, 140, rise); ui.moveTo(610 - half * (1 - (rl - GY) / 120), rl); ui.lineTo(530, GY + 110); ui.lineTo(690, GY + 110); ui.lineTo(610 + half * (1 - (rl - GY) / 120), rl); ui.closePath(); ui.fill();
  ui.fillStyle = 'rgba(110,145,168,0.95)'; if (rise > 0.6) ui.fillRect(470, rl, 280, GY + 110 - rl > 0 ? 6 : 0);
  label('RIO', 610, GY + 150, 26, 1);
  // overflow spreading over the banks
  if (over > 0) { const sp = over * 230 + inv * 300; const lev = 8 + over * 10 + inv * 22; ui.fillStyle = 'rgba(140,110,70,0.85)'; ui.fillRect(610 - 140 - sp * 0.6, GY - lev, 280 + sp * 0.6 + sp, lev + 2); for (let i = 0; i < 5; i++) arrowShape(760 + i * 40 + (lt * 60 % 40), GY - lev / 2, 0, 30, 10, '#ffd23f'); label('O RIO TRANSBORDA', 610, 160, 30, over, '#ffd23f'); }
  // --- city (right): asphalt doesn't let water in, trash clogs the drain
  ui.fillStyle = '#4a4d52'; ui.fillRect(750, GY - 8, 530, 24); ui.fillStyle = '#f2f2f2'; for (let i = 0; i < 7; i++) ui.fillRect(770 + i * 75, GY + 2, 38, 4);
  ui.fillStyle = '#9b9488'; ui.fillRect(750, GY + 16, 530, H);
  const houses = [[800, 90, '#f6c8a0'], [880, 130, '#a8d8ea'], [1010, 100, '#ffe6a7'], [1100, 150, '#f7a7a7'], [1200, 110, '#d6f0c8']];
  houses.forEach(([x, h, c]) => { ui.fillStyle = c; ui.fillRect(x, GY - 8 - h, 70, h); ui.fillStyle = '#5f8fb3'; for (let r = 0; r < h / 30 - 1; r++) { ui.fillRect(x + 10, GY - 8 - h + 12 + r * 30, 16, 16); ui.fillRect(x + 42, GY - 8 - h + 12 + r * 30, 16, 16); } ui.fillStyle = '#6b4425'; ui.fillRect(x + 26, GY - 38, 18, 30); });
  // storm drain (boca de lobo) with a pipe below
  const BX = 960; ui.fillStyle = '#222'; ui.fillRect(BX - 30, GY - 8, 60, 10); ui.fillStyle = '#5a5a5a'; for (let i = 0; i < 5; i++) ui.fillRect(BX - 26 + i * 12, GY - 8, 5, 10);
  ui.fillStyle = '#3a3a3a'; ui.fillRect(BX - 14, GY + 2, 28, 120); ui.fillRect(BX - 14, GY + 110, 320, 26);
  const flowA = ss(wAs - 0.2, wAs + 0.4, lt);
  if (flowA > 0) { for (let i = 0; i < 4; i++) { const life = (lt * 0.7 + i / 4) % 1; ui.globalAlpha = a * flowA * (1 - life); arrowShape(1240 - life * 230, GY - 18, Math.PI, 40, 14, '#5fd0ff'); } ui.globalAlpha = a; label('ASFALTO NÃO ABSORVE', 1080, GY + 70, 24, flowA * (1 - ss(wLi - 0.3, wLi, lt))); }
  const trash = ss(wLi - 0.2, wLi + 0.8, lt);
  if (trash > 0) {
    const items = [[-34, '#3fa34d', 'bottle'], [-6, '#e8e8e8', 'bag'], [20, '#d9534f', 'can'], [-20, '#f2c14e', 'box']];
    items.forEach(([dx, c, k], i) => { const kk = clamp(trash * 4 - i * 0.8); if (kk <= 0) return; const y = lerp(GY - 80, GY - 18, kk); ui.save(); ui.translate(BX + dx, y); ui.rotate(i * 0.7); ui.fillStyle = c; if (k === 'bottle') { ui.fillRect(-7, -16, 14, 30); ui.fillRect(-3, -24, 6, 9); } else if (k === 'bag') { ui.beginPath(); ui.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2); ui.fill(); } else if (k === 'can') { ui.fillRect(-8, -11, 16, 22); } else { ui.fillRect(-12, -9, 24, 18); } ui.restore(); });
    ui.save(); ui.globalAlpha = a * trash; ui.strokeStyle = '#e8443a'; ui.lineWidth = 6; ui.beginPath(); ui.arc(BX, GY - 10, 52, 0, Math.PI * 2); ui.stroke(); ui.restore();
    label('LIXO ENTOPE O BUEIRO', BX + 60, GY + 70, 24, trash * (1 - ss(wIn - 0.3, wIn, lt)), '#ffd23f');
  }
  if (inv > 0) { const lev = inv * 46; ui.fillStyle = 'rgba(140,110,70,0.85)'; ui.fillRect(750, GY - 8 - lev, 530, lev); label('A ÁGUA INVADE RUAS E CASAS', 1000, GY + 70, 26, inv, '#ffffff'); }
  chip('COMO ACONTECE UMA ENCHENTE');
  ui.restore();
}
function depthGauge(t, g) {
  const lt = t - g.start; const a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  if (a <= 0) return;
  const wQ = wordAt('quinze', g.start) - g.start, wD = wordAt('derrubam', g.start) - g.start;
  ui.save(); ui.globalAlpha = a;
  const bg = ui.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#13304f'); bg.addColorStop(1, '#0a1a2c'); ui.fillStyle = bg; fullRect();
  label('ÁGUA CORRENDO', 640, 70, 52, 1, '#ffd23f');
  const GY = 590, PX = 2.3;   // px per cm
  // ruler
  ui.fillStyle = '#f2e3c6'; rr(250, GY - 175 * PX, 60, 175 * PX, 8); ui.fill();
  ui.fillStyle = '#0a1428'; ui.textAlign = 'right'; ui.textBaseline = 'middle'; ui.font = '800 20px "Inter Display"';
  for (let c = 0; c <= 170; c += 10) { const y = GY - c * PX; ui.fillRect(250, y - 1.5, c % 50 === 0 ? 34 : 18, 3); if (c % 50 === 0 && c) ui.fillText(c + ' cm', 240, y); }
  // water
  const lev = lerp(0, 15, ss(wQ - 0.2, wQ + 0.4, lt)), wy = GY - lev * PX;
  ui.fillStyle = 'rgba(150,115,70,0.95)'; ui.fillRect(320, wy, 860, GY - wy);
  ui.fillStyle = '#5a4128'; ui.fillRect(320, GY, 860, 12);
  if (lev > 1) { for (let i = 0; i < 6; i++) { const x = 340 + ((i * 150 + lt * 160) % 820); arrowShape(x, wy + (GY - wy) / 2, 0, 46, 14, '#5fd0ff'); } }
  // the bean (1.70 m) standing in the current, then knocked over
  const fall = ss(wD + 0.05, wD + 0.55, lt);
  ui.save(); ui.translate(640, GY); ui.rotate(fall * 1.35);
  ui.strokeStyle = '#2a170c'; ui.lineWidth = 16; ui.lineCap = 'round'; ui.beginPath(); ui.moveTo(-26, -6); ui.lineTo(-22, -95); ui.moveTo(26, -6); ui.lineTo(22, -95); ui.stroke();
  ui.fillStyle = '#d93a2b'; ui.beginPath(); ui.ellipse(-30, -6, 22, 11, 0, 0, Math.PI * 2); ui.ellipse(30, -6, 22, 11, 0, 0, Math.PI * 2); ui.fill();
  ui.fillStyle = '#7a4421'; ui.beginPath(); ui.ellipse(0, -95 - 150, 92, 150, 0, 0, Math.PI * 2); ui.fill();
  ui.strokeStyle = '#2a170c'; ui.lineWidth = 12; ui.beginPath(); ui.moveTo(-88, -250); ui.lineTo(-130 - fall * 20, -180 - fall * 120); ui.moveTo(88, -250); ui.lineTo(130 + fall * 20, -180 - fall * 120); ui.stroke();
  ui.fillStyle = '#fff'; ui.beginPath(); ui.ellipse(-32, -300, 22, 28, 0, 0, Math.PI * 2); ui.ellipse(32, -300, 22, 28, 0, 0, Math.PI * 2); ui.fill();
  ui.fillStyle = '#111'; ui.beginPath(); ui.arc(-30, -296 + fall * 6, 10, 0, Math.PI * 2); ui.arc(34, -296 + fall * 6, 10, 0, Math.PI * 2); ui.fill();
  ui.fillStyle = '#3a0a0a'; ui.beginPath(); ui.ellipse(0, -230, 18, 6 + fall * 14, 0, 0, Math.PI * 2); ui.fill();
  ui.restore();
  // 15 cm marker
  if (lt > wQ - 0.2) { const k = ss(wQ - 0.2, wQ + 0.3, lt); ui.save(); ui.globalAlpha = a * k; ui.strokeStyle = '#ffd23f'; ui.lineWidth = 5; ui.setLineDash([12, 8]); ui.beginPath(); ui.moveTo(200, wy); ui.lineTo(1180, wy); ui.stroke(); ui.setLineDash([]); ui.restore(); label('15 cm', 150, wy, 34, k, '#ffd23f'); }
  if (lt > wD) { label('JÁ DERRUBA UMA PESSOA!', 930, 230, 40, ss(wD, wD + 0.3, lt), '#ff6b5a'); if (lt < wD + 1.4) { ui.save(); ui.translate(900, GY - 60); const s2 = pop(lt - wD - 0.5, 0.2); ui.scale(s2, s2); outlined('SPLASH!', 0, 0, 56, '#5fd0ff', '#0a1428', 900, 0.18); ui.restore(); } }
  ui.restore();
}
function steps3(t, g) {
  const ws = wordAt('suba', g.start), wn = wordAt('não', g.start);
  const items = [['1', 'DESLIGUE', wordAt('desligue', g.start)], ['2', 'SUBA', ws], ['3', 'NÃO ATRAVESSE', wn]];
  items.forEach(([k, txt, at], i) => {
    const a = ss(at - 0.1, at + 0.2, t); if (a <= 0) return;
    ui.save(); ui.globalAlpha = a; ui.translate(60 - (1 - a) * 80, 130 + i * 92);
    ui.fillStyle = 'rgba(10,20,40,0.8)'; rr(0, 0, 400, 76, 18); ui.fill(); ui.fillStyle = '#1e9e57'; ui.beginPath(); ui.arc(42, 38, 28, 0, Math.PI * 2); ui.fill();
    ui.textBaseline = 'middle'; ui.textAlign = 'center'; outlined(k, 42, 40, 32, '#fff', '#1e9e57', 900, 0.05); ui.textAlign = 'left'; outlined(txt, 86, 40, 36, '#ffd23f', '#0a1428', 900, 0.12); ui.restore();
  });
}
function icon(kind, x, y, s = 1) {
  ui.save(); ui.translate(x, y); ui.scale(s, s); ui.lineJoin = 'round'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 4;
  if (kind === 'docs') { ui.fillStyle = 'rgba(200,230,255,0.55)'; rr(-46, -52, 92, 104, 10); ui.fill(); ui.stroke(); ui.fillStyle = '#fff'; ui.fillRect(-30, -40, 56, 72); ui.strokeRect(-30, -40, 56, 72); ui.fillStyle = '#9aa3ab'; for (let i = 0; i < 4; i++) ui.fillRect(-22, -28 + i * 14, 40, 5); ui.fillStyle = '#1557b0'; ui.fillRect(-40, -54, 80, 10); }
  else if (kind === 'torch') { ui.fillStyle = 'rgba(255,235,120,0.5)'; ui.beginPath(); ui.moveTo(30, -10); ui.lineTo(80, -40); ui.lineTo(80, 30); ui.lineTo(30, 10); ui.fill(); ui.fillStyle = '#ffd23f'; rr(-50, -14, 70, 28, 6); ui.fill(); ui.stroke(); ui.fillStyle = '#444'; ui.beginPath(); ui.moveTo(18, -20); ui.lineTo(36, -24); ui.lineTo(36, 24); ui.lineTo(18, 20); ui.closePath(); ui.fill(); ui.stroke(); }
  else if (kind === 'water') { ui.fillStyle = '#5fd0ff'; rr(-22, -36, 44, 82, 12); ui.fill(); ui.stroke(); ui.fillStyle = '#1557b0'; ui.fillRect(-12, -52, 24, 16); ui.strokeRect(-12, -52, 24, 16); ui.fillStyle = '#fff'; ui.fillRect(-22, -6, 44, 18); }
  else if (kind === 'meds') { ui.fillStyle = '#fff'; rr(-48, -30, 60, 64, 8); ui.fill(); ui.stroke(); ui.fillStyle = '#e8443a'; ui.fillRect(-24, -18, 12, 40); ui.fillRect(-38, -4, 40, 12); ui.save(); ui.translate(36, 10); ui.rotate(-0.6); ui.fillStyle = '#e8443a'; rr(-24, -10, 24, 20, 10); ui.fill(); ui.fillStyle = '#fff'; rr(0, -10, 24, 20, 10); ui.fill(); ui.strokeRect(-24, -10, 48, 20); ui.restore(); }
  else if (kind === 'rat') { ui.fillStyle = '#8d8f96'; ui.beginPath(); ui.ellipse(0, 10, 50, 32, 0, 0, Math.PI * 2); ui.fill(); ui.stroke(); ui.beginPath(); ui.ellipse(46, -4, 26, 20, -0.3, 0, Math.PI * 2); ui.fill(); ui.stroke(); ui.fillStyle = '#f2a0b0'; ui.beginPath(); ui.arc(36, -24, 12, 0, Math.PI * 2); ui.fill(); ui.stroke(); ui.fillStyle = '#111'; ui.beginPath(); ui.arc(56, -8, 4, 0, Math.PI * 2); ui.fill(); ui.strokeStyle = '#f2a0b0'; ui.lineWidth = 5; ui.beginPath(); ui.moveTo(-48, 14); ui.quadraticCurveTo(-90, 0, -80, -30); ui.stroke(); }
  else if (kind === 'germ') { ui.fillStyle = '#7ed957'; ui.beginPath(); for (let i = 0; i < 16; i++) { const an = i / 16 * Math.PI * 2, r = i % 2 ? 26 : 36; ui.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ui.closePath(); ui.fill(); ui.stroke(); ui.fillStyle = '#fff'; ui.beginPath(); ui.arc(-9, -5, 8, 0, Math.PI * 2); ui.arc(9, -5, 8, 0, Math.PI * 2); ui.fill(); ui.fillStyle = '#111'; ui.beginPath(); ui.arc(-8, -4, 4, 0, Math.PI * 2); ui.arc(10, -4, 4, 0, Math.PI * 2); ui.fill(); ui.beginPath(); ui.arc(0, 10, 8, 0.1, Math.PI - 0.1); ui.stroke(); }
  else if (kind === 'soap') { ui.fillStyle = '#ffd6ec'; rr(-44, -24, 88, 48, 16); ui.fill(); ui.stroke(); ui.fillStyle = 'rgba(255,255,255,0.8)'; for (let i = 0; i < 4; i++) { ui.beginPath(); ui.arc(-30 + i * 22, -36 - (i % 2) * 12, 10 + (i % 2) * 4, 0, Math.PI * 2); ui.fill(); ui.stroke(); } }
  ui.restore();
}
function kitCards(t, g) {
  const items = [['docs', 'DOCUMENTOS', 'no saco plástico', wordAt('documentos', g.start)], ['torch', 'LANTERNA', '', wordAt('lanterna', g.start)], ['water', 'ÁGUA', '', wordAt('água', wordAt('lanterna', g.start))], ['meds', 'REMÉDIOS', '', wordAt('remédios', g.start)]];
  items.forEach(([k, txt, sub, at], i) => {
    const a = ss(at - 0.15, at + 0.15, t); if (a <= 0) return;
    const x = 760 + (i % 2) * 250, y = 110 + Math.floor(i / 2) * 200;
    ui.save(); ui.globalAlpha = a; ui.translate(x + 110, y + 85); const s = pop(t - at + 0.15, 0.3); ui.scale(s, s); ui.translate(-110, -85);
    ui.fillStyle = 'rgba(10,20,40,0.82)'; rr(0, 0, 220, 170, 20); ui.fill(); ui.strokeStyle = '#ffd23f'; ui.lineWidth = 4; ui.stroke();
    icon(k, 110, 66, 0.9); ui.textAlign = 'center'; outlined(txt, 110, 136, 26, '#ffffff', '#0a1428', 900, 0.15); if (sub) outlined(sub, 110, 160, 16, '#ffd23f', '#0a1428', 800, 0.2);
    ui.restore();
  });
}
function manholeInset(t, a) {
  if (a <= 0) return;
  ui.save(); ui.globalAlpha = a; ui.translate(840, 90); const s = pop(a * 0.35, 0.35); ui.scale(s, s);
  ui.fillStyle = 'rgba(10,20,40,0.85)'; rr(0, 0, 400, 300, 22); ui.fill(); ui.strokeStyle = '#ffd23f'; ui.lineWidth = 4; ui.stroke();
  ui.save(); ui.beginPath(); rr(14, 14, 372, 272, 14); ui.clip();
  ui.fillStyle = '#8e9aa6'; ui.fillRect(14, 14, 372, 90);
  ui.fillStyle = 'rgba(150,115,70,0.95)'; ui.fillRect(14, 100, 372, 70);
  for (let i = 0; i < 5; i++) arrowShape(30 + ((i * 90 + t * 60) % 360), 135, 0, 34, 10, '#5fd0ff');
  ui.fillStyle = '#5c5f63'; ui.fillRect(14, 170, 150, 30); ui.fillRect(236, 170, 150, 30);
  ui.fillStyle = '#7a6a58'; ui.fillRect(14, 200, 150, 90); ui.fillRect(236, 200, 150, 90);
  ui.fillStyle = '#16120e'; ui.fillRect(164, 170, 72, 120);
  ui.restore();
  ui.textAlign = 'center'; outlined('?', 200, 240, 60, '#ffd23f', '#0a1428', 900, 0.2);
  outlined('BUEIRO ABERTO', 200, 50, 30, '#ff6b5a', '#0a1428', 900, 0.2);
  outlined('você não vê o buraco', 200, 330, 22, '#ffffff', '#0a1428', 800, 0.2);
  ui.restore();
}
function phoneDial(t, g, wE) {
  const w193 = wordAt('ou', g.start) - 0.4;
  const a = ss(g.start + 0.3, g.start + 0.7, t) * (1 - ss(wE - 0.3, wE, t)); if (a <= 0) return;
  const two = t > w193 + 0.4;
  ui.save(); ui.globalAlpha = a; ui.translate(Math.min(1010, UIR - 130), 330); const s = pop(t - g.start - 0.3, 0.35); ui.scale(s, s);
  ui.fillStyle = '#1b1b1f'; rr(-120, -230, 240, 440, 34); ui.fill(); ui.fillStyle = two ? '#1e6fd1' : '#c62828'; rr(-104, -200, 208, 360, 18); ui.fill();
  ui.textAlign = 'center'; ui.textBaseline = 'middle';
  outlined(two ? '199' : '193', 0, -90, 92, '#ffffff', '#0a1428', 900, 0.12);
  outlined(two ? 'DEFESA CIVIL' : 'BOMBEIROS', 0, -10, 28, '#ffffff', '#0a1428', 900, 0.15);
  ui.fillStyle = '#2ecc71'; ui.beginPath(); ui.arc(0, 100, 40, 0, Math.PI * 2); ui.fill();
  ui.save(); ui.translate(0, 100); ui.rotate(-0.6 + 0.15 * Math.sin(t * 20)); ui.fillStyle = '#fff'; rr(-24, -8, 48, 16, 8); ui.fill(); ui.restore();
  ui.restore();
}
function pointer(x, y, ang, txt, t0, t, col = '#ffd23f') {   // a fat bouncing arrow pointing at (x, y)
  const a = ss(t0, t0 + 0.25, t); if (a <= 0) return;
  const bob = 14 * Math.abs(Math.sin((t - t0) * 6)), d = 70 + bob;
  ui.save(); ui.globalAlpha = a; ui.translate(x - Math.cos(ang) * d, y - Math.sin(ang) * d); ui.rotate(ang); const s2 = pop(t - t0, 0.25); ui.scale(s2, s2);
  ui.lineJoin = 'round'; ui.fillStyle = col; ui.strokeStyle = '#0a1428'; ui.lineWidth = 6;
  ui.beginPath(); ui.moveTo(0, 0); ui.lineTo(-44, -34); ui.lineTo(-44, -14); ui.lineTo(-110, -14); ui.lineTo(-110, 14); ui.lineTo(-44, 14); ui.lineTo(-44, 34); ui.closePath(); ui.stroke(); ui.fill();
  ui.restore();
  if (txt) { const tx = x - Math.cos(ang) * (d + 150), ty = y - Math.sin(ang) * (d + 150); label(txt, clamp(tx, UIL + 120, UIR - 120), clamp(ty, 70, 570), 34, a, col === '#ffd23f' ? '#ffffff' : col); }
}
function bolts(x, y, t, r = 110) {   // electric arcs crackling around a point
  ui.save(); ui.lineCap = 'round'; ui.lineJoin = 'round';
  const seed = Math.floor(t * 20);
  for (let i = 0; i < 7; i++) { let an = (i / 7) * Math.PI * 2 + Math.sin(seed * 1.7 + i) * 0.5; let px = x, py = y; ui.beginPath(); ui.moveTo(px, py);
    for (let k = 1; k <= 6; k++) { const rr = r * k / 6; px = x + Math.cos(an) * rr + Math.sin(seed * 3.1 + i * 7 + k * 13) * 14; py = y + Math.sin(an) * rr + Math.cos(seed * 2.3 + i * 5 + k * 11) * 14; ui.lineTo(px, py); }
    ui.strokeStyle = 'rgba(120,200,255,0.55)'; ui.lineWidth = 12; ui.stroke(); ui.strokeStyle = '#ffffff'; ui.lineWidth = 4; ui.stroke(); }
  const gl = ui.createRadialGradient(x, y, 0, x, y, r * 0.8); gl.addColorStop(0, 'rgba(200,235,255,0.8)'); gl.addColorStop(1, 'rgba(120,200,255,0)'); ui.fillStyle = gl; ui.beginPath(); ui.arc(x, y, r * 0.8, 0, Math.PI * 2); ui.fill();
  ui.restore();
}
function redX(t) {   // a big red X flashes when a plan is wrong
  const ts = WRONGS();
  const t0 = ts.find(x => t > x && t < x + 0.9); if (t0 === undefined) return;
  const k = t - t0; ui.save(); ui.globalAlpha = 0.85 * (1 - ss(0.5, 0.9, k)); ui.translate(640, 330); const s2 = pop(k, 0.2) * 1.0; ui.scale(s2, s2); ui.rotate(0.05);
  ui.lineCap = 'round'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 64; ui.beginPath(); ui.moveTo(-120, -120); ui.lineTo(120, 120); ui.moveTo(120, -120); ui.lineTo(-120, 120); ui.stroke();
  ui.strokeStyle = '#e8443a'; ui.lineWidth = 44; ui.stroke(); ui.restore();
}
function confetti(t) {   // a burst of confetti when a plan is right
  const a = ASSIMS.find(x => t > x.t && t < x.t + 2.2); if (!a) return;
  const k = t - a.t, cols = ['#ffd23f', '#5ff08a', '#5fd0ff', '#ff6b5a', '#b48bff', '#ffffff'];
  ui.save();
  for (let i = 0; i < 70; i++) { const an = i * 2.399, sp = 260 + (i * 37 % 200), x = 640 + Math.cos(an) * sp * k, y = 300 + Math.sin(an) * sp * k * 0.8 + 260 * k * k;
    ui.globalAlpha = 1 - ss(1.4, 2.2, k); ui.fillStyle = cols[i % cols.length]; ui.save(); ui.translate(x, y); ui.rotate(k * 8 + i); ui.fillRect(-7, -4, 14, 8); ui.restore(); }
  ui.restore();
}
function upArrows(t, x0, txt) { for (let i = 0; i < 3; i++) { const life = (t * 0.9 + i / 3) % 1; ui.save(); ui.globalAlpha = Math.sin(life * Math.PI); arrowShape(x0 + i * 46, 520 - life * 260, -Math.PI / 2, 90, 30, '#5fd0ff'); ui.restore(); } if (txt) label(txt, x0 + 46, 200, 34, 1, '#5fd0ff'); }
function stamp(t) {
  const a = ASSIMS.find(x => t > x.t - 0.05 && t < x.t + 2.6); if (!a) return;
  const k = t - a.t; ui.save(); ui.globalAlpha = 1 - ss(2.2, 2.6, k); ui.translate(640, 300); const s2 = pop(k, 0.3); ui.scale(s2, s2); ui.rotate(-0.05);
  ui.font = '900 50px "Inter Display"'; const tw2 = ui.measureText(a.txt + ' ✓').width + 70;
  ui.fillStyle = 'rgba(30,158,87,0.92)'; rr(-tw2 / 2, -50, tw2, 100, 22); ui.fill(); ui.lineWidth = 7; ui.strokeStyle = '#fff'; ui.stroke();
  ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined(a.txt + ' ✓', 0, 4, 50, '#ffffff', '#0e5a32', 900, 0.14); ui.restore();
}
const PLANS = () => [
  { from: T0('exit1'), to: TE('crawl'), title: 'SAIR DO PRÉDIO', items: [['ELEVADOR', T0('exit1') + 0.3, wordAt('não', T0('exit2')), false], ['ABAIXADO, PELA ESCADA', wordAt('abaixa', T0('idea')), wordAt('assim', T0('crawl')), true]] },
  { from: T0('suit'), to: TE('real'), title: 'APAGAR O INCÊNDIO', items: [['OPÇÃO 1: VIRAR BOMBEIRO', T0('suit') + 0.6, W_TREINOU, false], ['OPÇÃO 2: LIGAR 193', wordAt('opção', T0('real')), wordAt('assim', T0('real')), true]] },
];
function planCard(t, n) {
  if (['replay', 'replay2'].includes(n)) return;
  if (VERT && (n === 'elevgag' || (n === 'exit2' && t > W_ENERGIA - 0.5))) return;
  const P = PLANS().find(p => t >= p.from && t < p.to); if (!P) return;
  if (n === 'gag1b' && t < W_BUEIROS - 0.3) return;
  const vis = P.items.filter(it => t > it[1]); if (!vis.length) return;
  ui.save(); ui.globalAlpha = ss(P.from, P.from + 0.4, t) * (1 - ss(P.to - 0.3, P.to, t));
  const x0 = UIL + 24, y0 = VERT ? 805 - (46 + vis.length * 52) : 118, rowH = 52, w2 = 410;
  ui.fillStyle = 'rgba(10,20,40,0.82)'; rr(x0, y0, w2, 46 + vis.length * rowH, 18); ui.fill();
  ui.textBaseline = 'middle'; ui.textAlign = 'left'; outlined('PLANO: ' + P.title, x0 + 18, y0 + 26, 22, '#ffd23f', '#0a1428', 900, 0.15);
  vis.forEach(([txt, at, res, ok], i) => {
    const y = y0 + 46 + i * rowH + rowH / 2 - 4, done = t > res, a2 = ss(at, at + 0.3, t);
    ui.save(); ui.globalAlpha *= a2;
    ui.fillStyle = !done ? '#55606e' : ok ? '#1e9e57' : '#c62828'; ui.beginPath(); ui.arc(x0 + 34, y, 17, 0, Math.PI * 2); ui.fill();
    ui.textAlign = 'center'; outlined(!done ? '?' : ok ? '✓' : '✗', x0 + 34, y + 2, 22, '#fff', '#0a1428', 900, 0.05);
    ui.textAlign = 'left'; outlined(txt, x0 + 62, y + 2, 26, done && !ok ? '#ff9a8a' : '#ffffff', '#0a1428', 900, 0.14);
    if (done && !ok) { const tw3 = ui.measureText(txt).width; ui.strokeStyle = '#ff6b5a'; ui.lineWidth = 4; ui.beginPath(); ui.moveTo(x0 + 60, y + 2); ui.lineTo(x0 + 62 + tw3 * ss(res, res + 0.3, t), y + 2); ui.stroke(); }
    ui.restore();
  });
  ui.restore();
}
function proj(v) { const s = v.clone().project(camera); const sx = (s.x * 0.5 + 0.5) * SW, sy = (-s.y * 0.5 + 0.5) * SH; return [(sx - UIOX) / UIK, (sy - UIOY) / UIK]; }
function fullRect() { ui.save(); ui.setTransform(1, 0, 0, 1, 0, 0); ui.fillRect(0, 0, SW, SH); ui.restore(); }
function overlay(t, g) {
  ui.setTransform(1, 0, 0, 1, 0, 0); ui.clearRect(0, 0, SW, SH); ui.setTransform(UIK, 0, 0, UIK, UIOX, UIOY);
  const lt = t - g.start, n = g.scene, fadeIn = ss(0, 0.3, lt);
  if (n === 'explain') explain3D(t, g);
  if (n === 'title' && !NOTITLE) {
    if (lt > 0.6) { const s = pop(lt - 0.6, 0.5); ui.save(); ui.translate(640, 300); ui.scale(s, s); ui.rotate(-0.02); ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.globalAlpha = 1 - ss(g.dur - 0.6, g.dur, lt); outlined('Você sobreviveria', 0, -55, 72, '#ffffff', '#0a2a4a', 900, 0.18); outlined('a um INCÊNDIO?', 0, 45, 100, '#ff8a2a', '#0a2a4a', 900, 0.18); ui.restore(); }
    ui.save(); ui.globalAlpha = ss(0, 1, lt) * (1 - ss(g.dur - 0.6, g.dur, lt)); ui.textAlign = 'center'; outlined('GUIA DE SOBREVIVÊNCIA  •  EPISÓDIO 4', 640, 110, 26, '#ffffff', '#0a2a4a', 800, 0.2); ui.restore();
  }
  if (n === 'home') { const c2 = wordAt('cachorro', g.start) - g.start; if (lt > c2) { ui.save(); ui.textAlign = 'center'; const [x, y] = [760, 300]; for (let i = 0; i < 3; i++) { const life = (lt * 0.6 + i / 3) % 1; ui.globalAlpha = 1 - life; outlined('z', x + i * 26 + life * 30, y - life * 110, 30 + i * 8, '#ffffff', '#0a1428', 900, 0.2); } ui.restore(); } }
  if (n === 'fire') {
    if (t > W_CURTO - 0.2 && t < W_MINUTOS - 0.3) { const [x, y] = proj(bw(-1.125, 4.6, -4.3)); pointer(x, y, -Math.PI * 0.8, 'CURTO-CIRCUITO', W_CURTO - 0.2, t, '#ffd23f'); }
    if (t > F0) badge('⚠ INCÊNDIO NO PRÉDIO!', ss(F0, F0 + 0.3, t), '#c62828');
    if (t > W_MINUTOS - 0.3 && t < W_FOGO - 0.6) label('O PRÉDIO INTEIRO!', 760, 150, 54, ss(W_MINUTOS - 0.3, W_MINUTOS + 0.1, t), '#ff8a2a');
    if (t > W_FOGO - 0.6) { const [x, y] = proj(AP(4.4, 0.3, 2.9)); pointer(x - 20, y - 20, -Math.PI * 0.2, 'FUMAÇA!', W_FOGO - 0.6, t, '#ff6b5a'); }
  }
  if (n === 'friend1') { badge('⚠ INCÊNDIO NO PRÉDIO!', 1, '#c62828'); const k = lt - 0.2; if (k > 0) { const [hx, hy] = headOnScreen(friend); questionMarks(k, clamp(hx, 300, 980), clamp(hy, 300, 420)); } }
  if (n === 'exit1') { const [x, y] = proj(V(IO.x - 6, IO.y + 10.4, IO.z - 0.9)); pointer(x, y, Math.PI * 0.8, 'ELEVADOR', g.start + 0.3, t); }
  if (n === 'exit2') { badge('✗ PÉSSIMA IDEIA', ss(0, 0.3, lt), '#c62828'); if (t > W_ENERGIA) { const k = t - W_ENERGIA; if (k < 0.6 && Math.floor(k * 12) % 2 === 0) { ui.fillStyle = 'rgba(0,0,0,0.5)'; fullRect(); } label('SEM ENERGIA = PRESO NA FUMAÇA', 640, 160, 42, ss(W_ENERGIA, W_ENERGIA + 0.3, t), '#ff6b5a'); } }
  if (n === 'elevgag') { badge('✗ PÉSSIMA IDEIA', 1, '#c62828'); const [x1, y1] = headOnScreen(hero, 0.9), [x2, y2] = headOnScreen(friend, 0.9);
    ui.save(); ui.textAlign = 'center'; if (lt < 1.2) { ui.translate(640, 170); const s2 = pop(lt, 0.2); ui.scale(s2, s2); outlined('SOCORRO!', 0, 0, 72, '#ffffff', '#c62828', 900, 0.18); } ui.restore();
    ui.save(); ui.textAlign = 'center'; for (let i = 0; i < 3; i++) { const a2 = ss(0.5 + i * 0.4, 0.7 + i * 0.4, lt); if (a2 <= 0) continue; ui.globalAlpha = a2; outlined('COF!', (i % 2 ? x2 : x1) + (i % 2 ? 80 : -80), (i % 2 ? y2 : y1) - 20 - i * 25, 46, '#ffffff', '#0a1428', 900, 0.2); } ui.restore();
    if (lt > 1.0) { stars(x1, y1 - 30, lt); stars(x2, y2 - 30, lt + 1); } }
  if (n === 'idea') { const [x, y] = headOnScreen(hero, 1.0); lightbulb(x, y - 70, lt); }
  if (n === 'crawl' || n === 'idea') { const dc = Math.abs(t - (W_ESCADA + 0.5)); if (dc < 0.3) { ui.fillStyle = `rgba(0,0,0,${1 - dc / 0.3})`; fullRect(); } }
  if (n === 'crawl' && t > W_ESCADA + 1.8) label('AR LIVRE!', 640, 150, 54, ss(W_ESCADA + 1.8, W_ESCADA + 2.1, t), '#5ff08a');
  if (n === 'crawl') {
    const items = [['1', 'PANO NO NARIZ', W_PANO], ['2', 'ABAIXADO', wordAt('abaixado', g.start)], ['3', 'PELA ESCADA', W_ESCADA]];
    items.forEach(([k, txt, at], i) => { const a = ss(at - 0.1, at + 0.2, t); if (a <= 0) return; ui.save(); ui.globalAlpha = a; ui.translate(UIR - 20 - 370 + (1 - a) * 80, 120 + i * 82); ui.fillStyle = 'rgba(10,20,40,0.8)'; rr(0, 0, 370, 68, 18); ui.fill(); ui.fillStyle = '#1e9e57'; ui.beginPath(); ui.arc(38, 34, 25, 0, Math.PI * 2); ui.fill(); ui.textBaseline = 'middle'; ui.textAlign = 'center'; outlined(k, 38, 36, 28, '#fff', '#1e9e57', 900, 0.05); ui.textAlign = 'left'; outlined(txt, 76, 36, 30, '#ffd23f', '#0a1428', 900, 0.12); ui.restore(); });
  }
  if (n === 'roll') {
    if (t > EMBER_T - 0.9 && t < EMBER_T + 0.6) { const [x, y] = headOnScreen(friend, 0.6); pointer(x, y - 20, Math.PI * 0.5, 'BRASA!', EMBER_T - 0.9, t, '#ff6b5a'); }
    if (t > W_CORRER - 0.1 && t < W_PARE) label('✗ CORRER ALIMENTA O FOGO', 640, 150, 42, ss(W_CORRER - 0.1, W_CORRER + 0.2, t), '#ffffff', '#c62828');
    [['PARE', W_PARE], ['DEITE', W_DEITE], ['ROLE', W_ROLE]].forEach(([txt, at], i) => { const a = ss(at - 0.1, at + 0.2, t); if (a <= 0) return; ui.save(); ui.globalAlpha = a; ui.translate((VERT ? 430 : 700) + i * 210, VERT ? 260 : 130); const s2 = pop(t - at + 0.1, 0.25); ui.scale(s2, s2); ui.fillStyle = '#1e9e57'; rr(-95, -38, 190, 76, 20); ui.fill(); ui.lineWidth = 5; ui.strokeStyle = '#fff'; ui.stroke(); ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined(txt + (i < 2 ? '' : '!'), 0, 3, 42, '#ffffff', '#0e5a32', 900, 0.12); ui.restore(); });
  }
  if (n === 'suit' || n === 'blast') {
    if (n === 'suit') badge('★ OPÇÃO 1: A MAIS LEGAL', fadeIn, '#c25a12');
    if (t > W_VESTIR + 0.15 && t < W_VESTIR + 1.4) { ui.save(); ui.textAlign = 'center'; ui.translate(640, 140); const s2 = pop(t - W_VESTIR - 0.15, 0.25); ui.scale(s2, s2); ui.rotate(-0.05); outlined('TCHARAM!', 0, 0, 84, '#ffd23f', '#c62828', 900, 0.17); ui.restore(); for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 + t * 2, k = t - W_VESTIR; ui.save(); ui.globalAlpha = Math.max(0, 1 - k); ui.fillStyle = '#ffe14d'; ui.translate(640 + Math.cos(an) * (120 + k * 260), 360 + Math.sin(an) * (80 + k * 160)); ui.rotate(an); ui.fillRect(-3, -14, 6, 28); ui.restore(); } }
    if (t > W_EXT && t < W_APAGAR_P - 0.1) { const [x, y] = headOnScreen(hero, -0.3); pointer(x + 30, y, Math.PI * 0.85, 'EXTINTOR', W_EXT, t, '#ff6b5a'); }
    if (n === 'blast' && lt > g.dur - 1.6) label('PRÉDIO APAGADO!', 820, 150, 60, ss(g.dur - 1.6, g.dur - 1.3, lt), '#5ff08a');
  }
  if (n === 'real') {
    badge('★ OPÇÃO 2: A DA VIDA REAL', fadeIn, '#1557b0');
    if (t > W_TREINOU - 0.2 && t < W_LONGE - 0.2) label('SÓ BOMBEIRO TREINADO FAZ ISSO!', 830, 165, 40, ss(W_TREINOU - 0.2, W_TREINOU + 0.2, t), '#ffffff', '#c62828');
    if (t > W_LONGE - 0.2 && t < W_193) label('FIQUE LONGE DO PRÉDIO', 830, 165, 44, ss(W_LONGE - 0.2, W_LONGE + 0.2, t), '#ffd23f');
    const a = ss(W_193 - 0.2, W_193 + 0.2, t) * (1 - ss(W_193 + 1.2, W_193 + 1.6, t)); if (a > 0) { ui.save(); ui.globalAlpha = a; ui.translate(1010, 330); const s = pop(t - W_193 + 0.2, 0.35); ui.scale(s, s); ui.fillStyle = '#1b1b1f'; rr(-120, -230, 240, 440, 34); ui.fill(); ui.fillStyle = '#c62828'; rr(-104, -200, 208, 360, 18); ui.fill(); ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined('193', 0, -90, 92, '#ffffff', '#0a1428', 900, 0.12); outlined('BOMBEIROS', 0, -10, 28, '#ffffff', '#0a1428', 900, 0.15); ui.fillStyle = '#2ecc71'; ui.beginPath(); ui.arc(0, 100, 40, 0, Math.PI * 2); ui.fill(); ui.restore(); }
  }
  if (n === 'q1') { ui.save(); ui.translate(VERT ? 820 : 940, 200); const s = pop(lt - 0.2); ui.scale(s, s); ui.rotate(0.05); ui.textAlign = 'center'; outlined('SEGUIR AS DICAS ✓', 0, 0, 46, '#5ff08a', '#0a1428', 900, 0.2); ui.restore(); const w2 = wordAt('ou', g.start); if (t > w2) { ui.save(); ui.translate(VERT ? 480 : 330, VERT ? 300 : 280); const s = pop(t - w2); ui.scale(s, s); ui.rotate(-0.05); ui.textAlign = 'center'; outlined('O CAMINHO MAIS RÁPIDO?', 0, 0, 40, '#ffd23f', '#0a1428', 900, 0.2); ui.restore(); } }
  if (n === 'q3') { const [x, y] = proj(AP(2.3, 2.1, -3.45)); pointer(x, y, -Math.PI * 0.2, 'JANELA', g.start + 0.4, t); }
  if (n === 'jump') {
    if (t > CRASH - 0.05 && t < CRASH + 0.9) { const k = t - CRASH; if (k < 0.12 && k > 0) { ui.fillStyle = `rgba(255,255,255,${0.7 * (1 - k / 0.12)})`; fullRect(); } ui.save(); ui.textAlign = 'center'; ui.translate(640, 150); const s2 = pop(Math.max(0, k), 0.18); ui.scale(s2, s2); ui.rotate(-0.08); outlined('CRASH!', 0, 0, 96, '#bfe6ff', '#0a1428', 900, 0.17); ui.restore(); }
    if (t > CRASH + 0.4 && t < LAND) { ui.save(); ui.textAlign = 'center'; ui.globalAlpha = 0.95; outlined('AAAAAH!', 760 + Math.sin(t * 30) * 6, 200, 64, '#ffffff', '#c62828', 900, 0.18); ui.restore(); }
    if (t > LAND && t < LAND + 1.2) { ui.save(); ui.textAlign = 'center'; ui.translate(640, 200); const s2 = pop(t - LAND, 0.18); ui.scale(s2, s2); ui.rotate(-0.1); outlined('SPLAT!', 0, 0, 100, '#ffd23f', '#0a1428', 900, 0.17); ui.restore(); }
  }
  if (n === 'gag3') { const [x, y] = headOnScreen(friend, 0.2); for (let i = 0; i < 4; i++) { const life = (lt * 0.7 + i / 4) % 1; ui.fillStyle = `rgba(90,90,90,${0.5 * (1 - life)})`; ui.beginPath(); ui.arc(x + Math.sin(lt * 3 + i) * 12, y - 60 - life * 120, 10 + life * 18, 0, Math.PI * 2); ui.fill(); } }
  if (n === 'end') {
    const w1 = wordAt('sobrevivi', wordAt('comente', g.start) + 0.1), w2 = wordAt('não', w1 + 0.1);
    const bubble = (x, y, txt, col, at, ic) => { const a = ss(at - 0.2, at + 0.15, t); if (a <= 0) return; ui.save(); ui.globalAlpha = a; ui.translate(x, y); const s2 = pop(t - at + 0.2, 0.3); ui.scale(s2, s2); ui.rotate(Math.sin((t - at) * 3) * 0.03);
      ui.font = '900 46px "Inter Display"'; const tw = ui.measureText(txt).width + 130; ui.fillStyle = '#ffffff'; rr(-tw / 2, -50, tw, 100, 30); ui.fill(); ui.beginPath(); ui.moveTo(-tw / 2 + 40, 44); ui.lineTo(-tw / 2 + 30, 82); ui.lineTo(-tw / 2 + 80, 48); ui.fill();
      ui.lineWidth = 6; ui.strokeStyle = col; rr(-tw / 2, -50, tw, 100, 30); ui.stroke();
      ui.fillStyle = col; ui.beginPath(); ui.arc(-tw / 2 + 55, 0, 30, 0, Math.PI * 2); ui.fill(); ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined(ic, -tw / 2 + 55, 3, 36, '#ffffff', col, 900, 0.05);
      ui.textAlign = 'left'; ui.fillStyle = '#1b1b1b'; ui.fillText(txt, -tw / 2 + 100, 4); ui.restore(); };
    ui.save(); ui.globalAlpha = ss(0.2, 0.6, lt); ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined('COMENTE AÍ!', 640, 90, 54, '#ffd23f', '#0a1428', 900, 0.18); ui.restore();
    bubble(VERT ? 520 : 420, 250, 'SOBREVIVI', '#1e9e57', w1, '✓');
    bubble(VERT ? 760 : 860, 400, 'NÃO CONSEGUI', '#c62828', w2, '✗');
  }
  planCard(t, n); redX(t); stamp(t); confetti(t);
  if (n !== 'title' && !NOCAP) caption(t);
  if (flash > 0) { ui.fillStyle = `rgba(255,240,210,${flash})`; fullRect(); }
  if (t < 0.5) { ui.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; fullRect(); }
  const fo = ss(TL.total - 1.0, TL.total, t); if (fo > 0) { ui.fillStyle = `rgba(0,0,0,${fo})`; fullRect(); }
}

window.renderFrame = (t) => {
  REAL_T = t;
  let g = seg(t), tt = t;
  if (g.scene === 'pause') tt = g.start;                         // freeze frame
  if (g.scene === 'replay') { const k = ease(clamp((t - g.start) / (g.dur - 0.2))); tt = lerp(TE('elevgag') - 0.05, T0('exit1') + 0.3, k); }   // rewind the bad idea
  const gs = seg(tt), lt = tt - gs.start;
  const H2 = updateHouse(tt, gs.scene, lt);
  const wv = world(tt, gs.scene, lt); direct(tt, gs.scene, lt, gs, H2);
  updateRain(tt, wv.inside || ['explain', 'depth'].includes(gs.scene) ? 0 : (gs.scene === 'end' ? 0 : wv.storm));
  sunSprite.position.copy(camera.position).addScaledVector(skyU.sunDir.value, 420); sunHalo.position.copy(sunSprite.position);
  if (apt.visible) {
    const wp = bw(1.0, 7.9, -4.35), wt = bw(1.0, 5.0, -16); winCam.position.copy(wp); winCam.lookAt(wt);
    const insideRain = rain.visible; updateRain(tt, wv.storm, winCam.position); rain.visible = wv.storm > 0;
    const hb = hero.root.visible, fb = friend.root.visible, db = dog.visible; hero.root.visible = friend.root.visible = dog.visible = false;
    const sunVis = sunSprite.visible; sunSprite.visible = sunHalo.visible = false;
    renderer.setRenderTarget(winRT); renderer.render(scene, winCam); renderer.setRenderTarget(null);
    hero.root.visible = hb; friend.root.visible = fb; dog.visible = db; sunSprite.visible = sunHalo.visible = sunVis; rain.visible = insideRain;
    aptParts.glass.map.offset.y = -tt * 0.25;
  }
  renderer.render(scene, camera); overlay(t, g); return true;
};
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"'); await document.fonts.load('800 40px "Inter Display"');
window.READY = true;
