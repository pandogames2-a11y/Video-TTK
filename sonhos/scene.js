// EP7 animation (2D canvas): the dream man. Uses art.js + dream.js + titlefx.js. window.renderFrame(t) draws the frame at time t.
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


// ---------- staging ----------
function beans(cam, list) { characters(cam, () => list.forEach(([x, y, s, r]) => feijao(x, y, s, r)), 'rgba(0,0,0,0)', 0.3); }
const CHAIR = { x: 700, y: RF };
function chair(tilt = 0) { g.save(); g.translate(CHAIR.x, CHAIR.y); rect(-100, -300, 200, 40, '#2a2a34', 10, 5); line([0, -260, 0, -40], 12, '#22222a'); line([-80, -30, 80, -30], 10, '#22222a'); g.rotate(tilt); rect(-80, -560, 160, 260, '#c0392b', 30, 6); g.restore(); }
function room(t, cam, o = {}) {
  g = main; camera(cam); bedroom2(t, o);
  nightGrade(main, 1);
  lightPool(main, cam, 690, RF - 500, 600, 'rgba(120,220,255,A)', 0.5 * (o.screen === 'off' ? 0 : 1));
  beans(cam, [[690, RF - 648, 0.75, 0.1], [1440, 612, 0.75, -0.1]]);   // hidden beans #1 (on top of the monitor) and #2 (on the shelf)
}
function seated(t, o = {}) {   // Pedrinho in the gamer chair with the controller
  const tap = o.asleep ? 0 : Math.abs(Math.sin(t * 9)) * 6;
  chair();
  bean(CHAIR.x, RF - 280, { sit: true, s: 0.8, look: o.look || [0, -0.4], blink: o.asleep ? 1 : 0, mouth: o.mouth, tilt: o.tilt || 0, sweat: o.sweat, extra: o.extra,
    armL: [-120, -170, -60, -120 + tap], armR: [120, -170, 60, -120] });
  controller(CHAIR.x, RF - 280 - 120 * 0.8 + tap * 0.3 + (o.asleep ? 30 : 0), 0.6, o.asleep ? 0.4 : 0);
}
function controller(x, y, s = 1, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); shape('#22232a', () => { g.moveTo(-60, -20); g.quadraticCurveTo(0, -36, 60, -20); g.quadraticCurveTo(80, 30, 50, 30); g.quadraticCurveTo(0, 6, -50, 30); g.quadraticCurveTo(-80, 30, -60, -20); g.closePath(); }, 5); ell(30, -8, 6, 6, '#3ad0ff', 0, 0); g.restore(); }
function sTitle(t) {
  const cam = camL({ x: 760, y: 1000, z: 0.72 }, { x: 760, y: 1050, z: 0.85 }, ease(clamp(t / TE('title'))));
  room(t, cam); characters(cam, () => seated(t)); vignette(main, 0.6);
}
function sRule(t) {   // the legend, as a dark storybook page: sleepers in bed; only the one who said the name gets the hat shadow
  main.setTransform(1, 0, 0, 1, 0, 0); const bg = main.createRadialGradient(540, 900, 50, 540, 900, 1100); bg.addColorStop(0, '#2a1a24'); bg.addColorStop(1, '#07060e'); main.fillStyle = bg; main.fillRect(0, 0, SW, SH);
  const c0 = T0('rule'), tS = W0('fala', 'rule'), k = ss(tS, tS + 0.8, t);
  g = main; g.save();
  for (let i = 0; i < 3; i++) { const x = 220 + i * 320, y = 1150;
    rect(x - 130, y - 40, 260, 90, '#6b4630', 14, 6); rect(x - 120, y - 70, 240, 60, '#c9d4e6', 20, 5); bean(x - 40, y - 30, { s: 0.42, blink: 1, look: [0, 0] }); shape('#3a6fb0', () => { g.moveTo(x - 70, y - 70); g.lineTo(x + 120, y - 70); g.lineTo(x + 120, y - 10); g.lineTo(x - 70, y - 10); g.closePath(); }, 5);
    if (i === 1 && t > tS - 0.3) { g.strokeStyle = 'rgba(255,220,150,0.9)'; g.lineWidth = 6; for (let j = 0; j < 3; j++) { const p = ((t - tS) * 1.5 + j / 3) % 1; g.globalAlpha = 1 - p; g.beginPath(); g.arc(x - 40, y - 120, 40 + p * 90, -2.4, -0.7); g.stroke(); } g.globalAlpha = 1; } }
  if (k > 0) { g.globalAlpha = 0.85 * k; g.fillStyle = '#05030a'; const x = 540, y = lerp(500, 900, k);   // the hat-and-claws shadow over the middle bed
    g.beginPath(); g.ellipse(x, y, 230, 40, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 130, y); g.quadraticCurveTo(x - 130, y - 150, x, y - 140); g.quadraticCurveTo(x + 130, y - 150, x + 130, y); g.fill();
    g.beginPath(); g.ellipse(x, y + 160, 120, 160, 0, 0, 7); g.fill(); for (let j = 0; j < 4; j++) { g.save(); g.translate(x + 150, y + 120); g.rotate(-0.6 + j * 0.25); g.fillRect(-4, -150, 8, 150); g.restore(); } g.globalAlpha = 1; }
  g.restore(); vignette(main, 0.6);
}
function diaryUI(x, y, a, t) {   // an old diary page with a scribbled-out name and a price tag from the thrift shop
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(x, y); main.rotate(-0.06); main.scale(popS(a, 1), popS(a, 1));
  main.fillStyle = '#e8dcbc'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath(); main.roundRect(-230, -160, 460, 320, 14); main.fill(); main.stroke();
  main.strokeStyle = '#b8a88a'; main.lineWidth = 3; for (let i = 0; i < 6; i++) { main.beginPath(); main.moveTo(-200, -110 + i * 45); main.lineTo(200, -110 + i * 45); main.stroke(); }
  main.strokeStyle = '#2a1a14'; main.lineWidth = 10; main.beginPath(); for (let i = 0; i < 14; i++) main.lineTo(-150 + i * 22, -20 + (i % 2 ? -20 : 20)); main.stroke();   // the scribbled name
  main.fillStyle = '#c62828'; main.beginPath(); main.roundRect(110, 90, 120, 56, 8); main.fill(); main.fillStyle = '#fff'; main.font = '900 34px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('R$ 2', 170, 119);
  main.restore();
}
function sDiary(t) {   // he reads the name out loud three times, filming himself with the phone
  const N = TL.name, tG = W0('gravar', 'diary');
  const cam = camL({ x: 760, y: 1050, z: 0.95 }, { x: 760, y: 1000, z: 1.15 }, ss(T0('diary'), TE('diary'), t));
  room(t, cam, { chair: false });
  const pulses = [0, 1, 2].map(j => t - (N + 0.8 + j * 0.55));
  for (const p of pulses) if (p > 0 && p < 0.4) fade(0.25 * (1 - p / 0.4), '255,40,30');   // the room flashes red each time
  characters(cam, () => {
    rect(1000, RF - 260, 16, 260, '#2a2a30', 4, 4); rect(960, RF - 330, 96, 70, '#1c1c22', 8, 4); ell(1040, RF - 316, 7, 7, t % 1 < 0.5 ? '#e0241c' : '#5a1a14', 0, 0);   // phone on a tripod, recording
    const reading = t > N - 0.2;
    bean(700, RF + 20, { s: 0.85, look: reading ? [0, 0.5] : [0.5, 0], mouth: pulses.some(p => p > 0 && p < 0.35) ? 'o' : undefined, armL: [-120, -230, -40, -110], armR: [120, -230, 40, -110] });
    rect(640, RF - 125, 120, 80, '#5a3220', 8, 5);   // the diary in his hands
  });
  for (const p of pulses) if (p > 0 && p < 0.6) { const [x, y] = screenOf(cam, 700, RF - 220); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.strokeStyle = 'rgba(255,200,120,0.9)'; main.lineWidth = 8; main.globalAlpha = 1 - p / 0.6; main.beginPath(); main.arc(x, y - 40, 60 + p * 300, -2.6, -0.5); main.stroke(); main.restore(); }
  if (t > W0('diário', 'diary') - 0.2 && t < N + 2.4) diaryUI(540, 560, ss(W0('diário', 'diary') - 0.2, W0('diário', 'diary') + 0.1, t) * (1 - ss(N + 2.0, N + 2.4, t)), t);
  vignette(main, 0.6);
}
function sAwake(t) {   // three energy drinks, gaming till 4 a.m.
  const C = W0('energ', 'awake'), cans = clamp(Math.floor((t - C + 0.5) / 0.45) + 1, 0, 3), hour = Math.min(4, 1 + Math.floor((t - T0('awake')) / ((TE('awake') - T0('awake')) / 4)));
  const cam = { x: 740, y: 1000, z: 1.05 };
  room(t, cam, { cans, clock: `0${hour}:00` });
  characters(cam, () => seated(t, { look: [0, -0.4], sweat: t > C, extra: undefined, mouth: t > C && t < C + 1.4 ? 'o' : undefined, tilt: Math.sin(t * 30) * 0.01 * (t > C ? 1 : 0) }));
  vignette(main, 0.6);
}
function sSleep(t) {   // nods off in the chair, the controller slips; a slow push in
  const D = W0('dormiu', 'sleep'), z = ss(D, TE('sleep'), t);
  const cam = camL({ x: 740, y: 1000, z: 1.05 }, { x: 700, y: RF - 420, z: 2.4 }, ease(z));
  room(t, cam, { cans: 3, clock: '04:00', screen: 'menu' });
  characters(cam, () => seated(t, { asleep: t > D, tilt: t > D ? 0.25 * ss(D, D + 0.6, t) : 0, mouth: t > D ? 'o' : undefined }));
  fade(ss(TE('sleep') - 0.5, TE('sleep'), t), '40,5,10');
  vignette(main, 0.65);
}
function clawMarks(cam, k) {   // fresh scratch marks on the wall with sparks
  const n = Math.floor(clamp(k) * 4); for (let i = 0; i < n; i++) { g = main; camera(cam); line([300 + i * 40, 700, 420 + i * 40, 1100], 8, '#f2c080'); line([300 + i * 40, 700, 420 + i * 40, 1100], 3, '#fff6d8'); }
  if (k > 0 && k < 1) { const [x, y] = screenOf(cam, 300 + n * 40 + 60, lerp(700, 1100, (k * 4) % 1)); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#ffd27a'; for (let i = 0; i < 6; i++) { main.beginPath(); main.arc(x + Math.cos(i * 1.7 + k * 30) * 30, y + Math.sin(i * 2.3 + k * 30) * 30, 4, 0, 7); main.fill(); } main.restore(); }
}
function dreamRoom(t, cam) { g = main; camera(cam); dreamHall(t); nightGrade(main, 0.55); lightPool(main, cam, 700, 900, 800, 'rgba(255,80,40,A)', 0.35); beans(cam, [[200, 112, 0.8, 0.1]]); }   // hidden bean #3 (on a pipe in the dream)
function sDream(t) {
  const S = TL.scr, k = clamp((t - S) / 2.4);
  const cam = camL({ x: 600, y: 1000, z: 1.0 }, { x: 520, y: 950, z: 1.1 }, ss(T0('dream'), TE('dream'), t));
  dreamRoom(t, cam); clawMarks(cam, k);
  characters(cam, () => { bean(800, RF + 60, { s: 0.85, look: t > S ? [-1, -0.2] : [0.3, -0.3], mouth: 'o' }); if (t > S - 0.2) { g.save(); g.beginPath(); g.rect(-1000, -1000, 1280, 3000); g.clip(); dreamer(160 + Math.sin(t * 3) * 10, RF + 60, { s: 1.2, look: [1, 0], armR: [180, -230] }); g.restore(); } }, 'rgba(255,170,120,0.9)', 0.2);
  rect(-100, 0, 0, 0, '#000', 0, 0);
  vignette(main, 0.7);
}
function sHello(t) {   // he walks over and waves hi
  const D = TL.err[1], walk = ease(clamp((t - W0('foi', 'hello')) / (D - W0('foi', 'hello') + 0.2)));
  const cam = { x: 560, y: 980, z: 1.05 };
  dreamRoom(t, cam); clawMarks(cam, 1);
  characters(cam, () => { dreamer(320, RF + 60, { s: 1.2, look: [1, 0], armR: [180, -260 - (t > D ? 80 : 0)] }); bean(lerp(800, 610, walk), RF + 60, { s: 0.85, look: [-1, 0], walk: walk > 0 && walk < 1 ? 0.8 : 0, phase: t * 10, armR: t > D - 0.3 ? [120, -260, 170 + Math.sin(t * 14) * 30, -380] : undefined }); }, 'rgba(255,170,120,0.9)', 0.2);
  vignette(main, 0.7);
}
function sPinch(t) {   // he pinches the dream man's cheek... and the claws come down
  const B = TL.err[2], SL = TL.slash, pinch = t > B - 0.2 && t < B + 0.6;
  const shake = t > B + 0.4 && t < SL ? 6 : 0;
  const cam = { x: 480 + Math.sin(t * 60) * shake, y: 900, z: 1.3 };
  dreamRoom(t, cam); clawMarks(cam, 1);
  if (t > B + 0.4) lightPool(main, cam, 320, 800, 600, 'rgba(255,30,30,A)', 0.4 * ss(B + 0.4, B + 0.7, t));
  characters(cam, () => { dreamer(320, RF + 60, { s: 1.2, look: [1, 0], armR: t > B + 0.5 ? [200, -420] : [180, -230], claw: t > B + 0.5 ? -0.3 : 0 });
    bean(610, RF + 60, { s: 0.85, look: [-1, -0.3], mouth: t > B + 0.4 ? 'o' : undefined, sweat: t > B + 0.4, armL: pinch ? [-120, -230, -300, -400] : [-120, -230, -150, -130] }); }, t > B + 0.4 ? 'rgba(255,90,90,0.95)' : 'rgba(255,170,120,0.9)', 0.2);
  if (t > SL) { const k = t - SL; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${ss(0, 0.3, k)})`; main.fillRect(0, 0, SW, SH);
    for (let j = 0; j < 3; j++) { const kk = clamp((k - j * 0.12) / 0.15); if (kk <= 0) continue; main.strokeStyle = '#d8261c'; main.lineWidth = 22; main.lineCap = 'round'; main.beginPath(); const x0 = 260 + j * 200; main.moveTo(x0, 450); main.lineTo(lerp(x0, x0 + 360, kk), lerp(450, 1250, kk)); main.stroke(); }
    main.restore(); }
  vignette(main, 0.7);
}
function sEnd(t) {   // asleep forever, with a nightcap and a blanket, peacefully
  const cam = camL({ x: 700, y: RF - 420, z: 1.9 }, { x: 700, y: RF - 400, z: 2.1 }, ss(T0('end'), TE('end'), t));
  room(t, cam, { cans: 3, clock: '04:00', screen: 'menu' });
  characters(cam, () => { seated(t, { asleep: true, tilt: 0.25, extra: (by) => { shape('#3a6fb0', () => { g.moveTo(-100, by - 110); g.quadraticCurveTo(0, by - 220, 150, by - 240); g.quadraticCurveTo(80, by - 160, 100, by - 110); g.closePath(); }, 6); ell(150, by - 240, 22, 22, '#ffffff', 0, 4); } });
    shape('#8a5ad6', () => { g.moveTo(560, RF - 300); g.quadraticCurveTo(700, RF - 340, 840, RF - 300); g.lineTo(820, RF - 150); g.lineTo(580, RF - 150); g.closePath(); }, 6); });
  for (let i = 0; i < 3; i++) { const p = ((t * 0.4 + i / 3) % 1); const [x, y] = screenOf(cam, 760 + p * 120, RF - 560 - p * 200); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = Math.sin(p * Math.PI); main.fillStyle = '#fff3c4'; main.translate(x, y); main.rotate(p * 2); main.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 10 : 26, a = j / 10 * Math.PI * 2; main.lineTo(Math.cos(a) * r, Math.sin(a) * r); } main.fill(); main.restore(); }   // little stars over his head
  vignette(main, 0.6);
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

function hook(t) {
  const tw = WORDS.filter(w => w.seg === 'title');
  titleFX(t, tw[0].t0 - 0.3, tw[tw.length - 1].t1 - 0.05, [{ txt: 'VOCÊ SOBREVIVERIA', size: 92, colors: ['#ffffff', '#d9e4ff'] }, { txt: 'AO HOMEM', size: 116, colors: ['#ff8a5a', '#c81e1e'] }, { txt: 'DOS SONHOS?', size: 116, colors: ['#7ddf7d', '#1e8a3a'] }]);
}
const SCENES = { title: sTitle, rule: sRule, diary: sDiary, awake: sAwake, sleep: sSleep, dream: sDream, hello: sHello, pinch: sPinch, end: sEnd, cta: sOutro, feijoes: sOutro };
const SHK = mk();
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH);
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t);
  const sh = shakeAmt(t);
  if (sh > 0) { const c = SHK.getContext('2d'); c.clearRect(0, 0, SW, SH); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.drawImage(SHK, Math.sin(t * 90) * sh, Math.cos(t * 77) * sh); }
  stamps(t);
  for (const n of ['rule', 'diary', 'dream', 'end', 'cta']) { const c = T0(n); fade(1 - ss(0, 0.3, Math.abs(t - c))); }
  fade(ss(TL.total - 0.6, TL.total, t)); fade(1 - ss(0, 0.5, t));
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
