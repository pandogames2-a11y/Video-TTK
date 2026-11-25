// EP11 animation: 3D forest (forest3d.js) + 2D characters (human.js) on top. window.renderFrame(t) draws the frame at time t.
const TL = await (await fetch('timeline.json')).json();
const WORDS = await (await fetch('audio/words.json')).json();
const SEG = n => TL.segs.find(s => s.scene === n);
const T0 = n => SEG(n).start, TE = n => SEG(n).start + SEG(n).dur;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const W0 = (pre, seg) => { const w = WORDS.find(w => w.seg === seg && w.text.toLowerCase().startsWith(pre)); if (!w) console.log('palavra não achada', pre, seg); return w ? w.t0 : 0; };
const PRODUCT = { name: 'CARREGADOR MINI', sub: '10000 mAh • encaixa direto no celular', code: 'LINK NA DESCRIÇÃO' };   // Shopee affiliate link goes in the post description (LEGENDA_POST.txt)
const SCR = { x: SW / 2, y: SH / 2, z: 1 };
function textOut(str, x, y, size, fill, opt = {}) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); if (opt.rot) main.rotate(opt.rot); if (opt.s) main.scale(opt.s, opt.s); main.globalAlpha = opt.a ?? 1; main.textAlign = opt.align || 'center'; main.textBaseline = 'middle'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(str, 0, 0); main.fillStyle = fill; main.fillText(str, 0, 0); main.restore(); }
const popS = (k, d = 0.25) => { const x = clamp(k / d); return x < 1 ? Math.max(0.01, x + Math.sin(x * Math.PI) * 0.25) : 1; };
function fade(a, col = '0,0,0') { if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = `rgba(${col},${a})`; main.fillRect(0, 0, SW, SH); main.restore(); }

// ---------- extra 3D props: the 7th page tree, the exit sign ----------
const PAGE7 = page(-1.25, 1.55, -11.8, 0.5);
function exitSign(x, z) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const c = cv.getContext('2d');
  c.fillStyle = '#e8d8a8'; c.fillRect(0, 0, 256, 96); c.fillStyle = '#7a2a1a'; c.font = '900 52px "Inter Display", Inter'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SAÍDA →', 128, 52);
  const post = inked(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), toon('#5a3a22')); post.position.set(x, 0.7, z);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.04), [toon('#7a4a2c'), toon('#7a4a2c'), toon('#7a4a2c'), toon('#7a4a2c'), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }), toon('#7a4a2c')]); plank.position.set(x, 1.25, z + 0.05); scene.add(plank);
  const glow = new THREE.PointLight('#ffd27a', 2.5, 3, 2); glow.position.set(x, 1.3, z + 0.6); scene.add(glow);
}
exitSign(2.2, -12.2);
const HOME = { cam: [0.6, 1.6, 8], look: [0, 1.6, -4] };

// ---------- helpers ----------
function setCam(pos, look) { cam3.position.set(...pos); cam3.lookAt(...look); cam3.updateMatrixWorld(); }
function draw3D() { renderer.render(scene, cam3); main.setTransform(1, 0, 0, 1, 0, 0); main.clearRect(0, 0, SW, SH); }
function ped(x, z, o = {}) { const [px, py, d] = proj(x, 0, z); characters(SCR, () => pedro(px, py, { s: 1.7 * ppm(d) / 900, ...o }), 'rgba(200,220,255,0.95)', 0.25); }
function slender(x, z, o = {}, rimA = 0.6) { const [px, py, d] = proj(x, 0, z); characters(SCR, () => faceless(px, py, { s: 2.6 * ppm(d) / 1360, ...o }), `rgba(210,215,255,${rimA})`, 0.45); }
let NOISE = null;
function staticFX(a) {   // the faceless man's video static
  if (a <= 0) return; if (!NOISE) { NOISE = mk(); const c = NOISE.getContext('2d'), im = c.createImageData(SW / 4, SH / 4); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; } c.putImageData(im, 0, 0); }
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.imageSmoothingEnabled = false; const ox = (Math.random() * 200) | 0, oy = (Math.random() * 400) | 0;
  main.drawImage(NOISE, ox / 4, oy / 4, SW / 4 - ox / 4, SH / 4 - oy / 4, 0, 0, SW - ox, SH - oy); main.drawImage(NOISE, 0, 0, SW / 4, SH / 4, SW - ox, SH - oy, SW, SH);
  main.globalAlpha = a * 0.5; main.fillStyle = '#000'; for (let y = 0; y < SH; y += 8) main.fillRect(0, y, SW, 3); main.restore();
}
function powerBank(x, y, s = 1, rot = 0, col = '#9fe0b4') {   // the mini power bank (generic, no logo): a rounded pill with a loop strap and 4 LED dots
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.beginPath(); g.moveTo(-40, -70); g.bezierCurveTo(-120, -150, -10, -180, 10, -80); g.lineWidth = 22; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 12; g.strokeStyle = col; g.stroke();   // strap
  rect(-70, -80, 140, 200, col, 50, 7); g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-35, 0, 12, 70, 0, 0, 7); g.fill();
  rect(-22, -110, 44, 34, '#e8ecef', 8, 5);   // the plug on top
  for (let i = 0; i < 4; i++) ell(-24 + i * 16, 40, 5, 5, '#2ee87a', 0, 0);
  g.restore();
}
function productCard(cx, cy, s, a) {   // product card: drawing + name + code + "#publi · link de afiliado"
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(cx, cy); main.scale(s, s);
  main.fillStyle = '#ffffff'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath(); main.roundRect(-420, -150, 840, 300, 36); main.fill(); main.stroke();
  const pg = g; g = main; powerBank(-300, 20, 0.85, -0.15); g = pg;
  main.textAlign = 'left'; main.textBaseline = 'middle'; main.fillStyle = '#1b1430'; main.font = '900 46px "Inter Display", Inter'; main.fillText(PRODUCT.name, -190, -78);
  main.font = '700 32px "Inter Display", Inter'; main.fillStyle = '#5a5470'; main.fillText(PRODUCT.sub, -190, -26);
  main.fillStyle = '#ffd23f'; main.beginPath(); main.roundRect(-195, 14, 590, 74, 18); main.fill(); main.strokeStyle = '#08061a'; main.lineWidth = 5; main.stroke();
  main.fillStyle = '#1b1430'; main.font = '900 40px "Inter Display", Inter'; main.fillText(PRODUCT.code, -175, 52);
  main.font = '700 24px "Inter Display", Inter'; main.fillStyle = '#7a7490'; main.fillText('#publi · link de afiliado Shopee', -190, 118);
  main.restore();
}
function phoneInsert(cx, cy, s, batt, charging, snap, a) {   // a big phone in the corner: battery level, and the power bank snapping into its bottom
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(cx, cy); main.scale(s, s);
  if (snap >= 0) { const pg = g; g = main; powerBank(0, lerp(560, 330, ease(clamp(snap))), 0.9, Math.PI); g = pg; }
  main.fillStyle = '#111216'; main.strokeStyle = '#08061a'; main.lineWidth = 10; main.beginPath(); main.roundRect(-130, -260, 260, 500, 40); main.fill(); main.stroke();
  main.fillStyle = '#0b1030'; main.beginPath(); main.roundRect(-112, -238, 224, 456, 26); main.fill();
  const col = batt < 0.15 ? '#ff3b30' : '#2ee87a';
  main.strokeStyle = '#fff'; main.lineWidth = 8; main.beginPath(); main.roundRect(-70, -60, 140, 70, 12); main.stroke(); main.fillStyle = '#fff'; main.fillRect(70, -36, 12, 22);
  main.fillStyle = col; main.fillRect(-62, -52, Math.max(6, 124 * clamp(batt)), 54);
  main.fillStyle = col; main.font = '900 56px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(Math.round(batt * 100) + '%', 0, 90);
  if (charging) { main.fillStyle = '#ffd23f'; main.strokeStyle = '#08061a'; main.lineWidth = 5; main.beginPath(); main.moveTo(14, -200); main.lineTo(-34, -120); main.lineTo(-4, -120); main.lineTo(-16, -74); main.lineTo(34, -150); main.lineTo(4, -150); main.closePath(); main.fill(); main.stroke(); }
  main.restore();
}
function counters(t) {   // ERROS 0/3 (top right) and PÁGINAS x/8 (top left)
  if (t < T0('enter')) return;
  const errs = TL.err.filter(e => t >= e).length, last = TL.err.filter(e => t >= e).pop();
  const bump = last !== undefined ? popS(t - last, 0.25) : 1;
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  main.translate(SW - 190, 130); main.scale(bump, bump); main.fillStyle = 'rgba(10,8,20,0.75)'; main.strokeStyle = errs ? '#d8261c' : '#ffffff'; main.lineWidth = 5; main.beginPath(); main.roundRect(-150, -42, 300, 84, 42); main.fill(); main.stroke();
  main.fillStyle = errs ? '#ff4a3a' : '#ffffff'; main.font = '900 44px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(`ERROS ${errs}/3`, 0, 2); main.restore();
  let pages = 0; if (t > W0('primeira', 'look')) pages = 1; if (t > W0('sétima', 'selfie')) pages = 7; if (t > W0('nona', 'end')) pages = 9;
  if (t > W0('oito', 'rule') - 0.2) { const over = pages > 8; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(190, 130);
    if (over) { main.scale(popS(t - W0('nona', 'end'), 0.25), popS(t - W0('nona', 'end'), 0.25)); }
    main.fillStyle = 'rgba(10,8,20,0.75)'; main.strokeStyle = over ? '#d8261c' : '#ffffff'; main.lineWidth = 5; main.beginPath(); main.roundRect(-150, -42, 300, 84, 42); main.fill(); main.stroke();
    main.fillStyle = '#f3eedc'; main.strokeStyle = '#08061a'; main.lineWidth = 3; main.fillRect(-120, -24, 34, 46); main.strokeRect(-120, -24, 34, 46);
    main.fillStyle = over ? '#ff4a3a' : '#ffffff'; main.font = '900 44px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText(`${pages}/8`, 30, 2); main.restore(); }
}
function pageInsert(a, t) {   // close-up of page 1: "NÃO OLHE PRA TRÁS" scribbled
  if (a <= 0) return; main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(540, 800); main.rotate(-0.05 + Math.sin(t * 2) * 0.01); main.scale(popS(a, 1), popS(a, 1));
  main.fillStyle = '#efe8d2'; main.strokeStyle = '#08061a'; main.lineWidth = 8; main.beginPath(); main.roundRect(-300, -380, 600, 760, 10); main.fill(); main.stroke();
  main.strokeStyle = '#c9bea0'; main.lineWidth = 3; for (let i = 0; i < 12; i++) { main.beginPath(); main.moveTo(-260, -300 + i * 55); main.lineTo(260, -300 + i * 55); main.stroke(); }
  main.fillStyle = '#1a1414'; main.font = 'italic 900 70px "Inter Display", Inter'; main.textAlign = 'center'; main.fillText('NÃO OLHE', 0, -120); main.fillText('PRA TRÁS', 0, -20);
  main.strokeStyle = '#1a1414'; main.lineWidth = 6; main.beginPath(); main.arc(0, 170, 90, 0, 7); main.stroke(); for (let i = 0; i < 6; i++) { const an = i / 6 * Math.PI * 2; main.beginPath(); main.moveTo(Math.cos(an) * 60, 170 + Math.sin(an) * 60); main.lineTo(Math.cos(an) * 130, 170 + Math.sin(an) * 130); main.stroke(); }   // the creepy symbol
  main.restore();
}

// ---------- scenes ----------
function closeFace(t, amt = 1) {   // cold open / loop frame: the faceless man up close in the static
  setCam([0.1, 2.0, -11.2], [0, 2.15, -14.5]); aimFlash([0, 1.4, -11], [0, 2.0, -14.5], 0.7); draw3D();
  slender(0, -14, { handL: [-160, -700], handR: [160, -700] }, 0.8); staticFX(0.35 * amt + 0.15 * Math.random()); vignette(main, 0.7);
}
function sCold(t) { closeFace(t); }
function sTitle(t) {   // opening: Pedrinho (front right) stares at the faceless man between the trees (the slow zoom is applied in frame())
  setCam([0.25, 1.6, 5.4], [-0.15, 1.55, -6]); aimFlash([0.5, 1.35, 1.6], [-0.7, 1.7, -6.2], 1); draw3D();
  slender(-0.7, -6.2, {}, 0.7);
  ped(0.5, 1.6, { look: [-1, -0.1], phone: 'R', light: true, armR: [150, -480, 160, -560], mouth: 'o', brows: -1, sweat: true, blink: false });
  vignette(main, 0.6);
}
function titleZoom(t) {   // one very slow zoom keyframe on the whole picture (1.00 → 1.12 over ~2.4 s), centred between the two
  const k = ease(clamp((t - T0('title')) / 2.4)), s = 1 + 0.12 * k, cx = 520, cy = 900;
  const gl = document.getElementById('gl'), cc = SHK.getContext('2d'); cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, SW, SH); cc.drawImage(gl, 0, 0); cc.drawImage(main.canvas, 0, 0);
  main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.translate(cx, cy); main.scale(s, s); main.translate(-cx, -cy); main.drawImage(SHK, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0);
}
function sEnter(t) {   // walking in, filming with the phone
  const k = clamp((t - T0('enter')) / (TE('enter') - T0('enter'))), pz = lerp(2, -2.2, k);
  setCam([0.5, 1.5, pz - 3.3], [0, 1.35, pz + 2]); aimFlash([0.3, 1.4, pz - 0.2], [0.5, 1.2, pz - 6], 1); draw3D();
  ped(0, pz, { look: [0.2, -0.2], phone: 'R', light: true, armR: [150, -470, 120, -580], walk: 0.6, phase: t * 7, mouth: 'smile' });
  if (t > W0('gravar', 'enter') - 0.1) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = Math.floor(t * 2) % 2 ? '#ff2a2a' : '#7a1010'; main.beginPath(); main.arc(70, 380, 16, 0, 7); main.fill(); main.restore(); textOut('REC', 140, 380, 40, '#ffffff'); }
  vignette(main, 0.6);
}
function sRule(t) {   // the first page on the tree
  const k = clamp((t - T0('rule')) / (TE('rule') - T0('rule')));
  setCam([-0.4, 1.6, 1.2], [0.7, 1.35, -3.2]); aimFlash([0.2, 1.4, -1.6], [1.3, 1.5, -3.1], 1); draw3D();
  ped(0.1, -1.7, { look: [0.8, -0.2], phone: 'R', light: true, armR: [150, -480, 160, -560], mouth: 'smile' });
  vignette(main, 0.6);
}
function sLook(t) {   // the page says "don't look back"... he looks. The faceless man is right there.
  const L = TL.err[0], ins = ss(W0('escrito', 'look') - 0.2, W0('escrito', 'look') + 0.1, t) * (1 - ss(L - 0.5, L - 0.2, t));
  setCam([0.2, 1.55, 0.9], [0.1, 1.5, -6]); aimFlash([0.3, 1.4, -1.6], [t > L ? -0.4 : 1.2, 1.5, -8], 1); draw3D();
  if (t > L - 0.1) slender(-0.6, -6.5, {}, 0.7);
  ped(0.15, -1.7, { look: t > L ? [-1, -0.2] : [0.8, -0.1], phone: 'R', light: true, armR: [150, -480, 160, -560], mouth: t > L + 0.4 ? 'scream' : t > L ? 'o' : 'smile', sweat: t > L + 0.2, brows: t > L ? -1 : 0 });
  if (t > L + 0.3 && t < L + 0.9) staticFX(0.5 * (1 - (t - L - 0.3) / 0.6));
  pageInsert(ins, t); vignette(main, 0.65);
}
function sCharge(t) {   // the run; the phone light dies... the mini power bank snaps in; light back on; he gets away
  const c0 = T0('charge'), A = W0('apagar', 'charge'), C = W0('carregador', 'charge'), S = TL.snap, LA = (WORDS.find(w => w.seg === 'charge' && w.text.toLowerCase().startsWith('lanterna') && w.t0 > TL.snap) || {}).t0 || TL.snap + 1, F = W0('fugir', 'charge');
  const k = clamp((t - c0) / (TE('charge') - c0)), pz = lerp(-6, 1.5, k);
  const dim = t < A ? 1 : t < S + 0.3 ? (0.25 + 0.2 * (Math.sin(t * 40) > 0.3 ? 1 : 0)) : 1;
  setCam([0.6, 1.5, pz + 3.6], [0, 1.4, pz - 3]); aimFlash([0.3, 1.4, pz + 0.2], [0.2, 1.1, pz + 6], dim); draw3D();
  const back = lerp(4.5, 14, ss(LA, F + 0.6, t)); slender(-0.8, pz - back, {}, 0.5 * (1 - ss(F, F + 0.8, t)));
  ped(0, pz, { look: [0, 0], phone: 'R', light: dim > 0.5, armR: [160, -470, 150 + Math.sin(t * 14) * 30, -540], armL: [-150, -440, -170 - Math.sin(t * 14) * 40, -360], walk: 1, phase: t * 14, mouth: 'scream', sweat: true, brows: -1 });
  fade(0.45 * (1 - dim), '0,0,5');
  const showPh = ss(A - 0.2, A + 0.1, t) * (1 - ss(LA + 0.8, LA + 1.2, t));
  const batt = t < S + 0.3 ? 0.02 : lerp(0.02, 1, ss(S + 0.3, S + 1.4, t));
  phoneInsert(820, 1000, 0.75 * popS(t - A + 0.2, 0.25), batt, t > S + 0.3, t > C - 0.1 ? clamp((t - C + 0.1) / Math.max(0.3, S + 0.2 - C)) : -1, showPh);
  productCard(540, 420, 1.0 * popS(t - C, 0.3), ss(C - 0.05, C + 0.2, t) * (1 - ss(TE('charge') - 0.4, TE('charge'), t)));
  vignette(main, 0.65);
}
function sSelfie(t) {   // the 7th page... he stops for a selfie. The flash shows who's behind him.
  const SH0 = TL.shut, flashA = t > SH0 && t < SH0 + 0.35 ? 1 - (t - SH0) / 0.35 : 0;
  setCam([-0.4, 1.6, -7.6], [-0.9, 1.5, -12.5]); aimFlash([-0.6, 1.5, -10.4], [-0.6, 1.6, -7], 0.3); draw3D();
  if (t > SH0 - 0.02 && t < SH0 + 1.2) slender(0.4, -15.5, {}, 0.6);
  ped(-0.6, -10.6, { look: [0.3, -0.5], phone: 'R', light: false, armR: [150, -520, 120, -700], phoneRot: 3.14, armL: [-150, -460, -110, -560], mouth: t > SH0 + 0.4 ? 'o' : 'smile', sweat: t > SH0 + 0.4 });
  fade(flashA * 0.9, '255,255,255');
  vignette(main, 0.6);
}
function sEighth(t) {   // from behind the faceless man: the 8th page is on his back. Pedrinho stares.
  setCam([0.5, 1.9, -18.6], [0, 1.6, -12]); aimFlash([0, 1.4, -11.6], [0.2, 1.8, -16], 0.8); draw3D();
  ped(0.1, -11.6, { look: [0, -0.4], phone: 'R', light: true, armR: [150, -470, 140, -540], mouth: 'o' });
  slender(0, -15.6, { back: true, page: true }, 0.5);
  vignette(main, 0.65);
}
function sGrab(t) {   // instead of running to the exit sign, he walks up to take the page... and the faceless man turns.
  const P = TL.err[2], GL = TL.glitch;
  if (t > GL) { closeFace(t, 1 + ss(GL, GL + 0.3, t)); return; }
  const k = clamp((t - W0('foi', 'grab')) / (P + 0.3 - W0('foi', 'grab'))), pz = lerp(-11.6, -14.1, ease(k));
  setCam([0.5, 1.9, -18.6], [0.4, 1.6, -12]); aimFlash([0, 1.4, pz], [0.2, 1.8, -16], 0.8); draw3D();
  ped(0.1, pz, { look: [0, -0.5], phone: 'R', light: true, armR: [150, -470, 140, -540], armL: k > 0.6 ? [-150, -520, -60, -700] : undefined, walk: k > 0 && k < 1 ? 0.6 : 0, phase: t * 8, mouth: 'smile' });
  slender(0, -15.6, { back: true, page: true }, 0.5);
  vignette(main, 0.65);
}
function sEnd(t) {   // the ninth page (a drawing of Pedrinho) on a tree; then the power bank on the leaves, still at 100%
  const D = W0('pelo', 'end');
  const look = t < D ? [1.3, 1.5, -3.1] : [0.6, 0.0, -2.4];
  const cp = t < D ? [0.4, 1.55, -1.6] : [0.4, 0.9, -1.0];
  const k = ss(D - 0.2, D + 0.8, t);
  setCam([lerp(0.4, 0.4, k), lerp(1.55, 0.9, k), lerp(-1.6, -1.0, k)], [lerp(1.3, 0.6, k), lerp(1.5, 0.0, k), lerp(-3.1, -2.4, k)]); aimFlash([0, 0.2, -2.0], [0.6, 0, -2.4], 0.5 * k); draw3D();
  // the 9th page: Pedrinho's doodle pinned over page 1
  const [x9, y9, d9] = proj(1.3, 1.5, -3.05); const ps = ppm(d9) / 200;
  characters(SCR, () => { g.save(); g.translate(x9, y9); g.scale(ps, ps); g.rotate(-0.1); rect(-40, -55, 80, 110, '#f3eedc', 3, 4); pedro(0, 45, { s: 0.09, mouth: 'scream', brows: -1, look: [0, 0] }); g.restore(); }, 'rgba(0,0,0,0)', 0.3);
  // the power bank on the ground, LED at 100%
  const [xb, yb, db] = proj(0.6, 0.02, -2.4); const bs = ppm(db) / 900;
  characters(SCR, () => powerBank(xb, yb - 60 * bs, bs, 1.3), 'rgba(140,255,180,0.7)', 0.2);
  if (t > W0('100%', 'end') - 0.2) { textOut('100%', xb, yb - 260 * bs - 40, 70, '#2ee87a', { s: popS(t - W0('100%', 'end') + 0.2) }); }
  vignette(main, 0.6);
}
function forestWide(t) { setCam([0.6, 1.6, 6.4], [0, 1.6, -4]); aimFlash([0, 0.2, -2.0], [0.6, 0, -2.4], 0.4); draw3D(); fade(0.45, '5,4,14'); }
function sCta(t) {
  forestWide(t); const c0 = T0('cta'), Q = W0('e', 'cta') > c0 + 1 ? W0('e', 'cta') : W0('quem', 'cta') - 0.6;
  productCard(540, 760, 1.05 * popS(t - c0, 0.3), 1 - ss(Q - 0.2, Q + 0.1, t));
  if (t < Q) textOut('LINK NA DESCRIÇÃO ↓', 540, 1010, 58, '#ffd23f', { a: ss(c0 + 0.4, c0 + 0.7, t) });
  if (t > Q) { const k = t - Q; textOut('QUEM É O PRÓXIMO?', 540, 520, 92, '#ffd23f', { s: popS(k, 0.3) });
    for (let i = 0; i < 3; i++) { const kk = clamp((k - 0.25 - i * 0.12) / 0.25); if (kk <= 0) continue; const x = 300 + i * 240, y = 980;
      main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.scale(popS(kk * 0.3), popS(kk * 0.3)); main.fillStyle = '#0d0b16'; main.strokeStyle = '#7f6fb0'; main.lineWidth = 6;
      main.beginPath(); main.ellipse(0, -60, 80, 100, 0, 0, 7); main.fill(); main.stroke(); main.beginPath(); main.roundRect(-90, 40, 180, 200, 60); main.fill(); main.stroke(); main.restore();
      textOut('?', x, y - 60, 110, '#ffffff', { s: popS(kk * 0.3) }); }
    const tc = W0('comenta', 'cta'); if (t > tc - 0.2) textOut('COMENTA AÍ! ↓', 540, 1300, 84, '#ffffff', { a: ss(tc - 0.2, tc, t), s: popS(t - tc + 0.2, 0.3) }); }
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
  titleFX(t, tw[0].t0 - 0.3, tw[tw.length - 1].t1 - 0.05, [{ txt: 'VOCÊ SOBREVIVERIA', size: 92, colors: ['#ffffff', '#d9e4ff'] }, { txt: 'AO HOMEM', size: 116, colors: ['#ffffff', '#b9c2d8'] }, { txt: 'SEM ROSTO?', size: 116, colors: ['#ff8a8a', '#d01e2a'] }], 400);
}
const SCENES = { cold: sCold, title: sTitle, enter: sEnter, rule: sRule, look: sLook, charge: sCharge, selfie: sSelfie, eighth: sEighth, grab: sGrab, end: sEnd, cta: sCta };
const SHK = mk();
function frame(t) {
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.globalCompositeOperation = 'source-over';
  const sg = [...TL.segs].reverse().find(s => t >= s.start) || TL.segs[0];
  SCENES[sg.scene](t); if (sg.scene === 'title') titleZoom(t);
  const sh = shakeAmt(t);
  if (sh > 0) { const gl = document.getElementById('gl'); const c = SHK.getContext('2d'); c.clearRect(0, 0, SW, SH); c.drawImage(gl, 0, 0); c.drawImage(main.canvas, 0, 0); main.setTransform(1, 0, 0, 1, 0, 0); main.fillStyle = '#05040c'; main.fillRect(0, 0, SW, SH); main.drawImage(SHK, Math.sin(t * 90) * sh, Math.cos(t * 77) * sh); }
  counters(t); stamps(t);
  for (const n of ['look', 'selfie', 'eighth', 'end']) { const c = T0(n); fade(1 - ss(0, 0.2, Math.abs(t - c))); }
  hook(t);
}
window.renderFrame = t => { frame(t); return true; };
window.TOTAL = TL.total; window.FPS = TL.fps;
await document.fonts.load('900 40px "Inter Display"');
window.READY = true;
