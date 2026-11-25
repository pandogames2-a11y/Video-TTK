// The new Pedrinho: a regular teenage boy (2D, detailed), front-facing, origin at his feet.
// o: s (scale), walk/phase, look [x,y], mouth ('smile'|'o'|'scream'|'flat'), brows (-1 scared .. 1 angry), armL/armR = [elbowX, elbowY, handX, handY] (relative),
//    phone: 'L'|'R' (phone in that hand, flashlight on if o.light), sweat, blink, flip, tilt
const SKIN = '#c98a5e', SKIN_D = '#a86c44', HAIR = '#2a1a12', HOOD = '#e8a423', HOOD_D = '#c4861a', JEANS = '#2f4f86', JEANS_D = '#223b66';
function pedro(x, y, o = {}) {
  const s = o.s || 1; g.save(); g.translate(x, y); g.scale(o.flip ? -s : s, s); if (o.tilt) g.rotate(o.tilt);
  const w = o.walk || 0, ph = o.phase || 0;
  // legs (jeans) + sneakers
  for (const [sx, off] of [[-1, 0], [1, Math.PI]]) {
    const sw = Math.sin(ph + off) * w, lift = Math.max(0, Math.cos(ph + off)) * w;
    const hip = [sx * 34, -300], knee = [sx * 38 + sw * 30, -160 - lift * 30], foot = [sx * 40 + sw * 60, -18 - lift * 40];
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(...hip); g.lineTo(...knee); g.lineTo(...foot); g.lineWidth = 62; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 50; g.strokeStyle = sx < 0 ? JEANS : JEANS_D; g.stroke();
    line([knee[0] - 12, knee[1] - 10, knee[0] + 10, knee[1] + 6], 4, '#1a2a4a');
    shape('#f4f4f0', () => { g.moveTo(foot[0] - 34, foot[1] - 8); g.quadraticCurveTo(foot[0] - 30, foot[1] - 34, foot[0] + 4, foot[1] - 30); g.quadraticCurveTo(foot[0] + sx * 56 + 8, foot[1] - 12, foot[0] + sx * 50, foot[1] + 14); g.lineTo(foot[0] - 36, foot[1] + 14); g.closePath(); }, 6);
    rect(foot[0] - 38, foot[1] + 6, sx > 0 ? 96 : 92, 14, '#d64036', 6, 5);
    for (let i = 0; i < 2; i++) line([foot[0] - 14 + i * 12, foot[1] - 26 + i * 4, foot[0] + 2 + i * 12, foot[1] - 20 + i * 4], 3, '#9aa0a8');
  }
  // torso: hoodie
  shape(HOOD, () => { g.moveTo(-120, -560); g.quadraticCurveTo(-150, -420, -120, -290); g.lineTo(120, -290); g.quadraticCurveTo(150, -420, 120, -560); g.quadraticCurveTo(0, -600, -120, -560); g.closePath(); });
  g.save(); g.beginPath(); g.moveTo(-120, -560); g.quadraticCurveTo(-150, -420, -120, -290); g.lineTo(120, -290); g.quadraticCurveTo(150, -420, 120, -560); g.quadraticCurveTo(0, -600, -120, -560); g.clip();
  g.fillStyle = 'rgba(120,70,10,0.28)'; g.fillRect(50, -620, 120, 340); g.restore();   // side shadow on the hoodie
  curve(-90, -500, -70, -460, -96, -420, 3, '#a8700f'); curve(86, -470, 70, -430, 92, -380, 3, '#a8700f');   // folds
  shape(HOOD_D, () => { g.moveTo(-120, -310); g.lineTo(120, -310); g.lineTo(118, -280); g.lineTo(-118, -280); g.closePath(); }, 5);   // waistband
  shape(HOOD_D, () => { g.moveTo(-70, -400); g.lineTo(70, -400); g.lineTo(84, -330); g.lineTo(-84, -330); g.closePath(); }, 5);   // front pocket
  line([0, -560, 0, -420], 4, '#9a6a14'); line([-24, -560, -30, -470], 4, '#f4f4f0'); line([24, -560, 30, -470], 4, '#f4f4f0');   // zipper + strings
  // arms (sleeves) + hands
  const arm = (sx, a) => {
    const sh = [sx * 112, -540], el = [a[0], a[1]], hd = [a[2], a[3]];
    g.beginPath(); g.moveTo(...sh); g.lineTo(...el); g.lineTo(...hd); g.lineWidth = 56; g.strokeStyle = OUT; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke(); g.lineWidth = 44; g.strokeStyle = sx < 0 ? HOOD : HOOD_D; g.stroke();
    { const dx = hd[0] - el[0], dy = hd[1] - el[1], L = Math.hypot(dx, dy) || 1; line([hd[0] - dx / L * 30 - dy / L * 22, hd[1] - dy / L * 30 + dx / L * 22, hd[0] - dx / L * 30 + dy / L * 22, hd[1] - dy / L * 30 - dx / L * 22], 10, OUT); }   // sleeve cuff
    ell(hd[0], hd[1], 26, 28, SKIN, 0, 6); line([hd[0] - 10, hd[1] + 8, hd[0] - 10, hd[1] + 22], 3, SKIN_D); line([hd[0] + 4, hd[1] + 10, hd[0] + 4, hd[1] + 24], 3, SKIN_D); ell(hd[0] - sx * 20, hd[1] - 10, 11, 15, SKIN, sx * 0.6, 5);   // hand + thumb
  };
  const aL = o.armL || [-150, -440, -140, -330], aR = o.armR || [150, -440, 140, -330];
  arm(-1, aL); arm(1, aR);
  if (o.phone) { const h = o.phone === 'L' ? aL : aR; g.save(); g.translate(h[2], h[3] - 30); g.rotate(o.phoneRot || 0); rect(-22, -40, 44, 80, '#1c1c22', 8, 5); rect(-16, -34, 32, 64, o.light ? '#fffbe0' : '#3a4a6a', 4, 0); if (o.light) ell(0, -46, 8, 5, '#fff', 0, 0); g.restore(); }
  // neck + hood behind head
  rect(-26, -610, 52, 60, SKIN_D, 10, 6);
  shape(HOOD_D, () => { g.moveTo(-110, -560); g.quadraticCurveTo(-130, -620, -70, -640); g.lineTo(70, -640); g.quadraticCurveTo(130, -620, 110, -560); g.quadraticCurveTo(0, -585, -110, -560); g.closePath(); }, 6);
  // head
  const hy = -760, lk = o.look || [0, 0];
  ell(-96, hy + 10, 18, 26, SKIN, 0, 6); ell(96, hy + 10, 18, 26, SKIN, 0, 6); curve(-100, hy, -92, hy + 12, -100, hy + 24, 3, SKIN_D); curve(100, hy, 92, hy + 12, 100, hy + 24, 3, SKIN_D);   // ears
  shape(SKIN, () => { g.moveTo(-92, hy - 60); g.quadraticCurveTo(-100, hy + 80, -40, hy + 120); g.quadraticCurveTo(0, hy + 140, 40, hy + 120); g.quadraticCurveTo(100, hy + 80, 92, hy - 60); g.quadraticCurveTo(0, hy - 120, -92, hy - 60); g.closePath(); });
  // hair: messy fringe
  shape(HAIR, () => { g.moveTo(-104, hy - 10); g.quadraticCurveTo(-120, hy - 140, -20, hy - 150); g.quadraticCurveTo(90, hy - 160, 108, hy - 40); g.lineTo(92, hy - 20); g.lineTo(70, hy - 70); g.lineTo(40, hy - 40); g.lineTo(20, hy - 80); g.lineTo(-10, hy - 44); g.lineTo(-36, hy - 86); g.lineTo(-60, hy - 46); g.lineTo(-84, hy - 70); g.lineTo(-90, hy - 10); g.closePath(); });
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(-40, hy - 118, 40, 10, -0.2, 0, 7); g.fill();   // hair shine
  g.fillStyle = 'rgba(220,90,80,0.28)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 58, hy + 46, 18, 10, 0, 0, 7); g.fill(); }   // cheeks
  // eyes
  const ey = hy - 6, blink = o.blink || 0, scared = o.mouth === 'o' || o.mouth === 'scream';
  for (const sx of [-1, 1]) {
    const ex = sx * 38, rx = 22, ry = scared ? 26 : 22;
    ell(ex, ey, rx, ry * (1 - blink * 0.9), '#ffffff', 0, 5);
    if (blink < 0.6) { ell(ex + lk[0] * 7, ey + lk[1] * 7, 11, 12, '#5a3a22', 0, 0); ell(ex + lk[0] * 7, ey + lk[1] * 7, 6, 6, '#120c0c', 0, 0); ell(ex + lk[0] * 7 + 4, ey + lk[1] * 7 - 5, 3, 3, '#ffffff', 0, 0); }
    curve(ex - 22, ey - ry + 4, ex, ey - ry - 6, ex + 22, ey - ry + 4, 4);   // upper lid line
    const b = o.brows ?? (scared ? -1 : 0); line([ex - sx * 24, ey - 40 - (b < 0 ? 8 : 0), ex + sx * 24, ey - 40 + b * 8], 10, HAIR);
  }
  // nose + mouth
  curve(-6, hy + 30, 4, hy + 46, 10, hy + 38, 4, SKIN_D);
  const my = hy + 78, m = o.mouth || 'smile';
  if (m === 'o') shape('#5a1a1a', () => g.ellipse(0, my, 14, 18, 0, 0, Math.PI * 2), 5);
  else if (m === 'scream') { shape('#5a1a1a', () => g.ellipse(0, my + 4, 26, 32, 0, 0, Math.PI * 2), 5); rect(-16, my - 24, 32, 10, '#fff', 3, 0); }
  else if (m === 'flat') line([-18, my, 18, my], 5);
  else curve(-26, my - 6, 0, my + 14, 26, my - 6, 5);
  if (o.sweat) shape('#bfe4ff', () => { g.moveTo(84, hy - 40); g.quadraticCurveTo(102, hy - 6, 84, hy + 4); g.quadraticCurveTo(66, hy - 6, 84, hy - 40); }, 4);
  g.restore();
}
// the faceless man: very tall and thin, black suit, white shirt, dark tie, a blank pale face. Never talks.
function faceless(x, y, o = {}) {
  const s = o.s || 1; g.save(); g.translate(x, y); g.scale(s, s);
  for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(sx * 30, -620); g.lineTo(sx * 36, -20); g.lineWidth = 46; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 36; g.strokeStyle = '#16161c'; g.stroke(); rect(sx * 36 - 30, -30, 60, 26, '#0a0a0e', 8, 5); }
  shape('#16161c', () => { g.moveTo(-90, -1180); g.lineTo(90, -1180); g.lineTo(100, -600); g.lineTo(-100, -600); g.closePath(); });
  if (!o.back) {
  shape('#f2f2ee', () => { g.moveTo(-36, -1180); g.lineTo(36, -1180); g.lineTo(0, -960); g.closePath(); }, 5);   // shirt
  shape('#1a1a22', () => { g.moveTo(-10, -1170); g.lineTo(10, -1170); g.lineTo(14, -1010); g.lineTo(0, -985); g.lineTo(-14, -1010); g.closePath(); }, 4);   // tie
  line([-36, -1180, -60, -900], 5, '#0a0a0e'); line([36, -1180, 60, -900], 5, '#0a0a0e');   // lapels
  } else line([0, -1180, 0, -620], 4, '#0a0a0e');   // back seam
  for (const sx of [-1, 1]) { const hd = (sx < 0 ? o.handL : o.handR) || [sx * 120, -560]; g.beginPath(); g.moveTo(sx * 84, -1160); g.quadraticCurveTo(sx * 140, -900, hd[0], hd[1]); g.lineWidth = 34; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 24; g.strokeStyle = '#16161c'; g.stroke();
    ell(hd[0], hd[1], 20, 26, '#e8e6e0', 0, 5); for (let i = 0; i < 3; i++) line([hd[0] - 10 + i * 10, hd[1] + 20, hd[0] - 14 + i * 12, hd[1] + 60], 6, '#e8e6e0'); }   // long pale fingers
  if (o.page) { g.save(); g.translate(0, -1080); g.rotate(0.05); rect(-34, -44, 68, 88, '#f3eedc', 3, 4); for (let i = 0; i < 4; i++) line([-24, -26 + i * 16, 24, -26 + i * 16], 3, '#6a6050'); g.restore(); }   // the 8th page pinned on his back/chest
  ell(0, -1270, 70, 92, o.back ? '#d8d6d0' : '#efeee8', 0, 7);   // blank face, no features (from behind: just the bald head)
  g.restore();
}
