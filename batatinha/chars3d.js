// EP13 3D characters (cartoon, toon-shaded with ink outlines). Faces are canvas textures on a sphere patch, redrawn each frame (eyes, brows, mouth, blink, sweat).
// makeHuman(opts) → {root, ...joints, pose(p)}; makeDoll() → giant doll. Built facing +z, feet at y=0.
const CH = [];
function cpart(geo, col, parent, ink = 0.06, x = 0, y = 0, z = 0) {
  const mat = typeof col === 'string' ? toon(col) : col;
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; m.position.set(x, y, z); parent.add(m);
  if (ink) { const k = new THREE.Mesh(geo, inkM); k.scale.setScalar(1 + ink); m.add(k); }
  return m;
}
const joint = (parent, x, y, z) => { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); return j; };
// a limb segment hanging down from its joint (length L, radius r)
function limb(j, L, r, col, ink = 0.08) { const m = cpart(new THREE.CapsuleGeometry(r, L - 2 * r, 6, 12), col, j, ink); m.position.y = -L / 2; return m; }

function faceCanvas() { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return { cv, tx }; }
// draws a face onto the patch texture. f: {mouth: smile|o|scream|flat|open, brows -1..1, blink 0..1, look [x,y], sweat, iris, girl, cheeks}
function drawFace(F, f) {
  const c = F.cv.getContext('2d'); c.clearRect(0, 0, 512, 512); c.lineCap = 'round'; c.lineJoin = 'round';
  const ey = 232, lk = f.look || [0, 0], scared = f.mouth === 'o' || f.mouth === 'scream', bl = f.blink || 0;
  for (const sx of [-1, 1]) {
    const ex = 256 + sx * 80, rx = 40, ry = (scared ? 52 : 45) * (1 - bl * 0.92);
    c.fillStyle = '#ffffff'; c.strokeStyle = '#1c1420'; c.lineWidth = 7; c.beginPath(); c.ellipse(ex, ey, rx, Math.max(2, ry), 0, 0, 7); c.fill(); c.stroke();
    if (bl < 0.6) { c.save(); c.beginPath(); c.ellipse(ex, ey, rx, ry, 0, 0, 7); c.clip(); c.fillStyle = f.iris || '#5a3a22'; c.beginPath(); c.arc(ex + lk[0] * 14, ey + lk[1] * 14 + 4, 24, 0, 7); c.fill(); c.fillStyle = '#120c0c'; c.beginPath(); c.arc(ex + lk[0] * 14, ey + lk[1] * 14 + 4, 13, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + lk[0] * 14 + 8, ey + lk[1] * 14 - 6, 7, 0, 7); c.fill(); c.restore(); }
    if (f.girl) { c.lineWidth = 5; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(ex + sx * (10 + k * 10), ey - ry + 4); c.lineTo(ex + sx * (16 + k * 13), ey - ry - 12); c.stroke(); } }
    const b = f.brows ?? (scared ? -1 : 0); c.strokeStyle = f.browC || '#2a1a12'; c.lineWidth = 16; c.beginPath(); c.moveTo(ex - sx * 36, ey - 72 - (b < 0 ? 12 : 0)); c.lineTo(ex + sx * 36, ey - 72 + b * 12); c.stroke();
  }
  if (f.cheeks !== false) { c.fillStyle = 'rgba(230,100,100,0.35)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(256 + sx * 118, 300, 32, 17, 0, 0, 7); c.fill(); } }
  c.strokeStyle = '#8a5a3a'; c.lineWidth = 6; c.beginPath(); c.moveTo(250, 270); c.quadraticCurveTo(262, 292, 272, 282); c.stroke();   // nose
  const my = 340, m = f.mouth || 'smile'; c.strokeStyle = '#1c1420'; c.lineWidth = 10;
  if (m === 'o') { c.fillStyle = '#6a1a1a'; c.beginPath(); c.ellipse(256, my, 20, 27, 0, 0, 7); c.fill(); c.stroke(); }
  else if (m === 'scream') { c.fillStyle = '#6a1a1a'; c.beginPath(); c.ellipse(256, my + 6, 36, 44, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(238, my - 26, 36, 10); }
  else if (m === 'flat') { c.beginPath(); c.moveTo(226, my); c.lineTo(286, my); c.stroke(); }
  else if (m === 'grin') { c.fillStyle = '#6a1a1a'; c.beginPath(); c.moveTo(220, my - 10); c.quadraticCurveTo(256, my + 44, 292, my - 10); c.closePath(); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(230, my - 8, 52, 9); }
  else { c.beginPath(); c.moveTo(214, my - 10); c.quadraticCurveTo(256, my + 26, 298, my - 10); c.stroke(); }
  if (f.sweat) { c.fillStyle = '#bfe4ff'; c.strokeStyle = '#1c1420'; c.lineWidth = 5; c.beginPath(); c.moveTo(372, 150); c.quadraticCurveTo(396, 196, 372, 208); c.quadraticCurveTo(348, 196, 372, 150); c.fill(); c.stroke(); }
  F.tx.needsUpdate = true;
}

// opts: hood, hoodD, pants, skin, hair, iris, long (long hair), cap (short cropped), shoes: 'white'|'fila'|'thin', girl
function makeHuman(o) {
  const H = { root: new THREE.Group(), o }; scene.add(H.root);
  const skin = toon(o.skin), hood = toon(o.hood), hoodD = toon(o.hoodD), pants = toon(o.pants), hair = toon(o.hair);
  H.hips = joint(H.root, 0, 0.92, 0);
  // legs: thigh + shin + shoe (with sole)
  H.leg = [];
  for (const sx of [-1, 1]) {
    const hip = joint(H.hips, sx * 0.1, 0, 0); limb(hip, 0.44, 0.085, pants);
    const knee = joint(hip, 0, -0.44, 0); limb(knee, 0.42, 0.075, pants);
    const ank = joint(knee, 0, -0.42, 0);
    const shoe = {};
    for (const kind of ['white', 'fila', 'thin']) {
      const g2 = new THREE.Group(); ank.add(g2);
      const soleH = kind === 'fila' ? 0.065 : kind === 'thin' ? 0.012 : 0.03, up = kind === 'fila' ? '#1d1d24' : kind === 'thin' ? '#f08aa8' : '#f4f4f0', sc = kind === 'fila' ? '#f4f2f8' : kind === 'thin' ? '#f6dde4' : '#e04a3a';
      cpart(new THREE.BoxGeometry(0.15, soleH, 0.3), sc, g2, 0.05, 0, -0.06 - soleH / 2 + 0.02 - (kind === 'fila' ? 0.0 : 0), 0.05);
      const top = cpart(new THREE.SphereGeometry(0.09, 14, 10), up, g2, 0.07, 0, -0.01 + (kind === 'fila' ? 0.03 : 0), 0.06); top.scale.set(0.85, 0.7, 1.6);
      if (kind === 'fila') { for (const s2 of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.025, 0.16), new THREE.MeshBasicMaterial({ color: '#f4f2f8' })); st.position.set(s2 * 0.078, 0.0, 0.07); st.rotation.x = -0.3; g2.add(st); } }
      shoe[kind] = g2;
    }
    H.leg.push({ hip, knee, ank, shoe });
  }
  // torso (hoodie): body + waistband + pocket + hood behind the neck
  H.spine = joint(H.hips, 0, 0, 0);
  const body = cpart(new THREE.CylinderGeometry(0.2, 0.22, 0.58, 16), hood, H.spine, 0.04, 0, 0.29, 0); body.scale.z = 0.72;
  const sh = cpart(new THREE.SphereGeometry(0.2, 16, 10), hood, H.spine, 0.04, 0, 0.56, 0); sh.scale.set(1.08, 0.5, 0.75);
  cpart(new THREE.CylinderGeometry(0.222, 0.222, 0.06, 16), hoodD, H.spine, 0.03, 0, 0.03, 0).scale.z = 0.74;
  const pocket = cpart(new THREE.BoxGeometry(0.22, 0.12, 0.02), hoodD, H.spine, 0.06, 0, 0.16, 0.158);
  const hoodBack = cpart(new THREE.TorusGeometry(0.11, 0.05, 8, 16), hoodD, H.spine, 0.06, 0, 0.62, -0.08); hoodBack.rotation.x = 1.2;
  if (o.strings !== false) for (const s2 of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.14, 6), toon('#f4f4f0')); st.position.set(s2 * 0.045, 0.5, 0.15); H.spine.add(st); }
  // arms
  H.arm = [];
  for (const sx of [-1, 1]) {
    const shJ = joint(H.spine, sx * 0.25, 0.54, 0); limb(shJ, 0.3, 0.065, hood);
    const el = joint(shJ, 0, -0.3, 0); limb(el, 0.27, 0.058, sx < 0 ? hood : hood);
    const hand = cpart(new THREE.SphereGeometry(0.062, 12, 10), skin, el, 0.08, 0, -0.29, 0);
    H.arm.push({ sh: shJ, el, hand });
  }
  // phone in the right hand (hidden unless needed)
  H.phone = cpart(new THREE.BoxGeometry(0.075, 0.14, 0.012), '#1c1c22', H.arm[1].hand, 0.08, 0, 0.02, 0.06); H.phone.visible = false;
  { const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.062, 0.12), new THREE.MeshBasicMaterial({ color: '#8fd0ff' })); scr.position.z = 0.0065; H.phone.add(scr); }
  // head
  H.neck = joint(H.spine, 0, 0.6, 0);
  cpart(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 10), skin, H.neck, 0.06, 0, 0.04, 0);
  H.head = joint(H.neck, 0, 0.27, 0);
  const R = 0.2; cpart(new THREE.SphereGeometry(R, 24, 18), skin, H.head, 0.035).scale.set(1, 1.05, 0.98);
  for (const sx of [-1, 1]) cpart(new THREE.SphereGeometry(0.045, 10, 8), skin, H.head, 0.08, sx * 0.195, -0.01, 0).scale.set(0.6, 1, 0.8);
  H.F = faceCanvas();
  const faceM = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 32, 24, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.22, Math.PI * 0.56), new THREE.MeshBasicMaterial({ map: H.F.tx, transparent: true, depthWrite: false }));
  faceM.scale.set(1, 1.05, 0.98); H.head.add(faceM);
  // hair: a cap over the top/back + a messy fringe of little cones (or long hair down the back)
  const hc = cpart(new THREE.SphereGeometry(R * 1.07, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, H.head, 0.04, 0, 0.02, -0.012); hc.rotation.x = -0.32;
  if (!o.cap) for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; const sp = cpart(new THREE.ConeGeometry(0.06, 0.16, 8), hair, H.head, 0.08, Math.sin(a) * 0.17, 0.12 + Math.cos(i * 2.1) * 0.02, Math.cos(a) * 0.15); sp.rotation.set(1.9, 0, -a * 0.8 + (i % 2 ? 0.3 : -0.3)); }
  if (o.long) { const lh = cpart(new THREE.CylinderGeometry(0.205, 0.24, 0.5, 16, 1, true, Math.PI * 0.42, Math.PI * 1.16), hair, H.head, 0.04, 0, -0.18, -0.02); lh.material.side = THREE.DoubleSide;
    for (const sx of [-1, 1]) cpart(new THREE.BoxGeometry(0.05, 0.4, 0.12), hair, H.head, 0.06, sx * 0.2, -0.14, -0.02); }
  H.pose = (p) => poseHuman(H, p);
  CH.push(H); return H;
}
// p: x, z, y, ry, run (0..1), phase, sit, lie (angle), armR/armL: 'up'|'wave'|'phone'|'thumb'|'out', look (head yaw), tilt, face {...}, shoes
function poseHuman(H, p) {
  const r = H.root; r.visible = true; r.position.set(p.x, p.y || 0, p.z); r.rotation.set(0, p.ry || 0, 0);
  const run = p.run || 0, ph = p.phase || 0;
  for (const L of H.leg) for (const k in L.shoe) L.shoe[k].visible = k === (p.shoes || H.o.shoes || 'white');
  H.spine.rotation.set(0.18 * run, 0, 0); H.hips.position.y = 0.92 + Math.abs(Math.sin(ph)) * 0.04 * run;
  H.leg.forEach((L, i) => { const s = Math.sin(ph + i * Math.PI); L.hip.rotation.set(-s * 0.75 * run, 0, 0); L.knee.rotation.set(Math.max(0, -Math.cos(ph + i * Math.PI)) * 1.3 * run + 0.15 * run, 0, 0); L.ank.rotation.set(0, 0, 0); });
  H.arm.forEach((A, i) => { const s = Math.sin(ph + i * Math.PI); A.sh.rotation.set(s * 0.8 * run, 0, (i ? -1 : 1) * 0.12); A.el.rotation.set(-1.1 * run - 0.15, 0, 0); });
  if (p.sit) { H.hips.position.y = 0.0; r.position.y = (p.seat ?? 0.6); H.leg.forEach(L => { L.hip.rotation.x = -1.5; L.knee.rotation.x = 1.5; }); H.arm.forEach((A, i) => { A.sh.rotation.set(-0.5, 0, (i ? -1 : 1) * 0.1); A.el.rotation.set(-0.6, 0, 0); }); }
  const arm = (i, kind) => { const A = H.arm[i], sx = i ? -1 : 1;
    if (kind === 'up') { A.sh.rotation.set(-2.9, 0, sx * 0.25); A.el.rotation.set(-0.2, 0, 0); }
    else if (kind === 'thumb') { A.sh.rotation.set(-1.4, 0, sx * 0.3); A.el.rotation.set(-1.4, 0, 0); }
    else if (kind === 'phone') { A.sh.rotation.set(-0.9, 0, sx * 0.15); A.el.rotation.set(-1.3, 0, 0); }
    else if (kind === 'out') { A.sh.rotation.set(-0.4, 0, sx * 1.1); A.el.rotation.set(-0.3, 0, 0); }
    else if (kind === 'cover') { A.sh.rotation.set(-2.2, 0, sx * -0.5); A.el.rotation.set(-1.9, 0, 0); } };
  if (p.armL) arm(0, p.armL); if (p.armR) arm(1, p.armR);
  H.phone.visible = !!p.phone;
  H.neck.rotation.set(p.nod || 0, p.look || 0, p.tilt || 0);
  if (p.lie) { r.rotation.set(p.lie, p.ry || 0, 0, 'YXZ'); r.position.y = 0.16; H.leg.forEach(L => { L.hip.rotation.x = 0; L.knee.rotation.x = 0.1; }); H.arm.forEach((A, i) => { A.sh.rotation.set(0, 0, (i ? -1 : 1) * 1.2); A.el.rotation.set(-0.2, 0, 0); }); }
  if (p.freeze) { /* frozen mid-stride: keep the running pose of that phase, no bob */ }
  drawFace(H.F, { iris: H.o.iris, girl: H.o.girl, browC: H.o.hair, ...(p.face || {}) });
}

// ---------- the cast ----------
const PED3 = makeHuman({ hood: '#f0ad22', hoodD: '#c88a14', pants: '#2f5a96', skin: '#d0946a', hair: '#2a1a12', shoes: 'fila' });
const GIRL3 = makeHuman({ hood: '#3f86d8', hoodD: '#2d66b0', pants: '#2d66b0', skin: '#ecbc96', hair: '#4a2414', long: true, girl: true, shoes: 'thin', iris: '#3a5a2a' });
const EX_LOOK = [['#e8b48e', '#5a3018', false], ['#8a5a3a', '#120c0a', true], ['#f2cbaa', '#c89a50', false], ['#b07850', '#1a1210', false], ['#d8a07a', '#3a2418', true], ['#f0d0b8', '#2a1a12', false], ['#9a6a44', '#2a1a12', false], ['#e2b896', '#7a4a20', true], ['#c48a60', '#140e0a', false]];
const EX3 = EX_LOOK.map(([skin, hair, long]) => makeHuman({ hood: '#3f86d8', hoodD: '#2d66b0', pants: '#2d66b0', skin, hair, long, girl: long, shoes: 'white', cap: !long && hair === '#120c0a' }));

// ---------- the giant doll (original design) ~2 m model, scaled up to 18 m ----------
const DOLL = { root: new THREE.Group() }; scene.add(DOLL.root);
{ const D = DOLL.root, SK = toon('#fff4ea', { emissive: '#3a2a22', emissiveIntensity: 0.6 }), HR = '#16121c', DR = '#24306e', COL = '#f7f5ef', BOW = '#d8262c';
  for (const sx of [-1, 1]) { cpart(new THREE.CylinderGeometry(0.075, 0.07, 0.4, 12), SK, D, 0.05, sx * 0.13, 0.48, 0); cpart(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 12), '#fbfbf6', D, 0.05, sx * 0.13, 0.17, 0);
    const sh = cpart(new THREE.SphereGeometry(0.1, 14, 10), '#121216', D, 0.06, sx * 0.13, 0.05, 0.04); sh.scale.set(0.9, 0.55, 1.4); }
  DOLL.dress = cpart(new THREE.CylinderGeometry(0.16, 0.46, 0.72, 24), DR, D, 0.025, 0, 0.98, 0);
  for (let i = 0; i < 3; i++) cpart(new THREE.SphereGeometry(0.025, 8, 6), COL, D, 0.1, 0, 1.2 - i * 0.12, 0.2 + i * 0.045);
  const col = cpart(new THREE.CylinderGeometry(0.27, 0.27, 0.04, 24), COL, D, 0.04, 0, 1.35, 0); col.scale.z = 0.9;
  DOLL.arms = [];
  for (const sx of [-1, 1]) { const j = joint(D, sx * 0.2, 1.3, 0); limb(j, 0.5, 0.06, DR, 0.06); const hd = cpart(new THREE.SphereGeometry(0.07, 12, 10), SK, j, 0.06, 0, -0.52, 0); j.rotation.z = sx * 0.25; DOLL.arms.push(j); }
  DOLL.head = joint(D, 0, 1.38, 0);
  cpart(new THREE.SphereGeometry(0.34, 28, 22), SK, DOLL.head, 0.025, 0, 0.32, 0);
  DOLL.F = faceCanvas();
  const fm = new THREE.Mesh(new THREE.SphereGeometry(0.343, 32, 24, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.25, Math.PI * 0.5), new THREE.MeshBasicMaterial({ map: DOLL.F.tx, transparent: true, depthWrite: false })); fm.position.y = 0.32; DOLL.head.add(fm);
  // black bob: cap over the back + sides down to the jaw, straight bangs in front
  const bob = cpart(new THREE.SphereGeometry(0.37, 28, 18, Math.PI * 0.93, Math.PI * 1.14, 0, Math.PI * 0.78), HR, DOLL.head, 0.03, 0, 0.33, 0); bob.material.side = THREE.DoubleSide;
  const top = cpart(new THREE.SphereGeometry(0.365, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.3), HR, DOLL.head, 0.03, 0, 0.33, 0);
  const bang = cpart(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 24, 1, true, -Math.PI * 0.42, Math.PI * 0.84), HR, DOLL.head, 0.0, 0, 0.5, 0); bang.material.side = THREE.DoubleSide;
  for (const sx of [-1, 1]) { const side = cpart(new THREE.CylinderGeometry(0.375, 0.39, 0.46, 16, 1, true, sx > 0 ? Math.PI * 0.3 : Math.PI * 1.45, Math.PI * 0.25), HR, DOLL.head, 0.0, 0, 0.32, 0); side.material.side = THREE.DoubleSide; }
  DOLL.bow = new THREE.Group(); DOLL.bow.position.set(0, 0.72, -0.02); DOLL.head.add(DOLL.bow);
  for (const sx of [-1, 1]) { const w = cpart(new THREE.ConeGeometry(0.13, 0.28, 12), BOW, DOLL.bow, 0.05, sx * 0.14, 0, 0); w.rotation.z = sx * Math.PI / 2; w.scale.z = 0.5; }
  cpart(new THREE.SphereGeometry(0.06, 10, 8), '#b01e24', DOLL.bow, 0.06);
  D.scale.setScalar(9); D.position.set(0, 0, DOLLZ);
}
function drawDollFace(eyes) {
  const c = DOLL.F.cv.getContext('2d'); c.clearRect(0, 0, 512, 512);
  const eyeC = eyes === 'red' ? '#ff2a2a' : eyes === 'scan' ? '#ff5a3a' : null;
  for (const sx of [-1, 1]) { const ex = 256 + sx * 74, ey = 250;
    c.fillStyle = '#0c0a12'; c.beginPath(); c.ellipse(ex, ey, 50, 60, 0, 0, 7); c.fill();
    c.fillStyle = eyeC || '#ffffff'; c.beginPath(); c.ellipse(ex + 14, ey - 18, 15, 18, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(ex - 16, ey + 18, 6, 0, 7); c.fill();
    if (eyeC) { const gr = c.createRadialGradient(ex, ey, 10, ex, ey, 110); gr.addColorStop(0, 'rgba(255,90,60,0.7)'); gr.addColorStop(1, 'rgba(255,90,60,0)'); c.fillStyle = gr; c.fillRect(ex - 110, ey - 110, 220, 220); }
    c.strokeStyle = '#0c0a12'; c.lineWidth = 6; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(ex + (k - 1) * 26, ey - 56); c.lineTo(ex + (k - 1) * 34, ey - 76); c.stroke(); } }
  c.fillStyle = 'rgba(240,110,120,0.45)'; for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(256 + sx * 128, 340, 40, 22, 0, 0, 7); c.fill(); }
  c.fillStyle = '#c41e3a'; c.beginPath(); c.moveTo(234, 372); c.quadraticCurveTo(256, 360, 278, 372); c.quadraticCurveTo(256, 396, 234, 372); c.fill();
  DOLL.F.tx.needsUpdate = true;
}
function poseDoll(turn, eyes, sway = 0) { DOLL.root.visible = true; DOLL.root.rotation.y = Math.PI * (1 - turn); DOLL.head.rotation.z = sway; drawDollFace(turn > 0.6 ? eyes : null); }
function hideAll() { for (const H of CH) H.root.visible = false; }
