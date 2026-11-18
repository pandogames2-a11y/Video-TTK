// EP7 set + villain (2D): a small-town street at night in the rain, the storm drain, and the clown grain with a red balloon.
const GY = 1300;     // sidewalk level (houses stand on it)
const CURB = 1420;   // the curb line: the street (asphalt) starts below it
const DRAIN_X = 700; // the storm drain opening in the curb

function house2(x, y, w, col, roof, lit) {
  rect(x, y - 360, w, 360, col, 4);
  for (let yy = y - 330; yy < y; yy += 30) line([x + 4, yy, x + w - 4, yy], 2, 'rgba(0,0,0,0.18)');
  shape(roof, () => { g.moveTo(x - 40, y - 350); g.lineTo(x + w / 2, y - 560); g.lineTo(x + w + 40, y - 350); g.closePath(); });
  rect(x + w * 0.12, y - 280, w * 0.3, 150, '#f3ece0', 4, 5); rect(x + w * 0.12 + 10, y - 270, w * 0.3 - 20, 130, lit ? '#ffcf6e' : '#141a40', 2, 4); line([x + w * 0.27, y - 270, x + w * 0.27, y - 140], 4);
  rect(x + w * 0.6, y - 230, w * 0.22, 230, '#6a3522', 4, 5); ell(x + w * 0.78, y - 110, 7, 7, '#e2b84a', 0, 3);
}
function streetlamp(x) {
  rect(x - 10, GY - 620, 20, 650, '#3a3f4a', 4, 5);
  line([x, GY - 600, x + 90, GY - 640, x + 140, GY - 630], 10, '#3a3f4a');
  shape('#f7e6a0', () => { g.moveTo(x + 100, GY - 640); g.lineTo(x + 180, GY - 640); g.lineTo(x + 165, GY - 610); g.lineTo(x + 115, GY - 610); g.closePath(); }, 5);
}
function stormDrain(x, open = 0) {   // a dark slot in the curb face + a grate in the gutter
  shape('#05040a', () => { g.moveTo(x - 170, CURB - 6); g.lineTo(x + 170, CURB - 6); g.lineTo(x + 150, CURB + 62); g.lineTo(x - 150, CURB + 62); g.closePath(); }, 6);
  for (let i = -3; i <= 3; i++) line([x + i * 40, CURB + 6, x + i * 38, CURB + 58], 6, '#2a2d34');
  if (open > 0) { g.fillStyle = `rgba(255,220,120,${0.25 * open})`; g.fillRect(x - 140, CURB + 4, 280, 54); }
}
function street(t, o = {}) {
  const sky = g.createLinearGradient(0, -400, 0, GY); sky.addColorStop(0, '#0a0f26'); sky.addColorStop(1, '#2a3266');
  g.fillStyle = sky; g.fillRect(-2000, -1400, 6000, GY + 1400);
  for (let i = 0; i < 5; i++) ell(-600 + i * 700, -200 + (i % 2) * 120, 420, 120, '#1a2040', 0, 0);   // heavy clouds
  // far trees + houses
  g.fillStyle = '#0d1430'; for (let i = 0; i < 18; i++) { const x = -1600 + i * 280; g.beginPath(); g.arc(x, GY - 300, 180 + (i % 3) * 40, Math.PI, 0); g.fill(); }
  house2(-1300, GY, 520, '#8fa3b8', '#3a3550', false);
  house2(-500, GY, 600, '#c9b48a', '#5a2e2a', true);
  house2(380, GY, 520, '#9fb59a', '#3a3550', false);
  house2(1200, GY, 600, '#b8a0c0', '#3a3550', true);
  house2(2050, GY, 520, '#c4c0b0', '#5a2e2a', false);
  // lawns, sidewalk, curb, street
  g.fillStyle = '#2b4a33'; g.fillRect(-2000, GY, 6000, 40);
  g.fillStyle = '#8d8a86'; g.fillRect(-2000, GY + 40, 6000, CURB - GY - 40);
  for (let x = -2000; x < 4000; x += 160) line([x, GY + 40, x, CURB], 3, '#76736f');
  rect(-2000, CURB - 14, 6000, 22, '#a9a6a0', 0, 5);
  g.fillStyle = '#23262e'; g.fillRect(-2000, CURB + 8, 6000, 2000);
  for (let x = -1900; x < 4000; x += 360) rect(x, CURB + 520, 180, 22, '#c9b84a', 4, 0);   // lane marks
  // the gutter stream: water running along the curb toward the drain
  g.fillStyle = 'rgba(120,150,220,0.45)'; g.fillRect(-2000, CURB + 8, 6000, 70);
  for (let i = 0; i < 40; i++) { const x = ((i * 173 + t * 260) % 4400) - 1500; line([x, CURB + 30 + (i % 3) * 14, x + 60, CURB + 30 + (i % 3) * 14], 3, 'rgba(200,220,255,0.6)'); }
  stormDrain(DRAIN_X, o.drainGlow || 0);
  // puddles
  for (const [x, y, w] of [[-300, CURB + 300, 260], [1500, CURB + 420, 320], [400, CURB + 700, 220]]) ell(x, y, w, 30, 'rgba(110,140,210,0.4)', 0, 0);
  streetlamp(-700); streetlamp(1700);
}
function rain(t, cam, amt = 1) {   // screen-space rain streaks
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.strokeStyle = 'rgba(190,210,255,0.35)'; main.lineWidth = 2.5; main.beginPath();
  for (let i = 0; i < 160 * amt; i++) { const x = (i * 97.3 + t * 140) % 1180 - 50, y = ((i * 211.7) + t * 1900) % 2050 - 80; main.moveTo(x, y); main.lineTo(x - 14, y + 46); }
  main.stroke(); main.restore();
}
function paperBoat(x, y, s = 1, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  shape('#f4f1e6', () => { g.moveTo(-70, -20); g.lineTo(70, -20); g.lineTo(46, 12); g.lineTo(-46, 12); g.closePath(); }, 5);
  shape('#e8e3d2', () => { g.moveTo(-30, -20); g.lineTo(0, -80); g.lineTo(30, -20); g.closePath(); }, 5);
  g.restore();
}
function balloon(x, y, s = 1, sway = 0) {   // red balloon on a string (string ends at x,y)
  g.save(); g.translate(x, y); g.scale(s, s);
  curve(0, 0, 20 + sway * 20, -120, sway * 30, -230, 3, '#e8e8e8');
  ell(sway * 30, -320, 72, 90, '#d6261e'); shape('#d6261e', () => { g.moveTo(sway * 30 - 12, -228); g.lineTo(sway * 30 + 12, -228); g.lineTo(sway * 30, -240); g.closePath(); }, 4);
  g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(sway * 30 - 24, -350, 14, 26, -0.4, 0, 7); g.fill();
  g.restore();
}
// Juca: backwards red cap (same as EP6)
const juca = (x, y, o = {}) => bean(x, y, { col: '#d79a5c', lid: '#c0874c', ...o, extra: (by) => {
  shape('#c0392b', () => { g.moveTo(-104, by - 104); g.quadraticCurveTo(-90, by - 190, 0, by - 192); g.quadraticCurveTo(90, by - 190, 104, by - 104); g.closePath(); }, 6);
  rect(-150, by - 120, 70, 22, '#a32e22', 8, 5); ell(0, by - 190, 12, 8, '#a32e22', 0, 4); if (o.extra) o.extra(by); } });
const raincoat = (col) => (by) => {   // yellow raincoat: coat on the lower body + hood with a brim around the face
  g.save(); g.beginPath(); g.ellipse(0, by, 116, 151, -0.08, 0, Math.PI * 2); g.clip(); g.fillStyle = col; g.fillRect(-140, by + 46, 280, 140); g.restore();
  line([-112, by + 46, 112, by + 46], 5); for (const yy of [by + 80, by + 115]) ell(0, yy, 7, 7, '#ffffff', 0, 3);
  shape(col, () => { g.moveTo(-126, by - 10); g.quadraticCurveTo(-140, by - 190, 0, by - 192); g.quadraticCurveTo(140, by - 190, 126, by - 10); g.quadraticCurveTo(104, by - 110, 0, by - 124); g.quadraticCurveTo(-104, by - 110, -126, by - 10); g.closePath(); }, 6);
  shape('#d9a91c', () => { g.moveTo(-110, by - 130); g.quadraticCurveTo(0, by - 175, 110, by - 130); g.quadraticCurveTo(0, by - 150, -110, by - 130); }, 5);
};

// the clown: a white grain with a big forehead, orange tufts, red nose, a ruff collar and pom-poms. Never talks.
function clown(x, y, o = {}) {
  const s = o.s || 1.2; g.save(); g.translate(x, y); g.scale(o.flip ? -s : s, s); if (o.tilt) g.rotate(o.tilt);
  const by = -260;
  if (!o.noLegs) for (const sx of [-1, 1]) { line([sx * 38, -120, sx * 48, -25], 14); ell(sx * 62, -14, 50, 22, '#e9e6dc'); ell(sx * 62, -30, 14, 12, '#d6261e', 0, 4); }
  ell(0, by, 125, 160, '#f2efe6', -0.03);
  g.save(); g.beginPath(); g.ellipse(0, by, 123, 158, -0.03, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#dcd8cc'; g.fillRect(-140, by + 40, 280, 140);   // costume
  for (const [px, py] of [[0, by + 105], [0, by + 145]]) ell(px, py, 18, 18, '#e0572a', 0, 4);   // pom-poms
  g.restore();
  g.beginPath(); g.ellipse(0, by, 125, 160, -0.03, 0, Math.PI * 2); g.lineWidth = LW; g.strokeStyle = OUT; g.stroke();
  // ruff collar
  for (let i = -5; i <= 5; i++) ell(i * 22, by + 66 - Math.abs(i) * 3, 22, 16, '#f7f5ee', 0, 4);
  // arms (gloved hands); the right hand holds the balloon string when o.balloon
  const hR = o.armR || [150, by + 60], hL = o.armL || [-150, by + 90];
  line([-112, by + 70, hL[0], hL[1]], 13); ell(hL[0], hL[1], 22, 22, '#ffffff', 0, 5);
  line([112, by + 70, hR[0], hR[1]], 13); ell(hR[0], hR[1], 22, 22, '#ffffff', 0, 5);
  // hair tufts + forehead lines
  for (const sx of [-1, 1]) shape('#e0572a', () => { g.moveTo(sx * 92, by - 120); g.quadraticCurveTo(sx * 190, by - 160, sx * 170, by - 60); g.quadraticCurveTo(sx * 200, by - 40, sx * 150, by - 20); g.quadraticCurveTo(sx * 130, by - 70, sx * 110, by - 70); g.closePath(); }, 5);
  const ey = by - 62, evil = o.evil;
  // red lines from the eyebrows up the forehead + a smile line up to the cheeks
  for (const sx of [-1, 1]) curve(sx * 40, ey - 38, sx * 48, ey - 70, sx * 30, ey - 92, 6, '#c62828');
  ell(-40, ey, 30, 34, '#ffffff', 0, 5); ell(40, ey, 30, 34, '#ffffff', 0, 5);
  const iris = evil ? '#f2c22a' : '#5a8fd6', lk = o.look || [0, 0];
  for (const sx of [-1, 1]) { ell(sx * 40 + lk[0] * 10, ey + 4 + lk[1] * 10, 13, 15, iris, 0, 3); ell(sx * 40 + lk[0] * 10, ey + 4 + lk[1] * 10, 5, 6, OUT, 0, 0); }
  if (evil) { line([-74, ey - 40, -16, ey - 22], 8); line([74, ey - 40, 16, ey - 22], 8); }
  ell(0, ey + 46, 22, 20, '#d6261e', 0, 5);   // nose
  if (evil) { shape('#4a1820', () => { g.moveTo(-70, ey + 70); g.quadraticCurveTo(0, ey + 140, 70, ey + 70); g.quadraticCurveTo(0, ey + 96, -70, ey + 70); }, 5); g.fillStyle = '#fff'; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * 16 - 7, ey + 82 + Math.abs(i) * -3); g.lineTo(i * 16 + 7, ey + 82 + Math.abs(i) * -3); g.lineTo(i * 16, ey + 100); g.fill(); } }
  else curve(-60, ey + 74, 0, ey + 110, 60, ey + 74, 7, '#c62828');
  g.restore();
}
