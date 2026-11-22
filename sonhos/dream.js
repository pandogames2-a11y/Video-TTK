// EP10 set + villain: Pedrinho's bedroom (gamer desk at night) and the dream world (a red & green boiler-room corridor); the dream man grain.
const RF = 1400;   // floor
function bedroom2(t, o = {}) {
  g.fillStyle = '#4a5a7a'; g.fillRect(-1200, -400, 4000, RF + 400);
  for (let x = -1200; x < 2800; x += 140) line([x, -400, x, RF], 3, '#405070');
  g.fillStyle = '#6b4630'; g.fillRect(-1200, RF, 4000, 1600); for (let y = RF + 60; y < RF + 1600; y += 70) line([-1200, y, 2800, y], 3, '#4e2c18');
  // window with the night outside, posters, shelf
  rect(-560, 300, 380, 460, '#efe6d6', 8); const sky = g.createLinearGradient(0, 320, 0, 740); sky.addColorStop(0, '#0b1030'); sky.addColorStop(1, '#2a3270'); rect(-535, 325, 330, 410, sky, 4, 5); ell(-300, 420, 28, 28, '#f7f1d0', 0, 4); line([-370, 325, -370, 735], 5);
  rect(60, 260, 220, 300, '#2a8a5a', 6, 6); g.font = '900 44px "Inter Display", Inter'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText('GAME', 170, 400); g.fillText('OVER', 170, 450);
  rect(1500, 280, 200, 260, '#c0392b', 6, 6); ell(1600, 380, 50, 50, '#f2c22a', 0, 5);
  rect(1100, 620, 380, 24, '#7a4a2c', 4, 5); for (let i = 0; i < 5; i++) rect(1120 + i * 40, 530, 30, 90, ['#3a8fd6', '#46a35a', '#d64036', '#f2c53d', '#8a5ad6'][i], 3, 3);
  // bed on the right
  rect(1500, RF - 260, 700, 120, '#7a4a2c', 10); rect(2140, RF - 520, 60, 520, '#6b3d26', 10); rect(1540, RF - 330, 640, 90, '#c9d4e6', 30); ell(2080, RF - 350, 90, 40, '#f2efe6');
  shape('#3a6fb0', () => { g.moveTo(1520, RF - 340); g.lineTo(1980, RF - 340); g.lineTo(1990, RF - 200); g.lineTo(1510, RF - 200); g.closePath(); });
  // gamer desk: monitor, keyboard, energy drink cans, chair
  rect(300, RF - 340, 760, 34, '#3a3a44', 6, 6); line([340, RF - 306, 340, RF], 10, '#22222a'); line([1020, RF - 306, 1020, RF], 10, '#22222a');
  rect(480, RF - 640, 420, 270, '#16161c', 14, 6); line([690, RF - 370, 690, RF - 340], 14, '#22222a');
  g.save(); g.beginPath(); g.roundRect(500, RF - 620, 380, 230, 8); g.clip();
  if (o.screen === 'menu') { g.fillStyle = '#1b2350'; g.fillRect(500, RF - 620, 380, 230); g.fillStyle = '#7fd6ff'; g.font = '900 40px "Inter Display", Inter'; g.textAlign = 'center'; g.fillText('PAUSE', 690, RF - 500); }
  else { const sk = g.createLinearGradient(0, RF - 620, 0, RF - 390); sk.addColorStop(0, '#3ad0ff'); sk.addColorStop(1, '#a0ff9a'); g.fillStyle = sk; g.fillRect(500, RF - 620, 380, 230); for (let i = 0; i < 4; i++) rect(520 + ((i * 97 + t * 90) % 360), RF - 470 - (i % 2) * 40, 40, 40, '#f2c22a', 4, 3); }
  g.restore();
  const cans = o.cans ?? 3; for (let i = 0; i < cans; i++) { rect(940 + i * 40, RF - 420, 30, 80, ['#46e05a', '#e0e040', '#46e05a'][i % 3], 6, 4); line([945 + i * 40, RF - 395, 965 + i * 40, RF - 395], 4, '#111'); }
  // clock on the wall
  ell(1300, 220, 70, 70, '#f3ece0', 0, 6); g.font = '900 34px "Inter Display", Inter'; g.fillStyle = '#c62828'; g.textAlign = 'center'; g.fillText(o.clock || '04:00', 1300, 232);
}
function dreamHall(t, o = {}) {   // the dream: a red/green boiler-room corridor, pipes, steam, a door at the end
  const sk = g.createLinearGradient(0, -400, 0, RF); sk.addColorStop(0, '#2a0a10'); sk.addColorStop(1, '#4a1a1a'); g.fillStyle = sk; g.fillRect(-1200, -400, 4000, RF + 400);
  for (let x = -1200; x < 2800; x += 240) { rect(x, 200, 160, RF - 200, '#5a1e20', 6, 5); for (let y = 260; y < RF; y += 90) line([x + 10, y, x + 150, y], 3, '#3a1214'); }
  for (const y of [120, 300]) { rect(-1200, y, 4000, 46, '#3a6a3a', 20, 6); for (let x = -1100; x < 2800; x += 400) rect(x, y - 10, 30, 66, '#2a4a2a', 6, 4); }
  g.fillStyle = '#2a1a14'; g.fillRect(-1200, RF, 4000, 1600); for (let x = -1200; x < 2800; x += 120) line([x, RF, x - 60, RF + 1600], 3, '#1a0f0a');
  for (let i = 0; i < 6; i++) { const k = ((t * 0.3 + i / 6) % 1); g.fillStyle = `rgba(230,220,210,${0.25 * Math.sin(k * Math.PI)})`; g.beginPath(); g.ellipse(-300 + i * 420, 330 - k * 300, 90 + k * 60, 50, 0, 0, 7); g.fill(); }   // steam
  rect(980, 400, 300, RF - 400, '#1a0a0a', 10, 6); ell(1240, 900, 12, 12, '#c9a24a', 0, 3);
}
// the dream man: a burnt reddish grain, brown fedora, red & green striped sweater, a glove with long knife fingers. Never talks.
function dreamer(x, y, o = {}) {
  const s = o.s || 1.15; g.save(); g.translate(x, y); g.scale(o.flip ? -s : s, s);
  { const w = o.walk || 0, ph = o.phase || 0; for (const [sx, off] of [[-1, 0], [1, Math.PI]]) { const sw = Math.sin(ph + off) * w, lift = Math.max(0, Math.cos(ph + off)) * w; const fx = sx * 42 + sw * 30, fy = -22 - lift * 18; line([sx * 36, -120, fx, fy], 14); rect(fx + sx * 8 - 40, fy - 10, 80, 30, '#3a2418', 12, 5); } }
  const by = -260;
  ell(0, by, 122, 158, '#b8604a', -0.03);
  g.save(); g.beginPath(); g.ellipse(0, by, 120, 156, -0.03, 0, Math.PI * 2); g.clip();
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2f6a3a' : '#a82a2a'; g.fillRect(-140, by + 20 + i * 22, 280, 22); }   // striped sweater
  g.fillStyle = 'rgba(90,30,20,0.35)'; for (const [bx, bb, r] of [[-50, -80, 22], [40, -110, 16], [60, -40, 18], [-20, -130, 12]]) { g.beginPath(); g.arc(bx, by + bb, r, 0, 7); g.fill(); }   // burn scars
  g.restore();
  g.beginPath(); g.ellipse(0, by, 122, 158, -0.03, 0, Math.PI * 2); g.lineWidth = LW; g.strokeStyle = OUT; g.stroke(); line([-118, by + 20, 118, by + 20], 5);
  const ey = by - 70, lk = o.look || [0, 0];
  for (const sx of [-1, 1]) { ell(sx * 40, ey, 26, 22, '#f2e6c8', 0, 5); ell(sx * 40 + lk[0] * 8, ey + lk[1] * 6, 10, 10, o.evil === false ? '#3a2418' : '#b81e1e', 0, 3); }
  line([-70, ey - 30, -16, ey - 18], 7); line([70, ey - 30, 16, ey - 18], 7);
  shape('#3a0a10', () => { g.moveTo(-50, ey + 50); g.quadraticCurveTo(0, ey + 90, 50, ey + 50); g.quadraticCurveTo(0, ey + 62, -50, ey + 50); }, 4); g.fillStyle = '#f2e6c8'; for (let i = -2; i <= 2; i++) g.fillRect(i * 16 - 5, ey + 54, 10, 10);
  // fedora
  shape('#6b4a2a', () => g.ellipse(0, by - 150, 170, 30, 0, 0, Math.PI * 2), 6);
  shape('#7a5532', () => { g.moveTo(-100, by - 150); g.quadraticCurveTo(-100, by - 250, 0, by - 240); g.quadraticCurveTo(100, by - 250, 100, by - 150); g.closePath(); }, 6);
  rect(-100, by - 178, 200, 26, '#3a2418', 2, 4);
  // arms; the right glove has knife fingers
  const hL = o.armL || [-150, by + 100], hR = o.armR || [160, by + 60];
  line([-108, by + 30, hL[0], hL[1]], 14); ell(hL[0], hL[1], 20, 20, '#b8604a', 0, 5);
  line([108, by + 30, hR[0], hR[1]], 14); ell(hR[0], hR[1], 24, 24, '#5a3a22', 0, 5);
  for (let i = 0; i < 4; i++) { const a = -1.9 + i * 0.28 + (o.claw || 0); g.save(); g.translate(hR[0], hR[1]); g.rotate(a + Math.PI / 2); shape('#d9dde6', () => { g.moveTo(-5, -8); g.lineTo(5, -8); g.lineTo(2, -120); g.lineTo(-3, -110); g.closePath(); }, 4); g.restore(); }
  g.restore();
}
