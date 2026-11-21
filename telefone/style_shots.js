const SHOT = new URLSearchParams(location.search).get('shot') || 'a';
if (SHOT === 'a') {
  const cam = { x: 950, y: 1020, z: 0.82 };
  g = main; camera(cam); house(); nightGrade(main, 1);
  lightPool(main, cam, 1330, 840, 520, 'rgba(255,190,110,A)', 0.5); lightPool(main, cam, 1010, 1380, 700, 'rgba(90,170,255,A)', 0.3);
  characters(cam, () => { landline(597, FY - 190, 1, 0.3); bean(1010, FY + 20, { sit: true, s: 1.05, look: [-1, -0.2], mouth: 'o' }); popcorn(895, FY - 92); });
  // the masked killer outside the window
  g = main; camera(cam);
  characters(cam, () => { g.save(); g.beginPath(); g.rect(845, 365, 330, 420); g.clip(); ghost(1060, 900, { s: 0.55, knife: false }); g.restore(); }, 'rgba(220,220,255,0.6)', 0.3);
  vignette(main, 0.6);
} else {
  const cam = { x: 0, y: 1060, z: 1.5 };
  g = main; g.fillStyle = '#0b1030'; g.fillRect(0, 0, SW, SH); camera(cam);
  nightGrade(main, 0.6);
  characters(cam, () => ghost(0, 1400, { s: 1.6, phone: true, armL: [-120, -330], armR: [160, -200] }), 'rgba(200,210,255,0.9)', 0.15);
  vignette(main, 0.7);
}
window.READY = true;
