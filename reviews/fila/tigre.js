// Animated tiger mascot (original design: orange cub in a navy suit + red tie). Drawn on the global context `g`.
const OUT = '#1c1420', LW = 7;
let g;
function shape(fill, path, lw = LW) { g.beginPath(); path(); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); } }
function rect(x, y, w, h, fill, r = 0, lw = LW) { shape(fill, () => g.roundRect(x, y, w, h, r), lw); }
function ell(x, y, rx, ry, fill, rot = 0, lw = LW) { shape(fill, () => g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2), lw); }
function line(p, w = LW, col = OUT) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
function curve(x0, y0, cx, cy, x1, y1, w = LW, col = OUT) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); }
const D2R = Math.PI / 180;
// arm from shoulder (sx,sy) with upper/lower angles in degrees (screen space, 90 = down)
function arm(sx, sy, a1, a2, hand = 'open', mirror = 1) {
  const L = 92, ex = sx + Math.cos(a1 * D2R) * L, ey = sy + Math.sin(a1 * D2R) * L, hx = ex + Math.cos(a2 * D2R) * L, hy = ey + Math.sin(a2 * D2R) * L;
  line([sx, sy, ex, ey, hx, hy], 34, OUT); line([sx, sy, ex, ey, hx, hy], 22, '#24304f');
  line([ex + (hx - ex) * 0.78, ey + (hy - ey) * 0.78, ex + (hx - ex) * 0.9, ey + (hy - ey) * 0.9], 28, OUT); line([ex + (hx - ex) * 0.8, ey + (hy - ey) * 0.8, ex + (hx - ex) * 0.88, ey + (hy - ey) * 0.88], 18, '#ffffff');
  const CR = '#fff3e0';
  if (hand === 'point') { const ux = Math.cos(a2 * D2R), uy = Math.sin(a2 * D2R); line([hx, hy, hx + ux * 44, hy + uy * 44], 22, OUT); line([hx, hy, hx + ux * 42, hy + uy * 42], 12, CR); ell(hx, hy, 27, 27, CR, 0, 5); }
  else if (hand === 'thumb') {   // a clear thumbs-up: wide fist with curled fingers + a short, fat thumb on top
    const m = mirror;
    ell(hx - 12 * m, hy - 36, 15, 24, CR, -0.25 * m, 5);
    rect(hx - 34, hy - 24, 68, 52, CR, 18, 5);
    for (let k = 0; k < 3; k++) line([hx + 8 * m, hy - 10 + k * 14, hx + 30 * m, hy - 10 + k * 14], 4);
  }
  else ell(hx, hy, 29, 29, CR, 0, 5);
}
function eyes(ex1, ex2, ey, rx, ry, look, blink) {
  for (const ex of [ex1, ex2]) {
    ell(ex, ey, rx, ry, '#fff', 0, 5);
    ell(ex + look[0] * rx * 0.45, ey + look[1] * ry * 0.45, rx * 0.45, ry * 0.48, OUT, 0, 0);
    ell(ex + look[0] * rx * 0.45 + rx * 0.18, ey + look[1] * ry * 0.45 - ry * 0.2, rx * 0.15, rx * 0.15, '#fff', 0, 0);
    if (blink > 0) { g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, 7); g.clip(); g.fillStyle = '#ff8a1f'; g.fillRect(ex - rx - 2, ey - ry - 2, rx * 2 + 4, (ry * 2 + 4) * blink); g.restore();
      g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, 7); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); if (blink > 0.9) curve(ex - rx, ey + ry * 0.7, ex, ey + ry * 0.95, ex + rx, ey + ry * 0.7, 6); }
  }
}
// o: mouth 0..1, blink 0..1, look [x,y], tilt (rad), bob (px), armL/armR = [a1,a2,hand], brows (-1 worried .. 1 happy), squash
function tiger(x, y, s, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  const OR = '#ff8a1f', CR = '#fff3e0', NV = '#24304f';
  const bob = o.bob || 0, sq = o.squash || 1;
  // tail (swings)
  const sw = Math.sin((o.time || 0) * 2.2) * 18;
  const tl = [90, -80, 210, -120, 225 + sw * 0.4, -250, 180 + sw, -300];
  line(tl, 42, OUT); line(tl, 30, OR); for (const [a, b] of [[205, -130], [222, -200]]) line([a - 18, b - 6, a + 18, b + 6], 9);
  for (const sx of [-1, 1]) { ell(sx * 55, -30, 54, 32, CR); line([sx * 55 - 14, -48, sx * 55 - 14, -30], 4); line([sx * 55 + 10, -48, sx * 55 + 10, -30], 4); }
  g.translate(0, -bob); g.scale(1 / sq, sq);
  // body in a suit
  ell(0, -175, 128, 140, OR);
  g.save(); g.beginPath(); g.ellipse(0, -175, 128, 140, 0, 0, 7); g.clip();
  g.fillStyle = NV; g.fillRect(-140, -330, 280, 320);
  shape('#ffffff', () => { g.moveTo(-50, -320); g.lineTo(0, -200); g.lineTo(50, -320); g.closePath(); }, 5);
  shape('#e8383d', () => { g.moveTo(-14, -312); g.lineTo(14, -312); g.lineTo(8, -292); g.lineTo(18, -215); g.lineTo(0, -195); g.lineTo(-18, -215); g.lineTo(-8, -292); g.closePath(); }, 5);
  shape('#1a233c', () => { g.moveTo(-50, -320); g.lineTo(-85, -300); g.lineTo(-40, -230); g.lineTo(0, -200); g.closePath(); }, 5);
  shape('#1a233c', () => { g.moveTo(50, -320); g.lineTo(85, -300); g.lineTo(40, -230); g.lineTo(0, -200); g.closePath(); }, 5);
  line([0, -200, 0, -40], 5); ell(-14, -150, 7, 7, '#ffd84d', 0, 3); ell(-14, -105, 7, 7, '#ffd84d', 0, 3);
  g.restore();
  g.beginPath(); g.ellipse(0, -175, 128, 140, 0, 0, 7); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
  const aL = o.armL || [115, 95, 'open'], aR = o.armR || [65, 85, 'open'];
  arm(-100, -235, aL[0], aL[1], aL[2], 1); arm(100, -235, aR[0], aR[1], aR[2], -1);
  // head
  g.save(); g.translate(0, -300); g.rotate(o.tilt || 0); g.translate(0, 300);
  for (const sx of [-1, 1]) { ell(sx * 128, -530, 52, 50, OR); ell(sx * 128, -528, 28, 26, '#3a2418', 0, 0); }
  ell(0, -405, 185, 150, OR);
  g.save(); g.beginPath(); g.ellipse(0, -405, 181, 146, 0, 0, 7); g.clip();
  shape(OUT, () => { g.moveTo(-36, -556); g.lineTo(0, -490); g.lineTo(36, -556); g.closePath(); }, 0);
  shape(OUT, () => { g.moveTo(-90, -545); g.quadraticCurveTo(-70, -505, -60, -470); g.lineTo(-74, -472); g.quadraticCurveTo(-90, -510, -110, -540); g.closePath(); }, 0);
  shape(OUT, () => { g.moveTo(90, -545); g.quadraticCurveTo(70, -505, 60, -470); g.lineTo(74, -472); g.quadraticCurveTo(90, -510, 110, -540); g.closePath(); }, 0);
  for (const sx of [-1, 1]) { shape(OUT, () => { g.moveTo(sx * 190, -430); g.lineTo(sx * 130, -415); g.lineTo(sx * 190, -400); g.closePath(); }, 0); shape(OUT, () => { g.moveTo(sx * 190, -385); g.lineTo(sx * 140, -372); g.lineTo(sx * 190, -358); g.closePath(); }, 0); }
  g.restore();
  g.beginPath(); g.ellipse(0, -405, 185, 150, 0, 0, 7); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke();
  ell(-55, -340, 70, 50, CR, 0, 0); ell(55, -340, 70, 50, CR, 0, 0); ell(0, -322, 52, 40, CR, 0, 0);
  const look = o.look || [0.1, 0.15];
  eyes(-70, 70, -425, 38, 46, look, o.blink || 0);
  const br = o.brows || 0;
  for (const sx of [-1, 1]) { const ex = sx * 70, xin = ex - sx * 40, xout = ex + sx * 40, up = Math.max(br, 0);
    curve(xout, -488 - up * 8, ex, -505 - up * 10, xin, -488 - up * 8 + (br < 0 ? br * 18 : 0), 8); }
  shape('#3a2418', () => { g.moveTo(-20, -372); g.lineTo(20, -372); g.lineTo(0, -350); g.closePath(); }, 4);
  const m = o.mouth || 0;
  if (m > 0.05) {
    const w = 30 + m * 8, h = 12 + m * 46, y0 = -337;
    shape('#4a1820', () => { g.moveTo(-w, y0); g.quadraticCurveTo(0, y0 + 8, w, y0); g.quadraticCurveTo(w * 0.8, y0 + h, 0, y0 + h); g.quadraticCurveTo(-w * 0.8, y0 + h, -w, y0); }, 6);
    if (h > 26) shape('#e8667a', () => g.ellipse(0, y0 + h * 0.74, w * 0.5, h * 0.18, 0, 0, 7), 0);
    line([-w * 0.75, y0 + 3, w * 0.75, y0 + 3], 7, '#fff');
  } else if (o.sad) curve(-26, -322, 0, -340, 26, -322, 6);
  else { curve(-28, -338, -14, -322, 0, -334, 6); curve(0, -334, 14, -322, 28, -338, 6); }
  for (const sx of [-1, 1]) { line([sx * 110, -360, sx * 205, -375], 5); line([sx * 110, -340, sx * 205, -335], 5); }
  g.fillStyle = 'rgba(255,90,120,0.35)'; g.beginPath(); g.ellipse(-130, -360, 22, 13, 0, 0, 7); g.ellipse(130, -360, 22, 13, 0, 0, 7); g.fill();
  g.restore();
  g.restore();
}
// a worn-out cheap sneaker (the "problem"): cracked, sole flapping open like a mouth
function oldShoe(x, y, s, flap, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  // sole (bottom part) hinged at the heel
  g.save(); g.translate(-150, 40); g.rotate(flap * 0.35);
  shape('#bdb5a6', () => { g.moveTo(0, 0); g.lineTo(300, 0); g.quadraticCurveTo(330, 0, 320, 30); g.lineTo(10, 30); g.quadraticCurveTo(-20, 30, 0, 0); });
  for (let i = 0; i < 6; i++) line([40 + i * 45, 30, 55 + i * 45, 22], 4);
  g.restore();
  // upper
  shape('#8f8a80', () => { g.moveTo(-160, 40); g.lineTo(-170, -60); g.quadraticCurveTo(-150, -110, -90, -100); g.lineTo(0, -90); g.quadraticCurveTo(80, -80, 130, -30); g.quadraticCurveTo(175, 0, 170, 40); g.closePath(); });
  shape('#6f6a62', () => { g.moveTo(-90, -100); g.quadraticCurveTo(-40, -130, 0, -90); g.closePath(); }, 5);
  for (let i = 0; i < 4; i++) line([-40 + i * 32, -88 + i * 6, -20 + i * 32, -60 + i * 6], 6, '#e9e4da');
  // cracks + a hole
  line([60, -40, 80, -10, 70, 10, 95, 30], 5); line([-120, -40, -100, -10, -118, 10], 5);
  ell(20, -10, 22, 14, '#3a332c', 0.2, 5);
  // a sad little face on the shoe
  ell(90, -10, 0, 0, '#000', 0, 0);
  g.restore();
}
