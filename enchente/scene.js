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
const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1200);

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
    this.popc.visible = !!p.popc; this.phone.visible = !!p.phone; this.soap.visible = !!p.soap; this.pack.visible = !!p.pack; this.peel.visible = !!p.peel;
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
const DOG_HILL = { x: TOP.x - 0.2, z: TOP.z - 1.6 };
// water's edge at the foot of the hill (for the electric-shock gag)
const EDGE = (() => { const dir = V(-6 - TOP.x, 0, 12 - TOP.z).normalize(); let p = V(TOP.x, 0, TOP.z); for (let i = 0; i < 400; i++) { p.addScaledVector(dir, 0.1); if (terrainH(p.x, p.z) < 1.3 + 0.45) break; } return { x: p.x, z: p.z, ry: Math.atan2(dir.x, dir.z), dir }; })();

// =====================================================================
//  EPISÓDIO 3 — ENCHENTE
// =====================================================================
const WORDS = await (await fetch('/audio/words.json')).json().catch(() => []);
const wordAt = (w, after) => { const x = WORDS.find(k => k.t0 >= after - 0.01 && k.text.toLowerCase().replace(/[^a-zà-ú]/g, '').startsWith(w)); return x ? x.t0 : after; };
const GAGN = ['q2', 'q3', 'q4', 'rise', 'ohoh', 'float'];
const APTN = ['home', 'calm', 'friend1', 'tv1', 'tv2', 'car1', 'stay1', 'stay2', 'stayrise', 'idea'];
function seg(t) { for (let i = TL.segs.length - 1; i >= 0; i--) if (t >= TL.segs[i].start) return TL.segs[i]; return TL.segs[0]; }

// ---------- key times ----------
const R0 = T0('rain') + 0.9;                                   // the downpour starts (thunder)
const W_RUA = wordAt('rua', T0('rain')), W_PORTA = wordAt('porta', T0('rain'));
const W_BOIAR = wordAt('boiar', T0('car2'));
const W_CERTO = wordAt('certo', T0('tv2')), W_ENERGIA = wordAt('energia', T0('tv2')), W_TOMADAS = wordAt('tomadas', T0('tv2'));
const W_SUBA = 1e9, W_NUNCA = 1e9, W_TUNEIS = 1e9, W_ARRANCAR = 1e9, W_BARRENTA = 1e9;
const W_TELHADO = wordAt('telhado', T0('high')), W_BUEIROS = wordAt('bueiros', T0('gag1b'));
const ASSIMS = ['tv2', 'high', 'wait2'].map(n => ({ n, t: wordAt('assim', T0(n)), txt: n === 'tv2' ? 'ASSIM, O CHOQUE NÃO CHEGA' : 'ASSIM, A ENCHENTE NÃO CHEGA' }));
const PLOFT = T0('gag2') + 1.95, POPUP = T0('gag2') + 2.9;
const W_SABAO = wordAt('sabão', T0('germs')), W_LAVE = wordAt('lave', T0('germs'));
const W_FIO = 1e9;
const BONK_T = T0('float') + 1.6;
const BOLTS = [R0, T0('friend1') + 0.2, T0('idea') - 0.6, T0('wait2') + 0.5];
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
const VS_TV = () => S.tv1.vstart + S.tv1.vdur - 0.3;
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
  const movieTex = canvasTex(512, 288, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff9a5a'); gr.addColorStop(1, '#ffd98a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(380, 120, 46, 0, Math.PI * 2); g.fill(); g.fillStyle = '#5a3b6e'; g.beginPath(); g.moveTo(0, 230); g.lineTo(120, 150); g.lineTo(230, 220); g.lineTo(330, 160); g.lineTo(512, 240); g.lineTo(512, 288); g.lineTo(0, 288); g.fill(); g.fillStyle = '#2b2140'; g.fillRect(150, 170, 14, 60); g.beginPath(); g.arc(157, 162, 12, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillRect(0, 0, w, 26); g.fillRect(0, h - 26, w, 26); });
  movieTexRef = movieTex;
  const tv = new THREE.Group(); tv.position.set(-1.0, 1.2, 2.95); apt.add(tv); aptParts.tv = tv;
  const tvBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.15, 0.1), std(0x16161a, { roughness: 0.4 })); tv.add(tvBody);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.02), new THREE.MeshBasicMaterial({ map: movieTex })); screen.position.z = -0.056; screen.rotation.y = Math.PI; tv.add(screen); aptParts.screen = screen;
  const tvLight = new THREE.PointLight(0xffb27a, 1.2, 6, 2); tvLight.position.set(-1.0, 1.2, 2.3); apt.add(tvLight); aptParts.tvLight = tvLight;
  // sturdy table with the emergency backpack on it
  const tabM = std(0x8a5a32, { roughness: 0.5 });
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 1.7), tabM); top.position.set(2.5, 1.5, -0.5); apt.add(top);
  for (const [x, z] of [[-1.15, -0.72], [1.15, -0.72], [-1.15, 0.72], [1.15, 0.72]]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 0.14), tabM); l.position.set(2.5 + x, 0.72, -0.5 + z); apt.add(l); }
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
  apt.traverse(m => { if (m.isMesh && m !== win) { m.castShadow = true; m.receiveShadow = true; } });
  aw.castShadow = puddle.castShadow = false;
  ceil.castShadow = back.castShadow = left.castShadow = right.castShadow = false;
}

// ---------- soft fill light for the house (so faces never go dark) ----------
const houseFill = new THREE.DirectionalLight(0xfff1e0, 0.9); houseFill.position.copy(AP(1.5, 4.5, 9)); houseFill.target.position.copy(AP(-0.5, 1.0, -1.5)); scene.add(houseFill); scene.add(houseFill.target);
const windowLight = new THREE.PointLight(0xcfe3ff, 0, 9, 1.4); windowLight.position.copy(AP(2.3, 2.1, -2.6)); scene.add(windowLight);
// ---------- water levels ----------
function aptLevel(t, n, lt) {   // water inside the house (the story, and the ending gag)
  if (GAGN.includes(n)) {
    if (n === 'q2') return 0.03; if (n === 'q3') return 0.06; if (n === 'q4') return lerp(0.08, 0.14, clamp(lt / S.q4.dur));
    if (n === 'rise') return lerp(0.14, 0.7, ease(clamp(lt / S.rise.dur)));
    if (n === 'ohoh') return 0.72;
    const k = t - T0('float'); return k < 1.6 ? lerp(0.72, 1.75, ss(0, 1.6, k)) : lerp(1.75, 2.5, ss(1.6, 3.4, k));
  }
  if (n === 'stayrise') return lerp(0.2, 0.95, ease(clamp(lt / S.stayrise.dur)));
  return 0.1 * ss(W_PORTA + 1.2, T0('friend1') + 1.2, t) + 0.1 * ss(T0('car1'), T0('stay2'), t);
}
function puddleR(t, n) { return GAGN.includes(n) ? 0 : 5 * ss(W_PORTA - 0.1, W_PORTA + 2.0, t); }
const SOFA_LIFT_MAX = 1.28;
const sofaLift = W => clamp(W - 0.42, 0, SOFA_LIFT_MAX);
let powerOff = false;
function updateHouse(t, n, lt) {
  const W = aptLevel(t, n, lt), gag = GAGN.includes(n);
  const aw = aptParts.water; aw.visible = W > 0.005; aw.scale.y = Math.max(W, 0.001); aw.position.set(0, W / 2, 0);
  aw.material.map.offset.set(t * 0.02, t * 0.013);
  const pr = puddleR(t, n); aptParts.puddle.visible = pr > 0.01 && W < 0.05; aptParts.puddle.scale.setScalar(Math.max(pr, 0.01)); aptParts.puddle.position.set(4.4 - Math.min(pr, 3) * 0.3, 0.008, 2.9 - Math.min(pr, 3) * 0.2);
  // the power switched off at the breaker (story only)
  powerOff = !gag && t > W_ENERGIA + 0.4;
  const news = !gag && t > VS_TV() && !powerOff; aptParts.screen.material.map = news ? newsTex : movieTexRef;
  aptParts.lever.position.y = powerOff ? -0.1 : 0.1;
  aptParts.lamp.intensity = powerOff ? 0 : 2.2; aptParts.bulb.material.color.setScalar(powerOff ? 0.3 : 1); aptParts.shade.material.emissiveIntensity = powerOff ? 0 : 0.35;
  aptParts.tvLight.intensity = powerOff ? 0 : 1.2;
  houseFill.visible = windowLight.visible = apt.visible; houseFill.intensity = powerOff ? 1.0 : 0.75; windowLight.intensity = powerOff ? 2.2 : 1.0; aptParts.screen.material.color.setScalar(powerOff ? 0.06 : 1);
  aptParts.packT.visible = true;
  // ending: the sofa and the TV float up
  const lift = gag ? sofaLift(W) : 0, bob = lift > 0 && lift < SOFA_LIFT_MAX ? 0.05 * Math.sin(t * 3) : 0;
  aptParts.sofa.position.set(-1.0, lift + bob, -2.75); aptParts.sofa.rotation.set(0, 0, lift > 0 ? 0.03 * Math.sin(t * 2.2) : 0);
  aptParts.chand.visible = !(gag && W > 1.0);
  const tvY = gag && W > 1.0 ? Math.min(W + 0.1, 3.15) : 1.2; aptParts.tv.position.set(-1.0, tvY, 2.95); aptParts.tv.rotation.set(0, 0, tvY > 1.2 ? 0.06 * Math.sin(t * 2) : 0);
  pops.forEach(c => { const u = c.userData; c.visible = gag && W > 0.3; if (c.visible) { c.position.set(u.x + 0.1 * Math.sin(t + u.ph), W + 0.03, u.z + 0.1 * Math.cos(t * 0.8 + u.ph)); c.rotation.set(t + u.ph, u.ph, 0); } });
  const storm = n === 'home' || n === 'calm' || (n === 'rain' && t < R0) || n === 'q2' ? 0.2 : 1;
  const outside = gag ? (n === 'float' ? 0.9 : n === 'rise' || n === 'ohoh' ? 0.7 : 0.25) : lerp(0, 0.35, ss(R0 + 1, TE('rain'), t)) + (t > TE('rain') ? 0.1 : 0);
  if (apt.visible) drawWindow(t, outside, storm);
  return { W, lift, bob };
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
function direct(t, n, lt, g, H) {
  const p = clamp(lt / g.dur);
  const hm = clamp(mouthOf(TL.heroMouth, REAL_T) * 1.4), fm = clamp(mouthOf(TL.friendMouth, REAL_T) * 1.4);
  let cam = { pos: V(0, 5, -10), tgt: V(0, 1, 5), fov: 45 };
  shake = 0; flash = 0;
  const watching = { legs: 'sit', sitY: 0.6, lean: -0.2, armL: [0.25, -0.5, -1.2], armR: A.rest, look: [0, -0.1] };
  const lift = H.lift + H.bob;
  let hp = Object.assign({ x: SOFA_H.x, y: SOFA_Y + lift, z: SOFA_H.z, ry: 0.15, smile: 1, nut: false }, watching, { armL: [0.9, 0.1, -1.6] });
  let fp = Object.assign({ x: SOFA_F.x, y: SOFA_Y + lift, z: SOFA_F.z, ry: -0.15, smile: 1 }, watching, { popc: true, armL: [0.35, 0.15, -1.05] });
  let dg = { mode: 'lie', x: AO.x - 0.4, y: AO.y + 0.02, z: AO.z - 0.1, ry: 0.6 };
  board.visible = false;
  setParent(hero, scene); setParent(friend, scene); hero.root.scale.setScalar(1); friend.root.scale.setScalar(1);
  const hy = (x, z, dy = 1) => terrainH(x, z) + dy;
  const L = ROAD.y + floodD(t);
  const wade = (x, z) => Math.max(terrainH(x, z), -99);

  if (n === 'title') {
    const u = ease(p); cam.pos = vl(V(-4, 26, 3), V(9, 6.5, 9), u); cam.tgt = vl(V(14, 4, 22), V(bp.x, 6, bp.z), u); cam.fov = 52;
    hp.visible = fp.visible = false; dg.mode = 'hide';
  } else if (n === 'home') {
    const c1 = wordAt('você', g.start) - g.start + 0.4, c2 = wordAt('cachorro', g.start) - g.start;
    if (lt < c1) { const k = ease(clamp(lt / c1)); cam.pos = vl(V(bp.x - 6, 4.5, bp.z - 19), V(bp.x - 3, 3.6, bp.z - 13), k); cam.tgt = V(bp.x, 5, bp.z); cam.fov = 56; hp.visible = fp.visible = false; dg.mode = 'hide'; }
    else if (lt < c2) { cam.pos = AP(1.6, 2.1, 4.4); cam.tgt = AP(-1.1, 1.0, -2.3); cam.fov = 50; fp.armR = (Math.floor(lt * 1.3) % 3 === 0) ? [1.9, -0.3, -2.0] : A.rest; hp.armR = (Math.floor(lt * 1.1 + 1) % 3 === 0) ? [1.6, -0.5, -1.6] : A.rest; }
    else { const k = clamp((lt - c2) / (g.dur - c2)); cam.pos = vl(AP(0.6, 0.9, 1.4), AP(0.3, 0.8, 1.2), k); cam.tgt = AP(-0.4, 0.3, -0.2); cam.fov = 40; }
  } else if (n === 'calm') {
    if (lt < 1.4) { cam.pos = vl(AP(-0.9, 1.5, 1.6), AP(-0.9, 1.45, 1.1), p); cam.tgt = AP(-1.0, 1.25, -2.6); cam.fov = 44; }
    else { cam.pos = AP(-1.4, 1.45, -0.3); cam.tgt = AP(-1.6, 1.3, -2.6); cam.fov = 36; hp.look = [Math.sin(lt * 2.5) * 0.9, 0.2]; hp.brow = -0.4; hp.smile = 0; }
  } else if (n === 'rain') {
    const r = R0 - g.start, wr = W_RUA - g.start, wp = W_PORTA - g.start;
    if (lt < wr - 0.3) {   // the downpour against the window
      const k = ease(clamp(lt / (wr - 0.3))); cam.pos = vl(AP(1.6, 1.7, -0.6), AP(2.1, 2.0, -1.6), k); cam.tgt = AP(2.3, 2.0, -3.5); cam.fov = 46;
      if (lt > r) { hp = Object.assign(hp, { look: [0.7, 0.4], brow: 0.5, smile: 0 }); fp = Object.assign(fp, { look: [0.7, 0.4], brow: 0.5, smile: 0 }); }
    } else if (lt < wp - 0.2) {   // the street turns into a river
      hp.visible = fp.visible = false; dg.mode = 'hide';
      const k = ease(clamp((lt - wr + 0.3) / (wp - wr + 0.1))); cam.pos = vl(V(DOOR.x + 0.6, 2.9, DOOR.z - 2.8), V(DOOR.x - 0.4, 3.0, DOOR.z - 2.2), k); cam.tgt = V(DOOR.x - 6, 1.1, ROAD.z - 1); cam.fov = 52;
    } else {   // water seeping in under the door
      hp = Object.assign(hp, { look: [1, -0.4], eyesWide: true, brow: 0.8, smile: 0 }); fp = Object.assign(fp, { look: [1, -0.4], eyesWide: true, brow: 0.8, smile: 0, popc: true });
      dg.mode = 'scared';
      const k = ease(clamp((lt - wp + 0.2) / 2.5)); cam.pos = vl(AP(2.6, 0.7, 1.4), AP(2.4, 1.0, 0.9), k); cam.tgt = AP(4.3, 0.15, 2.7); cam.fov = 48;
    }
  } else if (n === 'friend1' || n === 'pause') {
    hp = Object.assign(hp, { eyesWide: true, brow: 0.9, smile: 0, armL: A.up, armR: A.up, shout: 0.3, legs: undefined, y: AO.y, x: SOFA_H.x + 0.2, z: SOFA_H.z + 0.9 });
    fp = Object.assign(fp, { eyesWide: true, brow: 1, smile: 0, armL: A.up, armR: A.up, mouth: n === 'friend1' ? fm : 0, shout: n === 'pause' ? 0.5 : 0, legs: undefined, y: AO.y, x: SOFA_F.x + 0.1, z: SOFA_F.z + 1.0, popc: false });
    dg = { mode: 'scared', x: AO.x - 2.9, y: AO.y + 0.1, z: AO.z - 1.4, ry: 0.5 };
    if (n === 'friend1') { cam.pos = AP(-0.6, 1.4, 1.2); cam.tgt = AP(-0.9, 1.1, -1.8); cam.fov = 44; shake = 0.15; }
    else { const k = ease(p); cam.pos = vl(AP(-0.6, 1.4, 1.2), AP(-0.7, 1.35, 0.5), k); cam.tgt = AP(-0.9, 1.1, -1.8); cam.fov = 44; }
  } else if (n === 'explain' || n === 'depth') {
    hp.visible = fp.visible = false; dg.mode = 'hide'; const dc = dioCam(t); cam.pos = dc.pos; cam.tgt = dc.tgt; cam.fov = 48;
  } else if (n === 'car1') {
    hp = { x: SOFA_H.x + 0.6, z: SOFA_H.z + 1.4, y: AO.y, ry: 0.5, armR: A.point, armL: A.pointUp, mouth: hm, smile: 1, brow: -0.3, eyesWide: true };
    fp = Object.assign(fp, { legs: undefined, popc: false, y: AO.y, x: SOFA_F.x + 0.3, z: SOFA_F.z + 1.0, ry: -0.5, eyesWide: true, brow: 0.5, smile: 0, armL: A.rest, armR: A.rest, look: [-0.6, 0] });
    dg = { mode: 'scared', x: AO.x - 2.9, y: AO.y + 0.1, z: AO.z - 1.4, ry: 0.5 };
    cam.pos = AP(0.6, 1.6, 1.6); cam.tgt = AP(-0.9, 1.0, -1.6); cam.fov = 50;
  } else if (n === 'car2' || n === 'carfloat') {
    // the bad idea: driving through the flooded street
    const cs = carState(t);
    myCar.position.set(cs.x, cs.y, cs.z); myCar.rotation.set(cs.rx, cs.ry, cs.rz);
    setParent(friend, myCar); friend.root.scale.setScalar(1 / CAR_S); setParent(hero, myCar); hero.root.scale.setScalar(1 / CAR_S);
    hp = { x: -0.15, y: 0.46, z: 0.24, ry: -Math.PI / 2, legs: 'sit', sitY: 0.6, armL: A.drive, armR: A.drive, hat: false, eyesWide: cs.float > 0.2, brow: cs.float > 0.2 ? 1 : -0.2, smile: cs.float > 0.2 ? 0 : 1, shout: cs.float > 0.5 ? 0.5 : 0 };
    fp = { x: -0.15, y: 0.46, z: -0.24, ry: -Math.PI / 2, legs: 'sit', sitY: 0.6, armL: A.up, armR: A.up, eyesWide: cs.float > 0.2, brow: cs.float > 0.2 ? 1 : -0.2, smile: cs.float > 0.2 ? 0 : 1, shout: cs.float > 0.5 ? 0.5 : 0 };
    if (n === 'carfloat') { hp.armR = (Math.floor(lt * 2.2) % 2) ? [1.3, -0.1, -0.9] : A.drive; }
    dg.mode = 'hide';
    if (n === 'car2' && lt < 2.2) { cam.pos = V(cs.x - 4.5, L + 1.6, cs.z - 6.5); cam.tgt = V(cs.x, L + 0.8, cs.z); cam.fov = 46; }
    else { cam.pos = V(cs.x + 5.5, L + 3.2, cs.z - 8.5); cam.tgt = V(cs.x - 1, L + 0.6, cs.z); cam.fov = 50; }
  } else if (n === 'idea') {
    hp = { x: SOFA_H.x + 0.9, z: SOFA_H.z + 1.3, y: AO.y, ry: 0.9, armL: A.pointUp, armR: A.point, mouth: hm, smile: 1, brow: -0.3 };
    fp = { x: SOFA_F.x + 0.9, z: SOFA_F.z + 1.0, y: AO.y, ry: -0.4, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.5, look: [-0.5, 0] };
    dg = { mode: 'scared', x: AO.x - 0.1, y: AO.y + 0.12, z: AO.z - 0.9, ry: 0.3 };
    cam.pos = AP(-0.3, 1.5, 2.6); cam.tgt = AP(-0.3, 1.2, -1.4); cam.fov = 44;
  } else if (n === 'tv1' || n === 'tv2') {
    // round 1: turn on the TV (bad) vs switch the power off at the breaker (good)
    const H0 = { x: SOFA_H.x + 0.6, z: SOFA_H.z + 1.6 };
    fp = Object.assign(fp, { legs: undefined, y: AO.y, x: SOFA_F.x + 0.1, z: SOFA_F.z + 1.0, popc: false, eyesWide: true, brow: 0.5, smile: 0, armL: A.rest, armR: A.rest, look: [-0.4, 0] });
    dg = { mode: 'scared', x: AO.x - 2.9, y: AO.y + 0.1, z: AO.z - 1.4, ry: 0.5 };
    if (n === 'tv1') {
      hp = { x: H0.x, y: AO.y, z: H0.z, ry: -0.1, armL: A.rest, armR: [1.45, 0.1, -0.3], phone: true, mouth: hm, smile: 1, brow: -0.3 };
      cam.pos = AP(-3.3, 2.3, -2.5); cam.tgt = AP(-0.6, 1.0, 1.4); cam.fov = 54; dg = { mode: 'scared', x: AO.x - 2.2, y: AO.y + 0.1, z: AO.z - 2.1, ry: 0.5 };
    } else {
      const wc = W_CERTO - g.start, we = W_ENERGIA - g.start;
      if (lt < wc - 0.2) {   // why not: water + outlets = shock
        hp = { x: H0.x, y: AO.y, z: H0.z, ry: -0.1, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.6, smile: 0 };
        cam.pos = AP(0.9, 0.55, -2.4); cam.tgt = AP(0.9, 0.3, -3.5); cam.fov = 42;
      } else {   // the right plan: switch the power off
        const go = ss(wc - 0.2, Math.max(wc + 0.6, we - 0.1), lt), flip = lt > we + 0.1 && lt < we + 0.7;
        const g1 = ss(0, 0.45, go), g2 = ss(0.45, 1, go), wpx = AO.x + 0.6, wpz = AO.z + 1.3;
        hp = { x: go < 0.45 ? lerp(H0.x, wpx, g1) : lerp(wpx, BREAKER.x, g2), z: go < 0.45 ? lerp(H0.z, wpz, g1) : lerp(wpz, BREAKER.z, g2), y: AO.y, ry: go < 0.45 ? Math.atan2(wpx - H0.x, wpz - H0.z) : go < 1 ? Math.atan2(BREAKER.x - wpx, BREAKER.z - wpz) : Math.PI / 2, run: go > 0 && go < 1 ? 1 : 0, phase: lt * 13, armR: go >= 1 ? (flip ? [2.0, 0.1, -0.9] : [1.7, 0.1, -0.5]) : undefined, armL: go >= 1 ? A.rest : undefined, brow: -0.2, smile: lt > we + 0.8 ? 1 : 0 };
        fp = Object.assign(fp, { x: AO.x - 1.7, z: AO.z + 0.9, ry: 1.1, look: [0.6, 0.2] }); dg = { mode: 'scared', x: AO.x - 2.4, y: AO.y + 0.12, z: AO.z + 1.4, ry: 1.2 };
        if (go < 0.9) { cam.pos = AP(0.7, 2.6, 3.3); cam.tgt = AP(1.6, 0.9, -0.3); cam.fov = 62; }
        else { cam.pos = AP(1.6, 1.75, 2.7); cam.tgt = AP(4.2, 1.3, 1.1); cam.fov = 44; }
      }
    }
  } else if (n === 'stay1' || n === 'stay2' || n === 'stayrise') {
    // round 2b: just stay put (bad) -> the water keeps rising
    hp = Object.assign(hp, { armL: [0.5, 0.9, -2.1], armR: [0.5, 0.9, -2.1], mouth: n === 'stay1' ? hm : 0, smile: 1, brow: -0.2, lean: -0.3 });
    fp = Object.assign(fp, { popc: false, armL: A.rest, armR: A.rest, look: [-0.6, 0], brow: 0.4, smile: 0 });
    dg = { mode: 'scared', x: AO.x - 2.6, y: AO.y + Math.max(0.1, H.W - 0.38), z: AO.z - 1.2, ry: 0.5 };
    if (n === 'stayrise') { const up = lt > 0.6; hp = Object.assign(hp, { eyesWide: up, brow: up ? 1 : -0.2, smile: up ? 0 : 1, look: [0, -0.8], armL: up ? A.up : hp.armL, armR: up ? A.up : hp.armR, shout: up ? 0.5 : 0 }); fp = Object.assign(fp, { eyesWide: up, brow: 1, look: [0, -0.8], armL: up ? A.up : A.rest, armR: up ? A.up : A.rest, shout: up ? 0.5 : 0 }); }
    if (n === 'stay1') { cam.pos = AP(-1.0, 1.45, 0.2); cam.tgt = AP(-1.0, 1.15, -2.65); cam.fov = 44; }
    else { const k = n === 'stayrise' ? 1 : ease(p); cam.pos = vl(AP(0.6, 1.5, 1.8), AP(0.2, 1.2, 1.3), k); cam.tgt = AP(-1.0, 0.6, -2.2); cam.fov = 52; }
  } else if (n === 'high') {
    // the right plan: up the stairs to the roof
    const wt = W_TELHADO - g.start;
    if (lt < wt - 0.2) {
      const d = 0.4 + STAIR_TOTAL * 0.8 * ss(0.2, wt - 0.2, lt);
      const h0 = onStairs(d), f0 = onStairs(Math.max(0, d - 1.1));
      hp = { x: h0.x, y: h0.y, z: h0.z, ry: h0.ry, run: 0.8, phase: lt * 12, brow: 0.3, smile: 0 };
      fp = { x: f0.x, y: f0.y, z: f0.z, ry: f0.ry, run: 0.8, phase: lt * 12 + 1.3, armL: [0.95, -0.15, -1.5], armR: [0.95, -0.15, -1.5], brow: 0.3, smile: 0 };
      dg = { mode: 'carried' };
      cam.pos = V(h0.x - 0.5, h0.y + 2.0, IO.z + 8.5); cam.tgt = V(h0.x, h0.y + 1.0, IO.z + 1.0); cam.fov = 50;
    } else {
      const hR = ROOF(-0.9, -3.0), fR = ROOF(0.6, -3.1), dR = ROOF(-0.1, -2.6);
      hp = { x: hR.x, y: hR.y, z: hR.z, ry: FRONT_RY, armL: A.hips, armR: A.thumb, brow: -0.2, smile: 1 };
      fp = { x: fR.x, y: fR.y, z: fR.z, ry: FRONT_RY, armL: A.rest, armR: A.rest, brow: 0.1, smile: 1 };
      dg = { mode: 'sit', x: dR.x, y: dR.y, z: dR.z, ry: FRONT_RY };
      const k = ease(clamp((lt - wt + 0.2) / 2.5)); cam.pos = vl(bw(-0.4, 14.6, -6.6), bw(-0.3, 14.8, -7.6), k); cam.tgt = bw(-0.2, 14.0, -3.0); cam.fov = 44;
    }
  } else if (n === 'gag1') {
    const hR = ROOF(-0.9, -3.0), fR = ROOF(0.6, -3.1), dR = ROOF(-0.1, -2.6);
    hp = { x: hR.x, y: hR.y, z: hR.z, ry: FRONT_RY + 0.4, armL: A.rest, armR: A.rest, brow: 0.4, smile: 0, look: [0.6, 0] };
    fp = { x: fR.x, y: fR.y, z: fR.z, ry: FRONT_RY - 0.2, armL: A.rest, armR: [1.4, 0.1, -0.1], mouth: fm, smile: 1, brow: -0.3, look: [0, -0.6] };
    dg = { mode: 'sit', x: dR.x, y: dR.y, z: dR.z, ry: FRONT_RY };
    board.visible = true; board.position.set(MAN.x - 1.4, L + 0.02 + 0.03 * Math.sin(t * 2.5), MAN.z - 0.6); board.rotation.set(0.05 * Math.sin(t * 2), 0.6, 0);
    cam.pos = bw(-0.4, 14.6, -6.6); cam.tgt = bw(-0.2, 14.0, -3.0); cam.fov = 44;
  } else if (n === 'wait') {
    const HD = bw(0.62, 0, -4.6), FD = bw(-0.4, 0, -4.6), DD = bw(-1.0, 0, -4.45);
    hp = { x: HD.x, y: STOOP_Y, z: HD.z, ry: FRONT_RY - 0.5, armL: A.hips, armR: A.pointUp, mouth: hm, brow: -0.5, smile: 0 };
    fp = { x: FD.x, y: STOOP_Y, z: FD.z, ry: FRONT_RY + 0.4, armL: A.rest, armR: A.rest, squint: 0.4, smile: 0, brow: 0.3, board: true };
    dg = { mode: 'sit', x: DD.x, y: STOOP_Y, z: DD.z, ry: FRONT_RY };
    cam.pos = bw(0.1, 0, -8.6); cam.pos.y = STOOP_Y + 1.5; cam.tgt = bw(0.1, 0, -4.6); cam.tgt.y = STOOP_Y + 1.0; cam.fov = 40;
  } else if (n === 'rule') {
    const we = W_ENERGIA - g.start, wt = W_TOMADAS - g.start, ws = W_SUBA - g.start, wn = W_NUNCA - g.start;
    if (lt < wt - 0.3) {   // switch the power off at the breaker
      const go = ss(0, Math.max(0.6, we - 0.3), lt), flip = lt > we + 0.1 && lt < we + 0.7;
      const g1 = ss(0, 0.45, go), g2 = ss(0.45, 1, go), wpx = AO.x + 0.6, wpz = AO.z + 1.3;
      hp = { x: go < 0.45 ? lerp(SOFA_H.x + 0.9, wpx, g1) : lerp(wpx, BREAKER.x, g2), z: go < 0.45 ? lerp(SOFA_H.z + 1.3, wpz, g1) : lerp(wpz, BREAKER.z, g2), y: AO.y, ry: go < 0.45 ? Math.atan2(wpx - SOFA_H.x - 0.9, wpz - SOFA_H.z - 1.3) : go < 1 ? Math.atan2(BREAKER.x - wpx, BREAKER.z - wpz) : Math.PI / 2, run: go < 1 ? 1 : 0, phase: lt * 13, armR: go >= 1 ? (flip ? [2.0, 0.1, -0.9] : [1.7, 0.1, -0.5]) : undefined, armL: go >= 1 ? A.rest : undefined, brow: -0.2, smile: 0, pack: true };
      fp = { x: AO.x - 1.7, z: AO.z + 0.9, y: AO.y, ry: 1.1, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.4, look: [0.6, 0.2] };
      dg = { mode: 'scared', x: AO.x - 2.4, y: AO.y + 0.12, z: AO.z + 1.4, ry: 1.2 };
      if (go < 0.9) { cam.pos = AP(0.7, 2.6, 3.3); cam.tgt = AP(1.6, 0.9, -0.3); cam.fov = 62; }
      else { cam.pos = AP(1.6, 1.75, 2.7); cam.tgt = AP(4.2, 1.3, 1.1); cam.fov = 44; }
    } else if (lt < ws - 0.2) {   // why: the water reaches the outlets
      hp.visible = fp.visible = false; dg.mode = 'hide';
      cam.pos = AP(0.9, 0.55, -2.4); cam.tgt = AP(0.9, 0.3, -3.5); cam.fov = 42;
    } else if (lt < wn - 0.3) {   // climb the building stairs
      const d = 0.4 + STAIR_TOTAL * 0.55 * ss(ws - 0.2, wn - 0.3, lt);
      const h0 = onStairs(d), f0 = onStairs(Math.max(0, d - 1.1));
      hp = { x: h0.x, y: h0.y, z: h0.z, ry: h0.ry, run: 0.8, phase: lt * 12, brow: 0.3, smile: 0, pack: true };
      fp = { x: f0.x, y: f0.y, z: f0.z, ry: f0.ry, run: 0.8, phase: lt * 12 + 1.3, armL: [0.95, -0.15, -1.5], armR: [0.95, -0.15, -1.5], brow: 0.3, smile: 0 };
      dg = { mode: 'carried' };
      cam.pos = V(h0.x - 0.5, h0.y + 2.0, IO.z + 8.5); cam.tgt = V(h0.x, h0.y + 1.0, IO.z + 1.0); cam.fov = 50;
    } else {   // never cross the current
      hp.visible = fp.visible = false; dg.mode = 'hide';
      const k = ease(clamp((lt - wn + 0.3) / 3)); cam.pos = vl(V(14, L + 1.8, 12.5), V(11, L + 1.4, 12.8), k); cam.tgt = V(4, L + 0.2, 18); cam.fov = 52;
    }
  } else if (n === 'kit') {
    const h0 = onStairs(D_FLOOR2);
    hp = { x: IO.x - 2.6, y: IO.y + 6, z: IO.z + 1.9, ry: 0.5, armL: A.hips, armR: [1.2, 0.3, -1.4], brow: -0.2, smile: 1, pack: true, look: [0.3, 0] };
    fp = { x: IO.x - 4.2, y: IO.y + 6, z: IO.z + 2.0, ry: -0.3, armL: [0.95, -0.15, -1.5], armR: [0.95, -0.15, -1.5], brow: 0.2, smile: 1, look: [0.5, 0] };
    dg = { mode: 'carried' };
    const k = ease(p); cam.pos = vl(V(IO.x - 3.2, IO.y + 7.6, IO.z + 6.5), V(IO.x - 3.0, IO.y + 7.4, IO.z + 5.4), k); cam.tgt = V(IO.x - 3.2, IO.y + 6.9, IO.z + 1.5); cam.fov = 46;
  } else if (n === 'outside') {
    hp.visible = fp.visible = false; dg.mode = 'hide';
    const wt = W_TUNEIS - g.start;
    if (lt < wt - 0.4) { const k = ease(clamp(lt / (wt - 0.4))); cam.pos = vl(V(2, L + 2.5, 11), V(-2, L + 4.5, 12), k); cam.tgt = V(TOP.x + 4, 8, TOP.z - 4); cam.fov = 52; }
    else { const k = ease(clamp((lt - wt + 0.4) / (g.dur - wt + 0.4))); cam.pos = vl(V(-8, L + 2.2, 14.5), V(-11, L + 1.6, 15.5), k); cam.tgt = V(ROAD.x - ROAD.half, L + 1.0, ROAD.z); cam.fov = 48; }
  } else if (n === 'hidden') {
    hp.visible = fp.visible = false; dg.mode = 'hide';
    const wb = W_BARRENTA - g.start;
    if (lt < wb - 0.2) { cam.pos = V(MAN.x + 3.2, L + 1.6, MAN.z - 3.8); cam.tgt = V(MAN.x, L + 0.3, MAN.z); cam.fov = 44; }
    else { const k = ease(clamp((lt - wb + 0.2) / 3)); cam.pos = vl(V(MAN.x + 2.2, L + 3.4, MAN.z - 2.4), V(MAN.x + 1.6, L + 4.0, MAN.z - 1.6), k); cam.tgt = V(MAN.x, L, MAN.z); cam.fov = 44; }
  } else if (n === 'gag1b' || n === 'gag2' || n === 'gag3') {
    // the friend wades out for his surfboard and finds the open manhole
    board.visible = true;
    const bx = MAN.x - 1.4 - (n === 'gag1b' ? 0 : 0.25 * (t - T0('gag2'))), bz = MAN.z - 0.6;
    board.position.set(bx, L + 0.02 + 0.03 * Math.sin(t * 2.5), bz); board.rotation.set(0.05 * Math.sin(t * 2), 0.6 + 0.08 * Math.sin(t * 0.9), 0);
    const HD = bw(0.62, 0, -4.6), FD = bw(-0.4, 0, -4.6), DD = bw(-1.0, 0, -4.45);
    const hpDoor = { x: HD.x, y: STOOP_Y, z: HD.z, ry: FRONT_RY, brow: 0.5, smile: 0, eyesWide: true, look: [0, -0.2] };
    dg = { mode: 'scared', x: DD.x, y: STOOP_Y, z: DD.z, ry: FRONT_RY };
    if (n === 'gag1b') {
      hp = Object.assign(hpDoor, { armL: A.rest, armR: A.stop, look: [-0.5, 0] });
      fp = { x: FD.x, y: STOOP_Y, z: FD.z, ry: FRONT_RY - 0.4, armR: A.point, armL: A.rest, smile: 1, brow: -0.3, look: [0, -0.5] };
      cam.pos = V(MAN.x - 5.2, L + 2.0, MAN.z - 2.6); cam.tgt = V((MAN.x + FD.x) / 2, L + 0.7, (MAN.z + FD.z) / 2); cam.fov = 46;
    } else if (n === 'gag2') {
      const k = clamp((t - T0('gag2')) / (PLOFT - 0.05 - T0('gag2'))), down = t > PLOFT, up = t > POPUP;
      const from = V(FD.x, 0, FD.z), to = V(MAN.x, 0, MAN.z);
      const x = lerp(from.x, to.x, k), z = lerp(from.z, to.z, k), gy = k < 0.25 ? lerp(STOOP_Y, STEP2_Y, ss(0, 0.12, k)) - (k > 0.12 ? (STEP2_Y - terrainH(x, z)) * ss(0.12, 0.25, k) : 0) : terrainH(x, z);
      fp = { x, y: gy, z, ry: Math.atan2(to.x - from.x, to.z - from.z), run: down ? 0 : 0.6, phase: lt * 9, armL: [0.6, 0.6, -0.4], armR: [0.6, 0.6, -0.4], smile: 1, brow: -0.2 };
      if (down && !up) { const kk = clamp((t - PLOFT) / 0.25); fp = Object.assign(fp, { x: MAN.x, z: MAN.z, y: terrainH(MAN.x, MAN.z) - 2.3 * kk * kk, armL: A.up, armR: A.up, eyesWide: true, shout: 0.6, smile: 0 }); fp.visible = kk < 1; }
      if (up) { const kk = ss(0, 0.25, t - POPUP); fp = { x: MAN.x, z: MAN.z, y: terrainH(MAN.x, MAN.z) - 1.6 + 1.0 * kk, ry: FRONT_RY, armL: A.rest, armR: A.rest, mud: 1, peel: true, squint: 0.7, smile: 0, brow: 0.3, wob: 0.1 }; }
      if (t < PLOFT + 1.2) { hp = Object.assign(hpDoor, { armL: A.stop, armR: A.stop, shout: t < PLOFT ? 0.4 : 0.6, brow: 1 }); cam.pos = V(MAN.x - 3.4, L + 1.7, MAN.z - 4.0); cam.tgt = V((MAN.x + STOOP_FRONT.x) / 2, L + 0.5, (MAN.z + STOOP_FRONT.z) / 2); cam.fov = 48; }
      else { hp = Object.assign(hpDoor, { armL: A.hips, armR: A.facepalm, lean: 0.12, squint: 0.9, brow: -0.6, smile: 0, tilt: -0.12, eyesWide: false }); cam.pos = bw(0.9, 1.9, -7.2); cam.tgt = bw(0.62, 1.25, -4.6); cam.tgt.y = STOOP_Y + 1.25; cam.pos.y = STOOP_Y + 1.45; cam.fov = 34; }
    } else {
      hp = Object.assign(hpDoor, { armL: A.hips, armR: A.facepalm, lean: 0.12, squint: 0.9, brow: -0.6, smile: 0, tilt: -0.12, eyesWide: false });
      fp = { x: MAN.x, z: MAN.z, y: terrainH(MAN.x, MAN.z) - 0.6, ry: FRONT_RY - 0.3, armR: A.thumb, armL: A.rest, mouth: fm, mud: 1, peel: true, squint: 0.5, smile: 1, wob: 0.12, brow: 0.3 };
      cam.pos = V(MAN.x - 1.0, L + 1.2, MAN.z - 2.6); cam.tgt = V(MAN.x, L + 0.6, MAN.z); cam.fov = 40;
    }
  } else if (n === 'germs') {
    const HD = bw(0.62, 0, -4.6), FD = bw(-0.4, 0, -4.6), DD = bw(-1.0, 0, -4.45);
    const ws = W_SABAO - g.start, wl = W_LAVE - g.start, clean = ss(ws, ws + 1.4, lt);
    hp = { x: HD.x, y: STOOP_Y, z: HD.z, ry: FRONT_RY - 0.5, armL: A.rest, armR: lt > wl - 0.3 ? [1.4, 0.1, -0.6] : A.rest, soap: lt > wl - 0.3, brow: -0.2, smile: 1 };
    fp = { x: FD.x, y: STOOP_Y, z: FD.z, ry: FRONT_RY + 0.4, armL: A.rest, armR: A.rest, mud: 1 - clean, peel: clean < 0.5, squint: 0.4, smile: clean > 0.5 ? 1 : 0, brow: 0.3 };
    dg = { mode: 'sit', x: DD.x, y: STOOP_Y, z: DD.z, ry: FRONT_RY };
    cam.pos = bw(0.1, 0, -8.6); cam.pos.y = STOOP_Y + 1.5; cam.tgt = bw(0.1, 0, -4.6); cam.tgt.y = STOOP_Y + 1.0; cam.fov = 40;
  } else if (n === 'wait2' || n === 'wire' || n === 'q1') {
    // waiting up on the roof
    const hR = ROOF(-0.9, -3.0), fR = ROOF(0.6, -3.1), dR = ROOF(-0.1, -2.6);
    hp = { x: hR.x, y: hR.y, z: hR.z, ry: FRONT_RY, armL: A.rest, armR: A.rest, brow: 0.1, smile: 1 };
    fp = { x: fR.x, y: fR.y, z: fR.z, ry: FRONT_RY, armL: A.rest, armR: A.rest, brow: 0.1, smile: 1 };
    dg = { mode: 'sit', x: dR.x, y: dR.y, z: dR.z, ry: FRONT_RY };
    if (n === 'wait2') {
      const w199 = wordAt('defesa', g.start) - g.start;
      hp = Object.assign(hp, { phone: lt < w199 + 1.5, armR: lt < w199 + 1.5 ? [2.1, -0.35, -2.4] : A.wave, mouth: 0 });
      fp = Object.assign(fp, { armL: lt > w199 + 0.5 ? A.wave : A.rest, armR: lt > w199 + 0.5 ? A.wave : A.rest, mouth: 0 });
      cam.pos = vl(bw(-1.4, 14.4, -5.6), bw(-0.5, 14.6, -6.6), ss(w199 + 1.5, g.dur, lt)); cam.tgt = bw(-0.3, 14.0, -3.0); cam.fov = 44;
    } else if (n === 'wire') {
      const zz = t > W_FIO + 0.2;
      hp = Object.assign(hp, { eyesWide: zz, brow: zz ? 0.9 : 0.2, look: [-0.7, -0.6], armL: zz ? A.stop : A.rest });
      fp = Object.assign(fp, { eyesWide: zz, brow: zz ? 1 : 0.2, look: [-0.7, -0.6], armL: zz ? A.up : A.rest, armR: zz ? A.up : A.rest, shout: zz ? 0.5 : 0, y: fp.y + (zz && t < W_FIO + 0.6 ? 0.25 * Math.sin((t - W_FIO - 0.2) / 0.4 * Math.PI) : 0) });
      if (lt < 1.4) { cam.pos = bw(1.8, 15.2, -6.5); cam.tgt = bw(-0.2, 14.0, -3.0); cam.fov = 46; }
      else { cam.pos = V(5.5, L + 2.6, 11); cam.tgt = V(5.5, L + 2.2, 20.6); cam.fov = 58; }
    } else {
      hp = Object.assign(hp, { armR: A.thumb, armL: A.hips, shades: true, brow: -0.2 });
      fp = Object.assign(fp, { armR: A.thumb, armL: A.hips, shades: true, brow: -0.2 });
      cam.pos = vl(bw(-0.4, 14.6, -6.2), bw(-0.2, 14.5, -5.6), p); cam.tgt = bw(-0.2, 14.0, -3.0); cam.fov = 44;
    }
  } else if (GAGN.includes(n)) {
    // the ending: keep watching the movie no matter what
    dg = { mode: H.W > 0.35 ? 'scared' : 'lie', x: AO.x - 0.4 - 2.0 * ss(0.3, 1.2, H.W), y: AO.y + Math.max(0.02, H.W - 0.38), z: AO.z - 0.6 + 0.2 * ss(0.3, 1.2, H.W), ry: 0.6 + 0.5 * Math.sin(t * 0.8) * ss(0.3, 1.2, H.W) };
    if (n === 'q2') { cam.pos = AP(1.6, 2.1, 4.4); cam.tgt = AP(-1.1, 1.0, -2.3); cam.fov = 50; }
    else if (n === 'q3') { fp.mouth = fm; fp.brow = -0.4; fp.armR = A.wave; cam.pos = AP(-0.1, 1.45, -0.2); cam.tgt = AP(-0.4, 1.15, -2.65); cam.fov = 40; }
    else if (n === 'q4') { hp.mouth = hm; hp.brow = -0.3; hp.smirk = true; hp.armR = [1.2, 0.55, -0.35]; hp.look = [0.8, -0.2]; cam.pos = AP(-1.0, 1.4, -0.3); cam.tgt = AP(-1.0, 1.1, -2.65); cam.fov = 40; }
    else if (n === 'rise') { const k = ease(p); cam.pos = vl(AP(0.4, 1.0, 1.4), AP(0.2, 1.7, 1.9), k); cam.tgt = vl(AP(-1.0, 0.3, -1.6), AP(-1.0, 1.0, -2.4), k); cam.fov = 52; }
    else if (n === 'ohoh') { hp = Object.assign(hp, { mouth: Math.max(hm, 0.2), eyesWide: true, brow: 0.6, smile: 0, look: [0, -0.8] }); fp = Object.assign(fp, { eyesWide: true, brow: 0.8, smile: 0, look: [0, -0.8] }); cam.pos = AP(-1.0, 1.5 + lift, -0.5); cam.tgt = AP(-1.0, 1.2 + lift, -2.65); cam.fov = 44; }
    else {
      const k = t - T0('float'), top = t > BONK_T;
      hp = Object.assign(hp, { eyesWide: !top, brow: 1, smile: 0, shout: top ? 0 : 0.6, look: [0, 1], armL: A.up, armR: A.up });
      fp = Object.assign(fp, { eyesWide: !top, brow: 1, smile: 0, shout: top ? 0 : 0.6, look: [0, 1], armL: A.up, armR: A.up, popc: true });
      if (top) { hp = Object.assign(hp, { squint: 0.6, armL: [0.9, 0.1, -1.6], armR: A.rest, look: [0, -0.2], wob: k < 2.3 ? 0.2 : 0 }); fp = Object.assign(fp, { squint: 0.6, armL: [0.35, 0.15, -1.05], armR: A.rest, look: [0, -0.2], wob: k < 2.3 ? 0.2 : 0 }); }
      cam.pos = AP(-0.9, 2.2 + 1.1 * ss(0, 2.5, k), 1.6); cam.tgt = AP(-1.0, 1.8 + 1.2 * ss(0, 2.5, k), -2.5); cam.fov = 54;
      shake = Math.abs(t - BONK_T) < 0.4 && t > BONK_T ? 0.6 * Math.exp(-(t - BONK_T) * 5) : 0;
    }
  } else if (n === 'end') {
    const hR = ROOF(-0.9, -3.0), fR = ROOF(0.6, -3.1), dR = ROOF(-0.1, -2.6);
    hp = { x: hR.x, y: hR.y, z: hR.z, ry: FRONT_RY, armL: A.wave, armR: A.hips, shades: true, smile: 1 };
    fp = { x: fR.x, y: fR.y, z: fR.z, ry: FRONT_RY, armL: A.rest, armR: A.thumb, shades: true, smile: 1 };
    dg = { mode: 'sit', x: dR.x, y: dR.y, z: dR.z, ry: FRONT_RY };
    cam.pos = vl(bw(-0.3, 14.5, -6.0), bw(6, 19, -16), ease(p)); cam.tgt = bw(-0.2, 13.8, -3.0); cam.fov = 45;
  }
  for (const [p, b] of [[hp, hero], [fp, friend]]) if (b.root.parent === scene && p.legs !== 'sit') keepOut(p, 0.46);
  if (dg.mode !== 'carried' && dg.mode !== 'hide') keepOut(dg, 0.38);
  hero.pose(t, hp); friend.pose(t, fp);
  if (dg.mode === 'carried') { if (dog.parent !== friend.body) friend.body.add(dog); dog.scale.setScalar(1); dogPose(t, 'carried', 0, -0.28, 0.42, 0); }
  else { if (dog.parent !== scene) scene.add(dog); dogPose(t, dg.mode, dg.x, dg.y, dg.z, dg.ry); }
  const sh = shake * 0.12;
  cam.pos.add(V(Math.sin(t * 47) * sh, Math.sin(t * 61) * sh, Math.sin(t * 53) * sh));
  camera.position.copy(cam.pos); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.lookAt(cam.tgt);
  const focus = cam.tgt.clone(); focus.y = 0;
  if (APTN.includes(n) || GAGN.includes(n) || n === 'kit' || n === 'explain' || isIndoorShot(n, lt)) { sun.target.position.copy(focus); sun.position.copy(focus).add(V(10, 30, 40)); }
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
  if (n === 'rain') { const g = S.rain; return lt < W_RUA - g.start - 0.3 || lt >= W_PORTA - g.start - 0.2; }
  if (n === 'rule') { const g = S.rule; return lt < W_NUNCA - g.start - 0.3; }
  if (n === 'home') return lt >= wordAt('você', S.home.start) - S.home.start + 0.4;
  if (n === 'high') return lt < W_TELHADO - S.high.start - 0.2;
  return false;
}

// ---------- world (outdoors) ----------
const debrisOn = n => ['high', 'gag1', 'gag1b', 'car2', 'carfloat', 'wait2', 'q1'].includes(n);
// ---------- 3D explanation: a cutaway model of countryside, river and city ----------
const DIO = V(0, 0, 205);
const dio = new THREE.Group(); dio.position.copy(DIO); scene.add(dio);
const dioP = {};
const EW = k => wordAt(k, T0('explain'));
const E = { ch: EW('chove'), ab: EW('absorver'), ci: EW('cidade'), as: EW('asfalto'), li: EW('lixo'), bu: EW('bueiros'), ri: EW('rios'), tr: EW('transbordam'), inv: EW('invade') };
{
  const D = 8, layer = (x0, x1, y0, y1, c) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, D), std(c, { roughness: 0.95 })); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0); m.receiveShadow = true; m.castShadow = true; dio.add(m); return m; };
  // countryside (left): grass over soil layers that darken as they soak
  dioP.soil = [layer(-23, -3.2, -1.2, -0.15, 0xa5794a), layer(-23, -3.2, -2.6, -1.2, 0x8f6a40), layer(-23, -3.2, -4.5, -2.6, 0x7a5835)];
  layer(-23, -3.2, -0.15, 0, 0x6fae4a);
  // river bed (middle)
  layer(-3.2, 3.2, -4.5, -2.4, 0x6e5233); layer(-3.2, -2.4, -2.4, 0, 0x7a5835); layer(2.4, 3.2, -2.4, 0, 0x8c8780);
  // city (right): base, asphalt, sidewalk
  layer(3.2, 23, -4.5, -0.25, 0x9b9488); dioP.asph = layer(3.2, 23, -0.25, 0, 0x4a4d52);
  { const fl = new THREE.Mesh(new THREE.PlaneGeometry(110, 60), std(0xc9cdd2, { roughness: 0.9 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, -4.5, -10); fl.receiveShadow = true; dio.add(fl);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(110, 45), std(0xffffff, { roughness: 1, map: canvasTex(256, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5a6f86'); gr.addColorStop(1, '#a9b8c6'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }) })); wall.position.set(0, 18, -14); wall.receiveShadow = true; dio.add(wall); }
  for (let i = 0; i < 9; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.012, 0.18), std(0xf4f4f4)); st.position.set(4.5 + i * 1.9, 0.006, 1.4); dio.add(st); }
  // drain grate with a pipe below, and the trash that clogs it
  const DX = 7.2; const grate = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.8), std(0x222222, { metalness: 0.5 })); grate.position.set(DX, 0.02, 0.9); dio.add(grate);
  for (let i = 0; i < 5; i++) { const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.8), std(0x666666)); b2.position.set(DX - 0.48 + i * 0.24, 0.035, 0.9); dio.add(b2); }
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.7), std(0x1b1b1b)); shaft.position.set(DX, -1.25, 0.9); dio.add(shaft);
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4.4, 14), std(0x3a3a3a)); pipe.rotation.z = Math.PI / 2; pipe.position.set(5.1, -2.1, 0.9); dio.add(pipe);
  dioP.trash = [];
  [[0x3fa34d, 'b'], [0xe8e8e8, 's'], [0xd9534f, 'c'], [0xf2c14e, 'x'], [0x2e7dd1, 'c'], [0xe8e8e8, 's']].forEach(([c, k], i) => { let m; if (k === 'b') m = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.4, 10), std(c, { transparent: true, opacity: 0.85 })); else if (k === 's') m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), std(c, { roughness: 0.9 })); else if (k === 'c') m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.22, 10), std(c, { metalness: 0.5 })); else m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), std(c)); m.castShadow = true; m.userData = { x: DX - 0.4 + (i % 3) * 0.4, z: 0.75 + Math.floor(i / 3) * 0.3, r: i * 1.3 }; dio.add(m); dioP.trash.push(m); });
  // houses and buildings
  [[5.0, 2.2, 2.0, '#f6c8a0'], [9.6, 3.6, 2.4, '#a8d8ea'], [12.6, 2.6, 2.0, '#ffe6a7'], [6.2, 5.5, 1.8, '#f7a7a7'], [16.0, 3.0, 2.2, '#d6f0c8'], [19.4, 2.4, 2.0, '#fde2c4'], [21.6, 3.4, 1.6, '#cfd8dc'], [17.6, 6.5, 2.0, '#e9e2f5']].forEach(([x, h, w, c], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.2), std(0xffffff, { map: facadeTex(c, '#5f8fb3', Math.max(2, Math.round(h / 1.1)), 2) })); m.position.set(x, h / 2, (i === 3 || i === 7) ? -2.6 : -1.6); m.castShadow = m.receiveShadow = true; dio.add(m); if (i !== 3 && i !== 7) { const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.8, 0.9, 4), std(0xb5523b)); roof.rotation.y = Math.PI / 4; roof.position.set(x, h + 0.45, -1.6); roof.castShadow = true; dio.add(roof); } });
  // countryside trees
  for (const [x, z] of [[-12, -1.5], [-8.5, -2.5], [-5.5, -1.2], [-10, 1.8], [-16, -2.2], [-19, -0.5], [-21, -2.8], [-17.5, 2.2]]) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), std(0x6b4a2b)); tr.position.set(x, 0.6, z); dio.add(tr); const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), std(0x3f8f2f, { flatShading: true })); c.position.set(x, 1.6, z); c.castShadow = true; dio.add(c); }
  // storm clouds
  for (let i = 0; i < 10; i++) { const c = new THREE.Group(); for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1.1 + (k % 2) * 0.4, 12, 8), std(0x5f6b78, { roughness: 1 })); m.position.set(k * 1.2 - 1.8, (k % 2) * 0.35, 0); m.scale.y = 0.7; c.add(m); } c.position.set(-21 + i * 4.6, 8.5 + (i % 2) * 0.6, -1 + (i % 3)); dio.add(c); }
  // water: in the river, and the flood that spreads over the banks
  const wMat = new THREE.MeshStandardMaterial({ color: 0x7e6a4e, transparent: true, opacity: 0.88, roughness: 0.15, metalness: 0.2 });
  dioP.river = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1, D - 0.02), wMat); dio.add(dioP.river);
  dioP.flood = new THREE.Mesh(new THREE.BoxGeometry(1, 1, D - 0.02), wMat); dio.add(dioP.flood);
  // arrows: water sinking into the soil / running over the asphalt
  dioP.arrows = []; const arM = std(0x5fd0ff, { emissive: 0x1d6f8a, emissiveIntensity: 0.6 });
  for (let i = 0; i < 10; i++) { const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), arM); sh.position.y = 0.25; g.add(sh); const hd = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 10), arM); hd.position.y = 0.6; g.add(hd); dio.add(g); dioP.arrows.push(g); }
  // big rain drops falling on the model
  dioP.drops = []; const dropM = new THREE.MeshBasicMaterial({ color: 0xbfe3ff });
  for (let i = 0; i < 80; i++) { const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.35, 2, 6), dropM); d.userData = { x: -22 + (i * 7.31) % 44, z: -3.5 + (i * 3.17) % 7, o: (i * 0.137) % 1 }; dio.add(d); dioP.drops.push(d); }
  dio.visible = false;
}
const SOIL0 = [0xa5794a, 0x8f6a40, 0x7a5835].map(c => new THREE.Color(c)), SOILW = [0x5d4026, 0x4e3520, 0x3f2c19].map(c => new THREE.Color(c));
function updateDio(t) {
  const sat = ss(E.ab + 0.3, E.ab + 2.6, t), rise = ss(E.ri - 0.6, E.tr + 0.6, t), over = ss(E.tr, E.tr + 1.2, t), inv = ss(E.inv - 0.2, E.inv + 1.6, t);
  dioP.soil.forEach((m, i) => m.material.color.copy(SOIL0[i]).lerp(SOILW[i], sat));
  const rl = lerp(-1.9, 0.12, rise); dioP.river.scale.y = rl + 2.4; dioP.river.position.set(0, (rl - 2.4) / 2, 0);
  const fl = over * 0.12 + inv * 0.55, fw = 6.4 + over * 6 + inv * 33;
  dioP.flood.visible = fl > 0.01; dioP.flood.scale.set(Math.min(fw, 45.8), Math.max(fl, 0.01), 1); dioP.flood.position.set(lerp(0, 0.2, inv), fl / 2, 0);
  dioP.trash.forEach((m, i) => { const k = clamp((t - E.li - 0.1 - i * 0.12) / 0.5); m.visible = k > 0; m.position.set(m.userData.x, lerp(3, 0.15, k * k) + fl * (k >= 1 ? 1 : 0), m.userData.z); m.rotation.set(m.userData.r + k * 2, m.userData.r, k); });
  const raining = ss(E.ch - 0.6, E.ch, t) * 0.8 + 0.2;
  dioP.drops.forEach(d => { const u = d.userData, life = (t * 0.9 + u.o) % 1; d.visible = life < raining + 0.05; d.position.set(u.x, 8 - life * 8.2, u.z); });
  dioP.arrows.forEach((a, i) => {
    const country = i < 5, life = (t * 0.7 + i * 0.21) % 1;
    if (country) { const sink = sat < 0.7; a.visible = t > E.ch && t < E.ci + 0.5; a.position.set(-13 + i * 2.2 + (sink ? 0 : life * 1.5), sink ? -0.3 - life * 2.2 : 0.3, 2.5); a.rotation.set(0, 0, sink ? Math.PI : -Math.PI / 2); }
    else { a.visible = t > E.as - 0.2 && t < E.inv; a.position.set(14 - life * 6, 0.15, 1.8 + (i % 2) * 0.6); a.rotation.set(0, 0, Math.PI / 2); }
    a.scale.setScalar(1 - Math.abs(life - 0.5) * 0.6);
  });
}
function dioCam(t) {   // a camera move that visits each part as the narrator names it
  const keys = [[T0('explain') + 0.3, V(0, 6, 22), V(0, 1.5, 0)], [E.ab - 0.6, V(-8, 3.2, 12), V(-9, -0.8, 0)], [E.ci - 0.2, V(7, 3.6, 12), V(8, 0.8, 0)], [E.li - 0.2, V(9.8, 3.2, 7.8), V(7.0, 0.2, 0.9)], [E.ri - 0.4, V(0, 3.0, 11), V(0, -0.6, 0)], [E.inv, V(1, 7, 20), V(1, 0.8, 0)]];
  let i = 0; while (i < keys.length - 1 && t > keys[i + 1][0]) i++;
  const a = keys[i], b = keys[Math.min(i + 1, keys.length - 1)], k = b === a ? 1 : ease(clamp((t - a[0]) / Math.max(0.8, Math.min(1.4, b[0] - a[0]))));
  const pos = i === keys.length - 1 ? a[1].clone() : vl(a[1], b[1], k), tgt = i === keys.length - 1 ? a[2].clone() : vl(a[2], b[2], k);
  if (t > E.inv) { const d = t - E.inv; pos.add(V(Math.sin(d * 0.3) * 2, 0, 0)); }
  return { pos: pos.add(DIO), tgt: tgt.add(DIO) };
}
function explain3D(t, g) {
  const lt = t - g.start, a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  const at = (v) => proj(v.clone().add(DIO)), sat = ss(E.ab + 0.3, E.ab + 2.6, t);
  if (t > E.ch - 0.2 && t < E.ci - 0.2) { const [x, y] = at(V(-9, -2.2, 4)); label(sat < 0.5 ? 'O SOLO ABSORVE' : 'ENCHARCADO: NÃO ABSORVE MAIS', clamp(x, 260, 1020), clamp(y, 120, 560), 34, a * ss(E.ch - 0.2, E.ch + 0.2, t), sat < 0.5 ? '#ffffff' : '#ffd23f'); }
  if (t > E.as - 0.2 && t < E.li - 0.2) { const [x, y] = at(V(9, 1.6, 2)); label('ASFALTO NÃO ABSORVE', clamp(x, 260, 1020), clamp(y, 120, 560), 34, a * ss(E.as - 0.2, E.as + 0.2, t)); }
  if (t > E.li - 0.2 && t < E.ri - 0.4) { const [x, y] = at(V(7.2, 1.0, 0.9)); label('LIXO ENTOPE O BUEIRO', clamp(x, 260, 1020), clamp(y - 140, 100, 560), 38, a * ss(E.li, E.li + 0.3, t), '#ffd23f'); }
  if (t > E.ri - 0.4 && t < E.inv - 0.2) { const [x, y] = at(V(0, 1.8, 0)); label(t > E.tr ? 'O RIO TRANSBORDA' : 'O RIO SOBE', clamp(x, 260, 1020), clamp(y, 100, 560), 40, a, '#ffd23f'); }
  if (t > E.inv - 0.2) { const [x, y] = at(V(8, 4.2, 0)); label('A ÁGUA INVADE RUAS E CASAS', clamp(x, 300, 980), clamp(y, 100, 560), 38, a * ss(E.inv - 0.2, E.inv + 0.3, t)); }
  chip('COMO ACONTECE UMA ENCHENTE');
}

function world(t, n, lt) {
  const gag = GAGN.includes(n), Lraw = floodD(t), L = ROAD.y + Lraw;
  const storm = n === 'end' ? 0 : (t < R0 && !gag ? 0.92 : 1);
  trees.forEach(tr => { tr.rotation.z = 0.025 * storm * Math.sin(t * 2.1 + tr.userData.ph); tr.rotation.x = 0.02 * storm * Math.sin(t * 1.7 + tr.userData.ph); });
  canalWater.position.y = Math.min(0.2 + 0.6 * ss(R0 - 2, R0 + 4, t), 0.9); canalWater.visible = !(floodD(t) > 0);
  palms.forEach(pl => { const top = pl.userData.top; pl.rotation.x = 0.05 * storm * Math.sin(t * 2.3 + pl.userData.ph); pl.rotation.z = 0.04 * storm * Math.sin(t * 1.9 + pl.userData.ph); top.children.forEach((h, i) => h.rotation.z = 0.12 * storm * Math.sin(t * 4 + i + pl.userData.ph)); });
  [umbrella, cooler, ball, lounger, towel].forEach(o => o.visible = false); fishes.forEach(f => f.visible = false); hatF.visible = shadesF.visible = false; sign.visible = false;
  cars.forEach(c => { if (c !== myCar || !(n === 'car2' || n === 'carfloat')) { c.position.copy(c.userData.home); c.rotation.set(0, 0.04, 0); } });
  // street water + things carried by the current
  updateFlood(t, Lraw > 0 ? L : -1);
  debris.forEach((d, i) => { const u = d.userData; d.visible = debrisOn(n) && Lraw > 0.2; if (!d.visible) return; const span = 60, x = ((u.x + 30 - t * u.sp * 1.4) % span + span) % span - 22; d.position.set(x, L + 0.05 + 0.05 * Math.sin(t * 2 + u.ph), 14.1 + (i % 3) * 0.7); d.rotation.set(0.1 * Math.sin(t + u.ph), u.ph + t * 0.2 * (i % 2 ? 1 : -1), 0); });
  // manhole: the cover pops off (hidden), then a whirlpool hides the open hole
  const popT = W_BUEIROS + 0.3, popped = t > popT && !gag && n !== 'end';
  manCover.visible = n !== 'end' || true;
  if (!popped) { manCover.position.set(MAN.x, ROAD.y + 0.1, MAN.z); manCover.rotation.set(0, 0, 0); }
  else { const k = clamp((t - popT) / 0.9); manCover.position.set(MAN.x + 1.3 * k, ROAD.y + 0.1 + 1.6 * Math.sin(k * Math.PI) + (L - ROAD.y - 0.05) * 0 , MAN.z + 1.0 * k); manCover.rotation.set(k * 5, 0, k * 2); if (k >= 1) { manCover.position.set(MAN.x + 1.3, ROAD.y + 0.1, MAN.z + 1.0); manCover.rotation.set(0, 0, 0.0); } }
  manHole.visible = popped;
  geyser.visible = !gag && t > popT - 0.4 && t < popT + 1.3 && Lraw > 0; if (geyser.visible) { const k = clamp((t - popT + 0.4) / 1.7), h = 2.4 * Math.sin(k * Math.PI); geyser.scale.set(1, Math.max(0.01, h), 1); geyser.position.set(MAN.x, L + h / 2, MAN.z); }
  swirl.visible = popped && Lraw > 0; swirl.position.set(MAN.x, L + 0.06, MAN.z); swirl.rotation.z = t * 3;
  // rescue boat coming up the street
  boat.visible = false;
  if (boat.visible) { const k = ss(T0('wait'), T0('q1'), t); boat.position.set(lerp(34, 18, k), L - 0.12 + 0.04 * Math.sin(t * 2.5), 9.6); boat.rotation.set(0, 0.03 * Math.sin(t), 0.03 * Math.sin(t * 1.3)); boat.userData.light.material.color.setHex(Math.floor(t * 4) % 2 ? 0xff3030 : 0x3060ff); }
  // the broken power line
  const snap = ['wire', 'q1'].includes(n) && t > W_FIO;
  wires.children[2].visible = !snap; wireHalves.forEach(w => { w.visible = snap; const k = clamp((t - W_FIO) / 0.5); w.rotation.z = w.userData.dir * -Math.min(1.25, k * k * 1.25 + 0.02 * Math.sin(t * 9)); });
  sparks.visible = snap && t < W_FIO + 3.5 && Lraw > 0;
  if (sparks.visible) { const tip = []; wireHalves.forEach(w => { const v = V(w.userData.dir * (poles[1].position.x - poles[0].position.x) / 2, 0, 0).applyEuler(w.rotation).add(w.position); tip.push(v); }); for (let i = 0; i < 60; i++) { const tp = tip[i % 2], a = i * 2.4 + t * 13, r = ((t * 3 + i * 0.37) % 1) * 0.9; sparkP[i * 3] = tp.x + Math.cos(a) * r; sparkP[i * 3 + 1] = Math.max(L, tp.y) + Math.abs(Math.sin(a * 1.3)) * r; sparkP[i * 3 + 2] = tp.z + Math.sin(a) * r; } sparkG.attributes.position.needsUpdate = true; }
  updateGulls(t, t, 0); gulls.forEach(g => g.visible = n === 'end');
  // sky: storm (or the sunset after the rain, at the end)
  const eve = n === 'end' ? 1 : 0, b = bolt(t);
  skyU.top.value.set(0x2f7fd8).lerp(new THREE.Color(0x4a5562), storm * 0.95).lerp(new THREE.Color(0x3b5aa8), eve * 0.8); skyU.bot.value.set(0xbfe6ff).lerp(new THREE.Color(0x98a2ab), storm * 0.95).lerp(new THREE.Color(0xffc48a), eve * 0.9);
  skyU.top.value.lerp(new THREE.Color(0xdfe8ff), b * 0.5); skyU.bot.value.lerp(new THREE.Color(0xffffff), b * 0.4);
  skyU.sunCol.value.setScalar(storm > 0.5 ? 0 : 1).multiply(new THREE.Color(0xfff2c0));
  scene.fog.color.copy(skyU.bot.value); scene.fog.near = lerp(110, 35, storm); scene.fog.far = lerp(460, 230, storm);
  const inside = APTN.includes(n) || gag || n === 'kit' || isIndoorShot(n, lt) || (n === 'rule' && lt < W_NUNCA - S.rule.start - 0.3);
  sun.intensity = inside ? (powerOff ? 0.7 : 1.4) : lerp(2.6, 0.8, storm) + b * 2; sun.color.set(0xfff1d6).lerp(new THREE.Color(0xffb070), eve);
  hemi.intensity = inside ? (powerOff ? 1.2 : 1.25) : lerp(0.9, 1.25, storm);
  clouds.position.x = t * 0.6; clouds.children.forEach(c => c.children.forEach(m => m.material.color.setHex(storm > 0.5 ? 0x8a939c : 0xffffff)));
  stormM.opacity = storm * 0.95; stormG.visible = storm > 0;
  sunSprite.visible = sunHalo.visible = !inside && storm < 0.5;
  rainbow.visible = n === 'end'; rainbow.children.forEach(m => m.material.opacity = 0.45 * ss(T0('end') + 0.3, T0('end') + 2, t));
  apt.visible = APTN.includes(n) || gag || (n === 'rain' && isIndoorShot(n, lt)) || (n === 'rule' && lt < W_SUBA - S.rule.start - 0.2) || (n === 'home' && isIndoorShot(n, lt));
  interior.visible = (n === 'high' && isIndoorShot(n, lt)) || n === 'kit' || (n === 'rule' && lt >= W_SUBA - S.rule.start - 0.2 && lt < W_NUNCA - S.rule.start - 0.3);
  lobbyW.visible = interior.visible;
  building.userData.hinge.rotation.y = ['gag1', 'gag2', 'gag3', 'germs'].includes(n) ? -1.7 : 0;
  water.visible = false; spray.visible = false;
  dio.visible = n === 'explain'; if (dio.visible) updateDio(t);
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

const HL = [];
function stars(x, y, k) { for (let i = 0; i < 5; i++) { const an = k * 4 + i / 5 * Math.PI * 2; ui.save(); ui.translate(x + Math.cos(an) * 70, y + Math.sin(an) * 22); ui.rotate(k * 5 + i); ui.fillStyle = '#ffd23f'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 3; ui.beginPath(); for (let j = 0; j < 10; j++) { const r2 = j % 2 ? 7 : 16, a2 = j / 10 * Math.PI * 2; ui.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2); } ui.closePath(); ui.fill(); ui.stroke(); ui.restore(); } }
function smoke(x, y, k, n2 = 9) { for (let i = 0; i < n2; i++) { const ang = i / n2 * Math.PI * 2, rad = 20 + k * 90; ui.fillStyle = `rgba(90,90,90,${0.55 * (1 - k / 0.9)})`; ui.beginPath(); ui.arc(x + Math.cos(ang) * rad, y - 60 - k * 80 + Math.sin(ang) * rad * 0.5, 26 + k * 30, 0, Math.PI * 2); ui.fill(); } }
function chip(text) { ui.save(); ui.textAlign = 'left'; ui.font = '900 18px "Inter Display"'; const tw2 = ui.measureText(text).width; ui.fillStyle = 'rgba(10,20,40,0.75)'; rr(1260 - tw2 - 36, 20, tw2 + 36, 40, 20); ui.fill(); ui.fillStyle = '#fff'; ui.textBaseline = 'middle'; ui.fillText(text, 1260 - tw2 - 18, 41); ui.restore(); }
function arrowShape(x, y, dir, len, w, col) { ui.save(); ui.translate(x, y); ui.rotate(dir); ui.fillStyle = col; ui.strokeStyle = '#0a1428'; ui.lineWidth = 3; ui.beginPath(); ui.moveTo(0, -w / 2); ui.lineTo(len - w, -w / 2); ui.lineTo(len - w, -w); ui.lineTo(len, 0); ui.lineTo(len - w, w); ui.lineTo(len - w, w / 2); ui.lineTo(0, w / 2); ui.closePath(); ui.fill(); ui.stroke(); ui.restore(); }
function label(text, x, y, size, a, col = '#ffffff', stroke = '#0a1428') { if (a <= 0) return; ui.save(); ui.globalAlpha *= a; ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined(text, x, y, size, col, stroke, 900, 0.2); ui.restore(); }
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
  const bg = ui.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#13304f'); bg.addColorStop(1, '#0a1a2c'); ui.fillStyle = bg; ui.fillRect(0, 0, W, H);
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
  ui.save(); ui.globalAlpha = a; ui.translate(1010, 330); const s = pop(t - g.start - 0.3, 0.35); ui.scale(s, s);
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
  if (txt) { const tx = x - Math.cos(ang) * (d + 150), ty = y - Math.sin(ang) * (d + 150); label(txt, clamp(tx, 140, 1140), clamp(ty, 70, 570), 34, a, col === '#ffd23f' ? '#ffffff' : col); }
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
  const ts = [wordAt('não', T0('tv2')), wordAt('plano', T0('car2')), T0('stayrise') + 1.2, wordAt('não', T0('gag1b'))];
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
  { from: T0('tv1'), to: TE('tv2'), title: 'ENERGIA', items: [['LIGAR A TV', T0('tv1') + 0.3, wordAt('não', T0('tv2')), false], ['DESLIGAR A ENERGIA', W_CERTO, wordAt('assim', T0('tv2')), true]] },
  { from: T0('car1'), to: TE('high'), title: 'FUGIR DA ÁGUA', items: [['PEGAR O CARRO', T0('car1') + 0.3, wordAt('plano', T0('car2')), false], ['FICAR EM CASA', T0('stay1') + 0.3, T0('stayrise') + 1.2, false], ['LUGAR MAIS ALTO', wordAt('alto', T0('idea')), wordAt('assim', T0('high')), true]] },
  { from: T0('gag1'), to: TE('wait2'), title: 'A PRANCHA', items: [['IR ANDANDO NA ÁGUA', T0('gag1') + 0.5, wordAt('não', T0('gag1b')), false], ['FICAR NO ALTO E LIGAR 193', T0('wait') + 0.5, wordAt('assim', T0('wait2')), true]] },
];
function planCard(t, n) {
  if (['replay', 'replay2'].includes(n)) return;
  const P = PLANS().find(p => t >= p.from && t < p.to); if (!P) return;
  if (n === 'gag1b' && t < W_BUEIROS - 0.3) return;
  if (n === 'wait2' && t < wordAt('desça', T0('wait2')) - 0.3) return;
  const vis = P.items.filter(it => t > it[1]); if (!vis.length) return;
  ui.save(); ui.globalAlpha = ss(P.from, P.from + 0.4, t) * (1 - ss(P.to - 0.3, P.to, t));
  const x0 = 40, y0 = 118, rowH = 52, w2 = 410;
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
function proj(v) { const s = v.clone().project(camera); return [(s.x * 0.5 + 0.5) * W, (-s.y * 0.5 + 0.5) * H]; }
function overlay(t, g) {
  ui.clearRect(0, 0, W, H);
  const lt = t - g.start, n = g.scene, fadeIn = ss(0, 0.3, lt);
  if (n === 'explain') explain3D(t, g);
  if (n === 'depth') depthGauge(t, g);
  if (n === 'title' && !NOTITLE) {
    if (lt > 0.6) { const s = pop(lt - 0.6, 0.5); ui.save(); ui.translate(640, 300); ui.scale(s, s); ui.rotate(-0.02); ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.globalAlpha = 1 - ss(g.dur - 0.6, g.dur, lt); outlined('Você sobreviveria', 0, -55, 72, '#ffffff', '#0a2a4a', 900, 0.18); outlined('a uma ENCHENTE?', 0, 45, 100, '#5fd0ff', '#0a2a4a', 900, 0.18); ui.restore(); }
    ui.save(); ui.globalAlpha = ss(0, 1, lt) * (1 - ss(g.dur - 0.6, g.dur, lt)); ui.textAlign = 'center'; outlined('GUIA DE SOBREVIVÊNCIA  •  EPISÓDIO 3', 640, 110, 26, '#ffffff', '#0a2a4a', 800, 0.2); ui.restore();
  }
  if (n === 'home') { const c2 = wordAt('cachorro', g.start) - g.start; if (lt > c2) { ui.save(); ui.textAlign = 'center'; const [x, y] = [760, 300]; for (let i = 0; i < 3; i++) { const life = (lt * 0.6 + i / 3) % 1; ui.globalAlpha = 1 - life; outlined('z', x + i * 26 + life * 30, y - life * 110, 30 + i * 8, '#ffffff', '#0a1428', 900, 0.2); } ui.restore(); } }
  if (['rain', 'friend1'].includes(n) && t > R0) badge('⚠ ALERTA DE ENCHENTE', ss(R0, R0 + 0.3, t), '#c62828');
  if (n === 'friend1') { const k = lt - 0.2; if (k > 0) { const [hx, hy] = headOnScreen(friend); questionMarks(k, clamp(hx, 300, 980), clamp(hy, 300, 420)); } }
  if (n === 'pause') { ui.save(); ui.fillStyle = 'rgba(20,30,50,0.35)'; ui.fillRect(0, 0, W, H); ui.globalAlpha = ss(0.1, 0.4, lt); ui.fillStyle = '#ffffff'; ui.fillRect(1120, 50, 26, 80); ui.fillRect(1166, 50, 26, 80); ui.textAlign = 'center'; outlined('PAUSA', 1156, 160, 26, '#ffffff', '#0a1428', 900, 0.2); ui.restore(); }
  if (n === 'car2' || n === 'carfloat') {
    badge('✗ PÉSSIMA IDEIA', n === 'car2' ? ss(0, 0.3, lt) : 1, '#c62828');
    if (n === 'carfloat') { const [x, y] = headOnScreen(friend, 0.6); for (let k = 0; k < 3; k++) { const at = 1.2 + k * 0.45; if (lt > at && lt < at + 0.4) { ui.save(); ui.textAlign = 'center'; ui.translate(x + 150, y - 30 - k * 30); const s2 = pop(lt - at, 0.15); ui.scale(s2, s2); ui.rotate(-0.1); outlined('BI-BI!', 0, 0, 52, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); } } if (lt > 0.5 && lt < 2.2) { ui.save(); ui.textAlign = 'center'; ui.globalAlpha = 1 - ss(1.6, 2.2, lt); ui.translate(x - 160, y - 40); ui.rotate(0.08); outlined('BLUB!', 0, 0, 60, '#5fd0ff', '#0a1428', 900, 0.18); ui.restore(); } }
  }
  if (n === 'replay' || n === 'replay2') vhs(t, lt);
  if (n === 'tv1') { const [x, y] = proj(AP(-1.0, 1.2, 2.9)); pointer(x, y, -0.5, 'TV', g.start + 0.6, t); }
  if (n === 'tv2') {
    if (t < W_CERTO - 0.2) { const [x, y] = proj(AP(0.9, 0.34, -3.47)); pointer(x - 20, y - 20, -2.4, 'TOMADA', g.start + 0.2, t); const wch = wordAt('tomadas', g.start) - 0.2; if (t > wch) { bolts(x, y, t, 130); if (Math.floor(t * 15) % 3 === 0) { ui.fillStyle = 'rgba(180,220,255,0.18)'; ui.fillRect(0, 0, W, H); } } }
    else if (t < W_ENERGIA + 0.5) { const [x, y] = proj(AP(4.5, 1.35, 1.3)); pointer(x - 10, y, Math.PI * 0.15, 'QUADRO DE LUZ', W_CERTO, t); }
  }
  if (n === 'car2' && t > W_BOIAR) { const [x, y] = proj(myCar.position.clone().add(V(0, 1.4, 0))); pointer(x, y, Math.PI * 0.7, '', W_BOIAR, t); label('50 cm DE CORRENTEZA = CARRO BOIA', 880, 140, 36, ss(W_BOIAR, W_BOIAR + 0.3, t), '#ffd23f'); }
  if (n === 'stayrise') upArrows(lt, 1020, '');
  if (n === 'high' && t < W_TELHADO - 0.2) upArrows(lt, 1020, 'PRO ALTO!');
  if (n === 'gag1b' && t > W_BUEIROS + 1.2) { const [x, y] = proj(V(MAN.x, ROAD.y + 0.5, MAN.z)); pointer(x, y, Math.PI / 2, 'BUEIRO ABERTO!', W_BUEIROS + 1.2, t, '#ff6b5a'); }
  if (n === 'germs' && t > W_LAVE) { const [x, y] = headOnScreen(hero, 0.1); pointer(x + 60, y + 40, Math.PI * 0.85, 'SABÃO', W_LAVE, t); }
  if (n === 'rise') upArrows(lt, 1020, 'A ÁGUA SOBE');
  if (n === 'tv2') {
    if (t < W_CERTO - 0.2) { label('ÁGUA + TOMADA = CHOQUE', 760, 560, 44, ss(W_TOMADAS - 0.3, W_TOMADAS, t), '#ffd23f'); }
    if (t > W_ENERGIA + 0.4 && t < W_ENERGIA + 1.8) { const [x, y] = proj(AP(4.5, 1.6, 1.3)); ui.save(); ui.textAlign = 'center'; ui.translate(x - 120, y - 60); const s2 = pop(t - W_ENERGIA - 0.4, 0.2); ui.scale(s2, s2); ui.rotate(-0.1); outlined('CLACK!', 0, 0, 60, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); }
  }
  if (n === 'stayrise' && lt > 0.8) label('✗ A ÁGUA CONTINUA SUBINDO', 860, 250, 42, ss(0.8, 1.1, lt), '#ffffff', '#c62828');
  if (n === 'gag1b') { if (t < W_BUEIROS - 0.3) depthGauge(t, g); else { const popT = W_BUEIROS + 0.3; if (t > popT && t < popT + 1.4) { const [x, y] = proj(V(MAN.x, ROAD.y + 2, MAN.z)); ui.save(); ui.textAlign = 'center'; ui.translate(x + 60, y - 60); const s2 = pop(t - popT, 0.2); ui.scale(s2, s2); ui.rotate(-0.1); outlined('PLOC!', 0, 0, 70, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); } manholeInset(t, ss(popT + 0.9, popT + 1.3, t)); } }
  if (n === 'wait2') { const wD = wordAt('desça', g.start); phoneDial(t, g, wD); if (t > wD - 0.2) label('SÓ DESÇA QUANDO LIBERAREM', 860, 120, 40, ss(wD - 0.2, wD + 0.2, t), '#5ff08a'); }
  if (n === 'idea') { const [x, y] = headOnScreen(hero, 1.0); lightbulb(x, y - 70, lt); }
  if (n === 'rule') {
    badge('★ REGRA DE OURO', fadeIn, '#1e9e57'); steps3(t, g);
    if (t > W_ENERGIA + 0.4 && t < W_TOMADAS - 0.3) { const [x, y] = proj(AP(4.5, 1.6, 1.3)); ui.save(); ui.textAlign = 'center'; ui.translate(x - 120, y - 60); const s2 = pop(t - W_ENERGIA - 0.4, 0.2); ui.scale(s2, s2); ui.rotate(-0.1); outlined('CLACK!', 0, 0, 60, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); }
    if (t > W_TOMADAS - 0.3 && t < W_SUBA - 0.2) { const [x, y] = proj(AP(0.9, 0.36, -3.47)); ui.save(); ui.globalAlpha = ss(W_TOMADAS - 0.3, W_TOMADAS, t); ui.strokeStyle = '#ffe14d'; ui.lineWidth = 6; ui.lineCap = 'round'; for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2 + t * 3, r1 = 70, r2 = 110 + 15 * Math.sin(t * 20 + i); ui.beginPath(); ui.moveTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ui.lineTo(x + Math.cos(an + 0.2) * (r1 + r2) / 2, y + Math.sin(an + 0.2) * (r1 + r2) / 2); ui.lineTo(x + Math.cos(an) * r2, y + Math.sin(an) * r2); ui.stroke(); } ui.restore(); label('ÁGUA + TOMADA = CHOQUE', 760, 560, 44, ss(W_TOMADAS - 0.3, W_TOMADAS, t), '#ffd23f'); }
    if (t > W_NUNCA - 0.3) label('✗ CORRENTEZA', 900, 560, 56, ss(W_NUNCA - 0.3, W_NUNCA, t), '#ffffff', '#c62828');
  }
  if (n === 'kit') { badge('✓ KIT DE EMERGÊNCIA', fadeIn, '#1557b0'); kitCards(t, g); }
  if (n === 'outside') {
    if (t < W_TUNEIS - 0.4) { badge('NA RUA: LUGAR ALTO', fadeIn, '#1557b0'); const [x, y] = proj(V(TOP.x, 14, TOP.z)); const k = ss(g.start + 0.5, g.start + 0.9, t); ui.save(); ui.globalAlpha = k; arrowShape(clamp(x, 120, 1100), clamp(y, 160, 600) + 90, -Math.PI / 2, 90 + 10 * Math.sin(t * 6), 30, '#5ff08a'); ui.restore(); label('✗ RIOS E CÓRREGOS', 900, 150, 40, ss(wordAt('rios', g.start), wordAt('rios', g.start) + 0.3, t), '#ffffff', '#c62828'); }
    else { badge('✗ TÚNEIS  ✗ PASSAGENS SUBTERRÂNEAS', 1, '#c62828'); const we = wordAt('enchem', g.start); label('ENCHEM PRIMEIRO!', 640, 200, 64, ss(we, we + 0.3, t), '#ffd23f'); }
  }
  if (n === 'hidden') {
    badge('⚠ PERIGO ESCONDIDO', fadeIn, '#c25a12');
    const popT = W_ARRANCAR + 0.6;
    if (t > popT && t < popT + 1.4) { const [x, y] = proj(V(MAN.x, ROAD.y + 2, MAN.z)); ui.save(); ui.textAlign = 'center'; ui.translate(x + 60, y - 60); const s2 = pop(t - popT, 0.2); ui.scale(s2, s2); ui.rotate(-0.1); outlined('PLOC!', 0, 0, 70, '#ffd23f', '#0a1428', 900, 0.18); ui.restore(); }
    manholeInset(t, ss(W_BARRENTA + 0.3, W_BARRENTA + 0.7, t));
  }
  if (n === 'gag2') {
    if (t < PLOFT) { const [x, y] = headOnScreen(hero, 0.9); if (lt > 0.3) { ui.save(); ui.textAlign = 'center'; ui.translate(x, Math.max(90, y - 110)); const s2 = pop(lt - 0.3, 0.25); ui.scale(s2, s2); outlined('NÃÃÃO!', 0, 0, 60, '#ff6b5a', '#0a1428', 900, 0.18); ui.restore(); } }
    if (t > PLOFT && t < PLOFT + 1.4) { const [x, y] = proj(V(MAN.x, ROAD.y + 0.5, MAN.z)); const k = t - PLOFT; ui.save(); ui.strokeStyle = 'rgba(240,230,210,0.9)'; ui.lineWidth = 6; for (let r = 0; r < 3; r++) { const rad = 30 + (k * 180 + r * 40); ui.globalAlpha = Math.max(0, 1 - k / 1.2); ui.beginPath(); ui.ellipse(x, y + 40, rad, rad * 0.3, 0, 0, Math.PI * 2); ui.stroke(); } ui.restore(); ui.save(); ui.textAlign = 'center'; ui.translate(x + 40, y - 120); const s2 = pop(k, 0.2); ui.scale(s2, s2); ui.rotate(-0.1); outlined('PLOFT!', 0, 0, 84, '#ffd23f', '#0a1428', 900, 0.17); ui.restore(); }
    if (t > POPUP + 0.6 && t < PLOFT + 1.2) { }
  }
  if (n === 'gag3') { const [x, y] = headOnScreen(friend, 0.95); for (let i = 0; i < 3; i++) { const life = (lt * 1.2 + i / 3) % 1; ui.fillStyle = `rgba(110,80,45,${0.8 * (1 - life)})`; ui.beginPath(); ui.ellipse(x - 40 + i * 40, y + 20 + life * 90, 6, 10, 0, 0, Math.PI * 2); ui.fill(); } }
  if (n === 'germs') {
    const wx = wordAt('xixi', g.start), wl = W_LAVE, wle = wordAt('leptospirose', g.start);
    if (t < wl - 0.2) { const k = ss(g.start + 0.3, g.start + 0.7, t); ui.save(); ui.globalAlpha = k; ui.fillStyle = 'rgba(10,20,40,0.82)'; rr(820, 70, 420, 260, 22); ui.fill(); ui.restore(); if (k > 0) { ui.save(); ui.globalAlpha = k; icon('germ', 900, 150, 1); icon('germ', 1000, 120, 0.7); if (t > wx - 0.2) icon('rat', 1130, 160, 0.9 * pop(t - wx + 0.2, 0.3)); ui.restore(); label('ESGOTO + XIXI DE RATO', 1030, 250, 30, k, '#ffffff'); label('= LEPTOSPIROSE', 1030, 295, 34, ss(wle - 0.2, wle + 0.2, t), '#ff6b5a'); } }
    else { const k = ss(wl - 0.2, wl + 0.2, t); ui.save(); ui.globalAlpha = k; ui.fillStyle = 'rgba(10,20,40,0.82)'; rr(860, 90, 360, 200, 22); ui.fill(); icon('soap', 1040, 165, 1.2); ui.restore(); label('✓ ÁGUA E SABÃO', 1040, 250, 34, k, '#5ff08a'); const [x, y] = headOnScreen(friend, 0.4); if (t > W_SABAO) for (let i = 0; i < 10; i++) { const life = (lt * 0.8 + i / 10) % 1; ui.save(); ui.globalAlpha = 0.8 * (1 - life); ui.strokeStyle = '#fff'; ui.lineWidth = 3; ui.fillStyle = 'rgba(220,240,255,0.5)'; ui.beginPath(); ui.arc(x + Math.sin(i * 2.1 + lt * 2) * 90, y - life * 160 + 40, 10 + (i % 3) * 6, 0, Math.PI * 2); ui.fill(); ui.stroke(); ui.restore(); } }
  }
  if (n === 'wire') { label('LEMBRA DO EP. 1?', 640, 110, 54, ss(0.1, 0.4, lt), '#ffd23f'); if (t > W_FIO) { const k = t - W_FIO; if (k < 0.15) { ui.fillStyle = `rgba(200,230,255,${0.6 * (1 - k / 0.15)})`; ui.fillRect(0, 0, W, H); } label('⚡ FIO SOLTO NA ÁGUA = CHOQUE', 640, 180, 40, ss(W_FIO + 0.2, W_FIO + 0.5, t), '#ffffff', '#c62828'); } }
  if (n === 'q1') { ui.save(); ui.translate(940, 200); const s = pop(lt - 0.2); ui.scale(s, s); ui.rotate(0.05); ui.textAlign = 'center'; outlined('SEGUIR AS DICAS ✓', 0, 0, 50, '#5ff08a', '#0a1428', 900, 0.2); ui.restore(); }
  if (['q2', 'q3', 'q4'].includes(n)) { ui.save(); ui.translate(320, 200); const s = pop(t - T0('q2') - 0.2); ui.scale(s, s); ui.rotate(-0.05); ui.textAlign = 'center'; outlined('VER FILME NO SOFÁ', 0, 0, 50, '#ffd23f', '#0a1428', 900, 0.2); ui.restore(); }
  if (n === 'float') {
    const k = t - BONK_T;
    if (k > 0 && k < 1.3) { const [x, y] = headOnScreen(hero, 1.0); stars(x + 60, y - 10, k); ui.save(); ui.textAlign = 'center'; ui.translate(x + 120, y - 70); const s2 = pop(k, 0.18); ui.scale(s2, s2); ui.rotate(-0.1); outlined('TUM!', 0, 0, 80, '#ffd23f', '#0a1428', 900, 0.17); ui.restore(); }
    if (k > 0.9) { const [x, y] = headOnScreen(friend, 0.1); for (let i = 0; i < 6; i++) { const life = (lt * 0.9 + i / 6) % 1; ui.save(); ui.globalAlpha = 0.85 * (1 - life); ui.strokeStyle = '#fff'; ui.lineWidth = 3; ui.fillStyle = 'rgba(200,230,255,0.45)'; ui.beginPath(); ui.arc(x - 60 + i * 26, y - life * 120, 7 + (i % 3) * 4, 0, Math.PI * 2); ui.fill(); ui.stroke(); ui.restore(); } if (k > 1.6) label('blub... blub...', 760, 170, 48, ss(1.6, 2.0, k), '#ffffff'); }
  }
  if (n === 'end') {
    // ask the viewer to comment: "sobrevivi" or "não consegui"
    const w1 = wordAt('sobrevivi', wordAt('comente', g.start) + 0.1), w2 = wordAt('não', w1 + 0.1);
    const bubble = (x, y, txt, col, at, ic) => { const a = ss(at - 0.2, at + 0.15, t); if (a <= 0) return; ui.save(); ui.globalAlpha = a; ui.translate(x, y); const s2 = pop(t - at + 0.2, 0.3); ui.scale(s2, s2); ui.rotate(Math.sin((t - at) * 3) * 0.03);
      ui.font = '900 46px "Inter Display"'; const tw = ui.measureText(txt).width + 130; ui.fillStyle = '#ffffff'; rr(-tw / 2, -50, tw, 100, 30); ui.fill(); ui.beginPath(); ui.moveTo(-tw / 2 + 40, 44); ui.lineTo(-tw / 2 + 30, 82); ui.lineTo(-tw / 2 + 80, 48); ui.fill();
      ui.lineWidth = 6; ui.strokeStyle = col; rr(-tw / 2, -50, tw, 100, 30); ui.stroke();
      ui.fillStyle = col; ui.beginPath(); ui.arc(-tw / 2 + 55, 0, 30, 0, Math.PI * 2); ui.fill(); ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined(ic, -tw / 2 + 55, 3, 36, '#ffffff', col, 900, 0.05);
      ui.textAlign = 'left'; ui.fillStyle = '#1b1b1b'; ui.fillText(txt, -tw / 2 + 100, 4); ui.restore(); };
    ui.save(); ui.globalAlpha = ss(0.2, 0.6, lt); ui.textAlign = 'center'; ui.textBaseline = 'middle'; outlined('COMENTE AÍ!', 640, 90, 54, '#ffd23f', '#0a1428', 900, 0.18); ui.restore();
    bubble(420, 250, 'SOBREVIVI', '#1e9e57', w1, '✓');
    bubble(860, 400, 'NÃO CONSEGUI', '#c62828', w2, '✗');
  }
  if (n !== 'title' && !NOCAP) caption(t);
  const b = bolt(t); if (b > 0 && !['explain', 'depth'].includes(n)) { ui.fillStyle = `rgba(235,240,255,${0.35 * b})`; ui.fillRect(0, 0, W, H); }
  if (flash > 0) { ui.fillStyle = `rgba(255,255,255,${flash})`; ui.fillRect(0, 0, W, H); }
  if (t < 0.5) { ui.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; ui.fillRect(0, 0, W, H); }
  const fo = ss(TL.total - 1.0, TL.total, t); if (fo > 0) { ui.fillStyle = `rgba(0,0,0,${fo})`; ui.fillRect(0, 0, W, H); }
}

window.renderFrame = (t) => {
  REAL_T = t;
  let g = seg(t), tt = t;
  if (g.scene === 'pause') tt = g.start;                         // freeze frame
  if (g.scene === 'replay2') { const k = ease(clamp((t - g.start) / (g.dur - 0.2))); tt = lerp(TE('stayrise') - 0.05, T0('stay1') + 0.3, k); }
  if (g.scene === 'replay') { const k = ease(clamp((t - g.start) / (g.dur - 0.2))); tt = lerp(TE('carfloat') - 0.05, T0('car2') + 0.3, k); }   // rewind the bad idea
  const gs = seg(tt), lt = tt - gs.start;
  const H2 = updateHouse(tt, gs.scene, lt);
  const wv = world(tt, gs.scene, lt); direct(tt, gs.scene, lt, gs, H2);
  updateRain(tt, wv.inside || ['explain', 'depth'].includes(gs.scene) ? 0 : (gs.scene === 'end' ? 0 : wv.storm));
  sunSprite.position.copy(camera.position).addScaledVector(skyU.sunDir.value, 420); sunHalo.position.copy(sunSprite.position);
  if (apt.visible) {
    const wp = bw(1.0, 1.9, -4.35), wt = bw(1.0, 1.2, -16); winCam.position.copy(wp); winCam.lookAt(wt);
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
