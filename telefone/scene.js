// EP7 animation (2D canvas): the phone killer. Uses art.js (house) + phone.js + titlefx.js. window.renderFrame(t) draws the frame at time t.
const TL = await (await fetch('timeline.json')).json();
const WORDS = await (await fetch('audio/words.json')).json();
const SEG = n => TL.segs.find(s => s.scene === n);
const T0 = n => SEG(n).start, TE = n => SEG(n).start + SEG(n).dur;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const camL = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
const W0 = (pre, seg) => { const w = WORDS.find(w => w.seg === seg && w.text.toLowerCase().startsWith(pre)); if (!w) console.log('palavra não achada', pre, seg); return w ? w.t0 : 0; };
function screenOf(cam, wx, wy) { return [SW / 2 + (wx - cam.x) * cam.z, SH / 2 + (wy - cam.y) * cam.z]; }
function textOut(str, x, y, size, fill, opt = {}) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); if (opt.rot) main.rotate(opt.rot); if (opt.s) main.scale(opt.s, opt.s); main.globalAlpha = opt.a ?? 1; main.textAlign = opt.align || 'center'; main.textBaseline = 'middle'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(str, 0, 0); main.fillStyle = fill; main.fillText(str, 0, 0); main.restore(); }
const popS = (k, d = 0.25) => { const x = clamp(k / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; };
function fade(a, col = '0,0,0') { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(${col},${a})`; main.fillRect(0, 0, SW, SH); main.restore(); }
const STAMPS = [[TL.err[0], 'ERRADO!', '#d8261c', 'ERRO Nº 1'], [TL.err[1], 'ERRADO!', '#d8261c', 'ERRO Nº 2'], [TL.err[2], 'ERRADO!', '#d8261c', 'ÚLTIMO ERRO']];
function stamps(t) {
  for (const [t0, txt, col, sub] of STAMPS) {
    const k = t - t0; if (k < 0 || k > 1.6) continue;
    const s = k < 0.12 ? lerp(1.6, 1, ease(k / 0.12)) : 1 + 0.02 * Math.sin(Math.min(k, 0.4) * 30) * (1 - clamp(k / 0.4));
    const a = (k < 0.12 ? k / 0.12 : 1) * (1 - ss(1.3, 1.6, k));
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 620); main.rotate(-0.16); main.scale(s, s);
    main.font = '900 150px "Inter Display", Inter'; const w = main.measureText(txt).width + 110;
    main.lineWidth = 16; main.strokeStyle = col; main.beginPath(); main.roundRect(-w / 2, -125, w, 250, 30); main.stroke();
    main.lineWidth = 6; main.beginPath(); main.roundRect(-w / 2 + 22, -103, w - 44, 206, 18); main.stroke();
    main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillStyle = col; main.fillText(txt, 0, -28);
    main.font = '900 56px "Inter Display", Inter'; main.fillText(sub, 0, 88);
    // worn ink: little gaps in the stamp
    main.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 40; i++) { const x = ((i * 137.7) % w) - w / 2, y = ((i * 71.3) % 230) - 115; main.beginPath(); main.arc(x, y, 2 + (i % 4), 0, 7); main.fill(); }
    main.restore();
    if (k < 0.18) fade(0.3 * (1 - k / 0.18), col === '#22a447' ? '40,200,90' : '255,40,30');
  }
}
function shakeAmt(t) { let a = 0; for (const [t0] of STAMPS) { const k = t - t0; if (k >= 0.08 && k < 0.45) a = Math.max(a, 16 * (1 - (k - 0.08) / 0.37)); } return a; }

// ---------- staging (the EP5 house; floor FY) ----------
const SOFA = { x: 1010, y: FY + 20 }, BASE = { x: 597, y: FY - 190 };
function beans(cam, list) { characters(cam, () => list.forEach(([x, y, s, r]) => feijao(x, y, s, r)), 'rgba(0,0,0,0)', 0.3); }
function room(t, cam, o = {}) {
  g = main; camera(cam); house({ doorOpen: o.doorOpen });
  if (o.porch) { g.save(); g.beginPath(); g.rect(845, 365, 330, 420); g.clip(); const gr = g.createRadialGradient(1060, 760, 10, 1060, 760, 260); gr.addColorStop(0, `rgba(255,220,130,${0.8 * o.porch})`); gr.addColorStop(1, 'rgba(255,220,130,0)'); g.fillStyle = gr; g.fillRect(845, 365, 330, 420);
    if (o.killer > 0) ghost(1080, lerp(905 + 330, 905, ease(clamp(o.killer))), { s: 0.5, knife: false }); g.restore(); }
  if (o.doorOpen && o.killerDoor) { g.save(); g.beginPath(); g.rect(150, 500, 280, FY - 500); g.clip(); ghost(290, FY + 40, { s: 1.0 * o.killerDoor, armR: [150, -200] }); g.restore(); }
  if (!o.noPhone) landline(BASE.x, BASE.y, 1, 0, false);   // the red phone is always on the side table
  nightGrade(main, 1);
  const tv = 0.7 + 0.3 * Math.sin(t * 7.1) * Math.sin(t * 2.3);
  lightPool(main, cam, 1330, 840, 520, 'rgba(255,190,110,A)', 0.45);
  lightPool(main, cam, 1010, 1380, 700, 'rgba(90,170,255,A)', 0.3 * tv);
  if (o.porch) lightPool(main, cam, 1010, 640, 300, 'rgba(255,220,130,A)', 0.35 * o.porch);
  beans(cam, [[1160, 798, 0.8, -0.15], [1350, 192, 0.75, 0.1], [2190, FY - 503, 0.75, 0.2]]);   // hidden beans: window sill, top of the wall clock, on a stair step
}
function handset(x, y, rot = 0, s = 1) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); shape('#b8352e', () => { g.moveTo(-14, -60); g.quadraticCurveTo(6, 0, -14, 60); g.lineTo(6, 62); g.quadraticCurveTo(26, 0, 6, -62); g.closePath(); }, 5); ell(-6, -62, 18, 12, '#b8352e', 0.3, 4); ell(-6, 62, 18, 12, '#b8352e', -0.3, 4); g.restore(); }
function cord(x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); const n = 14; for (let i = 1; i <= n; i++) { const k = i / n, x = lerp(x1, x2, k), y = lerp(y1, y2, k) + Math.sin(k * Math.PI) * 60; g.lineTo(x + Math.sin(i * 2.4) * 8, y + Math.cos(i * 2.4) * 8); } g.lineWidth = 5; g.strokeStyle = '#7a1f1a'; g.stroke(); }
// Pedrinho on the sofa; o.call = on the phone (handset at his left ear)
function ped(t, o = {}) {
  const s = 1.05, chew = o.chew ? 0.4 + 0.4 * Math.abs(Math.sin(t * 14)) : undefined;
  const armL = o.call ? [-110, -260, -95, -330] : (o.armL || [-140, -170, -120, -130]);
  bean(SOFA.x, SOFA.y, { sit: true, s, look: o.look || [0, 0.35], mouth: o.mouth, chew: o.mouth ? undefined : chew, jy: o.jy || 0, sweat: o.sweat, armL, armR: o.armR || [140, -170, 120, -210], tilt: o.tilt });
  if (o.popcorn !== false) popcorn(895, FY - 92);
  if (o.call) { const hx = SOFA.x + armL[2] * s, hy = SOFA.y + armL[3] * s; cord(BASE.x + 40, BASE.y - 20, hx, hy + 40); handset(hx + 10, hy, 0.15, 0.9); }
}
function ringWaves(cam, wx, wy, k, col = '#ffffff') {   // the ring as a picture: arcs pulsing out of the phone
  const [x, y] = screenOf(cam, wx, wy); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.lineWidth = 8; main.lineCap = 'round';
  for (let i = 0; i < 3; i++) { const p = (k * 2 + i / 3) % 1; main.strokeStyle = col; main.globalAlpha = 1 - p; for (const sd of [-1, 1]) { main.beginPath(); main.arc(x, y, 50 + p * 160 * cam.z / 1.5, sd < 0 ? Math.PI * 0.75 : -Math.PI * 0.25, sd < 0 ? Math.PI * 1.25 : Math.PI * 0.25); main.stroke(); } }
  main.restore();
}
function callerID(cam, a) {   // a small caller-ID screen pops above the phone
  const [x, y] = screenOf(cam, BASE.x, BASE.y - 150); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(x, y); main.scale(popS(a, 1), popS(a, 1));
  main.fillStyle = '#1b2a1c'; main.strokeStyle = '#08061a'; main.lineWidth = 7; main.beginPath(); main.roundRect(-160, -50, 320, 100, 18); main.fill(); main.stroke();
  main.fillStyle = '#9dff9a'; main.font = '900 40px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('? ? ?', 0, 2); main.restore();
}
function sTitle(t) {
  const cam = camL({ x: 950, y: 1000, z: 0.74 }, { x: 980, y: 1040, z: 0.86 }, ease(clamp(t / TE('title'))));
  room(t, cam); characters(cam, () => ped(t, { chew: true })); vignette(main, 0.6);
}
function sAlone(t) {
  const cam = camL({ x: 990, y: 1060, z: 1.1 }, { x: 1000, y: 1080, z: 1.25 }, ss(T0('alone'), TE('alone'), t));
  const jump = Math.max(0, Math.sin(clamp((t - T0('alone') - 1.5) / 0.3) * Math.PI));
  room(t, cam); characters(cam, () => ped(t, { chew: jump < 0.1, jy: jump * 25, mouth: jump > 0.1 ? 'o' : undefined })); vignette(main, 0.6);
}
function sRing(t) {   // the phone rings (shakes + waves), the camera turns to it, unknown number
  const R = TL.ring, k = t - R;
  const cam = t < R + 0.2 ? { x: 1000, y: 1080, z: 1.25 } : camL({ x: 1000, y: 1080, z: 1.25 }, { x: 700, y: FY - 220, z: 1.9 }, ease(clamp((t - R - 0.2) / 0.8)));
  room(t, cam, { noPhone: true }); characters(cam, () => { landline(BASE.x, BASE.y, 1, k > 0 && (k % 2.2) < 1.6 ? t : 0); ped(t, { look: k > 0 ? [-1, 0] : [0, 0.35], mouth: k > 0 ? 'o' : undefined, chew: k <= 0 }); });
  if (k > 0 && (k % 2.2) < 1.6) ringWaves(cam, BASE.x, BASE.y - 40, k);
  const tN = W0('número', 'ring'); if (t > tN - 0.2) callerID(cam, ss(tN - 0.2, tN + 0.1, t));
  vignette(main, 0.6);
}
function sAnswer(t) {
  const cam = { x: 840, y: 1060, z: 1.25 }, A = TL.ans, up = t > A;
  room(t, cam, { noPhone: true }); characters(cam, () => { landline(BASE.x, BASE.y, 1, !up ? t : 0, up); ped(t, { call: up, look: up ? [-0.3, 0] : [-1, 0], popcorn: true }); });
  if (!up) ringWaves(cam, BASE.x, BASE.y - 40, t - TL.ring);
  vignette(main, 0.6);
}
function breathWaves(cam, k) {   // breathing through the phone as soft wavy lines from the handset
  const hx = SOFA.x - 95 * 1.05, hy = SOFA.y - 330 * 1.05; const [x, y] = screenOf(cam, hx, hy);
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.strokeStyle = 'rgba(200,220,255,0.7)'; main.lineWidth = 6;
  for (let i = 0; i < 3; i++) { const p = (k * 0.9 + i / 3) % 1; main.globalAlpha = Math.sin(p * Math.PI); main.beginPath(); for (let j = 0; j <= 20; j++) { const xx = x - 60 - p * 200 - j * 6, yy = y - 40 + i * 30 + Math.sin(j * 0.8 + k * 6) * 8; j ? main.lineTo(xx, yy) : main.moveTo(xx, yy); } main.stroke(); }
  main.restore();
}
function movieBubble(cam, a) {   // "what's your favorite horror movie?" shown as a picture: a speech bubble from the phone with a clapperboard and a "?"
  const [x, y] = screenOf(cam, SOFA.x - 300, SOFA.y - 620); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(x, y); main.scale(popS(a, 1), popS(a, 1));
  main.fillStyle = '#fff'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath(); main.roundRect(-150, -100, 300, 200, 60); main.fill(); main.stroke();
  main.beginPath(); main.moveTo(60, 95); main.lineTo(120, 170); main.lineTo(10, 98); main.fill(); main.stroke();
  main.fillStyle = '#22232a'; main.fillRect(-100, -30, 120, 80); main.save(); main.translate(-100, -30); main.rotate(-0.3); main.fillRect(0, -30, 120, 26); main.fillStyle = '#fff'; for (let i = 0; i < 4; i++) main.fillRect(10 + i * 28, -28, 12, 22); main.restore();
  main.fillStyle = '#d8261c'; main.font = '900 110px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('?', 85, 10); main.restore();
}
function sQuestion(t) {
  const cam = camL({ x: 840, y: 1060, z: 1.25 }, { x: 900, y: 1000, z: 1.1 }, ss(T0('question'), TE('question'), t));
  room(t, cam, { noPhone: true }); characters(cam, () => { landline(BASE.x, BASE.y, 1, 0, true); ped(t, { call: true, look: [-0.3, 0] }); });
  breathWaves(cam, t); const tF = W0('filme', 'question'); if (t > tF - 0.3) movieBubble(cam, ss(tF - 0.3, tF, t));
  vignette(main, 0.6);
}
function sExplain(t) {   // he talks for twenty minutes, all excited; time flies
  const E = TL.err[0], c0 = T0('explain'), late = t > c0 + 1.0;
  const cam = { x: 900, y: 1000, z: 1.1 };
  room(t, cam, { noPhone: true }); characters(cam, () => { landline(BASE.x, BASE.y, 1, 0, true);
    const w = Math.sin(t * 8); ped(t, { call: true, look: [0.3, -0.3], mouth: Math.sin(t * 13) > 0 ? 'o' : undefined, armR: [140, -230, 170 + w * 40, -300 + w * 50], popcorn: !late }); });
  if (late) { const [x, y] = screenOf(cam, 1350, 250); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.strokeStyle = '#ffd23f'; main.lineWidth = 8; main.globalAlpha = 0.8; main.beginPath(); main.arc(x, y, 70, (t - c0) * 12, (t - c0) * 12 + 1.2); main.stroke(); main.restore(); }
  if (t > c0 + 1.0 && t < TE('explain')) textOut('20 MINUTOS DEPOIS…', 540, 520, 80, '#ffffff', { a: ss(c0 + 1.0, c0 + 1.3, t) * (1 - ss(TE('explain') - 0.4, TE('explain'), t)) });
  vignette(main, 0.6);
}
function sAlone2(t) {   // "tô sim, pode vir!" with a thumbs up
  const P = TL.err[1], open = t > P - 0.5;
  const cam = camL({ x: 900, y: 1000, z: 1.1 }, { x: 960, y: 980, z: 1.3 }, ss(T0('alone2'), TE('alone2'), t));
  room(t, cam, { noPhone: true }); characters(cam, () => { landline(BASE.x, BASE.y, 1, 0, true); ped(t, { call: true, look: [0.2, -0.2], popcorn: false, armR: open ? [140, -260, 200, -380] : [140, -170, 120, -210], mouth: open ? 'o' : undefined }); });
  vignette(main, 0.6);
}
function sPorch(t) {   // the porch light comes on; someone with a mask in the yard (through the window)
  const L = TL.light, M = W0('máscara', 'porch'), on = ss(L + 0.25, L + 0.35, t);
  const cam = camL({ x: 1010, y: 820, z: 1.2 }, { x: 1010, y: 700, z: 1.55 }, ease(clamp((t - T0('porch')) / 2.5)));
  room(t, cam, { porch: on, killer: (t - (M - 0.6)) / 0.9 });
  characters(cam, () => ped(t, { popcorn: false, look: t > M + 0.2 ? [0.3, -1] : [0, 0.2], mouth: t > M + 0.2 ? 'o' : undefined, sweat: t > M + 0.2 }));
  vignette(main, 0.65);
}
function sStairs(t) {   // he runs UP the stairs instead of out the front door; the front door opens behind him
  const S = TL.err[2], D = TL.doorin;
  const runK = clamp((t - T0('stairs') - 0.2) / (S - T0('stairs') - 0.2)), climb = clamp((t - S) / 1.4);
  let px = lerp(SOFA.x, 1880, ease(runK)), py = FY + 120;
  if (climb > 0) { const steps = 9, f = climb * steps, i = Math.min(steps - 1, Math.floor(f)), k = f - i;   // one hop per step, feet landing on each step
    const x0 = 1880 + i * 62 + 40, y0 = FY - i * 100, x1 = 1880 + (i + 1) * 62 + 40, y1 = FY - (i + 1) * 100;
    px = lerp(x0, x1, k); py = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 40; }
  let cam = camL({ x: 700, y: 950, z: 0.8 }, { x: 2000, y: 800, z: 0.8 }, ease(clamp((t - T0('stairs') - 0.2) / (S + 1.2 - T0('stairs') - 0.2))));
  if (t > D - 0.15) cam = { x: 300, y: 900, z: 1.05 };   // cut to the front door opening behind him
  room(t, cam, { doorOpen: t > D, killerDoor: ss(D + 0.2, D + 0.7, t) });
  characters(cam, () => bean(px, py, { s: 0.9, look: [1, climb > 0 ? -0.6 : 0], mouth: 'o', sweat: true, walk: 1, phase: t * 16, jy: Math.abs(Math.sin(t * 16)) * 10, armL: [-120, -260, -100, -380], armR: [120, -260, 100, -380] }));
  vignette(main, 0.6);
}
function sEnd(t) {   // a VHS cover: "PEDRINHO: O FILME"
  const c0 = T0('end'), a = ss(c0, c0 + 0.4, t), z = 1 + 0.05 * ss(c0, TE('end'), t);
  main.setTransform(1, 0, 0, 1, 0, 0); const bg = main.createRadialGradient(540, 900, 50, 540, 900, 1100); bg.addColorStop(0, '#2a2440'); bg.addColorStop(1, '#07060e'); main.fillStyle = bg; main.fillRect(0, 0, SW, SH);
  g = main; g.save(); g.globalAlpha = a; g.translate(540, 900); g.scale(z, z); g.rotate(-0.03);
  rect(-330, -520, 660, 1040, '#16131e', 16, 10); rect(-300, -490, 600, 980, '#0b0a12', 10, 5);
  ghost(130, 330, { s: 1.0, armR: [170, -330] }); bean(-110, 400, { s: 1.0, look: [-0.4, -0.6], mouth: 'o', sweat: true, armL: [-120, -260, -100, -380], armR: [120, -260, 100, -380] });
  g.textAlign = 'center'; g.font = '900 96px "Inter Display", Inter'; g.lineWidth = 16; g.strokeStyle = '#08061a'; g.strokeText('PEDRINHO', 0, -380); g.fillStyle = '#ffffff'; g.fillText('PEDRINHO', 0, -380);
  g.font = '900 64px "Inter Display", Inter'; g.strokeText('O FILME', 0, -300); g.fillStyle = '#d8261c'; g.fillText('O FILME', 0, -300);
  rect(-300, 410, 600, 80, '#d8261c', 0, 0); g.font = '900 40px "Inter Display", Inter'; g.fillStyle = '#fff'; g.fillText('BASEADO EM FATOS REAIS', 0, 462);
  g.restore();
}

function sOutro(t) {   // who's next? + the 3 hidden beans
  const CTA = T0('cta'), F = T0('feijoes');
  main.setTransform(1, 0, 0, 1, 0, 0); const bg = main.createRadialGradient(540, 900, 50, 540, 900, 1100); bg.addColorStop(0, '#2a2440'); bg.addColorStop(1, '#07060e'); main.fillStyle = bg; main.fillRect(0, 0, SW, SH);
  if (t < F) {
    const k = t - CTA; textOut('QUEM É O PRÓXIMO?', 540, 520, 92, '#ffd23f', { s: popS(k, 0.3) });
    for (let i = 0; i < 3; i++) { const kk = clamp((k - 0.25 - i * 0.12) / 0.25); if (kk <= 0) continue; const x = 300 + i * 240, y = 980;
      main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.scale(popS(kk * 0.3), popS(kk * 0.3)); main.fillStyle = '#0d0b16'; main.strokeStyle = '#7f6fb0'; main.lineWidth = 6;
      main.beginPath(); main.ellipse(0, -60, 80, 100, 0, 0, 7); main.fill(); main.stroke(); main.beginPath(); main.roundRect(-90, 40, 180, 200, 60); main.fill(); main.stroke(); main.restore();
      textOut('?', x, y - 60, 110, '#ffffff', { s: popS(kk * 0.3) }); }
  } else {
    const k = t - F; const lay = mk(); g = lay.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.translate(540, 900); g.scale(popS(k, 0.35) * 5, popS(k, 0.35) * 5); feijao(0, 0, 1, Math.sin(t * 3) * 0.12); g = main;
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(lay, 0, 0); main.restore();
    textOut('VIU OS 3 FEIJÕES?', 540, 560, 90, '#ffd23f', { s: popS(k - 0.2, 0.3), a: ss(F + 0.2, F + 0.4, t) });
    const tc = W0('comenta', 'feijoes'); textOut('COMENTA AÍ! ↓', 540, 1260, 84, '#ffffff', { a: ss(tc - 0.2, tc, t), s: popS(t - tc + 0.2, 0.3) });
  }
}
function hook(t) {   // the opening question (see titlefx.js)
  const tw = WORDS.filter(w => w.seg === 'title');
  titleFX(t, tw[0].t0 - 0.3, tw[tw.length - 1].t1 - 0.05, [{ txt: 'VOCÊ SOBREVIVERIA', size: 92, colors: ['#ffffff', '#d9e4ff'] }, { txt: 'AO ASSASSINO', size: 112, colors: ['#ffffff', '#b9c2d8'] }, { txt: 'DO TELEFONE?', size: 112, colors: ['#ff8a8a', '#d01e2a'] }]);
}
const SCENES = { title: sTitle, alone: sAlone, ring: sRing, answer: sAnswer, question: sQuestion, explain: sExplain, alone2: sAlone2, porch: sPorch, stairs: sStairs, end: sEnd, cta: sOutro, feijoes: sOutro };
const SHK = mk();
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH);
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t);
  const sh = shakeAmt(t);
  if (sh > 0) { const c = SHK.getContext('2d'); c.clearRect(0, 0, SW, SH); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.drawImage(SHK, Math.sin(t * 90) * sh, Math.cos(t * 77) * sh); }
  stamps(t);
  for (const n of ['porch', 'end', 'cta']) { const c = T0(n); fade(1 - ss(0, 0.3, Math.abs(t - c))); }
  fade(ss(TL.total - 0.6, TL.total, t)); fade(1 - ss(0, 0.5, t));
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
