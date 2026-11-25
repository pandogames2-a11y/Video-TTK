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
function tapeInsert(a, t) {   // close-up of the tape label with the thrift-store price sticker
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; const pg = g; g = main;
  main.translate(540, 820); main.rotate(-0.06 + Math.sin(t * 2) * 0.01); main.scale(popS(a, 1) * 1.9, popS(a, 1) * 1.9); vhs(0, 0, 1, 0, true);
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
function counters(t) {   // ERROS x/3 (top right) and the days left (top left, after the phone call)
  if (t < T0('tape')) return;
  const errs = TL.err.filter(e => t >= e).length, last = TL.err.filter(e => t >= e).pop();
  const bump = last !== undefined ? popS(t - last, 0.25) : 1;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  main.translate(SW - 190, 130); main.scale(bump, bump); main.fillStyle = 'rgba(10,8,20,0.75)'; main.strokeStyle = errs ? '#d8261c' : '#ffffff'; main.lineWidth = 5; main.beginPath(); main.roundRect(-150, -42, 300, 84, 42); main.fill(); main.stroke();
  main.fillStyle = errs ? '#ff4a3a' : '#ffffff'; main.font = '900 44px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(`ERROS ${errs}/3`, 0, 2); main.restore();
  const D7 = W0('sete', 'call'); if (t < D7) return;
  const d0 = T0('days'), days = t < d0 + 0.1 ? 7 : Math.max(0, 7 - Math.floor((t - d0 - 0.1) / 0.13)), over = days === 0;
  const bs = t < D7 + 0.3 ? popS(t - D7, 0.25) : over && t < d0 + 1.3 ? popS(t - d0 - 1.0, 0.25) : 1;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(190, 130); main.scale(bs, bs);
  main.fillStyle = 'rgba(10,8,20,0.75)'; main.strokeStyle = '#d8261c'; main.lineWidth = 5; main.beginPath(); main.roundRect(-150, -42, 300, 84, 42); main.fill(); main.stroke();
  main.fillStyle = '#f3eedc'; main.strokeStyle = '#08061a'; main.lineWidth = 3; main.fillRect(-124, -24, 40, 44); main.strokeRect(-124, -24, 40, 44); main.fillStyle = '#c03030'; main.fillRect(-124, -24, 40, 12);
  main.fillStyle = over ? '#ff4a3a' : '#ffffff'; main.font = '900 44px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(`${days} ${days === 1 ? 'DIA' : 'DIAS'}`, 30, 2); main.restore();
}

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
function sWatch(t) {   // the tape goes into the VCR... then he watches, alone, at 3 a.m.
  const A = TL.err[0], C = TL.ins;
  if (false) {   // VCR close-up (cut: too dark to read): the tape slides into the slot
    tvDraw('blue', t, { light: 0.5 }); fill([0.2, 0.9, -2.5], 7); setCam([0.15, 0.36, -2.35], [-0.1, 0.2, -3.15]); draw3D();
    const k = ease(clamp((t - C) / 0.55)); const [x, y, d] = proj(-0.2, 0.17, lerp(-2.75, -3.12, k)); const s = ppm(d) / 900 * 0.45;
    if (k < 0.98) characters(SCR, () => { g.save(); g.beginPath(); const [sx, sy] = proj(-0.2, 0.17, -3.145); g.rect(0, 0, SW, sy + 4); g.restore(); vhs(x, y - 60 * s, s, 0, false); }, 'rgba(200,220,255,0.6)', 0.2);
    vignette(main, 0.6); return;
  }
  tvDraw(t < A - 0.05 ? 'blue' : 'tape', t); setCam([0.02, 1.05, -2.6], [0, 0.72, 0.3]); draw3D();
  const fl = 0.6 + 0.4 * Math.abs(Math.sin(t * 23) * Math.sin(t * 7));
  ped(0, PZ, { sit: true, look: [0, -0.1], mouth: 'o', brows: -0.4, armL: [-170, -420, -110, -300], armR: [170, -420, 110, -300], blink: 0 }, `rgba(220,235,255,${0.6 + 0.35 * fl})`);
  fade(0.15 * (1 - fl), '0,0,10');
  const T3 = W0('três', 'watch'); ledClock(ss(T3 - 0.15, T3 + 0.1, t) * (1 - ss(TE('watch') - 0.3, TE('watch'), t)), t);
  vignette(main, 0.65);
}
function sCall(t) {   // the tape ends (static); the phone rings; he answers; a whisper: "seven days"
  const R = TL.ring, V = W0('voz', 'call'), S7 = W0('sete', 'call');
  tvDraw('snow', t); setCam([0.3, 1.1, -2.2], [0, 0.78, 0.3]); draw3D();
  const ear = t > V - 0.2;
  ped(0, PZ, { sit: true, look: ear ? [-0.6, 0] : [0.6, 0.4], mouth: t > S7 ? 'o' : 'flat', sweat: t > S7 + 0.2, brows: t > S7 ? -1 : 0, phone: 'R', light: true,
    armR: ear ? [190, -600, 105, -760] : [180, -440, 140, -400], armL: [-170, -420, -110, -300] });
  const ph = ss(R - 0.2, R + 0.1, t) * (1 - ss(V - 0.3, V, t));
  if (ph > 0) { main.save(); main.globalAlpha = ph; main.restore(); phone2D(830, 1150, 0.62 * popS(t - R + 0.2, 0.25), 0.1, { mode: 'call' }, true, t); }
  if (t > S7 - 0.1) { const k = t - S7; textOut('7 DIAS', 540, 560, 150, '#ffffff', { a: clamp(k / 0.2) * (1 - ss(1.4, 1.9, k)), s: 1 + k * 0.15 }); }
  vignette(main, 0.65 + (t > S7 ? 0.1 : 0));
}
function sPost(t) {   // "it's a prank": he posts the video. Now the whole school has 7 days.
  const P = TL.err[1], EI = W0('escola', 'post');
  tvDraw('well', t, { girl: 1 }); setCam([0.65, 1.15, -2.0], [0, 0.78, 0.3]); draw3D();
  ped(0, PZ, { sit: true, look: [0.7, 0.5], mouth: t < P ? 'smile' : 'smile', brows: 0.5, phone: 'R', light: true, armR: [180, -470, 120, -460], armL: [-170, -440, 20, -470] });
  const pa = 1 - ss(EI - 0.3, EI, t);
  if (pa > 0) { const up = clamp((t - T0('post') - 0.4) / Math.max(0.3, P - T0('post') - 0.4)); const likes = t < P ? 0 : Math.floor(Math.min(99999, Math.pow((t - P) * 6, 3.2)));
    main.save(); main.globalAlpha = pa; phone2D(820, 1180, 0.68 * popS(t - T0('post'), 0.3), -0.08, { mode: t < P ? 'upload' : 'posted', k: up, likes }, false, t); main.restore(); }
  schoolPanel(ss(EI - 0.2, EI + 0.05, t), t, EI + 0.3);
  vignette(main, 0.6);
}
function sDays(t) {   // 7 days later, 3 a.m.: he dozed off on the beanbag; the TV turns on by itself and shows the well
  const d0 = T0('days'), ON = TL.tvon, PO = W0('poço', 'days');
  const mode = t < ON ? 'off' : t < PO - 0.1 ? 'snow' : 'well';
  tvDraw(mode, t, { girl: 0 }); setCam(...BACKCAM); flat3D();
  const awake = t > ON + 0.5;
  pedB(0.05, PZ, { sit: true, tilt: awake ? 0 : 0.22, armL: [-150, -440, -120, -330], armR: [150, -440, 120, -330] }); beanOver();
  if (t > ON && t < ON + 0.15) fade(0.6 * (1 - (t - ON) / 0.15), '230,240,255');
  fade(t < ON ? 0.35 : 0, '0,0,8');
  laterCard('7 DIAS DEPOIS…', ss(d0, d0 + 0.15, t) * (1 - ss(d0 + 1.1, d0 + 1.4, t)));
  vignette(main, 0.65);
}
function sCrawl(t) {   // on the screen she climbs out of the well and walks closer... then crawls OUT of the TV, into the room
  const c0 = T0('crawl'), SA = W0('saiu', 'crawl'), RA = W0('rastejando', 'crawl'), E = TE('crawl');
  const rise = clamp((t - c0) / Math.max(0.3, SA - c0)), walk = clamp((t - SA) / Math.max(0.3, RA - SA));
  tvDraw('well', t, t < RA ? { girl: rise, walk } : { girl: null });
  setCam([0.85, 0.95, 0.9], [-0.1, 0.75, -3.0]); flat3D();
  if (t >= RA) {
    const k = clamp((t - RA) / (E - RA + 1.0)), out = clamp(k / 0.35), drop = clamp((k - 0.35) / 0.15), fw = clamp((k - 0.5) / 0.5);
    const z = k < 0.35 ? lerp(-3.2, -2.9, ease(out)) : lerp(-2.9, -2.1, ease(fw)), y = k < 0.35 ? 0.82 : lerp(0.82, 0, ease(drop));
    girl(-0.08, y, z, { crawl: 1, ph: t * 6 }, k < 0.2 ? screenRect() : null);
  }
  pedB(0.05, PZ, { sit: true, armL: [-160, -460, -190, -560], armR: [160, -460, 190, -560] }); beanOver();
  vignette(main, 0.68);
}
function sHelp(t) {   // the right thing: pull the plug. Instead he stands up and offers her a hand.
  const M = W0('mas', 'help'), A = TL.err[2], GLT = TL.glitch;
  if (t >= GLT) { glitchFace(t); return; }
  if (t < M - 0.05) {   // the socket on the wall, glowing green
    tvDraw('well', t, { girl: null }); fill([1.4, 1.0, -3.3], 5); setCam([1.5, 0.8, -2.85], [1.3, 0.45, -3.98]); draw3D();
    const [sx, sy] = proj(1.3, 0.45, -3.96); const p = 0.5 + 0.5 * Math.sin(t * 8);
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.strokeStyle = `rgba(60,255,120,${0.5 + 0.4 * p})`; main.lineWidth = 14; main.shadowColor = '#3cff78'; main.shadowBlur = 30; main.beginPath(); main.arc(sx, sy, 170 + p * 16, 0, 7); main.stroke(); main.restore();
    textOut('O CERTO ✓', sx, sy - 280, 90, '#5cff8a', { s: popS(t - T0('help'), 0.3) });
    vignette(main, 0.6); return;
  }
  tvDraw('snow', t, { light: 0.8 }); setCam([1.0, 1.05, 1.7], [0.05, 0.62, -1.6]); draw3D();
  const k = clamp((t - M) / Math.max(0.4, A - M));
  girl(-0.45, 0, -1.6, { crawl: 1, ph: 1.2, reach: t > A - 0.3 }, null);
  ped(0.45, -1.6, { look: [-1, 0.4], mouth: t > A ? 'smile' : 'flat', brows: 0.4, armL: k > 0.5 ? [-210, -540, -330, -500] : [-150, -440, -140, -330], walk: k < 0.5 ? 0.4 : 0, phase: t * 8 });
  vignette(main, 0.65);
}
function glitchFace(t) {   // last second: her eye peeks through the hair, static over everything
  tvDraw('snow', t); fill([-0.4, 0.8, -0.9], 3); setCam([-0.5, 0.42, -0.85], [-0.6, 0.34, -1.6]); draw3D();
  girl(-0.6, 0, -1.6, { crawl: 1, ph: 1.2, hairPart: clamp((t - TL.glitch) / 0.3) }, null);
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 0.14 + 0.1 * Math.random(); main.imageSmoothingEnabled = false; main.drawImage(NOISES[Math.floor(t * 30) % 4], 0, 0, SW, SH); main.restore();
  vignette(main, 0.75);
}
function sEnd(t) {   // close on the TV: Pedrinho is inside the tape now, hands on the glass. At least it went viral.
  const V = W0('viralizou', 'end');
  tvDraw('ped', t); const k = ease(clamp((t - T0('end')) / 2.5));
  setCam([-0.08, 1.13, lerp(-0.6, -1.4, k)], [-0.08, 1.05, -3.07]); draw3D();
  if (t > V - 0.1) { const kk = t - V; const n = Math.floor(Math.min(1, kk / 1.4) ** 2 * 1000000);
    textOut('▶ ' + n.toLocaleString('pt-BR'), 540, 1280, 92, '#ffffff', { s: popS(kk + 0.1, 0.3) }); textOut('VISUALIZAÇÕES', 540, 1385, 60, '#ffd23f', { s: popS(kk, 0.3) });
    for (let i = 0; i < 8; i++) { const q = kk - i * 0.15; if (q < 0 || q > 1.6) continue; const x = 160 + hash(i) * 760, y = 1250 - q * 500; textOut('♥', x, y, 70, '#ff3a6a', { a: 1 - q / 1.6 }); } }
  vignette(main, 0.55);
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
const STAMPS = [[TL.err[0], 'ERRO Nº 1'], [TL.err[1], 'ERRO Nº 2'], [TL.err[2], 'ÚLTIMO ERRO']];
function stamps(t) {
  for (const [t0, sub] of STAMPS) {
    const k = t - t0; if (k < 0 || k > 1.6) continue; const col = '#d8261c', txt = 'ERRADO!';
    const s = k < 0.12 ? lerp(1.6, 1, ease(k / 0.12)) : 1, a = (k < 0.12 ? k / 0.12 : 1) * (1 - ss(1.3, 1.6, k));
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 620); main.rotate(-0.16); main.scale(s, s);
    main.font = '900 150px "Inter Display", Inter'; const w = main.measureText(txt).width + 110;
    main.lineWidth = 16; main.strokeStyle = col; main.beginPath(); main.roundRect(-w / 2, -125, w, 250, 30); main.stroke(); main.lineWidth = 6; main.beginPath(); main.roundRect(-w / 2 + 22, -103, w - 44, 206, 18); main.stroke();
    main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillStyle = col; main.fillText(txt, 0, -28); main.font = '900 56px "Inter Display", Inter'; main.fillText(sub, 0, 88);
    main.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 40; i++) { const x = ((i * 137.7) % w) - w / 2, y = ((i * 71.3) % 230) - 115; main.beginPath(); main.arc(x, y, 2 + (i % 4), 0, 7); main.fill(); }
    main.restore(); if (k < 0.18) fade(0.3 * (1 - k / 0.18), '255,40,30');
  }
}
function shakeAmt(t) { let a = 0; for (const [t0] of STAMPS) { const k = t - t0; if (k >= 0.08 && k < 0.45) a = Math.max(a, 16 * (1 - (k - 0.08) / 0.37)); } return a; }
function hook(t) {
  const tw = WORDS.filter(w => w.seg === 'title'); if (!tw.length) return;
  titleFX(t, tw[0].t0 - 0.3, tw[tw.length - 1].t1 - 0.05, [{ txt: 'VOCÊ SOBREVIVERIA', size: 92, colors: ['#ffffff', '#d9e4ff'] }, { txt: 'À MENINA', size: 116, colors: ['#ffffff', '#b9c2d8'] }, { txt: 'DO POÇO?', size: 116, colors: ['#8affd0', '#1e9a7a'] }], 400);
}
const SCENES = { title: sTitle, tape: sTape, watch: sWatch, call: sCall, post: sPost, days: sDays, crawl: sCrawl, help: sHelp, end: sEnd, cta: sCta };
const SHK = mk();
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over'; main.filter = 'none'; fill([0, 0, 0], 0);
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t); if (sg.scene === 'title') titleZoom(t);
  const sh = shakeAmt(t);
  if (sh > 0) { const c = SHK.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SW, SH); c.drawImage(GL, 0, 0); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.drawImage(SHK, Math.sin(t * 90) * sh, Math.cos(t * 77) * sh); }
  counters(t); stamps(t);
  for (const n of ['tape', 'days', 'end']) { const c = T0(n); fade(1 - ss(0, 0.2, Math.abs(t - c))); }
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
