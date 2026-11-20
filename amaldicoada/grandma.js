// EP8 set + villain (2D): the grandparents' old living room at night, the TV with the video game, the rocking chair, and the cursed doll grain.
const HF = 1400;   // floor line

function rockingChair(x, y, rock = 0) {   // seen from the side-ish front; rock = angle
  g.save(); g.translate(x, y); g.rotate(rock);
  curve(-170, 0, 0, 40, 170, 0, 12, '#5a3220');   // rocker
  line([-120, 10, -110, -200], 12, '#5a3220'); line([120, 10, 110, -200], 12, '#5a3220');
  rect(-140, -230, 280, 40, '#7a4a2c', 10, 6);   // seat
  for (let i = 0; i < 5; i++) line([-110 + i * 55, -230, -120 + i * 60, -560], 10, '#7a4a2c');   // back spindles
  rect(-150, -600, 300, 60, '#7a4a2c', 18, 6); line([-150, -230, -150, -380], 10, '#5a3220'); line([150, -230, 150, -380], 10, '#5a3220');
  rect(-180, -400, 70, 22, '#7a4a2c', 8, 5); rect(110, -400, 70, 22, '#7a4a2c', 8, 5);   // arm rests
  g.restore();
}
function oldTV(x, y, t, on = true, mode = 'city') {   // a chunky old TV on a wooden stand, showing an open-world city game
  rect(x - 220, y - 60, 440, 60, '#6a3f26', 6, 6); line([x - 190, y, x - 190, y + 150], 10, '#4a2a18'); line([x + 190, y, x + 190, y + 150], 10, '#4a2a18');
  rect(x - 240, y - 400, 480, 340, '#3a3a40', 26, 7);
  g.save(); g.beginPath(); g.roundRect(x - 210, y - 370, 360, 280, 18); g.clip();
  if (on && mode === 'shop') {   // in-game shoe store: shelves of sneakers
    g.fillStyle = '#f0e6d8'; g.fillRect(x - 210, y - 370, 360, 280);
    for (let r = 0; r < 3; r++) { g.fillStyle = '#b88a3e'; g.fillRect(x - 210, y - 290 + r * 80, 360, 10);
      for (let i = 0; i < 5; i++) { const sx = x - 190 + i * 70, sy = y - 296 + r * 80; shape(['#e0302a', '#3a8fd6', '#46a35a', '#f2c22a', '#ff7ab0'][(i + r) % 5], () => { g.moveTo(sx, sy); g.lineTo(sx + 50, sy); g.quadraticCurveTo(sx + 55, sy - 18, sx + 30, sy - 22); g.lineTo(sx + 12, sy - 30); g.lineTo(sx, sy - 22); g.closePath(); }, 3); } }
  } else if (on) {
    const sk = g.createLinearGradient(0, y - 370, 0, y - 90); sk.addColorStop(0, '#ff7ab0'); sk.addColorStop(0.6, '#ffb36a'); sk.addColorStop(1, '#ffd98a'); g.fillStyle = sk; g.fillRect(x - 210, y - 370, 360, 280);
    g.fillStyle = '#5a2a6a'; for (let i = 0; i < 9; i++) { const bx = x - 210 + i * 42, bh = 60 + (i * 37) % 90; g.fillRect(bx, y - 150 - bh, 34, bh); }   // skyline
    for (let i = 0; i < 6; i++) { g.fillStyle = '#2a8a5a'; g.fillRect(x - 200 + i * 64, y - 175, 8, 50); ell(x - 196 + i * 64, y - 180, 20, 12, '#2a8a5a', 0, 0); }   // palm trees
    g.fillStyle = '#3a3a48'; g.fillRect(x - 210, y - 125, 360, 40);
    const cx = x - 150 + ((t * 120) % 300); rect(cx, y - 140, 70, 26, '#e0302a', 6, 3); ell(cx + 15, y - 112, 8, 8, '#111', 0, 0); ell(cx + 55, y - 112, 8, 8, '#111', 0, 0);   // a car driving
  } else { g.fillStyle = '#0c0f14'; g.fillRect(x - 210, y - 370, 360, 280); }
  g.restore();
  g.beginPath(); g.roundRect(x - 210, y - 370, 360, 280, 18); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke();
  ell(x + 195, y - 320, 16, 16, '#c9a24a', 0, 4); ell(x + 195, y - 260, 16, 16, '#c9a24a', 0, 4); rect(x + 178, y - 200, 34, 80, '#2a2a30', 4, 4);
  line([x - 60, y - 400, x - 140, y - 520], 5); line([x + 40, y - 400, x + 120, y - 520], 5);   // rabbit ears
  // the console on the shelf
  rect(x - 100, y + 60, 200, 40, '#16161c', 8, 5); ell(x + 70, y + 80, 6, 6, '#3ad0ff', 0, 0);
}
function livingRoom(t, o = {}) {
  // old floral wallpaper
  g.fillStyle = '#8a9a6e'; g.fillRect(-1200, -400, 4000, HF + 400);
  for (let x = -1200; x < 2800; x += 120) for (let y = -300; y < HF; y += 140) { const ox = (y / 140) % 2 ? 60 : 0; ell(x + ox, y, 14, 14, '#a8b486', 0, 0); ell(x + ox, y - 18, 6, 10, '#6e7d55', 0, 0); }
  g.fillStyle = '#3e4a32'; g.fillRect(-1200, HF - 160, 4000, 160); line([-1200, HF - 160, 2800, HF - 160], 6);   // wainscot
  g.fillStyle = '#7a4a2c'; g.fillRect(-1200, HF, 4000, 1600); for (let y = HF + 60; y < HF + 1600; y += 70) line([-1200, y, 2800, y], 3, '#5a3220');
  ell(560, HF + 220, 620, 120, '#7a2a30'); ell(560, HF + 220, 520, 95, '#94404a', 0, 5);   // rug
  // window with lace curtains, wall clock, old portraits
  rect(-700, 300, 380, 520, '#efe6d6', 8); const sky = g.createLinearGradient(0, 320, 0, 800); sky.addColorStop(0, '#0b1030'); sky.addColorStop(1, '#2a3270'); rect(-675, 325, 330, 470, sky, 4, 5);
  ell(-420, 420, 30, 30, '#f7f1d0', 0, 4); line([-510, 325, -510, 795], 5);
  for (const sx of [-1, 1]) shape('rgba(240,235,225,0.85)', () => { const cx = -510 + sx * 140; g.moveTo(cx - 70, 300); g.lineTo(cx + 70, 300); g.quadraticCurveTo(cx + sx * 20, 560, cx + 60 * sx, 840); g.lineTo(cx - 60 * sx, 840); g.closePath(); }, 4);
  ell(1500, 260, 80, 80, '#d8c8a4', 0, 6); line([1500, 260, 1500, 205], 5); line([1500, 260, 1540, 280], 5); rect(1480, 340, 40, 160, '#6b4630', 6, 4); ell(1500, 520, 30, 30, '#c9a24a', 0, 4);   // pendulum clock
  for (const [px, py] of [[160, 380], [380, 340]]) { rect(px, py, 150, 190, '#b88a3e', 8, 6); rect(px + 15, py + 15, 120, 160, '#c8b48e', 4, 4); ell(px + 75, py + 85, 38, 50, '#7a5a3c', 0, 3); }
  feijao(1500, 214, 0.5, 0.2);   // hidden bean #1 (on top of the wall clock)
  // the sofa where the grandparents nap, the TV and the rocking chair
  rect(-350, HF - 330, 560, 220, '#8a5a6a', 50); rect(-380, HF - 170, 620, 130, '#9a6a7a', 30); rect(-400, HF - 250, 90, 210, '#8a5a6a', 30); rect(180, HF - 250, 90, 210, '#8a5a6a', 30);
  for (let i = 0; i < 3; i++) ell(-240 + i * 170, HF - 260, 40, 26, '#efe6d6', 0, 4);   // doilies
  // the guest-room door on the right (open/closed), and hidden bean #2 on the sofa doily
  rect(1820, HF - 620, 300, 620, '#efe6d6', 8); rect(1845, HF - 600, 250, 600, o.doorOpen ? '#05040a' : '#6a3522', 4, 5);
  if (!o.doorOpen) { rect(1870, HF - 570, 200, 220, '#5a2c1a', 4, 4); rect(1870, HF - 320, 200, 280, '#5a2c1a', 4, 4); ell(2070, HF - 300, 10, 10, '#e2b84a', 0, 3); }
  rect(1880, HF - 700, 180, 56, '#e8dcc4', 6, 4); g.font = '900 24px "Inter Display", Inter'; g.fillStyle = '#4b2a1c'; g.textAlign = 'center'; g.fillText('HÓSPEDES', 1970, HF - 664);
  feijao(-70, HF - 284, 0.5, 0.1);
  oldTV(700, HF - 220, t, o.tvOn !== false, o.tvMode);
  rockingChair(1350, HF, o.rock || 0);
}
// the cursed doll: a pale porcelain grain with dark yarn braids, rosy cheeks, a crack on the forehead, a lace dress with a red bow. Never talks.
function doll2(x, y, o = {}) {
  const s = o.s || 0.8; g.save(); g.translate(x, y); g.scale(o.flip ? -s : s, s); if (o.tilt) g.rotate(o.tilt);
  const by = -230;
  if (!o.sit) for (const sx of [-1, 1]) { line([sx * 30, -110, sx * 36, -25], 12); ell(sx * 46, -16, 32, 16, '#2a1a14'); }
  else for (const sx of [-1, 1]) { line([sx * 40, -100, sx * 80, -30], 12); ell(sx * 92, -22, 30, 15, '#2a1a14'); }
  // braids behind the body
  for (const sx of [-1, 1]) { for (let i = 0; i < 6; i++) ell(sx * (98 + i * 4), by - 30 + i * 34, 22, 20, '#3a2418', 0, 4); ell(sx * 120, by + 180, 12, 12, '#c62828', 0, 3); }
  ell(0, by, 110, 145, '#efe3d6', -0.02);
  g.save(); g.beginPath(); g.ellipse(0, by, 108, 143, -0.02, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#f7f4ee'; g.fillRect(-130, by + 30, 260, 160);   // lace dress
  for (let i = -5; i <= 5; i++) ell(i * 24, by + 32, 13, 10, '#ffffff', 0, 3);
  g.restore();
  g.beginPath(); g.ellipse(0, by, 110, 145, -0.02, 0, Math.PI * 2); g.lineWidth = LW; g.strokeStyle = OUT; g.stroke();
  for (const sx of [-1, 1]) shape('#c62828', () => { g.moveTo(0, by + 46); g.lineTo(sx * 50, by + 26); g.lineTo(sx * 50, by + 66); g.closePath(); }, 4);
  ell(0, by + 46, 12, 12, '#a01f1f', 0, 4);
  const hL = o.armL || [-120, by + 110], hR = o.armR || [120, by + 110];
  line([-96, by + 40, hL[0], hL[1]], 11); ell(hL[0], hL[1], 17, 17, '#efe3d6', 0, 5);
  line([96, by + 40, hR[0], hR[1]], 11); ell(hR[0], hR[1], 17, 17, '#efe3d6', 0, 5);
  // hair parted in the middle
  shape('#3a2418', () => { g.moveTo(-104, by - 50); g.quadraticCurveTo(-100, by - 160, 0, by - 150); g.quadraticCurveTo(100, by - 160, 104, by - 50); g.quadraticCurveTo(70, by - 120, 0, by - 118); g.quadraticCurveTo(-70, by - 120, -104, by - 50); g.closePath(); }, 5);
  line([0, by - 150, 0, by - 118], 4);
  const ey = by - 40, lk = o.look || [0, 0];
  for (const sx of [-1, 1]) { ell(sx * 38, ey, 24, 26, '#ffffff', 0, 5); ell(sx * 38 + lk[0] * 9, ey + lk[1] * 9, 11, 13, o.evil ? '#1a0a0a' : '#4a6a9a', 0, 3); if (!o.evil) ell(sx * 38 + lk[0] * 9, ey + lk[1] * 9, 4, 5, OUT, 0, 0); ell(sx * 38 + lk[0] * 9 + 4, ey + lk[1] * 9 - 5, 3, 3, '#ffffff', 0, 0); }
  for (const sx of [-1, 1]) curve(sx * 58, ey - 30, sx * 38, ey - 40, sx * 18, ey - 30, 4);
  g.fillStyle = 'rgba(220,90,100,0.55)'; for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * 62, ey + 40, 18, 11, 0, 0, 7); g.fill(); }
  line([30, by - 110, 46, by - 84, 38, by - 66, 52, by - 46], 3, '#6a5a50');   // porcelain crack
  if (o.evil) { shape('#3a0a10', () => { g.moveTo(-30, ey + 58); g.quadraticCurveTo(0, ey + 86, 30, ey + 58); g.quadraticCurveTo(0, ey + 68, -30, ey + 58); }, 4); }
  else curve(-14, ey + 60, 0, ey + 66, 14, ey + 60, 4, '#a01f1f');
  g.restore();
}
function controller(x, y, s = 1, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); shape('#22232a', () => { g.moveTo(-60, -20); g.quadraticCurveTo(0, -36, 60, -20); g.quadraticCurveTo(80, 30, 50, 30); g.quadraticCurveTo(0, 6, -50, 30); g.quadraticCurveTo(-80, 30, -60, -20); g.closePath(); }, 5); ell(30, -8, 6, 6, '#3ad0ff', 0, 0); ell(-30, -6, 8, 8, '#55555f', 0, 3); g.restore(); }

// the guest room: dark, a bed with a quilt, a nightstand with a lamp (off), a wardrobe
function guestRoom(t, o = {}) {
  g.fillStyle = '#5a6a8a'; g.fillRect(-1200, -400, 4000, HF + 400);
  for (let x = -1200; x < 2800; x += 90) line([x, -400, x, HF], 3, '#4e5c7a');   // striped wallpaper
  g.fillStyle = '#5a3a24'; g.fillRect(-1200, HF, 4000, 1600); for (let y = HF + 60; y < HF + 1600; y += 70) line([-1200, y, 2800, y], 3, '#3e2616');
  rect(-300, 300, 360, 460, '#efe6d6', 8); rect(-275, 325, 310, 410, '#0b1030', 4, 5); line([-120, 325, -120, 735], 5); ell(-20, 420, 26, 26, '#f7f1d0', 0, 4);   // window + moon
  rect(160, HF - 260, 700, 120, '#7a4a2c', 10); rect(140, HF - 520, 60, 520, '#6b3d26', 10); rect(840, HF - 380, 50, 380, '#6b3d26', 10);   // bed frame
  rect(200, HF - 330, 640, 90, '#c9d4e6', 30); ell(280, HF - 350, 90, 40, '#f2efe6');   // mattress + pillow
  shape('#a0405a', () => { g.moveTo(380, HF - 340); g.lineTo(840, HF - 340); g.lineTo(850, HF - 200); g.lineTo(370, HF - 200); g.closePath(); }); for (let x = 420; x < 840; x += 70) line([x, HF - 338, x, HF - 202], 4, '#7e2e46');   // quilt
  rect(960, HF - 280, 200, 280, '#6b3d26', 6); rect(980, HF - 250, 160, 90, '#5a3220', 4, 4); line([1020, HF - 280, 1020, HF - 380], 8, '#3a2a20'); shape('#d8c49a', () => { g.moveTo(970, HF - 380); g.lineTo(1070, HF - 380); g.lineTo(1045, HF - 450); g.lineTo(995, HF - 450); g.closePath(); }, 5);
  feijao(1120, HF - 292, 0.55, -0.1);   // hidden bean #3 (on the nightstand)
  rect(1300, HF - 760, 380, 760, '#5a3220', 10); line([1490, HF - 740, 1490, HF - 20], 5); ell(1470, HF - 400, 9, 9, '#c9a24a', 0, 3); ell(1510, HF - 400, 9, 9, '#c9a24a', 0, 3);   // wardrobe
}
function phoneUI(x, y, s, t, a = 1) {   // big phone on screen showing a game LIVE
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = a; main.translate(x, y); main.scale(s, s);
  main.fillStyle = '#111216'; main.strokeStyle = '#08061a'; main.lineWidth = 10; main.beginPath(); main.roundRect(-170, -320, 340, 640, 44); main.fill(); main.stroke();
  main.save(); main.beginPath(); main.roundRect(-150, -290, 300, 580, 26); main.clip();
  const sk = main.createLinearGradient(0, -290, 0, 100); sk.addColorStop(0, '#ff7ab0'); sk.addColorStop(1, '#ffd98a'); main.fillStyle = sk; main.fillRect(-150, -290, 300, 400);
  main.fillStyle = '#5a2a6a'; for (let i = 0; i < 7; i++) { const bh = 60 + (i * 37) % 90; main.fillRect(-150 + i * 44, 40 - bh, 36, bh); }
  main.fillStyle = '#3a3a48'; main.fillRect(-150, 40, 300, 70); main.fillStyle = '#e0302a'; main.fillRect(-120 + ((t * 140) % 220), 50, 60, 24);
  main.fillStyle = '#1c1d24'; main.fillRect(-150, 110, 300, 180);
  for (let i = 0; i < 4; i++) { main.fillStyle = ['#7fd6ff', '#ffd23f', '#a0ff9a', '#ff9ad6'][i]; main.fillRect(-135, 130 + i * 38, 60 + (i * 31) % 80, 14); main.fillStyle = '#c9ccd4'; main.fillRect(-60 + (i * 31) % 80, 130 + i * 38, 120, 14); }   // chat
  main.restore();
  main.fillStyle = '#e0241c'; main.beginPath(); main.roundRect(-140, -280, 120, 44, 10); main.fill(); main.fillStyle = '#fff'; main.font = '900 28px "Inter Display", Inter'; main.textAlign = 'center'; main.textBaseline = 'middle'; main.fillText('AO VIVO', -80, -257);
  main.restore();
}
