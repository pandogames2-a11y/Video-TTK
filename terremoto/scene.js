import * as THREE from 'three';

const W = 1280, H = 720;
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
renderer.setSize(W, H, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 800);

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

// ---------- terrain ----------
const HILL = { x: -30, z: 34 };
const ROAD = { x: 22, z: 17.6, half: 42, y: 0.06 * 17.6 };   // runs from x=-20 to x=64, into a tunnel at each end
function terrainH(x, z) {
  let h;
  if (z >= 0) h = 0.06 * z;
  else if (z > -30) h = 0.09 * z;
  else h = -2.7 - (1 - Math.exp((z + 30) / 25)) * 6;
  if (z > 12) h += 0.25 * Math.sin(x * 0.35) * Math.sin(z * 0.4) * ss(12, 20, z);
  const d = Math.hypot(x - HILL.x, z - HILL.z);
  h += 13 * (1 - ss(4.5, 21, d));
  h += ss(48, 75, z) * 7 + ss(60, 90, Math.abs(x)) * ss(20, 40, z) * 6;
  const road = (1 - ss(2.0, 3.4, Math.abs(z - ROAD.z))) * (1 - ss(ROAD.half, ROAD.half + 3, Math.abs(x - ROAD.x)));
  h = lerp(h, ROAD.y, road);
  return h;
}
{
  const g = new THREE.PlaneGeometry(260, 340, 200, 260); g.rotateX(-Math.PI / 2); g.translate(0, 0, -80);
  const p = g.attributes.position, col = [];
  const sand = new THREE.Color(0xeed7a3), wet = new THREE.Color(0xb89a6a), grass = new THREE.Color(0x5f9a3c), grass2 = new THREE.Color(0x7bb24a), deep = new THREE.Color(0x9c8460);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = terrainH(x, z); p.setY(i, h);
    const d = Math.hypot(x - HILL.x, z - HILL.z);
    let c = sand.clone();
    if (z < 1.5) c.lerp(wet, ss(1.5, -1, z));
    if (z < -6) c.lerp(deep, ss(-6, -30, z));
    const gm = Math.max(1 - ss(13, 19, d), ss(45, 55, z), ss(60, 75, Math.abs(x)) * ss(20, 30, z));
    c.lerp(R() > 0.5 ? grass : grass2, gm);
    c.offsetHSL(0, 0, (R() - 0.5) * 0.04);
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
const muddy = t => ss(HIT + 3, HIT + 6, t);
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
  const p = palm(h, l); p.rotation.y = R() * 6; place(p, x, z, -0.1); p.userData.ph = R() * 6; palms.push(p);
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

// building
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
  const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), std(0xffffff, { map: wt, roughness: 0.85 })); body.position.y = bh / 2; building.add(body);
  const roofM = std(0xb0a090);
  const parapets = [[0, bd / 2, bw, 0.3], [0, -bd / 2, bw, 0.3], [bw / 2, 0, 0.3, bd], [-bw / 2, 0, 0.3, bd]];
  parapets.forEach(([x, z, sx, sz]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 0.7, sz), roofM); m.position.set(x, bh + 0.35, z); building.add(m); });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.1), std(0x6b4425)); door.position.set(0, 1.2, -bd / 2 - 0.02); building.add(door);
  const stairs = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), std(0x888888)); stairs.position.set(-2.5, bh + 0.15, 0); building.add(stairs);
  shadowAll(building); place(building, 17, 25, -0.3); building.rotation.y = 0.15;
}
const BTOP = building.position.y + 13;

// bushes and rocks on hill
for (let i = 0; i < 26; i++) {
  const a = R() * Math.PI * 2, r = 5 + R() * 13, x = HILL.x + Math.cos(a) * r, z = HILL.z + Math.sin(a) * r;
  const b = shadowAll(new THREE.Mesh(new THREE.IcosahedronGeometry(0.6 + R() * 0.9, 1), std(R() > 0.5 ? 0x3e7d2b : 0x5a9a35, { flatShading: true })));
  place(b, x, z, 0.2);
}
// distant hills/houses on right
for (let i = 0; i < 6; i++) {
  const hx = 30 + i * 6, hz = 40 + (i % 2) * 6;
  const h = shadowAll(new THREE.Mesh(new THREE.BoxGeometry(4, 3 + (i % 3), 4), std([0xf6c8a0, 0xa8d8ea, 0xffe6a7, 0xf7a7a7][i % 4])));
  place(h, hx, hz, 1.5);
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
      const g1 = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 10), gm); g1.rotation.x = Math.PI; g1.position.set(0, -0.22, 0.315); g1.rotation.x = Math.PI - 0.35; this.body.add(g1);
      const g2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), gm); g2.scale.set(1.3, 0.6, 0.6); g2.position.set(0, -0.165, 0.335); this.body.add(g2);
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
      if (p.legs === 'crouch') { L.hip.rotation.set(-0.55, 0, sgn * 0.38); L.kn.rotation.set(1.0, 0, -sgn * 0.2); return; }
      if (p.legs === 'sit') { L.hip.rotation.set(-1.45 - (p.lean || 0), 0, sgn * 0.12); L.kn.rotation.set(0.25, 0, 0); return; }
      const sw = Math.sin(ph + (i ? Math.PI : 0));
      L.hip.rotation.set(-sw * 0.9 * run, 0, 0);
      L.kn.rotation.set(Math.max(0, Math.cos(ph + (i ? Math.PI : 0))) * 1.4 * run, 0, 0);
    });
    if (p.legs === 'sit') b.position.y = p.sitY ?? 0.6;
    if (p.legs === 'crouch') b.position.y = 0.83;
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
    const blinkT = (t + this.blinkSeed) % 3.7; const bl = blinkT < 0.12 ? 1 : 0;
        this.lids.forEach(l => { l.rotation.x = lerp(-1.3 + (p.eyesWide ? -0.3 : 0) + (p.squint || 0), 1.5, bl); });
    const look = p.look || [0, 0];
    this.pupils.forEach(pu => { pu.position.x = look[0] * 0.04; pu.position.y = look[1] * 0.04; const sc = p.eyesWide ? 0.75 : 1; pu.scale.set(sc, sc * 1.2, 0.6); });
    this.eyes.forEach(e => e.scale.setScalar(p.eyesWide ? 1.15 : 1));
    const brow = p.brow || 0; // + worried, - angry
    this.brows.forEach((br, i) => { const s = i ? 1 : -1; br.rotation.z = -s * brow * 0.4; br.position.y = 0.4 + Math.abs(brow) * 0.03 + (p.eyesWide ? 0.05 : 0); if (p.smirk && i === 1) { br.position.y += 0.05; br.rotation.z = -0.25; } });
    const m = clamp(p.mouth || 0);
    this.mouthIn.scale.set(lerp(0.8, 1.0, m), lerp(0.08, 0.75, m) + (p.shout || 0) * 0.6, 0.3);
    this.mouthIn.visible = m > 0.03 || p.shout;
    this.smile.visible = (p.smile ?? 1) > 0 && m < 0.15 && !p.shout;
    this.smile.rotation.z = (p.smile ?? 1) > 0 ? Math.PI : 0;
    if (p.smirk) { this.smile.visible = true; this.smile.rotation.z = Math.PI + 0.2; this.smile.scale.set(0.95, 1.05, 1.3); this.smile.position.set(0.025, 0.05, 0.01); } else { this.smile.scale.set(1, 1, 1); this.smile.position.set(0, 0.03, 0); }
    if (this.nut) this.nut.visible = p.nut !== false;
    if (this.cam) this.cam.visible = p.camOn !== false;
    this.root.visible = p.visible !== false;
    this.shades.visible = !!(p.shades || p.shadesUp); this.shades.position.set(0, p.shadesUp ? 0.17 : 0, p.shadesUp ? 0.02 : 0); this.shades.rotation.x = p.shadesUp ? -0.3 : 0;
    this.heldFish.visible = !!p.fish; if (p.fish) this.heldFish.rotation.y = Math.sin(t * 14) * 0.4;
    if (this.hatG) this.hatG.visible = p.hat !== false;
    const soot = p.soot || 0, zap = p.zap || 0, dust = p.dust || 0;
    this.skinM.color.copy(this.baseColor).lerp(new THREE.Color(0x231a14), soot * 0.85).lerp(new THREE.Color(0xe9e4da), dust * 0.85);
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
const DOOR = { x: bp.x - 4.2 * Math.sin(0.15), z: bp.z - 4.2 * Math.cos(0.15) };
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
cars[3].userData.home.x = 22.5; cars[3].position.x = 22.5;   // keep the road in front of the building door clear
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
tunnel(ROAD.x - ROAD.half, 1); tunnel(ROAD.x + ROAD.half, -1);
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

// ---------- more beachfront buildings (right side) ----------
{
  const winTex = (base, glass) => canvasTex(256, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); for (let f = 0; f < 8; f++) for (let k = 0; k < 3; k++) { g.fillStyle = glass; g.fillRect(22 + k * 78, 18 + f * 62, 52, 40); } });
  [[26, 26, 6, 11, 0xf6c8a0], [33, 29, 7, 16, 0xa8d8ea], [40, 25.5, 6, 9, 0xffe6a7], [47, 31, 8, 19, 0xe9e2f5], [55, 27, 6, 12, 0xf7a7a7], [30, 37, 6, 14, 0xd6f0c8], [44, 40, 7, 10, 0xfde2c4]].forEach(([x, z, w, h, c]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.9), std(0xffffff, { map: winTex('#' + c.toString(16).padStart(6, '0'), '#5f8fb3'), roughness: 0.85 }));
    m.position.y = h / 2; const g = new THREE.Group(); g.add(m);
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.4, w * 0.9 + 0.3), std(0xb0a090)); top.position.y = h + 0.2; g.add(top);
    shadowAll(g); place(g, x, z, -0.2); g.rotation.y = 0.1 - (x % 3) * 0.04;
  });
}

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
const storm = new THREE.Group(); scene.add(storm);
for (let i = 0; i < 16; i++) {
  const c = new THREE.Group();
  for (let k = 0; k < 5; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(6 + R() * 6, 12, 8), stormM); m.position.set(k * 7 - 14, R() * 3, R() * 4); m.scale.y = 0.55; c.add(m); }
  c.position.set(-230 + i * 30 + R() * 10, 24 + R() * 14, -190 - R() * 50); storm.add(c);
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
  const elevSign = canvasTex(512, 256, (g, w, h) => { g.fillStyle = '#c62828'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 54px "Inter Display"'; g.fillText('EM CASO DE TSUNAMI', w / 2, 90); g.font = '900 64px "Inter Display"'; g.fillText('USE A ESCADA', w / 2, 175); });
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
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), std(0xffffff, { map: canvasTex(256, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd8ff'); gr.addColorStop(0.55, '#e6f6ff'); gr.addColorStop(0.56, '#1a8fb5'); gr.addColorStop(1, '#0b4f8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2f2'; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); }), emissive: 0x335566, emissiveIntensity: 0.3 }));
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
const DOG_HILL = { x: TOP.x - 0.2, z: TOP.z - 1.6 };
// water's edge at the foot of the hill (for the electric-shock gag)
const EDGE = (() => { const dir = V(-6 - TOP.x, 0, 12 - TOP.z).normalize(); let p = V(TOP.x, 0, TOP.z); for (let i = 0; i < 400; i++) { p.addScaledVector(dir, 0.1); if (terrainH(p.x, p.z) < 1.3 + 0.45) break; } return { x: p.x, z: p.z, ry: Math.atan2(dir.x, dir.z), dir }; })();

// =====================================================================
//  EPISÓDIO 2 — TERREMOTO
// =====================================================================
const WORDS = await (await fetch('/audio/words.json')).json().catch(() => []);
const wordAt = (w, after) => { const x = WORDS.find(k => k.t0 >= after - 0.01 && k.text.toLowerCase().replace(/[^a-zà-ú]/g, '').startsWith(w)); return x ? x.t0 : after; };
// sun lights the open (camera) side of interior sets
const INSIDE = n => ['home', 'run1', 'calm', 'shake', 'friend1', 'pause', 'idea', 'rule', 'stop', 'friend2', 'after', 'after2', 'gas1', 'gas2', 'gas3', 'gas4', 'q2', 'q3', 'q4', 'crack', 'ohoh', 'crash', 'run2a'].includes(n);

// ---------- the apartment (a cutaway set, open toward the camera) ----------
const AO = V(-150, 0, 150);
const apt = new THREE.Group(); apt.position.copy(AO); scene.add(apt);
const AP = (x, y, z) => V(AO.x + x, AO.y + y, AO.z + z);
const aptParts = {};
const books = [], cups = [], plaster = [];
{
  const wood = canvasTex(512, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = ['#b07a48', '#a8703f', '#b98452', '#a06a3b'][i % 4]; g.fillRect(0, i * h / 8, w, h / 8); g.fillStyle = 'rgba(60,30,10,0.35)'; g.fillRect(0, i * h / 8, w, 3); g.fillRect((i * 173) % w, i * h / 8, 3, h / 8); } }); wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(3, 2);
  const wallM = std(0xf1e6d2, { roughness: 0.95, side: THREE.DoubleSide }), accent = std(0x7fb6c8, { roughness: 0.95, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.2, 7.2), std(0xffffff, { map: wood, roughness: 0.7 })); floor.position.set(0, -0.1, 0); apt.add(floor);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 3.8), accent); back.position.set(0, 1.9, -3.5); apt.add(back);
  const left = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.8), wallM); left.rotation.y = Math.PI / 2; left.position.set(-4.6, 1.9, 0); apt.add(left);
  const right = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 3.8), wallM); right.rotation.y = -Math.PI / 2; right.position.set(4.6, 1.9, 0); apt.add(right);
  const ceilTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = '#f7f2ea'; g.fillRect(0, 0, w, h); });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 7.2), std(0xffffff, { map: ceilTex, side: THREE.DoubleSide, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.8, 0); apt.add(ceil);
  // ceiling crack for the ending gag
  const crackTex = canvasTex(512, 512, (g, w, h) => { g.strokeStyle = '#3a2f26'; g.lineWidth = 6; g.lineCap = 'round'; const r = rnd(5); for (let k = 0; k < 7; k++) { let x = w / 2, y = h / 2; g.beginPath(); g.moveTo(x, y); const a0 = k / 7 * Math.PI * 2; for (let i = 0; i < 9; i++) { x += Math.cos(a0 + (r() - 0.5)) * 26; y += Math.sin(a0 + (r() - 0.5)) * 26; g.lineTo(x, y); } g.stroke(); } });
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false })); crack.rotation.x = Math.PI / 2; crack.position.set(-1.0, 3.78, -2.2); apt.add(crack); aptParts.ceilCrack = crack;
  const base = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.18, 0.04), std(0xffffff)); base.position.set(0, 0.09, -3.48); apt.add(base);
  // rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), std(0xffffff, { map: canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#c0504d'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2d16b'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#e7c35a'; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(40 + i * 44, h / 2, 10, 0, Math.PI * 2); g.fill(); } }), roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-1.0, 0.012, -0.6); apt.add(rug);
  // sofa against the back wall, facing the camera
  const sofaM = std(0x3d6fa8, { roughness: 0.9 });
  const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 1.1), sofaM); seat.position.set(-1.0, 0.25, -2.75); apt.add(seat);
  const cush = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.12, 0.95), std(0x4a80bd, { roughness: 0.9 })); cush.position.set(-1.0, 0.54, -2.7); apt.add(cush);
  const sback = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.0, 0.3), sofaM); sback.position.set(-1.0, 0.85, -3.2); apt.add(sback);
  for (const s of [-1, 1]) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.75, 1.1), sofaM); arm.position.set(-1.0 + s * 1.6, 0.4, -2.75); apt.add(arm); }
  // coffee table with cups and a snack bowl
  const ctM = std(0x6b4a2e, { roughness: 0.6 });
  const ct = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.75), ctM); ct.position.set(-1.0, 0.48, -1.1); apt.add(ct);
  for (const [x, z] of [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.45, 0.07), ctM); l.position.set(-1.0 + x, 0.22, -1.1 + z); apt.add(l); }
  for (const [x, c] of [[-1.4, 0xe8443a], [-1.15, 0x2e7dd1]]) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.14, 12), std(c, { roughness: 0.3 })); cup.position.set(x, 0.59, -1.05); cup.userData.home = cup.position.clone(); apt.add(cup); cups.push(cup); }
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), std(0xf2f2f2)); bowl.position.set(-0.6, 0.68, -1.1); apt.add(bowl);
  const pop = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), std(0xfff3b0, { roughness: 1, flatShading: true })); pop.scale.y = 0.5; pop.position.set(-0.6, 0.6, -1.1); apt.add(pop);
  // TV on a low stand near the camera, screen facing the sofa
  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.5), std(0x2e2e33)); tvStand.position.set(-1.0, 0.25, 2.9); apt.add(tvStand);
  const gameTex = canvasTex(512, 288, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5ec8ff'); gr.addColorStop(1, '#bff0ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#58b947'; g.fillRect(0, 230, w, 58); g.fillStyle = '#8a5a2b'; g.fillRect(0, 250, w, 38); g.fillStyle = '#c9773c'; for (let i = 0; i < 5; i++) g.fillRect(120 + i * 40, 140, 34, 34); g.fillStyle = '#ffd23f'; g.fillRect(150, 100, 28, 28); g.fillStyle = '#e8443a'; g.fillRect(60, 196, 26, 34); g.fillStyle = '#1b1b1b'; g.fillRect(360, 204, 30, 26); g.fillStyle = '#fff'; g.font = 'bold 26px monospace'; g.fillText('P1 3400   P2 3150', 14, 32); });
  const tv = new THREE.Group(); tv.position.set(-1.0, 1.2, 2.95); apt.add(tv); aptParts.tv = tv;
  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 0.1), std(0x16161a, { roughness: 0.4 })); tv.add(tvBody);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.02), new THREE.MeshBasicMaterial({ map: gameTex })); screen.position.z = -0.056; screen.rotation.y = Math.PI; tv.add(screen); aptParts.screen = screen;
  const tvLight = new THREE.PointLight(0x9fdcff, 1.2, 6, 2); tvLight.position.set(-1.0, 1.2, 2.3); apt.add(tvLight); aptParts.tvLight = tvLight;
  // sturdy dining table (big enough for two beans and a dog) + chairs
  const tabM = std(0x8a5a32, { roughness: 0.5 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 1.7), tabM); top.position.set(2.5, 1.5, -0.5); apt.add(top); aptParts.tableTop = top;
  aptParts.tableLegs = [];
  for (const [x, z] of [[-1.15, -0.72], [1.15, -0.72], [-1.15, 0.72], [1.15, 0.72]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 0.14), tabM); l.position.set(2.5 + x, 0.72, -0.5 + z); apt.add(l); aptParts.tableLegs.push(l); }
  for (const [x, z, r] of [[1.0, 1.05, 0.3], [4.1, -1.2, -1.6]]) { const ch = new THREE.Group(); const cm = std(0x9c6a3c); const sseat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), cm); sseat.position.y = 0.8; ch.add(sseat); const sb = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.07), cm); sb.position.set(0, 1.2, -0.27); ch.add(sb); for (const [lx, lz] of [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), cm); l.position.set(lx, 0.4, lz); ch.add(l); } ch.position.set(x, 0, z); ch.rotation.y = r; apt.add(ch); }
  // bookshelf on the left wall
  const shelfM = std(0x6e4a2b, { roughness: 0.7 });
  const shelf = new THREE.Group(); shelf.position.set(-4.35, 0, -1.0); apt.add(shelf); aptParts.shelf = shelf;
  for (const y of [0.05, 0.75, 1.45, 2.15, 2.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 1.9), shelfM); b.position.y = y; shelf.add(b); }
  for (const z of [-0.95, 0.95]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.8, 0.06), shelfM); sd.position.set(0, 1.4, z); shelf.add(sd); }
  const bcol = [0xe8443a, 0x2e7dd1, 0xffd23f, 0x1e9e57, 0x8e5bd6, 0xf28c28, 0x34495e];
  const rb = rnd(21);
  for (const y of [0.78, 1.48, 2.18]) {
    let z = -0.85;
    while (z < 0.8) { const th = 0.07 + rb() * 0.07, hh = 0.38 + rb() * 0.2; const b = new THREE.Mesh(new THREE.BoxGeometry(0.32, hh, th), std(bcol[Math.floor(rb() * bcol.length)], { roughness: 0.7 })); b.position.set(-4.35, y + hh / 2, -1.0 + z + th / 2); b.userData = { home: b.position.clone(), h: hh, land: V(-3.9 + rb() * 1.6, 0.05, -1.0 + z * 1.2 + (rb() - 0.5) * 0.8), spin: (rb() - 0.5) * 6, delay: rb() * 0.9 }; apt.add(b); books.push(b); z += th + 0.015; }
  }
  const vase = new THREE.Group(); const vv = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.4, 14), std(0x1fa3a3, { roughness: 0.3 })); vv.position.y = 0.2; vase.add(vv); const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), std(0xff6b9a, { flatShading: true })); fl.position.y = 0.5; vase.add(fl);
  vase.position.set(-4.3, 2.84, -0.6); vase.userData.home = vase.position.clone(); apt.add(vase); aptParts.vase = vase;
  // window (back wall, right) with a city/beach view, plus a crack that appears
  const view = canvasTex(512, 320, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6cc0f5'); gr.addColorStop(1, '#d9f3ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#29a3c7'; g.fillRect(0, h * 0.62, w, h); [[20, 120, '#f6c8a0'], [110, 90, '#a8d8ea'], [190, 140, '#ffe6a7'], [300, 110, '#f7a7a7'], [400, 150, '#d6f0c8']].forEach(([x, bh, c]) => { g.fillStyle = c; g.fillRect(x, h * 0.62 - bh, 70, bh); g.fillStyle = '#5f8fb3'; for (let r = 0; r < bh / 26 - 1; r++) for (let k = 0; k < 3; k++) g.fillRect(x + 8 + k * 20, h * 0.62 - bh + 10 + r * 26, 12, 14); }); g.strokeStyle = '#f4f4f4'; g.lineWidth = 12; g.strokeRect(6, 6, w - 12, h - 12); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.stroke(); });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), std(0xffffff, { map: view, emissive: 0x6b8899, emissiveIntensity: 0.5 })); win.position.set(2.3, 2.1, -3.47); apt.add(win);
  const wcrack = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), new THREE.MeshBasicMaterial({ map: canvasTex(512, 320, (g, w, h) => { g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 3; const r = rnd(9); for (let k = 0; k < 9; k++) { let x = 330, y = 120; g.beginPath(); g.moveTo(x, y); const a0 = k / 9 * Math.PI * 2; for (let i = 0; i < 7; i++) { x += Math.cos(a0 + (r() - 0.5) * 0.8) * 24; y += Math.sin(a0 + (r() - 0.5) * 0.8) * 24; g.lineTo(x, y); } g.stroke(); } }), transparent: true, depthWrite: false })); wcrack.position.set(2.3, 2.1, -3.45); apt.add(wcrack); aptParts.wcrack = wcrack;
  // pictures above the sofa
  aptParts.pics = [];
  [[-1.8, 0xf2c14e], [-0.2, 0x8fd16b]].forEach(([x, c]) => { const p = new THREE.Group(); p.position.set(x, 2.55, -3.45); const fr = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.05), std(0x3a2a1a)); p.add(fr); const art = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.55), std(c)); art.position.z = 0.03; p.add(art); const sunA = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), std(0xffffff)); sunA.position.set(0.15, 0.1, 0.035); p.add(sunA); apt.add(p); aptParts.pics.push(p); });
  // chandelier
  const ch = new THREE.Group(); ch.position.set(-1.0, 3.8, -1.0); apt.add(ch); aptParts.chand = ch;
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.8, 6), std(0x222222)); cord.position.y = -0.4; ch.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.4, 20, 1, true), std(0xfff0c8, { side: THREE.DoubleSide, emissive: 0xffd27a, emissiveIntensity: 0.35 })); shade.position.y = -0.95; ch.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 })); bulb.position.y = -1.05; ch.add(bulb); aptParts.bulb = bulb;
  const lamp = new THREE.PointLight(0xffe2a8, 2.2, 10, 1.6); lamp.position.y = -1.1; ch.add(lamp); aptParts.lamp = lamp;
  // kitchen corner on the right: counter, stove and a gas cylinder (botijão)
  const counter = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 2.0), std(0xe9e4da)); counter.position.set(4.1, 0.5, 1.9); apt.add(counter);
  const ctop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 2.05), std(0x5a5a5a)); ctop.position.set(4.1, 1.03, 1.9); apt.add(ctop);
  const stove = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.95, 0.9), std(0xf7f7f7, { roughness: 0.4 })); stove.position.set(4.1, 0.48, 0.55); apt.add(stove);
  for (const [dx, dz] of [[-0.18, -0.2], [-0.18, 0.2], [0.18, -0.2], [0.18, 0.2]]) { const bnr = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), std(0x222222)); bnr.position.set(4.1 + dx, 0.97, 0.55 + dz); apt.add(bnr); }
  const gas = new THREE.Group(); gas.position.set(4.15, 0, -0.35); apt.add(gas); aptParts.gas = gas;
  const gbody = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 18), std(0x5b8fd6, { roughness: 0.5, metalness: 0.2 })); gbody.position.y = 0.35; gas.add(gbody);
  const gtop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), gbody.material); gtop.position.y = 0.65; gas.add(gtop);
  const gring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 18), std(0x5b8fd6)); gring.rotation.x = Math.PI / 2; gring.position.y = 0.95; gas.add(gring);
  const gvalve = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8), std(0xd9b44a, { metalness: 0.6 })); gvalve.position.y = 0.95; gas.add(gvalve);
  // door to the hallway (front of the right wall)
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 1.1), std(0x8a5a32)); door.position.set(4.56, 1.2, 2.9); apt.add(door);
  // plaster chunks waiting in the ceiling for the ending gag
  const pr = rnd(77);
  for (let i = 0; i < 14; i++) { const c = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + pr() * 0.2, 0), std(0xeee8de, { flatShading: true })); const x = -2.3 + pr() * 2.6, z = -3.0 + pr() * 1.3; c.userData = { x, z, delay: pr() * 0.6, spin: pr() * 6, land: 0.6 + pr() * 0.5 }; c.position.set(x, 3.7, z); c.visible = false; apt.add(c); plaster.push(c); }
  apt.traverse(m => { if (m.isMesh && m.material !== crack.material && m.material !== wcrack.material) { m.castShadow = true; m.receiveShadow = true; } });
}

// ---------- timeline helpers ----------
const SH0 = T0('shake') + 0.9;                        // the ground starts shaking
const BOOKS_T = capAt('livros', T0('shake'));
const BONK_T = T0('bonk') + 0.95;
const FW_T = T0('gas3') + 1.05;                        // fwoomp
const CRASH_T = T0('crash') + 0.4;
function seg(t) { for (let i = TL.segs.length - 1; i >= 0; i--) if (t >= TL.segs[i].start) return TL.segs[i]; return TL.segs[0]; }
function quake(t, n, lt) {   // shaking strength 0..1
  if (n === 'shake') return ss(SH0 - T0('shake'), SH0 - T0('shake') + 0.6, lt);
  if (n === 'friend1') return 1;
  if (n === 'pause' || n === 'explain' || n === 'scale') return 0;
  if (n === 'run1' || n === 'run2' || n === 'bonk' || n === 'idea') return 0.8;
  if (n === 'rule') return lerp(0.8, 0.55, clamp(lt / S.rule.dur));
  if (n === 'outside') return 0.6;
  if (n === 'stop') return 0.5 * (1 - ss(0, 1.4, lt));
  if (n === 'after') return lt < 1.1 ? ss(0.1, 0.25, lt) : 1 - ss(1.1, 1.6, lt);
  if (n === 'q2') return 0.2; if (n === 'q3') return 0.35; if (n === 'q4') return 0.5;
  if (n === 'crack' || n === 'ohoh') return 0.85; if (n === 'crash') return lt < 0.6 ? 1 : 1 - ss(0.6, 1.4, lt);
  return 0;
}
const GAGN = ['q2', 'q3', 'q4', 'crack', 'ohoh', 'crash'];
const OUT_DOOR = { x: DOOR.x, z: DOOR.z }, OUT_DIR = V(-Math.sin(0.15), 0, -Math.cos(0.15));
const OPEN = { x: 6.5, z: 3.0 };     // open sand, away from buildings
function updateApartment(t, n, lt, q) {
  const gag = GAGN.includes(n);
  const ph = t * 38;
  // shaking furniture & props
  cups.forEach((c, i) => { const h = c.userData.home; c.position.set(h.x + Math.sin(ph + i) * 0.02 * q, h.y + Math.abs(Math.sin(ph * 1.3 + i)) * 0.03 * q, h.z + Math.cos(ph * 0.9 + i) * 0.02 * q); });
  aptParts.chand.rotation.set(Math.sin(t * 5.5) * 0.35 * q, 0, Math.cos(t * 4.7) * 0.3 * q);
  aptParts.pics.forEach((p, i) => p.rotation.z = (i ? -1 : 1) * (0.06 * Math.sin(t * 9 + i) * q + (gag ? 0 : 0.18 * ss(SH0 + 1, SH0 + 2, t))));
  aptParts.tv.rotation.z = Math.sin(ph * 0.7) * 0.02 * q;
  aptParts.shelf.rotation.z = Math.sin(ph * 0.8) * 0.015 * q;
  // books tumble off the shelf (only in the main story)
  books.forEach(b => {
    const u = b.userData, t0 = BOOKS_T + u.delay;
    if (gag || t < t0) { b.position.set(u.home.x + Math.sin(ph + u.delay * 9) * 0.01 * q, u.home.y, u.home.z); b.rotation.set(0, 0, Math.sin(ph + u.delay * 5) * 0.05 * q); return; }
    const k = clamp((t - t0) / 0.55); const p = u.home.clone().lerp(u.land, k); p.y = lerp(u.home.y, u.land.y + 0.04, k * k);
    b.position.copy(p); b.rotation.set(u.spin * k, 0, Math.PI / 2 * k);
  });
  const v = aptParts.vase, vt = BOOKS_T + 0.7;
  if (gag || t < vt) v.position.copy(v.userData.home); else { const k = clamp((t - vt) / 0.45); v.position.set(lerp(v.userData.home.x, -3.5, k), lerp(v.userData.home.y, 0.0, k * k), v.userData.home.z); v.rotation.z = -1.4 * k; }
  aptParts.wcrack.visible = !gag && t > SH0 + 1.6;
  // power goes out a few seconds into the quake
  const dark = gag ? 0 : ss(SH0 + 3.0, SH0 + 3.3, t) * (Math.floor(t * 9) % 4 === 0 && t < SH0 + 3.6 ? 0.3 : 1);
  aptParts.lamp.intensity = 2.2 * (1 - dark); aptParts.bulb.material.color.setScalar(1 - dark * 0.75); aptParts.tvLight.intensity = 1.2 * (1 - dark);
  aptParts.screen.material.color.setScalar(1 - dark * 0.92);
  // ending gag: ceiling cracks, then the plaster comes down
  aptParts.ceilCrack.visible = gag && t > T0('crack');
  aptParts.ceilCrack.material.opacity = ss(T0('crack'), T0('crack') + 1.0, t);
  plaster.forEach(c => { const u = c.userData, t0 = CRASH_T + u.delay * 0.4; c.visible = gag && t > t0 - 0.05; if (!c.visible) return; const k = clamp((t - t0) / 0.5); c.position.set(AO.x + u.x, AO.y + lerp(3.7, u.land, k * k), AO.z + u.z); c.rotation.set(u.spin * k, u.spin * 0.5 * k, 0); });
  return dark;
}

// ---------- director ----------
let shake = 0, flash = 0;
function setParent(bean, parent) { if (bean.root.parent !== parent) parent.add(bean.root); }
const SOFA_H = { x: AO.x - 1.65, z: AO.z - 2.65 }, SOFA_F = { x: AO.x - 0.35, z: AO.z - 2.65 }, SOFA_Y = AO.y + 0.55;
const UNDER_H = { x: AO.x + 2.05, z: AO.z - 0.35 }, UNDER_F = { x: AO.x + 3.0, z: AO.z - 0.45 }, UNDER_D = { x: AO.x + 2.5, z: AO.z + 0.15 };
const TABLE_C = AP(2.5, 0, -0.5);
function direct(t, n, lt, g, q) {
  const p = clamp(lt / g.dur);
  const hm = clamp(mouthOf(TL.heroMouth, REAL_T) * 1.4), fm = clamp(mouthOf(TL.friendMouth, REAL_T) * 1.4);
  let cam = { pos: V(0, 5, -10), tgt: V(0, 1, 5), fov: 45 };
  shake = 0; flash = 0;
  const gaming = { legs: 'sit', sitY: 0.6, lean: -0.15, ctrl: true, armL: [0.25, -0.5, -1.2], armR: [0.25, -0.5, -1.2] };
  let hp = Object.assign({ x: SOFA_H.x, y: SOFA_Y, z: SOFA_H.z, ry: 0.15, smile: 1, nut: false, look: [0, -0.2] }, gaming);
  let fp = Object.assign({ x: SOFA_F.x, y: SOFA_Y, z: SOFA_F.z, ry: -0.15, smile: 1, look: [0, -0.2] }, gaming);
  let dg = { mode: 'lie', x: AO.x - 0.4, y: AO.y + 0.02, z: AO.z - 0.1, ry: 0.6 };
  const crouch = (ex) => Object.assign({ legs: 'crouch', lean: 0.45, armL: [2.4, 0.25, -2.2], armR: [1.2, 0.15, -0.6], eyesWide: true, brow: 0.8, smile: 0 }, ex);
  board.visible = false;
  setParent(hero, scene); setParent(friend, scene); hero.root.scale.setScalar(1); friend.root.scale.setScalar(1);
  const hy = (x, z, dy = 1) => terrainH(x, z) + dy;

  if (n === 'title') {
    // establishing: the beach town, slowly pushing toward the apartment building
    const u = ease(p); cam.pos = vl(V(-8, 14, -20), V(4, 7, 4), u); cam.tgt = vl(V(10, 6, 20), V(bp.x, 7, bp.z), u); cam.fov = 50;
    hp.visible = false; fp.visible = false; dg.mode = 'hide';
  } else if (n === 'home') {
    const c1 = capAt('jogando', g.start) - g.start, c2 = capAt('cachorro', g.start) - g.start;
    if (lt < c1) { const k = ease(clamp(lt / c1)); cam.pos = vl(V(bp.x - 3, 6, bp.z - 14), V(bp.x - 1, 6.5, bp.z - 9), k); cam.tgt = V(bp.x, 7, bp.z); cam.fov = 48; hp.visible = fp.visible = false; dg.mode = 'hide'; }
    else if (lt < c2) { cam.pos = AP(1.6, 2.1, 4.4); cam.tgt = AP(-1.1, 1.0, -2.3); cam.fov = 50; hp.mouth = hm; hp.armR = [0.25, -0.5, -1.2 + 0.1 * Math.sin(t * 13)]; fp.armL = [0.25, -0.5, -1.2 + 0.1 * Math.sin(t * 11 + 1)]; }
    else { const k = clamp((lt - c2) / (g.dur - c2)); cam.pos = vl(AP(0.6, 0.9, 1.4), AP(0.3, 0.8, 1.2), k); cam.tgt = AP(-0.4, 0.3, -0.2); cam.fov = 40; }
  } else if (n === 'calm') {
    if (lt < 1.4) { cam.pos = vl(AP(-0.9, 1.5, 1.6), AP(-0.9, 1.45, 1.1), p); cam.tgt = AP(-1.0, 1.25, -2.6); cam.fov = 44; }
    else { cam.pos = AP(-1.4, 1.45, -0.3); cam.tgt = AP(-1.6, 1.3, -2.6); cam.fov = 36; hp.look = [Math.sin(lt * 2.5) * 0.9, 0.2]; hp.brow = -0.4; hp.smile = 0; }
  } else if (n === 'shake') {
    const sl = SH0 - g.start, cl = BOOKS_T - g.start;
    if (lt > sl) { hp = Object.assign(hp, { eyesWide: true, brow: 0.8, smile: 0, wob: 0.4 * q, look: [0, 0.4] }); fp = Object.assign(fp, { eyesWide: true, brow: 0.8, smile: 0, wob: 0.4 * q, look: [0, 0.4] }); dg.mode = 'scared'; dg.y += 0.0; }
    if (lt < sl + 0.3) { cam.pos = AP(1.6, 2.1, 4.4); cam.tgt = AP(-1.1, 1.0, -2.3); cam.fov = 50; }
    else if (lt < cl - 0.4) { cam.pos = AP(-1.6, 0.85, 0.2); cam.tgt = AP(-1.1, 0.6, -1.1); cam.fov = 40; }
    else if (lt < cl + 1.6) { cam.pos = AP(-1.6, 1.8, 1.4); cam.tgt = AP(-4.2, 1.4, -0.9); cam.fov = 50; }
    else { cam.pos = AP(-0.4, 1.0, 0.3); cam.tgt = AP(-1.0, 3.0, -1.0); cam.fov = 55; }
    shake = q * 0.5;
  } else if (n === 'friend1') {
    hp = Object.assign(hp, { eyesWide: true, brow: 0.9, smile: 0, wob: 0.3, ctrl: false, armL: A.up, armR: A.up, shout: 0.3 });
    fp = Object.assign(fp, { eyesWide: true, brow: 1, smile: 0, wob: 0.3, ctrl: false, armL: A.up, armR: A.up, mouth: fm });
    dg.mode = 'scared';
    cam.pos = AP(-0.6, 1.5, 0.4); cam.tgt = AP(-0.9, 1.15, -2.65); cam.fov = 44; shake = 0.4;
  } else if (n === 'pause') {
    // freeze frame: everything stops while the narrator explains
    hp = Object.assign(hp, { eyesWide: true, brow: 0.9, smile: 0, ctrl: false, armL: A.up, armR: A.up, shout: 0.3 });
    fp = Object.assign(fp, { eyesWide: true, brow: 1, smile: 0, ctrl: false, armL: A.up, armR: A.up, shout: 0.5 });
    dg.mode = 'scared';
    const k = ease(p); cam.pos = vl(AP(-0.6, 1.5, 0.4), AP(-0.7, 1.4, -0.4), k); cam.tgt = AP(-0.9, 1.15, -2.65); cam.fov = 44;
  } else if (n === 'explain' || n === 'scale') {
    hp.visible = fp.visible = false; dg.mode = 'hide'; cam.pos = AP(0, 2, 3); cam.tgt = AP(0, 1, -2);
  } else if (n === 'run1') {
    hp = Object.assign(hp, { eyesWide: true, brow: 0.9, smile: 0, ctrl: false, armL: A.rest, armR: A.rest, look: [0.6, 0] });
    fp = { x: SOFA_F.x + 0.6, z: SOFA_F.z + 0.9, y: AO.y, ry: -0.6, armR: A.point, armL: A.rest, mouth: fm, smile: 1, brow: -0.3, eyesWide: true };
    dg.mode = 'scared';
    cam.pos = AP(-0.4, 1.4, 1.4); cam.tgt = AP(-0.7, 1.1, -2.0); cam.fov = 46; shake = 0.3;
  } else if (n === 'run2' || n === 'bonk') {
    // the bad idea: run outside while things fall from the building
    const tOut = n === 'run2' ? lt - 2.6 : lt + S.run2.dur - 2.6;
    if (n === 'run2' && lt < 2.6) {
      const k = clamp(lt / 2.4); fp = { x: lerp(SOFA_F.x + 0.6, AO.x + 4.2, k), z: lerp(SOFA_F.z + 0.9, AO.z + 2.9, k), y: AO.y, ry: Math.PI / 2 - 0.3, run: 1, phase: lt * 14, armL: A.up, armR: A.up, shout: 0.6, eyesWide: true, brow: 1, smile: 0 };
      hp = Object.assign(hp, { eyesWide: true, brow: 0.9, smile: 0, ctrl: false, armL: A.stop, armR: A.rest, look: [0.8, 0] });
      dg.mode = 'scared'; cam.pos = AP(0.8, 1.7, 3.4); cam.tgt = AP(1.5, 1.0, 0.5); cam.fov = 55; shake = 0.35;
    } else {
      const k = clamp(tOut / 2.0), fx = OUT_DOOR.x + OUT_DIR.x * 1.8 * ease(k), fz = OUT_DOOR.z + OUT_DIR.z * 1.8 * ease(k);
      const hitK = t > BONK_T;
      fp = { x: fx, z: fz, ry: Math.atan2(OUT_DIR.x, OUT_DIR.z), run: k < 1 && !hitK ? 1 : 0, phase: t * 14, armL: A.up, armR: A.up, shout: 0.5, eyesWide: true, brow: 1, smile: 0 };
      if (hitK) Object.assign(fp, { run: 0, armL: A.rest, armR: A.rest, wob: 0.25, squint: 0.7, shout: 0, look: [Math.sin(t * 6), 0], legs: t > BONK_T + 0.5 ? 'sit' : undefined, sitY: 0.6, lean: -0.2 });
      hp.visible = false; dg.mode = 'hide';
      cam.pos = V(OUT_DOOR.x + OUT_DIR.x * 6.5 - 1.2, hy(OUT_DOOR.x, OUT_DOOR.z, 4.2), OUT_DOOR.z + OUT_DIR.z * 6.5); cam.tgt = V(OUT_DOOR.x + OUT_DIR.x * 1.6, hy(OUT_DOOR.x, OUT_DOOR.z, 2.0), OUT_DOOR.z + OUT_DIR.z * 1.6); cam.fov = 50;
      shake = 0.3 + (Math.abs(t - BONK_T) < 0.15 ? 0.6 : 0);
    }
  } else if (n === 'idea') {
    hp = { x: SOFA_H.x + 0.9, z: SOFA_H.z + 1.3, y: AO.y, ry: 0.9, armL: A.pointUp, armR: A.point, mouth: hm, smile: 1, brow: -0.3, nut: false };
    fp = { x: SOFA_F.x + 0.9, z: SOFA_F.z + 1.0, y: AO.y, ry: -0.4, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.5, look: [-0.5, 0] };
    dg.mode = 'scared'; dg.x = AO.x - 0.1; dg.z = AO.z - 0.9;
    cam.pos = AP(-0.3, 1.5, 2.6); cam.tgt = AP(-0.3, 1.2, -1.4); cam.fov = 44; shake = 0.25;
  } else if (n === 'rule') {
    // DROP, COVER, HOLD ON under the sturdy table
    const go = ss(0, 1.2, lt);
    const wA = wordAt('abaixe', g.start) - g.start, wP = wordAt('proteja', g.start) - g.start, wS = wordAt('segure', g.start) - g.start, wJ = wordAt('janelas', g.start) - g.start;
    const prot = lt > wP - 0.2, hold = lt > wS - 0.2;
    hp = crouch({ x: lerp(SOFA_H.x + 0.9, UNDER_H.x, go), z: lerp(SOFA_H.z + 1.3, UNDER_H.z, go), y: AO.y, ry: 0.35, armL: prot ? [2.5, 0.35, -2.3] : A.rest, armR: hold ? [1.0, 0.55, -0.35] : (prot ? [2.5, 0.35, -2.3] : A.rest) });
    fp = crouch({ x: lerp(SOFA_F.x + 0.9, UNDER_F.x, go), z: lerp(SOFA_F.z + 1.0, UNDER_F.z, go), y: AO.y, ry: -0.35, armL: hold ? [1.0, 0.55, -0.35] : (prot ? [2.5, 0.35, -2.3] : A.rest), armR: prot ? [2.5, 0.35, -2.3] : A.rest });
    if (go < 1) { hp.legs = undefined; fp.legs = undefined; hp.run = fp.run = 1; hp.phase = fp.phase = lt * 14; hp.lean = fp.lean = 0; }
    dg = { mode: 'scared', x: lerp(AO.x - 0.1, UNDER_D.x, go), y: AO.y, z: lerp(AO.z - 0.9, UNDER_D.z, go), ry: 0.2 };
    if (lt < wJ - 0.2) { cam.pos = AP(2.4, 0.75, 3.6); cam.tgt = AP(2.5, 0.75, -0.4); cam.fov = 48; }
    else { const k = ease(clamp((lt - wJ + 0.2) / 2.5)); cam.pos = vl(AP(2.4, 0.75, 3.6), AP(0.5, 1.8, 1.2), k); cam.tgt = vl(AP(2.5, 0.75, -0.4), AP(-1.5, 1.8, -3.0), k); cam.fov = 52; }
    shake = q * 0.35;
  } else if (n === 'outside') {
    const wC = wordAt('dirigindo', g.start) - g.start;
    if (lt < wC - 0.3) {
      // open area: the beach, away from buildings, poles and wires
      hp = { x: OPEN.x - 0.8, z: OPEN.z, legs: 'crouch', lean: 0.45, ry: Math.PI + 0.3, armL: [2.5, 0.35, -2.3], armR: [2.5, 0.35, -2.3], eyesWide: true, brow: 0.7, smile: 0, nut: false };
      fp = { x: OPEN.x + 0.6, z: OPEN.z + 0.2, legs: 'crouch', lean: 0.45, ry: Math.PI - 0.3, armL: [2.5, 0.35, -2.3], armR: [2.5, 0.35, -2.3], eyesWide: true, brow: 0.7, smile: 0 };
      dg = { mode: 'scared', x: OPEN.x - 0.1, y: terrainH(OPEN.x, OPEN.z + 0.6), z: OPEN.z + 0.6, ry: Math.PI };
      const k = ease(clamp(lt / (wC - 0.3))); cam.pos = vl(V(OPEN.x + 1.5, 1.5, OPEN.z - 5.5), V(OPEN.x + 3.5, 3.5, OPEN.z - 9), k); cam.tgt = V(OPEN.x + 3, 2.5, OPEN.z + 10); cam.fov = 56;
    } else {
      // in the car: brake and stay inside
      const k = ss(wC - 0.3, wC + 2.2, lt);
      myCar.position.set(lerp(30, 20, 1 - Math.pow(1 - k, 2)), myCar.userData.home.y, ROAD.z); myCar.rotation.set(0, 0.04, 0);
      setParent(hero, myCar); setParent(friend, myCar); hero.root.scale.setScalar(1 / CAR_S); friend.root.scale.setScalar(1 / CAR_S);
      hp = { x: -0.15, y: 0.46, z: 0.24, ry: -Math.PI / 2, legs: 'sit', sitY: 0.6, armL: A.drive, armR: A.drive, nut: false, eyesWide: true, brow: 0.8, smile: 0, hat: false };
      fp = { x: -0.15, y: 0.46, z: -0.24, ry: -Math.PI / 2, legs: 'sit', sitY: 0.6, armL: A.up, armR: A.up, eyesWide: true, brow: 0.9, smile: 0 };
      dg.mode = 'hide';
      const cp = myCar.position; cam.pos = V(cp.x - 7, cp.y + 2.4, cp.z - 4.5); cam.tgt = V(cp.x, cp.y + 1.3, cp.z); cam.fov = 44;
    }
    shake = q * 0.4;
  } else if (n === 'stop' || n === 'friend2' || n === 'after' || n === 'after2') {
    hp = crouch({ x: UNDER_H.x, z: UNDER_H.z, y: AO.y, ry: 0.35, armL: [2.5, 0.35, -2.3], armR: [1.0, 0.55, -0.35] });
    fp = crouch({ x: UNDER_F.x, z: UNDER_F.z, y: AO.y, ry: -0.35, armL: [1.0, 0.55, -0.35], armR: [2.5, 0.35, -2.3] });
    dg = { mode: 'scared', x: UNDER_D.x, y: AO.y, z: UNDER_D.z, ry: 0.2 };
    if (n === 'stop') { hp.brow = fp.brow = 0.4; hp.look = [0.5, 0.3]; fp.look = [-0.5, 0.3]; }
    if (n === 'friend2') { fp = { x: UNDER_F.x + 1.0 * ss(0, 0.8, lt), z: UNDER_F.z + 0.9 * ss(0, 0.8, lt), y: AO.y, ry: -0.3, legs: lt < 0.3 ? 'crouch' : undefined, lean: lt < 0.3 ? 0.45 : 0, armL: A.rest, armR: A.rest, mouth: fm, smile: 1, brow: -0.2 }; hp.look = [0.6, 0]; }
    if (n === 'after') {
      const up = lt < 0.35; const bump = lt > 0.35 && lt < 1.1;
      fp = { x: UNDER_F.x + (up ? 1.0 : 0.3), z: UNDER_F.z + (up ? 0.9 : 0), y: AO.y, ry: -0.6, legs: up ? undefined : 'crouch', lean: up ? 0.2 : 0.45, armL: bump ? A.facepalm : A.rest, armR: bump ? [2.6, 0.3, -2.4] : A.rest, squint: bump ? 0.8 : 0, eyesWide: !bump, brow: 0.8, smile: 0, wob: bump ? 0.3 : 0 };
      dg.mode = 'scared';
    }
    if (n === 'after2') { hp = Object.assign(hp, { armR: A.pointUp, brow: -0.3, smile: 1, eyesWide: false }); fp.squint = 0.4; fp.armR = [2.6, 0.3, -2.4]; }
    cam.pos = n === 'after2' ? AP(2.6, 0.95, 2.6) : AP(2.4, 0.75, 3.2); cam.tgt = AP(2.5, 0.85, -0.4); cam.fov = 48;
    shake = q * 0.5;
  } else if (n === 'gas1' || n === 'gas2' || n === 'gas3' || n === 'gas4') {
    // power is out, the gas cylinder is leaking
    hp = { x: AO.x + 2.1, z: AO.z + 1.0, y: AO.y, ry: 1.2, armL: A.rest, armR: A.rest, brow: 0.3, smile: 0, nut: false, squint: n === 'gas1' ? 0.3 : 0 };
    fp = { x: AO.x + 3.3, z: AO.z + 1.4, y: AO.y, ry: -1.6, armL: A.rest, armR: A.rest, brow: 0, smile: 1 };
    dg = { mode: 'sit', x: AO.x + 1.4, y: AO.y, z: AO.z + 1.5, ry: 0.8 };
    if (n === 'gas1') { cam.pos = AP(1.6, 1.6, 3.4); cam.tgt = AP(3.4, 1.0, 0.4); cam.fov = 50; }
    else if (n === 'gas2') { fp = Object.assign(fp, { candle: true, armL: [1.3, 0.1, -0.9], armR: [1.2, -0.2, -1.2], mouth: fm }); hp = Object.assign(hp, { eyesWide: true, brow: 1, armL: A.stop, armR: A.stop, shout: 0.5 }); cam.pos = AP(2.6, 1.5, 3.7); cam.tgt = AP(2.8, 1.15, 1.1); cam.fov = 44; }
    else if (n === 'gas3') {
      const lit = t > FW_T - 0.45, boom = t > FW_T, after = t > FW_T + 0.9;
      fp = Object.assign(fp, { candle: !boom, flame: lit && !boom, armL: [1.3, 0.1, -0.9], armR: [1.2, -0.2, -1.2], soot: boom ? 1 : 0, eyesWide: boom && !after, shout: boom && !after ? 0.6 : 0, wob: boom && !after ? 0.6 : 0, smile: boom ? 0 : 1, squint: after ? 0.5 : 0 });
      if (boom) { fp.armL = A.up; fp.armR = A.up; } if (after) { fp.armL = A.rest; fp.armR = A.rest; }
      if (lt < FW_T - g.start + 1.6) { hp = Object.assign(hp, { eyesWide: true, brow: 1, armL: A.stop, armR: A.stop, shout: 0.5 }); cam.pos = AP(2.6, 1.5, 3.7); cam.tgt = AP(2.8, 1.15, 1.1); cam.fov = 44; shake = boom && !after ? 0.7 : 0; flash = boom ? Math.max(0, 0.75 - (t - FW_T) * 1.5) : 0; }
      else { hp = Object.assign(hp, { armL: A.hips, armR: A.facepalm, lean: 0.12, squint: 0.9, brow: -0.6, smile: 0, tilt: -0.12, ry: 0.0 }); cam.pos = AP(1.5, 1.45, 3.0); cam.tgt = AP(2.05, 1.25, 1.0); cam.fov = 38; }
    } else { fp = Object.assign(fp, { soot: 1, armR: A.thumb, armL: A.rest, mouth: fm, smile: 1, squint: 0.5, wob: 0.12, brow: 0.3, ry: -0.3 }); cam.pos = AP(3.3, 1.45, 3.4); cam.tgt = AP(3.3, 1.1, 1.4); cam.fov = 40; }
  } else if (n === 'exit') {
    const wA = wordAt('área', g.start) - g.start;
    if (lt < wA - 0.2) {
      const d = STAIR_TOTAL * (1 - ss(0.2, wA - 0.4, lt));
      const h0 = onStairs(d), f0 = onStairs(Math.min(STAIR_TOTAL, d + 1.1));
      hp = { x: h0.x, y: h0.y, z: h0.z, ry: h0.ry + Math.PI, run: 0.8, phase: lt * 12, nut: false, brow: 0.3, smile: 0 };
      fp = { x: f0.x, y: f0.y, z: f0.z, ry: f0.ry + Math.PI, run: 0.8, phase: lt * 12 + 1.3, soot: 1, armL: [0.95, -0.15, -1.5], armR: [0.95, -0.15, -1.5], brow: 0.3, smile: 0 };
      dg = { mode: 'carried' };
      cam.pos = V(h0.x - 0.5, h0.y + 2.0, IO.z + 8.5); cam.tgt = V(h0.x, h0.y + 1.0, IO.z + 1.0); cam.fov = 50;
    } else {
      const k = ss(wA - 0.2, g.dur, lt);
      hp = { x: lerp(OUT_DOOR.x - 2, OPEN.x - 0.8, k), z: lerp(OUT_DOOR.z - 3, OPEN.z, k), ry: Math.PI + 0.5, run: k < 1 ? 0.7 : 0, phase: lt * 11, nut: false, smile: 0, brow: 0.2 };
      fp = { x: lerp(OUT_DOOR.x - 1, OPEN.x + 0.6, k), z: lerp(OUT_DOOR.z - 3.4, OPEN.z + 0.2, k), ry: Math.PI + 0.5, run: k < 1 ? 0.7 : 0, phase: lt * 11 + 1, soot: 1, smile: 0 };
      dg = { mode: 'stand', x: lerp(OUT_DOOR.x - 1.5, OPEN.x - 0.1, k), y: 0, z: lerp(OUT_DOOR.z - 2.5, OPEN.z + 0.9, k), ry: Math.PI + 0.5 }; dg.y = terrainH(dg.x, dg.z);
      cam.pos = V(OPEN.x + 6, 4, OPEN.z - 6); cam.tgt = V(OPEN.x + 2, 1.5, OPEN.z + 8); cam.fov = 52;
    }
  } else if (n === 'coast' || n === 'coast2') {
    hp = { x: OPEN.x - 0.8, z: OPEN.z, ry: Math.PI + 0.2, nut: false, smile: 0, brow: 0.5, look: [0, 0.3] };
    fp = { x: OPEN.x + 0.6, z: OPEN.z + 0.2, ry: Math.PI - 0.2, soot: 1, smile: 0, brow: 0.5, look: [0, 0.3] };
    dg = { mode: 'scared', x: OPEN.x - 0.1, y: terrainH(OPEN.x - 0.1, OPEN.z + 0.9), z: OPEN.z + 0.9, ry: Math.PI };
    if (n === 'coast') {
      const look = ss(g.dur - 2.4, g.dur - 1.2, lt);
      hp.ry = lerp(Math.PI + 0.2, 1.2, look); fp.ry = lerp(Math.PI - 0.2, -1.2, look); hp.eyesWide = fp.eyesWide = look > 0.5;
      if (lt < g.dur - 2.4) { cam.pos = V(OPEN.x - 0.1, 1.6, OPEN.z + 4.5); cam.tgt = V(OPEN.x - 0.5, 2.5, -40); cam.fov = 48; }
      else { cam.pos = V(OPEN.x - 0.1, 1.4, OPEN.z - 3.0); cam.tgt = V(OPEN.x - 0.1, 1.1, OPEN.z + 0.1); cam.fov = 42; }
    } else {
      const k = clamp(lt / g.dur); const u = 0.15 + 0.2 * k; const pp = onPath(heroPath, u), f2 = onPath(heroPath, Math.max(0, u - 0.03));
      hp = { x: pp.x, z: pp.z, ry: pp.ry, run: 1, phase: lt * 14, mouth: hm, shout: 0.4, eyesWide: true, brow: 0.8, smile: 0, nut: false };
      fp = { x: f2.x + 0.8, z: f2.z, ry: f2.ry, run: 1, phase: lt * 14 + 1.4, soot: 1, armL: [0.95, -0.15, -1.5], armR: [0.95, -0.15, -1.5], eyesWide: true, brow: 0.8, shout: 0.4, smile: 0 };
      dg = { mode: 'carried' };
      cam.pos = V(pp.x + 5, 2.4, pp.z - 4); cam.tgt = V(pp.x, 1.2, pp.z); cam.fov = 50;
    }
  } else if (n === 'q1') {
    const ty = terrainH(TOP.x, TOP.z);
    hp = { x: TOP.x, z: TOP.z, ry: HRY, armR: A.thumb, armL: A.hips, shades: true, smile: 1, nut: false, brow: -0.2 };
    fp = { x: HS.x, z: HS.z, ry: HRY, armR: A.thumb, armL: A.hips, shades: true, smile: 1, brow: -0.2, soot: 1 };
    dg = { mode: 'sit', x: DOG_HILL.x + 0.3, y: terrainH(DOG_HILL.x + 0.3, DOG_HILL.z + 0.4), z: DOG_HILL.z + 0.4, ry: HRY };
    cam.pos = vl(V(TOP.x + 2.3, ty + 1.2, TOP.z - 2.6), V(TOP.x + 1.9, ty + 1.1, TOP.z - 2.1), p); cam.tgt = V(TOP.x - 0.4, ty + 1.05, TOP.z - 0.3); cam.fov = 44;
  } else if (GAGN.includes(n)) {
    // the ending gag: keep playing video games no matter what
    dg = { mode: 'lie', x: AO.x - 0.4, y: AO.y + 0.02, z: AO.z - 0.1, ry: 0.6 };
    hp.wob = q * 0.25; fp.wob = q * 0.25;
    if (n === 'q2') { cam.pos = AP(1.6, 2.1, 4.4); cam.tgt = AP(-1.1, 1.0, -2.3); cam.fov = 50; }
    else if (n === 'q3') { fp.mouth = fm; fp.brow = -0.4; cam.pos = AP(-0.1, 1.45, -0.2); cam.tgt = AP(-0.4, 1.15, -2.65); cam.fov = 40; }
    else if (n === 'q4') { hp.mouth = hm; hp.brow = -0.3; hp.smirk = true; cam.pos = AP(-1.3, 1.45, -0.2); cam.tgt = AP(-1.6, 1.15, -2.65); cam.fov = 40; }
    else if (n === 'crack') { cam.pos = AP(-1.0, 1.2, -1.6); cam.tgt = AP(-1.0, 3.8, -2.3); cam.fov = 60; hp.look = [0, 1]; fp.look = [0, 1]; }
    else if (n === 'ohoh') { hp = Object.assign(hp, { ctrl: true, mouth: Math.max(hm, 0.2), eyesWide: true, brow: 0.6, smile: 0, look: [0, 0] }); fp = Object.assign(fp, { eyesWide: true, brow: 0.8, smile: 0, look: [0, 1] }); cam.pos = AP(-1.4, 1.45, -0.4); cam.tgt = AP(-1.5, 1.2, -2.65); cam.fov = 42; }
    else {
      const down = t > CRASH_T + 0.45;
      if (down) { hp = Object.assign(hp, { dust: 1, ctrl: true, squint: 0.6, smile: 0, brow: 0.4, wob: 0, look: [0, 0] }); fp = Object.assign(fp, { dust: 1, ctrl: true, squint: 0.6, smile: 0, brow: 0.4, wob: 0 }); }
      cam.pos = AP(-0.6, 1.7, 2.2); cam.tgt = AP(-1.0, 1.0, -2.4); cam.fov = 50;
      shake = t < CRASH_T + 0.9 ? 0.8 : 0; flash = 0;
    }
    if (n !== 'crash') shake = q * 0.4;
  } else if (n === 'end') {
    hp = { x: TOWEL.x, y: terrainH(TOWEL.x, TOWEL.z) + 0.32, z: TOWEL.z, ry: Math.PI - 0.35, legs: 'sit', lean: -0.8, sitY: 0.47, armL: A.wave, armR: A.hold, shades: true };
    fp = { x: TOWEL.x - 1.7, z: TOWEL.z - 0.3, ry: Math.PI - 0.35, legs: 'sit', lean: -0.1, sitY: 0.6, armL: A.rest, armR: A.thumb, shades: true, smile: 1 };
    dg = { mode: 'lie', x: TOWEL.x + 1.3, y: terrainH(TOWEL.x + 1.3, TOWEL.z - 0.6), z: TOWEL.z - 0.6, ry: Math.PI - 0.6 };
    cam.pos = vl(V(4.2, 1.5, 2.4), V(8, 6, -8), ease(p)); cam.tgt = V(2.0, 1.0, 6.3); cam.fov = 45;
  }
  hero.pose(t, hp); friend.pose(t, fp);
  if (dg.mode === 'carried') { if (dog.parent !== friend.body) friend.body.add(dog); dog.scale.setScalar(1); dogPose(t, 'carried', 0, -0.28, 0.42, 0); }
  else { if (dog.parent !== scene) scene.add(dog); dogPose(t, dg.mode, dg.x, dg.y, dg.z, dg.ry); }
  const sh = shake * 0.12;
  cam.pos.add(V(Math.sin(t * 47) * sh, Math.sin(t * 61) * sh, Math.sin(t * 53) * sh));
  camera.position.copy(cam.pos); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.lookAt(cam.tgt);
  const focus = cam.tgt.clone(); focus.y = 0;
  if (INSIDE(n) || n === 'run2' && lt < 2.6 || n === 'exit') { sun.target.position.copy(focus); sun.position.copy(focus).add(V(10, 30, 40)); }
  else { focus.z = clamp(focus.z, -40, 45); focus.x = clamp(focus.x, -45, 40); sun.target.position.copy(focus); sun.position.copy(focus).add(V(40, 70, -30)); }
}

// ---------- world (outdoors) ----------
const facadeBits = [];
for (let i = 0; i < 24; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3 + R() * 0.3, 0.06, 0.25), std(i % 3 ? 0xb5523b : 0xbfd8e6, { roughness: 0.6 })); m.userData = { dx: (R() - 0.5) * 6, delay: R() * 2.4, sp: R() * 6 }; m.visible = false; scene.add(m); facadeBits.push(m); }
const pot = new THREE.Group(); { const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.35, 14), std(0xb8643c)); pot.add(pm); const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 1), std(0x3f8f2f, { flatShading: true })); pl.position.y = 0.3; pot.add(pl); shadowAll(pot); scene.add(pot); }
function world(t, n, lt, q, dark) {
  const outQ = ['run2', 'bonk', 'outside'].includes(n) ? q : 0;
  palms.forEach(pl => { const top = pl.userData.top; pl.rotation.x = 0.04 * Math.sin(t * 1.3 + pl.userData.ph) + outQ * 0.08 * Math.sin(t * 25 + pl.userData.ph); pl.rotation.z = outQ * 0.06 * Math.sin(t * 21); top.children.forEach((h, i) => h.rotation.z = 0.05 * Math.sin(t * 2 + i + pl.userData.ph)); });
  building.rotation.z = outQ * 0.012 * Math.sin(t * 30);
  poles.forEach((pl, i) => pl.rotation.z = outQ * 0.08 * Math.sin(t * 17 + i));
  sign.rotation.z = outQ * 0.1 * Math.sin(t * 27);
  floaters.forEach(o => { if (o !== myCar || n !== 'outside') { o.position.copy(o.userData.home); o.rotation.set(0, o === umbrella ? 0 : o === lounger ? Math.PI - 0.35 : (cars.includes(o) ? 0.04 : o.rotation.y), o === umbrella ? 0.1 + outQ * 0.2 * Math.sin(t * 20) : 0); } });
  towel.visible = false; fishes.forEach(f => f.visible = false); debris.forEach(d => d.visible = false); sparks.visible = false; hatF.visible = shadesF.visible = false;
  // tiles and glass falling off the facade during the bad idea
  const fall = (n === 'run2' && lt > 2.6) || n === 'bonk';
  facadeBits.forEach((m, i) => { const u = m.userData, k = ((t * 0.9 + u.delay) % 1.4) / 1.4; m.visible = fall; if (!fall) return; m.position.set(OUT_DOOR.x + u.dx, lerp(12, terrainH(OUT_DOOR.x, OUT_DOOR.z) + 0.05, Math.min(1, k * k * 1.3)), OUT_DOOR.z - 0.6 - (i % 4) * 0.6); m.rotation.set(u.sp * k, u.sp * k * 0.5, 0); });
  pot.visible = fall && t < BONK_T + 0.05 || (fall && t >= BONK_T);
  if (pot.visible) {
    const target = V(OUT_DOOR.x + OUT_DIR.x * 1.8, terrainH(OUT_DOOR.x, OUT_DOOR.z) + 1.75, OUT_DOOR.z + OUT_DIR.z * 1.8);
    if (t < BONK_T) { const k = clamp(1 - (BONK_T - t) / 0.9); pot.position.set(target.x, lerp(11, target.y, k * k), target.z); pot.rotation.set(k * 3, 0, k * 2); }
    else { const k = clamp((t - BONK_T) / 0.4); pot.position.set(target.x + 0.6 * k, target.y - 1.6 * k * k + 0.4 * Math.sin(k * Math.PI), target.z - 0.3 * k); pot.rotation.set(3 + k * 4, 0, 2); }
  }
  updateGulls(t, t, 0);
  const eve = n === 'end' ? 0.9 : 0;
  skyU.top.value.set(0x2f7fd8).lerp(new THREE.Color(0x3b5aa8), eve); skyU.bot.value.set(0xbfe6ff).lerp(new THREE.Color(0xffc48a), eve);
  scene.fog.color.copy(skyU.bot.value);
  const inside = INSIDE(n) || (n === 'run2' && lt < 2.6);
  sun.intensity = inside ? lerp(2.6, 1.5, dark) : 2.6; sun.color.set(0xfff1d6).lerp(new THREE.Color(0xffb070), eve);
  hemi.intensity = inside ? lerp(1.15, 0.6, dark) : 0.9;
  clouds.position.x = t * 0.6; storm.visible = false;
  sunSprite.material.rotation = t * 0.12; sunSprite.visible = sunHalo.visible = !inside && n !== 'exit';
  apt.visible = inside || GAGN.includes(n); interior.visible = n === 'exit';
  updateWater(t); spray.visible = false;
}

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
  ui.save(); ui.globalAlpha = a; ui.font = '900 32px "Inter Display"'; const w = ui.measureText(text).width + 50; const x = 40 - (1 - a) * 200;
  ui.translate(x, 40); ui.rotate(-0.03); ui.fillStyle = color; rr(0, 0, w, 60, 14); ui.fill(); ui.lineWidth = 5; ui.strokeStyle = '#fff'; ui.stroke();
  ui.fillStyle = '#fff'; ui.textBaseline = 'middle'; ui.fillText(text, 25, 32); ui.restore();
}
function pop(lt, d = 0.35) { const x = clamp(lt / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; }
function vignette(a, rgb = '0,0,0') { if (a <= 0) return; const g = ui.createRadialGradient(640, 360, 200, 640, 360, 760); g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(1, `rgba(${rgb},${a})`); ui.fillStyle = g; ui.fillRect(0, 0, W, H); }
function headOnScreen(bean, dy = 0.75) { const v = new THREE.Vector3(); bean.body.getWorldPosition(v); v.y += dy; const s = v.project(camera); return [(s.x * 0.5 + 0.5) * W, (-s.y * 0.5 + 0.5) * H]; }

function questionMarks(k, hx, hy) {
  const tint = ui.createRadialGradient(hx, hy, 50, hx, hy, 700); tint.addColorStop(0, 'rgba(120,60,200,0)'); tint.addColorStop(1, `rgba(70,20,140,${0.35 + 0.1 * Math.sin(k * 8)})`);
  ui.fillStyle = tint; ui.fillRect(0, 0, W, H);
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
  ui.fillStyle = 'rgba(40,30,80,0.25)'; ui.fillRect(0, 0, W, H);
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

const HL = [];   // (highlighting now happens word by word in the vertical version)
function quakeDiagram(t, g) {
  const lt = t - g.start; const a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  if (a <= 0) return;
  ui.save(); ui.globalAlpha = a;
  const wPl = wordAt('placas', g.start) - g.start, wTr = wordAt('travam', g.start) - g.start, wSo = wordAt('soltam', g.start) - g.start, wOn = wordAt('ondas', g.start) - g.start;
  const GY = 250;   // ground surface
  const sky = ui.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#4fa9ec'); sky.addColorStop(1, '#d9f1ff'); ui.fillStyle = sky; ui.fillRect(0, 0, W, GY + 4);
  ui.save(); ui.translate(140, 80); ui.rotate(lt * 0.25); ui.fillStyle = 'rgba(255,225,120,0.55)'; for (let i = 0; i < 12; i++) { ui.rotate(Math.PI / 6); ui.beginPath(); ui.moveTo(-5, 36); ui.lineTo(5, 36); ui.lineTo(0, 62); ui.fill(); } ui.fillStyle = '#ffd84a'; ui.beginPath(); ui.arc(0, 0, 28, 0, Math.PI * 2); ui.fill(); ui.restore();
  const cloud = (x, y, s) => { ui.fillStyle = 'rgba(255,255,255,0.95)'; ui.beginPath(); ui.arc(x, y, 20 * s, 0, Math.PI * 2); ui.arc(x + 24 * s, y - 10 * s, 26 * s, 0, Math.PI * 2); ui.arc(x + 50 * s, y, 20 * s, 0, Math.PI * 2); ui.rect(x, y - 4 * s, 50 * s, 24 * s); ui.fill(); };
  cloud(330 + lt * 5, 70, 1); cloud(760 + lt * 4, 110, 0.8);
  // phases
  const lock = ss(wTr, wSo - 0.2, lt), snap = ss(wSo, wSo + 0.25, lt), waves = lt > wOn - 0.3 ? lt - wOn + 0.3 : 0;
  const slip = lock * 22 * (1 - snap) - snap * 18;    // fault offset: bends while locked, then jumps back past zero
  const quakeShake = lt > wSo ? Math.max(0, 1 - (lt - wSo) / 4) : 0;
  const jig = x => quakeShake * Math.sin(lt * 50 + x * 0.05) * 5;
  // crust layers (two plates meeting at a slanted fault at x≈640)
  const faultX = y => 600 + (y - GY) * 0.35;
  const layers = [['#8fc06a', 0, 22], ['#c79a5f', 22, 120], ['#a77a45', 120, 260], ['#7f5a34', 260, 470]];
  for (const side of [-1, 1]) {
    for (const [col, y0, y1] of layers) {
      ui.beginPath();
      const off = side < 0 ? slip : -slip * 0.3;
      if (side < 0) { ui.moveTo(0, GY + y0 + off * 0.2); ui.lineTo(faultX(GY + y0), GY + y0 + off + jig(300)); ui.lineTo(faultX(GY + y1), GY + y1 + off + jig(300)); ui.lineTo(0, GY + y1 + off * 0.2); }
      else { ui.moveTo(faultX(GY + y0), GY + y0 + off + jig(900)); ui.lineTo(W, GY + y0); ui.lineTo(W, GY + y1); ui.lineTo(faultX(GY + y1), GY + y1 + off + jig(900)); }
      ui.closePath(); ui.fillStyle = col; ui.fill();
    }
  }
  // rocks dots
  for (let i = 0; i < 40; i++) { const x = (i * 197) % W, y = GY + 40 + (i * 73) % 400; ui.fillStyle = 'rgba(60,35,15,0.25)'; ui.beginPath(); ui.ellipse(x, y, 6 + (i % 4) * 2, 4, 0, 0, Math.PI * 2); ui.fill(); }
  // fault line
  ui.strokeStyle = '#3a1f10'; ui.lineWidth = 5; ui.setLineDash([14, 8]); ui.beginPath(); ui.moveTo(faultX(GY), GY); ui.lineTo(faultX(H), H); ui.stroke(); ui.setLineDash([]);
  // little town on the surface (shakes with the waves)
  const town = [[180, 50, '#f6c8a0'], [240, 70, '#a8d8ea'], [310, 40, '#ffe6a7'], [860, 60, '#f7a7a7'], [930, 85, '#d6f0c8'], [1010, 45, '#fde2c4'], [1080, 65, '#a8d8ea']];
  town.forEach(([x, h, c], i) => { const dx = jig(x) * 1.5 * (waves > 0 ? 1 : 0.3), tilt = quakeShake * Math.sin(lt * 30 + i) * 0.05; ui.save(); ui.translate(x + 24, GY + 2); ui.rotate(tilt); ui.fillStyle = c; ui.fillRect(-24 + dx, -h, 48, h); ui.fillStyle = '#5f8fb3'; for (let r = 0; r < h / 16 - 1; r++) { ui.fillRect(-16 + dx, -h + 8 + r * 16, 10, 8); ui.fillRect(4 + dx, -h + 8 + r * 16, 10, 8); } ui.restore(); });
  [[420, '#3f8f2f'], [760, '#4e9a3a']].forEach(([x, c]) => { ui.fillStyle = '#7a5230'; ui.fillRect(x - 4, GY - 30, 8, 30); ui.fillStyle = c; ui.beginPath(); ui.arc(x + jig(x), GY - 40, 22, 0, Math.PI * 2); ui.fill(); });
  // plates pushing
  ui.textAlign = 'center'; ui.textBaseline = 'middle';
  if (lt > wTr - 0.3) {
    const k = ss(wTr - 0.3, wTr + 0.2, lt) * (1 - ss(wSo + 1.5, wSo + 2.2, lt));
    ui.save(); ui.globalAlpha = a * k; ui.fillStyle = '#ffd23f'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 4;
    const arrow = (x, y, dir) => { ui.beginPath(); ui.moveTo(x, y - 14); ui.lineTo(x + dir * 70, y - 14); ui.lineTo(x + dir * 70, y - 30); ui.lineTo(x + dir * 110, y); ui.lineTo(x + dir * 70, y + 30); ui.lineTo(x + dir * 70, y + 14); ui.lineTo(x, y + 14); ui.closePath(); ui.fill(); ui.stroke(); };
    const push = Math.sin(lt * 6) * 6 * (1 - snap);
    arrow(330 + push, 540, 1); arrow(950 - push, 540, -1);
    // pressure meter
    ui.fillStyle = 'rgba(10,20,40,0.75)'; rr(1040, 300, 200, 40, 20); ui.fill(); ui.fillStyle = `rgb(${200 + 55 * lock},${200 - 150 * lock},60)`; rr(1046, 306, 188 * Math.min(1, lock * (1 - snap) + snap * 0.05), 28, 14); ui.fill();
    ui.restore(); outlined('PRESSÃO', 1140, 285, 22, '#ffffff', '#0a1428', 900, 0.2);
  }
  // hypocenter + snap + seismic waves
  const hx = faultX(GY + 300), hy2 = GY + 300;
  if (lt > wSo - 0.05) {
    const k = lt - wSo;
    if (k < 0.5) { ui.fillStyle = `rgba(255,255,255,${0.8 * (1 - k / 0.5)})`; ui.fillRect(0, 0, W, H); }
    ui.save(); ui.translate(hx, hy2); ui.rotate(k * 2); ui.fillStyle = '#ffd23f'; ui.beginPath(); for (let i = 0; i < 10; i++) { const r2 = i % 2 ? 8 : 20, an = i / 10 * Math.PI * 2; ui.lineTo(Math.cos(an) * r2, Math.sin(an) * r2); } ui.fill(); ui.restore();
    if (k < 1.4) { ui.save(); ui.translate(hx + 90, hy2 - 70); const s2 = pop(k, 0.2); ui.scale(s2, s2); ui.rotate(-0.1); outlined('CRACK!', 0, 0, 60, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); }
  }
  if (waves > 0) {
    for (let r = 0; r < 6; r++) { const rad = ((waves * 260 + r * 90) % 540); ui.strokeStyle = `rgba(255,240,150,${0.85 * (1 - rad / 540)})`; ui.lineWidth = 5; ui.beginPath(); ui.arc(hx, hy2, rad, 0, Math.PI * 2); ui.stroke(); }
    outlined('ONDAS SÍSMICAS', hx, hy2 + 150, 30, '#ffffff', '#0a1428', 900, 0.2);
    // epicentre marker on the surface right above
    ui.fillStyle = '#e8443a'; ui.beginPath(); ui.moveTo(hx - 120, GY - 10); ui.lineTo(hx - 104, GY - 38); ui.lineTo(hx - 136, GY - 38); ui.closePath(); ui.fill();
  }
  if (lt > wSo + 0.2) { outlined('HIPOCENTRO', hx - 10, hy2 + 50, 22, '#ffd23f', '#0a1428', 900, 0.2); }
  // puzzle globe inset while the narrator introduces the plates
  if (lt < wTr + 0.3) {
    const k = ss(wPl - 0.4, wPl, lt) * (1 - ss(wTr - 0.2, wTr + 0.3, lt));
    if (k > 0) {
      ui.save(); ui.globalAlpha = a * k; ui.translate(1060, 150); const s2 = pop(lt - wPl + 0.4, 0.4); ui.scale(s2, s2); ui.rotate(lt * 0.15);
      ui.fillStyle = '#2f8fd8'; ui.beginPath(); ui.arc(0, 0, 100, 0, Math.PI * 2); ui.fill();
      ui.fillStyle = '#7bb24a'; [[-30, -30, 45, 30], [40, 20, 35, 45], [-45, 45, 30, 22], [50, -50, 28, 18]].forEach(([x, y, rx, ry]) => { ui.beginPath(); ui.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2); ui.fill(); });
      ui.strokeStyle = '#ffd23f'; ui.lineWidth = 5; ui.beginPath(); ui.moveTo(-100, -10); ui.bezierCurveTo(-40, -60, 10, 20, 100, -20); ui.moveTo(-20, -100); ui.bezierCurveTo(-10, -30, 30, 10, 10, 100); ui.moveTo(-90, 50); ui.lineTo(10, 40); ui.stroke();
      ui.strokeStyle = '#0a1428'; ui.lineWidth = 6; ui.beginPath(); ui.arc(0, 0, 100, 0, Math.PI * 2); ui.stroke();
      ui.restore(); ui.save(); ui.globalAlpha = a * k; outlined('PLACAS TECTÔNICAS', 1060, 285, 28, '#ffffff', '#0a1428', 900, 0.2); outlined('(um quebra-cabeça gigante)', 1060, 318, 20, '#ffd23f', '#0a1428', 800, 0.2); ui.restore();
    }
  }
  ui.textAlign = 'left'; ui.font = '900 18px "Inter Display"'; { const tw2 = ui.measureText('COMO FUNCIONA UM TERREMOTO').width; ui.fillStyle = 'rgba(10,20,40,0.75)'; rr(1260 - tw2 - 36, 20, tw2 + 36, 40, 20); ui.fill(); ui.fillStyle = '#fff'; ui.fillText('COMO FUNCIONA UM TERREMOTO', 1260 - tw2 - 18, 41); }
  ui.restore();
}
function richterScale(t, g) {
  const lt = t - g.start; const a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  if (a <= 0) return;
  ui.save(); ui.globalAlpha = a;
  const bg = ui.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#13304f'); bg.addColorStop(1, '#0a1a2c'); ui.fillStyle = bg; ui.fillRect(0, 0, W, H);
  ui.textAlign = 'center'; ui.textBaseline = 'middle';
  outlined('ESCALA RICHTER', 640, 80, 56, '#ffd23f', '#0a1428', 900, 0.18);
  const x0 = 120, x1 = 1160, y = 330;
  for (let i = 1; i <= 10; i++) {
    const xa = lerp(x0, x1, (i - 1) / 10), xb = lerp(x0, x1, i / 10);
    const c = new THREE.Color().setHSL(0.33 * (1 - (i - 1) / 9), 0.75, 0.5);
    ui.fillStyle = '#' + c.getHexString(); rr(xa + 3, y - 34, xb - xa - 6, 68, 10); ui.fill();
    outlined(String(i), (xa + xb) / 2, y + 2, 34, '#ffffff', '#0a1428', 900, 0.2);
  }
  const w4 = wordAt('quatro', g.start) - g.start, w7 = wordAt('sete', g.start) - g.start;
  // marker sliding along the scale
  let mv = 1; if (lt > w4 - 0.3) mv = lerp(1, 3.5, ss(w4 - 0.3, w4 + 0.3, lt)); if (lt > w7 - 0.3) mv = lerp(3.5, 7.5, ss(w7 - 0.3, w7 + 0.4, lt));
  const mx = lerp(x0, x1, (mv - 0.5) / 10);
  ui.fillStyle = '#ffffff'; ui.beginPath(); ui.moveTo(mx, y - 46); ui.lineTo(mx - 18, y - 76); ui.lineTo(mx + 18, y - 76); ui.closePath(); ui.fill();
  // icons for low / high values
  const icon = (cx, kind, k) => {
    ui.save(); ui.globalAlpha = a * k; ui.translate(cx, 470); const s2 = pop(k * 0.4, 0.4); ui.scale(s2, s2);
    if (kind === 'sleep') { ui.fillStyle = '#7a4421'; ui.beginPath(); ui.ellipse(0, 10, 60, 34, 0, 0, Math.PI * 2); ui.fill(); ui.fillStyle = '#fff'; ui.font = '900 34px "Inter Display"'; ui.fillText('z Z z', 40, -50); ui.fillStyle = '#3d6fa8'; ui.fillRect(-80, 30, 160, 26); }
    else { const sh = Math.sin(lt * 40) * 6; ui.fillStyle = '#f6c8a0'; ui.save(); ui.rotate(0.25 + sh * 0.01); ui.fillRect(-50, -90, 70, 140); ui.fillStyle = '#5f8fb3'; for (let r = 0; r < 6; r++) { ui.fillRect(-40, -80 + r * 22, 16, 12); ui.fillRect(-6, -80 + r * 22, 16, 12); } ui.restore(); ui.fillStyle = '#b8a48a'; for (let i = 0; i < 6; i++) { ui.beginPath(); ui.arc(30 + i * 14 + sh, 55 - (i % 3) * 8, 10, 0, Math.PI * 2); ui.fill(); } }
    ui.restore();
  };
  if (lt > w4 - 0.3) { const k = ss(w4 - 0.3, w4 + 0.2, lt); icon(lerp(x0, x1, 0.25), 'sleep', k); ui.save(); ui.globalAlpha = a * k; outlined('quase ninguém sente', lerp(x0, x1, 0.25), 565, 28, '#ffffff', '#0a1428', 900, 0.2); ui.restore(); }
  if (lt > w7 - 0.3) { const k = ss(w7 - 0.3, w7 + 0.2, lt); icon(lerp(x0, x1, 0.78), 'fall', k); ui.save(); ui.globalAlpha = a * k; outlined('derruba prédios', lerp(x0, x1, 0.78), 565, 28, '#ff6b5a', '#0a1428', 900, 0.2); ui.restore(); }
  ui.restore();
}
function steps3(t, g) {   // ABAIXE / PROTEJA-SE / SEGURE pills
  const items = [['1', 'ABAIXE', wordAt('abaixe', g.start)], ['2', 'PROTEJA-SE', wordAt('proteja', g.start)], ['3', 'SEGURE', wordAt('segure', g.start)]];
  items.forEach(([k, txt, at], i) => {
    const a = ss(at - 0.1, at + 0.2, t); if (a <= 0) return;
    ui.save(); ui.globalAlpha = a; ui.translate(60 - (1 - a) * 80, 130 + i * 92);
    ui.fillStyle = 'rgba(10,20,40,0.8)'; rr(0, 0, 360, 76, 18); ui.fill(); ui.fillStyle = '#1e9e57'; ui.beginPath(); ui.arc(42, 38, 28, 0, Math.PI * 2); ui.fill();
    ui.textBaseline = 'middle'; ui.textAlign = 'center'; outlined(k, 42, 40, 32, '#fff', '#1e9e57', 900, 0.05); ui.textAlign = 'left'; outlined(txt, 86, 40, 36, '#ffd23f', '#0a1428', 900, 0.12); ui.restore();
  });
}
function stars(x, y, k) { for (let i = 0; i < 5; i++) { const an = k * 4 + i / 5 * Math.PI * 2; ui.save(); ui.translate(x + Math.cos(an) * 70, y + Math.sin(an) * 22); ui.rotate(k * 5 + i); ui.fillStyle = '#ffd23f'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 3; ui.beginPath(); for (let j = 0; j < 10; j++) { const r2 = j % 2 ? 7 : 16, a2 = j / 10 * Math.PI * 2; ui.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2); } ui.closePath(); ui.fill(); ui.stroke(); ui.restore(); } }
function smoke(x, y, k, n2 = 9) { for (let i = 0; i < n2; i++) { const ang = i / n2 * Math.PI * 2, rad = 20 + k * 90; ui.fillStyle = `rgba(90,90,90,${0.55 * (1 - k / 0.9)})`; ui.beginPath(); ui.arc(x + Math.cos(ang) * rad, y - 60 - k * 80 + Math.sin(ang) * rad * 0.5, 26 + k * 30, 0, Math.PI * 2); ui.fill(); } }
function overlay(t, g) {
  ui.clearRect(0, 0, W, H);
  const lt = t - g.start, n = g.scene, fadeIn = ss(0, 0.3, lt);
  if (n === 'explain') quakeDiagram(t, g);
  if (n === 'scale') richterScale(t, g);
  if (n === 'title' && !NOTITLE) {
    if (lt > 0.6) { const s = pop(lt - 0.6, 0.5); ui.save(); ui.translate(640, 300); ui.scale(s, s); ui.rotate(-0.02); ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.globalAlpha = 1 - ss(g.dur - 0.6, g.dur, lt); outlined('Você sobreviveria', 0, -55, 72, '#ffffff', '#0a2a4a', 900, 0.18); outlined('a um TERREMOTO?', 0, 45, 100, '#ff8a2a', '#0a2a4a', 900, 0.18); ui.restore(); }
    ui.save(); ui.globalAlpha = ss(0, 1, lt) * (1 - ss(g.dur - 0.6, g.dur, lt)); ui.textAlign = 'center'; outlined('GUIA DE SOBREVIVÊNCIA  •  EPISÓDIO 2', 640, 110, 26, '#ffffff', '#0a2a4a', 800, 0.2); ui.restore();
  }
  if (n === 'home') { const c2 = capAt('cachorro', g.start) - g.start; if (lt > c2) { ui.save(); ui.textAlign = 'center'; const [x, y] = [760, 300]; for (let i = 0; i < 3; i++) { const life = (lt * 0.6 + i / 3) % 1; ui.globalAlpha = 1 - life; outlined('z', x + i * 26 + life * 30, y - life * 110, 30 + i * 8, '#ffffff', '#0a1428', 900, 0.2); } ui.restore(); } }
  if (['shake', 'friend1'].includes(n) && t > SH0) badge('⚠ TERREMOTO', ss(SH0, SH0 + 0.3, t), '#c62828');
  if (n === 'friend1') { const k = lt - 0.2; if (k > 0) { const [hx, hy] = headOnScreen(friend); questionMarks(k, clamp(hx, 300, 980), clamp(hy, 300, 420)); } }
  if (n === 'pause') { ui.save(); ui.fillStyle = 'rgba(20,30,50,0.35)'; ui.fillRect(0, 0, W, H); ui.globalAlpha = ss(0.1, 0.4, lt); ui.fillStyle = '#ffffff'; ui.fillRect(1120, 50, 26, 80); ui.fillRect(1166, 50, 26, 80); ui.textAlign = 'center'; outlined('PAUSA', 1156, 160, 26, '#ffffff', '#0a1428', 900, 0.2); ui.restore(); }
  if (n === 'run2' || n === 'bonk') badge('✗ PÉSSIMA IDEIA', n === 'run2' ? ss(0, 0.3, lt) : 1, '#c62828');
  if (n === 'bonk' && t > BONK_T) { const [x, y] = headOnScreen(friend, 0.9); const k = t - BONK_T; stars(x, y - 30, k); ui.save(); ui.textAlign = 'center'; ui.translate(x + 40, y - 150); const s2 = pop(k, 0.2); ui.scale(s2, s2); ui.rotate(-0.12); outlined('BONK!', 0, 0, 80, '#ffd23f', '#0a1428', 900, 0.17); ui.restore(); }
  if (n === 'replay') vhs(t, lt);
  if (n === 'idea') { const [x, y] = headOnScreen(hero, 1.0); lightbulb(x, y - 70, lt); }
  if (n === 'rule') {
    badge('★ REGRA DE OURO', fadeIn, '#1e9e57'); steps3(t, g);
    const wJ = wordAt('janelas', g.start); if (t > wJ) { ui.save(); ui.globalAlpha = ss(wJ, wJ + 0.3, t); ui.textAlign = 'center'; outlined('✗ JANELAS   ✗ ESPELHOS   ✗ ESTANTES', 760, 120, 34, '#ffffff', '#c62828', 900, 0.22); ui.restore(); }
  }
  if (n === 'outside') {
    const wC = wordAt('dirigindo', g.start);
    if (t < wC - 0.3) badge('NA RUA: LUGAR ABERTO', fadeIn, '#1557b0');
    else { badge('NO CARRO: PARE E FIQUE DENTRO', 1, '#1557b0'); ui.save(); ui.globalAlpha = ss(wC, wC + 0.3, t); ui.textAlign = 'center'; outlined('✗ PONTES   ✗ VIADUTOS', 900, 220, 40, '#ffffff', '#c62828', 900, 0.22); ui.restore(); }
  }
  if (n === 'after') { if (lt > 0.35 && lt < 1.6) { const [x, y] = headOnScreen(friend, 0.9); stars(x, y - 20, lt); ui.save(); ui.textAlign = 'center'; ui.translate(x + 50, y - 120); ui.rotate(-0.1); outlined('AI!', 0, 0, 64, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); } }
  if (n === 'after2') badge('⚠ RÉPLICAS', fadeIn, '#c25a12');
  if (['gas1', 'gas2', 'gas3'].includes(n) && t < FW_T) {
    // gas smell lines rising from the cylinder
    const v3 = V(AO.x + 4.15, AO.y + 1.0, AO.z - 0.35).project(camera); const gx = (v3.x * 0.5 + 0.5) * W, gy = (-v3.y * 0.5 + 0.5) * H;
    ui.save(); ui.strokeStyle = 'rgba(140,220,90,0.8)'; ui.lineWidth = 6; ui.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const life = (t * 0.5 + i / 4) % 1; ui.globalAlpha = 1 - life; ui.beginPath(); for (let k = 0; k <= 10; k++) { const yy = gy - life * 160 - k * 10; ui.lineTo(gx - 40 + i * 26 + Math.sin(k * 0.9 + t * 4 + i) * 10, yy); } ui.stroke(); }
    ui.restore();
    if (n === 'gas1') badge('⚠ CHEIRO DE GÁS = NADA DE FOGO', fadeIn, '#c62828');
  }
  if (n === 'gas2' && lt > 0.6) { ui.save(); const [x, y] = headOnScreen(hero, 0.9); ui.textAlign = 'center'; ui.translate(x - 30, y - 120); const s2 = pop(lt - 0.6, 0.25); ui.scale(s2, s2); outlined('NÃÃÃO!', 0, 0, 64, '#ff6b5a', '#0a1428', 900, 0.18); ui.restore(); }
  if (n === 'gas3') {
    const [x, y] = headOnScreen(friend, 0.3);
    if (t > FW_T && t < FW_T + 1.1) { ui.save(); ui.globalAlpha = Math.max(0, 0.5 - (t - FW_T) * 0.6); ui.fillStyle = '#ff9a3a'; ui.fillRect(0, 0, W, H); ui.restore(); ui.save(); ui.textAlign = 'center'; ui.translate(x + 20, y - 200); const s2 = pop(t - FW_T, 0.2); ui.scale(s2, s2); ui.rotate(-0.08); outlined('FWOOMP!', 0, 0, 84, '#ffd23f', '#c62828', 900, 0.17); ui.restore(); }
    if (t > FW_T + 0.6 && t < FW_T + 1.5) smoke(x, y, t - FW_T - 0.6);
    if (t > FW_T + 1.6) { ui.save(); ui.textAlign = 'center'; ui.globalAlpha = ss(FW_T + 1.7, FW_T + 2.0, t); outlined('...', 860, 230, 90, '#ffffff', '#0a1428', 900, 0.18); ui.restore(); }
  }
  if (n === 'gas4') { const [x, y] = headOnScreen(friend, 1.0); for (let i = 0; i < 4; i++) { const life = (lt * 0.7 + i / 4) % 1; ui.fillStyle = `rgba(110,110,110,${0.5 * (1 - life)})`; ui.beginPath(); ui.arc(x + Math.sin(lt * 3 + i) * 12, y - life * 120, 10 + life * 18, 0, Math.PI * 2); ui.fill(); } }
  if (n === 'exit') { const wA = wordAt('área', g.start); badge(t < wA ? 'PELA ESCADA ✓  ELEVADOR ✗' : 'ÁREA ABERTA ✓', 1, '#1557b0'); }
  if (n === 'coast' || n === 'coast2') { ui.save(); ui.textAlign = 'center'; ui.globalAlpha = n === 'coast' ? ss(S.coast.dur - 2.4, S.coast.dur - 2.0, lt) : 1; outlined('LEMBRA DO EP. 1?', 640, 120, 54, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); }
  if (n === 'q1') { ui.save(); ui.translate(940, 200); const s = pop(lt - 0.2); ui.scale(s, s); ui.rotate(0.05); ui.textAlign = 'center'; outlined('SEGUIR AS DICAS ✓', 0, 0, 50, '#5ff08a', '#0a1428', 900, 0.2); ui.restore(); }
  if (['q2', 'q3', 'q4'].includes(n)) { ui.save(); ui.translate(320, 200); const s = pop(t - T0('q2') - 0.2); ui.scale(s, s); ui.rotate(-0.05); ui.textAlign = 'center'; outlined('JOGAR VIDEOGAME', 0, 0, 50, '#ffd23f', '#0a1428', 900, 0.2); ui.restore(); }
  if (n === 'crash' && t > CRASH_T + 0.3) {
    const k = t - CRASH_T - 0.3; ui.save(); ui.fillStyle = `rgba(235,230,220,${Math.max(0, 0.95 - k * 0.55)})`; ui.fillRect(0, 0, W, H); ui.restore();
    if (k > 1.2) { ui.save(); ui.textAlign = 'center'; for (let i = 0; i < 2; i++) { const a2 = ss(1.2 + i * 0.5, 1.4 + i * 0.5, k); if (a2 <= 0) continue; ui.globalAlpha = a2; outlined('cof', 520 + i * 200, 250 - i * 40, 50, '#ffffff', '#0a1428', 900, 0.2); } ui.restore(); }
  }
  if (n === 'end') {
    const a = ss(0.6, 1.2, lt);
    ui.save(); ui.globalAlpha = a; ui.textAlign = 'center'; ui.textBaseline = 'middle';
    ui.fillStyle = 'rgba(10,20,40,0.6)'; rr(340, 50, 600, 210, 30); ui.fill();
    outlined('PRÓXIMO EPISÓDIO', 640, 100, 34, '#ffffff', '#0a1428', 800, 0.15);
    ui.translate(640, 185); const s = pop(lt - 1.0, 0.4); ui.scale(s, s); ui.rotate(-0.03 + (lt > 1 ? Math.sin(lt * 20) * 0.01 : 0));
    outlined('ENCHENTE', 0, 0, 96, '#5fd0ff', '#0a1428', 900, 0.16); ui.restore();
  }
  if (n !== 'title' && n !== 'end' && !NOCAP) caption(t);
  if (flash > 0) { ui.fillStyle = `rgba(255,255,255,${flash})`; ui.fillRect(0, 0, W, H); }
  if (t < 0.5) { ui.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; ui.fillRect(0, 0, W, H); }
  const fo = ss(TL.total - 1.0, TL.total, t); if (fo > 0) { ui.fillStyle = `rgba(0,0,0,${fo})`; ui.fillRect(0, 0, W, H); }
}

window.renderFrame = (t) => {
  REAL_T = t;
  let g = seg(t), tt = t;
  if (g.scene === 'pause') tt = g.start;                         // freeze frame
  if (g.scene === 'replay') { const k = ease(clamp((t - g.start) / (g.dur - 0.2))); tt = lerp(TE('bonk') - 0.05, T0('run2') + 2.7, k); }   // rewind the bad idea
  const gs = seg(tt), lt = tt - gs.start;
  const q = quake(tt, gs.scene, lt);
  const dark = updateApartment(tt, gs.scene, lt, q);
  world(tt, gs.scene, lt, q, dark); direct(tt, gs.scene, lt, gs, q);
  sunSprite.position.copy(camera.position).addScaledVector(skyU.sunDir.value, 420); sunHalo.position.copy(sunSprite.position);
  renderer.render(scene, camera); overlay(t, g); return true;
};
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"'); await document.fonts.load('800 40px "Inter Display"');
window.READY = true;
