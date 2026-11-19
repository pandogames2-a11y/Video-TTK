// EP7 animation (2D canvas): the clown in the storm drain. Uses art.js + street.js. window.renderFrame(t) draws the frame at time t.
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
const LAMP = 'rgba(255,220,140,A)';
const COAT = raincoat('#f2c22a');
const pedro = (x, y, o = {}) => bean(x, y, { ...o, extra: COAT });
const SW_Y = CURB - 10;   // where characters stand on the sidewalk
const DOOR = { x: 749, y: GY };   // Pedrinho's front door (house at x=380)
const walkArms = (ph, k = 1) => ({ armL: [-120, -230, -150 + Math.sin(ph) * 40 * k, -130], armR: [120, -230, 150 - Math.sin(ph) * 40 * k, -130] });
function capItem(x, y, rot = 0, s = 1) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  shape('#c0392b', () => { g.moveTo(-60, 0); g.quadraticCurveTo(-50, -60, 0, -62); g.quadraticCurveTo(50, -60, 60, 0); g.closePath(); }, 6);
  rect(40, -14, 60, 18, '#a32e22', 8, 5); ell(0, -60, 9, 6, '#a32e22', 0, 4); g.restore();
}
function world(t, o = {}) {
  street(t, o);
  feijao(1300, GY + 22, 0.6, 0.2);    // hidden bean #1 (on the lawn between the houses)
  feijao(520, GY - 128, 0.55, -0.1);  // hidden bean #2 (on Pedrinho's window sill)
  if (o.doorOpen) { g.fillStyle = '#ffcf7a'; g.fillRect(DOOR.x - 57, GY - 226, 114, 226); }
}
function grade(cam, k = 1) {
  nightGrade(main, k);
  lightPool(main, cam, 1810, GY - 600, 700, LAMP, 0.4); lightPool(main, cam, -590, GY - 600, 600, LAMP, 0.3);
}
function screenOf(cam, wx, wy) { return [SW / 2 + (wx - cam.x) * cam.z, SH / 2 + (wy - cam.y) * cam.z]; }
function textOut(str, x, y, size, fill, opt = {}) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); if (opt.rot) main.rotate(opt.rot); if (opt.s) main.scale(opt.s, opt.s); main.globalAlpha = opt.a ?? 1; main.textAlign = opt.align || 'center'; main.textBaseline = 'middle'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(str, 0, 0); main.fillStyle = fill; main.fillText(str, 0, 0); main.restore(); }
const popS = (k, d = 0.25) => { const x = clamp(k / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; };
function fade(a, col = '0,0,0') { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(${col},${a})`; main.fillRect(0, 0, SW, SH); main.restore(); }
function glowEyes(cam, wx, wy, a, gap = 28) {
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'screen'; main.globalAlpha = a;
  for (const dx of [-gap, gap]) { const [x, y] = screenOf(cam, wx + dx, wy); const r = 40 * cam.z; const gr = main.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,210,40,1)'); gr.addColorStop(1, 'rgba(255,210,40,0)'); main.fillStyle = gr; main.fillRect(x - r, y - r, 2 * r, 2 * r); }
  main.restore();
}
// the rubber STAMP: slams onto the screen tilted, with a shake (the buzzer plays at the same time)
const STAMPS = [[TL.err[0], 'ERRADO!', '#d8261c', 'ERRO Nº 1'], [TL.err[1], 'ERRADO!', '#d8261c', 'ERRO Nº 2'], [TL.err[2], 'ERRADO!', '#d8261c', 'ÚLTIMO ERRO'], [W0('acerto', 'home'), 'ACERTOU!', '#22a447', 'PRIMEIRO ACERTO']];
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


// sound effects shown as pictures (no text): a water splash, a padlock snapping shut, a balloon bursting
function splash(cam, wx, wy, k) {
  const [x, y] = screenOf(cam, wx, wy); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1 - clamp((k - 0.5) / 0.4);
  main.fillStyle = 'rgba(170,200,255,0.9)'; main.strokeStyle = '#08061a'; main.lineWidth = 4;
  for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i / 13 - 0.5) * 2.2, v = 520 + (i * 53) % 260; const px = x + Math.cos(a) * v * k * cam.z * 0.8, py = y + (Math.sin(a) * v * k + 900 * k * k) * cam.z * 0.8;
    main.beginPath(); main.ellipse(px, py, 10 * cam.z, 16 * cam.z, a + Math.PI / 2, 0, 7); main.fill(); main.stroke(); }
  for (let i = 0; i < 5; i++) { main.beginPath(); main.moveTo(x + (i - 2) * 50, y - 20); main.lineTo(x + (i - 2) * 60, y - 20 - 160 * Math.min(1, k * 4)); main.strokeStyle = 'rgba(220,235,255,0.8)'; main.lineWidth = 6; main.stroke(); }
  main.restore();
}
function padlock(cam, wx, wy, k) {
  const [x, y] = screenOf(cam, wx, wy), s = popS(k, 0.2) * (1 - ss(1.7, 2.1, k)), shut = clamp((k - 0.25) / 0.15);
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.scale(s, s);
  main.lineWidth = 16; main.strokeStyle = '#08061a'; main.beginPath(); main.arc(0, -40 + (1 - shut) * -30, 40, Math.PI, 0); main.stroke();
  main.lineWidth = 9; main.strokeStyle = '#c9ccd2'; main.stroke();
  main.fillStyle = '#f2c22a'; main.strokeStyle = '#08061a'; main.lineWidth = 7; main.beginPath(); main.roundRect(-60, -45, 120, 100, 16); main.fill(); main.stroke();
  main.fillStyle = '#08061a'; main.beginPath(); main.arc(0, -5, 12, 0, 7); main.fill(); main.fillRect(-5, 0, 10, 28);
  if (shut >= 1 && k < 0.7) { main.strokeStyle = '#ffffff'; main.lineWidth = 6; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; main.beginPath(); main.moveTo(Math.cos(a) * 90, Math.sin(a) * 90); main.lineTo(Math.cos(a) * 125, Math.sin(a) * 125); main.stroke(); } }
  main.restore();
}
function burst(cam, wx, wy, k) {   // the balloon bursts right by his ear: a white shock ring + red rubber shreds
  const [x, y] = screenOf(cam, wx, wy); main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  main.globalAlpha = 1 - clamp(k / 0.5); main.strokeStyle = '#ffffff'; main.lineWidth = 14; main.beginPath(); main.arc(x, y, 60 + k * 900, 0, 7); main.stroke();
  main.globalAlpha = 1 - clamp((k - 0.3) / 0.5);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + 0.3, d = 80 + k * 700; main.save(); main.translate(x + Math.cos(a) * d, y + Math.sin(a) * d + 400 * k * k); main.rotate(a + k * 8);
    main.fillStyle = '#d6261e'; main.strokeStyle = '#08061a'; main.lineWidth = 5; main.beginPath(); main.moveTo(-26, -8); main.lineTo(22, -14); main.lineTo(26, 6); main.lineTo(-18, 12); main.closePath(); main.fill(); main.stroke(); main.restore(); }
  main.restore();
}

// ---------- scenes ----------
function sTitle(t) {
  const cam = camL({ x: 760, y: 500, z: 0.7 }, { x: 900, y: 1150, z: 0.85 }, ease(clamp(t / TE('title'))));
  g = main; camera(cam); world(t); grade(cam); rain(t, cam); vignette(main, 0.55);
}
function boatAt(t) {   // the paper boat: in Pedrinho's hand → on the water → down the gutter → into the drain
  const tPut = W0('barquinho', 'play'), tDesc = W0('desceu', 'drain'), tCai = W0('caiu', 'drain');
  if (t < tPut) return { hand: true };
  if (t < tDesc) return { x: 980 + Math.sin(t * 3) * 6, y: CURB + 40, r: Math.sin(t * 4) * 0.05 };
  if (t < tCai) return { x: lerp(980, DRAIN_X + 60, ease(clamp((t - tDesc) / (tCai - tDesc)))), y: CURB + 40, r: Math.sin(t * 6) * 0.08 };
  const k = clamp((t - tCai) / 0.5); if (k >= 1) return null;
  return { x: DRAIN_X + 60 - k * 40, y: CURB + 40 + k * 60, r: -k * 1.2, s: 0.9 * (1 - k * 0.5), clip: true };
}
function sPlay(t) {   // they play with the paper boat in the gutter
  const cam = camL({ x: 1000, y: 1160, z: 0.95 }, { x: 960, y: 1200, z: 1.05 }, ss(T0('play'), TE('play'), t));
  g = main; camera(cam); world(t); grade(cam);
  const b = boatAt(t), bend = b && b.hand ? ss(W0('brincar', 'play'), W0('barquinho', 'play'), t) : 1 - ss(W0('barquinho', 'play') + 0.3, W0('barquinho', 'play') + 0.8, t);
  characters(cam, () => {
    if (b && !b.hand) paperBoat(b.x, b.y, 0.9, b.r);
    pedro(1150, SW_Y, { s: 0.85, tilt: -0.3 * bend, look: [-1, 0.6], armL: [-120, -230, -190, -60] });
    if (b && b.hand) paperBoat(1150 - 0.85 * 190 * Math.cos(0.3 * bend) - 10, SW_Y - 60 * 0.85 - 30 * bend, 0.8, 0);
    juca(1420, SW_Y - 30, { s: 0.78, look: [-1, 0.3], flip: true, mouth: 'o' });
  });
  rain(t, cam); vignette(main, 0.55);
}
function sDrain(t) {   // down the gutter and into the drain... yellow eyes light up inside
  const tCai = W0('caiu', 'drain'), tBu = W0('bueiro', 'drain');
  const cam = camL({ x: 960, y: 1200, z: 1.05 }, { x: DRAIN_X + 60, y: CURB - 60, z: 1.9 }, ease(clamp((t - T0('drain')) / (tCai - T0('drain') + 0.4))));
  g = main; camera(cam); world(t); grade(cam);
  const b = boatAt(t);
  characters(cam, () => {
    pedro(1150, SW_Y, { s: 0.85, look: [-1, 0.5], mouth: t > tCai ? 'o' : undefined });
    if (b) { if (b.clip) { g.save(); g.beginPath(); g.rect(-2000, -2000, 6000, CURB + 2000); g.rect(DRAIN_X - 150, CURB, 300, 62); g.clip('evenodd'); g.restore(); }
      g.save(); if (b.clip) { g.beginPath(); g.rect(-2000, -2000, 6000, CURB + 60 + 2000); g.clip(); } paperBoat(b.x, b.y, b.s || 0.9, b.r); g.restore(); }
  });
  glowEyes(cam, DRAIN_X, CURB + 30, ss(tBu + 0.2, tBu + 0.6, t));
  rain(t, cam); vignette(main, 0.6);
}
// the clown rising out of the drain, Pedrinho in front of it
function drainShot(t, cam, o) {
  g = main; camera(cam); world(t, { drainGlow: 0.6 }); grade(cam, 1.05);
  lightPool(main, cam, DRAIN_X, CURB, 380, 'rgba(255,200,120,A)', 0.3);
  const up = o.up, cy = lerp(CURB + 520, CURB + 170, up);
  if (up > 0) characters(cam, () => {
    g.save(); g.beginPath(); g.rect(DRAIN_X - 500, CURB - 1200, 1000, 1200 + 60); g.clip();
    clown(DRAIN_X, cy, { s: 1.0, evil: o.evil, noLegs: true, armR: [170, -330], armL: o.boat ? [-190, -250] : [-150, -200], look: [1, 0] });
    if (o.boat) paperBoat(DRAIN_X - 190, cy - 280, 0.8, 0.1);
    g.restore();
    if (o.balloon !== false) balloon(DRAIN_X + 170, cy - 330, 1, Math.sin(t * 1.3) * 0.3);
  }, 'rgba(255,200,160,0.9)', 0.2);
  characters(cam, () => { pedro(o.px, SW_Y, o.p); if (o.juca) juca(o.juca.x, SW_Y - 30, o.juca); }, undefined, 0.35);
}
function sOffer(t) {
  const up = ease(clamp((t - T0('offer') - 0.1) / 0.9));
  const cam = camL({ x: DRAIN_X + 60, y: CURB - 60, z: 1.9 }, { x: 860, y: 1150, z: 1.15 }, ease(clamp((t - T0('offer')) / 1.2)));
  drainShot(t, cam, { up, boat: true, px: 1180, p: { s: 0.85, look: [-1, 0], mouth: 'o' } });
  rain(t, cam); vignette(main, 0.6);
}
function sErro1(t) {   // he reaches for it... ERRADO! The clown turns evil, Pedrinho jumps back; the clown sinks back down
  const tEs = TL.err[0], back = ss(tEs + 0.45, tEs + 0.7, t), sink = 1 - ss(TE('erro1') - 0.7, TE('erro1') - 0.1, t);
  const reach = ss(tEs - 0.3, tEs + 0.1, t) * (1 - back);
  const cam = { x: 860, y: 1150, z: 1.15 };
  drainShot(t, cam, { up: sink, boat: back < 0.5, evil: t > tEs + 0.4, balloon: true, px: 1180 + back * 140,
    p: { s: 0.85, look: [-1, 0], mouth: back > 0 ? 'o' : undefined, sweat: back > 0, jy: Math.sin(back * Math.PI) * 50, armL: [-120, -230, lerp(-150, -330, reach), lerp(-130, -260, reach)] } });
  rain(t, cam); vignette(main, 0.6);
}
function sJuca(t) {   // Juca goes to check the drain up close... and gets pulled in. Only his cap is left, floating.
  const tCo = TL.err[1], SN = TL.snatch;
  const walk = clamp((t - W0('achou', 'juca')) / (tCo - W0('achou', 'juca'))), jx = lerp(1130, 830, ease(walk));
  const bend = ss(tCo - 0.3, tCo + 0.2, t), gone = t > SN;
  const cam = camL({ x: 1000, y: 1180, z: 1.0 }, { x: 860, y: 1250, z: 1.25 }, ease(clamp((t - T0('juca')) / (tCo - T0('juca')))));
  g = main; camera(cam); world(t); grade(cam);
  const capT = clamp((t - SN) / 3);
  characters(cam, () => {
    pedro(1330, SW_Y, { s: 0.85, look: [-1, 0.2], mouth: gone ? 'o' : undefined, sweat: gone, jy: gone ? Math.abs(Math.sin((t - SN) * 30)) * 6 * (1 - capT) : 0 });
    if (!gone) juca(jx, SW_Y - 30 + bend * 20, { s: 0.78, tilt: -0.6 * bend, walk: walk > 0 && walk < 1 ? 0.8 : 0, phase: t * 10, look: [-1, 0.5 + bend * 0.5], flip: true, mouth: 'o' });
    if (gone) capItem(lerp(DRAIN_X + 120, DRAIN_X - 380, capT), CURB + 30 + Math.sin(t * 5) * 4, Math.sin(t * 3) * 0.1, 0.62);
  });
  if (t > SN - 0.15 && t < SN + 0.1) glowEyes(cam, DRAIN_X, CURB + 30, 1);
  if (t > SN - 0.05 && t < SN + 0.9) splash(cam, DRAIN_X + 60, CURB + 20, t - SN + 0.05);   // water bursts out of the drain as he's pulled in
  rain(t, cam); vignette(main, 0.6);
}
function sHome(t) {   // runs home, locks the door — ACERTOU!
  const tTr = W0('trancou', 'home'), run = clamp((t - T0('home')) / (tTr - T0('home'))), shut = t > tTr + 0.1;
  const cam = camL({ x: 900, y: 1150, z: 0.95 }, { x: 760, y: 1080, z: 1.05 }, ease(run));
  g = main; camera(cam); world(t, { doorOpen: run > 0.55 && !shut }); grade(cam);
  const capT = clamp((t - TL.snatch) / 3);
  const px = lerp(1330, DOOR.x, ease(clamp(run / 0.85))), py = lerp(SW_Y, GY, ease(clamp((run - 0.3) / 0.55))), ps = lerp(0.85, 0.62, ease(clamp((run - 0.3) / 0.55)));
  characters(cam, () => {
    capItem(lerp(DRAIN_X - 380, DRAIN_X - 600, clamp((t - T0('home')) / 6)), CURB + 30 + Math.sin(t * 5) * 4, Math.sin(t * 3) * 0.1, 0.62);
    if (run < 0.97) pedro(px, py, { s: ps, look: run > 0.5 ? [0, -0.3] : [-1, 0], mouth: 'o', sweat: true, walk: 1, phase: t * 16, jy: Math.abs(Math.sin(t * 16)) * 10, ...walkArms(t * 16, 1.4) });
  }, undefined, 0.35);
  if (t > tTr + 0.1 && t < tTr + 2.2) padlock(cam, DOOR.x + 100, GY - 300, t - tTr - 0.1);
  rain(t, cam); vignette(main, 0.55);
}
// ---------- the bathroom ----------
const BF = 1500, SINK = { x: 430, y: 1140 };
function bathroom(t) {
  g.fillStyle = '#cfe0e6'; g.fillRect(-300, -200, 1700, BF + 200);
  for (let x = -300; x < 1400; x += 80) for (let y = 600; y < BF; y += 80) { g.fillStyle = ((x + y) / 80) % 2 ? '#bcd3db' : '#d8e7ec'; g.fillRect(x, y, 78, 78); }
  line([-300, 600, 1400, 600], 6); g.fillStyle = '#e8e1d6'; g.fillRect(-300, BF, 1700, 600); line([-300, BF, 1400, BF], 6);
  for (let x = -300; x < 1400; x += 120) line([x, BF, x - 60, BF + 600], 3, '#cfc6b8');
  rect(SINK.x - 150, 420, 300, 360, '#a9c3cc', 12, 6); rect(SINK.x - 130, 440, 260, 320, '#d6ecf2', 6, 5); line([SINK.x - 80, 470, SINK.x + 40, 600], 6, 'rgba(255,255,255,0.7)');   // mirror
  rect(SINK.x - 40, SINK.y + 40, 80, BF - SINK.y - 40, '#f4f4f2', 12, 6);   // pedestal
  shape('#f4f4f2', () => { g.moveTo(SINK.x - 200, SINK.y - 20); g.lineTo(SINK.x + 200, SINK.y - 20); g.quadraticCurveTo(SINK.x + 190, SINK.y + 70, SINK.x, SINK.y + 70); g.quadraticCurveTo(SINK.x - 190, SINK.y + 70, SINK.x - 200, SINK.y - 20); g.closePath(); });
  ell(SINK.x, SINK.y - 18, 160, 22, '#cfdde2', 0, 5); ell(SINK.x, SINK.y - 14, 18, 7, '#20242a', 0, 3);   // basin + drain
  line([SINK.x + 120, SINK.y - 30, SINK.x + 120, SINK.y - 110, SINK.x + 40, SINK.y - 110], 14, '#9aa6ae'); ell(SINK.x + 120, SINK.y - 116, 22, 10, '#9aa6ae', 0, 4);
  rect(820, 760, 220, 20, '#b88a3e', 4, 5); rect(840, 690, 60, 70, '#5aa0d6', 10, 4); ell(950, 742, 40, 18, '#f2a6c0', 0, 4);   // shelf: shampoo + soap
  feijao(1005, 742, 0.55, 0.1);   // hidden bean #3 (on the bathroom shelf)
  rect(1080, 420, 30, 500, '#d4d4d0', 8, 5); rect(1050, 520, 90, 300, '#e05a5a', 12, 5);   // towel
}
function sBath(t) {   // red balloons come out of the sink drain; he puts his ear to it... ERRADO! POP!
  const tSo = W0('soltar', 'bath'), tEn = TL.err[2], POP = TL.pop;
  const go = ss(tEn - 0.6, tEn, t);
  const cam = camL({ x: 600, y: 1050, z: 1.0 }, { x: 520, y: 1080, z: 1.35 }, ease(clamp((t - tSo) / 2.5)));
  g = main; camera(cam); bathroom(t); nightGrade(main, 0.55); lightPool(main, cam, 600, 300, 800, 'rgba(255,240,200,A)', 0.4);
  characters(cam, () => {
    const n = Math.floor(clamp((t - tSo) / 0.35, 0, 6));
    for (let i = 0; i < n; i++) { const k = t - tSo - i * 0.35; balloon(SINK.x + Math.sin(i * 2.1) * 60 + k * 30 * (i % 2 ? 1 : -1), SINK.y - 20 - Math.min(k, 3) * 300, 0.55, Math.sin(t * 2 + i) * 0.4); }
    if (t > tEn && t < POP) balloon(SINK.x + 40, SINK.y - 16, lerp(0.15, 0.4, ss(tEn, POP, t)), 0);   // one more balloon inflating right at his ear...
    bean(lerp(800, 600, go), BF, { s: 1.0, tilt: -0.45 * go, look: go > 0.5 ? [-1, 0.6] : [-1, -0.3], mouth: 'o', armL: [-120, -230, -150, -130] });
  }, undefined, 0.3);
  if (t > POP) { const k = t - POP; fade(0.85 * (1 - clamp(k / 0.25)), '255,40,30'); burst(cam, SINK.x + 40, SINK.y - 120, k); fade(ss(POP + 0.3, TE('bath'), t)); }
}
function sFloat(t) {   // up in the stormy sky: Juca and Pedrinho hanging from red balloons
  const k = t - T0('float');
  main.setTransform(1, 0, 0, 1, 0, 0); const sky = main.createLinearGradient(0, 0, 0, SH); sky.addColorStop(0, '#0a0f26'); sky.addColorStop(1, '#2a3266'); main.fillStyle = sky; main.fillRect(0, 0, SW, SH);
  const cam = { x: 540, y: 960 - k * 40, z: 1 };
  g = main; camera(cam);
  for (let i = 0; i < 5; i++) ell(100 + i * 260, 300 + (i % 2) * 900 - k * 20, 260, 70, '#1a2040', 0, 0);
  g.fillStyle = '#0d1430'; for (let i = 0; i < 8; i++) { const x = -100 + i * 180; g.beginPath(); g.arc(x, 2300 - k * 60, 160, Math.PI, 0); g.fill(); }
  nightGrade(main, 0.7);
  characters(cam, () => {
    for (const [bx, by, sc, who] of [[330, 1250, 0.55, 'j'], [700, 1650, 0.75, 'p']]) {
      const y = by - k * 90, sw = Math.sin(t * 1.4 + bx) * 0.15;
      g.save(); g.translate(bx, y); g.rotate(sw);
      balloon(0, -sc * 300, sc * 1.4, 0);
      if (who === 'p') bean(0, 0, { s: sc, look: [0, 0.8], mouth: 'o', armR: [120, -230, 10, -300], armL: [-120, -230, -10, -300] });
      else juca(0, 0, { s: sc, look: [0.6, 0.6], mouth: 'o', armR: [120, -230, 10, -300], armL: [-120, -230, -10, -300] });
      g.restore();
    }
    for (let i = 0; i < 6; i++) balloon(60 + i * 200 + (i === 3 ? 160 : 0), 2000 - k * (150 + i * 30) - i * 120, 0.5, Math.sin(t + i) * 0.4);
  }, undefined, 0.3);
  rain(t, cam, 0.7); vignette(main, 0.55);
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
  const tw = WORDS.filter(w => w.seg === 'title'); const a = tw[0].t0 - 0.35, out = tw[tw.length - 1].t1 - 0.05, gone = out + 0.45;
  if (t < a || t > gone) return;
  const kin = clamp((t - a) / 0.3), sIn = kin < 1 ? kin + Math.sin(kin * Math.PI) * 0.18 : 1;
  const s = sIn * (1 - ss(out, gone, t)); if (s <= 0.001) return;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(540, 760); main.scale(s, s); main.textAlign = 'center'; main.lineJoin = 'round';
  const tx = (str, y, size, fill) => { main.font = `900 ${size}px "Inter Display", Inter`; main.lineWidth = size * 0.18; main.strokeStyle = '#08061a'; main.strokeText(str, 0, y); main.fillStyle = fill; main.fillText(str, 0, y); };
  tx('VOCÊ SOBREVIVERIA', -95, 96, '#ffffff'); tx('AO PALHAÇO', 20, 110, '#ff5a4a'); tx('DO BUEIRO?', 132, 112, '#ff5a4a');
  main.restore();
}
const SCENES = { title: sTitle, play: sPlay, drain: sDrain, offer: sOffer, erro1: sErro1, juca: sJuca, home: sHome, bath: sBath, float: sFloat, cta: sOutro, feijoes: sOutro };
const SHK = mk();
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH);
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t);
  const sh = shakeAmt(t);
  if (sh > 0) { const c = SHK.getContext('2d'); c.clearRect(0, 0, SW, SH); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.drawImage(SHK, Math.sin(t * 90) * sh, Math.cos(t * 77) * sh); }
  stamps(t);
  for (const n of ['home', 'float', 'cta']) { const c = T0(n); fade(1 - ss(0, 0.3, Math.abs(t - c))); }
  fade(ss(TL.total - 0.6, TL.total, t)); fade(1 - ss(0, 0.5, t));
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
