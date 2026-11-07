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
const ROAD = { x: 5.5, z: 17.6, half: 15.5, y: 0.06 * 17.6 };
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
function T0(n) { return S[n].start; } function TE(n) { return S[n].start + S[n].dur; }
function seaBase(t) { const r0 = T0('recede') + 1.6; return lerp(0, -2.4, ss(r0, r0 + 3.2, t)); }
const HIT = T0('hit');
function front(t) {
  if (t < T0('horizon')) return -400;
  if (t < T0('answer')) return lerp(-205, -175, clamp((t - T0('horizon')) / (T0('answer') - T0('horizon'))));
  if (t < HIT) return lerp(-175, -75, clamp((t - T0('answer')) / (HIT - T0('answer'))));
  const u = t - HIT;
  if (u < 2.6) return lerp(-75, 0, u / 2.6);
  if (u < 6.5) return lerp(0, 75, (u - 2.6) / 3.9);
  return 75 + (u - 6.5) * 8;
}
function flood(t) { return 3.3; }
function secondFront(t) { const a = T0('safe') + 3.0; return t < a ? -400 : lerp(-200, 80, clamp((t - a) / 7)); }
const SURF_T = (TL.caps.find(c => c.text.toLowerCase().includes('som gostoso')) || { t0: 9 }).t0;
function surferAt(t) { const x = 9.5 - (t - SURF_T) * 1.7, z = -9.6 + 0.7 * Math.sin(t * 0.6); return { x, z, on: t < T0('recede') + 1.4 && x > -45 && x < 45 }; }
function waterH(x, z, t) {
  const zf = front(t), base = seaBase(t);
  let h;
  if (zf < -300) h = base;
  else {
    const s = ss(zf, zf - 6, z);
    h = lerp(base, flood(t), s);
    const grow = lerp(7, 10.5, ss(-200, -20, zf)) * (1 - ss(15, 70, zf) * 0.65);
    const dz = z - (zf - 3.0);
    h += grow * Math.exp(-Math.pow(dz / (dz > 0 ? 2.2 : 6.0), 2));
    if (z > zf - 4) h += 0.6 * Math.sin(x * 0.7 + t * 6) * ss(zf + 1, zf - 2, z) * ss(zf - 4, zf - 2, z);
  }
  const z2 = secondFront(t);
  if (z2 > -300) h += 1.6 * Math.exp(-Math.pow((z - z2) / 4, 2));
  const rough = 1 + (zf > -300 ? 2.5 * ss(-10, 10, zf) : 0);
  h += rough * (0.07 * Math.sin(0.45 * x + 1.2 * t) + 0.06 * Math.sin(0.6 * z - 1.6 * t + x * 0.2) + 0.035 * Math.sin(1.7 * x + 2.3 * z + 2.9 * t));
  { const sf = surferAt(t); if (sf.on) h += 0.6 * Math.exp(-Math.pow((z - sf.z + 0.3) / 1.9, 2)) * Math.exp(-Math.pow((x - sf.x - 1.5) / 9, 2)); }
  if (zf < -300) h += 0.14 * Math.max(0, Math.sin(z * 0.9 + t * 2.2)) * ss(-12, -2, z) * ss(2, -1, z - base * 10) * (1 - ss(T0('recede') + 1.6, T0('recede') + 3, t));
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
[[-6, 9, 7, 1.4], [9, 11, 8, -1.6], [-16, 16, 7.5, 1.0], [22, 14, 6.5, -1.0], [-2, 18, 8.5, 0.6], [30, 20, 7, 1.2], [-40, 18, 7, -1.2], [14, 33, 6, 0.8], [-12, 40, 7, 0.5], [40, 34, 8, -0.8]].forEach(([x, z, h, l]) => {
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
const floaters = [umbrella, cooler, ball]; floaters.forEach(o => o.userData.home = o.position.clone());

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
    const skin = new THREE.MeshPhysicalMaterial({ color: o.color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25 });
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
      const h = new THREE.Group(); h.position.y = 0.5; h.rotation.x = -0.12; h.rotation.z = 0.08;
      const straw = std(0xe8cf8a, { roughness: 0.9 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.52, 0.03, 32), straw); h.add(brim);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.22, 24), straw); crown.position.y = 0.11; h.add(crown);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.06, 24), std(0xc0392b)); band.position.y = 0.04; h.add(band);
      this.body.add(h);
    }
    if (o.hair === 'curly') {
      // short dark textured hair with faded sides
      const h = new THREE.Group(); h.position.set(0, 0.36, -0.02); const hm = std(0x17110c, { roughness: 0.85 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.1), hm); cap.scale.set(1.04, 0.62, 0.96); h.add(cap);
      const rr = rnd(11);
      for (let i = 0; i < 26; i++) { const a = rr() * Math.PI * 2, r = Math.sqrt(rr()) * 0.3; const c = new THREE.Mesh(new THREE.SphereGeometry(0.075 + rr() * 0.04, 8, 6), hm); c.position.set(Math.cos(a) * r, 0.2 - r * 0.45 + rr() * 0.04, Math.sin(a) * r * 0.95); h.add(c); }
      for (let i = 0; i < 5; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), hm); c.position.set(-0.16 + i * 0.08, 0.1 + (i % 2) * 0.03, 0.3); h.add(c); }
      this.body.add(h);
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
    this.brows.forEach((br, i) => { const s = i ? 1 : -1; br.rotation.z = -s * brow * 0.4; br.position.y = 0.4 + Math.abs(brow) * 0.03 + (p.eyesWide ? 0.05 : 0); });
    const m = clamp(p.mouth || 0);
    this.mouthIn.scale.set(lerp(0.8, 1.0, m), lerp(0.08, 0.75, m) + (p.shout || 0) * 0.6, 0.3);
    this.mouthIn.visible = m > 0.03 || p.shout;
    this.smile.visible = (p.smile ?? 1) > 0 && m < 0.15 && !p.shout;
    this.smile.rotation.z = (p.smile ?? 1) > 0 ? Math.PI : 0;
    if (this.nut) this.nut.visible = p.nut !== false;
    if (this.cam) this.cam.visible = p.camOn !== false;
    this.root.visible = p.visible !== false;
    this.shades.visible = !!p.shades; this.heldFish.visible = !!p.fish; if (p.fish) this.heldFish.rotation.y = Math.sin(t * 14) * 0.4;
    if (this.hatG) this.hatG.visible = p.hat !== false;
  }
}
const hero = new Bean({ color: 0x7a4421, hat: 'straw', coconut: true, shoe: 0xd93a2b });
const tourist = new Bean({ color: 0x9a5a2c, hat: 'cap', shoe: 0x2b2b2b, glove: 0xfff4d6 });
const surferBean = new Bean({ color: 0x6e3b1b, hair: 'curly', shoe: 0x2a170c, glove: 0x2a170c });
const board = new THREE.Group();
{ const b = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), std(0xffffff, { roughness: 0.3 })); b.scale.set(1.05, 0.045, 0.27); board.add(b);
  const st = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), std(0xff5a36, { roughness: 0.3 })); st.scale.set(0.9, 0.047, 0.07); board.add(st);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.02), std(0x222222)); fin.position.set(0.85, -0.1, 0); board.add(fin);
  shadowAll(board); scene.add(board); }
const neighbor = new Bean({ color: 0xa8703f, shoe: 0x2faa55, glove: 0xffffff });

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
  drink: [2.05, -0.35, -2.25],
  hold: [0.9, 0.0, -1.3],
  thumb: [1.25, 0.25, -1.6],
  fist: (t) => [1.0, 0.4, -2.0 + 0.2 * Math.sin(t * 8)],
  shrug: [0.4, 0.9, -1.6],
  knee: [0.6, 0.15, -0.4],
};
const mouthOf = (arr, t) => arr[Math.min(arr.length - 1, Math.max(0, Math.floor(t * TL.fps)))] || 0;
const capAt = (word, after = 0) => { const c = TL.caps.find(c => c.t0 >= after - 0.01 && c.text.toLowerCase().includes(word)); return c ? c.t0 : after; };

// key places
const TOWEL = { x: 2.6, z: 6.4 }, FISH = { x: 4.6, z: -5.0 }, TOP = { x: -29, z: 33.5 };
fishes[0].userData.x = FISH.x - 0.8; fishes[0].userData.z = FISH.z - 0.6;
fishes[1].userData.x = FISH.x + 1.2; fishes[1].userData.z = FISH.z - 1.5;
const heroPath = new THREE.CatmullRomCurve3([V(FISH.x, 0, FISH.z), V(3.8, 0, 1.5), V(1.4, 0, 7.6), V(-2.5, 0, 11), V(-6.2, 0, 14.6), V(-11, 0, 19.5), V(-18, 0, 26.5), V(-24.5, 0, 31), V(TOP.x, 0, TOP.z)]);
const pathU = (x, z) => { let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const p = heroPath.getPointAt(i / 400); const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = i / 400; } } return best; };
const U_TOWEL = pathU(1.4, 7.6), U_SIGN = pathU(-6.2, 14.6);
function onPath(curve, u) { u = clamp(u, 0, 0.999); const p = curve.getPointAt(u), tg = curve.getTangentAt(u); return { x: p.x, z: p.z, ry: Math.atan2(tg.x, tg.z) }; }
const bp = building.position;
const DOOR = { x: bp.x - 4.2 * Math.sin(0.15), z: bp.z - 4.2 * Math.cos(0.15) };
const neighPath = new THREE.CatmullRomCurve3([V(3, 0, 12.5), V(8, 0, 15.5), V(12.5, 0, 19.6), V(DOOR.x, 0, DOOR.z)]);
const ROOF = { x: bp.x + 1.2, z: bp.z - 2.9 };

// cars stuck in traffic
const cars = [];
[[-1, 0xe8443a], [3.4, 0x2e7dd1], [7.8, 0xffd23f], [12.2, 0xf2f2f2]].forEach(([x, c]) => {
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 1.1), std(c, { roughness: 0.3, metalness: 0.3 })); b.position.y = 0.5; g.add(b);
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.0), std(0x9fd3ff, { roughness: 0.1 })); cab.position.set(-0.15, 1.0, 0); g.add(cab);
  for (const [wx, wz] of [[-0.7, 0.55], [0.7, 0.55], [-0.7, -0.55], [0.7, -0.55]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.15, 12), std(0x222222)); w.rotation.x = Math.PI / 2; w.position.set(wx, 0.22, wz); g.add(w); }
  shadowAll(g); place(g, x, 17.6); g.rotation.y = 0.05; g.userData.home = g.position.clone(); cars.push(g); floaters.push(g);
});
// road
{ const r = new THREE.Mesh(new THREE.BoxGeometry(31, 0.12, 3.4), std(0xffffff, { roughness: 0.95, map: canvasTex(512, 64, (g, w, h) => { g.fillStyle = '#6e7276'; g.fillRect(0, 0, w, h); g.fillStyle = '#c9c9c9'; g.fillRect(0, 3, w, 2); g.fillRect(0, h - 5, w, 2); g.fillStyle = '#f4f4f4'; for (let i = 0; i < 16; i++) g.fillRect(i * 32 + 4, h / 2 - 2, 18, 4); }) })); r.receiveShadow = true; r.position.set(ROAD.x, ROAD.y + 0.02, ROAD.z); scene.add(r); }
// floating cap for the gag
const capF = new THREE.Group(); { const m = std(0x1f6fd1); const d = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), m); d.scale.set(1.1, 0.8, 1.05); capF.add(d); const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), m); bl.position.z = 0.2; capF.add(bl); scene.add(capF); }
const shadesF = new THREE.Group(); { const lm = std(0x111111, { metalness: 0.6, roughness: 0.1 }); for (const s of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.03, 16), lm); l.position.x = s * 0.13; shadesF.add(l); } scene.add(shadesF); }

// seagulls
const gulls = [];
for (let i = 0; i < 6; i++) {
  const g = new THREE.Group(); const wm = std(0xffffff, { roughness: 0.7 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), wm); b.scale.set(0.8, 0.8, 2); g.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), wm); hd.position.set(0, 0.08, 0.42); g.add(hd);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), std(0xffb020)); bk.rotation.x = Math.PI / 2; bk.position.set(0, 0.06, 0.6); g.add(bk);
  const wings = [];
  for (const s of [-1, 1]) { const piv = new THREE.Group(); const w = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.03, 0.35), std(0xf0f0f0)); w.position.x = s * 0.5; const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.035, 0.3), std(0x333333)); tip.position.x = s * 0.45; w.add(tip); piv.add(w); g.add(piv); wings.push([piv, s]); }
  g.userData = { wings, r: 8 + i * 2.5, h: 9 + (i % 3) * 2.5, sp: 0.25 + (i % 2) * 0.1, ph: i * 1.3, cx: -2 + (i % 2) * 6, cz: -4 + (i % 3) * 4 };
  scene.add(g); gulls.push(g);
}
function updateGulls(wt, t) {
  const flee = ss(T0('recede') + 1.5, T0('recede') + 6, wt);
  gulls.forEach(g => {
    const u = g.userData, a = u.ph + wt * u.sp;
    g.position.set(u.cx + Math.cos(a) * u.r, u.h + flee * 40 + Math.sin(wt * 0.7 + u.ph) * 0.5, u.cz + Math.sin(a) * u.r - flee * 60);
    g.rotation.set(0, -a + (u.sp > 0 ? Math.PI : 0), 0.3);
    if (flee > 0) g.rotation.y = Math.PI;
    u.wings.forEach(([p, s]) => p.rotation.z = s * Math.sin(t * (flee > 0 ? 14 : 5) + u.ph) * 0.6);
    g.visible = flee < 0.98;
  });
}

// ---------- time mapping (gag & ending reuse the world) ----------
function seg(t) { for (let i = TL.segs.length - 1; i >= 0; i--) if (t >= TL.segs[i].start) return TL.segs[i]; return TL.segs[0]; }
const TSW = T0('swallow') + 0.9;
const HIT_Z = (z) => HIT + 2.6 + z / 75 * 3.9;
function worldTime(t) {
  const n = seg(t).scene;
  if (n === 'q1') return T0('safe') + 6 + (t - T0('q1'));
  if (n === 'q2' || n === 'q3' || n === 'swallow') return t - TSW + HIT_Z(TOWEL.z);
  if (n === 'end') return 4 + (t - T0('end'));
  return t;
}

// ---------- director ----------
let shake = 0, flash = 0, heroU = 0;
function direct(t, wt) {
  const g = seg(t), lt = t - g.start, p = clamp(lt / g.dur), n = g.scene;
  const hm = clamp(mouthOf(TL.heroMouth, t) * 1.4), tm = clamp(mouthOf(TL.tourMouth, t) * 1.4);
  let cam = { pos: V(0, 5, -10), tgt: V(0, 1, 5), fov: 45 };
  shake = 0; flash = 0;
  const sunbathe = { x: TOWEL.x, z: TOWEL.z, ry: Math.PI - 0.35, legs: 'sit', lean: -0.55, sitY: 0.55, armL: A.relax, armR: A.hold, shades: true };
  let hp = Object.assign({}, sunbathe), tp = { visible: false, x: 0, z: 0 }, np = { visible: false, x: 0, z: 0 };
  const hy = (x, z, dy = 1) => terrainH(x, z) + dy;
  if (n === 'title') {
    const u = ease(clamp(lt / g.dur));
    cam.pos = vl(V(-6, 16, -45), V(-1.2, 3.0, -1.5), u); cam.tgt = vl(V(0, 4, 10), V(2.6, 0.7, 6.4), u); cam.fov = lerp(55, 42, u);
  } else if (n === 'sunny') {
    const c1 = capAt('praia', g.start) - g.start, c2 = capAt('gaivotas', g.start) - g.start, c3 = capAt('som', g.start) - g.start, c4 = capAt('ventinho', g.start) - g.start;
    hp.armR = (lt % 4 < 1.5) ? A.drink : A.hold;
    if (lt < c1) { const k = ease(lt / c1); cam.pos = V(0, 2.2, 0); cam.tgt = vl(V(-30, 60, -100), V(2.6, 1, 6.4), k); cam.fov = 50; }
    else if (lt < c2) { const k = (lt - c1) / (c2 - c1); cam.pos = vl(V(4.2, 1.4, 2.6), V(3.8, 1.2, 3.4), k); cam.tgt = V(2.6, 0.7, 6.3); cam.fov = 40; }
    else if (lt < c3) { const k = (lt - c2) / (c3 - c2); cam.pos = V(2.0, 1.0, 7.5); cam.tgt = vl(V(0, 9, -4), V(4, 11, -8), k); cam.fov = 55; }
    else if (lt < c4) { const sf = surferAt(wt); cam.pos = V(sf.x - 3.8, 1.6, -2.4); cam.tgt = V(sf.x + 0.5, 0.75, sf.z); cam.fov = 36; }
    else { const k = clamp((lt - c4) / (g.dur - c4)); cam.pos = vl(V(10, 1.5, 4), V(8, 2.2, 0.5), k); cam.tgt = V(-2, 5, 12); cam.fov = 50; }
  } else if (n === 'calm') {
    hp.armR = A.drink;
    if (lt < 1.4) { cam.pos = vl(V(4.0, 1.3, 3.0), V(3.6, 1.1, 3.8), p); cam.tgt = V(2.6, 0.75, 6.3); cam.fov = 38; }
    else { cam.pos = V(3.3, 1.2, 4.3); cam.tgt = V(2.55, 0.95, 6.3); cam.fov = 34; hp.shades = lt < 2.0; hp.armR = A.hold; hp.look = [Math.sin(lt * 2.5) * 0.9, 0.2]; hp.brow = -0.4; hp.smile = 0; }
  } else if (n === 'recede') {
    const c2 = capAt('peixe', g.start) - g.start;
    hp.shades = false; hp.armR = A.hold; hp.nut = lt < 2; hp.eyesWide = lt > 2; hp.brow = 0.7; hp.lean = lerp(-0.55, 0, ss(1.0, 2.0, lt)); hp.sitY = lerp(0.55, 0.6, ss(1, 2, lt));
    if (lt < 2.2) { cam.pos = vl(V(3.6, 1.2, 4.4), V(3.4, 1.15, 4.8), p); cam.tgt = V(2.6, 0.9, 6.3); cam.fov = 36; }
    else if (lt < c2 - 0.3) { cam.pos = V(2.8, 2.3, 9.8); cam.tgt = V(3, -0.5, -12); cam.fov = 52; }
    else { const k = (lt - c2 + 0.3) / (g.dur - c2 + 0.3); cam.pos = vl(V(5.2, 0.35, -2.8), V(5.0, 0.4, -3.4), k); cam.tgt = V(3.6, -0.2, -5.6); cam.fov = 40; }
  } else if (n === 'fish') {
    const u = ss(0.5, g.dur, lt);
    if (lt < 0.6) { hp = Object.assign(hp, { lean: 0, sitY: 0.6, shades: false, nut: false, armL: A.rest, armR: A.rest, smile: 1, look: [0, -0.5] }); }
    else hp = { x: lerp(TOWEL.x, FISH.x, u), z: lerp(TOWEL.z, FISH.z + 1.0, u), ry: Math.PI + 0.15, run: 0.55, phase: lt * 11, smile: 1, nut: false, brow: -0.2 };
    cam.pos = vl(V(7.5, 2.2, 3.5), V(7.0, 1.6, -1.0), ease(p)); cam.tgt = V(lerp(TOWEL.x, FISH.x, u), 0.6, lerp(TOWEL.z, FISH.z, u)); cam.fov = 45;
  } else if (n === 'dinner') {
    hp = { x: FISH.x, z: FISH.z, ry: 0.35, armR: A.fishUp, armL: A.hips, fish: true, mouth: hm, smile: 1, nut: false, brow: -0.2, look: [0, 0.4] };
    cam.pos = vl(V(5.4, 0.4, -2.4), V(5.2, 0.45, -2.9), p); cam.tgt = V(FISH.x, hy(FISH.x, FISH.z, 1.1), FISH.z); cam.fov = 42;
  } else if (n === 'twist') {
    hp = { x: FISH.x, z: FISH.z, ry: 0.35, armR: A.hold, armL: A.rest, fish: true, smile: 1, nut: false, brow: -0.2 };
    const k = ease(ss(0.3, g.dur - 1.2, lt));
    const fc = V(FISH.x, hy(FISH.x, FISH.z, 1.15), FISH.z), dir = V(Math.sin(0.35), 0, Math.cos(0.35)); cam.pos = vl(fc.clone().addScaledVector(dir, 3.2).add(V(0, -0.2, 0)), fc.clone().addScaledVector(dir, 1.7), k); cam.tgt = fc; cam.fov = lerp(42, 32, k);
  } else if (n === 'explain' || n === 'retreat') {
    hp = { x: FISH.x, z: FISH.z, ry: 0.35, armR: A.hold, armL: A.rest, fish: true, nut: false };
    cam.pos = V(14, 10, 10); cam.tgt = V(0, 0, -15); cam.fov = 50;
  } else if (n === 'horizon') {
    const c1 = capAt('dez metros', g.start) - g.start, c2 = capAt('densa', g.start) - g.start;
    hp = { x: FISH.x, z: FISH.z, ry: Math.PI + 0.1, armR: A.hold, armL: A.rest, fish: true, nut: false, look: [0, 0.6] };
    if (lt < c1 - 0.2) { const k = ease(clamp(lt / (c1 - 0.2))); cam.pos = vl(V(FISH.x + 0.7, hy(FISH.x, FISH.z, 1.4), FISH.z + 2.4), V(FISH.x + 0.8, hy(FISH.x, FISH.z, 1.5), FISH.z + 1.9), k); cam.tgt = V(0, 4, -190); cam.fov = lerp(45, 30, k); }
    else if (lt < c2) { const k = (lt - c1) / (c2 - c1); cam.pos = V(FISH.x, 2.5, FISH.z - 3); cam.tgt = V(-6, 6.5, -185); cam.fov = lerp(16, 13, k); }
    else { const k = ease(clamp((lt - c2) / (g.dur - c2))); cam.pos = vl(V(FISH.x + 4.2, hy(FISH.x, FISH.z, 1.3), FISH.z + 0.6), V(FISH.x + 3.4, hy(FISH.x, FISH.z, 1.1), FISH.z + 1.2), k); cam.tgt = V(FISH.x - 1.0, hy(FISH.x, FISH.z, 0.8), FISH.z - 1.6); cam.fov = 46; hp.eyesWide = true; hp.brow = 1; hp.smile = 0; hp.look = [0.5, 0.2]; hp.armR = A.hold; if (lt > g.dur - 1.0) { hp.ry = Math.PI - 0.6; hp.look = [0.8, 0]; } }
  } else if (n === 'ficha') {
    const cRun = capAt('correr', g.start) - g.start, cWhere = capAt('pra onde', g.start) - g.start;
    hp = { x: FISH.x, z: FISH.z, ry: Math.PI + 0.1, fish: true, nut: false, eyesWide: true, brow: 1, smile: 0, shout: 0, wob: lt < cRun ? 0.35 : 0, armL: A.rest, armR: A.hold };
    if (lt < cRun) {
      const k = ease(clamp(lt / cRun)); const fov = lerp(20, 70, k); const d = 0.8 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
      const c = V(FISH.x, hy(FISH.x, FISH.z, 1.15), FISH.z); cam.pos = c.clone().add(V(0.1, 0.05, -1).normalize().multiplyScalar(d)); cam.tgt = c; cam.fov = fov;
    } else if (lt < cWhere) {
      hp.ry = 0.0; hp.run = 1; hp.phase = lt * 14; hp.shout = 0.6; hp.armL = A.up; hp.armR = A.up; hp.z = FISH.z + (lt - cRun) * 0.6;
      cam.pos = V(FISH.x + 3.5, hy(FISH.x, FISH.z, 1.3), FISH.z + 4.0); cam.tgt = V(FISH.x, hy(FISH.x, FISH.z, 0.9), FISH.z + 1); cam.fov = 45;
    } else {
      hp.z = FISH.z + (cWhere - cRun) * 0.6; hp.ry = Math.sin((lt - cWhere) * 7) * 1.1; hp.run = 0.5; hp.phase = lt * 16; hp.armL = A.shrug; hp.armR = A.shrug; hp.fish = false;
      hp.look = [Math.sin((lt - cWhere) * 7), 0];
      cam.pos = V(FISH.x + 0.4, hy(FISH.x, FISH.z, 1.5), FISH.z + 7.0); cam.tgt = V(FISH.x, hy(FISH.x, FISH.z, 1.1), FISH.z + 1.5); cam.fov = 40;
    }
  } else if (n === 'answer') {
    const cT = capAt('toalha', g.start) - g.start, cP = capAt('placas', g.start) - g.start, cF = capAt('peixes', g.start) - g.start;
    const keys = [[0, 0.03], [cT + 0.4, U_TOWEL], [cP + 0.6, U_SIGN], [g.dur, 1]];
    let u = 0; for (let i = 0; i < keys.length - 1; i++) if (lt >= keys[i][0] && lt <= keys[i + 1][0]) u = lerp(keys[i][1], keys[i + 1][1], (lt - keys[i][0]) / (keys[i + 1][0] - keys[i][0]));
    if (lt > g.dur) u = 1;
    const pp = onPath(heroPath, u); heroU = u;
    hp = { x: pp.x, z: pp.z, ry: pp.ry, run: 1, phase: lt * 14, eyesWide: true, brow: 0.8, smile: 0, fish: lt < cF + 0.4, nut: false, shout: 0.3 };
    if (lt > cF && lt < cF + 0.6) { hp.armR = A.pointUp; }
    const hpos = V(pp.x, terrainH(pp.x, pp.z), pp.z);
    if (lt < cT - 0.1) { cam.pos = V(11, 2.5, 3); cam.tgt = hpos.clone().add(V(0, 1, 0)); cam.fov = 40; }
    else if (lt < cP) { cam.pos = V(-1.5, 1.2, 4.0); cam.tgt = hpos.clone().add(V(0, 0.9, 0)); cam.fov = 48; }
    else if (lt < cP + 2.2) { cam.pos = V(-0.5, 1.8, 9.0); cam.tgt = V(-6, 2, 14); cam.fov = 50; }
    else { cam.pos = hpos.clone().add(V(8, 4.5, -6)); cam.tgt = hpos.clone().add(V(0, 1, 0)); cam.fov = 45; }
  } else if (n === 'building') {
    hp = { x: TOP.x, z: TOP.z, ry: Math.PI + 0.6, armL: A.rest, armR: A.rest, nut: false };
    const cA = capAt('terceiro', g.start) - g.start, cC = capAt('carro', g.start) - g.start;
    const u = ss(0, cA, lt);
    if (lt < cA) { const q = onPath(neighPath, u); np = { x: q.x, z: q.z, ry: q.ry, run: 1, phase: lt * 14, armL: A.up, armR: A.up, eyesWide: true, brow: 0.9, shout: 0.5, visible: u < 0.99 }; cam.pos = vl(V(4, 2.5, 9), V(6, 3.5, 11), p); cam.tgt = V(q.x, 1.5, q.z); cam.fov = 48; }
    else if (lt < cC) { np = { x: ROOF.x, z: ROOF.z, y: BTOP, ry: Math.PI + 0.15, armL: A.wave, armR: A.rest, smile: 1, visible: true }; const k = ease(clamp((lt - cA) / (cC - cA))); cam.pos = vl(V(10, 4, 9), V(9, 10, 8), k); cam.tgt = vl(V(bp.x, 5, bp.z - 4), V(ROOF.x, BTOP + 0.5, ROOF.z), k); cam.fov = 46; }
    else { np = { x: ROOF.x, z: ROOF.z, y: BTOP, ry: Math.PI, visible: true }; const k = clamp((lt - cC) / (g.dur - cC)); cam.pos = vl(V(-6, 1.4, 15), V(-5, 1.6, 15.5), k); cam.tgt = V(8, 0.8, 18); cam.fov = 40; }
  } else if (n === 'hit') {
    hp = { x: TOP.x, z: TOP.z, ry: Math.PI * 0.75 + 0.2, armL: A.up, armR: A.up, eyesWide: true, brow: 0.9, shout: 0.4, nut: false };
    np = { x: ROOF.x, z: ROOF.z, y: BTOP, ry: Math.PI + 0.15, armL: A.up, armR: A.up, eyesWide: true, brow: 0.9, visible: true };
    const zf = front(wt);
    if (lt < 3.05) { cam.pos = V(3, 1.4, 14); cam.tgt = vl(V(0, 3, -40), V(0, 6, -10), ss(0.5, 3.0, lt)); cam.fov = 60; shake = 0.4 * ss(1.0, 3.0, lt); }
    else if (lt < 9.5) { const k = ss(3.05, 9.5, lt); cam.pos = vl(V(-22, 20, 42), V(-24, 21, 43), k); cam.tgt = V(-2, 1, 8); cam.fov = 58; shake = 0.4 * Math.exp(-Math.pow((zf - 20) / 25, 2)); }
    else { const k = ss(9.5, g.dur, lt); cam.pos = vl(V(8, 8, 10), V(7, 9.5, 9), k); cam.tgt = V(bp.x, BTOP - 2, bp.z); cam.fov = 50; }
    flash = Math.exp(-Math.pow((lt - 3.05) / 0.12, 2)) * 0.6;
  } else if (n === 'safe') {
    const cB = capAt('comemore', g.start) - g.start, cW = capAt('várias', g.start) - g.start, cS = capAt('desça', g.start) - g.start;
    const ty = terrainH(TOP.x, TOP.z);
    hp = { x: TOP.x, z: TOP.z, ry: Math.PI * 0.75 + 0.2, armL: A.rest, armR: A.rest, nut: false, bob: Math.sin(lt * 2.2) * 0.03, smile: 1, squint: lt < cB ? 0.6 : 0 };
    np = { x: ROOF.x, z: ROOF.z, y: BTOP, ry: Math.PI, visible: true };
    if (lt < cB) { cam.pos = V(TOP.x + 2.2, ty + 1.5, TOP.z - 2.6); cam.tgt = V(TOP.x, ty + 1.0, TOP.z); cam.fov = 40; }
    else if (lt < cS) { hp.smile = 0; hp.brow = 0.6; hp.eyesWide = true; hp.armR = A.pointUp; const k = clamp((lt - cB) / (cS - cB)); cam.pos = vl(V(TOP.x + 6, ty + 4, TOP.z - 8), V(TOP.x + 9, ty + 3, TOP.z - 12), k); cam.tgt = vl(V(TOP.x, ty + 1, TOP.z), V(-5, 1, -5), ss(0, 0.3, k)); cam.fov = 55; }
    else { hp.legs = 'sit'; hp.armL = A.knee; hp.armR = A.knee; hp.brow = 0.2; cam.pos = V(TOP.x + 3.2, ty + 2.2, TOP.z - 4.2); cam.tgt = V(TOP.x - 0.5, ty + 0.6, TOP.z + 1); cam.fov = 45; }
  } else if (n === 'q1') {
    const ty = terrainH(TOP.x, TOP.z);
    hp = { x: TOP.x, z: TOP.z, ry: Math.PI * 0.75 + 0.2, armR: A.thumb, armL: A.hips, shades: true, smile: 1, nut: false, brow: -0.2 };
    cam.pos = vl(V(TOP.x + 2.3, ty + 1.2, TOP.z - 2.6), V(TOP.x + 1.9, ty + 1.1, TOP.z - 2.1), p); cam.tgt = V(TOP.x, ty + 1.05, TOP.z); cam.fov = 42;
  } else if (n === 'q2' || n === 'q3' || n === 'swallow') {
    hp.visible = false;
    tp = { x: TOWEL.x, z: TOWEL.z, ry: Math.PI - 0.35, legs: 'sit', lean: -0.85, sitY: 0.5, armL: A.relax, armR: A.relax, shades: true, smile: 1, mouth: tm, visible: t < TSW + 0.05 };
    if (n === 'q2') { cam.pos = vl(V(5.2, 1.6, 11.2), V(4.8, 1.4, 10.8), p); cam.tgt = V(TOWEL.x - 0.9, 0.7, TOWEL.z - 0.4); cam.fov = 44; }
    else if (n === 'q3') { cam.pos = vl(V(4.4, 1.0, 10.0), V(4.2, 0.9, 9.6), p); cam.tgt = vl(V(TOWEL.x - 0.8, 0.8, TOWEL.z + 0.4), V(TOWEL.x - 0.8, 2.2, TOWEL.z - 2.6), p); cam.fov = 50; }
    else {
      if (t < TSW + 0.1) { cam.pos = V(4.2, 0.9, 9.6); cam.tgt = V(TOWEL.x - 0.8, 3.5, TOWEL.z - 3.5); cam.fov = 56; shake = 0.6 * ss(TSW - 0.8, TSW, t); if (t > TSW - 0.35) { tp.shades = false; tp.eyesWide = true; tp.brow = 1; tp.shout = 0.7; tp.smile = 0; tp.armL = A.up; tp.armR = A.up; } }
      else { const k = ss(TSW + 0.1, TE('swallow'), t); const cx = TOWEL.x + 1.5 + (t - TSW) * 0.8, cz = TOWEL.z + 2 + (t - TSW) * 1.2; cam.pos = vl(V(cx + 3, 7, cz + 5), V(cx + 2, 5.5, cz + 3.5), k); cam.tgt = V(cx + 0.5, 3.3, cz - 0.3); cam.fov = 45; }
    }
  } else if (n === 'end') {
    hp = Object.assign({}, sunbathe, { armL: A.wave, armR: A.hold });
    cam.pos = vl(V(4.2, 1.5, 2.4), V(8, 6, -8), ease(p)); cam.tgt = V(2.6, 1.0, 6.4); cam.fov = 45;
  }
  // ----- surfer: surfs, runs away with the hero, survives with him (and gets swallowed in the gag)
  {
    const sf = surferAt(wt); const sway = Math.sin(t * 2.3);
    const carryArm = [0.35, 0.45, -0.5];
    const HS = { x: TOP.x - 1.15, z: TOP.z - 0.95 }, HRY = Math.PI * 0.75 + 0.2;
    const SUN2 = { x: TOWEL.x - 1.5, z: TOWEL.z + 1.1 };
    let sp = { visible: false, x: 0, z: 0 }, bm = 'hide';
    if (sf.on && n !== 'end') {
      const y = waterH(sf.x, sf.z, wt) + 0.06;
      sp = { x: sf.x, z: sf.z, y, ry: 0.15, legs: 'crouch', armL: [0.25, 1.35 + 0.2 * sway, -0.35], armR: [0.35, 1.25 - 0.2 * sway, -0.4], tilt: 0.12 * sway, smile: 1, mouth: 0.25, look: [-0.6, 0] }; bm = 'surf';
    } else if (n === 'horizon') {
      const u = clamp(lt / (g.dur - 0.7)); const x = lerp(2.4, FISH.x - 0.6, u), z = lerp(-15, FISH.z - 2.4, u);
      sp = u < 1 ? { x, z, ry: 0.12, run: 1, phase: lt * 14, armL: carryArm, armR: A.up, eyesWide: true, brow: 0.9, shout: 0.6, smile: 0 }
                 : { x, z, ry: 0.5, armL: carryArm, armR: [1.4, 0.2, -0.1], eyesWide: true, brow: 0.9, shout: 0.5, smile: 0, look: [-0.6, 0] };
      bm = 'carry';
    } else if (n === 'ficha') {
      const cRun = capAt('correr', g.start) - g.start, cWhere = capAt('pra onde', g.start) - g.start;
      const bx = FISH.x - 1.6, bz = FISH.z + 0.3;
      if (lt < cRun) sp = { x: bx, z: bz, ry: Math.PI + 0.25, armL: carryArm, armR: A.rest, eyesWide: true, brow: 1, smile: 0, wob: 0.3 };
      else if (lt < cWhere) sp = { x: bx, z: bz + (lt - cRun) * 0.6, ry: 0, run: 1, phase: lt * 14 + 1, armL: carryArm, eyesWide: true, brow: 1, shout: 0.6, smile: 0 };
      else sp = { x: bx, z: bz + (cWhere - cRun) * 0.6, ry: -Math.sin((lt - cWhere) * 7 + 1) * 1.1, run: 0.5, phase: lt * 16, armL: carryArm, armR: A.shrug, eyesWide: true, brow: 1, smile: 0, look: [-Math.sin((lt - cWhere) * 7), 0] };
      bm = 'carry';
    } else if (n === 'answer') {
      const u = Math.max(0, heroU - 0.04); const pp = onPath(heroPath, u);
      const nx = Math.cos(pp.ry), nz = -Math.sin(pp.ry); // sideways offset
      let x = pp.x + nx * 0.9, z = pp.z + nz * 0.9; const k = ss(0.88, 1.0, heroU);
      x = lerp(x, HS.x, k); z = lerp(z, HS.z, k);
      sp = { x, z, ry: pp.ry, run: k < 1 ? 1 : 0, phase: lt * 14 + 1.5, armL: carryArm, eyesWide: true, brow: 0.8, shout: 0.3, smile: 0 }; bm = 'carry';
    } else if (n === 'building' || n === 'hit' || n === 'safe' || n === 'q1') {
      sp = { x: HS.x, z: HS.z, ry: HRY, armL: A.rest, armR: A.rest, smile: 1 }; bm = 'stand';
      if (n === 'hit') Object.assign(sp, { armL: A.up, armR: A.up, eyesWide: true, brow: 0.9, shout: 0.4, smile: 0 });
      if (n === 'safe') {
        const cB = capAt('comemore', g.start) - g.start, cS = capAt('desça', g.start) - g.start;
        if (lt >= cB && lt < cS) Object.assign(sp, { eyesWide: true, brow: 0.6, smile: 0, armR: A.pointUp });
        if (lt >= cS) Object.assign(sp, { legs: 'sit', armL: A.knee, armR: A.knee });
        sp.bob = Math.sin(lt * 2.2 + 1) * 0.03;
      }
      if (n === 'q1') Object.assign(sp, { armR: A.thumb, armL: A.hips, shades: true, brow: -0.2 });
    } else if (n === 'q2' || n === 'q3' || n === 'swallow') {
      sp = { x: SUN2.x, z: SUN2.z, ry: Math.PI - 0.35, legs: 'sit', lean: -0.85, sitY: 0.5, armL: A.relax, armR: A.relax, shades: true, smile: 1, visible: t < TSW + 0.05 };
      if (n === 'swallow' && t > TSW - 0.35) Object.assign(sp, { shades: false, eyesWide: true, brow: 1, shout: 0.7, smile: 0, armL: A.up, armR: A.up });
      bm = t < TSW + 0.05 ? 'lie' : 'float';
    } else if (n === 'end') {
      sp = { x: TOWEL.x - 1.7, z: TOWEL.z - 0.3, ry: Math.PI - 0.35, legs: 'sit', lean: -0.55, sitY: 0.55, armL: A.relax, armR: A.thumb, shades: true, smile: 1 }; bm = 'stand';
    }
    surferBean.pose(t, sp);
    // board
    board.visible = bm !== 'hide';
    if (bm === 'carry') {
      const el = surferBean.arms[0].el; if (board.parent !== el) el.add(board);
      board.position.set(-0.13, -0.5, 0.05); board.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0)));
    } else {
      if (board.parent !== scene) scene.add(board);
      if (bm === 'surf') { const y = waterH(sf.x, sf.z, wt) + 0.08; board.position.set(sf.x, y, sf.z); board.rotation.set(0, 0.15, 0.08 * sway - 0.05); }
      else if (bm === 'stand') { const bx = sp.x - 0.75, bz = sp.z + 0.5; board.position.set(bx, terrainH(bx, bz) + 0.85, bz); board.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 1, 0), V(1, 0, 0), V(0, 0, -1))); board.rotateX(0.5); }
      else if (bm === 'lie') { board.position.set(sp.x, terrainH(sp.x, sp.z) + 0.05, sp.z - 0.2); board.rotation.set(0, Math.PI - 0.35 + Math.PI / 2, 0); }
      else if (bm === 'float') { const k = t - TSW; const x = TOWEL.x - 0.5 + k * 0.7, z = TOWEL.z + 3 + k * 1.1; board.position.set(x, waterH(x, z, wt) + 0.08, z); board.rotation.set(Math.sin(t * 1.7) * 0.12, k * 0.5, Math.sin(t * 2.1) * 0.1); }
    }
  }
  hero.pose(t, hp); tourist.pose(t, tp); neighbor.pose(t, np);
  // floating cap after the gag
  const after = (n === 'swallow' && t > TSW + 0.1);
  capF.visible = shadesF.visible = after;
  if (after) {
    const k = t - TSW; const x = TOWEL.x + 1.5 + k * 0.8, z = TOWEL.z + 2 + k * 1.2; const lvl = waterH(x, z, wt);
    capF.position.set(x, lvl + 0.05, z); capF.rotation.set(Math.sin(t * 2) * 0.3 + Math.PI, t, 0);
    shadesF.position.set(x + 1.2, lvl + 0.05, z - 0.8); shadesF.rotation.set(0, t * 0.7, Math.sin(t * 3) * 0.2);
  }
  const sh = shake * 0.12;
  cam.pos.add(V(Math.sin(t * 47) * sh, Math.sin(t * 61) * sh, Math.sin(t * 53) * sh));
  camera.position.copy(cam.pos); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.lookAt(cam.tgt);
  const focus = cam.tgt.clone(); focus.y = 0; focus.z = clamp(focus.z, -40, 45); focus.x = clamp(focus.x, -45, 40);
  sun.target.position.copy(focus); sun.position.copy(focus).add(V(40, 70, -30));
  return g;
}

// ---------- world animation ----------
function world(t, wt, endScene) {
  const zf = front(wt);
  palms.forEach(pl => {
    const top = pl.userData.top; const wind = 0.04 * Math.sin(wt * 1.3 + pl.userData.ph);
    pl.rotation.x = wind;
    const hit = zf > -300 ? ss(pl.position.z - 2, pl.position.z + 8, zf) : 0;
    pl.rotation.z = hit * 0.25;
    top.children.forEach((h, i) => h.rotation.z = 0.05 * Math.sin(wt * 2 + i + pl.userData.ph) + hit * 0.2 * Math.sin(wt * 5 + i));
  });
  floaters.forEach((o, i) => {
    const home = o.userData.home; const hitT = zf - home.z;
    if (zf > -300 && hitT > 0) {
      const lvl = waterH(home.x, home.z, wt);
      const drift = Math.min(hitT, 45) * 0.45;
      o.position.set(home.x + drift * 0.3 + Math.sin(wt + i) * 0.5, Math.max(home.y, lvl + 0.1 - (o.userData.sink || 0)), home.z + drift);
      o.rotation.set(Math.sin(wt * 1.3 + i) * 0.4, wt * 0.25 * ((i % 3) + 1) + i, Math.cos(wt * 1.1 + i) * 0.4);
    } else { o.position.copy(home); o.rotation.set(0, o === umbrella ? 0 : (cars.includes(o) ? 0.05 : o.rotation.y), o === umbrella ? 0.1 : 0); }
  });
  towel.visible = zf < TOWEL.z;
  fishes.forEach((f, i) => {
    const { x, z, ph } = f.userData; const th = terrainH(x, z); const wl = waterH(x, z, wt);
    f.visible = wl < th + 0.05 && wt > T0('recede') + 3 && zf < z - 3;
    f.position.set(x, th + 0.12 + Math.abs(Math.sin(wt * 6 + ph)) * 0.25, z); f.rotation.set(Math.PI / 2 - 0.2, ph, Math.sin(wt * 12 + ph) * 0.8);
  });
  updateGulls(wt, t);
  const dark = endScene ? 0 : ss(T0('horizon'), T0('horizon') + 6, wt) * (1 - 0.6 * ss(T0('safe') + 4, TE('safe'), wt));
  const eve = endScene ? 0.9 : 0;
  skyU.top.value.set(0x2f7fd8).lerp(new THREE.Color(0x3b5aa8), eve).lerp(new THREE.Color(0x4a5a6a), dark * 0.6);
  skyU.bot.value.set(0xbfe6ff).lerp(new THREE.Color(0xffc48a), eve).lerp(new THREE.Color(0x9aa8b0), dark * 0.6);
  scene.fog.color.copy(skyU.bot.value);
  sun.intensity = lerp(2.6, 1.5, dark); sun.color.set(0xfff1d6).lerp(new THREE.Color(0xffb070), eve);
  hemi.intensity = lerp(0.9, 0.7, dark);
  clouds.position.x = t * 0.6;
  updateWater(wt); updateSpray(wt);
}

// ---------- 2D overlay ----------
const ui = document.getElementById('ui').getContext('2d');
function rr(x, y, w, h, r) { ui.beginPath(); ui.roundRect(x, y, w, h, r); }
function outlined(text, x, y, size, fill = '#fff', stroke = '#1b1b1b', weight = 900, lw = 0.16) {
  ui.font = `${weight} ${size}px "Inter Display", Inter, "DejaVu Sans", sans-serif`; ui.lineJoin = 'round';
  ui.lineWidth = size * lw; ui.strokeStyle = stroke; ui.strokeText(text, x, y); ui.fillStyle = fill; ui.fillText(text, x, y);
}
const HL = ['tsunami', 'dez metros', 'correr', 'pra onde', 'pra cima', 'longe do mar', 'rota de fuga', 'terceiro andar', 'várias ondas', 'autoridades', 'avião', 'paredão de água', 'de repente', 'peixe', 'terremoto', 'nem pensar', 'carros', 'árvores', 'último aviso', 'freia', 'cresce', 'tomando sol', 'morro', 'prédio alto', 'resistente', 'densa', 'forte'];
function caption(t) {
  const c = TL.caps.find(c => t >= c.t0 && t < c.t1 + 0.12);
  if (!c) return;
  const age = t - c.t0; const a = ss(0, 0.12, age);
  const char = c.who !== 'narr';
  const size = char ? 44 : 42;
  ui.save(); ui.globalAlpha = a; ui.textBaseline = 'middle';
  ui.font = `900 ${size}px "Inter Display"`;
  // build segments with highlight
  const low = c.text.toLowerCase(); const marks = new Array(c.text.length).fill(false);
  HL.forEach(k => { let i = low.indexOf(k); while (i >= 0) { for (let j = i; j < i + k.length; j++) marks[j] = true; i = low.indexOf(k, i + 1); } });
  const tw = ui.measureText(c.text).width; const s = 1 + 0.08 * (1 - ss(0, 0.15, age));
  const y = 642;
  ui.translate(640, y); ui.scale(s, s);
  if (char) { ui.fillStyle = 'rgba(255,255,255,0.95)'; rr(-tw / 2 - 30, -38, tw + 60, 76, 38); ui.fill(); ui.beginPath(); ui.moveTo(-40, -36); ui.lineTo(-10, -36); ui.lineTo(-60, -70); ui.closePath(); ui.fill(); }
  let x = -tw / 2; let buf = '', cur = null;
  const flush = () => { if (!buf) return; if (char) { ui.fillStyle = '#1b1b1b'; ui.fillText(buf, x, 2); } else outlined(buf, x, 2, size, cur ? '#ffd23f' : '#ffffff', '#0a1428', 900, 0.2); x += ui.measureText(buf).width; buf = ''; };
  ui.font = `900 ${size}px "Inter Display"`;
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
function vignette(a) { if (a <= 0) return; const g = ui.createRadialGradient(640, 360, 200, 640, 360, 760); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${a})`); ui.fillStyle = g; ui.fillRect(0, 0, W, H); }

function diagram(t, g, mode) {
  const lt = t - g.start; const a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  if (a <= 0) return;
  ui.save(); ui.globalAlpha = a;
  const bg = ui.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#9fd8ff'); bg.addColorStop(0.42, '#e6f6ff'); bg.addColorStop(0.42, '#0d2a4a'); bg.addColorStop(1, '#071629'); ui.fillStyle = bg; ui.fillRect(0, 0, W, H);
  ui.fillStyle = '#9fd8ff'; ui.fillRect(0, 0, W, 300);
  const seaY = 300, X0 = 0, X1 = 1280;
  const floorY = x => x < 760 ? 580 : x < 1060 ? lerp(580, seaY + 4, (x - 760) / 300) : lerp(seaY + 4, 262, clamp((x - 1060) / 180));
  // wave state
  let xc = 330, amp = 0, wd = 90, trough = 0, lift = 0, sh = 0;
  const pE = capAt('oceano', g.start) - g.start, pT = capAt('alto-mar', g.start) - g.start, pG = capAt('costa', g.start) - g.start;
  if (mode === 'explain') {
    lift = 26 * ss(pE + 0.3, pE + 0.8, lt); sh = (lt > pE + 0.3 && lt < pE + 1.6) ? Math.sin(lt * 70) * 4 : 0;
    amp = 18 * ss(pE + 0.5, pE + 1.3, lt);
    if (lt > pT) xc = lerp(330, 760, ss(pT, pG, lt));
    if (lt > pG) { const k = 1 - Math.pow(1 - clamp((lt - pG) / (g.dur - pG - 0.8)), 2); xc = lerp(760, 985, k); amp = lerp(18, 190, k); wd = lerp(90, 42, k); trough = lerp(0, 25, k); }
  } else { const k = ss(0.3, g.dur - 1, lt); xc = lerp(860, 900, k); amp = 120; wd = 55; trough = lerp(10, 70, k); }
  const surf = x => { const d = (x - xc) / wd; let y = seaY - amp * Math.exp(-d * d); y += trough * Math.exp(-Math.pow((x - (xc + wd * 2.4)) / (wd * 1.6), 2)); return y; };
  // water
  ui.beginPath(); ui.moveTo(X0, surf(X0));
  for (let x = X0; x <= X1; x += 4) ui.lineTo(x, Math.min(surf(x), floorY(x)));
  for (let x = X1; x >= X0; x -= 4) ui.lineTo(x, floorY(x));
  ui.closePath(); const wgr = ui.createLinearGradient(0, 100, 0, 580); wgr.addColorStop(0, '#3fc6e0'); wgr.addColorStop(1, '#0b4f8a'); ui.fillStyle = wgr; ui.fill();
  ui.strokeStyle = '#ffffff'; ui.lineWidth = 4; ui.beginPath(); for (let x = X0; x <= X1; x += 4) { const y = surf(x); if (y < floorY(x)) ui.lineTo(x, y); else ui.moveTo(x, floorY(x)); } ui.stroke();
  // seafloor
  ui.beginPath(); ui.moveTo(X0, H); for (let x = X0; x <= X1; x += 4) { let y = floorY(x); if (x > 240 && x < 420) y -= lift; ui.lineTo(x + (x > 240 && x < 420 ? sh : 0), y); } ui.lineTo(X1, H); ui.closePath(); ui.fillStyle = '#c9a36a'; ui.fill(); ui.strokeStyle = '#8a6a40'; ui.lineWidth = 3; ui.stroke();
  // fault crack
  if (mode === 'explain' && lt > pE) { ui.strokeStyle = '#e8443a'; ui.lineWidth = 5; ui.beginPath(); ui.moveTo(330, 590 - lift); ui.lineTo(322, 610); ui.lineTo(334, 618); ui.stroke(); }
  // land + little bean & palm
  ui.fillStyle = '#7bb24a'; ui.beginPath(); ui.moveTo(1150, 270); ui.lineTo(X1, 262); ui.lineTo(X1, 300); ui.lineTo(1150, 300); ui.fill();
  ui.fillStyle = '#7a4421'; ui.beginPath(); ui.ellipse(1105, 268, 7, 10, 0, 0, Math.PI * 2); ui.fill();
  ui.strokeStyle = '#8a6a45'; ui.lineWidth = 4; ui.beginPath(); ui.moveTo(1190, 268); ui.quadraticCurveTo(1195, 230, 1185, 205); ui.stroke(); ui.fillStyle = '#3f8f2f'; ui.beginPath(); ui.ellipse(1185, 203, 22, 7, 0.3, 0, Math.PI * 2); ui.fill();
  ui.textAlign = 'center'; ui.textBaseline = 'middle';
  if (mode === 'explain') {
    if (lt < pE) { // "not a surf wave"
      ui.save(); ui.translate(640, 150); const s = pop(lt - 0.3); ui.scale(s, s);
      ui.fillStyle = '#1a8fb5'; ui.beginPath(); ui.moveTo(-120, 60); ui.bezierCurveTo(-60, 60, -40, -70, 40, -60); ui.bezierCurveTo(90, -55, 100, -10, 70, 0); ui.bezierCurveTo(60, -30, 20, -30, 10, 0); ui.bezierCurveTo(0, 30, 40, 60, 120, 60); ui.closePath(); ui.fill();
      ui.fillStyle = '#ffd23f'; ui.save(); ui.translate(-20, 10); ui.rotate(-0.5); ui.beginPath(); ui.ellipse(0, 0, 40, 8, 0, 0, Math.PI * 2); ui.fill(); ui.restore();
      if (lt > 1.0) { ui.strokeStyle = '#e8262a'; ui.lineWidth = 16; ui.lineCap = 'round'; ui.beginPath(); ui.moveTo(-110, -80); ui.lineTo(110, 80); ui.moveTo(110, -80); ui.lineTo(-110, 80); ui.stroke(); }
      ui.restore(); outlined('NÃO é onda de surfe!', 640, 260, 34, '#ffffff', '#0a1428', 900, 0.2);
    }
    if (lt > pE + 0.3) { const k = ss(pE + 0.3, pE + 0.7, lt) * (1 - ss(pT - 0.2, pT, lt)); ui.globalAlpha = a * k; outlined('TERREMOTO NO FUNDO DO MAR', 360, 500, 30, '#ffd23f', '#0a1428', 900, 0.2); outlined('empurra o oceano pra cima ↑', 330, 360, 24, '#ffffff', '#0a1428', 800, 0.2); ui.globalAlpha = a; }
    if (lt > pT) { const k = ss(pT, pT + 0.4, lt) * (1 - ss(pG - 0.2, pG, lt)); ui.globalAlpha = a * k; outlined('✈  ~800 km/h', xc, 220, 40, '#ffffff', '#0a1428', 900, 0.2); outlined('quase invisível em alto-mar', xc, 262, 24, '#ffd23f', '#0a1428', 800, 0.2); ui.globalAlpha = a; }
    if (lt > pG) { const k = ss(pG, pG + 0.4, lt); ui.globalAlpha = a * k; outlined('Perto da costa: FREIA e CRESCE', 640, 60, 40, '#ffffff', '#0a1428', 900, 0.2); outlined('10+ m', xc - 95, seaY - amp * 0.6, 34, '#ffd23f', '#0a1428', 900, 0.2); ui.globalAlpha = a; }
  } else {
    outlined('O mar recua ANTES da onda chegar', 640, 60, 40, '#ffffff', '#0a1428', 900, 0.2);
    const k = ss(0.8, 2.0, lt); ui.globalAlpha = a * k;
    ui.strokeStyle = '#ffd23f'; ui.lineWidth = 8; ui.lineCap = 'round'; const ax = 1080; ui.beginPath(); ui.moveTo(ax, 340); ui.lineTo(ax - 120, 340); ui.moveTo(ax - 120, 340); ui.lineTo(ax - 95, 322); ui.moveTo(ax - 120, 340); ui.lineTo(ax - 95, 358); ui.stroke();
    outlined('água puxada', ax - 60, 385, 26, '#ffd23f', '#0a1428', 900, 0.2);
    outlined('ÚLTIMO AVISO!', 640, 470, 46, '#ff6b5a', '#0a1428', 900, 0.2);
    ui.fillStyle = '#ff8a2a'; for (let i = 0; i < 4; i++) { ui.beginPath(); ui.ellipse(1000 + i * 16, floorY(1000 + i * 16) - 4 - Math.abs(Math.sin(lt * 8 + i)) * 6, 7, 4, 0, 0, Math.PI * 2); ui.fill(); }
  }
  ui.restore();
}

function overlay(t, g, wt) {
  ui.clearRect(0, 0, W, H);
  const lt = t - g.start, n = g.scene;
  const fadeIn = ss(0, 0.3, lt);
  if (n === 'twist') vignette(0.75 * ss(0.5, g.dur, lt));
  if (n === 'ficha') vignette(0.6);
  if (n === 'explain') diagram(t, g, 'explain');
  if (n === 'retreat') diagram(t, g, 'retreat');
  if (n === 'title') {
    if (lt > 0.6) {
      const s = pop(lt - 0.6, 0.5);
      ui.save(); ui.translate(640, 300); ui.scale(s, s); ui.rotate(-0.02); ui.textAlign = 'center'; ui.textBaseline = 'middle';
      ui.globalAlpha = 1 - ss(g.dur - 0.6, g.dur, lt);
      outlined('Você sobreviveria', 0, -55, 72, '#ffffff', '#0a2a4a', 900, 0.18);
      outlined('a um TSUNAMI?', 0, 45, 108, '#ffd23f', '#0a2a4a', 900, 0.18);
      ui.restore();
    }
    ui.save(); ui.globalAlpha = ss(0, 1, lt) * (1 - ss(g.dur - 0.6, g.dur, lt)); ui.textAlign = 'center'; outlined('GUIA DE SOBREVIVÊNCIA  •  EPISÓDIO 1', 640, 110, 26, '#ffffff', '#0a2a4a', 800, 0.2); ui.restore();
  }
  if (n === 'horizon') {
    const c1 = capAt('dez metros', g.start) - g.start, c2 = capAt('densa', g.start) - g.start;
    if (lt > c1 && lt < c2) {
      // measure the wave on screen
      const zf = front(wt); const crestY = waterH(-6, zf - 3, wt);
      const top = V(-6, crestY, zf - 3).project(camera), base = V(-6, seaBase(wt), zf - 1).project(camera);
      const x = (top.x * 0.5 + 0.5) * W + 180, y0 = (-base.y * 0.5 + 0.5) * H, y1 = (-top.y * 0.5 + 0.5) * H;
      const k = ss(c1, c1 + 0.5, lt); const yy = lerp(y0, y1, k);
      ui.save(); ui.strokeStyle = '#ffd23f'; ui.lineWidth = 6; ui.beginPath(); ui.moveTo(x, y0); ui.lineTo(x, yy); ui.moveTo(x - 18, y0); ui.lineTo(x + 18, y0); ui.moveTo(x - 18, yy); ui.lineTo(x + 18, yy); ui.stroke();
      ui.textAlign = 'left'; ui.textBaseline = 'middle'; outlined('+10 metros', x + 28, (y0 + yy) / 2, 44, '#ffd23f', '#0a1428', 900, 0.2); ui.restore();
    }
  }
  if (n === 'ficha') {
    const cW = capAt('pra onde', g.start) - g.start;
    if (lt > cW) {
      const k = lt - cW;
      const hw = new THREE.Vector3(); hero.body.getWorldPosition(hw); hw.y += 0.75; const sp = hw.project(camera);
      const hx = (sp.x * 0.5 + 0.5) * W, hy = clamp((-sp.y * 0.5 + 0.5) * H, 300, 420);
      // purple "confusion" tint pulsing
      const tint = ui.createRadialGradient(hx, hy, 50, hx, hy, 700); tint.addColorStop(0, 'rgba(120,60,200,0)'); tint.addColorStop(1, `rgba(70,20,140,${0.35 + 0.1 * Math.sin(k * 8)})`);
      ui.fillStyle = tint; ui.fillRect(0, 0, W, H);
      ui.save(); ui.textAlign = 'center'; ui.textBaseline = 'middle';
      // dizzy spiral above the head
      ui.save(); ui.translate(hx, hy - 95); ui.strokeStyle = 'rgba(255,255,255,0.85)'; ui.lineWidth = 5; ui.lineCap = 'round'; ui.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.15) { const r = 4 + a * 6; ui.lineTo(Math.cos(a + k * 7) * r, Math.sin(a + k * 7) * r * 0.32); } ui.stroke(); ui.restore();
      // question marks orbiting the head
      const cols = ['#ffd23f', '#ff6b5a', '#5fd0ff', '#ffffff', '#b48bff', '#5ff08a'];
      for (let i = 0; i < 10; i++) {
        const t0 = i * 0.1; if (k < t0) continue;
        const a = i / 10 * Math.PI * 2 + k * 1.6; const rx = 250 + (i % 3) * 50, ry = 130 + (i % 2) * 40;
        const x = hx + Math.cos(a) * rx, y = hy + Math.sin(a) * ry + Math.sin(k * 5 + i) * 12;
        const sc = pop(k - t0, 0.25) * (0.8 + 0.2 * Math.sin(k * 7 + i));
        ui.save(); ui.translate(x, y); ui.scale(sc, sc); ui.rotate(Math.sin(k * 4 + i * 1.7) * 0.4);
        outlined('?', 0, 0, 70 + (i % 4) * 18, cols[i % cols.length], '#0a1428', 900, 0.18); ui.restore();
      }
      // small ? floating up and fading
      for (let i = 0; i < 8; i++) {
        const life = ((k * 0.8 + i / 8) % 1); const x = hx + (i - 3.5) * 70 + Math.sin(k * 3 + i) * 15, y = hy - 30 - life * 260;
        ui.save(); ui.globalAlpha = (1 - life) * ss(0, 0.3, k); outlined('?', x, y, 30, cols[(i + 2) % cols.length], '#0a1428', 900, 0.18); ui.restore();
      }
      const s = pop(k, 0.3); ui.translate(640, 110); ui.scale(s, s); ui.rotate(Math.sin(lt * 9) * 0.04);
      outlined('PRA ONDE?!', 0, 0, 100, '#ffd23f', '#0a1428', 900, 0.17);
      ui.restore();
    }
  }
  if (n === 'answer') badge('★ REGRA DE OURO: PRA CIMA E PRA LONGE', fadeIn, '#1e9e57');
  if (n === 'building') {
    badge('PLANO B: PRÉDIO ALTO', fadeIn, '#1557b0');
    const cA = capAt('terceiro', g.start) - g.start, cC = capAt('carro', g.start) - g.start;
    if (lt > cA && lt < cC) { ui.save(); ui.globalAlpha = ss(cA, cA + 0.3, lt); ui.textAlign = 'center'; outlined('3º ANDAR OU MAIS ↑', 900, 200, 44, '#ffffff', '#1557b0', 900, 0.2); ui.restore(); }
    if (lt > cC) { const bl = (Math.floor(lt * 4) % 2) ? 1 : 0.0; ui.save(); ui.textAlign = 'center'; ui.translate(860, 230); ui.rotate(-0.12); ui.scale(pop(lt - cC, 0.25), pop(lt - cC, 0.25)); outlined('BIIIIP!', 0, 0, 64, bl ? '#ffd23f' : '#ffffff', '#e8443a', 900, 0.2); ui.restore();
      ui.save(); ui.textAlign = 'center'; ui.translate(330, 300); ui.rotate(0.1); outlined('FOOOM!', 0, 0, 44, '#ffffff', '#0a1428', 900, 0.2); ui.restore(); }
  }
  if (n === 'safe') badge('✓ SEGURO NO ALTO', fadeIn, '#1e9e57');
  if (n === 'safe') { const cW = capAt('várias', g.start) - g.start; if (lt > cW && lt < cW + 3.5) { ui.save(); ui.globalAlpha = ss(cW, cW + 0.3, lt) * (1 - ss(cW + 3, cW + 3.5, lt)); ui.textAlign = 'center'; outlined('ONDA 2 a caminho...', 900, 210, 40, '#ffffff', '#e8443a', 900, 0.2); ui.restore(); } }
  if (n === 'q1') { ui.save(); ui.translate(940, 200); const s = pop(lt - 0.2); ui.scale(s, s); ui.rotate(0.05); ui.textAlign = 'center'; outlined('SOBREVIVER ✓', 0, 0, 54, '#5ff08a', '#0a1428', 900, 0.2); ui.restore(); }
  if (n === 'q2' || n === 'q3') { ui.save(); ui.translate(320, 200); const s = pop(t - T0('q2') - 0.2); ui.scale(s, s); ui.rotate(-0.05); ui.textAlign = 'center'; outlined('TOMAR SOL ☀', 0, 0, 54, '#ffd23f', '#0a1428', 900, 0.2); ui.restore(); }
  if (n === 'swallow' && t > TSW + 0.6) {
    const k = t - TSW - 0.6;
    ui.save(); ui.textAlign = 'center'; ui.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) { const a = ss(i * 0.45, i * 0.45 + 0.2, k); if (a <= 0) continue; ui.globalAlpha = a; outlined('glub', 560 + i * 90, 330 - i * 50 - k * 10, 34 + i * 6, '#ffffff', '#1557b0', 900, 0.2); }
    ui.restore();
  }
  if (n === 'end') {
    const a = ss(0.6, 1.2, lt);
    ui.save(); ui.globalAlpha = a; ui.textAlign = 'center'; ui.textBaseline = 'middle';
    ui.fillStyle = 'rgba(10,20,40,0.6)'; rr(340, 50, 600, 210, 30); ui.fill();
    outlined('PRÓXIMO EPISÓDIO', 640, 100, 34, '#ffffff', '#0a1428', 800, 0.15);
    ui.translate(640, 185); const s = pop(lt - 1.0, 0.4); ui.scale(s, s); ui.rotate(-0.03 + (lt > 1 ? Math.sin(lt * 20) * 0.01 : 0));
    outlined('TERREMOTO', 0, 0, 96, '#ff8a2a', '#0a1428', 900, 0.16); ui.restore();
  }
  if (n !== 'title' && n !== 'end') caption(t);
  if (flash > 0) { ui.fillStyle = `rgba(255,255,255,${flash})`; ui.fillRect(0, 0, W, H); }
  // cuts: quick dip at scene changes into/out of diagrams, fade in/out of video
  if (t < 0.5) { ui.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; ui.fillRect(0, 0, W, H); }
  const fo = ss(TL.total - 1.0, TL.total, t); if (fo > 0) { ui.fillStyle = `rgba(0,0,0,${fo})`; ui.fillRect(0, 0, W, H); }
}

window.renderFrame = (t) => {
  const g = seg(t); const wt = worldTime(t);
  world(t, wt, g.scene === 'end'); direct(t, wt); renderer.render(scene, camera); overlay(t, g, wt); return true;
};
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"'); await document.fonts.load('800 40px "Inter Display"');
window.READY = true;
