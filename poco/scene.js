// EP12 animation: 3D bedroom (room3d.js) + 2D characters (human.js) on top. window.renderFrame(t) draws the frame at time t.
const TL = await (await fetch('timeline.json')).json();
const WORDS = await (await fetch('audio/words.json')).json();
const SEG = n => TL.segs.find(s => s.scene === n);
const T0 = n => SEG(n).start, TE = n => SEG(n).start + SEG(n).dur;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const W0 = (pre, seg) => { const w = WORDS.find(w => w.seg === seg && w.text.toLowerCase().startsWith(pre)); if (!w) console.log('palavra não achada', pre, seg); return w ? w.t0 : 0; };
const SCR = { x: SW / 2, y: SH / 2, z: 1 };
const GL = document.getElementById('gl');
function textOut(str, x, y, size, fill, opt = {}) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); if (opt.rot) main.rotate(opt.rot); if (opt.s) main.scale(opt.s, opt.s); main.globalAlpha = opt.a ?? 1; main.textAlign = opt.align || 'center'; main.textBaseline = 'middle'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(str, 0, 0); main.fillStyle = fill; main.fillText(str, 0, 0); main.restore(); }
const popS = (k, d = 0.25) => { const x = clamp(k / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; };
function fade(a, col = '0,0,0') { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(${col},${a})`; main.fillRect(0, 0, SW, SH); main.restore(); }
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

// ---------- 3D helpers ----------
function setCam(pos, look, fov = 42) { cam3.fov = fov; cam3.updateProjectionMatrix(); cam3.position.set(...pos); cam3.lookAt(...look); cam3.updateMatrixWorld(); }
function fill(pos, I) { FILL.position.set(...pos); FILL.intensity = I; }
function draw3D() { renderer.render(scene, cam3); main.setTransform(1, 0, 0, 1, 0, 0); main.clearRect(0, 0, SW, SH); }
function flat3D() { draw3D(); main.drawImage(GL, 0, 0); }   // the 3D picture copied onto the 2D layer (so 3D can be drawn again on top later)
function beanOver() {   // re-draw the beanbag over the 2D layer (back shots: he sinks into it)
  const bg = scene.background; scene.background = null; renderer.setClearColor(0x000000, 0); cam3.layers.set(1); renderer.render(scene, cam3); cam3.layers.set(0); scene.background = bg;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(GL, 0, 0); main.restore();
}
const PZ = 0.15;   // Pedrinho's spot on the beanbag
const rimC = (a = 0.95) => `rgba(200,220,255,${a})`;
function ped(x, z, o = {}, rim = rimC()) { const [px, py, d] = proj(x, 0, z); characters(SCR, () => pedro(px, py, { s: 1.7 * ppm(d) / 900, ...o }), rim, 0.25); }
function pedB(x, z, o = {}) { const [px, py, d] = proj(x, 0, z); characters(SCR, () => pedroBack(px, py, { s: 1.7 * ppm(d) / 900, ...o }), rimC(0.8), 0.3); }
function girl(x, y, z, o = {}, clip = null) {
  const [px, py, d] = proj(x, y, z);
  characters(SCR, () => { if (clip) { g.save(); g.beginPath(); g.rect(...clip); g.clip(); } wellGirl(px, py, { s: 1.4 * ppm(d) / 890, ...o }); if (clip) g.restore(); }, 'rgba(190,255,230,0.55)', 0.35);
}
function screenRect() { const a = proj(SCR3.x - SCR3.w / 2, SCR3.y + SCR3.h / 2, SCR3.z), b = proj(SCR3.x + SCR3.w / 2, SCR3.y - SCR3.h / 2, SCR3.z); return [a[0], a[1], b[0] - a[0], b[1] - a[1]]; }

// ---------- the TV screen (a live canvas texture) ----------
const TVC = SCREEN_CV.getContext('2d'), TW = 512, TH = 400;
const NOISES = [0, 1, 2, 3].map(() => { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 100; const c = cv.getContext('2d'), im = c.createImageData(128, 100); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); return cv; });
function snow(c, t, a = 1) { c.save(); c.globalAlpha = a; c.imageSmoothingEnabled = false; c.drawImage(NOISES[Math.floor(t * 30) % 4], 0, 0, TW, TH); c.restore(); }
function wellPic(c, t, o = {}) {   // the cursed video: grey sky, dark trees, a clearing with a stone well
  const sk = c.createLinearGradient(0, 0, 0, TH); sk.addColorStop(0, '#8a9090'); sk.addColorStop(0.55, '#5a6262'); sk.addColorStop(1, '#2a3030'); c.fillStyle = sk; c.fillRect(0, 0, TW, TH);
  c.fillStyle = '#1c2222'; c.beginPath(); c.moveTo(0, 210); for (let i = 0; i <= 16; i++) c.lineTo(i * 32, 170 + Math.sin(i * 2.3) * 22 + (i % 2) * 18); c.lineTo(TW, 230); c.lineTo(0, 230); c.fill();
  c.fillStyle = '#3c4440'; c.fillRect(0, 225, TW, TH);
  const wx = 256 + (o.wx || 0), wy = 290, ws = o.ws || 1;
  c.save(); c.translate(wx, wy); c.scale(ws, ws);
  c.fillStyle = '#6a6e6a'; c.strokeStyle = '#101414'; c.lineWidth = 4; c.beginPath(); c.moveTo(-90, -30); c.lineTo(-90, 50); c.ellipse(0, 50, 90, 22, 0, Math.PI, 0, true); c.lineTo(90, -30); c.fill(); c.stroke();
  c.strokeStyle = '#3a3e3a'; c.lineWidth = 3; for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) { c.strokeRect(-88 + q * 36 + (r % 2) * 18, -24 + r * 24, 34, 22); }
  c.fillStyle = '#8a8e88'; c.strokeStyle = '#101414'; c.lineWidth = 4; c.beginPath(); c.ellipse(0, -30, 92, 24, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#050606'; c.beginPath(); c.ellipse(0, -30, 70, 15, 0, 0, 7); c.fill();
  c.restore();
  if (o.girl != null) {   // the girl rising out of the well (o.girl 0..1), clipped by the well rim, then walking toward the camera (o.walk)
    const pg = g; g = c; const wk = o.walk || 0;
    c.save(); if (wk <= 0) { c.beginPath(); c.rect(0, 0, TW, wy - 30 * ws); c.ellipse(wx, wy - 30 * ws, 70 * ws, 15 * ws, 0, 0, Math.PI); c.clip(); }
    const gy = wk > 0 ? lerp(wy - 10, TH + 260, ease(wk)) : wy - 30 + lerp(200, 0, ease(o.girl)), gs = 0.17 * lerp(1, 2.8, ease(wk));
    wellGirl(wx, gy, { s: gs }); c.restore(); g = pg;
  }
}
function tvDraw(mode, t, o = {}) {
  const c = TVC; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none';
  let col = '#c8dcff', I = 6 * (0.85 + 0.15 * Math.sin(t * 37) * Math.sin(t * 13));
  if (mode === 'off') { const gr = c.createRadialGradient(200, 140, 10, 256, 200, 320); gr.addColorStop(0, '#2a3230'); gr.addColorStop(1, '#0a0e0e'); c.fillStyle = gr; c.fillRect(0, 0, TW, TH); c.fillStyle = 'rgba(255,255,255,0.06)'; c.beginPath(); c.ellipse(150, 110, 120, 50, -0.4, 0, 7); c.fill(); I = 0; }
  else if (mode === 'game') {   // a bright little platformer
    const sk = c.createLinearGradient(0, 0, 0, TH); sk.addColorStop(0, '#46a8ff'); sk.addColorStop(1, '#a8e0ff'); c.fillStyle = sk; c.fillRect(0, 0, TW, TH);
    const sc = (t * 90) % 128; c.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(i * 160 - sc + 60, 70 + (i % 2) * 30, 50, 18, 0, 0, 7); c.fill(); }
    c.fillStyle = '#3ac060'; c.fillRect(0, 320, TW, 80); c.fillStyle = '#8a5a2a'; c.fillRect(0, 345, TW, 55);
    for (let i = 0; i < 6; i++) { const x = i * 128 - sc; c.fillStyle = '#e8a030'; c.fillRect(x + 40, 210, 40, 40); c.strokeStyle = '#6a3a10'; c.lineWidth = 4; c.strokeRect(x + 40, 210, 40, 40); c.fillStyle = '#ffe14a'; c.beginPath(); c.arc(x + 100, 170 + Math.sin(t * 6 + i) * 6, 12, 0, 7); c.fill(); }
    const jy = 320 - Math.abs(Math.sin(t * 4)) * 90; c.fillStyle = '#e8463a'; c.fillRect(150, jy - 50, 34, 50); c.fillStyle = '#ffd0a0'; c.fillRect(154, jy - 74, 26, 24);
    col = '#6ad0ff'; I = 6;
  }
  else if (mode === 'snow') { snow(c, t); I = 7 * (0.8 + 0.2 * Math.random()); col = '#d8e0ff'; }
  else if (mode === 'blue') { c.fillStyle = '#1830c8'; c.fillRect(0, 0, TW, TH); c.fillStyle = '#fff'; c.font = 'bold 44px monospace'; c.fillText('PLAY ▶', 40, 70); col = '#4060ff'; }
  else if (mode === 'tape') {   // fast black-and-white montage
    const k = Math.floor(t * 2.6) % 4; c.filter = 'grayscale(1) contrast(1.3)';
    if (k === 0) wellPic(c, t); else if (k === 1) { c.fillStyle = '#000'; c.fillRect(0, 0, TW, TH); c.strokeStyle = '#fff'; c.lineWidth = 26; c.beginPath(); c.arc(256, 200, 120, 0, 7); c.stroke(); c.lineWidth = 6; c.beginPath(); c.arc(256, 200, 150, 0, 7); c.stroke(); }
    else if (k === 2) { c.fillStyle = '#c8c8c0'; c.fillRect(0, 0, TW, TH); c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = 8; c.beginPath(); c.ellipse(256, 200, 200, 90, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#111'; c.beginPath(); c.arc(256 + Math.sin(t * 9) * 40, 200, 60, 0, 7); c.fill(); }
    else { c.fillStyle = '#202020'; c.fillRect(0, 0, TW, TH); c.fillStyle = '#d0d0c8'; c.beginPath(); c.ellipse(256, 230, 50, 60, 0, 0, 7); c.fill(); for (let i = 0; i < 4; i++) { c.fillRect(220 + i * 22, 120 - (i % 2) * 20, 14, 100); } }
    c.filter = 'none'; snow(c, t, 0.25); col = '#e0e0e0';
  }
  else if (mode === 'well') { wellPic(c, t, o); snow(c, t, 0.22); col = '#c8d8d8'; }
  else if (mode === 'ped') {   // the end: Pedrinho trapped inside the tape, hands on the glass
    c.filter = 'grayscale(1) contrast(1.2)'; wellPic(c, t, { wx: 150, ws: 0.6 }); const pg = g; g = c;
    pedro(300, 470, { s: 0.48, mouth: 'scream', brows: -1, sweat: true, look: [0, 0], armL: [-190, -620, -150, -800], armR: [190, -620, 150, -800] }); g = pg; c.filter = 'none';
    snow(c, t, 0.2); col = '#c8d8d8';
  }
  for (let y = 0; y < TH; y += 4) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, y, TW, 2); }   // scanlines
  if (mode !== 'off') { const rl = (t * 120) % (TH + 80) - 40; c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(0, rl, TW, 30); }   // a rolling bar
  const v = c.createRadialGradient(256, 200, 150, 256, 200, 340); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); c.fillStyle = v; c.fillRect(0, 0, TW, TH);
  SCREEN_TX.needsUpdate = true; TVL.color.set(col); TVL.intensity = I * (o.light ?? 1);
}

// ---------- 2D props + inserts ----------
function vhs(x, y, s = 1, rot = 0, label = true) {   // a black VHS tape (seen from the front, label up)
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  rect(-190, -105, 380, 210, '#18181c', 14, 7); rect(-120, -30, 240, 80, '#0a0a0c', 10, 5);
  for (const sx of [-1, 1]) { ell(sx * 70, 10, 28, 28, '#2a2a30', 0, 4); ell(sx * 70, 10, 10, 10, '#d8d8d8', 0, 3); }
  if (label) { rect(-150, -92, 300, 52, '#f2ecd8', 4, 4); g.save(); g.font = 'italic 900 34px "Inter Display", Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#b01818'; g.fillText('NÃO ASSISTA', 0, -65); g.restore(); }
  g.restore();
}
function tapeInsert(a, t, y0 = 820) {   // close-up of the tape label with the thrift-store price sticker
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; const pg = g; g = main;
  main.translate(540, y0); main.rotate(-0.06 + Math.sin(t * 2) * 0.01); main.scale(popS(a, 1) * 1.9, popS(a, 1) * 1.9); vhs(0, 0, 1, 0, true);
  ell(140, 80, 46, 46, '#ff8a2a', 0, 5); main.fillStyle = '#1a1010'; main.font = '900 26px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('R$ 2', 140, 82);
  g = pg; main.restore();
}
function ledClock(a, t) { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 330); const s = popS(a, 1); main.scale(s, s);
  main.fillStyle = '#0a0606'; main.strokeStyle = '#ff3a2a'; main.lineWidth = 5; main.beginPath(); main.roundRect(-170, -62, 340, 124, 22); main.fill(); main.stroke();
  main.shadowColor = '#ff2a1a'; main.shadowBlur = 24; main.fillStyle = '#ff3a2a'; main.font = 'bold 96px monospace'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(Math.floor(t * 1.2) % 2 ? '03:00' : '03 00', 0, 6); main.restore(); }
function phone2D(x, y, s, rot, screen, ringing, t) {   // big phone insert; screen: 'call' | 'upload' (k) | 'posted'
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x + (ringing ? Math.sin(t * 70) * 6 : 0), y); main.rotate(rot + (ringing ? Math.sin(t * 50) * 0.04 : 0)); main.scale(s, s);
  if (ringing) { main.strokeStyle = 'rgba(255,255,255,0.85)'; main.lineWidth = 10; main.lineCap = 'round'; for (let i = 0; i < 3; i++) { const r = 290 + i * 50 + ((t * 120) % 50); for (const sx of [-1, 1]) { main.beginPath(); main.arc(0, 0, r, sx > 0 ? -0.4 : Math.PI - 0.4, sx > 0 ? 0.4 : Math.PI + 0.4); main.stroke(); } } }
  main.fillStyle = '#111216'; main.strokeStyle = '#08061a'; main.lineWidth = 10; main.beginPath(); main.roundRect(-140, -270, 280, 540, 42); main.fill(); main.stroke();
  main.fillStyle = '#0b1030'; main.beginPath(); main.roundRect(-122, -248, 244, 496, 28); main.fill();
  main.textAlign = 'center'; main.textBaseline = 'middle';
  if (screen.mode === 'call') {
    main.fillStyle = '#e8e8f0'; main.font = '700 30px "Inter Display", Inter'; main.fillText('NÚMERO', 0, -170); main.fillText('DESCONHECIDO', 0, -132);
    main.fillStyle = '#2a2a3a'; main.beginPath(); main.arc(0, -40, 60, 0, 7); main.fill(); main.fillStyle = '#9090a8'; main.font = '900 70px "Inter Display", Inter'; main.fillText('?', 0, -36);
    for (const [cx, cl] of [[-60, '#ff3b30'], [60, '#2ee87a']]) { main.fillStyle = cl; main.beginPath(); main.arc(cx, 160, 38, 0, 7); main.fill(); }
  } else {
    main.save(); main.beginPath(); main.roundRect(-110, -200, 220, 170, 12); main.clip(); main.drawImage(SCREEN_CV, -110, -200, 220, 170); main.restore();
    if (screen.mode === 'upload') { main.fillStyle = '#e8e8f0'; main.font = '700 30px "Inter Display", Inter'; main.fillText('POSTANDO…', 0, 20); main.fillStyle = '#2a2a3a'; main.fillRect(-100, 60, 200, 22); main.fillStyle = '#ff2a6a'; main.fillRect(-100, 60, 200 * clamp(screen.k), 22); }
    else { main.fillStyle = '#2ee87a'; main.font = '900 40px "Inter Display", Inter'; main.fillText('POSTADO ✓', 0, 20); main.fillStyle = '#ffffff'; main.font = '900 34px "Inter Display", Inter'; main.fillText('♥ ' + screen.likes, 0, 90); main.fillText('💬 ' + Math.floor(screen.likes / 7), 0, 150); }
  }
  main.restore();
}
function schoolPanel(a, t, k0) {   // "the whole school": a grid of classmates, each one gets a red 7
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 900); const s = popS(a, 1); main.scale(s, s);
  main.fillStyle = 'rgba(10,8,24,0.85)'; main.strokeStyle = '#ffffff'; main.lineWidth = 6; main.beginPath(); main.roundRect(-420, -300, 840, 600, 40); main.fill(); main.stroke();
  main.fillStyle = '#ffffff'; main.font = '900 52px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('A ESCOLA INTEIRA', 0, -230);
  const skins = ['#c98a5e', '#e0b48a', '#8a5a3a', '#f0c8a0', '#6a4028'], hairs = ['#2a1a12', '#c89040', '#101010', '#7a3a1a'];
  for (let i = 0; i < 15; i++) { const cx = -320 + (i % 5) * 160, cy = -110 + Math.floor(i / 5) * 140;
    main.fillStyle = skins[i % 5]; main.strokeStyle = '#08061a'; main.lineWidth = 5; main.beginPath(); main.arc(cx, cy, 46, 0, 7); main.fill(); main.stroke();
    main.fillStyle = hairs[i % 4]; main.beginPath(); main.arc(cx, cy - 12, 46, Math.PI * 1.05, Math.PI * 1.95); main.fill();
    main.fillStyle = '#fff'; main.beginPath(); main.arc(cx - 14, cy + 2, 8, 0, 7); main.arc(cx + 14, cy + 2, 8, 0, 7); main.fill(); main.fillStyle = '#111'; main.beginPath(); main.arc(cx - 14, cy + 3, 4, 0, 7); main.arc(cx + 14, cy + 3, 4, 0, 7); main.fill();
    const kk = clamp((t - k0 - i * 0.05) / 0.2); if (kk > 0) { main.save(); main.translate(cx + 34, cy - 34); main.scale(popS(kk, 1), popS(kk, 1)); main.fillStyle = '#d8261c'; main.beginPath(); main.arc(0, 0, 24, 0, 7); main.fill(); main.fillStyle = '#fff'; main.font = '900 30px "Inter Display", Inter'; main.fillText('7', 0, 2); main.restore(); } }
  main.restore();
}
function laterCard(txt, a) { if (a <= 0) return; fade(a * 0.85, '4,4,12'); textOut(txt, 540, 900, 96, '#ffffff', { a, s: 0.9 + 0.1 * a }); }

// ---------- counters ----------
function counters(t) {   // ACERTOS x/3 (top right), green
  if (t < T0('tape')) return;
  const n = TL.ok.filter(e => t >= e).length, last = TL.ok.filter(e => t >= e).pop();
  const bump = last !== undefined ? popS(t - last, 0.25) : 1;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  main.translate(SW - 210, 130); main.scale(bump, bump); main.fillStyle = 'rgba(10,8,20,0.75)'; main.strokeStyle = n ? '#2ec85a' : '#ffffff'; main.lineWidth = 5; main.beginPath(); main.roundRect(-170, -42, 340, 84, 42); main.fill(); main.stroke();
  main.fillStyle = n ? '#5cff8a' : '#ffffff'; main.font = '900 44px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(`ACERTOS ${n}/3`, 0, 2); main.restore();
}
function cardBox(x, y, s) {   // an open cardboard box (front part only, so things can drop in behind it)
  g.save(); g.translate(x, y); g.scale(s, s);
  shape('#a8743e', () => { g.moveTo(-130, -170); g.lineTo(-200, -230); g.lineTo(-120, -240); g.lineTo(-70, -175); g.closePath(); }, 6);
  shape('#a8743e', () => { g.moveTo(130, -170); g.lineTo(200, -230); g.lineTo(120, -240); g.lineTo(70, -175); g.closePath(); }, 6);
  rect(-130, -175, 260, 175, '#c8945a', 6, 7); line([-130, -120, 130, -120], 4, '#a8743e'); rect(-30, -175, 60, 60, '#e8d8a8', 0, 0);
  g.restore();
}
function pad(x, y, s) {   // game controller in his hands
  g.save(); g.translate(x, y); g.scale(s, s);
  shape('#26262e', () => { g.moveTo(-110, -30); g.quadraticCurveTo(-120, 60, -80, 70); g.quadraticCurveTo(-50, 70, -40, 30); g.lineTo(40, 30); g.quadraticCurveTo(50, 70, 80, 70); g.quadraticCurveTo(120, 60, 110, -30); g.quadraticCurveTo(0, -60, -110, -30); g.closePath(); }, 6);
  ell(-55, -10, 16, 16, '#3a3a44', 0, 3); for (const [dx, dy, c] of [[50, -22, '#46e05a'], [72, -4, '#e04646'], [50, 12, '#4a8aff'], [28, -4, '#f2c53d']]) ell(dx, dy, 9, 9, c, 0, 3);
  g.restore();
}
function plug2D(x, y, s, hand) {   // the TV plug, and his hand pulling it
  g.save(); g.translate(x, y); g.scale(s, s);
  line([0, 30, 40, 200, 220, 320], 14, '#101014');
  rect(-40, -40, 80, 80, '#2a2a30', 12, 6); line([-14, -40, -14, -64], 8, '#c8c8c8'); line([14, -40, 14, -64], 8, '#c8c8c8');
  if (hand) { g.beginPath(); g.moveTo(30, 0); g.lineTo(420, 60); g.lineWidth = 110; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke(); g.lineWidth = 92; g.strokeStyle = HOOD; g.stroke(); ell(20, 0, 70, 62, SKIN, 0, 7); for (let i = 0; i < 3; i++) line([-20 + i * 22, -50, -26 + i * 24, 40], 6, SKIN_D); }
  g.restore();
}
function survived(a, t) { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 560); const s = popS(a, 1); main.scale(s, s);
  main.fillStyle = '#1fa84a'; main.strokeStyle = '#08061a'; main.lineWidth = 10; main.beginPath(); main.roundRect(-380, -90, 760, 180, 40); main.fill(); main.stroke();
  main.fillStyle = '#ffffff'; main.font = '900 96px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('SOBREVIVEU ✓', 0, 6); main.restore(); }

// ---------- scenes ----------
const BACKCAM = [[0.42, 1.5, 2.5], [-0.06, 1.0, -3.1]];   // over Pedrinho's shoulder, the TV ahead
function sTitle(t) {   // he stares at the TV from the beanbag; the well on the screen, the girl standing at it
  tvDraw('well', t, { girl: 1 }); setCam(...BACKCAM); flat3D();
  pedB(0.05, PZ, { sit: true, armL: [-150, -440, -120, -330], armR: [150, -440, 120, -330] }); beanOver();
  vignette(main, 0.6);
}
function titleZoom(t) {   // one slow zoom on the whole picture (1.00 → 1.12 over ~2.4 s), toward the TV
  const k = ease(clamp((t - T0('title')) / 2.4)), s = 1 + 0.12 * k, cx = 520, cy = 820;
  const cc = SHK.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, SW, SH); cc.drawImage(GL, 0, 0); cc.drawImage(main.canvas, 0, 0);
  main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.translate(cx, cy); main.scale(s, s); main.translate(-cx, -cy); main.drawImage(SHK, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0);
}
function sTape(t) {   // standing in his room, showing the tape he bought; then a close-up of the label
  const t0 = T0('tape'), E = W0('etiqueta', 'tape'), ins = ss(E - 0.25, E + 0.05, t) * (1 - ss(TE('tape') - 0.35, TE('tape') - 0.05, t));
  tvDraw('off', t); const k = clamp((t - t0) / (TE('tape') - t0));
  setCam([0.35, 1.45, lerp(1.9, 1.6, k)], [0, 1.25, -2]); draw3D();
  const [hx, hy, hd] = proj(0.33, 1.32, -0.7), hs = 0.2 * ppm(hd) / 380;
  ped(0, -0.7, { look: [0.5, -0.3], armR: [190, -560, 175, -700], mouth: 'smile', brows: 0.3 });
  characters(SCR, () => vhs(hx, hy - 70 * hs, hs, -0.15, true), 'rgba(200,220,255,0.9)', 0.25);
  tapeInsert(ins, t); vignette(main, 0.6);
}
function sSkip(t) {   // he does NOT watch it: the tape goes into a box; then he plays video games
  const OK0 = TL.ok[0], BX = TL.box, GA = W0('jogar', 'skip');
  if (t < GA - 0.1) {
    tvDraw('off', t); setCam([0.35, 1.25, 2.3], [0.15, 0.8, -2]); draw3D();
    const fall = clamp((t - BX - 0.4) / 0.35), [bx, by, bd] = proj(0.62, 0, -0.35), bs = 0.45 * ppm(bd) / 260;
    if (fall > 0 && fall < 1) { const [hx, hy, hd] = proj(0.33, 1.32, -0.7); const hs = 0.2 * ppm(hd) / 380; characters(SCR, () => vhs(lerp(hx, bx, ease(fall)), lerp(hy - 70 * hs, by - 150 * bs, fall * fall), hs, -0.15 + fall * 1.2, true), 'rgba(200,220,255,0.9)', 0.25); }
    characters(SCR, () => cardBox(bx, by, bs), 'rgba(200,220,255,0.7)', 0.25);
    const hold = t < BX + 0.4, no = t > OK0 - 0.3 && t < OK0 + 0.5;
    ped(0, -0.7, { look: no ? [Math.sin(t * 18), 0] : hold ? [0.5, -0.3] : [0.8, 0.6], armR: hold ? [190, -560, 175, -700] : [200, -470, 260, -420], mouth: no ? 'flat' : 'smile', brows: no ? 0.6 : 0.2 });
    if (hold) { const [hx, hy, hd] = proj(0.33, 1.32, -0.7); const hs = 0.2 * ppm(hd) / 380; characters(SCR, () => vhs(hx, hy - 70 * hs, hs, -0.15, true), 'rgba(200,220,255,0.9)', 0.25); }
    vignette(main, 0.55); return;
  }
  tvDraw('game', t); setCam([0.02, 1.05, -2.6], [0, 0.72, 0.3]); draw3D();
  const [px, py, pd] = proj(0, 0, PZ), ps = 1.7 * ppm(pd) / 900;
  ped(0, PZ, { sit: true, look: [0, -0.2], mouth: 'smile', brows: 0.3, armL: [-170, -420, -50, -380], armR: [170, -420, 50, -380] }, 'rgba(170,220,255,0.95)');
  characters(SCR, () => pad(px, py - (380 - 90) * ps, ps * 0.9), 'rgba(170,220,255,0.6)', 0.2);
  vignette(main, 0.55);
}
function sTvon(t) {   // 3 a.m.: he dozed off on the beanbag; the TV turns on by itself and shows the well
  const ON = TL.tvon, PO = W0('poço', 'tvon'), T3 = W0('três', 'tvon');
  tvDraw(t < ON ? 'off' : t < PO - 0.1 ? 'snow' : 'well', t, { girl: 0 }); setCam(...BACKCAM); flat3D();
  pedB(0.05, PZ, { sit: true, tilt: t > ON + 0.5 ? 0 : 0.22, armL: [-150, -440, -120, -330], armR: [150, -440, 120, -330] }); beanOver();
  if (t > ON && t < ON + 0.15) fade(0.6 * (1 - (t - ON) / 0.15), '230,240,255');
  fade(t < ON ? 0.35 : 0, '0,0,8');
  ledClock(ss(T3 - 0.15, T3 + 0.1, t) * (1 - ss(ON - 0.2, ON + 0.1, t)), t);
  vignette(main, 0.65);
}
function sPlug(t) {   // he doesn't stare: he gets up and pulls the plug right away
  const TI = W0('tirou', 'plug'), P = TL.plug;
  if (t < TI - 0.1) {   // looks away from the screen and gets up
    tvDraw('well', t, { girl: 0.2 }); setCam([0.02, 1.05, -2.6], [0, 0.72, 0.3]); draw3D();
    ped(0, PZ, { sit: true, look: [1, 0.3], mouth: 'flat', brows: 0.6, armL: [-170, -420, -110, -300], armR: [170, -420, 110, -300] });
    vignette(main, 0.6); return;
  }
  tvDraw(t < P ? 'well' : 'off', t, { girl: 0.2 }); fill([1.4, 1.0, -3.3], 5); setCam([1.5, 0.8, -2.85], [1.3, 0.45, -3.98]); draw3D();
  const [sx, sy, sd] = proj(1.3, 0.45, -3.93), s = 0.07 * ppm(sd) / 80;
  const reach = ease(clamp((t - TI) / Math.max(0.2, P - TI))), pull = ease(clamp((t - P) / 0.35));
  const hx = lerp(SW + 300, sx, reach) + pull * 260, hy = sy + pull * 80;
  characters(SCR, () => { plug2D(t < P ? sx : hx, t < P ? sy : hy, s, false); if (reach > 0) { g.save(); g.translate(hx, hy); g.scale(s, s); g.beginPath(); g.moveTo(30, 0); g.lineTo(600, 90); g.lineWidth = 110; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke(); g.lineWidth = 92; g.strokeStyle = HOOD; g.stroke(); ell(20, 0, 70, 62, SKIN, 0, 7); for (let i = 0; i < 3; i++) line([-20 + i * 22, -50, -26 + i * 24, 40], 6, SKIN_D); g.restore(); } }, 'rgba(200,220,255,0.8)', 0.25);
  if (t > P && t < P + 0.12) fade(0.5 * (1 - (t - P) / 0.12), '255,255,255');
  vignette(main, 0.6);
}
const PSTAND = [0.95, -2.35];   // where he stands after pulling the plug
function sCrawl(t) {   // even unplugged, the TV comes back on... and she crawls out of the screen
  const DES = W0('desligada', 'crawl') + 0.2, ME = W0('menina', 'crawl'), SA = W0('sair', 'crawl');
  const rise = clamp((t - DES - 0.3) / Math.max(0.3, ME + 0.3 - DES - 0.3)), walk = clamp((t - ME - 0.3) / Math.max(0.3, SA - ME - 0.3));
  tvDraw(t < DES ? 'off' : t < DES + 0.3 ? 'snow' : 'well', t, t < SA ? { girl: rise, walk } : { girl: null });
  setCam([0.7, 1.0, 1.0], [0.3, 0.8, -3.0]); flat3D();
  if (t >= SA) crawlOut(t, SA);
  ped(...PSTAND, { look: [-1, 0], mouth: t > ME ? 'o' : 'flat', sweat: t > ME, brows: -1 });
  vignette(main, 0.68);
}
function crawlOut(t, SA) { const k = clamp((t - SA) / 3.2), out = clamp(k / 0.3), drop = clamp((k - 0.3) / 0.15), fw = clamp((k - 0.45) / 0.55);
  const z = k < 0.3 ? lerp(-3.2, -2.9, ease(out)) : lerp(-2.9, -1.6, ease(fw)), y = k < 0.3 ? 0.82 : lerp(0.82, 0, ease(drop));
  girl(-0.08, y, z, { crawl: 1, ph: t * 6 }, k < 0.15 ? screenRect() : null); return z; }
function sRun(t) {   // he doesn't help her: he runs out of the room and locks the door
  const SA = W0('sair', 'crawl'), C = TL.ok[1 + 1], LK = TL.lock;
  tvDraw('well', t, { girl: null }); setCam([1.3, 1.55, 3.6], [0.2, 0.75, -2]); flat3D();
  crawlOut(t, SA);
  const k = ease(clamp((t - C + 0.1) / Math.max(0.4, LK - 0.3 - C + 0.1))), x = lerp(PSTAND[0], 1.5, k), z = lerp(PSTAND[1], 2.0, k);
  const running = k > 0 && k < 1;
  ped(x, z, { look: running ? [0, 0] : [-1, 0], mouth: running ? 'scream' : 'flat', brows: running ? -1 : 0.7, sweat: true, walk: running ? 1 : 0, phase: t * 14,
    armR: running ? [160, -470, 150 + Math.sin(t * 14) * 30, -540] : undefined, armL: running ? [-150, -440, -170 - Math.sin(t * 14) * 40, -360] : undefined });
  const dk = ss(LK - 0.3, LK - 0.1, t); if (dk > 0) { fade(dk, '4,4,10'); padlock(clamp((t - LK) / 0.3), dk); }
  vignette(main, 0.65);
}
function padlock(k, a) {   // the door gets locked: a padlock shackle snapping shut (visual, no text)
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 860); main.scale(1.4, 1.4);
  main.strokeStyle = '#c8c8d0'; main.lineWidth = 30; main.lineCap = 'round'; main.beginPath(); main.arc(0, -60 + (1 - ease(k)) * -60, 70, Math.PI, 0); main.lineTo(70, -60 + (1 - ease(k)) * -60 + 40 * (1 - ease(k))); main.stroke();
  main.fillStyle = '#ffd23f'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath(); main.roundRect(-110, -60, 220, 170, 26); main.fill(); main.stroke();
  main.fillStyle = '#08061a'; main.beginPath(); main.arc(0, 10, 18, 0, 7); main.fill(); main.fillRect(-7, 10, 14, 50); main.restore(); }
function sEnd(t) {   // survived: she gives up at the locked door. Next day: the tape goes back to the thrift store, R$ 2 back.
  const SV = W0('sobreviveu', 'end'), NX = W0('no', 'end'), RE = W0('reais', 'end');
  if (t < NX - 0.1) {
    tvDraw('snow', t, { light: 0.6 }); setCam([0.3, 1.4, -2.4], [1.5, 0.6, 3.5]); draw3D();
    girl(1.55, 0, 3.2, { crawl: 1, ph: 1.2 + Math.sin(t * 1.5) * 0.3 }, null);
    survived(ss(SV - 0.15, SV + 0.1, t), t); vignette(main, 0.6); return;
  }
  main.setTransform(1, 0, 0, 1, 0, 0); const bg = main.createLinearGradient(0, 0, 0, SH); bg.addColorStop(0, '#ffcf6a'); bg.addColorStop(1, '#ff8a4a'); main.fillStyle = bg; main.fillRect(0, 0, SW, SH);
  main.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 0; i < 10; i++) { main.save(); main.translate(540, 700); main.rotate(i / 10 * Math.PI * 2 + t * 0.3); main.fillRect(0, -40, 1400, 80); main.restore(); }
  characters(SCR, () => { pedro(540, 2050, { s: 1.55, mouth: 'smile', brows: 0.4, look: [0, 0], armR: [200, -600, 230, -760], armL: [-170, -440, -140, -330] }); }, 'rgba(255,255,255,0.9)', 0);
  const ins = ss(NX + 0.3, NX + 0.6, t); tapeInsert(ins, t, 470);
  const D = W0('devolveu', 'end'); if (t > D) { const k = t - D, sc = k < 0.12 ? lerp(1.6, 1, ease(k / 0.12)) : 1; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(540, 480); main.rotate(-0.15); main.scale(sc, sc); main.strokeStyle = '#1fa84a'; main.lineWidth = 12; main.beginPath(); main.roundRect(-300, -70, 600, 140, 24); main.stroke(); main.fillStyle = '#1fa84a'; main.font = '900 96px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('DEVOLVIDO', 0, 6); main.restore(); }
  if (t > RE - 0.1) for (let i = 0; i < 2; i++) { const k = clamp((t - RE - i * 0.12) / 0.35); if (k <= 0) continue; const x = 760 + i * 70, y = lerp(1200, 860, ease(k)); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.fillStyle = '#ffd23f'; main.strokeStyle = '#08061a'; main.lineWidth = 6; main.beginPath(); main.arc(0, 0, 54, 0, 7); main.fill(); main.stroke(); main.fillStyle = '#8a5a10'; main.font = '900 46px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('R$1', 0, 2); main.restore(); }
  laterCard('NO DIA SEGUINTE…', ss(NX - 0.1, NX + 0.05, t) * (1 - ss(NX + 0.5, NX + 0.75, t)));
}
function sCta(t) {
  tvDraw('snow', t, { light: 0.7 }); setCam([2.6, 2.3, 3.2], [-0.2, 0.9, -2.0]); draw3D(); fade(0.5, '5,4,14');
  const Q = W0('quem', 'cta') - 0.6, k = t - T0('cta');
  textOut('QUEM É O PRÓXIMO?', 540, 520, 92, '#ffd23f', { s: popS(k, 0.3) });
  for (let i = 0; i < 3; i++) { const kk = clamp((k - 0.25 - i * 0.12) / 0.25); if (kk <= 0) continue; const x = 300 + i * 240, y = 980;
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.scale(popS(kk * 0.3), popS(kk * 0.3)); main.fillStyle = '#0d0b16'; main.strokeStyle = '#7f6fb0'; main.lineWidth = 6;
    main.beginPath(); main.ellipse(0, -60, 80, 100, 0, 0, 7); main.fill(); main.stroke(); main.beginPath(); main.roundRect(-90, 40, 180, 200, 60); main.fill(); main.stroke(); main.restore();
    textOut('?', x, y - 60, 110, '#ffffff', { s: popS(kk * 0.3) }); }
  const tc = W0('comenta', 'cta'); if (t > tc - 0.2) textOut('COMENTA AÍ! ↓', 540, 1300, 84, '#ffffff', { a: ss(tc - 0.2, tc, t), s: popS(t - tc + 0.2, 0.3) });
}
// ---------- the ERRADO! stamps ----------
const STAMPS = [[TL.ok[0], 'ACERTO Nº 1'], [TL.ok[1], 'ACERTO Nº 2'], [TL.ok[2], 'ACERTO Nº 3']];
function stamps(t) {   // green "ACERTOU!" stamp, tilted, at the top (clear of the captions)
  for (const [t0, sub] of STAMPS) {
    const k = t - t0; if (k < 0 || k > 1.1) continue; const col = '#1fb84f', txt = 'ACERTOU!';
    const s = k < 0.12 ? lerp(1.6, 1, ease(k / 0.12)) : 1, a = (k < 0.12 ? k / 0.12 : 1) * (1 - ss(0.8, 1.1, k));
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 620); main.rotate(-0.12); main.scale(s, s);
    main.font = '900 140px "Inter Display", Inter'; const w = main.measureText(txt).width + 110;
    main.fillStyle = 'rgba(255,255,255,0.85)'; main.beginPath(); main.roundRect(-w / 2, -125, w, 250, 30); main.fill();
    main.lineWidth = 16; main.strokeStyle = col; main.beginPath(); main.roundRect(-w / 2, -125, w, 250, 30); main.stroke(); main.lineWidth = 6; main.beginPath(); main.roundRect(-w / 2 + 22, -103, w - 44, 206, 18); main.stroke();
    main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillStyle = col; main.fillText(txt, 0, -28); main.font = '900 56px "Inter Display", Inter'; main.fillText(sub, 0, 88);
    main.restore(); if (k < 0.18) fade(0.25 * (1 - k / 0.18), '60,255,120');
  }
}
function shakeAmt(t) { return 0; }
function hook(t) {
  const tw = WORDS.filter(w => w.seg === 'title'); if (!tw.length) return;
  titleFX(t, tw[0].t0 - 0.3, tw[tw.length - 1].t1 - 0.05, [{ txt: 'VOCÊ SOBREVIVERIA', size: 92, colors: ['#ffffff', '#d9e4ff'] }, { txt: 'À MENINA', size: 116, colors: ['#ffffff', '#b9c2d8'] }, { txt: 'DO POÇO?', size: 116, colors: ['#8affd0', '#1e9a7a'] }], 400);
}
const SCENES = { title: sTitle, tape: sTape, skip: sSkip, tvon: sTvon, plug: sPlug, crawl: sCrawl, run: sRun, end: sEnd, cta: sCta };
const SHK = mk();
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over'; main.filter = 'none'; fill([0, 0, 0], 0); PLUG3.visible = cable.visible = t < TL.plug;
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t); if (sg.scene === 'title') titleZoom(t);
  const sh = shakeAmt(t);
  if (sh > 0) { const c = SHK.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SW, SH); c.drawImage(GL, 0, 0); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.drawImage(SHK, Math.sin(t * 90) * sh, Math.cos(t * 77) * sh); }
  counters(t); stamps(t);
  for (const n of ['tape', 'tvon']) { const c = T0(n); fade(1 - ss(0, 0.2, Math.abs(t - c))); }
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
