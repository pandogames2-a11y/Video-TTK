// EP6 set + villain (2D): summer camp by the lake at night, and the hockey-mask killer grain.
const GY = 1300;   // ground line

function pine(x, y, h, col = '#0f1c26') {
  const w = h * 0.42;
  shape(col, () => { g.moveTo(x, y - h); for (let k = 0; k < 4; k++) { const yy = y - h + (k + 1) * h * 0.22, ww = w * (0.45 + k * 0.18); g.lineTo(x + ww, yy); g.lineTo(x + ww * 0.45, yy - h * 0.02); } g.lineTo(x + w * 0.2, y - h * 0.1); g.lineTo(x + w * 0.2, y); g.lineTo(x - w * 0.2, y); g.lineTo(x - w * 0.2, y - h * 0.1); for (let k = 3; k >= 0; k--) { const yy = y - h + (k + 1) * h * 0.22, ww = w * (0.45 + k * 0.18); g.lineTo(x - ww * 0.45, yy - h * 0.02); g.lineTo(x - ww, yy); } g.closePath(); }, 5);
}
function cabin(x, y, lit = true) {   // log cabin, door + lit window
  rect(x, y - 420, 620, 420, '#7a4a2c', 4);
  for (let yy = y - 390; yy < y; yy += 46) line([x + 6, yy, x + 614, yy], 4, '#4e2c18');
  shape('#4b2a1c', () => { g.moveTo(x - 60, y - 410); g.lineTo(x + 310, y - 640); g.lineTo(x + 680, y - 410); g.closePath(); });
  rect(x + 60, y - 290, 150, 290, '#5a3220', 4, 5); ell(x + 185, y - 140, 9, 9, '#e2b84a', 0, 3);
  rect(x + 330, y - 320, 200, 150, '#3a2214', 4, 5); rect(x + 345, y - 305, 170, 120, lit ? '#ffcf6e' : '#141a30', 2, 4);
  line([x + 430, y - 305, x + 430, y - 185], 5); line([x + 345, y - 245, x + 515, y - 245], 5);
  rect(x + 230, y - 470, 170, 52, '#e8dcc4', 6, 5); g.font = '900 34px "Inter Display", Inter'; g.fillStyle = '#4b2a1c'; g.textAlign = 'center'; g.fillText('CABANA 3', x + 315, y - 432);
}
function camp(opt = {}) {
  // sky + moon + stars
  const sky = g.createLinearGradient(0, -900, 0, GY); sky.addColorStop(0, '#070a22'); sky.addColorStop(1, '#2a3270');
  g.fillStyle = sky; g.fillRect(-2000, -1400, 6000, GY + 1400);
  g.fillStyle = '#f7f1d0'; [[-600, -500], [-200, -700], [150, -420], [520, -760], [900, -560], [1300, -720], [1700, -480], [2100, -650], [-900, -300], [2500, -380]].forEach(([x, y]) => g.fillRect(x, y, 7, 7));
  ell(1500, -560, 110, 110, '#f7f1d0', 0, 5);
  // far tree line, lake with moon reflection, pier, canoe
  for (let x = -1800; x < 3600; x += 120) pine(x, 620, 320 + ((x * 7) % 160), '#0b1520');
  g.fillStyle = '#16204a'; g.fillRect(-2000, 600, 6000, 340); line([-2000, 600, 4000, 600], 5);
  for (let k = 0; k < 7; k++) line([1430 + (k % 2) * 30, 640 + k * 38, 1570 - (k % 2) * 30, 640 + k * 38], 6, 'rgba(247,241,208,0.55)');
  for (let k = 0; k < 6; k++) line([-1200 + k * 520, 700 + (k % 3) * 60, -1080 + k * 520, 700 + (k % 3) * 60], 4, '#2c3a78');
  rect(560, 760, 520, 28, '#6b4630', 3, 5); for (const px of [590, 760, 930, 1060]) rect(px - 8, 788, 16, 120, '#4e2c18', 2, 4);
  shape('#b8452e', () => { g.moveTo(1150, 830); g.quadraticCurveTo(1330, 880, 1500, 830); g.quadraticCurveTo(1330, 850, 1150, 830); }, 5);
  // ground (grass + dirt)
  g.fillStyle = '#2d4a2c'; g.fillRect(-2000, 930, 6000, GY - 930 + 2400); line([-2000, 930, 4000, 930], 5);
  g.fillStyle = '#5a4630'; g.beginPath(); g.ellipse(560, GY + 120, 900, 210, 0, 0, Math.PI * 2); g.fill();
  for (let x = -1900; x < 3900; x += 47) line([x, GY + 600 + (x % 5) * 10, x + 8, GY + 570 + (x % 5) * 10], 4, '#3c6038');
  // cabin on the left, near trees on the right, camp sign
  cabin(-1100, 1020, opt.cabinLit !== false);
  for (const [x, h] of [[1450, 900], [1700, 1100], [2050, 1350], [2400, 1200], [-1500, 1250], [2800, 1300]]) pine(x, 1080, h, '#13242c');
  line([1180, 1060, 1180, 760], 12, '#4e2c18'); line([1540, 1060, 1540, 760], 12, '#4e2c18');
  rect(1120, 640, 480, 150, '#7a4a2c', 10); g.font = '900 52px "Inter Display", Inter'; g.fillStyle = '#f0e2c0'; g.textAlign = 'center'; g.fillText('ACAMPAMENTO', 1360, 705); g.fillText('LAGO CRISTAL', 1360, 765);
  // logs + campfire
  rect(-40, GY - 40, 360, 70, '#6b4630', 34); ell(-40, GY - 5, 18, 34, '#a8794e', 0, 5);
  rect(800, GY - 40, 360, 70, '#6b4630', 34); ell(1160, GY - 5, 18, 34, '#a8794e', 0, 5);
  campfire(560, GY + 60, opt.t || 0, opt.fire ?? 1);
}
function campfire(x, y, t, k = 1) {
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ell(x + Math.cos(a) * 120, y + Math.sin(a) * 30, 34, 22, '#6e6a72', 0, 5); }
  g.save(); g.translate(x, y); g.rotate(0.35); rect(-110, -18, 220, 36, '#5a3220', 16, 5); g.rotate(-0.7); rect(-110, -18, 220, 36, '#6b3d26', 16, 5); g.restore();
  if (k <= 0) return;
  const fl = (s, col, ph) => { const h = (190 + Math.sin(t * 9 + ph) * 25) * k * s, w = 90 * s; shape(col, () => { g.moveTo(x - w, y - 10); g.quadraticCurveTo(x - w * 0.9, y - h * 0.6, x + Math.sin(t * 7 + ph) * 18, y - h); g.quadraticCurveTo(x + w * 0.9, y - h * 0.6, x + w, y - 10); g.closePath(); }, s > 0.8 ? 6 : 0); };
  fl(1, '#e8501f', 0); fl(0.72, '#f7a12a', 1.7); fl(0.42, '#ffe28a', 3.1);
}
// friends: same bean body, different colours + accessories
const friendA = (by, ey) => {   // Bia: ponytail with a pink scrunchie
  shape('#3a2216', () => { g.moveTo(-100, by - 110); g.quadraticCurveTo(0, by - 200, 100, by - 110); g.quadraticCurveTo(0, by - 150, -100, by - 110); }, 5);
  shape('#3a2216', () => { g.moveTo(90, by - 120); g.quadraticCurveTo(190, by - 120, 170, by + 10); g.quadraticCurveTo(150, by - 70, 100, by - 90); g.closePath(); }, 5);
  ell(110, by - 115, 20, 16, '#ff6fae', 0.4, 4);
};
const friendB = (by, ey) => {   // Juca: backwards red cap
  shape('#c0392b', () => { g.moveTo(-104, by - 104); g.quadraticCurveTo(-90, by - 190, 0, by - 192); g.quadraticCurveTo(90, by - 190, 104, by - 104); g.closePath(); }, 6);
  rect(-150, by - 120, 70, 22, '#a32e22', 8, 5); ell(0, by - 190, 12, 8, '#a32e22', 0, 4);
};

// the killer: a big dark-grey grain, white hockey mask, torn olive jacket, machete. Never talks.
function killer(x, y, o = {}) {
  const s = o.s || 1.35; g.save(); g.translate(x, y); g.scale(o.flip ? -s : s, s);
  { const w = o.walk || 0, ph = o.phase || 0;
    for (const [sx, off] of [[-1, 0], [1, Math.PI]]) { const sw = Math.sin(ph + off) * w, lift = Math.max(0, Math.cos(ph + off)) * w; const fx = sx * 45 + sw * 30, fy = -25 - lift * 18; line([sx * 38, -120, fx, fy], 15); rect(fx + sx * 10 - 44, fy - 10, 88, 34, '#2a2620', 14, 5); } }
  const by = -260;
  ell(0, by, 125, 160, '#5d5a58', -0.04);
  g.save(); g.beginPath(); g.ellipse(0, by, 123, 158, -0.04, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#3f4a33'; g.fillRect(-140, by + 10, 280, 170);   // jacket
  shape('#4a563b', () => { g.moveTo(-140, by + 10); g.lineTo(-20, by + 10); g.lineTo(-40, by + 180); g.lineTo(-140, by + 180); g.closePath(); }, 0);
  g.restore();
  g.beginPath(); g.ellipse(0, by, 125, 160, -0.04, 0, Math.PI * 2); g.lineWidth = LW; g.strokeStyle = OUT; g.stroke();
  line([-118, by + 12, -20, by + 12, -10, by + 150], 5); line([20, by + 12, 116, by + 12], 5);
  line([-60, by + 60, -48, by + 90, -64, by + 112], 3, '#262c1e'); line([70, by + 80, 84, by + 104], 3, '#262c1e');   // tears in the jacket
  // arms (left relaxed, right holds the machete)
  const raise = o.raise || 0;
  const hR = [130 + raise * 10, by + 110 - raise * 210];
  line([-108, by + 30, -140, by + 90, -128, by + 140], 15); ell(-128, by + 140, 22, 22, '#5d5a58', 0, 5);
  line([108, by + 30, 150, by + 70 - raise * 120, hR[0], hR[1]], 15);
  if (o.machete !== false) { g.save(); g.translate(hR[0], hR[1]); g.rotate(-0.25 - raise * 0.5); rect(-11, -6, 22, 54, '#2a1c14', 6, 4); shape('#c9cfd8', () => { g.moveTo(-14, -6); g.lineTo(16, -6); g.quadraticCurveTo(30, -150, 6, -230); g.quadraticCurveTo(-18, -160, -14, -6); g.closePath(); }, 5); line([6, -30, 10, -200], 3, '#ffffff'); g.restore(); }
  ell(hR[0], hR[1], 22, 22, '#5d5a58', 0, 5);
  // hockey mask
  const my = by - 60;
  shape('#ecebe2', () => { g.moveTo(-82, my - 70); g.quadraticCurveTo(0, my - 120, 82, my - 70); g.quadraticCurveTo(96, my + 30, 52, my + 96); g.quadraticCurveTo(0, my + 130, -52, my + 96); g.quadraticCurveTo(-96, my + 30, -82, my - 70); }, 6);
  for (const sx of [-1, 1]) {   // red chevrons + eye holes
    shape('#c0282a', () => { g.moveTo(sx * 18, my - 92); g.lineTo(sx * 38, my - 72); g.lineTo(sx * 20, my - 52); g.lineTo(sx * 30, my - 72); g.closePath(); }, 3);
    shape('#c0282a', () => { g.moveTo(sx * 60, my - 30); g.lineTo(sx * 74, my - 6); g.lineTo(sx * 56, my + 2); g.lineTo(sx * 64, my - 12); g.closePath(); }, 3);
    ell(sx * 34, my - 22, 22, 17, '#0a080c', sx * -0.15, 4);
    if (o.glint !== false) { g.fillStyle = '#ffffff'; g.beginPath(); g.arc(sx * 34 + 5, my - 25, 4, 0, 7); g.fill(); }
  }
  g.fillStyle = '#4a4a46'; [[-8, 30], [8, 30], [-20, 50], [0, 50], [20, 50], [-10, 70], [10, 70], [-50, 20], [50, 20], [-40, 50], [40, 50]].forEach(([hx, hy]) => { g.beginPath(); g.arc(hx, my + hy, 5, 0, 7); g.fill(); });
  line([-82, my - 40, -118, my - 30], 5); line([82, my - 40, 118, my - 30], 5);   // strap
  g.restore();
}
