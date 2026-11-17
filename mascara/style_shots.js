// EP6 style test: ?shot=a (camp wide, the three friends at the fire, killer in the trees) | b (killer close-up)
const SHOT = new URLSearchParams(location.search).get('shot') || 'a';
const fireCol = 'rgba(255,150,60,A)';
if (SHOT === 'a') {
  const cam = { x: 560, y: 980, z: 0.62 };
  g = main; camera(cam); camp({ t: 0.3 }); nightGrade(main, 1);
  lightPool(main, cam, 560, GY - 40, 900, fireCol, 0.55); lightPool(main, cam, -790, 860, 320, 'rgba(255,205,110,A)', 0.35);
  characters(cam, () => {
    killer(560, 1010, { s: 0.72 });   // right behind the fire, nobody notices
    bean(140, GY - 10, { sit: true, look: [0.6, -0.2], mouth: 'o' });                               // Pedrinho
    bean(920, GY - 10, { sit: true, flip: true, col: '#a8673a', lid: '#93582f', extra: friendA, look: [-0.5, 0] });   // Bia
    bean(1180, GY + 20, { flip: true, col: '#d79a5c', lid: '#c0874c', extra: friendB, armR: [110, -230, 170, -330], look: [-0.6, -0.3] });   // Juca telling a story
  });
  vignette(main, 0.6);
} else {
  const cam = { x: 0, y: 900, z: 1.25 };
  g = main; camera(cam); camp({ t: 0.3 }); nightGrade(main, 1.15);
  lightPool(main, cam, -300, 1200, 700, fireCol, 0.5);
  characters(cam, () => killer(0, 1300, { s: 1.6, raise: 0.6 }), 'rgba(255,190,150,0.9)');
  vignette(main, 0.75);
}
window.READY = true;
