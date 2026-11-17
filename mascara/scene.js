// EP6 animation (2D canvas): the hockey-mask killer at the lake camp. Uses art.js + camp.js. window.renderFrame(t) draws the frame at time t.
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
const FIRE = 'rgba(255,150,60,A)';

// ---------- characters ----------
const BIA = { col: '#a8673a', lid: '#93582f', extra: friendA };
const JUCA = { col: '#d79a5c', lid: '#c0874c', extra: friendB };
const pedro = (x, y, o = {}) => bean(x, y, o);
const bia = (x, y, o = {}) => bean(x, y, { ...BIA, ...o });
const juca = (x, y, o = {}) => bean(x, y, { ...JUCA, ...o });
const walkArms = (ph, k = 1) => ({ armL: [-120, -230, -150 + Math.sin(ph) * 40 * k, -130], armR: [120, -230, 150 - Math.sin(ph) * 40 * k, -130] });
function capItem(x, y, rot = 0, s = 1) {   // Juca's red cap on its own
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  shape('#c0392b', () => { g.moveTo(-60, 0); g.quadraticCurveTo(-50, -60, 0, -62); g.quadraticCurveTo(50, -60, 60, 0); g.closePath(); }, 6);
  rect(40, -14, 60, 18, '#a32e22', 8, 5); ell(0, -60, 9, 6, '#a32e22', 0, 4); g.restore();
}

// ---------- extra props in the camp ----------
const SIGN_X = -250, CAR_X = 2300;
function warnSign() {   // "NÃO ACAMPE AQUI" on a post, near the cabin
  rect(SIGN_X - 14, GY - 330, 28, 400, '#5a3220', 4, 5);
  g.save(); g.translate(SIGN_X, GY - 400); g.rotate(-0.05);
  rect(-190, -70, 380, 150, '#c9b48a', 8, 6); for (const yy of [-30, 14, 52]) line([-186, yy, 186, yy], 3, '#a8946c');
  g.textAlign = 'center'; g.font = '900 44px "Inter Display", Inter'; g.fillStyle = '#b3201c'; g.fillText('NÃO ACAMPE', 0, -10); g.fillText('AQUI!', 0, 44);
  g.restore();
  feijao(SIGN_X + 90, GY - 476, 0.6, 0.15);   // hidden bean #2 (on top of the warning sign)
}
function tent(k = 1) {   // pops up "right there", under the sign
  if (k <= 0) return; const s = k < 1 ? k + Math.sin(k * Math.PI) * 0.25 : 1;
  g.save(); g.translate(SIGN_X - 20, GY + 70); g.scale(s, s);
  shape('#e8762a', () => { g.moveTo(-210, 0); g.lineTo(0, -260); g.lineTo(210, 0); g.closePath(); }, 7);
  shape('#2a1a14', () => { g.moveTo(-60, 0); g.lineTo(0, -170); g.lineTo(60, 0); g.closePath(); }, 5);
  line([0, -260, 0, -300], 6); line([-210, 0, -260, 20], 4); line([210, 0, 260, 20], 4);
  g.restore();
}
function car(x, y) {   // the friends' little car, parked at the camp entrance
  g.save(); g.translate(x, y);
  rect(-260, -170, 520, 120, '#3f7fb5', 30); shape('#3f7fb5', () => { g.moveTo(-170, -168); g.lineTo(-120, -280); g.lineTo(130, -280); g.lineTo(200, -168); g.closePath(); });
  shape('#9ec3e6', () => { g.moveTo(-150, -176); g.lineTo(-110, -262); g.lineTo(0, -262); g.lineTo(0, -176); g.closePath(); }, 5);
  shape('#9ec3e6', () => { g.moveTo(16, -176); g.lineTo(16, -262); g.lineTo(122, -262); g.lineTo(180, -176); g.closePath(); }, 5);
  rect(-270, -110, 36, 24, '#ffe9a8', 6, 4); rect(236, -110, 30, 24, '#d64036', 6, 4);
  for (const wx of [-150, 150]) { ell(wx, -45, 52, 52, '#222028'); ell(wx, -45, 22, 22, '#9aa0a8', 0, 5); }
  rect(-60, -150, 40, 10, '#2a5a86', 4, 3);
  g.restore();
  feijao(x + 20, y - 292, 0.6, -0.1);   // hidden bean #3 (on the car roof)
}
function world(t, o = {}) {   // the whole camp + props, in world units
  camp({ t, fire: o.fire ?? 1 });
  feijao(980, 752, 0.65, 0.2);   // hidden bean #1 (on the pier)
  warnSign(); tent(o.tent ?? 1);
  if (o.car !== false) car(o.carX ?? CAR_X, GY + 30);
  if (o.cap) capItem(o.cap.x, o.cap.y, o.cap.r || 0, o.cap.s || 0.9);
}
function grade(cam, o = {}) {
  nightGrade(main, o.night ?? 1);
  if (o.fire !== false) lightPool(main, cam, 560, GY - 40, 900, FIRE, 0.55 * (o.fireA ?? 1));
  lightPool(main, cam, -790, 860, 320, 'rgba(255,205,110,A)', 0.3);
}

// ---------- overlays ----------
function screenOf(cam, wx, wy) { return [SW / 2 + (wx - cam.x) * cam.z, SH / 2 + (wy - cam.y) * cam.z]; }
function textOut(str, x, y, size, fill, opt = {}) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); if (opt.rot) main.rotate(opt.rot); if (opt.s) main.scale(opt.s, opt.s); main.globalAlpha = opt.a ?? 1; main.textAlign = opt.align || 'center'; main.textBaseline = 'middle'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(str, 0, 0); main.fillStyle = fill; main.fillText(str, 0, 0); main.restore(); }
const popS = (k, d = 0.25) => { const x = clamp(k / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; };
function errCards(t) {
  const L = [['acamparam', 'sign', 'ERRO Nº 1', 'IGNORAR A PLACA'], ['sozinho', 'wood', 'ERRO Nº 2', 'SE SEPARAR DO GRUPO'], ['procurar', 'search', 'ERRO Nº 3', 'IR ATRÁS DO ASSASSINO'],
    ['esconde', 'hide', 'ÚLTIMO ERRO', 'SE ESCONDER NUM ARMÁRIO']];
  for (const [pre, sc, title, sub] of L) {
    const t0 = W0(pre, sc); if (t < t0 || t > t0 + 3.0) continue;
    const k = t - t0, s = popS(k, 0.3), a = 1 - ss(2.6, 3.0, k);
    main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 330); main.scale(s, s); main.rotate(-0.03);
    main.font = '900 46px "Inter Display", Inter'; const w = Math.max(560, main.measureText(sub).width + 80);
    main.fillStyle = '#c62828'; main.beginPath(); main.roundRect(-w / 2, -95, w, 190, 26); main.fill(); main.lineWidth = 8; main.strokeStyle = '#ffffff'; main.stroke();
    main.textAlign = 'center'; main.textBaseline = 'middle'; main.lineJoin = 'round';
    main.font = '900 84px "Inter Display", Inter'; main.lineWidth = 14; main.strokeStyle = '#5a0b0b'; main.strokeText('✗ ' + title, 0, -32); main.fillStyle = '#ffffff'; main.fillText('✗ ' + title, 0, -32);
    main.font = '900 40px "Inter Display", Inter'; main.lineWidth = 8; main.strokeText(sub, 0, 46); main.fillStyle = '#ffd9d4'; main.fillText(sub, 0, 46);
    main.restore();
  }
}
function bubble(cam, wx, wy, txt, a = 1) {
  const [x, y] = screenOf(cam, wx, wy); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a;
  main.font = '900 52px "Inter Display", Inter'; const w = main.measureText(txt).width + 70, bx = clamp(x, w / 2 + 30, SW - w / 2 - 30);
  main.fillStyle = '#ffffff'; main.strokeStyle = '#08061a'; main.lineWidth = 8;
  main.beginPath(); main.roundRect(bx - w / 2, y - 60, w, 110, 50); main.fill(); main.stroke();
  main.beginPath(); main.moveTo(x - 20, y + 48); main.lineTo(x - 40, y + 100); main.lineTo(x + 20, y + 48); main.closePath(); main.fill(); main.stroke(); main.fillRect(x - 22, y + 40, 44, 12);
  main.fillStyle = '#08061a'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(txt, bx, y - 4); main.restore();
}
function arrowTo(cam, wx, wy, txt, a, side = 1, t = 0) {   // a bouncing yellow arrow pointing at something in the world
  const [x0, y0] = screenOf(cam, wx, wy); const b = 14 * Math.abs(Math.sin(t * 6)); const x = x0 + side * b, y = y0 - b;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a;
  main.translate(x + side * 120, y - 120); main.rotate(side > 0 ? Math.PI * 0.75 : Math.PI * 0.25);
  main.fillStyle = '#ffd23f'; main.strokeStyle = '#08061a'; main.lineWidth = 7; main.lineJoin = 'round';
  main.beginPath(); main.moveTo(0, 0); main.lineTo(-44, -34); main.lineTo(-44, -14); main.lineTo(-120, -14); main.lineTo(-120, 14); main.lineTo(-44, 14); main.lineTo(-44, 34); main.closePath(); main.stroke(); main.fill(); main.restore();
  textOut(txt, clamp(x + side * 200, 260, SW - 260), y - 235, 54, '#ffd23f', { a });
}
function darkness(cam, holes, alpha = 0.9) {   // everything black except the phone glow and the flashlight cone
  const d = mk(), c = d.getContext('2d'); c.fillStyle = `rgba(2,3,12,${alpha})`; c.fillRect(0, 0, SW, SH);
  c.globalCompositeOperation = 'destination-out';
  for (const h of holes) {
    const [x, y] = screenOf(cam, h.x, h.y);
    if (h.cone) { const L = h.len * cam.z; const gr = c.createRadialGradient(x, y, 0, x, y, L); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr; c.beginPath(); c.moveTo(x, y); c.arc(x, y, L, h.ang - 0.38, h.ang + 0.38); c.closePath(); c.fill(); }
    else { const R = h.r * cam.z; const gr = c.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, `rgba(0,0,0,${h.a ?? 0.9})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, SW, SH); }
  }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(d, 0, 0); main.restore();
}
function fade(a, col = '0,0,0') { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(${col},${a})`; main.fillRect(0, 0, SW, SH); main.restore(); }
function battery(x, y, a, blink) {   // "2%" low-battery icon
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(x, y);
  main.fillStyle = '#fff'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath(); main.roundRect(-90, -45, 170, 90, 14); main.fill(); main.stroke(); main.fillRect(80, -18, 18, 36); main.strokeRect(80, -18, 18, 36);
  if (blink) { main.fillStyle = '#e02a20'; main.fillRect(-80, -35, 16, 70); }
  main.restore(); textOut('2%', x - 5, y + 95, 70, '#ff4a3a', { a });
}

// ---------- scenes ----------
function sTitle(t) {   // the empty camp: moon over the lake, slow tilt down to the campfire
  const k = ease(clamp(t / TE('title')));
  const cam = camL({ x: 1300, y: 300, z: 0.8 }, { x: 700, y: 900, z: 0.66 }, k);
  g = main; camera(cam); world(t, { tent: 0, car: false }); grade(cam);
  vignette(main, 0.6);
}
function sArrive(t) {   // the car arrives at the entrance; three friends get out
  const t0 = T0('arrive'), k = clamp((t - t0) / 2.6);
  const cx = lerp(3500, CAR_X, 1 - Math.pow(1 - k, 2.4));
  const cam = camL({ x: 2500, y: 1000, z: 0.8 }, { x: 2200, y: 1040, z: 0.9 }, ease(clamp((t - t0) / (TE('arrive') - t0))));
  g = main; camera(cam); world(t, { tent: 0, carX: cx }); grade(cam, { fireA: 0.5 });
  lightPool(main, cam, cx - 300, GY - 70, 300, 'rgba(255,240,170,A)', 0.35 * (1 - ss(t0 + 2.7, t0 + 3.2, t)));
  const out = [t0 + 2.9, t0 + 3.2, t0 + 3.5], idea = W0('ótima', 'arrive');
  characters(cam, () => {
    const xs = [1980, 1760, 2560], who = [pedro, bia, juca];
    who.forEach((f, i) => { if (t < out[i]) return; const kk = clamp((t - out[i]) / 0.3); const cheer = t > idea && i === 0;
      f(xs[i], GY + 60, { s: 0.85, jy: Math.sin(kk * Math.PI) * 30, look: [i === 2 ? -1 : 0.4, -0.2], flip: i === 2,
        armL: cheer ? [-120, -260, -100, -380] : undefined, armR: cheer ? [120, -260, 100, -380] : undefined, mouth: cheer ? 'o' : undefined }); });
  }, undefined, 0.3);
  vignette(main, 0.6);
}
function sSign(t) {   // the warning sign... and the tent pops up right under it
  const tEnt = W0('entrada', 'sign'), tNe = W0('neandertais', 'sign'), tAc = W0('acamparam', 'sign'), tCl = W0('claro', 'sign');
  const cam = t < tNe ? camL({ x: SIGN_X, y: GY - 420, z: 1.6 }, { x: SIGN_X, y: GY - 380, z: 1.75 }, ss(T0('sign'), tNe, t))
    : camL({ x: SIGN_X, y: GY - 380, z: 1.75 }, { x: SIGN_X + 150, y: GY - 120, z: 0.95 }, ease(clamp((t - tNe) / 0.6)));
  const tk = clamp((t - tAc + 0.35) / 0.35);
  g = main; camera(cam); world(t, { tent: tk }); grade(cam);
  const show = t > tNe - 0.1;
  if (show) characters(cam, () => {
    const proud = t > tCl - 0.1;
    pedro(SIGN_X + 330, GY + 130, { s: 0.8, look: [-0.6, -0.3], armR: proud ? [120, -260, 170, -340] : undefined, mouth: proud ? undefined : 'o' });
    bia(SIGN_X + 640, GY + 110, { s: 0.78, look: [-0.8, -0.2], flip: true });
    juca(SIGN_X - 330, GY + 120, { s: 0.8, look: [0.8, -0.3], armL: [-120, -260, -100, -380] });
  }, undefined, 0.3);
  if (t > tNe && t < tAc + 0.2) arrowTo(cam, SIGN_X + 330, GY - 220, 'NEANDERTAIS', ss(tNe, tNe + 0.2, t), 1, t);
  vignette(main, 0.55);
}
function sFire(t) {   // the scary story, everyone laughs... except the masked man behind the fire
  const tRiu = W0('riu', 'fire'), tMen = W0('menos', 'fire'), tCara = W0('cara', 'fire');
  let cam = camL({ x: 560, y: 980, z: 0.62 }, { x: 560, y: 1000, z: 0.7 }, ss(T0('fire'), tMen, t));
  if (t > tMen) cam = camL(cam, { x: 560, y: 820, z: 1.7 }, ease(clamp((t - tMen - 0.2) / 1.0)));
  g = main; camera(cam); world(t);
  killer(560, 1010, { s: 0.72, glint: false });   // there the whole time, in the dark (graded with the set)
  grade(cam);
  lightPool(main, cam, 1170, GY - 330, 160, 'rgba(255,250,210,A)', t < tRiu ? 0.4 : 0);   // flashlight under Juca's chin
  const rev = ss(tCara - 0.2, tCara + 0.4, t);
  if (rev > 0) characters(cam, () => killer(560, 1010, { s: 0.72 }), `rgba(255,170,140,${0.9 * rev})`, 0.15);
  const laugh = t > tRiu && t < tMen + 0.3, jig = laugh ? Math.abs(Math.sin((t - tRiu) * 18)) * 10 : 0, stop = t > tMen + 0.3;
  characters(cam, () => {
    pedro(140, GY - 10, { sit: true, jy: jig, look: stop ? [0.6, -0.3] : [0.6, -0.2], mouth: laugh || !stop ? 'o' : undefined });
    bia(920, GY - 10, { sit: true, flip: true, jy: jig * 0.8, look: [-0.5, 0], mouth: laugh ? 'o' : undefined });
    const tell = !laugh && !stop;
    juca(1180, GY + 20, { flip: true, jy: jig, look: [-0.6, -0.3], mouth: laugh || tell ? 'o' : undefined,
      armR: tell ? [110, -230, 170 + Math.sin(t * 3) * 20, -330] : undefined, armL: tell ? [-110, -230, -60, -200] : undefined });
  });
  if (laugh) textOut('HAHAHA!', 540 + Math.sin(t * 30) * 6, 560, 110, '#ffffff', { s: popS(t - tRiu), rot: -0.06, a: 1 - ss(tMen, tMen + 0.3, t) });
  if (t > tCara + 0.2) redEye(cam, t);
  vignette(main, 0.6 + 0.15 * rev);
}
function redEye(cam, t) {}
function sWood(t) {   // Juca goes for firewood alone... only his cap comes back
  const tEnt = W0('então', 'wood'), tBo = W0('boné', 'wood');
  const cam = camL({ x: 700, y: 1010, z: 0.85 }, { x: 900, y: 1040, z: 0.8 }, ss(T0('wood'), tBo, t));
  const walk = clamp((t - tEnt) / 2.4), jx = lerp(1180, 1950, walk);
  const fly = clamp((t - tBo + 0.3) / 0.7);
  const cap = t > tBo - 0.3 ? { x: lerp(1900, 1000, fly), y: GY - 300 - Math.sin(fly * Math.PI) * 300 + fly * 400, r: fly * 9 + (fly >= 1 ? 0 : 0), s: 0.9 } : null;
  if (cap && fly >= 1) cap.r = 0.15;
  g = main; camera(cam); world(t); grade(cam);
  characters(cam, () => {
    const looking = t > tBo - 0.2;
    pedro(140, GY - 10, { sit: true, look: looking ? [1, -0.1] : [0.8, -0.1], mouth: looking ? 'o' : undefined });
    bia(920, GY - 10, { sit: true, flip: true, look: looking ? [1, 0] : [0.9, -0.2], mouth: looking ? 'o' : undefined });
    if (walk < 1) juca(jx, GY + 20, { s: 1 - walk * 0.25, walk: walk > 0 ? 0.8 : 0, phase: t * 10, look: [1, 0], ...(walk > 0 ? walkArms(t * 10) : { armR: [110, -230, 170, -330] }) });
    if (cap) capItem(cap.x, cap.y, cap.r, cap.s);
  });
  // the trees to the right swallow him: darkness gradient
  const [dx] = screenOf(cam, 1650, 0); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); const gr = main.createLinearGradient(dx, 0, dx + 300, 0); gr.addColorStop(0, 'rgba(2,3,12,0)'); gr.addColorStop(1, 'rgba(2,3,12,0.95)'); main.fillStyle = gr; main.fillRect(dx, 0, SW, SH); main.restore();
  if (t > tEnt && t < tEnt + 1.6) bubble(cam, jx, GY - 380, 'JÁ VOLTO!', 1 - ss(tEnt + 1.3, tEnt + 1.6, t));
  if (cap && fly >= 1) textOut('...', 540, 640, 120, '#ffffff', { s: popS(t - tBo - 0.4) });
  vignette(main, 0.6);
}
function sSearch(t) {   // picks up the cap, shrugs, walks into the woods with a 2% phone light (the car is RIGHT THERE)
  const tBr = W0('brincadeira', 'search'), tPr = W0('procurar', 'search'), tLa = W0('lanterna', 'search'), tBa = W0('bateria', 'search');
  const walk = clamp((t - tPr) / (TE('search') - tPr + 1.2)), px = lerp(1000, 1800, walk);
  const cam = t < tPr ? { x: 1000, y: 1040, z: 1.2 } : camL({ x: 1000, y: 1040, z: 1.2 }, { x: 1750, y: 1050, z: 0.62 }, ease(clamp((t - tPr) / 0.9)));
  g = main; camera(cam); world(t); grade(cam);
  const shrug = t > tBr - 0.3 && t < tPr, phone = t > tLa - 0.2;
  const aR = phone ? [120, -240, 190, -250] : [120, -230, 150, -130];
  characters(cam, () => {
    if (t < tPr) bia(560, GY + 230, { s: 0.75, look: [0.8, -0.3], mouth: 'o' });
    pedro(px, GY + 60, { s: 0.85, look: [1, 0], walk: walk > 0 ? 0.8 : 0, phase: t * 10, phone, armR: aR,
      armL: shrug ? [-120, -260, -170, -330] : [-120, -230, -150, -130], mouth: shrug ? 'o' : undefined, extra: friendBCap });
  }, undefined, 0.3);
  if (shrug) textOut('?', screenOf(cam, px, 0)[0] + 200, screenOf(cam, 0, GY - 380)[1], 130, '#ffffff', { s: popS(t - tBr + 0.3) });
  const dk = ss(tLa - 0.4, tLa + 0.4, t);
  if (dk > 0) { const pp = { x: px + 190 * 0.85, y: GY + 60 - 270 * 0.85 }; darkness(cam, [{ x: 560, y: GY, r: 600, a: 0.9 }, { x: pp.x, y: pp.y, r: 200, a: 0.8 }, { cone: true, x: pp.x, y: pp.y, ang: 0.05, len: 900 }, { x: CAR_X, y: GY - 120, r: 420, a: 0.6 }], 0.8 * dk); }
  if (t > tPr && t < TE('search')) arrowTo(cam, CAR_X - 120, GY - 260, 'O CARRO TÁ AQUI!', ss(tPr + 0.5, tPr + 0.8, t), -1, t);
  if (t > tBa - 0.1) battery(860, 820, ss(tBa - 0.1, tBa + 0.15, t), Math.floor(t * 4) % 2 === 0);
  vignette(main, 0.6);
}
const friendBCap = (by) => { if (TIME > T0('search') + 0) { g.save(); g.translate(-150, by + 60); capItem(0, 0, -0.3, 0.6); g.restore(); } };
let TIME = 0;
function sChase(t) {   // there he is. He only walks; Pedrinho runs... and trips on nothing.
  const t0 = T0('chase'), tAn = W0('anda', 'chase'), tAq = W0('aquele', 'chase'), FALL = TL.fall, tNa = W0('nada.', 'chase'), tNa2 = W0('nada!', 'chase');
  const run = clamp((t - tAq) / (FALL - tAq)), px = lerp(1650, 1100, run), fallen = t > FALL;
  const kx = lerp(2150, 1750, clamp((t - t0 - 1) / (TE('chase') - t0)));
  let cam = { x: lerp(1950, 1450, ease(run)), y: 1000, z: 0.75 };
  if (t > tNa - 0.3) cam = camL(cam, { x: 1350, y: GY + 40, z: 2.0 }, ease(clamp((t - tNa + 0.3) / 0.5)));
  const shake = t > tNa2 && t < tNa2 + 0.6 ? (1 - (t - tNa2) / 0.6) * 18 : 0; cam.x += Math.sin(t * 61) * shake; cam.y += Math.cos(t * 53) * shake;
  g = main; camera(cam); world(t); grade(cam, { fireA: 0.5 });
  const reveal = ss(t0 + 0.1, t0 + 0.4, t);
  characters(cam, () => killer(kx, GY + 40, { s: 1.15, walk: t > t0 + 1 ? 0.5 : 0, phase: t * 4, flip: true }), 'rgba(255,170,140,0.9)', 0.15);
  characters(cam, () => {
    if (!fallen) pedro(px, GY + 60, { s: 0.85, look: t < tAq ? [1, 0] : [-1, 0], mouth: 'o', sweat: t > tAq, walk: t > tAq ? 1 : 0, phase: t * 16, jy: t > tAq ? Math.abs(Math.sin(t * 16)) * 14 : 0,
      phone: t < tAq, armR: t < tAq ? [120, -240, 190, -250] : [120, -230, 150 + Math.sin(t * 16) * 50, -130], armL: t < tAq ? [-120, -260, -100, -360] : [-120, -230, -150 - Math.sin(t * 16) * 50, -130] });
    else { const k = ease(clamp((t - FALL + 0.15) / 0.25)); pedro(px - k * 120, GY + 60, { s: 0.85, tilt: -1.45 * k, look: [-1, 0.5], mouth: 'o', armL: [-120, -230, -200, -300], armR: [120, -230, 200, -300] }); }
  });
  if (t < t0 + 1.0) { const [x, y] = screenOf(cam, kx, GY - 120); fade(0); darkness(cam, [{ cone: true, x: 1650 + 160, y: GY - 170, ang: 0.05, len: 900 }, { x: 1650, y: GY - 150, r: 220, a: 0.8 }], 0.85 * (1 - ss(t0 + 0.6, t0 + 1.0, t))); }
  if (t > tAn - 0.4 && t < tAq + 0.4) arrowTo(cam, kx - 40, GY - 560, 'ELE SÓ ANDA!', ss(tAn - 0.4, tAn - 0.1, t) * (1 - ss(tAq, tAq + 0.4, t)), -1, t);
  if (t > tNa - 0.2) { const a = ss(tNa - 0.2, tNa, t); arrowTo(cam, 1300, GY + 70, 'NADA', a, 1, t); }
  if (t > tNa2) textOut('NO NADA!', 540 + Math.sin(t * 40) * 8, 640, 140, '#ff4a3a', { s: popS(t - tNa2, 0.2), rot: -0.05 });
  vignette(main, 0.65);
}
function sHide(t) {   // runs into the cabin, hides in the wardrobe... breathing like a buffalo. Then the killer is right in front.
  const tEs = W0('esconde', 'hide'), tRe = W0('respirando', 'hide'), tBu = W0('búfalo', 'hide'), tEa = W0('esse', 'hide'), tEnd = TE('hide');
  if (t < tEs + 0.6) {   // outside: he runs into the cabin, door slams
    const cam = { x: -900, y: 900, z: 1.0 }; const k = clamp((t - T0('hide')) / (tEs + 0.4 - T0('hide'))), px = lerp(-300, -965, k);
    const door = t > tEs + 0.45 ? 0 : clamp(k * 3);
    g = main; camera(cam); world(t); grade(cam);
    if (door > 0) { g.fillStyle = '#05040a'; g.fillRect(-1040, 730, 150, 290); }
    characters(cam, () => { if (k < 1) pedro(px, 1020 + (1 - k) * 280, { s: 0.6 + (1 - k) * 0.25, look: [-1, 0], mouth: 'o', sweat: true, walk: 1, phase: t * 16, ...walkArms(t * 16, 1.4) }); }, undefined, 0.3);
    vignette(main, 0.6); return;
  }
  // inside: a wardrobe with slatted doors; we see his eyes between the slats
  main.setTransform(1, 0, 0, 1, 0, 0); g = main;
  const cam = { x: 540, y: 960, z: 1 };
  const shake = Math.sin(t * Math.PI * 2 / 0.5);
  camera(cam);
  g.fillStyle = '#5a3a24'; g.fillRect(-100, -100, 1300, 2200); for (let y = 0; y < 2000; y += 70) line([-100, y, 1300, y], 4, '#3e2616');
  g.fillStyle = '#3a2618'; g.fillRect(-100, 1600, 1300, 600);
  rect(170, 380, 740, 1240, '#6b4630', 10, 8); rect(200, 410, 680, 1180, '#120c0a', 4, 6);
  nightGrade(main, 0.9); lightPool(main, cam, 900, 300, 700, 'rgba(150,180,255,A)', 0.3);
  const br = 1 + 0.05 * Math.max(0, shake);
  characters(cam, () => pedro(540, 1560, { s: 1.45, sq: br, sweat: true, look: [0, 0], mouth: 'o' }), 'rgba(160,215,255,0.7)', 0.5);
  // the slats (door), with a wider gap at eye height
  const EY = 1560 - (250 + 50) * 1.45 * br;
  for (let y = 410; y < 1590; y += 46) { if (Math.abs(y + 18 - EY) < 50) continue; rect(200, y, 680, 30, '#7a5034', 3, 4); }
  line([540, 410, 540, 1590], 10);
  fade(0.25, '5,8,30');
  if (t > tRe) textOut(shake > 0 ? 'HUFF!' : 'PUFF!', 540 + (shake > 0 ? -220 : 220), 520 + Math.sin(t * 3) * 10, 92, '#ffffff', { a: 0.6 + 0.4 * Math.abs(shake), rot: shake > 0 ? -0.1 : 0.1 });
  if (t > tBu - 0.1 && t < tEa + 0.4) buffaloCard(t - tBu + 0.1, 1 - ss(tEa, tEa + 0.4, t));
  if (t > tEa && t < tEnd - 1.2) arrowTo(cam, 600, EY, 'ESSE ANIMAL', ss(tEa, tEa + 0.2, t), 1, t);
  const kb = ss(tEnd - 1.2, tEnd - 0.4, t);
  if (kb > 0) characters(cam, () => killer(lerp(-300, 330, kb), 2050, { s: 2.6, back: true }), 'rgba(255,120,100,0.9)', 0.2);
  vignette(main, 0.75);
}
function buffaloCard(k, a) {   // a cartoon buffalo head: "MAIS ALTO QUE UM BÚFALO"
  const s = popS(k, 0.3); main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(790, 330); main.scale(s * 0.9, s * 0.9); main.rotate(0.06);
  const pg = g; g = main;
  rect(-200, -170, 400, 360, '#fff6e0', 30, 8);
  shape('#e8e2d0', () => { g.moveTo(-90, -60); g.quadraticCurveTo(-190, -70, -170, -150); g.quadraticCurveTo(-140, -90, -80, -90); g.closePath(); }, 6);
  shape('#e8e2d0', () => { g.moveTo(90, -60); g.quadraticCurveTo(190, -70, 170, -150); g.quadraticCurveTo(140, -90, 80, -90); g.closePath(); }, 6);
  ell(0, -10, 110, 100, '#6b4128'); shape('#3e2414', () => { g.moveTo(-100, -50); g.quadraticCurveTo(0, -150, 100, -50); g.quadraticCurveTo(0, -80, -100, -50); }, 5);
  ell(-45, -20, 14, 16, '#fff', 0, 4); ell(45, -20, 14, 16, '#fff', 0, 4); ell(-45, -18, 6, 7, OUT, 0, 0); ell(45, -18, 6, 7, OUT, 0, 0);
  ell(0, 55, 70, 42, '#9a6a4a'); ell(-25, 55, 12, 16, '#2a1810', 0, 4); ell(25, 55, 12, 16, '#2a1810', 0, 4);
  for (const sx of [-1, 1]) { main.globalAlpha = a * 0.8; ell(sx * 100, 80, 34, 20, '#ffffff', 0, 0); ell(sx * 140, 70, 22, 14, '#ffffff', 0, 0); main.globalAlpha = a; }
  g = pg; main.restore();
  textOut('BÚFALO', 790, 520, 60, '#ffd23f', { s, a });
}
function sEnd(t) {   // a year later: Bia tells the legend of Pedrinho at the fire (and the masked man is back behind it)
  const tL = W0('lenda', 'end');
  const cam = camL({ x: 520, y: 980, z: 0.95 }, { x: 520, y: 940, z: 1.05 }, ss(T0('end'), TE('end'), t));
  g = main; camera(cam); world(t, { cap: { x: 220, y: GY - 60, r: 0.1, s: 0.8 } }); killer(560, 1010, { s: 0.72, glint: false }); grade(cam);
  lightPool(main, cam, 900, GY - 300, 150, 'rgba(255,250,210,A)', 0.5);
  characters(cam, () => {
    bia(900, GY - 10, { sit: true, flip: true, look: [-0.4, 0], mouth: 'o', armR: [110, -200, 60, -150], phone: false });
    // a framed photo of Pedrinho with a candle, on the log
    g.save(); g.translate(140, GY - 60); rect(-80, -200, 160, 200, '#b88a3e', 8, 6); g.save(); g.beginPath(); g.rect(-62, -182, 124, 164); g.clip(); g.fillStyle = '#9fb6d6'; g.fillRect(-62, -182, 124, 164); bean(0, 120, { s: 0.55, look: [0, 0] }); g.restore(); g.strokeStyle = OUT; g.lineWidth = 5; g.strokeRect(-62, -182, 124, 164); g.restore();
    rect(260, GY - 110, 26, 70, '#f3ece0', 4, 4); shape('#ffd23f', () => { g.moveTo(273, GY - 150); g.quadraticCurveTo(290, GY - 125, 273, GY - 112); g.quadraticCurveTo(256, GY - 125, 273, GY - 150); }, 3);
  }, undefined, 0.3);
  if (t < T0('end') + 1.8) textOut('1 ANO DEPOIS…', 540, 420, 80, '#ffffff', { a: ss(T0('end'), T0('end') + 0.3, t) * (1 - ss(T0('end') + 1.4, T0('end') + 1.8, t)) });
  if (t > tL) textOut('LENDA DO LAGO', 540, 420, 84, '#ffd23f', { s: popS(t - tL) });
  vignette(main, 0.65);
}
function sOutro(t) {   // who's next? + the 3 hidden beans
  const CTA = T0('cta'), F = T0('feijoes');
  main.setTransform(1, 0, 0, 1, 0, 0); const bg = main.createRadialGradient(540, 900, 50, 540, 900, 1100); bg.addColorStop(0, '#2a2440'); bg.addColorStop(1, '#07060e'); main.fillStyle = bg; main.fillRect(0, 0, SW, SH);
  if (t < F) {
    const k = t - CTA; textOut('QUEM É O PRÓXIMO?', 540, 520, 92, '#ffd23f', { s: popS(k, 0.3) });
    for (let i = 0; i < 3; i++) { const kk = clamp((k - 0.4 - i * 0.25) / 0.3); if (kk <= 0) continue; const x = 300 + i * 240, y = 980;
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
function hook(t) {   // the question is on screen while the narrator asks it, and shrinks away as the sentence ends
  const tw = WORDS.filter(w => w.seg === 'title'); const a = tw[0].t0 - 0.35, out = tw[tw.length - 1].t1 - 0.05, gone = out + 0.45;
  if (t < a || t > gone) return;
  const kin = clamp((t - a) / 0.3), sIn = kin < 1 ? kin + Math.sin(kin * Math.PI) * 0.18 : 1;
  const s = sIn * (1 - ss(out, gone, t)); if (s <= 0.001) return;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(540, 760); main.scale(s, s); main.textAlign = 'center'; main.lineJoin = 'round';
  const tx = (str, y, size, fill) => { main.font = `900 ${size}px "Inter Display", Inter`; main.lineWidth = size * 0.18; main.strokeStyle = '#08061a'; main.strokeText(str, 0, y); main.fillStyle = fill; main.fillText(str, 0, y); };
  tx('VOCÊ SOBREVIVERIA', -95, 96, '#ffffff'); tx('AO ASSASSINO', 20, 104, '#ff5a4a'); tx('DA MÁSCARA?', 132, 112, '#ff5a4a');
  main.restore();
}
const SCENES = { title: sTitle, arrive: sArrive, sign: sSign, fire: sFire, wood: sWood, search: sSearch, chase: sChase, hide: sHide, end: sEnd, cta: sOutro, feijoes: sOutro };
function frame(t) {
  TIME = t;
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH);
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t);
  errCards(t);
  // quick dip to black on a few cuts
  for (const n of ['fire', 'end', 'cta']) { const c = T0(n); fade(1 - ss(0, 0.35, Math.abs(t - c)) ); }
  fade(ss(TL.total - 0.6, TL.total, t)); fade(1 - ss(0, 0.5, t));
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
