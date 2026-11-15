// EP5, second half: the doll on the table, the night, the flashlight, the chase, the basement and the bed.
// (Loaded before scene.js; only functions here, so nothing runs before the timeline is ready.)

// ---------- extra sets: bedroom (upstairs) and basement, each in its own world ----------
const FB = 1350;   // bedroom floor
function bedroom(t, o = {}) {
  g.fillStyle = '#7f8fb5'; g.fillRect(-600, -200, 2400, FB + 200);
  for (let x = -600; x < 1800; x += 90) for (let y = 0; y < FB; y += 90) { g.fillStyle = '#8fa0c4'; g.beginPath(); g.arc(x + 45, y + 45, 7, 0, 7); g.fill(); }
  g.fillStyle = '#efe6d6'; g.fillRect(-600, 140, 2400, 36); line([-600, 176, 1800, 176], 5);
  g.fillStyle = '#7a5236'; g.fillRect(-600, FB, 2400, 800); for (let y = FB + 60; y < FB + 800; y += 70) line([-600, y, 1800, y], 3, '#5f3f28');
  rect(-600, FB - 22, 2400, 24, '#efe6d6', 0, 5);
  // window + moon, poster, door
  rect(80, 360, 340, 420, '#f3ece0', 8); const sk = g.createLinearGradient(0, 380, 0, 760); sk.addColorStop(0, '#0b1030'); sk.addColorStop(1, '#2a3270'); rect(100, 380, 300, 380, sk, 4, 5);
  ell(320, 460, 32, 32, '#f7f1d0', 0, 4); ell(334, 450, 28, 28, '#121940', 0, 0); line([250, 380, 250, 760], 6); line([100, 570, 400, 570], 6);
  rect(560, 360, 190, 250, '#e9d7a8', 4); shape('#d64036', () => { g.moveTo(655, 400); g.lineTo(690, 520); g.lineTo(620, 520); g.closePath(); }, 4); rect(630, 520, 50, 50, '#3a8fd6', 4, 4);
  rect(1300, 560, 220, FB - 560, '#f3ece0', 6); rect(1322, 582, 176, FB - 582, '#6a3f26', 3, 5); ell(1480, 960, 9, 9, '#e2b84a', 0, 3);
  // bed: headboard, frame, the dark space underneath
  g.fillStyle = '#05040a'; g.fillRect(330, 1180, 680, FB - 1180);
  rect(300, 860, 50, FB - 860, '#5a3a26', 10); rect(320, 1150, 700, 46, '#6a4630', 6); rect(330, 1196, 26, FB - 1196, '#5a3a26', 4, 4); rect(986, 1196, 26, FB - 1196, '#5a3a26', 4, 4);
  rect(350, 1090, 660, 64, '#f2f2f6', 12);   // mattress
  rect(370, 1040, 170, 64, '#ffffff', 26);   // pillow
  // nightstand + clock showing 3:00
  rect(1060, 1140, 170, 22, '#6a4630', 4, 5); rect(1070, 1162, 150, FB - 1162, '#5a3a26', 4, 5); rect(1095, 1210, 100, 50, '#4a3020', 4, 4);
  rect(1090, 1080, 110, 60, '#1c1c22', 10, 4); g.font = '900 38px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillStyle = '#ff3b30'; g.fillText(o.clock || '03:00', 1145, 1124);
}
function blanket() { shape('#3a6fb0', () => { g.moveTo(610, 1050); g.quadraticCurveTo(820, 1025, 1010, 1070); g.lineTo(1010, 1170); g.lineTo(590, 1170); g.closePath(); }); for (let x = 650; x < 1000; x += 70) line([x, 1055, x - 10, 1165], 6, '#2f5d96'); }
function beanLying(x, y, s, o = {}) {   // asleep in bed: body sideways, face upright on the pillow side
  g.save(); g.translate(x, y); g.scale(s, s);
  ell(0, 0, 165, 105, '#c8874d'); curve(-150, -10, 0, 30, 150, -5, 6, '#8a4f22');
  const ex = -95, ey = -25;
  if (o.awake) { ell(ex - 35, ey, 30, 36, '#ffffff', 0, 5); ell(ex + 35, ey, 30, 36, '#ffffff', 0, 5); ell(ex - 35, ey + 4, 8, 9, OUT, 0, 0); ell(ex + 35, ey + 4, 8, 9, OUT, 0, 0); }
  else if (o.oneEye) { curve(ex - 60, ey, ex - 35, ey + 14, ex - 10, ey, 6); ell(ex + 35, ey, 30, 36, '#ffffff', 0, 5); ell(ex + 35, ey + 4, 8, 9, OUT, 0, 0); }
  else { curve(ex - 60, ey, ex - 35, ey + 14, ex - 10, ey, 6); curve(ex + 10, ey, ex + 35, ey + 14, ex + 60, ey, 6); }
  if (o.smile) curve(ex - 25, ey + 50, ex, ey + 66, ex + 25, ey + 50, 6); else ell(ex, ey + 56, 10, 7, '#4a1820', 0, 4);
  g.restore();
}
const FM = 1400;   // basement floor
function basement() {
  g.fillStyle = '#4a5160'; g.fillRect(-600, -200, 2400, FM + 200);
  for (let y = -200, r = 0; y < FM; y += 80, r++) for (let x = -600 + (r % 2) * 80; x < 1800; x += 160) { g.strokeStyle = '#3c424f'; g.lineWidth = 4; g.strokeRect(x, y, 160, 80); }
  g.fillStyle = '#3a3f4a'; g.fillRect(-600, FM, 2400, 800);
  // door at the top of the stairs, stairs coming down
  rect(80, 300, 220, 320, '#3a2418', 6); rect(100, 320, 180, 300, '#5a2e1c', 3, 5); ell(260, 470, 9, 9, '#e2b84a', 0, 3); rect(220, 440, 30, 18, '#9aa0a8', 3, 3);   // bolt
  rect(40, 620, 340, 26, '#6a4630', 3, 5);
  for (let i = 0; i < 8; i++) rect(380 + i * 60, 646 + i * 94, 70, 26, '#6a4630', 3, 4);
  line([380, 600, 900, 1340], 8);
  // shelves, boxes, water heater, a dead bulb — and no window anywhere
  rect(1150, 700, 360, 22, '#6a4630', 3, 5); rect(1150, 980, 360, 22, '#6a4630', 3, 5);
  for (const [bx, by, bw, bh] of [[1170, 620, 110, 80], [1300, 640, 90, 60], [1180, 900, 150, 80], [1360, 920, 120, 60], [1200, 1290, 160, 110], [1380, 1320, 120, 80]]) { rect(bx, by, bw, bh, '#b08a5a', 4, 4); line([bx, by + bh / 2, bx + bw, by + bh / 2], 3, '#8a6a40'); }
  rect(1560, 900, 140, 500, '#8a96a0', 50); line([1630, 900, 1630, 600], 8);
  line([900, -200, 900, 380], 4); ell(900, 410, 26, 32, '#cfd3d8', 0, 4);
}

// ---------- overlays ----------
function screenOf(cam, wx, wy) { return [SW / 2 + (wx - cam.x) * cam.z, SH / 2 + (wy - cam.y) * cam.z]; }
function textOut(str, x, y, size, fill, opt = {}) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); if (opt.rot) main.rotate(opt.rot); if (opt.s) main.scale(opt.s, opt.s); main.globalAlpha = opt.a ?? 1; main.textAlign = opt.align || 'center'; main.textBaseline = 'middle'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(str, 0, 0); main.fillStyle = fill; main.fillText(str, 0, 0); main.restore(); }
const popS = (k, d = 0.25) => { const x = clamp(k / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; };
// the ERRO cards: a red tag with a big X, top of the screen
function errCards(t) {
  const L = [['primeiro', 'erro1', 'ERRO Nº 1', 'NÃO OLHAR DENTRO DO BRINQUEDO'], ['segundo', 'erro2', 'ERRO Nº 2', 'IR VER BARULHO ÀS 3 DA MANHÃ'], ['terceira', 'erro3', 'ERRO Nº 3', 'NÃO LIGAR PRA POLÍCIA'],
    ['quarta', 'erro4', 'ERRO Nº 4', 'SE TRANCAR NUM LUGAR SEM SAÍDA'], ['última', 'erro5', 'ÚLTIMO ERRO', 'VOLTAR EM VEZ DE IR EMBORA']];
  for (const [pre, sc, title, sub] of L) {
    const t0 = W0(pre, sc); if (t0 === undefined || t < t0 || t > t0 + 3.4) continue;
    const k = t - t0, s = popS(k, 0.3), a = 1 - ss(3.0, 3.4, k);
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 360); main.scale(s, s); main.rotate(-0.03);
    main.font = '900 46px "Inter Display", Inter'; const w = Math.max(560, main.measureText(sub).width + 80);
    main.fillStyle = '#c62828'; main.beginPath(); main.roundRect(-w / 2, -95, w, 190, 26); main.fill(); main.lineWidth = 8; main.strokeStyle = '#ffffff'; main.stroke();
    main.textAlign = 'center'; main.textBaseline = 'middle'; main.lineJoin = 'round';
    main.font = '900 84px "Inter Display", Inter'; main.lineWidth = 14; main.strokeStyle = '#5a0b0b'; main.strokeText('✗ ' + title, 0, -32); main.fillStyle = '#ffffff'; main.fillText('✗ ' + title, 0, -32);
    main.font = '900 40px "Inter Display", Inter'; main.lineWidth = 8; main.strokeText(sub, 0, 46); main.fillStyle = '#ffd9d4'; main.fillText(sub, 0, 46);
    main.restore();
  }
}
function timeCard(t, t0, t1, txt) {   // "30 MINUTOS DEPOIS…"
  if (t < t0 || t > t1) return; const a = ss(t0, t0 + 0.25, t) * (1 - ss(t1 - 0.3, t1, t));
  textOut(txt, 540, 900, 92, '#ffffff', { a, s: 0.9 + 0.1 * ss(t0, t1, t) });
}
function bubble(cam, wx, wy, txt, a = 1, think = false) {
  const [x, y] = screenOf(cam, wx, wy); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a;
  main.font = '900 52px "Inter Display", Inter'; const w = main.measureText(txt).width + 70, bx = clamp(x, w / 2 + 30, SW - w / 2 - 30);
  main.fillStyle = '#ffffff'; main.strokeStyle = '#08061a'; main.lineWidth = 8;
  main.beginPath(); main.roundRect(bx - w / 2, y - 60, w, 110, 50); main.fill(); main.stroke();
  if (think) { for (const [dx, dy, r] of [[-10, 75, 16], [-30, 110, 10]]) { main.beginPath(); main.arc(x + dx, y + dy, r, 0, 7); main.fill(); main.stroke(); } }
  else { main.beginPath(); main.moveTo(x - 20, y + 48); main.lineTo(x - 40, y + 100); main.lineTo(x + 20, y + 48); main.closePath(); main.fill(); main.stroke(); main.fillRect(x - 22, y + 40, 44, 12); }
  main.fillStyle = '#08061a'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(txt, bx, y - 4); main.restore();
}
function arrowTo(cam, wx, wy, txt, a, side = 1) {   // a bouncing yellow arrow pointing at something in the world
  const [x, y] = screenOf(cam, wx, wy); const bob = 14 * Math.abs(Math.sin(performance.now ? 0 : 0)); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a;
  main.translate(x + side * 120, y - 120); main.rotate(side > 0 ? Math.PI * 0.75 : Math.PI * 0.25);
  main.fillStyle = '#ffd23f'; main.strokeStyle = '#08061a'; main.lineWidth = 7; main.lineJoin = 'round';
  main.beginPath(); main.moveTo(0, 0); main.lineTo(-44, -34); main.lineTo(-44, -14); main.lineTo(-120, -14); main.lineTo(-120, 14); main.lineTo(-44, 14); main.lineTo(-44, 34); main.closePath(); main.stroke(); main.fill(); main.restore();
  textOut(txt, clamp(x + side * 200, 230, SW - 230), y - 230, 50, '#ffd23f', { a });
}
// darkness: everything black except the phone's glow and the flashlight cone
function darkness(cam, holes, alpha = 0.9) {
  const d = mk(), c = d.getContext('2d'); c.fillStyle = `rgba(2,3,12,${alpha})`; c.fillRect(0, 0, SW, SH);
  c.globalCompositeOperation = 'destination-out';
  for (const h of holes) {
    const [x, y] = screenOf(cam, h.x, h.y);
    if (h.cone) { const L = h.len * cam.z; const gr = c.createRadialGradient(x, y, 0, x, y, L); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(x, y); c.arc(x, y, L, h.ang - (h.spread || 0.38), h.ang + (h.spread || 0.38)); c.closePath(); c.fill(); }
    else { const R = h.r * cam.z; const gr = c.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, `rgba(0,0,0,${h.a ?? 0.9})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, SW, SH); }
  }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(d, 0, 0);
  // a warm tint inside the cone
  main.globalCompositeOperation = 'screen';
  for (const h of holes) if (h.cone) { const [x, y] = screenOf(cam, h.x, h.y); const L = h.len * cam.z; const gr = main.createRadialGradient(x, y, 0, x, y, L); gr.addColorStop(0, 'rgba(255,240,200,0.25)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); main.fillStyle = gr; main.beginPath(); main.moveTo(x, y); main.arc(x, y, L, h.ang - (h.spread || 0.38), h.ang + (h.spread || 0.38)); main.closePath(); main.fill(); }
  main.restore();
}
function redEyes(cam, wx, wy, s, a = 1) {   // the doll's eyes glowing in the dark
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'screen'; main.globalAlpha = a;
  for (const dx of [-30, 30]) { const [x, y] = screenOf(cam, wx + dx * s, wy); const gr = main.createRadialGradient(x, y, 0, x, y, 60 * s * cam.z); gr.addColorStop(0, 'rgba(255,40,30,0.9)'); gr.addColorStop(1, 'rgba(255,40,30,0)'); main.fillStyle = gr; main.fillRect(x - 100, y - 100, 200, 200); }
  main.restore();
}
// phone position in the world for a standing bean (o.phone in the right hand)
function phonePos(x, y, s, flip, aR) { const sx = flip ? -1 : 1; return { x: x + sx * aR[2] * s, y: y + (aR[3] - 20) * s }; }

// ---------- the living room with optional darkness ----------
function livingShot(t, cam, o, chars) {
  g = main; camera(cam); house(o.house || {});
  nightGrade(main, o.grade ?? 1);
  if (o.lamp !== false) lightPool(main, cam, 1330, 840, 520, 'rgba(255,190,110,A)', o.dark ? 0.0 : 0.5);
  if (o.tv) lightPool(main, cam, 1010, 1380, 700, 'rgba(90,170,255,A)', 0.3 * o.tv * (0.7 + 0.3 * noise(t * 1.3)));
  rimLayer(main, cam, chars, o.rim);
  if (o.dark) darkness(cam, o.holes || [], o.darkA ?? 0.9);
  vignette(main, o.vig ?? 0.6);
  g = main;
}

// ---------- the second half, scene by scene ----------
const TABLE = { x: 740, y: FY - 190 };
function drawLate(t) {
  const seg = TL.segs.find(s => t >= s.start && t < s.start + s.dur) || TL.segs[TL.segs.length - 1], n = seg.scene, lt = t - seg.start;
  const sofaO = (k = 0) => ({ sit: true, s: 1.05, look: [-0.6, 0.2], chew: 0.3 + 0.3 * Math.abs(Math.sin(t * 12)), armL: [-140, -170, -120, -130], armR: [140, -170, lerp(120, 40, k), lerp(-210, -290, k)] });
  if (n === 'inside') {
    const tAbre = W0('abre', 'inside'), tDeixa = W0('deixa', 'inside'), tVolta = W0('volta', 'inside');
    const walkIn = clamp((t - seg.start) / (tAbre - seg.start - 0.1)), px1 = lerp(330, 600, ease(walkIn));
    const toSofa = clamp((t - tVolta) / 0.9), px = toSofa > 0 ? lerp(600, 1010, ease(toSofa)) : px1;
    const dollOut = ss(tDeixa - 0.2, tDeixa + 0.4, t);
    const cam = camL({ x: 560, y: 1040, z: 1.35 }, { x: 870, y: 1030, z: 1.05 }, ease(clamp((t - tVolta) / 1.2)));
    livingShot(t, cam, { tv: ss(tVolta + 0.6, tVolta + 1.2, t) }, () => {
      toyBox(TABLE.x - 70, TABLE.y, 0.5, { empty: dollOut > 0.5 });
      if (dollOut > 0) { const k = dollOut, dx = lerp(TABLE.x - 70, TABLE.x + 40, k), dy = TABLE.y - Math.sin(k * Math.PI) * 120 * (k < 1 ? 1 : 0); doll(dx, dy, { s: 0.42 }); }
      if (toSofa >= 1) { bean(1010, FY + 20, sofaO(Math.max(0, Math.sin((t - tVolta) * 3)))); popcorn(895, FY - 92); }
      else { const walking = (walkIn > 0 && walkIn < 1) || (toSofa > 0 && toSofa < 1); popcorn(880, FY - 150);
        bean(px, FY + 140, { s: 1.0, look: toSofa > 0 ? [1, 0] : [0.8, 0.3], walk: walking ? 0.9 : 0, phase: t * 11, armL: walking ? [-120, -230, -150, -130] : [-110, -230, -40, -330], armR: walking ? [120, -230, 150, -130] : [110, -230, 40, -330] });
        if (walkIn < 1) toyBox(px, FY + 140 - 170, 0.5, {}); }
    });
  } else if (n === 'erro1') {
    const tOlha = W0('olha', 'erro1'), tMic = W0('microfone', 'erro1'), tMas = W0('mas', 'erro1');
    const wide = { x: 870, y: 1030, z: 1.05 }, close = { x: TABLE.x - 20, y: TABLE.y - 80, z: 2.1 };
    const cam = t < tOlha ? wide : t < tMas ? camL(wide, close, ease(clamp((t - tOlha) / 0.8))) : camL(close, wide, ease(clamp((t - tMas) / 0.8)));
    const turn = ss(tMas + 0.6, tMas + 1.4, t);
    livingShot(t, cam, { tv: 1 }, () => { toyBox(TABLE.x - 70, TABLE.y, 0.5, { empty: true }); doll(TABLE.x + 40, TABLE.y, { s: 0.42, look: [turn, 0.2] }); bean(1010, FY + 20, sofaO(Math.max(0, Math.sin((t - seg.start) * 3)))); popcorn(895, FY - 92); });
    if (t > tMic - 0.2 && t < tMas + 0.2) {   // X-ray lens: a microphone and gears inside the toy
      const a = ss(tMic - 0.2, tMic + 0.1, t) * (1 - ss(tMas - 0.1, tMas + 0.2, t)); const [x, y] = screenOf(cam, TABLE.x + 40, TABLE.y - 75);
      main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.beginPath(); main.arc(x, y, 190, 0, 7); main.fillStyle = 'rgba(10,40,80,0.92)'; main.fill(); main.lineWidth = 10; main.strokeStyle = '#7fd3ff'; main.stroke();
      main.strokeStyle = '#bfe6ff'; main.lineWidth = 5; main.beginPath(); main.ellipse(x, y + 10, 95, 120, 0, 0, 7); main.stroke();
      main.beginPath(); main.roundRect(x - 26, y - 70, 52, 80, 26); main.stroke(); main.beginPath(); main.moveTo(x, y + 10); main.lineTo(x, y + 50); main.moveTo(x - 30, y + 50); main.lineTo(x + 30, y + 50); main.stroke();   // microphone
      for (const [gx, gy, r] of [[x - 55, y + 70, 22], [x + 55, y + 60, 28]]) { main.beginPath(); main.arc(gx, gy, r, 0, 7); main.stroke(); for (let i = 0; i < 8; i++) { const an = i / 8 * Math.PI * 2 + t * 2; main.beginPath(); main.moveTo(gx + Math.cos(an) * r, gy + Math.sin(an) * r); main.lineTo(gx + Math.cos(an) * (r + 10), gy + Math.sin(an) * (r + 10)); main.stroke(); } }
      main.fillStyle = Math.floor(t * 4) % 2 ? '#ff3b30' : '#5a1010'; main.beginPath(); main.arc(x + 40, y - 60, 10, 0, 7); main.fill();
      main.restore(); textOut('MICROFONE?!', x, y - 240, 58, '#7fd3ff', { a });
    }
  } else if (n === 'sleep') {
    const tDes = W0('desliga', 'sleep'), tCama = W0('cama', 'sleep');
    const tv = 1 - ss(tDes + 0.2, tDes + 0.35, t);
    const walk = clamp((t - tCama + 0.3) / 1.4), px = lerp(1010, 1880, ease(walk)), climb = clamp((t - tCama - 1.1) / 1.6);
    const sx = px + climb * 560, sy = FY + 140 - climb * 900 + (walk > 0 && climb <= 0 ? 0 : 0);
    const cam = walk <= 0 ? { x: 870, y: 1030, z: 1.05 } : { x: clamp(sx, 900, 2200), y: lerp(1030, 600, climb), z: 1.05 };
    livingShot(t, cam, { tv }, () => {
      toyBox(TABLE.x - 70, TABLE.y, 0.5, { empty: true }); doll(TABLE.x + 40, TABLE.y, { s: 0.42, look: [walk > 0 ? 1 : 0.6, 0.2] });
      if (walk <= 0) { bean(1010, FY + 20, { sit: true, s: 1.05, look: [0, 0.2], mouth: t > tDes + 0.5 ? 'o' : undefined, armL: [-140, -170, -120, -130], armR: [140, -200, 60, -330] }); }
      else bean(sx, sy, { s: 1.0, look: [1, 0], walk: walk < 1 || climb < 1 ? 0.8 : 0, phase: t * 10, mouth: 'o', armL: [-120, -240, -150, -130], armR: [120, -240, 60, -360] });
      popcorn(880, FY - 150);
    });
    const fo = ss(TE('sleep') - 0.5, TE('sleep'), t); if (fo > 0) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${fo})`; main.fillRect(0, 0, SW, SH); main.restore(); }
  } else if (n === 'noise' || n === 'erro2' || (n === 'check' && t < W0('casa', 'check'))) {
    const cam0 = { x: 760, y: 1010, z: 1.15 };
    const tBar = W0('barulhos', 'noise'), tCont = W0('continuar', 'erro2'), tMasN = W0('mas', 'check'), tCel = W0('celular', 'check');
    const sitUp = n !== 'noise', up = n === 'check' && t > tMasN + 0.3;
    const dark = n === 'check' && t > tCel - 0.2;
    g = main; camera(cam0); bedroom(t);
    nightGrade(main, 1.25); lightPool(main, cam0, 250, 560, 380, 'rgba(120,160,255,A)', 0.35);
    rimLayer(main, cam0, () => {
      if (up) { const k = clamp((t - tMasN - 0.3) / 0.8); bean(lerp(700, 1150, ease(k)), FB + 40, { s: 0.85, look: [1, 0], walk: k < 1 ? 0.8 : 0, phase: t * 10, phone: t > tCel - 0.4, armR: [110, -240, 150, -330], armL: [-110, -230, -150, -130] }); }
      else if (sitUp) { bean(560, 1180, { sit: true, s: 0.8, look: t > tCont ? [0, 0] : [1, -0.2], mouth: 'o', sweat: true, armL: [-120, -200, -150, -150], armR: [120, -200, 150, -150] }); blanket(); }
      else { beanLying(530, 1045, 0.6, { oneEye: t > tBar + 0.3, smile: t < tBar }); blanket(); }
    });
    if (dark) { const k = clamp((t - tMasN - 0.3) / 0.8), x = lerp(700, 1150, ease(k)); darkness(cam0, [{ x: x + 125, y: FB - 240, r: 120, a: 0.8 }, { cone: true, x: x + 125, y: FB - 240, ang: 0.1, len: 700 }]); }
    vignette(main, 0.6);
    if (n === 'noise') { timeCard(t, seg.start, seg.start + 1.5, '30 MINUTOS DEPOIS…'); const fi = 1 - ss(seg.start + 1.1, seg.start + 1.6, t); if (fi > 0 && t > seg.start + 1.4) { /* card handles the fade */ }
      if (t < seg.start + 1.4) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${1 - ss(seg.start + 1.0, seg.start + 1.4, t)})`; main.fillRect(0, 0, SW, SH); main.restore(); timeCard(t, seg.start, seg.start + 1.5, '30 MINUTOS DEPOIS…'); }
      else { textOut('Z', 450 + Math.sin(t * 2) * 10, 760 - ((t * 60) % 90), 60, '#ffffff', { a: t < tBar ? 0.9 : 0 }); }
      if (t > tBar - 0.4) { const k = t - tBar + 0.4; textOut('TUM!', 300, 1250, 70, '#ffd23f', { a: 1 - ss(0.6, 0.9, k), s: popS(k), rot: -0.1 }); if (k > 0.7) textOut('CLEC!', 800, 1350, 62, '#ffd23f', { a: 1 - ss(1.3, 1.6, k), s: popS(k - 0.7), rot: 0.1 }); if (k > 1.3) textOut('TUM!', 420, 1420, 66, '#ffd23f', { a: 1 - ss(2.0, 2.3, k), s: popS(k - 1.3), rot: -0.05 }); }
    }
  } else if (n === 'check' || n === 'desce' || (n === 'ladrao') || (n === 'erro3' && t < W0('vai', 'erro3') + 0.4)) {
    // dark living room, only the phone's flashlight
    const tLamp = W0('lâmpadas', 'check'), tRep = W0('repara', 'desce'), tPensa = W0('pensa', 'ladrao'), tTipo = W0('tipo', 'ladrao'), tCic = W0('cicatriz', 'ladrao');
    const tBar3 = W0('barulho', 'erro3'), tPol = W0('polícia', 'erro3'), tVai = W0('vai', 'erro3');
    let px, py, flip = true, ang = Math.PI, walking = false;
    if (n === 'check') { const k = clamp((t - W0('casa', 'check')) / (TE('check') - W0('casa', 'check'))); px = 2480 - k * 600; py = FY + 140 - (1 - k) * 900; ang = 2.3; walking = true; }
    else if (n === 'desce') { const k = clamp((t - seg.start) / (tRep - seg.start)); px = lerp(1880, 1000, ease(k)); py = FY + 140; walking = k < 1; ang = t < tRep ? Math.PI + 0.25 * Math.sin(t * 2.5) : Math.atan2(TABLE.y - 80 - (FY - 160), TABLE.x - (px - 140)); }
    else { px = 1000; py = FY + 140; ang = t > tBar3 ? -0.15 : Math.atan2(TABLE.y - 80 - (FY - 160), TABLE.x - (px - 140)); flip = !(t > tBar3 + 0.3); if (n === 'erro3' && t > tVai) { walking = true; px = 1000 + (t - tVai) * 900; flip = false; ang = -0.05; } }
    const aR = [120, -240, 150, -330], pp = phonePos(px, py, 1.0, flip, aR);
    let cam = n === 'check' ? { x: clamp(px - 100, 1500, 2300), y: lerp(600, 1050, clamp((t - W0('casa', 'check')) / 2.5)), z: 1.1 } : { x: clamp(px - 160, 860, 1700), y: 1030, z: 1.1 };
    if (n === 'ladrao' && t > tTipo) cam = camL(cam, { x: px, y: py - 260, z: 1.8 }, ease(clamp((t - tTipo) / 0.8)));
    const holes = [{ x: pp.x, y: pp.y, r: 260, a: 0.7 }, { cone: true, x: pp.x, y: pp.y, ang, len: 1200 }];
    livingShot(t, cam, { dark: true, holes, lamp: false, tv: 0, darkA: 0.88 }, () => {
      toyBox(TABLE.x - 70, TABLE.y, 0.5, { empty: true });
      if (n === 'check' && t < tLamp + 0.6) { /* the doll is still there in the dark? no — it already left */ }
      bean(px, py, { s: 1.0, flip, look: n === 'ladrao' && t > tTipo ? [0, 0] : [-1, 0], walk: walking ? 0.8 : 0, phase: t * 9, phone: true, mouth: (n === 'desce' && t > tRep) || (n === 'erro3' && t > tBar3) ? 'o' : undefined, sweat: n === 'desce' && t > tRep, armL: [-120, -230, -150, -130], armR: aR });
    });
    if (n === 'check' && t > tLamp - 0.3) arrowTo(cam, 1770, 880, 'INTERRUPTOR', ss(tLamp - 0.3, tLamp, t), -1);
    if (n === 'desce' && t > tRep + 0.6) textOut('!', SW / 2 + 40, 640, 150, '#ffd23f', { s: popS(t - tRep - 0.6) });
    if (n === 'ladrao' && t > tPensa && t < tTipo) {   // the thought: a burglar sneaking off with the doll in a sack
      const a = ss(tPensa, tPensa + 0.3, t) * (1 - ss(tTipo - 0.3, tTipo, t)); const [x, y] = screenOf(cam, px, py - 520);
      main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.fillStyle = '#ffffff'; main.strokeStyle = '#08061a'; main.lineWidth = 8;
      main.beginPath(); main.ellipse(x, y - 140, 300, 190, 0, 0, 7); main.fill(); main.stroke(); for (const [dx, dy, r] of [[40, 70, 26], [70, 130, 16]]) { main.beginPath(); main.arc(x + dx, y + dy, r, 0, 7); main.fill(); main.stroke(); }
      main.restore();
      const thief = { x: (x - SW / 2) / cam.z + cam.x, y: (y - 40 - SH / 2) / cam.z + cam.y }; const prev = main; const lay = mk(), c = lay.getContext('2d'); g = c; camera(cam);
      g.save(); g.translate(thief.x - 40 + Math.sin(t * 8) * 6, thief.y); g.scale(0.45, 0.45);
      bean(0, 0, { s: 1, look: [1, 0], walk: 0.8, phase: t * 9, armL: [-110, -230, -60, -330], armR: [110, -230, 170, -260] });
      g.fillStyle = '#111'; g.fillRect(-110, -330, 220, 50); ell(-40, -305, 22, 16, '#fff', 0, 3); ell(40, -305, 22, 16, '#fff', 0, 3);   // burglar mask
      for (let i = 0; i < 4; i++) line([-110, -220 + i * 40, 110, -220 + i * 40], 10, '#111');   // striped shirt
      ell(240, -250, 90, 110, '#b08a5a'); shape('#e05a26', () => { g.moveTo(205, -350); g.lineTo(225, -400); g.lineTo(245, -355); g.lineTo(270, -395); g.lineTo(280, -345); g.closePath(); }, 5);   // the doll's hair poking out of the sack
      g.restore(); g = main; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.drawImage(lay, 0, 0); main.restore();
      textOut('LADRÃO!', x, y - 290, 54, '#c62828', { a });
    }
    if (n === 'ladrao' && t > tCic - 0.3) {   // evidence photo: the doll's scarred face
      const a = ss(tCic - 0.3, tCic, t); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(780, 700); main.rotate(0.06); main.scale(popS(t - tCic + 0.3), popS(t - tCic + 0.3));
      main.fillStyle = '#ffffff'; main.fillRect(-170, -190, 340, 400); main.lineWidth = 6; main.strokeStyle = '#08061a'; main.strokeRect(-170, -190, 340, 400); main.fillStyle = '#c9e6f5'; main.fillRect(-145, -165, 290, 290); main.restore();
      const lay = mk(), c = lay.getContext('2d'); g = c; c.setTransform(1, 0, 0, 1, 0, 0); c.translate(780, 700); c.rotate(0.06); c.beginPath(); c.rect(-145, -165, 290, 290); c.clip(); g.translate(0, 330); g.scale(1.25, 1.25); doll(0, 0, { s: 1 }); g = main;
      main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.drawImage(lay, 0, 0); main.restore();
      textOut('ROUBARIAM ISSO?', 780, 990, 46, '#ffd23f', { a, rot: 0.06 });
    }
    if (n === 'erro3' && t > tBar3 - 0.1) textOut('CLANG!', 860, 780, 96, '#ffd23f', { a: 1 - ss(tBar3 + 1.0, tBar3 + 1.3, t), s: popS(t - tBar3 + 0.1), rot: 0.08 });
    if (n === 'erro3' && t > tPol - 0.2 && t < tVai) { arrowTo(cam, 597, FY - 240, 'LIGA 190!', ss(tPol - 0.2, tPol + 0.1, t), -1); }
  } else if (n === 'erro3' || n === 'reveal' || (n === 'chase' && t < W0('correr', 'chase') + 0.3)) {
    // the kitchen, lit only by the phone
    const tOi = W0('oi', 'erro3'), tComo = W0('como', 'erro3'), tBrin = W0('brinquedo', 'reveal'), tTra = W0('tramontina', 'reveal');
    const enter = clamp((t - (W0('vai', 'erro3') + 0.4)) / 1.2), px = lerp(2520, 2900, ease(enter)), py = FY + 140;
    const DOLL = { x: 3420, y: FY - 210 };
    const ang = t < tBrin - 0.6 ? -0.15 + 0.35 * Math.sin(t * 1.8) : Math.atan2(DOLL.y - 120 - (py - 330), DOLL.x - (px + 150));
    const aR = [120, -240, 150, -330], pp = phonePos(px, py, 1.0, false, aR);
    let cam = { x: clamp(px + 200, 2700, 3200), y: 1030, z: 1.1 };
    if (t > tBrin - 0.3) cam = camL(cam, { x: DOLL.x - 120, y: DOLL.y - 120, z: 2.2 }, ease(clamp((t - tBrin + 0.3) / 0.7)));
    if (t > tTra + 0.8) cam = camL(cam, { x: (px + DOLL.x) / 2, y: 1000, z: 1.0 }, ease(clamp((t - tTra - 0.8) / 0.8)));
    const scared = t > tBrin;
    livingShot(t, cam, { dark: true, lamp: false, tv: 0, darkA: 0.88, holes: [{ x: pp.x, y: pp.y, r: 260, a: 0.7 }, { cone: true, x: pp.x, y: pp.y, ang, len: 1300 }] }, () => {
      if (t > tBrin - 0.6) doll(DOLL.x, DOLL.y, { s: 0.75, evil: scared, knife: true, look: [-1, 0] });
      bean(px, py, { s: 1.0, look: [1, scared ? -0.2 : 0], walk: enter > 0 && enter < 1 ? 0.8 : 0, phase: t * 9, phone: true, mouth: scared ? 'o' : undefined, sweat: scared, armL: scared ? [-120, -260, -100, -380] : [-120, -230, -150, -130], armR: aR });
    });
    if (scared) redEyes(cam, DOLL.x, DOLL.y - 175 * 0.75 - 50 * 0.75, 0.75, ss(tBrin, tBrin + 0.4, t));
    if (n === 'erro3' && t > tOi - 0.1) bubble(cam, px + 60, py - 470, 'OI, QUEM É?', ss(tOi - 0.1, tOi + 0.1, t) * (1 - ss(tComo + 0.1, tComo + 0.4, t)));
    if (n === 'erro3' && t > tComo + 0.3) bubble(cam, DOLL.x - 200, DOLL.y - 260, 'OI! SOU O LADRÃO!', ss(tComo + 0.3, tComo + 0.6, t) * (1 - ss(TE('erro3') - 0.3, TE('erro3'), t)), true);
    if (n === 'reveal' && t > TE('reveal') - 1.0) textOut('hi-hi-hi…', 540, 640, 76, '#ffffff', { a: 1 - ss(TE('reveal') - 0.2, TE('reveal'), t) });
  } else if (n === 'chase') {
    // the doll runs after him through the whole ground floor; he dives into the basement right beside the front door
    const tCor = W0('correr', 'chase'), tPor = W0('porão', 'chase'), tEnt = W0('entrada', 'chase');
    const run = clamp((t - tCor - 0.3) / (tPor - tCor - 0.1)), px = lerp(2850, -205, ease(run * 0.85 + run * 0.15));
    const dx = lerp(3300, -20, clamp(run * 1.02 - 0.02));
    const inDoor = t > tPor + 0.1;
    const cam = { x: clamp(px + 200, 100, 3000), y: 1000, z: 0.95 };
    const aR = [100, -300, 60, -420];
    livingShot(t, cam, { dark: true, lamp: false, tv: 0, darkA: 0.6, house: { basementOpen: t > tPor - 0.3 && t < tPor + 0.6 }, holes: [{ x: px, y: py0(), r: 520, a: 0.75 }] }, () => {
      toyBox(TABLE.x - 70, TABLE.y, 0.5, { empty: true });
      if (!inDoor) bean(px, FY + 140, { s: 1.0, flip: true, look: [-1, 0], walk: 1.2, phase: t * 16, phone: true, mouth: 'o', sweat: true, armL: [-120, -300, -100, -420], armR: aR });
      doll(dx, FY + 140, { s: 0.75, evil: true, knife: true, walk: 1.2, phase: t * 18, look: [-1, 0] });
    });
    redEyes(cam, dx, FY + 140 - 225 * 0.75, 0.75, 0.9);
    if (!inDoor && run > 0.05) textOut('AAAAAH!', 540, 620 + Math.sin(t * 30) * 6, 96, '#ffffff', { a: 1 - ss(tPor - 0.2, tPor + 0.2, t) });
    if (t > tEnt - 0.3) arrowTo(cam, 290, 700, 'PORTA DE ENTRADA', ss(tEnt - 0.3, tEnt, t), 1);
  } else if (n === 'erro4' || n === 'wait' || (n === 'erro5' && t < W0('sai', 'erro5'))) {
    const tQu = W0('quinze', 'wait'), tTor = W0('torcendo', 'wait');
    const k = clamp((t - seg.start) / 1.4);
    const cam = n === 'erro4' && k < 1 ? camL({ x: 300, y: 700, z: 1.2 }, { x: 700, y: 1100, z: 1.0 }, ease(k)) : { x: 760, y: 1120, z: 1.1 };
    g = main; camera(cam); basement();
    nightGrade(main, 1.3);
    const onStairs = n === 'erro4' && k < 1, bx = onStairs ? lerp(300, 900, ease(k)) : 900, by = onStairs ? lerp(620, FM + 60, ease(k)) : FM + 60;
    rimLayer(main, cam, () => {
      if (onStairs) bean(bx, by, { s: 0.8, look: [1, 0.3], walk: 1, phase: t * 14, phone: true, mouth: 'o', armL: [-120, -260, -100, -380], armR: [120, -240, 150, -330] });
      else bean(bx, by, { sit: true, s: 0.8, look: [0, 0.2], mouth: n === 'erro5' ? undefined : 'o', sweat: n === 'erro4', phone: true, armL: [-120, -200, -40, -150], armR: [120, -200, 40, -200] });
    });
    darkness(cam, [{ x: bx, y: by - 230, r: 420, a: 0.85 }], 0.5);
    vignette(main, 0.6);
    if (n === 'erro4' && t > seg.start + 0.05) textOut('CLIC!', 260, 560, 64, '#ffd23f', { a: 1 - ss(seg.start + 0.8, seg.start + 1.1, t), s: popS(t - seg.start) });
    if (n === 'wait' && t > tTor) textOut('🤞', 0, 0, 1, '#fff', { a: 0 });
    if (n === 'wait') { if (t > tQu - 0.25 && t < tQu + 1.4) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${ss(tQu - 0.25, tQu, t) * (1 - ss(tQu + 1.0, tQu + 1.4, t))})`; main.fillRect(0, 0, SW, SH); main.restore(); timeCard(t, tQu - 0.2, tQu + 1.4, '15 MINUTOS DEPOIS…'); }
      if (t > tQu + 1.4) textOut('. . .', 540, 760, 90, '#ffffff', { a: 0.9 }); }
  } else if (n === 'erro5' || (n === 'bed' && t < W0('decide', 'bed'))) {
    // out of the basement — the front door is RIGHT THERE — and he goes back into the house instead
    const tSai = W0('sai', 'erro5'), tEmb = W0('embora', 'erro5'), tAcha = W0('acha', 'bed'), tAlg = W0('algum', 'bed');
    const out = clamp((t - tSai) / 0.8), px = lerp(-205, 0, ease(out)), ang = n === 'bed' ? Math.PI * 0 + 0.5 * Math.sin((t - tAcha) * 2.2) : 0.1;
    const shrug = n === 'bed' && t > tAlg;
    const aR = shrug ? [120, -260, 170, -330] : [120, -240, 150, -330], pp = phonePos(px, FY + 140, 1.0, false, aR);
    const cam = { x: 260, y: 1000, z: 1.0 };
    livingShot(t, cam, { dark: true, lamp: false, tv: 0, darkA: 0.82, house: { basementOpen: out < 1 }, holes: [{ x: pp.x, y: pp.y, r: 300, a: 0.75 }, { cone: true, x: pp.x, y: pp.y, ang, len: 1300 }] }, () => {
      bean(px, FY + 140, { s: 1.0, look: n === 'bed' ? [1, 0] : [1, 0], walk: out > 0 && out < 1 ? 0.8 : 0, phase: t * 9, phone: true, armL: shrug ? [-120, -260, -170, -330] : [-120, -230, -150, -130], armR: aR, mouth: shrug ? 'o' : undefined });
    });
    if (n === 'erro5' && t > tEmb - 0.4) arrowTo(cam, 290, 820, 'A SAÍDA TÁ AQUI!', ss(tEmb - 0.4, tEmb - 0.1, t), 1);
    if (shrug) textOut('?', SW / 2 + 160, 560, 130, '#ffffff', { s: popS(t - tAlg) });
  } else {
    // back in bed, pleased with himself... the doll rises behind him ON the bed, he screams; then the memorial T-shirt and the question
    const tDec = W0('decide', 'bed'), SC = T0('scare'), SCR = SC + 1.6, CAM = T0('camisa'), CTA = T0('cta');
    if (t < CAM) {
      const shake = t > SCR && t < SCR + 0.8 ? (1 - (t - SCR) / 0.8) * 14 : 0;
      const cam = { x: 700 + Math.sin(t * 61) * shake, y: 1010 + Math.cos(t * 53) * shake, z: t > SC ? lerp(1.15, 1.5, ease(clamp((t - SC) / 1.4))) : 1.15 };
      g = main; camera(cam); bedroom(t, { clock: '03:20' });
      nightGrade(main, 1.25); lightPool(main, cam, 250, 560, 380, 'rgba(120,160,255,A)', 0.35);
      const rise = ss(SC + 0.1, SC + 1.0, t), awake = t > SC + 1.0, up = t > SCR;
      if (t > SC) lightPool(main, cam, 420, 1000, 300, 'rgba(255,40,30,A)', 0.35 * rise);
      rimLayer(main, cam, () => {
        if (t > SC) { g.save(); g.beginPath(); g.rect(200, 0, 900, 1095); g.clip(); doll(425, lerp(1300, 1092, rise), { s: 0.5, evil: true, knife: true, look: [1, 0.3] }); g.restore(); }
        if (up) { bean(610, 1180, { sit: true, s: 0.8, look: [-1, -0.2], mouth: 'o', sweat: true, jy: Math.max(0, Math.sin(clamp((t - SCR) / 0.35) * Math.PI)) * 40, armL: [-120, -260, -100, -380], armR: [120, -260, 100, -380] }); blanket(); }
        else { beanLying(530, 1045, 0.6, { smile: !awake, awake }); blanket(); }
      }, t > SC ? 'rgba(255,140,130,0.95)' : undefined);
      if (t > SC + 0.6) redEyes(cam, 425, lerp(1300, 1092, rise) - 225 * 0.5 + 5, 0.5, rise);
      vignette(main, 0.6 + (t > SC ? 0.15 : 0));
      if (t < tDec + 0.5) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${1 - ss(tDec, tDec + 0.5, t)})`; main.fillRect(0, 0, SW, SH); main.restore(); }
      if (t > tDec + 1.0 && t < SC) textOut('Z', 470 + Math.sin(t * 2) * 10, 780 - ((t * 60) % 90), 60, '#ffffff', { a: 0.9 });
      if (t > SC + 0.9 && t < SCR) textOut('hi-hi-hi…', 330, 640, 64, '#ffffff', { a: ss(SC + 0.9, SC + 1.1, t) });
      if (up) { textOut('AAAAAAH!', 560 + Math.sin(t * 40) * 8, 600, 120, '#ffffff', { s: popS(t - SCR, 0.2), rot: -0.05 }); if (t < SCR + 0.15) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(255,255,255,${0.6 * (1 - (t - SCR) / 0.15)})`; main.fillRect(0, 0, SW, SH); main.restore(); } }
      const fo = ss(CAM - 0.35, CAM, t); if (fo > 0) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(0,0,0,${fo})`; main.fillRect(0, 0, SW, SH); main.restore(); }
    } else {
      // "vira estampa de camisa": a memorial T-shirt with his photo
      const tEst = W0('estampa', 'camisa');
      main.setTransform(1, 0, 0, 1, 0, 0); const bg = main.createRadialGradient(540, 900, 50, 540, 900, 1100); bg.addColorStop(0, '#2a2440'); bg.addColorStop(1, '#07060e'); main.fillStyle = bg; main.fillRect(0, 0, SW, SH);
      const a = ss(CAM, CAM + 0.5, t), z = 1 + 0.06 * ss(CAM, CTA + 3, t), dim = t > CTA ? 0.45 * ss(CTA, CTA + 0.5, t) : 0;
      g = main; g.save(); g.globalAlpha = a; g.translate(540, 980); g.scale(z, z);
      shape('#f4f4f6', () => { g.moveTo(-170, -420); g.quadraticCurveTo(0, -360, 170, -420); g.lineTo(420, -300); g.lineTo(340, -120); g.lineTo(250, -170); g.lineTo(250, 420); g.lineTo(-250, 420); g.lineTo(-250, -170); g.lineTo(-340, -120); g.lineTo(-420, -300); g.closePath(); }, 8);
      curve(-110, -405, 0, -330, 110, -405, 6);
      const pr = ss(tEst - 0.1, tEst + 0.3, t);
      if (pr > 0) {
        g.globalAlpha = a * pr;
        g.save(); g.beginPath(); g.arc(0, 40, 150, 0, Math.PI * 2); g.clip(); g.fillStyle = '#9fb6d6'; g.fillRect(-160, -120, 320, 320); bean(0, 300, { s: 0.85, look: [0, 0], armL: [-110, -230, -150, -130], armR: [110, -230, 150, -130] }); g.restore();
        g.beginPath(); g.arc(0, 40, 150, 0, Math.PI * 2); g.lineWidth = 10; g.strokeStyle = '#1c1420'; g.stroke();
        for (const sx of [-1, 1]) shape('#ffffff', () => { g.moveTo(sx * 150, 0); g.quadraticCurveTo(sx * 260, -60, sx * 230, 60); g.quadraticCurveTo(sx * 210, 90, sx * 150, 80); g.closePath(); }, 5);   // little wings
        g.textAlign = 'center'; g.font = '900 64px "Inter Display", Inter'; g.fillStyle = '#1c1420'; g.fillText('SAUDADES', 0, -170);
        g.font = '900 74px "Inter Display", Inter'; g.fillStyle = '#c62828'; g.fillText('PEDRINHO', 0, 280);
        g.font = '900 34px "Inter Display", Inter'; g.fillStyle = '#1c1420'; g.fillText('ELE ABRIU A CAIXA', 0, 340);
      }
      g.restore();
      if (dim > 0) { main.save(); main.fillStyle = `rgba(0,0,0,${dim})`; main.fillRect(0, 0, SW, SH); main.restore(); }
      if (t > CTA) {   // the question: who's next?
        const k = t - CTA; textOut('QUEM É O PRÓXIMO?', 540, 520, 92, '#ffd23f', { s: popS(k, 0.3) });
        for (let i = 0; i < 3; i++) { const kk = clamp((k - 0.4 - i * 0.25) / 0.3); if (kk <= 0) continue; const x = 300 + i * 240, y = 980;
          main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.scale(popS(kk * 0.3), popS(kk * 0.3)); main.fillStyle = '#0d0b16'; main.strokeStyle = '#7f6fb0'; main.lineWidth = 6;
          main.beginPath(); main.ellipse(0, -60, 80, 100, 0, 0, 7); main.fill(); main.stroke(); main.beginPath(); main.roundRect(-90, 40, 180, 200, 60); main.fill(); main.stroke(); main.restore();
          textOut('?', x, y - 60, 110, '#ffffff', { s: popS(kk * 0.3) }); }
        textOut('COMENTA AÍ! ↓', 540, 1340, 80, '#ffffff', { a: ss(CTA + 1.2, CTA + 1.5, t) });
      }
    }
  }
  errCards(t);
}
function py0() { return FY - 100; }
