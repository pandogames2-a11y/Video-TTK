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
let GAG = false, REAL_T = 0;   // GAG: the "keep sunbathing and surfing" ending (sea not receded, friend surfing)
function T0(n) { return S[n].start; } function TE(n) { return S[n].start + S[n].dur; }
function seaBase(t) { if (GAG) return 0; const r0 = T0('recede') + 1.6; return lerp(0, -2.4, ss(r0, r0 + 3.2, t)); }
const HIT = T0('hit');
function front(t) {
  if (t < T0('twist') + 1.0) return -400;
  if (t < T0('horizon')) return lerp(-232, -205, clamp((t - T0('twist') - 1) / (T0('horizon') - T0('twist') - 1)));
  if (t < T0('idea')) return lerp(-205, -175, clamp((t - T0('horizon')) / (T0('idea') - T0('horizon'))));
  if (t < HIT) return lerp(-175, -75, clamp((t - T0('idea')) / (HIT - T0('idea'))));
  const u = t - HIT;
  if (u < 2.6) return lerp(-75, 0, u / 2.6);
  if (u < 6.5) return lerp(0, 75, (u - 2.6) / 3.9);
  return 75 + (u - 6.5) * 8;
}
const waveForm = t => ss(T0('twist') + 1.0, T0('horizon') + 1.0, t);   // the wall rises out of the sea
function flood(t) { return lerp(3.3, 1.3, ss(T0('backwash') + 1.5, TE('backwash') - 1.5, t)); }
const backflow = t => ss(T0('backwash') + 0.5, TE('backwash') - 1, t);  // 0 → water pushing inland, 1 → rushing back out
function secondFront(t) { const a = T0('safe') + 3.0; return t < a ? -400 : lerp(-200, 80, clamp((t - a) / 7)); }
const SURF_T = (TL.caps.find(c => c.text.toLowerCase().includes('som gostoso')) || { t0: 9 }).t0;
const TS1 = T0('gulp1') + 0.3, TS2 = T0('swallow') + 0.5;   // gag: friend swallowed, then hero
function surferAt(t) {
  if (GAG) { const x = 5.5 - (REAL_T - T0('q2')) * 0.8, z = -3.6 + 0.25 * Math.sin(REAL_T * 0.9); return { x, z, on: REAL_T < TS1 + 0.05 }; }
  const tEnd = T0('recede') + 1.4, k = (t - SURF_T) / (tEnd - SURF_T);
  const x = k < 0 ? 12 - k * (tEnd - SURF_T) * 0.6 : lerp(12, 2.4, k), z = lerp(-9.6, -15, clamp(k)) + 0.5 * Math.sin(t * 0.6) * (1 - clamp(k));
  return { x, z, on: t < tEnd };
}
const swellOf = (x, z, t) => Math.sin(0.22 * z - 1.0 * t + 0.08 * x);
function waterH(x, z, t) {
  const zf = front(t), base = seaBase(t);
  let h;
  if (zf < -300) h = base;
  else {
    const s = ss(zf, zf - 6, z);
    h = lerp(base, flood(t), s);
    const grow = lerp(7, 10.5, ss(-200, -20, zf)) * (1 - ss(15, 70, zf) * 0.65) * waveForm(t);
    const dz = z - (zf - 3.0);
    h += grow * Math.exp(-Math.pow(dz / (dz > 0 ? 2.2 : 6.0), 2));
    if (z > zf - 4) h += 0.6 * Math.sin(x * 0.7 + t * 6) * ss(zf + 1, zf - 2, z) * ss(zf - 4, zf - 2, z);
  }
  const z2 = secondFront(t);
  if (z2 > -300) h += 1.6 * Math.exp(-Math.pow((z - z2) / 4, 2));
  const rough = 1 + (zf > -300 ? 2.5 * ss(-10, 10, zf) : 0);
  h += rough * (0.07 * Math.sin(0.45 * x + 1.2 * t) + 0.06 * Math.sin(0.6 * z - 1.6 * t + x * 0.2) + 0.035 * Math.sin(1.7 * x + 2.3 * z + 2.9 * t));
  // gentle 3D swells offshore
  const off = ss(-6, -40, z);
  h += off * (0.2 * swellOf(x, z, t) + 0.09 * Math.sin(0.31 * x + 0.17 * z - 1.3 * t) + 0.05 * Math.sin(0.9 * x - 0.5 * z + 2.1 * t));
  { const sf = surferAt(t); if (sf.on) h += 0.6 * Math.exp(-Math.pow((z - sf.z + 0.3) / 1.9, 2)) * Math.exp(-Math.pow((x - sf.x - 1.5) / 9, 2)); }
  if (zf < -300 || GAG) h += 0.14 * Math.max(0, Math.sin(z * 0.9 + t * 2.2)) * ss(-12, -2, z) * ss(2, -1, z - base * 10) * (GAG ? 1 : 1 - ss(T0('recede') + 1.6, T0('recede') + 3, t));
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
    this.shades.visible = !!(p.shades || p.shadesUp); this.shades.position.set(0, p.shadesUp ? 0.17 : 0, p.shadesUp ? 0.02 : 0); this.shades.rotation.x = p.shadesUp ? -0.3 : 0;
    this.heldFish.visible = !!p.fish; if (p.fish) this.heldFish.rotation.y = Math.sin(t * 14) * 0.4;
    if (this.hatG) this.hatG.visible = p.hat !== false;
    const soot = p.soot || 0, zap = p.zap || 0;
    this.skinM.color.copy(this.baseColor).lerp(new THREE.Color(0x231a14), soot * 0.85);
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
function updateGulls(wt, t) {
  const flee = ss(T0('recede') + 1.5, T0('recede') + 6, wt);
  const inH = wt > T0('horizon') && wt < T0('friend2');
  gulls.forEach((g, i) => {
    const u = g.userData;
    if (inH) {   // birds racing inland ahead of the wave
      const k = wt - T0('horizon');
      g.position.set(-6 + i * 3 + Math.sin(k * 2 + i), 7 + (i % 3) * 2 + Math.sin(k * 3 + i) * 0.4, -55 + k * 11 + i * 2);
      g.rotation.set(0, 0, 0.15 * Math.sin(k * 4 + i));
      u.wings.forEach(([p, s]) => p.rotation.z = s * Math.sin(t * 16 + u.ph) * 0.7);
      g.visible = true; return;
    }
    const a = u.ph + wt * u.sp;
    g.position.set(u.cx + Math.cos(a) * u.r, u.h + flee * 40 + Math.sin(wt * 0.7 + u.ph) * 0.5, u.cz + Math.sin(a) * u.r - flee * 60);
    g.rotation.set(0, -a + Math.PI, 0.3);
    if (flee > 0) g.rotation.y = Math.PI;
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
// escape timing: the friend reaches the dog on the road exactly when the narrator says "...suba o morro"
const U_ROAD = (() => { let best = 0, bd = 1e9; for (let i = 0; i <= 400; i++) { const p = heroPath.getPointAt(i / 400); const d = Math.abs(p.z - ROAD.z) + (p.x > -3 ? 99 : 0); if (d < bd) { bd = d; best = i / 400; } } return best; })();
function answerKeys() { const st = S.answer.start; const c = w => capAt(w, st) - st; return [[0, 0.03], [c('toalha') + 0.4, U_TOWEL], [c('placas') + 0.6, U_SIGN], [c('morro'), U_ROAD + 0.04], [S.answer.dur, 1]]; }
function answerU(lt) { const keys = answerKeys(); if (lt >= keys[keys.length - 1][0]) return 1; for (let i = 0; i < keys.length - 1; i++) if (lt >= keys[i][0] && lt <= keys[i + 1][0]) return lerp(keys[i][1], keys[i + 1][1], (lt - keys[i][0]) / (keys[i + 1][0] - keys[i][0])); return 0; }
function friendOnEscape(u) { const fpp = onPath(heroPath, Math.max(0, u - 0.04)); const nx = Math.cos(fpp.ry), nz = -Math.sin(fpp.ry); let fx = fpp.x + nx * 0.9, fz = fpp.z + nz * 0.9; const kk = ss(0.88, 1.0, u); return { x: lerp(fx, HS.x, kk), z: lerp(fz, HS.z, kk), ry: fpp.ry, kk }; }
const DOG_SPOT = friendOnEscape(U_ROAD + 0.04);
const DOG_T = S.answer.start + answerKeys()[3][0];
const DOG_HILL = { x: TOP.x - 0.2, z: TOP.z - 1.6 };
// water's edge at the foot of the hill (for the electric-shock gag)
const EDGE = (() => { const dir = V(-6 - TOP.x, 0, 12 - TOP.z).normalize(); let p = V(TOP.x, 0, TOP.z); for (let i = 0; i < 400; i++) { p.addScaledVector(dir, 0.1); if (terrainH(p.x, p.z) < 1.3 + 0.45) break; } return { x: p.x, z: p.z, ry: Math.atan2(dir.x, dir.z), dir }; })();

// ---------- time mapping ----------
function seg(t) { for (let i = TL.segs.length - 1; i >= 0; i--) if (t >= TL.segs[i].start) return TL.segs[i]; return TL.segs[0]; }
const HIT_Z = (z) => z >= 0 ? HIT + 2.6 + z / 75 * 3.9 : HIT + 2.6 * (z + 75) / 75;
const CAR_HIT_T = T0('carhit') + 0.5;                       // the wave reaches the cars
const carWT = t => t - CAR_HIT_T + HIT_Z(ROAD.z - 1.2);
function worldTime(t) {
  const n = seg(t).scene;
  if (n === 'car2' || n === 'carhit') return carWT(t);
  if (n === 'replay') { const k = ease(clamp((t - T0('replay')) / (S.replay.dur - 0.2))); return lerp(carWT(T0('replay')), carWT(T0('car2')), k); }
  if (n === 'q1') return T0('safe') + 6 + (t - T0('q1'));
  if (['q2', 'q3', 'q4', 'gulp1', 'ohoh', 'swallow'].includes(n)) {
    const W1 = HIT_Z(-3.6), W2 = HIT_Z(TOWEL.z);
    if (t < TS1) return W1 - (TS1 - t);
    if (t < TS2) return W1 + (t - TS1) * (W2 - W1) / (TS2 - TS1);   // slow motion while the hero says "oh-oh"
    return W2 + (t - TS2);
  }
  if (n === 'end') return 4 + (t - T0('end'));
  return t;
}
const INTERIOR = n => n === 'elev' || n === 'stairs' || n === 'stairs2';

// ---------- director ----------
let shake = 0, flash = 0, heroU = 0;
function setParent(bean, parent) { if (bean.root.parent !== parent) parent.add(bean.root); }
function direct(t, wt) {
  const g = seg(t), lt = t - g.start, p = clamp(lt / g.dur), n = g.scene;
  const hm = clamp(mouthOf(TL.heroMouth, t) * 1.4), fm = clamp(mouthOf(TL.friendMouth, t) * 1.4);
  let cam = { pos: V(0, 5, -10), tgt: V(0, 1, 5), fov: 45 };
  shake = 0; flash = 0;
  const hy = (x, z, dy = 1) => terrainH(x, z) + dy;
  const LY = terrainH(TOWEL.x, TOWEL.z) + 0.32;   // on the lounger
  const sunbathe = { x: TOWEL.x, y: LY, z: TOWEL.z, ry: Math.PI - 0.35, legs: 'sit', lean: -0.8, sitY: 0.47, armL: A.relax, armR: A.hold, shades: true };
  let dg = { mode: 'hide' };
  const fsun = { x: FTOWEL.x, z: FTOWEL.z, ry: Math.PI - 0.35, legs: 'sit', lean: -0.6, sitY: 0.55, armL: A.relax, armR: A.relax, shades: true, smile: 1 };
  let hp = Object.assign({}, sunbathe), fp = { visible: false, x: 0, z: 0 }, bm = 'hide', bpos = null;
  const sf = surferAt(wt), sway = Math.sin(t * 2.3);
  const carry = [0.35, 0.45, -0.5];
  const surfing = (wave) => { const y = waterH(sf.x, sf.z, wt) + 0.1; fp = { x: sf.x, z: sf.z, y: y + 0.05, ry: 0.15, legs: 'crouch', armL: [0.25, 1.35 + 0.2 * sway, -0.35], armR: wave ? A.wave : [0.35, 1.25 - 0.2 * sway, -0.4], tilt: 0.12 * sway, smile: 1, mouth: Math.max(0.2, fm), look: [-0.6, 0] }; bm = 'surf'; bpos = { x: sf.x, y, z: sf.z }; };
  setParent(hero, scene); setParent(friend, scene); hero.root.scale.setScalar(1); friend.root.scale.setScalar(1);

  if (n === 'title') {
    const u = ease(clamp(lt / g.dur));
    cam.pos = vl(V(-6, 16, -45), V(-1.2, 3.0, -1.5), u); cam.tgt = vl(V(0, 4, 10), V(2.6, 0.7, 6.4), u); cam.fov = lerp(55, 42, u);
    surfing();
  } else if (n === 'sunny') {
    const c1 = capAt('praia', g.start) - g.start, c2 = capAt('gaivotas', g.start) - g.start, c3 = capAt('som', g.start) - g.start, c4 = capAt('ventinho', g.start) - g.start;
    hp.armR = (lt % 4 < 1.5) ? A.drink : A.hold;
    surfing(lt > c1 + 0.4 && lt < c2);
    if (lt < c1) { const k = ease(lt / c1); cam.pos = V(0, 2.2, 0); cam.tgt = vl(V(-30, 60, -100), V(2.0, 1, 6.6), k); cam.fov = 50; }
    else if (lt < c2) { const k = (lt - c1) / (c2 - c1); cam.pos = vl(V(5.8, 1.9, 11.0), V(5.6, 1.8, 10.5), k); cam.tgt = V(6.0, 0.5, -4); cam.fov = 56; }
    else if (lt < c3) { const k = (lt - c2) / (c3 - c2); cam.pos = V(4.4, 1.35, 9.6); cam.tgt = vl(V(4.2, 7.5, -6), V(5.5, 9, -9), k); cam.fov = 62; }
    else if (lt < c4) { surfing(); cam.pos = V(sf.x - 3.8, 1.6, sf.z + 7.2); cam.tgt = V(sf.x + 0.5, 0.75, sf.z); cam.fov = 36; }
    else { surfing(); const k = clamp((lt - c4) / (g.dur - c4)); cam.pos = vl(V(7, 2.2, 3.5), V(8.5, 2.6, 5.5), k); cam.tgt = V(32, 7, 24); cam.fov = 50; }
  } else if (n === 'calm') {
    surfing(); hp.armR = A.drink;
    if (lt < 1.4) { cam.pos = vl(V(4.0, 1.3, 3.0), V(3.6, 1.1, 3.8), p); cam.tgt = V(2.6, 0.75, 6.3); cam.fov = 38; }
    else { cam.pos = V(3.3, 1.2, 4.3); cam.tgt = V(2.55, 0.95, 6.3); cam.fov = 34; hp.shades = lt < 2.0; hp.shadesUp = lt >= 2.0; hp.armR = A.hold; hp.look = [Math.sin(lt * 2.5) * 0.9, 0.2]; hp.brow = -0.4; hp.smile = 0; }
  } else if (n === 'recede') {
    const c2 = capAt('peixe', g.start) - g.start;
    if (sf.on) surfing(); else { fp = { x: STRAND.x, z: STRAND.z, ry: 0.4, legs: 'crouch', armL: A.shrug, armR: A.shrug, eyesWide: true, brow: 0.7, look: [Math.sin(lt * 3), 0] }; bm = 'lie'; bpos = { x: STRAND.x, z: STRAND.z, ry: 0.4 }; }
    const lift = ss(0.5, 1.2, lt);
    hp.shades = lt < 0.9; hp.shadesUp = lt >= 0.9; hp.armR = lt > 0.4 && lt < 1.2 ? A.glasses : (lt >= 1.3 ? A.point : A.hold); hp.nut = lt < 0.4;
    hp.eyesWide = lt > 1.0; hp.brow = 0.7; hp.lean = lerp(-0.8, 0, lift); hp.sitY = lerp(0.47, 0.62, lift);
    if (lt < 2.2) { cam.pos = vl(V(3.8, 1.2, 4.4), V(3.6, 1.15, 4.8), p); cam.tgt = V(2.6, 0.95, 6.3); cam.fov = 38; }
    else if (lt < c2 - 0.3) { cam.pos = V(3.3, 2.0, 9.4); cam.tgt = V(2, -0.5, -12); cam.fov = 52; hp.armR = A.point; }
    else { const k = (lt - c2 + 0.3) / (g.dur - c2 + 0.3); cam.pos = vl(V(5.2, 0.35, -2.8), V(5.0, 0.4, -3.4), k); cam.tgt = V(3.6, -0.2, -5.6); cam.fov = 40; }
  } else if (n === 'friend1') {
    hp = Object.assign({}, sunbathe, { lean: 0, sitY: 0.62, shades: false, shadesUp: true, nut: false, armL: A.rest, armR: A.point, eyesWide: true, brow: 0.6 });
    fp = { x: STRAND.x, z: STRAND.z, ry: 0.4, armL: A.shrug, armR: A.shrug, eyesWide: true, brow: 0.8, mouth: fm, look: [Math.sin(lt * 4), 0.2], smile: 0 }; bm = 'lie'; bpos = { x: STRAND.x - 0.2, z: STRAND.z + 0.5, ry: 0.4 };
    cam.pos = V(STRAND.x + 1.6, hy(STRAND.x, STRAND.z, 0.9), STRAND.z + 2.8); cam.tgt = V(STRAND.x, hy(STRAND.x, STRAND.z, 1.0), STRAND.z); cam.fov = 44;
  } else if (n === 'fish') {
    const u = ss(0.5, g.dur, lt);
    if (lt < 0.6) hp = Object.assign(hp, { lean: 0, sitY: 0.62, shades: false, shadesUp: true, nut: false, armL: A.rest, armR: A.rest, smile: 1, look: [0, -0.5] });
    else hp = { x: lerp(TOWEL.x, FISH.x, u), z: lerp(TOWEL.z, FISH.z + 1.0, u), ry: Math.PI + 0.15, run: 0.55, phase: lt * 11, smile: 1, nut: false, brow: -0.2, shadesUp: true };
    fp = { x: STRAND.x, z: STRAND.z, ry: 0.4, armL: A.hips, armR: A.rest, look: [0.5, 0] }; bm = 'lie'; bpos = { x: STRAND.x - 0.2, z: STRAND.z + 0.5, ry: 0.4 };
    cam.pos = vl(V(7.5, 2.2, 3.5), V(7.0, 1.6, -1.0), ease(p)); cam.tgt = V(lerp(TOWEL.x, FISH.x, u), 0.6, lerp(TOWEL.z, FISH.z, u)); cam.fov = 45;
  } else if (n === 'dinner') {
    hp = { x: FISH.x, z: FISH.z, ry: 0.35, armR: A.fishUp, armL: A.hips, fish: true, mouth: hm, smile: 1, nut: false, brow: -0.2, look: [0, 0.4], shadesUp: true };
    fp = { x: STRAND.x, z: STRAND.z, ry: 0.4, armL: A.hips, armR: A.rest }; bm = 'lie'; bpos = { x: STRAND.x - 0.2, z: STRAND.z + 0.5, ry: 0.4 };
    cam.pos = vl(V(5.4, 0.4, -2.4), V(5.2, 0.45, -2.9), p); cam.tgt = V(FISH.x, hy(FISH.x, FISH.z, 1.1), FISH.z); cam.fov = 42;
  } else if (n === 'twist') {
    // front of the hero: he turns from the beach toward the sea (and the camera), then we see what he sees
    const cD = capAt('diante', g.start) - g.start;
    const turn = ss(0.5, 1.6, lt);
    hp = { x: FISH.x, z: FISH.z, ry: lerp(0.35, Math.PI + 0.15, turn), armR: A.hold, armL: A.rest, fish: true, nut: false, smile: turn < 0.5 ? 1 : 0, eyesWide: turn > 0.7, brow: turn * 0.9, look: [0, 0.3], shadesUp: true };
    fp = { x: STRAND.x, z: STRAND.z, ry: Math.PI + 0.3, armL: A.rest, armR: A.rest, look: [0, 0.4] }; bm = 'lie'; bpos = { x: STRAND.x - 0.2, z: STRAND.z + 0.5, ry: 0.4 };
    const fc = V(FISH.x, hy(FISH.x, FISH.z, 1.1), FISH.z);
    if (lt < cD) { const k = ease(clamp(lt / cD)); cam.pos = vl(V(FISH.x - 0.6, fc.y - 0.1, FISH.z - 3.4), V(FISH.x - 0.3, fc.y + 0.05, FISH.z - 2.2), k); cam.tgt = fc; cam.fov = 40; }
    else { const k = ease(clamp((lt - cD) / (g.dur - cD))); cam.pos = V(FISH.x + 1.6, hy(FISH.x, FISH.z, 2.4), FISH.z + 2.2); cam.tgt = V(-2, 3, -200); cam.fov = lerp(34, 20, k); }
  } else if (n === 'explain' || n === 'retreat') {
    hp = { x: FISH.x, z: FISH.z, ry: Math.PI + 0.1, armR: A.hold, armL: A.rest, fish: true, nut: false };
    cam.pos = V(14, 10, 10); cam.tgt = V(0, 0, -15); cam.fov = 50;
  } else if (n === 'horizon') {
    const c1 = capAt('dez metros', g.start) - g.start, c2 = capAt('densa', g.start) - g.start;
    hp = { x: FISH.x, z: FISH.z, ry: Math.PI + 0.1, armR: A.hold, armL: A.rest, fish: true, nut: false, look: [0, 0.6], shadesUp: true };
    const u = clamp(lt / (g.dur - 0.7)); const fx = lerp(STRAND.x, FISH.x - 0.6, u), fz = lerp(STRAND.z, FISH.z - 2.4, u);
    fp = u < 1 && lt > 0.3 ? { x: fx, z: fz, ry: 0.12, run: 1, phase: lt * 14, armL: carry, armR: A.up, eyesWide: true, brow: 0.9, shout: 0.6, smile: 0 }
      : (lt <= 0.3 ? { x: STRAND.x, z: STRAND.z, ry: Math.PI + 0.3, armL: carry, armR: A.rest, eyesWide: true, brow: 0.9 } : { x: fx, z: fz, ry: 0.5, armL: carry, armR: [1.4, 0.2, -0.1], eyesWide: true, brow: 0.9, shout: 0.5, smile: 0, look: [-0.6, 0] });
    bm = 'carry';
    if (lt < c1 - 0.2) { const k = ease(clamp(lt / (c1 - 0.2))); cam.pos = vl(V(FISH.x + 0.7, hy(FISH.x, FISH.z, 1.4), FISH.z + 2.4), V(FISH.x + 0.8, hy(FISH.x, FISH.z, 1.5), FISH.z + 1.9), k); cam.tgt = V(0, 4, -190); cam.fov = lerp(45, 30, k); }
    else if (lt < c2) { const k = (lt - c1) / (c2 - c1); cam.pos = V(FISH.x, 2.5, FISH.z - 3); cam.tgt = V(-6, 6.5, -185); cam.fov = lerp(16, 13, k); }
    else { const k = ease(clamp((lt - c2) / (g.dur - c2))); cam.pos = vl(V(FISH.x + 4.2, hy(FISH.x, FISH.z, 1.3), FISH.z + 0.6), V(FISH.x + 3.4, hy(FISH.x, FISH.z, 1.1), FISH.z + 1.2), k); cam.tgt = V(FISH.x - 1.0, hy(FISH.x, FISH.z, 0.8), FISH.z - 1.6); cam.fov = 46; hp.eyesWide = true; hp.brow = 1; hp.smile = 0; hp.look = [0.5, 0.2]; if (lt > g.dur - 1.0) { hp.ry = Math.PI - 0.6; hp.look = [0.8, 0]; } }
  } else if (n === 'ficha') {
    hp = { x: FISH.x, z: FISH.z, ry: Math.PI + 0.1, fish: true, nut: false, eyesWide: true, brow: 1, smile: 0, wob: 0.35, armL: A.rest, armR: A.hold, shadesUp: true };
    fp = { x: FISH.x - 0.6, z: FISH.z - 2.4, ry: 0.5, armL: carry, armR: A.rest, eyesWide: true, brow: 0.9, smile: 0, wob: 0.25 }; bm = 'carry';
    const k = ease(clamp(lt / g.dur)); const fov = lerp(20, 70, k); const d = 0.8 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
    const c = V(FISH.x, hy(FISH.x, FISH.z, 1.15), FISH.z); cam.pos = c.clone().add(V(0.1, 0.05, -1).normalize().multiplyScalar(d)); cam.tgt = c; cam.fov = fov;
  } else if (n === 'friend2' || n === 'car1') {
    const fx = FISH.x - 1.3, fz = FISH.z - 0.4;
    hp = { x: FISH.x, z: FISH.z, ry: -0.9, fish: true, nut: false, eyesWide: true, brow: 0.9, smile: 0, armL: A.rest, armR: A.hold, shadesUp: true, look: [-0.4, 0] };
    fp = { x: fx, z: fz, ry: 1.2, armL: carry, armR: n === 'friend2' ? A.up : A.point, eyesWide: true, brow: n === 'friend2' ? 1 : -0.2, mouth: fm, smile: n === 'car1' ? 1 : 0, wob: n === 'friend2' ? 0.25 : 0, look: [0.5, 0] };
    if (n === 'car1') { fp.ry = 2.4; hp.brow = 0.4; hp.look = [-0.2, 0.2]; }
    bm = 'carry';
    cam.pos = vl(V(FISH.x - 0.6, hy(FISH.x, FISH.z, 1.2), FISH.z + 3.2), V(FISH.x - 0.6, hy(FISH.x, FISH.z, 1.1), FISH.z + 2.7), p); cam.tgt = V(FISH.x - 0.7, hy(FISH.x, FISH.z, 0.95), FISH.z - 0.2); cam.fov = 46;
  } else if (n === 'car2' || n === 'carhit' || n === 'replay') {
    // inside the blue car, stuck in traffic
    setParent(hero, myCar); setParent(friend, myCar); hero.root.scale.setScalar(1 / CAR_S); friend.root.scale.setScalar(1 / CAR_S);
    const panic = n !== 'car2' || lt > 3.2;
    hp = { x: -0.15, y: 0.46, z: -0.24, ry: -Math.PI / 2, legs: 'sit', sitY: 0.6, armL: A.drive, armR: panic ? A.up : A.drive, nut: false, eyesWide: panic, brow: panic ? 1 : 0.3, shout: panic ? 0.5 : 0, smile: panic ? 0 : 1, hat: false };
    fp = { x: -0.15, y: 0.46, z: 0.24, ry: -Math.PI / 2, legs: 'sit', sitY: 0.6, armL: panic ? A.up : A.rest, armR: panic ? A.up : A.thumb, eyesWide: panic, brow: panic ? 1 : -0.2, shout: panic ? 0.5 : 0, smile: panic ? 0 : 1 };
    const cp = myCar.position;
    if (n === 'car2' && lt < 3.2) { cam.pos = V(cp.x - 4.8, cp.y + 2.0, cp.z + 0.9); cam.tgt = V(cp.x, cp.y + 1.5, cp.z); cam.fov = 40; }
    else { const k = n === 'car2' ? ss(3.2, g.dur, lt) : 1; cam.pos = vl(V(-9, 5.5, 27), V(-10, 7, 29), k); cam.tgt = V(4, 2.0, 6); cam.fov = 58; if (n === 'carhit') shake = 0.5 * Math.exp(-Math.pow((lt - 0.6) / 0.6, 2)); }
  } else if (n === 'idea') {
    hp = { x: FISH.x, z: FISH.z, ry: -0.9, fish: true, nut: false, eyesWide: false, brow: -0.3, smile: 1, mouth: hm, armL: A.pointUp, armR: A.hold, shadesUp: true, look: [-0.4, 0.2] };
    fp = { x: FISH.x - 1.3, z: FISH.z - 0.4, ry: 1.2, armL: carry, armR: A.rest, eyesWide: true, brow: 0.4, look: [0.5, 0.3] }; bm = 'carry';
    cam.pos = vl(V(FISH.x - 0.2, hy(FISH.x, FISH.z, 1.4), FISH.z + 4.4), V(FISH.x - 0.1, hy(FISH.x, FISH.z, 1.35), FISH.z + 4.0), p); cam.tgt = V(FISH.x - 0.6, hy(FISH.x, FISH.z, 1.2), FISH.z - 0.2); cam.fov = 46;
  } else if (n === 'answer') {
    const cT = capAt('toalha', g.start) - g.start, cB = capAt('prancha', g.start) - g.start, cP = capAt('placas', g.start) - g.start, cF = capAt('peixes', g.start) - g.start;
    const keys = answerKeys(); const u = answerU(lt);
    const pp = onPath(heroPath, u); heroU = u;
    hp = { x: pp.x, z: pp.z, ry: pp.ry, run: 1, phase: lt * 14, eyesWide: true, brow: 0.8, smile: 0, fish: lt < cF + 0.3, nut: false, shout: 0.3 };
    const fe = friendOnEscape(u), fx = fe.x, fz = fe.z, kk = fe.kk;
    const hasBoard = lt < cB + 0.3, hasDog = t >= DOG_T;
    const hold = [0.95, -0.15, -1.5];
    fp = { x: fx, z: fz, ry: fe.ry, run: kk < 1 ? 1 : 0, phase: lt * 14 + 1.5, armL: hasBoard ? carry : (hasDog ? hold : undefined), armR: hasDog ? hold : undefined, eyesWide: true, brow: 0.8, shout: 0.3, smile: hasDog ? 1 : 0 };
    dg = hasDog ? { mode: 'carried' } : { mode: 'scared', x: DOG_SPOT.x, y: terrainH(DOG_SPOT.x, DOG_SPOT.z) + 0.06, z: DOG_SPOT.z, ry: Math.PI * 0.8 };
    if (hasBoard) bm = 'carry';
    else { bm = 'lie'; const dp = onPath(heroPath, keys[1][1] * 0.5); bpos = { x: dp.x + 1.0, z: dp.z + 0.4, ry: 0.8 }; }
    const hpos = V(pp.x, terrainH(pp.x, pp.z), pp.z);
    if (lt < cT - 0.1) { cam.pos = V(11, 2.5, 3); cam.tgt = hpos.clone().add(V(0, 1, 0)); cam.fov = 40; }
    else if (lt < cP) { cam.pos = V(-1.5, 1.2, 4.0); cam.tgt = hpos.clone().add(V(0, 0.9, 0)); cam.fov = 48; }
    else if (lt < keys[3][0] - 0.6) { cam.pos = V(-0.5, 1.8, 9.0); cam.tgt = V(-6, 2, 14); cam.fov = 50; }
    else if (lt < keys[3][0] + 0.7) { cam.pos = V(DOG_SPOT.x - 3.0, hy(DOG_SPOT.x, DOG_SPOT.z, 1.5), DOG_SPOT.z + 3.2); cam.tgt = V(DOG_SPOT.x - 0.4, hy(DOG_SPOT.x, DOG_SPOT.z, 0.7), DOG_SPOT.z + 0.4); cam.fov = 46; }
    else { cam.pos = hpos.clone().add(V(8, 4.5, -6)); cam.tgt = hpos.clone().add(V(0, 1, 0)); cam.fov = 45; }
  } else if (n === 'building') {
    const u = ss(0, g.dur, lt); const q = onPath(doorPath, u), q2 = onPath(doorPath, Math.max(0, u - 0.08));
    hp = { x: q.x, z: q.z, ry: q.ry, run: 1, phase: lt * 14, eyesWide: true, brow: 0.8, nut: false, shout: 0.3, visible: u < 0.98 };
    fp = { x: q2.x + 0.5, z: q2.z - 0.3, ry: q2.ry, run: 1, phase: lt * 14 + 1.5, eyesWide: true, brow: 0.8, shout: 0.3, visible: u < 0.99 };
    cam.pos = vl(V(4, 2.5, 9), V(6, 3.5, 11), p); cam.tgt = V(q.x, 1.8, q.z); cam.fov = 50;
  } else if (n === 'elev' || n === 'stairs') {
    const L = (x, z) => ({ x: IO.x + x, y: IO.y, z: IO.z + z });
    const ew = n === 'elev';
    const a = L(ew ? lerp(-3.4, -5.6, ss(0, 0.8, lt)) : -5.6, 0.3), b = L(ew ? -3.0 : lerp(-3.0, -4.6, ss(0, 0.5, lt)), 1.6);
    fp = { x: a.x, y: a.y, z: a.z, ry: ew ? -Math.PI / 2 - 0.4 : Math.PI / 2, run: ew && lt < 0.8 ? 0.6 : 0, phase: lt * 10, armL: ew ? A.point : A.shrug, armR: A.rest, mouth: fm, smile: ew ? 1 : 0, brow: ew ? -0.2 : 0.6, look: [0, 0] };
    if (ew) fp.ry = Math.PI + 0.6;
    hp = { x: b.x, y: b.y, z: b.z, ry: ew ? -Math.PI / 2 : -Math.PI / 2 - 0.5, armL: ew ? A.rest : A.no, armR: ew ? A.rest : A.point, mouth: hm, brow: ew ? 0.4 : -0.5, nut: false, eyesWide: ew, smile: ew ? 0 : 1 };
    if (!ew) { hp.ry = Math.PI / 2 + 0.3; hp.armR = A.point; }
    cam.pos = V(IO.x - 4.3, IO.y + 1.9, IO.z + 6.6); cam.tgt = V(IO.x - 4.6, IO.y + 1.2, IO.z + 0.3); cam.fov = 48;
  } else if (n === 'stairs2') {
    const cA = capAt('terceiro', g.start) - g.start;
    const climb = (STAIR_TOTAL) * ss(0.2, cA + 0.8, lt);
    const h0 = onStairs(climb), f0 = onStairs(Math.max(0, climb - 1.1));
    const arrived = climb >= STAIR_TOTAL - 0.05;
    hp = { x: h0.x, y: h0.y, z: h0.z, ry: h0.ry, run: arrived ? 0 : 1, phase: lt * 13, eyesWide: !arrived, brow: arrived ? -0.2 : 0.6, nut: false, smile: arrived ? 1 : 0, armL: arrived ? A.cheer : undefined, armR: arrived ? A.cheer : undefined };
    fp = { x: f0.x - (arrived ? 1.2 : 0), y: f0.y, z: f0.z + (arrived ? 0.2 : 0), ry: arrived ? 0 : f0.ry, run: arrived ? 0 : 1, phase: lt * 13 + 1.4, eyesWide: !arrived, brow: arrived ? -0.2 : 0.6, smile: arrived ? 1 : 0, armR: arrived ? A.thumb : undefined };
    if (arrived) hp.ry = 0;
    cam.pos = V(h0.x - 0.5, h0.y + 2.0, IO.z + 8.5); cam.tgt = V(h0.x, h0.y + 1.0, IO.z + 1.0); cam.fov = 50;
  } else if (n === 'hit') {
    dg = { mode: 'scared', x: DOG_HILL.x, y: terrainH(DOG_HILL.x, DOG_HILL.z), z: DOG_HILL.z, ry: HRY };
    hp = { x: TOP.x, z: TOP.z, ry: HRY, armL: A.up, armR: A.up, eyesWide: true, brow: 0.9, shout: 0.4, nut: false };
    fp = { x: HS.x, z: HS.z, ry: HRY, armL: A.up, armR: A.up, eyesWide: true, brow: 0.9, shout: 0.4, smile: 0 };
    const zf = front(wt);
    if (lt < 3.05) { cam.pos = V(3, 1.4, 14); cam.tgt = vl(V(0, 3, -40), V(0, 6, -10), ss(0.5, 3.0, lt)); cam.fov = 60; shake = 0.4 * ss(1.0, 3.0, lt); }
    else if (lt < 9.5) { const k = ss(3.05, 9.5, lt); cam.pos = vl(V(-22, 20, 42), V(-24, 21, 43), k); cam.tgt = V(-2, 1, 8); cam.fov = 58; shake = 0.4 * Math.exp(-Math.pow((zf - 20) / 25, 2)); }
    else { const k = ss(9.5, g.dur, lt); cam.pos = vl(V(14, 6, 6), V(12, 7, 5), k); cam.tgt = V(4, 2, 20); cam.fov = 52; }
    flash = Math.exp(-Math.pow((lt - 3.05) / 0.12, 2)) * 0.6;
  } else if (n === 'backwash') {
    dg = { mode: 'sit', x: DOG_HILL.x, y: terrainH(DOG_HILL.x, DOG_HILL.z), z: DOG_HILL.z, ry: HRY };
    const cE = capAt('entulho', g.start) - g.start, cL = capAt('lixo', g.start) - g.start, cM = capAt('mergulhinho', g.start) - g.start;
    hp = { x: TOP.x, z: TOP.z, ry: HRY, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.6, nut: false, smile: 0 };
    fp = { x: HS.x, z: HS.z, ry: HRY, armL: A.rest, armR: A.rest, eyesWide: true, brow: 0.6, smile: 0 };
    if (lt < cE) { const k = ease(clamp(lt / cE)); cam.pos = vl(V(-20, 19, 40), V(-14, 16, 34), k); cam.tgt = V(4, 0, 2); cam.fov = 55; }
    else if (lt < cL) { const k = clamp((lt - cE) / (cL - cE)); cam.pos = vl(V(9, 4.5, 30), V(8, 4, 26), k); cam.tgt = V(4, 1, 6); cam.fov = 50; }
    else if (lt < cM - 0.4) { const pl = poles[0].position; cam.pos = V(pl.x - 6, hy(pl.x, pl.z, 3.5), pl.z + 5); cam.tgt = V(pl.x + 2, hy(pl.x, pl.z, 1.5), pl.z); cam.fov = 48; }
    else {
      fp = { x: HS.x + 0.2, z: HS.z - 0.4, ry: HRY - 0.3, armL: A.dive, armR: A.dive, lean: 0.5, smile: 1, brow: -0.3 };
      hp = { x: TOP.x, z: TOP.z, ry: HRY - 0.9, armL: A.stop, armR: A.no, brow: -0.7, nut: false, smile: 0, shout: 0.3 };
      const ty = terrainH(TOP.x, TOP.z); cam.pos = V(TOP.x + 3.4, ty + 1.6, TOP.z - 3.4); cam.tgt = V(TOP.x - 0.6, ty + 0.9, TOP.z - 0.4); cam.fov = 44;
    }
  } else if (n === 'zap1' || n === 'zap2') {
    // the friend thinks the water is fine now... it is not
    dg = { mode: 'tilt', x: DOG_HILL.x, y: terrainH(DOG_HILL.x, DOG_HILL.z), z: DOG_HILL.z, ry: HRY };
    const toHill = EDGE.ry + Math.PI, ey = terrainH(EDGE.x, EDGE.z);
    hp = { x: TOP.x, z: TOP.z, ry: HRY - 0.6, armL: A.rest, armR: A.rest, nut: false, brow: 0.5, eyesWide: true, smile: 0 };
    if (n === 'zap1') {
      fp = { x: EDGE.x, z: EDGE.z, ry: toHill, armL: A.wave, armR: A.hips, mouth: fm, smile: 1, brow: -0.3, look: [0, 0.4] };
      cam.pos = V(EDGE.x + EDGE.dir.x * 3.2 + 2.0, ey + 1.2, EDGE.z + EDGE.dir.z * 3.2 - 1.0); cam.tgt = V(lerp(EDGE.x, TOP.x, 0.25), ey + 2.2, lerp(EDGE.z, TOP.z, 0.25)); cam.fov = 50;
    } else {
      const step = ss(0.1, 0.5, lt), zapK = lt > 0.5 && lt < 1.8 ? 1 : 0, sootK = ss(1.6, 1.9, lt);
      const fxp = EDGE.x + EDGE.dir.x * 0.7 * step, fzp = EDGE.z + EDGE.dir.z * 0.7 * step;
      fp = { x: fxp, z: fzp, ry: lerp(toHill, EDGE.ry, ss(0, 0.3, lt)), run: step > 0 && step < 1 ? 0.5 : 0, phase: lt * 10, smile: zapK ? 0 : (sootK ? 0 : 1), zap: zapK, soot: sootK, wob: zapK, eyesWide: zapK > 0, shout: zapK ? 0.8 : 0, armL: zapK ? A.up : (sootK ? A.rest : A.rest), armR: zapK ? A.up : A.rest, brow: zapK ? 1 : 0, look: [0, 0] };
      if (sootK > 0) { fp.ry = toHill; fp.squint = 0.4; }
      if (lt < 2.6) { cam.pos = V(EDGE.x - EDGE.dir.z * 3.6 + EDGE.dir.x * 0.5, ey + 1.3, EDGE.z + EDGE.dir.x * 3.6 + EDGE.dir.z * 0.5); cam.tgt = V(fxp, ey + 0.9, fzp); cam.fov = 44; shake = zapK * 0.5; flash = zapK * (Math.floor(lt * 14) % 2 ? 0.35 : 0); }
      else { const ty = terrainH(TOP.x, TOP.z); hp = { x: TOP.x, z: TOP.z, ry: HRY - 0.3, armL: A.hips, armR: A.facepalm, lean: 0.12, squint: 0.9, brow: -0.6, smile: 0, nut: false, tilt: -0.12 }; cam.pos = V(TOP.x + 1.9, ty + 1.45, TOP.z - 2.3); cam.tgt = V(TOP.x, ty + 1.05, TOP.z - 0.2); cam.fov = 38; }
    }
  } else if (n === 'friend3' || n === 'safe') {
    const ty = terrainH(TOP.x, TOP.z);
    dg = { mode: 'sit', x: DOG_HILL.x, y: terrainH(DOG_HILL.x, DOG_HILL.z), z: DOG_HILL.z, ry: HRY };
    hp = { x: TOP.x, z: TOP.z, ry: HRY, armL: A.rest, armR: A.rest, nut: false, smile: 1, mouth: hm };
    fp = { x: HS.x, z: HS.z, ry: HRY, armL: A.rest, armR: A.rest, smile: 1, mouth: fm, bob: Math.sin(lt * 2.2) * 0.03 };
    fp.soot = 1;
    if (n === 'friend3') { const ey = terrainH(EDGE.x, EDGE.z); fp = { x: EDGE.x + EDGE.dir.x * 0.7, z: EDGE.z + EDGE.dir.z * 0.7, ry: EDGE.ry + Math.PI, soot: 1, armR: A.thumb, armL: A.rest, mouth: fm, smile: 1, squint: 0.5, wob: 0.12, brow: 0.3 }; cam.pos = V(fp.x - EDGE.dir.x * 2.8 - EDGE.dir.z * 0.9, ey + 1.5, fp.z - EDGE.dir.z * 2.8 + EDGE.dir.x * 0.9); cam.tgt = V(fp.x, ey + 1.0, fp.z); cam.fov = 42; }
    else {
      const cW = capAt('várias', g.start) - g.start, cS = capAt('desça', g.start) - g.start;
      if (lt < cW) { hp.armL = A.no; hp.armR = A.stop; hp.brow = -0.5; hp.smile = 0; hp.shout = 0.3; hp.ry = HRY + 0.6; fp.smile = 0; fp.eyesWide = true; cam.pos = V(TOP.x + 2.2, ty + 1.5, TOP.z - 2.8); cam.tgt = V(TOP.x - 0.6, ty + 1.0, TOP.z - 0.4); cam.fov = 42; }
      else if (lt < cS) { hp.eyesWide = true; hp.brow = 0.6; hp.smile = 0; hp.armR = A.pointUp; fp.eyesWide = true; fp.smile = 0; const k = clamp((lt - cW) / (cS - cW)); cam.pos = vl(V(TOP.x + 6, ty + 4, TOP.z - 8), V(TOP.x + 9, ty + 3, TOP.z - 12), k); cam.tgt = vl(V(TOP.x, ty + 1, TOP.z), V(-5, 1, -5), ss(0, 0.3, k)); cam.fov = 55; }
      else { hp.legs = 'sit'; hp.armL = A.knee; hp.armR = A.knee; hp.brow = 0.2; fp.legs = 'sit'; fp.armL = A.knee; fp.armR = A.knee; cam.pos = V(TOP.x + 3.2, ty + 2.2, TOP.z - 4.2); cam.tgt = V(TOP.x - 0.5, ty + 0.6, TOP.z + 1); cam.fov = 45; }
    }
  } else if (n === 'q1') {
    const ty = terrainH(TOP.x, TOP.z);
    hp = { x: TOP.x, z: TOP.z, ry: HRY, armR: A.thumb, armL: A.hips, shades: true, smile: 1, nut: false, brow: -0.2 };
    fp = { x: HS.x, z: HS.z, ry: HRY, armR: A.thumb, armL: A.hips, shades: true, smile: 1, brow: -0.2, soot: 1 };
    dg = { mode: 'sit', x: DOG_HILL.x + 0.3, y: terrainH(DOG_HILL.x + 0.3, DOG_HILL.z + 0.4), z: DOG_HILL.z + 0.4, ry: HRY };
    cam.pos = vl(V(TOP.x + 2.3, ty + 1.2, TOP.z - 2.6), V(TOP.x + 1.9, ty + 1.1, TOP.z - 2.1), p); cam.tgt = V(TOP.x - 0.4, ty + 1.05, TOP.z - 0.3); cam.fov = 44;
  } else if (['q2', 'q3', 'q4', 'gulp1', 'ohoh', 'swallow'].includes(n)) {
    // the ending gag: you keep sunbathing, your friend keeps surfing
    hp = Object.assign({}, sunbathe, { mouth: hm, smile: 1, visible: t < TS2 + 0.05 });
    if (sf.on) surfing(); else fp.visible = false;
    if (n === 'q4' || n === 'gulp1') { fp.armR = A.thumb; fp.mouth = fm; }
    if (n === 'q2') { cam.pos = vl(V(5.2, 1.8, 11.4), V(4.8, 1.6, 11.0), p); cam.tgt = V(3.0, 1.6, -2); cam.fov = 48; }
    else if (n === 'q3') { cam.pos = vl(V(4.6, 1.4, 3.4), V(4.3, 1.3, 3.7), p); cam.tgt = V(2.6, 0.85, 6.3); cam.fov = 40; }
    else if (n === 'q4' || (n === 'gulp1' && t < TS1 + 0.15)) { cam.pos = V(sf.x - 1.2, 1.3, sf.z + 4.2); cam.tgt = V(sf.x, 1.6, sf.z - 2); cam.fov = 52; if (n === 'gulp1') shake = 0.4; }
    else if (t < TS2 + 0.1) {
      hp.shades = false; hp.shadesUp = true; hp.eyesWide = true; hp.brow = 0.9; hp.smile = 0; hp.lean = -0.2; hp.armL = A.rest; hp.armR = A.hold; hp.look = [-0.5, 0.3];
      if (n === 'ohoh') { hp.mouth = Math.max(hm, 0.2); hp.ry = Math.PI / 2 + 0.25; hp.look = [0, 0]; hp.brow = 0.5; }
      cam.pos = V(TOWEL.x + 3.6, 1.15, TOWEL.z - 1.4); cam.tgt = V(TOWEL.x - 0.8, 1.4, TOWEL.z - 1.6); cam.fov = 52; shake = 0.15 + 0.4 * ss(TS2 - 0.6, TS2, t);
    } else { const k = ss(TS2 + 0.1, TE('swallow'), t); cam.pos = vl(V(TOWEL.x + 5, 7.5, TOWEL.z + 8), V(TOWEL.x + 4, 6.5, TOWEL.z + 6.5), k); cam.tgt = V(TOWEL.x + 2, 3, TOWEL.z + 3); cam.fov = 45; }
  } else if (n === 'end') {
    hp = Object.assign({}, sunbathe, { armL: A.wave, armR: A.hold });
    fp = Object.assign({}, fsun, { x: TOWEL.x - 1.7, z: TOWEL.z - 0.3, armR: A.thumb, lean: -0.1, sitY: 0.6, armL: A.rest });
    dg = { mode: 'lie', x: TOWEL.x + 1.3, y: terrainH(TOWEL.x + 1.3, TOWEL.z - 0.6), z: TOWEL.z - 0.6, ry: Math.PI - 0.6 };
    bm = 'stand'; bpos = { x: TOWEL.x - 2.5, z: TOWEL.z + 0.2 };
    cam.pos = vl(V(4.2, 1.5, 2.4), V(8, 6, -8), ease(p)); cam.tgt = V(2.0, 1.0, 6.3); cam.fov = 45;
  }
  hero.pose(t, hp); friend.pose(t, fp);
  if (dg.mode === 'carried') { if (dog.parent !== friend.body) friend.body.add(dog); dog.scale.setScalar(1); dogPose(t, 'carried', 0, -0.28, 0.42, 0); }
  else { if (dog.parent !== scene) scene.add(dog); dogPose(t, dg.mode, dg.x, dg.y, dg.z, dg.ry); }
  // ----- surfboard
  board.visible = bm !== 'hide';
  if (bm === 'carry') {
    const el = friend.arms[0].el; if (board.parent !== el) el.add(board);
    board.position.set(-0.13, -0.5, 0.05); board.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(1, 0, 0), V(0, 1, 0)));
  } else {
    if (board.parent !== scene) scene.add(board);
    if (bm === 'surf') { board.position.set(bpos.x, bpos.y, bpos.z); board.rotation.set(0, 0.15, 0.08 * sway - 0.05); }
    else if (bm === 'lie') { board.position.set(bpos.x, terrainH(bpos.x, bpos.z) + 0.05, bpos.z); board.rotation.set(0, bpos.ry || 0, 0); }
    else if (bm === 'stand') { board.position.set(bpos.x, terrainH(bpos.x, bpos.z) + 0.85, bpos.z); board.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 1, 0), V(1, 0, 0), V(0, 0, -1))); board.rotateX(0.5); }
  }
  // ----- leftovers floating after the gag
  const after = n === 'swallow' && t > TS2 + 0.1;
  hatF.visible = shadesF.visible = after;
  if (after) {
    const k = t - TS2; const x = TOWEL.x + 1.5 + k * 0.8, z = TOWEL.z + 2 + k * 1.2; const lvl = waterH(x, z, wt);
    hatF.position.set(x, lvl + 0.05, z); hatF.rotation.set(Math.sin(t * 2) * 0.2, t * 0.6, Math.sin(t * 1.7) * 0.15);
    shadesF.position.set(x + 1.3, lvl + 0.05, z - 0.8); shadesF.rotation.set(0, t * 0.7, Math.sin(t * 3) * 0.2);
    board.visible = true; if (board.parent !== scene) scene.add(board); const bx = x - 2.2, bz = z - 0.5; board.position.set(bx, waterH(bx, bz, wt) + 0.08, bz); board.rotation.set(Math.sin(t * 1.7) * 0.12, k * 0.5, Math.sin(t * 2.1) * 0.1);
  }
  const sh = shake * 0.12;
  cam.pos.add(V(Math.sin(t * 47) * sh, Math.sin(t * 61) * sh, Math.sin(t * 53) * sh));
  camera.position.copy(cam.pos); camera.fov = cam.fov; camera.updateProjectionMatrix(); camera.lookAt(cam.tgt);
  const focus = cam.tgt.clone(); focus.y = 0;
  if (!INTERIOR(n)) { focus.z = clamp(focus.z, -40, 45); focus.x = clamp(focus.x, -45, 40); }
  sun.target.position.copy(focus); sun.position.copy(focus).add(V(40, 70, -30));
  return g;
}

// ---------- world animation ----------
function world(t, wt, n) {
  const endScene = n === 'end';
  const zf = front(wt), bf = backflow(wt);
  palms.forEach(pl => {
    const top = pl.userData.top; const wind = 0.04 * Math.sin(wt * 1.3 + pl.userData.ph);
    pl.rotation.x = wind;
    const hit = zf > -300 ? ss(pl.position.z - 2, pl.position.z + 8, zf) : 0;
    pl.rotation.z = hit * 0.25 * (1 - 0.5 * bf);
    top.children.forEach((h, i) => h.rotation.z = 0.05 * Math.sin(wt * 2 + i + pl.userData.ph) + hit * 0.2 * Math.sin(wt * 5 + i));
  });
  floaters.forEach((o, i) => {
    const home = o.userData.home; const hitT = zf - home.z;
    if (zf > -300 && hitT > 0) {
      const drift = Math.min(hitT, 45) * 0.45 - 34 * bf;
      const px = home.x + drift * 0.3 + Math.sin(wt + i) * 0.5, pz = home.z + drift;
      const lvl = waterH(px, pz, wt);
      o.position.set(px, Math.max(terrainH(px, pz) + 0.05, lvl + 0.1), pz);
      o.rotation.set(Math.sin(wt * 1.3 + i) * 0.4, wt * 0.25 * ((i % 3) + 1) + i, Math.cos(wt * 1.1 + i) * 0.4);
    } else { o.position.copy(home); o.rotation.set(0, o === umbrella ? 0 : o === lounger ? Math.PI - 0.35 : (cars.includes(o) ? 0.04 : o.rotation.y), o === umbrella ? 0.1 : 0); }
  });
  towel.visible = false;
  fishes.forEach(f => {
    const { x, z, ph } = f.userData; const th = terrainH(x, z); const wl = waterH(x, z, wt);
    f.visible = wl < th + 0.05 && wt > T0('recede') + 3 && zf < z - 3 && !GAG;
    f.position.set(x, th + 0.12 + Math.abs(Math.sin(wt * 6 + ph)) * 0.25, z); f.rotation.set(Math.PI / 2 - 0.2, ph, Math.sin(wt * 12 + ph) * 0.8);
  });
  // utility poles fall when the water hits, then spark
  const pf = zf > -300 ? ss(ROAD.z, ROAD.z + 8, zf) : 0;
  poles.forEach((pl, i) => { pl.rotation.z = (i ? -1 : 1) * 1.25 * pf; pl.rotation.x = 0.1 * pf; });
  wires.visible = pf < 0.05;
  const spark = pf > 0.9 && n === 'backwash';
  sparks.visible = spark;
  if (spark) { const pl = poles[0]; const tip = V(0, 6.2, 0).applyEuler(pl.rotation).add(pl.position); for (let i = 0; i < 60; i++) { const a = Math.sin(i * 12.9898 + Math.floor(t * 20) * 78.233) * 43758.5453; const r = a - Math.floor(a); sparkP[i * 3] = tip.x + (r - 0.5) * 1.2; sparkP[i * 3 + 1] = Math.max(tip.y, waterH(tip.x, tip.z, wt) + 0.2) + ((r * 7) % 1) * 1.0; sparkP[i * 3 + 2] = tip.z + (((r * 13) % 1) - 0.5) * 1.2; } sparkG.attributes.position.needsUpdate = true; sparks.material.opacity = (Math.floor(t * 15) % 3) ? 1 : 0.2; }
  // debris rides the flood in, then out
  debris.forEach((d, i) => {
    const u = d.userData; const vis = zf > u.z + 4 && zf > -300 && !GAG && !endScene;
    d.visible = vis; if (!vis) return;
    const z = u.z + 5 * ss(HIT + 3, HIT + 10, wt) - 40 * bf * u.sp, x = u.x + Math.sin(wt * 0.4 + u.ph) * 1.5;
    d.position.set(x, waterH(x, z, wt) + 0.05, z); d.rotation.set(Math.sin(wt + u.ph) * 0.3, wt * 0.3 * u.sp + u.ph, Math.cos(wt * 1.3 + u.ph) * 0.3);
  });
  updateGulls(wt, t);
  const dark = endScene ? 0 : ss(T0('twist') + 1, T0('horizon') + 4, wt) * (1 - 0.6 * ss(T0('safe') + 4, TE('safe'), wt)) * (GAG ? 0.7 : 1);
  const eve = endScene ? 0.9 : 0;
  skyU.top.value.set(0x2f7fd8).lerp(new THREE.Color(0x3b5aa8), eve).lerp(new THREE.Color(0x4a5a6a), dark * 0.6);
  skyU.bot.value.set(0xbfe6ff).lerp(new THREE.Color(0xffc48a), eve).lerp(new THREE.Color(0x9aa8b0), dark * 0.6);
  scene.fog.color.copy(skyU.bot.value);
  sun.intensity = lerp(2.6, 1.5, dark); sun.color.set(0xfff1d6).lerp(new THREE.Color(0xffb070), eve);
  hemi.intensity = lerp(0.9, 0.7, dark);
  clouds.position.x = t * 0.6;
  stormM.opacity = dark * 0.85; storm.visible = dark > 0.01; storm.position.x = -t * 1.2;
  // sun sprite follows the sky's sun direction, gently rotating
  sunSprite.material.rotation = t * 0.12; sunSprite.material.opacity = 1 - dark * 0.75; sunHalo.material.opacity = (1 - dark * 0.8) * (0.85 + 0.15 * Math.sin(t * 1.5));
  sunSprite.visible = sunHalo.visible = !INTERIOR(n);
  updateWater(wt); updateSpray(wt);
}

// ---------- 2D overlay ----------
const ui = document.getElementById('ui').getContext('2d');
const NOCAP = new URLSearchParams(location.search).has('nocap');   // vertical (TikTok) version draws its own bigger captions
function rr(x, y, w, h, r) { ui.beginPath(); ui.roundRect(x, y, w, h, r); }
function outlined(text, x, y, size, fill = '#fff', stroke = '#1b1b1b', weight = 900, lw = 0.16) {
  ui.font = `${weight} ${size}px "Inter Display", Inter, "DejaVu Sans", sans-serif`; ui.lineJoin = 'round';
  ui.lineWidth = size * lw; ui.strokeStyle = stroke; ui.strokeText(text, x, y); ui.fillStyle = fill; ui.fillText(text, x, y);
}
const HL = ['tsunami', 'dez metros', 'correr', 'pra cima', 'longe do mar', 'rota de fuga', 'terceiro andar', 'várias ondas', 'autoridades', 'avião', 'paredão de água', 'de repente', 'peixe', 'terremoto', 'péssima ideia', 'carros', 'árvores', 'último aviso', 'freia', 'cresce', 'tomando sol', 'morro', 'prédio alto', 'resistente', 'densa', 'forte', 'elevador', 'escada', 'mesma força', 'fios elétricos', 'trânsito trava', 'ainda não'];
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

function diagram(t, g, mode) {
  const lt = t - g.start; const a = ss(0, 0.35, lt) * (1 - ss(g.dur - 0.35, g.dur, lt));
  if (a <= 0) return;
  ui.save(); ui.globalAlpha = a;
  const seaY = 300, X0 = 0, X1 = 1280;
  const floorY = x => x < 760 ? 585 + 8 * Math.sin(x * 0.021) + 5 * Math.sin(x * 0.067) : x < 1060 ? lerp(585 + 8 * Math.sin(760 * 0.021) + 5 * Math.sin(760 * 0.067), seaY + 4, (x - 760) / 300) : lerp(seaY + 4, 262, clamp((x - 1060) / 180));
  // ---- wave state
  let xc = 330, amp = 0, wd = 90, trough = 0, lift = 0, sh = 0;
  const pE = capAt('oceano', g.start) - g.start, pT = capAt('alto-mar', g.start) - g.start, pG = capAt('costa', g.start) - g.start;
  if (mode === 'explain') {
    lift = 26 * ss(pE + 0.3, pE + 0.8, lt); sh = (lt > pE + 0.3 && lt < pE + 1.6) ? Math.sin(lt * 70) * 4 : 0;
    amp = 18 * ss(pE + 0.5, pE + 1.3, lt);
    if (lt > pT) xc = lerp(330, 760, ss(pT, pG, lt));
    if (lt > pG) { const k = 1 - Math.pow(1 - clamp((lt - pG) / (g.dur - pG - 0.8)), 2); xc = lerp(760, 985, k); amp = lerp(18, 190, k); wd = lerp(90, 42, k); trough = lerp(0, 25, k); }
  } else { const k = ss(0.3, g.dur - 1, lt); xc = lerp(860, 900, k); amp = 120; wd = 55; trough = lerp(10, 70, k); }
  const ripple = x => 2.2 * Math.sin(x * 0.07 + lt * 3) + 1.2 * Math.sin(x * 0.19 - lt * 4);
  const surf = x => { const d = (x - xc) / wd; let y = seaY - amp * Math.exp(-d * d) + ripple(x); y += trough * Math.exp(-Math.pow((x - (xc + wd * 2.4)) / (wd * 1.6), 2)); return y; };
  // ---- sky, sun, clouds, gulls
  const sky = ui.createLinearGradient(0, 0, 0, seaY); sky.addColorStop(0, '#4fa9ec'); sky.addColorStop(1, '#d9f1ff'); ui.fillStyle = sky; ui.fillRect(0, 0, W, seaY + 10);
  ui.save(); ui.translate(150, 95); const sg = ui.createRadialGradient(0, 0, 10, 0, 0, 110); sg.addColorStop(0, 'rgba(255,245,190,0.9)'); sg.addColorStop(1, 'rgba(255,245,190,0)'); ui.fillStyle = sg; ui.beginPath(); ui.arc(0, 0, 110, 0, Math.PI * 2); ui.fill();
  ui.rotate(lt * 0.25); ui.fillStyle = 'rgba(255,225,120,0.55)'; for (let i = 0; i < 12; i++) { ui.rotate(Math.PI / 6); ui.beginPath(); ui.moveTo(-6, 44); ui.lineTo(6, 44); ui.lineTo(0, 78); ui.fill(); }
  ui.fillStyle = '#ffd84a'; ui.beginPath(); ui.arc(0, 0, 36, 0, Math.PI * 2); ui.fill(); ui.restore();
  const cloud = (x, y, s) => { ui.fillStyle = 'rgba(255,255,255,0.95)'; ui.beginPath(); ui.arc(x, y, 22 * s, 0, Math.PI * 2); ui.arc(x + 26 * s, y - 12 * s, 28 * s, 0, Math.PI * 2); ui.arc(x + 56 * s, y, 22 * s, 0, Math.PI * 2); ui.rect(x, y - 4 * s, 56 * s, 26 * s); ui.fill(); };
  cloud(380 + lt * 6, 80, 1.1); cloud(720 + lt * 4, 130, 0.8); cloud(1010 + lt * 5, 70, 1.0);
  ui.strokeStyle = '#2b3a4a'; ui.lineWidth = 3; ui.lineCap = 'round';
  for (let i = 0; i < 4; i++) { const gx = 520 + i * 70 + Math.sin(lt + i) * 20 + lt * 10, gy = 170 + (i % 2) * 22, f = Math.sin(lt * 8 + i) * 6; ui.beginPath(); ui.moveTo(gx - 14, gy - f); ui.quadraticCurveTo(gx - 7, gy - 8, gx, gy); ui.quadraticCurveTo(gx + 7, gy - 8, gx + 14, gy - f); ui.stroke(); }
  // ---- water body
  ui.save();
  ui.beginPath(); ui.moveTo(X0, surf(X0));
  for (let x = X0; x <= X1; x += 4) ui.lineTo(x, Math.min(surf(x), floorY(x)));
  for (let x = X1; x >= X0; x -= 4) ui.lineTo(x, floorY(x));
  ui.closePath(); const wgr = ui.createLinearGradient(0, 100, 0, 600); wgr.addColorStop(0, '#3fc6e0'); wgr.addColorStop(0.45, '#147fb0'); wgr.addColorStop(1, '#0a3e70'); ui.fillStyle = wgr; ui.fill();
  ui.clip();
  // light rays
  for (let i = 0; i < 7; i++) { const x0 = 80 + i * 170 + Math.sin(lt * 0.6 + i) * 20; ui.fillStyle = 'rgba(255,255,255,0.06)'; ui.beginPath(); ui.moveTo(x0, seaY - 10); ui.lineTo(x0 + 60, seaY - 10); ui.lineTo(x0 + 160, 600); ui.lineTo(x0 + 70, 600); ui.fill(); }
  // fish
  const fishC = ['#ffb347', '#ffd23f', '#7fe0ff', '#ff7b6b'];
  for (let i = 0; i < 9; i++) {
    const dir = i % 2 ? 1 : -1, fy = 360 + (i * 47) % 190, fx = ((i * 157 + lt * 40 * dir) % 900 + 900) % 900 + 40;
    if (fy > floorY(fx) - 14) continue;
    ui.save(); ui.translate(fx, fy + Math.sin(lt * 3 + i) * 4); ui.scale(dir, 1); ui.fillStyle = fishC[i % 4];
    ui.beginPath(); ui.ellipse(0, 0, 14, 7, 0, 0, Math.PI * 2); ui.fill(); ui.beginPath(); ui.moveTo(-12, 0); ui.lineTo(-22, -7); ui.lineTo(-22, 7); ui.fill();
    ui.fillStyle = '#10202a'; ui.beginPath(); ui.arc(7, -2, 1.8, 0, Math.PI * 2); ui.fill(); ui.restore();
  }
  // bubbles
  for (let i = 0; i < 18; i++) { const bx = 60 + i * 67 + Math.sin(lt * 2 + i) * 6, life = (lt * 0.35 + i * 0.13) % 1, by = floorY(bx) - life * (floorY(bx) - seaY); ui.strokeStyle = 'rgba(255,255,255,0.45)'; ui.lineWidth = 1.5; ui.beginPath(); ui.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2); ui.stroke(); }
  ui.restore();
  // surface line + foam on the crest
  ui.strokeStyle = '#ffffff'; ui.lineWidth = 4; ui.beginPath(); for (let x = X0; x <= X1; x += 4) { const y = surf(x); if (y < floorY(x)) ui.lineTo(x, y); else ui.moveTo(x, floorY(x)); } ui.stroke();
  if (amp > 60) { for (let i = 0; i < 9; i++) { const fx2 = xc - wd * 0.4 + i * 6, fy2 = surf(fx2) - 4; ui.fillStyle = 'rgba(255,255,255,0.9)'; ui.beginPath(); ui.arc(fx2, fy2 + Math.sin(lt * 12 + i) * 2, 6 + (i % 3) * 2, 0, Math.PI * 2); ui.fill(); } }
  // ---- seafloor with layers, rocks and seaweed
  const floorPath = (off) => { ui.beginPath(); ui.moveTo(X0, H); for (let x = X0; x <= X1; x += 4) { let y = floorY(x) + off; if (x > 240 && x < 420) y -= lift; ui.lineTo(x + (x > 240 && x < 420 ? sh : 0), y); } ui.lineTo(X1, H); ui.closePath(); };
  floorPath(0); ui.fillStyle = '#d4ae72'; ui.fill(); ui.strokeStyle = '#8a6a40'; ui.lineWidth = 3; ui.stroke();
  floorPath(28); ui.fillStyle = '#b98f58'; ui.fill();
  floorPath(62); ui.fillStyle = '#9a7344'; ui.fill();
  floorPath(100); ui.fillStyle = '#7d5c36'; ui.fill();
  for (let i = 0; i < 10; i++) { const rx = 70 + i * 113, ry = floorY(rx) + 2; ui.fillStyle = i % 2 ? '#7b7a70' : '#8f8d82'; ui.beginPath(); ui.ellipse(rx, ry, 12 + (i % 3) * 4, 7, 0, Math.PI, 0); ui.fill(); }
  ui.strokeStyle = '#2f8f4a'; ui.lineWidth = 4;
  for (let i = 0; i < 14; i++) { const sx = 40 + i * 83 + (i % 2) * 20, base = floorY(sx); if (base < seaY + 30) continue; ui.beginPath(); ui.moveTo(sx, base); for (let k = 1; k <= 5; k++) ui.lineTo(sx + Math.sin(lt * 2 + i + k) * 5, base - k * 9); ui.stroke(); }
  // plates and the fault
  ui.strokeStyle = '#e8443a'; ui.lineWidth = 5; ui.beginPath(); ui.moveTo(330, 595 - lift); ui.lineTo(322, 640); ui.lineTo(336, 700); ui.stroke();
  ui.textBaseline = 'middle';
  ui.textAlign = 'left'; outlined('PLACA OCEÂNICA →', 60, 702, 18, '#ffe9c4', '#4a3218', 800, 0.18);
  ui.textAlign = 'right'; outlined('← PLACA CONTINENTAL', 1250, 702, 18, '#ffe9c4', '#4a3218', 800, 0.18);
  if (mode === 'explain' && lt > pE + 0.3) {   // shockwave rings from the epicentre
    const k = lt - pE - 0.3;
    for (let r = 0; r < 3; r++) { const rad = ((k * 160 + r * 60) % 220); ui.strokeStyle = `rgba(255,220,80,${0.7 * (1 - rad / 220) * (1 - ss(2.5, 3.5, k))})`; ui.lineWidth = 4; ui.beginPath(); ui.arc(330, 610, rad, Math.PI, Math.PI * 2); ui.stroke(); }
    ui.save(); ui.translate(330, 610); ui.rotate(k * 2); ui.fillStyle = '#ffd23f'; ui.beginPath(); for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? 7 : 16, an = i / 10 * Math.PI * 2; ui.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2); } ui.fill(); ui.restore();
  }
  // depth ruler
  ui.strokeStyle = 'rgba(255,255,255,0.8)'; ui.lineWidth = 2; ui.beginPath(); ui.moveTo(22, seaY); ui.lineTo(22, 585); ui.stroke();
  for (const [yy, lab] of [[seaY, '0 m'], [440, '2.000 m'], [585, '4.000 m']]) { ui.beginPath(); ui.moveTo(16, yy); ui.lineTo(30, yy); ui.stroke(); ui.textAlign = 'left'; outlined(lab, 36, yy, 15, '#ffffff', '#0a1428', 800, 0.2); }
  ui.textAlign = 'center'; outlined('↕ 10 m', 1035, 290, 15, '#ffffff', '#0a1428', 800, 0.2);
  // boat riding the surface (the wave passes underneath almost unnoticed)
  { const bx = 600, by = surf(bx); const slope = (surf(bx + 10) - surf(bx - 10)) / 20; ui.save(); ui.translate(bx, by); ui.rotate(Math.atan(slope));
    ui.fillStyle = '#c0392b'; ui.beginPath(); ui.moveTo(-34, -4); ui.lineTo(34, -4); ui.lineTo(24, 10); ui.lineTo(-24, 10); ui.closePath(); ui.fill();
    ui.fillStyle = '#ffffff'; ui.fillRect(-14, -18, 24, 14); ui.fillStyle = '#5fb4f0'; ui.fillRect(-10, -15, 6, 6); ui.fillRect(0, -15, 6, 6);
    ui.strokeStyle = '#333'; ui.lineWidth = 2; ui.beginPath(); ui.moveTo(16, -4); ui.lineTo(16, -30); ui.stroke(); ui.fillStyle = '#ffd23f'; ui.beginPath(); ui.moveTo(16, -30); ui.lineTo(30, -25); ui.lineTo(16, -20); ui.fill(); ui.restore(); }
  // shore: sand, grass, town, palm and a tiny bean
  ui.fillStyle = '#7bb24a'; ui.beginPath(); ui.moveTo(1150, 270); ui.lineTo(X1, 262); ui.lineTo(X1, 300); ui.lineTo(1150, 300); ui.fill();
  [[1172, 34, '#f6c8a0'], [1196, 52, '#a8d8ea'], [1226, 40, '#ffe6a7'], [1250, 60, '#f7a7a7']].forEach(([bx, bh, c]) => { ui.fillStyle = c; ui.fillRect(bx, 266 - bh, 20, bh); ui.fillStyle = '#5f8fb3'; for (let k = 0; k < bh / 12 - 1; k++) { ui.fillRect(bx + 4, 270 - bh + k * 12, 5, 6); ui.fillRect(bx + 11, 270 - bh + k * 12, 5, 6); } });
  ui.strokeStyle = '#8a6a45'; ui.lineWidth = 4; ui.beginPath(); ui.moveTo(1130, 270); ui.quadraticCurveTo(1135, 232, 1125, 207); ui.stroke(); ui.fillStyle = '#3f8f2f'; ui.beginPath(); ui.ellipse(1125, 205, 22, 7, 0.3, 0, Math.PI * 2); ui.ellipse(1125, 205, 22, 7, -0.4, 0, Math.PI * 2); ui.fill();
  ui.fillStyle = '#7a4421'; ui.beginPath(); ui.ellipse(1100, 268, 7, 10, 0, 0, Math.PI * 2); ui.fill();
  // panel title
  ui.textAlign = 'left'; ui.font = '900 18px "Inter Display"'; { const tw2 = ui.measureText('COMO FUNCIONA UM TSUNAMI').width; ui.fillStyle = 'rgba(10,20,40,0.75)'; rr(1260 - tw2 - 36, 20, tw2 + 36, 40, 20); ui.fill(); ui.fillStyle = '#fff'; ui.fillText('COMO FUNCIONA UM TSUNAMI', 1260 - tw2 - 18, 41); }
  ui.textAlign = 'center';
  if (mode === 'explain') {
    if (lt < pE) {
      ui.save(); ui.translate(640, 150); const s = pop(lt - 0.3); ui.scale(s, s);
      ui.fillStyle = '#1a8fb5'; ui.beginPath(); ui.moveTo(-120, 60); ui.bezierCurveTo(-60, 60, -40, -70, 40, -60); ui.bezierCurveTo(90, -55, 100, -10, 70, 0); ui.bezierCurveTo(60, -30, 20, -30, 10, 0); ui.bezierCurveTo(0, 30, 40, 60, 120, 60); ui.closePath(); ui.fill();
      ui.fillStyle = '#ffd23f'; ui.save(); ui.translate(-20, 10); ui.rotate(-0.5); ui.beginPath(); ui.ellipse(0, 0, 40, 8, 0, 0, Math.PI * 2); ui.fill(); ui.restore();
      if (lt > 1.0) { ui.strokeStyle = '#e8262a'; ui.lineWidth = 16; ui.lineCap = 'round'; ui.beginPath(); ui.moveTo(-110, -80); ui.lineTo(110, 80); ui.moveTo(110, -80); ui.lineTo(-110, 80); ui.stroke(); }
      ui.restore(); outlined('NÃO é onda de surfe!', 640, 262, 34, '#ffffff', '#0a1428', 900, 0.2);
    }
    if (lt > pE + 0.3) { const k = ss(pE + 0.3, pE + 0.7, lt) * (1 - ss(pT - 0.2, pT, lt)); ui.globalAlpha = a * k; outlined('TERREMOTO NO FUNDO DO MAR', 360, 500, 30, '#ffd23f', '#0a1428', 900, 0.2); outlined('empurra o oceano pra cima ↑', 330, 360, 24, '#ffffff', '#0a1428', 800, 0.2); ui.globalAlpha = a; }
    if (lt > pT) {
      const k = ss(pT, pT + 0.4, lt) * (1 - ss(pG - 0.2, pG, lt)); ui.globalAlpha = a * k;
      // airplane racing the wave
      ui.save(); ui.translate(xc + 10, 175); ui.fillStyle = '#ffffff'; ui.strokeStyle = '#0a1428'; ui.lineWidth = 3;
      ui.beginPath(); ui.ellipse(0, 0, 48, 9, 0, 0, Math.PI * 2); ui.fill(); ui.stroke();
      ui.beginPath(); ui.moveTo(-6, 0); ui.lineTo(-22, 26); ui.lineTo(-8, 26); ui.lineTo(12, 0); ui.closePath(); ui.fill(); ui.stroke();
      ui.beginPath(); ui.moveTo(-36, -2); ui.lineTo(-48, -20); ui.lineTo(-40, -20); ui.lineTo(-28, -2); ui.closePath(); ui.fill(); ui.stroke();
      ui.fillStyle = '#5fb4f0'; for (let i = 0; i < 5; i++) ui.fillRect(-10 + i * 10, -4, 5, 4);
      ui.strokeStyle = 'rgba(255,255,255,0.8)'; ui.lineWidth = 3; for (let i = 0; i < 3; i++) { ui.beginPath(); ui.moveTo(-60 - i * 4, -6 + i * 6); ui.lineTo(-110 - i * 10, -6 + i * 6); ui.stroke(); }
      ui.restore();
      outlined('~800 km/h', xc, 225, 40, '#ffffff', '#0a1428', 900, 0.2); outlined('quase invisível em alto-mar', xc, 266, 22, '#ffd23f', '#0a1428', 800, 0.2); ui.globalAlpha = a;
    }
    if (lt > pG) { const k = ss(pG, pG + 0.4, lt); ui.globalAlpha = a * k; outlined('Perto da costa: FREIA e CRESCE', 640, 60, 40, '#ffffff', '#0a1428', 900, 0.2); outlined('10+ m', xc - 95, seaY - amp * 0.6, 34, '#ffd23f', '#0a1428', 900, 0.2); ui.globalAlpha = a; }
  } else {
    outlined('O mar recua ANTES da onda chegar', 640, 60, 40, '#ffffff', '#0a1428', 900, 0.2);
    const k = ss(0.8, 2.0, lt); ui.globalAlpha = a * k;
    ui.strokeStyle = '#ffd23f'; ui.lineWidth = 8; ui.lineCap = 'round'; const ax = 1080; ui.beginPath(); ui.moveTo(ax, 340); ui.lineTo(ax - 120, 340); ui.moveTo(ax - 120, 340); ui.lineTo(ax - 95, 322); ui.moveTo(ax - 120, 340); ui.lineTo(ax - 95, 358); ui.stroke();
    outlined('água puxada', ax - 60, 385, 26, '#ffd23f', '#0a1428', 900, 0.2);
    outlined('ÚLTIMO AVISO!', 640, 470, 46, '#ff6b5a', '#0a1428', 900, 0.2);
    ui.fillStyle = '#ff8a2a'; for (let i = 0; i < 4; i++) { ui.beginPath(); ui.ellipse(1000 + i * 16, floorY(1000 + i * 16) - 4 - Math.abs(Math.sin(lt * 8 + i)) * 6, 7, 4, 0, 0, Math.PI * 2); ui.fill(); }
    ui.globalAlpha = a; outlined('?', 1100, 238, 26, '#ffffff', '#0a1428', 900, 0.2);
  }
  ui.restore();
}
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

function overlay(t, g, wt) {
  ui.clearRect(0, 0, W, H);
  const lt = t - g.start, n = g.scene;
  const fadeIn = ss(0, 0.3, lt);
  if (n === 'twist') vignette(0.65 * ss(0.5, g.dur, lt));
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
  if (n === 'friend1') { ui.save(); const [x, y] = headOnScreen(friend, 0.9); ui.translate(x + 90, y - 60); const s = pop(lt - 0.2, 0.3); ui.scale(s, s); ui.rotate(0.1); ui.textAlign = 'center'; outlined('?!', 0, 0, 80, '#5fd0ff', '#0a1428', 900, 0.18); ui.restore(); }
  if (n === 'horizon') {
    const c1 = capAt('dez metros', g.start) - g.start, c2 = capAt('densa', g.start) - g.start;
    if (lt > c1) {
      // soft tsunami alert: pulsing red edges + a blinking label
      const pulse = 0.22 + 0.1 * Math.sin((lt - c1) * 6);
      vignette(pulse, '200,20,20');
      if (Math.floor((lt - c1) * 2.2) % 2 === 0) { ui.save(); ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.fillStyle = 'rgba(200,24,24,0.92)'; rr(470, 26, 340, 56, 28); ui.fill(); ui.fillStyle = '#fff'; ui.font = '900 28px "Inter Display"'; ui.fillText('⚠ ALERTA DE TSUNAMI', 640, 56); ui.restore(); }
    }
    if (lt > c1 && lt < c2) {
      const zf = front(wt); const crestY = waterH(-6, zf - 3, wt);
      const top = V(-6, crestY, zf - 3).project(camera), base = V(-6, seaBase(wt), zf - 1).project(camera);
      const x = (top.x * 0.5 + 0.5) * W + 180, y0 = (-base.y * 0.5 + 0.5) * H, y1 = (-top.y * 0.5 + 0.5) * H;
      const k = ss(c1, c1 + 0.5, lt); const yy = lerp(y0, y1, k);
      ui.save(); ui.strokeStyle = '#ffd23f'; ui.lineWidth = 6; ui.beginPath(); ui.moveTo(x, y0); ui.lineTo(x, yy); ui.moveTo(x - 18, y0); ui.lineTo(x + 18, y0); ui.moveTo(x - 18, yy); ui.lineTo(x + 18, yy); ui.stroke();
      ui.textAlign = 'left'; ui.textBaseline = 'middle'; outlined('+10 metros', x + 28, (y0 + yy) / 2, 44, '#ffd23f', '#0a1428', 900, 0.2); ui.restore();
    }
  }
  if (n === 'friend2') { const k = lt - 0.2; if (k > 0) { const [hx, hy] = headOnScreen(friend); questionMarks(k, clamp(hx, 300, 980), clamp(hy, 300, 420)); } }
  if (n === 'car2') {
    if (lt > 0.8 && lt < 3.4) { const bl = (Math.floor(lt * 4) % 2) ? 1 : 0; ui.save(); ui.textAlign = 'center'; ui.translate(930, 190); ui.rotate(-0.12); ui.scale(pop(lt - 0.8, 0.25), pop(lt - 0.8, 0.25)); outlined('BIIIIP!', 0, 0, 64, bl ? '#ffd23f' : '#ffffff', '#e8443a', 900, 0.2); ui.restore(); ui.save(); ui.textAlign = 'center'; ui.translate(300, 230); ui.rotate(0.1); outlined('FOOOM!', 0, 0, 44, '#ffffff', '#0a1428', 900, 0.2); ui.restore(); }
    badge('✗ PÉSSIMA IDEIA', ss(0, 0.3, lt), '#c62828');
  }
  if (n === 'carhit') { badge('✗ PÉSSIMA IDEIA', 1, '#c62828'); if (lt > 1.6) { ui.save(); ui.textAlign = 'center'; ui.textBaseline = 'middle'; for (let i = 0; i < 3; i++) { const a = ss(1.6 + i * 0.35, 1.8 + i * 0.35, lt); if (a <= 0) continue; ui.globalAlpha = a; outlined('glub', 600 + i * 90, 300 - i * 50, 34 + i * 6, '#ffffff', '#1557b0', 900, 0.2); } ui.restore(); } }
  if (n === 'replay') vhs(t, lt);
  if (n === 'idea') { const [x, y] = headOnScreen(hero, 1.0); lightbulb(x, y - 70, lt); }
  if (n === 'answer') badge('★ REGRA DE OURO: PRA CIMA E PRA LONGE', fadeIn, '#1e9e57');
  if (n === 'building' || n === 'elev' || n === 'stairs' || n === 'stairs2') badge('PLANO B: PRÉDIO ALTO', n === 'building' ? fadeIn : 1, '#1557b0');
  if (n === 'stairs') { ui.save(); const [x, y] = [380, 330]; ui.translate(x, y); const s = pop(lt - 0.1, 0.3); ui.scale(s, s); ui.strokeStyle = '#e8262a'; ui.lineWidth = 18; ui.lineCap = 'round'; ui.beginPath(); ui.arc(0, 0, 95, 0, Math.PI * 2); ui.stroke(); ui.beginPath(); ui.moveTo(-67, -67); ui.lineTo(67, 67); ui.stroke(); ui.restore(); }
  if (n === 'stairs2') { const cA = capAt('terceiro', g.start) - g.start; if (lt > cA) { ui.save(); ui.globalAlpha = ss(cA, cA + 0.3, lt); ui.textAlign = 'center'; outlined('3º ANDAR OU MAIS ↑', 900, 200, 44, '#ffffff', '#1557b0', 900, 0.2); ui.restore(); } }
  if (n === 'backwash') {
    badge('↩ A ÁGUA VOLTA COM FORÇA', fadeIn, '#c25a12');
    const cF = capAt('fios', g.start) - g.start, cM = capAt('mergulhinho', g.start) - g.start;
    if (lt > cF - 0.1 && lt < cM - 0.4) { ui.save(); ui.textAlign = 'center'; ui.translate(860, 230); ui.rotate(-0.08); ui.scale(pop(lt - cF + 0.1, 0.25), pop(lt - cF + 0.1, 0.25)); outlined('⚡ PERIGO ⚡', 0, 0, 56, '#ffd23f', '#0a1428', 900, 0.2); ui.restore(); }
    if (lt > cM - 0.4) { ui.save(); ui.textAlign = 'center'; ui.translate(900, 200); ui.rotate(0.06); ui.scale(pop(lt - cM + 0.4, 0.25), pop(lt - cM + 0.4, 0.25)); outlined('NEM PENSAR!', 0, 0, 60, '#ff6b5a', '#0a1428', 900, 0.2); ui.restore(); }
  }
  if (n === 'zap2') {
    const [x, y] = headOnScreen(friend, 0.2);
    if (lt > 0.5 && lt < 1.8) {   // electric shock: bolts, blue flashes and a big ZZZT
      ui.save(); ui.globalAlpha = 0.25 + 0.2 * (Math.floor(lt * 14) % 2); ui.fillStyle = '#9fe7ff'; ui.fillRect(0, 0, W, H); ui.restore();
      ui.save(); ui.lineJoin = 'round';
      for (let b = 0; b < 7; b++) { const r = Math.sin(b * 91.3 + Math.floor(lt * 18) * 7.7) * 1e4; const f = r - Math.floor(r); const an = f * Math.PI * 2; let px = x, py = y; ui.beginPath(); ui.moveTo(px, py);
        for (let k = 0; k < 6; k++) { px += Math.cos(an) * 28 + (((f * (k + 3) * 13.7) % 1) - 0.5) * 40; py += Math.sin(an) * 28 + (((f * (k + 5) * 7.3) % 1) - 0.5) * 40; ui.lineTo(px, py); }
        ui.strokeStyle = '#ffffff'; ui.lineWidth = 7; ui.stroke(); ui.strokeStyle = '#38c8ff'; ui.lineWidth = 3.5; ui.stroke(); }
      ui.restore();
      ui.save(); ui.textAlign = 'center'; ui.translate(x + 30, y - 190); ui.rotate(-0.1 + Math.sin(lt * 40) * 0.04); const s2 = pop(lt - 0.5, 0.2); ui.scale(s2, s2); outlined('ZZZZT!', 0, 0, 84, '#ffe14d', '#0a1428', 900, 0.17); ui.restore();
    }
    if (lt > 1.7 && lt < 2.6) {   // puff of smoke
      for (let i = 0; i < 9; i++) { const k = lt - 1.7, ang = i / 9 * Math.PI * 2, rad = 20 + k * 90; ui.fillStyle = `rgba(90,90,90,${0.55 * (1 - k / 0.9)})`; ui.beginPath(); ui.arc(x + Math.cos(ang) * rad, y - 60 - k * 80 + Math.sin(ang) * rad * 0.5, 26 + k * 30, 0, Math.PI * 2); ui.fill(); }
    }
    if (lt > 2.6) { ui.save(); ui.textAlign = 'center'; ui.globalAlpha = ss(2.7, 3.0, lt); outlined('...', 860, 230, 90, '#ffffff', '#0a1428', 900, 0.18); ui.restore(); }
  }
  if (n === 'friend3' || (n === 'safe' && false)) { const [x, y] = headOnScreen(friend, 1.0); for (let i = 0; i < 4; i++) { const life = (lt * 0.7 + i / 4) % 1; ui.fillStyle = `rgba(110,110,110,${0.5 * (1 - life)})`; ui.beginPath(); ui.arc(x + Math.sin(lt * 3 + i) * 12, y - life * 120, 10 + life * 18, 0, Math.PI * 2); ui.fill(); } }
  if (n === 'friend3' || n === 'safe') badge('✓ SEGURO NO ALTO', n === 'friend3' ? fadeIn : 1, '#1e9e57');
  if (n === 'safe') {
    const cW = capAt('várias', g.start) - g.start, cS = capAt('desça', g.start) - g.start;
    if (lt > cW && lt < cW + 3.5) { ui.save(); ui.globalAlpha = ss(cW, cW + 0.3, lt) * (1 - ss(cW + 3, cW + 3.5, lt)); ui.textAlign = 'center'; outlined('ONDA 2 a caminho...', 900, 210, 40, '#ffffff', '#e8443a', 900, 0.2); ui.restore(); }
    if (lt > cS) { ui.save(); ui.globalAlpha = ss(cS, cS + 0.3, lt); ui.textAlign = 'center'; ui.fillStyle = 'rgba(255,140,0,0.95)'; rr(760, 160, 440, 70, 16); ui.fill(); ui.fillStyle = '#fff'; ui.font = '900 30px "Inter Display"'; ui.textBaseline = 'middle'; ui.fillText('📢 AGUARDE A DEFESA CIVIL', 980, 196); ui.restore(); }
  }
  if (n === 'q1') { ui.save(); ui.translate(940, 200); const s = pop(lt - 0.2); ui.scale(s, s); ui.rotate(0.05); ui.textAlign = 'center'; outlined('SOBREVIVER ✓', 0, 0, 54, '#5ff08a', '#0a1428', 900, 0.2); ui.restore(); }
  if (['q2', 'q3', 'q4'].includes(n)) { ui.save(); ui.translate(330, 200); const s = pop(t - T0('q2') - 0.2); ui.scale(s, s); ui.rotate(-0.05); ui.textAlign = 'center'; outlined('TOMAR SOL E SURFAR ☀', 0, 0, 48, '#ffd23f', '#0a1428', 900, 0.2); ui.restore(); }
  if ((n === 'gulp1' && t > TS1 + 0.3) || n === 'ohoh') { ui.save(); ui.textAlign = 'center'; ui.textBaseline = 'middle'; ui.globalAlpha = n === 'ohoh' ? 1 - ss(0.4, 0.8, lt) : 1; outlined('glub', 980, 260, 40, '#ffffff', '#1557b0', 900, 0.2); ui.restore(); }
  if (n === 'swallow' && t > TS2 + 0.6) {
    const k = t - TS2 - 0.6;
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
  if (n !== 'title' && n !== 'end' && !NOCAP) caption(t);
  if (flash > 0) { ui.fillStyle = `rgba(255,255,255,${flash})`; ui.fillRect(0, 0, W, H); }
  if (t < 0.5) { ui.fillStyle = `rgba(0,0,0,${1 - t / 0.5})`; ui.fillRect(0, 0, W, H); }
  const fo = ss(TL.total - 1.0, TL.total, t); if (fo > 0) { ui.fillStyle = `rgba(0,0,0,${fo})`; ui.fillRect(0, 0, W, H); }
}

window.renderFrame = (t) => {
  const g = seg(t); REAL_T = t;
  GAG = ['q2', 'q3', 'q4', 'gulp1', 'ohoh', 'swallow'].includes(g.scene);
  const wt = worldTime(t);
  world(t, wt, g.scene); direct(t, wt);
  sunSprite.position.copy(camera.position).addScaledVector(skyU.sunDir.value, 420); sunHalo.position.copy(sunSprite.position);
  renderer.render(scene, camera); overlay(t, g, wt); return true;
};
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"'); await document.fonts.load('800 40px "Inter Display"');
window.READY = true;
