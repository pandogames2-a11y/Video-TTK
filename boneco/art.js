// Drawing kit for EP5 (2D): house set, characters, night grade, rim light, title/caption helpers.

// EP5 style test v2: flat 2D cartoon, thick outlines, a bluish night grade, a light rim around the characters,
// and one consistent American house set (the camera frames parts of it).
const SW = 1080, SH = 1920;
const main = document.getElementById('c').getContext('2d');
const NOTITLE = new URLSearchParams(location.search).has('notitle');
let g = main;
const OUT = '#1c1420', LW = 7;
const mk = () => { const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH; return cv; };
function shape(fill, path, lw = LW) { g.beginPath(); path(); g.fillStyle = fill; g.fill(); if (lw) { g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); } }
function rect(x, y, w, h, fill, r = 0, lw = LW) { shape(fill, () => g.roundRect(x, y, w, h, r), lw); }
function ell(x, y, rx, ry, fill, rot = 0, lw = LW) { shape(fill, () => g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, Math.PI * 2), lw); }
function line(pts, w = LW, col = OUT) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); }
function curve(x0, y0, cx, cy, x1, y1, w = LW, col = OUT) { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1); g.lineWidth = w; g.strokeStyle = col; g.lineCap = 'round'; g.stroke(); }
function camera(c) { g.setTransform(c.z, 0, 0, c.z, SW / 2 - c.x * c.z, SH / 2 - c.y * c.z); }

// ---------- the house (world units; floor line FY) ----------
const FY = 1300;
function kitchen() {   // to the right of the stairs, through a doorway
  const K0 = 2560, KF = 3900;
  rect(2500, 300, 60, FY - 300, '#efe6d6', 4, 5);   // doorway jamb
  g.fillStyle = '#e8eef0'; g.fillRect(K0, -400, KF - K0, FY + 400);
  for (let x = K0; x < KF; x += 60) for (let y = 560; y < FY - 210; y += 60) { g.fillStyle = (x / 60 + y / 60) % 2 ? '#d6e2e6' : '#eef3f5'; g.fillRect(x, y, 58, 58); }
  // checkered floor
  for (let x = K0, i = 0; x < KF; x += 90, i++) for (let y = FY, j = 0; y < FY + 900; y += 90, j++) { g.fillStyle = (i + j) % 2 ? '#2b2d36' : '#d9d9de'; g.fillRect(x, y, 90, 90); }
  // window above the sink
  rect(3200, 560, 260, 230, '#f3ece0', 6); const sk = g.createLinearGradient(0, 580, 0, 770); sk.addColorStop(0, '#0b1030'); sk.addColorStop(1, '#2a3270'); rect(3220, 580, 220, 190, sk, 3, 4); line([3330, 580, 3330, 770], 5);
  // upper cabinets, hood
  for (const x of [2650, 2830, 3500]) rect(x, 330, 170, 200, '#7d9bb0', 6);
  shape('#b9c2c8', () => { g.moveTo(3000, 520); g.lineTo(3180, 520); g.lineTo(3150, 420); g.lineTo(3030, 420); g.closePath(); });
  // counters + cabinets, stove, sink
  rect(2640, FY - 210, 1060, 34, '#dcd6c8', 4, 5);
  for (let x = 2650; x < 3690; x += 175) rect(x, FY - 176, 165, 176, '#7d9bb0', 4, 4);
  rect(3000, FY - 176, 180, 176, '#3a3d44', 4, 5); rect(3020, FY - 140, 140, 90, '#1c1e24', 6, 4); line([3030, FY - 156, 3150, FY - 156], 6, '#9aa0a8');
  ell(3045, FY - 214, 30, 7, '#2a2a30', 0, 4); ell(3135, FY - 214, 30, 7, '#2a2a30', 0, 4);
  rect(3260, FY - 222, 150, 16, '#9aa6ae', 4, 4); line([3335, FY - 222, 3335, FY - 290, 3375, FY - 290], 7, '#9aa6ae');
  // knife block with ONE empty slot
  rect(2730, FY - 300, 70, 90, '#6a3f26', 6, 5); for (const [kx, empty] of [[2745, false], [2765, true], [2785, false]]) { if (!empty) line([kx, FY - 300, kx, FY - 340], 7, '#2a2a30'); else rect(kx - 5, FY - 302, 10, 6, '#1a1010', 1, 0); }
  // fridge
  rect(3720, 520, 180, FY - 520, '#e8ecef', 10); line([3720, 820, 3900, 820], 5); line([3740, 600, 3740, 780], 7); line([3740, 860, 3740, 1000], 7);
  // pendant light
  line([3150, -400, 3150, 220], 4); shape('#4a4f58', () => { g.moveTo(3100, 260); g.lineTo(3200, 260); g.lineTo(3175, 220); g.lineTo(3125, 220); g.closePath(); }, 4);
}
function house(opt = {}) {
  g.fillStyle = '#b9c49c'; g.fillRect(-900, -400, 4800, FY + 400);
  for (let x = -900; x < 3900; x += 70) { g.fillStyle = '#aab78c'; g.fillRect(x, -400, 12, FY + 400); }
  g.fillStyle = '#eee4d0'; g.fillRect(-900, 120, 4800, 40); line([-900, 160, 3900, 160], 5);
  g.fillStyle = '#efe6d6'; g.fillRect(-900, 960, 4800, FY - 960); line([-900, 960, 3900, 960], 6);
  for (let x = -170; x < 3900; x += 190) rect(x, 990, 150, 270, '#e3d8c4', 4, 4);
  g.fillStyle = '#9a6238'; g.fillRect(-900, FY, 4800, 900);
  for (let y = FY + 70, k = 0; y < FY + 900; y += 80 + k * 10, k++) { line([-900, y, 3900, y], 3, '#7a4a28'); for (let x = -900 + (k % 2) * 140; x < 3900; x += 300) line([x, y - 70 - k * 10 + 4, x, y], 3, '#7a4a28'); }
  rect(-900, FY - 26, 4800, 28, '#f3ece0', 0, 5);
  // front door (left) with a fan light, doorbell, coat hook + backpack
  rect(120, 470, 340, FY - 470, '#f3ece0', 8);
  if (opt.doorOpen) {
    const night = g.createLinearGradient(0, 500, 0, FY); night.addColorStop(0, '#0d1230'); night.addColorStop(1, '#232a5a');
    rect(150, 500, 280, FY - 500, night, 4, 5);
    g.fillStyle = '#0a0d22'; g.fillRect(150, 1020, 280, FY - 1020); line([150, 1020, 430, 1020], 4, '#384080');
    shape('#7a3f2a', () => { g.moveTo(150, 500); g.lineTo(60, 460); g.lineTo(60, FY + 40); g.lineTo(150, FY); g.closePath(); });
  } else {
    rect(150, 500, 280, FY - 500, '#7a3f2a', 4, 5);
    rect(185, 560, 95, 230, '#6a3522', 4, 4); rect(300, 560, 95, 230, '#6a3522', 4, 4); rect(185, 840, 95, 360, '#6a3522', 4, 4); rect(300, 840, 95, 360, '#6a3522', 4, 4);
    ell(400, 900, 11, 11, '#e2b84a', 0, 4);
  }
  shape('#f3ece0', () => { g.moveTo(120, 470); g.arc(290, 470, 170, Math.PI, 0); g.closePath(); });
  shape('#2c3570', () => { g.moveTo(150, 470); g.arc(290, 470, 140, Math.PI, 0); g.closePath(); }, 4);
  for (let i = 1; i < 5; i++) { const a = Math.PI + i * Math.PI / 5; line([290, 470, 290 + Math.cos(a) * 140, 470 + Math.sin(a) * 140], 4); }
  rect(480, 760, 18, 30, '#e2b84a', 4, 3);
  line([560, 640, 640, 640], 7); ell(575, 655, 9, 9, '#c9a24a', 0, 3); ell(625, 655, 9, 9, '#c9a24a', 0, 3);
  if (!opt.noBackpack) { rect(560, 660, 90, 120, '#c0392b', 22); rect(575, 720, 60, 45, '#a83226', 10, 4); line([585, 665, 585, 640], 5); line([625, 665, 625, 640], 5); }
  // window over the sofa, curtains
  rect(820, 340, 380, 470, '#f3ece0', 8);
  const sky = g.createLinearGradient(0, 360, 0, 790); sky.addColorStop(0, '#0b1030'); sky.addColorStop(1, '#2a3270');
  rect(845, 365, 330, 420, sky, 4, 5);
  ell(1100, 440, 34, 34, '#f7f1d0', 0, 4); ell(1114, 430, 30, 30, '#121940', 0, 0);
  g.fillStyle = '#f7f1d0'; [[880, 420], [950, 500], [1020, 400], [900, 620], [1140, 560]].forEach(([x, y]) => g.fillRect(x, y, 5, 5));
  g.fillStyle = '#090c24'; g.beginPath(); g.moveTo(845, 785); g.lineTo(845, 690); g.lineTo(920, 640); g.lineTo(995, 690); g.lineTo(995, 720); g.lineTo(1060, 700); g.lineTo(1175, 712); g.lineTo(1175, 785); g.fill();
  g.fillStyle = '#ffd77a'; g.fillRect(880, 712, 22, 26); g.fillRect(930, 712, 22, 26);
  line([1010, 365, 1010, 785], 6); line([845, 570, 1175, 570], 6);
  rect(800, 325, 420, 22, '#5a3324', 8, 5);
  shape('#7d2e3a', () => { g.moveTo(808, 345); g.lineTo(880, 345); g.quadraticCurveTo(850, 580, 895, 860); g.lineTo(798, 860); g.closePath(); });
  shape('#7d2e3a', () => { g.moveTo(1212, 345); g.lineTo(1140, 345); g.quadraticCurveTo(1170, 580, 1125, 860); g.lineTo(1222, 860); g.closePath(); });
  rect(560, 330, 150, 190, '#b88a3e', 6); rect(575, 345, 120, 160, '#d9c7a4', 2, 4); ell(635, 420, 30, 40, '#8a5a3c', 0, 3);
  rect(1290, 380, 120, 100, '#b88a3e', 6); rect(1302, 392, 96, 76, '#9fb6c9', 2, 4);
  ell(1350, 250, 50, 50, '#f3ece0'); line([1350, 250, 1350, 218], 5); line([1350, 250, 1372, 262], 5);
  // staircase on the right, little basement door underneath
  g.fillStyle = '#d8ccb6'; g.beginPath(); g.moveTo(1880, FY); g.lineTo(2500, FY); g.lineTo(2500, 300); g.closePath(); g.fill();
  rect(1990, 1010, 170, 280, '#c9bda4', 6, 4); ell(2130, 1160, 8, 8, '#8e5a35', 0, 3);   // closet under the stairs
  for (let i = 0; i < 10; i++) { const x = 1880 + i * 62, y = FY - (i + 1) * 100; rect(x, y, 2500 - x, 100, '#8e5a35', 2, 4); rect(x - 6, y - 10, 2500 - x + 6, 16, '#a86d42', 3, 4); }
  line([1840, FY - 280, 2500, FY - 280 - 660 * 1.6], 10);
  for (let i = 0; i < 10; i++) { const x = 1880 + i * 62 + 20; line([x, FY - (i + 1) * 100, x, FY - 280 - (x - 1840) * 1.6], 5); }
  rect(1820, FY - 330, 40, 330, '#7a4a2a', 6, 5); ell(1840, FY - 340, 26, 18, '#8e5a35', 0, 5);
  // floor lamp next to the sofa
  line([1330, FY, 1330, 860], 8); ell(1330, FY, 55, 12, '#2a2024');
  shape('#f0cf86', () => { g.moveTo(1268, 860); g.lineTo(1392, 860); g.lineTo(1360, 760); g.lineTo(1300, 760); g.closePath(); });
  // rug
  shape('#3d4f7a', () => g.ellipse(1010, FY + 200, 520, 120, 0, 0, Math.PI * 2)); shape('#56699a', () => g.ellipse(1010, FY + 200, 430, 92, 0, 0, Math.PI * 2), 4);
  // sofa under the window
  const sx = 740, sy = FY + 60;
  rect(sx, sy - 340, 560, 200, '#5d7a6b', 44); rect(sx - 30, sy - 205, 620, 135, '#6c8b7b', 30);
  rect(sx - 55, sy - 260, 95, 200, '#5d7a6b', 32); rect(sx + 520, sy - 260, 95, 200, '#5d7a6b', 32);
  line([sx + 280, sy - 195, sx + 280, sy - 80], 4); rect(sx + 10, sy - 72, 24, 72, '#3a2418', 6, 4); rect(sx + 526, sy - 72, 24, 72, '#3a2418', 6, 4);
  rect(sx + 40, sy - 310, 120, 100, '#c9963e', 24, 5);
  // armchair (where the doll will sit)
  const ax = 1560;
  rect(ax, FY - 330, 260, 230, '#8a4a3e', 40); rect(ax - 20, FY - 170, 300, 110, '#9a5648', 26); rect(ax - 40, FY - 220, 70, 180, '#8a4a3e', 26); rect(ax + 250, FY - 220, 70, 180, '#8a4a3e', 26);
  rect(ax, FY - 60, 22, 60, '#3a2418', 6, 4); rect(ax + 238, FY - 60, 22, 60, '#3a2418', 6, 4);
  // side table + phone
  rect(540, FY - 190, 250, 24, '#6a3f26', 4, 5); line([560, FY - 168, 560, FY], 8); line([770, FY - 168, 770, FY], 8);
  rect(560, FY - 232, 74, 42, '#2d2d33', 8, 4); rect(566, FY - 250, 62, 20, '#3a3a42', 8, 4);   // landline phone
  // basement door, right beside the front door (a plain door with a sign)
  rect(-330, 560, 250, FY - 560, '#f3ece0', 6); rect(-305, 585, 200, FY - 585, opt.basementOpen ? '#05040a' : '#5a2e1c', 3, 5);
  if (!opt.basementOpen) { rect(-280, 620, 150, 260, '#4e2717', 3, 4); rect(-280, 920, 150, 330, '#4e2717', 3, 4); ell(-130, 930, 10, 10, '#e2b84a', 0, 3); }
  rect(-262, 500, 114, 44, '#2a2f55', 6, 4); g.font = '900 28px "Inter Display", Inter'; g.fillStyle = '#e8dcc4'; g.textAlign = 'center'; g.fillText('PORÃO', -205, 532);
  // the light switch by the stairs (Pedrinho forgets it exists)
  rect(1745, 840, 50, 80, '#f3ece0', 8, 4); rect(1762, 858, 16, 28, '#d9cfbd', 4, 3);
  kitchen();
}

// ---------- characters ----------
function bean(x, y, o = {}) {   // the new protagonist: light brown, startled eyes
  const s = o.s || 1; g.save(); g.translate(x, y - (o.jy || 0)); g.scale(o.flip ? -s : s, s * (o.sq || 1)); if (o.tilt) g.rotate(o.tilt);
  const sit = o.sit;
  if (sit) { line([-40, -150, -60, -40], 12); line([40, -150, 60, -40], 12); ell(-72, -28, 42, 22, '#e9e9ef'); ell(72, -28, 42, 22, '#e9e9ef'); }
  else { const w = o.walk || 0, ph = o.phase || 0;
    for (const [sx, off] of [[-1, 0], [1, Math.PI]]) { const sw = Math.sin(ph + off) * w, lift = Math.max(0, Math.cos(ph + off)) * w;
      const fx = sx * 45 + sw * 34, fy = -25 - lift * 22; line([sx * 35, -120, fx, fy], 12); ell(fx + sx * 13, fy + 7, 42, 22, '#e9e9ef'); } }
  const by = sit ? -230 : -250;
  const aL = o.armL || [-110, by + 20, -150, by + 110], aR = o.armR || [110, by + 20, 150, by + 110];
  ell(0, by, 120, 155, '#c8874d', -0.08);
  g.save(); g.beginPath(); g.ellipse(0, by, 116, 151, -0.08, 0, Math.PI * 2); g.clip(); g.fillStyle = 'rgba(255,255,255,0.13)'; g.beginPath(); g.ellipse(-50, by - 60, 50, 80, -0.3, 0, Math.PI * 2); g.fill(); g.restore();
  curve(-10, by - 140, 30, by, -5, by + 145, 6, '#8a4f22');
  line([-95, by + 10, aL[0], aL[1], aL[2], aL[3]], 11); ell(aL[2], aL[3], 20, 20, '#ffffff', 0, 5);
  line([95, by + 10, aR[0], aR[1], aR[2], aR[3]], 11); ell(aR[2], aR[3], 20, 20, '#ffffff', 0, 5);
  if (o.phone) { rect(aR[2] - 14, aR[3] - 46, 30, 54, '#1c1c22', 6, 4); rect(aR[2] - 9, aR[3] - 40, 20, 40, '#bfe6ff', 3, 0); }
  const ey = by - 50, look = o.look || [0, 0], pr = o.tiny ? 7 : 11;
  ell(-40, ey, 38, 46, '#ffffff', 0, 5); ell(40, ey, 38, 46, '#ffffff', 0, 5);
  ell(-40 + look[0] * 14, ey + look[1] * 14, pr, pr * 1.15, OUT, 0, 0); ell(40 + look[0] * 14, ey + look[1] * 14, pr, pr * 1.15, OUT, 0, 0);
  curve(-72, ey - 62, -42, ey - 84, -12, ey - 66, 7); curve(12, ey - 66, 42, ey - 84, 72, ey - 62, 7);
  if (o.blink > 0) { for (const ex of [-40, 40]) { g.save(); g.beginPath(); g.ellipse(ex, ey, 38, 46, 0, 0, Math.PI * 2); g.clip(); g.fillStyle = '#b97a43'; g.fillRect(ex - 40, ey - 48, 80, 94 * o.blink); g.restore(); g.beginPath(); g.ellipse(ex, ey, 38, 46, 0, 0, Math.PI * 2); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke(); if (o.blink > 0.05) line([ex - 36, ey - 46 + 94 * o.blink, ex + 36, ey - 46 + 94 * o.blink], 5); } }
  if (o.mouth === 'o') ell(0, ey + 80, 18, 25, '#4a1820', 0, 5);
  else if (o.chew !== undefined) ell(0, ey + 76, 22, 4 + o.chew * 12, '#4a1820', 0, 5);
  else curve(-24, ey + 72, 0, ey + 84, 24, ey + 72, 6);
  if (o.sweat) shape('#bfe4ff', () => { g.moveTo(100, ey - 40); g.quadraticCurveTo(122, ey - 4, 100, ey + 6); g.quadraticCurveTo(80, ey - 4, 100, ey - 40); }, 4);
  g.restore();
}
// the killer doll: a toy coffee bean with orange hair, striped shirt, denim overalls and stitched scars
function doll(x, y, o = {}) {
  const s = o.s || 1, evil = o.evil; g.save(); g.translate(x, y); g.scale(s, s);
  { const w = o.walk || 0, ph = o.phase || 0;
    for (const [sx, off] of [[-1, 0], [1, Math.PI]]) { const sw = Math.sin(ph + off) * w, lift = Math.max(0, Math.cos(ph + off)) * w; const fx = sx * 32 + sw * 30, fy = -16 - lift * 20; line([sx * 28, -70, fx, fy], 12); ell(fx + sx * 6, fy + 6, 30, 15, '#c63a32'); } }
  line([-60, -10, -18, -10], 4, '#ffffff'); line([18, -10, 60, -10], 4, '#ffffff');
  const by = -175;
  ell(0, by, 92, 118, '#e7b98c', -0.05);
  g.save(); g.beginPath(); g.ellipse(0, by, 90, 116, -0.05, 0, Math.PI * 2); g.clip();
  const st = ['#d64036', '#f2c53d', '#3a8fd6', '#46a35a'];
  for (let i = 0; i < 4; i++) { g.fillStyle = st[i % 4]; g.fillRect(-100, by + 2 + i * 12, 200, 12); }   // striped shirt band
  g.fillStyle = '#2f5aa8'; g.fillRect(-100, by + 40, 200, 100); g.fillRect(-44, by + 8, 88, 40);   // overalls + bib
  g.restore();
  g.beginPath(); g.ellipse(0, by, 92, 118, -0.05, 0, Math.PI * 2); g.lineWidth = LW; g.strokeStyle = OUT; g.stroke();
  line([-90, by + 2, 90, by + 2], 4); line([-44, by + 8, 44, by + 8], 4); line([-44, by + 8, -44, by + 40], 4); line([44, by + 8, 44, by + 40], 4); line([-88, by + 40, 88, by + 40], 5);
  line([-38, by + 10, -70, by - 6], 8, '#2f5aa8'); line([38, by + 10, 70, by - 6], 8, '#2f5aa8');   // straps over the shoulders
  ell(-30, by + 20, 6, 6, '#f2c53d', 0, 3); ell(30, by + 20, 6, 6, '#f2c53d', 0, 3);
  rect(-22, by + 60, 44, 30, '#2a4f94', 6, 4);
  const armR = o.knife ? [96, by + 0, 128, by - 50] : [96, by + 20, 104, by + 70];
  for (const [ax, ay, hx, hy, sg] of [[-96, by + 20, -106, by + 70, -1], [armR[0], armR[1], armR[2], armR[3], 1]]) {
    g.beginPath(); g.moveTo(sg * 82, by + 6); g.quadraticCurveTo(ax, ay, hx, hy); g.lineWidth = 22; g.strokeStyle = OUT; g.lineCap = 'round'; g.stroke();
    g.lineWidth = 13; g.strokeStyle = '#d64036'; g.stroke(); g.setLineDash([8, 10]); g.strokeStyle = '#3a8fd6'; g.stroke(); g.setLineDash([]);
    ell(hx, hy, 15, 15, '#e7b98c', 0, 5);
  }
  if (o.knife) { g.save(); g.translate(armR[2], armR[3]); g.rotate(0.35); rect(-9, -8, 18, 42, '#3a2418', 4, 4); shape('#d9dde6', () => { g.moveTo(-11, -10); g.lineTo(11, -10); g.lineTo(7, -110); g.lineTo(-11, -94); g.closePath(); }, 5); line([0, -20, 2, -88], 3, '#ffffff'); g.restore(); }
  const ey = by - 50, look = o.look || [0, 0];
  ell(-30, ey, 24, 26, '#ffffff', 0, 5); ell(30, ey, 24, 26, '#ffffff', 0, 5);
  const iris = evil ? '#d8261c' : '#3b6fd1';
  ell(-30 + look[0] * 8, ey + 3 + look[1] * 8, 10, 12, iris, 0, 3); ell(30 + look[0] * 8, ey + 3 + look[1] * 8, 10, 12, iris, 0, 3);
  ell(-30 + look[0] * 8, ey + 3 + look[1] * 8, 4, 5, OUT, 0, 0); ell(30 + look[0] * 8, ey + 3 + look[1] * 8, 4, 5, OUT, 0, 0);
  if (evil) { line([-56, ey - 34, -12, ey - 18], 8); line([56, ey - 34, 12, ey - 18], 8); }
  else { curve(-48, ey - 34, -30, ey - 42, -12, ey - 34, 5); curve(12, ey - 34, 30, ey - 42, 48, ey - 34, 5); }
  g.fillStyle = '#c9744a'; [[-50, 34], [-42, 40], [-58, 40], [40, 32], [48, 28], [54, 34]].forEach(([fx, fy]) => { g.beginPath(); g.arc(fx, ey + fy, 3, 0, 7); g.fill(); });
  if (evil) { shape('#4a1820', () => { g.moveTo(-34, ey + 30); g.quadraticCurveTo(0, ey + 62, 34, ey + 30); g.closePath(); }, 4); g.fillStyle = '#fff'; for (let i = -2; i <= 2; i++) g.fillRect(i * 12 - 5, ey + 32, 10, 9); line([-34, ey + 30, 34, ey + 30], 4); }
  else curve(-16, ey + 36, 0, ey + 46, 16, ey + 36, 5);
  if (o.scars !== false) {
    // scars stay on the cheeks, clear of the eyes: a long stitched one on the left, a short one on the right
    curve(-86, ey - 8, -86, ey + 28, -62, ey + 46, 4, '#8a2f2a');
    for (let k = 0; k < 5; k++) { const t = 0.1 + k * 0.2, px = (1 - t) * (1 - t) * -86 + 2 * (1 - t) * t * -86 + t * t * -62, py = (1 - t) * (1 - t) * (ey - 8) + 2 * (1 - t) * t * (ey + 28) + t * t * (ey + 46); line([px - 8, py - 3, px + 8, py + 3], 3, '#8a2f2a'); }
    curve(48, ey + 44, 64, ey + 38, 80, ey + 24, 4, '#8a2f2a'); for (let k = 0; k < 3; k++) { const px = 55 + k * 11, py = ey + 41 - k * 7; line([px - 5, py - 6, px + 5, py + 6], 3, '#8a2f2a'); }
  }
  shape('#e05a26', () => { g.moveTo(-74, by - 84); const sp = [[-90, -126], [-54, -114], [-48, -158], [-16, -124], [2, -170], [22, -126], [52, -156], [54, -114], [92, -122], [74, -88]]; sp.forEach(([px, py]) => g.lineTo(px, by + py)); g.quadraticCurveTo(0, by - 92, -74, by - 84); g.closePath(); }, 5);
  g.restore();
}
function box(x, y, open) {
  rect(x - 110, y - 140, 220, 140, '#2f6e4a', 6); rect(x - 18, y - 140, 36, 140, '#e2b84a', 0, 4);
  if (!open) { rect(x - 122, y - 168, 244, 36, '#3a8259', 6); rect(x - 18, y - 168, 36, 36, '#e2b84a', 0, 4); ell(x - 32, y - 184, 32, 18, '#e2b84a', -0.4, 5); ell(x + 32, y - 184, 32, 18, '#e2b84a', 0.4, 5); }
  else { g.save(); g.translate(x - 150, y - 10); g.rotate(-0.15); rect(-122, -36, 244, 36, '#3a8259', 6); rect(-18, -36, 36, 36, '#e2b84a', 0, 4); g.restore(); }
}
function popcorn(x, y) { shape('#d94545', () => { g.moveTo(x - 50, y - 70); g.lineTo(x + 50, y - 70); g.lineTo(x + 36, y); g.lineTo(x - 36, y); g.closePath(); }, 5); for (let i = 0; i < 6; i++) ell(x - 38 + i * 15, y - 78 - (i % 2) * 12, 15, 13, '#fff6d8', 0, 4); line([x - 22, y - 66, x - 18, y - 4], 6, '#ffffff'); line([x + 14, y - 66, x + 12, y - 4], 6, '#ffffff'); }

// ---------- lighting: night grade + light pools, and the rim around characters ----------
function nightGrade(ctx, strength = 1) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(55,75,165,${Math.min(1, 0.85 * strength)})`; ctx.fillRect(0, 0, SW, SH);
  ctx.fillStyle = `rgba(105,115,190,${Math.min(1, 0.5 * strength)})`; ctx.fillRect(0, 0, SW, SH);
  ctx.restore();
}
function lightPool(ctx, cam, wx, wy, r, col, a) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen';
  const x = SW / 2 + (wx - cam.x) * cam.z, y = SH / 2 + (wy - cam.y) * cam.z, R = r * cam.z;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, R); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
  ctx.fillStyle = gr; ctx.fillRect(0, 0, SW, SH); ctx.restore();
}
function vignette(ctx, a) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const v = ctx.createRadialGradient(540, 1050, 350, 540, 1050, 1200); v.addColorStop(0, 'rgba(4,6,20,0)'); v.addColorStop(1, `rgba(4,6,20,${a})`); ctx.fillStyle = v; ctx.fillRect(0, 0, SW, SH); ctx.restore(); }
// characters on their own layer, graded lighter than the set, then outlined with a soft light rim
function characters(cam, drawFn, rim = 'rgba(190,220,255,0.95)', grade = 0.45) {
  const lay = mk(), sil = mk(); const prev = g; g = lay.getContext('2d'); camera(cam); drawFn(); g = prev;
  { const tmp = mk(), tc = tmp.getContext('2d'); tc.drawImage(lay, 0, 0); nightGrade(tc, grade); tc.globalCompositeOperation = 'destination-in'; tc.drawImage(lay, 0, 0); const lc = lay.getContext('2d'); lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, SW, SH); lc.drawImage(tmp, 0, 0); }
  const sc = sil.getContext('2d'); sc.drawImage(lay, 0, 0); sc.globalCompositeOperation = 'source-in'; sc.fillStyle = rim; sc.fillRect(0, 0, SW, SH);
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0);
  main.shadowColor = rim; main.shadowBlur = 30; main.drawImage(sil, 0, 0); main.shadowBlur = 0;
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; main.drawImage(sil, Math.cos(a) * 6, Math.sin(a) * 6); }
  main.drawImage(lay, 0, 0); main.restore();
}
function title() {
  const t = (s, y, size, fill) => { main.font = `900 ${size}px "Inter Display", Inter`; main.lineWidth = size * 0.17; main.strokeStyle = '#08061a'; main.strokeText(s, 540, y); main.fillStyle = fill; main.fillText(s, 540, y); };
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); const tg = main.createLinearGradient(0, 0, 0, 360); tg.addColorStop(0, 'rgba(0,0,8,0.6)'); tg.addColorStop(1, 'rgba(0,0,8,0)'); main.fillStyle = tg; main.fillRect(0, 0, SW, 360);
  main.textAlign = 'center'; main.lineJoin = 'round';
  t('GUIA DE SOBREVIVÊNCIA • EP. 5', 92, 38, '#ffffff'); t('VOCÊ SOBREVIVERIA', 185, 80, '#ffffff'); t('AO BONECO ASSASSINO?', 280, 72, '#ff5a4a'); main.restore();
}
function caption(words, hi) {
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.textAlign = 'left'; main.font = '900 74px "Inter Display", Inter'; main.lineJoin = 'round';
  const sp = main.measureText(' ').width; const tw = words.reduce((a, w, i) => a + main.measureText(w).width * (i === hi ? 1.12 : 1), 0) + sp * (words.length - 1); let x = 540 - tw / 2;
  words.forEach((w, i) => { const s = i === hi ? 1.12 : 1; main.save(); main.translate(x, 1600); main.scale(s, s); main.lineWidth = 13; main.strokeStyle = '#08061a'; main.strokeText(w, 0, 0); main.fillStyle = i === hi ? '#ffd23f' : '#ffffff'; main.fillText(w, 0, 0); main.restore(); x += main.measureText(w).width * s + sp; });
  main.restore();
}
function bubbleText(txt, x, y, size, fill, rot = 0) { main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.translate(x, y); main.rotate(rot); main.textAlign = 'center'; main.font = `900 ${size}px "Inter Display", Inter`; main.lineJoin = 'round'; main.lineWidth = size * 0.2; main.strokeStyle = '#08061a'; main.strokeText(txt, 0, 0); main.fillStyle = fill; main.fillText(txt, 0, 0); main.restore(); }

