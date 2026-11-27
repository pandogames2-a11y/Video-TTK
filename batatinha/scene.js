// EP13 animation: 3D sets (world3d.js) + 2D characters (human.js) on top. window.renderFrame(t) draws the frame at time t.
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
const hash = (n) => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };
function textOut(str, x, y, size, fill, opt = {}) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); if (opt.rot) main.rotate(opt.rot); if (opt.s) main.scale(opt.s, opt.s); main.globalAlpha = opt.a ?? 1; main.textAlign = opt.align || 'center'; main.textBaseline = 'middle'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(str, 0, 0); main.fillStyle = fill; main.fillText(str, 0, 0); main.restore(); }
const popS = (k, d = 0.25) => { const x = clamp(k / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; };
function fade(a, col = '0,0,0') { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(${col},${a})`; main.fillRect(0, 0, SW, SH); main.restore(); }
const FILA_IMG = new Image(); FILA_IMG.src = 'tenis_fila.png'; await FILA_IMG.decode();
const PRODUCT = { code: '2JUBS1-CKKG' };   // Mercado Livre affiliate code; the link (meli.la/2xCt7on) goes in the post description

// ---------- 3D helpers ----------
function setCam(pos, look, fov = 42) { cam3.fov = fov; cam3.updateProjectionMatrix(); cam3.position.set(...pos); cam3.lookAt(...look); cam3.updateMatrixWorld(); }
let RENDERED = false;
function draw3D() { RENDERED = false; main.setTransform(1, 0, 0, 1, 0, 0); main.clearRect(0, 0, SW, SH); }
function render3D() { renderer.render(scene, cam3); RENDERED = true; }
function vanOver() {}
// 3D actors: same list format as before. item: {x, z, who: 'ped'|'back'|'girl'|'girlBack'|'extra'|'extraBack', k, o (2D-style options), lie, ry}
function people(list) {
  for (const p of list) {
    const H = p.who === 'ped' || p.who === 'back' ? PED3 : p.who.startsWith('girl') ? GIRL3 : EX3[p.k % EX3.length];
    const o = p.o || {}, back = p.who === 'back' || p.who.endsWith('Back');
    let ry = p.ry; if (ry === undefined) { ry = Math.atan2(cam3.position.x - p.x, cam3.position.z - p.z); if (back) ry += Math.PI; }
    const armR = o.phone ? 'phone' : o.armR && o.armR[3] < -600 ? 'up' : o.armRk, look = o.look || [0, 0];
    H.pose({ x: p.x, z: p.z, ry, run: Math.min(1, o.walk || 0), phase: o.phase || 0, sit: !!o.sit, seat: o.seat, lie: p.lie, shoes: o.shoes, armR, armL: o.armLk, phone: !!o.phone, look: o.headYaw || 0,
      face: { mouth: o.mouth, brows: o.brows, blink: o.blink, sweat: o.sweat, look } });
  }
}
// ---------- the doll: when she faces the field, when she sings ----------
function dollTurn(t) {
  if (t < TL.away1) return 1;
  if (t < TL.away1 + 0.6) return 1 - ease((t - TL.away1) / 0.6);
  if (t < TL.turn - 0.1) return 0;
  if (t < TL.turn + 0.4) return ease((t - TL.turn + 0.1) / 0.5);
  if (t < TL.away2) return 1;
  if (t < TL.away2 + 0.6) return 1 - ease((t - TL.away2) / 0.6);
  return 0;
}
const singing = t => (t > TL.sing1[0] && t < TL.sing1[1]) || (t > TL.sing2[0] && t < TL.sing2[1]);
function drawDoll(t, o = {}) {
  const tr = dollTurn(t), sway = singing(t) ? Math.sin(t * 2.4) * 0.08 : 0; poseDoll(tr, o.red ? 'red' : 'scan', sway);
  if (singing(t)) { const [px, py, d] = proj(0, 18.5, DOLLZ), H = 18 * ppm(d); for (let i = 0; i < 3; i++) { const k = ((t * 0.7 + i / 3) % 1); textOut(i % 2 ? '♪' : '♫', px + (i - 1) * H * 0.12 + Math.sin(i * 2 + t * 2) * H * 0.02, py - H * k * 0.2, 70, '#ffffff', { a: Math.sin(k * Math.PI) }); } }
}
// ---------- positions on the field (z along the track: start 0 → finish -30) ----------
const V1 = 1.0;   // running speed while she counts (cartoon pace)
const RUN1_END = TL.turn + 0.05;
function zRun(t, sp = 1) {   // everyone's z: run while she counts (both songs), frozen while she looks
  let z = -sp * V1 * clamp(t - TL.run1, 0, RUN1_END - TL.run1);
  return z;
}
const ZT = zRun(RUN1_END);   // Pedrinho's spot when she turned
const V2 = (-31.5 - ZT) / Math.max(0.6, TL.cross + 0.4 - TL.sing2[0]);   // the last run: he reaches the line at "cruzou"
function pedZ(t) { let z = zRun(t); if (t > TL.sing2[0]) z = ZT - V2 * Math.min(t - TL.sing2[0], TL.cross + 0.4 - TL.sing2[0]) - Math.max(0, Math.min(1.6, (t - TL.cross - 0.4) * 2)); return z; }
const running = t => (t > TL.run1 && t < RUN1_END) || (t > TL.sing2[0] && t < TL.cross + 1.0);
const GX = -1.7, PX = 0.9;
const GSLIDE = (t) => clamp((t - TL.slip) / 0.7);
function girlZ(t) { return t < TL.slip ? zRun(t) : zRun(TL.slip) - 1.6 * ease(GSLIDE(t)); }
const EXTRAS = [[-6.2, 0.86], [-4.4, 0.78], [-2.9, 1.04], [2.4, 0.92], [3.9, 0.82], [5.5, 0.97], [7.2, 0.74]].map(([x, sp], k) => ({ x, sp, k }));
function extraZ(e, t) { let z = zRun(t, e.sp); if (t > TL.sing2[0]) z = zRun(RUN1_END, e.sp) - V2 * e.sp * 0.8 * clamp(t - TL.sing2[0], 0, 4); return Math.max(z, -34); }
function fieldCrowd(t, opt = {}) {   // the extras + the girl + Pedrinho, front-facing, running/frozen
  const run = running(t), ph = t * 11;
  const L = EXTRAS.map(e => ({ x: e.x, z: extraZ(e, t), ry: Math.PI, who: 'extra', k: e.k, o: { walk: run ? 0.9 : 0, phase: ph + e.k, mouth: run ? 'o' : 'flat', armL: run ? [-170, -470 + Math.sin(ph + e.k) * 40, -150, -380] : undefined } }));
  if (!opt.noGirl) L.push(girlActor(t));
  if (!opt.noPed) L.push({ x: PX, z: pedZ(t), ry: Math.PI, who: 'ped', o: pedPose(t) });
  return L;
}
function girlActor(t) {
  const k = GSLIDE(t);
  if (t < TL.slip) return { x: GX, z: girlZ(t), ry: Math.PI, who: 'girl', o: { walk: running(t) ? 0.9 : 0, phase: t * 11 + 1.3, mouth: 'o' } };
  const lie = lerp(0, -Math.PI / 2, ease(clamp(k * 1.4))) ;
  return { x: GX, z: girlZ(t), ry: Math.PI, who: 'girl', lie, o: { walk: k < 0.5 ? 1.2 : 0, phase: 2.2, mouth: k < 0.6 ? 'scream' : (t > TL.turn ? 'flat' : 'o'), brows: -1, blink: t > TL.turn + 0.3 && t < TE('rug') ? 1 : 0, sweat: t > TL.turn } };
}
function pedPose(t) {
  const run = running(t);
  if (run) return { shoes: 'fila', walk: 1.0, phase: t * 11, mouth: 'smile', look: [0, -0.1], armL: [-180, -470 + Math.sin(t * 11) * 50, -150, -370], armR: [180, -470 - Math.sin(t * 11) * 50, 150, -370] };
  if (t > TL.turn && t < TL.sing2[0]) return { shoes: 'fila', walk: 0.9, phase: TL.turn * 11, mouth: 'flat', brows: -0.5, sweat: true, look: [0, -0.2] };   // frozen mid-stride
  return { shoes: 'fila', mouth: 'smile' };
}

// ---------- 2D bits ----------
function codeCard(cy, a = 1, s = 1) {   // Mercado Livre code card (+ #publi)
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, cy); main.scale(s, s);
  main.fillStyle = '#ffe600'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath(); main.roundRect(-430, -120, 860, 240, 34); main.fill(); main.stroke();
  main.fillStyle = '#2d3277'; main.font = '900 40px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('COLE NO BUSCADOR DO MERCADO LIVRE:', 0, -62);
  main.fillStyle = '#ffffff'; main.beginPath(); main.roundRect(-330, -26, 660, 100, 22); main.fill(); main.lineWidth = 5; main.stroke();
  main.fillStyle = '#1b1430'; main.font = '900 76px "Inter Display", Inter'; main.fillText(PRODUCT.code, 0, 26);
  main.fillStyle = '#2d3277'; main.font = '800 28px "Inter Display", Inter'; main.fillText('#publi · link de afiliado na descrição', 0, 98); main.restore();
}
function shoeShowcase(t, a, cx = 540, cy = 640, w = 860) {   // the real product photo, floating with a glow
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a;
  const gr = main.createRadialGradient(cx, cy, 40, cx, cy, w * 0.7); gr.addColorStop(0, 'rgba(160,190,255,0.55)'); gr.addColorStop(1, 'rgba(160,190,255,0)'); main.fillStyle = gr; main.fillRect(0, 0, SW, SH);
  const h = w * FILA_IMG.height / FILA_IMG.width, bob = Math.sin(t * 2) * 10; main.translate(cx, cy + bob); main.rotate(-0.06 + Math.sin(t * 1.3) * 0.02); main.scale(popS(a, 1), popS(a, 1));
  main.shadowColor = 'rgba(0,0,0,0.6)'; main.shadowBlur = 40; main.shadowOffsetY = 30; main.drawImage(FILA_IMG, -w / 2, -h / 2, w, h); main.shadowBlur = 0; main.shadowOffsetY = 0;
  const sh = ((t * 0.5) % 1.4) - 0.2;   // light sweep
  main.globalCompositeOperation = 'source-atop'; main.restore();
}
function tag(txt, x, y, k, col = '#7b3fe4') { if (k <= 0) return; const s = popS(k, 0.25); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.scale(s, s); main.rotate(-0.04);
  main.font = `900 ${txt.length > 15 ? 36 : 44}px "Inter Display", Inter`; const w = main.measureText(txt).width + 56; main.fillStyle = col; main.strokeStyle = '#08061a'; main.lineWidth = 6; main.beginPath(); main.roundRect(-w / 2, -38, w, 76, 38); main.fill(); main.stroke();
  main.fillStyle = '#fff'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(txt, 0, 3); main.restore(); }
function eyelids(k) { if (k >= 1) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#000'; const e = SH / 2 * (1 - clamp(k)), ry = SH * 0.55; main.beginPath(); main.ellipse(540, e - ry, 1100, ry, 0, 0, Math.PI * 2); main.fill(); main.beginPath(); main.ellipse(540, SH - e + ry, 1100, ry, 0, 0, Math.PI * 2); main.fill(); main.restore(); }
function blurAll(px) { if (px <= 0.3) return; if (!RENDERED) render3D(); const c = SHK.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, SW, SH); c.drawImage(GL, 0, 0); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.filter = `blur(${px}px)`; main.drawImage(SHK, 0, 0); main.filter = 'none'; }
function scanSweep(t, a) {   // the doll's yellow scanner light sweeping across the picture
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'screen'; const x = 540 + Math.sin(t * 1.6) * 520;
  const gr = main.createLinearGradient(x - 220, 0, x + 220, 0); gr.addColorStop(0, 'rgba(255,220,120,0)'); gr.addColorStop(0.5, `rgba(255,220,120,${0.32 * a})`); gr.addColorStop(1, 'rgba(255,220,120,0)'); main.fillStyle = gr; main.fillRect(0, 0, SW, SH); main.restore(); }
function confetti(t, t0) { const k = t - t0; if (k < 0 || k > 3) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < 90; i++) { const x = hash(i) * SW, vy = 300 + hash(i + 9) * 500, y = -40 + vy * k - 0 + (hash(i + 3) - 0.5) * 300 * 0, r = k * (3 + hash(i + 5) * 6); main.fillStyle = ['#ffd23f', '#ff4a6a', '#3fd0ff', '#7bff6a', '#ffffff'][i % 5]; main.globalAlpha = 1 - ss(2.2, 3, k);
    main.save(); main.translate(x + Math.sin(k * 3 + i) * 40, y); main.rotate(r); main.fillRect(-10, -5, 20, 10); main.restore(); } main.restore(); }
function screenDraw(mode, t) {   // the dorm's big screen
  const c = SCREEN_CV.getContext('2d'), W = 1024, H = 576; c.fillStyle = '#060a18'; c.fillRect(0, 0, W, H);
  if (mode === 'off') { SCREEN_TEX.needsUpdate = true; return; }
  c.fillStyle = '#0d1a3a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#2a4a8a'; c.lineWidth = 2; for (let y = 0; y < H; y += 6) { c.globalAlpha = 0.25; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); } c.globalAlpha = 1;
  c.save(); c.translate(W / 2, 170); for (const bx of [-1, 1]) { c.fillStyle = '#d8262c'; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(bx * 70, -70, bx * 130, -30); c.quadraticCurveTo(bx * 140, 30, bx * 110, 50); c.quadraticCurveTo(bx * 60, 30, 0, 0); c.fill(); } c.fillStyle = '#b01e24'; c.beginPath(); c.arc(0, 0, 28, 0, 7); c.fill(); c.restore();   // the red bow logo
  c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.font = '900 64px "Inter Display", Inter';
  if (mode === 'welcome') { c.fillText('BEM-VINDOS AOS JOGOS', W / 2, 330); c.font = '700 40px "Inter Display", Inter'; c.fillStyle = '#9fc4ff'; c.fillText('aguardem instruções', W / 2, 410); }
  else { c.fillStyle = '#ff5a5a'; c.fillText('SOBREVIVAM AOS JOGOS', W / 2, 330); c.fillStyle = '#ffffff'; c.font = '800 46px "Inter Display", Inter'; c.fillText('PARA PODER SAIR DAQUI', W / 2, 410); }
  SCREEN_TEX.needsUpdate = true;
}

// ---------- scenes ----------
function sTitle(t) {   // flash-forward: the players lined up at the start line, the doll facing them at the far end
  setCam([0.9, 1.7, 8.5], [0, 12, -40]); scan(0.6, Math.sin(t) * 4, -3); draw3D();
  drawDoll(t, { eyes: 'scan' });
  people([...EXTRAS.map(e => ({ x: e.x * 0.8, z: 0.2, who: 'extraBack', k: e.k })), { x: GX, z: 0.3, who: 'girlBack' }, { x: PX, z: 0.4, who: 'back', o: { shoes: 'fila' } }]);
  vignette(main, 0.25);
}
function titleZoom(t) {
  if (!RENDERED) render3D();
  const k = ease(clamp((t - T0('title')) / 2.8)), s = 1 + 0.1 * k, cx = 560, cy = 820;
  const cc = SHK.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, SW, SH); cc.drawImage(GL, 0, 0); cc.drawImage(main.canvas, 0, 0);
  main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.translate(cx, cy); main.scale(s, s); main.translate(-cx, -cy); main.drawImage(SHK, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0);
}
function sStreet(t) {   // walking home with the phone... a black van stops next to him, the door slides, the van leaves: only his phone is left on the sidewalk
  scan(0);
  const PZS = -10.5, pz = t < TL.van_stop ? lerp(-14, PZS, clamp((t - T0('street')) / (TL.van_stop - T0('street')))) : PZS;
  let vz = t < TL.van_in ? 40 : t < TL.van_out ? PZS : PZS - 30 * Math.pow(t - TL.van_out, 2);
  if (t >= TL.van_in && t < TL.van_stop) { const k = clamp((t - TL.van_in) / (TL.van_stop - TL.van_in)); vz = lerp(30, PZS, 1 - Math.pow(1 - k, 2.2)); }
  const door = t < TL.door_o ? 0 : t < TL.door_o + 0.25 ? (t - TL.door_o) / 0.25 : t < TL.door_c - 0.2 ? 1 : t < TL.door_c ? (TL.door_c - t) / 0.2 : 0;
  vanAt(SX + 2.3, vz + 0.6, door, 1);
  sunAt(SX, -10); setCam([SX - 2.2, 1.7, -3.5], [SX + 4.3, 1.1, -12]); draw3D();
  if (t < TL.door_c - 0.1) people([{ x: SX + 5.2, z: pz, who: 'ped', o: { walk: t < TL.van_stop ? 0.5 : 0, phase: t * 7, phone: 'R', armR: [150, -480, 160, -560], mouth: t > TL.van_stop - 0.4 ? 'o' : 'smile', look: t > TL.van_stop - 0.4 ? [-1, 0] : [0.3, -0.3], brows: t > TL.van_stop - 0.4 ? -1 : 0 } }]);
  else { const [px, py, d] = proj(SX + 5.0, 0.02, PZS); const s = ppm(d) / 200; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(px, py); main.rotate(0.4); main.fillStyle = '#1c1c22'; main.strokeStyle = '#08061a'; main.lineWidth = 3; main.beginPath(); main.roundRect(-14 * s, -8 * s, 28 * s, 16 * s, 3 * s); main.fill(); main.stroke(); main.fillStyle = `rgba(150,200,255,${0.6 + 0.4 * Math.sin(t * 6)})`; main.fillRect(-11 * s, -6 * s, 22 * s, 12 * s); main.restore(); }
  vignette(main, 0.25);
}
const PB = { x: DX, z: -3.5 + 0.85 };   // Pedrinho's bunk (row 1, middle), he sits on the edge
const DORM_PEOPLE = [[-10, 4.85, 1], [5, -2.65, 1], [10, 4.85, 1], [-5, -10.15, 1], [5, -10.15, 1], [-2.5, 0.5, 0], [2.6, -6.8, 0], [-7.5, -7.2, 0], [7.5, 0.8, 0]];
function sDorm(t) {
  moon.intensity = 0; HEMI.intensity = 0.7;
  scan(0); screenDraw('off', t); scrL.intensity = 0;
  const vi = W0('viu', 'dorm'), un = W0('uniformes', 'dorm');
  if (t < vi) {   // his eyes opening: lying on the lower bunk, looking along the hall (blurry, then sharp)
    const k = clamp((t - T0('dorm') - 0.2) / (vi - T0('dorm') - 0.3));
    setCam([PB.x - 0.4, 0.95, PB.z - 1.0], [PB.x - 2, 1.4, -16], 55); draw3D();
    people(DORM_PEOPLE.map(([x, z, sit], k2) => ({ x: DX + x, z, who: 'extra', k: k2, o: { sit: !!sit, look: [0.4, 0] } })));
    blurAll(14 * (1 - k)); eyelids(k < 0.35 ? k / 0.35 * 0.5 : k < 0.5 ? 0.5 - (k - 0.35) * 2 : (k - 0.5) * 2 + 0.2);
    vignette(main, 0.25); return;
  }
  if (t < un - 0.3) {   // sitting up on the edge of his bunk, confused
    setCam([PB.x + 0.6, 1.25, PB.z + 3.4], [PB.x - 0.2, 1.0, PB.z]); draw3D();
    people([{ x: PB.x, z: PB.z, who: 'ped', o: { sit: true, look: [Math.sin(t * 1.5), -0.1], mouth: 'o', brows: -0.6 } }, ...DORM_PEOPLE.map(([x, z, sit], k2) => ({ x: DX + x, z, who: 'extra', k: k2, o: { sit: !!sit } }))]);
    vignette(main, 0.25); return;
  }
  // wide: the whole hall, beds and people in blue uniforms
  const k = ease(clamp((t - un + 0.3) / 2.5));
  setCam([DX + lerp(9, 7, k), lerp(6.5, 5.5, k), 8.5], [DX - 1, 1.2, -10]); draw3D();
  people([{ x: PB.x, z: PB.z, who: 'ped', o: { sit: true, look: [-0.6, 0], mouth: 'o', brows: -0.6 } }, ...DORM_PEOPLE.map(([x, z, sit], k2) => ({ x: DX + x, z, who: 'extra', k: k2, o: { sit: !!sit, look: [0.5, 0] } }))]);
  vignette(main, 0.25);
}
function sTold(t) {   // the big screen turns on and tells them: survive the games
  moon.intensity = 0; HEMI.intensity = 0.7;
  const k0 = t - T0('told'), sob = W0('sobreviver', 'told');
  screenDraw(t < sob - 0.2 ? 'welcome' : 'survive', t); scrL.intensity = 30 * clamp(k0 / 0.3);
  if (t < W0('jogos', 'told') + 0.2) {
    setCam([DX + 1.0, 2.0, -14.0], [DX - 0.2, 3.2, -29.5]); draw3D();
    people([{ x: DX - 3.2, z: -21, who: 'extraBack', k: 0 }, { x: DX + 2.6, z: -22, who: 'extraBack', k: 2 }, { x: DX - 1.0, z: -23.5, who: 'extraBack', k: 3 }, { x: DX - 4.6, z: -19.5, who: 'extraBack', k: 1 }, { x: DX + 0.7, z: -18.4, who: 'back' }]);
  } else {   // close on Pedrinho: gulp
    setCam([DX + 0.5, 1.45, -21.6], [DX + 0.7, 1.4, -18.4]); draw3D();
    people([{ x: DX + 0.7, z: -18.4, who: 'ped', o: { mouth: 'flat', brows: -1, sweat: true, look: [0, -0.4] } }], 'rgba(170,210,255,0.95)');
  }
  vignette(main, 0.25);
}
function lineUp(t) { return [...EXTRAS.map(e => ({ x: e.x, z: 0.3, who: 'extraBack', k: e.k })), { x: GX, z: 0.35, who: 'girlBack' }, { x: PX, z: 0.4, who: 'back', o: { shoes: 'fila' } }]; }
function sGame1(t) {   // first game: card; the doll faces them, then turns to the tree on "batatinha"
  scan(dollTurn(t) > 0.9 ? 0.5 : 0, Math.sin(t * 1.4) * 5, -2);
  const k = ease(clamp((t - T0('game1')) / (TE('game1') - T0('game1'))));
  setCam([lerp(2.5, 1.2, k), lerp(3.6, 2.2, k), lerp(8.8, 6.2, k)], [0, lerp(5, 8, k), -34]); draw3D();
  drawDoll(t); people(lineUp(t)); vignette(main, 0.25);
  const c0 = T0('game1'), kc = t - c0 - 0.1, out = W0('batatinha', 'game1') - 0.3;
  if (t < out + 0.3) { const a = 1 - ss(out, out + 0.3, t); textOut('1º JOGO', 540, 300, 120, '#ffffff', { s: popS(kc, 0.3), a }); }
  if (t > out - 0.1) textOut('BATATINHA FRITA 1, 2, 3', 540, 300, 74, '#ffd23f', { s: popS(t - out + 0.1, 0.3), a: 1 - ss(TE('game1') - 0.3, TE('game1'), t) });
}
function sRule(t) {   // they run toward the camera while she counts; then the finish line
  scan(0); const ch = W0('chegar', 'rule');
  if (t < ch - 0.1) {
    const pz = pedZ(t); setCam([0.3, 1.8, pz - 7.5], [0, 1.0, pz + 1]); draw3D();
    people(fieldCrowd(t));
    const co = W0('contando', 'rule'); if (t > co - 0.1) tag('BONECA CONTANDO = CORRE!', 540, 330, (t - co + 0.1) / 0.3, '#1fae5a');
  } else {   // the finish line, the doll singing behind it
    const k = ease(clamp((t - ch) / 2)); setCam([1.5, lerp(1.3, 2.0, k), -5], [0, lerp(6, 7.5, k), DOLLZ]); draw3D();
    const [lx, ly] = proj(0, 0, FINISH); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'screen'; const gr = main.createRadialGradient(lx, ly, 10, lx, ly, 500); gr.addColorStop(0, `rgba(255,80,80,${0.5 + 0.3 * Math.sin(t * 8)})`); gr.addColorStop(1, 'rgba(255,80,80,0)'); main.fillStyle = gr; main.fillRect(0, 0, SW, SH); main.restore();
    drawDoll(t); tag('LINHA DE CHEGADA', 540, ly - 140, (t - ch) / 0.3, '#d8262c');
  }
  vignette(main, 0.25);
}
function sGirl(t) {   // side by side; she slips (thin sole) and falls flat
  scan(0); const pz = pedZ(t), sf = W0('sola', 'girl');
  setCam([-0.4, 1.5, pz - 8.2], [-0.4, 1.0, pz + 1]); draw3D();
  people(fieldCrowd(t));
  if (t > sf - 0.15 && t < TE('girl') - 0.1) {   // close-up insert: her shoe, the paper-thin sole
    const k = clamp((t - sf + 0.15) / 0.25); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = k;
    main.fillStyle = 'rgba(6,8,20,0.75)'; main.beginPath(); main.arc(540, 700, 250 * popS(k, 1), 0, 7); main.fill(); main.lineWidth = 10; main.strokeStyle = '#ffffff'; main.stroke(); main.restore();
    const pg = g; g = main; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(520, 740); main.scale(3.4 * popS(k, 1), 3.4 * popS(k, 1)); main.rotate(-0.15); sneaker(0, 0, 1, 'thin'); main.restore(); g = pg;
    tag('SOLA FINA DEMAIS', 540, 1010, (t - sf - 0.1) / 0.3, '#d8262c');
  }
  vignette(main, 0.25);
}
function sFila(t) {   // his feet: the Fila; then the product (real photo), its features, the code
  scan(0); const em = W0('emborrachada', 'fila') - 0.25;
  const pz = pedZ(t);
  if (t < em) {   // tracking shot of him running + a close-up insert of his Fila (thick rubber sole)
    setCam([PX - 0.2, 1.5, pz - 6.5], [PX - 0.2, 1.0, pz + 1]); draw3D(); people(fieldCrowd(t, { noGirl: true }));
    const fi = W0('fila', 'fila') - 0.2, k = clamp((t - fi) / 0.25);
    if (k > 0) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = k; main.fillStyle = 'rgba(6,8,20,0.8)'; main.beginPath(); main.arc(540, 640, 260 * popS(k, 1), 0, 7); main.fill(); main.lineWidth = 10; main.strokeStyle = '#ffd23f'; main.stroke(); main.restore();
      const pg = g; g = main; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(520, 720); main.scale(2.8 * popS(k, 1), 2.8 * popS(k, 1)); main.rotate(-0.12 + Math.sin(t * 3) * 0.03); sneaker(0, 0, 1, 'fila'); main.restore(); g = pg;
      for (let i = 0; i < 4; i++) { const a2 = t * 2 + i * 1.6; textOut('✦', 540 + Math.cos(a2) * 200, 640 + Math.sin(a2) * 170, 40, '#fff6c0', { a: 0.5 + 0.5 * Math.sin(t * 6 + i) }); }
      tag('FILA', 540, 930, (t - fi - 0.1) / 0.25, '#1c1c22'); }
    vignette(main, 0.25); return;
  }
  // product showcase over the blurred field
  setCam([0.3, 1.8, pz - 7.5], [0, 1.0, pz + 1]); draw3D(); people(fieldCrowd(t)); blurAll(16); fade(0.45, '6,8,24');
  const a = clamp((t - em) / 0.3); shoeShowcase(t, a, 540, 560, 880);
  const T = [['emborrachada', 'SOLA EMBORRACHADA', 290, 880], ['grossura', '+3 CM DE SOLA', 790, 880], ['amortecendo', 'AMORTECE O PASSO', 290, 985], ['firmeza', 'FIRMEZA NO PÉ', 790, 985]];
  for (const [w, txt, x, y] of T) { const tw = W0(w, 'fila'); tag(txt, x, y, (t - tw + 0.1) / 0.25, '#7b3fe4'); }
  const gro = W0('grossura', 'fila'); if (t > gro) {   // a little "3 cm" bracket on the sole of the photo
    const k = clamp((t - gro) / 0.3); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = k; main.strokeStyle = '#ffd23f'; main.lineWidth = 8; main.lineCap = 'round';
    const x = 980, y0 = 600, y1 = 735; main.beginPath(); main.moveTo(x - 20, y0); main.lineTo(x, y0); main.lineTo(x, y1); main.lineTo(x - 20, y1); main.stroke(); main.restore(); textOut('3 CM+', 960, 520, 50, '#ffd23f', { a: k }); }
  codeCard(1230, clamp((t - em - 0.3) / 0.3), popS(t - em - 0.3, 0.3));
}
function sTurn(t) {   // she turns (eyes glowing), he freezes mid-stride, firm
  const pa = W0('parou', 'turn');
  if (t < pa - 0.05) { setCam([0.6, 1.4, DOLLZ + 34], [0, 10, DOLLZ]); scan(dollTurn(t) > 0.9 ? 1 : 0, 0, -18); draw3D(); drawDoll(t); vignette(main, 0.25); return; }
  const pz = pedZ(t); scan(1, PX + Math.sin(t * 1.6) * 3, pz);
  setCam([PX - 0.2, 1.5, pz - 3.6], [PX, 1.05, pz + 1]); draw3D();
  people(fieldCrowd(t)); scanSweep(t, 1); vignette(main, 0.25);
}
function sRug(t) {   // the girl, flat on the ground, totally still: it counts
  const gz = girlZ(t); scan(1, GX + Math.sin(t * 1.3) * 2.5, gz);
  setCam([GX + 1.0, 2.4, gz - 4.4], [GX + 0.8, 0.3, gz]); draw3D();
  people(fieldCrowd(t)); scanSweep(t + 1, 0.8); vignette(main, 0.25);
}
function sFinish(t) {   // the doll turns away, the last count: he runs and crosses the finish line
  scan(0);
  if (t < TL.away2 + 0.7) { setCam([0.6, 1.4, DOLLZ + 34], [0, 10, DOLLZ]); draw3D(); drawDoll(t); vignette(main, 0.25); return; }
  setCam([1.2, 1.3, FINISH - 4.5], [0, 1.0, FINISH + 4]); draw3D();
  people(fieldCrowd(t)); confetti(t, TL.cross + 0.1); vignette(main, 0.25);
}
function sLesson(t) {   // past the line: thumbs up; the two "rules"
  scan(0); const pz = pedZ(t); setCam([PX + 0.3, 1.5, pz - 3.6], [PX, 1.2, pz]); draw3D();
  people([{ x: PX, z: pz, ry: Math.PI, who: 'ped', o: { shoes: 'fila', mouth: 'grin', armRk: 'thumb', look: [0, -0.1] } }]);
  const m = W0('mexer', 'lesson'), te = W0('tênis', 'lesson');
  tag('1. NÃO SE MEXA', 540, 330, (t - m + 0.1) / 0.3, '#d8262c'); tag('2. TÊNIS QUE NÃO ESCORREGA', 540, 440, (t - te + 0.1) / 0.3, '#1fae5a');
  vignette(main, 0.25);
}
function sCta(t) {
  scan(0); setCam([0.6, 4, 8], [0, 2, -30]); draw3D(); drawDoll(t); fade(0.55, '6,8,24');
  const c0 = T0('cta'), Q = W0('qual', 'cta') - 0.6;
  shoeShowcase(t, clamp((t - c0) / 0.3) * (1 - ss(Q - 0.2, Q + 0.1, t)), 540, 560, 820);
  codeCard(t < Q ? 1000 : 1240, 1, popS(t - c0, 0.3));
  if (t > Q) { textOut('QUAL É O PRÓXIMO JOGO?', 540, 520, 80, '#ffd23f', { s: popS(t - Q, 0.3) });
    const tc = W0('comenta', 'cta'); if (t > tc - 0.2) textOut('COMENTA AÍ! ↓', 540, 760, 84, '#ffffff', { a: ss(tc - 0.2, tc, t), s: popS(t - tc + 0.2, 0.3) }); }
}
// ---------- the ACERTOU! stamps ----------
const STAMPS = [[TL.ok[0], 'ACERTO Nº 1'], [TL.ok[1], 'ACERTO Nº 2']];
function stamps(t) {
  for (const [t0, sub] of STAMPS) {
    const k = t - t0; if (k < 0 || k > 1.2) continue; const col = '#1fb84f', txt = 'ACERTOU!';
    const s = k < 0.12 ? lerp(1.6, 1, ease(k / 0.12)) : 1, a = (k < 0.12 ? k / 0.12 : 1) * (1 - ss(0.9, 1.2, k));
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 620); main.rotate(-0.12); main.scale(s, s);
    main.font = '900 140px "Inter Display", Inter'; const w = main.measureText(txt).width + 110;
    main.fillStyle = 'rgba(255,255,255,0.85)'; main.beginPath(); main.roundRect(-w / 2, -125, w, 250, 30); main.fill();
    main.lineWidth = 16; main.strokeStyle = col; main.beginPath(); main.roundRect(-w / 2, -125, w, 250, 30); main.stroke(); main.lineWidth = 6; main.beginPath(); main.roundRect(-w / 2 + 22, -103, w - 44, 206, 18); main.stroke();
    main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillStyle = col; main.fillText(txt, 0, -28); main.font = '900 56px "Inter Display", Inter'; main.fillText(sub, 0, 88);
    main.restore(); if (k < 0.18) fade(0.25 * (1 - k / 0.18), '60,255,120');
  }
}
function hook(t) {
  const tw = WORDS.filter(w => w.seg === 'title'); if (!tw.length) return;
  titleFX(t, tw[0].t0 - 0.3, tw[tw.length - 1].t1 - 0.05, [{ txt: 'COMO SOBREVIVER', size: 96, colors: ['#ffffff', '#d9e4ff'] }, { txt: 'À BATATINHA FRITA', size: 104, colors: ['#ffe27a', '#f0a020'] }, { txt: '1, 2, 3', size: 130, colors: ['#ff8a8a', '#d01e2a'] }], 420);
}
const SCENES = { title: sTitle, street: sStreet, dorm: sDorm, told: sTold, game1: sGame1, rule: sRule, girl: sGirl, fila: sFila, turn: sTurn, rug: sRug, finish: sFinish, lesson: sLesson, cta: sCta };
const SHK = mk();
function frame(t) {
  hideAll(); HEMI.intensity = 1.6; moon.intensity = 2.6; sunAt(0, -15);
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over'; main.filter = 'none';
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t); if (sg.scene === 'title') titleZoom(t); if (!RENDERED) render3D();
  stamps(t);
  for (const n of ['street', 'dorm', 'game1']) { const c = T0(n); fade(1 - ss(0, 0.25, Math.abs(t - c))); }
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
