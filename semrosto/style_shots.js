const SHOT = new URLSearchParams(location.search).get('shot') || 'a';
const SCR = { x: SW / 2, y: SH / 2, z: 1 };
if (SHOT === 'a') {
  cam3.position.set(0.5, 1.4, 5.2); cam3.lookAt(-0.1, 1.5, -2);
  const P = [0, 0, 0.4]; aimFlash([0.35, 1.3, 0.3], [1.0, 1.1, -4]);
  renderer.render(scene, cam3); main.clearRect(0, 0, SW, SH);
  const [px, py, d] = proj(...P), s = 1.7 * ppm(d) / 900;
  const [fx, fy, fd] = proj(-1.2, 0, -6.5), fs = 2.6 * ppm(fd) / 1400;
  characters(SCR, () => faceless(fx, fy, { s: fs }), 'rgba(200,210,255,0.5)', 0.5);
  characters(SCR, () => pedro(px, py, { s, look: [0.6, -0.1], mouth: 'o', sweat: true, phone: 'R', light: true, armR: [150, -460, 120, -560], armL: [-150, -440, -140, -330] }), 'rgba(200,220,255,0.95)', 0.25);
} else {
  cam3.position.set(0.3, 1.3, 2.4); cam3.lookAt(0, 1.2, -2);
  aimFlash([0.25, 1.3, -0.2], [0.6, 1.2, -5], 0);
  renderer.render(scene, cam3); main.clearRect(0, 0, SW, SH);
  const [px, py, d] = proj(0, 0, -0.4), s = 1.7 * ppm(d) / 900;
  characters(SCR, () => pedro(px, py, { s, look: [0, 0], mouth: 'smile', phone: 'R', light: false, armR: [150, -460, 130, -520] }), 'rgba(200,220,255,0.95)', 0.2);
}
vignette(main, 0.6);
window.READY = true;
