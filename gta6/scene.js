// Vídeo vertical 1080x1920 — "10 coisas do GTA 6 que não existiam no GTA 5"
// Arte 100% original em canvas (sem logos, personagens ou imagens da Rockstar).
const W = 1080, H = 1920, FPS = 30;
const cv = document.getElementById('c'), X = cv.getContext('2d');
let TL, SC, TOTAL;
const F = '"Inter Display", Inter, "Noto Color Emoji", sans-serif';
const EM = '"Noto Color Emoji", sans-serif';

// ---------- utilidades ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const eb = t => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const seg = (t, a, d) => clamp((t - a) / d);
function R(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function rr(x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, r); }
function txt(s, x, y, size, color, o = {}) {
  X.save(); X.font = `${o.weight || 900} ${size}px ${o.font || F}`; X.textAlign = o.align || 'center'; X.textBaseline = 'middle';
  if (o.glow) { X.shadowColor = o.glow; X.shadowBlur = o.blur || 30; }
  if (o.stroke) { X.lineJoin = 'round'; X.lineWidth = o.stroke; X.strokeStyle = o.sc || '#000'; X.strokeText(s, x, y); }
  X.fillStyle = color; X.fillText(s, x, y);
  if (o.glow && o.twice) X.fillText(s, x, y);
  X.restore();
}
function emoji(e, x, y, size, rot = 0, a = 1) { X.save(); X.globalAlpha *= a; X.translate(x, y); X.rotate(rot); X.font = `${size}px ${EM}`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(e, 0, 0); X.restore(); }
function wordT(id, k) { const ws = TL.words.filter(w => w.seg === id); return ws[Math.min(k, ws.length - 1)].t0; }
function findT(id, re, n = 0) { const ws = TL.words.filter(w => w.seg === id && re.test(w.text)); return ws.length ? ws[Math.min(n, ws.length - 1)].t0 : 1e9; }

// ---------- elementos reutilizáveis ----------
function skyline(seed, baseY, col, winCol, h0 = 200, h1 = 600, t = 0) {
  const r = R(seed); let x = -20;
  while (x < W + 20) {
    const w = 60 + r() * 110, h = h0 + r() * (h1 - h0);
    X.fillStyle = col; X.fillRect(x, baseY - h, w, h + 400);
    if (winCol) { X.fillStyle = winCol;
      for (let yy = baseY - h + 20; yy < baseY - 10; yy += 34) for (let xx = x + 10; xx < x + w - 14; xx += 22) if (r() < 0.38) { X.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + xx * yy); X.fillRect(xx, yy, 9, 14); } X.globalAlpha = 1; }
    x += w + 4;
  }
}
function palm(x, y, s, col, sway = 0) {
  X.save(); X.translate(x, y); X.scale(s, s); X.strokeStyle = col; X.fillStyle = col; X.lineCap = 'round';
  X.lineWidth = 18; X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(30, -200, 10 + sway * 10, -400); X.stroke();
  X.translate(10 + sway * 10, -400);
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.55 + sway * 0.05; X.save(); X.rotate(a);
    X.beginPath(); X.moveTo(0, 0); X.quadraticCurveTo(110, -40, 210, 40); X.quadraticCurveTo(110, 0, 0, 10); X.fill(); X.restore(); }
  X.restore();
}
function sunsetBG(t, top = '#1a0533', mid = '#c2185b', bot = '#ff8f3d') {
  const g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(0.45, mid); g.addColorStop(0.62, bot); g.addColorStop(1, '#14021f');
  X.fillStyle = g; X.fillRect(0, 0, W, H);
}
function synthSun(x, y, r, t) {
  X.save(); const g = X.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#ffe66d'); g.addColorStop(1, '#ff2e88');
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.clip(); X.fillStyle = g; X.fillRect(x - r, y - r, 2 * r, 2 * r);
  X.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) { const yy = y + r * 0.1 + i * r * 0.14 + ((t * 30) % (r * 0.14)); X.fillRect(x - r, yy, 2 * r, 4 + i * 2.2); }
  X.restore();
}
// silhueta humana genérica (original). b = corpulência, m = músculo, f = cabelo longo
function person(x, y, s, col, o = {}) {
  const b = o.b ?? 1, m = o.m ?? 0, step = o.step ?? 0, f = o.f ?? false;
  X.save(); X.translate(x, y); X.scale(s, s); X.fillStyle = col;
  if (o.glow) { X.shadowColor = o.glow; X.shadowBlur = 40; }
  const sw = 44 * b + 20 * m, hw = 36 * b; // ombro / quadril
  // pernas
  X.lineCap = 'round'; X.strokeStyle = col; X.lineWidth = 30 * Math.sqrt(b);
  X.beginPath(); X.moveTo(-14, -200); X.lineTo(-14 - step * 30, 0); X.moveTo(14, -200); X.lineTo(14 + step * 30, 0); X.stroke();
  // tronco
  X.beginPath(); X.moveTo(-sw, -400); X.quadraticCurveTo(-sw - 6 - 18 * (b - 1), -300, -hw, -190); X.lineTo(hw, -190);
  X.quadraticCurveTo(sw + 6 + 18 * (b - 1), -300, sw, -400); X.quadraticCurveTo(0, -420, -sw, -400); X.fill();
  // braços
  X.lineWidth = 22 * Math.sqrt(b) + 12 * m;
  X.beginPath(); X.moveTo(-sw + 6, -392); X.lineTo(-sw - 10 + step * 24, -230); X.moveTo(sw - 6, -392); X.lineTo(sw + 10 - step * 24, -230); X.stroke();
  // cabeça e pescoço
  X.fillRect(-10, -440, 20, 40);
  X.beginPath(); X.ellipse(0, -468, 30, 36, 0, 0, Math.PI * 2); X.fill();
  if (f) { X.beginPath(); X.moveTo(-32, -480); X.quadraticCurveTo(-46, -400, -30, -360); X.lineTo(30, -360); X.quadraticCurveTo(46, -400, 32, -480); X.quadraticCurveTo(0, -520, -32, -480); X.fill(); }
  X.restore();
}
function grainLayer() { const c = document.createElement('canvas'); c.width = 270; c.height = 480; const g = c.getContext('2d'); const d = g.createImageData(270, 480); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 22; } g.putImageData(d, 0, 0); return c; }
const GRAIN = [grainLayer(), grainLayer(), grainLayer(), grainLayer()];

// ---------- selos de status ----------
const TAGS = {
  ok: { t: '✅ CONFIRMADO PELA ROCKSTAR', c: '#19c37d' },
  trailer: { t: '🎬 MOSTRADO NOS TRAILERS', c: '#2f8cff' },
  preview: { t: '👀 VISTO EM PRÉVIAS', c: '#ff9a1f' },
  rumor: { t: '⚠️ VAZAMENTO · NÃO CONFIRMADO', c: '#ff3b3b' },
};
const SRC = {
  n1: 'Fonte: trailers oficiais da Rockstar',
  n2: 'Fonte: Rockstar à Game Informer (set/2026)',
  n3: 'Fonte: Rockstar à Game Informer (set/2026)',
  n4: 'Fonte: site oficial da Rockstar · tamanho: Game Informer',
  n5: 'Fonte: trailers oficiais',
  n6: 'Fonte: trailers oficiais e Game Informer',
  n7: 'Fonte: prévias da imprensa · Rockstar não detalhou',
  n8: 'Fonte: prévias de gameplay (ago/2026)',
  n9: 'Fonte: vazamentos e prévias · aguarde confirmação',
  n10: 'Fonte: Rockstar North em entrevista (ago/2026)',
};

// ---------- cenas ----------
const SCENES = {};

SCENES.hook = (lt, s) => {
  const tQ = findT('hook', /prepara/) - s.start, t10 = findT('hook', /^Essas/) - s.start, t8 = findT('hook', /^E$/) - s.start;
  if (lt < tQ - 0.25) {
    // tela dividida: GTA 5 (cinza) x GTA 6 (neon)
    const sp = eo(seg(lt, 0, 0.5));
    X.save(); X.beginPath(); X.rect(0, 0, W / 2, H); X.clip();
    X.fillStyle = '#2b2f36'; X.fillRect(0, 0, W, H); skyline(3, 1250, '#1b1e23', '#555', 200, 650);
    txt('GTA 5', W / 4, 520 - (1 - sp) * 300, 150, '#c9ced6', { stroke: 12 }); X.restore();
    X.save(); X.beginPath(); X.rect(W / 2, 0, W / 2, H); X.clip();
    sunsetBG(lt); synthSun(W * 0.75, 1000, 220, lt); skyline(9, 1250, '#2a0838', '#ffd36e', 200, 650, lt); palm(W * 0.9, 1300, 0.9, '#12001c', Math.sin(lt * 2));
    txt('GTA 6', W * 0.75, 520 + (1 - sp) * 300, 150, '#fff', { stroke: 12, glow: '#ff2e88' }); X.restore();
    X.fillStyle = '#fff'; X.fillRect(W / 2 - 4, 0, 8, H);
    const q = 1 + 0.12 * Math.sin(lt * 9);
    X.save(); X.translate(W / 2, 830); X.scale(q, q); rr(-90, -90, 180, 180, 90); X.fillStyle = '#ffd400'; X.fill(); txt('=?', 0, 6, 100, '#111'); X.restore();
    txt('SÓ MAIS BONITO?', W / 2, 330, 84, '#fff', { stroke: 14 });
  } else if (lt < t8) {
    const k = lt - tQ; sunsetBG(lt, '#05000d', '#3a0050', '#7a0b4a');
    // raios de luz giratórios
    X.save(); X.translate(W / 2, 800); X.rotate(lt * 0.4);
    for (let i = 0; i < 16; i++) { X.rotate(Math.PI / 8); X.fillStyle = i % 2 ? 'rgba(255,46,136,0.10)' : 'rgba(255,212,0,0.07)'; X.beginPath(); X.moveTo(0, 0); X.lineTo(-120, -1400); X.lineTo(120, -1400); X.fill(); }
    X.restore();
    const z = eb(seg(k, Math.max(0, t10 - tQ) - 0.1, 0.45));
    X.save(); X.translate(W / 2, 760); X.scale(0.2 + 0.8 * z, 0.2 + 0.8 * z);
    txt('10', 0, 0, 520, '#ffd400', { stroke: 26, glow: '#ff2e88', blur: 60 }); X.restore();
    if (k < t10 - tQ) txt('SE PREPARA!', W / 2, 760, 130, '#fff', { stroke: 16, glow: '#ff2e88' });
    else txt('NOVIDADES', W / 2, 1060, 120, '#fff', { stroke: 14 }), txt('que não existiam no GTA 5', W / 2, 1170, 52, '#ffd9ec', { weight: 800, stroke: 8 });
  } else {
    // teaser do número 8: sirene
    const k = lt - t8, blink = Math.floor(lt * 6) % 2;
    X.fillStyle = '#05050c'; X.fillRect(0, 0, W, H);
    const g = X.createRadialGradient(blink ? 200 : 880, 300, 50, blink ? 200 : 880, 300, 1100); g.addColorStop(0, blink ? 'rgba(255,30,50,0.85)' : 'rgba(30,90,255,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    X.fillStyle = g; X.fillRect(0, 0, W, H);
    const z = eb(seg(k, 0, 0.4));
    X.save(); X.translate(W / 2, 720); X.scale(z, z); rr(-250, -250, 500, 500, 60); X.fillStyle = '#fff'; X.fill(); txt('#8', 0, 10, 300, '#e3002b'); X.restore();
    emoji('🚨', W / 2, 360, 160, Math.sin(lt * 12) * 0.15);
    txt('FICA ATÉ LÁ 👀', W / 2, 1100, 86, '#fff', { stroke: 14 });
  }
};

SCENES.n1 = (lt, s) => {
  const tNow = findT('n1', /^Agora/) - s.start;
  sunsetBG(lt); synthSun(W / 2, 980, 330, lt); skyline(21, 1250, '#22052f', '#ffcf6e', 150, 520, lt);
  palm(90, 1280, 1.1, '#100018', Math.sin(lt * 1.7)); palm(1000, 1300, 0.95, '#100018', Math.sin(lt * 1.5 + 1));
  if (lt < tNow) {
    const a = eo(seg(lt, 0.6, 0.4));
    X.globalAlpha = a; rr(120, 420, 840, 600, 40); X.fillStyle = 'rgba(10,10,20,0.72)'; X.fill();
    txt('GTA 5', W / 2, 500, 70, '#aab', { stroke: 0 });
    for (let i = 0; i < 3; i++) person(330 + i * 210, 960, 0.85, '#8a8f9a', { b: [1, 1.05, 0.95][i] });
    txt('3 PROTAGONISTAS', W / 2, 1090, 70, '#fff', { stroke: 12 });
    X.globalAlpha = 1;
  } else {
    const k = lt - tNow, a = eb(seg(k, 0, 0.45));
    X.save(); X.translate(W / 2, 1200); X.scale(a, a);
    person(-120, 0, 1.55, '#0c0014', { glow: '#2ff3ff', b: 1.08 });
    person(120, 0, 1.5, '#0c0014', { glow: '#ff2e88', b: 0.86, f: true });
    X.restore();
    txt('JASON', 300, 1310, 64, '#2ff3ff', { stroke: 10 }); txt('LUCIA', 780, 1310, 64, '#ff7ab8', { stroke: 10 });
    const h = eb(seg(k, 1.0, 0.4)); emoji('❤️‍🔥', W / 2, 540, 150 * h);
  }
};

SCENES.n2 = (lt, s) => {
  const tH = findT('n2', /furac/) - s.start;
  const split = W * (0.5 + 0.06 * Math.sin(lt * 1.3));
  // lado do sol
  let g = X.createLinearGradient(0, 0, 0, 1300); g.addColorStop(0, '#33a8ff'); g.addColorStop(1, '#bfe9ff'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  X.save(); X.translate(830, 560); X.rotate(lt * 0.5); for (let i = 0; i < 12; i++) { X.rotate(Math.PI / 6); X.fillStyle = 'rgba(255,240,150,0.5)'; X.fillRect(150, -10, 90, 20); } X.restore();
  X.beginPath(); X.arc(830, 560, 130, 0, Math.PI * 2); X.fillStyle = '#ffe14d'; X.shadowColor = '#fff3a0'; X.shadowBlur = 60; X.fill(); X.shadowBlur = 0;
  X.fillStyle = '#1fa3a8'; X.fillRect(0, 1150, W, 800); skyline(31, 1160, '#e6f4ff', '#8fd3ff', 100, 380);
  X.fillStyle = '#f5d9a0'; X.fillRect(0, 1250, W, 700); palm(940, 1300, 0.8, '#1b5e20', Math.sin(lt * 1.5));
  // lado da tempestade (recorte diagonal)
  X.save(); X.beginPath(); X.moveTo(0, 0); X.lineTo(split + 120, 0); X.lineTo(split - 120, H); X.lineTo(0, H); X.closePath(); X.clip();
  const fl = (Math.sin(lt * 23) > 0.93 || Math.abs(lt - 1.7) < 0.05) ? 1 : 0;
  g = X.createLinearGradient(0, 0, 0, 1300); g.addColorStop(0, fl ? '#9aa6d6' : '#141a2b'); g.addColorStop(1, fl ? '#6f7aa8' : '#38425c'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  X.fillStyle = '#1c2535'; X.fillRect(0, 1150, W, 800); skyline(31, 1160, '#0e1420', '#334', 100, 380);
  X.fillStyle = '#4c4a44'; X.fillRect(0, 1250, W, 700);
  const rnd = R(5); X.strokeStyle = 'rgba(190,210,255,0.55)'; X.lineWidth = 3;
  for (let i = 0; i < 260; i++) { const x0 = rnd() * W * 1.2, sp = 1800 + rnd() * 900, y0 = (rnd() * H + lt * sp) % H; X.beginPath(); X.moveTo(x0, y0); X.lineTo(x0 - 16, y0 + 48); X.stroke(); }
  for (let i = 0; i < 6; i++) { X.fillStyle = 'rgba(40,46,64,0.95)'; X.beginPath(); X.ellipse(80 + i * 120 + Math.sin(lt + i) * 20, 300 + (i % 2) * 70, 180, 90, 0, 0, Math.PI * 2); X.fill(); }
  if (fl) { X.strokeStyle = '#fff'; X.lineWidth = 8; X.shadowColor = '#bcd'; X.shadowBlur = 30; X.beginPath(); X.moveTo(300, 360); X.lineTo(250, 600); X.lineTo(320, 620); X.lineTo(240, 900); X.stroke(); X.shadowBlur = 0; }
  if (lt > tH) { const k = eb(seg(lt, tH, 0.5)); X.save(); X.translate(300, 700); X.rotate(-lt * 4); X.scale(k, k);
    for (let i = 0; i < 5; i++) { X.strokeStyle = `rgba(230,235,255,${0.8 - i * 0.12})`; X.lineWidth = 26 - i * 3; X.beginPath(); X.arc(0, 0, 40 + i * 50, i, i + 4.2); X.stroke(); } X.restore(); }
  X.restore();
  X.strokeStyle = '#fff'; X.lineWidth = 8; X.beginPath(); X.moveTo(split + 120, 0); X.lineTo(split - 120, H); X.stroke();
  txt('⛈️ TEMPORAL', 270, 1050, 66, '#fff', { stroke: 12 }); txt('☀️ SOL', 830, 1050, 66, '#fff', { stroke: 12 });
  if (lt > tH) txt('🌀 FURACÕES', 300, 470, 78 * eb(seg(lt, tH, 0.4)), '#fff', { stroke: 14, glow: '#9ab' });
};

SCENES.n3 = (lt, s) => {
  let g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#062a1f'); g.addColorStop(0.55, '#0d5c3e'); g.addColorStop(1, '#06281b'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  // vegetação
  const r = R(11); for (let i = 0; i < 40; i++) { X.fillStyle = `rgba(${20 + r() * 30},${90 + r() * 80},${50 + r() * 40},0.6)`; X.beginPath(); X.ellipse(r() * W, 1150 + r() * 200, 80 + r() * 120, 40 + r() * 60, 0, 0, Math.PI * 2); X.fill(); }
  const n = Math.round(170 * eo(seg(lt, 0.3, 1.6)));
  txt(`+${n}`, W / 2, 620, 330, '#ffe14d', { stroke: 22, glow: '#7dff8a', blur: 50 });
  txt('ESPÉCIES', W / 2, 840, 100, '#fff', { stroke: 14 });
  const deco = ['🦅', '🐢', '🐍', '🦜', '🐒', '🐸', '🦀', '🐬'];
  deco.forEach((e, i) => { const a = i / deco.length * Math.PI * 2 + lt * 0.4, rad = 430; const k = eb(seg(lt, 0.2 + i * 0.12, 0.4)); emoji(e, W / 2 + Math.cos(a) * rad, 660 + Math.sin(a) * rad * 0.75, 80 * k); });
  const tJ = findT('n3', /Jacar/) - s.start, tF = findT('n3', /flamingo/) - s.start, tP = findT('n3', /peixe/) - s.start;
  const card = (x, t0, label, draw) => { const k = eb(seg(lt, t0 - 0.05, 0.35)); if (k <= 0) return; X.save(); X.translate(x, 1080); X.scale(k, k); rr(-150, -110, 300, 240, 30); X.fillStyle = 'rgba(0,0,0,0.6)'; X.fill(); X.strokeStyle = '#7dff8a'; X.lineWidth = 5; X.stroke(); draw(); txt(label, 0, 85, 40, '#fff'); X.restore(); };
  card(200, tJ, 'JACARÉ', () => emoji('🐊', 0, -20, 120));
  card(540, tF, 'FLAMINGO', () => emoji('🦩', 0, -20, 120));
  card(880, tP, 'PEIXE-BOI', () => { // peixe-boi desenhado
    X.fillStyle = '#9aa4ad'; X.beginPath(); X.ellipse(-10, -20, 95, 45, 0, 0, Math.PI * 2); X.fill();
    X.beginPath(); X.ellipse(95, -20, 30, 38, 0, 0, Math.PI * 2); X.fill(); X.beginPath(); X.ellipse(-30, 25, 28, 12, 0.6, 0, Math.PI * 2); X.fill();
    X.fillStyle = '#222'; X.beginPath(); X.arc(-75, -30, 6, 0, Math.PI * 2); X.fill(); X.fillStyle = '#b9c2ca'; X.beginPath(); X.ellipse(-100, -10, 18, 14, 0, 0, Math.PI * 2); X.fill(); });
};

SCENES.n4 = (lt, s) => {
  X.fillStyle = '#0a3d62'; X.fillRect(0, 0, W, H);
  // ondas
  X.strokeStyle = 'rgba(255,255,255,0.08)'; X.lineWidth = 4; for (let y = 0; y < H; y += 60) { X.beginPath(); for (let x = 0; x <= W; x += 20) X.lineTo(x, y + Math.sin(x / 60 + lt * 2 + y) * 8); X.stroke(); }
  // península estilizada (abstrata) e 6 regiões
  const regs = [
    { n: 'MOUNT KALAGA', c: '#5d8a3a', p: [[260, 300], [640, 290], [600, 520], [270, 540]], l: [440, 410] },
    { n: 'PORT GELLHORN', c: '#8e6c4a', p: [[640, 290], [900, 320], [880, 520], [600, 520]], l: [760, 420] },
    { n: 'AMBROSIA', c: '#a7b54a', p: [[270, 540], [600, 520], [610, 760], [330, 780]], l: [460, 650] },
    { n: 'GRASSRIVERS', c: '#3f8f6b', p: [[330, 780], [610, 760], [640, 1030], [430, 1060]], l: [510, 910] },
    { n: 'VICE CITY', c: '#ff2e88', p: [[610, 760], [760, 760], [760, 1030], [640, 1030]], l: [870, 900] },
    { n: 'LEONIDA KEYS', c: '#ffd36e', p: [[640, 1060], [700, 1080], [600, 1180], [470, 1230], [440, 1200]], l: [560, 1170] },
  ];
  const tV = findT('n4', /Vice/) - s.start, tK = findT('n4', /Keys/) - s.start, tG = findT('n4', /Grassrivers/) - s.start;
  const order = { 'VICE CITY': tV, 'LEONIDA KEYS': tK, 'GRASSRIVERS': tG };
  const zoom = 1 + 0.04 * Math.sin(lt);
  X.save(); X.translate(W / 2, 760 + 30); X.scale(zoom * 0.94, zoom * 0.94); X.translate(-W / 2, -760);
  regs.forEach((g, i) => {
    const t0 = order[g.n] ?? (0.5 + i * 0.25), k = eo(seg(lt, t0 - 0.6, 0.4)), hot = order[g.n] !== undefined && lt > t0 && lt < t0 + 1.2;
    X.beginPath(); g.p.forEach(([x, y], j) => j ? X.lineTo(x, y) : X.moveTo(x, y)); X.closePath();
    X.fillStyle = g.c; X.globalAlpha = 0.25 + 0.75 * k; if (hot) { X.shadowColor = '#fff'; X.shadowBlur = 50; } X.fill(); X.shadowBlur = 0;
    X.strokeStyle = '#fff'; X.lineWidth = hot ? 9 : 4; X.stroke(); X.globalAlpha = 1;
    txt(g.n, g.l[0], g.l[1], hot ? 42 : 30, '#fff', { stroke: 8 });
  });
  X.restore();
  const k6 = eb(seg(lt, 0.15, 0.4)); txt('6 REGIÕES', W / 2, 380, 96 * k6, '#ffd400', { stroke: 16 });
  const kb = eo(seg(lt, 2.2, 0.4)); X.globalAlpha = kb; rr(560, 1410 - 70, 0, 0, 0);
  X.globalAlpha = 1;
  if (kb > 0) { X.save(); X.globalAlpha = kb; rr(170, 1380 - 190, 740, 96, 48); X.fillStyle = '#ffd400'; X.fill(); txt('MAPA ≈ 2× O DO GTA 5', W / 2, 1238, 52, '#111'); X.restore(); }
};

SCENES.n5 = (lt, s) => {
  let g = X.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#3a0ca3'); g.addColorStop(1, '#f72585'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  const tM = findT('n5', /meme/) - s.start, tF = findT('n5', /^Fez/) - s.start;
  X.save(); X.translate(W / 2, 800); X.rotate(Math.sin(lt * 1.5) * 0.04);
  rr(-260, -520, 520, 1040, 70); X.fillStyle = '#0b0b10'; X.fill(); rr(-236, -492, 472, 984, 50); X.fillStyle = '#16161f'; X.fill();
  X.save(); rr(-236, -492, 472, 984, 50); X.clip();
  const off = (lt * 220) % 330;
  for (let i = -1; i < 4; i++) { const y = -470 + i * 330 - off + 330; const r = R(i + Math.floor(lt * 220 / 330) + 40);
    rr(-210, y, 420, 300, 26); X.fillStyle = `hsl(${r() * 360},70%,${35 + r() * 20}%)`; X.fill();
    X.beginPath(); X.arc(-170, y + 40, 24, 0, Math.PI * 2); X.fillStyle = '#fff'; X.fill();
    X.fillStyle = 'rgba(255,255,255,0.8)'; X.fillRect(-130, y + 30, 160, 16); X.fillRect(-130, y + 54, 100, 12);
    emoji(['🛥️', '🌴', '🚗', '🐊', '💸'][((i % 5) + 5 + Math.floor(lt * 220 / 330)) % 5], 0, y + 170, 110); }
  X.restore();
  X.restore();
  const likes = (lt * 0.4 * Math.max(1, (lt - 1) * 3)).toFixed(1).replace('.', ',');
  rr(620, 1000, 360, 110, 55); X.fillStyle = '#fff'; X.fill(); txt(`❤️ ${likes}M`, 800, 1056, 54, '#e0245e');
  const kv = eb(seg(lt, tF + 0.2, 0.4)); if (kv > 0) { X.save(); X.translate(250, 420); X.rotate(-0.2); X.scale(kv, kv); rr(-180, -70, 360, 140, 30); X.fillStyle = '#ff3b3b'; X.fill(); txt('🔥 VIRAL', 0, 4, 66, '#fff'); X.restore(); }
  const km = eb(seg(lt, tM - 0.05, 0.35)); if (km > 0) { X.save(); X.translate(W / 2, 820); X.rotate(0.12); X.scale(km, km); rr(-420, -110, 840, 220, 30); X.fillStyle = '#ffd400'; X.fill(); X.lineWidth = 10; X.strokeStyle = '#111'; X.stroke(); txt('VIROU MEME 😂', 0, 6, 96, '#111'); X.restore(); }
};

SCENES.n6 = (lt, s) => {
  let g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ff9e6d'); g.addColorStop(0.5, '#ff5e8a'); g.addColorStop(1, '#2b1036'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  skyline(61, 1000, '#5a1d4a', '#ffd36e', 250, 650, lt);
  X.fillStyle = '#3b2a3f'; X.fillRect(0, 1000, W, 400); X.fillStyle = '#5c4660'; X.fillRect(0, 1000, W, 30);
  const r = R(77); const cols = ['#111', '#1d1d2b', '#2a1530', '#101820'];
  for (let i = 0; i < 11; i++) {
    const dir = r() < 0.5 ? 1 : -1, sp = 70 + r() * 90, sc = 0.55 + r() * 0.35, ph = r() * W * 1.6;
    const x = ((ph + dir * lt * sp) % (W * 1.6) + W * 1.6) % (W * 1.6) - W * 0.3, y = 1090 + sc * 260;
    person(x, y, sc, cols[i % 4], { b: 0.75 + r() * 0.6, m: r() < 0.25 ? 0.6 : 0, f: r() < 0.45, step: Math.sin(lt * 7 + i) });
    if (i % 3 === 0) emoji(['☕', '📱', '🐕', '🛹', '🎧'][i % 5], x + 50, y - 520 * sc, 56);
  }
  ['CORPOS', 'ESTILOS', 'ANIMAÇÕES'].forEach((w, i) => { const k = eb(seg(lt, 1.0 + i * 0.45, 0.35)); if (k > 0) { X.save(); X.translate(W / 2, 380 + i * 140); X.scale(k, k); rr(-250, -55, 500, 110, 55); X.fillStyle = 'rgba(0,0,0,0.65)'; X.fill(); txt(w, 0, 4, 64, '#fff'); X.restore(); } });
};

SCENES.mid = (lt, s) => {
  X.fillStyle = '#070008'; X.fillRect(0, 0, W, H);
  const g = X.createRadialGradient(W / 2, 800, 100, W / 2, 800, 1000); g.addColorStop(0, 'rgba(200,0,40,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  const sh = 10 * Math.sin(lt * 60);
  txt('SEGURA', W / 2 + sh - 8, 700, 190, 'rgba(0,255,255,0.7)'); txt('SEGURA', W / 2 + sh + 8, 700, 190, 'rgba(255,0,80,0.7)'); txt('SEGURA', W / 2 + sh, 700, 190, '#fff');
  const k = eo(seg(lt, 0.9, 0.5)); X.globalAlpha = k; txt('#7  #8  #9  #10', W / 2, 920, 92, '#ffd400', { stroke: 10 }); X.globalAlpha = 1;
  emoji('😳', W / 2, 1150, 170 * eb(seg(lt, 1.4, 0.4)));
};

SCENES.n7 = (lt, s) => {
  X.fillStyle = '#20180f'; X.fillRect(0, 0, W, H);
  X.save(); X.translate(W / 2, 800); X.rotate(-0.04);
  rr(-400, -480, 800, 960, 20); X.fillStyle = '#e9dcc0'; X.fill();
  X.fillStyle = '#c94b3a'; X.fillRect(-400, -480, 800, 110); txt('PERFIL CRIMINAL', 0, -425, 66, '#fff');
  rr(-350, -330, 260, 320, 10); X.fillStyle = '#b9ab90'; X.fill(); person(-220, -20, 0.62, '#4a3f30', { f: false });
  X.fillStyle = '#333'; ['NOME', 'ESTILO', 'NÍVEL'].forEach((l, i) => { txt(l, -50, -290 + i * 100, 36, '#5a4a35', { align: 'left' }); X.fillStyle = '#222'; X.fillRect(-50, -260 + i * 100, 360 * eo(seg(lt, 0.6 + i * 0.3, 0.5)), 34); });
  ['AGIR NO CRIME', 'PADRÕES', '???'].forEach((l, i) => { txt(l, -350, 80 + i * 110, 46, '#3b2f20', { align: 'left' }); const w = 300; rr(30, 58 + i * 110, w, 40, 20); X.fillStyle = '#cbbd9f'; X.fill(); rr(30, 58 + i * 110, w * (0.3 + 0.6 * (0.5 + 0.5 * Math.sin(lt * 3 + i * 2))), 40, 20); X.fillStyle = '#c94b3a'; X.fill(); });
  X.restore();
  const tA = findT('n7', /^Mas/) - s.start, k = eb(seg(lt, tA, 0.35));
  if (k > 0) { X.save(); X.translate(W / 2, 900); X.rotate(-0.18); X.scale(k * 1.0, k); X.strokeStyle = '#d0021b'; X.lineWidth = 14; rr(-430, -90, 860, 180, 20); X.stroke(); txt('SEM DETALHES OFICIAIS', 0, 6, 70, '#d0021b'); X.restore(); }
  emoji('🔍', 820 + Math.sin(lt * 2) * 40, 520 + Math.cos(lt * 2) * 30, 170);
};

SCENES.n8 = (lt, s) => {
  const blink = Math.floor(lt * 5) % 2;
  X.fillStyle = '#05060d'; X.fillRect(0, 0, W, H); skyline(81, 1250, '#0b0d18', '#334', 200, 650, lt);
  X.fillStyle = '#111421'; X.fillRect(0, 1250, W, 700);
  let g = X.createRadialGradient(blink ? 150 : 930, 400, 50, blink ? 150 : 930, 400, 1000); g.addColorStop(0, blink ? 'rgba(255,20,40,0.6)' : 'rgba(30,80,255,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  // estrelas de procurado
  for (let i = 0; i < 6; i++) { const on = lt > 0.5 + i * 0.25; X.save(); X.translate(160 + i * 152, 390); X.scale(on ? 1 : 0.8, on ? 1 : 0.8);
    X.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 26 : 62; X.lineTo(Math.cos(a) * r, Math.sin(a) * r); } X.closePath();
    X.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.15)'; X.fill(); X.lineWidth = 6; X.strokeStyle = '#000'; X.stroke(); X.restore(); }
  // ficha de identificação
  const tR = findT('n8', /roupa/) - s.start, tAp = findT('n8', /apar/) - s.start, tC = findT('n8', /carro/) - s.start, tT = findT('n8', /^Trocou/) - s.start;
  const items = [['👕', 'ROUPA', tR], ['🧑', 'APARÊNCIA', tAp], ['🚗', 'CARRO', tC]];
  rr(110, 480, 860, 690, 40); X.fillStyle = 'rgba(8,10,25,0.85)'; X.fill(); X.strokeStyle = '#2f6bff'; X.lineWidth = 5; X.stroke();
  txt('🚔 POLÍCIA REGISTROU:', W / 2, 555, 56, '#fff');
  items.forEach(([e, l, t0], i) => { const y = 690 + i * 155, k = eb(seg(lt, t0 - 0.1, 0.35)); if (k <= 0) return; X.save(); X.translate(0, y); X.globalAlpha = clamp(k);
    emoji(e, 230, 0, 96); txt(l, 320, 0, 64, '#fff', { align: 'left' });
    const changed = i === 0 && lt > tT + 0.3; txt(changed ? '❓' : '✔', 860, 0, 90, changed ? '#ffd400' : '#19c37d', { font: changed ? EM : F }); X.restore(); });
  // medidor de reconhecimento
  const rec = lt < tT + 0.3 ? clamp((lt - tR) / (tC + 0.8 - tR)) : clamp(1 - (lt - tT - 0.3) * 0.8, 0.45);
  txt('RECONHECIMENTO', W / 2, 1210, 44, '#9cf'); rr(160, 1250, 760, 40, 20); X.fillStyle = '#222'; X.fill(); rr(160, 1250, 760 * rec, 40, 20); X.fillStyle = rec > 0.7 ? '#ff3b3b' : '#ffd400'; X.fill();
  // varredura
  X.fillStyle = 'rgba(47,107,255,0.15)'; X.fillRect(110, 480 + ((lt * 400) % 660), 860, 30);
};

SCENES.n9 = (lt, s) => {
  let g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1b2a41'); g.addColorStop(1, '#0c1321'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  const tB = findT('n9', /bazuca/) - s.start, tV = findT('n9', /^Mas/) - s.start;
  emoji('🎒', 340, 760, 380, Math.sin(lt * 2) * 0.05);
  ['💵', '📱', '🔦', '🔧', '🍔'].forEach((e, i) => { const k = eb(seg(lt, 0.4 + i * 0.18, 0.35)); const a = -1.2 + i * 0.6; emoji(e, 340 + Math.cos(a) * 300, 760 + Math.sin(a) * 300, 90 * k); });
  if (lt > tB - 0.1) { const k = eb(seg(lt, tB - 0.1, 0.35)); X.save(); X.translate(800, 760); X.scale(k, k);
    rr(-150, -170, 300, 340, 40); X.fillStyle = '#2c4a7a'; X.fill(); txt('BOLSO', 0, -120, 40, '#cfe'); emoji('🚀', 0, 20, 160, -0.6);
    X.strokeStyle = '#ff2b2b'; X.lineWidth = 22; X.beginPath(); X.moveTo(-130, -130); X.lineTo(130, 150); X.moveTo(130, -130); X.lineTo(-130, 150); X.stroke(); X.restore(); }
  if (lt > tV) { const k = eb(seg(lt, tV, 0.35)); X.save(); X.translate(W / 2, 1180); X.scale(k, k); rr(-400, -70, 800, 140, 30); X.fillStyle = '#ff3b3b'; X.fill(); txt('⚠️ AINDA NÃO CONFIRMADO', 0, 4, 54, '#fff'); X.restore(); }
};

SCENES.n10 = (lt, s) => {
  let g = X.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a0845'); g.addColorStop(1, '#6441a5'); X.fillStyle = g; X.fillRect(0, 0, W, H);
  const tE = findT('n10', /engorda/) - s.start, tM = findT('n10', /músculo/) - s.start, tD = findT('n10', /dormida/) - s.start, tS = findT('n10', /^Quem/) - s.start;
  const b = 1 + 0.55 * eo(seg(lt, tE - 0.3, 0.6)) - 0.45 * eo(seg(lt, tM - 0.3, 0.6)), m = eo(seg(lt, tM - 0.3, 0.6));
  if (lt < tS - 0.1) {
    person(330, 1200, 1.5, '#0d0418', { b, m, glow: '#c77dff' });
    if (lt > tD) emoji('😴', 330, 430, 110 * eb(seg(lt, tD, 0.3)));
    const bars = [['🍔', 'PESO', 0.4 + 0.5 * eo(seg(lt, tE - 0.3, 0.6)) - 0.3 * eo(seg(lt, tM - 0.3, 0.6))], ['💪', 'MÚSCULO', 0.2 + 0.7 * m], ['😴', 'DESCANSO', 0.85 - 0.6 * eo(seg(lt, tD - 0.2, 0.6))]];
    bars.forEach(([e, l, v], i) => { const y = 560 + i * 210; emoji(e, 640, y, 80); txt(l, 700, y - 10, 46, '#fff', { align: 'left' }); rr(640, y + 40, 360, 34, 17); X.fillStyle = 'rgba(255,255,255,0.15)'; X.fill(); rr(640, y + 40, 360 * clamp(v), 34, 17); X.fillStyle = ['#ffb703', '#19c37d', '#4cc9f0'][i]; X.fill(); });
  } else {
    const k = lt - tS + 0.1; X.fillStyle = '#d4a35a'; X.fillRect(0, 0, W, H);
    for (let i = 0; i < 20; i++) { X.fillStyle = `rgba(120,70,20,${0.06 + (i % 3) * 0.03})`; X.fillRect(0, i * 100 + ((lt * 30) % 100), W, 40); }
    const z = eb(seg(k, 0, 0.4)); X.save(); X.translate(W / 2, 720); X.scale(z, z); rr(-440, -220, 880, 440, 40); X.fillStyle = '#1a1208'; X.fill();
    txt('SAN ANDREAS (2004)', 0, -110, 66, '#ffd36e'); txt('JÁ TINHA 💪🍔', 0, 0, 80, '#fff'); txt('GTA 5 NÃO! ❌', 0, 120, 80, '#ff6b6b'); X.restore();
  }
};

SCENES.outro = (lt, s) => {
  sunsetBG(lt, '#0d0221', '#5b0e7a', '#d6336c'); synthSun(W / 2, 1460, 300, lt); skyline(99, 1560, '#12021f', '#ffd36e', 120, 380, lt);
  const tQ = findT('outro', /^qual/) - s.start, tC = findT('outro', /^Comenta/) - s.start;
  if (lt < tQ - 0.2) {
    const z = eb(seg(lt, 0.1, 0.5)); X.save(); X.translate(W / 2, 640); X.scale(z, z);
    txt('SALTO', 0, -90, 210, '#fff', { stroke: 18, glow: '#ff2e88' }); txt('GIGANTESCO', 0, 110, 150, '#ffd400', { stroke: 16 }); X.restore();
    txt('GTA 5  ➜  GTA 6', W / 2, 960, 74, '#fff', { stroke: 10 });
  } else {
    const titles = SC.filter(x => x.num).map(x => x.title); const hot = Math.floor((lt - tQ) * 5) % 10;
    txt('QUAL VOCÊ MAIS QUER?', W / 2, 260, 78, '#fff', { stroke: 12 });
    titles.forEach((tt, i) => { const c = i % 2, r = Math.floor(i / 2), x = 285 + c * 510, y = 400 + r * 132; const k = eb(seg(lt, tQ - 0.2 + i * 0.05, 0.3)); X.save(); X.translate(x, y); X.scale(k, k);
      rr(-240, -54, 480, 108, 30); X.fillStyle = i === hot ? '#ffd400' : 'rgba(0,0,0,0.6)'; X.fill(); txt(`${i + 1}. ${tt}`, 0, 3, 38, i === hot ? '#111' : '#fff'); X.restore(); });
    if (lt > tC - 0.2) { const k = eb(seg(lt, tC - 0.2, 0.4)); X.save(); X.translate(W / 2, 1130); X.scale(k, k); rr(-380, -80, 760, 160, 80); X.fillStyle = '#fff'; X.fill(); txt('💬 COMENTA AÍ 👇', 0, 6, 74, '#111'); X.restore(); }
  }
  txt('Lançamento previsto: 19/11/2026 · PS5 e Xbox Series', W / 2, 1790, 38, '#fff', { weight: 700, stroke: 6 });
};

// ---------- cabeçalho dos itens ----------
function header(s, lt) {
  const sc = SC.find(x => x.id === s.id);
  // barra de progresso 1..10
  for (let i = 0; i < 10; i++) { const on = i < sc.num, cur = i === sc.num - 1; rr(60 + i * 98, 60, 84, 16, 8); X.fillStyle = cur ? '#ffd400' : on ? '#fff' : 'rgba(255,255,255,0.25)'; X.fill(); }
  const k = eb(seg(lt, 0.45, 0.35));
  X.save(); X.translate(150, 215); X.scale(k, k); rr(-95, -95, 190, 190, 40); X.fillStyle = '#ffd400'; X.fill(); X.lineWidth = 8; X.strokeStyle = '#000'; X.stroke(); txt(String(sc.num), 0, 6, sc.num === 10 ? 110 : 130, '#111'); X.restore();
  const kt = eo(seg(lt, 0.5, 0.35));
  X.save(); X.globalAlpha = kt; X.translate((1 - kt) * 200, 0);
  txt(sc.title, 270, 180, sc.title.length > 15 ? 62 : 74, '#fff', { stroke: 14, align: 'left' });
  const tg = TAGS[sc.tag]; X.font = `900 34px ${F}`; const tw = X.measureText(tg.t).width + 50;
  rr(270, 232, tw, 60, 30); X.fillStyle = tg.c; X.fill(); txt(tg.t, 270 + tw / 2, 264, 34, '#fff');
  X.restore();
  txt(SRC[s.id], W / 2, 1855, 30, 'rgba(255,255,255,0.85)', { weight: 700, stroke: 6 });
}
// número gigante batendo na tela no começo de cada item
function slam(s, lt) {
  const sc = SC.find(x => x.id === s.id); if (lt > 0.6) return;
  const k = seg(lt, 0, 0.6), z = lerp(2.6, 1, eo(k / 0.5)), a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
  X.save(); X.globalAlpha = a; X.fillStyle = 'rgba(0,0,0,0.55)'; X.fillRect(0, 0, W, H);
  X.translate(W / 2, 820); X.scale(z, z); txt('#' + sc.num, 0, 0, 380, '#ffd400', { stroke: 24, glow: '#ff2e88', blur: 50 }); X.restore();
}

// ---------- legendas ----------
let CHUNKS = [];
function buildChunks() {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 -]/g, '');
  for (const sc of SC) {
    const ws = TL.words.filter(w => w.seg === sc.id);
    const hlw = new Set(); (sc.hl || []).forEach(p => {
      const pw = norm(p).split(' ');
      for (let i = 0; i + pw.length <= ws.length; i++) if (pw.every((x, j) => norm(ws[i + j].text) === x)) for (let j = 0; j < pw.length; j++) hlw.add(i + j);
    });
    let cur = [];
    ws.forEach((w, i) => {
      cur.push({ ...w, hl: hlw.has(i) });
      const len = cur.map(c => c.text).join(' ').length, end = /[,.?!:]$/.test(w.text);
      if (end || cur.length >= 3 || len > 15 || i === ws.length - 1) { CHUNKS.push({ seg: sc.id, words: cur, t0: cur[0].t0, t1: cur[cur.length - 1].t1 }); cur = []; }
    });
  }
  for (let i = 0; i < CHUNKS.length; i++) CHUNKS[i].tEnd = i + 1 < CHUNKS.length ? Math.min(CHUNKS[i + 1].t0, CHUNKS[i].t1 + 0.6) : CHUNKS[i].t1 + 0.6;
}
function captions(t) {
  const c = CHUNKS.find(c => t >= c.t0 - 0.03 && t < c.tEnd); if (!c) return;
  const pop = eb(seg(t, c.t0 - 0.03, 0.14)), y = 1500, size = 96;
  X.save(); X.font = `900 ${size}px ${F}`;
  const words = c.words.map(w => w.text.toUpperCase());
  const sp = 44, widths = words.map(w => X.measureText(w).width); let tot = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  const sc = Math.min(1, 980 / tot); X.translate(W / 2, y); X.scale(pop * sc, pop * sc); X.rotate(-0.015);
  let x = -tot / 2;
  c.words.forEach((w, i) => {
    const active = t >= w.t0 - 0.03, cx = x + widths[i] / 2;
    X.save(); X.translate(cx, 0); const z = (t >= w.t0 - 0.03 && t < w.t1) ? 1.05 : 1; X.scale(z, z);
    txt(words[i], 0, 0, size, w.hl ? '#ffd400' : active ? '#fff' : 'rgba(255,255,255,0.75)', { stroke: 20, glow: w.hl ? 'rgba(255,120,0,0.6)' : null, blur: 20 });
    X.restore(); x += widths[i] + sp;
  });
  X.restore();
}

// ---------- quadro ----------
window.renderFrame = t => {
  const s = TL.segs.find(x => t >= x.start && t < x.end) || TL.segs[TL.segs.length - 1];
  const lt = t - s.start, isItem = s.id.startsWith('n');
  const beat = 60 / TL.bpm, bp = Math.pow(1 - ((t % beat) / beat), 4);
  X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = '#000'; X.fillRect(0, 0, W, H);
  // câmera: punch-in no corte, pulso na batida, tremor no impacto
  const punch = 1 + 0.14 * (1 - eo(seg(lt, 0, 0.45)));
  const zoom = punch * (1 + 0.012 * bp * (t > TL.segs[0].end ? 1 : 0.3)) * (1 + 0.02 * Math.sin(lt * 0.6));
  const shake = (isItem ? 1 : 0.4) * 18 * Math.max(0, 1 - lt / 0.35);
  const r = R(Math.floor(t * 60));
  X.save(); X.translate(W / 2 + (r() - 0.5) * shake, H / 2 + (r() - 0.5) * shake); X.scale(zoom, zoom); X.translate(-W / 2, -H / 2);
  SCENES[s.scene](lt, s);
  X.restore();
  // escurece o fundo atrás das legendas
  const g = X.createLinearGradient(0, 1300, 0, 1920); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.4, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.75)'); X.fillStyle = g; X.fillRect(0, 1300, W, 620);
  if (isItem) { const tg = X.createLinearGradient(0, 0, 0, 340); tg.addColorStop(0, 'rgba(0,0,0,0.7)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = tg; X.fillRect(0, 0, W, 340); header(s, lt); slam(s, lt); }
  captions(t);
  // flash de transição + aberração cromática
  const fl = 1 - seg(lt, 0, 0.16); if (fl > 0 && s !== TL.segs[0]) { X.fillStyle = `rgba(255,255,255,${0.75 * fl})`; X.fillRect(0, 0, W, H); }
  // vinheta, scanlines e granulação
  const v = X.createRadialGradient(W / 2, H / 2, 500, W / 2, H / 2, 1250); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); X.fillStyle = v; X.fillRect(0, 0, W, H);
  X.fillStyle = 'rgba(0,0,0,0.06)'; for (let y = 0; y < H; y += 6) X.fillRect(0, y, W, 2);
  X.imageSmoothingEnabled = false; X.drawImage(GRAIN[Math.floor(t * 30) % 4], 0, 0, W, H); X.imageSmoothingEnabled = true;
  // fade final
  const fo = seg(t, TL.total - 0.8, 0.8); if (fo > 0) { X.fillStyle = `rgba(0,0,0,${fo})`; X.fillRect(0, 0, W, H); }
};

(async () => {
  TL = await (await fetch('timeline.json')).json(); SC = await (await fetch('script.json')).json(); TOTAL = TL.total;
  await document.fonts.load(`900 80px "Inter Display"`); await document.fonts.load(`80px "Noto Color Emoji"`, '🐊');
  buildChunks(); window.FPS = FPS; window.TOTAL = TOTAL; window.READY = true;
})();
