// EP7 animation (2D canvas): the cursed doll at the grandparents' house. Uses art.js + grandma.js + titlefx.js. window.renderFrame(t) draws the frame at time t.
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
const CH = { x: 1350, y: HF };            // rocking chair
const DOLL0 = { x: 1350, y: HF - 230 };   // doll sitting on the chair
const PED = { x: 820, y: HF + 230 };      // Pedrinho on the rug
const DOOR = 1970;
const rockA = t => Math.sin(t * 2.2) * 0.035;
function room(t, cam, o = {}) {
  g = main; camera(cam); livingRoom(t, { rock: o.rock ?? 0, tvMode: o.tvMode, doorOpen: o.doorOpen });
  nightGrade(main, 0.9);
  const flick = o.dark || 0;
  lightPool(main, cam, 650, HF - 450, 650, 'rgba(255,170,140,A)', 0.55 * (1 - flick));
  if (flick) fade(0.85 * flick, '3,4,14');
}
function pedPlay(t, o = {}) {   // sitting on the rug with the controller
  const tap = Math.abs(Math.sin(t * 9)) * 6;
  bean(o.x ?? PED.x, o.y ?? PED.y, { s: 0.85, sit: true, look: o.look || [-0.2, -0.6], mouth: o.mouth, sweat: o.sweat, jy: o.jy || 0,
    armL: o.armL || [-120, -170, -60, -120 + tap], armR: o.armR || [120, -170, 60, -120], tilt: o.tilt });
  if (!o.noPad) controller((o.x ?? PED.x), (o.y ?? PED.y) - 120 * 0.85 + tap * 0.3, 0.7);
}
function sTitle(t) {
  const cam = camL({ x: 950, y: 1100, z: 0.68 }, { x: 900, y: 1150, z: 0.76 }, ease(clamp(t / TE('title'))));
  room(t, cam); characters(cam, () => { doll2(DOLL0.x, DOLL0.y, { s: 0.55, sit: true }); pedPlay(t); }); vignette(main, 0.6);
}
function sWeekend(t) {
  const cam = camL({ x: 760, y: 1150, z: 0.95 }, { x: 740, y: 1180, z: 1.05 }, ss(T0('weekend'), TE('weekend'), t));
  room(t, cam); characters(cam, () => { doll2(DOLL0.x, DOLL0.y, { s: 0.55, sit: true }); pedPlay(t); }); vignette(main, 0.6);
}
function sWatch(t) {   // the rocking chair starts to rock and the doll's eyes turn to him
  const tC = W0('cadeira', 'watch'), tO = W0('observ', 'watch');
  const cam = t < tC ? { x: 740, y: 1180, z: 1.05 } : camL({ x: 1100, y: HF - 300, z: 1.2 }, { x: 1350, y: HF - 360, z: 2.0 }, ease(clamp((t - tC) / 2.4)));
  const rock = t > tC - 0.3 ? rockA(t) * 2 : 0, eyes = ss(tO - 0.1, tO + 0.4, t);
  room(t, cam, { rock }); characters(cam, () => { g.save(); g.translate(CH.x, CH.y); g.rotate(rock); g.translate(-CH.x, -CH.y); doll2(DOLL0.x, DOLL0.y, { s: 0.55, sit: true, look: [-eyes, 0.3 * eyes] }); g.restore(); pedPlay(t); });
  vignette(main, 0.6 + 0.1 * eyes);
}
function sShoes(t) {   // he finds it weird, glances at it... and goes back to the game (the in-game shoe store)
  const tE = W0('estranho', 'shoes'), tC = TL.err[0], tV = W0('visitando', 'shoes');
  const look = t > tE - 0.2 && t < tC ? [1, -0.3] : [-0.2, -0.6];
  const cam = t < tV ? { x: 1000, y: 1150, z: 0.8 } : camL({ x: 1000, y: 1150, z: 0.8 }, { x: 650, y: HF - 360, z: 2.1 }, ease(clamp((t - tV) / 0.8)));
  room(t, cam, { rock: rockA(t), tvMode: t > tV - 0.2 ? 'shop' : 'city' });
  characters(cam, () => { g.save(); g.translate(CH.x, CH.y); g.rotate(rockA(t)); g.translate(-CH.x, -CH.y); doll2(DOLL0.x, DOLL0.y, { s: 0.55, sit: true, look: [-1, 0.3] }); g.restore(); pedPlay(t, { look, mouth: t > tE - 0.2 && t < tC ? 'o' : undefined }); });
  vignette(main, 0.6);
}
function sLights(t) {   // the lights flicker... and the chair is empty
  const F = TL.flick, k = t - F, blink = k > 0 && k < 0.65 ? (Math.floor(k / 0.13) % 2 === 0 ? 1 : 0.2) : 0, gone = k > 0.4;
  const cam = { x: 1000, y: 1150, z: 0.8 };
  room(t, cam, { rock: rockA(t) * (gone ? 1.5 : 1), dark: blink, tvMode: 'shop' });
  characters(cam, () => { if (!gone) doll2(DOLL0.x, DOLL0.y, { s: 0.55, sit: true, look: [-1, 0.3] }); pedPlay(t, { look: gone ? [1, -0.3] : [-0.2, -0.6], mouth: gone ? 'o' : undefined, sweat: gone }); });
  if (blink) fade(0.5 * blink, '3,4,14');
  vignette(main, 0.65);
}
function sBehind(t) {   // the doll appears right behind him
  const B = W0('atrás', 'behind'), up = ss(B - 0.1, B + 0.15, t);
  const cam = camL({ x: 860, y: HF + 20, z: 1.3 }, { x: 870, y: HF + 30, z: 1.45 }, ss(T0('behind'), TE('behind'), t));
  room(t, cam, { rock: rockA(t), tvMode: 'shop' });
  if (up > 0) characters(cam, () => doll2(1010, HF + 140, { s: 0.6 * up, look: [-1, 0.4] }), 'rgba(255,150,150,0.9)', 0.2);
  characters(cam, () => pedPlay(t, { look: t > B + 0.4 ? [1, -0.4] : [-0.2, -0.6], mouth: t > B + 0.4 ? 'o' : undefined, sweat: t > B + 0.4, jy: t > B + 0.4 && t < B + 0.7 ? 30 : 0 }));
  if (t > B && t < B + 0.12) fade(0.4, '255,255,255');
  vignette(main, 0.7);
}
function punchFX(cam, wx, wy, k) {   // impact star where the fist lands
  if (k < 0 || k > 0.5) return; const [x, y] = screenOf(cam, wx, wy), s = popS(k, 0.1) * (1 - clamp((k - 0.3) / 0.2));
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.scale(s, s); main.rotate(0.2);
  main.fillStyle = '#ffe27a'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath();
  for (let j = 0; j < 16; j++) { const r = j % 2 ? 50 : 120, a = j / 16 * Math.PI * 2; main.lineTo(Math.cos(a) * r, Math.sin(a) * r); } main.closePath(); main.fill(); main.stroke();
  main.fillStyle = '#ffffff'; main.beginPath(); main.arc(0, 0, 30, 0, 7); main.fill(); main.restore();
}
function sPunch(t) {
  const P = TL.punch, k = t - P, wind = ss(P - 0.35, P - 0.05, t), hit = k > 0;
  const shake = hit && k < 0.3 ? (1 - k / 0.3) * 18 : 0;
  const cam = { x: 880 + Math.sin(t * 70) * shake, y: HF + 30, z: 1.45 };
  room(t, cam, { rock: rockA(t), tvMode: 'shop' });
  const dx = hit ? ease(clamp(k / 0.25)) * 70 : 0;
  characters(cam, () => doll2(1010 + dx, HF + 140, { s: 0.6, look: [-1, 0.4], tilt: hit ? 0.25 * (1 - clamp((k - 0.5) / 0.6)) : 0 }), 'rgba(255,150,150,0.9)', 0.2);
  characters(cam, () => pedPlay(t, { noPad: true, look: [1, -0.4], mouth: 'o', armR: hit && k < 0.6 ? [120, -200, 250, -230] : [120, -200, lerp(150, 60, wind), lerp(-120, -150, wind)] }));
  punchFX(cam, 1010 + 20, HF + 140 - 0.6 * 280, k);
  vignette(main, 0.7);
}
function sPulled(t) {   // the doll gets furious; an invisible force drags him across the floor into the guest room
  const E = W0('enfurece', 'pulled'), Pz = W0('puxado', 'pulled'), end = TE('pulled') - 0.25;
  const drag = ease(clamp((t - Pz) / (end - 0.15 - Pz))), px = lerp(PED.x, DOOR, drag), slam = t > end;
  const cam = { x: lerp(880, 1500, ss(Pz, end, t)), y: HF + 0, z: lerp(1.3, 0.85, ss(Pz, Pz + 0.6, t)) };
  room(t, cam, { rock: rockA(t) * 3, tvMode: 'shop', doorOpen: t > Pz - 0.2 && !slam });
  if (t > E) lightPool(main, cam, 1060, HF, 600, 'rgba(255,30,30,A)', 0.35 * ss(E, E + 0.4, t));
  characters(cam, () => doll2(1060, HF + 140, { s: 0.6, evil: t > E, look: [lerp(-1, 1, drag), 0.2] }), 'rgba(255,90,90,0.95)', 0.2);
  if (!slam) characters(cam, () => {
    if (t < Pz) pedPlay(t, { noPad: true, look: [1, -0.4], mouth: 'o', sweat: true });
    else { bean(px, PED.y - 60, { s: 0.85 * (drag > 0.8 ? lerp(1, 0.75, (drag - 0.8) / 0.2) : 1), tilt: 1.3, look: [-1, 0], mouth: 'o', sweat: true, armL: [-120, -230, -250, -330], armR: [120, -230, 250, -330] });
      if (drag < 0.95) for (let i = 0; i < 4; i++) line([px - 200 - i * 60, PED.y - 60 - i * 40, px - 360 - i * 60, PED.y - 60 - i * 40], 6, 'rgba(255,255,255,0.6)'); }
  });
  if (t > end && t < end + 0.15) fade(0.3, '0,0,0');
  vignette(main, 0.7);
}
function sPhone(t) {   // locked in the guest room: he opens a live of GTA instead of calling anyone
  const tA = W0('abre', 'phone'), tL = TL.err[1 + 1];
  const cam = camL({ x: 600, y: 1150, z: 0.85 }, { x: 560, y: 1250, z: 1.05 }, ss(T0('phone'), TE('phone'), t));
  g = main; camera(cam); guestRoom(t); nightGrade(main, 1.2);
  const phoneOn = t > W0('celular', 'phone');
  if (phoneOn) lightPool(main, cam, 600, HF - 50, 260, 'rgba(160,210,255,A)', 0.5);
  characters(cam, () => bean(560, HF + 160, { s: 0.85, sit: true, look: phoneOn ? [0.4, 0.5] : [0.8, -0.2], mouth: phoneOn ? undefined : 'o', phone: phoneOn, armR: [120, -170, 120, -160] }));
  if (t > tA - 0.1) phoneUI(770, 1000, 0.85 * popS(t - tA + 0.1, 0.25), t);
  vignette(main, 0.7);
}
function sNotAlone(t) {   // he is not alone: the doll is on the bed right behind him
  const NA = TL.na, k = ss(NA - 0.1, NA + 0.3, t);
  const cam = camL({ x: 560, y: 1250, z: 1.05 }, { x: 600, y: 1150, z: 0.8 }, ease(clamp((t - T0('notalone')) / (TE('notalone') - T0('notalone')))));
  g = main; camera(cam); guestRoom(t); nightGrade(main, 1.3);
  lightPool(main, cam, 600, HF - 50, 260, 'rgba(160,210,255,A)', 0.5);
  if (k > 0) lightPool(main, cam, 420, HF - 420, 360, 'rgba(255,30,30,A)', 0.4 * k);
  if (k > 0) characters(cam, () => doll2(420, HF - 330, { s: 0.55, sit: true, evil: true, look: [1, 0.6] }), `rgba(255,90,90,${0.95 * k})`, 0.2);
  characters(cam, () => bean(560, HF + 160, { s: 0.85, sit: true, look: [0.4, 0.5], phone: true, armR: [120, -170, 120, -160] }));
  vignette(main, 0.75);
}
function sEnd(t) {   // back in the living room: the doll is the one playing now
  const cam = camL({ x: 760, y: 1180, z: 1.05 }, { x: 760, y: 1200, z: 1.15 }, ss(T0('end'), TE('end'), t));
  room(t, cam, { rock: 0 });
  characters(cam, () => { const tap = Math.abs(Math.sin(t * 9)) * 6; doll2(PED.x, PED.y, { s: 0.62, sit: true, evil: true, look: [-0.3, -0.6], armL: [-60, -165 + tap], armR: [60, -165] }); controller(PED.x, PED.y - 0.62 * 160 + tap * 0.3, 0.6); }, 'rgba(255,120,120,0.9)', 0.2);
  vignette(main, 0.65);
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
  titleFX(t, tw[0].t0 - 0.3, tw[tw.length - 1].t1 - 0.05, [{ txt: 'VOCÊ SOBREVIVERIA', size: 92, colors: ['#ffffff', '#d9e4ff'] }, { txt: 'À BONECA', size: 118, colors: ['#ff8a8a', '#c81e3a'] }, { txt: 'AMALDIÇOADA?', size: 112, colors: ['#ff8a8a', '#c81e3a'] }]);
}
const SCENES = { title: sTitle, weekend: sWeekend, watch: sWatch, shoes: sShoes, lights: sLights, behind: sBehind, punch: sPunch, pulled: sPulled, phone: sPhone, notalone: sNotAlone, end: sEnd, cta: sOutro, feijoes: sOutro };
const SHK = mk();
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH);
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t);
  const sh = shakeAmt(t);
  if (sh > 0) { const c = SHK.getContext('2d'); c.clearRect(0, 0, SW, SH); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.drawImage(SHK, Math.sin(t * 90) * sh, Math.cos(t * 77) * sh); }
  stamps(t);
  for (const n of ['phone', 'end', 'cta']) { const c = T0(n); fade(1 - ss(0, 0.3, Math.abs(t - c))); }
  fade(ss(TL.total - 0.6, TL.total, t)); fade(1 - ss(0, 0.5, t));
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
