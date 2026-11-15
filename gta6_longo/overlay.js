// Camada de textos no estilo do vídeo de referência: pílulas roxas empilhadas com título cursivo,
// etiqueta de capítulo, abertura com fundo desfocado, frase de impacto vermelha, caixa de comparação
// e medidor de procurado. Desenho e fontes próprios/abertos (Anton, Kaushan Script, Montserrat, Rubik Dirt — OFL).
const FA = '"Anton", "Inter Display", sans-serif', FS = '"Kaushan", cursive', FM = '"Mont", "Inter Display", sans-serif', FG = '"RubikDirt", "Anton", sans-serif';
const SMALL = document.createElement('canvas'); SMALL.width = 480; SMALL.height = 270; const SX = SMALL.getContext('2d');
const TMP = document.createElement('canvas'); TMP.width = 480; TMP.height = 270; const TX = TMP.getContext('2d');
const SNAP = document.createElement('canvas'); SNAP.width = W; SNAP.height = H; const SNX = SNAP.getContext('2d');

function blurBackdrop(amount = 1, dim = 0.35) { // desfoca o que já está na tela (reduz e amplia)
  TX.drawImage(cv, 0, 0, 480, 270); SX.filter = 'blur(7px)'; SX.drawImage(TMP, 0, 0); SX.filter = 'none';
  X.save(); X.globalAlpha = amount; X.imageSmoothingEnabled = true; X.imageSmoothingQuality = 'high';
  X.drawImage(SMALL, -20, -12, W + 40, H + 24); X.globalAlpha = amount * dim; X.fillStyle = '#05010a'; X.fillRect(0, 0, W, H); X.restore();
}
function tx(s, x, y, size, font, color, o = {}) {
  s = clean(s); if (!s) return 0;
  X.save(); X.font = `${o.weight || 400} ${size}px ${font}`; X.textAlign = o.align || 'center'; X.textBaseline = 'middle';
  if (o.ls) X.letterSpacing = o.ls + 'px';
  if (o.shadow !== false) { X.shadowColor = o.sc || 'rgba(0,0,0,0.55)'; X.shadowBlur = o.sb ?? 14; X.shadowOffsetY = o.sy ?? 4; }
  if (o.stroke) { X.lineJoin = 'round'; X.lineWidth = o.stroke; X.strokeStyle = o.strokeColor || '#000'; X.strokeText(s, x, y); X.shadowColor = 'transparent'; }
  X.fillStyle = color; X.fillText(s, x, y); const w = X.measureText(s).width; X.restore(); return w;
}
function twf(s, size, font) { s = clean(s); X.save(); X.font = `${size}px ${font}`; const w = X.measureText(s).width; X.restore(); return w; }

// pílula: degradê magenta→roxo (ou laranja/amarelo), cantos arredondados, sombra
function pill(text, cx, cy, size = 54, style = 'purple', a = 1, sx = 1) {
  text = clean(text).toUpperCase(); if (!text) return;
  const w = twf(text, size, FA) + size * 0.9, h = size * 1.32;
  X.save(); X.globalAlpha *= a; X.translate(cx, cy); X.scale(sx, 1);
  X.shadowColor = 'rgba(0,0,0,0.45)'; X.shadowBlur = 18; X.shadowOffsetY = 6;
  const g = X.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
  if (style === 'orange') { g.addColorStop(0, '#ff7a3d'); g.addColorStop(1, '#ffd23f'); }
  else if (style === 'yellow') { g.addColorStop(0, '#ffe14d'); g.addColorStop(1, '#ffc400'); }
  else if (style === 'green') { g.addColorStop(0, '#13a86b'); g.addColorStop(1, '#2fd38d'); }
  else if (style === 'red') { g.addColorStop(0, '#c21d3a'); g.addColorStop(1, '#ff4b4b'); }
  else { g.addColorStop(0, '#7a1fd1'); g.addColorStop(1, '#d1238f'); }
  rr(-w / 2, -h / 2, w, h, h * 0.28); X.fillStyle = g; X.fill(); X.shadowColor = 'transparent';
  X.lineWidth = 2; X.strokeStyle = 'rgba(255,255,255,0.18)'; X.stroke();
  X.font = `${size}px ${FA}`; X.textAlign = 'center'; X.textBaseline = 'middle'; X.fillStyle = (style === 'orange' || style === 'yellow') ? '#2a0b12' : '#fff';
  X.fillText(text, 0, size * 0.04); X.restore();
}
function scriptLine(text, cx, cy, size = 56, a = 1) { if (!text) return; X.save(); X.globalAlpha *= a; tx(text, cx, cy, size, FS, '#fff', { sb: 16 }); X.restore(); }
const sentence = s => { s = clean(s).toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };

// pilha: título cursivo + pílulas que entram uma a uma (a última em destaque)
function stack(header, items, pt, dur, o = {}) {
  const cx = o.cx ?? 1440, y0 = o.y ?? 330, size = o.size ?? 54, gap = size * 1.5, n = items.length;
  const out = 1 - eio(seg(pt, dur - 0.35, 0.3));
  const kh = eo(seg(pt, 0.15, 0.35)) * out; if (kh <= 0.01) return;
  if (header) scriptLine(header, cx + (o.hx ?? 0), y0 - size * 1.15, size * 1.0, kh);
  items.forEach((it, j) => {
    const t0 = 0.35 + j * (o.step ?? Math.min(0.9, Math.max(0.35, (dur - 1.4) / Math.max(1, n)))), k = eb(seg(pt, t0, 0.32)) * out;
    if (k <= 0.01) return;
    const style = o.styles?.[j] || (o.lastHi && j === n - 1 && n > 1 ? 'orange' : 'purple');
    pill(it, cx + (1 - k) * 60, y0 + j * gap, size, style, Math.min(1, k * 1.2), 0.85 + 0.15 * k);
  });
}
// caixa de comparação (roxa, com caixas de seleção que vão sendo marcadas)
function compareBox(header, rows, pt, dur) {
  const out = 1 - eio(seg(pt, dur - 0.35, 0.3)), k = eo(seg(pt, 0.2, 0.4)) * out; if (k <= 0.01) return;
  const w = 980, h = 120 + rows.length * 88, x = W / 2 - w / 2, y = 470 - h / 2;
  X.save(); X.globalAlpha = k; X.translate(0, (1 - k) * 30);
  X.shadowColor = 'rgba(0,0,0,0.5)'; X.shadowBlur = 30; const g = X.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, 'rgba(110,22,170,0.94)'); g.addColorStop(1, 'rgba(200,30,130,0.94)');
  rr(x, y, w, h, 26); X.fillStyle = g; X.fill(); X.shadowColor = 'transparent'; X.lineWidth = 3; X.strokeStyle = 'rgba(255,170,220,0.85)'; X.stroke();
  tx(header, W / 2, y + 62, 50, FS, '#fff', { shadow: false });
  rows.forEach((r, j) => {
    const ry = y + 140 + j * 88, kr = eo(seg(pt, 0.6 + j * 0.9, 0.3)); if (kr <= 0) return;
    X.save(); X.globalAlpha *= kr; const bx = x + 70;
    rr(bx, ry - 22, 44, 44, 6); X.lineWidth = 4; X.strokeStyle = '#fff'; X.stroke();
    const mark = seg(pt, 1.0 + j * 0.9, 0.25);
    if (mark > 0) { X.lineWidth = 7; X.lineCap = 'round';
      if (r.ok) { X.strokeStyle = '#2fd38d'; X.beginPath(); X.moveTo(bx + 9, ry); X.lineTo(bx + 19, ry + 12); X.lineTo(bx + 19 + 16 * mark, ry - 14 * mark); X.stroke(); }
      else if (r.ok === false) { X.strokeStyle = '#ff4b4b'; X.beginPath(); X.moveTo(bx + 10, ry - 12); X.lineTo(bx + 10 + 24 * mark, ry - 12 + 24 * mark); X.moveTo(bx + 34, ry - 12); X.lineTo(bx + 34 - 24 * mark, ry - 12 + 24 * mark); X.stroke(); } }
    tx(r.t, bx + 80, ry + 2, Math.min(52, 52 * (w - 200) / Math.max(1, twf(r.t, 52, FA))), FA, '#fff', { align: 'left', shadow: false });
    X.restore();
  });
  X.restore();
}
// frase de impacto: texto vermelho desgastado numa faixa escura + subtítulo espaçado + flash vermelho/azul nas bordas
function impact(text, sub, pt) {
  const k = eo(seg(pt, 0.05, 0.25)), out = 1 - eio(seg(pt, 2.3, 0.35)), a = k * out; if (a <= 0.01) return;
  blurBackdrop(a * 0.9, 0.55);
  X.save(); X.globalAlpha = a;
  const g = X.createLinearGradient(0, 400, 0, 680); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(10,0,4,0.85)'); g.addColorStop(0.7, 'rgba(10,0,4,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  X.fillStyle = g; X.fillRect(0, 400, W, 280);
  const s = clean(text).toLowerCase(), size = Math.min(150, 150 * 1650 / Math.max(1, twf(s, 150, FG))), z = 1.15 - 0.15 * eo(seg(pt, 0, 0.4));
  X.translate(W / 2, 520); X.scale(z, z);
  tx(s, -6, 0, size, FG, 'rgba(0,140,255,0.55)', { shadow: false }); tx(s, 6, 0, size, FG, 'rgba(255,0,60,0.55)', { shadow: false });
  tx(s, 0, 0, size, FG, '#ff2b3a', { sc: 'rgba(255,0,40,0.8)', sb: 40, sy: 0 });
  if (sub) tx(clean(sub).toUpperCase(), 0, size * 0.62, 30, FM, '#fff', { weight: 900, ls: 10, shadow: false });
  X.restore();
  const e = (1 - seg(pt, 0, 0.35)) * 0.8; if (e > 0) { let gg = X.createLinearGradient(0, 0, 260, 0); gg.addColorStop(0, `rgba(255,0,50,${e})`); gg.addColorStop(1, 'rgba(255,0,50,0)'); X.fillStyle = gg; X.fillRect(0, 0, 260, H);
    gg = X.createLinearGradient(W, 0, W - 260, 0); gg.addColorStop(0, `rgba(0,90,255,${e})`); gg.addColorStop(1, 'rgba(0,90,255,0)'); X.fillStyle = gg; X.fillRect(W - 260, 0, 260, H); }
}
// abertura de cada novidade: fundo desfocado + "NOVIDADE #N" + título grande em degradê rosa + selo
function titleCard(sc, pt, dur) {
  const k = eo(seg(pt, 0.1, 0.5)), out = 1 - eio(seg(pt, dur - 0.3, 0.3)), a = k * out; if (a <= 0.01) return;
  blurBackdrop(a, 0.45);
  X.save(); X.globalAlpha = a; const z = 1.06 - 0.06 * eo(seg(pt, 0, 1.2)); X.translate(W / 2, 520); X.scale(z, z);
  tx(`NOVIDADE #${sc.num}`, 0, -130, 44, FA, '#ff6fb5', { ls: 6 });
  const t = clean(sc.title), size = Math.min(150, 150 * 1650 / Math.max(1, twf(t, 150, FM)));
  X.font = `900 ${size}px ${FM}`; X.textAlign = 'center'; X.textBaseline = 'middle';
  X.shadowColor = 'rgba(255,60,170,0.65)'; X.shadowBlur = 50;
  const g = X.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, '#ffd1ea'); g.addColorStop(1, '#ff4fa7'); X.fillStyle = g; X.fillText(t, 0, 10);
  X.shadowBlur = 0; const tg = TAGS[sc.tag]; pill(tg.t, 0, 140, 30, sc.tag === 'ok' ? 'green' : sc.tag === 'rumor' ? 'red' : sc.tag === 'preview' ? 'orange' : 'purple');
  X.restore();
}
// etiqueta de capítulo (canto superior esquerdo) + selo pequeno
function chapterTag(sc, a) {
  if (a <= 0.01) return; X.save(); X.globalAlpha = a;
  const num = String(sc.num).padStart(2, '0'), t = clean(sc.title).toUpperCase(), wn = twf(num, 38, FA), wt = twf(t, 38, FA), w = wn + wt + 52;
  rr(40, 34, w, 60, 12); X.fillStyle = 'rgba(28,8,40,0.82)'; X.fill(); X.lineWidth = 2; X.strokeStyle = 'rgba(255,111,181,0.5)'; X.stroke();
  tx(num, 58, 66, 38, FA, '#ff4fa7', { align: 'left', shadow: false }); tx(t, 58 + wn + 18, 66, 38, FA, '#fff', { align: 'left', shadow: false });
  const tg = TAGS[sc.tag], ts = clean(tg.t), w2 = twf(ts, 20, FA) + 26;
  rr(40, 102, w2, 32, 16); X.fillStyle = tg.c; X.fill(); tx(ts, 40 + w2 / 2, 119, 20, FA, '#fff', { shadow: false });
  X.restore();
}
// medidor de procurado (desenho próprio), canto superior direito
function wantedHUD(stars, lit, pt, plus) {
  const k = eo(seg(pt, 0.2, 0.4)); if (k <= 0) return; X.save(); X.globalAlpha = k;
  const x1 = W - 60, y = 170;
  for (let i = 0; i < stars; i++) { const on = i < lit, cx = x1 - (stars - 1 - i) * 58 - 20; X.save(); X.translate(cx, y);
    X.beginPath(); for (let j = 0; j < 10; j++) { const ang = -Math.PI / 2 + j * Math.PI / 5, r = j % 2 ? 11 : 26; X.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } X.closePath();
    X.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.18)'; X.shadowColor = 'rgba(0,0,0,0.7)'; X.shadowBlur = 8; X.fill(); X.lineWidth = 3; X.strokeStyle = '#000'; X.stroke(); X.restore(); }
  if (plus) tx(plus, x1 - stars * 58 - 30, y + 2, 54, FA, '#ff4fa7', { align: 'right' });
  tx('NÍVEL DE PROCURADO', x1, y + 46, 20, FA, 'rgba(255,255,255,0.9)', { align: 'right', ls: 3 });
  X.restore();
}
// transição entre frases: deslize rápido com rastro e franjas vermelho/azul (RGB)
function glitchIn(pt, strong) {
  const d = strong ? 0.3 : 0.2, e = 1 - seg(pt, 0, d); if (e <= 0) return;
  SNX.drawImage(cv, 0, 0); const dx = (strong ? 90 : 50) * e * e;
  X.save(); X.globalCompositeOperation = 'lighter'; X.globalAlpha = 0.28 * e;
  X.drawImage(SNAP, -dx, 0); X.drawImage(SNAP, dx, 0); X.restore();
  X.save(); X.globalAlpha = 0.35 * e; let g = X.createLinearGradient(0, 0, 220, 0); g.addColorStop(0, '#ff0033'); g.addColorStop(1, 'rgba(255,0,51,0)'); X.fillStyle = g; X.fillRect(0, 0, 220, H);
  g = X.createLinearGradient(W, 0, W - 220, 0); g.addColorStop(0, '#0057ff'); g.addColorStop(1, 'rgba(0,87,255,0)'); X.fillStyle = g; X.fillRect(W - 220, 0, 220, H); X.restore();
}
// cada tipo de cartão do roteiro no estilo novo
function styledCard(c, pt, dur, s, sc) {
  const H2 = x => x ? sentence(x) : '';
  switch (c.k) {
    case 'list': stack(H2(c.h), c.i, pt, dur, { lastHi: true }); break;
    case 'big': stack(H2(c.b), [c.a], pt, dur); break;
    case 'stat': stack(H2(c.l), [c.n], pt, dur, { size: 70 }); break;
    case 'op': stack('Na minha opinião', [c.a], pt, dur); break;
    case 'q': stack(H2(c.b), [c.a], pt, dur, { styles: ['yellow'] }); break;
    case 'reg': stack(`Região ${c.i + 1} de 6`, [REG[c.i][0]], pt, dur, { styles: ['orange'] }); scriptLine(REG[c.i][1], 1440, 330 + 70, 40, eo(seg(pt, 0.8, 0.4)) * (1 - eio(seg(pt, dur - 0.35, 0.3)))); break;
    case 'vs': {
      const gta = !/CALCULISTA/.test(c.a);
      const rows = gta ? [{ t: `GTA V: ${c.a}${c.as && !/GTA/.test(c.as) ? ' — ' + c.as : ''}`, ok: false }, { t: `GTA VI: ${c.b}${c.bs && !/GTA/.test(c.bs) ? ' — ' + c.bs : ''}`, ok: true }]
        : [{ t: `${c.a} — ${c.as}`, ok: null }, { t: `${c.b} — ${c.bs}`, ok: null }];
      compareBox(gta ? 'GTA 5  x  GTA 6' : 'Qual seria você?', rows, pt, dur); break; }
    case 'im': impact(c.a, c.b, pt); if (pt > 2.4) stack('Imagina…', [c.a], pt - 2.3, dur - 2.3); break;
    case 'sub': stack('Antes de continuar', ['Deixa o like', 'Inscreva-se'], pt, dur, { lastHi: true, step: 0.6 }); break;
    case 'cta': {
      blurBackdrop(eo(seg(pt, 0, 0.5)), 0.45);
      const titles = SC.filter(x => x.num).map(x => x.title), hot = Math.floor(pt * 3) % 10;
      scriptLine('Qual você mais quer jogar?', W / 2, 200, 64, eo(seg(pt, 0.1, 0.4)));
      titles.forEach((tt, i) => { const k = eb(seg(pt, 0.3 + i * 0.08, 0.3)); if (k > 0) pill(`${i + 1}. ${tt}`, W / 2 + (i % 2 ? 380 : -380), 320 + Math.floor(i / 2) * 92, 38, i === hot ? 'orange' : 'purple', Math.min(1, k)); });
      const kc = eb(seg(pt, 2.6, 0.4)); if (kc > 0) pill('Comenta aí', W / 2, 820, 60, 'yellow', Math.min(1, kc), kc);
      break; }
  }
}

// rótulos das animações 3D: título no topo, nome embaixo de cada objeto, valor em cima
function explainLabels(ex, labels, pt, dur) {
  const out = 1 - eio(seg(pt, dur - 0.3, 0.3)), kt = eo(seg(pt, 0.1, 0.4)) * out;
  if (ex.title) { X.save(); X.globalAlpha = kt; X.translate(0, (1 - kt) * -20); scriptLine(ex.title, W / 2, 110, 60, 1); X.restore(); }
  labels.forEach(l => { const a = l.k * out; if (a <= 0.01) return; X.save(); X.globalAlpha = a;
    const size = labels.length > 4 ? 34 : 44;
    pill(l.it.t, l.base.x, Math.min(H - 70, l.base.y + 40), size, 'purple', 1, 0.9 + 0.1 * l.k);
    if (l.it.v) tx(l.it.v, l.top.x, l.top.y - 30, l.it.v.length > 3 ? 54 : 84, FA, '#fff', { sc: l.color, sb: 30, sy: 0 });
    X.restore(); });
}
