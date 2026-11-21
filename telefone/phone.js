// EP9 villain: the phone killer, a grain in a black hooded robe with a long white "screaming ghost" mask and a knife. Never talks (only breathing on the phone).
function ghost(x, y, o = {}) {
  const s = o.s || 1.1; g.save(); g.translate(x, y); g.scale(o.flip ? -s : s, s); if (o.tilt) g.rotate(o.tilt);
  const by = -260;
  // robe: a dark grain with a ragged hem
  shape('#15131c', () => { g.moveTo(-125, by); g.quadraticCurveTo(-130, by - 170, 0, by - 175); g.quadraticCurveTo(130, by - 170, 125, by);
    g.lineTo(140, -10); for (let i = 0; i < 7; i++) g.lineTo(140 - (i + 0.5) * 40, i % 2 ? -10 : 18); g.lineTo(-140, -10); g.closePath(); });
  line([-60, by - 40, -50, -30], 4, '#2a2734'); line([60, by - 40, 50, -30], 4, '#2a2734');   // folds
  // hood opening + mask
  shape('#060509', () => g.ellipse(0, by - 70, 86, 104, 0, 0, Math.PI * 2), 5);
  shape('#f1efe8', () => { g.moveTo(0, by - 160); g.bezierCurveTo(70, by - 160, 74, by - 60, 50, by + 10); g.bezierCurveTo(30, by + 50, -30, by + 50, -50, by + 10); g.bezierCurveTo(-74, by - 60, -70, by - 160, 0, by - 160); g.closePath(); }, 5);
  for (const sx of [-1, 1]) shape('#0a0910', () => { g.moveTo(sx * 10, by - 98); g.quadraticCurveTo(sx * 44, by - 122, sx * 52, by - 92); g.quadraticCurveTo(sx * 46, by - 60, sx * 16, by - 70); g.closePath(); }, 0);   // drooping eyes
  shape('#0a0910', () => { g.moveTo(-14, by - 40); g.quadraticCurveTo(0, by - 50, 14, by - 40); g.quadraticCurveTo(22, by + 10, 0, by + 26); g.quadraticCurveTo(-22, by + 10, -14, by - 40); g.closePath(); }, 0);   // long open mouth
  // arms in robe sleeves + gloved hands
  const hR = o.armR || [150, by + 110], hL = o.armL || [-150, by + 110];
  line([-100, by - 10, hL[0], hL[1]], 22, '#15131c'); line([100, by - 10, hR[0], hR[1]], 22, '#15131c');
  ell(hL[0], hL[1], 20, 20, '#0a0910', 0, 5); ell(hR[0], hR[1], 20, 20, '#0a0910', 0, 5);
  if (o.knife !== false) { g.save(); g.translate(hR[0], hR[1]); g.rotate(o.knifeRot ?? -0.4); rect(-9, -6, 18, 40, '#2a1c14', 4, 4); shape('#d9dde6', () => { g.moveTo(-10, -6); g.lineTo(10, -6); g.lineTo(4, -120); g.lineTo(-10, -100); g.closePath(); }, 5); g.restore(); }
  if (o.phone) { g.save(); g.translate(hL[0], hL[1]); rect(-14, -50, 28, 56, '#1c1c22', 6, 4); g.restore(); }
  g.restore();
}
function landline(x, y, s = 1, ring = 0, off = false) {   // the house phone on the side table, shakes when it rings
  g.save(); g.translate(x + Math.sin(ring * 60) * 4 * (ring > 0 ? 1 : 0), y); g.scale(s, s);
  rect(-50, -40, 100, 40, '#b8352e', 10, 5); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ell(-18 + j * 18, -26 + i * 9, 4, 3, '#f3ece0', 0, 0);
  if (!off) { shape('#b8352e', () => { g.moveTo(-60, -44); g.quadraticCurveTo(0, -70, 60, -44); g.lineTo(52, -36); g.quadraticCurveTo(0, -56, -52, -36); g.closePath(); }, 5); ell(-56, -42, 16, 10, '#b8352e', 0, 4); ell(56, -42, 16, 10, '#b8352e', 0, 4); }
  g.restore();
}
