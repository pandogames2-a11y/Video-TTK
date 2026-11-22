const SHOT = new URLSearchParams(location.search).get('shot') || 'a';
if (SHOT === 'a') {
  const cam = { x: 760, y: 1050, z: 0.85 };
  g = main; camera(cam); bedroom2(0.5); nightGrade(main, 1);
  lightPool(main, cam, 690, RF - 500, 600, 'rgba(120,220,255,A)', 0.5);
  characters(cam, () => {
    rect(600, RF - 300, 200, 40, '#2a2a34', 10, 5); line([700, RF - 260, 700, RF - 40], 12, '#22222a'); line([620, RF - 30, 780, RF - 30], 10, '#22222a');   // chair
    rect(620, RF - 560, 160, 260, '#c0392b', 30, 6);   // chair back
    bean(700, RF - 280, { sit: true, s: 0.8, blink: 1, mouth: 'o', tilt: 0.25, armL: [-120, -170, -60, -120], armR: [120, -170, 60, -120] });
  });
  vignette(main, 0.6);
} else {
  const cam = { x: 700, y: 1000, z: 1.0 };
  g = main; camera(cam); dreamHall(0.5); nightGrade(main, 0.6);
  lightPool(main, cam, 700, 900, 700, 'rgba(255,80,40,A)', 0.4);
  characters(cam, () => dreamer(700, RF + 60, { s: 1.3, armR: [190, -330], claw: 0.2 }), 'rgba(255,170,120,0.9)', 0.2);
  vignette(main, 0.75);
}
window.READY = true;
