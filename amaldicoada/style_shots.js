const SHOT = new URLSearchParams(location.search).get('shot') || 'a';
if (SHOT === 'a') {
  const cam = { x: 900, y: 1150, z: 0.72 };
  g = main; camera(cam); livingRoom(0.5); nightGrade(main, 0.9);
  lightPool(main, cam, 650, HF - 450, 650, 'rgba(255,170,140,A)', 0.55);   // TV glow
  characters(cam, () => {
    doll2(1350, HF - 230, { s: 0.55, sit: true, look: [-1, 0.2] });
    bean(820, HF + 230, { s: 0.85, sit: true, flip: true, look: [-0.2, -0.6], armL: [-120, -170, -60, -120], armR: [120, -170, 60, -120], extra: () => {} });
    controller(820, HF + 230 - 120 * 0.85, 0.7);
  });
  vignette(main, 0.6);
} else {
  const cam = { x: 1350, y: HF - 420, z: 2.0 };
  g = main; camera(cam); livingRoom(0.5); nightGrade(main, 1.1);
  lightPool(main, cam, 1000, HF - 450, 600, 'rgba(255,170,140,A)', 0.4);
  characters(cam, () => doll2(1350, HF - 230, { s: 0.55, sit: true, look: [-0.3, 0.2], evil: true }), 'rgba(255,140,140,0.9)', 0.2);
  vignette(main, 0.7);
}
window.READY = true;
