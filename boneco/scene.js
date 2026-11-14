// EP5 animation (2D canvas). Uses the drawing kit in art.js. window.renderFrame(t) draws the frame at time t.
const TL = await (await fetch('timeline.json')).json();
const WORDS = await (await fetch('audio/words.json')).json();
const SEG = n => TL.segs.find(s => s.scene === n);
const T0 = n => SEG(n).start, TE = n => SEG(n).start + SEG(n).dur;
const RING = TL.ring;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const camL = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) });
const noise = t => Math.sin(t * 7.3) * 0.5 + Math.sin(t * 13.1) * 0.3 + Math.sin(t * 29.7) * 0.2;

// ---------- the outside of the house (its own world; ground GY) ----------
const GY = 1500;
function exterior(t, door = 0) {
  const sky = g.createLinearGradient(0, 0, 0, GY); sky.addColorStop(0, '#060a24'); sky.addColorStop(1, '#283066');
  g.fillStyle = sky; g.fillRect(-600, -300, 2400, GY + 300);
  g.fillStyle = '#f7f1d0'; for (let i = 0; i < 70; i++) { const x = (i * 197) % 2200 - 500, y = (i * 113) % 900 - 200; g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 3 + i); g.fillRect(x, y, 4, 4); } g.globalAlpha = 1;
  ell(1050, 180, 70, 70, '#f7f1d0', 0, 0); ell(1080, 160, 64, 64, '#101640', 0, 0);   // moon
  // far trees + neighbours
  g.fillStyle = '#0b0f2c'; for (let i = 0; i < 14; i++) { const x = -500 + i * 170; g.beginPath(); g.arc(x, 1180, 140 + (i % 3) * 40, Math.PI, 0); g.fill(); }
  g.fillStyle = '#0e1335'; g.fillRect(-600, 1180, 2400, 400);
  g.fillStyle = '#121840'; g.beginPath(); g.moveTo(-500, 1250); g.lineTo(-500, 1000); g.lineTo(-300, 860); g.lineTo(-100, 1000); g.lineTo(-100, 1250); g.fill();
  g.fillStyle = '#ffd77a'; g.fillRect(-380, 1080, 50, 60);
  g.fillStyle = '#121840'; g.beginPath(); g.moveTo(1180, 1250); g.lineTo(1180, 980); g.lineTo(1400, 840); g.lineTo(1620, 980); g.lineTo(1620, 1250); g.fill();
  // lawn, path, sidewalk
  g.fillStyle = '#2f5a3a'; g.fillRect(-600, GY - 40, 2400, 700);
  g.fillStyle = '#a9a39a'; g.fillRect(-600, GY + 260, 2400, 80); line([-600, GY + 260, 1800, GY + 260], 4);
  shape('#bdb5a8', () => { g.moveTo(500, GY); g.lineTo(580, GY); g.lineTo(640, GY + 260); g.lineTo(440, GY + 260); g.closePath(); }, 5);
  // house body: two storeys of pale siding
  rect(160, 760, 760, GY - 760, '#9fb0c4', 0);
  for (let y = 790; y < GY; y += 34) line([162, y, 918, y], 2, '#7f90a6');
  line([160, 1125, 920, 1125], 6);
  // roof, chimney
  rect(700, 420, 90, 240, '#7a3a2e', 4);
  shape('#3a3550', () => { g.moveTo(100, 790); g.lineTo(540, 410); g.lineTo(980, 790); g.closePath(); });
  shape('#9fb0c4', () => { g.moveTo(400, 760); g.lineTo(540, 640); g.lineTo(680, 760); g.closePath(); }, 5);   // gable
  ell(540, 710, 34, 34, '#2c3570', 0, 5);
  // upstairs windows (dark; one with a little light)
  for (const [x, lit] of [[250, false], [700, true]]) { rect(x, 860, 130, 170, '#f3ece0', 6); rect(x + 12, 872, 106, 146, lit ? '#3a3f78' : '#141a40', 3, 4); line([x + 65, 872, x + 65, 1018], 4); line([x + 12, 945, x + 118, 945], 4); rect(x - 14, 860, 14, 170, '#3d4a6a', 2, 3); rect(x + 130, 860, 14, 170, '#3d4a6a', 2, 3); }
  // living-room window: warm lamp + flickering TV light
  rect(210, 1200, 200, 200, '#f3ece0', 6);
  const tvk = 0.65 + 0.35 * noise(t);
  rect(222, 1212, 176, 176, '#ffcf7a', 3, 4);
  g.fillStyle = `rgba(110,190,255,${0.45 * tvk})`; g.fillRect(222, 1212, 176, 176);
  line([310, 1212, 310, 1388], 4); line([222, 1300, 398, 1300], 4);
  rect(196, 1200, 14, 200, '#3d4a6a', 2, 3); rect(410, 1200, 14, 200, '#3d4a6a', 2, 3);
  rect(690, 1200, 180, 200, '#f3ece0', 6); rect(702, 1212, 156, 176, '#141a40', 3, 4); line([780, 1212, 780, 1388], 4);
  // porch: roof, columns, door, light, steps
  if (door <= 0) { rect(470, 1180, 140, GY - 1180, '#7a3f2a', 4); ell(588, 1350, 9, 9, '#e2b84a', 0, 3); rect(495, 1210, 90, 60, '#ffd77a', 4, 4); }
  else {   // open: the warm hall behind, the door panel swung inwards against the left jamb
    const hall = g.createLinearGradient(0, 1180, 0, GY); hall.addColorStop(0, '#f2c27a'); hall.addColorStop(1, '#b77a45');
    rect(470, 1180, 140, GY - 1180, hall, 4);
    g.fillStyle = '#8a5a38'; g.fillRect(474, GY - 60, 132, 56);   // hall floor
    const w = 140 * (1 - 0.82 * door);
    shape('#6a3522', () => { g.moveTo(470, 1180); g.lineTo(470 + w, 1180 + 16 * door); g.lineTo(470 + w, GY - 16 * door); g.lineTo(470, GY); g.closePath(); }, 5);
  }
  shape('#3a3550', () => { g.moveTo(400, 1150); g.lineTo(680, 1150); g.lineTo(650, 1100); g.lineTo(430, 1100); g.closePath(); });
  rect(415, 1150, 22, GY - 1150, '#f3ece0', 2, 4); rect(643, 1150, 22, GY - 1150, '#f3ece0', 2, 4);
  ell(540, 1165, 16, 12, '#ffe8a8', 0, 4);
  rect(440, GY - 10, 200, 26, '#c9c2b4', 2, 4); rect(460, GY + 16, 160, 26, '#c9c2b4', 2, 4);
  // bushes, mailbox, picket fence, big tree
  for (const x of [200, 330, 750, 880]) ell(x, GY - 20, 70, 45, '#244a2e', 0, 5);
  line([1010, GY + 250, 1010, GY + 120], 7); rect(970, GY + 70, 90, 55, '#2c3570', 20); rect(1056, GY + 70, 8, 30, '#c0392b', 2, 3);
  for (let x = -560; x < 1800; x += 60) { if (x > 420 && x < 660) continue; shape('#e9e2d4', () => { g.moveTo(x, GY + 250); g.lineTo(x, GY + 160); g.lineTo(x + 18, GY + 140); g.lineTo(x + 36, GY + 160); g.lineTo(x + 36, GY + 250); g.closePath(); }, 4); }
  line([-560, GY + 190, 420, GY + 190], 5); line([660, GY + 190, 1800, GY + 190], 5);
  rect(1180, 900, 70, GY - 900, '#3a2618', 10); for (const [x, y, r] of [[1215, 860, 230], [1080, 960, 160], [1350, 980, 170], [1215, 700, 170]]) ell(x, y, r, r * 0.85, '#16301f', 0, 6);
}

// ---------- the toy box left on the porch: cardboard, a clear window, the doll smiling inside ----------
function toyBox(x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  rect(-62, -150, 124, 150, '#d6402f', 8);
  for (let i = 0; i < 6; i++) { g.fillStyle = ['#f2c53d', '#3a8fd6', '#46a35a'][i % 3]; g.fillRect(-58, -146 + i * 24, 8, 24); g.fillRect(50, -146 + i * 24, 8, 24); }
  rect(-62, -150, 124, 150, 'rgba(0,0,0,0)', 8);
  g.save(); g.beginPath(); g.roundRect(-42, -122, 84, 96, 10); g.clip();
  g.fillStyle = '#c9e6f5'; g.fillRect(-42, -122, 84, 96);
  doll(0, -24, { s: 0.42 });
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(-42, -80); g.lineTo(-10, -122); g.lineTo(6, -122); g.lineTo(-42, -60); g.fill();
  g.restore();
  g.beginPath(); g.roundRect(-42, -122, 84, 96, 10); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
  rect(-56, -148, 112, 22, '#f2c53d', 5, 4);
  g.font = '900 15px "Inter Display", Inter'; g.textAlign = 'center'; g.fillStyle = '#c62828'; g.fillText('MEU AMIGÃO', 0, -132);
  g.fillStyle = '#fff'; g.font = '900 12px "Inter Display", Inter'; g.fillText('AMIGO PARA SEMPRE!', 0, -8);
  g.restore();
}
function rimLayer(M, cam, drawFn, rim = 'rgba(160,215,255,0.95)', grade = 0.25) {
  const lay = mk(), sil = mk(); const prev = g; g = lay.getContext('2d'); camera(cam); drawFn(); g = prev;
  { const tmp = mk(), tc = tmp.getContext('2d'); tc.drawImage(lay, 0, 0); nightGrade(tc, grade); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(lay, 0, 0); const lc = lay.getContext('2d'); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, SW, SH); lc.drawImage(tmp, 0, 0); }
  const sc = sil.getContext('2d'); sc.drawImage(lay, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = rim; sc.fillRect(0, 0, SW, SH);
  M.save(); M.setTransform(1, 0, 0, 1, 0, 0); M.shadowColor = rim; M.shadowBlur = 30; M.drawImage(sil, 0, 0); M.shadowBlur = 0;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; M.drawImage(sil, Math.cos(a) * 6, Math.sin(a) * 6); }
  M.drawImage(lay, 0, 0); M.restore();
}

// ---------- the popcorn that flies when the bell rings ----------
const KERNELS = Array.from({ length: 26 }, (_, i) => ({ vx: -260 - (i * 53 % 420), vy: -(650 + (i * 37 % 350)), x0: 880 + (i % 5) * 8, y0: FY - 175 }));
function kernels(t) {
  if (t < RING) return;
  const k = t - RING;
  KERNELS.forEach((p, i) => {
    let x = p.x0 + p.vx * k, y = p.y0 + p.vy * k + 1400 * k * k; const floor = FY + 120 + (i % 7) * 18;
    if (y > floor) { y = floor; x = p.x0 + p.vx * Math.max(0, (-p.vy + Math.sqrt(p.vy * p.vy + 4 * 1400 * (floor - p.y0))) / 2800); }
    ell(x, y, 13, 11, '#fff6d8', k * 3 + i, 4);
  });
}

// ---------- direction ----------
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH);
  const t1 = T0('calm'), tb = T0('bell');
  if (t < t1 + 0.2) drawExterior(t, t1);
  if (t >= TL.open) drawPorch(t);
  else if (t > t1 - 0.4) {   // inside (cross-dissolve in from the window)
    const a = ss(t1 - 0.4, t1 + 0.2, t);
    if (a < 1) { const tmp = mk(), prev = main; drawInterior(t, tmp.getContext('2d')); prev.save(); prev.setTransform(1, 0, 0, 1, 0, 0); prev.globalAlpha = a; prev.drawImage(tmp, 0, 0); prev.restore(); }
    else drawInterior(t, main);
  }
  // the bell text, the final fade
  if (t > RING - 0.05 && t < RING + 1.6) { const k = t - RING, s = k < 0.25 ? 0.4 + 2.4 * k + Math.sin(k / 0.25 * Math.PI) * 0.3 : 1; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1 - ss(1.3, 1.6, k); main.translate(540, 660); main.scale(s, s); main.rotate(-0.08 + Math.sin(k * 40) * 0.02 * (1 - clamp(k))); main.textAlign = 'center'; main.font = '900 120px "Inter Display", Inter'; main.lineJoin = 'round'; main.lineWidth = 22; main.strokeStyle = '#08061a'; main.strokeText('DING-DONG!', 0, 0); main.fillStyle = '#ffd23f'; main.fillText('DING-DONG!', 0, 0); main.restore(); }
  const fin = ss(TL.total - 0.8, TL.total, t); if (fin > 0) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${fin})`; main.fillRect(0, 0, SW, SH); main.restore(); }
  const fi = 1 - ss(0, 0.6, t); if (fi > 0) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${fi})`; main.fillRect(0, 0, SW, SH); main.restore(); }
  hook(t);
}
function drawExterior(t, t1) {
  // slow push from the street into the lit living-room window
  const k = ease(clamp(t / (t1 + 0.2)));
  const cam = camL({ x: 560, y: 1150, z: 0.9 }, { x: 316, y: 1300, z: 2.6 }, k);
  g = main; camera(cam); exterior(t);
  nightGrade(main, 0.9);
  const tvk = 0.65 + 0.35 * noise(t);
  lightPool(main, cam, 316, 1300, 260, 'rgba(255,200,120,A)', 0.55); lightPool(main, cam, 316, 1300, 200, 'rgba(110,190,255,A)', 0.35 * tvk);
  lightPool(main, cam, 540, 1170, 220, 'rgba(255,220,150,A)', 0.5);
  vignette(main, 0.6);
}
function drawPorch(t) {
  // from the front yard: Pedrinho opens the door... nobody there. Just a toy box on the mat.
  const k = t - TL.open, door = ease(clamp(k / 0.6));
  const cam = camL({ x: 540, y: 1370, z: 2.6 }, { x: 540, y: 1560, z: 3.6 }, ease(clamp((t - TL.lookbox + 0.3) / 2.2)));
  g = main; camera(cam); exterior(t, door);
  nightGrade(main, 0.9);
  lightPool(main, cam, 540, 1170, 230, 'rgba(255,220,150,A)', 0.55);
  lightPool(main, cam, 540, 1360, 200, 'rgba(255,190,110,A)', 0.45 * door);
  const lk = k < 0.9 ? [0, 0] : k < 1.7 ? [-1, 0] : k < 2.5 ? [1, 0] : [0, 1];
  rimLayer(main, cam, () => {
    if (door > 0.15) bean(540, GY - 12, { s: 0.52, look: lk, mouth: k > 2.6 ? 'o' : undefined, armL: [-110, -230, -140, -150], armR: k < 0.7 ? [110, -260, 170, -300] : [110, -230, 140, -150] });
    toyBox(540, GY + 150, 0.5);
  });
  if (k > 2.7) { const q = clamp((k - 2.7) / 0.25), sc = q < 1 ? q + Math.sin(q * Math.PI) * 0.3 : 1; main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
    const sx = SW / 2 + (540 - cam.x) * cam.z, sy = SH / 2 + (GY - 300 - cam.y) * cam.z; main.translate(sx + 120, sy - 40); main.scale(sc, sc);
    main.textAlign = 'center'; main.font = '900 120px "Inter Display", Inter'; main.lineWidth = 20; main.strokeStyle = '#08061a'; main.strokeText('?', 0, 0); main.fillStyle = '#ffffff'; main.fillText('?', 0, 0); main.restore(); }
  vignette(main, 0.6);
}
function drawInterior(t, ctx) {
  const prev = main; const M = ctx;   // draw into ctx using the kit (which paints on `g` / `main`)
  const swap = c => { g = c; };
  const tb = T0('bell'), t1 = T0('calm');
  // camera: a slow drift on the sofa, a creeping push-in while the narrator builds up, then a whip-pan to the front door after the bell
  let cam;
  const whip = 1e9, UP = TL.up, WALK0 = UP + 0.45, WALK1 = TL.open - 0.1;
  const px = lerp(1010, 470, ease(clamp((t - WALK0) / (WALK1 - WALK0))));   // Pedrinho's x while he walks to the door
  if (t < tb) cam = camL({ x: 1010, y: 1020, z: 1.2 }, { x: 1000, y: 1060, z: 1.3 }, ss(t1, tb, t));
  else if (t < UP) cam = camL({ x: 1000, y: 1060, z: 1.3 }, { x: 990, y: 1090, z: 1.55 }, ease(clamp((t - tb) / (RING - tb))));
  else { const k = ease(clamp((t - UP) / 0.6)); cam = camL({ x: 990, y: 1090, z: 1.55 }, { x: Math.max(380, px - 60), y: 1000, z: 1.3 }, k); }
  swap(M); M.setTransform(1, 0, 0, 1, 0, 0); M.fillStyle = '#05040c'; M.fillRect(0, 0, SW, SH);
  camera(cam); house();
  // the light strip under the front door + a shadow passing behind it (someone is out there...)
  g.fillStyle = '#ffd77a'; g.fillRect(154, FY - 5, 272, 5);   // porch light shows through the gap under the door
  nightGrade(M, 1);
  const tvk = 0.7 + 0.3 * noise(t * 1.3);
  lightPool(M, cam, 1330, 840, 520, 'rgba(255,190,110,A)', 0.5);
  lightPool(M, cam, 1010, 1380, 700, 'rgba(90,170,255,A)', 0.3 * tvk);
  lightPool(M, cam, 290, FY - 20, 220, 'rgba(255,210,140,A)', 0.25);
  // the bean: chewing popcorn... until the bell
  const rk = t - RING, jump = rk > 0 ? Math.max(0, Math.sin(clamp(rk / 0.3) * Math.PI)) : 0;
  const hand = Math.max(0, Math.sin((t - t1) * 3.2));   // hand goes to the mouth and back
  const blink = (((t + 0.3) % 2.7) < 0.12) && rk < 0 ? 1 : 0;
  const scared = rk > 0;
  const standing = t > UP + 0.25, walking = t > WALK0 && t < WALK1;
  let o = scared
    ? { sit: true, s: 1.05, jy: jump * 35, look: rk > 0.25 ? [-1, -0.1] : [0, -0.3], mouth: 'o', armL: [-140, -170, -120, -130], armR: [140, -170, 120, -210] }
    : { sit: true, s: 1.05, look: [0, 0.35], blink, chew: hand > 0.7 ? 0 : 0.4 + 0.4 * Math.abs(Math.sin(t * 14)),
        armL: [-140, -170, -120, -130], armR: [140, -170, lerp(120, 40, hand), lerp(-210, -290, hand)] };
  const tilt = scared ? 0 : Math.sin(t * 1.4) * 0.015;
  o.tilt = tilt;
  if (standing) o = { s: 1.05, flip: false, look: [-1, 0], walk: walking ? 0.9 : 0, phase: (t - WALK0) * 11, jy: walking ? Math.abs(Math.sin((t - WALK0) * 11)) * 8 : 0,
    armL: walking ? [-120, -230, -150 + Math.sin((t - WALK0) * 11) * 40, -130] : [-110, -230, -150, -130], armR: t > WALK1 - 0.3 ? [110, -240, -60, -330] : [120, -230, 150 - Math.sin((t - WALK0) * 11) * 40, -130] };
  else if (t > UP) o.jy = (o.jy || 0) + ss(UP, UP + 0.25, t) * 30;
  // characters (with rim) — paint them on this ctx
  const lay = mk(), sil = mk(); g = lay.getContext('2d'); camera(cam);
  if (standing) { popcorn(880, FY - 150); bean(px, FY + 140, o); }   // popcorn left on the sofa
  else { bean(1010, FY + 20, o); popcorn(895, FY - 92 - jump * 35); }
  { const tmp = mk(), tc = tmp.getContext('2d'); tc.drawImage(lay, 0, 0); nightGrade(tc, 0.25); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(lay, 0, 0); const lc = lay.getContext('2d'); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, SW, SH); lc.drawImage(tmp, 0, 0); }
  const rim = 'rgba(160,215,255,0.95)';
  const sc = sil.getContext('2d'); sc.drawImage(lay, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = rim; sc.fillRect(0, 0, SW, SH);
  M.save(); M.setTransform(1, 0, 0, 1, 0, 0); M.shadowColor = rim; M.shadowBlur = 30; M.drawImage(sil, 0, 0); M.shadowBlur = 0;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; M.drawImage(sil, Math.cos(a) * 6, Math.sin(a) * 6); }
  M.drawImage(lay, 0, 0); M.restore();
  vignette(M, 0.55 + (t > whip ? 0.15 : 0));
  g = main;
}

function hook(t) {   // the question is on screen while the narrator asks it, and shrinks away as the sentence ends
  const tw = WORDS.filter(w => w.seg === 'title'); const a = tw[0].t0 - 0.35, out = tw[tw.length - 1].t1 - 0.05, gone = out + 0.45;
  if (t < a || t > gone) return;
  const kin = clamp((t - a) / 0.3), sIn = kin < 1 ? kin + Math.sin(kin * Math.PI) * 0.18 : 1;
  const kout = ss(out, gone, t), s = sIn * (1 - kout);
  if (s <= 0.001) return;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(540, 760); main.scale(s, s); 
  main.textAlign = 'center'; main.lineJoin = 'round';
  const tx = (str, y, size, fill) => { main.font = `900 ${size}px "Inter Display", Inter`; main.lineWidth = size * 0.18; main.strokeStyle = '#08061a'; main.strokeText(str, 0, y); main.fillStyle = fill; main.fillText(str, 0, y); };
  tx('VOCÊ SOBREVIVERIA', -95, 96, '#ffffff'); tx('AO BONECO', 20, 104, '#ff5a4a'); tx('ASSASSINO?', 132, 112, '#ff5a4a');
  main.restore();
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
