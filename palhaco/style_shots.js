const SHOT = new URLSearchParams(location.search).get('shot') || 'a';
const LAMP = 'rgba(255,220,140,A)';
if (SHOT === 'a') {
  const cam = { x: 1000, y: 1180, z: 0.95 };
  g = main; camera(cam); street(0.4); nightGrade(main, 1);
  lightPool(main, cam, 1810, GY - 600, 700, LAMP, 0.4); lightPool(main, cam, -590, GY - 600, 600, LAMP, 0.3);
  characters(cam, () => {
    paperBoat(930, CURB + 40, 0.9, 0.05);
    bean(1150, CURB - 10, { s: 0.85, look: [-1, 0.4], extra: raincoat('#f2c22a'), armR: [120, -230, 60, -110] });   // Pedrinho in a raincoat
    juca(1420, CURB - 40, { s: 0.78, look: [-1, 0.3], flip: true });
  });
  // eyes glowing inside the drain
  main.save(); main.setTransform(1, 0, 0, 1, 0, 0); main.globalCompositeOperation = 'screen';
  for (const dx of [-28, 28]) { const x = 540 + (DRAIN_X + dx - cam.x) * cam.z, y = 960 + (CURB + 30 - cam.y) * cam.z; const gr = main.createRadialGradient(x, y, 0, x, y, 40); gr.addColorStop(0, 'rgba(255,210,40,1)'); gr.addColorStop(1, 'rgba(255,210,40,0)'); main.fillStyle = gr; main.fillRect(x - 50, y - 50, 100, 100); }
  main.restore();
  rain(0.4, cam); vignette(main, 0.55);
} else {
  const cam = { x: DRAIN_X + 40, y: CURB - 250, z: 1.6 };
  g = main; camera(cam); street(0.4, { drainGlow: 1 }); nightGrade(main, 1.1);
  lightPool(main, cam, DRAIN_X, CURB, 400, 'rgba(255,200,120,A)', 0.35);
  characters(cam, () => { g.save(); g.beginPath(); g.rect(DRAIN_X - 400, CURB - 900, 800, 900 + 60); g.clip(); clown(DRAIN_X, CURB + 170, { s: 1.0, evil: true, noLegs: true, armR: [170, -330] }); g.restore(); balloon(DRAIN_X + 170, CURB + 170 - 330, 1, 0.3); }, 'rgba(255,200,160,0.9)', 0.2);
  stormDrainLip();
  rain(0.4, cam); vignette(main, 0.7);
}
function stormDrainLip() {}
window.READY = true;
