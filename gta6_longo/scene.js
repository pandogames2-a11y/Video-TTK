// Vídeo horizontal 1920x1080 — "10 coisas do GTA 6 que não existiam no GTA 5" (versão longa)
// Arte 100% original em canvas: sem logos, personagens ou imagens da Rockstar.
const W = 1920, H = 1080, FPS = 30;
const cv = document.getElementById('c'); let X = cv.getContext('2d'); const MAIN = X;
const BUF = document.createElement('canvas'); BUF.width = W; BUF.height = H; const BX = BUF.getContext('2d');
let TL, SC, TOTAL;
const F = '"Inter Display", Inter, "Noto Color Emoji", sans-serif';
const EM = '"Noto Color Emoji", sans-serif';

// ---------- utilidades ----------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const eio = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const eb = t => { t = clamp(t); const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const seg = (t, a, d) => clamp((t - a) / d);
function R(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function rr(x, y, w, h, r) { X.beginPath(); X.roundRect(x, y, w, h, r); }
function txt(s, x, y, size, color, o = {}) {
  X.save(); X.font = `${o.weight || 900} ${size}px ${o.font || F}`; X.textAlign = o.align || 'center'; X.textBaseline = 'middle';
  if (o.glow) { X.shadowColor = o.glow; X.shadowBlur = o.blur || 30; }
  if (o.stroke) { X.lineJoin = 'round'; X.lineWidth = o.stroke; X.strokeStyle = o.sc || '#000'; X.strokeText(s, x, y); }
  X.fillStyle = color; X.fillText(s, x, y); X.restore();
}
function tw(s, size, weight = 900) { X.save(); X.font = `${weight} ${size}px ${F}`; const w = X.measureText(s).width; X.restore(); return w; }
function fit(s, size, maxW, weight = 900) { const w = tw(s, size, weight); return w > maxW ? size * maxW / w : size; }
function emoji(e, x, y, size, rot = 0, a = 1) { if (size <= 0) return; X.save(); X.globalAlpha *= a; X.translate(x, y); X.rotate(rot); X.font = `${size}px ${EM}`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillText(e, 0, 0); X.restore(); }
function arrow(x0, y0, x1, y1, col, w = 10) {
  X.save(); X.strokeStyle = col; X.fillStyle = col; X.lineWidth = w; X.lineCap = 'round';
  X.beginPath(); X.moveTo(x0, y0); X.lineTo(x1, y1); X.stroke();
  const a = Math.atan2(y1 - y0, x1 - x0); X.translate(x1, y1); X.rotate(a); X.beginPath(); X.moveTo(10, 0); X.lineTo(-28, -22); X.lineTo(-28, 22); X.fill(); X.restore();
}

// ---------- elementos de cenário ----------
function skyline(seed, baseY, col, winCol, h0 = 200, h1 = 600, t = 0, x0 = -400, x1 = W + 400) {
  const r = R(seed); let x = x0;
  while (x < x1) {
    const w = 70 + r() * 130, h = h0 + r() * (h1 - h0);
    X.fillStyle = col; X.fillRect(x, baseY - h, w, h + 600);
    if (winCol) { X.fillStyle = winCol;
      for (let yy = baseY - h + 20; yy < baseY - 10; yy += 34) for (let xx = x + 10; xx < x + w - 14; xx += 22) if (r() < 0.36) { X.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2 + xx * 0.7 + yy); X.fillRect(xx, yy, 9, 14); }
      X.globalAlpha = 1; }
    x += w + 5;
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
function grad(stops, y0 = 0, y1 = H) { const g = X.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); X.fillStyle = g; X.fillRect(-500, -300, W + 1000, H + 600); }
function sunset() { grad([[0, '#1a0533'], [0.45, '#c2185b'], [0.66, '#ff8f3d'], [1, '#14021f']]); }
function synthSun(x, y, r, t) {
  X.save(); const g = X.createLinearGradient(0, y - r, 0, y + r); g.addColorStop(0, '#ffe66d'); g.addColorStop(1, '#ff2e88');
  X.beginPath(); X.arc(x, y, r, 0, Math.PI * 2); X.clip(); X.fillStyle = g; X.fillRect(x - r, y - r, 2 * r, 2 * r);
  X.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) { const yy = y + r * 0.1 + i * r * 0.14 + ((t * 30) % (r * 0.14)); X.fillRect(x - r, yy, 2 * r, 4 + i * 2.2); }
  X.restore();
}
function grid(t, y0, col) { // chão synthwave
  X.save(); X.strokeStyle = col; X.lineWidth = 2;
  for (let i = -20; i <= 20; i++) { X.beginPath(); X.moveTo(W / 2 + i * 40, y0); X.lineTo(W / 2 + i * 260, H + 300); X.stroke(); }
  for (let k = 0; k < 14; k++) { const f = ((k + (t * 0.8) % 1) / 14); const y = y0 + Math.pow(f, 2.2) * (H + 300 - y0); X.globalAlpha = f; X.beginPath(); X.moveTo(-500, y); X.lineTo(W + 500, y); X.stroke(); }
  X.restore();
}
// silhueta humana genérica (original). b = corpulência, m = músculo, f = cabelo longo
function person(x, y, s, col, o = {}) {
  const b = o.b ?? 1, m = o.m ?? 0, step = o.step ?? 0, f = o.f ?? false;
  X.save(); X.translate(x, y); X.scale(s, s); X.fillStyle = col;
  if (o.glow) { X.shadowColor = o.glow; X.shadowBlur = 40; }
  const sw = 44 * b + 20 * m, hw = 36 * b;
  X.lineCap = 'round'; X.strokeStyle = col; X.lineWidth = 30 * Math.sqrt(b);
  X.beginPath(); X.moveTo(-14, -200); X.lineTo(-14 - step * 30, 0); X.moveTo(14, -200); X.lineTo(14 + step * 30, 0); X.stroke();
  X.beginPath(); X.moveTo(-sw, -400); X.quadraticCurveTo(-sw - 6 - 18 * (b - 1), -300, -hw, -190); X.lineTo(hw, -190);
  X.quadraticCurveTo(sw + 6 + 18 * (b - 1), -300, sw, -400); X.quadraticCurveTo(0, -420, -sw, -400); X.fill();
  X.lineWidth = 22 * Math.sqrt(b) + 12 * m;
  X.beginPath(); X.moveTo(-sw + 6, -392); X.lineTo(-sw - 10 + step * 24, -230); X.moveTo(sw - 6, -392); X.lineTo(sw + 10 - step * 24, -230); X.stroke();
  X.fillRect(-10, -440, 20, 40); X.beginPath(); X.ellipse(0, -468, 30, 36, 0, 0, Math.PI * 2); X.fill();
  if (f) { X.beginPath(); X.moveTo(-32, -480); X.quadraticCurveTo(-46, -400, -30, -360); X.lineTo(30, -360); X.quadraticCurveTo(46, -400, 32, -480); X.quadraticCurveTo(0, -520, -32, -480); X.fill(); }
  X.restore();
}
function car(x, y, s, col, o = {}) {
  X.save(); X.translate(x, y); X.scale(s * (o.flip ? -1 : 1), s); X.fillStyle = col;
  rr(-200, -90, 400, 80, 30); X.fill();
  X.beginPath(); X.moveTo(-120, -90); X.lineTo(-70, -160); X.lineTo(80, -160); X.lineTo(140, -90); X.fill();
  X.fillStyle = o.win || 'rgba(150,220,255,0.5)'; X.beginPath(); X.moveTo(-100, -95); X.lineTo(-62, -148); X.lineTo(0, -148); X.lineTo(0, -95); X.fill();
  X.beginPath(); X.moveTo(12, -95); X.lineTo(12, -148); X.lineTo(74, -148); X.lineTo(118, -95); X.fill();
  X.fillStyle = '#0a0a0a'; [-120, 120].forEach(wx => { X.beginPath(); X.arc(wx, -10, 40, 0, Math.PI * 2); X.fill(); });
  X.fillStyle = '#888'; [-120, 120].forEach(wx => { X.beginPath(); X.arc(wx, -10, 16, 0, Math.PI * 2); X.fill(); });
  if (o.police) { const b = o.blink; rr(-50, -182, 50, 22, 6); X.fillStyle = b ? '#ff2340' : '#550010'; X.fill(); rr(0, -182, 50, 22, 6); X.fillStyle = b ? '#00174a' : '#2f6bff'; X.fill(); }
  X.restore();
}
function phone(x, y, s, t, rot = 0) {
  X.save(); X.translate(x, y); X.rotate(rot); X.scale(s, s);
  rr(-260, -520, 520, 1040, 70); X.fillStyle = '#0b0b10'; X.fill(); rr(-236, -492, 472, 984, 50); X.fillStyle = '#16161f'; X.fill();
  X.save(); rr(-236, -492, 472, 984, 50); X.clip();
  const sp = 220, off = (t * sp) % 330, base = Math.floor(t * sp / 330);
  for (let i = -1; i < 4; i++) { const y = -470 + i * 330 - off + 330; const r = R(i + base + 40);
    rr(-210, y, 420, 300, 26); X.fillStyle = `hsl(${r() * 360},70%,${35 + r() * 20}%)`; X.fill();
    X.beginPath(); X.arc(-170, y + 40, 24, 0, Math.PI * 2); X.fillStyle = '#fff'; X.fill();
    X.fillStyle = 'rgba(255,255,255,0.8)'; X.fillRect(-130, y + 30, 160, 16); X.fillRect(-130, y + 54, 100, 12);
    emoji(['🛥️', '🌴', '🚗', '🐊', '💸', '🕺', '🏝️'][((i + base) % 7 + 7) % 7], 0, y + 170, 110); }
  X.restore(); X.restore();
}
function weaponWheel(cx, cy, lt, pt) {
  const k = eb(seg(pt, 0.1, 0.4)), items = ['🔫', '🔪', '💣', '🚀', '🏏', '🧨', '🪓', '🔦'], sel = Math.floor(pt * 2.5) % 8;
  X.save(); X.translate(cx, cy); X.scale(k, k);
  for (let i = 0; i < 8; i++) { const a0 = -Math.PI / 2 + i * Math.PI / 4 - Math.PI / 8, a1 = a0 + Math.PI / 4;
    X.beginPath(); X.arc(0, 0, 330, a0 + 0.02, a1 - 0.02); X.arc(0, 0, 130, a1 - 0.05, a0 + 0.05, true); X.closePath();
    X.fillStyle = i === sel ? 'rgba(255,212,0,0.85)' : 'rgba(10,10,20,0.75)'; X.fill(); X.strokeStyle = 'rgba(255,255,255,0.35)'; X.lineWidth = 3; X.stroke();
    const am = (a0 + a1) / 2; emoji(items[i], Math.cos(am) * 230, Math.sin(am) * 230, 84); }
  X.beginPath(); X.arc(0, 0, 120, 0, Math.PI * 2); X.fillStyle = 'rgba(0,0,0,0.8)'; X.fill(); txt('∞', 0, 4, 90, '#ffd400');
  X.restore();
}
let GRAIN;
function grainLayer() { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const g = c.getContext('2d'); const d = g.createImageData(480, 270); for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 14; } g.putImageData(d, 0, 0); return c; }

// ---------- selos ----------
const TAGS = {
  ok: { t: '✅ CONFIRMADO PELA ROCKSTAR', c: '#19c37d' },
  trailer: { t: '🎬 TRAILER / GAMEPLAY OFICIAL', c: '#2f8cff' },
  preview: { t: '👀 VISTO EM PRÉVIAS', c: '#ff9a1f' },
  rumor: { t: '⚠️ VAZAMENTO · NÃO CONFIRMADO', c: '#ff3b3b' },
};
const REG = [
  ['VICE CITY', 'cidade grande, neon, praia e vida noturna', '#ff2e88'],
  ['LEONIDA KEYS', 'arquipélago de ilhas e água azul', '#ffd36e'],
  ['GRASSRIVERS', 'pântano, canais, brejos e muito bicho', '#3f8f6b'],
  ['PORT GELLHORN', 'cidade litorânea decadente', '#8e6c4a'],
  ['AMBROSIA', 'cidade industrial da refinaria de açúcar', '#a7b54a'],
  ['MOUNT KALAGA', 'parque nacional: caça, pesca e trilhas', '#5d8a3a'],
];

// ---------- cenas (coordenadas de mundo 1920x1080; o fundo vaza nas bordas para a câmera poder andar) ----------
const SCENES = {};

SCENES.hook = (lt, s, P) => {
  if (P.v === 'split') {
    const sp = eo(seg(lt, 0, 0.6));
    X.save(); X.beginPath(); X.rect(-500, -300, W / 2 + 500, H + 600); X.clip();
    X.fillStyle = '#2b2f36'; X.fillRect(-500, -300, W, H + 600); skyline(3, 900, '#1b1e23', '#555', 200, 600, 0, -500, W / 2 + 50);
    txt('GTA 5', W / 4, 330 - (1 - sp) * 300, 190, '#c9ced6', { stroke: 14 }); X.restore();
    X.save(); X.beginPath(); X.rect(W / 2, -300, W / 2 + 500, H + 600); X.clip();
    sunset(); synthSun(W * 0.75, 760, 260, lt); skyline(9, 900, '#2a0838', '#ffd36e', 200, 600, lt, W / 2 - 50, W + 500); palm(W * 0.92, 980, 0.9, '#12001c', Math.sin(lt * 2));
    txt('GTA 6', W * 0.75, 330 + (1 - sp) * 300, 190, '#fff', { stroke: 14, glow: '#ff2e88' }); X.restore();
    X.fillStyle = '#fff'; X.fillRect(W / 2 - 5, -300, 10, H + 600);
    const q = 1 + 0.12 * Math.sin(lt * 9); X.save(); X.translate(W / 2, 560); X.scale(q, q); rr(-90, -90, 180, 180, 90); X.fillStyle = '#ffd400'; X.fill(); txt('=?', 0, 6, 100, '#111'); X.restore();
  } else if (P.v === 'sunset') {
    sunset(); synthSun(W / 2, 640, 330, lt); grid(lt, 760, 'rgba(255,60,200,0.6)');
    skyline(19, 770, '#22052f', '#ffcf6e', 120, 420, lt); palm(150, 900, 1.1, '#100018', Math.sin(lt * 1.7)); palm(1780, 920, 1.0, '#100018', Math.sin(lt * 1.5 + 1));
    X.save(); X.translate(W / 2, 540); X.rotate(lt * 0.3); for (let i = 0; i < 16; i++) { X.rotate(Math.PI / 8); X.fillStyle = i % 2 ? 'rgba(255,46,136,0.07)' : 'rgba(255,212,0,0.05)'; X.beginPath(); X.moveTo(0, 0); X.lineTo(-160, -1500); X.lineTo(160, -1500); X.fill(); } X.restore();
  } else {
    const blink = Math.floor(lt * 6) % 2; X.fillStyle = '#05050c'; X.fillRect(-500, -300, W + 1000, H + 600);
    skyline(81, 900, '#0b0d18', '#334', 200, 600, lt);
    const g = X.createRadialGradient(blink ? 300 : 1620, 300, 50, blink ? 300 : 1620, 300, 1300); g.addColorStop(0, blink ? 'rgba(255,30,50,0.8)' : 'rgba(30,90,255,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(-500, -300, W + 1000, H + 600);
    car(W / 2, 1000, 1.4, '#111', { police: true, blink });
  }
};

const YEARS = ['2013', '2023', '2023', '2025', '2026', '2026'];
SCENES.ctx = (lt, s, P) => {
  grad([[0, '#060018'], [0.6, '#24063d'], [1, '#08000f']]);
  txt(YEARS[Math.min(P.pi, 5)], W / 2, 430, 460, 'rgba(255,255,255,0.06)', { stroke: 4, sc: 'rgba(255,46,136,0.35)' });
  skyline(41, 860, '#12031f', '#ffd36e', 150, 480, lt);
  X.fillStyle = '#0a0012'; X.fillRect(-500, 860, W + 1000, 500);
  // rastros de luz na avenida
  for (let i = 0; i < 26; i++) { const r = R(i * 7 + 3), sp = 900 + r() * 900, y = 900 + r() * 140, x = ((r() * 4000 + lt * sp * (i % 2 ? 1 : -1)) % 3000 + 3000) % 3000 - 600;
    X.fillStyle = i % 2 ? 'rgba(255,60,60,0.8)' : 'rgba(255,240,200,0.9)'; X.fillRect(x, y, 160 + r() * 200, 5); }
  if (P.pi === 2) { for (let i = 0; i < 6; i++) emoji('🎵', 200 + i * 300 + Math.sin(lt * 2 + i) * 30, 300 + Math.sin(lt * 3 + i * 2) * 60, 70, Math.sin(lt + i) * 0.3, 0.8); }
};

SCENES.n1 = (lt, s, P) => {
  sunset(); synthSun(W / 2, 680, 360, lt); grid(lt, 800, 'rgba(255,60,200,0.5)'); skyline(21, 810, '#22052f', '#ffcf6e', 120, 380, lt);
  palm(140, 940, 1.15, '#100018', Math.sin(lt * 1.7)); palm(1800, 960, 1.0, '#100018', Math.sin(lt * 1.5 + 1));
  if (P.v === 'tres') {
    for (let i = 0; i < 3; i++) { const x = W / 2 + (i - 1) * 300, k = eb(seg(P.pt, 0.1 + i * 0.25, 0.4)); X.save(); X.globalAlpha = k; person(x, 1000, 1.05, '#8a8f9a', { b: [1, 1.05, 0.95][i] }); X.restore(); }
    // linhas tracejadas entre eles = histórias separadas
    X.save(); X.setLineDash([18, 16]); X.strokeStyle = 'rgba(255,255,255,0.6)'; X.lineWidth = 5; for (let i = 0; i < 2; i++) { X.beginPath(); X.moveTo(W / 2 + (i - 1) * 300 + 70, 700); X.lineTo(W / 2 + i * 300 - 70, 700); X.stroke(); } X.restore();
  } else {
    const k = eb(seg(lt, 0.2, 0.5)), sw = P.v === 'troca' ? (Math.floor(P.pt / 0.8) % 2) : -1;
    X.save(); X.translate(W / 2, 1010); X.scale(k, k);
    person(-150, 0, 1.6, '#0c0014', { glow: sw === 1 ? 'rgba(47,243,255,0.2)' : '#2ff3ff', b: 1.08 });
    person(150, 0, 1.55, '#0c0014', { glow: sw === 0 ? 'rgba(255,46,136,0.2)' : '#ff2e88', b: 0.86, f: true });
    X.restore();
    if (P.v !== 'dupla' || lt > 2) { txt('JASON', W / 2 - 160, 1040, 56, '#2ff3ff', { stroke: 10 }); txt('LUCIA', W / 2 + 160, 1040, 56, '#ff7ab8', { stroke: 10 }); }
    if (P.v === 'troca') { txt('⇄', W / 2, 430, 160, '#ffd400', { stroke: 12, font: F }); }
    if (P.v === 'casal' || P.v === 'dupla') emoji('❤️‍🔥', W / 2, 180, 130 * eb(seg(P.pt, 0.3, 0.4)));
  }
};

SCENES.n2 = (lt, s, P) => {
  const split = W * (0.5 + 0.05 * Math.sin(lt * 1.1));
  grad([[0, '#33a8ff'], [0.75, '#bfe9ff'], [1, '#bfe9ff']], 0, 900);
  X.save(); X.translate(1500, 300); X.rotate(lt * 0.5); for (let i = 0; i < 12; i++) { X.rotate(Math.PI / 6); X.fillStyle = 'rgba(255,240,150,0.5)'; X.fillRect(150, -10, 90, 20); } X.restore();
  X.beginPath(); X.arc(1500, 300, 130, 0, Math.PI * 2); X.fillStyle = '#ffe14d'; X.shadowColor = '#fff3a0'; X.shadowBlur = 60; X.fill(); X.shadowBlur = 0;
  X.fillStyle = '#1fa3a8'; X.fillRect(-500, 800, W + 1000, 600); skyline(31, 810, '#e6f4ff', '#8fd3ff', 100, 340);
  X.fillStyle = '#f5d9a0'; X.fillRect(-500, 900, W + 1000, 500); palm(1750, 960, 0.85, '#1b5e20', Math.sin(lt * 1.5)); palm(1300, 980, 0.7, '#1b5e20', Math.sin(lt * 1.3 + 2));
  X.save(); X.beginPath(); X.moveTo(-500, -300); X.lineTo(split + 160, -300); X.lineTo(split - 160, H + 300); X.lineTo(-500, H + 300); X.closePath(); X.clip();
  const fl = Math.sin(lt * 23) > 0.94 ? 1 : 0;
  grad([[0, fl ? '#9aa6d6' : '#141a2b'], [1, fl ? '#6f7aa8' : '#38425c']], 0, 900);
  X.fillStyle = '#1c2535'; X.fillRect(-500, 800, W + 1000, 600); skyline(31, 810, '#0e1420', '#334', 100, 340);
  X.fillStyle = P.v === 'molhado' ? '#2f3a4a' : '#4c4a44'; X.fillRect(-500, 900, W + 1000, 500);
  if (P.v === 'molhado') { X.fillStyle = 'rgba(150,190,255,0.25)'; for (let i = 0; i < 8; i++) { X.beginPath(); X.ellipse(100 + i * 160, 980 + (i % 3) * 30, 90, 14, 0, 0, Math.PI * 2); X.fill(); } }
  const rnd = R(5); X.strokeStyle = 'rgba(190,210,255,0.55)'; X.lineWidth = 3;
  for (let i = 0; i < 300; i++) { const x0 = rnd() * (W + 800) - 400, sp = 1400 + rnd() * 900, y0 = (rnd() * (H + 300) + lt * sp) % (H + 300) - 150; X.beginPath(); X.moveTo(x0, y0); X.lineTo(x0 - 16, y0 + 48); X.stroke(); }
  for (let i = 0; i < 8; i++) { X.fillStyle = 'rgba(40,46,64,0.95)'; X.beginPath(); X.ellipse(-200 + i * 170 + Math.sin(lt + i) * 25, 120 + (i % 2) * 70, 200, 90, 0, 0, Math.PI * 2); X.fill(); }
  if (fl) { X.strokeStyle = '#fff'; X.lineWidth = 8; X.shadowColor = '#bcd'; X.shadowBlur = 30; X.beginPath(); X.moveTo(500, 180); X.lineTo(450, 420); X.lineTo(520, 440); X.lineTo(440, 760); X.stroke(); X.shadowBlur = 0; }
  if (P.v === 'furacao') { const k = eb(seg(P.pt, 0.3, 0.6)); X.save(); X.translate(480, 470); X.rotate(-lt * 4); X.scale(k, k);
    for (let i = 0; i < 5; i++) { X.strokeStyle = `rgba(230,235,255,${0.8 - i * 0.12})`; X.lineWidth = 26 - i * 3; X.beginPath(); X.arc(0, 0, 40 + i * 55, i, i + 4.2); X.stroke(); } X.restore(); }
  X.restore();
  X.strokeStyle = '#fff'; X.lineWidth = 8; X.beginPath(); X.moveTo(split + 160, -300); X.lineTo(split - 160, H + 300); X.stroke();
  if (P.v === 'local') { txt('⛈️ AQUI', 500, 640, 70, '#fff', { stroke: 12 }); txt('☀️ ALI', 1420, 640, 70, '#fff', { stroke: 12 }); }
};

SCENES.n3 = (lt, s, P) => {
  grad([[0, '#ffb36b'], [0.4, '#e86f4a'], [0.62, '#3c5a3a'], [1, '#0f2a1c']]);
  X.beginPath(); X.arc(W / 2, 520, 170, 0, Math.PI * 2); X.fillStyle = 'rgba(255,230,150,0.9)'; X.fill();
  // árvores ao fundo
  const r = R(11); for (let i = 0; i < 26; i++) { const x = -300 + i * 100 + r() * 40, h = 200 + r() * 160; X.fillStyle = '#20331f'; X.fillRect(x, 640 - h, 14, h); X.beginPath(); X.ellipse(x + 7, 640 - h, 70 + r() * 30, 50 + r() * 20, 0, 0, Math.PI * 2); X.fill(); }
  X.fillStyle = '#1a3a3a'; X.fillRect(-500, 640, W + 1000, 700);
  X.strokeStyle = 'rgba(255,200,150,0.18)'; X.lineWidth = 3; for (let y = 660; y < H + 200; y += 34) { X.beginPath(); for (let x = -500; x <= W + 500; x += 30) X.lineTo(x, y + Math.sin(x / 70 + lt * 2 + y) * 5); X.stroke(); }
  for (let i = 0; i < 30; i++) { const x = -300 + i * 90 + r() * 40; X.strokeStyle = '#2d4a24'; X.lineWidth = 6; X.beginPath(); X.moveTo(x, 700); X.quadraticCurveTo(x + 10, 640, x + 4 + Math.sin(lt + i) * 6, 600); X.stroke(); }
  const show = (v0, f) => { const k = P.v === v0 ? eb(seg(P.pt, 0.2, 0.5)) : 0.0; if (k > 0) f(k); };
  emoji('🐊', 500 + Math.sin(lt * 0.7) * 60, 800, 170);
  emoji('🦩', 1400, 640, 190 * (P.v === 'fauna' ? 0.6 : 1));
  emoji('🦩', 1560, 660, 160 * (P.v === 'fauna' ? 0.6 : 1));
  for (let i = 0; i < 5; i++) { const x = ((lt * 140 + i * 420) % (W + 600)) - 300; emoji('🐦', x, 160 + i * 50 + Math.sin(lt * 3 + i) * 20, 60); }
  show('pantano', k => { X.save(); X.translate(1000, 900); X.scale(k, k); // peixe-boi desenhado
    X.fillStyle = '#8f9aa3'; X.beginPath(); X.ellipse(0, 0, 150, 60, 0, 0, Math.PI * 2); X.fill(); X.beginPath(); X.ellipse(150, 0, 45, 55, 0, 0, Math.PI * 2); X.fill();
    X.beginPath(); X.ellipse(-40, 50, 40, 15, 0.6, 0, Math.PI * 2); X.fill(); X.fillStyle = '#222'; X.beginPath(); X.arc(-110, -15, 8, 0, Math.PI * 2); X.fill();
    X.fillStyle = '#b9c2ca'; X.beginPath(); X.ellipse(-145, 8, 25, 20, 0, 0, Math.PI * 2); X.fill(); X.restore(); });
  show('invasoras', k => { emoji('🦎', 250, 600, 120 * k); emoji('🐒', 1750, 420, 130 * k, Math.sin(lt * 3) * 0.2); });
};

SCENES.n4 = (lt, s, P) => {
  X.fillStyle = '#0a3d62'; X.fillRect(-500, -300, W + 1000, H + 600);
  X.strokeStyle = 'rgba(255,255,255,0.08)'; X.lineWidth = 4; for (let y = -200; y < H + 300; y += 60) { X.beginPath(); for (let x = -500; x <= W + 500; x += 30) X.lineTo(x, y + Math.sin(x / 60 + lt * 2 + y) * 8); X.stroke(); }
  // península estilizada (forma abstrata e original) dividida em 6 regiões
  const regs = [
    { i: 5, p: [[640, 80], [1060, 70], [1030, 300], [650, 320]], l: [850, 195] },
    { i: 3, p: [[1060, 70], [1380, 110], [1350, 310], [1030, 300]], l: [1200, 200] },
    { i: 4, p: [[650, 320], [1030, 300], [1040, 540], [720, 560]], l: [860, 430] },
    { i: 2, p: [[720, 560], [1040, 540], [1080, 820], [850, 850]], l: [930, 690] },
    { i: 0, p: [[1040, 540], [1220, 540], [1230, 820], [1080, 820]], l: [1150, 680] },
    { i: 1, p: [[1080, 860], [1150, 880], [1020, 990], [860, 1040], [830, 1000]], l: [990, 960] },
  ];
  const cur = P.v.startsWith('reg') ? +P.v.slice(3) : -1;
  X.save(); X.translate(960, 470); X.scale(0.8, 0.8); X.translate(-960, -540);
  regs.forEach(g => {
    const [name, , col] = REG[g.i], hot = g.i === cur, seen = cur >= 0 && g.i <= cur;
    X.beginPath(); g.p.forEach(([x, y], j) => j ? X.lineTo(x, y) : X.moveTo(x, y)); X.closePath();
    X.fillStyle = col; X.globalAlpha = hot ? 1 : seen ? 0.75 : 0.35; if (hot) { X.shadowColor = '#fff'; X.shadowBlur = 50 + 20 * Math.sin(lt * 8); } X.fill(); X.shadowBlur = 0;
    X.strokeStyle = '#fff'; X.lineWidth = hot ? 10 : 4; X.stroke(); X.globalAlpha = 1;
    txt(name, g.l[0], g.l[1], hot ? 46 : 32, '#fff', { stroke: 8 });
  });
  X.restore();
};

SCENES.n5 = (lt, s, P) => {
  const g = X.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#3a0ca3'); g.addColorStop(1, '#f72585'); X.fillStyle = g; X.fillRect(-500, -300, W + 1000, H + 600);
  for (let i = 0; i < 14; i++) { const r = R(i + 9), y = ((r() * H - lt * (90 + r() * 120)) % (H + 200) + H + 200) % (H + 200) - 100; emoji(['❤️', '👍', '😂', '🔥'][i % 4], r() * W, y, 50 + r() * 40, 0, 0.7); }
  phone(W / 2, 560, 0.92, lt, Math.sin(lt * 1.3) * 0.04);
  if (P.v === 'gta5') { rr(W / 2 - 300, 60, 600, 90, 20); X.fillStyle = '#3b5998'; X.fill(); txt('Lifeinvader (GTA 5)', W / 2, 106, 44, '#fff'); }
  if (P.v !== 'gta5') { const likes = (P.pt * 0.6 * Math.max(1, P.pt)).toFixed(1).replace('.', ','); rr(W / 2 + 230, 820, 340, 100, 50); X.fillStyle = '#fff'; X.fill(); txt(`❤️ ${likes}M`, W / 2 + 400, 872, 50, '#e0245e'); }
  if (P.v === 'meme') { const km = eb(seg(P.pt, 0.8, 0.35)); X.save(); X.translate(W / 2, 540); X.rotate(0.1); X.scale(km, km); rr(-420, -100, 840, 200, 30); X.fillStyle = '#ffd400'; X.fill(); X.lineWidth = 10; X.strokeStyle = '#111'; X.stroke(); txt('VIROU MEME 😂', 0, 6, 92, '#111'); X.restore(); }
};

SCENES.n6 = (lt, s, P) => {
  grad([[0, '#ff9e6d'], [0.5, '#ff5e8a'], [1, '#2b1036']]);
  skyline(61, 700, '#5a1d4a', '#ffd36e', 250, 600, lt);
  X.fillStyle = '#3b2a3f'; X.fillRect(-500, 700, W + 1000, 600); X.fillStyle = '#5c4660'; X.fillRect(-500, 700, W + 1000, 26);
  const r = R(77), same = P.v === 'iguais'; const cols = ['#111', '#1d1d2b', '#2a1530', '#101820'];
  for (let i = 0; i < 16; i++) {
    const dir = r() < 0.5 ? 1 : -1, sp = 70 + r() * 90, sc = 0.5 + r() * 0.35, ph = r() * (W + 1000);
    const x = ((ph + dir * lt * sp) % (W + 1000) + W + 1000) % (W + 1000) - 500, y = 790 + sc * 260;
    const b = same ? 1 : 0.75 + r() * 0.6, m = same ? 0 : (r() < 0.25 ? 0.6 : 0), f = same ? false : r() < 0.45;
    person(x, y, same ? 0.7 : sc, same ? '#333' : cols[i % 4], { b, m, f, step: Math.sin(lt * 7 + i) });
    if (!same && i % 3 === 0) emoji(['☕', '📱', '🐕', '🛹', '🎧', '🏋️'][i % 6], x + 50, y - 520 * sc, 56);
  }
  if (P.v === 'cumprimentar') { emoji('👋', 560, 300, 140, Math.sin(lt * 8) * 0.3); emoji('😤', 1360, 300, 140); }
};

SCENES.mid = (lt, s, P) => {
  X.fillStyle = '#070008'; X.fillRect(-500, -300, W + 1000, H + 600);
  const g = X.createRadialGradient(W / 2, 540, 100, W / 2, 540, 1100); g.addColorStop(0, P.pi === 0 ? 'rgba(255,0,60,0.45)' : 'rgba(200,0,40,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(-500, -300, W + 1000, H + 600);
  if (P.v === 'segura') { const sh = 10 * Math.sin(lt * 60); ['rgba(0,255,255,0.7)', 'rgba(255,0,80,0.7)', '#fff'].forEach((c, i) => txt('SEGURA', W / 2 + sh + (i - 1) * 10, 300, 200, c)); }
  else { for (let i = 0; i < 8; i++) emoji(['👍', '🔔'][i % 2], 200 + i * 220, 900 + Math.sin(lt * 3 + i) * 30, 80, 0, 0.6); }
};

SCENES.n7 = (lt, s, P) => {
  X.fillStyle = '#20180f'; X.fillRect(-500, -300, W + 1000, H + 600);
  for (let i = 0; i < 20; i++) { X.fillStyle = `rgba(80,60,40,${0.15 + (i % 3) * 0.05})`; X.fillRect(-500, i * 60, W + 1000, 26); }
  const g = X.createRadialGradient(W / 2, 400, 50, W / 2, 400, 900); g.addColorStop(0, 'rgba(255,230,170,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0.5)'); X.fillStyle = g; X.fillRect(-500, -300, W + 1000, H + 600);
  X.save(); X.translate(W / 2, 600); X.rotate(-0.03); X.scale(0.86, 0.86);
  rr(-480, -470, 960, 940, 20); X.fillStyle = '#e9dcc0'; X.fill();
  X.fillStyle = '#c94b3a'; X.fillRect(-480, -470, 960, 110); txt('PERFIL CRIMINAL', 0, -415, 66, '#fff');
  rr(-430, -320, 280, 340, 10); X.fillStyle = '#b9ab90'; X.fill(); person(-290, 0, 0.66, '#4a3f30');
  ['NOME', 'ESTILO', 'NÍVEL'].forEach((l, i) => { txt(l, -100, -290 + i * 105, 36, '#5a4a35', { align: 'left' }); X.fillStyle = '#222'; X.fillRect(-100, -258 + i * 105, 480 * eo(seg(lt, 0.6 + i * 0.3, 0.5)), 34); });
  const labels = P.v === 'niveis' ? ['PROFISSIONAL', 'AGRESSIVO', 'VIOLENTO'] : ['AGIR NO CRIME', 'PADRÕES', '???'];
  labels.forEach((l, i) => { txt(l, -430, 100 + i * 115, 46, '#3b2f20', { align: 'left' }); rr(60, 78 + i * 115, 360, 42, 21); X.fillStyle = '#cbbd9f'; X.fill(); rr(60, 78 + i * 115, 360 * (0.3 + 0.6 * (0.5 + 0.5 * Math.sin(lt * 3 + i * 2))), 42, 21); X.fillStyle = '#c94b3a'; X.fill(); });
  if (P.v === 'niveis') { const k = eb(seg(P.pt, 1.2, 0.35)); X.save(); X.translate(0, 210); X.rotate(-0.16); X.scale(k, k); X.strokeStyle = '#d0021b'; X.lineWidth = 14; rr(-460, -80, 920, 160, 20); X.stroke(); txt('NÃO CONFIRMADO', 0, 6, 80, '#d0021b'); X.restore(); }
  X.restore();
  emoji('🔍', 1550 + Math.sin(lt * 2) * 40, 330 + Math.cos(lt * 2) * 30, 190);
};

SCENES.n8 = (lt, s, P) => {
  const blink = Math.floor(lt * 5) % 2;
  X.fillStyle = '#05060d'; X.fillRect(-500, -300, W + 1000, H + 600); skyline(81, 860, '#0b0d18', '#334', 200, 600, lt);
  X.fillStyle = '#111421'; X.fillRect(-500, 860, W + 1000, 600);
  const g = X.createRadialGradient(blink ? 200 : 1720, 300, 50, blink ? 200 : 1720, 300, 1300); g.addColorStop(0, blink ? 'rgba(255,20,40,0.55)' : 'rgba(30,80,255,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(-500, -300, W + 1000, H + 600);
  const nstars = P.v === 'gta5' ? 5 : 6, lit = P.v === 'gta5' ? (P.pt % 3 < 2 ? Math.min(5, 1 + Math.floor(P.pt * 3)) : 0) : 6;
  for (let i = 0; i < nstars; i++) { const on = i < lit, hollow = P.v === 'vazada' && i === 0; X.save(); X.translate(W / 2 + (i - (nstars - 1) / 2) * 150, 310); const sc = (P.v === 'seis' && i === 5) ? eb(seg(P.pt, 0.8, 0.4)) * 1.2 : 1; X.scale(sc, sc);
    X.beginPath(); for (let j = 0; j < 10; j++) { const a = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 26 : 62; X.lineTo(Math.cos(a) * r, Math.sin(a) * r); } X.closePath();
    X.fillStyle = hollow ? 'rgba(0,0,0,0)' : on ? '#fff' : 'rgba(255,255,255,0.15)'; X.fill(); X.lineWidth = hollow ? 8 : 6; X.strokeStyle = hollow ? '#fff' : '#000'; X.stroke(); X.restore(); }
  if (P.v === 'vazada') { arrow(W / 2 - 560, 480, W / 2 - 430, 370, '#ffd400'); }
  car(P.v === 'rastreador' ? 700 + Math.sin(lt) * 40 : W / 2, 1010, 1.3, '#0d0f1a', { police: true, blink });
  if (P.v === 'rastreador') { txt('📡', 700, 700, 110, '#fff', { font: EM }); X.save(); X.strokeStyle = 'rgba(80,160,255,0.7)'; X.lineWidth = 6; for (let k = 0; k < 3; k++) { const rr2 = ((P.pt * 160 + k * 120) % 360); X.globalAlpha = 1 - rr2 / 360; X.beginPath(); X.arc(700, 700, rr2, 0, Math.PI * 2); X.stroke(); } X.restore(); }
  if (P.v === 'roupa') { const sw = P.pt > 3.2; emoji(sw ? '👔' : '👕', 1500, 560, 150); if (sw) txt('?', 1610, 470, 120, '#ffd400', { stroke: 10 }); }
  if (P.v === 'caes') { const x = 300 + ((P.pt * 500) % 1500); emoji('🐕', x, 900, 150); emoji('🏃', x + 300, 870, 150); }
};

SCENES.n9 = (lt, s, P) => {
  grad([[0, '#1b2a41'], [1, '#0c1321']]);
  X.fillStyle = '#152033'; X.fillRect(-500, 860, W + 1000, 400);
  if (P.v === 'roda') { X.save(); X.translate(960, 540); X.scale(0.92, 0.92); weaponWheel(0, 0, lt, P.pt); X.restore(); }
  else { emoji('🎒', 700, 560, 380, Math.sin(lt * 2) * 0.05);
    ['💵', '📱', '🔦', '🔧', '🍔'].forEach((e, i) => { const k = eb(seg(P.pt, 0.3 + i * 0.12, 0.35)); const a = -1.4 + i * 0.7; emoji(e, 700 + Math.cos(a) * 330, 560 + Math.sin(a) * 300, 90 * k); }); }
  if (P.v === 'bolso') { const k = eb(seg(P.pt, 0.4, 0.35)); X.save(); X.translate(1350, 560); X.scale(k, k);
    rr(-170, -190, 340, 380, 40); X.fillStyle = '#2c4a7a'; X.fill(); txt('BOLSO', 0, -140, 44, '#cfe'); emoji('🚀', 0, 20, 180, -0.6);
    if (P.pt > 2.5) { X.strokeStyle = '#ff2b2b'; X.lineWidth = 24; X.beginPath(); X.moveTo(-150, -150); X.lineTo(150, 170); X.moveTo(150, -150); X.lineTo(-150, 170); X.stroke(); } X.restore(); }
  if (P.v === 'carro') { car(1400, 920, 1.2, '#2a2f3a'); arrow(1000, 520, 1300, 760, '#ffd400'); }
  if (P.v === 'grana') { emoji('💵', 1350, 520, 150); emoji('🤝', 1350, 720, 150); }
};

SCENES.n10 = (lt, s, P) => {
  if (P.v === 'sa') {
    X.fillStyle = '#d4a35a'; X.fillRect(-500, -300, W + 1000, H + 600);
    for (let i = 0; i < 24; i++) { X.fillStyle = `rgba(120,70,20,${0.06 + (i % 3) * 0.03})`; X.fillRect(-500, i * 60 + ((lt * 30) % 60), W + 1000, 26); }
    const bb = 1 + 0.5 * (0.5 + 0.5 * Math.sin(lt * 2));
    person(W / 2 - 250, 1000, 1.4, '#3a2410', { b: bb }); person(W / 2 + 250, 1000, 1.4, '#3a2410', { b: 0.95, m: 1 });
    txt('2004', W / 2, 200, 150, 'rgba(60,30,0,0.35)');
    return;
  }
  grad([[0, '#2a0845'], [1, '#6441a5']]);
  X.fillStyle = '#1d0b30'; X.fillRect(-500, 860, W + 1000, 400);
  for (let i = 0; i < 5; i++) emoji('🏋️', 150 + i * 400, 940, 70, 0, 0.35);
  const b = P.v === 'muda' ? 1 + 0.6 * eo(seg(P.pt, 1.0, 1.0)) - 0.5 * eo(seg(P.pt, 3.6, 1.0)) : 1, m = P.v === 'muda' ? eo(seg(P.pt, 3.6, 1.0)) : (P.v === 'academia' || P.v === 'duvida') ? 1 : 0;
  person(W / 2, 1000, 1.6, '#0d0418', { b, m, glow: '#c77dff' });
  if (P.v === 'muda' && P.pt > 6) emoji('😴', W / 2, 160, 120 * eb(seg(P.pt, 5, 0.3)));
  if (P.v === 'academia') { emoji('💪', W / 2 - 330, 450, 150, Math.sin(lt * 6) * 0.2); emoji('💪', W / 2 + 330, 450, 150, -Math.sin(lt * 6) * 0.2); }
  if (P.v === 'duvida') { txt('?', W / 2 + 300, 300, 240, '#ffd400', { stroke: 14 }); }
};

SCENES.bonus = (lt, s, P) => {
  sunset(); grid(lt, 780, 'rgba(255,60,200,0.5)'); skyline(17, 790, '#22052f', '#ffcf6e', 100, 300, lt);
  // posto de gasolina neon (genérico)
  X.fillStyle = '#1a0a26'; X.fillRect(250, 380, 1420, 50); X.fillStyle = '#ff2e88'; X.fillRect(250, 425, 1420, 10);
  [500, 1420].forEach(x => { X.fillStyle = '#1a0a26'; X.fillRect(x - 15, 430, 30, 560); });
  rr(880, 650, 160, 340, 20); X.fillStyle = '#ffd400'; X.fill(); rr(905, 690, 110, 90, 10); X.fillStyle = '#111'; X.fill(); txt('⛽', 960, 870, 80, '#111', { font: EM });
  car(1300, 1000, 1.2, '#0c0014');
  if (P.pi === 2) ['🚤', '🏁', '🏋️', '🏀'].forEach((e, i) => emoji(e, 300 + i * 440, 230 + Math.sin(lt * 3 + i) * 30, 130 * eb(seg(P.pt, 0.4 + i * 0.5, 0.4))));
};

SCENES.hidden = (lt, s, P) => {
  X.fillStyle = '#050208'; X.fillRect(-500, -300, W + 1000, H + 600);
  const g = X.createRadialGradient(W / 2, 200, 20, W / 2, 600, 700); g.addColorStop(0, 'rgba(255,240,200,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g;
  X.beginPath(); X.moveTo(W / 2 - 80, -100); X.lineTo(W / 2 + 80, -100); X.lineTo(W / 2 + 450, 1000); X.lineTo(W / 2 - 450, 1000); X.fill();
  rr(W / 2 - 260, 640, 520, 340, 30); X.fillStyle = '#3a2a18'; X.fill(); X.fillStyle = '#5a4128'; X.fillRect(W / 2 - 260, 640, 520, 70);
  emoji(['🔒', '💻', '🗺️', '❓', '⏳'][Math.min(P.pi, 4)], W / 2, 520, 200, Math.sin(lt * 2) * 0.05);
  for (let i = 0; i < 10; i++) { const r = R(i + 3); txt('?', r() * W, ((r() * H - lt * 60) % H + H) % H, 60 + r() * 60, `rgba(255,212,0,${0.15 + r() * 0.2})`); }
};

SCENES.nums = (lt, s, P) => {
  X.save(); X.beginPath(); X.rect(-500, -300, W / 2 + 500, H + 600); X.clip();
  X.fillStyle = '#2b2f36'; X.fillRect(-500, -300, W, H + 600); skyline(3, 1000, '#1b1e23', '#555', 150, 450, 0, -500, W / 2 + 50); X.restore();
  X.save(); X.beginPath(); X.rect(W / 2, -300, W / 2 + 500, H + 600); X.clip(); sunset(); skyline(9, 1000, '#2a0838', '#ffd36e', 150, 450, lt, W / 2 - 50, W + 500); X.restore();
  X.fillStyle = '#fff'; X.fillRect(W / 2 - 4, -300, 8, H + 600);
  txt('GTA 5', W / 4, 200, 110, '#c9ced6', { stroke: 12 }); txt('GTA 6', W * 0.75, 200, 110, '#fff', { stroke: 12, glow: '#ff2e88' });
};

SCENES.recap = (lt, s, P) => { sunset(); grid(lt, 760, 'rgba(255,60,200,0.4)'); X.fillStyle = 'rgba(0,0,0,0.55)'; X.fillRect(-500, -300, W + 1000, H + 600); };

SCENES.outro = (lt, s, P) => {
  sunset(); synthSun(W / 2, 760, 380, lt); grid(lt, 840, 'rgba(255,60,200,0.6)'); skyline(99, 850, '#12021f', '#ffd36e', 120, 380, lt);
  palm(160, 1000, 1.1, '#100018', Math.sin(lt * 1.7)); palm(1760, 1010, 1.0, '#100018', Math.sin(lt * 1.5 + 1));
};

// ---------- cartões de informação ----------
function panel(x, y, w, h, col = 'rgba(8,4,20,0.82)', edge = '#ffd400') { X.save(); X.shadowColor = 'rgba(0,0,0,0.6)'; X.shadowBlur = 40; rr(x, y, w, h, 34); X.fillStyle = col; X.fill(); X.restore(); rr(x, y, w, h, 34); X.lineWidth = 5; X.strokeStyle = edge; X.stroke(); }
const TIMEL = [['2013', 'GTA 5'], ['DEZ 2023', 'TRAILER 1'], ['MAI 2025', 'TRAILER 2'], ['AGO 2026', 'GAMEPLAY'], ['SET 2026', 'GAME INFORMER'], ['19 NOV 2026', 'LANÇAMENTO']];
function card(c, pt, dur, side, segObj) {
  const kin = eo(seg(pt, 0.25, 0.5)), kout = 1 - eio(seg(pt, dur - 0.4, 0.35)), k = Math.min(kin, kout); if (k <= 0.01) return;
  const cw = 800, cx = side === 'l' ? 70 : side === 'r' ? W - 70 - cw : (W - cw) / 2;
  X.save(); X.globalAlpha = k; X.translate((side === 'r' ? 1 : side === 'l' ? -1 : 0) * (1 - k) * 160, side === 'c' ? (1 - k) * 60 : 0);
  const L = cx + 50, C = cx + cw / 2, inner = cw - 100;
  switch (c.k) {
    case 'big': { panel(cx, 290, cw, 340); txt(c.a, C, 410, fit(c.a, 92, inner), '#ffd400', { stroke: 10 }); if (c.b) txt(c.b, C, 530, fit(c.b, 46, inner, 800), '#fff', { weight: 800 }); break; }
    case 'stat': { panel(cx, 260, cw, 400); txt(c.n, C, 420, fit(c.n, 190, inner), '#ffd400', { stroke: 12, glow: '#ff2e88', blur: 40 }); txt(c.l, C, 580, fit(c.l, 60, inner), '#fff'); break; }
    case 'vs': {
      panel(cx, 250, cw, 440, 'rgba(8,4,20,0.85)', '#fff');
      rr(cx + 30, 280, 340, 380, 26); X.fillStyle = '#3a3f48'; X.fill(); rr(cx + cw - 370, 280, 340, 380, 26); X.fillStyle = '#7a1253'; X.fill();
      const v = segObj.id === 'n10' ? ['', ''] : ['GTA 5', 'GTA 6'];
      if (v[0]) { txt(v[0], cx + 200, 330, 40, '#c9ced6'); txt(v[1], cx + cw - 200, 330, 40, '#ffb3d9'); }
      const dup = x => x === 'GTA 5' || x === 'GTA 6'; txt(c.a, cx + 200, 470, fit(c.a, 70, 300), '#e5e7eb', { stroke: 8 }); if (!dup(c.as)) txt(c.as || '', cx + 200, 580, fit(c.as || '', 36, 300, 800), '#c9ced6', { weight: 800 });
      const kb = eb(seg(pt, 0.9, 0.4)); X.save(); X.translate(cx + cw - 200, 470); X.scale(kb, kb); txt(c.b, 0, 0, fit(c.b, 70, 300), '#ffd400', { stroke: 8 }); X.restore();
      if (kb > 0.5 && !dup(c.bs)) txt(c.bs || '', cx + cw - 200, 580, fit(c.bs || '', 36, 300, 800), '#fff', { weight: 800 });
      rr(C - 55, 415, 110, 110, 55); X.fillStyle = '#ffd400'; X.fill(); txt('VS', C, 472, 50, '#111'); break; }
    case 'list': {
      const n = c.i.length, h = 150 + n * 100; panel(cx, 470 - h / 2, cw, h);
      txt(c.h, C, 470 - h / 2 + 70, fit(c.h, 54, inner), '#ffd400');
      c.i.forEach((it, j) => { const kk = eb(seg(pt, 0.5 + j * Math.min(1.4, dur / (n + 1.5)), 0.35)); if (kk <= 0) return; X.save(); X.globalAlpha = clamp(kk); const y = 470 - h / 2 + 160 + j * 100;
        rr(L, y - 38, inner, 76, 20); X.fillStyle = 'rgba(255,255,255,0.1)'; X.fill(); txt(it, L + 24 - (1 - kk) * 60, y + 2, fit(it, 44, inner - 50, 800), '#fff', { align: 'left', weight: 800 }); X.restore(); });
      break; }
    case 'im': { panel(cx, 290, cw, 340, 'rgba(0,30,40,0.88)', '#2ff3ff'); txt('🤔 IMAGINA…', C, 360, 42, '#9ff3ff', { weight: 800 }); txt(c.a, C, 465, fit(c.a, 70, inner), '#fff', { stroke: 8 }); txt(c.b, C, 560, fit(c.b, 42, inner, 800), '#ffe9a8', { weight: 800 }); break; }
    case 'op': { panel(cx, 300, cw, 320, 'rgba(30,6,40,0.88)', '#c77dff'); txt('💭 NA MINHA OPINIÃO', C, 380, 42, '#e0b3ff', { weight: 800 }); txt(c.a, C, 510, fit(c.a, 78, inner), '#fff', { stroke: 8 }); break; }
    case 'q': { panel(cx, 290, cw, 340, 'rgba(40,10,0,0.88)', '#ff9a1f'); txt('❓ ' + c.a, C, 410, fit('❓ ' + c.a, 80, inner), '#ffb347', { stroke: 8 }); txt(c.b, C, 530, fit(c.b, 46, inner, 800), '#fff', { weight: 800 }); break; }
    case 'legend': {
      panel(cx, 190, cw, 560); txt('COMO LER OS SELOS', C, 255, 50, '#ffd400');
      ['ok', 'trailer', 'preview', 'rumor'].forEach((tg, j) => { const kk = eb(seg(pt, 0.4 + j * Math.min(1.6, dur / 5), 0.35)); if (kk <= 0) return; const T = TAGS[tg], y = 345 + j * 100, w2 = tw(T.t, 40) + 60;
        X.save(); X.globalAlpha = clamp(kk); rr(C - w2 / 2, y - 36, w2, 72, 36); X.fillStyle = T.c; X.fill(); txt(T.t, C, y + 2, 40, '#fff'); X.restore(); });
      break; }
    case 'time': {
      panel(cx, 250, cw, 440, 'rgba(8,4,20,0.85)', '#2ff3ff');
      const upto = c.i === 1 ? 2 : c.i === 2 ? 5 : 5, show = j => c.i === 2 ? (j <= 2 || j === 5) : c.i === 3 ? true : j <= upto;
      X.strokeStyle = 'rgba(255,255,255,0.3)'; X.lineWidth = 6; X.beginPath(); X.moveTo(L + 20, 300); X.lineTo(L + 20, 650); X.stroke();
      TIMEL.forEach(([d, l], j) => { if (!show(j)) return; const y = 310 + j * 66, hot = (c.i === 1 && j >= 1 && j <= 2) || (c.i === 2 && j === 5) || (c.i === 3 && (j === 3 || j === 4));
        const kk = eb(seg(pt, 0.2 + j * 0.15, 0.3)); X.save(); X.globalAlpha = clamp(kk);
        X.beginPath(); X.arc(L + 20, y, hot ? 16 : 11, 0, Math.PI * 2); X.fillStyle = hot ? '#ffd400' : '#fff'; X.fill();
        txt(d, L + 60, y, 38, hot ? '#ffd400' : '#cfd', { align: 'left' }); txt(l, L + 360, y, 38, '#fff', { align: 'left', weight: 800 }); X.restore(); });
      if (c.i === 2) { const kk = eb(seg(pt, 1.6, 0.35)); X.save(); X.translate(cx + cw - 130, 330); X.rotate(0.15); X.scale(kk, kk); rr(-120, -40, 240, 80, 20); X.fillStyle = '#ff3b3b'; X.fill(); txt('ADIADO 2×', 0, 3, 38, '#fff'); X.restore(); }
      break; }
    case 'reg': {
      const [n, d, col] = REG[c.i]; panel(cx, 330, cw, 280, 'rgba(8,4,20,0.85)', col);
      txt(`${c.i + 1}/6`, L, 380, 36, col, { align: 'left' }); txt(n, C, 450, fit(n, 88, inner), '#fff', { stroke: 10 }); txt(d, C, 545, fit(d, 42, inner, 800), '#ffe9a8', { weight: 800 }); break; }
    case 'sub': {
      panel(cx, 300, cw, 320, 'rgba(10,10,10,0.88)', '#ff0033');
      const k1 = eb(seg(pt, 0.5, 0.3)), k2 = eb(seg(pt, 1.5, 0.3));
      X.save(); X.translate(C - 180, 460); X.scale(k1, k1); rr(-150, -60, 300, 120, 60); X.fillStyle = '#fff'; X.fill(); txt('👍 LIKE', 0, 4, 52, '#111'); X.restore();
      X.save(); X.translate(C + 170, 460); X.scale(k2, k2); rr(-190, -60, 380, 120, 20); X.fillStyle = '#ff0033'; X.fill(); txt('INSCREVA-SE', 0, 4, 44, '#fff'); X.restore();
      if (pt > 2.2) emoji('🔔', C + 330, 360, 70, Math.sin(pt * 20) * 0.4); break; }
    case 'recap': {
      const titles = SC.filter(x => x.num).map(x => x.title), ws = TL.words.filter(w => w.seg === segObj.id);
      const t0 = ws[0].t0, t1 = ws[ws.length - 1].t1, frac = clamp((P_T - t0 - 1.2) / (t1 - t0 - 1.2));
      txt('RECAPITULANDO', W / 2, 150, 70, '#ffd400', { stroke: 10 });
      titles.forEach((tt, i) => { const c2 = i % 2, r2 = Math.floor(i / 2), x = W / 2 - 430 + c2 * 860, y = 270 + r2 * 120, on = frac * 10 >= i;
        rr(x - 400, y - 48, 800, 96, 30); X.fillStyle = on ? '#ffd400' : 'rgba(255,255,255,0.12)'; X.fill(); txt(`${i + 1}. ${tt}`, x, y + 3, 44, on ? '#111' : 'rgba(255,255,255,0.6)'); });
      break; }
    case 'cta': {
      const titles = SC.filter(x => x.num).map(x => x.title), hot = Math.floor(pt * 4) % 10;
      panel((W - 1500) / 2, 110, 1500, 720, 'rgba(8,4,20,0.82)', '#fff');
      txt('QUAL VOCÊ MAIS QUER JOGAR?', W / 2, 190, 64, '#fff', { stroke: 8 });
      titles.forEach((tt, i) => { const c2 = i % 2, r2 = Math.floor(i / 2), x = W / 2 - 360 + c2 * 720, y = 290 + r2 * 92;
        rr(x - 340, y - 38, 680, 76, 24); X.fillStyle = i === hot ? '#ffd400' : 'rgba(255,255,255,0.12)'; X.fill(); txt(`${i + 1}. ${tt}`, x, y + 3, 38, i === hot ? '#111' : '#fff'); });
      const kc = eb(seg(pt, 3.0, 0.4)); X.save(); X.translate(W / 2, 760); X.scale(kc, kc); rr(-330, -48, 660, 96, 48); X.fillStyle = '#ff2e88'; X.fill(); txt('💬 COMENTA AÍ 👇', 0, 4, 52, '#fff'); X.restore();
      break; }
  }
  X.restore();
}
function cardSide(c, segObj, pi) {
  if (!c) return null;
  if (['recap', 'cta'].includes(c.k) || segObj.scene === 'nums') return 'c';
  return pi % 2 ? 'r' : 'l';
}

// ---------- cabeçalho ----------
function seal(tag, x, y, size, align = 'left') {
  const tg = TAGS[tag], w2 = tw(tg.t, size) + size * 1.6, x0 = align === 'center' ? x - w2 / 2 : x;
  rr(x0, y - size * 0.9, w2, size * 1.8, size * 0.9); X.fillStyle = tg.c; X.fill(); txt(tg.t, x0 + w2 / 2, y + 1, size, '#fff');
}
function header(s, lt) {
  const sc = SC.find(x => x.id === s.id);
  if (sc.num) {
    for (let i = 0; i < 10; i++) { const cur = i === sc.num - 1; rr(W - 60 - (10 - i) * 46, 40, 38, 8, 4); X.fillStyle = cur ? '#ffd400' : i < sc.num ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)'; X.fill(); }
    // abertura do item: título grande no centro, depois vira um selo compacto no canto
    const big = Math.min(eo(seg(lt, 0.55, 0.45)), 1 - eio(seg(lt, 2.9, 0.5)));
    if (big > 0.01) {
      X.save(); X.globalAlpha = big * 0.55; X.fillStyle = '#000'; X.fillRect(0, 0, W, H); X.restore();
      X.save(); X.globalAlpha = big; X.translate(0, (1 - big) * 30);
      txt(`NOVIDADE #${sc.num}`, W / 2, 400, 46, '#ffd400', { weight: 900 });
      txt(sc.title, W / 2, 500, fit(sc.title, 120, 1600), '#fff', { stroke: 14, glow: 'rgba(255,46,136,0.6)', blur: 40 });
      seal(sc.tag, W / 2, 610, 32, 'center');
      // brilho atravessando o título
      const sx = lerp(-400, W + 400, seg(lt, 0.9, 1.1)); const g = X.createLinearGradient(sx - 200, 0, sx + 200, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      X.fillStyle = g; X.fillRect(0, 430, W, 140); X.restore();
    }
    const k = eo(seg(lt, 3.1, 0.5));
    if (k > 0.01) { X.save(); X.globalAlpha = k; X.translate((1 - k) * -80, 0);
      rr(50, 50, 84, 84, 20); X.fillStyle = '#ffd400'; X.fill(); txt(String(sc.num), 92, 94, sc.num === 10 ? 52 : 60, '#111');
      txt(sc.title, 152, 78, 38, '#fff', { stroke: 9, align: 'left' }); seal(sc.tag, 152, 116, 20); X.restore(); }
    if (sc.src && lt < 7) { X.save(); X.globalAlpha = Math.min(eo(seg(lt, 3.2, 0.5)), 1 - seg(lt, 6.3, 0.7)); txt(sc.src, W - 40, 1060, 20, 'rgba(255,255,255,0.8)', { weight: 700, align: 'right', stroke: 5 }); X.restore(); }
  }
}
function slam(s, lt) {
  const sc = SC.find(x => x.id === s.id); if (!sc.num || lt > 0.75) return;
  const k = seg(lt, 0, 0.75), z = lerp(3.2, 1, eo(k / 0.5)), a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  X.save(); X.globalAlpha = a; X.fillStyle = 'rgba(0,0,0,0.6)'; X.fillRect(0, 0, W, H);
  X.translate(W / 2, 520); X.scale(z, z); txt('#' + sc.num, 0, 0, 340, '#ffd400', { stroke: 22, glow: '#ff2e88', blur: 50 }); X.restore();
}
// cartão compacto (lower third) para quando há gameplay em tela cheia
function miniCard(c, pt, dur) {
  const lab = c.k === 'vs' ? `${c.a}  →  ${c.b}` : c.k === 'stat' ? `${c.n} ${c.l}` : c.k === 'reg' ? REG[c.i][0] : c.k === 'list' ? `${c.h}: ${c.i[Math.min(c.i.length - 1, Math.floor(clamp((pt - 0.5) / Math.max(1, dur - 1)) * c.i.length))]}` : c.k === 'im' ? `IMAGINA: ${c.a}` : c.k === 'sub' ? 'DEIXA O LIKE 👍' : c.k === 'cta' ? 'COMENTA AÍ 👇' : c.k === 'recap' ? '' : c.a;
  if (!lab) return;
  const k = Math.min(eo(seg(pt, 0.5, 0.5)), 1 - eio(seg(pt, dur - 0.45, 0.35))); if (k <= 0.01) return;
  const size = fit(lab, 44, 1100), w2 = tw(lab, size) + 60;
  X.save(); X.globalAlpha = k; X.translate((1 - k) * -120, 0);
  rr(80, 780, w2, 80, 12); X.fillStyle = 'rgba(8,4,20,0.78)'; X.fill(); X.fillStyle = '#ffd400'; X.fillRect(80, 780, 8, 80);
  txt(lab, 80 + 34, 821, size, '#fff', { align: 'left' }); X.restore();
}

// ---------- legendas ----------
let CHUNKS = [];
function buildChunks() {
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 -]/g, '');
  for (const sc of SC) {
    const ws = TL.words.filter(w => w.seg === sc.id), hlw = new Set();
    (sc.hl || []).forEach(p => { const pw = norm(p).split(' ').filter(Boolean);
      for (let i = 0; i + pw.length <= ws.length; i++) if (pw.every((x, j) => norm(ws[i + j].text) === x)) for (let j = 0; j < pw.length; j++) hlw.add(i + j); });
    let cur = [];
    ws.forEach((w, i) => {
      cur.push({ ...w, hl: hlw.has(i) });
      const len = cur.map(c => c.text).join(' ').length, end = /[,.?!:]$/.test(w.text), nx = ws[i + 1];
      if (end || cur.length >= 5 || len > 26 || !nx || nx.part !== w.part) { CHUNKS.push({ words: cur, t0: cur[0].t0, t1: cur[cur.length - 1].t1 }); cur = []; }
    });
  }
  for (let i = 0; i < CHUNKS.length; i++) CHUNKS[i].tEnd = i + 1 < CHUNKS.length ? Math.min(CHUNKS[i + 1].t0, CHUNKS[i].t1 + 0.6) : CHUNKS[i].t1 + 0.6;
}
let CI = 0;
function captions(t) {
  while (CI > 0 && CHUNKS[CI].t0 - 0.03 > t) CI--;
  while (CI + 1 < CHUNKS.length && CHUNKS[CI + 1].t0 - 0.03 <= t) CI++;
  const c = CHUNKS[CI]; if (!c || t < c.t0 - 0.03 || t >= c.tEnd) return;
  const pop = eo(seg(t, c.t0 - 0.03, 0.12)), y = 1000, size = 62, sp = 26;
  const words = c.words.map(w => w.text.toUpperCase()), widths = words.map(w => tw(w, size)), tot = widths.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  X.save(); const s2 = Math.min(1, 1700 / tot); X.translate(W / 2, y); X.scale(pop * s2, pop * s2);
  let x = -tot / 2;
  c.words.forEach((w, i) => { const active = t >= w.t0 - 0.03; X.save(); X.translate(x + widths[i] / 2, 0); if (t >= w.t0 - 0.03 && t < w.t1) X.scale(1.05, 1.05);
    txt(words[i], 0, 0, size, w.hl ? '#ffd400' : active ? '#fff' : 'rgba(255,255,255,0.78)', { stroke: 16 }); X.restore(); x += widths[i] + sp; });
  X.restore();
}

// ---------- quadro ----------
let P_T = 0;
function framing(segIdx, pi, side) { // enquadramento de cada frase
  const r0 = R((segIdx * 31 + pi * 7 + 5) * 2654435761)(), r1 = R((segIdx * 17 + pi * 13 + 3) * 2246822519)();
  const z = side === 'c' ? 1.02 : !side ? 1.04 + 0.08 * r0 : 1.08 + 0.12 * r0;
  const x = side === 'l' ? 330 : side === 'r' ? -330 : (r0 - 0.5) * 140, y = (r1 - 0.5) * 60 + (z - 1) * 100;
  return { z, x, y, rot: (r1 - 0.5) * 0.02 };
}
window.renderFrame = t => {
  P_T = t;
  const si = Math.max(0, TL.segs.findIndex(x => t >= x.start && t < x.end)), s = TL.segs[si];
  const sc = SC.find(x => x.id === s.id);
  const lt = t - s.start;
  let pi = 0; for (let i = 0; i < s.parts.length; i++) if (t >= s.parts[i]) pi = i;
  const pStart = pi === 0 ? s.start : s.parts[pi], pt = t - pStart, pEnd = pi + 1 < s.parts.length ? s.parts[pi + 1] : s.end, pdur = pEnd - pStart;
  const c = sc.parts[pi].c, side = cardSide(c, s, pi), clip = CLIP_NOW; CLIP_NOW = null;
  // câmera: voa suavemente do enquadramento anterior para o novo (com rastro), depois segue num movimento lento
  const fNew = framing(si, pi, side);
  const fOld = pi > 0 ? framing(si, pi - 1, cardSide(sc.parts[pi - 1].c, s, pi - 1)) : { z: fNew.z * 1.25, x: fNew.x + 700, y: fNew.y, rot: 0.03 };
  const m = eio(seg(pt, 0, pi > 0 ? 0.7 : 0.6)), vel = Math.sin(Math.PI * clamp(pt / (pi > 0 ? 0.7 : 0.6)));
  const drift = pt / Math.max(1, pdur);
  const z = lerp(fOld.z, fNew.z, m) * (1 + 0.05 * drift), x = lerp(fOld.x, fNew.x, m) - 40 * drift, y = lerp(fOld.y, fNew.y, m), rot = lerp(fOld.rot, fNew.rot, m);
  X = BX; X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = '#000'; X.fillRect(0, 0, W, H);
  X.save(); X.translate(W / 2 + x, H / 2 + y); X.rotate(rot); X.scale(z, z); X.translate(-W / 2, -H / 2);
  SCENES[s.scene](lt, s, { pi, pt, pdur, v: sc.parts[pi].v || '' });
  X.restore(); X = MAIN;
  X.setTransform(1, 0, 0, 1, 0, 0); X.drawImage(BUF, 0, 0);
  if (vel > 0.15) { const dx = (fNew.x - fOld.x) * 0.06 * vel + (pi === 0 ? -60 * vel : 0); for (let k = 1; k <= 3; k++) { X.globalAlpha = 0.22 * vel; X.drawImage(BUF, -dx * k, 0); } X.globalAlpha = 1; }
  // trecho de gameplay/trailer: tela cheia, câmera lenta (já vem do prep), faixas de cinema
  let bars = 0;
  if (clip) {
    const ct = pt - clip.lead, dur = clip.n / FPS, a = Math.min(seg(ct, 0, 0.35), 1 - seg(ct, dur - 0.4, 0.4)); bars = a;
    X.save(); X.globalAlpha = a;
    if (clip.still) { // imagem oficial: Ken Burns (aproxima e desliza devagar, direção varia por frase)
      const u = eio(ct / dur), dir = (R(clip.id.length * 97 + clip.part * 31)() < 0.5) ? 1 : -1, zs = lerp(1.0, 1.1, u);
      X.translate(W / 2 + dir * lerp(-50, 50, u), H / 2 + lerp(20, -20, u)); X.scale(zs, zs); X.drawImage(clip.img, -1056, -594, 2112, 1188);
    } else { const zc = 1.03 + 0.06 * (ct / dur); X.translate(W / 2 + 30 * (ct / dur), H / 2); X.scale(zc, zc); X.translate(-W / 2, -H / 2); X.drawImage(clip.img, 0, 0, W, H); }
    X.restore();
    X.save(); X.globalAlpha = 0.15 * a; X.fillStyle = '#2a0a3a'; X.fillRect(0, 0, W, H); X.restore();
  }
  // legibilidade (só onde precisa)
  let g = X.createLinearGradient(0, 860, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.65)'); X.fillStyle = g; X.fillRect(0, 860, W, 220);
  if (sc.num) { g = X.createLinearGradient(0, 0, 0, 180); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(0, 0, W, 180); }
  if (bars > 0) { const bh = 96 * eio(bars); X.fillStyle = '#000'; X.fillRect(0, 0, W, bh); X.fillRect(0, H - bh, W, bh);
    X.save(); X.globalAlpha = bars; const lab = clip.src === 'gta5' ? 'GTA 5 · gameplay' : 'GTA 6 · imagens: Rockstar Games'; txt(lab, W - 40, bh / 2 + 4, 22, 'rgba(255,255,255,0.75)', { weight: 700, align: 'right' }); X.restore(); }
  if (c) { if (clip && c.k !== 'cta' && c.k !== 'recap') miniCard(c, pt, pdur); else card(c, pt, pdur, side, s); }
  if (bars < 0.5) header(s, lt); slam(s, lt); captions(t);
  // flash curto só na virada de novidade
  const fl = si === 0 ? 0 : 0.6 * (1 - seg(lt, 0, 0.16)); if (fl > 0) { X.fillStyle = `rgba(255,255,255,${fl})`; X.fillRect(0, 0, W, H); }
  const v = X.createRadialGradient(W / 2, H / 2, 650, W / 2, H / 2, 1200); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)'); X.fillStyle = v; X.fillRect(0, 0, W, H);
  X.imageSmoothingEnabled = false; X.drawImage(GRAIN, 0, 0, W, H); X.imageSmoothingEnabled = true;
  const fi = 1 - seg(t, 0, 0.6), fo = seg(t, TL.total - 1.2, 1.2), f = Math.max(fi, fo); if (f > 0) { X.fillStyle = `rgba(0,0,0,${f})`; X.fillRect(0, 0, W, H); }
};
// trechos prontos (clips_ready.json, gerado por prep_clips.py): quadro carregado antes de desenhar
let CLIPS = [], CLIP_NOW = null; const IMG = new Map();
async function clipAt(t) {
  const s = TL.segs.find(x => t >= x.start && t < x.end); if (!s || !CLIPS.length) return null;
  let pi = 0; for (let i = 0; i < s.parts.length; i++) if (t >= s.parts[i]) pi = i;
  const c = CLIPS.find(c => c.seg === s.id && c.part === pi); if (!c) return null;
  const ct = t - (pi === 0 ? s.start : s.parts[pi]) - c.lead, k = Math.floor(ct * FPS); if (k < 0 || k >= c.n) return null;
  const url = c.still ? `clips/${c.id}/img.jpg` : `clips/${c.id}/f${String(k + 1).padStart(4, '0')}.jpg`;
  let img = IMG.get(url); if (!img) { img = new Image(); img.src = url; await img.decode(); IMG.set(url, img); if (IMG.size > 90) IMG.delete(IMG.keys().next().value); }
  return { ...c, img };
}
window.frameJPEG = async (t, q) => { CLIP_NOW = await clipAt(t); window.renderFrame(t); return cv.toDataURL('image/jpeg', q); };

(async () => {
  TL = await (await fetch('timeline.json')).json(); SC = await (await fetch('script.json')).json(); TOTAL = TL.total;
  await document.fonts.load(`900 80px "Inter Display"`); await document.fonts.load(`80px "Noto Color Emoji"`, '🐊');
  try { const r = await fetch('clips_ready.json'); if (r.ok) CLIPS = await r.json(); } catch (e) {}
  GRAIN = grainLayer(); buildChunks(); window.FPS = FPS; window.TOTAL = TOTAL; window.READY = true;
})();
